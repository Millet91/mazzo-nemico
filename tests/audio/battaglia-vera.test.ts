// L'audio con gli eventi VERI della sim (P1-contratti §6, Audio punto 1). Gli altri test dell'audio usano eventi
// scritti a mano; qui la sim gioca davvero (Balzo, salto dal muro, scavalco, scale e liane in un tocco, battaglie
// intere sulla Cala v3) e ogni tick passa da suoniPerEventi come nel gioco. Si controlla l'ordine dei suoni e che
// il mix regga: niente evento senza suono, niente raffiche, niente suono in ciclo che resta acceso.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import type { Comando, EventoBattaglia, StatoBattaglia } from '../../src/core/tipi';
import { MATERIALE } from '../../src/core/tipi';
import { avanzaTick, balzoPossibile, creaBattaglia, eseguiComando } from '../../src/battaglia/sim';
import { TICK_AL_SECONDO } from '../../src/contenuti/bilanciamento';
import { memoriaNuova, MUTI_PER_SCELTA, suoniPerEventi, type MemoriaAudio } from '../../src/audio/eventi';
import { AUDIO } from '../../src/audio/registro';
import { POLIFONIA_MAX, VOCE_OGNI_MS } from '../../src/audio/mix';
import { battagliaPiatta, config, inAzione, mappa, pirata, rettangolo, SUOLO, terrenoPiatto } from '../sim/aiuti';
import { conAppigli, configCaso, mappaPer, nuovaBattaglia, pilotaIa, pilotaScalatore, TICK_MAX, type Pilota } from '../qa/banco';
import { vistaFinta } from './copione';

/** Un suono sentito: quando si sente (secondi dal via, ritardo compreso), quale, e gli eventi che l'hanno chiesto. */
interface Sentito { s: number; id: string; eventi: string[] }

/** Avanza la sim tick per tick passando gli eventi all'audio, come fa il gioco (un frame = un tick). */
class Orecchio {
  readonly sentiti: Sentito[] = [];
  readonly cicliAccesi = new Set<string>();
  private readonly mem: MemoriaAudio = memoriaNuova();
  private readonly t0: number;
  constructor(readonly s: StatoBattaglia) { this.t0 = s.tick; }

  tick(comandi: Comando[] = []): EventoBattaglia[] {
    for (const c of comandi) eseguiComando(this.s, c);
    const ev: EventoBattaglia[] = [];
    avanzaTick(this.s, ev);
    if (!ev.length) return ev;
    const az = suoniPerEventi(ev, vistaFinta(), this.mem, (this.s.tick * 1000) / TICK_AL_SECONDO);
    for (const k of az.ferma) if (k === '*') this.cicliAccesi.clear(); else this.cicliAccesi.delete(k);
    const quando = (this.s.tick - this.t0) / TICK_AL_SECONDO;
    for (const r of az.suoni) {
      if (r.ciclo) this.cicliAccesi.add(r.ciclo);
      // l'istante in cui si sente davvero: con il ritardo chiesto (la voce di vittoria arriva 0,9 s dopo il jingle)
      this.sentiti.push({ s: quando + (r.ritardo ?? 0), id: r.id, eventi: ev.map((e) => e.t) });
    }
    return ev;
  }

  per(n: number, comandi: Record<number, Comando> = {}): this {
    for (let i = 0; i < n && !this.s.esito; i++) this.tick(comandi[i] ? [comandi[i]] : []);
    return this;
  }

  finche(cond: () => boolean, max = 600): this {
    for (let i = 0; i < max && !cond() && !this.s.esito; i++) this.tick();
    return this;
  }

  /** gli id in ordine, senza le voci dei pirati (cambiano con la priorità) e senza la campana di turno */
  get ids(): string[] { return this.sentiti.map((x) => x.id).filter((x) => !x.startsWith('vox_') && !x.startsWith('turno_')); }
  quando(id: string): number[] { return this.sentiti.filter((x) => x.id === id).map((x) => x.s); }
}

/**
 * La sim manda già scivolata, bordo e piolo? (Fisica li aggiunge nella Fase 1: finché non ci sono, i test che li
 * aspettano dalla sim vera restano in attesa e gli altri controlli girano lo stesso)
 */
const SIM = readdirSync('src/battaglia/sim').filter((f) => f.endsWith('.ts')).map((f) => readFileSync(`src/battaglia/sim/${f}`, 'utf8')).join('\n');
const HA_SCIVOLATA = /t:\s*'scivola'/.test(SIM);
const HA_BORDO = /t:\s*'bordo'/.test(SIM);
const HA_PIOLO = /t:\s*'piolo'/.test(SIM);
/** Fase 3 (Fisica, PR 2 e 4): pezzi che cadono, fuoco, frane */
const HA_CROLLI = /t:\s*'crollo'/.test(SIM);
const HA_FUOCO = /t:\s*'fuoco'/.test(SIM);

