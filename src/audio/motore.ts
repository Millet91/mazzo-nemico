// Il motore: contesto WebAudio, quattro canali (musica, effetti, voci, tasti) più l'ambiente, due cursori,
// limitatore sull'uscita, musica che si abbassa sui botti ("ducking") e si ovatta in pausa.
//
//   effetti ─┐
//   voci ────┼─► cursore effetti ─┐
//   tasti ───┤                    ├─► limitatore ─► uscita
//   ambiente ┘                    │
//   musica ─► ducking ─► pausa ─► cursore musica
import type { Canale } from './tipi';
import { AUDIO, type IdSuono } from './registro';
import type { Richiesta } from './eventi';
import { ATTENUA, db, INTONAZIONE, ISTANZE_PER_SUONO, PAUSA, POLIFONIA_MAX, VOLUME_AMBIENTE, VOLUME_CANALE, type IdAttenua } from './mix';
import { Polifonia, type Istanza } from './polifonia';
import { campioni, freqDi } from './magazzino';
import type { VoceAudio } from './tipi';

interface Vivo extends Istanza { sorgente: AudioBufferSourceNode; guadagno: GainNode }

export class Motore {
  readonly canali: Record<Canale, GainNode>;
  /** dove si attaccano mare e vento */
  readonly ambiente: GainNode;
  private readonly cursoreMusica: GainNode;
  private readonly cursoreEffetti: GainNode;
  private readonly ducking: GainNode;
  private readonly filtroPausa: BiquadFilterNode;
  private readonly guadagnoPausa: GainNode;
  private readonly buffer = new Map<string, AudioBuffer[]>();
  private readonly polifonia = new Polifonia(POLIFONIA_MAX);
  private readonly cicli = new Map<string, Vivo>();
  private readonly ultimaVariante = new Map<string, number>();

  /** `ctx` è l'AudioContext del gioco; il banco d'ascolto passa un OfflineAudioContext. */
  constructor(readonly ctx: BaseAudioContext, private readonly caso: () => number = Math.random) {
    // limitatore: le reazioni a catena dei barili non devono gracchiare
    const limitatore = ctx.createDynamicsCompressor();
    limitatore.threshold.value = -4;
    limitatore.knee.value = 4;
    limitatore.ratio.value = 20;
    limitatore.attack.value = 0.003;
    limitatore.release.value = 0.15;
    limitatore.connect(ctx.destination);

    this.cursoreMusica = ctx.createGain();
    this.cursoreEffetti = ctx.createGain();
    this.cursoreMusica.connect(limitatore);
    this.cursoreEffetti.connect(limitatore);

    this.filtroPausa = ctx.createBiquadFilter();
    this.filtroPausa.type = 'lowpass';
    this.filtroPausa.frequency.value = 20000;
    this.guadagnoPausa = ctx.createGain();
    this.ducking = ctx.createGain();
    this.ducking.connect(this.filtroPausa).connect(this.guadagnoPausa).connect(this.cursoreMusica);

    const canale = (c: Canale, verso: AudioNode): GainNode => {
      const g = ctx.createGain();
      g.gain.value = VOLUME_CANALE[c];
      g.connect(verso);
      return g;
    };
    this.canali = {
      musica: canale('musica', this.ducking),
      effetti: canale('effetti', this.cursoreEffetti),
      voci: canale('voci', this.cursoreEffetti),
      ui: canale('ui', this.cursoreEffetti),
    };
    this.ambiente = ctx.createGain();
    this.ambiente.gain.value = VOLUME_AMBIENTE;
    this.ambiente.connect(this.cursoreEffetti);
  }

  /** Cursori di Impostazioni, 0..1. La curva è quadratica: a metà cursore si sente "la metà". */
  volume(quale: 'musica' | 'effetti', v: number): void {
    const x = Math.max(0, Math.min(1, v));
    const g = quale === 'musica' ? this.cursoreMusica : this.cursoreEffetti;
    g.gain.setTargetAtTime(x * x, this.ctx.currentTime, 0.02);
  }

  private pronti(id: IdSuono): AudioBuffer[] | null {
    let b = this.buffer.get(id);
    if (b) return b;
    const dati = campioni(id);
    if (!dati) return null;
    const freq = freqDi(AUDIO[id]);
    b = dati.map((d) => {
      const buf = this.ctx.createBuffer(1, d.length, freq);
      buf.getChannelData(0).set(d);
      return buf;
    });
    this.buffer.set(id, b);
    return b;
  }

  /** Mette nel motore un campione vero al posto della sintesi (quando il registro avrà i file di 08). */
  async caricaCampione(id: IdSuono, url: string): Promise<void> {
    const dati = await (await fetch(url)).arrayBuffer();
    this.buffer.set(id, [await this.ctx.decodeAudioData(dati)]);
  }

