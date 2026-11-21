// Regista della battaglia: collega il bus (UI) al ciclo di gioco (Partita), alla scena Pixi, alla camera e
// all'input. Lo crea render/grafica.ts quando Pixi è pronto; vive per tutta la durata dell'app.
//
// - bus.richiestaBattaglia: una config nuova avvia la battaglia, null la chiude;
// - bus.comandi → Partita (timbrati col tick); bus.azioni → pausa, riprendi, esci, ricentra, velocità;
// - a ogni frame: tick a passo fisso, eventi alla scena, VistaBattaglia e eventiBattaglia sul bus.
//
// Mirino (comandi v3, docs/tecnica/comandi-v3.md): il regista dice all'input dov'è il mirino sullo schermo e
// trasforma il trascinamento in comandi `mira` sul bus.
// Camera (agente Comandi): segue il pirata di turno; mentre il giocatore mira si
// allarga da sola quanto basta per mostrare pirata e punto d'impatto (bus.zoomAutomaticoMira); pinch e
// trascinamento sono sempre del giocatore e lo zoom scelto col pinch è quello a cui la visuale torna.
import { effect } from '@preact/signals-core';
import type { Application, Ticker } from 'pixi.js';
import { bus, type AzioneBattaglia } from '../../core/bus';
import type { Comando, ConfigBattaglia, EventoBattaglia } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { Camera, CIELO_EXTRA, SCOSSA_MAX_PX } from '../render/camera';
import { inquadra, INQUADRA, zoomPigro } from '../render/inquadra';
import { creaTrascinaMirino, mirinoDaMira } from '../render/mirino';
import { tocco } from '../../piattaforma/haptics';
import { InputBattaglia } from '../render/input';
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
  /**
   * Chi guida la camera: 'pirata' = segue il pirata di turno; 'mira' = inquadra pirata e punto d'impatto;
   * 'proiettile' = segue il colpo in volo; 'libera' = l'ha presa il giocatore (trascinamento o pinch).
   */
  private segui: 'pirata' | 'proiettile' | 'libera' | 'mira' = 'pirata';
  /** zoom scelto dal giocatore (pinch o rotella): la visuale ci torna da sola dopo la mira */
  private zoomGiocatore: number = BIL.camera.zoomPredefinito;
  /** lo zoom sta tornando a quello del giocatore */
  private zoomTorna = false;
  /** inquadratura della mira: zoom in uso, obiettivo e "ferma" (dopo lo sparo non si ricalcola più) */
  private zoomMira: number = BIL.camera.zoomPredefinito;
  private obiettivoMira: { x: number; y: number; zoom: number; impatto: boolean } | null = null;
  private miraFerma = false;
  /** trascinamento del mirino: manda `mira` sul bus come ogni altro comando del giocatore */
  private readonly trascina = creaTrascinaMirino((c) => bus.comandi.invia(c));
  private mirinoPreso = false;
  private eraInPausa = false;
  private prova: Prova | null = null;
  /** ms di fermo immagine rimasti */
  private fermoMs = 0;
  private readonly frame = (tk: Ticker) => this.aggiorna(tk.deltaMS);

  constructor(private readonly app: Application, private readonly sfondo?: { radice: { visible: boolean } }) {
    attivo = this;
    // gancio di prova (?prova): i test e2e chiedono dov'è il mirino per trascinarlo con tocchi veri
    const prova = (globalThis as { __kaboom?: { mirino?: () => unknown } }).__kaboom;
    if (prova) prova.mirino = () => this.mirino();
    this.camera.impostaSchermo(app.screen.width, app.screen.height);
    app.renderer.on('resize', (w: number, h: number) => this.camera.impostaSchermo(w, h));
    this.stacca.push(effect(() => {
      const cfg = bus.richiestaBattaglia.value;
      if (cfg && cfg !== this.config) this.avvia(cfg);
      else if (!cfg && this.config) this.termina();
    }));
    this.stacca.push(bus.comandi.ascolta((c) => { this.comandoCamera(c); this.partita?.comandoUmano(c); }));
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
    this.zoomGiocatore = BIL.camera.zoomPredefinito;
    this.zoomTorna = false;
    this.fermoMs = 0;
    this.segui = 'pirata';
    const p = partita.s.pirati.find((x) => x.id === partita.s.turno.pirata);
    if (p) this.camera.vola(p.x, p.y, 0);
    this.input = new InputBattaglia(this.app.canvas, {
      camera: this.camera,
      ricentra: () => this.ricentra(),
      cameraManuale: (tipo) => {
        this.segui = 'libera';
        this.zoomTorna = false;
        if (tipo === 'zoom') this.zoomGiocatore = this.camera.zoom;
      },
      mirino: () => this.mirino(),
      miraInizia: () => {
        const s = this.partita?.s;
        if (!s) return;
        this.mirinoPreso = true;
        this.trascina.inizia(mirinoDaMira(s.turno.mira.mezziGradi / 2, s.turno.mira.potenza));
        tocco();
      },
      miraSposta: (dx, dy, dt) => { if (this.mirinoPreso && this.mirino()) this.trascina.sposta(dx, dy, dt); },
      miraFine: () => { this.mirinoPreso = false; },
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

  /**
   * Centro del mirino sullo schermo (px CSS), o null se adesso non si può mirare: serve il turno del giocatore
   * in fase d'azione e un'arma che si punta (la sciabola colpisce davanti al pirata).
   */
  mirino(): { x: number; y: number } | null {
    const pa = this.partita;
    if (!pa || pa.toccaIa || pa.s.esito || pa.s.turno.fase !== 'azione' || pa.s.turno.arma === 'sciabola') return null;
    const s = pa.s;
    const p = s.pirati.find((x) => x.id === s.turno.pirata && x.stato === 'vivo');
    if (!p) return null;
    const c = this.camera.schermoDaMondo(p.x, p.y);
    const m = mirinoDaMira(s.turno.mira.mezziGradi / 2, s.turno.mira.potenza);
    return { x: c.x + m.x, y: c.y + m.y };
  }

  /** Doppio tocco, tasto "torna sul pirata" o il pirata che si muove: la camera torna su di lui, col suo zoom. */
  private ricentra(): void {
    const s = this.partita?.s;
    if (!s) return;
    const p = s.pirati.find((x) => x.id === s.turno.pirata);
    if (!p) return;
    this.segui = 'pirata';
    this.zoomTorna = !this.prova;
    this.camera.vola(p.x, p.y, 300);
  }

  /**
   * I comandi del giocatore guidano anche la camera: mirando (in azione, con lo zoom automatico acceso) si
   * passa all'inquadratura della mira; muovendo il pirata la camera torna su di lui se era altrove.
   * Regola semplice da spiegare: "miri = vedi dove cade il colpo; ti muovi = vedi il pirata".
   */
  private comandoCamera(c: Comando): void {
    const pa = this.partita;
    if (!pa || pa.toccaIa || pa.s.esito || this.prova) return;
    const fase = pa.s.turno.fase;
    if (c.t === 'mira') {
      if (fase !== 'azione' || !bus.zoomAutomaticoMira.value || this.segui === 'mira') return;
      this.segui = 'mira';
      this.zoomMira = this.camera.zoom;
      this.obiettivoMira = null;
      this.miraFerma = false;
      this.zoomTorna = false;
    } else if ((c.t === 'muovi' && c.dir !== 0) || c.t === 'salta' || (c.t === 'arrampica' && c.dir !== 0)) {
      if (fase !== 'azione' && fase !== 'fuga') return;
      // chi si muove guarda il pirata: la camera torna su di lui (e al suo zoom) da qualunque altra inquadratura
      if (this.segui !== 'pirata') this.ricentra();
    }
  }

  /** Inquadratura della mira: pirata e punto d'impatto dentro la parte libera dello schermo, col minimo spostamento. */
  private inquadraMira(delta: number): void {
    const s = this.partita!.s, cam = this.camera;
    const p = s.pirati.find((x) => x.id === s.turno.pirata && x.stato === 'vivo');
    if (!p) { this.segui = 'pirata'; return; }
    if (!this.miraFerma || !this.obiettivoMira) {
      const fine = s.turno.fase === 'azione' ? this.scena!.fineMira : null;
      const impatto = fine && {
        x: Math.min(cam.mondoW, Math.max(0, fine.x)),
        y: Math.min(cam.mondoH, Math.max(-CIELO_EXTRA, fine.y)),
      };
      const b = cam.scalaBase;
      const centro = { x: cam.x, y: cam.y };
      const ideale = inquadra(centro, p, impatto, cam.w, cam.h, b * this.zoomGiocatore, b * BIL.camera.zoomMin).scala / b;
      this.zoomMira = zoomPigro(this.zoomMira, ideale);
      const r = inquadra(centro, p, impatto, cam.w, cam.h, b * this.zoomMira, b * BIL.camera.zoomMin);
      this.obiettivoMira = { x: r.x, y: r.y, zoom: this.zoomMira, impatto: !!impatto };
    }
    const o = this.obiettivoMira;
    cam.avvicina(o.x, o.y, o.zoom, delta, INQUADRA.tau);
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
    this.muoviCamera(delta);
    scena.aggiorna(delta, this.camera, this.opzioniDisegno());

    const vista = creaVista(pa.s, pa.iaPensa);
    vista.pirataFuoriVista = this.pirataFuoriVista();
    vista.pirataSottoTasti = this.pirataSottoTasti();
    if (!visteUguali(bus.battaglia.value, vista)) bus.battaglia.value = vista;

    if (this.prova) this.contaProva(deltaGrezzo);
  }

  /** Il pirata di turno non si vede (camera spostata a mano o rimasta sul colpo): l'HUD mostra "torna sul pirata". */
  private pirataFuoriVista(): boolean {
    const s = this.partita!.s, cam = this.camera;
    if (s.esito || (s.turno.fase !== 'azione' && s.turno.fase !== 'fuga') || cam.inVolo) return false;
    const p = s.pirati.find((x) => x.id === s.turno.pirata && x.stato === 'vivo');
    if (!p) return false;
    const q = cam.schermoDaMondo(p.x, p.y);
    return q.x < -8 || q.x > cam.w + 8 || q.y < -8 || q.y > cam.h + 8;
  }

  /**
   * Un pirata vivo sta sotto i tasti di un angolo in basso (solo nel turno del giocatore, quando i tasti ci sono):
   * l'HUD li rende quasi trasparenti (PIANO §2 n.10). I riquadri sono quelli che la camera già tiene liberi per chi tira.
   */
  private pirataSottoTasti(): 'sx' | 'dx' | 'entrambi' | undefined {
    const pa = this.partita!, s = pa.s, cam = this.camera;
    if (s.esito || pa.toccaIa || s.turno.fase === 'fine') return undefined;
    const yTasti = cam.h - INQUADRA.levaAlta;
    let sx = false, dx = false;
    for (const p of s.pirati) {
      if (p.stato !== 'vivo') continue;
      // la figura va dai piedi (y + 11) al nome sopra la testa: basta che una parte finisca sotto i tasti
      const q = cam.schermoDaMondo(p.x, p.y + 11);
      if (q.y < yTasti || q.y - 40 * cam.scala > cam.h) continue;
      if (q.x > -12 && q.x < INQUADRA.levaLarga) sx = true;
      else if (q.x < cam.w + 12 && q.x > cam.w - INQUADRA.levaLarga) dx = true;
    }
    return sx && dx ? 'entrambi' : sx ? 'sx' : dx ? 'dx' : undefined;
  }

  private opzioniDisegno() {
    const pa = this.partita!;
    return { mira: !pa.toccaIa && pa.s.turno.fase === 'azione' && !pa.s.esito, mirinoPreso: this.mirinoPreso };
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
      if (e.t === 'turnoIniziato') {
        const p = s.pirati.find((x) => x.id === e.pirata);
        this.segui = 'pirata';
        this.zoomTorna = !this.prova;
        if (p) this.camera.vola(p.x, p.y);
      } else if (e.t === 'sparo') {
        // inquadratura della mira con l'impatto dentro: il colpo si guarda da lì, senza inseguirlo
        if (this.segui === 'mira' && s.config.traiettoriaCompleta && this.obiettivoMira?.impatto) this.miraFerma = true;
        else if (this.segui !== 'libera') this.segui = 'proiettile';
      }
    }
  }

  private muoviCamera(delta: number): void {
    const s = this.partita!.s, cam = this.camera;
    if (this.segui === 'mira') {
      this.inquadraMira(delta);
      if (this.miraFerma) {
        // il colpo esce dai lati o da sotto (rimbalzo, vento): allora lo si insegue. Sopra può uscire: ricade.
        const pr = s.proiettili.find((x) => !x.fermo && x.tipo !== 'lapide');
        const q = pr && cam.schermoDaMondo(pr.x, pr.y);
        if (q && (q.x < -20 || q.x > cam.w + 20 || q.y > cam.h + 20)) this.segui = 'proiettile';
      }
    }
    if (this.zoomTorna && this.segui !== 'mira' && cam.zoomVerso(this.zoomGiocatore, delta, INQUADRA.tau)) this.zoomTorna = false;
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
