// Freccia sul bordo dello schermo verso un punto fuori vista (il mirino d'impatto). Parte pura, testata in Node.

export interface Margini { sx: number; dx: number; su: number; giu: number }
/** margini dai bordi: sopra c'è la barra dell'HUD */
export const MARGINI_BORDO: Margini = { sx: 28, dx: 28, su: 72, giu: 28 };
/** il mirino conta come visibile da qui in giù: `su` meno questi px (la barra finisce poco sopra il margine) */
const SOTTO_BARRA = 16;

/**
 * Se (x, y) è fuori dallo schermo w×h, il punto del bordo (dentro i margini) sulla retta dal centro dello
 * schermo verso (x, y) e l'angolo (radianti, 0 = destra, y in basso). null se il punto si vede.
 */
export function frecciaBordo(x: number, y: number, w: number, h: number, m: Margini = MARGINI_BORDO):
  { x: number; y: number; angolo: number } | null {
  // si vede (anche solo in parte, il mirino è largo ~32 px): niente freccia. Sotto la barra dell'HUD in alto
  // non si vede: lì vale come fuori schermo (Lead design, PR #59)
  if (x >= -8 && x <= w + 8 && y >= m.su - SOTTO_BARRA && y <= h + 8) return null;
  const x0 = m.sx, x1 = w - m.dx, y0 = m.su, y1 = h - m.giu;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const dx = x - cx, dy = y - cy;
  let k = 1;
  if (dx > 0) k = Math.min(k, (x1 - cx) / dx);
  if (dx < 0) k = Math.min(k, (x0 - cx) / dx);
  if (dy > 0) k = Math.min(k, (y1 - cy) / dy);
  if (dy < 0) k = Math.min(k, (y0 - cy) / dy);
  return { x: cx + dx * k, y: cy + dy * k, angolo: Math.atan2(dy, dx) };
}
