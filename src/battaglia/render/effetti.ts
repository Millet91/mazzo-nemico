// Effetti della battaglia (11 §5 + passata di ritmo m1-ritmo §4-6): palla di fuoco, fumo, zolle del materiale,
// scie, splash, cappello che galleggia, numeri di danno. Le particelle sono un pool di Sprite sulla stessa
// texture bianca tinta per colore (un solo batch) con un tetto di 300: oltre, le più vecchie si riciclano.
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { PALETTE, hex } from '../../core/palette';
import type { Forme } from './forme';

/** tetto delle particelle vive (m1-ritmo §5) */
export const MAX_PARTICELLE = 300;
/** raggio della texture 'cerchio' */
const R_TEX = 16;

interface Particella {
  s: Sprite;
  vx: number; vy: number;
  /** ms vissuti e durata */
  t: number; durata: number;
  r0: number; r1: number;
  a0: number; a1: number;
  /** px/ms² verso il basso */
  gravita: number;
  /** palla di fuoco: arancione → giallo a metà vita */
  colore2: number;
}

interface Numero {
  t: Text;
  pirata: number;
  vita: number;
  quanto: number;
  x: number; y: number;
  ko: Text | null;
}

interface Linea { g: Graphics; vita: number; durata: number }
interface Cappello { s: Sprite; vita: number; x: number }

/** finestra in cui i danni allo stesso pirata si sommano in un numero solo (stesso colpo) */
const SOMMA_MS = 200;
const NUMERO_MS = 800;
const NUMERO_SALITA = 50;
const CAPPELLO_MS = 2000;

/** numero casuale solo grafico (le particelle non toccano la sim) */
const caso = (a: number, b: number) => a + Math.random() * (b - a);

/** 0,4 → 1,25 → 1 in 180 ms */
export function scalaNumero(ms: number): number {
  if (ms >= 180) return 1;
  if (ms < 120) return 0.4 + (1.25 - 0.4) * (ms / 120);
  return 1.25 - 0.25 * ((ms - 120) / 60);
}

export class Effetti {
  /** nel mondo, sopra i pirati */
  readonly mondo = new Container();
  /** sullo schermo (numeri di danno), sopra tutto */
  readonly schermo = new Container();
  private vive: Particella[] = [];
  private libere: Sprite[] = [];
  private numeri: Numero[] = [];
  private linee: Linea[] = [];
  private cappelli: Cappello[] = [];
  private mare = 950;

  constructor(private readonly forme: Forme) {}

  private particella(x: number, y: number, p: Omit<Particella, 's' | 't' | 'colore2'> & { tinta: number; colore2?: number }): void {
    let s = this.libere.pop();
    if (!s) {
      if (this.vive.length >= MAX_PARTICELLE) {
        // tetto raggiunto: si ricicla la più vecchia
        s = this.vive.shift()!.s;
      } else {
        s = new Sprite(this.forme.get('cerchio').texture);
        s.anchor.set(0.5);
        this.mondo.addChild(s);
      }
    }
    s.visible = true; s.position.set(x, y); s.tint = p.tinta; s.alpha = p.a0; s.scale.set(p.r0 / R_TEX);
    this.vive.push({ s, t: 0, vx: p.vx, vy: p.vy, durata: p.durata, r0: p.r0, r1: p.r1, a0: p.a0, a1: p.a1, gravita: p.gravita, colore2: p.colore2 ?? -1 });
  }

