// Fase 3: legno che brucia e sabbia che frana (sim/fuoco.ts).
import { describe, it, expect } from 'vitest';
import type { EventoBattaglia, StatoBattaglia, Terreno } from '../../src/core/tipi';
import { MATERIALE } from '../../src/core/tipi';
import { BIL } from '../../src/contenuti/bilanciamento';
import { esplodi } from '../../src/battaglia/sim/esplosione';
import { cambiaFase } from '../../src/battaglia/sim/turno';
import { avanza, avanzaFinche, battagliaPiatta, eventiDi, pirata, rettangolo, SUOLO, terrenoPiatto } from './aiuti';

const pieno = (t: Terreno, x: number, y: number) => t.maschera[y * t.w + x] !== MATERIALE.aria;

function battaglia(t: Terreno, turno: number = BIL.crolli.dalTurno): StatoBattaglia {
  const s = battagliaPiatta([300], [1700], { terreno: t });
  s.turno.numero = turno;
  return s;
}

function scoppio(s: StatoBattaglia, x: number, y: number, raggio: number): EventoBattaglia[] {
  const ev: EventoBattaglia[] = [];
  esplodi(s, x, y, 'cassa', null, ev, { raggio, danno: 0 });
  return ev;
}

describe('Fuoco', () => {
  /** Roccia piatta con una parete di legno spessa 40 px (x 1000-1040) alta 100. */
  const conLegno = () => {
    const t = terrenoPiatto(MATERIALE.roccia);
    rettangolo(t, 1000, SUOLO - 100, 1040, SUOLO, MATERIALE.legno);
    return t;
  };

  it('il legno nell\'anello prende fuoco; dopo 4 s sparisce quello nel cerchio, il resto no', () => {
    const s = battaglia(conLegno());
    const ev = scoppio(s, 1000, SUOLO - 50, 20);
    const [f] = eventiDi(ev, 'fuoco');
    expect(f).toMatchObject({ inizio: true, x: 1000, y: SUOLO - 50, r: 20 * BIL.fuoco.anello });
    expect(s.fuochi).toHaveLength(1);
    expect(pieno(s.terreno, 1023, SUOLO - 50)).toBe(true); // tra 20 e 26 px: legno che brucia, ancora lì
    const dopo = avanza(s, BIL.fuoco.durataTick - 1);
    expect(eventiDi(dopo, 'fuoco')).toEqual([]);
    const fine = avanza(s, 2);
    expect(eventiDi(fine, 'fuoco')).toEqual([expect.objectContaining({ fuoco: f.fuoco, inizio: false })]);
    expect(eventiDi(fine, 'maschera').length).toBeGreaterThan(0);
    expect(s.fuochi).toEqual([]);
    expect(pieno(s.terreno, 1023, SUOLO - 50)).toBe(false); // bruciato
    expect(pieno(s.terreno, 1030, SUOLO - 50)).toBe(true); // oltre 1,3 × raggio: resta
  });

  it('niente fuoco al turno 1 o senza legno vicino', () => {
    const s = battaglia(conLegno(), 1);
    expect(eventiDi(scoppio(s, 1000, SUOLO - 50, 20), 'fuoco')).toEqual([]);
    const s2 = battaglia(terrenoPiatto(MATERIALE.roccia));
    expect(eventiDi(scoppio(s2, 1000, SUOLO, 20), 'fuoco')).toEqual([]);
    expect(s2.fuochi).toEqual([]);
  });

  it('bruciato il palo di legno, il masso che ci stava sopra crolla', () => {
    const t = terrenoPiatto(MATERIALE.roccia);
    rettangolo(t, 1000, SUOLO - 60, 1008, SUOLO, MATERIALE.legno); // palo
    rettangolo(t, 980, SUOLO - 90, 1030, SUOLO - 60, MATERIALE.roccia); // masso sul palo
    const s = battaglia(t);
    // scoppio accanto al palo: il cratere non lo tocca, ma il palo è tutto dentro l'anello del fuoco
    scoppio(s, 1038, SUOLO - 30, 30);
    expect(s.fuochi).toHaveLength(1);
    expect(pieno(s.terreno, 1004, SUOLO - 30)).toBe(true);
    const ev = avanza(s, BIL.fuoco.durataTick + 1);
    expect(eventiDi(ev, 'crollo')).toHaveLength(1);
  });

  it('chi sta nel fuoco quando il turno passa alla risoluzione prende 6 PV; chi è fuori no', () => {
    const s = battaglia(conLegno());
    scoppio(s, 1000, SUOLO - 50, 20);
    const dentro = pirata(s, 0), fuori = pirata(s, 1);
    dentro.x = 1005; dentro.y = SUOLO - 60;
    const vd = dentro.vita, vf = fuori.vita;
    const ev: EventoBattaglia[] = [];
    cambiaFase(s, 'risoluzione', ev);
    expect(dentro.vita).toBe(vd - BIL.fuoco.danno);
    expect(fuori.vita).toBe(vf);
    expect(eventiDi(ev, 'danno')).toHaveLength(1);
  });
});

