// Mare, casse, segnali del turno e versi lontani (08 §3.4-3.6).
import type { Ricettario } from '../tipi';
import { bolle, campana, scricchiolio } from './comuni';

export const MONDO = {
  /** un pirata finisce in mare */
  splash_grande: {
    canale: 'effetti', volume: 0.75, durata: 1.3, varianti: 2,
    ricetta(s) {
      s.tono({ da: 190, a: 60, durata: 0.22, vol: 0.8 });
      s.rumore({ durata: 0.5, vol: 0.9, attacco: 0.015, da: 500, a: 1300 });
      s.rumore({ t: 0.03, durata: 1.15, vol: 0.55, attacco: 0.08, filtro: 'bandpass', da: 1600, a: 4200, q: 0.5 });
      bolle(s, 7, 0.3, 1.1, 0.35);
    },
  },
  /** un proiettile o una cassa in mare */
  splash_piccolo: {
    canale: 'effetti', volume: 0.5, durata: 0.5, varianti: 2,
    ricetta(s) {
      s.tono({ da: 430, a: 160, durata: 0.08, vol: 0.8 });
      s.rumore({ durata: 0.38, vol: 0.7, attacco: 0.02, filtro: 'bandpass', da: 2200, a: 4600, q: 0.6 });
      bolle(s, 3, 0.12, 0.4, 0.4, 500, 1100);
    },
  },
  /** annegamento: gorgoglio e bolle */
  annega: {
    freq: 16000, canale: 'effetti', volume: 0.5, durata: 1.5,
    ricetta(s) {
      s.rumore({ durata: 1.4, vol: 0.3, attacco: 0.1, da: 320 });
      bolle(s, 16, 0.02, 1.35, 0.8, 250, 700);
    },
  },
  /** il mare sale: rombo d'onda e legni che gemono */
  mare_sale: {
    freq: 24000, canale: 'effetti', volume: 0.8, durata: 2.0,
    ricetta(s) {
      s.rumore({ durata: 2.0, vol: 1, attacco: 0.6, tenuta: 0.4, da: 220, a: 520, verso: s.satura(2) });
      s.rumore({ t: 0.2, durata: 1.7, vol: 0.35, attacco: 0.7, filtro: 'bandpass', da: 1400, a: 2600, q: 0.5 });
      scricchiolio(s, 0.45, 0.5, 0.5, 850);
      scricchiolio(s, 1.15, 0.6, 0.45, 700);
    },
  },
  /** una cassa scende dal cielo: la tela del paracadute che sbatte e un fischio che cala */
  cassa_arriva: {
    freq: 16000, canale: 'effetti', volume: 0.2, durata: 0.8,
    ricetta(s) {
      s.tono({ da: 1500, a: 720, durata: 0.7, vol: 0.5, attacco: 0.05, tenuta: 0.3, vibrato: { hz: 9, cent: 25 } });
      for (const t of [0.05, 0.22, 0.41, 0.58]) s.rumore({ t, durata: 0.09, vol: 0.6, attacco: 0.02, filtro: 'bandpass', da: 700, a: 1500, q: 1 });
    },
  },
  /** cassa di rum: due sorsi e un tintinnio contento */
  cassa_rum: {
    freq: 16000, canale: 'effetti', volume: 0.5, durata: 0.9,
    ricetta(s) {
      [0, 0.11, 0.22].forEach((t, i) => s.tono({ t, da: 300 + i * 45, a: 560 + i * 60, durata: 0.07, vol: 0.7, attacco: 0.008 }));
      s.modi({ t: 0.36, base: 1047, rapporti: [1, 2, 3.01], code: [0.35, 0.2, 0.12], vol: 0.5 });
      s.modi({ t: 0.46, base: 1319, rapporti: [1, 2, 3.01], code: [0.4, 0.22, 0.12], vol: 0.5 });
    },
  },
  /** cassa trappola: uno scatto di ferro un attimo prima del botto */
  cassa_trappola: {
    canale: 'effetti', volume: 0.55, durata: 0.3,
    ricetta(s) {
      for (const t of [0, 0.09]) {
        s.modi({ t, base: 1800, rapporti: [1, 2.3, 3.7], code: [0.035, 0.025, 0.02], vol: 0.8 });
        s.rumore({ t, durata: 0.012, vol: 0.6, filtro: 'highpass', da: 4000 });
      }
      s.tono({ tipo: 'square', da: 92, durata: 0.22, vol: 0.25, verso: s.filtro('lowpass', 500) });
    },
  },
  /** tocca a te: campana di bordo, due rintocchi */
  turno_mio: {
    freq: 16000, canale: 'effetti', volume: 0.45, durata: 1.5, maxIstanze: 1,
    ricetta(s) {
      campana(s, 0, 880, 0.8, 0.7);
      campana(s, 0.24, 880, 1, 0.9);
    },
  },
  /** tocca al nemico: un rintocco grave */
  turno_nemico: {
    freq: 16000, canale: 'effetti', volume: 0.4, durata: 1.3, maxIstanze: 1,
    ricetta(s) {
      campana(s, 0, 494, 1, 0.85);
    },
  },
  /** un pirata è morto: rintocco lento e basso */
  rintocco_morte: {
    freq: 16000, canale: 'effetti', volume: 0.45, durata: 1.8, maxIstanze: 2,
    ricetta(s) {
      campana(s, 0, 330, 1, 1.2);
    },
  },
  /** bandiera strappata: stoffa che schiocca e tre note in salita */
  bandiera_presa: {
    freq: 24000, canale: 'effetti', volume: 0.6, durata: 1.2,
    ricetta(s) {
      s.rumore({ durata: 0.2, vol: 0.7, attacco: 0.03, filtro: 'bandpass', da: 900, a: 2600, q: 0.9 });
      [587, 740, 880].forEach((hz, i) => s.modi({ t: 0.12 + i * 0.13, base: hz, rapporti: [1, 2, 3, 4.02], code: [i === 2 ? 0.7 : 0.25, 0.2, 0.14, 0.1], vol: 0.6 }));
    },
  },
  /** ultimi 5 secondi: tic (variante 0) e tac (variante 1) su un blocchetto di legno */
  timer_tic: {
    canale: 'effetti', volume: 0.4, durata: 0.08, varianti: 2, maxIstanze: 2,
    ricetta(s, variante) {
      s.modi({ base: variante === 0 ? 1180 : 940, rapporti: [1, 2.7, 4.3], code: [0.04, 0.025, 0.015], vol: 0.9 });
      s.rumore({ durata: 0.008, vol: 0.5, da: 3000 });
    },
  },
  /** ambiente: un gabbiano lontano */
  amb_gabbiano: {
    freq: 16000, canale: 'effetti', volume: 0.1, durata: 1.0, varianti: 2, maxIstanze: 1,
    ricetta(s) {
      const f = s.filtro('bandpass', 2400, 1.2);
      const quanti = 2 + Math.floor(s.rnd() * 2);
      for (let i = 0; i < quanti; i++) {
        const da = s.tra(1500, 1800);
        s.tono({ t: i * s.tra(0.24, 0.3), tipo: 'triangle', da, a: da * 0.68, durata: s.tra(0.16, 0.22), vol: 0.8, attacco: 0.03, vibrato: { hz: 28, cent: 60 }, verso: f });
      }
    },
  },
  /** ambiente: un legno che geme */
  amb_legno: {
    freq: 16000, canale: 'effetti', volume: 0.12, durata: 0.9, varianti: 2, maxIstanze: 1,
    ricetta(s) {
      scricchiolio(s, 0, s.tra(0.5, 0.8), 0.9, s.tra(600, 900));
    },
  },
} satisfies Ricettario;
