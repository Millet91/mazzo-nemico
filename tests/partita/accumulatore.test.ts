import { describe, it, expect } from 'vitest';
import { Accumulatore, MS_PER_TICK } from '../../src/battaglia/partita/accumulatore';

describe('Accumulatore a passo fisso (60 Hz)', () => {
  it('un frame a 60 fps fa un tick, a 30 fps due', () => {
    const a = new Accumulatore();
    let n = 0;
    for (let i = 0; i < 60; i++) n += a.passi(1000 / 60);
    expect(n).toBe(60);
    n = 0;
    for (let i = 0; i < 30; i++) n += a.passi(1000 / 30);
    expect(n).toBe(60);
  });

  it('frame lento di 1 s: al massimo 5 tick e niente spirale (13 caso 6)', () => {
    const a = new Accumulatore();
    expect(a.passi(1000)).toBe(5);
    // il ritardo non si recupera nei frame dopo
    expect(a.passi(MS_PER_TICK)).toBe(1);
  });

  it('a 120 Hz un tick ogni due frame', () => {
    const a = new Accumulatore();
    const passi = Array.from({ length: 8 }, () => a.passi(1000 / 120));
    expect(passi.reduce((x, y) => x + y, 0)).toBe(4);
  });

  it('dopo la pausa niente tick recuperati (13 caso 24)', () => {
    const a = new Accumulatore();
    a.passi(MS_PER_TICK * 0.9);
    a.azzera();
    expect(a.passi(MS_PER_TICK * 0.5)).toBe(0);
  });

  it('delta nullo, negativo o NaN non fa tick', () => {
    const a = new Accumulatore();
    expect(a.passi(0)).toBe(0);
    expect(a.passi(-5)).toBe(0);
    expect(a.passi(Number.NaN)).toBe(0);
  });
});
