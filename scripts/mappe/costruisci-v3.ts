// Costruisce i dati di Cala Pappagallo v3 (mappa di battaglia e variante del Prologo) dalla forma disegnata.
//
//   npx tsx scripts/mappe/costruisci-v3.ts [cartella-con-i-quadri]
//
// Scrive src/battaglia/mappe/cala-pappagallo-v3.dati.ts e cala-pappagallo-v3-prologo.dati.ts, e nella cartella
// di lavoro (USCITA, predefinita /tmp/claude-0) le PNG dei materiali per il pittore (scripts/mappe/dipingi) e
// un'anteprima della maschera. Con la cartella dei quadri (terreno.png e terreno-prologo.png usciti dal pittore)
// controlla che l'alfa del quadro coincida con la maschera e segna `arte` nei dati.
//
// Regole in più rispetto alla v2 (studio v2):
//  - nessuna partenza a meno di 120 px da una torre o da un masso (in Fase 3 crollano), né nella zona di caduta di
//    una struttura (sotto i suoi pezzi fino al mare, allargata di BIL.crolli.rispettoSpawnPx per lato):
//    lì la sim non farebbe cadere niente (P1-contratti §7);
//  - un colpo diretto del cannone v2 (danno 60, +10% del Teschio) non butta in mare nessuna partenza;
//  - nel Prologo i nemici stanno ad almeno 300 px dai pirati del giocatore.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { MATERIALE, type Decorazione, type MappaGenerata, type Punto, type StrutturaMappa } from '../../src/core/tipi';
import { BIL } from '../../src/contenuti/bilanciamento';
import { superficie } from '../../src/battaglia/gen/analisi';
import { spianaBarile } from '../../src/battaglia/gen/barili';
import { distanzaAppiglio } from '../../src/battaglia/gen/appigli';
import { controllaInsieme, postiValidi, spinto, type Posto } from '../../src/battaglia/gen/spawn';
import { validaMappa, riempimento } from '../../src/battaglia/gen/valida';
import { REGOLE } from '../../src/battaglia/gen/parametri';
import { mescola, semeIniziale, type ConRng } from '../../src/core/rng';
import { codificaMaschera } from '../../src/battaglia/mappe/rle';
import {
  costruisciMaschera, W, H, MARE, FONDALE, appigliDi, BARILI_X, TORRI_X, DISTANZA_CROLLO, ANELLI, APPOGGI, MOLO, PONTI, quotaPonte,
  GROTTA, NIDO, MASSI, SOSTEGNI, cimeDelleStrutture, nellaZona, type StrutturaForma, type Variante,
} from './cala-v3-forma';
import { leggiPng, scriviPng } from './png';

const USCITA = process.env.USCITA ?? '/tmp/claude-0';
const quadri = process.argv[2];
/** Spinta di un colpo diretto del cannone v2 (PIANO §7: danno 60, col +10% del Teschio), in px/tick. */
export const SPINTA_CANNONE_V2 = Math.floor(60 * (1 + BIL.tratti.teschioBonusDanno)) * BIL.fisica.spintaPerDanno;
/** partenze più larghe del generatore (60): il proprietario ha trovato i pirati troppo vicini */
const DISTANZA = 76;
/** le partenze restano fuori dal centro (balconi, Valli e arco sono terra di nessuno) */
const DAL_CENTRO = 240;

