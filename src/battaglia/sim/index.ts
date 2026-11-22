// API pubblica della simulazione di battaglia: CONTRATTO CONGELATO dal Lead (M1). Le firme non cambiano.
// Implementazione: agente Fisica (A, ramo claude/m1-sim). I pezzi stanno nei file accanto:
// terreno.ts (maschera, capsula, crateri) · pirata.ts (camminata, volo, caduta, espulsione, mare) ·
// proiettili.ts (passi di 1 px, connettività a 8) · esplosione.ts · armi.ts · turno.ts (fasi e fine) ·
// simula.ts (simulaColpo, traiettoria) · hash.ts · replay.ts (rigiocaReplay, creaReplay).
//
// Regole del contratto:
// - TypeScript puro: niente DOM, Pixi, Preact, Math.random, Date.now, Math.sin/cos/atan2/hypot/pow (core/trig.ts, core/rng.ts).
// - Lo stato è un oggetto semplice (core/tipi.ts StatoBattaglia), mutato sul posto da eseguiComando e avanzaTick.
// - Determinismo: stessa config + stessa mappa + stessi comandi agli stessi tick ⇒ stesso hashStato, su Node e sul telefono.
// - Gli eventi si AGGIUNGONO all'array passato (il chiamante lo svuota quando vuole).
// - Nessuno stato fuori da StatoBattaglia. eseguiComando non riceve l'array degli eventi, quindi prepara soltanto
//   (es. `turno.sparato = true`) e l'effetto con i suoi eventi avviene nell'avanzaTick successivo: lo sparo
//   parte al tick dopo il comando. Gli eventi del turno 1 escono al primo avanzaTick.
// - Un pirata a 0 PV resta `stato: 'vivo'` con `vita: 0` ("a terra") fino a fine risoluzione, quando diventa una
//   lapide-barilotto: solo allora `stato: 'morto'` ed evento `morto`. Chi annega passa subito ad 'annegato'.

import type {
  Comando, ConfigBattaglia, EsitoColpo, EventoBattaglia, IdArma, IdCiurma, MappaGenerata, PianoColpo, Pirata, Punto, StatoBattaglia,
} from '../../core/tipi';
import { semeIniziale } from '../../core/rng';
import { coseno, normalizza } from '../../core/trig';
import { BIL } from '../../contenuti/bilanciamento';
import { ARMA, dotazioneIniziale } from '../../contenuti/armi';
import { T } from '../../testi/it';
import { MEZZA_ALTEZZA_PIRATA } from './terreno';
import { inGioco } from './pirata';
import { decidiBalzo, gira, type EsitoBalzo } from './movimento';
import { avanza, iniziaTurno, miraIniziale, pirataDelTurno, ritirata } from './turno';
import { hashDi } from './hash';
import { creaBarili } from './oggetti';
import { creaAppigli } from './appigli';
import { durataColpi } from './armi';
import { avvisoTiro as avviso, simulaColpo as simula, traiettoria as linea } from './simula';
import { spintaAlCentro as spintaCentro } from './esplosione';

