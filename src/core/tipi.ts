// Tipi condivisi della battaglia: CONTRATTO CONGELATO dal Lead per M1 (14 §M1, 04 §5).
// Li usano sim (A), render e ciclo di gioco (B), generatore (C), HUD (D), IA (E). Solo il Lead li cambia:
// se serve un campo nuovo, si chiede al Lead (non si aggiunge nel proprio ramo).
//
// Unità: posizioni in px di mondo (float), velocità in px/tick, tempi in tick (60 al secondo),
// angoli in MEZZI GRADI interi 0..719 (vedi core/trig.ts). La y cresce verso il basso.
// Tutto lo stato è serializzabile con structuredClone (serve al Web Worker dell'IA e al replay):
// solo numeri, stringhe, booleani, array, oggetti semplici e Uint8Array. Niente classi, Map, funzioni.

import type { IdCiurma } from './palette';

export type { IdCiurma };

/** Versione delle regole: si alza quando un cambio rompe i replay salvati (05 n. 14). */
export const VERSIONE_REGOLE = 1;

// ─── Mondo e terreno ──────────────────────────────────────────────────────────────────────────────

export type Bioma = 'isola' | 'cimitero' | 'scogliera' | 'porto' | 'ghiacci' | 'grotta';
export type Variante = 'oro' | 'rovine' | 'giungla' | 'ossa' | 'tempesta';

/** Valori della maschera (00 §1.2), 1 byte per pixel. */
export const MATERIALE = {
  aria: 0,
  sabbia: 1,
  terra: 2,
  legno: 3,
  roccia: 4,
  ghiaccio: 5,
  ferro: 6,
} as const;
export type Materiale = (typeof MATERIALE)[keyof typeof MATERIALE];

export interface Terreno {
  /** larghezza e altezza in px (2048×1024) */
  w: number;
  h: number;
  /** w×h byte, riga per riga: indice = y * w + x. Valori di MATERIALE. */
  maschera: Uint8Array;
  /** livello del mare (y): sotto questa quota si annega. Sale dal turno 12. */
  mare: number;
}

export interface Punto { x: number; y: number }

/** Uscita del generatore (C). */
export interface MappaGenerata {
  terreno: Terreno;
  /** posti di spawn per lato: [lato 0 (attaccante), lato 1 (difensore)]; ogni Punto è il centro dei PIEDI del pirata */
  spawn: [Punto[], Punto[]];
  bioma: Bioma;
  variante?: Variante;
  /** seme effettivamente usato (seme + tentativi, o seme di riserva) */
  semeUsato: number;
  /** quanti tentativi sono serviti (1 = il primo); 0 = seme di riserva */
  tentativi: number;
  /** true se il lato 0 è a destra (specchio orizzontale, 06 §1) */
  specchiata: boolean;
  /** decorazioni solo grafiche (palme, massi disegnati): non toccano la fisica */
  decorazioni: Decorazione[];
  /** mappa fatta a mano con grafica dipinta: cartella in public/assets/mappe/ (terreno, cielo, sfondi). Solo grafica. */
  arte?: string;
  /** barili di polvere già piazzati (centro della base, appoggiati al suolo); la sim li crea come proiettili 'barile' fermi senza miccia, che esplodono se colpiti */
  barili?: Punto[];
  /** scale e liane (segmenti verticali, NON nella maschera): la sim li copia in StatoBattaglia.appigli con un id */
  appigli?: { tipo: TipoAppiglio; x: number; yAlto: number; yBasso: number }[];
}

export interface Decorazione { tipo: 'palma' | 'masso' | 'rovina' | 'cespuglio'; x: number; y: number; scala: number; specchio: boolean }

export interface RichiestaMappa {
  seme: number;
  bioma: Bioma;
  variante?: Variante;
  /** pirati per lato, 1-5 */
  piratiPerLato: [number, number];
}

// ─── Armi ─────────────────────────────────────────────────────────────────────────────────────────

