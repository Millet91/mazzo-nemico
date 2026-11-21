// Mira a fionda (00 §3): si tocca dentro l'anello di 100 px attorno al pirata attivo e si trascina
// all'INDIETRO: il tiro parte nella direzione opposta al trascinamento. 0-160 px = potenza 0-100%.
// Parte pura: siamo fuori dalla sim, quindi Math.atan2 è ammesso; il risultato è in mezzi gradi interi.
import { BIL } from '../../contenuti/bilanciamento';
import { normalizza } from '../../core/trig';

/** sotto questo trascinamento (px CSS) la mira non cambia: era un tocco, non una fionda */
export const TRASCINAMENTO_MINIMO = 8;

/** true se il punto dello schermo (px CSS) cade nell'anello di mira del pirata. */
export function dentroAnello(px: number, py: number, pirataX: number, pirataY: number, raggio: number = BIL.mira.anelloPx): boolean {
  const dx = px - pirataX, dy = py - pirataY;
  return dx * dx + dy * dy <= raggio * raggio;
}

/**
 * Trascinamento (dx, dy) in px CSS dal punto in cui il dito ha toccato → mira per il comando `mira`.
 * Lo schermo ha la y verso il basso; l'angolo è 0 = destra, 180 mezzi gradi = su. null = trascinamento troppo corto.
 */
export function fiondaAMira(dx: number, dy: number, maxPx: number = BIL.mira.trascinamentoMaxPx): { mezziGradi: number; potenza: number } | null {
  const lung = Math.sqrt(dx * dx + dy * dy);
  if (lung < TRASCINAMENTO_MINIMO) return null;
  // direzione del tiro = opposta al trascinamento; in coordinate "y verso l'alto": (−dx, +dy)
  const gradi = (Math.atan2(dy, -dx) * 180) / Math.PI;
  const potenza = Math.max(0, Math.min(100, Math.round((lung / maxPx) * 100)));
  return { mezziGradi: normalizza(Math.round(gradi * 2)), potenza };
}
