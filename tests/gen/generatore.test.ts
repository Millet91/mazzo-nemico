// Test del generatore di mappe (agente C, M1). Piano QA L1: determinismo, spawn equi e sicuri, ferro ≤ 3%,
// seme di riserva dopo 8 fallimenti, validazione su 200 semi, tempo di generazione.
import { describe, it, expect, vi } from 'vitest';
import { generaMappa } from '../../src/battaglia/gen';
import { tentativo } from '../../src/battaglia/gen/index';
import { conTentativi } from '../../src/battaglia/gen/tentativi';
import { riempimento, validaMappa } from '../../src/battaglia/gen/valida';
import { superficie } from '../../src/battaglia/gen/analisi';
import { zona } from '../../src/battaglia/gen/spawn';
import { ISOLA, REGOLE, SEME_RISERVA } from '../../src/battaglia/gen/parametri';
import { misuraMare } from '../../src/battaglia/gen/misura';
import { BIL } from '../../src/contenuti/bilanciamento';
import { MATERIALE, type MappaGenerata, type RichiestaMappa } from '../../src/core/tipi';
import { impronta } from './impronta';

// 200 mappe e il validatore completo: in parallelo con il resto della suite servono più dei 5 s standard.
vi.setConfig({ testTimeout: 60_000 });

const W = BIL.mondo.larghezza;
const richiesta = (seme: number): RichiestaMappa => ({ seme, bioma: 'isola', piratiPerLato: [3, 3] });

/** 200 semi sparsi, generati una volta sola per tutti i test. */
const SEMI = Array.from({ length: 200 }, (_, i) => (i * 7919 + 13) >>> 0);
const MAPPE: MappaGenerata[] = [];
const TEMPI: number[] = [];
for (const s of SEMI) {
  const t0 = performance.now();
  MAPPE.push(generaMappa(richiesta(s)));
  TEMPI.push(performance.now() - t0);
}

describe('Generatore · determinismo', () => {
  it('stesso seme ⇒ stessa mappa, byte per byte', () => {
    for (const s of [0, 7, 123456, 4294967295]) {
      const a = generaMappa(richiesta(s)), b = generaMappa(richiesta(s));
      expect(Buffer.from(a.terreno.maschera).equals(Buffer.from(b.terreno.maschera))).toBe(true);
      expect({ ...a, terreno: null }).toEqual({ ...b, terreno: null });
    }
  });

  // Impronte d'oro: se cambiano per una modifica voluta del generatore, si aggiornano in un commit a parte
  // (piano QA). Se cambiano senza motivo, il generatore non è più deterministico.
  it('impronte d\'oro dei semi 7, 42, 1234', () => {
    expect([7, 42, 1234].map((s) => impronta(generaMappa(richiesta(s))))).toEqual(['37c6b525', 'f2860524', 'd059e1a3']);
  });

  it('semi diversi ⇒ mappe diverse', () => {
    const imp = new Set(MAPPE.slice(0, 50).map(impronta));
    expect(imp.size).toBe(50);
  });
});

