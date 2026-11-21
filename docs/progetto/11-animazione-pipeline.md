# 11 · Pipeline di animazione: da Magnific al gioco

*Technical Artist e Animatore. Solo design: gli script sono descritti come contratti (input → output), senza codice. Si basa su 03 §8 (formati, registro, lotto 1) e su 04 (PixiJS 8, registro asset, budget del frame). Se arriverà 05-revisione.md, le sue riconciliazioni prevalgono.*

---

## 1. La catena in 8 passi

| # | Passo | Strumento Magnific | Uscita (sorgente) | Chi controlla |
|---|---|---|---|---|
| 1 | **Immagine di stile** | `images_generate` (4 pirati campione + 1 riquadro di terreno), poi `images_variations` sul migliore | `stile_riferimento.png` | proprietario sceglie 1 |
| 2 | **Personaggio base** | `images_generate` con l'immagine di stile come riferimento; prompt base 03 §8.3 + bandana e fascia **magenta `#FF00FF`**, vista di lato verso destra, figura intera, **fondo verde piatto `#00FF00`**; ritocchi con `images_retouch`; `images_expand` se piedi o cappello toccano il bordo | `pirata_base.png` (≥ 1024 px, figura alta ~70% del quadro) | Technical Artist: test a 44 px |
| 3 | **Video breve su fondo verde** | `video_generate` image-to-video dalla posa base. Durata minima consentita dal modello (se il clip è più lungo, si tiene il tratto buono con `video_cut`). Camera fissa, «in place». Per i cicli in loop si usa la **stessa immagine come primo e ultimo fotogramma**, se il modello lo permette. `simulate_cost` prima di ogni lotto | `<id>_v01.mp4` | `video_view_frames`: la camera non si muove, i piedi restano a terra |
| 4 | **Rimozione sfondo** | `video_remove_background`. Se l'uscita non ha un canale alfa vero (solo un fondo pieno), si usa lo script locale di chiave (§3, S1) sul verde originale | sequenza con alfa | controllo dell'alone verde |
| 5 | **Estrazione fotogrammi** | `video_extract_frames` (oppure lo script S2, più preciso, sul file scaricato) | `frames/0001.png …` | — |
| 6 | **Spritesheet WebP** | nessuno (script S3); `images_upscale` **non serve** per gli sprite: si riduce sempre (da ~700 px a 128) | `<id>.webp` + `<id>.json` | checklist §7 |
| 7 | **Ricolorazione fazione** | nessuno (script S4) | `<id>.<fazione>.webp` × 5 | test daltonismo |
| 8 | **Registro asset** | `creations_rename` sulla creazione finale; l'id Magnific va in `source` | voce in `registry.ts` | `assets:check` verde |

**Piano B per le animazioni che il video sbaglia** (salto, morte, colpito: il modello tende a spostare il personaggio o la camera): `images_character_sheet` sulla posa base per ottenere una griglia di pose, poi `images_split_grid`, poi direttamente il passo 6. Si accettano meno fotogrammi (salto 6, colpito 4), che il codice compensa con squash and stretch.

**Altri strumenti:** `images_remove_background` per gli statici (prop, lapide, palma); `images_upscale` solo per gli statici grandi (`cielo`, `mappa_mondo`, `capitani`), quando la generazione esce sotto la misura a 2× di 03 §8.2; `video_upscale` solo per `menu_vascello` se il modello consegna meno di 720p; `video_speed` per rallentare un clip troppo rapido prima dell'estrazione.

**Organizzazione su Magnific:** un progetto «Pirati» con una cartella per categoria (`PIRATA`, `VFX`, …). Ogni creazione si chiama `<id>__<passo>__v<nn>`, per esempio `pirata_cammina__video__v03`. Si conserva sempre la catena: base → video → alfa. Con `creations_lineage` si ritrova l'origine di qualsiasi sheet.

---

## 2. Regole di produzione per i video

