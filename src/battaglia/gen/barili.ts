// Barili di polvere già piazzati (m1-ritmo §9, 06 §7.4): 3-4 sull'Isola, in piano, sopra il mare, ad almeno
// BIL.barili.distanzaMinimaSpawn da ogni spawn. Il punto è il centro della base, appoggiato al suolo.
// Codice puro e deterministico.

import { MATERIALE, type Punto } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { intero, type ConRng } from '../../core/rng';
import { MONDO } from './parametri';

const { w: W } = MONDO;
/** mezza larghezza della base del barile (px) e dislivello massimo sotto la base */
export const BARILE_MEZZO = 10;
export const BARILE_DISLIVELLO = 6;
/** il barile resta almeno così sopra il mare, e lontano dagli altri barili */
export const BARILE_SOPRA_MARE = 60;
export const BARILE_DISTANZA_BARILI = 90;
/** dove il suolo non è piano si scava o si riempie un gradino largo quanto il barile, se basta muovere ≤ 20 px */
export const BARILE_SPIANA_MAX = 20;
const SPIANATA = BARILE_MEZZO + 2;

function distanza(a: Punto, b: Punto): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Il posto (x, piedi) va bene per un barile? Restituisce la y della base o −1. */
export function postoBarile(sup: Int32Array, mare: number, x: number): number {
  if (x - BARILE_MEZZO < MONDO.bordo || x + BARILE_MEZZO >= W - MONDO.bordo) return -1;
  let lo = sup[x], hi = sup[x];
  for (let c = x - BARILE_MEZZO; c <= x + BARILE_MEZZO; c++) { lo = Math.min(lo, sup[c]); hi = Math.max(hi, sup[c]); }
  if (hi - lo > BARILE_DISLIVELLO) return -1;
  if (lo > mare - BARILE_SOPRA_MARE) return -1;
  return lo;
}

/** Spiana la base di un barile in x alla quota sup[x] (scava sopra, riempie di sabbia sotto): modifica `m` e `sup`. */
export function spianaBarile(m: Uint8Array, sup: Int32Array, x: number): Punto {
  const y = sup[x];
  for (let c = x - SPIANATA; c <= x + SPIANATA; c++) {
    for (let yy = sup[c]; yy < y; yy++) m[yy * W + c] = MATERIALE.aria;
    for (let yy = y; yy < sup[c]; yy++) m[yy * W + c] = MATERIALE.sabbia;
    // base piena per 8 px anche sopra una grotta o un incavo
    for (let yy = y; yy < y + 8; yy++) if (m[yy * W + c] === MATERIALE.aria) m[yy * W + c] = MATERIALE.sabbia;
    sup[c] = y;
  }
  return { x, y };
}

/**
 * Piazza i barili. Dove il suolo non è piano ma quasi, spiana un gradino sotto il barile (scava sopra la quota
 * della base, riempie di sabbia sotto): modifica `m` e `sup`. Niente barili entro `lontano` px dalle x in `vieta`. Restituisce i barili in ordine di x.
 */
export function piazzaBarili(s: ConRng, m: Uint8Array, sup: Int32Array, mare: number, spawn: Punto[], vieta: number[] = [], lontano = 0): Punto[] {
  const B = BIL.barili;
  const quanti = intero(s, B.min, B.max);
  const out: Punto[] = [];
  for (let prove = 0; prove < 150 && out.length < quanti; prove++) {
    const x = intero(s, MONDO.bordo + SPIANATA, W - 1 - MONDO.bordo - SPIANATA);
    const y = sup[x];
    if (y > mare - BARILE_SOPRA_MARE) continue;
    const p = { x, y };
    if (spawn.some((q) => distanza(p, q) < B.distanzaMinimaSpawn)) continue;
    if (out.some((q) => distanza(p, q) < BARILE_DISTANZA_BARILI)) continue;
    if (vieta.some((v) => Math.abs(v - x) < lontano)) continue;
    let ok = true;
    for (let c = x - SPIANATA; c <= x + SPIANATA && ok; c++) if (Math.abs(sup[c] - y) > BARILE_SPIANA_MAX) ok = false;
    if (!ok) continue;
    spianaBarile(m, sup, x);
    out.push(p);
  }
  return out.sort((a, b) => a.x - b.x);
}
