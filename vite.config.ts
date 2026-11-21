import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { execSync } from 'node:child_process';

let build = 'dev';
try { build = execSync('git rev-parse --short HEAD').toString().trim(); } catch { /* fuori da git */ }

// `npm run build` -> dist/ (GitHub Pages, Capacitor later)
// `npm run build:single` -> dist-single/index.html, one self-contained file
export default defineConfig(({ mode }) => ({
  base: './',
  define: { __BUILD__: JSON.stringify(build) },
  plugins: mode === 'single' ? [preact(), viteSingleFile()] : [preact()],
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist', target: 'es2020' },
  test: { include: ['tests/**/*.test.ts'] },
}));
