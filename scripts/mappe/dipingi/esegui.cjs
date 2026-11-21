// Esegue i pittori in Chromium headless e salva i PNG.  node scripts/mappe/dipingi/esegui.cjs <materiali.png> <cartella-uscita>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const [materiali, uscita] = process.argv.slice(2);
  fs.mkdirSync(uscita, { recursive: true });
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  p.on('console', (m) => console.log('pagina:', m.text()));
  p.on('pageerror', (e) => console.error('ERRORE:', e));
  await p.setContent('<html><body></body></html>');
  for (const f of ['terreno.js', 'sfondi.js']) if (fs.existsSync(path.join(__dirname, f))) await p.addScriptTag({ path: path.join(__dirname, f) });
  const url = 'data:image/png;base64,' + fs.readFileSync(materiali).toString('base64');
  const risultati = await p.evaluate(async (url) => {
    const img = new Image(); img.src = url; await img.decode();
    const out = { terreno: window.dipingiTerreno(img) };
    if (window.dipingiSfondi) Object.assign(out, window.dipingiSfondi());
    return out;
  }, url);
  for (const [nome, dati] of Object.entries(risultati)) {
    fs.writeFileSync(path.join(uscita, nome + '.png'), Buffer.from(dati.split(',')[1], 'base64'));
    console.log('scritto', nome);
  }
  await b.close();
})();
