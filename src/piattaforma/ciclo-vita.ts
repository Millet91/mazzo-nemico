// Ciclo di vita dell'app: pausa in background (caso 24 di 13: al rientro niente minuti di tick recuperati)
// e tasto indietro di Android. Nel browser usa visibilitychange.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export interface GestoriCicloVita {
  /** l'app va in background o lo schermo si spegne */
  pausa: () => void;
  /** l'app torna in primo piano */
  riprendi: () => void;
  /** tasto o gesto indietro; restituisce true se l'ha gestito (altrimenti l'app va in background) */
  indietro: () => boolean;
}

export function avviaCicloVita(g: GestoriCicloVita): void {
  let attiva = true;
  const imposta = (a: boolean) => {
    if (a === attiva) return;
    attiva = a;
    if (a) g.riprendi(); else g.pausa();
  };
  document.addEventListener('visibilitychange', () => imposta(document.visibilityState === 'visible'));
  if (!Capacitor.isNativePlatform()) return;
  void App.addListener('appStateChange', ({ isActive }) => imposta(isActive));
  void App.addListener('backButton', () => {
    if (!g.indietro()) void App.minimizeApp();
  });
}
