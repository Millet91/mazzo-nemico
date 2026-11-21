// Registro asset (03 §8.1): ogni voce è coerente, così la sostituzione dei segnaposto non lascia buchi.
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { ASSETS, problemiAsset, durataAnim, asset, type VisualAsset } from '../../src/assets/registry';

const pirataMorte: VisualAsset = {
  id: 'pirata_morte', cat: 'PIRATA', w: 128, h: 128, tipo: 'anim', glyph: '☠',
  anim: { frames: 10, fps: 12, loop: false, cols: 10, ancora: [64, 120] }, tinta: 'fazione',
};

describe('Registro asset', () => {
  it('tutte le voci del registro sono valide', () => {
    const problemi = Object.entries(ASSETS).flatMap(([k, a]) => problemiAsset(k, a).map((p) => `${k}: ${p}`));
    expect(problemi).toEqual([]);
  });

  it('ogni immagine dichiarata esiste in public/', () => {
    const mancanti = Object.values(ASSETS).filter((a) => a.image && !existsSync(`public/${a.image}`)).map((a) => a.id);
    expect(mancanti).toEqual([]);
  });

  it('accetta una voce animata corretta (esempio di 11 §5: morte 10 f a 12 fps = 833 ms)', () => {
    expect(problemiAsset('pirata_morte', pirataMorte)).toEqual([]);
    expect(durataAnim(pirataMorte)).toBe(833);
    expect(problemiAsset('pirata_morte', { ...pirataMorte, image: 'assets/pirata/pirata_morte.webp', source: 'magnific:abc' })).toEqual([]);
  });

  it('rifiuta le voci incoerenti', () => {
    expect(problemiAsset('altro', pirataMorte)).toContainEqual(expect.stringContaining('diverso dalla chiave'));
    expect(problemiAsset('pirata_morte', { ...pirataMorte, anim: undefined })).toContainEqual(expect.stringContaining('senza `anim`'));
    expect(problemiAsset('pirata_morte', { ...pirataMorte, anim: { ...pirataMorte.anim!, ancora: [64, 200] } }))
      .toContainEqual(expect.stringContaining('ancora'));
    expect(problemiAsset('pirata_morte', { ...pirataMorte, anim: { ...pirataMorte.anim!, frames: 40, cols: 40 } }))
      .toContainEqual(expect.stringContaining('4096'));
    expect(problemiAsset('pirata_morte', { ...pirataMorte, image: 'pirata.png' })).toContainEqual(expect.stringContaining('percorso'));
    expect(problemiAsset('pirata_morte', { ...pirataMorte, source: 'midjourney:1' })).toContainEqual(expect.stringContaining('magnific'));
    expect(problemiAsset('Pirata', { ...pirataMorte, id: 'Pirata' })).toContainEqual(expect.stringContaining('minuscolo'));
    const cornice: VisualAsset = { id: 'corda_9slice', cat: 'UI', w: 256, h: 48, tipo: '9slice', glyph: '═' };
    expect(problemiAsset('corda_9slice', cornice)).toContainEqual(expect.stringContaining('slice'));
    expect(problemiAsset('corda_9slice', { ...cornice, slice: [16, 24, 16, 24] })).toEqual([]);
  });

  it('una voce mancante diventa un segnaposto "?" invece di rompere la UI', () => {
    expect(asset('non_esiste').glyph).toBe('?');
  });
});
