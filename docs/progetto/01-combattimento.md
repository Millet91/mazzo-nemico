# 01 — Combattimento (stile Worms, tema pirata)

Obiettivo: battaglie a turni brevi (3-6 min), giocabili con due pollici in orizzontale, su un terreno distruttibile pixel per pixel. Tutti i numeri sono **valori iniziali da tarare** nei playtest.

## 1. Struttura della battaglia e del turno

| Parametro | Valore |
|---|---|
| Pirati in campo per squadra | max **4**; gli altri N vermi arrivati dalla mappa strategica restano **riserve** e sbarcano (scialuppa + corda) quando muore un compagno |
| PV pirata | **70** (niente rigenerazione in battaglia) |
| Timer del turno | **20 s** (opzione 15/20/30) |
| Ritirata dopo lo sparo | **3 s** di movimento libero, poi il turno passa |
| Morte improvvisa | a **4:00** il mare sale di **25 px** a fine di ogni turno |
| Limite massimo | a **6:00** vince la squadra con più PV totali (riserve incluse); a parità vince il **difensore** |

Durata media turno ~25 s → circa 14 turni in 6 minuti.

Ordine: squadre alternate, dentro la squadra si scorre a rotazione sui pirati vivi (opzione "scelta libera" sbloccabile più avanti). Il timer parte al primo input o dopo 2 s. Uno sparo chiude il turno, tranne le armi "utilità" (rampino, vanga), che non lo chiudono. Il turno passa quando tutto si è fermato: proiettili, fiamme e pirati con velocità < 5 px/s.

Fasi: **Inquadra** (la camera vola sul pirata attivo, 0,6 s) → **Muovi/Mira** (timer) → **Fuoco** (timer in pausa durante il volo) → **Ritirata** (3 s) → **Risoluzione** (danni, morti, cassa) → turno successivo.

## 2. Controlli touch (riferimento 844×390 dp)

Nessun joystick. Ogni bottone misura almeno **64 dp** e ci sono almeno 12 dp di spazio tra i bottoni.

```
[II]  [PV squadra A]   ⏱ 17  ~vento~   [PV squadra B]
                     
            (anello mira attorno al pirata)
                                              [ARMA ▾ x2]
[ ◀ ][ ▶ ]                          [▲][▼]   [SALTA][ FUOCO ]
```

- **Camminare**: tieni premuto ◀ o ▶ (pollice sinistro). Velocità 60 px/s, scalino massimo superabile 8 px.
- **Saltare**: un tocco su SALTA fa un salto in avanti (vx 90, vy −230). Un doppio tocco entro 250 ms fa un salto all'indietro alto (vx −40, vy −330).
- **Mira "a fionda"** (pollice destro): parti dall'**anello di mira**, un cerchio di 100 dp attorno al pirata attivo, e trascina all'indietro. La direzione opposta al trascinamento dà l'angolo, la lunghezza (0-160 dp) dà la potenza (0-100%). Quando rilasci, la mira **resta impostata** e non spara. Durante la mira vedi l'angolo, la potenza in % e una **traiettoria tratteggiata** sul primo 30% del volo (100% in modalità facile/tutorial).
- **Ritocco fine**: ▲▼ cambiano l'angolo di 1° a tocco, con ripetizione se tieni premuto (10°/s). Così la mira precisa non dipende dalla precisione del dito.
- **FUOCO** (88 dp, il bottone più grande) spara. Le armi con miccia hanno un chip "1-5 s" sopra FUOCO e ogni tocco lo fa scorrere. Le armi piazzate cadono ai piedi del pirata. Con le armi a bersaglio (bordata, ancora, mappa) tocchi la mappa per mettere il segnalino e FUOCO conferma.
- **ARMA** apre una griglia 4×4 a metà schermo, con icona, munizioni e nome. Le armi bloccate appaiono in grigio. Un tocco seleziona, un tocco fuori chiude. Aprire la griglia non mette in pausa il timer.
- **Camera**: per spostarla trascini con un dito **fuori dall'anello**. Pinch per lo zoom (0,5-1,5×). Doppio tocco per ricentrare sul pirata. Durante il volo la camera segue il proiettile.
- **Armi pilotate** (pappagallo, scimmia): ◀▶ sterzano e FUOCO fa esplodere. **Rampino**: ◀▶ dondolano, ▲▼ accorciano o allungano la corda, SALTA si stacca.
- Una vibrazione breve conferma sparo, colpo a segno e morte. Si può attivare la mancina, che specchia il layout.

