// Segnaposto grafici della battaglia (11 §5): ogni forma si disegna UNA volta con Graphics, si trasforma in
// texture e poi si anima solo con trasformazioni (posizione, scala, rotazione, alfa, tinta). Così Pixi
// tiene il batching e non ridisegna niente a ogni frame. Quando arriveranno gli asset veri di Magnific
// si cambiano queste texture, non i tempi.
import { Graphics, type Renderer, Sprite, Texture } from 'pixi.js';
import type { IdCiurma } from '../../core/tipi';
import { COLORI_CIURMA, PALETTE, hex } from '../../core/palette';

export interface Forma { texture: Texture; ax: number; ay: number }

/** risoluzione delle texture dei segnaposto: nitide fino allo zoom 2 */
const RISOLUZIONE = 3;

function forma(r: Renderer, g: Graphics): Forma {
  const b = g.getLocalBounds();
  const texture = r.generateTexture({ target: g, resolution: RISOLUZIONE, antialias: true });
  g.destroy();
  return { texture, ax: -b.x / b.width, ay: -b.y / b.height };
}

export function sprite(f: Forma): Sprite {
  const s = new Sprite(f.texture);
  s.anchor.set(f.ax, f.ay);
  return s;
}

const BIANCO = 0xffffff;

/** Emblemi di 00 §2.1, in bianco, centrati in (0, 0), circa 10 px. */
function emblema(g: Graphics, c: IdCiurma, x: number, y: number, scuro: number): void {
  switch (c) {
    case 'teschio': // teschio bendato
      g.circle(x, y - 1, 4).fill(BIANCO).rect(x - 2.5, y + 1.5, 5, 2.5).fill(BIANCO);
      g.circle(x + 1.6, y - 1.2, 1).fill(scuro);
      g.moveTo(x - 4, y - 3.5).lineTo(x + 3, y + 0.5).stroke({ width: 1, color: scuro });
      g.circle(x - 1.6, y - 1.2, 1.2).fill(scuro);
      break;
    case 'gelo': // fiocco di neve
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        g.moveTo(x - Math.cos(a) * 4.5, y - Math.sin(a) * 4.5).lineTo(x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5);
      }
      g.stroke({ width: 1.4, color: BIANCO });
      break;
    case 'oro': // corona con doblone
      g.poly([x - 5, y + 3, x - 5, y - 3, x - 2.5, y, x, y - 4, x + 2.5, y, x + 5, y - 3, x + 5, y + 3]).fill(BIANCO);
      g.circle(x, y + 1, 1.3).fill(scuro);
      break;
    case 'marea': // conchiglia-teschio
      g.poly([x - 5, y + 3, x, y - 4.5, x + 5, y + 3]).fill(BIANCO);
      for (const dx of [-2, 0, 2]) g.moveTo(x, y - 3).lineTo(x + dx * 1.6, y + 3);
      g.stroke({ width: 0.8, color: scuro });
      break;
    case 'marina': // sole con àncora
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        g.moveTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3).lineTo(x + Math.cos(a) * 5.2, y + Math.sin(a) * 5.2);
      }
      g.stroke({ width: 1.2, color: BIANCO });
      g.circle(x, y, 2.8).fill(BIANCO);
      g.moveTo(x, y - 1.8).lineTo(x, y + 1.8).stroke({ width: 0.9, color: scuro });
      break;
  }
}

/** Pirata segnaposto: piedi in (0, 0), alto 40 px, guarda a destra (si specchia con scale.x). */
function pirata(r: Renderer, c: IdCiurma): Forma {
  const { colore, scuro } = COLORI_CIURMA[c];
  const col = hex(colore), sc = hex(scuro);
  const g = new Graphics();
  // piedi
  g.roundRect(-8, -4, 7, 4, 2).roundRect(1, -4, 7, 4, 2).fill(hex(PALETTE.legnoScuro));
  // corpo
  g.roundRect(-9, -26, 18, 23, 7).fill(col).stroke({ width: 1.6, color: sc });
  // cintura
  g.rect(-9, -10, 18, 3).fill(sc);
  // testa
  g.circle(0, -31, 8.5).fill(col).stroke({ width: 1.6, color: sc });
  // bandana scura con nodo dietro
  g.roundRect(-9, -38, 18, 5, 2).fill(sc);
  g.poly([-9, -37, -14, -40, -13, -34]).fill(sc);
  // occhio verso il davanti
  g.circle(4, -30.5, 3).fill(BIANCO);
  g.circle(5.2, -30.5, 1.5).fill(hex(PALETTE.inchiostro));
  // emblema sul petto
  emblema(g, c, 0, -18, sc);
  return forma(r, g);
}

