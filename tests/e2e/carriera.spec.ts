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

/** Tocco su un'isola (via bus), dopo che la scena del mondo ha finito di animare. */
async function tocca(page: Page, id: string) {
  await page.waitForFunction(() => !(window as unknown as { __kaboom: K }).__kaboom.bus.mondoOccupato.value, null, { timeout: 15_000 });
  await page.evaluate((id) => (window as unknown as { __kaboom: K }).__kaboom.bus.isolaToccata.invia(id), id);
}

/** Tocco VERO sullo schermo al centro dell'isola (scena Pixi del mondo). */
async function toccaSchermo(page: Page, id: string) {
  await page.waitForFunction(() => !(window as unknown as { __kaboom: K }).__kaboom.bus.mondoOccupato.value, null, { timeout: 15_000 });
  const p = await page.evaluate((id) => (window as unknown as { __kaboom: { mondo: { schermoDaIsola(id: string): { x: number; y: number } } } }).__kaboom.mondo.schermoDaIsola(id), id);
  await page.mouse.click(p.x, p.y);
}
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

// Il capitolo intero a regole pure è in tests/mondo/regole.test.ts; qui un round vero con la Marina e poi l'ultima
// isola (stato preparato sul bus), per tenere il test leggero anche nella CI con la grafica software.
test('round 1 con la Marina, poi l\'ultima isola: fine capitolo, stelle e salvataggio', async ({ page }) => {
  test.setTimeout(90_000);
  await apri(page);
  await page.click('#carriera');
  await expect(page.getByTestId('car-scena')).toBeVisible();
  await chiudiAvvisi(page);

  // round 1: rinforzi, conquista di 1C da Porto Teschio, fine turno (round protetto)
  await tocca(page, '1A');
  for (let n = 0; n < 2; n++) await tocca(page, '1B');
  await expect(page.getByTestId('car-attacco')).toBeVisible();
  await tocca(page, '1A');
  await tocca(page, '1C');
  await expect(page.getByTestId('car-pannello-attacco')).toBeVisible();
  await page.click('#car-arrembaggio');
  await finisciBattaglia(page, 0, [3, 0]);
  await chiudiAvvisi(page);
  expect((await stato(page)).isole['1C'].padrone).toBe('giocatore');
  await page.click('#car-fine-turno');
  await expect.poll(async () => (await stato(page)).round).toBe(2);

  // tutto preso tranne 1H: Duello finale da 1G
  await page.evaluate(() => {
    const b = (window as unknown as { __kaboom: K }).__kaboom.bus;
    const s = JSON.parse(JSON.stringify(b.carriera.value));
    for (const id of Object.keys(s.isole)) if (id !== '1H') s.isole[id] = { padrone: 'giocatore', pirati: 3, presa: true };
    Object.assign(s, { fase: 'attacco', rinforzi: 0, usate: [], conquisteRound: [], round: 5 });
    b.carriera.value = s;
  });
  await tocca(page, '1H');
  await expect(page.getByTestId('car-pannello-attacco')).toBeVisible();
  await page.click('#car-arrembaggio');
  await finisciBattaglia(page, 0, [1, 0]);
  await chiudiAvvisi(page);
  await expect(page.getByTestId('car-fine')).toBeVisible();
  const s = await stato(page);
  expect(s.fase).toBe('fine');
  expect(s.bandiere).toContain('teschioFumante');
  expect(s.stelle[1]).toBe(3);
  await page.screenshot({ path: 'test-results/carriera-fine.png' });

  // il salvataggio sopravvive al riavvio
  await page.reload();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __kaboom: K }).__kaboom.bus.carriera.value?.stelle?.[1])).toBe(3);
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

test('giro: menu → Carriera → attacco a 1D sulla mappa vera → vittoria → bandierina e «Nuovo!»', async ({ page }) => {
  await apri(page);
  await page.click('#carriera');
  await chiudiAvvisi(page);
  await expect(page.getByTestId('car-rinforzi')).toBeVisible();
  await page.waitForFunction(() => !!(window as unknown as { __kaboom: { mondo?: unknown } }).__kaboom.mondo, null, { timeout: 20_000 });
  const animazioni: { t: string; isola?: string }[] = [];
  await page.exposeFunction('registraAnimazione', (a: { t: string; isola?: string }) => animazioni.push(a));
  await page.evaluate(() => (window as unknown as { __kaboom: K }).__kaboom.bus.animaMondo.ascolta((a: unknown) => (window as unknown as { registraAnimazione(a: unknown): void }).registraAnimazione(a)));
  // 3 rinforzi su Baia dei Corvi, toccando lo schermo
  for (let n = 0; n < 3; n++) await toccaSchermo(page, '1B');
  await expect(page.getByTestId('car-attacco')).toBeVisible();
  expect((await stato(page)).isole['1B'].pirati).toBe(5);
  await toccaSchermo(page, '1D');
  await expect(page.getByTestId('car-pannello-attacco')).toBeVisible();
  await page.click('#car-arrembaggio');
  await finisciBattaglia(page, 0, [4, 0]);
  await expect(page.getByTestId('car-premio')).toBeVisible();
  const s = await stato(page);
  expect(s.isole['1D']).toMatchObject({ padrone: 'giocatore', presa: true });
  expect(s.mosse).toContain('saltoAppoggio');
  await expect.poll(() => animazioni).toContainEqual({ t: 'conquista', isola: '1D' });
  await page.screenshot({ path: 'test-results/carriera-nuovo.png' });
});
