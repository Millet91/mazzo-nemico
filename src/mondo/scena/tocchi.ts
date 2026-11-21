// Tocchi sulla mappa del mondo: trascinare con un dito (con inerzia), pinch e rotella per lo zoom, tocco breve
// per scegliere un'isola. I pannelli della Campagna sono elementi DOM sopra il canvas: un tocco che comincia lì
// qui non arriva. Si ascolta il canvas solo quando la scena del mondo è attiva (in battaglia c'è InputBattaglia).
import type { CameraMondo } from './camera-mondo';

const TOCCO_MAX_PX = 12;
const TOCCO_MAX_MS = 350;
const SOGLIA_TRASCINA_PX = 4;
const VELOCITA_MEDIA_MS = 50;
const VELOCITA_VECCHIA_MS = 80;

export interface GestoriTocchi {
  camera: CameraMondo;
  /** la scena è visibile e accetta tocchi */
  attivo(): boolean;
  /** tocco breve in (x, y) px CSS del canvas */
  tocco(x: number, y: number): void;
  /** il giocatore ha preso la camera (ferma i voli delle animazioni) */
  cameraManuale(): void;
}

interface Dito { x: number; y: number; x0: number; y0: number; t0: number; mosso: boolean }

export class TocchiMondo {
  private dita = new Map<number, Dito>();
  private pinch: { d0: number; s0: number } | null = null;
  private vel = { vx: 0, vy: 0, t: 0 };
  private readonly via: () => void;

  constructor(private readonly el: HTMLElement, private readonly g: GestoriTocchi, private readonly ora: () => number = () => performance.now()) {
    const giu = (e: PointerEvent) => this.giu(e);
    const muovi = (e: PointerEvent) => this.muovi(e);
    const su = (e: PointerEvent) => this.su(e, false);
    const annulla = (e: PointerEvent) => this.su(e, true);
    const rotella = (e: WheelEvent) => {
      if (!g.attivo()) return;
      e.preventDefault();
      const p = this.punto(e);
      g.cameraManuale();
      g.camera.zoomA(g.camera.scala * (e.deltaY < 0 ? 1.12 : 1 / 1.12), p.x, p.y);
    };
    el.addEventListener('pointerdown', giu);
    window.addEventListener('pointermove', muovi);
    window.addEventListener('pointerup', su);
    window.addEventListener('pointercancel', annulla);
    el.addEventListener('wheel', rotella, { passive: false });
    this.via = () => {
      el.removeEventListener('pointerdown', giu);
      window.removeEventListener('pointermove', muovi);
      window.removeEventListener('pointerup', su);
      window.removeEventListener('pointercancel', annulla);
      el.removeEventListener('wheel', rotella);
    };
  }

  distruggi(): void { this.via(); this.dita.clear(); }

  private punto(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private giu(e: PointerEvent): void {
    if (!this.g.attivo()) return;
    const p = this.punto(e);
    this.dita.set(e.pointerId, { ...p, x0: p.x, y0: p.y, t0: this.ora(), mosso: false });
    this.g.camera.ferma();
    if (this.dita.size === 2) {
      const [a, b] = [...this.dita.values()];
      this.pinch = { d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), s0: this.g.camera.scala };
      for (const d of this.dita.values()) d.mosso = true;
      this.g.cameraManuale();
    }
  }

  private muovi(e: PointerEvent): void {
    const d = this.dita.get(e.pointerId);
    if (!d) return;
    const p = this.punto(e);
    const dx = p.x - d.x, dy = p.y - d.y;
    d.x = p.x; d.y = p.y;
    if (this.pinch && this.dita.size >= 2) {
      const [a, b] = [...this.dita.values()];
      const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      this.g.camera.zoomA(this.pinch.s0 * (dist / this.pinch.d0), (a.x + b.x) / 2, (a.y + b.y) / 2);
      this.g.camera.trascina(dx / 2, dy / 2);
      return;
    }
    if (!d.mosso && Math.hypot(p.x - d.x0, p.y - d.y0) < SOGLIA_TRASCINA_PX) return;
    if (!d.mosso) this.g.cameraManuale();
    d.mosso = true;
    this.g.camera.trascina(dx, dy);
    const t = this.ora();
    const dt = Math.max(1, t - this.vel.t);
    const k = Math.min(1, dt / VELOCITA_MEDIA_MS);
    this.vel = { vx: this.vel.vx * (1 - k) + (dx / dt) * k, vy: this.vel.vy * (1 - k) + (dy / dt) * k, t };
  }

  private su(e: PointerEvent, annullato: boolean): void {
    const d = this.dita.get(e.pointerId);
    if (!d) return;
    this.dita.delete(e.pointerId);
    if (this.dita.size < 2) this.pinch = null;
    if (this.dita.size > 0 || annullato) return;
    const t = this.ora();
    const breve = t - d.t0 <= TOCCO_MAX_MS && Math.hypot(d.x - d.x0, d.y - d.y0) <= TOCCO_MAX_PX;
    if (!d.mosso && breve) { this.g.tocco(d.x, d.y); return; }
    if (d.mosso && t - this.vel.t < VELOCITA_VECCHIA_MS) this.g.camera.lancia(this.vel.vx, this.vel.vy);
    this.vel = { vx: 0, vy: 0, t: 0 };
  }
}
