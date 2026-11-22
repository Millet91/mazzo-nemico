// Costanti INTERNE della simulazione: piccoli numeri tecnici che non sono in BIL perché non sono
// regole di gioco (dove nasce il proiettile, quanto aspetta la lapide prima di esplodere…).
// Se il Lead vuole renderli tarabili, li sposta in contenuti/bilanciamento.ts e qui si leggono da BIL.

/** distanza dal centro del pirata a cui nasce il proiettile (fuori dalla capsula 12×22) */
export const BOCCA_PX = 16;

/** la lapide-barilotto esplode dopo questi tick dalla comparsa */
export const MICCIA_LAPIDE_TICK = 45;


/** un proiettile che vola per più di questi tick sparisce (rete di sicurezza: non succede nel gioco normale) */
export const VITA_MAX_PROIETTILE = 20 * 60;

/** dopo un'esplosione o una spinta il pirata ha una piccola componente verso l'alto, per staccarsi dal suolo */
export const SPINTA_MIN_SU = 0.5;

/** tick di assestamento simulati da simulaColpo dopo l'esplosione */
export const ASSESTAMENTO_TICK = 120;

/** raggio massimo (px) della ricerca dell'aria più vicina per espellere un pirata dal solido (caso 7) */
export const ESPULSIONE_MAX_PX = 40;

/** barili e casse: mezza altezza (il Proiettile ha il punto alla base) e raggio per essere raggiunti da un'esplosione */
export const OGGETTO_MEZZA_ALTEZZA = 11;
export const OGGETTO_RAGGIO = 10;

/** un barile o una cassa raggiunti da un'esplosione scoppiano dopo questi tick (la catena si vede) */
export const MICCIA_REAZIONE_TICK = 8;

/** deriva della cassa col paracadute: px/tick per punto di vento (5 px/s per punto) */
export const CASSA_DERIVA_PER_PUNTO = 5 / 60;

/** quota da cui parte la cassa (sopra il bordo alto della mappa) */
export const CASSA_PARTENZA_Y = -20;

/** chi è stato sbalzato da un colpo resta con la mossa 'aTerra' per questi tick dopo che si è fermato (0,5 s) */
export const A_TERRA_TICK = 30;

/** la pendenza del suolo si misura sul dislivello a questi px davanti al pirata */
export const SONDA_PENDENZA_PX = 8;

/** Balzo con la rincorsa: al salto si aggiunge questa parte della velocità di corsa (da fermo 69 px, di corsa circa 105) */
export const RINCORSA = 0.5;

/** salti dal muro concessi da quando si lascia terra (`Pirata.saltiMuro`) */
export const SALTI_MURO_MAX = 1;

/** in aria una parete conta come "accanto" entro questi px (per il salto dal muro) */
export const MURO_ACCANTO_PX = 2;
