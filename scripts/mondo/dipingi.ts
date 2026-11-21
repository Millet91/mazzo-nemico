// npx tsx scripts/mondo/dipingi.ts [nome…] — dipinge in casa i pezzi del Tavolo del Timone con Chromium e li
// salva in public/assets/mondo/. Senza argomenti li rifà tutti; con dei nomi (es. `isola-1C carta`) solo quelli.
// Il disegno vero sta in pittore.ts, che gira nella pagina: qui lo si impacchetta con esbuild e lo si chiama.
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const qui = dirname(fileURLToPath(import.meta.url));
const uscita = join(qui, '../../public/assets/mondo');
mkdirSync(uscita, { recursive: true });

const pacco = await build({
  entryPoints: [join(qui, 'pittore.ts')], bundle: true, write: false, format: 'iife', globalName: 'Pittore', target: 'es2022',
});
const codice = pacco.outputFiles[0].text;

// Chromium già installato nella macchina di lavoro, altrimenti quello di Playwright
const giaInstallato = '/opt/pw-browsers/chromium';
const browser = await chromium.launch({
  args: ['--headless=new', '--no-sandbox'],
  executablePath: process.env.PW_CHROME || (existsSync(giaInstallato) ? giaInstallato : undefined),
});
const pagina = await browser.newPage();
await pagina.setContent('<!doctype html><html><body></body></html>');
await pagina.addScriptTag({ content: codice });

const tutti: string[] = await pagina.evaluate(() => (window as unknown as { Pittore: { elenco(): string[] } }).Pittore.elenco());
const scelti = process.argv.slice(2).length ? process.argv.slice(2) : tutti;
for (const nome of scelti) {
  const t0 = Date.now();
  const file: Record<string, string> = await pagina.evaluate(
    (n) => (window as unknown as { Pittore: { dipingiPezzo(n: string): Record<string, string> } }).Pittore.dipingiPezzo(n), nome);
  for (const [f, url] of Object.entries(file)) {
    const dati = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    writeFileSync(join(uscita, f), dati);
    console.log(`${f.padEnd(22)} ${(dati.length / 1024).toFixed(0).padStart(5)} KB  ${Date.now() - t0} ms`);
  }
}
const manifesto = await pagina.evaluate(() => (window as unknown as { Pittore: { manifesto(): unknown } }).Pittore.manifesto());
writeFileSync(join(uscita, 'mondo.json'), JSON.stringify(manifesto, null, 2) + '\n');
await browser.close();
