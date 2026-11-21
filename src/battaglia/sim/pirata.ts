// Fisica del pirata: camminata con gradino, salti, volo con rimbalzo, attrito, danno da caduta,
// espulsione dal solido (caso 7) e annegamento. Le funzioni sul "Corpo" non sanno nulla di eventi e PV:
// così le usa anche simulaColpo (IA) su copie, senza toccare lo stato.

import type { EventoBattaglia, Pirata, StatoBattaglia, Terreno } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { capsulaUrta, materialeSottoPiedi, solido, MEZZA_ALTEZZA_PIRATA, MEZZA_LARGHEZZA_PIRATA } from './terreno';
import { ESPULSIONE_MAX_PX } from './costanti';
import { aggiornaAppeso, lascia, provaAggrappo } from './appigli';

export interface Corpo {
  x: number; y: number; vx: number; vy: number; aTerra: boolean; yInizioCaduta: number;
  /** solo per i pirati veri: id dell'appiglio a cui è aggrappato (−1 = nessuno) */
  appeso?: number;
}

const P = BIL.pirata;
const G = BIL.fisica.gravita;

/** Danno da caduta per un dislivello in px (00 §1.2: oltre 90 px, 1 PV ogni 4 px oltre la soglia, massimo 25). */
export function dannoCaduta(dislivello: number): number {
  if (dislivello <= P.cadutaSoglia) return 0;
  return Math.min(P.cadutaMax, Math.floor((dislivello - P.cadutaSoglia) / P.cadutaPxPerPv));
}

/** Il corpo tocca l'acqua (i piedi sotto il livello del mare)? */
export function inAcqua(c: Corpo, mare: number): boolean {
  return c.y + MEZZA_ALTEZZA_PIRATA >= mare;
}

/** Stacca il corpo dal suolo o dall'appiglio (salto, spinta, terreno che sparisce). */
export function stacca(c: Corpo): void {
  const appeso = c.appeso !== undefined && c.appeso >= 0;
  if (c.aTerra || appeso) { c.aTerra = false; c.yInizioCaduta = c.y; }
  if (appeso) c.appeso = -1;
}

/** Come stacca, per un pirata spinto da un colpo: se era appeso esce l'evento `staccato`. */
export function staccaPirata(p: Pirata, eventi: EventoBattaglia[]): void {
  if (p.appeso >= 0) eventi.push({ t: 'staccato', pirata: p.id });
  stacca(p);
}

/**
 * La colonna in cui entra il bordo anteriore della capsula ha terreno più alto di un gradino (8 px)?
 * Serve perché il fondo arrotondato della capsula, da solo, salirebbe a poco a poco anche gradini più alti.
 */
function muroDavanti(t: Terreno, nx: number, y: number, dir: -1 | 1): boolean {
  const fx = Math.floor(nx) + (dir === 1 ? MEZZA_LARGHEZZA_PIRATA - 1 : -MEZZA_LARGHEZZA_PIRATA);
  const suolo = Math.floor(y) + MEZZA_ALTEZZA_PIRATA; // prima riga sotto i piedi
  for (let py = suolo - 2 * MEZZA_ALTEZZA_PIRATA; py <= suolo - P.gradinoMax - 1; py++) if (solido(t, fx, py)) return true;
  return false;
}

/**
 * Un passo di camminata a terra (1 tick). Sale gradini fino a 8 px, scende pendii fino a 8 px;
 * oltre, il pirata si stacca e cade. Restituisce true se si è mosso.
 */
export function cammina(t: Terreno, c: Corpo, dir: -1 | 1): boolean {
  const nx = c.x + dir * P.camminata;
  if (!capsulaUrta(t, nx, c.y)) {
    c.x = nx;
    // cerca il suolo sotto, al massimo un gradino più in basso
    for (let k = 1; k <= P.gradinoMax + 1; k++) {
      if (capsulaUrta(t, c.x, c.y + k)) { c.y += k - 1; return true; }
    }
    // niente suolo: cade
    c.aTerra = false; c.yInizioCaduta = c.y; c.vx = dir * P.camminata; c.vy = 0;
    return true;
  }
  if (muroDavanti(t, nx, c.y, dir)) return false;
  for (let k = 1; k <= P.gradinoMax; k++) {
    if (!capsulaUrta(t, nx, c.y - k)) { c.x = nx; c.y -= k; return true; }
  }
  return false; // muro
}

