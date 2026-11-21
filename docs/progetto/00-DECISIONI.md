# 00 — DECISIONI (fonte di verità unica)

*Capo Designer, chiusura della fase di design. Questo documento **prevale su tutti gli altri (01-13, compreso 05)**. Quando un documento dice altro, vale quello che c'è scritto qui. In §6 c'è l'elenco puntuale di cosa va corretto in ogni documento. I numeri di bilanciamento sono valori iniziali: vivono in `contenuti/bilanciamento.ts` e `contenuti/armi.ts` e li conferma il simulatore. Si cambiano lì, non nei documenti.*

**Convenzione sui "turni".** Un *turno di battaglia* è l'azione di **un** pirata di una squadra (uno sparo). Si contano in totale, per tutte e due le squadre: il turno 12 è il 6° turno di ciascun lato. Un *round* è un giro completo della mappa strategica, in cui ogni ciurma fa il suo turno.

---

## 1. Numeri canonici

### 1.1 Battaglia

| Tema | Decisione | Fonte / motivo |
|---|---|---|
| **Pirati per lato** | **Massimo 5, tutti in campo subito. Niente riserve, niente sbarchi, niente scialuppa.** Da 1 a 5 per lato (anche nella Schermaglia) | 05. 09 e 06 dicevano 4+1 perché li hanno scritti prima di 05. Così c'è un solo numero da spiegare ("5 nella scialuppa, 5 in battaglia"), sparisce il codice dello sbarco sicuro, che è il più fragile (13 casi 9 e 17), e nessun pirata resta a guardare |
| PV pirata | **70**, niente rigenerazione. Corsari del Gelo in difesa: **80** (+10) | 01, 05 §2.6 |
| Timer del turno | **20 s**. **30 s** a difficoltà Mozzo e nelle prime 3 battaglie del giocatore. Opzione di accessibilità "Timer lungo" da **45 s**. Il timer parte al primo tocco oppure dopo 2 s | 05 §10, 09, 10 §6. Tutti e tre i valori sono validi in campagna perché si gioca da soli |
| Fuga dopo lo sparo | **3 s** di movimento libero, poi il turno passa | 01 |
| Durata obiettivo | **10-16 turni** per una battaglia 5 contro 5, cioè **3-5 min** | 05 §20 |
| Mare che sale | **dal turno 12** il mare sale di **25 px** alla fine di ogni turno | 05 |
| Fine battaglia | **al turno 18** vince chi ha più PV totali; a parità vince **il difensore**. Bersaglio: meno del 10% delle battaglie si decide a tempo. Se il simulatore va oltre, la leva è il limite (18 → 20) | 05. Il "16" di 09 decade, perché 09 contava 4 pirati in campo e non 5 |
| Ritirata | Solo **l'attaccante**, **dal turno 4** (contato in totale), **senza penalità**: i sopravvissuti tornano al territorio di partenza | 05 §12 |
| Esiti | Attaccante eliminato: perde tutto. Fine a tempo o ritirata: i sopravvissuti dell'attaccante tornano a casa e il difensore tiene il territorio. Vincitore: i sopravvissuti occupano il territorio o restano dove sono | 05 §11 |
| Feriti | **Non esistono.** I pirati non hanno identità persistente e ogni battaglia parte con i PV pieni | 05 §13 |
| Danno da caduta | oltre **90 px** di caduta: 1 PV ogni 4 px, **massimo 25** | 01, 09 |
| Lapide | **Barilotto con il cappello**, esplode con 10 danni, raggio 25 | 05 §21 |
| Casse | dal turno 3, con il **50%** di probabilità a ogni turno, al massimo 3 in mappa. Arma 55%, **Latte di cocco** 30% (+25 PV, fino a un massimo di 100), Trappola 15% (30 danni, raggio 50). La cassa colpita esplode (25 danni, raggio 45). Rimonta: la squadra sotto il 60% dei PV avversari ha il 70% di probabilità che la cassa cada nella propria metà | 01, 09 §5 |
| Kit gratis per battaglia | Barile ×1 e Mina ×1 | 09 |

### 1.2 Mondo di battaglia, fisica e schermo

| Tema | Decisione |
|---|---|
| Mondo | **2048×1024 px** logici, cioè 8×4 tile da 256 |
| Fasce verticali | 0-160 cielo libero (nella Grotta qui c'è il soffitto) · 160-950 terreno · **mare iniziale a y = 950** (con l'evento Marea alta a y = 900) · 984-1024 fondale in ferro |
| UI | Si progetta a **800×360 px CSS** (20:9, il caso peggiore) e si scala in su. I menu stanno in un palco centrale largo al massimo 900 px |
| Camera di battaglia | **Altezza logica fissa 540**, larghezza variabile da 960 a 1215. **Zoom predefinito 1,4**, intervallo 0,5-2,0. Risoluzione del renderer `min(dpr, 1,5)` |
| Pirata | Hitbox a capsula **12×22**. Sprite disegnato a 40 px di mondo, cioè circa 37 px CSS. Cella dello sheet 128×128. **Leggibilità verificata a 36 px CSS** |
| Movimento | Camminata 60 px/s, gradino massimo 8 px. Salto in avanti: vx 90, vy −230. Doppio tocco: vx −40, vy −330 |
| Fisica | Passo fisso a 60 Hz. **g = 600 px/s²**, cioè 0,1667 px/tick². Velocità massima dei proiettili 950 px/s. Vento: intero da −10 a +10, con il massimo che dipende dal bioma; vale 15 px/s² per punto (0,0042 px/tick²). Rimbalzo del pirata 0,3, il pirata si ferma sotto i 5 px/s. Al massimo 5 tick per frame |
| Esplosione | danno `D × (1 − d/r)`, minimo 1 dentro il raggio. Spinta `D × 7 px/s` con la stessa attenuazione. Chi spara si fa male (studio v2, Fase 0: tranne il colpo sprecato sul pendio a meno di 60 px che non raggiunge nessun altro; prima di sparare il tasto FUOCO avvisa) |
| Determinismo | PRNG con seme nello stato, niente `Math.random`, `Date.now`, `Math.sin` o `Math.cos` nella simulazione (si usa una tabella a 0,5°) |

