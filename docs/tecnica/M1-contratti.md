# M1 · Contratti congelati e compiti degli agenti

*Lead sviluppo, 21/11/2026. Ramo di integrazione: `claude/m1-integrazione`. Ordine di prevalenza dei numeri: 00-DECISIONI §9 > 00 §1-3 > questo file > 14 > 01-13. La lista di controllo del design (`/mnt/project-files/design/m1-controllo-design.md`) e il piano QA (`tests/qa/PIANO-M1.md`) valgono insieme a questo file.*

## 1. Cosa si consegna in M1

Menu → **Schermaglia** → battaglia **3 contro 3** contro l'**IA Mozzo** sull'**Isola tropicale**, con segnaposto grafici (11 §5). Il giocatore è il **Teschio Rosso** (attaccante, squadra 0), l'IA è la **Marina Reale** (difensore, squadra 1). Timer **30 s** (Mozzo), traiettoria tratteggiata **intera** (Mozzo). Armi: cannone, granata, pistola, sciabola. Niente casse e niente kit. Morte improvvisa dal turno 12, fine a tempo al turno 18, lapide-barilotto, schermata di esito. "Arrenditi" in pausa dal turno 4.

## 2. File del contratto (li cambia solo il Lead)

| File | Contenuto |
|---|---|
| `src/core/tipi.ts` | `StatoBattaglia`, `Pirata`, `Proiettile`, `StatoTurno`, `Comando`, `EventoBattaglia`, `ConfigBattaglia`, `MappaGenerata`, `PianoIa`, `PianoColpo`, `EsitoColpo`, `Replay`, `MATERIALE` |
| `src/core/rng.ts` | PRNG mulberry32 con lo stato in `s.rng` |
| `src/core/trig.ts` | seno e coseno da tabella a 0,5°; **angoli in mezzi gradi interi 0..719**, 0 = destra, 180 = su |
| `src/core/bus.ts` | signal per l'HUD (`battaglia`, `battagliaInPausa`, `eventiBattaglia`, `richiestaBattaglia`) e canali `comandi`, `azioni` |
| `src/contenuti/armi.ts` | le 16 armi; attive in M1 le 4 Base |
| `src/contenuti/bilanciamento.ts` | tutti i numeri (`BIL`), già convertiti in px/tick |
| `src/testi/it.ts` | nomi delle armi e delle ciurme (i testi dell'HUD li aggiunge D) |
| `src/battaglia/sim/index.ts` | **firme** dell'API della sim (implementazione segnaposto) |
| `src/battaglia/gen/index.ts` | **firma** di `generaMappa` (segnaposto) |
| `src/battaglia/ia/index.ts` | **firme** di `decidi` e `creaIa` (segnaposto) |

Se un agente ha bisogno di un campo o di una funzione nuova nel contratto, lo chiede al Lead e non lo aggiunge da solo.

## 3. Regole comuni

- **Ognuno lavora solo nelle sue cartelle** (tabella §4). File condivisi solo in lettura.
- Codice puro (`core`, `battaglia/sim`, `battaglia/gen`, `battaglia/ia`): niente DOM, Pixi, Preact, Capacitor; niente `Math.random`, `Date.now`, `performance.now`, timer, `Math.sin/cos/tan/atan2/hypot/pow/exp/log`. Si usano `core/rng.ts` e `core/trig.ts`. `Math.sqrt`, `floor`, `round`, `min`, `max`, `abs` sono ammessi. Le guardie di `tests/qa/purezza.test.ts` lo controllano.
- I numeri si leggono da `BIL` e `ARMA`, mai ricopiati.
- Ramo `claude/m1-<area>` partito da `claude/m1-integrazione`. Prima della PR verso `claude/m1-integrazione`: `npm run typecheck`, `npm test`, `npm run build` verdi.
- Commenti e testi in italiano. Niente nuove dipendenze in `package.json` senza chiedere al Lead.

## 4. Gli agenti

### A · Fisica — `src/battaglia/sim/`, `tests/sim/` · ramo `claude/m1-sim`
Implementa l'API di `battaglia/sim/index.ts` senza cambiarne le firme (si possono aggiungere file interni: `terreno.ts`, `pirata.ts`, `armi/*.ts`, `turno.ts`, `replay.ts`).
- Pirata a capsula 12×22, camminata con gradino 8, salti, rimbalzo 0,3, fermo sotto 5 px/s, danno da caduta, attrito del ghiaccio. Espulsione dal solido (caso 7).
- Proiettili tracciati a passi di 1 px con connettività a 8 (casi 1-2), uscita in alto e rientro (caso 3), vento solo sulle armi con `vento: true`.
- Le 4 armi di M1 come comportamenti generici guidati da `ARMA` (balistica, lancio con miccia e rimbalzo, istantanea a 2 colpi con buca 6, mischia con spinta fissa 450 a 45°). Tratto del Teschio: +10% su cannone e granata, arrotondato per difetto. Gelo in difesa: 80 PV.
- Esplosione: danno `D × (1 − d/r)`, minimo 1; spinta `D × 7 px/s` attenuata; chi spara si fa male; d = 0 e due pirati sovrapposti senza divisioni per zero (caso 10). Cratere = raggio × moltiplicatore del materiale, ferro intatto. Evento `cratere` a ogni modifica della maschera.
- Turno: fasi `inquadra → azione → volo → fuga → risoluzione`, timer che parte al primo comando o dopo 2 s, rotazione dei pirati vivi, vento nuovo a ogni turno (`BIL.ventoMax`), mare che sale dal turno 12, fine a tempo al turno 18 (parità al difensore), eliminazione, ritirata dell'attaccante dal turno 4. Lapide-barilotto a fine risoluzione (10 danni, raggio 25). Risoluzione forzata dopo 10 s (caso 8).
- `hashStato` su **tutto** lo stato, maschera compresa. `simulaColpo` per l'IA: non muta lo stato e non copia la maschera. `traiettoria` per la linea tratteggiata. Aggiungi `rigiocaReplay(replay, mappa)` in `replay.ts`.
- **Precisazioni del Lead design (vincolanti):** danno da caduta = `min(25, floor((caduta − 90) / 4))`, solo l'eccesso sopra 90 px. Danno da esplosione: `D effettivo = floor(D × 1,1)` per il Teschio (49 e 44, mai sulla lapide), poi `max(1, round(D effettivo × (1 − d/r)))` dentro il raggio. Timer scaduto senza sparo: il turno passa subito alla risoluzione, senza i 3 s di fuga.
- Test: unit per ogni regola sopra, determinismo, casi QA 1-3, 6-8, 10. Le prestazioni contano: sim ≤ 2 ms per tick con 10 pirati sul Pixel 6.

### B · Rendering, input e ciclo di gioco — `src/battaglia/render/`, `src/battaglia/partita/`, `src/render/` · ramo `claude/m1-render`
- **Ciclo di gioco** (`battaglia/partita/`): ascolta `bus.richiestaBattaglia`, genera la mappa (`generaMappa`), crea lo stato (`creaBattaglia`), avanza a passo fisso 60 Hz con accumulatore e **massimo 5 tick per frame**; si ferma con `bus.inPausa` e `bus.battagliaInPausa` (al rientro niente tick recuperati, caso 24). Timbra con il tick i comandi da `bus.comandi` e li registra (replay). Pubblica `bus.battaglia` (VistaBattaglia) e `bus.eventiBattaglia`. Gestisce i turni dell'IA: `creaIa().pensa()` → attesa "il capitano medita" ≥ 1 s → animazione della mira (`BIL.ia.animazioneMiraMs`) → `fuoco` → fuga. Ascolta `bus.azioni` (pausa, esci, ricentra).
- **Render Pixi**: cielo e mare (riusa `render/scena-mare.ts`), terreno in 32 tile 256×256 disegnate dalla maschera con i colori di `PALETTE`, bordo d'erba e bordo bruciato di 3 px; ridisegno solo delle tile toccate dagli eventi `cratere`, al massimo 6 upload per frame. Pirati segnaposto di 11 §5 (capsula + testa nel colore della ciurma, emblema, occhio per il verso, animazioni idle/cammina/salto/colpito/morte). Barra vita 6 px e numero PV sopra ogni pirata, nome. **Anello a terra + freccia** sul pirata attivo. Proiettili, esplosioni, splash, numeri di danno, lapide-barilotto. Traiettoria tratteggiata (`traiettoria`) intera o al 30% secondo la config.
- **Camera**: altezza logica 540, larghezza 960-1215, zoom 1,4 (0,5-2,0), renderer a `min(dpr, 1,5)`. Vola sul pirata attivo in 0,6 s, segue i proiettili, pan con un dito **fuori dall'anello**, pinch, doppio tocco per ricentrare, niente pan entro 24 px dai bordi laterali.
- **Input sul canvas**: mira a fionda dall'anello di 100 px, trascinamento all'indietro 0-160 px = potenza 0-100%, angolo calcolato qui (anche con `Math.atan2`: siamo fuori dalla sim) e mandato come `Comando` `mira` in mezzi gradi interi. Multitouch con i tasti DOM dell'HUD (caso 22).
- **Diagnostica** (richiesta QA): funzione `provaFps()` che avvia una battaglia dimostrativa 5 contro 5 IA contro IA per 60 s e restituisce fps medio, minimo, frame > 20 ms e ms di sim per tick. D mette il pulsante.
- Obiettivo: 60 fps stabili sul Pixel 6 con 6 pirati. Test: unit delle parti pure (camera, accumulatore, conversione fionda → comando).

### C · Generatore di mappe — `src/battaglia/gen/`, `tests/gen/` · ramo `claude/m1-gen`
Implementa `generaMappa` (firma invariata) per il bioma **isola**, con la pipeline di 06 §1 corretta da 00 §2.2: profilo procedurale da parametri (niente sagome a mano), rumore 1D, buchi a metaball, strati (24 px sabbia, poi terra, roccia sotto 160 px), 1-2 massi di roccia, specchio orizzontale 50% dal seme, bordi 0-64 e 1984-2048 acqua aperta, fondale di ferro 984-1024, ferro ≤ 3% del solido, solido 35-50% dell'area tra 160 e 950. **5 spawn per lato** con i requisiti e l'equità di 06 §4 e le regole anti-frustrazione di 06 §7 (con mare a 950); fino a 8 tentativi con seme+1, poi un seme di riserva già validato. Decorazioni solo grafiche (palme, massi, cespugli). Spawn = centro dei piedi. Test: determinismo byte per byte, validazione su 200 semi, tempo di generazione < 150 ms sul telefono.

### D · HUD e schermate — `src/ui/`, `src/testi/it.ts` (solo aggiunte), `tests/e2e/` · ramo `claude/m1-hud`
- Menu principale con **Schermaglia** (al posto di "Cantiere navale aperto"), che manda la `ConfigBattaglia` di §1 su `bus.richiestaBattaglia` (seme nuovo a ogni partita).
- HUD di 00 §3 sopra il canvas, progettato a 800×360 CSS: timer (cerchio 56), vento (freccia + barra 120×28), barre PV delle squadre con **emblema**, pausa; ◀ ▶ (tenuti premuti → `muovi`), SALTA (doppio tocco entro 250 ms = salto indietro), ▲ ▼ (1° a tocco, 10°/s tenendo premuto → `ruotaMira`), ARMA, FUOCO 80 px (doppio tocco = un solo sparo), chip miccia sopra FUOCO con la granata. Tutti i tasti ≥ 64 px, ≥ 12 px tra loro, ≥ 56 px dal bordo corto, ≥ 16 dal basso. Angolo e potenza in %. Durante il turno dell'IA i comandi spariscono e compare "il capitano medita...".
- **Griglia armi 4×4** (celle ~88×64, icona segnaposto, munizioni, nome 12 px; 12 celle grigie col lucchetto; tocco sceglie e chiude; il timer non si ferma).
- Banner di turno 44 px ("Tocca a te!", "Turno della Marina Reale"), avvisi "Il mare sale!" e "Ultimi turni".
- **Pausa** (anche dal tasto indietro di Android): Riprendi, Arrenditi (dal turno 4), Esci. **Esito**: pannello pergamena con esito, superstiti, turni, "Rigioca" e "Menu". Vibrazioni su sparo, colpo, morte (`piattaforma/haptics`).
- Impostazioni: interruttore **mancini** che specchia l'HUD; **Diagnostica** con "Rigioca replay" (✅/❌ per ogni replay d'oro di `tests/replay/`, usa `rigiocaReplay` di A) e "Prova 60 fps" (usa `provaFps` di B).
- Pannelli abisso all'85%, niente `backdrop-filter` sopra il canvas. Finché la sim vera non c'è, sviluppa con il segnaposto o con una `VistaBattaglia` finta. Test L4 Playwright della battaglia e dei controlli su bordi e misure.

