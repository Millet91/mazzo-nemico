// Mare animato segnaposto (M0). Forme semplici con i colori di 03 §2, disegnate una volta e animate
// solo con trasformazioni (11 §5): niente ridisegno a ogni frame. Le strisce del mare scorrono come faranno
// quelle definitive (03 §8.2: mare = 3 strisce ripetibili mosse dal codice).
import { Container, Graphics } from 'pixi.js';
import { PALETTE, hex } from '../core/palette';

interface Striscia { g: Graphics; periodo: number; velocita: number; y: number; ampiezza: number; fase: number }
interface Nuvola { g: Graphics; velocita: number; larghezza: number }

function mescola(a: string, b: string, t: number): number {
  const ca = hex(a), cb = hex(b);
  const ch = (s: number) => Math.round(((ca >> s) & 255) * (1 - t) + ((cb >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export class ScenaMare {
  readonly radice = new Container();
  private strisce: Striscia[] = [];
  private nuvole: Nuvola[] = [];
  private nave = new Container();
  private naveBase = { x: 0, y: 0 };
  private w = 0;
  private h = 0;
  private t = 0;

  costruisci(w: number, h: number): void {
    this.w = w; this.h = h;
    this.radice.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.strisce = []; this.nuvole = [];
    const orizzonte = Math.round(h * 0.6);

    // cielo a fasce: da --cielo-alto a --cielo-orizzonte
    const cielo = new Graphics();
    const fasce = 24;
    for (let i = 0; i < fasce; i++) {
      const y0 = Math.floor((orizzonte * i) / fasce);
      const y1 = Math.ceil((orizzonte * (i + 1)) / fasce);
      cielo.rect(0, y0, w, y1 - y0 + 1).fill(mescola(PALETTE.cieloAlto, PALETTE.cieloOrizzonte, i / (fasce - 1)));
    }
    this.radice.addChild(cielo);

    // sole basso a sinistra (luce da sinistra in alto, 03 §1)
    const sole = new Graphics()
      .circle(0, 0, h * 0.16).fill({ color: hex(PALETTE.sole), alpha: 0.25 })
      .circle(0, 0, h * 0.09).fill(hex(PALETTE.sole));
    sole.position.set(w * 0.2, orizzonte - h * 0.06);
    this.radice.addChild(sole);

    // nuvole
    for (let i = 0; i < 4; i++) {
      const s = h * (0.05 + 0.02 * (i % 2));
      const g = new Graphics()
        .ellipse(0, s * 0.35, s * 2.2, s * 0.6).fill(hex(PALETTE.nuvolaOmbra))
        .circle(-s, 0, s * 0.8).circle(0, -s * 0.3, s).circle(s, 0, s * 0.75).fill(0xffffff);
      g.position.set((w * (i + 0.3)) / 4, h * (0.12 + 0.08 * (i % 3)));
      g.alpha = 0.9;
      this.radice.addChild(g);
      this.nuvole.push({ g, velocita: 6 + 4 * (i % 3), larghezza: s * 4.5 });
    }

    // isole lontane
    const isole = new Graphics()
      .ellipse(w * 0.72, orizzonte, w * 0.12, h * 0.07)
      .ellipse(w * 0.86, orizzonte, w * 0.07, h * 0.045)
      .fill({ color: hex(PALETTE.nuvolaOmbra), alpha: 0.7 });
    this.radice.addChild(isole);

    // strisce del mare (dietro → davanti) con la nave tra la seconda e la terza
    const defs = [
      { colore: PALETTE.mareBasso, y: orizzonte, amp: h * 0.008, periodo: w * 0.12, vel: 12 },
      { colore: PALETTE.mareMedio, y: orizzonte + h * 0.1, amp: h * 0.014, periodo: w * 0.2, vel: 22 },
      { colore: PALETTE.mareFondo, y: orizzonte + h * 0.24, amp: h * 0.02, periodo: w * 0.28, vel: 36 },
    ];
    defs.forEach((d, i) => {
      if (i === 2) this.costruisciNave(w * 0.55, orizzonte + h * 0.2, h);
      const g = new Graphics();
      const larghezza = w + d.periodo * 2;
      const passi = Math.ceil(larghezza / 8);
      const punti: number[] = [];
      for (let k = 0; k <= passi; k++) {
        const x = (k * larghezza) / passi;
        punti.push(x, d.amp * Math.sin((x / d.periodo) * Math.PI * 2));
      }
      g.poly([...punti, larghezza, h - d.y + d.amp * 2, 0, h - d.y + d.amp * 2]).fill(hex(d.colore));
      g.moveTo(punti[0], punti[1]);
      for (let k = 2; k < punti.length; k += 2) g.lineTo(punti[k], punti[k + 1]);
      g.stroke({ width: Math.max(2, h * 0.006), color: hex(PALETTE.schiuma), alpha: 0.35 + 0.2 * i });
      this.radice.addChild(g);
      this.strisce.push({ g, periodo: d.periodo, velocita: d.vel, y: d.y, ampiezza: d.amp, fase: i * 1.3 });
    });
    this.aggiorna(0);
  }

  private costruisciNave(x: number, y: number, h: number): void {
    const s = h * 0.1;
    this.nave = new Container();
    const scafo = new Graphics()
      .poly([-s * 1.4, 0, s * 1.4, 0, s, s * 0.5, -s, s * 0.5]).fill(hex(PALETTE.legno))
      .rect(-s * 0.05, -s * 1.6, s * 0.1, s * 1.6).fill(hex(PALETTE.legnoScuro));
    const vela = new Graphics().poly([s * 0.1, -s * 1.5, s * 0.9, -s * 0.3, s * 0.1, -s * 0.2]).fill(hex(PALETTE.pergamena));
    const bandiera = new Graphics().rect(-s * 0.05, -s * 1.85, s * 0.45, s * 0.28).fill(hex(PALETTE.notte));
    this.nave.addChild(scafo, vela, bandiera);
    this.naveBase = { x, y };
    this.radice.addChild(this.nave);
  }

  /** Avanza l'animazione di `deltaMS` (limitato dal chiamante). */
  aggiorna(deltaMS: number): void {
    this.t += deltaMS / 1000;
    const t = this.t;
    for (const s of this.strisce) {
      s.g.x = -((t * s.velocita) % s.periodo) - s.periodo;
      s.g.y = s.y + Math.sin(t * 0.8 + s.fase) * s.ampiezza * 0.6;
    }
    for (const n of this.nuvole) {
      n.g.x += (n.velocita * deltaMS) / 1000;
      if (n.g.x - n.larghezza > this.w) n.g.x = -n.larghezza;
    }
    // la nave ondeggia: ±3° in 4 s (11 §5)
    this.nave.position.set(this.naveBase.x, this.naveBase.y + Math.sin(t * 1.4) * this.h * 0.008);
    this.nave.rotation = (Math.sin((t * Math.PI * 2) / 4) * 3 * Math.PI) / 180;
  }
}
