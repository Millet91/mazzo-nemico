// Ponte con l'app Android (Capacitor). Nel browser non fa nulla.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export function initNative() {
  if (!Capacitor.isNativePlatform()) return;
  // il tasto Indietro diventa l'evento 'backbutton' che App.tsx già gestisce
  void App.addListener('backButton', () => document.dispatchEvent(new Event('backbutton')));
}
