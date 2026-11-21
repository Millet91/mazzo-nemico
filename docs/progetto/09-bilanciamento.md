# 09 — Bilanciamento (Systems/Balance Designer)

Fonti: BRIEF, 01, 02, 03, 04. Non esiste ancora 05-revisione: le scelte qui sotto riconciliano i documenti e valgono finché il Revisore non decide diversamente. Tutti i numeri sono **valori iniziali**. Vivono in `contenuti/bilanciamento.ts` e `contenuti/armi.ts` e li conferma il simulatore (`npm run sim`).

## 0. Riconciliazioni (conflitti trovati tra i documenti)

| Tema | 01 | 02 / 04 | **Decisione** |
|---|---|---|---|
| Pirati per lato | 4 in campo + riserve illimitate | tetto 5 per territorio, attacco max 5 | **max 5 per lato: 4 in campo + 1 riserva** |
| Timer del turno | 20 s | 30 s (02), 45 s (04 M1, solo prototipo) | **20 s**; 30 s come opzione "Rilassato" e nel tutorial |
| Fine battaglia | morte improvvisa a 4:00, limite a 6:00 | morte improvvisa dopo 12 turni (02), dopo 20 (04) | **a turni** (deterministico e simulabile): il mare sale di 25 px a turno **dal turno 12**, limite al **turno 16**; poi vince chi ha più PV, a parità il difensore |
| Esito a tempo | gli attaccanti superstiti tornano a casa | il territorio resta al difensore | entrambe le cose: il difensore tiene, gli attaccanti superstiti tornano a casa |
| PV dopo la battaglia | stato "ferito" | nessuna identità, PV azzerati | **nessuna identità** (02); lo stato "ferito" si toglie |
| Ritirata | sempre, −20 PV | dal turno 4, solo l'attaccante | **dal turno 4 dell'attaccante**, senza penalità sui PV |
| Danno da caduta | oltre 90 px | oltre 60 px (04) | **90 px**, 1 PV ogni 4 px, massimo 25 |
| Pesi dell'IA | uccisione +60, annegamento +80 | uccisione +50 (04) | **quelli di 01** |
| Tratto dei Corsari del Gelo | — | +20 PV in difesa | **+10 PV**: +20 vale +29% di PV, troppo forte |
| Tratto dei Dannati della Marea | — | risorge 1 pirata a ogni vittoria | **massimo 1 volta per round**, altrimenti alimenta la valanga |
| Elenco armi | 16 armi, con Palla incatenata | 04 M2 e 03 includono il "cannone a grappolo" | entra la **Bomba a mitraglia**; la Palla incatenata va nel backlog v1.1 (comportamento perforante costoso) |

## 1. Tabella definitiva delle armi

La spinta si calcola come `danno × 7 px/s` con l'attenuazione di 01, salvo dove indicato. V = subisce il vento. Le armi si ottengono in quattro modi:
- **Base**: munizioni infinite, sempre disponibili.
- **Kit**: 1 munizione gratis in ogni battaglia.
- **Stiva**: l'arsenale della fazione (04, `Fazione.arsenale`). Si riempie in bottega, con la carta Polvere Nera o con le casse non aperte; massimo **3 munizioni per tipo**.
- **Cassa**: l'arma si trova solo nelle casse.

