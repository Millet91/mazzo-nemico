// Fase 3 (P1-contratti §7): pezzi che si staccano e cadono. Dopo uno scoppio `controllaSostegno` cerca attorno al
// cratere i pezzi non più appoggiati (sim/crolli.ts); ognuno esce dalla maschera e diventa un PezzoCadente che cade
// dritto (niente rotazioni). Chi tocca prende le macerie (8 PV, un colpo a testa per pezzo, al massimo 20 PV a turno,
// mai l'ultimo PV). Quando tocca il terreno o il mare si frantuma e sparisce: niente pezzi che si riappoggiano.
// Anti-frustrazione: niente crolli prima del turno `dalTurno`; un pezzo non cade se una partenza sta nella sua zona di
// caduta (il pezzo prolungato fino al mare, allargato di `rispettoSpawnPx` per lato e sopra).

import type { EventoBattaglia, PezzoCadente, Pirata, Rettangolo, StatoBattaglia } from '../../core/tipi';
import { MATERIALE } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { pezziStaccati, staccaDallaMaschera, type PezzoStaccato } from './crolli';
import { danneggia, staccaPirata } from './pirata';
import { MEZZA_ALTEZZA_PIRATA, MEZZA_LARGHEZZA_PIRATA } from './terreno';

/** velocità massima di caduta di un pezzo (px/tick): quella di un colpo a piena potenza */
const VEL_MAX = BIL.fisica.velocitaMaxProiettile;

/** Ci sono pezzi in caduta? (il volo e la risoluzione li aspettano) */
export function pezziInCaduta(s: StatoBattaglia): boolean {
  return s.pezzi !== undefined && s.pezzi.length > 0;
}

/**
 * Dopo uno scoppio in (x, y) che può aver scavato fino a `r` px: stacca i pezzi rimasti senza appoggio.
 * I pezzi più piccoli di `briciolePx` spariscono in polvere (solo l'evento `maschera`). Strutture della mappa:
 * il pezzo che contiene il centro di un masso si divide (il masso rotola, il resto cade); il pezzo che sta per più di
 * metà dentro una torre cade con la spinta di lato, dalla parte opposta al colpo. I capi dei ponti contano come sostegni.
 */
export function controllaSostegno(s: StatoBattaglia, x: number, y: number, r: number, eventi: EventoBattaglia[]): void {
  if (!s.pezzi || s.turno.numero < BIL.crolli.dalTurno) return;
  const C = BIL.crolli;
  const trovati = pezziStaccati(s.terreno, x, y, r, { pezzoMax: C.pezzoMaxPx, sostegni: sostegniDi(s), ricercheMax: C.ricercheMax });
  const strutture = s.strutture ?? [];
  for (const p of trovati) {
    const briciole = p.pixel.length < C.briciolePx;
    if (!briciole && partenzaSotto(s, p)) continue;
    eventi.push({ t: 'maschera', x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1 });
    if (briciole) { staccaDallaMaschera(s.terreno, p); continue; }
    const im = massoIn(s, p);
    if (im >= 0) {
      const st = strutture[im];
      st.stato = 'caduta';
      const dentro: number[] = [], fuori: number[] = [];
      for (const i of p.pixel) {
        const px = i % s.terreno.w, py = (i - px) / s.terreno.w;
        (px >= st.x0 && px <= st.x1 && py >= st.y0 && py <= st.y1 ? dentro : fuori).push(i);
      }
      if (fuori.length) creaPezzo(s, parte(s.terreno.w, fuori), 'blocco', -1, 0, eventi);
      creaPezzo(s, parte(s.terreno.w, dentro), 'masso', im, 0, eventi);
      continue;
    }
    const is = strutturaDi(s, p);
    let vx = 0;
    if (is >= 0) {
      const st = strutture[is];
      st.stato = 'caduta';
      if (st.tipo === 'torre') vx = ((p.x0 + p.x1) / 2 >= x ? 1 : -1) * C.spintaTorre;
    }
    creaPezzo(s, p, 'blocco', is, vx, eventi);
  }
}

/** Sostegni della ricerca: quelli della mappa più i capi dei ponti ancora interi. */
function sostegniDi(s: StatoBattaglia): Rettangolo[] {
  const out = s.sostegni ? s.sostegni.slice() : [];
  for (const st of s.strutture ?? []) if (st.tipo === 'ponte' && st.stato === 'intera' && st.ancoraggi) out.push(st.ancoraggi[0], st.ancoraggi[1]);
  return out;
}

/** Indice del masso intero il cui pixel centrale sta nel pezzo, o −1. */
function massoIn(s: StatoBattaglia, p: PezzoStaccato): number {
  const strutture = s.strutture ?? [];
  for (let k = 0; k < strutture.length; k++) {
    const st = strutture[k];
    if (st.tipo !== 'masso' || st.stato !== 'intera') continue;
    const cx = (st.x0 + st.x1) >> 1, cy = (st.y0 + st.y1) >> 1;
    if (cx < p.x0 || cx > p.x1 || cy < p.y0 || cy > p.y1) continue;
    const c = cy * s.terreno.w + cx;
    for (const i of p.pixel) if (i === c) return k;
  }
  return -1;
}

