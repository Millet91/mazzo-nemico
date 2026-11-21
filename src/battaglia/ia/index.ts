// API pubblica dell'IA di battaglia: CONTRATTO CONGELATO dal Lead (M1). Le firme non cambiano.
// Implementazione: agente IA (E, ramo claude/m1-ia). Il cervello sta in pianifica.ts, il Web Worker in worker.ts.
//
// - `decidi` è puro e deterministico: usa un PRNG proprio con seme = stato.rng ^ numero del turno, MAI lo
//   stato.rng della battaglia (l'IA non deve cambiare la sim) e MAI Math.random.
// - `creaIa` restituisce il client usato dal ciclo di gioco (B). Gira in un Web Worker (05 n. 19, 00 §1.5);
//   dove i Worker non esistono (test su Node) o se il worker si rompe, calcola sul posto con lo stesso risultato.
//   Lo stato arriva al worker clonato da postMessage (structured clone): l'originale non si tocca.
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
  const attese = new Map<number, { stato: StatoBattaglia; livello: LivelloIa; ok: (p: PianoIa) => void }>();
  const ripiega = () => {
    // il worker non risponde più: si calcola sul posto (stesso risultato, solo sul thread principale)
    worker?.terminate();
    worker = null;
    for (const [id, a] of attese) { attese.delete(id); a.ok(decidi(a.stato, a.livello)); }
  };
  worker.onmessage = (e: MessageEvent<RispostaWorker>) => {
    const a = attese.get(e.data.id);
    if (!a) return;
    attese.delete(e.data.id);
    if ('piano' in e.data) a.ok(e.data.piano);
    else a.ok(decidi(a.stato, a.livello));
  };
  worker.onerror = (e) => { e.preventDefault(); ripiega(); };

  return {
    pensa(s, livello) {
      if (!worker) return Promise.resolve(decidi(s, livello));
      const id = prossimo++;
      // copia per un eventuale ripiego: lo stato della battaglia intanto va avanti
      const copia = structuredClone(s);
      return new Promise<PianoIa>((ok) => {
        attese.set(id, { stato: copia, livello, ok });
        worker!.postMessage({ id, stato: copia, livello } satisfies RichiestaWorker);
      });
    },
    chiudi() {
      worker?.terminate();
      worker = null;
      attese.clear();
    },
  };
}

function clientLocale(): ClientIa {
  return {
    pensa: (s, livello) => Promise.resolve(decidi(s, livello)),
    chiudi() {},
  };
}
