// Costruisce le isole vere del cap. 1 (Fase B del Pacchetto 2, agente Scenario e livelli; livelli-cap1.md §2).
// Ogni isola parte dal SUO seme validato (forma e partenze eque restano quelle scelte in Fase A), poi i moduli
// (src/battaglia/gen/moduli) aggiungono il trucco ambientale. Il risultato è una mappa fissa:
//
//   npx tsx scripts/mappe/isole/costruisci-isole.ts [cartellaAnteprime]
//
// scrive src/battaglia/mappe/isola-<id>.dati.ts e, con la cartella, un'anteprima PNG per isola.
// Se una regola non regge (validatore, partenze eque, niente staccato al tick 0, crolli lontani dalle partenze)
// lo script si ferma con l'errore: niente dati sbagliati scritti.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generaMappa } from '../../../src/battaglia/gen';
import { validaMappa } from '../../../src/battaglia/gen/valida';
import { specchiaMaschera } from '../../../src/battaglia/gen/isola';
import { codificaMaschera } from '../../../src/battaglia/mappe/rle';
import type { DatiMappaFatta } from '../../../src/battaglia/mappe/tipi';
import { MATERIALE, type Bioma, type MappaGenerata } from '../../../src/core/tipi';
import { cantiere } from '../../../src/battaglia/gen/moduli';
import { CAPITOLO_1 } from '../../../src/contenuti/capitolo-1';
import { ISOLE_FATTE } from '../../../src/battaglia/mappe/isole-cap1';
import { scriviPng } from '../png';
import { misura } from './misure';
import { partenzeEque } from './profili';
import { TRUCCHI } from './trucchi';
import { controllaIsola } from './controlli';

const CARTELLA = process.argv[2];

/** Mappa generata dal seme, con il lato 0 sempre a sinistra (le mappe fisse non hanno lo specchio). */
export function base(seme: number, bioma: Bioma): MappaGenerata {
  const m = generaMappa({ seme, bioma, piratiPerLato: [5, 5] });
  if (!m.specchiata) return m;
  const W = m.terreno.w;
  const maschera = m.terreno.maschera.slice();
  specchiaMaschera(maschera);
  const sp = <T extends { x: number }>(p: T): T => ({ ...p, x: W - 1 - p.x });
  return {
    ...m,
    terreno: { ...m.terreno, maschera },
    // lato 0 resta l'attaccante: dopo lo specchio sta a sinistra
    spawn: [m.spawn[0].map(sp), m.spawn[1].map(sp)],
    decorazioni: m.decorazioni.map((d) => ({ ...sp(d), specchio: !d.specchio })).reverse(),
    barili: (m.barili ?? []).map(sp).reverse(),
    appigli: (m.appigli ?? []).map(sp).reverse(),
    specchiata: false,
  };
}

/** L'isola vera: base dal seme + trucco. */
export function costruisci(id: string): MappaGenerata {
  const fatta = ISOLE_FATTE[id];
  const isola = CAPITOLO_1.isole.find((i) => i.id === id)!;
  const m = base(fatta.seme, isola.bioma);
  const c = cantiere(m.terreno.maschera, m.terreno.w, m.terreno.h);
  const extra = TRUCCHI[id](c, m);
  return { ...m, ...extra, strutture: c.strutture };
}

function dati(id: string, m: MappaGenerata): DatiMappaFatta {
  const fatta = ISOLE_FATTE[id];
  const isola = CAPITOLO_1.isole.find((i) => i.id === id)!;
  return {
    id: fatta.mappa, nome: isola.nome, bioma: isola.bioma, w: m.terreno.w, h: m.terreno.h, mare: m.terreno.mare,
    spawn: m.spawn, barili: m.barili ?? [], ...(m.appigli ? { appigli: m.appigli } : {}), decorazioni: m.decorazioni,
    ...(m.sostegni?.length ? { sostegni: m.sostegni } : {}), ...(m.strutture?.length ? { strutture: m.strutture } : {}),
    maschera: codificaMaschera(m.terreno.maschera),
  };
}

if (process.argv[1]?.endsWith('costruisci-isole.ts')) {
  if (CARTELLA) mkdirSync(CARTELLA, { recursive: true });
  for (const id of Object.keys(TRUCCHI)) {
    const m = costruisci(id);
    const err = [...validaMappa(m), ...controllaIsola(m)];
    if (!partenzeEque(misura(m))) err.push('partenze non eque');
    if (err.length) throw new Error(`${id}: ${err.slice(0, 6).join(' | ')}`);
    const d = dati(id, m);
    const nome = `src/battaglia/mappe/${ISOLE_FATTE[id].mappa}.dati.ts`;
    writeFileSync(nome, `// GENERATO da scripts/mappe/isole/costruisci-isole.ts (seme ${ISOLE_FATTE[id].seme}): non modificare a mano.\nimport type { DatiMappaFatta } from './tipi';\n\nexport const DATI: DatiMappaFatta = ${JSON.stringify(d)};\n`);
    console.log(`${id}: ${nome} (${m.strutture?.length ?? 0} strutture, ${(d.maschera.length / 1024).toFixed(0)} KB)`);
    if (CARTELLA) writeFileSync(join(CARTELLA, `${id}-${ISOLE_FATTE[id].mappa}.png`), anteprima(m));
  }
}

/** Anteprima a piena risoluzione dei materiali, con partenze e strutture. */
export function anteprima(m: MappaGenerata): Buffer {
  const { w, h, maschera, mare } = m.terreno, px = new Uint8Array(w * h * 4);
  const COL: Record<number, number[]> = {
    [MATERIALE.sabbia]: [232, 209, 143], [MATERIALE.terra]: [150, 104, 62], [MATERIALE.legno]: [196, 130, 50],
    [MATERIALE.roccia]: [118, 118, 128], [MATERIALE.ghiaccio]: [200, 230, 245], [MATERIALE.ferro]: [40, 40, 52],
  };
  const metti = (x: number, y: number, c: number[]) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) metti(x, y, COL[maschera[y * w + x]] ?? (y >= mare ? [47, 111, 168] : [214, 236, 248]));
  for (const st of m.strutture ?? []) for (let x = st.x0; x <= st.x1; x++) { metti(x, st.y0 - 3, [250, 200, 0]); metti(x, st.y0 - 4, [250, 200, 0]); }
  const quad = (cx: number, cy: number, r: number, c: number[]) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) metti(cx + x, cy + y, c); };
  for (const a of m.appigli ?? []) for (let y = a.yAlto; y <= a.yBasso; y++) quad(a.x, y, 1, a.tipo === 'scala' ? [110, 60, 20] : [40, 150, 50]);
  for (const b of m.barili ?? []) quad(b.x, b.y - 8, 7, [30, 30, 30]);
  m.spawn[0].forEach((p) => quad(p.x, p.y - 10, 6, [220, 40, 40]));
  m.spawn[1].forEach((p) => quad(p.x, p.y - 10, 6, [40, 70, 220]));
  return scriviPng(w, h, px);
}
