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

  it("il volo sul pirata dura quanto l'inquadratura (BIL.camera.inquadraTick)", () => {
    const c = new Camera();
    c.impostaSchermo(914, 411);
    c.vola(600, 600, 0);
    c.vola(1200, 700);
    const n = BIL.camera.inquadraTick;
    for (let i = 0; i < n - 1; i++) c.aggiorna(1000 / 60);
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

  it('avvicina: centro e zoom arrivano insieme, morbidi, e fermano inerzia e volo', () => {
    const c = new Camera();
    c.impostaSchermo(914, 411);
    c.vola(700, 600, 0);
    c.lancia(1, 0);
    c.avvicina(900, 500, 1.0, 16, 180);
    expect(c.scivola).toBe(false);
    expect(c.zoom).toBeLessThan(BIL.camera.zoomPredefinito);
    expect(c.zoom).toBeGreaterThan(1.3); // un frame solo: appena partito
    for (let i = 0; i < 80; i++) c.avvicina(900, 500, 1.0, 16, 180);
    expect(c.zoom).toBeCloseTo(1.0, 2);
    expect(c.x).toBeCloseTo(900, 0);
    expect(c.y).toBeCloseTo(500, 0);
  });

  it('zoomVerso: torna allo zoom dato tenendo il centro e dice quando è arrivato', () => {
    const c = new Camera();
    c.impostaSchermo(914, 411);
    c.vola(1000, 500, 0);
    c.zoomA(0.9);
    let arrivato = false;
    for (let i = 0; i < 120 && !arrivato; i++) arrivato = c.zoomVerso(1.4, 16, 180);
    expect(arrivato).toBe(true);
    expect(c.zoom).toBe(1.4);
    expect(c.x).toBeCloseTo(1000, 0);
  });

  it("inerzia: stesso spazio a 60 e a 120 fps, e si ferma contro il bordo del mondo", () => {
    const a = new Camera(), b = new Camera();
    for (const c of [a, b]) { c.impostaSchermo(914, 411); c.vola(1000, 500, 0); c.lancia(-1, 0); }
    for (let i = 0; i < 30; i++) a.aggiorna(16);
    for (let i = 0; i < 60; i++) b.aggiorna(8);
    expect(a.x).toBeCloseTo(b.x, 1);
    const c = new Camera();
    c.impostaSchermo(914, 411);
    c.vola(0, 500, 0); // già al bordo sinistro
    c.lancia(3, 0);
    c.aggiorna(16);
    expect(c.scivola).toBe(false);
  });
});
