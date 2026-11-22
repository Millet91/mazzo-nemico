// Il cassetto dei suoni pronti (src/audio/cache.ts): chiave dalla build e conversione a 16 bit.
import { describe, it, expect } from 'vitest';
import { a16, chiaveDa, da16 } from '../../src/audio/cache';

describe('Audio · cassetto dei suoni pronti', () => {
  it('la chiave è il file della build con la sua impronta; senza impronta o in sviluppo niente cassetto', () => {
    expect(chiaveDa('https://localhost/assets/index-CkCNdGze.js', false)).toBe('index-CkCNdGze.js');
    expect(chiaveDa('http://localhost:4173/assets/index-Ab_9-xYz.js?v=2', false)).toBe('index-Ab_9-xYz.js');
    expect(chiaveDa('https://localhost/assets/index-CkCNdGze.js', true)).toBeNull();
    expect(chiaveDa('http://localhost:5173/src/audio/cache.ts', false)).toBeNull();
    expect(chiaveDa('file:///app/assets/index.js', false)).toBeNull();
  });

  it('a 16 bit il suono torna uguale a meno di un trentamillesimo, e il picco resta dentro', () => {
    const d = Float32Array.from({ length: 2000 }, (_, i) => Math.sin(i / 7) * 0.89);
    d[5] = 1.3; d[6] = -1.3;
    const r = da16(a16(d));
    expect(r.length).toBe(d.length);
    for (let i = 0; i < d.length; i++) expect(Math.abs(r[i] - Math.max(-1, Math.min(1, d[i])))).toBeLessThan(1 / 30000);
  });
});
