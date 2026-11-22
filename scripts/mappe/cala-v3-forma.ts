// Forma di "Cala Pappagallo" v3 (studio v2, Pacchetto 1: livelli.md §3, PIANO §3 Fase 2, P1-contratti §4).
// Stesso scheletro della v2 (quattro livelli per lato, Rocca, ponti, arco, gallerie basse), ma le due metà NON sono
// più uno specchio e sul terreno ci sono appoggi da pirata:
//
//   SINISTRA, "il lato della parete"                      DESTRA, "il lato dolce"
//   Relitto del Pappagallo Verde: la poppa fa da          Duna della Vedetta: rampa di sabbia a ~33° lunga quasi
//   Torre della Vedetta, ci si sale con una scala         200 px (ci si sale a piedi, si scende scivolando)
//   Terrazza bassa ─ parete con la scala ─ Terrazza       Terrazza bassa ─ parete con la scala ─ Terrazza media
//   media ─ rampa ─ Mesa ─ ponte di corda ─ balcone       ─ rampa ─ Mesa ─ ponte di corda ─ balcone
//   Valle sotto il ponte                                  Valle con la liana della Grotta (dentro la Mesa)
//
// Cosa cambia rispetto alla v2, e perché:
//  - le grotte ovali chiuse (sembravano oblò) non ci sono più: restano le due gallerie vere (Terrazza bassa ↔ Valle),
//    ognuna con una sala più alta in un punto diverso; a destra una grotta aperta sulla Valle, con la sua liana;
//  - le torri di vedetta stanno in fondo all'isola, dove non passa nessuno: i loro muri non chiudono più la strada
//    (in v2 le scalette erano dietro i pali pieni) e fermano chi viene buttato verso il mare da un colpo diretto;
//  - muretti di pietra e casse alti 24-30 px sulle terrazze (riparo; si scavalcano: Fisica, Fase 1);
//  - l'Occhio della Rocca: un foro vicino alla cima, da cui passa un tiro ben fatto;
//  - niente percorso obbligato usa il salto all'indietro.
// Le due torri (legno) e i ponti sono gli elementi che crolleranno in Fase 3: nessuna partenza a meno di 120 px da una torre.
import { MATERIALE } from '../../src/core/tipi';

export const W = 2048, H = 1024, MARE = 950, FONDALE = 984;
export type Variante = 'base' | 'prologo';
type P2 = [number, number];

/** Etichette per il pittore (canale verde della PNG dei materiali, × 30). */
export const TAG = { foglie: 1, edificio: 2, pietra: 3, ponte: 4, molo: 5, cassa: 6 } as const;

// ───────────────────────── profilo dell'isola (da sinistra a destra, quote vere) ─────────────────────────
const PROFILO: P2[] = [
  // spiaggia sinistra (sotto il relitto)
  [64, 1000], [96, 962], [130, 940], [172, 900], [214, 870], [240, 850], [250, 842],
  // Terrazza bassa sinistra
  [300, 841], [360, 843], [424, 840],
  // parete con la scala
  [431, 838], [434, 768], [442, 765],
  // Terrazza media sinistra
  [500, 766], [560, 764], [584, 763],
  // rampa verso la Mesa
  [606, 734], [634, 690], [662, 646], [684, 612], [694, 606],
  // Mesa sinistra
  [720, 604], [760, 605], [800, 607],
  // dirupo sulla Valle
  [802, 611], [803, 826], [812, 832],
  // Valle sinistra
  [850, 834], [880, 831],
  // Rocca del Pappagallo: fianco sinistro, cima con il becco che pende a destra, fianco destro
  [896, 782], [910, 682], [926, 582], [948, 452], [972, 352], [992, 294], [1012, 274], [1024, 272],
  [1036, 278], [1052, 300], [1068, 322], [1080, 330],
  [1100, 452], [1122, 582], [1138, 682], [1152, 782],
  // Valle destra
  [1168, 831], [1198, 834], [1236, 832],
  // dirupo e Mesa destra
  [1245, 826], [1246, 611], [1248, 607], [1288, 605], [1328, 604], [1354, 606],
  // rampa verso la Terrazza media destra
  [1364, 612], [1386, 646], [1414, 690], [1442, 734], [1464, 763],
  // Terrazza media destra
  [1488, 764], [1548, 766], [1606, 765],
  // parete con la scala
  [1614, 768], [1617, 838], [1624, 840],
  // Terrazza bassa destra (corta) e Duna della Vedetta: rampa di sabbia e pianoro
  [1660, 842], [1700, 841], [1866, 734], [1874, 730], [1946, 730],
  // scogliera sul mare
  [1952, 742], [1964, 862], [1976, 952], [1984, 1000],
];

