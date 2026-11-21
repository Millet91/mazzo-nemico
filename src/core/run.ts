// La run: stato e reducer (GDD §4.2, §6, §7). step(stato, azione) → nuovo stato.
// Replay = seed + lista di azioni (GDD §13.4).

import { Rng, seedRng, STREAMS, type RngState } from './rng';
import { P, MAP_LEVELS, CONTENT_VERSION, type NodeKind } from '../content/config';
import { ENEMIES, NORMAL_BY_ACT, ELITE_BY_ACT, BOSS_BY_ACT, SEMI, type Seme } from '../content/enemies';
import { DEFENSES, ALL_DEFENSE_IDS, type Rarity } from '../content/defenses';
import { BARI, EVENTS, FAMIGLIE, BOSS_TEXT } from '../content/meta';
import { TUTORIAL } from '../content/tutorial';
import { WaveSim, minDeck, type WaveOutcome } from './wave';
import type { Asso, DeckCard, MapNode, Phase, RunConfig, RunState, WaveSpec, WaveSummary } from './types';

export type Action =
  | { t: 'map'; node: string }
  | { t: 'pick'; id: string | null; slot?: number; seme?: Seme; replace?: number }
  | { t: 'reroll' }
  | { t: 'place'; id: string; slot: number }
  | { t: 'unplace'; id: string }
  | { t: 'setTrucco'; id: string; index?: number }
  | { t: 'setRito'; id: string; seme?: Seme }
  | { t: 'setSeme'; seme: Seme }
  | { t: 'mark'; uid: number }
  | { t: 'truccato'; uids: number[] }
  | { t: 'start'; asso?: Asso | null }
  | { t: 'continue' }
  | { t: 'patto'; uid: number | null; dissolve?: number }
  | { t: 'buy'; index: number; slot?: number }
  | { t: 'exile'; uid: number }
  | { t: 'basamento'; slot: number }
  | { t: 'heal' }
  | { t: 'rinsalda'; uid: number }
  | { t: 'sciogli'; uid: number }
  | { t: 'riscatto'; segno: string }
  | { t: 'shopReroll' }
  | { t: 'sell'; id: string }
  | { t: 'leave' }
  | { t: 'rest'; choice: 'cura' | 'affina' | 'studia'; id?: string }
  | { t: 'event'; choice: string; arg?: string | number }
  | { t: 'forestiero'; keep: string; give: string; slot?: number }
  | { t: 'exilePick'; uid: number }
  | { t: 'exileDone' }
  | { t: 'sellPick'; id: string }
  | { t: 'shopAffina'; id: string };

