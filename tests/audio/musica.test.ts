// Musica segnaposto: le note dei due brani (funzioni pure) e il sequencer.
import { describe, it, expect } from 'vitest';
import { BRANI, MOTIVO, MOTIVO_MAGGIORE, Musica, RE_DORICO, type Nota } from '../../src/audio/musica';
import { hz, suonaNota, type Strumento } from '../../src/audio/strumenti';
import { contestoFinto } from './finto';

const PERCUSSIONI: Strumento[] = ['cassa', 'rullante', 'mani', 'sonaglio', 'tamburo'];
const intonate = (note: Nota[]) => note.filter((n) => !PERCUSSIONI.includes(n.s));

describe('Musica segnaposto · le note', () => {
  it('tutti e due i brani stanno in re dorico (re mi fa sol la si do), per 8 giri di fila', () => {
    for (const brano of Object.values(BRANI)) {
      for (let giro = 0; giro < 8; giro++) {
        const fuori = intonate(brano.note(giro)).filter((n) => !RE_DORICO.includes(((n.m % 12) + 12) % 12));
        expect(fuori).toEqual([]);
      }
    }
  });

  it('le note sono in ordine, dentro il giro di 8 battute, con volumi sensati', () => {
    for (const brano of Object.values(BRANI)) {
      expect(brano.battiti).toBe(32);
      for (let giro = 0; giro < 4; giro++) {
        const note = brano.note(giro);
        expect(note.length).toBeGreaterThan(40);
        for (let i = 1; i < note.length; i++) expect(note[i].b).toBeGreaterThanOrEqual(note[i - 1].b);
        expect(note.every((n) => n.b >= 0 && n.b < 32 && n.v > 0 && n.v <= 1)).toBe(true);
      }
    }
  });

  it('il basso non scende sotto i 60 Hz (il telefono non li riproduce)', () => {
    for (const brano of Object.values(BRANI)) {
      const bassi = brano.note(1).filter((n) => n.s === 'basso');
      expect(bassi.length).toBeGreaterThanOrEqual(8);
      expect(Math.min(...bassi.map((n) => hz(n.m)))).toBeGreaterThan(60);
    }
  });

  it('battaglia: la base ha basso, pizzicato e fisarmonica; lo strato 1 è solo percussioni', () => {
    const note = BRANI.battaglia.note(1);
    const base = note.filter((n) => n.strato === 0), strato1 = note.filter((n) => n.strato === 1);
    expect(new Set(base.map((n) => n.s))).toEqual(new Set(['basso', 'pizzico', 'fisa']));
    expect(strato1.length).toBeGreaterThan(60);
    expect(strato1.every((n) => PERCUSSIONI.includes(n.s))).toBe(true);
    // ogni battuta comincia con il basso
    for (let b = 0; b < 32; b += 4) expect(base.some((n) => n.s === 'basso' && n.b === b)).toBe(true);
  });

  it('battaglia: al primo giro la melodia entra a metà; poi cambia da un giro all\'altro', () => {
    const melodia = (giro: number) => BRANI.battaglia.note(giro).filter((n) => n.s === 'fisa');
    expect(Math.min(...melodia(0).map((n) => n.b))).toBeGreaterThanOrEqual(16);
    const firme = new Set(Array.from({ length: 8 }, (_, g) => melodia(g).map((n) => `${n.b}:${n.m}`).join(' ')));
    expect(firme.size).toBeGreaterThanOrEqual(4);
    // ma lo stesso giro è sempre uguale (niente Math.random)
    expect(BRANI.battaglia.note(3)).toEqual(BRANI.battaglia.note(3));
  });

  it('menu: apre col motivo di 5 note (la re mi fa re), da solo', () => {
    const note = BRANI.menu.note(0);
    expect(note.filter((n) => n.s === 'fisa').slice(0, 5).map((n) => n.m)).toEqual([...MOTIVO]);
    expect(note.filter((n) => n.s === 'pizzico' && n.b < 8)).toEqual([]);
    expect(BRANI.menu.bpm).toBeLessThan(BRANI.battaglia.bpm);
  });

  it('il motivo in maggiore (vittoria) cambia solo il fa in fa diesis', () => {
    expect(MOTIVO_MAGGIORE.map((m, i) => m - MOTIVO[i])).toEqual([0, 0, 0, 1, 0]);
  });
});

