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

// ─── Joystick virtuale (m1-ritmo §1, 00 §9.16) ───

export const JOYSTICK = {
  /** raggio del joystick in px CSS */
  raggio: 56,
  /** zona morta al centro */
  zonaMorta: 12,
  /** spinta verso l'alto oltre questa frazione del raggio = salto */
  sogliaSalto: 0.6,
  /** il salto si riarma quando la spinta scende sotto questa frazione */
  riarmoSalto: 0.4,
} as const;

/** Verso del pirata attivo dalla mira (la sim gira il pirata verso la mira): 1 destra, −1 sinistra, 0 non si sa. */
export function versoDaMira(gradi: number): 1 | -1 | 0 {
  const g = ((gradi % 360) + 360) % 360;
  if (g === 90 || g === 270) return 0;
  return g < 90 || g > 270 ? 1 : -1;
}

/**
 * Logica del joystick: riceve la posizione del pollice rispetto al punto d'appoggio (y verso il basso) e manda
 * `muovi` e `salta` come i tasti. Settore orizzontale (|dx| ≥ |dy|, oltre la zona morta) = cammina; spinta in
 * alto oltre il 60% del raggio = salto: in avanti, oppure salto alto all'indietro se la spinta va contro il verso
 * del pirata. Nel settore alto il pirata non cammina, così non si gira prima di saltare.
 */
export function creaJoystick(invia: (c: { t: 'muovi'; dir: -1 | 0 | 1 } | { t: 'salta'; indietro: boolean }) => void, verso: () => 1 | -1 | 0) {
  let dir: -1 | 0 | 1 = 0;
  let saltoArmato = true;
  const R = JOYSTICK.raggio;
  const imposta = (d: -1 | 0 | 1) => { if (d !== dir) { dir = d; invia({ t: 'muovi', dir: d }); } };
  return {
    /** dx, dy dal punto d'appoggio; restituisce la posizione del pomello limitata al raggio */
    sposta(dx: number, dy: number): { x: number; y: number } {
      const d = Math.sqrt(dx * dx + dy * dy);
      const k = d > R ? R / d : 1;
      const x = dx * k, y = dy * k;
      const orizzontale = Math.abs(x) >= Math.abs(y);
      imposta(orizzontale && Math.abs(x) > JOYSTICK.zonaMorta ? (x > 0 ? 1 : -1) : 0);
      if (saltoArmato && -y > JOYSTICK.sogliaSalto * R) {
        saltoArmato = false;
        const v = verso();
        const indietro = Math.abs(x) > JOYSTICK.zonaMorta && v !== 0 && Math.sign(x) === -v;
        invia({ t: 'salta', indietro });
      } else if (!saltoArmato && -y < JOYSTICK.riarmoSalto * R) saltoArmato = true;
      return { x, y };
    },
    rilascia() { imposta(0); saltoArmato = true; },
    get direzione() { return dir; },
  };
}

// ─── Doppio joystick fisso (scelta del proprietario 21/11, 00 §9.16) ───

/** misure dei due joystick fissi in px CSS (design/comandi/doppio-joystick.md) */
export const DOPPIO = {
  /** joystick di movimento: base 120, centro a 100 dal bordo e 92 dal basso */
  movimento: { base: 120 },
  /** joystick di mira: base 150 con FUOCO 64 al centro, centro a 110 dal bordo e 100 dal basso */
  mira: { base: 150, fuoco: 64, pomello: 36 },
  /** un tocco vale se parte entro la base più questo margine */
  margine: 16,
  /** il pomello di mira si muove al 50% del dito */
  fattoreMira: 0.5,
} as const;

const R_BASE_MIRA = DOPPIO.mira.base / 2;
const R_FUOCO = DOPPIO.mira.fuoco / 2;

/** Posizione del pomello di mira (dal centro, y in giù) per una mira in gradi (0 = destra, 90 = su) e potenza 0-100. */
export function pomelloDaMira(gradi: number, potenza: number): { x: number; y: number } {
  const r = R_FUOCO + (R_BASE_MIRA - R_FUOCO) * Math.max(0, Math.min(100, potenza)) / 100;
  const a = (gradi * Math.PI) / 180;
  return { x: r * Math.cos(a), y: -r * Math.sin(a) };
}

/** Mira dal pomello: la direzione dà l'angolo a passi di 0,5° (mezziGradi 0..719), la distanza dal bordo di FUOCO la potenza. */
export function miraDaPomello(x: number, y: number): { mezziGradi: number; potenza: number } {
  const gradi = (Math.atan2(-y, x) * 180) / Math.PI;
  const mezziGradi = ((Math.round(gradi * 2) % 720) + 720) % 720;
  const d = Math.hypot(x, y);
  const potenza = Math.round(Math.max(0, Math.min(1, (d - R_FUOCO) / (R_BASE_MIRA - R_FUOCO))) * 100);
  return { mezziGradi, potenza };
}

/** Tiene il pomello sulla corona tra FUOCO e il bordo della base. */
export function limitaPomello(x: number, y: number): { x: number; y: number } {
  const d = Math.hypot(x, y);
  if (d === 0) return { x: R_FUOCO, y: 0 };
  const r = Math.max(R_FUOCO, Math.min(R_BASE_MIRA, d));
  return { x: (x / d) * r, y: (y / d) * r };
}

/**
 * Joystick di mira: il trascinamento è relativo (il pomello si muove al 50% del dito) e parte da dove il pomello
 * era; al rilascio il pomello resta lì. Manda `mira` solo quando angolo o potenza cambiano.
 */
export function creaJoystickMira(invia: (c: { t: 'mira'; mezziGradi: number; potenza: number }) => void) {
  let partenza = { x: 0, y: 0 };
  let ultima = '';
  return {
    /** inizio del trascinamento dal pomello attuale */
    inizia(pomello: { x: number; y: number }) {
      partenza = { ...pomello };
      const m = miraDaPomello(pomello.x, pomello.y);
      ultima = `${m.mezziGradi}|${m.potenza}`;
    },
    /** dx, dy del dito dall'inizio del trascinamento; restituisce la nuova posizione del pomello */
    sposta(dx: number, dy: number): { x: number; y: number } {
      const p = limitaPomello(partenza.x + dx * DOPPIO.fattoreMira, partenza.y + dy * DOPPIO.fattoreMira);
      const m = miraDaPomello(p.x, p.y);
      const k = `${m.mezziGradi}|${m.potenza}`;
      if (k !== ultima) { ultima = k; invia({ t: 'mira', ...m }); }
      return p;
    },
  };
}
