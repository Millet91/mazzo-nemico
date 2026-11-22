import type { Bioma, Decorazione, Punto, Rettangolo, StrutturaMappa, TipoAppiglio } from '../../core/tipi';

/** Dati di una mappa fatta a mano (06 §6), scritti da scripts/mappe/costruisci.ts. */
export interface DatiMappaFatta {
  id: string;
  nome: string;
  bioma: Bioma;
  w: number;
  h: number;
  mare: number;
  /** cartella della grafica in public/assets/mappe/ (assente = terreno dipinto con i colori dei materiali) */
  arte?: string;
  /** lato 0 a sinistra, lato 1 a destra; ogni lato dal più interno al più esterno */
  spawn: [Punto[], Punto[]];
  barili: Punto[];
  /** scale e liane (contratto MappaGenerata.appigli): segmenti verticali in aria, non nella maschera */
  appigli?: { tipo: TipoAppiglio; x: number; yAlto: number; yBasso: number }[];
  decorazioni: Decorazione[];
  /** mappa da copione (Prologo): spawn fissi, non passa la validazione di equità */
  copione?: boolean;
  /** punti con nome per la scena (es. cassa, veliero, cartello del Prologo) */
  segnaposti?: Record<string, Punto>;
  /** Fase 3 (P1-contratti §7): ancoraggi del sostegno, rettangoli in px di mondo con gli estremi compresi */
  sostegni?: Rettangolo[];
  /** Fase 3: torri, ponti, massi e cengie che crollano a modo loro (contratto MappaGenerata.strutture) */
  strutture?: StrutturaMappa[];
  /** maschera compressa (rle.ts) */
  maschera: string;
}
