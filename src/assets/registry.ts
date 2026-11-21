// REGISTRO CENTRALE DEGLI ASSET.
// Ogni riferimento grafico o sonoro del gioco passa da qui. Oggi sono segnaposto (glifi, colori, suoni sintetizzati).
// Per sostituirli con gli asset definitivi (Magnific) basta compilare `image` / `sample` con il percorso del file
// in public/assets/... : i componenti mostrano l'immagine se c'è, altrimenti il segnaposto.
// Vedi ASSETS.md per l'elenco completo e le dimensioni consigliate.

import type { Seme } from '../content/enemies';

export interface VisualAsset {
  /** glifo segnaposto (emoji o simbolo) */
  glyph: string;
  /** immagine definitiva, es. 'assets/enemies/lupo.webp' (vuoto = usa il segnaposto) */
  image?: string;
  /** versione a doppia densità per schermi retina (srcset 2x) */
  image2x?: string;
  /** da dove viene l'asset (es. 'magnific:<id creazione>'), per ritrovarlo e rigenerarlo */
  source?: string;
  /** tinta CSS applicata al segnaposto o all'immagine (es. per i semi) */
  tint?: string;
}

/** Palette GDD §10.3 (i valori reali sono variabili CSS in style.css, qui servono al canvas e agli export) */
export const PALETTE = {
  feltro: '#1C2420',
  legno: '#3A2A20',
  avorio: '#E8DCC4',
  seppia: '#2B1E16',
  oro: '#F2B544',
  Bastoni: '#C8462E',
  Coppe: '#6FC3D9',
  Spade: '#7FA84A',
  Denari: '#9A5BB8',
  cremisi: '#E23B4A',
  fango: '#8A7F70',
};

export const SEME_ASSET: Record<Seme, VisualAsset & { frame: string; label: string }> = {
  Bastoni: { glyph: '🜲', frame: 'dentellata', label: 'Bastoni' },
  Coppe: { glyph: '♁', frame: 'tratteggiata', label: 'Coppe' },
  Spade: { glyph: '⚔', frame: 'bulloni', label: 'Spade' },
  Denari: { glyph: '◎', frame: 'doppia', label: 'Denari' },
  Neutra: { glyph: '·', frame: 'semplice', label: 'Neutra' },
  Mazziere: { glyph: '♛', frame: 'mazziere', label: 'Mazziere' },
};

/** Illustrazioni delle carte nemiche (96 px minimo, GDD §10.1). */
export const ENEMY_ART: Record<string, VisualAsset> = {
  topi: { glyph: '🐀' }, lupo: { glyph: '🐺' }, volpe: { glyph: '🦊' }, ingordo: { glyph: '🍖' }, mulo: { glyph: '🫏' },
  affogata: { glyph: '👻' }, bocca: { glyph: '🕳' }, falce: { glyph: '🌙' }, barile: { glyph: '🛢' }, gazza: { glyph: '🐦‍⬛' },
  banditore: { glyph: '📯' }, sobillatore: { glyph: '🗣' },
  branco: { glyph: '🐕' }, cinghiale: { glyph: '🐗' }, lamento: { glyph: '🌫' }, nebbia: { glyph: '☁' }, prefica: { glyph: '😭' },
  carro: { glyph: '🛞' }, incudine: { glyph: '⚒' }, campana: { glyph: '🔔' }, processione: { glyph: '⛪' }, creditori: { glyph: '📜' },
  esattore: { glyph: '🧾' },
  mannaro: { glyph: '🌕' }, morto: { glyph: '💀' }, fatuo: { glyph: '🔥' }, macina: { glyph: '⚙' }, orologio: { glyph: '🕰' },
  profeta: { glyph: '👁' }, folla: { glyph: '👥' },
  spaventapasseri: { glyph: '🧑‍🌾' }, brigante: { glyph: '🗡' }, strega: { glyph: '🧙' },
  sagrestano: { glyph: '📖' }, forestiero: { glyph: '🎲' }, piena: { glyph: '🌊' },
  copia: { glyph: '◌' }, scartina: { glyph: '🂠' }, corvo: { glyph: '🪶' }, disperazione: { glyph: '✖' }, topo: { glyph: '🐁' },
};

/** Sigilli delle difese: la FORMA indica la famiglia (Segno esagono, Trucco rombo, Rito cerchio con freccia). */
export const DEFENSE_ART: Record<string, VisualAsset> = {
  brace: { glyph: '🔥' }, spina: { glyph: '🌵' }, taglio: { glyph: '✂' }, gelo: { glyph: '❄' }, lanterna: { glyph: '🏮' },
  bastione: { glyph: '🛡' }, tagliola: { glyph: '🪤' }, trappola: { glyph: '⛓' }, calamita: { glyph: '🧲' }, moneta: { glyph: '🪙' },
  rimando: { glyph: '↩' }, catena: { glyph: '🔗' }, malocchio: { glyph: '🧿' }, corno: { glyph: '🌶' }, rogo: { glyph: '♨' },
  specchio: { glyph: '🪞' }, pozzo: { glyph: '⛲' }, campanaMorto: { glyph: '🔕' },
  scartine: { glyph: '🂠' }, setaccio: { glyph: '🥅' }, esca: { glyph: '🧀' }, oracolo: { glyph: '🔮' }, bavaglio: { glyph: '🤐' },
  contrabbando: { glyph: '📦' }, segnare: { glyph: '✒' }, censura: { glyph: '⬛' }, avara: { glyph: '🤏' }, truccato: { glyph: '🃏' },
  rogoArchivio: { glyph: '📚' },
  scala: { glyph: '📶' }, discesa: { glyph: '📉' }, avanguardia: { glyph: '⏩' }, retroguardia: { glyph: '⏪' }, raggruppa: { glyph: '🧺' },
  alternanza: { glyph: '⇅' }, riserva: { glyph: '✋' }, cadenzato: { glyph: '🥁' },
};