/** Le 16 armi di 00 §1.3, nell'ordine della griglia 4×4. */
export type IdArma =
  | 'cannone' | 'granata' | 'pistola' | 'sciabola'
  | 'barile' | 'mina' | 'rum' | 'pallaSpezzata'
  | 'pappagallo' | 'scimmia' | 'ancora' | 'bordata'
  | 'rampino' | 'vanga' | 'bussola' | 'kraken';

// ─── Configurazione della battaglia ──────────────────────────────────────────────────────────────

export type LivelloIa = 'mozzo' | 'nostromo' | 'capitano';
export type Ruolo = 'attaccante' | 'difensore';

export interface ConfigSquadra {
  ciurma: IdCiurma;
  ruolo: Ruolo;
  controllo: 'umano' | 'ia';
  livelloIa?: LivelloIa;
  /** pirati in campo, 1-5 */
  pirati: number;
}

export interface ConfigBattaglia {
  versioneRegole: number;
  seme: number;
  bioma: Bioma;
  variante?: Variante;
  /** squadra 0 = attaccante, squadra 1 = difensore */
  squadre: [ConfigSquadra, ConfigSquadra];
  /** durata del turno: 20, 30 (Mozzo, prime battaglie) o 45 (Timer lungo) */
  timerSecondi: number;
  /** traiettoria tratteggiata intera (tutorial, Mozzo) invece del primo 30% */
  traiettoriaCompleta: boolean;
  /** mappa fatta a mano (battaglia/mappe, 06 §6) al posto di quella generata dal seme; resta nel replay */
  mappaFissa?: string;
}

// ─── Stato della battaglia ───────────────────────────────────────────────────────────────────────

export interface Squadra {
  indice: 0 | 1;
  ciurma: IdCiurma;
  ruolo: Ruolo;
  controllo: 'umano' | 'ia';
  livelloIa?: LivelloIa;
  /** munizioni rimaste; −1 = infinite. Le armi assenti non sono disponibili. */
  munizioni: Partial<Record<IdArma, number>>;
  /** indice (in pirati della squadra, in ordine di id) dell'ultimo pirata che ha giocato: si scorre a rotazione sui vivi */
  ultimoPirata: number;
  /** somma dei PV iniziali, per le barre di squadra */
  pvIniziali: number;
}

export type TipoAppiglio = 'scala' | 'liana';

/** scala o liana distruttibile: segmento verticale in x, da yAlto a yBasso (yAlto < yBasso). Non è nella maschera. */
export interface Appiglio {
  id: number;
  tipo: TipoAppiglio;
  x: number;
  yAlto: number;
  yBasso: number;
}

export type StatoPirata = 'vivo' | 'morto' | 'annegato';

export interface Pirata {
  id: number;
  squadra: 0 | 1;
  /** nome mostrato sopra la testa (dalla ciurma) */
  nome: string;
  /** centro della capsula 12×22 */
  x: number;
  y: number;
  vx: number;
  vy: number;
  vita: number;
  vitaMax: number;
  verso: 1 | -1;
  aTerra: boolean;
  stato: StatoPirata;
  /** y più alta (minima) raggiunta dall'ultimo distacco dal suolo, per il danno da caduta */
  yInizioCaduta: number;
  /** danno subito in questo turno, mostrato e applicato alle barre a fine risoluzione */
  dannoNelTurno: number;
  /** id dell'appiglio a cui è aggrappato (−1 = nessuno): niente gravità, può sparare */
  appeso: number;
}

export type TipoProiettile = 'palla' | 'granata' | 'frammento' | 'barile' | 'mina' | 'lapide' | 'cassa';

export type ContenutoCassa = 'rum' | 'trappola';

