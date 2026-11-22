// Agente Fisica · terreno, pirati, proiettili, esplosioni (00 §1.2, contratto §4A, casi QA 1-3, 7, 10).
import { describe, it, expect } from 'vitest';
import { MATERIALE } from '../../src/core/tipi';
import { BIL } from '../../src/contenuti/bilanciamento';
import { ARMA } from '../../src/contenuti/armi';
import { daGradi, coseno, seno } from '../../src/core/trig';
import { capsulaUrta, scavaCratere, solido } from '../../src/battaglia/sim/terreno';
import { cammina, dannoCaduta, espelli, vola, type Corpo } from '../../src/battaglia/sim/pirata';
import { dannoArma, effettoEsplosione, esplodi } from '../../src/battaglia/sim/esplosione';
import { muoviProiettile } from '../../src/battaglia/sim/proiettili';
import { fisicaDi, velocitaIniziale } from '../../src/battaglia/sim/armi';
import type { EventoBattaglia } from '../../src/core/tipi';
import { avanza, battagliaPiatta, eventiDi, rettangolo, SUOLO, terrenoPiatto, terrenoVuoto } from './aiuti';

const P = BIL.pirata;
const MEZZA = P.capsulaAltezza / 2;

function corpoA(x: number, piedi: number): Corpo {
  const y = piedi - MEZZA;
  return { x, y, vx: 0, vy: 0, aTerra: true, yInizioCaduta: y };
}

describe('Crateri', () => {
  it('il raggio dipende dal materiale: sabbia 1,2, terra 1, roccia 0,75', () => {
    const r = 40;
    for (const [m, molt] of [[MATERIALE.sabbia, 1.2], [MATERIALE.terra, 1.0], [MATERIALE.roccia, 0.75]] as const) {
      const t = terrenoVuoto();
      rettangolo(t, 0, 200, 2048, 900, m);
      scavaCratere(t, 1000, 500, r, null);
      expect(BIL.fisica.moltiplicatoreCratere[m]).toBe(molt);
      const atteso = r * BIL.fisica.moltiplicatoreCratere[m];
      // lungo l'orizzontale: aria fino a ~r×molt, poi solido
      expect(solido(t, 1000 + Math.floor(atteso) - 2, 500)).toBe(false);
      expect(solido(t, 1000 + Math.ceil(atteso) + 1, 500)).toBe(true);
    }
  });

  it('il ferro resta intatto e senza cambi non esce l\'evento cratere', () => {
    const t = terrenoVuoto();
    rettangolo(t, 900, 400, 1100, 600, MATERIALE.ferro);
    const ev: EventoBattaglia[] = [];
    expect(scavaCratere(t, 1000, 500, 80, ev)).toBe(0);
    expect(ev).toEqual([]);
    rettangolo(t, 900, 300, 1100, 400, MATERIALE.terra);
    expect(scavaCratere(t, 1000, 400, 50, ev)).toBeGreaterThan(0);
    expect(eventiDi(ev, 'cratere')).toHaveLength(1);
    expect(solido(t, 1000, 450)).toBe(true); // il ferro sotto non si buca
  });
});

describe('Pirata: camminata e gradini', () => {
  it('sale un gradino di 8 px e non uno di 9', () => {
    for (const [alto, passa] of [[P.gradinoMax, true], [P.gradinoMax + 1, false]] as const) {
      const t = terrenoPiatto();
      rettangolo(t, 1010, SUOLO - alto, 1100, SUOLO, MATERIALE.terra);
      const c = corpoA(1000, SUOLO);
      for (let i = 0; i < 20; i++) cammina(t, c, 1);
      expect(c.x > 1010, `gradino ${alto}`).toBe(passa);
      expect(capsulaUrta(t, c.x, c.y)).toBe(false);
    }
  });

  it('cammina a 60 px/s e cade da un dirupo', () => {
    const t = terrenoPiatto(MATERIALE.sabbia, 100, 1000);
    const c = corpoA(900, SUOLO);
    for (let i = 0; i < 60; i++) cammina(t, c, 1);
    expect(c.x).toBeCloseTo(900 + 60 * P.camminata * 60 / 60, 5);
    for (let i = 0; i < 100 && c.aTerra; i++) cammina(t, c, 1);
    expect(c.aTerra).toBe(false);
  });
});

