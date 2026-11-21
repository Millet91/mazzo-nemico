# 03 · Stile visivo, UI/UX e pipeline asset Magnific

*Art Director / UI-UX lead. Solo design, niente codice di gioco. Riusa il metodo del vecchio `registry.ts` (segnaposto glifo, sostituibile asset per asset).*

---

## 1. Direzione artistica: «Cartoon 2.5D da arcipelago, ora d'oro»

**Scelta:** personaggi e terreni in **cartoon 2.5D pulito**: forme dipinte in 2D ma con volume (ombreggiatura morbida a 3 toni + luce di contorno calda), contorno scuro sottile solo sulla silhouette esterna, nessun contorno interno. **Colori saturi**, **luce calda da tramonto** che arriva da sinistra in alto, ombre fredde blu-viola (mai grigie o nere). Pirati **caricaturali e simpatici**: 2,5 teste di altezza, testa grande, mani grandi, occhi espressivi, niente sangue (si muore in uno sbuffo e resta una lapide).

**Riferimenti di genere** (non IP): cartoon d'avventura per famiglie, giochi mobile di strategia «casual-midcore» con personaggi giocattolo, illustrazione da libro per ragazzi con luce cinematografica, diorami in plastilina/vinile per il volume.

**Perché:**
- Su un telefono i pirati in battaglia sono alti **~44 px CSS**: servono silhouette tonde, teste grandi e un colore di squadra forte. Il realismo sparisce a quella scala.
- Il terreno distruttibile viene «scavato» dal codice: una texture dipinta e uniforme (sabbia, terra, roccia) regge bene i bordi dei crateri; un 3D vero no.
- Colori saturi e luce calda = «moderno» e leggibile anche al sole; si distingue dal pirata cupo/realistico.
- È uno stile che i modelli di immagine reggono in modo **coerente** tra un asset e l'altro (vedi §8: un'immagine di stile di riferimento usata ovunque).

**Mondo:** arcipelago di fantasia tropicale-temperato (isole, scogliere, relitti, fortini di legno). Niente bandiere o simboli reali.

---

## 2. Palette (esadecimali)

### UI
| Token | Hex | Uso |
|---|---|---|
| `--notte` | `#0E1B26` | fondo app, scrim |
| `--abisso` | `#13293A` | pannelli scuri (HUD) |
| `--legno-scuro` | `#3B2416` | cornici, pulsanti secondari |
| `--legno` | `#6B4226` | superficie pannelli legno |
| `--pergamena` | `#F5E6C4` | carte informative, mappa |
| `--pergamena-ombra` | `#D9C39A` | bordi/ombre pergamena |
| `--inchiostro` | `#2B1B10` | testo su pergamena |
| `--testo` | `#FFF7E8` | testo su scuro |
| `--testo-dim` | `#B8C4CC` | testo secondario su scuro |
| `--oro` | `#FFC83D` | **azione principale**, valuta, selezione |
| `--oro-ombra` | `#C78A12` | bordo inferiore 3D del pulsante oro |
| `--pericolo` | `#FF4D4D` | danno, conferme distruttive |
| `--ok` | `#4ADE80` | cura, conferme |
| `--info` | `#4CC9F0` | vento, suggerimenti |

### Mare e cielo
`--mare-fondo #0B3D5C` · `--mare-medio #116A8C` · `--mare-basso #2FB3C4` · `--schiuma #E6FBFF` · `--cielo-alto #6EC6F0` · `--cielo-orizzonte #FFD3A1` · `--sole #FFB86B` · `--nuvola-ombra #C9A7D9`

### Terreno
`--erba #6CC24A` · `--erba-luce #A6E36B` · `--sabbia #F2D38B` · `--terra #8A5A3A` · `--terra-profonda #5A3B28` · `--roccia #8A7A6A` · `--bordo-bruciato #2A1A12` (contorno dei crateri, 3 px)

