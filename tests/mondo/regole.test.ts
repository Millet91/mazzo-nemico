// Regole pure del round della carriera (mondo/carriera/regole.ts) sul cap. 1.
import { describe, expect, it } from 'vitest';
import { CAPITOLO_1 as C } from '../../src/contenuti/capitolo-1';
import { CAMPAGNA } from '../../src/contenuti/campagna';
import type { StatoCarriera } from '../../src/core/carriera';
import {
  applicaEsito, bersagli, bersagliDa, chiudiRound, controllaAttacco, fineRinforzi, imbarcoProposto, nuovaCarriera,
  piratiInCampo, piazzaRinforzo, preparaAttacco, ripristina, rinforziDelRound, rinforziTeorici, sceltaMarina,
  stelleCapitolo, turnoMarina,
} from '../../src/mondo/carriera/regole';

const vinta = (sup: [number, number] = [2, 0]) => ({ vincitore: 0 as const, superstiti: sup, motivo: 'eliminazione' });
const persa = (sup: [number, number] = [0, 1], motivo = 'eliminazione') => ({ vincitore: 1 as const, superstiti: sup, motivo });

/** Piazza tutti i rinforzi su un'isola (o dove c'è posto) e passa all'attacco. */
function rinforzaTutto(s: StatoCarriera, su = '1A'): StatoCarriera {
  let x = s;
  for (let g = 0; g < 20 && x.rinforzi > 0; g++) {
    const id = x.isole[su].pirati < CAMPAGNA.tettoIsola ? su : C.isole.find((i) => x.isole[i.id].padrone === 'giocatore' && x.isole[i.id].pirati < 5)!.id;
    x = piazzaRinforzo(C, x, id).stato;
  }
  return fineRinforzi(C, x);
}

function conquista(s: StatoCarriera, verso: string, sup = 2, soloDa?: string): StatoCarriera {
  const da = soloDa ? [{ isola: soloDa, pirati: s.isole[soloDa].pirati - 1 }] : imbarcoProposto(C, s, verso);
  const p = preparaAttacco(C, s, verso, da);
  expect(p.attacco, `attacco verso ${verso}`).not.toBeNull();
  return applicaEsito(C, p, vinta([sup, 0])).stato;
}

describe('inizio e rinforzi', () => {
  it('parte da 1A (4) e 1B (2) con 3 rinforzi al round 1', () => {
    const s = nuovaCarriera(C);
    expect(s.round).toBe(1);
    expect(s.fase).toBe('rinforzi');
    expect(s.isole['1A']).toEqual({ padrone: 'giocatore', pirati: 4, presa: false });
    expect(s.isole['1C']).toEqual({ padrone: 'marina', pirati: 2, presa: false });
    expect(s.rinforzi).toBe(3);
  });

  it('rispetta il tetto di 5 per isola e non chiude i rinforzi finché ce ne sono', () => {
    let s = nuovaCarriera(C);
    s = piazzaRinforzo(C, s, '1A').stato;
    expect(s.isole['1A'].pirati).toBe(5);
    expect(piazzaRinforzo(C, s, '1A').stato).toBe(s); // pieno: niente
    expect(piazzaRinforzo(C, s, '1C').stato).toBe(s); // non è mia
    expect(fineRinforzi(C, s).fase).toBe('rinforzi');
    s = piazzaRinforzo(C, s, '1B', 5).stato;
    expect(s.isole['1B'].pirati).toBe(4);
    expect(s.rinforzi).toBe(0);
    expect(fineRinforzi(C, s).fase).toBe('attacco');
  });

  it('regione completa: la Costa dà +2 (5 rinforzi con 4 isole, come in progressione.md)', () => {
    const s = nuovaCarriera(C);
    for (const id of ['1C', '1D']) s.isole[id] = { padrone: 'giocatore', pirati: 1, presa: true };
    expect(rinforziTeorici(C, s)).toBe(5);
  });

  it('i rinforzi senza posto si perdono', () => {
    const s = nuovaCarriera(C);
    s.isole['1A'].pirati = 5; s.isole['1B'].pirati = 4;
    expect(rinforziDelRound(C, s)).toBe(1);
  });
});

