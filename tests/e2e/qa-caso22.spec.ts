// QA M1 · caso 22 di 13 col doppio joystick fisso (scelta del proprietario 21/11), sulla battaglia vera e con
// tocchi veri (CDP): un pollice tiene il joystick di movimento, l'altro trascina la mira e poi tocca FUOCO (tasto staccato dalla mira) →
// il colpo parte. Ogni tocco resta del controllo dove comincia, quindi i due diti non si disturbano.
// Proprietario: Lead test/QA (riscritto dall'HUD per il passaggio dalla fionda al doppio joystick).
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 800, height: 360 }, hasTouch: true, isMobile: true });

test('caso 22: joystick di movimento tenuto + mira trascinata + FUOCO → il colpo parte', async ({ page, context }) => {
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
  const mov = await box('joystick-movimento');
  const mira = await box('joystick-mira');
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
  const joy = { x: mov.x + 40, y: mov.y, id: 1 };
  await tocca('touchStart', [{ ...mov, id: 1 }]);
  await tocca('touchMove', [joy]);
  // secondo pollice sulla corona di mira (fuori da FUOCO), trascinato in su
  await tocca('touchStart', [joy, { x: mira.x - 30, y: mira.y, id: 2 }]);
  for (let i = 1; i <= 5; i++) await tocca('touchMove', [joy, { x: mira.x - 30, y: mira.y - 10 * i, id: 2 }]);
  await tocca('touchEnd', [joy]);
  // il movimento è ancora tenuto: FUOCO col secondo pollice
  await tocca('touchStart', [joy, { ...fuoco, id: 3 }]);
  await tocca('touchEnd', [joy]);
  await tocca('touchEnd', []);
  const comandi = await page.evaluate(() => (window as any).__comandi as { t: string }[]);
  const tipi = comandi.map((c) => c.t);
  expect(tipi[0]).toBe('muovi');
  expect(tipi).toContain('mira');
  expect(tipi.filter((t) => t === 'fuoco')).toHaveLength(1);
  // la mira non è mai arrivata dopo FUOCO, e il movimento si ferma al rilascio
  expect(tipi.indexOf('fuoco')).toBeGreaterThan(tipi.lastIndexOf('mira'));
  expect(comandi[comandi.length - 1]).toEqual({ t: 'muovi', dir: 0 });
  await expect.poll(() => page.evaluate(() => (window as any).__kaboom.bus.battaglia.value.fase)).not.toBe('azione');
});
