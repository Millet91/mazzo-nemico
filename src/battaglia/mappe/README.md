# battaglia/mappe/ — mappe fatte a mano (06 §6). Proprietario: agente Arte/livelli (ramo claude/m1-mappa-arte).

- `index.ts` — `mappaFatta(id)`: MappaGenerata pronta per `creaBattaglia`, pura e deterministica. La sceglie
  `ConfigBattaglia.mappaFissa` (Partita); senza, si genera dal seme come prima.
- `<id>.dati.ts` — GENERATO da `scripts/mappe/costruisci.ts`: maschera compressa (`rle.ts`), spawn, barili, decorazioni.
- Grafica in `public/assets/mappe/<id>/` (la carica `render/sfondi-mappa.ts`; ogni file è facoltativo):
  `terreno.webp` 2048×1024 (alfa 255 = solido, alfa < 128 = aria; tra i due: parete dipinta di grotte e archi),
  `cielo.webp`, `lontano.webp` e `medio.webp` (strisce in parallasse appoggiate all'orizzonte), `palma/cespuglio/masso/rovina.webp`.

## Rifare la grafica

Grafica disegnata in codice (oggi):
```
npx tsx scripts/mappe/costruisci.ts                       # forma → maschera + /tmp/claude-0/<id>-materiali.png
CHROMIUM=/opt/pw-browsers/chromium node scripts/mappe/dipingi/esegui.cjs /tmp/claude-0/cala-pappagallo-materiali.png /tmp/claude-0/arte
python3 scripts/mappe/prepara_arte.py /tmp/claude-0/arte cala-pappagallo --pittore
npx tsx scripts/mappe/costruisci.ts /tmp/claude-0/arte/terreno.png   # maschera dai pixel del quadro + validaMappa
```

Immagini di Magnific (Space "Mappa Cala Pappagallo", sfondo verde #00FF00): salvarle come `terreno.png`, `cielo.png`,
`lontano.png`, `medio.png`, `oggetti.png` (griglia 2×2) in una cartella, poi
`python3 scripts/mappe/prepara_arte.py <cartella> cala-pappagallo` e `costruisci.ts /tmp/claude-0/cala-pappagallo-terreno.png`.
Se `validaMappa` rifiuta il quadro (spawn, cima, riempimento) lo script si ferma e dice perché.
Si può sostituire anche un solo file (per esempio solo il cielo): il codice non cambia.
