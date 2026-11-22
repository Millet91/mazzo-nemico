# audio/ — motore audio del gioco (studio v2, Pacchetto 1). Proprietario: agente Audio (ramo `claude/<p>-audio`).

**Regola:** nessun altro modulo sceglie i suoni. Il motore ascolta `bus.eventiBattaglia` e `bus.battaglia` e decide da solo.
Chi sta fuori da questa cartella usa solo `avviaAudio()` (una volta, all'avvio) e `<RigheAudio />` (Impostazioni).

| File | Cosa c'è |
|---|---|
| `registro.ts` | `AUDIO`: ogni suono con canale, volume, varianti e ricetta sintetica. Compilando `sample` si userà il file (08 §4). |
| `ricette/*.ts` | le ricette sintetiche (segnaposto fatti in casa, niente file) |
| `sintesi.ts` | gli attrezzi delle ricette: toni, rumore filtrato, corpi che risuonano (legno, ferro, campane), voce a formanti |
| `eventi.ts` | **funzioni pure**: eventi della sim e `VistaBattaglia` → richieste di suono. Qui si decide "quale suono per quale evento" |
| `polifonia.ts` | funzioni pure: massimo 24 voci, 3 per suono (si ruba la più vecchia) |
| `mix.ts` | costanti del mix: canali, attenuazioni (ducking), pan |
| `magazzino.ts` | i suoni pronti: ogni voce del registro sintetizzata una volta (fuori dal filo principale) e normalizzata |
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
- **Gancio di prova**: con `?prova` nell'indirizzo, `window.__kaboomAudio.stato()` dice cosa è stato chiesto e cosa è
  partito (lo usano `tests/e2e/audio.spec.ts` e la QA per "nessun evento senza suono").
- **Ascoltare senza telefono**: `npx tsx tests/audio/ascolto.ts` scrive in `test-results/audio/` un file WAV per suono,
  una battaglia finta di 40 s (`battaglia.wav`) e la tabella dei livelli.
- Niente "boing" e "sproing": i pirati non sono vermi (decisione dello studio v2).
