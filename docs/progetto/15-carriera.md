# 15 — Carriera, mappe dei capitoli e sblocchi (Progression & Campaign Designer)

*Si basa su 00 (fonte di verità, comprese le risposte del proprietario in §9-10), 01, 02, 06, 07, 09, 10, 12. Il proprietario ha chiesto una **carriera a capitoli da 12-15 ore**, **sblocchi permanenti** guadagnati giocando e una modalità **Mondo libero**. Tutte le battaglie del giocatore si giocano a mano (00 §9.7): l'Arrembaggio rapido resta solo per IA contro IA. I numeri sono valori iniziali; vivono in `contenuti/capitoli.ts` e li conferma il simulatore (`sim capitolo N`).*

## 1. Struttura

### 1.1 Scelte di fondo

- **Prologo + 8 capitoli.** Il Prologo "Sbarco a Cala Pappagallo" di 10 diventa il **Capitolo 0**. Otto capitoli bastano per stare in 12-15 ore senza riempitivi; nove o dieci avrebbero mappe troppo piccole o ripetute.
- **I capitoli sono i mari del mondo visti "da vicino".** Ogni capitolo 1-6 è una regione di 02 ingrandita: le isole maggiori di 02 restano con il loro nome e si aggiungono isolotti nuovi (39 nomi in tutto), così ogni mare ha 8-13 isole e 2-4 regioni. Il Capitolo 7 usa esattamente la mappa della **Rotta breve** (A, D, E: 15 isole). Il Capitolo 8 è il mondo intero: le **28 Isole Spezzate**, con le regole di 00 §1.5. Il menu della carriera è la `mappa_mondo` coperta di nebbia: ogni capitolo vinto "colora" il suo mare. Un solo asset, e il giocatore vede il mondo allargarsi.
- **Si gioca sempre Scarlatta (Teschio Rosso).** La carriera è la sua storia: voce, battute e bilanciamento sono pensati per una ciurma sola. Le altre tre si **sbloccano battendo il loro capitano come boss** (cap. 2, 4, 6) e si usano in Mondo libero e Schermaglia (domanda 1).
- **Storia (coerente con 07 §2).** Scarlatta vuole il Timone dei Venti. Nei capitoli 2, 4 e 6 strappa un Raggio a ciascun rivale; nel 3 si scontra con l'Ammiraglio Ceralacca, che per la prima volta ha "il modulo firmato". Nel 7 deve tenere la Rotta centrale perché il Timone giri (07: serve tenere abbastanza isole). Vince, lo gira troppo forte (la gag del finale di Scarlatta in 07 diventa il colpo di scena): i quattro Raggi volano di nuovo nelle capitali e i mari si rimescolano nelle 28 Isole Spezzate che conosciamo. Il Capitolo 8, **"Il Gran Rimescolio"**, è la conquista vera, con i tre rivali al completo. Il Mondo libero è lo stesso mondo, dopo il rimescolio.
- **Sconfitta di capitolo**: il giocatore perde tutte le isole oppure arriva al limite di round senza aver vinto (nel cap. 7 anche se perde Porto Teschio, dove tiene i Raggi). Si riprova (domanda 3).
- **Difficoltà della carriera** (Mozzo / Nostromo / Capitano) si sceglie all'inizio e si può cambiare tra un capitolo e l'altro. Le tabelle sotto sono a **Nostromo**; Mozzo abbassa di un gradino l'IA (minimo Mozzo) e dà −1 rinforzo alle IA, Capitano alza di un gradino (massimo Capitano) e dà +1.

### 1.2 I capitoli

G = giocatore. Pirati iniziali tra parentesi. "IA batt." = livello dell'IA in battaglia (01 §8); "IA strat." = soglia d'attacco di 09 §4.

