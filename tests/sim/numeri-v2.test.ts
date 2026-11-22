// Numeri di battaglia dello studio v2 (PIANO §7, regole versione 2) e la loro conseguenza sulle coste.
// Il generatore resta tarato sul cannone v1 (REGOLE.cannoneDanno 45): con le mappe di oggi e il cannone v2 un colpo
// diretto può buttare in mare uno spawn. Qui si MISURA quanto spesso, così chi rifà le coste ha il numero di partenza.
import { describe, it, expect } from 'vitest';
import { generaMappa } from '../../src/battaglia/gen';
import { spinto } from '../../src/battaglia/gen/spawn';
import { REGOLE } from '../../src/battaglia/gen/parametri';
import { ARMA } from '../../src/contenuti/armi';
import { BIL } from '../../src/contenuti/bilanciamento';

describe('Numeri v2 · coste e cannone', () => {
  it('il generatore resta sul cannone v1: le impronte delle mappe non cambiano coi numeri nuovi', () => {
    expect([REGOLE.cannoneDanno, REGOLE.cannoneRaggio]).toEqual([45, 55]);
    expect(ARMA.cannone.danno).toBeGreaterThan(REGOLE.cannoneDanno);
  });

  it('misura: spawn che un colpo diretto del cannone v2 butta in mare (3 per lato, 40 semi)', () => {
    const conta = (danno: number) => {
      const v = danno * BIL.fisica.spintaPerDanno;
      let n = 0, mare = 0;
      for (let seme = 1; seme <= 40; seme++) {
        const m = generaMappa({ seme, bioma: 'isola', piratiPerLato: [5, 5] });
        for (const lato of m.spawn) for (const p of lato.slice(0, 3)) {
          n++;
          if (spinto(m.terreno.maschera, m.terreno.mare, p, v, 90, p.x < BIL.mondo.larghezza / 2 ? -1 : 1).tipo !== 'terra') mare++;
        }
      }
      return (100 * mare) / n;
    };
    const v1 = conta(Math.floor(REGOLE.cannoneDanno * (1 + BIL.tratti.teschioBonusDanno)));
    const v2 = conta(ARMA.cannone.danno);
    const v2Teschio = conta(Math.floor(ARMA.cannone.danno * (1 + BIL.tratti.teschioBonusDanno)));
    console.log(`coste: spawn in mare con un colpo diretto — v1 ${v1.toFixed(1)}%, v2 ${v2.toFixed(1)}%, v2 col Teschio ${v2Teschio.toFixed(1)}%`);
    expect(v1).toBe(0); // la garanzia di 06 §7.2 vale coi numeri su cui le coste sono tarate
    expect(v2Teschio).toBeLessThan(40); // misurato 25% su 200 semi: se sale, le coste vanno rifatte prima
  }, 20000);
});
