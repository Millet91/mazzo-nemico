// Motore dell'ondata (GDD §4.2-4.5). Puro e deterministico: dato lo stato della run, la specifica
// dell'ondata e il seed, produce sempre lo stesso esito e lo stesso log di eventi.
// La UI non calcola nulla: riproduce il log (GDD §13.2).

import { Rng } from './rng';
import { P, slotNames } from '../content/config';
import { ENEMIES, type Seme } from '../content/enemies';
import { DEFENSES } from '../content/defenses';
import type { Asso, DeckCard, Ev, EvKind, RunState, Snap, SnapCard, WaveSpec, WC } from './types';

type Src = { kind: 'segno' | 'trucco' | 'ally' | 'burn' | 'enemy' | 'rito'; id: string; slot?: number };
const PLAYER_KINDS = new Set(['segno', 'trucco', 'ally', 'burn', 'rito']);

export interface WaveOutcome {
  events: Ev[];
  dmg: number;
  gained: number;
  ticks: number;
  destroyedUids: number[];
  destroyedNames: string[];
  arrivedNames: string[];
  drawnUids: number[];
  stolen: string[];
  bossDead: boolean;
  bossImpact: number;
  defeat: boolean;
  limit: boolean;
  mvp: string | null;
  dangerous: string | null;
  betrayed: string[];
  maxCombo: number;
  firstImpact: string | null;
  exiled: string[];
  allyLoss: Record<number, number>;
  revealExtra: number;
  why: Record<number, string[]>;
}

export function minDeck(run: RunState): number {
  const d = P.DRAWS[Math.min(3, Math.max(1, run.act))] ?? P.DRAWS[1];
  return d[d.length - 1] + P.MIN_DECK_MARGIN;
}

export function hasPlus(run: RunState, id: string) {
  return run.def.plus.includes(id);
}

/** Costruisce la Coda. Usata sia dalla risoluzione sia dall'anteprima in Preparazione. */
export class WaveSim {
  run: RunState;
  spec: WaveSpec;
  rng: Rng;
  L: number;
  off: number;
  names: string[];
  seg: string[][]; // per Passo di Fila
  contro: Set<number>; // indici di Fila
  lane: (WC | null)[];
  queue: WC[] = [];
  pile: (DeckCard | 'scartina')[] = [];
  events: Ev[] = [];
  t = 0;
  wid = 0;
  asso: Asso | null;
  // statistiche dell'ondata
  dmg = 0;
  gained = 0;
  destroyed: WC[] = [];
  arrived: string[] = [];
  drawn = new Set<number>();
  scart = 0;
  araldi = 0;
  denariDead = 0;
  lastDead: WC | null = null;
  richiamoUsed = false;
  segUse: Record<string, number> = {};
  stolen: string[] = [];
  bossDead = false;
  bossImpact = 0;
  defeat = false;
  limit = false;
  credit: Record<string, number> = {};
  danger: Record<string, number> = {};
  fx: (() => void)[] = [];
  chain = 0;
  tickCombo = 0;
  maxCombo = 0;
  firstImpact: string | null = null;
  exiled: string[] = [];
  skipNext = false;
  silent: boolean;
  revealExtra = 0;
  allyLoss: Record<number, number> = {};
  truccatoTop: DeckCard[] = [];
  all: WC[] = [];
  /** solo per i test: Coda fissa (id di carta = gettone nuovo, numero = uid del mazzo), senza pescata */
  fixed: (string | number)[] | null = null;

  constructor(run: RunState, spec: WaveSpec, seed: number, asso: Asso | null = null, silent = false) {
    this.run = run;
    this.spec = spec;
    this.rng = Rng.from(seed);
    this.L = spec.L;
    this.off = spec.L - 5;
    this.names = slotNames(spec.L);
    this.asso = asso;
    this.silent = silent;
    this.lane = new Array(this.L).fill(null);
    this.seg = [];
    for (let i = 0; i < this.L; i++) this.seg.push([]);
    for (let b = 0; b < 5; b++) this.seg[b + this.off] = [...run.def.segni[b]];
    this.contro = new Set(spec.contro.map((b) => b + this.off));
  }

  // ------------------------------------------------------------- utilità
  has(id: string) {
    return this.run.def.trucchi.includes(id);
  }
  plus(id: string) {
    return hasPlus(this.run, id);
  }
  mk(def: string, uid: number | null, opts: Partial<WC> = {}): WC {
    const d = ENEMIES[def];
    const dc = uid != null ? this.run.deck.find((x) => x.uid === uid) : undefined;
    const ally = dc ? dc.owner === 'baro' : false;
    let kw: Record<string, number> = { ...(d.kw as Record<string, number>) };
    if (ally) {
      kw = {};
      if (d.girata === 'copiaTua' && d.kw.sciame) kw.sciame = 1;
      if (d.girata === 'lento' || d.girata === 'lentoCura2') kw.lento = 1;
    }
    const bonus = dc ? dc.rancore + (dc.corrotto ? 2 : 0) : 0;
    const f = d.forza + (ally ? 0 : bonus);
    const wc: WC = {
      wid: ++this.wid, uid, def, name: d.name, seme: d.seme, forza: f, base: f, kw, cor: kw.corazza ?? 0, burn: 0,
      geloUsed: false, frozen: 0, lt: 0, tier: d.tier, token: d.tier === 't', ally, ritornoUsed: false, malUsed: false,
      night: false, brancoGot: 0, divoraUsed: false, barileUsed: false, allyRitornoUsed: false, why: [], extraLealtaLoss: 0,
      ...opts,
    };
    if (!this.silent) this.all.push(wc);
    return wc;
  }
  snapCard(c: WC): SnapCard {
    const dc = c.uid != null ? this.run.deck.find((x) => x.uid === c.uid) : undefined;
    return {
      wid: c.wid, uid: c.uid, def: c.def, name: c.name, seme: c.seme, forza: c.forza, cor: c.cor, burn: c.burn,
      frozen: c.frozen, ally: c.ally, kw: Object.keys(c.kw).filter((k) => k !== 'corazza' || c.cor > 0), tier: c.tier,
      night: c.night, bottino: dc?.bottino ?? null, rancore: dc?.rancore ?? 0, corrotto: dc?.corrotto ?? false,
    };
  }
  snap(): Snap {
    return {
      lane: this.lane.map((c) => (c ? this.snapCard(c) : null)),
      queue: this.queue.map((c) => this.snapCard(c)),
      lumi: this.run.lumi,
      sp: this.run.sp,
      segni: this.seg.map((s) => [...s]),
    };
  }
  log(k: EvKind, msg: string, extra: Partial<Ev> = {}) {
    if (this.silent && k !== 'defeat') return;
    if (this.events.length > P.MAX_EVENTS) return;
    this.events.push({ t: this.t, k, msg, snap: this.snap(), ...extra });
  }
  slotOf(c: WC): number {
    return this.lane.indexOf(c);
  }
  pname(i: number) {
    return this.names[i] ?? `Passo ${i + 1}`;
  }
  enemyAt(i: number): WC | null {
    if (i < 0 || i >= this.L) return null;
    const c = this.lane[i];
    return c && !c.ally ? c : null;
  }
  isPlayer(src: Src) {
    return PLAYER_KINDS.has(src.kind);
  }
  srcName(src: Src) {
    if (src.kind === 'segno' || src.kind === 'trucco' || src.kind === 'rito') return DEFENSES[src.id]?.name ?? src.id;
    if (src.kind === 'burn') return 'Brucia';
    if (src.kind === 'ally') return ENEMIES[src.id]?.name ?? src.id;
    return ENEMIES[src.id]?.name ?? src.id;
  }
  creditTo(src: Src, n: number) {
    if (src.kind === 'segno' || src.kind === 'trucco' || src.kind === 'rito') this.credit[src.id] = (this.credit[src.id] ?? 0) + n;
  }
  gain(n: number, why: string) {
    if (n <= 0) return;
    this.gained += n;
    this.run.sp += n;
    this.log('coins', `+${n} Spiccioli (${why})`, { n });
  }
  heal(n: number, why: string) {
    const before = this.run.lumi;
    this.run.lumi = Math.min(this.run.maxLumi, this.run.lumi + n);
    if (this.run.lumi > before) this.log('heal', `+${this.run.lumi - before} Lumi (${why})`, { n, important: false });
  }
  loseCoins(n: number, why: string) {
    const before = this.run.sp;
    this.run.sp = Math.max(0, this.run.sp - n);
    if (before > this.run.sp) this.log('coins', `−${before - this.run.sp} Spiccioli (${why})`, { n: -(before - this.run.sp) });
  }
  stonatura(): number {
    let s = 0;
    for (const c of this.lane) {
      if (!c) continue;
      if (!c.ally && c.kw.stonatura) s += 1;
      if (c.ally && ENEMIES[c.def].girata === 'campana') s -= 1;
    }
    return s;
  }

