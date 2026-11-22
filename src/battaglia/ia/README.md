# battaglia/ia/ — IA di battaglia, in Web Worker (puro). Proprietario: agente IA (da M1, ramo claude/m1-ia).

- `index.ts` — API del contratto: `decidi` (puro) e `creaIa` (client del worker, con ripiego sul posto).
- `pianifica.ts` — il cervello (01 §8): linee di tiro, correzione della potenza, punteggio, scelta tra i migliori,
  errore umano controllato, fuga. Tutti i numeri da `BIL.ia`. `decidiCon` accetta il simulatore (per i test).
- `terreno.ts` — letture della maschera: suolo, strada sicura, riparo.
- `worker.ts` — il Web Worker.

Livelli: Mozzo completo per M1. Nostromo e Capitano leggono già `BIL.ia.livelli` (simulazioni, errore, vento,
scelta tra i migliori); in M2 vanno aggiunte le posizioni candidate (K) e le armi speciali.

Ritmo (studio v2, Fase 1): il turno dell'IA deve stare in `BIL.ritmo.iaTurnoMaxTick` (4 s). `VOLO_IA_MAX` è il tempo
di volo che resta tolte inquadratura, mira visibile e risoluzione: tra i tiri migliori l'IA sceglie quelli che arrivano in
tempo se valgono almeno il 70% del primo, e un pallonetto lento conta come caduto 25 px più in là. `PASSI_FUGA` è la
strada della fuga di 1,5 s. Misura in `tests/qa/ritmo.test.ts`.
