// Raggiungibilità (QA studio v2 §3.2, PIANO Fase 0): da dove parte un pirata, dove arriva con le MOSSE VERE della sim?
// Esplora i posti in cui un pirata può stare in piedi, usando le stesse funzioni della battaglia: `cammina` (un px
// per volta, gradino 8 px), il salto in avanti (`vola`), e scale e liane (`provaAggrappo` + `aggiornaAppeso`).
// Non usa il salto all'indietro (lo studio v2 lo abolisce): la mappa non deve dipenderne.
// Chi finisce in mare è morto: quel passo non conta. Il danno da caduta non ferma l'esplorazione.
// Proprietario: Lead test/QA. Lo usa tests/mappe/percorribilita.test.ts.
import type { Appiglio, MappaGenerata, Pirata, Punto, StatoBattaglia, Terreno } from '../../src/core/tipi';
import { BIL } from '../../src/contenuti/bilanciamento';
import { cammina, espelli, inAcqua, vola, type Corpo } from '../../src/battaglia/sim/pirata';
import { aggiornaAppeso, provaAggrappo } from '../../src/battaglia/sim/appigli';
import { capsulaUrta, MEZZA_ALTEZZA_PIRATA } from '../../src/battaglia/sim/terreno';

const TICK_VOLO_MAX = 900;
const TICK_SCALA_MAX = 900;

export interface Esplorazione {
  /** il pirata può arrivare a stare in piedi entro `raggio` px da (x, piedi)? */
  arriva(x: number, piedi: number, raggio?: number): boolean;
  /** appigli (indice in mappa.appigli) saliti fino in cima / scesi fino in fondo almeno una volta */
  saliti: Set<number>;
  scesi: Set<number>;
  /** quanti posti in piedi ha visitato */
  posti: number;
}

/** Esploratore con memoria: gli archi (da un posto, dove si arriva) si calcolano una volta sola per mappa. */
export function esploratore(mappa: MappaGenerata) {
  const t: Terreno = { ...mappa.terreno, maschera: mappa.terreno.maschera };
  const appigli: Appiglio[] = (mappa.appigli ?? []).map((a, i) => ({ id: i, tipo: a.tipo, x: a.x, yAlto: Math.min(a.yAlto, a.yBasso), yBasso: Math.max(a.yAlto, a.yBasso) }));
  const stato = { terreno: t, appigli } as unknown as StatoBattaglia;
  const W = t.w;
  const chiave = (x: number, y: number) => y * W + x;
  interface Archi { verso: number[]; saliti: number[]; scesi: number[] }
  const archi = new Map<number, Archi>();

  /** fa cadere/volare il corpo finché si ferma: restituisce la chiave del posto, o −1 se annega o non si ferma */
  function atterra(c: Corpo): number {
    for (let k = 0; k < TICK_VOLO_MAX; k++) {
      if (inAcqua(c, t.mare)) return -1;
      if (vola(t, c) >= 0) return inAcqua(c, t.mare) ? -1 : chiave(Math.floor(c.x), Math.floor(c.y));
    }
    return -1;
  }

  function pirataIn(x: number, y: number): Pirata {
    return {
      id: 0, squadra: 0, nome: '', x, y, vx: 0, vy: 0, vita: 70, vitaMax: 70, verso: 1, aTerra: true, stato: 'vivo',
      yInizioCaduta: y, dannoNelTurno: 0, appeso: -1,
    };
  }

  function calcola(x: number, y: number): Archi {
    const out: Archi = { verso: [], saliti: [], scesi: [] };
    for (const dir of [-1, 1] as const) {
      // un passo
      const c: Corpo = { x, y, vx: 0, vy: 0, aTerra: true, yInizioCaduta: y };
      if (cammina(t, c, dir)) out.verso.push(c.aTerra ? chiave(Math.floor(c.x), Math.floor(c.y)) : atterra(c));
      // un salto in avanti
      const s: Corpo = { x, y, vx: BIL.pirata.saltoAvanti.vx * dir, vy: BIL.pirata.saltoAvanti.vy, aTerra: false, yInizioCaduta: y };
      out.verso.push(atterra(s));
    }
    // scale e liane: su e giù fino in fondo, tenendo il comando
    for (const su of [-1, 1] as const) {
      const p = pirataIn(x, y);
      if (!provaAggrappo(stato, p, su, [])) continue;
      const a = appigli.find((q) => q.id === p.appeso)!;
      let appeso = true;
      for (let k = 0; k < TICK_SCALA_MAX && appeso; k++) appeso = aggiornaAppeso(stato, p, su, []);
      if (appeso) continue; // fermo a metà: non è arrivato da nessuna parte
      const piedi = p.y + MEZZA_ALTEZZA_PIRATA;
      const arrivo = p.aTerra ? chiave(Math.floor(p.x), Math.floor(p.y)) : atterra(p);
      if (arrivo < 0) continue;
      out.verso.push(arrivo);
      if (su === -1 && p.aTerra && piedi <= a.yAlto + 2) out.saliti.push(a.id);
      if (su === 1 && p.aTerra && piedi >= a.yBasso - BIL.pirata.gradinoMax - 2) out.scesi.push(a.id);
    }
    return out;
  }

  /** Tutti i posti raggiungibili partendo dai punti dati (centro dei piedi, come gli spawn). */
  function da(partenze: Punto[]): Esplorazione {
    const visti = new Set<number>();
    const saliti = new Set<number>(), scesi = new Set<number>();
    const coda: number[] = [];
    for (const p of partenze) {
      // come in battaglia: chi nasce nel solido viene espulso nell'aria più vicina, poi cade al suolo
      const c: Corpo = { x: p.x, y: p.y - MEZZA_ALTEZZA_PIRATA, vx: 0, vy: 0, aTerra: true, yInizioCaduta: p.y };
      espelli(t, c);
      const k = capsulaUrta(t, c.x, c.y + 1) ? chiave(Math.floor(c.x), Math.floor(c.y)) : atterra({ ...c, aTerra: false });
      if (k >= 0 && !visti.has(k)) { visti.add(k); coda.push(k); }
    }
    for (let i = 0; i < coda.length; i++) {
      const k = coda[i], x = k % W, y = (k - x) / W;
      let a = archi.get(k);
      if (!a) { a = calcola(x, y); archi.set(k, a); }
      for (const id of a.saliti) saliti.add(id);
      for (const id of a.scesi) scesi.add(id);
      for (const n of a.verso) if (n >= 0 && !visti.has(n)) { visti.add(n); coda.push(n); }
    }
    return {
      saliti, scesi, posti: visti.size,
      arriva(px, piedi, raggio = 0) {
        const cy = piedi - MEZZA_ALTEZZA_PIRATA;
        for (let dy = -raggio; dy <= raggio; dy++) for (let dx = -raggio; dx <= raggio; dx++) {
          if (dx * dx + dy * dy <= raggio * raggio && visti.has(chiave(px + dx, cy + dy))) return true;
        }
        return false;
      },
    };
  }

  return { da };
}
