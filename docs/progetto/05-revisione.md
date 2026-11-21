# 05 — Revisione dei documenti 01-04

Le decisioni qui sotto **prevalgono** sui documenti 01-04. Ho verificato le adiacenze di 02 con uno script: 28 territori, 47 rotte simmetriche, 13 tra regioni. Sono corrette.

## 1. Contraddizioni e riconciliazione

| # | Tema | Conflitto | Decisione | Perché |
|---|---|---|---|---|
| 1 | Squadra | 02: max 5, tutti i difensori combattono. 01: 4 in campo + riserve | **Max 5 per lato, tutti in campo subito. Niente riserve né sbarchi.** | Un solo numero da spiegare; elimina il codice dello sbarco sicuro |
| 2 | Attaccanti | 02: il tetto è 5 e almeno 1 resta a casa, quindi si attacca al massimo in 4 contro 5 | **L'attacco può unire pirati da più territori adiacenti, fino a 5** | Senza questa regola un presidio pieno è quasi imprendibile (auto: 31%, con Gelo ancora meno) |
| 3 | Fazioni | 03 ha nomi propri e una "Ciurma del Corallo" fissa per il giocatore | Si tengono le 4 ciurme di 02. **Teschio Rosso** `#E5484D`, teschio bendato, bandiera diagonale. **Corsari del Gelo** `#22C7D9`, fiocco di neve + ancora, strisce. **Fratellanza dell'Oro** `#9B6BFF`, corona con doblone, quartata (non oro, che è il colore delle azioni UI). **Dannati della Marea** `#3DBE6A`, conchiglia-teschio, bordo dentellato. **Marina Reale** `#A8A29E`, sole/àncora reale (non "giubbe rosse", che si confondono col Teschio Rosso) | Il giocatore sceglie una ciurma e il suo colore è quello della ciurma. Il "tuo" lato si segnala con anello e freccia, non con un colore riservato |
| 4 | Numero armi | 01: 16. 04: 12 con nomi diversi (dinamite, grappolo, moschetto). 03: 8 icone | **Il catalogo è quello di 01 (16 armi).** In M2 se ne fanno 10: 1-6, 9, 11, 13, 15. Le altre 6 vanno nel lotto 2. L'elenco di 04 si cancella | 01 è il documento che possiede il bilanciamento. Le armi di 04 doppiano quelle di 01 |
| 5 | Selettore armi | 01: griglia 4×4. 03: radiale a 8 spicchi | **Griglia 4×4** con lo stile visivo di 03. `icone_armi` diventa uno sheet da 16 celle, `proiettili` si allinea a 01 | Un radiale non contiene 16 armi |
| 6 | Risoluzione | 04: logico 960×540. 03: 800×360 CSS. 01: 844×390 dp | **La UI si progetta a 800×360 CSS** (il caso peggiore). **La camera di battaglia ha altezza logica fissa 540 e larghezza variabile** (960-1215) | Si evitano le bande nere sui 20:9, che sono la norma su Android |
| 7 | Mondo e fisica | 01: 2400×1100, g 600 px/s², capsula 12×22, gradino 8, caduta oltre 90 px. 04: 2048×1024, g 0,25 px/tick², cerchio r7, gradino 4, caduta oltre 60 px | **Mondo 2048×1024** (8×4 tile esatte), **mare a y = 950**. **Valgono tutti i numeri fisici di 01**, convertiti in px/tick (g = 0,1667; vento 0,0042 per punto) | Le dimensioni tecniche le decide 04, la sensazione di gioco la decide 01 |
| 8 | Materiali | 04: maschera 0/1/2. 01: 4 materiali + ferro | La maschera è un byte con i materiali di 01. **03 aggiunge tile di legno, ghiaccio e ferro** (oggi ha terra, sabbia e roccia) | Servono ai biomi |
| 9 | Scala del pirata | 03 vuole il pirata a ~44 px CSS. Con 540 logici su 360 CSS, la hitbox di 01 (22 px) diventa circa 15 px CSS | **Zoom predefinito 1,4**: sprite disegnato a 40 px di mondo, cioè ~37 px CSS. Hitbox 12×22. 03 verifica gli sprite a **36 px** | Erano incompatibili: a 44 px CSS nel mondo ci starebbero solo ~30 pirati in larghezza |
| 10 | Timeout | 01: morte improvvisa a 4:00, limite a 6:00. 02: 12 turni. 04: dal turno 20, +8 px. Timer del turno: 20 / 30 / 45 s | **Si conta in turni, non in minuti.** Dal turno 12 (totale) il mare sale di 25 px a turno. Al turno 18 vince chi ha più PV totali; a parità vince il difensore. Timer del turno **20 s** (30 s in modalità facile) | I turni sono deterministici e reggono la pausa e la ripresa da replay |
| 11 | Esiti | 01: a tempo l'attaccante torna a casa. 02: chi perde in attacco perde tutti gli imbarcati | Attaccante **eliminato**: perde tutto. **A tempo o con ritirata**: i sopravvissuti tornano al territorio di partenza | Morire combattendo pesa, il resto no |
| 12 | Ritirata | 01: sempre, con −20 PV. 02: dal turno 4 della battaglia | **Ritirata dal turno 4**, solo per l'attaccante, senza penalità | I PV non persistono (vedi 13) |
| 13 | Feriti | 01: pirati feriti con 50 PV. 02: nessuna identità, PV azzerati | **Vale 02: nessun ferito, ogni battaglia parte a PV pieni** | Risiko lavora con i numeri; seguire i pirati uno per uno complica salvataggio e UI |
| 14 | Ripresa della battaglia | 02: riparte da capo. 04: ripresa da replay | **Ripresa da replay (04).** Se cambia la versione del gioco, si riparte da capo | Ripartire da capo è un exploit: chiudi l'app quando stai perdendo |
| 15 | Mira | 01: fionda + FUOCO a tocco + ▲▼. 03/04: tieni premuto FUOCO per caricare | **Fionda (01).** Si aggiungono ▲▼ all'HUD di 03, tutti i bottoni di battaglia ≥ 64 | Più precisa sul touch, niente spari involontari |
| 16 | Biomi | 01: 6 biomi. 02: un bioma per regione con nomi diversi. 04: enum diverso | **Si usano i 6 biomi di 01, assegnati per territorio** in `territori.ts`: A porto, B tropicale (B3 vulcanica), C ghiacci, D porto/grotta, E cimitero di navi, F tropicale/vulcanica | Un solo elenco |
| 17 | Generazione delle mappe | 01: 12 sagome a mano per bioma (72). 04: procedurale | **Procedurale con parametri per bioma (04)**; sagome a mano solo in un secondo momento | 72 mappe a mano sono fuori scala per la v1 |
| 18 | Nomi doppi | La carta "Mappa del Tesoro" e l'arma 15 hanno lo stesso nome; la carta "Bordata" e l'arma 12 pure | L'arma 15 diventa **Bussola Stregata**, le carte diventano **Pergamene**, la carta Bordata diventa **Fuoco di Copertura** | Evita confusione nella UI |
| 19 | IA | 04: 72×8 campioni, livelli Facile/Normale/Difficile, errore 0, kill +50. 01: 40/200/600 simulazioni, Mozzo/Nostromo/Capitano, kill +60 | **Valgono numeri e nomi di 01. Web Worker fin da M2** | Coerenza con la difficoltà della campagna |
| 20 | Varie | 04 M3: "~24 territori". 04 sim: squadre da 1 a 8. 03 mappa: "12-16 isole". Durata di una battaglia 4v4: 8-14 turni (04) contro 12-16 (01) | **28 territori, squadre da 1 a 5, prompt della mappa con 6 gruppi di isole e 28 territori. Obiettivo 10-16 turni** | |
| 21 | Lapide | 01: barilotto che esplode. 03: croce di legno | **Barilotto con il cappello** | La lapide deve far capire che esplode |
| 22 | Forte | 02: bunker e cannone fisso, ma 01 non lo definisce | Nella v1 il forte è **solo terreno di ferro attorno allo spawn del difensore**. Il cannone fisso va nel lotto 2 | |
| 23 | Schermate mancanti in 03 | Mancano piazzamento dei rinforzi, fortificazione, bottega, mano di Pergamene ed eventi. Il menu ha una "Schermaglia" che 02 non prevede | **Si aggiunge la modalità Schermaglia (battaglia singola) e la consegna M1 si fa con quella.** 03 completa le 5 schermate mancanti | |

