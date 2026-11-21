// Bot per il simulatore headless (GDD §7.3, §13.5): casuale, medio, greedy (anteprima di un'ondata).
import { Rng } from '../core/rng';
import { apply, allies, eventChoices, hypotheticalWave, newRun, ownedIds, pattiMax, affinabili, sellValue, type Action } from '../core/run';
import type { RunConfig } from '../core/types';
import { meanDamage } from '../core/forecast';
import { minDeck, cardForza } from '../core/wave';
import { DEFENSES } from '../content/defenses';
import { ENEMIES } from '../content/enemies';
import { P } from '../content/config';
import type { RunState } from '../core/types';

export type Policy = 'random' | 'medio' | 'greedy';

export interface BotOpts {
  K: number;
}

function placements(s: RunState, id: string): Partial<Action & { slot?: number; replace?: number }>[] {
  const d = DEFENSES[id];
  if (!d) return [{}];
  if (d.family === 'segno') {
    if (id === 'bastione') return [{ slot: 4 }];
    return [0, 1, 2, 3, 4].map((slot) => ({ slot }));
  }
  if (d.family === 'trucco') {
    if (id === 'rogoArchivio' || s.def.trucchi.length < s.def.tsock) return [{}];
    return s.def.trucchi.map((_, replace) => ({ replace }));
  }
  return [{}];
}

function withWave(s: RunState): RunState {
  const c = structuredClone(s);
  if (!c.wave) c.wave = hypotheticalWave(c);
  return c;
}

/** valuta "danno atteso" dopo aver applicato una modifica (più basso è meglio) */
function evalWith(s: RunState, mod: (c: RunState) => void, K: number): number {
  const c = withWave(s);
  c.phase = 'prep';
  try {
    mod(c);
  } catch {
    return 1e9;
  }
  if ((c.phase as string) === 'exilePick') {
    // Rogo dell'Archivio: esilia le più forti
    while (c.exilePick && c.exilePick.n > 0) {
      const en = c.deck.filter((x) => x.owner === 'fato').sort((a, b) => cardForza(b) - cardForza(a));
      if (!en.length || c.deck.length <= minDeck(c)) break;
      c.deck = c.deck.filter((x) => x !== en[0]);
      c.exilePick.n--;
    }
    c.exilePick = null;
    c.phase = 'prep';
  }
  return meanDamage(c, K);
}

export function bestPick(s: RunState, ids: string[], K: number, allowSkip: boolean): { id: string | null; slot?: number; replace?: number; gap?: number } {
  const scored: { v: number; id: string | null; slot?: number; replace?: number }[] = [];
  for (const id of ids) {
    let best: { v: number; id: string; slot?: number; replace?: number } | null = null;
    for (const pl of placements(s, id)) {
      const v = evalWith(s, (c) => {
        c.offer = null;
        gain(c, id, pl.slot, pl.replace);
      }, K);
      if (!best || v < best.v) best = { v, id, slot: pl.slot, replace: pl.replace };
    }
    if (best) scored.push(best);
  }
  if (allowSkip) scored.push({ v: evalWith(s, () => {}, K) - P.SKIP * 0.05, id: null });
  scored.sort((a, b) => a.v - b.v);
  const named = scored.filter((x) => x.id);
  const gap = named.length >= 2 ? named[1].v - named[0].v : undefined;
  return { ...scored[0], gap };
}

function gain(c: RunState, id: string, slot?: number, replace?: number) {
  c.phase = 'offer';
  c.offer = { ids: [id], source: 'ondata', canSkip: false };
  apply(c, { t: 'pick', id, slot, replace });
}

function randomPick(s: RunState, ids: string[], r: Rng): Action {
  const id = r.pick(ids);
  const d = DEFENSES[id];
  if (!d) return { t: 'pick', id };
  if (d.family === 'segno') {
    const free = [0, 1, 2, 3, 4].filter((i) => s.def.segni[i].length < s.def.cap[i]);
    const slot = id === 'bastione' ? 4 : free.length ? r.pick(free) : r.int(5);
    return { t: 'pick', id, slot };
  }
  if (d.family === 'trucco' && s.def.trucchi.length >= s.def.tsock) return { t: 'pick', id, replace: r.int(s.def.trucchi.length) };
  return { t: 'pick', id };
}

export class Bot {
  policy: Policy;
  r: Rng;
  K: number;
  gaps: number[] = [];
  picks: Record<string, number> = {};
  offered: Record<string, number> = {};
  shopSteps = 0;
  constructor(policy: Policy, seed: number, K = 8) {
    this.policy = policy;
    this.r = Rng.from(`bot${seed}`);
    this.K = K;
  }
  smart(): boolean {
    if (this.policy === 'greedy') return true;
    if (this.policy === 'medio') return this.r.int(100) < 50;
    return false;
  }

