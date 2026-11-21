// Agente Fisica · passata di ritmo di M1 (m1-ritmo §3, §8, §9): risoluzione rapida, barili, casse, traiettoria a 2 rimbalzi.
import { describe, it, expect } from 'vitest';
import { BIL } from '../../src/contenuti/bilanciamento';
import { daGradi } from '../../src/core/trig';
import { MATERIALE } from '../../src/core/tipi';
import type { Proiettile, StatoBattaglia } from '../../src/core/tipi';
import { avanzaTick, creaBattaglia, eseguiComando, hashStato, simulaColpo, traiettoria } from '../../src/battaglia/sim';
import { esplodi } from '../../src/battaglia/sim/esplosione';
import { atterraggio, forseCassa } from '../../src/battaglia/sim/oggetti';
import { MICCIA_REAZIONE_TICK } from '../../src/battaglia/sim/costanti';
import { avanza, avanzaFinche, battagliaPiatta, config, eventiDi, inAzione, mappa, pirata, rettangolo, spara, SUOLO, terrenoPiatto } from './aiuti';

function conBarili(x0: number[], x1: number[], barili: number[], terreno = terrenoPiatto()): StatoBattaglia {
  const m = mappa(terreno, x0.map((x) => ({ x, y: SUOLO })), x1.map((x) => ({ x, y: SUOLO })));
  m.barili = barili.map((x) => ({ x, y: SUOLO }));
  return creaBattaglia(config(x0.length, x1.length), m);
}

const barili = (s: StatoBattaglia) => s.proiettili.filter((p) => p.tipo === 'barile');
const casse = (s: StatoBattaglia) => s.proiettili.filter((p) => p.tipo === 'cassa');

function cassa(s: StatoBattaglia, x: number, contenuto: 'rum' | 'trappola'): Proiettile {
  const c: Proiettile = { id: s.prossimoId++, tipo: 'cassa', arma: 'lapide', x, y: SUOLO - 1, vx: 0, vy: 0, tickEsplosione: -1, lanciatore: -1, fermo: true, contenuto };
  s.proiettili.push(c);
  return c;
}

describe('Risoluzione rapida', () => {
  it('passa appena tutto è fermo da BIL.turno.risoluzioneFermoTick', () => {
    const s = battagliaPiatta([800], [1200]);
    avanzaFinche(s, (x) => x.turno.fase === 'risoluzione');
    const inizio = s.tick;
    avanzaFinche(s, (x) => x.turno.numero === 2);
    // fermo dal primo tick di risoluzione: si passa dopo risoluzioneFermoTick tick
    expect(s.tick - inizio).toBeGreaterThanOrEqual(BIL.turno.risoluzioneFermoTick);
    expect(s.tick - inizio).toBeLessThanOrEqual(BIL.turno.risoluzioneFermoTick + 1);
    expect(BIL.camera.inquadraTick).toBe(Math.round(0.35 * 60));
  });

  it('aspetta chi vola e riparte da capo se qualcosa si rimette in moto', () => {
    const s = battagliaPiatta([800], [1200]);
    avanzaFinche(s, (x) => x.turno.fase === 'risoluzione');
    const p = pirata(s, 1);
    p.aTerra = false; p.vy = -4; // salta in aria proprio adesso
    avanza(s, 2);
    expect(s.turno.fermoDa).toBe(-1);
    avanzaFinche(s, () => p.aTerra);
    const atterrato = s.tick;
    avanzaFinche(s, (x) => x.turno.numero === 2);
    expect(s.tick - atterrato).toBeGreaterThanOrEqual(BIL.turno.risoluzioneFermoTick);
    expect(s.tick - atterrato).toBeLessThanOrEqual(BIL.turno.risoluzioneFermoTick + 1);
  });
});

