# Pacchetto 1 · Contratti e squadra (Lead P1)

*Lead P1, 21/11/2026. Vale insieme a `PIANO.md` §3 e a `00-DECISIONI.md` (che prevale). Chi lavora al Pacchetto 1 legge questo file prima di tutto.*

## 1. Dove si lavora

- **Ramo di integrazione: `claude/p1-integrazione`.** Ci scrive solo il Lead. L'APK del proprietario (pre-release `apk-prova`) lo aggiorna solo `claude/p2-integrazione`, che unisce questo ramo prima di ogni push: così ha sempre battaglia e carriera insieme. Qui l'APK esce solo come artifact della CI.
- **Un ramo per agente**, che parte da `claude/p1-integrazione`: `claude/p1-fisica`, `claude/p1-render`, `claude/p1-mappa`, `claude/p1-audio`. Ogni agente apre **PR verso `claude/p1-integrazione`** e avvisa il Lead nel suo thread. PR piccole e frequenti: una per punto dell'elenco del §4.
- Prima di ogni PR: `npm run typecheck`, `npm test`, `npm run build`, `npm run assets:check`, e le prove a schermo (`npm run build` poi `PW_CHROME=/opt/pw-browsers/chromium npx playwright test --trace off`).
- **Replay d'oro**: chi cambia la simulazione li rigenera con `CON_RITIRATA=1 npx tsx tests/replay/genera.ts` in un **commit separato**, con il motivo nel messaggio. Le impronte delle mappe generate (`tests/gen/impronta.ts`) non devono cambiare senza dirlo al Lead.
- **Magnific: non si genera niente** finché il proprietario non risponde sui crediti. Tutto in casa (pezzi disegnati nel codice, pittore in Chromium, suoni sintetici).
- Telefono di prova: Pixel 6, 60 fps. Budget: sim ≤ 2 ms per tick, disegno ≤ 8 ms.

## 2. Contratti congelati (li cambia solo il Lead)

Se serve un campo nuovo si chiede al Lead nel thread, non si aggiunge nel proprio ramo.

