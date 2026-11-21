# Studio v2 · Game design della battaglia (21/11/2026)

*Agente Game Design. Ho giocato una Schermaglia 3 contro 3 su `claude/m1-integrazione` (Cala Pappagallo, 800×360, contro IA Mozzo), cronometrando ogni fase. I conflitti con 00-DECISIONI sono in §7: il Producer decide se portarli in 00.*

## 1. Cosa ho visto
- **Tempo morto.** Un turno dura 6-7 s anche se si spara subito: volo 1-3 s, **fuga fissa di 3 s** (quasi sempre inutile), inquadra e risoluzione 0,6 s. Il turno dell'IA dura 7 s ed è tutto da guardare. 3 contro 3: 16 turni, 99 s con un bot che spara dopo 1 s; con una persona sono 4-5 minuti, metà a guardare.
- **I pirati sono vermi.** Capsula con un disegno solo, scivola a 60 px/s, gradino di 8 px, niente corsa né acrobazie. Il rampino, il gesto da pirata, arriva in M2.
- **Un solo tipo di danno.** Ogni arma fa un buco tondo e il terreno sospeso non crolla: "mira, buca, ripeti".
- **Bug scale.** Si sale solo tenendo premuto: la salita si ferma quando il dito molla o l'appiglio è tagliato.
- **Da tenere:** mirino da trascinare, traiettoria, mappa leggibile, il piacere di capire *dove* colpire. È il rompicapo.

## 2. Idea guida
**Un rompicapo di fisica a turni in cui i pirati sono acrobati e il campo si spezza e reagisce.** Tre pilastri: pirati che si muovono da pirati; ogni colpo cambia il campo in modo diverso da un buco; turni corti, senza attese. La domanda resta: "se rompo *quel* pilastro, cosa cade su chi?".

## 3. Ritmo (massima priorità, costa poco)
| Cosa | Oggi | Decisione |
|---|---|---|
| Timer | 20 s (Mozzo 30) | **12 s**; Mozzo e prime 3 battaglie 20 s; Timer lungo 30 s |
| Fuga dopo lo sparo | 3 s sempre | **0 s** per i colpi diretti (ci si muove mentre vola il proiettile); 3 s solo con miccia o armi piazzate |
| Turno IA | ~7 s | **≤ 4 s**; la sua mira resta visibile 0,8 s |
| Turno di squadra | 1 sparo | **2 spari, timer unico 15 s**: scegli chi spara toccando il pirata (altrimenti a rotazione), nessuno spara due volte. Il secondo sparo sfrutta il primo (buca, crollo, barile acceso): qui sta il rompicapo. L'IA Mozzo ne fa uno |

Ripiego se i 2 spari costano troppo: 1 sparo con timer 12 s.

