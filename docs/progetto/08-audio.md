# 08 · Audio: musica, effetti, voci, vibrazione

*Sound Designer & Compositore. Solo design, niente codice. Tutti i numeri sono valori iniziali da tarare a orecchio sul telefono vero (altoparlante mono di fascia media, non cuffie).*

Note di coerenza: le battaglie seguono i **6 biomi di 01-combattimento §7**. Gli id musicali sono per bioma, non per regione, quindi qualunque abbinamento regione→bioma scelga la revisione (02 e 04 hanno elenchi diversi) non cambia nulla qui. La «morte improvvisa» è un **evento** (`mareSale`) del bus di battaglia: l'audio non dipende da quando scatta (4:00, turno 12 o turno 20: lo decide la revisione).

---

## 1. Identità sonora: «shanty moderno»

**Idea:** una ciurma da taverna che suona sopra una sezione ritmica da mobile game di oggi. Il folk dà il tema pirata, i bassi e la batteria danno l'energia moderna. Mai orchestra epica alla «film di pirati»: costa, è un cliché e sull'altoparlante del telefono diventa poltiglia.

| Strato | Strumenti | Ruolo |
|---|---|---|
| Ciurma (folk) | fisarmonica/concertina, violino folk, tin whistle, mandolino o banjo, coro maschile «ohh-ehh» senza parole | melodia, colore pirata |
| Moderno | cassa e rullante secchi, battiti di mani, basso sintetico rotondo (mai sotto 60 Hz: il telefono non lo riproduce), pizzicati sintetici | spinta, leggibilità sul piccolo altoparlante |
| Mare | tamburi a cornice, legni che scricchiolano, campana di bordo | collante tra musica ed effetti |

- **Tonalità di casa:** re dorico (re minore con il si naturale): suona «avventura un po' furba», né triste né eroica. Vittorie in re maggiore, sconfitte in re minore.
- **Motivo-firma:** una frase di 5 note da fisarmonica che apre il menu e ritorna nel jingle di vittoria e nella fanfara di conquista. Si ottiene scegliendo la migliore tra le generazioni del menu e chiedendo poi le altre «nello stesso stile e con la stessa melodia» usando quella come riferimento (vedi §7).
- **Mood:** scanzonato, con un pizzico di pericolo. Le esplosioni sono «cartoon gonfie» (boom rotondo + detriti di legno), mai belliche e realistiche: coerente con lo stile visivo (niente sangue, morte in uno sbuffo).

---

## 2. Musiche

Tutte strumentali. «Loop» = corpo che si ripete con un **punto di loop** a fine battuta (campo `loopStart`/`loopEnd` in secondi nel registro), con eventuale intro suonata una volta sola.

| id | Dove | BPM | Durata | Loop | Mood |
|---|---|---|---|---|---|
| `mus_menu` | menu, selezione ciurma | 96 | 75 s | sì, intro 4 s | invito all'avventura, motivo-firma in chiaro |
| `mus_mappa` | mappa del mondo, preparazione attacco | 84 | 120 s | sì | strategico, sornione, pizzicati + fisarmonica; volume basso, è un «tappeto» per pensare |
| `mus_batt_isola` | Isola tropicale | 112 | 90 s | sì | allegra, marimba e ukulele in più |
| `mus_batt_relitti` | Cimitero di navi | 104 | 90 s | sì | spettrale-buffa, organetto stonato, legni |
| `mus_batt_vulcano` | Scogliera vulcanica | 124 | 90 s | sì | tamburi grossi, violino aggressivo |
| `mus_batt_tortuga` | Porto della Tortuga | 118 | 90 s | sì | taverna, banjo, battiti di mani |
| `mus_batt_ghiacci` | Ghiacci del Nord | 100 | 90 s | sì | celesta e campanelli, coro basso |
| `mus_batt_grotta` | Grotta dei contrabbandieri | 96 | 90 s | sì | sommessa, contrabbasso pizzicato, gocce |
| `mus_tensione` | mare che sale (morte improvvisa) | 140 | 60 s | sì | stesso re dorico, ostinato di violini, timpani, orologio |
| `mus_vittoria` | fine battaglia vinta | 120 | 7 s | no, poi silenzio + ambiente | fanfara con motivo-firma, coro «hey!» |
| `mus_sconfitta` | fine battaglia persa | 70 | 6 s | no | fisarmonica che «si sgonfia», campana lontana |
| `mus_conquista` | paese conquistato sulla mappa | 120 | 3 s | no | stinger: 3 accordi + campana |
| `mus_campagna_vinta` | vittoria della campagna | 110 | 60 s | sì, intro 8 s | festa piena, tutto lo strato ciurma |
| `mus_campagna_persa` | sconfitta della campagna | 66 | 40 s | sì | lenta, mare mosso, tin whistle solo |

