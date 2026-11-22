// Risoluzione del canvas (Fase 2, PIANO §3): fino a 2 px fisici per px CSS, con regolazione dinamica. Se il telefono
// fatica (frame oltre 14,5 ms di lavoro, o frame saltati) si scende a 1,5 e poi a 1,25; non si risale nella stessa
// sessione, così la nitidezza non va su e giù.
//
// "Fatica" = in una finestra di 2 s (almeno 30 frame), più del 30% dei frame sono lenti. Un frame è lento se il lavoro sulla CPU (dal primo
// all'ultimo callback del ticker, disegno compreso) supera 14,5 ms, oppure se il frame arriva in ritardo di più di
// mezzo intervallo dello schermo (la GPU non ce la fa: il suo tempo non si vede dalla CPU).
// Si ignorano i frame dopo una pausa (> 250 ms) e per 3 s dopo l'avvio di una battaglia o un cambio di risoluzione
// (carichi e preparazioni hanno scatti che non dicono niente sul disegno di tutti i giorni).

/** livelli possibili, dal più nitido */
export const LIVELLI_RISOLUZIONE = [2, 1.5, 1.25] as const;
/** lavoro per frame oltre il quale il frame conta come lento (ms) */
export const LAVORO_MAX_MS = 14.5;
const FINESTRA_MS = 2000;
const FINESTRA_FRAME_MIN = 30;
const QUOTA_LENTI = 0.3;
const PAUSA_MS = 250;
const ATTESA_MS = 3000;

/** I livelli che hanno senso su questo schermo: mai sopra il devicePixelRatio (almeno uno). */
export function livelliPer(dpr: number): number[] {
  const l = LIVELLI_RISOLUZIONE.filter((r) => r <= dpr + 1e-6);
  return l.length ? l : [Math.max(1, Math.min(dpr, LIVELLI_RISOLUZIONE[LIVELLI_RISOLUZIONE.length - 1]))];
}

/** Regola pura: riceve i frame, dice quando scendere di livello. */
export class RegolaRisoluzione {
  readonly livelli: number[];
  private indice = 0;
  private lenti = 0;
  private contati = 0;
  private tempoMs = 0;
  private delta: number[] = [];
  private attesaMs = ATTESA_MS;

  constructor(dpr: number) {
    this.livelli = livelliPer(dpr);
  }

  get risoluzione(): number { return this.livelli[this.indice]; }

  /** Non giudicare per `ms` (avvio di una battaglia, caricamenti). */
  aspetta(ms = ATTESA_MS): void {
    this.attesaMs = Math.max(this.attesaMs, ms);
    this.azzera();
  }

  /**
   * Un frame: `deltaMs` dal frame prima, `lavoroMs` di lavoro sulla CPU. Torna la nuova risoluzione se bisogna
   * cambiarla, altrimenti null.
   */
  frame(deltaMs: number, lavoroMs: number): number | null {
    if (deltaMs > PAUSA_MS) return null;
    if (this.attesaMs > 0) { this.attesaMs -= deltaMs; return null; }
    if (this.indice >= this.livelli.length - 1) return null;
    this.delta.push(deltaMs);
    // l'intervallo dello schermo: il delta più basso tra i più frequenti (10° percentile della finestra)
    const ordinati = [...this.delta].sort((a, b) => a - b);
    const intervallo = Math.max(6.9, ordinati[Math.floor(ordinati.length * 0.1)]);
    if (lavoroMs > LAVORO_MAX_MS || (this.delta.length >= 20 && deltaMs > intervallo * 1.5)) this.lenti++;
    this.contati++;
    this.tempoMs += deltaMs;
    if (this.tempoMs < FINESTRA_MS || this.contati < FINESTRA_FRAME_MIN) return null;
    const scendi = this.lenti > this.contati * QUOTA_LENTI;
    this.azzera();
    if (!scendi) return null;
    this.indice++;
    this.attesaMs = ATTESA_MS;
    return this.risoluzione;
  }

  private azzera(): void {
    this.lenti = 0;
    this.contati = 0;
    this.tempoMs = 0;
    this.delta = [];
  }
}

/** la regola dell'app (una sola): la Regista la avvisa all'avvio di una battaglia */
let attiva: RegolaRisoluzione | null = null;
export function impostaRegolaRisoluzione(r: RegolaRisoluzione | null): void { attiva = r; }
/** Avvio di una battaglia o un caricamento pesante: per un po' gli scatti non contano. */
export function aspettaRisoluzione(ms?: number): void { attiva?.aspetta(ms); }
/** La risoluzione di adesso (per la Diagnostica), o null prima dell'avvio della grafica. */
export function risoluzioneAttuale(): number | null { return attiva?.risoluzione ?? null; }
