// Scenari e fisica ideale per i test dell'IA. La fisica finta serve finché la sim vera (agente A) non c'è:
// stessa balistica di 00 §1.2 (gravità, vento solo sulle armi col vento, passo di Eulero per tick),
// esplosione D × (1 − d/r) con minimo 1, niente rimbalzi né spinte. Non sostituisce la sim nei test finali.

import type { ConfigBattaglia, EsitoColpo, MappaGenerata, PianoColpo, Punto, StatoBattaglia } from '../../src/core/tipi';
import { MATERIALE, VERSIONE_REGOLE } from '../../src/core/tipi';
import { BIL } from '../../src/contenuti/bilanciamento';
import { ARMA } from '../../src/contenuti/armi';
import { coseno, seno } from '../../src/core/trig';
import { creaBattaglia } from '../../src/battaglia/sim';

const { larghezza: W, altezza: H, inizioFondale } = BIL.mondo;
export const SUOLO = 600;

/** Isola piatta da x 200 a 1848 col suolo a y = SUOLO, più muri opzionali (x0, x1, cima). */
export function mappaPiatta(spawn: [Punto[], Punto[]], muri: [number, number, number][] = []): MappaGenerata {
  const m = new Uint8Array(W * H); // 0 = aria
  for (let y = SUOLO; y < inizioFondale; y++) m.fill(MATERIALE.terra, y * W + 200, y * W + W - 200);
  m.fill(MATERIALE.ferro, inizioFondale * W);
  for (const [x0, x1, cima] of muri) for (let y = cima; y < SUOLO; y++) m.fill(MATERIALE.roccia, y * W + x0, y * W + x1);
  return { terreno: { w: W, h: H, maschera: m, mare: BIL.mondo.mareIniziale }, spawn, bioma: 'isola', semeUsato: 1, tentativi: 1, specchiata: false, decorazioni: [] };
}

export function config(seme = 7): ConfigBattaglia {
  return {
    versioneRegole: VERSIONE_REGOLE, seme, bioma: 'isola', timerSecondi: 30, traiettoriaCompleta: true,
    squadre: [
      { ciurma: 'teschio', ruolo: 'attaccante', controllo: 'umano', pirati: 1 },
      { ciurma: 'marina', ruolo: 'difensore', controllo: 'ia', livelloIa: 'mozzo', pirati: 1 },
    ],
  };
}

/** Uno contro uno sulla piatta: l'IA (squadra 1) in `xIa`, il bersaglio (squadra 0) in `xBersaglio`. Tocca all'IA. */
export function duello(xBersaglio: number, xIa: number, opz: { seme?: number; vento?: number; muri?: [number, number, number][] } = {}): StatoBattaglia {
  const spawn: [Punto[], Punto[]] = [[{ x: xBersaglio, y: SUOLO }], [{ x: xIa, y: SUOLO }]];
  const s = creaBattaglia(config(opz.seme ?? 7), mappaPiatta(spawn, opz.muri));
  const ia = s.pirati.find((p) => p.squadra === 1)!;
  s.turno.squadra = 1;
  s.turno.pirata = ia.id;
  s.turno.fase = 'azione';
  s.vento = opz.vento ?? 0;
  return s;
}

function dentro(q: { x: number; y: number }, x: number, y: number): boolean {
  return Math.abs(x - q.x) <= BIL.pirata.capsulaLarghezza / 2 && Math.abs(y - q.y) <= BIL.pirata.capsulaAltezza / 2;
}

function solido(s: StatoBattaglia, x: number, y: number): boolean {
  const xi = Math.floor(x), yi = Math.floor(y);
  if (xi < 0 || xi >= s.terreno.w || yi < 0) return false;
  if (yi >= s.terreno.h) return true;
  return s.terreno.maschera[yi * s.terreno.w + xi] !== MATERIALE.aria;
}

function esplosione(s: StatoBattaglia, x: number, y: number, danno: number, raggio: number, tick: number): EsitoColpo {
  const danni: Record<number, number> = {};
  const uccisi: number[] = [];
  for (const q of s.pirati) {
    if (q.stato !== 'vivo') continue;
    const d = Math.sqrt((q.x - x) ** 2 + (q.y - y) ** 2);
    if (d >= raggio) continue;
    const dn = Math.max(1, Math.floor(danno * (1 - d / raggio)));
    danni[q.id] = dn;
    if (dn >= q.vita) uccisi.push(q.id);
  }
  return { danni, uccisi, annegati: [], impatto: { x, y }, tick };
}

/** Fisica ideale: stessa firma di simulaColpo. */
export function simulaIdeale(s: StatoBattaglia, c: PianoColpo): EsitoColpo {
  const io = s.pirati.find((p) => p.id === c.pirata)!;
  const a = ARMA[c.arma];
  const vuoto: EsitoColpo = { danni: {}, uccisi: [], annegati: [], impatto: null, tick: 0 };
  if (a.tipo === 'mischia') {
    const dir = coseno(c.mezziGradi) >= 0 ? 1 : -1;
    const danni: Record<number, number> = {};
    const uccisi: number[] = [];
    for (const q of s.pirati) if (q.id !== io.id && q.stato === 'vivo' && (q.x - io.x) * dir >= 0 && Math.abs(q.x - io.x) <= (a.portata ?? 30) + 6 && Math.abs(q.y - io.y) < 22) {
      danni[q.id] = a.danno; if (a.danno >= q.vita) uccisi.push(q.id);
    }
    return { danni, uccisi, annegati: [], impatto: { x: io.x + dir * 20, y: io.y }, tick: 1 };
  }
  if (a.tipo === 'istantanea') {
    const dx = coseno(c.mezziGradi), dy = -seno(c.mezziGradi);
    for (let d = 8; d <= (a.portata ?? 500); d++) {
      const x = io.x + dx * d, y = io.y + dy * d;
      const q = s.pirati.find((p) => p.id !== io.id && p.stato === 'vivo' && dentro(p, x, y));
      if (q) { const dn = a.danno * (a.colpi ?? 1); return { danni: { [q.id]: dn }, uccisi: dn >= q.vita ? [q.id] : [], annegati: [], impatto: { x, y }, tick: 1 }; }
      if (solido(s, x, y)) return { ...vuoto, impatto: { x, y }, tick: 1 };
    }
    return vuoto;
  }
  const v = (BIL.fisica.velocitaMaxProiettile * c.potenza) / 100;
  let x = io.x, y = io.y, vx = coseno(c.mezziGradi) * v, vy = -seno(c.mezziGradi) * v;
  const ax = a.vento ? s.vento * BIL.fisica.ventoPerPunto : 0;
  for (let t = 1; t < 1200; t++) {
    vy += BIL.fisica.gravita; vx += ax;
    const passi = Math.max(1, Math.ceil(Math.sqrt(vx * vx + vy * vy)));
    for (let i = 0; i < passi; i++) {
      x += vx / passi; y += vy / passi;
      if (x < 0 || x >= s.terreno.w || y >= s.terreno.mare) return { ...vuoto, tick: t };
      const colpito = s.pirati.some((p) => p.stato === 'vivo' && (p.id !== io.id || t > 10) && dentro(p, x, y));
      if (colpito || solido(s, x, y)) return esplosione(s, x, y, a.danno, a.raggio, t);
    }
  }
  return vuoto;
}

/** Conta le chiamate al simulatore. */
export function contatore(sim: (s: StatoBattaglia, c: PianoColpo) => EsitoColpo) {
  const c = { chiamate: 0, sim: (s: StatoBattaglia, p: PianoColpo) => { c.chiamate++; return sim(s, p); } };
  return c;
}
