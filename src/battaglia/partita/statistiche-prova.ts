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
  /**
   * Tempo di disegno per frame in ms (scena + Pixi sulla CPU, senza la sim; budget 8 ms, P1-contratti §1), su
   * tutta la prova e per fascia di zoom: 'normale' = attorno al predefinito 1,4, 'minimo' = zoom ≤ 0,6. Esclusi i
   * secondi di caricamento.
   */
  msDisegnoMedio: number;
  msDisegnoPeggiore: number;
  disegno: { tutti: MisuraDisegno; zoomNormale: MisuraDisegno; zoomMinimo: MisuraDisegno };
  /** risoluzione del canvas alla fine della prova (2, 1,5 o 1,25: render/risoluzione.ts); 0 se non nota */
  risoluzione: number;
}

export interface MisuraDisegno { medio: number; p95: number; peggiore: number; frame: number }

/** un frame di disegno: ms e zoom della camera */
export interface FrameDisegno { ms: number; zoom: number; secondo: number }

/** fasce di zoom della misura del disegno */
export const ZOOM_NORMALE: readonly [number, number] = [1.2, 1.6];
export const ZOOM_MINIMO = 0.6;

const arrotonda = (x: number) => Math.round(x * 100) / 100;

export function misuraDisegno(ms: readonly number[]): MisuraDisegno {
  if (!ms.length) return { medio: 0, p95: 0, peggiore: 0, frame: 0 };
  const s = [...ms].sort((a, b) => a - b);
  return {
    medio: arrotonda(s.reduce((a, b) => a + b, 0) / s.length),
    p95: arrotonda(s[Math.min(s.length - 1, Math.floor(s.length * 0.95))]),
    peggiore: arrotonda(s[s.length - 1]),
    frame: s.length,
  };
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
  /** risoluzione del canvas alla fine */
  risoluzione?: number;
  /** tempo di disegno di ogni frame (facoltativo: le prove vecchie non l'hanno) */
  disegno?: readonly FrameDisegno[];
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
  const disegno = (d.disegno ?? []).filter((f) => !d.secondiAvvio.has(f.secondo));
  const tutti = misuraDisegno(disegno.map((f) => f.ms));
  return {
    msDisegnoMedio: tutti.medio,
    msDisegnoPeggiore: tutti.peggiore,
    disegno: {
      tutti,
      zoomNormale: misuraDisegno(disegno.filter((f) => f.zoom >= ZOOM_NORMALE[0] && f.zoom <= ZOOM_NORMALE[1]).map((f) => f.ms)),
      zoomMinimo: misuraDisegno(disegno.filter((f) => f.zoom <= ZOOM_MINIMO).map((f) => f.ms)),
    },
    risoluzione: d.risoluzione ?? 0,
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
export function configProva(seme: number, mappaFissa?: string): ConfigBattaglia {
  return {
    versioneRegole: 1, seme, bioma: 'isola', timerSecondi: 20, traiettoriaCompleta: false,
    ...(mappaFissa ? { mappaFissa } : {}),
    squadre: [
      { ciurma: 'teschio', ruolo: 'attaccante', controllo: 'ia', livelloIa: 'mozzo', pirati: 5 },
      { ciurma: 'marina', ruolo: 'difensore', controllo: 'ia', livelloIa: 'mozzo', pirati: 5 },
    ],
  };
}