| # | Mare | Isole / regioni | Rivali | Marina | Biomi | Regole nuove | Vittoria | Limite |
|---|---|---|---|---|---|---|---|---|
| 0 | **Cala Pappagallo** (Prologo) | 1 battaglia | — | 2 marinai, Mozzo "mano morbida" | Isola | comandi, armi 1-4, vento, spinta | vincere la battaglia | — |
| 1 | **Acque di Casa** (Costa del Teschio) | 8 / 2 | nessuno | 6 isole (9), IA batt. Mozzo | Isola, Porto | turno protetto, rinforzi, attacco unito, fortificazione, bonus regione, dobloni (si accumulano) | tutte le 8 isole | 10 round |
| 2 | **Mari di Brina** | 10 / 3 | **Corsari del Gelo** (boss Barbabrina): 3 isole, 8 pirati; IA strat. Mozzo, IA batt. Mozzo (Nostromo sul Fiordo) | 5 isole (7) | + Ghiacci | rivale che attacca → **difese giocate**, **bottega** (mercenari, Stiva), Raggio nella capitale nemica | conquistare **Fiordo del Kraken** | 12 |
| 3 | **Isole Smeraldo** | 11 / 3 | nessuna ciurma: **boss Ammiraglio Ceralacca** | 9 isole (21), Bastione con **Forte** e 5 pirati; IA batt. Mozzo, Nostromo sul Bastione | + Scogliera, var. giungla | **Pergamene**, eventi del mare (Kraken, Scorbuto, Flotta Reale), Forte nemico. Regola di mare **"Il modulo è firmato!"**: a fine round la Marina attacca 1 isola del giocatore confinante, se ha rapporto ≥ 1,5 | conquistare il **Bastione di Ceralacca** | 12 |
| 4 | **Arcipelago d'Oro** | 12 / 3 | **Fratellanza dell'Oro** (boss Dobloncino): 3 isole, 8 pirati, +6 dobloni; IA strat. Mozzo, IA batt. Nostromo | 7 isole (13), Mozzo | + Grotta, var. oro | tutti e 6 gli eventi (Galeone del Tesoro garantito al round 3), **Forte in bottega**, saccheggio della capitale | conquistare il **Mercato dei Ladri** | 14 |
| 5 | **Isole del Sole** | 13 / 4 | **Gelo + Oro** (rivincita, 8+8 pirati), IA strat. Nostromo, IA batt. Nostromo | 5 isole (10), Nostromo | var. rovine e tempesta (vento ±10) | **due rivali** che si attaccano anche tra loro, **Rivalsa**, rivalità di 07 | **9 isole** oppure le 2 capitali | 15 |
| 6 | **Mare delle Ossa** | 13 / 4 | **Dannati della Marea** (boss Morgana, 8 pirati) + Gelo (6); IA Nostromo, **Capitano** sul Cimitero | 6 isole (12) | + Cimitero, var. ossa | tratto di Morgana (risorge 1 pirata a round), "Vecchi lupi" (Gelo e Marea −20% di priorità tra loro), Marea alta con peso doppio | conquistare il **Cimitero di Galeoni** | 15 |
| 7 | **La Rotta dei Raggi** (= Rotta breve) | 15 / 3 | **Oro + Marea**, setup di 00 (8 pirati ciascuno), IA Nostromo, Capitano nelle capitali | 6 isole, 1-3 pirati | tutti | regole complete di 00; **Porto Teschio custodisce i Raggi** (se cade, capitolo perso) | **10 isole** oppure le 2 capitali | 18 |
| 8 | **Il Gran Rimescolio** (Isole Spezzate) | 28 / 6 | **tutti e tre**, setup e regole di 00 §1.5, **Coalizione** a 12 isole; IA Nostromo, Capitano nelle capitali | 16 isole, 1-3 pirati | tutti | nessuna: è la partita completa | **16 isole** oppure tutte le capitali | 25 (punti) |

Partenza del giocatore: 2 isole (4 + 2 pirati) nei cap. 1-4; 2 isole (4 + 3) nel 5 e (4 + 2) nel 6; nel 7 e nell'8 il setup di 00 (capitale 4 + 2 isole da 2). Dobloni iniziali: 0, 0, 3, 3, 5, 5, 5, 0.

### 1.3 Stelle (obiettivi facoltativi)

★ = vincere il capitolo. Le altre due sono facoltative; contano il miglior risultato e si possono prendere rigiocando un capitolo già vinto, a qualsiasi difficoltà.

| Cap. | ★★ | ★★★ |
|---|---|---|
| 1 | vincere entro il round 6 | spingere in mare 3 nemici in tutto il capitolo |
| 2 | non perdere nessuna isola | prendere il Fiordo con ≥ 3 superstiti |
| 3 | conquistare tutte le 11 isole | nessuna ritirata nel capitolo |
| 4 | prendere il Galeone del Tesoro | finire con ≥ 15 dobloni |
| 5 | vincere prendendo le 2 capitali | vincere entro il round 11 |
| 6 | Morgana riporta in vita al massimo 2 pirati | non perdere nessuna isola |
| 7 | vincere prendendo le 2 capitali | nessuna battaglia persa in difesa |
| 8 | vincere entro il round 16 | vincere a difficoltà Capitano |

