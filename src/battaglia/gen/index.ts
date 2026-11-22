// API pubblica del generatore di mappe: CONTRATTO CONGELATO dal Lead (M1). La firma non cambia.
// Implementazione: agente Generatore (C, ramo claude/m1-gen).
//
// Regole: TypeScript puro e deterministico (stesse regole della sim: core/rng.ts, core/trig.ts, niente Math.random).
// Stessa RichiestaMappa ⇒ stessa MappaGenerata, byte per byte.
//
// Pipeline (06 §1 corretta da 00 §2.2), per il bioma Isola tropicale:
//  1. specchio orizzontale 50% dal seme;  2. profilo procedurale da parametri (spiagge, 1-2 colline) + rumore 1D;
//  3. grotte a metaball;  4. strati (24 px sabbia, terra, roccia sotto 160 px);  5. 1-2 massi di roccia;
//  5b. 1-2 scale o liane per lato su gradoni scavati apposta (design/comandi/scale-e-liane.md);
//  6. 5 spawn per lato con requisiti ed equità (06 §4);  7. validazione anti-frustrazione (06 §7).
// Se la validazione fallisce si riprova con seme+1, fino a 8 tentativi; poi si usa il seme di riserva già validato.
// In M1 esiste solo l'Isola: per gli altri biomi si usa lo stesso terreno (il campo `bioma` resta quello chiesto).

import type { Decorazione, MappaGenerata, Punto, RichiestaMappa } from '../../core/tipi';
import { intero, mescola, probabilita, semeIniziale, type ConRng } from '../../core/rng';
import { superficie } from './analisi';
import { specchiaMaschera, terrenoIsola } from './isola';
import { MONDO, REGOLE } from './parametri';
import { conTentativi } from './tentativi';
import { BIL } from '../../contenuti/bilanciamento';
import { piazzaBarili } from './barili';
import { controllaInsieme, controllaPosto, distanzaMare, postiValidi, type Posto } from './spawn';
import { validaMassa } from './valida';
import { controllaAppiglio, piazzaAppigli, type AppiglioMappa } from './appigli';

const { w: W } = MONDO;

/** Quante combinazioni di spawn si provano su un terreno prima di cambiare seme. */
const SCELTE_SPAWN = 60;
/** barili e decorazioni non si piazzano così vicino a una scala o a una liana (non toccano il gradone) */
const LONTANO_DA_APPIGLI = 50;

/**
 * Sceglie fino a n posti distanti almeno REGOLE.distanzaCompagni, in ordine casuale. Con `vicinoA` preferisce i posti
 * la cui distanza dal mare è vicina a quel valore (a fasce di 25 px): così i due lati restano equi (06 §4).
 */
function scegli(s: ConRng, posti: Posto[], n: number, dMare?: Map<Posto, number>, vicinoA?: number): Posto[] {
  let v = mescola(s, posti.slice());
  if (dMare && vicinoA !== undefined) {
    const fascia = (p: Posto) => Math.floor(Math.abs((dMare.get(p) ?? 0) - vicinoA) / 25);
    v = v.map((p, i) => ({ p, i, f: fascia(p) })).sort((a, b) => a.f - b.f || a.i - b.i).map((e) => e.p);
  }
  const out: Posto[] = [];
  for (const p of v) {
    if (out.every((q) => Math.abs(q.x - p.x) >= REGOLE.distanzaCompagni)) out.push(p);
    if (out.length === n) break;
  }
  return out.sort((a, b) => a.x - b.x);
}

/** Quanti posti distanti tra loro almeno REGOLE.distanzaCompagni ci stanno al massimo (da sinistra a destra è ottimo). */
function impacca(posti: Posto[]): number {
  let n = 0, ultimo = -Infinity;
  for (const p of posti.slice().sort((a, b) => a.x - b.x)) if (p.x - ultimo >= REGOLE.distanzaCompagni) { n++; ultimo = p.x; }
  return n;
}

function decorazioni(s: ConRng, sup: Int32Array, mare: number, spawn: Punto[], appigli: AppiglioMappa[]): Decorazione[] {
  const out: Decorazione[] = [];
  const piazza = (tipo: Decorazione['tipo'], quante: number) => {
    for (let i = 0, prove = 0; i < quante && prove < 30; prove++) {
      const x = intero(s, MONDO.bordo + 60, W - MONDO.bordo - 60);
      if (sup[x] >= mare - 30) continue;
      if (Math.abs(sup[x - 8] - sup[x + 8]) > 10) continue;
      if (spawn.some((p) => Math.abs(p.x - x) < REGOLE.decorazioniLontanoDaSpawn)) continue;
      if (appigli.some((a) => Math.abs(a.x - x) < LONTANO_DA_APPIGLI)) continue;
      if (out.some((d) => Math.abs(d.x - x) < 50)) continue;
      out.push({ tipo, x, y: sup[x], scala: intero(s, 80, 120) / 100, specchio: probabilita(s, 0.5) });
      i++;
    }
  };
  piazza('palma', intero(s, 2, 4));
  piazza('cespuglio', intero(s, 3, 6));
  piazza('masso', intero(s, 1, 3));
  return out.sort((a, b) => a.x - b.x);
}

