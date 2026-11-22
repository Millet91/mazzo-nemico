// Fase 3 (P1-contratti §7, PIANO §3): il disegno dei pezzi che si staccano e cadono (PezzoCadente della sim).
// Il pezzo è già fuori dalla maschera: qui diventa uno sprite con l'arte ritagliata da dove si è staccato (daX, daY).
// Con le tessere HD il ritaglio è a 2× e ha il bordo liscio; senza, si usa il quadro a 1× o i colori dei materiali
// (isole generate) con la stessa grana del terreno. Il blocco cade dritto; il masso rotola: qui ruota (solo grafica,
// la sim non ha angoli). Lo sprite sparisce quando il pezzo esce da s.pezzi (si frantuma: lì arrivano le macerie).
import { BufferImageSource, CanvasSource, Container, Sprite, Texture } from 'pixi.js';
import type { PezzoCadente } from '../../core/tipi';
import { COLORI_MATERIALE, grana } from './pittura-terreno';

/** di quanto si scurisce il contorno del pezzo (1 px): si stacca a vista dal terreno dietro */
const CONTORNO = 0.62;

/**
 * Colori di un pezzo a 1×: RGBA w×h. Dove la forma è piena: il quadro (se c'è ed è opaco lì) o il colore del
 * materiale con la grana del terreno; il px sul bordo della forma un po' più scuro. Parte pura.
 */
export function coloriPezzo(maschera: Uint8Array, w: number, h: number, daX: number, daY: number,
  arte: Uint8ClampedArray | null, mondoW: number, mondoH: number, out = new Uint8ClampedArray(w * h * 4)): Uint8ClampedArray {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, k = i * 4, m = maschera[i];
      if (!m) { out[k + 3] = 0; continue; }
      const mx = daX + x, my = daY + y;
      let r: number, g: number, b: number;
      const a = mx >= 0 && my >= 0 && mx < mondoW && my < mondoH ? (my * mondoW + mx) * 4 : -1;
      if (arte && a >= 0 && arte[a + 3] > 200) { r = arte[a]; g = arte[a + 1]; b = arte[a + 2]; }
      else {
        const c = COLORI_MATERIALE[m] ?? COLORI_MATERIALE[2];
        const n = grana(mx, my);
        r = c[0] + n; g = c[1] + n; b = c[2] + n;
      }
      const bordo = x === 0 || y === 0 || x === w - 1 || y === h - 1
        || !maschera[i - 1] || !maschera[i + 1] || !maschera[i - w] || !maschera[i + w];
      const f = bordo ? CONTORNO : 1;
      out[k] = r * f; out[k + 1] = g * f; out[k + 2] = b * f; out[k + 3] = 255;
    }
  }
  return out;
}

/** Ritaglio HD (canvas a `scala`×) dato dal terreno HD, se c'è. */
export type Ritaglio = (x: number, y: number, w: number, h: number) => { canvas: HTMLCanvasElement; scala: number } | null;

interface Fonte {
  ritaglioHd(): Ritaglio | null;
  arte(): Uint8ClampedArray | null;
  mondoW: number;
  mondoH: number;
}

interface Vista { sp: Sprite; tipo: PezzoCadente['tipo']; ultimoX: number; raggio: number }

export class PezziCadenti {
  readonly radice = new Container();
  private readonly viste = new Map<number, Vista>();

  constructor(private readonly fonte: Fonte) {}

  get quanti(): number { return this.viste.size; }

  /** Evento `crollo`: il pezzo è nato (sta in s.pezzi). */
  crollo(p: PezzoCadente): void {
    if (this.viste.has(p.id)) return;
    const tex = this.texture(p);
    const sp = new Sprite(tex.texture);
    sp.anchor.set(0.5);
    sp.scale.set(1 / tex.scala);
    sp.position.set(p.x + p.w / 2, p.y + p.h / 2);
    this.radice.addChild(sp);
    this.viste.set(p.id, { sp, tipo: p.tipo, ultimoX: p.x, raggio: Math.max(4, Math.min(p.w, p.h) / 2) });
  }

  /** A ogni frame: posizioni dalla sim; via chi non c'è più (si è frantumato). */
  aggiorna(pezzi: readonly PezzoCadente[] | undefined): void {
    const vivi = new Set<number>();
    for (const p of pezzi ?? []) {
      let v = this.viste.get(p.id);
      if (!v) { this.crollo(p); v = this.viste.get(p.id)!; }
      vivi.add(p.id);
      v.sp.position.set(p.x + p.w / 2, p.y + p.h / 2);
      // il masso rotola: angolo = strada fatta / raggio
      if (v.tipo === 'masso') v.sp.rotation += (p.x - v.ultimoX) / v.raggio;
      v.ultimoX = p.x;
    }
    for (const [id, v] of this.viste) if (!vivi.has(id)) this.togli(id, v);
  }

  distruggi(): void {
    for (const [id, v] of this.viste) this.togli(id, v);
    this.radice.destroy({ children: true });
  }

  private togli(id: number, v: Vista): void {
    v.sp.texture.destroy(true);
    v.sp.destroy();
    this.viste.delete(id);
  }

  private texture(p: PezzoCadente): { texture: Texture; scala: number } {
    const hd = this.fonte.ritaglioHd()?.(p.daX, p.daY, p.w, p.h);
    if (hd) {
      // la forma a 1× ingrandita col filtro (bordo liscio) toglie dal ritaglio quello che non è del pezzo
      const forma = document.createElement('canvas');
      forma.width = p.w; forma.height = p.h;
      const gf = forma.getContext('2d');
      const g = hd.canvas.getContext('2d');
      if (gf && g) {
        const img = gf.createImageData(p.w, p.h);
        for (let i = 0; i < p.w * p.h; i++) img.data[i * 4 + 3] = p.maschera[i] ? 255 : 0;
        gf.putImageData(img, 0, 0);
        g.imageSmoothingEnabled = true;
        g.globalCompositeOperation = 'destination-in';
        g.drawImage(forma, 0, 0, hd.canvas.width, hd.canvas.height);
        // contorno: i px sul bordo della forma, scuri e mezzi trasparenti, sopra l'arte (così si stacca dal terreno)
        const bordo = gf.createImageData(p.w, p.h);
        for (let y = 0, i = 0; y < p.h; y++) {
          for (let x = 0; x < p.w; x++, i++) {
            if (!p.maschera[i]) continue;
            if (x && y && x < p.w - 1 && y < p.h - 1 && p.maschera[i - 1] && p.maschera[i + 1] && p.maschera[i - p.w] && p.maschera[i + p.w]) continue;
            bordo.data[i * 4] = 40; bordo.data[i * 4 + 1] = 24; bordo.data[i * 4 + 2] = 14; bordo.data[i * 4 + 3] = 150;
          }
        }
        gf.clearRect(0, 0, p.w, p.h);
        gf.putImageData(bordo, 0, 0);
        g.globalCompositeOperation = 'source-atop';
        g.drawImage(forma, 0, 0, hd.canvas.width, hd.canvas.height);
        g.globalCompositeOperation = 'source-over';
        return { texture: new Texture({ source: new CanvasSource({ resource: hd.canvas }) }), scala: hd.scala };
      }
    }
    const dati = coloriPezzo(p.maschera, p.w, p.h, p.daX, p.daY, this.fonte.arte(), this.fonte.mondoW, this.fonte.mondoH);
    const source = new BufferImageSource({ resource: new Uint8Array(dati.buffer), width: p.w, height: p.h, format: 'rgba8unorm', alphaMode: 'premultiply-alpha-on-upload' });
    return { texture: new Texture({ source }), scala: 1 };
  }
}
