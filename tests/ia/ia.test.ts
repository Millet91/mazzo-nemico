// Test dell'IA di battaglia (agente E). Piano QA M1 §L1 "E IA": stessa mossa dallo stesso stato, piano valido
// entro il budget (in simulazioni, non in ms), il Mozzo colpisce un bersaglio fermo a 400 px nella maggior
// parte dei casi, niente tiri suicidi.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decidi, creaIa, fotografia } from '../../src/battaglia/ia';
import { decidiCon, potenzaPer, angoloVerso, punteggio, armiUsabili } from '../../src/battaglia/ia/pianifica';
import { passiSicuri } from '../../src/battaglia/ia/terreno';
import { hashStato, simulaColpo, creaBattaglia, avanzaTick, eseguiComando } from '../../src/battaglia/sim';
import { generaMappa } from '../../src/battaglia/gen';
import { BIL } from '../../src/contenuti/bilanciamento';
import { ARMI_ATTIVE } from '../../src/contenuti/armi';
import { coseno, seno } from '../../src/core/trig';
import type { EventoBattaglia, PianoIa, StatoBattaglia } from '../../src/core/tipi';
import { duello, simulaIdeale, contatore, config, SUOLO } from './scenari';

const MOZZO = BIL.ia.livelli.mozzo;
const simSegnaposto = readFileSync('src/battaglia/sim/index.ts', 'utf8').includes('IMPLEMENTAZIONE SEGNAPOSTO');

function valido(p: PianoIa) {
  expect(ARMI_ATTIVE).toContain(p.arma);
  expect(Number.isInteger(p.mezziGradi) && p.mezziGradi >= 0 && p.mezziGradi < 720).toBe(true);
  expect(Number.isInteger(p.potenza) && p.potenza >= 0 && p.potenza <= 100).toBe(true);
  expect([-1, 0, 1]).toContain(p.fuga);
  expect(p.camminata).toBeUndefined(); // Mozzo: nessuno spostamento prima di sparare
  if (p.miccia !== undefined) expect(p.miccia >= 1 && p.miccia <= 5).toBe(true);
}

describe('IA · basi', () => {
  it('potenzaPer: la parabola calcolata arriva sul bersaglio', () => {
    for (const [dx, h, gradi] of [[400, 0, 45], [300, 80, 60], [600, -100, 30]]) {
      const p = potenzaPer(dx, h, gradi * 2)!;
      const t = dx / ((BIL.fisica.velocitaMaxProiettile * p / 100) * coseno(gradi * 2));
      const yArrivo = (BIL.fisica.velocitaMaxProiettile * p / 100) * seno(gradi * 2) * t - (BIL.fisica.gravita * t * t) / 2;
      expect(Math.abs(yArrivo - h)).toBeLessThan(0.5);
    }
    expect(potenzaPer(100, 200, 40)).toBeNull(); // bersaglio troppo in alto per 20°
  });

  it('angoloVerso usa la convenzione di core/trig (0 destra, 180 su)', () => {
    expect(angoloVerso(10, 0)).toBe(0);
    expect(angoloVerso(0, 10)).toBe(180);
    expect(angoloVerso(-10, 0)).toBe(360);
    expect(angoloVerso(10, 10)).toBe(90);
  });

  it('armi: solo quelle del livello che la squadra possiede (niente barile in M1)', () => {
    const s = duello(800, 1200);
    expect(armiUsabili(s, 1, MOZZO)).toEqual(['cannone', 'granata', 'pistola', 'sciabola']);
  });

  it('punteggio di 01 §8: +60 uccisione, +80 annegamento, −1,5 amici, −2 sé, −200 in mare', () => {
    const s = duello(800, 1200);
    const io = s.pirati.find((p) => p.squadra === 1)!;
    const nem = s.pirati.find((p) => p.squadra === 0)!;
    const e = (d: Record<number, number>, uccisi: number[] = [], annegati: number[] = []) => ({ danni: d, uccisi, annegati, impatto: null, tick: 1 });
    expect(punteggio(s, io, e({ [nem.id]: 30 }))).toBe(30);
    expect(punteggio(s, io, e({ [nem.id]: 70 }, [nem.id]))).toBe(130);
    expect(punteggio(s, io, e({}, [], [nem.id]))).toBe(80);
    expect(punteggio(s, io, e({ [io.id]: 10 }))).toBe(-20);
    expect(punteggio(s, io, e({}, [], [io.id]))).toBe(-200);
  });
});

