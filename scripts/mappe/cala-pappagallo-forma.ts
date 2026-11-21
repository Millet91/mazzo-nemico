// Forma di "Cala Pappagallo" (B1, Isola), versione 2 dopo la prova del proprietario (21/11/2026: "non serve muoversi,
// poco elaborata, partenze troppo vicine"). Ogni lato ha quattro livelli di altezze diverse e tre modi di passare:
//
//   spiaggia (relitto) → Terrazza bassa ─parete 70 px (salto all'indietro)─ Terrazza media → rampa → Mesa alta
//   la Terrazza bassa ha una galleria che sbuca nella Valle; dalla Mesa un ponte di legno porta al balcone della Rocca;
//   la Valle passa sotto il ponte ed entra nell'arco della Rocca, che collega le due metà al riparo.
//
// La Rocca del Pappagallo (cima a y 292) toglie la linea di tiro tra le due metà: bisogna tirare a parabola o spostarsi.
// Il lato destro è la stessa idea non specchiata (Mesa con sporgenza a becco, rovina sulla Terrazza media).
import { MATERIALE } from '../../src/core/tipi';

export const W = 2048, H = 1024, MARE = 950, FONDALE = 984;

/** Superficie della metà sinistra (x < 1024): la destra è la stessa specchiata (equità 06 §4), con decorazioni diverse. */
const SINISTRA: [number, number][] = [
  [64, 1000], [92, 956], [140, 928], [190, 896], [222, 868], [240, 860],
  // Terrazza bassa
  [300, 858], [360, 861], [420, 857],
  // parete verso la Terrazza media (70 px: salto all'indietro, scala o galleria)
  [430, 854], [434, 786], [442, 782],
  // Terrazza media
  [500, 784], [570, 780],
  // rampa verso la Mesa alta
  [600, 748], [630, 700], [656, 650], [676, 626],
  // Mesa alta
  [720, 620], [770, 622], [800, 626],
  // dirupo nella Valle (liana)
  [802, 630], [802, 846], [812, 850],
  // Valle (sotto il ponte)
  [860, 852], [880, 848],
  // Rocca del Pappagallo, metà sinistra
  [896, 800], [910, 700], [926, 600], [948, 470], [972, 370], [992, 312], [1012, 292], [1024, 290],
];
/** Cima della Rocca: il becco pende verso destra (unica asimmetria della sagoma). */
const BECCO_CIMA: [number, number][] = [[1036, 296], [1052, 318], [1068, 340], [1080, 348]];
/** tutto il corpo dell'isola sta 18 px più in alto della prima bozza (riempimento ≥ 20%), spiagge escluse */
const ALZA = 18;
const PROFILO: [number, number][] = [
  ...SINISTRA,
  ...BECCO_CIMA,
  ...SINISTRA.slice().reverse().filter(([x]) => 2048 - x > 1080).map(([x, y]): [number, number] => [2048 - x, y]),
];

export function superficieDisegnata(): Float64Array {
  const s = new Float64Array(W).fill(H);
  const P = PROFILO.map(([x, y]): [number, number] => [x, y < 870 ? y - ALZA : y]);
  for (let i = 0; i < P.length - 1; i++) {
    const [x0, y0] = P[i], [x1, y1] = P[i + 1];
    for (let x = Math.round(x0); x <= Math.round(x1); x++) {
      const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      s[x] = y0 + (y1 - y0) * t;
    }
  }
  // ammorbidisce gli spigoli (media su 5 px) senza toccare le pareti ripide
  const a = s.slice();
  for (let x = 3; x < W - 3; x++) {
    let v = 0; for (let k = -2; k <= 2; k++) v += a[x + k];
    const m = v / 5;
    if (Math.abs(a[x + 1] - a[x - 1]) < 30) s[x] = m;
  }
  // piccole gobbe deterministiche sui tratti in piano
  for (let x = 0; x < W; x++) s[x] += Math.sin(x / 19) * 1.0 + Math.sin(x / 53 + 1) * 1.3;
  for (let x = 0; x < W; x++) if (x < 64 || x >= W - 64) s[x] = H;
  return s;
}

