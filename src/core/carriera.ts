// Tipi condivisi della CARRIERA e della MAPPA DEL MONDO: CONTRATTO CONGELATO dal Lead P2 (studio v2, Pacchetto 2).
// Li usano: Mondo e mappa (scena Pixi del Tavolo del Timone), Scenario e livelli (8 isole), Campagna e narrativa
// (regole, salvataggio, scene, premi, paywall), Arte UI (menu, pannelli). Solo il Lead P2 li cambia: se serve un
// campo nuovo, si chiede al Lead (non si aggiunge nel proprio ramo). Documento: docs/progetto/studio-v2/P2-contratti.md
//
// Come core/tipi.ts: solo dati serializzabili (numeri, stringhe, booleani, array, oggetti semplici), niente classi.
// Il salvataggio è StatoCarriera passato a JSON.stringify.

import type { Bioma, ConfigScontro, IdArma, IdMossa, LivelloIa, Punto } from './tipi';

// Scontri e mosse vivono in core/tipi.ts (contratto P1, Fase 1): qui si riesportano per chi usa la carriera.
export type { ConfigScontro, IdMossa, TipoScontro } from './tipi';

// ─── Identità ─────────────────────────────────────────────────────────────────────────────────────

/** '1A'…'1H' per il cap. 1 (15 §2), 'cala' per Cala Pappagallo (Prologo, non conquistabile sulla mappa). */
export type IdIsola = string;
export type IdRegione = string;
/** 0 = Prologo, 1 = Acque di Casa, 2-8 = capitoli a pagamento (non in P2) */
export type IdCapitolo = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Chi tiene un'isola. Nel cap. 1 ci sono solo il giocatore (Teschio Rosso) e la Marina. */
export type Padrone = 'giocatore' | 'marina';

// ─── Scontri e premi ──────────────────────────────────────────────────────────────────────────────

export type Premio =
  | { t: 'arma'; arma: IdArma }
  | { t: 'mossa'; mossa: IdMossa }
  /** recluta: nome e aspetto diversi, stessi PV e stessa fisica */
  | { t: 'recluta'; nome: string; aspetto: string }
  /** bandiera cosmetica della ciurma sulla mappa (es. 'teschioFumante') */
  | { t: 'bandiera'; id: string };

// ─── Dati del capitolo (contenuti/capitolo-1.ts) ──────────────────────────────────────────────────

/** Come si costruisce la mappa di battaglia di un'isola. Una delle due. */
export type MappaIsola = { fissa: string } | { seme: number };

export interface DefIsola {
  id: IdIsola;
  /** chiave in testi/it.ts › carriera.isole (nome mostrato) */
  nome: string;
  regione: IdRegione;
  /** rotte (bidirezionali, 15 §2) */
  adiacenti: IdIsola[];
  /** centro dell'isola sulla mappa logica del mondo (3072×1728, y verso il basso) */
  pos: Punto;
  /** raggio indicativo dello sprite sulla mappa (px logici, 70-110): serve a fascia d'onda, pedina, cartello */
  raggio: number;
  bioma: Bioma;
  /** id della mappa fissa (battaglia/mappe) o seme validato del generatore */
  mappa: MappaIsola;
  /** trucco ambientale dell'isola (PIANO §4.4), descrittivo: 'palafitte', 'gru', 'bastione', 'torre', 'archi',
   *  'stalattiti', 'dune', 'palmaPonte' */
  trucco: string;
  /** padrone e pirati a inizio capitolo (difficoltà Nostromo) */
  padroneIniziale: Padrone;
  piratiIniziali: number;
  /** scontro quando il giocatore la attacca; null = isola di partenza */
  scontro: ConfigScontro | null;
  /** premi dati alla PRIMA conquista */
  premi: Premio[];
}

export interface DefRegione {
  id: IdRegione;
  /** chiave in testi/it.ts › carriera.regioni */
  nome: string;
  /** rinforzi in più a round se il giocatore tiene tutta la regione */
  bonus: number;
  isole: IdIsola[];
}

export interface DefCapitolo {
  id: IdCapitolo;
  nome: string;
  isole: DefIsola[];
  regioni: DefRegione[];
  /** round massimi: oltre si perde il capitolo (PIANO §4.7: 8) */
  limiteRound: number;
  /** round in cui la Marina non attacca (copione §6: il primo) */
  roundProtetti: number;
  /** isola da cui il veliero arriva nella scena del viaggio (fuori dal capitolo: 'cala') */
  partenzaViaggio: IdIsola;
  /** pirati del Prologo e di Schermaglia restano: questi sono i pirati massimi per lato in battaglia */
  piratiMaxPerLato: number;
}

