# Studio v2 — UX (comandi, menu, tutorial, leggibilità)

*Agente UX, 21/11/2026. Solo decisioni, nessun codice toccato. Pacchetto 1 = Cala Pappagallo + combattimento (Fable); Pacchetto 2 = mappa del mondo + primo scenario (Opus).*

## 1. Cosa ho provato
Build di `claude/m1-integrazione` (c36bb52, con comandi v3), `vite preview`, Chromium headless con tocchi veri (CDP) a 800×360 e 1080×486: menu, Schermaglia su Cala Pappagallo, trascinamento del mirino, ◀ ▶ tenuti, salto, griglia armi, FUOCO, fine turno e turno dell'IA. Ho guardato circa 25 screenshot. Il movimento l'ho letto anche nel codice (`scena-battaglia.ts`, `01-combattimento.md` §2).

## 2. Cosa non va (per gravità)
1. **I pirati si muovono davvero come vermi.** Camminata = capsula che dondola ±6° e saltella di 2 px a 12 fps; salto = parabola fissa (vx 90, vy −230); salto alto all'indietro con la capsula che si allunga. Sono tutti uguali (capsule rosse o grigie).
2. **All'inizio del turno non vedo i nemici.** Nelle schermate a 800 e 1080 la camera mostra pirata, mirino e una torre: i nemici sono fuori vista e nessun indicatore li segnala (la freccia sul bordo esiste solo per il mirino). Si spara "alla cieca" per tutto il primo turno.
3. **Le frecce ◀ ▶ finiscono sopra i compagni.** Fumo e Uncino stanno nell'angolo in basso a sinistra, con nome e PV, sotto i tasti (c-2, c-3, c-5).
4. **La griglia armi copre il 60% dello schermo** e mostra 16 caselle, 12 con lucchetto: rumore, non scelta (c-4). Il tasto ARMA è una palla nera in un anello rosso: non si capisce che cosa sia.
5. **Il suggerimento "Trascina il mirino oro" sta in basso al centro**, sopra i compagni; il doc 10 lo vuole in alto a destra.
6. **Leggibilità del campo:** pirata e terreno hanno lo stesso mondo di colori del fondo dipinto; i PV rossi "70" su cielo arancio si leggono poco; le due squadre si distinguono solo per colore (rosso/grigio).
7. Il Prologo di `10-onboarding.md` è già riscritto per i comandi v3, ma **nel gioco non esiste ancora**: oggi il tutorial è un solo toast.

## 3. Decisioni
1. **Il tasto salto diventa "Balzo" contestuale.** Davanti a gradino o molo: scavalcata d'appoggio, senza parabola. Vicino a liana o corda: afferra. Altrimenti salto corto. Il tenuto-per-il-salto-all'indietro sparisce (è la mossa più da verme); per scappare si corre. Icona e nome cambiano col contesto. *Perché:* è il modo più chiaro per dire "pirata", con un tasto solo. **M, Pacchetto 1.**
2. **Corsa a falcate.** ◀ ▶ tenuti per più di 0,4 s passano da passo (60 px/s) a corsa (~110 px/s) con andatura più lunga. Il tocco breve resta un passo. Niente tasto in più. **S, P1** (con Animazione e Game design per i numeri).
3. **Il Rampino è il movimento firma**: disponibile dal turno 1 in M1 come arma "Gancio". Si lancia col mirino, FUOCO aggancia, ◀ ▶ dondolano, Balzo stacca (già previsto in 01 §2). **L, P1** se Fable ha tempo, altrimenti subito dopo.
4. **Indicatori dei nemici fuori vista.** Una freccia rossa sul bordo per ogni nemico fuori schermo, con la distanza in metri; un tocco porta la camera lì. All'inizio del turno una panoramica di 1,2 s (pirata → nemico più vicino → ritorno), saltabile con un tocco. **M, P1.**
5. **Compagni mai sotto i tasti.** La camera tiene i pirati della squadra sopra la fascia dei tasti (zona libera y < 310 su 360); gli altri pirati fermi mostrano solo una barretta PV, senza nome. **M, P1** (`inquadra.ts`).
6. **Griglia armi in fila, solo armi sbloccate.** Una riga di carte grandi (≥ 88 px) sopra ARMA, nell'angolo destro, che lascia libero il centro; le armi bloccate dietro "+12 armi 🔒". ARMA mostra l'icona e il nome dell'arma scelta. **S, P1.**
7. **Suggerimenti in alto a sinistra, sotto il PV**, uno alla volta, con mano fantasma sul gesto. Si riusano i trigger di 10 §3. **S, P1.**
8. **Leggibilità:** contorno bianco da 2 px attorno ai pirati; PV con fondo scuro a pillola; squadra nemica con ancora sopra la testa (la mia con teschio), non solo il colore; testo minimo 12 px CSS (Pixel 6: 915×412). Nella mappa HD il terreno giocabile ha bordo scuro e colori più saturi, il fondo si desatura del 30%. **S + parte della mappa, P1.**
9. **Prologo giocabile, 4 minuti**, come tabella di 10 §2 (comandi v3), con una tappa nuova per Balzo e corsa. Al primo avvio si entra senza menu. **M, P1 (battaglia) e P2 (aggancio alla carriera).**
10. **Menu:** un solo pulsante grande ("Continua" o "Gioca") e in basso "Schermaglia"; l'ingranaggio resta in alto a destra. Con la mappa del mondo il pulsante grande diventa "Carriera". **S, P2.**

## 4. Cosa NON fare
- Niente joystick, croci o tasti grandi al centro: il proprietario li ha bocciati due volte.
- Niente gesti nascosti senza un tasto visibile (lezione della fionda).
- Niente minimappa fissa: occupa la visuale. Meglio le frecce sul bordo.
- Niente muri di testo nel tutorial: un fumetto, massimo 12 parole.
- Niente editor del layout dei tasti ora: bastano il "Mancini" e i "Comandi classici" che ci sono già.
- Non mettere in pausa il timer quando si apre la griglia armi (resta come in 01).

## 5. Dipendenze e conflitti
- **Animazione**: corsa, scavalcata, afferra, dondolo: servono sagome e cicli nuovi (decisioni 1-3). Senza di loro il Balzo cambia solo la traiettoria.
- **Game design / Bilanciamento**: velocità di corsa, altezza scavalcabile, durata del Rampino. Tolgo il salto all'indietro: dovranno confermarlo.
- **Livelli / Mondo (mappa HD)**: ogni piattaforma deve avere un bordo leggibile e punti per liane e ganci (decisioni 1, 3, 8).
- **Arte/UI**: icone di Balzo e armi, ancora e teschio sopra la testa.
- **QA**: gli id dei tasti restano; `tasto-salta` cambia icona ma non id. I test e2e sulla griglia armi vanno aggiornati.
- Il codice dei comandi è dell'agente Comandi (`input.ts`, `Hud.tsx`, `mirino.ts`): Fable dovrà coordinarsi con lui.

## 6. Domande per il proprietario
Nessuna indispensabile: ho deciso io. Si può rivedere solo una cosa, a suo gusto: **togliere il salto all'indietro** (decisione 1). Consigliato: sì, si scappa correndo e col Gancio.
