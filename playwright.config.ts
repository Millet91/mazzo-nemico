// L4 di 13-qa: test visivi delle schermate con Chromium. In M0 è quasi vuoto: schermata iniziale e Info
// in 3 formati, con i controlli automatici su bordi e misure dei pulsanti. I confronti con le immagini di
// riferimento arrivano con le schermate vere (M1+); per ora gli screenshot finiscono negli artifact della CI.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['Desktop Chrome'],
    // in locale si può usare un Chrome già installato: PW_CHROME=/usr/bin/google-chrome
    launchOptions: {
      executablePath: process.env.PW_CHROME || undefined,
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: true },
});