| # | Arma | Danno | Raggio | Spinta | Munizioni per battaglia | Come si ottiene | Milestone |
|---|---|---|---|---|---|---|---|
| 1 | Cannone a mano (V) | 45 | 55 | 315 | ∞ | Base | M2 |
| 2 | Granata di bordo (miccia 1-5 s) | 40 | 50 | 280 | ∞ | Base | M2 |
| 3 | Pistola a pietra focaia | 18 ×2 | 6 (buca) | 120 per colpo | ∞ | Base | M2 |
| 4 | Sciabola | 25 | 30 davanti | **450 fissa** a 45° | ∞ | Base | M2 |
| 5 | Barile di polvere (sostituisce anche la "dinamite" di 04) | 75 | 85 | 525 | 1 + stiva | Kit, Stiva 3 dobloni | M2 |
| 6 | Mina a conchiglia | 45 | 50 | 315 | 1 + stiva | Kit, Stiva 2 | M2 |
| 7 | Rum molotov (V) | 8 per fiamma, massimo ~32 | 6 fiamme | 40 | stiva | Stiva 2 | v1 |
| 8 | **Bomba a mitraglia** (V): esplode e lancia 5 frammenti | 20 + 5 × 15 | 30 / 25 | 140 / 105 | stiva | Stiva 3 | M2 |
| 9 | Pappagallo kamikaze | 55 | 60 | 385 | stiva | Stiva 4 | M2 |
| 10 | Scimmia con la miccia | 65 | 70 | 455 | cassa | Cassa (20% delle casse arma) | v1 |
| 11 | Ancora d'abisso | 40 | 30 | 300 verso il basso | stiva | Stiva 3 | M2 |
| 12 | Bordata del galeone (V) | 5 × 30 | 40 | 210 ciascuna | cassa | Cassa (25%) | v1 |
| 13 | Rampino | — | — | — | ∞ (3 lanci a turno) | Base | M2 |
| 14 | Vanga del bucaniere | — | — | — | ∞ | Base | M2 |
| 15 | Mappa del tesoro (teletrasporto) | — | — | — | stiva | Stiva 2 | M2 |
| 16 | Ira del Kraken | 50 | colonna di 300 | 600 verso il mare | cassa | Cassa (5%) | v1 |

Il **kit gratis** in ogni battaglia comprende Barile ×1 e Mina ×1 (01 ne regalava 7: troppi, svuotavano il senso della stiva). Il Teschio Rosso ha +10% di danno sulle armi 1, 2, 5, 6, 8, 9, 10, 12. La Marina Reale ha solo Base e Kit.

Controlli:
- Uccidere un pirata da 70 PV richiede **2 colpi Base** (45 + 40). Il Barile uccide da solo solo se esplode quasi al centro (d < 6 px).
- Nessuna arma da Stiva deve valere più di un mercenario (3 dobloni). Per questo il Pappagallo costa 4: è l'unica arma con un'uccisione quasi garantita.
- Le casse arma si ripartiscono così: armi 5-9, 11 e 15 al 40%, Bordata 25%, Scimmia 20%, Mappa 10%, Kraken 5%.

## 2. Curva della campagna

Il giocatore parte con 3 territori e 8 pirati. La vittoria arriva a 18 territori su 28. Questa è la stima per Nostromo:

| Round | Territori | Rinforzi attesi (base + regioni + capitale + carte medie) | Battaglie (giocate + auto) |
|---|---|---|---|
| 1-2 | 3 → 6 | 3 + 0 + 1 + 0 = **4** | 2 per round (contro la Marina, spesso in auto) |
| 3-5 | 6 → 9 | 3 + 0-2 + 1 + 1 = **5-7** | 2 |
| 6-9 | 9 → 13 | 3-4 + 2-5 + 1 + 1 = **7-11** | 2-3 (i primi scontri con le IA) |
| 10-14 | 13 → 18 | 4-6 + 5-7 + 1 + 1 = **11-15** | 2-3 |

Mercenari: da 0 a 2 per round, che si pagano con 6-10 dobloni a metà partita.

- **Round attesi**: 14 (intervallo bersaglio 12-18). Il limite di 25 round resta solo come rete di sicurezza.
- **Battaglie totali**: circa 30, di cui il 30-40% in auto o in difesa. Si giocano a mano **18-20 battaglie**.
- **Durata**: 19 battaglie × 4,5 min (battaglia, transizioni ed esito) ≈ 85 min, più 14 round × 1,5 min di strategia ≈ 21 min, per un totale di **~105 min**. È dentro i 60-120 min di 02, ma verso l'alto: se il simulatore supera i 110 min, la leva è la soglia di vittoria (18 → 16 territori).
- **Difese**: per default le battaglie in cui il giocatore difende si risolvono in auto con la formula **neutra**. Fanno eccezione la capitale e i territori con forte. Il pulsante "Difendi tu!" appare nella notifica.

## 3. Arrembaggio rapido: verifica e formula corretta

