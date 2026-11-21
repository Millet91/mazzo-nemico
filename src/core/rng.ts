// PRNG deterministico (sfc32). Lo stato è un array di 4 interi, serializzabile nello stato di gioco.
// Mai Math.random() nel core (GDD §13.4).

export type RngState = [number, number, number, number];

export function hashString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function seedRng(seed: string | number): RngState {
  const s = String(seed);
  const st: RngState = [hashString(s + '#a'), hashString(s + '#b'), hashString(s + '#c'), hashString(s + '#d')];
  const r = new Rng(st);
  for (let i = 0; i < 12; i++) r.next();
  return r.state;
}

export class Rng {
  state: RngState;
  constructor(state: RngState) {
    this.state = state;
  }
  static from(seed: string | number): Rng {
    return new Rng(seedRng(seed));
  }
  /** uint32 */
  next(): number {
    let [a, b, c, d] = this.state;
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    this.state = [a >>> 0, b >>> 0, c >>> 0, d >>> 0];
    return t >>> 0;
  }
  /** intero in [0, n) */
  int(n: number): number {
    if (n <= 0) return 0;
    return Math.floor((this.next() / 4294967296) * n);
  }
  /** percentuale 0..99 */
  pct(): number {
    return this.int(100);
  }
  chance(p: number): boolean {
    return this.int(1000) < Math.round(p * 1000);
  }
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    const tot = weights.reduce((a, b) => a + b, 0);
    let r = this.int(Math.max(1, tot));
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r < 0) return items[i];
    }
    return items[items.length - 1];
  }
  /** nuovo seed numerico derivato */
  fork(): number {
    return this.next();
  }
}

/** Stream separati (GDD §13.4): aggiungere un oggetto al negozio non cambia le pescate. */
export type StreamName = 'draw' | 'deck' | 'shop' | 'rewards' | 'events' | 'boss' | 'map' | 'cosmetic';
export const STREAMS: StreamName[] = ['draw', 'deck', 'shop', 'rewards', 'events', 'boss', 'map', 'cosmetic'];
