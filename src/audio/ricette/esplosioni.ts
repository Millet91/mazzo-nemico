// Esplosioni a tre strati (studio v2, audio §3.1): botto per dimensione + strato del materiale + coda di detriti.
// Il telefono non riproduce sotto i 150-200 Hz: il "peso" viene dalla saturazione (armoniche) e dal rumore medio-basso.
import type { Ricettario } from '../tipi';
import type { Sint } from '../sintesi';
import { detriti } from './comuni';

function botto(s: Sint, taglia: number): void {
  // taglia: 0.6 piccola, 1 media, 1.6 grande
  const k = s.tra(0.93, 1.08);
  const sat = s.satura(3);
  s.rumore({ durata: 0.03, vol: 0.7, filtro: 'highpass', da: 3000 });
  s.tono({ da: (150 / taglia ** 0.5) * k, a: 34, durata: 0.6 * taglia, vol: 1, verso: sat });
  s.tono({ tipo: 'triangle', da: (300 / taglia ** 0.5) * k, a: 70, durata: 0.35 * taglia, vol: 0.5, verso: sat });
  s.rumore({ durata: 0.85 * taglia, vol: 0.9, da: 2600 / taglia ** 0.5, a: 110, verso: sat });
  s.rumore({ t: 0.04, durata: 1.0 * taglia, vol: 0.3, filtro: 'bandpass', da: 700, a: 200, q: 0.6 });
  if (taglia > 1.3) {
    // il secondo colpo del botto grande: l'aria che torna
    s.tono({ t: 0.13, da: 90 * k, a: 30, durata: 0.9, vol: 0.7, verso: sat });
    s.rumore({ t: 0.13, durata: 1.5, vol: 0.4, da: 900, a: 90 });
  }
}

export const ESPLOSIONI = {
  /** raggio fino a 47 px: lapide, trappola piccola */
  esp_piccola: { canale: 'effetti', volume: 0.8, durata: 0.8, varianti: 2, ricetta: (s) => botto(s, 0.6) },
  /** raggio da 48 a 75 px: cannone, granata */
  esp_media: { canale: 'effetti', volume: 0.95, durata: 1.3, varianti: 2, ricetta: (s) => botto(s, 1) },
  /** raggio oltre 75 px: barile di polvere */
  esp_grande: { canale: 'effetti', volume: 1, durata: 2.0, varianti: 2, ricetta: (s) => botto(s, 1.6) },
  /** pioggia di terra e schegge dopo il botto */
  esp_coda: {
    canale: 'effetti', volume: 0.4, durata: 1.3, varianti: 2,
    ricetta(s) {
      s.rumore({ t: 0.05, durata: 1.1, vol: 0.25, attacco: 0.15, da: 1800, a: 500 });
      detriti(s, 16, 0.1, 1.15, 0.9, 700, 3200);
    },
  },
  /** strato materiale: sabbia e terra, uno spruzzo */
  imp_sabbia: {
    canale: 'effetti', volume: 0.45, durata: 0.5,
    ricetta(s) {
      s.rumore({ durata: 0.45, vol: 0.9, attacco: 0.012, filtro: 'bandpass', da: 3800, a: 2200, q: 0.5 });
      s.rumore({ durata: 0.3, vol: 0.4, attacco: 0.02, filtro: 'highpass', da: 6000 });
    },
  },
  /** strato materiale: legno che si spacca */
  imp_legno: {
    canale: 'effetti', volume: 0.6, durata: 0.5,
    ricetta(s) {
      s.modi({ base: 410, rapporti: [1, 2.3, 3.9, 5.1], code: [0.14, 0.09, 0.06, 0.04], vol: 0.7 });
      s.rumore({ durata: 0.03, vol: 0.9, filtro: 'bandpass', da: 1900, q: 1.5 });
      detriti(s, 7, 0.03, 0.4, 0.8, 1200, 2600, 5);
    },
  },
  /** strato materiale: roccia, schiocco duro e sassi */
  imp_roccia: {
    canale: 'effetti', volume: 0.6, durata: 0.5,
    ricetta(s) {
      s.rumore({ durata: 0.05, vol: 1, filtro: 'bandpass', da: 2300, q: 1.8 });
      s.modi({ base: 900, rapporti: [1, 1.7, 2.9], code: [0.07, 0.05, 0.03], vol: 0.5 });
      detriti(s, 6, 0.06, 0.42, 0.7, 500, 1100, 2);
    },
  },
  /** strato materiale: ghiaccio che va in frantumi */
  imp_ghiaccio: {
    canale: 'effetti', volume: 0.5, durata: 0.5,
    ricetta(s) {
      s.modi({ base: 2400, rapporti: [1, 1.41, 1.93, 2.6], code: [0.28, 0.2, 0.14, 0.1], vol: 0.5 });
      s.rumore({ durata: 0.04, vol: 0.8, filtro: 'highpass', da: 5000 });
      detriti(s, 9, 0.03, 0.42, 0.7, 4000, 7500, 6);
    },
  },
  /** strato materiale: ferro, una botta su una lastra */
  imp_ferro: {
    canale: 'effetti', volume: 0.55, durata: 0.6,
    ricetta(s) {
      s.modi({ base: 520, rapporti: [1, 2.76, 5.4, 8.93], code: [0.5, 0.36, 0.2, 0.12], vol: 0.6 });
      s.rumore({ durata: 0.02, vol: 0.9, filtro: 'highpass', da: 3000 });
    },
  },
} satisfies Ricettario;