/** Arco della Rocca: galleria percorribile dalla Valle sinistra alla destra (pavimento alla quota delle valli). */
export const ARCO = { x0: 882, x1: 1166, pavimento: 830, volta: 712 };
/** Gallerie: dalla Terrazza bassa alla Valle (sinistra) e dalla Valle alla Terrazza bassa (destra). */
export const GALLERIE = [
  { x0: 404, x1: 846, pavimento: 840, alto: 54, scende: 50 },
  { x0: 1202, x1: 1644, pavimento: 840, alto: 54, scende: 50 },
];
/** Grotte chiuse (solo da scavare): sotto le Mese. */
export const GROTTE = [
  { x: 720, y: 694, rx: 44, ry: 28 },
  { x: 1328, y: 694, rx: 44, ry: 28 },
];
/** Ponti di legno: dalla Mesa al balcone della Rocca. */
export const PONTI = [
  { x0: 794, x1: 930, y0: 608, y1: 544, spessore: 14 },
  { x0: 1118, x1: 1254, y0: 544, y1: 608, spessore: 14 },
];
/** Balconi di roccia sui fianchi della Rocca, dove arrivano i ponti. */
export const BALCONI = [
  { x0: 912, x1: 962, y: 544, spessore: 26 },
  { x0: 1086, x1: 1136, y: 544, spessore: 26 },
];
/** Relitto arenato sulla spiaggia sinistra. */
export const RELITTO = { x0: 104, x1: 240, chiglia: 942, ponte: 852 };
/** Rovina: muretto di pietra sulla Terrazza media destra. */
export const ROVINA = { x0: 1424, x1: 1450, alto: 46 };
/** Scoglio del Granchio: masso di roccia sulla spiaggia destra (fa da riparo come il relitto a sinistra). */
export const SCOGLIO = { x: 1880, y: 900, rx: 70, ry: 52 };

/** Edifici di legno (riparo distruttibile): torri di vedetta sulle Terrazze basse, capanna sulla Terrazza media sinistra. */
export const TORRI = [
  { x0: 214, x1: 262, base: 846, piano: 726 },
  { x0: 1786, x1: 1834, base: 846, piano: 726 },
];
/** Cespugli fitti (terra dipinta a foglie): riparo davanti alle pareti. */
export const CESPUGLI = [
  { x: 342, y: 836, rx: 13, ry: 14 }, { x: 1706, y: 836, rx: 13, ry: 14 },
  { x: 512, y: 758, rx: 12, ry: 13 }, { x: 1536, y: 758, rx: 12, ry: 13 },
];
/** Nido: cengia scavata nel fianco della Rocca, sopra i balconi (si sale con la liana). x0 è il bordo verso il balcone. */
export const NIDO = { x0: 938, x1: 978, y: 430 };
/** Appigli per la scalata (contratto della Fisica: segmento verticale in aria, x = asse, yAlto = suolo in cima). */
export const APPIGLI: { tipo: 'scala' | 'liana'; x: number; yAlto: number; yBasso: number }[] = [
  // parete tra Terrazza bassa e Terrazza media
  { tipo: 'scala', x: 428, yAlto: 765, yBasso: 851 },
  { tipo: 'scala', x: 1618, yAlto: 765, yBasso: 852 },
  // dal balcone al Nido sul fianco della Rocca
  { tipo: 'liana', x: 930, yAlto: NIDO.y, yBasso: 544 },
  { tipo: 'liana', x: 1118, yAlto: NIDO.y, yBasso: 544 },
  // torri di vedetta (lato verso il mare)
  { tipo: 'scala', x: 202, yAlto: 726, yBasso: 826 },
  { tipo: 'scala', x: 1846, yAlto: 726, yBasso: 848 },
];
/** Etichette per il pittore (canale verde della PNG dei materiali). */
export const TAG = { foglie: 1, edificio: 2, rovina: 3, ponte: 4 } as const;

