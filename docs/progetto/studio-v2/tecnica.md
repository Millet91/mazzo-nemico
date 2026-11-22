# Studio v2 · Tecnica

*Agente Tecnica, 21/11/2026. Sola lettura del codice: nessuna modifica al gioco.*

## 1. Cosa ho provato
Build di `claude/studio-v2` (stesso codice di m1-integrazione, comandi v3 inclusi), `npm run build` ok, `vite preview`, Chromium headless a 915×412 con scala 2,625 (come il Pixel 6). Ho giocato davvero: Schermaglia → Cala Pappagallo, tenuto premuta la freccia destra, premuto SALTA, guardato 14 screenshot in sequenza. In più ho misurato in Node il costo di crateri e collisioni. I fps veri del telefono qui non si possono misurare: Chromium usa la GPU software (circa 38 fps), quindi vale solo per confronti.

## 2. Cosa non va
1. **Il pirata scivola, non cammina.** Velocità fissa di 60 px/s (parte e si ferma di colpo), gradino massimo 8 px, e l'animazione è uno sprite unico che dondola di 2 px e 6° a 12 fps (`scena-battaglia.ts`, righe 480-490). Nelle sequenze il pirata scorre rigido sulla rampa. Il salto è una parabola fissa (avanti 90/−230 px/s, indietro −40/−330): in aria non si governa. È il movimento "da verme" che il proprietario nota.
2. **Tutto è sfocato per un limite nostro.** `risoluzioneMax: 1.5` (grafica.ts): sul Pixel 6 il canvas è 1373×618 ma lo schermo è 2402×1082, quindi il browser ingrandisce di 1,75×. L'HUD (DOM) resta nitido e il mondo no: si vede nello screenshot.
3. **L'arte del terreno è 1 px per px di mondo (2048×1024).** A zoom 1,4 ogni pixel dipinto copre circa 2,8 px dello schermo: pennellate impastate. Anche i bordi dei crateri sono a gradini.
4. **Il terreno dipinto non regge il passaggio a HD.** Ogni cratere ridipinge le tile sulla CPU: oggi 0,6-1,4 ms (desktop) per cratere; con arte doppia sono 4× i pixel, quindi circa 3-6 ms su desktop e molto di più sul Pixel 6 (stima, non misurata), contro i 16,6 ms di un frame. In più all'avvio si legge tutta l'arte con `getImageData` (8 MB, 16 MB a 4096×2048 + sfarfallio).
5. **La simulazione non è il problema:** `capsulaUrta` costa 0,42 µs, un cratere 0,05-0,09 ms. Il collo di bottiglia è solo il disegno.
6. **I pirati sono macchie vettoriali** (`forme.ts`), tutte uguali se non per colore: non c'è nulla da animare "a pirata".

## 3. Decisioni
1. **Terreno HD con shader, arte 4096×2048 (2 px arte per px di mondo), tile 512.** Le texture dell'arte non si ridipingono mai. La distruzione è una maschera da 1 byte per pixel (quella della sim) caricata come texture; lo shader la legge con filtro lineare e soglia morbida: bordi lisci a qualsiasi zoom, bordo bruciato e fondo grotta calcolati nello shader. Un cratere diventa un invio di 50-100 KB invece di ridipingere. *Perché:* risolve punti 3 e 4 insieme. **L** · Pacchetto 1.
2. **Maschera della sim resta 2048×1024.** Il solo aspetto HD si fa nella grafica. *Perché:* raddoppiarla costa 4× in collisioni, crateri, IA e generatore, e cambia tutti i replay. · Pacchetto 1 (cosa da non toccare).
3. **Risoluzione fino a min(dpr, 2) con regolazione dinamica:** se il frame medio supera 14,5 ms per 30 frame scende a 1,5 poi 1,25, e risale piano. **S** · Pacchetto 1.
4. **Corsa a falcate.** Accelerazione 0→96 px/s in 0,15 s, frenata con scivolata breve; un passo ogni circa 14 px di distanza (non più a tempo); in salita rallenta (−30% a 45°), in discesa accelera. Il pirata segue la pendenza e si inclina. **M** · Pacchetto 1.
5. **Scavalco automatico fino a 28 px** (animazione 0,25 s) al posto del gradino da 8 px: i bordi di roccia e i muretti si superano come un pirata che si issa. **M** · Pacchetto 1.
6. **Salto d'appoggio con rincorsa:** conserva la velocità della corsa, controllo in aria limitato (±20 px/s²). Il salto all'indietro (da Worms) diventa **salto dal muro** quando si è contro una parete. **M** · Pacchetto 1.
7. **Dondolo sulle liane (pendolo):** ancoraggio in cima all'appiglio esistente, rilascio = lancio con la velocità del momento. Solo numeri e tabella `core/trig.ts`, quindi deterministico. **L** · Pacchetto 1, seconda fase (dopo 1-6).
8. **Pupazzo a parti animato da codice:** circa 9 pezzi (tronco, testa e cappello, 2 braccia, 2 gambe, arma, sciarpa) in un solo atlante, pose a tabella (riposo, corsa, salto, caduta, atterraggio, colpito, mira, liana, dondolo, morto) interpolate a 60 fps. Le parti arrivano da Magnific, una tavola per ciurma, tinta dal codice. **M** (codice) + lavoro d'arte · Pacchetto 1.
9. **Mappa del mondo come scena Pixi separata:** un'immagine unica in tile 512, zone cliccabili da un'immagine "a indici" (un colore per isola, nessuna geometria da calcolare), pan e zoom con la camera già esistente. Progressione salvata con Preferences di Capacitor. **M** · Pacchetto 2.
10. **Budget fissi di prestazioni:** sim ≤ 2 ms, disegno ≤ 8 ms a 60 fps sul Pixel 6, texture ≤ 80 MB; la "Prova 60 fps" della diagnostica diventa un controllo obbligatorio prima di ogni APK. **S** · entrambi.

## 4. Cosa NON fare
- Non Spine né Rive: licenze a pagamento o runtime pesante, e non servono con 9 parti.
- Non un motore fisico esterno (Box2D, Matter): non è deterministico e rompe replay e IA.
- Non WebGPU: su Android non è uniforme, WebGL basta.
- Non cambiare la capsula 12×22 del pirata: l'IA e il generatore di mappe la usano.
- Non portare l'HUD nel canvas: il DOM è nitido e funziona.
- Niente ragdoll né nuoto in questa fase.

## 5. Dipendenze e conflitti
- **Game design / Bilanciamento:** valori di corsa, salto, scavalco e caduta. I 10 replay "oro" (`tests/replay`) e il 85% di vittorie dell'IA vanno rigenerati e ritarati: `PASSI_FUGA` usa `BIL.pirata.camminata`.
- **Arte/UI e Livelli:** mappa dipinta 4096×2048 sulla stessa guida-sagoma; liane lunghe e ben ancorate per il dondolo.
- **Animazione:** fornisce la tabella delle pose; il codice la suona.
- **QA:** nuove soglie Pixel 6 e nuovo ordine dei test visivi.
- **Audio:** i passi seguono il passo a distanza (evento visivo, non della sim).
- **Magnific:** oggi solo 35 crediti (immagine = 135): senza crediti non si fa né arte HD né le parti del pirata.

## 6. Domande per il proprietario
Nessuna.
