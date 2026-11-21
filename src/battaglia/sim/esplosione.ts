// Esplosioni e spinte (00 §1.2 e precisazioni del Lead design): danno max(1, round(D × (1 − d/r))) dentro il raggio, spinta D × 7 px/s con la
// stessa attenuazione, chi spara si fa male. d è la distanza dalla capsula del pirata (0 se l'esplosione è dentro).

import type { EventoBattaglia, IdArma, IdCiurma, StatoBattaglia } from '../../core/tipi';
import { ARMA } from '../../contenuti/armi';
import { BIL } from '../../contenuti/bilanciamento';
import { distanza2Capsula, scavaCratere, MEZZA_LARGHEZZA_PIRATA } from './terreno';
import { danneggia, stacca } from './pirata';
import { SPINTA_MIN_SU } from './costanti';
import { accendiOggetti } from './oggetti';

/** Danno di un'arma per una ciurma, con il tratto del Teschio Rosso (+10% sugli esplosivi, per difetto). */
export function dannoArma(arma: IdArma, ciurma: IdCiurma): number {
  const base = ARMA[arma].danno;
  if (ciurma === 'teschio' && BIL.tratti.teschioArmi.includes(arma)) return Math.floor(base * (1 + BIL.tratti.teschioBonusDanno));
  return base;
}

/** Direzione della spinta da (ox, oy) verso (px, py): unitaria, con un minimo di "su" se è quasi orizzontale. */
export function direzioneSpinta(ox: number, oy: number, px: number, py: number): { x: number; y: number } {
  let dx = px - ox, dy = py - oy;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return { x: 0, y: -1 }; // caso 10: stesso punto, niente divisione per zero
  const l = Math.sqrt(l2);
  dx /= l; dy /= l;
  if (dy > -SPINTA_MIN_SU && dy < SPINTA_MIN_SU) {
    // spinta quasi orizzontale: la si alza un po', se no il suolo la spegne subito
    dy = -SPINTA_MIN_SU;
    const k = Math.sqrt(dx * dx + dy * dy);
    dx /= k; dy /= k;
  }
  return { x: dx, y: dy };
}

export interface EffettoEsplosione { danno: number; vx: number; vy: number }

/**
 * Effetto di un'esplosione su un pirata con centro (px, py). null se è fuori dal raggio.
 * `danno` = danno pieno al centro, `spinta` = spinta piena in px/tick.
 */
export function effettoEsplosione(
  x: number, y: number, raggio: number, danno: number, spinta: number, px: number, py: number,
): EffettoEsplosione | null {
  if (raggio <= 0) return null;
  const dc = Math.sqrt(distanza2Capsula(px, py, x, y));
  const d = Math.max(0, dc - MEZZA_LARGHEZZA_PIRATA);
  if (d >= raggio) return null;
  const f = 1 - d / raggio;
  const dir = direzioneSpinta(x, y, px, py);
  return { danno: Math.max(1, Math.round(danno * f)), vx: dir.x * spinta * f, vy: dir.y * spinta * f };
}

/**
 * Fa esplodere `arma` in (x, y): cratere, danni e spinte a tutti i pirati in campo (anche a chi ha sparato).
 * `ciurma` = ciurma di chi ha sparato (per il tratto del Teschio); null per la lapide.
 */
export function esplodi(
  s: StatoBattaglia, x: number, y: number, arma: IdArma | 'lapide', ciurma: IdCiurma | null, eventi: EventoBattaglia[],
  parametri?: { raggio: number; danno: number },
): void {
  const p = parametri ?? parametriEsplosione(arma);
  const raggio = p.raggio;
  const base = p.danno;
  const danno = parametri || arma === 'lapide' || arma === 'barile' || !ciurma ? base : dannoArma(arma, ciurma);
  const spinta = base * BIL.fisica.spintaPerDanno;
  eventi.push({ t: 'esplosione', x, y, raggio, arma });
  scavaCratere(s.terreno, x, y, raggio, eventi);
  for (const q of s.pirati) {
    if (q.stato !== 'vivo') continue;
    const e = effettoEsplosione(x, y, raggio, danno, spinta, q.x, q.y);
    if (!e) continue;
    stacca(q);
    q.vx += e.vx; q.vy += e.vy;
    danneggia(q, e.danno, eventi);
  }
  accendiOggetti(s, x, y, raggio);
}

/** Raggio e danno pieno di un'esplosione (senza tratti): armi da ARMA, lapide e barile da BIL. */
export function parametriEsplosione(arma: IdArma | 'lapide'): { raggio: number; danno: number } {
  if (arma === 'lapide') return { raggio: BIL.lapide.raggio, danno: BIL.lapide.danno };
  if (arma === 'barile') return { raggio: BIL.barili.raggio, danno: BIL.barili.danno };
  return { raggio: ARMA[arma].raggio, danno: ARMA[arma].danno };
}
