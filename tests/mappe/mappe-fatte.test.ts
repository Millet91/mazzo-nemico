// Mappe fatte a mano (06 §6): passano lo stesso validatore del generatore e si caricano uguali ogni volta.
import { describe, expect, it } from 'vitest';
import { MAPPE_FATTE, mappaFatta } from '../../src/battaglia/mappe';
import { codificaMaschera, decodificaMaschera } from '../../src/battaglia/mappe/rle';
import { validaMappa } from '../../src/battaglia/gen/valida';
import { creaBattaglia } from '../../src/battaglia/sim';
import { configSchermaglia } from '../../src/ui/battaglia/logica';

describe('mappe fatte a mano', () => {
  it('la compressione della maschera torna identica', () => {
    const m = new Uint8Array(70000).map((_, i) => (i % 7000 < 3000 ? 0 : i % 5));
    expect(decodificaMaschera(codificaMaschera(m), m.length)).toEqual(m);
  });

  for (const id of Object.keys(MAPPE_FATTE)) {
    it(`${id} è valida (06 §4 e §7)`, () => {
      const mappa = mappaFatta(id)!;
      expect(validaMappa(mappa)).toEqual([]);
      expect(mappa.spawn[0]).toHaveLength(5);
      expect(mappa.spawn[1]).toHaveLength(5);
    });

    it(`${id}: ogni battaglia riceve una maschera sua`, () => {
      const a = mappaFatta(id)!, b = mappaFatta(id)!;
      a.terreno.maschera[500000] = 9;
      expect(b.terreno.maschera[500000]).not.toBe(9);
    });

    it(`${id}: la Schermaglia la usa con mappaFissa`, () => {
      const cfg = configSchermaglia(42, [3, 3], id);
      expect(cfg.mappaFissa).toBe(id);
      const s = creaBattaglia(cfg, mappaFatta(id, cfg)!);
      expect(s.pirati).toHaveLength(6);
    });
  }

  it('id sconosciuto: null (si torna alla mappa generata)', () => {
    expect(mappaFatta('non-esiste')).toBeNull();
  });
});
