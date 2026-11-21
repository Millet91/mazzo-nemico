# Baro

*Il Fato ti dà le carte. Tu bari.*

Roguelike di carte con l'anima di un tower defense (concept "Il mazzo nemico"). Il nemico è un mazzo che pesca sventure e le manda lungo cinque Passi fino alla tua porta; tu non giochi carte, **trucchi il mazzo e le regole** con Segni, Trucchi, Riti e Patti.

Questa è la **versione completa di prova** costruita dal [GDD unico](docs/GDD-riferimento.md) dello studio: tutti i contenuti, grafica e audio **provvisori** (glifi, colori, suoni sintetizzati), pronti per essere sostituiti dagli asset definitivi.

## Avviarla

Serve Node 20 o più recente.

```bash
npm install
npm run dev        # http://localhost:5173 (anche dal telefono sulla stessa rete: --host è già attivo)
```

Altri comandi:

| Comando | Cosa fa |
|---|---|
| `npm test` | Test del motore di regole (esempi del GDD, keyword, invarianti, determinismo, replay) |
| `npm run sim -- 100 random,medio,greedy` | Simulatore headless: N run per bot, report di vittorie, danni, pick rate |
| `npm run build` | Build per il web in `dist/` (GitHub Pages, poi Capacitor per l'APK) |
| `npm run build:single` | Tutto il gioco in un solo file `dist-single/index.html`, apribile ovunque |
| `npm run typecheck` | Controllo dei tipi |

## Come si gioca (in breve)

1. **Nuova notte**: scegli il Baro e il Sigillo (difficoltà). L'**Atto 0 · La Prova** è il tutorial in 5 rintocchi.
2. **Mappa**: ogni veglia (Vespro, Mezzanotte, Ora Morta) ha 7 livelli; a ogni livello scegli un nodo: Rintocco, Élite, Mercante, Focolare, Evento. L'ultimo è il **Mazziere**.
3. **Rintocco**: il Fato annuncia le carte che aggiunge, tu scegli **1 difesa tra 3** (o salti per 3 Spiccioli), poi in **Preparazione** sposti i Segni toccando un sigillo e poi un Passo. Guardi la **previsione** del danno e premi **Avvia**.
4. **Risoluzione**: guardi le carte avanzare; puoi mettere in pausa, andare avanti e indietro di un tick, cambiare velocità (tasti 1-4, spazio per la pausa) e usare l'**Asso nella manica** una volta per ondata.
5. Tocca **qualsiasi carta o sigillo** per leggerne le regole. Nel dettaglio di una carta in Fila, **Perché?** racconta cosa le è successo. Nel riepilogo, **Rivedi ondata** ripete la risoluzione.

Regole complete: menu ☰ > Come si gioca, oppure il GDD §4.

## Per lo studio: come testarla

- **Impostazioni > Test > Sblocca tutto** rende disponibili tutti i Bari, i 10 Sigilli, i pacchetti di difese e il Codice completo.
- **Impostazioni > Test > Pannello debug**: dal menu di gioco aggiungi carte al mazzo o difese al Deposito, Lumi pieni, +50 Spiccioli, rivela la Coda, salta al Mazziere.
- **Replay e bug report**: menu ☰ > *Copia link del replay*. Il link contiene seed e azioni: chi lo apre rivede la stessa notte fino allo stesso punto. Allegalo sempre a una segnalazione (GDD §16.3).
- **Seed fisso**: in Nuova notte puoi scrivere un seed per giocare tutti la stessa notte.
- **Asso nella manica**: interruttore in Nuova notte e in Impostazioni, per l'A/B del GDD §18.1.
- **Accessibilità**: palette per daltonismo e alto contrasto, testo fino al 150%, riduci movimento, Fila verticale per il telefono, tutto giocabile da tastiera.
- **Modalità istinto**: nasconde la previsione del danno.

Il salvataggio è automatico a ogni azione (nel browser). "Continua la notte" riprende da dove eri.

## Architettura

```
src/content/   dati: carte nemiche, difese, Mazzieri, eventi, Bari, Sigilli, parametri di bilanciamento (config.ts)
src/core/      motore di regole puro e deterministico (nessun DOM)
  rng.ts       PRNG sfc32 con stream separati (draw, deck, shop, rewards, events, boss, map, cosmetic)
  wave.ts      un'ondata tick per tick (GDD §4.2-4.5) → log di eventi con istantanee
  run.ts       la run come reducer: step(stato, azione) → stato; replay = seed + azioni
  forecast.ts  previsione del danno (10°-90° percentile)
src/sim/       bot (casuale, medio, greedy) per il simulatore e i test
src/assets/    REGISTRO CENTRALE degli asset grafici e sonori (vedi ASSETS.md)
src/ui/        interfaccia Preact che riproduce il log del core
sim/cli.ts     simulatore headless da riga di comando
tests/         test Vitest
```

**La simulazione è istantanea, la presentazione è una riproduzione** (GDD §13.2): premendo Avvia il core risolve l'ondata in un istante e l'interfaccia anima il log. Animazione e logica non possono divergere; l'Asso nella manica riesegue l'ondata dallo stesso seed con l'azione in più.

## Scelte di implementazione

Dove il GDD non diceva abbastanza ho deciso io, così:

- **Mappa**: a ogni livello si sceglie liberamente uno dei nodi offerti (2-3, a volte uno in meno sui livelli 3 e 5). Le pescate usano la tabella del §7.2 in base a quante ondate hai già fatto nell'atto.
- **Varianti dei Mazzieri (Sigillo 5)**, non definite nel GDD: Sagrestano, le carte che tornano hanno +1 Forza; Forestiero, ciò che gli dai vale doppio; Piena, la Corrente spinge ogni 2 tick invece che ogni 3.
- **Sigillo 10**: la Piena usa anche "Tutto torna" e "Facciamo a metà".
- **Inchiostro** a fine run = rintocco raggiunto + 10 se vinci + 2 per Sigillo + 2 per carta del Mazziere distrutta. Tre pacchetti di difese (15, 25, 35 Inchiostro) aggiungono le 17 difese oltre le 20 del prototipo.
- **Lealtà** massima con Rinsaldare: 9. **Eventi**: la Vedova dà una difesa non comune casuale; il Prete richiede un Patto da sciogliere.
- **Girate dei Patti**: tutte quelle della tabella §5.1, non solo il Morso generico del simulatore Python.
- **La Casa** (una famiglia per notte) e il **Quaderno della Notte** sono presenti in forma semplice; il Baro Caduto no (è post-M2 nel GDD).
- **Audio**: sintetizzato con WebAudio invece di Tone.js, per non avere dipendenze; ogni Passo ha la sua nota come nel §11.2.

## Bilanciamento

`npm run sim` gioca le regole vere del gioco (non una copia). Ultimo report in [docs/bilanciamento.md](docs/bilanciamento.md).

## Piattaforme

Pensata per il telefono (target da 44 px, Fila verticale sotto i 560 px). L'APK Android si farà con Capacitor sopra la build `dist/`; il core non dipende dal browser.

## App Android (APK di prova)

L'app è la stessa versione web impacchettata con Capacitor (`capacitor.config.ts`, cartella `android/`).

- **Scaricarla**: a ogni push il workflow *APK Android* costruisce `baro-prova.apk` e lo mette nella pre-release
  [apk-prova](../../releases/tag/apk-prova) (e come artifact del workflow).
- **Installarla**: apri il link della pre-release dal telefono Android, scarica `baro-prova.apk`, aprilo e consenti
  "Installa app sconosciute" per il browser quando Android lo chiede. È una build di debug: non passa dal Play Store
  e Play Protect può mostrare un avviso, si conferma con "Installa comunque".
- **Costruirla in locale** (serve Android Studio o l'Android SDK): `npm run android:apk`, poi il file è in
  `android/app/build/outputs/apk/debug/app-debug.apk`.
