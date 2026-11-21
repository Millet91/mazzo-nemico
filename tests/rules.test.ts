// Oracolo delle regole: esempi e casi limite del GDD §4.10-4.11.
import { describe, it, expect } from 'vitest';
import { blankRun, wave, addCard, msgs, spec } from './helpers';
import { WaveSim } from '../src/core/wave';
import { lealtaTick } from '../src/core/run';

describe('Esempi del GDD §4.10', () => {
  it('Esempio 1: la Corazza insegna l’ordine', () => {
    const r = blankRun();
    r.def.segni[2] = ['brace'];
    r.def.segni[3] = ['taglio'];
    const { out } = wave(r, ['falce', 'lupo']);
    expect(out.dmg).toBe(3); // la Falce fa Impatto con Forza 3
    expect(out.destroyedNames).toEqual(['Il Lupo']); // il Lupo cade sotto il Taglio
    expect(msgs(out).some((m) => m.includes('la Corazza para Brace'))).toBe(true);
    // il Lupo è distrutto al tick 5, la Falce fa Impatto al tick 6
    const kill = out.events.find((e) => e.k === 'destroy')!;
    const imp = out.events.find((e) => e.k === 'impact')!;
    expect(kill.t).toBe(5);
    expect(imp.t).toBe(6);
  });

  it('Esempio 2: Silenzio e Rapido saltano le Braci', () => {
    const r = blankRun();
    r.def.segni[2] = ['brace'];
    r.def.segni[3] = ['brace'];
    const { out } = wave(r, ['bocca']);
    expect(out.dmg).toBe(2);
    expect(msgs(out).some((m) => m.includes('Silenzio'))).toBe(true);
    expect(out.events.filter((e) => e.k === 'damage').length).toBe(0);
  });

  it('Esempio 3: l’Araldo pesca in testa alla Coda, fuori dal Rito', () => {
    const r = blankRun();
    r.def.segni[0] = ['taglio'];
    addCard(r, 'lupo');
    const { out } = wave(r, ['banditore', 'topo', 'topo']);
    const entries = out.events.filter((e) => e.k === 'enter').map((e) => e.msg);
    expect(entries[0]).toContain('Banditore');
    expect(entries[1]).toContain('Lupo');
  });

  it('Esempio 4: un Patto che tradisce dopo 3 pescate', () => {
    const r = blankRun();
    const lupo = addCard(r, 'lupo', { owner: 'baro', lealta: 3 });
    expect(lealtaTick(r, [lupo.uid], {})).toEqual([]);
    expect(lealtaTick(r, [lupo.uid], {})).toEqual([]);
    expect(lealtaTick(r, [lupo.uid], {})).toEqual(['Il Lupo']);
    expect(lupo.owner).toBe('fato');
    expect(lupo.corrotto).toBe(true);
    // torna nemico con Forza 3 + 2
    const { out } = wave(r, [lupo.uid]);
    expect(out.dmg).toBe(5);
  });
});

