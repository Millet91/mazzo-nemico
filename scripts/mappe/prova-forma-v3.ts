// Anteprima e controlli veloci della forma v3:  npx tsx scripts/mappe/prova-forma-v3.ts [base|prologo] [uscita.png]
import { writeFileSync } from 'node:fs';
import { costruisciMaschera, appigliDi, W, H, MARE, APPOGGI, type Variante } from './cala-v3-forma';
import { superficie } from '../../src/battaglia/gen/analisi';
import { postiValidi, controllaPosto } from '../../src/battaglia/gen/spawn';
import { validaMassa, riempimento } from '../../src/battaglia/gen/valida';
import { controllaAppiglio } from '../../src/battaglia/gen/appigli';
import { REGOLE } from '../../src/battaglia/gen/parametri';
import { scriviPng } from './png';

const variante = (process.argv[2] ?? 'base') as Variante;
const { m } = costruisciMaschera(variante);
const sup = superficie(m);
const r = riempimento(m, MARE);
console.log('massa', validaMassa(m, MARE), 'solido', (r.frazione * 100).toFixed(1) + '%', 'metà', r.meta, ((r.meta[0] - r.meta[1]) / Math.max(...r.meta) * 100).toFixed(1) + '%');
for (const d of [false, true]) {
  const p = postiValidi(m, sup, MARE, d, 4);
  console.log(d ? 'destra' : 'sinistra', p.length, p.map((q) => `${q.x}:${q.y}`).join(' '));
}
const motivi: Record<string, number[]> = {};
for (let x = 205; x < 1850; x += 8) { const c = controllaPosto(m, sup, MARE, x); const k = typeof c === 'string' ? c : 'ok'; (motivi[k] ??= []).push(x); }
for (const [k, v] of Object.entries(motivi)) if (k !== 'ok' && k !== 'pendenza') console.log(k, v.join(','));
for (const a of appigliDi(m, variante)) console.log(a.tipo, a.x, a.yAlto, a.yBasso, 'lungo', a.yBasso - a.yAlto, controllaAppiglio(m, MARE, a, REGOLE.appiglioPianoEntro).join(' | ') || 'ok');
for (const a of APPOGGI) { let top = H; for (let x = a.x0; x <= a.x1; x++) top = Math.min(top, sup[x]); console.log(a.tipo, a.x0, 'cima', top, 'suolo accanto', sup[a.x0 - 3], sup[a.x1 + 3]); }
const col = [[0, 0, 0, 0], [242, 211, 139, 255], [138, 90, 58, 255], [160, 100, 50, 255], [138, 122, 106, 255], [190, 233, 245, 255], [75, 85, 99, 255]];
const rgba = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { const c = m[i] ? col[m[i]] : (Math.floor(i / W) >= MARE ? [17, 106, 140, 255] : [110, 198, 240, 255]); rgba.set(c, i * 4); }
for (const a of appigliDi(m, variante)) for (let y = a.yAlto; y < a.yBasso; y++) for (const dx of [-1, 0, 1]) rgba.set(a.tipo === 'scala' ? [255, 255, 255, 255] : [40, 160, 60, 255], (y * W + a.x + dx) * 4);
writeFileSync(process.argv[3] ?? '/tmp/claude-0/forma-v3.png', scriviPng(W, H, rgba));
