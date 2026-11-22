// Impostazioni → Diagnostica (piano QA F2 e §4): "Rigioca replay" e "Prova 60 fps".
// I replay d'oro stanno in tests/replay/*.json e entrano nella build. Il rigiocatore è `rigiocaReplay` della
// sim (A, battaglia/sim/replay.ts); la prova è `provaFps` del ciclo di gioco (B). Si caricano con
// import.meta.glob (B: battaglia/partita/diagnostica.ts): finché quei file non esistono la build passa e il pulsante dice "non ancora disponibile".
import { signal } from '@preact/signals';
import type { MappaGenerata, Replay } from '../core/tipi';
import { T } from '../testi/it';
import { tocco } from '../piattaforma/haptics';

type ModuloReplay = { rigiocaReplay?: (r: Replay, m: MappaGenerata) => unknown };
type ModuloFps = { provaFps?: () => Promise<Record<string, number> & { disegno?: Record<'zoomNormale' | 'zoomMinimo', { p95: number }> }>; provaSuperata?: (r: never) => boolean };

const REPLAY = import.meta.glob<Replay>('../../tests/replay/*.json', { import: 'default' });
const MODULI_REPLAY = import.meta.glob<ModuloReplay>('../battaglia/sim/replay.ts');
const MODULI_FPS = import.meta.glob<ModuloFps>('../battaglia/partita/diagnostica.ts');

interface RigaReplay { nome: string; ok: boolean | null }
const righe = signal<RigaReplay[]>([]);
const statoReplay = signal('');
const statoFps = signal('');
let occupato = false;
/** la prova FPS è in corso: il pannello Impostazioni si nasconde per lasciar vedere la battaglia */
export const provaAttiva = signal(false);
export { statoFps };

/** Legge il risultato di rigiocaReplay: true/false, { ok }, oppure { hash } da confrontare con quelli attesi. */
export function replayUguale(r: Replay, esito: unknown): boolean {
  if (typeof esito === 'boolean') return esito;
  if (esito && typeof esito === 'object') {
    const o = esito as { ok?: unknown; hash?: Record<string, string> };
    if (typeof o.ok === 'boolean') return o.ok;
    if (o.hash && r.hash) {
      const attesi = Object.entries(r.hash);
      return attesi.length > 0 && attesi.every(([tick, h]) => o.hash![tick] === h);
    }
  }
  return false;
}

async function rigiocaTutti() {
  if (occupato) return;
  const nomi = Object.keys(REPLAY).sort();
  const modulo = Object.values(MODULI_REPLAY)[0];
  if (!nomi.length) { statoReplay.value = T.diagnostica.replayNessuno; righe.value = []; return; }
  if (!modulo) { statoReplay.value = T.diagnostica.nonPronto; return; }
  occupato = true;
  statoReplay.value = T.diagnostica.replayInCorso;
  righe.value = nomi.map((n) => ({ nome: n.split('/').pop()!.replace(/\.json$/, ''), ok: null }));
  try {
    const { rigiocaReplay } = await modulo();
    const { mappaDiConfig } = await import('../battaglia/mappa-config');
    if (!rigiocaReplay) { statoReplay.value = T.diagnostica.nonPronto; return; }
    let ok = 0;
    for (let i = 0; i < nomi.length; i++) {
      await new Promise((r) => setTimeout(r, 0)); // lascia disegnare la riga precedente
      let uguale = false;
      try {
        const r = await REPLAY[nomi[i]]();
        const c = r.config;
        // la stessa mappa di partita.ts (mappa fatta a mano, seme della mappa o seme della battaglia)
        const mappa = mappaDiConfig(c);
        uguale = replayUguale(r, rigiocaReplay(r, mappa));
      } catch (e) { console.error(e); }
      if (uguale) ok++;
      righe.value = righe.value.map((x, j) => (j === i ? { ...x, ok: uguale } : x));
    }
    statoReplay.value = T.diagnostica.replayEsito(ok, nomi.length);
  } catch (e) {
    console.error(e);
    statoReplay.value = T.diagnostica.errore;
  } finally { occupato = false; }
}

async function provaFps() {
  if (occupato) return;
  occupato = true;
  try {
    let prova: ModuloFps['provaFps'];
    let superata: ModuloFps['provaSuperata'];
    for (const carica of Object.values(MODULI_FPS)) {
      const m = await carica();
      if (typeof m.provaFps === 'function') { prova = m.provaFps; superata = m.provaSuperata; break; }
    }
    if (!prova) { statoFps.value = T.diagnostica.nonPronto; return; }
    statoFps.value = T.diagnostica.provaInCorso;
    provaAttiva.value = true;
    const r = await prova().finally(() => (provaAttiva.value = false));
    const n = (...chiavi: string[]) => { for (const k of chiavi) if (typeof r[k] === 'number') return r[k]; return 0; };
    const voto = superata ? (superata(r as never) ? '✅ ' : '❌ ') : '';
    statoFps.value = voto + T.diagnostica.provaRisultato(
      Math.round(n('medio', 'fpsMedio')), Math.round(n('minimo', 'fpsMinimo')),
      n('frameLenti', 'lenti', 'frameOltre20ms'), n('msSimPerTick', 'msSim', 'simMs'))
      + (r.disegno ? `\n${T.diagnostica.provaDisegno(n('msDisegnoMedio'), r.disegno.zoomNormale.p95, r.disegno.zoomMinimo.p95)}` : '');
  } catch (e) {
    console.error(e);
    statoFps.value = T.diagnostica.errore;
  } finally { occupato = false; }
}

export function Diagnostica() {
  return (
    <div class="diagnostica">
      <section>
        <button type="button" id="rigioca-replay" class="btn secondario" onClick={() => { tocco(); void rigiocaTutti(); }}>{T.diagnostica.replay}</button>
        <p class="nota">{T.diagnostica.replayNota}</p>
        {statoReplay.value && <p class="stato" data-testid="stato-replay" role="status">{statoReplay.value}</p>}
        {righe.value.length > 0 && (
          <ul class="elenco-replay">
            {righe.value.map((r) => <li key={r.nome}><span>{r.ok === null ? '…' : r.ok ? '✅' : '❌'}</span> {r.nome}</li>)}
          </ul>
        )}
      </section>
      <section>
        <button type="button" id="prova-fps" class="btn secondario" onClick={() => { tocco(); void provaFps(); }}>{T.diagnostica.prova}</button>
        <p class="nota">{T.diagnostica.provaNota}</p>
        {statoFps.value && <p class="stato" data-testid="stato-fps" role="status">{statoFps.value}</p>}
      </section>
    </div>
  );
}
