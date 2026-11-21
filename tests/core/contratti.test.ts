// Contratti di M1 (core/rng, core/trig, contenuti): se uno di questi test cambia, è cambiato il contratto.
import { describe, it, expect } from 'vitest';
import { semeIniziale, casuale, intero, combinaSemi } from '../../src/core/rng';
import { seno, coseno, normalizza, daGradi, inGradi } from '../../src/core/trig';
import { ARMI, ARMA, ARMI_ATTIVE, dotazioneIniziale } from '../../src/contenuti/armi';
import { BIL } from '../../src/contenuti/bilanciamento';
import { T } from '../../src/testi/it';
import { generaMappa } from '../../src/battaglia/gen';
import { creaBattaglia, avanzaTick, hashStato } from '../../src/battaglia/sim';
import { VERSIONE_REGOLE, type ConfigBattaglia, type EventoBattaglia } from '../../src/core/tipi';

describe('PRNG', () => {
  it('è deterministico e sta in [0,1)', () => {
    const a = { rng: semeIniziale(42) }, b = { rng: semeIniziale(42) };
    const va = Array.from({ length: 1000 }, () => casuale(a));
    const vb = Array.from({ length: 1000 }, () => casuale(b));
    expect(va).toEqual(vb);
    expect(va.every((x) => x >= 0 && x < 1)).toBe(true);
  });
  it('intero copre gli estremi', () => {
    const s = { rng: semeIniziale(1) };
    const visti = new Set(Array.from({ length: 500 }, () => intero(s, -6, 6)));
    expect(Math.min(...visti)).toBe(-6);
    expect(Math.max(...visti)).toBe(6);
  });
  it('combinaSemi distingue l\'ordine', () => {
    expect(combinaSemi(1, 2)).not.toBe(combinaSemi(2, 1));
  });
});

describe('Tabella trigonometrica a 0,5°', () => {
  it('coincide con Math.sin entro 1e-12 e ha i valori esatti sugli assi', () => {
    for (let i = 0; i < 720; i++) expect(Math.abs(seno(i) - Math.sin((i * Math.PI) / 360))).toBeLessThan(1e-12);
    expect([seno(0), seno(180), seno(360), seno(540)]).toEqual([0, 1, 0, -1]);
    expect(coseno(0)).toBe(1);
  });
  it('normalizza e converte', () => {
    expect(normalizza(-1)).toBe(719);
    expect(normalizza(1440)).toBe(0);
    expect(daGradi(45)).toBe(90);
    expect(inGradi(270)).toBe(135);
  });
});

describe('Armi e bilanciamento', () => {
  it('16 armi nell\'ordine di 00 §1.3, 4 attive in M1', () => {
    expect(ARMI.map((a) => a.numero)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    expect(ARMI_ATTIVE).toEqual(['cannone', 'granata', 'pistola', 'sciabola']);
    expect(Object.keys(dotazioneIniziale())).toEqual(ARMI_ATTIVE);
    for (const a of ARMI) expect(T.armi[a.id]).toBeTruthy();
  });
  it('numeri delle 4 armi Base: studio v2, PIANO §7 (regole versione 2)', () => {
    expect(VERSIONE_REGOLE).toBe(2);
    expect([ARMA.cannone.danno, ARMA.cannone.raggio, ARMA.cannone.vento]).toEqual([60, 70, true]);
    expect([ARMA.granata.danno, ARMA.granata.raggio, ARMA.granata.vento, ARMA.granata.rimbalzo]).toEqual([52, 64, false, 0.5]);
    expect([ARMA.pistola.danno, ARMA.pistola.colpi, ARMA.pistola.portata]).toEqual([28, 2, 500]);
    expect([ARMA.sciabola.danno, ARMA.sciabola.spintaFissa, ARMA.sciabola.angoloSpinta]).toEqual([40, 450, 45]);
    expect([BIL.ia.livelli.mozzo.erroreGradi, BIL.ia.livelli.mozzo.errorePotenza]).toEqual([14, 0.35]);
    expect([BIL.macerie.danno, BIL.macerie.maxPerTurno]).toEqual([8, 20]);
  });
  it('fisica di 00 §1.2 in px/tick', () => {
    expect(BIL.fisica.gravita).toBeCloseTo(0.1667, 4);
    expect(BIL.fisica.ventoPerPunto).toBeCloseTo(0.0042, 4);
    expect(BIL.mondo.mareIniziale).toBe(950);
    expect([BIL.battaglia.mareSaleDalTurno, BIL.battaglia.turnoLimite]).toEqual([12, 18]);
  });
});

describe('API di sim e generatore (firme del contratto)', () => {
  const cfg: ConfigBattaglia = {
    versioneRegole: VERSIONE_REGOLE, seme: 7, bioma: 'isola', timerSecondi: 30, traiettoriaCompleta: true,
    squadre: [
      { ciurma: 'teschio', ruolo: 'attaccante', controllo: 'umano', pirati: 3 },
      { ciurma: 'marina', ruolo: 'difensore', controllo: 'ia', livelloIa: 'mozzo', pirati: 3 },
    ],
  };
  it('stessa configurazione ⇒ stesso hash dopo 1000 tick', () => {
    const giro = () => {
      const s = creaBattaglia(cfg, generaMappa({ seme: cfg.seme, bioma: cfg.bioma, piratiPerLato: [3, 3] }));
      const ev: EventoBattaglia[] = [];
      for (let i = 0; i < 1000; i++) avanzaTick(s, ev);
      return hashStato(s);
    };
    expect(giro()).toBe(giro());
  });
  it('lo stato si clona con structuredClone (serve al Web Worker)', () => {
    const s = creaBattaglia(cfg, generaMappa({ seme: 1, bioma: 'isola', piratiPerLato: [3, 3] }));
    expect(hashStato(structuredClone(s))).toBe(hashStato(s));
  });
});
