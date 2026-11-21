// Invarianti, determinismo e fuzzing (GDD §16.3).
import { describe, it, expect } from 'vitest';
import { playRun } from '../src/sim/bots';
import { defaultConfig, newRun, apply, replay, stateHash, type Action } from '../src/core/run';
import { Bot } from '../src/sim/bots';
import { minDeck } from '../src/core/wave';
import { P } from '../src/content/config';
import type { RunState } from '../src/core/types';

function checkInvariants(s: RunState) {
  expect(s.lumi).toBeGreaterThanOrEqual(0);
  expect(s.lumi).toBeLessThanOrEqual(s.maxLumi);
  expect(s.sp).toBeGreaterThanOrEqual(0);
  expect(Number.isInteger(s.lumi) && Number.isInteger(s.sp)).toBe(true);
  const uids = s.deck.map((x) => x.uid);
  expect(new Set(uids).size).toBe(uids.length);
  // ogni difesa sta in un solo posto
  const places = [...s.def.segni.flat(), ...s.def.trucchi, ...(s.def.rito ? [s.def.rito.id] : []), ...s.def.deposito, ...s.def.stolen.map((x) => x.segno)];
  expect(new Set(places).size).toBe(places.length);
  s.def.segni.forEach((sl, i) => expect(sl.length).toBeLessThanOrEqual(s.def.cap[i]));
  expect(s.def.trucchi.length).toBeLessThanOrEqual(s.def.tsock);
  expect(s.deck.filter((x) => x.owner === 'baro').length).toBeLessThanOrEqual(P.PATTI_MAX);
  for (const c of s.deck) expect(c.rancore).toBeLessThanOrEqual(2);
}

describe('Invarianti su run complete', () => {
  it('30 run di bot casuali e medi senza violare invarianti né azioni rifiutate', () => {
    for (let i = 0; i < 30; i++) {
      const pol = i % 2 ? 'random' : 'medio';
      const res = playRun(defaultConfig({ seed: `inv${i}`, sigillo: i % 11, packs: ['*'], baro: ['sottovento', 'fattucchiera', 'notaio', 'bracconiera'][i % 4] }), pol, i, 4, checkInvariants);
      expect(res.errors).toEqual([]);
      for (const h of res.history) expect(h.limit).toBe(false);
    }
  }, 120000);

  it('ogni istantanea di ogni ondata ha al massimo una carta per Passo e ogni carta in un solo posto', () => {
    const s = newRun(defaultConfig({ seed: 'snap', packs: ['*'] }));
    const bot = new Bot('random', 7);
    let waves = 0;
    while (!s.ended && waves < 15) {
      const a = bot.decide(s);
      const out = apply(s, a);
      if (out) {
        waves++;
        for (const e of out.events) {
          const ids = [...e.snap.lane.filter(Boolean).map((c) => c!.wid), ...e.snap.queue.map((c) => c.wid)];
          expect(new Set(ids).size).toBe(ids.length);
          expect(e.snap.lane.length).toBeLessThanOrEqual(7);
        }
      }
    }
    expect(waves).toBeGreaterThan(0);
  });
});

describe('Determinismo e replay', () => {
  it('stesso seed e stesse azioni danno lo stesso stato', () => {
    const cfg = defaultConfig({ seed: 'det', packs: ['*'] });
    const actions: Action[] = [];
    const s = newRun(cfg);
    const bot = new Bot('medio', 3, 4);
    for (let i = 0; i < 120 && !s.ended; i++) {
      const a = bot.decide(s);
      apply(s, a);
      actions.push(a);
    }
    const r = replay(cfg, actions);
    expect(stateHash(r)).toBe(stateHash(s));
  });

  it('seed diversi danno mazzi diversi', () => {
    const a = playRun(defaultConfig({ seed: 'A', packs: ['*'] }), 'random', 1, 4);
    const b = playRun(defaultConfig({ seed: 'B', packs: ['*'] }), 'random', 1, 4);
    expect(JSON.stringify(a.history)).not.toBe(JSON.stringify(b.history));
  });

  it('il mazzo non scende sotto il minimo con l’Esilio', () => {
    const s = newRun(defaultConfig({ seed: 'ex', packs: ['*'] }));
    s.phase = 'shop';
    s.shop = { items: [], exileCost: 0, rerolls: 0 };
    s.sp = 9999;
    for (let k = 0; k < 10; k++) s.deck.push({ ...s.deck[0], uid: 1000 + k });
    let fails = 0;
    for (let i = 0; i < 20; i++) {
      try { apply(s, { t: 'exile', uid: s.deck[0].uid }); } catch { fails++; }
    }
    expect(s.deck.length).toBe(minDeck(s));
    expect(fails).toBeGreaterThan(0);
  });
});

describe('Bilanciamento (fumo)', () => {
  it('il bot medio vince più del casuale', () => {
    let rnd = 0, med = 0;
    for (let i = 0; i < 16; i++) {
      if (playRun(defaultConfig({ seed: `bal${i}`, packs: ['*'] }), 'random', i, 4).win) rnd++;
      if (playRun(defaultConfig({ seed: `bal${i}`, packs: ['*'] }), 'medio', i, 4).win) med++;
    }
    expect(med).toBeGreaterThanOrEqual(rnd);
  }, 120000);
});