## 3. Fisica e terreno

- **Simulazione deterministica** a passo fisso di 60 Hz, con un seed per battaglia. Serve all'IA (che simula con lo stesso motore) e a replay futuri.
- **Mondo** di 2400×1100 px. La **maschera bitmap** ha 1 byte per pixel: 0 è aria, 1-4 indicano il materiale. Per il disegno il terreno è diviso in blocchi da 256×256 e si ridisegnano solo quelli toccati.
- **Crateri**: ogni esplosione svuota un cerchio di raggio `r × durezza materiale` e disegna un bordo bruciato di 4 px. Il terreno sospeso **non crolla** (come in Worms) e i detriti sono solo grafici.
- **Materiali**:

| Materiale | Moltiplicatore cratere | Note |
|---|---|---|
| sabbia | 1,2 | |
| legno | 1,0 | |
| roccia | 0,75 | |
| ghiaccio | 0,9 | attrito 0,2 (si scivola) |
| ferro/chiglia | 0 | indistruttibile, usato con parsimonia |

- **Gravità**: 600 px/s². Velocità massima dei proiettili al 100%: 950 px/s.
- **Vento**: si estrae a ogni turno un valore intero tra −10 e +10, con massimo diverso per bioma. Spinge i proiettili marcati "vento" con 15 px/s² per punto. Lo mostrano una bandiera e una freccia in alto.
- **Collisioni pirata**: capsula 12×22 px. Rimbalzo 0,3 sul terreno. Il pirata si ferma sotto 5 px/s.
- **Esplosione**: danno = `D × (1 − d/r)`, con minimo 1 dentro il raggio. Spinta = `D × 7 px/s` nella direzione dal centro al pirata, con la stessa attenuazione. Anche chi spara si fa male.
- **Caduta**: oltre i 90 px di caduta toglie 1 PV ogni 4 px, massimo 25.
- **Mare**: livello y = 1020 all'inizio. Un pirata che tocca l'acqua **muore subito** ("da Davy Jones") e i suoi PV contano come danno inflitto. Armi e casse che finiscono in acqua spariscono. Le spinte verso il mare sono la tattica principale.

## 4. Danni, morte

- Numeri del danno che fluttuano sopra il pirata. Le barre PV si aggiornano a fine risoluzione.
- **PV a 0**: il pirata cade a terra e a fine risoluzione diventa un **barilotto-lapide** che esplode (10 danni, raggio 25 px). Questo crea reazioni a catena divertenti ma deboli.
- **Annegamento**: splash, cappello che galleggia per 2 s, nessuna lapide.
- Una riserva sbarca dal bordo mappa del proprio lato nel turno successivo alla morte. Atterra in una posizione sicura calcolata: a terra, a più di 120 px dai nemici e a più di 60 px dal mare.

## 5. Arsenale (16 armi)

Legenda: ∞ = munizioni illimitate; "C" = l'arma si trova **solo nelle casse**; V = subisce il vento.

