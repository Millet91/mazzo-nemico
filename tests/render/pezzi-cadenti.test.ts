// Fase 3: colori dei pezzi che cadono quando non c'è il quadro HD (render/pezzi-cadenti.ts, parte pura).
import { describe, it, expect } from 'vitest';
import { coloriPezzo } from '../../src/battaglia/render/pezzi-cadenti';
import { COLORI_MATERIALE } from '../../src/battaglia/render/pittura-terreno';

describe('pezzi che cadono: colori a 1×', () => {
  // pezzo 4×3 di roccia (4) con un buco in un angolo
  const forma = Uint8Array.from([0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);

  it('fuori dalla forma è trasparente, dentro è opaco; il bordo è più scuro del cuore', () => {
    const out = coloriPezzo(forma, 4, 3, 100, 50, null, 2048, 1024);
    expect(out[3]).toBe(0);
    for (let i = 1; i < 12; i++) expect(out[i * 4 + 3]).toBe(255);
    // senza quadro: il colore del materiale (con la grana ±6)
    const c = COLORI_MATERIALE[4];
    const bordo = out.slice(4, 7);
    expect(Math.abs(bordo[0] - c[0] * 0.62)).toBeLessThan(8);
  });

  it('col quadro a 1× prende il colore dal punto da cui si è staccato (daX, daY)', () => {
    const W = 8, H = 8;
    const arte = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) { arte[i * 4] = 10 * (i % W); arte[i * 4 + 1] = 100; arte[i * 4 + 2] = 200; arte[i * 4 + 3] = 255; }
    const cuore = Uint8Array.from([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const out = coloriPezzo(cuore, 3, 3, 4, 2, arte, W, H);
    // il px centrale (non sul bordo) è (5, 3) nel mondo: rosso 50
    expect([out[16], out[17], out[18]]).toEqual([50, 100, 200]);
    // fuori dal mondo: torna al colore del materiale, senza errori
    expect(coloriPezzo(cuore, 3, 3, -10, -10, arte, W, H)[19]).toBe(255);
  });
});
