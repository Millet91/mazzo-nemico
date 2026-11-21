# 17 — Bilanciamento della carriera (Systems/Balance Designer)

*Si basa su 00 (fonte di verità, §9 punti 1-13), 15-carriera e 09. Tiene conto delle tre risposte nuove del proprietario: **tutte le battaglie del giocatore a mano** (§9.7), **capitolo perso = si ricomincia da capo** (§9.13), **parte gratuita = Prologo + cap. 1, sblocco 1,99 €** (§9.12). Niente checkpoint a metà capitolo: il proprietario non li vuole. I conti sono fatti con uno script Python (`/tmp/kab/carriera.py` e `/tmp/kab/b.py`); i numeri sono valori iniziali e li conferma `sim capitolo N`.*

## 1. Il problema: la formula di riprova di 15 non vale più

15 §1.4 stima la riprova come `p/(1−p) × metà capitolo`, cioè "si riparte da qualche round prima". Con la regola "da capo" un tentativo fallito costa **tutto il tempo giocato fino alla sconfitta**, e le sconfitte arrivano tardi: o si arriva al **limite di round** (che è più lungo di una vittoria media) o si viene travolti a metà-fine capitolo. Il modello corretto:

- tentativo fallito = L × (limite di round × minuti per round) + (1 − L) × 0,5-0,6 × capitolo, dove L è la quota di sconfitte "al limite";
- minuti persi attesi = Σ sui tentativi falliti, con la probabilità di vittoria che sale di **+10 punti a ogni riprova** (il giocatore conosce la mappa); le scene sono saltabili alla riprova.

**Risultato con i numeri attuali di 15** (battaglia 5 min, round 1,5 min):

| Cap. | Vittoria (min) | Tentativo fallito | Riprova attesa: 15 diceva | **Riprova vera** |
|---|---|---|---|---|
| 1 | 45 | 67 | 1 | 3,5 |
| 2 | 64 | 77 | 4 | 8 |
| 3 | 70 | 76 | 4 | 8 |
| 4 | 77 | 79 | 7 | 12,5 |
| 5 | 88 | 89 | 11 | 20 |
| 6 | 93 | 95 | 16 | 27 |
| 7 | 88 | 92 | 19 | 34 |
| 8 | 156 | 162 | 33 | 59 |
| **Totale** | **686** | | **95** | **172** |

Totale **14,3 h** (14,7 senza apprendimento): dentro 12-15, ma sul bordo. Con battaglie da 6 min e nessun apprendimento si va a **17,1 h**: **si sfora**. Peggio ancora della media è la varianza: un giocatore su tre perde il cap. 8 almeno una volta e butta **2 ore e 40** in un colpo solo; la probabilità di finire la carriera senza perdere nessun capitolo è il **19%**. Il tentativo fallito costa più della vittoria perché i limiti di round (10-25) sono molto più larghi dei round attesi (5-14): chi si impantana gioca fino al limite.

## 2. Leve (senza checkpoint)

1. **Limiti di round stretti**: circa round attesi × 1,3-1,4. Nuovi limiti: **8, 10, 11, 12, 13, 13, 14, 18** (cap. 1-8). È la leva più forte: taglia il tentativo fallito di circa il 25%.
2. **"Mare perduto" (sconfitta anticipata)**: a inizio round del giocatore, se ha 1 sola isola e meno di un quarto dei pirati del rivale più forte (o se ha perso la capitale nel cap. 7), il capitolo finisce subito. Niente partite trascinate già perse.
3. **"Ricomincia capitolo" nel menu di pausa**, sempre disponibile, con conferma. È coerente con "da capo" e lascia al giocatore la scelta di non sprecare tempo.
4. **Avviso a 3 round dal limite** sulla mappa ("La marea cambia tra 3 round!"), così le sconfitte al limite non arrivano a sorpresa.
5. **Curva di vittoria più alta e più piatta** (§3): con la regola "da capo" ogni punto di sconfitta costa il doppio.
6. **Cap. 8 più corto**: vittoria a **14 isole** (la leva già prevista da 00 §9.7; il Mondo libero resta a 16), limite e conteggio dei punti al **round 18** invece del 25. Battaglie attese 26 → 22, round 14 → 12.

Se il simulatore sfora ancora, l'ordine è: limite di round (−1), soglia di vittoria dei cap. 5, 7, 8 (−1 isola), pirati della Marina (−1 sulle isole più grosse), e solo alla fine un isolotto in meno per capitolo.

**Risultato con le leve** (stessa ipotesi di apprendimento):

