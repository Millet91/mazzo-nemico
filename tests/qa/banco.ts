// Banco di prova del QA: gioca battaglie intere solo con le API congelate (core/tipi, battaglia/sim, gen, ia),
// in Node e senza Pixi. Lo usano fuzz.test.ts e prestazioni.test.ts. Proprietario: Lead test/QA.
import { readFileSync } from 'node:fs';
import type { Comando, ComandoRegistrato, ConfigBattaglia, EventoBattaglia, IdArma, MappaGenerata, StatoBattaglia } from '../../src/core/tipi';
import { VERSIONE_REGOLE } from '../../src/core/tipi';
import { casuale, intero, semeIniziale, type ConRng } from '../../src/core/rng';
import { creaBattaglia, eseguiComando, avanzaTick, hashStato } from '../../src/battaglia/sim';
import { generaMappa } from '../../src/battaglia/gen';
import { mappaFatta } from '../../src/battaglia/mappe';
import { decidi } from '../../src/battaglia/ia';
import { BIL, TICK_AL_SECONDO } from '../../src/contenuti/bilanciamento';
import { ARMI_ATTIVE } from '../../src/contenuti/armi';

/** Finché la sim è il segnaposto del Lead, gli invarianti che dipendono dalla fisica vera si saltano. */
export const SIM_SEGNAPOSTO = readFileSync('src/battaglia/sim/index.ts', 'utf8').includes('IMPLEMENTAZIONE SEGNAPOSTO');

/** Tetto di sicurezza: oltre questo la battaglia "non finisce" (turno limite × turno più lungo possibile). */
export const TICK_MAX = BIL.battaglia.turnoLimite * (BIL.camera.inquadraTick + (BIL.turno.timerLungo + 15) * TICK_AL_SECONDO);

export function configCaso(seme: number, perLato?: [number, number], mappaFissa?: string): ConfigBattaglia {
  const r: ConRng = { rng: semeIniziale(seme ^ 0x51a5) };
  const a = perLato ?? [intero(r, 1, 5), intero(r, 1, 5)];
  return {
    ...(mappaFissa ? { mappaFissa } : {}),
    versioneRegole: VERSIONE_REGOLE, seme, bioma: 'isola',
    squadre: [
      { ciurma: 'teschio', ruolo: 'attaccante', controllo: 'umano', pirati: a[0] },
      { ciurma: 'marina', ruolo: 'difensore', controllo: 'ia', livelloIa: 'mozzo', pirati: a[1] },
    ],
    timerSecondi: BIL.turno.timerMozzo, traiettoriaCompleta: true,
  };
}

/** La mappa di una config come la sceglie la partita (partita.ts): quella fatta a mano se c'è mappaFissa, altrimenti il generatore. */
export function mappaPer(cfg: ConfigBattaglia): MappaGenerata {
  const fissa = cfg.mappaFissa ? mappaFatta(cfg.mappaFissa, cfg) : null;
  if (cfg.mappaFissa && !fissa) throw new Error(`mappa fatta a mano sconosciuta: ${cfg.mappaFissa}`);
  return fissa ?? generaMappa({ seme: cfg.seme, bioma: cfg.bioma, variante: cfg.variante, piratiPerLato: [cfg.squadre[0].pirati, cfg.squadre[1].pirati] });
}

export function nuovaBattaglia(cfg: ConfigBattaglia, mappa: MappaGenerata = mappaPer(cfg)): StatoBattaglia {
  return creaBattaglia(cfg, mappa);
}

/** Fuzz di scale e liane (#47) finché nessuna mappa ne ha: una scala o liana alta 160 px sopra ogni punto di nascita. */
export function conAppigli(m: MappaGenerata): MappaGenerata {
  const appigli = m.spawn.flat().map((p, i) => ({ tipo: (i % 2 ? 'liana' : 'scala') as 'scala' | 'liana', x: p.x, yAlto: p.y - 160, yBasso: p.y + 11 }));
  return { ...m, appigli: [...(m.appigli ?? []), ...appigli] };
}

export type Pilota = (s: StatoBattaglia) => Comando[];