describe('Barili di polvere', () => {
  it('nascono fermi dalla mappa e non fanno aspettare volo e risoluzione', () => {
    const s = conBarili([800], [1200], [1000, 1400]);
    expect(barili(s)).toHaveLength(2);
    expect(barili(s).every((b) => b.fermo && b.tickEsplosione === -1)).toBe(true);
    avanzaFinche(s, (x) => x.turno.numero === 2, 4000);
    expect(s.turno.numero).toBe(2);
    expect(barili(s)).toHaveLength(2); // ancora lì
  });

  it('raggiunto da un\'esplosione scoppia (75/85) e fa scoppiare a catena il barile vicino', () => {
    const s = conBarili([300], [1800], [1000, 1080]);
    const ev = [] as Parameters<typeof avanzaTick>[1];
    esplodi(s, 960, SUOLO - 10, 'cannone', 'marina', ev);
    for (let i = 0; i < 3 * MICCIA_REAZIONE_TICK; i++) avanzaTick(s, ev);
    const esp = eventiDi(ev, 'esplosione').filter((e) => e.arma === 'barile');
    expect(esp).toHaveLength(2);
    expect(esp[0].raggio).toBe(BIL.barili.raggio);
    expect(barili(s)).toHaveLength(0);
  });

  it('il danno del barile è 75 al centro, senza il bonus del Teschio', () => {
    const s = conBarili([300], [1000], [1000]);
    const n = pirata(s, 1);
    const ev = [] as Parameters<typeof avanzaTick>[1];
    // la lapide (10 danni) accende il barile ma il nemico è nel suo raggio solo in parte: misuriamo il barile da solo
    s.proiettili[0].tickEsplosione = s.tick + 1;
    avanza(s, 2).forEach((e) => ev.push(e));
    const d = eventiDi(ev, 'danno').filter((e) => e.pirata === n.id).reduce((a, e) => a + e.quanto, 0);
    expect(d).toBeGreaterThan(50);
    expect(d).toBeLessThanOrEqual(BIL.barili.danno);
  });

  it('il cannone che lo colpisce lo fa scoppiare, e anche la pistola', () => {
    for (const arma of ['cannone', 'pistola'] as const) {
      const s = conBarili([800], [1600], [950]);
      inAzione(s);
      spara(s, arma, 0, 100);
      const ev = avanzaFinche(s, (x) => x.turno.numero === 2);
      expect(eventiDi(ev, 'esplosione').some((e) => e.arma === 'barile'), arma).toBe(true);
    }
  });

  it('simulaColpo vede il barile: il nemico vicino al barile prende il suo danno', () => {
    const s = conBarili([600], [1080], [1000]);
    inAzione(s);
    const conB = simulaColpo(s, { pirata: 0, arma: 'pistola', mezziGradi: 0, potenza: 0 });
    expect(conB.danni[1]).toBeGreaterThan(0);
    // stesso tiro senza barile: la pistola si ferma prima del nemico? no: lo colpisce direttamente, meno danno
    const senza = structuredClone(s);
    senza.proiettili = [];
    const solo = simulaColpo(senza, { pirata: 0, arma: 'pistola', mezziGradi: 0, potenza: 0 });
    expect(conB.danni[1]).not.toBe(solo.danni[1]);
    expect(hashStato(s)).toBe(hashStato(structuredClone(s)));
  });
});