Regole di passaggio:
- Mappa → battaglia: dissolvenza incrociata 1,5 s sulla transizione «onda» di 03 §7.
- `mareSale` → `mus_tensione` con dissolvenza di 2 s, **sincronizzata alla battuta** successiva della traccia di bioma. Non si torna indietro.
- Durante il volo di un proiettile la musica non cambia; durante «il capitano medita...» (IA) neanche.
- Fine battaglia: musica di battaglia sfuma in 300 ms, poi `mus_vittoria`/`mus_sconfitta`.
- Pausa: filtro passa-basso a 800 Hz sulla musica e −6 dB (resta, ma «dietro una porta»).

---

## 3. Effetti sonori (id del registro asset)

Convenzione: `sfx_<gruppo>_<cosa>`. `×N` = numero di varianti generate (scelte a caso, senza ripetere la precedente). Su tutte le varianti il codice aggiunge ±4% di intonazione casuale.

### 3.1 Armi (01 §5)
| id | Evento | Durata | ×N |
|---|---|---|---|
| `sfx_arma_cannone_sparo` | Cannone a mano | 0,8 s | 3 |
| `sfx_arma_granata_lancio` / `_rimbalzo` | lancio, tocco sul terreno | 0,3 / 0,2 s | 2 / 3 |
| `sfx_arma_miccia_loop` | miccia accesa (granata, barile, scimmia) | 1 s loop | 1 |
| `sfx_arma_pistola_sparo` | Pistola focaia, ogni colpo | 0,5 s | 3 |
| `sfx_arma_sciabola_fendente` / `_colpo` | Sciabola a vuoto / a segno | 0,4 s | 2 / 2 |
| `sfx_arma_barile_piazza` | Barile di polvere piazzato | 0,5 s | 1 |
| `sfx_arma_mina_piazza` / `_armata` / `_scatto` | Mina: posa, clic d'armamento, allarme 1 s | 0,4 / 0,2 / 1 s | 1 |
| `sfx_arma_molotov_rottura` / `sfx_fuoco_loop` | bottiglia rotta, fiamme | 0,6 s / 2 s loop | 2 / 1 |
| `sfx_arma_catena_volo` | Palla incatenata che scava | 1,5 s loop | 1 |
| `sfx_arma_pappagallo_volo` / `_verso` | ali + squittio pazzo | 1 s loop / 0,6 s | 1 / 3 |
| `sfx_arma_scimmia_corsa` / `_verso` | passi veloci + «uh-uh-ah» | 1 s loop / 0,6 s | 1 / 3 |
| `sfx_arma_ancora_caduta` | fischio dall'alto + catena | 1,5 s | 1 |
| `sfx_arma_bordata` | 5 colpi di galeone lontano | 2,5 s | 1 |
| `sfx_arma_rampino_lancio` / `_aggancio` / `_corda` | lancio, tunk, scricchiolio | 0,4 / 0,2 / 1 s loop | 1 / 2 / 1 |
| `sfx_arma_vanga_scava` | vanga nella terra | 1 s loop | 1 |
| `sfx_arma_mappa_teletrasporto` | carta strappata + «puff» magico | 1 s | 1 |
| `sfx_arma_kraken` | ruggito sott'acqua + tentacolo che spazza | 3 s | 1 |
| `sfx_proiettile_fischio_loop` | proiettile in volo (volume legato alla velocità) | 1 s loop | 1 |
| `sfx_arma_seleziona` | cambio arma (clic metallico) | 0,2 s | 1 |
| `sfx_arma_vuota` | munizioni finite | 0,2 s | 1 |

