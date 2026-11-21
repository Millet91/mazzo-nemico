// API pubblica dell'IA di battaglia: CONTRATTO CONGELATO dal Lead (M1).
// L'agente IA (E, ramo claude/m1-ia) sostituisce l'implementazione; le firme non cambiano.
// ⚠ IMPLEMENTAZIONE SEGNAPOSTO: mira a caso verso il nemico più vicino, senza Web Worker.
//
// - `decidi` è puro e deterministico: usa un PRNG proprio con seme = stato.rng ^ numero del turno, MAI lo
//   stato.rng della battaglia (l'IA non deve cambiare la sim) e MAI Math.random.
// - `creaIa` restituisce il client usato dal ciclo di gioco (B). Quello vero gira in un Web Worker
//   (05 n. 19, 00 §1.5): `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`.
//   Il client clona lo stato (structuredClone) e restituisce una Promise.

import type { LivelloIa, PianoIa, StatoBattaglia } from '../../core/tipi';
import { daGradi } from '../../core/trig';

/** Sceglie il tiro del pirata attivo (squadra di turno) al livello dato. Non muta `s`. */
export function decidi(s: StatoBattaglia, livello: LivelloIa): PianoIa {
  void livello;
  const io = s.pirati.find((p) => p.id === s.turno.pirata)!;
  const nemici = s.pirati.filter((p) => p.squadra !== io.squadra && p.stato === 'vivo');
  const bersaglio = nemici.sort((a, b) => Math.abs(a.x - io.x) - Math.abs(b.x - io.x))[0];
  const aDestra = !bersaglio || bersaglio.x > io.x;
  return { arma: 'cannone', mezziGradi: daGradi(aDestra ? 45 : 135), potenza: 70, fuga: 0, punteggio: 0 };
}

export interface ClientIa {
  /** chiede il piano per il turno corrente; la Promise si risolve quando l'IA ha finito di pensare */
  pensa(s: StatoBattaglia, livello: LivelloIa): Promise<PianoIa>;
  /** chiude il worker (uscita dalla battaglia) */
  chiudi(): void;
}

export function creaIa(): ClientIa {
  return {
    pensa: (s, livello) => Promise.resolve(decidi(s, livello)),
    chiudi() {},
  };
}
