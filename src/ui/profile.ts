// Meta-progressione (GDD §8) e impostazioni, salvate in localStorage (con try/catch: può mancare).
import { PACKS } from '../content/defenses';
import type { RunState, RunConfig } from '../core/types';
import type { Action } from '../core/run';
import { CONTENT_VERSION } from '../content/config';

export interface Settings {
  asso: boolean;
  istinto: boolean;
  speed: number; // 1,2,4, 99 = istantaneo
  pauseImportant: boolean;
  volume: number;
  audio: boolean;
  silentTick: boolean;
  palette: 'standard' | 'deuter' | 'trit' | 'contrasto';
  textScale: number;
  reduceMotion: boolean;
  layout: 'auto' | 'orizzontale' | 'verticale';
  debug: boolean;
  unlockAll: boolean;
  /** mostra i numeri esatti della previsione invece dei simboli ▲/▼ */
  detailedForecast: boolean;
  /** suggerimenti di gioco e didascalie delle abilità alla prima apparizione */
  tips: boolean;
  /** audio ridotto: niente passi, battiti e campanelli, solo i suoni che contano */
  reducedAudio: boolean;
}

export interface Profile {
  inchiostro: number;
  packs: string[];
  bari: string[];
  maxSigillo: number; // sigillo massimo sbloccato
  runs: number;
  wins: number;
  bestRintocco: number;
  seenEnemies: string[];
  seenDefenses: string[];
  girate: string[];
  bossesBeaten: number[];
  tutorialDone: boolean;
  /** suggerimenti già mostrati (didascalie delle abilità, introduzioni dei Mazzieri e degli atti) */
  seenTips: string[];
  profileVersion: number;
  lastRuns: { date: string; baro: string; sigillo: number; won: boolean; rintocco: number; seed: string }[];
}

export const DEFAULT_SETTINGS: Settings = {
  asso: true, istinto: false, speed: 1, pauseImportant: true, volume: 0.6, audio: true, silentTick: false,
  palette: 'standard', textScale: 1, reduceMotion: false, layout: 'auto', debug: false, unlockAll: false,
  detailedForecast: false, tips: true, reducedAudio: false,
};

export const DEFAULT_PROFILE: Profile = {
  inchiostro: 0, packs: [], bari: ['sottovento'], maxSigillo: 0, runs: 0, wins: 0, bestRintocco: 0, seenEnemies: [],
  seenDefenses: [], girate: [], bossesBeaten: [], tutorialDone: false, seenTips: [], profileVersion: 2, lastRuns: [],
};

const K_SET = 'baro.settings.v1';
const K_PROF = 'baro.profile.v1';
const K_SAVE = 'baro.save.v1';

function read<T>(k: string, def: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? { ...def, ...JSON.parse(v) } : def;
  } catch {
    return def;
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage non disponibile */
  }
}

export const loadSettings = () => read(K_SET, DEFAULT_SETTINGS);
export const saveSettings = (s: Settings) => write(K_SET, s);
/** Migrazione del profilo: i campi nuovi prendono il default, niente si perde. */
export function loadProfile(): Profile {
  const p = read(K_PROF, DEFAULT_PROFILE);
  if ((p.profileVersion ?? 1) < 2) p.profileVersion = 2;
  if (!Array.isArray(p.seenTips)) p.seenTips = [];
  return p;
}
export const saveProfile = (p: Profile) => write(K_PROF, p);

export interface SaveGame {
  version: string;
  cfg: RunConfig;
  actions: Action[];
  /** ondata già avviata e non ancora chiusa (QA P0-1): al ripristino si applica, non si annulla */
  pending?: { asso: import('../core/types').Asso | null } | null;
  /** istantanea leggera per riconoscere un salvataggio che non si ricostruisce uguale */
  check?: { lumi: number; rintocco: number; phase: string };
}
/** Il salvataggio, anche di una versione vecchia: chi lo carica prova a ricostruirlo e avvisa se non ci riesce. */
export function loadSave(): (SaveGame & { stale: boolean }) | null {
  try {
    const v = localStorage.getItem(K_SAVE);
    if (!v) return null;
    const s = JSON.parse(v) as SaveGame;
    return { ...s, stale: s.version !== CONTENT_VERSION };
  } catch {
    return null;
  }
}
/** Conserva un salvataggio che non si è potuto ripristinare (si può esportare dalle Impostazioni). */
export function backupBrokenSave() {
  try {
    const v = localStorage.getItem(K_SAVE);
    if (v) localStorage.setItem(K_SAVE + '.rotto', v);
  } catch {
    /* */
  }
}

