// Tipi dello stato di gioco. Tutto è dato puro serializzabile (GDD §13.2): niente classi, niente indici come identità.
import type { RngState } from './rng';
import type { NodeKind } from '../content/config';
import type { Seme } from '../content/enemies';

export type Owner = 'fato' | 'baro';

/** Carta persistente del Mazzo del Fato. */
export interface DeckCard {
  uid: number;
  def: string;
  rancore: number;
  owner: Owner;
  lealta: number;
  /** id del Segno rubato che porta con sé */
  bottino: string | null;
  corrotto: boolean;
}

export interface RitoSlot {
  id: string;
  seme?: Seme;
}

export interface Defenses {
  /** 5 Passi base, indice 0 = Crocevia, 4 = Uscio. Ogni Passo ha una lista di Segni in ordine di piazzamento. */
  segni: string[][];
  cap: number[];
  trucchi: string[];
  tsock: number;
  rito: RitoSlot | null;
  deposito: string[];
  /** difese potenziate (Affinare) */
  plus: string[];
  /** Segni rubati: chi li ha (uid della carta del mazzo, oppure null se il ladro non era una carta del mazzo) */
  stolen: { segno: string; holder: number | null }[];
  /** carte segnate con Segnare (uid) */
  marked: number[];
  /** Mazzo Truccato: uid da mandare in fondo, scelti dal giocatore (vuoto = automatico) */
  truccato: number[] | null;
  /** Riti: seme scelto per Avanguardia/Retroguardia, ricordato per id */
  ritoSeme: Record<string, Seme>;
}

export interface MapNode {
  id: string;
  kind: NodeKind;
  level: number;
  eventId?: string;
}

export interface WaveSpec {
  kind: 'ondata' | 'elite' | 'boss' | 'tutorial';
  act: number;
  rintocco: number;
  draws: number;
  elite?: string;
  boss?: string;
  L: number;
  /** ogni quanti tick la Corrente spinge (0 = mai) */
  corrente: number;
  /** Passi base (0-4) con un Contro-segno del Forestiero */
  contro: number[];
  bossRito: string | null;
  bossRitoBonus: number;
  extraDraw: number;
  /** Sagrestano: carte che tornano in fondo alla Coda */
  carry: number[];
  carryBonus: number;
  nightBonus: number;
  eliteArmor: number;
  /** evento Processione: +2 Denari e Spiccioli doppi per i Denari */
  processione: boolean;
  /** Sigillo 10: tutte le regole */
  phase?: number;
}

export interface Asso {
  tick: number;
  kind: 'trattieni' | 'scambia';
  slot: number;
}

export interface Offer {
  ids: string[];
  source: 'ondata' | 'rara' | 'mazziere' | 'forestiero' | 'evento' | 'tutorial';
  canSkip: boolean;
}

export interface ShopState {
  items: { id: string; price: number; sold: boolean }[];
  exileCost: number;
  rerolls: number;
}

export interface BossState {
  act: number;
  phase: number; // 0,1,2
  carry: number[];
  contro: number[];
  bossRito: string | null;
  extraDraw: number;
  bossDead: boolean;
  dmgTot: number;
  drawnAll: number[];
  /** Forestiero: terna corrente e stato della scelta */
  forestiero?: { ids: string[]; keep: string | null; give: string | null; done: boolean };
}

export interface PattoCandidate {
  uid: number;
  def: string;
}

export interface ChronicleEntry {
  rintocco: number;
  kind: string;
  text: string;
}

export interface WaveSummary {
  rintocco: number;
  act: number;
  kind: string;
  lumiBefore: number;
  lumiAfter: number;
  dmg: number;
  gained: number;
  destroyed: string[];
  arrived: string[];
  stolen: string[];
  mvp: string | null;
  dangerous: string | null;
  ticks: number;
  betrayed: string[];
  limit: boolean;
}

export type Phase =
  | 'map'
  | 'offer'
  | 'prep'
  | 'summary'
  | 'patto'
  | 'shop'
  | 'rest'
  | 'event'
  | 'bossPrep'
  | 'forestiero'
  | 'exilePick'
  | 'victory'
  | 'defeat';

