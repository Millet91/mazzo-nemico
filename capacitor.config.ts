import type { CapacitorConfig } from '@capacitor/cli';

// App Android (Capacitor): impacchetta la build web di `npm run build` (cartella dist).
const config: CapacitorConfig = {
  appId: 'it.millet91.baro',
  appName: 'Baro',
  webDir: 'dist',
  backgroundColor: '#1C2420',
  android: { allowMixedContent: false },
};

export default config;