function controllaQuadro(file: string, m: Uint8Array): void {
  const { w, h, rgba } = leggiPng(readFileSync(file));
  if (w !== W || h !== H) throw new Error(`${file}: ${w}×${h}, serve ${W}×${H}`);
  let diversi = 0;
  for (let i = 0; i < W * H; i++) if ((rgba[i * 4 + 3] >= 128) !== (m[i] !== MATERIALE.aria) && Math.floor(i / W) < FONDALE) diversi++;
  console.log(`${file}: ${diversi} px diversi dalla maschera`);
  if (diversi > 0) throw new Error('il quadro non corrisponde alla forma: rifare la pittura');
}
function scriviMateriali(id: string, m: Uint8Array, tag: Uint8Array, pezzo: Uint8Array): void {
  // R = materiale × 40, G = etichetta × 30, B = pezzo di struttura (Fase 3: il pittore separa i pezzi), alfa = solido
  const mat = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) if (m[i]) mat.set([m[i] * 40, tag[i] * 30, pezzo[i], 255], i * 4);
  writeFileSync(`${USCITA}/${id}-materiali.png`, scriviPng(W, H, mat));
}
function anteprima(id: string, m: Uint8Array, spawn: [Punto[], Punto[]], barili: Punto[], appigli: { x: number; yAlto: number; yBasso: number }[]): void {
  const col = [[0, 0, 0, 0], [242, 211, 139, 255], [138, 90, 58, 255], [160, 100, 50, 255], [138, 122, 106, 255], [190, 233, 245, 255], [75, 85, 99, 255]];
  const rgba = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) rgba.set(m[i] ? col[m[i]] : Math.floor(i / W) >= MARE ? [17, 106, 140, 255] : [110, 198, 240, 255], i * 4);
  for (const [lato, c] of [[spawn[0], [229, 72, 77, 255]], [spawn[1], [34, 199, 217, 255]]] as const) for (const p of lato) for (let dy = -22; dy < 0; dy++) for (let dx = -6; dx <= 5; dx++) rgba.set(c, ((p.y + dy) * W + p.x + dx) * 4);
  for (const b of barili) for (let dy = -20; dy < 0; dy++) for (let dx = -8; dx <= 8; dx++) rgba.set([60, 30, 10, 255], ((b.y + dy) * W + b.x + dx) * 4);
  for (const a of appigli) for (let y = a.yAlto; y < a.yBasso; y++) for (const dx of [-1, 0, 1]) rgba.set([255, 255, 255, 255], (y * W + a.x + dx) * 4);
  writeFileSync(`${USCITA}/${id}-maschera.png`, scriviPng(W, H, rgba));
}
/** il colpo diretto del cannone v2 lascia sulla terra chi sta in p, nei due versi */
export function restaATerra(m: Uint8Array, p: Punto): boolean {
  return ([-1, 1] as const).every((dir) => spinto(m, MARE, p, SPINTA_CANNONE_V2, 90, dir).tipo === 'terra');
}
const lontanoDalleTorri = (variante: Variante, x: number) => TORRI_X[variante].every(([x0, x1]) => x < x0 - DISTANZA_CROLLO || x > x1 + DISTANZA_CROLLO);
/** zona di caduta di una struttura (P1-contratti §7): chi parte qui la terrebbe su per tutta la battaglia */
export const MARGINE_CADUTA = BIL.crolli.rispettoSpawnPx;
/** partenza che non tiene su nessuna struttura e sta a 120 px dal centro dei massi (le torri le guarda lontanoDalleTorri) */
const lontanoDaiCrolli = (strutture: StrutturaMappa[], cime: Map<number, number>[], p: Punto) =>
  strutture.every((st, k) => !nellaZona(cime[k], p, MARGINE_CADUTA)) && MASSI.every((b) => Math.hypot(b.x - p.x, b.y - p.y) >= DISTANZA_CROLLO);
/** le strutture come le vuole il contratto (senza i nomi e i pezzi, che servono solo qui e al pittore) */
const perIDati = (l: StrutturaForma[]): StrutturaMappa[] => l.map(({ tipo, x0, y0, x1, y1, ancoraggi }) => ({ tipo, x0, y0, x1, y1, ...(ancoraggi ? { ancoraggi } : {}) }));
function decorazioni(sup: Int32Array, lista: [Decorazione['tipo'], number, number, boolean][], spawn: Punto[]): Decorazione[] {
  return lista
    .filter(([, x]) => { const b = Array.from({ length: 21 }, (_, k) => sup[x - 10 + k]); return Math.max(...b) - Math.min(...b) <= 14; })   // niente oggetti sui pendii ripidi
    .filter(([, x]) => spawn.every((p) => Math.abs(p.x - x) >= REGOLE.decorazioniLontanoDaSpawn))
    .filter(([, x]) => APPOGGI.every((a) => x < a.x0 - 16 || x > a.x1 + 16))
    .map(([tipo, x, scala, specchio]) => ({ tipo, x, y: Math.max(...Array.from({ length: 21 }, (_, k) => sup[x - 10 + k])) + 2, scala, specchio }));
}
const intestazione = (script: string) => `// GENERATO da scripts/mappe/${script}: non modificare a mano.\nimport type { DatiMappaFatta } from './tipi';\n\n`;

