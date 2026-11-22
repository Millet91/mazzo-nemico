// Studio v2, Fase 1: i pirati si muovono come pirati. Corsa a falcate (passo corto, corsa, frenata, pendenze),
// evento `passo`, scavalco automatico dei muretti, Balzo, scale in un tocco e `Pirata.mossa` per render e audio.
import { describe, it, expect } from 'vitest';
import { BIL } from '../../src/contenuti/bilanciamento';
import { MATERIALE } from '../../src/core/tipi';
import type { StatoBattaglia, Terreno } from '../../src/core/tipi';
import { balzoPossibile, creaBattaglia, eseguiComando } from '../../src/battaglia/sim';
import { fermo } from '../../src/battaglia/sim/pirata';
import { pendenza } from '../../src/battaglia/sim/movimento';
import { avanza, avanzaFinche, battagliaPiatta, config, eventiDi, mappa, inAzione, pirata, rettangolo, spara, SUOLO, terrenoPiatto } from './aiuti';

const M = BIL.movimento;
const MEZZA = BIL.pirata.capsulaAltezza / 2;
const piedi = (s: StatoBattaglia, id = 0) => Math.floor(pirata(s, id).y) + MEZZA;

/** rampa che da x0 sale (o scende, con `passo` negativo) di `passo` px ogni `ogni` px, per `lunga` px */
function rampa(t: Terreno, x0: number, lunga: number, ogni: number, passo: number): void {
  for (let x = x0; x < x0 + lunga; x++) {
    const su = Math.floor((x - x0) / ogni + 1) * passo;
    if (su > 0) rettangolo(t, x, SUOLO - su, x + 1, SUOLO, MATERIALE.roccia);
    else for (let y = SUOLO; y < SUOLO - su; y++) t.maschera[y * t.w + x] = MATERIALE.aria;
  }
}

