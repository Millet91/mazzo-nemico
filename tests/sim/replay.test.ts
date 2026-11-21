// Agente Fisica · hashStato, determinismo, replay, simulaColpo (per l'IA), traiettoria e prestazioni.
import { describe, it, expect } from 'vitest';
import { daGradi } from '../../src/core/trig';
import { generaMappa } from '../../src/battaglia/gen';
import { avanzaTick, creaBattaglia, eseguiComando, hashStato, simulaColpo, traiettoria } from '../../src/battaglia/sim';
import { creaReplay, giocaComandi, rigiocaReplay } from '../../src/battaglia/sim/replay';
import type { ComandoRegistrato, EventoBattaglia, MappaGenerata, StatoBattaglia } from '../../src/core/tipi';
import { MATERIALE } from '../../src/core/tipi';
import { avanzaFinche, battagliaPiatta, config, eventiDi, inAzione, pirata, rettangolo, spara, terrenoPiatto } from './aiuti';

function mappaDi(seme: number, n: [number, number]): MappaGenerata {
  return generaMappa({ seme, bioma: 'isola', piratiPerLato: n });
}

/** Comandi di prova: ogni turno mira, sceglie un'arma a rotazione e spara. */
function comandiScriptati(n: number): ComandoRegistrato[] {
  // costruiti giocando: servono i tick giusti in cui la fase è 'azione'
  const cfg = config(3, 3, { seme: 77 });
  const s = creaBattaglia(cfg, mappaDi(77, [3, 3]));
  const out: ComandoRegistrato[] = [];
  const armi = ['cannone', 'granata', 'pistola', 'sciabola'] as const;
  const ev: EventoBattaglia[] = [];
  let fatto = 0;
  while (!s.esito && s.turno.numero <= n) {
    if (s.turno.fase === 'azione' && fatto < s.turno.numero) {
      fatto = s.turno.numero;
      const verso = s.turno.squadra === 0 ? 1 : -1;
      const cs = [
        { t: 'muovi', dir: verso },
        { t: 'arma', arma: armi[s.turno.numero % 4] },
        { t: 'mira', mezziGradi: daGradi(verso === 1 ? 40 + s.turno.numero : 140 - s.turno.numero), potenza: 55 + s.turno.numero },
        { t: 'miccia', secondi: 2 },
      ] as const;
      for (const c of cs) { out.push({ tick: s.tick, c }); eseguiComando(s, c); }
    }
    if (s.turno.fase === 'azione' && s.tick - s.turno.inizioFase === 40) {
      for (const c of [{ t: 'muovi', dir: 0 }, { t: 'fuoco' }] as const) { out.push({ tick: s.tick, c }); eseguiComando(s, c); }
    }
    avanzaTick(s, ev);
    ev.length = 0;
  }
  return out;
}

describe('hashStato', () => {
  it('cambia se cambia un solo byte della maschera, ovunque', () => {
    const s = battagliaPiatta([800], [1200]);
    const h0 = hashStato(s);
    for (const i of [0, 1, 12345, s.terreno.maschera.length - 1]) {
      s.terreno.maschera[i] ^= 1;
      expect(hashStato(s)).not.toBe(h0);
      s.terreno.maschera[i] ^= 1;
    }
    expect(hashStato(s)).toBe(h0);
  });

  it('cambia per una differenza minima in un numero, nel vento, nel turno o nelle munizioni', () => {
    const s = battagliaPiatta([800], [1200]);
    const h0 = hashStato(s);
    const prova = (f: (s: StatoBattaglia) => void) => { const c = structuredClone(s); f(c); return hashStato(c); };
    expect(prova(() => undefined)).toBe(h0); // la copia ha lo stesso hash
    expect(prova((c) => { c.pirati[0].x += 1e-9; })).not.toBe(h0);
    expect(prova((c) => { c.vento += 1; })).not.toBe(h0);
    expect(prova((c) => { c.turno.miccia = 4; })).not.toBe(h0);
    expect(prova((c) => { c.squadre[0].munizioni.cannone = 3; })).not.toBe(h0);
    expect(prova((c) => { c.pirati[1].stato = 'morto'; })).not.toBe(h0);
  });

  it('non dipende dall\'ordine delle chiavi né dai campi undefined (replay da JSON)', () => {
    const s = battagliaPiatta([800], [1200]);
    const c = JSON.parse(JSON.stringify({ ...s, terreno: { ...s.terreno, maschera: [] } }));
    c.terreno.maschera = s.terreno.maschera;
    expect(hashStato(c)).toBe(hashStato(s));
  });
});

