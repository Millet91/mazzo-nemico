// Traccia veloce di un tiro sul terreno, senza simulazione completa: serve all'IA per scartare i tiri che
// sbattono contro un ostacolo (collina, roccia, "tavolo") e per tarare la potenza prima di spendere le
// simulazioni vere. Stessa balistica della sim (00 §1.2: gravità, vento per tick, passi ≤ 1 px), ma niente
// pirati, rimbalzi né esplosioni. Pura e deterministica.

import type { Punto, StatoBattaglia } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { coseno, seno } from '../../core/trig';
import { solido } from './terreno';

/** Distanza dal centro del pirata a cui nasce il proiettile (fuori dalla capsula). */
const BOCCA = 12;
/** Al massimo 6 s di volo. */
const TICK_MAX = 360;

export interface Traccia {
  /** dove il tiro tocca terreno o mare (o l'ultimo punto, se esce dalla mappa) */
  fine: Punto;
  /** tick di volo fino a `fine` */
  tick: number;
  /** finito in mare o fuori dalla mappa */
  perso: boolean;
}

/** Segue il tiro dal pirata in (x, y) fino al primo contatto. `vento` già ridotto dal livello (0 per le armi senza vento). */
export function tracciaTiro(s: StatoBattaglia, x: number, y: number, mezziGradi: number, potenza: number, vento: number): Traccia {
  const v = (BIL.fisica.velocitaMaxProiettile * potenza) / 100;
  let px = x + coseno(mezziGradi) * BOCCA, py = y - seno(mezziGradi) * BOCCA;
  let vx = coseno(mezziGradi) * v, vy = -seno(mezziGradi) * v;
  const ax = vento * BIL.fisica.ventoPerPunto;
  const { w } = s.terreno;
  for (let t = 1; t <= TICK_MAX; t++) {
    vy += BIL.fisica.gravita;
    vx += ax;
    const passi = Math.max(1, Math.ceil(Math.max(Math.abs(vx), Math.abs(vy))));
    for (let i = 0; i < passi; i++) {
      px += vx / passi; py += vy / passi;
      if (px < 0 || px >= w) return { fine: { x: px, y: py }, tick: t, perso: true };
      if (py >= s.terreno.mare) return { fine: { x: px, y: s.terreno.mare }, tick: t, perso: true };
      if (solido(s, px, py)) return { fine: { x: px, y: py }, tick: t, perso: false };
    }
  }
  return { fine: { x: px, y: py }, tick: TICK_MAX, perso: true };
}

/** La linea retta da `da` ad `a` passa senza toccare il terreno? (pistola; salta i primi 8 px) */
export function lineaLibera(s: StatoBattaglia, da: Punto, a: Punto): boolean {
  const dx = a.x - da.x, dy = a.y - da.y;
  const l = Math.sqrt(dx * dx + dy * dy);
  for (let d = 8; d < l - 6; d++) if (solido(s, da.x + (dx * d) / l, da.y + (dy * d) / l)) return false;
  return true;
}
