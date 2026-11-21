// Passo fisso della simulazione: 60 tick al secondo, indipendenti dagli fps dello schermo (04 §2).
// Al massimo 5 tick per frame (13 caso 6): un frame lento non fa partire la "spirale della morte",
// il tempo in più si butta via. Al rientro dalla pausa si azzera (13 caso 24: niente tick recuperati).
import { BIL, TICK_AL_SECONDO } from '../../contenuti/bilanciamento';

export const MS_PER_TICK = 1000 / TICK_AL_SECONDO;

export class Accumulatore {
  private resto = 0;
  constructor(private readonly maxPerFrame: number = BIL.fisica.tickMaxPerFrame) {}

  /** Quanti tick eseguire per un frame lungo `deltaMS` (0..maxPerFrame). */
  passi(deltaMS: number): number {
    if (!(deltaMS > 0)) return 0;
    this.resto += deltaMS;
    let n = Math.floor(this.resto / MS_PER_TICK);
    if (n > this.maxPerFrame) {
      n = this.maxPerFrame;
      this.resto = 0; // il ritardo non si recupera
    } else {
      this.resto -= n * MS_PER_TICK;
    }
    return n;
  }

  /** Frazione del prossimo tick già trascorsa (0..1), per interpolare il disegno. */
  get alfa(): number { return Math.min(1, this.resto / MS_PER_TICK); }

  azzera(): void { this.resto = 0; }
}
