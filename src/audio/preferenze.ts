// I due cursori di Impostazioni (studio v2, audio §3.9): musica, ed effetti con voci e tasti. Salvati sul telefono.
import { signal } from '@preact/signals-core';
import { Preferences } from '@capacitor/preferences';

const CHIAVE = 'audio';
/** dove l'HUD salvava il vecchio volume unico a scatti: si legge una volta sola, per non perdere la scelta del giocatore */
const CHIAVE_VECCHIA = 'hud';

export const VOLUME_MUSICA_PREDEFINITO = 0.6;
export const VOLUME_EFFETTI_PREDEFINITO = 0.8;

/** volume della musica, 0..1 */
export const volumeMusica = signal(VOLUME_MUSICA_PREDEFINITO);
/** volume di effetti, voci e tasti, 0..1 */
export const volumeEffetti = signal(VOLUME_EFFETTI_PREDEFINITO);

const limita = (v: unknown, predefinito: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : predefinito;

/** Dal volume unico di prima ai due cursori: chi aveva messo "Muto" resta muto, gli altri tengono la proporzione. */
export function daVolumeUnico(v: number): { musica: number; effetti: number } {
  const x = limita(v, VOLUME_EFFETTI_PREDEFINITO);
  return { musica: Math.round(x * VOLUME_MUSICA_PREDEFINITO / VOLUME_EFFETTI_PREDEFINITO * 20) / 20, effetti: x };
}

export async function caricaPreferenzeAudio(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: CHIAVE });
    if (value) {
      const p = JSON.parse(value) as { musica?: unknown; effetti?: unknown };
      volumeMusica.value = limita(p.musica, VOLUME_MUSICA_PREDEFINITO);
      volumeEffetti.value = limita(p.effetti, VOLUME_EFFETTI_PREDEFINITO);
      return;
    }
    const vecchie = await Preferences.get({ key: CHIAVE_VECCHIA });
    const v = vecchie.value ? (JSON.parse(vecchie.value) as { volume?: unknown }).volume : undefined;
    if (typeof v === 'number') {
      const d = daVolumeUnico(v);
      volumeMusica.value = Math.min(1, d.musica);
      volumeEffetti.value = d.effetti;
      await salvaPreferenzeAudio();
    }
  } catch { /* restano i valori predefiniti */ }
}

export async function salvaPreferenzeAudio(): Promise<void> {
  try {
    await Preferences.set({ key: CHIAVE, value: JSON.stringify({ musica: volumeMusica.value, effetti: volumeEffetti.value }) });
  } catch { /* non bloccare il gioco */ }
}
