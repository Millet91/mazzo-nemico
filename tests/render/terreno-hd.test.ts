// Fase 2, terreno HD: la parte pura (indice delle tessere, canali della maschera calcolati sulla CPU).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  canaleBruciato, canaleSbordo, canaliMaschera, indiceValido, nomeTessera, righeToccate, tessereDaCaricare, vicinoOriginale,
  SCAVATO_APERTO, SCAVATO_COPERTO, type IndiceHd,
} from '../../src/battaglia/render/terreno-hd';

const leggi = (p: string): unknown => JSON.parse(readFileSync(p, 'utf8'));
const CARTELLA = 'public/assets/mappe/cala-pappagallo-v3/';

describe('indice delle tessere HD', () => {
  it('legge i nomi "t-colonna-riga"', () => {
    expect(nomeTessera('t-3-1')).toEqual({ colonna: 3, riga: 1 });
    expect(nomeTessera('t-12-0')).toEqual({ colonna: 12, riga: 0 });
    expect(nomeTessera('3-1')).toBeNull();
    expect(nomeTessera('t-3-1.webp')).toBeNull();
  });

  it('gli indici di Cala Pappagallo v3 tornano col mondo 2048×1024', () => {
    expect(indiceValido(leggi(`${CARTELLA}hd/indice.json`), 2048, 1024)).toBe(true);
    expect(indiceValido(leggi(`${CARTELLA}hd-prologo/indice.json`), 2048, 1024)).toBe(true);
    expect(indiceValido(leggi(`${CARTELLA}hd/indice.json`), 1024, 1024)).toBe(false);
    expect(indiceValido({ tessere: [] }, 2048, 1024)).toBe(false);
    expect(indiceValido(null, 2048, 1024)).toBe(false);
  });

  it('una cartella variante prende le sue tessere e le altre dalla base', () => {
    const hd = leggi(`${CARTELLA}hd/indice.json`) as IndiceHd;
    const prologo = leggi(`${CARTELLA}hd-prologo/indice.json`) as IndiceHd;
    expect(tessereDaCaricare(hd, '/hd/')).toHaveLength(hd.tessere.length);
    const lista = tessereDaCaricare(prologo, '/p/', hd, '/hd/');
    expect(lista).toHaveLength(hd.tessere.length);
    expect(lista.filter((t) => t.url.startsWith('/p/')).map((t) => t.url).sort()).toEqual(prologo.tessere.map((n) => `/p/${n}.webp`).sort());
    expect(new Set(lista.map((t) => `${t.colonna}-${t.riga}`)).size).toBe(lista.length);
  });

  it('ogni tessera elencata esiste, con il margine (516×516)', () => {
    for (const c of ['hd', 'hd-prologo']) {
      const ix = leggi(`${CARTELLA}${c}/indice.json`) as IndiceHd;
      for (const n of ix.tessere) {
        const b = readFileSync(`${CARTELLA}${c}/${n}.webp`);
        expect(b.subarray(0, 4).toString('latin1')).toBe('RIFF');
        expect(b.subarray(8, 12).toString('latin1')).toBe('WEBP');
      }
    }
  });
});

// mondo piccolo per i canali: 12×10
const W = 12, H = 10;
function maschera(righe: string[]): Uint8Array {
  const m = new Uint8Array(W * H);
  righe.forEach((r, y) => [...r].forEach((c, x) => { m[y * W + x] = c === '#' ? 1 : 0; }));
  return m;
}
const RGBA = () => new Uint8Array(W * H * 4);
const canale = (out: Uint8Array, k: number, x: number, y: number) => out[(y * W + x) * 4 + k];

