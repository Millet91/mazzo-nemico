// Scale e liane (segnaposto, design/comandi/scale-e-liane.md): disegno nel mondo, pezzi tagliati che cadono,
// e la regola grafica della maniglia (può aggrapparsi?). Le scale e le liane NON sono nella maschera: le
// disegna questo strato sopra il terreno (anche sulle mappe con arte), sotto i pirati.
import { Container, Graphics } from 'pixi.js';
import type { Appiglio, Pirata, TipoAppiglio } from '../../core/tipi';
import { BIL } from '../../contenuti/bilanciamento';
import { sulPianoInCima } from '../sim/appigli';

const MONTANTE = 0x6b4226;
const PIOLO = 0xc9a26b;
const CONTORNO = 0x2b1b10;
const LIANA = 0x4e9a3a;
const FOGLIA = 0x6cc24a;
/** scala larga 14 px, pioli ogni 8 px; liana da 4 px con una foglia ogni 24 px */
export const LARGHEZZA_SCALA = 14;
export const PASSO_PIOLI = 8;
export const PASSO_FOGLIE = 24;
/** i pioli spezzati restano appesi 0,5 s, poi cadono */
const ATTESA_PEZZO_SCALA_MS = 500;
const VITA_PEZZO_MS = 900;
const GRAVITA_PEZZO = 900; // px/s²

/** true se il pirata (vivo, non appeso) è abbastanza vicino a un appiglio per aggrapparsi */
export function puoAggrapparsi(p: Pirata, appigli: readonly Appiglio[], presa: number = BIL.arrampicata.presa): boolean {
  if (p.stato !== 'vivo' || p.appeso >= 0) return false;
  if (appigli.some((a) => Math.abs(p.x - a.x) <= presa && p.y >= a.yAlto - presa && p.y <= a.yBasso + presa)) return true;
  // in piedi sul piano in cima: "scendi" lo porta sulla scala (stessa regola della sim)
  return appigli.some((a) => sulPianoInCima(a, p));
}

/** quote dei pioli di una scala da yAlto a yBasso (il primo a 4 px dalla cima) */
export function quotePioli(yAlto: number, yBasso: number): number[] {
  const out: number[] = [];
  for (let y = yAlto + PASSO_PIOLI / 2; y < yBasso; y += PASSO_PIOLI) out.push(y);
  return out;
}

function disegnaScala(g: Graphics, yAlto: number, yBasso: number): void {
  const m = LARGHEZZA_SCALA / 2;
  for (const y of quotePioli(yAlto, yBasso)) g.moveTo(-m + 1, y).lineTo(m - 1, y);
  g.stroke({ width: 2.5, color: PIOLO });
  g.rect(-m - 1, yAlto, 3, yBasso - yAlto).rect(m - 2, yAlto, 3, yBasso - yAlto).fill(MONTANTE).stroke({ width: 1, color: CONTORNO });
}

function disegnaLiana(g: Graphics, yAlto: number, yBasso: number, fase: number): void {
  // corda ondulata (posizione locale x = 0 in cima, oscilla in basso)
  g.moveTo(0, yAlto);
  for (let y = yAlto + 4; y <= yBasso; y += 4) g.lineTo(Math.sin((y - yAlto) / 14 + fase) * 1.5, y);
  g.stroke({ width: 4, color: LIANA, cap: 'round', join: 'round' });
  for (let y = yAlto + PASSO_FOGLIE / 2, i = 0; y < yBasso; y += PASSO_FOGLIE, i++) {
    const x = Math.sin((y - yAlto) / 14 + fase) * 1.5, v = i % 2 ? 1 : -1;
    g.ellipse(x + v * 5, y, 5, 2.5).fill(FOGLIA);
  }
}

interface VisAppiglio { g: Graphics; chiave: string; tipo: TipoAppiglio }
interface Pezzo { g: Graphics; attesa: number; ms: number; vy: number; vr: number }

export class AppigliRender {
  readonly radice = new Container();
  private readonly vis = new Map<number, VisAppiglio>();
  private readonly pezzi: Pezzo[] = [];

  /** Ridisegna gli appigli cambiati; le liane oscillano piano (±2 px, solo grafica). */
  aggiorna(appigli: readonly Appiglio[], deltaMS: number, tempo: number): void {
    const visti = new Set<number>();
    for (const a of appigli) {
      visti.add(a.id);
      const chiave = `${a.tipo}|${a.x}|${a.yAlto}|${a.yBasso}`;
      let v = this.vis.get(a.id);
      if (!v || v.chiave !== chiave) {
        if (!v) { v = { g: new Graphics(), chiave, tipo: a.tipo }; this.vis.set(a.id, v); this.radice.addChild(v.g); }
        v.chiave = chiave; v.tipo = a.tipo;
        v.g.clear();
        if (a.tipo === 'scala') disegnaScala(v.g, a.yAlto, a.yBasso); else disegnaLiana(v.g, a.yAlto, a.yBasso, a.id);
        v.g.position.set(a.x, 0);
        v.g.pivot.set(0, a.yAlto);
        v.g.y = a.yAlto;
      }
      // la liana dondola dalla cima: rotazione minima che dà ±2 px in fondo
      if (a.tipo === 'liana') v.g.rotation = Math.sin(tempo / 900 + a.id) * (2 / Math.max(20, a.yBasso - a.yAlto));
    }
    for (const [id, v] of this.vis) if (!visti.has(id)) { v.g.destroy(); this.vis.delete(id); }
    this.aggiornaPezzi(deltaMS);
  }

  /** Evento `appiglioRotto`: il tratto tolto diventa un pezzo che (dopo 0,5 s per la scala) cade e sparisce. */
  rotto(appiglio: number, x: number, yAlto: number, yBasso: number): void {
    const tipo = this.vis.get(appiglio)?.tipo ?? 'liana';
    if (yBasso - yAlto < 1) return;
    const g = new Graphics();
    if (tipo === 'scala') disegnaScala(g, 0, yBasso - yAlto); else disegnaLiana(g, 0, yBasso - yAlto, appiglio);
    g.pivot.set(0, (yBasso - yAlto) / 2);
    g.position.set(x, (yAlto + yBasso) / 2);
    this.radice.addChild(g);
    this.pezzi.push({ g, attesa: tipo === 'scala' ? ATTESA_PEZZO_SCALA_MS : 0, ms: 0, vy: -40, vr: (appiglio % 2 ? 1 : -1) * 2.5 });
  }

  get pezziInCaduta(): number { return this.pezzi.length; }

  private aggiornaPezzi(deltaMS: number): void {
    for (let i = this.pezzi.length - 1; i >= 0; i--) {
      const p = this.pezzi[i];
      if (p.attesa > 0) {
        p.attesa -= deltaMS;
        p.g.rotation = Math.sin(p.attesa / 40) * 0.05; // pioli spezzati che dondolano
        continue;
      }
      const dt = deltaMS / 1000;
      p.ms += deltaMS;
      p.vy += GRAVITA_PEZZO * dt;
      p.g.y += p.vy * dt;
      p.g.rotation += p.vr * dt;
      p.g.alpha = Math.max(0, 1 - p.ms / VITA_PEZZO_MS);
      if (p.ms >= VITA_PEZZO_MS) { p.g.destroy(); this.pezzi.splice(i, 1); }
    }
  }

  distruggi(): void { this.radice.destroy({ children: true }); this.vis.clear(); this.pezzi.length = 0; }
}
