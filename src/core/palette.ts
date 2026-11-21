// Palette di 03 §2 e colori delle ciurme di 00 §2.1. Le variabili CSS in ui/style.css hanno gli stessi valori;
// qui servono a Pixi (numeri) e agli script. Il giocatore non ha un colore riservato.
export const PALETTE = {
  // UI
  notte: '#0E1B26', abisso: '#13293A', legnoScuro: '#3B2416', legno: '#6B4226',
  pergamena: '#F5E6C4', pergamenaOmbra: '#D9C39A', inchiostro: '#2B1B10',
  testo: '#FFF7E8', testoDim: '#B8C4CC', oro: '#FFC83D', oroOmbra: '#C78A12',
  pericolo: '#FF4D4D', ok: '#4ADE80', info: '#4CC9F0',
  // mare e cielo
  mareFondo: '#0B3D5C', mareMedio: '#116A8C', mareBasso: '#2FB3C4', schiuma: '#E6FBFF',
  cieloAlto: '#6EC6F0', cieloOrizzonte: '#FFD3A1', sole: '#FFB86B', nuvolaOmbra: '#C9A7D9',
  // terreno
  erba: '#6CC24A', erbaLuce: '#A6E36B', sabbia: '#F2D38B', terra: '#8A5A3A',
  terraProfonda: '#5A3B28', roccia: '#8A7A6A', bordoBruciato: '#2A1A12',
} as const;

export type IdCiurma = 'teschio' | 'gelo' | 'oro' | 'marea' | 'marina';

/** Colore e scuro di ciascuna ciurma (00 §2.1). Servono alla ricolorazione `tinta: 'fazione'`. */
export const COLORI_CIURMA: Record<IdCiurma, { colore: string; scuro: string }> = {
  teschio: { colore: '#E5484D', scuro: '#8E1F23' },
  gelo: { colore: '#22C7D9', scuro: '#0F7C8A' },
  oro: { colore: '#9B6BFF', scuro: '#5631B0' },
  marea: { colore: '#3DBE6A', scuro: '#1E7A3F' },
  marina: { colore: '#A8A29E', scuro: '#57534E' },
};

/** '#RRGGBB' → 0xRRGGBB per Pixi. */
export function hex(c: string): number {
  return parseInt(c.slice(1), 16);
}
