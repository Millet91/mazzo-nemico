// Pose del pirata a pezzi (studio v2, Fase 1): la parte pura si prova senza Pixi.
import { describe, it, expect } from 'vitest';
import type { IdArma, IdCiurma, MossaPirata } from '../../src/core/tipi';
import {
  armaPosa, bersaglio, CICLO_PASSO_PX, indiceOsso, mossaDaStato, N_PAR, nuoviParametri, OSSA, PAR, risolvi, SCHELETRO, sfuma,
  SFUMA_MS, type ArmaPosa, type Posa, type StatoPosa,
} from '../../src/battaglia/render/pirata-posa';

const stato = (p: Partial<StatoPosa> = {}): StatoPosa => ({
  mossa: 'fermo', ciurma: 'teschio', cammino: 0, salita: 0, tempo: 0, daMs: 1000, sfasa: 2, mira: null,
  sparo: -1, colpito: -1, atterrato: -1, sbalzato: false, suolo: true, ko: false, morte: -1, annegato: false, ...p,
});
const posa = (p: Partial<StatoPosa> = {}): Posa => { const s = stato(p); return risolvi(bersaglio(s), s.mira?.arma ?? null); };
const osso = (q: Posa, n: (typeof OSSA)[number]) => { const i = indiceOsso(n); return { x: q.ossa[i], y: q.ossa[i + 1], rot: q.ossa[i + 2] }; };
/** quanto sono lontane due pose: lo spostamento più grande tra i pezzi, in px */
function distanza(a: Posa, b: Posa): number {
  let d = 0;
  for (let i = 0; i < a.ossa.length; i += 3) d = Math.max(d, Math.hypot(a.ossa[i] - b.ossa[i], a.ossa[i + 1] - b.ossa[i + 1]));
  return d;
}
const CIURME: IdCiurma[] = ['teschio', 'gelo', 'oro', 'marea', 'marina'];
const MOSSE: MossaPirata[] = ['fermo', 'passo', 'corsa', 'frenata', 'salto', 'caduta', 'scavalco', 'scivolata', 'bordo', 'scala', 'liana', 'aTerra'];
const ARMI: ArmaPosa[] = ['cannone', 'granata', 'pistola', 'sciabola'];

describe('Pirata a pezzi · camminata', () => {
  it('criterio QA: in 6 foto a 150 ms di camminata almeno 4 sono diverse (qui tutte e 6), per ogni ciurma', () => {
    for (const ciurma of CIURME) {
      // 60 px/s per 150 ms = 9 px tra una foto e l'altra
      const foto = [0, 1, 2, 3, 4, 5].map((i) => posa({ mossa: 'passo', ciurma, cammino: 100 + i * 9 }));
      const diverse: Posa[] = [];
      for (const f of foto) if (diverse.every((d) => distanza(d, f) > 1)) diverse.push(f);
      expect(diverse.length, ciurma).toBeGreaterThanOrEqual(4);
    }
  });

  it('il passo segue la distanza, non il tempo: fermo il pirata, fermi i piedi; dopo un ciclo si ripete', () => {
    const a = posa({ mossa: 'passo', cammino: 37, tempo: 0 });
    const b = posa({ mossa: 'passo', cammino: 37, tempo: 5000 });
    expect(distanza(a, b)).toBeLessThan(0.01);
    const c = posa({ mossa: 'passo', cammino: 37 + CICLO_PASSO_PX });
    expect(distanza(a, c)).toBeLessThan(0.01);
    expect(distanza(a, posa({ mossa: 'passo', cammino: 37 + CICLO_PASSO_PX / 2 }))).toBeGreaterThan(3);
  });

  it('i piedi toccano terra a turno e non la bucano mai; in corsa la falcata è più lunga', () => {
    let maxPasso = 0, maxCorsa = 0;
    for (const mossa of ['passo', 'corsa'] as const) {
      let aTerraA = 0, aTerraB = 0;
      for (let c = 0; c < CICLO_PASSO_PX; c += 0.5) {
        const q = posa({ mossa, cammino: c });
        const a = osso(q, 'piedeA'), b = osso(q, 'piedeB');
        // la caviglia sta sopra la suola: mai sotto il suolo
        expect(a.y).toBeLessThanOrEqual(-SCHELETRO.caviglia + 0.01);
        expect(b.y).toBeLessThanOrEqual(-SCHELETRO.caviglia + 0.01);
        if (a.y > -SCHELETRO.caviglia - 0.3) aTerraA++;
        if (b.y > -SCHELETRO.caviglia - 0.3) aTerraB++;
        const largo = Math.abs(a.x - b.x);
        if (mossa === 'passo') maxPasso = Math.max(maxPasso, largo); else maxCorsa = Math.max(maxCorsa, largo);
      }
      expect(aTerraA).toBeGreaterThan(5);
      expect(aTerraB).toBeGreaterThan(5);
    }
    expect(maxCorsa).toBeGreaterThan(maxPasso + 2);
  });

  it('ogni ciurma ha la sua andatura', () => {
    const pose = CIURME.map((ciurma) => posa({ mossa: 'passo', ciurma, cammino: 7 }));
    for (let i = 0; i < pose.length; i++) for (let j = i + 1; j < pose.length; j++) expect(distanza(pose[i], pose[j])).toBeGreaterThan(0.2);
  });
});