  /** Esplosione: palla di fuoco (12, 350 ms) + fumo (8, 900 ms) + lampo bianco. */
  esplosione(x: number, y: number, raggio: number): void {
    const arancio = 0xff8a2b, giallo = hex(PALETTE.oro);
    this.particella(x, y, { vx: 0, vy: 0, durata: 120, r0: raggio * 0.4, r1: raggio * 1.1, a0: 0.95, a1: 0, gravita: 0, tinta: 0xffffff });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + caso(-0.2, 0.2);
      const v = caso(0.04, 0.12) * (raggio / 40);
      this.particella(x, y, {
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.02, durata: caso(260, 350),
        r0: raggio * caso(0.25, 0.4), r1: raggio * caso(0.05, 0.15), a0: 1, a1: 0.2, gravita: 0, tinta: arancio, colore2: giallo,
      });
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      this.particella(x + Math.cos(a) * raggio * 0.35, y + Math.sin(a) * raggio * 0.25, {
        vx: Math.cos(a) * 0.015, vy: -caso(0.03, 0.06), durata: caso(750, 900),
        r0: raggio * 0.18, r1: raggio * caso(0.4, 0.55), a0: 0.7, a1: 0, gravita: 0, tinta: 0x8a8a8a,
      });
    }
  }

  /** Zolle del colore del materiale scavato, con gravità (10-16). */
  zolle(x: number, y: number, raggio: number, colore: number): void {
    const n = Math.round(caso(10, 16));
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + caso(-1.2, 1.2);
      const v = caso(0.12, 0.3) * Math.min(1.4, raggio / 40);
      this.particella(x + caso(-raggio, raggio) * 0.4, y + caso(-raggio, raggio) * 0.3, {
        vx: Math.cos(a) * v, vy: Math.sin(a) * v, durata: caso(600, 900),
        r0: caso(2, 4), r1: caso(1.5, 3), a0: 1, a1: 0.8, gravita: 0.0008, tinta: colore,
      });
    }
  }

  /** Sbuffo di scia dietro a un proiettile (vita 400 ms). */
  scia(x: number, y: number): void {
    this.particella(x, y, { vx: 0, vy: -0.01, durata: 400, r0: 2.5, r1: 6, a0: 0.55, a1: 0, gravita: 0, tinta: 0xd8d8d8 });
  }

  /** sbuffi di fumo (morte del pirata: 5 cerchi) */
  fumo(x: number, y: number, n = 5): void {
    for (let i = 0; i < n; i++) {
      this.particella(x + (i - 2) * 4, y - i * 3, { vx: (i - 2) * 0.01, vy: -0.04, durata: 800, r0: 4, r1: 10, a0: 0.8, a1: 0, gravita: 0, tinta: 0xb0b0b0 });
    }
  }

  /** sbuffi di polvere chiara ai piedi (atterraggio, corsa, scivolata): bassi e brevi */
  polvere(x: number, y: number, n = 3): void {
    for (let i = 0; i < n; i++) {
      const lato = n === 1 ? caso(-0.5, 0.5) : (i / (n - 1)) * 2 - 1;
      this.particella(x + lato * 5, y - 1, {
        vx: lato * caso(0.02, 0.05), vy: -caso(0.005, 0.02), durata: caso(260, 380),
        r0: 1.6, r1: caso(3.5, 5), a0: 0.6, a1: 0, gravita: 0, tinta: 0xe8dcc0,
      });
    }
  }

  /** splash: 3 gocce (piccolo) o 20 (grande, in mare) */
  splash(x: number, y: number, grande: boolean): void {
    const n = grande ? 20 : 3;
    for (let i = 0; i < n; i++) {
      const dx = (i - (n - 1) / 2) / n;
      this.particella(x + dx * (grande ? 30 : 16), y, {
        vx: dx * (grande ? 0.2 : 0.12) + caso(-0.02, 0.02), vy: -(grande ? caso(0.25, 0.45) : 0.22) * (1 - Math.abs(dx) * 0.8),
        durata: grande ? caso(700, 1000) : 700, r0: grande ? caso(3, 6) : 4, r1: 2, a0: 0.95, a1: 0.2, gravita: 0.0009,
        tinta: hex(i % 2 ? PALETTE.schiuma : PALETTE.mareBasso),
      });
    }
  }

  /** Il cappello del pirata annegato galleggia per 2 s (m1-ritmo §5). */
  cappello(x: number): void {
    const s = new Sprite(this.forme.get('cappello').texture);
    s.anchor.set(0.5, 0.8);
    s.position.set(x, this.mare);
    this.mondo.addChild(s);
    this.cappelli.push({ s, vita: 0, x });
  }

  impostaMare(y: number): void { this.mare = y; }

  /** linea del colpo di pistola, svanisce in 150 ms */
  lineaPistola(x0: number, y0: number, x1: number, y1: number): void {
    const g = new Graphics().moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 2, color: hex(PALETTE.oro) });
    this.mondo.addChild(g);
    this.linee.push({ g, vita: 0, durata: 150 });
    this.particella(x1, y1, { vx: 0, vy: 0, durata: 150, r0: 3, r1: 9, a0: 1, a1: 0, gravita: 0, tinta: 0xffffff });
  }

  /** arco della sciabola davanti al pirata */
  fendente(x: number, y: number, verso: number): void {
    const g = new Graphics().arc(x, y, 22, verso > 0 ? -1.2 : Math.PI - 0.6, verso > 0 ? 0.6 : Math.PI + 1.2)
      .stroke({ width: 4, color: 0xffffff, alpha: 0.9 });
    this.mondo.addChild(g);
    this.linee.push({ g, vita: 0, durata: 220 });
  }

  /**
   * Numero di danno (m1-ritmo §6): Lilita 28 px, 40 px con "K.O.!" sull'uccisione; i danni allo stesso pirata
   * entro 200 ms si sommano (stesso colpo). `x, y` in px di mondo: la posizione sullo schermo segue la camera.
   */
  numero(pirata: number, quanto: number, x: number, y: number, ko: boolean): void {
    const n = this.numeri.find((q) => q.pirata === pirata && q.vita < SOMMA_MS && quanto > 0);
    if (n) {
      n.quanto += quanto;
      n.t.text = `-${n.quanto}`;
      if (ko) this.segnaKo(n);
      return;
    }
    const t = this.testo(quanto > 0 ? `-${quanto}` : `+${-quanto}`, 28, quanto > 0 ? PALETTE.pericolo : PALETTE.ok);
    const nuovo: Numero = { t, pirata, vita: 0, quanto, x, y, ko: null };
    this.numeri.push(nuovo);
    if (ko) this.segnaKo(nuovo);
  }

  private segnaKo(n: Numero): void {
    n.t.style.fontSize = 40;
    if (!n.ko) { n.ko = this.testo('K.O.!', 22, PALETTE.oro); }
  }

  private testo(s: string, dim: number, colore: string): Text {
    const t = new Text({
      text: s,
      style: { fontFamily: 'Lilita One, sans-serif', fontSize: dim, fill: hex(colore), stroke: { color: hex(PALETTE.inchiostro), width: 5 } },
      resolution: Math.min(2, window.devicePixelRatio || 1),
    });
    t.anchor.set(0.5, 1);
    this.schermo.addChild(t);
    return t;
  }

  /** `aSchermo` converte una posizione di mondo in px CSS (per i numeri, che stanno sullo schermo) */
  aggiorna(deltaMS: number, aSchermo: (x: number, y: number) => { x: number; y: number }): void {
    for (let i = this.vive.length - 1; i >= 0; i--) {
      const p = this.vive[i];
      p.t += deltaMS;
      const k = Math.min(1, p.t / p.durata);
      p.vy += p.gravita * deltaMS;
      p.s.x += p.vx * deltaMS; p.s.y += p.vy * deltaMS;
      p.s.scale.set((p.r0 + (p.r1 - p.r0) * k) / R_TEX);
      p.s.alpha = p.a0 + (p.a1 - p.a0) * k;
      if (p.colore2 >= 0 && k > 0.4) { p.s.tint = p.colore2; p.colore2 = -1; }
      if (k >= 1) { p.s.visible = false; this.libere.push(p.s); this.vive.splice(i, 1); }
    }
    for (let i = this.linee.length - 1; i >= 0; i--) {
      const l = this.linee[i];
      l.vita += deltaMS;
      l.g.alpha = 1 - l.vita / l.durata;
      if (l.vita >= l.durata) { l.g.destroy(); this.linee.splice(i, 1); }
    }
    for (let i = this.cappelli.length - 1; i >= 0; i--) {
      const c = this.cappelli[i];
      c.vita += deltaMS;
      c.s.position.set(c.x + Math.sin(c.vita / 400) * 4, this.mare + Math.sin(c.vita / 250) * 2);
      c.s.rotation = Math.sin(c.vita / 300) * 0.2;
      c.s.alpha = c.vita < CAPPELLO_MS - 400 ? 1 : (CAPPELLO_MS - c.vita) / 400;
      if (c.vita >= CAPPELLO_MS) { c.s.destroy(); this.cappelli.splice(i, 1); }
    }
    for (let i = this.numeri.length - 1; i >= 0; i--) {
      const n = this.numeri[i];
      n.vita += deltaMS;
      const pos = aSchermo(n.x, n.y);
      const su = Math.min(1, n.vita / NUMERO_MS) * NUMERO_SALITA;
      const alfa = n.vita < NUMERO_MS - 200 ? 1 : Math.max(0, (NUMERO_MS + 150 - n.vita) / 350);
      n.t.position.set(pos.x, pos.y - su);
      n.t.scale.set(scalaNumero(n.vita));
      n.t.alpha = alfa;
      if (n.ko) {
        n.ko.position.set(pos.x, pos.y - su - 40 * n.t.scale.y);
        n.ko.scale.set(scalaNumero(n.vita));
        n.ko.alpha = alfa;
      }
      if (n.vita >= NUMERO_MS + 150) { n.t.destroy(); n.ko?.destroy(); this.numeri.splice(i, 1); }
    }
  }

  get attivi(): number { return this.vive.length + this.numeri.length + this.linee.length + this.cappelli.length; }
  get particelle(): number { return this.vive.length; }

  distruggi(): void {
    for (const n of this.numeri) { n.t.destroy(); n.ko?.destroy(); }
    this.numeri = [];
    this.mondo.destroy({ children: true });
    this.schermo.destroy({ children: true });
  }
}