/** Sagoma bianca del pirata per il lampo "colpito". */
function pirataLampo(r: Renderer): Forma {
  const g = new Graphics();
  g.roundRect(-8, -4, 7, 4, 2).roundRect(1, -4, 7, 4, 2).roundRect(-9, -26, 18, 23, 7).circle(0, -31, 8.5)
    .poly([-9, -37, -14, -40, -13, -34]).fill(BIANCO);
  return forma(r, g);
}

/** Braccio con l'arma: perno sulla spalla in (0, 0), punta verso destra. */
function braccio(r: Renderer): Forma {
  const g = new Graphics();
  g.roundRect(-2, -2.5, 18, 5, 2.5).fill(hex(PALETTE.legnoScuro));
  g.rect(12, -3.2, 6, 6.4).fill(hex('#3A3A44'));
  return forma(r, g);
}

export type IdForma =
  | 'braccio' | 'lampo' | 'palla' | 'granata' | 'frammento' | 'barile' | 'mina' | 'lapide'
  | 'cerchio' | 'nuvola' | 'anello' | 'cerchietto' | 'cappello' | 'cassa' | 'paracadute' | 'freccia' | 'puntino' | 'palma' | 'masso' | 'rovina' | 'cespuglio' | 'segnaposto';

export class Forme {
  private readonly ciurme = new Map<IdCiurma, Forma>();
  private readonly altre = new Map<IdForma, Forma>();

