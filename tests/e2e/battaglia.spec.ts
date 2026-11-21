// L4 dell'HUD di battaglia (agente D, piano QA §2): menu → Schermaglia, HUD nei 3 formati con i controlli su
// misure e bordi (tasti ≥ 64, FUOCO 80, 56 px dal bordo corto, 16 dal basso, 12 tra i tasti), griglia armi,
// pausa, esito, mancini, turno dell'IA, multitouch (caso 22) e tasto indietro (caso 23).
// Due tipi di prova: (1) con la battaglia vera del ciclo di gioco (B), partendo da Schermaglia; (2) con una
// VistaBattaglia finta scritta sul bus (gancio ?prova di ui/App.tsx) senza richiesta di battaglia, così B non parte
// e si provano a colpo sicuro misure, griglia, pausa ed esito. Gli screenshot a seme fisso al tick 0 e 600 arrivano
// dopo l'unione di A e C (oggi sim e mappa sono ancora segnaposto).
import { test, expect, type Page } from '@playwright/test';

const FORMATI = [
  { nome: '20x9', width: 800, height: 360 },
  { nome: '844x390', width: 844, height: 390 },
  { nome: 'tablet', width: 1024, height: 768 },
];

const INFINITE = { cannone: -1, granata: -1, pistola: -1, sciabola: -1 };

function vista(p: Record<string, unknown> = {}) {
  const sq = (ciurma: string, controllo: string, pv: number, vivi: number) => ({ ciurma, controllo, pvTotali: pv, pvIniziali: 210, vivi, iniziali: 3 });
  return {
    numeroTurno: 1, turnoLimite: 18, mareSaleDalTurno: 12, squadraDiTurno: 0, tocca: 'umano', fase: 'azione',
    secondiRimasti: 24, timerAvviato: true, vento: -4, ventoMax: 6,
    squadre: [sq('teschio', 'umano', 180, 3), sq('marina', 'ia', 120, 2)],
    arma: 'cannone', munizioni: INFINITE, miccia: 3, miraGradi: 45, potenza: 60, iaPensa: false,
    puoArrendersi: false, esito: null, ...p,
  };
}

/** Apre il gioco con il gancio di prova e pubblica una vista finta (senza richiesta: B resta fermo). Registra comandi e azioni. */
async function entraInBattaglia(page: Page, v = vista(), classici = true) {
  await page.goto('/?prova');
  await expect(page.locator('#schermaglia')).toBeVisible();
  await page.evaluate(([v, classici]) => {
    const w = window as unknown as { __kaboom: any; registro: { comandi: unknown[]; azioni: unknown[] } };
    w.__kaboom.preferenze.comandiClassici.value = classici;
    w.registro = { comandi: [], azioni: [] };
    w.__kaboom.bus.comandi.ascolta((c: unknown) => w.registro.comandi.push(c));
    w.__kaboom.bus.azioni.ascolta((a: unknown) => w.registro.azioni.push(a));
    // come fa il ciclo di gioco (B): all'uscita svuota la battaglia
    w.__kaboom.bus.azioni.ascolta((a: { t: string }) => {
      if (a.t === 'esci') { w.__kaboom.bus.battaglia.value = null; w.__kaboom.bus.richiestaBattaglia.value = null; }
    });
    w.__kaboom.bus.battaglia.value = v;
  }, [v, classici] as const);
  await expect(page.getByTestId('hud')).toBeVisible();
}

async function aggiorna(page: Page, p: Record<string, unknown>) {
  await page.evaluate((p) => {
    const b = (window as any).__kaboom.bus.battaglia;
    b.value = { ...b.value, ...p };
  }, p);
}

const registro = (page: Page) => page.evaluate(() => (window as any).registro as { comandi: any[]; azioni: any[] });

async function rettangoli(page: Page, selettore: string) {
  return page.locator(selettore).evaluateAll((els) => els
    .filter((e) => (e as HTMLElement).offsetParent !== null)
    .map((e) => { const r = e.getBoundingClientRect(); return { id: e.id || e.textContent || '', x: r.x, y: r.y, w: r.width, h: r.height }; }));
}

