// Le 8 isole del cap. 1 (Scenario e livelli, P2).
// Fase A: ogni seme passa il validatore AL PRIMO TENTATIVO, ha partenze eque e la forma che serve al suo trucco.
// Fase B: le isole vere (mappe fisse in battaglia/mappe/isola-*.dati.ts) nascono dal loro seme col trucco sopra:
// stesse partenze eque, niente staccato al tick 0, crolli lontani dalle partenze, e un colpo attiva il trucco.
// Se il generatore cambia, questo test cade: si rilanciano scegli-semi.ts e costruisci-isole.ts.
import { describe, expect, it, vi } from 'vitest';
import { CAPITOLO_1 } from '../../src/contenuti/capitolo-1';
import { generaMappa } from '../../src/battaglia/gen';
import { validaMappa } from '../../src/battaglia/gen/valida';
import { mappaFatta } from '../../src/battaglia/mappe';
import { ISOLE_FATTE } from '../../src/battaglia/mappe/isole-cap1';
import { codificaMaschera } from '../../src/battaglia/mappe/rle';
import { creaBattaglia } from '../../src/battaglia/sim';
import { esplodi } from '../../src/battaglia/sim/esplosione';
import { MEZZA_ALTEZZA_PIRATA } from '../../src/battaglia/sim/terreno';
import { BIL } from '../../src/contenuti/bilanciamento';
import { MATERIALE, type EventoBattaglia, type MappaGenerata, type StatoBattaglia } from '../../src/core/tipi';
import { misura, mareMassimo } from '../../scripts/mappe/isole/misure';
import { ATTACCANTE_Y_MAX, PROFILI, SCARTO_MAX } from '../../scripts/mappe/isole/profili';
import { controllaIsola, staccatiAlTick0 } from '../../scripts/mappe/isole/controlli';
import { base, costruisci } from '../../scripts/mappe/isole/costruisci-isole';
import { avanzaFinche, config } from '../sim/aiuti';

vi.setConfig({ testTimeout: 60_000 });

/** seme da cui nasce l'isola: quello in capitolo-1.ts o, per le isole vere, quello registrato in isole-cap1.ts */
const semeDi = (id: string) => {
  const i = CAPITOLO_1.isole.find((x) => x.id === id)!;
  return 'seme' in i.mappa ? i.mappa.seme : ISOLE_FATTE[id].seme;
};

function controllaPartenze(m: MappaGenerata, id: string, bandiera: boolean) {
  const mi = misura(m);
  expect(mi.scartoPeggiore).toBeLessThanOrEqual(SCARTO_MAX);
  expect(mi.attaccantePiuBasso).toBeLessThanOrEqual(ATTACCANTE_Y_MAX);
  if (id === '1A' || id === '1B') expect(mi.scartoPeggioreDifensore).toBeLessThanOrEqual(SCARTO_MAX);
  if (bandiera) expect(mi.vettaRaggiungibile).toBe(true);
  return mi;
}

describe('isole del cap. 1', () => {
  it('ogni isola ha un seme diverso', () => {
    const semi = CAPITOLO_1.isole.map((i) => semeDi(i.id));
    expect(new Set(semi).size).toBe(semi.length);
  });

  for (const isola of CAPITOLO_1.isole) {
    const seme = semeDi(isola.id);
    const bandiera = isola.scontro?.tipo === 'bandiera';
    it(`${isola.id} ${isola.trucco}: seme ${seme} valido al primo colpo, partenze eque, adatto al trucco`, () => {
      const m = generaMappa({ seme, bioma: isola.bioma, piratiPerLato: [3, 3] });
      expect(m.tentativi).toBe(1);
      expect(m.semeUsato).toBe(seme);
      expect(validaMappa(m)).toEqual([]);
      const mi = controllaPartenze(m, isola.id, bandiera);
      const profilo = PROFILI.find((p) => p.id === isola.id && p.trucco === isola.trucco);
      expect(profilo, `nessun profilo per ${isola.id} ${isola.trucco}`).toBeDefined();
      expect(profilo!.adatto(mi)).toBe(true);
    });

    if ('fissa' in isola.mappa) {
      const id = isola.mappa.fissa;
      it(`${isola.id} ${isola.trucco}: l'isola vera ${id} nasce dal seme ${seme} e regge le regole`, () => {
        expect(ISOLE_FATTE[isola.id].mappa).toBe(id);
        const m = mappaFatta(id)!;
        expect(m, id).not.toBeNull();
        // i dati scritti sono quelli che lo script costruisce oggi
        const nuova = costruisci(isola.id);
        expect(codificaMaschera(m.terreno.maschera)).toBe(codificaMaschera(nuova.terreno.maschera));
        expect(m.spawn).toEqual(nuova.spawn);
        expect(m.strutture ?? []).toEqual(nuova.strutture ?? []);
        // stesse partenze della mappa del seme
        expect(m.spawn).toEqual(base(seme, isola.bioma).spawn);
        expect(validaMappa(m)).toEqual([]);
        controllaPartenze(m, isola.id, bandiera);
        expect(staccatiAlTick0(m)).toEqual([]);
        expect(controllaIsola(m)).toEqual([]);
      });
    }
  }

  it('1G (marea): la mappa regge il validatore intero fino al mare della Marea alta', () => {
    const m = generaMappa({ seme: semeDi('1G'), bioma: 'isola', piratiPerLato: [5, 5] });
    expect(mareMassimo(m)).toBeLessThanOrEqual(900);
  });
});

