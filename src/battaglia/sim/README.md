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
| `costanti.ts` | piccoli numeri tecnici non di gioco (bocca del cannone, miccia della lapide…) |

## Regole utili a chi usa la sim (B, D, E, QA)

- **Tempi dei comandi**: un comando con `tick: T` si applica quando `s.tick === T`, prima dell'`avanzaTick` che porta a T+1.
- **Gli effetti dei comandi escono al tick dopo**: `fuoco` mette `turno.sparato = true`, il colpo parte (con l'evento `sparo`) al prossimo `avanzaTick`. Lo stesso per `salto`, `timerAvviato` e la fine per `ritirata`.
- **Gli eventi del turno 1** (`turnoIniziato`, `fase`) escono al primo `avanzaTick`.
- **Pirata a terra**: a 0 PV resta `stato: 'vivo'` con `vita: 0` fino a fine risoluzione; poi diventa una lapide (`lapide`, `morto` con causa `pv`, `stato: 'morto'`). Chi annega passa subito ad `annegato`.
- **Verso**: il comando `mira` gira il pirata verso l'angolo; `muovi` lo gira e tiene l'elevazione della mira; la sciabola colpisce nel verso.
- **simulaColpo** non scava crateri (non copia la maschera): un pirata che cadrebbe nel buco appena aperto resta sul bordo. Danni, spinte, annegamenti e cadute sono quelli veri.
- Il tetto di 5 tick per frame (caso 6) è del ciclo di gioco di B, non della sim.
