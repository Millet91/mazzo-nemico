import type { CapacitorConfig } from '@capacitor/cli';

// App Android (Capacitor): impacchetta la build web di `npm run build` (cartella dist).
// L'appId si fissa una volta sola (M0): cambiarlo installa un'app nuova.
const config: CapacitorConfig = {
  appId: 'it.millet91.kaboomahoy',
  appName: 'Kaboom Ahoy!',
  webDir: 'dist',
  backgroundColor: '#0E1B26',
  android: { allowMixedContent: false },
};

export default config;
