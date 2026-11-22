// MISURA DELL'AVVIO DELL'AUDIO sul profilo lento (P1-contratti §6, Audio punto 2). Non è un test: si lancia a mano.
//   npm run build && npx vite preview --port 4173 &   poi   npx tsx tests/audio/misura-avvio.ts [rallentamento=4] [giri=3]
// Apre il menu in Chromium con il processore rallentato (CPU ×4 dei DevTools, circa un telefono di fascia media) e
// misura: quanto ci vuole perché tutti i suoni siano pronti, e i frame persi dal menu mentre si preparano
// (frame oltre 33 ms e oltre 50 ms, il più lungo, i "long task" del filo principale). Poi misura 3 s di menu fermo
// a suoni pronti, come riferimento. Soglie (§6): sopra 6 s, o se il menu scatta, si prepara a pezzi più piccoli.
import { chromium } from 'playwright';

const RALLENTA = Number(process.argv[2] ?? 4);
const GIRI = Number(process.argv[3] ?? 3);
const URL = process.env.URL_GIOCO ?? 'http://localhost:4173/?prova';

interface Finestra { frame: number; oltre33: number; oltre50: number; piuLungo: number; longTask: number; longTaskMs: number }

async function giro(): Promise<{ msPronti: number; durante: Finestra; fermo: Finestra; totale: number }> {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  const pagina = await browser.newPage({ viewport: { width: 1080, height: 486 } });
  const cdp = await pagina.context().newCDPSession(pagina);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RALLENTA });
  // registro dei frame e dei long task dal primo istante della pagina
  // (è una stringa: tsx aggiunge ai nomi delle funzioni un aiuto "__name" che nella pagina non esiste)
  await pagina.addInitScript(`
    window.__frame = []; window.__lunghi = [];
    let prima = 0;
    function passo(t) { if (prima) window.__frame.push(t - prima); prima = t; requestAnimationFrame(passo); }
    requestAnimationFrame(passo);
    try { new PerformanceObserver(function (l) { for (const e of l.getEntries()) window.__lunghi.push({ t: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) { /* niente long task */ }
  `);
  await pagina.goto(URL);
  await pagina.waitForFunction(() => (window as any).__kaboomAudio !== undefined);
  const t0 = await pagina.evaluate(() => performance.now());
  await pagina.waitForFunction(() => { const s = (window as any).__kaboomAudio.stato(); return s.pronti === s.totale; }, undefined, { timeout: 120000, polling: 50 });
  const t1 = await pagina.evaluate(() => performance.now());
  const totale = await pagina.evaluate(() => (window as any).__kaboomAudio.stato().totale as number);
  const finestra = () => pagina.evaluate(() => {
    const w = window as unknown as { __frame: number[]; __lunghi: { t: number; d: number }[] };
    const f = w.__frame.splice(0), l = w.__lunghi.splice(0);
    return { frame: f.length, oltre33: f.filter((x) => x > 33.4).length, oltre50: f.filter((x) => x > 50).length, piuLungo: Math.round(Math.max(0, ...f)), longTask: l.length, longTaskMs: Math.round(l.reduce((s, x) => s + x.d, 0)) };
  });
  const durante = await finestra();
  await pagina.waitForTimeout(3000);
  const fermo = await finestra();
  await browser.close();
  // tempo dall'avvio della pagina (navigationStart = 0) a tutti i suoni pronti
  void t0;
  return { msPronti: Math.round(t1), durante, fermo, totale };
}

async function main(): Promise<void> {
  console.log(`CPU ×${RALLENTA}, ${GIRI} giri, ${URL}`);
  for (let i = 0; i < GIRI; i++) {
    const r = await giro();
    const f = (x: Finestra) => `${x.frame} frame, ${x.oltre33} oltre 33 ms, ${x.oltre50} oltre 50 ms, il più lungo ${x.piuLungo} ms, long task ${x.longTask} (${x.longTaskMs} ms)`;
    console.log(`giro ${i + 1}: ${r.totale} suoni pronti a ${(r.msPronti / 1000).toFixed(1)} s dall'apertura`);
    console.log(`   mentre si preparano: ${f(r.durante)}`);
    console.log(`   3 s di menu fermo:   ${f(r.fermo)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
