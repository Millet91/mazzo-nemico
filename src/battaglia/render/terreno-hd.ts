// Terreno HD (Fase 2, PIANO §3; P1-contratti §6): il quadro della mappa a 2× (4096×2048) in tessere da 512 px, e uno
// shader che legge la maschera della sim come texture. La forma la decide la maschera (bordi lisci col filtro
// lineare), il colore il quadro. Dopo un cratere la CPU non ridipinge niente: si ricalcolano i canali della
// maschera solo nelle colonne toccate e si carica sulla GPU solo il rettangolo cambiato.
//
// Canali della texture della maschera (RGBA8, 2048×1024, un texel per px di mondo):
//   R = solido adesso · G = scavato (solido all'inizio, aria adesso; 255 se coperto, 128 se si vede il cielo)
//   B = sbordo spento (contorno dipinto di un solido che non c'è più) · A = bordo bruciato (uno scavo entro 3 px)
// Tutto calcolato sulla CPU, solo nelle colonne di un cratere: lo shader legge un solo texel della maschera.
// Nello shader: solido → colore del quadro, bruciato vicino agli scavi; aria scavata e coperta → il quadro scurito
// (fondo del buco); aria non scavata → il quadro com'è (contorno dipinto, pareti di grotte e archi ad alfa ≤ 110),
// tranne B; il resto è trasparente (cielo e mare dietro).
//
// Formato delle tessere (Mappa, PR #90): public/assets/mappe/<arte>/hd/t-<colonna>-<riga>.webp, contenuto 512×512 con
// `bordo` px di margine (file 516×516), WebP senza perdita; hd/indice.json con le sole tessere non vuote. Una
// cartella variante (hd-prologo) ha `base: "hd"` e solo le tessere che cambiano.
// Le mappe senza hd/ (isole generate, Cala vecchia) restano col disegno sulla CPU (terreno.ts).
import { Assets, BufferImageSource, Container, Geometry, Mesh, Shader, Texture, type Renderer } from 'pixi.js';
import type { Terreno } from '../../core/tipi';
import { MATERIALE } from '../../core/tipi';
import { PALETTE, hex } from '../../core/palette';
import { BIL } from '../../contenuti/bilanciamento';
import { fondoOriginale } from './pittura-terreno';
import { aspettaRisoluzione } from '../../render/risoluzione';

export interface IndiceHd {
  /** px del quadro per px di mondo (2) */
  scala: number;
  /** lato del contenuto di una tessera, px del quadro (512) */
  lato: number;
  /** margine attorno al contenuto, px del quadro (2) */
  bordo: number;
  colonne: number;
  righe: number;
  /** tessere non vuote, "t-<colonna>-<riga>" */
  tessere: string[];
  /** cartella da cui prendere le tessere che qui mancano (variante: hd-prologo → "hd") */
  base?: string;
}

/** Una tessera da caricare: dove sta nel mondo e da che file. */
export interface TesseraHd { colonna: number; riga: number; url: string }

/** Legge "t-3-1" → colonna 3, riga 1 (null se il nome non torna). */
export function nomeTessera(n: string): { colonna: number; riga: number } | null {
  const m = /^t-(\d+)-(\d+)$/.exec(n);
  return m ? { colonna: Number(m[1]), riga: Number(m[2]) } : null;
}

/**
 * Le tessere da caricare per una cartella HD: le sue, più quelle della base che non ha (variante del Prologo).
 * `cartella` e `base` sono URL di cartella con la barra finale.
 */
export function tessereDaCaricare(indice: IndiceHd, cartella: string, indiceBase?: IndiceHd | null, cartellaBase?: string): TesseraHd[] {
  const out = new Map<string, TesseraHd>();
  if (indiceBase && cartellaBase) {
    for (const n of indiceBase.tessere) {
      const p = nomeTessera(n);
      if (p) out.set(n, { ...p, url: `${cartellaBase}${n}.webp` });
    }
  }
  for (const n of indice.tessere) {
    const p = nomeTessera(n);
    if (p) out.set(n, { ...p, url: `${cartella}${n}.webp` });
  }
  return [...out.values()].filter((t) => t.colonna < indice.colonne && t.riga < indice.righe);
}