describe('IA · determinismo e budget', () => {
  it('stesso stato ⇒ stesso piano, e lo stato non cambia', () => {
    const s = duello(800, 1200, { vento: 4 });
    const prima = hashStato(s), rng = s.rng, maschera = s.terreno.maschera.slice();
    const a = decidiCon(s, 'mozzo', simulaIdeale);
    const b = decidiCon(s, 'mozzo', simulaIdeale);
    expect(a).toEqual(b);
    expect(hashStato(s)).toBe(prima);
    expect(s.rng).toBe(rng);
    expect(Buffer.from(s.terreno.maschera).equals(Buffer.from(maschera))).toBe(true);
    expect(s.vento).toBe(4);
  });

  it('stesso risultato su una copia clonata (come nel worker)', () => {
    const s = duello(700, 1250, { vento: -3 });
    expect(decidiCon(structuredClone(s), 'mozzo', simulaIdeale)).toEqual(decidiCon(s, 'mozzo', simulaIdeale));
  });

  it('seme diverso ⇒ la scelta può cambiare (usa il PRNG proprio, non quello della battaglia)', () => {
    const piani = new Set<string>();
    for (let seme = 1; seme <= 20; seme++) piani.add(JSON.stringify(decidiCon(duello(800, 1200, { seme }), 'mozzo', simulaIdeale)));
    expect(piani.size).toBeGreaterThan(1);
  });

  it(`non supera le ${MOZZO.simulazioni} simulazioni del Mozzo`, () => {
    for (const [xb, xi] of [[800, 1200], [1150, 1200], [300, 1700], [1000, 1010]]) {
      const c = contatore(simulaIdeale);
      valido(decidiCon(duello(xb, xi), 'mozzo', c.sim));
      expect(c.chiamate).toBeLessThanOrEqual(MOZZO.simulazioni);
      expect(c.chiamate).toBeGreaterThan(0);
    }
  });

  it('anche Nostromo e Capitano restano nel loro budget', () => {
    for (const l of ['nostromo', 'capitano'] as const) {
      const c = contatore(simulaIdeale);
      decidiCon(duello(800, 1200), l, c.sim);
      expect(c.chiamate).toBeLessThanOrEqual(BIL.ia.livelli[l].simulazioni);
    }
  });

  it('gira anche con la sim del contratto (piano valido, stato intatto)', () => {
    const s = duello(800, 1200);
    const prima = hashStato(s);
    valido(decidi(s, 'mozzo'));
    expect(hashStato(s)).toBe(prima);
  });

  it('creaIa senza Worker (Node) risponde come decidi', async () => {
    const s = duello(800, 1200);
    const ia = creaIa();
    expect(await ia.pensa(s, 'mozzo')).toEqual(decidi(s, 'mozzo'));
    ia.chiudi();
  });
});

