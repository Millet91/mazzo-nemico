# Studio v2 — regole comuni

Il proprietario ha chiesto di rifare il giro dello studio: ogni ruolo **prova il gioco davvero** e **decide da solo** come migliorarlo. Il Producer raccoglie tutto in `PIANO.md`.

## Feedback del proprietario (21/11/2026, sera) — vale per tutti
1. **"Non è Worms."** I pirati devono muoversi **come pirati, non come vermi**: niente andatura a strisciare/saltellare da verme, niente salto a parabola da verme. Pensate a movimenti da pirata (corsa a falcate, arrampicata su corde e liane, dondolio, scivolata, tuffo, salto d'appoggio, gancio). Ogni ruolo dice cosa cambia nel proprio campo.
2. **La mappa va ridisegnata in alta definizione** (Cala Pappagallo).
3. **I comandi v3 (PR #62, mirino da trascinare, niente joystick) sono meglio di prima**: si tengono, si rifiniscono.
4. Dopo il piano: realizzazione con **Fable (impegno alto)** per prima mappa + combattimento; **Opus** per mappa del mondo in stile fisico (come Risiko) e intero primo scenario.

## Dove sta il gioco da provare
- **Attenzione:** `main` contiene solo lo scheletro M0 (nessuna battaglia). Il gioco giocabile è sul ramo **`claude/m1-integrazione`** (e nell'APK della pre-release `apk-prova`). Per giocarlo: `git checkout claude/m1-integrazione && npm ci && npm run build && npx vite preview`, poi Playwright/Chromium headless (`require('playwright')`), screenshot a 800×360 e 1080×486, tocchi veri.
- Il vostro lavoro scritto va su **`claude/studio-v2`** (parte da m1-integrazione), solo nella cartella `docs/progetto/studio-v2/` (nessun cambio al codice). Un file per ruolo: `<ruolo>.md`.

## Formato del vostro documento (max ~800 parole, italiano semplice)
1. **Cosa ho provato** (3-5 righe: che build, cosa ho fatto davvero, che screenshot ho guardato).
2. **Cosa non va** (max 7 punti, ordinati per gravità, con prova).
3. **Decisioni** (max 10, ognuna: cosa, perché, costo stimato S/M/L, a chi serve: *Pacchetto 1 = Cala Pappagallo + combattimento (Fable)*, *Pacchetto 2 = mappa del mondo + primo scenario (Opus)*).
4. **Cosa NON fare** (cose tentate o tentabili che non vale la pena fare).
5. **Dipendenze e conflitti** con altri ruoli (nomina il ruolo).
6. **Domande per il proprietario**: solo se indispensabili, max 1, a scelta multipla con opzione consigliata.

Nei file di decisione non scrivete codice. Quando avete pushato il vostro `<ruolo>.md`, scrivete al Producer.
