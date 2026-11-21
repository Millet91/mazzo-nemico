// Pittore della mappa del mondo (P2 Fase A, agente Mondo e mappa): dipinge in casa, con il canvas 2D di Chromium,
// tutti i pezzi del Tavolo del Timone. Gira DENTRO il browser: lo lancia scripts/mondo/dipingi.ts, che salva i
// risultati in public/assets/mondo/. Sono segnaposto dipinti: le isole definitive (Fase B) nascono dalle maschere
// di battaglia, e la carta potrà essere sostituita da arte Magnific con gli stessi nomi di file.
//
// Coordinate: mappa logica 3072×1728 (contenuti/capitolo-1.ts). Carta a 1 px per unità logica, isole e
// segnaposti a 2 px per unità (si disegnano in gioco a scala 0,5: restano nitidi quando si ingrandisce).
import { CAPITOLO_1, CALA_PAPPAGALLO, MONDO_W, MONDO_H } from '../../src/contenuti/capitolo-1';
import { PALETTE } from '../../src/core/palette';
import { dentro, fbm, mix, rng, rumore, sagoma, semeDa, smooth, type Sagoma } from './forme';

type RGB = [number, number, number];
const rgb = (c: string): RGB => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const lerp3 = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

/** risoluzione degli sprite (isole, pedine, cartelli…) rispetto alle unità logiche */
export const RISOLUZIONE = 2;
/** lato delle tessere della carta */
export const TESSERA = 512;
/** l'immagine a indici è a 1/4 della mappa logica */
export const SCALA_INDICI = 4;
/** passo del rosso nell'immagine a indici: isola n (da 1) = rosso n×PASSO (si legge arrotondando) */
export const PASSO_INDICI = 20;
/** bordo della carta: oltre si vede il tavolo */
const MARGINE_CARTA = 34;

function tela(w: number, h: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  return { c, g };
}

// ─── Isole del capitolo e Cala Pappagallo ────────────────────────────────────────────────────────────

interface IsolaDaDipingere { id: string; x: number; y: number; raggio: number; bioma: string; trucco: string; s: Sagoma }

export function isoleDaDipingere(): IsolaDaDipingere[] {
  const lista = CAPITOLO_1.isole.map((i) => ({
    id: i.id, x: i.pos.x, y: i.pos.y, raggio: i.raggio, bioma: i.bioma, trucco: i.trucco, s: sagoma(i.id, i.raggio),
  }));
  const c = CALA_PAPPAGALLO;
  lista.push({ id: c.id, x: c.pos.x, y: c.pos.y, raggio: c.raggio, bioma: 'isola', trucco: 'cala', s: sagoma('cala-pappagallo', c.raggio, 1.45) });
  return lista;
}

/** Sagome lontane dipinte nella carta (isole dei capitoli futuri: si intravedono sotto la nebbia). */
function sagomeLontane(): { x: number; y: number; r: number; s: Sagoma }[] {
  const pos = [
    [2550, 330, 80], [2820, 620, 95], [2420, 820, 70], [2700, 1050, 85], [2900, 1380, 75], [2420, 1500, 90],
    [420, 300, 75], [260, 760, 85], [470, 1130, 70], [150, 1450, 60], [1650, 230, 65], [2150, 380, 80],
  ];
  return pos.map(([x, y, r], i) => ({ x, y, r, s: sagoma(`lontana-${i}`, r) }));
}

/** Colori del terreno per bioma: [sabbia, prato, prato scuro, roccia, cima] */
function coloriBioma(bioma: string): RGB[] {
  const sab = rgb(PALETTE.sabbia), erba = rgb(PALETTE.erba), luce = rgb(PALETTE.erbaLuce), roccia = rgb(PALETTE.roccia);
  switch (bioma) {
    case 'porto': return [sab, [176, 160, 92], [132, 120, 70], [150, 112, 82], [190, 170, 140]];
    case 'scogliera': return [[226, 204, 150], [120, 168, 80], [88, 128, 62], [128, 120, 116], [196, 190, 184]];
    case 'grotta': return [[200, 180, 140], [86, 120, 78], [58, 84, 60], [92, 84, 96], [130, 122, 140]];
    default: return [sab, luce, erba, roccia, [176, 168, 150]];
  }
}

