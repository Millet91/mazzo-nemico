// Bus tra motore e UI (04 §3): il motore scrive in questi signal, la UI li legge; la UI non tocca Pixi e il motore
// non importa Preact. Si usa @preact/signals-core, che non dipende da Preact.
// Contratto congelato dal Lead Tecnico all'inizio di ogni milestone (M1: battaglia).
import { signal } from '@preact/signals-core';
import type { Comando, ConfigBattaglia, EsitoBattaglia, EventoBattaglia, FaseTurno, IdArma, IdCiurma } from './tipi';
import type { AnimazioneMondo, ConfigScontro, EvidenzaMondo, IdIsola, StatoCarriera } from './carriera';

export interface StatFps { medio: number; minimo: number }

/** Quello che l'HUD mostra della battaglia. Lo pubblica il ciclo di gioco (B) al massimo una volta per frame. */
export interface VistaBattaglia {
  numeroTurno: number;
  /** turno a cui la battaglia finisce a tempo (18) e da cui sale il mare (12), per gli avvisi */
  turnoLimite: number;
  mareSaleDalTurno: number;
  squadraDiTurno: 0 | 1;
  /** di chi è il turno: il giocatore umano o l'IA */
  tocca: 'umano' | 'ia';
  fase: FaseTurno;
  /** secondi interi rimasti al timer del turno (arrotondati per eccesso) */
  secondiRimasti: number;
  /** il timer è partito (prima del primo tocco o dei 2 s resta fermo) */
  timerAvviato: boolean;
  /** vento del turno e massimo del bioma */
  vento: number;
  ventoMax: number;
  squadre: [VistaSquadra, VistaSquadra];
  /** arma, munizioni (−1 = infinite) e miccia del pirata attivo */
  arma: IdArma;
  munizioni: Partial<Record<IdArma, number>>;
  miccia: number;
  /** mira attuale in gradi (0-359,5) e potenza 0-100 */
  miraGradi: number;
  potenza: number;
  /** l'IA sta pensando ("il capitano medita...") */
  iaPensa: boolean;
  /** si può arrendere (dal turno 4, solo l'attaccante umano) */
  puoArrendersi: boolean;
  /** pirata attivo rispetto a scale e liane: 'vicino' = può aggrapparsi, 'appeso' = è aggrappato */
  arrampicata?: 'libero' | 'vicino' | 'appeso';
  /** il pirata attivo è fuori dallo schermo (camera spostata a mano): l'HUD mostra il tasto per ricentrare */
  pirataFuoriVista?: boolean;
  /** un pirata vivo sta sotto i tasti di un angolo in basso (sinistro / destro): l'HUD li rende quasi trasparenti */
  pirataSottoTasti?: 'sx' | 'dx' | 'entrambi';
  /**
   * avviso sul colpo che partirebbe ora (solo nel turno del giocatore, mentre mira): 'danno' = chi spara si
   * farebbe male, 'vicino' = il colpo scoppierebbe a un passo da lui senza ferirlo (colpo sprecato)
   */
  avvisoTiro?: 'vicino' | 'danno';
  esito: EsitoBattaglia | null;
}

export interface VistaSquadra {
  ciurma: IdCiurma;
  controllo: 'umano' | 'ia';
  pvTotali: number;
  pvIniziali: number;
  vivi: number;
  iniziali: number;
}

/** Richieste della UI che non sono comandi della simulazione. */
export type AzioneBattaglia =
  | { t: 'pausa' }
  | { t: 'riprendi' }
  /** esce dalla battaglia e torna al menu */
  | { t: 'esci' }
  /** ricentra la camera sul pirata attivo */
  | { t: 'ricentra' }
  /** ×2 / ×4 sui turni dell'IA (M2) */
  | { t: 'velocita'; fattore: 1 | 2 | 4 };

/**
 * Schermata fuori dalla battaglia (P2). La battaglia resta decisa da `richiestaBattaglia`/`battaglia` e copre tutto.
 * - menu: menu principale (Carriera/Continua, Schermaglia);
 * - mondo: il Tavolo del Timone (scena Pixi del mondo + pannelli Preact sopra);
 * - scena: scena di copione (pergamena con ritratti) sopra il mondo;
 * - paywall: schermata unica di fine cap. 1.
 */
