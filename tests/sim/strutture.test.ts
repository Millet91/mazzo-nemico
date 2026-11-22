// Fase 3: strutture della mappa che crollano in modo speciale (torre, masso che rotola, ponte che cala).
import { describe, it, expect } from 'vitest';
import type { EventoBattaglia, StatoBattaglia, StrutturaMappa, Terreno } from '../../src/core/tipi';
import { MATERIALE } from '../../src/core/tipi';
import { BIL } from '../../src/contenuti/bilanciamento';
import { creaBattaglia } from '../../src/battaglia/sim';
import { esplodi } from '../../src/battaglia/sim/esplosione';
import { avanzaFinche, config, eventiDi, mappa, pirata, rettangolo, SUOLO, terrenoPiatto } from './aiuti';

const pieno = (t: Terreno, x: number, y: number) => t.maschera[y * t.w + x] !== MATERIALE.aria;

function battaglia(t: Terreno, strutture: StrutturaMappa[], turno: number = BIL.crolli.dalTurno): StatoBattaglia {
  const m = mappa(t, [{ x: 300, y: SUOLO }], [{ x: 1700, y: SUOLO }]);
  m.strutture = strutture;
  const s = creaBattaglia(config(1, 1), m);
  s.turno.numero = turno;
  return s;
}

function scoppio(s: StatoBattaglia, x: number, y: number, raggio: number): EventoBattaglia[] {
  const ev: EventoBattaglia[] = [];
  esplodi(s, x, y, 'cassa', null, ev, { raggio, danno: 0 });
  return ev;
}

/** Disco pieno di centro (cx, cy) e raggio r. */
function disco(t: Terreno, cx: number, cy: number, r: number, m: number): void {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) t.maschera[y * t.w + x] = m;
  }
}

describe('Torre', () => {
  it('tagliata alla base cade in blocco con la spinta di lato, dalla parte opposta al colpo', () => {
    const t = terrenoPiatto(MATERIALE.roccia);
    rettangolo(t, 1000, SUOLO - 150, 1030, SUOLO, MATERIALE.legno);
    const torre: StrutturaMappa = { tipo: 'torre', x0: 1000, y0: SUOLO - 150, x1: 1029, y1: SUOLO - 1 };
    const s = battaglia(t, [torre]);
    // colpo da sinistra a metà altezza: taglia la torre da parte a parte
    const ev = scoppio(s, 1000, SUOLO - 60, 36);
    const [c] = eventiDi(ev, 'crollo');
    expect(c).toBeDefined();
    const p = s.pezzi!.find((x) => x.id === c.pezzo)!;
    expect(p.struttura).toBe(0);
    expect(p.vx).toBeCloseTo(BIL.crolli.spintaTorre);
    expect(s.strutture![0].stato).toBe('caduta');
    const x0 = p.x;
    const dopo = avanzaFinche(s, (x) => x.pezzi!.length === 0, 600);
    expect(eventiDi(dopo, 'macerie')).toHaveLength(1);
    expect(eventiDi(dopo, 'macerie')[0].x).toBeGreaterThan(x0 + c.w / 2); // è caduta verso destra
  });

  it('un pezzo che non sta per metà nella torre è un blocco qualunque', () => {
    const t = terrenoPiatto(MATERIALE.roccia);
    rettangolo(t, 900, SUOLO - 200, 940, SUOLO, MATERIALE.roccia);
    rettangolo(t, 940, SUOLO - 200, 1040, SUOLO - 190, MATERIALE.roccia);
    const s = battaglia(t, [{ tipo: 'torre', x0: 1030, y0: SUOLO - 220, x1: 1060, y1: SUOLO - 180 }]);
    scoppio(s, 945, SUOLO - 195, 10);
    expect(s.pezzi).toHaveLength(1);
    expect(s.pezzi![0].struttura).toBe(-1);
    expect(s.pezzi![0].vx).toBe(0);
    expect(s.strutture![0].stato).toBe('intera');
  });
});

