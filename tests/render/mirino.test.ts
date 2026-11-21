// Mirino da trascinare (comandi v3): angolo = direzione dal pirata, potenza = distanza dal pirata.
import { describe, it, expect } from 'vitest';
import { creaTrascinaMirino, guadagnoMirino, MIRINO, miraDaMirino, mirinoDaMira, prendeMirino } from '../../src/battaglia/render/mirino';

type M = { mezziGradi: number; potenza: number };

describe('mirino ↔ mira', () => {
  it('45° · 60% e ritorno', () => {
    const p = mirinoDaMira(45, 60);
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBeLessThan(0);
    expect(miraDaMirino(p.x, p.y)).toEqual({ mezziGradi: 90, potenza: 60 });
  });

  it('potenza 0 vicino al pirata, 100 alla distanza massima e oltre', () => {
    expect(miraDaMirino(MIRINO.rMin, 0)).toEqual({ mezziGradi: 0, potenza: 0 });
    expect(miraDaMirino(-MIRINO.rMax, 0)).toEqual({ mezziGradi: 360, potenza: 100 });
    expect(miraDaMirino(0, 500).potenza).toBe(100);
  });

  it('il mirino sta sempre fuori dal corpo del pirata e dentro 136 px', () => {
    for (const pot of [0, 50, 100]) {
      const p = mirinoDaMira(120, pot);
      const r = Math.hypot(p.x, p.y);
      expect(r).toBeGreaterThanOrEqual(MIRINO.rMin - 1e-9);
      expect(r).toBeLessThanOrEqual(MIRINO.rMax + 1e-9);
    }
  });

  it('si prende toccandolo o toccando lì vicino (44 px), non toccando altrove', () => {
    const m = { x: 500, y: 200 };
    expect(prendeMirino(500, 200, m)).toBe(true);
    expect(prendeMirino(530, 225, m)).toBe(true);
    expect(prendeMirino(560, 200, m)).toBe(false);
    expect(prendeMirino(500, 200, null)).toBe(false);
  });
});

describe('trascinare il mirino', () => {
  it('piano = preciso (55% del dito), veloce = segue il dito', () => {
    expect(guadagnoMirino(0)).toBeCloseTo(MIRINO.guadagnoLento);
    expect(guadagnoMirino(5)).toBeCloseTo(MIRINO.guadagnoVeloce);
    expect(guadagnoMirino(0.3)).toBeGreaterThan(MIRINO.guadagnoLento);
    expect(guadagnoMirino(0.3)).toBeLessThan(MIRINO.guadagnoVeloce);
  });

  it('prenderlo senza muoverlo non cambia la mira', () => {
    const inviati: M[] = [];
    const t = creaTrascinaMirino((c) => inviati.push(c));
    t.inizia(mirinoDaMira(45, 60));
    t.sposta(0, 0, 16);
    expect(inviati).toEqual([]);
  });

  it('tirandolo verso l\'alto l\'angolo sale, a passi di mezzo grado', () => {
    const inviati: M[] = [];
    const t = creaTrascinaMirino((c) => inviati.push(c));
    t.inizia(mirinoDaMira(30, 50));
    for (let i = 0; i < 20; i++) t.sposta(0, -2, 16);
    expect(inviati.length).toBeGreaterThan(0);
    expect(inviati.every((m) => Number.isInteger(m.mezziGradi))).toBe(true);
    expect(inviati.at(-1)!.mezziGradi).toBeGreaterThan(60);
  });

  it('allontanandolo dal pirata la potenza sale fino a 100 e lì si ferma, senza corsa a vuoto', () => {
    const inviati: M[] = [];
    const t = creaTrascinaMirino((c) => inviati.push(c));
    t.inizia(mirinoDaMira(0, 20));
    for (let i = 0; i < 30; i++) t.sposta(12, 0, 12);
    expect(inviati.at(-1)).toEqual({ t: 'mira', mezziGradi: 0, potenza: 100 });
    expect(t.mirino.x).toBeCloseTo(MIRINO.rMax);
    // tornando indietro riparte subito
    t.sposta(-12, 0, 12);
    expect(t.mirino.x).toBeLessThan(MIRINO.rMax - 5);
    expect(inviati.at(-1)!.potenza).toBeLessThan(100);
  });

  it('passando sopra il pirata la potenza va a 0, l\'angolo resta, e dall\'altra parte il tiro si gira', () => {
    const inviati: M[] = [];
    const t = creaTrascinaMirino((c) => inviati.push(c));
    t.inizia(mirinoDaMira(0, 20));
    for (let i = 0; i < 80; i++) t.sposta(-3, 0, 16);
    const angoli = [...new Set(inviati.map((m) => m.mezziGradi))].sort((a, b) => a - b);
    expect(angoli).toEqual([0, 360]);
    expect(inviati.some((m) => m.potenza === 0)).toBe(true);
    expect(inviati.at(-1)!.mezziGradi).toBe(360);
    expect(inviati.at(-1)!.potenza).toBeGreaterThan(0);
  });

  it('un colpo di dito veloce porta il tiro dall\'altra parte', () => {
    const inviati: M[] = [];
    const t = creaTrascinaMirino((c) => inviati.push(c));
    t.inizia(mirinoDaMira(45, 60));
    for (let i = 0; i < 10; i++) t.sposta(-20, 0, 8);
    const m = inviati.at(-1)!;
    expect(m.mezziGradi / 2).toBeGreaterThan(110);
    expect(m.mezziGradi / 2).toBeLessThan(180);
  });
});
