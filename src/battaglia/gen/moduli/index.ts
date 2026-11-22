// Kit di moduli dei livelli (Pacchetto 2, agente Scenario e livelli; docs/progetto/studio-v2/livelli-cap1.md §4).
// Funzioni PURE che disegnano un pezzo di livello dentro una maschera già fatta (generata o a mano) e annotano le
// strutture della Fase 3 (P1-contratti §7). Le usa scripts/mappe/isole/costruisci-isole.ts per le 8 isole del cap. 1.
//
// Regole della sim di oggi che i moduli rispettano (sim/crolli.ts, sim/pezzi.ts):
//  - cade solo un pezzo staccato DA TUTTO (fondale, ferro, sostegni), sotto BIL.crolli.pezzoMaxPx (6000 px): cade dritto
//    e si frantuma dove tocca. Per questo ogni elemento che crolla è appeso all'isola per un solo "collo" (pali, base
//    sottile) che un colpo taglia;
//  - il ferro è un appoggio: niente che deve cadere tocca il ferro;
//  - al tick 0 niente è staccato (lo controlla il test delle isole).
import { MATERIALE, type Materiale, type Rettangolo, type StrutturaMappa, type TipoStruttura } from '../../../core/tipi';

const ARIA = MATERIALE.aria;

/** Una maschera in lavorazione con le strutture annotate. */
export interface Cantiere {
  w: number;
  h: number;
  m: Uint8Array;
  strutture: StrutturaMappa[];
}

export function cantiere(m: Uint8Array, w: number, h: number): Cantiere {
  return { w, h, m, strutture: [] };
}

const pieno = (c: Cantiere, x: number, y: number) => x >= 0 && x < c.w && y >= 0 && y < c.h && c.m[y * c.w + x] !== ARIA;

/** Prima riga piena dalla y data in giù nella colonna x (h se non c'è). */
export function suolo(c: Cantiere, x: number, da = 0): number {
  for (let y = Math.max(0, da); y < c.h; y++) if (c.m[y * c.w + x] !== ARIA) return y;
  return c.h;
}

/** Riempie un rettangolo (estremi compresi). `soloAria`: non tocca il terreno che c'è già. */
export function riempi(c: Cantiere, r: Rettangolo, mat: Materiale, soloAria = false): void {
  for (let y = Math.max(0, r.y0); y <= Math.min(c.h - 1, r.y1); y++) {
    for (let x = Math.max(0, r.x0); x <= Math.min(c.w - 1, r.x1); x++) {
      const i = y * c.w + x;
      if (!soloAria || c.m[i] === ARIA) c.m[i] = mat;
    }
  }
}

/** Svuota un rettangolo (estremi compresi). */
export function svuota(c: Cantiere, r: Rettangolo): void {
  riempi(c, r, ARIA as Materiale);
}

