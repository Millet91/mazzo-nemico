// Misura di prova chiesta dal Lead design (21/11/2026): quanto è "aperta" la costa per gli spawn.
// Per ogni spawn, spinto VERSO IL MARE più vicino (lato esterno della sua metà):
//  - colpo diretto di cannone: deve essere sempre 0 in mare (06 §7.2, il validatore lo garantisce);
//  - sciabola: quante volte finisce in mare (atteso 30-60% sugli spawn esterni);
//  - due cannonate dirette di fila (la seconda da dove è atterrato): quante volte in mare (atteso > 10%);
//  - distanza media dal mare che resta dopo una cannonata.
// Non decide niente: serve a tarare la forma dell'isola. Codice puro.

import type { MappaGenerata, Punto } from '../../core/tipi';
import { superficie } from './analisi';
import { distanzaMare, spinte, spinto } from './spawn';
import { MONDO } from './parametri';

export interface MisuraMare {
  spawn: number;
  cannoneInMare: number;
  sciabolaInMare: number;
  dueCannonateInMare: number;
  /** solo lo spawn più vicino al mare di ogni lato */
  esterni: number;
  sciabolaInMareEsterni: number;
  dueCannonateInMareEsterni: number;
  /** distanza media dal mare dopo una cannonata (px), sugli spawn che restano a terra */
  distanzaDopoCannone: number;
}

export function misuraMare(mappe: MappaGenerata[]): MisuraMare {
  const r: MisuraMare = {
    spawn: 0, cannoneInMare: 0, sciabolaInMare: 0, dueCannonateInMare: 0,
    esterni: 0, sciabolaInMareEsterni: 0, dueCannonateInMareEsterni: 0, distanzaDopoCannone: 0,
  };
  const sp = spinte();
  let somma = 0, aTerra = 0;
  for (const m of mappe) {
    const k = m.terreno.maschera, mare = m.terreno.mare;
    const sup = superficie(k);
    for (const lato of m.spawn) {
      // verso il mare: fuori dalla propria metà
      const dir: -1 | 1 = lato[0].x < MONDO.w / 2 ? -1 : 1;
      const esterno = dir === -1 ? Math.min(...lato.map((p) => p.x)) : Math.max(...lato.map((p) => p.x));
      for (const p of lato) {
        const est = p.x === esterno;
        r.spawn++;
        if (est) r.esterni++;
        const c1 = spinto(k, mare, p, sp.cannone, 90, dir);
        if (c1.tipo !== 'terra') r.cannoneInMare++;
        else {
          const piede: Punto = { x: Math.round(c1.x), y: sup[Math.round(c1.x)] };
          somma += distanzaMare(sup, mare, piede);
          aTerra++;
          const c2 = spinto(k, mare, piede, sp.cannone, 90, dir);
          if (c2.tipo !== 'terra') { r.dueCannonateInMare++; if (est) r.dueCannonateInMareEsterni++; }
        }
        if (spinto(k, mare, p, sp.sciabola, sp.angoloSciabola, dir).tipo !== 'terra') {
          r.sciabolaInMare++;
          if (est) r.sciabolaInMareEsterni++;
        }
      }
    }
  }
  r.distanzaDopoCannone = aTerra ? somma / aTerra : 0;
  return r;
}
