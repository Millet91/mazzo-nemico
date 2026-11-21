// Guida della fionda: la mano fa il gesto giusto e sparisce dopo 2 tiri; la presa è generosa.
import { describe, expect, it } from 'vitest';
import { CICLO_MANO_MS, TIRI_GUIDA, azzeraGuida, guidaAttiva, posaMano, segnaTiroGuida } from '../../src/battaglia/render/guida';
import { zonaFiondaPx } from '../../src/battaglia/render/input';
import { dentroAnello } from '../../src/battaglia/render/fionda';
import { BIL } from '../../src/contenuti/bilanciamento';

describe('guida della fionda', () => {
  it('la mano parte dal pirata e trascina indietro e in basso, poi lascia', () => {
    expect(posaMano(0, 1)).toMatchObject({ x: 0, y: 0 });
    const meta = posaMano(CICLO_MANO_MS * 0.6, 1);
    expect(meta.premuta).toBe(true);
    expect(meta.x).toBeLessThan(-30); // pirata verso destra → si trascina a sinistra
    expect(meta.y).toBeGreaterThan(20);
    expect(posaMano(CICLO_MANO_MS * 0.6, -1).x).toBeGreaterThan(30);
    expect(posaMano(CICLO_MANO_MS * 0.85, 1).premuta).toBe(false);
  });
  it('sparisce dopo 2 tiri e si può riaccendere', async () => {
    await azzeraGuida();
    for (let i = 0; i < TIRI_GUIDA; i++) { expect(guidaAttiva()).toBe(true); segnaTiroGuida(); }
    expect(guidaAttiva()).toBe(false);
    await azzeraGuida();
    expect(guidaAttiva()).toBe(true);
  });
  it('la fionda parte in un cerchio di 140 px, più largo dell\'anello', () => {
    const r = zonaFiondaPx();
    expect(r).toBe(140);
    expect(r).toBeGreaterThan(BIL.mira.anelloPx);
    expect(dentroAnello(135, 0, 0, 0, r)).toBe(true);
    expect(dentroAnello(145, 0, 0, 0, r)).toBe(false);
  });
});
