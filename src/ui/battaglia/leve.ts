// Logica delle due leve del doppio joystick (00 §9.16, design/comandi/doppio-joystick.md e scale-e-liane.md),
// senza Preact né DOM: si prova con Vitest (tests/ui/leve.test.ts). Riscritta dall'agente Comandi (21/11/2026)
// dopo l'analisi dei comandi: vedi docs/tecnica/comandi-v2.md.
//
// Leva di movimento (sinistra): posizione assoluta del pollice rispetto al centro fisso.
//   libero            → cammina a destra/sinistra; spinta in alto oltre il 60% = salto NELLA DIREZIONE della spinta
//                       (in diagonale = salto lungo da quel lato, dritto in su = salto alto);
//   vicino a un appiglio → quasi verticale = arrampica; il salto solo in diagonale;
//   appeso            → su/giù = sale e scende; diagonale = salta via; destra/sinistra pura = niente.
//   Il salto non parte mai dal solo appoggio del dito: serve la spinta.
// Leva di mira (destra): trascinamento relativo dal punto in cui il pomello è rimasto, lento = preciso,
//   veloce = ampio; la direzione del pomello è l'angolo, la distanza dal centro la potenza.

/** Dove si trova il pirata attivo rispetto a scale e liane (VistaBattaglia.arrampicata). */
export type ModoArrampicata = 'libero' | 'vicino' | 'appeso';

export type ComandoLeva =
  | { t: 'muovi'; dir: -1 | 0 | 1 }
  | { t: 'salta'; indietro: boolean }
  | { t: 'arrampica'; dir: -1 | 0 | 1 };

// ─── Leva di movimento ───

export const LEVA = {
  /** corsa del pomello in px CSS */
  raggio: 56,
  /** zona morta al centro */
  zonaMorta: 12,
  /** il salto parte oltre questa frazione della corsa */
  sogliaSalto: 0.6,
  /** sotto questa frazione il salto si riarma */
  riarmo: 0.4,
  /** l'arrampicata parte oltre questa frazione della corsa */
  sogliaArrampica: 0.4,
  /** libero: fino a questi gradi sopra l'orizzontale si cammina, oltre è la zona del salto */
  camminaFinoA: 40,
  /** chi sta già camminando resta in cammino per altri gradi (niente sfarfallio sul confine) */
  isteresi: 10,
  /** libero: da questi gradi in su il salto è quello alto (dritto in su) */
  saltoAltoDa: 65,
  /** vicino/appeso: entro questi gradi dalla verticale si arrampica */
  conoArrampica: 30,
  /** vicino/appeso: la diagonale del salto comincia a questi gradi sopra l'orizzontale */
  saltoDa: 30,
  /** verso il basso: entro questi gradi dalla verticale non si cammina */
  conoBasso: 30,
} as const;

interface Lettura { cammina: -1 | 0 | 1; sale: -1 | 0 | 1; salto: null | 'alto' | 'lato'; lato: -1 | 1; riarma: boolean; disarma: boolean }

/**
 * Leva di movimento. `giu`/`sposta` ricevono il pollice rispetto al centro (y verso il basso) e restituiscono
 * la posizione del pomello, limitata alla corsa. `attiva(false)` la spegne (fasi in cui la sim non accetta
 * comandi: resta a schermo e ricorda dove sta il pollice); `attiva(true)` la riaccende e rimanda subito la
 * camminata o l'arrampicata tenuta, così la fuga parte senza rialzare il dito. Non rimanda mai un salto.
 */