describe('attacco', () => {
  it('bersagli: solo isole della Marina adiacenti a isole con almeno 2 pirati', () => {
    const s = rinforzaTutto(nuovaCarriera(C));
    expect(bersagli(C, s).sort()).toEqual(['1C', '1D', '1E']);
    expect(bersagliDa(C, s, '1B').sort()).toEqual(['1C', '1D']);
  });

  it('attacco unito da 1A e 1B verso 1C fino a 5 pirati, almeno 1 resta a casa', () => {
    const s = rinforzaTutto(nuovaCarriera(C));
    const da = imbarcoProposto(C, s, '1C');
    expect(da.reduce((n, d) => n + d.pirati, 0)).toBe(5);
    expect(da.length).toBe(2);
    expect(controllaAttacco(C, s, '1C', [{ isola: '1A', pirati: 5 }])).toBe('pochi');
    expect(controllaAttacco(C, s, '1C', [{ isola: '1A', pirati: 4 }, { isola: '1B', pirati: 2 }])).toBe('troppi');
    expect(controllaAttacco(C, s, '1F', [{ isola: '1A', pirati: 1 }])).toBe('lontana');
    const p = preparaAttacco(C, s, '1C', da);
    expect(piratiInCampo(C, p)).toEqual([5, 2]);
    // i pirati non si muovono prima dell'esito
    expect(p.isole['1A'].pirati).toBe(s.isole['1A'].pirati);
  });

  it('conquista: i superstiti occupano, premio alla prima presa, le isole usate non riattaccano', () => {
    const s = rinforzaTutto(nuovaCarriera(C));
    const p = preparaAttacco(C, s, '1C', [{ isola: '1A', pirati: 3 }, { isola: '1B', pirati: 1 }]);
    const r = applicaEsito(C, p, vinta([3, 0]));
    expect(r.stato.isole['1C']).toEqual({ padrone: 'giocatore', pirati: 3, presa: true });
    expect(r.stato.isole['1A'].pirati).toBe(s.isole['1A'].pirati - 3);
    expect(r.stato.armi).toContain('rampino');
    expect(r.stato.mosse).toContain('dondolo');
    expect(r.stato.piratiPersi).toBe(1);
    expect(r.eventi[0]).toMatchObject({ t: 'conquista', isola: '1C' });
    expect(r.stato.usate.sort()).toEqual(['1A', '1B', '1C']);
    expect(r.stato.conquisteRound).toEqual(['1C']);
    expect(bersagliDa(C, r.stato, '1C')).toEqual([]);
  });

  it('attacco fallito: si perdono gli imbarcati, il difensore resta con i superstiti', () => {
    const s = rinforzaTutto(nuovaCarriera(C));
    const p = preparaAttacco(C, s, '1E', [{ isola: '1A', pirati: 3 }]);
    const r = applicaEsito(C, p, persa([0, 1]));
    expect(r.stato.isole['1A'].pirati).toBe(s.isole['1A'].pirati - 3);
    expect(r.stato.isole['1E']).toEqual({ padrone: 'marina', pirati: 1, presa: false });
    expect(r.stato.piratiPersi).toBe(3);
  });

  it('ritirata: i superstiti tornano a casa', () => {
    const s = rinforzaTutto(nuovaCarriera(C));
    const p = preparaAttacco(C, s, '1E', [{ isola: '1A', pirati: 3 }]);
    const r = applicaEsito(C, p, persa([2, 2], 'ritirata'));
    expect(r.stato.isole['1A'].pirati).toBe(s.isole['1A'].pirati - 1);
    expect(r.eventi[0]).toEqual({ t: 'attaccoFallito', isola: '1E', ritirata: true });
  });

  it('Bandiera e Duello contano per la ★★★; il Duello è 1 contro 1', () => {
    let s = rinforzaTutto(nuovaCarriera(C));
    const p = preparaAttacco(C, s, '1D', [{ isola: '1B', pirati: 2 }]);
    s = applicaEsito(C, p, vinta([1, 0])).stato;
    expect(s.perditeSfide).toBe(1);
    // Duello su 1H
    s.isole['1E'] = { padrone: 'giocatore', pirati: 4, presa: true };
    s.usate = [];
    const d = preparaAttacco(C, s, '1H', [{ isola: '1E', pirati: 3 }]);
    expect(piratiInCampo(C, d)).toEqual([1, 1]);
    const vinto = applicaEsito(C, d, vinta([1, 0])).stato;
    expect(vinto.isole['1H'].pirati).toBe(3);
    expect(vinto.bandiere).toContain('teschioFumante');
    const perso = applicaEsito(C, d, persa([0, 1])).stato;
    expect(perso.isole['1E'].pirati).toBe(3); // 4 − 3 imbarcati + 2 che tornano
    expect(perso.perditeSfide).toBe(2);
  });

  it('un\'isola di partenza ripresa dalla Marina si riconquista (Assalto, senza premio)', () => {
    const s = rinforzaTutto(nuovaCarriera(C));
    s.isole['1B'] = { padrone: 'marina', pirati: 1, presa: false };
    expect(bersagli(C, s)).toContain('1B');
    const p = preparaAttacco(C, s, '1B', [{ isola: '1A', pirati: 2 }]);
    expect(p.attacco).not.toBeNull();
    const r = applicaEsito(C, p, vinta([2, 0]));
    expect(r.stato.isole['1B'].padrone).toBe('giocatore');
    expect(r.eventi[0]).toMatchObject({ t: 'conquista', premi: [] });
  });

  it('i premi si danno una volta sola', () => {
    let s = rinforzaTutto(nuovaCarriera(C));
    s = conquista(s, '1C');
    s.isole['1C'] = { padrone: 'marina', pirati: 1, presa: true };
    s.usate = [];
    const r = applicaEsito(C, preparaAttacco(C, s, '1C', [{ isola: '1B', pirati: 1 }]), vinta([1, 0]));
    expect(r.eventi[0]).toMatchObject({ t: 'conquista', premi: [] });
  });
});

