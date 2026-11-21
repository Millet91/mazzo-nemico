// Cosa cerca ogni isola del cap. 1 nella forma della mappa, per il suo trucco ambientale (livelli-cap1.md §2).
// Ordine = ordine di scelta: prima le isole con la forma più rara, così non restano senza seme.
import type { MappaGenerata } from '../../../src/core/tipi';
import { superficie } from '../../../src/battaglia/gen/analisi';
import { mareMassimo, type Misure } from './misure';

export interface Profilo {
  id: string;
  trucco: string;
  adatto: (m: Misure) => boolean;
  /** più alto = più adatto */
  voto: (m: Misure) => number;
  descrivi: (m: Misure) => string;
  /** dove andrà il trucco (per l'anteprima): centro e raggio in px di mondo */
  punto: (m: Misure, mappa: MappaGenerata) => { x: number; y: number; r: number };
  /** facoltativo: riordina i primi 40 adatti con una misura più costosa (più alto = meglio) */
  rifinisci?: (mappa: MappaGenerata) => number;
}

const W = 2048;
const due = (m: Misure) => m.colline.length === 2 && m.valle !== null;
const testo = (m: Misure) =>
  `colline ${m.colline.length} (cima y ${m.cima}, larga ${m.larghezzaCima})` +
  (m.valle ? `, valle prof. ${m.valle.profondita} larga ${m.valle.larghezza}` : '') +
  `, grotte ${m.grotte} (tetto sottile ${m.grotteTettoSottile}), riva bassa ${m.rivaBassa}, appigli ${m.scale}S+${m.liane}L, margine marea ${m.margineMareaAlta}`;
const cima = (m: Misure) => ({ x: m.colline.reduce((a, c) => (c.y < a.y ? c : a), m.colline[0]).x, y: m.cima, r: 70 });
const valle = (m: Misure) => ({ x: m.valle!.x, y: m.valle!.y - 40, r: Math.max(60, m.valle!.larghezza / 2 + 20) });

/** baricentro delle grotte (aria chiusa sotto la superficie), pesato sui tetti sottili se `sottili` */
function grotte(mappa: MappaGenerata, sottili: boolean) {
  const { maschera, mare } = mappa.terreno;
  const sup = superficie(maschera);
  let sx = 0, sy = 0, n = 0;
  for (let x = 0; x < W; x++) for (let y = sup[x] + 1; y < mare; y++) {
    if (maschera[y * W + x]) continue;
    if (sottili && y - sup[x] > 60) continue;
    sx += x; sy += y; n++;
  }
  return n ? { x: sx / n, y: sy / n, r: 80 } : { x: W / 2, y: 600, r: 80 };
}

/** la grotta più grande: colonna con più aria chiusa, a metà altezza della grotta */
function grottaGrande(mappa: MappaGenerata) {
  const { maschera, mare } = mappa.terreno;
  const sup = superficie(maschera);
  let best = 0, bx = W / 2, by = 600;
  for (let x = 0; x < W; x += 4) {
    let n = 0, sy = 0;
    for (let y = sup[x] + 1; y < mare; y++) if (!maschera[y * W + x]) { n++; sy += y; }
    if (n > best) { best = n; bx = x; by = sy / n; }
  }
  return { x: bx, y: by, r: 70 };
}

export const PROFILI: Profilo[] = [
  {
    // torre di vedetta in cima, Bandiera: una sola cima alta e stretta, più scale e liane possibili
    id: '1D', trucco: 'torre',
    adatto: (m) => m.colline.length === 1,
    voto: (m) => (600 - m.cima) * 2 - m.larghezzaCima + m.appigli * 40,
    descrivi: testo, punto: cima,
  },
  {
    // palma che cade e fa da ponte: valle stretta (la palma è lunga ~220 px) e non troppo profonda
    id: '1H', trucco: 'palmaPonte',
    adatto: (m) => due(m) && m.valle!.larghezza >= 110 && m.valle!.larghezza <= 220 && m.valle!.profondita >= 50,
    voto: (m) => -Math.abs(m.valle!.larghezza - 170) - Math.abs(m.valle!.profondita - 90),
    descrivi: testo, punto: valle,
  },
  {
    // gru su una collina col carico sospeso sopra la valle: valle più profonda possibile
    id: '1B', trucco: 'gru',
    adatto: (m) => due(m) && m.valle!.larghezza >= 140,
    voto: (m) => m.valle!.profondita * 2 + Math.min(m.valle!.larghezza, 300) * 0.3,
    descrivi: testo, punto: valle,
  },
  {
    // bastione in cima: una collina sola con l'altopiano più largo
    id: '1C', trucco: 'bastione',
    adatto: (m) => m.colline.length === 1,
    voto: (m) => m.larghezzaCima + (600 - m.cima) * 0.5,
    descrivi: testo, punto: (m, mp) => ({ ...cima(m), r: Math.max(80, m.larghezzaCima / 2) }),
  },
  {
    // archi di roccia che crollano: grotte con il tetto sottile
    id: '1E', trucco: 'archi',
    adatto: (m) => m.grotteTettoSottile > 0,
    voto: (m) => m.grotteTettoSottile,
    descrivi: testo, punto: (m, mp) => grotte(mp, true),
  },
  {
    // stalattiti: grotte grandi con il tetto spesso (lì pendono le stalattiti)
    id: '1F', trucco: 'stalattiti',
    adatto: (m) => m.grotte > 8000,
    voto: (m) => m.grotte - m.grotteTettoSottile * 2,
    descrivi: testo, punto: (m, mp) => grottaGrande(mp),
  },
  {
    // dune con la marea: la più piatta e con gli spawn più alti sulla Marea alta
    id: '1G', trucco: 'dune',
    adatto: (m) => m.margineMareaAlta > 0,
    voto: (m) => m.cima + m.margineMareaAlta * 2,
    rifinisci: (mp) => -mareMassimo(mp),
    descrivi: testo, punto: (m, mp) => ({ x: mp.specchiata ? W - 200 : 200, y: 900, r: 110 }),
  },
  {
    // palafitte sul porto: riva bassa lunga e due colline (paese e scoglio). In Fase B diventa la mappa a mano.
    id: '1A', trucco: 'palafitte',
    adatto: due,
    voto: (m) => m.rivaBassa,
    descrivi: testo, punto: () => ({ x: 160, y: 900, r: 110 }),
  },
];
