// Movimento dei proiettili a passi di al massimo 1 px per asse, con connettività a 8 (casi 1-2): un proiettile
// non attraversa una parete di 1 px né passa tra due pixel che si toccano per l'angolo. Fuori dalla mappa c'è
// aria: può uscire in alto e rientrare (caso 3). Le funzioni non mutano il terreno: le usano anche
// simulaColpo e traiettoria.

import type { Terreno } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { dentroCapsula, materiale, solido } from './terreno';

export interface CorpoProiettile { x: number; y: number; vx: number; vy: number; fermo: boolean }

export interface FisicaProiettile {
  /** risente del vento */
  vento: boolean;
  /** coefficiente di rimbalzo; null = si ferma (esplode) al primo urto */
  rimbalzo: number | null;
  /** urta i pirati (il cannone sì, la granata e la lapide no) */
  colpiscePirati: boolean;
}

export interface Bersaglio { id: number; x: number; y: number }

export type Urto =
  | { tipo: 'terreno'; x: number; y: number }
  | { tipo: 'pirata'; x: number; y: number; pirata: number }
  | { tipo: 'mare'; x: number; y: number }
  | { tipo: 'rimbalzo'; x: number; y: number };

const G = BIL.fisica.gravita;
/** sotto questa velocità (px/tick) un oggetto che rimbalza si posa */
const POSA = 2 * G;
/** i rimbalzi più lenti di così non generano l'evento (niente raffiche di eventi da oggetti che tremano) */
const RIMBALZO_VISIBILE = 1;

/**
 * Un tick di volo. Restituisce l'urto (terreno, pirata, mare, rimbalzo visibile) o null.
 * Con `rimbalzo` il proiettile rimbalza e si posa (fermo) invece di fermarsi al primo urto.
 */
export function muoviProiettile(
  t: Terreno, mare: number, vento: number, pr: CorpoProiettile, f: FisicaProiettile, bersagli: readonly Bersaglio[] | null,
): Urto | null {
  if (pr.fermo) {
    // posato: ricade se il terreno sotto sparisce
    if (solido(t, Math.floor(pr.x), Math.floor(pr.y) + 1)) return null;
    pr.fermo = false;
  }
  pr.vy += G;
  if (f.vento) pr.vx += vento * BIL.fisica.ventoPerPunto;
  const passi = Math.max(1, Math.ceil(Math.max(Math.abs(pr.vx), Math.abs(pr.vy))));
  const dx = pr.vx / passi, dy = pr.vy / passi;
  for (let i = 0; i < passi; i++) {
    const nx = pr.x + dx, ny = pr.y + dy;
    const ix0 = Math.floor(pr.x), iy0 = Math.floor(pr.y), ix1 = Math.floor(nx), iy1 = Math.floor(ny);
    let colpo = solido(t, ix1, iy1);
    let sx = false, sy = false;
    if (ix1 !== ix0 && iy1 !== iy0) {
      // passo in diagonale: i due pixel d'angolo chiudono il passaggio (connettività a 8)
      sx = solido(t, ix1, iy0); sy = solido(t, ix0, iy1);
      colpo = colpo || sx || sy;
    } else if (colpo) {
      sx = ix1 !== ix0; sy = iy1 !== iy0;
    }
    if (colpo) {
      if (f.rimbalzo === null) return { tipo: 'terreno', x: pr.x, y: pr.y };
      if (!sx && !sy) { sx = true; sy = true; } // solo l'angolo: torna indietro
      const vPrima = Math.sqrt(pr.vx * pr.vx + pr.vy * pr.vy);
      const m = sy ? materiale(t, ix0, iy1) : materiale(t, ix1, iy0);
      const attrito = BIL.fisica.attrito[m] ?? 1;
      if (sx) { pr.vx = -pr.vx * f.rimbalzo; if (!sy) pr.vy *= 1 - attrito * (1 - f.rimbalzo); }
      if (sy) { pr.vy = -pr.vy * f.rimbalzo; if (!sx) pr.vx *= 1 - attrito * (1 - f.rimbalzo); }
      if (sy && dy > 0 && pr.vx * pr.vx + pr.vy * pr.vy < POSA * POSA) { pr.vx = 0; pr.vy = 0; pr.fermo = true; }
      return vPrima >= RIMBALZO_VISIBILE ? { tipo: 'rimbalzo', x: pr.x, y: pr.y } : null;
    }
    pr.x = nx; pr.y = ny;
    if (bersagli && f.colpiscePirati) {
      for (const b of bersagli) if (dentroCapsula(b.x, b.y, pr.x, pr.y)) return { tipo: 'pirata', x: pr.x, y: pr.y, pirata: b.id };
    }
    if (pr.y >= mare) return { tipo: 'mare', x: pr.x, y: mare };
  }
  return null;
}

/**
 * Segue una semiretta da (x, y) in direzione (dx, dy) unitaria per al massimo `lunghezza` px, a passi di 1 px con
 * connettività a 8. Si ferma sul terreno o su un bersaglio (escluso `ignora`). Non muta niente.
 */
export function raggio(
  t: Terreno, x: number, y: number, dx: number, dy: number, lunghezza: number, bersagli: readonly Bersaglio[], ignora: number,
): { x: number; y: number; terreno: boolean; pirata: number } {
  let px = x, py = y;
  for (let i = 0; i < lunghezza; i++) {
    const nx = px + dx, ny = py + dy;
    const ix0 = Math.floor(px), iy0 = Math.floor(py), ix1 = Math.floor(nx), iy1 = Math.floor(ny);
    let colpo = solido(t, ix1, iy1);
    if (!colpo && ix1 !== ix0 && iy1 !== iy0) colpo = solido(t, ix1, iy0) || solido(t, ix0, iy1);
    if (colpo) return { x: px, y: py, terreno: true, pirata: -1 };
    px = nx; py = ny;
    for (const b of bersagli) if (b.id !== ignora && dentroCapsula(b.x, b.y, px, py)) return { x: px, y: py, terreno: false, pirata: b.id };
  }
  return { x: px, y: py, terreno: false, pirata: -1 };
}
