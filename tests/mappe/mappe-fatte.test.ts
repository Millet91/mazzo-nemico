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
      if (MAPPE_FATTE[id].copione) {
        // mappa da copione (Prologo): spawn fissi, si controlla solo che ognuno stia sul suolo
        const { w, maschera: m } = mappa.terreno;
        for (const p of [...mappa.spawn[0], ...mappa.spawn[1]]) {
          expect(m[p.y * w + p.x], `spawn ${p.x},${p.y}`).not.toBe(0);
          expect(m[(p.y - 1) * w + p.x], `spawn ${p.x},${p.y}`).toBe(0);
        }
        return;
      }
      expect(validaMappa(mappa)).toEqual([]);
      expect(mappa.spawn[0]).toHaveLength(5);
      expect(mappa.spawn[1]).toHaveLength(5);
    });

    it(`${id}: scale e liane rispettano scale-e-liane.md`, () => {
      const mappa = mappaFatta(id)!;
      const ap = mappa.appigli ?? [];
      const { w, maschera: m } = mappa.terreno;
      const pieno = (x: number, y: number) => m[y * w + x] !== 0;
      if (!MAPPE_FATTE[id].copione) expect(ap.filter((a) => a.x < w / 2).length).toBe(ap.filter((a) => a.x >= w / 2).length);
      for (const a of ap) {
        const lungo = a.yBasso - a.yAlto;
        // nel Prologo (copione) la scala grande parte dal ripiano del gradino: può essere un po' più corta
        expect(lungo, `${a.tipo} ${a.x}`).toBeGreaterThanOrEqual(MAPPE_FATTE[id].copione ? 50 : 60);
        expect(lungo, `${a.tipo} ${a.x}`).toBeLessThanOrEqual(220);
        for (let y = a.yAlto; y < a.yBasso; y++) expect(pieno(a.x, y), `${a.tipo} ${a.x} nel solido a ${y}`).toBe(false);
        // in cima un piano alla quota yAlto (±2 px) entro 14 px dall'asse; che ci si arrivi davvero lo prova percorribilita.test.ts
        let bordo = 99;
        for (let d = 0; d <= 14; d++) for (const x of [a.x - d, a.x + d]) for (let y = a.yAlto - 2; y <= a.yAlto + 2; y++) if (pieno(x, y) && !pieno(x, y - 1)) bordo = Math.min(bordo, d);
        expect(bordo, `${a.tipo} ${a.x}: piano in cima`).toBeLessThanOrEqual(14);
        // l'asse sta ad almeno 8 px dal muro (bug "la scalata si ferma a metà": la capsula è larga 12, mezza capsula + 2)
        for (let y = a.yAlto + 4; y < a.yBasso - 12; y++) for (let d = 1; d < 8; d++) expect(pieno(a.x - d, y) || pieno(a.x + d, y), `${a.tipo} ${a.x}: muro a ${d} px dall'asse, a y ${y}`).toBe(false);
        for (const p of [...mappa.spawn[0], ...mappa.spawn[1]]) expect(Math.abs(p.x - a.x), `${a.tipo} ${a.x} vicino allo spawn ${p.x}`).toBeGreaterThanOrEqual(40);
      }
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
