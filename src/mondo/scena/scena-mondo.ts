// Scena Pixi del Tavolo del Timone (P2 Fase A, agente Mondo e mappa): la carta dipinta stesa sul tavolo di Mastro
// Gancio, le isole come sprite, la fascia d'onda col colore di chi le tiene, le pedine di legno col numero di pirati,
// i cartelli grigi della Marina, le bandierine rosse, l'icona del premio, la nebbia, il veliero e i boccali.
//
// La scena è SOLO grafica (P2-contratti §2): disegna bus.carriera e bus.evidenzaMondo, esegue bus.animaMondo in
// coda (bus.mondoOccupato resta true finché la coda non è vuota) e scrive bus.isolaToccata. Le regole stanno nella
// Campagna. Le decisioni senza Pixi (cosa mostrare, quale isola sta sotto il dito) sono in logica.ts.
import { Container, Graphics, Sprite, Text, TilingSprite, type Application } from 'pixi.js';
import type { AnimazioneMondo, DefCapitolo, EvidenzaMondo, IdIsola, StatoCarriera } from '../../core/carriera';
import { COLORI_CIURMA, hex } from '../../core/palette';
import { CALA_PAPPAGALLO, CAPITOLO_1, MONDO_H, MONDO_W } from '../../contenuti/capitolo-1';
import { CameraMondo, type Riquadro } from './camera-mondo';
import {
  capitoliAperti, capitoliBloccati, isolaInPunto, isoleBloccate, rotte, sbuffiNebbia, scalaSegni, viaggioInCoda,
  vistaDaStato, type IsolaMappa, type VistaIsola,
} from './logica';
import { PEZZI_MONDO } from '../../ui/kit/risorse';
import type { TextureMondo } from './risorse';

/** pedine, cartelli, bandierine e premi del kit di Arte UI sono a 3×: 1/3 di px d'immagine per px logico */
const P = 1 / 3;
const anc = (id: keyof typeof PEZZI_MONDO): [number, number] => {
  const q = PEZZI_MONDO[id];
  return [q.ancora[0] / q.w, q.ancora[1] / q.h];
};

const ROSSO = hex(COLORI_CIURMA.teschio.colore);
const GRIGIO = hex(COLORI_CIURMA.marina.colore);
const ORO = 0xffc83d;
const SCURO = 0x3b2416;
/** isole non toccabili mentre la Campagna chiede una scelta */
const TINTA_SPENTA = 0x8a8a8a;
/** bordo della carta che resta pergamena (le onde che scorrono stanno dentro) */
const CORNICE = 110;

interface IsolaScena {
  m: IsolaMappa;
  sprite: Sprite;
  onda: Sprite;
  coloreOnda: number;
  cartello: Sprite;
  bandierina: Sprite;
  pedina: Container;
  pedinaSprite: Sprite;
  numero: Text;
  premio: Sprite;
  vista: VistaIsola | null;
}

interface Sbuffo { s: Sprite; x: number; y: number; capitolo: number; base: number; fase: number }

interface Tween { ms: number; durata: number; f: (t: number) => void; fine: () => void }

const morbido = (t: number) => 1 - (1 - t) ** 3;
const rimbalzo = (t: number) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};
function mescolaColore(a: number, b: number, t: number): number {
  const c = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (c(16) << 16) | (c(8) << 8) | c(0);
}

export class ScenaMondo {
  readonly radice = new Container();
  readonly camera = new CameraMondo(MONDO_W, MONDO_H);
  private readonly mondo = new Container();
  private readonly isole = new Map<IdIsola, IsolaScena>();
  private readonly mappa: IsolaMappa[];
  private readonly anelli = new Graphics();
  private readonly frecce = new Graphics();
  private readonly scia = new Graphics();
  private readonly effetti = new Container();
  private readonly veliero: Sprite;
  private ondeA!: TilingSprite;
  private ondeB!: TilingSprite;
  private sbuffi: Sbuffo[] = [];
  private tweens: Tween[] = [];
  private coda: AnimazioneMondo[] = [];
  private attiva: AnimazioneMondo | null = null;
  private stato: StatoCarriera | null = null;
  private evidenza: EvidenzaMondo = { selezionata: null, toccabili: [] };
  /** isola dove è ormeggiato il veliero dopo l'ultimo viaggio (null = si decide dal capitolo) */
  private porto: IdIsola | null = null;
  private visibile = false;
  /** capitolo la cui nebbia si sta alzando adesso (i suoi segnaposti si vedono già) */
  private nebbiaInCorso: number | null = null;
  private inquadrata = false;
  private t = 0;
  private scalaSegniUltima = -1;

