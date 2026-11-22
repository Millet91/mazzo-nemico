// Fase 3 · il campo si spezza (P1-contratti §7, docs/progetto/studio-v2/fase3-strutture.md): le regole che spettano
// alla mappa. Il sostegno, i pezzi che cadono e le prove "un colpo, danno massimo" sono della Fisica; qui si controlla
// che i dati della Cala v3 reggano al tick 0 e che nessuna partenza tenga su una struttura.
import { describe, expect, it } from 'vitest';
import { BIL } from '../../src/contenuti/bilanciamento';
import { MAPPE_FATTE, mappaFatta } from '../../src/battaglia/mappe';
import { generaMappa } from '../../src/battaglia/gen';
import { pezziStaccati as pezziStaccatiSim } from '../../src/battaglia/sim/crolli';
import { creaBattaglia } from '../../src/battaglia/sim';
import { config } from '../sim/aiuti';
import { MATERIALE, type Bioma, type MappaGenerata, type Rettangolo, type TipoStruttura } from '../../src/core/tipi';
import {
  costruisciMaschera, cimeDelleStrutture, nellaZona, DISTANZA_CROLLO, FONDALE, MASSI, SOSTEGNI, W, type Variante,
} from '../../scripts/mappe/cala-v3-forma';

const MAPPE: [string, Variante][] = [['cala-pappagallo-v3', 'base'], ['cala-pappagallo-v3-prologo', 'prologo']];
const dentro = (r: Rettangolo, x: number, y: number) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

/** pezzi 4-connessi del solido (`conta` sceglie i pixel) con i px, l'ingombro e se toccano un appoggio */
function pezziStaccati(mappa: MappaGenerata, conta: (v: number) => boolean = (v) => v !== MATERIALE.aria) {
  const { w, h, maschera: m } = mappa.terreno, sost = mappa.sostegni ?? [];
  const vis = new Uint8Array(w * h), pila: number[] = [], out: { px: number; box: number[]; sostegni: number[]; primo: number }[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!conta(m[i]) || vis[i]) continue;
    let px = 0, appoggiato = false;
    const box = [w, h, -1, -1], tocca = new Set<number>();
    vis[i] = 1; pila.push(i);
    while (pila.length) {
      const j = pila.pop()!, x = j % w, y = (j - x) / w;
      px++;
      if (m[j] === MATERIALE.ferro || y >= FONDALE) appoggiato = true;
      sost.forEach((r, k) => { if (dentro(r, x, y)) tocca.add(k); });
      box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y);
      for (const k of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w]) if (k >= 0 && k < w * h && conta(m[k]) && !vis[k]) { vis[k] = 1; pila.push(k); }
    }
    if (!appoggiato && !tocca.size) out.push({ px, box, sostegni: [...tocca].sort(), primo: i });
  }
  return out;
}