/** Dipinge un'isola vista dall'alto con rilievo (ombre da sinistra in alto), costa, schiuma e acque basse. */
export function dipingiIsola(isola: IsolaDaDipingere): HTMLCanvasElement {
  const R = RISOLUZIONE;
  const lato = Math.ceil((isola.s.max * 1.55) * 2);
  const W = lato * R, H = lato * R;
  const { c, g } = tela(W, H);
  const img = g.createImageData(W, H);
  const d = img.data;
  const n = fbm(semeDa(isola.id) + 7, 4);
  const nFine = rumore(semeDa(isola.id) + 99);
  const [sab, prato, pratoScuro, roccia, cima] = coloriBioma(isola.bioma);
  const basso = rgb(PALETTE.mareBasso), schiuma = rgb(PALETTE.schiuma);
  const contorno: RGB = [74, 44, 26];
  const quota = (dx: number, dy: number) => {
    const { t } = dentro(isola.s, dx, dy);
    if (t <= 0) return 0;
    const colline = n(dx / 38 + 50, dy / 38 + 50);
    let e = smooth(0, 0.6, t) * 0.28 + Math.max(0, colline - 0.36) * 1.5 * smooth(0.05, 0.5, t);
    if (isola.trucco === 'cala') e += smooth(0.6, 0.95, t) * 0.4; // la Rocca al centro
    if (isola.bioma === 'scogliera') e += smooth(0.0, 0.12, t) * 0.25;
    return e;
  };
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const dx = (px - W / 2) / R, dy = (py - H / 2) / R;
      const { t, rc } = dentro(isola.s, dx, dy);
      const i = (py * W + px) * 4;
      const fuori = -t * rc; // px logici di mare dalla costa
      if (t <= 0) {
        // acque basse (turchese che sfuma) e schiuma a ridosso della costa
        const onda = 0.5 + 0.5 * Math.sin(fuori * 0.9 - nFine(dx / 6, dy / 6) * 4);
        const basse = 1 - smooth(0, rc * 0.42, fuori);
        let col = basso, a = basse * 0.85;
        if (fuori < 4.5) { col = lerp3(basso, schiuma, 1 - smooth(1.5, 4.5, fuori)); a = Math.max(a, 0.95); }
        else if (fuori < 11 && onda > 0.75) { col = lerp3(basso, schiuma, 0.55); a = Math.max(a, 0.6 * basse + 0.2); }
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = Math.round(a * 255);
        continue;
      }
      const dentroPx = t * rc;
      const e = quota(dx, dy);
      // luce: pendenza verso sinistra-alto illuminata
      const ex = quota(dx + 1.5, dy) - quota(dx - 1.5, dy);
      const ey = quota(dx, dy + 1.5) - quota(dx, dy - 1.5);
      const luce = Math.max(-0.5, Math.min(0.5, (-ex - ey) * 9));
      const grana = nFine(dx / 2.5, dy / 2.5) - 0.5;
      let col: RGB;
      const spiaggia = 5 + 4 * n(dx / 12, dy / 12) + (isola.bioma === 'scogliera' ? -3 : 3);
      if (dentroPx < spiaggia) col = sab;
      else if (e < 0.58) col = lerp3(prato, pratoScuro, smooth(0.2, 0.58, e));
      else if (e < 0.8) col = lerp3(pratoScuro, roccia, smooth(0.58, 0.8, e));
      else col = lerp3(roccia, cima, smooth(0.8, 1.1, e));
      const k = 1 + luce * 0.9 + grana * 0.12;
      col = [col[0] * k, col[1] * k, col[2] * k];
      if (dentroPx < 2.2) col = contorno;
      d[i] = Math.min(255, col[0]); d[i + 1] = Math.min(255, col[1]); d[i + 2] = Math.min(255, col[2]); d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  g.save();
  g.translate(W / 2, H / 2);
  g.scale(R, R);
  decora(g, isola);
  g.restore();
  return c;
}

// tratti a mano per i dettagli (contorno marrone scuro come in battaglia)
const INCHIOSTRO = '#3B2416';
function tratto(g: CanvasRenderingContext2D, w = 1.4) { g.strokeStyle = INCHIOSTRO; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }

function palma(g: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  g.beginPath(); g.moveTo(x, y + 9 * s); g.quadraticCurveTo(x + 3 * s, y + 4 * s, x, y); tratto(g, 2 * s);
  g.fillStyle = '#3E8E3A';
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 - 0.4;
    g.beginPath();
    g.ellipse(x + Math.cos(a) * 5 * s, y + Math.sin(a) * 3.5 * s, 6 * s, 2.2 * s, a, 0, Math.PI * 2);
    g.fill(); tratto(g, 0.8 * s);
  }
}

function casetta(g: CanvasRenderingContext2D, x: number, y: number, w: number, tetto = '#C2513A') {
  g.fillStyle = '#E9D9B4'; g.beginPath(); g.rect(x - w / 2, y - w * 0.3, w, w * 0.6); g.fill(); tratto(g, 1);
  g.fillStyle = tetto; g.beginPath(); g.moveTo(x - w * 0.6, y - w * 0.25); g.lineTo(x, y - w * 0.75); g.lineTo(x + w * 0.6, y - w * 0.25); g.closePath(); g.fill(); tratto(g, 1);
}