### Fazioni (colore + emblema + motivo bandiera: mai solo il colore)
| Fazione | Colore | Scuro | Emblema | Bandiera |
|---|---|---|---|---|
| Giocatore · *Ciurma del Corallo* | `#22C7D9` | `#0F7C8A` | conchiglia | strisce orizzontali |
| *Teschi Rossi* | `#E5484D` | `#8E1F23` | teschio con bende | diagonale |
| *Corona Viola* | `#9B6BFF` | `#5631B0` | corona a tre punte | quartata |
| *Lega di Smeraldo* | `#3DBE6A` | `#1E7A3F` | ancora e foglia | bordo dentellato |
| Neutrale / non conquistato | `#A8A29E` | `#57534E` | — | — |

Il turchese del giocatore e il rosso dei nemici principali restano distinguibili anche per deuteranopia (luminosità diversa); per le altre coppie decide l'emblema.

---

## 3. Tipografia (Google Fonts, licenza OFL, via `@fontsource`)

- **Display: Lilita One** (400). Titoli, nomi schermata, banner «Tocca a te!», numeri di danno. Massiccia, arrotondata, da mobile game; leggibile a 18 px. Sempre con contorno scuro 2–3 px (`paint-order: stroke`) quando sta sopra il gioco.
- **Testo: Nunito** (variabile 400–900). Tutto il resto. Arrotondata come la display, numeri tabellari (`font-variant-numeric: tabular-nums`) per timer, PV e truppe.
- Scala (px CSS): 12 (solo etichette secondarie) · 14 (corpo) · 16 (pulsanti) · 20 (sottotitoli) · 28 (titoli) · 44 (banner) · 64 (logo/vittoria).
- Si eliminano Inter e Cinzel del vecchio progetto.

---

## 4. Componenti

