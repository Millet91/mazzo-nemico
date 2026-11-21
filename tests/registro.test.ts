// Completezza del registro asset (Tech/Art): ogni carta, difesa, scena e suono usato ha una voce,
// così la sostituzione con gli asset definitivi non lascia buchi.
import { describe, it, expect } from 'vitest';
import { ENEMIES } from '../src/content/enemies';
import { DEFENSES } from '../src/content/defenses';
import { BOSS_TEXT, EVENTS, BARI } from '../src/content/meta';
import { ENEMY_ART, DEFENSE_ART, SCENE_ART, SOUNDS } from '../src/assets/registry';
import { readFileSync } from 'node:fs';

describe('Registro asset', () => {
  it('ogni nemico e ogni difesa ha un asset', () => {
    expect(Object.keys(ENEMIES).filter((id) => !ENEMY_ART[id])).toEqual([]);
    expect(Object.keys(DEFENSES).filter((id) => !DEFENSE_ART[id])).toEqual([]);
  });
  it('ogni scena usata ha un asset', () => {
    const need = ['porta', 'porta_0', 'porta_1', 'porta_2', 'lume', 'spicciolo', 'mazzo', ...Object.values(BOSS_TEXT).map((b) => b.id), ...EVENTS.map((e) => 'ev_' + e.id), ...BARI.map((b) => 'baro_' + b.id)];
    expect(need.filter((id) => !SCENE_ART[id])).toEqual([]);
  });
  it('ogni suono chiamato dalla UI è nel registro', () => {
    const src = ['src/ui/board.tsx', 'src/ui/screens.tsx', 'src/ui/store.ts', 'src/ui/menus.tsx'].map((f) => readFileSync(f, 'utf8')).join('\n');
    const used = [...src.matchAll(/sfx\('([a-zA-Z]+)'/g)].map((m) => m[1]);
    expect([...new Set(used)].filter((c) => !(c in SOUNDS))).toEqual([]);
  });
  it('i glifi dei nemici sono unici (Art: niente doppioni)', () => {
    const g = Object.entries(ENEMY_ART).filter(([id]) => ENEMIES[id] && ENEMIES[id].tier !== 'b').map(([, a]) => a.glyph);
    const dup = g.filter((x, k) => g.indexOf(x) !== k);
    expect(dup).toEqual([]);
  });
});