// ═════════════════════════ mappa di battaglia ═════════════════════════
{
  const ID = 'cala-pappagallo-v3';
  const forma = costruisciMaschera('base');
  const { m, tag, pezzo, strutture } = forma;
  const cime = cimeDelleStrutture(forma);
  const sup = superficie(m);
  const s: ConRng = { rng: semeIniziale(20261122) };
  const appigliForma = appigliDi(m, 'base');
  const buoni = (l: Posto[]) => l.filter((p) =>
    appigliForma.every((a) => distanzaAppiglio(a, p) >= 44) && Math.abs(p.x - W / 2) >= DAL_CENTRO && lontanoDalleTorri('base', p.x) &&
    lontanoDaiCrolli(strutture, cime, p) && restaATerra(m, p));
  const tutti: [Posto[], Posto[]] = [buoni(postiValidi(m, sup, MARE, false, 4)), buoni(postiValidi(m, sup, MARE, true, 4))];
  const scegli = (posti: Posto[], n: number): Posto[] => {
    const out: Posto[] = [];
    for (const p of mescola(s, posti.slice())) {
      if (out.every((q) => Math.abs(q.x - p.x) >= DISTANZA)) out.push(p);
      if (out.length === n) break;
    }
    return out.sort((a, b) => a.x - b.x);
  };
  let scelti: [Posto[], Posto[]] | null = null;
  const motivi: Record<string, number> = {};
  for (let k = 0; k < 3000 && !scelti; k++) {
    const prova: [Posto[], Posto[]] = [scegli(tutti[0], REGOLE.spawnPerLato), scegli(tutti[1], REGOLE.spawnPerLato)];
    if (prova[0].length < REGOLE.spawnPerLato || prova[1].length < REGOLE.spawnPerLato) { motivi['pochi posti'] = (motivi['pochi posti'] ?? 0) + 1; continue; }
    const e = controllaInsieme(m, sup, MARE, prova, true);
    if (e.length) { const c = e[0].replace(/[0-9(),.-]+/g, '').slice(0, 60); motivi[c] = (motivi[c] ?? 0) + 1; continue; }
    scelti = prova;
  }
  console.log(`posti buoni ${tutti[0].length} / ${tutti[1].length}:`, tutti.map((l) => l.map((p) => p.x).join(',')).join('  |  '));
  if (!scelti) throw new Error(`nessuna scelta di spawn valida ${JSON.stringify(motivi)}`);
  const centro = (a: Punto, b: Punto) => Math.abs(a.x - W / 2) - Math.abs(b.x - W / 2);
  const spawn: [Punto[], Punto[]] = [scelti[0].map((p) => ({ x: p.x, y: p.y })).sort(centro), scelti[1].map((p) => ({ x: p.x, y: p.y })).sort(centro)];
  const barili: Punto[] = BARILI_X.map((x) => spianaBarile(m, sup, x));
  // il quadro si confronta con la maschera finita (i barili spianano la loro base)
  const conArte = !!quadri && existsSync(`${quadri}/terreno.png`);
  if (conArte) controllaQuadro(`${quadri}/terreno.png`, m);
  const deco = decorazioni(sup, [
    ['palma', 262, 0.95, false], ['palma', 404, 0.9, true], ['cespuglio', 446, 0.8, false], ['palma', 572, 0.9, true], ['masso', 700, 0.7, false],
    ['cespuglio', 1352, 0.8, true], ['palma', 1474, 0.9, false], ['masso', 1596, 0.7, true], ['palma', 1652, 1, true], ['cespuglio', 1700, 0.8, false],
  ], [...spawn[0], ...spawn[1]]);
  const appigli = appigliDi(m, 'base');   // dopo i barili, che spianano la loro base
  const mappa: MappaGenerata = {
    terreno: { w: W, h: H, maschera: m, mare: MARE },
    spawn, bioma: 'isola', semeUsato: 0, tentativi: 1, specchiata: false, decorazioni: deco, barili, appigli,
  };
  const err = validaMappa(mappa);
  const r = riempimento(m, MARE);
  console.log(`${ID}: solido ${(r.frazione * 100).toFixed(1)}%, metà ${r.meta.join(' / ')}`);
  console.log('spawn', JSON.stringify(spawn), 'barili', JSON.stringify(barili));
  if (err.length) { console.error('NON VALIDA:\n' + err.join('\n')); process.exit(1); }
  const segnaposti: Record<string, Punto> = Object.fromEntries(ANELLI.map(([x, y], i) => [`anello${i + 1}`, { x, y }]));
  writeFileSync(`src/battaglia/mappe/${ID}.dati.ts`, `${intestazione('costruisci-v3.ts')}export const DATI: DatiMappaFatta = ${JSON.stringify({
    id: ID, nome: 'Cala Pappagallo', bioma: 'isola', mare: MARE, w: W, h: H, arte: conArte ? ID : undefined,
    spawn, barili, appigli, segnaposti, decorazioni: deco, sostegni: SOSTEGNI, strutture: perIDati(strutture), maschera: codificaMaschera(m),
  }, null, 1)};\n`);
  scriviMateriali(ID, m, tag, pezzo);
  anteprima(ID, m, spawn, barili, appigli);
}

