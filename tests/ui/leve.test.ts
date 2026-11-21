// L1 dei comandi (agente Comandi): le due leve del doppio joystick e FUOCO, senza DOM.
// Regole: design/comandi/doppio-joystick.md, scale-e-liane.md e docs/tecnica/comandi-v2.md.
import { describe, it, expect } from 'vitest';
import {
  creaGrilletto, creaLevaMira, creaLevaMovimento, guadagnoMira, LEVA, MIRA, miraDaPomello, pomelloDaMira,
  type ComandoLeva, type ModoArrampicata,
} from '../../src/ui/battaglia/leve';

function leva(modo: ModoArrampicata = 'libero') {
  const c: ComandoLeva[] = [];
  let m = modo;
  const l = creaLevaMovimento((x) => c.push(x), () => m);
  return { c, l, modo: (x: ModoArrampicata) => { m = x; } };
}

describe('leva di movimento · libero', () => {
  it('zona morta 12 px, poi cammina nel verso; al rilascio si ferma', () => {
    const { c, l } = leva();
    l.giu(0, 0);
    l.sposta(10, 0);
    expect(c).toEqual([]);
    l.sposta(30, 5);
    l.sposta(-30, 0);
    l.rilascia();
    expect(c).toEqual([{ t: 'muovi', dir: 1 }, { t: 'muovi', dir: -1 }, { t: 'muovi', dir: 0 }]);
  });

  it('il pomello resta dentro la corsa di 56 px', () => {
    const { l } = leva();
    l.giu(0, 0);
    const k = l.sposta(300, 400);
    expect(Math.round(Math.hypot(k.x, k.y))).toBe(LEVA.raggio);
  });

  it('appoggiare il dito su un lato fa camminare subito (come una croce direzionale)', () => {
    const { c, l } = leva();
    l.giu(-40, 6);
    expect(c).toEqual([{ t: 'muovi', dir: -1 }]);
  });

  it('appoggiare il dito in cima NON fa saltare: serve la spinta', () => {
    const { c, l } = leva();
    l.giu(0, -45);
    l.sposta(2, -46);
    expect(c).toEqual([]);
    // torna verso il centro e spinge di nuovo: adesso salta
    l.sposta(0, -10);
    l.sposta(0, -45);
    expect(c).toEqual([{ t: 'salta', indietro: true }]);
  });

  it('dritto in su = salto alto, una volta sola finché non si torna giù', () => {
    const { c, l } = leva();
    l.giu(0, 0);
    l.sposta(0, -30);
    expect(c).toEqual([]);
    l.sposta(0, -40);
    l.sposta(0, -50);
    expect(c).toEqual([{ t: 'salta', indietro: true }]);
    l.sposta(0, -10);
    l.sposta(0, -40);
    expect(c).toHaveLength(2);
  });

  it('in diagonale = salto lungo dal lato della spinta, girando il pirata', () => {
    const d = leva();
    d.l.giu(0, 0);
    d.l.sposta(32, -38);
    expect(d.c).toEqual([{ t: 'muovi', dir: 1 }, { t: 'salta', indietro: false }, { t: 'muovi', dir: 0 }]);
    const s = leva();
    s.l.giu(0, 0);
    s.l.sposta(-32, -38);
    expect(s.c).toEqual([{ t: 'muovi', dir: -1 }, { t: 'salta', indietro: false }, { t: 'muovi', dir: 0 }]);
  });

  it('salto in corsa: da destra alla diagonale salta a destra e smette di camminare', () => {
    const { c, l } = leva();
    l.giu(0, 0);
    l.sposta(50, 0);
    l.sposta(30, -46);
    expect(c).toEqual([{ t: 'muovi', dir: 1 }, { t: 'salta', indietro: false }, { t: 'muovi', dir: 0 }]);
    // tornando a destra riprende a camminare e il salto si riarma
    l.sposta(50, 0);
    l.sposta(30, -46);
    expect(c.filter((x) => x.t === 'salta')).toHaveLength(2);
  });

  it('chi cammina non salta per un pollice che sale un po\' (fino a 50° resta in cammino)', () => {
    const { c, l } = leva();
    l.giu(0, 0);
    l.sposta(50, 0);
    l.sposta(40, -40); // 45°: ancora cammino
    expect(c).toEqual([{ t: 'muovi', dir: 1 }]);
  });

  it('dritto in giù non fa niente; in basso di lato cammina', () => {
    const { c, l } = leva();
    l.giu(0, 0);
    l.sposta(4, 50);
    expect(c).toEqual([]);
    l.sposta(35, 35);
    expect(c).toEqual([{ t: 'muovi', dir: 1 }]);
  });
});

