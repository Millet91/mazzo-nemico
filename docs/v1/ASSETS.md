# Asset: come sostituire i segnaposto

Tutti i riferimenti grafici e sonori passano da **`src/assets/registry.ts`**. Oggi ogni voce ha solo un `glyph` (un simbolo segnaposto). Per mettere l'asset definitivo:

1. salva il file in `public/assets/<categoria>/<id>.webp` (o `.png`, `.svg`; per i suoni `.ogg`/`.mp3`);
2. in `registry.ts` aggiungi `image: 'assets/<categoria>/<id>.webp'` (o `sample:` per i suoni) alla voce con lo stesso id;
3. facoltativi: `image2x` (versione retina), `source` (es. `'magnific:<id creazione>'`, per ritrovarla), `tint` (filtro CSS per sigilli monocromi).

`npm run assets:check` elenca le voci ancora segnaposto; `tests/registro.test.ts` controlla che ogni carta, difesa, scena e suono usato abbia una voce e che i glifi dei nemici non si ripetano.

Il componente `Art` mostra l'immagine se c'è, altrimenti il glifo: si possono sostituire gli asset uno alla volta.

## Elenco

| Registro | Voci | Uso | Dimensione consigliata |
|---|---|---|---|
| `ENEMY_ART` | 30 sventure, 3 élite, 3 Mazzieri, gettoni (Copia, Scartina, Corvo, Disperazione) | illustrazione al centro della carta | 256×256, leggibile a 96 px, sfondo trasparente |
| `DEFENSE_ART` | 37 difese | sigillo d'inchiostro dentro la forma della famiglia | 128×128, monocromo oro su trasparente |
| `SEME_ASSET` | 4 semi + Neutra + Mazziere | icona del seme in alto a destra della carta | 64×64 |
| `SCENE_ART` | porta, lume, mazzo, Mazzieri, nodi della mappa, 4 Bari, 10 eventi | scene e ritratti | 512×512 (eventi), 128×128 (icone) |
| `FRAME_ART` | cornici per seme, élite, Patto, Corrotto | cornice della carta, centro trasparente | 256×354 |
| `OVERLAY_ART` | gelo, brucia, corazza, notte, bottino, silenzio | stati sopra la carta | 256×354 con alfa |
| `VFX_ART` | colpo, morte, impatto, combo, raggio | effetti della risoluzione (oggi in CSS) | spritesheet 6-8 frame, 256×256 |
| `SOUNDS` | 29 cue | effetti | ogg, mono, < 1 s |
| `MUSIC` | 9 stem | musica adattiva (GDD §11.2) | ogg in loop a 96 BPM |

Gli id corrispondono a quelli in `src/content/enemies.ts` e `src/content/defenses.ts`.

## Regole visive da rispettare (GDD §10)

- **L'oro è solo del giocatore**: difese, Patti, interfaccia amica.
- I semi si distinguono su tre canali: colore, cornice (Bastoni dentellata, Coppe tratteggiata, Spade con bulloni, Denari doppia) e icona.
- Le famiglie di difese si distinguono dalla forma: Segno esagono, Trucco rombo, Rito cerchio con freccia, Patto cerchio con catena. Le forme sono disegnate in CSS (`style.css`, classi `.hex`, `.rombo`, `.cerchio`, `.patto`): l'asset va dentro.
- Gerarchia della carta: Forza, seme, keyword, illustrazione.
- Colori della palette: variabili CSS in cima a `src/ui/style.css`.

## Asset da produrre con Magnific (dall'Art Director, Revisione 1)

**Regole comuni per i prompt (da incollare in ogni richiesta):**
> Illustrazione 2D piatta, ombre a due toni, linea spessa e sicura, ispirata alle carte da gioco regionali italiane e alle stampe popolari dell'Ottocento (almanacchi, ex voto). Silhouette forte leggibile a 96 px, un solo dettaglio di colore acceso. Sfondo trasparente. Nessun testo. Niente oro o giallo dorato (riservato al giocatore). Tono notturno, a lume di candela, inquietante ma non horror, niente sangue.

**Consigli di produzione**
- Fissare prima uno **stile di riferimento**: generare 4 carte campione (Lupo, Affogata, Carro, Folla), sceglierne lo stile e usarlo come immagine di riferimento in tutte le richieste successive (variazioni o restyle con lo stesso riferimento).
- I **sigilli** vanno fatti come **SVG monocromi** (generazione SVG o conversione da immagine a SVG), poi colorati in CSS. Le immagini raster non garantiscono un oro sempre identico.
- Ogni asset va ricontrollato a 96 px prima di accettarlo.
- Esportare in WebP, 2× la dimensione indicata.

### Lotto 1 · Indispensabili per la vertical slice (Vespro) · circa 35 asset

