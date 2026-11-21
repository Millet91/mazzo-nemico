// QA M1 · guardia di prestazioni in CI (PIANO-M1 §4). Sul Pixel 6 la soglia è 2 ms per tick (Diagnostica →
// "Prova 60 fps"); qui il tetto è largo perché le macchine della CI variano: serve solo ad accorgersi di un
// peggioramento grosso, non sostituisce la prova sul telefono.
import { describe, it, expect } from 'vitest';
import { configCaso, gioca, pilotaIa } from './banco';

const TETTO_MS_PER_TICK = 4;

describe('QA · prestazioni della sim', () => {
  it(`battaglia 5v5 IA contro IA sotto ${TETTO_MS_PER_TICK} ms per tick in media`, () => {
    const p = gioca(configCaso(42, [5, 5]), pilotaIa(), false);
    console.info(`[QA] 5v5: ${p.stato.tick} tick, ${p.msPerTick.toFixed(3)} ms/tick`);
    expect(p.msPerTick).toBeLessThan(TETTO_MS_PER_TICK);
  }, 120_000);
});
