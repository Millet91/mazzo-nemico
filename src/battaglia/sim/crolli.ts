// Fase 3 (PIANO §3, "il campo si spezza"; P1-contratti §7): sostegno strutturale. Dopo un'esplosione si cercano,
// solo attorno al punto, i pezzi di terreno non più collegati a un appoggio. Appoggi: il fondale, il ferro, un pixel
// pieno dentro un sostegno della mappa (`StatoBattaglia.sostegni`), e il corpo dell'isola (una ricerca che supera
// `pezzoMax` pixel senza chiudersi è la montagna, non un pezzo: è anche il tetto del costo).
// Tutto con interi e code in ordine fisso: deterministico.

import type { Rettangolo, Terreno } from '../../core/tipi';
import { MATERIALE } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';

/** byte della maschera che tengono su gli altri e non cadono mai: il ferro */
const APPOGGIO = new Uint8Array(256);
APPOGGIO[MATERIALE.ferro] = 1;

export interface OpzioniSostegno {
  /** oltre questi pixel una ricerca conta come "collegata al corpo dell'isola" (BIL.crolli.pezzoMaxPx) */
  pezzoMax: number;
  /** ancoraggi della mappa: un pixel pieno dentro uno di questi tiene su il suo pezzo */
  sostegni?: readonly Rettangolo[];
  /** ricerche lunghe (oltre il primo vicinato) al massimo per chiamata; le altre partenze contano come appoggiate */
  ricercheMax?: number;
}

function inSostegno(sostegni: readonly Rettangolo[], x: number, y: number): boolean {
  for (const r of sostegni) if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return true;
  return false;
}

/** chiamate a `cerca` che sono andate oltre il vicinato, in questa chiamata di pezziStaccati */
let lunghe = 0;

/** Un pezzo staccato: indici dei pixel nella maschera (y * w + x), in ordine di visita, e il suo rettangolo. */
export interface PezzoStaccato {
  pixel: Int32Array;
  x0: number; y0: number; x1: number; y1: number;
}

// segni di visita, riusati tra una chiamata e l'altra (si puliscono alla fine di ogni ricerca)
const LIBERO = 0, IN_CODA = 1, APPOGGIATO = 2, STACCATO = 3;
/** pixel visitati in larghezza prima di scendere in profondità */
const VICINATO = 128;
let segni = new Uint8Array(0);
/** tutti i pixel segnati in una chiamata (per pulire i segni alla fine) */
let toccati = new Int32Array(0);
let nToccati = 0;
let coda = new Int32Array(0);
let pila = new Int32Array(0);

/**
 * Pezzi staccati attorno a (x, y): si parte dai pixel solidi di bordo entro `r` px dal punto (il bordo del cratere) e da
 * ognuno si cerca, a 4 vicini, se si arriva a un appoggio. I pezzi trovati NON vengono tolti dalla maschera.
 * Ordine: per primo pixel di partenza (riga per riga), così due chiamate uguali danno lo stesso risultato.
 */
export function pezziStaccati(t: Terreno, x: number, y: number, r: number, opz: OpzioniSostegno): PezzoStaccato[] {
  const { w, h, maschera } = t;
  if (segni.length !== w * h) segni = new Uint8Array(w * h);
  if (coda.length < opz.pezzoMax + 1) { coda = new Int32Array(opz.pezzoMax + 1); pila = new Int32Array(opz.pezzoMax + 1); }
  nToccati = 0; lunghe = 0;
  const out: PezzoStaccato[] = [];
  const ricercheMax = opz.ricercheMax ?? Infinity;
  const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(w - 1, Math.ceil(x + r));
  const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(h - 1, Math.ceil(y + r));
  const r2 = r * r;
  for (let py = y0; py <= y1; py++) {
    const dy = py + 0.5 - y;
    for (let px = x0; px <= x1; px++) {
      const i = py * w + px;
      if (maschera[i] === MATERIALE.aria || segni[i] !== LIBERO) continue;
      const dx = px + 0.5 - x;
      if (dx * dx + dy * dy > r2) continue;
      // si parte solo dal bordo (un vicino d'aria): dentro la roccia piena non c'è niente di nuovo da cercare
      if (!(py > 0 && maschera[i - w] === MATERIALE.aria) && !(px > 0 && maschera[i - 1] === MATERIALE.aria)
        && !(px < w - 1 && maschera[i + 1] === MATERIALE.aria) && !(py < h - 1 && maschera[i + w] === MATERIALE.aria)) continue;
      if (lunghe >= ricercheMax) break;
      const p = cerca(t, i, opz);
      if (p) out.push(p);
    }
  }
  for (let k = 0; k < nToccati; k++) segni[toccati[k]] = LIBERO;
  return out;
}

