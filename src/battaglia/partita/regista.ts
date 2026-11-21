// Regista della battaglia: collega il bus (UI) al ciclo di gioco (Partita), alla scena Pixi, alla camera e
// all'input. Lo crea render/grafica.ts quando Pixi è pronto; vive per tutta la durata dell'app.
//
// - bus.richiestaBattaglia: una config nuova avvia la battaglia, null la chiude;
// - bus.comandi → Partita (timbrati col tick); bus.azioni → pausa, riprendi, esci, ricentra, velocità;
// - a ogni frame: tick a passo fisso, eventi alla scena, VistaBattaglia e eventiBattaglia sul bus.
import { effect } from '@preact/signals-core';
import type { Application, Ticker } from 'pixi.js';
import { bus, type AzioneBattaglia } from '../../core/bus';
import type { ConfigBattaglia, EventoBattaglia } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { Camera, SCOSSA_MAX_PX } from '../render/camera';
import { InputBattaglia } from '../render/input';
import { caricaGuida, guidaAttiva, segnaTiroGuida } from '../render/guida';
import { ScenaBattaglia } from '../render/scena-battaglia';
import { Partita } from './partita';
import { creaVista, visteUguali } from './vista';
import { calcolaRisultato, configProva, type RisultatoProvaFps } from './statistiche-prova';

export type { RisultatoProvaFps };

/** un frame lento non deve far saltare le animazioni */
const DELTA_MASSIMO_MS = 100;
/** fermo immagine dei colpi forti (m1-ritmo §4) */
const FERMO_MS = 70;
const FERMO_DANNO = 30;
/** l'anello di mira pulsa nei primi 2 s del turno; la mano resta 2 s dopo FUOCO senza fionda */
const INVITO_MS = 2000;
const MANO_DOPO_FUOCO_MS = 2000;

interface Prova {
  fine: number;
  inizio: number;
  /** frame per ogni secondo intero */
  perSecondo: number[];
  /** secondi in cui è nata una battaglia (esclusi dal minimo) */
  secondiAvvio: Set<number>;
  delta: number[];
  msSim: number;
  tick: number;
  risolvi: (r: RisultatoProvaFps) => void;
  seme: number;
}

/** Il regista attivo (uno solo per app): serve a provaFps della Diagnostica. */
let attivo: Regista | null = null;
export function registaAttivo(): Regista | null { return attivo; }

export class Regista {
  partita: Partita | null = null;
  private scena: ScenaBattaglia | null = null;
  private input: InputBattaglia | null = null;
  readonly camera = new Camera();
  private config: ConfigBattaglia | null = null;
  private stacca: (() => void)[] = [];
  private segui: 'pirata' | 'proiettile' | 'libera' = 'pirata';
  private fiondaAttiva = false;
  /** ms dall'inizio del turno del giocatore: l'anello pulsa nei primi 2 s */
  private msTurno = 0;
  /** il giocatore ha trascinato la fionda almeno una volta in questa sessione */
  private haTrascinato = false;
  /** ms in cui mostrare la mano dopo FUOCO senza aver mai trascinato */
  private manoMs = 0;
  private eraInPausa = false;
  private prova: Prova | null = null;
  /** ms di fermo immagine rimasti */
  private fermoMs = 0;
  private readonly frame = (tk: Ticker) => this.aggiorna(tk.deltaMS);

  constructor(private readonly app: Application, private readonly sfondo?: { radice: { visible: boolean } }) {
    attivo = this;
    void caricaGuida();
    this.camera.impostaSchermo(app.screen.width, app.screen.height);
    app.renderer.on('resize', (w: number, h: number) => this.camera.impostaSchermo(w, h));
    this.stacca.push(effect(() => {
      const cfg = bus.richiestaBattaglia.value;
      if (cfg && cfg !== this.config) this.avvia(cfg);
      else if (!cfg && this.config) this.termina();
    }));
    this.stacca.push(bus.comandi.ascolta((c) => {
      // FUOCO dal tasto senza aver mai usato la fionda: lo sparo parte e la mano mostra il gesto per 2 s
      if (c.t === 'fuoco' && !this.haTrascinato && this.partita && !this.partita.toccaIa) this.manoMs = MANO_DOPO_FUOCO_MS;
      this.partita?.comandoUmano(c);
    }));
    this.stacca.push(bus.azioni.ascolta((a) => this.azione(a)));
    app.ticker.add(this.frame);
  }