/** Comandi casuali (fuzz): il PRNG del fuzz è separato da quello della battaglia. */
export function pilotaCasuale(seme: number): Pilota {
  const r: ConRng = { rng: semeIniziale(seme ^ 0xf022) };
  return (s) => {
    if (s.turno.fase !== 'azione' && s.turno.fase !== 'fuga') return [];
    if (casuale(r) > 0.08) return [];
    const armi = ARMI_ATTIVE.filter((a) => s.squadre[s.turno.squadra].munizioni[a] !== undefined) as IdArma[];
    switch (intero(r, 0, 9)) {
      case 0: case 1: return [{ t: 'muovi', dir: (intero(r, 0, 2) - 1) as -1 | 0 | 1 }];
      case 2: return [{ t: 'salta', indietro: casuale(r) < 0.3 }];
      case 3: case 4: return [{ t: 'mira', mezziGradi: intero(r, 0, 719), potenza: intero(r, 0, 100) }];
      case 5: return [{ t: 'ruotaMira', delta: intero(r, -20, 20) }];
      case 6: return armi.length ? [{ t: 'arma', arma: armi[intero(r, 0, armi.length - 1)] }] : [];
      case 7: return [{ t: 'miccia', secondi: intero(r, 1, 5) }];
      default: return [{ t: 'fuoco' }];
    }
  };
}

/** Come pilotaCasuale, ma un comando su tre è `arrampica` (su, giù o ferma): per il fuzz di scale e liane. */
export function pilotaScalatore(seme: number): Pilota {
  const r: ConRng = { rng: semeIniziale(seme ^ 0x5ca1a) };
  const caso = pilotaCasuale(seme);
  return (s) => {
    if ((s.turno.fase === 'azione' || s.turno.fase === 'fuga') && casuale(r) < 0.04) return [{ t: 'arrampica', dir: (intero(r, 0, 2) - 1) as -1 | 0 | 1 }];
    return caso(s);
  };
}

/**
 * Le due squadre giocano con l'IA (decidi): arma, mira, miccia e fuoco appena entra in 'azione'; poi, come fa il
 * ciclo di gioco (partita.ts), in fuga corre nella direzione scelta dall'IA per tutta la fuga.
 */
export function pilotaIa(): Pilota {
  let fatto = -1, fuga: -1 | 0 | 1 = 0, corre = -1;
  return (s) => {
    if (s.turno.fase === 'fuga' && fatto === s.turno.numero && corre !== s.turno.numero && fuga !== 0) {
      corre = s.turno.numero;
      return [{ t: 'muovi', dir: fuga }];
    }
    if (s.turno.fase !== 'azione' || fatto === s.turno.numero) return [];
    fatto = s.turno.numero;
    const p = decidi(s, s.squadre[s.turno.squadra].livelloIa ?? 'mozzo');
    fuga = p.fuga;
    const c: Comando[] = [{ t: 'arma', arma: p.arma }, { t: 'mira', mezziGradi: p.mezziGradi, potenza: p.potenza }];
    if (p.miccia) c.push({ t: 'miccia', secondi: p.miccia });
    c.push({ t: 'fuoco' });
    return c;
  };
}

export interface Partita {
  stato: StatoBattaglia;
  comandi: ComandoRegistrato[];
  /** hash ogni 600 tick e alla fine */
  hash: Record<number, string>;
  violazioni: string[];
  msPerTick: number;
  /** quante volte è uscito ogni tipo di evento (per controllare che il fuzz abbia davvero toccato una regola) */
  eventiVisti: Record<string, number>;
}

