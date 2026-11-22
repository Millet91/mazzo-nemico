// Fase 3 (P1-contratti §7): legno che brucia e sabbia che frana.
// Fuoco: dopo uno scoppio (dal turno `dalTurno`), se c'è legno tra il bordo del cratere e `anello × raggio`, lì nasce
// un fuoco. Dopo `durataTick` il legno dentro il cerchio sparisce e si ricontrolla il sostegno (può crollare quello
// che ci poggiava). Non si propaga. Chi è dentro un fuoco quando il turno passa alla risoluzione prende `danno` PV
// (può uccidere: si può scappare). I fuochi non fermano il turno: bruciano anche in quello dopo.
// Sabbia: dopo uno scoppio, nella zona del cratere la sabbia senza niente sotto scende di 1 px a tick (anche in
// diagonale, fino a 45°) finché è ferma o per `franaMaxTick`: i buchi piccoli si chiudono a metà. La sabbia non entra
// dove c'è un pirata vivo o un barile o una cassa. Scende di PASSI_FRANA px a tick, così la frana finisce di solito
// durante l'attesa della risoluzione (0,25 s) e non allunga il turno; il turno passa solo a sabbia ferma.

import type { EventoBattaglia, StatoBattaglia } from '../../core/tipi';
import { MATERIALE } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { franaPasso } from './crolli';
import { controllaSostegno } from './pezzi';
import { controllaPonti } from './strutture';
import { danneggia } from './pirata';
import { MEZZA_ALTEZZA_PIRATA, MEZZA_LARGHEZZA_PIRATA } from './terreno';
import { centroOggetto, eOggetto } from './oggetti';
import { OGGETTO_RAGGIO } from './costanti';

// ─── Fuoco ───────────────────────────────────────────────────────────────────────────────────────

/** Dopo uno scoppio di raggio `raggio` in (x, y): se nell'anello c'è legno, nasce un fuoco. */
export function accendiFuoco(s: StatoBattaglia, x: number, y: number, raggio: number, eventi: EventoBattaglia[]): void {
  if (!s.fuochi || s.turno.numero < BIL.crolli.dalTurno || raggio <= 0) return;
  const r = raggio * BIL.fuoco.anello;
  if (contaLegno(s, x, y, r, false) === 0) return;
  const id = s.prossimoId++;
  s.fuochi.push({ id, x, y, r, finoA: s.tick + BIL.fuoco.durataTick });
  eventi.push({ t: 'fuoco', fuoco: id, x, y, r, inizio: true });
}

/** Pixel di legno nel cerchio (r) attorno a (x, y); con `togli` li toglie dalla maschera. */
function contaLegno(s: StatoBattaglia, x: number, y: number, r: number, togli: boolean): number {
  const { w, h, maschera } = s.terreno;
  const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(w - 1, Math.ceil(x + r));
  const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(h - 1, Math.ceil(y + r));
  let n = 0;
  for (let py = y0; py <= y1; py++) {
    const dy = py + 0.5 - y;
    for (let px = x0; px <= x1; px++) {
      const i = py * w + px;
      if (maschera[i] !== MATERIALE.legno) continue;
      const dx = px + 0.5 - x;
      if (dx * dx + dy * dy > r * r) continue;
      n++;
      if (togli) maschera[i] = MATERIALE.aria;
    }
  }
  return n;
}

/** Un tick per i fuochi: quelli finiti tolgono il legno e ricontrollano il sostegno. */
export function aggiornaFuochi(s: StatoBattaglia, eventi: EventoBattaglia[]): void {
  if (!s.fuochi || s.fuochi.length === 0) return;
  const finiti = s.fuochi.filter((f) => s.tick >= f.finoA);
  if (finiti.length === 0) return;
  s.fuochi = s.fuochi.filter((f) => s.tick < f.finoA);
  for (const f of finiti) {
    eventi.push({ t: 'fuoco', fuoco: f.id, x: f.x, y: f.y, r: f.r, inizio: false });
    if (contaLegno(s, f.x, f.y, f.r, true) === 0) continue;
    eventi.push({
      t: 'maschera', x0: Math.max(0, Math.floor(f.x - f.r)), y0: Math.max(0, Math.floor(f.y - f.r)),
      x1: Math.min(s.terreno.w - 1, Math.ceil(f.x + f.r)), y1: Math.min(s.terreno.h - 1, Math.ceil(f.y + f.r)),
    });
    controllaSostegno(s, f.x, f.y, f.r + 2, eventi);
    controllaPonti(s, f.x, f.y, f.r + 2, eventi);
  }
}