async function controllaTasti(page: Page, larghezza: number, altezza: number, minimo = 7) {
  const tasti = await rettangoli(page, '.hud .tasto');
  expect(tasti.length).toBeGreaterThanOrEqual(minimo);
  for (const t of tasti) {
    const min = t.id === 'chip-miccia' ? 48 : 64;
    expect(t.w, `${t.id} stretto`).toBeGreaterThanOrEqual(64);
    expect(t.h, `${t.id} basso`).toBeGreaterThanOrEqual(min);
    expect(t.x, `${t.id} vicino al bordo sinistro`).toBeGreaterThanOrEqual(56);
    expect(t.x + t.w, `${t.id} vicino al bordo destro`).toBeLessThanOrEqual(larghezza - 56);
    expect(t.y + t.h, `${t.id} vicino al bordo basso`).toBeLessThanOrEqual(altezza - 16);
  }
  const fuoco = tasti.find((t) => t.id === 'tasto-fuoco');
  if (fuoco) {
    expect(Math.round(fuoco.w)).toBe(80);
    expect(Math.round(fuoco.h)).toBe(80);
  }
  // almeno 12 px tra un tasto e l'altro
  for (let i = 0; i < tasti.length; i++) for (let j = i + 1; j < tasti.length; j++) {
    const a = tasti[i], b = tasti[j];
    const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
    const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
    expect(Math.max(dx, dy), `${a.id} e ${b.id} troppo vicini`).toBeGreaterThanOrEqual(11.5);
  }
  // nessun pulsante (pausa compresa) entro 56 px dal bordo corto
  for (const b of await rettangoli(page, '.battaglia button')) {
    expect(b.x, `${b.id} vicino al bordo sinistro`).toBeGreaterThanOrEqual(56);
    expect(b.x + b.w, `${b.id} vicino al bordo destro`).toBeLessThanOrEqual(larghezza - 56);
  }
}

test('Schermaglia avvia la battaglia vera di M1 e si esce dalla pausa', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 360 });
  await page.goto('/?prova');
  await expect(page.locator('#schermaglia')).toContainText('Schermaglia');
  await page.locator('#schermaglia').click();
  await page.locator('#salpa').click();
  const cfg = await page.evaluate(() => (window as any).__kaboom.bus.richiestaBattaglia.value);
  expect(cfg.squadre[0]).toMatchObject({ ciurma: 'teschio', controllo: 'umano', pirati: 3 });
  expect(cfg.squadre[1]).toMatchObject({ ciurma: 'marina', controllo: 'ia', livelloIa: 'mozzo', pirati: 3 });
  expect(cfg.timerSecondi).toBe(30);
  // il ciclo di gioco pubblica la vista: HUD vero, titolo e menu nascosti, comandi nel turno del Teschio
  await expect(page.getByTestId('hud')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Kaboom Ahoy!' })).toBeHidden();
  await expect(page.locator('#tasto-arma')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('joystick')).toBeVisible();
  await expect(page.getByTestId('squadra-0')).toHaveAttribute('aria-label', /Teschio Rosso: 210 PV, 3 in piedi/);
  await page.screenshot({ path: 'test-results/screenshot/battaglia-vera-20x9.png' });
  await controllaTasti(page, 800, 360, 1);
  await page.locator('#pausa').click();
  await expect(page.getByTestId('pausa')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__kaboom.bus.battagliaInPausa.value)).toBe(true);
  await page.locator('#esci').click();
  await expect(page.locator('#schermaglia')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__kaboom.bus.battaglia.value)).toBeNull();
  // seme nuovo a ogni partita
  await page.locator('#schermaglia').click();
  await page.locator('#salpa').click();
  const cfg2 = await page.evaluate(() => (window as any).__kaboom.bus.richiestaBattaglia.value);
  expect(cfg2.seme).not.toBe(cfg.seme);
});

