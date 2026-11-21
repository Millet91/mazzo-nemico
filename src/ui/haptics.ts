// Vibrazione breve: Capacitor Haptics nell'app, navigator.vibrate nel browser.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export type Buzz = 'tap' | 'colpo' | 'ferita' | 'vinto' | 'perso';

export function buzz(kind: Buzz) {
  try {
    if (Capacitor.isNativePlatform()) {
      if (kind === 'vinto') void Haptics.notification({ type: NotificationType.Success });
      else if (kind === 'perso') void Haptics.notification({ type: NotificationType.Error });
      else void Haptics.impact({ style: kind === 'ferita' ? ImpactStyle.Heavy : kind === 'colpo' ? ImpactStyle.Medium : ImpactStyle.Light });
      return;
    }
    const ms = { tap: 8, colpo: 15, ferita: [30, 40, 60], vinto: [20, 60, 20, 60, 40], perso: [80, 60, 120] }[kind];
    navigator.vibrate?.(ms as number | number[]);
  } catch { /* non disponibile */ }
}