/** Il turno passa alla risoluzione: chi è dentro un fuoco acceso prende il danno del fuoco (una volta per turno). */
export function bruciaPirati(s: StatoBattaglia, eventi: EventoBattaglia[]): void {
  if (!s.fuochi || s.fuochi.length === 0) return;
  for (const q of s.pirati) {
    if (q.stato !== 'vivo') continue;
    if (s.fuochi.some((f) => (q.x - f.x) ** 2 + (q.y - f.y) ** 2 < f.r * f.r)) danneggia(q, BIL.fuoco.danno, eventi);
  }
}

// ─── Sabbia che frana ────────────────────────────────────────────────────────────────────────────

/** Dopo uno scoppio di raggio `raggio` in (x, y): se nella zona del cratere c'è sabbia, parte una frana. */
export function avviaFrana(s: StatoBattaglia, x: number, y: number, raggio: number): void {
  if (!s.frane || raggio <= 0) return;
  // il cratere nella sabbia più la sua profondità di lato: le pareti a 45° arrivano fin lì
  const m = 2 * Math.ceil(raggio * BIL.fisica.moltiplicatoreCratere[MATERIALE.sabbia]) + 4;
  const t = s.terreno;
  const r = {
    x0: Math.max(0, Math.floor(x) - m), y0: Math.max(0, Math.floor(y) - m),
    x1: Math.min(t.w - 1, Math.floor(x) + m), y1: Math.min(t.h - 2, Math.floor(y) + m),
  };
  let sabbia = false;
  for (let py = r.y0; py <= r.y1 && !sabbia; py++) {
    for (let px = r.x0; px <= r.x1; px++) if (t.maschera[py * t.w + px] === MATERIALE.sabbia) { sabbia = true; break; }
  }
  if (sabbia) s.frane.push({ ...r, finoA: s.tick + BIL.sabbia.franaMaxTick });
}

/** px che la sabbia scende a ogni tick (passi di franaPasso) */
const PASSI_FRANA = 8;

/** Un tick per le frane: la sabbia scende di PASSI_FRANA px; finita (ferma o fuori tempo) la frana sparisce. */
export function aggiornaFrane(s: StatoBattaglia, eventi: EventoBattaglia[]): void {
  if (!s.frane || s.frane.length === 0) return;
  const occupato = occupatoDa(s);
  const rimaste = [];
  for (const f of s.frane) {
    const inizio = f.finoA - BIL.sabbia.franaMaxTick;
    if (s.tick === inizio) { rimaste.push(f); continue; } // la sabbia comincia a scendere il tick dopo lo scoppio
    let mosso: ReturnType<typeof franaPasso> = null;
    for (let k = 0; k < PASSI_FRANA; k++) {
      const m = franaPasso(s.terreno, f.x0, f.y0, f.x1, f.y1, s.tick * PASSI_FRANA + k, occupato);
      if (!m) break;
      // al passo dopo può muoversi solo la sabbia accanto a quella mossa: la frana si restringe lì
      f.x0 = m.x0 - 1; f.y0 = m.y0 - 1; f.x1 = m.x1 + 1; f.y1 = m.y1 + 1;
      mosso = mosso ? { x0: Math.min(mosso.x0, m.x0), y0: Math.min(mosso.y0, m.y0), x1: Math.max(mosso.x1, m.x1), y1: Math.max(mosso.y1, m.y1) } : m;
    }
    if (mosso) {
      if (s.tick === inizio + 1) {
        eventi.push({ t: 'frana', x: (mosso.x0 + mosso.x1) >> 1, y: (mosso.y0 + mosso.y1) >> 1 });
      }
      eventi.push({ t: 'maschera', ...mosso });
    }
    if (mosso && s.tick < f.finoA) rimaste.push(f);
  }
  s.frane = rimaste;
}

/** Pixel dove la sabbia non può entrare: le capsule dei pirati vivi e gli oggetti (barili, casse). */
function occupatoDa(s: StatoBattaglia): (x: number, y: number) => boolean {
  const scatole: number[] = [];
  for (const q of s.pirati) {
    if (q.stato !== 'vivo') continue;
    scatole.push(q.x - MEZZA_LARGHEZZA_PIRATA, q.y - MEZZA_ALTEZZA_PIRATA, q.x + MEZZA_LARGHEZZA_PIRATA, q.y + MEZZA_ALTEZZA_PIRATA);
  }
  for (const pr of s.proiettili) {
    if (!eOggetto(pr)) continue;
    const c = centroOggetto(pr);
    scatole.push(c.x - OGGETTO_RAGGIO, c.y - OGGETTO_RAGGIO, c.x + OGGETTO_RAGGIO, c.y + OGGETTO_RAGGIO);
  }
  return (x, y) => {
    for (let k = 0; k < scatole.length; k += 4) {
      if (x + 1 > scatole[k] && x < scatole[k + 2] && y + 1 > scatole[k + 1] && y < scatole[k + 3]) return true;
    }
    return false;
  };
}
