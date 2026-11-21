// Ciclo di gioco di una battaglia, SENZA grafica (si prova in Node): mappa → stato → passo fisso a 60 Hz,
// comandi timbrati col tick e registrati nel replay, turni dell'IA trasformati in comandi "animati".
// Il disegno (battaglia/render) legge `s` e gli eventi restituiti da `aggiorna`.
import type {
  Comando, ConfigBattaglia, EventoBattaglia, MappaGenerata, PianoIa, Replay, StatoBattaglia,
} from '../../core/tipi';
import { VERSIONE_REGOLE } from '../../core/tipi';
import { normalizza } from '../../core/trig';
import { BIL } from '../../contenuti/bilanciamento';
import { avanzaTick, creaBattaglia, eseguiComando } from '../sim';
import { generaMappa } from '../gen';
import { creaIa, type ClientIa } from '../ia';
import { Accumulatore, MS_PER_TICK } from './accumulatore';

type PassoIa = 'pensa' | 'cammina' | 'mira' | 'fuga' | 'fatto';

interface TurnoIa {
  numero: number;
  passo: PassoIa;
  /** ms passati nel passo corrente */
  ms: number;
  piano: PianoIa | null;
  /** tick in cui finisce la camminata prima della mira */
  fineCamminata: number;
  miraDa: { mezziGradi: number; potenza: number };
  ultimaMira: { mezziGradi: number; potenza: number };
  /** la corsa di fuga è partita */
  corre: boolean;
}

export interface OpzioniPartita {
  /** mappa già pronta (test); altrimenti la genera da cfg.seme */
  mappa?: MappaGenerata;
  /** client dell'IA (test); altrimenti creaIa() */
  ia?: ClientIa;
  /** orologio per misurare i ms di sim per tick (Diagnostica); in Node e nel browser c'è performance.now */
  orologio?: () => number;
}

export class Partita {
  readonly mappa: MappaGenerata;
  readonly s: StatoBattaglia;
  readonly replay: Replay;
  /** l'IA sta pensando ("il capitano medita...") */
  iaPensa = false;
  /** ×1 ×2 ×4 sui turni dell'IA (M2; qui già funziona) */
  velocita: 1 | 2 | 4 = 1;
  /** statistiche per la Diagnostica */
  msSim = 0;
  tickSimulati = 0;

  private readonly acc = new Accumulatore();
  private coda: Comando[] = [];
  private readonly ia: ClientIa;
  private turnoIa: TurnoIa | null = null;
  private chiusa = false;
  private readonly orologio: () => number;

  constructor(readonly config: ConfigBattaglia, opz: OpzioniPartita = {}) {
    this.mappa = opz.mappa ?? generaMappa({
      seme: config.seme, bioma: config.bioma, variante: config.variante,
      piratiPerLato: [config.squadre[0].pirati, config.squadre[1].pirati],
    });
    this.s = creaBattaglia(config, this.mappa);
    this.replay = { versioneRegole: config.versioneRegole ?? VERSIONE_REGOLE, config, comandi: [] };
    this.ia = opz.ia ?? creaIa();
    this.orologio = opz.orologio ?? (() => performance.now());
  }

  get toccaIa(): boolean {
    return this.s.squadre[this.s.turno.squadra].controllo === 'ia';
  }

  /** Comando dall'HUD o dal canvas. Durante il turno dell'IA passa solo la ritirata. */
  comandoUmano(c: Comando): void {
    if (this.chiusa || this.s.esito) return;
    if (this.toccaIa && c.t !== 'ritirata') return;
    this.coda.push(c);
  }

  /** Dopo una pausa: il tempo passato non si recupera (13 caso 24). */
  sospendi(): void { this.acc.azzera(); }

  /** Avanza di un frame. Restituisce gli eventi della sim prodotti in questo frame. */
  aggiorna(deltaMS: number): EventoBattaglia[] {
    const eventi: EventoBattaglia[] = [];
    if (this.chiusa) return eventi;
    const d = this.toccaIa ? deltaMS * this.velocita : deltaMS;
    this.guidaIa(d);
    // anche a ×2/×4 restano al massimo 5 tick per frame (13 caso 6)
    const n = this.acc.passi(d);
    const t0 = this.orologio();
    for (let i = 0; i < n; i++) {
      if (this.coda.length) {
        for (const c of this.coda) {
          this.replay.comandi.push({ tick: this.s.tick, c });
          eseguiComando(this.s, c);
        }
        this.coda = [];
      }
      avanzaTick(this.s, eventi);
      if (this.s.esito) { this.replay.tickFinale = this.s.tick; break; }
    }
    if (n > 0) { this.msSim += this.orologio() - t0; this.tickSimulati += n; }
    return eventi;
  }