/** true se l'indice ha la forma concordata con Mappa e torna col mondo w×h. */
export function indiceValido(x: unknown, w: number, h: number): x is IndiceHd {
  const i = x as IndiceHd;
  return !!i && typeof i === 'object' && i.scala > 0 && i.lato > 0 && i.bordo >= 0 && Array.isArray(i.tessere)
    && i.colonne * i.lato === w * i.scala && i.righe * i.lato === h * i.scala;
}

// ─── Canali della maschera (parte pura) ───

/** Valori del canale G: scavato e coperto (fondo di un buco) / scavato e scoperto (si vede il cielo). */
export const SCAVATO_COPERTO = 255;
export const SCAVATO_APERTO = 128;

/**
 * Scrive i canali R e G della maschera per le colonne [x0, x1) in `out` (RGBA, w×h).
 * R = solido adesso; G = scavato (solido all'inizio, aria adesso): `SCAVATO_COPERTO` se sotto il primo solido di
 * adesso e sopra l'ultimo solido di prima, altrimenti `SCAVATO_APERTO`.
 * Si ricalcola la colonna intera: un cratere che apre il tetto di una grotta la scopre anche sotto di sé.
 * B (sbordo spento) e A (bordo bruciato) li scrivono `canaleSbordo` e `canaleBruciato`, dopo.
 */
export function canaliMaschera(maschera: Uint8Array, originale: Uint8Array, w: number, h: number, out: Uint8Array, x0 = 0, x1 = w, y0 = 0): void {
  const fondo = fondoOriginale(originale, w, h);
  x0 = Math.max(0, x0); x1 = Math.min(w, x1); y0 = Math.max(0, y0);
  if (x1 <= x0) return;
  // la cima di adesso di ogni colonna (si scende finché si trova del solido)
  const rw = x1 - x0;
  if (cime.length < rw) cime = new Int32Array(rw);
  for (let x = x0; x < x1; x++) {
    let c = h;
    for (let y = 0, i = x; y < h; y++, i += w) if (maschera[i] !== MATERIALE.aria) { c = y; break; }
    cime[x - x0] = c;
  }
  // poi per righe (in memoria la maschera è per righe)
  for (let y = y0; y < h; y++) {
    for (let x = x0, i = y * w + x0; x < x1; x++, i++) {
      const k = i * 4;
      const solido = maschera[i] !== MATERIALE.aria;
      out[k] = solido ? 255 : 0;
      out[k + 1] = solido || originale[i] === MATERIALE.aria ? 0
        : y > cime[x - x0] && y < fondo[x] ? SCAVATO_COPERTO : SCAVATO_APERTO;
    }
  }
}

let cime = new Int32Array(0);
let tmpOriz = new Uint8Array(0);
let tmpRis = new Uint8Array(0);
let ultimo = new Int32Array(0);

/**
 * Dilatazione quadrata (lato 2·raggio+1) dei byte non nulli di `src` (passo `passo`, scarto `canale`: per leggere un
 * canale di un RGBA) nel rettangolo [x0, x1) × [y0, y1). Chiama `scrivi(i, vicino)` per ogni px del rettangolo.
 * Separabile e lineare nell'area: per riga e poi per colonna, la distanza dall'ultimo px acceso a sinistra/sopra e
 * dal prossimo a destra/sotto. Legge `src` anche fuori dal rettangolo, fino a `raggio`.
 */