describe('Pirata: volo, rimbalzo, caduta', () => {
  it('danno da caduta = min(25, floor((caduta − 90) / 4))', () => {
    expect(dannoCaduta(90)).toBe(0);
    expect(dannoCaduta(93)).toBe(0);
    expect(dannoCaduta(94)).toBe(1);
    expect(dannoCaduta(130)).toBe(10);
    expect(dannoCaduta(1000)).toBe(P.cadutaMax);
  });

  it('una caduta vera di 150 px dà il danno della formula e il pirata si ferma sotto 5 px/s', () => {
    const t = terrenoPiatto();
    const c = corpoA(1000, SUOLO - 150);
    c.aTerra = false;
    let danno = -1;
    for (let i = 0; i < 600 && danno < 0; i++) danno = vola(t, c);
    expect(danno).toBe(dannoCaduta(150));
    expect(c.aTerra).toBe(true);
    expect(c.vx).toBe(0);
    expect(c.vy).toBe(0);
    expect(Math.floor(c.y) + MEZZA).toBe(SUOLO);
  });

  it('rimbalza con coefficiente 0,3', () => {
    const t = terrenoPiatto();
    const c = corpoA(1000, SUOLO - 40);
    c.aTerra = false;
    let vPrima = 0;
    for (let i = 0; i < 200; i++) {
      const v = c.vy;
      vola(t, c);
      if (v > 0 && c.vy < 0) { vPrima = v + BIL.fisica.gravita; break; }
    }
    expect(vPrima).toBeGreaterThan(0);
    expect(-c.vy / vPrima).toBeCloseTo(P.rimbalzo, 1);
  });

  it('sul ghiaccio scivola più lontano che sulla sabbia (attrito 0,2)', () => {
    const corsa = (m: number) => {
      const t = terrenoPiatto(m);
      const c = corpoA(1000, SUOLO);
      c.aTerra = false; c.vx = 4; c.vy = -0.5;
      for (let i = 0; i < 600 && !c.aTerra; i++) vola(t, c);
      return c.x - 1000;
    };
    expect(BIL.fisica.attrito[MATERIALE.ghiaccio]).toBe(0.2);
    expect(corsa(MATERIALE.ghiaccio)).toBeGreaterThan(2 * corsa(MATERIALE.sabbia));
  });

  it('caso 7: un pirata dentro la roccia viene espulso nell\'aria più vicina', () => {
    const t = terrenoPiatto(MATERIALE.roccia);
    const c = corpoA(1000, SUOLO + 10); // piedi 10 px dentro il suolo
    expect(capsulaUrta(t, c.x, c.y)).toBe(true);
    expect(espelli(t, c)).toBe(true);
    expect(capsulaUrta(t, c.x, c.y)).toBe(false);
    expect(Math.floor(c.y) + MEZZA).toBe(SUOLO); // risale in superficie
  });

  it('caso 7 nella battaglia: anche sepolto a fondo non resta nel solido più di un tick', () => {
    const s = battagliaPiatta([800], [1200], { terreno: terrenoPiatto(MATERIALE.roccia) });
    const p = s.pirati[0];
    p.y = SUOLO + 60; // 60 px sotto la superficie, oltre il raggio di ricerca
    avanza(s, 1);
    expect(capsulaUrta(s.terreno, p.x, p.y)).toBe(false);
  });

  it('chi tocca il mare muore subito (annegato, splash, PV contati come danno)', () => {
    const t = terrenoVuoto();
    rettangolo(t, 900, SUOLO, 1100, 984, MATERIALE.terra);
    const s = battagliaPiatta([1000], [1050], { terreno: t });
    const p = s.pirati[0];
    p.x = 600; p.y = 800; p.aTerra = false;
    const ev = avanza(s, 200);
    expect(p.stato).toBe('annegato');
    expect(p.vita).toBe(0);
    expect(eventiDi(ev, 'morto')).toContainEqual({ t: 'morto', pirata: p.id, causa: 'mare' });
    expect(eventiDi(ev, 'splash').some((e) => e.grande)).toBe(true);
  });
});

