// Pose del pirata a pezzi (studio v2, Fase 1; animazione.md §3). Parte PURA: niente Pixi, testata in Node.
//
// Tre passi, tutti senza memoria:
//   1. `bersaglio`  stato del pirata (mossa, px percorsi, mira, colpi) → PARAMETRI della posa (anca, busto, piedi, mani…)
//   2. `sfuma`      quando la mossa cambia, i parametri passano dalla posa vecchia alla nuova in 90 ms
//   3. `risolvi`    parametri → OSSA: posizione e rotazione di ogni pezzo (ginocchia e gomiti con cinematica inversa)
// Il disegno (pirata-rig.ts) mette solo gli sprite dove dicono le ossa.
//
// Regola del Pacchetto 1: IL RENDER NON DECIDE MAI LA FISICA. Qui si legge lo stato della sim e basta; la capsula
// 12×22 non cambia. Sistema di riferimento del pupazzo: origine sotto i piedi, x in avanti (dove guarda), y in giù,
// unità = px di mondo. Chi guarda a sinistra viene specchiato dal contenitore.
import type { IdArma, IdCiurma, MossaPirata, TipoAppiglio } from '../../core/tipi';
import { BIL, TICK_AL_SECONDO } from '../../contenuti/bilanciamento';

// ─── Scheletro ────────────────────────────────────────────────────────────────────────────────────

/** misure dello scheletro in px di mondo: pirata alto ~42 col cappello (BIL.pirata.altezzaSprite = 40) */
export const SCHELETRO = {
  /** altezza dell'anca dai piedi, in piedi a riposo */
  anca: 14.5,
  coscia: 7,
  stinco: 6,
  /** la caviglia sta a questa altezza dalla suola */
  caviglia: 1.6,
  /** dall'anca al collo */
  busto: 10,
  /** la spalla sta poco sotto il collo, lungo il busto */
  spalla: 1.8,
  braccio: 5.2,
  avambraccio: 5.4,
  /** le due anche stanno a ± questo dal centro */
  ancaLarga: 1.6,
  /** il perno del corpo intero (capriole, morte, steso a terra) sta a questa altezza dai piedi */
  perno: 14,
} as const;
const S = SCHELETRO;
const GAMBA = S.coscia + S.stinco;
const BRACCIO = S.braccio + S.avambraccio;

/** due passi (uno per piede) ogni tanti px percorsi: il passo segue la DISTANZA, non il tempo */
export const CICLO_PASSO_PX = BIL.movimento.passoPx * 2;
/** su scala e liana le mani si alternano ogni 8 px */
export const CICLO_SALITA_PX = 16;
/** durata della sfumatura tra due pose, ms; chi era steso a terra si rialza in 400 ms (animazione.md §3.7) */
export const SFUMA_MS = 90;
export const RIALZATA_MS = 400;

/** Le 16 armi si tengono in 4 modi (animazione.md §4: "ne bastano 4"). */
export type ArmaPosa = 'cannone' | 'granata' | 'pistola' | 'sciabola';
export function armaPosa(a: IdArma): ArmaPosa {
  switch (a) {
    case 'granata': case 'barile': case 'mina': case 'rum': case 'pappagallo': case 'scimmia': return 'granata';
    case 'pistola': case 'rampino': case 'bussola': return 'pistola';
    case 'sciabola': case 'vanga': return 'sciabola';
    default: return 'cannone';
  }
}

/**
 * Andatura di ciascuna ciurma (animazione.md §8): 5 numeri. dondolo = rollio del busto, braccia = ampiezza
 * dell'oscillazione, molleggio = quanto sale e scende, busto = inclinazione di base (+ avanti), zoppo = passo sbilenco.
 */
export const ANDATURA: Record<IdCiurma, { dondolo: number; braccia: number; molleggio: number; busto: number; zoppo: number }> = {
  teschio: { dondolo: 1.3, braccia: 1.1, molleggio: 1.0, busto: 0.02, zoppo: 0 },   // spavaldo
  gelo: { dondolo: 0.5, braccia: 0.5, molleggio: 0.7, busto: 0.09, zoppo: 0 },      // rigido e infreddolito
  oro: { dondolo: 0.9, braccia: 0.8, molleggio: 1.5, busto: -0.07, zoppo: 0 },      // pavoneggiato
  marea: { dondolo: 1.5, braccia: 1.2, molleggio: 1.1, busto: 0.05, zoppo: 0.8 },   // sbilenco
  marina: { dondolo: 0.2, braccia: 1.5, molleggio: 0.6, busto: -0.02, zoppo: 0 },   // passo di marcia
};

// ─── Parametri della posa ─────────────────────────────────────────────────────────────────────────

/** Indici dei parametri (Float32Array: si sfumano con un ciclo solo, senza creare oggetti a ogni frame). */
export const PAR = {
  /** corpo intero: spostamento, rotazione attorno al perno, schiacciata */
  rx: 0, ry: 1, rot: 2, sx: 3, sy: 4,
  ancaX: 5, ancaY: 6,
  /** inclinazione del busto (+ in avanti) e della testa, radianti */
  busto: 7, testa: 8,
  /** cappello: spostamento dalla testa e rotazione in più */
  cappX: 9, cappY: 10, cappRot: 11,
  /** falda della giacca */
  falda: 12,
  /** piede davanti (A) e dietro (B): dove tocca la suola, e rotazione (+ = punta in giù) */
  pAx: 13, pAy: 14, pArot: 15, pBx: 16, pBy: 17, pBrot: 18,
  /** mani, rispetto alla spalla: A = braccio davanti (quello dell'arma), B = braccio dietro */
  mAx: 19, mAy: 20, mBx: 21, mBy: 22,
  /** rotazione dell'arma (0 = punta in avanti, − = in su) */
  arma: 23,
} as const;
export const N_PAR = 24;
export type Parametri = Float32Array;
export const nuoviParametri = (): Parametri => new Float32Array(N_PAR);