const salta = (indietro = false): Comando => ({ t: 'salta', indietro });

describe('Audio · Balzo con la sim vera', () => {
  it('Balzo da fermo: stacco degli stivali subito, atterraggio morbido dopo circa 0,75 s, niente tonfo', () => {
    const s = battagliaPiatta([800], [1600]);
    inAzione(s);
    const o = new Orecchio(s).per(1, { 0: salta() }).finche(() => pirata(s).aTerra);
    o.per(10);
    expect(o.ids).toEqual(['salto', 'atterra']);
    expect(o.quando('salto')[0]).toBeLessThan(0.05);
    const volo = o.quando('atterra')[0] - o.quando('salto')[0];
    expect(volo).toBeGreaterThan(0.6);
    expect(volo).toBeLessThan(0.9);
  });

  it('corsa e Balzo: in aria i passi tacciono, all\'atterraggio la corsa riprende con passi e fibbie', () => {
    const s = battagliaPiatta([800], [1600]);
    inAzione(s);
    const o = new Orecchio(s).per(50, { 0: { t: 'muovi', dir: 1 } });
    o.tick([salta()]);
    o.finche(() => pirata(s).aTerra).per(30);
    const [su] = o.quando('salto'), [giu] = o.quando('atterra');
    expect(o.sentiti.filter((x) => x.id.startsWith('passo_') && x.s > su && x.s < giu)).toEqual([]);
    expect(o.sentiti.some((x) => x.id === 'passo_sabbia' && x.s > giu)).toBe(true);
    expect(o.sentiti.some((x) => x.id === 'fibbia' && x.s > giu)).toBe(true);
  });

  it('salto dal muro: salto, poi spinta sul muro con lo sforzo del pirata, poi atterraggio', () => {
    const t = terrenoPiatto();
    rettangolo(t, 600, SUOLO - 200, 900, SUOLO, MATERIALE.roccia);
    const s = battagliaPiatta([585], [1600], { terreno: t });
    inAzione(s);
    const o = new Orecchio(s).per(1, { 0: salta() }).finche(() => balzoPossibile(s) === 'muro', 60);
    o.tick([salta(true)]);
    o.finche(() => pirata(s).aTerra, 300);
    expect(o.ids).toEqual(['salto', 'salto_muro', 'atterra']);
    const muro = o.sentiti.find((x) => x.id === 'salto_muro')!;
    expect(o.sentiti.filter((x) => x.s === muro.s).map((x) => x.id)).toContain('vox_a_sforzo');
  });

  it('Balzo contro un muretto basso = scavalco: mani e stoffa con lo sforzo, nessun salto', () => {
    const t = terrenoPiatto();
    rettangolo(t, 600, SUOLO - 20, 900, SUOLO, MATERIALE.roccia);
    const s = battagliaPiatta([594], [1600], { terreno: t });
    inAzione(s);
    const o = new Orecchio(s).per(30, { 0: salta() });
    expect(o.ids).toEqual(['scavalco']);
    expect(o.sentiti.map((x) => x.id)).toContain('vox_a_sforzo');
  });
});

