import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` -> dist/ (GitHub Pages, Capacitor later)
// `npm run build:single` -> dist-single/index.html, one self-contained file
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [preact(), viteSingleFile()] : [preact()],
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist', target: 'es2020' },
  test: { include: ['tests/**/*.test.ts'] },
}));