/** Stato che decide la posa: lo prepara la scena leggendo la sim (mai il contrario). */
export interface StatoPosa {
  mossa: MossaPirata;
  ciurma: IdCiurma;
  /** px percorsi a piedi (somma dei |Δx|): guida il passo */
  cammino: number;
  /** px percorsi su scala o liana (somma dei |Δy|): guida mani e piedi */
  salita: number;
  /** ms di gioco (respiro, dondoli) */
  tempo: number;
  /** ms dall'inizio della mossa */
  daMs: number;
  /** numero fisso del pirata: sfasa respiro e vezzi, così non si muovono tutti insieme */
  sfasa: number;
  /** tiene l'arma e mira: alzo in radianti rispetto a dove guarda (+ = in su) e potenza 0..1 */
  mira: { alzo: number; potenza: number; arma: ArmaPosa } | null;
  /** ms dall'ultimo sparo, dall'ultimo colpo subito, dall'ultimo atterraggio (−1 = niente) */
  sparo: number;
  colpito: number;
  atterrato: number;
  /** in aria perché l'ha sbalzato un colpo */
  sbalzato: boolean;
  /** i piedi (o la schiena) toccano terra: con la mossa 'aTerra' distingue il volo dopo il colpo dalla schiena a terra */
  suolo: boolean;
  /** a 0 PV: seduto a terra col cappello in mano, aspetta la lapide */
  ko: boolean;
  /** morte: avanzamento 0..1 (−1 = vivo); annegato = affonda invece di sparire in una nuvola */
  morte: number;
  annegato: boolean;
}

/** il cannone a mano sta sotto il braccio, a questo punto rispetto alla spalla; le altre armi nella mano A */
const CANNONE_FIANCO = { x: 0.4, y: 2.8 };
const TAU = Math.PI * 2;
const frac = (x: number) => x - Math.floor(x);
const morbido = (t: number) => t * t * (3 - 2 * t);
const tra = (a: number, b: number, t: number) => a + (b - a) * t;
const stringi = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/**
 * DA BUTTARE quando la sim della Fase 1 scrive `Pirata.mossa` (P1-contratti §4): finché il campo manca la mossa
 * si ricava da `aTerra`, `vx`, `vy`, `appeso`. La camminata della sim di oggi sposta `x` senza toccare `vx`,
 * quindi la velocità a piedi è quella misurata dal disegno (`velX`, px al secondo).
 */
export function mossaDaStato(
  p: { aTerra: boolean; vx: number; vy: number; appeso: number; mossa?: MossaPirata },
  velX: number, appiglio: TipoAppiglio | null,
): MossaPirata {
  if (p.mossa) return p.mossa;
  if (p.appeso >= 0) return appiglio === 'liana' ? 'liana' : 'scala';
  if (!p.aTerra) return p.vy < 0 ? 'salto' : 'caduta';
  const v = Math.max(Math.abs(velX), Math.abs(p.vx) * TICK_AL_SECONDO);
  if (v < 6) return 'fermo';
  return v > ((BIL.movimento.passoVel + BIL.movimento.corsaVel) / 2) * TICK_AL_SECONDO ? 'corsa' : 'passo';
}

// ─── 1. Pose ──────────────────────────────────────────────────────────────────────────────────────

function base(o: Parametri): void {
  o.fill(0);
  o[PAR.sx] = 1; o[PAR.sy] = 1;
  o[PAR.ancaY] = -S.anca;
  o[PAR.pAx] = 2.4; o[PAR.pBx] = -2.2;
  o[PAR.mAx] = 1.2; o[PAR.mAy] = 9.7;
  o[PAR.mBx] = -1.6; o[PAR.mBy] = 9.5;
  o[PAR.busto] = 0.03;
}

/** Spalla secondo i parametri (serve a chi vuole le mani in un punto preciso: pioli, corda, bordo). */
function spalla(o: Parametri): { x: number; y: number } {
  const b = o[PAR.busto], l = S.busto - S.spalla;
  return { x: o[PAR.ancaX] + Math.sin(b) * l, y: o[PAR.ancaY] - Math.cos(b) * l };
}
/** mette la mano (A o B) in un punto del corpo, dato rispetto ai piedi */
function manoIn(o: Parametri, ix: number, x: number, y: number): void {
  const s = spalla(o);
  o[ix] = x - s.x; o[ix + 1] = y - s.y;
}

function riposo(o: Parametri, st: StatoPosa): void {
  const r = Math.sin(st.tempo / 520 + st.sfasa * 1.7);
  o[PAR.ancaY] += 0.35 + 0.35 * r;
  o[PAR.busto] += ANDATURA[st.ciurma].busto + 0.012 * r;
  o[PAR.mAy] -= 0.25 * r; o[PAR.mBy] -= 0.25 * r;
  o[PAR.cappY] = -0.2 * r;
  // vezzi (animazione.md §8): uno ogni 6 s circa per 1,4 s; ogni pirata ha il suo, sfasato
  const giro = 6200, t = (st.tempo + st.sfasa * 1730) % giro;
  if (t < 1400) {
    const k = Math.sin((t / 1400) * Math.PI);
    switch (Math.abs(st.sfasa) % 3) {
      case 0: // si guarda in giro
        o[PAR.testa] += Math.sin((t / 1400) * TAU) * 0.32;
        break;
      case 1: // picchietta il piede
        o[PAR.pArot] = -0.45 * k * (0.5 + 0.5 * Math.sin(t / 55));
        o[PAR.pAx] += 1.2 * k;
        break;
      default: // mano sul fianco e petto in fuori
        o[PAR.mAx] = tra(o[PAR.mAx], 3.4, k); o[PAR.mAy] = tra(o[PAR.mAy], 6.2, k);
        o[PAR.busto] -= 0.08 * k;
        break;
    }
  }
}

