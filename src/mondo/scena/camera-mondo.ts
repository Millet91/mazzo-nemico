// Camera della mappa del mondo (Tavolo del Timone). Parte PURA (niente Pixi), testata in Node.
// Coordinate: "schermo" = px CSS del canvas; "mondo" = px della mappa logica 3072×1728 (contenuti/capitolo-1.ts).
// `scala` = px CSS per px di mondo. Si può allargare fino a vedere tutta la carta col bordo del tavolo e stringere
// fino a SCALA_MAX; il centro resta sempre sopra la carta (più un margine di tavolo).

/** ingrandimento massimo: isole e segnaposti sono dipinti a 2 px per unità, oltre 1,6 si sgranano */
export const SCALA_MAX = 1.6;
/** tavolo visibile oltre il bordo della carta quando si guarda tutto */
export const MARGINE_TAVOLO = 160;
/** inerzia dopo un trascinamento (come in battaglia) */
const INERZIA_TAU_MS = 120;
const INERZIA_MAX = 3; // px CSS per ms
const INERZIA_FERMA = 0.02;

export interface Riquadro { x0: number; y0: number; x1: number; y1: number }
interface Volo { da: { x: number; y: number; s: number }; a: { x: number; y: number; s: number }; ms: number; durata: number }

const morbido = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class CameraMondo {
  /** centro della vista in px di mondo */
  x: number;
  y: number;
  scala = 0.5;
  w = 800;
  h = 360;
  private volo: Volo | null = null;
  private inerzia: { vx: number; vy: number } | null = null;

  constructor(readonly mondoW = 3072, readonly mondoH = 1728) {
    this.x = mondoW / 2; this.y = mondoH / 2;
  }

  /** la scala più piccola: tutta la carta e un po' di tavolo */
  get scalaMin(): number {
    return Math.min(this.w / (this.mondoW + 2 * MARGINE_TAVOLO), this.h / (this.mondoH + 2 * MARGINE_TAVOLO));
  }

  impostaSchermo(w: number, h: number): void {
    this.w = Math.max(1, w); this.h = Math.max(1, h);
    this.limita();
  }

  schermoDaMondo(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.x) * this.scala + this.w / 2, y: (y - this.y) * this.scala + this.h / 2 };
  }

  mondoDaSchermo(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.w / 2) / this.scala + this.x, y: (y - this.h / 2) / this.scala + this.y };
  }

  /** Centro e scala che mostrano tutto il riquadro (con `bordo` px CSS liberi attorno). */
  inquadra(r: Riquadro, bordo = 24): { x: number; y: number; s: number } {
    const s = Math.min((this.w - 2 * bordo) / Math.max(1, r.x1 - r.x0), (this.h - 2 * bordo) / Math.max(1, r.y1 - r.y0));
    return { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, s: this.scalaValida(s) };
  }

  scalaValida(s: number): number { return Math.min(SCALA_MAX, Math.max(this.scalaMin, s)); }

  /** Trascinamento: sposta la vista di (dx, dy) px CSS (la carta segue il dito). */
  trascina(dx: number, dy: number): void {
    this.volo = null; this.inerzia = null;
    this.x -= dx / this.scala; this.y -= dy / this.scala;
    this.limita();
  }

  /** Dito alzato in corsa: la vista scivola ancora e rallenta da sola. */
  lancia(vx: number, vy: number): void {
    const v = Math.hypot(vx, vy);
    if (v < INERZIA_FERMA * 5) { this.inerzia = null; return; }
    const k = Math.min(1, INERZIA_MAX / v);
    this.inerzia = { vx: vx * k, vy: vy * k };
  }

  /** Zoom tenendo fermo il punto dello schermo (sx, sy): pinch e rotella. */
  zoomA(scala: number, sx: number, sy: number): void {
    this.volo = null; this.inerzia = null;
    const prima = this.mondoDaSchermo(sx, sy);
    this.scala = this.scalaValida(scala);
    const dopo = this.mondoDaSchermo(sx, sy);
    this.x += prima.x - dopo.x; this.y += prima.y - dopo.y;
    this.limita();
  }

  /** Volo morbido verso centro e scala (animazioni della Campagna). durata 0 = salto. */
  vola(x: number, y: number, scala: number, durata: number): void {
    this.inerzia = null;
    const a = { x, y, s: this.scalaValida(scala) };
    if (durata <= 0) { this.x = a.x; this.y = a.y; this.scala = a.s; this.volo = null; this.limita(); return; }
    this.volo = { da: { x: this.x, y: this.y, s: this.scala }, a, ms: 0, durata };
  }

  ferma(): void { this.volo = null; this.inerzia = null; }

  get inVolo(): boolean { return this.volo !== null; }

  aggiorna(deltaMS: number): void {
    if (this.volo) {
      const v = this.volo;
      v.ms += deltaMS;
      const t = morbido(Math.min(1, v.ms / v.durata));
      // la scala si muove in modo logaritmico: allargare e stringere hanno lo stesso passo
      this.scala = v.da.s * (v.a.s / v.da.s) ** t;
      this.x = v.da.x + (v.a.x - v.da.x) * t;
      this.y = v.da.y + (v.a.y - v.da.y) * t;
      if (v.ms >= v.durata) this.volo = null;
      this.limita();
    } else if (this.inerzia) {
      const { vx, vy } = this.inerzia;
      this.x -= (vx * deltaMS) / this.scala; this.y -= (vy * deltaMS) / this.scala;
      const k = Math.exp(-deltaMS / INERZIA_TAU_MS);
      this.inerzia = { vx: vx * k, vy: vy * k };
      if (Math.hypot(vx, vy) < INERZIA_FERMA) this.inerzia = null;
      this.limita();
    }
  }

  /** Scala nei limiti; il centro tiene la vista sopra la carta (se la vista è più larga, sta in mezzo). */
  limita(): void {
    this.scala = this.scalaValida(this.scala);
    const m = MARGINE_TAVOLO;
    const mezzaW = this.w / 2 / this.scala, mezzaH = this.h / 2 / this.scala;
    const asse = (c: number, mezza: number, lato: number) => {
      const lo = -m + mezza, hi = lato + m - mezza;
      return lo > hi ? lato / 2 : Math.min(hi, Math.max(lo, c));
    };
    this.x = asse(this.x, mezzaW, this.mondoW);
    this.y = asse(this.y, mezzaH, this.mondoH);
  }
}
