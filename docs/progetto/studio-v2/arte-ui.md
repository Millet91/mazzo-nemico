# Arte e UI — decisioni studio v2

Ruolo: Arte/UI. Data: 21/11/2026. Nessun cambio al codice.

## 1. Cosa ho provato
Build di `claude/m1-integrazione` (c36bb52, con comandi v3 e terreno Magnific), `vite preview`, Chromium headless a 800×360 con scala 2. Ho giocato con tocchi veri: Schermaglia → Cala Pappagallo, camminata a destra tenendo premuto, salto, trascinamento del mirino, FUOCO, turno seguente. Ho guardato 40 screenshot; 4 sono in `/mnt/project-files/studio-v2/arte-ui/`. Ho letto `forme.ts`, `scena-battaglia.ts` (animazione pirata), `camera.ts`, la pipeline `scripts/mappe/` e controllato i crediti Magnific.

## 2. Cosa non va (per gravità)
1. **Il pirata è un verme in piedi.** `forme.ts`: un solo rettangolo tondo + cerchio, un solo occhio, uguale per tutti. Camminare = un'unica immagine che oscilla ±6° e sale di 2 px a 12 fps; salto = si stira. Niente cappello, spada, gambe, giacca. Colpa nostra più che del verme: è il segnaposto M0.
2. **La mappa è sfocata.** Il terreno è 2048×1024 = 1 pixel d'arte per unità di mondo. Sul Pixel 6 (1080 px di altezza, altezza logica 540) lo zoom normale 1,4 ingrandisce 2,8 volte, il massimo 4 volte. Per questo "ritagli" e morbidezza.
3. **Dopo un'esplosione il bordo è a gradini** (maschera della sim a 1 px, nera) e dentro compaiono blocchi marroni piatti (screenshot 3). Il terreno distrutto non sembra roccia tagliata.
4. **Texture ripetute e "facce":** un solo ammonite stirato sulla torre; le grotte tonde scure sembrano bocche.
5. **I comandi coprono i pirati:** a terra le frecce ◀ ▶ finiscono sopra Fumo e Uncino (screenshot 2); il suggerimento "Trascina il mirino" copre i pirati al livello del suolo.
6. **Troppi nomi:** nome + barra + PV su ogni pirata ingombra; sulle frecce si sovrappongono.
7. **Stili che litigano:** menu a pixel (nuvole e mare a scalini, screenshot 4), battaglia dipinta, pirati vettoriali piatti. Le schermate di scelta e HUD invece sono pulite e coerenti (vetro blu scuro + giallo caramella): quelle si tengono.

## 3. Decisioni
1. **Stile unico: "cartone dipinto"** (contorno marrone scuro caldo 2-3 px, ombre dipinte morbide, luci di tramonto). La battaglia è il riferimento; menu e mappa del mondo si adeguano. *S, tutti i pacchetti.*
2. **Nuovo pirata ad ossa 2D (Pacchetto 1, L).** Sagoma da pirata: tricorno o bandana, giacca con falda, stivali, spada al fianco, 8 pezzi (cappello, testa, busto, falda, due braccia, due gambe) disegnati una volta e animati dal codice. Ogni ciurma si distingue per **forma del cappello e colore**, non solo colore (daltonismo). Altezza d'arte 52 unità; la capsula di collisione non cambia.
3. **Animazioni da pirata (Pacchetto 1, M):** corsa a falcate con busto inclinato e falda che segue; tuffo e rotolata; salto d'appoggio e atterraggio fluido; arrampicata mano su mano su corda e liana; dondolio sul gancio; scivolata. Lista e tempi da concordare col ruolo Animazione: io fornisco i pezzi e i perni.
4. **Mappa HD fatta in casa, non solo da Magnific (Pacchetto 1, L).** Il pittore in Chromium (`scripts/mappe/dipingi`) disegna già a mano: lo si fa uscire a **3 pixel per unità** (6144×3072 totali, ritaglio utile ~5900×2300), a **tessere da 2048** caricate a richiesta. Minimo garantito 2× (4096), 3× se fps e memoria del Pixel 6 reggono (misura del ruolo Tecnica). Fisica e maschera restano a 2048×1024.
5. **Bordi lisci dopo le esplosioni (Pacchetto 1, M, con Tecnica):** maschera della sim ingrandita con filtro morbido e soglia (smoothstep) al posto dei gradini, più **bordo di taglio dipinto** (linea scura + fascia chiara dentro il bordo) e interno a strati di terra/roccia, mai colore piatto.
6. **Regole della mappa contro i difetti già visti (Pacchetto 1, S):** parallasse solo cielo e lontano (≤6%), il medio quasi fermo; piante e rocce **dipinte dentro il terreno** o appoggiate con ombra a contatto, niente oggetti sospesi; texture a rotazione e variazione, niente fossile ripetuto; grotte con bordo e raggio di luce, non cerchi scuri.
7. **Comandi: restano i v3, due ritocchi (Pacchetto 1, S).** Pulsanti e mirino già sobri. (a) Se un pirata è sotto un tasto, il tasto scende al 25% di opacità. (b) Il suggerimento sta sopra i tasti, compare solo i primi turni e sparisce al primo tocco.
8. **Etichette sobrie (Pacchetto 1, S):** nome solo per il pirata attivo e il bersaglio mirato; gli altri hanno solo barra PV sottile e numero al tocco. Sono 4 numeri in meno sullo schermo.
9. **Kit UI dipinto (Pacchetto 2, M):** menu con il cielo HD della Cala e il veliero; pannelli a 9 fette in legno e pergamena per mappa del mondo; HUD di battaglia resta in vetro scuro (leggibile). Icone armi dipinte 128 px, tutte con la stessa grammatica. Ordine: HUD resta, menu dopo.
10. **Regola risoluzione per ogni asset (S):** sprite e icone a 3× (come già `forme.ts`), webp qualità 82, tessere 2048, memoria GPU ≤120 MB, arte mappa nell'APK ≤25 MB.

## 4. Cosa NON fare
- Non far generare la Cala da Magnific in un colpo: esce 1024-1500 px e il proxy qui blocca i download, è così che sono nati i ritagli.
- Non aggiungere parallasse "per dare profondità" (già bocciato).
- Non mettere un joystick o tasti grandi, nemmeno per i gesti da pirata: servono tasti piccoli contestuali (es. sulla liana compare "afferra").
- Non cambiare la capsula di collisione per il nuovo pirata.
- Non ridisegnare l'HUD: è già pulito.

## 5. Dipendenze e conflitti
- **Animazione:** concordare i perni dello scheletro e i nomi delle azioni prima di disegnare (decisioni 2-3).
- **Tecnica:** caricamento a tessere, filtro dei bordi, misura memoria e fps sul Pixel 6 (decisioni 4-5).
- **Game design / Livelli:** i movimenti da pirata (liana, tuffo, gancio) cambiano le regole: l'arte segue, non guida. Le liane vanno ridisegnate con la mappa.
- **UX:** decisioni 7-8 toccano il thread Comandi (proprietà di `mirino.ts`, `input.ts`, `Hud.tsx`).
- **Producer:** crediti Magnific (vedi sotto).

## 6. Domanda per il proprietario (una)
Su Magnific restano **35 crediti**. Per la mappa HD cosa preferisci?
- **A (consigliata): tutto in casa**, i crediti restanti solo per 1-2 riferimenti di stile. Nitido, coerente, subito.
- B: ricarichi i crediti e fissi un tetto (es. 300) per far rifinire cielo e terreno a 4× da Magnific; più "dipinto", costa di più e i file vanno caricati a mano.
- C: nessun uso di Magnific.
