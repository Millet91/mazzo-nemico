// Le armi come comportamenti generici guidati da ARMA (contenuti/armi.ts): balistica, lancio con miccia e
// rimbalzo, istantanea a più colpi, mischia con spinta fissa. In M1 servono cannone, granata, pistola, sciabola.

import type { EventoBattaglia, IdArma, Pirata, Proiettile, StatoBattaglia, Terreno, TipoProiettile } from '../../core/tipi';
import { ARMA, type DefArma } from '../../contenuti/armi';
import { BIL, TICK_AL_SECONDO } from '../../contenuti/bilanciamento';
import { coseno, daGradi, seno } from '../../core/trig';
import { solido, scavaCratere, MEZZA_ALTEZZA_PIRATA, MEZZA_LARGHEZZA_PIRATA } from './terreno';
import { danneggia, staccaPirata } from './pirata';
import { dannoArma, direzioneSpinta, esplodi } from './esplosione';
import { raggio, type Bersaglio, type FisicaProiettile } from './proiettili';
import { BOCCA_PX } from './costanti';
import { accendiOggetto, bersagliOggetti, idProiettileDaBersaglio } from './oggetti';

/** Fisica del proiettile di un'arma (o della lapide). */
export function fisicaDi(arma: IdArma | 'lapide'): FisicaProiettile {
  // lapide e barile (quando il terreno sotto sparisce) cadono e rimbalzano come un pirata
  if (arma === 'lapide' || arma === 'barile') return { vento: false, rimbalzo: BIL.pirata.rimbalzo, colpiscePirati: false };
  const a = ARMA[arma];
  return { vento: a.vento, rimbalzo: a.rimbalzo ?? null, colpiscePirati: a.tipo === 'balistica' };
}

function tipoProiettile(a: DefArma): TipoProiettile {
  return a.tipo === 'lancio' ? 'granata' : 'palla';
}

/** Velocità iniziale di un tiro: angolo in mezzi gradi assoluti, potenza 0-100. */
export function velocitaIniziale(mezziGradi: number, potenza: number): { vx: number; vy: number } {
  const v = (BIL.fisica.velocitaMaxProiettile * potenza) / 100;
  return { vx: coseno(mezziGradi) * v, vy: -seno(mezziGradi) * v };
}

/**
 * Punto in cui nasce il proiettile: a BOCCA_PX dal centro del pirata lungo la mira, fuori dalla capsula.
 * Se c'è terreno in mezzo (pirata contro un muro) si ferma prima e `bloccato` è true.
 */
export function bocca(t: Terreno, x: number, y: number, mezziGradi: number): { x: number; y: number; bloccato: boolean } {
  const dx = coseno(mezziGradi), dy = -seno(mezziGradi);
  let px = x, py = y;
  for (let i = 1; i <= BOCCA_PX; i++) {
    const nx = x + dx * i, ny = y + dy * i;
    if (solido(t, Math.floor(nx), Math.floor(ny))) return { x: px, y: py, bloccato: true };
    px = nx; py = ny;
  }
  return { x: px, y: py, bloccato: false };
}

/** Bersagli (capsule) dei pirati in campo, anche quelli a terra con 0 PV. */
export function bersagliDi(s: StatoBattaglia): Bersaglio[] {
  return s.pirati.filter((p) => p.stato === 'vivo');
}

/** Spara l'arma del turno (o il primo colpo, per le armi a più colpi). */
export function spara(s: StatoBattaglia, p: Pirata, eventi: EventoBattaglia[]): void {
  const t = s.turno;
  const a = ARMA[t.arma];
  switch (a.tipo) {
    case 'balistica':
    case 'lancio': {
      const b = bocca(s.terreno, p.x, p.y, t.mira.mezziGradi);
      const ciurma = s.squadre[p.squadra].ciurma;
      if (b.bloccato && a.tipo === 'balistica') { esplodi(s, b.x, b.y, a.id, ciurma, eventi); return; }
      const v = velocitaIniziale(t.mira.mezziGradi, a.usaPotenza ? t.mira.potenza : 100);
      const pr: Proiettile = {
        id: s.prossimoId++, tipo: tipoProiettile(a), arma: a.id, x: b.x, y: b.y, vx: v.vx, vy: v.vy,
        tickEsplosione: a.miccia ? s.tick + t.miccia * TICK_AL_SECONDO : -1, lanciatore: p.id, fermo: false,
      };
      s.proiettili.push(pr);
      return;
    }
    case 'istantanea':
      colpoIstantaneo(s, p, eventi);
      return;
    case 'mischia':
      colpoMischia(s, p, eventi);
      return;
    default:
      // armi non ancora implementate (M2): lo sparo chiude il turno senza effetti
      return;
  }
}

