// Frecce rosse sul bordo per i nemici fuori vista (studio v2, UX §4; P1-contratti §6 Render n.5).
// Una freccia per ogni nemico vivo che non si vede, con la distanza in metri dal pirata di turno; un tocco sulla
// freccia porta la camera su quel nemico. Le frecce non finiscono sotto la barra in alto né sotto i tasti negli
// angoli in basso, e non si sovrappongono.
// `frecceNemici` è PURA (testata in Node); `FrecceNemici` è lo strato Pixi, in px CSS sopra il mondo.
import { Container, Graphics, Text } from 'pixi.js';
import { PALETTE, hex } from '../../core/palette';
import { frecciaBordo, MARGINI_BORDO } from './bordo';
import { INQUADRA } from './inquadra';

/** px di mondo per metro mostrato: il pirata è alto 40 px, "circa due metri" a fumetto */
export const METRO_PX = 20;
/** distanza minima tra due frecce lungo il bordo, px CSS */
export const DISTANZA_FRECCE = 34;
/** raggio del tocco su una freccia, px CSS */
export const RAGGIO_TOCCO = 30;

export interface FrecciaNemico { id: number; x: number; y: number; angolo: number; metri: number }

interface Vista { w: number; h: number; schermoDaMondo(x: number, y: number): { x: number; y: number } }

/**
 * Frecce per i nemici fuori vista.
 * @param nemici pirati nemici vivi (px di mondo)
 * @param da pirata di turno (px di mondo), per la distanza; null = distanza dal centro della vista
 */
export function frecceNemici(nemici: readonly { id: number; x: number; y: number }[], da: { x: number; y: number } | null, cam: Vista): FrecciaNemico[] {
  const { w, h } = cam;
  const out: FrecciaNemico[] = [];
  const x0 = MARGINI_BORDO.sx, x1 = w - MARGINI_BORDO.dx;
  // riquadri dei tasti negli angoli in basso (gli stessi che la camera tiene liberi per chi tira)
  const yTasti = h - INQUADRA.levaAlta - 10;
  const sxTasti = Math.min(INQUADRA.levaLarga, w / 2 - 40) + 10, dxTasti = w - sxTasti;
  for (const n of nemici) {
    const q = cam.schermoDaMondo(n.x, n.y);
    const f = frecciaBordo(q.x, q.y, w, h);
    if (!f) continue;
    let { x, y } = f;
    if (y > yTasti && (x < sxTasti || x > dxTasti)) {
      // sul bordo laterale sale sopra i tasti; sul bordo basso si sposta verso il centro
      if (x <= x0 + 1 || x >= x1 - 1) y = yTasti;
      else x = x < w / 2 ? sxTasti : dxTasti;
    }
    const metri = da ? Math.max(1, Math.round(Math.hypot(n.x - da.x, n.y - da.y) / METRO_PX)) : 0;
    out.push({ id: n.id, x, y, angolo: f.angolo, metri });
  }
  separa(out, w, h, yTasti, sxTasti, dxTasti);
  return out;
}

/**
 * Allontana le frecce troppo vicine lungo il loro bordo, restando dentro il tratto libero di quel bordo (sui lati
 * sopra i tasti, in basso tra i tasti). Su ogni bordo: passata in avanti, poi all'indietro dal fondo del tratto.
 */