- Prompt video = prompt base + *«locked static camera, no zoom, no pan, character animates in place on the spot, flat pure green #00FF00 background, no shadow on ground, even lighting, no motion blur»* + l'azione (03 §8.4).
- **Niente ombra a terra** nel video: l'ombra la disegna il codice (ellisse al 25%). Un'ombra generata sporca la chiave.
- Il verde non deve comparire sul personaggio: vietati abiti verdi e piante in mano. La Lega di Smeraldo resta verde solo grazie alla ricolorazione.
- Se il personaggio si sposta nel quadro, si corregge in S3 (allineamento dei piedi). Oltre 15% di deriva, si rigenera.
- Massimo **3 tentativi** a clip; al terzo fallimento si passa al piano B.

---

## 3. Script da scrivere (`tools/arte/`, comandi npm `arte:*`)

Ogni asset animato ha un **manifesto** `arte/<cat>/<id>/manifest.json` con: id, cat, sorgente Magnific, intervallo utile (inizio e fine in secondi), N fotogrammi, fps, loop, cella, ancora, tinta. Gli script leggono solo il manifesto: rifare un asset vuol dire cambiare il manifesto e rilanciare.

| Script | Strumento | Input | Output | Note |
|---|---|---|---|---|
| **S1 `arte:chiave`** | ffmpeg (chromakey + despill) | `<id>_vNN.mp4` su verde | `alfa/0001.png …` RGBA | soglia e morbidezza nel manifesto; despill obbligatorio (toglie il riflesso verde sui bordi) |
| **S2 `arte:frames`** | ffmpeg | video o sequenza alfa + intervallo + N | `frames/` con N PNG presi a intervalli regolari | per i loop sceglie il punto di taglio con la minima differenza tra primo e ultimo fotogramma e lo annota nel rapporto |
| **S3 `arte:sheet`** | sharp | `frames/` + manifesto | `public/assets/<cat>/<id>.webp` (una riga, celle quadrate) + `<id>.json` (frames, fps, loop, cols, ancora) | ritaglio sul riquadro **comune** a tutti i fotogrammi (non frame per frame), riduzione alla cella, piedi allineati a y = 120/128 e centro x = 64 cercando il pixel opaco più basso della sagoma; WebP qualità 85 con alfa |
| **S4 `arte:tinta`** | sharp | sheet con magenta + tabella colori di 03 §2 | `<id>.<fazione>.webp` per 4 fazioni + neutrale | ogni pixel con tinta vicina a 300° e saturazione alta prende il colore della fazione e conserva la propria luminosità; sui bordi antialias fonde in proporzione a «quanto è magenta». Scarta l'asset se sopravvive del magenta |
| **S5 `arte:atlante`** | sharp | sheet di una scena (battaglia: pirati di 2 fazioni, VFX, prop) | `public/assets/atlanti/<scena>[.<fazione>].webp` + JSON nel formato spritesheet di Pixi | pagine al massimo 2048×2048, spazio di 2 px ed estrusione del bordo di 1 px contro le linee fantasma; nessuna mipmap |
| **S6 `arte:check`** | sharp | tutto `public/assets` + registro | rapporto testuale, codice d'uscita ≠ 0 se fallisce | applica in automatico la checklist §7 (misure, peso, alone, deriva dei piedi, scatto del loop, magenta residuo) |
| **S7 `arte:anteprima`** | sharp + HTML statico | sheet | `arte/anteprima/<id>.html` e una GIF: animazione a 44 px CSS su sabbia, su cielo e su notte, a 1× e 3× | è il «foglio di firma» che il proprietario guarda dal telefono |

`assets:check` di 04 diventa l'unione del vecchio controllo del registro con S6.

---

## 4. Convenzioni di nomi e cartelle

```
arte/                         sorgenti pesanti, NON nel bundle
  <cat>/<id>/manifest.json
  <cat>/<id>/<id>_base.png  <id>_v01.mp4  alfa/  frames/
  anteprima/
public/assets/                solo quello che spedisce l'APK
  <cat>/<id>.webp + <id>.json             (cat in minuscolo: pirata, vfx…)
  <cat>/<id>.<fazione>.webp               (ricolorati)
  atlanti/<scena>.<fazione>.webp + .json  (generati, mai a mano)
```

