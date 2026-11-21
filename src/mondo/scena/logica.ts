// Logica della scena del mondo senza Pixi né DOM (si prova con Vitest in tests/mondo-scena/).
// La scena è SOLO grafica: qui si decide cosa mostrare a partire da bus.carriera e dalle animazioni in coda,
// e quale isola sta sotto un tocco.
import type { AnimazioneMondo, DefCapitolo, IdIsola, Padrone, StatoCarriera } from '../../core/carriera';
import type { Punto } from '../../core/tipi';

/** Un'isola come la disegna la scena (del capitolo o Cala Pappagallo). */
export interface IsolaMappa { id: IdIsola; x: number; y: number; raggio: number; capitolo: number }

/** Cosa mostra la scena sopra un'isola. */
export interface VistaIsola {
  padrone: Padrone;
  pirati: number;
  /** icona del premio: tipo del primo premio, se l'isola non è ancora stata presa */
  premio: 'arma' | 'mossa' | 'recluta' | 'bandiera' | null;
}

/** raggio minimo di tocco in px CSS: diametro ≥ 56 px a ogni zoom (P2-contratti §3) */
export const TOCCO_MIN_PX = 28;

/** Immagine "a indici" letta una volta: rosso = (posizione in `ordine` + 1) × passo. */
export interface Indici { w: number; h: number; rossi: Uint8Array; scala: number; passo: number; ordine: IdIsola[] }

/**
 * Isola sotto il punto (px di mondo). Prima l'immagine a indici (forma vera della costa), poi, se si è in mare,
 * l'isola più vicina entro TOCCO_MIN_PX px CSS dal centro: così anche le isole piccole a zoom lontano si toccano.
 */
export function isolaInPunto(p: Punto, isole: IsolaMappa[], scala: number, indici: Indici | null): IdIsola | null {
  if (indici) {
    const ix = Math.floor(p.x / indici.scala), iy = Math.floor(p.y / indici.scala);
    if (ix >= 0 && iy >= 0 && ix < indici.w && iy < indici.h) {
      const k = Math.round(indici.rossi[iy * indici.w + ix] / indici.passo) - 1;
      const id = indici.ordine[k];
      if (id && isole.some((i) => i.id === id)) return id;
    }
  }
  let meglio: IdIsola | null = null;
  let dMin = Infinity;
  for (const i of isole) {
    const d = Math.hypot(p.x - i.x, p.y - i.y);
    const limite = Math.max(TOCCO_MIN_PX / scala, indici ? 0 : i.raggio * 1.15);
    if (d <= limite && d < dMin) { dMin = d; meglio = i.id; }
  }
  return meglio;
}

/** Isole il cui aspetto è "prenotato" da un'animazione non ancora finita: la scena non le riallinea allo stato. */
export function isoleBloccate(anim: readonly AnimazioneMondo[]): Set<IdIsola> {
  const s = new Set<IdIsola>();
  for (const a of anim) if (a.t === 'conquista' || a.t === 'perdita' || a.t === 'pirati') s.add(a.isola);
  return s;
}

/** Capitoli la cui nebbia si alzerà con un'animazione in coda: fino ad allora restano coperti. */
export function capitoliBloccati(anim: readonly AnimazioneMondo[]): Set<number> {
  const s = new Set<number>();
  for (const a of anim) if (a.t === 'nebbia') s.add(a.capitolo);
  return s;
}

/** Il veliero è già in viaggio o ci andrà: resta dov'era finché l'animazione non lo muove. */
export function viaggioInCoda(anim: readonly AnimazioneMondo[]): boolean {
  return anim.some((a) => a.t === 'viaggio');
}

/** Aspetto di un'isola del capitolo dallo stato salvato (o dai dati iniziali se lo stato non c'è ancora). */
export function vistaDaStato(cap: DefCapitolo, stato: StatoCarriera | null, id: IdIsola): VistaIsola | null {
  const def = cap.isole.find((i) => i.id === id);
  if (!def) return null;
  const s = stato?.isole[id];
  const padrone = s?.padrone ?? def.padroneIniziale;
  const pirati = s?.pirati ?? def.piratiIniziali;
  const presa = s?.presa ?? def.padroneIniziale === 'giocatore';
  const premio = !presa && def.premi.length ? def.premi[0].t : null;
  return { padrone, pirati, premio };
}

/** Capitoli senza nebbia: tutti quelli fino a quello in corso (il Prologo, 0, è sempre aperto). */
export function capitoliAperti(stato: StatoCarriera | null, bloccati: Set<number>): Set<number> {
  const cap = stato?.capitolo ?? 1;
  const s = new Set<number>([0]);
  for (let c = 1; c <= cap; c++) if (!bloccati.has(c)) s.add(c);
  return s;
}

/** Rotte del capitolo, una volta per coppia. */
export function rotte(cap: DefCapitolo): [IdIsola, IdIsola][] {
  const out: [IdIsola, IdIsola][] = [];
  for (const i of cap.isole) for (const a of i.adiacenti) if (i.id < a) out.push([i.id, a]);
  return out;
}

/** I segnaposti (pedine, cartelli, premi) crescono quando si allarga la vista, così restano leggibili. */
export function scalaSegni(scala: number): number {
  return Math.min(2.4, Math.max(1, 0.6 / scala));
}

/**
 * Sbuffi di nebbia su una griglia che copre la carta: ognuno appartiene al capitolo dell'isola più vicina se è
 * entro `vicino` px da essa, altrimenti al "mondo lontano" (capitolo 99, non si alza in P2). Vicino a Cala
 * Pappagallo (capitolo 0) non si mette nebbia.
 */
export function sbuffiNebbia(isole: IsolaMappa[], w: number, h: number, passo = 210, vicino = 300, seme = 7):
  { x: number; y: number; capitolo: number; s: number; r: number }[] {
  let a = seme >>> 0;
  const caso = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  const out: { x: number; y: number; capitolo: number; s: number; r: number }[] = [];
  for (let y = passo / 2; y < h + passo / 2; y += passo) {
    for (let x = passo / 2; x < w + passo / 2; x += passo) {
      const px = x + (caso() - 0.5) * passo * 0.6, py = y + (caso() - 0.5) * passo * 0.6;
      let capitolo = 99, dMin = Infinity;
      for (const i of isole) {
        const d = Math.hypot(px - i.x, py - i.y) - i.raggio;
        if (d < dMin) { dMin = d; capitolo = d < vicino ? i.capitolo : 99; }
      }
      // Cala Pappagallo resta scoperta (un cerchio attorno all'isola, non tutta la sua zona)
      const cala = isole.find((i) => i.capitolo === 0);
      if (cala && Math.hypot(px - cala.x, py - cala.y) < cala.raggio + 170) continue;
      if (capitolo === 0) capitolo = 99;
      out.push({ x: px, y: py, capitolo, s: 1.7 + caso() * 0.9, r: caso() * Math.PI * 2 });
    }
  }
  return out;
}
