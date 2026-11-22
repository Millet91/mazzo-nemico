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
| 1 · Movimento da pirata e ritmo | contratti congelati; parte con i thread degli agenti |
| 2 · Cala Pappagallo HD | preparazione con Mappa e livelli |
| 3 · Il campo si spezza | da fare (il Pacchetto 2 la aspetta) |
| 4 · Rampino, armi, due spari, Prologo | da fare (il Pacchetto 2 la aspetta) |