**Materiali del terreno** (1 byte per pixel nella maschera):

| Valore | Materiale | Moltiplicatore del cratere | Note |
|---|---|---|---|
| 0 | aria | — | |
| 1 | sabbia | 1,2 | |
| 2 | terra | 1,0 | riempimento comune sotto la superficie (esiste già il tile `terreno_terra` di 03) |
| 3 | legno | 1,0 | relitti, case, pontili |
| 4 | roccia | 0,75 | |
| 5 | ghiaccio | 0,9 | attrito 0,2 |
| 6 | ferro | 0 | indistruttibile, al massimo il **3% del solido** |

Tile grafici necessari: sabbia, terra, legno, roccia, ghiaccio, ferro, più il bordo d'erba.

### 1.3 Le 16 armi (nomi definitivi)

I nomi non si sovrappongono a quelli delle carte (che ora si chiamano **Pergamene**) e non contengono alcol né riferimenti a guerre reali ("kamikaze", "molotov" e "mitraglia" spariscono), perché puntiamo al **PEGI 7** proposto in 07.

Come si ottengono: **Base** = munizioni infinite · **Kit** = 1 munizione gratis a battaglia · **Stiva** = si compra in bottega (al massimo 3 per tipo) · **Cassa** = solo dalle casse. V = l'arma risente del vento.

| # | Nome definitivo | Era | Danno / raggio | Come si ottiene | Quando |
|---|---|---|---|---|---|
| 1 | Cannone a mano (V) | | 45 / 55 | Base | M2 |
| 2 | Granata di bordo (miccia 1-5 s) | | 40 / 50 | Base | M2 |
| 3 | Pistola a pietra focaia | | 18 ×2 | Base | M2 |
| 4 | Sciabola | | 25, spinta fissa 450 a 45° | Base | M2 |
| 5 | Barile di polvere | ("dinamite" di 04) | 75 / 85 | Kit + Stiva, 3 dobloni | M2 |
| 6 | Mina a conchiglia | | 45 / 50 | Kit + Stiva, 2 | M2 |
| 7 | **Fiasco al peperoncino** (V) | Rum molotov | 8 per fiamma, 6 fiamme | Stiva, 2 | v1 |
| 8 | **Palla spezzata** (V): esplode e lancia 5 frammenti | Bomba a mitraglia / cannone a grappolo; la Palla incatenata va alla v1.1 | 20 + 5×15 / 30 e 25 | Stiva, 3 | M2 |
| 9 | **Pappagallo postino** (pilotato) | Pappagallo kamikaze | 55 / 60 | Stiva, 4 | M2 |
| 10 | Scimmia con la miccia | | 65 / 70 | Cassa (20%) | v1 |
| 11 | Ancora d'abisso | | 40 / 30, spinta verso il basso | Stiva, 3 | M2 |
| 12 | Bordata del galeone (V) | | 5 × 30 / 40 | Cassa (25%) | v1 |
| 13 | Rampino (non chiude il turno) | | — | Base, 3 lanci a turno | M2 |
| 14 | Vanga del bucaniere (non chiude il turno) | | — | Base | M2 |
| 15 | **Bussola stregata** (teletrasporto) | Mappa del tesoro | — | Stiva, 2 | M2 |
| 16 | Ira del Kraken | | 50, spinta 600 verso il mare | Cassa (5%) | v1 |

M2 = 12 armi (1-6, 8, 9, 11, 13, 14, 15). La Vanga serve all'IA quando "scava", la Palla spezzata è già nel lotto 1 delle icone. v1 = le altre 4. L'elenco armi di 04 si cancella. Tutti gli altri parametri (spinte, micce, comportamenti) sono quelli di 01 §5 e 09 §1. **Teschio Rosso**: +10% di danno sulle armi 1, 2, 5, 6, 8, 9, 10, 12. **Marina Reale**: solo armi Base e Kit.

### 1.4 Arrembaggio rapido (risoluzione automatica), formula di 09