export interface Proiettile {
  id: number;
  tipo: TipoProiettile;
  arma: IdArma | 'lapide';
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** tick alla scadenza della miccia (−1 = esplode all'impatto) */
  tickEsplosione: number;
  /** id del pirata che l'ha lanciato (−1 = nessuno, es. lapide) */
  lanciatore: number;
  /** a terra e fermo (granata, barile, lapide, cassa) */
  fermo: boolean;
  /** solo per tipo 'cassa' */
  contenuto?: ContenutoCassa;
}

export type FaseTurno =
  | 'inquadra'    // 0,6 s: la camera vola sul pirata attivo, niente comandi
  | 'azione'      // muovi/mira/fuoco; il timer scorre (parte al primo comando o dopo 2 s)
  | 'volo'        // proiettili in aria: timer fermo
  | 'fuga'        // 3 s di movimento libero dopo lo sparo
  | 'risoluzione' // si aspetta che tutto sia fermo; lapidi, mare che sale, controllo fine
  | 'fine';       // battaglia finita (vedi esito)

export interface StatoTurno {
  /** numero del turno di battaglia, contato in totale per tutte e due le squadre, da 1 */
  numero: number;
  squadra: 0 | 1;
  /** id del pirata attivo */
  pirata: number;
  fase: FaseTurno;
  /** tick in cui è iniziata la fase */
  inizioFase: number;
  /** il timer del turno è partito */
  timerAvviato: boolean;
  /** tick rimasti al timer del turno (scende solo in 'azione' con timerAvviato) */
  tickRimasti: number;
  arma: IdArma;
  /** mira impostata: angolo in mezzi gradi assoluti (0 = destra) e potenza 0-100 */
  mira: { mezziGradi: number; potenza: number };
  /** miccia scelta per le armi a miccia, in secondi interi 1-5 */
  miccia: number;
  /** camminata in corso: −1 sinistra, 0 ferma, 1 destra */
  camminata: -1 | 0 | 1;
  /** arrampicata in corso su un appiglio: −1 su, 0 ferma, 1 giù */
  arrampicata: -1 | 0 | 1;
  /** lo sparo di questo turno c'è già stato */
  sparato: boolean;
  /** in 'risoluzione': tick da cui tutto è fermo (−1 = qualcosa si muove). La sim lo azzera a −1 a ogni cambio di fase */
  fermoDa: number;
}

export type MotivoFine = 'eliminazione' | 'tempo' | 'ritirata';

export interface EsitoBattaglia {
  /** squadra vincitrice */
  vincitore: 0 | 1;
  motivo: MotivoFine;
  /** pirati vivi per squadra */
  superstiti: [number, number];
  /** PV totali per squadra alla fine */
  pvTotali: [number, number];
  /** turni giocati */
  turni: number;
  /** pirati annegati per squadra (telemetria, 01 §10) */
  annegati: [number, number];
}

export interface StatoBattaglia {
  versioneRegole: number;
  config: ConfigBattaglia;
  /** stato del PRNG (core/rng.ts) */
  rng: number;
  tick: number;
  terreno: Terreno;
  /** vento del turno, intero da −max a +max del bioma (positivo = verso destra) */
  vento: number;
  squadre: [Squadra, Squadra];
  pirati: Pirata[];
  proiettili: Proiettile[];
  /** scale e liane presenti (id da prossimoId) */
  appigli: Appiglio[];
  /** contatore per gli id di proiettili e appigli */
  prossimoId: number;
  turno: StatoTurno;
  esito: EsitoBattaglia | null;
}

// ─── Comandi (input del giocatore o dell'IA) ──────────────────────────────────────────────────────

/**
 * Un comando vale per il pirata attivo nel tick in cui si applica. La sim ignora i comandi fuori fase
 * (es. fuoco in 'volo') senza errori. Replay = configurazione + lista di comandi con il tick.
 */
export type Comando =
  | { t: 'muovi'; dir: -1 | 0 | 1 }
  | { t: 'salta'; indietro: boolean }
  /** su (−1) / giù (1) / ferma (0) su un appiglio; ci si aggrappa se si è entro BIL.arrampicata.presa px */
  | { t: 'arrampica'; dir: -1 | 0 | 1 }
  /** imposta la mira (fionda o IA); mezziGradi 0..719 assoluti, potenza intera 0..100 */
  | { t: 'mira'; mezziGradi: number; potenza: number }
  /** ▲▼: ruota la mira di `delta` mezzi gradi verso l'alto (+) o il basso (−), nel verso del pirata */
  | { t: 'ruotaMira'; delta: number }
  | { t: 'arma'; arma: IdArma }
  | { t: 'miccia'; secondi: number }
  | { t: 'fuoco' }
  | { t: 'ritirata' };

export interface ComandoRegistrato { tick: number; c: Comando }

export interface Replay {
  versioneRegole: number;
  config: ConfigBattaglia;
  comandi: ComandoRegistrato[];
  /** hash atteso dello stato ogni 600 tick (13 §2 L2): chiave = tick */
  hash?: Record<number, string>;
  /** tick finale (fine battaglia) */
  tickFinale?: number;
}

// ─── Eventi (dalla sim al render, all'HUD, all'audio e alle vibrazioni) ───────────────────────────

export type EventoBattaglia =
  | { t: 'turnoIniziato'; numero: number; squadra: 0 | 1; pirata: number; vento: number }
  | { t: 'fase'; fase: FaseTurno }
  | { t: 'timerAvviato' }
  | { t: 'sparo'; pirata: number; arma: IdArma }
  | { t: 'salto'; pirata: number }
  | { t: 'atterrato'; pirata: number; dannoCaduta: number }
  | { t: 'rimbalzo'; proiettile: number; x: number; y: number }
  | { t: 'esplosione'; x: number; y: number; raggio: number; arma: IdArma | 'lapide' | 'cassa' }
  /** la maschera è cambiata in questo rettangolo (il render ridisegna solo le tile toccate) */
  | { t: 'cratere'; x: number; y: number; raggio: number }
  | { t: 'colpoPistola'; da: Punto; a: Punto }
  | { t: 'colpoSciabola'; pirata: number; colpiti: number[] }
  | { t: 'danno'; pirata: number; quanto: number; x: number; y: number }
  | { t: 'morto'; pirata: number; causa: 'pv' | 'mare' }
  | { t: 'splash'; x: number; y: number; grande: boolean }
  | { t: 'lapide'; pirata: number; proiettile: number }
  | { t: 'mareSale'; livello: number }
  | { t: 'cassaCaduta'; proiettile: number; x: number }
  | { t: 'cassaAperta'; proiettile: number; pirata: number; contenuto: ContenutoCassa }
  | { t: 'aggrappato'; pirata: number; appiglio: number }
  | { t: 'staccato'; pirata: number }
  /** un'esplosione ha tolto il tratto yAlto-yBasso dell'appiglio (il resto può diventare uno o due appigli) */
  | { t: 'appiglioRotto'; appiglio: number; x: number; yAlto: number; yBasso: number }
  | { t: 'fine'; esito: EsitoBattaglia };

// ─── IA ───────────────────────────────────────────────────────────────────────────────────────────

/** Cosa ha deciso l'IA per il turno: il ciclo di gioco (B) lo trasforma in comandi animati. */
export interface PianoIa {
  arma: IdArma;
  mezziGradi: number;
  potenza: number;
  /** solo per le armi a miccia */
  miccia?: number;
  /** spostamento prima di mirare: direzione e tick di camminata (Mozzo: nessuno) */
  camminata?: { dir: -1 | 1; tick: number };
  /** direzione della fuga dopo lo sparo (0 = resta fermo) */
  fuga: -1 | 0 | 1;
  /** punteggio del tiro scelto (debug) */
  punteggio: number;
}

/** Tiro da provare con simulaColpo (sim, A). Non muta lo stato. */
export interface PianoColpo {
  pirata: number;
  arma: IdArma;
  mezziGradi: number;
  potenza: number;
  miccia?: number;
  /** tick massimi da simulare (default: fino all'esplosione + 120 tick di assestamento) */
  maxTick?: number;
}

export interface EsitoColpo {
  /** danno inflitto per pirata (id → PV persi), compreso il lanciatore */
  danni: Record<number, number>;
  /** pirati che muoiono (PV a 0) */
  uccisi: number[];
  /** pirati che finiscono in mare */
  annegati: number[];
  /** punto dell'esplosione o dell'impatto principale (null se il proiettile è finito in mare o fuori) */
  impatto: Punto | null;
  /** tick simulati */
  tick: number;
}