/** Ritratti e scene. */
export const SCENE_ART: Record<string, VisualAsset> = {
  porta: { glyph: '🚪' },
  /** la porta in tre stati (Art): integra, scheggiata, sfondata; scelti in base ai Lumi rimasti */
  porta_0: { glyph: '🚪' },
  porta_1: { glyph: '🚪', tint: 'sepia(.6) brightness(.85)' },
  porta_2: { glyph: '🚪', tint: 'sepia(1) hue-rotate(-30deg) brightness(.7)' },
  nonna: { glyph: '👵' },
  lume: { glyph: '🕯' },
  spicciolo: { glyph: '¢' },
  mazzo: { glyph: '🂠' },
  mazziere: { glyph: '🎭' },
  sagrestano: { glyph: '📖' },
  forestiero: { glyph: '🎲' },
  piena: { glyph: '🌊' },
  negozio: { glyph: '🛒' },
  riposo: { glyph: '🪵' },
  evento: { glyph: '❓' },
  ondata: { glyph: '🔔' },
  elite: { glyph: '☠' },
  baro_sottovento: { glyph: '🤞' },
  baro_fattucchiera: { glyph: '🧶' },
  baro_notaio: { glyph: '🖋' },
  baro_bracconiera: { glyph: '🏹' },
  ev_comare: { glyph: '👵' }, ev_pozzo: { glyph: '⛲' }, ev_prete: { glyph: '⛪' }, ev_cartaio: { glyph: '🖨' }, ev_pegni: { glyph: '⚖' },
  ev_bambini: { glyph: '🧒' }, ev_processione: { glyph: '🕯' }, ev_gatto: { glyph: '🐈‍⬛' }, ev_vedova: { glyph: '👩‍🦳' }, ev_vicini: { glyph: '🏚' },
};

/** Cornici delle carte per seme e livello (Art): oggi sono bordi CSS, domani immagini a 9 sezioni. */
export const FRAME_ART: Record<string, VisualAsset> = {
  Bastoni: { glyph: '' }, Coppe: { glyph: '' }, Spade: { glyph: '' }, Denari: { glyph: '' }, Neutra: { glyph: '' }, Mazziere: { glyph: '' },
  elite: { glyph: '' }, patto: { glyph: '' }, corrotto: { glyph: '' },
};
/** Sovrapposizioni di stato sulle carte (Art). */
export const OVERLAY_ART: Record<string, VisualAsset> = {
  gelo: { glyph: '❄' }, brucia: { glyph: '🔥' }, corazza: { glyph: '⛨' }, notte: { glyph: '☾' }, bottino: { glyph: '⬡' }, silenzio: { glyph: '🤫' },
};
/** Effetti (Art/Animazione): colpo, morte, impatto alla porta, combo. Oggi CSS, domani sprite. */
export const VFX_ART: Record<string, VisualAsset> = {
  colpo: { glyph: '' }, morte: { glyph: '✸' }, impatto: { glyph: '' }, combo: { glyph: '' }, raggio: { glyph: '' },
};

export const MAP_NODE_ART: Record<string, VisualAsset> = {
  ondata: SCENE_ART.ondata, elite: SCENE_ART.elite, negozio: SCENE_ART.negozio, riposo: SCENE_ART.riposo,
  evento: SCENE_ART.evento, mazziere: SCENE_ART.mazziere,
};

/** Suoni: ogni cue ha una ricetta sintetizzata (audio.ts). Compilando `sample` si usa il file al suo posto. */
export interface SoundAsset { sample?: string; volume?: number }
export const SOUNDS: Record<string, SoundAsset> = {
  rintocco: {}, pulse: {}, step: {}, enter: {}, hit: {}, block: {}, kill: {}, impact: {}, steal: {}, silence: {},
  coin: {}, heal: {}, freeze: {}, burn: {}, herald: {}, asso: {}, ui: {}, pick: {}, defeat: {}, victory: {}, patto: {}, betray: {},
  copy: {}, ability: {}, bell: {}, exile: {}, rimando: {}, end: {}, heartbeat: {},
};

/** Musica (stem del GDD §11.2). Vuoto = nessuna musica registrata, si usa il pulse sintetizzato. */
export const MUSIC: Record<string, { sample?: string }> = {
  pulse: {}, armonia: {}, tensione: {}, macchina: {}, pressione: {}, mazziere: {}, sagrestano: {}, forestiero: {}, piena: {},
};

export function enemyArt(id: string): VisualAsset {
  return ENEMY_ART[id] ?? { glyph: '?' };
}
export function defenseArt(id: string): VisualAsset {
  return DEFENSE_ART[id] ?? { glyph: '?' };
}
export function sceneArt(id: string): VisualAsset {
  return SCENE_ART[id] ?? { glyph: '?' };
}