/** Una ricerca a partire dal pixel `inizio`: il pezzo se è staccato, altrimenti null (e i pixel visti restano "appoggiati"). */
function cerca(t: Terreno, inizio: number, opz: OpzioniSostegno): PezzoStaccato | null {
  const { w, h, maschera } = t;
  const max = opz.pezzoMax, sostegni = opz.sostegni ?? [], fondale = BIL.mondo.inizioFondale;
  // Due tempi. Prima in larghezza per VICINATO pixel: dal bordo del cratere si incontra subito la zona già
  // controllata da una ricerca precedente. Poi in profondità scendendo per prima (il "giù" esce per primo dalla
  // pila): un pezzo collegato all'isola arriva presto al fondale di ferro senza visitare tutto attorno al cratere.
  let testa = 0, cima = 0, n = 0, profondita = false;
  coda[n++] = inizio; segni[inizio] = IN_CODA;
  let appoggiato = false;
  let bx0 = w, by0 = h, bx1 = -1, by1 = -1;
  for (;;) {
    let i: number;
    if (!profondita && testa < n && testa < VICINATO) i = coda[testa++];
    else {
      if (!profondita) {
        // fine del primo tempo: quello che resta in coda passa nella pila (in ordine inverso: esce il primo)
        profondita = true; lunghe++;
        for (let k = n - 1; k >= testa; k--) pila[cima++] = coda[k];
      }
      if (cima === 0) break;
      i = pila[--cima];
    }
    const px = i % w, py = (i - px) / w;
    if (APPOGGIO[maschera[i]] || py >= fondale || py === h - 1 || (sostegni.length > 0 && inSostegno(sostegni, px, py))) { appoggiato = true; break; }
    if (px < bx0) bx0 = px; if (px > bx1) bx1 = px; if (py < by0) by0 = py; if (py > by1) by1 = py;
    // vicini: su, sinistra, destra, giù (ordine fisso; nella pila esce per primo il giù)
    for (let k = 0; k < 4; k++) {
      let j: number;
      if (k === 0) { if (py === 0) continue; j = i - w; }
      else if (k === 1) { if (px === 0) continue; j = i - 1; }
      else if (k === 2) { if (px === w - 1) continue; j = i + 1; }
      else { j = i + w; }
      if (maschera[j] === MATERIALE.aria) continue;
      const sj = segni[j];
      if (sj === APPOGGIATO) { appoggiato = true; break; }
      if (sj !== LIBERO) continue;
      if (n >= max) { appoggiato = true; break; }
      segni[j] = IN_CODA;
      coda[n++] = j;
      if (profondita) pila[cima++] = j;
    }
    if (appoggiato) break;
  }
  // segna i pixel visti e li ricorda per la pulizia finale
  if (toccati.length < nToccati + n) {
    const nuovo = new Int32Array(Math.max(2 * toccati.length, nToccati + n, 4096));
    nuovo.set(toccati.subarray(0, nToccati));
    toccati = nuovo;
  }
  for (let k = 0; k < n; k++) toccati[nToccati + k] = coda[k];
  nToccati += n;
  const segno = appoggiato ? APPOGGIATO : STACCATO;
  for (let k = 0; k < n; k++) segni[coda[k]] = segno;
  if (appoggiato) return null;
  return { pixel: coda.slice(0, n), x0: bx0, y0: by0, x1: bx1, y1: by1 };
}

