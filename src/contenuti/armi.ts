// Le 16 armi di 00 §1.3 (nomi definitivi, con 00 §9.6: arma 7 = Rum incendiario) e i parametri di 09 §1.
// In M1 sono attive solo le 4 Base: cannone, granata, pistola, sciabola. Le altre compaiono nella griglia
// 4×4 in grigio col lucchetto. Solo il Lead modifica questo file (14: contratto della milestone).
// Unità: danno in PV, raggi in px, spinte in px/s (la sim le converte con TICK_AL_SECONDO), tempi in s.
// Studio v2 (PIANO §7, Bilanciamento): le 4 Base hanno più raggio che danno. Cannone 60/70 (era 45/55), granata 52/64
// (era 40/50), pistola 28×2 (era 18×2), sciabola 40 (era 25, spinta 450 invariata). Regole versione 2.

import type { IdArma } from '../core/tipi';

export type TipoArma =
  | 'balistica'   // proiettile che vola ed esplode all'impatto (cannone)
  | 'lancio'      // rimbalza ed esplode allo scadere della miccia (granata)
  | 'istantanea'  // colpi in linea retta, senza volo (pistola)
  | 'mischia'     // colpo davanti al pirata (sciabola)
  | 'piazzabile'  // cade ai piedi (barile, mina)
  | 'pilotata'    // pappagallo, scimmia
  | 'bersaglio'   // si tocca un punto della mappa (ancora, bordata, bussola)
  | 'utilita';    // rampino, vanga: non chiudono il turno

export type Ottenimento = 'base' | 'kit' | 'stiva' | 'cassa';

export interface DefArma {
  id: IdArma;
  /** posizione nella griglia 4×4 (1-16) */
  numero: number;
  tipo: TipoArma;
  danno: number;
  raggio: number;
  /** spinta fissa in px/s (sciabola, pistola); se assente vale danno × 7 con attenuazione (00 §1.2) */
  spintaFissa?: number;
  /** angolo della spinta fissa in gradi sopra l'orizzontale, nel verso del pirata (sciabola: 45) */
  angoloSpinta?: number;
  /** risente del vento */
  vento: boolean;
  /** miccia regolabile in secondi (granata 1-5) */
  miccia?: { min: number; max: number };
  /** coefficiente di rimbalzo sul terreno */
  rimbalzo?: number;
  /** colpi per sparo (pistola: 2) */
  colpi?: number;
  /** tick tra un colpo e l'altro (pistola) */
  intervalloColpi?: number;
  /** portata in px (pistola 500, sciabola 30) */
  portata?: number;
  /** raggio della buca scavata dal colpo istantaneo (pistola: 6) */
  buca?: number;
  /** usa la mira a fionda (angolo + potenza); false = solo angolo (pistola) o solo verso (sciabola) */
  usaPotenza: boolean;
  usaAngolo: boolean;
  chiudeTurno: boolean;
  ottenimento: Ottenimento;
  /** munizioni a inizio battaglia per le armi Base e Kit (−1 = infinite) */
  munizioni: number;
  /** milestone in cui l'arma entra nel gioco */
  milestone: 'M1' | 'M2' | 'v1';
}

const A = (d: DefArma) => d;

