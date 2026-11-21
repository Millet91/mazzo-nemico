// Ciclo di gioco senza grafica: comandi timbrati, replay, pausa, turni dell'IA.
import { describe, it, expect } from 'vitest';
import { Partita, interpolaMira } from '../../src/battaglia/partita/partita';
import { creaVista, visteUguali } from '../../src/battaglia/partita/vista';
import { avanzaTick, creaBattaglia, eseguiComando, hashStato } from '../../src/battaglia/sim';
import { generaMappa } from '../../src/battaglia/gen';
import type { ClientIa } from '../../src/battaglia/ia';
import type { ConfigBattaglia, EventoBattaglia, PianoIa } from '../../src/core/tipi';
import { VERSIONE_REGOLE } from '../../src/core/tipi';
import { BIL } from '../../src/contenuti/bilanciamento';

const FRAME = 1000 / 60;

function config(controllo1: 'ia' | 'umano' = 'ia', controllo0: 'ia' | 'umano' = 'umano'): ConfigBattaglia {
  return {
    versioneRegole: VERSIONE_REGOLE, seme: 4242, bioma: 'isola', timerSecondi: 30, traiettoriaCompleta: true,
    squadre: [
      { ciurma: 'teschio', ruolo: 'attaccante', controllo: controllo0, livelloIa: 'mozzo', pirati: 3 },
      { ciurma: 'marina', ruolo: 'difensore', controllo: controllo1, livelloIa: 'mozzo', pirati: 3 },
    ],
  };
}

/** IA finta: risponde subito con un piano fisso */
function iaFinta(piano: Partial<PianoIa> = {}): ClientIa & { chiusa: boolean; chiamate: number } {
  const c = {
    chiusa: false, chiamate: 0,
    pensa: () => { c.chiamate++; return Promise.resolve({ arma: 'cannone', mezziGradi: 270, potenza: 70, fuga: 1, punteggio: 1, ...piano } as PianoIa); },
    chiudi: () => { c.chiusa = true; },
  };
  return c;
}

const microtask = () => new Promise((r) => setTimeout(r, 0));

function frames(p: Partita, n: number, d = FRAME): EventoBattaglia[] {
  const out: EventoBattaglia[] = [];
  for (let i = 0; i < n; i++) out.push(...p.aggiorna(d));
  return out;
}

describe('Partita · ciclo di gioco', () => {
  it('avanza a 60 tick al secondo e al massimo 5 tick per frame', () => {
    const p = new Partita(config(), { ia: iaFinta() });
    frames(p, 60);
    expect(p.s.tick).toBe(60);
    p.aggiorna(1000);
    expect(p.s.tick).toBe(65);
  });

  it('i comandi del giocatore si timbrano col tick e finiscono nel replay', () => {
    const p = new Partita(config(), { ia: iaFinta() });
    frames(p, BIL.camera.inquadraTick + 2); // fine dell'inquadratura: fase azione
    expect(p.s.turno.fase).toBe('azione');
    const tick = p.s.tick;
    p.comandoUmano({ t: 'mira', mezziGradi: 100, potenza: 80 });
    p.comandoUmano({ t: 'muovi', dir: 1 });
    frames(p, 1);
    expect(p.replay.comandi).toEqual([
      { tick, c: { t: 'mira', mezziGradi: 100, potenza: 80 } },
      { tick, c: { t: 'muovi', dir: 1 } },
    ]);
    expect(p.s.turno.mira).toEqual({ mezziGradi: 100, potenza: 80 });
  });

  it('il replay registrato, rigiocato con la sim, dà lo stesso hash', async () => {
    const p = new Partita(config(), { ia: iaFinta() });
    frames(p, 50);
    p.comandoUmano({ t: 'mira', mezziGradi: 90, potenza: 65 });
    frames(p, 10);
    p.comandoUmano({ t: 'fuoco' });
    for (let i = 0; i < 40; i++) { frames(p, 30); await microtask(); }
    const fine = p.s.tick;
    expect(p.replay.comandi.length).toBeGreaterThan(2);

    const s = creaBattaglia(p.config, generaMappa({ seme: p.config.seme, bioma: 'isola', piratiPerLato: [3, 3] }));
    const ev: EventoBattaglia[] = [];
    let k = 0;
    while (s.tick < fine) {
      while (k < p.replay.comandi.length && p.replay.comandi[k].tick === s.tick) eseguiComando(s, p.replay.comandi[k++].c);
      avanzaTick(s, ev);
    }
    expect(hashStato(s)).toBe(hashStato(p.s));
  });

  it("durante il turno dell'IA i comandi del giocatore si ignorano (tranne la ritirata)", () => {
    const p = new Partita(config('umano', 'ia'), { ia: iaFinta() });
    expect(p.toccaIa).toBe(true);
    p.comandoUmano({ t: 'fuoco' });
    p.comandoUmano({ t: 'ritirata' });
    frames(p, 1);
    expect(p.replay.comandi.map((c) => c.c.t)).toEqual(['ritirata']);
  });

  it("turno dell'IA: medita almeno pensieroMinimoMs, anima la mira, spara e fugge", async () => {
    const ia = iaFinta({ mezziGradi: 300, potenza: 90, fuga: -1 });
    const p = new Partita(config('umano', 'ia'), { ia });
    expect(creaVista(p.s, p.iaPensa).tocca).toBe('ia');
    frames(p, 1);
    await microtask();
    expect(p.iaPensa).toBe(true);
    // prima della meditazione minima nessun comando
    frames(p, Math.floor(BIL.ia.pensieroMinimoMs / FRAME) - 2); await microtask();
    expect(p.replay.comandi).toEqual([]);
    // dopo la meditazione e l'animazione della mira (0,6 s) arriva il fuoco
    for (let i = 0; i < 12; i++) { frames(p, 10); await microtask(); }
    const tipi = p.replay.comandi.map((c) => c.c.t);
    expect(p.iaPensa).toBe(false);
    expect(tipi).toContain('mira');
    expect(tipi.filter((t) => t === 'fuoco')).toHaveLength(1);
    const iFuoco = tipi.indexOf('fuoco');
    expect(iFuoco).toBeGreaterThan(0);
    const primaMira = p.replay.comandi.find((c) => c.c.t === 'mira')!;
    const fuoco = p.replay.comandi[iFuoco];
    // l'animazione della mira dura circa animazioneMiraMs
    expect((fuoco.tick - primaMira.tick) * FRAME).toBeGreaterThanOrEqual(BIL.ia.animazioneMiraMs - 3 * FRAME);
    // l'ultima mira prima del fuoco è quella del piano
    const mire = p.replay.comandi.filter((c) => c.c.t === 'mira');
    expect(mire[mire.length - 1].c).toEqual({ t: 'mira', mezziGradi: 300, potenza: 90 });
    // in fuga corre nella direzione del piano
    for (let i = 0; i < 6; i++) { frames(p, 10); await microtask(); }
    expect(p.replay.comandi.some((c) => c.c.t === 'muovi' && c.c.dir === -1)).toBe(true);
    expect(ia.chiamate).toBe(1);
  });

  it("chiudi() chiude l'IA e ferma il ciclo", () => {
    const ia = iaFinta();
    const p = new Partita(config(), { ia });
    p.chiudi();
    const t = p.s.tick;
    frames(p, 10);
    expect(p.s.tick).toBe(t);
    expect(ia.chiusa).toBe(true);
  });

  it('sospendi(): al rientro dalla pausa niente tick recuperati', () => {
    const p = new Partita(config(), { ia: iaFinta() });
    p.aggiorna(FRAME * 0.9);
    p.sospendi();
    p.aggiorna(FRAME * 0.5);
    expect(p.s.tick).toBe(0);
  });
});