function decora(g: CanvasRenderingContext2D, isola: IsolaDaDipingere) {
  const r = rng(semeDa(isola.id) + 3);
  const R = isola.raggio;
  const puntoDentro = (tMin: number) => {
    for (let k = 0; k < 50; k++) {
      const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R * 0.8;
      if (dentro(isola.s, x, y).t > tMin) return { x, y };
    }
    return { x: 0, y: 0 };
  };
  const costaA = (a: number, f = 1) => ({ x: Math.cos(a) * isola.s.costa(a) * f, y: Math.sin(a) * isola.s.costa(a) * f });
  switch (isola.trucco) {
    case 'palafitte': { // Porto Teschio: case sulle palafitte e il molo
      const m = costaA(Math.PI * 0.5, 0.96);
      g.fillStyle = '#8A5A3A'; g.beginPath(); g.rect(m.x - 5, m.y - 4, 10, 34); g.fill(); tratto(g);
      for (let k = 0; k < 6; k++) { const p = puntoDentro(0.25); casetta(g, p.x, p.y, 14 + r() * 6, k % 2 ? '#C2513A' : '#8E4A2E'); }
      break;
    }
    case 'gru': { // Baia dei Corvi: gru del porto e casse
      const p = costaA(-0.3, 0.8);
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x, p.y - 34); g.lineTo(p.x + 28, p.y - 30); tratto(g, 3);
      g.beginPath(); g.moveTo(p.x + 26, p.y - 30); g.lineTo(p.x + 26, p.y - 12); tratto(g, 1);
      g.fillStyle = '#B07A3E'; g.fillRect(p.x + 21, p.y - 12, 10, 8); g.strokeRect(p.x + 21, p.y - 12, 10, 8);
      for (let k = 0; k < 3; k++) { const q = puntoDentro(0.3); casetta(g, q.x, q.y, 14, '#5B6E8C'); }
      break;
    }
    case 'bastione': { // Forte Rampino: mura a stella grigie
      g.fillStyle = '#9C9C9C';
      g.beginPath();
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; const rr = k % 2 ? 26 : 38; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.75 - 6); }
      g.closePath(); g.fill(); tratto(g, 1.8);
      g.fillStyle = '#7A7A7A'; g.beginPath(); g.rect(-11, -18, 22, 16); g.fill(); tratto(g);
      break;
    }
    case 'torre': { // Scoglio della Vedetta: torre alta con scala
      g.fillStyle = '#9A7650'; g.beginPath(); g.rect(-7, -38, 14, 40); g.fill(); tratto(g);
      g.fillStyle = '#C2513A'; g.beginPath(); g.moveTo(-11, -36); g.lineTo(0, -50); g.lineTo(11, -36); g.closePath(); g.fill(); tratto(g);
      for (let y = -30; y < 0; y += 6) { g.beginPath(); g.moveTo(-7, y); g.lineTo(7, y); tratto(g, 0.6); }
      break;
    }
    case 'archi': { // Scogli del Rum: archi di roccia
      for (const [x, y, s] of [[-30, -6, 1], [18, 10, 0.8], [30, -24, 0.6]]) {
        g.beginPath(); g.arc(x, y, 14 * s, Math.PI, 0); g.lineWidth = 7 * s; g.strokeStyle = '#8A7A6A'; g.stroke();
        g.beginPath(); g.arc(x, y, 17.5 * s, Math.PI, 0); tratto(g, 1); g.beginPath(); g.arc(x, y, 10.5 * s, Math.PI, 0); tratto(g, 1);
      }
      g.fillStyle = '#7B4A26'; g.beginPath(); g.ellipse(-4, 20, 6, 4.5, 0, 0, Math.PI * 2); g.fill(); tratto(g, 1);
      break;
    }
    case 'stalattiti': { // Laguna Nera: bocca della grotta e laghetto scuro
      g.fillStyle = '#1F2A33'; g.beginPath(); g.ellipse(0, 4, 22, 13, 0, Math.PI, 0); g.closePath(); g.fill(); tratto(g, 1.6);
      g.fillStyle = '#CFC6D8';
      for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * 7 - 3, -6 + Math.abs(k) * 2); g.lineTo(k * 7, 3); g.lineTo(k * 7 + 3, -6 + Math.abs(k) * 2); g.fill(); }
      g.fillStyle = '#123A4A'; g.beginPath(); g.ellipse(-24, -22, 14, 8, 0.3, 0, Math.PI * 2); g.fill(); tratto(g, 1);
      break;
    }
    case 'dune': { // Secca del Barile: dune e barili
      g.strokeStyle = 'rgba(160,120,60,0.6)'; g.lineWidth = 1.4;
      for (let k = 0; k < 5; k++) { const p = puntoDentro(0.2); g.beginPath(); g.arc(p.x, p.y + 8, 10, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
      for (let k = 0; k < 5; k++) {
        const p = puntoDentro(0.3);
        g.fillStyle = '#9B5E2E'; g.beginPath(); g.ellipse(p.x, p.y, 4.5, 5.5, 0, 0, Math.PI * 2); g.fill(); tratto(g, 1);
        g.beginPath(); g.moveTo(p.x - 4.5, p.y - 1.5); g.lineTo(p.x + 4.5, p.y - 1.5); tratto(g, 0.6);
      }
      break;
    }
    case 'palmaPonte': { // Isolotto delle Cozze: la palma caduta che fa da ponte
      g.beginPath(); g.moveTo(-34, 6); g.quadraticCurveTo(0, -10, 32, 2); g.lineWidth = 5; g.strokeStyle = '#8A5A3A'; g.stroke();
      g.beginPath(); g.moveTo(-34, 6); g.quadraticCurveTo(0, -10, 32, 2); tratto(g, 1);
      palma(g, 34, 0, 1.1);
      break;
    }
    case 'cala': { // Cala Pappagallo: relitto a sinistra, Rocca al centro, torretta a destra
      const s = costaA(Math.PI * 0.95, 0.85);
      g.fillStyle = '#6B4226'; g.beginPath(); g.ellipse(s.x + 4, s.y, 16, 6, -0.3, 0, Math.PI * 2); g.fill(); tratto(g);
      g.beginPath(); g.moveTo(s.x + 4, s.y); g.lineTo(s.x + 12, s.y - 20); tratto(g, 2);
      const t = costaA(-0.15, 0.72);
      g.fillStyle = '#A0825C'; g.beginPath(); g.rect(t.x - 5, t.y - 22, 10, 22); g.fill(); tratto(g);
      g.fillStyle = '#C2513A'; g.beginPath(); g.moveTo(t.x - 8, t.y - 21); g.lineTo(t.x, t.y - 31); g.lineTo(t.x + 8, t.y - 21); g.closePath(); g.fill(); tratto(g);
      const m = costaA(Math.PI * 0.55, 0.95);
      g.fillStyle = '#8A5A3A'; g.beginPath(); g.rect(m.x - 4, m.y - 2, 8, 26); g.fill(); tratto(g);
      break;
    }
  }
  if (isola.bioma === 'isola' || isola.trucco === 'cala' || isola.bioma === 'scogliera') {
    const quante = Math.round(R / 18);
    for (let k = 0; k < quante; k++) { const p = puntoDentro(0.12); palma(g, p.x, p.y, 0.8 + r() * 0.4); }
  }
}

