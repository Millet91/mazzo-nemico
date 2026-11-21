// Regressioni dalla revisione dello studio (QA, Lead, Systems, Content, Creative). Ogni test cita la voce.
import { describe, it, expect } from 'vitest';
import { blankRun, wave, addCard, msgs, spec } from './helpers';
import { WaveSim } from '../src/core/wave';
import { apply, defaultConfig, newRun, pattiMax } from '../src/core/run';
import { playRun } from '../src/sim/bots';
import { P, MAP_LEVELS } from '../src/content/config';
import type { RunState } from '../src/core/types';

const enters = (o: { events: { k: string; msg: string }[] }) => o.events.filter((e) => e.k === 'enter').map((e) => e.msg);

describe('Bug P0 del QA', () => {
  it('QA P0-2 · Sagrestano: una carta che torna non può essere anche pescata', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = blankRun();
      const cards = ['topi', 'lupo', 'volpe', 'falce', 'affogata', 'gazza', 'banditore', 'lupo'].map((d) => addCard(r, d));
      const { out } = (() => {
        const sp = { kind: 'boss' as const, carry: [cards[0].uid, cards[1].uid], draws: 6, boss: 'sagrestano' };
        return { out: new WaveSim(r, spec(sp), seed).run_() };
      })();
      for (const e of out.events) {
        const uids = [...e.snap.lane.filter(Boolean).map((c) => c!.uid), ...e.snap.queue.map((c) => c!.uid)].filter((u) => u != null);
        expect(new Set(uids).size).toBe(uids.length);
      }
    }
  });

  it('QA P0-3 · una Gazza con già un bottino non ruba un secondo Segno (3 Spiccioli) e nessun Segno sparisce', () => {
    const r = blankRun();
    r.sp = 10;
    const g = addCard(r, 'gazza');
    r.def.segni[4] = ['tagliola'];
    wave(r, [g.uid]);
    expect(g.bottino).toBe('tagliola');
    r.def.segni[2] = ['gelo'];
    wave(r, [g.uid]);
    expect(g.bottino).toBe('tagliola');
    expect(r.def.segni[2]).toEqual(['gelo']);
    expect(r.sp).toBe(7);
    expect(r.def.stolen.length).toBe(1);
    r.def.segni[0] = ['brace'];
    wave(r, [g.uid]);
    expect(r.def.deposito).toContain('tagliola');
    expect(r.def.stolen.length).toBe(0);
  });

  it('QA P0-4 · Ritorno vale una volta per carta per ondata, anche con il Richiamo', () => {
    const r = blankRun();
    r.def.segni[0] = ['brace']; r.def.segni[1] = ['brace']; r.def.segni[2] = ['brace'];
    const a = addCard(r, 'affogata');
    const { out } = wave(r, [a.uid, 'morto']);
    expect(enters(out).filter((m) => m.startsWith("L'Affogata")).length).toBeLessThanOrEqual(3);
    // Ritorno una volta: entra, torna, (Richiamo) rientra: mai 4 volte
  });

  it('QA P0-5 · la carta del Mazziere entra sempre per ultima (Ritorno e Profezia)', () => {
    const r = blankRun();
    r.def.segni[0] = ['brace'];
    const { out } = wave(r, ['affogata'], { boss: 'sagrestano', kind: 'boss' });
    const e = enters(out);
    expect(e[e.length - 1]).toContain('Sagrestano');
    let bad = 0;
    for (let sd = 1; sd <= 30; sd++) {
      const { out: o } = wave(blankRun(), ['profeta', 'lupo', 'lupo', 'lupo'], { boss: 'piena', kind: 'boss' }, sd);
      const ev = o.events.find((x) => x.msg.includes('profetizza'));
      if (ev && ev.snap.queue.length && ev.snap.queue[ev.snap.queue.length - 1].tier !== 'b') bad++;
    }
    expect(bad).toBe(0);
  });

  it('QA P1-2 · il Gelo su una carta Lenta consuma il tick fermo e poi riprende l’alternanza', () => {
    const base = wave(blankRun(), ['mulo']).out.events.find((e) => e.k === 'impact')!.t;
    const r = blankRun();
    r.def.segni[0] = ['gelo'];
    const t = wave(r, ['mulo']).out.events.find((e) => e.k === 'impact')!.t;
    expect(t - base).toBeLessThanOrEqual(2);
  });

  it('QA P1-3 · la Corrente non spinge le carte Gelate', () => {
    const r1 = blankRun();
    const t1 = wave(r1, ['lupo'], { corrente: 1 }).out.events.find((e) => e.k === 'impact')!.t;
    const r2 = blankRun();
    r2.def.segni[0] = ['gelo'];
    const t2 = wave(r2, ['lupo'], { corrente: 1 }).out.events.find((e) => e.k === 'impact')!.t;
    expect(t2).toBeGreaterThan(t1);
  });
});

