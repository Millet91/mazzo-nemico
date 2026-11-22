// Ritmo della battaglia (studio v2, Fase 1; BIL.ritmo): quanto dura un turno giocato dal bot, IA contro IA.
// Il bot spara al primo tick d'azione: al turno vero dell'IA vanno aggiunti gli 0,8 s di mira visibile
// (BIL.ritmo.iaMiraVisibileTick). Obiettivo del PIANO: turno dell'IA entro 4 s; 3 contro 3 in 2-4 minuti.
import { describe, it, expect } from 'vitest';
import type { EventoBattaglia } from '../../src/core/tipi';
import { avanzaTick, eseguiComando } from '../../src/battaglia/sim';
import { BIL, TICK_AL_SECONDO } from '../../src/contenuti/bilanciamento';
import { configCaso, nuovaBattaglia, pilotaIa } from './banco';

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
});
