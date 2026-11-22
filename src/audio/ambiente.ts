// Ambiente sotto la battaglia (studio v2, audio §3.7): risacca, vento legato al vento del turno e ogni tanto un
// gabbiano o un legno che geme. Fa da pavimento al silenzio tra un turno e l'altro. Tutto rumore filtrato: niente file.
import { rumoreBianco } from './sintesi';
import type { Richiesta } from './eventi';

export class Ambiente {
  private uscita: GainNode | null = null;
  private sorgenti: AudioScheduledSourceNode[] = [];
  private gVento: GainNode | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly dest: AudioNode,
    /** per i versi lontani (gabbiano, legno): passano dal motore come gli altri suoni */
    private readonly suona: (r: Richiesta) => void = () => {},
    private readonly caso: () => number = Math.random,
  ) {}

  get attivo(): boolean { return this.uscita !== null; }

  avvia(): void {
    if (this.uscita) return;
    const c = this.ctx, t = c.currentTime;
    const uscita = c.createGain();
    uscita.gain.setValueAtTime(0.0001, t);
    uscita.gain.exponentialRampToValueAtTime(1, t + 1.5);
    uscita.connect(this.dest);
    this.uscita = uscita;

    const rumore = (tasso: number): AudioBufferSourceNode => {
      const s = c.createBufferSource();
      s.buffer = rumoreBianco(c);
      s.loop = true;
      s.playbackRate.value = tasso;
      s.start(t, this.caso());
      this.sorgenti.push(s);
      return s;
    };
    const lento = (hz: number, quanto: number, verso: AudioParam): void => {
      // un'oscillazione lenta non ha bisogno di essere ricalcolata a ogni campione: una volta per blocco costa molto meno
      try { verso.automationRate = 'k-rate'; } catch { /* parametro che non lo permette: resta com'è */ }
      const o = c.createOscillator();
      o.frequency.value = hz;
      const g = c.createGain();
      g.gain.value = quanto;
      o.connect(g).connect(verso);
      o.start(t);
      this.sorgenti.push(o);
    };

    // l'onda: rumore basso che respira ogni 9 secondi circa
    const fOnda = c.createBiquadFilter();
    fOnda.type = 'lowpass';
    fOnda.frequency.value = 650;
    const gOnda = c.createGain();
    gOnda.gain.value = 0.5;
    rumore(1).connect(fOnda).connect(gOnda).connect(uscita);
    lento(0.11, 0.3, gOnda.gain);
    lento(0.11, 180, fOnda.frequency);

    // la schiuma: fruscio alto che arriva un po' dopo l'onda
    const fSchiuma = c.createBiquadFilter();
    fSchiuma.type = 'bandpass';
    fSchiuma.frequency.value = 2800;
    fSchiuma.Q.value = 0.5;
    const gSchiuma = c.createGain();
    gSchiuma.gain.value = 0.1;
    rumore(0.83).connect(fSchiuma).connect(gSchiuma).connect(uscita);
    lento(0.17, 0.07, gSchiuma.gain);

    // il vento: fischio basso, il volume lo decide il vento del turno
    const fVento = c.createBiquadFilter();
    fVento.type = 'bandpass';
    fVento.frequency.value = 520;
    fVento.Q.value = 2.2;
    this.gVento = c.createGain();
    this.gVento.gain.value = 0;
    rumore(0.61).connect(fVento).connect(this.gVento).connect(uscita);
    lento(0.07, 170, fVento.frequency);
    lento(0.23, 60, fVento.frequency);

    this.prossimoVerso();
  }

  /** Forza del vento da 0 (calma) a 1 (massimo del bioma). */
  vento(frazione: number): void {
    if (!this.gVento) return;
    const f = Math.max(0, Math.min(1, frazione));
    this.gVento.gain.setTargetAtTime(f * f * 0.55, this.ctx.currentTime, 0.6);
  }

  private prossimoVerso(): void {
    if (typeof setTimeout !== 'function') return;
    this.timer = setTimeout(() => {
      if (!this.uscita) return;
      this.suona({ id: this.caso() < 0.6 ? 'amb_gabbiano' : 'amb_legno', pan: this.caso() * 1.6 - 0.8, volume: 0.6 + this.caso() * 0.4 });
      this.prossimoVerso();
    }, 7000 + this.caso() * 11000);
  }

  ferma(dissolvenza = 0.8): void {
    const uscita = this.uscita;
    if (!uscita) return;
    clearTimeout(this.timer);
    const t = this.ctx.currentTime;
    uscita.gain.cancelScheduledValues(t);
    uscita.gain.setTargetAtTime(0, t, dissolvenza / 3);
    const sorgenti = this.sorgenti;
    for (const s of sorgenti) { try { s.stop(t + dissolvenza + 0.1); } catch { /* già ferma */ } }
    if (typeof setTimeout === 'function') setTimeout(() => uscita.disconnect(), dissolvenza * 1000 + 300);
    this.sorgenti = [];
    this.uscita = null;
    this.gVento = null;
  }
}
