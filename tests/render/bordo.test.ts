import { describe, expect, it } from 'vitest';
import { MARGINI_BORDO, frecciaBordo } from '../../src/battaglia/render/bordo';

describe('freccia sul bordo verso il mirino fuori schermo', () => {
  it('niente freccia se il mirino si vede', () => {
    expect(frecciaBordo(400, 200, 900, 400)).toBeNull();
  });
  it('a destra: sul bordo destro, punta a destra', () => {
    const f = frecciaBordo(2000, 400 / 2 + (MARGINI_BORDO.su - MARGINI_BORDO.giu) / 2, 900, 400)!;
    expect(f.x).toBeCloseTo(900 - MARGINI_BORDO.dx);
    expect(f.angolo).toBeCloseTo(0);
  });
  it('in alto a sinistra: resta dentro i margini', () => {
    const f = frecciaBordo(-500, -900, 900, 400)!;
    expect(f.x).toBeGreaterThanOrEqual(MARGINI_BORDO.sx - 1e-9);
    expect(f.y).toBeGreaterThanOrEqual(MARGINI_BORDO.su - 1e-9);
    expect(f.angolo).toBeLessThan(0);
  });
});
