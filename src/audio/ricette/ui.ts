// Tasti e pannelli (08 §3.7): legno morbido, niente bip elettronici.
import type { Ricettario } from '../tipi';

export const UI = {
  /** tasto generico */
  ui_tocco: {
    canale: 'ui', volume: 0.35, durata: 0.08,
    ricetta(s) {
      s.modi({ base: 520, rapporti: [1, 2.6, 4.2], code: [0.04, 0.025, 0.015], vol: 0.9 });
      s.rumore({ durata: 0.01, vol: 0.4, da: 2500 });
    },
  },
  /** tasto d'oro (Salpa!, Schermaglia): tocco e moneta */
  ui_primario: {
    canale: 'ui', volume: 0.4, durata: 0.25,
    ricetta(s) {
      s.modi({ base: 520, rapporti: [1, 2.6], code: [0.04, 0.025], vol: 0.8 });
      s.modi({ t: 0.03, base: 2100, rapporti: [1, 1.5, 2.9], code: [0.18, 0.12, 0.06], vol: 0.5 });
    },
  },
  /** interruttore di Impostazioni */
  ui_interruttore: {
    canale: 'ui', volume: 0.35, durata: 0.12,
    ricetta(s) {
      s.modi({ base: 700, rapporti: [1, 2.6], code: [0.03, 0.02], vol: 0.8 });
      s.modi({ t: 0.05, base: 950, rapporti: [1, 2.6], code: [0.04, 0.02], vol: 0.8 });
    },
  },
  /** scatto di un cursore */
  ui_cursore: {
    canale: 'ui', volume: 0.3, durata: 0.05, maxIstanze: 2,
    ricetta(s) {
      s.modi({ base: 1400, rapporti: [1, 2.4], code: [0.02, 0.012], vol: 0.9 });
    },
  },
  /** cambio arma: clic di ferro */
  ui_arma: {
    canale: 'ui', volume: 0.4, durata: 0.15,
    ricetta(s) {
      s.modi({ base: 1900, rapporti: [1, 2.4, 3.3], code: [0.05, 0.035, 0.02], vol: 0.8 });
      s.rumore({ durata: 0.012, vol: 0.6, filtro: 'highpass', da: 4000 });
      s.tono({ da: 240, a: 150, durata: 0.03, vol: 0.4 });
    },
  },
  /** avviso: il colpo ti farebbe male (due colpi di legno che scendono) */
  ui_avviso: {
    canale: 'ui', volume: 0.4, durata: 0.25, maxIstanze: 1,
    ricetta(s) {
      s.modi({ base: 390, rapporti: [1, 2.6, 4.2], code: [0.07, 0.04, 0.02], vol: 0.9 });
      s.modi({ t: 0.1, base: 300, rapporti: [1, 2.6, 4.2], code: [0.09, 0.05, 0.02], vol: 0.9 });
    },
  },
  /** "fatto": turno chiuso */
  ui_fatto: {
    canale: 'ui', volume: 0.35, durata: 0.2,
    ricetta(s) {
      s.modi({ base: 660, rapporti: [1, 2.6], code: [0.06, 0.03], vol: 0.8 });
      s.modi({ t: 0.06, base: 880, rapporti: [1, 2.6], code: [0.09, 0.04], vol: 0.8 });
    },
  },
} satisfies Ricettario;