/** Un piede nel ciclo del passo: u 0..1 (0 = tallone a terra davanti). */
function piede(o: Parametri, ix: number, u: number, ampio: number, alto: number, corsa: boolean): void {
  const appoggio = corsa ? 0.38 : 0.52;
  let x: number, y = 0, rot = 0;
  if (u < appoggio) {
    const k = u / appoggio;
    x = ampio * (1 - 2 * k);
    // arriva di tallone, spinge di punta
    if (k < 0.18) rot = -0.32 * (1 - k / 0.18);
    else if (k > 0.68) rot = (corsa ? 0.75 : 0.5) * ((k - 0.68) / 0.32);
  } else {
    const w = (u - appoggio) / (1 - appoggio);
    x = ampio * (-1 + 2 * morbido(w));
    y = -alto * Math.sin(Math.PI * Math.min(1, w * 1.08));
    rot = tra(corsa ? 0.9 : 0.5, -0.32, morbido(w));
    // in corsa il piede dietro scalcia in alto
    if (corsa) y -= 2.2 * Math.sin(Math.PI * Math.min(1, w * 1.6));
  }
  o[ix] = x; o[ix + 1] = y; o[ix + 2] = rot;
}

function passo(o: Parametri, st: StatoPosa, corsa: boolean): void {
  const g = ANDATURA[st.ciurma];
  const f = st.cammino / CICLO_PASSO_PX;
  const marcia = st.ciurma === 'marina' && !corsa;
  piede(o, PAR.pAx, frac(f), corsa ? 7.8 : 5.2, (corsa ? 5 : 3) * (marcia ? 1.5 : 1), corsa);
  piede(o, PAR.pBx, frac(f + 0.5), corsa ? 7.8 : 5.2, (corsa ? 5 : 3) * (marcia ? 1.5 : 1), corsa);
  const s = Math.sin(TAU * f), c = Math.cos(TAU * f);
  // 0 quando un piede tocca terra, 1 a metà appoggio: il corpo scende a ogni passo
  const su = 0.5 - 0.5 * Math.cos(2 * TAU * f);
  o[PAR.ancaY] = -S.anca + (corsa ? 2.2 : 1.2) - (corsa ? 1.8 : 1.1) * g.molleggio * su + g.zoppo * Math.max(0, s) * 0.9;
  const busto = g.busto + (corsa ? 0.3 : 0.07) + 0.075 * g.dondolo * s;
  o[PAR.busto] = busto;
  o[PAR.testa] = -busto * 0.55 + 0.03 * c;
  o[PAR.ancaX] = corsa ? 0.8 : 0.2;
  // le braccia vanno al contrario delle gambe: il piede A è avanti a f = 0, il braccio A è indietro
  const ampia = (corsa ? 1.05 : 0.55) * g.braccia;
  const lungo = corsa ? 8.0 : 9.6;
  const aA = -ampia * c, aB = ampia * c;
  o[PAR.mAx] = Math.sin(aA) * lungo + (corsa ? 1.6 : 0.4); o[PAR.mAy] = Math.cos(aA) * lungo * (corsa ? 0.72 : 1);
  o[PAR.mBx] = Math.sin(aB) * lungo + (corsa ? 1.2 : -0.4); o[PAR.mBy] = Math.cos(aB) * lungo * (corsa ? 0.72 : 1);
  o[PAR.cappY] = (corsa ? -0.9 : -0.5) * Math.sin(2 * TAU * f + 0.9);
  o[PAR.cappRot] = corsa ? -0.08 : 0;
  o[PAR.falda] = -(corsa ? 0.55 : 0.16) - 0.12 * s;
}

function frenata(o: Parametri): void {
  o[PAR.busto] = -0.3; o[PAR.testa] = 0.12;
  o[PAR.ancaY] = -S.anca + 1.6; o[PAR.ancaX] = -1.6;
  o[PAR.pAx] = 6; o[PAR.pArot] = -0.35; o[PAR.pBx] = 1.5;
  o[PAR.mAx] = 6.5; o[PAR.mAy] = 2.5; o[PAR.mBx] = 5; o[PAR.mBy] = 5;
  o[PAR.falda] = 0.35; o[PAR.cappY] = -0.8;
}

function salto(o: Parametri, st: StatoPosa): void {
  // stacco: 90 ms di spinta a gambe tese, poi gambe raccolte
  const k = morbido(Math.min(1, st.daMs / 110));
  o[PAR.busto] = 0.16; o[PAR.testa] = -0.14;
  o[PAR.pAx] = tra(1.5, 4.2, k); o[PAR.pAy] = tra(0.4, -4.2, k); o[PAR.pArot] = tra(0.6, -0.1, k);
  o[PAR.pBx] = tra(-2.5, -5.2, k); o[PAR.pBy] = tra(0.4, -1.4, k); o[PAR.pBrot] = tra(0.7, 0.75, k);
  o[PAR.mAx] = 4.8; o[PAR.mAy] = tra(2, -7.2, k);
  o[PAR.mBx] = -3.5; o[PAR.mBy] = tra(4, -6, k);
  o[PAR.cappY] = 0.6 * (1 - k); o[PAR.falda] = -0.3;
  o[PAR.sy] = 1 + 0.06 * (1 - k);
}

