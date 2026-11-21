// Scena della mappa del mondo (P2, Mondo e mappa): parti pure di src/mondo/scena/ (camera, tocchi, cosa mostrare).
import { describe, expect, it } from 'vitest';
import { CameraMondo, MARGINE_TAVOLO, SCALA_MAX } from '../../src/mondo/scena/camera-mondo';
import {
  TOCCO_MIN_PX, capitoliAperti, capitoliBloccati, isolaInPunto, isoleBloccate, rotte, sbuffiNebbia, scalaSegni,
  viaggioInCoda, vistaDaStato, type Indici, type IsolaMappa,
} from '../../src/mondo/scena/logica';
import { CALA_PAPPAGALLO, CAPITOLO_1, MONDO_H, MONDO_W } from '../../src/contenuti/capitolo-1';
import type { StatoCarriera } from '../../src/core/carriera';

const mappa: IsolaMappa[] = [
  ...CAPITOLO_1.isole.map((i) => ({ id: i.id, x: i.pos.x, y: i.pos.y, raggio: i.raggio, capitolo: 1 })),
  { id: 'cala', x: CALA_PAPPAGALLO.pos.x, y: CALA_PAPPAGALLO.pos.y, raggio: CALA_PAPPAGALLO.raggio, capitolo: 0 },
];

function stato(p: Partial<StatoCarriera> = {}): StatoCarriera {
  const isole: StatoCarriera['isole'] = {};
  for (const i of CAPITOLO_1.isole) isole[i.id] = { padrone: i.padroneIniziale, pirati: i.piratiIniziali, presa: i.padroneIniziale === 'giocatore' };
  return {
    versione: 1, capitolo: 1, round: 1, fase: 'rinforzi', isole, rinforzi: 0, attacco: null, armi: [], mosse: [], reclute: [],
    bandiere: [], stelle: {}, sceneViste: [], completo: false, usate: [], conquisteRound: [], piratiPersi: 0, perditeSfide: 0, battaglieGiocate: 0, ...p,
  };
}

describe('camera del mondo', () => {
  it('a Pixel 6 (915×412) la vista più larga mostra tutta la carta col bordo del tavolo', () => {
    const c = new CameraMondo(MONDO_W, MONDO_H);
    c.impostaSchermo(915, 412);
    c.zoomA(0.01, 400, 200);
    expect(c.scala).toBeCloseTo(c.scalaMin);
    expect((MONDO_H + 2 * MARGINE_TAVOLO) * c.scala).toBeLessThanOrEqual(412 + 1e-6);
    expect(c.x).toBeCloseTo(MONDO_W / 2);
    expect(c.y).toBeCloseTo(MONDO_H / 2);
  });

  it('lo zoom tiene fermo il punto sotto le dita e non supera il massimo', () => {
    const c = new CameraMondo();
    c.impostaSchermo(915, 412);
    c.vola(1200, 900, 0.5, 0);
    const prima = c.mondoDaSchermo(300, 150);
    c.zoomA(0.9, 300, 150);
    const dopo = c.mondoDaSchermo(300, 150);
    expect(dopo.x).toBeCloseTo(prima.x, 5);
    expect(dopo.y).toBeCloseTo(prima.y, 5);
    c.zoomA(99, 300, 150);
    expect(c.scala).toBe(SCALA_MAX);
  });

  it('il trascinamento non porta la vista fuori dalla carta', () => {
    const c = new CameraMondo();
    c.impostaSchermo(915, 412);
    c.vola(1500, 900, 1, 0);
    c.trascina(100000, 100000);
    const angolo = c.mondoDaSchermo(0, 0);
    expect(angolo.x).toBeCloseTo(-MARGINE_TAVOLO);
    expect(angolo.y).toBeCloseTo(-MARGINE_TAVOLO);
  });

  it('il volo arriva a destinazione e l\'inerzia si ferma da sola', () => {
    const c = new CameraMondo();
    c.impostaSchermo(915, 412);
    c.vola(1000, 800, 0.4, 0);
    c.vola(1800, 760, 1.2, 700);
    for (let i = 0; i < 60; i++) c.aggiorna(16);
    expect(c.inVolo).toBe(false);
    expect(c.x).toBeCloseTo(1800); expect(c.scala).toBeCloseTo(1.2);
    c.lancia(2, 0);
    for (let i = 0; i < 200; i++) c.aggiorna(16);
    expect(c.x).toBeLessThan(1800);
  });

  it('inquadra il capitolo intero', () => {
    const c = new CameraMondo();
    c.impostaSchermo(915, 412);
    const v = c.inquadra({ x0: 500, y0: 100, x1: 2200, y1: 1700 }, 8);
    expect((1700 - 100) * v.s).toBeLessThanOrEqual(412 - 16 + 1e-6);
  });
});

