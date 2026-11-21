// Conti della "Prova 60 fps" (piano QA §4), separati dal regista per provarli in Node.
// Note del QA (21/11/2026): i secondi in cui nasce una battaglia nuova (mappa e texture del terreno) non
// contano per il minimo, si riportano a parte; la frequenza dello schermo si stima dal delta mediano
// (il Pixel 6 va a 90 Hz, o a 60 in risparmio energetico); msSimPerTick è una somma su migliaia di tick.

import type { ConfigBattaglia } from '../../core/tipi';

export interface RisultatoProvaFps {
  /** fps medio sull'intera prova */
  fpsMedio: number;
  /** fps del secondo peggiore, esclusi i secondi di caricamento */
  fpsMinimo: number;
  /** frame più lunghi di 20 ms */
  frameLenti: number;
  /** frame totali */
  frame: number;
  /** ms medi della simulazione per tick */
  msSimPerTick: number;
  /** durata reale della prova in secondi */
  secondi: number;
  /** frequenza dello schermo stimata dal delta mediano (Hz): 90 sul Pixel 6, 60 in risparmio energetico */
  hzSchermo: number;
  /** secondi esclusi dal minimo perché dentro c'era l'avvio di una battaglia */
  secondiCaricamento: number;
}

export interface DatiProva {
  /** frame contati in ogni secondo intero dall'inizio */
  perSecondo: number[];
  /** secondi (indici di perSecondo) in cui è partita una battaglia */
  secondiAvvio: Set<number>;
  /** durata di ogni frame in ms */
  delta: number[];
  msSim: number;
  tick: number;
  /** durata della prova in ms */
  durataMs: number;
}

export function mediana(xs: readonly number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Frequenze tipiche degli schermi: il delta mediano si arrotonda alla più vicina. */
const FREQUENZE = [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165];

export function calcolaRisultato(d: DatiProva): RisultatoProvaFps {
  const secondi = d.durataMs / 1000;
  const frame = d.delta.length;
  const completi = Math.floor(secondi);
  const validi: number[] = [];
  for (let i = 0; i < completi; i++) if (!d.secondiAvvio.has(i)) validi.push(d.perSecondo[i] ?? 0);
  const med = mediana(d.delta);
  const hz = med > 0 ? 1000 / med : 0;
  const hzSchermo = hz ? FREQUENZE.reduce((a, b) => (Math.abs(b - hz) < Math.abs(a - hz) ? b : a)) : 0;
  return {
    fpsMedio: secondi > 0 ? Math.round((frame / secondi) * 10) / 10 : 0,
    fpsMinimo: validi.length ? Math.min(...validi) : frame,
    frameLenti: d.delta.filter((x) => x > 20).length,
    frame,
    msSimPerTick: d.tick ? Math.round((d.msSim / d.tick) * 1000) / 1000 : 0,
    secondi: Math.round(secondi * 10) / 10,
    hzSchermo,
    secondiCaricamento: [...d.secondiAvvio].filter((s) => s < completi).length,
  };
}

/** Battaglia della prova: 5 contro 5, IA Mozzo contro IA Mozzo, seme fisso. */
export function configProva(seme: number): ConfigBattaglia {
  return {
    versioneRegole: 1, seme, bioma: 'isola', timerSecondi: 20, traiettoriaCompleta: false,
    squadre: [
      { ciurma: 'teschio', ruolo: 'attaccante', controllo: 'ia', livelloIa: 'mozzo', pirati: 5 },
      { ciurma: 'marina', ruolo: 'difensore', controllo: 'ia', livelloIa: 'mozzo', pirati: 5 },
    ],
  };
}