- id in `minuscolo_con_trattino_basso`, in italiano, uguali a quelli di 03 §8.4. Per le animazioni il prefisso è il soggetto e il suffisso l'azione: `pirata_cammina`, `pappagallo_vola`.
- Le fazioni si identificano con l'id di `contenuti/ciurme.ts`, mai con il colore nel nome del file.
- Versioni: solo nelle sorgenti (`_v03`). In `public/assets` c'è sempre e solo l'ultima approvata, con lo stesso nome, così il registro non cambia.

---

## 5. Segnaposto animati

Principio: il segnaposto ha già **ancora, durata, numero di fotogrammi ed eventi** dell'asset vero (letti dalla stessa voce del registro). Così la sostituzione cambia l'aspetto ma non i tempi di gioco: la morte dura sempre 10 f a 12 fps = 833 ms, anche come forma geometrica.

**In battaglia (Pixi):** ogni forma si disegna **una sola volta** con Graphics, si converte in texture e si anima solo con trasformazioni (posizione, scala, rotazione, alfa, tinta). Si mantiene il batching e non si ridisegna ogni frame.

| Asset | Segnaposto | Animazione |
|---|---|---|
| `pirata_*` | capsula (corpo) + cerchio (testa) nel colore fazione, fascia scura con l'**emblema** in bianco, occhio che indica il verso | idle: scala Y 1 → 0,97, ciclo di 1 s · cammina: saltello di ±2 px e inclinazione di ±6° a 12 fps · salto: schiacciata 1,2×0,8 → allungata 0,85×1,2 · colpito: lampo bianco e tremolio di 3 px · morte: rotazione di 360°, rimpicciolimento fino a 0 e 5 cerchi di fumo |
| `braccio_arma` | rettangolo arrotondato col perno sulla spalla | rotazione dal codice (come l'asset vero) |
| `esplosione` | cerchio arancione che si espande da 0 a R in 150 ms, poi diventa giallo e svanisce; 6 cerchi grigi che salgono | 500 ms |
| `splash` / `fumo` | 3 ellissi azzurre verso l'alto / cerchi grigi | durata dell'asset vero |
| `bandiera` | rettangolo colore fazione + emblema | onda: skew Y ±8° a 1 Hz |
| `schiuma`, mare | strisce di colore piatto `--mare-*` | scorrimento del codice (identico a quello finale) |
| prop | sagoma geometrica col colore del materiale e glifo | statico |

**Nella UI (Preact + CSS):** `menu_vascello` diventa un gradiente da tramonto con un triangolo-vela che ondeggia (rotazione di ±3°, ciclo di 4 s); i ritratti dei capitani sono cerchi del colore fazione con l'emblema. Si animano solo `transform` e `opacity`, con i token di 03 §7; con le **animazioni ridotte** tutto si ferma sulla posa neutra.

Ogni segnaposto mostra in modalità sviluppo un puntino magenta nell'angolo: si vede a colpo d'occhio cosa manca.

---

## 6. Budget memoria texture (Android medio: Snapdragon serie 6, 4 GB)

Conta il **pixel decodificato**, non il peso del WebP: larghezza × altezza × 4 byte. Tetto in battaglia: **64 MB di texture**, obiettivo 48. Tra una scena e l'altra si scaricano le texture (mappa e battaglia non convivono in memoria).

| Voce (battaglia) | Misura in GPU | MB |
|---|---|---|
| Pirati: atlante per fazione (37 fotogrammi da 128 + bracci) 1024×1024, **solo le 2 fazioni in campo** | 2 × 4 | 8 |
| Terreno: 32 tile 256×256 (più 8 MB di canvas in RAM, fuori da questo conto) | | 8 |
| Texture sorgente di terra, sabbia e roccia (512²) | si liberano dopo aver dipinto le tile | 0 |
| Cielo: caricato a 1024×512 e ingrandito (è sfumato) | | 2 |
| Isole lontane 2048×512 | | 4 |
| Mare (2 strisce + schiuma) | | 2 |
| VFX: atlante 2048×768 (esplosione 12 + splash 10 + fumo) | | 6 |
| Prop, proiettili, bandiere ×2, lapide: atlante 1024×1024 | | 4 |
| Testi e HUD in Pixi | | 1 |
| **Totale asset** | | **35** |
| Framebuffer (1440×810 a risoluzione 1,5, doppio) | | ~10 |

Regole: pagine ≤ 2048 px (gli sheet a riga unica fino a 4096 di 03 §8.2 sono solo formato intermedio: in battaglia si usa l'atlante di S5); niente mipmap sugli sprite; un atlante per scena. **Qualità bassa** (impostazione automatica se `deviceMemory` ≤ 3 GB): atlanti dei pirati e dei VFX a metà risoluzione, un quarto della memoria. Mappa del mondo: `mappa_mondo` 9,4 MB + capitani 3 MB, scaricati prima della battaglia. Il video del menu si mette in pausa e si rilascia fuori dal menu.

---

## 7. Checklist di accettazione (per ogni asset animato)

1. **Leggibilità:** dall'anteprima S7 a 44 px si capisce l'azione su sabbia, su cielo e su notte.
2. **Stile:** confrontato con l'immagine di stile: luce da sinistra in alto, ombre fredde, contorno solo sulla silhouette, niente nero puro.
3. **Alfa:** nessun alone verde (S6: zero pixel di bordo con G > R + B + 40), nessun pixel semitrasparente isolato fuori dalla sagoma.
4. **Ancora:** piedi a y = 120 ± 2 px in tutti i fotogrammi a terra, centro a x = 64 ± 3.
5. **Loop:** differenza tra l'ultimo e il primo fotogramma sotto la media tra fotogrammi consecutivi; a occhio nessuno scatto in 10 ripetizioni.
6. **Tempi:** N, fps e loop identici al registro e al segnaposto che sostituisce.
7. **Fazioni:** zero magenta residuo; le 5 varianti generate; turchese e rosso distinguibili nella simulazione di deuteranopia.
8. **Peso:** sheet ≤ 300 KB, statici ≤ 400 KB; budget §6 rispettato (S6 somma i MB della scena).
9. **Tracciabilità:** `source: 'magnific:<id>'` compilato, manifesto presente, creazione rinominata su Magnific.
10. **Sul telefono:** APK di prova (`apk-prova`), 60 fps nella battaglia di prova con 8 pirati animati e 3 esplosioni.

---

## 8. Animazioni che mancano al lotto 1

Il combattimento (01 §5) usa 16 armi, mentre il lotto 1 ne illustra 8. Prima di M5 vanno aggiunte, con lo stesso metodo: `pappagallo_vola` (6 f in loop), `scimmia_corre` (6 f in loop), `kraken_tentacolo` (12 f, una volta), `galeone_bordata` (sagoma statica + VFX della vampa), `fiamma` (6 f in loop, per la molotov), `mina_conchiglia` (2 f, lampeggio). Fino ad allora restano segnaposto (§5). Rampino e catena si disegnano con linee nel codice.

---

## Domande per il proprietario

1. **Nomi e colori delle fazioni non coincidono** tra 02 (Teschio Rosso, Corsari del Gelo, Fratellanza dell'Oro, Dannati della Marea + Marina Reale) e 03 (Corallo, Teschi Rossi, Corona Viola, Lega di Smeraldo). La ricolorazione ne ha bisogno: quale elenco vale, e la Marina usa il grigio «neutrale»?
2. **Budget Magnific:** il lotto 1 richiede circa 13 video, più 2–3 tentativi l'uno. Quanti crediti si possono spendere per ogni lotto?
3. **Sorgenti pesanti** (video, PNG dei fotogrammi): propongo di tenerle solo su Magnific e in `arte/`, esclusa da git, versionando soltanto i manifesti. Va bene?
