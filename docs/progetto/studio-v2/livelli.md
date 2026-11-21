# Livelli e mappe — Studio v2 (agente Livelli)

## 1. Cosa ho provato
Build di `claude/m1-integrazione` (c36bb52): `npm ci && npm run build && vite preview`, Chromium headless con SwiftShader a 1080×486. Ho giocato Schermaglia su Cala Pappagallo: partenza, camminata a destra per 4,5 s fino alla Mesa, salto, mirino. Ho guardato `v3-magnific-intera.jpg` e `v3-magnific-vicino.png`. Poi ho eseguito la simulazione vera (vitest) mettendo un pirata ai piedi di ognuno dei 6 appigli della mappa e comandando "arrampica su" per 10 secondi.

## 2. Cosa non va (per gravità)
1. **Le due scale grandi si fermano a metà, come ha detto il proprietario.** Prova: scala x 428 (cima 765): il pirata si blocca a y 807 e resta appeso, mai in cima. Stesso su x 1618. Causa: l'asse è a 2 px dal muro (muro a x 433-435 tra y 770 e 800) e la capsula è larga 12 (±6): urta il muro. Le liane (930, 1118) e le scale delle torri (202, 1846) arrivano in cima. Con l'asse a 424 o 426 la scala funziona (il pirata sale e passa sul piano: provato).
2. **Il terreno è sfocato.** La texture è 1 px per unità di mondo, ma a zoom 1,4 lo schermo ne mostra ~1,5 e a zoom 2 circa 2,2. Le pelli Magnific nascono da immagini di max 1024 px (download limitato), quindi roccia e crepe sono morbide, con la stessa spirale fossile ripetuta.
3. **Il solo cambiamento possibile del terreno è il cratere.** Torri, ponti e tetti sono legno scavabile ma non cedono mai: nessuna conseguenza (feedback del proprietario del 21/11 sera).
4. **La forma è poco "isola".** La Rocca è una colonna a gradini quadrati, le Mese sembrano lastre con un buco ovale dipinto (le grotte chiuse a x 720/1328 si leggono come oblò). Le due metà sono specchi: ogni partita è lo stesso scambio di parabole sopra la Rocca.
5. **Nessun appoggio per muoversi da pirata.** Sulle terrazze c'è solo pendio liscio: niente muretti da scavalcare, niente corde, niente punti dove dondolare o agganciarsi. I pirati camminano e basta.
6. **Pochi ripari bassi.** Solo 4 cespugli per tutta la mappa.