## 2. Punti deboli e correzioni

1. **La campagna è troppo lunga.** 15-25 battaglie da 4-6 minuti fanno già 60-150 minuti, a cui va aggiunta la strategia. In più metà del mondo è Marina con presidi da 1-3 pirati.
   **Correzione:** contro la Marina e con rapporto ≥ 2:1 la battaglia si **risolve in automatico per default**. Vittoria a **16 territori** invece di 18. Aggiungere una **"Rotta breve"** (2 rivali, solo le regioni A-D-E).
2. **Attesa durante i turni dell'IA.** Con 5 nemici si guardano circa 10 s per ciascun turno avversario.
   **Correzione:** bottone **×2/×4** sui turni dell'IA e salto dell'animazione "il capitano medita".
3. **Difese forzate.** Tre IA che attaccano il giocatore possono imporgli 3 o più battaglie in difesa per round.
   **Correzione:** la difesa propone "Gioca / Auto" e l'auto è preselezionata quando il rapporto è ≥ 2:1. L'IA fa al massimo 1 attacco al giocatore per round a difficoltà Mozzo.
4. **Curva di apprendimento.** Al primo avvio arrivano insieme Worms, Risiko, carte, economia, eventi e tratti.
   **Correzione:** si sblocca un pezzo alla volta.
   - **Battaglia 1:** tutorial in Schermaglia, con le armi 1-4.
   - **Campagna, turni 1-3:** niente eventi e niente bottega.
   - **Dal turno 4:** Pergamene ed eventi.
   - **Armi:** si sbloccano conquistando i porti.
