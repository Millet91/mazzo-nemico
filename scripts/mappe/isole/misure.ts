// Misure di una mappa generata che servono a scegliere il seme di un'isola del cap. 1 (Scenario e livelli, P2).
// Pure: leggono la maschera, non la cambiano. Le usa scegli-semi.ts e il test tests/mappe/isole-cap1.test.ts.
import { MATERIALE, type MappaGenerata } from '../../../src/core/tipi';
import { superficie } from '../../../src/battaglia/gen/analisi';
import { BIL } from '../../../src/contenuti/bilanciamento';
import { validaMappa } from '../../../src/battaglia/gen/valida';

export interface Collina { x: number; y: number }

export interface Misure {
  /** cime al centro (20-80% della larghezza) con prominenza ≥ 40 px, da sinistra */
  colline: Collina[];
  /** y della cima più alta (più piccola = più alta) */
  cima: number;
  /** larghezza (px) della parte entro 30 px dalla cima più alta: piccola = punta, grande = altopiano */
  larghezzaCima: number;
  /** con 2+ colline: fondo della valle tra le prime due (y), profondità sotto la più bassa, larghezza a metà profondità */
  valle: { x: number; y: number; profondita: number; larghezza: number } | null;
  /** px di aria chiusi sotto la superficie e sopra il mare (grotte) */
  grotte: number;
  /** px di grotta con il tetto sottile (≤ 48 px di roccia sopra): candidati ad archi */
  grotteTettoSottile: number;
  /** colonne in cui la terra è bassa sul mare (0-70 px): riva lunga e bassa, adatta a pontili e palafitte */
  rivaBassa: number;
  /** px tra il mare della Marea alta e lo spawn più basso (06 §7.6). Il validatore intero a mare 900 non passa con
   *  nessun seme del generatore di oggi (solido, barili, cannone): qui si misura solo quanto restano all'asciutto. */
  margineMareaAlta: number;
  appigli: number;
  scale: number;
  liane: number;
  barili: number;
}

const ARIA = MATERIALE.aria;

function liscia(sup: Int32Array, r: number): Float64Array {
  const out = new Float64Array(sup.length);
  for (let x = 0; x < sup.length; x++) {
    let t = 0, n = 0;
    for (let k = Math.max(0, x - r); k <= Math.min(sup.length - 1, x + r); k++) { t += sup[k]; n++; }
    out[x] = t / n;
  }
  return out;
}

export function misura(m: MappaGenerata): Misure {
  const { w: W, maschera, mare } = m.terreno;
  const sup = superficie(maschera);
  const s = liscia(sup, 20);
  const da = Math.floor(W * 0.2), a = Math.floor(W * 0.8);
  // cime: minimi locali di y con prominenza ≥ 40 px su entrambi i lati (entro la fascia centrale)
  const colline: Collina[] = [];
  for (let x = da; x < a; x++) {
    if (!(s[x] <= s[x - 1] && s[x] < s[x + 1])) continue;
    let sx = s[x], dx = s[x];
    for (let k = x; k >= 0 && s[k] >= s[x] - 0.5; k--) sx = Math.max(sx, s[k]);
    for (let k = x; k < W && s[k] >= s[x] - 0.5; k++) dx = Math.max(dx, s[k]);
    if (Math.min(sx, dx) - s[x] >= 40) colline.push({ x, y: Math.round(s[x]) });
  }
  // fondi le cime troppo vicine (stessa collina con rumore)
  const unite: Collina[] = [];
  for (const c of colline) {
    const u = unite[unite.length - 1];
    if (u && c.x - u.x < 80) { if (c.y < u.y) unite[unite.length - 1] = c; } else unite.push(c);
  }
  let cima = 1e9, cx = 0;
  for (let x = da; x < a; x++) if (sup[x] < cima) { cima = sup[x]; cx = x; }
  let larghezzaCima = 0;
  for (let x = 0; x < W; x++) if (sup[x] <= cima + 30) larghezzaCima++;
  let valle: Misure['valle'] = null;
  if (unite.length >= 2) {
    const [p, q] = unite;
    let vy = 0, vx = p.x;
    for (let x = p.x; x <= q.x; x++) if (s[x] > vy) { vy = s[x]; vx = x; }
    const bassa = Math.max(p.y, q.y);
    const meta = (vy + bassa) / 2;
    let l = vx, r = vx;
    while (l > p.x && s[l] > meta) l--;
    while (r < q.x && s[r] > meta) r++;
    valle = { x: vx, y: Math.round(vy), profondita: Math.round(vy - bassa), larghezza: r - l };
  }
  let grotte = 0, sottile = 0;
  for (let x = 0; x < W; x++) {
    if (sup[x] >= mare) continue;
    for (let y = sup[x] + 1; y < mare; y++) {
      if (maschera[y * W + x] !== ARIA) continue;
      grotte++;
      let roccia = 0;
      for (let k = y - 1; k >= sup[x]; k--) if (maschera[k * W + x] !== ARIA) roccia++;
      if (roccia <= 48) sottile++;
    }
  }
  let rivaBassa = 0;
  for (let x = 0; x < W; x++) if (mare - sup[x] > 0 && mare - sup[x] <= 70) rivaBassa++;
  const piedi = [...m.spawn[0], ...m.spawn[1]];
  const margineMareaAlta = Math.min(...piedi.map((p) => BIL.mondo.mareMareaAlta - p.y));
  const ap = m.appigli ?? [];
  void cx;
  return {
    colline: unite, cima, larghezzaCima, valle, grotte, grotteTettoSottile: sottile, rivaBassa,
    margineMareaAlta, appigli: ap.length, scale: ap.filter((x) => x.tipo === 'scala').length,
    liane: ap.filter((x) => x.tipo !== 'scala').length, barili: (m.barili ?? []).length,
  };
}

/** Il mare più alto (y più piccola, a passi di 5 px fino a 880) con cui la mappa passa ANCORA tutto il validatore.
 *  Serve alla marea di 1G: fin lì può salire senza rompere spawn, barili, linee di tiro e anti-frustrazione. */
export function mareMassimo(m: MappaGenerata): number {
  let ok = m.terreno.mare;
  for (let mare = m.terreno.mare - 5; mare >= 880; mare -= 5) {
    if (validaMappa({ ...m, terreno: { ...m.terreno, mare } }).length) break;
    ok = mare;
  }
  return ok;
}