describe('Corsa a falcate', () => {
  it('tocco breve = passo corto a 60 px/s; tenendo oltre 0,4 s parte la corsa a 96 px/s', () => {
    const s = battagliaPiatta([800], [1600]);
    inAzione(s);
    const p = pirata(s);
    expect(p.mossa ?? 'fermo').toBe('fermo');
    eseguiComando(s, { t: 'muovi', dir: 1 });
    avanza(s, M.corsaDopoTick);
    expect(p.x).toBeCloseTo(800 + M.corsaDopoTick * M.passoVel, 6);
    expect(p.mossa).toBe('passo');
    avanza(s, M.corsaAccelTick);
    expect(p.mossa).toBe('corsa');
    expect(Math.abs(p.vx)).toBeCloseTo(M.corsaVel, 6); // a regime entro 0,15 s
    const x = p.x;
    avanza(s, 60);
    expect(p.x - x).toBeCloseTo(60 * M.corsaVel, 6);
  });

  it('lasciando la freccia dalla corsa frena in circa 6 px e poi è fermo; dal passo si ferma subito', () => {
    const s = battagliaPiatta([800], [1600]);
    inAzione(s);
    const p = pirata(s);
    eseguiComando(s, { t: 'muovi', dir: 1 });
    avanza(s, 60);
    const x = p.x;
    eseguiComando(s, { t: 'muovi', dir: 0 });
    avanza(s, 1);
    expect(p.mossa).toBe('frenata');
    expect(fermo(p)).toBe(false);
    avanzaFinche(s, () => fermo(p), 60);
    expect(p.x - x).toBeGreaterThan(M.frenataPx - 2);
    expect(p.x - x).toBeLessThanOrEqual(M.frenataPx + 1);
    expect(p.mossa).toBe('fermo');
    // passo corto
    eseguiComando(s, { t: 'muovi', dir: -1 });
    avanza(s, 5);
    const x2 = p.x;
    eseguiComando(s, { t: 'muovi', dir: 0 });
    avanza(s, 3);
    expect(p.x).toBe(x2);
    expect(p.mossa).toBe('fermo');
  });

  it('un evento `passo` ogni 14 px, con corsa e materiale', () => {
    const s = battagliaPiatta([800], [1600]);
    inAzione(s);
    eseguiComando(s, { t: 'muovi', dir: 1 });
    const ev = eventiDi(avanza(s, 90), 'passo');
    const fatti = pirata(s).x - 800;
    expect(ev.length).toBeGreaterThanOrEqual(Math.floor(fatti / M.passoPx));
    expect(ev.length).toBeLessThanOrEqual(Math.ceil(fatti / M.passoPx));
    expect(ev[0]).toMatchObject({ pirata: 0, corsa: false, materiale: MATERIALE.sabbia, y: SUOLO });
    expect(ev[ev.length - 1].corsa).toBe(true);
  });

  it('in salita rallenta e in discesa accelera (30% a 45°)', () => {
    const fatti = (passo: number) => {
      const t = terrenoPiatto();
      if (passo < 0) rettangolo(t, 100, SUOLO - 300, 800, SUOLO, MATERIALE.roccia); // altopiano da cui scendere
      const s = passo > 0
        ? (rampa(t, 800, 400, 1, 1), battagliaPiatta([780], [1700], { terreno: t }))
        : (() => { for (let x = 800; x < 1100; x++) rettangolo(t, x, SUOLO - 300 + (x - 799), x + 1, SUOLO, MATERIALE.roccia); return battagliaPiatta([780], [1700], { terreno: t }); })();
      inAzione(s);
      eseguiComando(s, { t: 'muovi', dir: 1 });
      avanza(s, 60);
      const x = pirata(s).x;
      avanza(s, 60);
      return pirata(s).x - x;
    };
    const piano = 60 * M.corsaVel;
    expect(fatti(1)).toBeCloseTo(piano * (1 - M.pendenzaFrazione), 0);
    expect(fatti(-1)).toBeCloseTo(piano * (1 + M.pendenzaFrazione), 0);
  });

  it('la pendenza si misura sul terreno davanti: + salita, − discesa', () => {
    const t = terrenoPiatto();
    rampa(t, 800, 200, 2, 1);
    expect(pendenza(t, 700, SUOLO - MEZZA, 1)).toBe(0);
    const su = pendenza(t, 900, SUOLO - 50 - MEZZA, 1), giu = pendenza(t, 900, SUOLO - 50 - MEZZA, -1);
    expect(su).toBeGreaterThanOrEqual(0.375);
    expect(su).toBeLessThanOrEqual(0.625);
    expect(giu).toBeLessThanOrEqual(-0.375);
    expect(giu).toBeGreaterThanOrEqual(-0.625);
  });

  it('uscendo di corsa da un ciglio il pirata cade con lo slancio (mossa caduta)', () => {
    const t = terrenoPiatto();
    rettangolo(t, 100, SUOLO - 60, 800, SUOLO, MATERIALE.roccia);
    const s = battagliaPiatta([700], [1700], { terreno: t });
    inAzione(s);
    const p = pirata(s);
    eseguiComando(s, { t: 'muovi', dir: 1 });
    avanzaFinche(s, () => !p.aTerra, 200);
    expect(p.mossa).toBe('caduta');
    expect(p.vx).toBeCloseTo(M.corsaVel, 6);
    avanzaFinche(s, () => p.aTerra, 200);
    expect(piedi(s)).toBe(SUOLO);
    expect(p.vita).toBe(BIL.pirata.pv);
  });

  it('a fine fuga il pirata che corre frena e il turno passa lo stesso', () => {
    const s = battagliaPiatta([800], [1600]);
    inAzione(s);
    spara(s, 'cannone', 180 * 2 - 90, 100); // verso l'alto a sinistra, lontano
    avanza(s, 1);
    eseguiComando(s, { t: 'muovi', dir: 1 });
    avanzaFinche(s, (x) => x.turno.numero === 2, 1200);
    expect(s.turno.numero).toBe(2);
    expect(fermo(pirata(s, 0))).toBe(true);
    expect(pirata(s, 0).x).toBeGreaterThan(800 + 100); // in 1,5 s di fuga si fanno più di 100 px
  });
});

