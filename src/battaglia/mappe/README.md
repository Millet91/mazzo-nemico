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
Le regole in più della v3 le prova `tests/mappe/cala-v3.test.ts`: muretti e casse da 24-32 px (si superano anche da
sotto la Vedetta), nessuna partenza a meno di 120 px da una torre, un colpo diretto del cannone non butta in mare nessuna partenza, nemici del Prologo ad almeno 300 px.

### Strutture e sostegni (Fase 3, P1-contratti §7)

La parte alta della Cala v3 sono tre masse che non toccano il fondale (Mesa sinistra, Rocca, Mesa destra: le gallerie
e l'arco le tagliano). Le tengono su i `sostegni` A1-A7 (`SOSTEGNI` nella forma, dati e non byte della maschera): due
per Mesa e tre per la Rocca. Le `strutture` sono le cose che crollano a modo loro: la torre (poppa del relitto, nel
Prologo la torre del molo), la Vedetta della Duna su due pali, i due ponti di corda (un ancoraggio per capo, dove le assi
toccano la roccia), i due massi in bilico sulle cengie basse della Rocca e le loro cengie. Il rettangolo di ogni
struttura è l'ingombro dei suoi pixel. Ogni struttura è fatta di pezzi con un'etichetta (canale blu della PNG dei
materiali, 33 pezzi): il pittore dipinge una fuga scura tra un pezzo e l'altro. Il costruttore sceglie le partenze fuori
dalla zona di caduta di ogni struttura (colonna per colonna, ±`rispettoSpawnPx`) e a 120 px dai massi.
Le prove sono in `tests/mappe/strutture-fase3.test.ts`: niente di staccato al tick 0 (anche sulle isole generate),
tre masse con almeno due sostegni pieni, pezzi etichettati, capi dei ponti su assi e roccia, massi appoggiati solo alla
loro cengia, partenze fuori dalle zone di caduta.

### Terreno HD (Fase 2, formato concordato con Render: P1-contratti §6)

```
CHROMIUM=/opt/pw-browsers/chromium node scripts/mappe/dipingi/esegui.cjs /tmp/claude-0/cala-pappagallo-v3-materiali.png <cartella> 2
CHROMIUM=/opt/pw-browsers/chromium node scripts/mappe/dipingi/esegui.cjs /tmp/claude-0/cala-pappagallo-v3-prologo-materiali.png <cartella> 2 terreno-prologo
python3 scripts/mappe/tessere-hd.py <cartella>/terreno@2x.png cala-pappagallo-v3 <cartella>/terreno-prologo@2x.png hd-prologo
python3 scripts/mappe/guida-sagoma.py /tmp/claude-0/cala-pappagallo-v3-materiali.png public/assets/mappe/cala-pappagallo-v3/hd
python3 scripts/mappe/guida-sagoma.py /tmp/claude-0/cala-pappagallo-v3-prologo-materiali.png public/assets/mappe/cala-pappagallo-v3/hd-prologo
```

Esce `public/assets/mappe/cala-pappagallo-v3/hd/`: tessere `t-<colonna>-<riga>.webp` (8×4, contenuto 512×512 con 2 px di
margine, file 516×516, WebP senza perdita) e `indice.json` con le sole tessere non vuote (`tessere: ["t-3-1", ...]`).
L'arte sborda a colore pieno per 3 px del quadro HD (1,5 px di mondo) oltre la sagoma; più in là resta il quadro com'è:
trasparente, oppure la parete in fondo a grotte e arco (alfa ≤ 110). `hd-prologo/` ha le sole tessere dove la sagoma del
Prologo cambia (molo e torre al posto del relitto, Nidi e cima della Rocca senza le spianate dei barili) e un
`indice.json` con `base: "hd"`. In HD il pittore fa la sagoma più liscia (maschera sfocata di 1 px di mondo prima di
ingrandirla), il contorno marrone caldo dentro il bordo, toni a gradini, ombre portate dipinte sotto tetti, balconi,
ponti e arco, e la parete in fondo solo nelle grotte vere (raggi in 8 direzioni), sfumata verso le bocche.
Lo shader di Render mostra il quadro anche fuori dalla maschera: lo sbordo è quanto il disegno si vede più grande della
forma che si colpisce. `guida-sagoma.py` lo misura sulle tessere (oggi 2 px di mondo, limite della Fase 2: 3).
Il Prologo usa la stessa cartella: nei dati `arte: 'cala-pappagallo-v3'` e `arteHd: 'hd-prologo'`. La striscia
`medio.webp` (copiata dalla v2) aveva scogli tagliati dritti in cima: `sfuma-medio.py` li sfuma.
