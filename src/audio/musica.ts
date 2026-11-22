// Musica segnaposto procedurale (studio v2, audio §3.5): niente file e niente crediti. Due brani in re dorico,
// 8 battute che girano in tondo; la melodia cambia a ogni giro, così non si sente sempre la stessa frase.
// - `menu`: 96 BPM, tranquilla, col motivo di 5 note in chiaro;
// - `battaglia`: 112 BPM a due strati: la base suona sempre, le percussioni entrano quando il mare sale e per
//   8 battute quando muore un pirata.
// Le note le decide una funzione pura (si prova con Vitest); il sequencer le manda al contesto audio un po' in anticipo.
import { generatore } from './sintesi';
import { suonaNota, type Strumento } from './strumenti';

/** Motivo-firma di 5 note (08 §1): la re mi fa re. In maggiore (fa diesis) per la vittoria. */
export const MOTIVO: readonly number[] = [69, 74, 76, 77, 74];
export const MOTIVO_MAGGIORE: readonly number[] = [69, 74, 76, 78, 74];

export interface Nota {
  /** battito dall'inizio del giro */
  b: number;
  /** durata in battiti */
  d: number;
  /** altezza MIDI (le percussioni la ignorano) */
  m: number;
  s: Strumento;
  /** volume 0..1 */
  v: number;
  /** 0 = base, 1 = percussioni che entrano e escono */
  strato: 0 | 1;
}

export interface Brano {
  bpm: number;
  /** battiti di un giro (8 battute da 4) */
  battiti: number;
  /** le note del giro numero `giro` (da 0), in ordine di tempo */
  note(giro: number): Nota[];
}

export type IdBrano = 'menu' | 'battaglia';

interface Accordo { basso: number; triade: [number, number, number] }
const RE_MIN: Accordo = { basso: 38, triade: [62, 65, 69] };
const SOL: Accordo = { basso: 43, triade: [62, 67, 71] };
const DO: Accordo = { basso: 36, triade: [64, 67, 72] };
const FA: Accordo = { basso: 41, triade: [60, 65, 69] };

/** Le note della scala di re dorico (re mi fa sol la si do), come classi di altezza. */
export const RE_DORICO: readonly number[] = [2, 4, 5, 7, 9, 11, 0];

type Frase = readonly (readonly [b: number, d: number, m: number])[];

// Frasi della fisarmonica, due battute l'una (8 battiti). Note d'accordo sui tempi forti, il resto di passaggio.
const FRASI_RE_SOL: readonly Frase[] = [
  [[0, 0.5, 69], [0.5, 0.5, 74], [1, 0.5, 76], [1.5, 1.5, 77], [3, 1, 74], [4, 1, 71], [5, 0.5, 67], [5.5, 0.5, 69], [6, 1.5, 71]],
  [[0, 1, 74], [1, 0.5, 69], [1.5, 0.5, 74], [2, 1, 77], [3, 1, 76], [4, 1.5, 74], [5.5, 0.5, 71], [6, 2, 67]],
  [[0, 0.5, 74], [0.5, 0.5, 76], [1, 0.5, 77], [1.5, 1.5, 81], [3, 1, 77], [4, 1, 79], [5, 0.5, 74], [5.5, 0.5, 71], [6, 2, 74]],
];
const FRASI_RE_DO: readonly Frase[] = [
  [[0, 1, 77], [1, 0.5, 76], [1.5, 0.5, 74], [2, 2, 69], [4, 0.5, 67], [4.5, 0.5, 72], [5, 1, 76], [6, 0.5, 74], [6.5, 1.5, 72]],
  [[0, 0.5, 69], [0.5, 0.5, 69], [1, 1, 74], [2, 0.5, 77], [2.5, 0.5, 76], [3, 1, 74], [4, 1.5, 76], [5.5, 0.5, 72], [6, 2, 67]],
];
const FRASI_FINALE: readonly Frase[] = [
  [[0, 0.5, 69], [0.5, 0.5, 72], [1, 1, 77], [2, 1, 76], [3, 1, 72], [4, 3, 74]],
  [[0, 0.5, 72], [0.5, 0.5, 69], [1, 1, 65], [2, 0.5, 67], [2.5, 0.5, 72], [3, 1, 76], [4, 1, 74], [5, 1, 69], [6, 2, 62]],
];

