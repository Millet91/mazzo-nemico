// Studio v2, Fase 0 (PIANO.md §3, QA §3.1-3.2): scale che non si fermano a metà, "scendi" dall'alto, il salto che
// supera uno scalino di 24 px, i compagni che non si bloccano a vicenda.
import { describe, it, expect } from 'vitest';
import { BIL } from '../../src/contenuti/bilanciamento';
import { MATERIALE } from '../../src/core/tipi';
import type { StatoBattaglia } from '../../src/core/tipi';
import { avvisoTiro, creaBattaglia, eseguiComando, hashStato, simulaColpo } from '../../src/battaglia/sim';
import { avanza, avanzaFinche, battagliaPiatta, config, eventiDi, inAzione, mappa, pirata, rettangolo, SUOLO, terrenoPiatto } from './aiuti';

const MEZZA = BIL.pirata.capsulaAltezza / 2;
const piedi = (s: StatoBattaglia, id = 0) => Math.floor(pirata(s, id).y) + MEZZA;

/**
 * Parete come quella di Cala Pappagallo: piano in cima a quota 480 da x 900, con un labbro che sporge di 5 px
 * (da x 895) nei 20 px sotto la cima. La scala sta a `asse`, dalla cima al suolo.
 */
function parete(asse: number, x0: number, piedi0 = SUOLO): StatoBattaglia {
  const t = terrenoPiatto();
  rettangolo(t, 900, 480, 1100, SUOLO, MATERIALE.roccia);
  rettangolo(t, 895, 500, 900, 520, MATERIALE.roccia);
  const m = mappa(t, [{ x: x0, y: piedi0 }], [{ x: 1600, y: SUOLO }]);
  m.appigli = [{ tipo: 'scala', x: asse, yAlto: 480, yBasso: SUOLO }];
  return creaBattaglia(config(1, 1), m);
}

describe('Fase 0 · scale', () => {
  it('con l\'asse a 10 px dal labbro si sale fino in cima e si passa sul piano (era il bug: asse a 5 px, fermo a metà)', () => {
    const s = parete(885, 880);
    inAzione(s);
    eseguiComando(s, { t: 'arrampica', dir: -1 });
    const ev = avanzaFinche(s, (x) => pirata(x, 0).aTerra && piedi(x) === 480, 600);
    expect(piedi(s)).toBe(480);
    expect(pirata(s, 0).x).toBeGreaterThan(895);
    expect(eventiDi(ev, 'danno')).toHaveLength(0);
  });

  it('chi si aggrappa di lato viene portato sull\'asse mentre sale', () => {
    const s = parete(885, 878);
    inAzione(s);
    eseguiComando(s, { t: 'arrampica', dir: -1 });
    avanza(s, 20);
    expect(pirata(s, 0).appeso).toBeGreaterThan(0);
    expect(pirata(s, 0).x).toBe(885);
  });

  it('"scendi" dal piano in cima, anche a 16 px dall\'asse: prende la scala e arriva al suolo senza cadere', () => {
    const s = parete(885, 901, 480);
    inAzione(s);
    eseguiComando(s, { t: 'arrampica', dir: 1 });
    const ev = avanzaFinche(s, (x) => pirata(x, 0).aTerra && piedi(x) === SUOLO, 600);
    expect(eventiDi(ev, 'aggrappato')).toHaveLength(1);
    expect(piedi(s)).toBe(SUOLO);
    expect(pirata(s, 0).x).toBe(885);
    expect(eventiDi(ev, 'danno')).toHaveLength(0);
    expect(eventiDi(ev, 'atterrato')).toHaveLength(0); // non è una caduta
  });

  it('"scendi" lontano dal bordo (oltre il passaggio in cima) non fa niente', () => {
    const s = parete(885, 885 + BIL.arrampicata.passaggioCima + 6, 480);
    inAzione(s);
    eseguiComando(s, { t: 'arrampica', dir: 1 });
    expect(eventiDi(avanza(s, 30), 'aggrappato')).toHaveLength(0);
    expect(piedi(s)).toBe(480);
  });

  it('salita e discesa intere stanno nel tempo di QA §3.1 (lunghezza / 40 + 1 s)', () => {
    const s = parete(885, 885);
    inAzione(s);
    const t0 = s.tick;
    eseguiComando(s, { t: 'arrampica', dir: -1 });
    avanzaFinche(s, (x) => pirata(x, 0).aTerra && piedi(x) === 480, 600);
    expect(s.tick - t0).toBeLessThanOrEqual(((SUOLO - 480) / 40 + 1) * 60);
  });
});