/** Fascia d'onda bianca attorno alla costa: in gioco si tinge col colore di chi tiene l'isola. */
export function dipingiOnda(isola: IsolaDaDipingere): HTMLCanvasElement {
  const R = RISOLUZIONE;
  const lato = Math.ceil((isola.s.max * 1.55) * 2);
  const W = lato * R, H = lato * R;
  const { c, g } = tela(W, H);
  const img = g.createImageData(W, H);
  const d = img.data;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const dx = (px - W / 2) / R, dy = (py - H / 2) / R;
      const { t, rc } = dentro(isola.s, dx, dy);
      const fuori = -t * rc;
      if (fuori < 5 || fuori > 34) continue;
      const a = Math.atan2(dy, dx);
      // fascia piena vicino alla costa, poi un'onda a creste (larga: si deve leggere anche a vista intera)
      const pieno = 1 - smooth(15, 20, fuori);
      const cresta = Math.max(0, Math.sin(a * Math.round(rc / 7) + fuori * 0.35)) ** 3 * (1 - smooth(22, 34, fuori));
      const al = Math.max(pieno, cresta) * smooth(5, 7, fuori);
      if (al <= 0) continue;
      const i = (py * W + px) * 4;
      d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = Math.round(al * 235);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// ─── Carta e tavolo ──────────────────────────────────────────────────────────────────────────────────

/** Bordo della carta un po' irregolare: px logici dal bordo dell'immagine. */
function bordoCarta(x: number, y: number, n: (x: number, y: number) => number): number {
  const m = MARGINE_CARTA + (n(x / 90, y / 90) - 0.5) * 30;
  // angoli arrotondati
  const cx = Math.max(0, Math.max(m + 60 - x, x - (MONDO_W - m - 60)));
  const cy = Math.max(0, Math.max(m + 60 - y, y - (MONDO_H - m - 60)));
  const angolo = Math.hypot(cx, cy) - 60;
  const lati = Math.min(x - m, y - m, MONDO_W - m - x, MONDO_H - m - y);
  return cx > 0 && cy > 0 ? -angolo : lati;
}

/** La carta intera (mare dipinto su pergamena, rosa dei venti, sagome lontane). 1 px per unità logica. */
export function dipingiCarta(): HTMLCanvasElement {
  const W = MONDO_W, H = MONDO_H;
  const { c, g } = tela(W, H);
  const img = g.createImageData(W, H);
  const d = img.data;
  const nMare = fbm(11, 5);
  const nGrana = rumore(12);
  const nBordo = fbm(13, 3);
  const fondo = rgb(PALETTE.mareFondo), medio = rgb(PALETTE.mareMedio);
  const perg = rgb(PALETTE.pergamena), pergOmbra = rgb(PALETTE.pergamenaOmbra), bruciato: RGB = [110, 70, 40];
  const lontane = sagomeLontane();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const b = bordoCarta(x, y, nBordo);
      if (b < 0) { d[i + 3] = 0; continue; }
      const grana = (nGrana(x / 1.7, y / 1.7) - 0.5) * 0.08 + (nGrana(x / 9 + 300, y / 9) - 0.5) * 0.06;
      // mare: blu profondo e medio a chiazze, più chiaro verso il centro del capitolo
      const centro = 1 - smooth(300, 1500, Math.hypot(x - 1350, y - 950));
      const m = nMare(x / 260, y / 260);
      let col = lerp3(fondo, medio, smooth(0.3, 0.75, m) * 0.75 + centro * 0.35);
      // bordo di pergamena (cornice larga 70 px) e bruciatura sul filo
      const cornice = 1 - smooth(52, 74, b);
      col = lerp3(col, lerp3(perg, pergOmbra, nMare(x / 40, y / 40)), cornice);
      col = lerp3(col, bruciato, (1 - smooth(0, 16, b)) * 0.75);
      // filetto scuro tra cornice e mare
      if (b > 66 && b < 69) col = lerp3(col, [59, 36, 22], 0.85);
      const k = 1 + grana;
      d[i] = Math.min(255, col[0] * k); d[i + 1] = Math.min(255, col[1] * k); d[i + 2] = Math.min(255, col[2] * k);
      d[i + 3] = Math.round(255 * smooth(0, 2, b));
    }
  }
  g.putImageData(img, 0, 0);

  // reticolo e linee dei venti (rotte dei portolani)
  g.save();
  const mareClip = () => { g.beginPath(); g.rect(MARGINE_CARTA + 72, MARGINE_CARTA + 72, W - 2 * (MARGINE_CARTA + 72), H - 2 * (MARGINE_CARTA + 72)); g.clip(); };
  mareClip();
  g.strokeStyle = 'rgba(230,251,255,0.10)'; g.lineWidth = 1.5;
  for (let x = 256; x < W; x += 256) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 256; y < H; y += 256) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const rosa = { x: 330, y: 1330 };
  g.strokeStyle = 'rgba(245,230,196,0.16)'; g.lineWidth = 2;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    g.beginPath(); g.moveTo(rosa.x, rosa.y); g.lineTo(rosa.x + Math.cos(a) * 4000, rosa.y + Math.sin(a) * 4000); g.stroke();
  }
  // sagome dei mari lontani (si vedranno sotto la nebbia)
  for (const l of lontane) {
    g.beginPath();
    for (let k = 0; k <= 72; k++) { const a = (k / 72) * Math.PI * 2; const r = l.s.costa(a); g.lineTo(l.x + Math.cos(a) * r, l.y + Math.sin(a) * r); }
    g.closePath();
    g.fillStyle = 'rgba(47,179,196,0.35)'; g.save(); g.scale(1, 1); g.lineWidth = 26; g.strokeStyle = 'rgba(47,179,196,0.25)'; g.stroke(); g.restore();
    g.fillStyle = '#5E7F5A'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = 'rgba(59,36,22,0.8)'; g.stroke();
  }
  // onde dipinte sparse
  const r = rng(21);
  g.strokeStyle = 'rgba(230,251,255,0.28)'; g.lineWidth = 2.2; g.lineCap = 'round';
  for (let k = 0; k < 160; k++) {
    const x = r() * W, y = r() * H, s = 8 + r() * 10;
    g.beginPath(); g.moveTo(x - s, y); g.quadraticCurveTo(x - s / 2, y - s * 0.6, x, y); g.quadraticCurveTo(x + s / 2, y - s * 0.6, x + s, y); g.stroke();
  }
  g.restore();
  rosaDeiVenti(g, rosa.x, rosa.y, 120);
  return c;
}

