// npm run assets:check — voci del registro valide e quante hanno già l'asset definitivo.
// Esce con codice ≠ 0 se una voce è incoerente o se un file dichiarato manca in public/.
// Da M5 si unisce ai controlli sulle immagini di 11 §3 (S6 arte:check).
import { existsSync } from 'node:fs';
import { ASSETS, SOUNDS, MUSIC, problemiAsset } from '../src/assets/registry';

let errori = 0;
const perCat = new Map<string, { tot: number; fatti: number; mancano: string[] }>();
for (const [k, a] of Object.entries(ASSETS)) {
  for (const p of problemiAsset(k, a)) { console.error(`✗ ${k}: ${p}`); errori++; }
  if (a.image && !existsSync(`public/${a.image}`)) { console.error(`✗ ${k}: file mancante public/${a.image}`); errori++; }
  const c = perCat.get(a.cat) ?? { tot: 0, fatti: 0, mancano: [] };
  c.tot++;
  if (a.image) c.fatti++; else c.mancano.push(k);
  perCat.set(a.cat, c);
}
let tot = 0, fatti = 0;
for (const [cat, c] of perCat) {
  tot += c.tot; fatti += c.fatti;
  console.log(`${cat.padEnd(11)} ${c.fatti}/${c.tot}${c.mancano.length ? '  segnaposto: ' + c.mancano.join(', ') : ''}`);
}
const suoni = Object.values(SOUNDS).filter((s) => s.sample).length;
const musiche = Object.values(MUSIC).filter((s) => s.sample).length;
console.log(`\nGrafica: ${fatti}/${tot} definitivi · Suoni: ${suoni}/${Object.keys(SOUNDS).length} · Musiche: ${musiche}/${Object.keys(MUSIC).length}`);
if (errori) { console.error(`\n${errori} problemi nel registro`); process.exit(1); }
