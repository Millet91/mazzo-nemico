import type { Bioma, Decorazione, Punto, TipoAppiglio } from '../../core/tipi';

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
  /** maschera compressa (rle.ts) */
  maschera: string;
}
