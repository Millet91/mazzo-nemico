// La mappa di una battaglia a partire dalla sua configurazione: un posto solo, usato da partita, diagnostica e test,
// così un replay si rigioca sempre sulla stessa mappa. PURO e deterministico.
//  - `mappaFissa`: mappa fatta a mano (battaglia/mappe); se l'id non esiste si ripiega sul generatore;
//  - `semeMappa`: il generatore usa questo seme per la mappa, e `seme` resta per vento, casse e IA (carriera, P2:
//    un'isola ha sempre la stessa forma, ma ogni tentativo ha il suo vento);
//  - altrimenti il generatore usa `seme`, come sempre.
import type { ConfigBattaglia, MappaGenerata } from '../core/tipi';
import { generaMappa } from './gen';
import { mappaFatta } from './mappe';

export function mappaDiConfig(c: ConfigBattaglia): MappaGenerata {
  return (c.mappaFissa ? mappaFatta(c.mappaFissa, c) : null) ?? generaMappa({
    seme: c.semeMappa ?? c.seme, bioma: c.bioma, variante: c.variante,
    piratiPerLato: [c.squadre[0].pirati, c.squadre[1].pirati],
  });
}