describe('Musica segnaposto · sequencer', () => {
  const crea = () => {
    const f = contestoFinto(48000);
    return { f, m: new Musica(f.ctx, {} as AudioNode) };
  };
  const partenze = (f: ReturnType<typeof contestoFinto>) => f.nodi.flatMap((n) => n.partenze);

  it('programma solo le note prima dell\'orizzonte, e non le ripete', () => {
    const { f, m } = crea();
    m.avvia('battaglia');
    m.programma(1);
    const prime = partenze(f).length;
    expect(prime).toBeGreaterThan(0);
    expect(Math.max(...partenze(f))).toBeLessThan(1);
    m.programma(1);
    expect(partenze(f).length).toBe(prime);
    m.programma(3);
    expect(partenze(f).length).toBeGreaterThan(prime);
    expect(f.errori).toEqual([]);
  });

  it('gira in tondo: dopo le 8 battute ricomincia col giro successivo', () => {
    const { f, m } = crea();
    m.avvia('battaglia');
    const giro = (32 * 60) / BRANI.battaglia.bpm;
    m.programma(giro * 2.5);
    expect(Math.max(...partenze(f))).toBeGreaterThan(giro * 2);
    expect(f.errori).toEqual([]);
  });

  it('le percussioni suonano solo a strato acceso, dalla battuta successiva e per il numero di battute chiesto', () => {
    const conta = (accendi: (m: Musica) => void) => {
      const { f, m } = crea();
      m.avvia('battaglia');
      accendi(m);
      m.programma(30);
      return f.nodi.length;
    };
    const spento = conta(() => {});
    const ottoBattute = conta((m) => m.accendiStrato(8));
    const sempre = conta((m) => m.accendiStrato());
    expect(ottoBattute).toBeGreaterThan(spento);
    expect(sempre).toBeGreaterThan(ottoBattute);
  });

  it('avviare il brano già in corso non lo fa ripartire; fermarlo lo spegne', () => {
    const { f, m } = crea();
    m.avvia('menu');
    m.programma(2);
    const n = f.nodi.length;
    m.avvia('menu');
    m.programma(2);
    expect(f.nodi.length).toBe(n);
    expect(m.inCorso).toBe('menu');
    m.ferma(0.3);
    expect(m.inCorso).toBeNull();
    m.programma(10);
    expect(f.nodi.length).toBe(n);
  });

  it('una nota rimasta indietro si salta invece di suonare in ritardo', () => {
    const { f, m } = crea();
    m.avvia('battaglia');
    f.avanza(5);
    m.programma(5.4);
    expect(Math.min(...partenze(f))).toBeGreaterThanOrEqual(4.95);
  });

  it('ogni strumento suona senza errori', () => {
    const f = contestoFinto(48000);
    for (const s of ['basso', 'pizzico', 'fisa', ...PERCUSSIONI] as Strumento[]) suonaNota(f.ctx, {} as AudioNode, s, 62, 1, 0.5, 0.5, { cala: 200 });
    expect(f.errori).toEqual([]);
    expect(f.nodi.length).toBeGreaterThan(20);
  });
});

describe('Note pronte (la musica non sintetizza dal vivo)', () => {
  it('copre ogni nota che i brani possono chiedere, anche ai giri lontani', async () => {
    const { chiaveNota, noteNecessarie } = await import('../../src/audio/note');
    const pronte = new Set(noteNecessarie().map((n) => chiaveNota(n.s, n.m)));
    for (const brano of Object.values(BRANI)) {
      for (let giro = 0; giro < 60; giro++) {
        expect(brano.note(giro).filter((n) => !pronte.has(chiaveNota(n.s, n.m)))).toEqual([]);
      }
    }
    // le percussioni non dipendono dall'altezza: una sola nota pronta l'una
    expect(chiaveNota('cassa', 0)).toBe(chiaveNota('cassa', 60));
    expect(chiaveNota('fisa', 69)).not.toBe(chiaveNota('fisa', 74));
  });

  it('tutte le note insieme pesano meno di 5 MB', async () => {
    const { byteNote, noteNecessarie } = await import('../../src/audio/note');
    expect(noteNecessarie().length).toBeLessThan(60);
    expect(byteNote()).toBeLessThan(5 * 1024 * 1024);
  });

  it('finché una nota non è pronta il suonatore ripiega sulla sintesi dal vivo, senza errori', async () => {
    const { creaSuonatore } = await import('../../src/audio/note');
    const f = contestoFinto(48000);
    const m = new Musica(f.ctx, {} as AudioNode, creaSuonatore(f.ctx));
    m.avvia('battaglia');
    m.accendiStrato();
    m.programma(6);
    expect(f.di('Oscillator').length).toBeGreaterThan(10);
    expect(f.errori).toEqual([]);
  });
});
