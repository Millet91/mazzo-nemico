// Fase 3 (P1-contratti §7): pezzi che si staccano e cadono. Dopo uno scoppio `controllaSostegno` cerca attorno al
// cratere i pezzi non più appoggiati (sim/crolli.ts); ognuno esce dalla maschera e diventa un PezzoCadente che cade
// dritto (niente rotazioni). Chi tocca prende le macerie (8 PV, un colpo a testa per pezzo, al massimo 20 PV a turno,
// mai l'ultimo PV). Quando tocca il terreno o il mare si frantuma e sparisce: niente pezzi che si riappoggiano.
// Anti-frustrazione: niente crolli prima del turno `dalTurno`; un pezzo non cade se una partenza sta nella sua zona di
// caduta (il pezzo prolungato fino al mare, allargato di `rispettoSpawnPx` per lato e sopra).

import type { EventoBattaglia, PezzoCadente, Pirata, StatoBattaglia } from '../../core/tipi';
import { MATERIALE } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { pezziStaccati, staccaDallaMaschera, type PezzoStaccato } from './crolli';
import { danneggia } from './pirata';
import { MEZZA_ALTEZZA_PIRATA, MEZZA_LARGHEZZA_PIRATA } from './terreno';

/** velocità massima di caduta di un pezzo (px/tick): quella di un colpo a piena potenza */
const VEL_MAX = BIL.fisica.velocitaMaxProiettile;

/** Ci sono pezzi in caduta? (il volo e la risoluzione li aspettano) */
export function pezziInCaduta(s: StatoBattaglia): boolean {
  return s.pezzi !== undefined && s.pezzi.length > 0;
}

/**
 * Dopo uno scoppio in (x, y) che può aver scavato fino a `r` px: stacca i pezzi rimasti senza appoggio.
 * I pezzi più piccoli di `briciolePx` spariscono in polvere (solo l'evento `maschera`).
 */
export function controllaSostegno(s: StatoBattaglia, x: number, y: number, r: number, eventi: EventoBattaglia[]): void {
  if (!s.pezzi || s.turno.numero < BIL.crolli.dalTurno) return;
  const C = BIL.crolli;
  const trovati = pezziStaccati(s.terreno, x, y, r, { pezzoMax: C.pezzoMaxPx, sostegni: s.sostegni, ricercheMax: C.ricercheMax });
  for (const p of trovati) {
    const briciole = p.pixel.length < C.briciolePx;
    if (!briciole && partenzaSotto(s, p)) continue;
    const forma = staccaDallaMaschera(s.terreno, p);
    if (!briciole) {
      const id = s.prossimoId++;
      const pezzo: PezzoCadente = {
        id, tipo: 'blocco', x: p.x0, y: p.y0, vx: 0, vy: 0, w: forma.w, h: forma.h, maschera: forma.maschera,
        daX: p.x0, daY: p.y0, colpiti: [], struttura: -1,
      };
      s.pezzi.push(pezzo);
      eventi.push({ t: 'crollo', pezzo: id, tipo: 'blocco', x: p.x0, y: p.y0, w: forma.w, h: forma.h, materiale: prevalente(forma.maschera) });
    }
    eventi.push({ t: 'maschera', x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1 });
  }
}

/** Una partenza (piedi di un pirata alla nascita) sta nella zona di caduta del pezzo? Allora il pezzo resta. */
function partenzaSotto(s: StatoBattaglia, p: PezzoStaccato): boolean {
  const m = BIL.crolli.rispettoSpawnPx;
  const x0 = p.x0 - m, x1 = p.x1 + m, y0 = p.y0 - m, y1 = s.terreno.mare;
  for (const q of s.partenze ?? []) if (q.x >= x0 && q.x <= x1 && q.y >= y0 && q.y <= y1) return true;
  return false;
}

/** Il materiale più frequente del pezzo (per l'arte delle schegge e il suono). A parità vince il byte più basso. */
function prevalente(forma: Uint8Array): number {
  const conta = new Int32Array(8);
  for (let i = 0; i < forma.length; i++) if (forma[i] > 0 && forma[i] < 8) conta[forma[i]]++;
  let m: number = MATERIALE.roccia, n = 0;
  for (let k = 1; k < 8; k++) if (conta[k] > n) { n = conta[k]; m = k; }
  return m;
}

/** Un tick per i pezzi in caduta: gravità, passi da 1 px, macerie a chi tocca, frantumi a terra o in mare. */
export function aggiornaPezzi(s: StatoBattaglia, eventi: EventoBattaglia[]): void {
  if (!s.pezzi || s.pezzi.length === 0) return;
  const rimasti: PezzoCadente[] = [];
  for (const p of s.pezzi) if (!muovi(s, p, eventi)) rimasti.push(p);
  s.pezzi = rimasti;
}