// ─── Stato salvato (piattaforma/salvataggio.ts) ───────────────────────────────────────────────────

export const VERSIONE_SALVATAGGIO = 1;

export interface StatoIsola {
  padrone: Padrone;
  pirati: number;
  /** conquistata almeno una volta dal giocatore (i premi si danno una volta sola) */
  presa: boolean;
}

/** Fasi del round sulla mappa del mondo (15, 02 semplificati per il cap. 1). */
export type FaseRound = 'rinforzi' | 'attacco' | 'marina' | 'fine';

/** Battaglia della carriera in corso: se l'app si chiude qui, al riavvio si torna alla mappa prima dell'attacco. */
export interface AttaccoInCorso {
  verso: IdIsola;
  /** isole da cui partono i pirati (attacco unito: 1 o 2) e quanti ne partono da ciascuna */
  da: { isola: IdIsola; pirati: number }[];
  /** true se è la Marina ad attaccare un'isola del giocatore (difesa giocata) */
  difesa: boolean;
}

export interface StatoCarriera {
  versione: number;
  /** capitolo in corso (0 = Prologo non ancora vinto) */
  capitolo: IdCapitolo;
  /** difficoltà della carriera (15 §1.1), scelta all'inizio e cambiabile tra un capitolo e l'altro.
   *  Facoltativa per i salvataggi vecchi: assente = contenuti/campagna.ts › difficoltaPredefinita. */
  difficolta?: LivelloIa;
  round: number;
  fase: FaseRound;
  isole: Record<IdIsola, StatoIsola>;
  /** rinforzi ancora da piazzare in questo round */
  rinforzi: number;
  attacco: AttaccoInCorso | null;
  /** sblocchi permanenti (valgono anche nei capitoli dopo) */
  armi: IdArma[];
  mosse: IdMossa[];
  reclute: { nome: string; aspetto: string }[];
  bandiere: string[];
  /** stelle migliori per capitolo (0-3) */
  stelle: Partial<Record<IdCapitolo, number>>;
  /** chiavi delle scene già viste (es. 'c1.inizio'): si possono saltare e non si ripetono */
  sceneViste: string[];
  /** acquisto "Sblocca tutto" fatto (Play Billing) */
  completo: boolean;
  /** isole che in questo round hanno già attaccato o sono appena state conquistate: non attaccano più fino al
   *  round dopo (si svuota a ogni round). Evita la conquista a catena in un round solo. */
  usate: IdIsola[];
  /** isole prese dal giocatore in questo round (la Marina non le attacca subito); si svuota a ogni round */
  conquisteRound: IdIsola[];
  /** contatori per stelle e telemetria del capitolo in corso */
  piratiPersi: number;
  /** pirati persi nelle battaglie Bandiera e Duello (★★★ del cap. 1) */
  perditeSfide: number;
  battaglieGiocate: number;
}

// ─── Animazioni della mappa del mondo (bus.animaMondo) ────────────────────────────────────────────

/** Cosa la Campagna chiede alla scena del mondo. La scena le esegue in coda e alla fine scrive bus.mondoOccupato=false. */
export type AnimazioneMondo =
  /** veliero da un'isola all'altra con la scia (viaggio dopo il Prologo, D9) */
  | { t: 'viaggio'; da: IdIsola; a: IdIsola }
  /** la nebbia si alza sulle isole del capitolo */
  | { t: 'nebbia'; capitolo: IdCapitolo }
  /** Scarlatta stacca il cartello grigio e pianta la bandierina rossa */
  | { t: 'conquista'; isola: IdIsola }
  /** la Marina riprende un'isola (cartello che ricade) */
  | { t: 'perdita'; isola: IdIsola }
  /** frecce d'attacco dalle isole di partenza a quella attaccata */
  | { t: 'attacco'; da: IdIsola[]; verso: IdIsola }
  /** il segnalino di legno cambia numero (rinforzi, perdite) */
  | { t: 'pirati'; isola: IdIsola; da: number; a: number }
  /** la camera va sull'isola (zoom opzionale) */
  | { t: 'centra'; isola: IdIsola; zoom?: number };

/** Evidenziazioni che la Campagna chiede durante l'input (non animazioni: stato, si ridisegna a ogni cambio). */
export interface EvidenzaMondo {
  /** isola selezionata (anello dorato) */
  selezionata: IdIsola | null;
  /** isole toccabili ora (pulsano piano); le altre sono un po' scure */
  toccabili: IdIsola[];
}
