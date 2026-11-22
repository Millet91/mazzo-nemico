// Terreno dell'Isola tropicale: profilo procedurale da parametri, rumore 1D, grotte a metaball, strati, massi.
// Pipeline di 06 §1 corretta da 00 §2.2 (niente sagome a mano). Codice puro e deterministico.

import { MATERIALE } from '../../core/tipi';
import type { ConRng } from '../../core/rng';
import { casuale, intero, probabilita } from '../../core/rng';
import { ISOLA, MONDO } from './parametri';

const { w: W, h: H, cielo: CIELO, mare: MARE, fondale: FONDALE } = MONDO;

/** Rampa morbida 0..1 (smoothstep). */
function morbido(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

/** Rumore 1D a valori su reticolo, interpolato morbido: valori in [−1, 1]. */
function rumore1D(s: ConRng, passo: number): Float64Array {
  const nodi = Math.ceil(W / passo) + 2;
  const v = new Float64Array(nodi);
  for (let i = 0; i < nodi; i++) v[i] = casuale(s) * 2 - 1;
  const out = new Float64Array(W);
  for (let x = 0; x < W; x++) {
    const p = x / passo;
    const i = Math.floor(p);
    const t = morbido(p - i);
    out[x] = v[i] * (1 - t) + v[i + 1] * t;
  }
  return out;
}

export interface Sfera { x: number; y: number; r: number }

export interface TerrenoIsola {
  maschera: Uint8Array;
  /** quota del profilo (prima di grotte e massi), per gli strati */
  profilo: Int32Array;
  grotte: Sfera[][];
  massi: Sfera[];
}

/** Collina a campana polinomiale: altezza a nel centro, zero oltre la mezza larghezza. */
function campana(x: number, centro: number, mezza: number, a: number): number {
  const u = (x - centro) / mezza;
  if (u <= -1 || u >= 1) return 0;
  const k = 1 - u * u;
  return a * k * k;
}

/**
 * Profilo superiore (y della superficie per ogni colonna). Forma dell'isola (Lead design, 21/11/2026):
 * - per ogni lato: piccola spiaggia, riva verso il mare al massimo ~38°, orlo basso di 10-40 px (06 §7.3),
 *   poi la piana degli spawn;
 * - al centro 1 collina larga o 2 colline con una valle in mezzo, in posizione e altezza variabili col seme:
 *   fanno copertura tra le squadre e portano la massa che serve al riempimento.
 * I due lati partono dagli stessi numeri con piccole differenze: l'isola resta equa ma non è mai simmetrica.
 * Fuori dall'isola il fondo scende al fondale: ai bordi 0-64 e 1984-2048 c'è sempre acqua aperta.
 */
export function profilo(s: ConRng): Int32Array {
  const P = ISOLA;
  const base = {
    riva: intero(s, P.rivaMin, P.rivaMax),
    spiaggia: intero(s, P.spiaggiaMin, P.spiaggiaMax),
    qOrlo: intero(s, P.orloQuotaMin, P.orloQuotaMax),
    rivaPerQuota: intero(s, P.rivaPerQuotaMin, P.rivaPerQuotaMax) / 100,
    piana: intero(s, P.pianaMin, P.pianaMax),
    salita: intero(s, P.salitaMin, P.salitaMax),
  };
  const j = P.scartoLati;
  type Lato = { punti: [number, number][]; orlo: number; labbro: number; mezzoLabbro: number };
  const lato = (): Lato => {
    const riva = base.riva + intero(s, -j, j);
    const qSpiaggia = intero(s, 10, 25);
    const spiaggia = riva + base.spiaggia + intero(s, -j, j);
    const qOrlo = base.qOrlo + intero(s, -j, j);
    const orlo = spiaggia + Math.round((qOrlo - qSpiaggia) * base.rivaPerQuota);
    const qPiana = qOrlo + base.piana + intero(s, -j, j);
    const onda = Math.round(W * P.ondaA) + intero(s, -30, 30);
    return {
      punti: [
        [riva, -20],
        [spiaggia, qSpiaggia],
        [orlo, qOrlo],
        [orlo + intero(s, 40, 70), qPiana],
        // la piana sale piano verso l'interno (≤ ~12°): porta massa senza allungare la riva
        [onda, qPiana + base.salita + intero(s, -P.pianaOnda, P.pianaOnda)],
      ],
      orlo,
      labbro: intero(s, P.labbroMin, P.labbroMax),
      mezzoLabbro: intero(s, P.mezzoLabbroMin, P.mezzoLabbroMax),
    };
  };
  const sx = lato();
  const dxL = lato();
  const dx: [number, number][] = dxL.punti.map(([x, q]) => [W - 1 - x, q] as [number, number]).reverse();
  const orloD = W - 1 - dxL.orlo;
  const qCentro = (sx.punti[4][1] + dx[0][1]) / 2 + intero(s, -P.centroAbbassa, 10);
  const punti: [number, number][] = [...sx.punti, [Math.round(W / 2), Math.round(qCentro)], ...dx];

  // colline: una larga al centro, oppure due con una valle in mezzo
  const colline: { c: number; m: number; a: number }[] = [];
  if (probabilita(s, P.unaCollina)) {
    const a = intero(s, P.collinaUnaMin, P.collinaUnaMax);
    colline.push({ c: Math.round(W / 2) + intero(s, -30, 30), m: Math.max(intero(s, 220, 290), Math.round(a * 0.9)), a });
  } else {
    const d = intero(s, P.valleMin, P.valleMax);
    const a0 = intero(s, P.collinaDueMin, P.collinaDueMax);
    for (const v of [-1, 1]) {
      const a = a0 + intero(s, -j, j);
      colline.push({ c: Math.round(W / 2) + v * (d + intero(s, -20, 20)), m: Math.max(intero(s, 150, 210), Math.round(a * 0.8)), a });
    }
  }

  const passo = intero(s, P.rumorePassoMin, P.rumorePassoMax);
  const amp = intero(s, P.rumoreAmpMin, P.rumoreAmpMax);
  const r1 = rumore1D(s, passo);
  const r2 = rumore1D(s, Math.round(passo / 2));

  const rivaS = punti[0][0], rivaD = punti[punti.length - 1][0];
  const quota = new Float64Array(W);
  const colle = new Float64Array(W);
  for (let x = 0; x < W; x++) {
    if (x < rivaS || x > rivaD) {
      quota[x] = -20 - Math.min(x < rivaS ? rivaS - x : x - rivaD, 200);
      continue;
    }
    let i = 0;
    while (i < punti.length - 2 && x > punti[i + 1][0]) i++;
    const [xa, qa] = punti[i], [xb, qb] = punti[i + 1];
    const t = xb > xa ? (x - xa) / (xb - xa) : 0;
    // la riva (tratti 1 e ultimo-1) e la salita della piana (tratti 3 e ultimo-3) sono dritte: pendenza uniforme
    const dritto = i === 1 || i === punti.length - 3 || i === 3 || i === punti.length - 5;
    const f = dritto ? t : morbido(t);
    quota[x] = qa + (qb - qa) * f;
    quota[x] += campana(x, sx.orlo, sx.mezzoLabbro, sx.labbro) + campana(x, orloD, dxL.mezzoLabbro, dxL.labbro);
    for (const k of colline) colle[x] += campana(x, k.c, k.m, k.a);
    const interno = morbido((x - sx.orlo) / 120) * morbido((orloD - x) / 120);
    let n = amp * (r1[x] + 0.35 * r2[x]) * interno;
    if (n > P.rumoreMax) n = P.rumoreMax;
    if (n < -P.rumoreMax) n = -P.rumoreMax;
    quota[x] += n;
  }

  // riempimento: si scalano le colline per centrare un obiettivo dentro i limiti dell'Isola
  const area = W * (MARE - CIELO);
  const obiettivo = (P.riempimentoMin + casuale(s) * (P.riempimentoMax - P.riempimentoMin)) * area;
  let pieno = 0, massaColline = 0;
  for (let x = 0; x < W; x++) {
    if (quota[x] > 0) pieno += Math.min(quota[x], MARE - CIELO);
    massaColline += colle[x];
  }
  let k = massaColline > 0 ? (obiettivo - pieno) / massaColline : 1;
  if (k < P.scalaCollineMin) k = P.scalaCollineMin;
  if (k > P.scalaCollineMax) k = P.scalaCollineMax;
  // la cima non sale sopra P.cimaMinY (Lead design: la camera alta 540 deve mostrare cima e uno spawn insieme)
  const quotaMax = MARE - P.cimaMinY;
  for (let x = 0; x < W; x++) {
    if (colle[x] > 0 && quota[x] + k * colle[x] > quotaMax) k = Math.max(0, (quotaMax - quota[x]) / colle[x]);
  }

  const out = new Int32Array(W);
  for (let x = 0; x < W; x++) {
    let y = Math.round(MARE - (quota[x] + k * colle[x]));
    if (x < MONDO.bordo || x >= W - MONDO.bordo) y = FONDALE;
    if (y < CIELO + 24) y = CIELO + 24;
    if (y > FONDALE) y = FONDALE;
    out[x] = y;
  }
  return out;
}

/** Costruisce la maschera dell'isola (lato 0 a sinistra: lo specchio si applica dopo). */
export function terrenoIsola(s: ConRng): TerrenoIsola {
  const prof = profilo(s);
  const maschera = new Uint8Array(W * H);

  // strati dalla profondità sotto il profilo (riga per riga: scrive la memoria in ordine, è più veloce)
  let yTop: number = FONDALE;
  for (let x = 0; x < W; x++) yTop = Math.min(yTop, prof[x]);
  const SAB = MATERIALE.sabbia, TER = MATERIALE.terra, ROC = MATERIALE.roccia;
  const dSab = ISOLA.sabbia, dRoc = ISOLA.roccia;
  for (let y = yTop; y < FONDALE; y++) {
    const r = y * W;
    for (let x = 0; x < W; x++) {
      const d = y - prof[x];
      if (d >= 0) maschera[r + x] = d < dSab ? SAB : d < dRoc ? TER : ROC;
    }
  }
  maschera.fill(MATERIALE.ferro, FONDALE * W);

  // grotte a metaball: gruppi di 2 sfere vicine; campo Σ r²/d² ≥ 1 ⇒ aria
  const grotte: Sfera[][] = [];
  const mezzoTetto = ISOLA.grottaTetto / 2, ARIA = MATERIALE.aria;
  const nGrotte = intero(s, ISOLA.grotteMin, ISOLA.grotteMax);
  for (let g = 0; g < nGrotte; g++) {
    const x0 = intero(s, 360, W - 360);
    const r0 = intero(s, ISOLA.grottaRaggioMin, ISOLA.grottaRaggioMax);
    const r1 = intero(s, ISOLA.grottaRaggioMin, ISOLA.grottaRaggioMax);
    const dx = intero(s, 20, 50) * (probabilita(s, 0.5) ? 1 : -1);
    const x1 = x0 + dx;
    const tetto = Math.max(prof[x0], prof[x1]) + ISOLA.grottaTetto;
    const yMin = tetto + Math.max(r0, r1);
    const yMax = MARE - 30 - Math.max(r0, r1);
    if (yMin > yMax) continue; // terreno troppo sottile qui: niente grotta
    const y0 = intero(s, yMin, Math.min(yMax, yMin + 140));
    const y1 = Math.min(yMax, Math.max(yMin, y0 + intero(s, -12, 12)));
    const sfere = [{ x: x0, y: y0, r: r0 }, { x: x1, y: y1, r: r1 }];
    grotte.push(sfere);
    const xa = Math.min(x0 - r0, x1 - r1) - 8, xb = Math.max(x0 + r0, x1 + r1) + 8;
    const ya = Math.min(y0 - r0, y1 - r1) - 8, yb = Math.max(y0 + r0, y1 + r1) + 8;
    for (let y = Math.max(CIELO, ya); y <= Math.min(FONDALE - 1, yb); y++) {
      for (let x = Math.max(0, xa); x <= Math.min(W - 1, xb); x++) {
        let campo = 0;
        for (const b of sfere) {
          const ddx = x - b.x, ddy = y - b.y;
          const d2 = ddx * ddx + ddy * ddy;
          campo += d2 === 0 ? 2 : (b.r * b.r) / d2;
        }
        if (campo >= 1 && y >= prof[x] + mezzoTetto) maschera[y * W + x] = ARIA;
      }
    }
  }

  // 1-2 massi di roccia mezzi interrati sulla superficie
  const massi: Sfera[] = [];
  const nMassi = intero(s, ISOLA.massiMin, ISOLA.massiMax);
  for (let m = 0; m < nMassi; m++) {
    const r = intero(s, ISOLA.massoRaggioMin, ISOLA.massoRaggioMax);
    const x0 = intero(s, Math.round(W * 0.2), Math.round(W * 0.8));
    const y0 = prof[x0] + Math.round(r * 0.35);
    if (y0 >= MARE - 10) continue;
    massi.push({ x: x0, y: y0, r });
    const ry = Math.round(r * 0.8);
    for (let y = Math.max(CIELO, y0 - ry); y <= Math.min(FONDALE - 1, y0 + ry); y++) {
      for (let x = Math.max(0, x0 - r); x <= Math.min(W - 1, x0 + r); x++) {
        const u = (x - x0) / r, v = (y - y0) / ry;
        if (u * u + v * v <= 1) maschera[y * W + x] = ROC;
      }
    }
  }

  return { maschera, profilo: prof, grotte, massi };
}

/** Specchia la maschera in orizzontale, sul posto. */
export function specchiaMaschera(m: Uint8Array): void {
  for (let y = 0; y < H; y++) {
    const r = y * W;
    for (let a = 0, b = W - 1; a < b; a++, b--) {
      const t = m[r + a];
      m[r + a] = m[r + b];
      m[r + b] = t;
    }
  }
}