function rosaDeiVenti(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(245,230,196,0.9)'; g.beginPath(); g.arc(0, 0, r * 0.32, 0, Math.PI * 2); g.fill();
  g.lineWidth = 3; g.strokeStyle = INCHIOSTRO; g.stroke();
  g.beginPath(); g.arc(0, 0, r * 0.9, 0, Math.PI * 2); g.lineWidth = 2; g.strokeStyle = 'rgba(245,230,196,0.7)'; g.stroke();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
    const lungo = k % 2 ? r * 0.6 : r;
    const lato = r * 0.13;
    for (const meta of [0, 1]) {
      g.beginPath(); g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * lungo, Math.sin(a) * lungo);
      const b = a + (meta ? 1 : -1) * Math.PI / 2;
      g.lineTo(Math.cos(b) * lato, Math.sin(b) * lato);
      g.closePath();
      g.fillStyle = meta ? (k === 0 ? '#E5484D' : '#F5E6C4') : (k === 0 ? '#8E1F23' : '#D9C39A');
      g.fill(); g.lineWidth = 1.5; g.strokeStyle = INCHIOSTRO; g.stroke();
    }
  }
  g.restore();
}

/** Tessera del tavolo di legno (si ripete): assi orizzontali con venature. */
export function dipingiTavolo(): HTMLCanvasElement {
  const L = TESSERA;
  const { c, g } = tela(L, L);
  const img = g.createImageData(L, L);
  const d = img.data;
  const n = rumore(31, 64);
  const v = rumore(32, 128);
  const chiaro: RGB = [140, 92, 56], scuro: RGB = [92, 56, 32];
  const assi = 4, h = L / assi;
  for (let y = 0; y < L; y++) {
    const asse = Math.floor(y / h);
    const yy = y - asse * h;
    for (let x = 0; x < L; x++) {
      const i = (y * L + x) * 4;
      // venature: rumore stirato in orizzontale (periodo 64 celle su 512 px → x/8)
      const ven = v((x / 8 + asse * 31) % 128, (y / 2.5) % 128);
      const anelli = 0.5 + 0.5 * Math.sin(ven * 18 + yy * 0.08);
      let col = lerp3(scuro, chiaro, 0.35 + anelli * 0.45 + (n(x / 8, y / 8) - 0.5) * 0.3);
      // tono diverso per asse
      const tono = [1, 0.9, 1.06, 0.95][asse];
      col = [col[0] * tono, col[1] * tono, col[2] * tono];
      // fessura tra le assi
      if (yy < 3) col = lerp3(col, [40, 22, 12], yy < 1.5 ? 0.9 : 0.5);
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // chiodi
  g.fillStyle = '#2A1A12';
  for (let k = 0; k < assi; k++) for (const x of [40, 296]) { g.beginPath(); g.arc(x + (k % 2) * 128, k * h + h / 2, 3, 0, Math.PI * 2); g.fill(); }
  return c;
}

/** Tessera delle onde che scorrono sopra il mare (bianche, trasparenti, si ripete). */
export function dipingiOnde(seme: number): HTMLCanvasElement {
  const L = 256;
  const { c, g } = tela(L, L);
  const r = rng(seme);
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2; g.lineCap = 'round';
  for (let k = 0; k < 14; k++) {
    const x = r() * L, y = r() * L, s = 6 + r() * 9;
    for (const ox of [-L, 0, L]) for (const oy of [-L, 0, L]) {
      g.beginPath(); g.moveTo(x + ox - s, y + oy); g.quadraticCurveTo(x + ox, y + oy - s * 0.7, x + ox + s, y + oy); g.stroke();
    }
  }
  return c;
}

// ─── Immagine a indici ───────────────────────────────────────────────────────────────────────────────

/** Ordine delle isole nell'immagine a indici: rosso = (posizione + 1) × PASSO_INDICI. Lo legge la scena. */
export function ordineIndici(): string[] { return isoleDaDipingere().map((i) => i.id); }

export function dipingiIndici(): HTMLCanvasElement {
  const S = SCALA_INDICI;
  const W = MONDO_W / S, H = MONDO_H / S;
  const { c, g } = tela(W, H);
  const img = g.createImageData(W, H);
  const d = img.data;
  const isole = isoleDaDipingere();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      d[i + 3] = 255;
      for (let k = 0; k < isole.length; k++) {
        const is = isole[k];
        const { t, rc } = dentro(is.s, x * S + S / 2 - is.x, y * S + S / 2 - is.y);
        // la zona toccabile sborda di 18 px logici oltre la costa (schiuma e fascia d'onda)
        if (-t * rc < 18) { d[i] = (k + 1) * PASSO_INDICI; break; }
      }
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// ─── Segnaposti (a 2× ) ──────────────────────────────────────────────────────────────────────────────

/** Pedina di legno vista di 3/4: disco con il bordo. Il numero lo scrive la scena. */
export function dipingiPedina(colore: string, scuro: string): HTMLCanvasElement {
  const R = RISOLUZIONE, w = 46, h = 44;
  const { c, g } = tela(w * R, h * R);
  g.scale(R, R);
  const cx = w / 2;
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(cx + 2, 33, 21, 9, 0, 0, Math.PI * 2); g.fill();
  // fianco
  g.fillStyle = scuro; g.beginPath(); g.ellipse(cx, 28, 20, 10, 0, 0, Math.PI); g.lineTo(cx - 20, 18); g.ellipse(cx, 18, 20, 10, 0, Math.PI, 0, true); g.closePath(); g.fill();
  tratto(g, 1.6);
  // faccia
  const grad = g.createLinearGradient(cx - 18, 8, cx + 18, 28);
  grad.addColorStop(0, '#FFFFFF'); grad.addColorStop(0.08, colore); grad.addColorStop(1, scuro);
  g.fillStyle = grad; g.beginPath(); g.ellipse(cx, 18, 20, 10, 0, 0, Math.PI * 2); g.fill(); tratto(g, 1.6);
  g.beginPath(); g.ellipse(cx, 18, 15, 7, 0, 0, Math.PI * 2); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.stroke();
  // venature
  g.strokeStyle = 'rgba(59,36,22,0.25)'; g.lineWidth = 0.8;
  for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(cx - 14, 18 + k * 2.5); g.quadraticCurveTo(cx, 18 + k * 2.5 - 1.5, cx + 14, 18 + k * 2.5); g.stroke(); }
  return c;
}

/** Cartello grigio di cartone della Marina con la corona del Re (in piedi). Base dell'asta in basso al centro. */
export function dipingiCartello(): HTMLCanvasElement {
  const R = RISOLUZIONE, w = 52, h = 64;
  const { c, g } = tela(w * R, h * R);
  g.scale(R, R);
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(w / 2 + 3, h - 3, 9, 3, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#7A6A58'; g.beginPath(); g.rect(w / 2 - 2.5, 26, 5, h - 28); g.fill(); tratto(g, 1.2);
  g.fillStyle = '#A8A29E'; g.beginPath(); g.moveTo(5, 6); g.lineTo(w - 4, 4); g.lineTo(w - 6, 32); g.lineTo(6, 34); g.closePath(); g.fill(); tratto(g, 1.8);
  g.fillStyle = 'rgba(87,83,78,0.5)'; g.beginPath(); g.moveTo(6, 28); g.lineTo(w - 6, 26); g.lineTo(w - 6, 32); g.lineTo(6, 34); g.closePath(); g.fill();
  // corona del Re
  g.fillStyle = '#57534E'; g.beginPath();
  g.moveTo(16, 24); g.lineTo(14, 12); g.lineTo(20, 17); g.lineTo(26, 9); g.lineTo(32, 17); g.lineTo(38, 12); g.lineTo(36, 24); g.closePath(); g.fill();
  g.strokeStyle = '#E6E2DC'; g.lineWidth = 1; g.stroke();
  return c;
}

/** Bandierina rossa con teschio. Base dell'asta in basso a sinistra (x = 8). */
export function dipingiBandierina(): HTMLCanvasElement {
  const R = RISOLUZIONE, w = 50, h = 66;
  const { c, g } = tela(w * R, h * R);
  g.scale(R, R);
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(10, h - 3, 7, 2.5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#6B4226'; g.beginPath(); g.rect(6.5, 4, 3.5, h - 6); g.fill(); tratto(g, 1);
  g.fillStyle = '#FFC83D'; g.beginPath(); g.arc(8.2, 4, 3, 0, Math.PI * 2); g.fill(); tratto(g, 1);
  g.fillStyle = '#E5484D';
  g.beginPath(); g.moveTo(10, 7); g.quadraticCurveTo(28, 2, 46, 9); g.lineTo(40, 20); g.lineTo(46, 31); g.quadraticCurveTo(28, 25, 10, 31); g.closePath(); g.fill(); tratto(g, 1.6);
  g.fillStyle = '#FFF7E8'; g.beginPath(); g.arc(25, 16, 5.5, 0, Math.PI * 2); g.fill(); g.fillRect(22, 19, 6, 4);
  g.fillStyle = '#2B1B10'; g.beginPath(); g.arc(23, 16, 1.5, 0, Math.PI * 2); g.arc(27, 16, 1.5, 0, Math.PI * 2); g.fill();
  return c;
}

/** Icona del premio: medaglione d'oro con il disegno del tipo di premio. */
export function dipingiPremio(tipo: 'arma' | 'mossa' | 'recluta' | 'bandiera'): HTMLCanvasElement {
  const R = RISOLUZIONE, L = 44;
  const { c, g } = tela(L * R, L * R);
  g.scale(R, R);
  const cx = L / 2, cy = L / 2;
  const grad = g.createRadialGradient(cx - 6, cy - 7, 2, cx, cy, 20);
  grad.addColorStop(0, '#FFF1B8'); grad.addColorStop(0.4, '#FFC83D'); grad.addColorStop(1, '#C78A12');
  g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, 19, 0, Math.PI * 2); g.fill(); tratto(g, 2);
  g.beginPath(); g.arc(cx, cy, 15, 0, Math.PI * 2); g.strokeStyle = 'rgba(120,70,10,0.5)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#2B1B10'; g.strokeStyle = '#2B1B10';
  switch (tipo) {
    case 'arma': // bomba con miccia
      g.beginPath(); g.arc(cx - 1, cy + 2, 8, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(cx + 4, cy - 4); g.quadraticCurveTo(cx + 8, cy - 11, cx + 11, cy - 8); g.lineWidth = 2; g.stroke();
      g.fillStyle = '#E5484D'; g.beginPath(); g.arc(cx + 11, cy - 9, 2.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(cx - 4, cy - 1, 2.2, 0, Math.PI * 2); g.fill();
      break;
    case 'mossa': // stivale con le ali del salto
      g.beginPath(); g.moveTo(cx - 5, cy - 10); g.lineTo(cx + 2, cy - 10); g.lineTo(cx + 2, cy + 3); g.lineTo(cx + 10, cy + 5); g.lineTo(cx + 10, cy + 10); g.lineTo(cx - 6, cy + 10); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(cx - 6, cy - 4); g.lineTo(cx - 13, cy - 8); g.moveTo(cx - 6, cy); g.lineTo(cx - 14, cy - 2); g.lineWidth = 2; g.stroke();
      break;
    case 'recluta': // cappello da pirata
      g.beginPath(); g.moveTo(cx - 13, cy + 4); g.quadraticCurveTo(cx, cy - 18, cx + 13, cy + 4); g.quadraticCurveTo(cx, cy, cx - 13, cy + 4); g.fill();
      g.fillStyle = '#FFF7E8'; g.beginPath(); g.arc(cx, cy - 3, 3, 0, Math.PI * 2); g.fill();
      break;
    case 'bandiera':
      g.beginPath(); g.rect(cx - 9, cy - 11, 2.5, 22); g.fill();
      g.beginPath(); g.moveTo(cx - 6.5, cy - 11); g.lineTo(cx + 11, cy - 6); g.lineTo(cx - 6.5, cy); g.closePath(); g.fill();
      break;
  }
  return c;
}

/** Boccale di birra visto dall'alto in 3/4 (fermacarte negli angoli). */
export function dipingiBoccale(): HTMLCanvasElement {
  const R = RISOLUZIONE, w = 130, h = 120;
  const { c, g } = tela(w * R, h * R);
  g.scale(R, R);
  const cx = 58, cy = 58;
  g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(cx + 12, cy + 16, 46, 40, 0, 0, Math.PI * 2); g.fill();
  // manico
  g.beginPath(); g.ellipse(cx + 44, cy + 6, 16, 22, 0, -Math.PI / 2, Math.PI / 2); g.lineWidth = 9; g.strokeStyle = '#6B4226'; g.stroke();
  g.beginPath(); g.ellipse(cx + 44, cy + 6, 16, 22, 0, -Math.PI / 2, Math.PI / 2); g.lineWidth = 1.5; g.strokeStyle = INCHIOSTRO; g.stroke();
  // corpo (doghe) e cerchi di ferro
  g.fillStyle = '#8A5A3A'; g.beginPath(); g.ellipse(cx, cy + 12, 40, 34, 0, 0, Math.PI * 2); g.fill(); tratto(g, 2);
  g.strokeStyle = '#3A3A3A'; g.lineWidth = 4; g.beginPath(); g.ellipse(cx, cy + 6, 40, 33, 0, 0.2, Math.PI - 0.2); g.stroke();
  // bordo e schiuma
  g.fillStyle = '#6B4226'; g.beginPath(); g.ellipse(cx, cy, 38, 31, 0, 0, Math.PI * 2); g.fill(); tratto(g, 2);
  const sch = g.createRadialGradient(cx - 10, cy - 10, 3, cx, cy, 33);
  sch.addColorStop(0, '#FFFDF4'); sch.addColorStop(1, '#E8D9A8');
  g.fillStyle = sch;
  g.beginPath();
  for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI * 2; const r = 31 + Math.sin(k * 2.3) * 2; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8); }
  g.closePath(); g.fill(); g.lineWidth = 1; g.strokeStyle = 'rgba(59,36,22,0.5)'; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  for (const [x, y, r] of [[-12, -8, 4], [8, 4, 3], [-2, 10, 2.5], [14, -10, 2]]) { g.beginPath(); g.arc(cx + x, cy + y, r, 0, Math.PI * 2); g.fill(); }
  return c;
}

/** Sbuffo di nebbia (morbido, si ripete scalato e ruotato). */
export function dipingiNebbia(): HTMLCanvasElement {
  const L = 256;
  const { c, g } = tela(L, L);
  const r = rng(41);
  for (let k = 0; k < 9; k++) {
    const x = L / 2 + (r() - 0.5) * L * 0.35, y = L / 2 + (r() - 0.5) * L * 0.25, rr = L * (0.2 + r() * 0.16);
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, 'rgba(236,240,244,0.55)'); gr.addColorStop(0.6, 'rgba(220,228,236,0.35)'); gr.addColorStop(1, 'rgba(210,220,230,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
  }
  return c;
}

/** Veliero della ciurma (vista di 3/4, prua a destra). Centro dello scafo al centro dell'immagine. */
export function dipingiVeliero(): HTMLCanvasElement {
  const R = RISOLUZIONE, w = 96, h = 96;
  const { c, g } = tela(w * R, h * R);
  g.scale(R, R);
  g.fillStyle = 'rgba(11,61,92,0.45)'; g.beginPath(); g.ellipse(48, 62, 38, 10, 0, 0, Math.PI * 2); g.fill();
  // scafo
  g.fillStyle = '#6B4226'; g.beginPath(); g.moveTo(14, 52); g.lineTo(84, 50); g.quadraticCurveTo(78, 66, 62, 68); g.lineTo(26, 68); g.quadraticCurveTo(16, 62, 14, 52); g.closePath(); g.fill(); tratto(g, 1.8);
  g.strokeStyle = '#3B2416'; g.lineWidth = 1; g.beginPath(); g.moveTo(18, 58); g.lineTo(80, 56); g.stroke();
  g.fillStyle = '#FFC83D'; for (const x of [30, 44, 58]) { g.beginPath(); g.arc(x, 62, 1.8, 0, Math.PI * 2); g.fill(); }
  // alberi e vele
  for (const [x, alto, larga] of [[38, 12, 15], [60, 20, 12]] as const) {
    g.fillStyle = '#4A2E1A'; g.fillRect(x - 1.2, alto, 2.4, 52 - alto);
    g.fillStyle = '#FFF7E8';
    g.beginPath(); g.moveTo(x - larga, alto + 4); g.quadraticCurveTo(x + 2, alto + 1, x + larga, alto + 4); g.quadraticCurveTo(x + larga + 4, alto + 18, x + larga, alto + 30); g.lineTo(x - larga, alto + 30); g.quadraticCurveTo(x - larga + 4, alto + 18, x - larga, alto + 4); g.closePath(); g.fill(); tratto(g, 1.4);
  }
  g.fillStyle = '#E5484D'; g.beginPath(); g.moveTo(39, 6); g.lineTo(52, 9); g.lineTo(39, 13); g.closePath(); g.fill(); tratto(g, 1);
  g.fillStyle = '#4A2E1A'; g.fillRect(37.8, 5, 2.4, 9);
  return c;
}

// ─── Tutto insieme ───────────────────────────────────────────────────────────────────────────────────

type Dipinto = { nome: string; c: HTMLCanvasElement; formato: 'webp' | 'png' };

/** Elenco dei file da dipingere (nome senza estensione). Lo usa dipingi.ts per chiederli uno alla volta. */
export function elenco(): string[] {
  const nomi = ['tavolo', 'carta', 'indici', 'onde-a', 'onde-b', 'pedina-rossa', 'pedina-grigia', 'cartello', 'bandierina',
    'premio-arma', 'premio-mossa', 'premio-recluta', 'premio-bandiera', 'boccale', 'nebbia', 'veliero'];
  for (const i of isoleDaDipingere()) nomi.push(`isola-${i.id}`, `onda-${i.id}`);
  return nomi;
}

function dipingi(nome: string): Dipinto[] {
  const isola = isoleDaDipingere().find((i) => nome.endsWith(`-${i.id}`));
  const uno = (c: HTMLCanvasElement, formato: 'webp' | 'png' = 'webp'): Dipinto[] => [{ nome, c, formato }];
  switch (nome) {
    case 'tavolo': return uno(dipingiTavolo());
    case 'indici': return uno(dipingiIndici(), 'png');
    case 'onde-a': return uno(dipingiOnde(51), 'png');
    case 'onde-b': return uno(dipingiOnde(52), 'png');
    case 'pedina-rossa': return uno(dipingiPedina('#E5484D', '#8E1F23'));
    case 'pedina-grigia': return uno(dipingiPedina('#A8A29E', '#57534E'));
    case 'cartello': return uno(dipingiCartello());
    case 'bandierina': return uno(dipingiBandierina());
    case 'premio-arma': return uno(dipingiPremio('arma'));
    case 'premio-mossa': return uno(dipingiPremio('mossa'));
    case 'premio-recluta': return uno(dipingiPremio('recluta'));
    case 'premio-bandiera': return uno(dipingiPremio('bandiera'));
    case 'boccale': return uno(dipingiBoccale());
    case 'nebbia': return uno(dipingiNebbia(), 'png');
    case 'veliero': return uno(dipingiVeliero());
    case 'carta': {
      // la carta si taglia in tessere da 512 (l'ultima riga è alta 1728 - 3×512 = 192)
      const tutta = dipingiCarta();
      const out: Dipinto[] = [];
      for (let ty = 0; ty * TESSERA < MONDO_H; ty++) {
        for (let tx = 0; tx * TESSERA < MONDO_W; tx++) {
          const w = Math.min(TESSERA, MONDO_W - tx * TESSERA), h = Math.min(TESSERA, MONDO_H - ty * TESSERA);
          const { c, g } = tela(w, h);
          g.drawImage(tutta, -tx * TESSERA, -ty * TESSERA);
          out.push({ nome: `carta-${ty}-${tx}`, c, formato: 'webp' });
        }
      }
      return out;
    }
  }
  if (isola && nome.startsWith('isola-')) return uno(dipingiIsola(isola));
  if (isola && nome.startsWith('onda-')) return uno(dipingiOnda(isola), 'png');
  throw new Error(`non so dipingere ${nome}`);
}

/** Dipinge un pezzo e restituisce i file (nome con estensione → dataURL). */
export function dipingiPezzo(nome: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of dipingi(nome)) out[`${d.nome}.${d.formato}`] = d.formato === 'png' ? d.c.toDataURL('image/png') : d.c.toDataURL('image/webp', 0.9);
  return out;
}

export function manifesto() {
  return { ordineIndici: ordineIndici(), passoIndici: PASSO_INDICI, scalaIndici: SCALA_INDICI, risoluzione: RISOLUZIONE, tessera: TESSERA };
}
