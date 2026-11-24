// I suoni pronti: ogni voce del registro viene sintetizzata UNA volta (con OfflineAudioContext, fuori dal filo
// principale) e tenuta in memoria come campione mono a 32 kHz (24 o 16 kHz per i suoni lunghi senza acuti). In battaglia suonare costa poco: niente sintesi dal vivo.
import { AUDIO, ID_SUONI, type IdSuono } from './registro';
import type { VoceAudio } from './tipi';
import { CODA_CICLO, creaSint } from './sintesi';
import { a16, chiaveBuild, da16, leggi, scrivi, type Conservato } from './cache';

/** 32 kHz: basta per l'altoparlante del telefono e tiene bassa la memoria (circa 7 MB in tutto). */
export const FREQ_SINTESI = 32000;
/** frequenza di campionamento di una voce del registro */
export function freqDi(v: VoceAudio): number { return v.freq ?? FREQ_SINTESI; }
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

/** quanto dura la dissolvenza che chiude un giro (dentro CODA_CICLO) */
export const CROCE_CICLO = 0.1;

/**
 * Chiude un suono in ciclo: `d` è il giro (`giro` campioni) più la coda calcolata dopo. I primi `croce` campioni
 * passano piano dalla coda (che continua la fine del giro) all'inizio vero, a potenza costante: l'ultimo campione
 * del giro si attacca al primo senza salti, e il rumore di fondo non ha buchi.
 */
export function chiudiGiro(d: Float32Array, giro: number, croce: number): Float32Array {
  const out = d.slice(0, giro);
  const n = Math.min(croce, giro, d.length - giro);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * (Math.PI / 2);
    out[i] = d[i] * Math.sin(a) + d[giro + i] * Math.cos(a);
  }
  return out;
}

/** Seme stabile per id e variante: lo stesso suono esce sempre uguale. */
export function semeDi(id: string, variante: number): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h + variante * 0x9e3779b1) >>> 0;
}

/** Sintetizza una variante di una voce del registro. */
export async function sintetizza(id: string, v: VoceAudio, variante: number, Offline: CostruttoreOffline): Promise<Float32Array> {
  const freq = freqDi(v);
  const giro = Math.ceil(v.durata * freq);
  const off = new Offline(1, v.ciclo ? giro + Math.ceil(CODA_CICLO * freq) : giro, freq);
  // sotto i 55 Hz il telefono non suona: toglierli lascia più spazio al resto
  const hp = off.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 55;
  hp.connect(off.destination);
  v.ricetta(creaSint(off, hp, semeDi(id, variante)), variante);
  const reso = await off.startRendering();
  const d = reso.getChannelData(0).slice();
  return normalizza(v.ciclo ? chiudiGiro(d, giro, Math.round(CROCE_CICLO * freq)) : d, PICCO, !v.ciclo, freq);
}

const pronti = new Map<string, Float32Array[]>();
/**
 * Per la Diagnostica: quanto ci è voluto a preparare i suoni del menu (dall'apertura) e tutti gli altri (dall'entrata
 * in battaglia), e quanti suoni sono venuti dal cassetto.
 */
const info = { inizio: 0, msMenu: null as number | null, ms: null as number | null, daCassetto: 0 };
export function infoPreparazione(): { msMenu: number | null; ms: number | null; daCassetto: number } {
  return { msMenu: info.msMenu, ms: info.ms, daCassetto: info.daCassetto };
}

export function campioni(id: IdSuono): Float32Array[] | undefined { return pronti.get(id); }
export function quantiPronti(): number { return pronti.size; }

function offline(): CostruttoreOffline | null {
  const g = globalThis as { OfflineAudioContext?: CostruttoreOffline; webkitOfflineAudioContext?: CostruttoreOffline };
  return g.OfflineAudioContext ?? g.webkitOfflineAudioContext ?? null;
}

/** I suoni che servono nel menu: i tasti. Tutto il resto si prepara entrando in battaglia (vedi `preparaSuoni`). */
export const SUONI_MENU: readonly IdSuono[] = ID_SUONI.filter((id) => id.startsWith('ui_'));
export function quantiProntiMenu(): number { return SUONI_MENU.filter((id) => pronti.has(id)).length; }

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

let lavoroMenu: Promise<void> | null = null;
let lavoroTutti: Promise<void> | null = null;

/** Sintetizza i suoni in `coda` (nell'ordine), tre alla volta, poi mette nel cassetto tutto quello che è pronto. */
async function sintetizzaCoda(coda: IdSuono[], Offline: CostruttoreOffline, chiave: string | null): Promise<void> {
  if (!coda.length) return;
  const operaio = async (): Promise<void> => {
    for (let id = coda.shift(); id; id = coda.shift()) {
      if (pronti.has(id)) continue;
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
  // nel cassetto per il prossimo avvio (in sottofondo: il gioco non lo aspetta)
  const voci = new Map<string, Conservato>();
  for (const [id, varianti] of pronti) varianti.forEach((d, k) => voci.set(`${id}#${k}`, { dati: a16(d), freq: freqDi(AUDIO[id as IdSuono]) }));
  void scrivi('suoni', chiave, voci);
}

/**
 * Prepara i suoni senza bloccare il gioco. Il primo avvio dopo un'installazione costa (costruire le ricette sul filo
 * principale fa scattare il menu), quindi a due tempi:
 * - `'menu'` (all'apertura): tutto quello che c'è nel cassetto del telefono, e si calcolano solo i tasti;
 * - `'tutti'` (entrando in battaglia, dietro la schermata di caricamento): il resto, i più urgenti per primi.
 *   Se la battaglia parte prima, i suoni non ancora pronti restano muti: non si aspetta mai.
 * Si può chiamare più volte: ogni lavoro parte una volta sola. Senza OfflineAudioContext il gioco resta muto.
 */
export function preparaSuoni(quali: 'menu' | 'tutti' = 'tutti'): Promise<void> {
  const Offline = offline();
  if (!Offline) return Promise.resolve();
  const chiave = chiaveBuild();
  if (!lavoroMenu) {
    info.inizio = performance.now();
    // dal secondo avvio: i suoni sono già nel cassetto del telefono, prenderli costa poco anche nel menu
    lavoroMenu = (async () => {
      const salvati = await leggi('suoni', chiave).catch(() => null);
      if (salvati) {
        for (const id of ordineDiPreparazione()) {
          const n = (AUDIO[id] as VoceAudio).varianti ?? 1;
          const v = Array.from({ length: n }, (_, k) => salvati.get(`${id}#${k}`));
          if (v.every((c) => c && c.freq === freqDi(AUDIO[id]))) { pronti.set(id, v.map((c) => da16(c!.dati))); info.daCassetto++; }
        }
      }
      await sintetizzaCoda(SUONI_MENU.filter((id) => !pronti.has(id)), Offline, chiave);
      info.msMenu = performance.now() - info.inizio;
      if (pronti.size === ID_SUONI.length) info.ms = info.msMenu;
    })();
  }
  if (quali === 'menu') return lavoroMenu;
  if (!lavoroTutti) {
    lavoroTutti = lavoroMenu.then(async () => {
      if (pronti.size === ID_SUONI.length) return;
      const t0 = performance.now();
      await sintetizzaCoda(ordineDiPreparazione().filter((id) => !pronti.has(id)), Offline, chiave);
      info.ms = performance.now() - t0;
    });
  }
  return lavoroTutti;
}