Ho modellato la battaglia vera con un Monte Carlo astratto: turni alternati, 1 tiro per turno, esiti mancato / colpito 35-50 / doppio / annegamento, morte improvvisa, PV a tempo. Il modello ha due varianti: **pari abilità** (IA Nostromo contro Nostromo, difensore in copertura) e **giocatore medio** (calibrato sul 55% che 01 fissa contro Nostromo nel 4 contro 4).

**Problemi della formula di 02** (`P = A²/(A²+D²)` con D × 1,2):
1. **Lotteria degli sfavoriti**. Nel 2 contro 5 l'auto dà il 10%, la battaglia vera l'1%; nel 3 contro 5 l'auto dà il 20%, la battaglia vera l'8%. Mandare 2 pirati in auto diventa una strategia.
2. **Vantaggio schiacciante a costo zero**. Nel 4 contro 1 e nel 5 contro 1 l'auto arrotonda le perdite a 0, mentre la battaglia vera ne costa circa 0,5. L'auto conviene più che combattere.
3. **La curva è sbagliata**. Nelle battaglie modellate il vantaggio numerico pesa più che con il quadrato: l'esponente che le descrive meglio è **4**, con un fattore difesa di **1,06** (errore quadratico medio 0,04). Il 5 contro 3 vero vince all'86%, coerente con l'obiettivo 75-85% di 04.

**Nuova formula**, con A = attaccanti e D = difensori efficaci:
- **P(attaccante vince) = A⁴ / (A⁴ + (m·D)⁴)**
- **Perdite attese del vincitore** = min(0,75 × perdente, 0,55 × vincitore), limitate a vincitore − 1. Chi perde perde tutto.
- **Neutra** (IA contro IA, difese del giocatore): m = **1,06**, perdite arrotondate in modo casuale con il seme (il valore atteso resta esatto).
- **Giocatore che attacca in auto**: m = **1,15**, perdite arrotondate **per eccesso**. È una "tassa di comodità" da 0,3 a 1 pirata.
- **Modificatori**:
  - forte: m × 1,25
  - Gelo in difesa: m + 0,05
  - Teschio in attacco: A × 1,05
  - carta Bordata: D × 0,65
  - in auto la stiva non si usa e non si consuma

Verifica del valore atteso dei pirati superstiti dell'attaccante (P × superstiti):

| A contro D | Vero, pari abilità | Vero, giocatore medio | Auto neutra | **Auto del giocatore** |
|---|---|---|---|---|
| 2 contro 1 | 1,44 | 1,63 | 1,16 | **0,90** |
| 3 contro 2 | 1,40 | 1,71 | 1,20 | **0,74** |
| 4 contro 2 | 2,29 | 2,69 | 2,32 | **1,80** |
| 4 contro 4 | 0,70 | 0,95 | 0,80 | **0,36** |
| 5 contro 1 | 4,43 | 4,61 | 4,24 | **3,99** |
| 5 contro 3 | 2,23 | 2,66 | 2,36 | **1,63** |
| 2 contro 5 | 0,01 | 0,02 | 0,02 | **0,01** |

Nelle 25 combinazioni da 1 a 5 per lato, l'auto del giocatore non supera **mai** né la battaglia vera a pari abilità né quella del giocatore medio. L'auto neutra resta sotto quella del giocatore medio. La lotteria e le vittorie gratis spariscono.

Prima di confermare, l'auto mostra l'anteprima: "Vittoria ~74% · perdite previste 2".

## 4. Difficoltà

| | Mozzo | Nostromo | Capitano |
|---|---|---|---|
| IA in battaglia (01 §8) | Mozzo | Nostromo | Capitano |
| Vittorie del giocatore nel 4 contro 4 | 85% | 55% | 30% |
| Traiettoria visibile | 100% | 30% | 30% |
| Rinforzi dell'IA | −1 (minimo 3) | 0 | +1 |
| L'IA attacca se il rapporto di forze è ≥ | 2,0 | 1,5 | 1,3 |
| L'IA compra in bottega | no | armi a caso | mercenari, poi armi utili |
| L'IA si coalizza contro il leader | no | sì | sì, prima |
| Campagne vinte dal giocatore (bersaglio) | 80-90% | 45-60% | 20-35% |

