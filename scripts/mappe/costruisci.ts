// Costruisce i dati di una mappa fatta a mano (06 §6): maschera, spawn, barili, decorazioni → src/battaglia/mappe/<id>.dati.ts
//
//   npx tsx scripts/mappe/costruisci.ts [terreno.png]
//
// Senza immagine usa la forma disegnata (cala-pappagallo-forma.ts). Con l'immagine del terreno già pronta
// (2048×1024 RGBA, aria = alfa 0: la prepara scripts/mappe/prepara_arte.py dal PNG di Magnific su verde) la
// maschera nasce dai pixel dell'immagine, così quello che si vede è esattamente quello che si colpisce.
// Materiali per profondità dalla superficie (06 §2 Isola: 24 px sabbia, terra, roccia sotto 160 px); il legno
// del relitto e la roccia della Rocca e della rovina vengono dalla forma disegnata.
import { readFileSync, writeFileSync } from 'node:fs';
import { MATERIALE, type Decorazione, type MappaGenerata, type Punto } from '../../src/core/tipi';
import { superficie } from '../../src/battaglia/gen/analisi';
import { piazzaBarili } from '../../src/battaglia/gen/barili';
import { controllaInsieme, postiValidi, type Posto } from '../../src/battaglia/gen/spawn';
import { validaMappa, riempimento } from '../../src/battaglia/gen/valida';
import { REGOLE } from '../../src/battaglia/gen/parametri';
import { mescola, semeIniziale, type ConRng } from '../../src/core/rng';
import { codificaMaschera } from '../../src/battaglia/mappe/rle';
import { costruisciMaschera, W, H, MARE, FONDALE, RELITTO, ROVINA } from './cala-pappagallo-forma';
import { leggiPng, scriviPng } from './png';

const ID = 'cala-pappagallo';
const arteFile = process.argv[2];
const forma = costruisciMaschera();
let m: Uint8Array;

if (!arteFile) m = forma.m;
else {
  const { w, h, rgba } = leggiPng(readFileSync(arteFile));
  if (w !== W || h !== H) throw new Error(`terreno ${w}×${h}, serve ${W}×${H}`);
  m = new Uint8Array(W * H);
  for (let x = 64; x < W - 64; x++) {
    let sup = -1;
    for (let y = 160; y < FONDALE; y++) {
      const i = y * W + x;
      if (rgba[i * 4 + 3] < 128) { continue; }
      if (sup < 0 || m[i - W] === 0) sup = sup < 0 ? y : sup;
      const prof = y - sup;
      m[i] = prof < 24 ? MATERIALE.sabbia : prof < 160 ? MATERIALE.terra : MATERIALE.roccia;
      const f = forma.m[i];
      if (f === MATERIALE.legno || (f === MATERIALE.roccia && (x < 1250 || (x >= ROVINA.x0 && x <= ROVINA.x1)))) m[i] = f;
    }
  }
  for (let i = FONDALE * W; i < W * H; i++) m[i] = MATERIALE.ferro;
  void RELITTO;
}

const sup = superficie(m);
const s: ConRng = { rng: semeIniziale(20261121) };

/** come il generatore: posti distanti almeno distanzaCompagni, in ordine casuale */
function scegli(posti: Posto[], n: number): Posto[] {
  const out: Posto[] = [];
  for (const p of mescola(s, posti.slice())) {
    if (out.every((q) => Math.abs(q.x - p.x) >= REGOLE.distanzaCompagni)) out.push(p);
    if (out.length === n) break;
  }
  return out.sort((a, b) => a.x - b.x);
}