function separa(f: FrecciaNemico[], w: number, h: number, yTasti: number, sxTasti: number, dxTasti: number): void {
  if (f.length < 2) return;
  const sx = MARGINI_BORDO.sx, dx = w - MARGINI_BORDO.dx, su = MARGINI_BORDO.su;
  const bordo = (a: FrecciaNemico) => (a.y <= su + 1 ? 'alto' : a.x >= dx - 1 ? 'dx' : a.x <= sx + 1 ? 'sx' : 'basso');
  const tratti = { alto: [sx, dx], dx: [su, yTasti], sx: [su, yTasti], basso: [sxTasti, dxTasti] } as const;
  for (const e of ['alto', 'dx', 'sx', 'basso'] as const) {
    const lungo = f.filter((a) => bordo(a) === e);
    if (lungo.length < 2) continue;
    const vert = e === 'dx' || e === 'sx';
    const get = (a: FrecciaNemico) => (vert ? a.y : a.x);
    const set = (a: FrecciaNemico, v: number) => { if (vert) a.y = v; else a.x = v; };
    const [lo, hi] = tratti[e];
    lungo.sort((a, b) => get(a) - get(b));
    for (let i = 1; i < lungo.length; i++) set(lungo[i], Math.max(get(lungo[i]), get(lungo[i - 1]) + DISTANZA_FRECCE));
    set(lungo[lungo.length - 1], Math.min(get(lungo[lungo.length - 1]), hi));
    for (let i = lungo.length - 2; i >= 0; i--) set(lungo[i], Math.min(get(lungo[i]), get(lungo[i + 1]) - DISTANZA_FRECCE));
    // tanti nemici su un bordo corto: si stringono (meglio vicine che sotto i tasti)
    if (get(lungo[0]) < lo) {
      const passo = lungo.length > 1 ? (hi - lo) / (lungo.length - 1) : 0;
      lungo.forEach((a, i) => set(a, lo + passo * i));
    }
  }
}

/** La freccia toccata in (x, y) px CSS, se c'è. */
export function frecciaToccata(f: readonly FrecciaNemico[], x: number, y: number): FrecciaNemico | null {
  let meglio: FrecciaNemico | null = null, dm = RAGGIO_TOCCO;
  for (const a of f) {
    const d = Math.hypot(a.x - x, a.y - y);
    if (d <= dm) { dm = d; meglio = a; }
  }
  return meglio;
}

/** Strato Pixi delle frecce: un pezzo per nemico, riusato a ogni frame. */
export class FrecceNemici {
  readonly radice = new Container();
  private readonly pezzi: { c: Container; punta: Graphics; pillola: Graphics; testo: Text; metri: number }[] = [];
  /** le frecce dell'ultimo frame (per il tocco) */
  ultime: FrecciaNemico[] = [];

  aggiorna(frecce: FrecciaNemico[], tempo: number): void {
    this.ultime = frecce;
    while (this.pezzi.length < frecce.length) this.pezzi.push(this.creaPezzo());
    // un piccolo respiro verso l'esterno: "c'è qualcuno di là"
    const respiro = 2.5 * Math.sin(tempo / 220);
    for (let i = 0; i < this.pezzi.length; i++) {
      const p = this.pezzi[i], f = frecce[i];
      p.c.visible = !!f;
      if (!f) continue;
      const cx = Math.cos(f.angolo), cy = Math.sin(f.angolo);
      p.c.position.set(Math.round(f.x), Math.round(f.y));
      p.punta.rotation = f.angolo;
      p.punta.position.set(cx * respiro, cy * respiro);
      if (p.metri !== f.metri) {
        p.metri = f.metri;
        p.testo.text = `${f.metri} m`;
        const lw = Math.ceil(p.testo.width) + 10;
        p.pillola.clear().roundRect(-lw / 2, -8, lw, 16, 8).fill({ color: hex(PALETTE.abisso), alpha: 0.85 })
          .stroke({ width: 1, color: hex(PALETTE.pericolo), alpha: 0.8 });
      }
      // la distanza sta verso l'interno dello schermo, dietro la punta
      const lx = -cx * 26, ly = -cy * 22;
      p.pillola.position.set(lx, ly);
      p.testo.position.set(lx, ly);
      p.pillola.visible = p.testo.visible = f.metri > 0;
    }
  }

  private creaPezzo() {
    const c = new Container();
    // punta verso destra (angolo 0), contorno chiaro per leggerla su mare e terreno
    const punta = new Graphics()
      .poly([10, 0, -8, -10, -4, 0, -8, 10]).fill(hex(PALETTE.pericolo)).stroke({ width: 2, color: 0xffffff, alpha: 0.95 });
    const pillola = new Graphics();
    const testo = new Text({
      text: '',
      style: { fontFamily: 'Nunito Variable, Nunito, sans-serif', fontWeight: '900', fontSize: 12, fill: 0xffffff },
      resolution: Math.min(2, globalThis.devicePixelRatio || 1),
    });
    testo.anchor.set(0.5, 0.5);
    c.addChild(pillola, testo, punta);
    this.radice.addChild(c);
    return { c, punta, pillola, testo, metri: -1 };
  }

  distruggi(): void {
    this.radice.destroy({ children: true });
  }
}