describe('Esplosioni', () => {
  const D = ARMA.cannone.danno, R = ARMA.cannone.raggio;

  it('danno max(1, round(D × (1 − d/r))): pieno al centro, 1 al bordo, niente fuori', () => {
    const k = BIL.fisica.spintaPerDanno * D;
    expect(effettoEsplosione(100, 100, R, D, k, 100, 100)!.danno).toBe(D);
    // d misurata dalla capsula (raggio 6): pirata a 6 + 0,99·R dal centro → 1
    expect(effettoEsplosione(100, 100, R, D, k, 100 + 6 + 0.99 * R, 100)!.danno).toBe(1);
    expect(effettoEsplosione(100, 100, R, D, k, 100 + 6 + R + 0.01, 100)).toBeNull();
    const meta = effettoEsplosione(100, 100, R, D, k, 100 + 6 + R / 2, 100)!;
    expect(meta.danno).toBe(Math.max(1, Math.round(D / 2)));
  });

  it('spinta D × 7 px/s con la stessa attenuazione', () => {
    const k = BIL.fisica.spintaPerDanno * D;
    const e = effettoEsplosione(100, 100, R, D, k, 100, 100 - 30)!; // pirata sopra: spinta verso l'alto
    const f = 1 - (30 - 5 - 6) / R; // distanza dal segmento (5) meno il raggio della capsula (6)
    expect(Math.sqrt(e.vx * e.vx + e.vy * e.vy)).toBeCloseTo(k * f, 6);
    expect(e.vy).toBeLessThan(0);
    expect(BIL.fisica.spintaPerDanno * 60).toBeCloseTo(7, 10);
  });

  it('caso 10: esplosione nel centro del pirata e due pirati sovrapposti, niente NaN', () => {
    const s = battagliaPiatta([1000, 1000], [1500]);
    const [a, b] = s.pirati;
    esplodi(s, a.x, a.y, 'cannone', 'marina', []);
    for (const p of [a, b]) {
      expect(Number.isFinite(p.vx) && Number.isFinite(p.vy)).toBe(true);
      expect(p.vy).toBeLessThan(0); // spinti verso l'alto
      expect(p.vx).toBe(0);
      expect(p.vita).toBe(BIL.pirata.pv - D);
    }
  });

  it('Teschio Rosso: +10% per difetto su cannone e granata (66 e 57), non sulla pistola né sulla lapide', () => {
    expect(dannoArma('cannone', 'teschio')).toBe(Math.floor(ARMA.cannone.danno * 1.1));
    expect(dannoArma('granata', 'teschio')).toBe(Math.floor(ARMA.granata.danno * 1.1));
    expect([dannoArma('cannone', 'teschio'), dannoArma('granata', 'teschio')]).toEqual([66, 57]);
    expect(dannoArma('pistola', 'teschio')).toBe(ARMA.pistola.danno);
    expect(dannoArma('cannone', 'marina')).toBe(ARMA.cannone.danno);
    const s = battagliaPiatta([1000], [1500]);
    const p = s.pirati[0];
    esplodi(s, p.x, p.y, 'lapide', 'teschio', []);
    expect(p.vita).toBe(BIL.pirata.pv - BIL.lapide.danno);
  });

  it('chi spara si fa male', () => {
    const s = battagliaPiatta([1000], [1500]);
    const p = s.pirati[0];
    esplodi(s, p.x + 20, p.y, 'cannone', 'teschio', []);
    expect(p.vita).toBeLessThan(BIL.pirata.pv);
  });
});

