// Fase 3: pezzi che si staccano dopo uno scoppio, cadono, fanno macerie e si frantumano (sim/pezzi.ts).
import { describe, it, expect } from 'vitest';
import type { EventoBattaglia, StatoBattaglia, Terreno } from '../../src/core/tipi';
import { MATERIALE } from '../../src/core/tipi';
import { BIL } from '../../src/contenuti/bilanciamento';
import { creaBattaglia } from '../../src/battaglia/sim';
import { esplodi } from '../../src/battaglia/sim/esplosione';
import { avanza, avanzaFinche, battagliaPiatta, config, eventiDi, mappa, pirata, rettangolo, SUOLO, terrenoPiatto, W } from './aiuti';

const PICCOLO = { raggio: 10, danno: 0 };
const ALTO = SUOLO - 200;

/** Terreno piatto di roccia con una torre (x 900-940) e una mensola di roccia (x 940-1040, spessa 10) in cima. */
function conMensola(xTorre = 900): Terreno {
  const t = terrenoPiatto(MATERIALE.roccia);
  rettangolo(t, xTorre, ALTO, xTorre + 40, SUOLO, MATERIALE.roccia);
  rettangolo(t, xTorre + 40, ALTO, xTorre + 140, ALTO + 10, MATERIALE.roccia);
  return t;
}

/** Battaglia sulla mensola, già al turno 2, coi pirati lontani. */
function battaglia(t: Terreno, x0 = [300], x1 = [1700]): StatoBattaglia {
  const s = battagliaPiatta(x0, x1, { terreno: t });
  s.turno.numero = BIL.crolli.dalTurno;
  return s;
}

/** Taglia la mensola accanto alla torre e lascia cadere i pezzi finché non sono finiti. */
function tagliaECadi(s: StatoBattaglia, xTaglio = 945): { subito: EventoBattaglia[]; dopo: EventoBattaglia[] } {
  const subito: EventoBattaglia[] = [];
  esplodi(s, xTaglio, ALTO + 5, 'cassa', null, subito, PICCOLO);
  const dopo = avanzaFinche(s, (x) => x.pezzi!.length === 0, 600);
  return { subito, dopo };
}

const pieno = (t: Terreno, x: number, y: number) => t.maschera[y * t.w + x] !== MATERIALE.aria;

