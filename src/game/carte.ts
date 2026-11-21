// Contenuti del nucleo: 8 nemici + il Mazziere, 4 carte iniziali, 12 trucchi da scegliere.
// Le icone sono emoji provvisorie: la grafica vera arriva dal registro in src/ui/arte.ts.

export type NemicoId =
  | 'scagnozzo' | 'bruto' | 'corazzato' | 'lesto'
  | 'spettro' | 'barile' | 'oste' | 'capobanda' | 'mazziere';

export type CartaId =
  // carte iniziali
  | 'colpo' | 'ruba' | 'spingi' | 'rimanda'
  // trucchi da scegliere
  | 'mazzata' | 'grandefurto' | 'spazzata' | 'freccia' | 'fermi' | 'smaschera'
  | 'fondo' | 'sbircia' | 'parata' | 'veleno' | 'ritirata' | 'brindisi'
  // carte dei nemici rubati
  | 'coltello' | 'esplosivo' | 'brivido' | 'scatto' | 'scudo' | 'comando' | 'randello';

export interface NemicoDef {
  id: NemicoId;
  nome: string;
  icona: string;
  forza: number;
  /** abilità scritta sulla carta, cortissima */
  abil?: string;
  /** che carta diventa quando la rubi */
  tua?: CartaId;
  colore: string;
}

export const NEMICI: Record<NemicoId, NemicoDef> = {
  scagnozzo: { id: 'scagnozzo', nome: 'Scagnozzo', icona: '🗡️', forza: 4, tua: 'coltello', colore: '#8a6a4a' },
  bruto: { id: 'bruto', nome: 'Bruto', icona: '🪓', forza: 9, tua: 'randello', colore: '#9b3b2e' },
  corazzato: { id: 'corazzato', nome: 'Corazzato', icona: '🛡️', forza: 4, abil: 'Ogni colpo: max 1 danno', tua: 'scudo', colore: '#5d6b7a' },
  lesto: { id: 'lesto', nome: 'Lesto', icona: '🐇', forza: 3, abil: 'Avanza di 2', tua: 'scatto', colore: '#4f8a5b' },
  spettro: { id: 'spettro', nome: 'Spettro', icona: '👻', forza: 2, abil: 'Danni: immune. Si ruba sempre', tua: 'brivido', colore: '#6b5a9e' },
  barile: { id: 'barile', nome: 'Barile', icona: '🛢️', forza: 1, abil: 'Muore: 3 danni ai vicini. Esce: 5 a te', tua: 'esplosivo', colore: '#b0702a' },
  oste: { id: 'oste', nome: 'Oste', icona: '🍷', forza: 3, abil: 'Ogni turno: +1 Forza ai vicini', tua: 'brindisi', colore: '#8e3a5c' },
  capobanda: { id: 'capobanda', nome: 'Capobanda', icona: '👑', forza: 5, abil: 'Finché c’è, non puoi rubare gli altri', tua: 'comando', colore: '#a8862c' },
  mazziere: { id: 'mazziere', nome: 'Il Mazziere', icona: '🎩', forza: 16, abil: 'Ogni colpo: max 2 danni. Non si ruba', colore: '#2c2c3a' },
};

export type Bersaglio = 'nemico' | 'nessuno';

export interface CartaDef {
  id: CartaId;
  nome: string;
  icona: string;
  costo: number;
  testo: string;
  bersaglio: Bersaglio;
  /** se la carta è un nemico rubato */
  da?: NemicoId;
  tipo: 'base' | 'trucco' | 'rubata';
}

const c = (d: CartaDef) => d;

