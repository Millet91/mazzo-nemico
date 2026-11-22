// Pirata a pezzi disegnato nel codice (studio v2, Fase 1 "passo 0": niente Magnific). 15 sprite per pirata
// (cappello, testa, busto, falda, 2 braccia in 2 pezzi, 2 gambe in 3 pezzi, arma) mossi dalle ossa di
// pirata-posa.ts. Qui c'è solo il disegno: nessuna decisione di movimento.
//
// Prestazioni (Pixel 6, 60 fps): ogni ciurma disegna i suoi pezzi UNA volta in un atlante (una texture sola),
// poi a ogni frame cambiano solo posizione e rotazione degli sprite. 10 pirati = 300 sprite su 2 texture:
// Pixi li manda in pochi batch. Niente Graphics ridisegnati, niente filtri.
//
// Contorno bianco (leggibilità, P1-contratti §4 Render n.3): ogni pezzo ha un gemello bianco più largo di
// CONTORNO_PX, disegnato sotto a tutti i pezzi: l'unione fa il bordo bianco della sagoma intera. Lo stesso
// gemello, portato sopra per 80 ms, è il lampo bianco del colpo.
import { Container, Graphics, Rectangle, Sprite, Texture, type Renderer } from 'pixi.js';
import type { IdCiurma } from '../../core/tipi';
import { COLORI_CIURMA, PALETTE, hex } from '../../core/palette';
import {
  bersaglio, N_OSSA, OSSA, risolvi, SCHELETRO, type ArmaPosa, type Osso, type Posa, type StatoPosa,
} from './pirata-posa';

/** risoluzione dell'atlante: nitido fino allo zoom 2 sul Pixel 6 (2,3 px di schermo per px di mondo) */
const RISOLUZIONE = 3;
/** larghezza del contorno bianco attorno al pirata, in px di mondo (≈ 2 px di schermo allo zoom predefinito) */
export const CONTORNO_PX = 1.5;
/** sotto questa scala (px CSS per px di mondo) il pupazzo lascia il posto allo sprite unico */
export const SCALA_MIN_PUPAZZO = 0.6;

const BIANCO = 0xffffff;
/** contorno marrone scuro caldo dello stile "cartone dipinto" (arte-ui.md §3.1) */
const INCHIOSTRO = 0x3a2418;
const BORDO = 0.9;
const PELLE = 0xf4c99b, PELLE_OMBRA = 0xdda678;
const STIVALE = 0x4a2c1a, RISVOLTO = 0x8a5a34;
const BRACHE = 0xeadfc6, CAMICIA = 0xfff3dc;
const FERRO = 0x4a4a58, FERRO_CHIARO = 0x7c7c8c, LEGNO = 0x7a4b2a;
const ORO = hex(PALETTE.oro);
/** gli arti dietro (lato lontano) sono un po' più scuri: danno profondità senza altri pezzi */
const TINTA_DIETRO = 0xb9bcc8;

