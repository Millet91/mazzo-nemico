// L4 dell'audio (agente Audio, studio v2): i due cursori di Impostazioni e il motore dentro il gioco vero.
// Il gancio `window.__kaboomAudio.stato()` (solo con ?prova) racconta cosa è stato chiesto e cosa è partito davvero:
// è lo stesso che può usare la QA per "nessun evento senza suono".
import { test, expect, type Page } from '@playwright/test';

interface Stato { contesto: string; pronti: number; totale: number; msPronti: number | null; daCassetto: number; brano: string | null; scena: string | null; ambiente: boolean; percussioni: boolean; chiesti: string[]; suonati: number; voci: number }
const stato = (page: Page) => page.evaluate(() => (window as any).__kaboomAudio.stato() as Stato);

test('Impostazioni: due cursori (musica, effetti e voci), salvati sul telefono', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 360 });
  await page.goto('/?prova');
  await page.locator('#apri-impostazioni').click();
  await expect(page.getByTestId('volume-musica-valore')).toHaveText('60%');
  await expect(page.getByTestId('volume-effetti-valore')).toHaveText('80%');
  // il vecchio tasto a scatti non c'è più
  await expect(page.locator('#volume')).toHaveCount(0);
  // bersagli da dito: almeno 48 px
  for (const id of ['#volume-musica', '#volume-effetti']) {
    const r = await page.locator(id).boundingBox();
    expect(r!.height).toBeGreaterThanOrEqual(48);
    expect(r!.width).toBeGreaterThanOrEqual(120);
  }
  await page.locator('#volume-musica').focus();
  await page.keyboard.press('Home');
  await expect(page.getByTestId('volume-musica-valore')).toHaveText('Muto');
  await page.locator('#volume-effetti').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('volume-effetti-valore')).toHaveText('90%');
  // ogni scatto del cursore chiede il suo suono
  expect((await stato(page)).chiesti.filter((x) => x === 'ui_cursore').length).toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: 'test-results/screenshot/impostazioni-audio-20x9.png' });
  await page.reload();
  await page.locator('#apri-impostazioni').click();
  await expect(page.getByTestId('volume-musica-valore')).toHaveText('Muto');
  await expect(page.getByTestId('volume-effetti-valore')).toHaveText('90%');
});

test('chi aveva messo "Muto" col vecchio volume unico resta muto', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('CapacitorStorage.hud', JSON.stringify({ volume: 0, mancini: false })));
  await page.goto('/?prova');
  await page.locator('#apri-impostazioni').click();
  await expect(page.getByTestId('volume-musica-valore')).toHaveText('Muto');
  await expect(page.getByTestId('volume-effetti-valore')).toHaveText('Muto');
});

test('menu: i suoni si preparano da soli, al primo tocco parte la musica e i tasti suonano', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 360 });
  await page.goto('/?prova');
  await expect(page.locator('#schermaglia')).toBeVisible();
  const t0 = Date.now();
  await expect.poll(async () => { const s = await stato(page); return s.pronti === s.totale; }, { timeout: 30000 }).toBe(true);
  console.log(`audio: ${(await stato(page)).totale} suoni pronti dopo ${Date.now() - t0} ms dall'apertura del menu`);
  // prima di un tocco il browser non lascia suonare: niente contesto audio
  expect((await stato(page)).contesto).toBe('assente');
  await page.locator('#apri-impostazioni').click();
  await expect.poll(async () => (await stato(page)).brano).toBe('menu');
  let s = await stato(page);
  expect(s.contesto).toBe('running');
  expect(s.ambiente).toBe(false);
  expect(s.chiesti).toContain('ui_tocco');
  await page.locator('#mancini').click();
  s = await stato(page);
  expect(s.chiesti).toContain('ui_interruttore');
  expect(s.suonati).toBeGreaterThanOrEqual(2);
});

test('battaglia vera: campana di turno, musica di battaglia e mare; il colpo di cannone ha sparo, botto a tre strati e voce', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 360 });
  const errori: string[] = [];
  page.on('pageerror', (e) => errori.push(String(e)));
  await page.goto('/?prova');
  await expect(page.locator('#schermaglia')).toBeVisible();
  // i suoni si preparano in sottofondo nei primi secondi: qui si aspetta che ci siano tutti, per contare quelli partiti
  await expect.poll(async () => { const s = await stato(page); return s.pronti === s.totale; }, { timeout: 30000 }).toBe(true);
  await page.locator('#schermaglia').click();
  await page.locator('#salpa').click();
  await expect(page.getByTestId('hud')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#tasto-fuoco')).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => (await stato(page)).brano, { timeout: 15000 }).toBe('battaglia');
  let s = await stato(page);
  expect(s.contesto).toBe('running');
  expect(s.ambiente).toBe(true);
  expect(s.chiesti).toContain('ui_primario'); // Salpa!
  expect(s.chiesti).toContain('turno_mio');
  expect(s.chiesti).toContain('vox_a_tocca');
  // FUOCO: il comando passa dal bus come farebbe il tasto
  await page.evaluate(() => (window as any).__kaboom.bus.comandi.invia({ t: 'fuoco' }));
  await expect.poll(async () => (await stato(page)).chiesti.includes('arma_cannone'), { timeout: 10000 }).toBe(true);
  await expect.poll(async () => (await stato(page)).chiesti.some((x) => x.startsWith('esp_') && x !== 'esp_coda') || (await stato(page)).chiesti.includes('splash_piccolo'), { timeout: 20000 }).toBe(true);
  s = await stato(page);
  if (s.chiesti.includes('esp_media')) {
    const i = s.chiesti.indexOf('esp_media');
    expect(s.chiesti[i + 1]).toMatch(/^imp_/);
    expect(s.chiesti[i + 2]).toBe('esp_coda');
  }
  // i suoni sono partiti davvero, non solo chiesti
  expect(s.suonati).toBeGreaterThanOrEqual(4);
  // pausa e uscita: torna la musica del menu, il mare si ferma
  await page.locator('#pausa').click();
  await expect(page.getByTestId('pausa')).toBeVisible();
  await page.locator('#esci').click();
  await expect(page.locator('#schermaglia')).toBeVisible();
  await expect.poll(async () => (await stato(page)).brano).toBe('menu');
  expect((await stato(page)).ambiente).toBe(false);
  expect(errori).toEqual([]);
});

