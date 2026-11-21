import { writeFileSync } from 'node:fs';
import { costruisciMaschera, W, H, MARE } from './cala-pappagallo-forma';
import { superficie } from '../../src/battaglia/gen/analisi';
import { postiValidi, controllaPosto } from '../../src/battaglia/gen/spawn';
import { validaMassa, riempimento } from '../../src/battaglia/gen/valida';
import { scriviPng } from './png';
const { m } = costruisciMaschera();
const sup = superficie(m);
console.log('massa', validaMassa(m, MARE), riempimento(m, MARE).frazione.toFixed(3), riempimento(m, MARE).meta);
for (const d of [false, true]) {
  const p = postiValidi(m, sup, MARE, d);
  console.log(d ? 'destra' : 'sinistra', p.length, p.map((q) => q.x).join(','));
}
const motivi: Record<string, number> = {};
for (let x = 205; x < 1850; x += 8) { const c = controllaPosto(m, sup, MARE, x); const k = typeof c === 'string' ? c : 'ok'; motivi[k] = (motivi[k] ?? 0) + 1; }
console.log(motivi);
const col = [[0,0,0,0],[242,211,139,255],[138,90,58,255],[160,100,50,255],[138,122,106,255],[190,233,245,255],[75,85,99,255]];
const rgba = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { const c = m[i] ? col[m[i]] : (Math.floor(i / W) >= MARE ? [17,106,140,255] : [110,198,240,255]); rgba.set(c, i * 4); }
writeFileSync(process.argv[2] ?? '/tmp/claude-0/forma.png', scriviPng(W, H, rgba));