| File | Cosa c'è |
|---|---|
| `src/core/tipi.ts` | stato, comandi ed eventi della battaglia |
| `src/core/bus.ts` | `VistaBattaglia` (quello che l'HUD mostra) e i canali |
| `src/contenuti/bilanciamento.ts` | `BIL`: tutti i numeri |

### Novità della Fase 1 già nei tipi (non ancora usate dalla sim)

- **`Pirata.mossa` e `Pirata.mossaDa`** (`MossaPirata`): cosa sta facendo il pirata e da quale tick. La scrive solo la sim; render e audio la leggono. Valori: `fermo, passo, corsa, frenata, salto, caduta, scavalco, scivolata, bordo, scala, liana, aTerra`.
- **Comando `salta`** diventa il **Balzo**: la sim sceglie tra salto (con la rincorsa se corre), scavalco e stacco dall'appiglio. `indietro: true` vale solo contro una parete (salto dal muro). **Il salto alto all'indietro non esiste più.**
- **Comando `fatto`**: in fuga chiude subito il turno.
- **Eventi nuovi**: `passo` (un piede a terra ogni `BIL.movimento.passoPx`, con `corsa` e `materiale`), `scavalco`, `scivola`, `bordo`, `saltoMuro`, `fatto`; `esplosione.materiale` (facoltativo, per l'audio a strati).
- **`VistaBattaglia.balzo`** (icona e nome del tasto Balzo) e **`puoFinire`** (tasto "fatto" in fuga). Già dalla Fase 0: `avvisoTiro`, `pirataSottoTasti`.
- **`BIL.movimento`** e **`BIL.ritmo`**: corsa 96 px/s dopo 0,4 s, accelerazione 0,15 s, scavalco fino a 28 px in 0,25 s, scale a 90 px/s in un tocco, scivolata oltre 25° fino a 220 px/s, salvataggio al bordo entro 0,5 s una volta per battaglia; fuga 1,5 s che si chiude col "fatto" o da fermi, timer **per sparo** 12 s (25 con Mozzo e nel Prologo, 45 Timer lungo), turno IA ≤ 4 s con mira visibile 0,8 s, panoramica 1,2 s.
- **`StatoTurno.richiesta`** (`'fatto' | 'balzo' | 'balzoMuro'`): quello che un comando lascia alla sim per il tick dopo, al posto dei valori sentinella.
- **Per il Pacchetto 2**: `ConfigBattaglia.semeMappa` (la mappa generata nasce da questo seme, vento e casse da `seme`; lo legge `src/battaglia/mappa-config.ts`, l'unico posto che sceglie la mappa di una battaglia), `ConfigBattaglia.scontro` (`ConfigScontro`, `TipoScontro`), `ConfigSquadra.mosse` (`IdMossa[]`, assente = tutte) e `nomi`, `MotivoFine` con `'bandiera'`, evento `bandieraPresa`. Punto d'aggancio: `src/battaglia/sim/scontro.ts` › `regoleScontro(s, eventi, concludi)`, chiamata da `avanza` a fine tick.

### Numeri di battaglia di Bilanciamento (PIANO §7): un commit solo

Li mette **Fisica**, come primo lavoro, in un commit che cambia tutti i numeri insieme, alza `VERSIONE_REGOLE` e rigenera i replay (in questo solo caso Fisica tocca `bilanciamento.ts`, con questi valori e nient'altro):
cannone 60 raggio 70 · granata 52 raggio 64 · pistola 28×2 · sciabola 40 · Mozzo errore ±14° e gittata ±35% · macerie 8 PV (massimo 20 a turno, dalla Fase 3). I due spari per turno arrivano in Fase 4, insieme a questi numeri: prima no.

## 3. Regole che valgono per tutti

1. **Il render non decide mai la fisica.** Pose e suoni nascono da `Pirata.mossa`, dallo stato e dagli eventi.
2. **La sim resta deterministica**: niente `Math.random`, niente tempo reale, maschera 2048×1024.
3. **Ogni mappa passa `tests/mappe/percorribilita.test.ts`**: ogni scala e liana su e giù, ogni partenza raggiunge partenze, appigli e barili. L'esploratore (`tests/qa/raggiungibilita.ts`) usa le mosse vere della sim: quando Fisica aggiunge una mossa (scavalco, corsa con rincorsa) la aggiunge anche lì.
4. **Comandi**: restano i v3 (niente joystick, niente tasti al centro, nessun gesto senza un tasto visibile). Il tasto del salto tiene l'id `tasto-salta`.
5. Testi per il giocatore solo in `src/testi/it.ts`, in italiano semplice.
6. Ogni fase finisce con APK e lista di controllo semplice per il proprietario: le scrive il Lead.

## 4. Chi fa cosa nella Fase 1

### Fisica e combattimento · `claude/p1-fisica`
Cartelle: `src/battaglia/sim/**`, `src/battaglia/ia/**`, `sim/`, `tests/sim/**`, `tests/ia/**`, `tests/replay/**`, `tests/qa/**`.
1. Numeri di battaglia (commit unico, sopra).
2. Ritmo: fuga 1,5 s interrompibile e comando `fatto`, timer per sparo, turno dell'IA ≤ 4 s (ritarare `PASSI_FUGA`).
3. Corsa a falcate con accelerazione e frenata, pendenze, evento `passo`, `Pirata.mossa`.
4. Scavalco automatico fino a 28 px; Balzo (salto con rincorsa, salto dal muro al posto del salto all'indietro).
5. Scale e liane in un tocco a 90 px/s (si fermano con "scendi" o Balzo).
6. Scivolata sui pendii oltre 25° e salvataggio al bordo.
Criteri: turno umano ≤ 10 s, 3 contro 3 in 2-4 minuti con il bot della QA, replay rigenerati.

### Render e HD · `claude/p1-render`
Cartelle: `src/battaglia/render/**`, `src/battaglia/partita/**`, `src/ui/battaglia/**`, `src/ui/style.css` (parte battaglia), `tests/render/**`, `tests/ui/**`, `tests/e2e/**`.
1. **Pirata a pezzi disegnato nel codice** (`render/pirata-rig.ts`): ~9 pezzi, passo guidato dalla distanza, pose per riposo, corsa, salto, caduta, atterraggio, colpito, mira, scala, liana, morte; cappello di forma diversa per ciurma; sotto zoom 0,6 lo sprite unico. Criterio QA: 4 foto diverse su 6 nella camminata.
2. HUD: tasto Balzo contestuale (`VistaBattaglia.balzo`), tasto "fatto" in fuga, frecce rosse sul bordo per i nemici fuori vista, panoramica di 1,2 s a inizio turno, compagni mai sotto i tasti (camera).
3. Leggibilità: contorno bianco ai pirati, PV su pillola scura, teschio o ancora sopra la testa.
Finché Fisica non scrive `Pirata.mossa`, il pupazzo la ricava da `aTerra`, `vx`, `vy`, `appeso` con una funzione sola, da buttare dopo.

### Mappa e livelli · `claude/p1-mappa`
Cartelle: `scripts/mappe/**`, `src/battaglia/mappe/**`, `src/battaglia/gen/**`, `public/assets/mappe/**`, `tests/mappe/**`, `tests/gen/**`.
Nella Fase 1 prepara la Fase 2: sagoma della **Cala v3** (`livelli.md`, PIANO §3 Fase 2) con muretti e casse da 24-32 px ogni ~150 px, due gallerie vere, asimmetria, scala della torre raggiungibile (in Fase 0 le scalette delle torri sono state tolte: stavano dietro pali pieni), partenze del Prologo ad almeno 300 px; il **pittore in Chromium** per l'arte fatta in casa. Niente arte definitiva finché Render non ha il terreno HD.

### Audio · `claude/p1-audio`
Cartelle: `src/piattaforma/audio*`, `src/audio/**`, le righe audio di Impostazioni, `tests/audio/**`.
Motore nuovo con registro e bus (musica, effetti, voci, UI), ogni evento a un suono, esplosioni a 3 strati, passi dalla sim (`passo`, `scivola`), via "boing" e "sproing", musica segnaposto procedurale, due slider. Ascolta `bus.eventiBattaglia` e `bus.battaglia`; nessun altro modulo sceglie i suoni.

## 5. Stato delle fasi

| Fase | Stato |
|---|---|
| 0 · Scale e bug | consegnata il 21/11/2026 (PR #71, APK build 204), in prova dal proprietario |
| 1 · Movimento da pirata e ritmo | quasi finita: unite #74, #75, #76, #78, #79, #80. Mancano scivolata e bordo (Fisica), HUD (Render), generatore sulla spinta vera (Mappa) |
| 2 · Cala Pappagallo HD | formato delle tessere concordato (§6); arte e shader da fare |
| 3 · Il campo si spezza | da fare (il Pacchetto 2 la aspetta) |
| 4 · Rampino, armi, due spari, Prologo | da fare (il Pacchetto 2 la aspetta) |

## 6. Ripresa con Opus (22/11/2026)

Il Lead Fable e i quattro agenti Fable si sono fermati il 22/11 alle 03:40 UTC per limite d'uso. Il **nuovo Lead P1** è il thread "Finire prima mappa e combattimento (Opus)"; i nuovi agenti (Opus) prendono le stesse cartelle e gli stessi rami del §4. **Il lavoro che i vecchi agenti non avevano spinto è perso**: si rifà, seguendo le decisioni già prese qui sotto.

**Prima di tutto:** ripartite da `claude/p1-integrazione` aggiornato (`git fetch` e `git merge origin/claude/p1-integrazione` nel vostro ramo). Leggete la memoria del progetto (`p1-pacchetto1`, `p1-come-lavorare`, `p1-cala-v3`, `p1-generatore-cannone-v2`, `p1-fisica`). PR piccole, una per punto, verso `claude/p1-integrazione`; avvisate il Lead nel suo thread con numero della PR e prove verdi.

### Cosa c'è già sul ramo di integrazione (61505b7)
Numeri v2 e ritmo (fuga 1,5 s dallo sparo, comando `fatto`, fasi azione → fuga → volo → risoluzione); corsa a falcate, scavalco fino a 28 px, `Pirata.mossa`/`mossaDa`, eventi `passo` e `scavalco`; **Balzo** (`StatoTurno.richiesta`, `balzoPossibile(s)` e `spintaAlCentro(arma, ciurma)` esportate da `sim`), salto senza rimbalzi, scale in un tocco; spinta di cannone e granata da `armi.ts` › `spintaEsplosione`; pirata a pezzi disegnato nel codice con contorno bianco; Cala v3 e variante del Prologo (in Schermaglia "Cala nuova (bozza)"); motore audio nuovo (`src/audio/`, 71 suoni sintetici, due cursori).

### Fisica e combattimento · `claude/p1-fisica`
Fase 1, da finire:
1. Scivolata sui pendii oltre 25° (solo il pirata di turno in discesa o atterrando; da fermi non si scivola; chi è spinto da un'esplosione NON scivola), evento `scivola`, mossa `scivolata`.
2. Salvataggio al bordo: entro 0,5 s, una volta per battaglia (`Pirata.bordi`), evento `bordo`, mossa `bordo`.
3. Esploratore `tests/qa/raggiungibilita.ts` aggiornato alle mosse nuove; replay in commit a parte.
4. Misure di uscita: turno umano ≤ 10 s, 3 contro 3 col bot della QA in 2-4 minuti. Scrivetele nella PR.
Poi Fase 3 (sostegno strutturale, crolli, legno che brucia, sabbia, anteprima con `simulaColpo`) e Fase 4 (rampino, 4 armi, due spari, Mozzo Tutorial): il Lead manda il brief di fase quando la Fase 1 è chiusa.

### Render e HD · `claude/p1-render`
Fase 1, seconda PR (era pronta ma non spinta, va rifatta):
1. Timer da `BIL.ritmo` in `src/ui/battaglia/logica.ts` (12 s, 25 con Mozzo e nel Prologo, 45 Timer lungo).
2. Tasto "fatto" in fuga (`VistaBattaglia.puoFinire` = fase 'fuga' nel turno umano, senza esito), almeno 44 px, dal lato di FUOCO.
3. Tasto Balzo contestuale (`VistaBattaglia.balzo` da `balzoPossibile(s)`; con 'muro' manda `salta` con `indietro: true`); sali e scendi non mandano più `arrampica 0` al rilascio.
4. Suggerimento del mirino su due righe corte, senza coprire la scritta del turno.
5. Frecce rosse sul bordo per i nemici fuori vista, panoramica di 1,2 s a inizio turno, camera che segue il colpo anche in fase 'fuga', compagni mai sotto i tasti.
6. PV su pillola scura, teschio o àncora sopra la testa.
7. Misura dei tempi di disegno con 5 contro 5 ("Prova 60 fps" della Diagnostica): budget 8 ms, sotto zoom 0,6 lo sprite unico. Numeri nella PR.
8. Controllo a vista: posa di corsa dopo 0,4 s, mano sul bordo nello scavalco, frenata di 6 px.
Suoni: l'HUD usa solo `suona('tocco')`; i suoni li sceglie `src/audio/eventi.ts`.
Poi Fase 2: terreno HD con shader che legge la maschera della sim (tessere sotto).

### Mappa e livelli · `claude/p1-mappa`
Fase 1, da finire:
1. Generatore: in `gen/spawn.ts` usa `spintaAlCentro('cannone', 'teschio')` al posto di `REGOLE.cannoneDanno × spintaPerDanno`; `REGOLE.cannoneRaggio` a 70 solo se le impronte restano identiche, altrimenti resta 55 con una riga di commento. Impronte e soglie di "costa aperta" invariate; se un seme cambia, dirlo al Lead prima della PR. Chiudi anche il buco in `gen/index.ts`: dopo le spianate dei barili ricontrolla `controllaPosto`, non solo `controllaInsieme`.
2. Cala v3 ripassata con corsa, scavalco e Balzo: ogni muretto e cassa si supera davvero (il vecchio agente aveva accorciato il tetto della Vedetta, non spinto: rifallo se serve).
Fase 2, subito dopo:
3. Arte della Cala v3 a 4096×2048 col pittore in Chromium, stile cartone dipinto (contorno marrone caldo dentro il bordo, ombre dipinte, niente oggetti sospesi). **Formato concordato con Render:** `public/assets/mappe/cala-pappagallo-v3/hd/t-<colonna>-<riga>.webp`, 8×4 tessere, contenuto 512×512 con **2 px di margine per lato** (file 516×516, contenuto da (2,2); sul bordo del mondo si ripete l'ultimo pixel); **l'arte sborda** a colore pieno (alfa 255) fino a 8 px oltre la maschera, trasparente più in là; **WebP senza perdita**; `hd/indice.json` = `{ scala: 2, lato: 512, bordo: 2, colonne: 8, righe: 4, tessere: [...] }` con le sole tessere non vuote; `hd-prologo/` con le sole tessere che cambiano e il suo `indice.json`. Resta `terreno.webp` a 1×.

### Audio · `claude/p1-audio`
1. Quando Fisica unisce scivolata e bordo: riprova i suoni di Balzo, scale, scivolata e bordo con gli eventi veri di una battaglia.
2. Misura sul profilo lento (CPU ×4 di Chromium) la preparazione all'avvio e i frame persi al menu: sopra 6 s o se scatta, prepara a pezzi più piccoli.
3. Una riga in Diagnostica con `statoAudio()` (pronti/totale, contesto).
Poi Fase 3 (crolli, fuoco, sabbia) e Fase 4 (rampino, armi nuove). La taratura a orecchio la dà il proprietario (MP3 in `/mnt/project-files/audio-p1/`).

## 7. Fase 3 · contratto congelato (Lead P1, 22/11/2026)

Dalle proposte di Fisica (`/mnt/project-files/p1/fase3-contratto-fisica.md`) e di Mappa (`fase3-strutture.md`). Tipi in `src/core/tipi.ts`, numeri in `BIL.crolli`, `BIL.fuoco`, `BIL.sabbia`, `BIL.macerie`.

- **Ancoraggi come dato, non nella maschera** (scelta di Mappa): `MappaGenerata.sostegni?: Rettangolo[]`. Niente `MATERIALE.ancora`. Appoggi = fondale, ferro, un pixel pieno dentro un sostegno, oppure ricerca che supera `pezzoMaxPx` (**6000 px**, la soglia di Mappa: le tre masse alte della Cala, 44-71 mila px, non cadono mai intere).
- **Ponti**: gli ancoraggi sono rettangoli in `StrutturaMappa.ancoraggi`. Tagliato un capo resta appeso all'altro (`ponteCalato`); la scala di corda che ne nasce è per la Fase 4.
- **"Sotto 24 px"** = briciole: i pezzi sotto `briciolePx` spariscono in polvere. Ogni altro pezzo staccato entro `pezzoMaxPx` cade in blocco.
- **Anti-frustrazione**: niente crolli prima del turno 2; un pezzo non cade se uno spawn iniziale sta nella sua zona di caduta (il pezzo prolungato fino al mare) allargata di 24 px per lato. È la proposta di Mappa per i ponti, valida per tutti; le distanze ≥ 120 px dagli elementi restano una regola di disegno, controllata dalle prove di Mappa.
- **Macerie** 8 PV, masso 20 con spinta, tetto 20 a turno per pirata, lasciano sempre almeno 1 PV (mai morte sicura).
- **Fuoco** 4 s, anello 1,3 × raggio, 6 PV a fine turno a chi ci sta dentro (può uccidere: si può scappare). Non si propaga.
- **Masso** sulle cengie basse della Rocca (non sulla Mesa); **Vedetta della Duna su pali** alla quota di oggi: approvati.
- I campi nuovi di `StatoBattaglia` (`pezzi`, `fuochi`, `frane`, `strutture`) sono facoltativi finché Fisica non li crea in `creaBattaglia`; da lì sono sempre presenti ed entrano nell'hash (replay in commit a parte).
- Ordine delle PR di Fisica come nel suo §8. Mappa aggiunge `sostegni`, strutture, massi e pezzi alla Cala v3 dopo la PR 2 di Fisica; Render fa ritaglio dell'arte e anteprima in rosso; Audio i suoni di crollo, macerie, fuoco e frana.
