// Cala Pappagallo v3 (studio v2, P1-contratti §4): le regole in più della sagoma nuova, controllate sui dati che
// finiscono nel gioco. Percorribilità, scale e liane ed equità le provano già mappe-fatte e percorribilita.
import { describe, expect, it } from 'vitest';
import { BIL } from '../../src/contenuti/bilanciamento';
import { ARMA } from '../../src/contenuti/armi';
import { MAPPE_FATTE, mappaFatta } from '../../src/battaglia/mappe';
import { superficie } from '../../src/battaglia/gen/analisi';
import { spinto } from '../../src/battaglia/gen/spawn';
import { avanzaTick, balzoPossibile, creaBattaglia, eseguiComando } from '../../src/battaglia/sim';
import type { EventoBattaglia } from '../../src/core/tipi';
import { config } from '../sim/aiuti';
import { existsSync, readFileSync } from 'node:fs';
import { APPOGGI, BRICIOLA, TORRI_X, DISTANZA_CROLLO, costruisciMaschera, type Variante } from '../../scripts/mappe/cala-v3-forma';

const BASE = 'cala-pappagallo-v3', PROLOGO = 'cala-pappagallo-v3-prologo';
/** colpo diretto del cannone col +10% del Teschio: il caso peggiore (PIANO §7: danno 60) */
const spintaCannone = Math.floor(Math.max(ARMA.cannone.danno, 60) * (1 + BIL.tratti.teschioBonusDanno)) * BIL.fisica.spintaPerDanno;