### 3.2 Esplosioni e impatti
| id | Uso | Durata | ×N |
|---|---|---|---|
| `sfx_esp_piccola` | raggio < 40 (lapide, frammenti) | 1 s | 3 |
| `sfx_esp_media` | raggio 40–60 (cannone, granata, mina) | 1,5 s | 3 |
| `sfx_esp_grande` | raggio > 60 (barile, scimmia, pappagallo) | 2,5 s | 2 |
| `sfx_esp_coda_detriti` | pioggia di terra/legno dopo l'esplosione, sovrapposta | 1,5 s | 3 |
| `sfx_imp_sabbia` / `_legno` / `_roccia` / `_ghiaccio` / `_ferro` | strato «materiale» sovrapposto al boom, scelto dal pixel colpito | 0,5 s | 2 ciascuno |
| `sfx_pirata_colpito` | tonfo cartoon + «boing» | 0,4 s | 3 |
| `sfx_pirata_morte_puff` | sbuffo di fumo + campanella buffa | 1 s | 1 |
| `sfx_lapide_appare` | legno che si pianta | 0,4 s | 1 |
| `sfx_caduta_tonfo` | atterraggio con danno da caduta | 0,4 s | 2 |

### 3.3 Passi e movimento (per materiale, 01 §3)
`sfx_passo_sabbia`, `sfx_passo_legno`, `sfx_passo_roccia`, `sfx_passo_ghiaccio`, `sfx_passo_ferro`, `sfx_passo_erba`: 0,15 s, **×4** ciascuno, uno ogni 2 frame di camminata (≈ 3 al secondo). Più `sfx_salto` (×2), `sfx_atterra_<materiale>` (stessi 6 materiali, ×2), `sfx_scivola_ghiaccio` (1 s loop).

### 3.4 Acqua e mare
| id | Uso | Durata |
|---|---|---|
| `sfx_acqua_splash_grande` (×2) | pirata in mare | 1,5 s |
| `sfx_acqua_splash_piccolo` (×3) | proiettile, cassa, arma in mare | 0,6 s |
| `sfx_acqua_annega` | gorgoglio + bolle; il cappello galleggia | 2 s |
| `sfx_mare_sale` | rombo d'onda + legni che gemono, a ogni alzata | 2 s |
| `amb_mare_loop` | risacca leggera, sempre sotto la battaglia | 30 s loop |
| `amb_<bioma>_loop` ×6 | isola (gabbiani), relitti (legni, vento cavo), vulcano (brontolii), tortuga (taverna lontana), ghiacci (vento), grotta (gocce, eco) | 30 s loop |
| `amb_vento_forte_loop` | si sovrappone se il vento è ≥ 7 | 20 s loop |

