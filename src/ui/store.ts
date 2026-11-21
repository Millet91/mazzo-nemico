// Stato dell'app (fuori dal core): schermata corrente, run, riproduzione dell'ondata, profilo.
import { useEffect, useState } from 'preact/hooks';
import { newRun, step, resolveWave, RuleError, type Action } from '../core/run';
import type { Asso, RunConfig, RunState } from '../core/types';
import type { WaveOutcome } from '../core/wave';
import { applyRunEnd, loadProfile, loadSettings, saveProfile, saveSettings, writeSave, loadSave, backupBrokenSave, pushTelemetry, type Profile, type Settings } from './profile';
import { CONTENT_VERSION } from '../content/config';
import { ENEMIES } from '../content/enemies';
import { setAudio, sfx } from '../assets/audio';
import { ownedIds } from '../core/run';

export type Screen = 'title' | 'newrun' | 'run' | 'codex' | 'unlocks' | 'settings' | 'rules';

export interface Playback {
  out: WaveOutcome;
  idx: number;
  playing: boolean;
  asso: Asso | null;
  assoMode: null | 'trattieni' | 'scambia';
  pauses: number;
}

export interface AppState {
  screen: Screen;
  cfg: RunConfig | null;
  run: RunState | null;
  actions: Action[];
  playback: Playback | null;
  review: Playback | null;
  lastOut: WaveOutcome | null;
  profile: Profile;
  settings: Settings;
  toast: string | null;
  news: string[];
  inspect: { kind: 'enemy' | 'defense'; id: string; why?: string[]; extra?: string } | null;
  menu: boolean;
  selected: string | null; // difesa selezionata in Preparazione
  pending: null | { id: string; family: string }; // offerta da piazzare
  showDeck: boolean;
  /** foglio del banco (Deposito e opzioni) aperto */
  banco: boolean;
  /** Lumi che avresti perso nell'ultima ondata senza Segni, Trucchi e Rito ("Senza i tuoi trucchi") */
  bare: number | null;
  bareOut: WaveOutcome | null;
  /** schermata d'introduzione da mostrare (Mazziere o atto) */
  intro: null | { kind: 'boss' | 'act'; act: number };
  startedAt: number;
}

let state: AppState = {
  screen: 'title', cfg: null, run: null, actions: [], playback: null, review: null, lastOut: null,
  profile: loadProfile(), settings: loadSettings(), toast: null, news: [], inspect: null, menu: false, selected: null,
  pending: null, showDeck: false, banco: false, bare: null, bareOut: null, intro: null, startedAt: Date.now(),
};
const subs = new Set<() => void>();

export function get(): AppState {
  return state;
}
export function set(p: Partial<AppState>) {
  state = { ...state, ...p };
  subs.forEach((f) => f());
}
export function useStore(): AppState {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  return state;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string) {
  set({ toast: msg });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => set({ toast: null }), 2600);
}

export function updateSettings(p: Partial<Settings>) {
  const s = { ...state.settings, ...p };
  saveSettings(s);
  setAudio({ volume: s.volume, enabled: s.audio, silentTick: s.silentTick, reduced: s.reducedAudio });
  set({ settings: s });
}
setAudio({ volume: state.settings.volume, enabled: state.settings.audio, silentTick: state.settings.silentTick, reduced: state.settings.reducedAudio });

export function updateProfile(p: Profile) {
  saveProfile(p);
  set({ profile: p });
}

/** Un suggerimento si mostra una volta sola per profilo. */
export function tipSeen(id: string): boolean {
  return !state.settings.tips || state.profile.seenTips.includes(id);
}
export function markTip(id: string) {
  if (state.profile.seenTips.includes(id)) return;
  updateProfile({ ...state.profile, seenTips: [...state.profile.seenTips, id] });
}

function checkIntro(run: RunState) {
  if (run.cfg.tutorial || state.intro) return;
  if (run.phase === 'map' && run.level === 0 && !run.ended) {
    const id = `act${run.act}:${run.cfg.seed}`;
    if (!introDone.has(id)) { introDone.add(id); set({ intro: { kind: 'act', act: run.act } }); }
  }
  if (run.boss && run.boss.phase === 0 && (run.phase === 'prep' || run.phase === 'forestiero')) {
    const id = `boss${run.act}:${run.cfg.seed}`;
    if (!introDone.has(id)) { introDone.add(id); set({ intro: { kind: 'boss', act: run.act } }); }
  }
}
const introDone = new Set<string>();

function seen(run: RunState) {
  checkIntro(run);
  const p = state.profile;
  const en = new Set(p.seenEnemies);
  const de = new Set(p.seenDefenses);
  const gi = new Set(p.girate);
  let ch = false;
  for (const c of run.deck) {
    if (!en.has(c.def)) { en.add(c.def); ch = true; }
    if (c.owner === 'baro' && !gi.has(c.def)) { gi.add(c.def); ch = true; }
  }
  for (const id of [...ownedIds(run), ...(run.offer?.ids ?? []), ...(run.shop?.items.map((x) => x.id) ?? [])]) if (!de.has(id)) { de.add(id); ch = true; }
  if (run.wave?.spec.elite && !en.has(run.wave.spec.elite)) { en.add(run.wave.spec.elite); ch = true; }
  if (ch) updateProfile({ ...p, seenEnemies: [...en], seenDefenses: [...de], girate: [...gi] });
}