describe('Marina', () => {
  it('round 1 protetto: niente rinforzi né attacchi, si passa al round 2', () => {
    const s = rinforzaTutto(nuovaCarriera(C));
    const r = turnoMarina(C, s);
    expect(r.eventi.map((e) => e.t)).toEqual(['roundProtetto', 'nuovoRound']);
    expect(r.stato.round).toBe(2);
    expect(r.stato.fase).toBe('rinforzi');
    expect(r.stato.usate).toEqual([]);
  });

  it('dal round 2 rinforza il confine più debole e attacca se il rapporto è ≥ 1,5', () => {
    const s = nuovaCarriera(C);
    s.round = 2; s.fase = 'attacco';
    s.isole['1B'].pirati = 1; s.isole['1D'].pirati = 2; s.isole['1C'].pirati = 2;
    // il confine più debole è 1E (2)… a pari merito vince l'id: 1C(2), 1D(2), 1E(2) → 1C prende il rinforzo
    const r = turnoMarina(C, s);
    expect(r.eventi[0]).toEqual({ t: 'marinaRinforza', isola: '1C', da: 2, a: 3 });
    // 1C: 2 attaccanti contro 1B (1) → 2 ≥ 1,5
    expect(r.stato.attacco).toEqual({ verso: '1B', da: [{ isola: '1C', pirati: 2 }], difesa: true });
    expect(r.stato.fase).toBe('marina');
  });

  it('non attacca Porto Teschio né l\'isola appena conquistata', () => {
    const s = nuovaCarriera(C);
    s.round = 3; s.fase = 'attacco';
    s.isole['1A'].pirati = 1; s.isole['1E'].pirati = 5; s.isole['1B'].pirati = 5;
    expect(sceltaMarina(C, s)).toBeNull();
    s.isole['1C'] = { padrone: 'giocatore', pirati: 1, presa: true };
    s.conquisteRound = ['1C'];
    s.isole['1F'].pirati = 5;
    expect(sceltaMarina(C, s)).toBeNull();
    s.conquisteRound = [];
    expect(sceltaMarina(C, s)?.verso).toBe('1C');
  });

  it('difesa vinta: il giocatore tiene l\'isola e il round si chiude', () => {
    const s = nuovaCarriera(C);
    s.round = 2; s.fase = 'marina';
    s.attacco = { verso: '1B', da: [{ isola: '1C', pirati: 2 }], difesa: true };
    s.isole['1C'].pirati = 3;
    const r = applicaEsito(C, s, persa([0, 1]));
    expect(r.stato.isole['1B']).toMatchObject({ padrone: 'giocatore', pirati: 1 });
    expect(r.stato.isole['1C'].pirati).toBe(1);
    expect(r.stato.round).toBe(3);
    expect(r.eventi.map((e) => e.t)).toEqual(['difesaRiuscita', 'nuovoRound']);
  });

  it('difesa persa: l\'isola torna alla Marina', () => {
    const s = nuovaCarriera(C);
    s.round = 2; s.fase = 'marina'; s.isole['1B'].pirati = 1; s.isole['1C'].pirati = 3;
    s.attacco = { verso: '1B', da: [{ isola: '1C', pirati: 2 }], difesa: true };
    const r = applicaEsito(C, s, vinta([2, 0]));
    expect(r.stato.isole['1B']).toMatchObject({ padrone: 'marina', pirati: 2 });
    expect(r.eventi[0]).toEqual({ t: 'perdita', isola: '1B' });
  });
});

