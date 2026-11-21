// QA M1 · caso 22 di 13 con i comandi nuovi (m1-ritmo §1), sulla battaglia vera e con tocchi veri (CDP):
// un pollice tiene il joystick, l'altro tira la fionda dall'anello del pirata e la rilascia → il colpo parte.
// Il joystick è un elemento DOM e la fionda sta sul canvas: il test controlla che i due diti non si disturbino
// (per esempio un pinch scambiato per fionda). Proprietario: Lead test/QA.
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 800, height: 360 }, hasTouch: true, isMobile: true });

test('caso 22: joystick tenuto + fionda tirata e rilasciata → il colpo parte', async ({ page, context }) => {
  await page.goto('/?prova');
  await page.locator('#schermaglia').click();
  await page.locator('#salpa').click();
  await page.waitForFunction(() => {
    const v = (window as any).__kaboom.bus.battaglia.value;
    return v?.fase === 'azione' && v?.tocca === 'umano';
  }, null, { timeout: 20_000 });
  await page.waitForTimeout(1200); // fine del volo della camera: il pirata attivo è al centro dello schermo
  const zona = (await page.getByTestId('joystick').boundingBox())!;
  const centro = { x: 400, y: 178 };
  const dito: string[] = [];
  await page.evaluate(() => {
    (window as any).__dita = [];
    for (const t of ['pointerdown', 'pointerup']) window.addEventListener(t, (e) => {
      (window as any).__dita.push(`${t}:${(e.target as HTMLElement).tagName}`);
    }, true);
  });
  const cdp = await context.newCDPSession(page);
  const tocca = async (type: string, touchPoints: { x: number; y: number; id: number }[]) => {
    await cdp.send('Input.dispatchTouchEvent', { type: type as 'touchStart', touchPoints });
    await page.waitForTimeout(60);
  };
  const joy = { x: zona.x + 40, y: zona.y + zona.height - 40, id: 1 };
  await tocca('touchStart', [joy]);
  await tocca('touchStart', [joy, { ...centro, id: 2 }]);
  for (let i = 1; i <= 5; i++) await tocca('touchMove', [joy, { x: centro.x - 16 * i, y: centro.y + 10 * i, id: 2 }]);
  await tocca('touchEnd', []);
  dito.push(...(await page.evaluate(() => (window as any).__dita as string[])));
  expect(dito).toEqual(['pointerdown:DIV', 'pointerdown:CANVAS', 'pointerup:DIV', 'pointerup:CANVAS']);
  await expect.poll(() => page.evaluate(() => (window as any).__kaboom.bus.battaglia.value.fase)).not.toBe('azione');
});
