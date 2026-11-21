import { describe, it, expect } from 'vitest';
import { LATO_TILE, dipingiRettangolo, rettangoloCratere, tileToccate, COLORI_MATERIALE } from '../../src/battaglia/render/pittura-terreno';
import { MATERIALE } from '../../src/core/tipi';
import { PALETTE, hex } from '../../src/core/palette';

const W = 512, H = 512;

function mondo(): Uint8Array {
  // metà bassa di terra, superficie a y = 256
  const m = new Uint8Array(W * H);
  for (let y = 256; y < H; y++) for (let x = 0; x < W; x++) m[y * W + x] = MATERIALE.terra;
  return m;
}

function pixel(buf: Uint8ClampedArray, x: number, y: number, tx: number, ty: number): number[] {
  const k = ((y - ty) * LATO_TILE + (x - tx)) * 4;
  return [buf[k], buf[k + 1], buf[k + 2], buf[k + 3]];
}

const vicino = (a: number[], c: string | readonly number[], tolleranza = 8) => {
  const rgb = typeof c === 'string' ? [(hex(c) >> 16) & 255, (hex(c) >> 8) & 255, hex(c) & 255] : c;
  return Math.abs(a[0] - rgb[0]) <= tolleranza && Math.abs(a[1] - rgb[1]) <= tolleranza && Math.abs(a[2] - rgb[2]) <= tolleranza;
};

describe('Pittura del terreno', () => {
  it("aria trasparente, erba sulla superficie, terra sotto", () => {
    const m = mondo();
    const buf = new Uint8ClampedArray(LATO_TILE * LATO_TILE * 4);
    dipingiRettangolo(m, m.slice(), W, H, buf, 0, 256, 0, 256, 256, 512);
    expect(pixel(buf, 10, 256, 0, 256)[3]).toBe(255);
    expect(vicino(pixel(buf, 10, 256, 0, 256), PALETTE.erbaLuce)).toBe(true);
    expect(vicino(pixel(buf, 10, 259, 0, 256), PALETTE.erba)).toBe(true);
    expect(vicino(pixel(buf, 10, 300, 0, 256), COLORI_MATERIALE[MATERIALE.terra])).toBe(true);
    const aria = new Uint8ClampedArray(LATO_TILE * LATO_TILE * 4).fill(9);
    dipingiRettangolo(m, m.slice(), W, H, aria, 0, 0, 0, 0, 256, 256);
    expect(pixel(aria, 5, 5, 0, 0)[3]).toBe(0);
  });

  it('il bordo di un cratere è bruciato (3 px), il resto no', () => {
    const m = mondo();
    const o = m.slice();
    // cratere: buco quadrato 20×20 dentro la terra
    for (let y = 350; y < 370; y++) for (let x = 100; x < 120; x++) m[y * W + x] = MATERIALE.aria;
    const buf = new Uint8ClampedArray(LATO_TILE * LATO_TILE * 4);
    dipingiRettangolo(m, o, W, H, buf, 0, 256, 0, 256, 256, 512);
    expect(pixel(buf, 110, 360, 0, 256)[3]).toBe(0);
    expect(vicino(pixel(buf, 120, 360, 0, 256), PALETTE.bordoBruciato)).toBe(true);
    expect(vicino(pixel(buf, 130, 360, 0, 256), PALETTE.bordoBruciato)).toBe(false);
  });

  it('il cratere tocca solo le tile vicine', () => {
    const [x0, y0, x1, y1] = rettangoloCratere(250, 250, 30);
    expect(tileToccate(x0, y0, x1, y1, 8, 4).sort()).toEqual([0, 1, 8, 9]);
    const r = rettangoloCratere(100, 100, 20);
    expect(tileToccate(...r, 8, 4)).toEqual([0]);
    // fuori dal mondo: niente indici sbagliati
    expect(tileToccate(-100, -100, -10, -10, 8, 4)).toEqual([]);
  });
});
