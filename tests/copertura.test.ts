// Copertura (Tech): ogni difesa e ogni nemico passano almeno un'ondata reale senza errori,
// e un "fuzz" di run casuali con Sigilli e Bari diversi non rompe le invarianti.
import { describe, it, expect } from 'vitest';
import { blankRun, addCard } from './helpers';
import { WaveSim } from '../src/core/wave';
import { DEFENSES } from '../src/content/defenses';
import { ENEMIES } from '../src/content/enemies';
import { defaultConfig, newRun } from '../src/core/run';
import { playRun } from '../src/sim/bots';
import { spec } from './helpers';
import { BARI } from '../src/content/meta';

const MIX = ['lupo', 'topi', 'volpe', 'mulo', 'affogata', 'gazza', 'barile', 'bocca', 'nebbia', 'falce'];

describe('Copertura', () => {
  it('ogni difesa risolve un’ondata mista senza errori, su 3 seed', () => {
    for (const id of Object.keys(DEFENSES)) {
      for (let sd = 1; sd <= 3; sd++) {
        const r = blankRun();
        for (const m of MIX) addCard(r, m);
        r.sp = 20;
        const d = DEFENSES[id];
        if (d.family === 'segno') r.def.segni[id === 'bastione' ? 4 : 2] = [id];
        else if (d.family === 'trucco') r.def.trucchi = [id];
        else r.def.rito = { id, seme: d.needsSeme ? 'Bastoni' : undefined } as never;
        r.def.segni[0] = r.def.segni[0].length ? r.def.segni[0] : ['brace'];
        const o = new WaveSim(r, spec(), sd).run_();
        expect(o.events.length, id).toBeGreaterThan(0);
        expect(o.limit, id).toBeFalsy();
      }
    }
  });

  it('ogni nemico entra, agisce e finisce l’ondata senza errori', () => {
    for (const id of Object.keys(ENEMIES)) {
      if (ENEMIES[id].tier === 'b' || ENEMIES[id].tier === 't') continue;
      const r = blankRun();
      r.def.segni = [['brace'], ['taglio'], ['lanterna'], ['spina'], ['tagliola']];
      for (const m of [id, id, 'lupo', 'topi']) addCard(r, m);
      const o = new WaveSim(r, spec({ draws: 4 }), 1).run_();
      expect(o.events.length, id).toBeGreaterThan(0);
    }
  });

  it('fuzz: 24 run con Bari e Sigilli diversi, nessuna azione rifiutata', () => {
    for (let i = 0; i < 24; i++) {
      const cfg = defaultConfig({ seed: `fuzz${i}`, baro: BARI[i % BARI.length].id, sigillo: (i * 7) % 11, packs: ['*'], asso: i % 2 === 0 });
      const res = playRun(cfg, i % 3 === 0 ? 'random' : 'medio', i, 3);
      expect(res.errors, cfg.seed).toEqual([]);
    }
  }, 120000);

  it('una run nuova ha già una mappa e un’ondata da preparare', () => {
    const s = newRun(defaultConfig({ seed: 'x' }));
    expect(s.map.length).toBeGreaterThan(0);
  });
});
