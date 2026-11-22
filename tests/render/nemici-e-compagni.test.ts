// Fase 1, Render n.5: frecce rosse per i nemici fuori vista e camera che non lascia compagni sotto i tasti.
import { describe, it, expect } from 'vitest';
import { frecceNemici, frecciaToccata, DISTANZA_FRECCE, METRO_PX } from '../../src/battaglia/render/nemici-fuori-vista';
import { INQUADRA, inZonaLibera, scartoCompagni, sottoITasti } from '../../src/battaglia/render/inquadra';
import { MARGINI_BORDO } from '../../src/battaglia/render/bordo';

// Pixel 6 in orizzontale, px CSS
const W = 915, H = 412;
/** vista finta: il mondo coincide con lo schermo spostato di (cx, cy) */
const vista = (cx = 0, cy = 0) => ({ w: W, h: H, schermoDaMondo: (x: number, y: number) => ({ x: x - cx, y: y - cy }) });

describe('frecce dei nemici fuori vista', () => {
  it('nessuna freccia per chi si vede; una sul bordo per chi è fuori, con la distanza in metri', () => {
    const f = frecceNemici([{ id: 1, x: 400, y: 200 }, { id: 2, x: 1500, y: 200 }], { x: 300, y: 200 }, vista());
    expect(f).toHaveLength(1);
    expect(f[0].id).toBe(2);
    expect(f[0].x).toBe(W - MARGINI_BORDO.dx);
    expect(f[0].metri).toBe(Math.round(1200 / METRO_PX));
    expect(Math.abs(f[0].angolo)).toBeLessThan(0.3); // punta a destra
  });

  it('mai sotto la barra in alto né sotto i tasti negli angoli in basso', () => {
    const nemici = [
      { id: 1, x: -400, y: 900 }, { id: 2, x: 1400, y: 900 }, // in basso a sinistra e a destra
      { id: 3, x: 100, y: 1200 }, { id: 4, x: W - 100, y: 1200 }, // sotto, dentro gli angoli
      { id: 5, x: 450, y: -600 }, // sopra
    ];
    const f = frecceNemici(nemici, null, vista());
    expect(f).toHaveLength(5);
    for (const a of f) {
      expect(a.y, `freccia ${a.id}`).toBeGreaterThanOrEqual(MARGINI_BORDO.su);
      expect(sottoITasti({ x: a.x, y: a.y }, W, H, 0), `freccia ${a.id} sotto i tasti`).toBe(false);
    }
  });

  it('due nemici vicini fuori schermo: le frecce non si sovrappongono', () => {
    const f = frecceNemici([{ id: 1, x: 1400, y: 200 }, { id: 2, x: 1400, y: 205 }, { id: 3, x: 1400, y: 210 }], null, vista());
    for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) {
      expect(Math.hypot(f[i].x - f[j].x, f[i].y - f[j].y)).toBeGreaterThanOrEqual(DISTANZA_FRECCE - 0.01);
    }
  });

  it('un tocco vicino alla freccia la prende, lontano no', () => {
    const f = frecceNemici([{ id: 7, x: 1400, y: 200 }], null, vista());
    expect(frecciaToccata(f, f[0].x - 10, f[0].y + 12)?.id).toBe(7);
    expect(frecciaToccata(f, f[0].x - 80, f[0].y)).toBeNull();
  });
});

describe('compagni mai sotto i tasti', () => {
  it('se nessun compagno è sotto i tasti il pirata resta al centro', () => {
    expect(scartoCompagni([{ x: 100, y: 0 }, { x: -200, y: -50 }], W, H)).toEqual({ x: 0, y: 0 });
  });

  it('un compagno che cadrebbe sotto le frecce: la camera si sposta poco e lo libera, il pirata resta nella parte libera', () => {
    // compagno 300 px a sinistra e 120 più in basso: centro schermo (457, 206) → (157, 326), sotto le frecce
    const c = [{ x: -300, y: 120 }];
    expect(sottoITasti({ x: W / 2 - 300, y: H / 2 + 120 }, W, H)).toBe(true);
    const s = scartoCompagni(c, W, H);
    expect(sottoITasti({ x: W / 2 + s.x - 300, y: H / 2 + s.y + 120 }, W, H)).toBe(false);
    expect(inZonaLibera({ x: W / 2 + s.x, y: H / 2 + s.y }, W, H)).toBe(true);
    expect(Math.hypot(s.x, s.y)).toBeLessThanOrEqual(150);
  });

  it('mentre il pirata cammina lo spostamento resta lo stesso finché basta (niente scatti)', () => {
    const s1 = scartoCompagni([{ x: -300, y: 120 }], W, H);
    const s2 = scartoCompagni([{ x: -290, y: 120 }], W, H, s1);
    expect(s2).toEqual(s1);
    // il compagno ormai lontano dai tasti: si torna al centro
    expect(scartoCompagni([{ x: 50, y: -40 }], W, H, s1)).toEqual({ x: 0, y: 0 });
  });

  it('se non si può liberarli tutti, ne libera il più possibile senza perdere il pirata', () => {
    const c = [{ x: -330, y: 190 }, { x: 330, y: 190 }, { x: 0, y: -10 }];
    const s = scartoCompagni(c, W, H);
    expect(inZonaLibera({ x: W / 2 + s.x, y: H / 2 + s.y }, W, H)).toBe(true);
    expect(Math.abs(s.y)).toBeLessThanOrEqual(90);
    expect(INQUADRA.levaAlta).toBeGreaterThan(0);
  });
});

describe('frecce dei nemici · tanti sullo stesso lato', () => {
  it('tre nemici in basso a destra: le frecce si mettono in fila sopra i tasti, senza toccarsi', () => {
    const f = frecceNemici([{ id: 1, x: 1400, y: 300 }, { id: 2, x: 1400, y: 330 }, { id: 3, x: 1400, y: 360 }], null, vista());
    expect(f).toHaveLength(3);
    for (const a of f) expect(sottoITasti({ x: a.x, y: a.y }, W, H, 0), `freccia ${a.id}`).toBe(false);
    const ys = f.map((a) => a.y).sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(DISTANZA_FRECCE - 0.01);
  });
});
