// Replay d'oro della M1 (13 §2 L2, piano QA F1): ogni file oro-*.json si rigioca e deve dare gli stessi hash
// ogni 600 tick e lo stesso tick finale, e coprire ancora ciò per cui è stato scelto.
// Se un hash cambia per un cambio VOLUTO delle regole: npx tsx tests/replay/genera.ts, in un commit separato
// con il motivo. Se cambia senza volerlo, è un bug di determinismo: non si rigenera.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import type { Replay } from '../../src/core/tipi';
import { generaMappa } from '../../src/battaglia/gen';
import { rigiocaReplay } from '../../src/battaglia/sim/replay';
import { Copertura, COPERTURA_M1 } from './copertura';

const FILE = readdirSync('tests/replay').filter((f) => /^oro-.*\.json$/.test(f)).sort();
const replay = (f: string) => JSON.parse(readFileSync(`tests/replay/${f}`, 'utf8')) as Replay & { copre: string[] };

describe("QA · replay d'oro", () => {
  it('sono 10 e insieme coprono tutto ciò che chiede la M1', () => {
    expect(FILE.length).toBe(10);
    const tutti = new Set(FILE.flatMap((f) => replay(f).copre));
    expect(COPERTURA_M1.filter((t) => !tutti.has(t))).toEqual([]);
  });

  for (const f of FILE) {
    it(f, () => {
      const r = replay(f);
      const c = r.config;
      const mappa = generaMappa({ seme: c.seme, bioma: c.bioma, variante: c.variante, piratiPerLato: [c.squadre[0].pirati, c.squadre[1].pirati] });
      const cop = new Copertura();
      const esito = rigiocaReplay(r, mappa, { suEventi: (s, e) => cop.osserva(s, e) });
      expect(esito.differenze).toEqual([]);
      expect(r.copre.filter((t) => !cop.tag.has(t))).toEqual([]);
    });
  }
});
