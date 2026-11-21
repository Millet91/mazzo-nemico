// Agente Fisica · armi, comandi e ciclo del turno (contratto §4A, casi QA 8 e fine battaglia).
import { describe, it, expect } from 'vitest';
import { BIL, TICK_AL_SECONDO } from '../../src/contenuti/bilanciamento';
import { ARMA } from '../../src/contenuti/armi';
import { daGradi, normalizza } from '../../src/core/trig';
import { avanzaTick, eseguiComando, pirataAttivo } from '../../src/battaglia/sim';
import type { EventoBattaglia } from '../../src/core/tipi';
import { MATERIALE } from '../../src/core/tipi';
import { dannoArma } from '../../src/battaglia/sim/esplosione';
import { avanza, avanzaFinche, battagliaPiatta, eventiDi, inAzione, pirata, rettangolo, spara, SUOLO, terrenoPiatto } from './aiuti';

const TIMER = BIL.turno.timerMozzo * TICK_AL_SECONDO;

describe('Fasi del turno e timer', () => {
  it('il turno 1 è dell\'attaccante e parte da inquadra; i suoi eventi escono al primo tick', () => {
    const s = battagliaPiatta([800], [1200]);
    expect(s.turno.numero).toBe(1);
    expect(s.turno.squadra).toBe(0);
    expect(s.turno.fase).toBe('inquadra');
    const ev = avanza(s, 1);
    expect(eventiDi(ev, 'turnoIniziato')).toHaveLength(1);
    expect(eventiDi(ev, 'fase')[0].fase).toBe('inquadra');
    avanza(s, BIL.camera.inquadraTick);
    expect(s.turno.fase).toBe('azione');
  });

  it('il timer parte dopo 2 s senza comandi, o subito al primo comando', () => {
    const s = battagliaPiatta([800], [1200]);
    inAzione(s);
    let ev = avanza(s, BIL.turno.avvioTimerTick - 1);
    expect(s.turno.timerAvviato).toBe(false);
    ev = avanza(s, 2);
    expect(s.turno.timerAvviato).toBe(true);
    expect(eventiDi(ev, 'timerAvviato')).toHaveLength(1);

    const s2 = battagliaPiatta([800], [1200]);
    inAzione(s2);
    eseguiComando(s2, { t: 'ruotaMira', delta: 2 });
    expect(s2.turno.timerAvviato).toBe(true);
    ev = avanza(s2, 1);
    expect(eventiDi(ev, 'timerAvviato')).toHaveLength(1);
    expect(s2.turno.tickRimasti).toBe(TIMER - 1);
  });

  it('timer scaduto senza sparo: risoluzione subito, senza fuga; poi tocca all\'altra squadra', () => {
    const s = battagliaPiatta([800], [1200]);
    inAzione(s);
    const fasi = eventiDi(avanzaFinche(s, (x) => x.turno.numero === 2), 'fase').map((e) => e.fase);
    expect(fasi).not.toContain('fuga');
    expect(fasi).toContain('risoluzione');
    expect(s.turno.squadra).toBe(1);
  });

  it('dopo lo sparo: volo (timer fermo) → fuga di 3 s → risoluzione', () => {
    const s = battagliaPiatta([800], [1400]);
    inAzione(s);
    spara(s, 'cannone', daGradi(45), 50);
    const ev: EventoBattaglia[] = [];
    avanzaTick(s, ev);
    expect(eventiDi(ev, 'sparo')).toEqual([{ t: 'sparo', pirata: 0, arma: 'cannone' }]);
    expect(s.turno.fase).toBe('volo');
    const rimasti = s.turno.tickRimasti;
    avanzaFinche(s, (x) => x.turno.fase !== 'volo');
    expect(s.turno.tickRimasti).toBe(rimasti);
    expect(s.turno.fase).toBe('fuga');
    const inizio = s.tick;
    avanzaFinche(s, (x) => x.turno.fase !== 'fuga');
    expect(s.tick - inizio).toBe(BIL.turno.fugaTick);
    expect(s.turno.fase).toBe('risoluzione');
  });

  it('i comandi fuori fase si ignorano e non si spara due volte', () => {
    const s = battagliaPiatta([800], [1400]);
    eseguiComando(s, { t: 'fuoco' }); // in inquadra
    avanza(s, 1);
    expect(s.turno.sparato).toBe(false);
    inAzione(s);
    eseguiComando(s, { t: 'fuoco' });
    eseguiComando(s, { t: 'fuoco' });
    const ev = avanza(s, 2);
    expect(eventiDi(ev, 'sparo')).toHaveLength(1);
    eseguiComando(s, { t: 'fuoco' });
    expect(eventiDi(avanza(s, 2), 'sparo')).toHaveLength(0);
  });

  it('rotazione dei pirati vivi, saltando i morti', () => {
    const s = battagliaPiatta([300, 400, 500], [1500, 1600]);
    const visti: number[] = [];
    s.pirati[1].stato = 'annegato'; s.pirati[1].vita = 0;
    for (let i = 0; i < 6; i++) { visti.push(s.turno.pirata); avanzaFinche(s, (x) => x.turno.numero === i + 2); }
    expect(visti).toEqual([0, 3, 2, 4, 0, 3]);
  });

  it('vento nuovo a ogni turno entro ±ventoMax del bioma', () => {
    const s = battagliaPiatta([800], [1200], { seme: 99 });
    const venti = new Set<number>();
    for (let i = 0; i < 12; i++) {
      expect(Math.abs(s.vento)).toBeLessThanOrEqual(BIL.ventoMax.isola);
      expect(Number.isInteger(s.vento)).toBe(true);
      venti.add(s.vento);
      avanzaFinche(s, (x) => x.turno.numero === i + 2);
    }
    expect(venti.size).toBeGreaterThan(2);
  });
});

