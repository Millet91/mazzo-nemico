// Studio v2, Fase 1: le mappe fatte a mano funzionano anche per chi ha la Scivolata (Schermaglia, Prologo).
// Stessi controlli di tests/mappe/percorribilita.test.ts (QA §3.2), con l'esploratore che scivola sui pendii oltre 25°:
// chi scende un pendio ripido non si ferma a metà, quindi un posto raggiungibile solo "fermandosi in discesa" non vale.
import { describe, expect, it } from 'vitest';
import { MAPPE_FATTE, mappaFatta } from '../../src/battaglia/mappe';
import { esploratore } from './raggiungibilita';

/** Barili che si colpiscono ma non si raggiungono a piedi, per scelta (come in percorribilita.test.ts) */
const BARILI_IN_VETTA: Record<string, number[]> = { 'cala-pappagallo': [1052], 'cala-pappagallo-v3': [1052] };

describe('con la Scivolata dagli spawn si arriva ancora dove serve', () => {
  for (const id of Object.keys(MAPPE_FATTE)) {
    it(`${id}: ogni spawn, ogni scala e liana, ogni barile`, () => {
      const mappa = mappaFatta(id)!;
      const copione = MAPPE_FATTE[id].copione === true;
      const esplora = esploratore(mappa, { scivolata: true });
      const partenze = copione ? mappa.spawn[0] : [...mappa.spawn[0], ...mappa.spawn[1]];
      for (const da of partenze) {
        const r = esplora.da([da]);
        const chi = `${id}, da (${da.x}, ${da.y})`;
        for (const p of partenze) expect(r.arriva(p.x, p.y, 4), `${chi}: non arriva allo spawn (${p.x}, ${p.y})`).toBe(true);
        (mappa.appigli ?? []).forEach((a, i) => {
          expect(r.saliti.has(i), `${chi}: non sale ${a.tipo} in x ${a.x}`).toBe(true);
          expect(r.scesi.has(i), `${chi}: non scende ${a.tipo} in x ${a.x}`).toBe(true);
        });
        for (const b of mappa.barili ?? []) {
          if (BARILI_IN_VETTA[id]?.includes(b.x)) continue;
          expect(r.arriva(b.x, b.y, 40), `${chi}: non arriva al barile in x ${b.x}`).toBe(true);
        }
      }
    });
  }
});
