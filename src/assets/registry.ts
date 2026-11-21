// REGISTRO CENTRALE DEGLI ASSET (03 §8.1, 11 §5).
// Ogni riferimento grafico o sonoro del gioco passa da qui. Ogni voce nasce come segnaposto (`glyph`, forma disegnata
// dal codice) e diventa definitiva quando si compila `image` con il file in public/assets/<cat>/<id>.webp.
// Il segnaposto ha già misure, ancora, fotogrammi e fps dell'asset vero: la sostituzione cambia l'aspetto, non i tempi.
// Le voci le aggiunge il Technical Artist; il modello (questi tipi) lo cambia solo il Lead Tecnico.
// M0: registro vuoto. Il lotto 1 (03 §8.4) entra da M1/M2, una voce per asset.

export const CATEGORIE = ['PIRATA', 'TERRENO', 'MARE', 'SFONDO', 'PROP', 'ARMA', 'PROIETTILE', 'VFX', 'MAPPA', 'FAZIONE', 'RITRATTO', 'UI'] as const;
export type Categoria = (typeof CATEGORIE)[number];

/** statico = immagine singola · anim = spritesheet a una riga · video = WebM/MP4 (menu e splash) ·
 *  tile = texture ripetibile · 9slice = cornice scalabile · svg = vettoriale monocromo (tinta da CSS). */
export const TIPI = ['statico', 'anim', 'video', 'tile', '9slice', 'svg'] as const;
export type TipoAsset = (typeof TIPI)[number];

export interface SpecAnimazione {
  /** numero di fotogrammi dello sheet */
  frames: number;
  /** fotogrammi al secondo */
  fps: number;
  /** true = ciclo, false = una volta sola */
  loop: boolean;
  /** colonne dello sheet (una riga: cols = frames) */
  cols: number;
  /** punto di ancoraggio in px della cella (pirati: piedi a [64, 120] su 128) */
  ancora: [number, number];
}

export interface VisualAsset {
  /** id in minuscolo_con_trattino_basso, uguale alla chiave nel registro e al nome del file */
  id: string;
  cat: Categoria;
  /** misura a 1× in px CSS (per gli animati: la cella) */
  w: number;
  h: number;
  tipo: TipoAsset;
  /** segnaposto: glifo o simbolo, mostrato finché manca `image` */
  glyph: string;
  /** file definitivo, es. 'assets/pirata/pirata_cammina.webp' (vuoto = segnaposto) */
  image?: string;
  /** versione a 2× (03 §8.2: gli statici si consegnano a 2×) */
  image2x?: string;
  /** solo per gli animati */
  anim?: SpecAnimazione;
  /** 'fazione' = esiste una variante per ciurma (<id>.<ciurma>.webp), ricolorata dal magenta #FF00FF */
  tinta?: 'fazione';
  /** solo per 9slice: bordi [alto, destra, basso, sinistra] in px */
  slice?: [number, number, number, number];
  /** solo per video: immagine di anteprima */
  poster?: string;
  /** provenienza, es. 'magnific:<id creazione>', per ritrovarlo e rigenerarlo */
  source?: string;
}

/** Suoni: oggi sintetizzati; compilando `sample` si usa il file (08). */
export interface SoundAsset { sample?: string; volume?: number }

/** Registro grafico: chiave = id. */
export const ASSETS: Record<string, VisualAsset> = {};
/** Effetti sonori (id di 08, es. 'sfx_arma_cannone_sparo'). */
export const SOUNDS: Record<string, SoundAsset> = {};
/** Musiche (id di 08, es. 'mus_menu'). */
export const MUSIC: Record<string, SoundAsset> = {};

const ID_VALIDO = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

/** Problemi di una voce del registro (vuoto = voce valida). Usato dai test e da `npm run assets:check`. */
export function problemiAsset(chiave: string, a: VisualAsset): string[] {
  const p: string[] = [];
  if (a.id !== chiave) p.push(`id "${a.id}" diverso dalla chiave "${chiave}"`);
  if (!ID_VALIDO.test(a.id)) p.push(`id "${a.id}" non è minuscolo_con_trattino_basso`);
  if (!CATEGORIE.includes(a.cat)) p.push(`categoria sconosciuta ${a.cat}`);
  if (!TIPI.includes(a.tipo)) p.push(`tipo sconosciuto ${a.tipo}`);
  if (!(a.w > 0 && a.h > 0)) p.push('misure mancanti');
  if (!a.glyph && !a.image) p.push('né segnaposto né immagine');
  if (a.tipo === 'anim') {
    const s = a.anim;
    if (!s) p.push('animato senza `anim`');
    else {
      if (!(Number.isInteger(s.frames) && s.frames > 0)) p.push('frames non valido');
      if (!(s.fps > 0 && s.fps <= 60)) p.push('fps fuori da 1-60');
      if (!(Number.isInteger(s.cols) && s.cols > 0 && s.cols <= s.frames)) p.push('cols non valido');
      if (s.cols * a.w > 4096) p.push('sheet oltre 4096 px di larghezza (03 §8.2)');
      const [x, y] = s.ancora;
      if (x < 0 || y < 0 || x > a.w || y > a.h) p.push('ancora fuori dalla cella');
    }
  } else if (a.anim) p.push(`\`anim\` su un asset di tipo ${a.tipo}`);
  if (a.tipo === '9slice' && !a.slice) p.push('9slice senza `slice`');
  if (a.image) {
    const base = `assets/${a.cat.toLowerCase()}/${a.id}`;
    if (a.image !== `${base}.webp` && !(a.tipo === 'svg' && a.image === `${base}.svg`) && !(a.tipo === 'video' && /\.(webm|mp4)$/.test(a.image)))
      p.push(`percorso "${a.image}" diverso da "${base}.webp" (11 §4)`);
  }
  if (a.source !== undefined && !a.source.startsWith('magnific:')) p.push('source deve iniziare con "magnific:"');
  return p;
}

/** Durata in ms di un'animazione (una passata). */
export function durataAnim(a: VisualAsset): number {
  return a.anim ? Math.round((a.anim.frames / a.anim.fps) * 1000) : 0;
}

/** Voce del registro, o un segnaposto "?" se manca (non deve succedere: lo controlla il test). */
export function asset(id: string): VisualAsset {
  return ASSETS[id] ?? { id, cat: 'UI', w: 48, h: 48, tipo: 'statico', glyph: '?' };
}