24 stelle in tutto.

### 1.4 Il conto delle ore

Una battaglia dura 3-5 min; con preparazione, esito e animazioni vale **5 min** di media (4-6). Un round di strategia (rinforzi, scelte, turni IA a ×2) vale **1,5 min**; le scene di 07 circa 3 min per capitolo (5 nell'8). Le battaglie comprendono conquiste, **difese** (tutte giocate) e sconfitte.

| Cap. | Battaglie | Round | Minuti (battaglie + strategia + scene) | Prob. di perdere il capitolo | Minuti di riprova attesi* |
|---|---|---|---|---|---|
| 0 | 1 | — | 6 | 0 | 0 |
| 1 | 7 | 5 | 35 + 7,5 + 3 = **45** | 5% | 1 |
| 2 | 10 | 7 | 50 + 10,5 + 3 = **64** | 10% | 4 |
| 3 | 11 | 8 | 55 + 12 + 3 = **70** | 10% | 4 |
| 4 | 12 | 9 | 60 + 13,5 + 3 = **77** | 15% | 7 |
| 5 | 14 | 10 | 70 + 15 + 3 = **88** | 20% | 11 |
| 6 | 15 | 10 | 75 + 15 + 3 = **93** | 25% | 16 |
| 7 | 14 | 10 | 70 + 15 + 3 = **88** | 30% | 19 |
| 8 | 26 | 14 | 130 + 21 + 5 = **156** | 30% | 33 |
| **Totale** | **110** | 73 | **687 min** | | **95 min** |

\*Riprova attesa = p/(1−p) × metà del capitolo.

**Totale ≈ 782 min ≈ 13 ore** (fascia 11-15 h: 11 con battaglie da 4 min effettivi e nessuna sconfitta, 15 con battaglie da 6). Le stelle facoltative aggiungono 2-3 ore per chi le vuole tutte. Leve se il simulatore esce dalla fascia: soglie di vittoria dei cap. 5 e 7 (±1 isola), soglia del cap. 8 (16 → 14, già prevista in 00 §9.7), limite di round. La parte gratuita (cap. 0-2) dura **~2 ore**.

## 2. Mappe dei capitoli

Il Prologo è una battaglia singola su mappa a mano (00 §2.2). Il Capitolo 7 usa le 21 rotte di 02 tra A, D ed E: A1-A2, A1-A3, A1-A4, A2-A4, A3-A5, A4-A5, A4-D1, A5-D3, D1-D2, D1-D3, D2-D3, D2-D5, D3-D4, D4-D5, D4-E2, E1-E2, E1-E3, E2-E3, E2-E5, E3-E4, E4-E5. Il Capitolo 8 usa le 47 rotte di 02 §1 senza modifiche.

**Verifica.** Tutte le mappe (cap. 1-8 e la lista di 02) sono state controllate con uno script Python: rotte **bidirezionali**, ogni mappa **connessa**, le regioni sono una partizione esatta delle isole, nessun nome ripetuto (né dentro un capitolo né tra i 39 isolotti nuovi), grado minimo 2. Risultato: tutto in regola. Conteggi: cap. 1 12 rotte, 2: 15, 3: 18, 4: 19, 5: 21, 6: 21, 7: 21, 8: 47.

Partenze (a Nostromo): **G** giocatore, **Ge** Gelo, **O** Oro, **Ma** Marea, il resto Marina.
- Cap. 1: G 1A (4), 1B (2) · Marina 1C 2, 1D 1, 1E 2, 1F 2, 1G 1, 1H 1.
- Cap. 2: G 2A (4), 2B (2) · Ge 2H (4), 2I (2), 2J (2) · Marina 2C 1, 2D 2, 2E 2, 2F 1, 2G 1.
- Cap. 3: G 3A (4), 3B (2) · Marina 3C 1, 3D 2, 3E 2, 3F 1, 3G 2, 3H 2, 3I 3, 3J 3, **3K 5 + Forte**.
- Cap. 4: G 4A (4), 4C (2) · O 4I (4), 4J (2), 4K (2) · Marina 4B 2, 4D 1, 4E 2, 4F 3, 4G 2, 4H 1, 4L 2. Galeone del Tesoro su 4G al round 3.
- Cap. 5: G 5I (4), 5H (3) · Ge 5A (4), 5B (2), 5C (2) · O 5D (4), 5E (2), 5F (2) · Marina 5G 2, 5J 2, 5K 3, 5L 1, 5M 2.
- Cap. 6: G 6C (4), 6B (2) · Ma 6G (4), 6H (2), 6I (2) · Ge 6L (4), 6M (2) · Marina 6A 2, 6D 2, 6E 1, 6F 2, 6J 2, 6K 3.

Le capitali boss sono a 2-3 rotte dalla partenza del giocatore: mai adiacenti al primo round.

Adiacenze complete (ogni rotta compare in entrambe le isole):

**Cap. 1 — Acque di Casa** (8 isole, 12 rotte, 2 tra regioni)

- *Costa del Teschio (+2)*
  - 1A Porto Teschio (A1): 1B, 1C, 1E
  - 1B Baia dei Corvi (A2): 1A, 1C, 1D
  - 1C Forte Uncino (A4): 1A, 1B, 1D, 1F
  - 1D Scoglio della Vedetta: 1B, 1C
- *Lagune (+2)*
  - 1E Scogli del Rum (A3): 1A, 1F, 1G, 1H
  - 1F Laguna Nera (A5): 1C, 1E, 1G
  - 1G Secca del Barile: 1E, 1F, 1H
  - 1H Isolotto delle Cozze: 1E, 1G

**Cap. 2 — Mari di Brina** (10 isole, 15 rotte, 5 tra regioni)

- *Bassa Brina (+2)*
  - 2A Approdo del Corvo: 2B, 2C
  - 2B Punta Ghiacciolo (C1): 2A, 2C, 2D
  - 2C Scoglio di Bottone: 2A, 2B, 2F
- *Banchise (+2)*
  - 2D Faro Spento (C3): 2B, 2E, 2F, 2J
  - 2E Banchisa dei Lupi (C4): 2D, 2G, 2H
  - 2F Iceberg Storto: 2C, 2D, 2G
  - 2G Lago Brinato: 2E, 2F, 2I
- *Fiordo (+2)*
  - 2H Fiordo del Kraken (C2): 2E, 2I, 2J
  - 2I Grotta del Tricheco: 2G, 2H, 2J
  - 2J Canale Gelato: 2D, 2H, 2I

**Cap. 3 — Isole Smeraldo** (11 isole, 18 rotte, 7 tra regioni)

- *Costa dei Pappagalli (+2)*
  - 3A Cala Pappagallo (B1): 3B, 3C, 3D
  - 3B Spiaggia del Naufrago (B4): 3A, 3C, 3D, 3H
  - 3C Isola delle Scimmie: 3A, 3B, 3F
- *Giungla (+3)*
  - 3D Giungla dei Tamburi (B2): 3A, 3B, 3E, 3F, 3H
  - 3E Cascata Smeraldina: 3D, 3G, 3J
  - 3F Palude delle Rane: 3C, 3D, 3G
  - 3G Laguna di Smeraldo: 3E, 3F, 3I
- *Vulcano (+3)*
  - 3H Vulcano Brontolone (B3): 3B, 3D, 3I, 3J
  - 3I Molo del Timbro: 3G, 3H, 3K
  - 3J Archivio dei Moduli: 3E, 3H, 3K
  - 3K Bastione di Ceralacca: 3I, 3J

**Cap. 4 — Arcipelago d'Oro** (12 isole, 19 rotte, 6 tra regioni)

- *Banchine (+2)*
  - 4A Approdo Smeraldo: 4B, 4C, 4D
  - 4B Isola del Tesoro (D1): 4A, 4C, 4E, 4I
  - 4C Baia degli Spiccioli: 4A, 4B, 4D
  - 4D Lido del Resto: 4A, 4C, 4K
- *Zecca (+3)*
  - 4E Zecca Clandestina (D2): 4B, 4F, 4G, 4I
  - 4F Torre del Governatore (D5): 4E, 4H, 4J
  - 4G Isola della Cassaforte: 4E, 4H
  - 4H Faro del Pegno: 4F, 4G, 4L
- *Mercato (+3)*
  - 4I Mercato dei Ladri (D3): 4B, 4E, 4J, 4K
  - 4J Molo dei Dobloni (D4): 4F, 4I, 4L
  - 4K Banchina dello Sconto: 4D, 4I, 4L
  - 4L Scoglio del Pedaggio: 4H, 4J, 4K

**Cap. 5 — Isole del Sole** (13 isole, 21 rotte, 8 tra regioni)

- *Dune (+2)*
  - 5A Duna del Cannone (F1): 5B, 5C, 5D, 5G
  - 5B Dune Gemelle: 5A, 5C, 5E
  - 5C Spiaggia Rovente: 5A, 5B, 5H
- *Oasi (+2)*
  - 5D Oasi dei Contrabbandieri (F2): 5A, 5E, 5F, 5J
  - 5E Pozzo dei Venti: 5B, 5D, 5F
  - 5F Porto Sabbia: 5D, 5E, 5G
- *Rovine (+2)*
  - 5G Tempio Sommerso (F3): 5A, 5F, 5H, 5I, 5K
  - 5H Sfinge Sbadigliante: 5C, 5G, 5I
  - 5I Arco del Sole: 5G, 5H, 5L
- *Capo (+3)*
  - 5J Rocca Scorpione (F4): 5D, 5K, 5L
  - 5K Capo Tempesta (F5): 5G, 5J, 5M
  - 5L Scoglio dei Cammelli: 5I, 5J, 5M
  - 5M Faro del Miraggio: 5K, 5L

**Cap. 6 — Mare delle Ossa** (13 isole, 21 rotte, 8 tra regioni)

- *Relitti (+2)*
  - 6A Relitto Fantasma (E1): 6B, 6C, 6D, 6G
  - 6B Nave Capovolta: 6A, 6C, 6E
  - 6C Costole di Balena: 6A, 6B
- *Gorgo (+2)*
  - 6D Gorgo del Diavolo (E2): 6A, 6E, 6F, 6G, 6K
  - 6E Secca dei Sospiri: 6B, 6D, 6F
  - 6F Fossa dell'Eco: 6D, 6E, 6L
- *Cimitero (+2)*
  - 6G Cimitero di Galeoni (E3): 6A, 6D, 6H, 6I, 6J
  - 6H Faro delle Lanterne Verdi: 6G, 6I
  - 6I Banco delle Alghe: 6G, 6H, 6M
- *Forca (+3)*
  - 6J Isola Sirena (E4): 6G, 6K, 6M
  - 6K Scoglio della Forca (E5): 6D, 6J, 6L
  - 6L Rompighiaccio Arenato: 6F, 6K, 6M
  - 6M Scoglio del Granchio Eremita: 6I, 6J, 6L

**Biomi delle isole dei capitoli.** Le isole di 02 tengono il bioma di 06 §3 se è già sbloccato, altrimenti usano il bioma di riserva (Scogliera → Isola, Grotta → Scogliera, Cimitero → Porto, Ghiacci → Isola). Gli isolotti nuovi prendono il bioma nuovo del capitolo per almeno metà delle isole, così il bioma appena sbloccato si gioca subito (per esempio, nel cap. 2 tutti gli isolotti sono Ghiacci). L'assegnazione isola per isola sta in `contenuti/capitoli.ts`, seme fisso per capitolo.

## 3. Curva di difficoltà

| Cap. | Isole | Rivali | Pirati G / nemici al via | IA battaglia | IA strategia (soglia, rinforzi IA) | Eventi a round | Timer |
|---|---|---|---|---|---|---|---|
| 0 | — | 0 | 2 / 2 | Mozzo morbida | — | — | spento |
| 1 | 8 | 0 | 6 / 9 | Mozzo | Marina ferma | 0% | 30 s nelle prime 2, poi 20 |
| 2 | 10 | 1 | 6 / 15 | Mozzo (Nostromo boss) | 2,0, −1, max 1 attacco a round su G | 0% | 20 s |
| 3 | 11 | boss Marina | 6 / 21 | Mozzo (Nostromo boss) | Marina: 1 contrattacco a round | 20% | 20 s |
| 4 | 12 | 1 | 6 / 21 | Nostromo (Marina Mozzo) | 2,0, −1 | 30% | 20 s |
| 5 | 13 | 2 | 7 / 26 | Nostromo | 1,5, 0 | 30% | 20 s |
| 6 | 13 | 2 | 6 / 26 | Nostromo (Capitano boss) | 1,5, 0 | 40% | 20 s |
| 7 | 15 | 2 | 8 / ~28 | Nostromo (Capitano capitali) | 1,5, 0 | 30% | 20 s |
| 8 | 28 | 3 | 8 / ~56 | Nostromo (Capitano capitali) | 1,5, 0, Coalizione | 30% | 20 s |

Come cresce:
- **Dimensione**: da 8 a 15 isole in sette capitoli, poi il salto a 28 nel finale.
- **Rivali**: 0 → 1 → 2 → 3. Tra un rivale nuovo e l'altro c'è un capitolo "di respiro" con una regola nuova al posto di un rivale nuovo (cap. 3 Marina che contrattacca, cap. 5 due rivali già conosciuti).
- **IA**: in battaglia sale da Mozzo a Nostromo al cap. 4; il livello Capitano compare solo nelle battaglie boss e nelle capitali. In strategia la soglia scende da 2,0 a 1,5 al cap. 5.
- **Risorse**: il giocatore parte sempre con 6-8 pirati; i nemici passano da 9 a 56. Il rapporto peggiora da 1:1,5 a 1:7, compensato dalle regioni più ricche e dalle armi sbloccate.
- **Eventi**: 0% nei cap. 1-2, poi 20-40%.
- **Bersagli per il simulatore** (vittoria del capitolo a Nostromo, giocatore medio): 95, 90, 90, 85, 80, 75, 70, 70%. Fuori di oltre 10 punti → si tocca prima la soglia di vittoria, poi i pirati della Marina.

## 4. Sblocchi permanenti

Si guadagnano **solo giocando**, restano per sempre nel **profilo** (separato dai 3 slot) e valgono in tutte le modalità. Ogni sblocco si annuncia a fine capitolo con la schermata "Nuovo nella stiva!". Nessun acquisto sblocca armi, ciurme, biomi o regole (12: niente pay-to-win).

| Completando | Armi (16) | Ciurme | Biomi e varianti | Strategia | Cosmetici | Modalità |
|---|---|---|---|---|---|---|
| (inizio) | **1 Cannone, 2 Granata, 3 Pistola, 4 Sciabola** | Teschio Rosso | Isola | — | lapide Barilotto col cappello | Schermaglia |
| Cap. 0 | 5 Barile, 6 Mina (Kit), 14 Vanga | | Porto | turno protetto | | |
| Cap. 1 | 13 Rampino, 11 Ancora d'abisso | | Ghiacci | bottega (mercenari, Stiva) | bandiera Teschio fumante | |
| Cap. 2 | 8 Palla spezzata, 15 Bussola stregata | **Corsari del Gelo** | Scogliera, var. giungla | Pergamene, 3 eventi | cappello Berretto di Bottone | **Mondo libero** |
| Cap. 3 | 9 Pappagallo postino, 10 Scimmia (cassa) | | Grotta, var. oro | **Forte**, tutti gli eventi | lapide Timbro di Ceralacca | |
| Cap. 4 | 7 Rum incendiario, 12 Bordata (cassa) | **Fratellanza dell'Oro** | var. rovine e tempesta | Rivalsa | esplosione Monete d'oro | |
| Cap. 5 | 16 Ira del Kraken (cassa) | | Cimitero, var. ossa | | bandiera Sole nero | |
| Cap. 6 | — | **Dannati della Marea** | — | | lapide Bottiglia col messaggio | |
| Cap. 7 | — | | — | Coalizione | cappello Corona di conchiglie | **Rotta breve** (preset del Mondo libero) |
| Cap. 8 | — | | — | | bandiera Timone dei Venti, titolo "Leggenda dei Cento Venti" | opzioni avanzate del Mondo libero (rivali 1-3, soglia, seme) |

Conti: 4 + 3 + 2 + 2 + 2 + 2 + 1 = **16 armi**, tutte entro il cap. 5. Le 4 armi v1 (7, 10, 12, 16) arrivano nei cap. 3-5, quindi M2 può partire con le 12 armi di 00 §1.3. **4 ciurme** (la Marina resta non giocabile, 12 §4). **6 biomi** e 5 varianti entro il cap. 5. Le armi di Cassa escono dalle casse solo se sbloccate: i pesi di 09 §1 si rinormalizzano sulle armi disponibili.

**Stelle.** 3★ lapide Forziere · 6★ bandiera Rosa dei venti · 9★ cappello Tricorno piumato · 12★ esplosione Coriandoli · 15★ Schermaglia **"Regole pazze"** (solo casse, vento ±10, Marea alta fissa) · 18★ esplosione Inchiostro di seppia · 21★ cappello Elmo vichingo · 24★ bandiera Teschio di cristallo. Le stelle danno solo cosmetici e varianti di Schermaglia: niente che serva per finire la carriera.

**Mondo libero** dà altri cosmetici: una "bandiera veterana" per ogni ciurma con cui si vince, più la bandiera d'oro vincendo a Capitano (l'esempio di 12 §3).

