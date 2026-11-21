# battaglia/gen/ — generatore di mappe da seme e bioma (puro). Proprietario: agente Generatore (da M1, ramo claude/m1-gen).

- `index.ts` — `generaMappa` (firma del contratto) e `tentativo(seme)`.
- `tentativi.ts` — seme, seme+1, … fino a 8 tentativi, poi il seme di riserva (`tentativi = 0`).
- `isola.ts` — terreno dell'Isola tropicale: profilo da parametri (spiaggia, riva aperta ≤ 38° con orlo di 10-40 px, piana che sale verso l'interno, 1-2 colline al centro con cima mai sopra y 250), rumore 1D, grotte a metaball, strati, massi.
- `spawn.ts` — requisiti dei posti (06 §4), equità tra i lati, regole anti-frustrazione (06 §7).
- `valida.ts` — `validaMappa(mappa)`: elenco dei problemi di una mappa qualsiasi (vuoto = valida). Lo usano generatore e test.
- `barili.ts` — 3-4 barili di polvere (m1-ritmo §9): in piano (spiana un gradino se serve), sopra il mare, ≥ 200 px dagli spawn.
- `misura.ts` — `misuraMare(mappe)`: quanti spawn finiscono in mare spinti verso la riva (misura del Lead design).
- `analisi.ts` — superficie, voli balistici semplificati (un punto, senza rimbalzi), linea di tiro, camminata.
- `parametri.ts` — tutti i numeri del livello e il seme di riserva. Fisica, mare e armi si leggono da `BIL` e `ARMA`.

Ordine degli spawn di ogni lato: dal più interno al più esterno. La sim usa i primi N, quindi con 3 pirati restano liberi i posti vicino al mare.

Test: `tests/gen/` (determinismo con impronte d'oro, validazione su 200 semi, riserva, tempo).
