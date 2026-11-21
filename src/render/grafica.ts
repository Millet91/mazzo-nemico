// Avvio di PixiJS 8: canvas a schermo intero, risoluzione min(dpr, 1,5) (00 §1.2), pausa in background.
import { Application } from 'pixi.js';
// Pixi 8 registra i "pipe" del renderer con import di effetto. Con i pezzi separati di Vite la registrazione del
// testo finiva nel pezzo del regista, caricato DOPO app.init: il renderer nasceva senza pipe 'text' e la battaglia
// si bloccava al primo frame (solo nella build di produzione). Qui si importano prima di app.init tutte le
// famiglie di oggetti che la battaglia usa fuori dal nucleo (Sprite, Graphics, Container sono già nel nucleo).
// Se si usa un'altra famiglia (Mesh, TilingSprite, NineSliceSprite, ParticleContainer, BitmapText…) va aggiunta
// qui: lo controlla tests/render/pipe-pixi.test.ts.
import 'pixi.js/text';
import { bus } from '../core/bus';
import { PALETTE, hex } from '../core/palette';
import { MisuraFps } from './misura-fps';
import { ScenaMare } from './scena-mare';
import { T } from '../testi/it';

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

  // battaglia: il regista (ciclo di gioco, scena, camera, input) in un pezzo separato, caricato subito dopo
  void import('../battaglia/partita/regista')
    .then(({ Regista }) => new Regista(app, scena))
    .catch((e) => { console.error(e); bus.erroreGrafica.value = T.errori.avvioGrafica; });

  return {
    pausa() { app.ticker.stop(); },
    riprendi() { fps.azzeraSecondo(); app.ticker.start(); },
  };
}