## 5. Valanga e rimonta

Ci sono già tre freni: il tetto di 5 pirati per territorio, la carta rinforzo fissa (+3, senza escalation alla Risiko) e il saccheggio della capitale. Si aggiungono:

1. **Rivalsa**: dal round 5, una ciurma con meno della metà dei territori del leader riceve **+2 rinforzi**.
2. **Coalizione**: se una fazione arriva a **≥ 12 territori**, le IA aumentano del 50% il punteggio degli attacchi contro di lei e non si attaccano tra loro sui confini comuni con il leader. L'evento Flotta Reale appare accanto al leader.
3. **Forziere pieno**: i dobloni hanno un tetto di **20** e la stiva di 3 munizioni per tipo. Non si accumula un tesoro per la fine.
4. **Tratto di Morgana** limitato a 1 volta per round (§0).
5. **In battaglia**: la squadra con meno del 60% dei PV dell'avversario riceve la cassa successiva nella **propria metà al 70%**, con probabilità Rum al 45%. Restano la riserva che sbarca e il pareggio a favore del difensore.
6. Il leader resta premiato: nessuna penalità diretta e vittoria anticipata a 18 territori.

## 6. Leve e metriche per il simulatore

| Leva | Valore iniziale | Metrica bersaglio |
|---|---|---|
| PV pirata | 70 | battaglia 4 contro 4: **8-14 turni**; uccisione in 2 colpi Base |
| Danno Cannone / Granata | 45 / 40 | uso di ogni arma tra il **3% e il 35%** dei tiri |
| Spinta (k) | 7 px/s per punto di danno | morti in mare **30-40%** |
| Morte improvvisa / limite | turno 12 / turno 16, +25 px | battaglie decise a tempo **< 10%**; con il mare che sale **< 25%** |
| Probabilità cassa / Rum / trappola | 50% / 30% / 15% | casse raccolte 1-3 per battaglia |
| Kit gratis | Barile 1, Mina 1 | munizioni di stiva usate per battaglia: 1-2 |
| Esponente auto / m neutro / m giocatore | 4 / 1,06 / 1,15 | errore tra auto neutra e simulazione ≤ **0,05** per combinazione; quota di battaglie in auto **25-40%** |
| Fattore perdite auto | 0,75 L e 0,55 W | perdite medie entro ±0,3 pirati dalla simulazione |
| Vantaggio numerico | — | 5 contro 3 vince il **75-85%** (04); 1 contro 1 tra pari abilità: attaccante **45-55%** |
| Rinforzi minimi / capitale | 3 / +1 | rinforzi round 1 = 4, round 10 = 10-13 |
| Soglia di vittoria | 18 territori | campagna in **12-18 round**, **95-115 min**; partite al limite dei 25 round < 5% |
| Rivalsa / Coalizione | +2 dal round 5 / 12 territori | il leader al round 6 vince il **55-70%** delle campagne; chi è indietro al round 8 vince **≥ 20%** |
| Prezzi in bottega | mercenario 3, armi 2-4, forte 8 | dobloni spesi ≥ 80% di quelli incassati; nessun acquisto > 40% della spesa |
| Bonus IA per difficoltà | −1 / 0 / +1 | vedi le campagne vinte in §4; IA Nostromo batte IA Mozzo **≥ 70%** |
| Tratti delle fazioni | §0 | nelle partite IA contro IA ogni fazione vince **20-30%** |

Comandi:
- `sim battaglie 500` genera la tabella 5×5 di P e dei superstiti che **sostituisce il modello astratto** del §3 e ricalibra m.
- `sim campagna 100` misura la curva del §2 e le metriche di valanga.

## Domande per il proprietario
1. Le difese del giocatore vanno in **auto per default**, tranne la capitale e i forti, oppure vuoi giocarle tutte? Giocarle tutte porta la campagna oltre le 2 ore.
2. Va bene la "tassa di comodità" sull'Arrembaggio rapido, cioè fino a 1 pirata in più perso rispetto a una battaglia giocata bene?
3. Va bene spostare la Palla incatenata alla v1.1 per far posto alla Bomba a mitraglia, già prevista da 03 e 04?