function dilata(src: Uint8Array, passo: number, canale: number, w: number, h: number, raggio: number,
  x0: number, x1: number, y0: number, y1: number, scrivi: (i: number, vicino: boolean) => void): void {
  x0 = Math.max(0, x0); x1 = Math.min(w, x1); y0 = Math.max(0, y0); y1 = Math.min(h, y1);
  if (x1 <= x0 || y1 <= y0) return;
  const ya = Math.max(0, y0 - raggio), yb = Math.min(h, y1 + raggio);
  const xa = Math.max(0, x0 - raggio), xb = Math.min(w, x1 + raggio);
  const rw = x1 - x0, LONTANO = 1 << 29;
  if (tmpOriz.length < rw * (yb - ya)) tmpOriz = new Uint8Array(rw * (yb - ya));
  if (tmpRis.length < rw * (y1 - y0)) tmpRis = new Uint8Array(rw * (y1 - y0));
  if (ultimo.length < rw) ultimo = new Int32Array(rw);
  const acceso = (x: number, y: number) => src[(y * w + x) * passo + canale] !== 0;
  // per riga: c'è un px acceso entro `raggio` a sinistra o a destra?
  for (let y = ya; y < yb; y++) {
    const o = (y - ya) * rw - x0;
    let ult = -LONTANO;
    for (let x = xa; x < x0; x++) if (acceso(x, y)) ult = x;
    for (let x = x0; x < x1; x++) { if (acceso(x, y)) ult = x; tmpOriz[o + x] = x - ult <= raggio ? 1 : 0; }
    let pros = LONTANO;
    for (let x = xb - 1; x >= x1; x--) if (acceso(x, y)) pros = x;
    for (let x = x1 - 1; x >= x0; x--) { if (acceso(x, y)) pros = x; if (pros - x <= raggio) tmpOriz[o + x] = 1; }
  }
  // per colonna, scorrendo le righe: dall'alto (ultima riga accesa sopra) e dal basso (prossima sotto)
  ultimo.fill(-LONTANO, 0, rw);
  for (let y = ya; y < yb; y++) {
    const o = (y - ya) * rw, r = (y - y0) * rw;
    for (let c = 0; c < rw; c++) {
      if (tmpOriz[o + c]) ultimo[c] = y;
      if (y >= y0 && y < y1) tmpRis[r + c] = y - ultimo[c] <= raggio ? 1 : 0;
    }
  }
  ultimo.fill(LONTANO, 0, rw);
  for (let y = yb - 1; y >= ya; y--) {
    const o = (y - ya) * rw, r = (y - y0) * rw;
    for (let c = 0; c < rw; c++) {
      if (tmpOriz[o + c]) ultimo[c] = y;
      if (y >= y0 && y < y1 && ultimo[c] - y <= raggio) tmpRis[r + c] = 1;
    }
  }
  for (let y = y0; y < y1; y++) {
    const r = (y - y0) * rw - x0;
    for (let x = x0; x < x1; x++) scrivi(y * w + x, tmpRis[r + x] !== 0);
  }
}

/** Canale A = bordo bruciato: 255 dove c'è uno scavo (G) entro `raggio` px, nel rettangolo [x0, x1) × [y0, y1). */
export function canaleBruciato(out: Uint8Array, w: number, h: number, raggio: number, x0 = 0, x1 = w, y0 = 0, y1 = h): void {
  dilata(out, 4, 1, w, h, raggio, x0, x1, y0, y1, (i, v) => { out[i * 4 + 3] = v ? 255 : 0; });
}

/**
 * 1 dove c'è del solido di prima entro `raggio` px, nelle colonne [x0, x1) di `out` (w×h; nuovo se manca).
 * Non cambia mai: si calcola una volta per mappa (a fette, mentre il terreno HD si carica).
 */
export function vicinoOriginale(originale: Uint8Array, w: number, h: number, raggio: number, out: Uint8Array = new Uint8Array(w * h), x0 = 0, x1 = w): Uint8Array {
  dilata(originale, 1, 0, w, h, raggio, x0, x1, 0, h, (i, x) => { out[i] = x ? 1 : 0; });
  return out;
}

/** C'è almeno uno scavo (canale G) nelle colonne [x0, x1)? */
export function haScavi(out: Uint8Array, w: number, h: number, x0: number, x1: number): boolean {
  x0 = Math.max(0, x0); x1 = Math.min(w, x1);
  for (let y = 0; y < h; y++) for (let k = (y * w + x0) * 4 + 1, f = (y * w + x1) * 4; k < f; k += 4) if (out[k]) return true;
  return false;
}

