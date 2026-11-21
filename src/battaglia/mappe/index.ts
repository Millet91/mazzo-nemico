// Mappe fatte a mano (06 §6): caricatore PURO e deterministico (lo usano sim, worker dell'IA e test).
// Proprietario: agente Arte/livelli (ramo claude/m1-mappa-arte). I dati li scrive scripts/mappe/costruisci.ts.
import type { MappaGenerata, RichiestaMappa } from '../../core/tipi';
import { decodificaMaschera } from './rle';
import type { DatiMappaFatta } from './tipi';
import { DATI as CALA_PAPPAGALLO } from './cala-pappagallo.dati';

export type { DatiMappaFatta };

export const MAPPE_FATTE: Record<string, DatiMappaFatta> = {
  [CALA_PAPPAGALLO.id]: CALA_PAPPAGALLO,
};

/** La maschera decodificata si tiene in cache: ogni battaglia ne riceve una copia (i crateri la scavano). */
const cache = new Map<string, Uint8Array>();

/** Mappa fatta a mano pronta per creaBattaglia. `null` se l'id non esiste (allora si genera). */
export function mappaFatta(id: string, r?: Pick<RichiestaMappa, 'bioma' | 'variante'>): MappaGenerata | null {
  const d = MAPPE_FATTE[id];
  if (!d) return null;
  let m = cache.get(id);
  if (!m) { m = decodificaMaschera(d.maschera, d.w * d.h); cache.set(id, m); }
  return {
    terreno: { w: d.w, h: d.h, maschera: m.slice(), mare: d.mare },
    spawn: [d.spawn[0].map((p) => ({ ...p })), d.spawn[1].map((p) => ({ ...p }))],
    bioma: r?.bioma ?? d.bioma,
    variante: r?.variante,
    semeUsato: 0,
    tentativi: 1,
    specchiata: false,
    decorazioni: d.decorazioni.map((x) => ({ ...x })),
    barili: d.barili.map((p) => ({ ...p })),
    ...(d.appigli ? { appigli: d.appigli.map((a) => ({ ...a })) } : {}),
    arte: d.arte,
  };
}
