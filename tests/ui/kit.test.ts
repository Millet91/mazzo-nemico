// Kit UI dipinto (P2, Arte UI): ogni immagine elencata esiste in public/assets/ui/, ha le misure dichiarate
// ed è un webp; le fette stanno dentro l'immagine; c'è un'icona per ognuna delle 16 armi.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { ARMI } from '../../src/contenuti/armi';
import { ARMI_CON_ICONA, KIT, MOSSE_CON_ICONA, PEZZI_MONDO, idIconaArma, urlPremio, urlTipoPremio, type IdKit, type IdPezzoMondo } from '../../src/ui/kit/risorse';

const cartella = new URL('../../public/assets/ui/', import.meta.url);

/** larghezza e altezza di un webp (VP8, VP8L o VP8X) */
function misuraWebp(b: Buffer): [number, number] {
  expect(b.toString('ascii', 0, 4)).toBe('RIFF');
  expect(b.toString('ascii', 8, 12)).toBe('WEBP');
  const tipo = b.toString('ascii', 12, 16);
  if (tipo === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (tipo === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}

describe('kit UI dipinto', () => {
  for (const id of Object.keys(KIT) as IdKit[]) {
    it(`${id}: file, misure e fette`, () => {
      const url = new URL(`${id}.webp`, cartella);
      expect(existsSync(url)).toBe(true);
      const v = KIT[id];
      expect(misuraWebp(readFileSync(url))).toEqual([v.w, v.h]);
      if (v.slice) {
        const [a, d, b, s] = v.slice;
        expect(a + b).toBeLessThan(v.h);
        expect(s + d).toBeLessThan(v.w);
      }
    });
  }

  it('un\'icona da 128 px per ognuna delle 16 armi', () => {
    const tutte = ARMI.map((a) => a.id).sort();
    expect([...ARMI_CON_ICONA].sort()).toEqual(tutte);
    for (const a of ARMI_CON_ICONA) {
      const url = new URL(`${idIconaArma(a)}.webp`, cartella);
      expect(existsSync(url), a).toBe(true);
      expect(misuraWebp(readFileSync(url))).toEqual([128, 128]);
    }
  });

  it('pezzi del Tavolo del Timone: file, misure, ancora dentro l\'immagine', () => {
    for (const id of Object.keys(PEZZI_MONDO) as IdPezzoMondo[]) {
      const v = PEZZI_MONDO[id], url = new URL(`${id}.webp`, cartella);
      expect(existsSync(url), id).toBe(true);
      expect(misuraWebp(readFileSync(url))).toEqual([v.w, v.h]);
      expect(v.ancora[0]).toBeLessThanOrEqual(v.w);
      expect(v.ancora[1]).toBeLessThanOrEqual(v.h);
    }
  });

  it('icone dei premi: ogni tipo e ogni mossa ha il suo file da 128 px', () => {
    const urls = [
      ...MOSSE_CON_ICONA.map((m) => urlPremio({ t: 'mossa', mossa: m })),
      urlPremio({ t: 'recluta', nome: 'x', aspetto: 'y' }), urlPremio({ t: 'bandiera', id: 'z' }), urlPremio({ t: 'arma', arma: 'rampino' }),
      ...(['arma', 'mossa', 'recluta', 'bandiera'] as const).map(urlTipoPremio),
    ];
    for (const u of urls) {
      const f = new URL(u.replace('assets/ui/', ''), cartella);
      expect(existsSync(f), u).toBe(true);
      expect(misuraWebp(readFileSync(f))).toEqual([128, 128]);
    }
  });
});
