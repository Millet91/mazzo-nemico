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

describe('Prova 60 fps · tempo di disegno (Fase 1, Render n.7)', () => {
  it('medio, p95 e peggiore, per fascia di zoom, senza i secondi di caricamento', async () => {
    const { calcolaRisultato, misuraDisegno } = await import('../../src/battaglia/partita/statistiche-prova');
    expect(misuraDisegno([])).toEqual({ medio: 0, p95: 0, peggiore: 0, frame: 0 });
    expect(misuraDisegno([2, 4, 6])).toMatchObject({ medio: 4, peggiore: 6, frame: 3 });
    const r = calcolaRisultato({
      perSecondo: [60, 60, 60], secondiAvvio: new Set([0]), delta: Array(180).fill(1000 / 60), msSim: 0, tick: 0, durataMs: 3000,
      disegno: [
        { ms: 40, zoom: 1.4, secondo: 0 }, // caricamento: non conta
        { ms: 3, zoom: 1.4, secondo: 1 }, { ms: 5, zoom: 1.3, secondo: 1 },
        { ms: 6, zoom: 0.5, secondo: 2 }, { ms: 2, zoom: 0.9, secondo: 2 },
      ],
    });
    expect(r.msDisegnoPeggiore).toBe(6);
    expect(r.msDisegnoMedio).toBe(4);
    expect(r.disegno.zoomNormale).toMatchObject({ medio: 4, peggiore: 5, frame: 2 });
    expect(r.disegno.zoomMinimo).toMatchObject({ medio: 6, frame: 1 });
  });
});