describe('Audio · scale e liane in un tocco con la sim vera', () => {
  function conScala(x0: number, piedi0 = SUOLO): StatoBattaglia {
    const t = terrenoPiatto();
    rettangolo(t, 900, SUOLO - 160, 1100, SUOLO, MATERIALE.roccia);
    const m = mappa(t, [{ x: x0, y: piedi0 }], [{ x: 1600, y: SUOLO }]);
    m.appigli = [{ tipo: 'scala', x: 888, yAlto: SUOLO - 160, yBasso: SUOLO }];
    return creaBattaglia(config(1, 1), m);
  }

  it('"sali" una volta: la mano afferra all\'inizio, si stacca in cima; una presa e uno stacco soli', () => {
    const s = conScala(888);
    inAzione(s);
    const o = new Orecchio(s).per(1, { 0: { t: 'arrampica', dir: -1 } }).finche(() => s.turno.arrampicata === 0 && pirata(s).aTerra, 400);
    o.per(10);
    expect(o.ids.filter((x) => x === 'presa' || x === 'stacco')).toEqual(['presa', 'stacco']);
    expect(o.quando('presa')[0]).toBeLessThan(0.05);
    // 160 px a 90 px/s: lo stacco arriva quando è davvero in cima
    expect(o.quando('stacco')[0]).toBeGreaterThan(1.5);
    expect(o.ids.filter((x) => x === 'atterra' || x === 'caduta_tonfo')).toEqual([]);
  });

  it.skipIf(!HA_PIOLO)('salendo, un colpetto di legno a ogni piolo: niente silenzio tra presa e stacco', () => {
    const s = conScala(888);
    inAzione(s);
    const o = new Orecchio(s).per(1, { 0: { t: 'arrampica', dir: -1 } }).finche(() => s.turno.arrampicata === 0 && pirata(s).aTerra, 400);
    const pioli = o.quando('piolo_legno');
    // 160 px di scala, un piolo ogni 20 px
    expect(pioli.length).toBeGreaterThanOrEqual(6);
    expect(pioli.length).toBeLessThanOrEqual(9);
    const tempi = [o.quando('presa')[0], ...pioli, o.quando('stacco')[0]];
    for (let i = 1; i < tempi.length; i++) expect(tempi[i] - tempi[i - 1], `buco dopo ${tempi[i - 1]} s`).toBeLessThan(0.4);
  });

  it('"scendi" una volta dalla cima: presa, discesa, stacco in fondo, e nessun tonfo di caduta', () => {
    const s = conScala(905, SUOLO - 160);
    inAzione(s);
    const o = new Orecchio(s).per(1, { 0: { t: 'arrampica', dir: 1 } }).finche(() => pirata(s).aTerra && pirata(s).appeso < 0, 400);
    o.per(10);
    expect(o.ids.filter((x) => x === 'presa' || x === 'stacco')).toEqual(['presa', 'stacco']);
    expect(o.ids).not.toContain('caduta_tonfo');
  });

  it('Balzo ai piedi della scala: la prende e sale in un tocco, con gli stessi suoni del tasto "sali"', () => {
    const s = conScala(888);
    inAzione(s);
    expect(balzoPossibile(s)).toBe('afferra');
    const o = new Orecchio(s).per(1, { 0: salta() }).finche(() => s.turno.arrampicata === 0 && pirata(s).appeso < 0, 400);
    expect(o.ids.filter((x) => x === 'presa' || x === 'stacco' || x === 'salto')).toEqual(['presa', 'stacco']);
  });

  it('liana presa al volo col Balzo e lasciata col Balzo: salto, presa, salto, atterraggio', () => {
    const m = mappa(terrenoPiatto(), [{ x: 800, y: SUOLO }], [{ x: 1600, y: SUOLO }]);
    m.appigli = [{ tipo: 'liana', x: 850, yAlto: SUOLO - 150, yBasso: SUOLO - 30 }];
    const s = creaBattaglia(config(1, 1), m);
    inAzione(s);
    const o = new Orecchio(s).per(1, { 0: salta() }).finche(() => balzoPossibile(s) === 'afferra', 100);
    o.tick([salta()]);
    o.per(30);
    expect(balzoPossibile(s)).toBe('stacca');
    o.tick([salta()]);
    o.finche(() => pirata(s).aTerra, 300);
    expect(o.ids).toEqual(['salto', 'presa', 'salto', 'atterra']);
  });
});


