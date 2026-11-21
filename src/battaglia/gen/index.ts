// API pubblica del generatore di mappe: CONTRATTO CONGELATO dal Lead (M1).
// L'agente Generatore (C, ramo claude/m1-gen) sostituisce l'implementazione; la firma non cambia.
// ⚠ IMPLEMENTAZIONE SEGNAPOSTO: una collina di sabbia e terra con spawn equidistanti, senza validazione.
//
// Regole: TypeScript puro e deterministico (stesse regole della sim: core/rng.ts, core/trig.ts, niente Math.random).
// Stessa RichiestaMappa ⇒ stessa MappaGenerata, byte per byte.

import type { MappaGenerata, Punto, RichiestaMappa } from '../../core/tipi';
import { MATERIALE } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { seno } from '../../core/trig';

export function generaMappa(r: RichiestaMappa): MappaGenerata {
  const { larghezza: w, altezza: h, mareIniziale, inizioFondale } = BIL.mondo;
  const maschera = new Uint8Array(w * h);
  const superficie = (x: number) => {
    if (x < 200 || x > w - 200) return h; // acqua aperta ai lati
    const t = (x - 200) / (w - 400); // 0..1
    return Math.round(700 - 260 * seno(t * 360) - 40 * seno(t * 1440 + (r.seme % 720)));
  };
  for (let x = 0; x < w; x++) {
    const top = superficie(x);
    for (let y = 0; y < h; y++) {
      let m: number = MATERIALE.aria;
      if (y >= inizioFondale) m = MATERIALE.ferro;
      else if (y >= top) m = y - top < 24 ? MATERIALE.sabbia : y - top < 160 ? MATERIALE.terra : MATERIALE.roccia;
      maschera[y * w + x] = m;
    }
  }
  const spawn: [Punto[], Punto[]] = [[], []];
  for (let i = 0; i < 5; i++) {
    const xa = Math.round(w * (0.14 + 0.06 * i)), xd = Math.round(w * (0.86 - 0.06 * i));
    spawn[0].push({ x: xa, y: superficie(xa) });
    spawn[1].push({ x: xd, y: superficie(xd) });
  }
  return {
    terreno: { w, h, maschera, mare: mareIniziale }, spawn, bioma: r.bioma, variante: r.variante,
    semeUsato: r.seme, tentativi: 1, specchiata: false, decorazioni: [],
  };
}
