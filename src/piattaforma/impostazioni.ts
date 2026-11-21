// Impostazioni persistenti (Capacitor Preferences: SharedPreferences su Android, localStorage sul web).
import { Preferences } from '@capacitor/preferences';

export interface Impostazioni { fps: boolean; vibrazione: boolean }
export const IMPOSTAZIONI_PREDEFINITE: Impostazioni = { fps: false, vibrazione: true };
const CHIAVE = 'impostazioni';

export async function caricaImpostazioni(): Promise<Impostazioni> {
  try {
    const { value } = await Preferences.get({ key: CHIAVE });
    return { ...IMPOSTAZIONI_PREDEFINITE, ...(value ? (JSON.parse(value) as Partial<Impostazioni>) : {}) };
  } catch {
    return { ...IMPOSTAZIONI_PREDEFINITE };
  }
}

export async function salvaImpostazioni(i: Impostazioni): Promise<void> {
  try { await Preferences.set({ key: CHIAVE, value: JSON.stringify(i) }); } catch { /* non bloccare il gioco */ }
}
