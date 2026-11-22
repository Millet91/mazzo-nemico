# Business — studio v2

*Ruolo: Business / Play Store. Vale 00 §9 (gratis Prologo + cap. 1, sblocco 1,99 €, account personale). `12-business.md` è in parte vecchio (4,99 €, Rotta breve gratis, PEGI 7): da aggiornare, non da seguire.*

## 1. Cosa ho provato
Build di `claude/studio-v2` (= `m1-integrazione` c36bb52), servita con `vite preview` e giocata con Playwright/Chromium a 800×360 con tocchi veri: menu → Schermaglia → Cala Pappagallo → un colpo col mirino da trascinare → turno dell'IA → turno 3. Ho guardato 8 screenshot e letto lo stato della battaglia (turni, PV, secondi). I concorrenti li conosco dalla memoria: la ricerca web non ha dato pagine utili, quindi i nomi sotto vanno verificati.

## 2. Cosa non va (per gravità)
1. **Il gioco "vero" non si vede.** Il menu ha un solo tasto, "Schermaglia". Niente isole da conquistare, niente obiettivo, niente premio dopo la battaglia. Chi lo scarica oggi vede un minigioco da 4 minuti, non il gioco che vendiamo.
2. **Lo screenshot più bello dice "Worms".** La battaglia (screenshot 03) è la cosa migliore che abbiamo, ma i tre pirati sono capsule rosse uguali che si muovono come vermi. Come "gioco di pirati" non si distingue, e il proprietario lo ha già detto.
3. **I pirati sono illeggibili come personaggi.** Stesso sprite per Scarlatta, Fumo e Uncino, piccoli. Nello store contano la faccia e la sagoma, non il nome sopra la testa.
4. **I tasti coprono i nostri pirati.** In basso a sinistra le frecce e la scritta "Trascina il mirino oro" stanno sopra Fumo e Uncino (screenshot 03).
5. **Nessun motivo per tornare.** Dopo l'esito non c'è sblocco, stella o arma nuova. La carriera è il motivo per cui il gioco vale 1,99 €, e per ora non esiste.
6. **Testi solo in italiano.** Lo Store e la maggior parte del pubblico sono in inglese.
7. Cose a posto: il turno dell'IA dura circa 9 s, il turno parte da solo, la mappa a 800×360 è chiara e colorata. Nessun errore in console.

## 3. Decisioni
1. **Posizionamento.** "Conquista un arcipelago di fantasia: ogni isola si decide con una battaglia di cannoni a turni su terreno che crolla." Nessun concorrente che conosco unisce le due cose in un gioco offline senza abbonamenti: i giochi con cannoni a turni (Worms, Hills of Steel, Bowmasters) non hanno la mappa conquistabile, e i Risiko digitali (come Risk: Global Domination) sono pensati per il gioco online. *Costo S. Pacchetto 2.*
2. **La pagina dello Store si progetta adesso.** 5 screenshot orizzontali: (1) esplosione che apre un cratere, (2) mappa del mondo con i mari, (3) pirata che dondola su una corda, (4) scelta ciurma/boss, (5) "Nuovo nella stiva!". I punti 3 e 4 dipendono dal nuovo movimento da pirata: è quello che ci distingue da Worms, quindi è anche la nostra pubblicità. *Costo M. Pacchetto 1 e 2.*
3. **Mai le parole "Worms" o "Risk" nel testo dello Store** (marchi: rischio di rimozione). Si dice "cannoni a turni" e "conquista". *Costo S.*
4. **Primo minuto.** Il Prologo deve arrivare al primo scoppio entro 90 secondi dall'apertura, senza schermate di scelta. Dopo la vittoria: "Nuovo nella stiva!" (armi 5, 6, 14) e la mappa dei mari che si colora. *Costo M. Pacchetto 2.*
5. **Cosa deve avere il cap. 1 per convincere** (dura ~45 min, è tutta la parte gratuita): un momento "wow" di distruzione entro 5 min (ponte che crolla, barili a catena); la prima arma nuova entro 10 min; un finale con cliffhanger, la lettera di Barbabrina che sfida Scarlatta, così il giocatore vuole il cap. 2. *Costo M. Pacchetto 2, con Narrativa.*
6. **Il paywall sta dopo una vittoria, mai dopo una sconfitta e mai in battaglia.** Schermata unica a fine cap. 1: mappa con i mari 2-8 nella nebbia, "Sblocca tutto, 1,99 €, una volta sola", "Ripristina acquisto", "Continua a giocare gratis" (Schermaglia). Un solo prodotto non consumabile. *Costo M. Pacchetto 2.*
7. **Numeri onesti.** Il prezzo Google include l'IVA: da 1,99 € restano circa 1,4 € dopo IVA e commissione del 15%. Con 1.000 installazioni e 4% di acquisti sono circa 55 €; con 10.000, circa 550 €. Non è un guadagno: l'obiettivo è **recensioni e vetrina**, quindi 13 ore di campagna a 1,99 € è la scelta giusta. Non si cambia prezzo prima di avere 100 recensioni. *Costo S.*
8. **Test chiuso in cima alla lista.** I 14 giorni con 12 tester partono solo quando c'è una build in test chiuso: appena Prologo + cap. 1 reggono, si carica un AAB firmato e si recluta (15 persone, con interruttore "sblocca tutto"). Va in calendario dal Producer. *Costo S. Pacchetto 2.*
9. **Inglese prima del test chiuso**, non dopo: il file di stringhe c'è già; traduzione di ~300 stringhe con revisione. Titolo, descrizione breve e lunga in italiano e inglese. *Costo S.*
10. **Verifica del nome e classificazione.** "Kaboom Ahoy!" libero sul Play Store (00 §9.1: ancora da fare), questionario IARC con il rum (atteso PEGI 12), pubblico 13+, nessun SDK di terzi, scheda dati "nessun dato raccolto". *Costo S.*

## 4. Cosa NON fare
- Niente pubblicità, energia, valuta, casse a pagamento, "togli le pubblicità".
- Niente cosmetici in vendita nella 1.0.
- Niente muro di pagamento dentro un capitolo.
- Niente prezzo 4,99 € né sconti finti.
- Niente multiplayer online né telemetria inviata.
- Non confrontarsi con altri giochi nella pubblicità: si mostra il gioco, non il paragone.

## 5. Dipendenze e conflitti
- **Game design / Progressione**: la lunghezza e il finale del cap. 1 (~45 min) decidono la conversione.
- **Animazione**: pirati distinguibili e movimento da pirata sono la base degli screenshot (decisione 2).
- **Arte/UI**: icona 512, grafica 1024×500, 5 screenshot, mappa dei mari con nebbia; sistemare i tasti che coprono i pirati.
- **Narrativa**: lettera di Barbabrina e scene d'apertura.
- **Tecnica**: Play Billing (plugin Capacitor), AAB firmato, minSdk 31 (esclude i telefoni sotto Android 12: accettabile, va detto nella scheda).
- **QA**: casi "acquisto ripristinato", "sblocca tutto" e profilo corrotto.
- **Producer**: calendario del test chiuso; conflitto di 15-carriera §4 (cap. 1-2 a 4,99 €) con 00 §9.12, vale 00.

## 6. Domande per il proprietario
Nessuna.
