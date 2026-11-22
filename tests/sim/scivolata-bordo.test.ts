// Studio v2, Fase 1 (P1-contratti §6, punti 1-2): scivolata sui pendii oltre 25° e salvataggio al bordo.
import { describe, it, expect } from 'vitest';
import { BIL } from '../../src/contenuti/bilanciamento';
import { MATERIALE } from '../../src/core/tipi';
import type { StatoBattaglia, Terreno } from '../../src/core/tipi';
import { balzoPossibile, eseguiComando } from '../../src/battaglia/sim';
import { avanza, avanzaFinche, battagliaPiatta, eventiDi, inAzione, pirata, rettangolo, SUOLO, terrenoPiatto } from './aiuti';

const M = BIL.movimento;
const MEZZA = BIL.pirata.capsulaAltezza / 2;
const piedi = (s: StatoBattaglia, id = 0) => Math.floor(pirata(s, id).y) + MEZZA;

/** Altopiano da x 100 a `x0` a quota SUOLO − alto, poi un pendio che scende di `giu` px ogni `ogni` px fino al suolo. */
function discesa(alto: number, x0: number, giu: number, ogni: number): Terreno {
  const t = terrenoPiatto();
  rettangolo(t, 100, SUOLO - alto, x0, SUOLO, MATERIALE.roccia);
  for (let x = x0; ; x++) {
    const h = alto - Math.floor(((x - x0) / ogni) * giu);
    if (h <= 0) break;
    rettangolo(t, x, SUOLO - h, x + 1, SUOLO, MATERIALE.roccia);
  }
  return t;
}

/** Pirata 0 sull'altopiano a x 780; pendio da x 800. `mosse` = mosse premio della sua squadra (assente = tutte). */
function suDiscesa(giu: number, ogni: number, mosse?: []): StatoBattaglia {
  const s = battagliaPiatta([780], [1800], { terreno: discesa(200, 800, giu, ogni) });
  if (mosse) s.config.squadre[0].mosse = mosse;
  for (const p of s.pirati) if (p.squadra === 0) p.y = SUOLO - 200 - MEZZA;
  inAzione(s);
  return s;
}