// ─── Un colpo attiva il trucco: prove con la sim vera (sim/crolli.ts, sim/pezzi.ts) ────────────────────────────

/** Battaglia sull'isola vera, già al turno dei crolli, con i pirati dove si vuole (piedi). */
function battaglia(id: string, piedi: { x: number; y: number }[]): StatoBattaglia {
  const s = creaBattaglia(config(1, 1), mappaFatta(id)!);
  s.turno.numero = BIL.crolli.dalTurno;
  piedi.forEach((p, k) => { s.pirati[k].x = p.x; s.pirati[k].y = p.y - MEZZA_ALTEZZA_PIRATA; s.pirati[k].vx = 0; s.pirati[k].vy = 0; });
  return s;
}

/** Spara un colpo di cannone in (x, y) e lascia assestare tutto. */
function colpo(s: StatoBattaglia, x: number, y: number): EventoBattaglia[] {
  const ev: EventoBattaglia[] = [];
  esplodi(s, x, y, 'cannone', 'teschio', ev);
  return ev.concat(avanzaFinche(s, (q) => (q.pezzi?.length ?? 0) === 0 && q.pirati.every((p) => Math.abs(p.vy) < 0.01 && Math.abs(p.vx) < 0.01), 900));
}

/** Pixel di legno rimasti dentro un rettangolo. */
function legno(s: StatoBattaglia, r: { x0: number; y0: number; x1: number; y1: number }): number {
  const t = s.terreno;
  let n = 0;
  for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (t.maschera[y * t.w + x] === MATERIALE.legno) n++;
  return n;
}

describe('un colpo attiva il trucco', () => {
  for (const [isola, id] of [['1D', 'isola-1d']] as const) {
    it(`${isola}: un colpo alla base dei pali fa crollare la torre con chi c'è sopra, senza morte sicura`, () => {
      const torri = mappaFatta(id)!.strutture!.filter((t) => t.tipo === 'torre');
      expect(torri.length).toBe(2);
      for (const st of torri) {
        // pirata in piedi sul piano della torre: l'ultimo legno con aria sopra prima del vuoto tra i pali (≥ 40 px; sotto il tetto ce ne sono 28)
        const m = mappaFatta(id)!;
        const xm = Math.round((st.x0 + st.x1) / 2);
        const pieno = (y: number) => m.terreno.maschera[y * m.terreno.w + xm] !== MATERIALE.aria;
        let piano = -1, y = st.y0;
        for (; y < m.terreno.h; y++) {
          if (pieno(y) && !pieno(y - 1)) piano = y;
          let vuoto = 0;
          while (pieno(y) && y < m.terreno.h) y++;
          while (!pieno(y + vuoto) && y + vuoto < m.terreno.h) vuoto++;
          if (vuoto >= 40) { y += vuoto; break; }
          y += vuoto - 1;
        }
        const suolo = y;
        const s = battaglia(id, [{ x: xm, y: piano }]);
        const sopra = s.pirati[0], vita = sopra.vita;
        const prima = legno(s, st);
        // base dei pali: il colpo arriva sul suolo sotto il centro della torre
        const ev = colpo(s, xm, suolo + 6);
        const crolli = ev.filter((e) => e.t === 'crollo');
        expect(crolli.length, `torre ${st.x0}-${st.x1}`).toBeGreaterThan(0);
        expect(legno(s, st), `torre ${st.x0}-${st.x1}: legno rimasto`).toBeLessThan(prima * 0.2);
        // chi era sopra è caduto ed è vivo: danno massimo misurato (scoppio vicino + macerie + caduta)
        expect(sopra.stato).toBe('vivo');
        const danno = vita - sopra.vita;
        expect(danno, `torre ${st.x0}-${st.x1}: danno a chi stava sopra`).toBeLessThanOrEqual(40);
        console.log(`${isola} torre ${st.x0}-${st.x1}: ${crolli.length} crolli, danno a chi stava sopra ${danno} PV su ${vita}`);
      }
    });
  }

  it('1C: il portone di legno si sfonda, l\'architrave di ferro resta', () => {
    const m = mappaFatta('isola-1c')!;
    const s = battaglia('isola-1c', []);
    const portone = { x0: 900, y0: 480, x1: 915, y1: 545 };
    const ferro = () => { let n = 0; for (let y = portone.y0; y <= portone.y1; y++) for (let x = portone.x0; x <= portone.x1; x++) if (s.terreno.maschera[y * s.terreno.w + x] === MATERIALE.ferro) n++; return n; };
    const f0 = ferro(), l0 = legno(s, portone);
    expect(f0).toBeGreaterThan(0);
    expect(l0).toBeGreaterThan(0);
    void m;
    colpo(s, 890, 520);
    expect(ferro()).toBe(f0);
    expect(legno(s, portone)).toBeLessThan(l0);
  });
});