describe('Pezzi che cadono (Fase 3)', () => {
  it('lo stato nasce con pezzi, fuochi, frane, strutture, sostegni e le partenze ai piedi', () => {
    const t = conMensola();
    const m = mappa(t, [{ x: 300, y: SUOLO }], [{ x: 1700, y: SUOLO }]);
    m.sostegni = [{ x0: 1, y0: 2, x1: 3, y1: 4 }];
    m.strutture = [{ tipo: 'cengia', x0: 940, y0: ALTO, x1: 1039, y1: ALTO + 9 }];
    const s = creaBattaglia(config(1, 1), m);
    expect(s.pezzi).toEqual([]);
    expect(s.fuochi).toEqual([]);
    expect(s.frane).toEqual([]);
    expect(s.sostegni).toEqual([{ x0: 1, y0: 2, x1: 3, y1: 4 }]);
    expect(s.sostegni![0]).not.toBe(m.sostegni[0]);
    expect(s.strutture).toEqual([{ ...m.strutture[0], stato: 'intera' }]);
    expect(s.partenze).toEqual([{ x: 300, y: SUOLO }, { x: 1700, y: SUOLO }]);
  });

  it('una mensola tagliata alla base esce dalla maschera, cade e si frantuma a terra', () => {
    const s = battaglia(conMensola());
    const { subito, dopo } = tagliaECadi(s);
    const [c] = eventiDi(subito, 'crollo');
    expect(c).toMatchObject({ tipo: 'blocco', materiale: MATERIALE.roccia, y: ALTO });
    expect(c.x + c.w - 1).toBe(1039);
    expect(eventiDi(subito, 'maschera')).toHaveLength(1);
    expect(pieno(s.terreno, 1000, ALTO + 5)).toBe(false); // la mensola non c'è più
    const [m] = eventiDi(dopo, 'macerie');
    expect(m).toMatchObject({ pezzo: c.pezzo, inMare: false, materiale: MATERIALE.roccia });
    expect(m.y).toBeGreaterThan(SUOLO - 12); // arrivata sul suolo
    expect(m.y).toBeLessThanOrEqual(SUOLO);
    expect(pieno(s.terreno, 1000, SUOLO - 1)).toBe(false); // niente pezzi che si riappoggiano
  });

  it('al turno 1 non crolla niente', () => {
    const s = battaglia(conMensola());
    s.turno.numero = 1;
    const { subito } = tagliaECadi(s);
    expect(eventiDi(subito, 'crollo')).toEqual([]);
    expect(pieno(s.terreno, 1000, ALTO + 5)).toBe(true);
  });

  it('anti-frustrazione: una partenza nella zona di caduta tiene su il pezzo (anche se il pirata se n\'è andato)', () => {
    const s = battaglia(conMensola(), [1000], [1700]);
    pirata(s, 0).x = 300;
    const { subito } = tagliaECadi(s);
    expect(eventiDi(subito, 'crollo')).toEqual([]);
    expect(pieno(s.terreno, 1000, ALTO + 5)).toBe(true);
    // appena fuori dalla zona (più di rispettoSpawnPx oltre il lato) il pezzo cade
    const lontano = 1039 + BIL.crolli.rispettoSpawnPx + 2;
    const s2 = battaglia(conMensola(), [lontano], [1700]);
    expect(eventiDi(tagliaECadi(s2).subito, 'crollo')).toHaveLength(1);
  });

  it('le briciole spariscono in polvere senza diventare pezzi', () => {
    const t = terrenoPiatto(MATERIALE.roccia);
    rettangolo(t, 900, ALTO, 940, SUOLO, MATERIALE.roccia);
    rettangolo(t, 940, ALTO, 960, ALTO + 2, MATERIALE.roccia); // linguetta: dopo il taglio restano meno di 24 px
    const s = battaglia(t);
    const ev: EventoBattaglia[] = [];
    esplodi(s, 945, ALTO + 1, 'cassa', null, ev, { raggio: 7, danno: 0 });
    expect(eventiDi(ev, 'crollo')).toEqual([]);
    expect(eventiDi(ev, 'maschera')).toHaveLength(1);
    expect(s.pezzi).toEqual([]);
    expect(pieno(s.terreno, 957, ALTO)).toBe(false);
  });

  it('macerie: chi sta sotto prende 8 PV, una volta sola per pezzo', () => {
    const s = battaglia(conMensola());
    const p = pirata(s, 0);
    p.x = 1000; // sotto la mensola, ma non è la sua partenza
    const vita = p.vita;
    const { dopo } = tagliaECadi(s);
    const danni = eventiDi(dopo, 'danno').filter((d) => d.pirata === 0);
    expect(danni).toEqual([expect.objectContaining({ quanto: BIL.macerie.danno })]);
    expect(p.vita).toBe(vita - BIL.macerie.danno);
    expect(p.macerieNelTurno).toBe(BIL.macerie.danno);
    expect(p.stato).toBe('vivo');
  });

  it('macerie: mai oltre 20 PV a turno e mai l\'ultimo PV; a inizio turno il conto riparte', () => {
    const s = battaglia(conMensola());
    const p = pirata(s, 0);
    p.x = 1000;
    p.macerieNelTurno = BIL.macerie.maxPerTurno - 3;
    tagliaECadi(s);
    expect(p.macerieNelTurno).toBe(BIL.macerie.maxPerTurno);
    const s2 = battaglia(conMensola());
    const q = pirata(s2, 0);
    q.x = 1000; q.vita = 5;
    tagliaECadi(s2);
    expect(q.vita).toBe(1);
    expect(q.stato).toBe('vivo');
    // turno nuovo: il tetto si azzera
    avanzaFinche(s2, (x) => x.turno.numero > BIL.crolli.dalTurno, 6000);
    expect(q.macerieNelTurno).toBe(0);
  });

  it('chi sta sopra il pezzo cade con lui', () => {
    const s = battaglia(conMensola());
    const p = pirata(s, 0);
    p.x = 1010; p.y = ALTO - BIL.pirata.capsulaAltezza / 2; p.aTerra = true; p.yInizioCaduta = p.y;
    avanza(s, 2);
    expect(p.aTerra).toBe(true); // ci sta in piedi
    tagliaECadi(s);
    avanzaFinche(s, () => p.aTerra, 300);
    expect(p.y).toBeGreaterThan(SUOLO - 30); // è sceso fino al suolo
  });

  it('un pezzo sopra il mare ci cade dentro (macerie in mare)', () => {
    // isola fino a x 1948: la torre sul bordo, la mensola sporge sull'acqua
    const s = battaglia(conMensola(W - 140), [300], [1500]);
    const { subito, dopo } = tagliaECadi(s, W - 95);
    expect(eventiDi(subito, 'crollo')).toHaveLength(1);
    const [m] = eventiDi(dopo, 'macerie');
    expect(m.inMare).toBe(true);
  });

  it('la risoluzione aspetta che i pezzi siano finiti', () => {
    const t = terrenoPiatto(MATERIALE.roccia);
    rettangolo(t, 900, SUOLO - 500, 940, SUOLO, MATERIALE.roccia);
    rettangolo(t, 940, SUOLO - 500, 1040, SUOLO - 490, MATERIALE.roccia);
    const s = battaglia(t);
    s.turno.fase = 'risoluzione'; s.turno.inizioFase = s.tick; s.turno.fermoDa = -1;
    const ev: EventoBattaglia[] = [];
    esplodi(s, 945, SUOLO - 495, 'cassa', null, ev, PICCOLO);
    expect(s.pezzi).toHaveLength(1);
    const numero = s.turno.numero;
    let finitiA = -1;
    for (let k = 0; k < 600 && s.turno.numero === numero; k++) {
      avanza(s, 1);
      if (finitiA < 0 && s.pezzi!.length === 0) finitiA = s.tick;
      if (s.turno.numero === numero) continue;
      expect(finitiA).toBeGreaterThan(0);
    }
    expect(s.turno.numero).toBe(numero + 1);
    expect(finitiA).toBeGreaterThan(30); // 500 px di caduta: oltre mezzo secondo
  });

  it('deterministico: lo stesso crollo due volte dà gli stessi eventi', () => {
    const giro = () => {
      const s = battaglia(conMensola());
      pirata(s, 0).x = 1000;
      const { subito, dopo } = tagliaECadi(s);
      return JSON.stringify([...subito, ...dopo]);
    };
    expect(giro()).toBe(giro());
  });
});