  private avvia(cfg: ConfigBattaglia): void {
    this.chiudiPartita();
    this.config = cfg;
    const partita = new Partita(cfg);
    this.partita = partita;
    const scena = new ScenaBattaglia(this.app.renderer, partita.s, partita.mappa);
    this.scena = scena;
    this.app.stage.addChild(scena.cielo, scena.mondo, scena.schermo);
    if (this.sfondo) this.sfondo.radice.visible = false;
    this.camera.zoom = BIL.camera.zoomPredefinito;
    this.fermoMs = 0;
    this.segui = 'pirata';
    const p = partita.s.pirati.find((x) => x.id === partita.s.turno.pirata);
    if (p) this.camera.vola(p.x, p.y, 0);
    this.input = new InputBattaglia(this.app.canvas, {
      camera: this.camera,
      pirataMirabile: () => this.pirataMirabile(),
      mira: (m) => partita.comandoUmano({ t: 'mira', ...m }),
      miraAttuale: () => ({ ...partita.s.turno.mira }),
      fuoco: () => partita.comandoUmano({ t: 'fuoco' }),
      fionda: (a) => { this.fiondaAttiva = a; if (a) { this.haTrascinato = true; this.manoMs = 0; } },
      ricentra: () => this.ricentra(),
      cameraManuale: () => { this.segui = 'libera'; },
    });
    bus.battagliaInPausa.value = false;
    bus.eventiBattaglia.value = [];
    bus.battaglia.value = creaVista(partita.s, partita.iaPensa);
  }

  /** Chiude la battaglia e torna al menu. */
  private termina(): void {
    this.chiudiPartita();
    this.config = null;
    bus.battaglia.value = null;
    bus.battagliaInPausa.value = false;
    bus.eventiBattaglia.value = [];
    if (bus.richiestaBattaglia.value) bus.richiestaBattaglia.value = null;
  }

  private chiudiPartita(): void {
    this.input?.distruggi();
    this.input = null;
    if (this.scena) { this.app.stage.removeChild(this.scena.cielo, this.scena.mondo, this.scena.schermo); this.scena.distruggi(); }
    this.scena = null;
    this.partita?.chiudi();
    this.partita = null;
    this.fiondaAttiva = false;
    if (this.sfondo) this.sfondo.radice.visible = true;
  }

  private azione(a: AzioneBattaglia): void {
    switch (a.t) {
      case 'pausa': bus.battagliaInPausa.value = true; break;
      case 'riprendi': bus.battagliaInPausa.value = false; break;
      case 'esci': this.termina(); break;
      case 'ricentra': this.ricentra(); break;
      case 'velocita': if (this.partita) this.partita.velocita = a.fattore; break;
    }
  }

  private ricentra(): void {
    const s = this.partita?.s;
    if (!s) return;
    const p = s.pirati.find((x) => x.id === s.turno.pirata);
    if (p) { this.segui = 'pirata'; this.camera.vola(p.x, p.y, 300); }
  }

  private pirataMirabile(): { x: number; y: number } | null {
    const pa = this.partita;
    if (!pa || pa.toccaIa || pa.s.esito || pa.s.turno.fase !== 'azione') return null;
    const p = pa.s.pirati.find((x) => x.id === pa.s.turno.pirata && x.stato === 'vivo');
    return p ? this.camera.schermoDaMondo(p.x, p.y) : null;
  }

  aggiorna(deltaGrezzo: number): void {
    const pa = this.partita, scena = this.scena;
    if (!pa || !scena) return;
    const delta = Math.min(deltaGrezzo, DELTA_MASSIMO_MS);
    const inPausa = bus.inPausa.value || bus.battagliaInPausa.value;
    if (inPausa) {
      if (!this.eraInPausa) pa.sospendi();
      this.eraInPausa = true;
      scena.aggiorna(0, this.camera, this.opzioniDisegno());
      return;
    }
    if (this.eraInPausa) { pa.sospendi(); this.eraInPausa = false; }

    // fermo immagine (m1-ritmo §4): la sim si ferma 70 ms, la grafica no
    let eventi: EventoBattaglia[] = [];
    if (this.fermoMs > 0) this.fermoMs -= delta;
    else eventi = pa.aggiorna(delta);
    if (eventi.length) {
      this.impatto(eventi);
      scena.eventi(eventi);
      this.eventiCamera(eventi);
      bus.eventiBattaglia.value = eventi;
    }
    this.msTurno += delta;
    if (this.manoMs > 0) this.manoMs -= delta;
    this.muoviCamera(delta);
    scena.aggiorna(delta, this.camera, this.opzioniDisegno());

    const vista = creaVista(pa.s, pa.iaPensa);
    if (!visteUguali(bus.battaglia.value, vista)) bus.battaglia.value = vista;

    if (this.prova) this.contaProva(deltaGrezzo);
  }

  private opzioniDisegno() {
    const pa = this.partita!;
    return {
      mira: !pa.toccaIa && pa.s.turno.fase === 'azione' && !pa.s.esito,
      fiondaAttiva: this.fiondaAttiva,
      invito: this.msTurno < INVITO_MS,
      guida: (guidaAttiva() || this.manoMs > 0) && !this.prova,
    };
  }

