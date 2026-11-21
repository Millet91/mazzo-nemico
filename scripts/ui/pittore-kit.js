// Pittore del kit UI (P2, Arte UI). Gira DENTRO Chromium (lo apre dipingi-kit.mjs): dipinge con canvas e SVG
// i pannelli a 9 fette in legno e pergamena, i pulsanti, la cornice tonda, lo sfondo del menu e le 16 icone
// delle armi a 128 px. Tutto fatto in casa, nessun asset esterno. Stile "cartone dipinto" (arte-ui.md §3.1):
// contorno marrone scuro caldo, luce calda da in alto a sinistra, ombre morbide, grana leggera.
// Ogni funzione restituisce un canvas; il runner lo salva in webp (qualità 0,82) in public/assets/ui/.

/* eslint-disable */
const INCHIOSTRO = '#2B1B10';

// ─── utilità ────────────────────────────────────────────────────────────────────────────────────
function rng(seme) {
  let a = seme >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function creaRumore(seme) {
  const r = rng(seme), p = new Float32Array(256 * 256);
  for (let i = 0; i < p.length; i++) p[i] = r();
  const v = (x, y) => p[((y & 255) << 8) | (x & 255)];
  const s = (t) => t * t * (3 - 2 * t);
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = s(x - xi), yf = s(y - yi);
    const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  return (x, y, ottave = 4) => { let t = 0, amp = 0.5, f = 1; for (let o = 0; o < ottave; o++) { t += n(x * f, y * f) * amp; amp *= 0.5; f *= 2; } return t; };
}
function tela(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** Venatura del legno: `verticale` gira la fibra. Colori chiaro/scuro della tavola. */
function texLegno(w, h, { seme = 1, verticale = false, chiaro = '#9A6337', scuro = '#5E3519', tavole = 0 } = {}) {
  const c = tela(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const N = creaRumore(seme), A = rgb(chiaro), B = rgb(scuro);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = verticale ? y : x, v = verticale ? x : y;      // u lungo la fibra, v attraverso
    const curva = N(u * 0.012, v * 0.03, 3) * 14;
    const fibra = Math.sin((v + curva) * 0.55) * 0.5 + 0.5;
    const macchia = N(u * 0.03 + 50, v * 0.08, 3);
    let t = 0.25 + fibra * 0.35 + (macchia - 0.5) * 0.7;
    if (tavole > 0) { const k = (v % tavole) / tavole; if (k < 0.05 || k > 0.95) t = 1.15; }
    t = Math.min(1.2, Math.max(0, t));
    const col = mix(A, B, Math.min(1, t));
    const i = (y * w + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); return c;
}

/** Pergamena chiazzata. */
function texPergamena(w, h, seme = 7) {
  const c = tela(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const N = creaRumore(seme), A = rgb('#FAEDCB'), B = rgb('#D9BE8C');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = Math.max(0, Math.min(1, (N(x * 0.02, y * 0.02, 5) - 0.35) * 1.6 + (N(x * 0.3, y * 0.3, 1) - 0.5) * 0.12));
    const col = mix(A, B, t * 0.75);
    const i = (y * w + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); return c;
}

/** Ombra morbida interna lungo il bordo di una forma già disegnata (bordo bruciato/smussato). */
function bordoInterno(ctx, forma, colore, spessore, alfa) {
  ctx.save(); forma(); ctx.clip();
  for (let i = 0; i < spessore; i += 2) {
    ctx.globalAlpha = alfa * (1 - i / spessore) * 0.35; ctx.lineWidth = (spessore - i) * 2; ctx.strokeStyle = colore; forma(); ctx.stroke();
  }
  ctx.restore();
}

function chiodo(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, '#FFE7A3'); g.addColorStop(0.45, '#C89A3C'); g.addColorStop(1, '#6B4A16');
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.28); ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
}

/** Cornice di legno a quattro tavole con giunti a 45° (fibra orizzontale sopra/sotto, verticale ai lati). */
function cornice(ctx, W, H, b, r, seme, chiaro, scuro) {
  const oriz = texLegno(W, b, { seme, chiaro, scuro }), vert = texLegno(b, H, { seme: seme + 1, verticale: true, chiaro, scuro });
  const esterno = () => rrect(ctx, 3, 3, W - 6, H - 6, r);
  ctx.save(); esterno(); ctx.clip();
  const tri = (pts, img, x, y) => { ctx.save(); ctx.beginPath(); pts.forEach(([a, c], i) => (i ? ctx.lineTo(a, c) : ctx.moveTo(a, c))); ctx.closePath(); ctx.clip(); ctx.drawImage(img, x, y); ctx.restore(); };
  tri([[0, 0], [W, 0], [W - b, b], [b, b]], oriz, 0, 0);
  tri([[0, H], [W, H], [W - b, H - b], [b, H - b]], oriz, 0, H - b);
  tri([[0, 0], [b, b], [b, H - b], [0, H]], vert, 0, 0);
  tri([[W, 0], [W - b, b], [W - b, H - b], [W, H]], vert, W - b, 0);
  // giunti
  ctx.strokeStyle = 'rgba(43,27,16,.55)'; ctx.lineWidth = 3;
  for (const [a, c, e, f] of [[0, 0, b, b], [W, 0, W - b, b], [0, H, b, H - b], [W, H, W - b, H - b]]) { ctx.beginPath(); ctx.moveTo(a, c); ctx.lineTo(e, f); ctx.stroke(); }
  // luce dall'alto a sinistra, ombra in basso a destra
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, 'rgba(255,220,160,.22)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(30,10,0,.25)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  bordoInterno(ctx, esterno, '#1a0d05', 14, 0.9);
  // filo di luce sul bordo alto
  ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#FFD89A'; ctx.lineWidth = 3; rrect(ctx, 9, 9, W - 18, H - 18, r - 6); ctx.stroke(); ctx.restore();
  ctx.lineWidth = 6; ctx.strokeStyle = INCHIOSTRO; esterno(); ctx.stroke();
}

// ─── pannelli a 9 fette (sorgente a 3×) ─────────────────────────────────────────────────────────
/** Legno con dentro la pergamena: il pannello principale della mappa del mondo. 288×288, fetta 72. */
function pannelloCornice() {
  const W = 288, H = 288, b = 54, c = tela(W, H), ctx = c.getContext('2d');
  // dentro: pergamena con ombra della cornice
  const dentro = () => rrect(ctx, b - 8, b - 8, W - 2 * b + 16, H - 2 * b + 16, 10);
  ctx.save(); dentro(); ctx.clip(); ctx.drawImage(texPergamena(W, H, 3), 0, 0); ctx.restore();
  bordoInterno(ctx, dentro, '#6B4A20', 22, 0.8);
  // cornice sopra (bucata)
  const f = tela(W, H), fc = f.getContext('2d');
  cornice(fc, W, H, b, 30, 11, '#A56B3A', '#5A3218');
  fc.globalCompositeOperation = 'destination-out'; rrect(fc, b, b, W - 2 * b, H - 2 * b, 8); fc.fill();
  fc.globalCompositeOperation = 'source-over'; fc.lineWidth = 5; fc.strokeStyle = INCHIOSTRO; rrect(fc, b, b, W - 2 * b, H - 2 * b, 8); fc.stroke();
  ctx.drawImage(f, 0, 0);
  for (const [x, y] of [[27, 27], [W - 27, 27], [27, H - 27], [W - 27, H - 27]]) chiodo(ctx, x, y, 9);
  return c;
}

/** Tutto legno (tavole scure al centro): barre, cartelli, fondo dei pulsanti grandi. 288×288, fetta 66. */
function pannelloLegno() {
  const W = 288, H = 288, b = 48, c = tela(W, H), ctx = c.getContext('2d');
  ctx.save(); rrect(ctx, 3, 3, W - 6, H - 6, 28); ctx.clip();
  ctx.drawImage(texLegno(W, H, { seme: 21, chiaro: '#7A4A26', scuro: '#3E2210', tavole: 64 }), 0, 0); ctx.restore();
  const f = tela(W, H), fc = f.getContext('2d');
  cornice(fc, W, H, b, 28, 31, '#A56B3A', '#5A3218');
  fc.globalCompositeOperation = 'destination-out'; rrect(fc, b, b, W - 2 * b, H - 2 * b, 6); fc.fill();
  fc.globalCompositeOperation = 'source-over'; fc.lineWidth = 5; fc.strokeStyle = INCHIOSTRO; rrect(fc, b, b, W - 2 * b, H - 2 * b, 6); fc.stroke();
  ctx.drawImage(f, 0, 0);
  bordoInterno(ctx, () => rrect(ctx, b, b, W - 2 * b, H - 2 * b, 6), '#000', 18, 0.9);
  for (const [x, y] of [[24, 24], [W - 24, 24], [24, H - 24], [W - 24, H - 24]]) chiodo(ctx, x, y, 8);
  return c;
}

/** Foglio di pergamena coi bordi strappati e bruciacchiati. 240×240, fetta 60. */
function pannelloPergamena() {
  const W = 240, H = 240, c = tela(W, H), ctx = c.getContext('2d'), N = creaRumore(77), m = 14;
  // bordo irregolare, ma uguale lungo ogni lato (così si allunga senza scatti): il rumore varia solo vicino agli angoli
  const forma = () => {
    ctx.beginPath();
    const punti = [];
    const lato = (x0, y0, x1, y1, nx, ny, s) => {
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, ang = Math.min(t, 1 - t) < 0.3 ? 1 : 0;
        const o = ang * (N(s + t * 6, s, 2) - 0.5) * 12;
        punti.push([x0 + (x1 - x0) * t + nx * o, y0 + (y1 - y0) * t + ny * o]);
      }
    };
    lato(m, m, W - m, m, 0, 1, 1); lato(W - m, m, W - m, H - m, -1, 0, 9); lato(W - m, H - m, m, H - m, 0, -1, 17); lato(m, H - m, m, m, 1, 0, 25);
    punti.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
  };
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5; forma(); ctx.fillStyle = '#E9D5A8'; ctx.fill(); ctx.restore();
  ctx.save(); forma(); ctx.clip(); ctx.drawImage(texPergamena(W, H, 5), 0, 0); ctx.restore();
  bordoInterno(ctx, forma, '#7A4A16', 26, 1);
  ctx.lineWidth = 4; ctx.strokeStyle = '#5A3A18'; forma(); ctx.stroke();
  return c;
}

// ─── pulsanti (sorgente a 3×, fetta [alto, destra, basso, sinistra]) ────────────────────────────
/** Tavola con lo spessore sotto: il "premuto" lo fa il CSS spostandola. 240×168, fette [48,60,66,60]. */
function pulsante(chiaro, scuro, spessore, seme, lucido) {
  const W = 240, H = 168, s = 18, r = 30, c = tela(W, H), ctx = c.getContext('2d');
  // ombra a terra e spessore
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4; rrect(ctx, 4, 4 + s, W - 8, H - 8 - s, r); ctx.fillStyle = spessore; ctx.fill(); ctx.restore();
  rrect(ctx, 4, 4 + s, W - 8, H - 8 - s, r); ctx.lineWidth = 6; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
  // faccia
  const faccia = () => rrect(ctx, 4, 4, W - 8, H - 8 - s, r);
  ctx.save(); faccia(); ctx.clip(); ctx.drawImage(texLegno(W, H, { seme, chiaro, scuro }), 0, 0);
  const g = ctx.createLinearGradient(0, 4, 0, H - s); g.addColorStop(0, lucido ? 'rgba(255,250,220,.55)' : 'rgba(255,220,160,.28)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(40,15,0,.3)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  bordoInterno(ctx, faccia, '#2B1206', 10, 0.7);
  ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = lucido ? '#FFF6C8' : '#FFD8A0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r + 6, 13); ctx.lineTo(W - r - 6, 13); ctx.stroke(); ctx.restore();
  faccia(); ctx.lineWidth = 6; ctx.strokeStyle = INCHIOSTRO; ctx.stroke();
  return c;
}
const pulsanteLegno = () => pulsante('#B07440', '#6A3C1C', '#3B2010', 41, false);
const pulsanteOro = () => pulsante('#FFD45A', '#D9921C', '#8A5A0E', 43, true);

/** Medaglione tondo di ottone e legno per i pulsanti a icona (ingranaggio). 144×144. */
function corniceTonda() {
  const S = 144, c = tela(S, S), ctx = c.getContext('2d'), m = S / 2;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4; ctx.beginPath(); ctx.arc(m, m, 64, 0, 7); ctx.fillStyle = '#8A5A0E'; ctx.fill(); ctx.restore();
  const g = ctx.createRadialGradient(m - 22, m - 26, 6, m, m, 66); g.addColorStop(0, '#FFF0B0'); g.addColorStop(0.35, '#E8B040'); g.addColorStop(1, '#7A4C0C');
  ctx.beginPath(); ctx.arc(m, m, 64, 0, 7); ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(m, m, 48, 0, 7); ctx.clip(); ctx.drawImage(texLegno(S, S, { seme: 51, chiaro: '#6E4122', scuro: '#341A0A' }), 0, 0); ctx.restore();
  bordoInterno(ctx, () => { ctx.beginPath(); ctx.arc(m, m, 48, 0, 7); }, '#000', 14, 0.9);
  ctx.lineWidth = 5; ctx.strokeStyle = INCHIOSTRO; ctx.beginPath(); ctx.arc(m, m, 48, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(m, m, 64, 0, 7); ctx.stroke();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; chiodo(ctx, m + Math.cos(a) * 56, m + Math.sin(a) * 56, 4); }
  return c;
}

// ─── sfondo del menu: tramonto sulla Cala con il veliero (2400×1080) ────────────────────────────
function sfondoMenu() {
  const W = 2400, H = 1080, c = tela(W, H), ctx = c.getContext('2d'), R = rng(5), oriz = 700;
  // cielo
  let g = ctx.createLinearGradient(0, 0, 0, oriz);
  g.addColorStop(0, '#1B3A63'); g.addColorStop(0.35, '#3F6FA0'); g.addColorStop(0.62, '#E89A6A'); g.addColorStop(0.85, '#FFC872'); g.addColorStop(1, '#FFE2A0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, oriz);
  // sole e alone
  const sx = 1520, sy = 600;
  g = ctx.createRadialGradient(sx, sy, 20, sx, sy, 700); g.addColorStop(0, 'rgba(255,240,190,.95)'); g.addColorStop(0.12, 'rgba(255,205,120,.6)'); g.addColorStop(1, 'rgba(255,160,90,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, oriz);
  ctx.beginPath(); ctx.arc(sx, sy, 88, 0, 7); ctx.fillStyle = '#FFF4CF'; ctx.fill();
  // nuvole dipinte: grappoli di bolle, pancia viola, cima rosata
  const nuvola = (x, y, s, n) => {
    const bolle = []; for (let i = 0; i < n; i++) bolle.push([x + (R() - 0.5) * 320 * s, y + (R() - 0.5) * 40 * s - Math.abs(R() - 0.5) * 30 * s, (40 + R() * 60) * s]);
    ctx.save(); ctx.fillStyle = '#7C5A86'; for (const [a, b, r] of bolle) { ctx.beginPath(); ctx.arc(a, b + r * 0.12, r, 0, 7); ctx.fill(); } ctx.restore();
    ctx.save(); for (const [a, b, r] of bolle) { const q = ctx.createRadialGradient(a - r * 0.3, b - r * 0.5, r * 0.1, a, b, r); q.addColorStop(0, '#FFE1C2'); q.addColorStop(0.6, '#F0A8A0'); q.addColorStop(1, 'rgba(200,120,150,0)'); ctx.fillStyle = q; ctx.beginPath(); ctx.arc(a, b - r * 0.08, r * 0.92, 0, 7); ctx.fill(); } ctx.restore();
  };
  nuvola(340, 210, 1.1, 14); nuvola(980, 120, 0.8, 11); nuvola(2050, 230, 1.2, 15); nuvola(1600, 380, 0.6, 9); nuvola(620, 460, 0.55, 9);
  // isole lontane (sagome azzurrine) e la Cala a sinistra
  const sagoma = (pts, col) => { ctx.beginPath(); ctx.moveTo(pts[0][0], oriz); pts.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(pts[pts.length - 1][0], oriz); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); };
  sagoma([[1760, 700], [1820, 668], [1900, 655], [1990, 672], [2060, 700]], '#B88A9A');
  sagoma([[60, 700], [120, 600], [210, 540], [300, 520], [380, 560], [450, 548], [540, 610], [620, 650], [700, 700]], '#6A4B6E');
  // palme sulla Cala
  const palma = (x, y, h, k) => {
    ctx.strokeStyle = '#4A3050'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + k * 20, y - h * 0.6, x + k * 34, y - h); ctx.stroke();
    ctx.fillStyle = '#4A3050'; const tx = x + k * 34, ty = y - h;
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.55; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + Math.cos(a) * 60, ty + Math.sin(a) * 40 - 10, tx + Math.cos(a) * 96, ty + Math.sin(a) * 50 + 30); ctx.quadraticCurveTo(tx + Math.cos(a) * 50, ty + Math.sin(a) * 30 + 6, tx, ty); ctx.fill(); }
  };
  palma(290, 525, 130, 1); palma(360, 545, 100, -1);
  // mare
  g = ctx.createLinearGradient(0, oriz, 0, H); g.addColorStop(0, '#F2B67C'); g.addColorStop(0.08, '#3D7FA6'); g.addColorStop(0.5, '#1A5C84'); g.addColorStop(1, '#0B3D5C');
  ctx.fillStyle = g; ctx.fillRect(0, oriz, W, H - oriz);
  // scia di luce del sole sull'acqua
  for (let i = 0; i < 70; i++) {
    const y = oriz + 6 + Math.pow(R(), 1.6) * 360, larg = 30 + (y - oriz) * 0.5 * R(), x = sx + (R() - 0.5) * (60 + (y - oriz) * 0.9);
    ctx.fillStyle = `rgba(255,${200 + R() * 50 | 0},150,${0.25 + R() * 0.5})`; ctx.fillRect(x - larg / 2, y, larg, 3 + (y - oriz) * 0.012);
  }
  // onde dipinte
  for (let i = 0; i < 260; i++) {
    const y = oriz + 20 + Math.pow(R(), 1.3) * 380, x = R() * W, l = 20 + (y - oriz) * 0.25;
    ctx.strokeStyle = `rgba(200,240,255,${0.12 + R() * 0.2})`; ctx.lineWidth = 2 + (y - oriz) * 0.008;
    ctx.beginPath(); ctx.moveTo(x - l, y); ctx.quadraticCurveTo(x, y - 6 - (y - oriz) * 0.01, x + l, y); ctx.stroke();
  }
  // il veliero, a destra, che naviga verso sinistra
  disegnaVeliero(ctx, 1980, 900, 1.05);
  // vignetta per far leggere titolo e pulsanti
  g = ctx.createRadialGradient(W / 2, H * 0.55, 300, W / 2, H * 0.55, 1500); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,20,40,.45)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  return c;
}