  // ------------------------------------------------------------- danno e morte
  /** Applica un colpo a una carta in Fila. Ritorna true se il colpo ha avuto effetto. */
  damage(c: WC, amount: number, src: Src): boolean {
    const i = this.slotOf(c);
    if (i < 0) {
      this.log('fizzle', `${this.srcName(src)} non ha effetto: ${c.name} non è più in Fila`);
      return false;
    }
    if (src.kind === 'segno') amount -= this.stonatura();
    if (amount <= 0) {
      this.log('fizzle', `${this.srcName(src)} non fa danno (Stonatura)`, { slot: i });
      return false;
    }
    if (c.ally && src.kind !== 'enemy') return false;
    if (this.isPlayer(src) && c.cor > 0) {
      c.cor -= 1;
      this.log('block', `${c.name}: la Corazza para ${this.srcName(src)} (restano ${c.cor})`, { slot: i, wid: c.wid, float: { slot: i, text: '⛨', color: 'white' } });
      return true;
    }
    if (amount === 1 && c.kw.etereo) {
      this.log('fizzle', `${c.name} è Eterea: ignora il colpo da 1 di ${this.srcName(src)}`, { slot: i, wid: c.wid });
      return false;
    }
    c.forza -= amount;
    this.creditTo(src, amount);
    if (src.kind !== 'enemy') this.tickCombo++;
    if (!this.silent) c.why.push(`${this.srcName(src)} −${amount} (${this.pname(i)})`);
    this.log('damage', `${this.srcName(src)}: −${amount} a ${c.name} nel ${this.pname(i)} (Forza ${Math.max(0, c.forza)})`, {
      slot: i, wid: c.wid, src: src.id, n: amount, float: { slot: i, text: `−${amount}`, color: src.kind === 'enemy' ? 'white' : 'gold' },
    });
    if (c.forza <= 0) this.kill(c, src);
    return true;
  }

  /** Distruzione diretta (Taglio, Divora): la Corazza la para se la fonte è tua. */
  destroyCard(c: WC, src: Src) {
    const i = this.slotOf(c);
    if (i < 0) return;
    if (this.isPlayer(src) && c.cor > 0) {
      c.cor -= 1;
      this.log('block', `${c.name}: la Corazza para ${this.srcName(src)}`, { slot: i, wid: c.wid, float: { slot: i, text: '⛨', color: 'white' } });
      return;
    }
    this.tickCombo++;
    this.kill(c, src);
  }

