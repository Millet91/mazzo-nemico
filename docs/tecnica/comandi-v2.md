# Comandi di battaglia v2 (agente Comandi, 21/11/2026)

Richiesta del proprietario dopo la prova dell'APK 3: analizzare i comandi e rifarli ottimizzandoli. Lo schema
resta quello scelto da lui (doppio joystick fisso, 00 §9.16); qui c'è cosa non andava nel codice e come funziona ora.

## Cosa non andava (misurato a 915×412, Pixel 6 in orizzontale)

1. **Non si vedeva dove cade il colpo.** A zoom 1,4 lo schermo mostra 857×386 px di mondo, i nemici stanno a
   494-934 px: il mirino rosso era quasi sempre fuori vista, restava solo la freccia sul bordo.
2. **Mirino nel posto sbagliato sui tiri alti.** La traiettoria chiesta alla sim era di 60 punti = 3 s di volo:
   i tiri più lunghi venivano tagliati e il mirino finiva a mezz'aria, fino a ~100 px dall'impatto vero.
3. **Salto imprevedibile.** Partiva al solo tocco in cima alla leva, e lo stesso gesto dava un salto in avanti o
   uno all'indietro a seconda di dove guardava il pirata.
4. **Mira faticosa.** Per girare il tiro dall'altra parte servivano ~164 px di dito; oltre il bordo la corsa
   si accumulava a vuoto e tornando indietro il pomello restava fermo.
5. **Fuga persa.** In volo la leva di movimento spariva: il pollice appoggiato spostava la camera e per fuggire
   bisognava rialzarlo e ritoccare.
6. **Camera che non torna.** Dopo un trascinamento restava "libera" fino al turno dopo; per tornare sul pirata
   c'era solo un doppio tocco nascosto. Niente inerzia.
7. **FUOCO al tocco.** Partiva alla pressione: un pollice che sfiora il tasto sparava.

## Come funziona ora

| Cosa | File |
|---|---|
| Logica delle leve e di FUOCO, senza DOM | `src/ui/battaglia/leve.ts` |
| Componenti (cerchi di tocco, pointer capture) | `src/ui/battaglia/Joystick.tsx` |
| Camera pura (inerzia, zoom morbido) | `src/battaglia/render/camera.ts` |
| Inquadratura automatica, pura | `src/battaglia/render/inquadra.ts` |
| Gesti sul canvas (trascina, pinch, doppio tocco) | `src/battaglia/render/input.ts` |
| Chi guida la camera | `src/battaglia/partita/regista.ts` |

### Leva di movimento (sinistra)

- Di lato cammina (anche appoggiando il dito già di lato, come una croce direzionale).
- **Il salto va dove spingi**: dritto in su (65°-115°) salto alto, in diagonale salto lungo da quel lato
  (la leva manda `muovi(lato)`, `salta`, `muovi(0)`: il pirata si gira e salta).
- Il salto parte solo con una **spinta**: passando oltre il 60% della corsa dopo essere stati sotto il 40%, o
  arrivando dalla camminata. Appoggiare il dito in cima non salta. Chi cammina non salta per un pollice che
  sale un po' (fino a 50° resta in cammino).
- Vicino a una scala o liana (`VistaBattaglia.arrampicata`): su e giù arrampicano, il salto resta in diagonale.
  In cima alla scala, col pollice ancora in su, non parte un salto a sorpresa.
- In volo la leva resta a schermo al 50% e ricorda il pollice: alla fuga manda subito la direzione tenuta
  (mai un salto). Spegnendosi manda lo stop.

### Leva di mira (destra) e FUOCO

- Direzione del pomello = angolo, distanza dal centro = potenza; il pomello resta dove lo lasci.
- Trascinamento relativo con **guadagno sulla velocità**: piano = 40% del dito (precisione di mezzo grado),
  veloce = 95% (un colpo di pollice di meno di 2 cm gira il tiro). Oltre il bordo non si accumula corsa.
- FUOCO è un tasto a parte e **spara al rilascio**: scivolando fuori dal tasto lo sparo si annulla. Una volta
  sola per turno. Da tastiera spara subito.

### Camera

- `segui = 'pirata' | 'mira' | 'proiettile' | 'libera'`.
- **Miri → vedi dove cade il colpo.** Al primo comando `mira` (turno umano, fase azione, interruttore
  "Zoom automatico durante la mira" acceso) la camera inquadra pirata e punto d'impatto: zoom più alto
  possibile ma mai oltre quello scelto dal giocatore, spostamento minimo, niente sotto la barra in alto o
  sotto le leve (`inquadra.ts`, zone libere a T). Si riallarga subito, si restringe solo se c'è almeno il 12%
  da guadagnare. Dopo lo sparo l'inquadratura resta ferma (il colpo si guarda da lì); se il colpo esce dai
  lati o da sotto, la camera lo insegue.
- **Ti muovi → vedi il pirata.** Un comando di movimento riporta la camera sul pirata e allo zoom del giocatore.
- Pinch e trascinamento sono sempre del giocatore; lo zoom scelto col pinch è quello a cui si torna.
  Il trascinamento ha inerzia (si ferma in ~300 ms, uguale a 60 e 120 fps).
- `VistaBattaglia.pirataFuoriVista` accende il tasto "torna sul pirata" (44 px sotto la barra); resta anche
  il doppio tocco.
- La traiettoria chiede 160 punti (8 s): il mirino rosso sta sull'impatto vero anche nei tiri alti.

## Aggiunte al contratto (`src/core/bus.ts`)

- `VistaBattaglia.pirataFuoriVista?: boolean` (lo riempie il regista).
- `bus.zoomAutomaticoMira` (segnale, acceso di default; lo salva `preferenze.ts`).

## Prove

- `tests/ui/leve.test.ts`: leve e FUOCO. `tests/render/inquadra.test.ts`, `input.test.ts`, `camera.test.ts`:
  inquadratura, gesti, inerzia.
- `tests/e2e/battaglia.spec.ts`: salto dove spingi, FUOCO al rilascio e annullato, leva spenta in volo, tasto
  "torna sul pirata", interruttore dello zoom. `qa-caso22.spec.ts`: una riga adattata a FUOCO al rilascio.
