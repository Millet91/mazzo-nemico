// Le mosse del pirata (studio v2, Fase 1): "si muovono come pirati, non come vermi".
// Corsa a falcate (passo corto col tocco, corsa tenendo premuto, frenata, pendenze), evento `passo`,
// scavalco automatico dei muretti, Balzo (salto con la rincorsa, salto dal muro, afferra, stacca) e
// `Pirata.mossa` per render e audio. Numeri in BIL.movimento.
//
// Dove sta lo stato (niente campi nuovi fuori dai contratti):
// - a terra `vx` è la velocità lungo il suolo (0 = fermo): `fermo()` aspetta da solo la fine della frenata;
// - `mossa` + `mossaDa` dicono cosa sta facendo e da quando: 'passo' da corsaDopoTick diventa 'corsa';
// - lo scavalco non ha altro stato: sale accostato al muretto finché non supera lo spigolo, poi fa il passo sopra.

import type { EventoBattaglia, IdMossa, MossaPirata, Pirata, StatoBattaglia, Terreno } from '../../core/tipi';
import { normalizza } from '../../core/trig';
import { BIL, TICK_AL_SECONDO } from '../../contenuti/bilanciamento';
import { capsulaUrta, materialeSottoPiedi, solido, MEZZA_ALTEZZA_PIRATA, MEZZA_LARGHEZZA_PIRATA } from './terreno';
import { annega, controllaAppoggio, danneggia, espelli, inAcqua, passo, stacca, vola, volaPulito, type Corpo } from './pirata';
import { aggiornaAppeso, aggrappa, appiglioVicino, lascia, provaAggrappo } from './appigli';
import { A_TERRA_TICK, MURO_ACCANTO_PX, RINCORSA, SALTI_MURO_MAX, SONDA_PENDENZA_PX } from './costanti';

const M = BIL.movimento;
/** accelerazione della corsa (da ferma a corsaVel in corsaAccelTick) e frenata (si ferma in frenataPx), px/tick² */
const CORSA_ACCEL = M.corsaVel / M.corsaAccelTick;
const FRENATA = (M.corsaVel * M.corsaVel) / (2 * M.frenataPx);
/** lo scavalco più alto dura scavalcoTick: la salita ne prende 9, gli ultimi sono il passo sopra */
const SCAVALCO_VEL = M.scavalcoMax / (M.scavalcoTick - 6);
/** scavalco, ultimo tratto: avanza sopra il muretto a questa velocità (px/tick) */
const SCAVALCO_AVANTI = 2;
/** controllo in aria durante il salto, px/tick² */
const ARIA_ACCEL = M.ariaAccel / (TICK_AL_SECONDO * TICK_AL_SECONDO);

/** Cambia mossa (se è già quella non tocca `mossaDa`: l'animazione non riparte). */
export function mossaA(p: Pirata, m: MossaPirata, tick: number): void {
  if (p.mossa !== m) { p.mossa = m; p.mossaDa = tick; }
}

/** Gira il pirata; se è quello di turno e sta mirando, la mira tiene la stessa elevazione dall'altra parte. */
export function gira(s: StatoBattaglia, p: Pirata, dir: -1 | 1): void {
  if (p.verso === dir) return;
  p.verso = dir;
  const t = s.turno;
  if (t.pirata === p.id && t.fase === 'azione') t.mira.mezziGradi = normalizza(360 - t.mira.mezziGradi);
}

/**
 * Di quanti px sta più in basso (+) o più in alto (−) il posto in piedi `avanti` px più in là, cercando fino a
 * `su` px sopra e `giu` px sotto. null = lì non si sta in piedi (muro, vuoto).
 */
export function dislivello(t: Terreno, x: number, y: number, avanti: number, su: number, giu: number): number | null {
  const nx = x + avanti;
  let libero = !capsulaUrta(t, nx, y - su);
  for (let k = -su; k <= giu; k++) {
    const sotto = !capsulaUrta(t, nx, y + k + 1);
    if (libero && !sotto) return k;
    libero = sotto;
  }
  return null;
}

/** Pendenza del suolo davanti (dislivello su SONDA_PENDENZA_PX): + = salita, − = discesa, 0 = piano o non si sa. */
export function pendenza(t: Terreno, x: number, y: number, dir: -1 | 1): number {
  const k = dislivello(t, x, y, dir * SONDA_PENDENZA_PX, SONDA_PENDENZA_PX, SONDA_PENDENZA_PX);
  return k === null || k === 0 ? 0 : -k / SONDA_PENDENZA_PX;
}

