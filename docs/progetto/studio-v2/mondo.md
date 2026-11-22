# Mondo — studio v2 (ambientazione, arcipelago, mappa del mondo)

## 1. Cosa ho provato
Ho costruito `claude/m1-integrazione` (c36bb52) e l'ho giocato in Chromium headless a 844×390 e 1080×486 (scala 2): menu → Schermaglia → Cala Pappagallo → camminata, salto, sparo. Screenshot: [menu](img-mondo/menu.png), [battaglia](img-mondo/battaglia-cala-pappagallo.png), [dettaglio 2×](img-mondo/pirata-e-terreno-2x.png). Ho riletto 00 §9, 02, 06 §3, 07 §2, 15, 16.

## 2. Cosa non va
1. **Il gioco non ha un mondo.** Il menu ha solo "Schermaglia"; `src/mondo/` è un README. Nessun mare, rotta o isola da cui salpare (`menu.png`).
2. **Cala Pappagallo non sembra un'isola:** tre blocchi di roccia in un tramonto, senza spiaggia, orizzonte, mare. Il copione (16, c0.inizio) vuole "nebbia all'alba" con scialuppa e molo (`battaglia-cala-pappagallo.png`).
3. **Tre idee di mondo in conflitto:** 03 n.30 (pergamena con 12-16 isole), 00/02 (28 territori), 15 (39 nomi in 8 capitoli e un "rimescolio" al cap. 7). Nessuno dice come si disegna una mappa che le regga tutte.
4. **28 isole su 800×360 non si toccano:** a scala 0,4 un'isola da 100 px logici sta sotto i 48 px CSS minimi.
5. **Nessun legame tra mappa del mondo e terreno di battaglia.**
6. **Il terreno non offre mosse da pirata** (un solo ponte di corda), mentre i pirati scivolano e saltano come vermi (nel mio sparo il pirata si è colpito da solo, PV 70 → 2).
7. **Il terreno è morbido a 2×** rispetto allo sprite (`pirata-e-terreno-2x.png`).

## 3. Decisioni
**D1. Una sola mappa fisica del mare, con le isole come sprite separati.** "Stile fisico" = carta in rilievo vista dall'alto inclinata di ~35° (2.5D), coste con spiaggia, acque basse turchesi e profonde blu, rotte tratteggiate. Ogni isola è un PNG trasparente su un fondale unico, posizione nei dati. Un solo sistema regge mappa intera, capitoli e rimescolio. L. *Pacchetto 2.*

**D2. Il rimescolio del cap. 7 sposta gli sprite.** Due configurazioni di posizioni (mari separati / mondo rimescolato) e 3 s di animazione. La nebbia è una foschia per mare che si alza al capitolo vinto. 15 e 16 restano validi. M. *P2.*

**D3. Il colore della ciurma sta attorno all'isola:** fascia d'onda lungo la costa, bandiera con emblema, segnalino con il numero. Cade la velatura al 35% (03 §5.4), che copre il rilievo. S. *P2.*

**D4. Cala Pappagallo diventa un'isola vera e riconoscibile.** Stessa silhouette sul mondo e in battaglia (Rocca al centro, due colline, relitto a sinistra, torretta a destra). In battaglia: spiaggia con molo e veliero ormeggiato, mare con orizzonte ai lati, alba nebbiosa. Alta definizione: terreno dipinto per tessere, contorno nitido tracciato dal codice sulla maschera. L. *Pacchetto 1.*

**D5. Seme fisso per territorio; l'icona sulla mappa nasce dalla maschera di battaglia** (con la pipeline "pittore"). Il giocatore vede sul mondo la forma dell'isola che poi combatte. M. *P1 (seme) + P2 (icona).*

**D6. Ogni mare ha ora e meteo, ereditati dalla battaglia.** Acque di Casa mattina limpida; Brina aurora azzurra; Smeraldo pomeriggio umido; Oro mezzogiorno dorato; Sole tramonto (quello di oggi); Ossa notte con nebbia; Pappagallo alba nebbiosa. Cielo e mare sono già layer separati. S. *P1 per Pappagallo, P2 per il resto.*

**D7. Una mossa da pirata per bioma, ancorata al terreno.** Isola: liane e palme che piegano. Porto: sartie, pontili, cime tese. Cimitero: alberi maestri inclinati come scivoli. Ghiacci: pendii da scivolare. Scogliera: appigli per il rampino. Grotta: corde. Ogni mappa ha almeno due elementi da pirata a punti fissi; a Pappagallo liane e cime esistono già e vanno rese usabili (le scale oggi si fermano a metà, feedback 6: non l'ho provato, lo segnalo a Livelli). **Ambiente che reagisce** (feedback 5), pensato per bioma: Isola, palme e torretta di legno che crollano a pezzi; Porto, casse e barili in catena, pontili che cedono; Cimitero, alberi maestri che cadono e fanno danno; Ghiacci, lastre che si staccano e il mare che gela; Scogliera, massi in bilico; Grotta, stalattiti. Ogni mappa ha 3-4 elementi del genere. M. *P1.*

**D8. "Primo scenario" = Prologo + cap. 1 "Acque di Casa" intero:** 8 isole, 7 battaglie, 12 rotte (15 §2). Solo biomi Isola e Porto: Porto per 1A (firma), 1B, 1C, 1G (Secca del Barile, barili sul pontile); Isola per 1D, 1E, 1F, 1H. Pappagallo compare sul bordo sud accanto a 1E e 1F (02: A3-B1, A5-B1) con il cartello della Marina abbattuto: non giocabile, ma è da lì che si salpa. L. *P2.*

**D9. Il viaggio dopo il Prologo è una scena sulla mappa vera:** il veliero va da Pappagallo a Porto Teschio con una scia e la nebbia si apre solo su 1A-1H. È la prima volta che il giocatore vede dove si trova. S. *P2.*

**D10. Tocco e zoom:** mappa logica 3072×1728, isole da 140-220 px, hitbox ≥ 56 px CSS a ogni zoom, zoom iniziale sul mare del capitolo. S. *P2.*

## 4. Cosa NON fare
- Non dipingere subito le 28 isole: bastano le 8 di casa, Pappagallo e sagome nella nebbia (Magnific a lotti, tetto deciso dal proprietario).
- Non rifare la pergamena piatta (03 n.30 decade) né i confini vettoriali stile Risiko classico.
- Non generare la mappa del mondo a caso: layout a mano, solo le battaglie sono procedurali.
- Niente shader d'acqua pesante sul Pixel 6: bastano due fondali che scorrono.

## 5. Dipendenze e conflitti
- **Livelli:** semi fissi, elementi da pirata, Pappagallo come isola (D4, D5, D7). Se una maschera non dà un'isola riconoscibile, vince la maschera.
- **Arte/UI:** stile fisico, fasce d'onda, bandiere (D1, D3); sostituisce 03 §5.4 e n.30.
- **Game design e Animazione:** il set di movimenti da pirata deve usare gli elementi di D7, altrimenti D7 resta decorazione.
- **Narrativa e Progressione:** 15 e 16 restano; D2 e D9 li mostrano. Alba del Prologo contro tramonto attuale: vince il copione.
- **Tecnica:** 04 prevede la mappa in SVG di Preact; con 28 sprite dipinti, pan/zoom e nebbia va valutato Pixi.
- **UX:** hitbox e zoom iniziale (D10).

## 6. Domande per il proprietario
Nessuna indispensabile. Ho letto "stile fisico" come carta in rilievo; se intendeva altro cambiano solo D1 e D3.