/** Annota una struttura col rettangolo dei pixel `mat` aggiunti in `dentro` (l'ingombro reale). */
function annota(c: Cantiere, tipo: TipoStruttura, dentro: Rettangolo, prima: Uint8Array): StrutturaMappa {
  let x0 = c.w, y0 = c.h, x1 = -1, y1 = -1;
  for (let y = Math.max(0, dentro.y0); y <= Math.min(c.h - 1, dentro.y1); y++) {
    for (let x = Math.max(0, dentro.x0); x <= Math.min(c.w - 1, dentro.x1); x++) {
      const i = y * c.w + x;
      if (c.m[i] !== prima[i]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
  }
  const st: StrutturaMappa = { tipo, x0, y0, x1, y1 };
  c.strutture.push(st);
  return st;
}

export interface OpzioniTorre {
  /** bordo sinistro e destro del piano */
  x0: number;
  x1: number;
  /** y della faccia alta del piano (dove si sta in piedi) */
  piano: number;
  /** x sinistra di ogni palo (largo `palo`); i pali scendono fino al suolo */
  pali: number[];
  palo?: number;
  spessore?: number;
  /** ringhiera ai capi, alta così (0 = niente) */
  ringhiera?: number;
  /** capi senza ringhiera (dove arriva una scala): 'sx', 'dx' */
  apertoA?: 'sx' | 'dx';
  /** tetto a punta sopra il piano, a questa altezza dal piano (0 = niente) */
  tetto?: number;
}

/**
 * Torre di vedetta di legno su pali (livelli-cap1.md §2, 1D e 1C): piano, ringhiera, tetto a punta. Tocca l'isola SOLO
 * con i piedi dei pali, quindi un colpo alla base dei pali la stacca tutta e la fa crollare (≤ 6000 px).
 * Lancia un errore se il piano o il tetto toccano il terreno (la torre sarebbe appoggiata e non crollerebbe).
 */
export function torreSuPali(c: Cantiere, o: OpzioniTorre): StrutturaMappa {
  const palo = o.palo ?? 6, sp = o.spessore ?? 6, ring = o.ringhiera ?? 0, tetto = o.tetto ?? 0;
  const LEGNO = MATERIALE.legno;
  const yTetto = o.piano - (tetto ? tetto : ring) - 2;
  // il piano, la ringhiera e il tetto devono stare in aria, con 2 px di aria attorno
  for (let y = yTetto - 2; y <= o.piano + sp + 1; y++) for (let x = o.x0 - 2; x <= o.x1 + 2; x++) {
    if (pieno(c, x, y)) throw new Error(`torre ${o.x0}-${o.x1}: il terreno tocca la torre in (${x}, ${y})`);
  }
  const prima = c.m.slice();
  riempi(c, { x0: o.x0, y0: o.piano, x1: o.x1, y1: o.piano + sp - 1 }, LEGNO);
  for (const px of o.pali) {
    for (let x = px; x < px + palo; x++) {
      for (let y = o.piano + sp; y < c.h && c.m[y * c.w + x] === ARIA; y++) c.m[y * c.w + x] = LEGNO;
    }
  }
  if (ring) {
    if (o.apertoA !== 'sx') riempi(c, { x0: o.x0, y0: o.piano - ring, x1: o.x0 + 2, y1: o.piano - 1 }, LEGNO);
    if (o.apertoA !== 'dx') riempi(c, { x0: o.x1 - 2, y0: o.piano - ring, x1: o.x1, y1: o.piano - 1 }, LEGNO);
  }
  if (tetto) {
    // colonnine ai capi (non dove arriva la scala) e il tetto a punta, largo quanto il piano
    const g0 = o.x0, g1 = o.x1, gronda = o.piano - tetto + 8, colmo = o.piano - tetto;
    if (o.apertoA !== 'sx') riempi(c, { x0: o.x0, y0: gronda, x1: o.x0 + 2, y1: o.piano - 1 }, LEGNO);
    if (o.apertoA !== 'dx') riempi(c, { x0: o.x1 - 2, y0: gronda, x1: o.x1, y1: o.piano - 1 }, LEGNO);
    const mezzo = (g0 + g1) / 2, mezza = (g1 - g0) / 2;
    for (let x = g0; x <= g1; x++) {
      const cima = Math.round(colmo + (gronda - 4 - colmo) * Math.abs(x - mezzo) / mezza);
      for (let y = cima; y <= gronda; y++) c.m[y * c.w + x] = LEGNO;
    }
  }
  return annota(c, 'torre', { x0: o.x0 - 4, y0: yTetto - 4, x1: o.x1 + 4, y1: c.h - 1 }, prima);
}

/** Muro pieno appoggiato al suolo: da `base` (y del suolo) sale di `alto` px, largo x0-x1. Solo dove c'è aria. */
export function muro(c: Cantiere, x0: number, x1: number, alto: number, mat: Materiale): Rettangolo {
  let base = 0;
  for (let x = x0; x <= x1; x++) base = Math.max(base, suolo(c, x));
  const r = { x0, y0: base - alto, x1, y1: base + 4 };
  riempi(c, r, mat, true);
  return { x0, y0: base - alto, x1, y1: base };
}

/** distanza minima tra l'asse di una scala o liana e il terreno ai lati (tests/mappe/mappe-fatte: capsula 12 + 2) */
export const ASSE_LIBERO = 8;

/**
 * Sposta di qualche px l'asse delle scale e liane troppo vicine a un muro (il bug "la scalata si ferma a metà"):
 * prova ±1…±6 px e tiene la prima posizione con ASSE_LIBERO px liberi ai due lati e il piede ancora sul suolo.
 */
export function scostaAppigli<T extends { x: number; yAlto: number; yBasso: number }>(c: Cantiere, appigli: T[]): T[] {
  const libero = (x: number, a: T) => {
    for (let y = a.yAlto + 4; y < a.yBasso - 12; y++) for (let d = 0; d < ASSE_LIBERO; d++) if (pieno(c, x - d, y) || pieno(c, x + d, y)) return false;
    for (let y = a.yBasso; y <= a.yBasso + 8; y++) if (pieno(c, x, y)) return true;
    return false;
  };
  return appigli.map((a) => {
    if (libero(a.x, a)) return a;
    for (let k = 1; k <= 6; k++) for (const x of [a.x - k, a.x + k]) if (libero(x, a)) return { ...a, x, yBasso: suolo(c, x, a.yAlto) };
    return a;
  });
}