  decide(s: RunState): Action {
    const r = this.r;
    switch (s.phase) {
      case 'map': {
        const lv = s.map[s.level];
        this.shopSteps = 0;
        if (this.policy === 'random') return { t: 'map', node: r.pick(lv).id };
        const pref = (k: string) => lv.find((n) => n.kind === k);
        const hp = s.lumi / s.maxLumi;
        const order: string[] =
          s.level === 3 ? (hp >= 0.6 ? ['elite', 'ondata'] : ['ondata', 'elite'])
          : s.level === 5 ? (hp < 0.8 ? ['riposo', 'negozio'] : ['negozio', 'riposo'])
          : s.level === 2 ? (s.sp >= 12 ? ['negozio', 'evento', 'riposo'] : hp < 0.7 ? ['riposo', 'evento', 'negozio'] : ['evento', 'negozio', 'riposo'])
          : ['ondata', 'negozio', 'evento', 'riposo', 'elite', 'mazziere'];
        for (const k of order) { const n = pref(k); if (n) return { t: 'map', node: n.id }; }
        return { t: 'map', node: lv[0].id };
      }
      case 'offer': {
        const o = s.offer!;
        for (const id of o.ids) this.offered[id] = (this.offered[id] ?? 0) + 1;
        let a: Action;
        if (this.smart()) {
          const b = bestPick(s, o.ids, this.K, o.canSkip);
          if (b.gap !== undefined) this.gaps.push(b.gap);
          a = { t: 'pick', id: b.id, slot: b.slot, replace: b.replace };
        } else a = randomPick(s, o.ids, r);
        if (a.t === 'pick' && a.id) this.picks[a.id] = (this.picks[a.id] ?? 0) + 1;
        return a;
      }
      case 'prep': {
        // rimette in gioco ciò che è nel Deposito (come il simulatore di design)
        for (const id of s.def.deposito) {
          const d = DEFENSES[id];
          if (d.family === 'segno') {
            const free = [0, 1, 2, 3, 4].filter((i) => s.def.segni[i].length < s.def.cap[i] && (id !== 'bastione' || i === 4));
            if (free.length) return { t: 'place', id, slot: free[Math.floor(free.length / 2)] };
          }
          if (d.family === 'trucco' && s.def.trucchi.length < s.def.tsock) return { t: 'setTrucco', id };
          if (d.family === 'rito' && !s.def.rito) return { t: 'setRito', id };
        }
        return { t: 'start' };
      }
      case 'summary':
        return { t: 'continue' };
      case 'patto': {
        const c = s.pattoCands ?? [];
        const take = this.smart() || r.int(100) < 50;
        if (!c.length || !take || allies(s).length >= pattiMax(s)) return { t: 'patto', uid: null };
        const best = [...c].sort((a, b) => ENEMIES[b.def].forza - ENEMIES[a.def].forza)[0];
        return { t: 'patto', uid: best.uid };
      }
      case 'shop':
        return this.shop(s);
      case 'rest': {
        if (s.lumi <= s.maxLumi - 8 || this.policy === 'random') return { t: 'rest', choice: 'cura' };
        const id = [...s.def.segni.flat(), ...s.def.trucchi].find((x) => !s.def.plus.includes(x));
        if (id) return { t: 'rest', choice: 'affina', id };
        return { t: 'rest', choice: 'studia' };
      }
      case 'event': {
        const ch = eventChoices(s).filter((c) => c.enabled);
        let c = this.policy === 'random' ? r.pick(ch) : ch.find((x) => x.id !== 'no' && !['pegni', 'processione', 'pozzo', 'prete', 'vedova'].includes(s.event!.id)) ?? ch.find((x) => x.id === 'no') ?? ch[0];
        let arg: string | number | undefined;
        if (c.arg === 'ally') arg = [...allies(s)].sort((a, b) => a.lealta - b.lealta)[0]?.uid;
        if (c.arg === 'defense') arg = s.def.deposito[0] ?? ownedIds(s).filter((x) => !s.def.stolen.some((y) => y.segno === x))[0];
        if (c.arg === 'segnoDeposito') arg = s.def.deposito.find((x) => DEFENSES[x].family === 'segno');
        if (c.arg === 'slot') arg = [4, 3, 2, 1, 0].find((i) => s.def.cap[i] < 2);
        if (c.arg === 'cand') arg = (s.event!.data.cands as number[])[0];
        if (arg === undefined && c.arg) c = ch.find((x) => x.id === 'no') ?? c;
        return { t: 'event', choice: c.id, arg };
      }
      case 'forestiero': {
        const ids = s.boss!.forestiero!.ids;
        if (this.smart()) {
          const b = bestPick(s, ids, Math.max(4, this.K / 2), false);
          const rest = ids.filter((x) => x !== b.id);
          const order = { trucco: 0, rito: 1, segno: 2 };
          const give = rest.sort((a, c) => order[DEFENSES[a].family] - order[DEFENSES[c].family])[0];
          return { t: 'forestiero', keep: b.id!, give, slot: b.slot };
        }
        const sh = r.shuffle([...ids]);
        return { t: 'forestiero', keep: sh[0], give: sh[1] };
      }
      case 'sellPick': {
        const dep = [...s.def.deposito].sort((a, b) => sellValue(a) - sellValue(b));
        return { t: 'sellPick', id: this.policy === 'random' ? r.pick(dep) : dep[0] };
      }
      case 'exilePick': {
        const en = s.deck.filter((x) => x.owner === 'fato').sort((a, b) => cardForza(b) - cardForza(a) || a.uid - b.uid);
        if (!en.length || s.deck.length <= minDeck(s)) return { t: 'exileDone' };
        return { t: 'exilePick', uid: this.policy === 'random' ? r.pick(en).uid : en[0].uid };
      }
      default:
        return { t: 'continue' };
    }
  }

