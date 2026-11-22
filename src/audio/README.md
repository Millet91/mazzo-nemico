# audio/ — motore audio del gioco (studio v2, Pacchetto 1). Proprietario: agente Audio (ramo `claude/<p>-audio`).

**Regola:** nessun altro modulo sceglie i suoni. Il motore ascolta `bus.eventiBattaglia` e `bus.battaglia` e decide da solo.
Chi sta fuori da questa cartella usa solo `avviaAudio()` (una volta, all'avvio) e `<RigheAudio />` (Impostazioni).

| File | Cosa c'è |
|---|---|
| `registro.ts` | `AUDIO`: ogni suono con canale, volume, varianti e ricetta sintetica. Compilando `sample` si userà il file (08 §4). |
| `ricette/*.ts` | le ricette sintetiche (segnaposto fatti in casa, niente file); `crolli.ts` = Fase 3: crolli, macerie, masso, fuoco, frana, ponte; `attrezzi.ts` = Fase 4: rampino, barile, palla incatenata, arpione, taglio di corda, secondo sparo pronto |
| `sintesi.ts` | gli attrezzi delle ricette: toni, rumore filtrato, corpi che risuonano (legno, ferro, campane), voce a formanti |
| `eventi.ts` | **funzioni pure**: eventi della sim e `VistaBattaglia` → richieste di suono. Qui si decide "quale suono per quale evento" |
| `polifonia.ts` | funzioni pure: massimo 24 voci, 3 per suono (si ruba la più vecchia) |
| `mix.ts` | costanti del mix: canali, attenuazioni (ducking), pan |
| `magazzino.ts` | i suoni pronti: ogni voce del registro sintetizzata una volta (fuori dal filo principale) e normalizzata |
| `cache.ts` | il cassetto: i suoni e le note pronti restano sul telefono (IndexedDB, 16 bit), dal secondo avvio niente sintesi |
| `RigaDiagnostica.tsx` | la riga dell'audio in Impostazioni → Diagnostica (pronti/totale, in quanto, calcolati o dal telefono, motore) |
| `motore.ts` | WebAudio: canali musica / effetti / voci / tasti, limitatore, ducking |
| `musica.ts`, `strumenti.ts`, `note.ts` | musica segnaposto procedurale in re dorico (menu e battaglia a due strati); le note sono calcolate una volta e suonate come campioni |
| `ambiente.ts` | mare, vento e versi lontani sotto la battaglia |
| `preferenze.ts`, `RigheAudio.tsx` | i due cursori di Impostazioni (musica, effetti e voci) |
| `index.ts` | `avviaAudio()`: collega tutto al bus |

Come si lavora:
- **Un suono nuovo**: una voce in `registro.ts` con la sua ricetta, poi una riga in `eventi.ts`. Il test `tests/audio/eventi.test.ts`
  fallisce se un evento della sim resta senza suono e non è nell'elenco dei "muti per scelta".
- I suoni si sintetizzano **una volta sola** all'avvio (fuori dal filo principale, con `OfflineAudioContext`) e poi si
  suonano come campioni: in battaglia un suono costa 3 nodi. Ogni suono è normalizzato, il volume sta nel registro.
  Misure del 22/11/2026 (Chromium senza schermo): tutto pronto in circa 2 s dall'apertura, 11 MB di memoria
  (7 MB effetti, 4 MB note), 40 s di battaglia piena = 3% di un processore.
- **Avvio sul profilo lento** (`tests/audio/misura-avvio.ts`, Chromium con CPU ×4, 22/11/2026): al primo avvio tutto pronto
  in circa 5,4 s, e intanto il menu perde circa un quarto dei frame (le ricette si COSTRUISCONO sul filo principale:
  oscillatori, filtri, inviluppi). Prepararle a fette, un pezzo per frame, non toglieva scatti e allungava a 8 s:
  per questo i suoni pronti vanno nel cassetto (`cache.ts`). Dal secondo avvio: pronti in 0,5 s, menu fluido come
  senza audio. La chiave del cassetto è il file della build: un aggiornamento dell'app rifà i suoni una volta.
- **Eventi veri**: `tests/audio/battaglia-vera.test.ts` fa giocare la sim (Balzo, scale, liane, battaglie intere sulla
  Cala v3) e passa ogni tick dall'audio: un evento nuovo della sim si prova lì, non solo con eventi scritti a mano.
- **Gancio di prova**: con `?prova` nell'indirizzo, `window.__kaboomAudio.stato()` dice cosa è stato chiesto e cosa è
  partito (lo usano `tests/e2e/audio.spec.ts` e la QA per "nessun evento senza suono").
- **Ascoltare senza telefono**: `npx tsx tests/audio/ascolto.ts` scrive in `test-results/audio/` un file WAV per suono,
  una battaglia finta di 40 s (`battaglia.wav`) e la tabella dei livelli.
- **Fase 3** (crolli): il crollo suona per famiglia di materiale (legno, roccia, sabbia) e per grandezza (`PEZZO_PICCOLO`,
  `PEZZO_GRANDE` in `eventi.ts`); masso e fuoco girano in ciclo. A turno nuovo si fermano i cicli tranne i fuochi
  (bruciano anche nel turno dopo e si spengono col loro evento). Ascolto: `/mnt/project-files/audio-p1/fase3-crolli-fuoco-frane-23s.mp3`.
- Niente "boing" e "sproing": i pirati non sono vermi (decisione dello studio v2).
- **Frequenza per suono** (`freq` in `tipi.ts`): 32 kHz di base; 24 kHz se sopra i 12 kHz c'è meno di −25 dB
  dell'energia, 16 kHz se sopra gli 8 kHz c'è meno di −30 dB (misurato rendendo a 32 kHz con quattro passa-alto in
  fila). `secondiTotali()` conta i secondi pesati sui campioni (a 16 kHz valgono la metà) e la coda dei cicli.
  Decisione del Lead P1: non alzare il tetto di prova dei 75 s. Un test controlla che un suono a frequenza bassa non
  chieda toni sopra la metà della sua frequenza.
- **Cicli senza buco**: un suono in ciclo si calcola con `CODA_CICLO` (0,15 s) in più, e `chiudiGiro` in
  `magazzino.ts` ripiega la coda sull'inizio con una dissolvenza di 0,1 s: niente silenzio né scatto a ogni giro.
  Il rumore di fondo dei cicli usa `piatto()` di `comuni.ts`, che dura anche la coda.
- **Fase 4** (`ricette/attrezzi.ts`): solo registro, si collegano a `eventi.ts` quando il Lead congela gli eventi.
  Ascolto: `/mnt/project-files/audio-p1/fase4-attrezzi-e-prima-dopo.mp3` (alla fine quattro suoni prima a 32 kHz e
  poi alla frequenza nuova).
- **Preparazione a due tempi** (decisione del Lead P1, 22/11): all'apertura si preparano solo le note del brano del
  menu e i tasti (`SUONI_MENU`), più tutto quello che il cassetto ha già; entrando in battaglia (`richiestaBattaglia`,
  dietro la schermata di caricamento) il resto: prima gli effetti, i più urgenti per primi, poi le note della musica di
  battaglia (che intanto si suonano dal vivo). Un suono non ancora pronto resta muto: niente aspetta l'audio.
  Lo fa `index.ts` da solo guardando il bus: App.tsx e il menu non cambiano. A CPU ×4 il menu è pronto in 2,7-3,0 s
  con frame quasi uguali a senza audio; il resto in 4,2-4,6 s dall'entrata in battaglia; secondo avvio 0,5-0,9 s.
