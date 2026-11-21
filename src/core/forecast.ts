// Previsione del danno (GDD §12.3): intervallo 10°-90° percentile su simulazioni dell'ondata
// con ordini di pescata diversi da quello vero (la previsione non rivela il futuro).
import { WaveSim } from './wave';
import { ENEMIES } from '../content/enemies';
import { DEFENSES } from '../content/defenses';
import { visibleQueue } from './run';
import { seedRng } from './rng';
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
  // le carte che il giocatore vede restano quelle vere (SD-7): si mescola solo il resto del mazzo
  const pins = revealedUids(run);
  const base = seedRng(`${run.cfg.seed}/forecast/${spec.rintocco}/${spec.phase ?? 0}`)[0];
  const samples: number[] = [];
  for (let k = 0; k < n; k++) {
    const sim = new WaveSim(structuredClone(run), spec, (base + 9973 * (k + 1)) >>> 0, null, true);
    sim.pinTop = pins;
    samples.push(sim.run_().dmg);
  }
  samples.sort((a, b) => a - b);
  const q = (p: number) => samples[Math.min(samples.length - 1, Math.floor(p * samples.length))];
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  return { lo: q(0.1), hi: q(0.9), mean, exact: false, samples, warnings: warnings(run) };
}

/** uid delle carte del mazzo scoperte in Preparazione (fissate prima del Rito) */
export function revealedUids(run: RunState): number[] {
  if (!run.wave) return [];
  const sim = new WaveSim(structuredClone(run), run.wave.spec, run.wave.seed, null, true);
  sim.revealN = visibleQueue(run);
  return sim.preview().revealedUids;
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
  if (ladri && segni) {
    const names = ['nel Crocevia', 'nella Strada', 'nel Cortile', 'sulla Scala', "sull'Uscio"];
    let risk = '';
    for (let b = 4; b >= 0 && !risk; b--) {
      const x = run.def.segni[b].filter((y) => y !== 'bastione').pop();
      if (x) risk = `${DEFENSES[x].name} ${names[b]}`;
    }
    if (risk) w.push(`Rischio Ladro: ${ladri / n > 0.15 ? 'alto' : 'medio'} (rischi ${risk})`);
  }
  if (count('silenzio')) w.push('Silenzio nel mazzo: i primi Segni che la colpiscono tacciono (la Lanterna lo toglie)');
  if (run.def.segni.flat().some((x) => ['brace', 'spina', 'tagliola', 'corno', 'rogo', 'catena', 'campanaMorto', 'trappola', 'calamita', 'moneta'].includes(x)) && run.deck.some((x) => x.owner === 'baro'))
    w.push('I Segni che tolgono Forza colpiscono anche i tuoi Patti');
  if (count('esplosivo')) w.push('Barili nel mazzo: distruggili lontano dalla porta');
  const cor = count('corazza');
  if (cor / n > 0.15 && !run.def.segni.flat().some((s) => s === 'spina' || s === 'calamita')) w.push('Molta Corazza e nessuna Spina o Calamita');
  if (run.deck.some((x) => x.owner === 'baro' && x.lealta <= 1)) w.push('Un tuo Patto sta per tradire');
  if (run.wave?.spec.nightBonus) w.push(`Bonus della notte: +${run.wave.spec.nightBonus} Forza alle sventure`);
  return w;
}