describe('Generatore · validazione su 200 semi', () => {
  it('ogni mappa passa il validatore completo (06 §0, §4, §7 con mare a 950)', () => {
    const errori = MAPPE.map((m, i) => ({ seme: SEMI[i], e: validaMappa(m) })).filter((x) => x.e.length);
    expect(errori).toEqual([]);
  });

  it('quasi sempre basta il primo tentativo, mai il seme di riserva', () => {
    const tentativi = MAPPE.map((m) => m.tentativi);
    expect(tentativi.every((t) => t >= 1 && t <= REGOLE.tentativi)).toBe(true);
    expect(tentativi.filter((t) => t === 1).length).toBeGreaterThanOrEqual(120);
    expect(tentativi.filter((t) => t <= 3).length).toBeGreaterThanOrEqual(190);
    for (const [i, m] of MAPPE.entries()) expect(m.semeUsato).toBe(SEMI[i] + m.tentativi - 1);
  });

  it('solido tra il 20% (Isola, Lead design) e il 50%, ferro ≤ 3% del solido, cima mai sopra y 250', () => {
    for (const m of MAPPE) {
      const r = riempimento(m.terreno.maschera, m.terreno.mare);
      expect(r.frazione).toBeGreaterThanOrEqual(REGOLE.solidoMin);
      expect(REGOLE.solidoMin).toBe(0.2);
      const sup = superficie(m.terreno.maschera);
      expect(Math.min(...sup)).toBeGreaterThanOrEqual(ISOLA.cimaMinY);
      expect(r.frazione).toBeLessThanOrEqual(0.5);
      expect(r.frazioneFerro).toBeLessThanOrEqual(0.03);
    }
  });

  it('fasce del mondo: cielo libero, fondale di ferro, bordi di acqua aperta, mare a 950', () => {
    const { altezza: H, fineCielo, inizioFondale, mareIniziale } = BIL.mondo;
    for (const m of MAPPE.slice(0, 40)) {
      const k = m.terreno.maschera;
      expect([m.terreno.w, m.terreno.h, m.terreno.mare]).toEqual([W, H, mareIniziale]);
      expect(k.subarray(0, fineCielo * W).every((v) => v === MATERIALE.aria)).toBe(true);
      expect(k.subarray(inizioFondale * W).every((v) => v === MATERIALE.ferro)).toBe(true);
      for (let y = 0; y < inizioFondale; y += 7) {
        for (const x of [0, 63, W - 64, W - 1]) expect(k[y * W + x]).toBe(MATERIALE.aria);
      }
    }
  });

  it('l\'isola usa solo sabbia, terra e roccia (più il fondale)', () => {
    const ammessi = new Set<number>([MATERIALE.aria, MATERIALE.sabbia, MATERIALE.terra, MATERIALE.roccia]);
    for (const m of MAPPE.slice(0, 20)) {
      const k = m.terreno.maschera.subarray(0, BIL.mondo.inizioFondale * W);
      expect(k.every((v) => ammessi.has(v))).toBe(true);
    }
  });

  it('specchio orizzontale circa una volta su due', () => {
    const n = MAPPE.filter((m) => m.specchiata).length;
    expect(n).toBeGreaterThan(70);
    expect(n).toBeLessThan(130);
  });
});

