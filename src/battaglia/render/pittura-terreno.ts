// Pittura del terreno dalla maschera (03 §2, 11 §5): parte PURA, scrive pixel RGBA in un buffer.
// - ogni materiale ha il suo colore di PALETTE con una leggera grana (deterministica, niente casualità a ogni frame);
// - bordo d'erba sulla superficie originale di sabbia e terra;
// - bordo bruciato di 3 px dove un cratere ha scavato (aria adesso, solido all'inizio).
import { MATERIALE } from '../../core/tipi';
import { PALETTE, hex } from '../../core/palette';
import { BIL } from '../../contenuti/bilanciamento';

export const LATO_TILE = BIL.mondo.tile;
const BRUCIATO = BIL.fisica.bordoBruciato;
/** spessore del bordo d'erba */
const ERBA = 5;

function rgb(c: string): [number, number, number] {
  const n = hex(c);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Colori per valore della maschera (indice = MATERIALE). */
export const COLORI_MATERIALE: readonly [number, number, number][] = [
  [0, 0, 0],                 // aria (trasparente)
  rgb(PALETTE.sabbia),
  rgb(PALETTE.terra),
  rgb(PALETTE.legno),
  rgb(PALETTE.roccia),
  rgb('#BEE9F5'),            // ghiaccio
  rgb('#4B5563'),            // ferro
];
const ERBA_RGB = rgb(PALETTE.erba);
const ERBA_LUCE_RGB = rgb(PALETTE.erbaLuce);
const BRUCIATO_RGB = rgb(PALETTE.bordoBruciato);
const PROFONDA_RGB = rgb(PALETTE.terraProfonda);

/** grana del pixel: −6..+6 su ogni canale, sempre uguale per lo stesso punto */
function grana(x: number, y: number): number {
  let h = Math.imul(x, 73856093) ^ Math.imul(y >> 1, 19349663) ^ Math.imul(x >> 3, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h >>> 24) % 13) - 6;
}

/** buffer riusati per la maschera "vicino a uno scavo" (niente allocazioni a ogni cratere) */
let vicinoScavo = new Uint8Array(0);
let scavatoRiga = new Uint8Array(0);

/**
 * Segna in `vicinoScavo` (rw × rh, angolo in x0, y0) i pixel che hanno entro BRUCIATO px, in croce, un pixel
 * scavato (aria adesso, solido nella maschera iniziale). Due passate con finestre scorrevoli: costo O(area).
 * Restituisce false se nel rettangolo non c'è nessuno scavo (caso comune: pittura iniziale).
 */
function segnaScavi(m: Uint8Array, o: Uint8Array, w: number, h: number, x0: number, y0: number, rw: number, rh: number): boolean {
  const n = rw * rh;
  if (vicinoScavo.length < n) vicinoScavo = new Uint8Array(n);
  vicinoScavo.fill(0, 0, n);
  const B = BRUCIATO;
  // colonne/righe allargate di B per vedere gli scavi appena fuori dal rettangolo
  const ex0 = Math.max(0, x0 - B), ex1 = Math.min(w, x0 + rw + B);
  const ey0 = Math.max(0, y0 - B), ey1 = Math.min(h, y0 + rh + B);
  const ew = ex1 - ex0, eh = ey1 - ey0;
  if (scavatoRiga.length < ew * eh) scavatoRiga = new Uint8Array(ew * eh);
  let qualcuno = false;
  for (let y = ey0; y < ey1; y++) {
    const r = y * w, k = (y - ey0) * ew;
    for (let x = ex0; x < ex1; x++) {
      const i = r + x;
      const v = m[i] === MATERIALE.aria && o[i] !== MATERIALE.aria ? 1 : 0;
      scavatoRiga[k + x - ex0] = v;
      if (v) qualcuno = true;
    }
  }
  if (!qualcuno) return false;
  // passata orizzontale: conta gli scavi nella finestra [x−B, x+B]
  for (let y = y0; y < y0 + rh; y++) {
    const k = (y - ey0) * ew;
    let c = 0;
    for (let xx = ex0; xx < Math.min(ex1, x0 + B); xx++) c += scavatoRiga[k + xx - ex0];
    for (let x = x0; x < x0 + rw; x++) {
      const dentro = x + B, fuori = x - B - 1;
      if (dentro < ex1) c += scavatoRiga[k + dentro - ex0];
      if (fuori >= ex0) c -= scavatoRiga[k + fuori - ex0];
      if (c > 0) vicinoScavo[(y - y0) * rw + (x - x0)] = 1;
    }
  }
  // passata verticale
  for (let x = x0; x < x0 + rw; x++) {
    const cx = x - ex0;
    let c = 0;
    for (let yy = ey0; yy < Math.min(ey1, y0 + B); yy++) c += scavatoRiga[(yy - ey0) * ew + cx];
    for (let y = y0; y < y0 + rh; y++) {
      const dentro = y + B, fuori = y - B - 1;
      if (dentro < ey1) c += scavatoRiga[(dentro - ey0) * ew + cx];
      if (fuori >= ey0) c -= scavatoRiga[(fuori - ey0) * ew + cx];
      if (c > 0) vicinoScavo[(y - y0) * rw + (x - x0)] = 1;
    }
  }
  return true;
}