### 3.5 Casse e oggetti
`sfx_cassa_paracadute` (1,5 s loop, stoffa), `sfx_cassa_atterra`, `sfx_cassa_apri`, `sfx_cassa_rum` (sorso + «ahh» → +PV), `sfx_cassa_trappola` (clic sinistro 0,3 s prima dell'esplosione), `sfx_riserva_sbarco` (remi + corda).

### 3.6 Turno e battaglia
`sfx_turno_mio` (campana di bordo 2 rintocchi), `sfx_turno_nemico` (campana grave 1 rintocco), `sfx_timer_tick` (ultimi 5 s, legno), `sfx_timer_scaduto` (fischio del nostromo), `sfx_ia_medita` (mormorio + pergamena, 1,5 s), `sfx_ritirata_bandiera` (resa: fischietto triste).

### 3.7 UI e mappa
| id | Uso | Durata |
|---|---|---|
| `sfx_ui_tocco` (×2) | pulsante generico (legno morbido) | 0,08 s |
| `sfx_ui_primario` | pulsante oro (tocco + moneta) | 0,2 s |
| `sfx_ui_indietro` | chiudi / annulla | 0,1 s |
| `sfx_ui_interruttore` | toggle impostazioni | 0,1 s |
| `sfx_ui_slider_tick` | ogni scatto dello slider pirati | 0,05 s |
| `sfx_ui_radiale_apri` / `_scegli` | selettore armi | 0,2 s |
| `sfx_ui_pannello` | pannello che entra (fruscio pergamena) | 0,25 s |
| `sfx_ui_transizione` | «onda» di cambio schermata | 0,6 s |
| `sfx_ui_errore` | azione non permessa | 0,2 s |
| `sfx_ui_dobloni` | contatore dobloni che scorre | 0,4 s |
| `sfx_mappa_seleziona` | tocco su un paese | 0,15 s |
| `sfx_mappa_rinforzo` | piazza un pirata (tamburo) | 0,2 s |
| `sfx_mappa_sposta` | freccia di movimento (remi) | 0,8 s |
| `sfx_mappa_auto` | arrembaggio rapido (2 s di mischia lontana) | 2 s |
| `sfx_mappa_carta` | pesca una Mappa del Tesoro | 0,5 s |
| `sfx_evento_tempesta` / `_kraken` / `_galeone` / `_flotta` | eventi del mare (02 §5) | 2 s |

### 3.8 Voci «gibberish» dei pirati
Nessuna parola vera: una lingua inventata da pirata (sillabe tipo «arr», «yo-ho», «gwah», «brubba»), stile Animal Crossing / Worms. Così non serve traduzione e non stanca. **4 timbri** (`a` basso burbero, `b` tenore allegro, `c` voce rauca da vecchio, `d` voce femminile squillante); ogni squadra pesca 2 timbri. Le voci si **tingono** come gli sprite: stessa clip, intonazione ±2 semitoni per fazione.

| id (per timbro `a`–`d`) | Quando | Durata | ×N |
|---|---|---|---|
| `vox_<t>_tocca` | inizio del suo turno | 0,6 s | 2 |
| `vox_<t>_spara` | al FUOCO (grido) | 0,4 s | 2 |
| `vox_<t>_colpito` | prende danno | 0,4 s | 3 |
| `vox_<t>_presa` | ha colpito un nemico | 0,7 s | 2 |
| `vox_<t>_paura` | miccia vicina o bordo del mare | 0,6 s | 2 |
| `vox_<t>_morte` | PV a 0 | 0,8 s | 1 |
| `vox_<t>_annega` | cade in mare | 1 s | 1 |
| `vox_<t>_vittoria` | fine battaglia vinta | 1 s | 1 |
| `vox_<t>_sfottò` | uccisione nemica | 0,8 s | 2 |

Più **4 capitani** (02 §2) con una «firma» ciascuno: `vox_cap_<fazione>_saluto`, `_attacca`, `_vince`, `_perde` (1–1,5 s), sempre gibberish ma con carattere riconoscibile. Regola: max 1 voce ogni 1,5 s, priorità morte > annega > colpito > il resto.

**Conteggio:** 14 musiche, ≈ 105 effetti (≈ 210 file con le varianti), 7 ambienti, ≈ 80 voci. ≈ 400 file.

---

## 4. Formati e loudness

| Tipo | Formato | Canali | Qualità | Peso |
|---|---|---|---|---|
| Musica | OGG Vorbis 44,1 kHz | **stereo** | q3 (~112 kbps) | ≈ 1,2 MB/90 s; totale ≤ 14 MB |
| Ambienti | OGG Vorbis 44,1 kHz | stereo | q2 | ≤ 400 KB ciascuno |
| Effetti, voci | OGG Vorbis 44,1 kHz | **mono** | q3 | < 60 KB tipico; totale ≤ 6 MB |

- Cartelle `public/assets/audio/<mus|amb|sfx|vox>/<id>.ogg`. Android WebView legge OGG nativamente; se un giorno arriva iOS si aggiunge un `.m4a` accanto (stesso id).
- **Loudness:** musica −18 LUFS integrati, ambienti −28 LUFS, effetti e voci normalizzati a picco −1 dBTP con loudness percepita −16 LUFS (esplosione grande −14). Tutto tagliato sotto 60 Hz e con una leggera spinta a 2–4 kHz: è dove suona l'altoparlante del telefono.
- Silenzio iniziale < 5 ms (ritardo percepito); coda tagliata con dissolvenza di 20 ms.
- Registro: la voce `SOUNDS` del vecchio `registry.ts` diventa `AUDIO` con `{ id, cat, sample?, varianti, volume, bus, loop?, loopStart?, loopEnd?, haptic?, source: 'magnific:<id>' }`. Finché `sample` è vuoto resta il **suono sintetizzato** segnaposto (WebAudio), come oggi; `assets:check` elenca i mancanti.
- Caricamento: UI, comuni e il bioma della battaglia si decodificano all'ingresso della scena (≤ 6 MB in RAM); la musica si legge in streaming dall'elemento audio, non decodificata intera.

---

## 5. Mix e ducking

**Bus:** `master` → `musica` (0,7), `amb` (0,5), `sfx` (1,0), `voci` (0,9), `ui` (0,8). Gli slider di 03 §5.10 «musica» e «effetti» comandano `musica` e `sfx+amb+voci+ui`.

**Spazializzazione semplice:** gli effetti di battaglia sono mono con **pan stereo** dato dalla x sullo schermo (−0,6…+0,6) e attenuazione con la distanza dal centro della camera; fuori schermo −9 dB e filtro passa-basso 2 kHz. Lo sparo del pirata attivo è sempre a volume pieno.

**Ducking:**
| Causa | Effetto | Attacco / rilascio |
|---|---|---|
| esplosione grande | musica −5 dB, amb −3 dB | 20 ms / 600 ms |
| esplosione media | musica −3 dB | 20 ms / 400 ms |
| voce di pirata o capitano | musica −3 dB | 50 ms / 300 ms |
| stinger (vittoria, conquista, turno) | musica −8 dB | 100 ms / 500 ms |
| pausa / impostazioni | passa-basso 800 Hz + −6 dB | 200 ms |
| app in background | `AudioContext.suspend()`, ripresa dove era | — |

**Polifonia:** max 24 voci totali; max 3 istanze dello stesso id (si ruba la più vecchia); passi max 2. Limiter sul master a −1 dBTP per le reazioni a catena di barili.

---

## 6. Vibrazione (Capacitor Haptics)

Un solo modulo `piattaforma/haptics` legge il campo `haptic` del registro: suono e vibrazione partono **dallo stesso evento**, mai separati. Interruttore in Impostazioni (predefinito acceso). Limite: max 1 vibrazione ogni 80 ms, le altre si scartano; nessuna vibrazione per eventi fuori schermo o del turno IA, tranne quelli che colpiscono i propri pirati.

| Evento | Haptic |
|---|---|
| tocco pulsante, slider tick, scelta arma | `selectionChanged` |
| pulsante primario | `impact LIGHT` |
| FUOCO (sparo) | `impact MEDIUM` |
| esplosione piccola/media in vista | `impact MEDIUM` |
| esplosione grande | `impact HEAVY`, poi `vibrate 60 ms` dopo 90 ms (doppio colpo) |
| proprio pirata colpito | `impact HEAVY` |
| colpo a segno su nemico | `impact LIGHT` ×2 a 70 ms |
| morte / annegamento proprio pirata | `notification WARNING` |
| ultimi 5 s del timer | `impact LIGHT` a ogni tick |
| mare che sale | `vibrate 250 ms` |
| vittoria battaglia, paese conquistato | `notification SUCCESS` |
| sconfitta, azione non permessa | `notification ERROR` |

---

## 7. Produzione con Magnific

Strumenti: `audio_music_generate` (consigliato **ElevenLabs v2**, `instrumental: true`, `durationSeconds` 10–300; Lyria 3 Pro per le prove di stile), `audio_sfx_generate` (1–30 s, `variations` 1–4 per le varianti, `loop: true` per ambienti e loop), `audio_tts` con voce di catalogo per le voci gibberish (modello eleven_v3, che legge i tag di emozione), `audio_voice_change` per derivare i 4 timbri dalla stessa interpretazione. Tutto nella cartella di progetto del gioco; `source: 'magnific:<id>'` nel registro.

**Flusso:** 1) generare 3 prove di `mus_menu`, sceglierne una = riferimento di stile e motivo-firma. 2) Tutte le altre musiche con il prompt-base + la riga specifica. 3) Ritaglio del loop su battute intere (BPM noto), dissolvenza incrociata 30 ms al punto di loop, normalizzazione, export OGG. 4) Prova sull'altoparlante del telefono, non in cuffia. Le musiche si chiedono **più lunghe** del necessario (es. 120 s per un loop da 90 s) per scegliere il taglio migliore.

