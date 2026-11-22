// Logica dell'HUD senza Preact né DOM, così si prova con Vitest (tests/ui/).
// Qui stanno: la configurazione della Schermaglia di M1, le conversioni per i numeri mostrati,
// i tasti "tenuti premuti" (◀ ▶ ▲ ▼), il doppio tocco di SALTA, la protezione di FUOCO e i banner.
// Il mirino da trascinare sta in battaglia/render/mirino.ts; qui i tasti dei comandi v3 (frecce, salto, FUOCO).
import type { Comando, ConfigBattaglia, EventoBattaglia, IdArma } from '../../core/tipi';
import { VERSIONE_REGOLE } from '../../core/tipi';
import type { VistaBattaglia } from '../../core/bus';
import { BIL } from '../../contenuti/bilanciamento';
import { ARMI, ARMA } from '../../contenuti/armi';
import { T } from '../../testi/it';

// ─── Schermaglia di M1 (contratti §1) ───

/** Teschio Rosso (umano, attaccante) contro Marina Reale (IA Mozzo, difensore) sull'Isola, da 1 a 5 pirati per lato (m1-ritmo §9). */
export const PIRATI_MIN = 1;
export const PIRATI_MAX = 5;
export const PIRATI_PREDEFINITI = 3;
const limitaPirati = (n: number) => Math.max(PIRATI_MIN, Math.min(PIRATI_MAX, Math.round(n) || PIRATI_PREDEFINITI));

export function configSchermaglia(seme: number, pirati: [number, number] = [PIRATI_PREDEFINITI, PIRATI_PREDEFINITI], mappaFissa?: string): ConfigBattaglia {
  return {
    ...(mappaFissa ? { mappaFissa } : {}),
    versioneRegole: VERSIONE_REGOLE,
    seme: seme >>> 0,
    bioma: 'isola',
    squadre: [
      { ciurma: 'teschio', ruolo: 'attaccante', controllo: 'umano', pirati: limitaPirati(pirati[0]) },
      { ciurma: 'marina', ruolo: 'difensore', controllo: 'ia', livelloIa: 'mozzo', pirati: limitaPirati(pirati[1]) },
    ],
    timerSecondi: secondiTimer({ livelloIa: 'mozzo' }),
    traiettoriaCompleta: true,
  };
}

/** Spostata in contenuti/bilanciamento.ts perché la usa anche la carriera (pura); qui resta riesportata. */
export { secondiTimer } from '../../contenuti/bilanciamento';
import { secondiTimer } from '../../contenuti/bilanciamento';