describe('Fase 3 · strutture e sostegni della Cala v3', () => {
  for (const [id, variante] of MAPPE) {
    const forma = costruisciMaschera(variante);
    const mappa = mappaFatta(id)!;

    it(`${id}: sostegni e strutture nei dati sono quelli della forma`, () => {
      expect(mappa.sostegni).toEqual(SOSTEGNI);
      expect(mappa.strutture).toEqual(forma.strutture.map(({ tipo, x0, y0, x1, y1, ancoraggi }) => ({ tipo, x0, y0, x1, y1, ...(ancoraggi ? { ancoraggi } : {}) })));
      const quante = (t: TipoStruttura) => mappa.strutture!.filter((s) => s.tipo === t).length;
      expect([quante('torre'), quante('ponte'), quante('masso'), quante('cengia')]).toEqual([2, 2, 2, 2]);
      // le copie non si toccano tra battaglie
      expect(mappaFatta(id)!.strutture![0]).not.toBe(mappa.strutture![0]);
    });

    it(`${id}: al tick 0 non c'è niente di staccato (ogni pezzo tocca il fondale o un sostegno)`, () => {
      expect(pezziStaccati(mappa)).toEqual([]);
    });

    it(`${id}: senza il legno, ogni massa alta ha almeno due sostegni pieni, tutti dentro una massa sola`, () => {
      const masse = pezziStaccati({ ...mappa, sostegni: [] }, (v) => v !== MATERIALE.aria && v !== MATERIALE.legno);
      // le tre masse della proposta: Mesa sinistra, Rocca, Mesa destra (44-72 mila px, oltre BIL.crolli.pezzoMaxPx)
      expect(masse).toHaveLength(3);
      const { w, maschera: m } = mappa.terreno;
      SOSTEGNI.forEach((r, k) => {
        let pieni = 0, tot = 0;
        for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { tot++; if (m[y * w + x] && m[y * w + x] !== MATERIALE.legno) pieni++; }
        expect(pieni / tot, `A${k + 1} pieno`).toBeGreaterThanOrEqual(0.95);
      });
      for (const massa of masse) {
        expect(massa.px, `massa ${massa.box}`).toBeGreaterThan(BIL.crolli.pezzoMaxPx);
        const loro = SOSTEGNI.map((r, k) => k).filter((k) => {
          const r = SOSTEGNI[k];
          return r.x0 >= massa.box[0] && r.x1 <= massa.box[2] && r.y0 >= massa.box[1] && r.y1 <= massa.box[3];
        });
        expect(loro.length, `massa ${massa.box}`).toBeGreaterThanOrEqual(2);
      }
      // e con i sostegni nessuna massa resta senza appoggio anche se i ponti di legno se ne vanno
      const conSostegni = pezziStaccati({ ...mappa }, (v) => v !== MATERIALE.aria && v !== MATERIALE.legno);
      expect(conSostegni).toEqual([]);
    });

    it(`${id}: col sostegno della sim le tre masse alte restano su; senza sostegni si staccherebbero`, () => {
      // la sim (crolli.ts) parte dai pixel di bordo vicini allo scoppio: qui dal primo pixel di ogni massa, con il
      // tetto dei pixel alzato perché la ricerca arrivi in fondo (con 6000 px le masse reggerebbero comunque)
      const masse = pezziStaccati({ ...mappa, sostegni: [] });
      expect(masse.length).toBeGreaterThanOrEqual(1);
      const s = creaBattaglia(config(1, 1), mappaFatta(id)!);
      expect(s.sostegni).toEqual(SOSTEGNI);
      expect(s.strutture?.map((st) => st.stato)).toEqual(mappa.strutture!.map(() => 'intera'));
      const t = mappa.terreno, opz = { pezzoMax: t.w * t.h, ricercheMax: 64 };
      for (const massa of masse) {
        const x = massa.primo % t.w, y = Math.floor(massa.primo / t.w);
        expect(pezziStaccatiSim(t, x, y, 2, { ...opz, sostegni: s.sostegni }), `(${x}, ${y})`).toEqual([]);
        expect(pezziStaccatiSim(t, x, y, 2, { ...opz, sostegni: [] }).length, `(${x}, ${y}) senza sostegni`).toBeGreaterThan(0);
      }
    });

    it(`${id}: ogni struttura ha i suoi pezzi etichettati, dentro il suo rettangolo`, () => {
      const px = new Map<number, number>();
      for (let i = 0; i < forma.pezzo.length; i++) if (forma.pezzo[i] && forma.m[i]) px.set(forma.pezzo[i], (px.get(forma.pezzo[i]) ?? 0) + 1);
      const attesi: Record<TipoStruttura, [number, number]> = { torre: [5, 6], ponte: [8, 8], masso: [1, 1], cengia: [2, 2] };
      for (const st of forma.strutture) {
        const [min, max] = attesi[st.tipo];
        expect(st.pezzi.length, st.nome).toBeGreaterThanOrEqual(min);
        expect(st.pezzi.length, st.nome).toBeLessThanOrEqual(max);
        for (const p of st.pezzi) expect(px.get(p) ?? 0, `${st.nome}: ${forma.pezzi[p - 1].nome}`).toBeGreaterThan(BIL.crolli.briciolePx);
      }
      for (let i = 0; i < forma.pezzo.length; i++) if (forma.pezzo[i] && forma.m[i]) {
        const st = forma.strutture[forma.pezzi[forma.pezzo[i] - 1].struttura], x = i % W, y = (i - x) / W;
        if (!dentro(st, x, y)) throw new Error(`${st.nome}: pixel (${x}, ${y}) fuori dal rettangolo`);
      }
    });

    it(`${id}: i due capi di ogni ponte toccano assi e roccia`, () => {
      const { w, maschera: m } = mappa.terreno;
      for (const st of mappa.strutture!.filter((s) => s.tipo === 'ponte')) {
        expect(st.ancoraggi).toHaveLength(2);
        expect(st.ancoraggi![0].x0).toBeLessThan(st.ancoraggi![1].x0);
        for (const a of st.ancoraggi!) {
          let legno = 0, roccia = 0;
          for (let y = a.y0; y <= a.y1; y++) for (let x = a.x0; x <= a.x1; x++) {
            const v = m[y * w + x];
            if (v === MATERIALE.legno) legno++; else if (v) roccia++;
          }
          expect([legno > 0, roccia > 0], `capo in x ${a.x0}-${a.x1}`).toEqual([true, true]);
        }
      }
    });

    it(`${id}: i massi poggiano solo sulla loro cengia, staccati dal fianco della Rocca`, () => {
      for (const st of forma.strutture.filter((s) => s.tipo === 'masso')) {
        const [idMasso] = st.pezzi;
        const cengia = forma.strutture.find((c) => c.tipo === 'cengia' && c.nome.endsWith(st.nome.split(' ')[1]))!;
        let base = 0;
        for (let i = 0; i < forma.pezzo.length; i++) if (forma.pezzo[i] === idMasso && forma.m[i]) {
          for (const k of [i - 1, i + 1, i - W, i + W]) if (forma.m[k] && forma.pezzo[k] !== idMasso) {
            expect(cengia.pezzi, `${st.nome} tocca (${k % W}, ${Math.floor(k / W)})`).toContain(forma.pezzo[k]);
            base++;
          }
        }
        expect(base, `${st.nome}: base piatta sulla cengia`).toBeGreaterThanOrEqual(10);
      }
    });

    it(`${id}: nessuna partenza sotto una struttura (colonna per colonna, ±${BIL.crolli.rispettoSpawnPx} px), né a meno di ${DISTANZA_CROLLO} px da un masso`, () => {
      const cime = cimeDelleStrutture(forma);
      // nel Prologo contano i pirati del giocatore: i marinai li mette la scena
      const chi = MAPPE_FATTE[id].copione ? mappa.spawn[0] : [...mappa.spawn[0], ...mappa.spawn[1]];
      for (const p of chi) {
        forma.strutture.forEach((st, k) => expect(nellaZona(cime[k], p, BIL.crolli.rispettoSpawnPx), `(${p.x}, ${p.y}) sotto ${st.nome}`).toBe(false));
        for (const b of MASSI) expect(Math.hypot(b.x - p.x, b.y - p.y), `(${p.x}, ${p.y}) dal masso in (${b.x}, ${b.y})`).toBeGreaterThanOrEqual(DISTANZA_CROLLO);
      }
    });
  }

  it('isole generate: al tick 0 non c\'è niente di staccato dal fondale (non hanno sostegni)', () => {
    const biomi: Bioma[] = ['isola', 'cimitero', 'scogliera', 'porto', 'ghiacci', 'grotta'];
    for (let seme = 1; seme <= 18; seme++) {
      const bioma = biomi[seme % biomi.length];
      const g = generaMappa({ seme, bioma, piratiPerLato: [3, 3] });
      expect(g.sostegni, `seme ${seme}`).toBeUndefined();
      expect(pezziStaccati(g), `seme ${seme} ${bioma}`).toEqual([]);
    }
  }, 30_000);   // 18 isole da generare: 2,4 s qui, oltre i 5 s predefiniti sul runner dell'apk
});