// ---------------------------------------------------------------- telemetria locale (Producer)
const K_TEL = 'baro.telemetry.v1';
export interface TelemetryRun { date: string; version: string; seed: string; baro: string; sigillo: number; won: boolean; rintocco: number; lumi: number; dmg: number[]; picks: string[]; skips: number; seconds: number; feedback?: string }
export function loadTelemetry(): TelemetryRun[] {
  try { return JSON.parse(localStorage.getItem(K_TEL) ?? '[]') as TelemetryRun[]; } catch { return []; }
}
export function pushTelemetry(r: TelemetryRun) {
  const all = [...loadTelemetry(), r].slice(-50);
  write(K_TEL, all);
}
export function patchLastTelemetry(p: Partial<TelemetryRun>) {
  const all = loadTelemetry();
  if (!all.length) return;
  all[all.length - 1] = { ...all[all.length - 1], ...p };
  write(K_TEL, all);
}
/** Tutto ciò che il gioco salva, per esportarlo o spostarlo su un altro dispositivo. */
export function exportAll(): string {
  const o: Record<string, unknown> = {};
  for (const k of [K_SET, K_PROF, K_SAVE, K_TEL, K_SAVE + '.rotto']) {
    try { const v = localStorage.getItem(k); if (v) o[k] = JSON.parse(v); } catch { /* */ }
  }
  return JSON.stringify({ baro: 1, version: CONTENT_VERSION, data: o });
}
export function importAll(text: string): boolean {
  try {
    const j = JSON.parse(text) as { baro?: number; data?: Record<string, unknown> };
    if (j.baro !== 1 || !j.data) return false;
    for (const [k, v] of Object.entries(j.data)) if (k.startsWith('baro.')) localStorage.setItem(k, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}
export function writeSave(s: SaveGame | null) {
  try {
    if (s) localStorage.setItem(K_SAVE, JSON.stringify(s));
    else localStorage.removeItem(K_SAVE);
  } catch {
    /* */
  }
}

export function inkFor(run: RunState): number {
  return run.rintocco + (run.won ? 10 : 0) + run.cfg.sigillo * 2 + run.stats.bossKills * 2;
}

/** Aggiorna il profilo a fine run. Ritorna le novità sbloccate. */
export function applyRunEnd(p: Profile, run: RunState): { profile: Profile; news: string[] } {
  const np: Profile = structuredClone(p);
  const news: string[] = [];
  if (run.cfg.tutorial) {
    np.tutorialDone = true;
    return { profile: np, news: ['Hai completato la Prova.'] };
  }
  const ink = inkFor(run);
  np.inchiostro += ink;
  news.push(`+${ink} Inchiostro`);
  np.runs++;
  if (run.won) np.wins++;
  np.bestRintocco = Math.max(np.bestRintocco, run.rintocco);
  const reached = run.won ? 4 : run.act;
  const unlock = (id: string, why: string) => {
    if (!np.bari.includes(id)) { np.bari.push(id); news.push(`Nuovo Baro: ${why}`); }
  };
  if (reached >= 2) unlock('fattucchiera', 'La Fattucchiera');
  if (reached >= 3) unlock('notaio', 'Il Notaio');
  if (run.won) unlock('bracconiera', 'La Bracconiera');
  for (let a = 1; a < reached; a++) if (!np.bossesBeaten.includes(a)) { np.bossesBeaten.push(a); news.push(`Variante del Mazziere dell'atto ${a} sbloccata`); }
  if (run.won && run.cfg.sigillo >= np.maxSigillo && np.maxSigillo < 10) {
    np.maxSigillo = run.cfg.sigillo + 1;
    news.push(`Sigillo ${np.maxSigillo} sbloccato`);
  }
  np.lastRuns = [{ date: new Date().toISOString().slice(0, 10), baro: run.cfg.baro, sigillo: run.cfg.sigillo, won: run.won, rintocco: run.rintocco, seed: run.cfg.seed }, ...np.lastRuns].slice(0, 10);
  return { profile: np, news };
}

export function packsAvailable(p: Profile) {
  return PACKS.filter((x) => !p.packs.includes(x.id));
}