  kill(c: WC, src: Src) {
    const i = this.slotOf(c);
    if (i < 0) return;
    if (c.ally) {
      // un Infiltrato ferito a morte (Esplosivo) torna nel mazzo e perde 1 Lealtà in più
      this.lane[i] = null;
      if (c.uid != null) this.allyLoss[c.uid] = (this.allyLoss[c.uid] ?? 0) + 1;
      this.log('destroy', `${c.name} (tuo Patto) cade e torna nel mazzo: −1 Lealtà`, { slot: i, wid: c.wid, important: true });
      return;
    }
    if (c.kw.tenace) {
      delete c.kw.tenace;
      c.forza = 1;
      this.log('ability', `${c.name} è Tenace: resta in piedi a Forza 1`, { slot: i, wid: c.wid });
      return;
    }
    this.lane[i] = null;
    this.creditTo(src, 2);
    if (c.tier === 'b') {
      this.bossDead = true;
      this.log('destroy', `${c.name} è distrutto!`, { slot: i, wid: c.wid, important: true });
      this.gain(P.KILL_BOSS, 'carta del Mazziere');
    } else if (c.tier === 'e') {
      this.log('destroy', `${c.name} è distrutta!`, { slot: i, wid: c.wid, important: true });
      this.gain(P.KILL_ELITE, 'élite');
    } else {
      this.log('destroy', `${c.name} è distrutta (${this.srcName(src)})`, { slot: i, wid: c.wid });
      if (!c.token) this.gain(this.spec.processione && c.seme === 'Denari' ? P.KILL * 2 : P.KILL, 'sventura distrutta');
    }
    this.destroyed.push(c);
    if (c.seme === 'Denari') this.denariDead++;
    if (!c.token && c.tier === 'n') this.lastDead = c;
    // il Ladro distrutto restituisce il bottino
    if (c.uid != null) this.returnLoot(c.uid);
    // Segni del Passo che pagano
    const segs = this.contro.has(i) ? [] : this.seg[i];
    for (const s of segs) {
      if (s === 'tagliola') this.gain(1, 'Tagliola');
      if (s === 'moneta' && c.seme === 'Denari') this.gain(2, 'Moneta Falsa');
    }
    // effetti "alla morte", poi Segni che reagiscono, in coda FIFO
    if (c.kw.ritorno && !c.ritornoUsed) {
      this.fx.push(() => {
        const n = this.mk(c.def, c.uid, { ritornoUsed: true, token: c.token, tier: c.tier });
        if (c.tier === 'e') n.forza = n.base = ENEMIES[c.def].forza;
        this.queue.push(n);
        this.log('ability', `${c.name} ha Ritorno: torna in fondo alla Coda`, { wid: n.wid });
      });
    }
    if (c.kw.sobilla) {
      const n = c.kw.sobilla;
      this.fx.push(() => {
        const f = this.enemyAt(i + 1);
        if (!f) return this.log('fizzle', `Sobilla di ${c.name} si perde: nessuno davanti`);
        f.forza += n;
        this.log('ability', `${c.name} sobilla ${f.name}: +${n} Forza`, { slot: i + 1, wid: f.wid, float: { slot: i + 1, text: `+${n}`, color: 'crimson' } });
      });
    }
    if (c.kw.corvi) {
      const n = c.kw.corvi;
      this.fx.push(() => {
        for (let k = 0; k < n; k++) this.queue.unshift(this.mk('corvo', null));
        this.log('ability', `Dallo Spaventapasseri si alzano ${n} Corvi`, {});
      });
    }
    if (c.kw.richiamo && !this.richiamoUsed) {
      this.fx.push(() => {
        const ld = this.lastDead && this.lastDead !== c ? this.lastDead : this.destroyed.filter((x) => x !== c && !x.token && x.tier === 'n').pop();
        if (!ld) return this.log('fizzle', 'Richiamo: nessuna carta da richiamare');
        this.richiamoUsed = true;
        this.queue.unshift(this.mk(ld.def, ld.uid));
        this.log('ability', `${c.name} richiama ${ld.name} in testa alla Coda`, {});
      });
    }
    if (c.kw.esplosivo) {
      const n = c.kw.esplosivo;
      this.fx.push(() => {
        this.log('ability', `${c.name} esplode!`, { slot: i, important: true });
        for (const j of [i + 1, i - 1]) {
          const t = j >= 0 && j < this.L ? this.lane[j] : null;
          if (t) this.damage(t, n, { kind: 'enemy', id: c.def });
        }
      });
    }
    if (!this.contro.has(i)) {
      for (const s of this.seg[i]) {
        if (s === 'catena') {
          const n = this.plus('catena') ? 3 : 2;
          this.fx.push(() => {
            const b = this.enemyAt(i - 1);
            if (!b) return this.log('fizzle', 'Catena: nessuna carta nel Passo dietro');
            this.damage(b, n, { kind: 'segno', id: 'catena', slot: i });
          });
        }
        if (s === 'campanaMorto') this.fx.push(() => this.campanaMorto(i));
      }
    }
    if (this.plus('campanaMorto')) {
      for (const j of [i - 1, i + 1]) {
        if (j >= 0 && j < this.L && !this.contro.has(j) && this.seg[j].includes('campanaMorto')) this.fx.push(() => this.campanaMorto(j));
      }
    }
  }

  campanaMorto(i: number) {
    this.log('segno', `Campana a Morto suona nel ${this.pname(i)}`, { slot: i, src: 'campanaMorto' });
    for (let j = this.L - 1; j >= 0; j--) {
      const e = this.enemyAt(j);
      if (e) this.damage(e, 1, { kind: 'segno', id: 'campanaMorto', slot: i });
    }
  }

  returnLoot(uid: number) {
    const dc = this.run.deck.find((x) => x.uid === uid);
    if (dc && dc.bottino) {
      const s = dc.bottino;
      dc.bottino = null;
      this.run.def.deposito.push(s);
      this.run.def.stolen = this.run.def.stolen.filter((x) => !(x.holder === uid && x.segno === s));
      this.log('info', `Riprendi il Segno ${DEFENSES[s].name}: torna nel Deposito`, { important: true });
    }
  }

  flush() {
    let n = 0;
    while (this.fx.length) {
      const f = this.fx.shift()!;
      n++;
      if (n > P.CHAIN) {
        this.fx.length = 0;
        this.log('info', 'La catena di effetti si interrompe (limite 16)');
        break;
      }
      f();
    }
  }

