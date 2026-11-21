// Spawn equi (06 §4) e regole anti-frustrazione (06 §7). Ogni spawn è il CENTRO DEI PIEDI del pirata.
// Lo stesso codice serve a scegliere gli spawn e a validarli (valida.ts). Codice puro e deterministico.

import { MATERIALE, type Punto } from '../../core/tipi';
import { BIL, TICK_AL_SECONDO } from '../../contenuti/bilanciamento';
import { ARMA } from '../../contenuti/armi';
import { coseno, seno } from '../../core/trig';
import { camminata, lineaLibera, solido, vola } from './analisi';
import { MONDO, REGOLE } from './parametri';

const { w: W } = MONDO;
const MEZZA_CAPSULA = BIL.pirata.capsulaLarghezza / 2;
const ALTEZZA_CAPSULA = BIL.pirata.capsulaAltezza;

/** Zona di sbarco di un lato in colonne [da, a]. `aDestra` = il lato sta a destra. */
export function zona(aDestra: boolean): [number, number] {
  const da = Math.round(W * REGOLE.zonaDa), a = Math.round(W * REGOLE.zonaA);
  return aDestra ? [W - 1 - a, W - 1 - da] : [da, a];
}

/** Petto del pirata (centro della capsula) dato il centro dei piedi. */
export function petto(p: Punto): Punto {
  return { x: p.x, y: p.y - ALTEZZA_CAPSULA / 2 };
}

/** Velocità (px/tick) di una spinta: colpo diretto di cannone (col +10% del Teschio, il caso peggiore) e sciabola. */
export function spinte(): { cannone: number; sciabola: number; angoloSciabola: number } {
  const t = BIL.tratti;
  const dannoCannone = Math.floor(ARMA.cannone.danno * (1 + t.teschioBonusDanno));
  return {
    cannone: dannoCannone * BIL.fisica.spintaPerDanno,
    sciabola: (ARMA.sciabola.spintaFissa ?? 0) / TICK_AL_SECONDO,
    angoloSciabola: (ARMA.sciabola.angoloSpinta ?? 45) * 2,
  };
}

/** Dove finisce un pirata spinto da (piedi) con velocità v e angolo a (mezzi gradi) verso dir. */
export function spinto(m: Uint8Array, mare: number, p: Punto, v: number, a: number, dir: -1 | 1) {
  return vola(m, mare, p.x, p.y - 1, dir * coseno(a) * v, -seno(a) * v);
}

export interface Posto {
  x: number;
  y: number;
  /** la sciabola lo butta in mare: vale solo se nessun nemico è raggiungibile a piedi (06 §7.2) */
  sciabolaInMare: boolean;
}

/**
 * Controlli locali di un posto (06 §4 requisiti, §7.1 sporgenze, §7.2 spinte). Restituisce il posto o il motivo
 * dello scarto. `x` è la colonna del centro.
 */
