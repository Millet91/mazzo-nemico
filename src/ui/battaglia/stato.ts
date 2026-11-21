// Stato dell'HUD (cosa è aperto, banner in coda) e azioni verso il ciclo di gioco (B) tramite il bus.
// Accordi con il ciclo di gioco:
// - si entra in battaglia scrivendo una ConfigBattaglia in `bus.richiestaBattaglia` (seme nuovo ogni volta);
// - la pausa è `bus.battagliaInPausa` (stato) più l'azione 'pausa'/'riprendi' (evento);
// - si esce con l'azione 'esci' e `richiestaBattaglia = null`; "Rigioca" = 'esci' + una richiesta nuova.
import { signal, effect } from '@preact/signals';
import { bus } from '../../core/bus';
import type { Comando, EventoBattaglia } from '../../core/tipi';
import type { VistaBattaglia } from '../../core/bus';
import { bannerDaEventi, configSchermaglia, DURATA_BANNER_MS, semeNuovo, squadraUmana } from './logica';
import { vibraPerEventi } from './vibrazioni';
import { suona, type Suono } from '../../piattaforma/audio';
import { piratiSchermaglia, comandiClassici, suComandiClassici } from '../preferenze';

/** schermata di scelta della Schermaglia (1-5 pirati per lato) aperta */
export const sceltaSchermaglia = signal(false);
/** ×2 sui turni dell'IA (bus.azioni 'velocita'); B lo rimette a 1 a ogni battaglia nuova */
export const velocitaIa = signal<1 | 2>(1);

export const grigliaAperta = signal(false);
/** banner mostrato ora ('' = nessuno) */
export const banner = signal('');
const codaBanner: string[] = [];
let timerBanner: ReturnType<typeof setTimeout> | undefined;

/** C'è una battaglia da mostrare: chiesta dal menu, oppure già pubblicata dal ciclo di gioco (es. la prova FPS). */
export function inBattaglia(): boolean {
  return bus.richiestaBattaglia.value !== null || bus.battaglia.value !== null;
}

export function invia(c: Comando): void {
  bus.comandi.invia(c);
}

export function avviaSchermaglia(): void {
  azzeraHud();
  sceltaSchermaglia.value = false;
  velocitaIa.value = 1;
  applicaFiondaAlRilascio(!comandiClassici.value);
  bus.richiestaBattaglia.value = configSchermaglia(semeNuovo(), piratiSchermaglia.value);
}

export function cambiaVelocitaIa(): void {
  velocitaIa.value = velocitaIa.value === 1 ? 2 : 1;
  bus.azioni.invia({ t: 'velocita', fattore: velocitaIa.value });
}

// La fionda che spara al rilascio è di B (render/input.ts, nel pezzo di Pixi): con "Comandi classici" si spegne.
// Si carica con import.meta.glob così la UI non tira dentro Pixi e la build passa anche senza la funzione.
const MODULI_INPUT = import.meta.glob<{ impostaFiondaAlRilascio?: (v: boolean) => void }>('../../battaglia/render/input.ts');
export function applicaFiondaAlRilascio(attiva: boolean): void {
  const carica = Object.values(MODULI_INPUT)[0];
  if (!carica) return;
  void carica().then((m) => m.impostaFiondaAlRilascio?.(attiva)).catch(() => {});
}
suComandiClassici((classici) => applicaFiondaAlRilascio(!classici));

export function apriPausa(): void {
  if (!inBattaglia() || bus.battagliaInPausa.value || bus.battaglia.value?.esito) return;
  grigliaAperta.value = false;
  bus.battagliaInPausa.value = true;
  bus.azioni.invia({ t: 'pausa' });
}

export function riprendi(): void {
  if (!bus.battagliaInPausa.value) return;
  bus.battagliaInPausa.value = false;
  bus.azioni.invia({ t: 'riprendi' });
}

export function arrenditi(): void {
  if (!bus.battaglia.value?.puoArrendersi) return;
  riprendi();
  invia({ t: 'ritirata' });
}

export function esci(): void {
  bus.azioni.invia({ t: 'esci' });
  bus.battagliaInPausa.value = false;
  bus.richiestaBattaglia.value = null;
  azzeraHud();
}

export function rigioca(): void {
  esci();
  avviaSchermaglia();
}

/** Tasto indietro di Android in battaglia: chiude la griglia, apre o chiude la pausa. */
export function indietroInBattaglia(): boolean {
  if (!inBattaglia()) return false;
  if (grigliaAperta.value) { grigliaAperta.value = false; return true; }
  if (bus.battaglia.value?.esito) return true;
  if (bus.battagliaInPausa.value) riprendi(); else apriPausa();
  return true;
}

function azzeraHud() {
  grigliaAperta.value = false;
  codaBanner.length = 0;
  clearTimeout(timerBanner);
  timerBanner = undefined;
  banner.value = '';
}

function prossimoBanner() {
  const b = codaBanner.shift();
  banner.value = b ?? '';
  timerBanner = b === undefined ? undefined : setTimeout(prossimoBanner, DURATA_BANNER_MS);
}

let esplosioni = 0;
/** Suoni segnaposto degli eventi di un frame (m1-ritmo §7): uno per tipo, per non sovrapporre lo stesso suono. */
function suoniPerEventi(eventi: readonly EventoBattaglia[], v: VistaBattaglia | null) {
  const fatti = new Set<Suono>();
  const una = (s: Suono) => { if (!fatti.has(s)) { fatti.add(s); suona(s); } };
  for (const e of eventi) {
    switch (e.t) {
      case 'sparo': una('sparo'); break;
      case 'esplosione': if (!fatti.has('esplosione1') && !fatti.has('esplosione2') && !fatti.has('esplosione3')) una((['esplosione1', 'esplosione2', 'esplosione3'] as const)[esplosioni++ % 3]); break;
      case 'splash': una('splash'); break;
      case 'rimbalzo': una('rimbalzo'); break;
      case 'salto': una('salto'); break;
      case 'danno': una('danno'); break;
      case 'cassaCaduta': una('cassa'); break;
      case 'cassaAperta': una(e.contenuto === 'rum' ? 'rum' : 'esplosione2'); break;
      case 'fine': if (v) una(e.esito.vincitore === squadraUmana(v) ? 'vittoria' : 'sconfitta'); break;
      default: break;
    }
  }
}

/** Tic-tac negli ultimi 5 secondi del turno del giocatore. */
export function avviaTicTac(): () => void {
  let ultimo = -1;
  return effect(() => {
    const v = bus.battaglia.value;
    if (!v || v.esito || v.tocca !== 'umano' || !v.timerAvviato || v.fase !== 'azione' || bus.battagliaInPausa.value) { ultimo = -1; return; }
    const s = v.secondiRimasti;
    if (s !== ultimo && s > 0 && s <= 5) suona('tictac');
    ultimo = s;
  });
}

/** Ascolta gli eventi della battaglia (banner e vibrazioni). Si chiama una volta all'avvio dell'app. */
export function avviaAscoltoBattaglia(): () => void {
  let ultimi: unknown = null;
  return effect(() => {
    const eventi = bus.eventiBattaglia.value;
    const v = bus.battaglia.peek();
    if (eventi === ultimi || !eventi.length) return;
    ultimi = eventi;
    vibraPerEventi(eventi);
    suoniPerEventi(eventi, v);
    if (v) {
      codaBanner.push(...bannerDaEventi(eventi, v));
      if (timerBanner === undefined) prossimoBanner();
    }
    // a battaglia finita la griglia si chiude
    if (eventi.some((e) => e.t === 'fine')) grigliaAperta.value = false;
  });
}