  // ------------------------------------------------------------- pescata
  buildQueue() {
    const run = this.run;
    const spec = this.spec;
    const rng = this.rng;
    // 1. mescola il mazzo intero
    this.pile = rng.shuffle([...run.deck]);
    if (this.fixed) {
      this.queue = this.fixed.map((x) => {
        if (typeof x === 'number') { const dc = run.deck.find((d) => d.uid === x)!; this.pile = this.pile.filter((p) => p !== dc); this.drawn.add(x); return this.mk(dc.def, x); }
        return this.mk(x, null);
      });
      if (spec.boss) this.queue.push(this.mk(spec.boss, null));
      return;
    }
    // 2. Trucchi prima della pescata, nell'ordine dei posti
    for (const t of run.def.trucchi) {
      if (t === 'scartine') {
        const n = this.plus('scartine') ? 3 : 2;
        for (let k = 0; k < n; k++) this.pile.splice(rng.int(this.pile.length + 1), 0, 'scartina');
      }
      if (t === 'truccato') {
        const max = this.plus('truccato') ? 3 : 2;
        const top = this.pile.slice(0, 5).filter((x): x is DeckCard => x !== 'scartina' && x.owner === 'fato');
        this.truccatoTop = top;
        let chosen: DeckCard[];
        if (run.def.truccato && run.def.truccato.length) chosen = top.filter((x) => run.def.truccato!.includes(x.uid)).slice(0, max);
        else chosen = [...top].sort((a, b) => cardForza(b) - cardForza(a) || a.uid - b.uid).slice(0, max);
        for (const x of chosen) {
          this.pile.splice(this.pile.indexOf(x), 1);
          this.pile.push(x);
        }
      }
    }
    // 3. pesca N carte
    let n = spec.draws + spec.extraDraw;
    if (this.has('censura')) n -= this.plus('censura') ? 2 : 1;
    if (this.has('avara')) n -= this.plus('avara') ? 4 : 3;
    n = Math.max(1, n);
    let setacciate = 0;
    const setaccio = this.has('setaccio');
    const q: WC[] = [];
    for (let k = 0; k < n; k++) {
      const x = this.pile.shift();
      if (x === undefined) {
        const dsp = this.mk('disperazione', null);
        dsp.forza = dsp.base = Math.max(1, spec.rintocco);
        dsp.why.push('mazzo esaurito');
        q.push(dsp);
        continue;
      }
      if (x === 'scartina') {
        this.scart++;
        const s = this.mk('scartina', null);
        s.why.push(`pescata ${k + 1}ª (Scartine)`);
        q.push(s);
        continue;
      }
      this.drawn.add(x.uid);
      const c = this.mk(x.def, x.uid);
      c.why.push(`pescata ${k + 1}ª`);
      if (setaccio && setacciate < 2 && c.seme === 'Bastoni' && !c.ally) {
        setacciate++;
        if (this.has('contrabbando')) this.gain(this.plus('contrabbando') ? 3 : 2, 'Contrabbando');
        this.log('info', `Setaccio scarta ${c.name}`, { src: 'setaccio' });
        this.creditTo({ kind: 'trucco', id: 'setaccio' }, 2);
        continue;
      }
      q.push(c);
    }
    if (spec.processione) {
      const den = ['gazza', 'banditore', 'sobillatore', 'creditori', 'esattore'].filter((id) => ENEMIES[id].act <= Math.max(1, spec.act));
      for (let k = 0; k < 2; k++) {
        const c = this.mk(rng.pick(den), null);
        c.why.push('la Processione');
        q.push(c);
      }
    }
    for (const c of q) {
      if (c.ally || c.tier === 't') continue;
      if (setaccio && setacciate >= 2 && !this.plus('setaccio') && c.seme === 'Bastoni') {
        c.forza++; c.base++; c.why.push('Setaccio: +1');
      }
      if (this.has('avara')) { c.forza++; c.base++; c.why.push('Pescata Avara: +1'); }
      if (this.has('bavaglio') && c.kw.araldo) {
        const b = this.plus('bavaglio') ? 1 : 2;
        c.forza += b; c.base += b; c.why.push(`Bavaglio: +${b}`);
      }
    }
    // 4. élite a metà Coda
    if (spec.elite) {
      const el = this.mk(spec.elite, null);
      el.cor += spec.eliteArmor;
      el.kw.corazza = el.cor;
      el.why.push('élite: entra a metà Coda');
      q.splice(Math.floor(q.length / 2), 0, el);
    }
    // 5. Rito
    const ritoId = spec.bossRito ?? run.def.rito?.id ?? null;
    let sorted = this.applyRito(q, ritoId, spec.bossRito ? undefined : run.def.rito?.seme);
    if (spec.bossRito && spec.bossRitoBonus) for (const c of sorted) if (!c.ally) c.forza += spec.bossRitoBonus;
    if (ritoId && !spec.bossRito && this.plus(ritoId)) {
      const f = sorted.find((c) => !c.ally);
      if (f) { f.forza = Math.max(1, f.forza - 1); f.why.push(`${DEFENSES[ritoId].name}+: −1`); }
    }
    sorted.forEach((c, k) => {
      if (ritoId) c.why.push(`${spec.bossRito ? 'Rito imposto' : 'Rito'} ${DEFENSES[ritoId].name}: posizione ${k + 1}`);
    });
    // 6. Segnare, carte del Mazziere, carta del Mazziere per ultima
    if (this.has('segnare') && run.def.marked.length) {
      const m = sorted.filter((c) => c.uid != null && run.def.marked.includes(c.uid));
      sorted = sorted.filter((c) => !m.includes(c)).concat(m);
      for (const c of m) c.why.push('Segnare: entra per ultima');
    }
    for (const uid of spec.carry) {
      const dc = run.deck.find((x) => x.uid === uid);
      if (!dc) continue;
      const c = this.mk(dc.def, dc.uid);
      if (spec.carryBonus) { c.forza += spec.carryBonus; c.base += spec.carryBonus; }
      c.why.push('Tutto torna: il Sagrestano la rimette in Coda');
      this.drawn.add(uid);
      sorted.push(c);
    }
    if (spec.boss) {
      const b = this.mk(spec.boss, null);
      b.why.push('la carta del Mazziere entra per ultima');
      sorted.push(b);
    }
    // 7. Esca
    if (this.has('esca')) {
      const f = sorted.find((c) => !c.ally && c.tier !== 'b');
      if (f) {
        const n = this.plus('esca') ? 3 : 2;
        if (f.cor > 0) { f.cor--; f.why.push('Esca parata dalla Corazza'); }
        else { f.forza = Math.max(1, f.forza - n); f.why.push(`Esca: −${n}`); this.creditTo({ kind: 'trucco', id: 'esca' }, n); }
      }
    }
    this.queue = sorted;
  }

  applyRito(q: WC[], rito: string | null, seme?: Seme): WC[] {
    if (!rito) return q;
    const idx = new Map(q.map((c, k) => [c, k]));
    const stable = (key: (c: WC) => number) => [...q].sort((a, b) => key(a) - key(b) || idx.get(a)! - idx.get(b)!);
    switch (rito) {
      case 'scala': return stable((c) => c.forza);
      case 'discesa': return stable((c) => -c.forza);
      case 'avanguardia': return stable((c) => (c.seme === seme ? 0 : 1));
      case 'retroguardia': return stable((c) => (c.seme === seme ? 1 : 0));
      case 'raggruppa': {
        const order: string[] = [];
        for (const c of q) if (!order.includes(c.seme)) order.push(c.seme);
        return stable((c) => order.indexOf(c.seme));
      }
      case 'alternanza': {
        const srt = stable((c) => c.forza);
        const out: WC[] = [];
        while (srt.length) {
          out.push(srt.pop()!);
          if (srt.length) out.push(srt.shift()!);
        }
        return out;
      }
      case 'riserva': {
        const en = q.filter((c) => !c.ally && c.tier === 'n' && c.uid != null);
        if (!en.length) return q;
        let m = en[0];
        for (const c of en) if (c.forza > m.forza) m = c;
        const dc = this.run.deck.find((x) => x.uid === m.uid)!;
        dc.rancore = Math.min(2, dc.rancore + 1);
        this.log('rimando', `Riserva: ${m.name} non entra e torna in fondo al mazzo (Rancore ${dc.rancore})`, { src: 'riserva' });
        this.creditTo({ kind: 'rito', id: 'riserva' }, m.forza);
        if (this.has('contrabbando')) this.gain(this.plus('contrabbando') ? 3 : 2, 'Contrabbando');
        return q.filter((c) => c !== m);
      }
      default: return q;
    }
  }

