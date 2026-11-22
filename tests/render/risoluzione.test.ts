// Fase 2: risoluzione fino a 2 con regolazione dinamica (render/risoluzione.ts).
import { describe, it, expect } from 'vitest';
import { RegolaRisoluzione, livelliPer, LAVORO_MAX_MS } from '../../src/render/risoluzione';

/** fa passare `n` frame uguali, torna i cambi chiesti */
function frame(r: RegolaRisoluzione, n: number, delta: number, lavoro: number): number[] {
  const cambi: number[] = [];
  for (let i = 0; i < n; i++) { const c = r.frame(delta, lavoro); if (c !== null) cambi.push(c); }
  return cambi;
}

describe('risoluzione del canvas', () => {
  it('mai sopra il devicePixelRatio: Pixel 6 (2,625) parte da 2, un dpr 1,5 da 1,5, un dpr 1 resta a 1', () => {
    expect(livelliPer(2.625)).toEqual([2, 1.5, 1.25]);
    expect(livelliPer(1.5)).toEqual([1.5, 1.25]);
    expect(livelliPer(1)).toEqual([1]);
    expect(new RegolaRisoluzione(2.625).risoluzione).toBe(2);
  });

  it('a 60 fps col lavoro sotto la soglia resta a 2, anche su uno schermo a 60 Hz (delta 16,7 ms)', () => {
    const r = new RegolaRisoluzione(2.625);
    expect(frame(r, 2000, 16.7, 9)).toEqual([]);
    expect(frame(r, 2000, 11.1, 9)).toEqual([]); // 90 Hz
    expect(r.risoluzione).toBe(2);
  });

  it('col lavoro oltre 14,5 ms scende a 1,5, poi (dopo l\'attesa) a 1,25, e lì si ferma', () => {
    const r = new RegolaRisoluzione(2.625);
    expect(frame(r, 1000, 16.7, LAVORO_MAX_MS + 2)).toEqual([1.5, 1.25]);
    expect(frame(r, 2000, 16.7, 30)).toEqual([]);
    expect(r.risoluzione).toBe(1.25);
  });

  it('frame saltati (la GPU non ce la fa) contano come lenti anche col lavoro basso', () => {
    const r = new RegolaRisoluzione(2.625);
    const cambi: number[] = [];
    for (let i = 0; i < 600; i++) { const c = r.frame(i % 2 ? 16.7 : 33.4, 6); if (c !== null) cambi.push(c); }
    expect(cambi[0]).toBe(1.5);
  });

  it('qualche scatto isolato non basta; dopo una pausa o all\'avvio di una battaglia non si giudica', () => {
    const r = new RegolaRisoluzione(2.625);
    for (let i = 0; i < 2000; i++) r.frame(16.7, i % 10 === 0 ? 40 : 8); // 10% lenti
    expect(r.risoluzione).toBe(2);
    r.aspetta(3000);
    expect(frame(r, 170, 16.7, 40)).toEqual([]); // ~2,8 s di caricamento pesante: ignorati
    expect(frame(r, 5, 500, 40)).toEqual([]); // pause
    expect(r.risoluzione).toBe(2);
  });
});