export function costruisciMaschera(): { m: Uint8Array; sup: Float64Array; tag: Uint8Array } {
  const sup = superficieDisegnata();
  const m = new Uint8Array(W * H);
  const tag = new Uint8Array(W * H);
  const metti = (x: number, y: number, v: number) => { if (x >= 64 && x < W - 64 && y >= 160 && y < FONDALE) m[y * W + x] = v; };
  // la roccia comincia sotto una linea morbida (media della superficie su ±110 px): niente cuciture dritte
  const liscia = new Float64Array(W);
  for (let x = 0; x < W; x++) { let t = 0, n = 0; for (let k = -110; k <= 110; k += 5) { t += Math.min(sup[Math.max(0, Math.min(W - 1, x + k))], 950); n++; } liscia[x] = t / n; }
  for (let x = 0; x < W; x++) {
    const s = Math.round(sup[x]);
    const linea = Math.max(s + 40, liscia[x] + 150 + Math.sin(x / 57) * 10 + Math.sin(x / 23) * 4);
    for (let y = Math.max(160, s); y < FONDALE; y++) {
      const prof = y - s;
      m[y * W + x] = prof < 24 ? MATERIALE.sabbia : y < linea ? MATERIALE.terra : MATERIALE.roccia;
    }
    for (let y = FONDALE; y < H; y++) m[y * W + x] = MATERIALE.ferro;
  }
  // Rocca: roccia viva sotto la pelle di sabbia (nucleo a ellisse)
  for (let x = 840; x < 1210; x++) {
    const s = Math.round(sup[x]);
    for (let y = s + 26; y < 960; y++) {
      if (((x - 1024) / 200) ** 2 + ((y - 590) / 360) ** 2 <= 1 && m[y * W + x]) m[y * W + x] = MATERIALE.roccia;
    }
  }
  // Mese: roccia sotto la cima (si scavano piano)
  for (const [cx, cy] of [[740, 682], [1308, 682]]) for (let x = cx - 90; x < cx + 90; x++) {
    const s = Math.round(sup[x]);
    for (let y = s + 26; y < 802; y++) if (((x - cx) / 90) ** 2 + ((y - cy) / 110) ** 2 <= 1 && m[y * W + x]) m[y * W + x] = MATERIALE.roccia;
  }
  // balconi e becco (roccia)
  for (const b of BALCONI) {
    for (let x = b.x0; x <= b.x1; x++) {
      const t = (x - b.x0) / (b.x1 - b.x0), sotto = b.spessore * (0.55 + 0.45 * Math.sin(Math.PI * t));
      for (let y = b.y; y < b.y + sotto; y++) metti(x, y, MATERIALE.roccia);
    }
  }
  // ponti di legno (assi spesse 14 px, appena incurvate)
  for (const p of PONTI) for (let x = p.x0; x <= p.x1; x++) {
    const t = (x - p.x0) / (p.x1 - p.x0), y = Math.round(p.y0 + (p.y1 - p.y0) * t + Math.sin(Math.PI * t) * 14);
    for (let k = 0; k < p.spessore; k++) if (!m[(y + k) * W + x]) { metti(x, y + k, MATERIALE.legno); tag[(y + k) * W + x] = TAG.ponte; }
  }
  // arco
  const cx = (ARCO.x0 + ARCO.x1) / 2, rx = (ARCO.x1 - ARCO.x0) / 2, ry = ARCO.pavimento - ARCO.volta;
  for (let x = ARCO.x0; x < ARCO.x1; x++) {
    const t = (x - cx) / rx;
    const alto = ARCO.pavimento - ry * Math.pow(Math.max(0, 1 - t * t), 0.35);
    for (let y = Math.floor(alto); y < ARCO.pavimento; y++) m[y * W + x] = MATERIALE.aria;
  }
  // gallerie (volta arrotondata alle due bocche)
  // (il pavimento scende nel mezzo, così sopra resta terra piena per gli sbarchi della Terrazza media)
  for (const g of GALLERIE) for (let x = g.x0; x < g.x1; x++) {
    const t = (x - g.x0) / (g.x1 - g.x0), bordo = Math.min(x - g.x0, g.x1 - x);
    const pav = g.pavimento + g.scende * Math.sin(Math.PI * t) ** 0.6 * Math.min(1, bordo / 40);
    const alto = g.alto * Math.min(1, 0.6 + bordo / 50) + Math.sin(x / 27) * 3;
    for (let y = Math.floor(pav - alto); y < pav; y++) m[y * W + x] = MATERIALE.aria;
  }
  // grotte
  for (const g of GROTTE) for (let y = g.y - g.ry; y <= g.y + g.ry; y++) for (let x = g.x - g.rx; x <= g.x + g.rx; x++) {
    if (((x - g.x) / g.rx) ** 2 + ((y - g.y) / g.ry) ** 2 <= 1) m[y * W + x] = MATERIALE.aria;
  }
  // relitto: scafo di legno inclinato e arenato sulla spiaggia
  const R = RELITTO;
  for (let x = R.x0; x <= R.x1; x++) {
    const t = (x - R.x0) / (R.x1 - R.x0);
    const linea = R.chiglia + (R.ponte - R.chiglia) * t;
    const ponte = Math.round(linea - 46 * Math.sin(Math.PI * (0.15 + 0.7 * t)) - 10);
    const fondo = Math.round(linea + 22);
    for (let y = ponte; y < fondo && y < MARE + 20; y++) {
      const i = y * W + x;
      if (m[i] && m[i] !== MATERIALE.sabbia) continue;
      m[i] = MATERIALE.legno;
    }
  }
  // scoglio sulla spiaggia destra
  for (let y = SCOGLIO.y - SCOGLIO.ry; y <= SCOGLIO.y + SCOGLIO.ry; y++) for (let x = SCOGLIO.x - SCOGLIO.rx; x <= SCOGLIO.x + SCOGLIO.rx; x++) {
    const dx = (x - SCOGLIO.x) / SCOGLIO.rx, dy = (y - SCOGLIO.y) / SCOGLIO.ry;
    if (dx * dx + dy * dy * (dy < 0 ? 1 + dx * 0.6 : 1) <= 1) metti(x, y, MATERIALE.roccia);
  }
  // rovina: muretto di roccia
  for (let x = ROVINA.x0; x <= ROVINA.x1; x++) {
    const s = Math.round(sup[x]);
    for (let y = s - ROVINA.alto + Math.round(Math.abs(x - ROVINA.x0 - 8) * 0.4); y < s; y++) { metti(x, y, MATERIALE.roccia); tag[y * W + x] = TAG.rovina; }
  }
  // Nido: cengia piana nella Rocca, con la parete dietro (lato sinistro e il suo specchio)
  for (const [a0, a1] of [[NIDO.x0, NIDO.x1], [W - NIDO.x1, W - NIDO.x0]]) for (let x = a0; x <= a1; x++) {
    for (let y = NIDO.y - 52 + Math.round(((x - a0) / (a1 - a0) - 0.5) ** 2 * 40); y < NIDO.y; y++) if (m[y * W + x] === MATERIALE.roccia) m[y * W + x] = MATERIALE.aria;
    for (let y = NIDO.y; y < NIDO.y + 24; y++) if (!m[y * W + x]) metti(x, y, MATERIALE.roccia);
  }
  const legno = (x: number, y: number) => { metti(x, y, MATERIALE.legno); tag[y * W + x] = TAG.edificio; };
  // torri di vedetta: due pali, piano con parapetto, tetto a punta
  for (const t of TORRI) {
    for (const px of [t.x0 + 4, t.x1 - 12]) for (let x = px; x < px + 8; x++) for (let y = t.piano; y < t.base + 4; y++) legno(x, y);
    for (let x = t.x0 - 4; x <= t.x1 + 4; x++) for (let y = t.piano; y < t.piano + 10; y++) legno(x, y);
    // parapetto solo sul lato verso il centro (riparo); dal lato della scala si entra
    const px = t.x0 < W / 2 ? t.x1 - 2 : t.x0 - 4;
    for (let x = px; x < px + 6; x++) for (let y = t.piano - 28; y < t.piano; y++) legno(x, y);
    const cx = (t.x0 + t.x1) / 2;
    for (let y = t.piano - 64; y < t.piano - 28; y++) { const l = ((y - (t.piano - 64)) / 36) * 34; for (let x = Math.round(cx - l); x <= cx + l; x++) if (y > t.piano - 60 + Math.abs(x - cx) * 36 / 34 - 4 || y > t.piano - 40) legno(x, y); }
  }
  // cespugli fitti
  for (const b of CESPUGLI) for (let y = b.y - b.ry; y <= b.y + b.ry; y++) for (let x = b.x - b.rx; x <= b.x + b.rx; x++) {
    const n = Math.sin(x * 0.7) * 0.08 + Math.cos(y * 0.9) * 0.08;
    if (((x - b.x) / b.rx) ** 2 + ((y - b.y) / b.ry) ** 2 <= 1 + n) { metti(x, y, MATERIALE.terra); tag[y * W + x] = TAG.foglie; }
  }
  return { m, sup, tag };
}
