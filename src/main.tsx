// Avvio: font, stile, controllo WebGL2, UI Preact sopra il canvas Pixi, ciclo di vita dell'app.
import '@fontsource/lilita-one/400.css';
import '@fontsource-variable/nunito/index.css';
import './ui/style.css';
import { render } from 'preact';
import { App, gestisciIndietro } from './ui/App';
import { bus } from './core/bus';
import { T } from './testi/it';
import { controllaWebgl2 } from './piattaforma/webgl';
import { avviaCicloVita } from './piattaforma/ciclo-vita';
import { caricaImpostazioni } from './piattaforma/impostazioni';
import { impostaVibrazione } from './piattaforma/haptics';
import type { Grafica } from './render/grafica';

const radice = document.getElementById('app')!;
render(<App />, radice);

let grafica: Grafica | null = null;

void caricaImpostazioni().then((i) => {
  bus.mostraFps.value = i.fps;
  impostaVibrazione(i.vibrazione);
});

avviaCicloVita({
  pausa() { bus.inPausa.value = true; grafica?.pausa(); },
  riprendi() { bus.inPausa.value = false; grafica?.riprendi(); },
  indietro: gestisciIndietro,
});

const webgl = controllaWebgl2();
bus.webgl2.value = webgl;
if (webgl.ok) {
  // Pixi in un pezzo separato: la UI compare subito, la grafica subito dopo
  import('./render/grafica')
    .then(({ avviaGrafica }) => avviaGrafica(document.getElementById('palco')!))
    .then((g) => {
      grafica = g;
      if (bus.inPausa.value) g.pausa();
    })
    .catch((e) => {
      console.error(e);
      bus.erroreGrafica.value = T.errori.avvioGrafica;
    });
}