/** Seme nuovo a ogni partita (fuori dalla sim la casualità del sistema va bene). */
export function semeNuovo(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

// ─── Numeri mostrati ───

/** Angolo assoluto (0 = destra, 90 = su) → alzo sopra l'orizzonte da −90 a 90, intero. */
export function alzo(gradi: number): number {
  const g = ((gradi % 360) + 360) % 360;
  if (g <= 90) return Math.round(g);
  if (g <= 270) return Math.round(180 - g);
  return Math.round(g - 360);
}

/** Frazione 0..1 del cerchio del timer. */
export function frazioneTimer(secondi: number, totale: number): number {
  return totale > 0 ? Math.max(0, Math.min(1, secondi / totale)) : 0;
}

/** Vento −max..+max → riempimento della barra: lato e frazione 0..1 dal centro. */
export function barraVento(vento: number, max: number): { verso: -1 | 0 | 1; frazione: number } {
  if (!vento || !max) return { verso: 0, frazione: 0 };
  return { verso: vento > 0 ? 1 : -1, frazione: Math.min(1, Math.abs(vento) / max) };
}

/** Miccia successiva con un tocco sul chip: 1 → 2 → … → 5 → 1. */
export function micciaSuccessiva(attuale: number, arma: IdArma): number {
  const m = ARMA[arma].miccia;
  if (!m) return attuale;
  return attuale >= m.max ? m.min : Math.max(m.min, attuale + 1);
}

export function usaMiccia(arma: IdArma): boolean {
  const m = ARMA[arma].miccia;
  return !!m && m.max > m.min;
}

/** Celle della griglia 4×4 nell'ordine di 00 §1.3. Attiva = nella dotazione e con munizioni. */
export interface CellaArma { id: IdArma; numero: number; attiva: boolean; munizioni: number | null }
export function celleGriglia(munizioni: Partial<Record<IdArma, number>>): CellaArma[] {
  return [...ARMI].sort((a, b) => a.numero - b.numero).map((a) => {
    const m = munizioni[a.id];
    return { id: a.id, numero: a.numero, attiva: m !== undefined && m !== 0, munizioni: m === undefined ? null : m };
  });
}

/** I comandi del pirata si vedono solo nel turno del giocatore, quando la sim li accetta. */
export function comandiVisibili(v: VistaBattaglia | null): boolean {
  return !!v && !v.esito && v.tocca === 'umano' && (v.fase === 'azione' || v.fase === 'fuga');
}
/** Mira, arma e FUOCO solo in 'azione' (in fuga ci si muove e basta). */
export function miraAttiva(v: VistaBattaglia | null): boolean {
  return !!v && !v.esito && v.tocca === 'umano' && v.fase === 'azione';
}

// ─── Tasti a tempo ───

/** Orologio e timer iniettabili: nel gioco setTimeout/setInterval, nei test un orologio finto. */
export interface Tempi {
  ora(): number;
  dopo(ms: number, f: () => void): unknown;
  ogni(ms: number, f: () => void): unknown;
  annulla(id: unknown): void;
}
export const TEMPI_VERI: Tempi = {
  ora: () => performance.now(),
  dopo: (ms, f) => setTimeout(f, ms),
  ogni: (ms, f) => setInterval(f, ms),
  annulla: (id) => { clearTimeout(id as number); clearInterval(id as number); },
};

/** Ritardo prima della ripetizione di ▲▼ tenuti premuti, e passo della ripetizione (1° ogni 100 ms = 10°/s). */
export const RIPETI_DOPO_MS = 300;
export const RIPETI_OGNI_MS = Math.round(1000 / (BIL.mira.tastiGradiAlSecondo / BIL.mira.passoTastiGradi));
/** passo di ▲▼ in mezzi gradi */
export const PASSO_MIRA = BIL.mira.passoTastiGradi * 2;

/** ▲▼: un passo subito, poi 10°/s finché il dito resta giù. */
export function creaRipetitore(passo: () => void, t: Tempi = TEMPI_VERI) {
  let attesa: unknown = null;
  let ciclo: unknown = null;
  return {
    premi() {
      this.rilascia();
      passo();
      attesa = t.dopo(RIPETI_DOPO_MS, () => { attesa = null; ciclo = t.ogni(RIPETI_OGNI_MS, passo); });
    },
    rilascia() {
      if (attesa !== null) t.annulla(attesa);
      if (ciclo !== null) t.annulla(ciclo);
      attesa = ciclo = null;
    },
  };
}

export const DOPPIO_TOCCO_MS = 250;

/** SALTA: un tocco = salto in avanti dopo 250 ms; due tocchi entro 250 ms = salto all'indietro, una volta sola. */
export function creaDoppioTocco(singolo: () => void, doppio: () => void, t: Tempi = TEMPI_VERI) {
  let attesa: unknown = null;
  return {
    tocca() {
      if (attesa !== null) { t.annulla(attesa); attesa = null; doppio(); return; }
      attesa = t.dopo(DOPPIO_TOCCO_MS, () => { attesa = null; singolo(); });
    },
    annulla() { if (attesa !== null) t.annulla(attesa); attesa = null; },
  };
}

/** FUOCO: un solo sparo per turno, anche con il doppio tocco o due dita. */
export function creaGrillettoUnico(spara: () => void) {
  let turnoSparato = -1;
  return {
    tocca(turno: number) {
      if (turno === turnoSparato) return false;
      turnoSparato = turno;
      spara();
      return true;
    },
  };
}

/**
 * FUOCO (comandi v3) spara al RILASCIO del dito dentro il tasto: chi lo tocca per sbaglio può annullare
 * scivolando fuori. Un solo sparo per turno, anche col doppio tocco o con due dita.
 */
export function creaGrilletto(spara: () => void) {
  let turnoSparato = -1;
  let premuto = false;
  return {
    premi(): void { premuto = true; },
    /** `dentro`: il dito si è alzato sopra il tasto. Restituisce true se il colpo è partito. */
    rilascia(dentro: boolean, turno: number): boolean {
      if (!premuto) return false;
      premuto = false;
      if (!dentro || turno === turnoSparato) return false;
      turnoSparato = turno;
      spara();
      return true;
    },
    annulla(): void { premuto = false; },
    get premuto() { return premuto; },
  };
}

// ─── Balzo e "fatto" (Fase 1) ───

/** Cosa farebbe ora il Balzo (VistaBattaglia.balzo; assente = 'salto'). */
export type Balzo = NonNullable<VistaBattaglia['balzo']>;
export const balzoDi = (v: VistaBattaglia | null): Balzo => v?.balzo ?? 'salto';

/**
 * Il tasto Balzo (id `tasto-salta`) manda sempre `salta`: la sim sceglie tra salto, scavalco, afferra e stacca.
 * Solo quando il pirata è contro una parete in volo ('muro') va con `indietro: true` (salto dal muro).
 * Parte al tocco, non al rilascio: il salvataggio al bordo ha mezzo secondo e il salto alto tenuto non c'è più.
 */
export function comandoBalzo(b: Balzo): Comando {
  return { t: 'salta', indietro: b === 'muro' };
}

/** Il tasto "fatto" (chiude la fuga e passa il turno): solo nel turno del giocatore, in fuga, a battaglia aperta. */
export function fattoVisibile(v: VistaBattaglia | null): boolean {
  return !!v && !v.esito && v.tocca === 'umano' && v.fase === 'fuga' && !!v.puoFinire;
}

/**
 * Frecce ◀ ▶ (comandi v3): tengono la direzione premuta anche quando la sim non accetta il movimento (volo),
 * così alla fuga il pirata riparte senza rialzare il dito. Appeso a scala o liana, una freccia = salta via da
 * quel lato. `attiva(si)`: la sim accetta il movimento (fasi azione e fuga).
 */
export function creaFrecce(invia: (c: { t: 'muovi'; dir: -1 | 0 | 1 } | { t: 'salta'; indietro: boolean }) => void, appeso: () => boolean) {
  let tenuta: -1 | 0 | 1 = 0;
  let mandata: -1 | 0 | 1 = 0;
  let accesa = true;
  const manda = (d: -1 | 0 | 1) => { if (d !== mandata) { mandata = d; invia({ t: 'muovi', dir: d }); } };
  return {
    premi(dir: -1 | 1): void {
      tenuta = dir;
      if (!accesa) return;
      if (appeso()) {
        // dalla scala si salta via dal lato della freccia: il pirata si gira e salta
        invia({ t: 'muovi', dir }); invia({ t: 'salta', indietro: false }); invia({ t: 'muovi', dir: 0 });
        mandata = 0;
        return;
      }
      manda(dir);
    },
    /** `dir`: la freccia rilasciata (se nel frattempo è stata premuta l'altra, quella resta) */
    rilascia(dir: -1 | 1): void {
      if (tenuta !== dir) return;
      tenuta = 0;
      if (accesa) manda(0);
    },
    attiva(si: boolean): void {
      if (si === accesa) return;
      if (!si) manda(0);
      accesa = si;
      mandata = 0;
      if (si && tenuta !== 0 && !appeso()) manda(tenuta);
    },
    get tenuta() { return tenuta; },
  };
}

// ─── Banner ───

/** banner di turno: 0,8 s e non bloccano i comandi (m1-ritmo §3) */
export const DURATA_BANNER_MS = 800;

/** Banner da mostrare per gli eventi di un frame (in ordine). */
export function bannerDaEventi(eventi: readonly EventoBattaglia[], v: VistaBattaglia): string[] {
  const out: string[] = [];
  for (const e of eventi) {
    if (e.t !== 'turnoIniziato') continue;
    const sq = v.squadre[e.squadra];
    out.push(sq.controllo === 'umano' ? T.battaglia.toccaATe : T.ciurme[sq.ciurma].turno);
    if (e.numero === v.mareSaleDalTurno) out.push(T.battaglia.mareSale);
    if (e.numero === v.turnoLimite - 2) out.push(T.battaglia.ultimiTurni);
  }
  for (const e of eventi) {
    if (e.t === 'cassaCaduta') out.push(T.battaglia.cassaCaduta);
    else if (e.t === 'cassaAperta') out.push(e.contenuto === 'rum' ? T.battaglia.cassaRum(BIL.casse.rumPv) : T.battaglia.cassaTrappola);
  }
  return out;
}

// ─── Esito ───

export function squadraUmana(v: VistaBattaglia): 0 | 1 {
  return v.squadre[1].controllo === 'umano' && v.squadre[0].controllo !== 'umano' ? 1 : 0;
}
