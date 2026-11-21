# BARO · Game Design Document unico

*Titolo di lavoro: **Baro** (concept "Il mazzo nemico") · Versione 1.0 · 21 novembre 2026*
*Lead Game Designer. Sintesi e arbitrato dei 12 documenti dello studio in `/mnt/project-files/studio/`.*
*Simulazione allegata: [sim-regole-v1.py](sim-regole-v1.py), risultati in [sim-regole-v1-risultati.txt](sim-regole-v1-risultati.txt).*

> Questo documento sostituisce i documenti di reparto dove li contraddice. Le regole del §4 sono l'**oracolo**: il codice, i test e il prototipo cartaceo devono dare esattamente questi esiti. Dove un documento di reparto aggiunge dettaglio senza contraddire, resta valido come approfondimento.

---

## 0. Il responso in breve

1. **Il gioco regge, e lo studio è d'accordo sul cuore.** Tutte le 12 figure confermano l'idea: un tower defense senza mappa dove il campo di battaglia è **l'ordine e la probabilità** di un mazzo nemico. Il loop "prepara e guarda" resta. I disaccordi erano sulle regole di dettaglio, non sulla direzione.
2. **Ho chiuso tutte le 22 contraddizioni** trovate dal QA, più altre 9 emerse leggendo i documenti. Ogni decisione è nel §2 con il motivo.
3. **Le scelte che pesano di più:** una sola statistica (**Forza**, vita e danno insieme); i **Segni** (le torri) agiscono a ogni tick e si spostano liberamente sui 5 Passi; il mazzo nemico è **persistente** e si rimescola a ogni ondata; le Catture diventano **Patti**, un momento fisso dopo élite e boss, con una Lealtà che scade; ambientazione **La Veglia** (folklore italiano, carte regionali, tu sei il Baro che trucca il mazzo del Fato).
4. **I numeri sono verificati con una simulazione nuova** che gioca le regole vere, tick per tick, su run complete di 15 rintocchi. Con **35 Lumi** vince il 20% di un bot che sceglie a caso, il 57% di un bot "medio" e il 93% di un bot che prevede l'ondata. Lo scarto di abilità è ampio, come chiedeva il Balance.
5. **Le due scelte che cambiavano il gioco sono chiuse** (§18, 21 novembre 2026): l'"Asso nella manica" c'è, uno per ondata, attivabile per l'A/B; l'ambientazione è La Veglia, con il titolo provvisorio Baro.
6. **Prossimo passo:** aggiornare il prototipo cartaceo a queste regole (1 settimana), poi il prototipo browser in 4 settimane.

---

## 1. Visione

### 1.1 Il gioco in una frase
> **Il Fato ti dà le carte. Tu bari.**

Un roguelike di carte con l'anima di un tower defense. Il nemico è un mazzo che a ogni ondata pesca sventure e le manda, una dietro l'altra, lungo cinque Passi fino alla tua porta. Tu non giochi carte: **trucchi il mazzo e le regole con cui viene giocato**. Prepari, poi guardi la tua macchina di imbrogli che lo smonta carta dopo carta.

### 1.2 La fantasy del giocatore
Sei il **Baro**, l'unica persona del paese capace di toccare le carte del Fato senza bruciarsi. Non puoi rifiutare la partita, ma puoi segnare le carte, riordinarle, mettere da parte quelle che non ti piacciono e stringere patti con le sventure perché combattano per te.

Le emozioni, in ordine di importanza (Creative Director):
1. **Astuzia**: "ho visto il trucco prima di lui".
2. **Suspense**: la carta pesante che avanza verso la porta, e tu che speri che il Segno sulla Scala regga.
3. **Rivincita**: usare una carta del Fato contro il Fato.
4. **Onnipotenza conquistata**: a fine run il mazzo nemico è mezzo tuo e si rompe da solo.

Quello che non vogliamo mai: la sensazione che il caso abbia deciso al posto tuo. **Ogni sconfitta deve avere una causa leggibile.**

### 1.3 I cinque pilastri
Una feature che non supera almeno una domanda di controllo non entra nel gioco.

| Pilastro | Domanda di controllo |
|---|---|
| **Truccare, non combattere.** Ogni difesa imbroglia regole, ordine o probabilità. | Questa difesa cambia cosa arriva, quando arriva o come viene trattato? |
| **Il mazzo nemico è un personaggio.** Cresce, ha un padrone, si guarda e si capisce. | Rende il mazzo più riconoscibile o più vivo? |
| **Ogni trucco ha un prezzo.** Nessuna difesa è solo positiva. | Esiste un mazzo contro cui questa difesa è una cattiva idea? |
| **Si legge in un colpo d'occhio, si capisce alla terza ondata.** | Un nuovo giocatore capisce la carta senza leggere il testo lungo? |
| **Guardare è uno spettacolo.** La risoluzione è coreografata. | È divertente guardarla anche a velocità 2×? |

### 1.4 Cosa lo rende unico
- **Antagonismo del mazzo**: nei deckbuilder costruisci il tuo mazzo, qui riscrivi quello del nemico.
- **La probabilità come mappa**: il terreno su cui piazzi le difese è l'ordine di pescata.
- **I Patti**: a fine run il mazzo del Fato è un ibrido, in parte tuo.
- **Identità culturale precisa**: carte regionali italiane, folklore, il baro contro il Fato. Riconoscibile in uno screenshot.

### 1.5 Pubblico, piattaforme, prezzo
- **Pubblico primario:** giocatori PC di roguelike di carte "da motore" (Balatro, Slay the Spire, Luck be a Landlord), 20-40 anni, sessioni da 30-50 minuti. Secondario: fan dei tower defense stanchi delle mappe, giocatori di autobattler.
- **Posizionamento:** *roguelike di carte con l'anima di un tower defense*. Mai "tower defense" come prima parola.
- **Piattaforme:** prototipo nel browser; demo ed Early Access su Steam (Windows, poi Mac, Linux, Steam Deck); 1.0 anche su Switch; poi mobile premium.
- **Prezzo:** Early Access 12,99 €, 1.0 a 14,99 €. Niente free-to-play né microtransazioni.
- **Originalità:** il Producer non ha trovato giochi commerciali con questo nucleo. Gli ibridi carte + TD esistenti usano le carte per piazzare torri su una mappa, quindi non sono concorrenti diretti.

---

## 2. Decisioni prese

Ogni riga è un conflitto tra documenti (numerati come nel QA, §2 di playtest-qa.md) o un problema trovato rileggendo. "Perché" spiega la scelta in una frase o due.

### 2.1 Le nove bloccanti

