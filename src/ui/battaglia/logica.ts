// Logica dell'HUD senza Preact né DOM, così si prova con Vitest (tests/ui/).
// Qui stanno: la configurazione della Schermaglia di M1, le conversioni per i numeri mostrati,
// i tasti "tenuti premuti" (◀ ▶ ▲ ▼), il doppio tocco di SALTA, la protezione di FUOCO e i banner.
import type { ConfigBattaglia, EventoBattaglia, IdArma } from '../../core/tipi';
import { VERSIONE_REGOLE } from '../../core/tipi';
import type { VistaBattaglia } from '../../core/bus';
import { BIL } from '../../contenuti/bilanciamento';
import { ARMI, ARMA } from '../../contenuti/armi';
import { T } from '../../testi/it';

// ─── Schermaglia di M1 (contratti §1) ───

/** Teschio Rosso (umano, attaccante) contro Marina Reale (IA Mozzo, difensore), 3 contro 3 sull'Isola. */
export function configSchermaglia(seme: number): ConfigBattaglia {
  return {
    versioneRegole: VERSIONE_REGOLE,
    seme: seme >>> 0,
    bioma: 'isola',
    squadre: [
      { ciurma: 'teschio', ruolo: 'attaccante', controllo: 'umano', pirati: 3 },
      { ciurma: 'marina', ruolo: 'difensore', controllo: 'ia', livelloIa: 'mozzo', pirati: 3 },
    ],
    timerSecondi: BIL.turno.timerMozzo,
    traiettoriaCompleta: true,
  };
}

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

// ─── Banner ───

export const DURATA_BANNER_MS = 1200;

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
  return out;
}

// ─── Esito ───

export function squadraUmana(v: VistaBattaglia): 0 | 1 {
  return v.squadre[1].controllo === 'umano' && v.squadre[0].controllo !== 'umano' ? 1 : 0;
}