describe('Sabbia che frana', () => {
  it('dopo uno scoppio nella sabbia la frana parte il tick dopo, riempie un po\' il cratere e finisce', () => {
    const s = battaglia(terrenoPiatto(MATERIALE.sabbia));
    const fondo = (x: number) => { let y = SUOLO - 50; while (!pieno(s.terreno, x, y)) y++; return y; };
    const ripidezza = () => { let n = 0; for (let x = 955; x < 1045; x++) n = Math.max(n, Math.abs(fondo(x + 1) - fondo(x))); return n; };
    scoppio(s, 1000, SUOLO, 30);
    expect(s.frane).toHaveLength(1);
    const prima = ripidezza();
    const ev = avanzaFinche(s, (x) => x.frane!.length === 0, BIL.sabbia.franaMaxTick + 5);
    expect(s.frane).toEqual([]);
    expect(eventiDi(ev, 'frana')).toHaveLength(1);
    expect(eventiDi(ev, 'maschera').length).toBeGreaterThan(0);
    expect(prima).toBeGreaterThan(1);
    expect(ripidezza()).toBeLessThanOrEqual(1); // le pareti oltre 45° sono scese: ora nessun gradino supera 1 px
  });

  it('niente frana nella roccia', () => {
    const s = battaglia(terrenoPiatto(MATERIALE.roccia));
    scoppio(s, 1000, SUOLO, 30);
    expect(s.frane).toEqual([]);
  });

  it('la sabbia non entra nella capsula di un pirata', () => {
    const s = battaglia(terrenoPiatto(MATERIALE.sabbia));
    scoppio(s, 1000, SUOLO, 30);
    const p = pirata(s, 0);
    p.x = 1000; p.y = SUOLO + 15; p.vx = 0; p.vy = 0; // dentro il cratere
    for (let k = 0; k < BIL.sabbia.franaMaxTick; k++) {
      avanza(s, 1);
      for (let y = Math.ceil(p.y - 10); y < p.y + 10; y++) for (let x = Math.ceil(p.x - 5); x < p.x + 5; x++) {
        expect(pieno(s.terreno, x, y)).toBe(false);
      }
      p.x = 1000; p.y = SUOLO + 15; p.vx = 0; p.vy = 0; p.aTerra = false;
    }
  });

  it('il turno non passa finché la sabbia frana', () => {
    const s = battaglia(terrenoPiatto(MATERIALE.sabbia));
    cambiaFase(s, 'risoluzione', []);
    scoppio(s, 1000, SUOLO, 40);
    const numero = s.turno.numero;
    let fineFrana = -1;
    for (let k = 0; k < 120 && s.turno.numero === numero; k++) {
      avanza(s, 1);
      if (fineFrana < 0 && s.frane!.length === 0) fineFrana = s.tick;
    }
    expect(s.turno.numero).toBe(numero + 1);
    expect(fineFrana).toBeGreaterThan(0);
    expect(s.tick).toBeGreaterThanOrEqual(fineFrana);
  });
});
