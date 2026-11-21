# battaglia/sim/ — terreno, fisica, pirati, armi, turni (TypeScript puro e deterministico). Proprietario: agente Fisica (da M1, ramo claude/m1-sim).

| File | Cosa fa |
|---|---|
| `index.ts` | API del contratto: `creaBattaglia`, `eseguiComando`, `avanzaTick`, `hashStato`, `simulaColpo`, `traiettoria`, `pirataAttivo` |
| `terreno.ts` | lettura della maschera, capsula 12×22, crateri con il moltiplicatore del materiale (ferro intatto) |
| `pirata.ts` | camminata con gradino 8, salti, volo con rimbalzo 0,3, attrito (ghiaccio 0,2), danno da caduta, espulsione dal solido, mare |
| `proiettili.ts` | movimento a passi di 1 px con connettività a 8, uscita in alto e rientro, vento, rimbalzi |
| `esplosione.ts` | danno `max(1, round(D × (1 − d/r)))`, spinta `D × 7 px/s` attenuata, tratto del Teschio |
| `armi.ts` | balistica (cannone), lancio con miccia (granata), istantanea a più colpi (pistola), mischia (sciabola) |
| `turno.ts` | fasi, timer, rotazione, vento, mare che sale, lapidi, fine battaglia, ritirata |
| `simula.ts` | `simulaColpo` (anteprima per l'IA, senza crateri) e `traiettoria` (linea tratteggiata) |
| `hash.ts` | hash di tutto lo stato, maschera compresa, a piena precisione |
| `replay.ts` | `rigiocaReplay`, `creaReplay`, `giocaComandi` |
| `oggetti.ts` | barili di polvere (dalla mappa) e casse col paracadute (Rum, Trappola): scoppio, catena, apertura |
| `costanti.ts` | piccoli numeri tecnici non di gioco (bocca del cannone, miccia della lapide…) |

## Regole utili a chi usa la sim (B, D, E, QA)

- **Tempi dei comandi**: un comando con `tick: T` si applica quando `s.tick === T`, prima dell'`avanzaTick` che porta a T+1.
- **Gli effetti dei comandi escono al tick dopo**: `fuoco` mette `turno.sparato = true`, il colpo parte (con l'evento `sparo`) al prossimo `avanzaTick`. Lo stesso per `salto`, `timerAvviato` e la fine per `ritirata`.
- **Gli eventi del turno 1** (`turnoIniziato`, `fase`) escono al primo `avanzaTick`.
- **Pirata a terra**: a 0 PV resta `stato: 'vivo'` con `vita: 0` fino a fine risoluzione; poi diventa una lapide (`lapide`, `morto` con causa `pv`, `stato: 'morto'`). Chi annega passa subito ad `annegato`.
- **Verso**: il comando `mira` gira il pirata verso l'angolo; `muovi` lo gira e tiene l'elevazione della mira; la sciabola colpisce nel verso.
- **simulaColpo** non scava crateri (non copia la maschera): un pirata che cadrebbe nel buco appena aperto resta sul bordo. Danni, spinte, annegamenti e cadute sono quelli veri.
- Il tetto di 5 tick per frame (caso 6) è del ciclo di gioco di B, non della sim.
- **Barili e casse** sono `Proiettile` con `tipo: 'barile'` o `'cassa'` (punto alla base, appoggiati al suolo). Fermi e senza miccia non fanno aspettare volo e risoluzione; raggiunti da un'esplosione o colpiti da cannone o pistola scoppiano dopo `MICCIA_REAZIONE_TICK` (catena). Barile 75/85 (`esplosione` con `arma: 'barile'`), cassa colpita 25/45 e Trappola 30/50 (`esplosione` con `arma: 'cassa'`, il raggio le distingue). Il `Proiettile` della cassa resta con `arma: 'lapide'` perché il tipo di `Proiettile.arma` non ha 'cassa'. La cassa scende a 60 px/s spostata dal vento e la apre il primo pirata in campo che la tocca (`cassaAperta`).
- **Scale e liane** (`appigli.ts`) sono segmenti verticali in `s.appigli`, fuori dalla maschera: non sono solidi, proiettili e pirati ci passano attraverso. Il comando `arrampica` (−1 su, 1 giù) aggrappa il pirata attivo all'appiglio entro `BIL.arrampicata.presa` px dall'asse, se nella direzione chiesta c'è ancora appiglio, e lo mette sull'asse se c'è posto. L'aggancio, come gli altri effetti, avviene al tick dopo, con l'evento `aggrappato`. Da appeso (`pirata.appeso` = id dell'appiglio) non ha gravità, è "fermo" per la risoluzione e può sparare. Sale a 40 px/s e scende a 60 px/s, mentre `muovi` non lo sposta. In cima passa da solo sul piano accanto, se c'è, a passo di camminata. In fondo appoggia i piedi a terra, oppure sopra il vuoto si lascia andare. `salta` lo stacca col salto normale. Una spinta (esplosione, sciabola, pistola) lo stacca con l'evento `staccato`. Un'esplosione toglie il tratto di appiglio nel suo raggio (`appiglioRotto`): il pezzo in alto tiene l'id, quello in basso ne prende uno nuovo da `prossimoId`, e i pezzi sotto `pezzoMinimo` spariscono. Chi resta senza appiglio cade dal punto in cui era, con il normale danno da caduta. `simulaColpo` non taglia gli appigli (è un'anteprima, come per i crateri).
- **Risoluzione**: passa quando tutto è fermo da `BIL.turno.risoluzioneFermoTick` (`turno.fermoDa`), tetto di 10 s da `inizioFase`.
- **traiettoria(s, maxPunti, maxRimbalzi?)**: granata con i rimbalzi fino all'esplosione; con `maxRimbalzi` si ferma su quel rimbalzo.