- **P(vince l'attaccante) = A⁴ / (A⁴ + (m·D)⁴)**, dove A sono gli attaccanti e D i difensori.
- **m neutro = 1,06**: vale per IA contro IA e per le difese del giocatore risolte in automatico; le perdite si arrotondano a caso con il seme. **m del giocatore che attacca in auto = 1,15**, con perdite arrotondate per eccesso (è la "tassa di comodità" voluta).
- **Perdite del vincitore** = min(0,75 × pirati del perdente, 0,55 × pirati del vincitore), con un tetto di vincitore − 1. Chi perde perde tutto.
- **Modificatori**: Forte m × 1,25 · Gelo in difesa m + 0,05 · Teschio in attacco A × 1,05 · Pergamena Fuoco di Copertura D × 0,65. In auto la stiva non si usa e non si consuma.
- Prima di confermare si vede l'anteprima: "Vittoria ~74% · perdite previste 2".
- **Quando l'auto è preselezionata** (il giocatore può sempre scegliere "Gioca tu"): attacchi contro la Marina, attacchi con rapporto ≥ 2:1, difese del giocatore tranne la capitale e i territori con forte. Le battaglie IA contro IA sono sempre automatiche (animazione di 2 s, accelerabile ×2/×4).

### 1.5 Strato strategico

| Tema | Decisione |
|---|---|
| Mondo | **Isole Spezzate**, nel Mare dei Cento Venti. **28 territori in 6 regioni**, con i nomi, le adiacenze (47 rotte, 13 tra regioni) e i bonus di 02 §1: A +3, B +2, C +2, D +4 (+2 dobloni), E +3, F +3 |
| Partenza | ogni ciurma ha la capitale con 4 pirati e 2 territori adiacenti con 2 pirati ciascuno (8 pirati). Gli altri 16 territori sono della Marina, con 1-3 pirati estratti con il seme |
| Tetto | **5 pirati per territorio** |
| Attacco | Si possono **unire pirati da più territori propri adiacenti al bersaglio, fino a 5**, e ogni territorio di partenza tiene almeno 1 pirata. Ogni pirata combatte una sola battaglia per turno |
| Rinforzi | max(3, ⌊territori/3⌋) + bonus delle regioni complete + 1 se si tiene la propria capitale + Pergamene. Ogni pirata che non trova posto vale **1 doblone**. **Rivalsa**: dal round 5, chi ha meno della metà dei territori del leader riceve +2 |
| Fortificazione | Un solo spostamento a turno, lungo una catena di territori propri, rispettando il tetto |
| Dobloni | 1 ogni 2 territori + 2 per ogni battaglia vinta + 2 se si tiene tutta D (+2 per la Fratellanza). **Tetto 20.** Chi perde la capitale perde metà dei dobloni, che vanno a chi l'ha conquistata |
| Bottega | Mercenario 3 (massimo 2 per round), armi di Stiva 2-4, **Forte 8**. Nella v1 il Forte è **solo terreno di ferro e roccia attorno a 2 spawn del difensore**, su una collinetta; in auto vale m × 1,25. Il cannone fisso va nel lotto 2 |
| Pergamene (le carte) | Mano di al massimo 4. Se ne pesca 1 a fine turno se si è conquistato almeno un territorio. Sono 8: Ciurma di Rinforzo (+3), **Fuoco di Copertura** (ex Bordata), Nebbia, Vento in Poppa, Ammutinamento, Forziere (+6), Polvere Nera, Ancora di Salvezza |
| Sblocchi progressivi | Battaglia 1 = Prologo con le armi 1-4. Round 1 "protetto" (l'IA non attacca il giocatore). **Dal round 4**: Pergamene, eventi del mare (30% a round) e bottega |
| Pressione IA | A difficoltà Mozzo, al massimo 1 attacco al giocatore per round. **Coalizione**: contro chi ha ≥ 12 territori. Rivalità di 07 (Barbabrina e Morgana −20% di priorità d'attacco tra loro) |
| **Vittoria della campagna** | **16 territori su 28**, oppure **tutte le capitali nemiche ancora in gioco**. Al round 25 ("arriva la stagione delle tempeste") vince chi ha più punti: 1 per territorio, +3 per capitale, +2 per regione completa. Durata bersaglio **75-95 min** |
| **Rotta breve** | Regioni A, D ed E (15 territori), il giocatore più **2 rivali** scelti tra Teschio, Oro e Marea. Vittoria a **10 territori** o con le 2 capitali. Durata 30-40 min. È anche la campagna della **versione di prova** (12) |
| Difficoltà | Mozzo / Nostromo / Capitano, con i numeri di 01 §8 (IA in battaglia) e di 09 §4 (rinforzi IA −1/0/+1, soglie d'attacco 2,0/1,5/1,3). IA in un **Web Worker** fin da M2 |
| Salvataggio | Autosalvataggio dopo ogni fase e ogni battaglia, **2 copie a rotazione con checksum**, 3 slot. **Battaglia interrotta: si riprende dal replay** (seme + comandi). Se è cambiata la versione delle regole, la battaglia riparte da capo con le stesse forze e il gioco lo dice |
| Modalità v1 | Campagna (1 umano + 3 IA), Rotta breve, **Schermaglia** (bioma, 1-5 pirati per lato, livello IA). Pass and play nella **1.1**, ma il modello dati supporta già più fazioni umane |
| Lingua | Tutti i testi stanno in un file di stringhe fin da subito. Si parte in italiano |

---

## 2. Nomi definitivi

### 2.1 Le ciurme

Il colore segue **la ciurma**, non il giocatore. Il "tuo" lato si riconosce da un **anello a terra e una freccia** sul pirata attivo, mai da un colore riservato. Ogni squadra ha sempre colore + emblema + motivo della bandiera, mai solo il colore.

| Ciurma | Capitano | Capitale | Colore / scuro | Emblema | Bandiera | Tratto | IA |
|---|---|---|---|---|---|---|---|
| **Teschio Rosso** | Capitana **Scarlatta Mano di Fuoco** | A1 Porto Teschio | `#E5484D` / `#8E1F23` | teschio bendato | diagonale | +10% di danno con gli esplosivi | attacca sempre |
| **Corsari del Gelo** | Capitano **Barbabrina** (con il pinguino Bottone) | C2 Fiordo del Kraken | `#22C7D9` / `#0F7C8A` | fiocco di neve + ancora | strisce orizzontali | +10 PV in difesa | fortifica |
| **Fratellanza dell'Oro** | **Don Dobloncino** | D3 Mercato dei Ladri | `#9B6BFF` / `#5631B0` | corona con doblone | quartata | +2 dobloni a turno, bottega −20% | compra |
| **Dannati della Marea** | Capitana **Morgana Salsedine** | E3 Cimitero di Galeoni | `#3DBE6A` / `#1E7A3F` | conchiglia-teschio | bordo dentellato | dopo una battaglia vinta torna 1 pirata caduto, **al massimo 1 volta per round** (succede sulla mappa, non in battaglia) | punta le capitali |
| **Marina Reale** (neutrale) | **Ammiraglio Pomposo Ceralacca** | — | **grigia** `#A8A29E` / `#57534E` | sole con àncora reale | tinta unita con bordo | non attacca mai | si difende |

La Marina veste **giubbe grigie con bottoni d'oro**, non "giubbe rosse": si confonderebbero con il Teschio Rosso. I nomi di 03 (Ciurma del Corallo, Teschi Rossi, Corona Viola, Lega di Smeraldo) sono **aboliti**.

Altri nomi fissi:
- Livelli di difficoltà dell'IA: **Mozzo, Nostromo, Capitano**.
- Guida del tutorial: **Mastro Gancio**. Il "Nostromo Gancio" di 10 si sarebbe confuso con il livello Nostromo.
- Leggenda: il **Vecchio Brontolone** e il **Timone dei Venti**, diviso in 4 Raggi custoditi nelle capitali (07).

### 2.2 Biomi (elenco unico)

Enum: `isola | cimitero | scogliera | porto | ghiacci | grotta`, più `variante?: oro | rovine | giungla | ossa | tempesta`. Una variante cambia la grafica e al massimo una piccola regola. Non è un bioma nuovo.

| Bioma | Materiali | Vento massimo | Particolarità |
|---|---|---|---|
| Isola tropicale | sabbia, terra, roccia | ±6 | la mappa per imparare |
| Cimitero di navi | legno, ferro | ±8 | molte cadute in mare |
| Scogliera vulcanica | roccia, ferro | ±10 | pareti verticali |
| Porto della Tortuga | legno, roccia | ±5 | 3-5 barili di polvere già piazzati |
| Ghiacci del Nord | ghiaccio, roccia | ±7 | si scivola |
| Grotta dei contrabbandieri | roccia, sabbia | 0 | Bordata e Ancora disattivate |

**Assegnazione per territorio: vale la tabella di 06 §3** (per esempio A1 Porto, B3 Scogliera, C1 Ghiacci, D2 Grotta·oro, E1 Cimitero·ossa, F5 Isola·tempesta).

**Generazione delle mappe nella v1: procedurale** con i parametri del bioma (04) e la validazione anti-frustrazione di 06 §7. Se la validazione fallisce 8 volte si usa un **seme di riserva già validato** dal simulatore per quel bioma: non servono sagome disegnate a mano. Unica mappa a mano nella v1: il **Prologo "Sbarco a Cala Pappagallo"**. Le 3 mappe firma di 06 (A1, C2, E3) vanno nel **lotto 2**. Fino ad allora D3 e le capitali usano un seme fisso.

---

## 3. Controlli definitivi (battaglia)

```
[II] [PV + emblema A]   ⏱ timer  ~vento~   [PV + emblema B]
              (anello di mira attorno al pirata attivo)
                                                [ARMA]
[ ◀ ][ ▶ ]                           [▲][▼]   [SALTA][ FUOCO ]
```

- **Mira a fionda (01).** Si parte dall'anello di mira (100 px attorno al pirata) e si trascina **all'indietro**: la direzione dà l'angolo, la lunghezza (0-160 px) dà la potenza. Quando si rilascia, la mira **resta impostata e non spara**. La traiettoria tratteggiata copre il primo 30% del volo, il 100% nel tutorial e a Mozzo.
- **FUOCO è un tocco singolo** e non si tiene premuto. Il "tieni premuto per caricare" di 03 e 04 è abolito, compresa l'opzione di 10. FUOCO misura **80 px**. Un doppio tocco spara una volta sola.
- **▲▼**: 1° a tocco, 10°/s se si tiene premuto.
- **Dimensioni**: tutti gli altri tasti di battaglia misurano **≥ 64 px** (◀ ▶ SALTA ▲ ▼ ARMA), con almeno 12 px tra un tasto e l'altro e almeno 56 px dal bordo corto (notch). Fuori dalla battaglia il minimo è 48 px.
- **Selettore armi a griglia 4×4** (01, con lo stile visivo di 03). Si apre da ARMA a metà schermo (circa 48% della larghezza), con celle di circa 88×64 che contengono icona, numero di munizioni e nome a 12 px. Le righe seguono la numerazione: 1-4 armi Base, 5-8 esplosivi, 9-12 speciali, 13-16 utilità e Kraken. Le armi esaurite o non disponibili sono in grigio con il lucchetto. Un tocco sceglie e chiude, un tocco fuori chiude. **Il timer non si ferma.** Il selettore radiale di 03 è abolito.
- Miccia: un chip "1-5 s" sopra FUOCO; ogni tocco fa scorrere il valore. Le armi a bersaglio (Bordata, Ancora, Bussola) si usano toccando la mappa e confermando con FUOCO. Le armi pilotate (Pappagallo, Scimmia) si sterzano con ◀▶ e si fanno esplodere con FUOCO. Rampino: ◀▶ per dondolare, ▲▼ per accorciare o allungare la corda, SALTA per staccarsi.
- Camera: trascinare un dito **fuori dall'anello**, pinch per lo zoom, doppio tocco per ricentrare. Il trascinamento della camera non parte entro 24 px dai bordi laterali (lì c'è il gesto indietro di Android).
- Mancini: un interruttore specchia tutto l'HUD e viene proposto durante il Prologo. Tasto indietro di Android = Pausa.

---

## 4. Nome del gioco

**Kaboom Ahoy!**, con sottotitolo **"Isole Spezzate"**, da confermare (domanda 1). In M0 l'`appId` si fissa una volta sola, dopo aver verificato che il nome sia libero sul Play Store. Il progetto su Magnific prende lo stesso nome.

---

## 5. Valori di controllo per il simulatore (sostituiscono quelli dei documenti)

Battaglia 5 contro 5: **10-16 turni**. Decise a tempo: < 10%. Morti in mare: 30-40%. Uso di ogni arma: tra il 3% e il 35% dei tiri. 5 contro 3: l'attaccante vince il 75-85%. Vittorie del giocatore contro l'IA nel 5 contro 5: Mozzo 85%, Nostromo 55%, Capitano 30%. Campagna: **12-18 round, 75-95 min**, battaglie in auto 25-40%. Ogni ciurma vince tra il 20% e il 30% delle partite IA contro IA. Nessun territorio supera mai 5 pirati.

---

## 6. Correzioni da fare nei documenti 01-13

*Le applica l'autore di ciascun documento oppure, più semplicemente, chi programma legge prima questo file. 14-produzione.md, quando verrà scritto, parte da qui.*

**01 Combattimento**
- §1: da "4 in campo + riserve" a 5 in campo e nessuna riserva. La morte improvvisa e il limite si contano in turni (12 e 18), non in minuti (4:00 e 6:00). Timer 20/30/45 come §1.1. "PV totali (riserve incluse)" diventa "PV totali".
- §2: riferimento 800×360 CSS. FUOCO 80, gli altri tasti ≥ 64.
- §3: mondo 2048×1024, mare a 950, tabella dei materiali con la terra (§1.2).
- §4: togliere lo sbarco delle riserve.
- §5: rinominare 7 Fiasco al peperoncino, 8 Palla spezzata (la Palla incatenata va nel backlog v1.1), 9 Pappagallo postino, 15 Bussola stregata. Munizioni e dotazione secondo §1.3 (Base/Kit/Stiva/Cassa); la "dotazione di partenza" di 01 decade.
- §6: Rum → Latte di cocco; pesi delle casse come 09.
- §7: niente 12 sagome a mano per bioma; generazione procedurale (§2.2).
- §9: niente riserve nella condizione di vittoria; ritirata dal turno 4 senza −20 PV; togliere i feriti; la "squadra a riposo" è regolata da §1.4.
- §10: 5 contro 5, 10-16 turni.

**02 Mondo e strategia**
- §1: la riga dei biomi per regione si sostituisce con la tabella di 06 §3.
- §2: Gelo da +20 a +10 PV; Dannati al massimo 1 volta per round; Marina grigia, senza "giubbe rosse".
- §3.2: attacco unito da più territori fino a 5; mare che sale dal turno 12 e limite al turno 18; ritirata senza penalità.
- §3.4 e §5: "Mappe del Tesoro" diventano **Pergamene**; la carta Bordata diventa **Fuoco di Copertura** (in auto D × 0,65).
- §3.1: i rinforzi in eccesso diventano dobloni.
- §4: Forte v1 senza bunker né cannone, in auto × 1,25 (non × 1,5); tetto di 20 dobloni.
- §6: formula A⁴ di 09 al posto di A²; vittoria a 16 territori; timer 20 s, non 30; aggiungere la Rotta breve, Rivalsa e Coalizione.
- §7: la battaglia interrotta si riprende dal replay.
- §9: battaglie e durata ricalcolate (§5).

**03 Stile e UI**
- §2: la tabella delle fazioni si sostituisce con §2.1; il giocatore non ha un colore riservato.
- §5.6 e §5.7: niente radiale e niente "tieni premuto"; griglia 4×4, fionda, ▲▼, FUOCO 80, tasti ≥ 64. I banner diventano "Turno del Teschio Rosso".
- §5.5: lo slider va da 1 a 5 e permette di aggiungere pirati da più territori adiacenti.
- §5: aggiungere le schermate mancanti: piazzamento dei rinforzi, fortificazione, bottega, mano di Pergamene, evento del mare, impostazione della Schermaglia, anteprima dell'Arrembaggio rapido, "Riprendi" dopo un'interruzione, e il tasto ×2/×4 durante i turni dell'IA.
- §6 e §8: pirata a ~37 px CSS, verifica a 36 (non a 44).
- §8.4: n. 9 `lapide` = barilotto con il cappello. N. 23 `proiettili`: cannonball, granata, palla spezzata con frammento, barile (senza dinamite). N. 28 `emblemi`: teschio bendato, fiocco di neve + ancora, corona con doblone, conchiglia-teschio, sole con àncora (5). N. 29 `icone_armi`: sheet da 16 celle nell'ordine di §1.3. N. 30 `mappa_mondo`: 6 gruppi di isole e 28 territori. N. 31 `capitani`: rosso, turchese, viola, verde, più l'Ammiraglio nel lotto 2.
- Tile: aggiungere legno, ghiaccio e ferro.

**04 Tecnica**
- §2: viewport ad altezza 540 e larghezza variabile, zoom 0,5-2,0; maschera a 7 valori (§1.2); capsula 12×22 e non cerchio r7; gradino 8 e non 4; g 0,1667; vento 0,0042 per punto; caduta oltre 90 px e non 60; mare +25 px dal turno 12 (non +8 dal turno 20), limite al turno 18.
- §5: `bioma` diventa l'enum di §2.2; `Attacco.da` diventa un elenco di territori con il numero di pirati per ciascuno; `Fazione.arsenale` è la stiva, con tetto 3.
- §6: 2 copie del salvataggio con checksum.
- §7: i numeri e i nomi dell'IA sono quelli di 01 (Mozzo/Nostromo/Capitano, +60 per uccisione); Web Worker da M2.
- §8: simulatore con squadre da 1 a 5; battaglia 5 contro 5 in 10-16 turni.
- §10: M1 timer 20 s e arma "Cannone a mano" (non bazooka), con la Schermaglia come consegna. M2 si fa con le 12 armi di §1.3 (si cancella la lista di 04) e la **griglia**, non la ruota. M3 ha 28 territori. M4 senza riserve. Il nome dell'app è in §4.

**05 Revisione**
- §1 n. 4: l'elenco delle armi M2 diventa quello di §1.3 (si aggiungono la 8 e la 14).
- §1 n. 16: la mappatura dei biomi è quella dettagliata di 06 §3.
- §1 n. 22: il Forte include anche roccia, sulla collinetta.
- §2.4: "armi sbloccate conquistando i porti" si toglie; le armi arrivano da Base, Kit, Stiva e Casse.
- Il resto resta valido.

**06 Livelli**
- §0 e §1: mare a 950 (Marea alta 900) e non a 944; materiali con la nuova numerazione (§1.2); il passo 1 "sagoma a mano" diventa un profilo procedurale da parametri, con il seme di riserva validato al posto della sagoma di riserva.
- §4: **5 spawn per lato**, nessun punto di sbarco e nessuna riserva.
- §5: Forte v1 senza bunker con feritoie né cannone fisso (lotto 2): collinetta + ferro e roccia attorno a 2 spawn.
- §6: le mappe firma passano al lotto 2. Togliere "riserve di Morgana sulla torre": la resurrezione avviene sulla mappa.
- Le domande sono chiuse da questo documento.

**07 Narrativa**
- §4: Marina con giubbe **grigie**.
- §2 e §5: vittoria a **16** isole; il momento "Metà" scatta a **8** isole o con una regione intera.
- §9: le carte sono **Pergamene**, la Bordata diventa Fuoco di Copertura; l'arma 15 è **Bussola stregata** (non "Scorciatoia segnata").
- §7: "Uber" → **Ubaldo** (è un marchio).
- §10: i colori ed emblemi definitivi sono quelli di §2.1 (Marea = conchiglia-teschio, non ancora e foglia).
- Aggiungere: Mastro Gancio (la guida), la Rotta breve con la sua intro, la cassa "Latte di cocco" nelle battute.

**08 Audio**
- `sfx_arma_catena_volo` si toglie (v1.1) e si aggiunge `sfx_arma_palla_spezzata` (scoppio + 5 frammenti).
- `molotov_rottura` → `sfx_arma_fiasco_rottura`.
- `sfx_arma_mappa_teletrasporto` → `sfx_arma_bussola_teletrasporto`.
- `sfx_cassa_rum` → `sfx_cassa_cocco` (sorso di cocco, niente "ahh" da bevuta).
- `sfx_riserva_sbarco` si toglie.
- `sfx_ui_radiale_*` → `sfx_ui_griglia_*`.
- `sfx_mappa_carta` = pesca una Pergamena.
- `mareSale` scatta al turno 12.
- Aggiungere `vox_cap_marina_*` per l'Ammiraglio.

**09 Bilanciamento**
- §0: 5 in campo, niente riserva; limite al turno 18.
- §1: nomi delle armi 7, 8, 9 e 15 secondo §1.3.
- §2: soglia 16 e durata bersaglio 75-95 min.
- §3: "carta Bordata" → Fuoco di Copertura.
- §5.5: togliere "la riserva che sbarca"; il Rum diventa Latte di cocco.
- §6: metriche 5 contro 5 in 10-16 turni, soglia 16.
- La tabella del §3 va rifatta con il simulatore per squadre da 1 a 5 tutte in campo.

**10 Onboarding**
- Guida: **Mastro Gancio**. Cassa: "Latte di cocco: +PV".
- Turno protetto: a fine turno niente carta pescata (Pergamene dal round 4), solo i dobloni.
- Regole insegnate più avanti: togliere le righe "Riserve" e "Feriti"; la morte improvvisa si insegna "al turno 12", non "a 4:00"; Pergamene, eventi e bottega dal round 4.
- Preparazione attacco: insegnare l'attacco unito da più territori quando serve per la prima volta.
- §6: "Timer rilassato 45 s o spento" diventa 30 s (Mozzo e prime 3 battaglie) + "Timer lungo" 45 s; togliere l'opzione "Tieni premuto per sparare".
- §9: i conflitti sono risolti.

**11 Animazione e pipeline**
- Test di leggibilità a **36 px CSS** (non 44) in tutte le occorrenze.
- Ricolorazione in 5 varianti con i colori di §2.1 (Marina grigia).
- `lapide` = barilotto con il cappello.
- Progetto Magnific: "Kaboom Ahoy".
- Domanda 3 decisa: le sorgenti pesanti restano fuori da git e si versionano solo i manifesti.

**12 Business**
- La campagna ridotta gratuita diventa la **Rotta breve** (A-D-E, con il Teschio Rosso giocabile), non "Costa del Teschio A+B".
- Lapide base: "Barilotto col cappello".
- Togliere i riferimenti al rum, che nel gioco non c'è più.
- Il resto (niente pubblicità, niente valuta, sblocco unico) resta.

**13 QA**
- §1: la tabella si sostituisce con un rimando a questo documento.
- L1: formula A⁴ di 09 con i suoi esempi, vittoria a 16.
- L2 e fuzz: togliere "sbarco delle riserve"; l'invariante diventa "vivi + morti = iniziali".
- §3: caso 4 → Ancora e Kraken (la Palla incatenata è v1.1); caso 9 → Bussola e casse, senza riserve.
- L3: 5 contro 5 in 10-16 turni.
- L4: target di battaglia 64 px (non 56).
- M4: togliere "(+ riserve)".
- Domanda 2 chiusa (replay, con ripartenza da capo solo se cambia la versione). Domanda 3 decisa: i bug si segnalano in chat con il codice replay; la issue GitHub è facoltativa.

---

## 7. Decisioni prese senza chiedere (erano domande nei documenti)

- Presidio pieno → attacco unito da più territori.
- Durata → 16 territori più la Rotta breve.
- Battaglie della Marina → in auto per default.
- Primo traguardo da provare → Schermaglia 3 contro 3 (M1+M2).
- Pass and play → 1.1.
- Tassa di comodità sull'Arrembaggio rapido → sì.
- Palla incatenata → v1.1.
- Mappe firma → lotto 2.
- Cannone del Forte → lotto 2.
- Barili extra per Scarlatta → no, i biomi restano neutrali (tranne la sua mappa firma).
- Prologo diretto al primo avvio → sì.
- Turno protetto → sì.
- Telemetria → solo locale, mai inviata.
- Vibrazione → accesa di default, si spegne dalle Impostazioni.
- Sorgenti degli asset → fuori da git.
- Segnalazione dei bug → in chat.
- Ripresa della battaglia → replay.

---

## 8. DOMANDE PER IL PROPRIETARIO (9)

1. **Nome del gioco.** Va bene **"Kaboom Ahoy! – Isole Spezzate"**? *Motivo:* corto, si capisce in tutte le lingue (esplosioni + pirati) e il sottotitolo racconta il mondo. Alternative: "Ciurme a Pezzi", "Isole Spezzate".
2. **Soldi o amici?** Il gioco deve guadagnare o basta che lo giochino amici e famiglia? **Consiglio: prima versione gratis e completa per amici e famiglia; lo sblocco a 4,99 € si aggiunge solo quando lo pubblichiamo per tutti.** *Motivo:* si arriva prima a giocarlo, e il sistema di pagamento si aggiunge dopo senza rifare niente.
3. **Account Google Play.** Lo apriamo a tuo nome o a nome dello studio? **Consiglio: a nome dello studio, se ha partita IVA.** *Motivo:* il nome dello studio appare come sviluppatore e si evita l'obbligo, per gli account personali nuovi, di far provare il gioco a 12 persone per 14 giorni. Serve però un numero D-U-N-S, che è gratuito.
4. **Budget per Magnific** (immagini, animazioni, musica). **Consiglio: a lotti, con un tetto di crediti per lotto deciso da te; si parte dal lotto 1 (pirata, un bioma, armi base, menu, circa 150 file).** *Motivo:* si vede la qualità prima di spendere tutto.
5. **Voci dei pirati.** **Consiglio: un borbottio buffo in lingua inventata ("arr", "brubba")**, oppure voci vere in italiano? *Motivo:* costa poco, fa ridere e non va tradotto.
6. **Niente alcol nel gioco.** Va bene che il "Rum" diventi **Latte di cocco** (la cassa che cura) e la bottiglia incendiaria diventi **Fiasco al peperoncino**? **Consiglio: sì.** *Motivo:* il gioco resta adatto a tutti (PEGI 7) senza perdere l'umorismo.
7. **Quante battaglie giochi a mano?** **Consiglio: il gioco propone l'automatico contro la Marina, quando sei in netto vantaggio e quando ti difendi (tranne la capitale e i forti); puoi sempre premere "Gioca tu".** *Motivo:* giocandole tutte, la campagna supera le 2 ore.
8. **Inglese.** **Consiglio: italiano subito, inglese aggiunto prima di pubblicare sullo Store.** *Motivo:* la pagina dello Store e la maggior parte dei giocatori sono in inglese, e i testi sono già pronti per la traduzione.
9. **Telefoni per le prove.** **Consiglio: dicci modello e anno di 1 o 2 telefoni Android che hai in casa, meglio se uno è economico.** *Motivo:* il gioco deve restare fluido sul telefono più lento che lo userà davvero.

---

## 9. RISPOSTE DEL PROPRIETARIO (21/11/2026) — prevalgono su tutto quanto sopra

1. Nome: **Kaboom Ahoy! – Isole Spezzate** (verificare disponibilità sul Play Store in M0).
2. Prima versione gratis e completa; sblocco 4,99 € solo alla pubblicazione per tutti.
3. Account Play **personale** → test chiuso obbligatorio 12 tester × 14 giorni (reclutarne 15). Resta in 14-produzione.
4. Magnific a lotti, tetto di crediti deciso dal proprietario prima di ogni lotto (chiedere sempre).
5. Voci: lingua inventata.
6. **Il rum resta**: la cassa cura si chiama **Rum** (+25 PV); arma 7 = **Rum incendiario**. Niente "molotov". Classificazione attesa più alta di PEGI 7 (probabile PEGI 12): la decide il questionario IARC. Aggiornare 07, 08 (`sfx_cassa_rum`), 12.
7. **Tutte le battaglie del giocatore si giocano a mano** (attacchi e difese). L'Arrembaggio rapido resta solo per IA contro IA. Nessun pulsante auto per il giocatore. Durata campagna bersaglio rivista: ~2-3 ore; Rotta breve ~1 ora. Il simulatore misura comunque le battaglie per round; leva per accorciare: vittoria a 16 territori (eventualmente 14).
8. Italiano subito, inglese prima dello Store.
9. Prove solo sul telefono del proprietario (modello da chiedere). Prestazioni tarate su quel telefono; resta la modalità qualità bassa automatica sotto 3 GB di RAM.
10. **Telefono minimo supportato: Google Pixel 6** (2021, Tensor, 8 GB RAM, GPU Mali-G78, Android 12+). Bersaglio prestazioni: 60 fps stabili in battaglia sul Pixel 6. minSdk 31 accettabile (Android 12). La modalità qualità bassa non è prioritaria.
11. **Carriera** (vedi 15-carriera.md, che prevale su 02/06/07/09/10/12/14 dove diverge): Prologo + 8 capitoli, ~13 ore. **Si gioca sempre con Scarlatta**; le altre ciurme si sbloccano battendo i boss e si usano in Mondo libero e Schermaglia.
12. **Parte gratuita: Prologo + capitolo 1.** Lo sblocco costa **1,99 €** (non 4,99) e apre capitoli 2-8, Mondo libero, Rotta breve. Aggiornare 12-business e 15 §4.
13. **Capitolo perso: si ricomincia da capo** (nessun ripristino da round precedenti). Il salvataggio a metà capitolo resta (autosalvataggio), ma la sconfitta azzera il capitolo.
14. **Bilanciamento carriera**: valgono le correzioni di 17-bilanciamento-carriera.md §7 su 15-carriera.md (limiti di round 8/10/11/12/13/13/14/18; sconfitta anticipata "Mare perduto"; "Ricomincia capitolo" nel menu pausa; avviso a 3 round dal limite; cap 8 vittoria a 14 isole e punteggio al round 18; Pappagallo postino a fine cap 2 e Palla spezzata a fine cap 3; dobloni non passano tra capitoli, cap 2 parte con 5). Durata attesa ~12,4 h.
15. **Storia della carriera**: vale 16-storia-carriera.md (con le correzioni di §14 a 07). Correzioni collegate: 10 → niente scelta della ciurma dopo il Prologo in Carriera; "Da Davy Jones!" → «Vai dai pesci!»; 08 → `sfx_arma_fiasco_rottura` diventa `sfx_arma_rum_rottura`; trigger a tempo "inizio round 4" per la scena di metà del cap. 6. In 15-carriera vale 00 §9.12-13 (gratis Prologo + cap. 1 a 1,99 €; sconfitta = da capo).
16. **Comandi di battaglia** (21/11/2026, scelta del proprietario dopo la seconda prova; sostituisce la fionda): **doppio joystick fisso**. A sinistra il joystick di movimento (cammina, salto in avanti, salto alto). A destra il joystick di mira: la direzione dà l'angolo, la distanza la potenza, il pomello resta dove lo si lascia e **non spara**; al centro il tasto **FUOCO** oro, l'unico modo di sparare. Traiettoria sempre visibile. Zoom col pinch e trascinamento della camera ovunque fuori dai joystick, come nella prima versione. Ogni tocco appartiene al controllo dove comincia. Restano ARMA, pausa, chip miccia e "Comandi classici" nelle Impostazioni. Numeri in `/mnt/project-files/design/comandi/doppio-joystick.md`. **Sostituita dal punto 19 (21/11/2026 sera).**
17. **Passata di ritmo di M1** (21/11/2026): inquadra 0,35 s, IA più svelta, ×2 sui turni IA, scossa e particelle, suoni segnaposto, traiettoria della granata con 2 rimbalzi, 3-4 barili già piazzati e casse dal turno 3 con solo Rum e Trappola già in M1.
18. **Cala Pappagallo (21/11/2026)**: la mappa dipinta a mano "Cala Pappagallo" (B1, Isola; forma in `scripts/mappe/cala-pappagallo-forma.ts`) è **l'isola di partenza del tutorial**: il Prologo (cap. 0) si gioca lì e, vinta la battaglia, Scarlatta **salpa da Cala Pappagallo** verso il primo scenario della Carriera (cap. 1 "Acque di Casa"). Resta anche selezionabile nella Schermaglia (prima Schermaglia lì, poi "Isola a caso" come predefinita). Il Prologo usa i comandi a doppio joystick (§9.16): la tabella di 10 §2 è aggiornata di conseguenza.
19. **Comandi di battaglia v3** (21/11/2026 sera, il proprietario ha bocciato il doppio joystick sul telefono: "coprono ancora la visuale, riprogettare da zero"; sostituisce il punto 16): **niente joystick**. Si mira trascinando un **mirino oro attaccato al pirata** (direzione = angolo, distanza = potenza; resta dove lo si lascia e non spara). Pochi tasti piccoli e semitrasparenti nei due angoli in basso: frecce ◀ ▶ e salto a sinistra (tocco = salto lungo, tenuto = salto alto all'indietro; ⇧ ⇩ solo vicino a scale e liane), **FUOCO** (spara al rilascio), ARMA e miccia a destra. Tutto il resto dello schermo è per trascinare la camera e per il pinch. Restano i "Comandi classici" nelle Impostazioni. Il Prologo (10 §2) va riscritto con questi comandi. Dettagli in `docs/tecnica/comandi-v3.md`.