function disegnaVeliero(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const O = INCHIOSTRO;
  const tratto = (w) => { ctx.lineWidth = w; ctx.strokeStyle = O; ctx.stroke(); };
  // riflesso
  ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#05202F'; ctx.beginPath(); ctx.ellipse(0, 22, 300, 26, 0, 0, 7); ctx.fill(); ctx.restore();
  // alberi
  const albero = (ax, top) => { ctx.beginPath(); ctx.rect(ax - 7, top, 14, -top - 40); ctx.fillStyle = '#5A3218'; ctx.fill(); tratto(5); };
  albero(-120, -420); albero(40, -500); albero(180, -340);
  // vele (luce del sole da destra-dietro: lato sinistro in ombra)
  const vela = (cx, top, w, h, k) => {
    ctx.beginPath(); ctx.moveTo(cx - w / 2, top); ctx.quadraticCurveTo(cx, top + 18, cx + w / 2, top);
    ctx.quadraticCurveTo(cx + w / 2 + 26 * k, top + h / 2, cx + w / 2, top + h); ctx.quadraticCurveTo(cx, top + h - 26, cx - w / 2, top + h);
    ctx.quadraticCurveTo(cx - w / 2 + 26 * k, top + h / 2, cx - w / 2, top); ctx.closePath();
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0); g.addColorStop(0, '#D9B48A'); g.addColorStop(0.7, '#FFF1D2'); g.addColorStop(1, '#FFE0A8');
    ctx.fillStyle = g; ctx.fill(); tratto(6);
  };
  vela(-120, -390, 150, 120, -1); vela(-120, -255, 175, 140, -1);
  vela(40, -470, 170, 130, -1); vela(40, -325, 200, 160, -1);
  vela(180, -320, 120, 100, -1); vela(180, -205, 140, 110, -1);
  // bandiera rossa col teschio stilizzato
  ctx.beginPath(); ctx.moveTo(40, -500); ctx.lineTo(118, -490); ctx.quadraticCurveTo(100, -475, 120, -458); ctx.lineTo(40, -462); ctx.closePath(); ctx.fillStyle = '#C8322A'; ctx.fill(); tratto(4);
  ctx.beginPath(); ctx.arc(72, -478, 8, 0, 7); ctx.fillStyle = '#FFF1D2'; ctx.fill();
  // scafo
  ctx.beginPath(); ctx.moveTo(-300, -60); ctx.lineTo(-180, -40); ctx.lineTo(220, -40); ctx.quadraticCurveTo(270, -70, 300, -110); ctx.lineTo(310, -60);
  ctx.quadraticCurveTo(290, 10, 220, 20); ctx.lineTo(-170, 20); ctx.quadraticCurveTo(-250, 10, -300, -60); ctx.closePath();
  let g = ctx.createLinearGradient(0, -110, 0, 20); g.addColorStop(0, '#9A5A2C'); g.addColorStop(1, '#3E1F0C'); ctx.fillStyle = g; ctx.fill(); tratto(7);
  // fascia gialla e portelli
  ctx.beginPath(); ctx.moveTo(-262, -28); ctx.lineTo(260, -28); ctx.lineWidth = 9; ctx.strokeStyle = '#E8B040'; ctx.stroke();
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.rect(-170 + i * 66, -14, 22, 18); ctx.fillStyle = '#1A0C05'; ctx.fill(); tratto(3); }
  // castello di poppa
  ctx.beginPath(); ctx.moveTo(220, -40); ctx.lineTo(220, -110); ctx.lineTo(300, -110); ctx.closePath(); ctx.fillStyle = '#7A4422'; ctx.fill(); tratto(5);
  // bompresso
  ctx.beginPath(); ctx.moveTo(-290, -62); ctx.lineTo(-372, -104); ctx.lineWidth = 14; ctx.strokeStyle = O; ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = '#7A4422'; ctx.stroke();
  ctx.restore();
}

