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
export const VERSIONE_REGOLE = 2;

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
  /** Fase 2: sottocartella delle tessere HD dentro `arte` (assente = 'hd'; il Prologo usa 'hd-prologo'). Solo grafica. */
  arteHd?: string;
  /** barili di polvere già piazzati (centro della base, appoggiati al suolo); la sim li crea come proiettili 'barile' fermi senza miccia, che esplodono se colpiti */
  barili?: Punto[];
  /** scale e liane (segmenti verticali, NON nella maschera): la sim li copia in StatoBattaglia.appigli con un id */
  appigli?: { tipo: TipoAppiglio; x: number; yAlto: number; yBasso: number }[];
  /**
   * Fase 3: ancoraggi del sostegno strutturale (rettangoli in px di mondo, estremi compresi). Un pezzo staccato dal
   * fondale resta su se ha almeno un pixel pieno dentro uno di questi; svuotato il rettangolo, l'ancoraggio non regge
   * più. Assente = conta solo il fondale (isole generate). Sono dati, non byte della maschera.
   */
  sostegni?: Rettangolo[];
  /** Fase 3: strutture con un comportamento speciale quando crollano (torre, ponte, masso, cengia) */
  strutture?: StrutturaMappa[];
}

/** rettangolo in px di mondo, estremi compresi */
export interface Rettangolo { x0: number; y0: number; x1: number; y1: number }

// ─── Fase 3: il campo si spezza (contratto congelato dal Lead P1 il 22/11/2026) ───────────────────

export type TipoStruttura = 'torre' | 'ponte' | 'masso' | 'cengia';

export interface StrutturaMappa extends Rettangolo {
  tipo: TipoStruttura;
  /** solo 'ponte': i due ancoraggi (da sinistra a destra). Tagliato un capo, il ponte resta appeso all'altro */
  ancoraggi?: [Rettangolo, Rettangolo];
}

export interface Struttura extends StrutturaMappa { stato: 'intera' | 'caduta' | 'calata' }

/** blocco che cade dritto o masso che rotola: è già fuori dalla maschera; arrivato a terra o in mare si frantuma */
export interface PezzoCadente {
  id: number;
  tipo: 'blocco' | 'masso';
  /** angolo in alto a sinistra adesso (float) e velocità in px/tick */
  x: number; y: number; vx: number; vy: number;
  /** w×h byte di MATERIALE (0 = vuoto): la forma del pezzo */
  w: number; h: number; maschera: Uint8Array;
  /** angolo in alto a sinistra da dove si è staccato: il render ritaglia lì l'arte */
  daX: number; daY: number;
  /** pirati già colpiti da questo pezzo (un colpo a testa) */
  colpiti: number[];
  /** indice in StatoBattaglia.strutture, −1 = nessuna */
  struttura: number;
}

/** legno che brucia: sparisce a `finoA` (tick) e lì si ricontrolla il sostegno. Non si propaga */
export interface Fuoco { id: number; x: number; y: number; r: number; finoA: number }

/** zona di sabbia che si assesta dopo uno scoppio (1 px a tick, fino a 45°) */
export interface Frana extends Rettangolo { finoA: number }

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

/**
 * Tipi di scontro (studio v2, PIANO §4.6; chiesti dal Lead P2, che li reimporta in core/carriera.ts):
 * - assalto: elimina tutti (la battaglia di sempre; vale anche quando `scontro` manca);
 * - bandiera: sulla vetta c'è una bandiera, chi la strappa vince (regola in sim/bandiera.ts, del Pacchetto 2);
 * - duello: 1 contro 1 col capo (nessuna regola nuova).
 */
export type TipoScontro = 'assalto' | 'bandiera' | 'duello';

export interface ConfigScontro {
  tipo: TipoScontro;
  /** solo bandiera: dove sta l'asta (piedi), in px di mondo. Se manca la sim prende il punto più alto della mappa. */
  bandiera?: Punto;
  /** battaglia di notte: solo grafica e IA, nessuna regola */
  notte?: boolean;
  /** barili già piazzati in più: li aggiunge la mappa, qui solo il numero voluto */
  bariliExtra?: number;
  /** nome del capo nemico per duello e boss minori (testo, es. 'Rigidini') */
  capo?: string;
}

/** Mosse premio della carriera (P2): in battaglia si accendono con ConfigSquadra.mosse. */
export type IdMossa = 'saltoAppoggio' | 'dondolo' | 'scivolata' | 'tuffo';

export interface ConfigSquadra {
  ciurma: IdCiurma;
  ruolo: Ruolo;
  controllo: 'umano' | 'ia';
  livelloIa?: LivelloIa;
  /** pirati in campo, 1-5 */
  pirati: number;
  /** mosse premio accese per questa squadra; assente = tutte (Schermaglia, Prologo) */
  mosse?: IdMossa[];
  /** nomi dei pirati, in ordine (reclute della carriera); assente o corto = nomi della ciurma */
  nomi?: string[];
}