  constructor(app: Application, private readonly tex: TextureMondo, private readonly cap: DefCapitolo = CAPITOLO_1) {
    this.mappa = [
      ...cap.isole.map((i) => ({ id: i.id, x: i.pos.x, y: i.pos.y, raggio: i.raggio, capitolo: cap.id as number })),
      { id: CALA_PAPPAGALLO.id, x: CALA_PAPPAGALLO.pos.x, y: CALA_PAPPAGALLO.pos.y, raggio: CALA_PAPPAGALLO.raggio, capitolo: 0 },
    ];
    this.radice.addChild(this.mondo);
    this.radice.visible = false;
    this.costruisciTavoloECarta();
    this.costruisciRotte();
    const strati = { onde: new Container(), isole: new Container(), segni: new Container() };
    strati.segni.sortableChildren = true;
    // la fascia d'onda sta sopra lo sprite (che ha già acque basse e schiuma), fuori dalla costa
    this.mondo.addChild(strati.isole, strati.onde, this.anelli, this.frecce);
    for (const m of this.mappa) this.costruisciIsola(m, strati);
    this.mondo.addChild(strati.segni, this.scia);
    this.veliero = new Sprite(tex.veliero);
    this.veliero.anchor.set(0.5, 0.62);
    this.veliero.scale.set(0.5);
    this.mondo.addChild(this.veliero, this.effetti);
    this.costruisciNebbia();
    this.costruisciBoccali();
    this.camera.impostaSchermo(app.screen.width, app.screen.height);
  }

  // ─── Costruzione ───────────────────────────────────────────────────────────────────────────────────

  private costruisciTavoloECarta(): void {
    const t = this.tex;
    const tavolo = new TilingSprite({ texture: t.tavolo, width: MONDO_W + 4000, height: MONDO_H + 3000 });
    tavolo.position.set(-2000, -1500);
    const ombra = new Graphics().roundRect(14, 20, MONDO_W - 20, MONDO_H - 22, 70).fill({ color: 0x1a0d06, alpha: 0.45 });
    const carta = new Container();
    const L = t.manifesto.tessera;
    t.carta.forEach((riga, r) => riga.forEach((tx, c) => {
      const s = new Sprite(tx);
      s.position.set(c * L, r * L);
      carta.addChild(s);
    }));
    const mare = { x: CORNICE, y: CORNICE, w: MONDO_W - 2 * CORNICE, h: MONDO_H - 2 * CORNICE };
    this.ondeA = new TilingSprite({ texture: t.ondeA, width: mare.w, height: mare.h });
    this.ondeB = new TilingSprite({ texture: t.ondeB, width: mare.w, height: mare.h });
    for (const o of [this.ondeA, this.ondeB]) o.position.set(mare.x, mare.y);
    this.ondeA.alpha = 0.13; this.ondeB.alpha = 0.09;
    this.ondeB.tileScale.set(1.6);
    this.mondo.addChild(tavolo, ombra, carta, this.ondeA, this.ondeB);
  }

  private costruisciRotte(): void {
    const g = new Graphics();
    const pos = new Map(this.mappa.map((m) => [m.id, m]));
    for (const [a, b] of rotte(this.cap)) {
      const A = pos.get(a)!, B = pos.get(b)!;
      const d = Math.hypot(B.x - A.x, B.y - A.y);
      const ux = (B.x - A.x) / d, uy = (B.y - A.y) / d;
      // da costa a costa, con una leggera curva (le rotte dei portolani)
      const p0 = { x: A.x + ux * A.raggio * 1.15, y: A.y + uy * A.raggio * 1.15 };
      const p2 = { x: B.x - ux * B.raggio * 1.15, y: B.y - uy * B.raggio * 1.15 };
      const c = { x: (p0.x + p2.x) / 2 - uy * d * 0.08, y: (p0.y + p2.y) / 2 + ux * d * 0.08 };
      const passi = Math.max(6, Math.round(d / 26));
      for (let i = 0; i < passi; i += 2) {
        const q = (k: number) => {
          const t = k / passi;
          return { x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * c.x + t * t * p2.x, y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * c.y + t * t * p2.y };
        };
        const s = q(i), e = q(i + 1);
        g.moveTo(s.x, s.y).lineTo(e.x, e.y);
      }
    }
    g.stroke({ width: 7, color: 0xf5e6c4, alpha: 0.75, cap: 'round' });
    this.mondo.addChild(g);
  }

