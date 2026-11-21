// Salvataggio della carriera (Capacitor Preferences: SharedPreferences su Android, localStorage sul web).
// Lo stato è StatoCarriera passato a JSON.stringify (core/carriera.ts). Si salva a ogni cambio, con una copia di
// riserva della versione precedente: se l'ultima scrittura è rotta (app uccisa a metà) si riparte dalla riserva.
import { Preferences } from '@capacitor/preferences';
import type { StatoCarriera } from '../core/carriera';

const CHIAVE = 'carriera';
const RISERVA = 'carriera.riserva';

function leggiJson(testo: string | null): unknown {
  if (!testo) return null;
  try { return JSON.parse(testo); } catch { return null; }
}

/** Legge il salvataggio grezzo (da validare con regole.ripristina). Prima quello buono, poi la riserva. */
export async function caricaCarriera(): Promise<{ principale: unknown; riserva: unknown }> {
  try {
    const [a, b] = await Promise.all([Preferences.get({ key: CHIAVE }), Preferences.get({ key: RISERVA })]);
    return { principale: leggiJson(a.value), riserva: leggiJson(b.value) };
  } catch {
    return { principale: null, riserva: null };
  }
}

let ultimo = '';
let coda: Promise<void> = Promise.resolve();

/** Salva lo stato (le scritture vanno in fila, una alla volta; uno stato uguale al precedente non si riscrive). */
export function salvaCarriera(s: StatoCarriera): Promise<void> {
  const testo = JSON.stringify(s);
  if (testo === ultimo) return coda;
  const prima = ultimo;
  ultimo = testo;
  coda = coda.then(async () => {
    try {
      if (prima) await Preferences.set({ key: RISERVA, value: prima });
      await Preferences.set({ key: CHIAVE, value: testo });
    } catch { /* non bloccare il gioco: si riprova al prossimo cambio */ ultimo = ''; }
  });
  return coda;
}

/** Cancella la carriera (Impostazioni → Ricomincia, test). */
export async function cancellaCarriera(): Promise<void> {
  ultimo = '';
  try { await Promise.all([Preferences.remove({ key: CHIAVE }), Preferences.remove({ key: RISERVA })]); } catch { /* niente */ }
}