| Registro | Id | Cosa | Formato |
|---|---|---|---|
| SCENE | `tavolo` | Texture di feltro verde-nero ripetibile, grana leggera, macchie di cera | 512×512 tile |
| SCENE | `legno` | Bordo di legno di noce scuro, ripetibile | 512×64 tile |
| SCENE | `porta_0`, `porta_1`, `porta_2` | Porta di casa di campagna, integra, incrinata, spaccata con luce dietro | 256×384 |
| SCENE | `lume` | Lumino a olio sul davanzale, acceso | 128×128 |
| SCENE | `mazzo` | Mazzo di carte regionali visto di tre quarti, dorso rosso e marrone | 256×256 |
| FRAME | `retro` | Dorso della carta: motivo geometrico rosso ruggine e marrone, stile carte napoletane | 256×354 |
| FRAME | `bastoni`, `coppe`, `spade`, `denari`, `neutra` | Cornici vuote color avorio con il motivo del seme (dentellata, sfumata e tratteggiata, bulloni, doppia), centro trasparente | 256×354 |
| SEME | `Bastoni`, `Coppe`, `Spade`, `Denari` | Icone dei semi stile regionale, monocrome nel colore del seme | SVG 64×64 |
| ENEMY | `topi`, `lupo`, `volpe`, `ingordo`, `mulo`, `affogata`, `bocca`, `falce`, `barile`, `gazza`, `banditore`, `sobillatore` | Le 12 sventure del Vespro | 256×256 |
| ENEMY | `sagrestano` + SCENE `sagrestano` | Mazziere: mani pallide, maniche nere, maschera di cera, registro aperto | carta 256×256, ritratto 512×512 |
| DEFENSE | `brace`, `spina`, `taglio`, `gelo`, `bastione`, `tagliola`, `rimando`, `scartine`, `setaccio`, `bavaglio`, `oracolo`, `scala` | Glifi dei 12 sigilli più frequenti, a tratto di inchiostro | SVG 128×128 monocromo |

### Lotto 2 · Effetti e stati · circa 16 asset

| Registro | Id | Cosa | Formato |
|---|---|---|---|
| OVERLAY | `brucia`, `gelo`, `corazza`, `corazza_rotta`, `corrotto`, `silenzio` | Sovrapposizioni semitrasparenti per la carta (bordo carbonizzato, brina, scudo di ferro, scudo spezzato, oro annerito, nebbia) | 256×354 PNG/WebP con alfa |
| VFX | `strappo` | Spritesheet di carta che si strappa in due, 6 frame | 6×256×354 |
| VFX | `fiamma`, `brina`, `scintille`, `crepa_porta` | Spritesheet brevi, 6–8 frame | 256×256 per frame |
| VFX | `inchiostro_linea` | Pennellata d'inchiostro oro orizzontale, per la linea del telegrafo | 512×32 |
| VFX | `moneta` | Spicciolo di rame (non oro) che gira, 6 frame | 64×64 per frame |
| VFX | `catena` | Catena oro che si stringe (cattura dei Patti) | 256×256 |

### Lotto 3 · Resto del gioco · circa 80 asset

| Registro | Id | Quantità |
|---|---|---|
| ENEMY | sventure di Mezzanotte e Ora Morta: `branco`, `cinghiale`, `lamento`, `nebbia`, `prefica`, `carro`, `incudine`, `campana`, `processione`, `creditori`, `esattore`, `mannaro`, `morto`, `fatuo`, `macina`, `orologio`, `profeta`, `folla` | 18 |
| ENEMY | élite: `spaventapasseri`, `brigante`, `strega` | 3 |
| ENEMY | gettoni: `copia`, `scartina`, `corvo`, `disperazione`, `topo` (più semplici, quasi monocromi) | 5 |
| ENEMY + SCENE | Mazzieri `forestiero` (dadi, mani inanellate, maschera da forestiero), `piena` (mani bagnate, acqua che invade il tavolo) | 2 carte + 2 ritratti |
| FRAME | `mazziere`, `ally` (cornice oro dei Patti), `elite`, `boss` | 4 |
| DEFENSE | i restanti 25 sigilli | 25 SVG |
| SCENE | Bari: `baro_sottovento`, `baro_fattucchiera`, `baro_notaio`, `baro_bracconiera` (ritratti a mezzo busto, mani in primo piano) | 4 |
| SCENE | Eventi: `ev_comare`, `ev_pozzo`, `ev_prete`, `ev_cartaio`, `ev_pegni`, `ev_bambini`, `ev_processione`, `ev_gatto`, `ev_vedova`, `ev_vicini` (mezza pagina, stile tarocco) | 10 |
| SCENE | Nodi della mappa: `ondata`, `elite`, `negozio`, `riposo`, `evento`, `mazziere` (icone a timbro) | 6 SVG |
| UI | Logo "BARO" con due assi regionali incrociati | 1 |