/** Gioca fino alla fine (o al TICK_MAX) controllando gli invarianti di 13 §2 L2 a ogni tick. */
export function gioca(cfg: ConfigBattaglia, pilota: Pilota, controlli = true, mappa?: MappaGenerata): Partita {
  const s = nuovaBattaglia(cfg, mappa);
  const eventiVisti: Record<string, number> = {};
  const senzaAppiglio = new Map<number, number>();
  const eventi: EventoBattaglia[] = [];
  const comandi: ComandoRegistrato[] = [];
  const hash: Record<number, string> = {};
  const violazioni: string[] = [];
  const iniziali = s.pirati.length;
  const dentroSolido = new Map<number, number>();
  let inizioTurno = 0, turno = s.turno.numero, sparoTick = -1, ms = 0;
  const v = (m: string) => { if (violazioni.length < 10) violazioni.push(`tick ${s.tick}: ${m}`); };

  while (!s.esito && s.tick < TICK_MAX) {
    for (const c of pilota(s)) { comandi.push({ tick: s.tick, c }); eseguiComando(s, c); }
    const t0 = performance.now();
    avanzaTick(s, eventi);
    ms += performance.now() - t0;
    for (const e of eventi) eventiVisti[e.t] = (eventiVisti[e.t] ?? 0) + 1;
    eventi.length = 0;
    if (s.tick % 600 === 0) hash[s.tick] = hashStato(s);
    if (!controlli) continue;

    // conservazione dei pirati (00: niente riserve ⇒ vivi + morti = iniziali)
    if (s.pirati.length !== iniziali) v(`pirati ${s.pirati.length} invece di ${iniziali}`);
    for (const p of s.pirati) {
      for (const k of ['x', 'y', 'vx', 'vy', 'vita'] as const) if (!Number.isFinite(p[k])) v(`pirata ${p.id}.${k} = ${p[k]}`);
      if (p.vita < 0) v(`pirata ${p.id} con vita ${p.vita}`);
      if (p.stato === 'vivo' && !SIM_SEGNAPOSTO) {
        const { w, h, maschera, mare } = s.terreno;
        const xi = Math.floor(p.x), yi = Math.floor(p.y);
        const solido = xi >= 0 && xi < w && yi >= 0 && yi < h && yi < mare && maschera[yi * w + xi] !== 0;
        const n = solido ? (dentroSolido.get(p.id) ?? 0) + 1 : 0;
        dentroSolido.set(p.id, n);
        if (n > 3) v(`pirata ${p.id} dentro il solido da ${n} tick (13 caso 7)`);
      }
    }
    // scale e liane (#47, invarianti proposti da A)
    for (const a of s.appigli) {
      if (a.yBasso - a.yAlto < BIL.arrampicata.pezzoMinimo) v(`appiglio ${a.id} lungo ${a.yBasso - a.yAlto} px, sotto il pezzo minimo`);
      if (![a.x, a.yAlto, a.yBasso].every(Number.isFinite)) v(`appiglio ${a.id} con coordinate non finite`);
    }
    if (new Set(s.appigli.map((a) => a.id)).size !== s.appigli.length) v('due appigli con lo stesso id');
    for (const p of s.pirati) {
      if (p.appeso < 0) { senzaAppiglio.set(p.id, 0); continue; }
      if (p.stato !== 'vivo') v(`pirata ${p.id} ${p.stato} ma ancora appeso a ${p.appeso}`);
      if (p.vx !== 0 || p.vy !== 0) v(`pirata ${p.id} appeso con velocità (${p.vx}, ${p.vy})`);
      const n = s.appigli.some((a) => a.id === p.appeso) ? 0 : (senzaAppiglio.get(p.id) ?? 0) + 1;
      senzaAppiglio.set(p.id, n);
      if (n > 1) v(`pirata ${p.id} appeso all'appiglio ${p.appeso} che non c'è più da ${n} tick`);
    }
    for (const q of s.proiettili) if (!Number.isFinite(q.x) || !Number.isFinite(q.y)) v(`proiettile ${q.id} con posizione non finita`);

    // ogni turno si chiude: dallo sparo al turno dopo al massimo 15 s simulati (+ la fuga)
    if (s.turno.sparato && sparoTick < 0) sparoTick = s.tick;
    if (s.turno.numero !== turno) { turno = s.turno.numero; inizioTurno = s.tick; sparoTick = -1; }
    if (!SIM_SEGNAPOSTO && sparoTick >= 0 && s.tick - sparoTick > BIL.ritmo.fugaTick + 15 * TICK_AL_SECONDO) {
      v(`turno ${turno} non si chiude da ${(s.tick - sparoTick) / TICK_AL_SECONDO} s dopo lo sparo (13 caso 8)`);
      sparoTick = Infinity;
    }
    void inizioTurno;
  }
  hash[s.tick] = hashStato(s);
  if (controlli && !SIM_SEGNAPOSTO) {
    if (!s.esito) v(`la battaglia non è finita entro ${TICK_MAX} tick`);
    else if (s.esito.turni > BIL.battaglia.turnoLimite) v(`finita al turno ${s.esito.turni}, oltre il limite ${BIL.battaglia.turnoLimite}`);
  }
  return { stato: s, comandi, hash, violazioni, msPerTick: ms / Math.max(1, s.tick), eventiVisti };
}

/** Rigioca una lista di comandi registrati (stessa logica di un replay) e restituisce gli hash. */
export function rigioca(cfg: ConfigBattaglia, comandi: ComandoRegistrato[]): Record<number, string> {
  let i = 0;
  return gioca(cfg, (s) => {
    const out: Comando[] = [];
    while (i < comandi.length && comandi[i].tick === s.tick) out.push(comandi[i++].c);
    return out;
  }, false).hash;
}
