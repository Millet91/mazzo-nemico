// Menu del Pacchetto 2 (Arte UI): pulsante grande "Carriera" che apre la mappa del mondo, "Schermaglia" sotto,
// kit dipinto caricato (le immagini delle variabili CSS si leggono davvero), indietro torna al menu.
import { test, expect } from '@playwright/test';

test('menu: Carriera grande, Schermaglia sotto, Carriera porta alla mappa e si torna', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 360 });
  await page.goto('/?prova');
  const carriera = page.locator('#carriera'), schermaglia = page.locator('#schermaglia');
  await expect(carriera).toContainText('Carriera');
  await expect(schermaglia).toContainText('Schermaglia');
  const [c, s] = [await carriera.boundingBox(), await schermaglia.boundingBox()];
  expect(c!.height).toBeGreaterThan(s!.height);
  expect(c!.width).toBeGreaterThan(s!.width);
  expect(s!.y).toBeGreaterThan(c!.y + c!.height - 4);
  // le immagini del kit si caricano (non un riquadro vuoto)
  const caricate = await page.evaluate(async () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--kit-pulsante-oro');
    const url = /url\("?([^")]+)"?\)/.exec(v)?.[1];
    if (!url) return false;
    const r = await fetch(url);
    return r.ok && (r.headers.get('content-type') ?? '').includes('webp');
  });
  expect(caricate).toBe(true);
  await page.screenshot({ path: 'test-results/screenshot/menu-p2-20x9.png' });

  await carriera.click();
  expect(await page.evaluate(() => (window as any).__kaboom.bus.schermata.value)).toBe('mondo');
  await expect(carriera).toBeHidden();
  await page.locator('#torna-menu').click();
  await expect(carriera).toBeVisible();

  await carriera.click();
  expect(await page.evaluate(() => (window as any).__kaboom.gestisciIndietro())).toBe(true);
  await expect(carriera).toBeVisible();
});

test('kit: premio "Nuovo!" con due premi e scena su pergamena (vetrina)', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 360 });
  await page.goto('/?vetrina-kit');
  await page.locator('#v-nuovo').click();
  const premio = page.getByTestId('car-premio');
  await expect(premio).toContainText('Nuovo!');
  await expect(premio.locator('.kit-nuovo-premio')).toHaveCount(2);
  const ok = await page.locator('#car-premio-ok').boundingBox();
  expect(ok!.y + ok!.height).toBeLessThanOrEqual(360);
  await page.screenshot({ path: 'test-results/screenshot/kit-nuovo-20x9.png' });
  await page.locator('#car-premio-ok').click();
  await expect(premio).toBeHidden();

  await page.locator('#v-scena').click();
  const scena = page.getByTestId('car-scena');
  const prima = await scena.locator('.kit-scena-testo').textContent();
  await page.locator('#car-avanti').click();
  // un tocco su Avanti fa avanzare di UNA battuta (non due: il tocco non arriva anche alla pergamena)
  const dopo = await scena.locator('.kit-scena-testo').textContent();
  expect(dopo).not.toBe(prima);
  await page.locator('#car-avanti').click();
  expect(await scena.locator('.kit-scena-testo').textContent()).toBe(prima);
  const r = await scena.locator('.kit-scena-foglio').boundingBox();
  expect(r!.height).toBeLessThan(180);
  await page.screenshot({ path: 'test-results/screenshot/kit-scena-20x9.png' });
  await page.locator('#car-salta').click();
  await expect(scena).toBeHidden();
});