describe('Scavalco automatico', () => {
  /** muretto di roccia alto `alto` px e largo `largo` px da x 600; il pirata parte a x0 */
  function conMuretto(alto: number, largo = 300, x0 = 560): StatoBattaglia {
    const t = terrenoPiatto();
    rettangolo(t, 600, SUOLO - alto, 600 + largo, SUOLO, MATERIALE.roccia);
    return battagliaPiatta([x0], [1600], { terreno: t });
  }

  it('camminando contro un muretto da 9 a 28 px ci si issa da soli, in al più 0,25 s', () => {
    for (const alto of [9, 16, 24, 28]) {
      const s = conMuretto(alto);
      inAzione(s);
      const p = pirata(s);
      eseguiComando(s, { t: 'muovi', dir: 1 });
      const prima = avanzaFinche(s, () => p.mossa === 'scavalco', 200);
      expect(eventiDi(prima, 'scavalco'), `alto ${alto}`).toEqual([{ t: 'scavalco', pirata: 0 }]);
      const t0 = s.tick;
      const ev = avanzaFinche(s, () => p.aTerra, 60);
      expect(s.tick - t0, `alto ${alto}`).toBeLessThanOrEqual(M.scavalcoTick);
      expect(piedi(s), `alto ${alto}`).toBe(SUOLO - alto); // in piedi sopra, non in bilico sullo spigolo
      expect(eventiDi(ev, 'danno')).toHaveLength(0);
      expect(eventiDi(ev, 'atterrato')).toHaveLength(0); // non è un salto
      avanza(s, 30);
      expect(piedi(s), `alto ${alto}`).toBe(SUOLO - alto);
      expect(p.x, `alto ${alto}`).toBeGreaterThan(610); // e continua a camminare sopra
      expect(p.vita).toBe(BIL.pirata.pv);
    }
  });

  it('oltre 28 px non si scavalca: il pirata resta sotto, fermo', () => {
    const s = conMuretto(29);
    inAzione(s);
    const p = pirata(s);
    eseguiComando(s, { t: 'muovi', dir: 1 });
    const ev = avanza(s, 120);
    expect(eventiDi(ev, 'scavalco')).toHaveLength(0);
    expect(piedi(s)).toBe(SUOLO);
    expect(p.x).toBeLessThan(600);
    expect(p.mossa).toBe('fermo');
  });

  it('con un soffitto basso sopra la testa non si scavalca', () => {
    const t = terrenoPiatto();
    rettangolo(t, 600, SUOLO - 20, 900, SUOLO, MATERIALE.roccia);
    rettangolo(t, 500, SUOLO - 60, 900, SUOLO - 32, MATERIALE.roccia); // tetto a 32 px dal suolo: il pirata (22) ci sta, issarsi no
    const s = battagliaPiatta([560], [1600], { terreno: t });
    inAzione(s);
    eseguiComando(s, { t: 'muovi', dir: 1 });
    const ev = avanza(s, 120);
    expect(eventiDi(ev, 'scavalco')).toHaveLength(0);
    expect(piedi(s)).toBe(SUOLO);
  });

  it('un muretto sottile si scavalca e si scende dall\'altra parte', () => {
    const s = conMuretto(20, 6);
    inAzione(s);
    const p = pirata(s);
    eseguiComando(s, { t: 'muovi', dir: 1 });
    avanzaFinche(s, () => p.x > 640, 300);
    expect(p.x).toBeGreaterThan(640);
    expect(p.vita).toBe(BIL.pirata.pv);
  });

  it('girandosi a metà scavalco il pirata lo lascia e torna giù', () => {
    const s = conMuretto(28);
    inAzione(s);
    const p = pirata(s);
    eseguiComando(s, { t: 'muovi', dir: 1 });
    avanzaFinche(s, () => p.mossa === 'scavalco', 200);
    avanza(s, 3);
    eseguiComando(s, { t: 'muovi', dir: -1 });
    avanzaFinche(s, () => p.aTerra, 120);
    avanza(s, 2);
    expect(piedi(s)).toBe(SUOLO);
    expect(p.verso).toBe(-1);
  });

  it('i pirati fermi non scavalcano e non scivolano: chi non è di turno resta dov\'è', () => {
    const s = conMuretto(20, 300, 593);
    const h = pirata(s, 0).x;
    avanza(s, 200);
    expect(pirata(s, 0).x).toBe(h);
    expect(piedi(s)).toBe(SUOLO);
  });
});

