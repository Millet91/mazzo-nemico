// Input sul canvas (agente Comandi): mirino da trascinare; camera con trascinamento a inerzia, pinch, doppio tocco.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Camera, INERZIA_TAU_MS } from '../../src/battaglia/render/camera';
import { InputBattaglia } from '../../src/battaglia/render/input';

const W = 915, H = 412;
type Ev = { pointerId: number; clientX: number; clientY: number };

function scena() {
  const camera = new Camera();
  camera.impostaSchermo(W, H);
  camera.vola(1000, 500, 0);
  const el = {
    style: {} as Record<string, string>,
    addEventListener: () => {}, removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: W, height: H }),
  } as unknown as HTMLElement;
  let t = 0;
  const chiamate: string[] = [];
  const stato: { mirino: { x: number; y: number } | null; mira: [number, number, number][] } = { mirino: null, mira: [] };
  const input = new InputBattaglia(el, {
    camera,
    ricentra: () => chiamate.push('ricentra'),
    cameraManuale: (tipo) => chiamate.push(tipo),
    mirino: () => stato.mirino,
    miraInizia: () => chiamate.push('miraInizia'),
    miraSposta: (dx, dy, dt) => stato.mira.push([dx, dy, dt]),
    miraFine: () => chiamate.push('miraFine'),
  }, () => t);
  const ev = (id: number, x: number, y: number): PointerEvent => ({ pointerId: id, clientX: x, clientY: y } as Ev as PointerEvent);
  return { camera, input, chiamate, stato, ev, avanti: (ms: number) => { t += ms; } };
}