export function superficieDisegnata(): Float64Array {
  const s = new Float64Array(W).fill(H);
  for (let i = 0; i < PROFILO.length - 1; i++) {
    const [x0, y0] = PROFILO[i], [x1, y1] = PROFILO[i + 1];
    for (let x = x0; x <= x1; x++) s[x] = y0 + (y1 - y0) * (x1 === x0 ? 0 : (x - x0) / (x1 - x0));
  }
  // ammorbidisce gli spigoli (media su 5 px) senza toccare le pareti ripide
  const a = s.slice();
  for (let x = 3; x < W - 3; x++) {
    let v = 0; for (let k = -2; k <= 2; k++) v += a[x + k];
    if (Math.abs(a[x + 1] - a[x - 1]) < 30) s[x] = v / 5;
  }
  // gobbe piccole sui tratti in piano, denti più marcati sui fianchi della Rocca e sulla scogliera (contorni meno dritti)
  for (let x = 0; x < W; x++) {
    s[x] += Math.sin(x / 19) * 1.0 + Math.sin(x / 53 + 1) * 1.3;
    if (x < 64 || x >= W - 64) s[x] = H;
  }
  return s;
}

// ───────────────────────── pezzi dell'isola ─────────────────────────
/** Arco della Rocca: galleria percorribile dalla Valle sinistra alla destra. */
export const ARCO = { x0: 882, x1: 1166, pavimento: 830, volta: 712 };
/** Occhio della Rocca: foro vicino alla cima (ci passa un tiro, non un pirata). */
export const OCCHIO = { x: 1028, y: 372, rx: 20, ry: 17 };
/**
 * Gallerie basse: dalla Terrazza bassa (imbocco ai piedi della parete) alla Valle. `sala` = tratto dove la volta è
 * più alta (in un punto diverso sui due lati).
 */
export const GALLERIE = [
  { x0: 404, x1: 846, pavimento: 840, alto: 54, scende: 50, sala: { x: 628, rx: 46, piu: 30 } },
  { x0: 1202, x1: 1644, pavimento: 840, alto: 54, scende: 50, sala: { x: 1372, rx: 40, piu: 26 } },
];
/** Grotta della Liana: aperta sulla Valle destra, dentro la Mesa. Il ripiano sporge dal dirupo e porta la liana. */
export const GROTTA = { bocca: 1246, fondo: 1332, pavimento: 716, alto: 48, ripiano: 1224 };
/** Ponti di corda: dalla Mesa al balcone della Rocca, a filo dei due bordi. */
export const PONTI = [
  { x0: 794, x1: 912, y0: 608, y1: 544, spessore: 14 },
  { x0: 1136, x1: 1254, y0: 544, y1: 608, spessore: 14 },
];
export const PONTE_FRECCIA = 10;
export function quotaPonte(p: { x0: number; x1: number; y0: number; y1: number }, x: number, freccia = PONTE_FRECCIA): number {
  const t = (x - p.x0) / (p.x1 - p.x0);
  return Math.round(p.y0 + (p.y1 - p.y0) * t + Math.sin(Math.PI * t) * freccia);
}
/** Balconi di roccia sui fianchi della Rocca, dove arrivano i ponti. */
export const BALCONI = [
  { x0: 912, x1: 962, y: 544, spessore: 26 },
  { x0: 1086, x1: 1136, y: 544, spessore: 26 },
];
/** Nido: cengia scavata nel fianco della Rocca, sopra i balconi (si sale con la liana). */
export const NIDO = { x0: 938, x1: 978, y: 430 };
/** Cengie: piccole mensole di roccia sui fianchi della Rocca e sul dirupo (contorni, riparo dai tiri tesi). [x0, x1, y, spessore] */
export const CENGE: [number, number, number, number][] = [
  [892, 908, 706, 10], [1142, 1160, 664, 10],     // fianchi bassi della Rocca, a quote diverse
  [803, 822, 772, 12],                             // tettoia sopra lo sbocco della galleria sinistra
];
/**
 * Relitto del Pappagallo Verde (solo variante base). La poppa è un blocco di legno alto: è la Torre della Vedetta
 * di sinistra. Il ponte di coperta scende verso la terrazza e ci si cammina.
 */
