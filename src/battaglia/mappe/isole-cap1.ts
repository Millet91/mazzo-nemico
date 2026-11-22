// Le isole vere del cap. 1 (Pacchetto 2, agente Scenario e livelli): mappe fisse costruite da
// scripts/mappe/isole/costruisci-isole.ts a partire dal seme validato di ogni isola (livelli-cap1.md §2-3).
// Un'isola entra qui quando il suo trucco è pronto; le altre restano a seme in contenuti/capitolo-1.ts.
import type { DatiMappaFatta } from './tipi';
import { DATI as ISOLA_1C } from './isola-1c.dati';
import { DATI as ISOLA_1D } from './isola-1d.dati';

/** isola → id della mappa fissa e seme da cui nasce (forma e partenze eque scelte in Fase A) */
export const ISOLE_FATTE: Record<string, { mappa: string; seme: number }> = {
  '1C': { mappa: 'isola-1c', seme: 2103 },
  '1D': { mappa: 'isola-1d', seme: 2452 },
};

export const DATI_ISOLE: DatiMappaFatta[] = [ISOLA_1C, ISOLA_1D];