describe('Cala Pappagallo v3', () => {
  for (const [id, variante] of [[BASE, 'base'], [PROLOGO, 'prologo']] as [string, Variante][]) {
    it(`${id}: i dati nel gioco sono quelli della forma disegnata`, () => {
      const m = mappaFatta(id)!.terreno.maschera, forma = costruisciMaschera(variante).m;
      let diversi = 0;
      for (let i = 0; i < m.length; i++) if (m[i] !== forma[i]) diversi++;
      // la mappa di battaglia spiana la base dei tre barili: qualche centinaio di pixel
      expect(diversi).toBeLessThanOrEqual(variante === 'base' ? 600 : 0);
    });

    it(`${id}: muretti e casse sono alti 24-32 px, larghi almeno 12, con aria sopra`, () => {
      const { w, maschera: m } = mappaFatta(id)!.terreno;
      const sup = superficie(m);
      for (const a of APPOGGI) {
        const largo = a.x1 - a.x0 + 1;
        const accanto = Math.min(sup[a.x0 - 3], sup[a.x1 + 3]);
        let cima = Infinity, fondo = -Infinity;
        for (let x = a.x0; x <= a.x1; x++) { cima = Math.min(cima, sup[x]); fondo = Math.max(fondo, sup[x]); }
        const dove = `${a.tipo} in x ${a.x0} (${a.dove})`;
        expect(largo, dove).toBeGreaterThanOrEqual(12);
        expect(accanto - cima, `${dove}: altezza`).toBeGreaterThanOrEqual(24);
        expect(accanto - cima, `${dove}: altezza`).toBeLessThanOrEqual(32);
        expect(fondo - cima, `${dove}: cima piana`).toBeLessThanOrEqual(2);
        // aria libera sopra, alta come un pirata, per lo scavalco (accordo con Fisica)
        for (let x = a.x0; x <= a.x1; x++) for (let y = cima - BIL.pirata.capsulaAltezza; y < cima; y++) expect(m[y * w + x], `${dove}: aria sopra`).toBe(0);
      }
    });

    it(`${id}: ogni muretto e cassa si supera davvero nei due versi, anche da sotto la tettoia della Duna`, () => {
      // con la sim vera: si parte a 40 px dal pezzo, sul suolo accanto (sotto un eventuale tetto) e si tiene la
      // freccia. Fino a 28 px basta lo scavalco automatico; sopra serve un Balzo, e uno solo.
      const base = mappaFatta(id)!;
      const { w, maschera } = base.terreno;
      const sup = superficie(maschera);
      for (const a of APPOGGI) for (const dir of [1, -1] as const) {
        const dove = `${a.tipo} in x ${a.x0} (${a.dove}) verso ${dir > 0 ? 'destra' : 'sinistra'}`;
        const x0 = dir === 1 ? a.x0 - 40 : a.x1 + 40;
        let y0 = (dir === 1 ? sup[a.x0 - 3] : sup[a.x1 + 3]) - 20;
        while (maschera[y0 * w + x0] === 0) y0++;
        const s = creaBattaglia(config(1, 1), { ...base, spawn: [[{ x: x0, y: y0 }], [{ x: 1024, y: 272 }]] });
        const ev: EventoBattaglia[] = [];
        while (s.turno.fase !== 'azione') avanzaTick(s, ev);
        const p = s.pirati[0];
        eseguiComando(s, { t: 'muovi', dir });
        let fermi = 0, balzi = 0, scavalchi = 0, ultimo = p.x, passato = false;
        for (let t = 0; t < 400 && !passato; t++) {
          const e: EventoBattaglia[] = [];
          avanzaTick(s, e);
          scavalchi += e.filter((x) => x.t === 'scavalco').length;
          fermi = Math.abs(p.x - ultimo) < 0.05 ? fermi + 1 : 0;
          ultimo = p.x;
          passato = p.aTerra && (dir === 1 ? p.x > a.x1 + 20 : p.x < a.x0 - 20);
          if (fermi > 10 && balzi < 3) {
            eseguiComando(s, { t: 'salta', indietro: balzoPossibile(s) === 'muro' });
            eseguiComando(s, { t: 'muovi', dir });
            balzi++; fermi = 0;
          }
        }
        expect(passato, dove).toBe(true);
        expect(p.stato, dove).toBe('vivo');
        if (a.alto <= BIL.movimento.scavalcoMax) expect([scavalchi >= 1, balzi], `${dove}: scavalco automatico`).toEqual([true, 0]);
        else expect(balzi, `${dove}: un Balzo`).toBe(1);
      }
    });

    it(`${id}: niente briciole sospese (ogni pezzo di solido staccato è grande almeno ${BRICIOLA} px)`, () => {
      const { w, h, maschera: m } = mappaFatta(id)!.terreno;
      const vis = new Uint8Array(w * h), pila: number[] = [], piccoli: string[] = [];
      for (let i = 0; i < w * h; i++) {
        if (!m[i] || vis[i]) continue;
        let n = 0; vis[i] = 1; pila.push(i);
        while (pila.length) {
          const j = pila.pop()!; n++;
          const x = j % w;
          for (const k of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w]) if (k >= 0 && k < w * h && m[k] && !vis[k]) { vis[k] = 1; pila.push(k); }
        }
        if (n < BRICIOLA) piccoli.push(`(${i % w}, ${Math.floor(i / w)}): ${n} px`);
      }
      expect(piccoli).toEqual([]);
    });

    it(`${id}: un colpo diretto del cannone non butta in mare chi parte`, () => {
      const mappa = mappaFatta(id)!;
      const { maschera: m, mare } = mappa.terreno;
      // nel Prologo contano i pirati del giocatore: i marinai stanno dove dice la scena
      const chi = MAPPE_FATTE[id].copione ? mappa.spawn[0] : [...mappa.spawn[0], ...mappa.spawn[1]];
      for (const p of chi) for (const dir of [-1, 1] as const) {
        expect(spinto(m, mare, p, spintaCannone, 90, dir).tipo, `da (${p.x}, ${p.y}) verso ${dir}`).toBe('terra');
      }
    });

    it(`${id}: nessuna partenza a meno di ${DISTANZA_CROLLO} px da una torre che crollerà`, () => {
      const mappa = mappaFatta(id)!;
      const chi = MAPPE_FATTE[id].copione ? [] : [...mappa.spawn[0], ...mappa.spawn[1]];
      for (const p of chi) for (const [x0, x1] of TORRI_X[variante]) {
        expect(p.x < x0 - DISTANZA_CROLLO || p.x > x1 + DISTANZA_CROLLO, `spawn in x ${p.x}, torre ${x0}-${x1}`).toBe(true);
      }
    });
  }

  it('la mappa di battaglia non è uno specchio: tre appigli per lato, a destra due liane', () => {
    const ap = mappaFatta(BASE)!.appigli!;
    const sx = ap.filter((a) => a.x < 1024), dx = ap.filter((a) => a.x >= 1024);
    expect(sx.map((a) => a.tipo).sort()).toEqual(['liana', 'scala', 'scala']);
    expect(dx.map((a) => a.tipo).sort()).toEqual(['liana', 'liana', 'scala']);
  });

  it('terreno HD (Fase 2): tessere nel formato concordato con Render, il Prologo solo quelle che cambiano', () => {
    const cartella = 'public/assets/mappe/cala-pappagallo-v3';
    const hd = JSON.parse(readFileSync(`${cartella}/hd/indice.json`, 'utf8'));
    expect({ ...hd, tessere: undefined }).toEqual({ scala: 2, lato: 512, bordo: 2, colonne: 8, righe: 4, tessere: undefined });
    expect(hd.tessere.length).toBeGreaterThan(0);
    for (const n of hd.tessere) {
      const [c, r] = n.slice(2).split('-').map(Number);
      expect(n).toBe(`t-${c}-${r}`);
      expect(c >= 0 && c < 8 && r >= 0 && r < 4, n).toBe(true);
      expect(existsSync(`${cartella}/hd/${n}.webp`), n).toBe(true);
    }
    const pr = JSON.parse(readFileSync(`${cartella}/hd-prologo/indice.json`, 'utf8'));
    expect(pr.base).toBe('hd');
    expect(pr.tessere.length).toBeLessThan(hd.tessere.length);
    for (const n of pr.tessere) expect(existsSync(`${cartella}/hd-prologo/${n}.webp`), n).toBe(true);
  });

  it('Prologo: i marinai stanno ad almeno 300 px dai pirati del giocatore', () => {
    const [noi, loro] = mappaFatta(PROLOGO)!.spawn;
    expect(noi).toHaveLength(2);
    for (const p of noi) for (const n of loro) expect(Math.hypot(n.x - p.x, n.y - p.y)).toBeGreaterThanOrEqual(300);
  });

  it('Prologo: le stazioni del percorso stanno sul suolo', () => {
    const { w, maschera: m } = mappaFatta(PROLOGO)!.terreno;
    const s = MAPPE_FATTE[PROLOGO].segnaposti!;
    for (const nome of ['muretto', 'oltreMuretto', 'cassa', 'torre', 'ponte', 'liana', 'rocca', 'grotta']) {
      const p = s[nome];
      expect(p, nome).toBeDefined();
      expect(m[p.y * w + p.x], `${nome}: sotto i piedi`).not.toBe(0);
      expect(m[(p.y - 1) * w + p.x], `${nome}: sopra`).toBe(0);
    }
  });
});