export const RELITTO = { poppa0: 106, poppa1: 172, cima: 730, coperta0: 866, coperta1: 849, prua: 244 };
/** Molo Storto (solo variante prologo): tavolato sul mare, in fondo la torre di guardia del porto. */
export const MOLO = { x0: 108, x1: 218, piano: 868, spessore: 12, torre0: 72, torre1: 108, cima: 760 };
/** Tettoie di legno in cima alle due torri (riparo dai tiri a parabola): muro verso il mare e tetto a sbalzo. */
const TETTOIA = { muro: 6, alto: 38, tetto: 6, sbalzo: 42 };
/**
 * Sbalzo della tettoia della Vedetta sulla Duna: più corto, perché chi sta sotto il tetto deve poter scavalcare il
 * muretto del pianoro (x 1882-1895). Con 42 px il tetto arrivava a x 1905 e copriva il posto accanto al muretto:
 * niente aria sopra la testa, quindi niente scavalco né Balzo verso sinistra. Con 30 px il tetto parte da x 1917.
 */
export const SBALZO_DUNA = 30;
/** Scoglio del Granchio: il cuore di roccia della Duna della Vedetta. */
export const SCOGLIO = { x: 1908, y: 850, rx: 58, ry: 104 };
export const DUNA = { piede: 1700, pianoro0: 1874, pianoro1: 1946, quota: 730 };

/**
 * Appoggi da pirata: muretti di pietra e casse di legno. Alti 24-30 px: lo scavalco automatico arriva a 28, sopra
 * serve il Balzo (accordo con Fisica, 21/11/2026: larghi almeno 12 px, aria libera sopra, mai oltre 36).
 * x0-x1 compresi; l'altezza si misura dal suolo più alto sotto il pezzo.
 */
export const APPOGGI: { tipo: 'muretto' | 'cassa'; x0: number; x1: number; alto: number; dove: string }[] = [
  { tipo: 'muretto', x0: 329, x1: 342, alto: 26, dove: 'Terrazza bassa sinistra' },
  { tipo: 'cassa', x0: 496, x1: 523, alto: 28, dove: 'Terrazza media sinistra' },
  { tipo: 'muretto', x0: 739, x1: 752, alto: 24, dove: 'Mesa sinistra' },
  { tipo: 'muretto', x0: 1296, x1: 1309, alto: 24, dove: 'Mesa destra' },
  { tipo: 'cassa', x0: 1518, x1: 1547, alto: 30, dove: 'Terrazza media destra' },
  { tipo: 'muretto', x0: 1882, x1: 1895, alto: 24, dove: 'pianoro della Duna' },
];
/** Cespugli fitti (terra dipinta a foglie): riparo basso. */
export const CESPUGLI = [
  { x: 276, y: 836, rx: 12, ry: 12 }, { x: 574, y: 757, rx: 11, ry: 11 },
  { x: 1456, y: 757, rx: 11, ry: 11 },
];
/** Elementi di legno che crolleranno in Fase 3 (torri): [x0, x1]. Nessuna partenza entro DISTANZA_CROLLO px. */
export const TORRI_X: Record<Variante, [number, number][]> = {
  base: [[RELITTO.poppa0, RELITTO.poppa1], [DUNA.pianoro1 - SBALZO_DUNA, DUNA.pianoro1]],
  prologo: [[MOLO.torre0, MOLO.torre1], [DUNA.pianoro1 - SBALZO_DUNA, DUNA.pianoro1]],
};
export const DISTANZA_CROLLO = 120;
/** Anelli di ferro per il rampino (Fase 4): solo posti prenotati, 120-260 px sopra il suolo. Non sono nella maschera. */
export const ANELLI: P2[] = [[470, 640], [860, 660], [1188, 660], [1580, 640]];

