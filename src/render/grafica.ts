// Avvio di PixiJS 8: canvas a schermo intero, pausa in background. Risoluzione: fino a 2 (min col dpr), con
// regolazione dinamica a 1,5 e 1,25 se il telefono fatica (render/risoluzione.ts, PIANO §3 Fase 2; prima 1,5 fissa).
import { Application, UPDATE_PRIORITY } from 'pixi.js';
// Pixi 8 registra i "pipe" del renderer con import di effetto. Con i pezzi separati di Vite la registrazione del
// testo finiva nel pezzo del regista, caricato DOPO app.init: il renderer nasceva senza pipe 'text' e la battaglia
// si bloccava al primo frame (solo nella build di produzione). Qui si importano prima di app.init tutte le
// famiglie di oggetti che la battaglia usa fuori dal nucleo (Sprite, Graphics, Container sono già nel nucleo).
// Se si usa un'altra famiglia (Mesh, TilingSprite, NineSliceSprite, ParticleContainer, BitmapText…) va aggiunta
// qui: lo controlla tests/render/pipe-pixi.test.ts.
import 'pixi.js/text';
import 'pixi.js/sprite-tiling';
// il terreno HD (render/terreno-hd.ts) disegna le tessere come Mesh con uno shader suo
import 'pixi.js/mesh';
import { bus } from '../core/bus';
import { PALETTE, hex } from '../core/palette';
import { MisuraFps } from './misura-fps';
import { RegolaRisoluzione, impostaRegolaRisoluzione } from './risoluzione';
import { ScenaMare } from './scena-mare';
import { T } from '../testi/it';

/** Un frame lento non deve far saltare l'animazione (in battaglia: max 5 tick per frame, 13 caso 6). */
const DELTA_MASSIMO_MS = 100;

export interface Grafica { pausa(): void; riprendi(): void }

export async function avviaGrafica(contenitore: HTMLElement): Promise<Grafica> {
  const app = new Application();
  const regola = new RegolaRisoluzione(window.devicePixelRatio || 1);
  impostaRegolaRisoluzione(regola);
  await app.init({
    preference: 'webgl',
    resizeTo: contenitore,
    resolution: regola.risoluzione,
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

  // regolazione della risoluzione: lavoro del frame dal primo callback del ticker a dopo il disegno di Pixi (LOW)
  let inizioFrame = 0;
  app.ticker.add(() => { inizioFrame = performance.now(); }, undefined, UPDATE_PRIORITY.INTERACTION + 1);
  app.ticker.add((tk) => {
    if (!inizioFrame) return;
    // elapsedMS: il tempo vero (deltaMS di Pixi si ferma a 100 ms, sotto i 10 fps)
    const nuova = regola.frame(tk.elapsedMS, performance.now() - inizioFrame);
    if (nuova !== null) {
      console.info(`[grafica] risoluzione ${nuova}: il telefono fatica`);
      app.renderer.resize(app.screen.width, app.screen.height, nuova);
    }
  }, undefined, UPDATE_PRIORITY.UTILITY - 1);

  // battaglia: il regista (ciclo di gioco, scena, camera, input) in un pezzo separato, caricato subito dopo
  void import('../battaglia/partita/regista')
    .then(({ Regista }) => new Regista(app, scena))
    .catch((e) => { console.error(e); bus.erroreGrafica.value = T.errori.avvioGrafica; });

  return {
    pausa() { app.ticker.stop(); },
    riprendi() { fps.azzeraSecondo(); app.ticker.start(); },
  };
}