  // ------------------------------------------------------------- tick
  advance(extra: boolean) {
    const moves: string[] = [];
    for (let i = this.L - 1; i >= 0; i--) {
      const c = this.lane[i];
      if (!c) continue;
      if (extra && c.ally) continue;
      if (!extra && this.asso && this.asso.kind === 'trattieni' && this.asso.tick === this.t && this.asso.slot === i) continue;
      if (!extra) {
        if (c.frozen > 0) { c.frozen--; continue; }
        let lento = !!c.kw.lento;
        if (!c.ally && !lento) {
          for (let j = i + 1; j < this.L; j++) {
            const a = this.lane[j];
            if (a && a.ally && ENEMIES[a.def].girata === 'orologio') lento = true;
          }
        }
        if (lento) {
          c.lt ^= 1;
          if (c.lt === 1) continue;
        }
      }
      let rap = false;
      if (!extra && !c.ally) {
        rap = !!c.kw.rapido;
        if (!rap) for (let j = 0; j < i; j++) { const f = this.lane[j]; if (f && !f.ally && f.kw.fretta) rap = true; }
      }
      const free = (x: number) => x >= this.L || this.lane[x] === null;
      let t = i;
      if (rap && free(i + 1) && free(i + 2)) t = i + 2;
      else if (free(i + 1)) t = i + 1;
      if (t === i) continue;
      this.lane[i] = null;
      if (t >= this.L) {
        this.impact(c, i);
        if (this.defeat) return;
      } else {
        this.lane[t] = c;
        moves.push(`${c.name} → ${this.pname(t)}`);
        if (c.ally && t === this.L - 1 && ENEMIES[c.def].girata === 'barile' && !c.barileUsed) {
          c.barileUsed = true;
          this.log('ability', `${c.name} (tuo) arriva all'Uscio: −2 a tutte le carte nemiche`, { slot: t, important: true });
          for (let j = this.L - 1; j >= 0; j--) { const e = this.enemyAt(j); if (e) this.damage(e, 2, { kind: 'ally', id: c.def }); }
          this.flush();
        }
      }
    }
    if (moves.length) this.log('move', extra ? 'La Corrente spinge le carte' : 'Avanzano le carte', { important: false });
  }

  impact(c: WC, i: number) {
    if (c.ally) {
      const g = ENEMIES[c.def].girata;
      this.log('impact', `${c.name} (tuo) esce dall'Uscio`, { slot: i, wid: c.wid });
      if (g === 'borseggio') this.gain(4, 'Borseggio');
      else if (g === 'creditori') this.gain(Math.min(3, Math.floor(this.run.sp / 10)), 'Creditori');
      else if (g === 'esattore') this.gain(5, 'Esattore');
      else if (g === 'lentoCura2') this.heal(2, c.name);
      else this.heal(1, c.name);
      if (g === 'ritornoAlleato' && !c.allyRitornoUsed) {
        const n = this.mk(c.def, c.uid, { allyRitornoUsed: true });
        this.queue.push(n);
        this.log('ability', `${c.name} torna in fondo alla Coda`, { wid: n.wid });
      }
      return;
    }
    let d = c.forza + (c.kw.esplosivo ?? 0);
    if (c.kw.innocua) d = 0;
    const uscio = this.L - 1;
    if (i === uscio && !this.contro.has(uscio) && this.seg[uscio].includes('bastione')) {
      const b = this.plus('bastione') ? 2 : 1;
      d -= b;
      this.creditTo({ kind: 'segno', id: 'bastione' }, Math.min(b, Math.max(0, c.forza)));
    }
    d = Math.max(0, d);
    const before = this.run.lumi;
    this.run.lumi = Math.max(0, this.run.lumi - d);
    this.dmg += before - this.run.lumi;
    this.danger[c.name] = (this.danger[c.name] ?? 0) + d;
    if (!this.firstImpact && d > 0) this.firstImpact = c.name;
    this.arrived.push(c.name);
    if (c.tier === 'b') this.bossImpact = d;
    this.log('impact', `${c.name} arriva alla Soglia: −${d} Lumi`, {
      slot: i, wid: c.wid, n: d, important: true, float: { slot: i, text: `−${d} 🕯`, color: 'crimson' },
    });
    if (c.kw.ladro) this.steal(c);
    if (c.kw.esazione) this.loseCoins(c.kw.esazione, `Esazione di ${c.name}`);
    if (this.run.lumi <= 0) {
      this.defeat = true;
      this.log('defeat', 'L’ultimo Lume si spegne.', { important: true });
    }
  }

  steal(c: WC) {
    const segni = this.run.def.segni;
    for (let b = 4; b >= 0; b--) {
      if (segni[b].length) {
        const s = segni[b].pop()!;
        const li = b + this.off;
        const k = this.seg[li].lastIndexOf(s);
        if (k >= 0) this.seg[li].splice(k, 1);
        const holder = c.uid;
        if (holder != null) {
          const dc = this.run.deck.find((x) => x.uid === holder);
          if (dc) {
            if (dc.bottino) { this.run.def.stolen.push({ segno: dc.bottino, holder: null }); }
            dc.bottino = s;
          }
        }
        this.run.def.stolen.push({ segno: s, holder });
        this.stolen.push(DEFENSES[s].name);
        this.log('steal', `${c.name} ruba il Segno ${DEFENSES[s].name} dal ${this.pname(li)}!`, { slot: li, important: true });
        return;
      }
    }
    this.loseCoins(3, `${c.name} non trova Segni da rubare`);
  }