describe('Masso che rotola', () => {
  /** Muro a x 940-960, cengia 960-990 alta 10, masso r 11 sulla cengia, rampa che scende verso destra sotto. */
  function conMasso(): { t: Terreno; masso: StrutturaMappa; quota: (x: number) => number } {
    const t = terrenoPiatto(MATERIALE.roccia);
    const quota = (x: number) => Math.round(SUOLO - 120 + ((x - 960) * 120) / 440);
    for (let x = 940; x < 1400; x++) rettangolo(t, x, x < 960 ? SUOLO - 300 : quota(x), x + 1, SUOLO, MATERIALE.roccia);
    rettangolo(t, 960, SUOLO - 200, 990, SUOLO - 190, MATERIALE.roccia);
    disco(t, 975, SUOLO - 211, 11, MATERIALE.roccia);
    return { t, masso: { tipo: 'masso', x0: 964, y0: SUOLO - 222, x1: 986, y1: SUOLO - 201 }, quota };
  }

  it('tagliata la cengia, il masso si divide dalla cengia, rotola giù per la rampa e si frantuma', () => {
    const { t, masso } = conMasso();
    const s = battaglia(t, [masso]);
    const ev = scoppio(s, 962, SUOLO - 195, 9);
    const crolli = eventiDi(ev, 'crollo');
    expect(crolli.map((c) => c.tipo).sort()).toEqual(['blocco', 'masso']);
    expect(s.strutture![0].stato).toBe('caduta');
    const m = s.pezzi!.find((p) => p.tipo === 'masso')!;
    expect(m.struttura).toBe(0);
    let xMax = 0;
    const dopo = avanzaFinche(s, (x) => { const q = x.pezzi!.find((p) => p.tipo === 'masso'); if (q) xMax = Math.max(xMax, q.x); return !q; }, 1200);
    expect(xMax).toBeGreaterThan(1100); // è rotolato per più di 100 px lungo la rampa
    expect(eventiDi(dopo, 'macerie').some((e) => e.pezzo === m.id)).toBe(true);
  });

  it('chi è sulla strada del masso prende 20 PV e la spinta, una volta sola; mai l\'ultimo PV', () => {
    const { t, masso, quota } = conMasso();
    const s = battaglia(t, [masso]);
    const p = pirata(s, 0);
    p.x = 1150; p.y = quota(1150) - 12; p.aTerra = true; p.yInizioCaduta = p.y;
    const vita = p.vita;
    scoppio(s, 962, SUOLO - 195, 9);
    let spinto = false;
    const ev = avanzaFinche(s, (x) => { if (pirata(x, 0).vx > 1) spinto = true; return x.pezzi!.length === 0; }, 1200);
    const danni = eventiDi(ev, 'danno').filter((d) => d.pirata === 0);
    expect(danni[0].quanto).toBe(BIL.macerie.massoDanno);
    expect(danni.filter((d) => d.quanto === BIL.macerie.massoDanno)).toHaveLength(1);
    expect(spinto).toBe(true);
    expect(p.vita).toBeGreaterThanOrEqual(vita - BIL.macerie.maxPerTurno - 25); // + al più la caduta

    const s2 = battaglia(conMasso().t, [masso]);
    const q = pirata(s2, 0);
    q.x = 1150; q.y = quota(1150) - 12; q.aTerra = true; q.yInizioCaduta = q.y; q.vita = 3;
    scoppio(s2, 962, SUOLO - 195, 9);
    avanzaFinche(s2, (x) => x.pezzi!.length === 0, 1200);
    expect(q.vita).toBeGreaterThanOrEqual(1);
    expect(q.stato).toBe('vivo');
  });

  it('su terreno piano il masso cade e si ferma subito (si frantuma)', () => {
    const t = terrenoPiatto(MATERIALE.roccia);
    rettangolo(t, 900, SUOLO - 300, 940, SUOLO, MATERIALE.roccia);
    rettangolo(t, 940, SUOLO - 200, 975, SUOLO - 190, MATERIALE.roccia);
    disco(t, 960, SUOLO - 211, 11, MATERIALE.roccia);
    const s = battaglia(t, [{ tipo: 'masso', x0: 949, y0: SUOLO - 222, x1: 971, y1: SUOLO - 201 }]);
    scoppio(s, 942, SUOLO - 195, 9);
    let xUltimo = 0;
    avanzaFinche(s, (x) => { const q = x.pezzi!.find((p) => p.tipo === 'masso'); if (q) xUltimo = q.x; return !q; }, 600);
    expect(Math.abs(xUltimo - 949)).toBeLessThan(40);
    expect(s.pezzi).toEqual([]);
  });
});

