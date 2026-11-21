// Vibrazioni della battaglia (contratti §4D): sparo, colpo subito, morte. Rispettano l'impostazione
// "vibrazione" di piattaforma/haptics e sul web non fanno niente.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import type { EventoBattaglia } from '../../core/tipi';
import { vibrazioneAttiva } from '../../piattaforma/haptics';

export function stileVibrazione(e: EventoBattaglia): ImpactStyle | null {
  switch (e.t) {
    case 'sparo': return ImpactStyle.Medium;
    case 'danno': return ImpactStyle.Light;
    case 'morto': return ImpactStyle.Heavy;
    default: return null;
  }
}

/** Una sola vibrazione per frame: la più forte tra gli eventi. */
export function vibraPerEventi(eventi: readonly EventoBattaglia[]): void {
  if (!vibrazioneAttiva || !Capacitor.isNativePlatform()) return;
  const forza = { [ImpactStyle.Light]: 1, [ImpactStyle.Medium]: 2, [ImpactStyle.Heavy]: 3 } as Record<string, number>;
  let scelto: ImpactStyle | null = null;
  for (const e of eventi) {
    const s = stileVibrazione(e);
    if (s && (!scelto || forza[s] > forza[scelto])) scelto = s;
  }
  if (scelto) void Haptics.impact({ style: scelto }).catch(() => {});
}
