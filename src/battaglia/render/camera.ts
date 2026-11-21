// Camera della battaglia: parte PURA (niente Pixi), testata in Node.
// 00 §1.2: altezza logica 540, larghezza logica 960-1215, zoom predefinito 1,4 (0,5-2,0).
// Coordinate: "schermo" = px CSS del canvas; "mondo" = px della maschera (2048×1024).
import { BIL } from '../../contenuti/bilanciamento';

const C = BIL.camera;
/** quanto cielo si può vedere sopra il bordo alto della maschera */
export const CIELO_EXTRA = 320;
/** curva del volo: parte subito e arriva piano (ease-out, m1-ritmo §3) */
const morbido = (t: number) => 1 - (1 - t) ** 3;
/** scossa del colpo (m1-ritmo §4): 250 ms, al massimo 10 px */
export const SCOSSA_MS = 250;
export const SCOSSA_MAX_PX = 10;
/** zoom delle uccisioni: +8% per 300 ms */
export const IMPULSO_ZOOM = 0.08;
export const IMPULSO_ZOOM_MS = 300;

export interface Volo { daX: number; daY: number; aX: number; aY: number; ms: number; durata: number }

export class Camera {
  /** centro della vista in px di mondo */
  x = BIL.mondo.larghezza / 2;
  y = BIL.mondo.altezza / 2;
  zoom: number = C.zoomPredefinito;
  /** misura del canvas in px CSS */
  w = 800;
  h = 360;
  private volo: Volo | null = null;
  /** scossa in corso: ampiezza in px CSS e ms passati */
  private scossa = { amp: 0, ms: SCOSSA_MS };
  private impulso = { ms: IMPULSO_ZOOM_MS };
  /** spostamento della scossa in px di mondo (solo grafico) */
  ox = 0;
  oy = 0;
  /** moltiplicatore dello zoom dato dall'impulso delle uccisioni (solo grafico) */
  zoomEffetto = 1;

  constructor(readonly mondoW: number = BIL.mondo.larghezza, readonly mondoH: number = BIL.mondo.altezza) {}

  /** px CSS per unità logica a zoom 1 (altezza 540, larghezza tenuta tra 960 e 1215). */
  get scalaBase(): number {
    let b = this.h / C.altezzaLogica;
    if (this.w / b > C.larghezzaMax) b = this.w / C.larghezzaMax;
    if (this.w / b < C.larghezzaMin) b = this.w / C.larghezzaMin;
    return b;
  }

  /** px CSS per px di mondo */
  get scala(): number { return this.scalaBase * this.zoom * this.zoomEffetto; }

  /** Scossa del colpo: ampiezza in px CSS (si tiene la più forte tra quella in corso e la nuova). */
  scuoti(ampiezzaPx: number): void {
    const resto = this.scossa.amp * (1 - Math.min(1, this.scossa.ms / SCOSSA_MS));
    this.scossa = { amp: Math.min(SCOSSA_MAX_PX, Math.max(resto, ampiezzaPx)), ms: 0 };
  }

  /** Zoom +8% per 300 ms (uccisioni). */
  impulsoZoom(): void { this.impulso.ms = 0; }

  impostaSchermo(w: number, h: number): void {
    this.w = Math.max(1, w); this.h = Math.max(1, h);
    this.limita();
  }

  schermoDaMondo(x: number, y: number): { x: number; y: number } {
    const k = this.scala;
    return { x: (x - this.x - this.ox) * k + this.w / 2, y: (y - this.y - this.oy) * k + this.h / 2 };
  }

  mondoDaSchermo(x: number, y: number): { x: number; y: number } {
    const k = this.scala;
    return { x: (x - this.w / 2) / k + this.x + this.ox, y: (y - this.h / 2) / k + this.y + this.oy };
  }

  /** Trascinamento: sposta la vista di (dx, dy) px CSS (il mondo segue il dito). */
  trascina(dx: number, dy: number): void {
    this.volo = null;
    const k = this.scala;
    this.x -= dx / k; this.y -= dy / k;
    this.limita();
  }

  /** Zoom tenendo fermo il punto dello schermo (px, py), es. il centro del pinch. */
  zoomA(nuovo: number, px = this.w / 2, py = this.h / 2): void {
    const prima = this.mondoDaSchermo(px, py);
    this.zoom = Math.min(C.zoomMax, Math.max(C.zoomMin, nuovo));
    const dopo = this.mondoDaSchermo(px, py);
    this.x += prima.x - dopo.x; this.y += prima.y - dopo.y;
    this.limita();
  }

  /** Vola sul punto in `durataMs` (0,6 s di inquadratura, 00 §1.4). */
  vola(x: number, y: number, durataMs: number = (C.inquadraTick * 1000) / 60): void {
    const a = this.limitato(x, y);
    if (durataMs <= 0) { this.x = a.x; this.y = a.y; this.volo = null; return; }
    this.volo = { daX: this.x, daY: this.y, aX: a.x, aY: a.y, ms: 0, durata: durataMs };
  }

  /** Segue un punto in movimento (proiettile, pirata che cammina) con un inseguimento morbido. */
  segui(x: number, y: number, deltaMS: number): void {
    if (this.volo) { this.volo.aX = x; this.volo.aY = y; return; }
    const k = 1 - Math.exp(-deltaMS / 120);
    this.x += (x - this.x) * k; this.y += (y - this.y) * k;
    this.limita();
  }

  get inVolo(): boolean { return this.volo !== null; }

  /** Scossa e impulso di zoom: solo grafici, non toccano il centro della camera. */
  aggiornaEffetti(deltaMS: number): void {
    const s = this.scossa;
    s.ms = Math.min(SCOSSA_MS, s.ms + deltaMS);
    const resto = s.amp * (1 - s.ms / SCOSSA_MS) ** 2;
    const k = this.scalaBase * this.zoom;
    this.ox = resto ? (Math.sin(s.ms * 0.11) * resto) / k : 0;
    this.oy = resto ? (Math.cos(s.ms * 0.083) * resto) / k : 0;
    this.impulso.ms = Math.min(IMPULSO_ZOOM_MS, this.impulso.ms + deltaMS);
    this.zoomEffetto = 1 + IMPULSO_ZOOM * Math.sin((Math.PI * this.impulso.ms) / IMPULSO_ZOOM_MS);
  }

  aggiorna(deltaMS: number): void {
    this.aggiornaEffetti(deltaMS);
    const v = this.volo;
    if (!v) return;
    v.ms += deltaMS;
    const t = Math.min(1, v.ms / v.durata);
    const a = this.limitato(v.aX, v.aY);
    this.x = v.daX + (a.x - v.daX) * morbido(t);
    this.y = v.daY + (a.y - v.daY) * morbido(t);
    if (t >= 1) this.volo = null;
  }

  /** Il centro più vicino a (x, y) che non mostra fuori dal mondo (cielo extra sopra, fondale sotto). */
  limitato(x: number, y: number): { x: number; y: number } {
    const k = this.scala;
    const mezzaW = this.w / 2 / k, mezzaH = this.h / 2 / k;
    const minX = mezzaW, maxX = this.mondoW - mezzaW;
    const minY = -CIELO_EXTRA + mezzaH, maxY = this.mondoH - mezzaH;
    return {
      x: minX > maxX ? this.mondoW / 2 : Math.min(maxX, Math.max(minX, x)),
      y: minY > maxY ? (this.mondoH - CIELO_EXTRA) / 2 : Math.min(maxY, Math.max(minY, y)),
    };
  }

  private limita(): void {
    const l = this.limitato(this.x, this.y);
    this.x = l.x; this.y = l.y;
  }
}
