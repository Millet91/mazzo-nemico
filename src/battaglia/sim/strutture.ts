// Fase 3 (P1-contratti §7, fase3-strutture.md §3.2): il ponte tagliato da un lato si apre e resta appeso all'altro
// capo. Dopo uno scoppio vicino a un ponte intero si guarda se le sue assi collegano ancora i due ancoraggi (ricerca
// a 4 vicini dentro il rettangolo del ponte e dei due ancoraggi). Se no, le assi ancora attaccate a un capo escono
// dalla maschera (`ponteCalato`; la scala di corda che ne nasce è della Fase 4) e chi c'era sopra cade con 8 PV di
// macerie. Le assi non più attaccate a nessun capo le ha già staccate il sostegno (cadono in blocco).

import type { EventoBattaglia, Rettangolo, StatoBattaglia, Struttura } from '../../core/tipi';
import { MATERIALE } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { macerie } from './pezzi';
import { MEZZA_ALTEZZA_PIRATA, MEZZA_LARGHEZZA_PIRATA } from './terreno';

const dentro = (r: Rettangolo, x: number, y: number) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

/** Distanza² dal punto (x, y) al rettangolo. */
function distanza2(r: Rettangolo, x: number, y: number): number {
  const dx = x < r.x0 ? r.x0 - x : x > r.x1 + 1 ? x - r.x1 - 1 : 0;
  const dy = y < r.y0 ? r.y0 - y : y > r.y1 + 1 ? y - r.y1 - 1 : 0;
  return dx * dx + dy * dy;
}

/** Dopo uno scoppio in (x, y) che può aver scavato fino a `r` px: i ponti tagliati calano. */
export function controllaPonti(s: StatoBattaglia, x: number, y: number, r: number, eventi: EventoBattaglia[]): void {
  if (!s.strutture || s.turno.numero < BIL.crolli.dalTurno) return;
  for (let k = 0; k < s.strutture.length; k++) {
    const st = s.strutture[k];
    if (st.tipo !== 'ponte' || st.stato !== 'intera' || !st.ancoraggi) continue;
    const [a, b] = st.ancoraggi;
    if (Math.min(distanza2(st, x, y), distanza2(a, x, y), distanza2(b, x, y)) > r * r) continue;
    calaSeTagliato(s, k, st, eventi);
  }
}

function calaSeTagliato(s: StatoBattaglia, k: number, st: Struttura, eventi: EventoBattaglia[]): void {
  const t = s.terreno;
  const [a, b] = st.ancoraggi!;
  // zona della ricerca: il rettangolo che contiene ponte e ancoraggi; si passa solo dai pixel dentro uno dei tre
  const zx0 = Math.max(0, Math.min(st.x0, a.x0, b.x0)), zy0 = Math.max(0, Math.min(st.y0, a.y0, b.y0));
  const zx1 = Math.min(t.w - 1, Math.max(st.x1, a.x1, b.x1)), zy1 = Math.min(t.h - 1, Math.max(st.y1, a.y1, b.y1));
  const zw = zx1 - zx0 + 1, zh = zy1 - zy0 + 1;
  const segno = new Uint8Array(zw * zh); // 0 = non visto, 1 = attaccato al capo a, 2 = al capo b
  const inZona = (px: number, py: number) => dentro(st, px, py) || dentro(a, px, py) || dentro(b, px, py);
  const pieno = (px: number, py: number) => t.maschera[py * t.w + px] !== MATERIALE.aria;
  const coda: number[] = [];
  /** riempie da tutti i pixel pieni del capo; true se tocca un pixel segnato dall'altro capo */
  const riempi = (capo: Rettangolo, valore: number): boolean => {
    coda.length = 0;
    for (let py = Math.max(capo.y0, zy0); py <= Math.min(capo.y1, zy1); py++) {
      for (let px = Math.max(capo.x0, zx0); px <= Math.min(capo.x1, zx1); px++) {
        const i = (py - zy0) * zw + (px - zx0);
        if (!pieno(px, py)) continue;
        if (segno[i] !== 0 && segno[i] !== valore) return true;
        if (segno[i] === 0) { segno[i] = valore; coda.push(i); }
      }
    }
    for (let q = 0; q < coda.length; q++) {
      const i = coda[q];
      const lx = i % zw, ly = (i - lx) / zw;
      for (let d = 0; d < 4; d++) {
        const nx = lx + (d === 1 ? -1 : d === 2 ? 1 : 0), ny = ly + (d === 0 ? -1 : d === 3 ? 1 : 0);
        if (nx < 0 || ny < 0 || nx >= zw || ny >= zh) continue;
        const px = nx + zx0, py = ny + zy0;
        if (!inZona(px, py) || !pieno(px, py)) continue;
        const j = ny * zw + nx;
        if (segno[j] === valore) continue;
        if (segno[j] !== 0) return true;
        segno[j] = valore;
        coda.push(j);
      }
    }
    return false;
  };
  if (riempi(a, 1)) return; // le assi collegano ancora i due capi
  if (riempi(b, 2)) return;
  // assi da togliere: attaccate a un capo, dentro il ponte e fuori dagli ancoraggi
  const togli: number[] = [];
  let x0 = t.w, y0 = t.h, x1 = -1, y1 = -1;
  for (let ly = 0; ly < zh; ly++) for (let lx = 0; lx < zw; lx++) {
    if (segno[ly * zw + lx] === 0) continue;
    const px = lx + zx0, py = ly + zy0;
    if (!dentro(st, px, py) || dentro(a, px, py) || dentro(b, px, py)) continue;
    togli.push(py * t.w + px);
    if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
  }
  if (togli.length === 0) return; // niente assi attaccate a un capo: ci ha già pensato il sostegno
  st.stato = 'calata';
  eventi.push({ t: 'ponteCalato', struttura: k });
  // chi ci sta sopra (piedi su un'asse) prende le macerie e cade da solo, perché sotto non c'è più niente
  const sopra = s.pirati.filter((q) => q.stato === 'vivo' && suAsse(q.x, q.y, segno, zx0, zy0, zw, zh, st, a, b));
  for (const i of togli) t.maschera[i] = MATERIALE.aria;
  eventi.push({ t: 'maschera', x0, y0, x1, y1 });
  for (const q of sopra) macerie(q, BIL.macerie.danno, eventi);
}

/** I piedi del pirata (le due righe sotto la capsula) poggiano su un'asse che sta per sparire? */
function suAsse(
  x: number, y: number, segno: Uint8Array, zx0: number, zy0: number, zw: number, zh: number,
  st: Rettangolo, a: Rettangolo, b: Rettangolo,
): boolean {
  const piedi = Math.floor(y) + MEZZA_ALTEZZA_PIRATA;
  for (let py = piedi; py <= piedi + 1; py++) {
    for (let px = Math.floor(x) - MEZZA_LARGHEZZA_PIRATA + 1; px < Math.floor(x) + MEZZA_LARGHEZZA_PIRATA; px++) {
      const lx = px - zx0, ly = py - zy0;
      if (lx < 0 || ly < 0 || lx >= zw || ly >= zh || segno[ly * zw + lx] === 0) continue;
      if (dentro(st, px, py) && !dentro(a, px, py) && !dentro(b, px, py)) return true;
    }
  }
  return false;
}
