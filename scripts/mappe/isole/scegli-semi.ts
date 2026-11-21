// Sceglie i semi delle 8 isole del cap. 1 col generatore di OGGI (Fase A del Pacchetto 2, agente Scenario e livelli).
// Per ogni isola: il seme deve passare la validazione al primo tentativo (tentativi = 1, niente seme+1 né riserva)
// e avere la forma che serve al suo trucco ambientale (docs/progetto/studio-v2/livelli-cap1.md).
//
//   npx tsx scripts/mappe/isole/scegli-semi.ts [semi=3000] [cartellaAnteprime]
//
// Stampa la tabella dei migliori semi e, con la cartella, scrive un'anteprima PNG 1024×512 per isola.
// Quando il generatore cambia (Fase B: kit di moduli) i semi vanno riscelti con questo script.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tentativo } from '../../../src/battaglia/gen/index';
import { MATERIALE, type MappaGenerata } from '../../../src/core/tipi';
import { BIL } from '../../../src/contenuti/bilanciamento';
import { scriviPng } from '../png';
import { misura, type Misure } from './misure';
import { PROFILI } from './profili';

const N = Number(process.argv[2] ?? 3000);
const CARTELLA = process.argv[3];

interface Candidato { seme: number; mappa: MappaGenerata; m: Misure }
const candidati: Candidato[] = [];
const t0 = performance.now();
for (let seme = 1; seme <= N; seme++) {
  const mappa = tentativo(seme, { seme, bioma: 'isola', piratiPerLato: [3, 3] });
  if (mappa) candidati.push({ seme, mappa, m: misura(mappa) });
}
console.log(`${candidati.length} semi validi al primo colpo su ${N} (${((performance.now() - t0) / 1000).toFixed(0)} s)\n`);

const usati = new Set<number>();
const scelte: { id: string; c: Candidato; voto: number; secondi: number[] }[] = [];
for (const p of PROFILI) {
  const ok = candidati.filter((c) => !usati.has(c.seme) && p.adatto(c.m)).map((c) => ({ c, v: p.voto(c.m) }));
  ok.sort((a, b) => b.v - a.v || a.c.seme - b.c.seme);
  if (p.rifinisci) {
    const testa = ok.slice(0, 40).map((x) => ({ ...x, v: p.rifinisci!(x.c.mappa) }));
    testa.sort((a, b) => b.v - a.v || a.c.seme - b.c.seme);
    ok.splice(0, testa.length, ...testa);
  }
  if (!ok.length) { console.log(`${p.id}: nessun seme adatto`); continue; }
  usati.add(ok[0].c.seme);
  scelte.push({ id: p.id, c: ok[0].c, voto: ok[0].v, secondi: ok.slice(1, 4).map((x) => x.c.seme) });
  console.log(`${p.id} ${p.trucco.padEnd(11)} seme ${String(ok[0].c.seme).padStart(4)}  adatti ${String(ok.length).padStart(4)}  riserve ${ok.slice(1, 4).map((x) => x.c.seme).join(', ')}`);
  console.log(`   ${p.descrivi(ok[0].c.m)}${p.rifinisci ? ` | rifinitura ${ok[0].v}` : ''}`);
}

if (CARTELLA) {
  mkdirSync(CARTELLA, { recursive: true });
  for (const s of scelte) {
    const p = PROFILI.find((x) => x.id === s.id)!;
    writeFileSync(join(CARTELLA, `${s.id}-${p.trucco}-seme-${s.c.seme}.png`), anteprima(s.c.mappa, p.punto(s.c.m, s.c.mappa)));
  }
  writeFileSync(join(CARTELLA, 'semi.json'), JSON.stringify(scelte.map((s) => ({ id: s.id, seme: s.c.seme, riserve: s.secondi, misure: s.c.m })), null, 1));
  console.log(`\nanteprime in ${CARTELLA}`);
}

/** Anteprima a metà risoluzione: materiali, mare (e Marea alta tratteggiata), spawn, appigli, barili, punto del trucco. */
function anteprima(m: MappaGenerata, trucco: { x: number; y: number; r: number }): Buffer {
  const { w: W, h: H, maschera, mare } = m.terreno;
  const w = W / 2, h = H / 2, px = new Uint8Array(w * h * 4);
  const COL: Record<number, number[]> = {
    [MATERIALE.sabbia]: [232, 209, 143], [MATERIALE.terra]: [150, 104, 62], [MATERIALE.legno]: [176, 120, 60],
    [MATERIALE.roccia]: [118, 118, 128], [MATERIALE.ghiaccio]: [200, 230, 245], [MATERIALE.ferro]: [60, 60, 70],
  };
  const metti = (x: number, y: number, c: number[]) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = maschera[y * 2 * W + x * 2];
    const c = COL[v] ?? (y * 2 >= mare ? [47, 111, 168] : y * 2 >= BIL.mondo.mareMareaAlta && x % 6 < 3 ? [120, 170, 210] : [214, 236, 248]);
    metti(x, y, c);
  }
  const quadrato = (cx: number, cy: number, r: number, c: number[]) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) metti(Math.round(cx / 2) + x, Math.round(cy / 2) + y, c); };
  for (const a of m.appigli ?? []) for (let y = a.yAlto; y <= a.yBasso; y += 2) quadrato(a.x, y, 1, a.tipo === 'scala' ? [110, 60, 20] : [40, 150, 50]);
  for (const b of m.barili ?? []) quadrato(b.x, b.y - 8, 4, [30, 30, 30]);
  m.spawn[0].forEach((p) => quadrato(p.x, p.y - 10, 4, [220, 40, 40]));
  m.spawn[1].forEach((p) => quadrato(p.x, p.y - 10, 4, [40, 70, 220]));
  // cerchio giallo sul punto del trucco
  for (let a = 0; a < 360; a += 1) for (const d of [0, 1, 2]) {
    const r = trucco.r / 2 + d;
    metti(Math.round(trucco.x / 2 + r * Math.cos((a * Math.PI) / 180)), Math.round(trucco.y / 2 + r * Math.sin((a * Math.PI) / 180)), [250, 200, 0]);
  }
  return scriviPng(w, h, px);
}