for (const f of FORMATI) {
  test(`HUD di battaglia · ${f.nome}`, async ({ page }) => {
    await page.setViewportSize({ width: f.width, height: f.height });
    await entraInBattaglia(page);
    await expect(page.getByTestId('timer')).toHaveText('24');
    await expect(page.getByTestId('turno')).toHaveText('Turno 1/18');
    await expect(page.getByTestId('mira')).toHaveText('45° · 60%');
    await expect(page.getByTestId('squadra-0')).toHaveAttribute('aria-label', /Teschio Rosso: 180 PV/);
    await page.screenshot({ path: `test-results/screenshot/hud-${f.nome}.png` });
    await controllaTasti(page, f.width, f.height);

    // con la granata compare il chip della miccia sopra SALTA
    await aggiorna(page, { arma: 'granata' });
    await expect(page.locator('#chip-miccia')).toHaveText(/3 s/);
    await controllaTasti(page, f.width, f.height);

    // griglia armi
    await page.locator('#tasto-arma').click();
    await expect(page.getByTestId('griglia-armi')).toBeVisible();
    await page.screenshot({ path: `test-results/screenshot/armi-${f.nome}.png` });
    // timer e vento restano visibili sopra la griglia (il timer non si ferma)
    const [timer] = await rettangoli(page, '[data-testid="timer"]');
    const [vento] = await rettangoli(page, '[data-testid="vento"]');
    const [griglia] = await rettangoli(page, '[data-testid="griglia-armi"]');
    expect(griglia.y, 'la griglia copre il timer').toBeGreaterThanOrEqual(timer.y + timer.h);
    expect(griglia.y, 'la griglia copre il vento').toBeGreaterThanOrEqual(vento.y + vento.h);
    expect(griglia.y + griglia.h).toBeLessThanOrEqual(f.height - 16);
    const celle = await rettangoli(page, '.cella-arma');
    for (const c of celle) { expect(c.x).toBeGreaterThanOrEqual(56); expect(c.x + c.w).toBeLessThanOrEqual(f.width - 56); }
    await page.mouse.click(60, f.height / 2);
    await expect(page.getByTestId('griglia-armi')).toBeHidden();

    // mancini: FUOCO a sinistra, movimento a destra
    await page.evaluate(() => (document.querySelector('.hud') as HTMLElement).classList.add('mancini'));
    const [fuoco] = await rettangoli(page, '#tasto-fuoco');
    const [destra] = await rettangoli(page, '#tasto-destra');
    expect(fuoco.x).toBeLessThan(f.width / 2);
    expect(destra.x).toBeGreaterThan(f.width / 2);
    await controllaTasti(page, f.width, f.height);
    await page.screenshot({ path: `test-results/screenshot/hud-mancini-${f.nome}.png` });
  });
}

test('griglia 4×4: 4 armi attive, tocco sceglie e chiude, tocco fuori chiude, il timer non si ferma', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 360 });
  await entraInBattaglia(page);
  await page.locator('#tasto-arma').click();
  await expect(page.locator('.cella-arma')).toHaveCount(16);
  await expect(page.locator('.cella-arma.attiva')).toHaveCount(4);
  await expect(page.locator('.cella-arma.bloccata')).toHaveCount(12);
  // tocco su un'arma bloccata: non succede niente
  await page.locator('[data-arma="kraken"]').click({ force: true });
  await expect(page.getByTestId('griglia-armi')).toBeVisible();
  await page.locator('[data-arma="granata"]').click();
  await expect(page.getByTestId('griglia-armi')).toBeHidden();
  expect((await registro(page)).comandi).toContainEqual({ t: 'arma', arma: 'granata' });
  // tocco fuori chiude
  await page.locator('#tasto-arma').click();
  await page.mouse.click(70, 180);
  await expect(page.getByTestId('griglia-armi')).toBeHidden();
  // il timer non si ferma: nessuna pausa chiesta
  const r = await registro(page);
  expect(r.azioni).toEqual([]);
  expect(await page.evaluate(() => (window as any).__kaboom.bus.battagliaInPausa.value)).toBe(false);
});

