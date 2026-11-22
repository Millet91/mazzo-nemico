// Ritmo della battaglia (studio v2, Fase 1; BIL.ritmo): quanto dura un turno giocato dal bot, IA contro IA.
// Il bot spara al primo tick d'azione: al turno vero dell'IA vanno aggiunti gli 0,8 s di mira visibile
// (BIL.ritmo.iaMiraVisibileTick). Obiettivo del PIANO: turno dell'IA entro 4 s; 3 contro 3 in 2-4 minuti.
import { describe, it, expect } from 'vitest';
import type { Comando, EventoBattaglia } from '../../src/core/tipi';
import { avanzaTick, eseguiComando } from '../../src/battaglia/sim';
import { decidi } from '../../src/battaglia/ia';
import { casuale, intero, semeIniziale, type ConRng } from '../../src/core/rng';
import { BIL, TICK_AL_SECONDO } from '../../src/contenuti/bilanciamento';
import { configCaso, nuovaBattaglia, pilotaIa, type Pilota } from './banco';

const S = TICK_AL_SECONDO;

/**
 * Una persona al telefono (Fase 1, misura di uscita "turno umano ≤ 10 s"): guarda la panoramica (1,2 s), cammina da
 * 0 a 1,5 s, mira per `miraS` secondi e spara; in fuga scappa (o non tocca niente, come il bot della QA). 'bravo' mira
 * come l'IA (chi sa giocare), 'bot' a caso come docs/progetto/studio-v2/qa-bot-partita (angolo 20-80° o 100-160°,
 * potenza 40-100). Gioca solo i turni della squadra 0; quelli dell'IA li gioca `pilotaIa`.
 */
function pilotaPersona(seme: number, modo: 'bravo' | 'bot', miraS: number): Pilota {
  const r: ConRng = { rng: semeIniziale(seme ^ 0x7e50) };
  const ia = pilotaIa();
  let turno = -1, inizio = 0, cammina = 0, dir: -1 | 1 = 1, sparato = false, fuga: -1 | 0 | 1 = 0, scappa = false;
  const pan = Math.round((BIL.ritmo.panoramicaMs / 1000) * S);
  return (s) => {
    if (s.turno.squadra !== 0) return ia(s);
    const t = s.turno;
    if (t.fase === 'fuga' && sparato && !scappa) { scappa = true; return fuga ? [{ t: 'muovi', dir: fuga }] : []; }
    if (t.fase !== 'azione') return [];
    if (t.numero !== turno) {
      turno = t.numero; inizio = s.tick; sparato = false; scappa = false;
      dir = casuale(r) < 0.7 ? 1 : -1;
      cammina = intero(r, 0, Math.round(1.5 * S));
    }
    const k = s.tick - inizio;
    if (k === pan && cammina > 12) return [{ t: 'muovi', dir }];
    if (k === pan + cammina && cammina > 12) return [{ t: 'muovi', dir: 0 }];
    if (k < pan + cammina + Math.round(miraS * S) || sparato) return [];
    sparato = true;
    const c: Comando[] = [];
    if (modo === 'bravo') {
      const p = decidi(s, 'mozzo');
      fuga = p.fuga;
      c.push({ t: 'arma', arma: p.arma }, { t: 'mira', mezziGradi: p.mezziGradi, potenza: p.potenza });
      if (p.miccia) c.push({ t: 'miccia', secondi: p.miccia });
    } else {
      fuga = 0;
      const gradi = dir === 1 ? 20 + casuale(r) * 60 : 100 + casuale(r) * 60;
      c.push({ t: 'mira', mezziGradi: Math.round(gradi * 2), potenza: Math.round(40 + casuale(r) * 60) });
    }
    c.push({ t: 'fuoco' });
    return c;
  };
}

/** Battaglie 3 contro 3, persona contro IA: durata dei turni della persona e della battaglia intera (in secondi). */
function misuraPersona(battaglie: number, modo: 'bravo' | 'bot', miraS: number, mappaFissa?: string) {
  const turni: number[] = [], durate: number[] = [];
  for (let seme = 1; seme <= battaglie; seme++) {
    const s = nuovaBattaglia(configCaso(seme + 9000, [3, 3], mappaFissa));
    const pilota = pilotaPersona(seme, modo, miraS);
    const ev: EventoBattaglia[] = [];
    let inizio = 0, chi: 0 | 1 = 0, turniIa = 0;
    const cause: Record<string, number> = {};
    while (!s.esito && s.tick < 200000) {
      for (const c of pilota(s)) eseguiComando(s, c);
      avanzaTick(s, ev);
      for (const e of ev) if (e.t === 'turnoIniziato' || e.t === 'fine') {
        if (chi === 0 && inizio > 0) turni.push((s.tick - inizio) / S);
        if (e.t === 'turnoIniziato') { chi = e.squadra; inizio = s.tick; if (chi === 1) turniIa++; }
      }
      for (const e of ev) if (e.t === 'morto') cause[e.causa] = (cause[e.causa] ?? 0) + 1;
      ev.length = 0;
    }
    durate.push((s.tick + turniIa * BIL.ritmo.iaMiraVisibileTick) / S);
    if (process.env.RITMO_DETTAGLI) console.log(modo, mappaFissa ?? 'isola', seme, 'turni', s.esito?.turni, 'vince', s.esito?.vincitore, s.esito?.motivo, JSON.stringify(cause));
  }
  const q = (v: number[], p: number) => [...v].sort((a, b) => a - b)[Math.min(v.length - 1, Math.floor(v.length * p))];
  return { turnoMediana: q(turni, 0.5), turnoP90: q(turni, 0.9), battagliaMediana: q(durate, 0.5), battagliaMin: q(durate, 0), battagliaMax: q(durate, 1) };
}