### E · IA di battaglia — `src/battaglia/ia/`, `tests/ia/` · ramo `claude/m1-ia`
Implementa `decidi` e `creaIa` (firme invariate). Livello **Mozzo** di 01 §8 con i numeri di `BIL.ia`: 40 simulazioni con `simulaColpo`, nessuno spostamento prima di sparare, errore ±8° / ±15%, vento considerato al 50%, solo armi con munizioni nella propria `Squadra.munizioni` (in M1 il barile della lista Mozzo non c'è), punteggio di 01 §8 (+60 uccisione, +80 annegamento, −1,5 amici, −2 sé, −200 se finisce in mare), scelta a caso tra i 5 migliori con il PRNG proprio (seme = `s.rng ^ s.turno.numero`), fuga dopo lo sparo lontano dall'impatto. Se nessun tiro supera 10 punti, cammina verso una copertura. **Web Worker** (`worker.ts`) con budget in simulazioni, non in millisecondi; turno dell'IA ≤ 2 s sul Pixel 6. Lascia i parametri di Nostromo e Capitano leggibili da `BIL.ia.livelli` per M2. Dipende da `simulaColpo` di A: fino alla sua consegna lavora sul segnaposto; la taratura finale si fa dopo l'unione di A. Test: determinismo del piano, il Mozzo colpisce un bersaglio fermo a 400 px nella maggior parte dei casi, niente tiri suicidi.

## 5. Unione

Ogni agente apre una PR verso `claude/m1-integrazione` e scrive al Lead. Ordine previsto: C e A per primi (gli altri dipendono da loro), poi E, B e D. Il Lead unisce, rigenera i 10 replay d'oro con mappa e sim veri insieme a QA, e porta tutto in `main` quando la checklist del proprietario è superata.
