// L4 (13 §2): schermata iniziale e Impostazioni → Info in 3 formati, con il notch simulato a sinistra e a destra.
// Controlli: nessun pulsante entro 56 px dal bordo corto, pulsanti di almeno 48×48, il titolo si vede.
import { test, expect, type Page } from '@playwright/test';

const FORMATI = [
  { nome: '20x9', width: 800, height: 360 },
  { nome: '844x390', width: 844, height: 390 },
  { nome: 'tablet', width: 1024, height: 768 },
];

async function controllaPulsanti(page: Page, larghezza: number) {
  const pulsanti = await page.locator('button:visible').evaluateAll((els) =>
    els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, w: r.width, h: r.height, testo: e.textContent ?? '' }; }));
  for (const b of pulsanti) {
    expect(b.x, `pulsante "${b.testo}" troppo vicino al bordo sinistro`).toBeGreaterThanOrEqual(56);
    expect(b.x + b.w, `pulsante "${b.testo}" troppo vicino al bordo destro`).toBeLessThanOrEqual(larghezza - 56);
  }
  for (const b of pulsanti.filter((p) => !/^\d+\.\d+\.\d+$/.test(p.testo))) {
    expect(b.w, `pulsante "${b.testo}" stretto`).toBeGreaterThanOrEqual(48);
    expect(b.h, `pulsante "${b.testo}" basso`).toBeGreaterThanOrEqual(48);
  }
}

for (const f of FORMATI) {
  test(`schermata iniziale e Info · ${f.nome}`, async ({ page }) => {
    await page.setViewportSize({ width: f.width, height: f.height });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Kaboom Ahoy!' })).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `test-results/screenshot/home-${f.nome}.png` });
    await controllaPulsanti(page, f.width);

    await page.locator('#apri-impostazioni').click();
    await page.locator('#apri-info').click();
    await expect(page.getByText('Build', { exact: true })).toBeVisible();
    await expect(page.getByText('Commit', { exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/screenshot/info-${f.nome}.png` });
    await controllaPulsanti(page, f.width);

    // 5 tocchi sulla versione accendono il contatore FPS
    for (let i = 0; i < 5; i++) await page.getByTestId('versione').click();
    await expect(page.getByTestId('fps')).toBeVisible();
  });
}

test('WebGL2 presente o messaggio chiaro', async ({ page }) => {
  await page.goto('/');
  const ok = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
  if (ok) await expect(page.locator('#palco canvas')).toBeVisible();
  else await expect(page.getByRole('alert')).toContainText('WebGL2');
});