**Confine gratuito (quando ci sarà lo sblocco a 4,99 €).** Gratis: **Prologo e capitoli 1-2** (~2 ore, con il primo boss e il Gelo sbloccato) e la Schermaglia con quello che si è sbloccato. Con lo sblocco: **capitoli 3-8, Mondo libero, Rotta breve**. Fino alla pubblicazione per tutti la versione è completa e gratuita (00 §9.2). Per il test chiuso serve un interruttore di sviluppo "sblocca tutto" nel profilo.

## 5. Mondo libero e Schermaglia

**Mondo libero** (si sblocca col cap. 2): le 28 Isole Spezzate, 1 umano contro 3 IA, regole di 00 §1.5. Si sceglie la ciurma **tra quelle sbloccate**; i tre rivali sono sempre le altre tre ciurme, anche se non sono ancora giocabili. Dagli sblocchi usa:
- **armi**: lo stesso arsenale per tutti (giocatore e IA), cioè solo le armi sbloccate, in bottega e nelle casse;
- **biomi**: quelli sbloccati, gli altri con il bioma di riserva di §2;
- **regole**: Pergamene, eventi, Forte, Rivalsa e Coalizione solo se sbloccati. Il Mondo libero preso presto è più semplice e cresce con il giocatore;
- **Rotta breve** (dopo il cap. 7): A-D-E, 2 rivali, 10 isole, come 00 §1.5;
- **cosmetici**: tutti quelli guadagnati.
Gli sblocchi progressivi "dal round 4" di 00 §1.5 non servono più: chi arriva al Mondo libero le regole le conosce già dalla carriera.

