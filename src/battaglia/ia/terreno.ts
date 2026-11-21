// Letture del terreno per l'IA: dove sta il suolo, se camminare in una direzione è sicuro, dove c'è riparo.
// Solo letture della maschera (mai scritture), codice puro e deterministico.

import type { Pirata, StatoBattaglia } from '../../core/tipi';
import { MATERIALE } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';

/** Il pixel (x, y) è solido? Fuori dalla mappa: aria (ai lati e sopra si cade in mare). */
export function solido(s: StatoBattaglia, x: number, y: number): boolean {
  const { w, h, maschera } = s.terreno;
  const xi = Math.floor(x), yi = Math.floor(y);
  if (xi < 0 || xi >= w || yi < 0) return false;
  if (yi >= h) return true;
  return maschera[yi * w + xi] !== MATERIALE.aria;
}

/** Primo y solido nella colonna x, cercando verso il basso a partire da `daY`. `null` se sotto c'è solo mare. */
export function suoloSotto(s: StatoBattaglia, x: number, daY: number): number | null {
  const limite = Math.min(s.terreno.mare, s.terreno.h);
  for (let y = Math.max(0, Math.floor(daY)); y < limite; y++) if (solido(s, x, y)) return y;
  return null;
}

/** Quota dei piedi del pirata (centro della capsula + metà altezza). */
export function piedi(p: Pirata): number {
  return p.y + BIL.pirata.capsulaAltezza / 2;
}

/**
 * Quanti px si possono camminare in direzione `dir` (al massimo `max`) senza:
 * cadere più in basso della soglia del danno da caduta, finire sopra il mare, o sbattere contro un muro
 * più alto del gradino. Stima prudente: la fisica vera la fa la sim.
 */
export function passiSicuri(s: StatoBattaglia, p: Pirata, dir: -1 | 1, max: number): number {
  const gradino = BIL.pirata.gradinoMax;
  let y = piedi(p);
  let fatti = 0;
  for (let i = 1; i <= max; i++) {
    const x = p.x + dir * i;
    if (x < 0 || x >= s.terreno.w) break;
    // cerca il suolo a partire da un gradino sopra i piedi
    const suolo = suoloSotto(s, x, y - gradino - 1);
    if (suolo === null) break; // sotto c'è il mare
    if (suolo < y - gradino) break; // muro
    if (suolo - y > BIL.pirata.cadutaSoglia / 2) break; // dirupo: meglio non rischiare
    if (s.terreno.mare - suolo < 40) break; // troppo vicino all'acqua
    y = suolo;
    fatti = i;
  }
  return fatti;
}

/**
 * Riparo: c'è roccia o terra tra il pirata e il nemico? Conta i pixel solidi sulla linea che li unisce,
 * saltando i primi e gli ultimi 12 px (il suolo sotto i piedi).
 */
export function riparato(s: StatoBattaglia, da: { x: number; y: number }, a: { x: number; y: number }): boolean {
  const dx = a.x - da.x, dy = a.y - da.y;
  const lung = Math.sqrt(dx * dx + dy * dy);
  if (lung < 30) return false;
  const passi = Math.floor(lung / 4);
  let pieni = 0;
  for (let i = 0; i <= passi; i++) {
    const d = (i * lung) / passi;
    if (d < 12 || d > lung - 12) continue;
    if (solido(s, da.x + (dx * d) / lung, da.y + (dy * d) / lung)) pieni++;
  }
  return pieni >= 4; // almeno 16 px di terreno in mezzo
}