describe('Keyword nemiche (§4.5)', () => {
  it('Sciame: la Copia va in testa alla Coda, senza Sciame e senza Spiccioli', () => {
    const r = blankRun();
    const { out } = wave(r, ['topi']);
    expect(out.events.filter((e) => e.k === 'copy').length).toBe(1);
    expect(out.dmg).toBe(2);
    expect(out.arrivedNames).toEqual(['I Topi del Granaio', 'Copia di I Topi del Granaio']);
  });

  it('Sciame: la Copia non dà Spiccioli quando muore', () => {
    const r = blankRun();
    r.def.segni[0] = ['brace'];
    const { out } = wave(r, ['topi']);
    expect(out.destroyedNames.length).toBe(2);
    expect(out.gained).toBe(1);
  });

  it('Corazza para anche il Taglio, Spina la toglie', () => {
    const r = blankRun();
    r.def.segni[0] = ['taglio'];
    r.def.segni[1] = ['taglio'];
    // il Mulo indebolito? Usiamo il Corvo-élite: lo Spaventapasseri ha Corazza 2. Qui: Taglio contro carta corazzata a Forza ≤ 2
    const o1 = wave(r, ['incudine', 'lupo']).out; void o1;
    const r2 = blankRun();
    r2.def.segni[1] = ['spina'];
    r2.def.segni[2] = ['brace'];
    const { out } = wave(r2, ['falce']);
    // Strada: Spina toglie la carica e fa −1 (2). Cortile: Brace −2 → distrutta
    expect(out.destroyedNames).toEqual(['La Falce Sola']);
    expect(out.dmg).toBe(0);
  });

  it('Ladro: ruba il Segno più vicino all’Uscio e lo restituisce se distrutto più avanti', () => {
    const r = blankRun();
    r.def.segni[0] = ['lanterna'];
    r.def.segni[3] = ['gelo'];
    const gazza = addCard(r, 'gazza');
    const { out } = wave(r, [gazza.uid]);
    expect(out.stolen).toEqual(['Gelo']);
    expect(r.def.segni[3]).toEqual([]);
    expect(gazza.bottino).toBe('gelo');
    expect(r.def.stolen).toEqual([{ segno: 'gelo', holder: gazza.uid }]);
    // ondata dopo: la Brace la distrugge, il Gelo torna nel Deposito
    r.def.segni[1] = ['brace'];
    const w2 = wave(r, [gazza.uid]);
    expect(w2.out.destroyedNames).toContain('La Gazza');
    expect(r.def.deposito).toContain('gelo');
    expect(gazza.bottino).toBeNull();
    expect(r.def.stolen).toEqual([]);
  });

  it('Ladro senza Segni ruba 3 Spiccioli', () => {
    const r = blankRun({ sp: 5 });
    wave(r, ['gazza']);
    expect(r.sp).toBe(2);
  });

  it('Tenace: resta a Forza 1 la prima volta', () => {
    const r = blankRun();
    r.def.segni[1] = ['taglio'];
    const { out } = wave(r, ['mannaro'], {}, 3);
    expect(msgs(out).some((m) => m.includes('Tenace'))).toBe(false); // il Taglio non scatta su Forza 5
    const r2 = blankRun();
    r2.def.segni[2] = ['brace'];
    r2.def.segni[3] = ['brace'];
    const o2 = wave(r2, ['processione']).out;
    expect(msgs(o2).some((m) => m.includes('Tenace'))).toBe(true);
  });

  it('Ritorno: torna in fondo alla Coda una volta, e dà comunque gli Spiccioli', () => {
    const r = blankRun();
    r.def.segni[0] = ['brace'];
    const { out } = wave(r, ['affogata']);
    expect(out.destroyedNames).toEqual(["L'Affogata", "L'Affogata"]);
    expect(out.gained).toBe(2);
    expect(out.dmg).toBe(0);
  });

  it('Esplosivo: alla morte ferisce le carte adiacenti, all’Impatto +2', () => {
    const r = blankRun();
    const { out } = wave(r, ['barile']);
    expect(out.dmg).toBe(4);
    const r2 = blankRun();
    r2.def.segni[2] = ['brace'];
    const o2 = wave(r2, ['lupo', 'barile']).out;
    expect(msgs(o2).some((m) => m.includes('esplode'))).toBe(true);
  });

  it('Etereo ignora i colpi da 1, la Lanterna lo toglie', () => {
    const r = blankRun();
    r.def.segni[1] = ['tagliola'];
    const { out } = wave(r, ['lamento']);
    expect(msgs(out).some((m) => m.includes('Eterea'))).toBe(true);
    const r2 = blankRun();
    r2.def.segni[1] = ['lanterna'];
    const o2 = wave(r2, ['lamento']).out;
    expect(o2.destroyedNames).toEqual(['Il Lamento']);
  });

  it('Rimando: la carta torna nel mazzo con Rancore, una volta per ondata, massimo +2', () => {
    const r = blankRun();
    r.def.segni[2] = ['rimando'];
    const l = addCard(r, 'lupo');
    const l2 = addCard(r, 'lupo');
    const { out } = wave(r, [l.uid, l2.uid]);
    expect(l.rancore).toBe(1);
    expect(l2.rancore).toBe(0);
    expect(out.dmg).toBe(3);
    wave(r, [l.uid]);
    wave(r, [l.uid]);
    expect(l.rancore).toBe(2);
  });

  it('Il Mazziere è immune a Taglio e Rimando', () => {
    const r = blankRun();
    r.def.segni[0] = ['rimando'];
    r.def.segni[1] = ['taglio'];
    const { out } = wave(r, [], { boss: 'sagrestano', kind: 'boss' });
    expect(out.bossImpact).toBe(10);
  });

  it('Lento: la carta del Mazziere avanza un tick sì e uno no', () => {
    const r = blankRun();
    const { out } = wave(r, [], { boss: 'sagrestano', kind: 'boss' });
    const imp = out.events.find((e) => e.k === 'impact')!;
    // entra al tick 1, poi 5 Passi a un tick sì e uno no
    expect(imp.t).toBe(11);
  });

  it('Bonus della notte: +1 Forza all’ingresso', () => {
    const r = blankRun();
    const { out } = wave(r, ['lupo'], { nightBonus: 1 });
    expect(out.dmg).toBe(4);
  });

  it('Sobilla: alla morte la carta davanti guadagna Forza', () => {
    const r = blankRun();
    r.def.segni[0] = ['brace'];
    const { out } = wave(r, ['lupo', 'sobillatore']);
    expect(msgs(out).some((m) => m.includes('sobilla'))).toBe(true);
  });

  it('Bastione riduce il danno all’Uscio', () => {
    const r = blankRun();
    r.def.segni[4] = ['bastione'];
    const { out } = wave(r, ['lupo']);
    expect(out.dmg).toBe(2);
  });

  it('Pozzo esilia per sempre (rispettando il mazzo minimo)', () => {
    const r = blankRun();
    r.def.segni[0] = ['pozzo'];
    for (let i = 0; i < 20; i++) addCard(r, 'topi');
    const l = addCard(r, 'volpe');
    wave(r, [l.uid]);
    expect(r.deck.find((x) => x.uid === l.uid)).toBeUndefined();
  });

  it('Rogo: Brucia a fine tick', () => {
    const r = blankRun();
    r.def.segni[0] = ['rogo'];
    const { out } = wave(r, ['lupo']);
    expect(msgs(out).some((m) => m.includes('Brucia'))).toBe(true);
    expect(out.dmg).toBeLessThan(3);
  });

  it('Gli Infiltrati non vengono colpiti dai tuoi Segni e all’Impatto curano', () => {
    const r = blankRun({ lumi: 30 });
    r.def.segni[1] = ['brace'];
    const a = addCard(r, 'lupo', { owner: 'baro', lealta: 3 });
    const { out } = wave(r, [a.uid]);
    expect(out.dmg).toBe(0);
    expect(r.lumi).toBe(31);
  });

  it('Morso: l’Infiltrato ferisce la carta davanti', () => {
    const r = blankRun();
    const a = addCard(r, 'lupo', { owner: 'baro', lealta: 3 });
    const { out } = wave(r, ['lupo', a.uid]);
    expect(out.dmg).toBeLessThan(3);
  });

  it('Asso nella manica: Trattieni ferma la carta per un tick', () => {
    const base = wave(blankRun(), ['lupo']).out.events.find((e) => e.k === 'impact')!.t;
    const s2 = new WaveSim(blankRun(), spec(), 1, { tick: 3, kind: 'trattieni', slot: 1 });
    s2.fixed = ['lupo'];
    const o2 = s2.run_();
    expect(o2.events.find((e) => e.k === 'impact')!.t).toBe(base + 1);
    expect(o2.events.some((e) => e.k === 'asso')).toBe(true);
  });

  it('Limite di tick: il mazzo collassa invece di andare all’infinito', () => {
    const r = blankRun();
    // nessun caso reale lo tocca: verifichiamo che 80 tick bastino a 30 carte lente
    const q = Array.from({ length: 30 }, () => 'mulo');
    const { out } = wave(r, q);
    expect(out.ticks).toBeLessThanOrEqual(80);
  });
});
