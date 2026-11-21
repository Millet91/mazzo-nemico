// Aiuti per i test della sim (agente Fisica): mappe costruite a mano e battaglie pronte da manipolare.
// I numeri di gioco si leggono da BIL e ARMA; qui ci sono solo le geometrie delle prove.
import type { ConfigBattaglia, EventoBattaglia, IdArma, IdCiurma, MappaGenerata, Pirata, Punto, StatoBattaglia, Terreno } from '../../src/core/tipi';
import { MATERIALE, VERSIONE_REGOLE } from '../../src/core/tipi';
import { BIL } from '../../src/contenuti/bilanciamento';
import { avanzaTick, creaBattaglia, eseguiComando } from '../../src/battaglia/sim';

export const W = BIL.mondo.larghezza;
export const H = BIL.mondo.altezza;
/** quota del suolo delle mappe piatte di prova */
export const SUOLO = 600;

/** Terreno vuoto (aria) con il fondale di ferro e il mare iniziale. */
export function terrenoVuoto(): Terreno {
  const maschera = new Uint8Array(W * H);
  for (let y = BIL.mondo.inizioFondale; y < H; y++) maschera.fill(MATERIALE.ferro, y * W, (y + 1) * W);
  return { w: W, h: H, maschera, mare: BIL.mondo.mareIniziale };
}

/** Riempie il rettangolo [x0, x1) × [y0, y1) con un materiale. */
export function rettangolo(t: Terreno, x0: number, y0: number, x1: number, y1: number, m: number): void {
  for (let y = Math.max(0, y0); y < Math.min(t.h, y1); y++) t.maschera.fill(m, y * t.w + Math.max(0, x0), y * t.w + Math.min(t.w, x1));
}

/** Terreno piatto: dal suolo in giù `materiale` (sabbia di default) da x0 a x1. */
export function terrenoPiatto(materiale: number = MATERIALE.sabbia, x0 = 100, x1 = W - 100, suolo = SUOLO): Terreno {
  const t = terrenoVuoto();
  rettangolo(t, x0, suolo, x1, BIL.mondo.inizioFondale, materiale);
  return t;
}

export function mappa(t: Terreno, spawn0: Punto[], spawn1: Punto[]): MappaGenerata {
  return { terreno: t, spawn: [spawn0, spawn1], bioma: 'isola', semeUsato: 1, tentativi: 1, specchiata: false, decorazioni: [] };
}

export function config(n0: number, n1: number, opz: { ciurme?: [IdCiurma, IdCiurma]; seme?: number } = {}): ConfigBattaglia {
  const [c0, c1] = opz.ciurme ?? ['teschio', 'marina'];
  return {
    versioneRegole: VERSIONE_REGOLE, seme: opz.seme ?? 1234, bioma: 'isola',
    squadre: [
      { ciurma: c0, ruolo: 'attaccante', controllo: 'umano', pirati: n0 },
      { ciurma: c1, ruolo: 'difensore', controllo: 'ia', livelloIa: 'mozzo', pirati: n1 },
    ],
    timerSecondi: BIL.turno.timerMozzo, traiettoriaCompleta: true,
  };
}

/** Battaglia su terreno piatto con i pirati alle x date (piedi sul suolo). */
export function battagliaPiatta(x0: number[], x1: number[], opz: { terreno?: Terreno; ciurme?: [IdCiurma, IdCiurma]; seme?: number } = {}): StatoBattaglia {
  const t = opz.terreno ?? terrenoPiatto();
  const piedi = (x: number) => ({ x, y: SUOLO });
  return creaBattaglia(config(x0.length, x1.length, opz), mappa(t, x0.map(piedi), x1.map(piedi)));
}

/** Avanza n tick e restituisce gli eventi. */
export function avanza(s: StatoBattaglia, n: number): EventoBattaglia[] {
  const ev: EventoBattaglia[] = [];
  for (let i = 0; i < n && !s.esito; i++) avanzaTick(s, ev);
  return ev;
}

/** Avanza finché `cond` diventa vera (al massimo `max` tick). Restituisce gli eventi. */
export function avanzaFinche(s: StatoBattaglia, cond: (s: StatoBattaglia) => boolean, max = 20000): EventoBattaglia[] {
  const ev: EventoBattaglia[] = [];
  for (let i = 0; i < max && !cond(s); i++) avanzaTick(s, ev);
  return ev;
}

/** Porta il turno in fase 'azione'. */
export function inAzione(s: StatoBattaglia): EventoBattaglia[] {
  return avanzaFinche(s, (x) => x.turno.fase === 'azione' || x.esito !== null);
}

/** Pirata attivo, oppure il pirata con quell'id. */
export function pirata(s: StatoBattaglia, id?: number): Pirata {
  return s.pirati.find((p) => p.id === (id ?? s.turno.pirata))!;
}

/** Il pirata è fermo a terra su terreno piatto con i piedi sul suolo? */
export function suiPiedi(p: Pirata, suolo = SUOLO): boolean {
  return p.aTerra && Math.floor(p.y) + BIL.pirata.capsulaAltezza / 2 === suolo;
}

/** Spara con l'arma, l'angolo (gradi) e la potenza dati dal pirata attivo. */
export function spara(s: StatoBattaglia, arma: IdArma, mezziGradi: number, potenza = 60): void {
  eseguiComando(s, { t: 'arma', arma });
  eseguiComando(s, { t: 'mira', mezziGradi, potenza });
  eseguiComando(s, { t: 'fuoco' });
}

export function eventiDi<T extends EventoBattaglia['t']>(ev: EventoBattaglia[], t: T): Extract<EventoBattaglia, { t: T }>[] {
  return ev.filter((e): e is Extract<EventoBattaglia, { t: T }> => e.t === t);
}