/** Crea lo stato iniziale. La mappa arriva dal generatore (battaglia/gen). Il turno 1 parte in fase 'inquadra'. */
export function creaBattaglia(cfg: ConfigBattaglia, mappa: MappaGenerata): StatoBattaglia {
  const pirati: Pirata[] = [];
  let id = 0;
  for (const lato of [0, 1] as const) {
    const sq = cfg.squadre[lato];
    const vita = sq.ciurma === 'gelo' && sq.ruolo === 'difensore' ? BIL.pirata.pvGeloDifesa : BIL.pirata.pv;
    const posti = mappa.spawn[lato];
    for (let i = 0; i < sq.pirati; i++) {
      const p = posti[i % posti.length];
      const y = p.y - MEZZA_ALTEZZA_PIRATA; // lo spawn è il centro dei piedi
      pirati.push({
        id: id++, squadra: lato, nome: T.ciurme[sq.ciurma].pirati[i % 5],
        x: p.x, y, vx: 0, vy: 0, vita, vitaMax: vita,
        verso: 1, aTerra: true, stato: 'vivo', yInizioCaduta: y, dannoNelTurno: 0, appeso: -1,
      });
    }
  }
  // ognuno guarda verso il centro della squadra avversaria
  for (const p of pirati) {
    const altri = pirati.filter((q) => q.squadra !== p.squadra);
    const cx = altri.length ? altri.reduce((a, q) => a + q.x, 0) / altri.length : mappa.terreno.w / 2;
    p.verso = cx < p.x ? -1 : 1;
  }
  const sq = (lato: 0 | 1) => {
    const c = cfg.squadre[lato];
    return {
      indice: lato, ciurma: c.ciurma, ruolo: c.ruolo, controllo: c.controllo, livelloIa: c.livelloIa,
      munizioni: dotazioneIniziale(), ultimoPirata: -1,
      pvIniziali: pirati.filter((p) => p.squadra === lato).reduce((a, p) => a + p.vita, 0),
    };
  };
  const s: StatoBattaglia = {
    versioneRegole: cfg.versioneRegole, config: cfg, rng: semeIniziale(cfg.seme), tick: 0,
    terreno: { ...mappa.terreno, maschera: mappa.terreno.maschera.slice() },
    vento: 0, squadre: [sq(0), sq(1)], pirati, proiettili: [], appigli: [], prossimoId: 1,
    turno: {
      numero: 0, squadra: 1, pirata: -1, fase: 'inquadra', inizioFase: 0, timerAvviato: false, tickRimasti: 0,
      arma: 'cannone', mira: miraIniziale(1), miccia: BIL.mira.micciaPredefinita,
      camminata: 0, arrampicata: 0, sparato: false, fermoDa: -1,
    },
    esito: null,
    // Fase 3: il campo si spezza
    pezzi: [], fuochi: [], frane: [],
    strutture: (mappa.strutture ?? []).map((st) => ({ ...st, stato: 'intera' as const })),
    sostegni: (mappa.sostegni ?? []).map((r) => ({ ...r })),
    partenze: pirati.map((p) => ({ x: p.x, y: p.y + MEZZA_ALTEZZA_PIRATA })),
  };
  creaBarili(s, mappa.barili);
  creaAppigli(s, mappa.appigli);
  iniziaTurno(s, []); // gli eventi del turno 1 li ripete il primo avanzaTick
  return s;
}

/** Elevazione della mira rispetto al verso del pirata, in mezzi gradi −360..359 (0 = orizzontale, + = su). */
function elevazione(mezziGradi: number, verso: 1 | -1): number {
  const a = normalizza(verso === 1 ? mezziGradi : 360 - mezziGradi);
  return a >= 360 ? a - 720 : a;
}

/** Applica un comando al pirata attivo nel tick corrente. I comandi fuori fase si ignorano. */
export function eseguiComando(s: StatoBattaglia, c: Comando): void {
  if (s.esito) return;
  if (c.t === 'ritirata') { ritirata(s); return; }
  const t = s.turno;
  if (t.fase !== 'azione' && t.fase !== 'fuga') return;
  const p = pirataDelTurno(s);
  if (!p || !inGioco(p)) return;
  const inAzione = t.fase === 'azione';
  if (inAzione && t.sparato) return; // lo sparo parte al prossimo tick: niente cambi di mira o d'arma
  if (inAzione) t.timerAvviato = true; // l'evento `timerAvviato` esce al prossimo tick
  switch (c.t) {
    case 'muovi': {
      t.camminata = c.dir === -1 || c.dir === 1 ? c.dir : 0;
      // girandosi il pirata tiene la stessa elevazione della mira; a metà scavalco non si gira (lo interrompe)
      if (t.camminata !== 0 && p.mossa !== 'scavalco') gira(s, p, t.camminata);
      break;
    }
    case 'arrampica': {
      // si aggrappa o sale/scende al prossimo tick. "In un tocco": il comando resta finché il pirata arriva in cima
      // o in fondo; da appeso, il tasto opposto a quello con cui sta andando lo ferma (e `dir: 0` pure)
      const d = c.dir === -1 || c.dir === 1 ? c.dir : 0;
      t.arrampicata = p.appeso >= 0 && d !== 0 && t.arrampicata === -d ? 0 : d;
      break;
    }
    case 'salta': {
      if (!inAzione && s.tick - t.inizioFase < durataColpi(t.arma)) break; // la pistola sta ancora sparando
      // il Balzo parte al prossimo tick: movimento.ts sceglie tra salto, scavalco, afferra, stacca e salto dal muro
      t.richiesta = c.indietro ? 'balzoMuro' : 'balzo';
      break;
    }
    case 'mira': {
      if (!inAzione) break;
      const mg = normalizza(c.mezziGradi);
      const pot = Math.max(0, Math.min(100, Math.round(c.potenza)));
      t.mira = { mezziGradi: mg, potenza: Number.isFinite(pot) ? pot : 0 };
      const cx = coseno(mg);
      if (cx < -1e-9) p.verso = -1; else if (cx > 1e-9) p.verso = 1;
      break;
    }
    case 'ruotaMira': {
      if (!inAzione) break;
      const e = Math.max(-180, Math.min(180, elevazione(t.mira.mezziGradi, p.verso) + Math.round(c.delta)));
      t.mira.mezziGradi = normalizza(p.verso === 1 ? e : 360 - e);
      break;
    }
    case 'arma': {
      if (!inAzione) break;
      const m = s.squadre[t.squadra].munizioni[c.arma];
      if (m !== undefined && m !== 0) t.arma = c.arma;
      break;
    }
    case 'miccia': {
      if (!inAzione) break;
      const lim = ARMA.granata.miccia!;
      t.miccia = Math.max(lim.min, Math.min(lim.max, Math.round(c.secondi)));
      break;
    }
    case 'fatto': {
      // in fuga chiude subito il turno: la fase cambia (con l'evento `fatto`) al prossimo avanzaTick
      if (t.fase === 'fuga') t.richiesta = 'fatto';
      break;
    }
    case 'fuoco': {
      if (!inAzione || t.sparato) break;
      const m = s.squadre[t.squadra].munizioni[t.arma];
      if (m === undefined || m === 0) break;
      t.sparato = true; // il colpo parte al prossimo avanzaTick (turno.ts)
      break;
    }
    default:
      break;
  }
}

