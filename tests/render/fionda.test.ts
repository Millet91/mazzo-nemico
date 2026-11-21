import { describe, it, expect } from 'vitest';
import { dentroAnello, fiondaAMira } from '../../src/battaglia/render/fionda';
import { BIL } from '../../src/contenuti/bilanciamento';

describe('Mira a fionda → comando mira', () => {
  it("si tira nel verso opposto al trascinamento", () => {
    // trascino in basso a sinistra → tiro in alto a destra, 45°
    expect(fiondaAMira(-80, 80)!.mezziGradi).toBe(90);
    // trascino a destra → tiro a sinistra, 180°
    expect(fiondaAMira(100, 0)!.mezziGradi).toBe(360);
    // trascino in basso → tiro in alto, 90°
    expect(fiondaAMira(0, 100)!.mezziGradi).toBe(180);
    // trascino in alto a sinistra → tiro in basso a destra, 315°
    expect(fiondaAMira(-60, -60)!.mezziGradi).toBe(630);
  });

  it('0-160 px = potenza 0-100%, oltre resta 100', () => {
    expect(fiondaAMira(-BIL.mira.trascinamentoMaxPx / 2, 0)!.potenza).toBe(50);
    expect(fiondaAMira(-BIL.mira.trascinamentoMaxPx, 0)!.potenza).toBe(100);
    expect(fiondaAMira(-500, 0)!.potenza).toBe(100);
  });

  it('angoli sempre interi in 0..719', () => {
    for (let a = 0; a < 360; a += 7) {
      const r = (a * Math.PI) / 180;
      const m = fiondaAMira(Math.cos(r) * 120, Math.sin(r) * 120)!;
      expect(Number.isInteger(m.mezziGradi)).toBe(true);
      expect(m.mezziGradi).toBeGreaterThanOrEqual(0);
      expect(m.mezziGradi).toBeLessThan(720);
      expect(Number.isInteger(m.potenza)).toBe(true);
    }
  });

  it('un tocco (trascinamento sotto 8 px) non cambia la mira', () => {
    expect(fiondaAMira(3, 4)).toBeNull();
  });

  it("l'anello è di 100 px", () => {
    expect(dentroAnello(399, 200, 300, 200)).toBe(true);
    expect(dentroAnello(401, 200, 300, 200)).toBe(false);
  });
});