describe('Mossa del pirata (per render e audio)', () => {
  it('salto e caduta, poi fermo', () => {
    const s = battagliaPiatta([800], [1600]);
    inAzione(s);
    const p = pirata(s);
    eseguiComando(s, { t: 'salta', indietro: false });
    avanza(s, 2);
    expect(p.mossa).toBe('salto');
    avanzaFinche(s, () => p.vy > 0, 100);
    avanza(s, 1);
    expect(p.mossa).toBe('caduta');
    avanzaFinche(s, () => p.aTerra, 200);
    expect(p.mossa).toBe('fermo');
  });

  it('chi è sbalzato da un colpo è "aTerra" dal colpo fino a mezzo secondo dopo che si è fermato', () => {
    const s = battagliaPiatta([800], [900]);
    inAzione(s);
    spara(s, 'cannone', 20, 60);
    const q = pirata(s, 1);
    avanzaFinche(s, () => q.mossa === 'aTerra', 300);
    expect(q.mossa).toBe('aTerra');
    expect(q.aTerra).toBe(false);
    avanzaFinche(s, () => q.aTerra, 600);
    expect(q.mossa).toBe('aTerra');
    const fermoDa = s.tick;
    avanzaFinche(s, () => q.mossa !== 'aTerra', 120);
    if (q.vita > 0) {
      expect(q.mossa).toBe('fermo');
      expect(s.tick - fermoDa).toBeGreaterThanOrEqual(28);
      expect(s.tick - fermoDa).toBeLessThanOrEqual(31);
    }
  });

  it('su scala e liana la mossa dice a cosa è aggrappato', () => {
    for (const tipo of ['scala', 'liana'] as const) {
      const m = mappa(terrenoPiatto(), [{ x: 800, y: SUOLO }], [{ x: 1600, y: SUOLO }]);
      m.appigli = [{ tipo, x: 800, yAlto: SUOLO - 200, yBasso: SUOLO }];
      const s = creaBattaglia(config(1, 1), m);
      inAzione(s);
      eseguiComando(s, { t: 'arrampica', dir: -1 });
      avanza(s, 10);
      expect(pirata(s, 0).mossa).toBe(tipo);
    }
  });
});

