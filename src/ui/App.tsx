// Canvas Pixi a tutto schermo (#palco) e sopra la UI Preact: menu principale (Schermaglia, Impostazioni → Info,
// Diagnostica, mancini) e, durante la battaglia, l'HUD di battaglia/.
import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { bus } from '../core/bus';
import { T } from '../testi/it';
import { INFO_BUILD } from '../core/build';
import { tocco } from '../piattaforma/haptics';
import { caricaImpostazioni, salvaImpostazioni } from '../piattaforma/impostazioni';
import { Battaglia } from './battaglia/Battaglia';
import { avviaAscoltoBattaglia, avviaSchermaglia, indietroInBattaglia, inBattaglia } from './battaglia/stato';
import { Diagnostica, provaAttiva, statoFps } from './Diagnostica';
import { caricaPreferenzeHud, impostaMancini, mancini } from './preferenze';

// avvio dell'HUD (main.tsx non è una cartella dell'HUD): preferenze salvate, banner e vibrazioni della battaglia
void caricaPreferenzeHud();
avviaAscoltoBattaglia();
// gancio per i test Playwright (tests/e2e): con ?prova nell'indirizzo il bus è raggiungibile dalla pagina
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('prova')) {
  (window as unknown as { __kaboom: unknown }).__kaboom = { bus, gestisciIndietro: () => gestisciIndietro() };
}

type Pannello = null | 'impostazioni' | 'info' | 'diagnostica';
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
  if (indietroInBattaglia()) return true;
  if (pannello.value === 'info' || pannello.value === 'diagnostica') { pannello.value = 'impostazioni'; return true; }
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
  if (provaAttiva.value) return <div class="avviso" role="status">{statoFps.value}</div>;
  const titolo = p === 'info' ? T.info.titolo : p === 'diagnostica' ? T.diagnostica.titolo : T.impostazioni.titolo;
  return (
    <div class="scrim" onClick={(e) => { if (e.target === e.currentTarget) pannello.value = null; }}>
      <section class="modale" role="dialog" aria-modal="true" aria-labelledby="titolo-pannello">
        <header>
          {p !== 'impostazioni' && (
            <Pulsante tipo="icona" label={T.impostazioni.indietro} onClick={() => (pannello.value = 'impostazioni')}>‹</Pulsante>
          )}
          <h2 id="titolo-pannello">{titolo}</h2>
          <Pulsante tipo="icona" label={T.impostazioni.chiudi} onClick={() => (pannello.value = null)}>✕</Pulsante>
        </header>
        {p === 'impostazioni' ? (
          <div class="voci">
            <button type="button" id="mancini" class="interruttore" role="switch" aria-checked={mancini.value}
              onClick={() => { tocco(); void impostaMancini(!mancini.value); }}>
              <span class="testi"><span class="etichetta">{T.impostazioni.mancini}</span><span class="nota">{T.impostazioni.manciniNota}</span></span>
              <span class="stato-interruttore">{mancini.value ? T.impostazioni.acceso : T.impostazioni.spento}</span>
            </button>
            <Pulsante id="apri-diagnostica" onClick={() => (pannello.value = 'diagnostica')}>{T.impostazioni.diagnostica}</Pulsante>
            <Pulsante id="apri-info" onClick={() => (pannello.value = 'info')}>{T.impostazioni.info}</Pulsante>
          </div>
        ) : p === 'diagnostica' ? <Diagnostica /> : (
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
  // #palco resta sempre lo stesso nodo: dentro c'è il canvas di Pixi, che non va ricreato
  const battaglia = inBattaglia();
  return (
    <>
      <div id="palco" />
      {battaglia ? (
        <main class="ui in-battaglia" key="battaglia">
          <ContatoreFps />
          <Battaglia />
        </main>
      ) : (
      <main class="ui" key="menu">
        <ContatoreFps />
        <div class="angolo">
          <Pulsante tipo="icona" id="apri-impostazioni" label={T.home.impostazioni} onClick={() => (pannello.value = 'impostazioni')}>⚙</Pulsante>
        </div>
        <div class="titolo">
          <h1>{T.gioco.titolo}</h1>
          <p class="sottotitolo">{T.gioco.sottotitolo}</p>
        </div>
        <div class="menu-principale">
          <button type="button" id="schermaglia" class="btn primario grande" onClick={() => { tocco(); avviaSchermaglia(); }}>
            <span>{T.home.schermaglia}</span>
            <span class="sotto">{T.home.schermagliaSotto}</span>
          </button>
        </div>
        {errore && (
          <div class="errore" role="alert">
            <h2>{errore.titolo}</h2>
            <p>{errore.testo}</p>
          </div>
        )}
      </main>
      )}
      {!battaglia && <PannelloImpostazioni />}
      {avviso.value && <div class="avviso" role="status">{avviso.value}</div>}
    </>
  );
}
