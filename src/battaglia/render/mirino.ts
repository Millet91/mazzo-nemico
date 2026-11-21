// Mirino da trascinare (comandi v3, docs/tecnica/comandi-v3.md): niente joystick. Un mirino oro sta attaccato al
// pirata di turno, in cima a un'asta: la direzione dell'asta è l'angolo del tiro, la sua lunghezza la potenza.
// Il giocatore lo prende col dito e lo trascina verso dove vuole tirare; il mirino resta dove lo lascia e non
// spara mai (FUOCO è un tasto a parte). Parte PURA, testata in Node: le misure sono px CSS di schermo, uguali
// a ogni zoom.

export const MIRINO = {
  /** distanza del mirino dal centro del pirata a potenza 0 e a potenza 100 */
  rMin: 48,
  rMax: 136,
  /** raggio del disegno del mirino e raggio entro cui un tocco lo prende */
  raggio: 17,
  presa: 44,
  /** l'asta parte a questa distanza dal centro del pirata */
  astaDa: 22,
  /** il mirino segue il dito per questa frazione quando il dito va piano (mira fine)… */
  guadagnoLento: 0.55,
  /** …e per intero quando va veloce */
  guadagnoVeloce: 1,
  /** velocità del dito in px CSS al ms: sotto `lento` vale il guadagno lento, sopra `veloce` quello veloce */
  lento: 0.1,
  veloce: 0.6,
  /** tempo di livellamento della velocità misurata (ms) */
  livella: 60,
} as const;

export interface Mira { mezziGradi: number; potenza: number }
export interface Punto { x: number; y: number }

/** Posizione del mirino rispetto al centro del pirata (y in giù) per una mira in gradi (0 = destra, 90 = su) e potenza 0-100. */
export function mirinoDaMira(gradi: number, potenza: number): Punto {
  const r = MIRINO.rMin + ((MIRINO.rMax - MIRINO.rMin) * Math.max(0, Math.min(100, potenza))) / 100;
  const a = (gradi * Math.PI) / 180;
  return { x: r * Math.cos(a), y: -r * Math.sin(a) };
}

/** Mira dal mirino: la direzione dà l'angolo a passi di 0,5° (mezziGradi 0..719), la distanza dal pirata la potenza. */
export function miraDaMirino(x: number, y: number): Mira {
  const gradi = (Math.atan2(-y, x) * 180) / Math.PI;
  const mezziGradi = ((Math.round(gradi * 2) % 720) + 720) % 720;
  const d = Math.hypot(x, y);
  const potenza = Math.round(Math.max(0, Math.min(1, (d - MIRINO.rMin) / (MIRINO.rMax - MIRINO.rMin))) * 100);
  return { mezziGradi, potenza };
}

/** Frazione del movimento del dito che arriva al mirino, secondo la velocità del dito (px CSS al ms). */
export function guadagnoMirino(velocita: number): number {
  const t = Math.max(0, Math.min(1, (velocita - MIRINO.lento) / (MIRINO.veloce - MIRINO.lento)));
  const s = t * t * (3 - 2 * t);
  return MIRINO.guadagnoLento + (MIRINO.guadagnoVeloce - MIRINO.guadagnoLento) * s;
}

/** true se un tocco in (x, y) prende il mirino che sta in `m` (stesse coordinate di schermo) */
export function prendeMirino(x: number, y: number, m: Punto | null): boolean {
  return !!m && Math.hypot(x - m.x, y - m.y) <= MIRINO.presa;
}

/**
 * Trascinamento del mirino. È relativo: parte da dove il mirino è rimasto (anche se la camera intanto si muove) e
 * al rilascio il mirino resta lì. Piano = preciso, veloce = segue il dito. Oltre la potenza piena non si accumula
 * corsa a vuoto: tornando indietro il mirino riparte subito. Tirandolo sopra il pirata la potenza va a 0 e
 * l'angolo resta quello di prima; uscendo dall'altra parte il tiro si gira. Manda `mira` solo quando angolo o
 * potenza cambiano.
 */
export function creaTrascinaMirino(invia: (c: { t: 'mira' } & Mira) => void) {
  let p: Punto = { x: MIRINO.rMin, y: 0 };
  let velocita = 0;
  /** angolo tenuto mentre il mirino passa sopra il pirata (lì la direzione non è affidabile) */
  let tenuto = 0;
  let ultima = '';

  const leggi = (): Mira => {
    const r = Math.hypot(p.x, p.y);
    if (r < MIRINO.rMin) return { mezziGradi: tenuto, potenza: 0 };
    const m = miraDaMirino(p.x, p.y);
    tenuto = m.mezziGradi;
    return m;
  };

  return {
    /** inizio del trascinamento dal mirino attuale (posizione rispetto al pirata) */
    inizia(mirino: Punto): void {
      p = { ...mirino };
      velocita = 0;
      tenuto = miraDaMirino(p.x, p.y).mezziGradi;
      const m = leggi();
      ultima = `${m.mezziGradi}|${m.potenza}`;
    },
    /** spostamento del dito dall'ultima chiamata (px CSS) e tempo passato (ms); restituisce il mirino */
    sposta(ddx: number, ddy: number, dtMs: number): Punto {
      const dt = Math.max(4, Math.min(100, dtMs || 16));
      const istantanea = Math.hypot(ddx, ddy) / dt;
      velocita += (istantanea - velocita) * Math.min(1, dt / MIRINO.livella);
      const g = guadagnoMirino(velocita);
      p = { x: p.x + ddx * g, y: p.y + ddy * g };
      const r = Math.hypot(p.x, p.y);
      if (r > MIRINO.rMax) p = { x: (p.x / r) * MIRINO.rMax, y: (p.y / r) * MIRINO.rMax };
      const m = leggi();
      const k = `${m.mezziGradi}|${m.potenza}`;
      if (k !== ultima) { ultima = k; invia({ t: 'mira', ...m }); }
      return p;
    },
    get mirino() { return p; },
  };
}