/**
 * Dipinge il rettangolo [x0, x1) × [y0, y1) (coordinate di mondo, dentro la tile) nel buffer RGBA della tile
 * che ha l'angolo in (tx, ty). `originale` è la maschera all'inizio della battaglia.
 */
export function dipingiRettangolo(
  maschera: Uint8Array, originale: Uint8Array, w: number, h: number,
  buf: Uint8ClampedArray, tx: number, ty: number,
  x0: number, y0: number, x1: number, y1: number,
): void {
  x0 = Math.max(x0, tx, 0); y0 = Math.max(y0, ty, 0);
  x1 = Math.min(x1, tx + LATO_TILE, w); y1 = Math.min(y1, ty + LATO_TILE, h);
  if (x1 <= x0 || y1 <= y0) return;
  const rw = x1 - x0;
  const scavi = segnaScavi(maschera, originale, w, h, x0, y0, rw, y1 - y0);
  for (let y = y0; y < y1; y++) {
    let k = ((y - ty) * LATO_TILE + (x0 - tx)) * 4;
    const riga = y * w;
    const rigaScavi = (y - y0) * rw - x0;
    for (let x = x0; x < x1; x++, k += 4) {
      const i = riga + x;
      const mat = maschera[i];
      if (mat === MATERIALE.aria) { buf[k + 3] = 0; continue; }
      let c = COLORI_MATERIALE[mat];
      let r = c[0], g = c[1], b = c[2];
      if (mat === MATERIALE.terra) {
        // la terra scurisce in profondità verso terraProfonda
        const t = Math.min(1, Math.max(0, (y - 420) / 500));
        r += (PROFONDA_RGB[0] - r) * t; g += (PROFONDA_RGB[1] - g) * t; b += (PROFONDA_RGB[2] - b) * t;
      }
      if (scavi && mat !== MATERIALE.ferro && vicinoScavo[rigaScavi + x]) {
        c = BRUCIATO_RGB; r = c[0]; g = c[1]; b = c[2];
      } else if (mat === MATERIALE.sabbia || mat === MATERIALE.terra) {
        // erba: la superficie ORIGINALE è entro ERBA px sopra
        for (let d = 1; d <= ERBA; d++) {
          if (y - d < 0) break;
          const j = i - d * w;
          if (originale[j] === MATERIALE.aria) {
            if (maschera[j] !== MATERIALE.aria) break;
            c = d <= 2 ? ERBA_LUCE_RGB : ERBA_RGB; r = c[0]; g = c[1]; b = c[2];
            break;
          }
        }
      }
      const n = grana(x, y);
      buf[k] = r + n; buf[k + 1] = g + n; buf[k + 2] = b + n; buf[k + 3] = 255;
    }
  }
}

/** Rettangolo da ridipingere dopo un cratere: raggio + bordo bruciato + erba. */
export function rettangoloCratere(x: number, y: number, raggio: number): [number, number, number, number] {
  const m = raggio + BRUCIATO + ERBA + 2;
  return [Math.floor(x - m), Math.floor(y - m), Math.ceil(x + m), Math.ceil(y + m)];
}

/** Indici delle tile toccate da un rettangolo, in una griglia colonne × righe di lato LATO_TILE. */
export function tileToccate(x0: number, y0: number, x1: number, y1: number, colonne: number, righe: number): number[] {
  const c0 = Math.max(0, Math.floor(x0 / LATO_TILE)), c1 = Math.min(colonne - 1, Math.floor((x1 - 1) / LATO_TILE));
  const r0 = Math.max(0, Math.floor(y0 / LATO_TILE)), r1 = Math.min(righe - 1, Math.floor((y1 - 1) / LATO_TILE));
  const out: number[] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push(r * colonne + c);
  return out;
}
