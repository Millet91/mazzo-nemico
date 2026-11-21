// Tentativi e seme di riserva (06 §1, 00 §2.2): si prova il seme chiesto, poi seme+1, … fino a 8 tentativi;
// se nessuno passa la validazione si usa il seme di riserva già validato del bioma (tentativi = 0).

import type { MappaGenerata, RichiestaMappa } from '../../core/tipi';
import { REGOLE, SEME_RISERVA } from './parametri';

export function conTentativi(r: RichiestaMappa, prova: (seme: number) => MappaGenerata | null): MappaGenerata {
  for (let t = 0; t < REGOLE.tentativi; t++) {
    const m = prova(r.seme + t);
    if (m) return { ...m, semeUsato: r.seme + t, tentativi: t + 1 };
  }
  const riserva = SEME_RISERVA[r.bioma] ?? SEME_RISERVA.isola;
  const m = prova(riserva);
  // il test "seme di riserva" garantisce che questo non succeda
  if (!m) throw new Error(`generaMappa: il seme di riserva ${riserva} non è valido`);
  return { ...m, semeUsato: riserva, tentativi: 0 };
}
