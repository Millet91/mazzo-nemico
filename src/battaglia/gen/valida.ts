// Validatore di una MappaGenerata (06 §0, §4, §7 con il mare a BIL.mondo.mareIniziale). Lo usa il generatore
// a ogni tentativo e lo usano i test (e il QA) su qualsiasi mappa. Restituisce l'elenco dei problemi: vuoto = valida.

import { MATERIALE, type MappaGenerata } from '../../core/tipi';
import { superficie } from './analisi';
import { postoBarile } from './barili';
import { BIL } from '../../contenuti/bilanciamento';
import { ISOLA, MONDO, REGOLE } from './parametri';
import { controllaAppiglio, distanzaAppiglio } from './appigli';
import { controllaInsieme, controllaPosto, zona, type Posto } from './spawn';

const { w: W, h: H } = MONDO;
const ARIA = MATERIALE.aria, FERRO = MATERIALE.ferro;

export interface Riempimento {
  solido: number;
  ferro: number;
  frazione: number;
  frazioneFerro: number;
  /** solido della metà sinistra e della destra (equità della massa, 06 §4) */
  meta: [number, number];
}

/** Solido e ferro nella fascia tra fineCielo e il mare. */
export function riempimento(m: Uint8Array, mare: number): Riempimento {
  let ferro = 0, sx = 0, dx = 0;
  const meta = W / 2;
  for (let y: number = MONDO.cielo; y < mare; y++) {
    const r = y * W;
    for (let x = 0; x < meta; x++) { const v = m[r + x]; if (v !== ARIA) { sx++; if (v === FERRO) ferro++; } }
    for (let x = meta; x < W; x++) { const v = m[r + x]; if (v !== ARIA) { dx++; if (v === FERRO) ferro++; } }
  }
  const solido = sx + dx;
  return { solido, ferro, frazione: solido / (W * (mare - MONDO.cielo)), frazioneFerro: solido ? ferro / solido : 0, meta: [sx, dx] };
}

/** Controlli sul terreno soltanto (fasce, bordi, riempimento, ferro). */
export function validaTerreno(m: Uint8Array, mare: number): string[] {
  const err: string[] = [];
  if (m.length !== W * H) return [`maschera di ${m.length} byte invece di ${W * H}`];
  for (let y: number = 0; y < MONDO.cielo; y++) {
    const r = y * W;
    for (let x = 0; x < W; x++) if (m[r + x] !== ARIA) { err.push(`solido nel cielo libero (${x}, ${y})`); y = MONDO.cielo; break; }
  }
  for (let y: number = MONDO.fondale; y < H; y++) {
    const r = y * W;
    for (let x = 0; x < W; x++) if (m[r + x] !== FERRO) { err.push(`fondale non di ferro (${x}, ${y})`); y = H; break; }
  }
  bordi: for (let y = 0; y < MONDO.fondale; y++) {
    const r = y * W;
    for (let x = 0; x < MONDO.bordo; x++) {
      if (m[r + x] !== ARIA || m[r + W - 1 - x] !== ARIA) { err.push(`bordo non di acqua aperta (riga ${y})`); break bordi; }
    }
  }
  return err.concat(validaMassa(m, mare));
}

/** Riempimento, ferro, altezza della cima ed equità delle masse: gli unici controlli del terreno che il generatore
 *  non garantisce per costruzione (fasce e bordi li garantisce). */
export function validaMassa(m: Uint8Array, mare: number): string[] {
  const err: string[] = [];
  const r = riempimento(m, mare);
  if (r.frazione < REGOLE.solidoMin || r.frazione > REGOLE.solidoMax) err.push(`solido al ${(r.frazione * 100).toFixed(1)}% (${REGOLE.solidoMin * 100}-${REGOLE.solidoMax * 100}%)`);
  if (r.frazioneFerro > REGOLE.ferroMax) err.push(`ferro al ${(r.frazioneFerro * 100).toFixed(1)}% del solido (max 3%)`);
  // prima riga con terreno fuori dai bordi (riga per riga: veloce)
  const fondo = MONDO.fondale, da = MONDO.bordo, a = W - MONDO.bordo;
  let cima = -1;
  for (let y = 0; y < fondo && cima < 0; y++) {
    const r = y * W;
    for (let x = da; x < a; x++) if (m[r + x] !== ARIA) { cima = y; break; }
  }
  if (cima >= 0 && cima < ISOLA.cimaMinY) err.push(`cima a y ${cima}, sopra ${ISOLA.cimaMinY}`);
  const [sx, dx] = r.meta;
  if (Math.abs(sx - dx) > REGOLE.equitaMassa * Math.max(sx, dx)) err.push(`equità: massa delle due metà ${sx} / ${dx}`);
  return err;
}

