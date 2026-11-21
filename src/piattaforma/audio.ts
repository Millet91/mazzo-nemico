// Suoni segnaposto (m1-ritmo §7): sintetizzati con WebAudio, niente file. Al massimo 15 suoni.
// Si sostituiranno con i campioni di 08 (registro SOUNDS) senza cambiare i nomi.
// Autorizzato dal Lead per l'agente HUD (D) il 21/11/2026.

export type Suono =
  | 'sparo' | 'esplosione1' | 'esplosione2' | 'esplosione3' | 'splash' | 'rimbalzo' | 'tocco' | 'tictac'
  | 'vittoria' | 'sconfitta' | 'salto' | 'cassa' | 'rum' | 'danno';

export const SUONI: readonly Suono[] = [
  'sparo', 'esplosione1', 'esplosione2', 'esplosione3', 'splash', 'rimbalzo', 'tocco', 'tictac',
  'vittoria', 'sconfitta', 'salto', 'cassa', 'rum', 'danno',
];

let ctx: AudioContext | null = null;
let uscita: GainNode | null = null;
let volume = 0.8;
let rumore: AudioBuffer | null = null;

function contesto(): AudioContext | null {
  if (ctx) return ctx;
  const C = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  try {
    ctx = new C();
    uscita = ctx.createGain();
    uscita.gain.value = volume;
    uscita.connect(ctx.destination);
    // 1 s di rumore bianco riusato da esplosioni e splash
    rumore = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = rumore.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch { ctx = null; }
  return ctx;
}

/** Volume generale 0..1 (Impostazioni). */
export function impostaVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v));
  if (uscita && ctx) uscita.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
}
export function volumeAttuale(): number { return volume; }

/** I browser e la WebView avviano l'audio solo dopo un tocco: si chiama dal primo gesto. */
export function sbloccaAudio(): void {
  const c = contesto();
  if (c && c.state === 'suspended') void c.resume().catch(() => {});
}

function tono(c: AudioContext, o: { tipo: OscillatorType; da: number; a?: number; t0?: number; durata: number; vol: number }) {
  const t = c.currentTime + (o.t0 ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.tipo;
  osc.frequency.setValueAtTime(o.da, t);
  if (o.a) osc.frequency.exponentialRampToValueAtTime(o.a, t + o.durata);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.durata);
  osc.connect(g).connect(uscita!);
  osc.start(t);
  osc.stop(t + o.durata + 0.02);
}

function soffio(c: AudioContext, o: { durata: number; vol: number; filtro: number; filtroFine?: number; tipo?: BiquadFilterType; t0?: number }) {
  if (!rumore) return;
  const t = c.currentTime + (o.t0 ?? 0);
  const src = c.createBufferSource();
  src.buffer = rumore;
  const f = c.createBiquadFilter();
  f.type = o.tipo ?? 'lowpass';
  f.frequency.setValueAtTime(o.filtro, t);
  if (o.filtroFine) f.frequency.exponentialRampToValueAtTime(o.filtroFine, t + o.durata);
  const g = c.createGain();
  g.gain.setValueAtTime(o.vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.durata);
  src.connect(f).connect(g).connect(uscita!);
  src.start(t, Math.random() * 0.4);
  src.stop(t + o.durata + 0.02);
}

/** Suona un effetto. Non fa niente se l'audio non c'è, è muto o non è ancora sbloccato. */
export function suona(s: Suono): void {
  if (volume <= 0) return;
  const c = contesto();
  if (!c || c.state !== 'running' || !uscita) return;
  switch (s) {
    case 'sparo':
      soffio(c, { durata: 0.18, vol: 0.7, filtro: 2500, filtroFine: 300 });
      tono(c, { tipo: 'triangle', da: 160, a: 50, durata: 0.2, vol: 0.6 });
      break;
    case 'esplosione1': case 'esplosione2': case 'esplosione3': {
      const k = s === 'esplosione1' ? 1 : s === 'esplosione2' ? 0.8 : 1.25;
      soffio(c, { durata: 0.9 * k, vol: 0.9, filtro: 1400 / k, filtroFine: 80 });
      tono(c, { tipo: 'sine', da: 90 / k, a: 30, durata: 0.6 * k, vol: 0.8 });
      break;
    }
    case 'splash':
      soffio(c, { durata: 0.6, vol: 0.5, filtro: 600, filtroFine: 3000, tipo: 'bandpass' });
      break;
    case 'rimbalzo':
      tono(c, { tipo: 'sine', da: 420, a: 220, durata: 0.08, vol: 0.4 });
      break;
    case 'tocco':
      tono(c, { tipo: 'sine', da: 880, durata: 0.04, vol: 0.15 });
      break;
    case 'tictac':
      tono(c, { tipo: 'square', da: 1500, durata: 0.03, vol: 0.12 });
      break;
    case 'salto':
      tono(c, { tipo: 'sine', da: 300, a: 600, durata: 0.12, vol: 0.2 });
      break;
    case 'danno':
      tono(c, { tipo: 'sawtooth', da: 220, a: 110, durata: 0.12, vol: 0.18 });
      break;
    case 'cassa':
      tono(c, { tipo: 'triangle', da: 660, durata: 0.1, vol: 0.3 });
      tono(c, { tipo: 'triangle', da: 990, t0: 0.1, durata: 0.15, vol: 0.3 });
      break;
    case 'rum':
      [523, 659, 784].forEach((f, i) => tono(c, { tipo: 'sine', da: f, t0: i * 0.07, durata: 0.18, vol: 0.3 }));
      break;
    case 'vittoria':
      [523, 659, 784, 1047].forEach((f, i) => tono(c, { tipo: 'triangle', da: f, t0: i * 0.13, durata: i === 3 ? 0.6 : 0.16, vol: 0.4 }));
      break;
    case 'sconfitta':
      [392, 349, 311, 262].forEach((f, i) => tono(c, { tipo: 'triangle', da: f, t0: i * 0.18, durata: i === 3 ? 0.7 : 0.2, vol: 0.35 }));
      break;
  }
}
