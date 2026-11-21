// Grafica dipinta delle mappe fatte a mano (06 §6, 03 §8): cielo, isole lontane e scogli medi in parallasse
// (strato schermo, dietro al mondo), più i pixel del terreno e gli oggetti di scena.
// Proprietario: agente Arte/livelli. Si carica in modo asincrono: finché non arriva resta la grafica segnaposto.
//
// File in public/assets/mappe/<id>/: terreno.webp (2048×1024, alfa = aria), cielo.webp, lontano.webp, medio.webp
// (strisce orizzontali, ripetute), palma.webp, cespuglio.webp, masso.webp, rovina.webp. Ognuno è facoltativo.
import { Assets, Container, Sprite, Texture, TilingSprite } from 'pixi.js';
import type { Camera } from './camera';

/** altezza in px di mondo delle due strisce e quanto seguono la camera in orizzontale (1 = come il terreno) */
// Parallasse leggero (il proprietario l'ha trovato troppo mosso): gli sfondi scorrono poco e cambiano poco con lo zoom.
const LONTANO = { alto: 190, segue: 0.04, sotto: 10 };
const MEDIO = { alto: 250, segue: 0.1, sotto: 0.16 };
/** quanto la grandezza degli sfondi segue lo zoom (0 = fissa sullo schermo, 1 = come il terreno) */
const SEGUE_ZOOM = 0.3;
/** altezza in px di mondo degli oggetti di scena (a scala 1) */
export const ALTEZZA_OGGETTO: Record<string, number> = { palma: 150, cespuglio: 42, masso: 38, rovina: 74 };

export interface ArteCaricata {
  terreno: Uint8ClampedArray | null;
  oggetti: Partial<Record<string, Texture>>;
  cielo: boolean;
}

function cartella(id: string): string {
  return `${import.meta.env.BASE_URL ?? '/'}assets/mappe/${id}/`;
}

async function texture(url: string): Promise<Texture | null> {
  try { return (await Assets.load<Texture>(url)) ?? null; } catch { return null; }
}

async function pixel(url: string, w: number, h: number): Promise<Uint8ClampedArray | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const bmp = await createImageBitmap(await r.blob(), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    if (bmp.width !== w || bmp.height !== h) { bmp.close(); return null; }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    return ctx.getImageData(0, 0, w, h).data;
  } catch { return null; }
}

export class SfondiMappa {
  readonly radice = new Container();
  private cielo: Sprite | null = null;
  private lontano: TilingSprite | null = null;
  private medio: TilingSprite | null = null;
  private chiusa = false;

  constructor(private readonly id: string, private readonly mondoW: number, private readonly mondoH: number) {}

  async carica(): Promise<ArteCaricata | null> {
    const base = cartella(this.id);
    const [terreno, cielo, lontano, medio, ...ogg] = await Promise.all([
      pixel(`${base}terreno.webp`, this.mondoW, this.mondoH),
      texture(`${base}cielo.webp`), texture(`${base}lontano.webp`), texture(`${base}medio.webp`),
      ...Object.keys(ALTEZZA_OGGETTO).map((k) => texture(`${base}${k}.webp`)),
    ]);
    if (this.chiusa) return null;
    if (cielo) { this.cielo = new Sprite(cielo); this.radice.addChild(this.cielo); }
    if (lontano) { this.lontano = new TilingSprite({ texture: lontano, width: 1, height: lontano.height }); this.lontano.alpha = 0.95; this.radice.addChild(this.lontano); }
    if (medio) { this.medio = new TilingSprite({ texture: medio, width: 1, height: medio.height }); this.radice.addChild(this.medio); }
    const oggetti: Partial<Record<string, Texture>> = {};
    Object.keys(ALTEZZA_OGGETTO).forEach((k, i) => { const t = ogg[i]; if (t) oggetti[k] = t; });
    return { terreno, oggetti, cielo: !!cielo };
  }

  /** A ogni frame: le strisce scorrono più piano del terreno e restano appoggiate all'orizzonte (quota del mare). */
  aggiorna(camera: Camera, mare: number): void {
    const { w, h } = camera;
    const k = camera.scala;
    if (this.cielo) {
      const t = this.cielo.texture;
      const s = Math.max(w / t.width, h / t.height) * 1.08;
      this.cielo.scale.set(s);
      const giro = (camera.x / this.mondoW - 0.5) * t.width * s * 0.015;
      this.cielo.position.set((w - t.width * s) / 2 - giro, (h - t.height * s) / 2);
    }
    const orizzonte = camera.schermoDaMondo(0, mare).y;
    for (const [st, p] of [[this.lontano, LONTANO], [this.medio, MEDIO]] as const) {
      if (!st) continue;
      // si rimpicciolisce meno del terreno quando si allontana lo zoom (è lontano)
      const alto = p.alto * Math.min(1.15, Math.max(0.7, Math.pow(k, SEGUE_ZOOM)));
      const s = alto / st.texture.height;
      st.width = w;
      st.height = alto;
      st.tileScale.set(s);
      st.tilePosition.x = w / 2 - (camera.x + camera.ox) * k * p.segue;
      const sotto = p.sotto < 1 ? alto * p.sotto : p.sotto;
      st.y = orizzonte - alto + sotto;
      st.visible = st.y < h && st.y + alto > 0;
    }
  }

  distruggi(): void {
    this.chiusa = true;
    // le texture restano nella cache di Assets: la stessa mappa si rigioca spesso
    this.radice.destroy({ children: true });
  }
}