function caduta(o: Parametri, st: StatoPosa): void {
  o[PAR.busto] = -0.06; o[PAR.testa] = 0.1;
  o[PAR.pAx] = 3; o[PAR.pAy] = -1.6; o[PAR.pArot] = 0.3;
  o[PAR.pBx] = -3.4; o[PAR.pBy] = -0.6; o[PAR.pBrot] = 0.45;
  // caduta lunga: braccia a mulinello (animazione.md §3.4)
  const lunga = morbido(stringi((st.daMs - 300) / 200, 0, 1));
  const giro = st.tempo / 62;
  o[PAR.mAx] = tra(5.2, Math.cos(giro) * 9.4, lunga); o[PAR.mAy] = tra(-6.6, Math.sin(giro) * 9.4, lunga);
  o[PAR.mBx] = tra(-5.6, Math.cos(giro + 2.4) * 9.4, lunga); o[PAR.mBy] = tra(-6, Math.sin(giro + 2.4) * 9.4, lunga);
  o[PAR.cappY] = -2.2; o[PAR.cappRot] = -0.14; o[PAR.falda] = 0.5;
}

/** in aria dopo un colpo: braccia aperte, gambe che pedalano, il corpo gira piano */
function sbalzato(o: Parametri, st: StatoPosa): void {
  const g = st.tempo / 90;
  o[PAR.rot] = -0.5 + 0.25 * Math.sin(st.tempo / 260);
  o[PAR.busto] = -0.25; o[PAR.testa] = -0.2;
  o[PAR.pAx] = 3.5 + 2.5 * Math.sin(g); o[PAR.pAy] = -2.5 - 1.5 * Math.cos(g); o[PAR.pArot] = 0.2;
  o[PAR.pBx] = -1 - 2.5 * Math.sin(g); o[PAR.pBy] = -1.5 + 1.5 * Math.cos(g); o[PAR.pBrot] = 0.4;
  o[PAR.mAx] = 6.5; o[PAR.mAy] = -7; o[PAR.mBx] = -7.5; o[PAR.mBy] = -6;
  o[PAR.cappY] = -3; o[PAR.cappRot] = -0.35; o[PAR.falda] = 0.6;
}

function scala(o: Parametri, st: StatoPosa): void {
  const a = Math.sin(TAU * (st.salita / CICLO_SALITA_PX));
  o[PAR.ancaX] = -2.6; o[PAR.ancaY] = -S.anca + 1.8;
  o[PAR.busto] = 0.12; o[PAR.testa] = -0.22;
  // piedi sui pioli, uno su e uno giù, ginocchia in avanti
  o[PAR.pAx] = 1.6; o[PAR.pAy] = -1.4 - 2.6 * a; o[PAR.pArot] = 0.1;
  o[PAR.pBx] = 1.0; o[PAR.pBy] = -1.4 + 2.6 * a; o[PAR.pBrot] = 0.1;
  // mani sui pioli sopra la testa, alternate ai piedi
  const s = spalla(o);
  manoIn(o, PAR.mAx, 3.0, s.y - 5.6 + 2.8 * a);
  manoIn(o, PAR.mBx, 2.6, s.y - 5.6 - 2.8 * a);
  o[PAR.cappY] = -0.3 * Math.abs(a); o[PAR.falda] = 0.12 + 0.08 * a;
}

function liana(o: Parametri, st: StatoPosa): void {
  const a = Math.sin(TAU * (st.salita / CICLO_SALITA_PX));
  o[PAR.rot] = 0.05 * Math.sin(st.tempo / 420 + st.sfasa);
  o[PAR.ancaX] = -2.4; o[PAR.ancaY] = -S.anca + 2.6;
  o[PAR.busto] = 0.2; o[PAR.testa] = -0.3;
  // piedi chiusi sulla corda, ginocchia larghe
  o[PAR.pAx] = 1.2; o[PAR.pAy] = -2.8 - 1.2 * a; o[PAR.pArot] = 0.55;
  o[PAR.pBx] = 0.6; o[PAR.pBy] = -1.4 + 1.2 * a; o[PAR.pBrot] = 0.7;
  const s = spalla(o);
  manoIn(o, PAR.mAx, 1.4, s.y - 7.6 + 2.4 * a);
  manoIn(o, PAR.mBx, 1.0, s.y - 6.0 - 2.4 * a);
  o[PAR.falda] = 0.3; o[PAR.cappY] = -0.4;
}

/** si issa su un muretto: mani sul bordo, una gamba su (BIL.movimento.scavalcoTick) */
function scavalco(o: Parametri, st: StatoPosa): void {
  const durata = (BIL.movimento.scavalcoTick * 1000) / TICK_AL_SECONDO;
  const k = morbido(stringi(st.daMs / durata, 0, 1));
  o[PAR.busto] = tra(0.55, 0.2, k); o[PAR.testa] = -0.25;
  o[PAR.ancaX] = tra(-1.5, 1, k); o[PAR.ancaY] = -S.anca + tra(3, 0.5, k);
  o[PAR.pAx] = tra(3, 5.5, k); o[PAR.pAy] = tra(-2, -6.5, k) * (1 - k * 0.6); o[PAR.pArot] = -0.2;
  o[PAR.pBx] = -3; o[PAR.pBy] = 0; o[PAR.pBrot] = 0.5 * k;
  o[PAR.mAx] = 7.5; o[PAR.mAy] = tra(1, 5.5, k);
  o[PAR.mBx] = 6.5; o[PAR.mBy] = tra(2, 6.5, k);
  o[PAR.falda] = -0.25; o[PAR.cappY] = -0.5;
}

