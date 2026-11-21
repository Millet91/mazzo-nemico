# 10 — Onboarding e UX di flusso

*UX & Onboarding Designer. Solo design. Non esiste ancora 05-revisione.md. Per i comandi di battaglia seguo **01** (mira a fionda, FUOCO a tocco singolo, griglia armi), per i nomi delle ciurme **02** e per la ripresa delle partite **04** (replay dei comandi). In fondo elenco i conflitti tra documenti da riconciliare.*

## 1. Principi

1. **Si impara facendo.** Una regola si spiega solo nel momento in cui serve e un comando solo quando va usato. Ogni fumetto ha al massimo 12 parole e c'è un solo fumetto a schermo.
2. **Si mostra solo quello che serve.** Nel tutorial i comandi non ancora insegnati sono **nascosti**, non disattivati. Compaiono con un piccolo "pop" (scala 0,6→1, 220 ms) quando entrano in gioco.
3. **Sbagliare non costa niente.** Nel primo tutorial non si può perdere. Le regole Risiko si insegnano in un turno di campagna vero ma "protetto", in cui l'IA non attacca.
4. **Guida:** il **Nostromo Gancio** (nome provvisorio, decide il doc 07) compare come ritratto piccolo in basso al centro, accanto al fumetto. Una **mano fantasma** semitrasparente mostra il gesto da fare, in loop ogni 1,5 s. Se il giocatore resta fermo per 6 s, la mano diventa più evidente.
5. **Il tutorial si può sempre saltare.** Il tasto "Salta" (48 px) sta in alto a destra. Al primo avvio c'è anche "Ho già giocato a Worms/Risiko": porta subito alla scelta della ciurma e lascia attivi i suggerimenti contestuali (§3).

## 2. I primi 10 minuti

Al primo avvio non c'è un menu: dallo splash si entra direttamente nel **Prologo**. Il menu principale si vede per la prima volta solo al secondo avvio.

### Prologo: "Sbarco a Cala Pappagallo" (battaglia, ~4 min)
È una mappa fatta a mano nel bioma isola tropicale. Il vento è 0 finché non viene insegnato e il timer è spento. Sono 2 pirati contro 2 marinai della Marina con IA Mozzo e "mano morbida" (sbaglia sempre di almeno 40 px).

| Tempo | Cosa vede il giocatore | Cosa tocca | Cosa impara |
|---|---|---|---|
| 0:00 | splash da 2 s, poi una scialuppa che sbarca (4 s, si salta con un tocco) | — | tono e tema |
| 0:10 | il proprio pirata e una cassa a 150 px; visibili solo **◀ ▶** | tiene premuto ▶ | **camminare** |
| 0:25 | un gradino di 20 px blocca il passaggio; appare **SALTA** | SALTA | **saltare** (il doppio tocco si insegna dopo, con un suggerimento) |
| 0:35 | raccoglie la cassa ("Rum: +PV"), poi la camera mostra il primo marinaio | — | casse, PV |
| 0:45 | appare l'anello di mira con la traiettoria completa e la mano fantasma che "tira la fionda" | trascina dall'anello all'indietro e rilascia | **mira**: angolo e potenza; la mira resta impostata |
| 1:05 | appare **FUOCO**, che pulsa | FUOCO | **sparare**; il terreno esplode (**distruttibile**) |
| 1:10 | fumetto "Scappa! Hai 3 secondi" con un contatore grande | ◀ ▶ | **ritirata** |
| 1:20 | turno nemico, il colpo cade vicino e toglie 15 PV | — | **turni alternati**, danno, barra PV |
| 1:40 | turno 2: appare il **vento** (+4), la freccia si illumina e la traiettoria ora si piega; appaiono **▲▼** | mira, ritocco con ▲▼, FUOCO | **vento**, mira fine |
| 2:30 | il secondo marinaio sta sul bordo della scogliera; appare **ARMA**, che pulsa | ARMA → Sciabola | **griglia armi**, armi diverse |
| 2:50 | cammina fino al marinaio e usa FUOCO | — | **spinta**: il marinaio vola in mare, "Da Davy Jones!" |
| 3:10 | fumetto "Il mare è il tuo cannone migliore" | — | **mare = morte immediata** |
| 3:30 | l'ultimo marinaio si nasconde in una buca; il giocatore riceve 1 Granata | ARMA → Granata, tocca il chip miccia, FUOCO | **miccia e rimbalzi** |
| 4:00 | vittoria e scheda di fine battaglia semplificata (superstiti, "Cala Pappagallo è tua") | Continua | esito di una battaglia |

Pan, zoom e doppio tocco per ricentrare **non** si insegnano qui: li coprono i suggerimenti (§3).