describe('Comandi di mira e movimento', () => {
  it('mira gira il pirata verso l\'angolo (0 = destra, 360 = sinistra, 180 invariato)', () => {
    const s = battagliaPiatta([800], [1200]);
    inAzione(s);
    const p = pirataAttivo(s)!;
    eseguiComando(s, { t: 'mira', mezziGradi: 360, potenza: 50 });
    expect(p.verso).toBe(-1);
    eseguiComando(s, { t: 'mira', mezziGradi: 180, potenza: 50 });
    expect(p.verso).toBe(-1);
    eseguiComando(s, { t: 'mira', mezziGradi: 0, potenza: 150 });
    expect(p.verso).toBe(1);
    expect(s.turno.mira.potenza).toBe(100);
  });

  it('ruotaMira alza la mira nel verso del pirata e si ferma in verticale', () => {
    const s = battagliaPiatta([800], [1200]);
    inAzione(s);
    eseguiComando(s, { t: 'mira', mezziGradi: daGradi(45), potenza: 50 });
    eseguiComando(s, { t: 'ruotaMira', delta: 10 });
    expect(s.turno.mira.mezziGradi).toBe(daGradi(50));
    eseguiComando(s, { t: 'mira', mezziGradi: daGradi(135), potenza: 50 }); // a sinistra
    eseguiComando(s, { t: 'ruotaMira', delta: 10 });
    expect(s.turno.mira.mezziGradi).toBe(daGradi(130));
    eseguiComando(s, { t: 'ruotaMira', delta: 500 });
    expect(s.turno.mira.mezziGradi).toBe(daGradi(90));
    eseguiComando(s, { t: 'ruotaMira', delta: -1000 });
    expect(s.turno.mira.mezziGradi).toBe(daGradi(270));
  });

  it('girandosi a piedi tiene l\'elevazione della mira', () => {
    const s = battagliaPiatta([800], [1200]);
    inAzione(s);
    eseguiComando(s, { t: 'mira', mezziGradi: daGradi(30), potenza: 50 });
    eseguiComando(s, { t: 'muovi', dir: -1 });
    expect(s.turno.mira.mezziGradi).toBe(normalizza(daGradi(150)));
  });

  it('camminata e salto avanti/indietro del pirata attivo', () => {
    const s = battagliaPiatta([800], [1400]);
    inAzione(s);
    const p = pirata(s);
    eseguiComando(s, { t: 'muovi', dir: 1 });
    avanza(s, 60);
    expect(p.x).toBeCloseTo(860, 5);
    eseguiComando(s, { t: 'muovi', dir: 0 });
    eseguiComando(s, { t: 'salta', indietro: false });
    const ev = avanza(s, 1);
    expect(eventiDi(ev, 'salto')).toEqual([{ t: 'salto', pirata: p.id }]);
    avanzaFinche(s, () => p.aTerra);
    expect(p.x).toBeGreaterThan(870);
    const x = p.x;
    eseguiComando(s, { t: 'salta', indietro: true });
    avanza(s, 1);
    avanzaFinche(s, () => p.aTerra);
    expect(p.x).toBeLessThan(x);
    expect(p.vita).toBe(BIL.pirata.pv); // i salti non fanno male
  });

  it('la miccia si regola tra 1 e 5 s', () => {
    const s = battagliaPiatta([800], [1200]);
    inAzione(s);
    eseguiComando(s, { t: 'miccia', secondi: 9 });
    expect(s.turno.miccia).toBe(ARMA.granata.miccia!.max);
    eseguiComando(s, { t: 'miccia', secondi: 0 });
    expect(s.turno.miccia).toBe(ARMA.granata.miccia!.min);
  });
});