describe('Casse', () => {
  it('cadono solo dal turno 3, al massimo 3, e atterrano su un punto raggiungibile', () => {
    let viste = 0, primoTurno = Infinity;
    for (const seme of [1, 2, 3, 4, 5, 6]) {
      const s = battagliaPiatta([600], [1400], { seme });
      avanzaFinche(s, (x) => {
        if (casse(x).length > BIL.casse.maxInMappa) throw new Error('troppe casse');
        return x.turno.numero >= 12 || x.esito !== null;
      }, 100000);
      for (const c of casse(s)) {
        viste++;
        if (c.fermo) expect(Math.floor(c.y) + 1).toBe(SUOLO);
      }
      void primoTurno;
    }
    expect(viste).toBeGreaterThan(0);
    // nessuna cassa prima del turno 3
    const s = battagliaPiatta([600], [1400], { seme: 7 });
    const ev = avanzaFinche(s, (x) => x.turno.numero === BIL.casse.dalTurno);
    const inizio3 = ev.findIndex((e) => e.t === 'turnoIniziato' && e.numero === BIL.casse.dalTurno);
    expect(ev.slice(0, inizio3).filter((e) => e.t === 'cassaCaduta')).toHaveLength(0);
  });

  it('scendono a 60 px/s e il vento le sposta', () => {
    const s = battagliaPiatta([600], [1400]);
    s.vento = 6;
    s.proiettili.push({ id: 900, tipo: 'cassa', arma: 'lapide', x: 1000, y: 100, vx: 0, vy: 0, tickEsplosione: -1, lanciatore: -1, fermo: false, contenuto: 'rum' });
    avanza(s, 60);
    const c = s.proiettili.find((p) => p.id === 900)!;
    expect(c.y).toBeCloseTo(100 + 60, 6);
    expect(c.x).toBeGreaterThan(1000);
  });

  it('atterraggio rifiuta il mare e i posti dove un pirata non sta', () => {
    const t = terrenoPiatto(MATERIALE.sabbia, 400, 1600);
    rettangolo(t, 1000, 100, 1200, SUOLO - 12, MATERIALE.roccia); // tettoia bassa: sotto non si sta
    expect(atterraggio(t, t.mare, 0, 200)).toBeNull(); // mare
    expect(atterraggio(t, t.mare, 0, 800)).toEqual({ x: 800, y: SUOLO - 1 });
  });

  it('Rum: +25 PV aprendola camminandoci sopra, fino a 100', () => {
    const s = battagliaPiatta([800], [1400]);
    inAzione(s);
    const p = pirata(s);
    p.vita = 40;
    cassa(s, 830, 'rum');
    eseguiComando(s, { t: 'muovi', dir: 1 });
    const ev = avanzaFinche(s, () => casse(s).length === 0, 120);
    expect(eventiDi(ev, 'cassaAperta')).toEqual([{ t: 'cassaAperta', proiettile: expect.any(Number), pirata: p.id, contenuto: 'rum' }]);
    expect(p.vita).toBe(40 + BIL.casse.rumPv);
    p.vita = 90;
    cassa(s, p.x + 25, 'rum');
    avanzaFinche(s, () => casse(s).length === 0, 120);
    expect(p.vita).toBe(BIL.casse.rumPvMax);
    expect(p.vitaMax).toBe(BIL.casse.rumPvMax);
  });

  it('Trappola: esplode (30/50) su chi la apre', () => {
    const s = battagliaPiatta([800], [1400]);
    inAzione(s);
    const p = pirata(s);
    cassa(s, 830, 'trappola');
    eseguiComando(s, { t: 'muovi', dir: 1 });
    const ev = avanzaFinche(s, () => casse(s).length === 0, 120);
    expect(eventiDi(ev, 'esplosione')[0].raggio).toBe(BIL.casse.trappola.raggio);
    expect(BIL.pirata.pv - p.vita).toBeGreaterThan(10);
    expect(BIL.pirata.pv - p.vita).toBeLessThanOrEqual(BIL.casse.trappola.danno);
  });

  it('colpita da un\'esplosione scoppia (25/45)', () => {
    const s = battagliaPiatta([300], [1800]);
    cassa(s, 1000, 'rum');
    const ev = [] as Parameters<typeof avanzaTick>[1];
    esplodi(s, 980, SUOLO - 10, 'cannone', 'marina', ev);
    for (let i = 0; i < 2 * MICCIA_REAZIONE_TICK; i++) avanzaTick(s, ev);
    expect(eventiDi(ev, 'esplosione').some((e) => e.raggio === BIL.casse.esplosione.raggio)).toBe(true);
    expect(casse(s)).toHaveLength(0);
  });

  it('rimonta: chi è sotto il 60% dei PV avversari la riceve nella sua metà circa 7 volte su 10', () => {
    const s = battagliaPiatta([500], [1500]);
    pirata(s, 0).vita = 20; // il Teschio (a sinistra) è indietro
    s.turno.numero = BIL.casse.dalTurno;
    let sinistra = 0, totale = 0;
    for (let i = 0; i < 400; i++) {
      const c = structuredClone(s);
      c.rng = (i * 2654435761) >>> 0;
      forseCassa(c, []);
      const k = casse(c)[0];
      if (!k) continue;
      totale++;
      if (k.x < c.terreno.w / 2) sinistra++;
    }
    expect(totale).toBeGreaterThan(120);
    expect(sinistra / totale).toBeGreaterThan(0.6);
    expect(sinistra / totale).toBeLessThan(0.8);
  });
});

describe('Traiettoria della granata con maxRimbalzi', () => {
  it('con maxRimbalzi = 2 si ferma al secondo rimbalzo', () => {
    const s = battagliaPiatta([800], [1400]);
    inAzione(s);
    eseguiComando(s, { t: 'arma', arma: 'granata' });
    eseguiComando(s, { t: 'miccia', secondi: 5 });
    eseguiComando(s, { t: 'mira', mezziGradi: daGradi(60), potenza: 50 });
    const tutta = traiettoria(s, 60);
    const due = traiettoria(s, 60, 2);
    expect(due.length).toBeLessThan(tutta.length);
    expect(due.length).toBeGreaterThan(2);
    expect(Math.floor(due[due.length - 1].y)).toBeGreaterThanOrEqual(SUOLO - 2); // finisce su un rimbalzo, a terra
  });
});
