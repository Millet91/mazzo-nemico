# 12 · Monetizzazione & Live Ops

*Responsabile Monetizzazione & Live Ops. Solo design. Basato su BRIEF, 01–04. Non esiste ancora 05-revisione.md: se poi cambia qualcosa (nomi fazioni, numero pirati), qui cambiano solo gli esempi, non le decisioni.*

Partiamo da quello che il gioco è: una **campagna single player da 60–120 minuti**, rigiocabile (3 difficoltà, 4 ciurme, seme casuale), **offline**, senza account, salvataggio locale. Non è un gioco-servizio: non ha server, PvP o progressione infinita. Il modello di business deve partire da qui, non da quello che fanno i giochi free-to-play.

---

## 1. I tre modelli

### A. Premium a pagamento (es. 3,99 €, tutto incluso)
| Pro | Contro |
|---|---|
| Il più semplice: nessun acquisto in-app, niente Play Billing da integrare, scheda "Dati raccolti" quasi vuota | Su Android quasi nessuno compra un gioco sconosciuto senza provarlo: download vicini allo zero senza marketing |
| Coerente con il genere (Worms, Risiko digitale sono stati per anni premium) | Rimborso automatico entro 2 ore: chi lo prova e lo restituisce non lascia nulla |
| Nessun incentivo a peggiorare il gioco | Niente "prova" = niente passaparola tra amici |

### B. Gratis + sblocco completo unico (es. 4,99 €, una volta sola)
Versione gratuita **vera e giocabile**, poi un solo acquisto sblocca tutto per sempre.
| Pro | Contro |
|---|---|
| Chiunque lo prova; chi si diverte paga una volta e ha finito | Bisogna scegliere bene dove finisce la parte gratis (troppo poco = disinstallano, troppo = nessuno paga) |
| Onesto e facile da spiegare: "Prova gratis, sblocca la campagna completa" | Serve Play Billing (un solo prodotto "non consumabile") e il ripristino dell'acquisto |
| Si accoppia bene con pacchetti cosmetici facoltativi più avanti | Conversione tipica bassa (indicativamente 2–5% di chi installa) |

### C. Free-to-play con cosmetici
Tutto il gioco gratis, si vendono solo bandiere, cappelli, lapidi, esplosioni.
| Pro | Contro |
|---|---|
| Massima diffusione | **Non regge con un gioco single player offline**: chi paga per una lapide che vede solo lui? Il cosmetico vende quando *altri* lo vedono (multiplayer) |
| Nessuna barriera | Per guadagnare servono negozio a rotazione, valuta virtuale, eventi a tempo: proprio le meccaniche che non vogliamo |
| | Richiede un catalogo grande e asset continui (costo Magnific + tempo) per incassare poco |

---

## 2. Raccomandazione: **B, gratis + sblocco unico**, con cosmetici a pacchetto solo più avanti

**Cosa è gratis (la "prova"):**
- Tutorial completo.
- **Schermaglia**: battaglie singole sui biomi Isola tropicale e Porto (2 su 6), tutte le armi base.
- **Campagna ridotta "Costa del Teschio"**: le regioni A e B (9 territori), una ciurma sola, fino alla conquista o a 10 round. È una partita vera con inizio e fine, circa 30 minuti.

**Cosa sblocca l'acquisto (prezzo indicativo 4,99 €):**
- Campagna completa (28 territori, 4 ciurme giocabili, 3 difficoltà, 3 slot).
- Tutti e 6 i biomi in schermaglia.
- In futuro: pass and play (§4) incluso senza costi aggiuntivi.

**Perché:** il gioco ha un costo fisso (sviluppo) e nessun costo per giocatore (niente server). Un acquisto unico è proporzionato. La prova gratuita risolve il problema principale del premium (nessuno lo scarica) senza le trappole del free-to-play. Ci aspettiamo ricavi modesti: con 5.000 installazioni e il 3% di conversione sono ~150 acquisti, cioè ~640 € netti dopo la commissione Google del 15%. Va detto chiaro: il primo obiettivo realistico è **farsi giocare**, non guadagnare.

