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
  Comando, ConfigBattaglia, EsitoColpo, EventoBattaglia, MappaGenerata, PianoColpo, Pirata, Punto, StatoBattaglia,
} from '../../core/tipi';
import { semeIniziale } from '../../core/rng';
import { coseno, normalizza } from '../../core/trig';
import { BIL } from '../../contenuti/bilanciamento';
import { ARMA, dotazioneIniziale } from '../../contenuti/armi';
import { T } from '../../testi/it';
import { MEZZA_ALTEZZA_PIRATA } from './terreno';
import { inGioco, stacca } from './pirata';
import { avanza, iniziaTurno, miraIniziale, pirataDelTurno, ritirata } from './turno';
import { hashDi } from './hash';
import { simulaColpo as simula, traiettoria as linea } from './simula';

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
        verso: 1, aTerra: true, stato: 'vivo', yInizioCaduta: y, dannoNelTurno: 0,
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
    vento: 0, squadre: [sq(0), sq(1)], pirati, proiettili: [], prossimoId: 1,
    turno: {
      numero: 0, squadra: 1, pirata: -1, fase: 'inquadra', inizioFase: 0, timerAvviato: false, tickRimasti: 0,
      arma: 'cannone', mira: miraIniziale(1), miccia: BIL.mira.micciaPredefinita,
      camminata: 0, sparato: false,
    },
    esito: null,
  };
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
      if (t.camminata !== 0 && t.camminata !== p.verso) {
        p.verso = t.camminata;
        // girandosi il pirata tiene la stessa elevazione della mira
        if (inAzione) t.mira.mezziGradi = normalizza(360 - t.mira.mezziGradi);
      }
      break;
    }
    case 'salta': {
      if (!p.aTerra) break;
      const sa = c.indietro ? BIL.pirata.saltoIndietro : BIL.pirata.saltoAvanti;
      stacca(p);
      p.vx = sa.vx * p.verso; p.vy = sa.vy; // l'evento `salto` esce al prossimo tick (turno.ts)
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

/** Punti della traiettoria prevista (linea tratteggiata): la usa il render. Non muta `s`. */
export function traiettoria(s: StatoBattaglia, maxPunti = 60): Punto[] {
  return linea(s, maxPunti);
}

/** Il pirata attivo (o undefined a battaglia finita). */
export function pirataAttivo(s: StatoBattaglia): Pirata | undefined {
  return s.pirati.find((x) => x.id === s.turno.pirata && x.stato === 'vivo');
}