export class RuleError extends Error {}
/** "La Gazza" → "la Gazza" dentro una frase */
export function lc(name: string) {
  return /^(Il|Lo|La|I|Gli|Le|L')\b/.test(name) || name.startsWith("L'") ? name[0].toLowerCase() + name.slice(1) : name;
}
function fail(msg: string): never {
  throw new RuleError(msg);
}

// ------------------------------------------------------------------ utilità
export function rng(s: RunState, stream: string): Rng {
  const r = new Rng(s.rng[stream]);
  return new Proxy(r, {
    get(target, prop, recv) {
      const v = Reflect.get(target, prop, recv);
      if (typeof v === 'function') {
        return (...args: unknown[]) => {
          const out = (v as (...a: unknown[]) => unknown).apply(target, args);
          s.rng[stream] = target.state;
          return out;
        };
      }
      return v;
    },
  });
}

export function ownedIds(s: RunState): string[] {
  const d = s.def;
  return [...d.segni.flat(), ...d.trucchi, ...(d.rito ? [d.rito.id] : []), ...d.deposito, ...d.stolen.map((x) => x.segno), ...(d.consumed ?? [])];
}

export function allies(s: RunState): DeckCard[] {
  return s.deck.filter((x) => x.owner === 'baro');
}

function newCard(s: RunState, def: string): DeckCard {
  s.uidc++;
  return { uid: s.uidc, def, rancore: 0, owner: 'fato', lealta: 0, bottino: null, corrotto: false };
}

export function priceOf(s: RunState, id: string): number {
  const base = P.PRICE[DEFENSES[id].rarity];
  return s.cfg.sigillo >= 4 ? Math.round(base * 1.2) : base;
}

export function exileCost(s: RunState): number {
  return (s.cfg.sigillo >= 9 ? 20 : P.EXILE) + P.EXILE_STEP * s.exiles;
}

export function basamentoCost(s: RunState): number {
  if (s.cfg.baro === 'sottovento' && s.basamentiComprati === 0) return 0;
  return s.cfg.sigillo >= 4 ? Math.round(P.BASAMENTO * 1.2) : P.BASAMENTO;
}

export function visibleQueue(s: RunState): number {
  let v = s.cfg.sigillo >= 7 ? 1 : P.VISIBLE_QUEUE;
  if (s.cfg.baro === 'notaio') v = Math.max(v, s.def.trucchi.includes('oracolo') ? 99 : 4);
  if (s.def.trucchi.includes('oracolo')) v = Math.max(v, s.def.plus.includes('oracolo') ? 6 : 4);
  if (s.intel.studia) v = Math.max(v, 5);
  if (s.intel.fullOrder) v = 99;
  return v;
}

export function pattiMax(s: RunState) {
  return s.act >= 3 ? P.PATTI_MAX_A3 : P.PATTI_MAX;
}

export function lealtaStart(s: RunState) {
  return s.cfg.baro === 'bracconiera' ? 5 : P.LEALTA;
}

// ------------------------------------------------------------------ creazione
export function defaultConfig(over: Partial<RunConfig> = {}): RunConfig {
  return { seed: String(Date.now() % 1e9), baro: 'sottovento', sigillo: 0, asso: true, tutorial: false, packs: [], contentVersion: CONTENT_VERSION, ...over };
}

export function newRun(cfg: RunConfig): RunState {
  const r: Record<string, RngState> = {};
  for (const st of STREAMS) r[st] = seedRng(`${cfg.seed}/${st}`);
  const baro = BARI.find((b) => b.id === cfg.baro) ?? BARI[0];
  const lumi = cfg.sigillo >= 6 ? P.LUMI - 5 : P.LUMI;
  const s: RunState = {
    cfg, rng: r, uidc: 0, phase: 'map', act: 1, level: 0, map: [], node: null, rintocco: 0, wavesInAct: 0,
    lumi, maxLumi: lumi, sp: 0, deck: [],
    def: { segni: [[], [], [], [], []], cap: [1, 1, 1, 1, 1], trucchi: [], tsock: cfg.baro === 'fattucchiera' ? 3 : P.TSOCK, rito: null, deposito: [], plus: [], stolen: [], marked: [], truccato: null, ritoSeme: {}, consumed: [] },
    exiles: 0, pity: 0, freeRerolls: 1, basamentiComprati: 0, offer: null, announced: [], wave: null, boss: null, shop: null,
    event: null, pattoCands: null, pattoNext: null, exilePick: null, lastSummary: null, history: [], chronicle: [],
    intel: { fullOrder: 0, studia: 0, bambini: 0, extraShop: 0, processione: false },
    famiglia: ['', ''],
    stats: { patti: 0, exiled: 0, maxCombo: 0, firstImpact: null, stolen: 0, killed: 0, dmgTaken: 0, bossKills: 0 },
    tutorialStep: 0, ended: false, won: false,
  };
  const fam = rng(s, 'cosmetic').pick(FAMIGLIE);
  s.famiglia = [fam[0], fam[1]];
  if (cfg.tutorial) {
    s.act = 0;
    s.map = TUTORIAL.map((_, k) => [{ id: `t${k}`, kind: 'ondata' as NodeKind, level: k + 1 }]);
    for (const id of ['topo', 'topo', 'topo']) s.deck.push(newCard(s, id));
    return s;
  }
  for (const id of P.START_DECK) s.deck.push(newCard(s, id));
  for (const k of baro.kit) {
    const d = DEFENSES[k.id];
    if (d.family === 'segno') s.def.segni[k.slot ?? 2].push(k.id);
    else if (d.family === 'trucco') s.def.trucchi.push(k.id);
    else s.def.rito = { id: k.id };
  }
  if (cfg.baro === 'bracconiera') {
    const c = newCard(s, 'lupo');
    c.owner = 'baro';
    c.lealta = 5;
    s.deck.push(c);
  }
  s.map = genMap(s);
  s.chronicle.push({ rintocco: 0, kind: 'start', text: `Calò la notte su Sottovento. ${baroSubj(s)} vegliava sulla casa ${deiCasa(s.famiglia[0])}: ${s.famiglia[1]}.` });
  return s;
}

function genMap(s: RunState): MapNode[][] {
  const r = rng(s, 'map');
  return MAP_LEVELS.map((kinds, li) => {
    let ks = [...kinds];
    if (ks.length === 3 && (li === 2 || li === 4) && r.chance(0.35)) ks.splice(r.int(3), 1);
    return ks.map((k, j) => {
      const n: MapNode = { id: `a${s.act}l${li + 1}n${j}`, kind: k, level: li + 1 };
      if (k === 'evento') n.eventId = r.pick(EVENTS).id;
      return n;
    });
  });
}

// ------------------------------------------------------------------ ondate
export function nightBonus(s: RunState): number {
  return (P.ACT_BONUS[s.act] ?? 0) + (s.cfg.sigillo >= 8 ? 1 : 0);
}

function baseSpec(s: RunState, kind: WaveSpec['kind'], draws: number): WaveSpec {
  return {
    kind, act: s.act, rintocco: s.rintocco, draws, L: 5, corrente: 0, contro: [], bossRito: null, bossRitoBonus: 0,
    extraDraw: 0, carry: [], carryBonus: 0, nightBonus: s.act === 0 ? 0 : nightBonus(s), eliteArmor: s.cfg.sigillo >= 1 ? 1 : 0, eliteForza: s.cfg.sigillo >= 1 ? P.SIGILLO1_ELITE_FORZA : 0,
    processione: false,
  };
}

/** Ondata ipotetica per valutare una scelta quando non c'è un'ondata in preparazione (bot, Δ previsione). */
export function hypotheticalWave(s: RunState): { spec: WaveSpec; seed: number } {
  const act = Math.max(1, s.act);
  const spec = baseSpec(s, 'ondata', P.DRAWS[act][Math.min(3, s.wavesInAct)]);
  spec.act = act;
  spec.rintocco = s.rintocco + 1;
  return { spec, seed: 12345 + s.rintocco };
}

function setupWave(s: RunState, kind: 'ondata' | 'elite') {
  s.rintocco++;
  const act = s.act;
  const draws = P.DRAWS[act][Math.min(3, s.wavesInAct)];
  s.wavesInAct++;
  const spec = baseSpec(s, kind, draws);
  if (kind === 'elite') spec.elite = ELITE_BY_ACT[act];
  if (s.intel.processione) { spec.processione = true; s.intel.processione = false; }
  annuncio(s);
  s.wave = { spec, seed: rng(s, 'draw').fork() };
  s.offer = makeOffer(s, 3, null, 'ondata', true);
  s.phase = 'offer';
}

function annuncio(s: RunState) {
  let k = P.ADDS[s.act] ?? 2;
  if (s.def.trucchi.includes('censura')) k += s.def.plus.includes('censura') ? 2 : 1;
  if (s.cfg.sigillo >= 2) k += 1;
  const r = rng(s, 'deck');
  const cur = NORMAL_BY_ACT[s.act];
  const prev: string[] = [];
  for (let a = 1; a < s.act; a++) prev.push(...NORMAL_BY_ACT[a]);
  s.announced = [];
  for (let i = 0; i < k; i++) {
    const src = !prev.length || r.int(100) < 70 ? cur : prev;
    const c = newCard(s, r.pick(src));
    s.deck.push(c);
    s.announced.push(c.uid);
  }
}

function isUnlocked(s: RunState, id: string) {
  const p = DEFENSES[id].pack;
  return !p || s.cfg.packs.includes(p) || s.cfg.packs.includes('*');
}

export function makeOffer(s: RunState, n: number, rarity: Rarity | null, source: RunState['offer'] extends infer O ? O extends { source: infer S } ? S : never : never, canSkip: boolean, stream = 'rewards', rarityMix?: [number, number, number]) {
  const ids = rollDefenses(s, n, rarity, stream, rarityMix);
  if (source === 'ondata' && ids.length >= 3) maybeUpgradeOption(s, ids, stream);
  return { ids, source, canSkip };
}

/** posti liberi della famiglia */
export function familyFull(s: RunState, fam: string): boolean {
  if (fam === 'segno') return s.def.segni.every((x, i) => x.length >= s.def.cap[i]);
  if (fam === 'trucco') return s.def.trucchi.length >= s.def.tsock;
  return !!s.def.rito;
}

/** Difese attive (in gioco) non ancora affinate. */
export function affinabili(s: RunState): string[] {
  const d = s.def;
  return [...d.segni.flat(), ...d.trucchi, ...(d.rito ? [d.rito.id] : [])].filter((x) => !d.plus.includes(x));
}

/** SD-4: quando i posti della famiglia della terza difesa sono pieni, la terza opzione diventa "Affina una tua difesa". */
function maybeUpgradeOption(s: RunState, ids: string[], stream: string) {
  const last = ids[ids.length - 1];
  if (!familyFull(s, DEFENSES[last].family)) return;
  const cands = affinabili(s);
  if (!cands.length) return;
  ids[ids.length - 1] = `affina:${rng(s, stream).pick(cands)}`;
}

export function rollDefenses(s: RunState, n: number, rarity: Rarity | null, stream = 'rewards', mix?: [number, number, number]): string[] {
  const r = rng(s, stream);
  const owned = new Set(ownedIds(s));
  const pool: Record<Rarity, string[]> = { C: [], NC: [], R: [] };
  for (const id of ALL_DEFENSE_IDS) if (!owned.has(id) && isUnlocked(s, id)) pool[DEFENSES[id].rarity].push(id);
  const out: string[] = [];
  let tries = 0;
  let gotRare = false;
  while (out.length < n && tries < 60) {
    tries++;
    let w: Rarity;
    if (rarity) w = rarity;
    else {
      const [c, nc, rr] = mix ?? (P.RARITY[Math.max(1, s.act)] as [number, number, number]);
      w = r.weighted(['C', 'NC', 'R'] as Rarity[], [c, nc, rr + (mix ? 0 : s.pity)]);
    }
    let cand = pool[w].filter((x) => !out.includes(x));
    if (!cand.length) cand = [...pool.C, ...pool.NC, ...pool.R].filter((x) => !out.includes(x));
    if (!cand.length) break;
    const pick = r.pick(cand);
    if (DEFENSES[pick].rarity === 'R') gotRare = true;
    out.push(pick);
  }
  // CD-3: una terna ha almeno due famiglie diverse
  if (out.length >= 3 && new Set(out.map((x) => DEFENSES[x].family)).size === 1) {
    const fam = DEFENSES[out[0]].family;
    const last = out[out.length - 1];
    const sameR = (pool[DEFENSES[last].rarity] ?? []).filter((x) => DEFENSES[x].family !== fam && !out.includes(x));
    const any = [...pool.C, ...pool.NC, ...pool.R].filter((x) => DEFENSES[x].family !== fam && !out.includes(x) && (!rarity || DEFENSES[x].rarity === rarity));
    const alt = sameR.length ? sameR : any;
    if (alt.length) out[out.length - 1] = r.pick(alt);
  }
  if (!rarity && !mix && stream === 'rewards') s.pity = gotRare ? 0 : s.pity + P.PITY_STEP;
  return out;
}

/** Piazza una difesa appena ottenuta. */
export function gainDefense(s: RunState, id: string, slot?: number, seme?: Seme, replace?: number) {
  if (id.startsWith('affina:')) {
    const t = id.slice(7);
    if (!ownedIds(s).includes(t) || s.def.plus.includes(t)) fail('Difesa non affinabile');
    s.def.plus.push(t);
    return;
  }
  const d = DEFENSES[id];
  if (ownedIds(s).includes(id)) fail('Hai già questa difesa');
  if (d.family === 'segno') {
    let sl = slot;
    if (id === 'bastione') sl = 4;
    if (sl === undefined) {
      const free = [2, 3, 1, 4, 0].find((i) => s.def.segni[i].length < s.def.cap[i] && (id !== 'bastione' || i === 4));
      if (free === undefined) { s.def.deposito.push(id); return; }
      sl = free;
    }
    if (s.def.segni[sl].length >= s.def.cap[sl]) s.def.deposito.push(s.def.segni[sl].shift()!);
    s.def.segni[sl].push(id);
  } else if (d.family === 'trucco') {
    if (id === 'rogoArchivio') {
      s.def.consumed = [...(s.def.consumed ?? []), id]; // consumato: non torna nelle offerte
      s.exilePick = { n: s.def.plus.includes('rogoArchivio') ? 3 : 2, back: s.phase, reason: "Rogo dell'Archivio" };
      s.phase = 'exilePick';
      s.chronicle.push({ rintocco: s.rintocco, kind: 'rogo', text: `${baroSubj(s)} diede fuoco all'archivio del Fato.` });
      return;
    }
    if (s.def.trucchi.length < s.def.tsock) s.def.trucchi.push(id);
    else {
      const k = replace ?? 0;
      s.def.deposito.push(s.def.trucchi[k]);
      s.def.trucchi[k] = id;
    }
    if (id === 'segnare') autoMark(s);
  } else {
    if (s.def.rito) s.def.deposito.push(s.def.rito.id);
    s.def.rito = { id, seme: d.needsSeme ? seme ?? s.def.ritoSeme[id] ?? autoSeme(s, id) : undefined };
    if (s.def.rito.seme) s.def.ritoSeme[id] = s.def.rito.seme;
  }
}

export function autoSeme(s: RunState, id: string): Seme {
  const avg = SEMI.map((se) => {
    const fs = s.deck.filter((x) => x.owner === 'fato' && ENEMIES[x.def].seme === se).map((x) => ENEMIES[x.def].forza + x.rancore);
    return { se, n: fs.length, m: fs.length ? fs.reduce((a, b) => a + b, 0) / fs.length : 0 };
  }).filter((x) => x.n);
  if (!avg.length) return 'Bastoni';
  avg.sort((a, b) => (id === 'avanguardia' ? a.m - b.m : b.m - a.m));
  return avg[0].se;
}

function autoMark(s: RunState) {
  const max = s.def.plus.includes('segnare') ? 2 : 1;
  const en = s.deck.filter((x) => x.owner === 'fato').sort((a, b) => ENEMIES[b.def].forza + b.rancore - (ENEMIES[a.def].forza + a.rancore) || a.uid - b.uid);
  s.def.marked = en.slice(0, max).map((x) => x.uid);
}

// ------------------------------------------------------------------ boss
function setupBossPhase(s: RunState) {
  const b = s.boss!;
  const act = b.act;
  const draws = P.BOSS_DRAWS[act][b.phase];
  const spec = baseSpec(s, 'boss', draws);
  spec.phase = b.phase;
  const variant = s.cfg.sigillo >= 5;
  if (s.cfg.sigillo >= 10 && act === 3 && b.extraRule === undefined) b.extraRule = 1 + rng(s, 'boss').int(2);
  const r1 = s.cfg.sigillo >= 10 && act === 3 && b.extraRule === 1;
  const r2 = s.cfg.sigillo >= 10 && act === 3 && b.extraRule === 2;
  if (act === 1 || r1) { spec.carry = b.carry.filter((u) => s.deck.some((x) => x.uid === u)); spec.carryBonus = variant ? 1 : 0; }
  if (act === 2 || r2) { spec.contro = [...b.contro]; spec.bossRito = b.bossRito; spec.extraDraw = b.extraDraw; spec.bossRitoBonus = variant && b.bossRito ? 1 : 0; }
  if (act === 3) { spec.L = 5 + b.phase; spec.corrente = variant ? 2 : 3; }
  if (b.phase === 2) spec.boss = BOSS_BY_ACT[act];
  s.wave = { spec, seed: rng(s, 'boss').fork() };
  if (act === 2 || r2) {
    b.forestiero = { ids: rollDefenses(s, 3, null, 'boss'), keep: null, give: null, done: false };
    s.phase = 'forestiero';
  } else s.phase = 'prep';
}

function forestieroGive(s: RunState, give: string) {
  const b = s.boss!;
  const fam = DEFENSES[give].family;
  const variant = s.cfg.sigillo >= 5;
  if (fam === 'trucco') b.extraDraw += variant ? 2 : 1;
  else if (fam === 'rito') b.bossRito = 'discesa';
  else {
    const cnt = s.def.segni.map((x) => x.length);
    const order = [4, 3, 2, 1, 0].filter((i) => !b.contro.includes(i));
    order.sort((x, y) => cnt[y] - cnt[x] || y - x);
    if (order.length) b.contro.push(order[0]);
    if (variant && order.length > 1) b.contro.push(order[1]);
  }
  s.wave!.spec.contro = [...b.contro];
  s.wave!.spec.bossRito = b.bossRito;
  s.wave!.spec.extraDraw = b.extraDraw;
}

// ------------------------------------------------------------------ risoluzione
export function resolveWave(s: RunState, asso: Asso | null = null): WaveOutcome {
  if (!s.wave) fail('Nessuna ondata');
  const sim = new WaveSim(s, s.wave.spec, s.wave.seed, asso);
  return sim.run_();
}

function afterWave(s: RunState, out: WaveOutcome, lumiBefore: number) {
  const spec = s.wave!.spec;
  if (!out.defeat && out.dmg === 0) { s.sp += P.CLEAN; out.gained += P.CLEAN; }
  // Segni rubati da carte che non sono nel mazzo (Brigante, Copie): tornano dopo un rintocco (QA P1-1)
  const back = s.def.stolen.filter((x) => x.holder === null && x.returnAt !== undefined && x.returnAt <= s.rintocco);
  for (const x of back) { s.def.deposito.push(x.segno); out.returned = [...(out.returned ?? []), DEFENSES[x.segno].name]; }
  s.def.stolen = s.def.stolen.filter((x) => !back.includes(x));
  const betrayed: string[] = [];
  if (spec.kind !== 'boss') betrayed.push(...lealtaTick(s, out.drawnUids, out.allyLoss));
  s.stats.dmgTaken += out.dmg;
  s.stats.killed += out.destroyedNames.length;
  s.stats.stolen += out.stolen.length;
  s.stats.exiled += out.exiled.length;
  s.stats.maxCombo = Math.max(s.stats.maxCombo, out.maxCombo);
  if (!s.stats.firstImpact && out.firstImpact) {
    s.stats.firstImpact = out.firstImpact;
    s.chronicle.push({ rintocco: s.rintocco, kind: 'impact', text: `Al rintocco ${s.rintocco} la prima sventura alla Soglia fu ${lc(out.firstImpact)}.` });
  }
  for (const st of out.stolen) s.chronicle.push({ rintocco: s.rintocco, kind: 'steal', text: `Al rintocco ${s.rintocco} sparì il Segno ${st}.` });
  if (out.maxCombo >= 5) s.chronicle.push({ rintocco: s.rintocco, kind: 'combo', text: `Al rintocco ${s.rintocco} i trucchi ${baroDi(s)} scattarono ${out.maxCombo} volte in un solo battito.` });
  for (const b of betrayed) s.chronicle.push({ rintocco: s.rintocco, kind: 'betray', text: `Il patto con ${lc(b)} si ruppe, e la carta tornò dal Fato.` });
  const sum: WaveSummary = {
    rintocco: s.rintocco, act: s.act, kind: spec.kind === 'boss' ? `Mazziere, fase ${(spec.phase ?? 0) + 1}` : spec.kind,
    lumiBefore, lumiAfter: s.lumi, dmg: out.dmg, gained: out.gained, destroyed: out.destroyedNames, arrived: out.arrivedNames,
    stolen: out.stolen, mvp: out.mvp, dangerous: out.dangerous, ticks: out.ticks, betrayed, limit: out.limit,
    chainCuts: out.chainCuts, allyHurt: out.allyHurt, returned: out.returned,
  };
  s.lastSummary = sum;
  s.history.push(sum);
  s.intel.fullOrder = 0;
  s.intel.studia = 0;
  if (s.intel.bambini > 0) s.intel.bambini--;
  s.def.truccato = null;
  if (out.defeat || s.lumi <= 0) {
    s.phase = 'defeat';
    s.ended = true;
    s.won = false;
    s.chronicle.push({ rintocco: s.rintocco, kind: 'end', text: `Al rintocco ${s.rintocco} l'ultimo Lume si spense, e la sventura entrò in casa.` });
    // N17 · il Baro Caduto, versione leggera: la promessa per la prossima notte
    s.chronicle.push({ rintocco: s.rintocco, kind: 'end', text: `Il Fato tenne le carte, e anche ${baroObj(s)}. Il prossimo inverno sarà nel mazzo.` });
    return;
  }
  if (s.boss) {
    const b = s.boss;
    b.dmgTot += out.dmg;
    b.drawnAll.push(...out.drawnUids);
    if (out.bossDead) b.bossDead = true;
    b.allyLoss = b.allyLoss ?? {};
    for (const [u, n] of Object.entries(out.allyLoss)) b.allyLoss[Number(u)] = (b.allyLoss[Number(u)] ?? 0) + n;
    b.carry = out.destroyedUids.filter((u) => s.deck.some((x) => x.uid === u && x.owner === 'fato' && ENEMIES[x.def].tier === 'n'));
  }
  // CD-4: al massimo 3 candidate, le più forti con id diversi
  const cands = out.destroyedUids
    .map((u) => s.deck.find((x) => x.uid === u))
    .filter((x): x is DeckCard => !!x && x.owner === 'fato' && ENEMIES[x.def].tier === 'n');
  const byId = new Map<string, DeckCard>();
  for (const x of cands) if (!byId.has(x.def)) byId.set(x.def, x);
  s.pattoCands = [...byId.values()]
    .sort((a, b) => ENEMIES[b.def].forza - ENEMIES[a.def].forza || a.uid - b.uid)
    .slice(0, 3)
    .map((x) => ({ uid: x.uid, def: x.def }));
  s.phase = 'summary';
}

export function lealtaTick(s: RunState, drawn: number[], extra: Record<number, number>): string[] {
  const out: string[] = [];
  for (const x of s.deck) {
    if (x.owner !== 'baro') continue;
    if (!drawn.includes(x.uid) && !extra[x.uid]) continue;
    x.lealta -= (drawn.includes(x.uid) ? 1 : 0) + (extra[x.uid] ?? 0);
    if (x.lealta <= 0) {
      x.owner = 'fato';
      x.corrotto = true;
      x.lealta = 0;
      out.push(ENEMIES[x.def].name);
    }
  }
  return out;
}

function goMap(s: RunState) {
  s.wave = null;
  s.offer = null;
  s.node = null;
  s.phase = 'map';
  if (s.cfg.tutorial && s.level >= s.map.length) {
    s.phase = 'victory';
    s.ended = true;
    s.won = true;
  }
}

function finishBoss(s: RunState) {
  const b = s.boss!;
  lealtaTick(s, b.drawnAll, b.allyLoss ?? {});
  s.sp += P.BOSS_WIN;
  if (b.bossDead) s.stats.bossKills++;
  const bt = BOSS_TEXT[b.act];
  // N3 · la Piena è un fiume: non si alza e non parla
  s.chronicle.push({ rintocco: s.rintocco, kind: 'boss', text: b.act === 3 ? `La Piena si ritirò verso il fiume.${b.bossDead ? ' La sua carta era stata stracciata.' : ''}` : `${bt.name} si alzò dal tavolo: «${bt.defeat}»${b.bossDead ? ' La sua carta era stata stracciata.' : ''}` });
  s.pattoNext = 'map';
  if (b.act >= 3) { s.pattoCands = null; afterPatto(s); return; } // dopo la Piena la notte finisce: niente Patto (SD-14)
  enterPatto(s, 'boss');
}

function enterPatto(s: RunState, _from: 'elite' | 'boss') {
  s.phase = 'patto';
  if (!s.pattoCands || !s.pattoCands.length) {
    // nessuna candidata: si prendono i 5 Spiccioli
    s.sp += P.PATTO_RIFIUTO;
    afterPatto(s);
  }
}

function afterPatto(s: RunState) {
  s.pattoCands = null;
  if (s.boss) {
    const act = s.boss.act;
    const dead = s.boss.bossDead;
    s.boss = null;
    s.offer = { ids: rollDefenses(s, 3, null, 'rewards', [0, 60, 40]), source: 'mazziere', canSkip: true };
    s.phase = 'offer';
    // LD P0.3: distruggere la carta del Mazziere dà prima una difesa rara a scelta tra 2
    if (dead && act < 3) s.offer = { ids: rollDefenses(s, 2, 'R'), source: 'trofeo', canSkip: false };
    if (act >= 3) {
      s.offer = null;
      s.phase = 'victory';
      s.ended = true;
      s.won = true;
      s.chronicle.push({ rintocco: s.rintocco, kind: 'win', text: `All'alba il gallo cantò. La casa ${deiCasa(s.famiglia[0])} era salva fino all'inverno.` });
    }
    return;
  }
  // élite: una difesa rara tra 2
  s.offer = { ids: rollDefenses(s, 2, 'R'), source: 'rara', canSkip: false };
  s.phase = 'offer';
}

function nextAct(s: RunState) {
  s.act++;
  s.level = 0;
  s.wavesInAct = 0;
  s.freeRerolls = 1;
  s.map = genMap(s);
  goMap(s);
}

// ------------------------------------------------------------------ eventi
function enterEvent(s: RunState, id: string) {
  s.event = { id, step: 0, data: {} };
  s.phase = 'event';
  const r = rng(s, 'events');
  if (id === 'pozzo') {
    const fato = s.deck.filter((x) => x.owner === 'fato' && ENEMIES[x.def].tier === 'n');
    r.shuffle(fato);
    s.event.data.cands = fato.slice(0, 3).map((x) => x.uid);
  }
  if (id === 'vicini') {
    s.event.data.card = r.pick(NORMAL_BY_ACT[Math.max(1, s.act)]);
  }
}

export function eventChoices(s: RunState): { id: string; label: string; enabled: boolean; arg?: 'ally' | 'defense' | 'segnoDeposito' | 'slot' | 'cand' }[] {
  const e = s.event;
  if (!e) return [];
  const al = allies(s).length > 0;
  const segDep = s.def.deposito.some((x) => DEFENSES[x].family === 'segno');
  const owned = ownedIds(s).filter((x) => !s.def.stolen.some((y) => y.segno === x));
  if (e.step === 1 && e.id === 'pozzo') return [{ id: 'scegli', label: 'Stringi il Patto con una di queste carte', enabled: true, arg: 'cand' }];
  switch (e.id) {
    case 'comare': return [{ id: 'si', label: "Ascolta: vedi l'ordine esatto della prossima pescata, ma il Fato aggiunge una Nebbia", enabled: true }, { id: 'no', label: 'Tira dritto', enabled: true }];
    case 'pozzo': return [{ id: 'getta', label: 'Getta 8 Spiccioli: 50% un Patto con una carta a scelta tra 3, 50% il Fato aggiunge una Bocca del Pozzo', enabled: s.sp >= 8 && allies(s).length < pattiMax(s) }, { id: 'no', label: 'Lascia stare', enabled: true }];
    case 'prete': return [{ id: 'esilia', label: 'Esilia una carta a scelta, ma sciogli un tuo Patto', enabled: al, arg: 'ally' }, { id: 'no', label: 'Ringrazia e vai', enabled: true }];
    case 'cartaio': return [{ id: 'cedi', label: 'Cedi una tua difesa: esilia 2 carte a scelta', enabled: owned.length > 0, arg: 'defense' }, { id: 'no', label: 'Non oggi', enabled: true }];
    case 'pegni': return [{ id: 'basamento', label: '−5 Lumi massimi: un Basamento gratis', enabled: s.maxLumi > 10, arg: 'slot' }, { id: 'trucco', label: '−5 Lumi massimi: un terzo posto Trucco', enabled: s.maxLumi > 10 && s.def.tsock < 3 }, { id: 'no', label: 'Non impegni nulla', enabled: true }];
    case 'bambini': return [{ id: 'cedi', label: 'Regala un Segno dal Deposito: per 3 rintocchi sai qual è la carta più forte e dove sta', enabled: segDep, arg: 'segnoDeposito' }, { id: 'no', label: 'Non hai niente per loro', enabled: true }];
    case 'processione': return [{ id: 'segui', label: 'Segui la processione: il prossimo rintocco ha 2 Denari in più, ma ogni Denari distrutta vale doppio', enabled: true }, { id: 'no', label: 'Chiudi le imposte', enabled: true }];
    case 'gatto': return [{ id: 'no', label: 'Torna indietro', enabled: true }, { id: 'prosegui', label: 'Prosegui: una carta a caso prende Rancore +1, ma il prossimo negozio ha 4 offerte', enabled: true }];
    case 'vedova': return [{ id: 'sciogli', label: 'Sciogli un Patto: 2 Spiccioli per ogni Lealtà rimasta e una difesa non comune', enabled: al, arg: 'ally' }, { id: 'no', label: 'I tuoi Patti restano con te', enabled: true }];
    case 'vicini': return [{ id: 'accetta', label: `Accetta: ${ENEMIES[e.data.card as string]?.name} entra nel tuo mazzo, scegli una difesa rara tra 2`, enabled: true }, { id: 'no', label: 'Sbarra la porta', enabled: true }];
  }
  return [];
}

function doEvent(s: RunState, choice: string, arg?: string | number) {
  const e = s.event!;
  const ch = eventChoices(s).find((c) => c.id === choice);
  if (!ch || !ch.enabled) fail('Scelta non disponibile');
  const done = () => { s.event = null; goMap(s); };
  const r = rng(s, 'events');
  const ev = EVENTS.find((x) => x.id === e.id)!;
  const met = e.step === 0 && !s.chronicle.some((c) => c.kind === 'event' && c.rintocco === s.rintocco);
  if (choice === 'no') {
    if (met) s.chronicle.push({ rintocco: s.rintocco, kind: 'event', text: `${baroSubj(s)} incontrò ${ev.who}, e tirò dritto.` });
    done();
    return;
  }
  if (met) s.chronicle.push({ rintocco: s.rintocco, kind: 'event', text: `${baroSubj(s)} incontrò ${ev.who}, e accettò.` });
  switch (e.id) {
    case 'comare':
      s.intel.fullOrder = 1;
      s.deck.push(newCard(s, 'nebbia'));
      return done();
    case 'pozzo':
      if (e.step === 0) {
        s.sp -= 8;
        if (r.int(100) < 50) { e.step = 1; return; }
        s.deck.push(newCard(s, 'bocca'));
        s.chronicle.push({ rintocco: s.rintocco, kind: 'event', text: 'Dal pozzo salì solo una voce, e una Bocca in più.' });
        return done();
      } else {
        const uid = Number(arg);
        if (!(e.data.cands as number[]).includes(uid)) fail('Carta non valida');
        makePatto(s, uid);
        return done();
      }
    case 'prete': {
      const uid = Number(arg);
      const a = s.deck.find((x) => x.uid === uid && x.owner === 'baro');
      if (!a) fail('Scegli un tuo Patto');
      s.deck = s.deck.filter((x) => x !== a);
      s.event = null;
      s.exilePick = { n: 1, back: 'map', reason: 'il Prete' };
      s.phase = 'exilePick';
      return;
    }
    case 'cartaio': {
      const id = String(arg);
      removeDefense(s, id);
      s.event = null;
      s.exilePick = { n: 2, back: 'map', reason: 'il Cartaio' };
      s.phase = 'exilePick';
      return;
    }
    case 'pegni':
      s.maxLumi -= 5;
      s.lumi = Math.min(s.lumi, s.maxLumi);
      if (choice === 'basamento') {
        const sl = Number(arg ?? 2);
        if (s.def.cap[sl] >= 2) fail('Quel Passo ha già un Basamento');
        s.def.cap[sl] = 2;
      } else s.def.tsock = 3;
      return done();
    case 'bambini': {
      const id = String(arg);
      if (!s.def.deposito.includes(id) || DEFENSES[id].family !== 'segno') fail('Scegli un Segno del Deposito');
      s.def.deposito = s.def.deposito.filter((x) => x !== id);
      s.intel.bambini = 3;
      return done();
    }
    case 'processione':
      s.intel.processione = true;
      return done();
    case 'gatto': {
      const fato = s.deck.filter((x) => x.owner === 'fato' && x.rancore < 2);
      if (fato.length) r.pick(fato).rancore++;
      s.intel.extraShop = 1;
      return done();
    }
    case 'vedova': {
      const uid = Number(arg);
      const a = s.deck.find((x) => x.uid === uid && x.owner === 'baro');
      if (!a) fail('Scegli un tuo Patto');
      s.sp += 2 * a.lealta;
      s.deck = s.deck.filter((x) => x !== a);
      const nc = rollDefenses(s, 1, 'NC', 'events');
      if (nc.length) gainDefense(s, nc[0]);
      return done();
    }
    case 'vicini':
      s.deck.push(newCard(s, e.data.card as string));
      s.event = null;
      s.offer = { ids: rollDefenses(s, 2, 'R', 'events'), source: 'evento', canSkip: false };
      s.phase = 'offer';
      return;
  }
}

function makePatto(s: RunState, uid: number) {
  const x = s.deck.find((c) => c.uid === uid);
  if (!x || x.owner !== 'fato' || ENEMIES[x.def].tier !== 'n') fail('Carta non valida per un Patto');
  if (allies(s).length >= pattiMax(s)) fail(`Hai già ${pattiMax(s)} Patti`);
  x.owner = 'baro';
  x.lealta = lealtaStart(s);
  x.rancore = 0;
  x.corrotto = false;
  if (x.bottino) { s.def.deposito.push(x.bottino); s.def.stolen = s.def.stolen.filter((y) => y.holder !== x.uid); x.bottino = null; }
  s.stats.patti++;
  s.chronicle.push({ rintocco: s.rintocco, kind: 'patto', text: pattoLine(s, lc(ENEMIES[x.def].name)) });
}

export function removeDefense(s: RunState, id: string) {
  const d = s.def;
  let found = false;
  for (const sl of d.segni) { const k = sl.indexOf(id); if (k >= 0) { sl.splice(k, 1); found = true; } }
  if (d.trucchi.includes(id)) { d.trucchi = d.trucchi.filter((x) => x !== id); found = true; }
  if (d.rito?.id === id) { d.rito = null; found = true; }
  if (d.deposito.includes(id)) { d.deposito = d.deposito.filter((x) => x !== id); found = true; }
  if (!found) fail('Non possiedi questa difesa');
  d.plus = d.plus.filter((x) => x !== id);
}

function exileCard(s: RunState, uid: number) {
  const x = s.deck.find((c) => c.uid === uid);
  if (!x) fail('Carta non trovata');
  if (s.deck.length <= minDeck(s)) fail(`Il mazzo non può scendere sotto ${minDeck(s)} carte`);
  if (x.bottino) { s.def.deposito.push(x.bottino); s.def.stolen = s.def.stolen.filter((y) => y.holder !== uid); }
  s.deck = s.deck.filter((c) => c.uid !== uid);
  s.stats.exiled++;
}

// ------------------------------------------------------------------ negozio
function enterShop(s: RunState) {
  const n = 3 + (s.intel.extraShop ? 1 : 0);
  s.intel.extraShop = 0;
  const ids = rollDefenses(s, n, null, 'shop');
  s.shop = { items: ids.map((id) => ({ id, price: priceOf(s, id), sold: false })), exileCost: exileCost(s), rerolls: 0 };
  s.phase = 'shop';
}

// ------------------------------------------------------------------ reducer
export function step(prev: RunState, a: Action): RunState {
  const s = structuredClone(prev);
  apply(s, a);
  return s;
}

/** Applica l'azione in place (per i bot e il simulatore). */
export function apply(s: RunState, a: Action): WaveOutcome | null {
  const out = apply0(s, a);
  checkDeposito(s);
  return out;
}

function apply0(s: RunState, a: Action): WaveOutcome | null {
  if (s.ended && a.t !== 'continue') fail('La run è finita');
  switch (a.t) {
    case 'map': {
      if (s.phase !== 'map') fail('Non sei sulla mappa');
      const lv = s.map[s.level];
      const node = lv?.find((n) => n.id === a.node);
      if (!node) fail('Nodo non raggiungibile');
      s.level++;
      s.node = node;
      if (s.cfg.tutorial) { setupTutorial(s); return null; }
      switch (node.kind) {
        case 'ondata': setupWave(s, 'ondata'); break;
        case 'elite': setupWave(s, 'elite'); break;
        case 'negozio': enterShop(s); break;
        case 'riposo': s.phase = 'rest'; break;
        case 'evento': enterEvent(s, node.eventId!); break;
        case 'mazziere':
          s.rintocco++;
          s.boss = { act: s.act, phase: 0, carry: [], contro: [], bossRito: null, extraDraw: 0, bossDead: false, dmgTot: 0, drawnAll: [] };
          setupBossPhase(s);
          break;
      }
      return null;
    }
    case 'pick': {
      if (s.phase !== 'offer' || !s.offer) fail('Nessuna offerta');
      const o = s.offer;
      if (a.id === null) {
        if (!o.canSkip) fail('Devi scegliere');
        if (o.source === 'ondata') s.sp += P.SKIP;
      } else {
        if (!o.ids.includes(a.id)) fail('Difesa non offerta');
        gainDefense(s, a.id, a.slot, a.seme, a.replace);
      }
      s.offer = null;
      if ((s.phase as Phase) === 'exilePick') {
        s.exilePick!.back = o.source === 'ondata' || o.source === 'tutorial' ? 'prep' : o.source === 'mazziere' ? 'nextAct' : 'map';
        // il trofeo del Mazziere è seguito dalla sua offerta: la mostriamo dopo l'esilio
        if (o.source === 'trofeo') { s.exilePick!.back = 'offer'; s.offer = { ids: rollDefenses(s, 3, null, 'rewards', [0, 60, 40]), source: 'mazziere', canSkip: true }; }
        return null;
      }
      afterOffer(s, o.source);
      return null;
    }
    case 'reroll': {
      if (s.phase !== 'offer' || !s.offer) fail('Nessuna offerta');
      if (s.offer.source === 'forestiero') fail('Non qui');
      if (s.freeRerolls > 0) s.freeRerolls--;
      else { if (s.sp < P.REROLL) fail('Spiccioli insufficienti'); s.sp -= P.REROLL; }
      const n = s.offer.ids.length;
      const rare = s.offer.source === 'rara' || s.offer.source === 'evento' ? 'R' : null;
      s.offer.ids = rollDefenses(s, n, rare, 'rewards', s.offer.source === 'mazziere' ? [0, 60, 40] : undefined);
      return null;
    }
    case 'place': {
      prepOnly(s);
      const d = DEFENSES[a.id];
      if (!d || d.family !== 'segno') fail('Non è un Segno');
      if (a.slot < 0 || a.slot > 4) fail('Passo non valido');
      if (a.id === 'bastione' && a.slot !== 4) fail("Il Bastione si piazza solo sull'Uscio");
      const from = s.def.segni.findIndex((x) => x.includes(a.id));
      const inDep = s.def.deposito.includes(a.id);
      if (from < 0 && !inDep) fail('Segno non disponibile');
      if (from === a.slot) return null;
      if (from >= 0) s.def.segni[from] = s.def.segni[from].filter((x) => x !== a.id);
      else s.def.deposito = s.def.deposito.filter((x) => x !== a.id);
      const dest = s.def.segni[a.slot];
      if (dest.length >= s.def.cap[a.slot]) {
        const out = dest.shift()!;
        if (from >= 0 && (out !== 'bastione' || from === 4)) s.def.segni[from].push(out);
        else s.def.deposito.push(out);
      }
      dest.push(a.id);
      return null;
    }
    case 'unplace': {
      prepOnly(s);
      const d = s.def;
      if (d.deposito.length >= P.DEPOSITO_MAX) fail(`Il Deposito è pieno (${P.DEPOSITO_MAX})`);
      if (d.segni.some((x) => x.includes(a.id))) d.segni = d.segni.map((x) => x.filter((y) => y !== a.id));
      else if (d.trucchi.includes(a.id)) d.trucchi = d.trucchi.filter((x) => x !== a.id);
      else if (d.rito?.id === a.id) d.rito = null;
      else fail('Non è in gioco');
      d.deposito.push(a.id);
      return null;
    }
    case 'setTrucco': {
      prepOnly(s);
      if (!s.def.deposito.includes(a.id) || DEFENSES[a.id].family !== 'trucco') fail('Trucco non nel Deposito');
      s.def.deposito = s.def.deposito.filter((x) => x !== a.id);
      if (s.def.trucchi.length < s.def.tsock) s.def.trucchi.push(a.id);
      else {
        const k = a.index ?? 0;
        s.def.deposito.push(s.def.trucchi[k]);
        s.def.trucchi[k] = a.id;
      }
      if (a.id === 'segnare' && !s.def.marked.length) autoMark(s);
      return null;
    }
    case 'setRito': {
      prepOnly(s);
      if (!s.def.deposito.includes(a.id) || DEFENSES[a.id].family !== 'rito') fail('Rito non nel Deposito');
      s.def.deposito = s.def.deposito.filter((x) => x !== a.id);
      if (s.def.rito) s.def.deposito.push(s.def.rito.id);
      const seme = DEFENSES[a.id].needsSeme ? a.seme ?? s.def.ritoSeme[a.id] ?? autoSeme(s, a.id) : undefined;
      s.def.rito = { id: a.id, seme };
      if (seme) s.def.ritoSeme[a.id] = seme;
      return null;
    }
    case 'setSeme': {
      prepOnly(s);
      if (!s.def.rito || !DEFENSES[s.def.rito.id].needsSeme) fail('Il Rito non usa un seme');
      s.def.rito.seme = a.seme;
      s.def.ritoSeme[s.def.rito.id] = a.seme;
      return null;
    }
    case 'mark': {
      prepOnly(s);
      if (!s.def.trucchi.includes('segnare')) fail('Serve il Trucco Segnare');
      const max = s.def.plus.includes('segnare') ? 2 : 1;
      if (!s.deck.some((x) => x.uid === a.uid)) fail('Carta non nel mazzo');
      if (s.def.marked.includes(a.uid)) s.def.marked = s.def.marked.filter((x) => x !== a.uid);
      else { s.def.marked.push(a.uid); while (s.def.marked.length > max) s.def.marked.shift(); }
      return null;
    }
    case 'truccato': {
      prepOnly(s);
      if (!s.def.trucchi.includes('truccato')) fail('Serve il Mazzo Truccato');
      const max = s.def.plus.includes('truccato') ? 3 : 2;
      s.def.truccato = a.uids.slice(0, max);
      return null;
    }
    case 'start': {
      if (s.phase !== 'prep' || !s.wave) fail('Non sei in Preparazione');
      if (a.asso && !s.cfg.asso) fail("L'Asso nella manica è disattivato");
      const lumiBefore = s.lumi;
      const out = resolveWave(s, a.asso ?? null);
      afterWave(s, out, lumiBefore);
      return out;
    }
    case 'continue': {
      if (s.phase === 'victory' || s.phase === 'defeat') return null;
      if (s.phase !== 'summary') fail('Niente da continuare');
      if (s.cfg.tutorial) { s.tutorialStep++; goMap(s); return null; }
      if (s.boss) {
        if (s.boss.phase < 2) { s.boss.phase++; setupBossPhase(s); return null; }
        finishBoss(s);
        return null;
      }
      if (s.wave?.spec.kind === 'elite') { s.pattoNext = 'map'; enterPatto(s, 'elite'); return null; }
      goMap(s);
      return null;
    }
    case 'patto': {
      if (s.phase !== 'patto') fail('Nessun Patto da stringere');
      if (a.uid === null) s.sp += P.PATTO_RIFIUTO;
      else {
        if (!s.pattoCands?.some((c) => c.uid === a.uid)) fail('Carta non candidata');
        if (allies(s).length >= pattiMax(s)) {
          const d = s.deck.find((x) => x.uid === a.dissolve && x.owner === 'baro');
          if (!d) fail('Devi sciogliere un Patto per stringerne un quarto');
          s.deck = s.deck.filter((x) => x !== d);
        }
        makePatto(s, a.uid);
      }
      afterPatto(s);
      return null;
    }
    case 'buy': case 'exile': case 'basamento': case 'heal': case 'rinsalda': case 'sciogli': case 'riscatto': case 'shopReroll': case 'sell': case 'leave':
      shopAction(s, a);
      return null;
    case 'rest': {
      if (s.phase !== 'rest') fail('Non sei al Focolare');
      if (a.choice === 'cura') s.lumi = Math.min(s.maxLumi, s.lumi + restHeal(s));
      else if (a.choice === 'affina') {
        if (!a.id || !ownedIds(s).includes(a.id) || s.def.plus.includes(a.id)) fail('Difesa non affinabile');
        s.def.plus.push(a.id);
      } else s.intel.studia = 1;
      goMap(s);
      return null;
    }
    case 'event':
      if (s.phase !== 'event') fail('Nessun evento');
      doEvent(s, a.choice, a.arg);
      return null;
    case 'forestiero': {
      if (s.phase !== 'forestiero' || !s.boss?.forestiero) fail('Il Forestiero non offre nulla');
      const f = s.boss.forestiero;
      if (!f.ids.includes(a.keep) || !f.ids.includes(a.give) || a.keep === a.give) fail('Scegli una difesa da tenere e una da dare');
      gainDefense(s, a.keep, a.slot);
      forestieroGive(s, a.give);
      f.keep = a.keep; f.give = a.give; f.done = true;
      { const prev = s.chronicle.find((c) => c.kind === 'forestiero');
        if (prev) prev.text = prev.text.replace(/si tenne (.+?)(?: e (.+?))?: /, (_m, x: string, y?: string) => `si tenne ${y ? `${x}, ${y}` : x} e ${DEFENSES[a.give].name}: `);
        else s.chronicle.push({ rintocco: s.rintocco, kind: 'forestiero', text: `Il Forestiero si tenne ${DEFENSES[a.give].name}: «Questa la tengo io, se non le spiace.»` }); }
      if ((s.phase as Phase) !== 'exilePick') s.phase = 'prep';
      else s.exilePick!.back = 'prep';
      return null;
    }
    case 'exilePick': {
      if (s.phase !== 'exilePick' || !s.exilePick) fail('Niente da esiliare');
      exileCard(s, a.uid);
      s.exilePick.n--;
      if (s.exilePick.n <= 0 || s.deck.length <= minDeck(s)) endExilePick(s);
      return null;
    }
    case 'exileDone':
      if (s.phase !== 'exilePick') fail('Niente da esiliare');
      endExilePick(s);
      return null;
    case 'sellPick': {
      if (s.phase !== 'sellPick' || !s.sellPick) fail('Niente da vendere');
      if (!s.def.deposito.includes(a.id)) fail('Non è nel Deposito');
      s.def.deposito = s.def.deposito.filter((x) => x !== a.id);
      s.def.plus = s.def.plus.filter((x) => x !== a.id);
      s.sp += sellValue(a.id);
      if (s.def.deposito.length <= P.DEPOSITO_MAX) { s.phase = s.sellPick.back; s.sellPick = null; }
      return null;
    }
    case 'shopAffina':
      shopAction(s, a);
      return null;
  }
  return null;
}

function endExilePick(s: RunState) {
  const back = s.exilePick!.back;
  s.exilePick = null;
  if (back === 'nextAct') nextAct(s);
  else if (back === 'map') goMap(s);
  else s.phase = back;
}

function afterOffer(s: RunState, source: string) {
  if (source === 'trofeo') {
    s.offer = { ids: rollDefenses(s, 3, null, 'rewards', [0, 60, 40]), source: 'mazziere', canSkip: true };
    s.phase = 'offer';
    return;
  }
  if (source === 'ondata' || source === 'tutorial') s.phase = 'prep';
  else if (source === 'mazziere') nextAct(s);
  else goMap(s);
}

export function restHeal(s: RunState): number {
  return Math.floor(s.maxLumi * (s.cfg.sigillo >= 3 ? 0.25 : P.REST_HEAL));
}

/** SD-4: il Deposito tiene al massimo 4 difese; oltre, va venduta una difesa a metà prezzo. */
export function checkDeposito(s: RunState) {
  if (s.def.deposito.length > P.DEPOSITO_MAX && s.phase !== 'sellPick' && !s.ended) {
    s.sellPick = { back: s.phase };
    s.phase = 'sellPick';
  }
}

export function sellValue(id: string) {
  return Math.floor(P.PRICE[DEFENSES[id].rarity] / 2);
}

function prepOnly(s: RunState) {
  if (s.phase !== 'prep' && s.phase !== 'offer' && s.phase !== 'forestiero') fail('Puoi spostare le difese solo in Preparazione');
}

function shopAction(s: RunState, a: Action) {
  if (s.phase !== 'shop' || !s.shop) fail('Non sei al negozio');
  const sh = s.shop;
  const pay = (n: number) => { if (s.sp < n) fail('Spiccioli insufficienti'); s.sp -= n; };
  switch (a.t) {
    case 'buy': {
      const it = sh.items[a.index];
      if (!it || it.sold) fail('Non disponibile');
      pay(it.price);
      it.sold = true;
      gainDefense(s, it.id, a.slot);
      if ((s.phase as Phase) === 'exilePick') s.exilePick!.back = 'shop';
      return;
    }
    case 'exile': pay(sh.exileCost); exileCard(s, a.uid); s.exiles++; sh.exileCost = exileCost(s); return;
    case 'basamento': {
      if (s.def.cap[a.slot] >= 2) fail('Il Passo ha già un Basamento');
      pay(basamentoCost(s));
      s.basamentiComprati++;
      s.def.cap[a.slot] = 2;
      return;
    }
    case 'heal':
      if (s.lumi >= s.maxLumi) fail('I Lumi sono già al massimo');
      pay(s.cfg.sigillo >= 4 ? 12 : P.HEAL_COST);
      s.lumi = Math.min(s.maxLumi, s.lumi + P.HEAL_AMT);
      return;
    case 'rinsalda': {
      const x = s.deck.find((c) => c.uid === a.uid && c.owner === 'baro');
      if (!x) fail('Non è un tuo Patto');
      pay(P.RINSALDA);
      x.lealta = Math.min(9, x.lealta + 2);
      return;
    }
    case 'sciogli': {
      const x = s.deck.find((c) => c.uid === a.uid && c.owner === 'baro');
      if (!x) fail('Non è un tuo Patto');
      s.deck = s.deck.filter((c) => c !== x);
      return;
    }
    case 'riscatto': {
      const k = s.def.stolen.findIndex((x) => x.segno === a.segno);
      if (k < 0) fail('Segno non rubato');
      pay(P.RISCATTO);
      const st = s.def.stolen[k];
      s.def.stolen.splice(k, 1);
      if (st.holder != null) { const dc = s.deck.find((x) => x.uid === st.holder); if (dc && dc.bottino === a.segno) dc.bottino = null; }
      s.def.deposito.push(a.segno);
      return;
    }
    case 'shopReroll': {
      pay(P.REROLL);
      const n = sh.items.length;
      sh.items = rollDefenses(s, n, null, 'shop').map((id) => ({ id, price: priceOf(s, id), sold: false }));
      return;
    }
    case 'sell': {
      if (s.def.stolen.some((x) => x.segno === a.id)) fail('È rubato');
      removeDefense(s, a.id);
      s.sp += sellValue(a.id);
      return;
    }
    case 'shopAffina': {
      if (sh.affinato) fail('Hai già affinato in questo negozio');
      if (!ownedIds(s).includes(a.id) || s.def.plus.includes(a.id) || s.def.stolen.some((x) => x.segno === a.id)) fail('Difesa non affinabile');
      pay(P.SHOP_AFFINA);
      s.def.plus.push(a.id);
      sh.affinato = true;
      return;
    }
    case 'leave':
      s.shop = null;
      goMap(s);
      return;
  }
}

// ------------------------------------------------------------------ tutorial (Atto 0)
function setupTutorial(s: RunState) {
  const k = s.level - 1;
  const t = TUTORIAL[k];
  s.rintocco++;
  s.announced = [];
  for (const id of t.add) { const c = newCard(s, id); s.deck.push(c); s.announced.push(c.uid); }
  const spec = baseSpec(s, 'tutorial', t.draws);
  s.wave = { spec, seed: rng(s, 'draw').fork() };
  s.tutorialStep = k;
  for (const g of t.give ?? []) if (!ownedIds(s).includes(g.id)) gainDefense(s, g.id, g.slot);
  if (t.offer.length) { s.offer = { ids: t.offer.filter((x) => !ownedIds(s).includes(x)), source: 'tutorial', canSkip: false }; s.phase = s.offer.ids.length ? 'offer' : 'prep'; }
  else { s.offer = null; s.phase = 'prep'; }
}

// ------------------------------------------------------------------ hash per i test di determinismo
export function stateHash(s: RunState): string {
  const str = JSON.stringify([s.lumi, s.sp, s.rintocco, s.phase, s.deck.map((x) => [x.uid, x.def, x.rancore, x.owner, x.lealta, x.bottino]), s.def]);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}

export function replay(cfg: RunConfig, actions: Action[]): RunState {
  let s = newRun(cfg);
  for (const a of actions) { const n = structuredClone(s); apply(n, a); s = n; }
  return s;
}

// ------------------------------------------------------------------ voce del Quaderno (Narrative N1, N2, N7)
/** "dei Rossi", "degli Esposito": l'articolo davanti al cognome. */
export function deiCasa(cognome: string): string {
  return /^([aeiouAEIOU]|[sS][^aeiou]|[zZ]|[gG][nN]|[pP][sS]|[xX])/.test(cognome) ? `degli ${cognome}` : `dei ${cognome}`;
}
function baroName(s: RunState): string {
  return BARI.find((b) => b.id === s.cfg.baro)?.name ?? 'Il Baro';
}
/** soggetto della frase: "Il Baro di Sottovento", "La Fattucchiera"... */
export function baroSubj(s: RunState): string {
  return baroName(s);
}
function baroObj(s: RunState): string {
  const n = baroName(s);
  return n.charAt(0).toLowerCase() + n.slice(1);
}
function baroDi(s: RunState): string {
  const n = baroObj(s);
  return n.startsWith('il ') ? 'del ' + n.slice(3) : n.startsWith('la ') ? 'della ' + n.slice(3) : n.startsWith("l'") ? "dell'" + n.slice(2) : 'di ' + n;
}
const PATTO_LINES = [
  (b: string, x: string, r: number) => `Al rintocco ${r} ${b} strinse un Patto con ${x}.`,
  (b: string, x: string) => `${b} e ${x} si strinsero la mano sopra il tavolo.`,
  (b: string, x: string) => `Anche ${x} passò dalla parte ${b.startsWith('Il ') ? 'del ' + b.slice(3) : b.startsWith('La ') ? 'della ' + b.slice(3) : 'di ' + b}.`,
];
function pattoLine(s: RunState, x: string): string {
  const k = s.chronicle.filter((c) => c.kind === 'patto').length;
  return PATTO_LINES[k % PATTO_LINES.length](baroSubj(s), x, s.rintocco);
}