/**
 * Un tick di volo: gravità, spostamento a passi di al massimo 1 px, rimbalzo 0,3 sul terreno con l'attrito del
 * materiale (ghiaccio 0,2 = scivola), fermo sotto 5 px/s. Restituisce il danno da caduta se il corpo si è
 * fermato in questo tick (0 = nessun danno), oppure −1 se è ancora in volo.
 */
export function vola(t: Terreno, c: Corpo): number {
  c.vy += G;
  const passi = Math.max(1, Math.ceil(Math.max(Math.abs(c.vx), Math.abs(c.vy))));
  const dx = c.vx / passi, dy = c.vy / passi;
  let contattoSotto = false;
  for (let i = 0; i < passi; i++) {
    const nx = c.x + dx, ny = c.y + dy;
    if (!capsulaUrta(t, nx, ny)) {
      c.x = nx; c.y = ny;
      if (c.y < c.yInizioCaduta) c.yInizioCaduta = c.y;
      continue;
    }
    const bloccoY = dy !== 0 && capsulaUrta(t, c.x, ny);
    const bloccoX = dx !== 0 && capsulaUrta(t, nx, c.y);
    if (bloccoY || !bloccoX) {
      if (dy > 0) {
        contattoSotto = true;
        const attrito = BIL.fisica.attrito[materialeSottoPiedi(t, c.x, c.y)] ?? 1;
        if (c.vy * P.rimbalzo >= P.velocitaFermo) {
          // urto vero: rimbalzo 0,3 e la velocità orizzontale si smorza secondo il materiale
          c.vy = -c.vy * P.rimbalzo;
          c.vx *= 1 - attrito * (1 - P.rimbalzo);
        } else {
          // appoggiato e scivola: attrito radente μ·g con μ = attrito del materiale (ghiaccio 0,2)
          c.vy = 0;
          const frena = attrito * G;
          c.vx = c.vx > frena ? c.vx - frena : c.vx < -frena ? c.vx + frena : 0;
        }
      } else {
        c.vy = -c.vy * P.rimbalzo;
      }
      if (!bloccoX && dx !== 0) c.x = nx; // scivola lungo il pendio
    }
    if (bloccoX) {
      let salito = false;
      if (dy >= 0) {
        // pendio dolce: sale di 1-2 px invece di rimbalzare
        for (let k = 1; k <= 2; k++) if (!capsulaUrta(t, nx, c.y - k)) { c.x = nx; c.y -= k; salito = true; break; }
      }
      if (!salito) c.vx = -c.vx * P.rimbalzo;
    }
    break;
  }
  if ((contattoSotto || capsulaUrta(t, c.x, c.y + 1)) && c.vx * c.vx + c.vy * c.vy < P.velocitaFermo * P.velocitaFermo) {
    c.aTerra = true; c.vx = 0; c.vy = 0;
    const danno = dannoCaduta(c.y - c.yInizioCaduta);
    c.yInizioCaduta = c.y;
    return danno;
  }
  return -1;
}

/** Un pirata fermo a terra controlla di avere ancora il suolo sotto (il cratere può toglierlo). */
export function controllaAppoggio(t: Terreno, c: Corpo): void {
  if (c.aTerra && !capsulaUrta(t, c.x, c.y + 1)) { stacca(c); c.vx = 0; c.vy = 0; }
}

// ─── Espulsione dal solido (caso 7) ──────────────────────────────────────────────────────────────

/** Offset interi entro ESPULSIONE_MAX_PX ordinati per distanza; a parità prima verso l'alto. */
const OFFSET_ESPULSIONE: Int16Array = (() => {
  const v: [number, number, number][] = [];
  const R = ESPULSIONE_MAX_PX;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const d2 = dx * dx + dy * dy;
    if (d2 > 0 && d2 <= R * R) v.push([dx, dy, d2]);
  }
  v.sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]);
  return Int16Array.from(v.flatMap(([dx, dy]) => [dx, dy]));
})();

/**
 * Se il corpo è dentro il solido lo sposta nell'aria più vicina (prima in alto a parità di distanza).
 * Se non c'è aria entro 40 px lo porta su finché non è libero. Restituisce true se l'ha spostato.
 */
