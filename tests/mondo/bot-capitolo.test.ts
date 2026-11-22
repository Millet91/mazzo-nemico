// Il bot del cap. 1 (bot-capitolo.ts) in piccolo, a ogni push: 3 partite con battaglie vere nel simulatore.
// Controlla che nessuna battaglia si blocchi o superi i 4 minuti stimati e che il capitolo arrivi sempre in fondo.
import { describe, expect, it } from 'vitest';
import { CAPITOLO_1 as C } from '../../src/contenuti/capitolo-1';
import { giocaCapitolo, MINUTI_BATTAGLIA_MAX } from './bot-capitolo';

describe('bot del cap. 1 con battaglie vere', () => {
  it('3 partite: nessuna battaglia bloccata o oltre 4 minuti, il capitolo finisce', () => {
    for (const seme of [1, 2, 3]) {
      const p = giocaCapitolo(seme, 'nostromo');
      expect(p.battaglie.length).toBeGreaterThanOrEqual(6);
      for (const b of p.battaglie) {
        expect(b.bloccata, `${b.isola} bloccata`).toBe(false);
        expect(b.minuti, `${b.isola} lunga`).toBeLessThanOrEqual(MINUTI_BATTAGLIA_MAX);
      }
      expect(p.round).toBeLessThanOrEqual(C.limiteRound);
    }
  }, 60_000);
});