/** Struttura (non masso) con più pixel del pezzo nel suo rettangolo, se ne ha almeno metà; altrimenti −1. */
function strutturaDi(s: StatoBattaglia, p: PezzoStaccato): number {
  const strutture = s.strutture ?? [];
  let meglio = -1, max = 0;
  for (let k = 0; k < strutture.length; k++) {
    const st = strutture[k];
    if (st.tipo === 'masso' || st.stato !== 'intera') continue;
    if (st.x1 < p.x0 || st.x0 > p.x1 || st.y1 < p.y0 || st.y0 > p.y1) continue;
    let n = 0;
    for (const i of p.pixel) {
      const px = i % s.terreno.w, py = (i - px) / s.terreno.w;
      if (px >= st.x0 && px <= st.x1 && py >= st.y0 && py <= st.y1) n++;
    }
    if (n > max) { max = n; meglio = k; }
  }
  return 2 * max >= p.pixel.length ? meglio : -1;
}

/** Un sottoinsieme dei pixel di un pezzo, col suo rettangolo. */
function parte(w: number, pixel: number[]): PezzoStaccato {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const i of pixel) {
    const px = i % w, py = (i - px) / w;
    if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
  }
  return { pixel: Int32Array.from(pixel), x0, y0, x1, y1 };
}

/**
 * Toglie il pezzo dalla maschera e, se non è briciola, lo mette tra i pezzi che cadono con l'evento `crollo`.
 * Restituisce il pezzo creato, o null (briciole: polvere).
 */
export function creaPezzo(
  s: StatoBattaglia, p: PezzoStaccato, tipo: 'blocco' | 'masso', struttura: number, vx: number, eventi: EventoBattaglia[],
): PezzoCadente | null {
  const forma = staccaDallaMaschera(s.terreno, p);
  if (p.pixel.length < BIL.crolli.briciolePx) return null;
  const id = s.prossimoId++;
  const pezzo: PezzoCadente = {
    id, tipo, x: p.x0, y: p.y0, vx, vy: 0, w: forma.w, h: forma.h, maschera: forma.maschera,
    daX: p.x0, daY: p.y0, colpiti: [], struttura,
  };
  s.pezzi!.push(pezzo);
  eventi.push({ t: 'crollo', pezzo: id, tipo, x: p.x0, y: p.y0, w: forma.w, h: forma.h, materiale: prevalente(forma.maschera) });
  return pezzo;
}

/**
 * Una partenza (piedi di un pirata alla nascita) sta nella zona di caduta del pezzo? Allora il pezzo resta.
 * Decisione del Lead (P1-contratti §7): zona colonna per colonna e solo SOTTO il pezzo, cioè per ogni colonna da sotto
 * il suo ultimo pixel pieno fino al mare, allargata di `rispettoSpawnPx` per lato. Una partenza accanto al pezzo (alla
 * stessa quota) non lo blocca; stare sopra il pezzo non lo protegge (il ponte può cadere con chi c'è sopra).
 */
