// API pubblica dell'IA di battaglia: CONTRATTO CONGELATO dal Lead (M1). Le firme non cambiano.
// Implementazione: agente IA (E, ramo claude/m1-ia). Il cervello sta in pianifica.ts, il Web Worker in worker.ts.
//
// - `decidi` è puro e deterministico: usa un PRNG proprio con seme = stato.rng ^ numero del turno, MAI lo
//   stato.rng della battaglia (l'IA non deve cambiare la sim) e MAI Math.random.
// - `creaIa` restituisce il client usato dal ciclo di gioco (B). Gira in un Web Worker (05 n. 19, 00 §1.5);
//   dove i Worker non esistono (test su Node) o se il worker si rompe, calcola sul posto con lo stesso risultato.
//   Lo stato arriva al worker clonato da postMessage (una sola copia completa): l'originale non si tocca.
//   Se il worker non risponde entro TEMPO_MASSIMO_MS (3 s), si calcola sul posto con lo stesso risultato.
//
// Cosa fa il ciclo di gioco con il PianoIa (accordo con B):
//   `camminata` (assente per il Mozzo) → cammina `tick` tick in `dir`; poi `arma`, `miccia` se c'è,
//   `mira` (mezziGradi, potenza) con l'animazione del cursore, `fuoco`; nella fase di fuga `muovi(fuga)` per
//   tutta la fuga (la strada è già controllata dall'IA: niente mare né dirupi per 3 s di camminata).

import type { LivelloIa, PianoIa, StatoBattaglia } from '../../core/tipi';
import { simulaColpo } from '../sim';
import { decidiCon } from './pianifica';

/** Sceglie il tiro del pirata attivo (squadra di turno) al livello dato. Non muta `s`. */
export function decidi(s: StatoBattaglia, livello: LivelloIa): PianoIa {
  return decidiCon(s, livello, simulaColpo);
}

export interface ClientIa {
  /** chiede il piano per il turno corrente; la Promise si risolve quando l'IA ha finito di pensare */
  pensa(s: StatoBattaglia, livello: LivelloIa): Promise<PianoIa>;
  /** chiude il worker (uscita dalla battaglia) */
  chiudi(): void;
}

/** Messaggi tra client e worker. */
export interface RichiestaWorker { id: number; stato: StatoBattaglia; livello: LivelloIa }
export type RispostaWorker = { id: number; piano: PianoIa } | { id: number; errore: string };

export function creaIa(): ClientIa {
  let worker: Worker | null = null;
  if (typeof Worker !== 'undefined') {
    try {
      worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
  }
  if (!worker) return clientLocale();

  let prossimo = 1;
  const attese = new Map<number, { stato: StatoBattaglia; livello: LivelloIa; ok: (p: PianoIa) => void; timer: ReturnType<typeof setTimeout> }>();
  const risolvi = (id: number, piano?: PianoIa) => {
    const a = attese.get(id);
    if (!a) return;
    attese.delete(id);
    clearTimeout(a.timer);
    a.ok(piano ?? decidi(a.stato, a.livello));
  };
  const ripiega = () => {
    // il worker non risponde più: si calcola sul posto (stesso risultato, solo sul thread principale)
    worker?.terminate();
    worker = null;
    for (const id of [...attese.keys()]) risolvi(id);
  };
  worker.onmessage = (e: MessageEvent<RispostaWorker>) => risolvi(e.data.id, 'piano' in e.data ? e.data.piano : undefined);
  worker.onerror = (e) => { e.preventDefault(); ripiega(); };

  return {
    pensa(s, livello) {
      if (!worker) return Promise.resolve(decidi(s, livello));
      const id = prossimo++;
      return new Promise<PianoIa>((ok) => {
        // una sola copia completa: quella di postMessage. Per il ripiego basta una fotografia senza maschera:
        // mentre l'IA pensa (fase 'azione', prima dello sparo) la maschera non cambia, quindi si tiene il riferimento.
        const foto = fotografia(s);
        const timer = setTimeout(ripiega, TEMPO_MASSIMO_MS);
        attese.set(id, { stato: foto, livello, ok, timer });
        worker!.postMessage({ id, stato: s, livello } satisfies RichiestaWorker);
      });
    },
    chiudi() {
      worker?.terminate();
      worker = null;
      for (const a of attese.values()) clearTimeout(a.timer);
      attese.clear();
    },
  };
}

/** Dopo questo tempo senza risposta il worker si considera bloccato e si calcola sul posto. */
export const TEMPO_MASSIMO_MS = 3000;

/** Copia dello stato senza ricopiare la maschera (2 MB): stesso piano di `decidi` sull'originale. */
export function fotografia(s: StatoBattaglia): StatoBattaglia {
  const { maschera } = s.terreno;
  const copia: StatoBattaglia = structuredClone({ ...s, terreno: { ...s.terreno, maschera: new Uint8Array(0) } });
  copia.terreno.maschera = maschera;
  return copia;
}

function clientLocale(): ClientIa {
  return {
    pensa: (s, livello) => Promise.resolve(decidi(s, livello)),
    chiudi() {},
  };
}
