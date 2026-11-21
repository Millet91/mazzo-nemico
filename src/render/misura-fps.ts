// Contatore FPS: media e minimo sugli ultimi 60 s (13 §2 L5). Puro: riceve i deltaMS dei frame.
export class MisuraFps {
  private frame = 0;
  private tempo = 0;
  private campioni: number[] = [];
  constructor(private readonly finestraSecondi = 60) {}

  /** Registra un frame; restituisce true quando è passato un secondo (statistiche nuove). */
  frameFatto(deltaMS: number): boolean {
    this.frame++;
    this.tempo += deltaMS;
    if (this.tempo < 1000) return false;
    this.campioni.push((this.frame * 1000) / this.tempo);
    if (this.campioni.length > this.finestraSecondi) this.campioni.shift();
    this.frame = 0;
    this.tempo = 0;
    return true;
  }

  /** Dopo una pausa il primo secondo non conta (eviterebbe un minimo falso). */
  azzeraSecondo(): void { this.frame = 0; this.tempo = 0; }

  get medio(): number {
    return this.campioni.length ? Math.round(this.campioni.reduce((s, x) => s + x, 0) / this.campioni.length) : 0;
  }
  get minimo(): number {
    return this.campioni.length ? Math.round(Math.min(...this.campioni)) : 0;
  }
}