**Prompt-base (in inglese, rende meglio):**

- **Musica:** *Instrumental modern sea-shanty game music for a cartoon pirate mobile game. Folk accordion/concertina, fiddle, tin whistle, mandolin, wordless male crew "oh-heh" chants, over punchy modern drums, hand claps and a round synth bass. D dorian, playful and adventurous with a hint of danger, mixed bright and clear for small phone speakers, no low sub-bass, no vocals with words, no epic orchestra.* + riga specifica, es. `mus_batt_vulcano`: *124 BPM, big taiko-like drums, aggressive fiddle, volcanic tension, loopable 90-second battle theme with no ending.* · `mus_tensione`: *140 BPM, same key, relentless string ostinato, timpani, ticking clock, rising water urgency, loopable.* · `mus_vittoria`: *7-second victory fanfare in D major, accordion melody, crew shouting "hey!", ends on a bright final chord.*
- **Effetti:** *Cartoon pirate game sound effect, punchy and exaggerated but not realistic war sound, close mic, dry, no music, no reverb tail longer than 0.5 s, clean start.* + sorgente/superficie/prospettiva, es. `sfx_passo_legno`: *single footstep of a small boot on an old wooden ship deck, light creak* (variations 4, 1 s, poi tagliato a 0,15 s) · `sfx_esp_grande`: *big round cartoon gunpowder barrel explosion, boomy thump, wooden splinters and dirt raining down* · `sfx_ui_primario`: *soft wooden button tap followed by a tiny gold coin clink, very short*. Per gli ambienti `loop: true`, 30 s, *distant, soft, background, no sudden events*.
- **Voci gibberish:** testo fatto di sillabe inventate con tag di emozione, es. `vox_a_presa`: *[laughs] Harr-gwa! Brubba-yo!* · `vox_c_paura`: *[panicked] Wah-wah-blub, nono-nar!* Prompt di regia (systemInstruction o direzione): *cartoon pirate speaking an invented nonsense language, no real words in any language, very expressive, short bark.* Si registra una volta col timbro `a`, poi `audio_voice_change` produce `b`, `c`, `d` mantenendo tempi ed emozione. Ogni battuta si genera 3 volte e si tiene la più leggibile a 0,5 s.

**Controllo di accettazione:** niente parole comprensibili nelle voci (in nessuna lingua); nessun click a inizio, fine o punto di loop; loudness entro ±1 LU dal bersaglio; si capisce ancora sull'altoparlante a metà volume; peso entro §4.

---

## Domande per il proprietario
1. **Voci:** va bene la lingua inventata (stile Worms/Animal Crossing), o vuoi qualche esclamazione vera in italiano («All'arrembaggio!», «Arrr!») per i capitani?
2. **Budget crediti Magnific:** ≈ 400 file più le prove (stima 600–800 generazioni). Procediamo a lotti (lotto 1 = menu, mappa, 1 bioma, armi base, UI ≈ 120 file) o tutto insieme?
3. **Vibrazione:** accesa di default come proposto, o spenta di default (alcuni la trovano fastidiosa e consuma batteria)?
