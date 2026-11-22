// Fase 3: sostegno strutturale (sim/crolli.ts). Pezzi staccati attorno a un punto, appoggi, tetto del costo.
import { describe, it, expect } from 'vitest';
import { MATERIALE } from '../../src/core/tipi';
import { franaPasso, pezziStaccati, staccaDallaMaschera } from '../../src/battaglia/sim/crolli';
import { scavaCratere } from '../../src/battaglia/sim/terreno';
import { rettangolo, SUOLO, terrenoPiatto } from './aiuti';

const OPZ = { pezzoMax: 12000 };

describe('Sostegno strutturale: pezzi staccati', () => {
  it('una mensola di legno attaccata a una torre di roccia resta; tagliata alla base cade (è un pezzo staccato)', () => {
    const t = terrenoPiatto();
    rettangolo(t, 900, SUOLO - 200, 940, SUOLO, MATERIALE.roccia); // torre
    rettangolo(t, 940, SUOLO - 200, 1040, SUOLO - 190, MATERIALE.legno); // mensola lunga 100, spessa 10
    expect(pezziStaccati(t, 945, SUOLO - 195, 10, OPZ)).toEqual([]);
    scavaCratere(t, 945, SUOLO - 195, 9, null); // taglia la mensola accanto alla torre
    const p = pezziStaccati(t, 945, SUOLO - 195, 12, OPZ);
    expect(p).toHaveLength(1);
    expect(p[0].x1).toBe(1039);
    expect(p[0].y0).toBe(SUOLO - 200);
    expect(p[0].y1).toBe(SUOLO - 191);
  });

  it('un pezzo appoggiato al ferro o a un ancoraggio non cade', () => {
    for (const appoggio of [MATERIALE.ferro, 7]) {
      const t = terrenoPiatto();
      rettangolo(t, 1000, SUOLO - 300, 1004, SUOLO - 280, appoggio); // chiodo nel vuoto
      rettangolo(t, 1004, SUOLO - 290, 1100, SUOLO - 284, MATERIALE.legno);
      expect(pezziStaccati(t, 1050, SUOLO - 287, 5, OPZ)).toEqual([]);
    }
  });

  it('oltre pezzoMax pixel conta come corpo dell\'isola: il suolo non cade mai', () => {
    const t = terrenoPiatto();
    scavaCratere(t, 1000, SUOLO, 60, null);
    expect(pezziStaccati(t, 1000, SUOLO, 62, OPZ)).toEqual([]);
  });

  it('i pixel protetti (vicino a uno spawn) tengono su il pezzo', () => {
    const t = terrenoPiatto();
    rettangolo(t, 1000, SUOLO - 300, 1100, SUOLO - 290, MATERIALE.roccia); // pezzo sospeso
    expect(pezziStaccati(t, 1050, SUOLO - 300, 4, OPZ)).toHaveLength(1); // si parte dal bordo del pezzo
    const protetto = (x: number, y: number) => (x - 1090) ** 2 + (y - (SUOLO - 290)) ** 2 < 120 * 120;
    expect(pezziStaccati(t, 1050, SUOLO - 300, 4, { ...OPZ, protetto })).toEqual([]);
  });

  it('due pezzi separati dallo stesso scoppio: due risultati, nello stesso ordine ogni volta', () => {
    const t = terrenoPiatto();
    rettangolo(t, 1000, SUOLO - 300, 1040, SUOLO - 290, MATERIALE.legno);
    rettangolo(t, 1060, SUOLO - 300, 1100, SUOLO - 290, MATERIALE.roccia);
    const a = pezziStaccati(t, 1050, SUOLO - 295, 15, OPZ);
    const b = pezziStaccati(t, 1050, SUOLO - 295, 15, OPZ);
    expect(a.map((p) => p.x0)).toEqual([1000, 1060]);
    expect(b).toEqual(a);
  });

  it('staccaDallaMaschera toglie il pezzo e ne restituisce la forma con i materiali', () => {
    const t = terrenoPiatto();
    rettangolo(t, 1000, SUOLO - 300, 1010, SUOLO - 295, MATERIALE.legno);
    rettangolo(t, 1010, SUOLO - 300, 1020, SUOLO - 295, MATERIALE.roccia);
    const [p] = pezziStaccati(t, 1010, SUOLO - 298, 3, OPZ);
    const f = staccaDallaMaschera(t, p);
    expect([f.w, f.h]).toEqual([20, 5]);
    expect(f.maschera[0]).toBe(MATERIALE.legno);
    expect(f.maschera[19]).toBe(MATERIALE.roccia);
    expect(t.maschera[(SUOLO - 298) * t.w + 1005]).toBe(MATERIALE.aria);
  });

  it('costo: dopo un cratere su un\'isola piena la ricerca resta sotto 1,5 ms anche nella suite (a sé ~0,3 ms; sul Pixel 6 circa il triplo)', () => {
    const t = terrenoPiatto();
    rettangolo(t, 300, SUOLO - 400, 1700, SUOLO, MATERIALE.roccia);
    scavaCratere(t, 1000, SUOLO - 400, 70, null);
    for (let k = 0; k < 20; k++) pezziStaccati(t, 1000, SUOLO - 400, 72, OPZ); // a caldo
    const t0 = performance.now();
    for (let k = 0; k < 50; k++) pezziStaccati(t, 1000, SUOLO - 400, 72, OPZ);
    expect((performance.now() - t0) / 50).toBeLessThan(1.5);
  });
});

describe('Sabbia che frana', () => {
  it('un buco piccolo nella sabbia si chiude a metà: le pareti scivolano dentro fino a 45°', () => {
    const t = terrenoPiatto(MATERIALE.sabbia);
    // buco a pareti dritte largo 20 e profondo 20 sotto il suolo
    rettangolo(t, 990, SUOLO, 1010, SUOLO + 20, MATERIALE.aria);
    let passi = 0;
    while (franaPasso(t, 950, SUOLO - 5, 1050, SUOLO + 25, passi) && passi < 100) passi++;
    expect(passi).toBeGreaterThan(0);
    expect(passi).toBeLessThan(60);
    // il fondo del buco si è alzato (la sabbia delle pareti è scesa dentro)
    let fondo = SUOLO;
    while (t.maschera[fondo * t.w + 1000] === MATERIALE.aria) fondo++;
    expect(fondo).toBeLessThan(SUOLO + 20);
    // e nessun granello resta sospeso
    for (let y = SUOLO - 5; y < SUOLO + 25; y++) for (let x = 950; x <= 1050; x++) {
      if (t.maschera[y * t.w + x] === MATERIALE.sabbia) expect(t.maschera[(y + 1) * t.w + x]).not.toBe(MATERIALE.aria);
    }
  });

  it('roccia e legno non franano; la sabbia ferma non si muove', () => {
    const t = terrenoPiatto(MATERIALE.roccia);
    rettangolo(t, 990, SUOLO, 1010, SUOLO + 20, MATERIALE.aria);
    expect(franaPasso(t, 950, SUOLO - 5, 1050, SUOLO + 25, 0)).toBeNull();
    const s = terrenoPiatto(MATERIALE.sabbia);
    expect(franaPasso(s, 950, SUOLO - 5, 1050, SUOLO + 25, 0)).toBeNull();
  });
});
