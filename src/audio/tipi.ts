// Tipi del registro audio (08 §4: la voce SOUNDS diventa AUDIO).
import type { Sint } from './sintesi';

/** I quattro canali del mix. L'ambiente (mare, vento) viaggia sul canale effetti. */
export type Canale = 'musica' | 'effetti' | 'voci' | 'ui';

export interface VoceAudio {
  canale: Canale;
  /** volume nel mix, 0..1 (il suono è già normalizzato) */
  volume: number;
  /** durata in secondi */
  durata: number;
  /** quante varianti (scelte a caso senza ripetere l'ultima); predefinito 1 */
  varianti?: number;
  /** quante copie insieme al massimo (si ruba la più vecchia); predefinito 3 */
  maxIstanze?: number;
  /** suono che gira in tondo finché non lo si ferma */
  ciclo?: boolean;
  /** file definitivo, es. 'assets/audio/sfx/esp_media.ogg': quando c'è prende il posto della sintesi */
  sample?: string;
  /** la ricetta sintetica (segnaposto fatto in casa). `variante` parte da 0. */
  ricetta: (s: Sint, variante: number) => void;
}

export type Ricettario = Record<string, VoceAudio>;
