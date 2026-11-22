// Scena Pixi della battaglia: legge lo stato della sim e gli eventi, non lo modifica mai.
// Strati del mondo (dietro → davanti): decorazioni, terreno, pirati, proiettili, traiettoria, effetti, acqua.
// Strato schermo (px CSS, non scala con lo zoom): nomi e PV, anello di mira, numeri di danno.
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Renderer } from 'pixi.js';
import type { EventoBattaglia, MappaGenerata, MossaPirata, Pirata, Punto, StatoBattaglia } from '../../core/tipi';
import { COLORI_CIURMA, PALETTE, hex } from '../../core/palette';
import { coseno, seno } from '../../core/trig';
import { BIL, TICK_AL_SECONDO } from '../../contenuti/bilanciamento';
import { traiettoria } from '../sim';
import type { Camera } from './camera';
import { frecciaBordo } from './bordo';
import { MIRINO, mirinoDaMira } from './mirino';
import { AppigliRender, puoAggrapparsi } from './appigli';
import { Effetti } from './effetti';
import { Forme, sprite, type IdForma } from './forme';
import { TerrenoRender } from './terreno';
import { TerrenoHd, type MisureHd } from './terreno-hd';
import { PezziPirata, RigPirata, SCALA_MIN_PUPAZZO } from './pirata-rig';
import {
  armaPosa, bersaglio, mossaDaStato, nuovaPosa, nuoviParametri, RIALZATA_MS, risolvi, sfuma, SFUMA_MS,
  type ArmaPosa, type Parametri, type Posa, type StatoPosa,
} from './pirata-posa';
import { ALTEZZA_OGGETTO, SfondiMappa } from './sfondi-mappa';