export function espelli(t: Terreno, c: Corpo): boolean {
  if (!capsulaUrta(t, c.x, c.y)) return false;
  for (let i = 0; i < OFFSET_ESPULSIONE.length; i += 2) {
    const nx = c.x + OFFSET_ESPULSIONE[i], ny = c.y + OFFSET_ESPULSIONE[i + 1];
    if (!capsulaUrta(t, nx, ny)) { c.x = nx; c.y = ny; c.vx = 0; c.vy = 0; return true; }
  }
  let ny = c.y - ESPULSIONE_MAX_PX;
  while (ny > -MEZZA_ALTEZZA_PIRATA && capsulaUrta(t, c.x, ny)) ny--;
  c.y = ny; c.vx = 0; c.vy = 0;
  return true;
}

// ─── PV e morte ──────────────────────────────────────────────────────────────────────────────────

/** Il pirata conta come vivo in campo (né morto, né annegato, né a terra con 0 PV in attesa della lapide). */
export function inGioco(p: Pirata): boolean {
  return p.stato === 'vivo' && p.vita > 0;
}

/**
 * Toglie PV. A 0 PV il pirata resta `stato: 'vivo'` ma con `vita: 0`: è "a terra" e a fine risoluzione diventa
 * una lapide-barilotto (01 §4); solo allora passa a `stato: 'morto'` con l'evento `morto`.
 */
export function danneggia(p: Pirata, quanto: number, eventi: EventoBattaglia[]): void {
  if (p.stato !== 'vivo' || p.vita <= 0 || quanto <= 0) return;
  const tolti = Math.min(p.vita, quanto);
  p.vita -= tolti;
  p.dannoNelTurno += tolti;
  eventi.push({ t: 'danno', pirata: p.id, quanto: tolti, x: p.x, y: p.y - MEZZA_ALTEZZA_PIRATA - 8 });
}

/** Annega il pirata (muore subito, nessuna lapide): i PV che aveva contano come danno inflitto. */
export function annega(p: Pirata, eventi: EventoBattaglia[]): void {
  if (p.stato !== 'vivo') return;
  if (p.appeso >= 0) { p.appeso = -1; eventi.push({ t: 'staccato', pirata: p.id }); }
  p.dannoNelTurno += p.vita;
  p.vita = 0;
  p.stato = 'annegato';
  p.vx = 0; p.vy = 0;
  eventi.push({ t: 'splash', x: p.x, y: p.y + MEZZA_ALTEZZA_PIRATA, grande: true });
  eventi.push({ t: 'morto', pirata: p.id, causa: 'mare' });
}

/**
 * Un tick di fisica per un pirata in campo (anche a 0 PV: il corpo cade e può essere spinto).
 * `dir` = camminata richiesta, `su` = arrampicata richiesta (solo per il pirata attivo nelle fasi in cui può muoversi).
 */
export function aggiornaPirata(s: StatoBattaglia, p: Pirata, dir: -1 | 0 | 1, eventi: EventoBattaglia[], su: -1 | 0 | 1 = 0): void {
  if (p.stato !== 'vivo') return;
  const t = s.terreno;
  if (p.appeso >= 0 && p.vita <= 0) lascia(t, p, eventi); // a terra con 0 PV: cade giù
  if (p.appeso < 0 && su !== 0 && p.vita > 0) provaAggrappo(s, p, su, eventi);
  if (p.appeso >= 0) {
    if (espelli(t, p)) p.yInizioCaduta = p.y;
    if (aggiornaAppeso(s, p, su, eventi)) {
      if (inAcqua(p, t.mare)) annega(p, eventi);
      return;
    }
    if (inAcqua(p, t.mare)) annega(p, eventi);
    return;
  }
  if (espelli(t, p)) controllaAppoggio(t, p);
  if (p.aTerra) {
    if (dir !== 0 && p.vita > 0) cammina(t, p, dir);
    else controllaAppoggio(t, p);
  } else {
    const danno = vola(t, p);
    if (danno >= 0) {
      eventi.push({ t: 'atterrato', pirata: p.id, dannoCaduta: danno });
      if (danno > 0) danneggia(p, danno, eventi);
    }
  }
  if (inAcqua(p, t.mare)) annega(p, eventi);
}

/** Il pirata è fermo (o fuori dal campo)? */
export function fermo(p: Pirata): boolean {
  return p.stato !== 'vivo' || p.appeso >= 0 || (p.aTerra && p.vx === 0 && p.vy === 0);
}
