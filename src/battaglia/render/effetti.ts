// Effetti segnaposto (11 §5): esplosione, fumo, splash, lampi. Particelle con un pool di Sprite sulla stessa
// texture bianca (tinta per colore): una sola texture, un solo batch, niente allocazioni durante la battaglia.
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { PALETTE, hex } from '../../core/palette';
import type { Forme } from './forme';

interface Particella {
  s: Sprite;
  vx: number; vy: number;
  /** ms vissuti e durata */
  t: number; durata: number;
  r0: number; r1: number;
  a0: number; a1: number;
  tinta: number;
  /** esplosione: cresce nei primi 150 ms, poi cambia colore (arancione → giallo) e svanisce; −1 = particella normale */
  colore2: number;
  gravita: number;
}

interface Numero { t: Text; vita: number; x: number; y: number }
interface Linea { g: Graphics; vita: number; durata: number }

/** raggio della texture 'cerchio' */
const R_TEX = 16;

export class Effetti {
  /** nel mondo, sopra i pirati */
  readonly mondo = new Container();
  /** sullo schermo (numeri di danno), sopra tutto */
  readonly schermo = new Container();
  private vive: Particella[] = [];
  private libere: Sprite[] = [];
  private numeri: Numero[] = [];
  private linee: Linea[] = [];

  constructor(private readonly forme: Forme) {}

  private particella(x: number, y: number, p: Omit<Particella, 's' | 't'>): void {
    const s = this.libere.pop() ?? (() => {
      const n = new Sprite(this.forme.get('cerchio').texture); n.anchor.set(0.5); this.mondo.addChild(n); return n;
    })();
    s.visible = true; s.position.set(x, y); s.tint = p.tinta; s.alpha = p.a0;
    this.vive.push({ s, t: 0, ...p });
  }