### Primo turno di campagna "protetto" (~6 min)
| Tempo | Schermata | Tocchi | Regola Risiko insegnata |
|---|---|---|---|
| 4:15 | **Scelta ciurma**: 4 carte capitano, ognuna con un solo rigo sul tratto | tocca una carta, poi "Salpa!" | fazioni |
| 4:45 | **Mappa**: la camera parte dalla capitale e si allarga sulla regione | — | territori e confini; il numero sul segnalino **sono i tuoi pirati** |
| 5:05 | banner "Reclutamento: 4 nuovi pirati", i territori propri pulsano | tocca un territorio 4 volte (oppure tieni premuto per piazzarne di più) | **rinforzi**; al 5° pirata: "Massimo 5 per isola" (**tetto**) |
| 5:40 | due territori della Marina con 1 pirata sono evidenziati come bersagli suggeriti | tocca la capitale, poi il bersaglio, poi "Attacca" | **adiacenza** (le rotte disponibili si illuminano) |
| 6:00 | **Preparazione attacco** con slider già impostato a 3 | muove lo slider | **N pirati imbarcati = N in battaglia**; almeno 1 resta a casa |
| 6:20 | **Battaglia 2**: 3 contro 1, bioma del territorio, timer **30 s** (fumetto: "Il timer gira solo quando tocchi") | gioca | **timer**; da qui la battaglia è normale |
| 8:00 | esito: la mappa ricolora il territorio con l'animazione "inchiostro" | Torna alla mappa | **conquista**: i superstiti occupano |
| 8:20 | il secondo bersaglio ha il tasto **"Arrembaggio rapido"** evidenziato | Arrembaggio rapido | **risoluzione automatica** e probabilità mostrata in % |
| 8:50 | banner "Fortificazione: un solo spostamento" | trascina da un territorio a un altro collegato | **fortificazione** |
| 9:20 | "Fine turno": vengono incassati i dobloni e pescata 1 carta, mostrata grande per 2 s | Fine turno | **dobloni, carte**, che si useranno più avanti |
| 9:40 | turni IA: animazioni da 2 s, accelerabili toccando | — | ciclo dei turni |
| 10:00 | icona "Salvato ✓" in alto per 1,5 s e Gancio: "Da qui navighi da solo" | — | autosalvataggio: si può chiudere |

### Regole insegnate più avanti (al momento in cui servono)
| Regola | Quando si insegna |
|---|---|
| Bonus regione | quando manca 1 territorio per completare una regione: la regione brilla, "+2 pirati a turno se la prendi tutta" |
| Riserve (oltre 4 pirati) | prima battaglia con 5 pirati: la scialuppa delle riserve viene mostrata nell'HUD |
| Casse trappola, armi pilotate | prima arma pilotata raccolta: un mini-esercizio in 1 passo ("◀▶ sterzano") |
| Morte improvvisa | la prima volta che si arriva a 4:00: banner "La marea sale!" |
| Ritirata / resa | la prima volta che si è in svantaggio dal turno 4 |
| Bottega, forte | quando si arriva a 3 dobloni o più: l'icona bottega saltella |
| Carte | quando si hanno 2 carte: "Giocane una ora, ne puoi tenere al massimo 4" |
| Eventi del mare | al primo evento: una carta-evento grande, chiusa con un tocco |
| Feriti | al primo pirata che torna ferito: icona benda sul segnalino |

## 3. Suggerimenti contestuali

È un toast "abisso" con bordo `--info`, posizionato in alto a destra lontano dai pollici, che sparisce dopo 4 s o con un tocco. Se ne mostra **al massimo 1 per turno**, ognuno compare al massimo 3 volte in tutto, e si possono spegnere tutti in Impostazioni.

| Condizione | Suggerimento |
|---|---|
| 2 colpi di fila finiti a più di 200 px dal bersaglio con vento ≥ 5 | "Il vento spinge a {dir}: mira più {contro}" |
| il pirata attivo sta a meno di 60 px dal mare | "Attento al bordo!" |
| il pirata è fermo per 10 s a mira impostata | "FUOCO per sparare" |
| il pirata non riesce a superare un gradino 3 volte | "Doppio tocco su SALTA: salto alto all'indietro" |
| un nemico è fuori schermo | "Trascina col dito fuori dall'anello per guardarti intorno" |
| il giocatore si è fatto danni da solo per 2 volte | "Dopo lo sparo hai 3 s per scappare" |
| il nemico è in una buca e la granata non è mai stata usata | "La granata rimbalza dove il cannone non arriva" |
| attacco con rapporto ≤ 1:1 | avviso in rosso sullo slider, mai un divieto |
| fine turno con rinforzi non piazzati | il tasto "Fine turno" diventa "Piazza prima 2 pirati" |
| è possibile completare una regione | la regione brilla con il bonus |