/** Colonna in cui entra il bordo anteriore della capsula facendo un passo di 1 px verso `dir`. */
function colonnaDavanti(x: number, dir: -1 | 1): number {
  return Math.floor(x + dir) + (dir === 1 ? MEZZA_LARGHEZZA_PIRATA - 1 : -MEZZA_LARGHEZZA_PIRATA);
}

/**
 * Altezza in px dell'ostacolo davanti ai piedi se si può scavalcare (da oltre il gradino fino a
 * BIL.movimento.scavalcoMax), altrimenti 0: serve aria libera sopra la testa per tutta la salita e il posto
 * per stare in piedi sopra.
 */
export function altezzaScavalco(t: Terreno, x: number, y: number, dir: -1 | 1): number {
  const fx = colonnaDavanti(x, dir);
  const suolo = Math.floor(y) + MEZZA_ALTEZZA_PIRATA; // prima riga sotto i piedi
  let alto = 0;
  for (let k = 1; k <= M.scavalcoMax + 1; k++) if (solido(t, fx, suolo - k)) alto = k;
  if (alto <= BIL.pirata.gradinoMax || alto > M.scavalcoMax) return 0;
  if (!capsulaUrta(t, x + dir, y)) return 0; // solo una sporgenza all'altezza della testa: non è un muretto
  for (let k = 1; k <= alto; k++) if (capsulaUrta(t, x, y - k)) return 0; // soffitto
  return capsulaUrta(t, x + dir, y - alto) ? 0 : alto;
}

function iniziaScavalco(s: StatoBattaglia, p: Pirata, dir: -1 | 1, eventi: EventoBattaglia[]): void {
  gira(s, p, dir);
  stacca(p);
  p.vx = 0; p.vy = 0;
  mossaA(p, 'scavalco', s.tick);
  eventi.push({ t: 'scavalco', pirata: p.id });
}

/** Lascia la mossa in corso e cade da dov'è. */
function cade(p: Pirata, tick: number): void {
  p.aTerra = false; p.vx = 0; p.vy = 0; p.yInizioCaduta = p.y;
  mossaA(p, 'caduta', tick);
}

/**
 * Un tick di scavalco per il corpo. Finché ha il muretto davanti sale accostato; superato lo spigolo fa il passo
 * sopra e poi avanza finché ha il suolo sotto il centro (non resta in bilico sullo spigolo).
 * Restituisce 0 = è ancora a metà, 1 = è sopra, a terra, −1 = non può (soffitto, niente appoggio).
 * Lo usa anche l'esploratore della QA.
 */
export function saleScavalco(t: Terreno, c: Corpo, d: -1 | 1): -1 | 0 | 1 {
  if (!capsulaUrta(t, c.x + d, c.y)) {
    if (!capsulaUrta(t, c.x, c.y + 1)) {
      // spigolo appena superato: passo sopra e piedi giù
      c.x += d;
      for (let k = 1; k <= BIL.pirata.gradinoMax + 1; k++) {
        if (!capsulaUrta(t, c.x, c.y + k)) continue;
        c.y += k - 1; c.yInizioCaduta = c.y;
        return 0;
      }
      return -1;
    }
    // sopra, in piedi: avanza finché il centro ha il suolo sotto
    for (let i = 0; i < 2; i++) {
      if (solido(t, Math.floor(c.x), Math.floor(c.y) + MEZZA_ALTEZZA_PIRATA)) break;
      c.aTerra = true;
      const mosso = passo(t, c, d, SCAVALCO_AVANTI / 2, 0);
      if (!c.aTerra) return -1; // sopra non c'era appoggio: `passo` l'ha messo in caduta
      if (!mosso) break; // un altro muro: resta in piedi qui
      c.aTerra = false;
      if (i === 1) return 0;
    }
    c.aTerra = true; c.yInizioCaduta = c.y;
    return 1;
  }
  let resto = SCAVALCO_VEL;
  while (resto > 0 && capsulaUrta(t, c.x + d, c.y)) {
    const q = Math.min(1, resto);
    resto -= q;
    if (capsulaUrta(t, c.x, c.y - q)) return -1;
    c.y -= q;
  }
  c.yInizioCaduta = c.y;
  return 0;
}

/**
 * Un tick di scavalco del pirata. Si interrompe (e il pirata cade) se il giocatore gira dall'altra parte,
 * se trova un soffitto o se dura troppo.
 */
