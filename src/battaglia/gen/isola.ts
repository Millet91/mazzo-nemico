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

/**
 * Profilo superiore (y della superficie per ogni colonna). Forma dell'isola, uguale nei due lati ma con numeri
 * estratti a parte per ciascuno: piccola spiaggia, costa ripida fino a una cresta (la duna che ripara gli spawn
 * dalle spinte verso il mare, 06 §7.1-7.2), discesa verso la piana interna, poi il centro (collina o valle).
 * I punti di controllo si uniscono con rampe morbide, che lasciano tratti in piano attorno a ogni punto.
 * Fuori dall'isola il fondo scende al fondale: ai bordi 0-64 e 1984-2048 c'è sempre acqua aperta.
 */
export function profilo(s: ConRng): Int32Array {
  const P = ISOLA;
  // punti (x, quota sopra il mare) del lato sinistro; il destro si costruisce allo stesso modo e si ribalta
  // i due lati partono dagli stessi numeri con piccole differenze: l'isola resta equa ma non è mai simmetrica
  const base = {
    riva: intero(s, P.rivaMin, P.rivaMax),
    spiaggia: intero(s, P.spiaggiaMin, P.spiaggiaMax),
    cresta: intero(s, Math.round(W * P.crestaDa), Math.round(W * P.crestaA)),
    qCresta: intero(s, P.crestaQuotaMin, P.crestaQuotaMax),
    piede: intero(s, P.piedeMin, P.piedeMax),
    riparo: intero(s, P.riparoMin, P.riparoMax),
  };
  const j = P.scartoLati;
  const lato = (): [number, number][] => {
    const riva = base.riva + intero(s, -j, j);
    const spiaggia = riva + base.spiaggia + intero(s, -j, j);
    const cresta = base.cresta + intero(s, -j, j);
    const qCresta = base.qCresta + intero(s, -2 * j, 2 * j);
    const piede = cresta + base.piede + intero(s, -j, j);
    const qPiana = qCresta - base.riparo + intero(s, -j, j);
    const meta = Math.round(W * P.pianaFino) + intero(s, -40, 40);
    return [
      [riva, -20],
      [spiaggia, intero(s, 16, 40)],
      [cresta, qCresta],
      [piede, qPiana],
      [meta, qPiana + intero(s, -P.pianaOnda, P.pianaOnda)],
    ];
  };
  const sx = lato();
  const dx = lato().map(([x, q]) => [W - 1 - x, q] as [number, number]).reverse();
  const qMedia = (sx[4][1] + dx[0][1]) / 2;
  const centro: [number, number] = [Math.round(W / 2) + intero(s, -80, 80), Math.round(qMedia + intero(s, P.centroMin, P.centroMax))];
  const punti = [...sx, centro, ...dx];

  const passo = intero(s, P.rumorePassoMin, P.rumorePassoMax);
  const amp = intero(s, P.rumoreAmpMin, P.rumoreAmpMax);
  const r1 = rumore1D(s, passo);
  const r2 = rumore1D(s, Math.round(passo / 2));

  const rivaS = punti[0][0], rivaD = punti[punti.length - 1][0];
  const quota = new Float64Array(W);
  const interno = new Float64Array(W); // 1 tra le due creste, sfuma a 0 verso la riva
  for (let x = 0; x < W; x++) {
    if (x < rivaS || x > rivaD) {
      quota[x] = -20 - Math.min(x < rivaS ? rivaS - x : x - rivaD, 200);
      continue;
    }
    let i = 0;
    while (i < punti.length - 2 && x > punti[i + 1][0]) i++;
    const [xa, qa] = punti[i], [xb, qb] = punti[i + 1];
    const t = xb > xa ? (x - xa) / (xb - xa) : 0;
    quota[x] = qa + (qb - qa) * morbido(t);
    interno[x] = morbido((x - rivaS) / (punti[2][0] - rivaS)) * morbido((rivaD - x) / (rivaD - punti[punti.length - 3][0]));
    let n = amp * (r1[x] + 0.35 * r2[x]) * interno[x];
    if (n > P.rumoreMax) n = P.rumoreMax;
    if (n < -P.rumoreMax) n = -P.rumoreMax;
    quota[x] += n;
  }

  // correzione del riempimento: si alza o si abbassa l'interno per centrare un obiettivo dentro 35-50%
  const area = W * (MARE - CIELO);
  const obiettivo = (P.riempimentoMin + casuale(s) * (P.riempimentoMax - P.riempimentoMin)) * area;
  let pieno = 0, sommaInt = 0;
  for (let x = 0; x < W; x++) {
    if (quota[x] > 0) pieno += Math.min(quota[x], MARE - CIELO);
    sommaInt += interno[x];
  }
  const delta = sommaInt > 0 ? (obiettivo - pieno) / sommaInt : 0;

  const out = new Int32Array(W);
  for (let x = 0; x < W; x++) {
    let y = Math.round(MARE - (quota[x] + delta * interno[x]));
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
        if (campo >= 1 && y >= prof[x] + ISOLA.grottaTetto / 2) maschera[y * W + x] = MATERIALE.aria;
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
        if (u * u + v * v <= 1) maschera[y * W + x] = MATERIALE.roccia;
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
