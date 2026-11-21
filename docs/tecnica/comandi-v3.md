# Comandi di battaglia v3 (agente Comandi, 21/11/2026)

Il proprietario ha provato il doppio joystick (v2) sul telefono e l'ha bocciato: "I comandi coprono ancora la
visuale. Come fanno Worms e giochi simili? Riprogettare da zero". Poi: "Niente disegno, vai diretto".
Questa versione **toglie i joystick**. Sostituisce 00 §9.16.

## Come fanno i giochi del genere su telefono (in tre righe)

- Worms (primo su telefono, Worms 2: Armageddon): tocchi i lati dello schermo per camminare, tocchi il verme
  per saltare, **trascini il mirino** attorno al verme per mirare. Schermo libero, ma mira poco precisa.
- Worms 3 e 4: croce direzionale a schermo più tasti. Più precisa, ma copre lo schermo ed è poco amata.
- Pocket Tanks: pannello con angolo, potenza e FUOCO. Preciso ma lento, e niente movimento libero.

Abbiamo preso il meglio: il mirino da trascinare (che lascia lo schermo libero) reso preciso, più pochi tasti
piccoli ai bordi per quello che un gesto non fa bene (camminare, saltare, sparare).

## Lo schema

| Cosa | Come | Dove |
|---|---|---|
| Mirare | Trascini il **mirino oro** attaccato al pirata: la direzione dal pirata è l'angolo, la distanza è la potenza (48 px = 0%, 136 px = 100%). Resta dove lo lasci. **Non spara mai.** | Sul campo, vicino al pirata |
| Sparare | **FUOCO** (64 px). Spara al rilascio; scivolando fuori si annulla. Una volta per turno. | Angolo in basso a destra |
| Camminare | Frecce ◀ ▶ tenute premute (disco visibile di 46 px, area di tocco 64). | Angolo in basso a sinistra |
| Saltare | Tasto salto: un tocco = salto lungo in avanti (parte al rilascio); tenuto 260 ms = salto alto all'indietro. | Sopra le frecce |
| Scale e liane | Compaiono ⇧ ⇩ solo vicino a una scala o liana. Appeso, una freccia ◀ ▶ salta via da quel lato. | Accanto alle frecce |
| Arma, miccia | ARMA sopra FUOCO; chip miccia a sinistra di ARMA. Il testo "45° · 60%" sta a sinistra di FUOCO. | Angolo in basso a destra |
| Camera | Trascini il campo per spostarla (con inerzia), pinch per lo zoom, doppio tocco o tasto per tornare sul pirata. Tutto lo schermo tranne mirino e tasti. | Ovunque |

Tutti i tasti sono semitrasparenti (38%) e stanno nei due angoli in basso: la fascia centrale e tutta la parte
alta del campo restano libere. Con "Mancini" i due angoli si scambiano. I "Comandi classici" delle
Impostazioni restano com'erano (tasti grandi e ▲ ▼ per la mira fine); il mirino da trascinare funziona anche lì.

### Il mirino in dettaglio (`src/battaglia/render/mirino.ts`, puro e testato in Node)

- Si prende toccando entro 44 px dal suo centro. Quel dito è della mira finché non si alza: non sposta la
  camera e non conta per il pinch (`input.ts`).
- Trascinamento **relativo** con guadagno sulla velocità: piano = 55% del dito (mezzo grado di precisione,
  e il dito non copre il mirino), veloce = 100%. Oltre la potenza massima non si accumula corsa a vuoto.
- Sotto i 48 px dal pirata la potenza è 0 e l'angolo resta quello di prima (niente scatti vicino al centro).
- È disegnato in Pixi (`scena-battaglia.ts`): asta oro dal pirata, disco oro, e mentre lo trascini un anello
  tratteggiato che mostra la potenza massima. La traiettoria oro e il mirino rosso d'impatto restano.
- La prima volta compare il suggerimento "Trascina il mirino oro: più lontano, più forte"; sparisce alla prima
  mira e non torna più (`preferenze.ts`, `mirinoUsato`).
- Nel turno dell'IA, in volo, in fuga e con la sciabola il mirino non c'è.

### Camera (invariata dalla v2)

- **Miri → vedi dove cade il colpo**: la camera inquadra pirata e punto d'impatto senza metterli sotto la barra
  in alto o sotto i tasti (`inquadra.ts`, zone libere a T; i riquadri dei tasti ora sono più piccoli: 212×170).
- **Ti muovi → vedi il pirata.** Pinch e trascinamento sono sempre del giocatore.

## File

| Cosa | File |
|---|---|
| Matematica del mirino | `src/battaglia/render/mirino.ts` |
| Tocchi sul canvas (mirino, trascina, pinch, doppio tocco) | `src/battaglia/render/input.ts` |
| Disegno di mirino, asta, anello | `src/battaglia/render/scena-battaglia.ts` |
| Chi collega mirino, comandi e camera | `src/battaglia/partita/regista.ts` |
| Logica dei tasti (frecce, salto, FUOCO), senza DOM | `src/ui/battaglia/logica.ts` |
| Tasti a schermo | `src/ui/battaglia/Hud.tsx`, `src/ui/style.css` |

Tolti: `src/ui/battaglia/leve.ts`, `src/ui/battaglia/Joystick.tsx`.

## Per le prove automatiche

- Id dei tasti: `tasto-sinistra`, `tasto-destra`, `tasto-salta`, `tasto-sali`, `tasto-scendi`, `tasto-fuoco`,
  `tasto-arma`. Testid: `pad-muovi`, `pad-tiro`, `mira` (testo "45° · 60%"), `suggerimento-mirino`.
- Il mirino sta nel canvas: con `?prova`, `window.__kaboom.mirino()` dà il suo centro in px dello schermo
  (o `null` se non c'è).
- `tests/render/mirino.test.ts`, `tests/render/input.test.ts`, `tests/ui/hud.test.ts`;
  e2e in `tests/e2e/battaglia.spec.ts`, `qa-caso22.spec.ts`, `qa-mirino.spec.ts` (ex `qa-doppio-joystick`).