5. **Rinforzi in eccesso.** Con il tetto a 5, i rinforzi da 6-9 possono non avere posto.
   **Correzione:** ogni pirata che non trova posto vale **1 doblone**.
6. **Squilibrio dei tratti.** Il Gelo con +20 PV in difesa (90 contro 70) porta stalli. I Dannati con la resurrezione fanno valanga.
   **Correzione:** Gelo **+10 PV**. Resurrezione dei Dannati **una volta per round**.
7. **Rischi tecnici.**
   - **Pipeline Magnific** (video, frame, sheet): consistenza tra frame e alone del magenta incerti. Va fatta una **prova in M1** su `pirata_cammina` prima di produrre il lotto.
   - **Upload delle tile durante le reazioni a catena** (barili, lapidi): limitare a 6 tile per frame, mettendo in coda le altre.
   - **Determinismo:** vietati `Math.sin`/`cos` nella sim (usare la tabella). Il replay si invalida se cambia la versione.
   - **WebView Android vecchie:** verificare WebGL2 in M0. In mancanza, ripiego su WebGL1.

## 3. Decisioni aperte per il proprietario

1. **Come scontrare un presidio pieno?** *Consigliato:* attacco unito da più territori, fino a 5. Alternativa: tetto 6 per territorio con squadra di 5.
2. **Quanto deve durare una campagna?** *Consigliato:* 60-90 minuti, vittoria a 16 territori, più la Rotta breve.
3. **Le battaglie della Marina si giocano a mano?** *Consigliato:* in automatico per default, con la possibilità di giocarle.
4. **La lingua del gioco è solo italiano o italiano + inglese?** *Consigliato:* testi in un file di stringhe fin da subito, italiano al lancio.
5. **Primo traguardo da provare sul telefono?** *Consigliato:* una Schermaglia 3v3 contro l'IA (M1+M2) prima della mappa del mondo.
6. **Pass and play in v1?** *Consigliato:* no, dopo la campagna. Va però tenuto pronto nel modello dati (fazioni umane multiple).

## 4. Nome del gioco

1. **Kaboom Ahoy!** Facile, internazionale, dice esplosioni e pirati in due parole.
2. **Isole Spezzate.** Lega il mondo di 02 al terreno distruttibile.
3. **Ciurme a Pezzi.** Ironico e italiano.
4. **Polvere & Dobloni.** Battaglia + economia.
5. **Bucanieri a Bomba.** Allitterazione, tono cartoon.

**Consigliato: "Kaboom Ahoy!"**, sottotitolo *"Isole Spezzate"*. Funziona sul Play Store in tutte le lingue e il sottotitolo tiene il mondo. Prima di rinominare `appId` in M0 bisogna verificare che il nome sia libero sul Play Store.