describe('IA · qualità del Mozzo (fisica ideale, senza vento)', () => {
  /** Il tiro finale (con l'errore umano) colpisce il bersaglio? */
  function colpisce(s: StatoBattaglia, p: PianoIa): boolean {
    const io = s.pirati.find((x) => x.id === s.turno.pirata)!;
    const nem = s.pirati.find((x) => x.squadra !== io.squadra)!;
    const e = simulaIdeale(s, { pirata: io.id, arma: p.arma, mezziGradi: p.mezziGradi, potenza: p.potenza, miccia: p.miccia });
    return (e.danni[nem.id] ?? 0) > 0;
  }

  it('colpisce un bersaglio fermo a 400 px nella maggior parte dei casi', () => {
    let colpi = 0;
    const N = 100;
    for (let seme = 1; seme <= N; seme++) {
      const verso = seme % 2 ? 1 : -1;
      const s = duello(1024 - verso * 200, 1024 + verso * 200, { seme });
      const p = decidiCon(s, 'mozzo', simulaIdeale);
      valido(p);
      if (colpisce(s, p)) colpi++;
    }
    console.log(`Mozzo a 400 px: ${colpi}/${N} colpi a segno`);
    expect(colpi / N).toBeGreaterThan(0.6);
  });

  it('niente tiri suicidi: col nemico dietro un muro vicino non si fa saltare in aria', () => {
    for (let seme = 1; seme <= 40; seme++) {
      // muro di roccia alto 120 px subito davanti all'IA, nemico dietro
      const s = duello(1000, 1100, { seme, muri: [[1070, 1085, SUOLO - 120]] });
      const io = s.pirati.find((x) => x.id === s.turno.pirata)!;
      const p = decidiCon(s, 'mozzo', simulaIdeale);
      const e = simulaIdeale(s, { pirata: io.id, arma: p.arma, mezziGradi: p.mezziGradi, potenza: p.potenza, miccia: p.miccia });
      expect(e.uccisi).not.toContain(io.id);
      expect(e.danni[io.id] ?? 0).toBeLessThan(io.vita / 2);
    }
  });

  it('a contatto usa un colpo che non lo ferisce', () => {
    const s = duello(1180, 1200);
    const io = s.pirati.find((x) => x.id === s.turno.pirata)!;
    const p = decidiCon(s, 'mozzo', simulaIdeale);
    const e = simulaIdeale(s, { pirata: io.id, arma: p.arma, mezziGradi: p.mezziGradi, potenza: p.potenza, miccia: p.miccia });
    expect(e.danni[io.id] ?? 0).toBe(0);
    expect(['sciabola', 'pistola']).toContain(p.arma);
  });

  it('la fuga non porta mai in mare', () => {
    // IA sul bordo destro dell'isola (finisce a x 1848): scappare a destra vorrebbe dire annegare
    for (let seme = 1; seme <= 20; seme++) {
      const s = duello(1700, 1830, { seme });
      const io = s.pirati.find((x) => x.id === s.turno.pirata)!;
      const p = decidiCon(s, 'mozzo', simulaIdeale);
      if (p.fuga !== 0) expect(passiSicuri(s, io, p.fuga, Math.ceil(BIL.turno.fugaTick * BIL.pirata.camminata))).toBeGreaterThanOrEqual(180);
      expect(p.fuga).not.toBe(1);
    }
  });
});