/** Un tentativo con un seme: la mappa se passa la validazione, altrimenti null. */
export function tentativo(seme: number, r: RichiestaMappa): MappaGenerata | null {
  const s: ConRng = { rng: semeIniziale(seme) };
  const mare = MONDO.mare;
  const specchiata = probabilita(s, 0.5);
  const { maschera } = terrenoIsola(s);
  if (validaMassa(maschera, mare).length) return null;
  // scale e liane: i gradoni si scavano prima di scegliere gli spawn, così gli spawn li vedono già
  const sup = superficie(maschera);
  let appigli = piazzaAppigli(s, maschera, sup, mare);
  if (!appigli) return null;
  if (validaMassa(maschera, mare).length) return null;
  const lontanoDaAppigli = (x: number) => appigli!.every((a) => Math.abs(a.x - x) >= REGOLE.appiglioLontanoDaSpawn);
  const n = REGOLE.spawnPerLato;
  const candidati: [Posto[], Posto[]] = [[], []];
  for (const lato of [0, 1] as const) {
    const tutti = postiValidi(maschera, sup, mare, lato === 1).filter((p) => lontanoDaAppigli(p.x));
    if (impacca(tutti) < n) return null;
    if (REGOLE.sciabolaVieta) {
      // meglio i posti da cui la sciabola non butta in mare, se bastano
      const sicuri = tutti.filter((p) => !p.sciabolaInMare);
      candidati[lato] = impacca(sicuri) >= n ? sicuri : tutti;
    } else candidati[lato] = tutti;
  }

  let scelti: [Posto[], Posto[]] | null = null;
  const dMare = new Map<Posto, number>();
  for (const p of [...candidati[0], ...candidati[1]]) dMare.set(p, distanzaMare(sup, mare, p));
  for (let k = 0, complete = 0; k < SCELTE_SPAWN && complete < 3; k++) {
    // un lato a caso, l'altro scelto per somigliargli (si alterna quale dei due guida)
    const guida = k % 2;
    const primo = scegli(s, candidati[guida], n);
    const media = primo.reduce((t, p) => t + (dMare.get(p) ?? 0), 0) / Math.max(1, primo.length);
    const secondo = scegli(s, candidati[1 - guida], n, dMare, media);
    const prova: [Posto[], Posto[]] = guida === 0 ? [primo, secondo] : [secondo, primo];
    if (prova[0].length < n || prova[1].length < n) continue;
    if (controllaInsieme(maschera, sup, mare, prova, false).length) continue;
    complete++;
    if (controllaInsieme(maschera, sup, mare, prova, true).length) continue;
    scelti = prova;
    break;
  }
  if (!scelti) return null;

  const piedi = (p: Posto): Punto => ({ x: p.x, y: p.y });
  let sx = scelti[0].map(piedi), dx = scelti[1].map(piedi);
  let barili = piazzaBarili(s, maschera, sup, mare, [...sx, ...dx], appigli.map((a) => a.x), LONTANO_DA_APPIGLI);
  if (barili.length < BIL.barili.min) return null;
  // le spianate dei barili toccano la maschera: si ricontrolla ogni posto (piano, sporgenze, spinte) e poi l'insieme
  // (linee di tiro e colpi). Un posto che cambia quota o non passa più fa scartare il tentativo.
  const ricontrollati = scelti.map((lato) => lato.map((p) => controllaPosto(maschera, sup, mare, p.x)));
  if (ricontrollati.some((lato, i) => lato.some((q, j) => typeof q === 'string' || q.y !== scelti![i][j].y))) return null;
  scelti = ricontrollati as [Posto[], Posto[]];
  if (controllaInsieme(maschera, sup, mare, scelti, true).length) return null;
  if (appigli.some((a) => controllaAppiglio(maschera, mare, a).length)) return null;
  let decor = decorazioni(s, sup, mare, [...sx, ...dx], appigli);
  if (specchiata) {
    specchiaMaschera(maschera);
    const sp = (p: Punto): Punto => ({ x: W - 1 - p.x, y: p.y });
    sx = sx.map(sp);
    dx = dx.map(sp);
    decor = decor.map((d) => ({ ...d, x: W - 1 - d.x, specchio: !d.specchio })).reverse();
    barili = barili.map((b) => ({ x: W - 1 - b.x, y: b.y })).reverse();
    appigli = appigli.map((a) => ({ ...a, x: W - 1 - a.x })).reverse();
  }
  // lato 0 (attaccante) = il gruppo scelto a sinistra; con lo specchio finisce a destra.
  // Ordine: dal più interno al più esterno. La sim usa i primi N posti, quindi con meno di 5 pirati
  // restano liberi i posti vicini al mare (Lead design: chi parte sul bordo non deve essere condannato).
  const dentroPrima = (a: Punto, b: Punto) => Math.abs(a.x - W / 2) - Math.abs(b.x - W / 2);
  sx.sort(dentroPrima);
  dx.sort(dentroPrima);
  return {
    terreno: { w: W, h: MONDO.h, maschera, mare },
    spawn: [sx, dx],
    bioma: r.bioma,
    variante: r.variante,
    semeUsato: seme,
    tentativi: 1,
    specchiata,
    decorazioni: decor,
    barili,
    appigli,
  };
}

export function generaMappa(r: RichiestaMappa): MappaGenerata {
  return conTentativi(r, (seme) => tentativo(seme, r));
}