const tutti: [Posto[], Posto[]] = [postiValidi(m, sup, MARE, false), postiValidi(m, sup, MARE, true)];
let scelti: [Posto[], Posto[]] | null = null;
for (let k = 0; k < 400 && !scelti; k++) {
  const prova: [Posto[], Posto[]] = [scegli(tutti[0], REGOLE.spawnPerLato), scegli(tutti[1], REGOLE.spawnPerLato)];
  if (prova[0].length < REGOLE.spawnPerLato || prova[1].length < REGOLE.spawnPerLato) continue;
  if (controllaInsieme(m, sup, MARE, prova, true).length) continue;
  scelti = prova;
}
if (!scelti) throw new Error(`nessuna scelta di spawn valida (posti: ${tutti[0].length} / ${tutti[1].length})`);
const centro = (a: Punto, b: Punto) => Math.abs(a.x - W / 2) - Math.abs(b.x - W / 2);
const spawn: [Punto[], Punto[]] = [scelti[0].map((p) => ({ x: p.x, y: p.y })).sort(centro), scelti[1].map((p) => ({ x: p.x, y: p.y })).sort(centro)];
const barili = piazzaBarili(s, m, sup, MARE, [...spawn[0], ...spawn[1]]);

// decorazioni scelte a mano (x), appoggiate al suolo
const decorazioni: Decorazione[] = ([
  ['palma', 360, 1, false], ['cespuglio', 450, 0.9, false], ['palma', 700, 1.15, true], ['masso', 830, 1, false],
  ['cespuglio', 1255, 1, true], ['palma', 1345, 1.1, false], ['rovina', 1560, 1, false], ['cespuglio', 1650, 0.85, false], ['palma', 1700, 1, true],
] as [Decorazione['tipo'], number, number, boolean][])
  .filter(([, x]) => [...spawn[0], ...spawn[1]].every((p) => Math.abs(p.x - x) >= REGOLE.decorazioniLontanoDaSpawn))
  .map(([tipo, x, scala, specchio]) => ({ tipo, x, y: sup[x], scala, specchio }));

const mappa: MappaGenerata = {
  terreno: { w: W, h: H, maschera: m, mare: MARE },
  spawn, bioma: 'isola', semeUsato: 0, tentativi: 1, specchiata: false, decorazioni, barili,
  ...(arteFile ? { arte: ID } : {}),
};
const err = validaMappa(mappa);
const r = riempimento(m, MARE);
console.log(`solido ${(r.frazione * 100).toFixed(1)}%, metà ${r.meta.join(' / ')}, posti ${tutti[0].length}/${tutti[1].length}`);
console.log('spawn', JSON.stringify(spawn), 'barili', JSON.stringify(barili));
if (err.length) { console.error('NON VALIDA:\n' + err.join('\n')); process.exit(1); }

writeFileSync(`src/battaglia/mappe/${ID}.dati.ts`, `// GENERATO da scripts/mappe/costruisci.ts: non modificare a mano.
import type { DatiMappaFatta } from './tipi';

export const DATI: DatiMappaFatta = ${JSON.stringify({
  id: ID, nome: 'Cala Pappagallo', bioma: 'isola', mare: MARE, w: W, h: H, arte: arteFile ? ID : undefined,
  spawn, barili, decorazioni, maschera: codificaMaschera(m),
}, null, 1)};
`);
// anteprima della maschera per controllo
const col = [[0, 0, 0, 0], [242, 211, 139, 255], [138, 90, 58, 255], [120, 70, 30, 255], [138, 122, 106, 255], [190, 233, 245, 255], [75, 85, 99, 255]];
const rgba = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) rgba.set(m[i] ? col[m[i]] : Math.floor(i / W) >= MARE ? [17, 106, 140, 255] : [110, 198, 240, 255], i * 4);
for (const p of [...spawn[0], ...spawn[1]]) for (let dy = -40; dy < 0; dy++) for (let dx = -6; dx <= 6; dx++) rgba.set(spawn[0].includes(p) ? [229, 72, 77, 255] : [34, 199, 217, 255], ((p.y + dy) * W + p.x + dx) * 4);
for (const b of barili) for (let dy = -20; dy < 0; dy++) for (let dx = -10; dx <= 10; dx++) rgba.set([60, 30, 10, 255], ((b.y + dy) * W + b.x + dx) * 4);
writeFileSync(`/tmp/claude-0/${ID}-maschera.png`, scriviPng(W, H, rgba));
// materiali per il pittore (scripts/mappe/dipingi): R = materiale × 40, alfa = solido
const mat = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) if (m[i]) mat.set([m[i] * 40, 0, 0, 255], i * 4);
writeFileSync(`/tmp/claude-0/${ID}-materiali.png`, scriviPng(W, H, mat));
console.log('ok');
