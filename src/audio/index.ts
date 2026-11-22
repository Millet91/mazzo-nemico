// avviaAudio(): collega il motore al gioco. Ascolta `bus.eventiBattaglia` e `bus.battaglia` e decide da solo cosa
// suonare; nessun altro modulo sceglie i suoni (P1-contratti §4). Si chiama una volta all'avvio dell'app.
import { effect } from '@preact/signals-core';
import { bus } from '../core/bus';
import type { VistaBattaglia } from '../core/bus';
import { Motore } from './motore';
import { Musica } from './musica';
import { Ambiente } from './ambiente';
import { memoriaNuova, suoniPerEventi, suoniPerVista, type AzioniAudio, type Richiesta } from './eventi';
import { infoPreparazione, preparaSuoni, quantiPronti } from './magazzino';
import { creaSuonatore, preparaNote } from './note';
import { caricaPreferenzeAudio, volumeEffetti, volumeMusica } from './preferenze';
import { ID_SUONI } from './registro';

/** ogni quanto il sequencer guarda avanti, e di quanto (la musica regge anche se un frame va lungo) */
const PASSO_MUSICA_MS = 120;
const ANTICIPO_MUSICA_S = 0.4;

type Scena = 'menu' | 'attesa' | 'battaglia' | 'fine';

let ctx: AudioContext | null = null;
let motore: Motore | null = null;
let musica: Musica | null = null;
let ambiente: Ambiente | null = null;
let avviato = false;
let scena: Scena | null = null;
const mem = memoriaNuova();
/** registro degli ultimi suoni chiesti, per i test a schermo e per la QA ("nessun evento senza suono") */
const chiesti: string[] = [];
/** quanti suoni sono partiti davvero (audio sbloccato e suono pronto) */
let suonati = 0;

function contesto(): AudioContext | null {
  const g = globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const C = g.AudioContext ?? g.webkitAudioContext;
  if (!C) return null;
  try { return new C(); } catch { return null; }
}

/** suoni chiesti mentre l'audio si sta ancora svegliando (il primissimo tocco): partono appena è pronto */
let inAttesa: { r: Richiesta; ms: number }[] = [];

function suona(r: Richiesta): void {
  chiesti.push(r.id);
  if (chiesti.length > 400) chiesti.splice(0, 200);
  if (motore?.suona(r)) suonati++;
  else if (ctx?.state === 'suspended' && !bus.inPausa.value && inAttesa.length < 4) inAttesa.push({ r, ms: performance.now() });
}

function svuotaAttesa(): void {
  const ora = performance.now();
  // dopo mezzo secondo un suono in ritardo darebbe solo fastidio
  for (const { r, ms } of inAttesa) if (ora - ms < 500 && motore?.suona(r)) suonati++;
  inAttesa = [];
}

function esegui(az: AzioniAudio): void {
  for (const chiave of az.ferma) motore?.fermaCiclo(chiave);
  for (const r of az.suoni) suona(r);
  for (const m of az.musica) {
    if (m === 'percussioni') musica?.accendiStrato(8);
    else if (m === 'percussioniSempre') musica?.accendiStrato();
    else musica?.ferma(0.3);
  }
}

function scenaDi(v: VistaBattaglia | null, richiesta: boolean): Scena {
  if (v) return v.esito ? 'fine' : 'battaglia';
  return richiesta ? 'attesa' : 'menu';
}

/** Musica e ambiente seguono la schermata: menu, battaglia (mare sotto), fine (solo il jingle e il mare). */
function applicaScena(forza = false): void {
  const nuova = scenaDi(bus.battaglia.value, bus.richiestaBattaglia.value !== null);
  if (!forza && nuova === scena) return;
  scena = nuova;
  if (!motore || !musica || !ambiente || ctx?.state !== 'running') return;
  switch (nuova) {
    case 'menu':
      motore.fermaCiclo('*');
      ambiente.ferma();
      musica.avvia('menu');
      break;
    case 'attesa':
      motore.fermaCiclo('*');
      musica.ferma(0.4);
      ambiente.avvia();
      break;
    case 'battaglia':
      ambiente.avvia();
      musica.avvia('battaglia', 1.5);
      break;
    case 'fine':
      // la musica la ferma l'evento `fine` (con il jingle); qui solo la rete di sicurezza
      if (musica.inCorso) musica.ferma(0.3);
      break;
  }
}

/** Prima le note della musica (poche e veloci), poi gli effetti. */
function prepara(): Promise<void> {
  return preparaNote().then(() => preparaSuoni());
}

/** I browser e la WebView avviano l'audio solo dopo un tocco: si chiama dal primo gesto (e a ogni rientro). */
export function sbloccaAudio(): void {
  if (!motore) {
    const c = contesto();
    if (!c) return;
    ctx = c;
    motore = new Motore(c);
    musica = new Musica(c, motore.canali.musica, creaSuonatore(c));
    ambiente = new Ambiente(c, motore.ambiente, suona);
    motore.volume('musica', volumeMusica.value);
    motore.volume('effetti', volumeEffetti.value);
    c.onstatechange = () => { if (c.state === 'running') { applicaScena(true); svuotaAttesa(); } };
    setInterval(() => {
      if (musica && c.state === 'running') musica.programma(c.currentTime + ANTICIPO_MUSICA_S);
    }, PASSO_MUSICA_MS);
    void prepara();
  }
  const c = ctx!;
  if (c.state === 'suspended' && !bus.inPausa.value) void c.resume().catch(() => {});
  else if (c.state === 'running' && scena !== null && !musica?.inCorso && !ambiente?.attivo) applicaScena(true);
}