/**
 * Toglie il pezzo dalla maschera e ne restituisce la forma: w×h byte di materiale (0 = vuoto) con l'angolo in
 * alto a sinistra in (x0, y0).
 */
export function staccaDallaMaschera(t: Terreno, p: PezzoStaccato): { w: number; h: number; maschera: Uint8Array } {
  const pw = p.x1 - p.x0 + 1, ph = p.y1 - p.y0 + 1;
  const forma = new Uint8Array(pw * ph);
  for (let k = 0; k < p.pixel.length; k++) {
    const i = p.pixel[k];
    const px = i % t.w, py = (i - px) / t.w;
    forma[(py - p.y0) * pw + (px - p.x0)] = t.maschera[i];
    t.maschera[i] = MATERIALE.aria;
  }
  return { w: pw, h: ph, maschera: forma };
}

// ─── Sabbia che frana ────────────────────────────────────────────────────────────────────────────

/**
 * Un passo di frana nel rettangolo [x0, x1] × [y0, y1]: ogni pixel di sabbia con aria sotto scende di 1 px; se
 * sotto è pieno ma in diagonale (giù a sinistra o a destra) c'è aria, ci scivola (pendio di 45° al massimo).
 * Si scorre dal basso verso l'alto, a righe alterne da sinistra e da destra (così la frana non pende da un lato).
 * `occupato(x, y)` = lì la sabbia non può entrare (un pirata, un barile).
 * Restituisce il rettangolo dei pixel mossi, o null se la sabbia è ferma.
 */
export function franaPasso(
  t: Terreno, x0: number, y0: number, x1: number, y1: number, passo: number, occupato?: (x: number, y: number) => boolean,
): { x0: number; y0: number; x1: number; y1: number } | null {
  const { w, h, maschera } = t;
  const sabbia = MATERIALE.sabbia, aria = MATERIALE.aria;
  x0 = Math.max(0, x0); x1 = Math.min(w - 1, x1); y0 = Math.max(0, y0); y1 = Math.min(h - 2, y1);
  let mx0 = w, my0 = h, mx1 = -1, my1 = -1;
  for (let py = y1; py >= y0; py--) {
    const daSinistra = ((py + passo) & 1) === 0;
    for (let k = 0; k <= x1 - x0; k++) {
      const px = daSinistra ? x0 + k : x1 - k;
      const i = py * w + px;
      if (maschera[i] !== sabbia) continue;
      const sotto = i + w;
      let j = -1;
      if (maschera[sotto] === aria) j = sotto;
      else {
        // in diagonale: prima dal lato da cui si scorre la riga, poi dall'altro
        const a = daSinistra ? -1 : 1;
        for (const d of [a, -a]) {
          const nx = px + d;
          if (nx < x0 || nx > x1) continue;
          if (maschera[sotto + d] === aria && maschera[i + d] === aria) { j = sotto + d; break; }
        }
      }
      if (j < 0) continue;
      if (occupato) { const jx = j % w; if (occupato(jx, (j - jx) / w)) continue; }
      maschera[j] = sabbia; maschera[i] = aria;
      const jx = j % w;
      if (Math.min(px, jx) < mx0) mx0 = Math.min(px, jx);
      if (Math.max(px, jx) > mx1) mx1 = Math.max(px, jx);
      if (py < my0) my0 = py;
      if (py + 1 > my1) my1 = py + 1;
    }
  }
  return mx1 < 0 ? null : { x0: mx0, y0: my0, x1: mx1, y1: my1 };
}
