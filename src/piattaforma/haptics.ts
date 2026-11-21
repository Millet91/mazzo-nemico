// Vibrazione leggera alla pressione dei pulsanti (03 §7). Accesa di default (00 §7), si spegnerà dalle Impostazioni.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export let vibrazioneAttiva = true;
export function impostaVibrazione(v: boolean): void { vibrazioneAttiva = v; }

export function tocco(): void {
  if (!vibrazioneAttiva || !Capacitor.isNativePlatform()) return;
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}
