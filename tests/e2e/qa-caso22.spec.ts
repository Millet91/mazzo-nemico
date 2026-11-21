// QA M1 · caso 22 di 13 coi comandi v3 (21/11: niente joystick, mirino da trascinare), sulla battaglia vera e
// con tocchi veri (CDP): un pollice tiene la freccia ▶, l'altro trascina il mirino oro sul canvas e poi tocca
// FUOCO → il colpo parte. Ogni tocco resta del controllo dove comincia, quindi i due diti non si disturbano.
// Proprietario: Lead test/QA (riscritto dall'agente Comandi per il passaggio dal doppio joystick al mirino).
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 800, height: 360 }, hasTouch: true, isMobile: true });

test('caso 22: freccia tenuta + mirino trascinato + FUOCO → il colpo parte', async ({ page, context }) => {
  await page.goto('/?prova');
  await page.locator('#schermaglia').click();
  await page.locator('#salpa').click();
  await page.waitForFunction(() => {
    const v = (window as any).__kaboom.bus.battaglia.value;
    return v?.fase === 'azione' && v?.tocca === 'umano';
  }, null, { timeout: 20_000 });
  const box = async (id: string) => {
    const b = (await page.getByTestId(id).boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const destra = await box('tasto-destra');
  const fuoco = await box('tasto-fuoco');
  await page.evaluate(() => {
    const w = window as any;
    w.__comandi = [];
    w.__kaboom.bus.comandi.ascolta((c: unknown) => w.__comandi.push(c));
  });
  const cdp = await context.newCDPSession(page);
  const tocca = async (type: string, touchPoints: { x: number; y: number; id: number }[]) => {
    await cdp.send('Input.dispatchTouchEvent', { type: type as 'touchStart', touchPoints });
    await page.waitForTimeout(60);
  };
  const tieni = { ...destra, id: 1 };
  await tocca('touchStart', [tieni]);
  await page.waitForTimeout(300);
  // secondo pollice sul mirino oro (il pirata ha camminato: si chiede dov'è adesso), trascinato in su
  const m = (await page.evaluate(() => (window as any).__kaboom.mirino())) as { x: number; y: number };
  await tocca('touchStart', [tieni, { x: m.x, y: m.y, id: 2 }]);
  for (let i = 1; i <= 5; i++) await tocca('touchMove', [tieni, { x: m.x, y: m.y - 10 * i, id: 2 }]);
  await tocca('touchEnd', [tieni]);
  // FUOCO col secondo pollice
  await tocca('touchStart', [tieni, { ...fuoco, id: 3 }]);
  await tocca('touchEnd', [tieni]);
  await tocca('touchEnd', []);
  const comandi = await page.evaluate(() => (window as any).__comandi as { t: string }[]);
  const tipi = comandi.map((c) => c.t);
  expect(tipi[0]).toBe('muovi');
  expect(tipi).toContain('mira');
  expect(tipi.filter((t) => t === 'fuoco')).toHaveLength(1);
  // la mira non è mai arrivata dopo FUOCO, e il movimento si ferma al rilascio
  // (FUOCO spara al rilascio del dito, quindi può arrivare dopo lo stop del movimento)
  expect(tipi.indexOf('fuoco')).toBeGreaterThan(tipi.lastIndexOf('mira'));
  expect(comandi.filter((c) => c.t === 'muovi').at(-1)).toEqual({ t: 'muovi', dir: 0 });
  await expect.poll(() => page.evaluate(() => (window as any).__kaboom.bus.battaglia.value.fase)).not.toBe('azione');
});