describe('Determinismo e replay', () => {
  it('stessi comandi ⇒ stessi hash, anche dopo JSON', () => {
    const comandi = comandiScriptati(8);
    const cfg = config(3, 3, { seme: 77 });
    const mappa = mappaDi(77, [3, 3]);
    const replay = creaReplay(cfg, mappa, comandi);
    expect(Object.keys(replay.hash!).length).toBeGreaterThan(2);
    const daJson = JSON.parse(JSON.stringify(replay));
    const r = rigiocaReplay(daJson, mappaDi(77, [3, 3]));
    expect(r.differenze).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('un comando diverso cambia gli hash e rigiocaReplay lo segnala', () => {
    const comandi = comandiScriptati(4);
    const cfg = config(3, 3, { seme: 77 });
    const mappa = mappaDi(77, [3, 3]);
    const replay = creaReplay(cfg, mappa, comandi);
    const i = replay.comandi.findIndex((c) => c.c.t === 'mira');
    const rotto = structuredClone(replay);
    rotto.comandi[i] = { tick: rotto.comandi[i].tick, c: { t: 'mira', mezziGradi: 100, potenza: 99 } };
    const r = rigiocaReplay(rotto, mappa);
    expect(r.ok).toBe(false);
    expect(r.differenze.length).toBeGreaterThan(0);
  });

  it('copie dello stato con structuredClone avanzano uguali (stato tutto dentro StatoBattaglia)', () => {
    const s = battagliaPiatta([800], [1200]);
    inAzione(s);
    spara(s, 'granata', daGradi(50), 70);
    const c = structuredClone(s);
    const e1: EventoBattaglia[] = [], e2: EventoBattaglia[] = [];
    for (let i = 0; i < 400; i++) { avanzaTick(s, e1); avanzaTick(c, e2); }
    expect(hashStato(c)).toBe(hashStato(s));
    expect(e2).toEqual(e1);
  });

  it('giocaComandi rispetta la regola dei tick: il comando al tick T si applica prima del tick T+1', () => {
    const cfg = config(1, 1, { seme: 5 });
    const mappa = mappaDi(5, [1, 1]);
    const s = creaBattaglia(cfg, mappa);
    const ev: EventoBattaglia[] = [];
    while (s.turno.fase !== 'azione') avanzaTick(s, ev);
    const T = s.tick + 3;
    const { stato } = giocaComandi(cfg, mappa, [{ tick: T, c: { t: 'fuoco' } }], { fermaA: T + 1 });
    expect(stato.turno.fase).toBe('volo');
  });
});

describe('simulaColpo (per l\'IA)', () => {
  it('non muta lo stato e non copia la maschera', () => {
    const s = battagliaPiatta([800], [1100]);
    inAzione(s);
    const h0 = hashStato(s);
    const maschera = s.terreno.maschera;
    for (const arma of ['cannone', 'granata', 'pistola', 'sciabola'] as const) {
      simulaColpo(s, { pirata: 0, arma, mezziGradi: daGradi(30), potenza: 70, miccia: 2 });
    }
    expect(hashStato(s)).toBe(h0);
    expect(s.terreno.maschera).toBe(maschera);
  });

  it('prevede il danno vero di un colpo diretto di cannone', () => {
    const s = battagliaPiatta([800], [1000]);
    inAzione(s);
    const previsto = simulaColpo(s, { pirata: 0, arma: 'cannone', mezziGradi: 0, potenza: 100 });
    spara(s, 'cannone', 0, 100);
    const ev = avanzaFinche(s, (x) => x.turno.fase === 'fuga');
    const vero = eventiDi(ev, 'danno').filter((e) => e.pirata === 1).reduce((a, e) => a + e.quanto, 0);
    expect(previsto.danni[1]).toBe(vero);
    expect(previsto.impatto).not.toBeNull();
  });

  it('vede l\'annegamento: un nemico sul bordo spinto in mare', () => {
    const t = terrenoPiatto(MATERIALE.sabbia, 100, 1040);
    const s = battagliaPiatta([800], [1030], { terreno: t });
    inAzione(s);
    const e = simulaColpo(s, { pirata: 0, arma: 'cannone', mezziGradi: 0, potenza: 100 });
    expect(e.annegati).toContain(1);
  });

  it('sciabola: il verso viene dall\'angolo del piano (0 destra, 360 sinistra)', () => {
    const s = battagliaPiatta([1000], [1020]);
    inAzione(s);
    expect(simulaColpo(s, { pirata: 0, arma: 'sciabola', mezziGradi: 0, potenza: 0 }).danni[1]).toBeGreaterThan(0);
    expect(simulaColpo(s, { pirata: 0, arma: 'sciabola', mezziGradi: 360, potenza: 0 }).danni[1]).toBeUndefined();
  });

  it('legge il vento dello stato anche se non è intero (IA al 50%)', () => {
    const s = battagliaPiatta([600], [1400]);
    inAzione(s);
    const piano = { pirata: 0, arma: 'cannone' as const, mezziGradi: daGradi(60), potenza: 80 };
    s.vento = 0;
    const a = simulaColpo(s, piano).impatto!;
    s.vento = 2.5;
    const b = simulaColpo(s, piano).impatto!;
    expect(b.x).toBeGreaterThan(a.x);
  });
});

describe('traiettoria', () => {
  it('parte dalla bocca, segue la mira e si ferma al primo urto, senza mutare lo stato', () => {
    const t = terrenoPiatto();
    rettangolo(t, 1100, 300, 1120, 600, MATERIALE.roccia);
    const s = battagliaPiatta([800], [1400], { terreno: t });
    inAzione(s);
    eseguiComando(s, { t: 'mira', mezziGradi: daGradi(20), potenza: 90 });
    const h0 = hashStato(s);
    const punti = traiettoria(s);
    expect(hashStato(s)).toBe(h0);
    expect(punti.length).toBeGreaterThan(3);
    expect(punti[0].x).toBeGreaterThan(pirata(s).x);
    expect(punti[punti.length - 1].x).toBeLessThan(1101);
  });

  it('sciabola: niente linea', () => {
    const s = battagliaPiatta([800], [1400]);
    inAzione(s);
    eseguiComando(s, { t: 'arma', arma: 'sciabola' });
    expect(traiettoria(s)).toEqual([]);
  });
});

describe('Prestazioni', () => {
  it('10 pirati (5v5): in media sotto 2 ms per tick anche in Node', () => {
    const cfg = config(5, 5, { seme: 2024 });
    const s = creaBattaglia(cfg, mappaDi(2024, [5, 5]));
    const ev: EventoBattaglia[] = [];
    let ms = 0, n = 0;
    // granate e cannonate a ripetizione, con pirati che volano
    while (!s.esito && n < 6000) {
      if (s.turno.fase === 'azione' && !s.turno.sparato) spara(s, n % 2 ? 'granata' : 'cannone', daGradi(s.turno.squadra ? 120 : 60), 60);
      const t0 = performance.now();
      avanzaTick(s, ev);
      ms += performance.now() - t0;
      ev.length = 0; n++;
    }
    console.info(`[sim] 5v5: ${n} tick, ${(ms / n).toFixed(4)} ms/tick`);
    expect(ms / n).toBeLessThan(2);
  });
});
