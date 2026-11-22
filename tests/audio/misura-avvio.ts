// MISURA DELL'AVVIO DELL'AUDIO sul profilo lento (P1-contratti §6, Audio punto 2). Non è un test: si lancia a mano.
//   npm run build && npx vite preview --port 4173 &
//   PW_CHROME=/opt/pw-browsers/chromium npx tsx tests/audio/misura-avvio.ts [rallentamento=4] [giri=3]
// Apre il menu in Chromium con il processore rallentato (CPU ×4 dei DevTools, circa un telefono di fascia media) e
// misura quanto ci vuole perché tutti i suoni siano pronti e i frame del menu nei primi secondi (frame oltre 33 e
// oltre 50 ms, il più lungo, i "long task" del filo principale). Ogni giro si fa due volte: con l'audio e SENZA
// (OfflineAudioContext tolto: niente si prepara), così si vede quanto scatto aggiunge l'audio e quanto è del menu.
// Poi il SECONDO avvio (stessa pagina ricaricata): i suoni pronti vengono dal cassetto del telefono (cache.ts).
// Soglie (§6): sopra 6 s, o se il menu scatta per colpa dell'audio, si prepara a pezzi più piccoli.
import { chromium, type Page } from 'playwright';

const RALLENTA = Number(process.argv[2] ?? 4);
const GIRI = Number(process.argv[3] ?? 3);
const URL = process.env.URL_GIOCO ?? 'http://localhost:4173/?prova';
/** finestra di misura dei frame: dall'apertura a qui (ms) */
const FINESTRA_MS = 8000;

interface Finestra { frame: number; oltre33: number; oltre50: number; piuLungo: number; longTask: number; longTaskMs: number }

// (è una stringa: tsx aggiunge ai nomi delle funzioni un aiuto "__name" che nella pagina non esiste)
const REGISTRO = `
  window.__frame = []; window.__lunghi = [];
  let prima = 0;
  function passo(t) { if (prima) window.__frame.push(t - prima); prima = t; requestAnimationFrame(passo); }
  requestAnimationFrame(passo);
  try { new PerformanceObserver(function (l) { for (const e of l.getEntries()) window.__lunghi.push({ t: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) { /* niente long task */ }
`;
const SENZA_AUDIO = 'delete window.OfflineAudioContext; delete window.webkitOfflineAudioContext;';

async function misura(pagina: Page, conAudio: boolean): Promise<{ msPronti: number | null; finestra: Finestra; totale: number }> {
  await pagina.waitForFunction(() => (window as any).__kaboomAudio !== undefined);
  let msPronti: number | null = null;
  if (conAudio) {
    await pagina.waitForFunction(() => { const s = (window as any).__kaboomAudio.stato(); return s.pronti === s.totale; }, undefined, { timeout: 120000, polling: 50 });
    msPronti = Math.round(await pagina.evaluate(() => performance.now()));
  }
  const ora = await pagina.evaluate(() => performance.now());
  if (ora < FINESTRA_MS) await pagina.waitForTimeout(FINESTRA_MS - ora);
  const totale = await pagina.evaluate(() => (window as any).__kaboomAudio.stato().totale as number);
  const finestra = await pagina.evaluate((fine) => {
    const w = window as unknown as { __frame: number[]; __lunghi: { t: number; d: number }[] };
    // solo i frame dentro la finestra (somma dei tempi)
    const f: number[] = [];
    let t = 0;
    for (const x of w.__frame) { t += x; if (t > fine) break; f.push(x); }
    const l = w.__lunghi.filter((x) => x.t < fine);
    return { frame: f.length, oltre33: f.filter((x) => x > 33.4).length, oltre50: f.filter((x) => x > 50).length, piuLungo: Math.round(Math.max(0, ...f)), longTask: l.length, longTaskMs: Math.round(l.reduce((s, x) => s + x.d, 0)) };
  }, FINESTRA_MS);
  return { msPronti, finestra, totale };
}

/** Primo avvio (e, con l'audio, secondo avvio ricaricando la pagina: il cassetto è pieno). */
async function giro(conAudio: boolean): Promise<{ primo: Awaited<ReturnType<typeof misura>>; secondo?: Awaited<ReturnType<typeof misura>> }> {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
  const pagina = await browser.newPage({ viewport: { width: 1080, height: 486 } });
  const cdp = await pagina.context().newCDPSession(pagina);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RALLENTA });
  await pagina.addInitScript(REGISTRO + (conAudio ? '' : SENZA_AUDIO));
  await pagina.goto(URL);
  const primo = await misura(pagina, conAudio);
  let secondo;
  if (conAudio) {
    await pagina.waitForTimeout(1500); // il cassetto si scrive in sottofondo
    await pagina.reload();
    secondo = await misura(pagina, true);
  }
  await browser.close();
  return { primo, secondo };
}

async function main(): Promise<void> {
  console.log(`CPU ×${RALLENTA}, ${GIRI} giri, primi ${FINESTRA_MS / 1000} s del menu, ${URL}`);
  const f = (x: Finestra) => `${x.frame} frame, ${x.oltre33} oltre 33 ms, ${x.oltre50} oltre 50 ms, il più lungo ${x.piuLungo} ms, long task ${x.longTask} (${x.longTaskMs} ms)`;
  for (let i = 0; i < GIRI; i++) {
    const con = await giro(true);
    const senza = await giro(false);
    console.log(`giro ${i + 1}: ${con.primo.totale} suoni pronti a ${((con.primo.msPronti ?? 0) / 1000).toFixed(1)} s dall'apertura; al secondo avvio a ${((con.secondo?.msPronti ?? 0) / 1000).toFixed(1)} s`);
    console.log(`   primo avvio:    ${f(con.primo.finestra)}`);
    console.log(`   secondo avvio:  ${f(con.secondo!.finestra)}`);
    console.log(`   senza audio:    ${f(senza.primo.finestra)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
