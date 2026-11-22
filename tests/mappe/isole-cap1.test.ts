// Le 8 isole del cap. 1 (Scenario e livelli, P2 Fase A): ogni seme passa il validatore AL PRIMO TENTATIVO (la mappa
// in battaglia è proprio quella scelta, non seme+1 né la riserva) e ha ancora la forma che serve al suo trucco.
// Se il generatore cambia, questo test cade: si rilancia scripts/mappe/isole/scegli-semi.ts e si aggiornano i semi.
import { describe, expect, it, vi } from 'vitest';
import { CAPITOLO_1 } from '../../src/contenuti/capitolo-1';
import { generaMappa } from '../../src/battaglia/gen';
import { validaMappa } from '../../src/battaglia/gen/valida';
import { misura, mareMassimo } from '../../scripts/mappe/isole/misure';
import { ATTACCANTE_Y_MAX, PROFILI, SCARTO_MAX } from '../../scripts/mappe/isole/profili';

vi.setConfig({ testTimeout: 30_000 });

describe('isole del cap. 1', () => {
  it('ogni isola ha un seme diverso', () => {
    const semi = CAPITOLO_1.isole.map((i) => ('seme' in i.mappa ? i.mappa.seme : -1)).filter((s) => s >= 0);
    expect(new Set(semi).size).toBe(semi.length);
  });

  for (const isola of CAPITOLO_1.isole) {
    if (!('seme' in isola.mappa)) continue;
    const seme = isola.mappa.seme;
    it(`${isola.id} ${isola.trucco}: seme ${seme} valido al primo colpo e adatto al trucco`, () => {
      const m = generaMappa({ seme, bioma: isola.bioma, piratiPerLato: [3, 3] });
      expect(m.tentativi).toBe(1);
      expect(m.semeUsato).toBe(seme);
      expect(validaMappa(m)).toEqual([]);
      const profilo = PROFILI.find((p) => p.id === isola.id && p.trucco === isola.trucco);
      expect(profilo, `nessun profilo per ${isola.id} ${isola.trucco}`).toBeDefined();
      const mi = misura(m);
      // partenze eque (bot della Campagna, 22/11): l'attaccante non parte più in basso del difensore, con qualsiasi n
      expect(mi.scartoPeggiore).toBeLessThanOrEqual(SCARTO_MAX);
      expect(mi.attaccantePiuBasso).toBeLessThanOrEqual(ATTACCANTE_Y_MAX);
      if (isola.id === '1A' || isola.id === '1B') expect(mi.scartoPeggioreDifensore).toBeLessThanOrEqual(SCARTO_MAX);
      if (isola.scontro?.tipo === 'bandiera') expect(mi.vettaRaggiungibile).toBe(true);
      expect(profilo!.adatto(mi)).toBe(true);
    });
  }

  it('1G (marea): la mappa regge il validatore intero fino al mare della Marea alta', () => {
    const g = CAPITOLO_1.isole.find((i) => i.id === '1G')!;
    if (!('seme' in g.mappa)) return;
    const m = generaMappa({ seme: g.mappa.seme, bioma: g.bioma, piratiPerLato: [5, 5] });
    expect(mareMassimo(m)).toBeLessThanOrEqual(900);
  });
});
