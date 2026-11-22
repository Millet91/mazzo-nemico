// Attrezzi di sintesi per le ricette del registro: toni, rumore filtrato, corpi che risuonano e voce a formanti.
// Lavorano su un BaseAudioContext qualsiasi: in gioco è un OfflineAudioContext (il suono si calcola una volta e
// poi si suona come un campione), nei test è quello del banco d'ascolto. Il tempo 0 è l'inizio del suono.

/** Generatore deterministico (mulberry32): la stessa variante suona sempre uguale. */
export function generatore(seme: number): () => number {
  let s = seme >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Secondi in più che si calcolano dopo la fine di un suono in ciclo: il magazzino li ripiega sull'inizio del giro
 * con una dissolvenza incrociata (`chiudiGiro`), così il giro ricomincia senza buchi e senza scatti.
 */
export const CODA_CICLO = 0.15;

const rumori = new Map<number, AudioBuffer>();
/**
 * 2 s di rumore bianco, uno per frequenza di campionamento. Un AudioBuffer si può usare in qualsiasi contesto:
 * prima se ne faceva uno per contesto, cioè uno per ogni suono preparato (100 volte 64 000 numeri a caso sul filo
 * principale, all'avvio). Il rumore è lo stesso di prima (stesso seme), quindi i suoni non cambiano.
 */
export function rumoreBianco(ctx: BaseAudioContext): AudioBuffer {
  let b = rumori.get(ctx.sampleRate);
  if (!b) {
    b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
    const d = b.getChannelData(0);
    const r = generatore(0x5eed);
    for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
    rumori.set(ctx.sampleRate, b);
  }
  return b;
}

export interface OpzTono {
  tipo?: OscillatorType;
  /** frequenza iniziale e (se c'è) finale, in Hz */
  da: number;
  a?: number;
  /** secondi dall'inizio del suono */
  t?: number;
  durata: number;
  vol: number;
  attacco?: number;
  /** secondi a volume pieno prima della discesa */
  tenuta?: number;
  /** tremolio dell'intonazione */
  vibrato?: { hz: number; cent: number };
  verso?: AudioNode;
}

export interface OpzRumore {
  t?: number;
  durata: number;
  vol: number;
  attacco?: number;
  tenuta?: number;
  filtro?: BiquadFilterType;
  /** frequenza del filtro: iniziale e (se c'è) finale */
  da: number;
  a?: number;
  q?: number;
  verso?: AudioNode;
}

export interface OpzModi {
  t?: number;
  /** frequenza di base in Hz e rapporti delle parziali */
  base: number;
  rapporti: readonly number[];
  /** secondi di coda per parziale (o uno per tutte) */
  code: readonly number[] | number;
  /** volume relativo per parziale (predefinito: scende con l'indice) */
  pesi?: readonly number[];
  vol: number;
  verso?: AudioNode;
}

export type Vocale = 'a' | 'o' | 'u' | 'e' | 'i';
const FORMANTI: Record<Vocale, [number, number, number]> = {
  a: [730, 1090, 2440],
  o: [570, 840, 2410],
  u: [440, 1020, 2240],
  e: [530, 1840, 2480],
  i: [300, 2250, 3000],
};

export interface OpzVoce {
  t?: number;
  durata: number;
  /** intonazione in Hz: punti a distanza uguale lungo la durata */
  f0: readonly number[];
  /** vocali: punti a distanza uguale lungo la durata */
  vocali: readonly Vocale[];
  vol: number;
  /** 0..1: quanto "raspa" (la R di "arr") */
  raspa?: number;
  /** 0..1: quanto fiato c'è nella voce */
  fiato?: number;
  /** scala dei formanti: sotto 1 = gola più grossa */
  gola?: number;
  attacco?: number;
  rilascio?: number;
  verso?: AudioNode;
}

export interface Sint {
  ctx: BaseAudioContext;
  /** uscita del suono */
  out: AudioNode;
  /** numero in [0, 1), diverso per variante */
  rnd(): number;
  /** numero tra min e max */
  tra(min: number, max: number): number;
  tono(o: OpzTono): void;
  rumore(o: OpzRumore): void;
  /** corpo che risuona: somma di parziali che si spengono (legno, ferro, campana, vetro) */
  modi(o: OpzModi): void;
  /** voce a formanti: un verso da pirata, non parole */
  voce(o: OpzVoce): void;
  /** nodo che satura (dà corpo e armoniche ai colpi bassi); va verso l'uscita o verso `verso` */
  satura(quanto: number, verso?: AudioNode): AudioNode;
  /** filtro condiviso da più strati */
  filtro(tipo: BiquadFilterType, hz: number, q?: number, verso?: AudioNode): BiquadFilterNode;
  /** guadagno condiviso da più strati */
  guadagno(vol: number, verso?: AudioNode): GainNode;
}

const ZERO = 0.0001;

function inviluppo(p: AudioParam, t: number, vol: number, durata: number, attacco: number, tenuta: number): void {
  const a = Math.min(attacco, durata * 0.5);
  p.setValueAtTime(ZERO, t);
  p.linearRampToValueAtTime(Math.max(ZERO, vol), t + a);
  if (tenuta > 0) p.setValueAtTime(Math.max(ZERO, vol), t + Math.min(durata * 0.95, a + tenuta));
  p.exponentialRampToValueAtTime(ZERO, t + durata);
}

export function creaSint(ctx: BaseAudioContext, out: AudioNode, seme: number): Sint {
  const rnd = generatore(seme);
  const s: Sint = {
    ctx, out, rnd,
    tra: (min, max) => min + rnd() * (max - min),

    tono(o) {
      const t = o.t ?? 0;
      const osc = ctx.createOscillator();
      osc.type = o.tipo ?? 'sine';
      osc.frequency.setValueAtTime(o.da, t);
      if (o.a !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.a), t + o.durata);
      if (o.vibrato) {
        const lfo = ctx.createOscillator();
        const g = ctx.createGain();
        lfo.frequency.value = o.vibrato.hz;
        g.gain.value = o.vibrato.cent;
        lfo.connect(g).connect(osc.detune);
        lfo.start(t);
        lfo.stop(t + o.durata + 0.05);
      }
      const g = ctx.createGain();
      inviluppo(g.gain, t, o.vol, o.durata, o.attacco ?? 0.004, o.tenuta ?? 0);
      osc.connect(g).connect(o.verso ?? out);
      osc.start(t);
      osc.stop(t + o.durata + 0.05);
    },

    rumore(o) {
      const t = o.t ?? 0;
      const src = ctx.createBufferSource();
      src.buffer = rumoreBianco(ctx);
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = o.filtro ?? 'lowpass';
      f.frequency.setValueAtTime(o.da, t);
      if (o.a !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(10, o.a), t + o.durata);
      f.Q.value = o.q ?? 0.7;
      const g = ctx.createGain();
      inviluppo(g.gain, t, o.vol, o.durata, o.attacco ?? 0.002, o.tenuta ?? 0);
      src.connect(f).connect(g).connect(o.verso ?? out);
      src.start(t, rnd() * 1.5);
      src.stop(t + o.durata + 0.05);
    },

    modi(o) {
      const t = o.t ?? 0;
      o.rapporti.forEach((r, i) => {
        const coda = typeof o.code === 'number' ? o.code : o.code[Math.min(i, o.code.length - 1)];
        const peso = o.pesi ? o.pesi[Math.min(i, o.pesi.length - 1)] : 1 / (1 + i * 0.7);
        const hz = o.base * r;
        if (hz > ctx.sampleRate * 0.45) return;
        const osc = ctx.createOscillator();
        osc.frequency.value = hz;
        const g = ctx.createGain();
        g.gain.setValueAtTime(ZERO, t);
        g.gain.linearRampToValueAtTime(Math.max(ZERO, o.vol * peso), t + 0.002);
        g.gain.exponentialRampToValueAtTime(ZERO, t + coda);
        osc.connect(g).connect(o.verso ?? out);
        osc.start(t);
        osc.stop(t + coda + 0.03);
      });
    },

    voce(o) {
      const t = o.t ?? 0;
      const gola = o.gola ?? 1;
      const passo = (n: number, i: number) => t + (n <= 1 ? 0 : (i / (n - 1)) * o.durata);
      // corde vocali: dente di sega, più un po' di fiato
      const corde = ctx.createOscillator();
      corde.type = 'sawtooth';
      o.f0.forEach((hz, i) => {
        if (i === 0) corde.frequency.setValueAtTime(hz, t);
        else corde.frequency.linearRampToValueAtTime(hz, passo(o.f0.length, i));
      });
      const sorgente = ctx.createGain();
      sorgente.gain.value = 1;
      corde.connect(sorgente);
      if (o.fiato) {
        const fiato = ctx.createBufferSource();
        fiato.buffer = rumoreBianco(ctx);
        fiato.loop = true;
        const gf = ctx.createGain();
        gf.gain.value = o.fiato * 0.6;
        fiato.connect(gf).connect(sorgente);
        fiato.start(t, rnd());
        fiato.stop(t + o.durata + 0.05);
      }
      if (o.raspa) {
        // la R arrotata: il volume trema una trentina di volte al secondo
        const lfo = ctx.createOscillator();
        lfo.type = 'square';
        lfo.frequency.value = 26 + rnd() * 6;
        const gl = ctx.createGain();
        gl.gain.value = o.raspa * 0.5;
        sorgente.gain.value = 1 - o.raspa * 0.5;
        lfo.connect(gl).connect(sorgente.gain);
        lfo.start(t);
        lfo.stop(t + o.durata + 0.05);
      }
      const busta = ctx.createGain();
      const att = o.attacco ?? 0.02;
      const ril = o.rilascio ?? 0.06;
      busta.gain.setValueAtTime(ZERO, t);
      busta.gain.linearRampToValueAtTime(o.vol, t + att);
      busta.gain.setValueAtTime(o.vol, t + Math.max(att, o.durata - ril));
      busta.gain.exponentialRampToValueAtTime(ZERO, t + o.durata);
      busta.connect(o.verso ?? out);
      // tre formanti in parallelo che scivolano da una vocale all'altra
      const pesi = [1, 0.55, 0.2];
      const q = [5, 8, 9];
      for (let k = 0; k < 3; k++) {
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.Q.value = q[k];
        o.vocali.forEach((v, i) => {
          const hz = FORMANTI[v][k] * gola;
          if (i === 0) f.frequency.setValueAtTime(hz, t);
          else f.frequency.linearRampToValueAtTime(hz, passo(o.vocali.length, i));
        });
        const g = ctx.createGain();
        g.gain.value = pesi[k];
        sorgente.connect(f).connect(g).connect(busta);
      }
      corde.start(t);
      corde.stop(t + o.durata + 0.05);
    },

    satura(quanto, verso) {
      const w = ctx.createWaveShaper();
      const n = 1024;
      const curva = new Float32Array(n);
      const k = Math.max(0.01, quanto);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        curva[i] = Math.tanh(k * x) / Math.tanh(k);
      }
      w.curve = curva;
      w.connect(verso ?? out);
      return w;
    },

    filtro(tipo, hz, q = 0.7, verso) {
      const f = ctx.createBiquadFilter();
      f.type = tipo;
      f.frequency.value = hz;
      f.Q.value = q;
      f.connect(verso ?? out);
      return f;
    },

    guadagno(vol, verso) {
      const g = ctx.createGain();
      g.gain.value = vol;
      g.connect(verso ?? out);
      return g;
    },
  };
  return s;
}
