// Pittore del terreno (gira in Chromium headless, Canvas 2D). Entra la maschera dei materiali (R = materiale × 40,
// G = etichetta × 30, alfa = solido), esce il quadro con alfa = maschera: quello che si vede è esattamente quello che si colpisce.
// `scala` 1 = 2048×1024 (un pixel per unità di mondo). `scala` 2 = 4096×2048 per il terreno HD della Fase 2: la sagoma è
// la stessa maschera ingrandita con i bordi addolciti (scarto < 1 px di mondo), i motivi restano grandi uguali nel mondo
// e la grana è fatta sui pixel fini. Tutte le misure qui sotto sono in px di mondo: `S` le porta sui pixel del quadro.
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

  window.dipingiTerreno = function (img, scala) {
    const S = scala === 2 ? 2 : 1;
    const w0 = img.width, h0 = img.height, W = w0 * S, H = h0 * S;
    const c0 = document.createElement('canvas'); c0.width = w0; c0.height = h0;
    const x0 = c0.getContext('2d'); x0.drawImage(img, 0, 0);
    const src = x0.getImageData(0, 0, w0, h0).data;
    const mat0 = new Uint8Array(w0 * h0);
    const tag0 = new Uint8Array(w0 * h0);   // G/30: 1 foglie, 2 edificio, 3 pietra (muretti, rovina), 4 ponte, 5 molo, 6 cassa
    for (let i = 0; i < w0 * h0; i++) { mat0[i] = src[i * 4 + 3] > 127 ? Math.round(src[i * 4] / 40) : ARIA; tag0[i] = Math.round(src[i * 4 + 1] / 30); }
    let mat = mat0, tag = tag0;
    if (S > 1) {
      // sagoma ingrandita: solido dove la maschera interpolata supera la metà (i gradini diventano smussi a 45°);
      // materiale ed etichetta dal pixel pieno più vicino
      mat = new Uint8Array(W * H); tag = new Uint8Array(W * H);
      const pieno = (x, y) => (x >= 0 && y >= 0 && x < w0 && y < h0 && mat0[y * w0 + x] ? 1 : 0);
      // la maschera 1× sfocata appena (raggio 1 px di mondo, due passate) toglie i gradini dalle curve: la sagoma HD
      // resta entro mezzo px di mondo dalla maschera, e l'arte sborda comunque oltre (tessere HD, scripts/mappe/tessere-hd.py)
      const m1 = new Float32Array(w0 * h0); for (let i = 0; i < w0 * h0; i++) m1[i] = mat0[i] ? 1 : 0;
      const liscia = sfoca(sfoca(m1, w0, h0, 1), w0, h0, 1);
      const pienoF = (x, y) => (x >= 0 && y >= 0 && x < w0 && y < h0 ? liscia[y * w0 + x] : 0);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const fx = (x + 0.5) / S - 0.5, fy = (y + 0.5) / S - 0.5, xi = Math.floor(fx), yi = Math.floor(fy), u = fx - xi, v = fy - yi;
        const a = pienoF(xi, yi), b = pienoF(xi + 1, yi), c = pienoF(xi, yi + 1), d = pienoF(xi + 1, yi + 1);
        if ((a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v < 0.5) continue;
        const nx = u < 0.5 ? xi : xi + 1, ny = v < 0.5 ? yi : yi + 1;
        let j = -1;
        for (const [qx, qy] of [[nx, ny], [nx === xi ? xi + 1 : xi, ny], [nx, ny === yi ? yi + 1 : yi], [nx === xi ? xi + 1 : xi, ny === yi ? yi + 1 : yi]]) if (pieno(qx, qy)) { j = qy * w0 + qx; break; }
        if (j < 0) continue;
        mat[y * W + x] = mat0[j]; tag[y * W + x] = tag0[j];
      }
    }
    const x0b = S > 1 ? (() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c.getContext('2d'); })() : x0;
    // il "terreno" vero: senza torri, ponti e cespugli (servono a strati, erba e grotte)
    const terra = (i) => mat[i] !== ARIA && (tag[i] === 0 || tag[i] === 3);

    // superficie (prima quota solida dall'alto) e profondità sotto la superficie della colonna
    const sup = new Int32Array(W).fill(H);
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (terra(y * W + x)) { sup[x] = y; break; }
    // superficie "di fondo" senza le sporgenze strette (rovina, prua del relitto): serve agli strati
    const sup2 = new Int32Array(W);
    for (let x = 0; x < W; x++) { let v = 0; for (let k = -22 * S; k <= 22 * S; k++) v = Math.max(v, Math.min(sup[Math.max(0, Math.min(W - 1, x + k))], 1000 * S)); sup2[x] = Math.min(v, sup[x] + 60 * S); }
    // pendenza della superficie (per la luce da sinistra in alto)
    const pend = new Float32Array(W);
    for (let x = 2 * S; x < W - 2 * S; x++) pend[x] = (sup[x + 2 * S] - sup[x - 2 * S]) / (4 * S);
    // aria "coperta" (grotte, arco, ventre del relitto): ha terreno sopra nella sua colonna
    const coperta = new Float32Array(W * H), ariaF = new Float32Array(W * H);
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) { const i = y * W + x; if (!mat[i]) ariaF[i] = 1; }
    // aria coperta = una grotta vera: terreno sopra e sotto nella colonna, entro 130 px (non il vuoto sotto i balconi)
    for (let x = 0; x < W; x++) {
      let sopra = -1e9;
      for (let y = 0; y < H; y++) {
        const i = y * W + x;
        if (terra(i)) { sopra = y; continue; }
        if (mat[i] || y < sup[x] || y - sopra > 130 * S) continue;
        let sotto = y; while (sotto < H && !terra(sotto * W + x) && sotto - sopra <= 130 * S) sotto++;
        if (sotto < H && terra(sotto * W + x)) for (let k = y; k < sotto; k++) if (!mat[k * W + x]) coperta[k * W + x] = 1;
        y = sotto - 1;
      }
    }
    if (S > 1) {
      // In HD la grotta vera si riconosce coi raggi: dall'aria si cerca il terreno in 8 direzioni entro 160 px di mondo.
      // Coperta = terreno sopra, sotto e nelle due diagonali alte, e almeno 6 direzioni su 8 chiuse. Così niente
      // rettangoli di parete scura sotto i tetti e le sporgenze (sembravano appesi nel cielo), e la parete sfuma alle bocche.
      coperta.fill(0);
      const LIM = 160 * S, terraA = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) terraA[i] = terra(i) ? 1 : 0;
      const raggio = (dx, dy) => {
        const dist = new Uint16Array(W * H), cap = LIM + 1;
        const ys = dy > 0 ? [H - 1, -1, -1] : [0, H, 1], xs = dx > 0 ? [W - 1, -1, -1] : [0, W, 1];
        for (let y = ys[0]; y !== ys[1]; y += ys[2]) for (let x = xs[0]; x !== xs[1]; x += xs[2]) {
          const qx = x + dx, qy = y + dy;
          if (qx < 0 || qy < 0 || qx >= W || qy >= H) { dist[y * W + x] = cap; continue; }
          const q = qy * W + qx;
          dist[y * W + x] = terraA[q] ? 1 : Math.min(cap, dist[q] + 1);
        }
        return dist;
      };
      const dirs = [[0, -1], [-1, -1], [1, -1], [0, 1], [-1, 0], [1, 0], [-1, 1], [1, 1]].map(([dx, dy]) => raggio(dx, dy));
      for (let i = 0; i < W * H; i++) {
        if (mat[i] || i < 160 * S * W) continue;
        if (dirs[0][i] > LIM || dirs[1][i] > LIM || dirs[2][i] > LIM || dirs[3][i] > LIM) continue;
        let n = 4; for (let k = 4; k < 8; k++) if (dirs[k][i] <= LIM) n++;
        if (n >= 6) coperta[i] = 1;
      }
    }
    const ao = sfoca(sfoca(coperta, W, H, 10 * S), W, H, 8 * S);
    const copM = sfoca(sfoca(coperta, W, H, 26 * S), W, H, 18 * S);
    // in HD la parete in fondo sfuma piano verso le bocche: sfocatura larga in orizzontale, corta in verticale
    const sfocaX = (src, r) => { const out = new Float32Array(W * H), d = 2 * r + 1;
      for (let y = 0; y < H; y++) { let t = 0; const o = y * W; for (let x = -r; x <= r; x++) t += src[o + Math.min(W - 1, Math.max(0, x))];
        for (let x = 0; x < W; x++) { out[o + x] = t / d; t += src[o + Math.min(W - 1, x + r + 1)] - src[o + Math.max(0, x - r)]; } }
      return out; };
    const copB = S > 1 ? sfoca(sfocaX(sfocaX(coperta, 30 * S), 30 * S), W, H, 4 * S) : copM;
    const bordo = sfoca(ariaF, W, H, 2 * S);       // vicino all'aria (contorno)
    const luceBordo = sfoca(ariaF, W, H, 7 * S);   // fascia di luce sotto la superficie
    const vol = sfoca(sfoca(ariaF, W, H, 18 * S), W, H, 18 * S);   // per il volume: verso dove c'è aria

    // ── ombre portate dipinte (solo HD): la luce viene da sinistra in alto; un pixel pieno vicino alla superficie è in
    // ombra se, andando verso la luce, dopo l'aria si ritrova del pieno entro 90 px di mondo (sotto tetti, balconi, ponti,
    // cengie, nell'arco e nelle bocche delle gallerie). L'ombra ha il bordo netto, come pennellata, con una fascia sfumata
    // di 1 px di mondo.
    const ombraP = new Float32Array(W * H);
    if (S > 1) {
      const lx = -0.55, ly = -1, ll = Math.hypot(lx, ly), sx = lx / ll, sy = ly / ll, passi = 90 * S;
      for (let yq = 160 * S; yq < H; yq++) for (let xq = 0; xq < W; xq++) {
        const i = yq * W + xq;
        if (!mat[i] || luceBordo[i] < 0.01) continue;
        let fuoriAria = false, colpito = false;
        for (let k = 1; k <= passi; k++) {
          const px = Math.round(xq + sx * k), py = Math.round(yq + sy * k);
          if (px < 0 || py < 0 || px >= W) break;
          const pieno = mat[py * W + px] !== ARIA;
          if (!fuoriAria) { if (!pieno) fuoriAria = true; else if (k > 6 * S) break; continue; }
          if (pieno) { colpito = k > 2 * S; break; }
        }
        if (colpito) ombraP[i] = 1;
      }
    }
    const ombraS = S > 1 ? sfoca(ombraP, W, H, S) : ombraP;

    const n1 = rumore(11), n2 = rumore(23), n3 = rumore(37);
    const C = {
      sabbia: hx('#F4D58D'), sabbiaL: hx('#FFEBB5'), sabbiaO: hx('#D9A86A'),
      terra1: hx('#B9774A'), terra2: hx('#8A5A3A'), terra3: hx('#5A3B28'), terraO: hx('#4A3048'),
      roccia1: hx('#E2BE8E'), roccia2: hx('#B9906C'), roccia3: hx('#7E6658'), rocciaO: hx('#5E4A4A'),
      legno1: hx('#9A5E34'), legno2: hx('#6B3E22'), ferro: hx('#3E4656'),
      foglia1: hx('#7FD255'), foglia2: hx('#3F8A3A'), foglia3: hx('#25603A'),
      viola: hx('#3A2A55'), caldo: hx('#FFD9A0'), contorno: hx('#2A1A12'), contornoHD: hx('#5A2E16'),
    };
    const out = x0b.createImageData(W, H), o = out.data;
    for (let yq = 0; yq < H; yq++) for (let xq = 0; xq < W; xq++) {
      const i = yq * W + xq, m = mat[i];
      if (!m) continue;
      // x, y, d: px di mondo (anche con la virgola a scala 2); xq, yq: pixel del quadro
      const x = xq / S, y = yq / S;
      const d = (yq - Math.max(sup[xq], sup2[xq] - 10 * S)) / S;
      const nn = n1(x, y, 90), fine = S > 1 ? n2(x, y, 9) * 0.6 + n2(xq + 400, yq + 90, 9) * 0.4 : n2(x, y, 9), gr = n3(xq, yq, 3);
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
      } else if (m === LEGNO && tag[i] === 5) {
        // molo: tavolato chiaro con le fughe scure (si cammina sopra) e pali scuri che scendono in acqua
        const tavolato = tag[i - 9 * S] === 5 && tag[i + 9 * S] === 5 && (tag[i - 3 * S * W] === 5 || tag[i - 3 * S * W] === 0 && y < 900);
        if (tavolato) {
          let su = 0; while (tag[i - (su + 1) * W] === 5) su++; su /= S;
          c = mix(hx('#E9C48A'), hx('#C9965E'), Math.min(1, su / 12) + (nn - 0.5) * 0.3);
          if (x % 16 < 2) c = mix(c, hx('#4A2E1A'), 0.85);          // fuga tra un'asse e l'altra
          if (su < 2) c = mix(c, hx('#FFF0C8'), 0.6);              // bordo di luce in cima
          if (su >= 6 && su < 7) c = mix(c, hx('#8A5A34'), 0.5);            // linea della trave
        } else {
          c = mix(hx('#7A4A2A'), hx('#4A2E1A'), (x % 8) / 10 + (nn - 0.5) * 0.3);
          if (y % 22 < 2) c = mix(c, hx('#3A2414'), 0.6);          // anelli del palo
          if (y > 946) c = mix(c, hx('#2F4A3A'), Math.min(0.7, (y - 946) / 30));   // bagnato e alghe sotto il pelo dell'acqua
        }
      } else if (m === LEGNO && tag[i] === 4) {
        // ponte di corda: assi corte affiancate
        const asse = x / 6;
        c = mix(hx('#B07A48'), C.legno2, (Math.floor(asse) % 2) * 0.3 + (nn - 0.5) * 0.3);
        if ((asse % 1) < 0.18) c = mix(c, C.contorno, 0.5);
      } else if (m === LEGNO && tag[i] === 6) {
        // cassa: tavole orizzontali chiare, cornice scura e traversa in diagonale
        let sx = 0; while (sx < 40 * S && tag[i - (sx + 1)] === 6) sx++;
        let dx = 0; while (dx < 40 * S && tag[i + dx + 1] === 6) dx++;
        let su = 0; while (su < 40 * S && tag[i - (su + 1) * W] === 6) su++;
        let giu = 0; while (giu < 40 * S && tag[i + (giu + 1) * W] === 6) giu++;
        const lw = (sx + dx + 1) / S, lh = (su + giu + 1) / S, u = sx / S, v = su / S;
        c = mix(hx('#D9A766'), hx('#B07A48'), (Math.floor(v / 7) % 2) * 0.35 + (nn - 0.5) * 0.3);
        if (v % 7 < 1) c = mix(c, C.legno2, 0.6);
        if (Math.abs(u / lw - v / lh) < 0.09) c = mix(hx('#8A5A34'), C.legno2, 0.2);            // traversa
        if (u < 3.5 || u > lw - 4.5 || v < 3.5 || v > lh - 4.5) c = mix(hx('#7A4A2A'), C.legno2, 0.3);   // cornice
        if ((u < 3.5 || u > lw - 4.5) && (v < 3.5 || v > lh - 4.5)) c = hx('#C9A04A');           // borchie agli angoli
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
        const verso = Math.max(-1, Math.min(1, pend[xq] * 0.8));   // >0 = la superficie scende verso destra → guarda a sinistra?
        const lum = vicino * (0.55 - verso * 0.45);
        if (lum > 0) { r += (C.caldo[0] - r) * lum * 0.55; gg += (C.caldo[1] - gg) * lum * 0.55; b += (C.caldo[2] - b) * lum * 0.4; }
        else { r += (C.viola[0] - r) * -lum * 0.4; gg += (C.viola[1] - gg) * -lum * 0.4; b += (C.viola[2] - b) * -lum * 0.4; }
      }
      // volume 2.5D: la luce viene da sinistra in alto, il lato verso destra/in basso va in ombra fredda
      if (xq > 2 * S && yq > 2 * S && xq < W - 2 * S - 1 && yq < H - 2 * S - 1) {
        const gx = vol[i + 2 * S] - vol[i - 2 * S], gy = vol[i + 2 * S * W] - vol[i - 2 * S * W];
        let l = (-gx * 0.72 - gy * 0.69) * 9;   // >0 = guarda la luce
        // in HD toni a gradini (3 toni del cartone dipinto), con un passaggio corto tra un tono e l'altro
        if (S > 1) { const q = Math.sign(l) * Math.min(2, Math.abs(l) / 0.12); l = Math.sign(q) * (Math.floor(Math.abs(q)) + Math.max(0, (Math.abs(q) % 1) - 0.8) * 5) * 0.17; }
        if (l > 0) { const t = Math.min(0.35, l); r += (C.caldo[0] - r) * t; gg += (C.caldo[1] - gg) * t; b += (C.caldo[2] - b) * t * 0.7; }
        else { const t = Math.min(0.4, -l); r += (C.viola[0] - r) * t; gg += (C.viola[1] - gg) * t; b += (C.viola[2] - b) * t; }
      }
      // ombra portata dipinta
      if (ombraS[i] > 0.02) { const t = Math.min(1, ombraS[i]) * 0.42; r += (C.viola[0] - r) * t; gg += (C.viola[1] - gg) * t; b += (C.viola[2] - b) * t * 0.9; }
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
    ctx.setTransform(S, 0, 0, S, 0, 0);   // da qui si disegna in px di mondo
    const R = rng(7);
    const iq = (x, y) => ((y * S) | 0) * W + ((x * S) | 0);
    const fuori = (x, y) => !(x >= 0 && y >= 0 && x * S < W && y * S < H);
    const solido = (x, y) => !fuori(x, y) && mat[iq(x, y)] !== ARIA;
    const materiale = (x, y) => (fuori(x, y) ? 0 : mat[iq(x, y)]);
    /** superficie e pendenza in px di mondo, alla colonna di mondo x */
    const supM = (x) => sup[Math.min(W - 1, Math.max(0, (x * S) | 0))] / S;
    const pendM = (x) => pend[Math.min(W - 1, Math.max(0, (x * S) | 0))];
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
      const x = 70 + R() * (w0 - 140), y = 200 + R() * 780;
      const m = materiale(x, y); if (!dentro(x, y, 8)) continue;
      const d = y - supM(x);
      if (m === TERRA && d > 30) sasso(x, y, 2 + R() * 5, R() < 0.5 ? '#9C8270' : '#B08A66', 'rgba(50,30,50,0.45)');
      else if (m === ROCCIA && R() < 0.35) sasso(x, y, 3 + R() * 6, '#B9A08A', 'rgba(60,50,80,0.5)');
      else if (m === SABBIA && R() < 0.4) { // conchigliette
        ctx.fillStyle = R() < 0.5 ? '#FFD6C9' : '#FFF4DC'; ctx.beginPath(); ctx.arc(x, y, 2 + R() * 2, Math.PI, 0); ctx.fill();
      }
    }
    // radici che scendono dall'erba
    ctx.lineCap = 'round';
    for (let k = 0; k < 70; k++) {
      const x = 80 + R() * (w0 - 160); const s = supM(x);
      if (s > 860 || Math.abs(pendM(x)) > 1 || materiale(x, s + 30) !== TERRA) continue;
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
      const x = 900 + R() * 330; const s = supM(x); if (s > 700 || s < 280) continue;
      ctx.fillStyle = R() < 0.5 ? 'rgba(108,194,74,0.85)' : 'rgba(80,160,70,0.85)';
      ctx.beginPath(); ctx.ellipse(x, s + 10 + R() * 30, 6 + R() * 8, 3 + R() * 3, 0, 0, 7); ctx.fill();
    }

    // ── erba sul bordo (sabbia e terra in piano o in pendenza dolce; niente erba sulle pareti ripide) ──
    for (let xq = 64 * S; xq < W - 64 * S; xq++) {
      const x = xq / S, s = sup[xq] / S; if (s >= 948) continue;
      const m = materiale(x, s + 2); if (m !== SABBIA && m !== TERRA) continue;
      const ripida = Math.abs(pend[xq]) > 1.4; if (ripida) continue;
      const spiaggia = s > 860;  // vicino al mare: sabbia senza erba
      if (spiaggia) continue;
      const spess = 7 + n1(x, 0, 18) * 7;
      const g = ctx.createLinearGradient(0, s, 0, s + spess);
      g.addColorStop(0, '#B6EC74'); g.addColorStop(0.35, '#7FD255'); g.addColorStop(1, '#4E9E3C');
      ctx.fillStyle = g; ctx.fillRect(x, s, 1 / S, spess);
      // ciuffi che pendono sulla terra
      if (n2(xq, 5, 4) > 0.62) { ctx.fillStyle = '#4E9E3C'; ctx.fillRect(x, s + spess, 1 / S, 3 + n3(xq, 1, 2) * 6); }
    }
    // fiorellini e margherite sull'erba
    for (let k = 0; k < 160; k++) {
      const x = 80 + R() * (w0 - 160), s = supM(x);
      if (s > 860 || Math.abs(pendM(x)) > 1.2 || materiale(x, s + 2) === ROCCIA || materiale(x, s + 2) === LEGNO) continue;
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
    // ── pietra (muretti, rovina): blocchi sfalsati con le fughe scure, più chiari in cima ──
    for (let xq = 0; xq < W; xq++) {
      let cima = -1;
      for (let yq = 0; yq < H; yq++) {
        if (tag[yq * W + xq] !== 3) { cima = -1; continue; }
        if (cima < 0) cima = yq;
        const x = xq / S, dy = (yq - cima) / S, riga = Math.floor(dy / 9), ox = (riga % 2) * 7;
        const giunto = dy % 9 < 1 || (x + ox) % 14 < 1;
        const l = 196 - Math.min(40, riga * 9) + (n2(xq, yq, 5) - 0.5) * 22;
        ctx.fillStyle = giunto ? 'rgba(60,50,62,0.8)' : `rgb(${l | 0},${(l - 14) | 0},${(l - 34) | 0})`;
        ctx.fillRect(x, yq / S, 1 / S, 1 / S);
      }
    }
    // ── poppa del relitto (Cala v3): due file di finestre accese e la balaustra ──
    if (materiale(139, 800) === LEGNO && dentro(139, 800, 24) && materiale(139, 740) === LEGNO) {
      for (const [fy, n] of [[772, 3], [812, 3]]) for (let k = 0; k < n; k++) {
        const fx = 120 + k * 18;
        ctx.fillStyle = '#3A2414'; ctx.fillRect(fx - 6, fy - 9, 12, 18);
        ctx.fillStyle = '#FFD98A'; ctx.fillRect(fx - 4, fy - 7, 8, 14);
        ctx.fillStyle = '#3A2414'; ctx.fillRect(fx - 0.6, fy - 7, 1.2, 14); ctx.fillRect(fx - 4, fy - 0.6, 8, 1.2);
      }
      ctx.fillStyle = '#C9A04A'; ctx.fillRect(108, 748, 62, 3); ctx.fillRect(108, 836, 62, 3);
    }

    // ── contorno scuro sulla sagoma esterna e ritaglio alla maschera ──
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const fin = ctx.getImageData(0, 0, W, H), f = fin.data;
    for (let i = 0; i < W * H; i++) {
      if (!mat[i]) {
        if (S > 1 ? copB[i] > 0.1 : coperta[i]) {
          // parete in fondo a grotte e arco: alfa 110 (sotto 128 resta aria per la maschera), colori scuri e freddi
          const yq = (i / W) | 0, y = yq / S, x = (i - yq * W) / S, t = Math.min(1, ao[i] * 1.6);
          const base = y < 760 ? [96, 78, 92] : [74, 52, 58], nn = n1(x, y, 30);
          f[i * 4] = base[0] * (0.7 + nn * 0.5) * (1 - t * 0.35); f[i * 4 + 1] = base[1] * (0.7 + nn * 0.5) * (1 - t * 0.35); f[i * 4 + 2] = base[2] * (0.75 + nn * 0.5) * (1 - t * 0.2) + 10;
          // sfuma dove la grotta si apre sull'aria libera (in HD più dolce: niente bordi dritti alle bocche)
          const sf = S > 1 ? Math.min(1, Math.max(0, (copB[i] - 0.1) / 0.75)) : Math.min(1, copM[i] * 1.8);
          f[i * 4 + 3] = Math.round(110 * sf * sf * (3 - 2 * sf));
        } else { f[i * 4 + 3] = 0; f[i * 4] = f[i * 4 + 1] = f[i * 4 + 2] = 0; }
        continue;
      }
      f[i * 4 + 3] = 255;
      const b = bordo[i];
      const ct = S > 1 ? C.contornoHD : C.contorno;
      if (b > 0.05) { const t = Math.min(1, b * 3.2) * (S > 1 ? 0.92 : 0.85); f[i * 4] += (ct[0] - f[i * 4]) * t; f[i * 4 + 1] += (ct[1] - f[i * 4 + 1]) * t; f[i * 4 + 2] += (ct[2] - f[i * 4 + 2]) * t; }
    }
    ctx.putImageData(fin, 0, 0);
    ctx.setTransform(S, 0, 0, S, 0, 0);
    // funghetti luminosi sul pavimento delle grotte (alfa < 128: restano aria)
    ctx.globalAlpha = 0.43;
    for (let k = 0, messi = 0; k < 2000 && messi < 14; k++) {
      const x = 480 + R() * 1100, y = 820 + R() * 120, i = iq(x, y);
      if (!coperta[i] || !solido(x, y + 3) || x > 640 && x < 1380) continue;
      const g = ctx.createRadialGradient(x, y - 4, 1, x, y - 4, 16); g.addColorStop(0, 'rgba(140,255,220,0.9)'); g.addColorStop(1, 'rgba(140,255,220,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 4, 16, 0, 7); ctx.fill();
      ctx.fillStyle = '#E8FFF6'; ctx.fillRect(x - 1, y - 6, 2, 6); ctx.fillStyle = '#7CF5D2'; ctx.beginPath(); ctx.arc(x, y - 6, 4, Math.PI, 0); ctx.fill();
      messi++;
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // l'aria resta aria: alfa delle grotte riportato sotto 128
    const ult = ctx.getImageData(0, 0, W, H), u = ult.data;
    for (let i = 0; i < W * H; i++) if (!mat[i] && u[i * 4 + 3] > 110) u[i * 4 + 3] = 110;
    ctx.putImageData(ult, 0, 0);
    return c.toDataURL('image/png');
  };
})();
