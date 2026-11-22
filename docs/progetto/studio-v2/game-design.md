# Studio v2 · Game design della battaglia

*Agente Game Design, 21/11/2026. Nessuna modifica al codice. Dove contraddico 00-DECISIONI lo segnalo in §5.*

## 1. Cosa ho provato
Build di `claude/studio-v2` (= m1-integrazione, comandi v3), Chromium headless a 800×360. Ho giocato una Schermaglia 3 contro 3 contro l'IA Mozzo su Cala Pappagallo: camminata, salto, mira, tiro, 16 turni interi cronometrati fase per fase, più 25 screenshot. Poi ho letto i documenti degli altri ruoli per allinearmi (Tecnica, Livelli, UX, Animazione).

## 2. Cosa non va
1. **Il campo è sempre "mira, buca, ripeti".** Ogni arma fa un cratere tondo, il sospeso non crolla, le 4 armi base differiscono solo per traiettoria. Il rompicapo c'è, ma ha una sola risposta.
2. **Tempo morto.** Anche sparando subito un turno dura 6-7 s: volo 1-3 s, **fuga fissa di 3 s** quasi sempre inutile, inquadra e risoluzione 0,6 s. Il turno dell'IA dura ~7 s, tutto da guardare. 3 contro 3: 16 turni, 99 s con un bot; con una persona 4-5 minuti, metà a guardare.
3. **I pirati sono vermi.** Capsula con un solo disegno che scorre a 60 px/s, gradino di 8 px, salto a parabola fissa.
4. **Il rampino, il gesto da pirata, arriva solo in M2.**
5. **Le scale si fermano a metà.** Livelli ha trovato la causa: l'asse della scala è a 2 px dal muro e la capsula (12 px) urta. Non è il "tieni premuto". Va corretto l'asse e aggiunta la prova automatica; la salita in un tocco (§3.6) la rende comunque più sicura.
6. **Il turno nemico non è giocabile:** guardi e basta.

**Da tenere:** mirino da trascinare, traiettoria, mappa leggibile, il piacere di capire *dove* colpire.

## 3. Decisioni
1. **Fuga a 0 s per i colpi diretti** (ci si muove mentre il proiettile vola); 3 s solo con miccia o armi piazzate. **S**, Pacchetto 1.
2. **Timer 12 s** (Mozzo e prime 3 battaglie 20 s, Timer lungo 30 s); turno IA ≤ 4 s con la sua mira visibile 0,8 s. Obiettivi: turno umano ≤ 10 s, 3 contro 3 in ≤ 2 min, 5 contro 5 in 3-4. **S**, P1.
3. **2 spari per turno di squadra, timer unico 15 s**: scegli chi spara toccando il pirata, nessuno spara due volte, il secondo colpo sfrutta il primo (buco, crollo, barile acceso). L'IA Mozzo ne fa uno. Ripiego: 1 sparo con 12 s. **M**, P1.
4. **Pirati acrobati**, in accordo con Tecnica e UX: corsa a falcate (96 px/s), scavalco automatico fino a 28 px, salto d'appoggio con slancio, **scivolata** sui pendii oltre 25° (fino a 220 px/s, senza danno se atterri scivolando), **salvataggio al bordo** (tocco su SALTA entro 0,5 s dopo la caduta, una volta per battaglia). **M**, P1.
5. **Rampino a corda dal turno 1 di M1** (non chiude il turno, 2 lanci a turno, 260 px, dondolo a pendolo, SALTA stacca e lancia con la velocità del dondolo; si aggancia a roccia, travi, anelli di ferro, liane). Come si comanda lo decide UX. **L**, P1.
6. **Scale in un tocco**: ⇧ e il pirata sale da solo a 90 px/s fino in cima (o al moncone), si ferma con ⇩ o SALTA. **S**, P1.
7. **Il campo si spezza** (sostituisce "il sospeso non crolla"), in due tempi. *Tempo 1* (è la regola di Livelli): legno e roccia sotto 24 px non più collegati cadono in blocco e fanno macerie (≤ 12 danni). *Tempo 2*: le masse isolate (torri, archi, pilastri) cadono intere e schiacciano (20-40 danni e spinta), portano giù chi ci sta sopra. Calcolo solo attorno al colpo, ≤ 2 ms sul Pixel 6. **L**, P1 (tempo 1), P2 (tempo 2).
8. **I materiali reagiscono**: la **sabbia frana** e chiude a metà i buchi piccoli, il **legno brucia** (6 danni a turno per 4 s) e poi sparisce (ponti e relitti crollano), il **ghiaccio si crepa** al secondo colpo. **M**, P1 sabbia e legno, P2 il resto.
9. **Armi che fanno ciò che il cannone non fa** (spingere, tirare, tagliare, incendiare, far crollare). Per Fable: **Barile** (tocco = piazza, tenuto = lo spingi e rotola giù per il pendio, esplode al secondo urto o dopo 3 s), **Palla incatenata** (tunnel e tagli netti, anticipata da v1.1), **Arpione** (aggancia un nemico entro 300 px e lo tira di 120 px: bordo e mare), **Sciabola** che taglia funi e ponti. Per Opus: Fiasco incendiario, Ancora, Kraken e il resto di 00 §1.3. **L**, P1 (quattro), P2.
10. **Leggibilità**: traiettoria sempre intera (la sfida è *cosa* colpire, non la mano); tenendo premuto sul punto d'impatto compare l'**anteprima delle conseguenze** (cratere e pezzi che cadrebbero, in rosso) con `simulaColpo` dell'IA; le **combo** (esplosione → barile → crollo → mare) mostrano "×N" e rallentano 1,2 s, **senza bonus di danno**. In più la **schivata** (mentre l'IA mira, tocchi un tuo pirata per un tuffo di 60 px, uno ogni 2 turni nemici). **M**, anteprima e combo P1, schivata P2.

Elementi nel campo (Livelli li piazza, qui la regola): ponti di corda tagliabili, casse e barili appesi a una fune, palme abbattibili (25 danni), **cannone fisso** neutrale (una volta, 60 danni raggio 70), sfiati che lanciano in alto annunciati un turno prima.

## 4. Cosa NON fare
- Niente ragdoll né fisica generale a corpi rigidi: solo pezzi che cadono in blocco.
- Niente acqua che scorre né fuoco che si propaga, uno alla volta (d'accordo con Livelli).
- Niente bonus di danno per le combo: rompe il bilanciamento.
- Niente pirata in tempo reale: restano i turni, il rompicapo è il cuore.
- Niente 16 armi tutte insieme: prima 4 nuove, poi si vede cosa si usa.

## 5. Dipendenze e conflitti
- **Con 00 / 01:** §1.1 timer e fuga; §1.2 camminata 60 px/s e gradino 8; 01 §3 "il sospeso non crolla"; rampino da M2 a M1; palla incatenata da v1.1 a M1. Il Producer li porta in 00 se approva.
- **Bilanciamento:** 2 spari, 12 s, danni da schiacciamento; replay "oro" e 85% Mozzo da rifare.
- **Tecnica:** crolli e rampino a pendolo vanno in `sim/` in modo deterministico; budget 2 ms.
- **Livelli:** la regola dei crolli è la loro; io aggiungo il tempo 2. Nessun crollo entro 120 px dagli spawn.
- **Animazione e UX:** corsa, dondolo, tuffo; tasto rampino e anteprima. UX toglie il salto all'indietro: confermo.
- **Audio:** crollo, frana, fune che si spezza. **QA:** prova automatica su scalata e crolli.

## 6. Domande per il proprietario
Nessuna: tutto è reversibile.