describe('Ponte che cala', () => {
  /** Due pilastri (x 800-840 e 960-1000) e un ponte di legno spesso 4 px tra i due, a SUOLO-200. */
  function conPonte(): { t: Terreno; ponte: StrutturaMappa } {
    const t = terrenoPiatto(MATERIALE.roccia);
    rettangolo(t, 800, SUOLO - 200, 840, SUOLO, MATERIALE.roccia);
    rettangolo(t, 960, SUOLO - 200, 1000, SUOLO, MATERIALE.roccia);
    rettangolo(t, 840, SUOLO - 200, 960, SUOLO - 196, MATERIALE.legno);
    const Y0 = SUOLO - 200, Y1 = SUOLO - 197;
    return {
      t,
      ponte: {
        tipo: 'ponte', x0: 841, y0: Y0, x1: 958, y1: Y1,
        ancoraggi: [{ x0: 834, y0: Y0, x1: 840, y1: Y1 }, { x0: 959, y0: Y0, x1: 965, y1: Y1 }],
      },
    };
  }

  it('tagliato un capo, le assi escono dalla maschera e chi era sopra cade con 8 PV di macerie', () => {
    const { t, ponte } = conPonte();
    const s = battaglia(t, [ponte]);
    const p = pirata(s, 0);
    p.x = 900; p.y = SUOLO - 200 - 11; p.aTerra = true; p.yInizioCaduta = p.y;
    const vita = p.vita;
    const ev = scoppio(s, 962, SUOLO - 198, 8);
    expect(eventiDi(ev, 'ponteCalato')).toEqual([{ t: 'ponteCalato', struttura: 0 }]);
    expect(eventiDi(ev, 'crollo')).toEqual([]); // non cade in blocco: resta appeso al capo sinistro
    expect(s.strutture![0].stato).toBe('calata');
    expect(pieno(s.terreno, 900, SUOLO - 198)).toBe(false);
    expect(pieno(s.terreno, 838, SUOLO - 198)).toBe(true); // l'ancoraggio resta
    expect(eventiDi(ev, 'danno')).toEqual([expect.objectContaining({ pirata: 0, quanto: BIL.macerie.danno })]);
    expect(p.vita).toBe(vita - BIL.macerie.danno);
    avanzaFinche(s, () => p.aTerra && p.y > SUOLO - 30, 300);
    expect(p.y).toBeGreaterThan(SUOLO - 30); // è caduto giù
  });

  it('tagliato in mezzo si apre: le due metà calano', () => {
    const { t, ponte } = conPonte();
    const s = battaglia(t, [ponte]);
    const ev = scoppio(s, 900, SUOLO - 198, 8);
    expect(eventiDi(ev, 'ponteCalato')).toHaveLength(1);
    expect(pieno(s.terreno, 850, SUOLO - 198)).toBe(false);
    expect(pieno(s.terreno, 950, SUOLO - 198)).toBe(false);
  });

  it('un buco che non taglia le assi non fa niente; al turno 1 neanche un taglio', () => {
    const { t, ponte } = conPonte();
    const s = battaglia(t, [ponte]);
    const ev = scoppio(s, 900, SUOLO - 201, 2); // graffia solo la superficie
    expect(eventiDi(ev, 'ponteCalato')).toEqual([]);
    expect(s.strutture![0].stato).toBe('intera');
    const s1 = battaglia(conPonte().t, [ponte], 1);
    expect(eventiDi(scoppio(s1, 962, SUOLO - 198, 8), 'ponteCalato')).toEqual([]);
    expect(pieno(s1.terreno, 900, SUOLO - 198)).toBe(true);
  });

  it('tagliati tutti e due i capi cade intero nella valle', () => {
    const { t, ponte } = conPonte();
    const s = battaglia(t, [ponte], 1);
    scoppio(s, 838, SUOLO - 198, 8); // turno 1: niente crolli, il capo sinistro è già tagliato
    s.turno.numero = BIL.crolli.dalTurno;
    const ev = scoppio(s, 962, SUOLO - 198, 8);
    expect(eventiDi(ev, 'ponteCalato')).toEqual([]);
    const [c] = eventiDi(ev, 'crollo');
    expect(c).toBeDefined();
    expect(s.pezzi![0].struttura).toBe(0);
    expect(s.strutture![0].stato).toBe('caduta');
  });
});

