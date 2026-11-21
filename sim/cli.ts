// Simulatore headless: npm run sim -- [run per politica] [politiche] [sigillo] [lumi]
// Esempio: npm run sim -- 100 random,medio,greedy
import { playRun, type Policy, type RunResult } from '../src/sim/bots';
import { defaultConfig } from '../src/core/run';
import { P } from '../src/content/config';
import { DEFENSES } from '../src/content/defenses';

const N = Number(process.argv[2] ?? 60);
const pols = (process.argv[3] ?? 'random,medio,greedy').split(',') as Policy[];
const sigillo = Number(process.argv[4] ?? 0);
if (process.argv[5]) P.LUMI = Number(process.argv[5]);
const K = Number(process.env.K ?? 8);

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (x: number) => `${Math.round(x * 100)}%`;

const out: string[] = [`Baro, simulatore headless. ${N} run per politica, Sigillo ${sigillo}, Lumi ${P.LUMI}, K=${K}`];
const allPicks: Record<string, number> = {};
const allOffered: Record<string, number> = {};
for (const pol of pols) {
  const t0 = Date.now();
  const res: RunResult[] = [];
  for (let i = 0; i < N; i++) res.push(playRun(defaultConfig({ seed: `sim${i}`, sigillo, packs: ['*'] }), pol, i, K));
  const wins = res.filter((r) => r.win).length;
  const where: Record<string, number> = {};
  for (const r of res) if (!r.win) where[r.where] = (where[r.where] ?? 0) + 1;
  const dmg: Record<string, number[]> = {};
  const ticks: number[] = [];
  let limits = 0;
  for (const r of res) for (const h of r.history) {
    const k = `${h.kind.startsWith('Mazziere') ? 'Mazziere' : h.kind} A${h.act}`;
    (dmg[k] ??= []).push(h.dmg);
    ticks.push(h.ticks);
    if (h.limit) limits++;
  }
  const errors = res.flatMap((r) => r.errors);
  out.push(`\n=== ${pol} (${N} run, ${((Date.now() - t0) / 1000).toFixed(1)} s) ===`);
  out.push(`Vittorie: ${pct(wins / N)}`);
  out.push('Dove si perde: ' + Object.entries(where).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v / N)}`).join(', '));
  out.push('Danno medio per rintocco: ' + Object.entries(dmg).map(([k, v]) => `${k}: ${mean(v).toFixed(1)}`).join(' · '));
  out.push(`Tick per ondata: media ${mean(ticks).toFixed(1)}, max ${Math.max(...ticks)}; ondate al limite: ${limits}`);
  out.push(`Patti per run: ${mean(res.map((r) => r.patti)).toFixed(2)}; carte del Mazziere distrutte per run: ${mean(res.map((r) => r.bossKills)).toFixed(2)}`);
  const gaps = res.flatMap((r) => r.gaps).sort((a, b) => a - b);
  if (gaps.length) out.push(`Scarto 1ª-2ª opzione: mediana ${gaps[Math.floor(gaps.length / 2)].toFixed(2)} Lumi; quasi indifferenti (<0,5): ${pct(gaps.filter((g) => g < 0.5).length / gaps.length)}`);
  out.push(`Errori di regole (azioni rifiutate): ${errors.length}${errors.length ? ' es. ' + errors.slice(0, 3).join(' | ') : ''}`);
  if (pol === 'greedy') for (const r of res) {
    for (const [k, v] of Object.entries(r.picks)) allPicks[k] = (allPicks[k] ?? 0) + v;
    for (const [k, v] of Object.entries(r.offered)) allOffered[k] = (allOffered[k] ?? 0) + v;
  }
}
if (Object.keys(allOffered).length) {
  out.push('\nPick rate (greedy): difesa, offerta, presa');
  for (const [k, v] of Object.entries(allOffered).sort((a, b) => (allPicks[b[0]] ?? 0) / b[1] - (allPicks[a[0]] ?? 0) / a[1]))
    out.push(`  ${DEFENSES[k].name.padEnd(20)} ${String(v).padStart(5)} ${String(allPicks[k] ?? 0).padStart(5)}  ${pct((allPicks[k] ?? 0) / v)}`);
}
console.log(out.join('\n'));