/**
 * Canale B = sbordo spento: 255 dove il quadro va nascosto perché era il contorno dipinto di un solido che non c'è
 * più (entro `raggio` px dal solido di prima ma non da quello di adesso), nel rettangolo [x0, x1) × [y0, y1).
 */
export function canaleSbordo(maschera: Uint8Array, vicinoPrima: Uint8Array, w: number, h: number, raggio: number, out: Uint8Array,
  x0 = 0, x1 = w, y0 = 0, y1 = h): void {
  dilata(maschera, 1, 0, w, h, raggio, x0, x1, y0, y1, (i, v) => { out[i * 4 + 2] = vicinoPrima[i] && !v ? 255 : 0; });
}

/**
 * Righe da ricaricare dopo un cratere nelle colonne [x0, x1): dalla cima del cratere fino all'ultima riga che
 * può essere cambiata (il fondo originale più basso di quelle colonne: sotto non c'è niente da coprire).
 */
export function righeToccate(originale: Uint8Array, w: number, h: number, x0: number, x1: number, yCima: number): [number, number] {
  const fondo = fondoOriginale(originale, w, h);
  let y1 = Math.min(h, Math.max(0, yCima) + 1);
  for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) y1 = Math.max(y1, Math.min(h, fondo[x] + 1));
  return [Math.max(0, Math.min(h - 1, yCima)), y1];
}

// ─── Shader ───

const VERTICE = /* glsl */ `
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
out vec2 vMondo;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
uniform vec2 uOrigine;
void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
  vMondo = aPosition + uOrigine;
}`;

const rgbGlsl = (c: string) => {
  const n = hex(c);
  return `vec3(${(((n >> 16) & 255) / 255).toFixed(4)}, ${(((n >> 8) & 255) / 255).toFixed(4)}, ${((n & 255) / 255).toFixed(4)})`;
};

/** px di mondo del bordo bruciato attorno agli scavi (lo stesso numero della pittura sulla CPU) */
const BRUCIATO_PX = BIL.fisica.bordoBruciato;
/** px di mondo entro cui il quadro fuori dalla maschera è contorno dipinto di un solido (Mappa, PR #90: lo sbordo è
 *  8 px del quadro = 4 di mondo; +1 per il suo bordo sfumato) */
const SBORDO_PX = 5;

const FRAMMENTO = /* glsl */ `
precision highp float;
in vec2 vUV;
in vec2 vMondo;
out vec4 finalColor;
uniform sampler2D uArte;
uniform sampler2D uMaschera;
uniform vec2 uMondo;
const vec3 BRUCIATO = ${rgbGlsl(PALETTE.bordoBruciato)};
const vec3 SABBIA = ${rgbGlsl(PALETTE.sabbia)};

void main() {
  vec4 a = texture(uArte, vUV);
  vec3 ac = a.a > 0.004 ? a.rgb / a.a : vec3(0.0);
  vec2 q = vMondo / uMondo;
  vec4 m = texture(uMaschera, q);
  // bordo liscio: la maschera filtrata in lineare
  float solido = smoothstep(0.3, 0.7, m.r);

  // solido: il quadro, bruciato vicino a uno scavo (canale A) con una grana leggera
  float grana = fract(sin(dot(floor(vMondo), vec2(12.9898, 78.233))) * 43758.5453);
  // solido dove il quadro non ha colore (terreno nuovo dove prima c'era aria: sabbia che frana): sabbia granulosa
  vec3 quadroPieno = mix(SABBIA * (0.92 + 0.16 * grana), ac, smoothstep(0.3, 0.7, a.a));
  vec3 pieno = mix(quadroPieno, BRUCIATO * (0.85 + 0.3 * grana), smoothstep(0.1, 0.6, m.a) * 0.85);

  // aria non scavata: il quadro com'è (contorno dipinto, pareti di grotte e archi), tranne il contorno di un
  // solido che non c'è più (canale B)
  float vis = a.a * (1.0 - smoothstep(0.3, 0.7, m.b));
  vec4 quadro = vec4(ac * vis, vis);

  // aria scavata (canale G): in fondo a un buco coperto il quadro scurito e freddo (ombre blu-viola, 03 §1);
  // scoperto, niente (cielo e mare dietro)
  float scavato = step(0.25, m.g);
  float coperto = step(0.75, m.g);
  vec3 scuro = ac * vec3(0.3, 0.3, 0.36) + vec3(14.0, 12.0, 26.0) / 255.0;
  vec4 fondoBuco = vec4(scuro * 0.92, 0.92) * coperto;
  vec4 vuoto = mix(quadro, fondoBuco, scavato);

  finalColor = vec4(pieno, 1.0) * solido + vuoto * (1.0 - solido);
}`;