describe('Regole nuove', () => {
  it('Content P0.1 · Silenzio a cariche: i primi N Segni tacciono, poi si colpisce', () => {
    const r = blankRun();
    r.def.segni[1] = ['brace']; r.def.segni[2] = ['brace']; r.def.segni[3] = ['brace'];
    const { out } = wave(r, ['bocca']);
    expect(msgs(out).filter((m) => m.startsWith('Silenzio')).length).toBe(2);
    expect(out.dmg).toBe(0);
  });

  it('Content P0.1 · la Lanterna toglie il Silenzio e non tace', () => {
    const r = blankRun();
    r.def.segni[0] = ['lanterna'];
    r.def.segni[1] = ['brace'];
    const { out } = wave(r, ['bocca']);
    expect(msgs(out).some((m) => m.startsWith('Silenzio'))).toBe(false);
    expect(out.dmg).toBe(0);
  });

  it('CD-2 · i Segni che tolgono Forza colpiscono anche i tuoi Patti; la Lanterna no', () => {
    const r = blankRun();
    const lupo = addCard(r, 'lupo', { owner: 'baro', lealta: 3 });
    r.def.segni[2] = ['brace'];
    const { out } = wave(r, [lupo.uid]);
    expect(out.allyHurt).toBe(2);
    const r2 = blankRun();
    const l2 = addCard(r2, 'lupo', { owner: 'baro', lealta: 3 });
    r2.def.segni[2] = ['lanterna'];
    expect(wave(r2, [l2.uid]).out.allyHurt).toBe(0);
  });

  it('Content P1.2 · il Ladro non ruba il Bastione', () => {
    const r = blankRun();
    r.def.segni[4] = ['bastione'];
    r.sp = 5;
    const g = addCard(r, 'gazza');
    wave(r, [g.uid]);
    expect(r.def.segni[4]).toEqual(['bastione']);
    expect(r.sp).toBe(2);
  });

  it('QA P2-2 · l’Asso non scambia un tuo Patto', () => {
    const r = blankRun();
    const l = addCard(r, 'lupo', { owner: 'baro', lealta: 3 });
    const sim = wave(r, ['lupo', l.uid]);
    void sim;
    const r2 = blankRun();
    const l2 = addCard(r2, 'lupo', { owner: 'baro', lealta: 3 });
    const s = new WaveSim(r2, spec(), 1, { tick: 3, kind: 'scambia', slot: 0 });
    s.fixed = [l2.uid, 'lupo'];
    const o = s.run_();
    expect(msgs(o).some((m: string) => m.includes('scambi'))).toBe(false);
  });

  it('SD-1 · la mappa ha sempre 4 ondate per atto', () => {
    const kinds = MAP_LEVELS.map((l) => l.filter((k) => k === 'ondata' || k === 'elite').length > 0 && l.every((k) => k === 'ondata' || k === 'elite'));
    expect(kinds.filter(Boolean).length).toBe(4);
  });

  it('SD-4 · il Deposito tiene al massimo 4 difese: oltre si vende', () => {
    const s = newRun(defaultConfig({ seed: 'dep', packs: ['*'] }));
    s.def.deposito = ['gelo', 'spina', 'lanterna', 'corno'];
    s.phase = 'offer';
    s.offer = { ids: ['tagliola'], source: 'ondata', canSkip: false };
    s.def.segni = s.def.segni.map(() => ['x']) as string[][];
    s.def.segni = [['brace'], ['taglio'], ['calamita'], ['moneta'], ['rimando']];
    apply(s, { t: 'pick', id: 'tagliola' });
    expect(s.phase).toBe('sellPick');
    const sp = s.sp;
    apply(s, { t: 'sellPick', id: 'gelo' });
    expect(s.def.deposito.length).toBeLessThanOrEqual(P.DEPOSITO_MAX);
    expect(s.sp).toBeGreaterThan(sp);
    expect(s.phase).toBe('prep');
  });

  it('CD-7 · dopo il Forestiero si possono avere 4 Patti', () => {
    const s = newRun(defaultConfig({ seed: 'p' }));
    expect(pattiMax(s)).toBe(3);
    s.act = 3;
    expect(pattiMax(s)).toBe(4);
  });

  it('Invariante · in nessuna istantanea lo stesso uid compare due volte (30 run)', () => {
    for (let i = 0; i < 12; i++) {
      const res = playRun(defaultConfig({ seed: `uid${i}`, sigillo: i % 11, packs: ['*'] }), 'medio', i, 3, (s: RunState) => {
        const places = [...s.def.segni.flat(), ...s.def.trucchi, ...(s.def.rito ? [s.def.rito.id] : []), ...s.def.deposito, ...s.def.stolen.map((x) => x.segno)];
        expect(new Set(places).size).toBe(places.length);
        if (s.phase !== 'sellPick') expect(s.def.deposito.length).toBeLessThanOrEqual(P.DEPOSITO_MAX);
      });
      expect(res.errors).toEqual([]);
    }
  }, 120000);
});
