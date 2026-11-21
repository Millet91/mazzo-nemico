// Passata di ritmo (m1-ritmo): scossa e zoom della camera, scala dei numeri di danno.
import { describe, expect, it } from 'vitest';
import { Camera, SCOSSA_MAX_PX } from '../../src/battaglia/render/camera';
import { scalaNumero } from '../../src/battaglia/render/effetti';

describe('scossa e zoom della camera', () => {
  it('la scossa sposta la vista e si spegne in 250 ms senza muovere il centro', () => {
    const c = new Camera();
    c.impostaSchermo(1280, 720);
    const x = c.x, y = c.y;
    c.scuoti(50);
    c.aggiorna(16);
    expect(Math.hypot(c.ox, c.oy) * c.scala).toBeLessThanOrEqual(SCOSSA_MAX_PX + 1e-9);
    expect(Math.hypot(c.ox, c.oy)).toBeGreaterThan(0);
    c.aggiorna(300);
    expect(c.ox).toBe(0);
    expect(c.oy).toBe(0);
    expect(c.x).toBe(x);
    expect(c.y).toBe(y);
  });
  it('l\'impulso delle uccisioni arriva a +8% e torna a 1 dopo 300 ms', () => {
    const c = new Camera();
    const base = c.scala;
    c.impulsoZoom();
    c.aggiorna(150);
    expect(c.scala / base).toBeCloseTo(1.08, 3);
    c.aggiorna(200);
    expect(c.scala).toBeCloseTo(base, 9);
  });
});

describe('numeri di danno', () => {
  it('scala 0,4 → 1,25 → 1 in 180 ms', () => {
    expect(scalaNumero(0)).toBeCloseTo(0.4);
    expect(scalaNumero(120)).toBeCloseTo(1.25);
    expect(scalaNumero(180)).toBe(1);
    expect(scalaNumero(800)).toBe(1);
  });
});
