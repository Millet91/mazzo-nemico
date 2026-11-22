// ConfigBattaglia.semeMappa (chiesto dal Pacchetto 2): la mappa nasce dal seme della mappa, il resto dal seme.
import { describe, expect, it } from 'vitest';
import { mappaDiConfig } from '../../src/battaglia/mappa-config';
import { creaBattaglia } from '../../src/battaglia/sim';
import { configCaso } from '../qa/banco';

describe('mappaDiConfig', () => {
  it('senza semeMappa la mappa nasce dal seme della battaglia, come sempre', () => {
    const a = mappaDiConfig(configCaso(11, [3, 3]));
    const b = mappaDiConfig({ ...configCaso(11, [3, 3]), semeMappa: 11 });
    expect(b.semeUsato).toBe(a.semeUsato);
    expect(b.spawn).toEqual(a.spawn);
  });

  it('con semeMappa due battaglie con semi diversi hanno la stessa mappa e vento diverso', () => {
    const c1 = { ...configCaso(21, [3, 3]), semeMappa: 5 };
    const c2 = { ...configCaso(22, [3, 3]), semeMappa: 5 };
    const m1 = mappaDiConfig(c1), m2 = mappaDiConfig(c2);
    expect(m2.semeUsato).toBe(m1.semeUsato);
    expect(m2.spawn).toEqual(m1.spawn);
    expect(Buffer.from(m2.terreno.maschera).equals(Buffer.from(m1.terreno.maschera))).toBe(true);
    // la mappa è quella del seme 5, non quella del seme della battaglia
    expect(m1.semeUsato).toBe(mappaDiConfig(configCaso(5, [3, 3])).semeUsato);
    // il resto della battaglia segue `seme`: su una decina di semi il vento non è sempre lo stesso
    const venti = new Set<number>();
    for (let seme = 30; seme < 40; seme++) {
      const c = { ...configCaso(seme, [3, 3]), semeMappa: 5 };
      venti.add(creaBattaglia(c, mappaDiConfig(c)).vento);
    }
    expect(venti.size).toBeGreaterThan(1);
  });

  it('con una mappa fatta a mano semeMappa non conta', () => {
    const a = mappaDiConfig(configCaso(7, [3, 3], 'cala-pappagallo'));
    const b = mappaDiConfig({ ...configCaso(7, [3, 3], 'cala-pappagallo'), semeMappa: 99 });
    expect(b.spawn).toEqual(a.spawn);
  });
});