## 4. Flusso delle schermate

```
[Splash]
  ├─ primo avvio ──> [Prologo] ──> [Scelta ciurma] ──> [Mappa (turno protetto)]
  └─ dopo ────────> [Menu] ─┬─ Continua ─────────────────> [Mappa] / [Ripresa battaglia]
                            ├─ Nuova campagna ─> [Slot 1-3] ─> [Difficoltà] ─> [Scelta ciurma] ─> [Mappa]
                            ├─ Schermaglia ─> [Bioma + n. pirati + IA] ─> [Battaglia] ─> [Esito] ─> [Menu]
                            └─ Impostazioni (modale, apribile ovunque)
[Mappa] ─ Reclutamento ─> Attacco ─> Fortificazione ─> Fine turno ─> [Turni IA] ─> [Mappa]
           │                │
           │                ├─ [Preparazione attacco] ─┬─ All'arrembaggio ─> [Battaglia] ─> [Esito] ─> [Mappa]
           │                │                          └─ Arrembaggio rapido ─> [Esito rapido 2 s] ─> [Mappa]
           ├─ [Bottega] (modale)   ├─ [Carte] (modale)
           └─ Pausa ─> Riprendi / Impostazioni / Salva ed esci ─> [Menu]
[Mappa] ─ vittoria o sconfitta ─> [Fine campagna] ─> [Menu]
[Battaglia] ─ II ─> [Pausa]: Riprendi / Come si gioca / Impostazioni / Ritirata (solo attaccante)
```
Tasto indietro di Android: chiude il modale aperto; in battaglia o sulla mappa apre la Pausa; nel menu chiede "Uscire?". Non chiude mai una partita senza conferma.

## 5. Stati vuoti ed errori

| Caso | Cosa si mostra |
|---|---|
| Nessuna campagna salvata | il menu mostra "Gioca" invece di "Continua"; uno slot vuoto è una pergamena arrotolata con "Nuova avventura" |
| Mano di carte vuota | "Conquista un'isola per pescare una Mappa del Tesoro" |
| Bottega senza dobloni | articoli visibili ma in grigio, con "Ti mancano 2 dobloni"; mai nascosti |
| Territorio con 1 pirata scelto per attaccare | rimbalzo e "Serve almeno 2 pirati: 1 resta di guardia" |
| Tocco su un territorio non adiacente | le rotte valide lampeggiano, nessun messaggio |
| Territorio pieno (5) | il segnalino trema e compare "Scialuppa piena" |
| Nessun attacco possibile | il tasto Attacca è sostituito da "Passa alla fortificazione" |
| Munizioni finite | arma in grigio con lucchetto e "Trova casse per ricaricarla" |
| Salvataggio corrotto | ripristino automatico dal backup precedente (servono **2 copie a rotazione**): "Abbiamo ripreso dal turno 11" |
| Ripresa battaglia fallita (replay diverso) | "La battaglia ricomincia da capo con le stesse forze", senza perdita di pirati |
| Asset mancante | si mostra il glifo segnaposto del registro, mai un riquadro vuoto |
| Memoria quasi piena (scrittura fallita) | avviso persistente "Spazio pieno: la partita non si salva" |
| FPS sotto 40 per 10 s | proposta una sola volta: "Attivare la grafica leggera?" |

Il tono è sempre in prima persona piratesca e breve, senza codici errore a schermo (vanno nel log).

## 6. Accessibilità

- **Mancini**: un interruttore in Impostazioni specchia tutto l'HUD (movimento a destra, FUOCO/ARMA/▲▼ a sinistra). Va **proposto durante il Prologo** al primo tocco su ◀▶ ("Preferisci i comandi invertiti?"). Il pannello laterale della mappa passa a sinistra.
- **Daltonismo**: le squadre non si distinguono mai solo per colore: emblema sulla bandana, nome sopra la testa, bandiera a motivo (03). Tre modalità (deuteranopia, protanopia, tritanopia) cambiano i colori delle fazioni con una palette alternativa validata. La traiettoria e i danni usano anche forma e testo (tratteggio, "-15"). Rosso e verde per pericolo e ok sono sempre accompagnati da un'icona.
- **Animazioni ridotte**: niente scossa della camera, transizioni in dissolvenza da 150 ms, nessun pulsare continuo (FUOCO pronto è indicato da un bordo fisso), il volo della camera sostituito da uno stacco, flash delle esplosioni ridotti al 30%. Si attiva in automatico se il sistema lo chiede.
- **Testo grande**: 100/115/130%. I fumetti si riposizionano invece di sovrapporsi. A 130% le etichette dei tasti diventano solo icone, con il nome mostrato su pressione lunga.
- **Timer**: opzione "Timer rilassato" (45 s o spento) in Schermaglia e in campagna Mozzo.
- **Feedback multisensoriale**: ogni evento importante ha suono, vibrazione e testo; nessuna informazione arriva solo dall'audio.
- **Precisione motoria**: ▲▼ e lo slider −/+ evitano i gesti fini. Opzione "Tieni premuto per sparare" disattivata, per evitare spari accidentali.