describe('Scivolata sui pendii oltre 25°', () => {
  it('camminando in discesa su un pendio di 45° il pirata di turno parte in scivolata e accelera fino a 220 px/s', () => {
    const s = suDiscesa(1, 1);
    const p = pirata(s);
    eseguiComando(s, { t: 'muovi', dir: 1 });
    const ev = avanzaFinche(s, () => p.mossa === 'scivolata', 120);
    expect(p.mossa).toBe('scivolata');
    const inizio = eventiDi(ev, 'scivola');
    expect(inizio).toEqual([{ t: 'scivola', pirata: 0, inizio: true, materiale: MATERIALE.roccia }]);
    let vMax = 0;
    const giu = avanzaFinche(s, () => { vMax = Math.max(vMax, Math.abs(p.vx)); return p.mossa !== 'scivolata'; }, 300);
    expect(vMax).toBeCloseTo(M.scivolataVelMax, 6);
    expect(eventiDi(giu, 'scivola').map((e) => e.inizio)).toEqual([false]);
    expect(eventiDi(giu, 'danno')).toHaveLength(0);
    // in fondo (dove il pendio torna sotto i 15°) esce tenendo la freccia: di corsa
    expect(p.mossa).toBe('corsa');
    avanza(s, 10);
    expect(piedi(s)).toBe(SUOLO);
  });

  it('a 45° scivolando si scende molto più in fretta che camminando (senza la mossa premio si cammina)', () => {
    const tempo = (mosse?: []) => {
      const s = suDiscesa(1, 1, mosse);
      eseguiComando(s, { t: 'muovi', dir: 1 });
      const ev = avanzaFinche(s, (x) => piedi(x) === SUOLO, 600);
      return { tick: s.tick, scivola: eventiDi(ev, 'scivola').length };
    };
    const con = tempo(), senza = tempo([]);
    expect(senza.scivola).toBe(0);
    expect(con.scivola).toBe(2);
    expect(con.tick).toBeLessThan(senza.tick - 10);
  });

  it('lasciando la freccia a metà discesa scivola lo stesso fino in fondo e poi frena', () => {
    const s = suDiscesa(1, 1);
    const p = pirata(s);
    eseguiComando(s, { t: 'muovi', dir: 1 });
    avanzaFinche(s, () => p.mossa === 'scivolata', 120);
    eseguiComando(s, { t: 'muovi', dir: 0 });
    avanzaFinche(s, () => p.mossa !== 'scivolata', 300);
    expect(p.mossa).toBe('frenata');
    avanzaFinche(s, () => p.vx === 0, 120);
    expect(p.mossa).toBe('fermo');
    expect(piedi(s)).toBe(SUOLO);
    expect(p.x).toBeGreaterThan(1000 + 15); // la frenata dalla scivolata è lunga
  });

  it('sotto i 25° non si scivola (1 px ogni 3: circa 18°)', () => {
    const s = suDiscesa(1, 3);
    eseguiComando(s, { t: 'muovi', dir: 1 });
    const ev = avanza(s, 240);
    expect(eventiDi(ev, 'scivola')).toHaveLength(0);
    expect(pirata(s).x).toBeGreaterThan(900);
  });

  it('in salita sul pendio ripido si cammina (più piano), e da fermi non si scivola', () => {
    const s = battagliaPiatta([1200], [1800], { terreno: discesa(200, 800, 1, 1) });
    inAzione(s);
    const p = pirata(s);
    eseguiComando(s, { t: 'muovi', dir: -1 });
    const su = avanza(s, 300);
    expect(eventiDi(su, 'scivola')).toHaveLength(0);
    expect(piedi(s)).toBeLessThan(SUOLO - 40);
    eseguiComando(s, { t: 'muovi', dir: 0 });
    avanza(s, 20);
    const x = p.x, y = p.y;
    const fermo = avanza(s, 120);
    expect(eventiDi(fermo, 'scivola')).toHaveLength(0);
    expect(p.x).toBe(x);
    expect(p.y).toBe(y);
  });

  it('atterrando su un pendio ripido da una caduta alta parte in scivolata e non prende danno', () => {
    const prova = (mosse?: []) => {
      // terrazza alta a SUOLO − 400 fino a x 600; sotto, da x 600, un pendio di 45° che parte da SUOLO − 200
      const t = terrenoPiatto();
      rettangolo(t, 100, SUOLO - 400, 600, SUOLO, MATERIALE.roccia);
      for (let x = 600; x < 800; x++) rettangolo(t, x, SUOLO - 200 + (x - 600), x + 1, SUOLO, MATERIALE.roccia);
      const s = battagliaPiatta([580], [1800], { terreno: t });
      if (mosse) s.config.squadre[0].mosse = mosse;
      for (const p of s.pirati) if (p.squadra === 0) p.y = SUOLO - 400 - MEZZA;
      inAzione(s);
      const p = pirata(s);
      eseguiComando(s, { t: 'muovi', dir: 1 });
      const ev = avanzaFinche(s, () => !p.aTerra, 120);
      ev.push(...avanzaFinche(s, () => p.aTerra, 300));
      return { p, atterrato: eventiDi(ev, 'atterrato'), scivola: eventiDi(ev, 'scivola') };
    };
    const con = prova();
    expect(con.p.mossa).toBe('scivolata');
    expect(con.atterrato).toEqual([{ t: 'atterrato', pirata: 0, dannoCaduta: 0 }]);
    expect(con.scivola).toHaveLength(1);
    expect(con.p.vita).toBe(BIL.pirata.pv);
    const senza = prova([]);
    expect(senza.atterrato[0].dannoCaduta).toBeGreaterThan(0);
    expect(senza.scivola).toHaveLength(0);
  });

  it('il Balzo dalla scivolata salta con la rincorsa e chiude la scivolata', () => {
    const s = suDiscesa(1, 1);
    const p = pirata(s);
    eseguiComando(s, { t: 'muovi', dir: 1 });
    avanzaFinche(s, () => p.mossa === 'scivolata', 120);
    avanza(s, 10);
    eseguiComando(s, { t: 'salta', indietro: false });
    const ev = avanza(s, 1);
    expect(p.mossa).toBe('salto');
    expect(eventiDi(ev, 'scivola').map((e) => e.inizio)).toEqual([false]);
    expect(eventiDi(ev, 'salto')).toHaveLength(1);
    expect(p.vx).toBeGreaterThan(BIL.pirata.saltoAvanti.vx);
  });

  it('chi non è di turno non scivola, nemmeno sul pendio ripido', () => {
    const s = battagliaPiatta([400], [900], { terreno: discesa(200, 800, 1, 1) });
    const q = pirata(s, 1);
    avanza(s, 30);
    const x = q.x;
    const ev = avanza(s, 300);
    expect(eventiDi(ev, 'scivola')).toHaveLength(0);
    expect(q.x).toBe(x);
  });
});

