// Scale e liane (design/comandi/scale-e-liane.md, richiesta del proprietario 21/11/2026).
// Un appiglio è un segmento verticale NON nella maschera: la cima arriva su un piano, il piede sul suolo.
// Sull'Isola i fianchi delle colline sono tutti percorribili a piedi (gradino 8 px), quindi il generatore SCAVA
// un dislivello vero: un gradone con la parete verticale (scala appoggiata alla parete) oppure con un labbro che
// sporge (liana che pende dal labbro). Un gradone per lato, specchiato sull'altro lato. Codice puro e deterministico.

import { MATERIALE, type MappaGenerata, type Punto, type TipoAppiglio } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { intero, probabilita, type ConRng } from '../../core/rng';
import { superficie } from './analisi';
import { MONDO, REGOLE } from './parametri';

export type AppiglioMappa = NonNullable<MappaGenerata['appigli']>[number];

const { w: W, h: H } = MONDO;
const ARIA = MATERIALE.aria;
/** il labbro da cui pende la liana sporge così dalla parete, ed è spesso così (cima della liana entro 8 px dal piano) */
const LABBRO = 14;
const LABBRO_SPESSO = 8;
/** l'appiglio sta a tanto dalla parete (o dal labbro): mezza capsula + 1, così chi sale non tocca la roccia */
const DISTACCO = BIL.pirata.capsulaLarghezza / 2 + 1;
/** il piano in cima, prima di raccordarsi a 45° con il fianco della collina */
const CIMA = REGOLE.appiglioPiano + 4;
/** scavo massimo sopra il piano in cima e lunghezza massima del raccordo */
const CIMA_SCAVO_MAX = 70;
const RACCORDO_MAX = 100;
/** il raccordo sale di 2 px per colonna: si cammina (gradino 8 px) */
const RACCORDO_PENDENZA = 2;
/** solido richiesto sotto il piano in cima e sotto il gradone in basso (niente grotte sotto) */
const SOTTO_CIMA = 20;
const SOTTO_PIEDE = 12;
/** due gradoni dello stesso lato restano almeno così lontani */
const DISTANZA_GRADONI = 40;
/** un gradone si scava dove il suolo sale di almeno PENDIO_MIN px tra xc − PENDIO e xc + PENDIO */
const PENDIO = 20;
const PENDIO_MIN = 10;
/** altezza massima di un gradone e lunghezza massima del gradone basso (oltre, lo scavo è troppo grande) */
const ALTO_MAX = 120;
const GRADONE_MAX = 180;

function pieno(m: Uint8Array, x: number, y: number): boolean {
  if (x < 0 || x >= W || y >= H) return true;
  if (y < 0) return false;
  return m[y * W + x] !== ARIA;
}

/** Dove sta in piedi un pirata nella colonna c con i piedi entro `tolleranza` px da y (−1 = da nessuna parte). */
function piediVicino(m: Uint8Array, c: number, y: number, tolleranza: number): number {
  const alto = BIL.pirata.capsulaAltezza;
  for (let s = y - tolleranza; s <= y + tolleranza; s++) {
    if (!pieno(m, c, s) || pieno(m, c, s - 1)) continue;
    let libero = true;
    for (let k = 2; k <= alto && libero; k++) if (pieno(m, c, s - k)) libero = false;
    if (libero) return s;
  }
  return -1;
}

