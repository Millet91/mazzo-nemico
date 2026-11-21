// Aggancio della scena del mondo al palco Pixi e al bus (una riga in render/grafica.ts la carica).
// Visibile quando bus.schermata è 'mondo', 'scena' o 'paywall' e non c'è una battaglia; i tocchi valgono solo
// in 'mondo' e mentre la coda delle animazioni è vuota. Le immagini si caricano la prima volta che serve.
import { effect } from '@preact/signals-core';
import type { Application, Container } from 'pixi.js';
import { bus } from '../../core/bus';
import type { AnimazioneMondo } from '../../core/carriera';
import { CALA_PAPPAGALLO, CAPITOLO_1, MONDO_H, MONDO_W } from '../../contenuti/capitolo-1';
import { caricaTextureMondo } from './risorse';
import { ScenaMondo } from './scena-mondo';
import { TocchiMondo } from './tocchi';

const SCHERMATE_MONDO = new Set(['mondo', 'scena', 'paywall']);
const DELTA_MASSIMO_MS = 100;

function mondoVisibile(): boolean {
  return SCHERMATE_MONDO.has(bus.schermata.value) && !bus.richiestaBattaglia.value && !bus.battaglia.value;
}

export function montaScenaMondo(app: Application, mare: { radice: Container }): void {
  let scena: ScenaMondo | null = null;
  let caricamento: Promise<void> | null = null;
  /** animazioni arrivate prima che la scena fosse pronta */
  const inAttesa: AnimazioneMondo[] = [];
  let eraVisibile = false;

  const accoda = (a: AnimazioneMondo) => {
    bus.mondoOccupato.value = true;
    if (!scena) { inAttesa.push(a); carica(); return; }
    // la Campagna può cambiare schermata e chiedere l'animazione nello stesso istante
    scena.mostra(mondoVisibile());
    scena.accoda(a, () => { bus.mondoOccupato.value = false; });
  };

  const carica = () => {
    if (caricamento) return;
    const righe = Math.ceil(MONDO_H / 512), colonne = Math.ceil(MONDO_W / 512);
    const isole = [...CAPITOLO_1.isole.map((i) => i.id), CALA_PAPPAGALLO.id];
    caricamento = caricaTextureMondo(isole, righe, colonne).then((tex) => {
      const s = new ScenaMondo(app, tex);
      scena = s;
      app.stage.addChildAt(s.radice, Math.min(1, app.stage.children.length));
      s.impostaStato(bus.carriera.value);
      s.impostaEvidenza(bus.evidenzaMondo.value);
      s.mostra(mondoVisibile());
      for (const a of inAttesa.splice(0)) s.accoda(a, () => { bus.mondoOccupato.value = false; });
      // gancio per i test (?prova): dove sono le isole sullo schermo e la camera
      const prova = (globalThis as { __kaboom?: Record<string, unknown> }).__kaboom;
      if (prova) prova.mondo = { scena: s, schermoDaIsola: (id: string) => s.schermoDaIsola(id), camera: s.camera };
    }).catch((e) => { console.error('mappa del mondo: caricamento', e); caricamento = null; });
  };

  effect(() => { const st = bus.carriera.value; scena?.impostaStato(st); });
  effect(() => { const ev = bus.evidenzaMondo.value; scena?.impostaEvidenza(ev); });
  bus.animaMondo.ascolta(accoda);

  new TocchiMondo(app.canvas, {
    get camera() { return scena!.camera; },
    attivo: () => !!scena && scena.attivaVisibile && bus.schermata.value === 'mondo',
    cameraManuale: () => scena?.camera.ferma(),
    tocco: (x, y) => {
      if (!scena || bus.mondoOccupato.value) return;
      const id = scena.isolaSotto(x, y);
      if (id) bus.isolaToccata.invia(id);
    },
  });

  app.renderer.on('resize', (w: number, h: number) => scena?.ridimensiona(w, h));

  app.ticker.add((tk) => {
    const vis = mondoVisibile();
    if (vis && !scena) carica();
    if (scena) {
      scena.mostra(vis);
      scena.aggiorna(Math.min(tk.deltaMS, DELTA_MASSIMO_MS));
    }
    // il mare del menu resta sotto finché la carta non è pronta; poi si spegne per non disegnarlo due volte
    if (vis && scena) mare.radice.visible = false;
    else if (eraVisibile && !vis && !bus.richiestaBattaglia.value) mare.radice.visible = true;
    eraVisibile = vis && !!scena;
  });
}