/** Il suono di un tasto: lo chiedono i tasti dell'HUD che reagiscono alla pressione, non al clic. */
export function suonaTasto(): void { suona({ id: 'ui_tocco' }); }

/** Lo scatto di un cursore di Impostazioni. */
export function scattoCursore(): void { suona({ id: 'ui_cursore' }); }

/** Suono dei tasti normali, scelto qui dal tipo di tasto: così i componenti non devono saperne niente. */
function suClic(e: Event): void {
  const el = (e.target as Element | null)?.closest?.('button, [role="switch"]');
  // i tasti di battaglia (.tasto) suonano già alla pressione, tramite suonaTasto
  if (!el || el.classList.contains('tasto') || (el as HTMLButtonElement).disabled) return;
  suona({ id: el.getAttribute('role') === 'switch' ? 'ui_interruttore' : el.classList.contains('primario') ? 'ui_primario' : 'ui_tocco' });
}

export interface StatoAudio {
  /** stato del contesto WebAudio: 'assente' finché non c'è un tocco, poi 'running', 'suspended' (app in pausa)... */
  contesto: string;
  pronti: number; totale: number;
  /** ms dall'avvio a tutti i suoni pronti (null: non ancora); quanti sono venuti dal cassetto del telefono */
  msPronti: number | null; daCassetto: number;
  brano: string | null; scena: Scena | null; ambiente: boolean; percussioni: boolean;
  chiesti: string[]; suonati: number; voci: number;
}

/** Stato per la Diagnostica e per i test a schermo. */
export function statoAudio(): StatoAudio {
  const p = infoPreparazione();
  return {
    contesto: ctx?.state ?? 'assente', pronti: quantiPronti(), totale: ID_SUONI.length, msPronti: p.ms, daCassetto: p.daCassetto,
    brano: musica?.inCorso ?? null, scena, ambiente: ambiente?.attivo ?? false, percussioni: musica?.stratoAcceso ?? false,
    chiesti: [...chiesti], suonati, voci: motore?.vociAttive ?? 0,
  };
}

export function avviaAudio(): void {
  if (avviato || typeof window === 'undefined') return;
  avviato = true;
  void caricaPreferenzeAudio();
  // suoni e note si preparano subito, in sottofondo: al primo tocco sono già pronti
  void prepara();
  for (const tipo of ['pointerdown', 'keydown'] as const) window.addEventListener(tipo, sbloccaAudio, { capture: true, passive: true });
  document.addEventListener('click', suClic, { capture: true });

  // eventi della sim: il bus li sostituisce a ogni frame che ne ha
  let ultimi: unknown = null;
  effect(() => {
    const eventi = bus.eventiBattaglia.value;
    if (eventi === ultimi || !eventi.length) return;
    ultimi = eventi;
    esegui(suoniPerEventi(eventi, bus.battaglia.peek(), mem, performance.now()));
  });

  // VistaBattaglia: tic-tac, cambio arma, avviso; e il vento dell'ambiente
  let prima: VistaBattaglia | null = null;
  effect(() => {
    const v = bus.battaglia.value;
    const inPausa = bus.battagliaInPausa.value;
    for (const r of suoniPerVista(prima, v, mem, inPausa)) suona(r);
    if (v && (!prima || prima.vento !== v.vento)) ambiente?.vento(v.ventoMax ? Math.abs(v.vento) / v.ventoMax : 0);
    prima = v;
  });

  // schermata: menu, attesa, battaglia, fine
  effect(() => {
    void bus.battaglia.value;
    void bus.richiestaBattaglia.value;
    applicaScena();
  });

  // (i signal si leggono prima del `?.`: l'effetto deve restare iscritto anche quando il motore non c'è ancora)
  effect(() => { const p = bus.battagliaInPausa.value; motore?.pausa(p); });
  // app in background: l'audio si ferma e riprende dove era
  effect(() => {
    const ferma = bus.inPausa.value;
    const c = ctx;
    if (!c) return;
    if (ferma && c.state === 'running') void c.suspend().catch(() => {});
    else if (!ferma && c.state === 'suspended') void c.resume().catch(() => {});
  });
  effect(() => { const v = volumeMusica.value; motore?.volume('musica', v); });
  effect(() => { const v = volumeEffetti.value; motore?.volume('effetti', v); });

  // gancio per i test Playwright e per la QA: con ?prova l'audio racconta cosa ha suonato
  if (new URLSearchParams(location.search).has('prova')) {
    (window as unknown as { __kaboomAudio: unknown }).__kaboomAudio = { stato: statoAudio, pronto: prepara };
  }
}