**Schermaglia** (sempre disponibile): bioma e variante tra quelli sbloccati, 1-5 pirati per lato, livello IA, ciurma del giocatore tra quelle sbloccate (l'avversario può essere qualunque ciurma o la Marina), armi sbloccate, "Regole pazze" a 15★. Il tratto di ciurma vale anche qui.

## 6. Impatto sugli altri documenti

**00 Decisioni**
- §1.5 *Sblocchi progressivi*: sostituiti da questo documento (sblocchi per capitolo). Il turno protetto resta, nel round 1 del cap. 1.
- §1.5 *Modalità v1*: **Carriera** (Prologo + 8 capitoli), **Mondo libero** (l'ex "Campagna"), **Rotta breve** (preset del Mondo libero e mappa del cap. 7), **Schermaglia**.
- §1.5 *Vittoria*: invariata (16 isole). Diventa la regola del cap. 8 e del Mondo libero.
- §1.3: disponibilità delle armi filtrata dal profilo (anche le Base 13 e 14).
- §2.2: biomi sbloccabili con il bioma di riserva. Nessuna mappa a mano nuova.
- §5: aggiungere le metriche per capitolo (§1.4 e §3 di qui).
- Nuovo: **profilo** (sblocchi, stelle, cosmetici) salvato a parte, 2 copie con checksum.

**02 Mondo e strategia**
- §1: rimando a 15 §2 per i mari dei capitoli e i 39 isolotti.
- §2: in Mondo libero la ciurma si sceglie tra le sbloccate.
- §8: Carriera, Mondo libero, Rotta breve, Schermaglia.
- §5: Pergamene ed eventi esistono solo se sbloccati. La regola "Il modulo è firmato!" (la Marina contrattacca) vale solo nel cap. 3.

**06 Livelli**
- §3: aggiungere il bioma di riserva e la regola per gli isolotti (§2 di qui).
- §6: le mappe firma del lotto 2 cadono sulle battaglie boss: C2 (cap. 2), E3 (cap. 6), A1 (cap. 7-8). D3 resta a seme fisso, usato nel cap. 4.
- Il Bastione di Ceralacca usa il Forte di §5.

**07 Narrativa**
- Nuova sezione "Carriera": 3 scene per capitolo (apertura, boss, chiusura) più il colpo di scena del **Gran Rimescolio**, in tutto circa 27 scene da 2-3 fumetti.
- Il finale di Scarlatta di §5 si sposta alla fine del cap. 7; il cap. 8 ha un finale nuovo ("questa volta lo gira piano").
- Scene di "ingaggio" dei boss sconfitti (la ciurma diventa giocabile).
- Ceralacca ha un ruolo vero nel cap. 3.
- I 39 nomi degli isolotti vanno nel file di stringhe.
- I 4 momenti per ciurma restano per il Mondo libero; "Metà" a 8 isole.

**09 Bilanciamento**
- Aggiungere la curva per capitolo (§3) e `sim capitolo N` con le percentuali di vittoria bersaglio.
- §1: la metrica "uso delle armi 3-35%" si misura con l'arsenale completo; le casse si rinormalizzano sulle armi sbloccate.
- §2: la curva della campagna vale per il cap. 8 e il Mondo libero, tutte giocate a mano (~26 battaglie, ~2,6 h).

**10 Onboarding**
- Prologo = Capitolo 0. Dopo il Prologo non c'è la scelta della ciurma: si entra nel cap. 1 con Scarlatta.
- "Regole insegnate più avanti": l'aggancio passa dal "round 4" ai capitoli (bottega cap. 2, Pergamene ed eventi cap. 3, Forte cap. 4, due rivali cap. 5).
- §4 flusso: Menu → Carriera (mappa dei mari con la nebbia) / Mondo libero / Schermaglia. Schermate nuove: **mappa dei capitoli** con stelle, **"Nuovo nella stiva!"**, **Profilo e cosmetici**, sconfitta del capitolo con "Riprova".
- "Ho già giocato": si salta il Prologo, ma si entra comunque nel cap. 1.

**12 Business**
- Parte gratuita: **Prologo + cap. 1-2 + Schermaglia** con gli sblocchi raggiunti (non più la Rotta breve).
- Il tasto "Sblocca" compare in 3 punti: menu, fine del cap. 2, Mondo libero nel menu.
- Valore dello sblocco: 6 capitoli, Mondo libero e Rotta breve, circa 11 ore.
- I cosmetici gratuiti si guadagnano in carriera e con le stelle (§4). Gli eventuali pacchetti a pagamento dopo la 1.0 restano solo estetici, e ogni categoria ha sempre versioni ottenibili giocando.

**14 Produzione**
- M3: `contenuti/capitoli.ts` (8 mappe, partenze, regole, stelle), profilo degli sblocchi, `sim capitolo`. Mondo libero = la campagna già prevista.
- M4: battaglie boss e biomi di riserva.
- M5: mappa dei capitoli, schermate di sblocco, scene di 07.
- Stima: **+2-3 sessioni** in tutto.
- Test chiuso: con 12-15 ore di gioco, ai tester chiedere almeno i cap. 0-3 e l'interruttore "sblocca tutto" per il resto.

Toccano anche **03** (schermate nuove, `mappa_mondo` con nebbia per regione), **04** (tipi `Capitolo` e `Profilo`) e **13** (casi: profilo corrotto, sblocco che non si perde, filtro armi in casse e bottega).

## 7. Domande per il proprietario

1. **Ciurma in carriera.** (a) **Sempre Scarlatta; le altre si sbloccano per Mondo libero e Schermaglia** — *consigliata*: una storia sola, bilanciamento più semplice. (b) Scelta libera tra le ciurme sbloccate, con gli stessi capitoli. (c) Come (a), più una "Carriera+" con un'altra ciurma dopo il finale (lavoro in più per testi e bilanciamento).
2. **Confine gratuito** (per quando ci sarà lo sblocco a 4,99 €). (a) **Prologo + cap. 1-2, circa 2 ore, con il primo boss** — *consigliata*. (b) Solo Prologo + cap. 1 (circa 50 min). (c) Fino al cap. 3 (circa 3 ore).
3. **Se si perde un capitolo.** (a) **"Riprova": si ricomincia il capitolo oppure si riparte dall'inizio di uno degli ultimi 3 round** — *consigliata*: poca frustrazione, servono solo 3 piccoli salvataggi in più. (b) Si ricomincia solo da capo. (c) Non si perde mai: al limite dei round si vince ai punti con 1 sola stella.