| # | Arma | Effetto | Danno | Raggio | Munizioni | Ruolo tattico |
|---|---|---|---|---|---|---|
| 1 | **Cannone a mano** | proiettile balistico che esplode all'impatto, V | 45 | 55 | ∞ | arma base da lunga distanza; insegna a leggere il vento |
| 2 | **Granata di bordo** | rimbalza (0,5) e ha una miccia di 1-5 s | 40 | 50 | ∞ | colpi indiretti e dietro le coperture |
| 3 | **Pistola a pietra focaia** | 2 colpi istantanei in linea retta, portata 500 px, buca 6 px | 18 ×2 | — | ∞ | finire un pirata, spingerlo di poco dal bordo |
| 4 | **Sciabola** | colpo corpo a corpo, 30 px davanti | 25 | — | ∞ | **spinta enorme** (450 px/s a 45°) per buttare in mare |
| 5 | **Barile di polvere** | piazzato ai piedi, miccia 5 s | 75 | 85 | 1 | distrugge gruppi e terreno, poi si scappa con la ritirata |
| 6 | **Mina a conchiglia** | piazzata, si arma dopo 2 s, scatta se un pirata passa entro 40 px (1 s di ritardo) | 45 | 50 | 2 | controlla una zona e chiude i passaggi |
| 7 | **Rum molotov** | lanciata, V; si rompe e lascia 6 fiamme che colano per 4 s | 8 per fiamma per tocco | — | 2 | colpisce le trincee e intrappola chi sta nelle buche |
| 8 | **Palla incatenata** | proiettile che vola dritto e scava un tunnel di 20 px per 400 px, attraversa i pirati | 25 a ciascuno | — | 1 | apre tunnel e colpisce i pirati in fila |
| 9 | **Pappagallo kamikaze** | volo pilotato per 6 s a 220 px/s, esplode sul tocco o allo scadere | 55 | 60 | 1 | colpisce dove la balistica non arriva, ma ci vuole abilità |
| 10 | **Scimmia con la miccia** | corre sul terreno e salta i gradini fino a 30 px, esplode con FUOCO o dopo 8 s | 65 | 70 | 1 (C) | stana i nemici nelle grotte |
| 11 | **Ancora d'abisso** | scegli una x e cade dal cielo, attraversa 150 px di terreno | 40 + spinta verso il basso | 30 | 1 | attacco verticale contro chi si ripara sotto i tetti |
| 12 | **Bordata del galeone** | un galeone fuori schermo spara 5 palle lungo una x, V | 30 ciascuna | 40 | 1 (C) | colpo ad area; disattivata nelle grotte |
| 13 | **Rampino** | corda fino a 350 px, con dondolio | — | — | ∞ (3 lanci a turno) | **mobilità**, non chiude il turno |
| 14 | **Vanga del bucaniere** | scava per 3 s davanti o in diagonale in basso (tunnel di 26 px) | — | — | ∞ | rifugio e accessi, non chiude il turno |
| 15 | **Mappa del tesoro** | teletrasporto in un punto libero toccato | — | — | 1 | fuga o attacco a sorpresa; chiude il turno |
| 16 | **Ira del Kraken** | un tentacolo spazza una colonna larga 300 px e trascina i pirati verso il mare più vicino | 50 + spinta 600 px/s | — | 0 (C, rara) | super-arma che ribalta la partita |

Dotazione di partenza: le armi 1-4 e 13-14 con ∞; armi 5, 7, 9, 11 e 15 con 1 munizione; armi 6 e 8 con 1 munizione. In seguito lo strato strategico potrà modificare la dotazione (porti conquistati, ecc.).

## 6. Casse

- Dal turno 3, a ogni turno c'è il **50%** di probabilità che cada una cassa, con al massimo 3 casse in mappa. Scende col paracadute a 60 px/s e il vento la sposta. Atterra sempre su un punto raggiungibile.
- Il contenuto:

| Tipo | Probabilità | Contenuto |
|---|---|---|
| **Arma** | 55% | 1 munizione, pescata con pesi: armi 5-11 40%, Bordata 25%, Scimmia 20%, Mappa 10%, Kraken 5% |
| **Rum** | 30% | +25 PV, fino a un massimo di 100 |
| **Trappola** | 15% | esplode quando la apri: 30 danni, raggio 50 |

- La cassa si raccoglie toccandola camminando. Se la colpisce un'esplosione, scoppia (25 danni, raggio 45).

## 7. Biomi delle mappe

Ogni mappa nasce da una **sagoma disegnata a mano** (12 per bioma) a cui si applicano rumore procedurale e decorazioni. Gli spawn vengono validati: a terra, a più di 150 px dai nemici e a più di 80 px dal mare. Il bioma dipende dal paese conteso sulla mappa strategica.

| Bioma | Materiali | Vento max | Particolarità |
|---|---|---|---|
| **Isola tropicale** | sabbia, roccia | ±6 | colline morbide e crateri grandi; mappa per imparare |
| **Cimitero di navi** | legno, ferro | ±8 | relitti sospesi e piattaforme strette; molte cadute in mare |
| **Scogliera vulcanica** | roccia, ferro | ±10 | pareti verticali e crateri piccoli; premia rampino e granata |
| **Porto della Tortuga** | legno, roccia | ±5 | case con tetti, pontili sull'acqua, barili di polvere già piazzati (3-5) |
| **Ghiacci del Nord** | ghiaccio, roccia | ±7 | si scivola e le spinte valgono doppio in pratica |
| **Grotta dei contrabbandieri** | roccia, sabbia | 0 | soffitto chiuso, niente Bordata e niente Ancora; pappagallo e scimmia sono le stelle |