test('comandi: ◀ ▶ tenuti premuti, ▲ a tocco, SALTA doppio tocco, FUOCO una volta sola', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 360 });
  await entraInBattaglia(page);
  const centro = async (id: string) => { const [r] = await rettangoli(page, id); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; };

  const d = await centro('#tasto-destra');
  await page.mouse.move(d.x, d.y);
  await page.mouse.down();
  await page.mouse.up();
  expect((await registro(page)).comandi).toEqual([{ t: 'muovi', dir: 1 }, { t: 'muovi', dir: 0 }]);

  await page.locator('#tasto-su').click();
  expect((await registro(page)).comandi.at(-1)).toEqual({ t: 'ruotaMira', delta: 2 });

  await page.locator('#tasto-salta').dblclick();
  await page.waitForTimeout(400);
  expect((await registro(page)).comandi.filter((c) => c.t === 'salta')).toEqual([{ t: 'salta', indietro: true }]);

  await page.locator('#tasto-fuoco').dblclick();
  expect((await registro(page)).comandi.filter((c) => c.t === 'fuoco')).toHaveLength(1);
});

test('caso 22: due pollici insieme (▶ tenuto e FUOCO) e FUOCO toccato due volte spara una volta', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 360 });
  await entraInBattaglia(page);
  await page.evaluate(() => {
    const tocca = (id: string, tipo: string, pointerId: number) => {
      const el = document.getElementById(id)!;
      const r = el.getBoundingClientRect();
      el.dispatchEvent(new PointerEvent(tipo, { bubbles: true, cancelable: true, pointerId, pointerType: 'touch', isPrimary: pointerId === 1, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
    };
    tocca('tasto-destra', 'pointerdown', 1);
    tocca('tasto-fuoco', 'pointerdown', 2);
    tocca('tasto-fuoco', 'pointerup', 2);
    tocca('tasto-fuoco', 'pointerdown', 3);
    tocca('tasto-fuoco', 'pointerup', 3);
    tocca('tasto-destra', 'pointerup', 1);
  });
  const c = (await registro(page)).comandi;
  expect(c).toEqual([{ t: 'muovi', dir: 1 }, { t: 'fuoco' }, { t: 'muovi', dir: 0 }]);
});

test('turno dell\'IA: i comandi spariscono e il capitano medita', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 360 });
  await entraInBattaglia(page, vista({ tocca: 'ia', squadraDiTurno: 1, iaPensa: true }));
  await expect(page.getByTestId('medita')).toHaveText('Il capitano medita…');
  await expect(page.locator('.hud .tasto:not(#tasto-veloce)')).toHaveCount(0);
  // tasto ×2 sul turno dell'IA (m1-ritmo §3): manda la velocità e si accende
  await page.locator('#tasto-veloce').click();
  expect((await registro(page)).azioni.at(-1)).toEqual({ t: 'velocita', fattore: 2 });
  await expect(page.locator('#tasto-veloce')).toHaveClass(/acceso/);
  await controllaTasti(page, 800, 360, 1);
  await page.screenshot({ path: 'test-results/screenshot/hud-ia-20x9.png' });
  await page.locator('#tasto-veloce').click();
  expect((await registro(page)).azioni.at(-1)).toEqual({ t: 'velocita', fattore: 1 });
  // finito di pensare (mira, volo, risoluzione): la scritta sparisce, i comandi restano nascosti
  await aggiorna(page, { iaPensa: false, fase: 'volo' });
  await expect(page.getByTestId('medita')).toBeHidden();
  await expect(page.locator('.hud .tasto:not(#tasto-veloce)')).toHaveCount(0);
  // in fase di volo, anche nel turno umano, niente comandi
  await aggiorna(page, { tocca: 'umano', squadraDiTurno: 0, iaPensa: false, fase: 'volo' });
  await expect(page.locator('.hud .tasto')).toHaveCount(0);
  // in fuga ci si muove ma non si spara
  await aggiorna(page, { fase: 'fuga' });
  await expect(page.locator('#tasto-destra')).toBeEnabled();
  await expect(page.locator('#tasto-fuoco')).toBeDisabled();
});

