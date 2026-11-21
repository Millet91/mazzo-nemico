// Terreno: lettura della maschera, capsula del pirata e crateri.
// Fuori dalla mappa (sopra, ai lati, sotto) c'è aria: i proiettili possono uscire in alto e rientrare (caso 3).

import type { EventoBattaglia, Terreno } from '../../core/tipi';
import { MATERIALE } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';

/** Il pixel (intero) è solido? */
export function solido(t: Terreno, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= t.w || y >= t.h) return false;
  return t.maschera[y * t.w + x] !== MATERIALE.aria;
}

/** Materiale del pixel (aria fuori dalla mappa). */
export function materiale(t: Terreno, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= t.w || y >= t.h) return MATERIALE.aria;
  return t.maschera[y * t.w + x];
}

// ─── Capsula 12×22 ───────────────────────────────────────────────────────────────────────────────
// Segmento verticale da (0, −5) a (0, +5) con raggio 6: largo 12, alto 22. Il centro del pirata è (x, y).

const MEZZA_L = BIL.pirata.capsulaLarghezza / 2; // 6
const MEZZA_A = BIL.pirata.capsulaAltezza / 2; // 11
const SEG = MEZZA_A - MEZZA_L; // 5

/** Distanza² di un punto dal segmento centrale della capsula di un pirata in (cx, cy). */
export function distanza2Capsula(cx: number, cy: number, px: number, py: number): number {
  const dy = py - cy;
  const sy = dy < -SEG ? -SEG : dy > SEG ? SEG : dy;
  const ex = px - cx, ey = dy - sy;
  return ex * ex + ey * ey;
}

/** Il punto è dentro la capsula? */
export function dentroCapsula(cx: number, cy: number, px: number, py: number): boolean {
  return distanza2Capsula(cx, cy, px, py) <= MEZZA_L * MEZZA_L;
}

/** Offset dei pixel occupati dalla capsula, relativi a (floor(x), floor(y)). Prima il bordo, poi l'interno. */
const CAPSULA: Int16Array = (() => {
  const bordo: number[] = [], dentro: number[] = [];
  const pieno = (dx: number, dy: number) =>
    dx >= -MEZZA_L && dx < MEZZA_L && dy >= -MEZZA_A && dy < MEZZA_A && distanza2Capsula(0, 0, dx + 0.5, dy + 0.5) <= MEZZA_L * MEZZA_L;
  for (let dy = -MEZZA_A; dy < MEZZA_A; dy++) for (let dx = -MEZZA_L; dx < MEZZA_L; dx++) {
    if (!pieno(dx, dy)) continue;
    const alBordo = !pieno(dx - 1, dy) || !pieno(dx + 1, dy) || !pieno(dx, dy - 1) || !pieno(dx, dy + 1);
    (alBordo ? bordo : dentro).push(dx, dy);
  }
  return Int16Array.from([...bordo, ...dentro]);
})();

/** La capsula con centro (x, y) tocca il solido? */
export function capsulaUrta(t: Terreno, x: number, y: number): boolean {
  const cx = Math.floor(x), cy = Math.floor(y);
  // fuori dalla mappa in alto o ai lati non c'è niente da toccare
  if (cy + MEZZA_A < 0 || cx + MEZZA_L < 0 || cx - MEZZA_L >= t.w || cy - MEZZA_A >= t.h) return false;
  const { w, h, maschera } = t;
  for (let i = 0; i < CAPSULA.length; i += 2) {
    const px = cx + CAPSULA[i], py = cy + CAPSULA[i + 1];
    if (px < 0 || py < 0 || px >= w || py >= h) continue;
    if (maschera[py * w + px] !== 0) return true;
  }
  return false;
}

/** Materiale sotto i piedi (il pixel solido più vicino sotto il centro della capsula), o aria. */
export function materialeSottoPiedi(t: Terreno, x: number, y: number): number {
  const cx = Math.floor(x), py = Math.floor(y) + MEZZA_A;
  for (let dx = 0; dx < MEZZA_L; dx++) {
    for (const sx of dx === 0 ? [0] : [-dx, dx]) {
      const m = materiale(t, cx + sx, py);
      if (m !== MATERIALE.aria) return m;
    }
  }
  return MATERIALE.aria;
}

export const MEZZA_ALTEZZA_PIRATA = MEZZA_A;
export const MEZZA_LARGHEZZA_PIRATA = MEZZA_L;

// ─── Crateri ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Scava un cratere di raggio `r` centrato in (x, y): ogni pixel sparisce se dista meno di r × moltiplicatore del
 * SUO materiale (sabbia 1,2, roccia 0,75, ferro 0 = intatto). Aggiunge l'evento `cratere` se la maschera cambia.
 * Restituisce quanti pixel sono stati tolti.
 */
export function scavaCratere(t: Terreno, x: number, y: number, r: number, eventi: EventoBattaglia[] | null): number {
  if (r <= 0) return 0;
  const molt = BIL.fisica.moltiplicatoreCratere;
  let mMax = 0;
  for (const m of molt) if (m > mMax) mMax = m;
  const rMax = r * mMax;
  const { w, h, maschera } = t;
  const x0 = Math.max(0, Math.floor(x - rMax)), x1 = Math.min(w - 1, Math.ceil(x + rMax));
  const y0 = Math.max(0, Math.floor(y - rMax)), y1 = Math.min(h - 1, Math.ceil(y + rMax));
  let tolti = 0;
  for (let py = y0; py <= y1; py++) {
    const dy = py + 0.5 - y;
    const riga = py * w;
    for (let px = x0; px <= x1; px++) {
      const m = maschera[riga + px];
      if (m === 0) continue;
      const rm = r * molt[m];
      if (rm <= 0) continue;
      const dx = px + 0.5 - x;
      if (dx * dx + dy * dy <= rm * rm) { maschera[riga + px] = 0; tolti++; }
    }
  }
  if (tolti > 0 && eventi) eventi.push({ t: 'cratere', x, y, raggio: Math.ceil(rMax) });
  return tolti;
}