/** Problemi di un appiglio sul terreno dato (vuoto = va bene). Lo usano il generatore e il validatore. */
export function controllaAppiglio(m: Uint8Array, mare: number, a: AppiglioMappa): string[] {
  const R = REGOLE, err: string[] = [];
  const nome = `${a.tipo} in x ${a.x} (${a.yAlto}-${a.yBasso})`;
  const lungo = a.yBasso - a.yAlto;
  if (lungo < R.appiglioCorto || lungo > R.appiglioLungo) err.push(`${nome}: lunga ${lungo} px (${R.appiglioCorto}-${R.appiglioLungo})`);
  if (a.x < MONDO.bordo || a.x >= W - MONDO.bordo) return err.concat(`${nome}: fuori dall'isola`);
  if (a.yBasso > mare - R.sopraMare) err.push(`${nome}: il piede è a meno di ${R.sopraMare} px dal mare`);
  for (let y = a.yAlto; y < a.yBasso; y++) if (pieno(m, a.x, y)) { err.push(`${nome}: attraversa il terreno a y ${y}`); break; }
  let piede = false;
  for (let y = a.yBasso; y <= a.yBasso + R.appiglioCima && !piede; y++) piede = pieno(m, a.x, y);
  if (!piede) err.push(`${nome}: il piede non arriva al suolo`);
  // in cima: un piano largo almeno appiglioPiano, che comincia entro la presa e sta entro appiglioCima px dalla cima
  let cima = false;
  for (const verso of [-1, 1]) {
    for (let k = 0; k <= BIL.arrampicata.presa && !cima; k++) {
      const s0 = piediVicino(m, a.x + verso * k, a.yAlto, R.appiglioCima);
      if (s0 < 0) continue;
      let largo = 0;
      for (let c = a.x + verso * k; c >= 0 && c < W; c += verso) {
        const s = piediVicino(m, c, s0, R.pianoDislivelloMax);
        if (s < 0 || Math.abs(s - a.yAlto) > R.appiglioCima) break;
        if (++largo >= R.appiglioPiano) break;
      }
      if (largo >= R.appiglioPiano) cima = true;
      break;
    }
  }
  if (!cima) err.push(`${nome}: in cima non c'è un piano largo ${R.appiglioPiano} px entro ${R.appiglioCima} px`);
  return err;
}

