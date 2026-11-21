// Forma di "Cala Pappagallo" (B1, Isola): la sagoma disegnata a mano da cui partono la guida per l'AI e la maschera.
// Luogo: isola con due piane per gli sbarchi, al centro la Rocca del Pappagallo (cima a becco) bucata da un arco
// naturale che si attraversa a piedi; a sinistra un relitto di legno arenato sulla spiaggia, a destra una rovina.
import { MATERIALE } from '../../src/core/tipi';

export const W = 2048, H = 1024, MARE = 950, FONDALE = 984;

/** Punti di controllo della superficie (x, y), interpolati con una curva morbida. */
const PROFILO: [number, number][] = [
  [64, 1000], [96, 958], [130, 936], [170, 918], [215, 880], [262, 840], [300, 806], [318, 792], [330, 786], [344, 790],
  [380, 794], [450, 790], [540, 784], [620, 786], [700, 778], [780, 770], [840, 760],
  [875, 738], [905, 668], [930, 560], [958, 440], [985, 345], [1008, 300], [1030, 292], [1052, 318], [1075, 352],
  [1100, 362], [1124, 350], [1150, 392], [1175, 490], [1198, 610], [1220, 700], [1245, 748],
  [1300, 764], [1380, 772], [1460, 778], [1540, 784], [1620, 788], [1690, 790], [1712, 786], [1726, 792],
  [1745, 808], [1785, 840], [1830, 878], [1875, 915], [1915, 937], [1952, 958], [1984, 1000],
];

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function superficieDisegnata(): Float64Array {
  const s = new Float64Array(W).fill(H);
  const P = PROFILO;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], d = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k <= 400; k++) {
      const t = k / 400;
      const x = Math.round(catmull(a[0], b[0], c[0], d[0], t));
      const y = catmull(a[1], b[1], c[1], d[1], t);
      if (x >= 0 && x < W) s[x] = y;
    }
  }
  // rumore leggero e deterministico (piccole gobbe), solo dove non serve il piano degli sbarchi
  for (let x = 0; x < W; x++) s[x] += Math.sin(x / 23) * 1.2 + Math.sin(x / 61 + 1) * 1.6;
  for (let x = 0; x < W; x++) if (x < 64 || x >= W - 64) s[x] = H;
  return s;
}

/** Arco naturale sotto la Rocca: galleria percorribile (pavimento piano), ellisse schiacciata. */
export const ARCO = { x0: 905, x1: 1175, pavimento: 742, volta: 640 };
/** Grotta del tesoro (decorativa, chiusa) sotto la piana destra; grotta dei granchi a sinistra. */
export const GROTTE = [
  { x: 1470, y: 880, rx: 70, ry: 34 },
  { x: 560, y: 885, rx: 62, ry: 30 },
];
/** Relitto: scafo di legno arenato sulla spiaggia sinistra, inclinato. */
export const RELITTO = { x0: 104, x1: 292, chiglia: 930, ponte: 812 };
/** Rovina di pietra (muro basso) sulla piana destra, vicino alla Rocca. */
export const ROVINA = { x0: 1262, x1: 1296, alto: 52 };

export function costruisciMaschera(): { m: Uint8Array; sup: Float64Array } {
  const sup = superficieDisegnata();
  const m = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) {
    const s = Math.round(sup[x]);
    for (let y = Math.max(160, s); y < FONDALE; y++) {
      const prof = y - s;
      m[y * W + x] = prof < 24 ? MATERIALE.sabbia : prof < 160 ? MATERIALE.terra : MATERIALE.roccia;
    }
    for (let y = FONDALE; y < H; y++) m[y * W + x] = MATERIALE.ferro;
  }
  // la Rocca è roccia viva già a 40 px sotto la superficie (sopra y 700)
  // (nucleo a ellisse, così il confine con la terra è morbido)
  for (let x = 820; x < 1300; x++) {
    const s = Math.round(sup[x]);
    for (let y = s + 40; y < 900; y++) {
      const e = ((x - 1062) / 215) ** 2 + ((y - 560) / 330) ** 2;
      if (e <= 1 && m[y * W + x]) m[y * W + x] = MATERIALE.roccia;
    }
  }
  // arco
  const cx = (ARCO.x0 + ARCO.x1) / 2, rx = (ARCO.x1 - ARCO.x0) / 2, ry = ARCO.pavimento - ARCO.volta;
  for (let x = ARCO.x0; x < ARCO.x1; x++) {
    const t = (x - cx) / rx;
    const alto = ARCO.pavimento - ry * Math.sqrt(Math.max(0, 1 - t * t)) * 1.0;
    for (let y = Math.floor(alto); y < ARCO.pavimento; y++) m[y * W + x] = MATERIALE.aria;
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
  // rovina: muretto di roccia
  for (let x = ROVINA.x0; x <= ROVINA.x1; x++) {
    const s = Math.round(sup[x]);
    for (let y = s - ROVINA.alto; y < s; y++) m[y * W + x] = MATERIALE.roccia;
  }
  return { m, sup };
}