describe('fine del capitolo', () => {
  it('vittoria con tutte le isole, stelle e scene viste conservate', () => {
    let s = nuovaCarriera(C);
    for (const i of C.isole) if (i.id !== '1H') s.isole[i.id] = { padrone: 'giocatore', pirati: 3, presa: true };
    s.fase = 'attacco'; s.round = 5;
    const r = applicaEsito(C, preparaAttacco(C, s, '1H', [{ isola: '1G', pirati: 2 }]), vinta([1, 0]));
    expect(r.eventi.at(-1)).toEqual({ t: 'capitoloVinto', stelle: 3 });
    expect(r.stato.fase).toBe('fine');
    expect(r.stato.stelle[1]).toBe(3);
    s = r.stato;
    expect(stelleCapitolo({ ...s, round: 7 })).toBe(2);
  });

  it('oltre il limite di round del capitolo il capitolo è perso', () => {
    const s = nuovaCarriera(C);
    s.round = C.limiteRound; s.fase = 'marina';
    expect(chiudiRound(C, s).eventi).toEqual([{ t: 'capitoloPerso', motivo: 'round' }]);
  });

  it('una partita di prova: 6 conquiste in 4 round, ★★', () => {
    let s = nuovaCarriera(C);
    const giro = (bersagliRound: [string, string][]) => {
      s = rinforzaTutto(s);
      for (const [b, da] of bersagliRound) s = conquista(s, b, 2, da);
      const r = turnoMarina(C, s);
      s = r.stato;
      if (s.attacco) s = applicaEsito(C, s, persa([0, 1])).stato; // difesa sempre vinta
    };
    giro([['1C', '1A'], ['1D', '1B']]);
    giro([['1E', '1A']]);
    giro([['1F', '1C'], ['1G', '1E']]);
    s = rinforzaTutto(s, '1G');
    s = conquista(s, '1H', 1, '1G');
    expect(s.fase).toBe('fine');
    expect(s.round).toBe(4);
    expect(s.stelle[1]).toBeGreaterThanOrEqual(2);
  });
});

describe('salvataggio', () => {
  it('ripristina una battaglia lasciata a metà tornando a prima dell\'attacco', () => {
    const s = rinforzaTutto(nuovaCarriera(C));
    const p = preparaAttacco(C, s, '1C', imbarcoProposto(C, s, '1C'));
    const r = ripristina(C, JSON.parse(JSON.stringify(p)));
    expect(r?.attacco).toBeNull();
    expect(r?.fase).toBe('attacco');
    expect(r?.isole).toEqual(s.isole);
  });

  it('rifiuta salvataggi rotti o di versioni future', () => {
    expect(ripristina(C, null)).toBeNull();
    expect(ripristina(C, { versione: 99 })).toBeNull();
    expect(ripristina(C, 'ciao')).toBeNull();
  });

  it('completa i campi mancanti di un salvataggio vecchio', () => {
    const s = nuovaCarriera(C) as Partial<StatoCarriera>;
    delete s.usate; delete s.conquisteRound; delete s.perditeSfide;
    const r = ripristina(C, s)!;
    expect(r.usate).toEqual([]);
    expect(r.perditeSfide).toBe(0);
  });
});