  constructor(private readonly r: Renderer) {
    const g = () => new Graphics();
    const dark = hex(PALETTE.inchiostro);
    this.altre.set('braccio', braccio(r));
    this.altre.set('lampo', pirataLampo(r));
    this.altre.set('palla', forma(r, g().circle(0, 0, 4.5).fill(hex('#26262E')).circle(-1.5, -1.5, 1.4).fill({ color: BIANCO, alpha: 0.6 })));
    this.altre.set('granata', forma(r, g()
      .circle(0, 0, 5.5).fill(hex('#3E5A3A')).stroke({ width: 1, color: dark })
      .rect(-1.5, -8, 3, 3).fill(hex('#6B6B6B')).moveTo(0, -8).quadraticCurveTo(3, -11, 4, -9).stroke({ width: 1, color: hex(PALETTE.oro) })));
    this.altre.set('frammento', forma(r, g().circle(0, 0, 2.5).fill(hex('#3A3A44'))));
    // barile di polvere: appoggiato al suolo, base in (0, 0) (MappaGenerata.barili = centro della base)
    this.altre.set('barile', forma(r, g()
      .roundRect(-8, -18, 16, 18, 4).fill(hex(PALETTE.legno)).stroke({ width: 1, color: hex(PALETTE.legnoScuro) })
      .rect(-8, -14, 16, 2).rect(-8, -5, 16, 2).fill(hex(PALETTE.legnoScuro))
      .circle(0, -9.5, 3.2).fill(hex(PALETTE.pericolo)).rect(-0.8, -11.5, 1.6, 4).fill(BIANCO)));
    // cassa: base in (0, 0); il paracadute è una forma a parte, sopra
    this.altre.set('cassa', forma(r, g()
      .rect(-9, -16, 18, 16).fill(hex('#B07A45')).stroke({ width: 1.5, color: hex(PALETTE.legnoScuro) })
      .moveTo(-9, -16).lineTo(9, 0).moveTo(9, -16).lineTo(-9, 0).stroke({ width: 1.5, color: hex(PALETTE.legnoScuro) })));
    this.altre.set('paracadute', forma(r, (() => {
      const p = g();
      p.moveTo(-8, -16).lineTo(-20, -40).moveTo(8, -16).lineTo(20, -40).moveTo(0, -16).lineTo(0, -44)
        .stroke({ width: 1, color: hex(PALETTE.pergamenaOmbra) });
      p.arc(0, -40, 22, Math.PI, 0).closePath().fill(BIANCO).stroke({ width: 1.5, color: hex(PALETTE.pericolo) });
      for (const x of [-11, 0, 11]) p.moveTo(x, -40).lineTo(x * 0.6, -60 + Math.abs(x) * 0.6);
      p.stroke({ width: 1.5, color: hex(PALETTE.pericolo) });
      return p;
    })()));
    this.altre.set('cappello', forma(r, g()
      .ellipse(0, 0, 11, 3).fill(dark).poly([-7, 0, -5, -8, 5, -8, 7, 0]).fill(dark).circle(0, -4, 2).fill(BIANCO)));
    this.altre.set('cerchietto', forma(r, g().circle(0, 0, 7).stroke({ width: 2, color: BIANCO })));
    this.altre.set('mina', forma(r, g().ellipse(0, 0, 7, 4).fill(hex('#E8B4B8')).stroke({ width: 1, color: dark })));
    // lapide-barilotto con il cappello (00 §1.4)
    this.altre.set('lapide', forma(r, g()
      .roundRect(-7, -14, 14, 14, 3).fill(hex(PALETTE.legno)).rect(-7, -10, 14, 2).rect(-7, -5, 14, 2).fill(hex(PALETTE.legnoScuro))
      .ellipse(0, -15, 9, 2.5).fill(dark).roundRect(-5, -21, 10, 6, 2).fill(dark)));
    this.altre.set('cerchio', forma(r, g().circle(0, 0, 16).fill(BIANCO)));
    this.altre.set('nuvola', forma(r, g()
      .ellipse(0, 14, 70, 18).fill(hex(PALETTE.nuvolaOmbra))
      .circle(-32, 0, 26).circle(0, -10, 32).circle(32, 0, 24).fill(BIANCO)));
    this.altre.set('puntino', forma(r, g().circle(0, 0, 3).fill(BIANCO)));
    this.altre.set('anello', forma(r, g().ellipse(0, 0, 16, 5).stroke({ width: 2.5, color: BIANCO })));
    this.altre.set('freccia', forma(r, g().poly([-7, -9, 7, -9, 0, 0]).fill(hex(PALETTE.oro)).stroke({ width: 1.5, color: hex(PALETTE.oroOmbra) })));
    // decorazioni (solo grafiche): piedi in (0, 0)
    this.altre.set('palma', forma(r, (() => {
      const p = g();
      p.moveTo(0, 0).quadraticCurveTo(-6, -30, 4, -62).stroke({ width: 6, color: hex(PALETTE.legno) });
      const foglia = (a: number) => { const ex = Math.cos(a) * 30, ey = Math.sin(a) * 30 - 62; p.moveTo(4, -62).quadraticCurveTo(4 + ex * 0.6, -62 + ey * 0.2 - 14, 4 + ex, ey + 6); };
      for (const a of [-2.8, -2.1, -1.2, -0.6, 0.1]) foglia(a);
      p.stroke({ width: 7, color: hex(PALETTE.erba), cap: 'round' });
      p.circle(2, -60, 3).circle(7, -59, 3).fill(hex(PALETTE.legnoScuro));
      return p;
    })()));
    this.altre.set('masso', forma(r, g().ellipse(0, -9, 16, 11).fill(hex(PALETTE.roccia)).ellipse(-4, -13, 6, 3).fill({ color: BIANCO, alpha: 0.15 })));
    this.altre.set('rovina', forma(r, g().rect(-10, -34, 8, 34).rect(4, -24, 8, 24).fill(hex('#B8AFA3'))));
    this.altre.set('cespuglio', forma(r, g().circle(-8, -6, 7).circle(0, -10, 9).circle(9, -6, 7).fill(hex(PALETTE.erba))));
    // puntino magenta: "qui manca l'asset vero" (11 §5)
    this.altre.set('segnaposto', forma(r, g().circle(0, 0, 2).fill(hex('#FF00FF'))));
  }

  pirata(c: IdCiurma): Forma {
    let f = this.ciurme.get(c);
    if (!f) { f = pirata(this.r, c); this.ciurme.set(c, f); }
    return f;
  }

  get(id: IdForma): Forma { return this.altre.get(id)!; }

  distruggi(): void {
    for (const f of [...this.ciurme.values(), ...this.altre.values()]) f.texture.destroy(true);
    this.ciurme.clear(); this.altre.clear();
  }
}