describe('Mira animata dell\'IA', () => {
  it('passa per la via più corta e finisce esatta', () => {
    expect(interpolaMira({ mezziGradi: 700, potenza: 0 }, { mezziGradi: 20, potenza: 100 }, 0.5)).toEqual({ mezziGradi: 0, potenza: 50 });
    expect(interpolaMira({ mezziGradi: 90, potenza: 60 }, { mezziGradi: 270, potenza: 80 }, 1)).toEqual({ mezziGradi: 270, potenza: 80 });
    expect(interpolaMira({ mezziGradi: 90, potenza: 60 }, { mezziGradi: 270, potenza: 80 }, 0)).toEqual({ mezziGradi: 90, potenza: 60 });
  });
});

describe('VistaBattaglia', () => {
  it("riporta turno, timer, PV e chi gioca; uguale a se stessa", () => {
    const p = new Partita(config(), { ia: iaFinta() });
    const v = creaVista(p.s, false);
    expect(v.numeroTurno).toBe(1);
    expect(v.squadre[0].vivi).toBe(3);
    expect(v.squadre[0].pvTotali).toBe(3 * BIL.pirata.pv);
    expect(v.secondiRimasti).toBe(30);
    expect(v.turnoLimite).toBe(BIL.battaglia.turnoLimite);
    expect(v.puoArrendersi).toBe(false);
    expect(visteUguali(v, creaVista(p.s, false))).toBe(true);
    expect(visteUguali(v, creaVista(p.s, true))).toBe(false);
    expect(visteUguali(null, v)).toBe(false);
  });

  it("puoArrendersi dal turno 4 se l'umano attacca", () => {
    const p = new Partita(config(), { ia: iaFinta() });
    p.s.turno.numero = BIL.battaglia.ritirataDalTurno;
    expect(creaVista(p.s, false).puoArrendersi).toBe(true);
  });
});

describe('Partita · con la sim, le mappe e l\'IA vere', () => {
  it('una battaglia 5v5 IA contro IA arriva alla fine, con spari a ogni turno', async () => {
    const { configProva } = await import('../../src/battaglia/partita/statistiche-prova');
    const p = new Partita(configProva(2));
    let spari = 0, turni = 0, f = 0;
    while (!p.s.esito && f < 60 * 60 * 5) {
      for (const e of p.aggiorna(FRAME)) { if (e.t === 'sparo') spari++; if (e.t === 'turnoIniziato') turni++; }
      if (++f % 10 === 0) await microtask();
    }
    p.chiudi();
    expect(p.s.esito).not.toBeNull();
    expect(spari).toBeGreaterThanOrEqual(turni - 1);
    expect(p.replay.tickFinale).toBe(p.s.tick);
  }, 60_000);
});
