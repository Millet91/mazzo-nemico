// Guida della fionda per chi gioca la prima volta: una mano mostra "dal pirata trascina indietro e lascia"
// finché il giocatore non ha sparato 2 volte. Il conteggio resta sul telefono (Capacitor Preferences).
import { Preferences } from '@capacitor/preferences';

export const CHIAVE_GUIDA = 'guidaFionda';
/** dopo quanti tiri del giocatore la mano sparisce */
export const TIRI_GUIDA = 2;

let tiri = 0;
let caricata = false;

export async function caricaGuida(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: CHIAVE_GUIDA });
    const n = value ? Number(JSON.parse(value).tiri) : 0;
    tiri = Math.max(tiri, Number.isFinite(n) ? n : 0);
  } catch { /* si riparte da 0 */ }
  caricata = true;
}

/** true se la mano va ancora mostrata */
export function guidaAttiva(): boolean { return tiri < TIRI_GUIDA; }

/** il giocatore ha sparato con la fionda o col tasto */
export function segnaTiroGuida(): void {
  if (tiri >= TIRI_GUIDA) return;
  tiri++;
  void Preferences.set({ key: CHIAVE_GUIDA, value: JSON.stringify({ tiri }) }).catch(() => undefined);
}

/** per Impostazioni o per le prove: rimostra la guida */
export async function azzeraGuida(): Promise<void> {
  tiri = 0;
  try { await Preferences.set({ key: CHIAVE_GUIDA, value: JSON.stringify({ tiri }) }); } catch { /* niente */ }
}

export function guidaCaricata(): boolean { return caricata; }

/**
 * Posizione della mano (px CSS, relativa al pirata) e opacità al tempo `ms` del ciclo di 1,8 s:
 * appare sul pirata, preme, trascina indietro-in basso (dalla parte opposta a `verso`) di 90 px, lascia.
 */
export const CICLO_MANO_MS = 1800;
export function posaMano(ms: number, verso: 1 | -1): { x: number; y: number; alfa: number; premuta: boolean } {
  const t = (ms % CICLO_MANO_MS) / CICLO_MANO_MS;
  const ease = (u: number) => 1 - (1 - u) ** 2;
  if (t < 0.15) return { x: 0, y: 0, alfa: t / 0.15, premuta: false };
  if (t < 0.25) return { x: 0, y: 0, alfa: 1, premuta: true };
  if (t < 0.7) {
    const k = ease((t - 0.25) / 0.45);
    return { x: -verso * 70 * k, y: 55 * k, alfa: 1, premuta: true };
  }
  const f = Math.min(1, (t - 0.7) / 0.2);
  return { x: -verso * 70, y: 55, alfa: 1 - f, premuta: false };
}
