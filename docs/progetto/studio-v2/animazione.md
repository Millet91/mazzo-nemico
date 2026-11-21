# Animazione · decisioni (studio v2)

## 1. Cosa ho provato
Build di `claude/m1-integrazione` (ramo `studio-v2`), `vite preview`, Chromium headless 800×360, Schermaglia → Salpa. Ho tenuto premuto ▶ (6 screenshot a 90 ms), premuto SALTA (8 a 110 ms) e ritagliato il pirata ×2 in due fogli di contatto. Ho letto `render/forme.ts` e `scena-battaglia.ts` (come si muove il pirata) e `sim/pirata.ts` (come si muove davvero). Magnific: 35 crediti (verificato ora), non ho generato niente.

## 2. Cosa non va
1. **Il pirata è un solo sprite rigido** (capsula + testa, `forme.ts`): niente gambe, niente braccia, le braccia sono un bastone nero. Non c'è "corpo" da muovere come un pirata.
2. **Il passo non è un passo.** `aggiornaPirata`: ogni 1/12 s il corpo salta di 2 px e si inclina ±6°, qualunque sia la velocità. Nei 6 frame il pirata scivola avanti dondolando: è la strisciata del verme. I piedi non toccano mai terra a tempo.
3. **Il salto è un'unica parabola fissa** (vx 90, vy −230, g 600: sale 44 px in 0,38 s e ricade lento, 0,77 s in tutto): galleggia, e il sprite fa solo "allunga/schiaccia". Il salto indietro è lo stesso, solo più alto.
4. **Scale e liane: nessuna animazione.** Da appeso il pirata resta in piedi, dritto, con una manina d'oro sopra. Non si vede che si sta arrampicando.
5. **Nessuna personalità.** Idle uguale per tutti, reazione ai colpi = lampo bianco + tremolio, morte = giro e rimpicciolimento, vittoria e sconfitta non esistono, nessuna reazione ai compagni.
6. **Mira e tiro sono muti:** il braccio ruota, ma il corpo non si carica con la potenza (che nei comandi v3 si trascina) e dopo lo sparo non c'è rinculo né fumo dalla bocca.
7. **Pirata a 0 PV:** resta steso di 90° fino alla lapide, senza dire niente (nessun lamento, nessun cappello).

## 3. Decisioni
Principio: **animazione guidata dallo stato della sim** (aTerra, vx, vy, appeso, vita + eventi `sparo`, `salto`, `atterrato`, `danno`, `aggrappato`, `staccato`, `morto`). Il render non decide mai la fisica.

