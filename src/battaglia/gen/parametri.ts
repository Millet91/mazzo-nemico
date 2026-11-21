// Parametri del generatore (06 §0-§4, §7, corretti da 00 §2.2). Sono i numeri del LIVELLO, non del bilanciamento
// della battaglia: quelli (mondo, mare, fisica, armi) si leggono sempre da BIL e ARMA.
// Proprietario: agente Generatore (C).

import { BIL } from '../../contenuti/bilanciamento';

const M = BIL.mondo;

/** Regole comuni a tutti i biomi: spawn, equità, anti-frustrazione. */
export const REGOLE = {
  /** posti di spawn per lato (00 §9: 5 per lato, in M1 se ne usano 3) */
  spawnPerLato: 5,
  /** zona di sbarco, in frazione della larghezza dal proprio lato (06 §4) */
  zonaDa: 0.12,
  zonaA: 0.40,
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
  /** percorso a piedi in un turno (06 §7.2) */
  camminataTurno: 1200,
  /** riempimento: solido tra fineCielo e mare (06 §0) */
  solidoMin: 0.35,
  solidoMax: 0.50,
  /** ferro massimo, sul solido tra fineCielo e mare (il fondale 984-1024 è fuori dal conto) */
  ferroMax: 0.03,
  /** tentativi con seme+1 prima del seme di riserva (06 §1) */
  tentativi: 8,
  /** decorazioni a non più di questa distanza da uno spawn non si piazzano (06 §7.7) */
  decorazioniLontanoDaSpawn: 40,
} as const;

/** Parametri del bioma Isola tropicale (06 §2, 00 §2.2). */
export const ISOLA = {
  /** strati dalla superficie: 24 px di sabbia, poi terra, roccia sotto 160 px */
  sabbia: 24,
  roccia: 160,
  /** riva: da quanti px dal bordo comincia la terra, e piccola spiaggia bassa */
  rivaMin: 80,
  rivaMax: 130,
  spiaggiaMin: 40,
  spiaggiaMax: 90,
  /** cresta (duna) vicino alla costa, in frazione della larghezza, e sua quota sopra il mare */
  crestaDa: 0.13,
  crestaA: 0.17,
  crestaQuotaMin: 340,
  crestaQuotaMax: 430,
  /** dalla cresta si scende alla piana interna: distanza e dislivello (il riparo dalle spinte) */
  piedeMin: 110,
  piedeMax: 170,
  riparoMin: 90,
  riparoMax: 140,
  /** differenza massima (px) tra i numeri del lato sinistro e del destro */
  scartoLati: 16,
  /** la piana arriva fin qui (frazione della larghezza) con una piccola onda di quota */
  pianaFino: 0.40,
  pianaOnda: 45,
  /** centro dell'isola: collina (+) o valle (−) rispetto alla piana */
  centroMin: -120,
  centroMax: 180,
  /** rumore 1D sul profilo, entro ±48 px (06 §1.2) */
  rumoreMax: 48,
  rumoreAmpMin: 6,
  rumoreAmpMax: 16,
  rumorePassoMin: 180,
  rumorePassoMax: 300,
  /** riempimento cercato prima dei buchi (dentro 35-50%) */
  riempimentoMin: 0.39,
  riempimentoMax: 0.46,
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