/** Avanza la simulazione di un tick (1/60 s). */
export function avanzaTick(s: StatoBattaglia, eventi: EventoBattaglia[]): void {
  avanza(s, eventi);
}

/** Hash di tutto lo stato (numeri a piena precisione e maschera intera) per i replay d'oro. */
export function hashStato(s: StatoBattaglia): string {
  return hashDi(s);
}

/** Simula un tiro senza toccare `s` (per l'IA). Deve costare poco: niente copia della maschera. */
export function simulaColpo(s: StatoBattaglia, piano: PianoColpo): EsitoColpo {
  return simula(s, piano);
}

/**
 * Punti della traiettoria prevista (linea tratteggiata): la usa il render. Non muta `s`.
 * `maxRimbalzi` (opzionale, granata): la linea si ferma a quel rimbalzo; senza, segue tutta la miccia fino all'esplosione.
 */
export function traiettoria(s: StatoBattaglia, maxPunti = 60, maxRimbalzi?: number): Punto[] {
  return linea(s, maxPunti, maxRimbalzi);
}

/** Avviso prima del fuoco: 'danno' = chi spara si farebbe male, 'vicino' = il colpo scoppierebbe a meno di 60 px da lui. Non muta `s`. */
export function avvisoTiro(s: StatoBattaglia): 'vicino' | 'danno' | null {
  return avviso(s);
}

/** Il pirata attivo (o undefined a battaglia finita). */
export function pirataAttivo(s: StatoBattaglia): Pirata | undefined {
  return s.pirati.find((x) => x.id === s.turno.pirata && x.stato === 'vivo');
}

/**
 * Cosa farebbe adesso il Balzo del pirata attivo (per l'etichetta del tasto, `VistaBattaglia.balzo`), o undefined
 * se non può fare niente (fuori fase, a metà scavalco, sbalzato in volo, in aria senza pareti né appigli).
 * Con 'muro' il tasto manda `salta` con `indietro: true`; il salvataggio al bordo si mostra come 'afferra'.
 * Non muta `s`.
 */
export function balzoPossibile(s: StatoBattaglia): Exclude<EsitoBalzo, 'bordo'> | undefined {
  const t = s.turno;
  const p = pirataAttivo(s);
  if (s.esito || !p || !inGioco(p)) return undefined;
  if (t.fase !== 'azione' && !(t.fase === 'fuga' && s.tick - t.inizioFase >= durataColpi(t.arma))) return undefined;
  const b = decidiBalzo(s, p, false);
  return b === 'bordo' ? 'afferra' : b ?? undefined;
}

/**
 * Spinta al centro, in px/tick, dell'esplosione di un'arma sparata da `ciurma` (null = senza tratti): la stessa
 * che usano la battaglia e `simulaColpo`. Per il generatore delle coste e per le prove delle mappe.
 */
export function spintaAlCentro(arma: IdArma, ciurma: IdCiurma | null): number {
  return spintaCentro(arma, ciurma);
}
