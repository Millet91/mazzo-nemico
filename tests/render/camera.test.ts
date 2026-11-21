import { describe, it, expect } from 'vitest';
import { Camera, CIELO_EXTRA } from '../../src/battaglia/render/camera';
import { BIL } from '../../src/contenuti/bilanciamento';

describe('Camera della battaglia', () => {
  it('altezza logica 540 e larghezza logica tra 960 e 1215', () => {
    const c = new Camera();
    c.impostaSchermo(1080, 540); // 2:1 → 1080 logici
    expect(c.scalaBase).toBeCloseTo(1);
    c.impostaSchermo(2400 / 2.625, 1080 / 2.625); // Pixel 6 in CSS (≈914×411): 20:9 → 1200 logici
    expect(c.w / c.scalaBase).toBeCloseTo(1200, 0);
    c.impostaSchermo(1600, 540); // troppo largo: si tiene 1215
    expect(c.w / c.scalaBase).toBeCloseTo(BIL.camera.larghezzaMax);
    c.impostaSchermo(800, 600); // 4:3: si tiene 960
    expect(c.w / c.scalaBase).toBeCloseTo(BIL.camera.larghezzaMin);
  });

  it('schermo ↔ mondo sono inverse', () => {
    const c = new Camera();
    c.impostaSchermo(914, 411);
    c.vola(700, 600, 0);
    const p = c.mondoDaSchermo(123, 321);
    const q = c.schermoDaMondo(p.x, p.y);
    expect(q.x).toBeCloseTo(123);
    expect(q.y).toBeCloseTo(321);
  });

  it('zoom limitato a 0,5-2,0 e fermo sotto il pinch', () => {
    const c = new Camera();
    c.impostaSchermo(914, 411);
    c.vola(1000, 600, 0);
    const prima = c.mondoDaSchermo(300, 200);
    c.zoomA(1.8, 300, 200);
    const dopo = c.mondoDaSchermo(300, 200);
    expect(dopo.x).toBeCloseTo(prima.x);
    expect(dopo.y).toBeCloseTo(prima.y);
    c.zoomA(10); expect(c.zoom).toBe(BIL.camera.zoomMax);
    c.zoomA(0.01); expect(c.zoom).toBe(BIL.camera.zoomMin);
  });

  it('non mostra fuori dal mondo (sopra si vede un po\' di cielo)', () => {
    const c = new Camera();
    c.impostaSchermo(914, 411);
    c.vola(-500, -2000, 0);
    const alto = c.mondoDaSchermo(0, 0);
    expect(alto.x).toBeCloseTo(0);
    expect(alto.y).toBeCloseTo(-CIELO_EXTRA);
    c.vola(5000, 5000, 0);
    const basso = c.mondoDaSchermo(c.w, c.h);
    expect(basso.x).toBeCloseTo(BIL.mondo.larghezza);
    expect(basso.y).toBeCloseTo(BIL.mondo.altezza);
  });

  it('il volo sul pirata dura 0,6 s', () => {
    const c = new Camera();
    c.impostaSchermo(914, 411);
    c.vola(600, 600, 0);
    c.vola(1200, 700);
    for (let i = 0; i < 35; i++) c.aggiorna(1000 / 60);
    expect(c.inVolo).toBe(true);
    for (let i = 0; i < 2; i++) c.aggiorna(1000 / 60);
    expect(c.inVolo).toBe(false);
    expect(c.x).toBeCloseTo(1200);
    expect(c.y).toBeCloseTo(700);
  });

  it('il trascinamento sposta il mondo col dito', () => {
    const c = new Camera();
    c.impostaSchermo(914, 411);
    c.vola(1000, 600, 0);
    const sotto = c.mondoDaSchermo(400, 200);
    c.trascina(50, 20);
    const dopo = c.schermoDaMondo(sotto.x, sotto.y);
    expect(dopo.x).toBeCloseTo(450);
    expect(dopo.y).toBeCloseTo(220);
  });
});
