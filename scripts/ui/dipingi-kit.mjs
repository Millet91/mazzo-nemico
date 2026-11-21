// Dipinge il kit UI in casa con Chromium e salva i webp in public/assets/ui/.
// Uso: node scripts/ui/dipingi-kit.mjs  (serve il Chromium di Playwright; PW_CHROME per un Chrome locale)
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const qui = dirname(fileURLToPath(import.meta.url));
const uscita = join(qui, '../../public/assets/ui');
mkdirSync(uscita, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
const page = await browser.newPage();
await page.setContent('<!doctype html><body></body>');
await page.addScriptTag({ content: readFileSync(join(qui, 'pittore-kit.js'), 'utf8') });

const QUALITA = 0.82; // arte-ui.md §3.10
const lavori = [
  ['ui_pannello_cornice', 'pannelloCornice'],
  ['ui_pannello_legno', 'pannelloLegno'],
  ['ui_pannello_pergamena', 'pannelloPergamena'],
  ['ui_pulsante_legno', 'pulsanteLegno'],
  ['ui_pulsante_oro', 'pulsanteOro'],
  ['ui_cornice_tonda', 'corniceTonda'],
  ['ui_menu_sfondo', 'sfondoMenu'],
];
const idIcone = await page.evaluate(() => window.pittoreKit.idIcone);
for (const id of idIcone) lavori.push([`ui_arma_${id.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())}`, 'icona', id]);

const idPezzi = await page.evaluate(() => window.pittoreKit.idPezzi);
for (const id of idPezzi) lavori.push([id.startsWith('premio_') || id.startsWith('mossa_') ? `ui_${id.startsWith('mossa_') ? 'premio_' + id : id}` : `ui_mondo_${id}`, 'pezzo', id]);

let totale = 0;
for (const [nome, fn, arg] of lavori) {
  const url = await page.evaluate(async ([f, a, q]) => (await window.pittoreKit[f](a)).toDataURL('image/webp', q), [fn, arg, QUALITA]);
  const buf = Buffer.from(url.split(',')[1], 'base64');
  writeFileSync(join(uscita, `${nome}.webp`), buf);
  totale += buf.length;
  console.log(`${nome}.webp  ${(buf.length / 1024).toFixed(1)} KB`);
}
console.log(`totale ${(totale / 1024).toFixed(0)} KB`);
await browser.close();
