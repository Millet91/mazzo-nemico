// Replay: configurazione + comandi con il tick (core/tipi Replay). Regola di temporizzazione, uguale per il
// ciclo di gioco (B), l'IA e i test: un comando con `tick: T` si applica quando `s.tick === T`, PRIMA della
// chiamata ad avanzaTick che porta lo stato a T + 1. L'hash del tick K si calcola subito dopo l'avanzaTick
// che ha portato `s.tick` a K (K multiplo di 600), più quello del tick finale.

import type { ComandoRegistrato, ConfigBattaglia, EventoBattaglia, MappaGenerata, Replay, StatoBattaglia } from '../../core/tipi';
import { VERSIONE_REGOLE } from '../../core/tipi';
import { TICK_AL_SECONDO } from '../../contenuti/bilanciamento';
import { avanzaTick, creaBattaglia, eseguiComando, hashStato } from './index';

/** ogni quanti tick si salva l'hash (13 §2 L2) */
export const PASSO_HASH = 600;
/** limite di sicurezza: 40 minuti simulati */
export const TICK_MASSIMI_REPLAY = 40 * 60 * TICK_AL_SECONDO;

export interface EsitoReplay {
  /** tutti gli hash attesi coincidono (e il tick finale, se c'è) */
  ok: boolean;
  /** hash calcolati: chiave = tick */
  hash: Record<number, string>;
  /** dove gli hash non coincidono */
  differenze: { tick: number; atteso: string; ottenuto: string | undefined }[];
  tickFinale: number;
  stato: StatoBattaglia;
}

export interface OpzioniReplay {
  /** chiamata a ogni tick con gli eventi del tick (per chi vuole guardare la battaglia) */
  suEventi?: (s: StatoBattaglia, eventi: EventoBattaglia[]) => void;
  /** ferma la simulazione a questo tick anche se la battaglia non è finita */
  fermaA?: number;
}

/** Gioca config + comandi sulla mappa data e restituisce lo stato e gli hash. */
export function giocaComandi(
  config: ConfigBattaglia, mappa: MappaGenerata, comandi: readonly ComandoRegistrato[], opz: OpzioniReplay & { tickFinale?: number } = {},
): { stato: StatoBattaglia; hash: Record<number, string> } {
  const s = creaBattaglia(config, mappa);
  const lista = comandi.map((c, i) => ({ ...c, i })).sort((x, y) => x.tick - y.tick || x.i - y.i);
  const hash: Record<number, string> = {};
  const eventi: EventoBattaglia[] = [];
  const limite = opz.fermaA ?? opz.tickFinale ?? TICK_MASSIMI_REPLAY;
  let k = 0;
  while (k < lista.length && lista[k].tick < s.tick) k++; // comandi nel passato: ignorati
  while (!s.esito && s.tick < limite) {
    while (k < lista.length && lista[k].tick === s.tick) eseguiComando(s, lista[k++].c);
    avanzaTick(s, eventi);
    if (opz.suEventi) opz.suEventi(s, eventi);
    eventi.length = 0;
    if (s.tick % PASSO_HASH === 0) hash[s.tick] = hashStato(s);
  }
  hash[s.tick] = hashStato(s);
  return { stato: s, hash };
}

/** Rigioca un replay e confronta gli hash salvati (F1/F2 del piano QA). */
export function rigiocaReplay(replay: Replay, mappa: MappaGenerata, opz: OpzioniReplay = {}): EsitoReplay {
  const { stato, hash } = giocaComandi(replay.config, mappa, replay.comandi, { ...opz, tickFinale: replay.tickFinale });
  const differenze: EsitoReplay['differenze'] = [];
  if (replay.versioneRegole !== VERSIONE_REGOLE) differenze.push({ tick: -1, atteso: `regole v${replay.versioneRegole}`, ottenuto: `regole v${VERSIONE_REGOLE}` });
  for (const [k, atteso] of Object.entries(replay.hash ?? {})) {
    const ottenuto = hash[Number(k)];
    if (ottenuto !== atteso) differenze.push({ tick: Number(k), atteso, ottenuto });
  }
  if (replay.tickFinale !== undefined && stato.tick !== replay.tickFinale) {
    differenze.push({ tick: replay.tickFinale, atteso: `fine al tick ${replay.tickFinale}`, ottenuto: `fine al tick ${stato.tick}` });
  }
  return { ok: differenze.length === 0, hash, differenze, tickFinale: stato.tick, stato };
}

/** Crea un replay d'oro: gioca i comandi e salva gli hash ogni 600 tick e il tick finale. */
export function creaReplay(config: ConfigBattaglia, mappa: MappaGenerata, comandi: readonly ComandoRegistrato[]): Replay {
  const { stato, hash } = giocaComandi(config, mappa, comandi);
  return { versioneRegole: VERSIONE_REGOLE, config, comandi: comandi.map((c) => ({ tick: c.tick, c: c.c })), hash, tickFinale: stato.tick };
}