  /**
   * Peso dei colpi (m1-ritmo §4): scossa = danno del frame × 0,12 px (max 10, 250 ms); fermo immagine 70 ms
   * se il colpo fa almeno 30 danni o uccide; zoom +8% per 300 ms sulle uccisioni.
   */
  private impatto(eventi: readonly EventoBattaglia[]): void {
    const s = this.partita!.s;
    let danno = 0, uccide = false;
    for (const e of eventi) {
      if (e.t !== 'danno' || e.quanto <= 0) continue;
      danno += e.quanto;
      const p = s.pirati.find((x) => x.id === e.pirata);
      if (p && p.vita <= 0) uccide = true;
    }
    if (!danno) return;
    this.camera.scuoti(Math.min(SCOSSA_MAX_PX, danno * 0.12));
    if (danno >= FERMO_DANNO || uccide) this.fermoMs = FERMO_MS;
    if (uccide) this.camera.impulsoZoom();
  }

  private eventiCamera(eventi: readonly EventoBattaglia[]): void {
    const s = this.partita!.s;
    for (const e of eventi) {
      if (e.t === 'sparo' && !this.partita!.toccaIa) segnaTiroGuida();
      if (e.t === 'turnoIniziato') {
        this.msTurno = 0;
        const p = s.pirati.find((x) => x.id === e.pirata);
        this.segui = 'pirata';
        if (p) this.camera.vola(p.x, p.y);
      } else if (e.t === 'sparo' && this.segui !== 'libera') this.segui = 'proiettile';
    }
  }

  private muoviCamera(delta: number): void {
    const s = this.partita!.s;
    if (this.segui === 'proiettile') {
      const pr = s.proiettili.find((x) => !x.fermo && x.tipo !== 'lapide');
      if (pr) this.camera.segui(pr.x, pr.y, delta);
    } else if (this.segui === 'pirata' && !this.camera.inVolo) {
      const p = s.pirati.find((x) => x.id === s.turno.pirata && x.stato === 'vivo');
      // segue il pirata quando si muove (camminata, salto, spinta) senza scatti
      if (p) this.camera.segui(p.x, p.y, delta);
    }
    this.camera.aggiorna(delta);
  }

  // ─── Diagnostica: "Prova 60 fps" (piano QA §4) ───

  /** Battaglia dimostrativa 5 contro 5, IA contro IA, con zoom che va dal minimo al massimo. */
  avviaProva(durataMs: number): Promise<RisultatoProvaFps> {
    if (this.prova) return Promise.reject(new Error('prova già in corso'));
    return new Promise((risolvi) => {
      const seme = 20261121;
      const ora = performance.now();
      this.prova = { inizio: ora, fine: ora + durataMs, perSecondo: [], secondiAvvio: new Set([0]), delta: [], msSim: 0, tick: 0, risolvi, seme };
      bus.richiestaBattaglia.value = configProva(seme);
    });
  }

  private contaProva(deltaMS: number): void {
    const pr = this.prova!;
    const pa = this.partita!;
    const ora = performance.now();
    pr.delta.push(deltaMS);
    const sec = Math.floor((ora - pr.inizio) / 1000);
    pr.perSecondo[sec] = (pr.perSecondo[sec] ?? 0) + 1;
    // zoom dal minimo al massimo e ritorno, ogni 12 s: la camera si muove sempre (piano QA §4)
    const t = (ora - pr.inizio) / 12000;
    this.camera.zoomA(BIL.camera.zoomMin + (BIL.camera.zoomMax - BIL.camera.zoomMin) * (0.5 - 0.5 * Math.cos(t * Math.PI * 2)));
    if (pa.s.esito) {
      // battaglia finita prima del tempo: se ne avvia un'altra; il secondo del caricamento (e il successivo,
      // dove cade il primo frame dopo) non conta per il minimo
      pr.msSim += pa.msSim; pr.tick += pa.tickSimulati;
      pr.seme++;
      pr.secondiAvvio.add(sec); pr.secondiAvvio.add(sec + 1);
      bus.richiestaBattaglia.value = configProva(pr.seme);
      return;
    }
    if (ora < pr.fine) return;
    const r = calcolaRisultato({
      perSecondo: pr.perSecondo, secondiAvvio: pr.secondiAvvio, delta: pr.delta,
      msSim: pr.msSim + pa.msSim, tick: pr.tick + pa.tickSimulati, durataMs: ora - pr.inizio,
    });
    this.prova = null;
    this.termina();
    pr.risolvi(r);
  }

  distruggi(): void {
    this.termina();
    this.app.ticker.remove(this.frame);
    for (const f of this.stacca) f();
    if (attivo === this) attivo = null;
  }
}
