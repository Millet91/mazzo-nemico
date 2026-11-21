// simulaColpo (per l'IA) e traiettoria (linea tratteggiata). Non mutano lo stato e non copiano la maschera:
// il terreno si legge soltanto. Per questo simulaColpo è un'ANTEPRIMA: non scava i crateri, quindi un pirata che
// cadrebbe nel buco appena aperto resta sul bordo. Danni, spinte, annegamenti e danno da caduta sono quelli veri.

import type { EsitoColpo, IdArma, PianoColpo, Punto, StatoBattaglia } from '../../core/tipi';
import { ARMA } from '../../contenuti/armi';
import { BIL, TICK_AL_SECONDO } from '../../contenuti/bilanciamento';
import { coseno, normalizza, seno } from '../../core/trig';
import { bocca, colpitiMischia, fisicaDi, spintaMischia, velocitaIniziale } from './armi';
import { dannoArma, direzioneSpinta, effettoEsplosione } from './esplosione';
import { inAcqua, vola, type Corpo } from './pirata';
import { muoviProiettile, raggio, type Bersaglio, type CorpoProiettile } from './proiettili';
import { ASSESTAMENTO_TICK } from './costanti';

interface Copia extends Corpo { id: number; vita: number; mosso: boolean }

function esitoVuoto(): EsitoColpo {
  return { danni: {}, uccisi: [], annegati: [], impatto: null, tick: 0 };
}

export function simulaColpo(s: StatoBattaglia, piano: PianoColpo): EsitoColpo {
  const io = s.pirati.find((p) => p.id === piano.pirata);
  if (!io || io.stato !== 'vivo') return esitoVuoto();
  const a = ARMA[piano.arma];
  const ciurma = s.squadre[io.squadra].ciurma;
  const t = s.terreno;
  const copie: Copia[] = s.pirati
    .filter((p) => p.stato === 'vivo')
    .map((p) => ({ id: p.id, x: p.x, y: p.y, vx: p.vx, vy: p.vy, aTerra: p.aTerra, yInizioCaduta: p.yInizioCaduta, vita: p.vita, mosso: false }));
  const danni: Record<number, number> = {};
  const aggiungiDanno = (id: number, d: number) => { danni[id] = (danni[id] ?? 0) + d; };
  const spingi = (c: Copia, vx: number, vy: number) => {
    if (c.aTerra) { c.aTerra = false; c.yInizioCaduta = c.y; }
    c.vx += vx; c.vy += vy; c.mosso = true;
  };
  const mg = normalizza(piano.mezziGradi);
  let impatto: Punto | null = null;
  let tick = 0;
  const maxTick = piano.maxTick ?? Infinity;

  const esplosione = (x: number, y: number) => {
    impatto = { x, y };
    const danno = dannoArma(a.id, ciurma);
    const spinta = a.danno * BIL.fisica.spintaPerDanno;
    for (const c of copie) {
      const e = effettoEsplosione(x, y, a.raggio, danno, spinta, c.x, c.y);
      if (!e) continue;
      spingi(c, e.vx, e.vy);
      aggiungiDanno(c.id, e.danno);
    }
  };

  switch (a.tipo) {
    case 'balistica':
    case 'lancio': {
      const b = bocca(t, io.x, io.y, mg);
      if (b.bloccato && a.tipo === 'balistica') { esplosione(b.x, b.y); break; }
      const v = velocitaIniziale(mg, a.usaPotenza ? piano.potenza : 100);
      const pr: CorpoProiettile = { x: b.x, y: b.y, vx: v.vx, vy: v.vy, fermo: false };
      const f = fisicaDi(a.id);
      const miccia = a.miccia ? (piano.miccia ?? s.turno.miccia) * TICK_AL_SECONDO : -1;
      const limite = Math.min(maxTick, miccia >= 0 ? miccia : 20 * TICK_AL_SECONDO);
      const bersagli: Bersaglio[] = copie;
      while (tick < limite) {
        tick++;
        const u = muoviProiettile(t, t.mare, s.vento, pr, f, bersagli);
        if (u && u.tipo === 'mare') break;
        if (u && (u.tipo === 'terreno' || u.tipo === 'pirata')) { esplosione(u.x, u.y); break; }
        if (miccia >= 0 && tick >= miccia) { esplosione(pr.x, pr.y); break; }
      }
      break;
    }
    case 'istantanea': {
      const dx = coseno(mg), dy = -seno(mg);
      const spinta = (a.spintaFissa ?? 0) / TICK_AL_SECONDO;
      for (let k = 0; k < (a.colpi ?? 1); k++) {
        const r = raggio(t, io.x, io.y, dx, dy, a.portata ?? 500, copie, io.id);
        if (k === 0) impatto = { x: r.x, y: r.y };
        if (r.pirata < 0) continue;
        const c = copie.find((x) => x.id === r.pirata)!;
        const dir = direzioneSpinta(io.x, io.y, c.x, c.y);
        spingi(c, dir.x * spinta, dir.y * spinta);
        aggiungiDanno(c.id, dannoArma(a.id, ciurma));
      }
      tick = (a.colpi ?? 1) * (a.intervalloColpi ?? 1);
      break;
    }
    case 'mischia': {
      // il verso viene dall'angolo del piano (0 = destra, 360 = sinistra), come fa il comando `mira`
      const verso: 1 | -1 = coseno(mg) < 0 ? -1 : 1;
      const colpiti = colpitiMischia(s.pirati, { ...io, verso }, a.portata ?? 30);
      const sp = spintaMischia(a, verso);
      for (const q of colpiti) {
        const c = copie.find((x) => x.id === q.id)!;
        spingi(c, sp.vx, sp.vy);
        aggiungiDanno(c.id, dannoArma(a.id, ciurma));
      }
      impatto = { x: io.x + verso * (a.portata ?? 30), y: io.y };
      break;
    }
    default:
      break;
  }

  // assestamento: chi è stato spinto vola, atterra (danno da caduta) o finisce in mare
  const annegati: number[] = [];
  const mossi = copie.filter((c) => c.mosso);
  for (let i = 0; i < ASSESTAMENTO_TICK && mossi.length > 0 && tick < maxTick; i++) {
    tick++;
    for (let j = mossi.length - 1; j >= 0; j--) {
      const c = mossi[j];
      const d = vola(t, c);
      if (inAcqua(c, t.mare)) { annegati.push(c.id); mossi.splice(j, 1); continue; }
      if (d >= 0) { if (d > 0) aggiungiDanno(c.id, d); mossi.splice(j, 1); }
    }
  }
  const uccisi: number[] = [];
  for (const c of copie) {
    if (annegati.includes(c.id)) continue;
    if (c.vita > 0 && (danni[c.id] ?? 0) >= c.vita) uccisi.push(c.id);
  }
  // i danni oltre i PV non contano
  for (const c of copie) if (danni[c.id] !== undefined) danni[c.id] = Math.min(danni[c.id], c.vita);
  annegati.sort((x, y) => x - y);
  return { danni, uccisi, annegati, impatto, tick };
}

