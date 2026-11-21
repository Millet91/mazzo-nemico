// L1 dell'HUD (agente D): logica dei tasti, griglia 4×4, configurazione della Schermaglia, banner, testi.
import { describe, it, expect } from 'vitest';
import {
  JOYSTICK,
  creaJoystickMira, DOPPIO, limitaPomello, miraDaPomello, pomelloDaMira,
  alzo, bannerDaEventi, barraVento, celleGriglia, comandiVisibili, configSchermaglia, creaDoppioTocco,
  creaGrillettoUnico, creaJoystick, creaRipetitore, micciaSuccessiva, miraAttiva, PASSO_MIRA, RIPETI_OGNI_MS, versoDaMira,
  DURATA_BANNER_MS, type Tempi,
} from '../../src/ui/battaglia/logica';
import { dotazioneIniziale } from '../../src/contenuti/armi';
import { BIL } from '../../src/contenuti/bilanciamento';
import type { VistaBattaglia } from '../../src/core/bus';
import { T } from '../../src/testi/it';

/** Orologio finto: i timer scattano solo con avanza(ms). */
function orologio() {
  let ora = 0;
  let id = 0;
  const timer = new Map<number, { quando: number; ogni: number; f: () => void }>();
  const t: Tempi = {
    ora: () => ora,
    dopo: (ms, f) => { timer.set(++id, { quando: ora + ms, ogni: 0, f }); return id; },
    ogni: (ms, f) => { timer.set(++id, { quando: ora + ms, ogni: ms, f }); return id; },
    annulla: (i) => { timer.delete(i as number); },
  };
  const avanza = (ms: number) => {
    const fine = ora + ms;
    for (;;) {
      const prossimo = [...timer.entries()].filter(([, x]) => x.quando <= fine).sort((a, b) => a[1].quando - b[1].quando)[0];
      if (!prossimo) break;
      const [k, x] = prossimo;
      ora = x.quando;
      if (x.ogni) x.quando += x.ogni; else timer.delete(k);
      x.f();
    }
    ora = fine;
  };
  return { t, avanza };
}

function vista(p: Partial<VistaBattaglia> = {}): VistaBattaglia {
  const sq = (ciurma: 'teschio' | 'marina', controllo: 'umano' | 'ia') => ({ ciurma, controllo, pvTotali: 210, pvIniziali: 210, vivi: 3, iniziali: 3 });
  return {
    numeroTurno: 1, turnoLimite: 18, mareSaleDalTurno: 12, squadraDiTurno: 0, tocca: 'umano', fase: 'azione',
    secondiRimasti: 30, timerAvviato: false, vento: 0, ventoMax: 6,
    squadre: [sq('teschio', 'umano'), sq('marina', 'ia')],
    arma: 'cannone', munizioni: dotazioneIniziale(), miccia: 3, miraGradi: 45, potenza: 60, iaPensa: false,
    puoArrendersi: false, esito: null, ...p,
  };
}

describe('Schermaglia di M1', () => {
  it('Teschio Rosso umano attaccante contro Marina Reale IA Mozzo, 3 contro 3, 30 s, traiettoria intera', () => {
    const c = configSchermaglia(1234);
    expect(c.bioma).toBe('isola');
    expect(c.squadre[0]).toMatchObject({ ciurma: 'teschio', ruolo: 'attaccante', controllo: 'umano', pirati: 3 });
    expect(c.squadre[1]).toMatchObject({ ciurma: 'marina', ruolo: 'difensore', controllo: 'ia', livelloIa: 'mozzo', pirati: 3 });
    expect(c.timerSecondi).toBe(30);
    expect(c.traiettoriaCompleta).toBe(true);
    expect(configSchermaglia(-1).seme).toBe(0xffffffff);
  });
  it('da 1 a 5 pirati per lato (m1-ritmo §9), fuori scala si limita', () => {
    const c = configSchermaglia(1, [5, 1]);
    expect([c.squadre[0].pirati, c.squadre[1].pirati]).toEqual([5, 1]);
    const d = configSchermaglia(1, [9, 0]);
    expect([d.squadre[0].pirati, d.squadre[1].pirati]).toEqual([5, 3]);
  });
});

