// Kit UI dipinto (P2, Arte UI): elenco delle immagini in public/assets/ui/ con le misure delle fette.
// Le immagini le dipinge `node scripts/ui/dipingi-kit.mjs` (in casa, Chromium). Sorgenti a 3×:
// una fetta di 72 px d'immagine diventa un bordo di 24 px CSS.
import type { IdArma } from '../../core/tipi';

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