export function controllaPosto(m: Uint8Array, sup: Int32Array, mare: number, x: number): Posto | string {
  const r = REGOLE.pianoLarghezza / 2;
  if (x - r < 0 || x + r >= W) return 'fuori';
  // piedi sulla colonna più alta sotto la capsula
  let y = sup[x];
  for (let c = x - MEZZA_CAPSULA; c <= x + MEZZA_CAPSULA; c++) y = Math.min(y, sup[c]);
  if (y > mare - REGOLE.sopraMare) return 'vicino al mare';
  // piano largo 32 px con pendenza ≤ 15°
  let lo = sup[x], hi = sup[x];
  for (let c = x - r; c <= x + r; c++) { lo = Math.min(lo, sup[c]); hi = Math.max(hi, sup[c]); }
  if (hi - lo > REGOLE.pianoDislivelloMax) return 'pendenza';
  // né ghiaccio né legno sotto i piedi
  for (let c = x - MEZZA_CAPSULA; c <= x + MEZZA_CAPSULA; c++) {
    const mat = m[sup[c] * W + c];
    if (sup[c] - y <= 2 && (mat === MATERIALE.ghiaccio || mat === MATERIALE.legno)) return 'ghiaccio o legno';
  }
  // solido sotto i piedi
  for (const c of [x - 4, x, x + 4]) {
    for (let k = 0; k < REGOLE.solidoSotto; k++) if (!solido(m, c, sup[c] + k)) return 'poco solido sotto';
  }
  // aria sopra la testa
  for (let c = x - MEZZA_CAPSULA; c <= x + MEZZA_CAPSULA; c++) {
    for (let yy = y - ALTEZZA_CAPSULA - REGOLE.ariaSopra; yy < y; yy++) if (solido(m, c, yy)) return 'poca aria sopra';
  }
  // niente sporgenze: 170 px di terra continua su ogni lato, oppure una parete alta ≥ 40 px
  for (const dir of [-1, 1] as const) {
    for (let k = 1; k <= REGOLE.sporgenza; k++) {
      const c = x + dir * k;
      if (c < 0 || c >= W || sup[c] >= mare) return 'sporgenza sul mare';
      if (sup[c] <= y - REGOLE.pareteMin) break;
    }
  }
  // spinte del primo turno: cannone diretto e sciabola nei due versi
  const sp = spinte();
  const p = { x, y };
  let sciabolaInMare = false;
  for (const dir of [-1, 1] as const) {
    if (spinto(m, mare, p, sp.cannone, 90, dir).tipo !== 'terra') return 'cannone lo butta in mare';
    if (spinto(m, mare, p, sp.sciabola, sp.angoloSciabola, dir).tipo !== 'terra') sciabolaInMare = true;
  }
  return { x, y, sciabolaInMare };
}

/** Tutti i posti validi di una zona, ogni `passo` colonne. */
export function postiValidi(m: Uint8Array, sup: Int32Array, mare: number, aDestra: boolean, passo = 8): Posto[] {
  const [da, a] = zona(aDestra);
  const out: Posto[] = [];
  for (let x = da; x <= a; x += passo) {
    const p = controllaPosto(m, sup, mare, x);
    if (typeof p !== 'string') out.push(p);
  }
  return out;
}

function distanza(a: Punto, b: Punto): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Distanza dal mare: dal piede al punto più vicino della superficie del mare (colonne con il fondo sotto il mare). */
export function distanzaMare(sup: Int32Array, mare: number, p: Punto): number {
  let best = Infinity;
  for (const dir of [-1, 1]) {
    for (let c = p.x; c >= 0 && c < W; c += dir) {
      if (sup[c] >= mare) {
        const dx = c - p.x, dy = mare - p.y;
        best = Math.min(best, Math.sqrt(dx * dx + dy * dy));
        break;
      }
    }
  }
  return best;
}

/** Un pirata in p può colpire almeno un nemico col cannone, senza vento (campionatore di 06 §7.5).
 *  Prima una griglia larga di angoli e potenze, poi, se serve, una fitta. */
export function puoColpire(m: Uint8Array, mare: number, p: Punto, nemici: Punto[]): boolean {
  const da = petto(p);
  const bersagli = nemici.map(petto);
  const raggio = ARMA.cannone.raggio * 0.8;
  const dir = bersagli.reduce((s, b) => s + (b.x - da.x), 0) >= 0 ? 1 : -1;
  const vMax = BIL.fisica.velocitaMaxProiettile;
  let xMin = Infinity, xMax = -Infinity;
  for (const b of bersagli) { xMin = Math.min(xMin, b.x - MEZZA_CAPSULA); xMax = Math.max(xMax, b.x + MEZZA_CAPSULA); }
  const tiro = (potenza: number, a: number): boolean => {
    const ang = dir === 1 ? a : 360 - a;
    const cx = coseno(ang), cy = -seno(ang);
    const v = (potenza / 100) * vMax;
    let diretto = false;
    const fine = vola(m, mare, da.x + cx * 12, da.y + cy * 12, cx * v, cy * v, (x, y) => {
      if (x < xMin || x > xMax) return false;
      for (const b of bersagli) {
        if (Math.abs(x - b.x) <= MEZZA_CAPSULA && Math.abs(y - b.y) <= ALTEZZA_CAPSULA / 2) { diretto = true; return true; }
      }
      return false;
    }, 400, 4);
    if (diretto) return true;
    if (fine.tipo === 'terra') for (const b of bersagli) if (distanza(fine, b) <= raggio) return true;
    return false;
  };
  for (let potenza = 40; potenza <= 100; potenza += 10) for (let a = 20; a <= 160; a += 10) if (tiro(potenza, a)) return true;
  for (let potenza = 30; potenza <= 100; potenza += 5) for (let a = 10; a <= 170; a += 4) if (tiro(potenza, a)) return true;
  return false;
}