  private costruisciIsola(m: IsolaMappa, strati: { onde: Container; isole: Container; segni: Container }): void {
    const t = this.tex;
    const onda = new Sprite(t.onde.get(m.id)!);
    onda.anchor.set(0.5); onda.scale.set(0.5); onda.position.set(m.x, m.y); onda.tint = GRIGIO;
    const sprite = new Sprite(t.isole.get(m.id)!);
    sprite.anchor.set(0.5); sprite.scale.set(0.5); sprite.position.set(m.x, m.y);
    strati.onde.addChild(onda);
    strati.isole.addChild(sprite);

    const base = { x: m.x + m.raggio * 0.05, y: m.y - m.raggio * 0.05 };
    const cartello = new Sprite(t.cartello);
    cartello.anchor.set(...anc('ui_mondo_cartello_marina')); cartello.position.set(base.x, base.y); cartello.zIndex = base.y;
    const bandierina = new Sprite(t.bandierina);
    bandierina.anchor.set(...anc('ui_mondo_bandierina')); bandierina.position.set(base.x, base.y); bandierina.zIndex = base.y;
    const pedina = new Container();
    const pedinaSprite = new Sprite(t.pedinaGrigia);
    pedinaSprite.anchor.set(...anc('ui_mondo_pedina_rossa')); pedinaSprite.scale.set(P);
    const numero = new Text({
      text: '0',
      style: { fontFamily: 'Lilita One', fontSize: 20, fill: 0xfff7e8, stroke: { color: SCURO, width: 4 } },
      resolution: 3,
    });
    numero.anchor.set(0.5, 0.55); numero.position.set(0, 0);
    pedina.addChild(pedinaSprite, numero);
    pedina.position.set(m.x + m.raggio * 0.62, m.y + m.raggio * 0.5);
    pedina.zIndex = pedina.y;
    const premio = new Sprite(t.premi.arma);
    premio.anchor.set(0.5, 1); premio.scale.set(P);
    premio.position.set(m.x - m.raggio * 0.35, m.y - m.raggio * 0.55);
    premio.zIndex = premio.y;
    strati.segni.addChild(cartello, bandierina, pedina, premio);
    this.isole.set(m.id, { m, sprite, onda, coloreOnda: GRIGIO, cartello, bandierina, pedina, pedinaSprite, numero, premio, vista: null });
  }

  private costruisciNebbia(): void {
    const c = new Container();
    for (const b of sbuffiNebbia(this.mappa, MONDO_W, MONDO_H)) {
      const s = new Sprite(this.tex.nebbia);
      s.anchor.set(0.5); s.scale.set(b.s); s.rotation = b.r; s.position.set(b.x, b.y);
      const base = b.alfa;
      s.alpha = base;
      c.addChild(s);
      this.sbuffi.push({ s, x: b.x, y: b.y, capitolo: b.capitolo, base, fase: b.r * 10 });
    }
    this.mondo.addChild(c);
  }

  private costruisciBoccali(): void {
    // i quattro boccali che tengono ferma la carta (copione c1.inizio)
    const pos: [number, number, number][] = [[70, 90, -0.3], [MONDO_W - 90, 70, 0.4], [60, MONDO_H - 60, 2.6], [MONDO_W - 70, MONDO_H - 80, 1.2]];
    for (const [x, y, r] of pos) {
      const b = new Sprite(this.tex.boccale);
      b.anchor.set(0.45, 0.48); b.scale.set(0.8); b.position.set(x, y); b.rotation = r;
      this.mondo.addChild(b);
    }
  }

  // ─── Stato e evidenza ──────────────────────────────────────────────────────────────────────────────