function aggiornaScavalco(s: StatoBattaglia, p: Pirata, dir: -1 | 0 | 1): void {
  const d = p.verso;
  if (dir === -d || s.tick - (p.mossaDa ?? 0) > 2 * M.scavalcoTick) { cade(p, s.tick); return; }
  const r = saleScavalco(s.terreno, p as Corpo, d);
  if (r === 1) mossaA(p, 'fermo', s.tick);
  else if (r === -1) cade(p, s.tick);
}

/**
 * Un tick a terra. `dir` = freccia tenuta (solo per il pirata di turno, quando può muoversi).
 * Tocco breve = passo corto a passoVel; tenendo oltre corsaDopoTick parte la corsa, che accelera fino a corsaVel
 * e al rilascio frena in frenataPx. In salita rallenta e in discesa accelera (pendenzaFrazione a 45°).
 * Contro un muretto fino a scavalcoMax si issa da solo.
 */
function muoviATerra(s: StatoBattaglia, p: Pirata, dir: -1 | 0 | 1, eventi: EventoBattaglia[]): void {
  const t = s.terreno;
  let v = p.vx;
  if (dir === 0 || p.vita <= 0) {
    // freccia lasciata: dal passo si ferma subito, dalla corsa frena
    const a = Math.abs(v) - FRENATA;
    if (p.mossa !== 'corsa' && p.mossa !== 'frenata' || a <= 0) v = 0;
    else { v = v > 0 ? a : -a; mossaA(p, 'frenata', s.tick); }
    if (v === 0) {
      p.vx = 0;
      if (p.mossa !== 'aTerra') mossaA(p, 'fermo', s.tick);
      controllaAppoggio(t, p);
      if (!p.aTerra && p.mossa !== 'aTerra') mossaA(p, 'caduta', s.tick);
      return;
    }
  } else {
    gira(s, p, dir);
    if (v * dir < 0) v = 0; // inversione: riparte dal passo
    if (p.mossa === 'corsa' && v !== 0) {
      v = dir * Math.min(M.corsaVel, Math.abs(v) + CORSA_ACCEL);
    } else if (p.mossa === 'passo' && v !== 0 && s.tick - (p.mossaDa ?? 0) >= M.corsaDopoTick) {
      mossaA(p, 'corsa', s.tick);
      v = dir * Math.min(M.corsaVel, M.passoVel + CORSA_ACCEL);
    } else {
      mossaA(p, 'passo', s.tick);
      v = dir * M.passoVel;
    }
  }
  const d: -1 | 1 = v > 0 ? 1 : -1;
  const pen = pendenza(t, p.x, p.y, d);
  const dist = Math.abs(v) * (1 - M.pendenzaFrazione * Math.max(-1, Math.min(1, pen)));
  const passi = Math.max(1, Math.ceil(dist));
  const falcata = Math.floor(p.x / M.passoPx);
  for (let i = 0; i < passi; i++) {
    if (!passo(t, p, d, dist / passi, Math.abs(v))) {
      // muro: se è un muretto e il pirata ci sta andando contro, lo scavalca
      p.vx = 0;
      if (dir !== 0 && altezzaScavalco(t, p.x, p.y, d) > 0) { iniziaScavalco(s, p, d, eventi); return; }
      mossaA(p, 'fermo', s.tick);
      return;
    }
    if (!p.aTerra) { mossaA(p, 'caduta', s.tick); return; } // è uscito dal ciglio: cade con lo slancio
  }
  p.vx = v;
  if (Math.floor(p.x / M.passoPx) !== falcata) {
    eventi.push({
      t: 'passo', pirata: p.id, x: p.x, y: p.y + MEZZA_ALTEZZA_PIRATA, corsa: p.mossa === 'corsa',
      materiale: materialeSottoPiedi(t, p.x, p.y),
    });
  }
}

// ─── Balzo ───────────────────────────────────────────────────────────────────────────────────────

export type EsitoBalzo = 'salto' | 'scavalca' | 'afferra' | 'stacca' | 'muro';

/** La squadra del pirata ha questa mossa premio? (senza elenco le ha tutte: Schermaglia, Prologo) */
function haMossa(s: StatoBattaglia, p: Pirata, m: IdMossa): boolean {
  const mosse = s.config.squadre[p.squadra].mosse;
  return !mosse || mosse.includes(m);
}

