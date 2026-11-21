// Input sul canvas della battaglia (00 §9.16, doppio joystick): sul canvas resta solo la camera, cioè
// trascinamento con un dito (con un po' di inerzia al rilascio), pinch per lo zoom 0,5-2,0 e doppio tocco per
// tornare sul pirata. Mira, movimento e sparo stanno nei controlli DOM dell'HUD, che stanno sopra il canvas e
// prendono il dito con la pointer capture: un tocco che comincia su una leva o un tasto qui non arriva proprio.
// Niente trascinamento entro 24 px dai bordi laterali (gesto "indietro" di Android).
import { BIL } from '../../contenuti/bilanciamento';
import type { Camera } from './camera';

const DOPPIO_TOCCO_MS = 300;
const TOCCO_MAX_PX = 12;
const TOCCO_MAX_MS = 250;
/** il dito deve fare almeno questi px prima che la vista si muova (un tocco non la sposta) */
const SOGLIA_TRASCINA_PX = 4;
/** inerzia: media mobile della velocità del dito; vale solo se l'ultimo movimento è recente */
const VELOCITA_MEDIA_MS = 50;
const VELOCITA_VECCHIA_MS = 80;
const VELOCITA_MIN = 0.15; // px/ms

export interface GestoriInput {
  camera: Camera;
  /** doppio tocco */
  ricentra(): void;
  /** il giocatore ha preso la camera: 'sposta' = trascinamento, 'zoom' = pinch o rotella (ha scelto lui lo zoom) */
  cameraManuale(tipo: 'sposta' | 'zoom'): void;
}

interface Dito { x: number; y: number; x0: number; y0: number; t0: number; mosso: boolean }

export class InputBattaglia {
  private dita = new Map<number, Dito>();
  private modo: 'nessuno' | 'camera' | 'pinch' = 'nessuno';
  private pinch = { d0: 1, zoom0: 1, mx: 0, my: 0 };
  private ultimoTocco = { t: -1e9, x: 0, y: 0 };
  private vel = { vx: 0, vy: 0, t: 0 };
  private readonly via: () => void;

  constructor(private readonly el: HTMLElement, private readonly g: GestoriInput, private readonly ora: () => number = () => performance.now()) {
    el.style.touchAction = 'none';
    const giu = (e: PointerEvent) => this.giu(e);
    const muovi = (e: PointerEvent) => this.muovi(e);
    const su = (e: PointerEvent) => this.su(e);
    const annulla = (e: PointerEvent) => this.su(e, true);
    const rotella = (e: WheelEvent) => {
      e.preventDefault();
      const p = this.punto(e);
      g.cameraManuale('zoom');
      g.camera.zoomA(g.camera.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), p.x, p.y);
      g.cameraManuale('zoom');
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

  private punto(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  giu(e: PointerEvent): void {
    const p = this.punto(e);
    this.dita.set(e.pointerId, { x: p.x, y: p.y, x0: p.x, y0: p.y, t0: this.ora(), mosso: false });
    if (this.dita.size === 1) {
      // un dito appoggiato ferma la vista che scivola
      if (this.g.camera.scivola) this.g.camera.lancia(0, 0);
      this.vel = { vx: 0, vy: 0, t: this.ora() };
      if (p.x < BIL.camera.margineGestoIndietro || p.x > this.g.camera.w - BIL.camera.margineGestoIndietro) {
        this.modo = 'nessuno';
      } else this.modo = 'camera';
    } else if (this.dita.size === 2) {
      const [a, b] = [...this.dita.values()];
      this.modo = 'pinch';
      this.pinch = { d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), zoom0: this.g.camera.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    }
  }

  muovi(e: PointerEvent): void {
    const d = this.dita.get(e.pointerId);
    if (!d) return;
    const p = this.punto(e);
    const dx = p.x - d.x, dy = p.y - d.y;
    d.x = p.x; d.y = p.y;
    if (this.modo === 'camera') {
      if (!d.mosso && Math.abs(p.x - d.x0) + Math.abs(p.y - d.y0) < SOGLIA_TRASCINA_PX) return;
      d.mosso = true;
      const ora = this.ora();
      const dt = Math.max(1, ora - this.vel.t);
      const k = 1 - Math.exp(-dt / VELOCITA_MEDIA_MS);
      this.vel = { vx: this.vel.vx + (dx / dt - this.vel.vx) * k, vy: this.vel.vy + (dy / dt - this.vel.vy) * k, t: ora };
      this.g.cameraManuale('sposta');
      this.g.camera.trascina(dx, dy);
    } else if (this.modo === 'pinch' && this.dita.size >= 2) {
      const [a, b] = [...this.dita.values()];
      const dist = Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      this.g.cameraManuale('zoom');
      this.g.camera.trascina(mx - this.pinch.mx, my - this.pinch.my);
      this.g.camera.zoomA(this.pinch.zoom0 * (dist / this.pinch.d0), mx, my);
      this.pinch.mx = mx; this.pinch.my = my;
      // lo zoom scelto col pinch è quello a cui la visuale torna da sola
      this.g.cameraManuale('zoom');
    }
  }

  su(e: PointerEvent, annullato = false): void {
    const d = this.dita.get(e.pointerId);
    if (!d) return;
    this.dita.delete(e.pointerId);
    const p = this.punto(e);
    const ora = this.ora();
    const tocco = !annullato && ora - d.t0 < TOCCO_MAX_MS && Math.abs(p.x - d.x0) + Math.abs(p.y - d.y0) < TOCCO_MAX_PX && this.modo !== 'pinch';
    if (tocco) {
      const u = this.ultimoTocco;
      if (ora - u.t < DOPPIO_TOCCO_MS && Math.abs(p.x - u.x) + Math.abs(p.y - u.y) < 40) {
        this.g.ricentra();
        this.ultimoTocco = { t: -1e9, x: 0, y: 0 };
      } else this.ultimoTocco = { t: ora, x: p.x, y: p.y };
    } else if (!annullato && this.modo === 'camera' && d.mosso && this.dita.size === 0 && ora - this.vel.t < VELOCITA_VECCHIA_MS
      && Math.hypot(this.vel.vx, this.vel.vy) >= VELOCITA_MIN) {
      // dito alzato in corsa: la vista scivola ancora un po'
      this.g.camera.lancia(this.vel.vx, this.vel.vy);
    }
    if (this.dita.size === 0) this.modo = 'nessuno';
    else if (this.modo === 'pinch' && this.dita.size === 1) {
      // dal pinch a un dito solo: si continua a trascinare da dove si è, senza scatti e senza inerzia vecchia
      this.modo = 'camera';
      const r = [...this.dita.values()][0];
      r.mosso = true;
      this.vel = { vx: 0, vy: 0, t: ora };
    }
  }

  distruggi(): void {
    this.via();
  }
}
