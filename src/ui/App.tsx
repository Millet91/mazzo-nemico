// Schermata minima di M0: canvas Pixi a tutto schermo (#palco), sopra la UI Preact con titolo e Impostazioni → Info.
import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { bus } from '../core/bus';
import { T } from '../testi/it';
import { INFO_BUILD } from '../core/build';
import { tocco } from '../piattaforma/haptics';
import { caricaImpostazioni, salvaImpostazioni } from '../piattaforma/impostazioni';

type Pannello = null | 'impostazioni' | 'info';
const pannello = signal<Pannello>(null);
const avviso = signal('');
let timerAvviso: ReturnType<typeof setTimeout> | undefined;

function mostraAvviso(testo: string) {
  avviso.value = testo;
  clearTimeout(timerAvviso);
  timerAvviso = setTimeout(() => (avviso.value = ''), 1500);
}

/** Tasto indietro di Android: chiude il pannello aperto. Restituisce false se non c'era niente da chiudere. */
export function gestisciIndietro(): boolean {
  if (pannello.value === 'info') { pannello.value = 'impostazioni'; return true; }
  if (pannello.value === 'impostazioni') { pannello.value = null; return true; }
  return false;
}

function Pulsante(p: { onClick: () => void; children: ComponentChildren; tipo?: 'primario' | 'secondario' | 'icona'; label?: string; id?: string }) {
  return (
    <button type="button" id={p.id} class={`btn ${p.tipo ?? 'secondario'}`} aria-label={p.label}
      onClick={() => { tocco(); p.onClick(); }}>
      {p.children}
    </button>
  );
}

function ContatoreFps() {
  if (!bus.mostraFps.value) return null;
  const { medio, minimo } = bus.fps.value;
  return <div class="fps" data-testid="fps">{T.fps.etichetta(medio, minimo)}</div>;
}

// 5 tocchi sul numero di versione attivano o spengono il contatore FPS (13 §2 L5)
let tocchi = 0;
let ultimoTocco = 0;
function toccaVersione() {
  const ora = performance.now();
  tocchi = ora - ultimoTocco < 800 ? tocchi + 1 : 1;
  ultimoTocco = ora;
  if (tocchi >= 5) {
    tocchi = 0;
    const acceso = !bus.mostraFps.value;
    bus.mostraFps.value = acceso;
    mostraAvviso(acceso ? T.info.fpsAttivato : T.info.fpsDisattivato);
    void caricaImpostazioni().then((i) => salvaImpostazioni({ ...i, fps: acceso }));
  } else if (tocchi >= 2) {
    mostraAvviso(T.info.tocchiMancanti(5 - tocchi));
  }
}

function Info() {
  const i = INFO_BUILD;
  const righe: [string, string][] = [
    [T.info.build, i.build],
    [T.info.commit, i.commit],
    [T.info.ramo, i.ramo],
    [T.info.data, i.data],
    [T.info.grafica, bus.webgl2.value.ok ? bus.webgl2.value.renderer || 'WebGL2' : '—'],
    [T.info.schermo, `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`],
  ];
  return (
    <div class="info">
      <dl>
        <dt>{T.info.versione}</dt>
        <dd><button type="button" class="versione" data-testid="versione" onClick={toccaVersione}>{i.versione}</button></dd>
        {righe.filter(([, v]) => v).map(([k, v]) => [<dt key={k + 't'}>{k}</dt>, <dd key={k + 'd'}>{v}</dd>])}
      </dl>
      <p class="nota">{T.info.suggerimento}</p>
    </div>
  );
}

function PannelloImpostazioni() {
  const p = pannello.value;
  if (!p) return null;
  return (
    <div class="scrim" onClick={(e) => { if (e.target === e.currentTarget) pannello.value = null; }}>
      <section class="modale" role="dialog" aria-modal="true" aria-labelledby="titolo-pannello">
        <header>
          {p === 'info' && (
            <Pulsante tipo="icona" label={T.impostazioni.indietro} onClick={() => (pannello.value = 'impostazioni')}>‹</Pulsante>
          )}
          <h2 id="titolo-pannello">{p === 'info' ? T.info.titolo : T.impostazioni.titolo}</h2>
          <Pulsante tipo="icona" label={T.impostazioni.chiudi} onClick={() => (pannello.value = null)}>✕</Pulsante>
        </header>
        {p === 'impostazioni' ? (
          <div class="voci">
            <Pulsante id="apri-info" onClick={() => (pannello.value = 'info')}>{T.impostazioni.info}</Pulsante>
          </div>
        ) : (
          <Info />
        )}
      </section>
    </div>
  );
}

export function App() {
  const errore = !bus.webgl2.value.ok
    ? { titolo: T.errori.webgl2Titolo, testo: T.errori.webgl2Testo }
    : bus.erroreGrafica.value ? { titolo: T.errori.webgl2Titolo, testo: bus.erroreGrafica.value } : null;
  return (
    <>
      <div id="palco" />
      <main class="ui">
        <ContatoreFps />
        <div class="angolo">
          <Pulsante tipo="icona" id="apri-impostazioni" label={T.home.impostazioni} onClick={() => (pannello.value = 'impostazioni')}>⚙</Pulsante>
        </div>
        <div class="titolo">
          <h1>{T.gioco.titolo}</h1>
          <p class="sottotitolo">{T.gioco.sottotitolo}</p>
          <p class="cantiere">{T.home.lavoriInCorso}</p>
        </div>
        {errore && (
          <div class="errore" role="alert">
            <h2>{errore.titolo}</h2>
            <p>{errore.testo}</p>
          </div>
        )}
      </main>
      <PannelloImpostazioni />
      {avviso.value && <div class="avviso" role="status">{avviso.value}</div>}
    </>
  );
}