export interface ConfigBattaglia {
  versioneRegole: number;
  seme: number;
  bioma: Bioma;
  variante?: Variante;
  /** squadra 0 = attaccante, squadra 1 = difensore */
  squadre: [ConfigSquadra, ConfigSquadra];
  /**
   * secondi del timer. Fino alla Fase 0: durata del turno, 20, 30 (Mozzo) o 45 (Timer lungo).
   * Dalla Fase 1 (BIL.ritmo): secondi PER SPARO, 12, 25 (Mozzo e Prologo) o 45 (Timer lungo).
   */
  timerSecondi: number;
  /** traiettoria tratteggiata intera (tutorial, Mozzo) invece del primo 30% */
  traiettoriaCompleta: boolean;
  /** mappa fatta a mano (battaglia/mappe, 06 §6) al posto di quella generata dal seme; resta nel replay */
  mappaFissa?: string;
  /**
   * seme della sola mappa generata (carriera, P2): se c'è, il generatore usa questo e `seme` resta per vento, casse
   * e IA; assente = la mappa nasce da `seme`. Con `mappaFissa` non conta. Lo legge battaglia/mappa-config.ts.
   */
  semeMappa?: number;
  /** tipo di scontro (carriera, P2); assente = assalto */
  scontro?: ConfigScontro;
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
  /**
   * Cosa sta facendo (studio v2, Fase 1): la scrive SOLO la sim; render (posa del pupazzo) e audio la leggono e
   * non decidono mai la fisica. Finché la sim della Fase 1 non c'è il campo manca e vale 'fermo'.
   */
  mossa?: MossaPirata;
  /** tick in cui è cominciata la mossa in corso (per far partire l'animazione dal primo fotogramma) */
  mossaDa?: number;
  /** Fase 1: salvataggi al bordo già usati in questa battaglia (limite BIL.movimento.bordoPerBattaglia); assente = 0 */
  bordi?: number;
  /** Fase 1: salti dal muro fatti da quando ha lasciato terra (torna a 0 quando tocca terra); assente = 0 */
  saltiMuro?: number;
  /** Fase 3: danno da macerie preso in questo turno (tetto BIL.macerie.maxPerTurno); torna a 0 a inizio turno */
  macerieNelTurno?: number;
}

/**
 * Mosse del pirata (PIANO §3 Fase 1). 'passo' = cammino corto, 'corsa' = falcate dopo BIL.movimento.corsaDopoSec,
 * 'frenata' = scivolata breve a fine corsa, 'salto' = sale, 'caduta' = scende, 'scavalco' = si issa su un muretto
 * fino a BIL.movimento.scavalcoMax, 'scivolata' = giù per un pendio ripido, 'bordo' = appeso al ciglio dopo il
 * salvataggio, 'scala' e 'liana' = aggrappato a un appiglio, 'aTerra' = sbalzato da un colpo: dal momento del colpo (anche in volo) fino a 0,5 s dopo che si è fermato.
 */
export type MossaPirata =
  | 'fermo' | 'passo' | 'corsa' | 'frenata' | 'salto' | 'caduta' | 'scavalco' | 'scivolata' | 'bordo' | 'scala' | 'liana' | 'aTerra';

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

/**
 * Ordine delle fasi. Fino alla Fase 0: inquadra → azione → volo → fuga → risoluzione.
 * Dalla Fase 1 (PIANO §3, "la fuga parte allo sparo"): inquadra → azione → fuga (ci si muove mentre il colpo
 * vola) → volo (solo se qualcosa vola ancora) → risoluzione. Chi legge la fase non deve dare per scontato l'ordine.
 */
export type FaseTurno =
  | 'inquadra'    // 0,6 s: la camera vola sul pirata attivo, niente comandi
  | 'azione'      // muovi/mira/fuoco; il timer scorre (parte al primo comando o dopo 2 s)
  | 'volo'        // proiettili in aria: timer fermo
  | 'fuga'        // movimento libero dopo lo sparo: 3 s; dalla Fase 1 1,5 s, e si chiude prima col comando 'fatto'
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
  /**
   * Fase 1: richiesta lasciata da eseguiComando che la sim applica al prossimo avanzaTick e poi cancella
   * ('fatto' = chiudi la fuga, 'balzo' = Balzo, 'balzoMuro' = Balzo con `indietro: true`). Assente = nessuna.
   * Sostituisce i valori sentinella in `fermoDa`.
   */
  richiesta?: 'fatto' | 'balzo' | 'balzoMuro';
}

