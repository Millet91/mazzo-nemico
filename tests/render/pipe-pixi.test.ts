// Guardia per la build di produzione: le famiglie di oggetti Pixi fuori dal nucleo usate nel gioco devono essere
// importate in render/grafica.ts PRIMA di app.init, altrimenti il renderer nasce senza il loro pipe (errore
// "reading 'updateRenderable'" al primo frame, visto il 21/11/2026 con Text).
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** classe Pixi → sottopercorso che ne registra il pipe */
const FAMIGLIE: Record<string, string> = {
  Text: 'pixi.js/text', HTMLText: 'pixi.js/text-html', BitmapText: 'pixi.js/text-bitmap',
  Mesh: 'pixi.js/mesh', MeshSimple: 'pixi.js/mesh', MeshRope: 'pixi.js/mesh', MeshPlane: 'pixi.js/mesh',
  TilingSprite: 'pixi.js/sprite-tiling', NineSliceSprite: 'pixi.js/sprite-nine-slice',
  ParticleContainer: 'pixi.js/particle-container',
};

function file(c: string): string[] {
  return readdirSync(c).flatMap((n) => {
    const p = join(c, n);
    return statSync(p).isDirectory() ? file(p) : /\.tsx?$/.test(n) ? [p] : [];
  });
}

describe('Pixi · pipe registrati prima di app.init', () => {
  it('ogni famiglia fuori dal nucleo usata in src/ è importata in render/grafica.ts', () => {
    const grafica = readFileSync('src/render/grafica.ts', 'utf8');
    const mancanti: string[] = [];
    for (const f of file('src')) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]pixi\.js['"]/g)) {
        for (const nome of m[1].split(',').map((x) => x.replace(/\btype\b/, '').trim()).filter(Boolean)) {
          const sub = FAMIGLIE[nome];
          if (sub && !grafica.includes(`import '${sub}';`)) mancanti.push(`${f}: ${nome} → manca import '${sub}' in grafica.ts`);
        }
      }
    }
    expect(mancanti).toEqual([]);
  });
});
