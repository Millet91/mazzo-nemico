import { describe, expect, it } from 'vitest';
import { PASSO_PIOLI, puoAggrapparsi, quotePioli } from '../../src/battaglia/render/appigli';
import type { Appiglio, Pirata } from '../../src/core/tipi';

const scala: Appiglio = { id: 1, tipo: 'scala', x: 100, yAlto: 200, yBasso: 300 };
const pirata = (x: number, y: number, appeso = -1) => ({ x, y, stato: 'vivo', appeso }) as Pirata;

describe('scale e liane: disegno e maniglia', () => {
  it('maniglia aperta solo entro la presa e lungo il tratto', () => {
    expect(puoAggrapparsi(pirata(105, 250), [scala])).toBe(true);
    expect(puoAggrapparsi(pirata(120, 250), [scala])).toBe(false);
    expect(puoAggrapparsi(pirata(100, 150), [scala])).toBe(false);
    expect(puoAggrapparsi(pirata(100, 250, 1), [scala])).toBe(false); // già appeso: mano chiusa
    expect(puoAggrapparsi(pirata(100, 250), [])).toBe(false);
  });
  it('pioli ogni 8 px dentro la scala', () => {
    const q = quotePioli(200, 300);
    expect(q[0]).toBe(204);
    expect(q[1] - q[0]).toBe(PASSO_PIOLI);
    expect(q[q.length - 1]).toBeLessThan(300);
    expect(q.length).toBe(12);
  });
});