test('banner di turno', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 360 });
  await entraInBattaglia(page);
  await page.evaluate(() => {
    (window as any).__kaboom.bus.eventiBattaglia.value = [{ t: 'turnoIniziato', numero: 12, squadra: 1, pirata: 3, vento: 2 }];
  });
  await expect(page.getByTestId('banner')).toHaveText('Turno della Marina Reale');
  await expect(page.getByTestId('banner')).toHaveText('Il mare sale!', { timeout: 3000 });
  // casse (m1-ritmo §9)
  await page.evaluate(() => {
    (window as any).__kaboom.bus.eventiBattaglia.value = [{ t: 'cassaAperta', proiettile: 9, pirata: 0, contenuto: 'rum' }];
  });
  await expect(page.getByTestId('banner')).toHaveText('Rum! +25 PV', { timeout: 3000 });
});

test('joystick: cammina, salta in avanti, salto alto all\'indietro; ARMA rotonda nel colore della ciurma', async ({ page }) => {
  for (const f of FORMATI) {
    await page.setViewportSize({ width: f.width, height: f.height });
    // mira a 45° = pirata girato a destra
    await entraInBattaglia(page, vista({ arma: 'granata' }), false);
    await expect(page.locator('#tasto-fuoco')).toHaveCount(0);
    await expect(page.locator('#tasto-sinistra')).toHaveCount(0);
    await expect(page.locator('#chip-miccia')).toBeVisible();
    await controllaTasti(page, f.width, f.height, 2);
    const [arma] = await rettangoli(page, '#tasto-arma');
    expect(arma.w).toBeGreaterThanOrEqual(64);
    expect(await page.locator('.cerchio-arma').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(229, 72, 77)');
    const [zona] = await rettangoli(page, '[data-testid="joystick"]');
    expect(zona.x).toBeGreaterThanOrEqual(24);
    expect(zona.x + zona.w).toBeLessThanOrEqual(f.width / 2 + 1);

    const x0 = zona.x + zona.w / 2, y0 = zona.y + zona.h / 2;
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    await expect(page.locator('.joystick')).toBeVisible();
    await page.mouse.move(x0 + 40, y0, { steps: 4 });       // destra
    await page.mouse.move(x0 - 40, y0, { steps: 8 });       // sinistra
    await page.mouse.move(x0, y0, { steps: 4 });            // centro: si ferma
    if (f.nome === '20x9') await page.screenshot({ path: 'test-results/screenshot/joystick-20x9.png' });
    await page.mouse.move(x0, y0 - 50, { steps: 4 });       // in alto: salto avanti
    await page.mouse.move(x0, y0, { steps: 4 });
    await page.mouse.up();
    await expect(page.locator('.joystick')).toHaveCount(0);
    let c = (await registro(page)).comandi;
    // passando dal centro si ferma un attimo (zona morta)
    expect(c).toEqual([{ t: 'muovi', dir: 1 }, { t: 'muovi', dir: 0 }, { t: 'muovi', dir: -1 }, { t: 'muovi', dir: 0 }, { t: 'salta', indietro: false }]);

    // nuovo gesto: l'ultimo passo era a sinistra, quindi il pirata guarda a sinistra; in alto a destra = salto alto all'indietro
    await page.evaluate(() => { (window as any).registro.comandi = []; });
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    await page.mouse.move(x0 + 20, y0 - 50, { steps: 6 });
    await page.mouse.up();
    c = (await registro(page)).comandi;
    expect(c).toEqual([{ t: 'salta', indietro: true }]);
    await page.screenshot({ path: `test-results/screenshot/hud-joystick-${f.nome}.png` });
  }
});

test('Schermaglia: da 1 a 5 pirati per lato, scelta salvata', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 360 });
  await page.goto('/?prova');
  await page.locator('#schermaglia').click();
  await expect(page.getByTestId('pirati-0')).toContainText('3');
  for (let i = 0; i < 5; i++) await page.locator('#piu-0').click({ force: true });
  await expect(page.getByTestId('pirati-0')).toContainText('5');
  await expect(page.locator('#piu-0')).toBeDisabled();
  for (let i = 0; i < 2; i++) await page.locator('#meno-1').click();
  await expect(page.getByTestId('pirati-1')).toContainText('1');
  await expect(page.locator('#meno-1')).toBeDisabled();
  await page.screenshot({ path: 'test-results/screenshot/schermaglia-20x9.png' });
  for (const b of await rettangoli(page, '.scelta-schermaglia button')) {
    expect(b.x).toBeGreaterThanOrEqual(56);
    expect(b.x + b.w).toBeLessThanOrEqual(800 - 56);
    expect(b.h).toBeGreaterThanOrEqual(48);
  }
  // il tasto indietro chiude la scelta
  await page.evaluate(() => (window as any).__kaboom.gestisciIndietro());
  await expect(page.locator('#salpa')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#schermaglia')).toContainText('5 contro 1');
  await page.locator('#schermaglia').click();
  await page.locator('#salpa').click();
  const cfg = await page.evaluate(() => (window as any).__kaboom.bus.richiestaBattaglia.value);
  expect(cfg.squadre[0].pirati).toBe(5);
  expect(cfg.squadre[1].pirati).toBe(1);
});

