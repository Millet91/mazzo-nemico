// Fase 3, il campo si spezza (P1-contratti §7): pezzi che si staccano, macerie che arrivano giù, massi che rotolano,
// legno che brucia, sabbia che frana, ponte che resta appeso a un capo. Tre famiglie di materiale: legno, roccia
// (anche ghiaccio e ferro, con l'intonazione) e sabbia (anche terra). Niente sotto i 55 Hz: il telefono non li suona.
import type { Ricettario } from '../tipi';
import type { Sint } from '../sintesi';
import { detriti, piatto, scricchiolio } from './comuni';

/** un colpo sordo, con le armoniche della saturazione al posto dei bassi che il telefono non fa */
function tonfo(s: Sint, t: number, hz: number, durata: number, vol: number): void {
  s.tono({ t, da: hz, a: hz * 0.4, durata, vol, verso: s.satura(2.2) });
}

export const CROLLI = {
  // ── il pezzo si stacca ──
  /** legno che cede: schiocchi secchi, la trave che geme, lo strappo */
  crollo_legno: {
    freq: 24000, canale: 'effetti', volume: 0.6, durata: 0.75,
    ricetta(s) {
      detriti(s, 6, 0, 0.18, 0.8, 1800, 3400, 7);
      scricchiolio(s, 0.04, 0.4, 0.8, 700);
      s.modi({ t: 0.22, base: s.tra(260, 320), rapporti: [1, 2.2, 3.7], code: [0.18, 0.1, 0.06], vol: 0.8 });
      s.rumore({ t: 0.22, durata: 0.06, vol: 0.9, filtro: 'bandpass', da: 1600, q: 1.4 });
      detriti(s, 5, 0.26, 0.7, 0.5, 900, 2200, 4);
    },
  },
  /** roccia che si spacca: la crepa e poi la pietra che stride mentre scivola via */
  crollo_roccia: {
    freq: 24000, canale: 'effetti', volume: 0.65, durata: 0.8,
    ricetta(s) {
      s.rumore({ durata: 0.05, vol: 1, filtro: 'bandpass', da: 2600, q: 2 });
      s.modi({ base: 780, rapporti: [1, 1.6, 2.7], code: [0.09, 0.06, 0.04], vol: 0.5 });
      s.rumore({ t: 0.04, durata: 0.7, vol: 0.8, attacco: 0.08, filtro: 'lowpass', da: 700, a: 220, verso: s.satura(2) });
      detriti(s, 8, 0.05, 0.7, 0.6, 500, 1500, 3);
    },
  },
  /** sabbia e terra che si sfaldano: un fruscio che si stacca, granelli */
  crollo_sabbia: {
    canale: 'effetti', volume: 0.5, durata: 0.7,
    ricetta(s) {
      s.rumore({ durata: 0.6, vol: 0.9, attacco: 0.06, filtro: 'bandpass', da: 2400, a: 900, q: 0.6 });
      s.rumore({ durata: 0.4, vol: 0.4, attacco: 0.03, filtro: 'lowpass', da: 600, a: 250 });
      detriti(s, 10, 0.02, 0.65, 0.5, 2500, 5000, 4);
    },
  },
  /** il masso che rotola giù: brontolio e colpi della pietra sul terreno (gira in tondo finché non si ferma) */
  masso_rotola: {
    freq: 24000, canale: 'effetti', volume: 0.5, durata: 1.0, ciclo: true, maxIstanze: 2,
    ricetta(s) {
      s.rumore({ ...piatto(1.0), vol: 0.7, filtro: 'lowpass', da: 380, verso: s.satura(1.8) });
      s.rumore({ ...piatto(1.0), vol: 0.2, filtro: 'bandpass', da: 1300, q: 0.7 });
      // quattro colpi della pietra che gira (1 giro al secondo, il ciclo ricomincia senza scatti)
      for (const t of [0.02, 0.27, 0.52, 0.77]) {
        tonfo(s, t, s.tra(140, 170), 0.12, 0.6);
        s.rumore({ t, durata: 0.04, vol: 0.5, filtro: 'bandpass', da: s.tra(900, 1300), q: 1.5 });
      }
    },
  },

  // ── il pezzo arriva giù e si frantuma ──
  macerie_legno: {
    freq: 16000, canale: 'effetti', volume: 0.6, durata: 0.8,
    ricetta(s) {
      tonfo(s, 0, 170, 0.14, 0.8);
      // assi che rimbalzano e si accatastano
      for (let i = 0; i < 5; i++) {
        const t = 0.03 + i * s.tra(0.07, 0.12);
        s.modi({ t, base: s.tra(300, 480), rapporti: [1, 2.4, 4], code: [0.08, 0.05, 0.03], vol: 0.7 * (1 - i * 0.15) });
      }
      detriti(s, 6, 0.05, 0.7, 0.5, 1200, 2800, 5);
    },
  },
  macerie_roccia: {
    freq: 16000, canale: 'effetti', volume: 0.7, durata: 0.9,
    ricetta(s) {
      tonfo(s, 0, 130, 0.3, 1);
      s.rumore({ durata: 0.25, vol: 0.8, filtro: 'lowpass', da: 1400, a: 300 });
      s.rumore({ durata: 0.04, vol: 0.8, filtro: 'bandpass', da: 2200, q: 1.5 });
      detriti(s, 12, 0.04, 0.85, 0.8, 600, 2000, 3);
    },
  },
  macerie_sabbia: {
    canale: 'effetti', volume: 0.55, durata: 0.7,
    ricetta(s) {
      tonfo(s, 0, 150, 0.16, 0.7);
      s.rumore({ durata: 0.6, vol: 0.9, attacco: 0.015, filtro: 'bandpass', da: 3200, a: 1500, q: 0.5 });
      detriti(s, 8, 0.03, 0.6, 0.4, 3000, 6000, 4);
    },
  },

  // ── legno che brucia ──
  /** il legno prende fuoco: una vampata */
  fuoco_accende: {
    canale: 'effetti', volume: 0.5, durata: 0.55,
    ricetta(s) {
      s.rumore({ durata: 0.5, vol: 0.9, attacco: 0.09, filtro: 'bandpass', da: 350, a: 2200, q: 0.7 });
      s.rumore({ t: 0.05, durata: 0.45, vol: 0.4, attacco: 0.1, filtro: 'highpass', da: 3500 });
      detriti(s, 4, 0.15, 0.5, 0.5, 2500, 5000, 6);
    },
  },
  /** il fuoco che crepita finché dura (in ciclo): un respiro basso e gli schiocchi del legno */
  fuoco_ciclo: {
    freq: 24000, canale: 'effetti', volume: 0.32, durata: 1.6, ciclo: true, maxIstanze: 3,
    ricetta(s) {
      s.rumore({ ...piatto(1.6), vol: 0.45, filtro: 'lowpass', da: 700 });
      s.rumore({ ...piatto(1.6), vol: 0.12, filtro: 'bandpass', da: 2500, q: 0.6 });
      // schiocchi sparsi su tutto il giro, non più fitti all'inizio: il ciclo non deve "ripartire" a orecchio
      for (let i = 0; i < 14; i++) {
        const t = s.tra(0.01, 1.52);
        s.rumore({ t, durata: s.tra(0.008, 0.025), vol: s.tra(0.4, 1), filtro: 'bandpass', da: s.tra(1800, 5200), q: s.tra(2, 6) });
      }
    },
  },
  /** il fuoco si spegne e il legno bruciato si sbriciola */
  fuoco_spegne: {
    canale: 'effetti', volume: 0.4, durata: 0.55,
    ricetta(s) {
      s.rumore({ durata: 0.45, vol: 0.7, attacco: 0.01, filtro: 'highpass', da: 4200, a: 2200 });
      detriti(s, 6, 0.08, 0.5, 0.5, 900, 2200, 4);
    },
  },

  // ── sabbia e ponti ──
  /** la sabbia che scende nel buco (al più tre quarti di secondo, come la frana della sim) */
  frana: {
    canale: 'effetti', volume: 0.4, durata: 0.8,
    ricetta(s) {
      s.rumore({ durata: 0.75, vol: 0.9, attacco: 0.1, filtro: 'bandpass', da: 2800, a: 1600, q: 0.6 });
      s.rumore({ durata: 0.6, vol: 0.3, attacco: 0.1, filtro: 'lowpass', da: 500 });
      detriti(s, 12, 0.05, 0.75, 0.4, 3500, 6500, 5);
    },
  },
  /** il ponte perde un capo: le corde che si strappano, il legno che geme e sbatte contro la parete */
  ponte_calato: {
    canale: 'effetti', volume: 0.65, durata: 1.4,
    ricetta(s) {
      s.tono({ tipo: 'triangle', da: 360, a: 90, durata: 0.15, vol: 0.8 });
      s.rumore({ durata: 0.05, vol: 0.9, filtro: 'highpass', da: 3200 });
      scricchiolio(s, 0.05, 0.6, 0.8, 800);
      s.rumore({ t: 0.08, durata: 0.5, vol: 0.4, attacco: 0.15, filtro: 'bandpass', da: 600, a: 1500, q: 0.8 });
      // le assi che sbattono contro la parete, sempre più piano
      for (const [t, v] of [[0.55, 1], [0.85, 0.6], [1.08, 0.35]] as const) {
        tonfo(s, t, 190, 0.1, 0.6 * v);
        s.modi({ t, base: s.tra(260, 330), rapporti: [1, 2.3, 3.8], code: [0.12, 0.07, 0.04], vol: 0.7 * v });
      }
    },
  },
} satisfies Ricettario;