// ─── Strato Pixi ───

export interface MisureHd {
  /** ms dall'inizio del caricamento a tutte le tessere pronte */
  caricamentoMs: number;
  tessere: number;
  /** byte stimati sulla GPU: tessere (con le mipmap) e maschera */
  byteTexture: number;
  /** ms del pezzo di preparazione più lungo (un frame): canali di una fetta o due tessere sulla GPU */
  passoPeggioreMs: number;
}

/** Cartella degli asset di una mappa (come sfondi-mappa.ts). */
function cartellaMappa(arte: string): string {
  return `${import.meta.env.BASE_URL ?? '/'}assets/mappe/${arte}/`;
}

async function leggiIndice(url: string, w: number, h: number): Promise<IndiceHd | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j: unknown = await r.json();
    return indiceValido(j, w, h) ? j : null;
  } catch { return null; }
}

/** Il terreno HD di una battaglia: tessere del quadro + texture della maschera + shader. */
export class TerrenoHd {
  readonly radice = new Container();
  private readonly dati: Uint8Array;
  private readonly sorgente: BufferImageSource;
  private readonly texMaschera: Texture;
  private readonly originale: Uint8Array;
  /** 1 entro SBORDO_PX dal solido di prima */
  private readonly vicinoPrima: Uint8Array;
  /** rettangolo da ricaricare sulla GPU, in px di mondo: x0, y0, x1, y1 */
  private sporco: [number, number, number, number] | null = null;
  private readonly tessere: Texture[] = [];
  misure: MisureHd = { caricamentoMs: 0, tessere: 0, byteTexture: 0, passoPeggioreMs: 0 };
  private passoPeggiore = 0;
  private distrutto = false;

  private constructor(private readonly terreno: Terreno, private readonly renderer: Renderer, originale: Uint8Array) {
    const { w, h } = terreno;
    this.originale = originale;
    // i canali si calcolano a fette in `precarica`, un frame per fetta
    this.dati = new Uint8Array(w * h * 4);
    this.vicinoPrima = new Uint8Array(w * h);
    this.sorgente = new BufferImageSource({
      resource: this.dati, width: w, height: h, format: 'rgba8unorm', alphaMode: 'no-premultiply-alpha',
      scaleMode: 'linear', addressMode: 'clamp-to-edge', autoGenerateMipmaps: false,
    });
    this.texMaschera = new Texture({ source: this.sorgente });
  }

