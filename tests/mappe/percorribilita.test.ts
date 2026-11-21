// Studio v2, Fase 0 (QA §3.1 e §3.2; PIANO.md): le scale e le liane si percorrono tutte, su e giù, e dagli spawn si
// arriva a piedi dove serve. Tutto con la sim vera: stessi comandi e stessa fisica della battaglia.
//
// Nasce dal bug del 21/11 ("la scalata si ferma a metà"): le due scale grandi di Cala Pappagallo avevano l'asse a
// 5 px dal labbro della parete e il pirata (largo 12) ci si incastrava; la liana del Nido stava oltre uno scalino di
// 20 px in fondo al ponte; le scale delle torri erano dietro i pali pieni della torre.
import { describe, expect, it } from 'vitest';
import type { MappaGenerata, StatoBattaglia } from '../../src/core/tipi';
import { BIL, TICK_AL_SECONDO } from '../../src/contenuti/bilanciamento';
import { MAPPE_FATTE, mappaFatta } from '../../src/battaglia/mappe';
import { generaMappa } from '../../src/battaglia/gen';
import { avanzaTick, creaBattaglia, eseguiComando } from '../../src/battaglia/sim';
import { capsulaUrta, MEZZA_ALTEZZA_PIRATA } from '../../src/battaglia/sim/terreno';
import { configSchermaglia } from '../../src/ui/battaglia/logica';
import { esploratore } from '../qa/raggiungibilita';

const A = BIL.arrampicata;
/** velocità più lenta tra salire e scendere (px/s): il tempo concesso è lunghezza / questa + 1 s (QA §3.1) */
const LENTA = Math.min(A.velocitaSu, A.velocitaGiu) * TICK_AL_SECONDO;
const tickConcessi = (lungo: number) => Math.ceil((lungo / LENTA + 1) * TICK_AL_SECONDO);

/** Battaglia con il pirata attivo in piedi ai piedi dell'appiglio i (sull'asse, sul suolo). */
function aiPiedi(mappa: MappaGenerata, i: number): StatoBattaglia {
  const cfg = configSchermaglia(42, [1, 1]);
  const s = creaBattaglia(cfg, mappa);
  const ev: never[] = [];
  while (s.turno.fase !== 'azione') avanzaTick(s, ev);
  const a = mappa.appigli![i];
  const p = s.pirati.find((q) => q.id === s.turno.pirata)!;
  p.x = a.x; p.y = a.yBasso - MEZZA_ALTEZZA_PIRATA - 4;
  while (!capsulaUrta(s.terreno, p.x, p.y + 1)) p.y++;
  p.aTerra = true; p.yInizioCaduta = p.y;
  return s;
}

const attivo = (s: StatoBattaglia) => s.pirati.find((q) => q.id === s.turno.pirata)!;
const piedi = (s: StatoBattaglia) => Math.floor(attivo(s).y) + MEZZA_ALTEZZA_PIRATA;

/** Tiene premuto arrampica finché il pirata è di nuovo in piedi a terra; restituisce i tick, o −1 se non ci arriva. */
function arrampica(s: StatoBattaglia, dir: -1 | 1, max: number): number {
  eseguiComando(s, { t: 'arrampica', dir });
  for (let k = 1; k <= max; k++) {
    avanzaTick(s, []);
    const p = attivo(s);
    if (p.appeso < 0 && p.aTerra && k > 1) return k;
  }
  return -1;
}