function partenzaSotto(s: StatoBattaglia, p: PezzoStaccato): boolean {
  const partenze = s.partenze ?? [];
  if (partenze.length === 0) return false;
  const m = BIL.crolli.rispettoSpawnPx;
  const pw = p.x1 - p.x0 + 1, w = s.terreno.w;
  const fondoCol = new Int32Array(pw).fill(-1);
  for (const i of p.pixel) {
    const px = i % w, py = (i - px) / w;
    if (py > fondoCol[px - p.x0]) fondoCol[px - p.x0] = py;
  }
  for (const q of partenze) {
    if (q.y >= s.terreno.mare) continue;
    const qx = Math.floor(q.x);
    for (let x = Math.max(p.x0, qx - m); x <= Math.min(p.x1, qx + m); x++) {
      const f = fondoCol[x - p.x0];
      if (f >= 0 && q.y > f) return true;
    }
  }
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
  for (const p of s.pezzi) if (!(p.tipo === 'masso' ? rotola(s, p, eventi) : muovi(s, p, eventi))) rimasti.push(p);
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

// ─── Masso che rotola ────────────────────────────────────────────────────────────────────────────
// Corpo tondo (raggio dall'area della forma): gravità, esce dal terreno lungo la normale (media dei pixel pieni dentro
// il cerchio), rimbalzo basso e poco attrito, così scende lungo i pendii. Si frantuma quando si ferma o tocca il mare.

/** frazione della velocità contro il terreno che torna indietro */
const RIMBALZO_MASSO = 0.2;
/** frenata di rotolamento a contatto col terreno (px/tick²): circa la gravità lungo un pendio di 21°, quindi su un
 * pendio più dolce il masso rallenta e si ferma, su uno più ripido continua ad accelerare */
const FRENATA_MASSO = 0.06;
/** sotto questa velocità (px/tick), a contatto col terreno, il masso è fermo */
const FERMO_MASSO = 0.12;

/** Raggio del masso: quello del cerchio con la stessa area della forma. */
function raggioMasso(p: PezzoCadente): number {
  let n = 0;
  for (let i = 0; i < p.maschera.length; i++) if (p.maschera[i] !== 0) n++;
  return Math.max(1, Math.sqrt(n / Math.PI));
}

/** Somma dei vettori dai pixel pieni del terreno dentro il cerchio al centro; n = quanti sono. */
function dentroCerchio(s: StatoBattaglia, cx: number, cy: number, r: number): { nx: number; ny: number; n: number } {
  const { w, h, maschera } = s.terreno;
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.floor(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.floor(cy + r));
  let nx = 0, ny = 0, n = 0;
  const r2 = r * r;
  for (let py = y0; py <= y1; py++) {
    const dy = cy - (py + 0.5);
    for (let px = x0; px <= x1; px++) {
      if (maschera[py * w + px] === MATERIALE.aria) continue;
      const dx = cx - (px + 0.5);
      if (dx * dx + dy * dy > r2) continue;
      nx += dx; ny += dy; n++;
    }
  }
  return { nx, ny, n };
}

/** Un tick del masso. Restituisce true se si è frantumato (va tolto). */
function rotola(s: StatoBattaglia, p: PezzoCadente, eventi: EventoBattaglia[]): boolean {
  const t = s.terreno;
  const r = raggioMasso(p);
  let cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  p.vy += BIL.fisica.gravita;
  const v = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
  if (v > VEL_MAX) { p.vx *= VEL_MAX / v; p.vy *= VEL_MAX / v; }
  const passi = Math.max(1, Math.ceil(Math.max(Math.abs(p.vx), Math.abs(p.vy))));
  let toccato = false;
  for (let k = 0; k < passi; k++) {
    cx += p.vx / passi; cy += p.vy / passi;
    let c = dentroCerchio(s, cx, cy, r);
    if (c.n > 0) {
      toccato = true;
      const l = Math.sqrt(c.nx * c.nx + c.ny * c.ny);
      const nx = l > 1e-6 ? c.nx / l : 0, ny = l > 1e-6 ? c.ny / l : -1;
      // fuori dal terreno lungo la normale, a mezzi pixel
      for (let j = 0; j < 4 * r && c.n > 0; j++) { cx += nx * 0.5; cy += ny * 0.5; c = dentroCerchio(s, cx, cy, r); }
      if (c.n > 0) { p.x = cx - p.w / 2; p.y = cy - p.h / 2; frantuma(p, false, eventi); return true; } // incastrato
      const vn = p.vx * nx + p.vy * ny;
      if (vn < 0) { p.vx -= (1 + RIMBALZO_MASSO) * vn * nx; p.vy -= (1 + RIMBALZO_MASSO) * vn * ny; }
    }
    p.x = cx - p.w / 2; p.y = cy - p.h / 2;
    colpisciMasso(s, p, cx, cy, r, eventi);
    if (cy + r >= t.mare) { frantuma(p, true, eventi); return true; }
    if (cx + r < 0 || cx - r >= t.w || cy - r >= t.h) { frantuma(p, true, eventi); return true; }
  }
  if (toccato) {
    const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (sp < FERMO_MASSO + FRENATA_MASSO) { frantuma(p, false, eventi); return true; }
    p.vx *= (sp - FRENATA_MASSO) / sp; p.vy *= (sp - FRENATA_MASSO) / sp;
  }
  return false;
}

/** Il masso colpisce chi tocca (cerchio contro capsula): danno del masso e spinta nel verso in cui rotola. */
function colpisciMasso(s: StatoBattaglia, p: PezzoCadente, cx: number, cy: number, r: number, eventi: EventoBattaglia[]): void {
  const meta = MEZZA_ALTEZZA_PIRATA - MEZZA_LARGHEZZA_PIRATA;
  const lim = r + MEZZA_LARGHEZZA_PIRATA;
  for (const q of s.pirati) {
    if (q.stato !== 'vivo' || p.colpiti.includes(q.id)) continue;
    const dx = cx - q.x, dy = cy - Math.max(q.y - meta, Math.min(q.y + meta, cy));
    if (dx * dx + dy * dy >= lim * lim) continue;
    p.colpiti.push(q.id);
    macerie(q, BIL.macerie.massoDanno, eventi);
    const verso = p.vx > 0 ? 1 : p.vx < 0 ? -1 : (q.x >= cx ? 1 : -1);
    staccaPirata(q, eventi, s.tick);
    q.vx += verso * BIL.macerie.massoSpinta;
    q.vy -= BIL.macerie.massoSpinta / 2;
  }
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
    macerie(q, BIL.macerie.danno, eventi);
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