/** giù per il pendio seduto all'indietro, piedi avanti, braccia in aria */
function scivolata(o: Parametri, st: StatoPosa): void {
  const t = Math.sin(st.tempo / 70);
  o[PAR.busto] = -0.42; o[PAR.testa] = 0.2;
  o[PAR.ancaX] = -2.5; o[PAR.ancaY] = -6.5;
  o[PAR.pAx] = 6.5; o[PAR.pAy] = -0.6; o[PAR.pArot] = -0.5;
  o[PAR.pBx] = 4.2; o[PAR.pBy] = 0; o[PAR.pBrot] = -0.3;
  o[PAR.mAx] = 2.5 + 0.6 * t; o[PAR.mAy] = -8.6; o[PAR.mBx] = -5.5; o[PAR.mBy] = -6.5 + 0.6 * t;
  o[PAR.cappY] = -1.6 + 0.3 * t; o[PAR.cappRot] = -0.2; o[PAR.falda] = 0.9;
}

/** appeso al ciglio dopo il salvataggio: braccia tese in su, gambe che penzolano */
function bordo(o: Parametri, st: StatoPosa): void {
  const t = Math.sin(st.tempo / 240);
  o[PAR.busto] = 0.05 + 0.04 * t; o[PAR.testa] = -0.35;
  o[PAR.pAx] = 1.5 + 1.2 * t; o[PAR.pAy] = 0.6; o[PAR.pArot] = 0.5;
  o[PAR.pBx] = -1.2 + 1.4 * t; o[PAR.pBy] = 0.2; o[PAR.pBrot] = 0.6;
  o[PAR.mAx] = 2.6; o[PAR.mAy] = -10; o[PAR.mBx] = 1.6; o[PAR.mBy] = -10;
  o[PAR.cappY] = -0.5; o[PAR.falda] = 0.2 + 0.1 * t;
}

/** steso sulla schiena dopo un colpo (si rialza da solo: lo decide la sim) */
function steso(o: Parametri, st: StatoPosa): void {
  o[PAR.rot] = -Math.PI / 2; o[PAR.rx] = 9; o[PAR.ry] = 10;
  o[PAR.busto] = 0.05; o[PAR.testa] = 0.15;
  o[PAR.pAx] = 2.2; o[PAR.pAy] = 0.4; o[PAR.pArot] = -0.5;
  o[PAR.pBx] = -1.2; o[PAR.pBy] = 0.2; o[PAR.pBrot] = -0.3;
  o[PAR.mAx] = 6; o[PAR.mAy] = -6.5; o[PAR.mBx] = -4; o[PAR.mBy] = 8;
  // stelline: la testa ciondola
  o[PAR.testa] += 0.1 * Math.sin(st.tempo / 180);
  o[PAR.cappX] = -3; o[PAR.cappY] = -2.5; o[PAR.cappRot] = -0.9;
}

/** a 0 PV: seduto a terra, testa bassa, cappello in mano (animazione.md §3.7) */
function ko(o: Parametri, st: StatoPosa): void {
  const r = Math.sin(st.tempo / 600 + st.sfasa);
  o[PAR.ancaX] = -2.5; o[PAR.ancaY] = -4.6;
  o[PAR.busto] = 0.42 + 0.03 * r; o[PAR.testa] = 0.5;
  o[PAR.pAx] = 6.8; o[PAR.pAy] = -0.2; o[PAR.pArot] = -0.75;
  o[PAR.pBx] = 5; o[PAR.pBy] = 0; o[PAR.pBrot] = -0.5;
  o[PAR.mAx] = 5.2; o[PAR.mAy] = 6.4; o[PAR.mBx] = 3.5; o[PAR.mBy] = 7.5;
  // il cappello sta in grembo, tra le mani
  o[PAR.cappX] = 3.2; o[PAR.cappY] = 12.8; o[PAR.cappRot] = -0.25;
  o[PAR.falda] = 1.1;
}

function morte(o: Parametri, st: StatoPosa): void {
  const k = stringi(st.morte, 0, 1);
  if (st.annegato) {
    // braccia in alto, affonda (la scena lo fa svanire)
    o[PAR.ry] = 30 * k;
    o[PAR.mAx] = 3 + Math.sin(st.tempo / 60) * 1.2; o[PAR.mAy] = -9.6;
    o[PAR.mBx] = -3 - Math.sin(st.tempo / 60) * 1.2; o[PAR.mBy] = -9.6;
    o[PAR.testa] = -0.35; o[PAR.cappY] = -6 * k; o[PAR.cappRot] = 0.4 * k;
    return;
  }
  // braccia e gambe aperte, un giro intero rimpicciolendo, il cappello vola via
  o[PAR.rot] = -k * TAU; o[PAR.ry] = -9 * Math.sin(k * Math.PI) - 4 * k;
  o[PAR.sx] = o[PAR.sy] = 1 - k * k;
  o[PAR.pAx] = 5.5; o[PAR.pAy] = -1.5; o[PAR.pBx] = -5.5; o[PAR.pBy] = -1.5;
  o[PAR.mAx] = 8; o[PAR.mAy] = -5; o[PAR.mBx] = -8; o[PAR.mBy] = -5;
  o[PAR.cappY] = -16 * k; o[PAR.cappX] = -6 * k; o[PAR.cappRot] = -2.4 * k;
}