/** Validazione completa: terreno, requisiti di ogni spawn, equità e anti-frustrazione. */
export function validaMappa(mappa: MappaGenerata): string[] {
  const t = mappa.terreno;
  if (t.w !== W || t.h !== H) return [`dimensioni ${t.w}×${t.h} invece di ${W}×${H}`];
  const err = validaTerreno(t.maschera, t.mare);
  const sup = superficie(t.maschera);
  // lato 0 a sinistra, salvo specchio
  const sinistra = mappa.specchiata ? 1 : 0;
  const posti: [Posto[], Posto[]] = [[], []];
  for (const lato of [0, 1] as const) {
    const aDestra = (lato === sinistra) === false;
    const [da, a] = zona(aDestra);
    for (const p of mappa.spawn[lato]) {
      if (p.x < da || p.x > a) err.push(`spawn del lato ${lato} fuori zona (${p.x}, ${p.y})`);
      const c = controllaPosto(t.maschera, sup, t.mare, p.x);
      if (typeof c === 'string') err.push(`spawn del lato ${lato} in (${p.x}, ${p.y}): ${c}`);
      else if (c.y !== p.y) err.push(`spawn del lato ${lato} in (${p.x}, ${p.y}): piedi non sul terreno (${c.y})`);
      else posti[aDestra ? 1 : 0].push(c);
    }
  }
  // barili (06 §7.4, m1-ritmo §9)
  const barili = mappa.barili ?? [];
  if (barili.length < BIL.barili.min || barili.length > BIL.barili.max) err.push(`${barili.length} barili invece di ${BIL.barili.min}-${BIL.barili.max}`);
  for (const b of barili) {
    if (postoBarile(sup, t.mare, b.x) !== b.y) err.push(`barile in (${b.x}, ${b.y}): non in piano sul suolo o troppo vicino al mare`);
    for (const p of [...mappa.spawn[0], ...mappa.spawn[1]]) {
      if (Math.sqrt((b.x - p.x) ** 2 + (b.y - p.y) ** 2) < BIL.barili.distanzaMinimaSpawn) err.push(`barile in (${b.x}, ${b.y}) a meno di ${BIL.barili.distanzaMinimaSpawn} px dallo spawn (${p.x}, ${p.y})`);
    }
  }
  // scale e liane (design/comandi/scale-e-liane.md): il campo è facoltativo (le mappe fatte a mano possono non averle)
  if (mappa.appigli) {
    const R = REGOLE, ap = mappa.appigli;
    if (ap.length < R.appigliMin || ap.length > R.appigliMaxFatte) err.push(`${ap.length} scale/liane invece di ${R.appigliMin}-${R.appigliMaxFatte}`);
    const aSinistra = ap.filter((a) => a.x < W / 2).length;
    if (aSinistra * 2 !== ap.length) err.push(`scale/liane non uguali per lato: ${aSinistra} a sinistra, ${ap.length - aSinistra} a destra`);
    for (const a of ap) {
      err.push(...controllaAppiglio(t.maschera, t.mare, a));
      for (const p of [...mappa.spawn[0], ...mappa.spawn[1]]) {
        if (distanzaAppiglio(a, p) < R.appiglioLontanoDaSpawn) err.push(`${a.tipo} in x ${a.x} a meno di ${R.appiglioLontanoDaSpawn} px dallo spawn (${p.x}, ${p.y})`);
      }
    }
  }
  if (err.length) return err;
  return controllaInsieme(t.maschera, sup, t.mare, posti);
}