| # | Conflitto | Decisione | Perché |
|---|---|---|---|
| 1 | **Dove finiscono le carte distrutte** (scarti separati, rimescolo solo a mazzo finito, Archivista che "ricicla") | **Il mazzo è persistente e si rimescola tutto a ogni ondata.** Le carte distrutte e quelle arrivate alla Soglia tornano nel mazzo a fine ondata. Escono per sempre solo con l'**Esilio** (negozio, Pozzo, Rogo dell'Archivio). | È il modello del Systems e l'unico senza stato nascosto: il giocatore vede sempre "com'è fatto il mazzo adesso". Dà valore vero all'Esilio. Distruggere una carta vale per l'ondata, i Spiccioli e la possibilità di un Patto. |
| 2 | **Statistiche** (HP/danno del Balance, D/R del Content, solo danno del Tech) | **Una sola statistica, la Forza**: è la vita della carta e il danno che fa alla Soglia. Ogni danno subito riduce anche il danno che farà. | Leggibile in un numero. È anche il "danno parziale" che il Balance chiedeva contro l'effetto lama di coltello (una carta o muore o colpisce per intero). |
| 3 | **PV della Soglia** (30 o 50) | **35 Lumi.** | La simulazione con le regole unificate dà 20% / 57% / 93% di vittorie (bot casuale, medio, che prevede), dentro l'obiettivo del Balance (medio 50-60%). Con 30 il medio scende al 48%, con 40 sale al 70%, con 45 all'81% (§7.3). |
| 4 | **Ordine del tick** (Leggi da S1 a S5 o dal fronte; Manomissioni dentro il tick o prima) | Trucchi e Rito agiscono **una volta**, alla pescata. Poi ogni tick: **Avanzamento** (dal fronte al retro), **Ingresso**, **Segni** (dal Passo 5 al Passo 1), **abilità nemiche**, **Infiltrati**, **Brucia**. **Morte immediata**, effetti in coda FIFO. | È l'ordine del Technical e del Systems, il più leggibile ("le cose succedono nell'ordine in cui si vedono"). La morte immediata permette alla UI di mostrare un evento alla volta. |
| 5 | **Corazza** (prima difesa, prima istanza di danno, prima Legge, prima per priorità) | **Corazza N = N cariche.** Ogni carica annulla la prossima istanza di danno **o** effetto negativo che viene **da te** (Segni, Brucia, Esca, Infiltrati), distruzione compresa. Spina e Calamita la tolgono e non ne sono bloccate. Le fonti nemiche (Esplosivo) la ignorano. | Una regola sola, senza eccezioni per tipo di effetto. Il giocatore impara "lo scudo para il primo colpo, qualunque sia". |
| 6 | **Sciame** (la copia "dietro S1" non esiste) | Quando la carta entra, una **Copia** (stessa carta, Forza base, senza Sciame) va **in testa alla Coda** ed entra al tick dopo. La Copia è un gettone: non dà Spiccioli e sparisce a fine ondata. | Implementabile, niente crescita esponenziale (Content, Systems e Tech concordano). |
| 7 | **Ladro** (furto per sempre, a caso, la più recente, per un'ondata) | All'Impatto il Ladro **ruba il Segno nel Passo più vicino all'Uscio** e torna nel mazzo **con il bottino**. Lo riprendi distruggendolo o esiliandolo in un'ondata futura, oppure con il **Riscatto** al negozio (8 Spiccioli). Se non hai Segni, ruba 3 Spiccioli. | Deterministico (il giocatore sa quale Segno rischia), reversibile, e dà un obiettivo invece di frustrazione. Art e UX possono tenere l'animazione del furto vero. |
| 8 | **Vuoto** (fa sparire la carta davanti, che aiuta il giocatore, o la rimanda nel mazzo) | La keyword si chiama **Silenzio**: i tuoi Segni nel Passo occupato da quella carta non agiscono. | L'abilità nemica deve essere una minaccia, non un regalo. È leggibile: "dove c'è lei, i Segni tacciono". |
| 9 | **Catture** (5 modelli) | **Un solo modello: i Patti** (§4.8). Dopo ogni ondata Élite e ogni Mazziere scegli una carta distrutta in quell'ondata e la rendi tua: resta nel mazzo nemico come **Infiltrato**, viene pescata come le altre, cammina nella Fila dalla tua parte e all'Impatto ti cura. Ha **Lealtà 3** e dopo 3 ondate in cui è stata pescata **ti tradisce** con +2 Forza, a meno che tu non la rinsaldi. Massimo 3 Patti. | Prende la promozione a "momento del loop" del Creative, il modello Infiltrato del Systems (il più semplice da muovere e da mostrare), il tetto del Balance, il nome e il rischio della Narrativa. Il modello del Content (alleate che camminano al contrario e si scontrano) è scartato: due direzioni di movimento creano casi limite e una lettura difficile. |

### 2.2 Le importanti

| # | Conflitto | Decisione | Perché |
|---|---|---|---|
| 10 | **Più Ordinamenti attivi** | **Un solo Rito attivo** (la "Regola della casa"). Gli altri restano nel Deposito e li scambi gratis in Preparazione. | Zero contraddizioni tra ordinamenti, scelta chiara a ogni ondata. |
| 11 | **Tre o quattro famiglie** | **Quattro famiglie** (Segni, Trucchi, Riti, Patti), ma **i Patti non sono nella scelta 1 tra 3**: hanno un loro momento. | Tiene le 4 zone della pipeline su cui UX, Art e Audio hanno già disegnato forme, colori e strumenti, e realizza l'idea del Creative di promuovere le catture a meccanica firma. |
| 12 | **Pescata e mazzo** | Mazzo iniziale **10 carte**. Pescate per ondata da 6 (Atto I) a 13 (Atto III), tabella §7.2. Il Fato aggiunge 2, 2, 3 carte per ondata (Atto I, II, III). | Tarato in simulazione: Atto I gentile, Atto III teso. |
| 13 | **Rarità e prezzi** | Tre rarità (Comune, Non comune, Rara), probabilità del Balance con pity timer. Prezzi 12 / 18 / 25 Spiccioli. Le leggendarie del Content diventano rare. | Con circa 9 Spiccioli guadagnati per ondata si fanno 2-3 acquisti per negozio. |
| 14 | **Tetto delle difese** | **5 Segni** (uno per Passo, due con un **Basamento**), **2 Trucchi**, **1 Rito**, **3 Patti**. Il resto va nel **Deposito**. I Segni **si spostano liberamente** tra i Passi in ogni Preparazione. | Sono 8 difese attive, il tetto che il Balance indica come parametro più importante. I Segni liberi risolvono il problema del Content (Spine, Dazio e Ghigliottina tutte inchiodate in S1) e danno una decisione a ogni ondata. |
| 15 | **Boss: ordine e regole** | **Il Sagrestano → Il Forestiero → La Piena** (erano Archivista, Giocatore, Marea). Tre fasi ciascuno, regole del §5.4. La Marea a 10 slot con ritiro del Content è scartata perché crea un loop (il boss potrebbe non arrivare mai). | L'ordine è quello di Content, Narrativa, UX e Systems. La Piena alla fine mette alla prova la robustezza del piazzamento. |
| 16 | **Intervento attivo durante l'ondata** | **Sì: un "Asso nella manica" per ondata** (§18.1), acceso di default e spegnibile per l'A/B senza cambiare altro. | Cambia la natura del "guardare": dà un motivo per seguire l'ondata. |
| 17 | **Informazione e previsione** | Sempre visibili: **composizione del mazzo**, le **carte annunciate**, le **prime 2 carte della Coda**. In Preparazione una **previsione del danno come intervallo** (10°-90° percentile). Opzione "modalità istinto" che la nasconde. Il Censimento del Content è eliminato (dava ciò che è già gratis). | La leggibilità è il rischio numero uno per tutti i reparti. La suspense resta, perché l'ordine della Coda dopo le prime 2 carte è coperto. |
| 18 | **Durata del tick** | **1 tick = 1 battito a 96 BPM (0,625 s) a velocità 1×.** Specifica completa al §12.5. | Una sola griglia per audio, animazione e logica. |
| 19 | **Stack** | **TypeScript** con core puro, **Preact + Vite** per l'interfaccia, **Tone.js** per l'audio, Tauri per Steam, Capacitor per mobile. Niente Godot o Unity. | Il simulatore di bilanciamento deve essere il gioco stesso e girare in CI. |
| 20 | **Linguaggio visivo** | **L'oro è solo del giocatore.** Famiglie distinte dalla **forma del sigillo** (Segno esagono, Trucco rombo, Rito cerchio con freccia, Patto cerchio con catena) e dalla zona della pipeline. Semi distinti da colore, cornice e icona (§10.3). | Unisce i sistemi di Art e UX ed elimina il conflitto ottone/arancio contro oro. |
| 21 | **Ambientazione e nomi** | **La Veglia** (Narrativa), con il tono e i semi del Creative e i principi grafici dell'Art. **Bastoni** = bestie, **Coppe** = spettri, **Spade** = ferro e macchine, **Denari** = folla e debiti. Il "Notaio Occulto" dell'Art è scartato come mondo, ma il Notaio diventa uno dei Bari giocabili. Titolo di lavoro **Baro**, da verificare con il test sul nome (§15). | È l'unica proposta in cui il limite centrale (non giochi carte, trucchi quelle di un altro) è la fantasy stessa. Il marketing la preferisce nettamente. Confermata il 21 novembre 2026 (§18.2). |
| 22 | **Contenuti del prototipo** | **12 carte, 1 élite, 20 difese, 1 Mazziere** (§5.6). | Lista unica, coerente con le regole. |

### 2.3 Le minori e quelle trovate rileggendo

| Tema | Decisione | Perché |
|---|---|---|
| Leggi "a ogni carta che entra" o "a ogni tick" | **I Segni agiscono a ogni tick** sulla carta presente nel loro Passo. | È il "tempo nel raggio" dei TD: una carta rallentata o bloccata prende più colpi. Dà senso a Gelo, Lento e agli ingorghi, ed elimina lo stallo dell'Esca. |
| Fango (permanente o che scade) e il suo contraccolpo inesistente con l'Araldo | Il Trucco **Scartine** mescola 2 Scartine nel mazzo **per quell'ondata soltanto**. Il contraccolpo è reale: l'Ingordo cresce con le Scartine, e le Scartine assorbono Rimando, Pozzo e colpi dei Segni. | Niente diluizione infinita del mazzo, niente stato permanente. Il Systems aveva notato che "Araldo che pesca Fango" aiutava il giocatore. |
| Rimando che rimanda all'infinito | La carta rimandata torna in fondo al mazzo, non può tornare nella stessa ondata e prende **Rancore +1 Forza** permanente (massimo +2). | Anti-loop del Technical, più il prezzo del Balance ("si arrabbia"). |
| Esca che blocca la fila per sempre | L'Esca diventa un Trucco: la prima carta della Coda entra con −2 Forza. | Lo stallo L1 del QA sparisce. |
| Araldo + Fango che svuota il mazzo | L'Araldo pesca **una** carta, massimo 2 Araldi per ondata, nessuna ripescata. | Loop L4 chiuso. |
| Archivista "a ogni tick" che ricicla lo stesso Ratto | Il Sagrestano ricicla **tra una fase e l'altra**, non dentro la stessa fase. | Loop L3 chiuso. |
| Danno parziale per carte ferite | Automatico con la Forza unica. | Vedi #2. |
| Riposo (30% dopo il boss, Focolare, nodo a metà atto) | **Nodo Riposo** nella mappa: curi il 30% dei Lumi massimi (10), oppure Affini una difesa, oppure Studi la prossima pescata. | Una scelta, non un automatismo (Balance). |
| Difesa rubata e tetto | Il Segno rubato non occupa nessun posto finché non torna. | Nessuno lo diceva. |
| Echi del Balance (difese sostituite che danno Spiccioli) | Scartati: le difese sostituite vanno nel Deposito e restano usabili. | Il Deposito dà già una seconda vita alle difese. |
| Mazzo pre-mescolato o pescata lazy (Tech §6.3) | **Pre-mescolato** a inizio ondata. | Le difese di informazione "leggono" un ordine che esiste. |
| Difese o nemici prima nello stesso evento | **Prima le difese**, poi le carte nemiche. | Il giocatore è padrone delle sue combo. |
| Mazziere che muore troppo poco o troppo spesso | La carta del Mazziere è **Lenta** (ogni Segno la colpisce due volte) e ha Forza 10 / 12 / 14. | Prima della correzione era un pedaggio fisso e invincibile (0% di carte Mazziere distrutte in simulazione). Ora un buon giocatore la distrugge una volta su quattro. |
| Difficoltà tutta in fondo | **Bonus della notte**: a Mezzanotte (Atto II) e all'Ora Morta (Atto III) tutte le sventure hanno +1 Forza. Pescate più alte nelle ondate normali, più basse nelle fasi dei Mazzieri. | Nella prima taratura i Mazzieri facevano il 70% del danno. Resta una concentrazione sul finale (§7.4), ma le ondate normali ora contano. |
| Meta-progressione verticale o orizzontale | **Orizzontale** (Systems): sblocchi di varietà e difficoltà, nessun potenziamento permanente. Livelli di difficoltà unificati nei 10 **Sigilli** (§8.3). | Il mazzo nemico è un puzzle: se il giocatore diventa più forte a prescindere, il puzzle si svaluta. |

---

## 3. Mondo e glossario

### 3.1 La Veglia in breve
Nel paese di **Sottovento**, nella notte più lunga dell'anno, il **Mazziere** siede al crocevia e distribuisce a carte le sventure del prossimo anno. Chi supera la notte è salvo fino all'inverno dopo. Il giocatore è il **Baro**, nato "con le mani storte": non può impedire che il Fato dia le carte, ma può metterci le mani. Ogni run è una notte, ogni ondata un **rintocco** del campanile, ogni atto una veglia: **Vespro**, **Mezzanotte**, **Ora Morta**. All'alba canta il gallo.

Tono: fiaba popolare raccontata davanti al fuoco, macabra e ironica, mai cupa e mai gore.

### 3.2 Glossario (nome nel gioco ↔ termine di sistema)
Il gioco usa sempre i nomi del mondo. Il codice e questo documento usano i due nomi come sinonimi.

| Nel gioco | Termine di sistema | Cos'è |
|---|---|---|
| **Mazzo del Fato** | mazzo nemico | Tutte le carte nemiche, persistenti per la run. |
| **Coda** | coda d'ingresso | Le carte pescate per l'ondata, in fila d'attesa. |
| **Fila**, i **Cinque Passi** | fila, slot 1-5 | **Crocevia** (1, ingresso), **Strada** (2), **Cortile** (3), **Scala** (4), **Uscio** (5, l'ultimo prima della porta). |
| **Soglia**, **Lumi** | PV della Soglia | Le candele sul davanzale. A 0 la sventura entra in casa e la run finisce. |
| **Forza** | vita e danno | Un solo numero per carta nemica. |
| **Segni** | Leggi della fila (torri) | Simboli tracciati su un Passo. |
| **Trucchi** | Manomissioni del mazzo (trappole) | Agiscono sulla pescata. |
| **Riti** | Ordinamenti (pathing) | Decidono l'ordine d'ingresso. |
| **Patti** | Catture | Carte nemiche passate dalla tua parte. |
| **Infiltrato** | carta catturata | Un Patto mentre è nel mazzo o nella Fila. |
| **Spiccioli** | valuta della run (frammenti) | |
| **Scartine** | carte Fango | Carte inutili che mescoli nel mazzo. |
| **Mazzieri** | boss (padroni del mazzo) | Il Sagrestano, il Forestiero, la Piena. |
| **Rintocco** | ondata | 15 per run. |
| **Deposito** | riserva delle difese | Difese possedute ma non attive. |
| **Bari** | personaggi di partenza (Patroni) | Kit e passiva diversi. |
| **Sigilli** | livelli di difficoltà (ascensioni) | |

### 3.3 I quattro semi
| Seme | Natura | Comportamento tipico |
|---|---|---|
| **Bastoni** | bestie: lupi, topi, volpi, bestiame impazzito | numerose, veloci, di branco |
| **Coppe** | spettri: anime, nebbie, affogati | sfuggenti, zittiscono i Segni, ritornano |
| **Spade** | ferro: attrezzi maledetti, carri senza cavalli | Forza alta, Corazza, lente |
| **Denari** | folla e debiti: creditori, processioni, gazze | deboli ma si moltiplicano, rubano, colpiscono l'economia |

---

## 4. Regole v1 (la specifica)

Questa sezione è l'oracolo dei test (playtest-qa.md §7.2). Ogni keyword segue la forma **Quando / Effetto / Se manca il bersaglio**. Tutti i valori sono interi.

### 4.1 Componenti
- **Mazzo del Fato**: lista di carte persistenti. Ogni carta ha un nome, un seme e una Forza base, e può avere Rancore (+1 o +2), un bottino (un Segno rubato) o un proprietario diverso (Infiltrato).
- **Coda**: lista ordinata delle carte che entreranno in questa ondata.
- **Fila**: 5 Passi, numerati da 1 (Crocevia) a 5 (Uscio). Al massimo una carta per Passo. La Piena la allunga fino a 7.
- **Soglia**: 35 Lumi iniziali e massimi. Non scendono sotto 0 e non salgono sopra il massimo.
- **Difese del giocatore**: Segni sui Passi (1 posto per Passo, 2 con un Basamento), 2 posti Trucco, 1 posto Rito, fino a 3 Patti. Tutto il resto è nel **Deposito**.
- **Spiccioli**: valuta della run. Non scendono sotto 0.

### 4.2 Un'ondata (rintocco), passo per passo
1. **Annuncio.** Il Fato rivela le carte che aggiunge al mazzo in questo rintocco (2 nell'Atto I e II, 3 nell'Atto III) e le aggiunge subito. Il giocatore le vede prima di scegliere.
2. **Offerta.** Scegli 1 difesa tra 3, oppure salti e prendi 3 Spiccioli.
3. **Preparazione.** Senza limite di tempo:
   - sposti i Segni tra i Passi, li togli o li rimetti dal Deposito;
   - scambi Trucchi e Rito con quelli nel Deposito;
   - vedi la composizione del mazzo, le carte annunciate, la previsione del danno.
   Cambiare difese in Preparazione è gratis.
4. **Pescata.** In quest'ordine:
   1. il mazzo intero (Infiltrati compresi) viene **mescolato**; da qui l'ordine è fisso e le difese di informazione lo leggono;
   2. i **Trucchi** che agiscono prima della pescata (Scartine, Mazzo Truccato) si applicano nell'ordine dei loro posti;
   3. si pescano **N** carte dalla cima (N dalla tabella §7.2, modificato da Censura e Pescata Avara); i Trucchi che agiscono sulla carta pescata (Setaccio, Bavaglio, Pescata Avara) si applicano a ogni carta;
   4. l'eventuale carta élite si inserisce a metà della Coda;
   5. il **Rito** riordina la Coda con un ordinamento stabile (a parità resta l'ordine di pescata);
   6. Segnare sposta in fondo la carta segnata; le carte di regole dei Mazzieri si aggiungono in fondo; la carta del Mazziere va per ultima;
   7. l'Esca colpisce la prima carta nemica della Coda.
   Le **prime 2 carte della Coda** sono scoperte (4 con l'Oracolo). Il resto è coperto, ma il giocatore conosce la composizione.
5. **Risoluzione.** Tick dopo tick (§4.3) finché Coda e Fila sono vuote, oppure i Lumi arrivano a 0.
6. **Fine ondata.** Le Copie, le Scartine, i Corvi e le Disperazioni spariscono. Tutte le altre carte pescate tornano nel mazzo (tranne le esiliate). Gli Infiltrati pescati perdono 1 Lealtà. I Segni rubati tornano nel Deposito se il loro Ladro è stato distrutto.
7. **Ricompensa.** Spiccioli (§7.1). Dopo un'ondata Élite: **Momento del Patto** e scelta di 1 difesa rara tra 2.

Se il mazzo finisce durante una pescata (rarissimo: il mazzo non può scendere sotto "pescata + 4"), al posto di ogni carta mancante entra una **Disperazione** con Forza pari al numero del rintocco.

### 4.3 Il tick (ordine fisso)
1. **Avanzamento**, dalla carta più vicina alla Soglia verso il Crocevia:
   - la carta nell'**Uscio esce e fa Impatto** (§4.4);
   - ogni altra carta avanza di 1 Passo **se il Passo davanti è libero**; altrimenti resta ferma (**nessuno sorpassa**);
   - **Rapido**: avanza di 2 se entrambi i Passi davanti sono liberi (dal Passo 4 con l'Uscio libero esce e fa Impatto); altrimenti di 1;
   - **Lento**: avanza un tick sì e uno no; il primo tick dopo l'ingresso resta fermo;
   - **Gelata**: la carta resta ferma questo tick, poi il Gelo sparisce.
2. **Ingresso.** Se il Crocevia è libero e la Coda non è vuota, entra la prima carta della Coda. Si risolvono i suoi effetti "Quando entra".
3. **Segni**, dal Passo 5 al Passo 1. In un Passo con due Segni, prima quello piazzato per primo. Ogni Segno agisce sulla carta nemica **presente in quel momento** nel suo Passo. Un Passo vuoto, o con un Infiltrato, non attiva nulla.
4. **Abilità nemiche "a ogni tick"**, dal fronte al retro (Branco, Incudine).
5. **Infiltrati**: le loro abilità "a ogni tick", dal fronte al retro.
6. **Brucia**: ogni carta con Brucia perde tanta Forza quanto il suo Brucia, dal fronte al retro.
7. **Controllo**: se Coda e Fila sono vuote, l'ondata finisce.

Il simulatore conta in media **15 tick per ondata** (massimo osservato 76 con Passo Cadenzato e carte Lente).

### 4.4 Impatto, danno e morte
- **Impatto**: la carta nemica toglie ai Lumi la sua Forza attuale (più Esplosivo, meno Bastione). Un **Infiltrato** che fa Impatto **cura 1 Lume** invece di colpire (salvo girate diverse).
- **Danno a una carta**: riduce la sua Forza. A Forza 0 o meno la carta è **distrutta subito**.
- **Morte**: la carta esce dalla Fila e si risolvono, in quest'ordine, i suoi effetti "Alla morte", poi i Segni del Passo che reagiscono alle morti (Catena, Campana a Morto, Tagliola), poi gli effetti di altre carte che contano le morti. Gli effetti generati vanno in una **coda FIFO** e si risolvono uno alla volta.
- **Bersaglio sparito**: ogni effetto ricontrolla il bersaglio quando si risolve. Se la carta non c'è più, l'effetto **fizzla** e il log lo dice ("Brace non ha effetto: la carta è stata rimandata").
- **Fonti**: le fonti "del giocatore" sono Segni, Trucchi, Brucia e Infiltrati. Le fonti "nemiche" sono le abilità delle carte nemiche. La Corazza blocca solo le fonti del giocatore.
- **Priorità nello stesso evento**: regola del Mazziere, poi difese del giocatore, poi Infiltrati, poi carte nemiche; a parità, dal Passo più vicino all'Uscio; a parità, la più vecchia.

### 4.5 Keyword nemiche
| Keyword | Quando | Effetto | Se manca il bersaglio |
|---|---|---|---|
| **Sciame** | Quando entra | Una Copia della carta (Forza base, senza Sciame, stesso seme) va in testa alla Coda. La Copia non dà Spiccioli e sparisce a fine ondata. | Se la Coda è vuota la Copia entra comunque al tick dopo. |
| **Corazza N** | Sempre | N cariche. Ogni carica annulla la prossima istanza di danno o effetto negativo da una fonte del giocatore (danno, distruzione, Gelo, Rimando, Pozzo, Malocchio, Brucia, Esca). Spina toglie 1 carica, Calamita tutte, senza esserne bloccate. | — |
| **Ladro** | All'Impatto | Ruba il Segno nel Passo con il numero più alto che ne ha uno (se il Passo ne ha due, l'ultimo piazzato). La carta torna nel mazzo con il bottino, segnata da un'icona. Distruggerla o esiliarla rimette il Segno nel Deposito. Danno 0 all'Impatto conta come Impatto. | Senza Segni ruba 3 Spiccioli. |
| **Silenzio** | Finché è in un Passo | I Segni di quel Passo non agiscono. | — |
| **Araldo** | Quando entra | Pesca 1 carta dalla cima del mazzo e la mette in testa alla Coda (senza Rito). Massimo 2 attivazioni di Araldo per ondata. | Se il mazzo è vuoto non pesca e non genera Disperazione. |
| **Rapido** | Avanzamento | Avanza di 2 se entrambi i Passi davanti sono liberi. Salta il Passo intermedio, e i Segni di quel Passo non lo toccano. | — |
| **Lento** | Avanzamento | Avanza un tick sì e uno no, partendo da fermo. Chi è dietro aspetta. | — |
| **Tenace** | Alla prima morte | La prima volta che verrebbe distrutta (anche da Taglio) resta a Forza 1 e perde Tenace. | — |
| **Ritorno** | Alla morte | La prima volta nell'ondata in cui è distrutta, torna in fondo alla Coda con la Forza base. Dà comunque gli Spiccioli. | — |
| **Esplosivo N** | Alla morte / all'Impatto | Alla morte: N danni alle carte nei Passi adiacenti (fonte nemica: aiuta te se sono nemiche, ferisce gli Infiltrati). All'Impatto: +N danno. | — |
| **Sobilla N** | Alla morte | La carta nemica nel Passo davanti (verso l'Uscio) guadagna +N Forza. | Passo davanti vuoto: si perde. |
| **Branco N** | A ogni tick | Se la carta davanti è un Bastoni nemico, +1 Forza (fino a +N in totale). | — |
| **Ingordo** | Quando entra | +1 Forza per ogni Scartina pescata in questa ondata. | — |
| **Spinta** | Quando entra | Se c'è una carta nella Strada e il Cortile è libero, la spinge nel Cortile. | — |
| **Etereo** | Sempre | Ignora le istanze di danno di valore esattamente 1 (dopo le riduzioni). La Lanterna lo toglie prima di colpire. | — |
| **Velo** | Finché è in un Passo | La carta subito dietro di lei non può essere bersaglio dei Segni. | — |
| **Lamento funebre** | Quando entra | +1 Forza a tutte le carte nemiche in Fila. | — |
| **Forgia** | A ogni tick | Dà Corazza 1 alla carta nemica davanti, se non ne ha. | — |
| **Stonatura** | Finché è in Fila | I tuoi Segni infliggono 1 danno in meno (si somma con altre Stonature). | — |
| **Riscossione** | Quando entra | +1 Forza ogni 10 Spiccioli che hai (massimo +3). | — |
| **Esazione N** | All'Impatto | Ti toglie N Spiccioli. | — |
| **Richiamo** | Alla morte | Una volta per ondata, rimette in testa alla Coda l'ultima carta nemica normale distrutta in questa ondata. | Nessuna carta distrutta: nulla. |
| **Fretta** | Finché è in Fila | Le carte nemiche davanti a lei sono Rapide. | — |
| **Profezia** | Quando entra | Rimescola le carte rimaste in Coda: il tuo Rito non vale più per loro. | — |
| **Furia** | Quando entra | +1 Forza per ogni Denari distrutta in questa ondata (massimo +5). | — |
| **Innocua** | All'Impatto | Non fa danno. | — |
| **Rancore** (stato) | Permanente | +1 Forza per ogni volta che la carta è stata rimandata (massimo +2). | — |

**Regola di semplicità (Art, Content):** una carta normale ha al massimo due keyword. Le élite ne hanno tre.

### 4.6 Le difese: posti, Deposito, scelta
- **Segni**: un posto per Passo. Un **Basamento** (negozio, 15 Spiccioli) aggiunge un secondo posto a un Passo. Il Bastione si piazza solo sull'Uscio.
- **Trucchi**: 2 posti (3 con la passiva della Fattucchiera o l'evento Banco dei pegni).
- **Rito**: 1 posto.
- **Deposito**: senza limite. Le difese sostituite e quelle restituite finiscono qui.
- **Copie**: non puoi possedere due copie della stessa difesa. Una difesa non compare due volte nella stessa terna.
- **Offerta 1 tra 3**: rarità per ogni opzione nella tabella §7.2, più un **pity timer** (+2% di rara a ogni offerta senza rare, azzerato quando ne esce una). Un **reroll** gratis per atto, poi 3 Spiccioli.
- **Affinare** (al Riposo): una difesa diventa la sua versione **+** (colonna "Potenziata" nel §5.3). Una sola volta per difesa.
- **Vendere** (al negozio): metà del prezzo, arrotondato per difetto.

### 4.7 L'Asso nella manica (modulo, vedi §18.1)
Se attivo: **una volta per ondata**, durante la risoluzione, il giocatore mette in pausa e sceglie **una** azione, che avviene all'inizio del tick successivo:
- **Trattieni**: la carta nel Passo scelto non avanza in questo tick;
- **Scambia**: scambia due carte nemiche in Passi adiacenti.
L'Asso non si accumula. La previsione mostra sempre l'esito **senza** Asso.

### 4.8 I Patti
- **Quando**: dopo ogni ondata **Élite**, dopo ogni **Mazziere** sconfitto, e con alcuni eventi (Il Pozzo dei Desideri).
- **Cosa scegli**: una carta normale (non élite, non Mazziere, non gettone) **distrutta in quell'ondata**. In alternativa prendi 5 Spiccioli. La UI mostra prima della scelta la girata della carta e cosa succede quando tradisce.
- **Come vive**: la carta resta **nel Mazzo del Fato** con cornice d'oro. Viene pescata e ordinata come le altre (occupa un posto della pescata, quindi una sventura in meno). In Fila cammina come le altre e **blocca** chi è dietro. I tuoi Segni non la colpiscono, le abilità nemiche sì (Esplosivo la ferisce: a Forza 0 torna nel mazzo e perde 1 Lealtà in più).
- **Cosa fa**: la sua **girata** (§5.1). All'Impatto cura 1 Lume.
- **Lealtà**: parte da 3. Perde 1 alla fine di ogni ondata in cui è stata pescata. A 0 **tradisce**: torna nemica con **+2 Forza** permanente, con l'aspetto "Corrotto".
- **Rinsaldare** (negozio, 6 Spiccioli): +2 Lealtà. **Sciogliere** (negozio, gratis): la carta esce dal mazzo per sempre.
- **Tetto**: 3 Patti attivi. Il quarto richiede di scioglierne uno.

### 4.9 Limiti di sistema e anti-loop
| Limite | Valore | Cosa succede se si supera |
|---|---|---|
| Tick per ondata | 80 | "Il mazzo collassa": ogni carta nemica rimasta in Fila e in Coda colpisce con metà Forza (per eccesso). Va segnalato come **bug di design**. |
| Profondità di una catena di effetti | 16 | La catena si interrompe, il log lo dice. |
| Eventi per ondata | 2.000 | Come i tick. |
| Araldi per ondata | 2 attivazioni | Gli altri non pescano. |
| Rimando | 1 volta per carta per ondata | La carta rimandata non torna in questa ondata. |
| Ritorno, Tenace, Richiamo | 1 volta per carta per ondata | |
| Mazzo minimo | pescata dell'atto + 4 | L'esilio non è permesso sotto questa soglia. |
| Copie dello Sciame | non hanno Sciame | |

In 1.500 run simulate nessuna ondata ha toccato questi limiti.

### 4.10 Esempi risolti
**Esempio 1: la Corazza insegna l'ordine.** Segni: Brace nel Cortile (−2), Taglio sulla Scala (distrugge Forza ≤ 2). Coda: Falce Sola (Spade, 3, Corazza 1), Lupo (3).
- T1: la Falce entra nel Crocevia.
- T2: Falce nella Strada, il Lupo entra.
- T3: Falce nel Cortile, la Brace la colpisce ma la Corazza para (Corazza 0, Forza 3). Lupo nella Strada.
- T4: Falce sulla Scala: Forza 3, il Taglio non agisce. Lupo nel Cortile: Brace, Forza 1.
- T5: Falce sull'Uscio. Lupo sulla Scala: Taglio, distrutto (+1 Spicciolo).
- T6: la Falce fa Impatto: −3 Lumi.
Lezione per il giocatore: "mi serviva una Spina prima della Brace", oppure "il Taglio andava prima della Brace e la Brace dopo". È la lezione che il sistema deve produrre.

**Esempio 2: il Silenzio e lo spostamento dei Segni.** Brace nel Cortile, Brace sulla Scala. Entra la Bocca del Pozzo (Coppe, 2, Silenzio, Rapido): dal Crocevia salta al Cortile (la Strada era libera), dove la Brace tace. Al tick dopo salta all'Uscio, saltando la Scala. Impatto −2. Contromossa: un Segno nella Strada o nell'Uscio, oppure la Lanterna, oppure un Gelo nel Crocevia per fermarla.

**Esempio 3: il Rito e l'Araldo.** Rito Scala (Forza crescente) e Taglio nel Crocevia. La Coda è ordinata 1, 1, 2, 3, 4. Il Banditore (1, Araldo) entra e pesca un Lupo (3) **in testa alla Coda**, senza riordinarlo: il Lupo entra subito dopo, fuori dall'ordine. È il modo in cui il Fato "rompe" i Riti, e va mostrato con una freccia rossa nella Coda.

**Esempio 4: un Patto che tradisce.** Prendi in Patto un Lupo (girata Morso: −1 alla carta nemica davanti a ogni tick). Viene pescato al rintocco 6, 8 e 9: Lealtà 3 → 2 → 1 → 0. Al rintocco 9 finisce l'ondata e il Lupo torna nemico con Forza 3 + 2 = 5, cornice Corrotto. Se al negozio del rintocco 8 lo avessi Rinsaldato (6 Spiccioli), avresti avuto altre due ondate.

### 4.11 Casi limite decisi (risposte ai "?" del QA, §7.4)
| # QA | Domanda | Risposta |
|---|---|---|
| 1 | Sciame in S1, dove va la copia? | In testa alla Coda. |
| 5 | La copia eredita tipo e Forza? | Seme sì, Forza base sì, keyword no (solo quelle non di Sciame). Conta per le Spine dei Denari ecc. |
| 7 | Copie con Sciame? | Mai. |
| 8-14 | Corazza contro Brucia, Taglio, Esca, Calamita, esplosioni | Brucia, Taglio, Esca: consumano una carica. Calamita: toglie tutte le cariche senza esserne bloccata. Esplosioni: fonte nemica, ignorano la Corazza. Due fonti nello stesso evento: la prima in ordine di priorità (§4.4) consuma la carica. |
| 15-21 | Ladro senza difese, due Ladri, Ladro rimandato, Ladro a danno 0, tetto | Senza Segni: 3 Spiccioli. Due Ladri: due furti, ognuno sul Segno più avanzato rimasto. Rimandato o distrutto prima dell'Uscio: non ruba. Danno 0 (Bastione): ruba lo stesso. Il Segno rubato non occupa posti. Il Ladro non ruba Trucchi né Riti. |
| 22-26 | Vuoto | Sostituito dal Silenzio, nessuno di questi casi esiste più. |
| 27-32 | Araldo | Mazzo vuoto: non pesca. Araldo pesca Araldo: conta nel limite di 2. La carta pescata non viene ordinata dal Rito. Bavaglio: il log mostra "Bavaglio: l'Araldo tace". Non può pescare una carta rimandata in questa ondata. |
| 33-39 | Rapido, Lento, Gelo | Rapido con Strada libera e Cortile occupato: avanza di 1. Rapido salta il Gelo nel Passo intermedio. Rapido gelato: resta fermo quel tick. Lento + Gelo: il Gelo consuma il tick fermo successivo, poi riprende l'alternanza. Due carte che arrivano nel Passo del Gelo: il Gelo colpisce la carta che c'è nella fase Segni. |
| 40-42 | Etereo | Danno 1 dopo le riduzioni: ignorato. Brucia 1 contro Etereo: ignorata, finché Brucia è 1. La Lanterna toglie Etereo e poi colpisce. |
| 43-48 | Esplosivo, Sobilla, Ritorno | Le esplosioni a catena si risolvono in FIFO dal fronte al retro. Un'esplosione che uccide un Sobillatore dà +2 alla carta davanti. Ritorno + Pozzo: il Pozzo esilia, il Ritorno non scatta (l'esilio non è una morte). |
| 49-57 | Leggi e slot | Un Segno agisce su chi c'è nel Passo durante la fase Segni, comunque ci sia arrivato. Una carta ferma prende il Segno di nuovo al tick dopo: **è voluto**. Ghigliottina/Taglio guarda la Forza attuale. Due Segni nello stesso Passo: nell'ordine di piazzamento. Specchio con Corazza davanti: consuma la carica. Catena senza carta dietro: fizzle. Campana a Morto: catena limitata a 16. |
| 58-62 | Ordinamenti | Pareggi: resta l'ordine di pescata. Avanguardia su un seme assente: nulla. Un solo Rito. La carta del Mazziere entra sempre per ultima, qualunque Rito. Profezia rimescola la Coda rimasta. |
| 63-69 | Patti | Un Infiltrato blocca come una carta nemica. I tuoi Segni non lo colpiscono. Esce dall'Uscio e cura 1 Lume. Lealtà a 0 a metà ondata: il tradimento avviene a fine ondata. La Copia di uno Sciame alleato è alleata. Quarto Patto: devi scioglierne uno. |
| 70-80 | Soglia, economia, boss | Danno sotto 0: Lumi a 0, la run finisce in quel tick. Ultima carta e Lumi a 0 nello stesso tick: sconfitta. Esazione con meno Spiccioli: scendi a 0. Mazzo minimo: l'esilio è bloccato. Sagrestano senza carte da riciclare: nulla. La carta del Mazziere è immune a Rimando, Taglio e Pozzo. Salvataggio a metà ondata: si salva a inizio ondata e si rigioca dal seed. I replay portano la versione dei contenuti. |

---

## 5. Contenuti definitivi

I valori sono quelli usati nella simulazione. Ruolo = cosa la carta insegna o mette alla prova. **Girata** = cosa fa la carta quando è tua (Patto). "Morso" è la girata generica: *a ogni tick, −1 Forza alla carta nemica nel Passo davanti*.

### 5.1 Carte nemiche (30)

**Atto I · Vespro (12, tutte nel prototipo)**
| Carta | Seme | Forza | Keyword | Ruolo | Girata |
|---|---|---|---|---|---|
| I Topi del Granaio | Bastoni | 1 | Sciame | Riempie la Fila, insegna lo Sciame | Anche la Copia è tua |
| Il Lupo | Bastoni | 3 | — | Il nemico "base", misura della potenza | Morso |
| La Volpe Bianca | Bastoni | 2 | Rapido | Salta i Segni, insegna a coprire i Passi | Staffetta: quando entra, la prima carta nemica della Coda va in fondo alla Coda |
| L'Ingordo | Bastoni | 1 | Ingordo | Contraccolpo delle Scartine | Quando entra, toglie le Scartine dalla Coda e cura 1 Lume per ciascuna |
| Il Mulo Ostinato | Bastoni | 4 | Corazza 1, Lento | Crea ingorghi, insegna la Corazza | Resta Lento: chi è dietro aspetta e prende più colpi |
| L'Affogata | Coppe | 2 | Ritorno | "Uccidere non basta": chiede Esilio o Pozzo | Ritorno: la prima volta che fa Impatto torna in fondo alla Coda e cura di nuovo |
| La Bocca del Pozzo | Coppe | 2 | Silenzio, Rapido | Bersaglio prioritario, zittisce i Segni | Divora: una volta per ondata, quando entra, distrugge la carta nemica davanti se ha Forza ≤ 3 |
| La Falce Sola | Spade | 3 | Corazza 1 | Insegna Spina e ordine dei Segni | Falciata: a ogni tick −1 alla carta nemica davanti |
| Il Barile di Polvere | Spade | 2 | Esplosivo 2 | Va distrutto presto: esplode sui compagni, all'Uscio fa male | Quando arriva all'Uscio, −2 a tutte le carte nemiche in Fila |
| La Gazza | Denari | 2 | Ladro | "Ciò che passa costa" | Borseggio: all'Impatto dà 4 Spiccioli invece di curare |
| Il Banditore | Denari | 1 | Araldo | Accelera la pescata, rompe i Riti | Falso annuncio: quando entra, la prima carta nemica della Coda torna in fondo al mazzo |
| Il Sobillatore | Denari | 1 | Sobilla 2 | Ucciderlo ha un costo per chi è davanti | Quando entra, la prima carta nemica della Coda perde 2 Forza |

**Atto II · Mezzanotte (11)**
| Carta | Seme | Forza | Keyword | Ruolo | Girata |
|---|---|---|---|---|---|
| Il Branco | Bastoni | 2 | Branco 2 | Punisce Raggruppa sui Bastoni | Morso |
| Il Cinghiale | Bastoni | 4 | Spinta | Rompe i tempi dei Segni | Quando entra, −3 alla carta nemica nella Strada |
| Il Lamento | Coppe | 2 | Etereo | Rende inutili i Segni da 1 | Le carte nemiche nei Passi adiacenti perdono Etereo e Rapido |
| La Nebbia | Coppe | 3 | Velo | Protegge la carta dietro | Quando entra, le prime 4 carte della Coda diventano visibili |
| La Prefica | Coppe | 3 | Lamento funebre | Bersaglio prioritario | Quando entra, −1 a tutte le carte nemiche in Fila |
| Il Carro senza Cavalli | Spade | 5 | Corazza 1, Lento | Muro di Forza | Lento, e all'Impatto cura 2 |
| L'Incudine | Spade | 2 | Forgia | Supporto da eliminare per primo | A ogni tick toglie 1 Corazza alla carta nemica davanti |
| La Campana Rotta | Spade | 3 | Stonatura | Indebolisce tutta la tua macchina | Finché è in Fila, i tuoi Segni fanno +1 danno |
| La Processione | Denari | 1 | Sciame, Tenace | Sciame resistente | Anche la Copia è tua |
| I Creditori | Denari | 2 | Riscossione | Punisce chi accumula Spiccioli | All'Impatto, +1 Spicciolo ogni 10 che hai (max +3) |
| L'Esattore | Denari | 3 | Esazione 5 | Colpisce l'economia | All'Impatto, +5 Spiccioli |

**Atto III · Ora Morta (7)**
| Carta | Seme | Forza | Keyword | Ruolo | Girata |
|---|---|---|---|---|---|
| Il Lupo Mannaro | Bastoni | 5 | Tenace, Rapido | Forte, sfuggente, chiede Gelo | Morso 2 |
| Il Morto che Parla | Coppe | 4 | Richiamo | Fa tornare i caduti | Morso |
| Il Fuoco Fatuo | Coppe | 2 | Rapido, Etereo | Sfugge ai Segni deboli | Morso |
| La Macina | Spade | 6 | Corazza 2, Lento | Muro finale | Lenta, e all'Impatto cura 2 |
| L'Orologio del Campanile | Spade | 3 | Fretta | Rompe il tempo: tutto ciò che ha davanti corre | Le carte nemiche dietro di lui sono Lente |
| Il Profeta | Denari | 2 | Profezia | Counter dei Riti | Quando entra, riapplica il tuo Rito alla Coda |
| La Folla Inferocita | Denari | 1 | Furia | Punisce il massacro facile dei Denari | Morso |

*(30 carte normali, più 3 élite e i gettoni. La versione completa punta a ~60 carte: si aggiungono per pacchetti di 6, uno per seme e atto.)*

**Élite (una per atto, non catturabili)**
| Élite | Seme | Forza | Keyword |
|---|---|---|---|
| Lo Spaventapasseri (Atto I) | Bastoni | 6 | Corazza 2; alla morte mette 2 Corvi (Bastoni, 1, Rapido) in testa alla Coda |
| Il Brigante (Atto II) | Denari | 8 | Ladro, Tenace |
| La Strega del Lago (Atto III) | Coppe | 7 | Silenzio, Ritorno |

**Gettoni**: Copia (dello Sciame), Scartina (Neutra, 1, Innocua), Corvo, Disperazione (Forza = numero del rintocco), Corrotto (stato di un Patto che ha tradito: +2 Forza permanente).

**Bonus della notte**: a Mezzanotte tutte le carte nemiche normali entrano con +1 Forza, all'Ora Morta anche (+1, non cumulativo con l'Atto II). Si applica all'ingresso nel Crocevia e si vede come una piccola luna sulla carta.

### 5.2 Mazzo iniziale e crescita
- **Mazzo iniziale (10):** 2 Topi del Granaio, 2 Lupi, Volpe Bianca, Affogata, Falce Sola, Banditore, Sobillatore, Gazza.
- **Annuncio:** a ogni rintocco normale o élite il Fato aggiunge 2 carte (Atto I e II) o 3 (Atto III). Ogni carta è estratta al 70% dalle carte dell'atto corrente e al 30% da quelle degli atti precedenti. Il mazzo arriva a circa 30 carte a fine run.

### 5.3 Difese (37)

Rarità: **C** comune, **NC** non comune, **R** rara. Le comuni sono piatte e sempre utili, le non comuni forti con un requisito, le rare definiscono una build (regola del Balance).

**Segni (18)**: si piazzano su un Passo e agiscono a ogni tick sulla carta nemica in quel Passo.
| Segno | R | Effetto | Potenziata (+) |
|---|---|---|---|
| Brace | C | −2 | −3 |
| Spina | C | Toglie 1 Corazza, poi −1 | Toglie 1 Corazza, poi −2 |
| Taglio | C | Distrugge la carta se ha Forza ≤ 2 (non i Mazzieri) | Forza ≤ 3 |
| Gelo | C | La carta non avanza al prossimo tick (una volta per carta per ondata) | Due tick |
| Lanterna | C | Toglie Etereo; −3 alle Coppe, −1 alle altre | −4 alle Coppe |
| Bastione | C | Solo sull'Uscio. La carta che esce da qui fa 1 danno in meno | 2 in meno |
| Tagliola | C | −1. Se la carta muore in questo Passo, +1 Spicciolo | −2 |
| Trappola per Lupi | NC | −3 ai Bastoni, e toglie loro Rapido | −4 |
| Calamita | NC | Toglie tutta la Corazza; −3 alle Spade | −4 alle Spade |
| Moneta Falsa | NC | −2 ai Denari; un Denari che muore qui dà +2 Spiccioli | −3 |
| Rimando | NC | La prima carta che passa di qui in ogni ondata torna in fondo al mazzo con Rancore +1 (non i Mazzieri) | Le prime due |
| Catena | NC | Quando una carta muore in questo Passo, −2 alla carta nel Passo dietro | −3 |
| Malocchio | NC | La carta perde tutte le keyword per il resto dell'ondata (una volta per carta) | Ignora la Corazza |
| Corno | NC | −1 qui e −1 alla carta nel Passo dietro | −2 qui |
| Rogo | R | Brucia +1 (massimo 2): a fine tick la carta perde Forza pari al suo Brucia | Massimo 3 |
| Specchio | R | La carta qui infligge la sua Forza alla carta nemica nel Passo davanti | Anche metà alla carta dietro |
| Pozzo | R | Una volta per ondata: se la carta ha Forza ≤ 3 è **esiliata** per sempre (non élite né Mazzieri) | Forza ≤ 4 |
| Campana a Morto | R | Quando una carta muore in questo Passo, −1 a tutte le carte nemiche in Fila | Scatta anche per le morti nei Passi adiacenti |

**Trucchi (11)**: agiscono sulla pescata. Due posti.
| Trucco | R | Effetto | Contraccolpo | Potenziata (+) |
|---|---|---|---|---|
| Scartine | C | A ogni ondata mescola 2 Scartine nel mazzo, solo per quell'ondata | Ingordo; le Scartine assorbono Rimando, Pozzo e colpi dei Segni | 3 Scartine |
| Setaccio | C | Scarta le prime 2 Bastoni pescate (contano nella pescata) | Le altre Bastoni in Coda +1 Forza | Senza contraccolpo |
| Esca | C | La prima carta nemica della Coda entra con −2 Forza | La Corazza la para | −3 |
| Oracolo | C | Vedi le prime 4 carte della Coda e l'ultima | Occupa un posto senza fare danno | Prime 6 |
| Bavaglio | NC | Gli Araldi non pescano | Gli Araldi +2 Forza | +1 Forza |
| Contrabbando | NC | +2 Spiccioli per ogni carta scartata, rimandata o esiliata dalle tue difese | Nessuno: occupa un posto | +3 |
| Segnare | NC | In Preparazione segni una carta del mazzo: se viene pescata entra per ultima | — | Due carte |
| Censura | R | Pescata −1 | Il Fato annuncia 1 carta in più a ogni rintocco | Pescata −2, annuncio +2 |
| Pescata Avara | R | Pescata −3 | Le carte pescate +1 Forza | Pescata −4 |
| Mazzo Truccato | R | Delle prime 5 carte che verranno pescate, ne metti in fondo fino a 2 | — | Fino a 3 |
| Rogo dell'Archivio | R | Si consuma subito: esilia 2 carte a scelta dal mazzo. Non occupa posti | — | 3 carte |

**Riti (8)**: riordinano la Coda dopo la pescata. Uno solo attivo.
| Rito | R | Effetto |
|---|---|---|
| Scala | C | Forza crescente |
| Discesa | C | Forza decrescente |
| Avanguardia | C | Scegli un seme: le sue carte entrano per prime |
| Retroguardia | C | Scegli un seme: le sue carte entrano per ultime |
| Raggruppa | NC | Le carte dello stesso seme entrano una dopo l'altra |
| Alternanza | NC | Alterna la più forte e la più debole rimaste |
| Riserva | NC | La carta più forte della pescata non entra: torna in fondo al mazzo con Rancore +1 |
| Passo Cadenzato | R | Dopo ogni ingresso, un tick senza ingresso (l'ondata dura di più, gli ingorghi spariscono) |

Riti potenziati: **la prima carta nemica della Coda entra con −1 Forza**, oltre all'effetto normale.

**Patti**: non sono difese da scegliere (§4.8). Le girate sono nella tabella §5.1.

### 5.4 I tre Mazzieri

Ogni Mazziere è un rintocco in **3 fasi**. Tra una fase e l'altra c'è una Preparazione breve: puoi spostare Segni e scambiare con il Deposito, non ricevi offerte (tranne con il Forestiero). La **carta del Mazziere** entra per ultima nella fase 3, è **Lenta**, è immune a Taglio, Rimando e Pozzo. Il Mazziere è sconfitto quando la fase 3 finisce con almeno 1 Lume. Distruggere la sua carta dà **+10 Spiccioli** e una difesa rara a scelta tra 2.

**Atto I · Il Sagrestano** (era l'Archivista)
- *Regola, "Tutto torna"*: le carte distrutte in una fase rientrano in fondo alla Coda della fase successiva.
- Pescate per fase: 4 / 5 / 5. Carta: **Il Sagrestano**, Spade-Mazziere, Forza 10, Corazza 1, Lento.
- Insegna la differenza tra distruggere ed esiliare. Contromosse: Pozzo, Rimando, Esilio prima dello scontro, Patti.
- Voce: *"Buonasera. Ho qui tutto scritto. Tutto torna, sa. Tutto."* · Quando una carta torna: *"Annotato."* · Sconfitto: *"Che disordine... qualcuno dovrà rimettere a posto."*

**Atto II · Il Forestiero** (era il Giocatore)
- *Regola, "Facciamo a metà"*: a ogni fase ti offre 3 difese. **Una la tieni** (per sempre), **una va a lui** per tutto lo scontro, la terza si scarta. Ciò che gli dai si gira contro di te:
  - un **Segno** diventa un **Contro-segno** sul Passo dove hai più Segni (a parità, il più vicino all'Uscio): i tuoi Segni lì non agiscono;
  - un **Trucco** gli fa pescare 1 carta in più per fase;
  - un **Rito** impone Discesa al posto del tuo.
  La UI mostra l'effetto girato **prima** della scelta.
- Pescate per fase: 5 / 6 / 6. Carta: **Il Forestiero**, Forza 12, Lento; quando entra copia le keyword della carta nella Strada.
- Insegna a valutare una difesa per ciò che fa **contro** di te.
- Voce: *"Finalmente un collega. Facciamo a metà?"* · *"Questa la tengo io, se non le spiace."* · Sconfitto: *"Lei bara meglio di me. Mi offenderei, se non fosse un complimento."*

**Atto III · La Piena** (era la Marea)
- *Regola, "Il fiume esce"*: a ogni fase la Fila si allunga di un Passo all'ingresso (5 → 6 → 7: compaiono il **Ponte** e l'**Argine**). I tuoi Segni restano alla stessa distanza dalla porta; tra le fasi puoi spostarli. **Corrente**: ogni 3 tick, dopo l'avanzamento, ogni carta nemica avanza di un Passo in più se è libero.
- Pescate per fase: 5 / 6 / 6. Carta: **La Piena**, Forza 14, Lenta (la Corrente la spinge comunque).
- Insegna la robustezza del piazzamento. Contromosse: Gelo, Segni ad area, Passo Cadenzato.
- Non parla. Entrata: solo acqua e una riga, *"Il fiume ha smesso di ascoltare."* Sconfitta: l'acqua si ritira, il gallo canta.

### 5.5 Eventi (10)
Ogni evento ha una scelta con un contraccolpo. Valori di partenza, da tarare in playtest (la simulazione non gioca gli eventi).
| Evento | Scelte |
|---|---|
| **La Comare** | Vedi l'ordine esatto della prossima pescata, ma il Fato aggiunge una Nebbia. Oppure niente. |
| **Il Pozzo dei Desideri** | Getti 8 Spiccioli: 50% un Patto con una carta a scelta tra 3 del mazzo, 50% il Fato aggiunge una Bocca del Pozzo. |
| **Il Prete** | Esilia una carta a scelta, ma sciogli un tuo Patto. |
| **Il Cartaio** | Cedi una tua difesa: esilia 2 carte a scelta. |
| **Il Banco dei pegni** | −5 Lumi massimi: un Basamento gratis oppure un terzo posto Trucco. |
| **I Bambini sotto il Portico** | Cedi un Segno dal Deposito: ti dicono la carta più forte delle prossime 3 pescate e la sua posizione. |
| **La Processione** | Il prossimo rintocco ha 2 Denari in più, ma ogni Denari distrutta vale il doppio degli Spiccioli. |
| **Il Gatto Nero** | Torni indietro (niente) oppure prosegui: una carta a caso del mazzo prende Rancore +1, ma il prossimo negozio ha 4 offerte. |
| **La Vedova del Mugnaio** | Sciogli un Patto: ricevi 2 Spiccioli per ogni Lealtà che gli restava e una difesa non comune. |
| **La Casa Accanto** | Una sventura dei vicini (carta a caso dell'atto) entra nel tuo mazzo; ricevi una difesa rara a scelta tra 2. |

### 5.6 Contenuti del prototipo (M1)
- **Fila** di 5 Passi, **35 Lumi**, un solo atto (Vespro) con 4 rintocchi e **Il Sagrestano**.
- **12 carte** dell'Atto I (§5.1) più lo **Spaventapasseri**.
- **20 difese**: Segni Brace, Spina, Taglio, Gelo, Lanterna, Bastione, Tagliola, Calamita, Rimando, Rogo; Trucchi Scartine, Setaccio, Esca, Oracolo, Bavaglio; Riti Scala, Discesa, Avanguardia, Retroguardia, Riserva.
- **Patti** dalla terza settimana (modulo attivabile), con le girate delle 12 carte.
- Negozio minimo (difese, Esilio, cura), Riposo, niente eventi.
- Asso nella manica dietro un interruttore, per l'A/B.

---

## 6. Struttura della run

### 6.1 Una notte, tre veglie, quindici rintocchi
Ogni atto è una **mappa a rami** corta di 7 livelli; ogni livello offre 2-3 nodi tra cui scegliere (Systems).

| Livello | Nodi possibili |
|---|---|
| 1 | Ondata |
| 2 | Ondata · Evento |
| 3 | Ondata · Negozio · Evento |
| 4 | **Élite** · Ondata · Riposo |
| 5 | Ondata · Evento · Negozio |
| 6 | Riposo · Negozio |
| 7 | **Mazziere** |

Ogni atto ha **4 rintocchi di ondata** (uno può essere Élite) più il **Mazziere**: 5 rintocchi per atto, **15 per run**. Il percorso medio della simulazione è Ondata, Ondata, Negozio, Élite, Ondata, Riposo, Mazziere.

**Durata target:** ondata a 1× di 20-35 secondi, atto in 12-15 minuti, run in **40-50 minuti**.

### 6.2 I nodi
- **Ondata** e **Élite**: il ciclo del §4.2. L'Élite aggiunge la carta élite dell'atto; ricompensa Patto + 1 rara tra 2.
- **Negozio** (Il Mercante Ambulante): 3 difese a prezzo, Esilio, Basamento, cura, Rinsaldare, Riscatto, Reroll, Vendere (§7.1).
- **Riposo** (Il Focolare): scegli una tra **Curare** (+30% dei Lumi massimi, cioè 10), **Affinare** (una difesa diventa +) o **Studiare** (vedi l'ordine delle prime 5 carte della prossima pescata).
- **Evento**: §5.5.
- **Mazziere**: §5.4. Dopo la vittoria: Patto, +10 Spiccioli, una difesa a scelta tra 3 (60% non comune, 40% rara).

### 6.3 Vittoria e sconfitta
- **Sconfitta**: i Lumi arrivano a 0. La run finisce subito, anche a metà ondata.
- **Vittoria**: superi la fase 3 della Piena. Il gallo canta e il Mazziere si alza dal tavolo.
- **Un'ondata non si vince e non si perde**: si misura in Lumi persi, come le vite in un TD. Un'ondata senza danni dà +3 Spiccioli.

---

## 7. Economia e bilanciamento

Tutti i numeri di questa sezione sono quelli usati dal simulatore [sim-regole-v1.py](sim-regole-v1.py), che gioca le regole del §4 tick per tick su run complete di 15 rintocchi. Risultati grezzi in [sim-regole-v1-risultati.txt](sim-regole-v1-risultati.txt).

### 7.1 Parametri dell'economia
| Voce | Valore |
|---|---|
| Lumi iniziali (e massimi) | **35** |
| Spiccioli per sventura distrutta | 1 (élite 5, carta del Mazziere 10) |
| Ondata senza danni | +3 |
| Mazziere battuto | +10 |
| Rinunciare alla difesa offerta | +3 |
| Prezzi in negozio | comune 12, non comune 18, rara 25 |
| Esilio | 15, +5 a ogni uso nella run |
| Cura in negozio | 10 Spiccioli per 6 Lumi |
| Riposo, Curare | +30% dei Lumi massimi (10) |
| Basamento (2 Segni in un Passo) | 15 |
| Rinsaldare un Patto | 6 (+2 Lealtà) |
| Riscatto di un Segno rubato | 8 |
| Reroll | 1 gratis per atto, poi 3 |
| Vendere una difesa | metà del prezzo |
| Patto rifiutato | 5 Spiccioli |
| Tagliola | +1 Spicciolo per sventura che distrugge |

Entrate misurate (bot medio): circa **8 / 10 / 12 Spiccioli per ondata** negli atti I, II e III; circa 3 acquisti per negozio, e ne restano 20 in tasca. L'economia è volutamente un po' larga: il collo di bottiglia sono le offerte, non i soldi. Se nei playtest umani il negozio diventa "compro tutto", si alzano i prezzi del 20% prima di toccare altro.

### 7.2 Curve per rintocco
| | Atto I (Vespro) | Atto II (Mezzanotte) | Atto III (Ora Morta) |
|---|---|---|---|
| Pescata delle 4 ondate (la 3ª è l'Élite) | 6, 7, 7, 8 | 9, 10, 10, 11 | 11, 12, 12, 13 |
| Carte aggiunte dal Fato per ondata | 2 | 2 | 3 |
| Bonus della notte (Forza a tutte le sventure) | 0 | +1 | +1 |
| Fasi del Mazziere (pescata) | 4, 5, 5 | 5, 6, 6 | 5, 6, 6 |
| Carta del Mazziere | Sagrestano, Forza 10, Corazza 1 | Forestiero, Forza 12 | Piena, Forza 14 |
| Rarità delle offerte (comune / non comune / rara) | 65 / 30 / 5 | 55 / 35 / 10 | 45 / 38 / 17 |

Più il pity timer delle rare (+2% a ogni offerta senza rare). Mazzo iniziale 10 carte, kit iniziale **Brace** (Segno) e **Taglio** (Trucco). Il mazzo del Fato finisce la run intorno alle 30 carte. Il mazzo non può scendere sotto "pescata + 4" carte (l'Esilio si blocca).

Limiti di sicurezza per ondata: 80 tick, catena di 16 effetti, 2.000 eventi. In 2.700 run simulate nessuna ondata li ha toccati (massimo 78 tick nell'Ora Morta, in media 15).

### 7.3 Risultati della simulazione

Tre bot: **casuale** (sceglie a caso), **medio** (valuta le offerte con euristiche, come un giocatore che conosce le regole), **che prevede** (simula l'ondata successiva con ogni opzione e prende la migliore). 300 run per bot.

**Vittorie per Lumi iniziali**
| Lumi | Casuale | Medio | Che prevede |
|---|---|---|---|
| 30 | 14% | 48% | 90% |
| **35 (scelto)** | **20%** | **57%** | **93%** |
| 40 | 29% | 70% | 97% |
| 45 | 34% | 81% | 99% |

Il Balance chiedeva un medio tra il 50% e il 60% con uno scarto di abilità ampio: 35 Lumi lo centra, e lascia 30 Lumi al Sigillo 6 (§8).

**Danno medio ai Lumi per rintocco (bot medio, 35 Lumi)**
| | Ondata | Élite | Mazziere |
|---|---|---|---|
| Atto I | 1,0 | 5,0 | 5,0 |
| Atto II | 2,3 | 5,3 | 9,6 |
| Atto III | 3,6 | 9,6 | 16,9 |

**Dove si perde (bot medio)**: Piena 21%, ondate dell'Ora Morta 14%, Forestiero 4%, ondate di Mezzanotte 2%, Élite 1%. Nessuno perde nell'Atto I: è il Vespro, si impara.

**Altri numeri (bot medio)**: ondata di 15,5 tick in media (circa 10 secondi a 1×, più le animazioni: dentro i 20-35 secondi del §6.1), 32 eventi per ondata, 3,8 Patti per run, carta del Mazziere distrutta nel 18% dei casi, Lumi finali nelle vittorie 15,6 su 35.

### 7.4 Cosa dice la simulazione che non va ancora bene
1. **Il finale pesa troppo.** I tre Mazzieri fanno circa il 44% del danno di una run e la Piena da sola il 23%. Il bonus della notte e le pescate alte nelle ondate normali hanno già spostato il peso (nella prima taratura i Mazzieri facevano il 70%), ma l'obiettivo per la vertical slice è sotto il 35%. Leve, in ordine: Piena Forza 14 → 12, terza fase della Piena 6 → 5 carte, pescate dell'Ora Morta +1.
2. **La carta del Mazziere muore di rado** (12-23%). Va bene che sia dura, ma batterla deve essere un traguardo possibile. Se gli umani la distruggono meno del 25% delle volte, la Forza scende di 2 in tutte e tre.
3. **Le scelte sembrano spesso indifferenti al bot.** Nel 63-71% delle offerte la migliore e la seconda distano meno di mezzo Lume sull'ondata successiva. È una metrica miope (guarda solo un'ondata, mentre molte difese pagano nel tempo o in combinazione), quindi **non** è una prova che le scelte non contino; è il segnale da misurare sugli umani in Fase 1 (D3, §16).
4. **Il bonus della notte è la leva più sensibile del gioco.** Senza bonus il medio passa dal 57% all'86%; con +2 all'Ora Morta scende al 38% (tabella sotto). Qualsiasi ritocco si fa a passi di 1 e si ri-simula.

**Sensibilità (bot medio e altri, 200 run, base 35 Lumi)**
| Variante | Casuale | Medio | Che prevede |
|---|---|---|---|
| Base (35 Lumi) | 18% | 56% | 94% |
| Senza bonus della notte | 47% | 86% | 99% |
| Bonus della notte 0 / +1 / +2 | 8% | 38% | 75% |
| Pescate +1 in ogni ondata | 14% | 52% | 92% |
| Kit iniziale con Spina in più | 16% | 62% | 95% |
| 3 Trucchi attivi invece di 2 | 26% | 64% | 94% |
| Lealtà iniziale 5 invece di 3 | 22% | 67% | 96% |

Lettura: il bonus della notte sposta il medio di quasi 30 punti, le altre leve di 5-10. Le pescate +1 pesano poco perché le carte in più arrivano in fondo alla Coda; Lealtà e Trucchi in più aiutano il giocatore e sono buoni candidati per i Sigilli bassi o per i Bari.

### 7.5 Pick rate e watch list
Quanto spesso il bot che prevede prende una difesa quando gli viene offerta (top e fondo della classifica):

| Più prese | % | Meno prese | % |
|---|---|---|---|
| Tagliola | 68% | Catena | 13% |
| Rogo | 66% | Pescata Avara | 14% |
| Rogo dell'Archivio | 50% | Retroguardia | 16% |
| Rimando | 50% | Setaccio | 17% |
| Specchio | 47% | Segnare | 18% |
| Corno | 47% | Passo Cadenzato | 20% |
| Mazzo Truccato | 47% | Alternanza | 20% |

**Watch list**: Tagliola (già portata da +2 a +1 Spicciolo, resta la più presa: se in vertical slice supera il 60% anche negli umani diventa non comune), Rogo e Rimando (le più forti del bot; Rogo è già limitato a Brucia 2). **Riti sottoutilizzati**: tutti i Riti (Retroguardia, Avanguardia, Alternanza, Passo Cadenzato, Raggruppa, Scala, Discesa) stanno tra il 16% e il 24%. In parte è il bot, che non sa sfruttare l'ordine della Coda; se anche gli umani li ignorano, i Riti avranno un effetto bonus piccolo in più (per esempio +1 danno alla prima carta della Coda ordinata). Catena e Pescata Avara sono candidate al rework.

### 7.6 Build degeneri da tenere d'occhio
- **"Muro all'Uscio"**: Bastione più Basamento più Segni concentrati sul Passo 5. Limitato da Bastione solo sull'Uscio con −1, Silenzio e Ladro che colpiscono il Passo con più Segni, Contro-segno del Forestiero.
- **"Mazzo sottile"**: Esilio ripetuto per lasciare al Fato solo carte deboli. Limitato dal costo crescente e dal minimo "pescata + 4".
- **"Macchina da Spiccioli"**: Tagliola e Moneta Falsa in loop con i Patti. Limitato dal nerf della Tagliola e dal tetto di 3 Patti.
- **"Patti eterni"**: Rinsaldare a ogni negozio. Limitato dal costo 6 e dalla Lealtà massima.

### 7.7 Cosa il simulatore non sa ancora fare
Non gioca eventi, Asso nella manica, Affinare e Basamento; usa un'abilità girata generica (Morso) per tutti i Patti; non sposta mai i Segni tra un'ondata e l'altra; non dà valore all'Oracolo. Tutti questi elementi aiutano il giocatore, quindi **gli umani bravi dovrebbero fare meglio del bot medio**. Il simulatore di produzione in TS (§13.5) li coprirà tutti e girerà in CI.
---

## 8. Meta-progressione

Principio: **orizzontale**. La meta sblocca varietà e difficoltà, mai potenza permanente.

### 8.1 I Bari (personaggi di partenza)
| Baro | Kit iniziale | Passiva | Sblocco |
|---|---|---|---|
| **Il Baro di Sottovento** | Brace, Taglio | Il primo Basamento costa 0 | Iniziale |
| **La Fattucchiera** | Brace, Scartine, Esca | 3 posti Trucco | Supera il Vespro |
| **Il Notaio** | Spina, Taglio, Scala | Vedi le prime 4 carte della Coda | Supera la Mezzanotte |
| **La Bracconiera** | Brace, Gelo | Inizia con un Patto (un Lupo); i Patti partono con Lealtà 5 | Vinci una run |

### 8.2 Sblocchi e collezione
- **Inchiostro**: a fine run (vinta o persa) guadagni Inchiostro in base al rintocco raggiunto. Sblocca pacchetti di difese e di carte nemiche nel pool (il prototipo ne ha 20 + 12; il gioco completo punta a ~80 difese e ~60 carte).
- **Il Codice**: compendio delle carte incontrate, delle girate scoperte e delle combo trovate. Solo informativo.
- **Varianti dei Mazzieri**: dopo averlo battuto una volta, ogni Mazziere ha una seconda regola (usata dal Sigillo 5).

### 8.3 I Sigilli (difficoltà)
Livelli cumulativi, sbloccati vincendo al livello precedente. Ognuno cambia una **regola** e vale circa −5/−8 punti di vittoria (Balance).
| Sigillo | Effetto |
|---|---|
| 1 | Le élite hanno +1 Corazza |
| 2 | Il Fato annuncia 1 carta in più a ogni rintocco |
| 3 | Il Riposo cura il 20% invece del 30% |
| 4 | Prezzi del negozio +20% |
| 5 | I Mazzieri usano la loro variante |
| 6 | Lumi 30 |
| 7 | Vedi solo 1 carta della Coda; l'Annuncio mostra solo il seme |
| 8 | Bonus della notte anche al Vespro (+1) |
| 9 | L'Esilio parte da 20 Spiccioli |
| 10 | **La Notte Più Lunga**: il Mazziere finale ha anche le regole degli altri due |

La simulazione dice che il bonus della notte è la leva più potente del gioco (§7.3): il Sigillo 8 va verificato per primo.

---

## 9. Narrativa

### 9.1 Il principio
**Ogni meccanica ha un verbo nel mondo** (Narrative Designer): segnare, truccare, officiare, patteggiare. Se un sistema non ha un verbo, o è sbagliato il sistema o la finzione.

### 9.2 Il cast
- **Il Baro**: mai mostrato in volto. Lo vediamo attraverso le sue mani sul tavolo.
- **Il Mazziere**: non combatte mai, assiste. All'alba si alza, raccoglie le carte e dice una frase che dipende dalla run.
- **I tre Mazzieri** (§5.4): Sagrestano pignolo e gentile, Forestiero seduttore e collega, Piena muta.
- **Gli abitanti di Sottovento** negli eventi: la Comare, il Prete, il Mercante, la Vedova del Mugnaio, i bambini. Ricorrono tra le run e ricordano il Baro.

### 9.3 La storia che nasce dalla run
| Sistema | Cosa fa | Quando |
|---|---|---|
| **Il Quaderno della Notte** | A fine run una cronaca in stile popolare, assemblata da 30-40 frasi modello e dagli eventi chiave (prima carta alla Soglia, combo più lunga, Patto stretto, Segno rubato). Condivisibile come immagine. | Prototipo |
| **Le frasi del Mazziere all'alba** | Una frase scelta in base allo stile della run ("Ha vinto quasi a mani nude. Non mi piace."). | Prototipo |
| **La Casa** | Ogni run protegge una famiglia con un cognome e una riga di storia. Più avanti un piccolo modificatore. | Vertical slice |
| **Il Baro Caduto** | Quando perdi, il tuo Baro diventa una carta del Mazzo del Fato nella run successiva, con la tua difesa migliore girata contro di te. Spiega anche il Forestiero. | Dopo M2 |

### 9.4 Regole di scrittura
- Nomi delle carte: articolo + nome concreto ("La Gazza"). Il nome suggerisce l'abilità.
- Testo di colore: una riga, tono da proverbio.
- Testo di regola: separato, meccanico, con i nomi dei Passi ("nel Cortile", non "slot 3").
- Battute dei Mazzieri: massimo 12 parole, si leggono durante l'azione.
- Italiano lingua di riferimento; in inglese restano i nomi iconici (Sottovento, Scartine) con glossario.
- Niente gore, satanismo esplicito, folklore religioso offensivo.

---

## 10. Direzione artistica

### 10.1 Stile
**La Veglia, disegnata con i principi del documento Art.** 2D piatto con ombre a due toni e texture di carta come shader su tutta la scena. Vista dall'alto inclinata di circa 15°. Le carte nemiche reinterpretano le **carte regionali italiane** (Napoletane, Piacentine): silhouette forti con un solo dettaglio di colore, leggibili a 96 px. Tono da almanacco popolare e ex voto, illuminato a candela.

Pilastri visivi (Art):
1. **Ogni regola ha un luogo**: se un Segno agisce, si accende il suo Passo.
2. **Causa prima, effetto dopo**: ogni effetto ha un telegrafo prima di scattare.
3. **Il nemico è carta, tu sei inchiostro**: le carte del Fato sono oggetti fisici; le tue difese sono sigilli d'inchiostro oro.
4. **Poco, ma riutilizzato**: cornici, icone e silhouette modulari.

### 10.2 La scena
Il tavolo del Mazziere al crocevia, di notte. La Fila corre **da sinistra a destra** come un piccolo diorama dei Cinque Passi (Crocevia, Strada, Cortile, Scala, Uscio) fino alla **porta di casa**, con i **Lumi** accesi sul davanzale. Il mazzo è un oggetto che si ispessisce a ogni rintocco. Il Mazziere è una presenza dall'altro lato: mani, maniche, una maschera, un oggetto firma (il registro del Sagrestano, i dadi del Forestiero, l'acqua della Piena che invade il tavolo e aggiunge Passi). Atti diversi, luce diversa: Vespro ambra, Mezzanotte blu, Ora Morta verde-grigia.

### 10.3 Palette e linguaggio
| Ruolo | Colore | Hex |
|---|---|---|
| Fondo tavolo | Feltro verde-nero | `#1C2420` |
| Legno | Noce scuro | `#3A2A20` |
| Carta nemica | Avorio sporco | `#E8DCC4` |
| Inchiostro testo | Seppia scuro | `#2B1E16` |
| **Giocatore** (difese, Patti, UI amica) | Oro inchiostro | `#F2B544` |
| **Bastoni** | Rosso ruggine | `#C8462E` |
| **Coppe** | Azzurro gelido | `#6FC3D9` |
| **Spade** | Verde ossido | `#7FA84A` |
| **Denari** | Viola prugna | `#9A5BB8` |
| Pericolo, danno ai Lumi | Cremisi | `#E23B4A` |
| Neutro, Scartine | Grigio fango | `#8A7F70` |

- **L'oro è sacro**: se qualcosa è oro, è tuo. Un Patto cambia cornice da avorio a oro e la sua freccia punta verso il Fato.
- **Semi su tre canali**: colore, **cornice** (Bastoni dentellata, Coppe sfumata e tratteggiata, Spade con bulloni, Denari doppia) e **icona del seme**.
- **Famiglie di difese su forma**: Segno esagono (inciso sotto il Passo), Trucco rombo (appeso al mazzo), Rito cerchio con freccia (sul nastro tra mazzo e Fila), Patto cerchio con catena.
- **Carta nemica**: Forza grande in alto a sinistra, seme in alto a destra, illustrazione al centro, keyword come icona più una parola. Gerarchia di lettura: Forza, seme, keyword, illustrazione.
- **Stati** come sovrapposizioni, mai testo: Brucia (bordo carbonizzato), Corazza (scudo sopra l'icona, si spezza), Gelo (brina), Rancore (puntini rossi), bottino (Segno d'oro stretto nel becco o in mano), Corrotto (oro annerito).

### 10.4 Juice della risoluzione
Ritmo di un tick sincronizzato con l'audio (§12.5): **avanzata** con leggero overshoot, **telegrafo** (il sigillo pulsa, una linea d'inchiostro collega il Segno alla carta), **effetto** con numero fluttuante, **esito**.
- Shake e flash **solo** sugli Impatti e sulle combo grandi.
- Numeri nel colore di chi li causa: oro i tuoi, cremisi i danni ai Lumi.
- Hit-stop di 40-80 ms su uccisioni e Patti.
- Catene in sequenza con un contatore di combo.
- Riepilogo d'ondata con le 3 azioni più efficaci.
Il catalogo degli effetti del documento Art (§7.2) resta valido, con "Vuoto" sostituito da **Silenzio** (il sigillo del Passo si spegne e si copre di nebbia) e il Ladro che strappa il sigillo e lo porta via in mano.

### 10.5 Scope
- **Prototipo** (4-6 settimane, artista part-time): vettoriale, 4 silhouette per seme, 20 sigilli, tavolo, Fila, porta con 3 stati, effetti con tween.
- **Vertical slice** (3-4 mesi): stile definitivo su un atto, ~15 illustrazioni nemiche, ~25 sigilli, Sagrestano animato su mani e maschera.
- **Gioco completo**: 60-80 illustrazioni, 80-100 sigilli, 3 Mazzieri, 15-20 illustrazioni d'evento, un solo ambiente con 3 luci.
- **Mai tagliare**: telegrafo, semi su tre canali, hit-stop, Impatto sulla porta.

---

## 11. Audio

### 11.1 Identità
"Il tavolo di un'entità", in tre strati sempre distinguibili:
- **Il tavolo**: foley reale di carte, feltro, legno, monete.
- **La macchina** (le tue difese): suoni precisi e intonati, campanelli, celesta, carillon, timbri.
- **L'avversario**: organico e grave, droni, respiri, archi bassi.

**Le tue difese suonano intonate, i nemici sporchi.** Palette musicale: pianoforte preparato, celesta, contrabbasso pizzicato, piccole percussioni, più **organetto e campane di paese** per il colore folk della Veglia. Modo dorico o frigio, **96 BPM**.

### 11.2 Musica adattiva
- 6 stem in loop: **Pulse** (il tick), **Armonia**, **Tensione** (carte pericolose sulla Scala e sull'Uscio, volume proporzionale alla Forza lì presente), **Macchina** (2+ uccisioni nello stesso tick), **Pressione** (Fila piena), **Mazziere**.
- **Ogni Passo ha una nota**: Crocevia la più acuta, Uscio la più grave. Ogni avanzamento suona un pizzicato: con la Fila piena si sente una scala discendente. Panorama stereo da sinistra (Crocevia) a destra (Uscio).
- A 2× e 4× la musica non accelera, cambia densità.
- Il rintocco del campanile apre ogni ondata; la Piena estende la scala dei Passi e porta solo acqua e drone, senza musica.

### 11.3 Feedback
- Firma per seme: Bastoni passi e ringhi, Coppe sussurri riverberati, Spade clic metallici, Denari brusio di folla.
- **Silenzio**: taglio improvviso dell'ambiente per 150 ms. È il suono più forte che abbiamo e si usa solo qui.
- Corazza: clang smorzato. Ladro: monete che scappano e il campanello del Segno che stona. Araldo: corno breve.
- **Catena che sale**: ogni effetto tuo nello stesso tick suona un grado più in alto; gli eventi sono quantizzati in sedicesimi, così una combo diventa una frase e non un rumore.
- **Contraccolpo**: quando una tua difesa si ritorce contro di te, il suo strumento viene ripreso dal timbro del nemico.
- Mix: massimo 8 voci; priorità Impatto, Ladro e Silenzio, poi catena, morti, abilità minori, avanzamenti.

### 11.4 Mazzieri
- **Sagrestano**: organo da chiesa e clavicembalo, contrappunto ordinato; quando le carte tornano, 2 battute della fase prima suonano al contrario.
- **Forestiero**: piano da osteria stonato; lo strumento della difesa che gli dai passa nel suo tema, nel canale stereo opposto.
- **Piena**: niente musica, acqua e coro basso che respira ogni 8 battute.

### 11.5 Accessibilità e scope
Ogni informazione audio ha un equivalente visivo. Cursori separati, "tick silenzioso", "audio ridotto". Prototipo: tutto sintetizzato in Tone.js (3-4 giorni). Vertical slice: foley registrato e 6 stem per un atto (3-4 settimane). Gioco completo: circa 40 minuti di musica e 200 effetti (3-4 mesi tra sound designer e compositore). Primo taglio se serve: il tema rovesciato del Sagrestano e la migrazione degli strumenti del Forestiero. Mai tagliare: nota per Passo, quantizzazione delle combo, tensione sulla Scala e sull'Uscio.

---

## 12. UX e interfaccia

### 12.1 Il modello mentale: una pipeline
Un solo layout, uguale in Preparazione e in Risoluzione, da sinistra a destra:

```
 ┌─ MAZZO ───┐   ┌─ CODA ─────┐   ┌──────────── FILA ─────────────┐   ┌─ SOGLIA ─┐
 │ ▓▓ 18     │ → │ [2 scoperte]│ → │ Crocevia Strada Cortile Scala Uscio │ → │ 🕯 27/35 │
 │ Trucchi ◆ │   │ Rito ⊙      │   │   ⬡       ⬡      ⬡      ⬡    ⬡  │   │          │
 └───────────┘   └─────────────┘   └───────────────────────────────┘   └──────────┘
```
Ogni difesa è disegnata nella zona dove agisce: Trucchi sul mazzo, Rito sul nastro della Coda, Segni sotto i Passi.

### 12.2 Schermate
- **Preparazione**: barra in alto (atto, rintocco, Lumi, Spiccioli), pannello del mazzo con composizione per seme e carte annunciate, Coda con le carte scoperte, Fila con i Segni trascinabili (e alternativa da tastiera), barra della **previsione**, l'offerta 1 tra 3 con il **Δ previsione** per ogni opzione. Passare sopra un'offerta mostra la difesa "fantasma" nella sua zona e il prima/dopo. **Avvia** resta spento finché non scegli o salti.
- **Risoluzione**: stessa scena; in basso timeline con controlli, velocità e log degli eventi cliccabile.
- **Riepilogo d'ondata**: Lumi prima e dopo, distrutte/arrivate/Patti, **MVP** (la difesa che ha lavorato di più), **più pericolosa**, **perso** (Segni rubati), pulsante **Rivedi ondata**.
- **Il Forestiero**: la terna con, sotto ogni difesa, la sua versione girata con cornice rossa.
- **Momento del Patto**: le carte distrutte candidate, con girata, Lealtà e aspetto da Corrotto mostrati prima.
- **Negozio**: difese a sinistra, mazzo raggruppato per carta con Esilio a destra, previsione della prossima ondata che si aggiorna a ogni acquisto.
- **Mappa**: verticale, tre pagine d'almanacco; ogni nodo d'ondata mostra cosa aggiunge il Fato; il Mazziere dell'atto è visibile con la sua regola fin dall'inizio.

### 12.3 Informazione
| Livello | Cosa sai | Come si vede |
|---|---|---|
| Composizione (sempre) | Quante carte di ogni tipo | Pannello mazzo raggruppato |
| Annuncio (sempre) | Le carte che il Fato aggiunge ora | Carte scoperte sopra il mazzo |
| Coda parziale (sempre 2, Oracolo 4) | Le prossime carte | Carte scoperte, il resto come dorsi con "?" |
| Ordine completo (Comare, Studiare, Mazzo Truccato) | Tutta la pescata | Vista "mazzo aperto" |

**Previsione**: intervallo del danno ai Lumi (10°-90° percentile su qualche centinaio di simulazioni in background) più avvisi testuali ("Rischio Ladro: alto"). Con informazione completa diventa un numero esatto con bordo pieno. "Modalità istinto" la nasconde.

### 12.4 Velocità, pausa e replay
Spazio play/pausa, frecce tick avanti e indietro (anche in pausa), Fine per saltare al riepilogo, tasti 1-4 per 1×, 2×, 4× e ⚡ (istantaneo). La velocità si ricorda. "Pausa sugli eventi importanti" attiva nelle prime 3 ondate, mai più di 3 pause per ondata. Il replay è una riesecuzione dal seed: si scorre la timeline e si ispeziona lo stato a ogni tick. Il pulsante **"Perché?"** su ogni carta mostra la sua catena ("pescata 3ª → Rito Scala in posizione 2 → Brace −2 nel Cortile").

### 12.5 Tempi (specifica unica per audio, animazione e logica)
- **1 tick = 1 battito = 625 ms a 1×** (96 BPM).
- Primi 150 ms: avanzata di tutte le carte e Impatto.
- Poi gli eventi del tick, **uno per sedicesimo (156 ms)**, ciascuno con telegrafo di 60 ms ed effetto.
- Se un tick ha più di 3 eventi dopo l'avanzata, si aggiunge un battito intero per ogni 4 eventi in più: la musica non perde il tempo.
- Gli eventi importanti (Impatto, furto, Silenzio, Patto, carta del Mazziere) occupano un battito intero con hit-stop.
- A 2× tutto si dimezza, a 4× gli eventi minori si raggruppano; ⚡ mostra solo il risultato e il log.
- Con 15 tick e circa 30 eventi per ondata (simulazione), un'ondata dura **circa 20-25 s a 1×**, dentro l'obiettivo di 20-40 s.

### 12.6 Tutorial: l'Atto 0
Cinque rintocchi guidati, saltabili dopo la prima run. Una regola nuova per rintocco, mostrata in azione prima che a parole:
1. Fila, tick, Lumi, nessuna difesa: tre Topi arrivano e spengono 3 Lumi.
2. Segni: tre Brace offerte su Passi diversi.
3. Keyword: arriva uno Sciame, la pausa mostra la Copia.
4. Trucchi e mazzo: si apre il pannello del mazzo.
5. Riti e prima combo: offerta costruita (Scala + Taglio), la combo viene evidenziata quando scatta.
I Patti si spiegano alla prima Élite, con un riquadro non bloccante.

### 12.7 Accessibilità
WCAG 2.1 AA per l'interfaccia. Forma più colore per ogni informazione. Tre palette (standard, deuteranopia/protanopia, tritanopia) più alto contrasto. Testo dal 100% al 150%. Nessun limite di tempo, "riduci movimento", tutto giocabile da tastiera, nessun drag obbligatorio, target da 44 px per il mobile, log come regione `aria-live`, etichette testuali complete per ogni carta.

---

## 13. Tecnica

### 13.1 Stack
| Strato | Scelta |
|---|---|
| Linguaggio | TypeScript strict |
| Core di gioco | Pacchetto TS puro, senza DOM né renderer: gira nel browser, in Node, nei test, in un Web Worker |
| Interfaccia | Preact + CSS (animazioni con FLIP o Motion); PixiJS solo se in produzione servono particelle ricche |
| Build | Vite, con hot reload anche dei file dati |
| Dati | Contenuti in JSON validati con Zod al build |
| Audio | Tone.js, clock agganciato al tick |
| Test | Vitest, fast-check, Playwright |
| Simulatore | CLI Node con `worker_threads`, in CI a ogni modifica dei contenuti |
| Distribuzione | Browser (prototipo), Tauri o Electron per Steam, Capacitor per mobile |

Godot e Unity sono scartati per ora: il simulatore di bilanciamento deve **essere** il gioco e girare in CI. Se servisse un motore per la presentazione, il core TS resta l'autorità e il motore consuma il log di eventi.

### 13.2 Architettura
- **Contenuto** (JSON) → **Core** deterministico (`reducer(stato, azione) → stato'` più log di eventi) → **Presentazione** che riproduce il log, e **Simulatore** headless che usa lo stesso core.
- **La simulazione è istantanea, la presentazione è una riproduzione.** Premendo Avvia il core risolve l'ondata in microsecondi; la UI anima il log con i tempi del §12.5. Velocità, salto, anteprime e debug vengono gratis, e animazione e logica non possono divergere.
- Lo stato è dato puro serializzabile, identità con `uid` da contatore, mai indici di array.
- Lo schema della carta ha `forza` (non `damage`), `rancore`, `owner` (`fato` o `baro`), `lealta`, `bottino`.

### 13.3 Effetti data-driven
Ogni carta e ogni difesa è una lista di regole **Quando / Se / Allora** con target dichiarativi e testo generato dai parametri (testo e comportamento non divergono mai). Eventi: `wave_start`, `before_draw`, `card_drawn`, `queue_sorted`, `tick_start`, `card_advanced`, `card_entered`, `segno_phase`, `card_damaged`, `card_destroyed`, `card_impact`, `tick_end`, `wave_end`, `patto_made`, `segno_stolen`. Primitive: `damage`, `destroy`, `exile`, `send_to_deck_bottom`, `insert_queue_head`, `freeze`, `add_armor`, `remove_armor`, `add_burn`, `remove_keywords`, `steal_segno`, `heal_threshold`, `gain_coins`. Valvola: handler `custom` registrati per id (regole dei Mazzieri); se un `custom` serve a 3 carte diventa una primitiva.

L'ordine di risoluzione del §4.3-4.4 è il contratto tra codice e design. La coda effetti è **FIFO**. Ogni effetto ricontrolla il bersaglio e registra i fizzle nel log.

### 13.4 Determinismo
- PRNG proprio (`sfc32` o `xoshiro128**`), mai `Math.random()`.
- **Stream separati** dal seed della run: `draw`, `shop`, `rewards`, `events`, `boss`, `cosmetic`. Aggiungere un oggetto al negozio non cambia le pescate.
- Solo interi nel core, niente tempo reale, niente dipendenza dall'ordine di iterazione di oggetti e Set.
- **Replay = seed + lista di azioni** (pochi KB). Base per bug report, seed settimanale, sfide condivise, modalità cattura video.
- Salvataggio: istantanea a inizio ondata più le azioni successive, con la versione dei contenuti.

### 13.5 Simulatore
Il prototipo di questo simulatore è [sim-regole-v1.py](sim-regole-v1.py) (Python, per tarare il design). Il simulatore di produzione va riscritto in TS sopra il core vero, con le stesse metriche: vittorie per atto e per Mazziere, danno per rintocco, pick rate e delta di vittoria per difesa, coppie e terne anomale, tick per ondata, limiti toccati, scarto controfattuale delle scelte. Bot `random`, `greedy` (anteprima di una ondata), `lookahead` (due ondate), più avanti un bot che impara le priorità. Report HTML in CI.

### 13.6 Piattaforme
Prototipo nel browser, demo ed Early Access su Steam (Windows, poi Mac, Linux, Steam Deck verificato), 1.0 anche su Switch tramite porting del renderer o wrapper web certificato, mobile con layout verticale (i 5 Passi in colonna, previsto fin d'ora nella UI). Console resta il punto più debole dello stack web, e lo dichiariamo.

### 13.7 Strumenti per il design
Pannello debug (aggiungi carte e difese, imposta seed, salta a un rintocco, rigioca l'ultima ondata, log con catena causa-effetto), import ed export da foglio di calcolo per i ritocchi di massa, localizzazione con template e plurali italiano e inglese dal primo giorno, modalità cattura video (UI nascosta, seed fisso, ondata ripetuta), esportazione GIF dell'ultima ondata, seed copiabile a fine run.

---

## 14. Produzione

### 14.1 Roadmap con gate
| # | Milestone | Durata | Contenuto | Gate |
|---|---|---|---|---|
| M0 | **Prototipo cartaceo v1** | 1 settimana | Il PDF del QA aggiornato a queste regole (Forza unica, Segni a ogni tick, Corazza a cariche, Silenzio, 35 Lumi) | ≥ 3 combo scoperte senza spiegazioni; ≥ 60% di spiegazioni corrette all'ultima ondata; nessuna keyword con più di 2 errori su 6 tester |
| M1 | **Prototipo browser** | 4 settimane | §5.6, grafica placeholder, audio sintetizzato, telemetria, A/B Asso | ≥ 60% fa una seconda run spontanea; sessione media ≥ 20 min; ≥ 7 su 10 spiegano perché hanno perso; indice di visione ≥ 60% |
| M2 | **Vertical slice** | 3 mesi | Atto I completo con arte, audio e juice finali, negozio, eventi, Riposo, Patti, Quaderno | Retention D1 nei playtest ≥ 40%; ondata 20-40 s; atto ≤ 15 min; test a 5 secondi ≥ 80% |
| M3 | **Pagina Steam e demo** | 2 mesi, in parallelo da metà M2 | Capsule, trailer, demo del Vespro, Next Fest | 7.000-12.000 wishlist prima dell'EA |
| M4 | **Early Access** | ~mese 14 | 3 atti, 3 Mazzieri, ~60 carte, ~80 difese, 4 Bari, Sigilli | Recensioni ≥ 85% positive; ≥ 1.000 copie il primo mese |
| M5 | **1.0** | 8-12 mesi di EA | Contenuti +50%, sfida settimanale, localizzazione (EN, IT, DE, FR, ES, ZH, JA, PT-BR) | Pronto per il porting |
| M6 | **Porting** | 3-6 mesi | Switch, poi mobile | — |

Settimane del prototipo browser (Technical): 1) core, RNG, pipeline, coda effetti, primitive e test; 2) contenuti in JSON, simulatore CLI e primo report; 3) UI Preact con riproduzione del log, velocità e ispezione; 4) Sagrestano, negozio minimo, replay da URL, build per i playtest. Criterio di uscita: 10.000 run simulate senza violare invarianti.

### 14.2 Team minimo e budget
Lead game designer e programmatore a tempo pieno; programmatore UI e gameplay da M2; artista 2D part-time in M1 e a tempo pieno da M2; sound designer e compositore freelance (circa 2-4 mesi distribuiti); producer, marketing e community part-time (può coincidere con il lead, 1 giorno a settimana fino all'annuncio, 2 dalla demo). Budget fino all'EA: **150-250 k€** per 2,5-3 persone in 14 mesi, molto meno se il team lavora come soci; marketing 4.000-11.000 € di cui la capsule è la voce che rende di più. Publisher o fondi (bandi nazionali e regionali, Creative Europe MEDIA) si cercano con la vertical slice in mano.

---

## 15. Marketing in breve
- **Hook** da testare: *"Il Fato ti dà le carte. Tu bari."* / *"Fate deals the cards. You cheat."* (preferito), contro *"Il nemico è un mazzo. Riscrivi le sue regole."*
- **Titolo**: **Baro**, sottotitolo inglese *Cheat the Fate*, **solo se** passa il test: 20 persone che conoscono Balatro vedono il logo; se più di 1 su 4 pensa a Balatro, si passa a **Marked Deck / Il Mazzo Segnato**. Prima della pagina Steam: verifica marchi, domini e handle.
- **Steam**: tag in quest'ordine Roguelike Deckbuilder, Card Game, Roguelite, Deckbuilding, Strategy, Tower Defense (6°, apposta). Capsule con le mani del Baro che sfilano una carta, una candela, un solo seme leggibile.
- **Trailer da 30 s**: gameplay entro il secondo 3, il cuore è il "prima e dopo" (la stessa carta che senza trucchi arriva alla porta e con i trucchi cade).
- **Clip**: una minaccia, un solo trucco, causa visibile (linea d'oro), payoff esagerato. Formati "prima e dopo", "passa o non passa?", "patto sbagliato".
- **Community**: Discord con **seed della settimana** (costo zero grazie al determinismo), Quaderni condivisi, "Disegna una sventura" del folklore locale. Lucca Comics & Games è l'evento fisico naturale.
- **Calendario**: inizio lavori dicembre 2026, annuncio aprile 2027, demo settembre 2027, Next Fest ottobre 2027, EA inizio 2028.

---

## 16. Piano di test

### 16.1 Le sei domande
| # | Domanda | Metrica principale | Soglia |
|---|---|---|---|
| D1 | "Prepara e guarda" annoia? | Indice di visione (tempo a 1× o 2× senza salti), tasso di salto | IV ≥ 60% fino all'ondata 10; salti < 30% |
| D2 | Le catene sono leggibili? | Comprensione causale 0-2 dopo l'ondata; previsione del prossimo evento | ≥ 70% risposte da 2; previsione ≥ 60% dalla 2ª sessione |
| D3 | La scelta tra 3 conta? | Scarto controfattuale; consenso su seed fisso; motivo dichiarato | Motivi "sinergia" o "minaccia" ≥ 40%; vedi §7.4 sullo scarto |
| D4 | I contraccolpi sembrano giusti? | "Colpa tua o del caso?" | ≥ 70% "mia" |
| D5 | I Patti si capiscono? | Errori di appartenenza; quiz sul tradimento | 0 errori dopo il primo Patto; quiz ≥ 80% |
| D6 | Il gancio arriva? | Frase del gioco con "fregare / truccare / barare"; seconda run spontanea | ≥ 50%; ≥ 60% |

### 16.2 Fasi
- **Fase 0, cartaceo** (settimana 1, M0): 2 sessioni interne, poi 6-8 tester esterni (3 fan di deckbuilder, 2 di TD, 1-2 occasionali). Il facilitatore esegue la risoluzione ad alta voce. Testa D2-D5. **Non** testa D1.
- **Fase 1, browser** (settimane 2-6, M1): tester interni ogni settimana, poi 12 moderati e 30-50 non moderati con telemetria. **A/B Asso** within-subject bilanciato. **A/B previsione** (intervallo numerico contro basso/medio/alto). Seed fisso per le prime 3 ondate di tutti i moderati.
- **Fase 2, vertical slice** (M2): 20-30 moderati, Discord chiuso di 100-200 persone, test a 5 secondi, test a occhi chiusi (audio), test di daltonismo, test della frase e della capsule.
- **Sempre**: simulatore in CI; i dati umani si confrontano con i bot (se gli umani scelgono come il bot casuale, la scelta non è leggibile).

Questionari, script delle sessioni, micro-questionario a 3 tocchi e telemetria minima sono quelli di playtest-qa.md (§6 e §8), con i nomi aggiornati.

### 16.3 QA del motore
- **Sette livelli**: primitive, scenari di keyword (gli esempi del §4.10-4.11 sono i primi test), matrice delle interazioni (20 difese × 14 keyword del prototipo, approvata una volta dal designer e poi snapshot), replay golden, invarianti e property test, fuzzing dei contenuti, test di presentazione (il renderer anima esattamente il log).
- **Invarianti**: ogni carta sta in un solo posto; al massimo una carta per Passo; 0 ≤ Lumi ≤ massimo; Forza e cariche intere; ogni ondata entro i limiti; stesso seed e azioni danno lo stesso hash; la velocità non cambia lo stato; ogni modifica ha un evento con fonte; ogni fizzle è nel log; il testo generato corrisponde ai parametri; eventi del core = passi animati; il mazzo non scende sotto "pescata + 4".
- **Severità**: S1 crash, ondata infinita, replay che diverge. **S2 regola diversa dalla specifica, o log e animazione che mostrano una causa sbagliata** (in questo gioco la leggibilità è il gameplay). S3 testi ambigui e contrasto. S4 cosmetico.
- **Bug report**: sempre con replay (seed + azioni o link `?seed=…&actions=…`).

---

## 17. Rischi principali
| Rischio | Gravità | Mitigazione |
|---|---|---|
| **Guardare annoia** | Critica | Ondate di 20-30 s, juice e audio a ritmo, A/B dell'Asso, velocità e salto; si misura solo nel browser |
| **Catene illeggibili** | Alta | Un evento alla volta con linea di causa, "Perché?", log cliccabile, previsione, riepilogo con MVP |
| **Scelte che contano poco** | Alta | Il simulatore lo segnala (§7.4); rare condizionali, Annuncio prima della scelta, Deposito; misura su umani in Fase 1 |
| **Difficoltà concentrata sui Mazzieri** | Media | Bonus della notte e pescate già spostano il peso; obiettivo per la vertical slice: Mazziere < 35% del danno totale |
| **Sembra un foglio di calcolo** | Alta | Pilastro 5, La Veglia, Passi con un nome e un luogo, juice fin dal prototipo |
| **Bilanciamento combinatorio** | Media | Simulatore in CI, watch list del §7.5 |
| **Mercato affollato** | Alta | Gancio chiaro, identità folk italiana, demo presto, seed condivisi |
| **Titolo vicino a Balatro** | Media | Test del nome, alternativa pronta |
| **Scope** | Media | Gate rigidi, Patti come modulo, eventi solo dalla vertical slice |

---

## 18. Decisioni finali (ex domande aperte)

Queste erano le due scelte che cambiavano davvero il gioco. Il 21 novembre 2026 Daniele ha chiesto di procedere senza attendere conferme, e sono state adottate le raccomandazioni del Lead Designer.

### 18.1 Intervento durante l'ondata: **sì, l'Asso nella manica**
- Un solo Asso per ondata: **Trattieni** (una carta resta ferma per un tick) oppure **Scambia** (due carte vicine si scambiano di posto), da usare in pausa. Regole al §4.7.
- Nel codice è un **interruttore** (`asso: on/off`), acceso di default. La Fase 1 dei test (§16.2) fa l'A/B: se la versione senza Asso regge (indice di visione ≥ 60%), si può spegnere senza toccare altro.
- Scartate: nessun intervento (rischio che "guardare" diventi un'attesa) e più Assi guadagnati dalle difese (la risoluzione diventerebbe un gioco a turni).

### 18.2 Ambientazione e titolo: **La Veglia, titolo provvisorio Baro**
- Folklore italiano, carte regionali, il Baro contro il Fato (§3, §9).
- Il titolo **Baro** è provvisorio: prima della pagina Steam si fa il test del nome contro Balatro (§15); se più di 1 su 4 lo associa a Balatro, il titolo diventa **Il Mazzo Segnato / Marked Deck**. Le regole non cambiano.
- Scartati: Tavolo del Notaio Occulto e i temi astratti.

---

## 19. Riassunto

- **Il gioco**: *Baro*, un roguelike di carte con l'anima di un tower defense. Il Fato pesca sventure che camminano lungo 5 Passi fino alla tua porta; tu non giochi carte, trucchi il mazzo con **Segni** (torri), **Trucchi** (trappole), **Riti** (pathing) e **Patti** (catture).
- **Regole chiave**: una sola statistica, la Forza; mazzo persistente rimescolato a ogni ondata; Segni liberi che agiscono a ogni tick; ordine del tick fisso e deterministico; Corazza a cariche; Ladro che ruba e restituisce; Silenzio al posto del Vuoto; Patti con Lealtà che scade.
- **Contenuti**: 30 carte nemiche più 3 élite, 37 difese, 3 Mazzieri in tre fasi, 10 eventi, 4 Bari, 10 Sigilli. Prototipo: 12 carte, 20 difese, il Sagrestano.
- **Numeri**: 35 Lumi, pescate da 6 a 13, mazzo da 10 a circa 30 carte, prezzi 12/18/25. In simulazione vince il 20% di un bot casuale, il 57% di un bot medio, il 93% di un bot che prevede.
- **Mondo**: La Veglia, Sottovento, la Notte Lunga; arte 2D su texture di carta con oro riservato al giocatore; musica a 96 BPM dove ogni Passo è una nota.
- **Tecnica**: TypeScript, core deterministico che produce un log, UI che lo riproduce, simulatore in CI.
- **Piano**: cartaceo v1 in 1 settimana, browser in 4, vertical slice in 3 mesi, Early Access a circa 14 mesi.
- **Decisioni finali**: Asso nella manica sì (uno per ondata, attivabile per l'A/B); La Veglia con il titolo provvisorio Baro.
