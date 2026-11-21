// QA M1 · guardie automatiche sulle regole di 00 §1.2 "Determinismo" e 04 §3 (motore separato dalla grafica).
// Non dipendono dai contratti: leggono il codice sorgente e falliscono se una cartella "pura" usa cose vietate.
// Proprietario: Lead test/QA (tests/qa/). Se una regola è sbagliata, si discute col QA, non si cancella il test.
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function fileTs(cartella: string): string[] {
  if (!existsSync(cartella)) return [];
  const out: string[] = [];
  for (const nome of readdirSync(cartella)) {
    const p = join(cartella, nome);
    if (statSync(p).isDirectory()) out.push(...fileTs(p));
    else if (/\.(ts|tsx)$/.test(nome) && !nome.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

/** Toglie commenti e stringhe, così una parola vietata scritta in un commento non fa fallire il test. */
function soloCodice(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/(['"`])(?:\\.|(?!\1)[^\\\n])*\1/g, '""');
}

interface Divieto { re: RegExp; motivo: string }

/** Cose che rompono il determinismo (replay d'oro, ripresa della battaglia, Node = telefono). */
const NON_DETERMINISTICO: Divieto[] = [
  { re: /\bMath\.random\b/, motivo: 'usare il PRNG con seme nello stato (00 §1.2)' },
  { re: /\bDate\.now\b|\bnew Date\b/, motivo: 'il tempo reale non entra nella simulazione (00 §1.2)' },
  { re: /\bperformance\.now\b/, motivo: 'il tempo reale non entra nella simulazione' },
  { re: /\bcrypto\.(getRandomValues|randomUUID)\b/, motivo: 'casualità fuori dal seme' },
  { re: /\bset(Timeout|Interval)\b|\brequestAnimationFrame\b/, motivo: 'la simulazione avanza solo a tick, non a timer' },
];

/** Trigonometria nativa: vietata nella sim e nel generatore, si usa la tabella a 0,5° (00 §1.2). */
const TRIGONOMETRIA: Divieto[] = [
  { re: /\bMath\.(sin|cos|tan|asin|acos|atan|atan2)\b/, motivo: 'usare la tabella trigonometrica a 0,5° (00 §1.2)' },
];

/** Il motore non conosce grafica, UI e DOM (04 §3: comunicano solo via core/bus). */

function importVietati(src: string): string[] {
  const vietati = [/^pixi\.js/, /^@pixi\//, /^preact$/, /^preact\//, /^@preact\/signals$/, /^@capacitor\//];
  const trovati: string[] = [];
  for (const m of src.matchAll(/(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const mod = m[1] ?? m[2];
    if (vietati.some((v) => v.test(mod))) trovati.push(mod);
    if (/(^|\/)(render|ui|piattaforma)(\/|$)/.test(mod) && mod.startsWith('.')) trovati.push(mod);
  }
  return trovati;
}

const DOM = /\b(window|document|navigator|localStorage|sessionStorage|HTMLElement|HTMLCanvasElement)\b/;

function violazioni(cartelle: string[], divieti: Divieto[]): string[] {
  const out: string[] = [];
  for (const c of cartelle) for (const f of fileTs(c)) {
    const codice = soloCodice(readFileSync(f, 'utf8'));
    codice.split('\n').forEach((riga, i) => {
      for (const d of divieti) if (d.re.test(riga)) out.push(`${f}:${i + 1} → ${riga.trim()}  [${d.motivo}]`);
    });
  }
  return out;
}

// Cartelle pure secondo 04 §4. core/ contiene il bus (@preact/signals-core è ammesso: non dipende da Preact).
const SIM = ['src/battaglia/sim'];
const GEN = ['src/battaglia/gen'];
const IA = ['src/battaglia/ia'];
const PURE = ['src/core', ...SIM, ...GEN, ...IA, 'src/mondo', 'src/contenuti'];

describe('QA · determinismo della battaglia', () => {
  it('sim, generatore e core non usano casualità o tempo reale', () => {
    expect(violazioni(['src/core', ...SIM, ...GEN], NON_DETERMINISTICO)).toEqual([]);
  });

  it('sim e generatore non usano la trigonometria nativa', () => {
    expect(violazioni([...SIM, ...GEN], TRIGONOMETRIA)).toEqual([]);
  });

  it("l'IA non usa Math.random (le sue scelte devono essere riproducibili col seme)", () => {
    expect(violazioni(IA, [NON_DETERMINISTICO[0]])).toEqual([]);
  });
});

describe('QA · motore separato dalla grafica (04 §3)', () => {
  it('le cartelle pure non importano Pixi, Preact, Capacitor, render/, ui/ o piattaforma/', () => {
    const out: string[] = [];
    for (const c of PURE) for (const f of fileTs(c)) {
      for (const mod of importVietati(readFileSync(f, 'utf8'))) out.push(`${f} importa ${mod}`);
    }
    expect(out).toEqual([]);
  });

  it('le cartelle pure non toccano il DOM', () => {
    expect(violazioni(PURE, [{ re: DOM, motivo: 'niente DOM nel motore: passa da core/bus' }])).toEqual([]);
  });
});

describe('QA · autocontrollo delle guardie', () => {
  it('le regole trovano davvero le cose vietate (e ignorano i commenti)', () => {
    const prova = (s: string, d: Divieto[]) => soloCodice(s).split('\n').some((r) => d.some((x) => x.re.test(r)));
    expect(prova('const x = Math.random();', NON_DETERMINISTICO)).toBe(true);
    expect(prova('// Math.random() vietato', NON_DETERMINISTICO)).toBe(false);
    expect(prova("const s = 'Date.now';", NON_DETERMINISTICO)).toBe(false);
    expect(prova('const a = Math.cos(t);', TRIGONOMETRIA)).toBe(true);
    expect(prova('const a = tabCos(t);', TRIGONOMETRIA)).toBe(false);
    expect(importVietati("import { Sprite } from 'pixi.js';")).toEqual(['pixi.js']);
    expect(importVietati("import { signal } from '@preact/signals-core';")).toEqual([]);
    expect(importVietati("import { x } from '../render/camera';")).toEqual(['../render/camera']);
  });
});
