// Note pronte della musica segnaposto. Sintetizzare ogni nota dal vivo (oscillatori e filtri) costava troppo
// processore in battaglia; qui ogni nota che i due brani usano si calcola UNA volta fuori linea, e il sequencer
// la suona come un campione: due nodi per nota invece di otto, nessun oscillatore acceso durante la partita.
import { BRANI, type Nota } from './musica';
import { suonaNota, type Strumento } from './strumenti';

interface Forma { freq: number; durata: number; tenuta: boolean }
/** frequenza di campionamento e durata per strumento: i suoni cupi (basso) si tengono a frequenza bassa, pesano meno */
const FORME: Record<Strumento, Forma> = {
  basso: { freq: 16000, durata: 2.0, tenuta: true },
  fisa: { freq: 24000, durata: 2.45, tenuta: true },
  pizzico: { freq: 24000, durata: 0.36, tenuta: false },
  cassa: { freq: 32000, durata: 0.2, tenuta: false },
  rullante: { freq: 32000, durata: 0.15, tenuta: false },
  mani: { freq: 32000, durata: 0.16, tenuta: false },
  sonaglio: { freq: 32000, durata: 0.08, tenuta: false },
  tamburo: { freq: 32000, durata: 0.24, tenuta: false },
};
const INTONATI: readonly Strumento[] = ['basso', 'fisa', 'pizzico'];

export const chiaveNota = (s: Strumento, midi: number): string => (INTONATI.includes(s) ? `${s}:${midi}` : s);

/** Tutte le note diverse che i brani possono chiedere (la melodia cambia a ogni giro: se ne guardano 32). */
export function noteNecessarie(): { s: Strumento; m: number }[] {
  const viste = new Map<string, { s: Strumento; m: number }>();
  for (const brano of Object.values(BRANI)) {
    for (let giro = 0; giro < 32; giro++) for (const n of brano.note(giro)) viste.set(chiaveNota(n.s, n.m), { s: n.s, m: n.m });
  }
  return [...viste.values()];
}

/** Secondi × frequenza × 4 byte: quanta memoria occupano le note pronte. */
export function byteNote(): number {
  return noteNecessarie().reduce((somma, n) => somma + FORME[n.s].durata * FORME[n.s].freq * 4, 0);
}

interface NotaPronta { dati: Float32Array; freq: number }
const pronte = new Map<string, NotaPronta>();
let lavoro: Promise<void> | null = null;

type CostruttoreOffline = new (canali: number, campioni: number, freq: number) => OfflineAudioContext;

export function quanteNotePronte(): number { return pronte.size; }

/** Calcola tutte le note, una alla volta e senza bloccare il gioco. Si può chiamare più volte. */
export function preparaNote(): Promise<void> {
  if (lavoro) return lavoro;
  const g = globalThis as { OfflineAudioContext?: CostruttoreOffline; webkitOfflineAudioContext?: CostruttoreOffline };
  const Offline = g.OfflineAudioContext ?? g.webkitOfflineAudioContext;
  if (!Offline) return (lavoro = Promise.resolve());
  lavoro = (async () => {
    for (const n of noteNecessarie()) {
      const f = FORME[n.s];
      try {
        const off = new Offline(1, Math.ceil(f.durata * f.freq), f.freq);
        // volume 1: il volume vero lo mette il sequencer quando la suona
        suonaNota(off, off.destination, n.s, n.m, 0, f.tenuta ? f.durata - 0.1 : 0, 1);
        const reso = await off.startRendering();
        pronte.set(chiaveNota(n.s, n.m), { dati: reso.getChannelData(0).slice(), freq: f.freq });
      } catch (e) {
        console.warn('audio: nota non calcolata', n, e);
      }
    }
  })();
  return lavoro;
}

/**
 * Suonatore per il sequencer: usa la nota pronta (un campione e un guadagno); se non c'è ancora (primi istanti dopo
 * l'avvio) ripiega sulla sintesi dal vivo, che suona uguale ma costa di più.
 */
export function creaSuonatore(ctx: BaseAudioContext): (dest: AudioNode, n: Nota, t: number, durata: number) => void {
  const buffer = new Map<string, AudioBuffer>();
  return (dest, n, t, durata) => {
    const chiave = chiaveNota(n.s, n.m);
    let b = buffer.get(chiave);
    if (!b) {
      const p = pronte.get(chiave);
      if (!p) { suonaNota(ctx, dest, n.s, n.m, t, durata, n.v); return; }
      b = ctx.createBuffer(1, p.dati.length, p.freq);
      b.getChannelData(0).set(p.dati);
      buffer.set(chiave, b);
    }
    const src = ctx.createBufferSource();
    src.buffer = b;
    const g = ctx.createGain();
    g.gain.setValueAtTime(n.v, t);
    src.connect(g).connect(dest);
    src.start(t);
    if (FORME[n.s].tenuta) {
      // nota tenuta: il campione è lungo, qui la si chiude alla durata giusta
      const fine = t + Math.min(durata, b.duration - 0.12);
      g.gain.setValueAtTime(n.v, fine);
      g.gain.linearRampToValueAtTime(0, fine + 0.07);
      src.stop(fine + 0.09);
    }
  };
}
