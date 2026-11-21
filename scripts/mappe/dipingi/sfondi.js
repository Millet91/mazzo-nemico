// Pittore degli sfondi di Cala Pappagallo (Canvas 2D in Chromium): cielo al tramonto, isole lontane, scogli medi,
// oggetti di scena. Stesse regole del terreno (03 §1-2). Restituisce PNG in data URL.
/* eslint-disable */
(function () {
  function rng(seme) { let s = seme >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const tela = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };

  // nuvola gonfia a tre toni: base lilla, corpo bianco caldo, luce sul bordo in alto a sinistra
  function nuvola(ctx, x, y, s, R) {
    const palle = [];
    for (let k = 0; k < 9; k++) palle.push([x + (k - 4) * 26 * s + (R() - 0.5) * 14 * s, y - Math.sin((k / 8) * Math.PI) * 38 * s - R() * 16 * s, (26 + R() * 22) * s]);
    ctx.fillStyle = '#C9A7D9';
    for (const [px, py, r] of palle) { ctx.beginPath(); ctx.arc(px + 4 * s, py + 9 * s, r, 0, 7); ctx.fill(); }
    ctx.fillRect(x - 120 * s, y - 10 * s, 240 * s, 22 * s);
    ctx.fillStyle = '#FFF4EA';
    for (const [px, py, r] of palle) { ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#FFE1C2';
    for (const [px, py, r] of palle) { ctx.beginPath(); ctx.arc(px + r * 0.25, py + r * 0.35, r * 0.7, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (const [px, py, r] of palle.slice(2, 6)) { ctx.beginPath(); ctx.arc(px - r * 0.25, py - r * 0.3, r * 0.5, 0, 7); ctx.fill(); }
  }

  function cielo() {
    const W = 2048, H = 900, [c, ctx] = tela(W, H), R = rng(3);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3FA7E0'); g.addColorStop(0.38, '#6EC6F0'); g.addColorStop(0.68, '#BFE3EC'); g.addColorStop(0.82, '#FFD3A1'); g.addColorStop(1, '#FFB27A');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // sole basso a sinistra con alone e raggi
    const sx = 420, sy = 690;
    let a = ctx.createRadialGradient(sx, sy, 20, sx, sy, 520); a.addColorStop(0, 'rgba(255,214,150,0.85)'); a.addColorStop(0.3, 'rgba(255,200,140,0.35)'); a.addColorStop(1, 'rgba(255,200,140,0)');
    ctx.fillStyle = a; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#FFF3D0';
    for (let k = 0; k < 9; k++) { const an = -Math.PI * 0.95 + k * 0.12; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(an) * 1400, sy + Math.sin(an) * 1400); ctx.lineTo(sx + Math.cos(an + 0.05) * 1400, sy + Math.sin(an + 0.05) * 1400); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = '#FFE6B0'; ctx.beginPath(); ctx.arc(sx, sy, 78, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFF6DA'; ctx.beginPath(); ctx.arc(sx - 14, sy - 14, 52, 0, 7); ctx.fill();
    // nuvole lontane sottili (strisce) e nuvoloni
    ctx.fillStyle = 'rgba(255,230,210,0.55)';
    for (let k = 0; k < 7; k++) { const x = R() * W, y = 520 + R() * 160; ctx.beginPath(); ctx.ellipse(x, y, 160 + R() * 200, 6 + R() * 6, 0, 0, 7); ctx.fill(); }
    for (const [x, y, s] of [[180, 220, 1.1], [760, 140, 1.5], [1300, 260, 1.0], [1760, 170, 1.35], [1050, 430, 0.7], [1580, 470, 0.65], [2040, 330, 0.9], [-10, 420, 0.8]]) nuvola(ctx, x, y, s, R);
    // gabbiani
    ctx.strokeStyle = 'rgba(60,50,80,0.7)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const [x, y, s] of [[900, 330, 1], [940, 350, 0.8], [1480, 380, 0.9], [620, 420, 0.7]]) {
      ctx.beginPath(); ctx.moveTo(x - 14 * s, y - 4 * s); ctx.quadraticCurveTo(x - 6 * s, y - 10 * s, x, y); ctx.quadraticCurveTo(x + 6 * s, y - 10 * s, x + 14 * s, y - 4 * s); ctx.stroke();
    }
    return c.toDataURL('image/png');
  }

  // profilo di un'isola lontana
  function isola(ctx, x, base, larga, alta, col, R) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - larga / 2, base);
    const n = 8;
    for (let k = 0; k <= n; k++) { const t = k / n; ctx.lineTo(x - larga / 2 + t * larga, base - Math.sin(t * Math.PI) ** 0.8 * alta * (0.85 + R() * 0.3)); }
    ctx.lineTo(x + larga / 2, base); ctx.closePath(); ctx.fill();
  }
  function palmetta(ctx, x, y, s, col) {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.5 * s;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 4 * s, y - 14 * s, x + 2 * s, y - 26 * s); ctx.stroke();
    for (const a of [-2.6, -2.0, -1.2, -0.5, 0.1]) { ctx.beginPath(); ctx.ellipse(x + 2 * s + Math.cos(a) * 9 * s, y - 26 * s + Math.sin(a) * 4 * s, 10 * s, 2.5 * s, a + 0.3, 0, 7); ctx.fill(); }
  }
  function vela(ctx, x, y, s, scafo, telo) {
    ctx.fillStyle = scafo; ctx.beginPath(); ctx.moveTo(x - 22 * s, y); ctx.lineTo(x + 24 * s, y); ctx.lineTo(x + 16 * s, y + 8 * s); ctx.lineTo(x - 16 * s, y + 8 * s); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 1 * s, y - 34 * s, 2 * s, 34 * s);
    ctx.fillStyle = telo; ctx.beginPath(); ctx.moveTo(x + 2 * s, y - 32 * s); ctx.quadraticCurveTo(x + 16 * s, y - 20 * s, x + 2 * s, y - 6 * s); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 2 * s, y - 28 * s); ctx.quadraticCurveTo(x - 14 * s, y - 18 * s, x - 2 * s, y - 8 * s); ctx.closePath(); ctx.fill();
  }

  function lontano() {
    const W = 2048, H = 256, [c, ctx] = tela(W, H), R = rng(5), base = 236;
    const lontane = '#C9B6D6', medie = '#B39CC8', luce = '#F1C9B8';
    // fascia più lontana
    for (const [x, l, a] of [[260, 300, 60], [720, 220, 44], [1180, 360, 70], [1680, 280, 52], [1980, 160, 38]]) isola(ctx, x, base, l, a, lontane, R);
    // vulcano con fumo
    ctx.fillStyle = medie; ctx.beginPath(); ctx.moveTo(1240, base); ctx.lineTo(1385, 92); ctx.lineTo(1420, 92); ctx.lineTo(1580, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = luce; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(1290, base); ctx.lineTo(1385, 92); ctx.lineTo(1395, 92); ctx.lineTo(1330, base); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(235,225,240,0.75)';
    for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(1404 + k * 22, 80 - k * 10 - Math.sin(k) * 4, 12 + k * 3, 0, 7); ctx.fill(); }
    // isole medie con palme, faro e fortino
    for (const [x, l, a] of [[420, 260, 74], [930, 200, 58], [1860, 300, 80]]) isola(ctx, x, base, l, a, medie, R);
    for (const [x, y] of [[380, 166], [410, 162], [470, 170], [900, 182], [1820, 160], [1890, 158]]) palmetta(ctx, x, y, 1, medie);
    // faro su scogliera
    ctx.fillStyle = medie; ctx.fillRect(612, 170, 70, 66); ctx.beginPath(); ctx.moveTo(632, 170); ctx.lineTo(640, 104); ctx.lineTo(656, 104); ctx.lineTo(664, 170); ctx.fill();
    ctx.fillStyle = '#FFE6A8'; ctx.fillRect(641, 96, 14, 10); ctx.fillStyle = medie; ctx.beginPath(); ctx.moveTo(638, 96); ctx.lineTo(648, 86); ctx.lineTo(658, 96); ctx.fill();
    const fl = ctx.createRadialGradient(648, 101, 2, 648, 101, 40); fl.addColorStop(0, 'rgba(255,240,190,0.8)'); fl.addColorStop(1, 'rgba(255,240,190,0)'); ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(648, 101, 40, 0, 7); ctx.fill();
    // fortino di legno
    ctx.fillStyle = '#A88CB8'; ctx.fillRect(1780, 140, 90, 28); for (let k = 0; k < 6; k++) ctx.fillRect(1780 + k * 16, 132, 10, 10);
    ctx.fillRect(1860, 118, 22, 50); ctx.fillRect(1866, 100, 2, 18); ctx.fillStyle = '#D9B8C8'; ctx.fillRect(1868, 100, 14, 8);
    // velieri all'orizzonte
    vela(ctx, 1080, 222, 0.9, medie, '#EADCEB'); vela(ctx, 160, 226, 0.7, medie, '#EADCEB');
    // linea del mare e foschia in basso
    ctx.fillStyle = '#9FC7D8'; ctx.fillRect(0, base, W, H - base);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let x = 0; x < W; x += 64) ctx.fillRect(x + 10, base + 4, 26, 2);
    const nebbia = ctx.createLinearGradient(0, 120, 0, base); nebbia.addColorStop(0, 'rgba(255,220,200,0)'); nebbia.addColorStop(1, 'rgba(255,220,200,0.35)');
    ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = nebbia; ctx.fillRect(0, 0, W, base); ctx.globalCompositeOperation = 'source-over';
    return c.toDataURL('image/png');
  }

  function scoglio(ctx, x, base, l, a, R) {
    const g = ctx.createLinearGradient(x - l / 2, 0, x + l / 2, 0); g.addColorStop(0, '#9C8A86'); g.addColorStop(0.45, '#7D6E78'); g.addColorStop(1, '#5B5370');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - l / 2, base);
    const pts = 7; for (let k = 0; k <= pts; k++) { const t = k / pts; ctx.lineTo(x - l / 2 + t * l + (R() - 0.5) * 10, base - (Math.sin(t * Math.PI) ** 0.55) * a * (0.85 + R() * 0.25)); }
    ctx.lineTo(x + l / 2, base); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(42,26,40,0.55)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#7FB868'; ctx.beginPath(); ctx.ellipse(x - l * 0.05, base - a * 0.97, l * 0.28, 8, 0, 0, 7); ctx.fill();
  }
  function palmaMedia(ctx, x, y, s) {
    ctx.strokeStyle = '#6B5150'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 10 * s, y - 40 * s, x + 4 * s, y - 70 * s); ctx.stroke();
    ctx.fillStyle = '#5E9E62';
    for (const a of [-2.8, -2.2, -1.6, -1.0, -0.4, 0.2]) { ctx.save(); ctx.translate(x + 4 * s, y - 70 * s); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(16 * s, 4 * s, 20 * s, 5 * s, 0.35, 0, 7); ctx.fill(); ctx.restore(); }
  }
  function galeone(ctx, x, base) {
    ctx.save(); ctx.translate(x, base); ctx.rotate(-0.16);
    ctx.fillStyle = '#6E5560'; ctx.beginPath(); ctx.moveTo(-150, -20); ctx.lineTo(120, -30); ctx.lineTo(160, -72); ctx.lineTo(100, 20); ctx.lineTo(-130, 30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(40,26,40,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(230,200,170,0.35)'; for (let k = -10; k < 20; k += 10) { ctx.beginPath(); ctx.moveTo(-140, k); ctx.lineTo(120, k - 12); ctx.stroke(); }
    ctx.fillStyle = '#2E2A3E'; for (let k = -100; k < 90; k += 40) { ctx.beginPath(); ctx.arc(k, -8, 5, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#5A4650'; ctx.fillRect(-30, -170, 7, 150); ctx.fillRect(60, -120, 6, 95);
    ctx.save(); ctx.translate(-26, -150); ctx.rotate(0.9); ctx.fillRect(0, 0, 5, 70); ctx.restore();
    ctx.fillStyle = 'rgba(235,222,210,0.9)'; ctx.beginPath(); ctx.moveTo(-23, -160); ctx.quadraticCurveTo(30, -130, 0, -80); ctx.lineTo(-10, -96); ctx.lineTo(-23, -82); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(66, -112); ctx.quadraticCurveTo(100, -90, 74, -60); ctx.lineTo(66, -64); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function medio() {
    const W = 2048, H = 320, [c, ctx] = tela(W, H), R = rng(9), base = 276;
    scoglio(ctx, 210, base, 150, 190, R); palmaMedia(ctx, 205, base - 182, 1);
    scoglio(ctx, 330, base, 90, 110, R);
    galeone(ctx, 760, base - 6);
    // isolotto con arco
    ctx.fillStyle = '#7D6E78'; ctx.beginPath(); ctx.moveTo(1180, base); ctx.quadraticCurveTo(1190, base - 150, 1290, base - 160); ctx.quadraticCurveTo(1390, base - 150, 1400, base);
    ctx.lineTo(1350, base); ctx.quadraticCurveTo(1340, base - 90, 1290, base - 92); ctx.quadraticCurveTo(1240, base - 90, 1230, base); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(42,26,40,0.55)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#7FB868'; ctx.beginPath(); ctx.ellipse(1290, base - 158, 60, 9, 0, 0, 7); ctx.fill();
    palmaMedia(ctx, 1270, base - 156, 0.8); palmaMedia(ctx, 1320, base - 158, 0.7);
    scoglio(ctx, 1640, base, 120, 140, R); scoglio(ctx, 1730, base, 70, 80, R); palmaMedia(ctx, 1640, base - 132, 0.9);
    // gabbiani appollaiati
    ctx.fillStyle = '#F4F0F0'; for (const [x, y] of [[1290, base - 168], [210, base - 196]]) { ctx.beginPath(); ctx.ellipse(x, y, 7, 4, 0, 0, 7); ctx.fill(); }
    // fascia di mare con schiuma (periodica su 2048 → si ripete senza giunta)
    const m = ctx.createLinearGradient(0, base - 6, 0, H); m.addColorStop(0, '#2FB3C4'); m.addColorStop(1, '#116A8C');
    ctx.fillStyle = m; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, base - 6 + Math.sin((x / W) * Math.PI * 32) * 4);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(230,251,255,0.85)'; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, base - 6 + Math.sin((x / W) * Math.PI * 32) * 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(230,251,255,0.45)'; for (let x = 20; x < W; x += 128) ctx.fillRect(x, base + 14, 40, 3);
    return c.toDataURL('image/png');
  }

  // ── oggetti di scena (alti il doppio della misura a schermo: 03 §8.2) ──
  function palma() {
    const [c, ctx] = tela(220, 300);
    ctx.lineCap = 'round';
    // tronco curvo ad anelli
    for (let k = 0; k < 16; k++) {
      const t = k / 15, x = 70 + Math.sin(t * 1.6) * 40, y = 296 - t * 220;
      ctx.fillStyle = k % 2 ? '#9A6A48' : '#B5825A'; ctx.beginPath(); ctx.ellipse(x, y, 13 - t * 4, 9, -0.3, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(60,40,70,0.35)'; ctx.beginPath(); ctx.ellipse(x + 5, y + 2, 6 - t * 2, 7, -0.3, 0, 7); ctx.fill();
    }
    const cx = 110, cy = 78;
    // cocchi
    for (const [dx, dy] of [[-6, 10], [6, 12], [0, 18]]) { ctx.fillStyle = '#6B4226'; ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 8, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,220,170,0.4)'; ctx.beginPath(); ctx.arc(cx + dx - 2, cy + dy - 3, 3, 0, 7); ctx.fill(); }
    // foglie
    for (const [a, l, col] of [[-2.9, 90, '#3F8A3C'], [-2.3, 100, '#55A845'], [-1.7, 80, '#6CC24A'], [-1.1, 96, '#55A845'], [-0.5, 100, '#6CC24A'], [0.15, 88, '#3F8A3C'], [-3.4, 70, '#3F8A3C']]) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(l * 0.5, -22, l, 14); ctx.quadraticCurveTo(l * 0.5, 4, 0, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(30,60,30,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(l * 0.5, -10, l, 14); ctx.stroke();
      ctx.fillStyle = '#A6E36B'; ctx.beginPath(); ctx.moveTo(l * 0.15, -4); ctx.quadraticCurveTo(l * 0.5, -18, l * 0.85, 4); ctx.quadraticCurveTo(l * 0.5, -8, l * 0.15, -4); ctx.fill();
      ctx.restore();
    }
    return c.toDataURL('image/png');
  }
  function cespuglio() {
    const [c, ctx] = tela(150, 96), R = rng(13);
    const palle = [[40, 62, 28], [75, 48, 34], [110, 62, 28], [60, 70, 24], [95, 72, 24]];
    ctx.fillStyle = '#2F6E3A'; for (const [x, y, r] of palle) { ctx.beginPath(); ctx.arc(x + 4, y + 6, r, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#4E9E3C'; for (const [x, y, r] of palle) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#7FD255'; for (const [x, y, r] of palle) { ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.5, 0, 7); ctx.fill(); }
    for (let k = 0; k < 12; k++) { const x = 25 + R() * 100, y = 30 + R() * 50; ctx.fillStyle = k % 3 ? '#FF7AA8' : '#FFF1A8'; for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p * 1.26) * 3, y + Math.sin(p * 1.26) * 3, 2.4, 0, 7); ctx.fill(); } ctx.fillStyle = '#FFD23F'; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill(); }
    return c.toDataURL('image/png');
  }
  function masso() {
    const [c, ctx] = tela(120, 88);
    ctx.fillStyle = '#5B5370'; ctx.beginPath(); ctx.ellipse(62, 54, 54, 34, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#9A8A80'; ctx.beginPath(); ctx.ellipse(58, 50, 50, 32, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#C4B09C'; ctx.beginPath(); ctx.ellipse(44, 38, 26, 14, -0.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#7FB868'; ctx.beginPath(); ctx.ellipse(66, 22, 26, 8, 0.1, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(60,50,70,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(78, 34); ctx.lineTo(70, 52); ctx.lineTo(82, 66); ctx.stroke();
    return c.toDataURL('image/png');
  }
  function rovina() {
    const [c, ctx] = tela(110, 160);
    ctx.fillStyle = '#8F8494'; ctx.fillRect(20, 150, 70, 10);
    // colonna spezzata con scanalature
    const g = ctx.createLinearGradient(30, 0, 80, 0); g.addColorStop(0, '#EADBC2'); g.addColorStop(0.5, '#CDBBA2'); g.addColorStop(1, '#8F8494');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(32, 150); ctx.lineTo(32, 40); ctx.lineTo(45, 30); ctx.lineTo(55, 44); ctx.lineTo(66, 26); ctx.lineTo(78, 38); ctx.lineTo(78, 150); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(90,80,100,0.5)'; ctx.lineWidth = 2; for (const x of [42, 55, 68]) { ctx.beginPath(); ctx.moveTo(x, 46); ctx.lineTo(x, 146); ctx.stroke(); }
    ctx.fillStyle = '#E2D3BA'; ctx.fillRect(24, 140, 62, 12);
    // edera
    ctx.strokeStyle = '#4E9E3C'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(36, 150); ctx.bezierCurveTo(60, 120, 30, 90, 62, 50); ctx.stroke();
    ctx.fillStyle = '#6CC24A'; for (const [x, y] of [[40, 130], [52, 112], [44, 92], [56, 70], [62, 52]]) { ctx.beginPath(); ctx.ellipse(x, y, 6, 4, 0.6, 0, 7); ctx.fill(); }
    return c.toDataURL('image/png');
  }

  window.dipingiSfondi = () => ({ cielo: cielo(), lontano: lontano(), medio: medio(), palma: palma(), cespuglio: cespuglio(), masso: masso(), rovina: rovina() });
})();