describe('Proiettili', () => {
  const sim = (t: ReturnType<typeof terrenoVuoto>, x: number, y: number, mg: number, pot: number, vento = 0, maxTick = 600) => {
    const v = velocitaIniziale(mg, pot);
    const pr = { x, y, vx: v.vx, vy: v.vy, fermo: false };
    let minY = y;
    for (let i = 0; i < maxTick; i++) {
      const u = muoviProiettile(t, t.mare, vento, pr, fisicaDi('cannone'), null);
      minY = Math.min(minY, pr.y);
      if (u) return { u, pr, minY };
    }
    return { u: null, pr, minY };
  };

  it('caso 1: a 950 px/s non attraversa una parete di 1 px, angoli ogni 5°', () => {
    for (const spessore of [1, 2]) {
      const t = terrenoVuoto();
      rettangolo(t, 1000, 0, 1000 + spessore, 940, MATERIALE.legno);
      for (let gradi = -85; gradi <= 85; gradi += 5) {
        const r = sim(t, 990, 500, daGradi(gradi), 100);
        expect(r.u?.tipo, `${gradi}° spessore ${spessore}`).toBe('terreno');
        expect(r.pr.x).toBeLessThan(1000);
      }
    }
  });

  it('caso 2: non passa tra due pixel che si toccano per l\'angolo (connettività a 8)', () => {
    const t = terrenoVuoto();
    // linea diagonale di pixel singoli da (900, 300) a (1300, 700)
    for (let i = 0; i <= 400; i++) t.maschera[(300 + i) * t.w + 900 + i] = MATERIALE.legno;
    // tiri perpendicolari alla diagonale, da sopra-destra verso sotto-sinistra, a varie altezze
    for (let k = 0; k < 40; k++) {
      const x0 = 1000 + k * 7, y0 = 300 + k * 7 - 60;
      const t2 = { ...t, mare: 2000 };
      const pr = { x: x0 + 0.37, y: y0 + 0.61, vx: -10, vy: 10, fermo: false };
      let u = null;
      for (let i = 0; i < 40 && !u; i++) { pr.vy -= BIL.fisica.gravita; u = muoviProiettile(t2, t2.mare, 0, pr, fisicaDi('cannone'), null); }
      expect(u?.tipo).toBe('terreno');
      // resta dal lato di partenza della diagonale (x − y > 600)
      expect(Math.floor(pr.x) - Math.floor(pr.y)).toBeGreaterThanOrEqual(600);
    }
  });

  it('caso 3: esce in alto, non sparisce e rientra spinto dal vento', () => {
    const t = terrenoPiatto(MATERIALE.terra, 0, 2048, 700);
    const r = sim(t, 600, 650, daGradi(88), 100, BIL.ventoMax.scogliera, 1200);
    expect(r.minY).toBeLessThan(0);
    expect(r.u?.tipo).toBe('terreno');
    expect(r.pr.x).toBeGreaterThan(600 + 50); // il vento l'ha portato a destra
  });

  it('il vento sposta il cannone ma non la granata', () => {
    const t = terrenoVuoto();
    const corsa = (arma: 'cannone' | 'granata', vento: number) => {
      const v = velocitaIniziale(daGradi(45), 80);
      const pr = { x: 500, y: 500, vx: v.vx, vy: v.vy, fermo: false };
      for (let i = 0; i < 60; i++) muoviProiettile(t, 5000, vento, pr, fisicaDi(arma), null);
      return pr.x;
    };
    expect(corsa('cannone', 6)).toBeGreaterThan(corsa('cannone', 0));
    expect(corsa('granata', 6)).toBe(corsa('granata', 0));
  });

  it('la granata rimbalza (0,5) e si posa', () => {
    const t = terrenoPiatto(MATERIALE.terra);
    const pr = { x: 1000, y: SUOLO - 100, vx: 2, vy: 0, fermo: false };
    let rimbalzi = 0;
    for (let i = 0; i < 600 && !pr.fermo; i++) if (muoviProiettile(t, t.mare, 0, pr, fisicaDi('granata'), null)?.tipo === 'rimbalzo') rimbalzi++;
    expect(ARMA.granata.rimbalzo).toBe(0.5);
    expect(rimbalzi).toBeGreaterThan(0);
    expect(pr.fermo).toBe(true);
    expect(Math.floor(pr.y)).toBe(SUOLO - 1);
  });

  it('nel mare sparisce con uno splash', () => {
    const t = terrenoVuoto();
    const r = sim(t, 500, 500, daGradi(0), 30);
    expect(r.u?.tipo).toBe('mare');
  });

  it('la velocità iniziale è 950 px/s alla potenza 100 con la tabella trigonometrica', () => {
    const v = velocitaIniziale(daGradi(30), 100);
    expect(v.vx).toBeCloseTo(coseno(60) * 950 / 60, 12);
    expect(v.vy).toBeCloseTo(-seno(60) * 950 / 60, 12);
  });
});
