// Input sul canvas della battaglia (00 §9.16, doppio joystick): sul canvas restano solo la camera,
// cioè trascinamento con un dito, pinch per lo zoom 0,5-2,0 e doppio tocco per ricentrare. Mira e sparo
// stanno nei joystick DOM dell'HUD. Ogni tocco appartiene al controllo dove comincia: i tocchi che partono
// su un joystick o un tasto non sono del canvas (sono elementi DOM sopra, e in più l'HUD può registrare
// le sue zone con impostaZoneControlli). Niente trascinamento entro 24 px dai bordi laterali (gesto indietro).
import { BIL } from '../../contenuti/bilanciamento';
import type { Camera } from './camera';

const DOPPIO_TOCCO_MS = 300;
const TOCCO_MAX_PX = 12;
const TOCCO_MAX_MS = 250;

/** zone dei controlli dell'HUD (coordinate del client): un tocco che comincia lì non è della camera */
let zoneControlli: ((clientX: number, clientY: number) => boolean) | null = null;
export function impostaZoneControlli(f: ((clientX: number, clientY: number) => boolean) | null): void { zoneControlli = f; }

export interface GestoriInput {
  camera: Camera;
  /** doppio tocco */
  ricentra(): void;
  /** il giocatore ha spostato la camera a mano: smettere di seguire */
  cameraManuale(): void;
}

interface Dito { x: number; y: number; x0: number; y0: number; t0: number }

export class InputBattaglia {
  private dita = new Map<number, Dito>();
  private modo: 'nessuno' | 'camera' | 'pinch' = 'nessuno';
  private pinch = { d0: 1, zoom0: 1, mx: 0, my: 0 };
  private ultimoTocco = { t: -1e9, x: 0, y: 0 };
  private readonly via: () => void;

  constructor(private readonly el: HTMLElement, private readonly g: GestoriInput, private readonly ora: () => number = () => performance.now()) {
    el.style.touchAction = 'none';
    const giu = (e: PointerEvent) => this.giu(e);
    const muovi = (e: PointerEvent) => this.muovi(e);
    const su = (e: PointerEvent) => this.su(e);
    const rotella = (e: WheelEvent) => {
      e.preventDefault();
      const p = this.punto(e);
      g.camera.zoomA(g.camera.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), p.x, p.y);
      g.cameraManuale();
    };
    el.addEventListener('pointerdown', giu);
    window.addEventListener('pointermove', muovi);
    window.addEventListener('pointerup', su);
    window.addEventListener('pointercancel', su);
    el.addEventListener('wheel', rotella, { passive: false });
    this.via = () => {
      el.removeEventListener('pointerdown', giu);
      window.removeEventListener('pointermove', muovi);
      window.removeEventListener('pointerup', su);
      window.removeEventListener('pointercancel', su);
      el.removeEventListener('wheel', rotella);
    };
  }

  private punto(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  giu(e: PointerEvent): void {
    if (zoneControlli?.(e.clientX, e.clientY)) return;
    const p = this.punto(e);
    this.dita.set(e.pointerId, { x: p.x, y: p.y, x0: p.x, y0: p.y, t0: this.ora() });
    if (this.dita.size === 1) {
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
      if (Math.abs(p.x - d.x0) + Math.abs(p.y - d.y0) < 4) return;
      this.g.camera.trascina(dx, dy);
      this.g.cameraManuale();
    } else if (this.modo === 'pinch' && this.dita.size >= 2) {
      const [a, b] = [...this.dita.values()];
      const dist = Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      this.g.camera.trascina(mx - this.pinch.mx, my - this.pinch.my);
      this.g.camera.zoomA(this.pinch.zoom0 * (dist / this.pinch.d0), mx, my);
      this.pinch.mx = mx; this.pinch.my = my;
      this.g.cameraManuale();
    }
  }

  su(e: PointerEvent): void {
    const d = this.dita.get(e.pointerId);
    if (!d) return;
    this.dita.delete(e.pointerId);
    const p = this.punto(e);
    const ora = this.ora();
    const tocco = ora - d.t0 < TOCCO_MAX_MS && Math.abs(p.x - d.x0) + Math.abs(p.y - d.y0) < TOCCO_MAX_PX && this.modo !== 'pinch';
    if (tocco) {
      const u = this.ultimoTocco;
      if (ora - u.t < DOPPIO_TOCCO_MS && Math.abs(p.x - u.x) + Math.abs(p.y - u.y) < 40) {
        this.g.ricentra();
        this.ultimoTocco = { t: -1e9, x: 0, y: 0 };
      } else this.ultimoTocco = { t: ora, x: p.x, y: p.y };
    }
    if (this.dita.size === 0) this.modo = 'nessuno';
    else if (this.modo === 'pinch' && this.dita.size === 1) this.modo = 'camera';
  }

  distruggi(): void {
    this.via();
  }
}