**Regole che non si toccano:**
- **Niente pay-to-win.** Nessun acquisto dà pirati, dobloni, armi, carte o vantaggi in battaglia. Dobloni e Mappe del Tesoro si guadagnano solo giocando.
- **Niente valuta premium** (gemme, perle…): si paga in euro e si vede il prezzo in euro.
- **Niente casse a sorpresa a pagamento** né "gacha". Le casse in battaglia restano una meccanica di gioco gratuita.
- **Niente timer di attesa**, energia, "torna domani", notifiche push di richiamo, offerte "solo per 10 minuti".
- **Niente pubblicità**: rovina il ritmo, porta SDK di tracciamento e complica la classificazione dei dati.
- Il pulsante "Sblocca" compare in **3 punti soltanto**: menu principale, fine della campagna ridotta, biomi bloccati in schermaglia. Mai durante una battaglia, mai dopo una sconfitta.

---

## 3. Cosmetici (dopo la 1.0, facoltativi)

Venduti come **pacchetti a prezzo fisso** (1,99–2,99 €), sempre visibili per intero prima di comprarli, mai casuali. Inoltre **ogni cosmetico ha una versione gratuita** sbloccabile giocando (es. vincere a Capitano dà la bandiera d'oro), così chi non paga non si sente escluso.

| Categoria | Esempi | Note di produzione |
|---|---|---|
| **Bandiere** | Kraken, Sole nero, Rosa dei venti, Teschio di cristallo | Stesso sistema della bandiera magenta ricolorata (03 §8.2): solo emblema nuovo |
| **Cappelli** | Tricorno, Bandana lunga, Cappello piumato, Corona di conchiglie, Elmo vichingo | Sovrapposizione testa (lotto 2 di 03 già lo prevede) |
| **Lapidi** | Croce col cappello (base), Forziere, Ancora, Pappagallo impagliato, Bottiglia col messaggio | Sprite 64 px statico; si vedono a ogni morte, quindi spesso |
| **Esplosioni** | Coriandoli, Fuochi d'artificio, Inchiostro di seppia, Monete d'oro | **Solo colore e forma delle particelle**: raggio, danno e cratere identici (regola di test: stesso hash della simulazione) |
| Extra | Voci dei pirati, scia dei proiettili, vascello del menu | |

Esempio di pacchetto: "Ciurma dei Ghiacci" = bandiera + cappello + lapide + esplosione a tema, 2,99 €.

---

## 4. Contenuti futuri (live ops leggera)

Ordine consigliato, dal meno costoso al più costoso. Nessun calendario a scadenza: aggiornamenti quando sono pronti.

1. **1.1 — Pass and play** (già progettato in 02 §8): 2–4 umani sullo stesso telefono. Gratis per chi ha lo sblocco. È la feature che fa passaparola.
2. **1.2 — Nuove armi** (2–4 per aggiornamento): grazie al modello dati (04 §5) una nuova arma è una riga. Sempre gratuite per tutti, perché sono gameplay.
3. **1.3 — Nuove ciurme giocabili** (es. la Marina Reale come quinta fazione giocabile, una ciurma di scheletri): gratis, con il loro pacchetto cosmetico facoltativo.
4. **2.0 — Nuovo mondo** (es. "Mari del Drago", 24 territori, 2 biomi nuovi): questa è l'unica cosa che può essere un **acquisto separato** (espansione, 2,99 €), perché è un contenuto grande e intero, non un vantaggio.
5. **Sfida settimanale offline**: un seme fisso a settimana (mappa + condizioni) generato dalla data, senza server. Classifica solo locale/personale.
6. **Multiplayer online**: per ultimo e solo se i numeri lo giustificano. Il motore deterministico (04 §2) permette il multiplayer **asincrono a turni** (si inviano solo i comandi), ma servono server, account, moderazione e una nuova classificazione dei dati. È un progetto a sé.

---

## 5. Requisiti Play Store

**Classificazione età (questionario IARC in Play Console):**
- Violenza cartoon, non realistica, niente sangue, personaggi che svaniscono in uno sbuffo: risultato atteso **PEGI 7 / ESRB Everyone 10+** (lo decide il questionario, non noi).
- Rispondere **Sì** a "acquisti in-app" (sblocco). Niente gioco d'azzardo simulato: le casse non si comprano e non c'è denaro reale in palio. Rum e polvere da sparo: riferimenti a alcol in tono comico, da dichiarare se il questionario lo chiede.
- **Pubblico di destinazione: 13+.** Lo stile è da cartoni, quindi Google potrebbe chiedere se "attrae i bambini": dichiarare un pubblico sotto i 13 anni fa entrare nel programma Famiglie (regole più severe su SDK, acquisti e pubblicità). Scelta consigliata: 13+ e nessun SDK di terze parti, così siamo a posto in ogni caso.

**Privacy e dati raccolti:**
- **Privacy policy** obbligatoria, su una pagina web pubblica (può stare sul sito già esistente del proprietario). Una pagina breve: "Il gioco non raccoglie dati personali. I salvataggi restano sul telefono. Gli acquisti sono gestiti da Google Play."
- **Scheda "Sicurezza dei dati"**: va compilata anche se non raccogliamo nulla. Con la v1 come proposta: *nessun dato raccolto, nessun dato condiviso*. Play Billing è gestito da Google e non conta come raccolta nostra.
- **Attenzione alla telemetria**: 01 §9 e §10 parlano di metriche (durata battaglie, uso armi). In v1 restano **locali** o nel simulatore (`npm run sim`). Se un giorno si inviano a un server (o si aggiunge Crashlytics/Firebase), cambia la scheda dati e serve consenso.
- Permessi Android: solo quelli che servono (vibrazione). Niente internet se non per la verifica degli acquisti.

**Requisiti tecnici e di account:**
- Pubblicare un **AAB firmato** (non l'APK di prova), con l'API Android di destinazione richiesta da Google in quel momento: va verificata prima dell'invio, la soglia sale ogni anno. Il workflow `apk.yml` resta per i test; serve un secondo workflow per la release.
- `appId` definitivo scelto **una volta sola** (04 §9): sul Play Store non si cambia più.
- Gli account sviluppatore personali creati di recente devono fare un **test chiuso con almeno 12 tester per 14 giorni** prima della produzione: va messo in calendario (14-produzione).
- Per vendere lo sblocco serve un **profilo pagamenti** Google collegato all'account, con dati fiscali.
- Scheda dello store: icona 512, grafica in evidenza 1024×500, almeno 2 screenshot orizzontali, video facoltativo (il loop del menu 03 #32 va benissimo).

---

## 6. Cosa NON fare nella prima versione

1. Niente cosmetici in vendita, niente negozio. Solo lo sblocco unico (e nel test chiuso nemmeno quello: tutto aperto).
2. Niente pubblicità, niente SDK di analisi o crash di terze parti.
3. Niente account, login, cloud save, classifiche online.
4. Niente multiplayer online e niente pass and play (arriva in 1.1).
5. Niente eventi a tempo, ricompense giornaliere, notifiche push.
6. Niente valuta acquistabile o pacchetti di dobloni, mai.
7. Niente localizzazione oltre italiano e inglese (l'inglese serve per la scheda dello store e per il pubblico).
8. Niente prezzo "lancio scontato" o finti sconti barrati.

---

## Domande per il proprietario

1. **Obiettivo**: il gioco deve guadagnare qualcosa o basta che lo giochino amici e famiglia? Se basta il secondo, la 1.0 può essere completamente gratuita e lo sblocco si aggiunge dopo.
2. **Prezzo dello sblocco**: 3,99 €, 4,99 € o 5,99 €? (Consiglio 4,99 €.)
3. **Account Play Console**: personale o di un'attività (es. lo studio grafico)? Cambia la verifica, il nome pubblico dello sviluppatore e l'obbligo del test chiuso con 12 tester.