function mescola(a: string, b: string, t: number): number {
  const ca = hex(a), cb = hex(b);
  const ch = (k: number) => Math.round(((ca >> k) & 255) * (1 - t) + ((cb >> k) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

const MEZZA_CAPSULA = BIL.pirata.capsulaAltezza / 2;
/** durata della morte: 10 f a 12 fps (11 §5) */
const MORTE_MS = 833;
/** dopo lo sparo l'arma resta in mano per il rinculo (o il fendente) */
const ARMA_DOPO_SPARO_MS = 300;
/** la velocità a piedi si misura su finestre di almeno tanti ms (i tick della sim non cadono uno per frame) */
const FINESTRA_VEL_MS = 100;
/**
 * Punti chiesti alla sim per la traiettoria: il cannone ne dà uno ogni 3 tick, quindi 160 = 8 s di volo.
 * Con 60 (3 s) i tiri alti venivano tagliati e il mirino rosso finiva a mezz'aria, lontano dall'impatto vero.
 */
const PUNTI_TRAIETTORIA = 160;
/** traiettoria ben leggibile (Lead design, PR #37): puntini oro di 3,5 px di schermo a ogni zoom, uno ogni ~12 px */
const PASSO_PUNTINI_PX = 12;
const PRIMO_PUNTINO_PX = 36;
const MAX_PUNTINI = 220;
const ALFA_MIN_PUNTINI = 0.7;
/** sotto questa scala (px CSS per px di mondo) i nomi dei pirati non si scrivono */
const SCALA_MIN_NOMI = 0.9;
/** il nome si vede solo sul pirata di turno e sul bersaglio: chi sta entro questi px dal punto d'impatto mostrato */
const RAGGIO_BERSAGLIO = 80;

/** etichetta sopra la testa, px CSS: barra dei PV, pillola del numero (larghezza minima) */
const ETICHETTA = { barra: 34, pillolaMin: 24 } as const;

/**
 * Segno della squadra sopra la testa, ~12 px: teschio (la ciurma del giocatore) o àncora (i nemici), chiaro col
 * contorno scuro della ciurma.
 */
export function disegnaSegno(g: Graphics, tipo: 'teschio' | 'ancora', scuro: string): Graphics {
  const bordo = { width: 1.5, color: hex(scuro) };
  const chiaro = hex(PALETTE.testo);
  if (tipo === 'teschio') {
    g.circle(0, -1.5, 5).fill(chiaro).stroke(bordo)
      .roundRect(-3, 1.5, 6, 4, 1.2).fill(chiaro).stroke(bordo)
      .circle(-1.9, -1.6, 1.4).fill(hex(PALETTE.inchiostro))
      .circle(1.9, -1.6, 1.4).fill(hex(PALETTE.inchiostro));
  } else {
    // contorno scuro largo sotto, linea chiara sopra: si legge su cielo, mare e terreno
    const tratto = (w: number, c: number) => g
      .circle(0, -4.5, 1.8).stroke({ width: w, color: c })
      .moveTo(0, -2.7).lineTo(0, 5.5).stroke({ width: w, color: c, cap: 'round' })
      .moveTo(-3, -0.8).lineTo(3, -0.8).stroke({ width: w, color: c, cap: 'round' })
      .moveTo(-5, 2).quadraticCurveTo(-4, 6, 0, 5.5).quadraticCurveTo(4, 6, 5, 2).stroke({ width: w, color: c, cap: 'round' });
    tratto(4, hex(scuro));
    tratto(1.8, chiaro);
  }
  return g;
}

interface VisPirata {
  id: number;
  radice: Container;
  /** pupazzo a pezzi (pirata-rig.ts) */
  rig: RigPirata;
  /** sprite unico per la vista da lontano (sotto SCALA_MIN_PUPAZZO) */
  sagoma: Sprite;
  etichetta: Container;
  barra: Graphics;
  pv: Text;
  /** pillola scura dietro il numero dei PV (studio v2, UX §8) */
  pillola: Graphics;
  nome: Text;
  ultimaVita: number;
  ultimoX: number;
  ultimoY: number;
  /** ms dall'ultimo colpo (lampo + tremolio), −1 = niente */
  colpito: number;
  /** ms dall'atterraggio (ginocchia piegate), −1 = niente */
  atterrato: number;
  /** ms dall'ultimo sparo (rinculo), −1 = niente */
  sparo: number;
  /** ms dalla morte, −1 = vivo */
  morte: number;
  annegato: boolean;
  /** in aria perché un colpo l'ha sbalzato */
  sbalzato: boolean;
  /** px percorsi a piedi e su scale e liane: guidano il passo e le mani (la posa segue la distanza, non il tempo) */
  cammino: number;
  salita: number;
  /** velocità a piedi misurata dal disegno, px/s (serve solo finché la sim non scrive Pirata.mossa) */
  velX: number;
  finestraPx: number;
  finestraMs: number;
  /** mossa mostrata, da quanti ms, e cosa c'era in mano: quando cambiano la posa sfuma dalla vecchia alla nuova */
  mossa: MossaPirata;
  mossaMs: number;
  chiavePosa: string;
  sfumaMs: number;
  sfumaDurata: number;
  parDa: Parametri;
  parA: Parametri;
  parOra: Parametri;
  posa: Posa;
  /** dove guarda il pupazzo */
  verso: 1 | -1;
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
  /** mostra mirino oro e traiettoria (turno del giocatore umano, fase azione) */
  mira: boolean;
  /** il giocatore sta tenendo il mirino col dito: si ingrandisce e compare l'anello della potenza piena */
  mirinoPreso?: boolean;
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
  /** terreno HD (Fase 2): quando la mappa ha hd/ prende il posto di `terreno` appena le tessere sono caricate */
  private hd: TerrenoHd | null = null;
  /** mentre il terreno HD si carica: i rettangoli cambiati nella maschera (estremi compresi), da passargli dopo */
  private cambiHd: [number, number, number, number][] | null = null;
  private distrutta = false;
  readonly effetti: Effetti;
  private readonly forme: Forme;
  private readonly pezzi: PezziPirata;
  private readonly statoPosa: StatoPosa = {
    mossa: 'fermo', ciurma: 'teschio', cammino: 0, salita: 0, tempo: 0, daMs: 0, sfasa: 0, mira: null,
    sparo: -1, colpito: -1, atterrato: -1, sbalzato: false, suolo: true, ko: false, morte: -1, annegato: false,
  };
  private readonly miraPosa: { alzo: number; potenza: number; arma: ArmaPosa } = { alzo: 0, potenza: 0, arma: 'cannone' };
  private readonly strato = {
    decorazioni: new Container(), pirati: new Container(), proiettili: new Container(), traiettoria: new Container(),
  };
  private readonly acqua = new Graphics();
  /** scale e liane, sopra il terreno e sotto i pirati */
  private readonly appigli = new AppigliRender();
  /** maniglia sopra il pirata attivo: mano aperta (può aggrapparsi) o chiusa (appeso) */
  private readonly manoAperta: Sprite;
  private readonly manoChiusa: Sprite;
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
  /** comandi v3: asta oro dal pirata al mirino (lunga quanto la potenza), mirino oro da trascinare, anello della potenza piena */
  private readonly asta = new Graphics();
  private readonly mirinoOro = new Graphics();
  private readonly anelloPotenza = new Graphics();
  /** distanza lungo la traiettoria del primo puntino, in px di schermo (dopo la freccia o dopo il mirino) */
  private primoPuntino = PRIMO_PUNTINO_PX;
  /** grafica dipinta della mappa fatta a mano (null = mappa generata) */
  private readonly sfondi: SfondiMappa | null = null;
  private tempo = 0;
  private scala = 1;
  /** la ciurma del giocatore (teschio sopra la testa); senza giocatore umano (prova 60 fps) la squadra 0 */
  private get squadraMia(): number {
    const i = this.s.squadre.findIndex((q) => q.controllo === 'umano');
    return i < 0 ? 0 : i;
  }
  private chiaveTraiettoria = '';
  private mareDisegnato = -1;

  constructor(renderer: Renderer, private readonly s: StatoBattaglia, mappa: MappaGenerata) {
    this.forme = new Forme(renderer);
    this.pezzi = new PezziPirata(renderer);
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
      // terreno HD: si carica in parallelo agli sfondi; finché non arriva resta il terreno dipinto sulla CPU
      this.cambiHd = [];
      void TerrenoHd.carica(mappa.arte, s.terreno, this.terreno.maschera0, renderer, mappa.arteHd ?? 'hd').then((hd) => {
        const cambi = this.cambiHd ?? [];
        this.cambiHd = null;
        if (!hd) return;
        if (this.distrutta) { hd.distruggi(); return; }
        // i crateri arrivati mentre si caricava: la maschera li ha già, ma una fetta fatta prima no
        for (const [x0, y0, x1, y1] of cambi) hd.maschera(x0, y0, x1, y1);
        this.hd = hd;
        this.mondo.addChildAt(hd.radice, this.mondo.getChildIndex(this.terreno.radice));
        this.terreno.spegni();
      });
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
    this.mondo.addChild(this.appigli.radice, this.anelloTerra, this.strato.pirati, this.strato.proiettili, this.strato.traiettoria, this.effetti.mondo, this.acqua);

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
    this.manoAperta = sprite(this.forme.get('manoAperta'));
    this.manoChiusa = sprite(this.forme.get('manoChiusa'));
    this.manoAperta.visible = this.manoChiusa.visible = false;
    for (const p of s.pirati) this.creaPirata(p);

    // freccia verso destra (angolo 0): asta da 22 a 44 px dal centro del pirata, punta fino a 56 px
    this.frecciaMira
      .moveTo(22, 0).lineTo(46, 0).stroke({ width: 7, color: hex(PALETTE.inchiostro), alpha: 0.45, cap: 'round' })
      .moveTo(22, 0).lineTo(46, 0).stroke({ width: 4, color: hex(PALETTE.oro), cap: 'round' })
      .poly([44, -8, 58, 0, 44, 8]).fill(hex(PALETTE.oro)).stroke({ width: 1.5, color: hex(PALETTE.oroOmbra) });
    this.frecciaMira.visible = false;
    this.schermo.addChild(this.manoAperta, this.manoChiusa, this.contenitoreTraiettoria, this.freccia, this.effetti.schermo);
    // la freccia di mira sta sotto a nomi e PV: il numero dei PV del pirata che tira si deve leggere sempre
    this.schermo.addChildAt(this.frecciaMira, 0);

    // comandi v3. Asta: disegnata lunga 100 px verso destra, poi allungata con scale.x (lo spessore non cambia)
    this.asta
      .moveTo(0, 0).lineTo(100, 0).stroke({ width: 7, color: hex(PALETTE.inchiostro), alpha: 0.45 })
      .moveTo(0, 0).lineTo(100, 0).stroke({ width: 4, color: hex(PALETTE.oro) });
    // mirino oro: disco pieno con bordo scuro e una croce, ben diverso dal mirino rosso dell'impatto
    const R = MIRINO.raggio;
    this.mirinoOro
      .circle(0, 0, R + 2).fill({ color: hex(PALETTE.inchiostro), alpha: 0.45 })
      .circle(0, 0, R).fill(hex(PALETTE.oro)).stroke({ width: 2.5, color: hex(PALETTE.oroOmbra) })
      .circle(0, 0, R - 6).stroke({ width: 2, color: hex('#2B1B10'), alpha: 0.75 })
      .moveTo(-R + 3, 0).lineTo(-4, 0).moveTo(4, 0).lineTo(R - 3, 0)
      .moveTo(0, -R + 3).lineTo(0, -4).moveTo(0, 4).lineTo(0, R - 3).stroke({ width: 2, color: hex('#2B1B10'), alpha: 0.75 })
      .circle(0, 0, 1.8).fill(hex('#2B1B10'));
    // anello tratteggiato alla potenza piena, solo mentre si trascina
    const tratti = 28;
    for (let i = 0; i < tratti; i++) {
      const a0 = (i / tratti) * Math.PI * 2, a1 = ((i + 0.55) / tratti) * Math.PI * 2;
      this.anelloPotenza.moveTo(Math.cos(a0) * MIRINO.rMax, Math.sin(a0) * MIRINO.rMax).arc(0, 0, MIRINO.rMax, a0, a1);
    }
    this.anelloPotenza.stroke({ width: 2, color: hex(PALETTE.oro), alpha: 0.5 });
    this.asta.visible = this.mirinoOro.visible = this.anelloPotenza.visible = false;
    this.schermo.addChildAt(this.asta, 0);
    this.schermo.addChildAt(this.anelloPotenza, 0);
    this.schermo.addChild(this.mirinoOro);
  }

  private creaPirata(p: Pirata): void {
    const sq = this.s.squadre[p.squadra];
    const col = COLORI_CIURMA[sq.ciurma];
    const radice = new Container();
    const rig = this.pezzi.pupazzo(sq.ciurma);
    const sagoma = this.pezzi.sagoma(sq.ciurma);
    sagoma.visible = false;
    radice.addChild(rig.radice, sagoma);
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
    // PV su pillola scura col bordo della ciurma; a sinistra della barra il teschio (la mia ciurma) o l'àncora
    // (i nemici): si riconosce la squadra anche senza distinguere i colori (studio v2, UX §8)
    const pv = new Text({
      text: String(p.vita),
      style: { fontFamily: 'Lilita One, sans-serif', fontSize: 12, fill: hex(PALETTE.testo) },
      resolution: Math.min(2, window.devicePixelRatio || 1),
    });
    pv.anchor.set(0.5, 0.5);
    const pillola = new Graphics();
    const segno = disegnaSegno(new Graphics(), p.squadra === this.squadraMia ? 'teschio' : 'ancora', col.scuro);
    segno.position.set(-ETICHETTA.barra / 2 - 8, -3);
    etichetta.addChild(nome, barra, segno, pillola, pv);
    this.schermo.addChildAt(etichetta, 0);

    const v: VisPirata = {
      id: p.id, radice, rig, sagoma, etichetta, barra, pv, pillola, nome,
      ultimaVita: -1, ultimoX: p.x, ultimoY: p.y, colpito: -1, atterrato: -1, sparo: -1, morte: -1, annegato: false,
      sbalzato: false, cammino: p.id * 9, salita: 0, velX: 0, finestraPx: 0, finestraMs: 0,
      mossa: 'fermo', mossaMs: 1000, chiavePosa: '', sfumaMs: SFUMA_MS, sfumaDurata: SFUMA_MS,
      parDa: nuoviParametri(), parA: nuoviParametri(), parOra: nuoviParametri(), posa: nuovaPosa(), verso: p.verso,
      vitaScia: p.vita, sciaMs: 0,
    };
    this.pirati.set(p.id, v);
    this.disegnaBarra(v, p);
  }

  private disegnaBarra(v: VisPirata, p: Pirata): void {
    const col = COLORI_CIURMA[this.s.squadre[p.squadra].ciurma];
    const larghezza = ETICHETTA.barra, alt = 6;
    const k = Math.max(0, Math.min(1, p.vita / p.vitaMax));
    const ks = Math.max(k, Math.min(1, v.vitaScia / p.vitaMax));
    v.barra.clear()
      .roundRect(-larghezza / 2 - 1, -alt / 2 - 1 - 3, larghezza + 2, alt + 2, 3).fill(hex(PALETTE.inchiostro));
    if (ks > k) v.barra.roundRect(-larghezza / 2, -alt / 2 - 3, Math.max(1, larghezza * ks), alt, 2.5).fill(0xffffff);
    if (k > 0) v.barra.roundRect(-larghezza / 2, -alt / 2 - 3, Math.max(1, larghezza * k), alt, 2.5).fill(hex(col.colore));
    const testo = String(Math.max(0, p.vita));
    if (v.pv.text !== testo || v.ultimaVita < 0) {
      v.pv.text = testo;
      const lw = Math.max(ETICHETTA.pillolaMin, Math.ceil(v.pv.width) + 10);
      const x0 = larghezza / 2 + 4;
      v.pillola.clear().roundRect(x0, -3 - 8, lw, 16, 8).fill({ color: hex(PALETTE.abisso), alpha: 0.88 })
        .stroke({ width: 1.5, color: hex(col.colore) });
      v.pv.position.set(x0 + lw / 2, -3);
    }
    v.ultimaVita = p.vita;
  }

  /** Reazioni agli eventi della sim di questo frame. */
  eventi(ev: readonly EventoBattaglia[]): void {
    for (const e of ev) {
      switch (e.t) {
        case 'appiglioRotto': this.appigli.rotto(e.appiglio, e.x, e.yAlto, e.yBasso); break;
        case 'cratere':
          this.effetti.zolle(e.x, e.y, e.raggio, this.terreno.coloreOriginale(e.x, e.y, e.raggio));
          this.terreno.cratere(e.x, e.y, e.raggio); this.hd?.cratere(e.x, e.y, e.raggio); this.cambiHd?.push([e.x - e.raggio, e.y - e.raggio, e.x + e.raggio, e.y + e.raggio]);
          this.decorazioniSenzaTerra(e.x, e.y, e.raggio);
          break;
        case 'maschera': this.terreno.maschera(e.x0, e.y0, e.x1, e.y1); this.hd?.maschera(e.x0, e.y0, e.x1, e.y1); this.cambiHd?.push([e.x0, e.y0, e.x1, e.y1]); break; // Fase 3: per ora il pezzo sparisce e basta
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
          if (v) { v.colpito = 0; v.sbalzato = true; }
          break;
        }
        case 'atterrato': {
          const v = this.pirati.get(e.pirata);
          if (v) v.atterrato = 0;
          const p = this.s.pirati.find((x) => x.id === e.pirata);
          if (p) this.effetti.polvere(p.x, p.y + MEZZA_CAPSULA, 4);
          break;
        }
        case 'sparo': {
          const v = this.pirati.get(e.pirata);
          const p = this.s.pirati.find((x) => x.id === e.pirata);
          if (!v || !p) break;
          v.sparo = 0;
          // fumo dalla bocca dell'arma (dov'era nell'ultimo frame disegnato)
          const posa = armaPosa(e.arma);
          if (posa === 'cannone' || posa === 'pistola') {
            const b = RigPirata.nelMondo(v.posa, v.verso, v.posa.boccaX, v.posa.boccaY);
            this.effetti.fumo(p.x + b.x, p.y + MEZZA_CAPSULA + b.y, posa === 'cannone' ? 4 : 2);
          }
          break;
        }
        // un piede a terra in corsa (sim della Fase 1): sbuffo di polvere
        case 'passo': if (e.corsa) this.effetti.polvere(e.x, e.y, 1); break;
        case 'scivola': {
          const p = this.s.pirati.find((x) => x.id === e.pirata);
          if (p && e.inizio) this.effetti.polvere(p.x, p.y + MEZZA_CAPSULA, 3);
          break;
        }
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
      // serve terreno sotto il centro e sotto quasi tutta la base, entro 4 px dai piedi: niente piante che volano
      let appoggi = 0, centro = false;
      for (const dx of [-10, -5, 0, 5, 10]) {
        const px = Math.round(d.x + dx);
        let ok = false;
        for (let dy = 0; dy <= 4 && !ok; dy++) { const py = Math.round(d.y + dy); ok = px >= 0 && px < w && py >= 0 && py < h && maschera[py * w + px] !== 0; }
        if (ok) { appoggi++; if (dx === 0) centro = true; }
      }
      if (!centro || appoggi < 4) d.visible = false;
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
    this.hd?.aggiorna();
    this.disegnaCielo(camera, deltaMS);
    this.sfondi?.aggiorna(camera, this.s.terreno.mare);
    this.disegnaAcqua(camera);
    this.effetti.impostaMare(s.terreno.mare);
    this.animaDecorazioni();
    this.appigli.aggiorna(s.appigli ?? [], deltaMS, this.tempo);

    const t = s.turno;
    const attivo = s.pirati.find((p) => p.id === t.pirata && p.stato === 'vivo');
    this.bersaglio = this.trovaBersaglio(attivo);
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
    }
    // maniglia: mano oro aperta se il pirata attivo può aggrapparsi, chiusa se è appeso
    const appeso = !!attivo && mostraMarcatore && attivo.appeso >= 0;
    const presa = !!attivo && mostraMarcatore && !appeso && puoAggrapparsi(attivo, s.appigli ?? []);
    this.manoChiusa.visible = appeso;
    this.manoAperta.visible = presa;
    if (attivo && (appeso || presa)) {
      const sopra = aSchermo(attivo.x, attivo.y - BIL.pirata.altezzaSprite + MEZZA_CAPSULA);
      const m = appeso ? this.manoChiusa : this.manoAperta;
      m.position.set(sopra.x + 28, sopra.y - 36);
      m.scale.set(1.3 * (1 + 0.06 * Math.sin(this.tempo / 200)));
      this.freccia.scale.set(1.3);
    }

    // freccia di mira: parte dal pirata attivo e punta dove si tira (si vede anche nel turno dell'IA che mira)
    const mostraFreccia = !!attivo && t.fase === 'azione' && !s.esito && t.arma !== 'sciabola';
    // nel turno del giocatore al posto della freccia c'è il mirino da trascinare in cima all'asta
    const mostraMirino = mostraFreccia && o.mira;
    this.asta.visible = this.mirinoOro.visible = mostraMirino;
    this.anelloPotenza.visible = mostraMirino && !!o.mirinoPreso;
    this.primoPuntino = PRIMO_PUNTINO_PX;
    if (attivo && mostraMirino) {
      const c = aSchermo(attivo.x, attivo.y);
      const m = mirinoDaMira(t.mira.mezziGradi / 2, t.mira.potenza);
      const r = Math.hypot(m.x, m.y), rot = Math.atan2(m.y, m.x);
      this.asta.position.set(c.x + Math.cos(rot) * MIRINO.astaDa, c.y + Math.sin(rot) * MIRINO.astaDa);
      this.asta.rotation = rot;
      this.asta.scale.x = Math.max(0.01, (r - MIRINO.astaDa - MIRINO.raggio) / 100);
      this.mirinoOro.position.set(c.x + m.x, c.y + m.y);
      this.mirinoOro.scale.set(o.mirinoPreso ? 1.2 : 1 + 0.05 * Math.sin(this.tempo / 260));
      this.anelloPotenza.position.set(c.x, c.y);
      // i puntini della traiettoria cominciano dopo il mirino
      this.primoPuntino = r + 6;
    }
    this.frecciaMira.visible = mostraFreccia && !mostraMirino;
    if (attivo && this.frecciaMira.visible) {
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
    const st = this.statoPosa;
    st.ciurma = this.s.squadre[p.squadra].ciurma;
    st.tempo = this.tempo; st.sfasa = p.id;
    st.mira = null; st.morte = -1; st.ko = false;
    if (v.morte >= 0) {
      // morte: un giro intero rimpicciolendo col cappello che vola via (annegato: braccia in alto, affonda e svanisce)
      v.morte += deltaMS;
      const k = Math.min(1, v.morte / MORTE_MS);
      v.etichetta.visible = false;
      v.sagoma.visible = false; v.rig.radice.visible = k < 1;
      if (v.annegato) v.radice.alpha = 1 - k;
      if (k >= 1) { v.radice.visible = false; return; }
      st.mossa = 'fermo'; st.morte = k; st.annegato = v.annegato;
      v.rig.lampo(false);
      v.rig.applica(risolvi(bersaglio(st, v.parOra), null, v.posa), v.verso, null, false);
      return;
    }

    // tempi delle reazioni (ms dall'evento)
    if (v.colpito >= 0) { v.colpito += deltaMS; if (v.colpito > 300) v.colpito = -1; }
    if (v.atterrato >= 0) { v.atterrato += deltaMS; if (v.atterrato > 180) v.atterrato = -1; }
    if (v.sparo >= 0) { v.sparo += deltaMS; if (v.sparo > ARMA_DOPO_SPARO_MS) v.sparo = -1; }
    if (v.sbalzato && p.aTerra && (v.colpito < 0 || v.colpito > 150)) v.sbalzato = false;

    // quanta strada ha fatto: il passo e le mani sulla scala seguono la distanza
    const dx = p.x - v.ultimoX, dy = p.y - v.ultimoY;
    v.ultimoX = p.x; v.ultimoY = p.y;
    if (deltaMS > 0) {
      const aPiedi = p.aTerra && p.appeso < 0 && Math.abs(dx) < 6;
      if (aPiedi) v.cammino += Math.abs(dx);
      if (p.appeso >= 0 && Math.abs(dy) < 6) v.salita += dy;
      v.finestraPx += aPiedi ? Math.abs(dx) : 0; v.finestraMs += deltaMS;
      if (v.finestraMs >= FINESTRA_VEL_MS) { v.velX = (v.finestraPx / v.finestraMs) * 1000; v.finestraPx = 0; v.finestraMs = 0; }
      // appena riparte non si aspetta la finestra: è già un passo
      else if (aPiedi && Math.abs(dx) > 0.05 && v.velX === 0) v.velX = BIL.pirata.camminata * TICK_AL_SECONDO;
    }

    // verso (l'occhio guarda dove va il pirata); chi aspetta fermo si gira verso il pirata attivo (m1-ritmo §10)
    let verso: 1 | -1 = p.verso;
    if (attivo && attivo !== p && p.aTerra && Math.abs(p.vx) < 0.01 && Math.abs(dx) < 0.01 && Math.abs(attivo.x - p.x) > 4) verso = attivo.x > p.x ? 1 : -1;
    v.verso = verso;

    // posa: dalla mossa della sim; finché la sim della Fase 1 non la scrive si ricava dallo stato (mossaDaStato)
    const ko = p.vita <= 0;
    const appiglio = p.appeso >= 0 ? this.s.appigli.find((a) => a.id === p.appeso)?.tipo ?? null : null;
    const mossa = mossaDaStato(p, v.velX, appiglio);
    const tiene = !ko && (mira || (v.sparo >= 0 && p.id === this.s.turno.pirata));
    let arma: ArmaPosa | null = null;
    if (tiene) {
      const a = this.s.turno.mira.mezziGradi;
      arma = armaPosa(this.s.turno.arma);
      const m = this.miraPosa;
      m.alzo = Math.atan2(seno(a), Math.abs(coseno(a))); m.potenza = this.s.turno.mira.potenza / 100; m.arma = arma;
      st.mira = m;
    }
    const chiave = `${mossa}|${ko ? 1 : 0}|${arma ?? ''}|${v.sbalzato ? 1 : 0}|${p.aTerra ? 1 : 0}`;
    if (chiave !== v.chiavePosa) {
      // posa nuova: si parte da com'è adesso e ci si arriva in 90 ms (400 per rialzarsi da terra)
      if (v.chiavePosa) { v.parDa.set(v.parOra); v.sfumaMs = 0; v.sfumaDurata = v.mossa === 'aTerra' && mossa !== 'aTerra' ? RIALZATA_MS : SFUMA_MS; }
      if (mossa !== v.mossa) { v.mossa = mossa; v.mossaMs = 0; }
      v.chiavePosa = chiave;
    }
    v.mossaMs += deltaMS; v.sfumaMs += deltaMS;
    st.mossa = mossa;
    st.daMs = p.mossaDa !== undefined ? ((this.s.tick - p.mossaDa) * 1000) / TICK_AL_SECONDO : v.mossaMs;
    st.cammino = v.cammino; st.salita = v.salita;
    st.sparo = v.sparo; st.colpito = v.colpito; st.atterrato = v.atterrato;
    st.sbalzato = v.sbalzato; st.suolo = p.aTerra; st.ko = ko;
    bersaglio(st, v.parA);
    if (v.sfumaMs < v.sfumaDurata) sfuma(v.parDa, v.parA, v.sfumaMs, v.parOra, v.sfumaDurata); else v.parOra.set(v.parA);
    risolvi(v.parOra, arma, v.posa);

    // da lontano lo sprite unico (foto del pupazzo a riposo) al posto dei 15 pezzi
    const lontano = this.scala < SCALA_MIN_PUPAZZO;
    v.rig.radice.visible = !lontano; v.sagoma.visible = lontano;
    if (lontano) {
      v.sagoma.scale.x = verso;
      v.sagoma.y = mossa === 'passo' || mossa === 'corsa' ? -1.5 * Math.abs(Math.sin((v.cammino / BIL.movimento.passoPx) * Math.PI)) : 0;
      v.sagoma.rotation = ko ? -verso * (Math.PI / 2) : 0;
    } else {
      v.rig.lampo(v.colpito >= 0 && v.colpito < LAMPO_MS);
      v.rig.applica(v.posa, verso, arma, p.aTerra);
    }

    // a 0 PV il pirata resta 'vivo' e seduto a terra fino alla lapide di fine risoluzione (README della sim)
    if (ko) {
      const e = aSchermo(p.x, piedi - 24);
      v.etichetta.position.set(Math.round(e.x), Math.round(e.y));
      return;
    }

    // etichetta (nome, barra e PV) sopra la testa, in px CSS; da lontano il nome si nasconde (si sovrapporrebbe)
    // e si vede solo su chi è di turno e sul bersaglio: gli altri tengono barra e PV (studio v2, UX §3.5)
    v.nome.visible = this.scala >= SCALA_MIN_NOMI && (p === attivo || p.id === this.bersaglio);
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

  /** id del pirata vivo più vicino al punto d'impatto mostrato (mirino rosso), o −1 se non si mira su nessuno */
  private bersaglio = -1;
  private trovaBersaglio(attivo: Pirata | undefined): number {
    const s = this.s, fine = this.fineMira;
    if (!attivo || !fine || !s.config.traiettoriaCompleta || s.turno.fase !== 'azione') return -1;
    let id = -1, meglio = RAGGIO_BERSAGLIO * RAGGIO_BERSAGLIO;
    for (const p of s.pirati) {
      if (p === attivo || p.stato !== 'vivo') continue;
      const d = (p.x - fine.x) ** 2 + (p.y - fine.y) ** 2;
      if (d <= meglio) { meglio = d; id = p.id; }
    }
    return id;
  }

  /**
   * L'ultimo punto della traiettoria mostrata, in px di mondo: il punto d'impatto (dove sta il mirino rosso)
   * quando la traiettoria è intera. null se non si sta mirando o l'arma non ha traiettoria.
   */
  get fineMira(): Punto | null {
    if (!this.chiaveTraiettoria || this.puntiTraiettoria.length < 2) return null;
    return this.puntiTraiettoria[this.puntiTraiettoria.length - 1];
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
      // i primi px li coprono già la freccia di mira o l'asta col mirino: i puntini partono dopo
      let resto = this.primoPuntino;
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
      // mirino fuori schermo (zoom automatico spento, o camera spostata a mano): freccia rossa sul bordo verso di lui
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

  /** misure del terreno HD (caricamento, tessere, memoria), o null se la mappa non lo ha (o non è ancora pronto) */
  get misureHd(): MisureHd | null { return this.hd?.misure ?? null; }

  distruggi(): void {
    this.distrutta = true;
    this.sfondi?.distruggi();
    this.hd?.distruggi();
    this.terreno.distruggi();
    this.effetti.distruggi();
    this.cielo.destroy({ children: true });
    this.mondo.destroy({ children: true });
    this.schermo.destroy({ children: true });
    this.forme.distruggi();
    this.pezzi.distruggi();
  }
}
