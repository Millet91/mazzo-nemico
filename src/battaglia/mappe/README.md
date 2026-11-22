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

## Cala Pappagallo v3 (studio v2, Pacchetto 1)

Mappe `cala-pappagallo-v3` e `cala-pappagallo-v3-prologo`: pronte per la Fase 2, non ancora nel menu (la Schermaglia
usa ancora `cala-pappagallo`). Forma in `scripts/mappe/cala-v3-forma.ts` (non è più uno specchio: a sinistra la poppa
del relitto fa da torre, a destra la Duna con la rampa di sabbia; muretti e casse; Grotta della Liana; Occhio della Rocca).

```
npx tsx scripts/mappe/costruisci-v3.ts                      # forma → dati delle due mappe + materiali per il pittore
CHROMIUM=/opt/pw-browsers/chromium node scripts/mappe/dipingi/esegui.cjs /tmp/claude-0/cala-pappagallo-v3-materiali.png <cartella>      # quadro 2048×1024
CHROMIUM=/opt/pw-browsers/chromium node scripts/mappe/dipingi/esegui.cjs /tmp/claude-0/cala-pappagallo-v3-materiali.png <cartella> 2    # quadro HD 4096×2048 (terreno@2x.png)
npx tsx scripts/mappe/costruisci-v3.ts <cartella>           # controlla che l'alfa del quadro sia la maschera e segna `arte`
```

Il quadro di oggi in `public/assets/mappe/cala-pappagallo-v3/terreno.webp` è una bozza del pittore a 1×: quello
definitivo a 2× arriva in Fase 2, quando il Render carica il terreno HD. La collisione resta la maschera 2048×1024.
Le regole in più della v3 le prova `tests/mappe/cala-v3.test.ts`: muretti e casse da 24-32 px, nessuna partenza a meno
di 120 px da una torre, un colpo diretto del cannone non butta in mare nessuna partenza, nemici del Prologo ad almeno 300 px.