export interface RunConfig {
  seed: string;
  baro: string;
  sigillo: number;
  asso: boolean;
  tutorial: boolean;
  /** pacchetti di difese sbloccati (meta) */
  packs: string[];
  /** Mazzieri già battuti (per le varianti al Sigillo 5) */
  contentVersion: string;
}

export interface RunState {
  cfg: RunConfig;
  rng: Record<string, RngState>;
  uidc: number;
  phase: Phase;
  act: number;
  level: number; // livello raggiunto nella mappa dell'atto (0 = nessuno)
  map: MapNode[][];
  node: MapNode | null;
  rintocco: number;
  wavesInAct: number;
  lumi: number;
  maxLumi: number;
  sp: number;
  deck: DeckCard[];
  def: Defenses;
  exiles: number;
  pity: number;
  freeRerolls: number;
  basamentiComprati: number;
  /** offerta corrente (scelta 1 tra 3) */
  offer: Offer | null;
  /** carte annunciate in questo rintocco (uid) */
  announced: number[];
  /** ondata in preparazione */
  wave: { spec: WaveSpec; seed: number } | null;
  boss: BossState | null;
  shop: ShopState | null;
  event: { id: string; step: number; data: Record<string, unknown> } | null;
  pattoCands: PattoCandidate[] | null;
  pattoNext: Phase | null;
  /** quante carte esiliare a scelta (Rogo dell'Archivio, eventi) e dove tornare */
  exilePick: { n: number; back: Phase | 'nextAct'; reason: string } | null;
  lastSummary: WaveSummary | null;
  history: WaveSummary[];
  chronicle: ChronicleEntry[];
  /** informazioni extra per la prossima ondata */
  intel: { fullOrder: number; studia: number; bambini: number; extraShop: number; processione: boolean };
  famiglia: [string, string];
  stats: { patti: number; exiled: number; maxCombo: number; firstImpact: string | null; stolen: number; killed: number; dmgTaken: number; bossKills: number };
  tutorialStep: number;
  ended: boolean;
  won: boolean;
}

/** Carta in gioco durante un'ondata. */
export interface WC {
  wid: number;
  uid: number | null;
  def: string;
  name: string;
  seme: Seme;
  forza: number;
  base: number;
  kw: Record<string, number>;
  cor: number;
  burn: number;
  geloUsed: boolean;
  frozen: number;
  lt: number;
  tier: 'n' | 'e' | 'b' | 't';
  token: boolean;
  ally: boolean;
  ritornoUsed: boolean;
  malUsed: boolean;
  night: boolean;
  brancoGot: number;
  divoraUsed: boolean;
  barileUsed: boolean;
  allyRitornoUsed: boolean;
  why: string[];
  extraLealtaLoss: number;
}

export interface SnapCard {
  wid: number;
  uid: number | null;
  def: string;
  name: string;
  seme: Seme;
  forza: number;
  cor: number;
  burn: number;
  frozen: number;
  ally: boolean;
  kw: string[];
  tier: string;
  night: boolean;
  bottino: string | null;
  rancore: number;
  corrotto: boolean;
}

export interface Snap {
  lane: (SnapCard | null)[];
  queue: SnapCard[];
  lumi: number;
  sp: number;
  /** Segni per Passo della Fila (indice di Fila, lunghezza L) */
  segni: string[][];
}

export type EvKind =
  | 'start' | 'tick' | 'move' | 'enter' | 'segno' | 'damage' | 'block' | 'destroy' | 'impact' | 'fizzle' | 'freeze'
  | 'steal' | 'exile' | 'rimando' | 'ability' | 'copy' | 'herald' | 'heal' | 'coins' | 'burn' | 'silence'
  | 'collapse' | 'end' | 'asso' | 'info' | 'defeat';

export interface Ev {
  t: number;
  k: EvKind;
  msg: string;
  slot?: number;
  to?: number;
  wid?: number;
  src?: string;
  n?: number;
  important?: boolean;
  /** numero fluttuante: positivo = danno alla carta, ecc. */
  float?: { slot: number; text: string; color: 'gold' | 'crimson' | 'white' };
  snap: Snap;
}