  /** 11 §5: cerchio arancione che si espande in 150 ms, poi giallo che svanisce; 6 sbuffi grigi che salgono. 500 ms. */
  esplosione(x: number, y: number, raggio: number): void {
    const arancio = 0xff8a2b, giallo = hex(PALETTE.oro);
    this.particella(x, y, { vx: 0, vy: 0, durata: 500, r0: 2, r1: raggio, a0: 1, a1: 0, colore2: giallo, gravita: 0, tinta: arancio });
    this.particella(x, y, { vx: 0, vy: 0, durata: 180, r0: raggio * 0.3, r1: raggio * 0.8, a0: 0.9, a1: 0, colore2: -1, gravita: 0, tinta: 0xffffff });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      this.particella(x + Math.cos(a) * raggio * 0.4, y + Math.sin(a) * raggio * 0.3, {
        vx: Math.cos(a) * 0.02, vy: -0.05 - (i % 3) * 0.015, durata: 900, r0: raggio * 0.2, r1: raggio * 0.45, a0: 0.75, a1: 0, colore2: -1, gravita: 0, tinta: 0x8a8a8a,
      });
    }
  }

  /** sbuffi di fumo (morte del pirata: 5 cerchi) */
  fumo(x: number, y: number, n = 5): void {
    for (let i = 0; i < n; i++) {
      this.particella(x + (i - 2) * 4, y - i * 3, {
        vx: (i - 2) * 0.01, vy: -0.04, durata: 800, r0: 4, r1: 10, a0: 0.8, a1: 0, colore2: -1, gravita: 0, tinta: 0xb0b0b0,
      });
    }
  }

  /** 3 ellissi azzurre verso l'alto (piccolo) o 7 (grande) */
  splash(x: number, y: number, grande: boolean): void {
    const n = grande ? 7 : 3;
    for (let i = 0; i < n; i++) {
      const dx = (i - (n - 1) / 2) / n;
      this.particella(x + dx * 16, y, {
        vx: dx * 0.12, vy: -0.22 - (1 - Math.abs(dx)) * 0.12, durata: 700, r0: grande ? 6 : 4, r1: 2, a0: 0.95, a1: 0.2, colore2: -1, gravita: 0.0009, tinta: hex(i % 2 ? PALETTE.schiuma : PALETTE.mareBasso),
      });
    }
  }

  /** linea del colpo di pistola, svanisce in 150 ms */
  lineaPistola(x0: number, y0: number, x1: number, y1: number): void {
    const g = new Graphics().moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 2, color: hex(PALETTE.oro) });
    this.mondo.addChild(g);
    this.linee.push({ g, vita: 0, durata: 150 });
    this.particella(x1, y1, { vx: 0, vy: 0, durata: 150, r0: 3, r1: 9, a0: 1, a1: 0, colore2: -1, gravita: 0, tinta: 0xffffff });
  }

  /** arco della sciabola davanti al pirata */
  fendente(x: number, y: number, verso: number): void {
    const g = new Graphics().arc(x, y, 22, verso > 0 ? -1.2 : Math.PI - 0.6, verso > 0 ? 0.6 : Math.PI + 1.2)
      .stroke({ width: 4, color: 0xffffff, alpha: 0.9 });
    this.mondo.addChild(g);
    this.linee.push({ g, vita: 0, durata: 220 });
  }

  /** numero di danno che sale e svanisce (posizione in px CSS dello schermo, aggiornata da chi chiama) */
  numero(quanto: number, x: number, y: number): void {
    const t = new Text({
      text: `-${quanto}`,
      style: { fontFamily: 'Lilita One, sans-serif', fontSize: 20, fill: hex(PALETTE.pericolo), stroke: { color: hex(PALETTE.inchiostro), width: 4 } },
      resolution: Math.min(2, window.devicePixelRatio || 1),
    });
    t.anchor.set(0.5, 1);
    this.schermo.addChild(t);
    this.numeri.push({ t, vita: 0, x, y });
  }

  /** `aSchermo` converte una posizione di mondo in px CSS (per i numeri di danno, che stanno sullo schermo) */
  aggiorna(deltaMS: number, aSchermo: (x: number, y: number) => { x: number; y: number }): void {
    for (let i = this.vive.length - 1; i >= 0; i--) {
      const p = this.vive[i];
      p.t += deltaMS;
      const k = Math.min(1, p.t / p.durata);
      p.vy += p.gravita * deltaMS;
      p.s.x += p.vx * deltaMS; p.s.y += p.vy * deltaMS;
      // l'esplosione cresce nei primi 150 ms, poi resta e svanisce
      const esplode = p.colore2 !== -1;
      const kr = esplode ? Math.min(1, p.t / 150) : k;
      p.s.scale.set((p.r0 + (p.r1 - p.r0) * kr) / R_TEX);
      p.s.alpha = esplode ? (p.t < 150 ? p.a0 : p.a0 + (p.a1 - p.a0) * ((p.t - 150) / (p.durata - 150))) : p.a0 + (p.a1 - p.a0) * k;
      if (esplode && p.t >= 150 && p.s.tint !== p.colore2) p.s.tint = p.colore2;
      if (k >= 1) { p.s.visible = false; this.libere.push(p.s); this.vive.splice(i, 1); }
    }
    for (let i = this.linee.length - 1; i >= 0; i--) {
      const l = this.linee[i];
      l.vita += deltaMS;
      l.g.alpha = 1 - l.vita / l.durata;
      if (l.vita >= l.durata) { l.g.destroy(); this.linee.splice(i, 1); }
    }
    for (let i = this.numeri.length - 1; i >= 0; i--) {
      const n = this.numeri[i];
      n.vita += deltaMS;
      const pos = aSchermo(n.x, n.y);
      n.t.position.set(pos.x, pos.y - (n.vita / 1000) * 40);
      n.t.alpha = n.vita < 700 ? 1 : 1 - (n.vita - 700) / 400;
      if (n.vita >= 1100) { n.t.destroy(); this.numeri.splice(i, 1); }
    }
  }

  get attivi(): number { return this.vive.length + this.numeri.length + this.linee.length; }

  distruggi(): void {
    this.mondo.destroy({ children: true });
    for (const n of this.numeri) n.t.destroy();
    this.schermo.destroy({ children: true });
  }
}