describe('leva di movimento · scale e liane', () => {
  it('vicino: spinta quasi verticale oltre il 40% = arrampica, non salta', () => {
    const { c, l } = leva('vicino');
    l.giu(0, 0);
    l.sposta(0, -15);
    expect(c).toEqual([]);
    l.sposta(8, -50);
    expect(c).toEqual([{ t: 'arrampica', dir: -1 }]);
    l.sposta(0, 50);
    l.sposta(0, 0);
    expect(c).toEqual([{ t: 'arrampica', dir: -1 }, { t: 'arrampica', dir: 1 }, { t: 'arrampica', dir: 0 }]);
  });

  it('vicino: appoggiare il dito in alto arrampica subito (non è un salto)', () => {
    const { c, l } = leva('vicino');
    l.giu(0, -40);
    expect(c).toEqual([{ t: 'arrampica', dir: -1 }]);
  });

  it('vicino: orizzontale cammina; il salto solo in diagonale partendo dal centro', () => {
    const { c, l } = leva('vicino');
    l.giu(0, 0);
    l.sposta(40, 0);
    l.sposta(0, 0);
    l.sposta(35, -35);
    expect(c).toEqual([
      { t: 'muovi', dir: 1 }, { t: 'muovi', dir: 0 },
      { t: 'muovi', dir: 1 }, { t: 'salta', indietro: false }, { t: 'muovi', dir: 0 },
    ]);
  });

  it('vicino: scivolando da destra verso l\'alto si passa dalla diagonale senza saltare', () => {
    const { c, l } = leva('vicino');
    l.giu(0, 0);
    l.sposta(50, 0);
    l.sposta(38, -38);
    l.sposta(0, -50);
    expect(c.filter((x) => x.t === 'salta')).toEqual([]);
    expect(c.at(-1)).toEqual({ t: 'arrampica', dir: -1 });
  });

  it('appeso: destra pura niente, su = sale, dalla salita alla diagonale salta via da quel lato', () => {
    const { c, l } = leva('appeso');
    l.giu(0, 0);
    l.sposta(50, 0);
    expect(c).toEqual([]);
    l.sposta(0, -50);
    l.sposta(-40, -40);
    expect(c).toEqual([
      { t: 'arrampica', dir: -1 }, { t: 'arrampica', dir: 0 },
      { t: 'muovi', dir: -1 }, { t: 'salta', indietro: false }, { t: 'muovi', dir: 0 },
    ]);
  });

  it('appeso: lasciando la leva resta fermo appeso', () => {
    const { c, l } = leva('appeso');
    l.giu(0, 0);
    l.sposta(0, -50);
    l.rilascia();
    expect(c).toEqual([{ t: 'arrampica', dir: -1 }, { t: 'arrampica', dir: 0 }]);
  });

  it('in cima alla scala (da appeso a libero col pollice ancora in su) non parte un salto a sorpresa', () => {
    const { c, l, modo } = leva('appeso');
    l.giu(0, 0);
    l.sposta(0, -50);
    modo('libero');
    l.rivaluta();
    l.sposta(1, -50);
    l.sposta(0, -52);
    expect(c.filter((x) => x.t === 'salta')).toEqual([]);
    expect(c.at(-1)).toEqual({ t: 'arrampica', dir: 0 });
  });
});

