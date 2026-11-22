// Il pirata: colpi presi, cadute e movimento "da marinaio" (studio v2, audio §3.2): stivali, fibbie, corda e legno.
// Niente "boing" e niente "sproing".
import type { Ricettario, VoceAudio } from '../tipi';
import type { Sint } from '../sintesi';
import { detriti, scricchiolio } from './comuni';

/** Tonfo sordo di uno stivale. */
function stivale(s: Sint, t: number, vol: number, hz = 130): void {
  s.tono({ t, da: hz, a: hz * 0.55, durata: 0.05, vol });
}

const passo = (ricetta: (s: Sint) => void, varianti = 3, volume = 0.34): VoceAudio =>
  ({ canale: 'effetti', volume, durata: 0.14, varianti, maxIstanze: 2, ricetta });

export const PIRATA = {
  /** colpo preso: tonfo sul corpo e stoffa (non più il "boing") */
  pirata_colpito: {
    canale: 'effetti', volume: 0.65, durata: 0.3, varianti: 2,
    ricetta(s) {
      const k = s.tra(0.9, 1.1);
      s.tono({ da: 175 * k, a: 68, durata: 0.15, vol: 0.8 });
      s.tono({ tipo: 'triangle', da: 430 * k, a: 150, durata: 0.1, vol: 0.6 });
      s.rumore({ durata: 0.08, vol: 0.9, filtro: 'bandpass', da: 1100 * k, q: 0.7 });
      s.rumore({ t: 0.01, durata: 0.06, vol: 0.25, filtro: 'bandpass', da: 2600, q: 1 });
    },
  },
  /** morte: uno sbuffo di fumo */
  pirata_morte: {
    canale: 'effetti', volume: 0.6, durata: 0.8,
    ricetta(s) {
      s.rumore({ durata: 0.7, vol: 0.9, attacco: 0.04, filtro: 'bandpass', da: 1000, a: 280, q: 0.8 });
      s.rumore({ durata: 0.3, vol: 0.25, attacco: 0.02, filtro: 'highpass', da: 4000 });
      s.tono({ da: 130, a: 60, durata: 0.12, vol: 0.5 });
    },
  },
  /** la lapide che si pianta nel terreno */
  lapide: {
    canale: 'effetti', volume: 0.55, durata: 0.35,
    ricetta(s) {
      s.tono({ da: 145, a: 78, durata: 0.13, vol: 0.7 });
      s.modi({ base: 330, rapporti: [1, 2.1, 3.4], code: [0.11, 0.07, 0.04], vol: 0.9 });
      s.rumore({ durata: 0.05, vol: 0.5, da: 1500 });
    },
  },
  /** caduta che fa male */
  caduta_tonfo: {
    canale: 'effetti', volume: 0.7, durata: 0.4,
    ricetta(s) {
      s.tono({ da: 125, a: 45, durata: 0.26, vol: 1, verso: s.satura(2) });
      s.rumore({ durata: 0.16, vol: 0.7, da: 750 });
      detriti(s, 3, 0.08, 0.3, 0.4, 900, 2000);
    },
  },
  /** atterraggio normale: due stivali */
  atterra: {
    canale: 'effetti', volume: 0.4, durata: 0.16, varianti: 2,
    ricetta(s) {
      const d = s.tra(0.02, 0.035);
      for (const t of [0, d]) {
        stivale(s, t, 0.6, s.tra(150, 190));
        s.rumore({ t, durata: 0.05, vol: 0.9, filtro: 'bandpass', da: s.tra(900, 1300), q: 0.7 });
      }
    },
  },
  /** salto: lo stacco degli stivali e la giacca che frusta l'aria */
  salto: {
    canale: 'effetti', volume: 0.35, durata: 0.22,
    ricetta(s) {
      s.rumore({ durata: 0.04, vol: 0.6, filtro: 'highpass', da: 2500 });
      stivale(s, 0, 0.5, 150);
      s.rumore({ t: 0.01, durata: 0.2, vol: 0.8, attacco: 0.06, filtro: 'bandpass', da: 650, a: 1900, q: 1.2 });
    },
  },
  /** salto dal muro: la pedata sulla parete */
  salto_muro: {
    canale: 'effetti', volume: 0.45, durata: 0.26,
    ricetta(s) {
      s.tono({ da: 210, a: 95, durata: 0.07, vol: 1 });
      s.rumore({ durata: 0.04, vol: 0.8, filtro: 'bandpass', da: 1500, q: 2 });
      s.rumore({ t: 0.03, durata: 0.22, vol: 0.6, attacco: 0.06, filtro: 'bandpass', da: 700, a: 2100, q: 1.2 });
    },
  },
  /** scavalco: mani sul muretto e stoffa che striscia */
  scavalco: {
    canale: 'effetti', volume: 0.4, durata: 0.35,
    ricetta(s) {
      for (const t of [0, 0.11]) {
        s.rumore({ t, durata: 0.035, vol: 0.8, da: 1500 });
        s.tono({ t, da: 200, a: 120, durata: 0.04, vol: 0.4 });
      }
      s.rumore({ t: 0.03, durata: 0.3, vol: 0.55, attacco: 0.08, filtro: 'bandpass', da: 1200, a: 2100, q: 1 });
    },
  },
  /** salvataggio al bordo: due mani che afferrano il ciglio, sassolini */
  bordo: {
    canale: 'effetti', volume: 0.5, durata: 0.4,
    ricetta(s) {
      for (const t of [0, 0.05]) {
        s.rumore({ t, durata: 0.04, vol: 0.9, filtro: 'bandpass', da: 1800, q: 1.5 });
        s.tono({ t, da: 220, a: 125, durata: 0.05, vol: 0.6 });
      }
      detriti(s, 5, 0.08, 0.36, 0.5, 1500, 3500);
    },
  },
  /** scivolata su un pendio: ghiaia e sabbia che corrono (gira in tondo finché dura) */
  scivola_ciclo: {
    canale: 'effetti', volume: 0.35, durata: 1.0, ciclo: true, maxIstanze: 2,
    ricetta(s) {
      const piatto = { durata: 1.0, attacco: 0.001, tenuta: 0.99 };
      s.rumore({ ...piatto, vol: 0.6, filtro: 'bandpass', da: 1900, q: 0.5 });
      s.rumore({ ...piatto, vol: 0.25, filtro: 'highpass', da: 4500 });
      detriti(s, 14, 0, 0.95, 0.6, 1200, 3000);
    },
  },
  /** fine della scivolata: gli stivali che frenano */
  scivola_fine: {
    canale: 'effetti', volume: 0.35, durata: 0.2,
    ricetta(s) {
      s.rumore({ durata: 0.18, vol: 0.8, filtro: 'bandpass', da: 2400, a: 1100, q: 0.8 });
      stivale(s, 0.02, 0.5);
    },
  },
  /** presa su scala o liana: la mano che afferra e la corda che si tende */
  presa: {
    canale: 'effetti', volume: 0.4, durata: 0.3, varianti: 2,
    ricetta(s) {
      s.rumore({ durata: 0.035, vol: 0.7, da: 1700 });
      scricchiolio(s, 0.02, 0.24, 0.9, 1100);
    },
  },
  /** si stacca dall'appiglio */
  stacco: {
    canale: 'effetti', volume: 0.3, durata: 0.15,
    ricetta(s) {
      s.rumore({ durata: 0.12, vol: 0.8, attacco: 0.015, filtro: 'bandpass', da: 2300, a: 1400, q: 1 });
    },
  },
  /** un'esplosione spezza una scala o una liana: corda che schiocca e legno che cede */
  appiglio_rotto: {
    canale: 'effetti', volume: 0.55, durata: 0.6,
    ricetta(s) {
      s.tono({ tipo: 'triangle', da: 320, a: 85, durata: 0.16, vol: 0.8 });
      s.rumore({ durata: 0.05, vol: 0.9, filtro: 'highpass', da: 3000 });
      s.modi({ t: 0.04, base: 380, rapporti: [1, 2.3, 3.9], code: [0.12, 0.08, 0.05], vol: 0.6 });
      detriti(s, 6, 0.06, 0.5, 0.7, 1200, 2600, 5);
    },
  },
  // ── passi, dal materiale sotto il piede (evento `passo` della sim) ──
  passo_sabbia: passo((s) => {
    s.rumore({ durata: 0.11, vol: 0.9, attacco: 0.01, filtro: 'bandpass', da: s.tra(800, 1100), q: 0.8 });
    stivale(s, 0, 0.45, s.tra(100, 125));
  }),
  passo_legno: passo((s) => {
    s.modi({ base: s.tra(250, 310), rapporti: [1, 2.4, 4.1], code: [0.08, 0.05, 0.03], pesi: [1, 0.8, 0.5], vol: 0.9 });
    s.rumore({ durata: 0.02, vol: 0.7, da: 2400 });
  }),
  passo_roccia: passo((s) => {
    s.rumore({ durata: 0.03, vol: 1, filtro: 'bandpass', da: s.tra(2300, 2900), q: 1.5 });
    s.tono({ da: s.tra(220, 260), a: 150, durata: 0.035, vol: 0.6 });
  }),
  passo_ghiaccio: passo((s) => {
    s.rumore({ durata: 0.07, vol: 0.8, filtro: 'highpass', da: 3500 });
    detriti(s, 3, 0, 0.06, 0.8, 4500, 7000, 6);
  }, 2),
  passo_ferro: passo((s) => {
    s.modi({ base: s.tra(600, 690), rapporti: [1, 2.76, 5.4], code: [0.13, 0.08, 0.05], vol: 0.7 });
    s.rumore({ durata: 0.012, vol: 0.7, filtro: 'highpass', da: 2500 });
  }, 2),
  /** tintinnio delle fibbie quando corre */
  fibbia: {
    canale: 'effetti', volume: 0.14, durata: 0.12, varianti: 2, maxIstanze: 2,
    ricetta(s) {
      const b = s.tra(2900, 3600);
      s.modi({ base: b, rapporti: [1, 1.48, 2.1], code: [0.06, 0.04, 0.03], vol: 0.8 });
      s.modi({ t: s.tra(0.02, 0.04), base: b * 1.12, rapporti: [1, 1.48], code: [0.05, 0.03], vol: 0.5 });
    },
  },
} satisfies Ricettario;
