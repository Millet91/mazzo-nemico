import { describe, expect, it } from 'vitest';
import { CARTE, MAZZO_INIZIALE, NEMICI, TRUCCHI } from '../src/game/carte';
import { FILA, Nemico, Stato, anteprima, fineTurno, gioca, nonGiocabile, nuovaPartita, scegli } from '../src/game/regole';

const ultimo = <T,>(a: T[]) => a[a.length - 1];
const fine = (s: Stato) => ultimo(fineTurno(s)).stato;
const carta = (s: Stato, id: string) => s.inMano.find((c) => c.id === id)!;
function metti(s: Stato, i: number, id: Nemico['id'], forza = NEMICI[id].forza): Nemico {
  const n: Nemico = { uid: 900 + i, id, forza };
  s.fila[i] = n;
  return n;
}
function vuota(seed = 1): Stato {
  const s = nuovaPartita(seed);
  s.fila = Array(FILA).fill(null);
  return s;
}

describe('partita nuova', () => {
  it('parte con 15 Vite, 3 fiche, 5 carte e uno Scagnozzo in fondo alla fila', () => {
    const s = nuovaPartita(42);
    expect(s.vite).toBe(15);
    expect(s.fiche).toBe(3);
    expect(s.inMano.map((c) => c.id)).toEqual(['colpo', 'ruba', 'colpo', 'spingi', 'colpo']);
    expect(s.fila[FILA - 1]?.id).toBe('scagnozzo');
    expect(s.inMano.length + s.pesca.length).toBe(MAZZO_INIZIALE.length);
  });
  it('il primo turno insegna: Colpo (4→2) e poi Ruba con le 3 fiche', () => {
    let s = nuovaPartita(1);
    const n = s.fila[FILA - 1]!;
    s = gioca(s, carta(s, 'colpo').uid, n.uid).stato;
    expect(s.fila[FILA - 1]!.forza).toBe(2);
    const p = gioca(s, carta(s, 'ruba').uid, n.uid);
    expect(p.stato.fila[FILA - 1]).toBeNull();
    expect(p.stato.inMano.some((c) => c.id === 'coltello')).toBe(true);
    expect(p.stato.fiche).toBe(0);
    expect(p.eventi[0]).toMatchObject({ t: 'rubato', id: 'scagnozzo', carta: 'coltello' });
  });
});

describe('risposte diverse dal danno', () => {
  it('lo Spettro è immune ai danni ma si ruba sempre', () => {
    const s = vuota();
    const sp = metti(s, 2, 'spettro', 5);
    expect(nonGiocabile(s, carta(s, 'colpo').uid, sp.uid)).toMatch(/non lo toccano/);
    expect(nonGiocabile(s, carta(s, 'ruba').uid, sp.uid)).toBeNull();
  });
  it('il Corazzato prende al massimo 1 danno a colpo', () => {
    const s = vuota();
    const c = metti(s, 1, 'corazzato');
    const d = gioca(s, carta(s, 'colpo').uid, c.uid).stato;
    expect(d.fila[1]!.forza).toBe(NEMICI.corazzato.forza - 1);
  });
  it('il Capobanda impedisce di rubare gli altri', () => {
    const s = vuota();
    const a = metti(s, 1, 'scagnozzo', 2);
    metti(s, 3, 'capobanda');
    expect(nonGiocabile(s, carta(s, 'ruba').uid, a.uid)).toMatch(/Capobanda/);
  });
  it('il Barile che muore ferisce i vicini, e se esce fa 5 danni', () => {
    const s = vuota();
    metti(s, 1, 'bruto', 9);
    const b = metti(s, 2, 'barile');
    metti(s, 3, 'scagnozzo', 4);
    const d = gioca(s, carta(s, 'colpo').uid, b.uid).stato;
    expect(d.fila[1]!.forza).toBe(6);
    expect(d.fila[3]!.forza).toBe(1);
    const s2 = vuota();
    metti(s2, 0, 'barile');
    expect(anteprima(s2).danno).toBe(5);
  });
  it('Spingi cambia l’ordine: scambia con chi sta dietro', () => {
    const s = vuota();
    const a = metti(s, 0, 'bruto');
    const b = metti(s, 1, 'scagnozzo');
    const d = gioca(s, carta(s, 'spingi').uid, a.uid).stato;
    expect(d.fila[0]!.uid).toBe(b.uid);
    expect(d.fila[1]!.uid).toBe(a.uid);
  });
  it('l’Oste dà +1 Forza ai vicini a fine turno', () => {
    const s = vuota();
    s.mazzoN = [];
    metti(s, 2, 'scagnozzo', 4);
    metti(s, 3, 'oste');
    const d = fine(s);
    expect(d.fila[1]!.forza).toBe(5);
  });
});

describe('fine turno', () => {
  it('chi esce dalla fila toglie Vite pari alla Forza, e l’anteprima lo dice prima', () => {
    const s = vuota();
    metti(s, 0, 'bruto', 9);
    expect(anteprima(s).danno).toBe(9);
    const d = fine(s);
    expect(d.vite).toBe(15 - 9);
  });
  it('il Lesto avanza di 2', () => {
    const s = vuota();
    s.mazzoN = ['scagnozzo'];
    metti(s, 3, 'lesto');
    const d = fine(s);
    expect(d.fila[1]?.id).toBe('lesto');
  });
  it('si perde a 0 Vite', () => {
    const s = vuota();
    s.vite = 3;
    metti(s, 0, 'scagnozzo', 4);
    expect(fine(s).fase).toBe('perso');
  });
  it('a fila e mazzo vuoti si sceglie un premio, poi il Mazziere si rinforza', () => {
    const s = vuota();
    s.mazzoN = [];
    const n = metti(s, 4, 'scagnozzo', 2);
    let d = gioca(s, carta(s, 'colpo').uid, n.uid).stato;
    expect(d.fase).toBe('premio');
    expect(d.offerta).toHaveLength(3);
    expect(d.annuncio.length).toBeGreaterThan(0);
    d = scegli(d, d.offerta[0]);
    expect(d.mano).toBe(2);
    expect(d.mazzoN.length + d.fila.filter(Boolean).length).toBe(12);
  });
});

describe('contenuti', () => {
  it('ogni nemico (tranne il Mazziere) diventa una carta se rubato', () => {
    for (const n of Object.values(NEMICI)) if (n.id !== 'mazziere') expect(CARTE[n.tua!]).toBeDefined();
  });
  it('12 trucchi da scegliere, tutti diversi', () => {
    expect(new Set(TRUCCHI).size).toBe(12);
  });
});