  /**
   * Carica il terreno HD della mappa `arte`, o null se la mappa non ha hd/ (o qualcosa non va: resta il terreno
   * di oggi). `variante`: cartella alternativa (es. 'hd-prologo') con base 'hd'.
   */
  static async carica(arte: string, terreno: Terreno, originale: Uint8Array, renderer: Renderer, variante = 'hd'): Promise<TerrenoHd | null> {
    const t0 = performance.now();
    const base = cartellaMappa(arte);
    const indice = await leggiIndice(`${base}${variante}/indice.json`, terreno.w, terreno.h);
    if (!indice) return null;
    const indiceBase = indice.base ? await leggiIndice(`${base}${indice.base}/indice.json`, terreno.w, terreno.h) : null;
    const lista = tessereDaCaricare(indice, `${base}${variante}/`, indiceBase, indice.base ? `${base}${indice.base}/` : undefined);
    if (!lista.length) return null;
    let caricate: (Texture | null)[];
    try {
      caricate = await Promise.all(lista.map((t) => Assets.load<Texture>(t.url).catch(() => null)));
    } catch { return null; }
    if (caricate.some((t) => !t)) return null;
    const hd = new TerrenoHd(terreno, renderer, originale);
    const mondoLato = indice.lato / indice.scala;
    const pieno = indice.lato + 2 * indice.bordo;
    lista.forEach((t, i) => hd.aggiungiTessera(caricate[i]!, t.colonna * mondoLato, t.riga * mondoLato, mondoLato, indice.bordo / pieno, (indice.bordo + indice.lato) / pieno));
    await hd.precarica();
    hd.misure = {
      caricamentoMs: Math.round(performance.now() - t0),
      tessere: lista.length,
      // RGBA8 con le mipmap (+1/3) per le tessere, RGBA8 senza mipmap per la maschera
      byteTexture: Math.round(lista.length * pieno * pieno * 4 * (4 / 3)) + terreno.w * terreno.h * 4,
      passoPeggioreMs: Math.round(hd.passoPeggiore * 10) / 10,
    };
    return hd;
  }

