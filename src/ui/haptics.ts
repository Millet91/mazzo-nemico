// Vibrazione breve (feedback tattile): Capacitor Haptics nell'app, navigator.vibrate nel browser.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { get } from './store';

export type Buzz = 'tap' | 'pick' | 'hit' | 'kill' | 'impact' | 'win' | 'lose';

export function buzz(kind: Buzz) {
  try {
    if (get().settings.reduceMotion || get().settings.haptics === false) return;
    if (Capacitor.isNativePlatform()) {
      if (kind === 'win') void Haptics.notification({ type: NotificationType.Success });
      else if (kind === 'lose') void Haptics.notification({ type: NotificationType.Error });
      else void Haptics.impact({ style: kind === 'impact' ? ImpactStyle.Heavy : kind === 'kill' || kind === 'pick' ? ImpactStyle.Medium : ImpactStyle.Light });
      return;
    }
    const ms = { tap: 8, pick: 14, hit: 6, kill: 18, impact: [30, 40, 60], win: [20, 60, 20, 60, 40], lose: [80, 60, 120] }[kind];
    navigator.vibrate?.(ms as number | number[]);
  } catch { /* non disponibile */ }
}