/**
 * Appigli (contratto della Fisica: segmento verticale in aria, x = asse, yAlto = suolo in cima). L'asse sta ad
 * almeno 8 px dal muro. yBasso è indicativo: `appigliDi` lo porta sul suolo vero.
 * Tre per lato: la scala della torre, la scala della parete, e una liana (a destra sono due liane e niente scala alla torre:
 * alla Duna si sale a piedi).
 */
const APPIGLI_BASE: { tipo: 'scala' | 'liana'; x: number; yAlto: number; yBasso: number }[] = [
  { tipo: 'scala', x: RELITTO.poppa1 + 10, yAlto: RELITTO.cima, yBasso: 864 },   // Torre della Vedetta (poppa del relitto)
  { tipo: 'scala', x: 424, yAlto: 765, yBasso: 840 },                              // parete sinistra
  { tipo: 'liana', x: 926, yAlto: NIDO.y, yBasso: 544 },                           // Nido sinistro
  { tipo: 'liana', x: 1122, yAlto: NIDO.y, yBasso: 544 },                          // Nido destro
  { tipo: 'liana', x: GROTTA.ripiano - 10, yAlto: GROTTA.pavimento, yBasso: 834 }, // Grotta della Liana
  { tipo: 'scala', x: 1626, yAlto: 765, yBasso: 840 },                             // parete destra
];
export function appigliForma(variante: Variante = 'base'): typeof APPIGLI_BASE {
  if (variante === 'base') return APPIGLI_BASE;
  return [{ tipo: 'scala', x: MOLO.torre1 + 10, yAlto: MOLO.cima, yBasso: MOLO.piano }, ...APPIGLI_BASE.slice(1)];
}
/** Gli appigli con il piede sul suolo vero della maschera (primo pixel pieno sotto l'asse). */
export function appigliDi(m: Uint8Array, variante: Variante = 'base'): typeof APPIGLI_BASE {
  return appigliForma(variante).map((a) => {
    let y = a.yAlto + 1;
    while (y < FONDALE && m[y * W + a.x] === MATERIALE.aria) y++;
    return { ...a, yBasso: y };
  });
}
/**
 * Barili di polvere, messi a mano e pari sui due lati: nei due Nidi in cima alle liane e in cima alla Rocca.
 * (In v2 stavano sui balconi: a meno di 200 px dalle partenze della Mesa, che così restavano una sola per lato.)
 */
export const BARILI_X = [954, 1052, 1094];

