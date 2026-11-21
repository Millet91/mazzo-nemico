import { gainDefense, visibleQueue, allies } from '../core/run';
import { cardForza, minDeck } from '../core/wave';
import type { RunState } from '../core/types';

export { visibleQueue, allies };

/** Copia della run con una difesa in più (piazzamento automatico), per il Δ previsione. */
export function gainDefenseClone(run: RunState, id: string): RunState | null {
  const c = structuredClone(run);
  c.phase = 'prep';
  c.offer = null;
  try {
    gainDefense(c, id);
  } catch {
    return null;
  }
  if (c.exilePick) {
    for (let k = 0; k < c.exilePick.n; k++) {
      const en = c.deck.filter((x) => x.owner === 'fato').sort((a, b) => cardForza(b) - cardForza(a));
      if (!en.length || c.deck.length <= minDeck(c)) break;
      c.deck = c.deck.filter((x) => x !== en[0]);
    }
    c.exilePick = null;
  }
  c.phase = 'prep';
  return c;
}