/** Braccio dell'arma: sopra qualunque posa, il braccio A porta l'arma verso la mira. */
function braccioArmato(o: Parametri, m: NonNullable<StatoPosa['mira']>, carica: number): void {
  const dx = Math.cos(m.alzo), dy = -Math.sin(m.alzo);
  switch (m.arma) {
    case 'cannone': // bocca da fuoco sotto il braccio (il viso resta libero): una mano dietro, l'altra regge la canna
      o[PAR.mAx] = CANNONE_FIANCO.x - 0.9 - dx * 3; o[PAR.mAy] = CANNONE_FIANCO.y - dy * 3 + 1.2;
      o[PAR.mBx] = CANNONE_FIANCO.x + 0.9 + dx * 6.5; o[PAR.mBy] = CANNONE_FIANCO.y + dy * 6.5 + 1.6;
      o[PAR.arma] = -m.alzo;
      break;
    case 'pistola': // a una mano, braccio teso
      o[PAR.mAx] = dx * (9.9 - 1.4 * carica); o[PAR.mAy] = dy * (9.9 - 1.4 * carica);
      o[PAR.arma] = -m.alzo;
      break;
    case 'granata': // braccio caricato dietro la testa, l'altro indica il bersaglio
      o[PAR.mAx] = -4.2 - 2.4 * carica; o[PAR.mAy] = -5.6 + 1.4 * carica;
      o[PAR.mBx] = dx * 9.2; o[PAR.mBy] = dy * 9.2;
      o[PAR.arma] = -0.4;
      break;
    default: // sciabola alta, pronta al fendente
      o[PAR.mAx] = 4.6; o[PAR.mAy] = -6.2;
      o[PAR.arma] = -1.25;
      break;
  }
}

/** Fermo con l'arma: gambe larghe, peso indietro, il corpo si carica con la potenza (animazione.md §3.6). */
function mira(o: Parametri, st: StatoPosa): void {
  const m = st.mira!, c = stringi(m.potenza, 0, 1);
  const r = Math.sin(st.tempo / 520 + st.sfasa * 1.7);
  o[PAR.pAx] = 4.6 + 0.8 * c; o[PAR.pBx] = -4.2 - 1.2 * c;
  o[PAR.ancaX] = -0.5 - 1.5 * c; o[PAR.ancaY] = -S.anca + 1.0 + 1.5 * c + 0.2 * r;
  o[PAR.busto] = -0.03 - 0.2 * c - 0.14 * Math.sin(m.alzo);
  o[PAR.testa] = -0.32 * m.alzo - o[PAR.busto] * 0.5;
  o[PAR.mBx] = -2.6; o[PAR.mBy] = 7.6;
  o[PAR.falda] = 0.2 * c;
  braccioArmato(o, m, c);
}

/** Rinculo (o fendente) dopo lo sparo: sopra la posa, per 260 ms. Solo grafica: il pirata non si sposta. */
function rinculo(o: Parametri, st: StatoPosa): void {
  if (st.sparo < 0 || st.sparo >= 260 || !st.mira) return;
  const m = st.mira;
  if (m.arma === 'sciabola') {
    // fendente: dall'alto in avanti e in basso in 150 ms, poi resta giù
    const k = morbido(Math.min(1, st.sparo / 150));
    o[PAR.mAx] = tra(4.6, 8.8, k); o[PAR.mAy] = tra(-6.2, 3.6, k);
    o[PAR.arma] = tra(-1.5, 0.9, k);
    o[PAR.busto] += 0.35 * k; o[PAR.ancaX] += 2 * k;
    return;
  }
  const k = (1 - st.sparo / 260) ** 2;
  const dx = Math.cos(m.alzo), dy = -Math.sin(m.alzo);
  if (m.arma === 'granata') {
    // lancio: il braccio passa da dietro la testa a teso in avanti
    const l = morbido(Math.min(1, st.sparo / 120));
    o[PAR.mAx] = tra(o[PAR.mAx], dx * 9.6, l); o[PAR.mAy] = tra(o[PAR.mAy], dy * 9.6, l);
    o[PAR.busto] += 0.3 * l;
    return;
  }
  o[PAR.rx] -= dx * 4.5 * k; o[PAR.ry] -= dy * 2 * k;
  o[PAR.busto] -= 0.3 * k; o[PAR.testa] += 0.12 * k;
  o[PAR.cappY] -= 3 * k; o[PAR.cappRot] -= 0.25 * k;
  o[PAR.arma] -= 0.42 * k;
}

/** Colpo subito: braccia per aria e schiena indietro per 300 ms, sopra la posa. */
function colpo(o: Parametri, st: StatoPosa): void {
  if (st.colpito < 0 || st.colpito >= 300) return;
  const k = (1 - st.colpito / 300) ** 1.5;
  o[PAR.busto] = tra(o[PAR.busto], -0.45, k); o[PAR.testa] = tra(o[PAR.testa], -0.3, k);
  o[PAR.mAx] = tra(o[PAR.mAx], -2.5, k); o[PAR.mAy] = tra(o[PAR.mAy], -8.6, k);
  o[PAR.mBx] = tra(o[PAR.mBx], -7.5, k); o[PAR.mBy] = tra(o[PAR.mBy], -5, k);
  o[PAR.cappY] -= 3.2 * k; o[PAR.cappRot] -= 0.4 * k;
  // tremolio di 3 px a scatti di 30 ms (m1-ritmo §4)
  if (st.colpito < 250) o[PAR.rx] += Math.floor(st.colpito / 30) % 2 ? 2.2 * k : -2.2 * k;
}

