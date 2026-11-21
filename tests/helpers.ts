import { newRun, defaultConfig } from '../src/core/run';
import { WaveSim } from '../src/core/wave';
import type { RunState, WaveSpec, DeckCard } from '../src/core/types';

export function blankRun(over: Partial<RunState> = {}): RunState {
  const r = newRun(defaultConfig({ seed: 'test', packs: ['*'] }));
  r.deck = [];
  r.def.segni = [[], [], [], [], []];
  r.def.trucchi = [];
  r.def.rito = null;
  r.def.deposito = [];
  r.lumi = r.maxLumi = 35;
  r.sp = 0;
  r.act = 1;
  Object.assign(r, over);
  return r;
}

export function spec(over: Partial<WaveSpec> = {}): WaveSpec {
  return {
    kind: 'ondata', act: 1, rintocco: 1, draws: 6, L: 5, corrente: 0, contro: [], bossRito: null, bossRitoBonus: 0, extraDraw: 0,
    carry: [], carryBonus: 0, nightBonus: 0, eliteArmor: 0, processione: false, ...over,
  };
}

export function addCard(r: RunState, def: string, over: Partial<DeckCard> = {}): DeckCard {
  r.uidc++;
  const c: DeckCard = { uid: r.uidc, def, rancore: 0, owner: 'fato', lealta: 0, bottino: null, corrotto: false, ...over };
  r.deck.push(c);
  return c;
}

/** Risolve un'ondata con una Coda fissa. */
export function wave(r: RunState, queue: (string | number)[], sp: Partial<WaveSpec> = {}, seed = 1) {
  const sim = new WaveSim(r, spec(sp), seed);
  sim.fixed = queue;
  const out = sim.run_();
  return { out, sim, run: r };
}

export function msgs(out: { events: { msg: string }[] }) {
  return out.events.map((e) => e.msg);
}
