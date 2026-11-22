// Agente Fisica · scale e liane (richiesta del proprietario, 21/11/2026): aggrapparsi, salire, scendere, tagliarle.
import { describe, it, expect } from 'vitest';
import { BIL } from '../../src/contenuti/bilanciamento';
import { MATERIALE } from '../../src/core/tipi';
import type { StatoBattaglia, TipoAppiglio } from '../../src/core/tipi';
import { creaBattaglia, eseguiComando, hashStato, simulaColpo } from '../../src/battaglia/sim';
import { esplodi } from '../../src/battaglia/sim/esplosione';
import { annega } from '../../src/battaglia/sim/pirata';
import { avanza, avanzaFinche, config, eventiDi, inAzione, mappa, pirata, rettangolo, SUOLO, terrenoPiatto } from './aiuti';

/** Torre di roccia da x 900 a 1100, cima a quota 480; scala 10 px a sinistra del bordo, dalla cima al suolo. */
const CIMA = 480;
const XS = 890;

function conScala(x0: number, piedi0 = SUOLO, tipo: TipoAppiglio = 'scala'): StatoBattaglia {
  const t = terrenoPiatto();
  rettangolo(t, 900, CIMA, 1100, SUOLO, MATERIALE.roccia);
  const m = mappa(t, [{ x: x0, y: piedi0 }], [{ x: 1600, y: SUOLO }]);
  m.appigli = [{ tipo, x: XS, yAlto: CIMA, yBasso: SUOLO }];
  return creaBattaglia(config(1, 1), m);
}

const piedi = (s: StatoBattaglia) => Math.floor(pirata(s, 0).y) + BIL.pirata.capsulaAltezza / 2;

