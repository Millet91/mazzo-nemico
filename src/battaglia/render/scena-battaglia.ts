// Scena Pixi della battaglia: legge lo stato della sim e gli eventi, non lo modifica mai.
// Strati del mondo (dietro → davanti): decorazioni, terreno, pirati, proiettili, traiettoria, effetti, acqua.
// Strato schermo (px CSS, non scala con lo zoom): nomi e PV, anello di mira, numeri di danno.
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Renderer } from 'pixi.js';
import type { EventoBattaglia, MappaGenerata, Pirata, Punto, StatoBattaglia } from '../../core/tipi';
import { COLORI_CIURMA, PALETTE, hex } from '../../core/palette';
import { coseno, seno } from '../../core/trig';
import { BIL } from '../../contenuti/bilanciamento';
import { traiettoria } from '../sim';
import type { Camera } from './camera';
import { frecciaBordo } from './bordo';
import { Effetti } from './effetti';
import { Forme, sprite, type IdForma } from './forme';
import { TerrenoRender } from './terreno';
import { ALTEZZA_OGGETTO, SfondiMappa } from './sfondi-mappa';

function mescola(a: string, b: string, t: number): number {
  const ca = hex(a), cb = hex(b);
  const ch = (k: number) => Math.round(((ca >> k) & 255) * (1 - t) + ((cb >> k) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

const MEZZA_CAPSULA = BIL.pirata.capsulaAltezza / 2;
/** durata della morte del segnaposto: 10 f a 12 fps (11 §5) */
const MORTE_MS = 833;
const PUNTI_TRAIETTORIA = 60;
/** traiettoria ben leggibile (Lead design, PR #37): puntini oro di 3,5 px di schermo a ogni zoom, uno ogni ~12 px */
const PASSO_PUNTINI_PX = 12;
const MAX_PUNTINI = 220;
const ALFA_MIN_PUNTINI = 0.7;
/** sotto questa scala (px CSS per px di mondo) i nomi dei pirati non si scrivono */
const SCALA_MIN_NOMI = 0.9;

interface VisPirata {
  id: number;
  radice: Container;
  /** si specchia col verso e si schiaccia nelle animazioni */
  corpo: Container;
  lampo: Sprite;
  braccio: Sprite;
  etichetta: Container;
  barra: Graphics;
  pv: Text;
  nome: Text;
  ultimaVita: number;
  ultimoX: number;
  /** ms dall'ultimo colpo (lampo + tremolio), −1 = niente */
  colpito: number;
  /** ms dall'atterraggio (schiacciata), −1 = niente */
  atterrato: number;
  /** ms dalla morte, −1 = vivo */
  morte: number;
  annegato: boolean;
  passo: number;
  /** PV mostrati dalla scia bianca della barra (scende 300 ms dopo il colpo) */
  vitaScia: number;
  /** ms dall'ultimo calo dei PV, per far partire la scia */
  sciaMs: number;
}

/** il lampo bianco del pirata colpito dura 80 ms (m1-ritmo §4) */
const LAMPO_MS = 80;
/** la scia bianca della barra PV parte dopo 300 ms e scende a 80 PV/s (m1-ritmo §6) */
const SCIA_RITARDO_MS = 300;
const SCIA_PV_AL_SECONDO = 80;
/** sbuffo di scia dietro a cannone e granata ogni 2 tick (m1-ritmo §5) */
const SCIA_PROIETTILE_MS = 2000 / 60;

export interface OpzioniDisegno {
  /** mostra anello e traiettoria (turno del giocatore umano, fase azione) */
  mira: boolean;
}

export class ScenaBattaglia {
  /** contenitore del mondo: lo trasforma la camera */
  readonly mondo = new Container();
  /** cielo in px CSS, dietro al mondo (sostituisce lo sfondo del menu durante la battaglia) */
  readonly cielo = new Container();
  /** contenitore in px CSS sopra il mondo */
  readonly schermo = new Container();
  private readonly gradiente = new Graphics();
  private readonly nuvole: Sprite[] = [];
  /** mare lontano dietro al terreno, alla quota del mare: dai buchi sotto il livello del mare si vede l'acqua */
  private readonly mareDietro = new Graphics();
  private cieloW = 0;
  private cieloH = 0;
  readonly terreno: TerrenoRender;
  readonly effetti: Effetti;
  private readonly forme: Forme;
  private readonly strato = {
    decorazioni: new Container(), pirati: new Container(), proiettili: new Container(), traiettoria: new Container(),
  };
  private readonly acqua = new Graphics();
  private readonly decorazioni: Sprite[] = [];
  private readonly pirati = new Map<number, VisPirata>();
  private readonly proiettili = new Map<number, { sp: Sprite; paracadute: Sprite | null; scia: number }>();
  private readonly fineTraiettoria: Sprite;
  /** freccia rossa sul bordo quando il mirino d'impatto è fuori schermo */
  private readonly frecciaBordo = new Graphics();
  private readonly puntini: Sprite[] = [];
  /** punti della traiettoria in px di mondo (ricalcolati solo quando cambia la mira) */
  private puntiTraiettoria: Punto[] = [];
  private readonly contenitoreTraiettoria = new Container();
  private readonly anelloTerra: Sprite;
  private readonly freccia: Sprite;
  /** corta freccia oro sopra il pirata nella direzione di mira (00 §9.16) */
  private readonly frecciaMira = new Graphics();
  /** grafica dipinta della mappa fatta a mano (null = mappa generata) */
  private readonly sfondi: SfondiMappa | null = null;
  private tempo = 0;
  private scala = 1;
  private chiaveTraiettoria = '';
  private mareDisegnato = -1;

  constructor(renderer: Renderer, private readonly s: StatoBattaglia, mappa: MappaGenerata) {
    this.forme = new Forme(renderer);
    this.terreno = new TerrenoRender(s.terreno);
    this.effetti = new Effetti(this.forme);
    this.mondo.addChild(this.mareDietro, this.strato.decorazioni, this.terreno.radice);
    this.cielo.addChild(this.gradiente);
    for (let i = 0; i < 4; i++) {
      const n = sprite(this.forme.get('nuvola'));
      n.alpha = 0.9;
      this.nuvole.push(n);
      this.cielo.addChild(n);
    }

    for (const d of mappa.decorazioni) {
      const sp = sprite(this.forme.get(d.tipo as IdForma));
      sp.position.set(d.x, d.y);
      sp.scale.set(d.specchio ? -d.scala : d.scala, d.scala);
      this.strato.decorazioni.addChild(sp);
      this.decorazioni.push(sp);
    }
    if (mappa.arte) {
      const sfondi = new SfondiMappa(mappa.arte, s.terreno.w, s.terreno.h);
      this.sfondi = sfondi;
      this.cielo.addChild(sfondi.radice);
      void sfondi.carica().then((a) => {
        if (!a) return;
        if (a.terreno) this.terreno.impostaArte(a.terreno);
        if (a.cielo) { this.gradiente.visible = false; for (const n of this.nuvole) n.visible = false; }
        mappa.decorazioni.forEach((d, i) => {
          const t = a.oggetti[d.tipo], sp = this.decorazioni[i];
          if (!t || !sp || sp.destroyed) return;
          sp.texture = t;
          sp.anchor.set(0.5, 0.97);
          const k = (ALTEZZA_OGGETTO[d.tipo] * d.scala) / t.height;
          sp.scale.set(d.specchio ? -k : k, k);
        });
      });
    }

    this.anelloTerra = sprite(this.forme.get('anello'));
    this.anelloTerra.tint = hex(PALETTE.oro);
    this.freccia = sprite(this.forme.get('freccia'));
    this.mondo.addChild(this.anelloTerra, this.strato.pirati, this.strato.proiettili, this.strato.traiettoria, this.effetti.mondo, this.acqua);

    // la traiettoria sta nello strato schermo: misura costante a ogni zoom
    for (let i = 0; i < MAX_PUNTINI; i++) {
      const p = sprite(this.forme.get('puntinoMira'));
      p.visible = false;
      this.puntini.push(p);
      this.contenitoreTraiettoria.addChild(p);
    }
    this.fineTraiettoria = sprite(this.forme.get('mirino'));
    this.fineTraiettoria.visible = false;
    this.contenitoreTraiettoria.addChild(this.fineTraiettoria);
    // punta verso destra (angolo 0) in (0, 0)
    this.frecciaBordo.poly([0, 0, -18, -11, -13, 0, -18, 11]).fill(hex(PALETTE.pericolo)).stroke({ width: 2, color: hex('#2B1B10') });
    this.frecciaBordo.visible = false;
    this.contenitoreTraiettoria.addChild(this.frecciaBordo);
    for (const p of s.pirati) this.creaPirata(p);

    // freccia verso destra (angolo 0): asta da 22 a 44 px dal centro del pirata, punta fino a 56 px
    this.frecciaMira
      .moveTo(22, 0).lineTo(46, 0).stroke({ width: 7, color: hex(PALETTE.inchiostro), alpha: 0.45, cap: 'round' })
      .moveTo(22, 0).lineTo(46, 0).stroke({ width: 4, color: hex(PALETTE.oro), cap: 'round' })
      .poly([44, -8, 58, 0, 44, 8]).fill(hex(PALETTE.oro)).stroke({ width: 1.5, color: hex(PALETTE.oroOmbra) });
    this.frecciaMira.visible = false;
    this.schermo.addChild(this.contenitoreTraiettoria, this.frecciaMira, this.freccia, this.effetti.schermo);
  }

  private creaPirata(p: Pirata): void {
    const sq = this.s.squadre[p.squadra];
    const col = COLORI_CIURMA[sq.ciurma];
    const radice = new Container();
    const corpo = new Container();
    const c = sprite(this.forme.pirata(sq.ciurma));
    const lampo = sprite(this.forme.get('lampo'));
    lampo.alpha = 0;
    corpo.addChild(c, lampo);
    const braccio = sprite(this.forme.get('braccio'));
    braccio.position.set(0, -18);
    braccio.visible = false;
    radice.addChild(corpo, braccio);
    this.strato.pirati.addChild(radice);

    const etichetta = new Container();
    const nome = new Text({
      text: p.nome,
      style: { fontFamily: 'Nunito Variable, Nunito, sans-serif', fontWeight: '800', fontSize: 11, fill: hex(PALETTE.testo), stroke: { color: hex(PALETTE.inchiostro), width: 3 } },
      resolution: Math.min(2, window.devicePixelRatio || 1),
    });
    nome.anchor.set(0.5, 1);
    nome.y = -10;
    const barra = new Graphics();
    const pv = new Text({
      text: String(p.vita),
      style: { fontFamily: 'Lilita One, sans-serif', fontSize: 11, fill: hex(col.colore), stroke: { color: hex(PALETTE.inchiostro), width: 3 } },
      resolution: Math.min(2, window.devicePixelRatio || 1),
    });
    pv.anchor.set(0, 0.5);
    pv.position.set(20, -3);
    etichetta.addChild(nome, barra, pv);
    this.schermo.addChildAt(etichetta, 0);

    const v: VisPirata = {
      id: p.id, radice, corpo, lampo, braccio, etichetta, barra, pv, nome,
      ultimaVita: -1, ultimoX: p.x, colpito: -1, atterrato: -1, morte: -1, annegato: false, passo: 0,
      vitaScia: p.vita, sciaMs: 0,
    };
    this.pirati.set(p.id, v);
    this.disegnaBarra(v, p);
  }

  private disegnaBarra(v: VisPirata, p: Pirata): void {
    const col = COLORI_CIURMA[this.s.squadre[p.squadra].ciurma];
    const larghezza = 34, alt = 6;
    const k = Math.max(0, Math.min(1, p.vita / p.vitaMax));
    const ks = Math.max(k, Math.min(1, v.vitaScia / p.vitaMax));
    v.barra.clear()
      .roundRect(-larghezza / 2 - 1, -alt / 2 - 1 - 3, larghezza + 2, alt + 2, 3).fill(hex(PALETTE.inchiostro));
    if (ks > k) v.barra.roundRect(-larghezza / 2, -alt / 2 - 3, Math.max(1, larghezza * ks), alt, 2.5).fill(0xffffff);
    if (k > 0) v.barra.roundRect(-larghezza / 2, -alt / 2 - 3, Math.max(1, larghezza * k), alt, 2.5).fill(hex(col.colore));
    v.pv.text = String(Math.max(0, p.vita));
    v.ultimaVita = p.vita;
  }

  /** Reazioni agli eventi della sim di questo frame. */
  eventi(ev: readonly EventoBattaglia[]): void {
    for (const e of ev) {
      switch (e.t) {
        case 'cratere':
          this.effetti.zolle(e.x, e.y, e.raggio, this.terreno.coloreOriginale(e.x, e.y, e.raggio));
          this.terreno.cratere(e.x, e.y, e.raggio); this.decorazioniSenzaTerra(e.x, e.y, e.raggio);
          break;
        case 'esplosione': this.effetti.esplosione(e.x, e.y, e.raggio); break;
        case 'splash': this.effetti.splash(e.x, e.y, e.grande); break;
        case 'colpoPistola': this.effetti.lineaPistola(e.da.x, e.da.y, e.a.x, e.a.y); break;
        case 'colpoSciabola': {
          const p = this.s.pirati.find((x) => x.id === e.pirata);
          if (p) this.effetti.fendente(p.x + p.verso * 10, p.y, p.verso);
          break;
        }
        case 'danno': {
          const p = this.s.pirati.find((x) => x.id === e.pirata);
          this.effetti.numero(e.pirata, e.quanto, e.x, e.y, !!p && p.vita <= 0);
          const v = this.pirati.get(e.pirata);
          if (v) v.colpito = 0;
          break;
        }
        case 'atterrato': { const v = this.pirati.get(e.pirata); if (v) v.atterrato = 0; break; }
        case 'morto': {
          const v = this.pirati.get(e.pirata);
          if (v && v.morte < 0) { v.morte = 0; v.annegato = e.causa === 'mare'; }
          const p = this.s.pirati.find((x) => x.id === e.pirata);
          if (p && e.causa === 'pv') this.effetti.fumo(p.x, p.y);
          if (p && e.causa === 'mare') this.effetti.cappello(p.x);
          break;
        }
        case 'cassaAperta': {
          const p = this.s.pirati.find((x) => x.id === e.pirata);
          if (p && e.contenuto === 'rum') this.effetti.numero(p.id, -BIL.casse.rumPv, p.x, p.y - 20, false);
          break;
        }
        default: break;
      }
    }
  }

  /** Una decorazione che ha perso il terreno sotto i piedi sparisce (sono solo grafiche, non cadono). */
  private decorazioniSenzaTerra(x: number, y: number, r: number): void {
    const { w, h, maschera } = this.s.terreno;
    for (const d of this.decorazioni) {
      if (!d.visible || Math.abs(d.x - x) > r + 20 || Math.abs(d.y - y) > r + 20) continue;
      let appoggi = 0;
      for (const dx of [-6, 0, 6]) {
        const px = Math.round(d.x + dx), py = Math.round(d.y + 2);
        if (px >= 0 && px < w && py >= 0 && py < h && maschera[py * w + px] !== 0) appoggi++;
      }
      if (appoggi < 2) d.visible = false;
    }
  }

  /** Aggiorna il disegno. Va chiamata una volta per frame, dopo `eventi`. */
  aggiorna(deltaMS: number, camera: Camera, o: OpzioniDisegno): void {
    this.tempo += deltaMS;
    const s = this.s;
    // camera → contenitore del mondo
    const k = camera.scala;
    this.scala = k;
    this.mondo.scale.set(k);
    this.mondo.position.set(camera.w / 2 - (camera.x + camera.ox) * k, camera.h / 2 - (camera.y + camera.oy) * k);
    const aSchermo = (x: number, y: number) => camera.schermoDaMondo(x, y);

    this.terreno.aggiorna();
    this.disegnaCielo(camera, deltaMS);
    this.sfondi?.aggiorna(camera, this.s.terreno.mare);
    this.disegnaAcqua(camera);
    this.effetti.impostaMare(s.terreno.mare);
    this.animaDecorazioni();

    const t = s.turno;
    const attivo = s.pirati.find((p) => p.id === t.pirata && p.stato === 'vivo');
    for (const p of s.pirati) this.aggiornaPirata(p, deltaMS, aSchermo, p === attivo && t.fase === 'azione', attivo);

    // pirata attivo: anello a terra e freccia che rimbalza (00 §2.1)
    const mostraMarcatore = !!attivo && t.fase !== 'fine' && t.fase !== 'risoluzione';
    this.anelloTerra.visible = mostraMarcatore;
    this.freccia.visible = mostraMarcatore;
    if (attivo && mostraMarcatore) {
      const piedi = attivo.y + MEZZA_CAPSULA;
      this.anelloTerra.position.set(attivo.x, piedi);
      this.anelloTerra.scale.set(1 + 0.06 * Math.sin(this.tempo / 160));
      const sopra = aSchermo(attivo.x, attivo.y - BIL.pirata.altezzaSprite + MEZZA_CAPSULA);
      this.freccia.position.set(sopra.x, sopra.y - 30 - 5 * Math.abs(Math.sin(this.tempo / 220)));
      this.freccia.scale.set(1.3);
    }

    // freccia di mira: parte dal pirata attivo e punta dove si tira (si vede anche nel turno dell'IA che mira)
    const mostraFreccia = !!attivo && t.fase === 'azione' && !s.esito && t.arma !== 'sciabola';
    this.frecciaMira.visible = mostraFreccia;
    if (attivo && mostraFreccia) {
      const c = aSchermo(attivo.x, attivo.y);
      this.frecciaMira.position.set(c.x, c.y);
      // mezzi gradi: 0 = destra, 180 = su; sullo schermo la y va in basso
      this.frecciaMira.rotation = -(t.mira.mezziGradi / 2) * (Math.PI / 180);
    }

    this.aggiornaProiettili(deltaMS);
    this.aggiornaTraiettoria(o.mira && !!attivo, aSchermo);
    this.effetti.aggiorna(deltaMS, aSchermo);
  }

  private aggiornaPirata(p: Pirata, deltaMS: number, aSchermo: (x: number, y: number) => Punto, mira: boolean, attivo: Pirata | undefined): void {
    const v = this.pirati.get(p.id);
    if (!v) return;
    const piedi = p.y + MEZZA_CAPSULA;
    v.radice.position.set(p.x, piedi);
    // barra PV con la scia bianca che scende in ritardo
    if (p.vita > v.vitaScia) v.vitaScia = p.vita;
    let ridisegna = p.vita !== v.ultimaVita;
    if (p.vita < v.ultimaVita) v.sciaMs = 0;
    if (v.vitaScia > p.vita) {
      v.sciaMs += deltaMS;
      if (v.sciaMs > SCIA_RITARDO_MS) {
        v.vitaScia = Math.max(p.vita, v.vitaScia - (SCIA_PV_AL_SECONDO * deltaMS) / 1000);
        ridisegna = true;
      }
    }
    if (ridisegna) this.disegnaBarra(v, p);

    if (p.stato !== 'vivo' && v.morte < 0) { v.morte = 0; v.annegato = p.stato === 'annegato'; }
    if (v.morte >= 0) {
      // morte: giro di 360°, rimpicciolimento fino a 0 (annegato: affonda e svanisce)
      v.morte += deltaMS;
      const k = Math.min(1, v.morte / MORTE_MS);
      v.etichetta.visible = false;
      v.braccio.visible = false;
      if (v.annegato) { v.corpo.rotation = 0; v.corpo.y = k * 30; v.radice.alpha = 1 - k; }
      else { v.corpo.rotation = k * Math.PI * 2; v.corpo.y = -MEZZA_CAPSULA * k; v.corpo.scale.set(1 - k); }
      if (k >= 1) v.radice.visible = false;
      return;
    }

    // a 0 PV il pirata resta 'vivo' e a terra fino alla lapide di fine risoluzione (README della sim)
    if (p.vita <= 0) {
      v.braccio.visible = false;
      v.lampo.alpha = 0;
      v.corpo.scale.set(p.verso, 1);
      v.corpo.rotation = -p.verso * (Math.PI / 2);
      v.corpo.position.set(0, -2);
      const e = aSchermo(p.x, piedi - 20);
      v.etichetta.position.set(Math.round(e.x), Math.round(e.y));
      return;
    }

    // verso (l'occhio guarda dove va il pirata); chi aspetta fermo si gira verso il pirata attivo (m1-ritmo §10)
    let sx: number = p.verso, sy = 1, rot = 0, dy = 0;
    if (attivo && attivo !== p && p.aTerra && Math.abs(p.vx) < 0.01 && Math.abs(attivo.x - p.x) > 4) sx = attivo.x > p.x ? 1 : -1;
    // idle: respiro 1 → 0,97 in 1 s
    sy = 1 - 0.015 * (1 + Math.sin((this.tempo / 1000) * Math.PI * 2 + p.id));
    const cammina = Math.abs(p.x - v.ultimoX) > 0.05 && p.aTerra;
    v.ultimoX = p.x;
    if (cammina) {
      v.passo += deltaMS;
      const f = Math.floor(v.passo / (1000 / 12)); // 12 fps
      dy = f % 2 ? -2 : 0;
      rot = (f % 2 ? 6 : -6) * (Math.PI / 180);
    }
    if (!p.aTerra) {
      if (p.vy < 0) { sx *= 0.85; sy = 1.2; } else { sx *= 1; sy = 1; }
    }
    if (v.atterrato >= 0) {
      v.atterrato += deltaMS;
      if (v.atterrato < 120) { sx *= 1.2; sy = 0.8; } else v.atterrato = -1;
    }
    let tremolio = 0;
    if (v.colpito >= 0) {
      v.colpito += deltaMS;
      v.lampo.alpha = v.colpito < LAMPO_MS ? 1 : 0;
      tremolio = v.colpito < 250 ? (Math.floor(v.colpito / 30) % 2 ? 3 : -3) : 0;
      if (v.colpito > 250) v.colpito = -1;
    } else v.lampo.alpha = 0;
    v.corpo.scale.set(sx, sy);
    v.corpo.rotation = rot;
    v.corpo.position.set(tremolio, dy);

    // braccio con l'arma: segue l'angolo di mira
    v.braccio.visible = mira;
    if (mira) {
      const a = this.s.turno.mira.mezziGradi;
      v.braccio.rotation = Math.atan2(-seno(a), coseno(a));
      v.braccio.scale.y = coseno(a) < 0 ? -1 : 1;
    }

    // etichetta (nome, barra e PV) sopra la testa, in px CSS; da lontano il nome si nasconde (si sovrapporrebbe)
    v.nome.visible = this.scala >= SCALA_MIN_NOMI;
    const e = aSchermo(p.x, piedi - BIL.pirata.altezzaSprite - 4);
    v.etichetta.position.set(Math.round(e.x), Math.round(e.y));
  }

  private aggiornaProiettili(deltaMS: number): void {
    const visti = new Set<number>();
    for (const pr of this.s.proiettili) {
      visti.add(pr.id);
      let v = this.proiettili.get(pr.id);
      if (!v) {
        const sp = sprite(this.forme.get(pr.tipo));
        let paracadute: Sprite | null = null;
        if (pr.tipo === 'cassa') { paracadute = sprite(this.forme.get('paracadute')); sp.addChild(paracadute); }
        v = { sp, paracadute, scia: 0 };
        this.proiettili.set(pr.id, v);
        this.strato.proiettili.addChild(sp);
      }
      const sp = v.sp;
      sp.position.set(pr.x, pr.y);
      if (pr.tipo === 'granata') { if (!pr.fermo) sp.rotation += pr.vx * 0.08; }
      if (v.paracadute) {
        // il paracadute ondeggia mentre la cassa scende e sparisce quando tocca terra
        v.paracadute.visible = !pr.fermo;
        sp.rotation = pr.fermo ? 0 : Math.sin(this.tempo / 300 + pr.id) * 0.12;
      }
      // scia di fumo dietro a cannone e granata in volo
      if ((pr.tipo === 'palla' || pr.tipo === 'granata') && !pr.fermo) {
        v.scia += deltaMS;
        if (v.scia >= SCIA_PROIETTILE_MS) { v.scia = 0; this.effetti.scia(pr.x - pr.vx * 2, pr.y - pr.vy * 2); }
      }
    }
    for (const [id, v] of this.proiettili) if (!visti.has(id)) { v.sp.destroy({ children: true }); this.proiettili.delete(id); }
  }

  /** Palme e cespugli ondeggiano, di più quando c'è vento (m1-ritmo §10). */
  private animaDecorazioni(): void {
    const forza = 0.025 + Math.abs(this.s.vento) * 0.008;
    const verso = Math.sign(this.s.vento) * 0.02;
    this.decorazioni.forEach((d, i) => {
      d.rotation = verso + Math.sin(this.tempo / 700 + i * 1.7) * forza;
    });
  }

  private aggiornaTraiettoria(mostra: boolean, aSchermo: (x: number, y: number) => Punto): void {
    if (!mostra) {
      if (this.chiaveTraiettoria) { for (const p of this.puntini) p.visible = false; this.fineTraiettoria.visible = false; this.frecciaBordo.visible = false; this.chiaveTraiettoria = ''; }
      return;
    }
    const s = this.s;
    const attivo = s.pirati.find((p) => p.id === s.turno.pirata);
    const chiave = `${s.turno.mira.mezziGradi}|${s.turno.mira.potenza}|${s.turno.arma}|${s.turno.miccia}|${s.vento}|${attivo?.x.toFixed(1)}|${attivo?.y.toFixed(1)}`;
    if (chiave !== this.chiaveTraiettoria) {
      this.chiaveTraiettoria = chiave;
      const punti = traiettoria(s, PUNTI_TRAIETTORIA);
      // intera a Mozzo (e nei tutorial), altrimenti solo il primo 30% (00 §3)
      const n = s.config.traiettoriaCompleta ? punti.length : Math.ceil(punti.length * BIL.mira.traiettoria);
      this.puntiTraiettoria = punti.slice(0, n);
    }
    // ogni frame (la camera si muove): un puntino ogni ~12 px di schermo lungo la linea
    const punti = this.puntiTraiettoria;
    let usati = 0;
    if (punti.length) {
      let prima = aSchermo(punti[0].x, punti[0].y);
      let resto = 0;
      let totale = 0;
      for (let i = 1; i < punti.length; i++) {
        const q = aSchermo(punti[i].x, punti[i].y);
        totale += Math.hypot(q.x - prima.x, q.y - prima.y);
        prima = q;
      }
      prima = aSchermo(punti[0].x, punti[0].y);
      let fatta = 0;
      for (let i = 1; i < punti.length && usati < MAX_PUNTINI; i++) {
        const q = aSchermo(punti[i].x, punti[i].y);
        const seg = Math.hypot(q.x - prima.x, q.y - prima.y);
        while (resto <= seg && usati < MAX_PUNTINI) {
          const k = seg > 0 ? resto / seg : 0;
          const d = this.puntini[usati++];
          d.visible = true;
          d.position.set(prima.x + (q.x - prima.x) * k, prima.y + (q.y - prima.y) * k);
          d.alpha = 1 - (1 - ALFA_MIN_PUNTINI) * Math.min(1, (fatta + resto) / Math.max(1, totale));
          resto += PASSO_PUNTINI_PX;
        }
        resto -= seg;
        fatta += seg;
        prima = q;
      }
    }
    for (let i = usati; i < this.puntini.length; i++) if (this.puntini[i].visible) this.puntini[i].visible = false;
    // a traiettoria intera: mirino rosso dove il colpo tocca il terreno (o dove esplode la granata)
    const fine = punti[punti.length - 1];
    this.fineTraiettoria.visible = s.config.traiettoriaCompleta && !!fine;
    this.frecciaBordo.visible = false;
    if (fine) {
      const f = aSchermo(fine.x, fine.y);
      this.fineTraiettoria.position.set(f.x, f.y);
      // mirino fuori schermo: piccola freccia rossa sul bordo che punta verso di lui (niente zoom automatico)
      const b = this.fineTraiettoria.visible ? frecciaBordo(f.x, f.y, this.cieloW, this.cieloH) : null;
      if (b) {
        this.frecciaBordo.visible = true;
        this.frecciaBordo.position.set(b.x, b.y);
        this.frecciaBordo.rotation = b.angolo;
        this.frecciaBordo.scale.set(1 + 0.08 * Math.sin(this.tempo / 150));
      }
    }
  }

  private disegnaCielo(camera: Camera, deltaMS: number): void {
    if (camera.w !== this.cieloW || camera.h !== this.cieloH) {
      this.cieloW = camera.w; this.cieloH = camera.h;
      const g = this.gradiente.clear();
      const fasce = 24;
      for (let i = 0; i < fasce; i++) {
        const y0 = Math.floor((camera.h * i) / fasce), y1 = Math.ceil((camera.h * (i + 1)) / fasce);
        g.rect(0, y0, camera.w, y1 - y0 + 1).fill(mescola(PALETTE.cieloAlto, PALETTE.cieloOrizzonte, i / (fasce - 1)));
      }
      // sole basso a sinistra (luce da sinistra in alto, 03 §1)
      g.circle(camera.w * 0.18, camera.h * 0.55, camera.h * 0.16).fill({ color: hex(PALETTE.sole), alpha: 0.25 })
        .circle(camera.w * 0.18, camera.h * 0.55, camera.h * 0.09).fill(hex(PALETTE.sole));
      this.nuvole.forEach((n, i) => { n.position.set((camera.w * (i + 0.3)) / 4, camera.h * (0.12 + 0.08 * (i % 3))); n.scale.set(camera.h / 400); });
    }
    // nuvole: vanno col vento (velocità ∝ vento, m1-ritmo §10); senza vento scorrono appena
    this.nuvole.forEach((n, i) => {
      const v = this.s.vento === 0 ? 4 : this.s.vento * (8 + 3 * (i % 3));
      n.x += (v * deltaMS) / 1000;
      const largo = 160 * n.scale.x;
      if (n.x - largo > camera.w) n.x = -largo;
      if (n.x + largo < 0) n.x = camera.w + largo;
    });
  }

  private disegnaAcqua(camera: Camera): void {
    // acqua davanti al terreno, dal livello del mare in giù; si ridisegna solo quando il mare sale
    const mare = this.s.terreno.mare;
    if (mare !== this.mareDisegnato) {
      this.mareDisegnato = mare;
      const w = this.s.terreno.w, fondo = this.s.terreno.h + 200;
      const largo = w * 3;
      const g = this.acqua.clear();
      const passi = Math.ceil(largo / 12);
      const punti: number[] = [];
      for (let i = 0; i <= passi; i++) { const x = -w + (i * largo) / passi; punti.push(x, Math.sin(x / 40) * 3); }
      g.poly([...punti, w * 2, fondo - mare, -w, fondo - mare]).fill({ color: hex(PALETTE.mareMedio), alpha: 0.82 });
      g.moveTo(punti[0], punti[1]);
      for (let i = 2; i < punti.length; i += 2) g.lineTo(punti[i], punti[i + 1]);
      g.stroke({ width: 3, color: hex(PALETTE.schiuma), alpha: 0.8 });
      g.rect(-w, 24, largo, fondo - mare).fill({ color: hex(PALETTE.mareFondo), alpha: 0.5 });
      this.acqua.y = mare;
      this.mareDietro.clear().rect(-w, mare, w * 3, fondo - mare).fill(hex(PALETTE.mareMedio))
        .rect(-w, mare + 60, w * 3, fondo - mare).fill(hex(PALETTE.mareFondo));
    }
    // onde: scorrono di lato (periodo 40·2π px) e respirano
    this.acqua.x = ((this.tempo / 1000) * (30 + Math.abs(this.s.vento) * 6) * (this.s.vento < 0 ? -1 : 1)) % (Math.PI * 80);
    this.acqua.y = this.mareDisegnato + Math.sin(this.tempo / 550) * 3;
    void camera;
  }

  distruggi(): void {
    this.sfondi?.distruggi();
    this.terreno.distruggi();
    this.effetti.distruggi();
    this.cielo.destroy({ children: true });
    this.mondo.destroy({ children: true });
    this.schermo.destroy({ children: true });
    this.forme.distruggi();
  }
}
