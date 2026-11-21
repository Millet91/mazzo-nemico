// Avvio di PixiJS 8: canvas a schermo intero, risoluzione min(dpr, 1,5) (00 §1.2), pausa in background.
import { Application } from 'pixi.js';
import { bus } from '../core/bus';
import { PALETTE, hex } from '../core/palette';
import { MisuraFps } from './misura-fps';
import { ScenaMare } from './scena-mare';

/** Un frame lento non deve far saltare l'animazione (in battaglia: max 5 tick per frame, 13 caso 6). */
const DELTA_MASSIMO_MS = 100;

export interface Grafica { pausa(): void; riprendi(): void }

export async function avviaGrafica(contenitore: HTMLElement): Promise<Grafica> {
  const app = new Application();
  await app.init({
    preference: 'webgl',
    resizeTo: contenitore,
    resolution: Math.min(window.devicePixelRatio || 1, 1.5),
    autoDensity: true,
    antialias: false,
    background: hex(PALETTE.notte),
    powerPreference: 'high-performance',
  });
  app.canvas.setAttribute('aria-hidden', 'true');
  contenitore.appendChild(app.canvas);

  const scena = new ScenaMare();
  app.stage.addChild(scena.radice);
  scena.costruisci(app.screen.width, app.screen.height);
  app.renderer.on('resize', (w: number, h: number) => scena.costruisci(w, h));

  const fps = new MisuraFps();
  app.ticker.add((tk) => {
    const d = Math.min(tk.deltaMS, DELTA_MASSIMO_MS);
    scena.aggiorna(d);
    if (fps.frameFatto(tk.deltaMS)) bus.fps.value = { medio: fps.medio, minimo: fps.minimo };
  });

  return {
    pausa() { app.ticker.stop(); },
    riprendi() { fps.azzeraSecondo(); app.ticker.start(); },
  };
}