## 3. Decisioni
1. **Fix scale subito** (S, P1). Asse della scala = bordo del muro − 10…−14 px (nuovo x 424 e 1624). Aggiungere ai test di mappa: "per ogni appiglio un pirata virtuale sale fino in cima" (è la prova che ho fatto).
2. **Cala Pappagallo v3 in alta definizione** (L, P1). Terreno a 2 px per unità: 4096×2048 in 4 tessere 2048×1024 con 64 px di sovrapposizione. La maschera di collisione resta 2048×1024 (il bordo si legge dalla maschera, non dall'alfa). Oggetti a 2048 px. Costo GPU: 32 MB di texture, ok su Pixel 6.
3. **Stesso scheletro, bordi nuovi** (M, P1). Tengo i 4 livelli per lato, Rocca, ponti, arco e gallerie (il Lead design li ha approvati e funzionano). Rifaccio i contorni: cengie, strapiombi e denti ogni 60-90 px invece di gradini quadrati. Tolgo le grotte ovali, le sostituisco con due vere gallerie che sbucano. Asimmetria vera: a destra la Rocca ha il lato dolce e una rampa di sabbia lunga 160 px (scivolata), a sinistra la parete con la scala. Stessi numeri di spawn, stessa equità.
4. **Sostegno strutturale: legno e roccia sottile che si staccano** (L, P1, serve la Fisica). Dopo ogni esplosione i pezzi di legno o di roccia sotto 24 px non più collegati a terra, ferro o ancoraggi cadono come blocco unico e fanno macerie (danno ≤ 12 sotto, niente morte sicura). È l'unica regola nuova e genera tutto il resto: torre di vedetta a 2 piani che crolla verso il colpo; ponte di corda con 2 ancoraggi (tagli uno, il ponte cala di lato e scarica chi è sopra); cengia sopra una galleria che cede.
5. **Tre elementi di livello per lato in Cala** (M, P1): torre che crolla (pali tagliabili), ponte che cede, **masso in bilico** su una cengia della Mesa (un sostegno da 24 px: se salta, rotola giù per la rampa fino alla Valle, danno 20 e spinta). Sono i rompicapo "dove e quando mirare" che il proprietario apprezza: un colpo, tante conseguenze.
6. **Kit di appoggi da pirata** (M, P1, d'accordo con Animazione): muretti e casse alti 24-32 px ogni ~150 px sulle terrazze (si scavalcano con un balzo e fanno riparo); **liane-pendolo** su un varco di 140 px nella Valle (si dondola e ci si lascia andare); 2 **anelli di ferro** per lato (punti per il rampino, 120-260 px dal suolo); 1 pozza di marea profonda 40 px (tuffo senza danno da caduta, non letale). Appigli: restano al massimo 6 per lato.
7. **Prologo a stazioni** (S, P1). Stesso terreno v3, il percorso di Mastro Gancio insegna una mossa e un elemento per volta: 1) molo e muretto (corsa e salto), 2) scala della torre, 3) cannonata al ponte di corda, 4) liana-pendolo, 5) parabola sulla Rocca. Spawn da copione come ora.
8. **Primo scenario "Acque di Casa" (8 isole)** (L, P2). Mappe con un trucco ciascuna, tutte fatte con lo stesso kit: 1A Porto Teschio (a mano, firma): pontili su palafitte che crollano; 1B Baia dei Corvi: gru con carico che cade se tagli la fune; 1C Forte Uncino: bastione di ferro con portone di legno; 1D Scoglio della Vedetta: torre alta e stretta con scale e liane (3 pirati per lato); 1E Scogli del Rum: archi di roccia che crollano; 1F Laguna Nera (grotta): stalattiti che cadono; 1G Secca del Barile: dune con marea alta, barili spiaggiati; 1H Isolotto delle Cozze: palma abbattibile che fa da ponte. Biomi: solo Isola, Porto, Scogliera, Grotta già in 06 §3.
9. **Kit di 12 moduli disegnati + generatore** (L, P2): torre, ponte, rampa, galleria, cengia, arco, molo, gru, muretto, masso, pozza, anello. Il generatore compone sagoma e moduli dal seme. A mano restano Cala e 1A; le altre 6 usano seme fisso validato.
10. **Regole anti-frustrazione estese** (M, P1) a 06 §7: nessun elemento che cede entro 120 px da uno spawn; nessun crollo al turno 1; per ogni elemento un test che lo attiva con un solo colpo e conta il danno massimo.

## 4. Cosa NON fare
- Non allungare ancora la Rocca né aggiungere piani: peggiora le parabole.
- Non rigenerare il terreno Magnific a ≤ 1024 px: sarebbe di nuovo sfocato.
- Non simulare la sabbia che frana in P1 (rimandata: costa troppo per il Pixel 6).
- Non aggiungere acqua che scorre, fuoco che si propaga o altri sistemi nuovi insieme al sostegno strutturale: uno alla volta.
- Non fare mappe 4×4 o più larghe: la camminata di 60 px/s su 2048 px basta.

## 5. Dipendenze e conflitti
- **Fisica**: decisioni 4, 5 e 6 chiedono sostegno strutturale, corpo rigido che rotola, liana-pendolo. Se non c'è la fisica, Cala v3 esce comunque con le decisioni 1-3 e 7.
- **Arte/UI e Animazione**: HD (2) richiede scaricare le immagini a risoluzione piena (oggi il proxy blocca pikaso.cdnpk.net e `creations_read` arriva a 1024 px). Va sbloccato l'host o ripiegare su upscale locale.
- **Tecnica**: `risoluzioneMax` 1,5 → 2 va deciso con la misura dei 60 fps su Pixel 6.
- **Bilanciamento**: danni delle macerie e del masso (20/12 sono ipotesi).
- **Game Design**: armi che usano l'ambiente (rampino, olio, ancora).
- **Narrativa**: le battute del Prologo a stazioni.

## 6. Domande per il proprietario
Nessuna indispensabile.