**Decisione:** due materiali, ciascuno al suo posto.
1. **Legno e pergamena «puliti»** nei menu e nella mappa: superfici piatte con texture leggerissima (opacità 8%), angoli 16 px, niente chiodi o graffi realistici. Il sapore piratesco viene da colore e dettagli (corda sul bordo superiore dei pannelli, chiodini d'oro negli angoli), non da texture pesanti.
2. **Pannelli «abisso» semitrasparenti** in battaglia: `#13293A` al 85%, bordo 1 px `#FFFFFF22`, angoli 14 px. **Niente `backdrop-filter` blur** sopra il canvas: nelle WebView Android di fascia media costa 5–10 ms a frame. Glassmorphism vero solo su schermate statiche (menu, impostazioni).

| Componente | Specifica |
|---|---|
| Pulsante primario | oro `#FFC83D`, testo `--inchiostro` Nunito 900 16 px, altezza 56, raggio 14, bordo inferiore 4 px `--oro-ombra`. Premuto: −3 px in Y, bordo 1 px, vibrazione leggera |
| Pulsante secondario | `--legno`, testo `--testo`, bordo inferiore 4 px `--legno-scuro`, altezza 48 |
| Pulsante icona | cerchio 48 (HUD 56), fondo abisso, icona 28 |
| Pannello pergamena | `--pergamena`, ombra interna `--pergamena-ombra`, ombra esterna `0 6 0 #0004`, padding 16 |
| Pannello legno | `--legno`, bordo 3 px `--legno-scuro`, striscia di corda in alto (asset 9-slice) |
| Slider | binario 12 px abisso, riempimento colore fazione, pomello 40 px a forma di doblone oro con il numero dentro |
| Badge / chip | pillola alta 28, Nunito 800 14 |
| Barra vita | 6 px sopra il pirata, colore fazione, bordo nero 1 px; numero PV sopra in Nunito 900 13 con contorno |

---

## 5. Schermate (orizzontale; riferimento 800×360 px CSS = 20:9, scala in su)

Zone in percentuale della larghezza (L) e dell'altezza (A), **dentro l'area sicura**. Gli sfondi arrivano fino al bordo, i comandi mai.

1. **Splash**: sfondo cielo dell'ora d'oro a tutto schermo; logo al centro (60% L); in basso barra di caricamento a forma di miccia che brucia (40% L, al 85% A). Massimo 2 s, poi menu.
2. **Menu principale**: sinistra 55% L, vascello in mare (video in loop o immagine con parallasse); destra 45% L, colonna di pulsanti: **Gioca/Continua** (primario), Nuova campagna, Schermaglia, Impostazioni. In alto a destra: icone suono e info (48 px).
3. **Selezione ciurma**: 4 carte capitano affiancate (ognuna 22% L × 70% A, ritratto, emblema, nome, tratto). Toccata = si alza di 12 px e diventa luminosa. In basso a destra il primario «Salpa!»; in basso a sinistra il campo nome della ciurma.
4. **Mappa del mondo (Risiko)**: mappa pergamena a tutto schermo, pan e zoom con due dita. Ogni paese è colorato col colore della fazione (velatura al 35%) e ha un **segnalino** con il numero di pirati. Barra in alto (alta 44): turno, dobloni, fazione attiva. Toccando un paese si apre un **pannello laterale destro** (34% L): nome, proprietario, truppe, pulsanti «Sposta» e «Attacca». Pulsante «Fine turno» in basso a destra (primario). Le frecce di movimento sono archi tratteggiati animati dal paese di partenza a quello di arrivo.
5. **Preparazione attacco**: a sinistra il tuo paese, a destra il bersaglio (ritratti delle isole, 30% L ciascuno), al centro «VS». Sotto: **slider pirati** da 1 al massimo spostabile (lascia almeno 1 pirata a casa), con pulsanti −/+ da 48 px ai lati per la precisione. Sotto lo slider, la fila dei pirati scelti come icone (si aggiunge/toglie con un piccolo salto). Avviso di rischio («3 contro 5») colorato. In basso: «Annulla» (secondario, sinistra) e «All'arrembaggio!» (primario, destra).
6. **Battaglia, HUD**: canvas a tutto schermo.
   - In alto al centro: **timer del turno** (cerchio 56) e **indicatore vento** (freccia + barra, 120×28) accanto.
   - In alto a sinistra e a destra: **barre totali squadra** (PV complessivi, 140×14 ciascuna) con l'emblema.
   - In basso a sinistra (pollice sinistro): **◀ ▶** 64×64 e **salto** 56.
   - In basso a destra (pollice destro): **pulsante arma** (64, mostra l'arma attiva, apre il radiale) e **FUOCO** (80, tieni premuto per caricare la potenza; anello di carica attorno).
   - Mira: trascinare sul pirata o sul terreno sopra di lui. Un mirino tratteggiato segue il dito. Camera: trascinare con un dito lontano dal pirata, pizzicare per lo zoom.
   - Banner centrali temporanei («Tocca a te!», «Turno dei Teschi Rossi»): 44 px Lilita, restano 1,2 s.
7. **Selettore armi radiale**: si apre dal pulsante arma con un arco di **240°** verso l'alto-sinistra (resta dentro lo schermo), raggio 130 px, fino a 8 spicchi da 64 px. Al centro il nome dell'arma e le munizioni. Scorri e rilascia per scegliere, oppure tocca. Armi finite: in grigio con lucchetto. Il gioco resta in pausa visiva (scrim al 40%).
8. **Fine battaglia**: pannello pergamena centrale (60% L × 75% A): esito in grande, superstiti (icone pirata), pirati persi, dobloni, paese conquistato o no. Un solo primario: «Torna alla mappa». Sullo sfondo resta la battaglia, scurita e sfocata.
9. **Vittoria / sconfitta della campagna**: a tutto schermo. Vittoria: tramonto, bandiera del giocatore issata (animata), coriandoli-dobloni, statistiche in 3 colonne. Sconfitta: notte, mare mosso, relitto, testo «La ciurma è affondata». Pulsanti «Nuova campagna» e «Menu».
10. **Impostazioni**: modale vetro (qui il blur è permesso) 70% L: musica/effetti (slider), vibrazione, **mano dominante** (inverte i lati dell'HUD), dimensione testo (100/115/130%), **animazioni ridotte**, lingua. Chiusura con una X da 48 px in alto a destra e con il tasto indietro di Android.

---

## 6. Leggibilità: pollici, notch, telefono

- **Area sicura:** `padding: max(env(safe-area-inset-left), 12px)` su tutti i lati. In orizzontale il notch è a **sinistra o a destra** (fino a 48 px): nessun comando entro 56 px dal bordo corto; il gioco li sposta se cambia la rotazione.
- **Barra dei gesti Android:** comandi in basso ad almeno 16 px dal bordo inferiore. Il trascinamento della camera non parte entro 24 px dai bordi laterali (lì c'è il gesto indietro).
- **Target:** minimo 48×48 px CSS (9 mm), azioni di battaglia ≥ 56, FUOCO 80. Distanza tra target ≥ 8 px.
- **Pollici:** le azioni frequenti stanno nei **due angoli in basso**, le informazioni in alto al centro. Nulla di importante sta sotto il punto in cui il pollice copre il pirata: i tooltip compaiono sopra il dito.
- **Testo:** minimo 14 px (12 solo per etichette non essenziali). Sopra il canvas sempre con contorno scuro o su un pannello. Contrasto ≥ 4,5:1 (oro su inchiostro 9:1, testo su abisso 13:1).
- **Squadre:** colore + emblema sulla bandana + nome sopra la testa; il pirata attivo ha una freccia rimbalzante e un anello a terra.
- Gli schermi da 18:9 a 21:9 allargano solo lo sfondo; i menu stanno in un palco centrale di al massimo 900 px.

---

## 7. Animazioni di UI

Si animano solo `transform` e `opacity`. Token: `rapida 120 ms`, `media 220 ms`, `lenta 400 ms`; curva standard `cubic-bezier(.2,.8,.2,1)`; popup con rimbalzo (scala 0,9 → 1,04 → 1).
- **Pressione:** abbassamento di 3 px in 120 ms più vibrazione leggera; al rilascio torna su con un piccolo rimbalzo.
- **Cambio schermata:** «onda» diagonale con la tinta del mare che copre e scopre, 400 ms. Con le animazioni ridotte: dissolvenza di 150 ms.
- **Pannelli:** entrano scivolando di 24 px più dissolvenza, 220 ms. Gli elementi di una lista entrano sfalsati di 30 ms.
- **Banner di turno:** scende dall'alto in 300 ms, resta 1,2 s, esce in 200 ms.
- **Numeri di danno:** salgono di 40 px in 800 ms con una scala 1,3 → 1, poi svaniscono; in rosso con contorno.
- **Contatori** (dobloni, truppe): le cifre scorrono, 400 ms.
- **Radiale:** si apre con scala 0,6 → 1 in 180 ms, spicchi sfalsati di 20 ms; lo spicchio sotto il dito si ingrandisce a 1,15.
- **Mappa:** il paese conquistato si ricolora come inchiostro che si allarga (600 ms) e la bandierina sale.
- **Idle:** i segnalini dei paesi «respirano» (scala ±3%, 2 s); il pulsante FUOCO pulsa solo quando la mira è pronta.

---

## 8. Pipeline asset Magnific

### 8.1 Registro (evoluzione del vecchio `registry.ts`)
Stesso principio: ogni voce ha un `glyph` segnaposto; `image` (o `sheet`) la sostituisce quando c'è. Campi nuovi:
```
id, cat, w, h, tipo: 'statico' | 'anim' | 'video' | 'tile' | '9slice' | 'svg',
anim?: { frames, fps, loop, cols, ancora: [x,y] }, tinta?: 'fazione', source?: 'magnific:<id>'
```
Cartelle: `public/assets/<cat>/<id>.webp`. Categorie: `PIRATA`, `TERRENO`, `MARE`, `SFONDO`, `PROP`, `ARMA`, `PROIETTILE`, `VFX`, `MAPPA`, `FAZIONE`, `RITRATTO`, `UI`.

### 8.2 Formati tecnici
- **Statici:** WebP con alfa, qualità 85, consegna a **2×** la dimensione indicata.
- **Animati, spritesheet:** WebP con alfa, **una riga orizzontale**, celle quadrate tutte uguali, nessun margine. Il personaggio sta sempre nello stesso punto: piedi a y = 120/128, centro x = 64. Limite 4096 px di larghezza.
- **Pirati:** cella **128×128** (a schermo ~44 px CSS, ×3 dpr ≈ 132 px reali).
- **Colore di squadra:** il pirata si genera **una sola volta**, con bandana e fascia in **magenta piatto `#FF00FF`**. Uno script di build (sharp) sostituisce il magenta con il colore di ciascuna delle 4 fazioni, con chiaro/scuro conservati. Si ottengono 4 sheet con zero generazioni in più. Le bandiere funzionano allo stesso modo.
- **Come ottenere le animazioni con Magnific:** posa base (images_generate con l'immagine di stile) → clip breve image-to-video da 2–3 s su **fondo verde piatto**, camera fissa → rimozione dello sfondo dal video → estrazione dei frame → scelta di N frame a intervalli regolari → montaggio dello sheet. Per le pose singole o i cicli difficili (salto, morte): images_character_sheet sulla stessa posa base, poi divisione della griglia.
- **Video** (solo menu e splash): WebM VP9 più MP4 H.264 di riserva, 1280×720, 6 s in loop perfetto, ≤ 3 MB, senza audio, con poster WebP.
- **Mare:** **niente spritesheet**. Tre strisce ripetibili statiche, mosse dal codice (scorrimento più onda sinusoidale); animata solo la cresta di schiuma.
- **Mira:** il corpo usa il frame `pirata_mira`; braccio e arma sono uno sprite separato che il codice ruota (perno sulla spalla).

### 8.3 Prompt base comune (in inglese, rende meglio con i modelli; da incollare in ogni richiesta)
> *Stylized 2.5D cartoon game asset, clean painted shapes with soft 3-tone shading and warm rim light, golden-hour sunlight from top-left, cool blue-violet shadows, highly saturated tropical colors, thin dark outline on outer silhouette only, chunky toy-like proportions, readable at small size, mobile game quality, no text, no logos, no real flags, no blood.* + per gli sprite: *isolated, centered, transparent background (or flat #00FF00 background for video), full body, side view facing right.*

**Prima di tutto:** generare 4 pirati campione e 1 riquadro di terreno, scegliere lo stile e usare quell'immagine come **riferimento di stile** in tutte le richieste successive. Ogni sprite va controllato a 44 px prima di accettarlo.

### 8.4 Lotto 1: indispensabile per la prima battaglia e la mappa (32 asset)

| # | id | cat | dim. (1×) | tipo | prompt specifico (dopo il prompt base) |
|---|---|---|---|---|---|
| 1 | `pirata_base` | PIRATA | 128 | statico | *chubby cheerful pirate, big head, striped shirt, flat #FF00FF bandana and waist sash, boots, standing neutral pose* (posa madre di tutte le animazioni) |
| 2 | `pirata_idle` | PIRATA | 128 | anim **8 f, 8 fps, loop** | *idle breathing, slight bob, blinks once* |
| 3 | `pirata_cammina` | PIRATA | 128 | anim **8 f, 12 fps, loop** | *walk cycle in place, side view* |
| 4 | `pirata_salto` | PIRATA | 128 | anim **6 f, 12 fps, una volta** | *crouch, jump up, airborne tuck, land* (il frame 4 è quello in volo, ripetuto finché è in aria) |
| 5 | `pirata_colpito` | PIRATA | 128 | anim **4 f, 16 fps, una volta** | *recoil hit, squash, dizzy stars* |
| 6 | `pirata_morte` | PIRATA | 128 | anim **10 f, 12 fps, una volta** | *comic defeat: spins, poofs into smoke cloud* (poi il codice mette la lapide) |
| 7 | `pirata_mira` | PIRATA | 128 | statico | *aiming stance without arms, legs planted* |
| 8 | `braccio_arma` | PIRATA | 96×48 | statico | *arm holding blunderbuss, pivot at shoulder on left edge* |
| 9 | `lapide` | PROP | 64 | statico | *small wooden cross with pirate hat on it, sand mound* |
| 10 | `cielo` | SFONDO | 2048×1024 | statico | *tropical sky at golden hour, big soft clouds, sun low on left, no land* |
| 11 | `isole_lontane` | SFONDO | 2048×512 | statico alfa | *distant island silhouettes and a fort, hazy, atmospheric perspective* (parallasse) |
| 12 | `mare_fondo` | MARE | 1024×256 | tile | *seamless horizontal deep sea water band, gentle waves* |
| 13 | `mare_fronte` | MARE | 1024×128 | tile | *seamless foreground wave band with foam, translucent* |
| 14 | `schiuma` | MARE | 256×64 | anim **8 f, 10 fps, loop** | *foam crest rolling* |
| 15 | `terreno_terra` | TERRENO | 512 | tile | *seamless packed earth with pebbles and roots, cross-section* (riempimento distruttibile) |
| 16 | `terreno_sabbia` | TERRENO | 512 | tile | *seamless beach sand cross-section, shells* |
| 17 | `terreno_roccia` | TERRENO | 512 | tile | *seamless layered cliff rock cross-section* |
| 18 | `bordo_erba` | TERRENO | 512×64 | tile | *seamless grassy top edge strip with tufts, transparent below* |
| 19 | `palma` | PROP | 192×320 | statico | *leaning palm tree* |
| 20 | `barile_polvere` | PROP | 64 | statico | *gunpowder barrel with skull mark* (esplode se colpito) |
| 21 | `cassa_bottino` | PROP | 64 | statico | *wooden supply crate with rope* (paracadutata) |
| 22 | `relitto` | PROP | 512×256 | statico | *broken ship hull half sunk, usable as terrain piece* |
| 23 | `proiettili` | PROIETTILE | 4 × 48 | sheet statico 4 celle | *cannonball, round bomb with fuse, grenade jar, dynamite stick* |
| 24 | `esplosione` | VFX | 256 | anim **12 f, 24 fps, una volta** | *cartoon explosion, orange-yellow core, round smoke puffs, debris* |
| 25 | `splash` | VFX | 256 | anim **10 f, 24 fps, una volta** | *water splash column* |
| 26 | `fumo` | VFX | 128 | anim **8 f, 12 fps, una volta** | *dust and smoke puff* |
| 27 | `bandiera` | FAZIONE | 128×96 | anim **8 f, 10 fps, loop** | *pirate flag waving on pole, cloth #FF00FF* (ricolorata per fazione, emblema sovrapposto) |
| 28 | `emblemi` | FAZIONE | 4 × 128 | svg | *flat emblem icons: seashell, bandaged skull, three-point crown, anchor with leaf* (SVG monocromo, tinta CSS) |
| 29 | `icone_armi` | ARMA | 8 × 96 | sheet statico 8 celle | *icons: cannon, blunderbuss, bomb, cluster bomb, powder barrel, cutlass, anchor drop, kamikaze parrot* (da allineare all'elenco armi del documento sul combattimento) |
| 30 | `mappa_mondo` | MAPPA | 2048×1152 | statico | *hand-painted parchment sea chart of an invented archipelago, 12–16 islands, compass rose, sea monsters in margins, no labels* (i confini sono vettoriali nel codice, sopra) |
| 31 | `capitani` | RITRATTO | 4 × 384×512 | statico | *half-body captain portraits, one per faction color: teal, red, violet, green, heroic friendly pose* |
| 32 | `menu_vascello` | SFONDO | 1280×720 | **video 6 s loop** | *pirate galleon sailing on gentle waves at sunset, camera slowly drifting, seamless loop* (poster = primo frame) |

Più gli asset UI fatti in CSS (pulsanti, slider, pannelli) e, se servono, `corda_9slice` (256×48) e `logo` (1024×512) nel lotto 2.

### 8.5 Lotto 2 (dopo la prima battaglia giocabile)
Varianti di pirati (cappello, uncino, gamba di legno: solo testa e accessori come sovrapposizioni), bracci per ogni arma, VFX (scia del proiettile, fiamma, scintille, onde d'urto), elementi delle isole (fortino, pontile, cannoniere), logo, cornici a corda 9-slice, sfondi per vittoria e sconfitta (video da 6 s), segnalini e nuvole della mappa.

### 8.6 Controllo di accettazione per ogni asset
1. Leggibile a dimensione reale. 2. Palette rispettata (ombre fredde, niente nero puro). 3. Alfa pulito, senza alone verde. 4. Negli sheet, i piedi non saltano tra un frame e l'altro (tolleranza 2 px). 5. Loop senza scatto. 6. Peso: sheet ≤ 300 KB, statici ≤ 400 KB. 7. Compilare `source: 'magnific:<id>'` nel registro.
