// Input sul canvas della battaglia (00 §3): fionda dall'anello di mira, trascinamento della camera FUORI
// dall'anello, pinch per lo zoom, doppio tocco per ricentrare. Niente trascinamento entro 24 px dai bordi
// laterali (gesto indietro di Android). I tasti dell'HUD sono DOM sopra il canvas: i loro tocchi non
// arrivano qui, quindi si può tenere ▶ con un dito e trascinare la camera con un altro (13 caso 22).
import { BIL } from '../../contenuti/bilanciamento';
import type { Camera } from './camera';
import { dentroAnello, fiondaAMira } from './fionda';

const DOPPIO_TOCCO_MS = 300;
const TOCCO_MAX_PX = 12;
const TOCCO_MAX_MS = 250;

export interface GestoriInput {
  camera: Camera;
  /** posizione in px CSS del pirata attivo se il giocatore può mirare adesso, altrimenti null */
  pirataMirabile(): { x: number; y: number } | null;
  /** nuova mira dalla fionda */
  mira(m: { mezziGradi: number; potenza: number }): void;
  /** la fionda è tenuta (per accendere l'anello) */
  fionda(attiva: boolean): void;
  /** doppio tocco */
  ricentra(): void;
  /** il giocatore ha spostato la camera a mano: smettere di seguire */
  cameraManuale(): void;
}

interface Dito { x: number; y: number; x0: number; y0: number; t0: number }

export class InputBattaglia {
  private dita = new Map<number, Dito>();
  private modo: 'nessuno' | 'fionda' | 'camera' | 'pinch' = 'nessuno';
  private ditoFionda = -1;
  private ultimaMira = '';
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
    const p = this.punto(e);
    this.dita.set(e.pointerId, { x: p.x, y: p.y, x0: p.x, y0: p.y, t0: this.ora() });
    if (this.dita.size === 1) {
      const pirata = this.g.pirataMirabile();
      if (pirata && dentroAnello(p.x, p.y, pirata.x, pirata.y)) {
        this.modo = 'fionda'; this.ditoFionda = e.pointerId; this.ultimaMira = '';
        this.g.fionda(true);
      } else if (p.x < BIL.camera.margineGestoIndietro || p.x > this.g.camera.w - BIL.camera.margineGestoIndietro) {
        this.modo = 'nessuno';
      } else this.modo = 'camera';
    } else if (this.dita.size === 2 && this.modo !== 'fionda') {
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
    if (this.modo === 'fionda' && e.pointerId === this.ditoFionda) {
      const m = fiondaAMira(p.x - d.x0, p.y - d.y0);
      if (!m) return;
      const k = `${m.mezziGradi}|${m.potenza}`;
      if (k !== this.ultimaMira) { this.ultimaMira = k; this.g.mira(m); }
    } else if (this.modo === 'camera') {
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
    if (this.modo === 'fionda' && e.pointerId === this.ditoFionda) {
      // al rilascio la mira resta e NON spara (00 §3)
      this.g.fionda(false);
      this.ditoFionda = -1;
      this.modo = 'nessuno';
      return;
    }
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
    if (this.ditoFionda >= 0) this.g.fionda(false);
    this.via();
  }
}