describe('canali della maschera', () => {
  const prima = maschera([
    '............',
    '............',
    '..########..',
    '..########..',
    '..########..',
    '..########..',
    '..########..',
    '..########..',
    '############',
    '############',
  ]);
  // un cratere che svuota l'interno ma lascia il tetto in colonna 5-6, e apre del tutto le colonne 3-4
  const dopo = maschera([
    '............',
    '............',
    '.....##.##..',
    '.....##.##..',
    '..#.....##..',
    '..#.....##..',
    '..#.....##..',
    '..##..####..',
    '############',
    '############',
  ]);

  it('R = solido; G = scavato, coperto (255) sotto un tetto o aperto (128) sotto il cielo', () => {
    const out = RGBA();
    canaliMaschera(dopo, prima, W, H, out);
    expect(canale(out, 0, 5, 2)).toBe(255);
    expect(canale(out, 0, 4, 4)).toBe(0);
    expect(canale(out, 1, 5, 2)).toBe(0); // solido
    expect(canale(out, 1, 1, 4)).toBe(0); // aria anche prima
    expect(canale(out, 1, 5, 5)).toBe(SCAVATO_COPERTO); // sotto il tetto delle colonne 5-6
    expect(canale(out, 1, 3, 5)).toBe(SCAVATO_APERTO); // colonna 3: niente sopra
    expect(canale(out, 1, 7, 3)).toBe(SCAVATO_APERTO);
  });

  it('A = bruciato entro il raggio da uno scavo', () => {
    const out = RGBA();
    canaliMaschera(dopo, prima, W, H, out);
    canaleBruciato(out, W, H, 1);
    expect(canale(out, 3, 5, 3)).toBe(255); // solido accanto allo scavo
    expect(canale(out, 3, 9, 6)).toBe(0); // lontano più di 1 px
    expect(canale(out, 3, 0, 9)).toBe(0);
  });

  it('B = contorno spento: vicino al solido di prima, lontano da quello di adesso', () => {
    const out = RGBA();
    const vicino = vicinoOriginale(prima, W, H, 1);
    canaleSbordo(dopo, vicino, W, H, 1, out);
    expect(canale(out, 2, 3, 1)).toBe(255); // sopra le colonne aperte: il contorno di prima non ha più solido accanto
    expect(canale(out, 2, 6, 1)).toBe(0); // sopra il tetto rimasto
    expect(canale(out, 2, 11, 3)).toBe(0); // accanto alla parete rimasta
    expect(canale(out, 2, 0, 0)).toBe(0); // lontano da tutto
  });

  it('dopo un cratere, ricalcolare solo la finestra dà lo stesso risultato del calcolo intero', () => {
    const w = 64, h = 48;
    const orig = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) orig[y * w + x] = y > 14 + Math.round(4 * Math.sin(x / 5)) ? 1 : 0;
    const ora = orig.slice();
    const tutto = (m: Uint8Array) => {
      const o = new Uint8Array(w * h * 4);
      canaliMaschera(m, orig, w, h, o);
      canaleSbordo(m, vicinoOriginale(orig, w, h, 5), w, h, 5, o);
      canaleBruciato(o, w, h, 3);
      return o;
    };
    const inc = tutto(ora);
    // cratere di raggio 7 in (30, 20) e poi uno sotto, che resta coperto
    for (const [cx, cy, r] of [[30, 20, 7], [12, 34, 6]]) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) ora[y * w + x] = 0;
      const m = r + 5 + 2;
      canaliMaschera(ora, orig, w, h, inc, cx - m, cx + m);
      canaleSbordo(ora, vicinoOriginale(orig, w, h, 5), w, h, 5, inc, cx - m, cx + m, cy - m, cy + m);
      canaleBruciato(inc, w, h, 3, cx - m, cx + m, cy - m, cy + m);
      expect(inc).toEqual(tutto(ora));
    }
  });

  it('righe da ricaricare: dalla cima del cratere al fondo di prima più basso', () => {
    expect(righeToccate(prima, W, H, 3, 7, 1)).toEqual([1, H]);
    const sospeso = maschera(['............', '..####......', '..####......', '............', '............', '............', '............', '............', '............', '............']);
    expect(righeToccate(sospeso, W, H, 2, 6, 0)).toEqual([0, 3]);
  });
});