/** Atterraggio: ginocchia piegate e braccia larghe per 180 ms, sopra la posa. */
function atterra(o: Parametri, st: StatoPosa): void {
  if (st.atterrato < 0 || st.atterrato >= 180) return;
  const k = Math.sin(Math.min(1, st.atterrato / 180 + 0.25) * Math.PI) ** 1.2;
  o[PAR.ancaY] += 4.2 * k;
  o[PAR.busto] += 0.22 * k;
  o[PAR.pAx] += 1.6 * k; o[PAR.pBx] -= 1.6 * k;
  o[PAR.mAx] = tra(o[PAR.mAx], 6.2, k); o[PAR.mAy] = tra(o[PAR.mAy], 4.4, k);
  o[PAR.mBx] = tra(o[PAR.mBx], -6.6, k); o[PAR.mBy] = tra(o[PAR.mBy], 4.4, k);
  o[PAR.cappY] += 1.1 * k;
  o[PAR.sx] *= 1 + 0.07 * k; o[PAR.sy] *= 1 - 0.07 * k;
}

/** Parametri della posa per lo stato dato. Scrive in `o` e lo restituisce. */
export function bersaglio(st: StatoPosa, o: Parametri = nuoviParametri()): Parametri {
  base(o);
  if (st.morte >= 0) { morte(o, st); return o; }
  if (st.ko) { ko(o, st); return o; }
  const inAria = st.mossa === 'salto' || st.mossa === 'caduta';
  if (inAria && st.sbalzato) { sbalzato(o, st); return o; }
  switch (st.mossa) {
    case 'passo': passo(o, st, false); break;
    case 'corsa': passo(o, st, true); break;
    case 'frenata': frenata(o); break;
    case 'salto': salto(o, st); break;
    case 'caduta': caduta(o, st); break;
    case 'scavalco': scavalco(o, st); break;
    case 'scivolata': scivolata(o, st); break;
    case 'bordo': bordo(o, st); break;
    case 'scala': scala(o, st); break;
    case 'liana': liana(o, st); break;
    // 'aTerra' vale dal colpo (anche in volo) fino a mezzo secondo dopo che si è fermato: prima vola, poi sta steso
    case 'aTerra': if (st.suolo) steso(o, st); else sbalzato(o, st); return o;
    default: if (st.mira) mira(o, st); else riposo(o, st); break;
  }
  // in movimento l'arma resta in mano: solo il braccio A la porta (appeso si mira col braccio libero)
  if (st.mira && st.mossa !== 'fermo' && st.mossa !== 'scavalco' && st.mossa !== 'bordo') braccioArmato(o, st.mira, 0);
  rinculo(o, st);
  atterra(o, st);
  colpo(o, st);
  return o;
}

// ─── 2. Sfumatura ─────────────────────────────────────────────────────────────────────────────────

/** Da una posa all'altra in `durata` ms (SFUMA_MS; di più per rialzarsi): `out = da → a` secondo i ms passati dal cambio. */
export function sfuma(da: Parametri, a: Parametri, ms: number, out: Parametri, durata: number = SFUMA_MS): Parametri {
  const k = ms >= durata ? 1 : morbido(Math.max(0, ms) / durata);
  for (let i = 0; i < N_PAR; i++) out[i] = da[i] + (a[i] - da[i]) * k;
  return out;
}

// ─── 3. Ossa ──────────────────────────────────────────────────────────────────────────────────────

/** Pezzi del pupazzo, nell'ordine in cui si disegnano (dietro → davanti). */
export const OSSA = [
  'braccioB', 'avambraccioB', 'cosciaB', 'stincoB', 'piedeB', 'falda', 'cosciaA', 'stincoA', 'piedeA',
  'busto', 'testa', 'cappello', 'arma', 'braccioA', 'avambraccioA',
] as const;
export type Osso = (typeof OSSA)[number];
export const N_OSSA = OSSA.length;
const IX = Object.fromEntries(OSSA.map((n, i) => [n, i * 3])) as Record<Osso, number>;
export const indiceOsso = (n: Osso): number => IX[n];

/** Ossa risolte: per ognuna x, y e rotazione (radianti, come Pixi: + = senso orario a schermo). */
export interface Posa {
  ossa: Float32Array;
  /** corpo intero */
  rx: number; ry: number; rot: number; sx: number; sy: number;
  /** punta dell'arma e direzione, nel sistema del pupazzo (per fumo e lampo alla bocca) */
  boccaX: number; boccaY: number;
}
export const nuovaPosa = (): Posa => ({ ossa: new Float32Array(N_OSSA * 3), rx: 0, ry: 0, rot: 0, sx: 1, sy: 1, boccaX: 0, boccaY: 0 });

/** dove sta la testa rispetto al collo e il cappello rispetto alla testa (nel sistema della testa) */
export const TESTA = { centroX: 0.4, centroY: -6, cappelloX: 0.2, cappelloY: -10.4 } as const;
/** lunghezza dall'impugnatura alla bocca, per arma */
export const CANNA: Record<ArmaPosa, number> = { cannone: 13.5, pistola: 10.5, granata: 0, sciabola: 15 };