  /** Riquadro del capitolo (isole + Cala Pappagallo): è la vista iniziale e "zoom 1" di bus.animaMondo centra. */
  riquadroCapitolo(): Riquadro {
    const r: Riquadro = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const m of this.mappa) {
      r.x0 = Math.min(r.x0, m.x - m.raggio * 1.3); r.x1 = Math.max(r.x1, m.x + m.raggio * 1.3);
      r.y0 = Math.min(r.y0, m.y - m.raggio * 1.5); r.y1 = Math.max(r.y1, m.y + m.raggio * 1.3);
    }
    return r;
  }

  impostaStato(stato: StatoCarriera | null): void { this.stato = stato; this.allinea(); }

  impostaEvidenza(e: EvidenzaMondo): void {
    this.evidenza = e;
    const spegni = e.toccabili.length > 0;
    for (const [id, i] of this.isole) {
      const acceso = !spegni || e.toccabili.includes(id) || e.selezionata === id;
      i.sprite.tint = acceso ? 0xffffff : TINTA_SPENTA;
      i.onda.alpha = acceso ? 0.85 : 0.4;
    }
  }

  /** Riporta allo stato salvato tutto ciò che nessuna animazione sta "tenendo". */
  allinea(): void {
    const coda = this.attiva ? [this.attiva, ...this.coda] : this.coda;
    const bloccate = isoleBloccate(coda);
    for (const [id, i] of this.isole) {
      if (bloccate.has(id)) continue;
      if (i.m.capitolo === 0) this.mostraCala(i);
      else this.mostraVista(i, vistaDaStato(this.cap, this.stato, id));
    }
    const aperti = capitoliAperti(this.stato, capitoliBloccati(coda));
    // sotto la nebbia non si vedono pedine, cartelli e premi (trasparirebbero tra gli sbuffi)
    for (const i of this.isole.values()) {
      const vede = aperti.has(i.m.capitolo) || this.nebbiaInCorso === i.m.capitolo;
      for (const x of [i.cartello, i.bandierina, i.pedina, i.premio]) x.renderable = vede;
    }
    for (const b of this.sbuffi) {
      b.s.visible = !aperti.has(b.capitolo);
      if (b.s.visible && !(this.attiva?.t === 'nebbia' && this.attiva.capitolo === b.capitolo)) { b.s.alpha = b.base; b.s.scale.set(b.s.scale.x); }
    }
    if (!viaggioInCoda(coda)) this.ormeggia(this.porto ?? ((this.stato?.capitolo ?? 1) >= 1 ? this.cap.isole[0].id : CALA_PAPPAGALLO.id));
  }

  private mostraCala(i: IsolaScena): void {
    // Cala Pappagallo: cartello in piedi finché il Prologo non è vinto, poi abbattuto (mondo.md D8)
    const presa = (this.stato?.capitolo ?? 1) >= 1;
    i.cartello.visible = true;
    i.cartello.rotation = presa ? -1.35 : 0;
    i.cartello.alpha = presa ? 0.85 : 1;
    i.bandierina.visible = false;
    i.pedina.visible = false;
    i.premio.visible = false;
    this.coloraOnda(i, presa ? ROSSO : GRIGIO);
  }

  private mostraVista(i: IsolaScena, v: VistaIsola | null): void {
    if (!v) return;
    i.vista = v;
    const mio = v.padrone === 'giocatore';
    i.cartello.visible = !mio; i.cartello.alpha = 1; i.cartello.rotation = 0; i.cartello.position.y = i.m.y - i.m.raggio * 0.05;
    i.bandierina.visible = mio; i.bandierina.alpha = 1; i.bandierina.rotation = 0; i.bandierina.position.y = i.m.y - i.m.raggio * 0.05;
    i.pedina.visible = true;
    i.pedinaSprite.texture = mio ? this.tex.pedinaRossa : this.tex.pedinaGrigia;
    i.numero.text = String(v.pirati);
    i.premio.visible = v.premio !== null;
    if (v.premio) i.premio.texture = this.tex.premiIsola.get(i.m.id) ?? this.tex.premi[v.premio];
    this.coloraOnda(i, mio ? ROSSO : GRIGIO);
  }

  private coloraOnda(i: IsolaScena, c: number): void { i.coloreOnda = c; i.onda.tint = c; }

  private ancoraggio(id: IdIsola): { x: number; y: number } {
    const m = this.mappa.find((x) => x.id === id) ?? this.mappa[0];
    return { x: m.x - m.raggio * 1.3, y: m.y + m.raggio * 0.6 };
  }

  private ormeggia(id: IdIsola): void {
    const p = this.ancoraggio(id);
    this.veliero.position.set(p.x, p.y);
    this.veliero.scale.x = 0.5;
  }

  // ─── Visibilità, tocchi, frame ─────────────────────────────────────────────────────────────────────

  mostra(si: boolean): void {
    if (si === this.visibile) return;
    this.visibile = si;
    this.radice.visible = si;
    if (si && !this.inquadrata) {
      const v = this.camera.inquadra(this.riquadroCapitolo(), 8);
      this.camera.vola(v.x, v.y, v.s, 0);
      this.inquadrata = true;
    }
    // nascosta: le animazioni in corso finiscono subito (non si resta "occupati" senza vederle)
    if (!si) this.finisciTween();
  }

  get attivaVisibile(): boolean { return this.visibile; }

  ridimensiona(w: number, h: number): void {
    const prima = this.camera.inquadra(this.riquadroCapitolo(), 8).s;
    this.camera.impostaSchermo(w, h);
    if (this.camera.scala <= prima * 1.01) { const v = this.camera.inquadra(this.riquadroCapitolo(), 8); this.camera.vola(v.x, v.y, v.s, 0); }
  }

  /** Isola sotto un punto dello schermo (px CSS), o null. */
  isolaSotto(x: number, y: number): IdIsola | null {
    return isolaInPunto(this.camera.mondoDaSchermo(x, y), this.mappa, this.camera.scala, this.tex.indici);
  }

  /** Centro di un'isola sullo schermo (px CSS): serve ai pannelli della Campagna e ai test. */
  schermoDaIsola(id: IdIsola): { x: number; y: number } | null {
    const m = this.mappa.find((i) => i.id === id);
    return m ? this.camera.schermoDaMondo(m.x, m.y) : null;
  }

  aggiorna(deltaMS: number): void {
    if (!this.visibile) return;
    this.t += deltaMS;
    this.camera.aggiorna(deltaMS);
    const c = this.camera;
    this.mondo.scale.set(c.scala);
    this.mondo.position.set(c.w / 2 - c.x * c.scala, c.h / 2 - c.y * c.scala);

    // i tween prima del disegno (una lista nuova: chi finisce può aggiungerne altri)
    const attivi = this.tweens;
    this.tweens = [];
    for (const tw of attivi) {
      tw.ms += deltaMS;
      const t = Math.min(1, tw.ms / tw.durata);
      tw.f(t);
      if (t >= 1) tw.fine(); else this.tweens.push(tw);
    }

    // due fondali d'onda che scorrono in versi diversi (niente shader d'acqua)
    this.ondeA.tilePosition.set(this.t * 0.012, this.t * 0.004);
    this.ondeB.tilePosition.set(-this.t * 0.008, this.t * 0.006);

    const k = scalaSegni(c.scala);
    if (Math.abs(k - this.scalaSegniUltima) > 0.001) {
      this.scalaSegniUltima = k;
      for (const i of this.isole.values()) {
        i.cartello.scale.set(P * k); i.bandierina.scale.set(P * k); i.pedina.scale.set(k);
      }
    }
    const respiro = Math.sin(this.t / 700);
    for (const i of this.isole.values()) {
      i.onda.scale.set(0.5 * (1 + 0.012 * respiro));
      i.premio.scale.set(P * k);
      // il premio galleggia a sinistra del cartello: le distanze crescono coi segnaposti, così non si coprono
      i.premio.position.set(i.m.x + i.m.raggio * 0.05 - 36 * k, i.m.y - i.m.raggio * 0.05 - (30 + 4 * Math.sin(this.t / 380 + i.m.x)) * k);
      // la bandierina sventola
      if (i.bandierina.visible) i.bandierina.skew.y = Math.sin(this.t / 260 + i.m.y) * 0.05;
    }
    for (const b of this.sbuffi) {
      if (!b.s.visible) continue;
      b.s.position.set(b.x + Math.sin(this.t / 5200 + b.fase) * 14, b.y + Math.cos(this.t / 6100 + b.fase) * 8);
    }
    if (!this.attiva || this.attiva.t !== 'viaggio') this.veliero.position.y += Math.sin(this.t / 600) * 0.05;
    this.disegnaAnelli();
  }

  private disegnaAnelli(): void {
    const g = this.anelli;
    g.clear();
    const e = this.evidenza;
    const w = 3 / this.camera.scala;
    for (const id of e.toccabili) {
      const i = this.isole.get(id);
      if (!i || id === e.selezionata) continue;
      const p = (this.t / 1100) % 1;
      g.circle(i.m.x, i.m.y, i.m.raggio * (1.15 + 0.25 * p)).stroke({ width: w, color: 0xfff7e8, alpha: 0.7 * (1 - p) });
    }
    const sel = e.selezionata ? this.isole.get(e.selezionata) : null;
    if (sel) {
      const r = sel.m.raggio * 1.25, n = 18, giro = this.t / 4000;
      for (let k = 0; k < n; k++) {
        const a0 = giro + (k / n) * Math.PI * 2, a1 = a0 + (Math.PI * 2) / n * 0.6;
        g.moveTo(sel.m.x + Math.cos(a0) * r, sel.m.y + Math.sin(a0) * r).arc(sel.m.x, sel.m.y, r, a0, a1);
      }
      g.stroke({ width: w * 1.8, color: ORO, cap: 'round' });
    }
  }

  // ─── Animazioni (bus.animaMondo) ───────────────────────────────────────────────────────────────────

  /** Numero di animazioni ancora da finire (compresa quella in corso). */
  get occupata(): number { return this.coda.length + (this.attiva ? 1 : 0); }

  accoda(a: AnimazioneMondo, fine: () => void): void {
    this.coda.push(a);
    if (this.attiva) return;
    void (async () => {
      while (this.coda.length) {
        this.attiva = this.coda.shift()!;
        try { await this.esegui(this.attiva); } catch (e) { console.error('animazione del mondo', e); }
        this.attiva = null;
        this.allinea();
      }
      fine();
    })();
  }

  private anima(durata: number, f: (t: number) => void): Promise<void> {
    if (!this.visibile || durata <= 0) { f(1); return Promise.resolve(); }
    return new Promise((fine) => this.tweens.push({ ms: 0, durata, f, fine }));
  }

  private attendi(ms: number): Promise<void> { return this.anima(ms, () => {}); }

  private finisciTween(): void {
    const t = this.tweens;
    this.tweens = [];
    for (const tw of t) { tw.f(1); tw.fine(); }
  }

  private async esegui(a: AnimazioneMondo): Promise<void> {
    switch (a.t) {
      case 'centra': return this.centra(a.isola, a.zoom);
      case 'viaggio': return this.viaggio(a.da, a.a);
      case 'nebbia': return this.alzaNebbia(a.capitolo);
      case 'conquista': return this.conquista(a.isola);
      case 'perdita': return this.perdita(a.isola);
      case 'attacco': return this.attacco(a.da, a.verso);
      case 'pirati': return this.cambiaPirati(a.isola, a.da, a.a);
    }
  }

  private async centra(id: IdIsola, zoom?: number): Promise<void> {
    const m = this.mappa.find((i) => i.id === id);
    if (!m) return;
    const base = this.camera.inquadra(this.riquadroCapitolo(), 8).s;
    const s = zoom ? base * zoom : Math.max(this.camera.scala, base * 1.6);
    this.camera.vola(m.x, m.y, s, 700);
    await this.attendi(720);
  }

  /** Porta in vista i punti dati (se lo sono già non muove niente). */
  private async inVista(punti: { x: number; y: number; r: number }[]): Promise<void> {
    const c = this.camera;
    const fuori = punti.some((p) => {
      const s = c.schermoDaMondo(p.x, p.y), r = p.r * c.scala;
      return s.x - r < c.w * 0.08 || s.x + r > c.w * 0.92 || s.y - r < c.h * 0.1 || s.y + r > c.h * 0.9;
    });
    if (!fuori) return;
    const r: Riquadro = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const p of punti) { r.x0 = Math.min(r.x0, p.x - p.r); r.x1 = Math.max(r.x1, p.x + p.r); r.y0 = Math.min(r.y0, p.y - p.r); r.y1 = Math.max(r.y1, p.y + p.r); }
    const v = c.inquadra(r, 40);
    c.vola(v.x, v.y, Math.min(v.s, Math.max(c.scala, c.inquadra(this.riquadroCapitolo(), 8).s)), 550);
    await this.attendi(560);
  }

  private async viaggio(da: IdIsola, a: IdIsola): Promise<void> {
    const p0 = this.ancoraggio(da), p2 = this.ancoraggio(a);
    const d = Math.hypot(p2.x - p0.x, p2.y - p0.y) || 1;
    const c = { x: (p0.x + p2.x) / 2 + ((p2.y - p0.y) / d) * d * 0.25, y: (p0.y + p2.y) / 2 - ((p2.x - p0.x) / d) * d * 0.25 };
    this.ormeggia(da);
    await this.inVista([{ ...p0, r: 140 }, { ...p2, r: 140 }]);
    const punti: { x: number; y: number }[] = [];
    const durata = Math.min(4500, Math.max(2200, (d / 220) * 1000));
    await this.anima(durata, (t) => {
      const u = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const x = (1 - u) ** 2 * p0.x + 2 * (1 - u) * u * c.x + u * u * p2.x;
      const y = (1 - u) ** 2 * p0.y + 2 * (1 - u) * u * c.y + u * u * p2.y;
      const dx = x - this.veliero.x;
      if (Math.abs(dx) > 0.3) this.veliero.scale.x = dx < 0 ? -0.5 : 0.5;
      this.veliero.position.set(x, y + Math.sin(t * 30) * 1.5);
      this.veliero.rotation = Math.sin(t * 22) * 0.04;
      punti.push({ x, y: y + 10 });
      if (punti.length > 60) punti.shift();
      this.disegnaScia(punti, 1);
    });
    this.veliero.rotation = 0;
    this.porto = a;
    await this.anima(800, (t) => this.disegnaScia(punti, 1 - t));
    this.scia.clear();
  }

  private disegnaScia(punti: { x: number; y: number }[], alfa: number): void {
    const g = this.scia;
    g.clear();
    for (let i = 1; i < punti.length; i++) {
      const k = i / punti.length;
      g.moveTo(punti[i - 1].x, punti[i - 1].y).lineTo(punti[i].x, punti[i].y)
        .stroke({ width: 3 + 7 * k, color: 0xe6fbff, alpha: 0.55 * k * alfa, cap: 'round' });
    }
  }

  private async alzaNebbia(capitolo: number): Promise<void> {
    const sbuffi = this.sbuffi.filter((b) => b.capitolo === capitolo && b.s.visible);
    if (!sbuffi.length) return;
    this.nebbiaInCorso = capitolo;
    this.allinea();
    const isole = this.mappa.filter((m) => m.capitolo === capitolo);
    const cx = isole.reduce((s, m) => s + m.x, 0) / Math.max(1, isole.length);
    const cy = isole.reduce((s, m) => s + m.y, 0) / Math.max(1, isole.length);
    const v = this.camera.inquadra(this.riquadroCapitolo(), 8);
    this.camera.vola(v.x, v.y, v.s, 900);
    const partenza = sbuffi.map((b) => ({ b, ritardo: Math.min(0.5, Math.hypot(b.x - cx, b.y - cy) / 3000), s0: b.s.scale.x }));
    await this.anima(2600, (t) => {
      for (const { b, ritardo, s0 } of partenza) {
        const u = Math.min(1, Math.max(0, (t - ritardo) / (1 - ritardo)));
        const d = Math.hypot(b.x - cx, b.y - cy) || 1;
        b.s.alpha = b.base * (1 - morbido(u));
        b.s.scale.set(s0 * (1 + 0.25 * u));
        b.s.position.set(b.x + ((b.x - cx) / d) * 160 * u, b.y + ((b.y - cy) / d) * 160 * u);
      }
    });
    for (const { b, s0 } of partenza) { b.s.visible = false; b.s.scale.set(s0); b.s.position.set(b.x, b.y); b.s.alpha = b.base; }
    this.nebbiaInCorso = null;
  }

  private async conquista(id: IdIsola): Promise<void> {
    const i = this.isole.get(id);
    if (!i) return;
    await this.inVista([{ x: i.m.x, y: i.m.y, r: i.m.raggio * 1.6 }]);
    const y0 = i.cartello.y;
    // il cartello trema, si stacca e vola via
    await this.anima(260, (t) => { i.cartello.rotation = Math.sin(t * 40) * 0.12 * (1 - t); i.cartello.scale.y = P * this.scalaSegniUltima * (1 - 0.15 * Math.sin(t * Math.PI)); });
    i.cartello.scale.y = P * this.scalaSegniUltima;
    await this.anima(650, (t) => {
      i.cartello.y = y0 - 160 * morbido(t);
      i.cartello.x = i.m.x + i.m.raggio * 0.05 + 70 * t;
      i.cartello.rotation = t * 5;
      i.cartello.alpha = 1 - t;
    });
    i.cartello.visible = false;
    i.cartello.x = i.m.x + i.m.raggio * 0.05;
    // la bandierina rossa cade dall'alto e si pianta
    i.bandierina.visible = true; i.bandierina.alpha = 1;
    const da = i.coloreOnda;
    this.coriandoli(i.m.x, y0 - 10);
    await this.anima(520, (t) => {
      i.bandierina.y = y0 - 150 * (1 - rimbalzo(t));
      i.onda.tint = mescolaColore(da, ROSSO, t);
    });
    i.coloreOnda = ROSSO;
    i.pedinaSprite.texture = this.tex.pedinaRossa;
    const v = vistaDaStato(this.cap, this.stato, id);
    if (v) i.numero.text = String(v.pirati);
    await this.anima(350, (t) => { i.premio.alpha = 1 - t; });
    i.premio.visible = false; i.premio.alpha = 1;
    await this.attendi(250);
  }

  private async perdita(id: IdIsola): Promise<void> {
    const i = this.isole.get(id);
    if (!i) return;
    await this.inVista([{ x: i.m.x, y: i.m.y, r: i.m.raggio * 1.6 }]);
    const y0 = i.m.y - i.m.raggio * 0.05;
    await this.anima(380, (t) => { i.bandierina.rotation = 1.4 * morbido(t); i.bandierina.alpha = 1 - t; });
    i.bandierina.visible = false; i.bandierina.rotation = 0; i.bandierina.alpha = 1;
    i.cartello.visible = true; i.cartello.alpha = 1; i.cartello.rotation = 0;
    const da = i.coloreOnda;
    await this.anima(520, (t) => {
      i.cartello.y = y0 - 170 * (1 - rimbalzo(t));
      i.onda.tint = mescolaColore(da, GRIGIO, t);
    });
    i.coloreOnda = GRIGIO;
    i.pedinaSprite.texture = this.tex.pedinaGrigia;
    const v = vistaDaStato(this.cap, this.stato, id);
    if (v) i.numero.text = String(v.pirati);
    await this.attendi(250);
  }

  private async attacco(da: IdIsola[], verso: IdIsola): Promise<void> {
    const V = this.mappa.find((m) => m.id === verso);
    const partenze = da.map((d) => this.mappa.find((m) => m.id === d)).filter((m): m is IsolaMappa => !!m);
    if (!V || !partenze.length) return;
    await this.inVista([V, ...partenze].map((m) => ({ x: m.x, y: m.y, r: m.raggio * 1.3 })));
    const disegna = (crescita: number, alfa: number) => {
      const g = this.frecce;
      g.clear();
      for (const P of partenze) {
        const d = Math.hypot(V.x - P.x, V.y - P.y) || 1;
        const ux = (V.x - P.x) / d, uy = (V.y - P.y) / d;
        const p0 = { x: P.x + ux * P.raggio * 0.7, y: P.y + uy * P.raggio * 0.7 };
        const p2 = { x: V.x - ux * V.raggio * 0.9, y: V.y - uy * V.raggio * 0.9 };
        const c = { x: (p0.x + p2.x) / 2 + uy * d * 0.15, y: (p0.y + p2.y) / 2 - ux * d * 0.15 };
        const punto = (t: number) => ({ x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * c.x + t * t * p2.x, y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * c.y + t * t * p2.y });
        const n = 24, fino = Math.max(0.02, crescita);
        const pts = Array.from({ length: n + 1 }, (_, k) => punto((k / n) * fino));
        const fineP = pts[n], prima = punto(Math.max(0, fino - 0.04));
        const ang = Math.atan2(fineP.y - prima.y, fineP.x - prima.x);
        const testa = (larg: number, lung: number) => [
          fineP.x + Math.cos(ang) * lung, fineP.y + Math.sin(ang) * lung,
          fineP.x + Math.cos(ang + 2.4) * larg, fineP.y + Math.sin(ang + 2.4) * larg,
          fineP.x + Math.cos(ang - 2.4) * larg, fineP.y + Math.sin(ang - 2.4) * larg,
        ];
        for (const [col, w, extra] of [[SCURO, 26, 5], [ROSSO, 16, 0]] as const) {
          g.moveTo(pts[0].x, pts[0].y);
          for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
          g.stroke({ width: w, color: col, alpha: alfa, cap: 'round', join: 'round' });
          g.poly(testa(30 + extra, 34 + extra)).fill({ color: col, alpha: alfa });
        }
      }
    };
    await this.anima(650, (t) => disegna(morbido(t), 1));
    await this.attendi(650);
    await this.anima(300, (t) => disegna(1, 1 - t));
    this.frecce.clear();
  }

  private async cambiaPirati(id: IdIsola, da: number, a: number): Promise<void> {
    const i = this.isole.get(id);
    if (!i) return;
    await this.inVista([{ x: i.m.x, y: i.m.y, r: i.m.raggio * 1.4 }]);
    const k = this.scalaSegniUltima;
    i.numero.text = String(da);
    const segno = new Text({
      text: (a >= da ? '+' : '−') + Math.abs(a - da),
      style: { fontFamily: 'Lilita One', fontSize: 26, fill: a >= da ? 0x4ade80 : 0xff4d4d, stroke: { color: SCURO, width: 5 } },
      resolution: 3,
    });
    segno.anchor.set(0.5);
    segno.scale.set(k);
    this.effetti.addChild(segno);
    const x0 = i.pedina.x, y0 = i.pedina.y - 26 * k;
    await this.anima(700, (t) => {
      i.pedina.scale.set(k * (1 + 0.35 * Math.sin(Math.min(1, t * 1.6) * Math.PI)));
      i.numero.text = String(Math.round(da + (a - da) * Math.min(1, t * 1.4)));
      segno.position.set(x0, y0 - 50 * morbido(t));
      segno.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    });
    i.pedina.scale.set(k);
    i.numero.text = String(a);
    segno.destroy();
  }

  private coriandoli(x: number, y: number): void {
    const pezzi: { g: Graphics; vx: number; vy: number; vr: number }[] = [];
    for (let k = 0; k < 16; k++) {
      const g = new Graphics().rect(-5, -3, 10, 6).fill(k % 3 === 0 ? ORO : k % 3 === 1 ? ROSSO : 0xfff7e8);
      g.position.set(x, y);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const v = 0.35 + Math.random() * 0.35;
      pezzi.push({ g, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vr: (Math.random() - 0.5) * 0.02 });
      this.effetti.addChild(g);
    }
    let ultimo = 0;
    void this.anima(900, (t) => {
      const dt = (t - ultimo) * 900;
      ultimo = t;
      for (const p of pezzi) {
        p.vy += 0.0012 * dt;
        p.g.x += p.vx * dt; p.g.y += p.vy * dt; p.g.rotation += p.vr * dt;
        p.g.alpha = 1 - t;
      }
    }).then(() => pezzi.forEach((p) => p.g.destroy()));
  }

  distruggi(): void {
    this.finisciTween();
    this.radice.destroy({ children: true });
  }
}