/** Un colpo della pistola: raggio dritto fino alla portata, buca di 6 px nel terreno o danno al primo pirata. */
export function colpoIstantaneo(s: StatoBattaglia, p: Pirata, eventi: EventoBattaglia[]): void {
  const a = ARMA[s.turno.arma];
  const mg = s.turno.mira.mezziGradi;
  const dx = coseno(mg), dy = -seno(mg);
  const r = raggio(s.terreno, p.x, p.y, dx, dy, a.portata ?? 500, [...bersagliDi(s), ...bersagliOggetti(s.proiettili)], p.id);
  eventi.push({ t: 'colpoPistola', da: { x: p.x, y: p.y }, a: { x: r.x, y: r.y } });
  if (r.pirata < -1) {
    accendiOggetto(s, idProiettileDaBersaglio(r.pirata)); // barile o cassa colpiti: scoppiano
  } else if (r.terreno) {
    scavaCratere(s.terreno, r.x + dx, r.y + dy, a.buca ?? 0, eventi);
  } else if (r.pirata >= 0) {
    const q = s.pirati.find((x) => x.id === r.pirata)!;
    const spinta = ((a.spintaFissa ?? 0) / TICK_AL_SECONDO);
    const dir = direzioneSpinta(p.x, p.y, q.x, q.y);
    staccaPirata(q, eventi);
    q.vx += dir.x * spinta; q.vy += dir.y * spinta;
    danneggia(q, dannoArma(a.id, s.squadre[p.squadra].ciurma), eventi);
  }
}

/** Pirati raggiunti dalla sciabola: davanti al pirata (nel suo verso) entro la portata, alla stessa altezza. */
export function colpitiMischia(pirati: readonly Pirata[], p: Pirata, portata: number): Pirata[] {
  return pirati.filter((q) => {
    if (q.id === p.id || q.stato !== 'vivo') return false;
    const avanti = (q.x - p.x) * p.verso;
    return avanti >= -MEZZA_LARGHEZZA_PIRATA && avanti <= portata + MEZZA_LARGHEZZA_PIRATA && Math.abs(q.y - p.y) <= 2 * MEZZA_ALTEZZA_PIRATA;
  });
}

/** Spinta fissa della sciabola (450 px/s a 45° nel verso del pirata), in px/tick. */
export function spintaMischia(a: DefArma, verso: 1 | -1): { vx: number; vy: number } {
  const v = (a.spintaFissa ?? 0) / TICK_AL_SECONDO;
  const ang = daGradi(a.angoloSpinta ?? 45);
  return { vx: coseno(ang) * v * verso, vy: -seno(ang) * v };
}

export function colpoMischia(s: StatoBattaglia, p: Pirata, eventi: EventoBattaglia[]): void {
  const a = ARMA[s.turno.arma];
  const colpiti = colpitiMischia(s.pirati, p, a.portata ?? 30);
  eventi.push({ t: 'colpoSciabola', pirata: p.id, colpiti: colpiti.map((q) => q.id) });
  const sp = spintaMischia(a, p.verso);
  for (const q of colpiti) {
    staccaPirata(q, eventi);
    q.vx += sp.vx; q.vy += sp.vy;
    danneggia(q, dannoArma(a.id, s.squadre[p.squadra].ciurma), eventi);
  }
}

/** Per le armi a più colpi (pistola): tick dopo lo sparo in cui parte il colpo k (k da 0). */
export function tickColpo(arma: IdArma, k: number): number {
  return k * (ARMA[arma].intervalloColpi ?? 0);
}

/** Quanti tick dopo lo sparo l'arma ha finito di sparare (0 per le armi a colpo singolo). */
export function durataColpi(arma: IdArma): number {
  const a = ARMA[arma];
  return a.tipo === 'istantanea' ? tickColpo(arma, (a.colpi ?? 1) - 1) : 0;
}

