import { describe, it, expect } from 'vitest';
import { MisuraFps } from '../../src/render/misura-fps';

describe('Contatore FPS', () => {
  it('calcola media e minimo per secondo', () => {
    const m = new MisuraFps();
    for (let i = 0; i < 60; i++) m.frameFatto(1000 / 60);
    m.frameFatto(1); // chiude il secondo
    for (let i = 0; i < 30; i++) m.frameFatto(1000 / 30);
    m.frameFatto(1);
    expect(m.minimo).toBeGreaterThanOrEqual(30);
    expect(m.minimo).toBeLessThan(32);
    expect(m.medio).toBeGreaterThan(44);
    expect(m.medio).toBeLessThan(48);
  });

  it('tiene solo la finestra richiesta', () => {
    const m = new MisuraFps(2);
    m.frameFatto(1000); // 1 fps
    for (let s = 0; s < 2; s++) for (let i = 0; i <= 60; i++) m.frameFatto(1000 / 60);
    expect(m.minimo).toBeGreaterThan(55);
  });
});