export function startRun(cfg: RunConfig) {
  const run = newRun(cfg);
  set({ screen: 'run', cfg, run, actions: [], playback: null, review: null, selected: null, pending: null, news: [], bare: null, bareOut: null, startedAt: Date.now() });
  persist();
  seen(run);
  sfx('rintocco');
}

export function resumeSave(): boolean {
  const sv = loadSave();
  if (!sv) return false;
  try {
    let run = newRun(sv.cfg);
    const actions = [...sv.actions];
    for (const a of actions) run = step(run, a);
    // QA P0-1: un'ondata avviata e interrotta (ricarica, app chiusa) si chiude com'era, non si rigioca
    let out: WaveOutcome | null = null;
    if (sv.pending && run.phase === 'prep') {
      out = resolveWave(structuredClone(run), sv.pending.asso);
      const a: Action = { t: 'start', asso: sv.pending.asso };
      run = step(run, a);
      actions.push(a);
    }
    set({ screen: 'run', cfg: sv.cfg, run, actions, playback: null, review: null, lastOut: out, startedAt: Date.now() });
    persist();
    if (out) toast('L’ondata che avevi avviato si è conclusa mentre eri via.');
    else if (sv.stale) toast('Partita di una versione precedente: ripresa con le regole nuove.');
    return true;
  } catch (e) {
    backupBrokenSave();
    writeSave(null);
    toast(`Questa partita non si può riprendere con la versione ${CONTENT_VERSION} (${(e as Error).message}). Una copia è conservata: la trovi in Impostazioni → Esporta i dati.`);
    return false;
  }
}

function persist(pending?: { asso: Asso | null }) {
  if (!state.cfg || !state.run) return;
  if (state.run.ended) writeSave(null);
  else writeSave({ version: CONTENT_VERSION, cfg: state.cfg, actions: state.actions, pending: pending ?? null, check: { lumi: state.run.lumi, rintocco: state.run.rintocco, phase: state.run.phase } });
}

export function act(a: Action): boolean {
  if (!state.run) return false;
  try {
    const n = step(state.run, a);
    set({ run: n, actions: [...state.actions, a], selected: null, pending: null });
    persist();
    seen(n);
    if (n.ended && !state.run.ended) onEnd(n);
    return true;
  } catch (e) {
    if (e instanceof RuleError) { toast(e.message); sfx('ui'); return false; }
    throw e;
  }
}

function onEnd(run: RunState) {
  try {
    pushTelemetry({
      date: new Date().toISOString(), version: CONTENT_VERSION, seed: run.cfg.seed, baro: run.cfg.baro, sigillo: run.cfg.sigillo, won: run.won,
      rintocco: run.rintocco, lumi: run.lumi, dmg: run.history.map((h) => h.dmg), picks: state.actions.filter((a) => a.t === 'pick').map((a) => (a as { id: string | null }).id ?? '—'),
      skips: state.actions.filter((a) => a.t === 'pick' && !(a as { id: string | null }).id).length, seconds: Math.round((Date.now() - state.startedAt) / 1000),
    });
  } catch { /* la telemetria non deve mai rompere il gioco */ }
  const { profile, news } = applyRunEnd(state.profile, run);
  updateProfile(profile);
  set({ news });
  sfx(run.won ? 'victory' : 'defeat');
}

// ---------------------------------------------------------------- riproduzione dell'ondata
export function beginWave() {
  const run = state.run;
  if (!run || run.phase !== 'prep') return;
  const out = resolveWave(structuredClone(run), null);
  const pb: Playback = { out, idx: 0, playing: true, asso: null, assoMode: null, pauses: 0 };
  // controprova: la stessa ondata senza le tue difese, per mostrare quanto hanno fatto
  let bare: number | null = null;
  let bareOut: WaveOutcome | null = null;
  try {
    const nude = structuredClone(run);
    nude.def.segni = nude.def.segni.map(() => []);
    nude.def.trucchi = [];
    nude.def.rito = null;
    bareOut = resolveWave(nude, null);
    bare = bareOut.dmg;
  } catch { /* */ }
  sfx('rintocco');
  persist({ asso: null });
  set({ bare, bareOut });
  if (state.settings.speed >= 99) { finishWave(pb); return; }
  set({ playback: pb, selected: null });
}

export function finishWave(pb?: Playback) {
  const p = pb ?? state.playback;
  if (!p) return;
  set({ playback: null, lastOut: p.out });
  act({ t: 'start', asso: p.asso });
}

export function useAsso(kind: 'trattieni' | 'scambia', slot: number) {
  const pb = state.playback;
  const run = state.run;
  if (!pb || !run || pb.asso) return;
  const cur = pb.out.events[Math.min(pb.idx, pb.out.events.length - 1)];
  const tick = cur.t + 1;
  const asso: Asso = { tick, kind, slot };
  const out = resolveWave(structuredClone(run), asso);
  let idx = out.events.findIndex((e) => e.t >= tick);
  if (idx < 0) idx = out.events.length - 1;
  sfx('asso');
  persist({ asso });
  set({ playback: { ...pb, out, idx, asso, assoMode: null, playing: true } });
}

export function enemyName(id: string) {
  return ENEMIES[id]?.name ?? id;
}