// ─── icone delle armi (SVG a 128 px, stessa grammatica) ─────────────────────────────────────────
// Grammatica: oggetto in diagonale (basso-sinistra → alto-destra) dentro un cerchio di 112 px, contorno
// marrone #2B1B10 da 5 px, luce calda in alto a sinistra, ombra a contatto in basso, grana leggera sul colore.
const O = INCHIOSTRO;
const t = (w = 5) => `stroke="${O}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const T = t();
const DEFS = `
<defs>
  <radialGradient id="ferro" cx=".32" cy=".3" r=".8"><stop offset="0" stop-color="#8C98A8"/><stop offset=".35" stop-color="#4A5260"/><stop offset="1" stop-color="#15181E"/></radialGradient>
  <linearGradient id="ferroL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9AA6B6"/><stop offset=".5" stop-color="#4E5866"/><stop offset="1" stop-color="#20252D"/></linearGradient>
  <linearGradient id="acciaio" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2F6FA"/><stop offset=".55" stop-color="#AEB9C6"/><stop offset="1" stop-color="#5D6876"/></linearGradient>
  <linearGradient id="legno" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C98A50"/><stop offset=".6" stop-color="#8A5128"/><stop offset="1" stop-color="#5A3016"/></linearGradient>
  <linearGradient id="ottone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF0A8"/><stop offset=".45" stop-color="#E5A93A"/><stop offset="1" stop-color="#8A5A0E"/></linearGradient>
  <radialGradient id="rosso" cx=".3" cy=".3" r=".85"><stop offset="0" stop-color="#FF8A70"/><stop offset=".45" stop-color="#D2382A"/><stop offset="1" stop-color="#6E1410"/></radialGradient>
  <radialGradient id="verde" cx=".3" cy=".3" r=".85"><stop offset="0" stop-color="#9BF07A"/><stop offset=".5" stop-color="#2FA14A"/><stop offset="1" stop-color="#0F4A22"/></radialGradient>
  <radialGradient id="vetro" cx=".3" cy=".3" r=".9"><stop offset="0" stop-color="#C8F2A8"/><stop offset=".5" stop-color="#4F9A3A"/><stop offset="1" stop-color="#1D4A18"/></radialGradient>
  <radialGradient id="pelo" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#D9A06A"/><stop offset=".5" stop-color="#8E5A30"/><stop offset="1" stop-color="#4A2A12"/></radialGradient>
  <radialGradient id="viola" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#E8B8FF"/><stop offset=".5" stop-color="#9A4FD0"/><stop offset="1" stop-color="#3E1260"/></radialGradient>
  <radialGradient id="kraken" cx=".3" cy=".3" r=".9"><stop offset="0" stop-color="#FF9FC0"/><stop offset=".5" stop-color="#C2408A"/><stop offset="1" stop-color="#5A0F3C"/></radialGradient>
  <radialGradient id="fuoco" cx=".5" cy=".7" r=".7"><stop offset="0" stop-color="#FFFBD0"/><stop offset=".4" stop-color="#FFC83D"/><stop offset="1" stop-color="#E8461E"/></radialGradient>
  <radialGradient id="ombra" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <filter id="grana" x="0" y="0" width="1" height="1">
    <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 .15  0 0 0 0 .08  0 0 0 0 0  0 0 0 .5 -.12" result="g"/>
    <feComposite in="g" in2="SourceAlpha" operator="in" result="gi"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="gi"/></feMerge>
  </filter>
