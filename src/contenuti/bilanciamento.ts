// Numeri di bilanciamento della battaglia (00 §1.1, §1.2, §3; 01 §8). Sono VALORI INIZIALI: si cambiano solo qui,
// mai ricopiati a mano nei test o nel codice (13 §1). Solo il Lead modifica questo file.
// Unità della simulazione: px e tick (60 tick = 1 s). Le conversioni da px/s stanno qui, una volta sola.

import type { Bioma, LivelloIa } from '../core/tipi';

export const TICK_AL_SECONDO = 60;
const S = TICK_AL_SECONDO;

export const BIL = {
  mondo: {
    larghezza: 2048,
    altezza: 1024,
    /** 0-160 cielo libero */
    fineCielo: 160,
    /** mare iniziale (Marea alta: 900) */
    mareIniziale: 950,
    mareMareaAlta: 900,
    /** 984-1024 fondale in ferro */
    inizioFondale: 984,
    tile: 256,
  },

  camera: {
    altezzaLogica: 540,
    larghezzaMin: 960,
    larghezzaMax: 1215,
    zoomPredefinito: 1.4,
    zoomMin: 0.5,
    zoomMax: 2.0,
    risoluzioneMax: 1.5,
    /** il trascinamento della camera non parte entro questi px CSS dai bordi laterali (gesto indietro) */
    margineGestoIndietro: 24,
    /** durata del volo della camera sul pirata attivo */
    inquadraTick: Math.round(0.35 * S), // passata di ritmo (m1-ritmo §3): 0,6 → 0,35 s
  },

  pirata: {
    pv: 70,
    /** Corsari del Gelo in difesa (+10) */
    pvGeloDifesa: 80,
    capsulaLarghezza: 12,
    capsulaAltezza: 22,
    /** sprite disegnato a 40 px di mondo */
    altezzaSprite: 40,
    camminata: 60 / S,
    gradinoMax: 8,
    saltoAvanti: { vx: 90 / S, vy: -230 / S },
    saltoIndietro: { vx: -40 / S, vy: -330 / S },
    /** doppio tocco su SALTA entro questi ms = salto all'indietro (lo decide la UI) */
    doppioToccoMs: 250,
    rimbalzo: 0.3,
    /** sotto questa velocità (px/tick) il pirata è fermo */
    velocitaFermo: 5 / S,
    /** danno da caduta: oltre 90 px, 1 PV ogni 4 px, massimo 25 */
    /** danno = min(cadutaMax, floor((caduta − cadutaSoglia) / cadutaPxPerPv)): conta solo l'eccesso */
    cadutaSoglia: 90,
    cadutaPxPerPv: 4,
    cadutaMax: 25,
  },

  fisica: {
    /** 600 px/s² */
    gravita: 600 / (S * S),
    /** 950 px/s alla potenza 100% */
    velocitaMaxProiettile: 950 / S,
    /** 15 px/s² per punto di vento */
    ventoPerPunto: 15 / (S * S),
    /** spinta dell'esplosione: D × 7 px/s, con la stessa attenuazione del danno */
    spintaPerDanno: 7 / S,
    /** al massimo 5 tick per frame (13 caso 6) */
    tickMaxPerFrame: 5,
    /** bordo bruciato dei crateri (03 §2) */
    bordoBruciato: 3,
    /** moltiplicatore del cratere per materiale, indice = valore della maschera (00 §1.2) */
    moltiplicatoreCratere: [0, 1.2, 1.0, 1.0, 0.75, 0.9, 0] as readonly number[],
    /** attrito per materiale (ghiaccio 0,2); 1 = normale */
    attrito: [1, 1, 1, 1, 1, 0.2, 1] as readonly number[],
  },

  turno: {
    /** timer del turno in secondi: normale, Mozzo e prime 3 battaglie, Timer lungo */
    timerNormale: 20,
    timerMozzo: 30,
    timerLungo: 45,
    /** il timer parte al primo comando oppure dopo 2 s */
    avvioTimerTick: 2 * S,
    fugaTick: 3 * S,
    /** dopo 10 s di risoluzione chi vibra si ferma d'ufficio (13 caso 8) */
    risoluzioneMaxTick: 10 * S,
    /** la risoluzione passa appena tutto è fermo da 0,25 s (m1-ritmo §3; sostituisce RISOLUZIONE_MIN_TICK della sim) */
    risoluzioneFermoTick: Math.round(0.25 * S),
  },

  battaglia: {
    /** dal turno 12 (totale) il mare sale di 25 px alla fine di ogni turno */
    mareSaleDalTurno: 12,
    mareSalePx: 25,
    /** al turno 18 vince chi ha più PV totali; a parità il difensore */
    turnoLimite: 18,
    ritirataDalTurno: 4,
  },

  lapide: { danno: 10, raggio: 25 },

  /** scale e liane distruttibili (richiesta del proprietario, 21/11/2026) */
  arrampicata: {
    /** px/tick: 40 px/s in su, 60 px/s in giù, uguale per scala e liana (design/comandi/scale-e-liane.md) */
    velocitaSu: 40 / S,
    velocitaGiu: 60 / S,
    /** ci si aggrappa entro questi px dal centro del pirata all'appiglio */
    presa: 8,
    /** un pezzo di appiglio più corto di così sparisce */
    pezzoMinimo: 10,
    /** in cima il pirata passa dalla scala al piano accanto (e dal piano alla scala, con "scendi") fino a questa distanza dall'asse */
    passaggioCima: 20,
    /** "scendi" dall'alto: i piedi stanno sul piano in cima, al più tanto sopra o sotto la cima dell'appiglio */
    piediCima: 12,
  },

  /** barili di polvere già piazzati dal generatore (m1-ritmo §9; 06 §2 Porto e §7.4) */
  barili: { min: 3, max: 4, danno: 75, raggio: 85, distanzaMinimaSpawn: 200 },

  /** casse (00 §1.1). In M1 solo Rum e Trappola (niente armi): i pesi si normalizzano tra quelli presenti */
  casse: {
    dalTurno: 3,
    probabilita: 0.5,
    maxInMappa: 3,
    pesi: { rum: 30, trappola: 15 } as Record<'rum' | 'trappola', number>,
    rumPv: 25,
    rumPvMax: 100,
    trappola: { danno: 30, raggio: 50 },
    /** una cassa colpita da un'esplosione scoppia */
    esplosione: { danno: 25, raggio: 45 },
    /** scende col paracadute a 60 px/s e il vento la sposta */
    discesa: 60 / S,
    /** rimonta: la squadra sotto il 60% dei PV avversari ha il 70% di probabilità che la cassa cada nella sua metà */
    rimontaSoglia: 0.6,
    rimontaProbabilita: 0.7,
  },

  /** vento massimo per bioma (00 §2.2) */
  ventoMax: { isola: 6, cimitero: 8, scogliera: 10, porto: 5, ghiacci: 7, grotta: 0 } as Record<Bioma, number>,

  mira: {
    /** anello di mira attorno al pirata, px CSS */
    anelloPx: 100,
    /** trascinamento massimo = potenza 100%, px CSS */
    trascinamentoMaxPx: 160,
    /** frazione del volo mostrata dalla traiettoria tratteggiata */
    traiettoria: 0.3,
    /** ▲▼: 1° a tocco, 10°/s tenendo premuto */
    passoTastiGradi: 1,
    tastiGradiAlSecondo: 10,
    /** mira all'inizio del turno: 45° davanti al pirata, potenza 60% */
    angoloInizialeGradi: 45,
    potenzaIniziale: 60,
    micciaPredefinita: 3,
  },

  /** tratti delle ciurme che valgono in battaglia (00 §2.1) */
  tratti: {
    /** Teschio Rosso: +10% di danno sulle armi esplosive */
    /** D effettivo = floor(D × (1 + bonus)): cannone 49, granata 44. Non vale sulla lapide. */
    teschioBonusDanno: 0.1,
    teschioArmi: ['cannone', 'granata', 'barile', 'mina', 'pallaSpezzata', 'pappagallo', 'scimmia', 'bordata'] as readonly string[],
  },

  /** IA di battaglia (01 §8; 05 n. 19) */
  ia: {
    /** errorePotenza: errore uniforme inteso sulla GITTATA (±15% di gittata ≈ ±7,5% di potenza, perché la gittata va col
     *  quadrato della potenza). erroreGradi: uniforme sull'angolo. Taratura finale col simulatore (giocatore batte Mozzo all'85%). */
    /** l'IA sceglie solo tra le armi di `armi` che hanno munizioni nella sua Squadra */
    punteggio: { uccisione: 60, annegamento: 80, dannoAmico: -1.5, dannoSe: -2, seInMare: -200, sogliaMinima: 10 },
    livelli: {
      mozzo: { simulazioni: 40, posizioni: 0, erroreGradi: 8, errorePotenza: 0.15, vento: 0.5, sceltaTraMigliori: 5, armi: ['cannone', 'granata', 'pistola', 'sciabola', 'barile'] },
      nostromo: { simulazioni: 200, posizioni: 2, erroreGradi: 3, errorePotenza: 0.06, vento: 1, sceltaTraMigliori: 1, armi: [] },
      capitano: { simulazioni: 600, posizioni: 4, erroreGradi: 1, errorePotenza: 0.02, vento: 1, sceltaTraMigliori: 1, armi: [] },
    } as Record<LivelloIa, { simulazioni: number; posizioni: number; erroreGradi: number; errorePotenza: number; vento: number; sceltaTraMigliori: number; armi: string[] }>,
    /** "il capitano medita": attesa minima prima di mirare, e durata dell'animazione della mira */
    pensieroMinimoMs: 450, // m1-ritmo §3
    animazioneMiraMs: 350, // m1-ritmo §3
  },
} as const;
