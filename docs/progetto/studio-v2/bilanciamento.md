# Bilanciamento — studio v2

## 1. Cosa ho provato
Build di `claude/m1-integrazione` (la `main` ha solo M0). Ho scritto un simulatore senza grafica che usa la **sim e l'IA vere** del gioco: circa **9.000 battaglie** (200 per ogni prova), seme fisso, 5 contro 5 salvo dove indicato, timer 30 s. Poiché il giocatore umano non si può simulare, uso un "umano medio" (IA tra Mozzo e Nostromo): **è una stima, non una misura**; la taratura finale va fatta sul telefono. Poi ho giocato davvero in Chromium headless a 800×360 (Schermaglia 3 contro 3): 18 turni in 131 s, screenshot guardati. Gli script stanno in `/mnt/project-files/studio-v2/bilanciamento/`.

## 2. Cosa non va (per gravità)
1. **Il 60% delle battaglie 5 contro 5 non finisce: si decide al turno 18 a tempo** (118 su 200; obiettivo di 00 §5: meno del 10%). Media 17,7 turni (obiettivo 10-16). Cala Pappagallo è peggio: 68% a tempo.
2. **Si fa troppo poco danno:** 23 PV per turno contro 700 PV totali. In 18 turni (9 spari per lato) non si possono togliere 350 PV. Il limite di 24 turni "risolve" solo allungando (19 turni di media): non è la leva giusta.
3. **Il 41-44% dei turni non colpisce nessuno** (63% su Cala 3 contro 3, 96% nel Prologo 1 contro 1). Il raggio del cannone (55) è piccolo rispetto all'errore: è il raggio, più del danno, a rendere i turni vuoti (vedi §3).
4. **Due sole armi vive:** cannone 87% dei tiri, granata 13% (4-10 PV a colpo contro 23); pistola e sciabola **0%**. Obiettivo di 00 §5: ogni arma tra 3% e 35%.
5. **Il Prologo è perso:** sulla mappa del Prologo (3 contro 3, spawn a 176 px) l'umano medio vince solo il **18-23%** contro il Mozzo, con 15 PV di fuoco amico a partita.
6. **I tempi morti sono fissi:** ogni turno costa ~6 s tra volo (2,3), fuga (3,0 sempre, anche se non serve) e risoluzione. In gioco l'IA impiega 7 s a turno. La fuga è metà del tempo morto.
7. **Morti in mare 60-85%** (obiettivo 30-40%): il mare decide più dei danni.

## 3. Decisioni
1. **Armi con più raggio che danno** (S, Pacchetto 1). Misure a 1 sparo/turno: danno quasi ×2 (90, raggio 65) → 18% a tempo; raggio 55→85 con danno 75 → 14,8 turni. Cannone **danno 60, raggio 70**; granata **52 / 64** (con 2 spari a turno, vedi 2). Così il 5 contro 5 dura **14,0 turni** e il 7,5% finisce a tempo.
2. **Due spari per turno, ciascuno col suo timer** (M, Pacchetto 1). Simulato (secondo sparo dalla nuova posizione, senza fuga in mezzo): con i numeri del punto 1 → 14,0 turni, 7,5% a tempo, 3 contro 3 → 10,9 turni. Con i vecchi 45/55 resta a 16,5 turni e 24% a tempo: **i 2 spari da soli non bastano, serve anche il punto 1**.
3. **Fuga da 3 s a 1,5 s, interrompibile** (S, Pacchetto 1): da 107 a 80 s a battaglia (misurato). Il turno passa subito se il pirata si ferma o tocca "fatto".
4. **Timer: 12 s per sparo, 25 s Mozzo/Prologo** (S, P1). Non simulabile con l'IA: stima da 3-6 s di mira col trascinamento + 2 s di camminata. Con 2 spari da 12 s il turno vale 24 s, poco più dei 20 s di oggi. Il Timer lungo (45 s) resta.
5. **Mozzo tarato** (S, P1): oggi, con i numeri nuovi, l'umano medio lo batte il 67% (obiettivo 85%). Per portarlo a ~83-86% serve **errore ±14°/gittata ±35%** (misurato: 83%; ±18°/±50% → 86%). Il Capitano non è più abbattibile con i nuovi numeri (97% a favore dell'umano esperto sul Mozzo): va ritarato dopo.
6. **Prologo giocabile** (S, P1): oggi anche col Mozzo più debole l'umano vince il 35% al massimo. Servono: Mozzo "Tutorial" (spara a turni alterni, mai su un bersaglio entro 150 px), spawn più distanti (≥300 px, oggi 176), fuoco amico spento. Obiettivo 80-90%.
7. **Pistola e sciabola devono avere un motivo per esistere** (M, P1): il Mozzo non le sceglie mai perché il punteggio dà 1 punto per PV e 60 per uccisione. Danno pistola 18×2 → **28×2**; sciabola 25 → **40** con spinta 450 invariata (spinge in mare). Numeri a priori, non simulati. Il punteggio IA dà +15 se la spinta porta in mare entro 100 px.
8. **Macerie (danno da crollo)** (M, P1, **non simulabile oggi: numeri a priori**): un blocco che cade fa **8 PV** (come una caduta di 40 px), massimo **20 PV per turno per pirata**; sotto 5 PV non si mostra. Non conta per l'uccisione (nessun +60 per l'IA) così non diventa l'arma migliore. Va provato dopo l'implementazione con lo stesso simulatore.
9. **Limite turni** (S): resta **18 turni** (ora ≈ 36 spari) e il mare sale dal turno 12. Con i punti 1-3 l'obiettivo "meno del 10% a tempo" è dentro.
10. **Replay d'oro** (S, P1): ogni punto sopra cambia numeri e quindi gli hash dei 10 replay (`tests/replay/oro-*.json`). **Un solo commit** cambia tutti i numeri, alza `VERSIONE_REGOLE` (oggi 1) e rigenera i replay con `npx tsx tests/replay/genera.ts`. Il controllo "copertura" deve restare verde (barile, mare, ritirata, lapide). Non rigenerarli un numero alla volta.

## 4. Cosa NON fare
- Alzare il limite a 24 turni o i PV: allunga e basta.
- Raddoppiare il danno senza il raggio (danno 90, raggio 55): uccisioni da un colpo e turni ancora vuoti.
- Dare 3 spari a turno: con 2 spari e danno alto (75/80) il 5 contro 5 dura già 11 turni.
- Tarare la velocità della camminata ora: nella sim non ha effetto sull'IA Mozzo (non cammina); il test è fatto male, va ripetuto dopo che la corsa da pirata esiste.

## 5. Dipendenze e conflitti
- **Game design / Animazione:** "movimento da pirata" (corsa, liane) cambia la fuga e il tempo morto: il punto 3 vale se la fuga resta una corsa da 1,5 s.
- **UX / Arte-UI:** 2 timer da 12 s e due mirini per turno cambiano l'HUD.
- **Tecnica:** la fisica del cratere dipende dal raggio (da 55 a 70-85 le mappe si svuotano prima): servono mappe più spesse.
- **QA:** aggiornare le soglie (`tests/qa`) e i replay d'oro.
- **Livelli:** distanza di partenza oggi 545 px (isola) e 638 (Cala): va bene; il Prologo no (176 px).

## 6. Domanda per il proprietario
Nessuna indispensabile.
