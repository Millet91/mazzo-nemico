// Pittore del terreno (gira in Chromium headless, Canvas 2D). Entra la maschera dei materiali (R = materiale × 40,
// alfa = solido), esce il quadro 2048×1024 con alfa = maschera: quello che si vede è esattamente quello che si colpisce.
// Stile 03 §1: cartoon 2.5D, 3 toni, luce calda da sinistra in alto, ombre blu-viola, contorno scuro solo fuori.
/* eslint-disable */
(function () {
  const ARIA = 0, SABBIA = 1, TERRA = 2, LEGNO = 3, ROCCIA = 4, FERRO = 6;

  function rng(seme) { let s = seme >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // rumore di valore 2D liscio
  function rumore(seme) {
    const P = new Float32Array(512 * 512); const r = rng(seme); for (let i = 0; i < P.length; i++) P[i] = r();
    const f = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const g = (a, b) => P[((b & 511) << 9) | (a & 511)]; return (g(xi, yi) * (1 - u) + g(xi + 1, yi) * u) * (1 - v) + (g(xi, yi + 1) * (1 - u) + g(xi + 1, yi + 1) * u) * v; };
    return (x, y, sc) => f(x / sc, y / sc) * 0.6 + f(x / sc * 2.1 + 31, y / sc * 2.1 + 17) * 0.28 + f(x / sc * 4.3 + 7, y / sc * 4.3 + 3) * 0.12;
  }
  const hx = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  // box blur separabile su Float32Array (per occlusione e bordi)
  function sfoca(src, w, h, r) {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h), d = 2 * r + 1;
    for (let y = 0; y < h; y++) { let s = 0; const o = y * w; for (let x = -r; x <= r; x++) s += src[o + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) { tmp[o + x] = s / d; s += src[o + Math.min(w - 1, x + r + 1)] - src[o + Math.max(0, x - r)]; } }
    for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) { out[y * w + x] = s / d; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
    return out;
  }

  window.dipingiTerreno = function (img) {
    const W = img.width, H = img.height;
    const c0 = document.createElement('canvas'); c0.width = W; c0.height = H;
    const x0 = c0.getContext('2d'); x0.drawImage(img, 0, 0);
    const src = x0.getImageData(0, 0, W, H).data;
    const mat = new Uint8Array(W * H);
    const tag = new Uint8Array(W * H);   // G/50: 1 foglie, 2 edificio, 3 rovina, 4 ponte
    for (let i = 0; i < W * H; i++) { mat[i] = src[i * 4 + 3] > 127 ? Math.round(src[i * 4] / 40) : ARIA; tag[i] = Math.round(src[i * 4 + 1] / 50); }
    // il "terreno" vero: senza torri, ponti e cespugli (servono a strati, erba e grotte)
    const terra = (i) => mat[i] !== ARIA && (tag[i] === 0 || tag[i] === 3);

    // superficie (prima quota solida dall'alto) e profondità sotto la superficie della colonna
    const sup = new Int32Array(W).fill(H);
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (terra(y * W + x)) { sup[x] = y; break; }
    // superficie "di fondo" senza le sporgenze strette (rovina, prua del relitto): serve agli strati
    const sup2 = new Int32Array(W);
    for (let x = 0; x < W; x++) { let v = 0; for (let k = -22; k <= 22; k++) v = Math.max(v, Math.min(sup[Math.max(0, Math.min(W - 1, x + k))], 1000)); sup2[x] = Math.min(v, sup[x] + 60); }
    // pendenza della superficie (per la luce da sinistra in alto)
    const pend = new Float32Array(W);
    for (let x = 2; x < W - 2; x++) pend[x] = (sup[x + 2] - sup[x - 2]) / 4;
    // aria "coperta" (grotte, arco, ventre del relitto): ha terreno sopra nella sua colonna
    const coperta = new Float32Array(W * H), ariaF = new Float32Array(W * H);
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) { const i = y * W + x; if (!mat[i]) ariaF[i] = 1; }
    // aria coperta = una grotta vera: terreno sopra e sotto nella colonna, entro 130 px (non il vuoto sotto i balconi)
    for (let x = 0; x < W; x++) {
      let sopra = -1e9;
      for (let y = 0; y < H; y++) {
        const i = y * W + x;
        if (terra(i)) { sopra = y; continue; }
        if (mat[i] || y < sup[x] || y - sopra > 130) continue;
        let sotto = y; while (sotto < H && !terra(sotto * W + x) && sotto - sopra <= 130) sotto++;
        if (sotto < H && terra(sotto * W + x)) for (let k = y; k < sotto; k++) if (!mat[k * W + x]) coperta[k * W + x] = 1;
        y = sotto - 1;
      }
    }
    const ao = sfoca(sfoca(coperta, W, H, 10), W, H, 8);
    const copM = sfoca(sfoca(coperta, W, H, 26), W, H, 18);
    const bordo = sfoca(ariaF, W, H, 2);       // vicino all'aria (contorno)
    const luceBordo = sfoca(ariaF, W, H, 7);   // fascia di luce sotto la superficie
    const vol = sfoca(sfoca(ariaF, W, H, 18), W, H, 18);   // per il volume: verso dove c'è aria

    const n1 = rumore(11), n2 = rumore(23), n3 = rumore(37);
    const C = {
      sabbia: hx('#F4D58D'), sabbiaL: hx('#FFEBB5'), sabbiaO: hx('#D9A86A'),
      terra1: hx('#B9774A'), terra2: hx('#8A5A3A'), terra3: hx('#5A3B28'), terraO: hx('#4A3048'),
      roccia1: hx('#E2BE8E'), roccia2: hx('#B9906C'), roccia3: hx('#7E6658'), rocciaO: hx('#5E4A4A'),
      legno1: hx('#9A5E34'), legno2: hx('#6B3E22'), ferro: hx('#3E4656'),
      foglia1: hx('#7FD255'), foglia2: hx('#3F8A3A'), foglia3: hx('#25603A'),
      viola: hx('#3A2A55'), caldo: hx('#FFD9A0'), contorno: hx('#2A1A12'),
    };
    const out = x0.createImageData(W, H), o = out.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, m = mat[i];
      if (!m) continue;
      const d = y - Math.max(sup[x], sup2[x] - 10);
      const nn = n1(x, y, 90), fine = n2(x, y, 9), gr = n3(x, y, 3);
      let c;
      if (tag[i] === 1) {
        // cespuglio: ciuffi di foglie (macchie di rumore), più chiaro in alto a sinistra
        const f = n2(x * 1.6, y * 1.6, 7), ff = n3(x, y, 4);
        c = f > 0.62 ? C.foglia1 : f > 0.4 ? mix(C.foglia1, C.foglia2, 0.6) : C.foglia2;
        if (ff < 0.18) c = mix(c, C.foglia3, 0.6);
      } else if (m === SABBIA) {
        c = mix(C.sabbia, C.sabbiaO, Math.min(1, d / 40) * 0.6 + (nn - 0.5) * 0.5);
        if (fine > 0.72) c = mix(c, C.sabbiaL, 0.5);
      } else if (m === TERRA) {
        // strati ondulati che seguono la superficie
        const strato = (d + (nn - 0.5) * 40 + Math.sin(x / 70) * 6) / 34;
        const fascia = Math.floor(strato) % 3;
        const t = Math.min(1, Math.max(0, (d - 20) / 380));
        c = t < 0.5 ? mix(C.terra1, C.terra2, t * 2) : mix(C.terra2, C.terra3, (t - 0.5) * 2);
        c = mix(c, fascia === 0 ? C.terra1 : fascia === 1 ? c : C.terra3, 0.18);
        if ((strato % 1) < 0.06) c = mix(c, C.terra3, 0.35);   // linea tra gli strati
        if (fine > 0.74) c = mix(c, C.terra3, 0.3);
      } else if (m === ROCCIA) {
        // arenaria calda in alto, basalto freddo in basso; strati diagonali e crepe
        const t = Math.min(1, Math.max(0, (y - 300) / 620));
        c = t < 0.45 ? mix(C.roccia1, C.roccia2, t / 0.45) : mix(C.roccia2, C.roccia3, (t - 0.45) / 0.55);
        const st = ((y + x * 0.18 + (nn - 0.5) * 60) / 26);
        if ((st % 1) < 0.06) c = mix(c, C.rocciaO, 0.22);
        if (Math.floor(st) % 2) c = mix(c, C.roccia1, 0.08);
        const crepa = Math.abs(n2(x * 0.5, y * 2.2, 40) - 0.5);
        if (crepa < 0.012) c = mix(c, C.rocciaO, 0.6);
      } else if (m === LEGNO && tag[i] === 2) {
        // torri: tavole verticali con chiodi
        const asse = x / 7;
        c = mix(C.legno1, C.legno2, (Math.floor(asse) % 2) * 0.3 + (nn - 0.5) * 0.4);
        if ((asse % 1) < 0.15) c = mix(c, C.legno2, 0.75);
        if (n2(x * 3, y * 0.3, 6) > 0.72) c = mix(c, C.legno2, 0.25);
      } else if (m === LEGNO && tag[i] === 4) {
        // ponte di corda: assi corte affiancate
        const asse = x / 6;
        c = mix(hx('#B07A48'), C.legno2, (Math.floor(asse) % 2) * 0.3 + (nn - 0.5) * 0.3);
        if ((asse % 1) < 0.18) c = mix(c, C.contorno, 0.5);
      } else if (m === LEGNO) {
        // assi: righe ogni 13 px inclinate come lo scafo, venature
        const asse = (y + x * 0.58) / 13;
        c = mix(C.legno1, C.legno2, (Math.floor(asse) % 2) * 0.35 + (nn - 0.5) * 0.4);
        if ((asse % 1) < 0.12) c = mix(c, C.legno2, 0.7);
        if (n2(x * 0.3, y * 3, 6) > 0.7) c = mix(c, C.legno2, 0.25);
      } else c = C.ferro;
      // grana
      const g = (gr - 0.5) * 14;
      let r = c[0] + g, gg = c[1] + g, b = c[2] + g;
      // luce calda dall'alto a sinistra: fascia sotto la superficie, più forte sui pendii che guardano a sinistra
      const vicino = luceBordo[i];
      if (vicino > 0.02 && d < 40) {
        const verso = Math.max(-1, Math.min(1, pend[x] * 0.8));   // >0 = la superficie scende verso destra → guarda a sinistra?
        const lum = vicino * (0.55 - verso * 0.45);
        if (lum > 0) { r += (C.caldo[0] - r) * lum * 0.55; gg += (C.caldo[1] - gg) * lum * 0.55; b += (C.caldo[2] - b) * lum * 0.4; }
        else { r += (C.viola[0] - r) * -lum * 0.4; gg += (C.viola[1] - gg) * -lum * 0.4; b += (C.viola[2] - b) * -lum * 0.4; }
      }
      // volume 2.5D: la luce viene da sinistra in alto, il lato verso destra/in basso va in ombra fredda
      if (x > 1 && y > 1 && x < W - 2 && y < H - 2) {
        const gx = vol[i + 2] - vol[i - 2], gy = vol[i + 2 * W] - vol[i - 2 * W];
        const l = (-gx * 0.72 - gy * 0.69) * 9;   // >0 = guarda la luce
        if (l > 0) { const t = Math.min(0.35, l); r += (C.caldo[0] - r) * t; gg += (C.caldo[1] - gg) * t; b += (C.caldo[2] - b) * t * 0.7; }
        else { const t = Math.min(0.4, -l); r += (C.viola[0] - r) * t; gg += (C.viola[1] - gg) * t; b += (C.viola[2] - b) * t; }
      }
      // occlusione blu-viola attorno a grotte e arco
      const a = Math.min(1, ao[i] * 2.4);
      if (a > 0) { r += (C.viola[0] - r) * a * 0.55; gg += (C.viola[1] - gg) * a * 0.55; b += (C.viola[2] - b) * a * 0.5; }
      // profondità: sotto y 760 il terreno si raffredda (va verso il mare)
      if (y > 860) { const t = Math.min(1, (y - 860) / 140) * 0.25; r += (C.viola[0] - r) * t; gg += (C.viola[1] - gg) * t; b += (C.viola[2] - b) * t; }
      o[i * 4] = r; o[i * 4 + 1] = gg; o[i * 4 + 2] = b; o[i * 4 + 3] = 255;
    }
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.putImageData(out, 0, 0);
    const R = rng(7);
    const solido = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mat[(y | 0) * W + (x | 0)] !== ARIA;
    const materiale = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? mat[(y | 0) * W + (x | 0)] : 0);
    const dentro = (x, y, r) => solido(x, y) && solido(x - r, y) && solido(x + r, y) && solido(x, y - r) && solido(x, y + r);

    // ── dettagli nel terreno ──
    function sasso(x, y, r, col, ombra) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3);
      ctx.fillStyle = ombra; ctx.beginPath(); ctx.ellipse(1.5, 2, r, r * 0.7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,210,0.45)'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.25, r * 0.4, r * 0.22, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    for (let k = 0; k < 900; k++) {
      const x = 70 + R() * (W - 140), y = 200 + R() * 780;
      const m = materiale(x, y); if (!dentro(x, y, 8)) continue;
      const d = y - sup[x | 0];
      if (m === TERRA && d > 30) sasso(x, y, 2 + R() * 5, R() < 0.5 ? '#9C8270' : '#B08A66', 'rgba(50,30,50,0.45)');
      else if (m === ROCCIA && R() < 0.35) sasso(x, y, 3 + R() * 6, '#B9A08A', 'rgba(60,50,80,0.5)');
      else if (m === SABBIA && R() < 0.4) { // conchigliette
        ctx.fillStyle = R() < 0.5 ? '#FFD6C9' : '#FFF4DC'; ctx.beginPath(); ctx.arc(x, y, 2 + R() * 2, Math.PI, 0); ctx.fill();
      }
    }
    // radici che scendono dall'erba
    ctx.lineCap = 'round';
    for (let k = 0; k < 70; k++) {
      const x = 80 + R() * (W - 160); const s = sup[x | 0];
      if (s > 860 || Math.abs(pend[x | 0]) > 1 || materiale(x, s + 30) !== TERRA) continue;
      let px = x, py = s + 14, ang = Math.PI / 2 + (R() - 0.5) * 0.8; const lung = 18 + R() * 40;
      ctx.strokeStyle = 'rgba(92,60,38,0.75)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(px, py);
      for (let t = 0; t < lung; t += 4) { ang += (R() - 0.5) * 0.5; px += Math.cos(ang) * 4; py += Math.sin(ang) * 4; if (materiale(px, py + 4) !== TERRA) break; ctx.lineTo(px, py); }
      ctx.stroke();
    }
    // tesoro sepolto sotto la piana destra, scheletro di pesce a sinistra, ancora arrugginita, cristalli e ammonite nella roccia
    function forziere(x, y, s) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.12); ctx.scale(s, s);
      ctx.fillStyle = 'rgba(40,20,40,0.5)'; ctx.fillRect(-26, -12, 56, 34);
      ctx.fillStyle = '#7A4424'; ctx.fillRect(-28, -6, 56, 26); ctx.fillStyle = '#93552C';
      ctx.beginPath(); ctx.moveTo(-28, -6); ctx.quadraticCurveTo(0, -26, 28, -6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#E8B840'; ctx.fillRect(-28, -7, 56, 4); ctx.fillRect(-22, -6, 4, 26); ctx.fillRect(18, -6, 4, 26); ctx.fillRect(-4, -4, 8, 9);
      ctx.fillStyle = '#FFE27A'; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(-18 + k * 4.5, -14 + Math.sin(k) * 2, 3, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    function lisca(x, y, s) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(0.2); ctx.scale(s, s); ctx.strokeStyle = 'rgba(245,235,215,0.85)'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(26, 0); ctx.stroke();
      for (let k = -22; k < 20; k += 6) { ctx.beginPath(); ctx.moveTo(k, -9 + Math.abs(k) * 0.12); ctx.quadraticCurveTo(k + 3, 0, k, 9 - Math.abs(k) * 0.12); ctx.stroke(); }
      ctx.fillStyle = 'rgba(245,235,215,0.9)'; ctx.beginPath(); ctx.moveTo(26, -10); ctx.lineTo(40, 0); ctx.lineTo(26, 10); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-42, -10); ctx.lineTo(-38, 0); ctx.lineTo(-42, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4A3048'; ctx.beginPath(); ctx.arc(32, -2, 2, 0, 7); ctx.fill(); ctx.restore();
    }
    function ancora(x, y, s) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(0.5); ctx.scale(s, s);
      ctx.strokeStyle = '#5E3A2E'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(0, 26); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 4, 24, 0.25, Math.PI - 0.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14, -20); ctx.lineTo(14, -20); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -38, 6, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(200,110,60,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-2, -28); ctx.lineTo(-2, 20); ctx.stroke();
      ctx.restore();
    }
    function cristalli(x, y, s, col) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      for (const [dx, h, a] of [[-10, 26, -0.35], [0, 38, 0], [10, 22, 0.4], [-4, 16, -0.8]]) {
        ctx.save(); ctx.rotate(a); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(dx - 5, 0); ctx.lineTo(dx - 5, -h + 8); ctx.lineTo(dx, -h); ctx.lineTo(dx + 5, -h + 8); ctx.lineTo(dx + 5, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.moveTo(dx - 3, -2); ctx.lineTo(dx - 3, -h + 9); ctx.lineTo(dx, -h + 3); ctx.lineTo(dx, -2); ctx.fill(); ctx.restore();
      }
      const g = ctx.createRadialGradient(0, -14, 2, 0, -14, 40); g.addColorStop(0, 'rgba(180,240,255,0.35)'); g.addColorStop(1, 'rgba(180,240,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -14, 40, 0, 7); ctx.fill(); ctx.restore();
    }
    function ammonite(x, y, s) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = 'rgba(240,220,190,0.75)'; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let t = 0; t < 14; t += 0.1) { const r = 1.5 * Math.exp(t * 0.19); ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r); } ctx.stroke();
      for (let t = 2; t < 14; t += 0.7) { const r = 1.5 * Math.exp(t * 0.19), r2 = r * 0.7; ctx.beginPath(); ctx.moveTo(Math.cos(t) * r, Math.sin(t) * r); ctx.lineTo(Math.cos(t) * r2, Math.sin(t) * r2); ctx.stroke(); }
      ctx.restore();
    }
    function teschio(x, y, s) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.3); ctx.scale(s, s); ctx.fillStyle = '#F2E8D5';
      ctx.beginPath(); ctx.arc(0, 0, 10, Math.PI, 0); ctx.lineTo(7, 8); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3A2A3A'; ctx.beginPath(); ctx.arc(-4, 0, 3, 0, 7); ctx.arc(4, 0, 3, 0, 7); ctx.fill(); ctx.fillRect(-3, 6, 1.5, 3); ctx.fillRect(1, 6, 1.5, 3);
      ctx.strokeStyle = '#F2E8D5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(14, 4); ctx.lineTo(34, 10); ctx.moveTo(14, 12); ctx.lineTo(32, 2); ctx.stroke(); ctx.restore();
    }
    // posizioni scelte su questa mappa (lontane dalla superficie)
    const metti = (f, x, y, ...a) => { if (dentro(x, y, 14)) f(x, y, ...a); };
    metti(forziere, 1640, 905, 1.1); metti(lisca, 430, 905, 1); metti(ancora, 700, 900, 0.9);
    metti(teschio, 1720, 860, 0.9); metti(teschio, 300, 900, 0.7);
    metti(cristalli, 1030, 930, 1.1, '#7FD8F0'); metti(cristalli, 1180, 890, 0.8, '#C49BFF'); metti(cristalli, 880, 935, 0.7, '#7FD8F0');
    metti(ammonite, 1000, 560, 1.4); metti(ammonite, 1120, 820, 1); metti(ammonite, 1520, 960, 0.9);
    // muschio e piccole sporgenze sulla Rocca
    for (let k = 0; k < 60; k++) {
      const x = 900 + R() * 330; const s = sup[x | 0]; if (s > 700 || s < 280) continue;
      ctx.fillStyle = R() < 0.5 ? 'rgba(108,194,74,0.85)' : 'rgba(80,160,70,0.85)';
      ctx.beginPath(); ctx.ellipse(x, s + 10 + R() * 30, 6 + R() * 8, 3 + R() * 3, 0, 0, 7); ctx.fill();
    }

    // ── erba sul bordo (sabbia e terra in piano o in pendenza dolce; niente erba sulle pareti ripide) ──
    for (let x = 64; x < W - 64; x++) {
      const s = sup[x]; if (s >= 948) continue;
      const m = materiale(x, s + 2); if (m !== SABBIA && m !== TERRA) continue;
      const ripida = Math.abs(pend[x]) > 1.4; if (ripida) continue;
      const spiaggia = s > 860;  // vicino al mare: sabbia senza erba
      if (spiaggia) continue;
      const spess = 7 + n1(x, 0, 18) * 7;
      const g = ctx.createLinearGradient(0, s, 0, s + spess);
      g.addColorStop(0, '#B6EC74'); g.addColorStop(0.35, '#7FD255'); g.addColorStop(1, '#4E9E3C');
      ctx.fillStyle = g; ctx.fillRect(x, s, 1, spess);
      // ciuffi che pendono sulla terra
      if (n2(x, 5, 4) > 0.62) { ctx.fillStyle = '#4E9E3C'; ctx.fillRect(x, s + spess, 1, 3 + n3(x, 1, 2) * 6); }
    }
    // fiorellini e margherite sull'erba
    for (let k = 0; k < 160; k++) {
      const x = 80 + R() * (W - 160), s = sup[x | 0];
      if (s > 860 || Math.abs(pend[x | 0]) > 1.2 || materiale(x, s + 2) === ROCCIA || materiale(x, s + 2) === LEGNO) continue;
      ctx.fillStyle = ['#FF6B8B', '#FFF1A8', '#FFFFFF', '#FFB0E0', '#FFD23F'][k % 5];
      ctx.beginPath(); ctx.arc(x, s + 3 + R() * 3, 1.6 + R() * 1.2, 0, 7); ctx.fill();
    }

    // ── relitto: fasciame, oblò, cirripedi ──
    ctx.save();
    for (let k = 0; k < 40; k++) {
      const x = 100 + R() * 200, y = 780 + R() * 170; if (materiale(x, y) !== LEGNO || !dentro(x, y, 4)) continue;
      ctx.fillStyle = 'rgba(235,225,200,0.8)'; ctx.beginPath(); ctx.arc(x, y, 1.5 + R() * 2, 0, 7); ctx.fill();
    }
    for (const [x, y] of [[170, 878], [228, 846]]) if (dentro(x, y, 10)) {
      ctx.fillStyle = '#C9A04A'; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill();
      ctx.fillStyle = '#1E2A3A'; ctx.beginPath(); ctx.arc(x, y, 6.5, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(150,220,255,0.5)'; ctx.beginPath(); ctx.arc(x - 2, y - 2, 2.5, 0, 7); ctx.fill();
    }
    ctx.restore();
    // ── rovina: muro di blocchi di pietra (colonne dove la superficie sporge sopra quella di fondo) ──
    for (let x = 0; x < W; x++) {
      if (tag[(sup[x] + 2) * W + x] !== 3) continue;
      for (let y = sup[x]; y < H && tag[y * W + x] === 3; y++) {
        const riga = Math.floor((y - sup[x]) / 12), ox = (riga % 2) * 7;
        const giunto = (y - sup[x]) % 12 === 0 || (x + ox) % 15 === 0;
        const k = (y * W + x) * 4;
        void k;
        ctx.fillStyle = giunto ? 'rgba(60,50,62,0.75)' : `rgba(${200 + riga * 3},${185 + riga * 2},${165},1)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // ── contorno scuro sulla sagoma esterna e ritaglio alla maschera ──
    const fin = ctx.getImageData(0, 0, W, H), f = fin.data;
    for (let i = 0; i < W * H; i++) {
      if (!mat[i]) {
        if (coperta[i]) {
          // parete in fondo a grotte e arco: alfa 110 (sotto 128 resta aria per la maschera), colori scuri e freddi
          const y = (i / W) | 0, x = i - y * W, t = Math.min(1, ao[i] * 1.6);
          const base = y < 760 ? [96, 78, 92] : [74, 52, 58], nn = n1(x, y, 30);
          f[i * 4] = base[0] * (0.7 + nn * 0.5) * (1 - t * 0.35); f[i * 4 + 1] = base[1] * (0.7 + nn * 0.5) * (1 - t * 0.35); f[i * 4 + 2] = base[2] * (0.75 + nn * 0.5) * (1 - t * 0.2) + 10;
          f[i * 4 + 3] = Math.round(110 * Math.min(1, copM[i] * 1.8));   // sfuma dove la grotta si apre sull'aria libera
        } else { f[i * 4 + 3] = 0; f[i * 4] = f[i * 4 + 1] = f[i * 4 + 2] = 0; }
        continue;
      }
      f[i * 4 + 3] = 255;
      const b = bordo[i];
      if (b > 0.05) { const t = Math.min(1, b * 3.2) * 0.85; f[i * 4] += (C.contorno[0] - f[i * 4]) * t; f[i * 4 + 1] += (C.contorno[1] - f[i * 4 + 1]) * t; f[i * 4 + 2] += (C.contorno[2] - f[i * 4 + 2]) * t; }
    }
    ctx.putImageData(fin, 0, 0);
    // funghetti luminosi sul pavimento delle grotte (alfa < 128: restano aria)
    ctx.globalAlpha = 0.43;
    for (let k = 0, messi = 0; k < 2000 && messi < 14; k++) {
      const x = 480 + R() * 1100, y = 820 + R() * 120, i = (y | 0) * W + (x | 0);
      if (!coperta[i] || !solido(x, y + 3) || x > 640 && x < 1380) continue;
      const g = ctx.createRadialGradient(x, y - 4, 1, x, y - 4, 16); g.addColorStop(0, 'rgba(140,255,220,0.9)'); g.addColorStop(1, 'rgba(140,255,220,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 4, 16, 0, 7); ctx.fill();
      ctx.fillStyle = '#E8FFF6'; ctx.fillRect(x - 1, y - 6, 2, 6); ctx.fillStyle = '#7CF5D2'; ctx.beginPath(); ctx.arc(x, y - 6, 4, Math.PI, 0); ctx.fill();
      messi++;
    }
    ctx.globalAlpha = 1;
    // l'aria resta aria: alfa delle grotte riportato sotto 128
    const ult = ctx.getImageData(0, 0, W, H), u = ult.data;
    for (let i = 0; i < W * H; i++) if (!mat[i] && u[i * 4 + 3] > 110) u[i * 4 + 3] = 110;
    ctx.putImageData(ult, 0, 0);
    return c.toDataURL('image/png');
  };
})();