| Cap. | Battaglie | Round | Limite | Vittoria (min) | Tentativo fallito | Riprova attesa | Totale |
|---|---|---|---|---|---|---|---|
| 0 | 1 | — | — | 5 | — | 0 | 5 |
| 1 | 7 | 5 | 8 | 45 | 45 | 2 | 48 |
| 2 | 10 | 7 | 10 | 64 | 58 | 5 | 68 |
| 3 | 11 | 8 | 11 | 70 | 63 | 6,5 | 76 |
| 4 | 12 | 9 | 12 | 77 | 61 | 8 | 85 |
| 5 | 14 | 10 | 13 | 88 | 70 | 11 | 99 |
| 6 | 15 | 10 | 13 | 93 | 74 | 14 | 107 |
| 7 | 14 | 10 | 14 | 88 | 65 | 14 | 102 |
| 8 | 22 | 12 | 18 | 133 | 102 | 23 | 156 |
| **Totale** | **106** | 71 | | **662** | | **84** | **747 min = 12,4 h** |

Fascia: **10,4 h** con battaglie da 4 min, **12,4 h** a 5 min, **14,4 h** a 6 min. Si esce sotto 12 solo con battaglie molto rapide (carriera più corta, non frustrante). Riprove attese in tutta la carriera: 1,3 (prima 1,9). Nessun capitolo perso: 31% dei giocatori (prima 19%).

**Parte gratuita** (Prologo + cap. 1): **~53 min** con le riprove. Lo sblocco a 1,99 € apre ~11,5 h.

## 3. Curva di vittoria per capitolo

Probabilità di vincere il capitolo **al primo tentativo**, giocatore medio, a Nostromo (in 15 era 95/90/90/85/80/75/70/70):

| Cap. | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| **Nostromo** | 95 | 92 | 90 | 87 | 85 | 82 | 80 | 80 |
| Mozzo | 99 | 97 | 96 | 95 | 93 | 92 | 90 | 90 |
| Capitano | 85 | 75 | 70 | 65 | 60 | 55 | 50 | 50 |
| Sconfitte al limite (max) | 50% | 50% | 50% | 40% | 40% | 40% | 30% | 30% |

La difficoltà cresce con regole e rivali, non con il rischio di perdere tutto; il cap. 8, il più costoso da rifare, non scende sotto il 7. Tolleranza ±5 punti (non ±10 come in 15): fuori tolleranza si tocca prima la soglia di vittoria, poi i pirati della Marina.

## 4. Sblocchi armi e biomi: coerenza con quando servono

Ho controllato ogni sblocco contro il capitolo che lo usa. Biomi e regole sono già in ordine (ogni bioma si sblocca alla fine del capitolo prima di quello che lo usa). Due problemi sulle armi:

- **Il Bastione di Ceralacca (cap. 3) ha il Forte** (ferro e roccia), ma il **Pappagallo postino**, l'arma pilotata che scavalca i muri, arriva solo finendo il cap. 3. **Correzione: Pappagallo postino (9) alla fine del cap. 2, Palla spezzata (8) alla fine del cap. 3.** La Bussola stregata (15) resta al cap. 2: con Pappagallo e Bussola il Forte si affronta in due modi diversi.
- **Bottega del cap. 2**: oggi vende solo Barile, Mina e Ancora; con lo spostamento entra anche il Pappagallo (4 dobloni), un acquisto che si desidera.

Il resto è coerente: Rampino (cap. 1) per i Ghiacci, Vanga per la Grotta (dove Bordata e Ancora sono spente), armi v1 dopo i cap. 3-5. La parte gratuita finisce con "Nuovo nella stiva!" (Rampino, Ancora, Ghiacci, bottega) subito prima del tasto di sblocco: buon gancio.

## 5. Economia dei dobloni

Reddito: 1 ogni 2 isole + 2 per battaglia vinta (00 §1.5). Le borse **non passano da un capitolo all'altro**: con la regola "da capo" ogni capitolo deve ripartire sempre dallo stesso stato.

| Cap. | Iniziali | Reddito atteso | Al round | Uso tipico |
|---|---|---|---|---|
| 1 | — (contatore nascosto) | — | — | bottega chiusa: i dobloni si insegnano nel cap. 2 |
| 2 | **5** (era 0) | ~30 | 4,7 | 1 mercenario a round o 1 arma |
| 3 | 3 | ~42 | 5,6 | mercenari per il Bastione |
| 4 | 3 | ~47 | 5,6 | primo Forte (8) |
| 5 | 5 | ~47 | 5,8 | |
| 6 | 5 | ~49 | 6,0 | |
| 7 | 5 | ~56 | 6,8 | |
| 8 | 0 | ~94 | 7,8 | tetto 20 come in 00 |