test('eventi della Fase 1 sul bus (passo, scivolata, mare che sale, fine): il motore li suona senza che altri scelgano i suoni', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 360 });
  await page.goto('/?prova');
  await expect(page.locator('#schermaglia')).toBeVisible();
  await expect.poll(async () => { const s = await stato(page); return s.pronti === s.totale; }, { timeout: 30000 }).toBe(true);
  // una vista finta, senza richiesta di battaglia: il ciclo di gioco resta fermo (come nelle prove dell'HUD)
  await page.locator('#apri-impostazioni').click();
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const sq = (ciurma: string, controllo: string) => ({ ciurma, controllo, pvTotali: 200, pvIniziali: 210, vivi: 3, iniziali: 3 });
    (window as any).__kaboom.bus.battaglia.value = {
      numeroTurno: 1, turnoLimite: 18, mareSaleDalTurno: 12, squadraDiTurno: 0, tocca: 'umano', fase: 'azione', secondiRimasti: 24,
      timerAvviato: true, vento: 6, ventoMax: 6, squadre: [sq('teschio', 'umano'), sq('marina', 'ia')], arma: 'cannone',
      munizioni: { cannone: -1 }, miccia: 3, miraGradi: 45, potenza: 60, iaPensa: false, puoArrendersi: false, esito: null,
    };
  });
  await expect.poll(async () => (await stato(page)).brano).toBe('battaglia');
  const manda = (eventi: unknown[]) => page.evaluate((e) => { (window as any).__kaboom.bus.eventiBattaglia.value = e; }, eventi);
  await manda([{ t: 'passo', pirata: 0, x: 400, y: 600, corsa: true, materiale: 3 }]);
  await manda([{ t: 'scivola', pirata: 0, inizio: true, materiale: 1 }]);
  await manda([{ t: 'scivola', pirata: 0, inizio: false, materiale: 1 }]);
  await manda([{ t: 'mareSale', livello: 900 }]);
  let s = await stato(page);
  for (const id of ['passo_legno', 'fibbia', 'scivola_ciclo', 'scivola_fine', 'mare_sale']) expect(s.chiesti).toContain(id);
  // dal mare che sale entrano le percussioni (dalla battuta successiva: al più 2,2 s a 112 BPM)
  await expect.poll(async () => (await stato(page)).percussioni, { timeout: 5000 }).toBe(true);
  // tic-tac negli ultimi 5 secondi
  for (const sec of [5, 4, 3]) await page.evaluate((sec) => { const b = (window as any).__kaboom.bus.battaglia; b.value = { ...b.value, secondiRimasti: sec }; }, sec);
  s = await stato(page);
  expect(s.chiesti.filter((x) => x === 'timer_tic')).toHaveLength(3);
  // fine: la musica si ferma e parte il jingle
  const esito = { vincitore: 0, motivo: 'eliminazione', superstiti: [3, 0], pvTotali: [200, 0], turni: 9, annegati: [0, 0] };
  await manda([{ t: 'fine', esito }]);
  await page.evaluate((esito) => { const b = (window as any).__kaboom.bus.battaglia; b.value = { ...b.value, fase: 'fine', esito }; }, esito);
  s = await stato(page);
  expect(s.chiesti).toContain('mus_vittoria');
  expect(s.brano).toBeNull();
});

test('Diagnostica: la riga dell\'audio; al secondo avvio i suoni vengono dal telefono, senza ricalcolarli', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 360 });
  await page.goto('/?prova');
  await expect.poll(async () => { const s = await stato(page); return s.pronti === s.totale; }, { timeout: 30000 }).toBe(true);
  let s = await stato(page);
  expect(s.daCassetto).toBe(0);
  expect(s.msPronti).toBeGreaterThan(0);
  await page.locator('#apri-impostazioni').click();
  await page.locator('#apri-diagnostica').click();
  const riga = page.getByTestId('stato-audio');
  await expect(riga).toContainText(`${s.totale} su ${s.totale} suoni pronti`);
  await expect(riga).toContainText('calcolati');
  await expect(riga).toContainText('motore acceso');
  await page.screenshot({ path: 'test-results/screenshot/diagnostica-audio-20x9.png' });
  // il cassetto si scrive in sottofondo appena tutto è pronto: poi si ricarica come un secondo avvio dell'app
  await page.waitForTimeout(1500);
  await page.reload();
  await expect.poll(async () => { const x = await stato(page); return x.pronti === x.totale; }, { timeout: 10000 }).toBe(true);
  s = await stato(page);
  expect(s.daCassetto).toBe(s.totale);
  console.log(`audio: secondo avvio, ${s.totale} suoni dal cassetto in ${s.msPronti} ms`);
  expect(s.msPronti!).toBeLessThan(3000);
  await page.locator('#apri-impostazioni').click();
  await page.locator('#apri-diagnostica').click();
  await expect(page.getByTestId('stato-audio')).toContainText('tenuti sul telefono');
  // e i suoni del cassetto suonano davvero (i tocchi su Impostazioni e Diagnostica)
  await expect.poll(async () => (await stato(page)).suonati, { timeout: 5000 }).toBeGreaterThanOrEqual(1);
});
