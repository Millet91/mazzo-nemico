// Numeri del mix (08 §5). Tutti valori iniziali da tarare a orecchio sul telefono.
import type { Canale } from './tipi';

export const db = (x: number): number => 10 ** (x / 20);

/** volume di ogni canale prima dei cursori */
export const VOLUME_CANALE: Record<Canale, number> = { musica: 0.7, effetti: 1, voci: 0.9, ui: 0.8 };
/** mare e vento, sotto il cursore degli effetti */
export const VOLUME_AMBIENTE = 0.5;

/** al massimo tanti suoni insieme, e tante copie dello stesso (si ruba la più vecchia) */
export const POLIFONIA_MAX = 24;
export const ISTANZE_PER_SUONO = 3;
/** intonazione casuale ±4% a ogni suono, perché due colpi uguali non suonino identici */
export const INTONAZIONE = 0.04;

/** pan stereo dalla x nel mondo: da −0,6 a +0,6 */
export const PAN_MAX = 0.6;
export const LARGHEZZA_MONDO = 2048;
export function panDaX(x: number): number {
  const p = (x / LARGHEZZA_MONDO - 0.5) * 2 * PAN_MAX;
  return Math.max(-PAN_MAX, Math.min(PAN_MAX, p));
}

/** la musica si abbassa quando succede qualcosa di grosso ("ducking") */
export const ATTENUA = {
  botto_grande: { db: -5, attacco: 0.02, rilascio: 0.6 },
  botto_medio: { db: -3, attacco: 0.02, rilascio: 0.4 },
  voce: { db: -3, attacco: 0.05, rilascio: 0.3 },
  segnale: { db: -8, attacco: 0.1, rilascio: 0.5 },
} as const;
export type IdAttenua = keyof typeof ATTENUA;

/** in pausa la musica resta, ma "dietro una porta" */
export const PAUSA = { filtroHz: 800, db: -6, tempo: 0.2 };

/** tra una voce di pirata e la successiva passano almeno tanti ms (una voce più importante passa lo stesso) */
export const VOCE_OGNI_MS = 1500;

/** raggio dell'esplosione → taglia del botto */
export const RAGGIO_PICCOLA = 48;
export const RAGGIO_GRANDE = 75;