function osso(o: Float32Array, i: number, x: number, y: number, rot: number): void {
  o[i] = x; o[i + 1] = y; o[i + 2] = rot;
}
/** rotazione Pixi di un pezzo disegnato verso il basso (+y) che va da (ax, ay) a (bx, by) */
const verso = (ax: number, ay: number, bx: number, by: number) => Math.atan2(ax - bx, by - ay);

/**
 * Cinematica inversa a due ossa: da S a T con ossa lunghe l1 e l2. `piega` = +1 gomito (l'avambraccio si chiude
 * in avanti), −1 ginocchio (lo stinco si chiude all'indietro). Scrive il giunto di mezzo in `g`.
 */
function ik(sx: number, sy: number, tx: number, ty: number, l1: number, l2: number, piega: 1 | -1, g: { x: number; y: number; tx: number; ty: number }): void {
  let dx = tx - sx, dy = ty - sy;
  let d = Math.hypot(dx, dy);
  const max = l1 + l2 - 0.02, min = Math.abs(l1 - l2) + 0.02;
  if (d < 1e-4) { dx = 0; dy = 1; d = 1e-4; }
  const dd = stringi(d, min, max);
  // bersaglio fuori portata: l'arto si tende verso di lui e finisce dove arriva
  g.tx = sx + (dx / d) * dd; g.ty = sy + (dy / d) * dd;
  const a = Math.acos(stringi((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
  const b = Math.atan2(dy, dx) + piega * a;
  g.x = sx + Math.cos(b) * l1; g.y = sy + Math.sin(b) * l1;
}
const G = { x: 0, y: 0, tx: 0, ty: 0 };

function gamba(o: Float32Array, coscia: Osso, stinco: Osso, piede: Osso, ax: number, ay: number, px: number, py: number, rot: number): void {
  // la suola non buca il terreno: con la punta in giù (o in su) la caviglia si alza
  const alza = rot > 0 ? Math.sin(rot) * 3.6 : -Math.sin(rot) * 1.8;
  ik(ax, ay, px, py - S.caviglia - alza, S.coscia, S.stinco, -1, G);
  osso(o, IX[coscia], ax, ay, verso(ax, ay, G.x, G.y));
  osso(o, IX[stinco], G.x, G.y, verso(G.x, G.y, G.tx, G.ty));
  osso(o, IX[piede], G.tx, G.ty, rot);
}

function braccio(o: Float32Array, su: Osso, giu: Osso, sx: number, sy: number, mx: number, my: number): { x: number; y: number } {
  ik(sx, sy, sx + mx, sy + my, S.braccio, S.avambraccio, 1, G);
  osso(o, IX[su], sx, sy, verso(sx, sy, G.x, G.y));
  osso(o, IX[giu], G.x, G.y, verso(G.x, G.y, G.tx, G.ty));
  return { x: G.tx, y: G.ty };
}

/** Parametri → ossa. `arma` dice dove si aggancia l'arma (null = nessuna: l'osso resta sulla mano A). */
export function risolvi(p: Parametri, arma: ArmaPosa | null, out: Posa = nuovaPosa()): Posa {
  const o = out.ossa;
  out.rx = p[PAR.rx]; out.ry = p[PAR.ry]; out.rot = p[PAR.rot]; out.sx = p[PAR.sx]; out.sy = p[PAR.sy];
  const ax = p[PAR.ancaX], ay = p[PAR.ancaY], b = p[PAR.busto];
  const sb = Math.sin(b), cb = Math.cos(b);
  const colloX = ax + sb * S.busto, colloY = ay - cb * S.busto;
  const spX = ax + sb * (S.busto - S.spalla), spY = ay - cb * (S.busto - S.spalla);

  osso(o, IX.falda, ax, ay, p[PAR.falda]);
  osso(o, IX.busto, ax, ay, b);
  const t = p[PAR.testa], st = Math.sin(t), ct = Math.cos(t);
  osso(o, IX.testa, colloX, colloY, t);
  osso(o, IX.cappello,
    colloX + TESTA.cappelloX * ct - TESTA.cappelloY * st + p[PAR.cappX],
    colloY + TESTA.cappelloX * st + TESTA.cappelloY * ct + p[PAR.cappY],
    t + p[PAR.cappRot]);

  gamba(o, 'cosciaA', 'stincoA', 'piedeA', ax + S.ancaLarga, ay, p[PAR.pAx], p[PAR.pAy], p[PAR.pArot]);
  gamba(o, 'cosciaB', 'stincoB', 'piedeB', ax - S.ancaLarga, ay, p[PAR.pBx], p[PAR.pBy], p[PAR.pBrot]);

  braccio(o, 'braccioB', 'avambraccioB', spX - 0.9, spY, p[PAR.mBx], p[PAR.mBy]);
  const mano = braccio(o, 'braccioA', 'avambraccioA', spX + 0.9, spY, p[PAR.mAx], p[PAR.mAy]);
  const r = p[PAR.arma];
  const gx = arma === 'cannone' ? spX + CANNONE_FIANCO.x : mano.x;
  const gy = arma === 'cannone' ? spY + CANNONE_FIANCO.y : mano.y;
  osso(o, IX.arma, gx, gy, r);
  const canna = arma ? CANNA[arma] : 0;
  out.boccaX = gx + Math.cos(r) * canna; out.boccaY = gy + Math.sin(r) * canna;
  return out;
}

/** portata di gamba e braccio (per i test) */
export const PORTATA = { gamba: GAMBA, braccio: BRACCIO } as const;