describe('camera sul canvas', () => {
  beforeEach(() => { vi.stubGlobal('window', { addEventListener: () => {}, removeEventListener: () => {} }); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('un dito trascina il mondo e avvisa che la camera è del giocatore', () => {
    const { camera, input, chiamate, ev, avanti } = scena();
    const x0 = camera.x;
    input.giu(ev(1, 400, 200));
    avanti(16); input.muovi(ev(1, 402, 200)); // sotto la soglia: è ancora un tocco
    expect(camera.x).toBe(x0);
    avanti(16); input.muovi(ev(1, 360, 200));
    expect(camera.x).toBeGreaterThan(x0);
    expect(chiamate).toContain('sposta');
    expect(chiamate).not.toContain('zoom');
  });

  it('dito alzato in corsa: la vista scivola ancora e si ferma da sola in circa 300 ms', () => {
    const { camera, input, ev, avanti } = scena();
    input.giu(ev(1, 600, 200));
    for (let i = 1; i <= 8; i++) { avanti(16); input.muovi(ev(1, 600 - i * 20, 200)); } // 1,25 px/ms verso sinistra
    avanti(8); input.su(ev(1, 440, 200));
    expect(camera.scivola).toBe(true);
    const x1 = camera.x;
    for (let i = 0; i < 20; i++) camera.aggiorna(16); // 320 ms
    const fatta = (camera.x - x1) * camera.scala;
    expect(fatta).toBeGreaterThan(60);
    expect(fatta).toBeLessThan(1.3 * INERZIA_TAU_MS * 1.1);
    const x2 = camera.x;
    for (let i = 0; i < 20; i++) camera.aggiorna(16);
    expect((camera.x - x2) * camera.scala).toBeLessThan(8);
    for (let i = 0; i < 20; i++) camera.aggiorna(16);
    expect(camera.scivola).toBe(false);
  });

  it('dito fermo prima di alzarsi: niente inerzia; un dito appoggiato ferma la vista che scivola', () => {
    const a = scena();
    a.input.giu(a.ev(1, 600, 200));
    for (let i = 1; i <= 8; i++) { a.avanti(16); a.input.muovi(a.ev(1, 600 - i * 20, 200)); }
    a.avanti(200); a.input.su(a.ev(1, 440, 200));
    expect(a.camera.scivola).toBe(false);

    const b = scena();
    b.input.giu(b.ev(1, 600, 200));
    for (let i = 1; i <= 8; i++) { b.avanti(16); b.input.muovi(b.ev(1, 600 - i * 20, 200)); }
    b.avanti(8); b.input.su(b.ev(1, 440, 200));
    expect(b.camera.scivola).toBe(true);
    b.avanti(50); b.input.giu(b.ev(2, 300, 200));
    expect(b.camera.scivola).toBe(false);
  });

  it('pinch: lo zoom segue le dita e il regista sa che lo zoom l\'ha scelto il giocatore', () => {
    const { camera, input, chiamate, ev, avanti } = scena();
    const z0 = camera.zoom;
    input.giu(ev(1, 400, 200)); input.giu(ev(2, 500, 200));
    avanti(16); input.muovi(ev(2, 450, 200)); // le dita si avvicinano: si allarga la vista
    expect(camera.zoom).toBeCloseTo(z0 / 2);
    expect(chiamate.at(-1)).toBe('zoom');
    // alzando un dito si continua a trascinare con l'altro, senza inerzia e senza doppio tocco
    avanti(16); input.su(ev(2, 450, 200));
    avanti(16); input.su(ev(1, 400, 200));
    expect(camera.scivola).toBe(false);
    expect(chiamate).not.toContain('ricentra');
  });

  it('doppio tocco = torna sul pirata; il gesto "indietro" sul bordo non sposta la camera', () => {
    const { camera, input, chiamate, ev, avanti } = scena();
    input.giu(ev(1, 400, 200)); avanti(60); input.su(ev(1, 400, 200));
    avanti(120);
    input.giu(ev(1, 404, 202)); avanti(60); input.su(ev(1, 404, 202));
    expect(chiamate).toEqual(['ricentra']);
    const x0 = camera.x;
    input.giu(ev(3, 10, 200)); avanti(16); input.muovi(ev(3, 200, 200)); input.su(ev(3, 200, 200));
    expect(camera.x).toBe(x0);
  });

  it('un dito che parte sul mirino mira e non sposta la camera; al rilascio non spara e non ricentra', () => {
    const { camera, input, chiamate, stato, ev, avanti } = scena();
    stato.mirino = { x: 520, y: 150 };
    const x0 = camera.x;
    input.giu(ev(1, 530, 160)); // entro 44 px dal mirino
    expect(input.mirando).toBe(true);
    avanti(16); input.muovi(ev(1, 560, 130));
    avanti(16); input.muovi(ev(1, 570, 120));
    input.su(ev(1, 570, 120));
    expect(stato.mira).toEqual([[30, -30, 16], [10, -10, 16]]);
    expect(chiamate).toEqual(['miraInizia', 'miraFine']);
    expect(camera.x).toBe(x0);
    expect(input.mirando).toBe(false);
  });

  it('un dito che parte lontano dal mirino è della camera, anche se poi ci passa sopra', () => {
    const { camera, input, chiamate, stato, ev, avanti } = scena();
    stato.mirino = { x: 520, y: 150 };
    const x0 = camera.x;
    input.giu(ev(1, 300, 150));
    avanti(16); input.muovi(ev(1, 520, 150));
    expect(stato.mira).toEqual([]);
    expect(chiamate).toContain('sposta');
    expect(camera.x).not.toBe(x0);
  });

  it('mentre un dito tiene il mirino, l\'altro può spostare la visuale: i due non si disturbano', () => {
    const { camera, input, chiamate, stato, ev, avanti } = scena();
    stato.mirino = { x: 520, y: 150 };
    input.giu(ev(1, 520, 150));
    const x0 = camera.x, z0 = camera.zoom;
    input.giu(ev(2, 200, 250));
    avanti(16); input.muovi(ev(2, 150, 250));
    expect(camera.x).toBeGreaterThan(x0);
    expect(camera.zoom).toBe(z0); // non è un pinch: il dito del mirino non conta
    avanti(16); input.muovi(ev(1, 540, 150));
    expect(stato.mira).toEqual([[20, 0, 32]]);
    input.su(ev(2, 150, 250)); input.su(ev(1, 540, 150));
    expect(chiamate.at(-1)).toBe('miraFine');
  });

  it('senza mirino (turno dell\'IA, volo) lo stesso tocco sposta la camera', () => {
    const { camera, input, stato, ev, avanti } = scena();
    stato.mirino = null;
    const x0 = camera.x;
    input.giu(ev(1, 520, 150));
    avanti(16); input.muovi(ev(1, 480, 150));
    expect(input.mirando).toBe(false);
    expect(camera.x).toBeGreaterThan(x0);
  });
});
