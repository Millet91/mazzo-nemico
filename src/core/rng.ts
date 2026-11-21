// PRNG deterministico (mulberry32) con lo stato dentro StatoBattaglia (00 §1.2: niente Math.random nella simulazione).
// Lo stato è un intero a 32 bit senza segno; ogni chiamata lo avanza e restituisce il valore estratto.
// Contratto congelato dal Lead (M1).

export interface ConRng { rng: number }

/** Seme iniziale da un numero qualsiasi (anche negativo o con decimali). */
export function semeIniziale(seme: number): number {
  let h = (Math.floor(seme) ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Numero in [0, 1). Avanza s.rng. */
export function casuale(s: ConRng): number {
  s.rng = (s.rng + 0x6d2b79f5) >>> 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Intero in [min, max], estremi compresi. */
export function intero(s: ConRng, min: number, max: number): number {
  return min + Math.floor(casuale(s) * (max - min + 1));
}

/** Vero con probabilità p. */
export function probabilita(s: ConRng, p: number): boolean {
  return casuale(s) < p;
}

/** Mescola sul posto (Fisher-Yates). */
export function mescola<T>(s: ConRng, v: T[]): T[] {
  for (let i = v.length - 1; i > 0; i--) {
    const j = Math.floor(casuale(s) * (i + 1));
    [v[i], v[j]] = [v[j], v[i]];
  }
  return v;
}

/** Hash di più numeri in un seme (es. seme campagna + territorio + round, 06 §1). */
export function combinaSemi(...n: number[]): number {
  let h = 2166136261 >>> 0;
  for (const x of n) {
    h = Math.imul(h ^ (Math.floor(x) >>> 0), 16777619) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
  }
  return h >>> 0;
}
