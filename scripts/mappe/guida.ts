// Guida per l'AI: sagoma della mappa a zone piatte su fondo verde #00FF00 (il verde poi diventa aria).
import { writeFileSync } from 'node:fs';
import { costruisciMaschera, W, H } from './cala-pappagallo-forma';
import { scriviPng } from './png';
const { m } = costruisciMaschera();
const col: Record<number, number[]> = { 0: [0, 255, 0], 1: [236, 200, 120], 2: [130, 84, 52], 3: [150, 92, 44], 4: [128, 118, 112], 6: [128, 118, 112] };
const rgba = new Uint8Array(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x; let c = col[m[i]];
  // erba: primi 6 px sotto l'aria
  if (m[i] === 1 && y >= 6 && m[i - 6 * W] === 0) c = [96, 190, 70];
  rgba.set([...c, 255], i * 4);
}
writeFileSync(process.argv[2], scriviPng(W, H, rgba));
