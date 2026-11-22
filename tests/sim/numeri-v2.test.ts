// Numeri di battaglia dello studio v2 (PIANO §7, regole versione 2) e la loro conseguenza sulle coste.
// La spinta di cannone e granata v2 è tornata quella della v1 (`spintaEsplosione` in armi.ts) e il generatore legge
// la spinta vera (`spintaAlCentro`): qui si controlla che un colpo diretto non butti in mare gli spawn.
import { describe, it, expect } from 'vitest';
import { generaMappa } from '../../src/battaglia/gen';
import { spinte, spinto } from '../../src/battaglia/gen/spawn';
import { REGOLE } from '../../src/battaglia/gen/parametri';
import { ARMA } from '../../src/contenuti/armi';
import { BIL, TICK_AL_SECONDO } from '../../src/contenuti/bilanciamento';
import { simulaColpo, spintaAlCentro } from '../../src/battaglia/sim';
import { avanzaFinche, battagliaPiatta, inAzione, pirata, spara, terrenoPiatto } from './aiuti';

describe('Numeri v2 · coste e cannone', () => {
  it('il generatore usa la spinta vera del cannone (per eccesso al px/s) e il raggio v2', () => {
    const S = TICK_AL_SECONDO;
    expect(spinte().cannone * S).toBe(Math.ceil(spintaAlCentro('cannone', 'teschio') * S));
    expect(spinte().cannone).toBeGreaterThanOrEqual(spintaAlCentro('cannone', 'teschio'));
    expect(REGOLE.cannoneRaggio).toBe(ARMA.cannone.raggio);
  });

  it('la spinta di cannone e granata è quella della v1 (`spintaEsplosione`), col Teschio +10%', () => {
    const S = TICK_AL_SECONDO;
    expect(spintaAlCentro('cannone', null) * S).toBeCloseTo(311, 6);
    expect(spintaAlCentro('cannone', 'teschio') * S).toBeCloseTo(311 * 66 / 60, 6); // 342, come 49 × 7 della v1
    expect(spintaAlCentro('granata', null) * S).toBeCloseTo(280, 6);
    expect(spintaAlCentro('granata', 'teschio') * S).toBeCloseTo(280 * 57 / 52, 6);
    // la sciabola resta l'arma che spinge di più
    expect(ARMA.sciabola.spintaFissa!).toBeGreaterThan(spintaAlCentro('cannone', 'teschio') * S);
    // senza `spintaEsplosione`: danno × 7 px/s
    expect(spintaAlCentro('barile', null)).toBeCloseTo(ARMA.barile.danno * BIL.fisica.spintaPerDanno, 9);
  });

  it('in battaglia e in simulaColpo la spinta è la stessa: una cannonata del Teschio vicino al bordo', () => {
    // piano che finisce a x 1000: il nemico a 960 vola oltre il bordo solo se la spinta è quella giusta
    const t = terrenoPiatto(undefined, 100, 1000);
    const s = battagliaPiatta([800], [960], { terreno: t });
    inAzione(s);
    const q = pirata(s, 1);
    let potenza = 30;
    while (potenza < 100 && !(simulaColpo(s, { pirata: 0, arma: 'cannone', mezziGradi: 40, potenza }).danni[q.id] > 20)) potenza++;
    const previsto = simulaColpo(s, { pirata: 0, arma: 'cannone', mezziGradi: 40, potenza });
    spara(s, 'cannone', 40, potenza);
    avanzaFinche(s, (x) => x.turno.numero === 2 || x.esito !== null, 1200);
    expect(previsto.danni[q.id] ?? 0).toBeGreaterThan(0);
    expect(q.stato === 'annegato').toBe(previsto.annegati.includes(q.id));
    if (q.stato !== 'annegato') expect(BIL.pirata.pv - q.vita).toBe(previsto.danni[q.id]);
  });

  it('misura: spawn che un colpo diretto del cannone v2 butta in mare (3 per lato, 40 semi)', () => {
    const conta = (v: number) => {
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
    const v1 = conta(Math.floor(45 * (1 + BIL.tratti.teschioBonusDanno)) * BIL.fisica.spintaPerDanno); // cannone v1: danno 45
    const v2 = conta(spintaAlCentro('cannone', null));
    const v2Teschio = conta(spintaAlCentro('cannone', 'teschio'));
    console.log(`coste: spawn in mare con un colpo diretto — v1 ${v1.toFixed(1)}%, v2 ${v2.toFixed(1)}%, v2 col Teschio ${v2Teschio.toFixed(1)}%`);
    expect(v1).toBe(0); // la garanzia di 06 §7.2 vale coi numeri su cui le coste sono tarate
    // con `spintaEsplosione` il cannone v2 spinge come quello v1: le coste di oggi reggono di nuovo
    expect(v2).toBe(0);
    expect(v2Teschio).toBe(0);
  }, 20000);
});