Nel cap. 1, senza bottega, i dobloni finirebbero al tetto 20 sprecati. 5-8 dobloni a round = 1-2 mercenari: la bottega pesa ma non sostituisce i rinforzi.

## 6. Metriche per il simulatore (`sim capitolo N`, 500 partite per difficoltà)

- vittoria al primo tentativo per difficoltà: §3, ±5 punti;
- minuti di un capitolo vinto e di un tentativo fallito (battaglie × durata misurata + round × 1,5);
- quota di sconfitte al limite di round (§3) e per "Mare perduto";
- round medio della sconfitta: **non oltre l'80% del limite**;
- minuti attesi di carriera con riprova: **11,5-14 h** a 5 min per battaglia;
- battaglie giocate per round: **1-2** (cap. 1-7), **≤ 2,5** (cap. 8); difese per round ≤ 0,7;
- battaglie boss: il giocatore vince il **60-75%** al primo assalto a Nostromo;
- dobloni: spesi ≥ 80% di quelli incassati; round passati al tetto 20 < 10%; mercenari ≤ 25% dei rinforzi del giocatore;
- uso delle armi sbloccate in quel capitolo: ognuna ≥ 3% dei tiri; nel cap. 3 il Pappagallo ≥ 10% dei tiri contro il Forte;
- cap. 8: partite decise ai punti al round 18 < 15%.

## 7. Correzioni puntuali a 15-carriera.md

1. **Intestazione e §1.1 "Sconfitta di capitolo"**: aggiungere "si ricomincia **da capo**, nessun ripristino (00 §9.13)", la regola "Mare perduto" (§2.2), "Ricomincia capitolo" nel menu di pausa e l'avviso a 3 round dal limite.
2. **§1.2, colonna Limite**: 10, 12, 12, 14, 15, 15, 18, 25 → **8, 10, 11, 12, 13, 13, 14, 18**. Cap. 8: vittoria a **14 isole** oppure tutte le capitali, punti al round 18.
3. **§1.2, cap. 1**: togliere "dobloni (si accumulano)" dalle regole nuove; i dobloni entrano nel cap. 2 con la bottega.
4. **§1.2, dobloni iniziali**: 0, 0, 3, 3, 5, 5, 5, 0 → **—, 5, 3, 3, 5, 5, 5, 0**, nessun riporto tra capitoli.
5. **§1.3 Stelle**: cap. 5 ★★★ "entro il round 11" → **entro il round 9**; cap. 8 ★★ "entro il round 16" → **entro il round 12**.
6. **§1.4**: sostituire la formula della riprova e la tabella con quelle di §2 qui (762 → 747 min; riprova 95 → 84 min; fascia 10,4-14,4 h). Cap. 8: 22 battaglie, 12 round. "Parte gratuita (cap. 0-2) ~2 ore" → **cap. 0-1, ~53 min**.
7. **§3, bersagli del simulatore**: 95, 90, 90, 85, 80, 75, 70, 70 → **95, 92, 90, 87, 85, 82, 80, 80**, tolleranza ±5 (non ±10).
8. **§4, tabella degli sblocchi**: cap. 2 → **9 Pappagallo postino**, 15 Bussola stregata; cap. 3 → **8 Palla spezzata**, 10 Scimmia (cassa).
9. **§4, Confine gratuito**: "sblocco a 4,99 €" → **1,99 €**; gratis **Prologo + cap. 1** (~53 min) e Schermaglia; con lo sblocco **cap. 2-8**, Mondo libero, Rotta breve (~11,5 h). Il Mondo libero si sblocca col cap. 2 come ora, quindi è comunque dietro lo sblocco.
10. **§6, 12 Business**: parte gratuita Prologo + cap. 1; il tasto "Sblocca" a fine **cap. 1** (non 2); valore dello sblocco "7 capitoli, ~11,5 ore".
11. **§6, 09 Bilanciamento**: la curva del cap. 8 è a 14 isole, ~22 battaglie, ~2,2 h; aggiungere le metriche di §6 qui.
12. **§6, 14 Produzione**: test chiuso con i tester sui cap. 0-2 (non 0-3) più "sblocca tutto".
13. **§7 Domande**: 1 chiusa (a); 2 chiusa (b, a 1,99 €); 3 chiusa (b, solo da capo). Togliere "3 piccoli salvataggi in più".
