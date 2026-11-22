// Jingle di fine battaglia (08 §2): vittoria in re maggiore col motivo di 5 note, sconfitta in re minore con la
// fisarmonica che "si sgonfia" e una campana lontana. Suonati con gli strumenti della musica segnaposto.
import type { Ricettario } from '../tipi';
import { suonaNota } from '../strumenti';
import { campana } from './comuni';
import { MOTIVO_MAGGIORE } from '../musica';

export const JINGLE = {
  mus_vittoria: {
    canale: 'musica', volume: 0.9, durata: 3.6, maxIstanze: 1,
    ricetta(s) {
      const b = 0.25; // un ottavo a 120 BPM
      const tempi = [0, 1, 2, 3, 5]; // in ottavi
      const durate = [1, 1, 1, 2, 2];
      MOTIVO_MAGGIORE.forEach((m, i) => suonaNota(s.ctx, s.out, 'fisa', m, tempi[i] * b, durate[i] * b * 0.9, 0.5));
      MOTIVO_MAGGIORE.forEach((m, i) => suonaNota(s.ctx, s.out, 'pizzico', m + 12, tempi[i] * b, 0.2, 0.3));
      // accordo finale di re maggiore, con la ciurma che batte le mani ("hey!")
      const t = 8 * b;
      for (const m of [62, 66, 69, 74]) suonaNota(s.ctx, s.out, 'fisa', m, t, 1.1, 0.3);
      suonaNota(s.ctx, s.out, 'basso', 38, t, 1.2, 0.8);
      suonaNota(s.ctx, s.out, 'cassa', 0, t, 0, 0.8);
      suonaNota(s.ctx, s.out, 'mani', 0, t, 0, 0.5);
      suonaNota(s.ctx, s.out, 'mani', 0, t + 2 * b, 0, 0.5);
      suonaNota(s.ctx, s.out, 'tamburo', 0, t + 2 * b, 0, 0.6);
    },
  },
  mus_sconfitta: {
    canale: 'musica', volume: 0.8, durata: 3.8, maxIstanze: 1,
    ricetta(s) {
      const b = 0.75;
      suonaNota(s.ctx, s.out, 'fisa', 65, 0, b * 0.9, 0.5);
      suonaNota(s.ctx, s.out, 'fisa', 64, b, b * 0.9, 0.5);
      // l'ultima nota si sgonfia
      suonaNota(s.ctx, s.out, 'fisa', 62, 2 * b, 1.7, 0.5, { cala: 220 });
      suonaNota(s.ctx, s.out, 'fisa', 57, 2 * b, 1.5, 0.3, { cala: 220 });
      suonaNota(s.ctx, s.out, 'basso', 38, 2 * b, 1.4, 0.7);
      campana(s, 2 * b + 0.25, 294, 0.25, 1.1);
    },
  },
} satisfies Ricettario;
