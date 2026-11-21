// File di stringhe (00 §1.5): ogni testo esiste, non è vuoto e non porta nomi aboliti.
import { describe, it, expect } from 'vitest';
import { it as testi } from '../../src/testi/it';

function foglie(o: unknown, percorso = ''): [string, unknown][] {
  if (o && typeof o === 'object') return Object.entries(o).flatMap(([k, v]) => foglie(v, percorso ? `${percorso}.${k}` : k));
  return [[percorso, o]];
}
const tutte = foglie(testi);

describe('Testi italiani', () => {
  it('il titolo è quello deciso (00 §9)', () => {
    expect(testi.gioco.titolo).toBe('Kaboom Ahoy!');
    expect(testi.gioco.sottotitolo).toBe('Isole Spezzate');
  });

  it('nessuna stringa vuota o con spazi ai bordi', () => {
    const male = tutte.filter(([, v]) => typeof v === 'string' && (v.trim() === '' || v !== v.trim())).map(([k]) => k);
    expect(male).toEqual([]);
  });

  it('le funzioni producono testo', () => {
    expect(testi.info.tocchiMancanti(1)).toBe('Ancora 1 tocco');
    expect(testi.info.tocchiMancanti(3)).toBe('Ancora 3 tocchi');
    expect(testi.fps.etichetta(60, 52)).toBe('60 fps · min 52');
  });

  it('nessun nome del vecchio gioco o abolito', () => {
    const vietati = /\b(Baro|molotov|kamikaze|Nostromo Gancio)\b/i;
    const testo = tutte.filter(([, v]) => typeof v === 'string').map(([, v]) => v as string).join('\n');
    expect(testo).not.toMatch(vietati);
  });
});