function provaAppigli(nome: string, mappa: MappaGenerata): void {
  const ap = mappa.appigli ?? [];
  for (let i = 0; i < ap.length; i++) {
    const a = ap[i], lungo = a.yBasso - a.yAlto, dove = `${nome}: ${a.tipo} in x ${a.x}`;
    const s = aiPiedi(mappa, i);
    const vita = attivo(s).vita;
    const su = arrampica(s, -1, tickConcessi(lungo));
    expect(su, `${dove}: salendo si ferma a metà (piedi a ${piedi(s)}, cima a ${a.yAlto})`).toBeGreaterThan(0);
    expect(Math.abs(piedi(s) - a.yAlto), `${dove}: in cima i piedi sono a ${piedi(s)}`).toBeLessThanOrEqual(A.piediCima);
    // dall'alto, da dove è arrivato: "scendi" lo riporta al suolo in fondo, senza cadere
    eseguiComando(s, { t: 'arrampica', dir: 0 });
    avanzaTick(s, []);
    const giu = arrampica(s, 1, tickConcessi(lungo));
    expect(giu, `${dove}: scendendo dall'alto non arriva in fondo (piedi a ${piedi(s)})`).toBeGreaterThan(0);
    expect(piedi(s), `${dove}: scendendo si ferma a ${piedi(s)}`).toBeGreaterThanOrEqual(a.yBasso - BIL.pirata.gradinoMax);
    expect(attivo(s).vita, `${dove}: scendere fa danno`).toBe(vita);
  }
}

describe('scale e liane si percorrono tutte, su e giù (QA §3.1)', () => {
  for (const id of Object.keys(MAPPE_FATTE)) {
    it(`${id}: ogni appiglio`, () => {
      const mappa = mappaFatta(id)!;
      expect(mappa.appigli?.length ?? 0).toBeGreaterThan(0);
      provaAppigli(id, mappa);
    });
  }

  it('isole generate (40 semi): ogni appiglio', () => {
    let quanti = 0;
    for (let seme = 1; seme <= 40; seme++) {
      const mappa = generaMappa({ seme, bioma: 'isola', piratiPerLato: [3, 3] });
      quanti += mappa.appigli?.length ?? 0;
      provaAppigli(`seme ${seme}`, mappa);
    }
    expect(quanti).toBeGreaterThan(20);
  });
});

/** Barili che si colpiscono ma non si raggiungono a piedi, per scelta (x del barile). */
const BARILI_IN_VETTA: Record<string, number[]> = { 'cala-pappagallo': [1052] }; // in cima alla Rocca

describe('dagli spawn si arriva a piedi dove serve (QA §3.2)', () => {
  for (const id of Object.keys(MAPPE_FATTE)) {
    it(`${id}: ogni spawn, ogni scala e liana, ogni barile`, () => {
      const mappa = mappaFatta(id)!;
      const copione = MAPPE_FATTE[id].copione === true;
      const esplora = esploratore(mappa);
      // nel Prologo (copione) contano solo i due pirati del giocatore: i marinai stanno dove dice la scena
      const partenze = copione ? mappa.spawn[0] : [...mappa.spawn[0], ...mappa.spawn[1]];
      for (const da of partenze) {
        const r = esplora.da([da]);
        const chi = `${id}, da (${da.x}, ${da.y})`;
        for (const p of partenze) expect(r.arriva(p.x, p.y, 4), `${chi}: non arriva allo spawn (${p.x}, ${p.y})`).toBe(true);
        (mappa.appigli ?? []).forEach((a, i) => {
          expect(r.saliti.has(i), `${chi}: non sale ${a.tipo} in x ${a.x}`).toBe(true);
          expect(r.scesi.has(i), `${chi}: non scende ${a.tipo} in x ${a.x}`).toBe(true);
        });
        for (const b of mappa.barili ?? []) {
          if (BARILI_IN_VETTA[id]?.includes(b.x)) continue;
          expect(r.arriva(b.x, b.y, 40), `${chi}: non arriva al barile in x ${b.x}`).toBe(true);
        }
        for (const [nome, p] of Object.entries(MAPPE_FATTE[id].segnaposti ?? {})) {
          if (nome !== 'cassa' && nome !== 'gradino') continue; // gli altri sono in mare o sono i marinai
          expect(r.arriva(p.x, p.y, 12), `${chi}: non arriva a "${nome}"`).toBe(true);
        }
      }
    });
  }
});