  /** Durata di un tick in ms (per chi interpola). */
  static readonly msPerTick = MS_PER_TICK;

  get alfa(): number { return this.acc.alfa; }

  chiudi(): void {
    this.chiusa = true;
    this.ia.chiudi();
  }

  // ─── IA ───

  private guidaIa(deltaMS: number): void {
    const s = this.s;
    const t = s.turno;
    if (s.esito || t.fase === 'fine') { this.iaPensa = false; this.turnoIa = null; return; }
    if (!this.toccaIa) { this.iaPensa = false; this.turnoIa = null; return; }
    if (t.numero === 0 || t.pirata < 0) return;
    let ti = this.turnoIa;
    if (!ti || ti.numero !== t.numero) {
      ti = this.turnoIa = {
        numero: t.numero, passo: 'pensa', ms: 0, piano: null, fineCamminata: 0,
        miraDa: { ...t.mira }, ultimaMira: { ...t.mira }, corre: false,
      };
      this.iaPensa = true;
      const numero = t.numero;
      const livello = s.squadre[t.squadra].livelloIa ?? 'mozzo';
      this.ia.pensa(s, livello).then(
        (p) => { if (this.turnoIa?.numero === numero) this.turnoIa.piano = p; },
        (e) => { console.error('IA', e); if (this.turnoIa?.numero === numero) this.turnoIa.passo = 'fatto'; this.iaPensa = false; },
      );
    }
    ti.ms += deltaMS;
    switch (ti.passo) {
      case 'pensa': {
        if (!ti.piano || ti.ms < BIL.ia.pensieroMinimoMs || t.fase !== 'azione') return;
        const p = ti.piano;
        this.iaPensa = false;
        if (p.arma !== t.arma) this.coda.push({ t: 'arma', arma: p.arma });
        if (p.miccia !== undefined) this.coda.push({ t: 'miccia', secondi: p.miccia });
        if (p.camminata && p.camminata.tick > 0) {
          this.coda.push({ t: 'muovi', dir: p.camminata.dir });
          ti.fineCamminata = s.tick + p.camminata.tick;
          this.vaiA(ti, 'cammina');
        } else this.vaiA(ti, 'mira');
        return;
      }
      case 'cammina':
        if (t.fase !== 'azione') { this.vaiA(ti, 'fatto'); return; }
        if (s.tick >= ti.fineCamminata) { this.coda.push({ t: 'muovi', dir: 0 }); this.vaiA(ti, 'mira'); }
        return;
      case 'mira': {
        if (t.fase !== 'azione') { this.vaiA(ti, 'fatto'); return; }
        const p = ti.piano!;
        const k = Math.min(1, ti.ms / BIL.ia.animazioneMiraMs);
        const m = interpolaMira(ti.miraDa, p, k);
        if (m.mezziGradi !== ti.ultimaMira.mezziGradi || m.potenza !== ti.ultimaMira.potenza) {
          this.coda.push({ t: 'mira', ...m });
          ti.ultimaMira = m;
        }
        if (k >= 1) { this.coda.push({ t: 'fuoco' }); this.vaiA(ti, 'fuga'); }
        return;
      }
      case 'fuga': {
        // dopo il volo arriva la fase di fuga: l'IA corre per tutta la fuga (la strada la controlla l'IA)
        const dir = ti.piano!.fuga;
        if (t.fase === 'azione' || t.fase === 'volo') return;
        if (t.fase !== 'fuga' || dir === 0) { this.vaiA(ti, 'fatto'); return; }
        if (!ti.corre) { this.coda.push({ t: 'muovi', dir }); ti.corre = true; }
        return;
      }
      default: return;
    }
  }

  private vaiA(ti: TurnoIa, passo: PassoIa): void {
    ti.passo = passo;
    ti.ms = 0;
    if (passo === 'mira') ti.miraDa = { ...this.s.turno.mira };
  }
}

/** Mira intermedia dell'animazione dell'IA: angolo per la via più corta, potenza lineare, valori interi. */
export function interpolaMira(
  da: { mezziGradi: number; potenza: number }, a: { mezziGradi: number; potenza: number }, k: number,
): { mezziGradi: number; potenza: number } {
  let diff = normalizza(a.mezziGradi) - normalizza(da.mezziGradi);
  if (diff > 360) diff -= 720;
  if (diff < -360) diff += 720;
  return {
    mezziGradi: normalizza(da.mezziGradi + diff * k),
    potenza: Math.round(da.potenza + (a.potenza - da.potenza) * k),
  };
}