export const ARMI: readonly DefArma[] = [
  // ── riga 1: Base ──
  A({ id: 'cannone', numero: 1, tipo: 'balistica', danno: 60, raggio: 70, vento: true, usaPotenza: true, usaAngolo: true, chiudeTurno: true, ottenimento: 'base', munizioni: -1, milestone: 'M1' }),
  A({ id: 'granata', numero: 2, tipo: 'lancio', danno: 52, raggio: 64, vento: false, miccia: { min: 1, max: 5 }, rimbalzo: 0.5, usaPotenza: true, usaAngolo: true, chiudeTurno: true, ottenimento: 'base', munizioni: -1, milestone: 'M1' }),
  A({ id: 'pistola', numero: 3, tipo: 'istantanea', danno: 28, raggio: 0, spintaFissa: 120, colpi: 2, intervalloColpi: 30, portata: 500, buca: 6, vento: false, usaPotenza: false, usaAngolo: true, chiudeTurno: true, ottenimento: 'base', munizioni: -1, milestone: 'M1' }),
  A({ id: 'sciabola', numero: 4, tipo: 'mischia', danno: 40, raggio: 0, spintaFissa: 450, angoloSpinta: 45, portata: 30, vento: false, usaPotenza: false, usaAngolo: false, chiudeTurno: true, ottenimento: 'base', munizioni: -1, milestone: 'M1' }),
  // ── riga 2: esplosivi ──
  A({ id: 'barile', numero: 5, tipo: 'piazzabile', danno: 75, raggio: 85, miccia: { min: 5, max: 5 }, vento: false, usaPotenza: false, usaAngolo: false, chiudeTurno: true, ottenimento: 'kit', munizioni: 1, milestone: 'M2' }),
  A({ id: 'mina', numero: 6, tipo: 'piazzabile', danno: 45, raggio: 50, vento: false, usaPotenza: false, usaAngolo: false, chiudeTurno: true, ottenimento: 'kit', munizioni: 1, milestone: 'M2' }),
  A({ id: 'rum', numero: 7, tipo: 'balistica', danno: 8, raggio: 0, vento: true, usaPotenza: true, usaAngolo: true, chiudeTurno: true, ottenimento: 'stiva', munizioni: 0, milestone: 'v1' }),
  A({ id: 'pallaSpezzata', numero: 8, tipo: 'balistica', danno: 20, raggio: 30, vento: true, usaPotenza: true, usaAngolo: true, chiudeTurno: true, ottenimento: 'stiva', munizioni: 0, milestone: 'M2' }),
  // ── riga 3: speciali ──
  A({ id: 'pappagallo', numero: 9, tipo: 'pilotata', danno: 55, raggio: 60, vento: false, usaPotenza: false, usaAngolo: false, chiudeTurno: true, ottenimento: 'stiva', munizioni: 0, milestone: 'M2' }),
  A({ id: 'scimmia', numero: 10, tipo: 'pilotata', danno: 65, raggio: 70, vento: false, usaPotenza: false, usaAngolo: false, chiudeTurno: true, ottenimento: 'cassa', munizioni: 0, milestone: 'v1' }),
  A({ id: 'ancora', numero: 11, tipo: 'bersaglio', danno: 40, raggio: 30, vento: false, usaPotenza: false, usaAngolo: false, chiudeTurno: true, ottenimento: 'stiva', munizioni: 0, milestone: 'M2' }),
  A({ id: 'bordata', numero: 12, tipo: 'bersaglio', danno: 30, raggio: 40, vento: true, usaPotenza: false, usaAngolo: false, chiudeTurno: true, ottenimento: 'cassa', munizioni: 0, milestone: 'v1' }),
  // ── riga 4: utilità e Kraken ──
  A({ id: 'rampino', numero: 13, tipo: 'utilita', danno: 0, raggio: 0, vento: false, usaPotenza: false, usaAngolo: true, chiudeTurno: false, ottenimento: 'base', munizioni: -1, milestone: 'M2' }),
  A({ id: 'vanga', numero: 14, tipo: 'utilita', danno: 0, raggio: 0, vento: false, usaPotenza: false, usaAngolo: true, chiudeTurno: false, ottenimento: 'base', munizioni: -1, milestone: 'M2' }),
  A({ id: 'bussola', numero: 15, tipo: 'bersaglio', danno: 0, raggio: 0, vento: false, usaPotenza: false, usaAngolo: false, chiudeTurno: true, ottenimento: 'stiva', munizioni: 0, milestone: 'M2' }),
  A({ id: 'kraken', numero: 16, tipo: 'bersaglio', danno: 50, raggio: 150, spintaFissa: 600, vento: false, usaPotenza: false, usaAngolo: false, chiudeTurno: true, ottenimento: 'cassa', munizioni: 0, milestone: 'v1' }),
];

export const ARMA: Readonly<Record<IdArma, DefArma>> = Object.fromEntries(ARMI.map((a) => [a.id, a])) as Record<IdArma, DefArma>;

/** Armi attive nella milestone corrente (M1: le 4 Base). */
export const ARMI_ATTIVE: readonly IdArma[] = ARMI.filter((a) => a.milestone === 'M1').map((a) => a.id);

/** Dotazione di una squadra a inizio battaglia in M1: le armi attive con le loro munizioni (−1 = infinite). */
export function dotazioneIniziale(): Partial<Record<IdArma, number>> {
  const m: Partial<Record<IdArma, number>> = {};
  for (const id of ARMI_ATTIVE) m[id] = ARMA[id].munizioni;
  return m;
}
