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
import { avviaAscoltoBattaglia, avviaTicTac, indietroInBattaglia, inBattaglia, sceltaSchermaglia } from './battaglia/stato';
import { SceltaSchermaglia } from './battaglia/SceltaSchermaglia';
import { sbloccaAudio } from '../piattaforma/audio';
import { Diagnostica, provaAttiva, statoFps } from './Diagnostica';
import { PulsanteKit, PulsanteTondo, applicaKit, urlKit } from './kit';
import { VetrinaKit, vetrinaKit } from './kit/Vetrina';
import { caricaPreferenzeHud, comandiClassici, impostaComandiClassici, impostaMancini, impostaVolumeHud, impostaZoomMira, mancini, piratiSchermaglia, volume, zoomMira } from './preferenze';

// avvio dell'HUD (main.tsx non è una cartella dell'HUD): preferenze salvate, banner e vibrazioni della battaglia
void caricaPreferenzeHud();
avviaAscoltoBattaglia();
avviaTicTac();
// immagini del kit dipinto (P2) nelle variabili CSS
if (typeof document !== 'undefined') applicaKit();
// l'audio parte solo dopo un tocco (regola dei browser e della WebView)
if (typeof window !== 'undefined') window.addEventListener('pointerdown', sbloccaAudio, { capture: true, passive: true });

const PASSI_VOLUME = [0, 0.25, 0.5, 0.8, 1];
function volumeSuccessivo(v: number): number {
  const i = PASSI_VOLUME.findIndex((x) => x > v + 0.01);
  return i < 0 ? PASSI_VOLUME[0] : PASSI_VOLUME[i];
}
// gancio per i test Playwright (tests/e2e): con ?prova nell'indirizzo il bus è raggiungibile dalla pagina
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('prova')) {
  (window as unknown as { __kaboom: unknown }).__kaboom = { bus, gestisciIndietro: () => gestisciIndietro(), preferenze: { comandiClassici, mancini } };
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
  if (bus.schermata.value !== 'menu' && !pannello.value && !sceltaSchermaglia.value) { bus.schermata.value = 'menu'; return true; }
  if (sceltaSchermaglia.value) { sceltaSchermaglia.value = false; return true; }
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
            <PulsanteTondo label={T.impostazioni.indietro} onClick={() => (pannello.value = 'impostazioni')}>‹</PulsanteTondo>
          )}
          <h2 id="titolo-pannello">{titolo}</h2>
          <PulsanteTondo label={T.impostazioni.chiudi} onClick={() => (pannello.value = null)}>✕</PulsanteTondo>
        </header>
        {p === 'impostazioni' ? (
          <div class="voci">
            <button type="button" id="mancini" class="interruttore" role="switch" aria-checked={mancini.value}
              onClick={() => { tocco(); void impostaMancini(!mancini.value); }}>
              <span class="testi"><span class="etichetta">{T.impostazioni.mancini}</span><span class="nota">{T.impostazioni.manciniNota}</span></span>
              <span class="stato-interruttore">{mancini.value ? T.impostazioni.acceso : T.impostazioni.spento}</span>
            </button>
            <button type="button" id="comandi-classici" class="interruttore" role="switch" aria-checked={comandiClassici.value}
              onClick={() => { tocco(); void impostaComandiClassici(!comandiClassici.value); }}>
              <span class="testi"><span class="etichetta">{T.impostazioni.comandiClassici}</span><span class="nota">{T.impostazioni.comandiClassiciNota}</span></span>
              <span class="stato-interruttore">{comandiClassici.value ? T.impostazioni.acceso : T.impostazioni.spento}</span>
            </button>
            <button type="button" id="zoom-mira" class="interruttore" role="switch" aria-checked={zoomMira.value}
              onClick={() => { tocco(); void impostaZoomMira(!zoomMira.value); }}>
              <span class="testi"><span class="etichetta">{T.impostazioni.zoomMira}</span><span class="nota">{T.impostazioni.zoomMiraNota}</span></span>
              <span class="stato-interruttore">{zoomMira.value ? T.impostazioni.acceso : T.impostazioni.spento}</span>
            </button>
            <button type="button" id="volume" class="interruttore" aria-label={`${T.impostazioni.volume}: ${T.impostazioni.volumeValore(Math.round(volume.value * 100))}`}
              onClick={() => { tocco(); void impostaVolumeHud(volumeSuccessivo(volume.value)); }}>
              <span class="testi"><span class="etichetta">{T.impostazioni.volume}</span></span>
              <span class="stato-interruttore" data-testid="volume-valore">{T.impostazioni.volumeValore(Math.round(volume.value * 100))}</span>
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

/** la carriera ha già un salvataggio con almeno una battaglia: il pulsante grande dice "Continua" */
function carrieraIniziata(): boolean {
  const c = bus.carriera.value;
  return !!c && (c.battaglieGiocate > 0 || c.capitolo > 1);
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
      bus.schermata.value !== 'menu' ? (
        // Carriera: la scena del mondo (Pixi) e i pannelli della Campagna stanno sopra; qui solo l'uscita al menu
        <main class="ui fuori-menu" key="carriera">
          <ContatoreFps />
          <div class="angolo-sinistra">
            <PulsanteTondo id="torna-menu" label={T.home.tornaMenu} onClick={() => (bus.schermata.value = 'menu')}>‹</PulsanteTondo>
          </div>
        </main>
      ) : (
      <main class="ui menu" key="menu">
        <img class="menu-sfondo" src={urlKit('ui_menu_sfondo')} alt="" draggable={false} />
        <ContatoreFps />
        <div class="angolo">
          <PulsanteTondo id="apri-impostazioni" label={T.home.impostazioni} onClick={() => (pannello.value = 'impostazioni')}>⚙</PulsanteTondo>
        </div>
        <div class="titolo">
          <h1>{T.gioco.titolo}</h1>
          <p class="sottotitolo">{T.gioco.sottotitolo}</p>
        </div>
        <div class="menu-principale">
          <PulsanteKit id="carriera" tipo="oro" grande onClick={() => (bus.schermata.value = 'mondo')}
            sotto={carrieraIniziata() ? T.home.carrieraSottoContinua(bus.carriera.value!.capitolo) : T.home.carrieraSottoNuova}>
            {T.home.carriera}
          </PulsanteKit>
          <PulsanteKit id="schermaglia" tipo="legno" onClick={() => (sceltaSchermaglia.value = true)}
            sotto={T.home.schermagliaSottoN(piratiSchermaglia.value[0], piratiSchermaglia.value[1])}>
            {T.home.schermaglia}
          </PulsanteKit>
        </div>
        {errore && (
          <div class="errore" role="alert">
            <h2>{errore.titolo}</h2>
            <p>{errore.testo}</p>
          </div>
        )}
      </main>
      ))}
      {!battaglia && vetrinaKit && <VetrinaKit />}
      {!battaglia && <PannelloImpostazioni />}
      {!battaglia && <SceltaSchermaglia />}
      {battaglia && provaAttiva.value && <div class="avviso" role="status">{statoFps.value}</div>}
      {avviso.value && <div class="avviso" role="status">{avviso.value}</div>}
    </>
  );
}
