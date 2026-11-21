// Scheletro delle cartelle (04 §4): ogni cartella ha il README che dice chi ne è proprietario.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { INFO_BUILD, etichettaBuild } from '../../src/core/build';

const CARTELLE = [
  'src/core', 'src/battaglia/sim', 'src/battaglia/ia', 'src/battaglia/gen', 'src/battaglia/render', 'src/mondo',
  'src/contenuti', 'src/ui', 'src/render', 'src/assets', 'src/piattaforma', 'src/testi', 'sim', 'tests',
];

describe('Struttura del progetto', () => {
  it('ogni cartella di 04 §4 esiste e ha un README', () => {
    expect(CARTELLE.filter((c) => !existsSync(`${c}/README.md`))).toEqual([]);
  });

  it('appId e nome dell\'app sono quelli di M0', () => {
    const cap = readFileSync('capacitor.config.ts', 'utf8');
    expect(cap).toContain("appId: 'it.millet91.kaboomahoy'");
    expect(cap).toContain("appName: 'Kaboom Ahoy!'");
    const gradle = readFileSync('android/app/build.gradle', 'utf8');
    expect(gradle).toContain('applicationId "it.millet91.kaboomahoy"');
    expect(existsSync('android/app/src/main/java/it/millet91/kaboomahoy/MainActivity.java')).toBe(true);
    expect(readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8')).toContain('android:screenOrientation="sensorLandscape"');
  });

  it('le informazioni di build hanno un formato leggibile', () => {
    expect(etichettaBuild({ versione: '0.1.0', build: '12', commit: 'a1b2c3d', ramo: 'main', data: '' })).toBe('0.1.0 · build 12 · a1b2c3d');
    expect(INFO_BUILD.versione).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