describe('Pirata a pezzi · ossa', () => {
  it('cosce, stinchi e braccia tengono la loro lunghezza in ogni posa (niente arti che si allungano)', () => {
    for (const mossa of MOSSE) for (const tempo of [0, 333, 777]) {
      const q = posa({ mossa, tempo, cammino: tempo / 10, salita: tempo / 20, suolo: mossa !== 'salto' && mossa !== 'caduta' });
      for (const [su, giu, fine, l1, l2] of [
        ['cosciaA', 'stincoA', 'piedeA', SCHELETRO.coscia, SCHELETRO.stinco], ['cosciaB', 'stincoB', 'piedeB', SCHELETRO.coscia, SCHELETRO.stinco],
      ] as const) {
        const a = osso(q, su), g = osso(q, giu), f = osso(q, fine);
        expect(Math.hypot(g.x - a.x, g.y - a.y), `${mossa} ${su}`).toBeCloseTo(l1, 2);
        expect(Math.hypot(f.x - g.x, f.y - g.y), `${mossa} ${giu}`).toBeCloseTo(l2, 2);
      }
      for (const [su, giu] of [['braccioA', 'avambraccioA'], ['braccioB', 'avambraccioB']] as const) {
        const a = osso(q, su), g = osso(q, giu);
        expect(Math.hypot(g.x - a.x, g.y - a.y), `${mossa} ${su}`).toBeCloseTo(SCHELETRO.braccio, 2);
      }
    }
  });

  it('il ginocchio piega in avanti e il gomito all\'indietro', () => {
    const q = posa({ atterrato: 40 });
    expect(osso(q, 'stincoA').x).toBeGreaterThan(osso(q, 'cosciaA').x);
    const r = posa({ mossa: 'corsa', cammino: 0 });
    // braccio B avanti in corsa: il gomito resta dietro la mano
    const g = osso(r, 'avambraccioB');
    expect(g.rot).toBeLessThan(osso(r, 'braccioB').rot);
  });

  it('ogni mossa, con ogni arma e ogni reazione, dà numeri finiti', () => {
    for (const mossa of MOSSE) for (const arma of [null, ...ARMI]) for (const extra of [{}, { colpito: 50 }, { atterrato: 50 }, { sparo: 50 }, { ko: true }, { morte: 0.5 }, { morte: 0.5, annegato: true }, { sbalzato: true, suolo: false }]) {
      const q = posa({ mossa, mira: arma ? { alzo: 0.7, potenza: 0.8, arma } : null, ...extra });
      for (const v of q.ossa) expect(Number.isFinite(v), `${mossa} ${arma}`).toBe(true);
      expect(Number.isFinite(q.rot + q.rx + q.ry + q.sx + q.sy + q.boccaX + q.boccaY)).toBe(true);
    }
  });
});

