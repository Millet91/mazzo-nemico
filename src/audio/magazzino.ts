// I suoni pronti: ogni voce del registro viene sintetizzata UNA volta (con OfflineAudioContext, fuori dal filo
// principale) e tenuta in memoria come campione mono a 32 kHz. In battaglia suonare costa poco: niente sintesi dal vivo.
import { AUDIO, ID_SUONI, type IdSuono } from './registro';
import type { VoceAudio } from './tipi';
import { creaSint } from './sintesi';
import { a16, chiaveBuild, da16, leggi, scrivi, type Conservato } from './cache';

/** 32 kHz: basta per l'altoparlante del telefono e tiene bassa la memoria (circa 7 MB in tutto). */
export const FREQ_SINTESI = 32000;
/** picco di ogni suono dopo la normalizzazione (−1 dB) */
export const PICCO = 0.89;

type CostruttoreOffline = new (canali: number, campioni: number, freq: number) => OfflineAudioContext;

/** Porta il picco a `picco` e sfuma gli ultimi 4 ms (niente "clic" a fine suono). I cicli non si sfumano. */
export function normalizza(d: Float32Array, picco = PICCO, sfumaFine = true, freq = FREQ_SINTESI): Float32Array {
  let max = 0;
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > max) max = a; }
  if (max > 1e-6) { const k = picco / max; for (let i = 0; i < d.length; i++) d[i] *= k; }
  if (sfumaFine) {
    const n = Math.min(d.length, Math.floor(freq * 0.004));
    for (let i = 0; i < n; i++) d[d.length - 1 - i] *= i / n;
  }
  return d;
}

/** Seme stabile per id e variante: lo stesso suono esce sempre uguale. */
export function semeDi(id: string, variante: number): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h + variante * 0x9e3779b1) >>> 0;
}

/** Sintetizza una variante di una voce del registro. */
export async function sintetizza(id: string, v: VoceAudio, variante: number, Offline: CostruttoreOffline): Promise<Float32Array> {
  const off = new Offline(1, Math.ceil(v.durata * FREQ_SINTESI), FREQ_SINTESI);
  // sotto i 55 Hz il telefono non suona: toglierli lascia più spazio al resto
  const hp = off.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 55;
  hp.connect(off.destination);
  v.ricetta(creaSint(off, hp, semeDi(id, variante)), variante);
  const reso = await off.startRendering();
  return normalizza(reso.getChannelData(0).slice(), PICCO, !v.ciclo);
}

const pronti = new Map<string, Float32Array[]>();
let lavoro: Promise<void> | null = null;
/** per la Diagnostica: quanto ci è voluto a preparare tutto, e quanti suoni sono venuti dal cassetto */
const info = { inizio: 0, ms: null as number | null, daCassetto: 0 };
export function infoPreparazione(): { ms: number | null; daCassetto: number } { return { ms: info.ms, daCassetto: info.daCassetto }; }

export function campioni(id: IdSuono): Float32Array[] | undefined { return pronti.get(id); }
export function quantiPronti(): number { return pronti.size; }

function offline(): CostruttoreOffline | null {
  const g = globalThis as { OfflineAudioContext?: CostruttoreOffline; webkitOfflineAudioContext?: CostruttoreOffline };
  return g.OfflineAudioContext ?? g.webkitOfflineAudioContext ?? null;
}

/** In che ordine preparare: prima quello che serve subito (tasti, campana e voce d'inizio turno, sparo, botti). */
export function ordineDiPreparazione(): IdSuono[] {
  const urgenza = (id: string): number =>
    id.startsWith('ui_') ? 0
      : id.startsWith('turno_') || id.endsWith('_tocca') ? 1
        : id.startsWith('arma_') || id.startsWith('esp_') || id.startsWith('imp_') || id.startsWith('passo_') ? 2
          : id.startsWith('mus_') || id.startsWith('amb_') ? 4
            : 3;
  return [...ID_SUONI].sort((a, b) => urgenza(a) - urgenza(b));
}

/** quanti suoni si calcolano insieme (ognuno su un filo suo, fuori dal filo principale) */
const IN_PARALLELO = 3;

/**
 * Prepara tutti i suoni senza bloccare il gioco, i più urgenti per primi. Si può chiamare più volte: il lavoro
 * parte una volta sola. Se il telefono non ha OfflineAudioContext il gioco resta muto, non si rompe.
 */
export function preparaSuoni(): Promise<void> {
  if (lavoro) return lavoro;
  const Offline = offline();
  if (!Offline) return (lavoro = Promise.resolve());
  info.inizio = performance.now();
  lavoro = (async () => {
    const chiave = chiaveBuild();
    // dal secondo avvio: i suoni sono già nel cassetto del telefono
    const cassetto = await leggi('suoni', chiave).catch(() => null);
    const coda: IdSuono[] = [];
    for (const id of ordineDiPreparazione()) {
      const n = (AUDIO[id] as VoceAudio).varianti ?? 1;
      const salvate = cassetto ? Array.from({ length: n }, (_, k) => cassetto.get(`${id}#${k}`)) : [];
      if (salvate.length === n && salvate.every((c) => c && c.freq === FREQ_SINTESI)) { pronti.set(id, salvate.map((c) => da16(c!.dati))); info.daCassetto++; }
      else coda.push(id);
    }
    if (!coda.length) { info.ms = performance.now() - info.inizio; return; }
    const operaio = async (): Promise<void> => {
      for (let id = coda.shift(); id; id = coda.shift()) {
        const v: VoceAudio = AUDIO[id];
        const varianti: Float32Array[] = [];
        try {
          for (let k = 0; k < (v.varianti ?? 1); k++) varianti.push(await sintetizza(id, v, k, Offline));
          pronti.set(id, varianti);
        } catch (e) {
          console.warn('audio: suono non sintetizzato', id, e);
        }
      }
    };
    await Promise.all(Array.from({ length: IN_PARALLELO }, operaio));
    info.ms = performance.now() - info.inizio;
    // nel cassetto per il prossimo avvio (in sottofondo: il gioco non lo aspetta)
    const voci = new Map<string, Conservato>();
    for (const [id, varianti] of pronti) varianti.forEach((d, k) => voci.set(`${id}#${k}`, { dati: a16(d), freq: FREQ_SINTESI }));
    void scrivi('suoni', chiave, voci);
  })();
  return lavoro;
}
