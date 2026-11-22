// Esegue i pittori in Chromium headless e salva i PNG.
//   node scripts/mappe/dipingi/esegui.cjs <materiali.png> <cartella-uscita> [scala] [nome]
// scala 1 (predefinita): terreno.png 2048×1024 + gli sfondi. scala 2: solo il terreno HD 4096×2048, in terreno@2x.png.
// nome: nome del file del terreno (predefinito "terreno"), per dipingere più varianti nella stessa cartella.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const [materiali, uscita, scalaArg, nomeArg] = process.argv.slice(2);
  const scala = scalaArg === '2' ? 2 : 1, nome = nomeArg || 'terreno';
  fs.mkdirSync(uscita, { recursive: true });
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  p.on('console', (m) => console.log('pagina:', m.text()));
  p.on('pageerror', (e) => console.error('ERRORE:', e));
  await p.setContent('<html><body></body></html>');
  for (const f of ['terreno.js', 'sfondi.js']) if (fs.existsSync(path.join(__dirname, f))) await p.addScriptTag({ path: path.join(__dirname, f) });
  const url = 'data:image/png;base64,' + fs.readFileSync(materiali).toString('base64');
  const risultati = await p.evaluate(async ({ url, scala, nome }) => {
    const img = new Image(); img.src = url; await img.decode();
    const out = { [scala === 2 ? nome + '@2x' : nome]: window.dipingiTerreno(img, scala) };
    if (scala === 1 && nome === 'terreno' && window.dipingiSfondi) Object.assign(out, window.dipingiSfondi());
    return out;
  }, { url, scala, nome });
  for (const [n, dati] of Object.entries(risultati)) {
    fs.writeFileSync(path.join(uscita, n + '.png'), Buffer.from(dati.split(',')[1], 'base64'));
    console.log('scritto', n);
  }
  await b.close();
})();