## 4. Pirati che si muovono da pirati
- **Corsa** 110 px/s (◀▶ tenuti da 0,3 s), gradini fino a 24 px scavalcati da soli. Braccia e gambe, corsa a due tempi: mai una capsula che scivola (Animazione).
- **Salto con slancio**: conserva la velocità di corsa (fino a 140 px/s), salto lungo 100-160 px.
- **Rampino a corda di serie, da M1** (tasto fisso, non chiude il turno, 2 lanci a turno): si aggancia a roccia, travi e liane entro 260 px nella direzione del mirino, dondolo a pendolo, SALTA stacca e **lancia** con la velocità del dondolo. È il verbo dei pirati e apre i piani alti.
- **Scivolata** sui pendii oltre 25°: fino a 220 px/s, senza danno se si atterra scivolando. Le liane si afferrano al volo.
- **Scale in un tocco**: ⇧ e il pirata sale da solo a 90 px/s fino in cima (o al moncone se l'appiglio è tagliato, poi si salta via); si ferma con ⇩ o SALTA.
- **Salvataggio al bordo**: dopo una caduta si può aggrapparsi al bordo (tocco su SALTA entro 0,5 s, una volta per battaglia).

## 5. Il campo si spezza (sostituisce "il sospeso non crolla")
1. **Crolli.** Dopo ogni esplosione si cerca ciò che non è più collegato al fondale o al ferro: i pezzi staccati (> 400 px²) **cadono in blocco**, schiacciano chi sta sotto (20-40 danni e spinta), portano con sé chi ci sta sopra (caduta dimezzata) e finiscono in mare. Calcolo solo attorno al colpo (+64 px), ≤ 2 ms sul Pixel 6.
2. **Ogni materiale reagisce.** La **sabbia frana** e riempie a metà i buchi piccoli; il **legno brucia** (4 s, 6 danni a turno) e sparisce, quindi ponti e relitti crollano; il **ghiaccio si crepa** al secondo colpo e scivola a lastre; la roccia resiste ma i bordi liberati cadono; il ferro non si tocca.
3. **Oggetti nel campo** (a Cala Pappagallo almeno i primi quattro): **ponti di corda** tagliabili; **casse e barili appesi a una fune** (tagli e cadono); **palme abbattibili** (cadono dal lato opposto al colpo, 25 danni); **cannone fisso** neutrale (chi ci arriva spara una volta: 60 danni, raggio 70); **sfiati** che lanciano in alto, annunciati un turno prima.
4. **Combo.** Una catena (esplosione → barile → crollo → mare) mostra "×N", rallenta 1,2 s ed entra nei "colpi migliori". **Nessun bonus di danno**, per non rompere il bilanciamento.

## 6. Armi: ognuna fa ciò che il cannone non fa
Un'arma **spinge, tira, taglia, incendia o fa crollare**. Per Fable (M1): **Barile** (tocco = piazza, tenuto = lo spingi e rotola giù per i pendii, esplode al secondo urto o dopo 3 s); **Palla incatenata** (anticipata da v1.1: tunnel e tagli netti, lo strumento dei crolli); **Arpione** (aggancia un nemico entro 300 px e lo tira di 120 px verso di te: bordo e mare); **Sciabola** che taglia funi, liane e ponti. Per Opus: Fiasco incendiario (il legno diventa una trappola), Ancora, Kraken e le altre di 00 §1.3, con le stesse regole.

## 7. Leggibilità, reazione e conflitti con 00
- **Traiettoria sempre intera** a ogni livello: la sfida è *cosa* colpire, non la mano. Tenendo premuto sul punto d'impatto compare l'**anteprima delle conseguenze** (cratere e pezzi che cadrebbero, in rosso), con `simulaColpo` dell'IA.
- **Schivata** (dopo): mentre l'IA mira tocchi un tuo pirata per un tuffo di 60 px, uno ogni 2 turni nemici. Il turno nemico smette di essere un film.
- **Da correggere in 00:** §1.1 timer e fuga; §1.2 camminata 60 px/s e gradino 8; 01 §3 "il sospeso non crolla"; rampino da M2 a M1; palla incatenata da v1.1 a M1.

## 8. Priorità e misure
**Fable (prima mappa + combattimento):** §3, §4 (rampino, scale), §5.1-5.3 (crolli, sabbia e legno, ponti e funi), §6, traiettoria. **Opus dopo:** schivata, ghiaccio, sfiati, altri oggetti, mappa del mondo e primo scenario.
**Successo:** turno umano ≤ 10 s, turno IA ≤ 4 s, 3 contro 3 ≤ 2 min; almeno il 30% delle uccisioni da crollo, caduta, mare o catena; le scale portano in cima nel 100% delle prove automatiche.
**Agli altri agenti:** Animazione (corsa, dondolo, tuffo); Livelli (funi e pilastri da tagliare, un punto debole per isola); Bilanciamento (2 spari, 12 s, schiacciamento); Audio (crollo, frana, fune); UX (anteprima, tasto rampino); QA (test su scalata e crolli).
