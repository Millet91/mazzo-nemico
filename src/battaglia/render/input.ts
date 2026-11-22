// Input sul canvas della battaglia (comandi v3, docs/tecnica/comandi-v3.md). Sul canvas si fanno due cose:
// - prendere il MIRINO oro attaccato al pirata e trascinarlo (angolo e potenza del tiro);
// - tutto il resto è la camera: trascinamento con un dito (con un po' di inerzia), pinch per lo zoom 0,5-2,0,
//   doppio tocco per tornare sul pirata.
// Ogni dito appartiene a quello che tocca quando si appoggia e non cambia finché non si alza: un dito che parte
// sul mirino mira e basta, uno che parte altrove muove la visuale. I tasti dell'HUD sono elementi DOM sopra il
// canvas: un tocco che comincia lì qui non arriva. Niente trascinamento entro 24 px dai bordi laterali (gesto
// "indietro" di Android).
import { BIL } from '../../contenuti/bilanciamento';
import type { Camera } from './camera';
import { prendeMirino } from './mirino';

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
  /** un dito si è appoggiato sul canvas (ferma la panoramica di inizio turno) */
  dito?(): void;
  /** tocco singolo in (x, y) px CSS: true se l'ha usato qualcuno (freccia di un nemico) e non conta per il doppio tocco */
  tocco?(x: number, y: number): boolean;
  /** il giocatore ha preso la camera: 'sposta' = trascinamento, 'zoom' = pinch o rotella (ha scelto lui lo zoom) */
  cameraManuale(tipo: 'sposta' | 'zoom'): void;
  /** centro del mirino sullo schermo (px CSS del canvas), o null se adesso non si può mirare */
  mirino(): { x: number; y: number } | null;
  /** il dito ha preso il mirino / lo sposta di (dx, dy) px in dtMs / lo lascia */
  miraInizia(): void;
  miraSposta(dx: number, dy: number, dtMs: number): void;
  miraFine(): void;
}

interface Dito { x: number; y: number; x0: number; y0: number; t0: number; mosso: boolean }

export class InputBattaglia {
  private dita = new Map<number, Dito>();
  private modo: 'nessuno' | 'camera' | 'pinch' = 'nessuno';
  private pinch = { d0: 1, zoom0: 1, mx: 0, my: 0 };
  private ultimoTocco = { t: -1e9, x: 0, y: 0 };
  private vel = { vx: 0, vy: 0, t: 0 };
  /** il dito che tiene il mirino (non conta per la camera) */
  private ditoMira: { id: number; x: number; y: number; t: number } | null = null;
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
    this.g.dito?.();
    if (!this.ditoMira && prendeMirino(p.x, p.y, this.g.mirino())) {
      this.ditoMira = { id: e.pointerId, x: p.x, y: p.y, t: this.ora() };
      this.g.miraInizia();
      return;
    }
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
    const m = this.ditoMira;
    if (m && e.pointerId === m.id) {
      const p = this.punto(e), ora = this.ora();
      this.g.miraSposta(p.x - m.x, p.y - m.y, ora - m.t);
      m.x = p.x; m.y = p.y; m.t = ora;
      return;
    }
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
    if (this.ditoMira && e.pointerId === this.ditoMira.id) {
      this.ditoMira = null;
      this.g.miraFine();
      return;
    }
    const d = this.dita.get(e.pointerId);
    if (!d) return;
    this.dita.delete(e.pointerId);
    const p = this.punto(e);
    const ora = this.ora();
    const tocco = !annullato && ora - d.t0 < TOCCO_MAX_MS && Math.abs(p.x - d.x0) + Math.abs(p.y - d.y0) < TOCCO_MAX_PX && this.modo !== 'pinch';
    if (tocco && this.g.tocco?.(p.x, p.y)) {
      this.ultimoTocco = { t: -1e9, x: 0, y: 0 };
    } else if (tocco) {
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

  /** true mentre un dito tiene il mirino */
  get mirando(): boolean { return this.ditoMira !== null; }

  distruggi(): void {
    if (this.ditoMira) { this.ditoMira = null; this.g.miraFine(); }
    this.via();
  }
}
