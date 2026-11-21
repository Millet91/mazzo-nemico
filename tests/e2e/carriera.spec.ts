// L4 della carriera (P2, Campagna): dal menu si entra in Carriera, si piazzano i rinforzi, si attacca, la battaglia
// parte davvero (bus.richiestaBattaglia) e il suo esito si finge sul bus (come il pannello «Continua»), fino alla
// fine del cap. 1. Poi salvataggio e ripresa, e battaglia lasciata a metà.
import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 800, height: 360 }, hasTouch: true });

type K = { bus: any };

async function apri(page: Page) {
  await page.goto('/?prova');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#carriera')).toBeEnabled();
}

/** Chiude scene e pannelli «Nuovo!» aperti. */
async function chiudiAvvisi(page: Page) {
  for (let i = 0; i < 12; i++) {
    if (await page.locator('#car-salta').isVisible()) await page.click('#car-salta');
    else if (await page.locator('#car-premio-ok').isVisible()) await page.click('#car-premio-ok');
    else return;
  }
}

const tocca = (page: Page, id: string) => page.evaluate((id) => (window as unknown as { __kaboom: K }).__kaboom.bus.isolaToccata.invia(id), id);
const stato = (page: Page) => page.evaluate(() => (window as unknown as { __kaboom: K }).__kaboom.bus.carriera.value);

/** Finge la fine della battaglia in corso: esito sul bus e «Continua». */
async function finisciBattaglia(page: Page, vincitore: 0 | 1, superstiti: [number, number]) {
  await expect.poll(() => page.evaluate(() => !!(window as unknown as { __kaboom: K }).__kaboom.bus.richiestaBattaglia.value)).toBe(true);
  await page.evaluate(([vincitore, superstiti]) => {
    const b = (window as unknown as { __kaboom: K }).__kaboom.bus;
    b.battaglia.value = { ...(b.battaglia.value ?? {}), esito: { vincitore, motivo: 'eliminazione', superstiti, pvTotali: [100, 0], turni: 4, annegati: [0, 0] } };
    b.richiestaBattaglia.value = null;
  }, [vincitore, superstiti] as const);
}

test('cap. 1 dall\'inizio alla fine con battaglie finte vinte', async ({ page }) => {
  test.setTimeout(120_000);
  await apri(page);
  await page.click('#carriera');
  await expect(page.getByTestId('car-scena')).toBeVisible();
  await chiudiAvvisi(page);

  for (let giro = 0; giro < 8; giro++) {
    let s = await stato(page);
    if (s.fase === 'fine') break;
    // rinforzi: sull'isola del giocatore con meno pirati
    for (let n = 0; n < 12 && s.fase === 'rinforzi'; n++) {
      const mie = Object.entries(s.isole).filter(([, i]: [string, any]) => i.padrone === 'giocatore' && i.pirati < 5)
        .sort((a: any, b: any) => a[1].pirati - b[1].pirati);
      if (!mie.length) { await page.click('#car-fine-rinforzi'); break; }
      await tocca(page, mie[0][0]);
      s = await stato(page);
    }
    await expect(page.getByTestId('car-attacco')).toBeVisible();
    // attacca tutto quello che si può
    for (let n = 0; n < 6; n++) {
      const bersaglio = await page.evaluate(() => (window as unknown as { __kaboom: K }).__kaboom.bus.evidenzaMondo.value.toccabili)
        .then(async (t: string[]) => { const st = await stato(page); return t.find((id) => st.isole[id].padrone === 'marina'); });
      if (!bersaglio) break;
      await tocca(page, bersaglio);
      await expect(page.getByTestId('car-pannello-attacco')).toBeVisible();
      await page.click('#car-arrembaggio');
      await finisciBattaglia(page, 0, [2, 0]);
      await chiudiAvvisi(page);
      if ((await stato(page)).fase === 'fine') break;
    }
    if ((await stato(page)).fase === 'fine') break;
    await page.click('#car-fine-turno');
    if (await page.getByTestId('car-difesa').isVisible()) {
      await page.click('#car-difendi');
      await finisciBattaglia(page, 1, [0, 1]);
    }
    await chiudiAvvisi(page);
  }

  const s = await stato(page);
  expect(s.fase).toBe('fine');
  expect(Object.values(s.isole).every((i: any) => i.padrone === 'giocatore')).toBe(true);
  expect(s.armi).toEqual(expect.arrayContaining(['rampino', 'ancora']));
  expect(s.reclute).toHaveLength(2);
  await chiudiAvvisi(page);
  await expect(page.getByTestId('car-fine')).toBeVisible();
  expect(s.stelle[1]).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: 'test-results/carriera-fine.png' });

  // il salvataggio sopravvive al riavvio
  await page.reload();
  await expect(page.locator('#carriera')).toContainText('Continua');
});

test('battaglia lasciata a metà: si torna a prima dell\'attacco', async ({ page }) => {
  await apri(page);
  await page.click('#carriera');
  await chiudiAvvisi(page);
  for (let n = 0; n < 3; n++) await tocca(page, '1B');
  const prima = await stato(page);
  await tocca(page, '1C');
  await page.click('#car-arrembaggio');
  await expect.poll(() => page.evaluate(() => !!(window as unknown as { __kaboom: K }).__kaboom.bus.richiestaBattaglia.value)).toBe(true);
  // app chiusa durante la battaglia: al riavvio l'attacco non c'è
  await page.reload();
  await expect(page.locator('#carriera')).toBeEnabled();
  const dopo = await stato(page);
  expect(dopo.attacco).toBeNull();
  expect(dopo.isole).toEqual(prima.isole);
  expect(dopo.fase).toBe('attacco');
});

test('i pannelli della carriera stanno nello schermo a 800×360', async ({ page }) => {
  await apri(page);
  await page.click('#carriera');
  await chiudiAvvisi(page);
  await tocca(page, '1A');
  for (let n = 0; n < 2; n++) await tocca(page, '1B');
  await tocca(page, '1C');
  const pannello = page.getByTestId('car-pannello-attacco');
  await expect(pannello).toBeVisible();
  const r = await pannello.boundingBox();
  expect(r!.x).toBeGreaterThanOrEqual(0);
  expect(r!.y).toBeGreaterThanOrEqual(0);
  expect(r!.x + r!.width).toBeLessThanOrEqual(800);
  expect(r!.y + r!.height).toBeLessThanOrEqual(360);
  for (const id of ['#car-arrembaggio', '#car-annulla']) {
    const b = await page.locator(id).boundingBox();
    expect(b!.height).toBeGreaterThanOrEqual(44);
  }
});
