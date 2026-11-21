// Controllo del contratto del cap. 1 (Lead P2): rotte di 15 §2, regioni, partenze, posizioni sulla mappa logica.
import { describe, expect, it } from 'vitest';
import { CAPITOLO_1, CALA_PAPPAGALLO, MONDO_H, MONDO_W } from '../../src/contenuti/capitolo-1';

const ROTTE_15 = ['1A-1B', '1A-1C', '1A-1E', '1B-1C', '1B-1D', '1C-1D', '1C-1F', '1E-1F', '1E-1G', '1E-1H', '1F-1G', '1G-1H'];

describe('capitolo 1 Acque di Casa', () => {
  const per = new Map(CAPITOLO_1.isole.map((i) => [i.id, i]));

  it('ha le 8 isole e le 12 rotte di 15 §2, bidirezionali', () => {
    expect([...per.keys()].sort()).toEqual(['1A', '1B', '1C', '1D', '1E', '1F', '1G', '1H']);
    const rotte = new Set<string>();
    for (const i of CAPITOLO_1.isole) for (const a of i.adiacenti) {
      expect(per.get(a)?.adiacenti).toContain(i.id);
      rotte.add([i.id, a].sort().join('-'));
    }
    expect([...rotte].sort()).toEqual(ROTTE_15);
  });

  it('le regioni sono una partizione delle isole', () => {
    const tutte = CAPITOLO_1.regioni.flatMap((r) => r.isole).sort();
    expect(tutte).toEqual([...per.keys()].sort());
    for (const r of CAPITOLO_1.regioni) for (const id of r.isole) expect(per.get(id)!.regione).toBe(r.id);
  });

  it('partenze di 15 §2 e 6 conquiste con un premio ciascuna', () => {
    const giocatore = CAPITOLO_1.isole.filter((i) => i.padroneIniziale === 'giocatore').map((i) => i.id);
    expect(giocatore).toEqual(['1A', '1B']);
    const conquiste = CAPITOLO_1.isole.filter((i) => i.scontro);
    expect(conquiste).toHaveLength(6);
    for (const i of conquiste) expect(i.premi.length).toBeGreaterThan(0);
    expect(new Set(conquiste.map((i) => i.scontro!.tipo))).toEqual(new Set(['assalto', 'bandiera', 'duello']));
  });

  it('isole dentro la mappa logica e non sovrapposte', () => {
    const tutte = [...CAPITOLO_1.isole, CALA_PAPPAGALLO];
    for (const i of tutte) {
      expect(i.pos.x - i.raggio).toBeGreaterThan(0);
      expect(i.pos.y - i.raggio).toBeGreaterThan(0);
      expect(i.pos.x + i.raggio).toBeLessThan(MONDO_W);
      expect(i.pos.y + i.raggio).toBeLessThan(MONDO_H);
    }
    for (const a of tutte) for (const b of tutte) {
      if (a === b) continue;
      expect(Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y)).toBeGreaterThan(a.raggio + b.raggio + 60);
    }
  });
});