/** 'bandiera' = scontro Bandiera vinto strappandola (P2) */
export type MotivoFine = 'eliminazione' | 'tempo' | 'ritirata' | 'bandiera';

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
  // Fase 3: facoltativi finché la sim non li crea in creaBattaglia (poi sempre presenti ed entrano nell'hash)
  /** blocchi che cadono e massi che rotolano */
  pezzi?: PezzoCadente[];
  /** legno che brucia */
  fuochi?: Fuoco[];
  /** sabbia che si assesta */
  frane?: Frana[];
  /** strutture della mappa col loro stato (copiate da MappaGenerata.strutture) */
  strutture?: Struttura[];
  /** ancoraggi del sostegno (copia di MappaGenerata.sostegni, fatta in creaBattaglia) */
  sostegni?: Rettangolo[];
  /** piedi di ogni pirata alla nascita, tutti e due i lati: per il rispetto della zona di caduta */
  partenze?: Punto[];
}

// ─── Comandi (input del giocatore o dell'IA) ──────────────────────────────────────────────────────

/**
 * Un comando vale per il pirata attivo nel tick in cui si applica. La sim ignora i comandi fuori fase
 * (es. fuoco in 'volo') senza errori. Replay = configurazione + lista di comandi con il tick.
 */
export type Comando =
  | { t: 'muovi'; dir: -1 | 0 | 1 }
  /**
   * Fino alla Fase 0: salto in avanti, o alto all'indietro. Dalla Fase 1 è il Balzo: la sim sceglie da sola tra
   * salto (con la rincorsa se corre), scavalco e stacco dall'appiglio; `indietro: true` vale solo contro una
   * parete (salto dal muro), altrove è un salto normale. Il salto alto all'indietro non esiste più.
   */
  | { t: 'salta'; indietro: boolean }
  /** Fase 1: in 'fuga' chiude subito il turno ("fatto"); fuori dalla fuga è ignorato */
  | { t: 'fatto' }
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
  /** materiale (Fase 1, per l'audio a strati): byte della maschera più presente nel cratere; assente = sabbia */
  | { t: 'esplosione'; x: number; y: number; raggio: number; arma: IdArma | 'lapide' | 'cassa'; materiale?: number }
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
  // ── studio v2, Fase 1: movimento da pirata (per pupazzo, polvere e audio) ──
  /** un piede tocca terra: uno ogni BIL.movimento.passoPx px percorsi; materiale = byte della maschera sotto il piede */
  | { t: 'passo'; pirata: number; x: number; y: number; corsa: boolean; materiale: number }
  /** mano su un piolo o sulla corda: uno ogni BIL.movimento.pioloPx px di arrampicata (liana: true sulle liane). Solo per audio e pupazzo */
  | { t: 'piolo'; pirata: number; x: number; y: number; liana: boolean }
  /** comincia a issarsi su un muretto (dura BIL.movimento.scavalcoSec) */
  | { t: 'scavalco'; pirata: number }
  /** comincia (inizio: true) o finisce una scivolata su un pendio ripido */
  | { t: 'scivola'; pirata: number; inizio: boolean; materiale: number }
  /** salvataggio al bordo: si è aggrappato al ciglio invece di cadere */
  | { t: 'bordo'; pirata: number }
  /** salto dal muro (Balzo contro una parete) */
  | { t: 'saltoMuro'; pirata: number }
  /** la fuga è stata chiusa col comando 'fatto' */
  | { t: 'fatto'; pirata: number }
  // ── studio v2, Fase 3: il campo si spezza ──
  /** un pezzo si stacca ed è già fuori dalla maschera; la forma sta in s.pezzi (il render ritaglia l'arte da daX, daY) */
  | { t: 'crollo'; pezzo: number; tipo: 'blocco' | 'masso'; x: number; y: number; w: number; h: number; materiale: number }
  /** il pezzo arriva a terra o in mare e si frantuma (polvere, schegge, suono) */
  | { t: 'macerie'; pezzo: number; x: number; y: number; inMare: boolean; materiale: number }
  /** la maschera è cambiata in questo rettangolo senza uno scoppio (pezzo staccato, legno bruciato, sabbia) */
  | { t: 'maschera'; x0: number; y0: number; x1: number; y1: number }
  /** il legno prende fuoco (inizio) o finisce di bruciare e sparisce */
  | { t: 'fuoco'; fuoco: number; x: number; y: number; r: number; inizio: boolean }
  /** la sabbia frana dentro un buco */
  | { t: 'frana'; x: number; y: number }
  /** il ponte tagliato da un lato resta appeso all'altro capo */
  | { t: 'ponteCalato'; struttura: number }
  // ── Pacchetto 2: scontro Bandiera ──
  | { t: 'bandieraPresa'; pirata: number }
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
  /** Fase 3: pezzi che si staccherebbero, nella posizione da cui partono, per l'anteprima in rosso */
  crolli?: { x: number; y: number; w: number; h: number; maschera: Uint8Array }[];
}