export type Schermata = 'menu' | 'mondo' | 'scena' | 'paywall';

/** Battaglia chiesta dalla carriera: la Campagna la scrive, il ciclo di gioco la legge insieme a richiestaBattaglia. */
export interface BattagliaCarriera {
  isola: IdIsola;
  scontro: ConfigScontro;
}

type Ascoltatore<T> = (x: T) => void;

/** Canale semplice uno-a-molti (niente signal: i comandi sono eventi, non stato). */
export function creaCanale<T>() {
  const ascoltatori = new Set<Ascoltatore<T>>();
  return {
    invia(x: T) { for (const a of ascoltatori) a(x); },
    ascolta(a: Ascoltatore<T>): () => void { ascoltatori.add(a); return () => ascoltatori.delete(a); },
  };
}

export const bus = {
  /** l'app è in background: il rendering e la simulazione sono fermi */
  inPausa: signal(false),
  /** statistiche FPS sugli ultimi 60 s, aggiornate una volta al secondo */
  fps: signal<StatFps>({ medio: 0, minimo: 0 }),
  /** contatore FPS visibile (impostazione nascosta: 5 tocchi sulla versione in Info) */
  mostraFps: signal(false),
  /** esito del controllo WebGL2 fatto all'avvio */
  webgl2: signal<{ ok: boolean; renderer: string }>({ ok: true, renderer: '' }),
  /** errore di avvio della grafica, da mostrare al giocatore ('' = nessuno) */
  erroreGrafica: signal(''),

  // ─── Battaglia (M1) ───
  /** la UI chiede una battaglia (Schermaglia): il ciclo di gioco (B) la crea e la avvia. null = nessuna battaglia */
  richiestaBattaglia: signal<ConfigBattaglia | null>(null),
  /** stato della battaglia per l'HUD; null fuori dalla battaglia o durante il caricamento */
  battaglia: signal<VistaBattaglia | null>(null),
  /** menu di pausa aperto: la simulazione e il timer sono fermi */
  battagliaInPausa: signal(false),
  /** eventi della sim dell'ultimo frame (banner, numeri, vibrazioni, audio); si sostituisce a ogni frame che ne ha */
  eventiBattaglia: signal<EventoBattaglia[]>([]),
  /** preferenza del giocatore (Impostazioni): mentre si mira la camera si allarga da sola fino a mostrare
   *  pirata e punto d'impatto (scelta del proprietario 21/11/2026). La scrive la UI, la legge il regista. */
  zoomAutomaticoMira: signal(true),
  /** comandi per il pirata attivo, dall'HUD (D) o dall'input sul canvas (B). Il ciclo di gioco li timbra col tick. */
  comandi: creaCanale<Comando>(),
  /** azioni dell'HUD che non sono comandi della sim (pausa, esci, ricentra) */
  azioni: creaCanale<AzioneBattaglia>(),

  // ─── Carriera e mappa del mondo (P2, contratto del Lead P2: core/carriera.ts) ───
  /** schermata attiva quando non c'è una battaglia. La scrivono menu e Campagna; la scena del mondo si mostra con 'mondo'/'scena'/'paywall'. */
  schermata: signal<Schermata>('menu'),
  /** stato della carriera (lo scrive SOLO la Campagna; null finché il salvataggio non è caricato) */
  carriera: signal<StatoCarriera | null>(null),
  /** selezione e isole toccabili sulla mappa del mondo (lo scrive la Campagna, lo legge la scena del mondo) */
  evidenzaMondo: signal<EvidenzaMondo>({ selezionata: null, toccabili: [] }),
  /** la scena del mondo sta animando: la UI non accetta comandi della mappa */
  mondoOccupato: signal(false),
  /** animazioni chieste alla scena del mondo (in coda, una dopo l'altra) */
  animaMondo: creaCanale<AnimazioneMondo>(),
  /** tocco su un'isola della mappa del mondo (dalla scena Pixi alla Campagna) */
  isolaToccata: creaCanale<IdIsola>(),
  /** scontro della battaglia di carriera in corso (null in Schermaglia). Si scrive PRIMA di richiestaBattaglia. */
  battagliaCarriera: signal<BattagliaCarriera | null>(null),
};