/** Muove il pezzo di un tick. Restituisce true se si è frantumato (va tolto). */
function muovi(s: StatoBattaglia, p: PezzoCadente, eventi: EventoBattaglia[]): boolean {
  const t = s.terreno;
  p.vy = Math.min(p.vy + BIL.fisica.gravita, VEL_MAX);
  const passi = Math.max(1, Math.ceil(Math.max(Math.abs(p.vx), Math.abs(p.vy))));
  const dx = p.vx / passi, dy = p.vy / passi;
  for (let k = 0; k < passi; k++) {
    const nx = p.x + dx, ny = p.y + dy;
    if (Math.floor(nx) !== Math.floor(p.x) || Math.floor(ny) !== Math.floor(p.y)) {
      if (tocca(s, p, Math.floor(nx), Math.floor(ny))) { frantuma(p, false, eventi); return true; }
    }
    p.x = nx; p.y = ny;
    colpisci(s, p, eventi);
    if (Math.floor(p.y) + fondo(p) >= t.mare) { frantuma(p, true, eventi); return true; }
    if (p.x + p.w < 0 || p.x >= t.w || p.y >= t.h) { frantuma(p, true, eventi); return true; }
  }
  return false;
}

/** Riga più bassa con almeno un pixel pieno (rispetto all'angolo in alto). */
function fondo(p: PezzoCadente): number {
  for (let r = p.h - 1; r >= 0; r--) for (let c = 0; c < p.w; c++) if (p.maschera[r * p.w + c] !== 0) return r;
  return 0;
}

/** Il pezzo con l'angolo in (ix, iy) si sovrappone al terreno? */
function tocca(s: StatoBattaglia, p: PezzoCadente, ix: number, iy: number): boolean {
  const { w, h, maschera } = s.terreno;
  for (let r = 0; r < p.h; r++) {
    const y = iy + r;
    if (y < 0) continue;
    if (y >= h) return true;
    const riga = r * p.w, rigaT = y * w;
    for (let c = 0; c < p.w; c++) {
      if (p.maschera[riga + c] === 0) continue;
      const x = ix + c;
      if (x < 0 || x >= w) continue;
      if (maschera[rigaT + x] !== MATERIALE.aria) return true;
    }
  }
  return false;
}

/** Macerie: ogni pirata vivo che il pezzo tocca (punti della capsula) prende il colpo, una volta per pezzo. */
function colpisci(s: StatoBattaglia, p: PezzoCadente, eventi: EventoBattaglia[]): void {
  const ix = Math.floor(p.x), iy = Math.floor(p.y);
  for (const q of s.pirati) {
    if (q.stato !== 'vivo' || p.colpiti.includes(q.id)) continue;
    if (q.x + MEZZA_LARGHEZZA_PIRATA < ix || q.x - MEZZA_LARGHEZZA_PIRATA >= ix + p.w) continue;
    if (q.y + MEZZA_ALTEZZA_PIRATA < iy || q.y - MEZZA_ALTEZZA_PIRATA >= iy + p.h) continue;
    if (!toccaPirata(p, ix, iy, q)) continue;
    p.colpiti.push(q.id);
    macerie(q, p.tipo === 'masso' ? BIL.macerie.massoDanno : BIL.macerie.danno, eventi);
  }
}

/** Punti della capsula (tre colonne, ogni 4 px in altezza) che cadono su un pixel pieno del pezzo. */
function toccaPirata(p: PezzoCadente, ix: number, iy: number, q: Pirata): boolean {
  for (const ox of [-MEZZA_LARGHEZZA_PIRATA + 1, 0, MEZZA_LARGHEZZA_PIRATA - 1]) {
    const c = Math.floor(q.x + ox) - ix;
    if (c < 0 || c >= p.w) continue;
    for (let oy = -MEZZA_ALTEZZA_PIRATA + 1; oy < MEZZA_ALTEZZA_PIRATA; oy += 4) {
      const r = Math.floor(q.y + oy) - iy;
      if (r < 0 || r >= p.h) continue;
      if (p.maschera[r * p.w + c] !== 0) return true;
    }
  }
  return false;
}

/** Danno da macerie: tetto di BIL.macerie.maxPerTurno a turno, e lascia sempre almeno 1 PV (mai morte sicura). */
export function macerie(q: Pirata, quanto: number, eventi: EventoBattaglia[]): number {
  const preso = q.macerieNelTurno ?? 0;
  const d = Math.min(quanto, BIL.macerie.maxPerTurno - preso, q.vita - 1);
  if (d <= 0) return 0;
  q.macerieNelTurno = preso + d;
  danneggia(q, d, eventi);
  return d;
}

/** Il pezzo si frantuma: evento `macerie` al centro del suo lato basso. */
function frantuma(p: PezzoCadente, inMare: boolean, eventi: EventoBattaglia[]): void {
  eventi.push({
    t: 'macerie', pezzo: p.id, x: Math.floor(p.x) + (p.w >> 1), y: Math.floor(p.y) + fondo(p), inMare,
    materiale: prevalente(p.maschera),
  });
}

/** Fine forzata (risoluzione oltre il tetto, battaglia finita): tutti i pezzi in caduta si frantumano dove sono. */
export function frantumaTutti(s: StatoBattaglia, eventi: EventoBattaglia[]): void {
  if (!s.pezzi || s.pezzi.length === 0) return;
  for (const p of s.pezzi) frantuma(p, false, eventi);
  s.pezzi = [];
}