  enter(c: WC) {
    this.lane[0] = c;
    if (!c.ally) {
      if ((c.tier === 'n' || (c.tier === 't' && c.def !== 'scartina')) && !c.night && this.spec.nightBonus > 0) {
        c.night = true;
        c.forza += this.spec.nightBonus;
        c.why.push(`bonus della notte +${this.spec.nightBonus}`);
      }
    }
    this.log('enter', `${c.name}${c.ally ? ' (tuo Patto)' : ''} entra nel ${this.pname(0)}`, { slot: 0, wid: c.wid, important: c.tier === 'b' || c.tier === 'e' });
    if (c.kw.sciame) {
      const cp = this.mk(c.def, null, { token: true, tier: 't' });
      delete cp.kw.sciame;
      cp.forza = cp.base = ENEMIES[c.def].forza;
      cp.name = `Copia di ${c.name}`;
      cp.ally = c.ally;
      if (c.ally) cp.kw = {};
      cp.why.push(`Sciame di ${c.name}`);
      this.queue.unshift(cp);
      this.log('copy', `Sciame: una Copia${c.ally ? ' (tua)' : ''} va in testa alla Coda`, { wid: cp.wid });
    }
    if (c.ally) return this.allyEnter(c);
    if (c.kw.araldo) {
      if (this.has('bavaglio')) this.log('info', `Bavaglio: ${c.name} tace`, { src: 'bavaglio' });
      else if (this.araldi >= P.ARALDI_MAX) this.log('info', `${c.name}: gli Araldi hanno già pescato 2 volte`);
      else {
        this.araldi++;
        const x = this.pile.shift();
        if (x === undefined) this.log('fizzle', `${c.name} non trova carte da pescare`);
        else {
          let n: WC;
          if (x === 'scartina') { this.scart++; n = this.mk('scartina', null); }
          else { this.drawn.add(x.uid); n = this.mk(x.def, x.uid); }
          n.why.push(`pescata dall'Araldo ${c.name}`);
          this.queue.unshift(n);
          this.log('herald', `${c.name} annuncia: ${n.name} in testa alla Coda`, { wid: n.wid, important: true });
        }
      }
    }
    if (c.kw.ingordo && this.scart) {
      c.forza += this.scart;
      this.log('ability', `${c.name} mangia le Scartine: +${this.scart} Forza`, { slot: 0, wid: c.wid });
    }
    if (c.kw.spinta) {
      const s = this.lane[1];
      if (s && this.L > 2 && !this.lane[2]) {
        this.lane[2] = s;
        this.lane[1] = null;
        this.log('ability', `${c.name} spinge ${s.name} nel ${this.pname(2)}`, { slot: 2 });
      }
    }
    if (c.kw.lamento) {
      for (const x of this.lane) if (x && !x.ally) x.forza += 1;
      this.log('ability', `${c.name} intona il lamento: +1 Forza a tutte le sventure in Fila`, { important: true });
    }
    if (c.kw.riscossione) {
      const n = Math.min(3, Math.floor(this.run.sp / 10));
      if (n) { c.forza += n; this.log('ability', `${c.name} riscuote: +${n} Forza`, { slot: 0, wid: c.wid }); }
    }
    if (c.kw.furia) {
      const n = Math.min(5, this.denariDead);
      if (n) { c.forza += n; this.log('ability', `${c.name} è furiosa: +${n} Forza`, { slot: 0, wid: c.wid }); }
    }
    if (c.kw.profezia && this.queue.length > 1) {
      this.rng.shuffle(this.queue);
      this.log('ability', `${c.name} profetizza: la Coda è rimescolata, il tuo Rito non vale più`, { important: true });
    }
    if (c.kw.imitatore) {
      const s = this.lane[1];
      if (s) {
        for (const [k, v] of Object.entries(s.kw)) if (k !== 'imitatore' && !(k in c.kw)) c.kw[k] = v;
        if (s.kw.corazza && !c.cor) c.cor = s.kw.corazza;
        this.log('ability', `${c.name} copia le abilità di ${s.name}`, { slot: 0, important: true });
      }
    }
  }

  allyEnter(c: WC) {
    const g = ENEMIES[c.def].girata;
    const firstEnemyInQueue = () => this.queue.find((x) => !x.ally && x.tier !== 'b');
    if (g === 'staffetta') {
      const f = firstEnemyInQueue();
      if (f) { this.queue.splice(this.queue.indexOf(f), 1); this.queue.push(f); this.log('ability', `${c.name} (tuo): ${f.name} va in fondo alla Coda`); }
    } else if (g === 'ingordoAlleato') {
      const s = this.queue.filter((x) => x.def === 'scartina');
      if (s.length) {
        this.queue = this.queue.filter((x) => x.def !== 'scartina');
        this.heal(s.length, `${c.name} mangia le Scartine`);
      }
    } else if (g === 'divora' && !c.divoraUsed) {
      c.divoraUsed = true;
      const f = this.enemyAt(1);
      if (f && f.forza <= 3 && f.tier !== 'b') { this.log('ability', `${c.name} (tuo) divora ${f.name}`, { slot: 1, important: true }); this.destroyCard(f, { kind: 'ally', id: c.def }); }
    } else if (g === 'falsoAnnuncio') {
      const f = firstEnemyInQueue();
      if (f) { this.queue.splice(this.queue.indexOf(f), 1); this.log('ability', `${c.name} (tuo): ${f.name} torna nel mazzo`); }
    } else if (g === 'sobillaAlleato') {
      const f = firstEnemyInQueue();
      if (f) { f.forza = Math.max(1, f.forza - 2); this.log('ability', `${c.name} (tuo): ${f.name} perde 2 Forza in Coda`); }
    } else if (g === 'carica') {
      const f = this.enemyAt(1);
      if (f) this.damage(f, 3, { kind: 'ally', id: c.def });
    } else if (g === 'nebbia') {
      this.revealExtra = Math.max(this.revealExtra, 4);
      this.log('info', `${c.name} (tua) svela le prime 4 carte della Coda`);
    } else if (g === 'prefica') {
      for (let j = this.L - 1; j >= 0; j--) { const e = this.enemyAt(j); if (e) this.damage(e, 1, { kind: 'ally', id: c.def }); }
    } else if (g === 'profeta') {
      const rito = this.run.def.rito;
      if (rito) { this.queue = this.applyRito(this.queue, rito.id, rito.seme); this.log('ability', `${c.name} (tuo) riapplica il Rito alla Coda`); }
    }
    this.flush();
  }

  segniPhase() {
    for (let i = this.L - 1; i >= 0; i--) {
      if (this.contro.has(i)) continue;
      const list = this.seg[i];
      for (let k = 0; k < list.length; k++) {
        const c = this.lane[i];
        if (!c || c.ally) break;
        if (c.kw.silenzio) {
          this.log('silence', `Silenzio: i Segni del ${this.pname(i)} tacciono`, { slot: i });
          break;
        }
        const f = this.lane[i + 1];
        if (f && !f.ally && f.kw.velo) {
          this.log('silence', `Velo: ${f.name} nasconde ${c.name}`, { slot: i });
          break;
        }
        this.applySegno(list[k], i, c);
        this.flush();
        if (this.defeat) return;
      }
    }
  }

  useKey(s: string, i: number) {
    return `${s}@${i}`;
  }