describe('Generatore · spawn', () => {
  it('5 posti per lato, nella zona giusta (Isola: 10-42% dal proprio lato, secondo lo specchio)', () => {
    for (const m of MAPPE) {
      expect(m.spawn[0]).toHaveLength(5);
      expect(m.spawn[1]).toHaveLength(5);
      for (const lato of [0, 1] as const) {
        const aDestra = (lato === 0) === m.specchiata;
        const [da, a] = zona(aDestra);
        for (const p of m.spawn[lato]) {
          expect(p.x).toBeGreaterThanOrEqual(da);
          expect(p.x).toBeLessThanOrEqual(a);
        }
      }
    }
  });

  it('nessun pirata nasce dentro il solido, sospeso o in acqua', () => {
    const cap = BIL.pirata;
    const problemi: string[] = [];
    for (const m of MAPPE) {
      const k = m.terreno.maschera;
      for (const p of [...m.spawn[0], ...m.spawn[1]]) {
        const dove = `seme ${m.semeUsato} (${p.x}, ${p.y})`;
        if (!Number.isInteger(p.x) || !Number.isInteger(p.y)) problemi.push(`${dove}: coordinate non intere`);
        if (p.y > m.terreno.mare - REGOLE.sopraMare) problemi.push(`${dove}: troppo vicino al mare`);
        // capsula 12×22 sopra i piedi tutta in aria
        for (let y = p.y - cap.capsulaAltezza; y < p.y; y++) {
          for (let x = p.x - cap.capsulaLarghezza / 2; x <= p.x + cap.capsulaLarghezza / 2; x++) {
            if (k[y * W + x] !== MATERIALE.aria) problemi.push(`${dove}: solido nella capsula in (${x}, ${y})`);
          }
        }
        // terreno subito sotto i piedi (almeno una colonna della capsula appoggia)
        let appoggia = false;
        for (let x = p.x - cap.capsulaLarghezza / 2; x <= p.x + cap.capsulaLarghezza / 2; x++) if (k[p.y * W + x] !== MATERIALE.aria) appoggia = true;
        if (!appoggia) problemi.push(`${dove}: sospeso`);
      }
    }
    expect(problemi).toEqual([]);
  });

  it('ordine dei posti: dal più interno al più esterno (la sim usa i primi N)', () => {
    for (const m of MAPPE) {
      for (const lato of m.spawn) {
        const d = lato.map((p) => Math.abs(p.x - W / 2));
        expect(d).toEqual(d.slice().sort((a, b) => a - b));
      }
    }
  });

  it('distanze: ≥ 60 px tra compagni e ≥ 150 px dai nemici', () => {
    const d = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    for (const m of MAPPE) {
      for (const lato of [0, 1] as const) {
        const mio = m.spawn[lato], loro = m.spawn[1 - lato];
        for (let i = 0; i < mio.length; i++) {
          for (let j = i + 1; j < mio.length; j++) expect(d(mio[i], mio[j])).toBeGreaterThanOrEqual(60);
          for (const n of loro) expect(d(mio[i], n)).toBeGreaterThanOrEqual(150);
        }
      }
    }
  });

  it('equità: quota media degli spawn entro 64 px tra i lati', () => {
    for (const m of MAPPE) {
      const q = m.spawn.map((l) => l.reduce((s, p) => s + p.y, 0) / l.length);
      expect(Math.abs(q[0] - q[1])).toBeLessThanOrEqual(64);
    }
  });

  it('il validatore scarta uno spawn spostato dentro il terreno o sul pendio', () => {
    const m = MAPPE[0];
    const rotta: MappaGenerata = { ...m, spawn: [m.spawn[0].map((p, i) => (i === 0 ? { x: p.x, y: p.y + 30 } : p)), m.spawn[1]] };
    expect(validaMappa(rotta).length).toBeGreaterThan(0);
    const fuori: MappaGenerata = { ...m, spawn: [m.spawn[0], m.spawn[1].map((p, i) => (i === 0 ? { x: W / 2, y: p.y } : p))] };
    expect(validaMappa(fuori).length).toBeGreaterThan(0);
  });
});

describe('Generatore · tentativi e seme di riserva', () => {
  it('il seme di riserva dell\'isola è valido al primo colpo', () => {
    const m = tentativo(SEME_RISERVA.isola, richiesta(SEME_RISERVA.isola));
    expect(m).not.toBeNull();
    expect(validaMappa(m!)).toEqual([]);
  });

  it('dopo 8 fallimenti si usa il seme di riserva (tentativi = 0)', () => {
    const provati: number[] = [];
    const m = conTentativi(richiesta(500), (seme) => {
      provati.push(seme);
      return seme === SEME_RISERVA.isola ? tentativo(seme, richiesta(seme)) : null;
    });
    expect(provati).toEqual([500, 501, 502, 503, 504, 505, 506, 507, SEME_RISERVA.isola]);
    expect(m.tentativi).toBe(0);
    expect(m.semeUsato).toBe(SEME_RISERVA.isola);
    expect(validaMappa(m)).toEqual([]);
  });

  it('al terzo tentativo riuscito: semeUsato = seme + 2, tentativi = 3', () => {
    const m = conTentativi(richiesta(10), (seme) => (seme === 12 ? tentativo(seme, richiesta(seme)) : null));
    expect([m.semeUsato, m.tentativi]).toEqual([12, 3]);
  });
});