export function creaLevaMovimento(invia: (c: ComandoLeva) => void, modo: () => ModoArrampicata = () => 'libero') {
  const R = LEVA.raggio;
  let dir: -1 | 0 | 1 = 0;
  let sale: -1 | 0 | 1 = 0;
  let armato = false;
  let accesa = true;
  let premuta = false;
  let pos = { x: 0, y: 0 };
  let ultimoModo: ModoArrampicata | null = null;

  const cammina = (d: -1 | 0 | 1) => { if (d !== dir) { dir = d; invia({ t: 'muovi', dir: d }); } };
  const arrampica = (d: -1 | 0 | 1) => { if (d !== sale) { sale = d; invia({ t: 'arrampica', dir: d }); } };

  function leggi(x: number, y: number, m: ModoArrampicata): Lettura {
    const r = Math.hypot(x, y);
    const lato: -1 | 1 = x < 0 ? -1 : 1;
    const l: Lettura = { cammina: 0, sale: 0, salto: null, lato, riarma: r < LEVA.riarmo * R, disarma: false };
    if (r <= LEVA.zonaMorta) return l;
    // gradi sopra l'orizzontale: 90 = dritto in su, −90 = dritto in giù
    const e = (Math.atan2(-y, Math.abs(x)) * 180) / Math.PI;
    const forte = r > LEVA.sogliaSalto * R;
    if (m === 'libero') {
      const limite = LEVA.camminaFinoA + (dir !== 0 ? LEVA.isteresi : 0);
      if (e < limite) {
        if (e > -(90 - LEVA.conoBasso)) { l.cammina = lato; l.riarma = true; }
      } else if (forte) l.salto = e >= LEVA.saltoAltoDa ? 'alto' : 'lato';
      return l;
    }
    if (Math.abs(e) >= 90 - LEVA.conoArrampica) {
      // dal cono verticale si può passare alla diagonale e saltare
      l.riarma = true;
      if (r > LEVA.sogliaArrampica * R) l.sale = y < 0 ? -1 : 1;
    } else if (e >= LEVA.saltoDa) {
      if (forte) l.salto = 'lato';
    } else {
      // destra/sinistra: da appeso non fa niente; scivolando da qui verso l'alto non si salta per sbaglio
      if (m === 'vicino') l.cammina = lato;
      if (forte) l.disarma = true;
    }
    return l;
  }

  /** `saltoPermesso` è falso all'appoggio del dito e quando la leva si riaccende. */
  function valuta(saltoPermesso: boolean): void {
    if (!accesa || !premuta) return;
    const m = modo();
    // cambio di situazione col dito già spinto (in cima alla scala, appiglio tagliato): niente salti a sorpresa
    if (ultimoModo !== null && m !== ultimoModo) armato = false;
    ultimoModo = m;
    const l = leggi(pos.x, pos.y, m);
    if (l.disarma) armato = false;
    if (l.salto && armato && saltoPermesso) {
      armato = false;
      arrampica(0);
      if (l.salto === 'alto') {
        cammina(0);
        invia({ t: 'salta', indietro: true });
      } else {
        // `muovi` gira il pirata dal lato della spinta, poi il salto lungo parte da quel lato
        cammina(l.lato);
        invia({ t: 'salta', indietro: false });
        cammina(0);
      }
      return;
    }
    if (l.salto) { cammina(0); arrampica(0); return; }
    if (l.riarma) armato = true;
    arrampica(l.sale);
    cammina(l.cammina);
  }

  function limita(dx: number, dy: number): { x: number; y: number } {
    const d = Math.hypot(dx, dy);
    const k = d > R ? R / d : 1;
    return { x: dx * k, y: dy * k };
  }

  return {
    /** il dito si appoggia: cammina o si arrampica subito, ma non salta */
    giu(dx: number, dy: number): { x: number; y: number } {
      premuta = true;
      pos = limita(dx, dy);
      armato = false;
      ultimoModo = null;
      valuta(false);
      return pos;
    },
    sposta(dx: number, dy: number): { x: number; y: number } {
      if (!premuta) return { x: 0, y: 0 };
      pos = limita(dx, dy);
      valuta(true);
      return pos;
    },
    rilascia(): void {
      premuta = false;
      pos = { x: 0, y: 0 };
      armato = false;
      if (accesa) { cammina(0); arrampica(0); } else { dir = 0; sale = 0; }
    },
    /**
     * La sim accetta i comandi di movimento (fasi azione e fuga)? Spegnendosi la leva ferma quello che stava
     * tenendo (la sim lo fa già da sola al cambio di fase: lo stop esplicito tiene pulito il registro dei comandi);
     * riaccendendosi rimanda subito la camminata o la salita che il pollice sta già tenendo, mai un salto.
     */
    attiva(si: boolean): void {
      if (si === accesa) return;
      if (!si) {
        if (dir !== 0) invia({ t: 'muovi', dir: 0 });
        if (sale !== 0) invia({ t: 'arrampica', dir: 0 });
      }
      accesa = si;
      dir = 0; sale = 0;
      armato = false;
      if (si) valuta(false);
    },
    /** la situazione del pirata è cambiata (vicino, appeso, libero) senza che il dito si muova */
    rivaluta(): void { valuta(false); },
    get direzione() { return dir; },
    get arrampicata() { return sale; },
    get premuta() { return premuta; },
  };
}

// ─── Leva di mira ───

export const MIRA = {
  /** base grande in px CSS (80 a riposo) */
  base: 150,
  pomello: 36,
  /** distanza del pomello dal centro a potenza 0 e a potenza 100 */
  rMin: 14,
  rMax: 68,
  /** il pomello si muove di questa frazione del dito quando il dito va piano (mira fine)… */
  guadagnoLento: 0.4,
  /** …e di questa quando va veloce (girare la mira dall'altra parte con un colpo di pollice) */
  guadagnoVeloce: 0.95,
  /** velocità del dito in px CSS al ms: sotto `lento` vale il guadagno lento, sopra `veloce` quello veloce */
  lento: 0.12,
  veloce: 0.75,
  /** tempo di livellamento della velocità misurata (ms) */
  livella: 60,
} as const;