/** In aria: da che parte sta andando (se scende dritto, dove guarda). */
function versoVolo(p: Pirata): -1 | 1 {
  return p.vx > 0 ? 1 : p.vx < 0 ? -1 : p.verso;
}

/**
 * Cosa fa il Balzo (comando `salta`) per questo pirata, senza toccare lo stato. null = niente.
 * - appeso: 'stacca' (salta via dall'appiglio, nel verso in cui guarda);
 * - in aria: 'afferra' se ha una scala o una liana a portata, 'muro' se ha una parete accanto nel verso in cui
 *   vola e non ha già usato il salto dal muro; chi è stato sbalzato da un colpo non può niente finché non tocca terra;
 * - a terra: 'afferra' se è ai piedi di una scala o liana che sale, 'scavalca' se ha davanti un muretto fino a
 *   28 px, 'muro' se ha davanti una parete più alta e il comando è `indietro: true`, altrimenti 'salto'.
 */
export function decidiBalzo(s: StatoBattaglia, p: Pirata, indietro: boolean): EsitoBalzo | null {
  if (p.appeso >= 0) return 'stacca';
  if (p.mossa === 'scavalco') return null;
  const t = s.terreno;
  const a = appiglioVicino(s, p.x, p.y);
  if (!p.aTerra) {
    if (p.mossa === 'aTerra') return null;
    if (a) return 'afferra';
    if ((p.saltiMuro ?? 0) < SALTI_MURO_MAX && capsulaUrta(t, p.x + versoVolo(p) * MURO_ACCANTO_PX, p.y)) return 'muro';
    return null;
  }
  if (a && p.y - MEZZA_ALTEZZA_PIRATA > a.yAlto) return 'afferra';
  const prova: Corpo = { x: p.x, y: p.y, vx: 0, vy: 0, aTerra: true, yInizioCaduta: p.y };
  if (!passo(t, prova, p.verso, 1, 0)) {
    if (altezzaScavalco(t, p.x, p.y, p.verso) > 0) return 'scavalca';
    if (indietro) return 'muro';
  }
  return 'salto';
}

/** Esegue il Balzo deciso da `decidiBalzo` (al tick dopo il comando `salta`). */
export function balzo(s: StatoBattaglia, p: Pirata, indietro: boolean, eventi: EventoBattaglia[]): void {
  const sa = BIL.pirata.saltoAvanti;
  const salta = (vx: number): void => {
    stacca(p);
    p.vx = vx; p.vy = sa.vy;
    p.mossa = 'salto'; p.mossaDa = s.tick;
  };
  switch (decidiBalzo(s, p, indietro)) {
    case 'stacca':
      s.turno.arrampicata = 0;
      salta(p.verso * sa.vx);
      eventi.push({ t: 'salto', pirata: p.id });
      break;
    case 'afferra': {
      const a = appiglioVicino(s, p.x, p.y)!;
      // da terra sale in un tocco fino in cima; preso al volo resta appeso dov'è
      s.turno.arrampicata = p.aTerra ? -1 : 0;
      aggrappa(s, p, a, eventi);
      p.saltiMuro = 0;
      break;
    }
    case 'scavalca':
      iniziaScavalco(s, p, p.verso, eventi);
      break;
    case 'muro': {
      // spinta sulla parete: riparte dall'altra parte, come un salto in avanti
      const d = p.aTerra ? p.verso : versoVolo(p);
      gira(s, p, (-d) as -1 | 1);
      salta(-d * sa.vx);
      p.saltiMuro = (p.saltiMuro ?? 0) + 1;
      eventi.push({ t: 'saltoMuro', pirata: p.id });
      break;
    }
    case 'salto': {
      // con la rincorsa: chi sta correndo porta nel salto una parte della velocità
      const corre = (p.mossa === 'corsa' || p.mossa === 'frenata') && p.vx * p.verso > 0 && haMossa(s, p, 'saltoAppoggio');
      salta(p.verso * (sa.vx + (corre ? RINCORSA * Math.abs(p.vx) : 0)));
      eventi.push({ t: 'salto', pirata: p.id });
      break;
    }
    default:
      break;
  }
}

/**
 * Un tick in aria. Il pirata di turno che salta o cade vola "pulito" (niente rimbalzi, atterra in piedi, un filo
 * di controllo in aria con la freccia); tutti gli altri, e chi è stato sbalzato da un colpo, volano e rimbalzano
 * come corpi (così li prevede simulaColpo).
 */
