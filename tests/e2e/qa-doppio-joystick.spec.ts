// QA M1 · regole del doppio joystick (design/comandi/doppio-joystick.md, "Zone di tocco"), sulla battaglia vera
// con tocchi veri (CDP). Si aggiunge a qa-caso22.spec.ts (due pollici insieme):
// - un trascinamento che parte sulla corona di mira non spara mai, e al rilascio la mira resta;
// - un tocco su FUOCO non muove la mira; doppio tocco su FUOCO = un solo sparo;
// - il pinch fuori dai joystick arriva al canvas (zoom) e non produce comandi.
// Proprietario: Lead test/QA.
import { test, expect, type Page, type BrowserContext } from '@playwright/test';

test.use({ viewport: { width: 800, height: 360 }, hasTouch: true, isMobile: true });

type Punto = { x: number; y: number; id: number };

async function prepara(page: Page, context: BrowserContext) {
  await page.goto('/?prova');
  await page.locator('#schermaglia').click();
  await page.locator('#salpa').click();
  await page.waitForFunction(() => {
    const v = (window as any).__kaboom.bus.battaglia.value;
    return v?.fase === 'azione' && v?.tocca === 'umano';
  }, null, { timeout: 20_000 });
  await page.evaluate(() => {
    const w = window as any;
    w.__comandi = []; w.__dita = [];
    w.__kaboom.bus.comandi.ascolta((c: unknown) => w.__comandi.push(c));
    window.addEventListener('pointerdown', (e) => w.__dita.push((e.target as HTMLElement).tagName), true);
  });
  const centro = async (id: string) => {
    const b = (await page.getByTestId(id).boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const cdp = await context.newCDPSession(page);
  const tocca = async (type: 'touchStart' | 'touchMove' | 'touchEnd', touchPoints: Punto[]) => {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
    await page.waitForTimeout(60);
  };
  const comandi = () => page.evaluate(() => (window as any).__comandi as { t: string }[]);
  const fase = () => page.evaluate(() => (window as any).__kaboom.bus.battaglia.value.fase as string);
  const testoMira = () => page.getByTestId('mira').innerText();
  return { mira: await centro('joystick-mira'), fuoco: await centro('tasto-fuoco'), tocca, comandi, fase, testoMira };
}

test('la corona di mira non spara mai e al rilascio la mira resta', async ({ page, context }) => {
  const { mira, tocca, comandi, fase, testoMira } = await prepara(page, context);
  const prima = await testoMira();
  await tocca('touchStart', [{ x: mira.x - 55, y: mira.y, id: 1 }]);
  for (let i = 1; i <= 6; i++) await tocca('touchMove', [{ x: mira.x - 55, y: mira.y - 8 * i, id: 1 }]);
  // il dito finisce proprio sopra FUOCO: il trascinamento è nato sulla corona, quindi non deve sparare
  await tocca('touchMove', [{ x: mira.x, y: mira.y, id: 1 }]);
  await tocca('touchEnd', []);
  await page.waitForTimeout(300);
  const c = await comandi();
  expect(c.some((x) => x.t === 'mira')).toBe(true);
  expect(c.filter((x) => x.t === 'fuoco')).toHaveLength(0);
  expect(await fase()).toBe('azione');
  const dopo = await testoMira();
  expect(dopo).not.toBe(prima);
  await page.waitForTimeout(300);
  expect(await testoMira()).toBe(dopo); // il pomello resta dov'è
});

test('FUOCO non muove la mira e il doppio tocco spara una volta sola', async ({ page, context }) => {
  const { fuoco, tocca, comandi, fase } = await prepara(page, context);
  // tocco su FUOCO con un piccolo strisciamento del dito: niente mira
  await tocca('touchStart', [{ ...fuoco, id: 1 }]);
  await tocca('touchMove', [{ x: fuoco.x + 6, y: fuoco.y - 6, id: 1 }]);
  await tocca('touchEnd', []);
  await tocca('touchStart', [{ ...fuoco, id: 2 }]);
  await tocca('touchEnd', []);
  const c = await comandi();
  expect(c.filter((x) => x.t === 'mira')).toHaveLength(0);
  expect(c.filter((x) => x.t === 'fuoco')).toHaveLength(1);
  await expect.poll(fase).not.toBe('azione');
});

test('il pinch fuori dai joystick arriva al canvas e non comanda il pirata', async ({ page, context }) => {
  const { tocca, comandi, fase } = await prepara(page, context);
  await tocca('touchStart', [{ x: 360, y: 150, id: 1 }, { x: 440, y: 150, id: 2 }]);
  for (let i = 1; i <= 5; i++) await tocca('touchMove', [{ x: 360 - 15 * i, y: 150, id: 1 }, { x: 440 + 15 * i, y: 150, id: 2 }]);
  await tocca('touchEnd', []);
  expect(await page.evaluate(() => (window as any).__dita)).toEqual(['CANVAS', 'CANVAS']);
  expect(await comandi()).toEqual([]);
  expect(await fase()).toBe('azione');
});
