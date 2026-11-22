// Strumenti della musica segnaposto (08 §1: "shanty moderno"): fisarmonica, pizzicato, basso e percussioni,
// tutti sintetizzati. Li usa il sequencer (musica.ts) dal vivo e le ricette dei jingle di fine battaglia.
import { rumoreBianco } from './sintesi';

export type Strumento = 'basso' | 'pizzico' | 'fisa' | 'cassa' | 'rullante' | 'mani' | 'sonaglio' | 'tamburo';

export const hz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

const onde = new WeakMap<BaseAudioContext, PeriodicWave>();
/** Onda a impulso stretto (25%): il suono nasale dell'ancia di una fisarmonica. */
function ancia(ctx: BaseAudioContext): PeriodicWave {
  let w = onde.get(ctx);
  if (!w) {
    const n = 24;
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
    w = ctx.createPeriodicWave(re, im);
    onde.set(ctx, w);
  }
  return w;
}

const ZERO = 0.0001;

function colpoRumore(ctx: BaseAudioContext, dest: AudioNode, t: number, o: { tipo: BiquadFilterType; hz: number; q: number; durata: number; vol: number }): void {
  const src = ctx.createBufferSource();
  src.buffer = rumoreBianco(ctx);
  const f = ctx.createBiquadFilter();
  f.type = o.tipo;
  f.frequency.value = o.hz;
  f.Q.value = o.q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(o.vol, t);
  g.gain.exponentialRampToValueAtTime(ZERO, t + o.durata);
  src.connect(f).connect(g).connect(dest);
  src.start(t, (t * 7.13) % 1.5);
  src.stop(t + o.durata + 0.02);
}

function colpoTono(ctx: BaseAudioContext, dest: AudioNode, t: number, da: number, a: number, durata: number, vol: number, tipo: OscillatorType = 'sine'): void {
  const osc = ctx.createOscillator();
  osc.type = tipo;
  osc.frequency.setValueAtTime(da, t);
  osc.frequency.exponentialRampToValueAtTime(a, t + durata);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(ZERO, t + durata);
  osc.connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + durata + 0.02);
}

export interface OpzNota {
  /** la nota "si sgonfia": scende di tanti cent lungo la durata (jingle di sconfitta) */
  cala?: number;
}

/** Suona una nota. `t` e `durata` in secondi, `midi` = altezza (ignorata dalle percussioni), `vol` 0..1. */
export function suonaNota(ctx: BaseAudioContext, dest: AudioNode, s: Strumento, midi: number, t: number, durata: number, vol: number, o: OpzNota = {}): void {
  const f = hz(midi);
  switch (s) {
    case 'basso': {
      // rotondo, mai sotto i 60 Hz (il telefono non li riproduce): triangolo più un'ottava sopra che lo fa sentire
      const d = Math.max(0.18, durata);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      const g = ctx.createGain();
      g.gain.setValueAtTime(ZERO, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(vol * 0.5, t + d * 0.6);
      g.gain.exponentialRampToValueAtTime(ZERO, t + d);
      lp.connect(g).connect(dest);
      for (const [mult, peso, tipo] of [[1, 0.7, 'triangle'], [1, 0.22, 'sawtooth'], [2, 0.3, 'sine']] as const) {
        const osc = ctx.createOscillator();
        osc.type = tipo;
        osc.frequency.value = f * mult;
        const go = ctx.createGain();
        go.gain.value = peso;
        osc.connect(go).connect(lp);
        osc.start(t);
        osc.stop(t + d + 0.02);
      }
      break;
    }
    case 'pizzico': {
      // corda pizzicata (ukulele, mandolino): attacco secco, filtro che si chiude subito
      const d = 0.32;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      // il filtro che si chiude si ricalcola una volta per blocco, non a ogni campione: dal vivo costa molto meno
      lp.frequency.automationRate = 'k-rate';
      lp.frequency.setValueAtTime(Math.min(6000, f * 8), t);
      lp.frequency.exponentialRampToValueAtTime(Math.max(500, f * 1.5), t + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(ZERO, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.003);
      g.gain.exponentialRampToValueAtTime(ZERO, t + d);
      lp.connect(g).connect(dest);
      for (const [mult, peso, tipo] of [[1, 1, 'triangle'], [1, 0.35, 'sawtooth']] as const) {
        const osc = ctx.createOscillator();
        osc.type = tipo;
        osc.frequency.value = f * mult;
        const go = ctx.createGain();
        go.gain.value = peso;
        osc.connect(go).connect(lp);
        osc.start(t);
        osc.stop(t + d + 0.02);
      }
      break;
    }
    case 'fisa': {
      // due ance appena scordate tra loro: il "battimento" della fisarmonica
      const rilascio = 0.07;
      const fine = t + durata + rilascio;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2600;
      const g = ctx.createGain();
      g.gain.setValueAtTime(ZERO, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.035);
      g.gain.setValueAtTime(vol, t + Math.max(0.04, durata));
      g.gain.exponentialRampToValueAtTime(ZERO, fine);
      lp.connect(g).connect(dest);
      for (const cent of [-7, 7]) {
        const osc = ctx.createOscillator();
        osc.setPeriodicWave(ancia(ctx));
        osc.frequency.value = f;
        osc.detune.setValueAtTime(cent, t);
        if (o.cala) osc.detune.linearRampToValueAtTime(cent - o.cala, t + durata);
        osc.connect(lp);
        osc.start(t);
        osc.stop(fine + 0.02);
      }
      break;
    }
    case 'cassa':
      colpoTono(ctx, dest, t, 150, 55, 0.16, vol);
      colpoRumore(ctx, dest, t, { tipo: 'lowpass', hz: 1800, q: 0.7, durata: 0.02, vol: vol * 0.4 });
      break;
    case 'rullante':
      colpoRumore(ctx, dest, t, { tipo: 'bandpass', hz: 2100, q: 0.8, durata: 0.11, vol });
      colpoTono(ctx, dest, t, 210, 170, 0.06, vol * 0.5, 'triangle');
      break;
    case 'mani':
      // battito di mani: tre schiocchi vicinissimi
      for (const dt of [0, 0.011, 0.024]) colpoRumore(ctx, dest, t + dt, { tipo: 'bandpass', hz: 1300, q: 1.6, durata: dt === 0.024 ? 0.1 : 0.02, vol });
      break;
    case 'sonaglio':
      colpoRumore(ctx, dest, t, { tipo: 'highpass', hz: 5200, q: 0.7, durata: 0.04, vol });
      break;
    case 'tamburo':
      // tamburo a cornice: pelle bassa e morbida
      colpoTono(ctx, dest, t, 125, 82, 0.2, vol);
      colpoRumore(ctx, dest, t, { tipo: 'lowpass', hz: 700, q: 0.7, durata: 0.06, vol: vol * 0.5 });
      break;
  }
}