describe('Scale e liane', () => {
  it('la mappa porta gli appigli nello stato con un id; i pezzi troppo corti si scartano', () => {
    const t = terrenoPiatto();
    const m = mappa(t, [{ x: 500, y: SUOLO }], [{ x: 1600, y: SUOLO }]);
    m.appigli = [{ tipo: 'liana', x: 300, yAlto: 400, yBasso: 500 }, { tipo: 'scala', x: 700, yAlto: 590, yBasso: 595 }];
    const s = creaBattaglia(config(1, 1), m);
    expect(s.appigli).toHaveLength(1);
    expect(s.appigli[0]).toMatchObject({ tipo: 'liana', x: 300, yAlto: 400, yBasso: 500 });
    expect(s.pirati.every((p) => p.appeso === -1)).toBe(true);
  });

  it('dal suolo si aggrappa, sale e scende sulla cima della torre senza danno', () => {
    const s = conScala(882);
    inAzione(s);
    eseguiComando(s, { t: 'arrampica', dir: -1 });
    const ev = avanzaFinche(s, (x) => pirata(x, 0).aTerra && piedi(x) === CIMA, 400);
    expect(eventiDi(ev, 'aggrappato')).toEqual([{ t: 'aggrappato', pirata: 0, appiglio: s.appigli[0].id }]);
    expect(eventiDi(ev, 'staccato')).toHaveLength(1);
    expect(eventiDi(ev, 'danno')).toHaveLength(0);
    const p = pirata(s, 0);
    expect(p.appeso).toBe(-1);
    expect(piedi(s)).toBe(CIMA);
    expect(p.x).toBeGreaterThan(900 - BIL.pirata.capsulaLarghezza / 2);
    // 120 px a 40 px/s: 3 s, più i passi per passare sulla torre
    expect(s.tick).toBeLessThan(260);
  });

  it('sale e scende a 90 px/s (in un tocco), scala e liana uguali', () => {
    for (const tipo of ['scala', 'liana'] as const) {
      const s = conScala(882, SUOLO, tipo);
      inAzione(s);
      eseguiComando(s, { t: 'arrampica', dir: -1 });
      avanza(s, 2); // si aggrappa e fa il primo passo
      const y0 = pirata(s, 0).y;
      avanza(s, 40);
      expect(y0 - pirata(s, 0).y).toBeCloseTo(40 * BIL.movimento.scalaVel, 6);
      eseguiComando(s, { t: 'arrampica', dir: 1 }); // il tasto opposto ferma
      const y1 = pirata(s, 0).y;
      avanza(s, 10);
      expect(pirata(s, 0).y).toBe(y1);
      eseguiComando(s, { t: 'arrampica', dir: 1 }); // di nuovo: scende
      avanza(s, 20);
      expect(pirata(s, 0).y - y1).toBeCloseTo(20 * BIL.movimento.scalaVel, 6);
    }
  });

  it('un evento piolo ogni pioloPx px di arrampicata, su e giù; liana: true solo sulle liane', () => {
    for (const tipo of ['scala', 'liana'] as const) {
      const s = conScala(882, SUOLO, tipo);
      inAzione(s);
      eseguiComando(s, { t: 'arrampica', dir: -1 });
      avanza(s, 2);
      const y0 = pirata(s, 0).y;
      const su = eventiDi(avanza(s, 60), 'piolo');
      const salito = y0 - pirata(s, 0).y;
      expect(su.length).toBeGreaterThanOrEqual(Math.floor(salito / BIL.movimento.pioloPx));
      expect(su.length).toBeLessThanOrEqual(Math.ceil(salito / BIL.movimento.pioloPx));
      expect(su.every((e) => e.pirata === 0 && e.liana === (tipo === 'liana'))).toBe(true);
      eseguiComando(s, { t: 'arrampica', dir: 1 }); // ferma
      expect(eventiDi(avanza(s, 20), 'piolo')).toHaveLength(0);
      eseguiComando(s, { t: 'arrampica', dir: 1 }); // scende
      expect(eventiDi(avanza(s, 30), 'piolo').length).toBeGreaterThan(0);
    }
  });

  it('dalla cima scende fino al suolo e appoggia i piedi senza danno da caduta', () => {
    const s = conScala(898, CIMA);
    inAzione(s);
    eseguiComando(s, { t: 'arrampica', dir: 1 });
    const ev = avanzaFinche(s, (x) => pirata(x, 0).aTerra && piedi(x) === SUOLO, 400);
    expect(eventiDi(ev, 'aggrappato')).toHaveLength(1);
    expect(eventiDi(ev, 'danno')).toHaveLength(0);
    expect(pirata(s, 0).x).toBe(XS);
    expect(pirata(s, 0).appeso).toBe(-1);
  });

  it('in cima salendo non si riaggrappa, in fondo scendendo nemmeno; lontano dalla scala non succede niente', () => {
    const s = conScala(898, CIMA);
    inAzione(s);
    eseguiComando(s, { t: 'arrampica', dir: -1 });
    expect(eventiDi(avanza(s, 5), 'aggrappato')).toHaveLength(0);
    const s2 = conScala(882);
    inAzione(s2);
    eseguiComando(s2, { t: 'arrampica', dir: 1 });
    expect(eventiDi(avanza(s2, 5), 'aggrappato')).toHaveLength(0);
    const s3 = conScala(700);
    inAzione(s3);
    eseguiComando(s3, { t: 'arrampica', dir: -1 });
    avanza(s3, 30);
    expect(pirata(s3, 0).appeso).toBe(-1);
    expect(piedi(s3)).toBe(SUOLO);
  });

  it('appeso resta fermo a metà, senza gravità, anche nei turni degli altri; la risoluzione non lo aspetta', () => {
    const s = conScala(882);
    inAzione(s);
    eseguiComando(s, { t: 'arrampica', dir: -1 });
    avanza(s, 40);
    eseguiComando(s, { t: 'arrampica', dir: 0 });
    avanza(s, 2);
    const y = pirata(s, 0).y;
    expect(pirata(s, 0).appeso).toBeGreaterThan(0);
    avanzaFinche(s, (x) => x.turno.numero === 3, 3000);
    expect(pirata(s, 0).appeso).toBeGreaterThan(0);
    expect(pirata(s, 0).y).toBe(y);
    expect(pirata(s, 0).vita).toBe(BIL.pirata.pv);
  });

  it('salta dalla scala: salto normale e niente più appiglio', () => {
    const s = conScala(882);
    inAzione(s);
    eseguiComando(s, { t: 'arrampica', dir: -1 });
    avanza(s, 30);
    eseguiComando(s, { t: 'arrampica', dir: 0 });
    eseguiComando(s, { t: 'salta', indietro: false });
    const ev = avanza(s, 1);
    expect(eventiDi(ev, 'salto')).toHaveLength(1);
    expect(pirata(s, 0).appeso).toBe(-1);
  });

  it("un'esplosione taglia la scala: due pezzi, chi era sul tratto tolto cade", () => {
    const s = conScala(882);
    inAzione(s);
    eseguiComando(s, { t: 'arrampica', dir: -1 });
    avanza(s, 40);
    eseguiComando(s, { t: 'arrampica', dir: 0 });
    avanza(s, 1);
    const prima = hashStato(s);
    const ev: Parameters<typeof esplodi>[5] = [];
    // lontano dal pirata (fuori dal raggio), sul tratto basso della scala
    esplodi(s, XS + 20, 595, 'lapide', null, ev, { raggio: 25, danno: 10 });
    expect(eventiDi(ev, 'appiglioRotto')).toHaveLength(1);
    const pezzi = [...s.appigli].sort((a, b) => a.yAlto - b.yAlto);
    expect(pezzi).toHaveLength(1); // il pezzo sotto è più corto di pezzoMinimo
    expect(pezzi[0].yAlto).toBe(CIMA);
    expect(pezzi[0].yBasso).toBeCloseTo(595 - Math.sqrt(25 * 25 - 20 * 20), 6);
    expect(hashStato(s)).not.toBe(prima);
    expect(pirata(s, 0).appeso).toBe(pezzi[0].id); // è più in alto: resta appeso

    // ora un'esplosione proprio sotto i suoi piedi: lo spinge via e toglie il pezzo dove stava
    const ev2: Parameters<typeof esplodi>[5] = [];
    esplodi(s, XS, pirata(s, 0).y + 20, 'lapide', null, ev2, { raggio: 25, danno: 10 });
    expect(eventiDi(ev2, 'staccato')).toEqual([{ t: 'staccato', pirata: 0 }]);
    expect(pirata(s, 0).appeso).toBe(-1);
    expect(s.appigli.length).toBeGreaterThanOrEqual(1);
    const ev3 = avanzaFinche(s, (x) => pirata(x, 0).aTerra, 300);
    expect(eventiDi(ev3, 'atterrato')).toHaveLength(1);
  });

  it('se la scala sparisce sotto le mani il pirata cade dal punto in cui era', () => {
    const s = conScala(882);
    inAzione(s);
    eseguiComando(s, { t: 'arrampica', dir: -1 });
    avanza(s, 60);
    eseguiComando(s, { t: 'arrampica', dir: 0 });
    avanza(s, 1);
    const y = pirata(s, 0).y;
    s.appigli = []; // come se un'esplosione lontana dal pirata l'avesse tolta tutta
    const ev = avanza(s, 1);
    expect(eventiDi(ev, 'staccato')).toHaveLength(1);
    expect(pirata(s, 0).yInizioCaduta).toBe(y);
    avanzaFinche(s, (x) => pirata(x, 0).aTerra, 300);
    expect(piedi(s)).toBe(SUOLO);
  });

  it('simulaColpo lascia al suo posto chi è appeso e non viene colpito', () => {
    const s = conScala(882);
    inAzione(s);
    eseguiComando(s, { t: 'arrampica', dir: -1 });
    avanza(s, 40);
    const e = simulaColpo(s, { pirata: 1, arma: 'cannone', mezziGradi: 90, potenza: 70 });
    expect(e.danni[0] ?? 0).toBe(0);
    expect(e.uccisi).toHaveLength(0);
  });

  it('stessi comandi, stesso hash (determinismo)', () => {
    const gioca = () => {
      const s = conScala(882);
      inAzione(s);
      eseguiComando(s, { t: 'arrampica', dir: -1 });
      avanza(s, 50);
      eseguiComando(s, { t: 'muovi', dir: 1 });
      avanza(s, 10);
      return hashStato(s);
    };
    expect(gioca()).toBe(gioca());
  });

  it('un taglio a metà lascia due pezzi: quello in alto tiene l\'id, quello in basso ne prende uno nuovo', () => {
    const s = conScala(700);
    const id = s.appigli[0].id;
    const ev: Parameters<typeof esplodi>[5] = [];
    esplodi(s, XS, 540, 'lapide', null, ev, { raggio: 25, danno: 10 });
    const pezzi = [...s.appigli].sort((a, b) => a.yAlto - b.yAlto);
    expect(pezzi.map((a) => [a.yAlto, a.yBasso])).toEqual([[CIMA, 515], [565, SUOLO]]);
    expect(pezzi[0].id).toBe(id);
    expect(pezzi[1].id).not.toBe(id);
    expect(eventiDi(ev, 'appiglioRotto')).toEqual([{ t: 'appiglioRotto', appiglio: id, x: XS, yAlto: 515, yBasso: 565 }]);
  });

  it('chi cade da una liana tagliata in alto prende il danno da caduta normale', () => {
    const t = terrenoPiatto();
    const m = mappa(t, [{ x: 500, y: SUOLO }], [{ x: 1600, y: SUOLO }]);
    m.appigli = [{ tipo: 'liana', x: 500, yAlto: 300, yBasso: SUOLO }];
    const s = creaBattaglia(config(1, 1), m);
    inAzione(s);
    eseguiComando(s, { t: 'arrampica', dir: -1 });
    avanza(s, 241); // 1 tick per aggrapparsi + 240 tick a 40 px/s = 160 px
    const salito = SUOLO - piedi(s);
    expect(salito).toBeGreaterThanOrEqual(159);
    s.appigli = [];
    const ev = avanzaFinche(s, (x) => pirata(x, 0).aTerra, 400);
    const atterrato = eventiDi(ev, 'atterrato')[0];
    expect(atterrato.dannoCaduta).toBe(Math.min(BIL.pirata.cadutaMax, Math.floor((salito - BIL.pirata.cadutaSoglia) / BIL.pirata.cadutaPxPerPv)));
    expect(atterrato.dannoCaduta).toBeGreaterThan(0);
  });

  it('chi annega da appeso (il mare sale) non resta attaccato all\'appiglio', () => {
    const s = conScala(882);
    inAzione(s);
    eseguiComando(s, { t: 'arrampica', dir: -1 });
    avanza(s, 20);
    const p = pirata(s, 0);
    expect(p.appeso).toBeGreaterThan(0);
    const ev: Parameters<typeof esplodi>[5] = [];
    s.terreno.mare = p.y; // come la salita del mare a fine turno
    annega(p, ev);
    expect(p.stato).toBe('annegato');
    expect(p.appeso).toBe(-1);
    expect(eventiDi(ev, 'staccato')).toEqual([{ t: 'staccato', pirata: 0 }]);
  });
});
