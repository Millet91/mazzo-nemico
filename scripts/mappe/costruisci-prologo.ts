// Variante "prologo" di Cala Pappagallo (Lead design: 10 §2, 16 §3): stessa isola, molo al posto del relitto,
// gradino di 20 px, posizioni fisse da copione (niente validazione di equità).
//
//   npx tsx scripts/mappe/costruisci-prologo.ts [terreno.png]
//
// Scrive src/battaglia/mappe/cala-pappagallo-prologo.dati.ts e /tmp/claude-0/cala-pappagallo-prologo-materiali.png
// (per il pittore, come costruisci.ts).
import { readFileSync, writeFileSync } from 'node:fs';
import { MATERIALE, type Decorazione, type Punto } from '../../src/core/tipi';
import { superficie } from '../../src/battaglia/gen/analisi';
import { codificaMaschera } from '../../src/battaglia/mappe/rle';
import { costruisciMaschera, W, H, MARE, FONDALE, APPIGLI, MOLO, GRADINO } from './cala-pappagallo-forma';
import { leggiPng, scriviPng } from './png';

const ID = 'cala-pappagallo-prologo';
const arteFile = process.argv[2];
const { m, tag } = costruisciMaschera('prologo');
if (arteFile) {
  const { w, h, rgba } = leggiPng(readFileSync(arteFile));
  if (w !== W || h !== H) throw new Error(`terreno ${w}×${h}, serve ${W}×${H}`);
  let diversi = 0;
  for (let i = 0; i < W * H; i++) if ((rgba[i * 4 + 3] >= 128) !== (m[i] !== MATERIALE.aria) && Math.floor(i / W) < FONDALE) diversi++;
  console.log(`quadro: ${diversi} px diversi dalla maschera`);
  if (diversi > 0) throw new Error('il quadro non corrisponde alla forma: rifare la pittura');
}
const sup = superficie(m);
/** primo suolo sotto la quota y (per chi sta sotto un ponte o un tetto) */
const suolo = (x: number, y: number) => { while (y < H && m[y * W + x] === MATERIALE.aria) y++; return y; };

// copione (10 §2): Scarlatta e un pirata sulla Terrazza bassa, cassa di Rum a 150 px oltre il gradino;
// marinaio 1 in fondo al molo sopra il mare, marinaio 2 nella Valle sinistra tra Mesa e Rocca
const scarlatta = { x: 262, y: suolo(262, 800) };   // sotto la piattaforma della torre
const pirata = { x: 300, y: sup[300] };
const cassa = { x: scarlatta.x + 150, y: sup[scarlatta.x + 150] };   // sul ripiano del gradino
const marinaio1 = { x: MOLO.x0 + 18, y: MOLO.piano };
const marinaio2 = { x: 846, y: suolo(846, 700) };
const spawn: [Punto[], Punto[]] = [[scarlatta, pirata], [marinaio2, marinaio1]];
// niente barili (il copione non li usa) e niente appigli a destra
const barili: Punto[] = [];
const appigli = APPIGLI.filter((a) => a.x < W / 2);
const segnaposti: Record<string, Punto> = {
  cassa,
  veliero: { x: MOLO.x0 - 8, y: MARE },           // ormeggiato a sinistra del molo: lo disegna il Render
  cartello: { x: MOLO.x1 - 14, y: MOLO.piano },    // "Vietato sbarcare" (16 §3), all'attacco del molo
  gradino: { x: GRADINO.x0, y: sup[GRADINO.x0 + 4] },
  // i due marinai col nome del copione (10 §2): il primo si colpisce col cannone (0:45), il secondo si butta in mare (2:30)
  marinaioCannone: marinaio2,
  marinaioSciabola: marinaio1,
};
const decorazioni: Decorazione[] = ([
  ['palma', 612, 1.1, false], ['masso', 652, 0.8, true], ['palma', 1912, 1, true], ['cespuglio', 758, 0.8, false],
  ['cespuglio', 1290, 0.8, true], ['palma', 1436, 1.05, true], ['masso', 1396, 0.8, false], ['palma', 1560, 1, false], ['cespuglio', 1700, 0.9, true],
] as [Decorazione['tipo'], number, number, boolean][]).map(([tipo, x, scala, specchio]) => ({ tipo, x, y: sup[x], scala, specchio }));

for (const [n, p] of Object.entries({ scarlatta, pirata, cassa, marinaio1, marinaio2 })) {
  const sotto = m[p.y * W + p.x] !== MATERIALE.aria, sopra = m[(p.y - 1) * W + p.x] === MATERIALE.aria;
  if (!sotto || !sopra) throw new Error(`${n} in (${p.x}, ${p.y}) non sta sul suolo`);
}
if (cassa.y !== sup[cassa.x - 8] || cassa.y !== sup[cassa.x + 8]) throw new Error('la cassa non sta in piano');
console.log({ spawn, barili, segnaposti, appigli: appigli.length, gradino: sup[GRADINO.x0 - 10] - sup[GRADINO.x0 + 10] });

writeFileSync(`src/battaglia/mappe/${ID}.dati.ts`, `// GENERATO da scripts/mappe/costruisci-prologo.ts: non modificare a mano.
import type { DatiMappaFatta } from './tipi';

export const DATI: DatiMappaFatta = ${JSON.stringify({
  id: ID, nome: 'Cala Pappagallo (Prologo)', bioma: 'isola', mare: MARE, w: W, h: H, arte: arteFile ? ID : undefined,
  copione: true, spawn, barili, appigli, segnaposti, decorazioni, maschera: codificaMaschera(m),
}, null, 1)};
`);
const mat = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) if (m[i]) mat.set([m[i] * 40, tag[i] * 50, 0, 255], i * 4);
writeFileSync(`/tmp/claude-0/${ID}-materiali.png`, scriviPng(W, H, mat));
console.log('ok');