function noteBattaglia(giro: number): Nota[] {
  const caso = generatore(giro * 7919 + 13);
  const note: Nota[] = [];
  // re minore | sol | re minore | do | re minore | sol | fa e do | re minore   (il sol maggiore è il colore dorico)
  const battute: Accordo[][] = [[RE_MIN], [SOL], [RE_MIN], [DO], [RE_MIN], [SOL], [FA, DO], [RE_MIN]];
  battute.forEach((accordi, i) => {
    const o = i * 4;
    const meta = 4 / accordi.length;
    accordi.forEach((a, k) => {
      const inizio = o + k * meta;
      // basso: fondamentale, poi la quinta ("um-pa" da shanty)
      note.push({ b: inizio, d: 0.9, m: a.basso, s: 'basso', v: 0.75, strato: 0 });
      if (accordi.length === 1) {
        note.push({ b: o + 2, d: 0.9, m: a.basso + 7, s: 'basso', v: 0.6, strato: 0 });
        if (caso() < 0.4) note.push({ b: o + 3.5, d: 0.45, m: a.basso + 7, s: 'basso', v: 0.45, strato: 0 });
      }
      // pizzicato sui tempi deboli
      for (const b of accordi.length === 1 ? [1, 1.5, 3, 3.5] : [1, 1.5]) {
        a.triade.forEach((m, j) => note.push({ b: inizio + b + j * 0.03, d: 0.25, m, s: 'pizzico', v: b % 1 ? 0.16 : 0.22, strato: 0 }));
      }
    });
    // strato 1: percussioni
    note.push({ b: o, d: 0, m: 0, s: 'cassa', v: 0.7, strato: 1 }, { b: o + 2, d: 0, m: 0, s: 'cassa', v: 0.6, strato: 1 });
    if (i % 4 === 3) note.push({ b: o + 2.5, d: 0, m: 0, s: 'cassa', v: 0.5, strato: 1 });
    note.push({ b: o + 1, d: 0, m: 0, s: 'rullante', v: 0.3, strato: 1 }, { b: o + 3, d: 0, m: 0, s: 'rullante', v: 0.32, strato: 1 });
    if (i % 2 === 1) note.push({ b: o + 3, d: 0, m: 0, s: 'mani', v: 0.3, strato: 1 });
    for (let e = 0; e < 8; e++) note.push({ b: o + e * 0.5, d: 0, m: 0, s: 'sonaglio', v: e % 2 ? 0.13 : 0.07, strato: 1 });
    if (i === 7) for (const b of [3, 3.5, 3.75]) note.push({ b: o + b, d: 0, m: 0, s: 'tamburo', v: 0.5, strato: 1 });
  });
  // melodia: al primo giro entra a metà; poi ogni coppia di battute ha una frase scelta a caso, o una pausa
  const coppie: [number, readonly Frase[], number][] = [
    [0, FRASI_RE_SOL, giro === 0 ? 1 : 0.25],
    [8, FRASI_RE_DO, giro === 0 ? 1 : 0.3],
    [16, FRASI_RE_SOL, 0.15],
    [24, FRASI_FINALE, 0],
  ];
  for (const [o, frasi, pausa] of coppie) {
    const tace = caso() < pausa;
    const frase = frasi[Math.floor(caso() * frasi.length)];
    if (tace) continue;
    for (const [b, d, m] of frase) note.push({ b: o + b, d: d * 0.92, m, s: 'fisa', v: 0.3, strato: 0 });
  }
  return note.sort((x, y) => x.b - y.b);
}

function noteMenu(giro: number): Nota[] {
  const note: Nota[] = [];
  const accordi: Accordo[] = [RE_MIN, RE_MIN, SOL, SOL, DO, DO, RE_MIN, RE_MIN];
  accordi.forEach((a, i) => {
    const o = i * 4;
    note.push({ b: o, d: 3, m: a.basso, s: 'basso', v: 0.55, strato: 0 });
    // arpeggio di pizzicato; al primo giro entra dalla terza battuta, per lasciare il motivo da solo
    if (giro > 0 || i >= 2) {
      const [t0, t1, t2] = a.triade;
      [t0, t2, t1 + 12, t2, t0 + 12, t2, t1 + 12, t2].forEach((m, e) => note.push({ b: o + e * 0.5, d: 0.25, m, s: 'pizzico', v: e === 0 ? 0.2 : 0.14, strato: 0 }));
    }
    if (giro > 0) note.push({ b: o, d: 0, m: 0, s: 'tamburo', v: 0.22, strato: 0 }, { b: o + 2.5, d: 0, m: 0, s: 'tamburo', v: 0.14, strato: 0 });
  });
  // quattro frasi di 5 note con lo stesso ritmo del motivo: la re mi fa re · si re mi re si · do mi sol mi do · la re fa mi re
  const frasi = [MOTIVO, [71, 74, 76, 74, 71], [72, 76, 79, 76, 72], [69, 74, 77, 76, 74]];
  const ritmo: [number, number][] = [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 1.5], [3, 3.5]];
  frasi.forEach((f, k) => f.forEach((m, j) => note.push({ b: k * 8 + ritmo[j][0], d: ritmo[j][1] * 0.95, m, s: 'fisa', v: 0.3, strato: 0 })));
  return note.sort((x, y) => x.b - y.b);
}

