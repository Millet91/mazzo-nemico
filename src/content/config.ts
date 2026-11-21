// Parametri di bilanciamento (GDD §7). Tutti in un posto, per i ritocchi.

export const CONTENT_VERSION = '1.0.0';

export const P = {
  LUMI: 35,
  START_DECK: ['topi', 'topi', 'lupo', 'lupo', 'volpe', 'affogata', 'falce', 'banditore', 'sobillatore', 'gazza'],
  DRAWS: { 1: [6, 7, 7, 8], 2: [9, 10, 10, 11], 3: [11, 12, 12, 13] } as Record<number, number[]>,
  BOSS_DRAWS: { 1: [4, 5, 5], 2: [5, 6, 6], 3: [5, 6, 6] } as Record<number, number[]>,
  ADDS: { 1: 2, 2: 2, 3: 3 } as Record<number, number>,
  ACT_BONUS: { 1: 0, 2: 1, 3: 1 } as Record<number, number>,
  KILL: 1,
  KILL_ELITE: 5,
  KILL_BOSS: 10,
  CLEAN: 3,
  BOSS_WIN: 10,
  SKIP: 3,
  PRICE: { C: 12, NC: 18, R: 25 } as Record<string, number>,
  EXILE: 15,
  EXILE_STEP: 5,
  HEAL_COST: 10,
  HEAL_AMT: 6,
  REST_HEAL: 0.3,
  BASAMENTO: 15,
  RINSALDA: 6,
  RISCATTO: 8,
  REROLL: 3,
  PATTO_RIFIUTO: 5,
  RARITY: { 1: [65, 30, 5], 2: [55, 35, 10], 3: [45, 38, 17] } as Record<number, number[]>,
  PITY_STEP: 2,
  TSOCK: 2,
  MAX_TICKS: 80,
  CHAIN: 16,
  MAX_EVENTS: 2000,
  PATTI_MAX: 3,
  LEALTA: 3,
  MIN_DECK_MARGIN: 4,
  VISIBLE_QUEUE: 2,
  ARALDI_MAX: 2,
};

/** Mappa di un atto (GDD §6.1): 7 livelli, tipi di nodo possibili per livello. */
export type NodeKind = 'ondata' | 'elite' | 'negozio' | 'riposo' | 'evento' | 'mazziere';
export const MAP_LEVELS: NodeKind[][] = [
  ['ondata'],
  ['ondata', 'evento'],
  ['ondata', 'negozio', 'evento'],
  ['elite', 'ondata', 'riposo'],
  ['ondata', 'evento', 'negozio'],
  ['riposo', 'negozio'],
  ['mazziere'],
];

export const ACT_NAMES: Record<number, string> = { 0: 'Atto 0 · La Prova', 1: 'Vespro', 2: 'Mezzanotte', 3: 'Ora Morta' };
export const SLOT_NAMES_5 = ['Crocevia', 'Strada', 'Cortile', 'Scala', 'Uscio'];
/** Nomi dei Passi quando la Piena allunga la Fila (i Passi nuovi compaiono all'ingresso). */
export function slotNames(L: number): string[] {
  if (L === 6) return ['Ponte', ...SLOT_NAMES_5];
  if (L === 7) return ['Argine', 'Ponte', ...SLOT_NAMES_5];
  return SLOT_NAMES_5;
}