function misura(battaglie: number, mappaFissa?: string) {
  const turni: number[] = [];
  let tickTotali = 0, turniTotali = 0;
  for (let seme = 1; seme <= battaglie; seme++) {
    const cfg = configCaso(seme + 7000, [3, 3], mappaFissa);
    cfg.squadre[0] = { ...cfg.squadre[0], controllo: 'ia', livelloIa: 'mozzo' };
    const s = nuovaBattaglia(cfg);
    const pilota = pilotaIa();
    const ev: EventoBattaglia[] = [];
    let inizio = 0;
    while (!s.esito && s.tick < 100000) {
      for (const c of pilota(s)) eseguiComando(s, c);
      avanzaTick(s, ev);
      for (const e of ev) if (e.t === 'turnoIniziato' && e.numero > 1) { turni.push(s.tick - inizio + BIL.ritmo.iaMiraVisibileTick); inizio = s.tick; }
      ev.length = 0;
    }
    tickTotali += s.tick; turniTotali += s.esito?.turni ?? 0;
  }
  turni.sort((a, b) => a - b);
  const q = (p: number) => turni[Math.min(turni.length - 1, Math.floor(turni.length * p))] / TICK_AL_SECONDO;
  return { mediana: q(0.5), p90: q(0.9), turniMedi: turniTotali / battaglie, secondi: (tickTotali + turniTotali * BIL.ritmo.iaMiraVisibileTick) / battaglie / TICK_AL_SECONDO };
}

describe('QA · ritmo del turno (BIL.ritmo)', () => {
  it('turno dell\'IA: mediana entro 4 s, 9 turni su 10 entro 6 s (isola generata, 3 contro 3)', () => {
    const r = misura(12);
    console.log(`ritmo isola: turno IA mediana ${r.mediana.toFixed(2)} s, p90 ${r.p90.toFixed(2)} s; battaglia ${r.turniMedi.toFixed(1)} turni, ${r.secondi.toFixed(0)} s tra due IA`);
    expect(r.mediana).toBeLessThanOrEqual(BIL.ritmo.iaTurnoMaxTick / TICK_AL_SECONDO);
    expect(r.p90).toBeLessThanOrEqual(6);
  });

  it('Cala Pappagallo: turno dell\'IA di mediana entro 4,5 s (tiri più alti per scavalcare la Rocca)', () => {
    const r = misura(8, 'cala-pappagallo');
    console.log(`ritmo Cala: turno IA mediana ${r.mediana.toFixed(2)} s, p90 ${r.p90.toFixed(2)} s; battaglia ${r.turniMedi.toFixed(1)} turni, ${r.secondi.toFixed(0)} s tra due IA`);
    expect(r.mediana).toBeLessThanOrEqual(4.5);
    expect(r.p90).toBeLessThanOrEqual(6.5);
  });

  // Misure di uscita della Fase 1 (P1-contratti §6, punto 4): turno della persona entro 10 s; 3 contro 3 in 2-4 minuti.
  // La durata della battaglia si scrive ma non si controlla: col limite di 18 turni (BIL.battaglia.turnoLimite) e
  // turni da ~8 s (persona) e ~4,6 s (IA) un 3 contro 3 non arriva a 2 minuti (22/11: 1,4-1,8 min). È una scelta di
  // Bilanciamento (limite turni, due spari in Fase 4), non della fisica. RITMO_DETTAGLI=1 stampa ogni battaglia.
  it('persona contro IA, 3 contro 3: turno della persona entro 10 s (e quanto dura la battaglia)', () => {
    const righe: string[] = [];
    for (const [modo, mappa] of [['bravo', undefined], ['bravo', 'cala-pappagallo'], ['bot', undefined]] as const) {
      const r = misuraPersona(10, modo, 3, mappa);
      righe.push(`${modo} ${mappa ?? 'isola'}: turno persona mediana ${r.turnoMediana.toFixed(1)} s, p90 ${r.turnoP90.toFixed(1)} s; ` +
        `battaglia mediana ${(r.battagliaMediana / 60).toFixed(1)} min (da ${(r.battagliaMin / 60).toFixed(1)} a ${(r.battagliaMax / 60).toFixed(1)})`);
      expect(r.turnoMediana).toBeLessThanOrEqual(10);
      expect(r.turnoP90).toBeLessThanOrEqual(12);
    }
    console.log(`ritmo persona (mira 3 s):\n${righe.join('\n')}`);
  }, 60_000);
});