  /** L'audio sta andando? (un contesto fuori linea, quello del banco d'ascolto, vale sempre come acceso) */
  get acceso(): boolean {
    return this.ctx.state === 'running' || 'startRendering' in this.ctx;
  }

  /** Suona una richiesta. Restituisce false se il suono non è ancora pronto o l'audio è fermo. */
  suona(r: Richiesta): boolean {
    if (!this.acceso) return false;
    const v: VoceAudio = AUDIO[r.id];
    const varianti = this.pronti(r.id);
    if (!v || !varianti?.length) return false;
    if (r.ciclo && this.cicli.has(r.ciclo)) return true;

    // variante: quella chiesta, o una a caso diversa dall'ultima
    let k = r.variante ?? 0;
    if (r.variante === undefined && varianti.length > 1) {
      const ultima = this.ultimaVariante.get(r.id) ?? -1;
      k = Math.floor(this.caso() * varianti.length);
      if (k === ultima) k = (k + 1) % varianti.length;
      this.ultimaVariante.set(r.id, k);
    }
    const buf = varianti[Math.min(k, varianti.length - 1)];
    const t = this.ctx.currentTime + (r.ritardo ?? 0);
    const tasso = (r.intonazione ?? 1) * (v.ciclo || r.variante !== undefined ? 1 : 1 + (this.caso() * 2 - 1) * INTONAZIONE);

    const sorgente = this.ctx.createBufferSource();
    sorgente.buffer = buf;
    sorgente.playbackRate.value = tasso;
    sorgente.loop = !!v.ciclo;
    const guadagno = this.ctx.createGain();
    const vol = v.volume * (r.volume ?? 1);
    if (v.ciclo) {
      guadagno.gain.setValueAtTime(0.0001, t);
      guadagno.gain.exponentialRampToValueAtTime(vol, t + 0.08);
    } else guadagno.gain.value = vol;
    sorgente.connect(guadagno);
    let coda: AudioNode = guadagno;
    if (r.pan && typeof this.ctx.createStereoPanner === 'function') {
      const pan = this.ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, r.pan));
      guadagno.connect(pan);
      coda = pan;
    }
    coda.connect(this.canali[v.canale]);

    const fine = v.ciclo ? Infinity : t + buf.duration / tasso;
    const viva: Vivo = {
      id: r.id, fine, sorgente, guadagno,
      ferma: (quando) => this.spegni(viva, 0.015, quando),
    };
    this.polifonia.entra(viva, v.maxIstanze ?? ISTANZE_PER_SUONO, t);
    sorgente.onended = () => {
      this.polifonia.esce(viva);
      coda.disconnect();
    };
    sorgente.start(t);
    if (r.ciclo) this.cicli.set(r.ciclo, viva);
    if (r.attenua) this.attenua(r.attenua, r.ritardo ?? 0);
    return true;
  }

  private spegni(v: Vivo, dissolvenza: number, quando = 0): void {
    const ora = Math.max(quando, this.ctx.currentTime);
    try {
      v.guadagno.gain.cancelScheduledValues(ora);
      v.guadagno.gain.setTargetAtTime(0, ora, dissolvenza / 3);
      v.sorgente.stop(ora + dissolvenza + 0.02);
    } catch { /* già fermo */ }
  }

  /** Ferma un suono in ciclo; '*' li ferma tutti. */
  fermaCiclo(chiave: string, dissolvenza = 0.1): void {
    const chiavi = chiave === '*' ? [...this.cicli.keys()] : [chiave];
    for (const c of chiavi) {
      const v = this.cicli.get(c);
      if (!v) continue;
      this.cicli.delete(c);
      this.polifonia.esce(v);
      this.spegni(v, dissolvenza);
    }
  }

  get cicliAttivi(): number { return this.cicli.size; }
  get vociAttive(): number { return this.polifonia.quante; }

  /** Abbassa la musica per un attimo (botto, voce, segnale) e la fa risalire da sola. */
  attenua(quale: IdAttenua, ritardo = 0): void {
    const a = ATTENUA[quale];
    const p = this.ducking.gain;
    const t = this.ctx.currentTime + ritardo;
    p.cancelScheduledValues(t);
    p.setTargetAtTime(db(a.db), t, a.attacco / 3);
    p.setTargetAtTime(1, t + a.attacco + 0.12, a.rilascio / 3);
  }

  /** Menu di pausa: la musica resta ma ovattata e più bassa. */
  pausa(attiva: boolean): void {
    const t = this.ctx.currentTime;
    this.filtroPausa.frequency.setTargetAtTime(attiva ? PAUSA.filtroHz : 20000, t, PAUSA.tempo / 3);
    this.guadagnoPausa.gain.setTargetAtTime(attiva ? db(PAUSA.db) : 1, t, PAUSA.tempo / 3);
  }
}