describe('leva di movimento · fasi', () => {
  it('spenta (volo) ricorda il pollice e alla fuga rimanda subito la camminata, mai un salto', () => {
    const { c, l } = leva();
    l.giu(0, 0);
    l.sposta(45, 0);
    expect(c).toEqual([{ t: 'muovi', dir: 1 }]);
    l.attiva(false); // sparo: la leva ferma il pirata e poi tace
    expect(c).toEqual([{ t: 'muovi', dir: 1 }, { t: 'muovi', dir: 0 }]);
    l.sposta(-45, 0);
    expect(c).toHaveLength(2);
    l.attiva(true); // fuga
    expect(c.at(-1)).toEqual({ t: 'muovi', dir: -1 });
    expect(c).toHaveLength(3);
  });

  it('dito appoggiato durante il volo: alla fuga cammina senza rialzarlo', () => {
    const { c, l } = leva();
    l.attiva(false);
    l.giu(40, 0);
    expect(c).toEqual([]);
    l.attiva(true);
    expect(c).toEqual([{ t: 'muovi', dir: 1 }]);
  });

  it('pollice tenuto in su durante il volo: alla fuga non salta finché non si rifà la spinta', () => {
    const { c, l } = leva();
    l.attiva(false);
    l.giu(0, 0);
    l.sposta(0, -50);
    l.attiva(true);
    l.sposta(0, -51);
    expect(c).toEqual([]);
    l.sposta(0, -5);
    l.sposta(0, -50);
    expect(c).toEqual([{ t: 'salta', indietro: true }]);
  });

  it('rilasciata da spenta non manda altro; spegnendosi mentre sale ferma la salita', () => {
    const { c, l } = leva();
    l.giu(0, 0);
    l.sposta(45, 0);
    l.attiva(false);
    l.rilascia();
    expect(c).toEqual([{ t: 'muovi', dir: 1 }, { t: 'muovi', dir: 0 }]);
    const s = leva('appeso');
    s.l.giu(0, 0);
    s.l.sposta(0, -50);
    s.l.attiva(false);
    s.l.rilascia();
    expect(s.c).toEqual([{ t: 'arrampica', dir: -1 }, { t: 'arrampica', dir: 0 }]);
  });
});

