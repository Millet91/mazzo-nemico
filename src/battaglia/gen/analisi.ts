// Strumenti di analisi della maschera per spawn e validazione: superficie, voli balistici semplificati,
// linea di tiro, camminata. Sono APPROSSIMAZIONI pure della fisica di A (un punto, senza rimbalzi): servono
// a scartare le mappe ingiuste, non a prevedere la battaglia. Codice puro e deterministico.

import { MATERIALE, type Punto } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { MONDO } from './parametri';

const { w: W, h: H } = MONDO;
const ARIA = MATERIALE.aria;

export function solido(m: Uint8Array, x: number, y: number): boolean {
  if (x < 0 || x >= W || y >= H) return true;
  if (y < 0) return false;
  return m[y * W + x] !== ARIA;
}

/** y del primo pixel solido di ogni colonna, dall'alto (= quota dei piedi di chi ci sta sopra). */
export function superficie(m: Uint8Array): Int32Array {
  const out = new Int32Array(W);
  for (let x = 0; x < W; x++) {
    let y = 0;
    while (y < H && m[y * W + x] === ARIA) y++;
    out[x] = y;
  }
  return out;
}

export type FineVolo = { tipo: 'terra' | 'mare' | 'fuori' | 'tempo'; x: number; y: number; tick: number };

/**
 * Volo di un punto da (x, y) con velocità in px/tick e gravità di BIL, a passi di al massimo `passo` px.
 * Finisce sul primo pixel solido, nel mare (y ≥ mare) o fuori dai bordi laterali.
 * `ogniPasso` può fermare il volo restituendo true (colpo diretto).
 */
export function vola(
  m: Uint8Array, mare: number, x: number, y: number, vx: number, vy: number,
  ogniPasso?: (x: number, y: number) => boolean, maxTick = 600, passo = 2,
): FineVolo {
  const g = BIL.fisica.gravita;
  for (let t = 1; t <= maxTick; t++) {
    vy += g;
    const passi = Math.max(1, Math.ceil(Math.max(Math.abs(vx), Math.abs(vy)) / passo));
    const px = vx / passi, py = vy / passi;
    for (let i = 0; i < passi; i++) {
      x += px; y += py;
      const xi = Math.round(x), yi = Math.round(y);
      if (xi < 0 || xi >= W) return { tipo: 'fuori', x, y, tick: t };
      if (yi >= mare) return { tipo: 'mare', x, y, tick: t }; // anche su un fondo sommerso si annega
      if (ogniPasso && ogniPasso(x, y)) return { tipo: 'terra', x, y, tick: t };
      if (yi >= 0 && m[yi * W + xi] !== ARIA) return { tipo: 'terra', x, y, tick: t };
    }
  }
  return { tipo: 'tempo', x, y, tick: maxTick };
}

/** Linea di tiro diretta libera tra due punti (petto a petto), campionata ogni 2 px. */
export function lineaLibera(m: Uint8Array, a: Punto, b: Punto): boolean {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l = Math.sqrt(dx * dx + dy * dy);
  const n = Math.ceil(l / 2);
  for (let i = 4; i < n - 4; i++) {
    const t = i / n;
    if (solido(m, Math.round(a.x + dx * t), Math.round(a.y + dy * t))) return false;
  }
  return true;
}

/** Altezza del salto in avanti (px), dalla fisica di BIL. */
export function altezzaSalto(): number {
  const vy = BIL.pirata.saltoAvanti.vy;
  return (vy * vy) / (2 * BIL.fisica.gravita);
}

/**
 * Colonne raggiungibili a piedi (con gradino e salto) entro `percorso` px partendo da x0, lungo la superficie.
 * Restituisce l'intervallo [da, a] di colonne raggiunte.
 */
export function camminata(sup: Int32Array, mare: number, x0: number, percorso: number): [number, number] {
  const gradino = BIL.pirata.gradinoMax;
  const salto = altezzaSalto();
  const lato = (dir: -1 | 1): number => {
    let x = x0, fatto = 0;
    while (true) {
      const c = x + dir;
      if (c < 0 || c >= W || sup[c] >= mare) return x;
      const sale = sup[x] - sup[c];
      if (sale > gradino) {
        // parete: si passa solo se entro 12 colonne non sale più dell'altezza del salto
        let cima = sup[c];
        for (let k = 1; k <= 12; k++) { const cc = c + dir * k; if (cc >= 0 && cc < W) cima = Math.min(cima, sup[cc]); }
        if (sup[x] - cima > salto) return x;
      }
      const dy = sup[c] - sup[x];
      fatto += Math.sqrt(1 + dy * dy);
      if (fatto > percorso) return x;
      x = c;
    }
  };
  return [lato(-1), lato(1)];
}
