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
  lastRuns: { date: string; baro: string; sigillo: number; won: boolean; rintocco: number; seed: string }[];
}

export const DEFAULT_SETTINGS: Settings = {
  asso: true, istinto: false, speed: 1, pauseImportant: true, volume: 0.6, audio: true, silentTick: false,
  palette: 'standard', textScale: 1, reduceMotion: false, layout: 'auto', debug: false, unlockAll: false,
};

export const DEFAULT_PROFILE: Profile = {
  inchiostro: 0, packs: [], bari: ['sottovento'], maxSigillo: 0, runs: 0, wins: 0, bestRintocco: 0, seenEnemies: [],
  seenDefenses: [], girate: [], bossesBeaten: [], tutorialDone: false, lastRuns: [],
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
export const loadProfile = () => read(K_PROF, DEFAULT_PROFILE);
export const saveProfile = (p: Profile) => write(K_PROF, p);

export interface SaveGame {
  version: string;
  cfg: RunConfig;
  actions: Action[];
}
export function loadSave(): SaveGame | null {
  try {
    const v = localStorage.getItem(K_SAVE);
    if (!v) return null;
    const s = JSON.parse(v) as SaveGame;
    return s.version === CONTENT_VERSION ? s : null;
  } catch {
    return null;
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