  applySegno(s: string, i: number, c: WC) {
    const pl = this.plus(s);
    const src: Src = { kind: 'segno', id: s, slot: i };
    const nm = DEFENSES[s].name;
    switch (s) {
      case 'brace': this.damage(c, pl ? 3 : 2, src); break;
      case 'tagliola': this.damage(c, pl ? 2 : 1, src); break;
      case 'spina':
        if (c.cor > 0) { c.cor--; this.log('segno', `Spina toglie una Corazza a ${c.name}`, { slot: i, src: s }); }
        this.damage(c, pl ? 2 : 1, src);
        break;
      case 'taglio':
        if (c.forza <= (pl ? 3 : 2) && c.tier !== 'b') { this.log('segno', `Taglio su ${c.name}`, { slot: i, src: s }); this.destroyCard(c, src); }
        break;
      case 'gelo':
        if (!c.geloUsed) {
          c.geloUsed = true;
          if (c.cor > 0) { c.cor--; this.log('block', `${c.name}: la Corazza para il Gelo`, { slot: i }); }
          else { c.frozen = pl ? 2 : 1; this.log('freeze', `Gelo: ${c.name} non avanzerà`, { slot: i, src: s, float: { slot: i, text: '❄', color: 'white' } }); this.creditTo(src, 2); }
        }
        break;
      case 'lanterna':
        if (c.kw.etereo) { delete c.kw.etereo; this.log('segno', `La Lanterna toglie Etereo a ${c.name}`, { slot: i, src: s }); }
        this.damage(c, c.seme === 'Coppe' ? (pl ? 4 : 3) : 1, src);
        break;
      case 'trappola':
        if (c.seme === 'Bastoni') { delete c.kw.rapido; this.damage(c, pl ? 4 : 3, src); }
        break;
      case 'calamita':
        if (c.cor > 0) { c.cor = 0; delete c.kw.corazza; this.log('segno', `Calamita strappa la Corazza a ${c.name}`, { slot: i, src: s }); }
        if (c.seme === 'Spade') this.damage(c, pl ? 4 : 3, src);
        break;
      case 'moneta':
        if (c.seme === 'Denari') this.damage(c, pl ? 3 : 2, src);
        break;
      case 'rimando': {
        const key = this.useKey(s, i);
        const max = pl ? 2 : 1;
        if ((this.segUse[key] ?? 0) >= max || c.tier === 'b') break;
        this.segUse[key] = (this.segUse[key] ?? 0) + 1;
        if (c.cor > 0) { c.cor--; this.log('block', `${c.name}: la Corazza para il Rimando`, { slot: i }); break; }
        this.lane[i] = null;
        if (c.uid != null) {
          const dc = this.run.deck.find((x) => x.uid === c.uid);
          if (dc) dc.rancore = Math.min(2, dc.rancore + 1);
        }
        this.creditTo(src, Math.max(1, c.forza));
        this.log('rimando', `Rimando: ${c.name} torna in fondo al mazzo${c.uid != null ? ' con Rancore' : ''}`, { slot: i, src: s, important: true });
        if (this.has('contrabbando')) this.gain(this.plus('contrabbando') ? 3 : 2, 'Contrabbando');
        break;
      }
      case 'malocchio':
        if (!c.malUsed) {
          c.malUsed = true;
          if (c.cor > 0 && !pl) { c.cor--; this.log('block', `${c.name}: la Corazza para il Malocchio`, { slot: i }); }
          else { c.kw = {}; c.cor = 0; this.log('segno', `Malocchio: ${c.name} perde tutte le abilità`, { slot: i, src: s, important: true }); this.creditTo(src, 2); }
        }
        break;
      case 'corno': {
        this.damage(c, pl ? 2 : 1, src);
        const b = this.enemyAt(i - 1);
        if (b) this.damage(b, 1, src);
        break;
      }
      case 'rogo': {
        const max = pl ? 3 : 2;
        if (c.cor > 0) { c.cor--; this.log('block', `${c.name}: la Corazza para il Rogo`, { slot: i }); break; }
        if (c.burn < max) { c.burn++; this.log('burn', `Rogo: ${c.name} brucia (${c.burn})`, { slot: i, src: s, float: { slot: i, text: '🔥', color: 'gold' } }); this.creditTo(src, 1); }
        break;
      }
      case 'specchio': {
        const f = this.enemyAt(i + 1);
        if (f) { this.log('segno', `Specchio: ${c.name} colpisce ${f.name}`, { slot: i, src: s }); this.damage(f, c.forza, src); }
        if (pl) { const b = this.enemyAt(i - 1); if (b && c.forza >= 2) this.damage(b, Math.floor(c.forza / 2), src); }
        break;
      }
      case 'pozzo': {
        const key = this.useKey(s, i);
        if (this.segUse[key] || c.tier === 'b' || c.tier === 'e' || c.forza > (pl ? 4 : 3)) break;
        if (c.uid != null && this.run.deck.length <= minDeck(this.run)) {
          this.log('fizzle', 'Pozzo: il mazzo è al minimo, non puoi esiliare');
          break;
        }
        this.segUse[key] = 1;
        if (c.cor > 0) { c.cor--; this.log('block', `${c.name}: la Corazza para il Pozzo`, { slot: i }); break; }
        this.lane[i] = null;
        if (c.uid != null) {
          this.returnLoot(c.uid);
          this.run.deck = this.run.deck.filter((x) => x.uid !== c.uid);
          this.exiled.push(c.name);
        }
        this.creditTo(src, Math.max(2, c.forza + 1));
        this.log('exile', `Pozzo: ${c.name} è esiliata per sempre`, { slot: i, src: s, important: true });
        if (this.has('contrabbando')) this.gain(this.plus('contrabbando') ? 3 : 2, 'Contrabbando');
        break;
      }
      default:
        // Bastione, Catena, Campana a Morto agiscono in altri momenti
        void nm;
    }
  }

  enemyTick() {
    for (let i = this.L - 1; i >= 0; i--) {
      const c = this.lane[i];
      if (!c || c.ally) continue;
      const f = this.enemyAt(i + 1);
      if (c.kw.branco && c.brancoGot < c.kw.branco && f && f.seme === 'Bastoni') {
        c.brancoGot++;
        c.forza++;
        this.log('ability', `${c.name} segue il branco: +1 Forza`, { slot: i, float: { slot: i, text: '+1', color: 'crimson' } });
      }
      if (c.kw.forgia && f && f.cor === 0) {
        f.cor = 1;
        f.kw.corazza = 1;
        this.log('ability', `${c.name} forgia una Corazza per ${f.name}`, { slot: i + 1 });
      }
    }
  }