test('pausa: tasto II e indietro di Android (caso 23), Arrenditi dal turno 4, Esci', async ({ page }) => {
  for (const f of FORMATI) {
    await page.setViewportSize({ width: f.width, height: f.height });
    await entraInBattaglia(page);
    // tasto indietro di Android = pausa
    expect(await page.evaluate(() => (window as any).__kaboom.gestisciIndietro())).toBe(true);
    await expect(page.getByTestId('pausa')).toBeVisible();
    expect(await page.evaluate(() => (window as any).__kaboom.bus.battagliaInPausa.value)).toBe(true);
    await expect(page.locator('#arrenditi')).toBeDisabled();
    await page.screenshot({ path: `test-results/screenshot/pausa-${f.nome}.png` });
    for (const b of await rettangoli(page, '.battaglia button')) {
      expect(b.x).toBeGreaterThanOrEqual(56);
      expect(b.x + b.w).toBeLessThanOrEqual(f.width - 56);
    }
    // di nuovo indietro = riprendi
    await page.evaluate(() => (window as any).__kaboom.gestisciIndietro());
    await expect(page.getByTestId('pausa')).toBeHidden();
    expect((await registro(page)).azioni).toEqual([{ t: 'pausa' }, { t: 'riprendi' }]);
  }
  await aggiorna(page, { numeroTurno: 5, puoArrendersi: true });
  await page.locator('#pausa').click();
  await page.locator('#arrenditi').click();
  expect((await registro(page)).comandi.at(-1)).toEqual({ t: 'ritirata' });
  await expect(page.getByTestId('pausa')).toBeHidden();
  await page.locator('#pausa').click();
  await page.locator('#esci').click();
  expect((await registro(page)).azioni.at(-1)).toEqual({ t: 'esci' });
  await expect(page.locator('#schermaglia')).toBeVisible();
});

test('esito: pergamena con superstiti e turni, Rigioca e Menu', async ({ page }) => {
  for (const f of FORMATI) {
    await page.setViewportSize({ width: f.width, height: f.height });
    await entraInBattaglia(page, vista({
      fase: 'fine', esito: { vincitore: 0, motivo: 'eliminazione', superstiti: [2, 0], pvTotali: [120, 0], turni: 9, annegati: [0, 1] },
    }));
    await expect(page.getByTestId('esito')).toContainText('Vittoria!');
    await expect(page.getByTestId('superstiti-0')).toContainText('2 / 3');
    await expect(page.getByTestId('esito')).toContainText('9 turni');
    await page.screenshot({ path: `test-results/screenshot/esito-${f.nome}.png` });
    for (const b of await rettangoli(page, '.battaglia button')) {
      expect(b.x).toBeGreaterThanOrEqual(56);
      expect(b.x + b.w).toBeLessThanOrEqual(f.width - 56);
      expect(b.h).toBeGreaterThanOrEqual(48);
    }
  }
  // Menu torna al menu
  await page.locator('#menu').click();
  await expect(page.locator('#schermaglia')).toBeVisible();
  expect((await registro(page)).azioni.at(-1)).toEqual({ t: 'esci' });

  // sconfitta a tempo, poi Rigioca: chiude e chiede una battaglia nuova
  await page.evaluate((v) => { (window as any).__kaboom.bus.battaglia.value = v; },
    vista({ fase: 'fine', esito: { vincitore: 1, motivo: 'tempo', superstiti: [1, 2], pvTotali: [30, 90], turni: 18, annegati: [0, 0] } }));
  await expect(page.getByTestId('esito')).toContainText('Sconfitta');
  await expect(page.getByTestId('esito')).toContainText('Tempo scaduto');
  await page.locator('#rigioca').click();
  const dopo = await page.evaluate(() => (window as any).__kaboom.bus.richiestaBattaglia.value);
  expect(dopo).not.toBeNull();
  expect(dopo.squadre[1].ciurma).toBe('marina');
});