describe('leva di mira', () => {
  it('45° · 60% e ritorno: pomello ↔ mira', () => {
    const p = pomelloDaMira(45, 60);
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBeLessThan(0);
    expect(miraDaPomello(p.x, p.y)).toEqual({ mezziGradi: 90, potenza: 60 });
  });

  it('potenza 0 al cerchio interno, 100 al bordo', () => {
    expect(miraDaPomello(MIRA.rMin, 0)).toEqual({ mezziGradi: 0, potenza: 0 });
    expect(miraDaPomello(-MIRA.rMax, 0)).toEqual({ mezziGradi: 360, potenza: 100 });
    expect(miraDaPomello(0, 500).potenza).toBe(100);
  });

  it('piano = preciso (40% del dito), veloce = ampio (95%)', () => {
    expect(guadagnoMira(0)).toBeCloseTo(MIRA.guadagnoLento);
    expect(guadagnoMira(MIRA.lento)).toBeCloseTo(MIRA.guadagnoLento);
    expect(guadagnoMira(5)).toBeCloseTo(MIRA.guadagnoVeloce);
    expect(guadagnoMira(0.4)).toBeGreaterThan(MIRA.guadagnoLento);
    expect(guadagnoMira(0.4)).toBeLessThan(MIRA.guadagnoVeloce);
  });

  it('dito lento: il pomello fa il 40% della strada, angolo a passi di 0,5°, niente invio se non cambia', () => {
    const inviati: { mezziGradi: number; potenza: number }[] = [];
    const j = creaLevaMira((c) => inviati.push(c));
    j.inizia(pomelloDaMira(0, 50));
    j.sposta(0, 0, 16);
    expect(inviati).toEqual([]);
    const y0 = j.pomello.y;
    for (let i = 0; i < 20; i++) j.sposta(0, -1, 16); // 20 px in 320 ms = 0,06 px/ms
    expect(j.pomello.y - y0).toBeCloseTo(-8, 1);
    expect(inviati.length).toBeGreaterThan(0);
    expect(inviati.every((m) => Number.isInteger(m.mezziGradi))).toBe(true);
    expect(inviati.at(-1)!.mezziGradi).toBeGreaterThan(0);
  });

  it('colpo di pollice veloce: gira la mira dall\'altra parte con meno di 2 cm di dito', () => {
    const inviati: { mezziGradi: number; potenza: number }[] = [];
    const j = creaLevaMira((c) => inviati.push(c));
    j.inizia(pomelloDaMira(45, 60)); // in alto a destra
    for (let i = 0; i < 8; i++) j.sposta(-12, 0, 8); // 96 px in 64 ms
    const m = inviati.at(-1)!;
    expect(m.mezziGradi / 2).toBeGreaterThan(110); // ora punta a sinistra
    expect(m.mezziGradi / 2).toBeLessThan(180);
  });

  it('oltre il bordo non si accumula corsa a vuoto: tornando indietro il pomello riparte subito', () => {
    const j = creaLevaMira(() => {});
    j.inizia(pomelloDaMira(0, 50));
    for (let i = 0; i < 30; i++) j.sposta(10, 0, 16); // 300 px oltre
    expect(j.pomello.x).toBeCloseTo(MIRA.rMax);
    j.sposta(-10, 0, 16);
    expect(j.pomello.x).toBeLessThan(MIRA.rMax - 3);
  });

  it('passando per il centro la potenza va a 0 e la mira si gira senza impazzire', () => {
    const inviati: { mezziGradi: number; potenza: number }[] = [];
    const j = creaLevaMira((c) => inviati.push(c));
    j.inizia(pomelloDaMira(0, 20)); // a destra
    for (let i = 0; i < 60; i++) j.sposta(-2, 0, 16);
    // mentre attraversa il centro tiene l'angolo di prima con potenza 0, poi esce a sinistra
    const angoli = new Set(inviati.map((m) => m.mezziGradi));
    expect([...angoli].sort((a, b) => a - b)).toEqual([0, 360]);
    expect(inviati.some((m) => m.potenza === 0)).toBe(true);
    expect(inviati.at(-1)!.mezziGradi).toBe(360);
    expect(inviati.at(-1)!.potenza).toBeGreaterThan(0);
  });
});

describe('FUOCO', () => {
  it('spara al rilascio dentro il tasto, una volta sola per turno', () => {
    let spari = 0;
    const g = creaGrilletto(() => spari++);
    g.premi();
    expect(spari).toBe(0);
    expect(g.rilascia(true, 3)).toBe(true);
    g.premi();
    expect(g.rilascia(true, 3)).toBe(false); // doppio tocco
    expect(spari).toBe(1);
    g.premi();
    g.rilascia(true, 5);
    expect(spari).toBe(2);
  });

  it('scivolando fuori dal tasto lo sparo si annulla e il turno resta buono', () => {
    let spari = 0;
    const g = creaGrilletto(() => spari++);
    g.premi();
    expect(g.rilascia(false, 3)).toBe(false);
    expect(spari).toBe(0);
    g.premi();
    expect(g.rilascia(true, 3)).toBe(true);
  });

  it('un rilascio senza pressione (dito arrivato da fuori) non spara', () => {
    let spari = 0;
    const g = creaGrilletto(() => spari++);
    expect(g.rilascia(true, 1)).toBe(false);
    g.premi(); g.annulla();
    expect(g.rilascia(true, 1)).toBe(false);
    expect(spari).toBe(0);
  });
});
