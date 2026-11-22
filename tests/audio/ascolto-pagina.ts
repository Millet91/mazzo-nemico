// Parte del banco d'ascolto che gira DENTRO Chromium (la impacchetta tests/audio/ascolto.ts con esbuild).
// Sintetizza ogni suono del registro e una battaglia finta, con lo stesso motore del gioco ma fuori linea.
import { AUDIO, ID_SUONI } from '../../src/audio/registro';
import type { VoceAudio } from '../../src/audio/tipi';
import { sintetizza, preparaSuoni, freqDi } from '../../src/audio/magazzino';
import { Motore } from '../../src/audio/motore';
import { Musica, type IdBrano } from '../../src/audio/musica';
import { Ambiente } from '../../src/audio/ambiente';
import { creaSuonatore, preparaNote, byteNote, noteNecessarie } from '../../src/audio/note';
import { memoriaNuova, suoniPerEventi, suoniPerVista } from '../../src/audio/eventi';
import type { EventoBattaglia } from '../../src/core/tipi';
import type { VistaBattaglia } from '../../src/core/bus';
import { generatore } from '../../src/audio/sintesi';
import { COPIONE, vistaFinta } from './copione';

export interface Misura { id: string; variante: number; durata: number; picco: number; rmsDb: number; fortiDb: number; centroideHz: number; volume: number; canale: string; freq: number }

const dbfs = (x: number): number => (x > 1e-9 ? 20 * Math.log10(x) : -120);

function misura(d: Float32Array, freq: number): { picco: number; rmsDb: number; fortiDb: number; centroideHz: number } {
  let picco = 0, somma = 0;
  for (const x of d) { picco = Math.max(picco, Math.abs(x)); somma += x * x; }
  // il tratto più forte: finestra di 100 ms (quanto "si sente" il suono, anche se è corto)
  const w = Math.min(d.length, Math.floor(freq * 0.1));
  let finestra = 0, massimo = 0;
  for (let i = 0; i < d.length; i++) {
    finestra += d[i] * d[i];
    if (i >= w) finestra -= d[i - w] * d[i - w];
    massimo = Math.max(massimo, finestra);
  }
  // centro dello spettro, stimato dagli attraversamenti dello zero (basta per capire se un suono è cupo o brillante)
  let zeri = 0;
  for (let i = 1; i < d.length; i++) if ((d[i - 1] < 0) !== (d[i] < 0)) zeri++;
  return { picco, rmsDb: dbfs(Math.sqrt(somma / d.length)), fortiDb: dbfs(Math.sqrt(massimo / w)), centroideHz: Math.round((zeri / 2) * (freq / d.length)) };
}

async function tuttiISuoni(): Promise<{ misure: Misura[]; dati: Record<string, number[]> }> {
  const misure: Misura[] = [];
  const dati: Record<string, number[]> = {};
  for (const id of ID_SUONI) {
    const v: VoceAudio = AUDIO[id];
    for (let k = 0; k < (v.varianti ?? 1); k++) {
      const d = await sintetizza(id, v, k, OfflineAudioContext);
      misure.push({ id, variante: k, durata: v.durata, volume: v.volume, canale: v.canale, freq: freqDi(v), ...misura(d, freqDi(v)) });
      dati[`${id}_${k}`] = Array.from(d);
    }
  }
  return { misure, dati };
}

/** Una scena intera fuori linea: musica, ambiente e gli eventi del copione passati dalle stesse funzioni del gioco. */
async function scena(brano: IdBrano, secondi: number, conCopione: boolean): Promise<{ sinistra: number[]; destra: number[]; misura: ReturnType<typeof misura>; suoni: string[]; msCalcolo: number }> {
  await preparaSuoni();
  const freq = 44100;
  const off = new OfflineAudioContext(2, Math.ceil(secondi * freq), freq);
  const caso = generatore(42);
  const motore = new Motore(off, caso);
  motore.volume('musica', 0.6);
  motore.volume('effetti', 0.8);
  // fuori linea non c'è il tempo per la salita morbida dei cursori
  // come nel gioco: la musica suona le note pronte
  await preparaNote();
  const musica = new Musica(off, motore.canali.musica, creaSuonatore(off));
  musica.avvia(brano, 1);
  const suoni: string[] = [];
  if (conCopione) {
    const ambiente = new Ambiente(off, motore.ambiente, () => {}, caso);
    ambiente.avvia();
    ambiente.vento(0.5);
    const mem = memoriaNuova();
    let prima: VistaBattaglia | null = null;
    for (const passo of COPIONE) {
      if (passo.t >= secondi) break;
      const vista = vistaFinta(passo.vista);
      const az = suoniPerEventi(passo.eventi as EventoBattaglia[], vista, mem, passo.t * 1000);
      for (const r of [...az.suoni, ...suoniPerVista(prima, vista, mem, false)]) {
        suoni.push(r.id);
        motore.suona({ ...r, ritardo: passo.t + (r.ritardo ?? 0) });
      }
      for (const m of az.musica) {
        if (m === 'percussioni') musica.accendiStrato(8, passo.t);
        else if (m === 'percussioniSempre') musica.accendiStrato(undefined, passo.t);
      }
      prima = vista;
    }
    motore.suona({ id: 'amb_gabbiano', ritardo: 6.5, pan: -0.6 });
    motore.suona({ id: 'amb_legno', ritardo: 19, pan: 0.5 });
  }
  // la musica si programma un po' alla volta, come dal vivo (il contesto fuori linea si ferma ogni quarto di secondo):
  // così il tempo di calcolo dice quanto costerebbe davvero sul telefono
  musica.programma(0.5);
  for (let t = 0.25; t < secondi; t += 0.25) {
    void off.suspend(t).then(() => { musica.programma(t + 0.5); void off.resume(); });
  }
  const t0 = performance.now();
  const reso = await off.startRendering();
  const msCalcolo = performance.now() - t0;
  const s = reso.getChannelData(0), d = reso.getChannelData(1);
  const mono = new Float32Array(s.length);
  for (let i = 0; i < s.length; i++) mono[i] = (s[i] + d[i]) / 2;
  return { sinistra: Array.from(s), destra: Array.from(d), misura: misura(mono, freq), suoni, msCalcolo };
}

const note = () => ({ quante: noteNecessarie().length, byte: byteNote() });

(window as unknown as { banco: unknown }).banco = { tuttiISuoni, scena, note };