  private aggiungiTessera(t: Texture, x: number, y: number, lato: number, u0: number, u1: number): void {
    const s = t.source;
    // filtro lineare con le mipmap: da lontano niente sfarfallio; il margine di 2 px tiene unite le tessere
    s.scaleMode = 'linear';
    s.mipmapFilter = 'linear';
    s.addressMode = 'clamp-to-edge';
    // le mipmap le crea Pixi al primo caricamento sulla GPU (se la tessera è già in cache, le ha già)
    s.autoGenerateMipmaps = true;
    this.tessere.push(t);
    const geometria = new Geometry({
      attributes: {
        aPosition: [0, 0, lato, 0, lato, lato, 0, lato],
        aUV: [u0, u0, u1, u0, u1, u1, u0, u1],
      },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    const shader = Shader.from({
      gl: { vertex: VERTICE, fragment: FRAMMENTO, name: 'terreno-hd' },
      resources: {
        uArte: s,
        uMaschera: this.sorgente,
        uniformi: { uOrigine: { value: [x, y], type: 'vec2<f32>' }, uMondo: { value: [this.terreno.w, this.terreno.h], type: 'vec2<f32>' } },
      },
    });
    const mesh = new Mesh({ geometry: geometria, shader });
    mesh.position.set(x, y);
    this.radice.addChild(mesh);
  }

  /**
   * Prepara tutto a pezzi, un pezzo per frame, così la battaglia non si ferma: i canali della maschera a fette di
   * colonne (A e B solo dove ci sono già scavi: altrimenti sono zero), poi maschera e tessere (con le mipmap) sulla
   * GPU, due per frame. Senza, il primo frame col terreno HD le caricava tutte insieme: uno scatto di ~35 ms sul
   * container (e ~150 ms di calcolo dei canali tutto in una volta).
   */
  private async precarica(): Promise<void> {
    aspettaRisoluzione();
    const { w, h, maschera } = this.terreno;
    let t = performance.now();
    const frame = () => {
      this.passoPeggiore = Math.max(this.passoPeggiore, performance.now() - t);
      return new Promise<void>((ok) => requestAnimationFrame(() => { t = performance.now(); ok(); }));
    };
    const FETTA = 128;
    for (let x = 0; x < w; x += FETTA) {
      canaliMaschera(maschera, this.originale, w, h, this.dati, x, x + FETTA);
      vicinoOriginale(this.originale, w, h, SBORDO_PX, this.vicinoPrima, x, x + FETTA);
      await frame();
      if (this.distrutto) return;
    }
    // A e B dipendono dalle fette vicine (fino a 5 px): si fanno dopo, solo dove serve
    for (let x = 0; x < w; x += FETTA) {
      if (!haScavi(this.dati, w, h, x - SBORDO_PX, x + FETTA + SBORDO_PX)) continue;
      canaleSbordo(maschera, this.vicinoPrima, w, h, SBORDO_PX, this.dati, x, x + FETTA);
      canaleBruciato(this.dati, w, h, BRUCIATO_PX, x, x + FETTA);
      await frame();
      if (this.distrutto) return;
    }
    const r = this.renderer as Renderer & { texture?: { initSource?(s: Texture['source']): void } };
    const init = r.texture?.initSource?.bind(r.texture);
    if (!init) return;
    init(this.sorgente);
    for (let i = 0; i < this.tessere.length; i++) {
      if (i % 2 === 0) await frame();
      if (this.distrutto) return;
      init(this.tessere[i].source);
    }
    this.passoPeggiore = Math.max(this.passoPeggiore, performance.now() - t);
  }

  /** Evento `cratere`: ricalcola i canali nelle colonne toccate e segna il rettangolo da ricaricare. */
  cratere(x: number, y: number, raggio: number): void {
    this.cambiata(x - raggio, y - raggio, x + raggio, y + raggio);
  }

  /** Evento `maschera` (Fase 3: pezzo staccato, legno bruciato, sabbia): cambiata nel rettangolo, estremi compresi. */
  maschera(x0: number, y0: number, x1: number, y1: number): void {
    this.cambiata(x0, y0, x1 + 1, y1 + 1);
  }

  private cambiata(ax: number, ay: number, bx: number, by: number): void {
    const { w, h, maschera } = this.terreno;
    const m = Math.max(BRUCIATO_PX, SBORDO_PX) + 2;
    const x0 = Math.max(0, Math.floor(ax - m)), x1 = Math.min(w, Math.ceil(bx + m));
    const ya = Math.floor(ay - m), yb = Math.ceil(by + m);
    if (x1 <= x0) return;
    canaliMaschera(maschera, this.originale, w, h, this.dati, x0, x1, ya);
    canaleSbordo(maschera, this.vicinoPrima, w, h, SBORDO_PX, this.dati, x0, x1, ya, yb);
    canaleBruciato(this.dati, w, h, BRUCIATO_PX, x0, x1, ya, yb);
    const [y0, yFondo] = righeToccate(this.originale, w, h, x0, x1, ya);
    const y1 = Math.min(h, Math.max(yFondo, yb));
    const s = this.sporco;
    this.sporco = s ? [Math.min(s[0], x0), Math.min(s[1], y0), Math.max(s[2], x1), Math.max(s[3], y1)] : [x0, y0, x1, y1];
  }

  /** A ogni frame: carica sulla GPU il rettangolo della maschera cambiato (uno per frame, unito). */
  aggiorna(): void {
    const s = this.sporco;
    if (!s) return;
    this.sporco = null;
    const r = this.renderer as Renderer & { gl?: WebGL2RenderingContext; texture?: { bindSource(s: Texture['source'] | null, l?: number): void } };
    const gl = r.gl;
    if (!gl || !r.texture?.bindSource || typeof WebGL2RenderingContext === 'undefined' || !(gl instanceof WebGL2RenderingContext)) {
      // WebGPU o WebGL1: si ricarica tutta (raro: il gioco chiede WebGL2)
      this.sorgente.update();
      return;
    }
    const [x0, y0, x1, y1] = s;
    // la maschera sull'unità 0 attraverso Pixi, così la sua memoria dei binding resta giusta
    r.texture.bindSource(Texture.EMPTY.source, 0);
    r.texture.bindSource(this.sorgente, 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, this.terreno.w);
    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, x0);
    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, y0);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x0, y0, x1 - x0, y1 - y0, gl.RGBA, gl.UNSIGNED_BYTE, this.dati);
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
  }

  distruggi(): void {
    this.distrutto = true;
    // le tessere restano nella cache di Assets (la stessa mappa si rigioca spesso); la maschera no
    this.radice.destroy({ children: true });
    this.texMaschera.destroy(true);
  }
}
