// REGISTRO AUDIO (08 §4): ogni suono del gioco passa da qui, con canale, volume, varianti e ricetta sintetica.
// Oggi tutto è sintetizzato in casa (niente crediti Magnific): compilando `sample` il file prende il posto della
// ricetta senza cambiare nient'altro. Gli id seguono 08 §3 senza il prefisso `sfx_`.
import type { VoceAudio } from './tipi';
import { CODA_CICLO } from './sintesi';
import { ARMI } from './ricette/armi';
import { ESPLOSIONI } from './ricette/esplosioni';
import { PIRATA } from './ricette/pirata';
import { MONDO } from './ricette/mondo';
import { UI } from './ricette/ui';
import { VOCI } from './ricette/voci';
import { JINGLE } from './ricette/jingle';
import { CROLLI } from './ricette/crolli';
import { ATTREZZI } from './ricette/attrezzi';

export const AUDIO = { ...UI, ...ARMI, ...ESPLOSIONI, ...PIRATA, ...MONDO, ...CROLLI, ...ATTREZZI, ...VOCI, ...JINGLE };

export type IdSuono = keyof typeof AUDIO;

export const ID_SUONI = Object.keys(AUDIO) as IdSuono[];

export function voce(id: IdSuono): VoceAudio {
  return AUDIO[id];
}

/**
 * Secondi totali da sintetizzare (tutte le varianti), contati a 32 kHz: un suono a 16 kHz conta la metà, perché
 * ha metà dei campioni da calcolare e da tenere in memoria. I cicli contano anche la loro coda. Serve a tenere d'occhio memoria e tempo d'avvio.
 */
export function secondiTotali(): number {
  return ID_SUONI.reduce((somma, id) => {
    const v = voce(id);
    // un ciclo si calcola con la coda che poi si ripiega sull'inizio del giro
    const durata = v.durata + (v.ciclo ? CODA_CICLO : 0);
    return somma + durata * (v.varianti ?? 1) * ((v.freq ?? 32000) / 32000);
  }, 0);
}
