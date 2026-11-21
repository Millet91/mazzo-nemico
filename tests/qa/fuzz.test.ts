// QA M1 · fuzz (13 §2 L2) e partite IA contro IA (14 §M1 "si gioca una battaglia dall'inizio alla fine").
// In CI girano FUZZ_N battaglie (50); per il "fatto" della M1: FUZZ_N=2000 npx vitest run tests/qa/fuzz
// Un caso che fallisce stampa il seme: si rigioca con FUZZ_SEME=<seme> e diventa un replay di regressione.
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { configCaso, gioca, pilotaCasuale, pilotaIa, rigioca, SIM_SEGNAPOSTO } from './banco';
import { VERSIONE_REGOLE } from '../../src/core/tipi';

const N = Number(process.env.FUZZ_N ?? 50);
const SEMI = process.env.FUZZ_SEME ? [Number(process.env.FUZZ_SEME)] : Array.from({ length: N }, (_, i) => 1000 + i * 7919);

if (SIM_SEGNAPOSTO) console.info('[QA] sim segnaposto: invarianti di fisica e di fine battaglia rimandati all\'arrivo di A');

describe(`QA · fuzz su ${SEMI.length} battaglie`, () => {
  // a blocchi di 100: un solo test lunghissimo fa scadere i messaggi interni di Vitest
  for (let da = 0; da < SEMI.length; da += 100) it(`nessun invariante violato (battaglie ${da + 1}-${Math.min(da + 100, SEMI.length)})`, () => {
    const rotti: string[] = [];
    for (const seme of SEMI.slice(da, da + 100)) {
      const cfg = configCaso(seme);
      const p = gioca(cfg, pilotaCasuale(seme));
      if (p.violazioni.length) {
        rotti.push(`seme ${seme}: ${p.violazioni.join(' | ')}`);
        try {
          mkdirSync('test-results/fuzz', { recursive: true });
          writeFileSync(`test-results/fuzz/regressione-${seme}.json`, JSON.stringify({
            versioneRegole: VERSIONE_REGOLE, config: cfg, comandi: p.comandi, hash: p.hash, tickFinale: p.stato.tick,
          }));
        } catch { /* solo comodità */ }
      }
    }
    expect(rotti).toEqual([]);
  }, 120_000);

  it('stesso seme e stessi comandi ⇒ stessi hash (determinismo)', () => {
    for (const seme of SEMI.slice(0, 5)) {
      const cfg = configCaso(seme);
      const a = gioca(cfg, pilotaCasuale(seme), false);
      expect(rigioca(cfg, a.comandi)).toEqual(a.hash);
    }
  });

  it('due battaglie giocate a turni alterni non si influenzano (niente stato nascosto nei moduli)', () => {
    const [c1, c2] = [configCaso(11), configCaso(22)];
    const soli = [gioca(c1, pilotaCasuale(11), false).hash, gioca(c2, pilotaCasuale(22), false).hash];
    // seconda passata: la prima battaglia si rigioca dopo aver giocato l'altra
    const a = gioca(c1, pilotaCasuale(11), false);
    expect(gioca(c2, pilotaCasuale(22), false).hash).toEqual(soli[1]);
    expect(rigioca(c1, a.comandi)).toEqual(soli[0]);
  });
});

describe('QA · IA contro IA', () => {
  it('3 contro 3 e 5 contro 5 finiscono senza violazioni', () => {
    for (const [seme, n] of [[7, 3], [8, 3], [9, 5]] as const) {
      const p = gioca(configCaso(seme, [n, n]), pilotaIa());
      expect(p.violazioni, `seme ${seme}`).toEqual([]);
      if (!SIM_SEGNAPOSTO) expect(p.stato.esito, `seme ${seme}`).not.toBeNull();
    }
  }, 120_000);

  it('Cala Pappagallo (mappa fatta a mano): da 1 a 5 per lato, IA e comandi casuali, senza violazioni', () => {
    for (const [seme, n] of [[1, 1], [2, 3], [3, 5], [4, 2]] as const) {
      for (const pilota of [pilotaIa(), pilotaCasuale(seme)]) {
        const p = gioca(configCaso(seme + 6000, [n, n], 'cala-pappagallo'), pilota);
        expect(p.violazioni, `seme ${seme}, ${n}v${n}`).toEqual([]);
        if (!SIM_SEGNAPOSTO) expect(p.stato.esito, `seme ${seme}`).not.toBeNull();
      }
    }
  }, 180_000);
});
