// Terreno in Pixi: 32 tile 256×256 (8×4) dipinte dalla maschera. Dopo un cratere si ridipinge solo il
// rettangolo toccato, e si caricano sulla GPU al massimo 6 tile per frame (00 §1.2).
import { Container, Sprite, Texture } from 'pixi.js';
import type { Terreno } from '../../core/tipi';
import { COLORI_MATERIALE, LATO_TILE, dipingiRettangolo, rettangoloCratere, tileToccate } from './pittura-terreno';

export const CARICAMENTI_PER_FRAME = 6;

interface Tile {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  img: ImageData;
  texture: Texture;
  sprite: Sprite;
  tx: number;
  ty: number;
  /** rettangolo sporco in coordinate di mondo, o null */
  sporco: [number, number, number, number] | null;
}

export class TerrenoRender {
  readonly radice = new Container();
  private tiles: Tile[] = [];
  private readonly colonne: number;
  private readonly righe: number;
  private readonly originale: Uint8Array;
  /** tile in attesa di caricamento, in ordine di arrivo */
  private coda: number[] = [];
  /** grafica dipinta della mappa fatta a mano (RGBA w×h), o null: terreno coi colori dei materiali */
  private arte: Uint8ClampedArray | null = null;
  /** il terreno HD ha preso il posto di questo: niente più pittura, restano maschera iniziale e colori (zolle) */
  private spento = false;

  constructor(private readonly terreno: Terreno) {
    this.colonne = Math.ceil(terreno.w / LATO_TILE);
    this.righe = Math.ceil(terreno.h / LATO_TILE);
    this.originale = terreno.maschera.slice();
    for (let r = 0; r < this.righe; r++) for (let c = 0; c < this.colonne; c++) {
      const canvas = document.createElement('canvas');
      canvas.width = LATO_TILE; canvas.height = LATO_TILE;
      const ctx = canvas.getContext('2d', { willReadFrequently: false })!;
      const img = ctx.createImageData(LATO_TILE, LATO_TILE);
      const tx = c * LATO_TILE, ty = r * LATO_TILE;
      dipingiRettangolo(terreno.maschera, this.originale, terreno.w, terreno.h, img.data, tx, ty, tx, ty, tx + LATO_TILE, ty + LATO_TILE);
      ctx.putImageData(img, 0, 0);
      const texture = Texture.from(canvas);
      texture.source.scaleMode = 'linear';
      const sprite = new Sprite(texture);
      sprite.position.set(tx, ty);
      // tile completamente vuote: niente draw call
      sprite.visible = !vuota(img.data);
      this.radice.addChild(sprite);
      this.tiles.push({ canvas, ctx, img, texture, sprite, tx, ty, sporco: null });
    }
  }

  /** Maschera all'inizio della battaglia (serve anche al terreno HD). */
  get maschera0(): Uint8Array { return this.originale; }

  /**
   * Il terreno HD è pronto (terreno-hd.ts): le tile dipinte sulla CPU si buttano e i crateri non si ridipingono
   * più. Restano la maschera iniziale e il quadro a 1× per il colore delle zolle.
   */
  spegni(): void {
    if (this.spento) return;
    this.spento = true;
    this.coda = [];
    for (const t of this.tiles) t.texture.destroy(true);
    this.radice.destroy({ children: true });
    this.tiles = [];
  }

  /** Evento `cratere` della sim: segna le tile da ridipingere. */
  cratere(x: number, y: number, raggio: number): void {
    if (this.spento) return;
    const [x0, y0, x1, y1] = rettangoloCratere(x, y, raggio);
    for (const i of tileToccate(x0, y0, x1, y1, this.colonne, this.righe)) {
      const t = this.tiles[i];
      if (!t.sporco) { t.sporco = [x0, y0, x1, y1]; this.coda.push(i); }
      else t.sporco = [Math.min(t.sporco[0], x0), Math.min(t.sporco[1], y0), Math.max(t.sporco[2], x1), Math.max(t.sporco[3], y1)];
    }
  }

  /**
   * Ridipinge e carica al massimo `max` tile, e smette prima se ha già speso `budgetMs` (le altre restano
   * in coda per il frame dopo: meglio un cratere che compare 1 frame dopo che un frame da 30 ms).
   */
  aggiorna(max = CARICAMENTI_PER_FRAME, budgetMs = 4): number {
    let n = 0;
    const t0 = performance.now();
    while (n < max && this.coda.length && (n === 0 || performance.now() - t0 < budgetMs)) {
      const t = this.tiles[this.coda.shift()!];
      const s = t.sporco!;
      t.sporco = null;
      const x0 = Math.max(s[0], t.tx), y0 = Math.max(s[1], t.ty);
      const x1 = Math.min(s[2], t.tx + LATO_TILE), y1 = Math.min(s[3], t.ty + LATO_TILE);
      if (x1 <= x0 || y1 <= y0) continue;
      dipingiRettangolo(this.terreno.maschera, this.originale, this.terreno.w, this.terreno.h, t.img.data, t.tx, t.ty, x0, y0, x1, y1, this.arte);
      t.ctx.putImageData(t.img, 0, 0, x0 - t.tx, y0 - t.ty, x1 - x0, y1 - y0);
      t.texture.source.update();
      t.sprite.visible = true;
      n++;
    }
    return n;
  }

  /** Arriva la grafica dipinta (caricata in modo asincrono): si ridipingono tutte le tile, poche per frame. */
  impostaArte(rgba: Uint8ClampedArray): void {
    if (rgba.length !== this.terreno.w * this.terreno.h * 4) return;
    this.arte = rgba;
    if (this.spento) return;
    this.tiles.forEach((t, i) => {
      if (!t.sporco) this.coda.push(i);
      t.sporco = [t.tx, t.ty, t.tx + LATO_TILE, t.ty + LATO_TILE];
    });
  }

  get inAttesa(): number { return this.coda.length; }

  /** Colore del materiale che c'era (nella maschera iniziale) attorno a (x, y): serve alle zolle del cratere. */
  coloreOriginale(x: number, y: number, raggio: number): number {
    const { w, h } = this.terreno;
    for (const [dx, dy] of [[0, 0], [0, 0.5], [0.5, 0.3], [-0.5, 0.3], [0, -0.4], [0.3, 0.8], [-0.3, 0.8]]) {
      const px = Math.round(x + dx * raggio), py = Math.round(y + dy * raggio);
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      const m = this.originale[py * w + px];
      const a = (py * w + px) * 4;
      if (this.arte && m !== 0 && this.arte[a + 3]) return (this.arte[a] << 16) | (this.arte[a + 1] << 8) | this.arte[a + 2];
      if (m !== 0 && m !== 6) { const c = COLORI_MATERIALE[m]; return (c[0] << 16) | (c[1] << 8) | c[2]; }
    }
    const c = COLORI_MATERIALE[2];
    return (c[0] << 16) | (c[1] << 8) | c[2];
  }

  distruggi(): void {
    if (this.spento) return;
    for (const t of this.tiles) t.texture.destroy(true);
    this.radice.destroy({ children: true });
    this.tiles = [];
  }
}

function vuota(d: Uint8ClampedArray): boolean {
  for (let k = 3; k < d.length; k += 4) if (d[k]) return false;
  return true;
}
