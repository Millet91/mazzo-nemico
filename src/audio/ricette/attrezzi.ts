// Fase 4, attrezzi e armi nuove (P1-contratti, Fase 4): rampino, barile rotolante, palla incatenata, arpione,
// sciabola che taglia funi e ponti, e il segnale del secondo sparo del turno. Solo registro per ora: si collegano agli
// eventi della sim quando il Lead congela il contratto. I cicli girano in tondo finché la sim non dice che è finita,
// quindi ogni colpo dentro un ciclo finisce prima della fine del giro (niente scatti quando ricomincia).
import type { Ricettario } from '../tipi';
import type { Sint } from '../sintesi';
import { detriti, piatto, scricchiolio } from './comuni';

/** un colpo sordo, con le armoniche della saturazione al posto dei bassi che il telefono non fa */
function tonfo(s: Sint, t: number, hz: number, durata: number, vol: number): void {
  s.tono({ t, da: hz, a: hz * 0.4, durata, vol, verso: s.satura(2.2) });
}

/** il ferro del rampino che sbatte: tre parziali da ancora piccola */
function ferro(s: Sint, t: number, vol: number, k = 1): void {
  s.modi({ t, base: 820 * k, rapporti: [1, 2.63, 4.4, 6.1], code: [0.22, 0.14, 0.08, 0.05], pesi: [1, 0.7, 0.45, 0.25], vol });
  s.rumore({ t, durata: 0.015, vol: vol * 0.8, filtro: 'highpass', da: 3000 });
}

/** la corda che si tende di colpo: un "tung" basso che vibra e si spegne */
function tung(s: Sint, t: number, hz: number, vol: number, durata = 0.3): void {
  s.tono({ t, tipo: 'triangle', da: hz * 1.25, a: hz, durata, vol, vibrato: { hz: 22, cent: 35 } });
  s.tono({ t, da: hz * 2, a: hz * 1.9, durata: durata * 0.6, vol: vol * 0.35 });
  s.rumore({ t, durata: 0.03, vol: vol * 0.6, filtro: 'bandpass', da: 1800, q: 1.2 });
}

/** un ciclo di colpi regolari: `ogni` secondi, l'ultimo finisce prima della fine del giro */
function aTempo(durata: number, ogni: number, colpo: (t: number, i: number) => void, margine = 0.08): void {
  for (let i = 0, t = 0.01; t < durata - margine; i++, t += ogni) colpo(t, i);
}

/** barile di legno che rotola: un brontolio cavo e le doghe che battono una volta per giro */
function rotolio(s: Sint, terreno: { hz: number; graffio: number; q: number; vol: number }): void {
  s.rumore({ ...piatto(0.8), vol: 0.6, filtro: 'lowpass', da: 320, verso: s.satura(1.6) });
  s.rumore({ ...piatto(0.8), vol: terreno.vol, filtro: 'bandpass', da: terreno.graffio, q: terreno.q });
  // due giri del barile in 0,8 s, quattro doghe che toccano per giro
  aTempo(0.8, 0.1, (t, i) => {
    const forte = i % 4 === 0 ? 1 : 0.55;
    s.modi({ t, base: terreno.hz * s.tra(0.95, 1.05), rapporti: [1, 2.1, 3.4], code: [0.06, 0.04, 0.025], vol: 0.6 * forte });
  }, 0.07);
}

