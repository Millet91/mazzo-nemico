// Simulatore headless: npm run sim -- [run per politica] [politiche] [sigillo]
// Esempio: npm run sim -- 200 random,medio,greedy
// Opzioni da variabili d'ambiente:
//   K=8                          campioni per valutare un'offerta (bot medio e greedy)
//   TUNE='{"LUMI":33}'           ritocca i parametri di config.ts senza toccare i file
//   TUNE='{"enemy:piena":12}'    ritocca la Forza di una carta
//   OUT=report.json              scrive anche il report in JSON
// Usa un processo per core. Esce con codice 1 se ci sono errori di regole, ondate al limite o catene troncate.
import { fork } from 'node:child_process';
import { cpus } from 'node:os';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { playRun, type Policy, type RunResult } from '../src/sim/bots';
import { defaultConfig } from '../src/core/run';
import { P } from '../src/content/config';
import { DEFENSES } from '../src/content/defenses';
import { ENEMIES } from '../src/content/enemies';

function applyTune() {
  if (!process.env.TUNE) return;
  const t = JSON.parse(process.env.TUNE) as Record<string, unknown>;
  for (const [k, v] of Object.entries(t)) {
    if (k.startsWith('enemy:')) ENEMIES[k.slice(6)].forza = v as number;
    else (P as Record<string, unknown>)[k] = v;
  }
}
applyTune();

const N = Number(process.argv[2] ?? 60);
const pols = (process.argv[3] ?? 'random,medio,greedy').split(',') as Policy[];
const sigillo = Number(process.argv[4] ?? 0);
const K = Number(process.env.K ?? 8);

type Job = { pol: Policy; from: number; to: number };

if (process.env.SIM_WORKER) {
  process.on('message', (j: Job) => {
    const res: RunResult[] = [];
    for (let i = j.from; i < j.to; i++) {
      const r = playRun(defaultConfig({ seed: `sim${i}`, sigillo, packs: ['*'] }), j.pol, i, K);
      res.push({ ...r, history: r.history.map((h) => ({ ...h, destroyed: [], arrived: [] })) });
    }
    process.send!(res, () => process.exit(0));
  });
} else {
  main();
}

async function runPol(pol: Policy): Promise<RunResult[]> {
  const W = Math.max(1, Math.min(cpus().length, N));
  const per = Math.ceil(N / W);
  const parts = await Promise.all(Array.from({ length: W }, (_, w) => new Promise<RunResult[]>((resolve, reject) => {
    const from = w * per, to = Math.min(N, from + per);
    if (from >= to) return resolve([]);
    const ch = fork(fileURLToPath(import.meta.url), process.argv.slice(2), { env: { ...process.env, SIM_WORKER: '1' }, execArgv: ['--import', 'tsx'] });
    ch.on('message', (m) => resolve(m as RunResult[]));
    ch.on('error', reject);
    ch.send({ pol, from, to });
  })));
  return parts.flat();
}