export const BRANI: Record<IdBrano, Brano> = {
  menu: { bpm: 96, battiti: 32, note: noteMenu },
  battaglia: { bpm: 112, battiti: 32, note: noteBattaglia },
};

/** Sequencer: tiene il tempo sul contesto audio e programma le note fino a un orizzonte. */
export class Musica {
  private brano: IdBrano | null = null;
  private uscita: GainNode | null = null;
  private inizio = 0;
  private giro = 0;
  private note: Nota[] = [];
  private indice = 0;
  /** lo strato 1 suona tra questi due battiti assoluti (contati dall'inizio del brano) */
  private strato1Da = Infinity;
  private strato1Fino = -Infinity;

  /**
   * `suonatore`: come si suona una nota. Predefinito: sintesi dal vivo (banco e test); il gioco passa quello delle
   * note pronte (note.ts), che costa molto meno processore.
   */
  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly dest: AudioNode,
    private readonly suonatore: (dest: AudioNode, n: Nota, t: number, durata: number) => void =
      (dest, n, t, durata) => suonaNota(ctx, dest, n.s, n.m, t, durata, n.v),
  ) {}

  get inCorso(): IdBrano | null { return this.brano; }

  private get secondiPerBattito(): number { return this.brano ? 60 / BRANI[this.brano].bpm : 1; }

  /** battito assoluto (dall'inizio del brano) all'istante `t` del contesto */
  battito(t: number = this.ctx.currentTime): number {
    return Math.max(0, (t - this.inizio) / this.secondiPerBattito);
  }

  /** Avvia un brano (se è già quello non fa niente); il precedente sfuma. */
  avvia(id: IdBrano, dissolvenza = 1.5): void {
    if (this.brano === id) return;
    this.ferma(dissolvenza);
    const ora = this.ctx.currentTime;
    this.brano = id;
    this.uscita = this.ctx.createGain();
    this.uscita.gain.setValueAtTime(0.0001, ora);
    this.uscita.gain.exponentialRampToValueAtTime(1, ora + Math.max(0.05, dissolvenza * 0.5));
    this.uscita.connect(this.dest);
    this.inizio = ora + 0.08;
    this.giro = 0;
    this.note = BRANI[id].note(0);
    this.indice = 0;
    this.strato1Da = Infinity;
    this.strato1Fino = -Infinity;
  }

  /** Ferma la musica con una dissolvenza. */
  ferma(dissolvenza = 0.3): void {
    const g = this.uscita;
    if (g) {
      const ora = this.ctx.currentTime;
      g.gain.cancelScheduledValues(ora);
      g.gain.setTargetAtTime(0, ora, Math.max(0.01, dissolvenza / 3));
      if (typeof setTimeout === 'function') setTimeout(() => g.disconnect(), dissolvenza * 1000 + 600);
    }
    this.uscita = null;
    this.brano = null;
  }

  /** Accende le percussioni dalla prossima battuta: per sempre, o per tante battute. */
  accendiStrato(battute?: number, quando: number = this.ctx.currentTime): void {
    if (!this.brano) return;
    const prossima = Math.ceil(this.battito(quando) / 4) * 4;
    this.strato1Da = Math.min(this.strato1Da, prossima);
    this.strato1Fino = battute === undefined ? Infinity : Math.max(this.strato1Fino, prossima + battute * 4);
  }

  get stratoAcceso(): boolean {
    const b = this.battito();
    return b >= this.strato1Da && b < this.strato1Fino;
  }

  /** Programma tutte le note che cominciano prima di `orizzonte` (tempo del contesto). Si chiama spesso. */
  programma(orizzonte: number): void {
    if (!this.brano || !this.uscita) return;
    const brano = BRANI[this.brano];
    const spb = this.secondiPerBattito;
    const ora = this.ctx.currentTime;
    for (;;) {
      if (this.indice >= this.note.length) {
        this.giro++;
        this.note = brano.note(this.giro);
        this.indice = 0;
        if (!this.note.length) return;
      }
      const n = this.note[this.indice];
      const assoluto = this.giro * brano.battiti + n.b;
      const t = this.inizio + assoluto * spb;
      if (t >= orizzonte) return;
      this.indice++;
      // nota rimasta indietro (il telefono era occupato): si salta, meglio un buco che una raffica
      if (t < ora - 0.05) continue;
      if (n.strato === 1 && !(assoluto >= this.strato1Da && assoluto < this.strato1Fino)) continue;
      this.suonatore(this.uscita, n, Math.max(t, ora), n.d * spb);
    }
  }
}
