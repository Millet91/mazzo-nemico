import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Dati della build mostrati in Impostazioni → Info (13 §2 L5).
// In CI li dà GitHub Actions (GITHUB_SHA, GITHUB_RUN_NUMBER); in locale si legge git.
function git(cmd: string, riserva: string): string {
  try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return riserva; }
}
const versione: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;
const commit = (process.env.GITHUB_SHA ?? git('git rev-parse HEAD', 'sconosciuto')).slice(0, 7);
const build = process.env.GITHUB_RUN_NUMBER ?? 'locale';
const ramo = process.env.GITHUB_REF_NAME ?? git('git rev-parse --abbrev-ref HEAD', '');

export default defineConfig({
  base: './',
  define: {
    __VERSIONE__: JSON.stringify(versione),
    __COMMIT__: JSON.stringify(commit),
    __BUILD__: JSON.stringify(build),
    __RAMO__: JSON.stringify(ramo),
    __DATA_BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  plugins: [preact()],
  build: { outDir: 'dist', target: 'es2022', chunkSizeWarningLimit: 1200 },
  test: { include: ['tests/**/*.test.ts'], exclude: ['tests/e2e/**', 'node_modules/**'] },
});