describe('Le 4 armi di M1', () => {
  it('cannone: colpisce il nemico, scava e fa il danno del Teschio', () => {
    const s = battagliaPiatta([800], [1000]);
    inAzione(s);
    const n = pirata(s, 1);
    // tiro dritto: angolo 0, potenza piena; il proiettile scende poco in 184 px
    spara(s, 'cannone', 0, 100);
    const ev = avanzaFinche(s, (x) => x.turno.fase === 'fuga');
    expect(eventiDi(ev, 'esplosione')).toHaveLength(1);
    expect(eventiDi(ev, 'cratere')).toHaveLength(1);
    const d = eventiDi(ev, 'danno').find((e) => e.pirata === n.id)!;
    expect(d.quanto).toBeGreaterThan(ARMA.cannone.danno * 0.66);
    expect(d.quanto).toBeLessThanOrEqual(dannoArma('cannone', 'teschio'));
  });

  it('granata: esplode allo scadere della miccia, non all\'impatto', () => {
    const s = battagliaPiatta([800], [1600]);
    inAzione(s);
    eseguiComando(s, { t: 'miccia', secondi: 2 });
    spara(s, 'granata', daGradi(60), 40);
    const t0 = s.tick + 1; // il colpo parte al tick dopo
    const ev = avanzaFinche(s, (x) => x.turno.fase === 'fuga');
    const quando = ev.indexOf(eventiDi(ev, 'esplosione')[0]);
    expect(quando).toBeGreaterThan(-1);
    expect(eventiDi(ev, 'rimbalzo').length).toBeGreaterThan(0);
    expect(s.tick).toBeGreaterThanOrEqual(t0 + 2 * TICK_AL_SECONDO);
  });

  it('pistola: 2 colpi a 30 tick, 18 danni l\'uno, poi fuga', () => {
    const s = battagliaPiatta([800], [1000]);
    inAzione(s);
    const n = pirata(s, 1);
    spara(s, 'pistola', 0);
    const ev: EventoBattaglia[] = [];
    const tick: number[] = [];
    while (s.turno.fase !== 'fuga') { const prima = ev.length; avanzaTick(s, ev); if (eventiDi(ev.slice(prima), 'colpoPistola').length) tick.push(s.tick); }
    expect(tick).toHaveLength(ARMA.pistola.colpi!);
    expect(tick[1] - tick[0]).toBe(ARMA.pistola.intervalloColpi);
    expect(BIL.pirata.pv - n.vita).toBe(2 * ARMA.pistola.danno);
  });

  it('pistola contro il terreno: buca di 6 px', () => {
    const t = terrenoPiatto();
    rettangolo(t, 900, 300, 960, SUOLO, MATERIALE.terra);
    const s = battagliaPiatta([800], [1400], { terreno: t });
    inAzione(s);
    spara(s, 'pistola', 0);
    const ev = avanzaFinche(s, (x) => x.turno.fase === 'fuga');
    expect(eventiDi(ev, 'cratere')).toHaveLength(2);
    expect(eventiDi(ev, 'cratere')[0].raggio).toBeLessThanOrEqual(Math.ceil(ARMA.pistola.buca! * 1.2));
  });

  it('sciabola: 25 danni e spinta 450 px/s a 45° a chi è davanti, niente a chi è dietro', () => {
    const s = battagliaPiatta([1000, 975], [1020]);
    inAzione(s);
    const davanti = pirata(s, 2), dietro = pirata(s, 1);
    eseguiComando(s, { t: 'arma', arma: 'sciabola' });
    eseguiComando(s, { t: 'mira', mezziGradi: 0, potenza: 0 });
    eseguiComando(s, { t: 'fuoco' });
    const ev = avanza(s, 1);
    expect(eventiDi(ev, 'colpoSciabola')[0].colpiti).toEqual([davanti.id]);
    expect(BIL.pirata.pv - davanti.vita).toBe(ARMA.sciabola.danno);
    expect(dietro.vita).toBe(BIL.pirata.pv);
    const v = 450 / TICK_AL_SECONDO;
    // la gravità di un tick è già stata applicata al vy
    expect(davanti.vx).toBeCloseTo(v * Math.SQRT1_2, 6);
    expect(davanti.vy).toBeCloseTo(-v * Math.SQRT1_2 + BIL.fisica.gravita, 6);
  });

  it('un\'arma senza munizioni o assente non si sceglie', () => {
    const s = battagliaPiatta([800], [1200]);
    inAzione(s);
    eseguiComando(s, { t: 'arma', arma: 'kraken' });
    expect(s.turno.arma).toBe('cannone');
  });
});

