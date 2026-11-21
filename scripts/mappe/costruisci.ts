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
import { costruisciMaschera, W, H, MARE, FONDALE, APPIGLI } from './cala-pappagallo-forma';
import { leggiPng, scriviPng } from './png';

const ID = 'cala-pappagallo';
const arteFile = process.argv[2];
const forma = costruisciMaschera();
let m: Uint8Array;

// la maschera è sempre quella della forma; con un quadro si controlla che il suo alfa coincida (aria < 128 ≤ solido)
m = forma.m;
if (arteFile) {
  const { w, h, rgba } = leggiPng(readFileSync(arteFile));
  if (w !== W || h !== H) throw new Error(`terreno ${w}×${h}, serve ${W}×${H}`);
  let diversi = 0;
  for (let i = 0; i < W * H; i++) if ((rgba[i * 4 + 3] >= 128) !== (m[i] !== MATERIALE.aria) && Math.floor(i / W) < FONDALE) diversi++;
  console.log(`quadro: ${diversi} px diversi dalla maschera`);
  if (diversi > 2000) throw new Error('il quadro non corrisponde alla forma: rifare la pittura');
}

const sup = superficie(m);
const s: ConRng = { rng: semeIniziale(20261121) };

/** più larga del generatore (60): il proprietario ha trovato i pirati troppo vicini */
const DISTANZA = 76;
/** come il generatore: posti distanti almeno distanzaCompagni, in ordine casuale */
function scegli(posti: Posto[], n: number): Posto[] {
  const out: Posto[] = [];
  for (const p of mescola(s, posti.slice())) {
    if (out.every((q) => Math.abs(q.x - p.x) >= DISTANZA)) out.push(p);
    if (out.length === n) break;
  }
  return out.sort((a, b) => a.x - b.x);
}

/** posti lontani dagli appigli (≥ 44 px, scale-e-liane.md) e dal bordo interno della Mesa (lascia i balconi ai barili) */
const lontani = (l: Posto[]) => l.filter((p) => APPIGLI.every((a) => Math.abs(a.x - p.x) >= 44) && Math.abs(p.x - W / 2) >= 300);
const tutti: [Posto[], Posto[]] = [lontani(postiValidi(m, sup, MARE, false)), lontani(postiValidi(m, sup, MARE, true))];
let scelti: [Posto[], Posto[]] | null = null;
const motivi: Record<string, number> = {};
for (let k = 0; k < 400 && !scelti; k++) {
  const prova: [Posto[], Posto[]] = [scegli(tutti[0], REGOLE.spawnPerLato), scegli(tutti[1], REGOLE.spawnPerLato)];
  if (prova[0].length < REGOLE.spawnPerLato || prova[1].length < REGOLE.spawnPerLato) continue;
  const e = controllaInsieme(m, sup, MARE, prova, true);
  if (e.length) { motivi[e[0].replace(/[0-9(),. -]+/g, ' ').slice(0, 60)] = (motivi[e[0].replace(/[0-9(),. -]+/g, ' ').slice(0, 60)] ?? 0) + 1; continue; }
  scelti = prova;
}
if (!scelti) throw new Error(`nessuna scelta di spawn valida (posti: ${tutti[0].length} / ${tutti[1].length}) ${JSON.stringify(motivi)}`);
const centro = (a: Punto, b: Punto) => Math.abs(a.x - W / 2) - Math.abs(b.x - W / 2);
const spawn: [Punto[], Punto[]] = [scelti[0].map((p) => ({ x: p.x, y: p.y })).sort(centro), scelti[1].map((p) => ({ x: p.x, y: p.y })).sort(centro)];
// i barili hanno pochi posti buoni (balconi, Rocca, ponti): si riprova con altri semi finché sono almeno 3
let barili: Punto[] = [];
for (let k = 0; k < 200; k++) {
  const m2 = m.slice(), sup2 = sup.slice();
  const b = piazzaBarili({ rng: semeIniziale(7000 + k) }, m2, sup2, MARE, [...spawn[0], ...spawn[1]]);
  if (b.length >= 3) { barili = b; m.set(m2); sup.set(sup2); break; }
}

// decorazioni scelte a mano (x), appoggiate al suolo
const decorazioni: Decorazione[] = ([
  ['palma', 136, 0.95, false], ['cespuglio', 758, 0.8, false], ['palma', 1912, 1, true], ['masso', 1960, 0.8, false],
  ['cespuglio', 1290, 0.8, true], ['palma', 517, 0.9, true], ['palma', 1531, 0.9, false], ['masso', 337, 0.7, false], ['masso', 1711, 0.7, true],
] as [Decorazione['tipo'], number, number, boolean][])
  .filter(([, x]) => { const b = Array.from({ length: 21 }, (_, k) => sup[x - 10 + k]); return Math.max(...b) - Math.min(...b) <= 14; })   // niente oggetti sui pendii ripidi
  .filter(([, x]) => [...spawn[0], ...spawn[1]].every((p) => Math.abs(p.x - x) >= REGOLE.decorazioniLontanoDaSpawn))
  .map(([tipo, x, scala, specchio]) => ({ tipo, x, y: Math.max(...Array.from({ length: 21 }, (_, k) => sup[x - 10 + k])) + 2, scala, specchio }));   // piedi nel punto più basso della base

const mappa: MappaGenerata = {
  terreno: { w: W, h: H, maschera: m, mare: MARE },
  spawn, bioma: 'isola', semeUsato: 0, tentativi: 1, specchiata: false, decorazioni, barili, appigli: APPIGLI,
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
  spawn, barili, appigli: APPIGLI, decorazioni, maschera: codificaMaschera(m),
}, null, 1)};
`);
// anteprima della maschera per controllo
const col = [[0, 0, 0, 0], [242, 211, 139, 255], [138, 90, 58, 255], [120, 70, 30, 255], [138, 122, 106, 255], [190, 233, 245, 255], [75, 85, 99, 255]];
const rgba = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) rgba.set(m[i] ? col[m[i]] : Math.floor(i / W) >= MARE ? [17, 106, 140, 255] : [110, 198, 240, 255], i * 4);
for (const p of [...spawn[0], ...spawn[1]]) for (let dy = -40; dy < 0; dy++) for (let dx = -6; dx <= 6; dx++) rgba.set(spawn[0].includes(p) ? [229, 72, 77, 255] : [34, 199, 217, 255], ((p.y + dy) * W + p.x + dx) * 4);
for (const b of barili) for (let dy = -20; dy < 0; dy++) for (let dx = -10; dx <= 10; dx++) rgba.set([60, 30, 10, 255], ((b.y + dy) * W + b.x + dx) * 4);
writeFileSync(`/tmp/claude-0/${ID}-maschera.png`, scriviPng(W, H, rgba));
// materiali per il pittore (scripts/mappe/dipingi): R = materiale × 40, G = etichetta × 50 (foglie, edificio, rovina, ponte), alfa = solido
const mat = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) if (m[i]) mat.set([m[i] * 40, forma.tag[i] * 50, 0, 255], i * 4);
writeFileSync(`/tmp/claude-0/${ID}-materiali.png`, scriviPng(W, H, mat));
console.log('ok');