// ── Con la sim vera (agente A): si attivano da soli quando la sim non è più il segnaposto ──
describe.skipIf(simSegnaposto)('IA · con la sim vera', () => {
  it('colpisce un bersaglio fermo a 400 px nella maggior parte dei casi', () => {
    let colpi = 0;
    for (let seme = 1; seme <= 50; seme++) {
      const s = duello(824, 1224, { seme });
      const p = decidi(s, 'mozzo');
      const io = s.pirati.find((x) => x.id === s.turno.pirata)!;
      const nem = s.pirati.find((x) => x.squadra === 0)!;
      const e = simulaColpo(s, { pirata: io.id, arma: p.arma, mezziGradi: p.mezziGradi, potenza: p.potenza, miccia: p.miccia });
      if ((e.danni[nem.id] ?? 0) > 0) colpi++;
    }
    expect(colpi).toBeGreaterThan(25);
  });

  it('una battaglia IA contro IA (3v3, Mozzo) finisce entro il turno limite (piano QA F6)', () => {
    const cfg = config(11);
    cfg.squadre = [{ ...cfg.squadre[0], controllo: 'ia', livelloIa: 'mozzo', pirati: 3 }, { ...cfg.squadre[1], pirati: 3 }];
    const s = creaBattaglia(cfg, generaMappa({ seme: cfg.seme, bioma: 'isola', piratiPerLato: [3, 3] }));
    const ev: EventoBattaglia[] = [];
    let turnoPensato = -1;
    let piano: PianoIa | null = null;
    for (let tick = 0; tick < 60 * 60 * 15 && !s.esito; tick++) {
      if (s.turno.fase === 'azione' && turnoPensato !== s.turno.numero) {
        turnoPensato = s.turno.numero;
        piano = decidi(s, 'mozzo');
        eseguiComando(s, { t: 'arma', arma: piano.arma });
        if (piano.miccia) eseguiComando(s, { t: 'miccia', secondi: piano.miccia });
        eseguiComando(s, { t: 'mira', mezziGradi: piano.mezziGradi, potenza: piano.potenza });
        eseguiComando(s, { t: 'fuoco' });
      }
      if (s.turno.fase === 'fuga' && piano) { eseguiComando(s, { t: 'muovi', dir: piano.fuga }); piano = null; }
      avanzaTick(s, ev);
      ev.length = 0;
    }
    expect(s.esito).not.toBeNull();
    expect(s.esito!.turni).toBeLessThanOrEqual(BIL.battaglia.turnoLimite);
  });
});

describe('IA · client', () => {
  it('la fotografia per il ripiego dà lo stesso piano e non ricopia la maschera', () => {
    const s = duello(800, 1200, { vento: 2 });
    const f = fotografia(s);
    expect(f.terreno.maschera).toBe(s.terreno.maschera);
    expect(f.pirati).not.toBe(s.pirati);
    expect(decidi(f, 'mozzo')).toEqual(decidi(s, 'mozzo'));
    s.pirati[0].x += 50; // la battaglia va avanti: la fotografia no
    expect(f.pirati[0].x).toBe(s.pirati[0].x - 50);
  });
});

describe('IA · barili di polvere (sim vera)', () => {
  function esito(s: StatoBattaglia, p: PianoIa) {
    const io = s.pirati.find((x) => x.id === s.turno.pirata)!;
    return simulaColpo(s, { pirata: io.id, arma: p.arma, mezziGradi: p.mezziGradi, potenza: p.potenza, miccia: p.miccia });
  }

  it('non fa scoppiare un barile accanto a sé', () => {
    for (let seme = 1; seme <= 30; seme++) {
      const s = duello(800, 1200, { seme, vento: (seme % 13) - 6, barili: [1225] });
      expect(s.proiettili.some((p) => p.tipo === 'barile')).toBe(true);
      const io = s.pirati.find((x) => x.id === s.turno.pirata)!;
      const e = esito(s, decidi(s, 'mozzo'));
      expect(e.danni[io.id] ?? 0).toBe(0);
    }
  });

  it('usa un barile vicino al nemico: colpisce più spesso che senza barile', () => {
    let con = 0, senza = 0;
    for (let seme = 1; seme <= 30; seme++) {
      const opz = { seme, vento: (seme % 13) - 6 };
      const a = duello(600, 1250, { ...opz, barili: [640] });
      const b = duello(600, 1250, opz);
      const nem = (s: StatoBattaglia) => s.pirati.find((x) => x.squadra === 0)!.id;
      if ((esito(a, decidi(a, 'mozzo')).danni[nem(a)] ?? 0) > 0) con++;
      if ((esito(b, decidi(b, 'mozzo')).danni[nem(b)] ?? 0) > 0) senza++;
    }
    console.log(`bersaglio a 650 px: ${con}/30 a segno col barile vicino, ${senza}/30 senza`);
    expect(con).toBeGreaterThan(senza);
  });
});