describe('Salvataggio al bordo', () => {
  /** scogliera alta 150 px fino a x 800: cadendo giù si prendono PV */
  function scogliera(): StatoBattaglia {
    const t = terrenoPiatto();
    rettangolo(t, 100, SUOLO - 150, 800, SUOLO, MATERIALE.roccia);
    const s = battagliaPiatta([760], [1800], { terreno: t });
    for (const p of s.pirati) if (p.squadra === 0) p.y = SUOLO - 150 - MEZZA;
    inAzione(s);
    return s;
  }

  /** cammina oltre il ciglio e aspetta `dopo` tick di caduta */
  function cade(s: StatoBattaglia, dopo: number): void {
    const p = pirata(s);
    eseguiComando(s, { t: 'muovi', dir: 1 });
    avanzaFinche(s, () => !p.aTerra, 200);
    eseguiComando(s, { t: 'muovi', dir: 0 });
    avanza(s, dopo);
  }

  it('Balzo entro 0,5 s dalla caduta: si aggrappa al ciglio e si issa sopra, senza danno', () => {
    const s = scogliera();
    const p = pirata(s);
    cade(s, 12);
    expect(p.mossa).toBe('caduta');
    expect(balzoPossibile(s)).toBe('afferra');
    eseguiComando(s, { t: 'salta', indietro: false });
    const ev = avanza(s, 1);
    expect(eventiDi(ev, 'bordo')).toEqual([{ t: 'bordo', pirata: 0 }]);
    expect(p.mossa).toBe('bordo');
    expect(p.bordi).toBe(1);
    expect(p.verso).toBe(-1); // guarda la parete
    expect(p.y - MEZZA).toBeCloseTo(SUOLO - 150, 0); // la testa all'altezza del ciglio
    const sopra = avanzaFinche(s, () => p.aTerra, 120);
    expect(p.mossa).toBe('fermo');
    expect(piedi(s)).toBe(SUOLO - 150);
    expect(p.x).toBeLessThan(800);
    expect(eventiDi(sopra, 'danno')).toHaveLength(0);
    expect(p.vita).toBe(BIL.pirata.pv);
  });

  it('dopo 0,5 s il Balzo non salva più: cade e prende il danno', () => {
    const s = scogliera();
    const p = pirata(s);
    cade(s, M.bordoTick + 2);
    expect(balzoPossibile(s)).toBeUndefined();
    eseguiComando(s, { t: 'salta', indietro: false });
    const ev = avanzaFinche(s, () => p.aTerra, 300);
    expect(eventiDi(ev, 'bordo')).toHaveLength(0);
    expect(piedi(s)).toBe(SUOLO);
    expect(p.vita).toBeLessThan(BIL.pirata.pv);
  });

  it('una volta sola per battaglia', () => {
    const s = scogliera();
    const p = pirata(s);
    cade(s, 6);
    eseguiComando(s, { t: 'salta', indietro: false });
    avanzaFinche(s, () => p.aTerra, 120);
    expect(p.bordi).toBe(1);
    cade(s, 6);
    expect(balzoPossibile(s)).not.toBe('afferra');
    eseguiComando(s, { t: 'salta', indietro: false });
    const ev = avanzaFinche(s, () => p.aTerra, 300);
    expect(eventiDi(ev, 'bordo')).toHaveLength(0);
    expect(piedi(s)).toBe(SUOLO);
  });

  it('dal ciglio di un ponte sottile ci si salva e si risale sul ponte', () => {
    const t = terrenoPiatto();
    rettangolo(t, 600, SUOLO - 150, 800, SUOLO - 144, MATERIALE.legno); // ponte spesso 6 px, sotto il vuoto
    rettangolo(t, 580, SUOLO - 150, 600, SUOLO, MATERIALE.roccia); // pilone a sinistra
    const s = battagliaPiatta([760], [1800], { terreno: t });
    for (const p of s.pirati) if (p.squadra === 0) p.y = SUOLO - 150 - MEZZA;
    inAzione(s);
    const p = pirata(s);
    cade(s, 8);
    eseguiComando(s, { t: 'salta', indietro: false });
    avanza(s, 1);
    expect(p.mossa).toBe('bordo');
    avanzaFinche(s, () => p.aTerra, 120);
    expect(piedi(s)).toBe(SUOLO - 150);
    expect(p.vita).toBe(BIL.pirata.pv);
  });

  it('chi è sbalzato da un colpo non può salvarsi al bordo', () => {
    const s = scogliera();
    const p = pirata(s);
    cade(s, 4);
    p.mossa = 'aTerra'; p.mossaDa = s.tick; // come dopo staccaPirata
    expect(balzoPossibile(s)).toBeUndefined();
  });
});