describe('Pirata a pezzi · pose', () => {
  it('le pose principali sono tutte diverse tra loro', () => {
    const nomi: Partial<StatoPosa>[] = [
      {}, { mossa: 'corsa' }, { mossa: 'salto', suolo: false }, { mossa: 'caduta', suolo: false }, { atterrato: 40 }, { colpito: 30 },
      { mira: { alzo: 0.6, potenza: 0.6, arma: 'cannone' } }, { mossa: 'scala' }, { mossa: 'liana' }, { ko: true }, { mossa: 'aTerra' },
      { mossa: 'scavalco', daMs: 100 }, { mossa: 'scivolata' }, { mossa: 'bordo' }, { mossa: 'frenata' },
    ];
    const pose = nomi.map((n) => posa(n));
    for (let i = 0; i < pose.length; i++) for (let j = i + 1; j < pose.length; j++) {
      const d = distanza(pose[i], pose[j]) + Math.abs(pose[i].rot - pose[j].rot) * 10;
      expect(d, `${JSON.stringify(nomi[i])} e ${JSON.stringify(nomi[j])}`).toBeGreaterThan(1.5);
    }
  });

  it('mira: l\'arma punta dove si tira e il corpo si carica con la potenza', () => {
    for (const gradi of [-30, 0, 35, 80]) {
      const alzo = (gradi * Math.PI) / 180;
      const q = posa({ mira: { alzo, potenza: 0.5, arma: 'cannone' } });
      const a = osso(q, 'arma');
      expect(a.rot).toBeCloseTo(-alzo, 5);
      // la bocca sta davanti all'impugnatura, nella direzione del tiro
      expect(Math.atan2(-(q.boccaY - a.y), q.boccaX - a.x)).toBeCloseTo(alzo, 5);
    }
    const piano = posa({ mira: { alzo: 0.5, potenza: 0, arma: 'pistola' } }), forte = posa({ mira: { alzo: 0.5, potenza: 1, arma: 'pistola' } });
    expect(osso(forte, 'busto').rot).toBeLessThan(osso(piano, 'busto').rot);
    expect(osso(forte, 'busto').y).toBeGreaterThan(osso(piano, 'busto').y);
  });

  it('rinculo: allo sparo il corpo va indietro e poi torna, senza spostare il pirata nella sim', () => {
    const m = { alzo: 0.3, potenza: 0.6, arma: 'cannone' as const };
    const prima = posa({ mira: m }), subito = posa({ mira: m, sparo: 10 }), dopo = posa({ mira: m, sparo: 260 });
    expect(subito.rx).toBeLessThan(prima.rx - 3);
    expect(dopo.rx).toBeCloseTo(prima.rx, 5);
  });

  it('scala e liana: le mani si alternano con la salita', () => {
    for (const mossa of ['scala', 'liana'] as const) {
      const a = posa({ mossa, salita: 4 }), b = posa({ mossa, salita: 12 });
      expect(osso(a, 'avambraccioA').y - osso(a, 'avambraccioB').y).toBeGreaterThan(1);
      expect(osso(b, 'avambraccioA').y - osso(b, 'avambraccioB').y).toBeLessThan(-1);
    }
  });

  it('mossa aTerra: in volo è sbalzato, a terra sta steso sulla schiena', () => {
    const volo = posa({ mossa: 'aTerra', suolo: false }), terra = posa({ mossa: 'aTerra', suolo: true });
    expect(terra.rot).toBeCloseTo(-Math.PI / 2, 5);
    expect(Math.abs(volo.rot)).toBeLessThan(1);
  });

  it('a 0 PV sta seduto col cappello in mano; la morte finisce a scala zero', () => {
    const seduto = posa({ ko: true }), inPiedi = posa();
    expect(osso(seduto, 'busto').y).toBeGreaterThan(osso(inPiedi, 'busto').y + 6);
    expect(osso(seduto, 'cappello').y).toBeGreaterThan(osso(seduto, 'testa').y);
    expect(posa({ morte: 1 }).sx).toBeCloseTo(0, 5);
  });
});

describe('Pirata a pezzi · sfumatura e mossa', () => {
  it('sfuma parte dalla posa vecchia e arriva alla nuova in SFUMA_MS', () => {
    const da = bersaglio(stato()), a = bersaglio(stato({ mossa: 'salto', suolo: false })), out = nuoviParametri();
    expect([...sfuma(da, a, 0, out)]).toEqual([...da]);
    expect([...sfuma(da, a, SFUMA_MS, out)]).toEqual([...a]);
    sfuma(da, a, SFUMA_MS / 2, out);
    for (let i = 0; i < N_PAR; i++) expect(out[i]).toBeCloseTo((da[i] + a[i]) / 2, 4);
    expect(out[PAR.sx]).toBe(1);
  });

  it('mossaDaStato (finché la sim non scrive Pirata.mossa): da aTerra, vx, vy, appeso', () => {
    const p = { aTerra: true, vx: 0, vy: 0, appeso: -1 };
    expect(mossaDaStato(p, 0, null)).toBe('fermo');
    expect(mossaDaStato(p, 60, null)).toBe('passo');
    expect(mossaDaStato(p, 96, null)).toBe('corsa');
    expect(mossaDaStato({ ...p, aTerra: false, vy: -3 }, 0, null)).toBe('salto');
    expect(mossaDaStato({ ...p, aTerra: false, vy: 2 }, 0, null)).toBe('caduta');
    expect(mossaDaStato({ ...p, appeso: 4 }, 0, 'scala')).toBe('scala');
    expect(mossaDaStato({ ...p, appeso: 4 }, 0, 'liana')).toBe('liana');
    // quando la sim la scrive, vince lei
    expect(mossaDaStato({ ...p, mossa: 'scivolata' }, 0, null)).toBe('scivolata');
  });

  it('le 16 armi si tengono in 4 modi', () => {
    const tutte: IdArma[] = ['cannone', 'granata', 'pistola', 'sciabola', 'barile', 'mina', 'rum', 'pallaSpezzata', 'pappagallo', 'scimmia', 'ancora', 'bordata', 'rampino', 'vanga', 'bussola', 'kraken'];
    expect(new Set(tutte.map(armaPosa))).toEqual(new Set(ARMI));
    expect(armaPosa('cannone')).toBe('cannone');
    expect(armaPosa('sciabola')).toBe('sciabola');
  });
});
