// Armi (08 §3.1): spari e lanci. Segnaposto sintetici, "cartoon gonfi" e mai bellici.
import type { Ricettario } from '../tipi';

export const ARMI = {
  /** cannone a mano: schiocco, botto rotondo e sbuffo d'aria */
  arma_cannone: {
    canale: 'effetti', volume: 0.85, durata: 0.8, varianti: 2,
    ricetta(s) {
      const k = s.tra(0.92, 1.08);
      const sat = s.satura(2.5);
      s.rumore({ durata: 0.05, vol: 0.9, filtro: 'bandpass', da: 2600 * k, q: 0.7 });
      s.tono({ da: 190 * k, a: 52, durata: 0.32, vol: 1, verso: sat });
      s.tono({ tipo: 'triangle', da: 380 * k, a: 110, durata: 0.16, vol: 0.5, verso: sat });
      s.rumore({ durata: 0.45, vol: 0.7, da: 2200, a: 220 });
      s.rumore({ t: 0.05, durata: 0.7, vol: 0.3, da: 600, a: 140 });
    },
  },
  /** lancio a mano (granata): fruscio del braccio */
  arma_granata_lancio: {
    canale: 'effetti', volume: 0.5, durata: 0.3,
    ricetta(s) {
      s.rumore({ durata: 0.28, vol: 0.8, attacco: 0.09, filtro: 'bandpass', da: 500, a: 1900, q: 1.4 });
      s.rumore({ durata: 0.05, vol: 0.3, filtro: 'highpass', da: 3000 });
    },
  },
  /** la granata (palla di ferro) che rimbalza sul terreno */
  arma_granata_rimbalzo: {
    canale: 'effetti', volume: 0.45, durata: 0.2, varianti: 2,
    ricetta(s) {
      const k = s.tra(0.9, 1.12);
      s.tono({ da: 300 * k, a: 170, durata: 0.06, vol: 0.9 });
      s.modi({ base: 980 * k, rapporti: [1, 2.7, 4.6], code: [0.07, 0.05, 0.03], vol: 0.45 });
      s.rumore({ durata: 0.04, vol: 0.5, da: 1400 });
    },
  },
  /** pistola focaia: schiocco secco */
  arma_pistola: {
    canale: 'effetti', volume: 0.75, durata: 0.45, varianti: 2,
    ricetta(s) {
      const k = s.tra(0.93, 1.1);
      const sat = s.satura(2);
      s.rumore({ durata: 0.045, vol: 1, filtro: 'highpass', da: 1500 * k });
      s.tono({ da: 340 * k, a: 95, durata: 0.09, vol: 0.8, verso: sat });
      s.rumore({ durata: 0.2, vol: 0.6, filtro: 'bandpass', da: 1300 * k, a: 500, q: 0.8 });
      s.rumore({ t: 0.04, durata: 0.38, vol: 0.2, da: 900, a: 250 });
    },
  },
  /** sciabola a vuoto: la lama che fende l'aria */
  arma_sciabola_fendente: {
    canale: 'effetti', volume: 0.55, durata: 0.32, varianti: 2,
    ricetta(s) {
      const k = s.tra(0.9, 1.15);
      s.rumore({ durata: 0.26, vol: 0.9, attacco: 0.1, filtro: 'bandpass', da: 1600 * k, a: 5200 * k, q: 3 });
      s.rumore({ durata: 0.2, vol: 0.25, attacco: 0.08, filtro: 'highpass', da: 5000 });
    },
  },
  /** sciabola a segno: acciaio */
  arma_sciabola_colpo: {
    canale: 'effetti', volume: 0.6, durata: 0.4,
    ricetta(s) {
      s.modi({ base: 1350, rapporti: [1, 2.32, 3.86, 5.2], code: [0.3, 0.2, 0.12, 0.07], vol: 0.6 });
      s.rumore({ durata: 0.02, vol: 0.8, filtro: 'highpass', da: 3500 });
      s.tono({ da: 180, a: 80, durata: 0.09, vol: 0.7 });
    },
  },
  /** tutte le altre armi finché non hanno il loro suono: un lancio con un tonfo di legno */
  arma_generica: {
    canale: 'effetti', volume: 0.5, durata: 0.35,
    ricetta(s) {
      s.rumore({ durata: 0.3, vol: 0.7, attacco: 0.08, filtro: 'bandpass', da: 600, a: 1500, q: 1.2 });
      s.modi({ base: 240, rapporti: [1, 2.3], code: [0.08, 0.05], vol: 0.6 });
    },
  },
} satisfies Ricettario;
