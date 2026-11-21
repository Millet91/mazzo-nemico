# mondo/scena — Tavolo del Timone (scena Pixi della mappa del mondo)

Proprietario: agente **Mondo e mappa** (P2). Contratto: `core/carriera.ts`, `core/bus.ts` (sezione carriera), `docs/progetto/studio-v2/P2-contratti.md`.

- `index.ts` — `montaScenaMondo(app, mare)`: la carica `render/grafica.ts`. Visibile con `bus.schermata` = `mondo`/`scena`/`paywall` e nessuna battaglia; tocchi solo in `mondo` e a coda vuota. Le immagini si caricano la prima volta che serve.
- `scena-mondo.ts` — la scena: tavolo, carta a tessere 512, due fondali d'onda che scorrono, rotte tratteggiate, isole-sprite, fascia d'onda tinta col padrone, pedine col numero, cartelli della Marina, bandierine, premio, nebbia, veliero, boccali. Esegue `bus.animaMondo` in coda (`viaggio`, `nebbia`, `conquista`, `perdita`, `attacco`, `pirati`, `centra`).
- `logica.ts` — parte pura (testata in `tests/mondo-scena/`): isola sotto il dito (immagine a indici + raggio minimo 28 px CSS), isole "tenute" dalle animazioni, nebbia per capitolo, rotte.
- `camera-mondo.ts` — camera pura: pan con inerzia, zoom attorno alle dita, voli.
- `tocchi.ts` — trascina, pinch, rotella, tocco breve.
- `risorse.ts` — carica `public/assets/mondo/` (dipinti da `scripts/mondo/`).

Regole per chi usa la scena:
- La Campagna cambia `bus.carriera` **e poi** manda l'animazione nello stesso istante: l'isola resta com'era finché l'animazione non la cambia.
- `centra.zoom`: 1 = vista di tutto il capitolo, 2 = il doppio. Senza zoom si avvicina a 1,6.
- In prova (`?prova`) `__kaboom.mondo.schermoDaIsola(id)` dà il centro dell'isola sullo schermo.