describe('Struttura che si riappoggia (Pacchetto 2: palma-ponte, carico della gru)', () => {
  /** Un blocco di legno 60×20 appeso a un pilastro per un collo sottile, sopra il suolo di roccia. */
  function conCarico(x = 1000): { t: Terreno; st: StrutturaMappa } {
    const t = terrenoPiatto(MATERIALE.roccia);
    rettangolo(t, x - 40, SUOLO - 300, x - 20, SUOLO, MATERIALE.roccia); // pilastro
    rettangolo(t, x - 20, SUOLO - 152, x - 10, SUOLO - 148, MATERIALE.legno); // collo
    rettangolo(t, x - 10, SUOLO - 160, x + 50, SUOLO - 140, MATERIALE.legno); // carico
    return { t, st: { tipo: 'cengia', x0: x - 10, y0: SUOLO - 160, x1: x + 49, y1: SUOLO - 141, riappoggia: true } };
  }

  it('tagliato il collo, cade e torna nella maschera dove tocca; chi era sotto esce in alto, mai incastrato', () => {
    const { t, st } = conCarico();
    const s = battaglia(t, [st]);
    const p = pirata(s, 0);
    p.x = 1020; p.y = SUOLO - 11; p.aTerra = true; p.yInizioCaduta = p.y;
    const ev = scoppio(s, 985, SUOLO - 150, 6);
    expect(eventiDi(ev, 'crollo')).toHaveLength(1);
    const dopo = avanzaFinche(s, (x) => x.pezzi!.length === 0, 600);
    expect(eventiDi(dopo, 'macerie')).toEqual([]); // non si frantuma
    expect(pieno(s.terreno, 1040, SUOLO - 1)).toBe(true); // il carico è sul suolo, nella maschera
    expect(s.terreno.maschera[(SUOLO - 5) * s.terreno.w + 1040]).toBe(MATERIALE.legno);
    expect(eventiDi(dopo, 'maschera').length).toBeGreaterThan(0);
    expect(eventiDi(dopo, 'danno').some((d) => d.pirata === 0 && d.quanto === BIL.macerie.danno)).toBe(true);
    expect(p.y + 11).toBeLessThanOrEqual(SUOLO - 20); // spinto sopra il carico
    avanzaFinche(s, () => p.aTerra, 120);
    expect(Math.floor(p.y) + 11).toBe(SUOLO - 20); // in piedi sul carico
  });

  it('sopra il mare affonda come gli altri pezzi', () => {
    const { t, st } = conCarico(1980); // pilastro sul bordo dell'isola, carico sopra il mare
    const s = battaglia(t, [st]);
    scoppio(s, 1965, SUOLO - 150, 6);
    const dopo = avanzaFinche(s, (x) => x.pezzi!.length === 0, 600);
    expect(eventiDi(dopo, 'macerie')).toEqual([expect.objectContaining({ inMare: true })]);
  });
});