1. **Pupazzo a pezzi, non spritesheet** (L1, **Pacchetto 1**). Il pirata diventa ~10 sprite in un contenitore: testa+cappello/bandana, torace, bacino, braccio dietro, braccio davanti+arma, due gambe (coscia, stivale), più ombra. Si muove con curve nel codice (poche righe per ogni stato) e una piccola cinematica inversa per piedi e mani. Perché: la mira ruota a ogni angolo, scale e liane servono mani e piedi su un punto preciso, i colpi dipendono da direzione e forza, si ricolora per fazione (fascia magenta di 11 §S4), pesa ~1 MB invece di 8 MB per fazione. Costo **M**.
2. **Passo guidato dalla distanza, non dal tempo** (S, P1). Fase = x / 28 px (due passi). Piedi che toccano terra, andatura "da mare": dondolo del torace ±5°, busto avanti 4°, il corpo scende a ogni appoggio, polvere sull'appoggio solo se corre. Su pendio il busto segue il terreno; sul gradino (≤ 8 px) la mano si appoggia e il pirata scavalca.
3. **Partenza e frenata** (S, P1): 80 ms per mettersi in moto (inclinazione), alla frenata scivola di ~6 px con le braccia che bilanciano. Solo grafica.
4. **Salto da pirata** (M, P1). Slancio di gambe e braccia al decollo (la sim stacca subito: nessun ritardo di input), gambe raccolte in cima, atterraggio con ginocchia piegate e rotolino di polvere (120 ms, come oggi ma leggibile). **Salto indietro = capriola** con rotazione legata a `vy` (completa quando torna alla quota di partenza; atterrando in anticipo si raddrizza in 100 ms). **Caduta lunga:** braccia a mulinello; danno da caduta = ginocchia che cedono e barcollata.
5. **Scale e liane** (M, P1). Scala: pirata girato a ¾ verso i pioli, mani e piedi alternati a ogni 8 px percorsi. Liana: mani alternate e piedi chiusi sulla corda, ±3° di dondolo; scendendo (60 px/s) scivola con una mano sola. Appeso può mirare con il braccio libero. Staccarsi: calcio dalla liana con braccia aperte. Sull'imbocco in cima: la mano "afferra" il bordo.
6. **Tiro con il corpo** (M, P1). Mentre trascini il mirino il pirata si carica con la potenza: gambe larghe, schiena indietro, braccio con l'arma tirato (granata: braccio dietro la testa). Sparo: rinculo di 6 px nel verso contrario (solo grafica), fumo dalla bocca, cappello che sobbalza. Un'arma = una posa (cannone sulla spalla, pistola a una mano, granata, sciabola a due mani) = 4 pose in tutto.
7. **Colpi, morte, mare** (M, P1). Colpito da vicino: sbalzato a braccia aperte e gambe che pedalano, atterra di schiena, stelline, si rialza in 400 ms. A 0 PV: seduto a terra con il cappello in mano. Morte: bagliore, il **cappello vola e atterra sulla lapide-barilotto** (c'è già la forma `cappello`). Annegato: braccia in alto, bolle, il cappello resta a galla.
8. **Personalità** (S, P1). Tre idle a caso (guarda in giro, lucida la sciabola, picchietta il piede), reazioni ai compagni (pugno al cielo se un amico colpisce, risata se l'avversario cade in mare), passo diverso per ciurma: Teschio spavaldo, Gelo rigido e infreddolito, Oro pavoneggiato, Marea sbilenco, Marina a passo di marcia. Ogni ciurma = 4 numeri (ampiezza dondolo, ritmo, tre idle). Con "animazioni ridotte" tutto torna alla posa neutra.
9. **Vittoria e sconfitta** (S, P1 e P2). Vincitori: saltello, sciabola in alto, bandiera issata. Sconfitti: cappello giù, seduti sul barilotto. Lo stesso pupazzo serve ai segnalini della mappa del mondo (Pacchetto 2: camminata da fermi, idle, saluto).
10. **Due ritocchi alla sim, facoltativi, da decidere con Bilanciamento** (M, P1). (a) Corsa: dopo 0,4 s di ▶ premuto la velocità sale da 60 a 90 px/s, e il salto in avanti prende lo slancio. (b) Gravità del pirata più forte in discesa (×1,5) per un salto che sale e scende deciso. Entrambi cambiano il contratto (`Pirata.vx` come stato) e il hash dei replay: li propongo solo se la prova sul telefono dice ancora "lento". Senza, 1–9 sono solo render.

**Produzione dei pezzi (Magnific).** Passo 0, **gratis**: pezzi disegnati nel codice (Graphics, come oggi), così la prova sul telefono avviene prima di spendere. Passo 1: **un'unica ciurma** (Teschio) a pezzi su Magnific: `images_generate` del pirata intero in posa neutra e fascia magenta, poi `images_segment` + `images_remove_background`, riempimento dei pezzi coperti con `images_retouch`; le altre ciurme per ricolorazione. Prima di lanciare: `simulate_cost` e tetto deciso dal proprietario. **Niente video per camminata, salto, salita.**

## 4. Cosa NON fare
- Spritesheet da video per le azioni di movimento (deriva, piedi che scivolano, nessuna mira).
- Spine o altri rig a pagamento: 10 sprite e curve nel codice bastano.
- Ragdoll fisico o pelle deformabile (costo e sorprese a 60 fps su Pixel 6).
- Modificare la capsula 12×22 per le animazioni: l'animazione segue la fisica, mai il contrario.
- Pose diverse per ogni arma (16): ne bastano 4.

## 5. Dipendenze e conflitti
- **Fable P1 / Render e input**: nuovo `render/pirata-rig.ts`; sotto zoom 0,6 si torna allo sprite unico (nomi già nascosti sotto 0,9).
- **UX / Comandi**: la carica del corpo "spiega" la potenza e risolve in parte la lezione "ogni gesto nascosto deve avere un segno visibile". La maniglia d'oro resta.
- **Audio**: passi a tempo sulla fase, "aaarr" su salto e morte (eventi già presenti).
- **Arte/UI**: il rig usa la palette `COLORI_CIURMA`; i volti restano della versione segnaposto finché non arriva l'immagine di stile.
- **Bilanciamento / QA**: solo punto 10 (replay, `fermo()`, IA Mozzo).
- **Mappe**: le liane devono sporgere ~14 px dall'appiglio per le mani.
- **Bug scale (secondo feedback), solo ipotesi letta dal codice, non riprodotta:** in `aggiornaAppeso` il pirata sale solo se `!capsulaUrta(t, p.x, ny)`; con la capsula larga 12 px, dove il fianco della roccia sporge, la salita si blocca a metà. Va verificato e riparato dal Pacchetto 1 (Render e input / Fisica) prima di animare la salita.
- **Ritmo (secondo feedback):** i punti 2, 3 e 10 tolgono attese visive (passo con ritmo vero, frenata corta, rialzarsi in 400 ms, nessuna posa di attesa oltre 300 ms).

## 6. Domanda per il proprietario
Tetto di crediti Magnific per i pezzi del pirata (disponibili: 35)?
- **A. Fino a 15 crediti: solo la ciurma Teschio** (consigliata: prima si prova il movimento a costo zero, poi si spende poco)
- B. Fino a 30 crediti: Teschio più ritocchi di volto per un secondo capitano
- C. Zero: restano i pezzi disegnati nel codice