describe('Balzo', () => {
  /** parete di roccia alta `alto` px da x 600; il pirata parte a x0 e guarda a destra */
  function conParete(alto: number, x0: number): StatoBattaglia {
    const t = terrenoPiatto();
    rettangolo(t, 600, SUOLO - alto, 900, SUOLO, MATERIALE.roccia);
    return battagliaPiatta([x0], [1600], { terreno: t });
  }
  /** corda (o scala) appesa in aria a x 850, da 150 a 30 px sopra il suolo; il pirata parte a x0 */
  function conCorda(x0: number, yBasso = SUOLO - 30): StatoBattaglia {
    const m = mappa(terrenoPiatto(), [{ x: x0, y: SUOLO }], [{ x: 1600, y: SUOLO }]);
    m.appigli = [{ tipo: 'liana', x: 850, yAlto: SUOLO - 150, yBasso }];
    return creaBattaglia(config(1, 1), m);
  }
  const salta = (s: StatoBattaglia, indietro = false) => { eseguiComando(s, { t: 'salta', indietro }); return avanza(s, 1); };

  it('il salto atterra in piedi, senza rimbalzi: da fermo circa 69 px', () => {
    const s = battagliaPiatta([800], [1600]);
    inAzione(s);
    const p = pirata(s);
    expect(balzoPossibile(s)).toBe('salto');
    const ev = [...salta(s), ...avanzaFinche(s, () => p.aTerra, 200)];
    expect(eventiDi(ev, 'salto')).toHaveLength(1);
    expect(eventiDi(ev, 'atterrato')).toEqual([{ t: 'atterrato', pirata: 0, dannoCaduta: 0 }]);
    expect(p.x - 800).toBeGreaterThan(64);
    expect(p.x - 800).toBeLessThan(74);
    expect(piedi(s)).toBe(SUOLO);
    const x = p.x;
    avanza(s, 30);
    expect(p.x).toBe(x); // fermo dov'è atterrato
    expect(p.mossa).toBe('fermo');
  });

  it('con la rincorsa il salto è più lungo (circa 105 px); senza la mossa premio resta quello da fermo', () => {
    const lungo = (mosse?: []) => {
      const s = battagliaPiatta([800], [1600]);
      if (mosse) s.config.squadre[0].mosse = mosse;
      inAzione(s);
      const p = pirata(s);
      eseguiComando(s, { t: 'muovi', dir: 1 });
      avanza(s, 50);
      eseguiComando(s, { t: 'muovi', dir: 0 });
      const x = p.x;
      salta(s);
      avanzaFinche(s, () => p.aTerra, 200);
      return p.x - x;
    };
    expect(lungo()).toBeGreaterThan(98);
    expect(lungo()).toBeLessThan(112);
    expect(lungo([])).toBeLessThan(74);
  });

  it('tenendo la freccia si atterra e si riparte di corsa senza fermarsi', () => {
    const s = battagliaPiatta([800], [1600]);
    inAzione(s);
    const p = pirata(s);
    eseguiComando(s, { t: 'muovi', dir: 1 });
    avanza(s, 50);
    salta(s);
    avanzaFinche(s, () => p.aTerra, 200);
    expect(p.mossa).toBe('corsa');
    expect(p.vx).toBeCloseTo(M.corsaVel, 6);
  });

  it('sale su una cassa di 32 px, da attaccato e con un po\' di distanza', () => {
    for (const x0 of [594, 588, 575, 560]) {
      const s = conParete(32, x0);
      inAzione(s);
      const p = pirata(s);
      salta(s);
      avanzaFinche(s, () => p.aTerra, 300);
      expect(piedi(s), `da x ${x0}`).toBe(SUOLO - 32);
      expect(p.vita).toBe(BIL.pirata.pv);
    }
  });

  it('attaccato a un muretto fino a 28 px il Balzo è lo scavalco', () => {
    const s = conParete(20, 594);
    inAzione(s);
    expect(balzoPossibile(s)).toBe('scavalca');
    const ev = salta(s);
    expect(eventiDi(ev, 'scavalco')).toHaveLength(1);
    expect(eventiDi(ev, 'salto')).toHaveLength(0);
  });

  it('salto dal muro: in aria contro una parete il Balzo spinge dall\'altra parte, una volta sola', () => {
    const s = conParete(200, 585);
    inAzione(s);
    const p = pirata(s);
    salta(s);
    avanzaFinche(s, () => balzoPossibile(s) === 'muro', 60);
    expect(balzoPossibile(s)).toBe('muro');
    const yMuro = p.y;
    const ev = salta(s, true);
    expect(eventiDi(ev, 'saltoMuro')).toEqual([{ t: 'saltoMuro', pirata: 0 }]);
    expect(p.verso).toBe(-1);
    expect(p.vx).toBeLessThan(0);
    expect(p.saltiMuro).toBe(1);
    avanza(s, 5);
    expect(p.y).toBeLessThan(yMuro); // risale
    expect(balzoPossibile(s)).toBeUndefined(); // in aria, lontano dalla parete: niente
    avanzaFinche(s, () => p.aTerra, 300);
    expect(p.x).toBeLessThan(585);
    expect(p.saltiMuro).toBe(0);
    expect(p.vita).toBe(BIL.pirata.pv);
  });

  it('due pareti vicine: un solo salto dal muro per volo', () => {
    const t = terrenoPiatto();
    rettangolo(t, 600, SUOLO - 300, 900, SUOLO, MATERIALE.roccia);
    rettangolo(t, 500, SUOLO - 300, 540, SUOLO - 40, MATERIALE.roccia); // parete di fronte, staccata da terra
    const s = battagliaPiatta([585], [1600], { terreno: t });
    inAzione(s);
    const p = pirata(s);
    salta(s);
    avanzaFinche(s, () => balzoPossibile(s) === 'muro', 60);
    salta(s);
    avanzaFinche(s, () => p.x < 560, 60);
    avanza(s, 12);
    expect(eventiDi(salta(s), 'saltoMuro')).toHaveLength(0);
  });

  it('da terra, contro una parete alta: `indietro` fa il salto dal muro, il Balzo normale salta sul posto', () => {
    const s = conParete(200, 594);
    inAzione(s);
    const p = pirata(s);
    expect(balzoPossibile(s)).toBe('salto');
    const ev = salta(s, true);
    expect(eventiDi(ev, 'saltoMuro')).toHaveLength(1);
    avanzaFinche(s, () => p.aTerra, 300);
    expect(p.x).toBeLessThan(560);
    expect(p.verso).toBe(-1);
  });

  it('afferra al volo: in aria vicino a una liana il Balzo la prende e resta appeso', () => {
    const s = conCorda(800);
    inAzione(s);
    const p = pirata(s);
    salta(s);
    avanzaFinche(s, () => balzoPossibile(s) === 'afferra', 100);
    expect(p.aTerra).toBe(false);
    const ev = salta(s);
    expect(eventiDi(ev, 'aggrappato')).toHaveLength(1);
    expect(p.appeso).toBeGreaterThan(0);
    const y = p.y;
    avanza(s, 30);
    expect(p.y).toBe(y);
    expect(p.mossa).toBe('liana');
    expect(balzoPossibile(s)).toBe('stacca');
    const via = salta(s);
    expect(eventiDi(via, 'salto')).toHaveLength(1);
    expect(p.appeso).toBe(-1);
    avanzaFinche(s, () => p.aTerra, 300);
    expect(p.x).toBeGreaterThan(880);
  });

  it('ai piedi di una scala il Balzo la prende e sale in un tocco fino in cima', () => {
    const s = conCorda(850, SUOLO);
    inAzione(s);
    const p = pirata(s);
    expect(balzoPossibile(s)).toBe('afferra');
    salta(s);
    expect(p.appeso).toBeGreaterThan(0);
    avanzaFinche(s, () => s.turno.arrampicata === 0, 300);
    expect(Math.floor(p.y) + MEZZA).toBeLessThanOrEqual(SUOLO - 150 + 1);
    expect(s.turno.arrampicata).toBe(0);
  });

  it('chi è stato sbalzato da un colpo non può fare il Balzo finché vola', () => {
    const s = battagliaPiatta([800], [1600]);
    inAzione(s);
    spara(s, 'cannone', 2 * 280, 20); // quasi sui piedi
    avanzaFinche(s, () => !pirata(s, 0).aTerra, 200);
    if (pirata(s, 0).mossa === 'aTerra') expect(balzoPossibile(s)).toBeUndefined();
  });
});

