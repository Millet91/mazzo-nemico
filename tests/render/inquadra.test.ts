// Inquadratura automatica della mira (agente Comandi): pirata e punto d'impatto sempre nella parte libera
// dello schermo, con lo zoom più alto possibile e lo spostamento più piccolo.
import { describe, it, expect } from 'vitest';
import { inquadra, INQUADRA, inZonaLibera, zoomPigro, zoneLibere } from '../../src/battaglia/render/inquadra';

// Pixel 6 in orizzontale, px CSS; scala base 412/540
const W = 915, H = 412, B = H / 540;
const K_GIOCATORE = B * 1.4, K_MIN = B * 0.5;
const aSchermo = (c: { x: number; y: number; scala: number }, p: { x: number; y: number }) =>
  ({ x: (p.x - c.x) * c.scala + W / 2, y: (p.y - c.y) * c.scala + H / 2 });

describe('zone libere dello schermo', () => {
  it('fascia sopra le leve e colonna in mezzo: gli angoli in basso sono delle leve', () => {
    const [fascia, colonna] = zoneLibere(W, H);
    expect(fascia.y1).toBe(H - INQUADRA.levaAlta);
    expect(colonna.x0).toBe(INQUADRA.levaLarga);
    expect(inZonaLibera({ x: W / 2, y: H / 2 }, W, H)).toBe(true);
    expect(inZonaLibera({ x: W - 110, y: H - 100 }, W, H)).toBe(false); // sotto la leva di mira
    expect(inZonaLibera({ x: 100, y: H - 92 }, W, H)).toBe(false); // sotto la leva di movimento
    expect(inZonaLibera({ x: W / 2, y: H - 60 }, W, H)).toBe(true); // in mezzo alle leve
    expect(inZonaLibera({ x: W / 2, y: 40 }, W, H)).toBe(false); // sotto la barra in alto
  });
});

describe('inquadratura della mira', () => {
  it('se pirata e impatto si vedono già, la camera non si muove e lo zoom resta quello del giocatore', () => {
    const centro = { x: 1000, y: 500 };
    const r = inquadra(centro, { x: 1000, y: 470 }, { x: 1200, y: 480 }, W, H, K_GIOCATORE, K_MIN);
    expect(r.scala).toBeCloseTo(K_GIOCATORE);
    expect(r.x).toBeCloseTo(1000);
    expect(r.y).toBeCloseTo(500);
  });

  it('impatto appena fuori: basta spostarsi, senza allargare', () => {
    const pirata = { x: 1000, y: 500 }, impatto = { x: 1500, y: 520 };
    const r = inquadra(pirata, pirata, impatto, W, H, K_GIOCATORE, K_MIN);
    expect(r.scala).toBeCloseTo(K_GIOCATORE);
    expect(r.x).toBeGreaterThan(1000);
    expect(inZonaLibera(aSchermo(r, pirata), W, H)).toBe(true);
    expect(inZonaLibera(aSchermo(r, impatto), W, H)).toBe(true);
  });

  it('nemico lontano 934 px (il più lontano della mappa di prova): si allarga quanto basta, non di più', () => {
    const pirata = { x: 500, y: 600 }, impatto = { x: 1434, y: 610 };
    const r = inquadra(pirata, pirata, impatto, W, H, K_GIOCATORE, K_MIN);
    expect(r.scala).toBeLessThan(K_GIOCATORE);
    expect(r.scala / B).toBeGreaterThan(1.0); // resta uno zoom comodo
    const p = aSchermo(r, pirata), i = aSchermo(r, impatto);
    expect(inZonaLibera(p, W, H)).toBe(true);
    expect(inZonaLibera(i, W, H)).toBe(true);
    // usa tutta la larghezza libera
    expect(i.x - p.x).toBeCloseTo(W - 2 * INQUADRA.lato, 0);
  });

  it('bersaglio molto più in basso: finisce nella colonna tra le leve, non sotto un pollice', () => {
    const pirata = { x: 800, y: 300 }, impatto = { x: 1100, y: 560 };
    const r = inquadra(pirata, pirata, impatto, W, H, K_GIOCATORE, K_MIN);
    const i = aSchermo(r, impatto);
    expect(inZonaLibera(aSchermo(r, pirata), W, H)).toBe(true);
    expect(inZonaLibera(i, W, H)).toBe(true);
    expect(i.x).toBeGreaterThanOrEqual(INQUADRA.levaLarga - 0.01);
    expect(i.x).toBeLessThanOrEqual(W - INQUADRA.levaLarga + 0.01);
  });

  it('verso sinistra funziona allo stesso modo (specchiato)', () => {
    const pirata = { x: 1400, y: 600 };
    const dx = inquadra(pirata, pirata, { x: 2200, y: 640 }, W, H, K_GIOCATORE, K_MIN);
    const sx = inquadra(pirata, pirata, { x: 600, y: 640 }, W, H, K_GIOCATORE, K_MIN);
    expect(sx.scala).toBeCloseTo(dx.scala);
    expect(sx.x - pirata.x).toBeCloseTo(-(dx.x - pirata.x));
  });

  it('non si stringe mai oltre lo zoom del giocatore e non si allarga oltre lo zoom minimo', () => {
    const pirata = { x: 100, y: 500 };
    const vicino = inquadra(pirata, pirata, { x: 120, y: 500 }, W, H, K_GIOCATORE, K_MIN);
    expect(vicino.scala).toBeCloseTo(K_GIOCATORE);
    const lontanissimo = inquadra(pirata, pirata, { x: 6000, y: 500 }, W, H, K_GIOCATORE, K_MIN);
    expect(lontanissimo.scala).toBeCloseTo(K_MIN);
    expect(Number.isFinite(lontanissimo.x)).toBe(true);
  });

  it('senza impatto (sciabola) tiene dentro solo il pirata', () => {
    const pirata = { x: 1000, y: 500 };
    const r = inquadra({ x: 1900, y: 500 }, pirata, null, W, H, K_GIOCATORE, K_MIN);
    expect(r.scala).toBeCloseTo(K_GIOCATORE);
    expect(inZonaLibera(aSchermo(r, pirata), W, H)).toBe(true);
  });

  it('è stabile: dal centro trovato, ricalcolando non ci si sposta più', () => {
    const pirata = { x: 500, y: 600 }, impatto = { x: 1300, y: 350 };
    const r = inquadra(pirata, pirata, impatto, W, H, K_GIOCATORE, K_MIN);
    const r2 = inquadra(r, pirata, impatto, W, H, K_GIOCATORE, K_MIN);
    expect(r2.x).toBeCloseTo(r.x);
    expect(r2.y).toBeCloseTo(r.y);
    expect(r2.scala).toBeCloseTo(r.scala);
  });
});

describe('zoom pigro', () => {
  it('si allarga subito, si restringe solo oltre il 12%', () => {
    expect(zoomPigro(1.4, 1.1)).toBe(1.1);
    expect(zoomPigro(1.1, 1.2)).toBe(1.1);
    expect(zoomPigro(1.1, 1.4)).toBe(1.4);
  });
});