// ═════════════════════════ variante del Prologo ═════════════════════════
{
  const ID = 'cala-pappagallo-v3-prologo';
  const { m, tag, pezzo, strutture } = costruisciMaschera('prologo');
  const conArte = !!quadri && existsSync(`${quadri}/terreno-prologo.png`);
  if (conArte) controllaQuadro(`${quadri}/terreno-prologo.png`, m);
  const sup = superficie(m);
  /** primo suolo sotto la quota y (per chi sta sotto un ponte o un tetto) */
  const suolo = (x: number, y: number) => { while (y < H && m[y * W + x] === MATERIALE.aria) y++; return y; };
  // Stazioni del Prologo (PIANO Fase 4): 1) molo e muretto, 2) scala della torre, 3) cannonata al ponte di corda,
  // 4) liana, 5) parabola sulla Rocca. Scarlatta e Mastro Gancio sbarcano sul molo; i due marinai stanno lontani.
  const scarlatta = { x: 200, y: MOLO.piano };
  const gancio = { x: 160, y: MOLO.piano };
  const marinaioPonte = { x: 852, y: quotaPonte(PONTI[0], 852) };              // sul ponte di corda sinistro
  const marinaioRocca = { x: 1304 + 24, y: sup[1304 + 24] };                    // sulla Mesa destra, dietro la Rocca
  const spawn: [Punto[], Punto[]] = [[scarlatta, gancio], [marinaioPonte, marinaioRocca]];
  const muretto = APPOGGI[0];
  const appigli = appigliDi(m, 'prologo').filter((a) => a.x < W / 2);
  const segnaposti: Record<string, Punto> = {
    veliero: { x: MOLO.x0 + 40, y: MARE },                                      // ormeggiato davanti al molo: lo disegna il Render
    cartello: { x: MOLO.x1 - 10, y: MOLO.piano },                               // "Vietato sbarcare", all'attacco del molo
    muretto: { x: muretto.x0 - 8, y: sup[muretto.x0 - 8] },                     // stazione 1: davanti al muretto
    oltreMuretto: { x: muretto.x1 + 10, y: sup[muretto.x1 + 10] },
    cassa: { x: 388, y: sup[388] },                                             // cassa di Rum, oltre il muretto
    torre: { x: appigli[0].x, y: appigli[0].yBasso },                           // stazione 2: piede della scala della torre
    ponte: { x: 760, y: sup[760] },                                             // stazione 3: da qui si vede il ponte di corda
    liana: { x: 926, y: suolo(926, NIDO.y + 2) },                               // stazione 4: piede della liana del Nido
    rocca: { x: 958, y: NIDO.y },                                               // stazione 5: dal Nido, parabola oltre la Rocca
    grotta: { x: GROTTA.bocca + 30, y: GROTTA.pavimento },
    marinaioPonte, marinaioRocca,
  };
  const deco = decorazioni(sup, [
    ['palma', 262, 0.95, false], ['palma', 404, 0.9, true], ['cespuglio', 446, 0.8, false], ['palma', 572, 0.9, true], ['masso', 700, 0.7, false],
    ['cespuglio', 1352, 0.8, true], ['palma', 1474, 0.9, false], ['masso', 1596, 0.7, true], ['palma', 1652, 1, true], ['cespuglio', 1700, 0.8, false],
  ], [...spawn[0], ...spawn[1]]);
  for (const [n, p] of Object.entries({ scarlatta, gancio, marinaioPonte, marinaioRocca })) {
    const sotto = m[p.y * W + p.x] !== MATERIALE.aria, sopra = m[(p.y - 1) * W + p.x] === MATERIALE.aria;
    if (!sotto || !sopra) throw new Error(`${n} in (${p.x}, ${p.y}) non sta sul suolo`);
  }
  for (const p of spawn[0]) {
    if (!restaATerra(m, p)) throw new Error(`Prologo: un colpo diretto butta in mare chi parte da (${p.x}, ${p.y})`);
    for (const n of spawn[1]) if (Math.hypot(n.x - p.x, n.y - p.y) < 300) throw new Error(`Prologo: nemico a meno di 300 px da (${p.x}, ${p.y})`);
  }
  console.log(`${ID}:`, JSON.stringify({ spawn, appigli: appigli.length, nemicoPiuVicino: Math.round(Math.min(...spawn[0].flatMap((p) => spawn[1].map((n) => Math.hypot(n.x - p.x, n.y - p.y))))) }));
  writeFileSync(`src/battaglia/mappe/${ID}.dati.ts`, `${intestazione('costruisci-v3.ts')}export const DATI: DatiMappaFatta = ${JSON.stringify({
    id: ID, nome: 'Cala Pappagallo (Prologo)', bioma: 'isola', mare: MARE, w: W, h: H, arte: conArte ? ID : undefined,
    copione: true, spawn, barili: [], appigli, segnaposti, decorazioni: deco, sostegni: SOSTEGNI, strutture: perIDati(strutture), maschera: codificaMaschera(m),
  }, null, 1)};\n`);
  scriviMateriali(ID, m, tag, pezzo);
  anteprima(ID, m, spawn, [], appigli);
}
console.log('ok');