function mescola(a: number, b: number, t: number): number {
  const ch = (k: number) => Math.round(((a >> k) & 255) * (1 - t) + ((b >> k) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

interface Colori { giacca: number; scuro: number; cappello: number; ciurma: IdCiurma }

/** Disegna forme piene col bordo scuro; in modalità contorno le stesse forme tutte bianche e più larghe. */
class Penna {
  constructor(readonly g: Graphics, private readonly contorno: number) {}
  /** riempie e borda la forma appena tracciata */
  chiudi(colore: number, spessore = BORDO, bordo = INCHIOSTRO): this {
    if (this.contorno > 0) this.g.fill(BIANCO).stroke({ width: spessore + this.contorno * 2, color: BIANCO, join: 'round' });
    else {
      this.g.fill(colore);
      if (spessore > 0) this.g.stroke({ width: spessore, color: bordo, join: 'round' });
    }
    return this;
  }
  /** dettagli dentro la sagoma (occhi, bottoni, fasce): al contorno bianco non servono */
  dentro(f: (g: Graphics) => void): this { if (this.contorno <= 0) f(this.g); return this; }
}

type Disegno = (p: Penna, c: Colori) => void;

// ─── Cappelli: una FORMA diversa per ciurma, non solo il colore (arte-ui.md §3.2, per chi non distingue i colori) ──
// Origine: dove la tesa tocca la fronte. La cima della testa sta 2,3 px sopra, la testa è larga ±5 a quest'altezza.

const CAPPELLI: Record<IdCiurma, Disegno> = {
  // Teschio Rosso: tricorno largo con il teschio
  teschio: (p, c) => {
    p.g.roundRect(-5.6, -7, 11.2, 7.6, 3); p.chiudi(c.cappello);
    p.g.poly([-11.6, -0.4, -9.8, -4.6, -4.6, -1.7, 4.8, -1.7, 10.4, -5, 12.2, -0.2, 6.6, 1.5, -6, 1.5]); p.chiudi(c.cappello);
    p.dentro((g) => {
      g.moveTo(-9.7, -4.3).lineTo(-4.6, -1.4).lineTo(4.8, -1.4).lineTo(10.3, -4.7).stroke({ width: 1, color: c.giacca, join: 'round', cap: 'round' });
      g.circle(0.2, -4.4, 1.8).fill(BIANCO).rect(-0.7, -3.2, 1.8, 1.2).fill(BIANCO);
      g.circle(-0.5, -4.5, 0.55).circle(0.9, -4.5, 0.55).fill(INCHIOSTRO);
    });
  },
  // Corsari del Gelo: berretto di lana col pompon e il paraorecchie
  gelo: (p, c) => {
    p.g.roundRect(-7.8, 0.6, 4, 5.6, 1.7); p.chiudi(c.scuro);
    p.g.moveTo(-6.9, 0).quadraticCurveTo(-7.3, -8.8, 0, -9).quadraticCurveTo(7.5, -8.8, 7.1, 0).closePath(); p.chiudi(c.giacca);
    p.dentro((g) => g.moveTo(-6.6, -4.4).quadraticCurveTo(0, -6.4, 6.9, -4.4).stroke({ width: 1.3, color: c.scuro }));
    p.g.roundRect(-8.1, -2.5, 16.4, 4.3, 2.1); p.chiudi(0xeef8fb);
    p.g.circle(-0.5, -10.6, 2.8); p.chiudi(0xeef8fb);
  },
  // Compagnia dell'Oro: cappello a tesa larga con la piuma
  oro: (p, c) => {
    p.g.moveTo(-2.6, -5.4).quadraticCurveTo(-6.5, -15.6, -15, -11.4).quadraticCurveTo(-12.6, -6.4, -4.8, -4.2).closePath(); p.chiudi(0xffd766);
    p.g.roundRect(-5.6, -7.4, 11.4, 7.4, 2.6); p.chiudi(c.cappello);
    p.g.ellipse(0.4, -0.2, 12.8, 2.5); p.chiudi(c.cappello);
    p.dentro((g) => g.rect(-5.2, -3.6, 10.6, 1.5).fill(ORO));
  },
  // Predoni della Marea: bandana a pois col nodo e le code al vento
  marea: (p, c) => {
    p.g.poly([-6.6, -1.2, -13.6, 1.8, -12.6, 4.8, -6.8, 1.6]); p.chiudi(c.scuro);
    p.g.poly([-6.6, -1.8, -13.2, -3.4, -14.4, -0.4, -7.4, 0.6]); p.chiudi(c.scuro);
    p.g.moveTo(-6.5, 0.7).quadraticCurveTo(-7.6, -7.4, 0.2, -7.8).quadraticCurveTo(7.8, -7.4, 6.9, 0.3).closePath(); p.chiudi(c.giacca);
    p.g.circle(-6.9, -0.4, 1.9); p.chiudi(c.giacca);
    p.dentro((g) => g.circle(-2.2, -4.2, 0.95).circle(2.6, -5, 0.95).circle(0.4, -1.8, 0.95).circle(4.8, -2, 0.95).circle(-4.4, -1.6, 0.95).fill(BIANCO));
  },
  // Marina Reale: sciaccò alto con visiera, placca d'oro e pennacchio
  marina: (p, c) => {
    p.g.circle(2.8, -14.4, 2.1); p.chiudi(0xe5484d);
    p.g.poly([-5.5, 0.5, -6.3, -11.8, 6.7, -11.8, 5.9, 0.5]); p.chiudi(c.cappello);
    p.g.roundRect(-6.8, -12.9, 14, 2.4, 1.1); p.chiudi(c.giacca);
    p.g.poly([4.6, -1, 10.8, 0.5, 4.8, 1.3]); p.chiudi(0x26262e);
    p.dentro((g) => {
      g.circle(1.2, -5.8, 2.4).fill(ORO).stroke({ width: 0.6, color: hex(PALETTE.oroOmbra) });
      g.rect(-5.4, -1.6, 11.2, 1.2).fill(ORO);
    });
  },
};

/** barba o baffi: un segno in più per ciurma, sul lato del viso */
function barba(p: Penna, c: Colori): void {
  switch (c.ciurma) {
    case 'teschio': // barba corta scura
      p.g.poly([2.2, -2.6, 6.9, -3.3, 6.2, 0.3, 3.2, 1, 1, -0.5]); p.chiudi(0x4a2c1a);
      break;
    case 'gelo': // barbone bianco di brina
      p.g.poly([0.8, -3.8, 7.5, -4.2, 7, 1, 3.8, 3.4, 0.8, 1.4]); p.chiudi(0xf4fbfd);
      break;
    case 'oro': // baffi a manubrio
      p.dentro((g) => g.moveTo(3.4, -3.1).quadraticCurveTo(5.9, -1.4, 8.8, -4.1).stroke({ width: 1.5, color: 0x5a3416, cap: 'round' }));
      break;
    case 'marea': // orecchino d'oro
      p.dentro((g) => g.circle(-3.4, -3.2, 1.3).stroke({ width: 0.9, color: ORO }));
      break;
    case 'marina': // basettone grigio e baffetto
      p.dentro((g) => {
        g.roundRect(-1.4, -6, 2.6, 4.4, 1.1).fill(0xd9d6d2);
        g.moveTo(4.2, -3.2).lineTo(7.6, -3.6).stroke({ width: 1.3, color: 0xd9d6d2, cap: 'round' });
      });
      break;
  }
}

// ─── Pezzi del corpo. Ogni pezzo è disegnato attorno al suo perno (0, 0); gli arti vanno verso il basso (+y). ──

const CORPO: Record<string, Disegno> = {
  // perno alla caviglia, punta verso +x
  piede: (p) => {
    p.g.roundRect(-2.3, -1.5, 7, 3.1, 1.4); p.chiudi(STIVALE);
    p.dentro((g) => g.rect(-1.8, 0.9, 6, 0.6).fill({ color: 0x000000, alpha: 0.3 }));
  },
  // perno al ginocchio: gambale con il risvolto
  stinco: (p) => {
    p.g.roundRect(-2.3, -0.4, 4.6, 7, 1.9); p.chiudi(STIVALE);
    p.g.roundRect(-2.9, -1.3, 5.8, 2.6, 1.1); p.chiudi(RISVOLTO);
  },
  // perno all'anca: brache chiare
  coscia: (p) => { p.g.roundRect(-2.7, -1.6, 5.4, 9.2, 2.5); p.chiudi(BRACHE); },
  // perno al centro delle anche: falda della giacca (più lunga dietro), cintura con la fibbia, sciabola al fianco
  falda: (p, c) => {
    p.g.poly([-1.4, -1.4, -0.2, 0, -9.6, 6.4, -10.6, 5.2]); p.chiudi(0x5a3a22);
    p.g.poly([-5.5, -2.2, 3.5, -2.2, 3.7, 2.6, -0.6, 2, -7.8, 7.6, -6.8, 0.4]); p.chiudi(c.giacca);
    p.dentro((g) => g.poly([-5.2, 1.2, -6.8, 0.6, -7.6, 7.2, -5.6, 5.8]).fill({ color: c.scuro, alpha: 0.55 }));
    p.g.roundRect(-5.6, -2.7, 10.8, 2.9, 1.2); p.chiudi(0x3b2416);
    p.dentro((g) => g.rect(1, -2.8, 2.5, 3.1).fill(ORO).rect(1.8, -2, 0.9, 1.5).fill(0x3b2416));
  },
  // perno al centro delle anche, il collo sta a (0, −10): giacca aperta sulla camicia
  busto: (p, c) => {
    p.g.roundRect(-5.5, -11.1, 11, 12.3, 4.4); p.chiudi(c.giacca);
    p.dentro((g) => {
      g.poly([1.6, -10.1, 4.9, -8.6, 5, -1.2, 2.6, -0.2]).fill(CAMICIA);
      g.moveTo(1.6, -10.3).lineTo(2.7, -0.2).stroke({ width: 1.1, color: c.scuro });
      g.circle(0.1, -7.2, 0.85).circle(0.5, -4, 0.85).fill(ORO);
      g.poly([-5.2, -7.6, -3.6, -9.2, -3.2, -0.2, -5.2, -1.4]).fill({ color: c.scuro, alpha: 0.5 });
    });
  },
  // perno alla spalla
  braccio: (p, c) => { p.g.roundRect(-2.2, -1.9, 4.4, 7.8, 2.2); p.chiudi(c.giacca); },
  // perno al gomito: manica, polsino, mano
  avambraccio: (p, c) => {
    p.g.roundRect(-2.1, -1.4, 4.2, 5.6, 1.9); p.chiudi(c.giacca);
    p.g.circle(0, 5.5, 2.2); p.chiudi(PELLE);
    p.g.roundRect(-2.6, 2.3, 5.2, 2.1, 0.9); p.chiudi(c.scuro);
  },
  // perno al collo: capelli dietro, faccia verso +x con un occhio grande, sopracciglio da duro, naso
  testa: (p, c) => {
    p.g.circle(-1.3, -5.1, 6.5); p.chiudi(0x4a2c1a);
    p.g.circle(0.4, -6, 6.7); p.chiudi(PELLE);
    barba(p, c);
    p.g.circle(7, -4.9, 1.55); p.chiudi(PELLE_OMBRA, 0.7);
    p.dentro((g) => {
      g.ellipse(3.7, -6.9, 2.3, 2.7).fill(BIANCO).stroke({ width: 0.6, color: INCHIOSTRO });
      g.circle(4.7, -6.7, 1.3).fill(INCHIOSTRO).circle(5.1, -7.2, 0.4).fill(BIANCO);
      g.moveTo(1.4, -10.3).lineTo(5.9, -9).stroke({ width: 1.2, color: INCHIOSTRO, cap: 'round' });
      if (c.ciurma !== 'gelo' && c.ciurma !== 'teschio') g.moveTo(3.7, -2.2).quadraticCurveTo(5, -1.4, 6.3, -2.6).stroke({ width: 0.9, color: INCHIOSTRO, cap: 'round' });
    });
  },
};

// ─── Armi: 4 modi di tenerle (animazione.md §3.6). Perno all'impugnatura, bocca verso +x. ──

const ARMI: Record<ArmaPosa, Disegno> = {
  // bocca da fuoco portata sotto il braccio
  cannone: (p) => {
    p.g.circle(-6.2, 0, 2.1); p.chiudi(FERRO);
    p.g.roundRect(-5.5, -3, 17, 6, 2.6); p.chiudi(FERRO);
    p.g.roundRect(10.4, -3.8, 3.3, 7.6, 1.4); p.chiudi(0x34343f);
    p.dentro((g) => g.rect(-2.6, -3, 1.5, 6).rect(3.2, -3, 1.5, 6).fill(ORO).rect(-4.5, -2.2, 14, 1).fill({ color: BIANCO, alpha: 0.18 }));
  },
  pistola: (p) => {
    p.g.poly([-1.9, -0.6, 1.6, -0.6, 0.4, 4.4, -3.1, 4]); p.chiudi(LEGNO);
    p.g.roundRect(-2, -2.7, 11.6, 3.1, 1.2); p.chiudi(FERRO);
    p.g.roundRect(8.2, -3.3, 2.5, 4.3, 1); p.chiudi(FERRO_CHIARO);
  },
  granata: (p) => {
    p.g.rect(-0.3, -6.3, 1.9, 2.4); p.chiudi(0x8a8a8a);
    p.g.circle(0.6, -0.6, 4.1); p.chiudi(0x2f3a33);
    p.dentro((g) => g.circle(-0.7, -1.9, 1.1).fill({ color: BIANCO, alpha: 0.45 }).circle(0.7, -7.3, 1.4).fill(ORO));
  },
  sciabola: (p) => {
    p.g.poly([1.2, -1.6, 8.5, -3, 16, -6.6, 11.6, -0.4, 1.2, 1.2]); p.chiudi(0xe9eef2);
    p.g.roundRect(-3.7, -1.1, 3.5, 2.2, 0.9); p.chiudi(LEGNO);
    p.g.roundRect(-0.7, -2.9, 2.3, 5.8, 1.1); p.chiudi(ORO, BORDO, hex(PALETTE.oroOmbra));
  },
};

const NOMI_ARMI = Object.keys(ARMI) as ArmaPosa[];
/** quale disegno usa ogni osso */
const PEZZO_DI: Record<Osso, string> = {
  braccioB: 'braccio', avambraccioB: 'avambraccio', cosciaB: 'coscia', stincoB: 'stinco', piedeB: 'piede',
  falda: 'falda', cosciaA: 'coscia', stincoA: 'stinco', piedeA: 'piede',
  busto: 'busto', testa: 'testa', cappello: 'cappello', arma: 'cannone', braccioA: 'braccio', avambraccioA: 'avambraccio',
};
const DIETRO = new Set<Osso>(['braccioB', 'avambraccioB', 'cosciaB', 'stincoB', 'piedeB']);

interface Ritaglio { texture: Texture; ax: number; ay: number }

/** Atlante di una ciurma: tutti i pezzi, ognuno col gemello bianco del contorno (chiave + '#'), in una texture sola. */
class Atlante {
  private readonly ritagli = new Map<string, Ritaglio>();
  private readonly base: Texture;

  constructor(r: Renderer, ciurma: IdCiurma) {
    const { colore, scuro } = COLORI_CIURMA[ciurma];
    const giacca = hex(colore), sc = hex(scuro);
    const c: Colori = { giacca, scuro: sc, cappello: mescola(sc, 0x1c1418, 0.55), ciurma };
    const disegni: [string, Disegno][] = [
      ...Object.entries(CORPO), ['cappello', CAPPELLI[ciurma]], ...NOMI_ARMI.map((a) => [a, ARMI[a]] as [string, Disegno]),
    ];
    const foglio = new Container();
    const celle: { chiave: string; x: number; y: number; w: number; h: number; ox: number; oy: number }[] = [];
    const LARGO = 150, SPAZIO = 2;
    let x = SPAZIO, y = SPAZIO, riga = 0;
    const metti = (chiave: string, g: Graphics) => {
      const b = g.getLocalBounds();
      // un px di margine: il bordo morbido non deve toccare il pezzo vicino
      const x0 = Math.floor(b.x) - 1, y0 = Math.floor(b.y) - 1;
      const w = Math.ceil(b.x + b.width) + 1 - x0, h = Math.ceil(b.y + b.height) + 1 - y0;
      if (x + w + SPAZIO > LARGO) { x = SPAZIO; y += riga + SPAZIO; riga = 0; }
      g.position.set(x - x0, y - y0);
      foglio.addChild(g);
      celle.push({ chiave, x, y, w, h, ox: -x0, oy: -y0 });
      x += w + SPAZIO; riga = Math.max(riga, h);
    };
    for (const [nome, disegna] of disegni) {
      for (const contorno of [0, CONTORNO_PX]) {
        const g = new Graphics();
        disegna(new Penna(g, contorno), c);
        metti(contorno ? `${nome}#` : nome, g);
      }
    }
    // ombra a terra sotto i piedi
    metti('ombra', new Graphics().ellipse(0, 0, 8.6, 2.3).fill({ color: 0x000000, alpha: 0.26 }));
    const alto = y + riga + SPAZIO;
    this.base = r.generateTexture({ target: foglio, frame: new Rectangle(0, 0, LARGO, alto), resolution: RISOLUZIONE, antialias: true });
    foglio.destroy({ children: true });
    for (const k of celle) {
      const texture = new Texture({ source: this.base.source, frame: new Rectangle(k.x, k.y, k.w, k.h) });
      this.ritagli.set(k.chiave, { texture, ax: k.ox / k.w, ay: k.oy / k.h });
    }
  }

  ritaglio(chiave: string): Ritaglio { return this.ritagli.get(chiave)!; }

  distruggi(): void {
    for (const k of this.ritagli.values()) k.texture.destroy(false);
    this.ritagli.clear();
    this.base.destroy(true);
  }
}

function sprite(k: Ritaglio): Sprite {
  const s = new Sprite(k.texture);
  s.anchor.set(k.ax, k.ay);
  return s;
}

/** Il pupazzo di un pirata. `radice` va messa nei piedi del pirata (centro della base della capsula). */
export class RigPirata {
  readonly radice = new Container();
  private readonly ombra: Sprite;
  /** si specchia col verso, gira attorno al perno, si schiaccia */
  private readonly corpo = new Container();
  private readonly contorni = new Container();
  private readonly pezzi = new Container();
  private readonly sp: Sprite[] = [];
  private readonly spContorno: Sprite[] = [];
  private arma: ArmaPosa | null = null;
  private lampoAcceso = false;

  constructor(private readonly atlante: Atlante) {
    this.ombra = sprite(atlante.ritaglio('ombra'));
    for (const nome of OSSA) {
      const c = sprite(atlante.ritaglio(`${PEZZO_DI[nome]}#`));
      const s = sprite(atlante.ritaglio(PEZZO_DI[nome]));
      if (DIETRO.has(nome)) s.tint = TINTA_DIETRO;
      this.spContorno.push(c); this.sp.push(s);
      this.contorni.addChild(c); this.pezzi.addChild(s);
    }
    const iArma = OSSA.indexOf('arma');
    this.sp[iArma].visible = this.spContorno[iArma].visible = false;
    this.corpo.pivot.set(0, -SCHELETRO.perno);
    this.corpo.addChild(this.contorni, this.pezzi);
    this.radice.addChild(this.ombra, this.corpo);
  }

  /** Mette i pezzi dove dicono le ossa. `verso` = dove guarda; `arma` = arma in mano (null = nessuna). */
  applica(posa: Posa, verso: 1 | -1, arma: ArmaPosa | null, aTerra: boolean): void {
    const o = posa.ossa;
    for (let i = 0; i < N_OSSA; i++) {
      const x = o[i * 3], y = o[i * 3 + 1], r = o[i * 3 + 2];
      const s = this.sp[i], c = this.spContorno[i];
      s.position.set(x, y); s.rotation = r;
      c.position.set(x, y); c.rotation = r;
    }
    if (arma !== this.arma) {
      this.arma = arma;
      const i = OSSA.indexOf('arma');
      this.sp[i].visible = this.spContorno[i].visible = arma !== null;
      if (arma) {
        const k = this.atlante.ritaglio(arma), kc = this.atlante.ritaglio(`${arma}#`);
        this.sp[i].texture = k.texture; this.sp[i].anchor.set(k.ax, k.ay);
        this.spContorno[i].texture = kc.texture; this.spContorno[i].anchor.set(kc.ax, kc.ay);
      }
    }
    this.corpo.position.set(posa.rx * verso, posa.ry - SCHELETRO.perno);
    this.corpo.rotation = posa.rot * verso;
    this.corpo.scale.set(posa.sx * verso, posa.sy);
    this.ombra.visible = aTerra;
  }

  /** lampo bianco del colpo: la sagoma bianca passa sopra ai pezzi */
  lampo(si: boolean): void {
    if (si === this.lampoAcceso) return;
    this.lampoAcceso = si;
    this.corpo.setChildIndex(this.contorni, si ? 1 : 0);
  }

  /** Punto del pupazzo (sistema dei piedi, x in avanti) → spostamento in px di mondo dai piedi del pirata. */
  static nelMondo(posa: Posa, verso: 1 | -1, x: number, y: number): { x: number; y: number } {
    const px = x * posa.sx, py = (y + SCHELETRO.perno) * posa.sy;
    const c = Math.cos(posa.rot), s = Math.sin(posa.rot);
    return { x: (px * c - py * s + posa.rx) * verso, y: px * s + py * c + posa.ry - SCHELETRO.perno };
  }
}

const RIPOSO: StatoPosa = {
  mossa: 'fermo', ciurma: 'teschio', cammino: 0, salita: 0, tempo: 0, daMs: 1000, sfasa: 0, mira: null,
  sparo: -1, colpito: -1, atterrato: -1, sbalzato: false, suolo: true, ko: false, morte: -1, annegato: false,
};

/** Atlanti delle ciurme e sprite unici per la vista da lontano: si creano alla prima richiesta, una volta per battaglia. */
export class PezziPirata {
  private readonly atlanti = new Map<IdCiurma, Atlante>();
  private readonly sagome = new Map<IdCiurma, Ritaglio>();

  constructor(private readonly r: Renderer) {}

  private atlante(c: IdCiurma): Atlante {
    let a = this.atlanti.get(c);
    if (!a) { a = new Atlante(this.r, c); this.atlanti.set(c, a); }
    return a;
  }

  pupazzo(c: IdCiurma): RigPirata { return new RigPirata(this.atlante(c)); }

  /** Sprite unico del pirata fermo (sotto SCALA_MIN_PUPAZZO): è una foto del pupazzo a riposo, piedi in (0, 0). */
  sagoma(c: IdCiurma): Sprite {
    let k = this.sagome.get(c);
    if (!k) {
      const rig = this.pupazzo(c);
      rig.applica(risolvi(bersaglio({ ...RIPOSO, ciurma: c }), null), 1, null, false);
      const b = rig.radice.getLocalBounds();
      const x0 = Math.floor(b.x) - 1, y0 = Math.floor(b.y) - 1;
      const w = Math.ceil(b.x + b.width) + 1 - x0, h = Math.ceil(b.y + b.height) + 1 - y0;
      const texture = this.r.generateTexture({ target: rig.radice, frame: new Rectangle(x0, y0, w, h), resolution: 2, antialias: true });
      rig.radice.destroy({ children: true });
      k = { texture, ax: -x0 / w, ay: -y0 / h };
      this.sagome.set(c, k);
    }
    return sprite(k);
  }

  distruggi(): void {
    for (const k of this.sagome.values()) k.texture.destroy(true);
    for (const a of this.atlanti.values()) a.distruggi();
    this.sagome.clear(); this.atlanti.clear();
  }
}
