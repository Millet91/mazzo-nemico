// Contesto audio finto per Vitest (in Node non c'è WebAudio): crea nodi che non suonano ma ricordano cosa è stato
// chiesto, e si lamentano degli stessi errori che farebbero cadere WebAudio vero (rampe esponenziali verso zero,
// tempi negativi o non numerici).
export interface NodoFinto {
  tipo: string; partenze: number[]; fermate: number[]; valori: Record<string, number>;
  /** il valore più alto chiesto a ogni parametro (anche dentro le rampe) */
  picchi: Record<string, number>;
}

export interface ContestoFinto {
  ctx: BaseAudioContext;
  nodi: NodoFinto[];
  errori: string[];
  /** fa avanzare l'orologio del contesto */
  avanza(secondi: number): void;
  /** nodi creati di un tipo (es. 'Oscillator', 'BufferSource') */
  di(tipo: string): NodoFinto[];
}

export function contestoFinto(freq = 32000, offline = false): ContestoFinto {
  const nodi: NodoFinto[] = [];
  const errori: string[] = [];
  let ora = 0;
  const tempoOk = (dove: string, t: unknown) => { if (typeof t !== 'number' || !Number.isFinite(t) || t < 0) errori.push(`${dove}: tempo ${String(t)}`); };
  const parametro = (dove: string, n: NodoFinto, nome: string, iniziale = 0) => {
    const alto = (v: number) => { if (Number.isFinite(v)) n.picchi[nome] = Math.max(n.picchi[nome] ?? -Infinity, v); };
    const p = {
      value: iniziale,
      setValueAtTime(v: number, t: number) { tempoOk(dove, t); alto(v); if (!Number.isFinite(v)) errori.push(`${dove}: valore ${v}`); n.valori[nome] = v; return p; },
      linearRampToValueAtTime(v: number, t: number) { tempoOk(dove, t); alto(v); if (!Number.isFinite(v)) errori.push(`${dove}: valore ${v}`); return p; },
      exponentialRampToValueAtTime(v: number, t: number) { tempoOk(dove, t); alto(v); if (!(v > 0)) errori.push(`${dove}: rampa esponenziale verso ${v}`); return p; },
      setTargetAtTime(v: number, t: number, k: number) { tempoOk(dove, t); alto(v); if (!(k > 0)) errori.push(`${dove}: costante di tempo ${k}`); n.valori[nome] = v; return p; },
      cancelScheduledValues() { return p; },
    };
    return p;
  };
  const nodo = (tipo: string, parametri: string[], extra: Record<string, unknown> = {}) => {
    const n: NodoFinto = { tipo, partenze: [], fermate: [], valori: {}, picchi: {} };
    nodi.push(n);
    const o: Record<string, unknown> = {
      connect: (verso: unknown) => verso,
      disconnect: () => {},
      start: (t = 0) => { tempoOk(`${tipo}.start`, t); n.partenze.push(t); },
      stop: (t = 0) => { tempoOk(`${tipo}.stop`, t); if (!n.partenze.length) errori.push(`${tipo}.stop prima di start`); n.fermate.push(t); },
      setPeriodicWave: () => {},
      ...extra,
    };
    for (const p of parametri) o[p] = parametro(`${tipo}.${p}`, n, p, p === 'gain' || p === 'playbackRate' ? 1 : 0);
    return o;
  };
  const ctx: Record<string, unknown> = {
    sampleRate: freq,
    get currentTime() { return ora; },
    state: 'running',
    destination: {},
    createOscillator: () => nodo('Oscillator', ['frequency', 'detune'], { type: 'sine' }),
    createGain: () => nodo('Gain', ['gain']),
    createBiquadFilter: () => nodo('BiquadFilter', ['frequency', 'Q', 'gain'], { type: 'lowpass' }),
    createBufferSource: () => nodo('BufferSource', ['playbackRate', 'detune'], { buffer: null, loop: false, onended: null }),
    createWaveShaper: () => nodo('WaveShaper', [], { curve: null }),
    createStereoPanner: () => nodo('StereoPanner', ['pan']),
    createDynamicsCompressor: () => nodo('DynamicsCompressor', ['threshold', 'knee', 'ratio', 'attack', 'release']),
    createPeriodicWave: () => ({}),
    createBuffer: (_c: number, n: number, f: number) => { const d = new Float32Array(n); return { length: n, sampleRate: f, duration: n / f, getChannelData: () => d }; },
  };
  if (offline) ctx.startRendering = () => Promise.resolve();
  else ctx.resume = () => Promise.resolve();
  return {
    ctx: ctx as unknown as BaseAudioContext, nodi, errori,
    avanza(s) { ora += s; },
    di: (tipo) => nodi.filter((n) => n.tipo === tipo),
  };
}