## 7. Sessioni brevi su mobile

- **Pausa automatica** su `appStateChange` in background, chiamata in arrivo, notifica a schermo intero o calo del focus: si ferma la simulazione e il timer e si salva subito (04: seme + comandi).
- **Ritorno**: una schermata "Riprendi" con lo stato in una riga ("Battaglia a Forte Uncino, turno 6, tocca a te") e un tasto grande. Non si riparte mai in automatico in mezzo al turno: dopo il tocco ci sono 3 s di "Pronti...". Il timer del turno in corso viene **riportato al valore pieno**.
- **Turni IA mentre l'app è chiusa**: non avanzano mai. Al rientro durante i turni IA si vede il **riepilogo** "Nel frattempo..." (al massimo 3 righe: conquiste e attacchi contro di te), con il tasto "Mostra sulla mappa".
- **Punti di sosta naturali**: dopo ogni battaglia e a fine turno compare un discreto "Salvato ✓". Un turno strategico con una battaglia dura 5-8 min, quindi entra in una pausa.
- **Riprendi in 1 tocco**: dal menu, "Continua" porta esattamente dove si era rimasti.
- **Dopo più di 3 giorni di assenza**: al rientro c'è una scheda "Dove eravamo" (ciurma, territori, obiettivo della regione più vicina) e i suggerimenti contestuali si riattivano per una sessione.

## 8. Metriche UX per i test con persone vere

Test con 5-8 persone a turno (metà non gamer, almeno 1 mancino), con osservazione silenziosa e il protocollo "pensa ad alta voce" solo dopo la prima sessione.

| Metrica | Obiettivo |
|---|---|
| Tempo al primo sparo | < 75 s |
| Prologo completato senza aiuto esterno | ≥ 90% |
| Tocchi "a vuoto" sulle zone non attive nel Prologo | < 5 |
| Primo colpo andato a segno entro 3 tentativi | ≥ 70% |
| Morti autoinflitte nelle prime 3 battaglie | < 1 per persona |
| Il giocatore spiega a voce che "N pirati spostati = N in battaglia" dopo il turno protetto | ≥ 80% |
| Primo attacco completato entro 90 s dall'arrivo sulla mappa | ≥ 85% |
| Uso spontaneo del ritocco ▲▼ / camera / doppio salto entro 3 battaglie | ≥ 50% / 60% / 30% |
| Salti del tutorial (chi salta e poi fallisce la battaglia 2) | da tracciare, < 20% |
| Errori di tocco sullo slider o tasti premuti per sbaglio | < 1 a battaglia |
| Abbandono prima dei 10 min | < 15% |
| Ripresa dopo un'interruzione simulata (squilla il telefono a metà) senza perdita percepita | 100% |
| SUS (questionario a fine sessione) | ≥ 75 |
| "Vuoi rigiocare domani?" (1-5) | media ≥ 4 |

Telemetria locale (opzionale, anonima): tempo per ogni passo del tutorial, punto di abbandono, suggerimenti mostrati e azione che segue entro 10 s.

## 9. Conflitti tra documenti (per il Revisore)
1. **Mira e fuoco**: in 01 si mira a fionda e FUOCO è un tocco; in 03 si tiene premuto FUOCO per la potenza. L'onboarding usa 01, che è più semplice da insegnare.
2. **Selettore armi**: 01 usa una griglia 4×4, 03 una radiale da 8 spicchi; le armi sono 16. La griglia è più facile da insegnare.
3. **Timer e morte improvvisa**: 20 s e 4:00 in 01; 30 s e 12 turni in 02; turno 20 in 04. Propongo 30 s nelle prime 3 battaglie, poi il valore scelto.
4. **Nomi delle ciurme** diversi tra 02 e 03.
5. **Battaglia interrotta**: per 02 riparte da capo, per 04 si riprende dal replay. L'onboarding presuppone 04, con 02 come riserva.

## Domande per il proprietario
1. Al primo avvio va bene entrare **direttamente nel Prologo** senza passare dal menu?
2. Il turno di campagna "protetto" (l'IA non attacca nel primo round) va bene, o si preferisce sfida da subito?
3. Possiamo raccogliere telemetria anonima del tutorial (locale, esportabile a mano), oppure niente dati?
