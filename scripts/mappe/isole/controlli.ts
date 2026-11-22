// Controlli delle isole vere (Fase 3, P1-contratti §7, e regole del Lead P2 del 22/11/2026). Li usano lo script che
// costruisce le isole e il test tests/mappe/isole-cap1.test.ts. Vuoto = va bene.
import { MATERIALE, type MappaGenerata, type Rettangolo } from '../../../src/core/tipi';
import { BIL } from '../../../src/contenuti/bilanciamento';

/** distanza minima tra una partenza e un elemento che crolla (livelli-cap1.md §1.3) */
export const DISTANZA_CROLLO = 120;

const dentro = (r: Rettangolo, x: number, y: number) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

/** Pezzi 4-connessi di solido che non toccano fondale, ferro o un sostegno: al tick 0 devono essere zero. */
export function staccatiAlTick0(m: MappaGenerata): { px: number; x: number; y: number }[] {
  const { w, h, maschera: q } = m.terreno, sost = m.sostegni ?? [], fondale = BIL.mondo.inizioFondale;
  const vis = new Uint8Array(w * h), pila: number[] = [], out: { px: number; x: number; y: number }[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!q[i] || vis[i]) continue;
    let px = 0, ok = false;
    vis[i] = 1; pila.push(i);
    while (pila.length) {
      const j = pila.pop()!, x = j % w, y = (j - x) / w;
      px++;
      if (q[j] === MATERIALE.ferro || y >= fondale || sost.some((r) => dentro(r, x, y))) ok = true;
      for (const k of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w]) if (k >= 0 && k < w * h && q[k] && !vis[k]) { vis[k] = 1; pila.push(k); }
    }
    if (!ok) out.push({ px, x: i % w, y: Math.floor(i / w) });
  }
  return out;
}

/** Problemi delle strutture rispetto alle partenze: troppo vicine, o una partenza nella zona di caduta. */
export function controllaIsola(m: MappaGenerata): string[] {
  const err: string[] = [];
  for (const p of staccatiAlTick0(m)) err.push(`pezzo staccato al tick 0: ${p.px} px da (${p.x}, ${p.y})`);
  const margine = BIL.crolli.rispettoSpawnPx;
  for (const st of m.strutture ?? []) {
    for (const p of [...m.spawn[0], ...m.spawn[1]]) {
      const dx = Math.max(st.x0 - p.x, 0, p.x - st.x1), dy = Math.max(st.y0 - p.y, 0, p.y - st.y1);
      if (Math.hypot(dx, dy) < DISTANZA_CROLLO) err.push(`${st.tipo} ${st.x0}-${st.x1} a meno di ${DISTANZA_CROLLO} px dalla partenza (${p.x}, ${p.y})`);
      if (p.x >= st.x0 - margine && p.x <= st.x1 + margine && p.y >= st.y0) err.push(`partenza (${p.x}, ${p.y}) sotto ${st.tipo} ${st.x0}-${st.x1}`);
    }
  }
  return err;
}
