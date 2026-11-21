// Previsione del danno (GDD §12.3): intervallo 10°-90° percentile su simulazioni dell'ondata
// con ordini di pescata diversi da quello vero (la previsione non rivela il futuro).
import { WaveSim } from './wave';
import { ENEMIES } from '../content/enemies';
import type { RunState } from './types';

export interface Forecast {
  lo: number;
  hi: number;
  mean: number;
  exact: boolean;
  samples: number[];
  warnings: string[];
}

export function forecast(run: RunState, n = 40): Forecast {
  if (!run.wave) return { lo: 0, hi: 0, mean: 0, exact: true, samples: [], warnings: [] };
  const spec = run.wave.spec;
  if (run.intel.fullOrder) {
    const sim = new WaveSim(structuredClone(run), spec, run.wave.seed, null, true);
    const out = sim.run_();
    return { lo: out.dmg, hi: out.dmg, mean: out.dmg, exact: true, samples: [out.dmg], warnings: warnings(run) };
  }
  const samples: number[] = [];
  for (let k = 0; k < n; k++) {
    const sim = new WaveSim(structuredClone(run), spec, 9973 * (k + 1) + spec.rintocco * 31 + (spec.phase ?? 0), null, true);
    samples.push(sim.run_().dmg);
  }
  samples.sort((a, b) => a - b);
  const q = (p: number) => samples[Math.min(samples.length - 1, Math.floor(p * samples.length))];
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  return { lo: q(0.1), hi: q(0.9), mean, exact: false, samples, warnings: warnings(run) };
}

/** Danno medio atteso per confrontare le opzioni (stessi campioni: numeri casuali comuni). */
export function meanDamage(run: RunState, n = 24): number {
  if (!run.wave) return 0;
  let tot = 0;
  for (let k = 0; k < n; k++) {
    const sim = new WaveSim(structuredClone(run), run.wave.spec, 7919 * (k + 1) + run.wave.spec.rintocco, null, true);
    const o = sim.run_();
    tot += o.dmg * 10 - o.gained * 0.5;
  }
  return tot / n / 10;
}

export function warnings(run: RunState): string[] {
  const w: string[] = [];
  const fato = run.deck.filter((x) => x.owner === 'fato');
  const n = fato.length || 1;
  const count = (k: string) => fato.filter((x) => (ENEMIES[x.def].kw as Record<string, number>)[k]).length;
  const segni = run.def.segni.flat().length;
  const ladri = count('ladro') + (run.wave?.spec.elite === 'brigante' ? 2 : 0);
  if (ladri && segni) w.push(`Rischio Ladro: ${ladri / n > 0.15 ? 'alto' : 'medio'} (rischi il Segno sull'${segni ? 'Uscio o il più avanzato' : ''})`);
  if (count('silenzio')) w.push('Silenzio nel mazzo: un Passo può tacere');
  if (count('esplosivo')) w.push('Barili nel mazzo: distruggili lontano dalla porta');
  const cor = count('corazza');
  if (cor / n > 0.15 && !run.def.segni.flat().some((s) => s === 'spina' || s === 'calamita')) w.push('Molta Corazza e nessuna Spina o Calamita');
  if (run.deck.some((x) => x.owner === 'baro' && x.lealta <= 1)) w.push('Un tuo Patto sta per tradire');
  if (run.wave?.spec.nightBonus) w.push(`Bonus della notte: +${run.wave.spec.nightBonus} Forza alle sventure`);
  return w;
}