describe('Morte, lapidi e fine battaglia', () => {
  it('a 0 PV il pirata resta a terra e a fine risoluzione diventa una lapide che esplode (10 danni, raggio 25)', () => {
    const s = battagliaPiatta([800], [1000, 1015]);
    inAzione(s);
    const n = pirata(s, 1), vicino = pirata(s, 2);
    n.vita = 5;
    spara(s, 'pistola', 0);
    let ev = avanzaFinche(s, (x) => x.turno.fase === 'risoluzione');
    expect(n.vita).toBe(0);
    expect(n.stato).toBe('vivo'); // a terra, in attesa della lapide
    expect(eventiDi(ev, 'morto')).toHaveLength(0);
    avanzaFinche(s, (x) => x.pirati.every((p) => p.aTerra));
    // rimettiamo il vicino a 15 px dal caduto per misurare la lapide
    vicino.x = n.x + 15; vicino.y = n.y;
    const pvVicino = vicino.vita;
    ev = avanzaFinche(s, (x) => x.turno.numero === 2);
    expect(n.stato).toBe('morto');
    expect(eventiDi(ev, 'morto')).toContainEqual({ t: 'morto', pirata: n.id, causa: 'pv' });
    expect(eventiDi(ev, 'lapide')).toHaveLength(1);
    expect(eventiDi(ev, 'esplosione').find((e) => e.arma === 'lapide')!.raggio).toBe(BIL.lapide.raggio);
    expect(pvVicino - vicino.vita).toBeGreaterThanOrEqual(1);
    expect(pvVicino - vicino.vita).toBeLessThanOrEqual(BIL.lapide.danno);
  });

  it('eliminazione: vince chi resta', () => {
    const s = battagliaPiatta([800], [1000]);
    inAzione(s);
    pirata(s, 1).vita = 1;
    spara(s, 'cannone', 0, 100);
    const ev = avanzaFinche(s, (x) => x.esito !== null);
    expect(s.esito).toMatchObject({ vincitore: 0, motivo: 'eliminazione', superstiti: [1, 0], turni: 1 });
    expect(eventiDi(ev, 'fine')).toHaveLength(1);
    expect(s.turno.fase).toBe('fine');
  });

  it('caso 8: la risoluzione si chiude d\'ufficio dopo 10 s', () => {
    const s = battagliaPiatta([800], [1200]);
    avanzaFinche(s, (x) => x.turno.fase === 'risoluzione');
    // un oggetto che non si ferma mai (lapide con miccia lunghissima): la risoluzione non può aspettarlo
    s.proiettili.push({ id: 99, tipo: 'lapide', arma: 'lapide', x: 500, y: 100, vx: 0, vy: 0, tickEsplosione: 1e9, lanciatore: -1, fermo: false });
    const inizio = s.turno.inizioFase;
    avanzaFinche(s, (x) => x.turno.numero === 2);
    expect(s.tick - inizio).toBeLessThanOrEqual(BIL.turno.risoluzioneMaxTick + 1);
    expect(s.proiettili).toHaveLength(0);
  });

  it('dal turno 12 il mare sale di 25 px a fine turno; al turno 18 parità ⇒ vince il difensore', () => {
    const s = battagliaPiatta([800], [1200]);
    const mare0 = s.terreno.mare;
    const livelli: number[] = [];
    // senza casse: qui conta solo il mare (un Rum cambierebbe i PV)
    const ev = avanzaFinche(s, (x) => { x.proiettili = x.proiettili.filter((p) => p.tipo !== 'cassa'); return x.esito !== null; }, 200000);
    for (const e of eventiDi(ev, 'mareSale')) livelli.push(e.livello);
    const volte = BIL.battaglia.turnoLimite - BIL.battaglia.mareSaleDalTurno + 1;
    expect(livelli).toHaveLength(volte);
    expect(livelli[livelli.length - 1]).toBe(mare0 - volte * BIL.battaglia.mareSalePx);
    expect(s.esito).toMatchObject({ vincitore: 1, motivo: 'tempo', turni: BIL.battaglia.turnoLimite, pvTotali: [70, 70] });
  });

  it('al turno 18 vince chi ha più PV', () => {
    const s = battagliaPiatta([800], [1200]);
    pirata(s, 1).vita = 30;
    avanzaFinche(s, (x) => { x.proiettili = x.proiettili.filter((p) => p.tipo !== 'cassa'); return x.esito !== null; }, 200000);
    expect(s.esito).toMatchObject({ vincitore: 0, motivo: 'tempo' });
  });

  it('ritirata: solo dal turno 4, vince il difensore', () => {
    const s = battagliaPiatta([800], [1200]);
    eseguiComando(s, { t: 'ritirata' });
    avanza(s, 1);
    expect(s.esito).toBeNull();
    avanzaFinche(s, (x) => x.turno.numero === BIL.battaglia.ritirataDalTurno);
    eseguiComando(s, { t: 'ritirata' });
    const ev: EventoBattaglia[] = [];
    avanzaTick(s, ev);
    expect(s.esito).toMatchObject({ vincitore: 1, motivo: 'ritirata' });
    expect(eventiDi(ev, 'fine')).toHaveLength(1);
    expect(s.turno.fase).toBe('fine');
  });
});