function muoviInAria(s: StatoBattaglia, p: Pirata, dir: -1 | 0 | 1, eventi: EventoBattaglia[]): void {
  const pulito = s.turno.pirata === p.id && p.mossa !== 'aTerra' && p.vita > 0;
  if (pulito && dir !== 0) p.vx += dir * ARIA_ACCEL;
  const danno = pulito ? volaPulito(s.terreno, p as Corpo) : vola(s.terreno, p as Corpo);
  if (danno < 0) {
    if (p.mossa !== 'aTerra') mossaA(p, p.vy < 0 ? 'salto' : 'caduta', s.tick);
    return;
  }
  p.saltiMuro = 0;
  eventi.push({ t: 'atterrato', pirata: p.id, dannoCaduta: danno });
  if (danno > 0) danneggia(p, danno, eventi);
  if (pulito) {
    // atterra in piedi: se tiene la freccia nel verso del volo riparte senza fermarsi, altrimenti si ferma
    const v = Math.min(Math.abs(p.vx), M.corsaVel);
    if (dir !== 0 && p.vx * dir > 0 && p.vita > 0) {
      p.vx = dir * v;
      p.mossa = v > M.passoVel ? 'corsa' : 'passo'; p.mossaDa = s.tick;
    } else {
      p.vx = 0;
      mossaA(p, 'fermo', s.tick);
    }
    return;
  }
  // chi è stato sbalzato resta 'aTerra' ancora un momento: da qui `mossaDa` è il tick in cui si è fermato
  if (p.mossa === 'aTerra') p.mossaDa = s.tick; else mossaA(p, 'fermo', s.tick);
}

/**
 * Un tick di fisica per un pirata in campo (anche a 0 PV: il corpo cade e può essere spinto).
 * `dir` = camminata richiesta, `su` = arrampicata richiesta (solo per il pirata attivo nelle fasi in cui può muoversi).
 */
export function aggiornaPirata(s: StatoBattaglia, p: Pirata, dir: -1 | 0 | 1, eventi: EventoBattaglia[], su: -1 | 0 | 1 = 0): void {
  if (p.stato !== 'vivo') return;
  const t = s.terreno;
  if (p.appeso >= 0 && p.vita <= 0) lascia(t, p, eventi); // a terra con 0 PV: cade giù
  const mio = s.turno.pirata === p.id;
  if (p.appeso < 0 && su !== 0 && p.vita > 0) {
    if (provaAggrappo(s, p, su, eventi)) p.saltiMuro = 0;
    else if (p.aTerra && mio) s.turno.arrampicata = 0; // a terra senza niente da prendere: il comando non resta acceso
  }
  if (p.appeso >= 0) {
    if (espelli(t, p)) p.yInizioCaduta = p.y;
    const x0 = p.x, y0 = p.y;
    if (aggiornaAppeso(s, p, su, eventi)) {
      const a = s.appigli.find((x) => x.id === p.appeso);
      mossaA(p, a?.tipo === 'liana' ? 'liana' : 'scala', s.tick);
      // non va più avanti (cima senza un piano accanto, o un muro di mezzo): il comando "in un tocco" si spegne
      if (mio && su !== 0 && p.x === x0 && p.y === y0) s.turno.arrampicata = 0;
    } else {
      // arrivato in cima o in fondo (o l'appiglio non c'è più): il comando "in un tocco" si spegne
      if (mio) s.turno.arrampicata = 0;
      if (p.mossa !== 'aTerra') mossaA(p, p.aTerra ? 'fermo' : 'caduta', s.tick);
    }
    if (inAcqua(p, t.mare)) annega(p, eventi);
    return;
  }
  if (espelli(t, p)) {
    controllaAppoggio(t, p);
    if (p.mossa === 'scavalco') mossaA(p, p.aTerra ? 'fermo' : 'caduta', s.tick);
  }
  if (p.mossa === 'scavalco') aggiornaScavalco(s, p, dir);
  else if (p.aTerra) muoviATerra(s, p, dir, eventi);
  else muoviInAria(s, p, dir, eventi);
  // sbalzato e ormai fermo da un po': si rialza (chi è a 0 PV resta giù fino alla lapide)
  if (p.mossa === 'aTerra' && p.aTerra && p.vita > 0 && s.tick - (p.mossaDa ?? 0) >= A_TERRA_TICK) mossaA(p, 'fermo', s.tick);
  if (p.vita <= 0 && p.mossa !== 'aTerra') mossaA(p, 'aTerra', s.tick);
  if (inAcqua(p, t.mare)) annega(p, eventi);
}