/**
 * Punti della traiettoria prevista dell'arma del turno, con vento e terreno veri, un punto ogni 3 tick, fino al
 * primo urto (compreso) o a `maxPunti`. Pistola: linea dritta fino alla portata. Sciabola: nessun punto.
 */
export function traiettoria(s: StatoBattaglia, maxPunti = 60): Punto[] {
  const p = s.pirati.find((x) => x.id === s.turno.pirata);
  if (!p || p.stato !== 'vivo' || maxPunti <= 0) return [];
  const arma: IdArma = s.turno.arma;
  const a = ARMA[arma];
  const t = s.terreno;
  const mg = s.turno.mira.mezziGradi;
  const out: Punto[] = [];
  if (a.tipo === 'istantanea') {
    const dx = coseno(mg), dy = -seno(mg);
    const r = raggio(t, p.x, p.y, dx, dy, a.portata ?? 500, s.pirati.filter((q) => q.stato === 'vivo'), p.id);
    const passi = Math.min(maxPunti, 20);
    for (let i = 1; i <= passi; i++) out.push({ x: p.x + ((r.x - p.x) * i) / passi, y: p.y + ((r.y - p.y) * i) / passi });
    return out;
  }
  if (a.tipo !== 'balistica' && a.tipo !== 'lancio') return out;
  const b = bocca(t, p.x, p.y, mg);
  if (b.bloccato) return [{ x: b.x, y: b.y }];
  const v = velocitaIniziale(mg, a.usaPotenza ? s.turno.mira.potenza : 100);
  const pr: CorpoProiettile = { x: b.x, y: b.y, vx: v.vx, vy: v.vy, fermo: false };
  // per la linea: si ferma al primo urto anche la granata
  const f = { ...fisicaDi(arma), rimbalzo: null };
  const bersagli = s.pirati.filter((q) => q.stato === 'vivo' && q.id !== p.id);
  for (let i = 1; i <= maxPunti * 3; i++) {
    const u = muoviProiettile(t, t.mare, s.vento, pr, f, bersagli);
    if (u) { out.push({ x: u.x, y: u.y }); break; }
    if (i % 3 === 0) { out.push({ x: pr.x, y: pr.y }); if (out.length >= maxPunti) break; }
  }
  return out;
}