describe('Audio · battaglie intere sulla Cala v3, ogni tick passa dall\'audio', () => {
  // con i comandi a caso si aggiunge una scala o una liana sopra ogni punto di partenza (conAppigli del QA): così
  // le arrampicate ci sono sempre, qualunque cosa cambi nella fisica o nella mappa
  const partite: { nome: string; pilota: () => Pilota; seme: number; appigli: boolean }[] = [
    ...[1, 2, 3].map((seme) => ({ nome: 'comandi a caso con scale e liane', pilota: () => pilotaScalatore(seme * 7), seme, appigli: true })),
    ...[1, 2, 3].map((seme) => ({ nome: 'due IA', pilota: () => pilotaIa(), seme, appigli: false })),
  ];
  const visti: Record<string, number> = {};
  const sentitiDa: Record<string, number> = {};

  for (const { nome, pilota, seme, appigli } of partite) {
    it(`${nome}, seme ${seme}: ogni suono esiste, niente raffiche, voci distanziate, nessun ciclo acceso alla fine`, () => {
      const cfg = configCaso(seme, [3, 3], 'cala-pappagallo-v3');
      const s = nuovaBattaglia(cfg, appigli ? conAppigli(mappaPer(cfg)) : undefined);
      const p = pilota();
      const o = new Orecchio(s);
      const perSecondo = new Map<number, number>();
      let piuInUnFrame = 0;
      while (!s.esito && s.tick < TICK_MAX) {
        const prima = o.sentiti.length;
        const ev = o.tick(p(s));
        const nuovi = o.sentiti.slice(prima);
        for (const e of ev) visti[e.t] = (visti[e.t] ?? 0) + 1;
        for (const x of nuovi) { sentitiDa[x.id] = (sentitiDa[x.id] ?? 0) + 1; perSecondo.set(Math.floor(x.s), (perSecondo.get(Math.floor(x.s)) ?? 0) + 1); }
        piuInUnFrame = Math.max(piuInUnFrame, nuovi.length);
        // un frame con un evento che deve suonare non resta muto
        if (ev.some((e) => !(e.t in MUTI_PER_SCELTA))) expect(nuovi.length, `tick ${s.tick}: ${ev.map((e) => e.t)}`).toBeGreaterThan(0);
      }
      expect(s.esito).not.toBeNull();
      expect(o.sentiti.filter((x) => !(x.id in AUDIO))).toEqual([]);
      // botto a tre strati + voce + campana: un frame pieno resta sotto gli 8 suoni; in un secondo non si riempie la polifonia
      expect(piuInUnFrame).toBeLessThanOrEqual(8);
      expect(Math.max(...perSecondo.values())).toBeLessThanOrEqual(POLIFONIA_MAX);
      // le voci dei pirati: mai due nello stesso istante, e al più 2 al secondo (una importante può scavalcare l'attesa)
      const voci = o.sentiti.filter((x) => x.id.startsWith('vox_')).sort((a, b) => a.s - b.s);
      for (let i = 1; i < voci.length; i++) expect(voci[i].s).toBeGreaterThan(voci[i - 1].s);
      const vociAlSecondo = new Map<number, number>();
      for (const v of voci) vociAlSecondo.set(Math.floor(v.s), (vociAlSecondo.get(Math.floor(v.s)) ?? 0) + 1);
      expect(Math.max(0, ...vociAlSecondo.values())).toBeLessThanOrEqual(Math.ceil(2000 / VOCE_OGNI_MS) + 1);
      expect([...o.cicliAccesi]).toEqual([]);
    });
  }

  it('le battaglie hanno toccato davvero salti, scale, passi e botti (altrimenti i controlli sopra non dicono niente)', () => {
    for (const t of ['salto', 'atterrato', 'aggrappato', 'staccato', 'passo', 'esplosione', 'turnoIniziato', 'fine']) expect(visti[t] ?? 0, t).toBeGreaterThan(0);
    for (const id of ['salto', 'atterra', 'presa', 'stacco', 'piolo_legno', 'passo_sabbia', 'arma_cannone', 'esp_coda']) expect(sentitiDa[id] ?? 0, id).toBeGreaterThan(0);
  });

  it.skipIf(!HA_SCIVOLATA)('scivolata vera: ogni ciclo che parte si ferma (col suo evento o a turno nuovo)', () => {
    // il controllo "nessun ciclo acceso alla fine" sopra copre già le battaglie intere; qui si guarda che sia successo
    expect(visti.scivola ?? 0).toBeGreaterThan(0);
    expect(sentitiDa.scivola_ciclo ?? 0).toBeGreaterThan(0);
  });

  it.skipIf(!HA_CROLLI)('crolli veri: ogni pezzo staccato suona quando si stacca e quando arriva giù, ogni masso smette di rotolare', () => {
    // i controlli per frame (nessun evento muto, al più 8 suoni, nessun ciclo acceso alla fine) valgono già per i crolli
    expect(visti.crollo ?? 0).toBeGreaterThan(0);
    expect(Object.keys(sentitiDa).filter((x) => x.startsWith('crollo_')).length).toBeGreaterThan(0);
    expect(Object.keys(sentitiDa).some((x) => x.startsWith('macerie_') || x.startsWith('splash_'))).toBe(true);
  });

  it.skipIf(!HA_FUOCO)('fuoco vero: vampata e crepitio, spento col suo evento o a fine battaglia', () => {
    expect(visti.fuoco ?? 0).toBeGreaterThan(0);
    expect(sentitiDa.fuoco_accende ?? 0).toBeGreaterThan(0);
  });

  it.skipIf(!HA_BORDO)('salvataggio al bordo vero: la presa al bordo suona con lo sforzo', () => {
    expect(visti.bordo ?? 0).toBeGreaterThan(0);
    expect(sentitiDa.bordo ?? 0).toBeGreaterThan(0);
  });
});
