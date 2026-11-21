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
import { Effetti } from './effetti';
import { Forme, sprite, type IdForma } from './forme';
import { TerrenoRender } from './terreno';

function mescola(a: string, b: string, t: number): number {
  const ca = hex(a), cb = hex(b);
  const ch = (k: number) => Math.round(((ca >> k) & 255) * (1 - t) + ((cb >> k) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

const MEZZA_CAPSULA = BIL.pirata.capsulaAltezza / 2;
/** durata della morte del segnaposto: 10 f a 12 fps (11 §5) */
const MORTE_MS = 833;
const PUNTI_TRAIETTORIA = 60;
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
}

export interface OpzioniDisegno {
  /** mostra anello e traiettoria (turno del giocatore umano, fase azione) */
  mira: boolean;
  /** anello di mira acceso (il dito sta trascinando la fionda) */
  fiondaAttiva: boolean;
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
  private readonly proiettili = new Map<number, Sprite>();
  private readonly puntini: Sprite[] = [];
  private readonly anelloTerra: Sprite;
  private readonly freccia: Sprite;
  private readonly anelloMira = new Graphics();
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

    this.anelloTerra = sprite(this.forme.get('anello'));
    this.anelloTerra.tint = hex(PALETTE.oro);
    this.freccia = sprite(this.forme.get('freccia'));
    this.mondo.addChild(this.anelloTerra, this.strato.pirati, this.strato.proiettili, this.strato.traiettoria, this.effetti.mondo, this.acqua);

    for (let i = 0; i < PUNTI_TRAIETTORIA; i++) {
      const p = sprite(this.forme.get('puntino'));
      p.visible = false;
      this.puntini.push(p);
      this.strato.traiettoria.addChild(p);
    }
    for (const p of s.pirati) this.creaPirata(p);

    this.anelloMira.circle(0, 0, BIL.mira.anelloPx).stroke({ width: 2, color: hex(PALETTE.oro), alpha: 0.55 })
      .circle(0, 0, BIL.mira.anelloPx).fill({ color: hex(PALETTE.oro), alpha: 0.06 });
    this.anelloMira.visible = false;
    this.schermo.addChild(this.anelloMira, this.freccia, this.effetti.schermo);
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
    };
    this.pirati.set(p.id, v);
    this.disegnaBarra(v, p);
  }

  private disegnaBarra(v: VisPirata, p: Pirata): void {
    const col = COLORI_CIURMA[this.s.squadre[p.squadra].ciurma];
    const larghezza = 34, alt = 6;
    const k = Math.max(0, Math.min(1, p.vita / p.vitaMax));
    v.barra.clear()
      .roundRect(-larghezza / 2 - 1, -alt / 2 - 1 - 3, larghezza + 2, alt + 2, 3).fill(hex(PALETTE.inchiostro))
      .roundRect(-larghezza / 2, -alt / 2 - 3, Math.max(1, larghezza * k), alt, 2.5).fill(hex(col.colore));
    v.pv.text = String(Math.max(0, p.vita));
    v.ultimaVita = p.vita;
  }

  /** Reazioni agli eventi della sim di questo frame. */
  eventi(ev: readonly EventoBattaglia[]): void {
    for (const e of ev) {
      switch (e.t) {
        case 'cratere': this.terreno.cratere(e.x, e.y, e.raggio); this.decorazioniSenzaTerra(e.x, e.y, e.raggio); break;
        case 'esplosione': this.effetti.esplosione(e.x, e.y, e.raggio); break;
        case 'splash': this.effetti.splash(e.x, e.y, e.grande); break;
        case 'colpoPistola': this.effetti.lineaPistola(e.da.x, e.da.y, e.a.x, e.a.y); break;
        case 'colpoSciabola': {
          const p = this.s.pirati.find((x) => x.id === e.pirata);
          if (p) this.effetti.fendente(p.x + p.verso * 10, p.y, p.verso);
          break;
        }
        case 'danno': {
          this.effetti.numero(e.quanto, e.x, e.y);
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
    this.mondo.position.set(camera.w / 2 - camera.x * k, camera.h / 2 - camera.y * k);
    const aSchermo = (x: number, y: number) => camera.schermoDaMondo(x, y);

    this.terreno.aggiorna();
    this.disegnaCielo(camera, deltaMS);
    this.disegnaAcqua(camera);

    const t = s.turno;
    const attivo = s.pirati.find((p) => p.id === t.pirata && p.stato === 'vivo');
    for (const p of s.pirati) this.aggiornaPirata(p, deltaMS, aSchermo, p === attivo && t.fase === 'azione');

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

    // anello di mira (100 px CSS attorno al pirata attivo)
    this.anelloMira.visible = !!attivo && o.mira;
    if (attivo && o.mira) {
      const c = aSchermo(attivo.x, attivo.y);
      this.anelloMira.position.set(c.x, c.y);
      this.anelloMira.alpha = o.fiondaAttiva ? 1 : 0.6;
    }

    this.aggiornaProiettili();
    this.aggiornaTraiettoria(o.mira && !!attivo);
    this.effetti.aggiorna(deltaMS, aSchermo);
  }

  private aggiornaPirata(p: Pirata, deltaMS: number, aSchermo: (x: number, y: number) => Punto, mira: boolean): void {
    const v = this.pirati.get(p.id);
    if (!v) return;
    const piedi = p.y + MEZZA_CAPSULA;
    v.radice.position.set(p.x, piedi);
    if (p.vita !== v.ultimaVita) this.disegnaBarra(v, p);

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

    // verso (l'occhio guarda dove va il pirata)
    let sx = p.verso, sy = 1, rot = 0, dy = 0;
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
      v.lampo.alpha = Math.max(0, 1 - v.colpito / 200);
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

  private aggiornaProiettili(): void {
    const visti = new Set<number>();
    for (const pr of this.s.proiettili) {
      visti.add(pr.id);
      let sp = this.proiettili.get(pr.id);
      if (!sp) {
        sp = sprite(this.forme.get(pr.tipo === 'lapide' ? 'lapide' : pr.tipo));
        this.proiettili.set(pr.id, sp);
        this.strato.proiettili.addChild(sp);
      }
      sp.position.set(pr.x, pr.y);
      if (pr.tipo === 'granata' || pr.tipo === 'barile') { if (!pr.fermo) sp.rotation += pr.vx * 0.08; }
    }
    for (const [id, sp] of this.proiettili) if (!visti.has(id)) { sp.destroy(); this.proiettili.delete(id); }
  }

  private aggiornaTraiettoria(mostra: boolean): void {
    if (!mostra) {
      if (this.chiaveTraiettoria) { for (const p of this.puntini) p.visible = false; this.chiaveTraiettoria = ''; }
      return;
    }
    const s = this.s;
    const attivo = s.pirati.find((p) => p.id === s.turno.pirata);
    const chiave = `${s.turno.mira.mezziGradi}|${s.turno.mira.potenza}|${s.turno.arma}|${s.vento}|${attivo?.x.toFixed(1)}|${attivo?.y.toFixed(1)}`;
    if (chiave === this.chiaveTraiettoria) return;
    this.chiaveTraiettoria = chiave;
    const punti = traiettoria(s, PUNTI_TRAIETTORIA);
    // intera a Mozzo (e nei tutorial), altrimenti solo il primo 30% (00 §3)
    const n = s.config.traiettoriaCompleta ? punti.length : Math.ceil(punti.length * BIL.mira.traiettoria);
    for (let i = 0; i < this.puntini.length; i++) {
      const d = this.puntini[i];
      if (i < n && i < punti.length) {
        d.visible = true;
        d.position.set(punti[i].x, punti[i].y);
        d.alpha = 0.95 - (0.6 * i) / Math.max(1, n);
        d.scale.set(i % 2 ? 0.55 : 0.75);
      } else d.visible = false;
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
    // nuvole: scorrono piano e si spostano un poco con la camera (parallasse)
    this.nuvole.forEach((n, i) => {
      n.x += ((6 + 4 * (i % 3)) * deltaMS) / 1000;
      const largo = 160 * n.scale.x;
      if (n.x - largo > camera.w) n.x = -largo;
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
    this.acqua.x = ((this.tempo / 1000) * 18) % (Math.PI * 80);
    this.acqua.y = this.mareDisegnato + Math.sin(this.tempo / 700) * 1.5;
    void camera;
  }

  distruggi(): void {
    this.terreno.distruggi();
    this.effetti.distruggi();
    this.cielo.destroy({ children: true });
    this.mondo.destroy({ children: true });
    this.schermo.destroy({ children: true });
    this.forme.distruggi();
  }
}
