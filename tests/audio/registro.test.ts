// Registro audio: ogni voce è coerente, ogni ricetta gira senza errori e il totale resta leggero per il telefono.
import { describe, it, expect } from 'vitest';
import { AUDIO, ID_SUONI, secondiTotali } from '../../src/audio/registro';
import type { VoceAudio } from '../../src/audio/tipi';
import { creaSint } from '../../src/audio/sintesi';
import { FREQ_SINTESI, normalizza, PICCO, semeDi } from '../../src/audio/magazzino';
import { db, panDaX, PAN_MAX, VOLUME_CANALE } from '../../src/audio/mix';
import { daVolumeUnico } from '../../src/audio/preferenze';
import { contestoFinto } from './finto';

const voci = ID_SUONI.map((id) => [id, AUDIO[id] as VoceAudio] as const);

describe('Registro audio', () => {
  it('ogni voce ha id, canale, volume e durata validi', () => {
    const problemi: string[] = [];
    for (const [id, v] of voci) {
      if (!/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(id)) problemi.push(`${id}: id non minuscolo_con_trattino_basso`);
      if (!(v.canale in VOLUME_CANALE)) problemi.push(`${id}: canale ${v.canale}`);
      if (!(v.volume > 0 && v.volume <= 1)) problemi.push(`${id}: volume ${v.volume}`);
      if (!(v.durata > 0 && v.durata <= 4)) problemi.push(`${id}: durata ${v.durata}`);
      if (v.varianti !== undefined && !(Number.isInteger(v.varianti) && v.varianti >= 1 && v.varianti <= 4)) problemi.push(`${id}: varianti ${v.varianti}`);
      if (v.sample !== undefined && !/^assets\/audio\/(sfx|vox|mus|amb)\/[a-z0-9_]+\.ogg$/.test(v.sample)) problemi.push(`${id}: percorso ${v.sample}`);
    }
    expect(problemi).toEqual([]);
  });

  it('i quattro canali sono tutti usati: musica, effetti, voci e tasti', () => {
    expect([...new Set(voci.map(([, v]) => v.canale))].sort()).toEqual(['effetti', 'musica', 'ui', 'voci']);
  });

  it('ogni ricetta gira senza gli errori che fermerebbero WebAudio, e non usa una montagna di nodi', () => {
    const problemi: string[] = [];
    for (const [id, v] of voci) {
      for (let k = 0; k < (v.varianti ?? 1); k++) {
        const f = contestoFinto(FREQ_SINTESI);
        v.ricetta(creaSint(f.ctx, {} as AudioNode, semeDi(id, k)), k);
        problemi.push(...f.errori.map((e) => `${id}_${k}: ${e}`));
        if (!f.nodi.length) problemi.push(`${id}_${k}: ricetta vuota`);
        if (f.nodi.length > 260) problemi.push(`${id}_${k}: ${f.nodi.length} nodi`);
        // niente che parta prima dell'inizio o finisca molto dopo la durata dichiarata (verrebbe tagliato)
        const fine = Math.max(...f.nodi.flatMap((n) => n.fermate), 0);
        if (fine > v.durata + 0.25) problemi.push(`${id}_${k}: finisce a ${fine.toFixed(2)} s ma dura ${v.durata}`);
      }
    }
    expect(problemi).toEqual([]);
  });

  it('tutti i suoni insieme stanno sotto i 10 MB di memoria e i 75 secondi da sintetizzare all\'avvio', () => {
    expect(secondiTotali()).toBeLessThan(75);
    expect(secondiTotali() * FREQ_SINTESI * 4).toBeLessThan(10 * 1024 * 1024);
  });

  it('i suoni che si ripetono spesso hanno più varianti', () => {
    for (const id of ['passo_sabbia', 'passo_legno', 'passo_roccia', 'esp_media', 'arma_cannone', 'pirata_colpito'] as const) {
      expect((AUDIO[id] as VoceAudio).varianti ?? 1, id).toBeGreaterThanOrEqual(2);
    }
  });

  it('due timbri di voce con gli stessi sei versi', () => {
    const versi = (t: string) => ID_SUONI.filter((x) => x.startsWith(`vox_${t}_`)).map((x) => x.slice(6)).sort();
    expect(versi('a')).toEqual(['colpito', 'morte', 'sforzo', 'spara', 'tocca', 'vittoria']);
    expect(versi('b')).toEqual(versi('a'));
  });
});

describe('Suoni pronti in memoria', () => {
  it('normalizza porta il picco a −1 dB e sfuma la fine', () => {
    const d = normalizza(Float32Array.from({ length: 1000 }, (_, i) => 0.2 * Math.sin(i / 5)));
    expect(Math.max(...d.map(Math.abs))).toBeCloseTo(PICCO, 1);
    expect(Math.abs(d[d.length - 1])).toBeLessThan(0.01);
  });

  it('un suono in ciclo non si sfuma (girerebbe con un buco) e il silenzio resta silenzio', () => {
    const d = normalizza(new Float32Array(500).fill(0.5), PICCO, false);
    expect(d[d.length - 1]).toBeCloseTo(PICCO);
    expect([...normalizza(new Float32Array(100))].every((x) => x === 0)).toBe(true);
  });

  it('il seme è stabile per suono e diverso per variante', () => {
    expect(semeDi('esp_media', 0)).toBe(semeDi('esp_media', 0));
    expect(semeDi('esp_media', 0)).not.toBe(semeDi('esp_media', 1));
    expect(semeDi('esp_media', 0)).not.toBe(semeDi('esp_grande', 0));
  });
});

describe('Mix e cursori', () => {
  it('pan stereo dalla x: da −0,6 a +0,6, zero al centro', () => {
    expect(panDaX(1024)).toBeCloseTo(0);
    expect(panDaX(0)).toBeCloseTo(-PAN_MAX);
    expect(panDaX(2048)).toBeCloseTo(PAN_MAX);
    expect(panDaX(-500)).toBe(-PAN_MAX);
    expect(panDaX(9999)).toBe(PAN_MAX);
  });

  it('decibel: −6 dB è circa la metà', () => {
    expect(db(0)).toBe(1);
    expect(db(-6)).toBeCloseTo(0.501, 2);
  });

  it('dal vecchio volume unico ai due cursori: muto resta muto, il resto tiene la proporzione', () => {
    expect(daVolumeUnico(0)).toEqual({ musica: 0, effetti: 0 });
    expect(daVolumeUnico(0.8)).toEqual({ musica: 0.6, effetti: 0.8 });
    expect(daVolumeUnico(1).musica).toBeCloseTo(0.75);
    expect(daVolumeUnico(0.25).effetti).toBe(0.25);
  });
});

describe('Ordine di preparazione', () => {
  it('prima i tasti, poi campana e voce di inizio turno, poi armi e botti; jingle e ambiente per ultimi', async () => {
    const { ordineDiPreparazione } = await import('../../src/audio/magazzino');
    const ordine = ordineDiPreparazione();
    expect([...ordine].sort()).toEqual([...ID_SUONI].sort());
    const posto = (id: string) => ordine.indexOf(id as (typeof ID_SUONI)[number]);
    expect(posto('ui_tocco')).toBeLessThan(posto('turno_mio'));
    expect(posto('turno_mio')).toBeLessThan(posto('arma_cannone'));
    expect(posto('vox_a_tocca')).toBeLessThan(posto('esp_media'));
    expect(posto('esp_media')).toBeLessThan(posto('pirata_morte'));
    expect(posto('pirata_morte')).toBeLessThan(posto('mus_vittoria'));
  });
});