  shop(s: RunState): Action {
    const sh = s.shop!;
    const r = this.r;
    const g = this.smart();
    this.shopSteps++;
    if (this.shopSteps > 8) return { t: 'leave' };
    if (s.lumi <= 0.5 * s.maxLumi && s.sp >= P.HEAL_COST + (s.cfg.sigillo >= 4 ? 2 : 0) && s.lumi < s.maxLumi) return { t: 'heal' };
    const al = allies(s).find((x) => x.lealta <= 1);
    if (al && s.sp >= P.RINSALDA && g) return { t: 'rinsalda', uid: al.uid };
    if (s.def.stolen.length && s.sp >= P.RISCATTO) return { t: 'riscatto', segno: s.def.stolen[0].segno };
    const aff = sh.items.map((it, k) => ({ ...it, k })).filter((it) => !it.sold && it.price <= s.sp);
    if (aff.length) {
      if (g) {
        const base = evalWith(s, () => {}, Math.max(4, this.K - 2));
        const b = bestPick(s, aff.map((x) => x.id), Math.max(4, this.K - 2), false);
        if (b.id && base - evalWithPick(s, b, Math.max(4, this.K - 2)) >= 0.3) {
          const it = aff.find((x) => x.id === b.id)!;
          this.picks[b.id] = (this.picks[b.id] ?? 0) + 1;
          return { t: 'buy', index: it.k, slot: b.slot };
        }
      } else if (r.int(100) < 60) {
        const it = r.pick(aff);
        const slot = DEFENSES[it.id].family === 'segno' ? (it.id === 'bastione' ? 4 : r.int(5)) : undefined;
        return { t: 'buy', index: it.k, slot };
      }
    }
    if (s.sp >= sh.exileCost && (g || r.int(100) < 50) && s.deck.length > minDeck(s)) {
      const en = s.deck.filter((x) => x.owner === 'fato').sort((a, b) => cardForza(b) - cardForza(a) || a.uid - b.uid);
      if (en.length) return { t: 'exile', uid: en[0].uid };
    }
    if (g && !sh.affinato && s.sp >= P.SHOP_AFFINA + 5) {
      const id = affinabili(s).find((x) => !s.def.stolen.some((y) => y.segno === x));
      if (id) return { t: 'shopAffina', id };
    }
    if (s.lumi <= 0.8 * s.maxLumi && s.sp >= P.HEAL_COST + (s.cfg.sigillo >= 4 ? 2 : 0)) return { t: 'heal' };
    return { t: 'leave' };
  }
}

function evalWithPick(s: RunState, b: { id: string | null; slot?: number; replace?: number }, K: number) {
  return evalWith(s, (c) => { if (b.id) gain(c, b.id, b.slot, b.replace); }, K);
}

export interface RunResult {
  win: boolean;
  rintocco: number;
  where: string;
  lumi: number;
  history: RunState['history'];
  picks: Record<string, number>;
  offered: Record<string, number>;
  gaps: number[];
  patti: number;
  bossKills: number;
  deck: number;
  actions: number;
  errors: string[];
  sp: number;
  owned: string[];
}

export function playRun(cfg: RunConfig, policy: Policy, botSeed: number, K = 8, check?: (s: RunState) => void): RunResult {
  const s = newRun(cfg);
  const bot = new Bot(policy, botSeed, K);
  let n = 0;
  const errors: string[] = [];
  while (!s.ended && n < 2000) {
    const a = bot.decide(s);
    try {
      apply(s, a);
    } catch (e) {
      errors.push(`${s.phase}: ${(e as Error).message} ${JSON.stringify(a)}`);
      // via d'uscita per non bloccare il bot
      if (s.phase === 'shop') apply(s, { t: 'leave' });
      else if (s.phase === 'event') apply(s, { t: 'event', choice: 'no' });
      else if (s.phase === 'exilePick') apply(s, { t: 'exileDone' });
      else if (s.phase === 'offer' && s.offer) apply(s, { t: 'pick', id: s.offer.canSkip ? null : s.offer.ids[0] });
      else if (s.phase === 'prep') apply(s, { t: 'start' });
      else if (s.phase === 'sellPick') apply(s, { t: 'sellPick', id: s.def.deposito[0] });
      else break;
    }
    check?.(s);
    n++;
  }
  const last = s.history[s.history.length - 1];
  const where = s.won ? 'win' : last ? `${last.kind}@${last.act}` : '?';
  return {
    win: s.won, rintocco: s.rintocco, where, lumi: s.lumi, history: s.history, picks: bot.picks, offered: bot.offered,
    gaps: bot.gaps, patti: s.stats.patti, bossKills: s.stats.bossKills, deck: s.deck.length, actions: n, errors,
    sp: s.sp, owned: ownedIds(s),
  };
}
