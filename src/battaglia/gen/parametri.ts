// Parametri del generatore (06 §0-§4, §7, corretti da 00 §2.2). Sono i numeri del LIVELLO, non del bilanciamento
// della battaglia: quelli (mondo, mare, fisica, armi) si leggono sempre da BIL e ARMA.
// Proprietario: agente Generatore (C).

import { BIL } from '../../contenuti/bilanciamento';

const M = BIL.mondo;

/** Regole comuni a tutti i biomi: spawn, equità, anti-frustrazione. */
export const REGOLE = {
  /** posti di spawn per lato (00 §9: 5 per lato, in M1 se ne usano 3) */
  spawnPerLato: 5,
  /** zona di sbarco, in frazione della larghezza dal proprio lato (06 §4: 12-40%; Lead design 21/11/2026 per l'Isola: 10-42%) */
  zonaDa: 0.10,
  zonaA: 0.42,
  /** piano largo almeno 32 px con pendenza ≤ 15° (32 × tan 15° ≈ 8,6 px di dislivello) */
  pianoLarghezza: 32,
  pianoDislivelloMax: 8,
  /** solido sotto i piedi e aria sopra la testa */
  solidoSotto: 48,
  ariaSopra: 40,
  distanzaNemici: 150,
  distanzaCompagni: 60,
  sopraMare: 80,
  /** equità tra i due lati (06 §4) */
  equitaQuota: 64,
  equitaDistanzaMare: 40,
  equitaMassa: 0.15,
  equitaLineaTiro: 1,
  /** niente spawn su sporgenze: 170 px di solido continuo o una parete ≥ 40 px (06 §7.1) */
  sporgenza: 170,
  pareteMin: 40,
  /** 06 §7.2, clausola della sciabola: spawn scartato se la sciabola lo butta in mare e un nemico è raggiungibile
   *  a piedi. Spenta per l'Isola (proposta al Lead design 21/11/2026): con la costa aperta non resterebbero spawn. */
  sciabolaVieta: false,
  /** percorso a piedi in un turno (06 §7.2) */
  camminataTurno: 1200,
  /** riempimento: solido tra fineCielo e mare (06 §0: 35-50%; Lead design 21/11/2026 per l'Isola: minimo 20%,
   *  perché con la costa aperta e 5 spawn in piano il 30% chiede montagne fino al cielo).
   *  In M1 tutti i biomi usano il terreno dell'Isola: quando arrivano gli altri biomi questi limiti vanno per bioma. */
  solidoMin: 0.20,
  solidoMax: 0.50,
  /** ferro massimo, sul solido tra fineCielo e mare (il fondale 984-1024 è fuori dal conto) */
  ferroMax: 0.03,
  /** tentativi con seme+1 prima del seme di riserva (06 §1) */
  tentativi: 8,
  /** decorazioni a non più di questa distanza da uno spawn non si piazzano (06 §7.7) */
  decorazioniLontanoDaSpawn: 40,
  /** scale e liane (design/comandi/scale-e-liane.md): 2-4 per mappa, uguali per lato, lunghe 60-220 px, mai entro
   *  40 px da uno spawn; la cima arriva entro 8 px da un piano largo almeno 24 px */
  appigliMin: 2,
  appigliMax: 4,
  appiglioCorto: 60,
  appiglioLungo: 220,
  appiglioLontanoDaSpawn: 40,
  appiglioPiano: 24,
  appiglioCima: 8,
} as const;

/** Parametri del bioma Isola tropicale (06 §2, 00 §2.2). */
export const ISOLA = {
  /** strati dalla superficie: 24 px di sabbia, poi terra, roccia sotto 160 px */
  sabbia: 24,
  roccia: 160,
  /** riva: da quanti px dal bordo comincia la terra, e piccola spiaggia bassa */
  rivaMin: 70,
  rivaMax: 100,
  spiaggiaMin: 30,
  spiaggiaMax: 60,
  /** orlo della costa: quota sopra il mare e px di riva per ogni px di quota (riva quasi dritta: 1,30 ≈ 37,6°, 1,45 ≈ 34,6°) */
  orloQuotaMin: 130,
  orloQuotaMax: 180,
  rivaPerQuotaMin: 130,
  rivaPerQuotaMax: 145,
  /** orlo rialzato in cima alla riva (06 §7.3; Lead design: 10-40 px) */
  labbroMin: 10,
  labbroMax: 40,
  /** la piana degli spawn sta sopra l'orlo di questi px */
  pianaMin: 0,
  pianaMax: 20,
  /** la piana sale verso l'interno di questi px fino al punto ondaA (pendenza ≤ ~12°) */
  salitaMin: 30,
  salitaMax: 80,
  /** onda della piana: punto a questa frazione della larghezza, ± px */
  ondaA: 0.38,
  pianaOnda: 15,
  /** differenza massima (px) tra i numeri del lato sinistro e del destro */
  scartoLati: 16,
  /** il centro sotto le colline può abbassarsi fino a questi px (valle) */
  centroAbbassa: 60,
  /** probabilità di una sola collina larga (altrimenti due con una valle in mezzo) */
  unaCollina: 0.4,
  collinaUnaMin: 200,
  collinaUnaMax: 320,
  collinaDueMin: 150,
  collinaDueMax: 260,
  /** distanza delle due colline dal centro */
  valleMin: 90,
  valleMax: 140,
  /** la cima più alta non sale sopra questa y (Lead design 21/11/2026) */
  cimaMinY: 250,
  /** le colline si scalano per il riempimento, entro questi limiti */
  scalaCollineMin: 0.6,
  scalaCollineMax: 1.4,
  /** rumore 1D sul profilo, entro ±48 px (06 §1.2) */
  rumoreMax: 48,
  rumoreAmpMin: 4,
  rumoreAmpMax: 10,
  rumorePassoMin: 180,
  rumorePassoMax: 300,
  /** riempimento cercato prima dei buchi (Lead design 21/11/2026: obiettivo 22-26%) */
  riempimentoMin: 0.22,
  riempimentoMax: 0.26,
  /** grotte a metaball: gruppi da 2 sfere */
  grotteMin: 1,
  grotteMax: 4,
  grottaRaggioMin: 20,
  grottaRaggioMax: 38,
  /** il bordo della grotta resta almeno a questa profondità sotto la superficie */
  grottaTetto: 40,
  /** 1-2 massi di roccia mezzi interrati */
  massiMin: 1,
  massiMax: 2,
  massoRaggioMin: 24,
  massoRaggioMax: 40,
} as const;

export const MONDO = {
  w: M.larghezza,
  h: M.altezza,
  cielo: M.fineCielo,
  mare: M.mareIniziale,
  fondale: M.inizioFondale,
  /** bordi laterali sempre acqua aperta (06 §0) */
  bordo: 64,
} as const;

/** Semi di riserva già validati (06 §1, 00 §2.2): si usano dopo 8 tentativi falliti. Il test li ricontrolla. */
export const SEME_RISERVA: Record<string, number> = {
  isola: 1,
};