/** Distanza tra un punto e il segmento dell'appiglio. */
export function distanzaAppiglio(a: AppiglioMappa, p: Punto): number {
  const dx = p.x - a.x;
  const dy = p.y < a.yAlto ? a.yAlto - p.y : p.y > a.yBasso ? p.y - a.yBasso : 0;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Un gradone da scavare: colonne e righe da cambiare, e l'appiglio che ne nasce. */
interface Gradone {
  appiglio: AppiglioMappa;
  /** colonne toccate (min, max) */
  da: number;
  a: number;
  /** per ogni colonna toccata: sopra questa riga tutto aria; e l'eventuale labbro (righe da, a) da riempire */
  tagli: { c: number; sopra: number; labbro?: [number, number] }[];
}

/**
 * Progetta un gradone con la parete in xc; `fuori` (±1) è il verso del gradone basso. Restituisce null se lì non va:
 * pendenza sbagliata, grotte sotto, scavo troppo grande, fuori dai limiti [lo, hi] di colonna.
 */
function progetta(m: Uint8Array, sup: Int32Array, mare: number, xc: number, fuori: number, alto: number, tipo: TipoAppiglio, lo: number, hi: number): Gradone | null {
  const ya = sup[xc], yb = ya + alto;
  if (yb > mare - REGOLE.sopraMare) return null;
  const tagli: Gradone['tagli'] = [];
  // parete piena dalla cima al piede
  for (let y = ya; y < yb + SOTTO_PIEDE; y++) if (!pieno(m, xc, y)) return null;
  // piano in cima e raccordo a 45° con il fianco
  for (let j = 0; ; j++) {
    const c = xc - fuori * j;
    if (c < lo || c > hi) return null;
    if (j < CIMA) {
      if (sup[c] > ya + 4 || sup[c] < ya - CIMA_SCAVO_MAX) return null;
      for (let y = ya; y < ya + SOTTO_CIMA; y++) if (!pieno(m, c, y)) return null;
      tagli.push({ c, sopra: ya });
      continue;
    }
    const lim = ya - RACCORDO_PENDENZA * (j - CIMA + 1);
    if (sup[c] >= lim) break;
    if (j > CIMA + RACCORDO_MAX) return null;
    tagli.push({ c, sopra: lim });
  }
  // gradone basso: si scava fino a yb finché il suolo naturale non scende sotto yb
  const labbro = tipo === 'liana' ? LABBRO : 0;
  let k = 1;
  for (; ; k++) {
    const c = xc + fuori * k;
    if (c < lo || c > hi) return null;
    if (sup[c] >= yb && k > labbro) break;
    if (k > GRADONE_MAX) return null;
    for (let y = yb; y < yb + SOTTO_PIEDE; y++) if (!pieno(m, c, y)) return null;
    tagli.push({ c, sopra: yb, labbro: k <= labbro ? [ya, ya + LABBRO_SPESSO] : undefined });
  }
  const x = xc + fuori * (labbro + DISTACCO);
  // ai piedi dell'appiglio ci deve stare un pirata: il gradone continua almeno un piano oltre
  if (k - 1 < labbro + DISTACCO + REGOLE.appiglioPiano) return null;
  const cols = tagli.map((t) => t.c);
  return { appiglio: { tipo, x, yAlto: ya, yBasso: yb }, da: Math.min(...cols), a: Math.max(...cols), tagli };
}

function scava(m: Uint8Array, g: Gradone): void {
  for (const t of g.tagli) {
    for (let y = 0; y < t.sopra; y++) m[y * W + t.c] = ARIA;
    if (t.labbro) for (let y = t.labbro[0]; y < t.labbro[1]; y++) m[y * W + t.c] = MATERIALE.terra;
  }
}

/**
 * Piazza 1-2 appigli per lato (stessi tipi, altezze e posizioni specchiate) scavando i gradoni nella maschera `m`.
 * Va chiamato prima di scegliere gli spawn. Restituisce gli appigli in ordine di x, oppure null se non ce n'è
 * almeno uno per lato.
 */
export function piazzaAppigli(s: ConRng, m: Uint8Array, mare: number): AppiglioMappa[] | null {
  const R = REGOLE;
  const perLato = intero(s, Math.ceil(R.appigliMin / 2), Math.floor(R.appigliMax / 2));
  // metà sinistra, lontano dalla costa (il gradone basso non deve mai essere la scogliera sul mare)
  const lo = Math.round(W * 0.22), hi = Math.round(W / 2) - 10;
  const fatti: Gradone[] = [];
  let sup = superficie(m);
  // solo le colonne in pendenza: lì un gradone serve
  const pendio = (x: number) => sup[x + PENDIO] - sup[x - PENDIO];
  const candidati: number[] = [];
  for (let x = lo + PENDIO; x <= hi - PENDIO; x += 2) if (Math.abs(pendio(x)) >= PENDIO_MIN) candidati.push(x);
  if (!candidati.length) return null;
  for (let prove = 0; prove < 100 && fatti.length < perLato * 2; prove++) {
    const xc = candidati[intero(s, 0, candidati.length - 1)];
    const tipo: TipoAppiglio = probabilita(s, 0.5) ? 'liana' : 'scala';
    const alto = intero(s, R.appiglioCorto + 5, Math.min(R.appiglioLungo, ALTO_MAX));
    const d = pendio(xc);
    if (Math.abs(d) < PENDIO_MIN) continue; // il suolo è cambiato con un gradone già scavato
    const fuori = d > 0 ? 1 : -1;
    const sx = progetta(m, sup, mare, xc, fuori, alto, tipo, lo, hi);
    if (!sx) continue;
    const dx = progetta(m, sup, mare, W - 1 - xc, -fuori, alto, tipo, W - 1 - hi, W - 1 - lo);
    if (!dx) continue;
    if (fatti.some((g) => sx.da - DISTANZA_GRADONI <= g.a && g.da <= sx.a + DISTANZA_GRADONI)) continue;
    scava(m, sx);
    scava(m, dx);
    fatti.push(sx, dx);
    sup = superficie(m);
  }
  if (fatti.length < R.appigliMin) return null;
  const out = fatti.map((g) => g.appiglio);
  for (const a of out) if (controllaAppiglio(m, mare, a).length) return null;
  return out.sort((a, b) => a.x - b.x);
}