  allyTick() {
    for (let i = this.L - 1; i >= 0; i--) {
      const c = this.lane[i];
      if (!c || !c.ally) continue;
      const g = ENEMIES[c.def].girata;
      const f = this.enemyAt(i + 1);
      const src: Src = { kind: 'ally', id: c.def };
      if ((g === 'morso' || g === 'morso2') && f) this.damage(f, g === 'morso2' ? 2 : 1, src);
      if (g === 'scardina' && f && f.cor > 0) { f.cor--; this.log('ability', `${c.name} (tuo) toglie una Corazza a ${f.name}`, { slot: i + 1 }); }
      if (g === 'purifica') {
        for (const j of [i - 1, i + 1]) {
          const e = this.enemyAt(j);
          if (e && (e.kw.etereo || e.kw.rapido)) { delete e.kw.etereo; delete e.kw.rapido; this.log('ability', `${c.name} (tuo) toglie Etereo e Rapido a ${e.name}`, { slot: j }); }
        }
      }
      this.flush();
      if (this.defeat) return;
    }
  }

  burnTick() {
    for (let i = this.L - 1; i >= 0; i--) {
      const c = this.lane[i];
      if (!c || c.ally || !c.burn) continue;
      this.damage(c, c.burn, { kind: 'burn', id: 'rogo', slot: i });
      this.creditTo({ kind: 'segno', id: 'rogo' }, c.burn);
      this.flush();
    }
  }

  applyAsso() {
    const a = this.asso;
    if (!a || a.tick !== this.t) return;
    if (a.kind === 'scambia') {
      const x = this.lane[a.slot];
      const y = this.lane[a.slot + 1];
      if (x && y) {
        this.lane[a.slot] = y;
        this.lane[a.slot + 1] = x;
        this.log('asso', `Asso nella manica: scambi ${x.name} e ${y.name}`, { slot: a.slot, important: true });
      }
    } else {
      const x = this.lane[a.slot];
      if (x) this.log('asso', `Asso nella manica: trattieni ${x.name} per un tick`, { slot: a.slot, important: true });
    }
  }

  // ------------------------------------------------------------- risoluzione
  run_(): WaveOutcome {
    this.buildQueue();
    this.log('start', `Rintocco ${this.spec.rintocco}: entrano ${this.queue.length} carte`, { important: true });
    const corrente = this.spec.corrente;
    while ((this.queue.length || this.lane.some((x) => x)) && this.t < P.MAX_TICKS) {
      this.t++;
      this.tickCombo = 0;
      if (this.run.lumi <= 0) break;
      this.log('tick', `Tick ${this.t}`);
      this.applyAsso();
      this.advance(false);
      if (this.defeat) break;
      if (corrente && this.t % corrente === 0) {
        this.advance(true);
        if (this.defeat) break;
      }
      // Ingresso
      if (!this.lane[0] && this.queue.length && !this.skipNext) {
        const c = this.queue.shift()!;
        this.enter(c);
        this.flush();
        if (this.run.def.rito?.id === 'cadenzato' && !this.spec.bossRito) this.skipNext = true;
      } else if (this.skipNext) this.skipNext = false;
      this.segniPhase();
      if (this.defeat) break;
      this.enemyTick();
      this.allyTick();
      if (this.defeat) break;
      this.burnTick();
      this.maxCombo = Math.max(this.maxCombo, this.tickCombo);
      if (this.events.length > P.MAX_EVENTS) break;
    }
    if (!this.defeat && (this.queue.length || this.lane.some((x) => x && !x.ally))) {
      // limite di sicurezza: il mazzo collassa (bug di design, GDD §4.9)
      this.limit = true;
      let d = 0;
      for (const c of [...this.lane, ...this.queue]) if (c && !c.ally && !c.kw.innocua) d += Math.ceil(c.forza / 2);
      const before = this.run.lumi;
      this.run.lumi = Math.max(0, this.run.lumi - d);
      this.dmg += before - this.run.lumi;
      this.log('collapse', `Il mazzo collassa: −${before - this.run.lumi} Lumi`, { important: true });
      if (this.run.lumi <= 0) { this.defeat = true; this.log('defeat', 'L’ultimo Lume si spegne.', { important: true }); }
      this.lane.fill(null);
      this.queue = [];
    }
    if (!this.defeat) this.log('end', this.dmg === 0 ? 'Ondata respinta senza danni!' : `Ondata finita: −${this.dmg} Lumi`, { important: true });
    const credit = Object.entries(this.credit).sort((a, b) => b[1] - a[1]);
    const danger = Object.entries(this.danger).sort((a, b) => b[1] - a[1]);
    return {
      events: this.events,
      dmg: this.dmg,
      gained: this.gained,
      ticks: this.t,
      destroyedUids: [...new Set(this.destroyed.filter((c) => c.uid != null).map((c) => c.uid!))],
      destroyedNames: this.destroyed.map((c) => c.name),
      arrivedNames: this.arrived,
      drawnUids: [...this.drawn],
      stolen: this.stolen,
      bossDead: this.bossDead,
      bossImpact: this.bossImpact,
      defeat: this.defeat,
      limit: this.limit,
      mvp: credit.length ? credit[0][0] : null,
      dangerous: danger.length && danger[0][1] > 0 ? danger[0][0] : null,
      betrayed: [],
      maxCombo: this.maxCombo,
      firstImpact: this.firstImpact,
      exiled: this.exiled,
      allyLoss: this.allyLoss,
      revealExtra: this.revealExtra,
      why: Object.fromEntries(this.all.map((c) => [c.wid, c.why])),
    };
  }

  /** Coda prevista (senza risolvere): per l'anteprima in Preparazione. */
  preview(): { queue: SnapCard[]; pileTop: { uid: number; def: string }[] } {
    this.buildQueue();
    return {
      queue: this.queue.map((c) => this.snapCard(c)),
      pileTop: this.pile.slice(0, 8).filter((x): x is DeckCard => x !== 'scartina').map((x) => ({ uid: x.uid, def: x.def })),
    };
  }

}

export function cardForza(c: DeckCard): number {
  return ENEMIES[c.def].forza + c.rancore + (c.corrotto ? 2 : 0);
}

/** Stato iniziale del mazzo prima della pescata (per l'anteprima del Mazzo Truccato). */
export function truccatoCandidates(run: RunState): DeckCard[] {
  if (!run.wave) return [];
  const sim = new WaveSim(structuredClone(run), run.wave.spec, run.wave.seed, null, true);
  sim.buildQueue();
  return sim.truccatoTop;
}