/**
 * Controlli che dipendono dall'insieme degli spawn: distanze, equità (06 §4), sciabola e raggiungibilità (§7.2),
 * colpo possibile e collegamento (§7.5). `spawn` è [lato sinistro, lato destro] nella maschera così com'è.
 */
export function controllaInsieme(m: Uint8Array, sup: Int32Array, mare: number, posti: [Posto[], Posto[]], conColpi = true): string[] {
  const err: string[] = [];
  const [a, b] = posti;
  for (const [lato, nemici, nome] of [[a, b, 'sinistra'], [b, a, 'destra']] as const) {
    if (lato.length !== REGOLE.spawnPerLato) err.push(`${nome}: ${lato.length} spawn invece di ${REGOLE.spawnPerLato}`);
    for (let i = 0; i < lato.length; i++) {
      for (let j = i + 1; j < lato.length; j++) {
        if (distanza(lato[i], lato[j]) < REGOLE.distanzaCompagni) err.push(`${nome}: compagni a meno di ${REGOLE.distanzaCompagni} px`);
      }
      for (const n of nemici) if (distanza(lato[i], n) < REGOLE.distanzaNemici) err.push(`${nome}: nemico a meno di ${REGOLE.distanzaNemici} px`);
    }
  }
  if (err.length) return err;

  const media = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
  // equità
  const quota = [media(a.map((p) => p.y)), media(b.map((p) => p.y))];
  if (Math.abs(quota[0] - quota[1]) > REGOLE.equitaQuota) err.push(`equità: quote medie ${quota.map(Math.round).join(' / ')}`);
  const dm = [media(a.map((p) => distanzaMare(sup, mare, p))), media(b.map((p) => distanzaMare(sup, mare, p)))];
  if (Math.abs(dm[0] - dm[1]) > REGOLE.equitaDistanzaMare) err.push(`equità: distanza media dal mare ${dm.map(Math.round).join(' / ')}`);
  const linee = (lato: Posto[], nemici: Posto[]) =>
    media(lato.map((p) => nemici.filter((n) => lineaLibera(m, petto(p), petto(n))).length));
  const lt = [linee(a, b), linee(b, a)];
  if (Math.abs(lt[0] - lt[1]) > REGOLE.equitaLineaTiro) err.push(`equità: nemici in linea di tiro ${lt.join(' / ')}`);
  if (err.length) return err;

  // collegamento: tra gli spawn più lontani nessuna colonna di mare
  const xs = [...a, ...b].map((p) => p.x);
  for (let x = Math.min(...xs); x <= Math.max(...xs); x++) if (sup[x] >= mare) { err.push('mare tra i due lati'); break; }

  // sciabola: se butta in mare, nessun nemico deve essere raggiungibile a piedi in un turno
  if (REGOLE.sciabolaVieta) for (const [lato, nemici] of [[a, b], [b, a]] as const) {
    for (const p of lato) {
      if (!p.sciabolaInMare) continue;
      const [da, fino] = camminata(sup, mare, p.x, REGOLE.camminataTurno);
      if (nemici.some((n) => n.x >= da && n.x <= fino)) { err.push(`sciabola in mare da (${p.x}, ${p.y})`); break; }
    }
  }
  if (err.length || !conColpi) return err;

  for (const [lato, nemici] of [[a, b], [b, a]] as const) {
    for (const p of lato) if (!puoColpire(m, mare, p, nemici)) err.push(`da (${p.x}, ${p.y}) non si colpisce nessuno`);
  }
  return err;
}