async function main() {
  const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const out: string[] = [`Baro, simulatore headless. ${N} run per politica, Sigillo ${sigillo}, Lumi ${P.LUMI}, K=${K}${process.env.TUNE ? `, TUNE ${process.env.TUNE}` : ''}`];
  const json: Record<string, unknown> = { N, sigillo, lumi: P.LUMI, tune: process.env.TUNE ?? null, policies: {} };
  const allPicks: Record<string, number> = {};
  const allOffered: Record<string, number> = {};
  let bad = 0;
  for (const pol of pols) {
    const t0 = Date.now();
    const res = await runPol(pol);
    const wins = res.filter((r) => r.win).length;
    const where: Record<string, number> = {};
    for (const r of res) if (!r.win) where[r.where] = (where[r.where] ?? 0) + 1;
    const dmg: Record<string, number[]> = {};
    const ticks: number[] = [];
    let limits = 0, cuts = 0, bossDmg = 0, totDmg = 0, allyHurt = 0;
    for (const r of res) for (const h of r.history) {
      const k = `${h.kind.startsWith('Mazziere') ? 'Mazziere' : h.kind} A${h.act}`;
      (dmg[k] ??= []).push(h.dmg);
      ticks.push(h.ticks);
      if (h.limit) limits++;
      cuts += h.chainCuts ?? 0;
      allyHurt += h.allyHurt ?? 0;
      totDmg += h.dmg;
      if (h.kind.startsWith('Mazziere')) bossDmg += h.dmg;
    }
    const errors = res.flatMap((r) => r.errors);
    bad += errors.length + limits + cuts;
    // winrate per difesa presa (M5/M7)
    const byDef: Record<string, { n: number; w: number }> = {};
    for (const r of res) for (const id of new Set(r.owned)) { const x = (byDef[id] ??= { n: 0, w: 0 }); x.n++; if (r.win) x.w++; }
    const wr = wins / Math.max(1, res.length);
    out.push(`\n=== ${pol} (${res.length} run, ${((Date.now() - t0) / 1000).toFixed(1)} s) ===`);
    out.push(`Vittorie: ${pct(wr)}`);
    out.push('Dove si perde: ' + Object.entries(where).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v / res.length)}`).join(', '));
    out.push('Danno medio per rintocco: ' + Object.entries(dmg).map(([k, v]) => `${k}: ${mean(v).toFixed(1)}`).join(' · '));
    out.push(`Quota di danno dei Mazzieri: ${pct(bossDmg / Math.max(1, totDmg))} (obiettivo < 35%)`);
    out.push(`Tick per ondata: media ${mean(ticks).toFixed(1)}, max ${Math.max(...ticks)}; ondate al limite: ${limits}; catene troncate: ${cuts}`);
    out.push(`Patti per run: ${mean(res.map((r) => r.patti)).toFixed(2)}; danno dei tuoi Segni ai Patti per run: ${(allyHurt / res.length).toFixed(1)}; carte del Mazziere distrutte per run: ${mean(res.map((r) => r.bossKills)).toFixed(2)}`);
    out.push(`Spiccioli non spesi a fine run: ${mean(res.map((r) => r.sp)).toFixed(0)} (allarme sopra 30)`);
    const gaps = res.flatMap((r) => r.gaps).sort((a, b) => a - b);
    if (gaps.length) out.push(`Scarto 1ª-2ª opzione: mediana ${gaps[Math.floor(gaps.length / 2)].toFixed(2)} Lumi; quasi indifferenti (<0,5): ${pct(gaps.filter((g) => g < 0.5).length / gaps.length)}`);
    out.push(`Errori di regole (azioni rifiutate): ${errors.length}${errors.length ? ' es. ' + errors.slice(0, 3).join(' | ') : ''}`);
    const outliers = Object.entries(byDef).filter(([, x]) => x.n >= 10).map(([id, x]) => ({ id, d: x.w / x.n - wr, n: x.n })).filter((x) => Math.abs(x.d) >= 0.15);
    if (outliers.length) out.push('Difese con vittorie lontane dalla media (±15 punti): ' + outliers.map((x) => `${DEFENSES[x.id]?.name ?? x.id} ${x.d > 0 ? '+' : ''}${Math.round(x.d * 100)} (${x.n} run)`).join(', '));
    (json.policies as Record<string, unknown>)[pol] = {
      wins: wr, where, bossShare: bossDmg / Math.max(1, totDmg), limits, chainCuts: cuts, errors: errors.length,
      dmg: Object.fromEntries(Object.entries(dmg).map(([k, v]) => [k, mean(v)])), unspent: mean(res.map((r) => r.sp)),
      gapsUnderHalf: gaps.length ? gaps.filter((g) => g < 0.5).length / gaps.length : null,
      winByDefense: Object.fromEntries(Object.entries(byDef).map(([k, x]) => [k, { runs: x.n, wins: x.w / x.n }])),
    };
    if (pol === 'greedy') for (const r of res) {
      for (const [k, v] of Object.entries(r.picks)) allPicks[k] = (allPicks[k] ?? 0) + v;
      for (const [k, v] of Object.entries(r.offered)) allOffered[k] = (allOffered[k] ?? 0) + v;
    }
  }
  if (Object.keys(allOffered).length) {
    out.push('\nPick rate (greedy): difesa, offerta, presa');
    for (const [k, v] of Object.entries(allOffered).sort((a, b) => (allPicks[b[0]] ?? 0) / b[1] - (allPicks[a[0]] ?? 0) / a[1]))
      out.push(`  ${(DEFENSES[k]?.name ?? k).padEnd(22)} ${String(v).padStart(5)} ${String(allPicks[k] ?? 0).padStart(5)}  ${pct((allPicks[k] ?? 0) / v)}`);
  }
  console.log(out.join('\n'));
  if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(json, null, 2));
  if (bad) { console.error(`\nATTENZIONE: ${bad} problemi (errori di regole, ondate al limite o catene troncate).`); process.exitCode = 1; }
}
