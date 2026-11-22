// Chi suona adesso: al massimo 24 voci, 3 copie dello stesso suono; quando non c'è posto si ruba la più vecchia.
// Niente WebAudio qui, così si prova con Vitest.

export interface Istanza {
  id: string;
  /** tempo del contesto audio in cui finisce (Infinity per i suoni in ciclo) */
  fine: number;
  /** spegne il suono con una dissolvenza brevissima, all'istante `quando` del contesto audio */
  ferma(quando: number): void;
}

export class Polifonia {
  private attive: Istanza[] = [];

  constructor(private readonly massimo: number) {}

  get quante(): number { return this.attive.length; }

  quanteDi(id: string): number { return this.attive.filter((i) => i.id === id).length; }

  /** Fa entrare un suono nuovo; se serve ferma i più vecchi. `ora` = istante (del contesto audio) in cui parte. */
  entra(nuova: Istanza, massimoPerId: number, ora: number): void {
    this.attive = this.attive.filter((i) => i.fine > ora);
    const stesse = this.attive.filter((i) => i.id === nuova.id);
    while (stesse.length >= massimoPerId) this.togli(stesse.shift()!, ora);
    while (this.attive.length >= this.massimo) {
      // si ruba la più vecchia tra quelle che finiscono da sole; i cicli (scivolata) per ultimi
      const vittima = this.attive.find((i) => i.fine !== Infinity) ?? this.attive[0];
      this.togli(vittima, ora);
    }
    this.attive.push(nuova);
  }

  esce(i: Istanza): void { this.togli(i); }

  private togli(i: Istanza, fermaA?: number): void {
    const k = this.attive.indexOf(i);
    if (k >= 0) this.attive.splice(k, 1);
    if (fermaA !== undefined) i.ferma(fermaA);
  }
}
