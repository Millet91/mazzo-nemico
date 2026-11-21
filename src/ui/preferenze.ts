// Preferenze dell'HUD salvate sul telefono (Capacitor Preferences). Sono separate da piattaforma/impostazioni
// per non toccare il tipo `Impostazioni` (non è una cartella dell'HUD); si possono unire in M2.
import { signal } from '@preact/signals';
import { Preferences } from '@capacitor/preferences';

const CHIAVE = 'hud';
interface PreferenzeHud { mancini: boolean }

/** HUD specchiato per i mancini. */
export const mancini = signal(false);

export async function caricaPreferenzeHud(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: CHIAVE });
    const p = value ? (JSON.parse(value) as Partial<PreferenzeHud>) : {};
    mancini.value = !!p.mancini;
  } catch { /* restano i valori predefiniti */ }
}

export async function impostaMancini(v: boolean): Promise<void> {
  mancini.value = v;
  try { await Preferences.set({ key: CHIAVE, value: JSON.stringify({ mancini: v } satisfies PreferenzeHud) }); } catch { /* non bloccare */ }
}