describe('tocchi sulle isole', () => {
  it('senza immagine a indici: dentro il raggio si prende l\'isola, in mare aperto niente', () => {
    expect(isolaInPunto(CAPITOLO_1.isole.find((i) => i.id === '1C')!.pos, mappa, 0.5, null)).toBe('1C');
    expect(isolaInPunto({ x: 2900, y: 150 }, mappa, 0.5, null)).toBeNull();
  });

  it('a vista lontana il tocco vale almeno 28 px CSS dal centro (diametro ≥ 56 px)', () => {
    const scala = 0.15;
    const piccola = mappa.find((i) => i.id === '1H')!;
    const d = (TOCCO_MIN_PX - 1) / scala;
    expect(isolaInPunto({ x: piccola.x + d, y: piccola.y }, mappa, scala, null)).toBe('1H');
    expect(TOCCO_MIN_PX * 2).toBeGreaterThanOrEqual(56);
  });

  it('l\'immagine a indici decide la forma; il colore si legge arrotondando', () => {
    const indici: Indici = { w: 4, h: 1, rossi: new Uint8Array([0, 21, 39, 0]), scala: 100, passo: 20, ordine: ['1A', '1B'] };
    expect(isolaInPunto({ x: 150, y: 50 }, mappa, 1, indici)).toBe('1A');
    expect(isolaInPunto({ x: 250, y: 50 }, mappa, 1, indici)).toBe('1B');
  });
});

describe('cosa mostra la scena', () => {
  it('le animazioni in coda "tengono" le loro isole e la nebbia del loro capitolo', () => {
    const coda = [
      { t: 'conquista', isola: '1C' }, { t: 'pirati', isola: '1A', da: 4, a: 2 }, { t: 'centra', isola: '1D' },
      { t: 'nebbia', capitolo: 1 }, { t: 'viaggio', da: 'cala', a: '1A' },
    ] as const;
    expect([...isoleBloccate(coda)].sort()).toEqual(['1A', '1C']);
    expect(capitoliBloccati(coda).has(1)).toBe(true);
    expect(viaggioInCoda(coda)).toBe(true);
    expect(viaggioInCoda([])).toBe(false);
  });

  it('nebbia: aperti i capitoli fino a quello in corso, tranne quelli che si apriranno con l\'animazione', () => {
    expect([...capitoliAperti(stato({ capitolo: 0 }), new Set())]).toEqual([0]);
    expect(capitoliAperti(stato({ capitolo: 1 }), new Set()).has(1)).toBe(true);
    expect(capitoliAperti(stato({ capitolo: 1 }), new Set([1])).has(1)).toBe(false);
  });

  it('premio solo sulle isole non ancora prese; pedina col numero di pirati', () => {
    const s = stato();
    expect(vistaDaStato(CAPITOLO_1, s, '1C')).toEqual({ padrone: 'marina', pirati: 2, premio: 'arma' });
    s.isole['1C'] = { padrone: 'giocatore', pirati: 3, presa: true };
    expect(vistaDaStato(CAPITOLO_1, s, '1C')).toEqual({ padrone: 'giocatore', pirati: 3, premio: null });
    // ripresa dalla Marina dopo la conquista: il premio non torna
    s.isole['1C'] = { padrone: 'marina', pirati: 1, presa: true };
    expect(vistaDaStato(CAPITOLO_1, s, '1C')!.premio).toBeNull();
    expect(vistaDaStato(CAPITOLO_1, null, '1A')).toEqual({ padrone: 'giocatore', pirati: 4, premio: null });
  });

  it('rotte: 12 nel capitolo 1, una per coppia', () => {
    const r = rotte(CAPITOLO_1);
    expect(r.length).toBe(12);
    expect(new Set(r.map(([a, b]) => a + b)).size).toBe(12);
  });

  it('i segnaposti crescono quando si allarga, fino a 2,4 volte', () => {
    expect(scalaSegni(1.2)).toBe(1);
    expect(scalaSegni(0.3)).toBeCloseTo(2);
    expect(scalaSegni(0.05)).toBe(2.4);
  });

  it('niente nebbia su Cala Pappagallo; le isole del capitolo hanno la loro nebbia', () => {
    const s = sbuffiNebbia(mappa, MONDO_W, MONDO_H);
    const vicino = (id: string) => {
      const m = mappa.find((i) => i.id === id)!;
      return s.filter((b) => Math.hypot(b.x - m.x, b.y - m.y) < m.raggio);
    };
    expect(vicino('cala').length).toBe(0);
    expect(vicino('1A').every((b) => b.capitolo === 1)).toBe(true);
    expect(s.some((b) => b.capitolo === 99)).toBe(true);
    expect(s.length).toBeLessThan(200);
  });
});