export const ATTREZZI = {
  // ── rampino ──
  /** il pirata fa girare il rampino e lo lancia: frullo d'aria che sale e il ferro che tintinna */
  rampino_lancio: {
    canale: 'effetti', volume: 0.55, durata: 0.45, varianti: 2,
    ricetta(s) {
      const k = s.tra(0.92, 1.1);
      // due giri sopra la testa e il lancio
      for (const [t, v] of [[0, 0.4], [0.11, 0.6]] as const) s.rumore({ t, durata: 0.1, vol: v, attacco: 0.05, filtro: 'bandpass', da: 700 * k, a: 1400 * k, q: 1.6 });
      s.rumore({ t: 0.2, durata: 0.22, vol: 0.9, attacco: 0.06, filtro: 'bandpass', da: 900 * k, a: 2600 * k, q: 1.4 });
      ferro(s, 0.03, 0.18, k * 1.3);
      ferro(s, 0.2, 0.22, k * 1.4);
    },
  },
  /** la corda che si srotola dietro al rampino in volo (gira in tondo finché il rampino vola) */
  rampino_corda: {
    canale: 'effetti', volume: 0.3, durata: 0.6, ciclo: true, maxIstanze: 2,
    ricetta(s) {
      s.rumore({ ...piatto(0.6), vol: 0.35, filtro: 'bandpass', da: 1500, q: 0.6 });
      // le spire che si staccano dal rotolo, fitte e irregolari
      aTempo(0.6, 0.045, (t) => s.rumore({ t: t + s.tra(0, 0.01), durata: 0.03, vol: s.tra(0.35, 0.8), filtro: 'bandpass', da: s.tra(1000, 2000), q: 2 }), 0.05);
    },
  },
  /** il rampino morde la roccia: ferro su pietra, secco, e due sassolini */
  rampino_aggancio_roccia: {
    canale: 'effetti', volume: 0.6, durata: 0.4,
    ricetta(s) {
      s.rumore({ durata: 0.03, vol: 1, filtro: 'bandpass', da: 2800, q: 1.6 });
      ferro(s, 0, 0.6);
      tung(s, 0.06, 110, 0.5, 0.25);
      detriti(s, 3, 0.04, 0.3, 0.4, 1800, 3200, 4);
    },
  },
  /** il rampino si pianta nel legno: colpo sordo della trave e il ferro che vibra */
  rampino_aggancio_legno: {
    canale: 'effetti', volume: 0.6, durata: 0.4,
    ricetta(s) {
      s.modi({ base: 290, rapporti: [1, 2.3, 3.9], code: [0.12, 0.07, 0.04], vol: 0.9 });
      s.rumore({ durata: 0.03, vol: 0.7, filtro: 'bandpass', da: 1500, q: 1.2 });
      ferro(s, 0.005, 0.35, 0.9);
      tung(s, 0.06, 110, 0.5, 0.25);
    },
  },
  /** il rampino aggancia una ringhiera o un anello di ferro: clang che suona a lungo */
  rampino_aggancio_ferro: {
    canale: 'effetti', volume: 0.55, durata: 0.45,
    ricetta(s) {
      s.modi({ base: 640, rapporti: [1, 2.76, 5.4, 8.9], code: [0.38, 0.26, 0.14, 0.08], vol: 0.8 });
      ferro(s, 0, 0.6, 1.15);
      tung(s, 0.07, 110, 0.4, 0.25);
    },
  },
  /** la corda si tende sotto il peso del pirata */
  corda_tesa: {
    freq: 16000, canale: 'effetti', volume: 0.5, durata: 0.45,
    ricetta(s) {
      tung(s, 0, 95, 0.9, 0.35);
      scricchiolio(s, 0.04, 0.35, 0.6, 900);
    },
  },
  /** il pirata dondola appeso al rampino: la corda che geme e l'aria a ogni passaggio (gira in tondo) */
  rampino_dondolo: {
    freq: 24000, canale: 'effetti', volume: 0.35, durata: 1.2, ciclo: true, maxIstanze: 1,
    ricetta(s) {
      // un'andata e un ritorno in 1,2 s: l'aria più forte in basso, la corda geme agli estremi
      for (const t of [0.02, 0.62]) {
        s.rumore({ t, durata: 0.5, vol: 0.6, attacco: 0.22, filtro: 'bandpass', da: 500, a: 900, q: 0.8 });
        scricchiolio(s, t + 0.38, 0.18, 0.5, s.tra(850, 1050));
      }
    },
  },
  /** il pirata lascia la corda (o il rampino si stacca): il ferro che salta e la corda molle */
  rampino_stacco: {
    canale: 'effetti', volume: 0.45, durata: 0.3,
    ricetta(s) {
      ferro(s, 0, 0.35, 1.2);
      s.rumore({ t: 0.02, durata: 0.2, vol: 0.6, attacco: 0.02, filtro: 'bandpass', da: 1300, a: 600, q: 0.9 });
      s.tono({ t: 0.01, tipo: 'triangle', da: 140, a: 90, durata: 0.12, vol: 0.35 });
    },
  },

  // ── barile rotolante (il materiale è quello del terreno sotto il barile) ──
  barile_rotola_legno: {
    freq: 24000, canale: 'effetti', volume: 0.45, durata: 0.8, ciclo: true, maxIstanze: 2,
    ricetta: (s) => rotolio(s, { hz: 230, graffio: 900, q: 1.2, vol: 0.2 }),
  },
  barile_rotola_roccia: {
    freq: 24000, canale: 'effetti', volume: 0.45, durata: 0.8, ciclo: true, maxIstanze: 2,
    ricetta(s) {
      rotolio(s, { hz: 200, graffio: 1800, q: 0.9, vol: 0.3 });
      detriti(s, 6, 0, 0.7, 0.3, 1500, 3000, 3);
    },
  },
  barile_rotola_sabbia: {
    canale: 'effetti', volume: 0.4, durata: 0.8, ciclo: true, maxIstanze: 2,
    ricetta: (s) => rotolio(s, { hz: 180, graffio: 2200, q: 0.5, vol: 0.4 }),
  },
  /** il barile sbatte contro una parete o un pirata: botte cava, doghe che tremano, il rum che sciaborda */
  barile_urto: {
    freq: 16000, canale: 'effetti', volume: 0.6, durata: 0.5, varianti: 2,
    ricetta(s) {
      const k = s.tra(0.92, 1.08);
      tonfo(s, 0, 150 * k, 0.18, 0.9);
      s.modi({ base: 210 * k, rapporti: [1, 1.9, 3.1], code: [0.2, 0.12, 0.07], vol: 0.7 });
      s.rumore({ durata: 0.03, vol: 0.6, filtro: 'bandpass', da: 1200, q: 1 });
      // il liquido dentro
      s.rumore({ t: 0.06, durata: 0.32, vol: 0.35, attacco: 0.05, filtro: 'bandpass', da: 500, a: 900, q: 3 });
    },
  },
  /** la miccia che sfrigola (gira in tondo finché il barile non scoppia) */
  miccia: {
    canale: 'effetti', volume: 0.3, durata: 0.6, ciclo: true, maxIstanze: 2,
    ricetta(s) {
      s.rumore({ ...piatto(0.6), vol: 0.45, filtro: 'bandpass', da: 4200, q: 0.8 });
      // scintille: schiocchetti fitti e acuti
      aTempo(0.6, 0.03, (t) => s.rumore({ t: t + s.tra(0, 0.015), durata: 0.01, vol: s.tra(0.3, 1), filtro: 'highpass', da: s.tra(3000, 6000) }), 0.03);
    },
  },

  // ── palla incatenata ──
  /** in volo: due palle che girano legate alla catena, un fischio che va e viene (gira in tondo) */
  catena_volo: {
    freq: 24000, canale: 'effetti', volume: 0.4, durata: 0.6, ciclo: true, maxIstanze: 2,
    ricetta(s) {
      // otto giri al secondo: ogni passaggio è un "fiuu"
      aTempo(0.6, 0.075, (t) => {
        s.rumore({ t, durata: 0.065, vol: 0.7, attacco: 0.03, filtro: 'bandpass', da: 900, a: 1500, q: 3 });
        s.tono({ t, da: 1150, a: 1400, durata: 0.06, vol: 0.12, attacco: 0.03 });
      }, 0.07);
      // la catena che tintinna
      aTempo(0.6, 0.15, (t) => s.modi({ t: t + 0.04, base: s.tra(2300, 2700), rapporti: [1, 1.5], code: [0.03, 0.02], vol: 0.2 }), 0.08);
    },
  },
  /** arriva: due colpi di ferro pesante quasi insieme e la catena che si affloscia */
  catena_impatto: {
    freq: 16000, canale: 'effetti', volume: 0.75, durata: 0.7,
    ricetta(s) {
      tonfo(s, 0, 140, 0.25, 1);
      tonfo(s, 0.05, 125, 0.22, 0.8);
      s.modi({ base: 520, rapporti: [1, 2.76, 5.4], code: [0.2, 0.12, 0.06], vol: 0.5 });
      // anelli della catena che ricadono uno sull'altro
      for (let i = 0; i < 9; i++) {
        const t = 0.07 + i * s.tra(0.03, 0.055);
        s.modi({ t, base: s.tra(1700, 2400), rapporti: [1, 1.52, 2.3], code: [0.04, 0.03, 0.02], vol: 0.45 * (1 - i * 0.08) });
      }
    },
  },

  // ── arpione ──
  /** lo scatto dell'arpione: la molla che si libera e l'asta che parte */
  arpione_lancio: {
    canale: 'effetti', volume: 0.6, durata: 0.45,
    ricetta(s) {
      s.rumore({ durata: 0.02, vol: 0.9, filtro: 'highpass', da: 2500 });
      tung(s, 0, 160, 0.8, 0.25);
      s.rumore({ t: 0.03, durata: 0.35, vol: 0.6, attacco: 0.03, filtro: 'bandpass', da: 2400, a: 800, q: 1.4 });
      ferro(s, 0.01, 0.15, 1.5);
    },
  },
  /** la punta si pianta: colpo secco e l'asta che vibra */
  arpione_presa: {
    freq: 24000, canale: 'effetti', volume: 0.6, durata: 0.4,
    ricetta(s) {
      s.rumore({ durata: 0.025, vol: 1, filtro: 'bandpass', da: 2000, q: 1.2 });
      tonfo(s, 0, 180, 0.08, 0.6);
      // l'asta che trema ("dóoing")
      s.tono({ t: 0.01, tipo: 'triangle', da: 240, a: 200, durata: 0.35, vol: 0.45, vibrato: { hz: 18, cent: 60 } });
    },
  },
  /** la fune che tira: corda tesa che geme e il pirata (o il barile) che struscia per terra (gira in tondo) */
  arpione_trascina: {
    canale: 'effetti', volume: 0.4, durata: 0.8, ciclo: true, maxIstanze: 2,
    ricetta(s) {
      s.rumore({ ...piatto(0.8), vol: 0.5, filtro: 'bandpass', da: 1100, q: 0.6 });
      s.rumore({ ...piatto(0.8), vol: 0.4, filtro: 'lowpass', da: 260, verso: s.satura(1.4) });
      scricchiolio(s, 0.05, 0.3, 0.6, 850);
      scricchiolio(s, 0.42, 0.3, 0.5, 950);
      detriti(s, 5, 0, 0.7, 0.3, 900, 2000, 3);
    },
  },

  // ── sciabola che taglia ──
  /** la lama trancia una fune o la corda di un ponte: fendente, schiocco della corda e fibre che si sfilano */
  taglio_corda: {
    canale: 'effetti', volume: 0.6, durata: 0.4, varianti: 2,
    ricetta(s) {
      const k = s.tra(0.92, 1.1);
      s.rumore({ durata: 0.12, vol: 0.7, attacco: 0.05, filtro: 'bandpass', da: 1800 * k, a: 4500 * k, q: 2.5 });
      // la corda tesa che cede: schiocco e "tung" che scende
      s.rumore({ t: 0.1, durata: 0.02, vol: 1, filtro: 'highpass', da: 2200 });
      s.tono({ t: 0.1, tipo: 'triangle', da: 260 * k, a: 80, durata: 0.18, vol: 0.7 });
      detriti(s, 5, 0.12, 0.35, 0.4, 1600, 3200, 5);
    },
  },

  // ── turno ──
  /** il secondo sparo del turno è pronto: il cane della pistola che si arma e due note che salgono */
  sparo_pronto: {
    freq: 24000, canale: 'ui', volume: 0.5, durata: 0.45,
    ricetta(s) {
      // clic-clac
      s.rumore({ durata: 0.012, vol: 0.8, filtro: 'bandpass', da: 3200, q: 2 });
      s.modi({ base: 1900, rapporti: [1, 2.4], code: [0.03, 0.02], vol: 0.4 });
      s.rumore({ t: 0.07, durata: 0.015, vol: 0.9, filtro: 'bandpass', da: 2400, q: 2 });
      s.modi({ t: 0.07, base: 1500, rapporti: [1, 2.6], code: [0.04, 0.02], vol: 0.45 });
      // due note che salgono (quinta), come "di nuovo!"
      s.tono({ t: 0.13, tipo: 'triangle', da: 784, durata: 0.12, vol: 0.45, attacco: 0.005 });
      s.tono({ t: 0.22, tipo: 'triangle', da: 1175, durata: 0.2, vol: 0.5, attacco: 0.005 });
    },
  },
} satisfies Ricettario;
