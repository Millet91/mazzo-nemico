# battaglia/ia/ — IA di battaglia, in Web Worker (puro). Proprietario: agente IA (da M1, ramo claude/m1-ia).

- `index.ts` — API del contratto: `decidi` (puro) e `creaIa` (client del worker, con ripiego sul posto).
- `pianifica.ts` — il cervello (01 §8): linee di tiro, correzione della potenza, punteggio, scelta tra i migliori,
  errore umano controllato, fuga. Tutti i numeri da `BIL.ia`. `decidiCon` accetta il simulatore (per i test).
- `terreno.ts` — letture della maschera: suolo, strada sicura, riparo.
- `worker.ts` — il Web Worker.

Livelli: Mozzo completo per M1. Nostromo e Capitano leggono già `BIL.ia.livelli` (simulazioni, errore, vento,
scelta tra i migliori); in M2 vanno aggiunte le posizioni candidate (K) e le armi speciali.