describe('Generatore · decorazioni e altri campi', () => {
  it('decorazioni sulla superficie e lontane dagli spawn (06 §7.7)', () => {
    for (const m of MAPPE.slice(0, 50)) {
      const sup = superficie(m.terreno.maschera);
      expect(m.decorazioni.length).toBeGreaterThan(0);
      for (const d of m.decorazioni) {
        expect(['palma', 'masso', 'rovina', 'cespuglio']).toContain(d.tipo);
        expect(d.y).toBe(sup[d.x]);
        for (const p of [...m.spawn[0], ...m.spawn[1]]) expect(Math.abs(p.x - d.x)).toBeGreaterThanOrEqual(REGOLE.decorazioniLontanoDaSpawn);
      }
    }
  });

  it('bioma e variante passano invariati (in M1 tutti i biomi usano il terreno dell\'isola)', () => {
    const m = generaMappa({ seme: 3, bioma: 'grotta', variante: 'oro', piratiPerLato: [5, 5] });
    expect([m.bioma, m.variante]).toEqual(['grotta', 'oro']);
    expect(validaMappa(m)).toEqual([]);
  });
});

describe('Generatore · costa aperta (misura di prova del Lead design)', () => {
  it('nessuno spawn va in mare con un cannone diretto; sciabola e due cannonate sì, nei limiti attesi', () => {
    const r = misuraMare(MAPPE);
    const pc = (a: number, b: number) => (100 * a) / b;
    console.log(`costa: sciabola in mare ${pc(r.sciabolaInMare, r.spawn).toFixed(1)}% (esterni ${pc(r.sciabolaInMareEsterni, r.esterni).toFixed(1)}%), ` +
      `due cannonate ${pc(r.dueCannonateInMare, r.spawn).toFixed(1)}% (esterni ${pc(r.dueCannonateInMareEsterni, r.esterni).toFixed(1)}%), ` +
      `distanza dal mare dopo un cannone ${r.distanzaDopoCannone.toFixed(0)} px`);
    expect(r.spawn).toBe(2000);
    expect(r.cannoneInMare).toBe(0); // 06 §7.2
    expect(pc(r.sciabolaInMare, r.spawn)).toBeGreaterThanOrEqual(30);
    expect(pc(r.sciabolaInMare, r.spawn)).toBeLessThanOrEqual(60);
    expect(pc(r.dueCannonateInMare, r.spawn)).toBeGreaterThan(10);
  });

  it('con 3 pirati (M1) il più esterno non è condannato: sciabola < 70%, due cannonate > 25%', () => {
    const r = misuraMare(MAPPE, 3);
    const pc = (a: number, b: number) => (100 * a) / b;
    console.log(`costa 3v3: sciabola esterni ${pc(r.sciabolaInMareEsterni, r.esterni).toFixed(1)}%, due cannonate esterni ${pc(r.dueCannonateInMareEsterni, r.esterni).toFixed(1)}%`);
    expect(r.cannoneInMare).toBe(0);
    expect(pc(r.sciabolaInMareEsterni, r.esterni)).toBeLessThan(70);
    expect(pc(r.dueCannonateInMareEsterni, r.esterni)).toBeGreaterThan(25);
  });
});

describe('Generatore · tempo', () => {
  // Il limite vero è 150 ms sul Pixel 6 (contratto §4C): si misura sul telefono con la diagnostica.
  // Qui, su un PC, si controlla che la media resti sotto 60 ms e il caso peggiore sotto 300 ms.
  it('tempo di generazione', () => {
    const ord = TEMPI.slice(5).sort((a, b) => a - b); // i primi giri scaldano il JIT
    const media = ord.reduce((s, t) => s + t, 0) / ord.length;
    console.log(`generaMappa: media ${media.toFixed(1)} ms, p95 ${ord[Math.floor(ord.length * 0.95)].toFixed(1)} ms, max ${ord[ord.length - 1].toFixed(1)} ms`);
    expect(media).toBeLessThan(60);
    expect(ord[ord.length - 1]).toBeLessThan(300);
  });
});
