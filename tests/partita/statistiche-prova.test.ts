import { describe, it, expect } from 'vitest';
import { calcolaRisultato, mediana } from '../../src/battaglia/partita/statistiche-prova';

function prova(fpsPerSecondo: number[], avvii: number[] = [0]) {
  const delta: number[] = [];
  fpsPerSecondo.forEach((n) => { for (let i = 0; i < n; i++) delta.push(1000 / n); });
  return calcolaRisultato({
    perSecondo: fpsPerSecondo, secondiAvvio: new Set(avvii), delta,
    msSim: 1.2 * 3600, tick: 3600, durataMs: fpsPerSecondo.length * 1000,
  });
}

describe('Prova 60 fps · conti', () => {
  it('schermo a 90 Hz: medio ~90 e frequenza stimata 90', () => {
    const r = prova(Array(60).fill(90));
    expect(r.fpsMedio).toBe(90);
    expect(r.hzSchermo).toBe(90);
    expect(r.msSimPerTick).toBe(1.2);
    expect(r.frameLenti).toBe(0);
  });

  it('i secondi con una battaglia nuova non abbassano il minimo, ma si contano a parte', () => {
    const s = Array(60).fill(60);
    s[0] = 20; s[30] = 25; s[31] = 40;
    const r = prova(s, [0, 30, 31]);
    expect(r.fpsMinimo).toBe(60);
    expect(r.secondiCaricamento).toBe(3);
    expect(r.frameLenti).toBe(20 + 25 + 40);
    // senza esclusioni il minimo cadrebbe
    expect(prova(s, []).fpsMinimo).toBe(20);
  });

  it('risparmio energetico a 60 Hz si riconosce', () => {
    expect(prova(Array(10).fill(60)).hzSchermo).toBe(60);
  });

  it('mediana', () => {
    expect(mediana([])).toBe(0);
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 3, 2])).toBe(2.5);
  });
});
