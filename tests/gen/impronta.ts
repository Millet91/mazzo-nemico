// Impronta di una MappaGenerata: hash FNV-1a a 32 bit della maschera e del resto in JSON.
// Serve ai test di determinismo "byte per byte" (stesso seme ⇒ stessa impronta su Node e sul telefono).
import type { MappaGenerata } from '../../src/core/tipi';

export function impronta(m: MappaGenerata): string {
  let h = 0x811c9dc5;
  const mischia = (b: number) => { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; };
  for (let i = 0; i < m.terreno.maschera.length; i++) mischia(m.terreno.maschera[i]);
  const resto = JSON.stringify({ ...m, terreno: { ...m.terreno, maschera: m.terreno.maschera.length } });
  for (let i = 0; i < resto.length; i++) mischia(resto.charCodeAt(i) & 0xff);
  return h.toString(16).padStart(8, '0');
}