describe('Griglia armi 4×4', () => {
  it('16 celle in ordine, 4 attive (le Base di M1) con munizioni infinite, 12 bloccate', () => {
    const c = celleGriglia(dotazioneIniziale());
    expect(c.map((x) => x.numero)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    expect(c.filter((x) => x.attiva).map((x) => x.id)).toEqual(['cannone', 'granata', 'pistola', 'sciabola']);
    expect(c.filter((x) => x.attiva).every((x) => x.munizioni === -1)).toBe(true);
    expect(c.filter((x) => !x.attiva)).toHaveLength(12);
  });
  it('un\'arma con munizioni finite a 0 è bloccata', () => {
    expect(celleGriglia({ cannone: -1, barile: 0 }).find((x) => x.id === 'barile')!.attiva).toBe(false);
    expect(celleGriglia({ cannone: -1, barile: 1 }).find((x) => x.id === 'barile')!.attiva).toBe(true);
  });
});

describe('Tasti', () => {
  it('▲▼: un passo al tocco, poi 10°/s tenendo premuto, stop al rilascio', () => {
    const { t, avanza } = orologio();
    let passi = 0;
    const r = creaRipetitore(() => passi++, t);
    r.premi();
    expect(passi).toBe(1);
    avanza(299);
    expect(passi).toBe(1);
    avanza(1 + 1000);
    expect(passi).toBe(11); // 1 + 10 in un secondo
    r.rilascia();
    avanza(1000);
    expect(passi).toBe(11);
    expect(PASSO_MIRA).toBe(2); // 1° = 2 mezzi gradi
    expect(RIPETI_OGNI_MS).toBe(100);
  });

  it('SALTA: tocco singolo = avanti dopo 250 ms; doppio tocco = indietro, una volta sola', () => {
    const { t, avanza } = orologio();
    const fatti: string[] = [];
    const s = creaDoppioTocco(() => fatti.push('avanti'), () => fatti.push('indietro'), t);
    s.tocca(); avanza(250);
    expect(fatti).toEqual(['avanti']);
    s.tocca(); avanza(100); s.tocca(); avanza(500);
    expect(fatti).toEqual(['avanti', 'indietro']);
  });

  it('FUOCO: il doppio tocco (o due dita) spara una volta sola per turno', () => {
    let spari = 0;
    const f = creaGrillettoUnico(() => spari++);
    expect(f.tocca(3)).toBe(true);
    expect(f.tocca(3)).toBe(false);
    expect(spari).toBe(1);
    f.tocca(5);
    expect(spari).toBe(2);
  });

  it('miccia: 1 → 5 e poi ricomincia; niente miccia per il cannone', () => {
    expect([1, 2, 3, 4, 5].map((m) => micciaSuccessiva(m, 'granata'))).toEqual([2, 3, 4, 5, 1]);
    expect(micciaSuccessiva(3, 'cannone')).toBe(3);
  });
});

describe('Cosa si vede', () => {
  it('comandi solo nel turno umano in azione o fuga; mira e FUOCO solo in azione', () => {
    expect(comandiVisibili(vista())).toBe(true);
    expect(comandiVisibili(vista({ fase: 'fuga' }))).toBe(true);
    expect(miraAttiva(vista({ fase: 'fuga' }))).toBe(false);
    expect(comandiVisibili(vista({ fase: 'volo' }))).toBe(false);
    expect(comandiVisibili(vista({ tocca: 'ia' }))).toBe(false);
    expect(comandiVisibili(null)).toBe(false);
  });
  it('alzo mostrato sopra l\'orizzonte nei due versi', () => {
    expect(alzo(45)).toBe(45);
    expect(alzo(135)).toBe(45);
    expect(alzo(180)).toBe(0);
    expect(alzo(350)).toBe(-10);
    expect(alzo(200)).toBe(-20);
  });
  it('barra del vento dal centro', () => {
    expect(barraVento(3, 6)).toEqual({ verso: 1, frazione: 0.5 });
    expect(barraVento(-6, 6)).toEqual({ verso: -1, frazione: 1 });
    expect(barraVento(0, 6)).toEqual({ verso: 0, frazione: 0 });
  });
});

describe('Banner', () => {
  it('"Tocca a te!", il turno della Marina Reale, il mare che sale e gli ultimi turni', () => {
    const v = vista();
    const inizio = (numero: number, squadra: 0 | 1) => ({ t: 'turnoIniziato' as const, numero, squadra, pirata: 0, vento: 0 });
    expect(bannerDaEventi([inizio(1, 0)], v)).toEqual([T.battaglia.toccaATe]);
    expect(bannerDaEventi([inizio(2, 1)], v)).toEqual(['Turno della Marina Reale']);
    expect(bannerDaEventi([inizio(BIL.battaglia.mareSaleDalTurno, 1)], v)).toEqual(['Turno della Marina Reale', T.battaglia.mareSale]);
    expect(bannerDaEventi([inizio(16, 1)], v)).toEqual(['Turno della Marina Reale', T.battaglia.ultimiTurni]);
    expect(bannerDaEventi([{ t: 'timerAvviato' }], v)).toEqual([]);
  });
});

describe('Joystick (m1-ritmo §1)', () => {
  const prova = (verso: 1 | -1 | 0) => {
    const c: unknown[] = [];
    return { c, j: creaJoystick((x) => c.push(x), () => verso) };
  };
  it('zona morta 12 px, poi cammina nel verso; al rilascio si ferma', () => {
    const { c, j } = prova(1);
    j.sposta(10, 0);
    expect(c).toEqual([]);
    j.sposta(30, 5);
    j.sposta(-30, 0);
    j.rilascia();
    expect(c).toEqual([{ t: 'muovi', dir: 1 }, { t: 'muovi', dir: -1 }, { t: 'muovi', dir: 0 }]);
  });
  it('il pomello resta dentro il raggio 56', () => {
    const { j } = prova(1);
    const k = j.sposta(300, 400);
    expect(Math.round(Math.sqrt(k.x * k.x + k.y * k.y))).toBe(56);
  });
  it('spinta in alto oltre il 60% = salto avanti, una volta sola finché non si torna giù', () => {
    const { c, j } = prova(1);
    j.sposta(0, -30);
    expect(c).toEqual([]);
    j.sposta(0, -40);
    j.sposta(0, -50);
    expect(c).toEqual([{ t: 'salta', indietro: false }]);
    j.sposta(0, -10);
    j.sposta(0, -40);
    expect(c).toEqual([{ t: 'salta', indietro: false }, { t: 'salta', indietro: false }]);
  });
  it('in alto contro il verso del pirata = salto alto all\'indietro, senza girarsi prima', () => {
    const { c, j } = prova(1);
    j.sposta(-20, -50);
    expect(c).toEqual([{ t: 'salta', indietro: true }]);
    const b = prova(-1);
    b.j.sposta(-20, -50);
    expect(b.c).toEqual([{ t: 'salta', indietro: false }]);
  });
  it('verso dalla mira', () => {
    expect(versoDaMira(45)).toBe(1);
    expect(versoDaMira(135)).toBe(-1);
    expect(versoDaMira(90)).toBe(0);
    expect(versoDaMira(350)).toBe(1);
  });
  it('banner di 0,8 s e avvisi delle casse', () => {
    expect(DURATA_BANNER_MS).toBe(800);
    const v = vista();
    expect(bannerDaEventi([{ t: 'cassaCaduta', proiettile: 1, x: 100 }], v)).toEqual(['Cassa in arrivo!']);
    expect(bannerDaEventi([{ t: 'cassaAperta', proiettile: 1, pirata: 0, contenuto: 'rum' }], v)).toEqual(['Rum! +25 PV']);
    expect(bannerDaEventi([{ t: 'cassaAperta', proiettile: 1, pirata: 0, contenuto: 'trappola' }], v)).toEqual(['Trappola!']);
  });
});

describe('doppio joystick: mira', () => {
  it('45° · 60% e ritorno: pomello ↔ mira', () => {
    const p = pomelloDaMira(45, 60);
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBeLessThan(0); // in alto a destra
    expect(miraDaPomello(p.x, p.y)).toEqual({ mezziGradi: 90, potenza: 60 });
  });
  it('potenza 0 sul bordo di FUOCO, 100 sul bordo della base', () => {
    expect(miraDaPomello(DOPPIO.mira.fuoco / 2, 0)).toEqual({ mezziGradi: 0, potenza: 0 });
    expect(miraDaPomello(-DOPPIO.mira.base / 2, 0)).toEqual({ mezziGradi: 360, potenza: 100 });
  });
  it('il pomello resta sulla corona', () => {
    const dentro = limitaPomello(1, 0);
    expect(dentro.x).toBe(DOPPIO.mira.fuoco / 2);
    const fuori = limitaPomello(0, 500);
    expect(fuori.y).toBe(DOPPIO.mira.base / 2);
  });
  it('trascinamento relativo al 50%, passi di 0,5°, niente invio se non cambia', () => {
    const inviati: unknown[] = [];
    const j = creaJoystickMira((c) => inviati.push(c));
    const p0 = pomelloDaMira(0, 50);
    j.inizia(p0);
    j.sposta(0, 0);
    expect(inviati).toEqual([]);
    const p = j.sposta(0, -40); // dito 40 px in su → pomello 20 px in su
    expect(Math.round(p.y)).toBe(-20);
    expect(inviati.length).toBe(1);
    const m = inviati[0] as { mezziGradi: number; potenza: number };
    expect(Number.isInteger(m.mezziGradi)).toBe(true);
    expect(m.mezziGradi).toBeGreaterThan(0);
  });
});

describe('joystick: scale e liane', () => {
  const crea = (modo: 'libero' | 'vicino' | 'appeso', verso: 1 | -1 = 1) => {
    const c: unknown[] = [];
    let m = modo;
    const j = creaJoystick((x) => c.push(x), () => verso, () => m);
    return { c, j, cambia: (n: typeof m) => { m = n; } };
  };
  const R = JOYSTICK.raggio;
  it('vicino: spinta quasi verticale oltre il 40% = arrampica, non salta', () => {
    const { c, j } = crea('vicino');
    j.sposta(5, -0.3 * R);           // sotto il 40%: niente
    expect(c).toEqual([]);
    j.sposta(10, -0.8 * R);           // ~13° dalla verticale: su
    expect(c).toEqual([{ t: 'arrampica', dir: -1 }]);
    j.sposta(-10, 0.8 * R);           // giù
    j.rilascia();
    expect(c).toEqual([{ t: 'arrampica', dir: -1 }, { t: 'arrampica', dir: 1 }, { t: 'arrampica', dir: 0 }]);
  });
  it('vicino: il salto solo in diagonale 30-60° oltre il 60%, nel verso della spinta', () => {
    const { c, j } = crea('vicino', 1);
    j.sposta(-0.6 * R, -0.6 * R);    // 45° in alto a sinistra, pirata girato a destra → salto all'indietro
    expect(c).toContainEqual({ t: 'salta', indietro: true });
    expect(c.filter((x: any) => x.t === 'arrampica')).toEqual([]);
  });
  it('vicino: orizzontale cammina', () => {
    const { c, j } = crea('vicino');
    j.sposta(0.8 * R, 0);
    expect(c).toEqual([{ t: 'muovi', dir: 1 }]);
  });
  it('appeso: destra/sinistra pura non fa niente, diagonale salta via, lasciato = fermo', () => {
    const { c, j } = crea('appeso', 1);
    j.sposta(R, 0);
    expect(c).toEqual([]);
    j.sposta(0, -R);
    j.sposta(0.6 * R, -0.6 * R);     // diagonale avanti: smette di salire e salta
    j.rilascia();
    expect(c).toEqual([{ t: 'arrampica', dir: -1 }, { t: 'arrampica', dir: 0 }, { t: 'salta', indietro: false }]);
  });
  it('appeso: scivolando da destra verso l\'alto non salta per sbaglio', () => {
    const { c, j } = crea('appeso', 1);
    j.sposta(0.9 * R, 0);
    j.sposta(0.6 * R, -0.6 * R);
    j.sposta(0, -R);
    expect(c).toEqual([{ t: 'arrampica', dir: -1 }]);
  });
  it('libero: come prima, su oltre il 60% salta', () => {
    const { c, j } = crea('libero');
    j.sposta(0, -R);
    expect(c).toEqual([{ t: 'salta', indietro: false }]);
  });
});
