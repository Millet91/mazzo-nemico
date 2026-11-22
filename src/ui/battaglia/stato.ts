// Stato dell'HUD (cosa è aperto, banner in coda) e azioni verso il ciclo di gioco (B) tramite il bus.
// Accordi con il ciclo di gioco:
// - si entra in battaglia scrivendo una ConfigBattaglia in `bus.richiestaBattaglia` (seme nuovo ogni volta);
// - la pausa è `bus.battagliaInPausa` (stato) più l'azione 'pausa'/'riprendi' (evento);
// - si esce con l'azione 'esci' e `richiestaBattaglia = null`; "Rigioca" = 'esci' + una richiesta nuova.
import { signal, effect } from '@preact/signals';
import { bus } from '../../core/bus';
import type { Comando } from '../../core/tipi';
import { bannerDaEventi, configSchermaglia, DURATA_BANNER_MS, semeNuovo } from './logica';
import { vibraPerEventi } from './vibrazioni';
import { mappaSchermaglia, piratiSchermaglia, segnaMappaGiocata } from '../preferenze';

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

/** mappa dell'ultima Schermaglia: "Rigioca" la ripete */
let ultimaMappa = '';

export function avviaSchermaglia(mappa: string = mappaSchermaglia.value): void {
  azzeraHud();
  sceltaSchermaglia.value = false;
  velocitaIa.value = 1;
  ultimaMappa = mappa;
  bus.richiestaBattaglia.value = configSchermaglia(semeNuovo(), piratiSchermaglia.value, mappa || undefined);
  void segnaMappaGiocata(mappa);
}

export function cambiaVelocitaIa(): void {
  velocitaIa.value = velocitaIa.value === 1 ? 2 : 1;
  bus.azioni.invia({ t: 'velocita', fattore: velocitaIa.value });
}

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
  avviaSchermaglia(ultimaMappa);
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

/** Ascolta gli eventi della battaglia (banner e vibrazioni; i suoni li sceglie src/audio). Si chiama una volta all'avvio dell'app. */
export function avviaAscoltoBattaglia(): () => void {
  let ultimi: unknown = null;
  return effect(() => {
    const eventi = bus.eventiBattaglia.value;
    const v = bus.battaglia.peek();
    if (eventi === ultimi || !eventi.length) return;
    ultimi = eventi;
    vibraPerEventi(eventi);
    if (v) {
      codaBanner.push(...bannerDaEventi(eventi, v));
      if (timerBanner === undefined) prossimoBanner();
    }
    // a battaglia finita la griglia si chiude
    if (eventi.some((e) => e.t === 'fine')) grigliaAperta.value = false;
  });
}
