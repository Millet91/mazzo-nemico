// Audio segnaposto sintetizzato con WebAudio (GDD §11). Ogni suono è un "cue" del registro SOUNDS:
// se in registry.ts un cue ha `sample`, si suona il file; altrimenti la ricetta sintetica qui sotto.
// Le difese suonano intonate (sinusoidi, campanelli), i nemici sporchi (rumore, onde quadre basse).

import { SOUNDS } from './registry';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.6;
let enabled = true;
let silentTick = false;
let reduced = false;
const MINOR = new Set(['pulse', 'step', 'enter', 'bell', 'ability', 'copy', 'coin', 'hit']);
let voices = 0;
const MAX_VOICES = 8;
const buffers: Record<string, AudioBuffer> = {};

// Dorico su re: ogni Passo ha una nota, Crocevia la più acuta, Uscio la più grave (GDD §11.2)
const SCALE = [587.33, 523.25, 493.88, 440, 392, 349.23, 329.63, 293.66];

export function setAudio(opts: { volume?: number; enabled?: boolean; silentTick?: boolean; reduced?: boolean }) {
  if (opts.reduced !== undefined) reduced = opts.reduced;
  if (opts.volume !== undefined) volume = opts.volume;
  if (opts.enabled !== undefined) enabled = opts.enabled;
  if (opts.silentTick !== undefined) silentTick = opts.silentTick;
  if (master) master.gain.value = enabled ? volume : 0;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const C = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, pan = 0, delay = 0, slide?: number) {
  const c = ac();
  if (!c || !master || voices >= MAX_VOICES) return;
  voices++;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  const p = c.createStereoPanner ? c.createStereoPanner() : null;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  if (p) { p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(master); } else g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
  o.onended = () => { voices = Math.max(0, voices - 1); };
}

function noise(dur: number, gain: number, filterFreq: number, delay = 0) {
  const c = ac();
  if (!c || !master || voices >= MAX_VOICES) return;
  voices++;
  const t = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (i * 1103515245 + 12345) % 2147483648 / 1073741824 - 1; // rumore deterministico
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t);
  src.onended = () => { voices = Math.max(0, voices - 1); };
}

async function playSample(url: string, vol = 1) {
  const c = ac();
  if (!c || !master) return;
  try {
    if (!buffers[url]) {
      const r = await fetch(url);
      buffers[url] = await c.decodeAudioData(await r.arrayBuffer());
    }
    const s = c.createBufferSource();
    s.buffer = buffers[url];
    const g = c.createGain();
    g.gain.value = vol;
    s.connect(g); g.connect(master);
    s.start();
  } catch { /* file mancante: silenzio */ }
}

/** Suona un cue. slot/L posizionano il suono nello stereo e nella scala dei Passi; combo alza la nota. */
export function sfx(cue: string, o: { slot?: number; L?: number; combo?: number } = {}) {
  if (!enabled) return;
  if (reduced && MINOR.has(cue)) return;
  const a = SOUNDS[cue];
  if (a?.sample) { void playSample(a.sample, a.volume); return; }
  const L = o.L ?? 5;
  const pan = o.slot !== undefined ? (o.slot / Math.max(1, L - 1)) * 2 - 1 : 0;
  const note = (i: number) => SCALE[Math.max(0, Math.min(SCALE.length - 1, i + (7 - L)))];
  const combo = o.combo ?? 0;
  switch (cue) {
    case 'rintocco': tone(196, 1.6, 'sine', 0.25); tone(392, 1.2, 'sine', 0.1, 0, 0.01); tone(589, 0.9, 'sine', 0.05, 0, 0.02); break;
    case 'pulse': if (!silentTick) tone(110, 0.08, 'triangle', 0.05); break;
    case 'step': tone(note(o.slot ?? 0) / 2, 0.12, 'triangle', 0.06, pan); break;
    case 'enter': noise(0.08, 0.06, 2000); tone(note(0) / 2, 0.1, 'triangle', 0.05, -1); break;
    case 'hit': tone(880 * Math.pow(2, Math.min(combo, 12) / 12), 0.14, 'sine', 0.09, pan); break;
    case 'block': noise(0.12, 0.12, 900, 0); tone(220, 0.15, 'square', 0.03, pan); break;
    case 'kill': tone(1046 * Math.pow(2, Math.min(combo, 12) / 12), 0.25, 'sine', 0.12, pan); tone(1568, 0.2, 'sine', 0.05, pan, 0.03); break;
    case 'impact': noise(0.35, 0.35, 300); tone(70, 0.4, 'sine', 0.35, 1, 0, 40); break;
    case 'steal': for (let i = 0; i < 4; i++) tone(1500 + i * 180, 0.06, 'square', 0.03, pan, i * 0.05); tone(659, 0.4, 'sine', 0.06, pan, 0.2, 610); break;
    case 'silence':
      if (master && ctx) { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(0.0001, t); master.gain.setValueAtTime(volume, t + 0.15); }
      break;
    case 'coin': tone(1318, 0.08, 'square', 0.03); tone(1760, 0.1, 'square', 0.03, 0, 0.05); break;
    case 'heal': tone(523, 0.3, 'sine', 0.06); tone(784, 0.3, 'sine', 0.05, 0, 0.08); break;
    case 'freeze': tone(2093, 0.3, 'sine', 0.05, pan, 0, 1568); break;
    case 'burn': noise(0.2, 0.06, 1200); break;
    case 'herald': tone(392, 0.2, 'sawtooth', 0.05); tone(523, 0.3, 'sawtooth', 0.05, 0, 0.12); break;
    case 'asso': tone(784, 0.15, 'sine', 0.08); tone(1175, 0.25, 'sine', 0.08, 0, 0.1); break;
    case 'ui': tone(660, 0.05, 'sine', 0.04); break;
    case 'pick': tone(784, 0.1, 'sine', 0.06); tone(988, 0.15, 'sine', 0.06, 0, 0.06); break;
    case 'patto': tone(523, 0.5, 'sine', 0.07); tone(659, 0.5, 'sine', 0.07, 0, 0.1); tone(784, 0.6, 'sine', 0.07, 0, 0.2); break;
    case 'betray': tone(311, 0.6, 'sawtooth', 0.06, 0, 0, 200); break;
    case 'defeat': tone(220, 1.5, 'sawtooth', 0.08, 0, 0, 55); break;
    case 'copy': tone(note(0), 0.08, 'square', 0.03, pan); tone(note(0), 0.08, 'square', 0.03, pan, 0.07); break;
    case 'ability': tone(330, 0.12, 'sawtooth', 0.035, pan); break;
    case 'bell': tone(note(o.slot ?? 0) * 2, 0.35, 'sine', 0.05, pan); tone(note(o.slot ?? 0) * 3, 0.25, 'sine', 0.02, pan, 0.01); break;
    case 'exile': tone(1568, 0.3, 'sine', 0.06, pan, 0, 392); break;
    case 'rimando': tone(392, 0.25, 'triangle', 0.06, pan, 0, 784); break;
    case 'end': tone(392, 0.3, 'sine', 0.06); tone(523, 0.45, 'sine', 0.06, 0, 0.12); break;
    case 'heartbeat': tone(60, 0.12, 'sine', 0.25); tone(55, 0.14, 'sine', 0.2, 0, 0.18); break;
    case 'victory': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.6, 'sine', 0.08, 0, i * 0.15)); break;
  }
}

// Il gioco tace quando l'app va in secondo piano (Audio/Tech: niente suoni dal telefono in tasca).
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else if (enabled) void ctx.resume();
  });
}