export interface Mira { mezziGradi: number; potenza: number }

/** Posizione del pomello di mira (dal centro, y in giù) per una mira in gradi (0 = destra, 90 = su) e potenza 0-100. */
export function pomelloDaMira(gradi: number, potenza: number): { x: number; y: number } {
  const r = MIRA.rMin + ((MIRA.rMax - MIRA.rMin) * Math.max(0, Math.min(100, potenza))) / 100;
  const a = (gradi * Math.PI) / 180;
  return { x: r * Math.cos(a), y: -r * Math.sin(a) };
}

/** Mira dal pomello: la direzione dà l'angolo a passi di 0,5° (mezziGradi 0..719), la distanza dal centro la potenza. */
export function miraDaPomello(x: number, y: number): Mira {
  const gradi = (Math.atan2(-y, x) * 180) / Math.PI;
  const mezziGradi = ((Math.round(gradi * 2) % 720) + 720) % 720;
  const d = Math.hypot(x, y);
  const potenza = Math.round(Math.max(0, Math.min(1, (d - MIRA.rMin) / (MIRA.rMax - MIRA.rMin))) * 100);
  return { mezziGradi, potenza };
}

/** Frazione del movimento del dito che arriva al pomello, secondo la velocità del dito (px CSS al ms). */
export function guadagnoMira(velocita: number): number {
  const t = Math.max(0, Math.min(1, (velocita - MIRA.lento) / (MIRA.veloce - MIRA.lento)));
  const s = t * t * (3 - 2 * t);
  return MIRA.guadagnoLento + (MIRA.guadagnoVeloce - MIRA.guadagnoLento) * s;
}

/**
 * Leva di mira. Il trascinamento è relativo: parte da dove il pomello è rimasto e al rilascio il pomello resta lì
 * (non spara mai). Piano = preciso, veloce = ampio. Oltre il bordo non si accumula corsa a vuoto: tornando
 * indietro il pomello riparte subito. Passando per il centro la mira si gira dall'altra parte. Manda `mira`
 * solo quando angolo o potenza cambiano.
 */
export function creaLevaMira(invia: (c: { t: 'mira' } & Mira) => void) {
  let p: { x: number; y: number } = { x: MIRA.rMin, y: 0 };
  let velocita = 0;
  /** angolo tenuto mentre il pomello attraversa il centro (lì la direzione non è affidabile) */
  let tenuto = 0;
  let ultima = '';

  const leggi = (): Mira => {
    const r = Math.hypot(p.x, p.y);
    if (r < MIRA.rMin) return { mezziGradi: tenuto, potenza: 0 };
    const m = miraDaPomello(p.x, p.y);
    tenuto = m.mezziGradi;
    return m;
  };

  return {
    /** inizio del trascinamento dal pomello attuale */
    inizia(pomello: { x: number; y: number }): void {
      p = { ...pomello };
      velocita = 0;
      tenuto = miraDaPomello(p.x, p.y).mezziGradi;
      const m = leggi();
      ultima = `${m.mezziGradi}|${m.potenza}`;
    },
    /** spostamento del dito dall'ultima chiamata (px CSS) e tempo passato (ms); restituisce il pomello */
    sposta(ddx: number, ddy: number, dtMs: number): { x: number; y: number } {
      const dt = Math.max(4, Math.min(100, dtMs || 16));
      const istantanea = Math.hypot(ddx, ddy) / dt;
      velocita += (istantanea - velocita) * Math.min(1, dt / MIRA.livella);
      const g = guadagnoMira(velocita);
      p = { x: p.x + ddx * g, y: p.y + ddy * g };
      const r = Math.hypot(p.x, p.y);
      if (r > MIRA.rMax) p = { x: (p.x / r) * MIRA.rMax, y: (p.y / r) * MIRA.rMax };
      const m = leggi();
      const k = `${m.mezziGradi}|${m.potenza}`;
      if (k !== ultima) { ultima = k; invia({ t: 'mira', ...m }); }
      return p;
    },
    get pomello() { return p; },
  };
}

// ─── FUOCO ───

/**
 * FUOCO spara al RILASCIO del dito dentro il tasto: chi lo tocca per sbaglio può annullare scivolando fuori.
 * Un solo sparo per turno, anche col doppio tocco o con due dita.
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
