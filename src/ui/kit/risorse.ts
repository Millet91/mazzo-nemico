// Kit UI dipinto (P2, Arte UI): elenco delle immagini in public/assets/ui/ con le misure delle fette.
// Le immagini le dipinge `node scripts/ui/dipingi-kit.mjs` (in casa, Chromium). Sorgenti a 3×:
// una fetta di 72 px d'immagine diventa un bordo di 24 px CSS.
import type { IdArma } from '../../core/tipi';
import type { IdMossa, Premio } from '../../core/carriera';

export type IdKit =
  | 'ui_pannello_cornice' | 'ui_pannello_legno' | 'ui_pannello_pergamena'
  | 'ui_pulsante_legno' | 'ui_pulsante_oro' | 'ui_cornice_tonda' | 'ui_menu_sfondo';

export interface VoceKit {
  /** misura dell'immagine in px (sorgente a 3×) */
  w: number;
  h: number;
  /** solo 9 fette: [alto, destra, basso, sinistra] in px d'immagine */
  slice?: [number, number, number, number];
}

/** scala delle sorgenti: le fette in px CSS sono slice / SCALA */
export const SCALA_KIT = 3;

export const KIT: Record<IdKit, VoceKit> = {
  ui_pannello_cornice: { w: 288, h: 288, slice: [72, 72, 72, 72] },
  ui_pannello_legno: { w: 288, h: 288, slice: [66, 66, 66, 66] },
  ui_pannello_pergamena: { w: 240, h: 240, slice: [60, 60, 60, 60] },
  ui_pulsante_legno: { w: 240, h: 168, slice: [48, 60, 66, 60] },
  ui_pulsante_oro: { w: 240, h: 168, slice: [48, 60, 66, 60] },
  ui_cornice_tonda: { w: 144, h: 144 },
  ui_menu_sfondo: { w: 2400, h: 1080 },
};

/** percorso relativo alla pagina (base './' di Vite: funziona nel browser e nell'APK) */
export const urlKit = (id: IdKit) => `assets/ui/${id}.webp`;

/** nome del file dell'icona: pallaSpezzata → ui_arma_palla_spezzata */
export const idIconaArma = (arma: IdArma) => `ui_arma_${arma.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())}`;
export const urlIconaArma = (arma: IdArma) => `assets/ui/${idIconaArma(arma)}.webp`;
/** le icone delle armi sono 128×128, pensate per stare tra 40 e 64 px CSS */
export const LATO_ICONA_ARMA = 128;

export const ARMI_CON_ICONA: readonly IdArma[] = [
  'cannone', 'granata', 'pistola', 'sciabola', 'barile', 'mina', 'rum', 'pallaSpezzata',
  'pappagallo', 'scimmia', 'ancora', 'bordata', 'rampino', 'vanga', 'bussola', 'kraken',
];

/**
 * Mette le immagini del kit in variabili CSS sulla radice (`--kit-<nome>`), così `kit.css` non dipende
 * da dove Vite mette il foglio di stile. L'indirizzo è assoluto: un url() dentro una variabile si risolverebbe
 * rispetto al foglio che la usa (dist/assets/), non rispetto alla pagina.
 */
export function applicaKit(radice: HTMLElement = document.documentElement): void {
  for (const id of Object.keys(KIT) as IdKit[]) {
    radice.style.setProperty(`--kit-${id.slice(3).replace(/_/g, '-')}`, `url("${new URL(urlKit(id), document.baseURI).href}")`);
  }
}

// ─── Pezzi del Tavolo del Timone (li disegna la scena del mondo, a scala 1/3) ───────────────────
export type IdPezzoMondo = 'ui_mondo_pedina_rossa' | 'ui_mondo_pedina_grigia' | 'ui_mondo_cartello_marina' | 'ui_mondo_bandierina';
/** misura e ancora in px d'immagine (3×): pedina = centro della cifra, cartello e bandierina = piede del palo */
export const PEZZI_MONDO: Record<IdPezzoMondo, { w: number; h: number; ancora: [number, number] }> = {
  ui_mondo_pedina_rossa: { w: 144, h: 144, ancora: [72, 64] },
  ui_mondo_pedina_grigia: { w: 144, h: 144, ancora: [72, 64] },
  ui_mondo_cartello_marina: { w: 144, h: 192, ancora: [72, 186] },
  ui_mondo_bandierina: { w: 96, h: 144, ancora: [20, 140] },
};
export const urlPezzoMondo = (id: IdPezzoMondo) => `assets/ui/${id}.webp`;

// ─── Icone dei premi (128 px) ────────────────────────────────────────────────────────────────────
export const MOSSE_CON_ICONA: readonly IdMossa[] = ['saltoAppoggio', 'dondolo', 'scivolata', 'tuffo'];
const sneak = (s: string) => s.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
/** icona di un premio: arma → la sua icona dipinta, mossa → la sua, recluta e bandiera → icona del tipo */
export function urlPremio(p: Premio): string {
  switch (p.t) {
    case 'arma': return urlIconaArma(p.arma);
    case 'mossa': return `assets/ui/ui_premio_mossa_${sneak(p.mossa)}.webp`;
    case 'recluta': return 'assets/ui/ui_premio_recluta.webp';
    case 'bandiera': return 'assets/ui/ui_premio_bandiera.webp';
  }
}
/** icona generica per TIPO di premio (medaglione sopra l'isola quando non serve il dettaglio) */
export const urlTipoPremio = (t: Premio['t']) =>
  t === 'mossa' ? 'assets/ui/ui_premio_mossa_salto_appoggio.webp' : `assets/ui/ui_premio_${t}.webp`;