export function costruisciMaschera(variante: Variante = 'base'): { m: Uint8Array; sup: Float64Array; tag: Uint8Array } {
  const sup = superficieDisegnata();
  const m = new Uint8Array(W * H);
  const tag = new Uint8Array(W * H);
  const A = MATERIALE.aria;
  const dentro = (x: number, y: number) => x >= 64 && x < W - 64 && y >= 160 && y < FONDALE;
  const metti = (x: number, y: number, v: number, t = 0) => { if (dentro(x, y)) { m[y * W + x] = v; tag[y * W + x] = t; } };
  const seVuoto = (x: number, y: number, v: number, t = 0) => { if (dentro(x, y) && m[y * W + x] === A) { m[y * W + x] = v; tag[y * W + x] = t; } };
  const scava = (x: number, y: number) => { if (dentro(x, y)) { m[y * W + x] = A; tag[y * W + x] = 0; } };
  /** primo pixel pieno della colonna, dall'alto */
  const suolo = (x: number, da = 160) => { let y = da; while (y < FONDALE && m[y * W + x] === A) y++; return y; };

  // ── corpo dell'isola: sabbia in superficie, poi terra, roccia sotto una linea morbida ──
  const liscia = new Float64Array(W);
  for (let x = 0; x < W; x++) { let t = 0, n = 0; for (let k = -110; k <= 110; k += 5) { t += Math.min(sup[Math.max(0, Math.min(W - 1, x + k))], 950); n++; } liscia[x] = t / n; }
  for (let x = 0; x < W; x++) {
    const s = Math.round(sup[x]);
    const linea = Math.max(s + 40, liscia[x] + 150 + Math.sin(x / 57) * 10 + Math.sin(x / 23) * 4);
    // la Duna è sabbia spessa (ci si scivola), il resto ha 24 px di sabbia
    const sabbia = x >= DUNA.piede - 30 ? 24 + Math.min(40, (x - DUNA.piede + 30) / 2) : 24;
    for (let y = Math.max(160, s); y < FONDALE; y++) {
      const prof = y - s;
      m[y * W + x] = prof < sabbia ? MATERIALE.sabbia : y < linea ? MATERIALE.terra : MATERIALE.roccia;
    }
    for (let y = FONDALE; y < H; y++) m[y * W + x] = MATERIALE.ferro;
  }
  const nucleo = (cx: number, cy: number, rx: number, ry: number, x0: number, x1: number, fino: number, pelle = 26) => {
    for (let x = x0; x < x1; x++) {
      const s = Math.round(sup[x]);
      for (let y = s + pelle; y < fino; y++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && m[y * W + x]) m[y * W + x] = MATERIALE.roccia;
    }
  };
  nucleo(1024, 590, 200, 360, 840, 1210, 960);          // Rocca: roccia viva sotto la pelle di sabbia
  nucleo(740, 682, 90, 110, 650, 830, 802);              // Mese: roccia sotto la cima (si scavano piano)
  nucleo(1308, 682, 90, 110, 1218, 1398, 802);
  nucleo(SCOGLIO.x, SCOGLIO.y, SCOGLIO.rx, SCOGLIO.ry, 1840, 1984, 980, 34);   // Scoglio del Granchio dentro la Duna

  // ── balconi (roccia, pancia arrotondata) ──
  for (const b of BALCONI) for (let x = b.x0; x <= b.x1; x++) {
    const t = (x - b.x0) / (b.x1 - b.x0), sotto = b.spessore * (0.55 + 0.45 * Math.sin(Math.PI * t));
    for (let y = b.y; y < b.y + sotto; y++) metti(x, y, MATERIALE.roccia);
  }
  // ── ponti di corda ──
  for (const p of PONTI) for (let x = p.x0; x <= p.x1; x++) {
    const y = quotaPonte(p, x);
    for (let k = 0; k < p.spessore; k++) seVuoto(x, y + k, MATERIALE.legno, TAG.ponte);
  }
  // ── arco della Rocca ──
  {
    const cx = (ARCO.x0 + ARCO.x1) / 2, rx = (ARCO.x1 - ARCO.x0) / 2, ry = ARCO.pavimento - ARCO.volta;
    for (let x = ARCO.x0; x < ARCO.x1; x++) {
      const t = (x - cx) / rx;
      const alto = ARCO.pavimento - ry * Math.pow(Math.max(0, 1 - t * t), 0.35);
      for (let y = Math.floor(alto); y < ARCO.pavimento; y++) scava(x, y);
    }
  }
  // ── Occhio della Rocca ──
  for (let y = OCCHIO.y - OCCHIO.ry; y <= OCCHIO.y + OCCHIO.ry; y++) for (let x = OCCHIO.x - OCCHIO.rx; x <= OCCHIO.x + OCCHIO.rx; x++) {
    if (((x - OCCHIO.x) / OCCHIO.rx) ** 2 + ((y - OCCHIO.y) / OCCHIO.ry) ** 2 <= 1) scava(x, y);
  }
  // ── gallerie basse (volta arrotondata alle bocche, pavimento che scende nel mezzo, una sala più alta) ──
  for (const g of GALLERIE) for (let x = g.x0; x < g.x1; x++) {
    const t = (x - g.x0) / (g.x1 - g.x0), bordo = Math.min(x - g.x0, g.x1 - x);
    const pav = g.pavimento + g.scende * Math.sin(Math.PI * t) ** 0.6 * Math.min(1, bordo / 40);
    const ds = (x - g.sala.x) / g.sala.rx;
    const sala = Math.abs(ds) < 1 ? g.sala.piu * Math.sqrt(1 - ds * ds) : 0;
    const alto = g.alto * Math.min(1, 0.6 + bordo / 50) + Math.sin(x / 27) * 3 + sala;
    for (let y = Math.floor(pav - alto); y < pav; y++) scava(x, y);
  }
  // ── Grotta della Liana: sala nella Mesa destra, ripiano che sporge sulla Valle ──
  {
    const G = GROTTA;
    for (let x = G.bocca; x <= G.fondo; x++) {
      const t = (x - G.bocca) / (G.fondo - G.bocca);
      const alto = G.alto * Math.sqrt(Math.max(0, 1 - t ** 3)) + Math.sin(x / 9) * 2;
      for (let y = Math.round(G.pavimento - alto); y < G.pavimento; y++) scava(x, y);
    }
    for (let x = G.ripiano; x < G.bocca; x++) {
      const spesso = 6 + Math.round((x - G.ripiano) * 0.45);
      for (let y = G.pavimento; y < G.pavimento + spesso; y++) seVuoto(x, y, MATERIALE.roccia);
    }
  }
  // ── Nido: cengia piana nella Rocca, con la parete dietro (i due lati) ──
  for (const [a0, a1] of [[NIDO.x0, NIDO.x1], [W - NIDO.x1, W - NIDO.x0]]) for (let x = a0; x <= a1; x++) {
    for (let y = NIDO.y - 52 + Math.round(((x - a0) / (a1 - a0) - 0.5) ** 2 * 40); y < NIDO.y; y++) scava(x, y);
    for (let y = NIDO.y; y < NIDO.y + 24; y++) seVuoto(x, y, MATERIALE.roccia);
  }
  // ── cengie ──
  for (const [x0, x1, y, sp] of CENGE) for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / (x1 - x0), sotto = Math.max(4, Math.round(sp * (0.5 + 0.5 * Math.sin(Math.PI * t))));
    for (let k = 0; k < sotto; k++) seVuoto(x, y + k, MATERIALE.roccia);
  }

  // ── tettoia di una torre: muro dal lato del mare e tetto a sbalzo verso terra ──
  const tettoia = (xMare: number, verso: 1 | -1, cima: number, sbalzo = TETTOIA.sbalzo) => {
    for (let k = 0; k < TETTOIA.muro; k++) for (let y = cima - TETTOIA.alto; y < cima; y++) metti(xMare + verso * k, y, MATERIALE.legno, TAG.edificio);
    for (let k = 0; k < sbalzo; k++) for (let y = cima - TETTOIA.alto - TETTOIA.tetto; y < cima - TETTOIA.alto; y++) metti(xMare + verso * k, y, MATERIALE.legno, TAG.edificio);
  };

  if (variante === 'base') {
    // ── Relitto: poppa alta (Torre della Vedetta) e ponte di coperta fino alla terrazza ──
    const R = RELITTO;
    for (let x = R.poppa0; x <= R.poppa1; x++) for (let y = R.cima; y < FONDALE; y++) {
      const i = y * W + x;
      if (m[i] === A || (m[i] === MATERIALE.sabbia && y < Math.round(sup[x]) + 14)) { m[i] = MATERIALE.legno; tag[i] = 0; }
    }
    for (let x = R.poppa1 + 1; x <= R.prua; x++) {
      const coperta = Math.round(R.coperta0 + (R.coperta1 - R.coperta0) * ((x - R.poppa1) / (R.prua - R.poppa1)));
      for (let y = coperta; y < Math.round(sup[x]) + 14 && y < FONDALE; y++) {
        const i = y * W + x;
        if (m[i] === A || m[i] === MATERIALE.sabbia) { m[i] = MATERIALE.legno; tag[i] = 0; }
      }
    }
    tettoia(R.poppa0, 1, R.cima);
  } else {
    // ── Prologo: Molo Storto. Sotto il molo la spiaggia scende sott'acqua; in fondo la torre di guardia ──
    const M = MOLO;
    const sx = M.x1 - 6, sy = Math.round(sup[sx]);
    for (let x = 64; x < sx; x++) {
      const linea = Math.round(FONDALE - 6 - (FONDALE - 6 - sy) * ((x - 64) / (sx - 64)) ** 0.7);
      for (let y = 160; y < linea; y++) if (m[y * W + x] === MATERIALE.sabbia || m[y * W + x] === MATERIALE.terra) scava(x, y);
    }
    for (let x = M.x0; x <= M.x1; x++) {
      for (let y = M.piano; y < M.piano + M.spessore; y++) seVuoto(x, y, MATERIALE.legno, TAG.molo);
      if ((x - M.x0) % 32 < 8) for (let y = M.piano + M.spessore; y < FONDALE; y++) seVuoto(x, y, MATERIALE.legno, TAG.molo);
    }
    // torre di guardia: blocco di legno sul mare (chiude il molo: da lì non si cade in acqua)
    for (let x = M.torre0; x < M.torre1; x++) for (let y = M.cima; y < FONDALE; y++) seVuoto(x, y, MATERIALE.legno, TAG.molo);
    tettoia(M.torre0, 1, M.cima);
  }
  // ── tettoia della Vedetta sulla Duna (muro verso il mare, a destra) ──
  tettoia(DUNA.pianoro1, -1, suolo(DUNA.pianoro1 - 3), SBALZO_DUNA);

  // ── muretti e casse ──
  for (const a of APPOGGI) {
    let base = FONDALE;
    for (let x = a.x0; x <= a.x1; x++) base = Math.min(base, suolo(x));
    for (let x = a.x0; x <= a.x1; x++) {
      // il muretto ha la cima un po' rotta (2 px), la cassa è dritta
      const rotto = a.tipo === 'muretto' ? Math.round(Math.abs(Math.sin(x * 1.7)) * 2) : 0;
      const fino = suolo(x, base - a.alto + rotto);
      for (let y = base - a.alto + rotto; y < fino; y++) {
        metti(x, y, a.tipo === 'muretto' ? MATERIALE.roccia : MATERIALE.legno, a.tipo === 'muretto' ? TAG.pietra : TAG.cassa);
      }
    }
  }
  // ── cespugli fitti ──
  for (const b of CESPUGLI) for (let y = b.y - b.ry; y <= b.y + b.ry; y++) for (let x = b.x - b.rx; x <= b.x + b.rx; x++) {
    const n = Math.sin(x * 0.7) * 0.08 + Math.cos(y * 0.9) * 0.08;
    if (((x - b.x) / b.rx) ** 2 + ((y - b.y) / b.ry) ** 2 <= 1 + n) metti(x, y, MATERIALE.terra, TAG.foglie);
  }
  return { m, sup, tag };
}