test('Impostazioni: mancini, comandi classici, volume e Diagnostica', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 360 });
  await page.goto('/?prova');
  await page.locator('#apri-impostazioni').click();
  await expect(page.locator('#comandi-classici')).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('volume-valore')).toHaveText('80%');
  await page.locator('#volume').click();
  await expect(page.getByTestId('volume-valore')).toHaveText('100%');
  await page.locator('#volume').click();
  await expect(page.getByTestId('volume-valore')).toHaveText('Muto');
  await page.screenshot({ path: 'test-results/screenshot/impostazioni-20x9.png' });
  await expect(page.locator('#mancini')).toHaveAttribute('aria-checked', 'false');
  await page.locator('#mancini').click();
  await expect(page.locator('#mancini')).toHaveAttribute('aria-checked', 'true');
  await page.locator('#apri-diagnostica').click();
  await page.locator('#rigioca-replay').click();
  await expect(page.getByTestId('stato-replay')).toBeVisible();
  // la prova FPS dura 60 s (battaglia dimostrativa di B): qui si controlla solo che il pulsante ci sia
  await expect(page.locator('#prova-fps')).toBeVisible();
  await page.screenshot({ path: 'test-results/screenshot/diagnostica-20x9.png' });
  // la preferenza resta dopo il riavvio e specchia l'HUD
  await page.reload();
  await expect(page.locator('#schermaglia')).toBeVisible();
  await page.evaluate((v) => { (window as any).__kaboom.bus.battaglia.value = v; }, vista());
  await expect(page.locator('.hud.mancini')).toBeVisible();
  // con i mancini il joystick sta a destra
  const [zona] = await rettangoli(page, '[data-testid="joystick"]');
  expect(zona.x).toBeGreaterThanOrEqual(400 - 1);
});

// Piano QA §2 L4: HUD della battaglia vera a seme fisso, al tick 0 e al tick 600 (10 s: il timer parte dopo 2 s,
// quindi a 600 tick ne restano 22). Gli screenshot vanno negli artifact della CI.
test('battaglia vera a seme fisso: tick 0 e tick 600', async ({ page }) => {
  test.setTimeout(60000);
  for (const f of FORMATI) {
    await page.setViewportSize({ width: f.width, height: f.height });
    await page.goto('/?prova');
    await page.locator('#schermaglia').click();
    await page.locator('#salpa').click();
    await page.evaluate(() => {
      const b = (window as any).__kaboom.bus;
      b.richiestaBattaglia.value = { ...b.richiestaBattaglia.value, seme: 20261121 };
    });
    await expect(page.locator('#tasto-arma')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('timer')).toHaveText('30');
    await page.screenshot({ path: `test-results/screenshot/battaglia-seme-tick0-${f.nome}.png` });
    await controllaTasti(page, f.width, f.height, 1);
    await expect(page.getByTestId('timer')).toHaveText('22', { timeout: 20000 });
    await page.screenshot({ path: `test-results/screenshot/battaglia-seme-tick600-${f.nome}.png` });
    await page.locator('#pausa').click();
    await page.locator('#esci').click();
    await expect(page.locator('#schermaglia')).toBeVisible();
  }
});