</defs>`;
const ombraTerra = (cx = 64, cy = 112, rx = 40) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="7" fill="url(#ombra)"/>`;
const luce = (cx, cy, rx, ry, rot = -30) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="#fff" opacity=".55"/>`;
const scintilla = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0-14 L4-4 L14 0 L4 4 L0 14 L-4 4 L-14 0 L-4-4Z" fill="url(#fuoco)" ${t(3)}/><circle r="3" fill="#FFFBD0"/></g>`;

const ICONE = {
  cannone: `${ombraTerra(60, 110, 46)}
    <g transform="rotate(-28 64 70)">
      <path d="M22 58 Q20 50 28 48 L96 42 Q108 41 110 52 L110 66 Q108 76 96 76 L28 72 Q20 70 22 62Z" fill="url(#ferroL)" ${T}/>
      <rect x="100" y="44" width="12" height="30" rx="4" fill="url(#ferroL)" ${T}/>
      <path d="M34 50 L34 70 M58 47 L58 74" ${t(4)} fill="none"/>
      <circle cx="18" cy="60" r="7" fill="url(#ferro)" ${T}/>
      ${luce(70, 50, 26, 3.5, 0)}
    </g>
    <path d="M30 104 L44 74 L84 74 L92 104Z" fill="url(#legno)" ${T}/>
    <circle cx="44" cy="100" r="13" fill="url(#legno)" ${T}/><circle cx="44" cy="100" r="4" fill="${O}"/>
    <circle cx="86" cy="100" r="13" fill="url(#legno)" ${T}/><circle cx="86" cy="100" r="4" fill="${O}"/>`,
  granata: `${ombraTerra(60, 112, 38)}
    <circle cx="58" cy="72" r="36" fill="url(#ferro)" ${T}/>
    <rect x="62" y="30" width="20" height="14" rx="3" transform="rotate(30 72 37)" fill="url(#ferroL)" ${T}/>
    <path d="M80 30 Q92 18 100 22" fill="none" stroke="#C89A5A" stroke-width="5" stroke-linecap="round"/>
    <path d="M80 30 Q92 18 100 22" fill="none" ${t(2)}/>
    ${scintilla(104, 20)}
    ${luce(44, 56, 12, 7)}`,
  pistola: `${ombraTerra(64, 112, 44)}
    <g transform="rotate(-20 64 64)">
      <path d="M18 52 L102 46 Q108 46 108 52 L108 60 L58 64 Z" fill="url(#ferroL)" ${T}/>
      <path d="M56 58 L84 56 Q86 62 80 68 L64 74 Q58 90 44 102 Q34 108 28 98 Q38 84 40 66 Q42 58 56 58Z" fill="url(#legno)" ${T}/>
      <path d="M64 66 Q70 78 62 82" fill="none" ${t(4)}/>
      <path d="M50 52 L44 40 L52 38 L58 50" fill="url(#ottone)" ${t(4)}/>
      <rect x="22" y="98" width="14" height="9" rx="3" transform="rotate(30 29 102)" fill="url(#ottone)" ${t(4)}/>
      ${luce(70, 50, 22, 2.5, -4)}
    </g>`,
  sciabola: `${ombraTerra(56, 114, 34)}
    <path d="M44 86 Q54 50 84 26 Q100 14 112 12 Q104 26 96 40 Q78 70 54 94Z" fill="url(#acciaio)" ${T}/>
    <path d="M52 86 Q64 58 92 30" fill="none" stroke="#fff" stroke-width="3" opacity=".7" stroke-linecap="round"/>
    <path d="M30 80 Q44 74 60 92 Q50 102 38 100" fill="url(#ottone)" ${T}/>
    <path d="M40 92 L22 112" stroke="${O}" stroke-width="14" stroke-linecap="round"/>
    <path d="M40 92 L22 112" stroke="url(#legno)" stroke-width="6" stroke-linecap="round"/>
    <circle cx="20" cy="114" r="6" fill="url(#ottone)" ${t(4)}/>`,
  barile: `${ombraTerra(64, 114, 40)}
    <path d="M32 24 Q64 16 96 24 Q104 64 96 104 Q64 112 32 104 Q24 64 32 24Z" fill="url(#rosso)" ${T}/>
    <path d="M28 40 Q64 32 100 40 M27 88 Q64 96 101 88" fill="none" ${T}/>
    <path d="M28 40 Q64 32 100 40 M27 88 Q64 96 101 88" fill="none" stroke="#B9C2CC" stroke-width="3"/>
    <ellipse cx="64" cy="22" rx="32" ry="7" fill="#7A2018" ${T}/>
    <path d="M52 56 a12 11 0 1 1 24 0 q0 8 -5 10 l0 5 h-14 l0 -5 q-5 -2 -5 -10z" fill="#FFF1D2" ${t(3.5)}/>
    <circle cx="59" cy="57" r="3" fill="${O}"/><circle cx="69" cy="57" r="3" fill="${O}"/>
    <path d="M58 80 L70 72 M58 72 L70 80" ${t(3.5)}/>
    ${luce(42, 46, 5, 16, 0)}`,
  mina: `${ombraTerra(64, 112, 40)}
    ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<g transform="rotate(${a} 64 66)"><rect x="60" y="22" width="8" height="14" rx="2" fill="url(#ottone)" ${t(3.5)}/></g>`).join('')}
    <circle cx="64" cy="66" r="32" fill="url(#ferro)" ${T}/>
    <path d="M34 72 Q64 84 94 72" fill="none" ${t(3.5)}/>
    <circle cx="64" cy="66" r="9" fill="url(#rosso)" ${t(3.5)}/>
    ${luce(50, 52, 10, 6)}`,
  rum: `${ombraTerra(60, 114, 30)}
    <g transform="rotate(18 64 70)">
      <path d="M50 46 L50 34 L62 34 L62 46 Q84 56 84 80 L84 100 Q84 108 76 108 L36 108 Q28 108 28 100 L28 80 Q28 56 50 46Z" fill="url(#vetro)" ${T}/>
      <rect x="34" y="72" width="44" height="22" rx="3" fill="#F5E6C4" ${t(3.5)}/>
      <path d="M44 78 q6 10 12 0 q6 10 12 0" fill="none" stroke="#C8322A" stroke-width="4" stroke-linecap="round"/>
      ${luce(40, 64, 4, 12, 20)}
      <path d="M50 34 Q44 20 56 12 Q54 22 62 20 Q70 18 66 8 Q80 18 72 34Z" fill="url(#fuoco)" ${t(4)}/>
    </g>`,
  pallaSpezzata: `${ombraTerra(60, 112, 40)}
    <path d="M58 40 L70 56 L62 66 L76 78 L68 102 Q30 104 24 74 Q22 46 58 40Z" fill="url(#ferro)" ${T}/>
    <path d="M66 38 Q94 40 98 66 Q98 80 90 88 L80 76 L72 64 L80 54Z" fill="url(#ferro)" ${T}/>
    ${luce(40, 58, 10, 6)}
    <path d="M100 26 l10 -4 l-2 10z M108 50 l12 2 l-8 8z M22 30 l-6 -10 l10 2z" fill="url(#ferro)" ${t(3.5)}/>
    ${scintilla(84, 30, 0.75)}`,
  pappagallo: `${ombraTerra(64, 116, 30)}
    <path d="M60 30 Q86 24 92 52 Q96 74 80 90 L70 112 L62 110 L64 92 Q40 86 40 60 Q40 36 60 30Z" fill="url(#verde)" ${T}/>
    <path d="M48 62 Q62 60 76 82 Q60 92 48 80Z" fill="#2E7BD0" ${t(4)}/>
    <path d="M52 70 Q62 72 70 84" fill="none" stroke="#F2C230" stroke-width="5" stroke-linecap="round"/>
    <path d="M88 38 Q108 40 104 58 Q98 50 90 54Z" fill="url(#ottone)" ${t(4)}/>
    <circle cx="76" cy="40" r="7" fill="#FFF" ${t(3)}/><circle cx="78" cy="40" r="3" fill="${O}"/>
    <path d="M58 30 Q56 18 66 14 Q64 22 70 26" fill="url(#rosso)" ${t(3.5)}/>
    <circle cx="34" cy="98" r="12" fill="url(#ferro)" ${t(4)}/>
    <path d="M40 90 L60 88" ${t(3)}/>
    ${luce(54, 44, 8, 5)}`,
  scimmia: `${ombraTerra(64, 114, 36)}
    <circle cx="28" cy="58" r="13" fill="url(#pelo)" ${T}/><circle cx="100" cy="58" r="13" fill="url(#pelo)" ${T}/>
    <circle cx="64" cy="60" r="38" fill="url(#pelo)" ${T}/>
    <path d="M40 66 Q40 46 56 48 Q64 52 72 48 Q88 46 88 66 Q88 92 64 94 Q40 92 40 66Z" fill="#F0C898" ${t(4)}/>
    <circle cx="54" cy="62" r="5" fill="${O}"/><circle cx="74" cy="62" r="5" fill="${O}"/>
    <circle cx="55.5" cy="60.5" r="1.6" fill="#fff"/><circle cx="75.5" cy="60.5" r="1.6" fill="#fff"/>
    <path d="M54 80 Q64 88 74 80" fill="none" ${t(3.5)}/>
    <path d="M38 34 Q64 14 90 34 L86 40 Q64 30 42 40Z" fill="url(#rosso)" ${t(4)}/>
    ${luce(46, 36, 8, 4)}`,
  ancora: `${ombraTerra(64, 114, 40)}
    <circle cx="64" cy="22" r="10" fill="none" stroke="${O}" stroke-width="11"/><circle cx="64" cy="22" r="10" fill="none" stroke="url(#ferroL)" stroke-width="4"/>
    <rect x="36" y="38" width="56" height="10" rx="4" fill="url(#ferroL)" ${T}/>
    <rect x="58" y="32" width="12" height="70" rx="4" fill="url(#ferroL)" ${T}/>
    <path d="M20 66 L30 62 Q34 92 64 100 Q94 92 98 62 L108 66 L100 74 Q96 104 64 110 Q32 104 28 74Z" fill="url(#ferroL)" ${T}/>
    ${luce(62, 60, 2, 18, 0)}`,
  bordata: `${ombraTerra(64, 112, 46)}
    <path d="M58 20 L58 82" ${t(6)}/>
    <path d="M60 24 Q88 34 86 60 L60 64Z" fill="#FFF1D2" ${T}/>
    <path d="M56 30 Q34 44 36 66 L56 68Z" fill="#F0DDB4" ${T}/>
    <path d="M14 78 L114 78 Q108 102 90 104 L34 104 Q18 100 14 78Z" fill="url(#legno)" ${T}/>
    <path d="M18 86 L110 86" stroke="#E8B040" stroke-width="4"/>
    <circle cx="40" cy="94" r="4" fill="${O}"/><circle cx="64" cy="94" r="4" fill="${O}"/><circle cx="88" cy="94" r="4" fill="${O}"/>
    <g opacity=".95"><circle cx="16" cy="98" r="10" fill="#E8E2D8" ${t(3.5)}/><circle cx="8" cy="88" r="7" fill="#F5F1EA" ${t(3)}/></g>
    ${scintilla(112, 96, 0.7)}`,
  rampino: `${ombraTerra(64, 116, 34)}
    <path d="M58 26 Q30 30 30 56 Q30 80 18 112" fill="none" stroke="${O}" stroke-width="10" stroke-linecap="round"/>
    <path d="M58 26 Q30 30 30 56 Q30 80 18 112" fill="none" stroke="#C89A5A" stroke-width="4" stroke-linecap="round" stroke-dasharray="5 4"/>
    <circle cx="66" cy="24" r="9" fill="none" stroke="${O}" stroke-width="11"/><circle cx="66" cy="24" r="9" fill="none" stroke="url(#ferroL)" stroke-width="4"/>
    <path d="M70 86 Q46 92 40 70 M70 86 Q94 92 100 70 M70 86 L70 104" fill="none" stroke="${O}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M70 86 Q46 92 40 70 M70 86 Q94 92 100 70" fill="none" stroke="url(#acciaio)" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M36 66 L40 70 L46 64 M104 66 L100 70 L94 64" fill="url(#acciaio)" ${t(4)}/>
    <rect x="63" y="32" width="14" height="58" rx="4" fill="url(#ferroL)" ${T}/>
    ${luce(68, 56, 2, 16, 0)}`,
  vanga: `${ombraTerra(64, 114, 34)}
    <path d="M92 18 L52 74" stroke="${O}" stroke-width="13" stroke-linecap="round"/>
    <path d="M92 18 L52 74" stroke="url(#legno)" stroke-width="6" stroke-linecap="round"/>
    <path d="M84 12 L104 26" stroke="${O}" stroke-width="12" stroke-linecap="round"/><path d="M84 12 L104 26" stroke="url(#legno)" stroke-width="5" stroke-linecap="round"/>
    <path d="M50 64 L66 76 L54 104 Q40 118 26 106 Q16 94 30 80Z" fill="url(#acciaio)" ${T}/>
    ${luce(36, 90, 4, 12, 40)}`,
  bussola: `${ombraTerra(64, 114, 40)}
    <circle cx="64" cy="64" r="48" fill="url(#viola)" opacity=".55"/>
    <circle cx="64" cy="64" r="38" fill="url(#ottone)" ${T}/>
    <circle cx="64" cy="64" r="28" fill="#F5E6C4" ${t(4)}/>
    <path d="M64 40 L72 64 L64 88 L56 64Z" fill="url(#viola)" ${t(3.5)}/>
    <path d="M64 40 L72 64 L56 64Z" fill="#C8322A" ${t(3.5)}/>
    <circle cx="64" cy="64" r="4" fill="url(#ottone)" ${t(2.5)}/>
    <rect x="58" y="18" width="12" height="10" rx="3" fill="url(#ottone)" ${t(4)}/>
    ${scintilla(100, 30, 0.6)}${scintilla(24, 94, 0.5)}
    ${luce(50, 50, 6, 3)}`,
  kraken: `${ombraTerra(64, 114, 46)}
    <path d="M18 112 Q24 80 46 70 Q76 58 78 34 Q78 16 64 18 Q54 22 60 32 Q70 30 66 40 Q58 50 40 56 Q10 70 8 112Z" fill="url(#kraken)" ${T}/>
    <path d="M60 112 Q70 90 92 86 Q118 80 114 54 Q108 42 98 50 Q106 56 100 66 Q90 74 76 78 Q52 88 48 112Z" fill="url(#kraken)" ${T}/>
    ${[[26, 92], [36, 76], [52, 64], [68, 50], [62, 100], [78, 88], [96, 78]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="#FFD2E2" ${t(2.5)}/>`).join('')}
    <path d="M8 112 Q24 102 40 110 Q60 100 80 110 Q100 100 120 110 Q124 120 110 122 L18 122 Q4 120 8 112Z" fill="#2FB3C4" ${t(4)}/>
    ${luce(70, 28, 4, 8, 20)}`,
};

function svgIcona(id, dim = 128) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 128 128">${DEFS}<g filter="url(#grana)">${ICONE[id]}</g></svg>`;
}
async function icona(id) {
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgIcona(id));
  await img.decode();
  const c = tela(128, 128); c.getContext('2d').drawImage(img, 0, 0, 128, 128); return c;
}

window.pittoreKit = {
  pannelloCornice, pannelloLegno, pannelloPergamena, pulsanteLegno, pulsanteOro, corniceTonda, sfondoMenu, icona,
  idIcone: Object.keys(ICONE),
};
