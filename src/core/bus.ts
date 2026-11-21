// Bus tra motore e UI (04 §3): il motore scrive in questi signal, la UI li legge; la UI non tocca Pixi e il motore
// non importa Preact. Si usa @preact/signals-core, che non dipende da Preact.
// Contratto congelato dal Lead Tecnico all'inizio di ogni milestone.
import { signal } from '@preact/signals-core';

export interface StatFps { medio: number; minimo: number }

export const bus = {
  /** l'app è in background: il rendering e (da M1) la simulazione sono fermi */
  inPausa: signal(false),
  /** statistiche FPS sugli ultimi 60 s, aggiornate una volta al secondo */
  fps: signal<StatFps>({ medio: 0, minimo: 0 }),
  /** contatore FPS visibile (impostazione nascosta: 5 tocchi sulla versione in Info) */
  mostraFps: signal(false),
  /** esito del controllo WebGL2 fatto all'avvio */
  webgl2: signal<{ ok: boolean; renderer: string }>({ ok: true, renderer: '' }),
  /** errore di avvio della grafica, da mostrare al giocatore ('' = nessuno) */
  erroreGrafica: signal(''),
};