describe('Fase 0 · raggiungibilità', () => {
  /** scalino di roccia alto `alto` px da x 600 in poi; il pirata parte a `x0` e guarda a destra */
  function conScalino(alto: number, x0: number): StatoBattaglia {
    const t = terrenoPiatto();
    rettangolo(t, 600, SUOLO - alto, 900, SUOLO, MATERIALE.roccia);
    return battagliaPiatta([x0], [1600], { terreno: t });
  }

  it('il salto supera uno scalino di 24 px anche partendo attaccati allo scalino (QA §3.2)', () => {
    for (const x0 of [593, 590, 580, 560]) {
      const s = conScalino(24, x0);
      inAzione(s);
      eseguiComando(s, { t: 'salta', indietro: false });
      avanzaFinche(s, (x) => pirata(x, 0).aTerra, 300);
      expect(piedi(s), `da x ${x0}`).toBe(SUOLO - 24);
      expect(pirata(s, 0).x, `da x ${x0}`).toBeGreaterThan(600);
    }
  });

  it('uno scalino di 24 px a piedi non si sale (gradino massimo 8), uno di 60 non si salta', () => {
    const s = conScalino(24, 560);
    inAzione(s);
    eseguiComando(s, { t: 'muovi', dir: 1 });
    avanza(s, 120);
    expect(piedi(s)).toBe(SUOLO);
    expect(pirata(s, 0).x).toBeLessThan(600);
    const s2 = conScalino(60, 590);
    inAzione(s2);
    eseguiComando(s2, { t: 'salta', indietro: false });
    avanzaFinche(s2, (x) => pirata(x, 0).aTerra, 300);
    expect(piedi(s2)).toBe(SUOLO);
  });

  it('i compagni non si bloccano a vicenda: si passa attraverso un compagno fermo', () => {
    const s = battagliaPiatta([500, 530, 560], [1600]);
    inAzione(s);
    const p = pirata(s);
    const x0 = p.x;
    eseguiComando(s, { t: 'muovi', dir: p.x < 530 ? 1 : -1 });
    avanza(s, 90);
    expect(Math.abs(pirata(s).x - x0)).toBeCloseTo(90 * BIL.pirata.camminata, 6);
  });
});

describe('Fase 0 · sicurezza del tiro', () => {
  /** pendio di roccia che sale a destra del pirata: parete da x 540 in poi, alta 200 px */
  function conPendio(nemicoX = 1600): StatoBattaglia {
    const t = terrenoPiatto();
    rettangolo(t, 540, SUOLO - 200, 700, SUOLO, MATERIALE.roccia);
    return battagliaPiatta([500], [nemicoX], { terreno: t });
  }

  it('cannonata contro il pendio vicino: chi spara non si fa male e non viene spinto', () => {
    const s = conPendio();
    inAzione(s);
    const p = pirata(s);
    eseguiComando(s, { t: 'mira', mezziGradi: 2 * 37, potenza: 73 });
    expect(avvisoTiro(s)).toBe('vicino');
    eseguiComando(s, { t: 'fuoco' });
    const ev = avanzaFinche(s, (x) => x.turno.fase === 'risoluzione', 600);
    expect(eventiDi(ev, 'esplosione')).toHaveLength(1);
    expect(p.vita).toBe(BIL.pirata.pv);
    expect(eventiDi(ev, 'danno')).toHaveLength(0);
    expect(p.aTerra).toBe(true);
  });

  it('se la stessa cannonata raggiunge anche un nemico, vale per tutti e due (niente colpi sicuri a bruciapelo)', () => {
    const s = conPendio(530);
    inAzione(s);
    const p = pirata(s), nemico = s.pirati.find((q) => q.squadra !== p.squadra)!;
    nemico.y = p.y; // accanto, ai piedi del pendio
    eseguiComando(s, { t: 'mira', mezziGradi: 2 * 37, potenza: 73 }); // lo stesso tiro contro il pendio
    expect(avvisoTiro(s)).toBe('danno');
    eseguiComando(s, { t: 'fuoco' });
    avanzaFinche(s, (x) => x.turno.fase === 'risoluzione', 600);
    expect(nemico.vita).toBeLessThan(nemico.vitaMax);
    expect(p.vita).toBeLessThan(BIL.pirata.pv);
  });

  it('la granata ai propri piedi fa male come prima, e l\'HUD avvisa', () => {
    const s = battagliaPiatta([500], [1600]);
    inAzione(s);
    const p = pirata(s);
    eseguiComando(s, { t: 'arma', arma: 'granata' });
    eseguiComando(s, { t: 'miccia', secondi: 1 });
    eseguiComando(s, { t: 'mira', mezziGradi: 2 * 80, potenza: 5 });
    expect(avvisoTiro(s)).toBe('danno');
    eseguiComando(s, { t: 'fuoco' });
    avanzaFinche(s, (x) => x.turno.fase === 'risoluzione', 600);
    expect(p.vita).toBeLessThan(BIL.pirata.pv);
  });

  it('un tiro lontano non dà nessun avviso, e l\'anteprima non cambia lo stato', () => {
    const s = battagliaPiatta([500], [1600]);
    inAzione(s);
    eseguiComando(s, { t: 'mira', mezziGradi: 2 * 45, potenza: 70 });
    const prima = hashStato(s);
    expect(avvisoTiro(s)).toBeNull();
    expect(hashStato(s)).toBe(prima);
  });

  it('simulaColpo (IA e anteprima) segue la stessa regola della battaglia', () => {
    const s = conPendio();
    inAzione(s);
    const p = pirata(s);
    const e = simulaColpo(s, { pirata: p.id, arma: 'cannone', mezziGradi: 2 * 37, potenza: 73 });
    expect(e.impatto).not.toBeNull();
    expect(e.danni[p.id] ?? 0).toBe(0);
  });
});
