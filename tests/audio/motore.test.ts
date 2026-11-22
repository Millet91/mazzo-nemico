// Polifonia e motore: tetto di voci, furto della più vecchia, varianti, cicli, ducking. WebAudio è finto (finto.ts).
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { Polifonia, type Istanza } from '../../src/audio/polifonia';
import { ISTANZE_PER_SUONO, POLIFONIA_MAX } from '../../src/audio/mix';
import { contestoFinto } from './finto';

const istanza = (id: string, fine: number, fermate: string[]): Istanza => ({ id, fine, ferma: () => fermate.push(`${id}@${fine}`) });

describe('Polifonia', () => {
  it('al massimo 3 copie dello stesso suono: si ruba la più vecchia', () => {
    const p = new Polifonia(POLIFONIA_MAX);
    const fermate: string[] = [];
    for (let i = 0; i < 5; i++) p.entra(istanza('passo', 10 + i, fermate), ISTANZE_PER_SUONO, 0);
    expect(p.quanteDi('passo')).toBe(3);
    expect(fermate).toEqual(['passo@10', 'passo@11']);
  });

  it('al massimo 24 voci in tutto', () => {
    const p = new Polifonia(POLIFONIA_MAX);
    const fermate: string[] = [];
    for (let i = 0; i < 30; i++) p.entra(istanza(`s${i}`, 100 + i, fermate), 3, 0);
    expect(p.quante).toBe(24);
    expect(fermate.slice(0, 2)).toEqual(['s0@100', 's1@101']);
  });

  it('i suoni già finiti lasciano il posto senza essere fermati', () => {
    const p = new Polifonia(2);
    const fermate: string[] = [];
    p.entra(istanza('a', 1, fermate), 3, 0);
    p.entra(istanza('b', 1, fermate), 3, 0);
    p.entra(istanza('c', 9, fermate), 3, 5);
    expect(p.quante).toBe(1);
    expect(fermate).toEqual([]);
  });

  it('i suoni in ciclo si rubano per ultimi', () => {
    const p = new Polifonia(2);
    const fermate: string[] = [];
    p.entra(istanza('scivola', Infinity, fermate), 3, 0);
    p.entra(istanza('botto', 5, fermate), 3, 0);
    p.entra(istanza('passo', 6, fermate), 3, 0);
    expect(fermate).toEqual(['botto@5']);
    expect(p.quanteDi('scivola')).toBe(1);
  });

  it('esce() toglie senza fermare', () => {
    const p = new Polifonia(4);
    const fermate: string[] = [];
    const a = istanza('a', 5, fermate);
    p.entra(a, 3, 0);
    p.esce(a);
    expect(p.quante).toBe(0);
    expect(fermate).toEqual([]);
  });
});

describe('Motore', () => {
  // il magazzino sintetizza con OfflineAudioContext: qui lo si riempie a mano con suoni finti
  beforeAll(() => {
    vi.doMock('../../src/audio/magazzino', async (orig) => {
      const vero = await orig<typeof import('../../src/audio/magazzino')>();
      const { AUDIO } = await import('../../src/audio/registro');
      return {
        ...vero,
        campioni: (id: keyof typeof AUDIO) => Array.from({ length: (AUDIO[id] as { varianti?: number }).varianti ?? 1 }, () => new Float32Array(3200)),
      };
    });
  });

  const crea = async (caso: () => number = () => 0.5) => {
    const { Motore } = await import('../../src/audio/motore');
    const f = contestoFinto(48000);
    return { f, m: new Motore(f.ctx, caso) };
  };

  it('un suono costa una sorgente e parte col ritardo chiesto', async () => {
    const { f, m } = await crea();
    f.avanza(2);
    expect(m.suona({ id: 'esp_media', ritardo: 0.12 })).toBe(true);
    const sorgenti = f.di('BufferSource');
    expect(sorgenti).toHaveLength(1);
    expect(sorgenti[0].partenze[0]).toBeCloseTo(2.12);
    expect(f.errori).toEqual([]);
  });

  it('il pan aggiunge un nodo solo quando serve', async () => {
    const { f, m } = await crea();
    m.suona({ id: 'ui_tocco' });
    expect(f.di('StereoPanner')).toHaveLength(0);
    m.suona({ id: 'passo_legno', pan: -0.4 });
    expect(f.di('StereoPanner')).toHaveLength(1);
  });

  it('non ripete due volte di fila la stessa variante', async () => {
    const { m } = await crea(() => 0.1);
    const scelte: number[] = [];
    const originale = (m as unknown as { ultimaVariante: Map<string, number> }).ultimaVariante;
    for (let i = 0; i < 6; i++) { m.suona({ id: 'passo_sabbia' }); scelte.push(originale.get('passo_sabbia')!); }
    for (let i = 1; i < scelte.length; i++) expect(scelte[i]).not.toBe(scelte[i - 1]);
  });

  it('tiene il tetto di copie per suono (i passi sono al massimo 2 insieme)', async () => {
    const { m } = await crea();
    for (let i = 0; i < 6; i++) m.suona({ id: 'passo_roccia' });
    expect(m.vociAttive).toBe(2);
  });

  it('un suono in ciclo parte una volta sola per chiave e si ferma con la chiave, o con "*"', async () => {
    const { f, m } = await crea();
    m.suona({ id: 'scivola_ciclo', ciclo: 'scivola:1' });
    m.suona({ id: 'scivola_ciclo', ciclo: 'scivola:1' });
    m.suona({ id: 'scivola_ciclo', ciclo: 'scivola:2' });
    expect(m.cicliAttivi).toBe(2);
    expect(f.di('BufferSource')).toHaveLength(2);
    m.fermaCiclo('scivola:1');
    expect(m.cicliAttivi).toBe(1);
    m.fermaCiclo('*');
    expect(m.cicliAttivi).toBe(0);
    expect(f.di('BufferSource').every((s) => s.fermate.length === 1)).toBe(true);
  });

  it('ad audio fermo non suona niente (e non si rompe)', async () => {
    const { f, m } = await crea();
    (f.ctx as unknown as { state: string }).state = 'suspended';
    expect(m.suona({ id: 'esp_grande' })).toBe(false);
    expect(f.di('BufferSource')).toHaveLength(0);
  });

  it('cursori, pausa e ducking non danno errori di programmazione dei parametri', async () => {
    const { f, m } = await crea();
    m.volume('musica', 0.6);
    m.volume('effetti', 0);
    m.volume('effetti', 7);
    m.pausa(true);
    m.pausa(false);
    m.attenua('botto_grande');
    m.attenua('voce', 0.3);
    m.suona({ id: 'esp_grande', attenua: 'botto_grande' });
    expect(f.errori).toEqual([]);
  });
});