describe('Scale e liane in un tocco', () => {
  function conScala(x0: number, piedi0 = SUOLO): StatoBattaglia {
    const t = terrenoPiatto();
    rettangolo(t, 900, SUOLO - 160, 1100, SUOLO, MATERIALE.roccia);
    const m = mappa(t, [{ x: x0, y: piedi0 }], [{ x: 1600, y: SUOLO }]);
    m.appigli = [{ tipo: 'scala', x: 888, yAlto: SUOLO - 160, yBasso: SUOLO }];
    return creaBattaglia(config(1, 1), m);
  }

  it('un solo comando "sali" porta in cima a 90 px/s e poi il comando si spegne', () => {
    const s = conScala(888);
    inAzione(s);
    const p = pirata(s);
    const t0 = s.tick;
    eseguiComando(s, { t: 'arrampica', dir: -1 });
    avanzaFinche(s, () => p.aTerra && Math.floor(p.y) + MEZZA === SUOLO - 160, 400);
    expect(Math.floor(p.y) + MEZZA).toBe(SUOLO - 160);
    expect(s.tick - t0).toBeLessThanOrEqual(Math.ceil(160 / M.scalaVel) + 30);
    avanza(s, 1);
    expect(s.turno.arrampicata).toBe(0);
  });

  it('un solo "scendi" dall\'alto porta in fondo; `arrampica 0` ferma a metà come prima', () => {
    const s = conScala(905, SUOLO - 160);
    inAzione(s);
    const p = pirata(s);
    eseguiComando(s, { t: 'arrampica', dir: 1 });
    avanza(s, 40);
    eseguiComando(s, { t: 'arrampica', dir: 0 });
    const y = p.y;
    avanza(s, 20);
    expect(p.y).toBe(y);
    expect(p.appeso).toBeGreaterThan(0);
    eseguiComando(s, { t: 'arrampica', dir: 1 });
    avanzaFinche(s, () => p.aTerra, 400);
    expect(Math.floor(p.y) + MEZZA).toBe(SUOLO);
    expect(p.vita).toBe(BIL.pirata.pv);
  });

  it('"sali" premuto lontano da scale e liane non resta acceso (in fuga il turno passa)', () => {
    const s = battagliaPiatta([800], [1600]);
    inAzione(s);
    eseguiComando(s, { t: 'arrampica', dir: -1 });
    avanza(s, 2);
    expect(s.turno.arrampicata).toBe(0);
  });
});