export const CARTE: Record<CartaId, CartaDef> = {
  colpo: c({ id: 'colpo', nome: 'Colpo', icona: '👊', costo: 1, testo: '2 danni', bersaglio: 'nemico', tipo: 'base' }),
  ruba: c({ id: 'ruba', nome: 'Ruba', icona: '🫳', costo: 2, testo: 'Ruba un nemico con Forza 2 o meno: diventa tua', bersaglio: 'nemico', tipo: 'base' }),
  spingi: c({ id: 'spingi', nome: 'Spingi', icona: '↔️', costo: 0, testo: 'Scambia il nemico con quello dietro', bersaglio: 'nemico', tipo: 'base' }),
  rimanda: c({ id: 'rimanda', nome: 'Rimanda', icona: '↩️', costo: 1, testo: 'Il nemico torna in cima al suo mazzo: rientra da capo', bersaglio: 'nemico', tipo: 'trucco' }),

  mazzata: c({ id: 'mazzata', nome: 'Mazzata', icona: '🔨', costo: 2, testo: '5 danni', bersaglio: 'nemico', tipo: 'trucco' }),
  grandefurto: c({ id: 'grandefurto', nome: 'Grande furto', icona: '💰', costo: 2, testo: 'Ruba un nemico con Forza 4 o meno', bersaglio: 'nemico', tipo: 'trucco' }),
  spazzata: c({ id: 'spazzata', nome: 'Spazzata', icona: '🌪️', costo: 2, testo: '1 danno a tutti i nemici', bersaglio: 'nessuno', tipo: 'trucco' }),
  freccia: c({ id: 'freccia', nome: 'Freccia', icona: '🏹', costo: 1, testo: '4 danni al nemico più lontano', bersaglio: 'nessuno', tipo: 'trucco' }),
  fermi: c({ id: 'fermi', nome: 'Fermi tutti', icona: '✋', costo: 2, testo: 'Questo turno la fila non avanza', bersaglio: 'nessuno', tipo: 'trucco' }),
  smaschera: c({ id: 'smaschera', nome: 'Smaschera', icona: '🎭', costo: 1, testo: 'Il nemico perde la sua abilità', bersaglio: 'nemico', tipo: 'trucco' }),
  fondo: c({ id: 'fondo', nome: 'Doppiofondo', icona: '🪙', costo: 0, testo: '+2 fiche', bersaglio: 'nessuno', tipo: 'trucco' }),
  sbircia: c({ id: 'sbircia', nome: 'Sbircia', icona: '👀', costo: 0, testo: 'Pesca 2 carte', bersaglio: 'nessuno', tipo: 'trucco' }),
  parata: c({ id: 'parata', nome: 'Parata', icona: '🧱', costo: 1, testo: 'Il prossimo nemico che esce non ti fa danno', bersaglio: 'nessuno', tipo: 'trucco' }),
  veleno: c({ id: 'veleno', nome: 'Veleno', icona: '🧪', costo: 1, testo: 'Il nemico perde 1 Forza a ogni turno', bersaglio: 'nemico', tipo: 'trucco' }),
  ritirata: c({ id: 'ritirata', nome: 'Ritirata', icona: '⏪', costo: 1, testo: 'Tutta la fila arretra di 1', bersaglio: 'nessuno', tipo: 'trucco' }),
  brindisi: c({ id: 'brindisi', nome: 'Brindisi', icona: '🍷', costo: 1, testo: '+3 Vite', bersaglio: 'nessuno', tipo: 'trucco' }),

  coltello: c({ id: 'coltello', nome: 'Coltello', icona: '🗡️', costo: 0, testo: '1 danno', bersaglio: 'nemico', da: 'scagnozzo', tipo: 'rubata' }),
  randello: c({ id: 'randello', nome: 'Randello', icona: '🪓', costo: 1, testo: '4 danni', bersaglio: 'nemico', da: 'bruto', tipo: 'rubata' }),
  scudo: c({ id: 'scudo', nome: 'Scudo', icona: '🛡️', costo: 1, testo: 'Il prossimo nemico che esce non ti fa danno', bersaglio: 'nessuno', da: 'corazzato', tipo: 'rubata' }),
  scatto: c({ id: 'scatto', nome: 'Scatto', icona: '🐇', costo: 0, testo: 'Pesca 2 carte', bersaglio: 'nessuno', da: 'lesto', tipo: 'rubata' }),
  brivido: c({ id: 'brivido', nome: 'Brivido', icona: '👻', costo: 1, testo: 'Dimezza la Forza del nemico (anche se ha lo scudo)', bersaglio: 'nemico', da: 'spettro', tipo: 'rubata' }),
  esplosivo: c({ id: 'esplosivo', nome: 'Esplosivo', icona: '🛢️', costo: 1, testo: '2 danni al nemico e ai suoi vicini', bersaglio: 'nemico', da: 'barile', tipo: 'rubata' }),
  comando: c({ id: 'comando', nome: 'Comando', icona: '👑', costo: 1, testo: 'Tutta la fila arretra di 1', bersaglio: 'nessuno', da: 'capobanda', tipo: 'rubata' }),
};

export const TRUCCHI: CartaId[] = [
  'mazzata', 'grandefurto', 'spazzata', 'freccia', 'fermi', 'smaschera',
  'fondo', 'sbircia', 'parata', 'veleno', 'ritirata', 'brindisi',
];

export const MAZZO_INIZIALE: CartaId[] = ['colpo', 'colpo', 'colpo', 'colpo', 'colpo', 'ruba', 'ruba', 'spingi'];

/** Mano 1: ordine fisso, insegna una cosa alla volta. */
export const NEMICI_MANO_1: NemicoId[] = ['scagnozzo', 'scagnozzo', 'spettro', 'scagnozzo', 'bruto', 'lesto', 'corazzato', 'barile'];
/** Cosa aggiunge il Mazziere al suo mazzo prima della mano 2 e 3. */
export const AGGIUNTE: Record<number, NemicoId[]> = {
  2: ['oste', 'capobanda', 'bruto'],
  3: ['corazzato', 'barile', 'lesto', 'bruto'],
};
