// Immagini del Tavolo del Timone, dipinte in casa da scripts/mondo/dipingi.ts in public/assets/mondo/.
// Si caricano la prima volta che serve la mappa del mondo (non all'avvio: il menu deve comparire subito).
// Memoria in GPU: carta 3072×1728 (~21 MB) + 9 isole e 9 fasce a 2× (~12 MB) + piccoli: sotto i 40 MB.
import { Assets, type Texture } from 'pixi.js';
import type { IdIsola } from '../../core/carriera';
import type { Indici } from './logica';
import { urlPezzoMondo, urlPremio, urlTipoPremio } from '../../ui/kit/risorse';
import type { DefIsola } from '../../core/carriera';

const BASE = './assets/mondo/';

export interface Manifesto { ordineIndici: IdIsola[]; passoIndici: number; scalaIndici: number; risoluzione: number; tessera: number }

export interface TextureMondo {
  manifesto: Manifesto;
  tavolo: Texture;
  /** tessere della carta per [riga][colonna] */
  carta: Texture[][];
  ondeA: Texture;
  ondeB: Texture;
  isole: Map<IdIsola, Texture>;
  onde: Map<IdIsola, Texture>;
  pedinaRossa: Texture;
  pedinaGrigia: Texture;
  cartello: Texture;
  bandierina: Texture;
  /** icona generica per tipo di premio (kit di Arte UI) */
  premi: Record<'arma' | 'mossa' | 'recluta' | 'bandiera', Texture>;
  /** icona del primo premio di ogni isola (rampino, ancora, mossa…) */
  premiIsola: Map<IdIsola, Texture>;
  boccale: Texture;
  nebbia: Texture;
  veliero: Texture;
  indici: Indici | null;
}

async function leggiIndici(m: Manifesto): Promise<Indici | null> {
  try {
    const img = new Image();
    img.src = `${BASE}indici.png`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(img, 0, 0);
    const dati = g.getImageData(0, 0, c.width, c.height).data;
    const rossi = new Uint8Array(c.width * c.height);
    for (let i = 0; i < rossi.length; i++) rossi[i] = dati[i * 4];
    return { w: c.width, h: c.height, rossi, scala: m.scalaIndici, passo: m.passoIndici, ordine: m.ordineIndici };
  } catch (e) {
    // senza immagine a indici i tocchi usano i cerchi attorno ai centri (logica.isolaInPunto)
    console.warn('mappa del mondo: immagine a indici non letta', e);
    return null;
  }
}

// pedine, cartello, bandierina e premi vengono dal kit dipinto di Arte UI (public/assets/ui/, a 3×)
const KIT_MONDO = ['ui_mondo_pedina_rossa', 'ui_mondo_pedina_grigia', 'ui_mondo_cartello_marina', 'ui_mondo_bandierina'] as const;
const TIPI_PREMIO = ['arma', 'mossa', 'recluta', 'bandiera'] as const;

export async function caricaTextureMondo(isole: IdIsola[], righe: number, colonne: number, defs: DefIsola[] = []): Promise<TextureMondo> {
  const manifesto = (await (await fetch(`${BASE}mondo.json`)).json()) as Manifesto;
  const nomi: string[] = ['tavolo.webp', 'onde-a.png', 'onde-b.png', 'boccale.webp', 'nebbia.png', 'veliero.webp'];
  for (let r = 0; r < righe; r++) for (let c = 0; c < colonne; c++) nomi.push(`carta-${r}-${c}.webp`);
  for (const id of isole) nomi.push(`isola-${id}.webp`, `onda-${id}.png`);
  const premiIsola = defs.filter((d) => d.premi.length).map((d) => [d.id, './' + urlPremio(d.premi[0])] as const);
  const kit = [...KIT_MONDO.map((k) => './' + urlPezzoMondo(k)), ...TIPI_PREMIO.map((t) => './' + urlTipoPremio(t)), ...premiIsola.map(([, u]) => u)];
  const [tex, indici] = await Promise.all([Assets.load<Texture>([...nomi.map((n) => BASE + n), ...kit]), leggiIndici(manifesto)]);
  const k = (id: (typeof KIT_MONDO)[number]) => tex['./' + urlPezzoMondo(id)];
  const t = (n: string) => tex[BASE + n];
  const carta: Texture[][] = [];
  for (let r = 0; r < righe; r++) { carta.push([]); for (let c = 0; c < colonne; c++) carta[r].push(t(`carta-${r}-${c}.webp`)); }
  return {
    manifesto,
    tavolo: t('tavolo.webp'),
    carta,
    ondeA: t('onde-a.png'),
    ondeB: t('onde-b.png'),
    isole: new Map(isole.map((id) => [id, t(`isola-${id}.webp`)])),
    onde: new Map(isole.map((id) => [id, t(`onda-${id}.png`)])),
    pedinaRossa: k('ui_mondo_pedina_rossa'),
    pedinaGrigia: k('ui_mondo_pedina_grigia'),
    cartello: k('ui_mondo_cartello_marina'),
    bandierina: k('ui_mondo_bandierina'),
    premi: Object.fromEntries(TIPI_PREMIO.map((tp) => [tp, tex['./' + urlTipoPremio(tp)]])) as TextureMondo['premi'],
    premiIsola: new Map(premiIsola.map(([id, u]) => [id, tex[u]])),
    boccale: t('boccale.webp'),
    nebbia: t('nebbia.png'),
    veliero: t('veliero.webp'),
    indici,
  };
}
