// Forme e rumore del pittore della mappa del mondo (P2, agente Mondo e mappa). Puro: niente DOM.
// Le usa solo il pittore (scripts/mondo/pittore.ts): la scena in gioco non ricalcola le forme, legge le immagini
// e l'immagine "a indici" che il pittore ha già salvato in public/assets/mondo/.

/** Generatore pseudo-casuale con seme (mulberry32): stessa carta a ogni esecuzione. */
export function rng(seme: number): () => number {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seme da una stringa (id dell'isola). */
export function semeDa(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const liscio = (t: number) => t * t * (3 - 2 * t);
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return liscio(t);
};
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Rumore a valori su griglia con periodo (si ripete ogni `periodo` celle: serve al legno che si ripete a tessere).
 * Restituisce una funzione (x, y) → 0..1 con x, y in celle.
 */
export function rumore(seme: number, periodo = 256): (x: number, y: number) => number {
  const r = rng(seme);
  const n = periodo;
  const v = new Float32Array(n * n);
  for (let i = 0; i < v.length; i++) v[i] = r();
  const m = (k: number) => ((k % n) + n) % n;
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = liscio(x - xi), fy = liscio(y - yi);
    const a = v[m(yi) * n + m(xi)], b = v[m(yi) * n + m(xi + 1)];
    const c = v[m(yi + 1) * n + m(xi)], d = v[m(yi + 1) * n + m(xi + 1)];
    return mix(mix(a, b, fx), mix(c, d, fx), fy);
  };
}

/** Rumore frattale (somma di ottave). */
export function fbm(seme: number, ottave = 4, periodo = 256): (x: number, y: number) => number {
  const strati = Array.from({ length: ottave }, (_, i) => rumore(seme + i * 101, periodo));
  return (x, y) => {
    let s = 0, amp = 0.5, tot = 0, f = 1;
    for (const n of strati) { s += n(x * f, y * f) * amp; tot += amp; amp *= 0.5; f *= 2; }
    return s / tot;
  };
}

/** Sagoma di un'isola: raggio della costa in funzione dell'angolo (px logici). */
export interface Sagoma {
  /** raggio della costa all'angolo `a` (radianti, 0 = est, verso il basso positivo come lo schermo) */
  costa(a: number): number;
  /** raggio massimo (per dimensionare lo sprite) */
  max: number;
}

/**
 * Sagoma tondeggiante e frastagliata, diversa per ogni isola. `allunga` > 1 la stira in orizzontale.
 * Le armoniche basse danno baie e promontori, le alte la costa mossa.
 */
export function sagoma(id: string, raggio: number, allunga = 1.15): Sagoma {
  const r = rng(semeDa(id));
  const arm: { k: number; a: number; f: number }[] = [];
  for (let k = 2; k <= 9; k++) arm.push({ k, a: (0.2 / k) * (0.5 + r()), f: r() * Math.PI * 2 });
  const costa = (a: number) => {
    let s = 1;
    for (const h of arm) s += h.a * Math.sin(h.k * a + h.f);
    // ellisse: più larga che alta (vista dall'alto inclinata)
    const e = raggio / Math.sqrt((Math.cos(a) / allunga) ** 2 + (Math.sin(a) * allunga * 0.92) ** 2);
    return e * s;
  };
  let max = 0;
  for (let i = 0; i < 360; i++) max = Math.max(max, costa((i / 180) * Math.PI));
  return { costa, max };
}

/** Distanza "dentro" la costa: 1 al centro, 0 sulla costa, negativa in mare (in frazioni del raggio di costa). */
export function dentro(s: Sagoma, dx: number, dy: number): { t: number; rc: number } {
  const a = Math.atan2(dy, dx);
  const rc = s.costa(a);
  return { t: 1 - Math.hypot(dx, dy) / rc, rc };
}