## 8. IA nemica

L'IA **simula i tiri con lo stesso motore fisico**, su una copia della maschera ridotta a ½ risoluzione, distribuendo il calcolo su più frame. Il giocatore intanto vede "il capitano medita..." per 1-2 s.

Algoritmo a ogni turno:
1. **Posizioni candidate**: quella attuale più K posizioni raggiungibili camminando, saltando o col rampino.
2. **Bersagli**: per ogni nemico calcola un punteggio. Pesa di più un nemico con pochi PV (+), uno vicino al mare (+) e uno vicino (+).
3. **Armi**: per ogni coppia (arma, bersaglio), campiona angolo e potenza, oppure miccia o punto sulla mappa, e simula il tiro.
4. **Punteggio del tiro**: danno ai nemici + 60 per ogni uccisione + 80 per ogni annegamento − 1,5 × danno ai compagni − 2 × danno a sé stesso − 200 se il proprio pirata finisce in mare.
5. Sceglie il tiro migliore (Mozzo: uno a caso tra i 5 migliori). Aggiunge un **errore umano**, poi mira con una piccola animazione del cursore e spara.
6. Usa la ritirata per allontanarsi dal punto d'impatto o dai bordi.

| Livello | Simulazioni | Posizioni K | Errore angolo / potenza | Vento considerato | Armi |
|---|---|---|---|---|---|
| **Mozzo** | 40 | 0 | ±8° / ±15% | 50% | solo 1-5 |
| **Nostromo** | 200 | 2 | ±3° / ±6% | 100% | tutte tranne pilotate e rampino |
| **Capitano** | 600 | 4 (rampino incluso) | ±1° / ±2% | 100% | tutte, pilotate con percorso precalcolato; conserva le armi rare per uccisioni sicure |

Se nessun tiro supera 10 punti, l'IA si sposta verso una copertura oppure scava. Le armi pilotate vengono simulate come un percorso a 5 tappe verso il bersaglio.

## 9. Vittoria e ritorno allo strato strategico

- **Vittoria**: vince chi elimina tutti i pirati avversari in campo **e** tutte le riserve. A 6:00 la battaglia si decide ai PV (vedi §1). Esiste anche il tasto **Ritirata** (resa): i pirati sopravvissuti di chi si ritira tornano nel paese di partenza con −20 PV, e la ritirata non è possibile per il difensore.
- **Rapporto di fine battaglia** passato allo strato strategico:
  - vincitore (attaccante o difensore) ed esito (eliminazione, tempo, ritirata)
  - lista dei **pirati sopravvissuti** per lato, con PV, uccisioni e cadute in mare
  - armi delle casse non usate (opzionale: vanno al bottino del paese)
  - durata e numero di turni (per la telemetria del bilanciamento)
- **Effetti sulla mappa strategica**:
  - **Attaccante vince**: i suoi sopravvissuti occupano il paese.
  - **Difensore vince**: tiene il paese con i suoi sopravvissuti. Se la battaglia finisce a tempo, gli attaccanti sopravvissuti tornano al paese di partenza.
  - **Feriti**: un pirata con meno di 30 PV torna "ferito" e combatte la prossima battaglia con 50 PV finché non resta fermo un turno strategico. Tutti gli altri tornano a 70 PV.
  - **Squadra a riposo**: se una squadra conta un solo pirata contro 4 o più, conviene proporre la **risoluzione automatica**, da definire nel doc strategico.

## 10. Bilanciamento: controlli rapidi

- Ci vogliono **2 colpi medi** per uccidere un pirata (70 PV contro 40-45 danni). Una spinta ben fatta uccide con un colpo solo.
- Con 4 pirati contro 4 servono circa 8 colpi utili per squadra, cioè 12-16 turni, cioè **4-6 min**. Il mare che sale chiude le partite in stallo.
- Metriche da tracciare: durata media della battaglia, % di morti per annegamento (obiettivo 30-40%), uso di ogni arma (nessuna sotto il 3% né sopra il 35% dei tiri), % di vittorie del giocatore per livello IA (obiettivo Mozzo 85%, Nostromo 55%, Capitano 30%).
