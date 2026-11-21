# Piano dello studio v2 — Kaboom Ahoy!

*Producer, 21/11/2026. Sintesi dei 13 documenti di ruolo in questa cartella. Dove un ruolo e un altro litigano, qui c'è la decisione. Stato: **bozza 2**, con Bilanciamento (§7).*

## 0. In una pagina

**Il problema** (proprietario): il combattimento è copiato da Worms, che nel 2026 è lento e povero. I pirati si muovono come vermi, le armi sono "basiche", la mappa è sfocata, la distruzione è solo "buco tondo", le scale si fermano a metà.

**Cosa teniamo:** la parte tattica e "rompicapo" (dove e quando mirare per fare più danno), i comandi v3 (mirino da trascinare).

**Cosa cambia, in una frase per ruolo:**
- *Movimento:* i pirati corrono a falcate, scavalcano muretti, si arrampicano mano su mano, dondolano sul rampino. Non esiste più il salto all'indietro.
- *Ritmo:* ci si muove già mentre il colpo vola, fuga da 3 s a 1,5 s interrompibile, 12 s per sparo, turno IA ≤ 4 s, due spari a turno, armi con più raggio.
- *Campo:* torri, ponti e cengie si staccano e cadono facendo danno; il legno brucia, la sabbia frana; barili e casse reagiscono. Il buco tondo resta, ma non è più l'unica cosa.
- *Armi:* 4 nuove che fanno ciò che il cannone non fa (barile che rotola, palla incatenata, arpione, sciabola taglia-funi).
- *Aspetto:* mappa a 2 pixel per unità con distruzione fatta da shader (bordi lisci), pirata a 9-10 pezzi animato da codice con cappello diverso per ciurma, mappa del mondo come carta fisica sul tavolo di Mastro Gancio.

**Due pacchetti** (l'ordine di lavoro del proprietario):
1. **Pacchetto 1 — Cala Pappagallo HD + combattimento → Fable, impegno alto.**
2. **Pacchetto 2 — Mappa del mondo fisica + intero primo scenario (Prologo + cap. 1 «Acque di Casa») → Opus.**

**Una sola domanda al proprietario** (carta già posta): quanti crediti Magnific. Il piano **non dipende** dalla risposta: parte in casa (zero crediti) e si arricchisce dopo.

---

## 1. Conflitti risolti

| # | Conflitto | Decisione |
|---|---|---|
| 1 | Crediti Magnific: 35 rimasti (Arte, Animazione, Audio) | Una carta sola al proprietario. Fino alla risposta si lavora **in casa**: pittore in Chromium per la mappa, pezzi del pirata disegnati nel codice, musica segnaposto procedurale. Magnific solo per 1-2 immagini di riferimento. Oggi comunque il proxy blocca il download a piena risoluzione (Livelli, Arte): Magnific non può dare l'HD. |
| 2 | Risoluzione mappa: Tecnica 4096×2048, Arte 3 px/unità, Livelli 2 px | **2 px per unità (4096×2048) in tessere da 512, garantito.** 3× solo se la misura sul Pixel 6 lo permette (Tecnica decide). Maschera di collisione resta **2048×1024** (non si tocca: costerebbe 4× in collisioni e rompe i replay). |
| 3 | Rampino: UX e Game design lo vogliono dal turno 1; Progressione dal Forte Rampino (1C) | **Si costruisce in P1** come movimento firma, in Schermaglia c'è dall'inizio. In carriera: nel Prologo un solo punto con rampino scritto (lezione di Mastro Gancio); **premio di 1C = Rampino in stiva a ogni battaglia**. |
| 4 | Due spari a turno (Game design) contro 00 §1.1; fuga 0 s (Game design) contro 1,5 s (Bilanciamento) | **Due spari restano accesi, ma solo insieme ai nuovi numeri di Bilanciamento** (§7): da soli non bastano (24% di battaglie a tempo, con i numeri nuovi 7,5%). **Fuga 1,5 s interrompibile**, che parte allo sparo mentre il proiettile vola (così il tempo morto sparisce, misurato 107→80 s a battaglia). Timer 12 s per sparo. |
| 5 | Mappa del mondo: "carta in rilievo 2.5D" (Mondo) contro "Tavolo del Timone con pedine e cartelli" (Narrativa) | **Si fondono**: carta fisica con isole come sprite separati, stesa su un tavolo di legno; pedine di legno = pirati, cartelli di cartone grigi = Marina. Sostituisce 03 §5.4 e n.30. |
| 6 | Battaglie del cap. 1: 7 (Mondo) contro 6 (Progressione) | **6 conquiste obbligate** (1D, 1C, 1E, 1F, 1G, 1H); 1A e 1B sono la costa di partenza. Una 7ª solo se serve a difendere. |
| 7 | Tipi di scontro (Bandiera, Duello) in P1 o P2 | **Tutti in P2.** Il Duello non richiede codice (1 contro 1). La Bandiera è una condizione di vittoria in `sim/`, fatta da Opus con Fable che lascia il punto d'aggancio. |
| 8 | Salto all'indietro | **Abolito** (UX, Game design, Tecnica d'accordo). Al suo posto il salto dal muro. Per scappare si corre o si usa il rampino. |
| 9 | Sabbia che frana: Game design sì in P1, Livelli no (costa troppo) | **Sabbia e legno che brucia in P1 solo come effetto semplice** (sabbia chiude i buchi piccoli, legno brucia 4 s e sparisce). Niente acqua che scorre né fuoco che si propaga. |
| 10 | Comandi: Arte/UX toccano i tasti | Restano i v3. Cambiano: SALTA → "Balzo" contestuale (stesso id `tasto-salta`), tasto a 25% se copre un pirata, griglia armi in fila con le sole armi sbloccate, frecce sul bordo per i nemici fuori vista. **Il codice è dell'agente Comandi**: Fable lavora con lui, non lo scavalca. |
| 11 | Forte Uncino / nomi Uncino e Bottone | **Forte Rampino**; liste nomi di `it.ts` sostituite (copione di Narrativa §8). |
| 12 | Sblocchi a fine capitolo (15) contro per isola (Progressione) | **Per isola**, stesso elenco. |

---

## 2. Regole che valgono per tutti i pacchetti

1. **Mai cambiare la capsula di collisione del pirata (12×22).** L'animazione segue la fisica.
2. **Mai ragdoll, né motori fisici esterni, né acqua che scorre, né fuoco che si propaga.** Solo pezzi che cadono in blocco.
3. **Determinismo:** crolli, rampino e dondolo vivono in `sim/`, solo numeri, senza `Math.random`.
4. **Budget Pixel 6:** sim ≤ 2 ms/tick, disegno ≤ 8 ms, texture ≤ 80-120 MB, arte mappa nell'APK ≤ 25 MB, 60 fps (medio ≥ 58, minimo ≥ 50). "Prova 60 fps" obbligatoria prima di ogni APK. Gli fps del browser senza GPU non valgono.
5. **I replay d'oro e la taratura dell'IA si rigenerano in un commit a parte**, mai insieme ad altre modifiche (QA).
6. **Ogni gesto nascosto ha anche un segno visibile** (lezione della fionda); niente joystick.
7. **Il proprietario non è un programmatore:** a fine di ogni fase un APK da provare con una checklist semplice di 5-8 righe.
8. **Prima di ogni lotto Magnific: `simulate_cost` e tetto del proprietario.**

---

## 3. Pacchetto 1 — Cala Pappagallo HD + combattimento (Fable, impegno alto)

**Obiettivo:** il proprietario gioca Cala Pappagallo su Pixel 6 e dice "non è più Worms". Il pacchetto è in **cinque fasi, ognuna con un APK**; la fase successiva parte solo se la precedente passa i criteri.

### Fase 0 — Aggiustare ciò che è rotto (S, subito, un giorno)
- **Scale:** asse delle due scale grandi a x 424 e 1624 (oggi 2 px dal muro, la capsula urta); il pirata si centra sull'asse all'aggancio; "scendi" dall'alto funziona. Test automatico "ogni appiglio si percorre tutto, su e giù" su ogni mappa (Livelli, QA).
- **Raggiungibilità:** la liana della torre sta 20 px sopra lo scalino massimo di 8; test "dagli spawn si arriva a ogni cengia, barile, appiglio". I compagni non si bloccano a vicenda.
- **Sicurezza del tiro:** avviso quando l'impatto è a meno di ~60 px dal tiratore; nessun danno a sé nel caso "pendio vicino".
- **HUD 800×360:** frecce non sopra i compagni, griglia armi < 35% del campo e si chiude toccando fuori, suggerimenti in alto a sinistra, nomi solo per attivo e bersaglio.
- **Criterio di uscita:** QA §3.1-3.2 e 3.7-3.8 verdi.

### Fase 1 — Pirati che si muovono da pirata, ritmo veloce (M-L)
- **Movimento** (Tecnica, Game design, UX, Animazione d'accordo): corsa a falcate (0→96 px/s in 0,15 s, tenendo ◀ ▶ oltre 0,4 s; passo corto con il tocco), scavalco automatico fino a 28 px, salto d'appoggio con rincorsa, salto dal muro, scivolata sui pendii oltre 25°, salvataggio al bordo, **Balzo contestuale**, scale in un tocco (90 px/s).
- **Ritmo:** fuga di 1,5 s interrompibile che parte allo sparo (tocco su "fatto" o pirata fermo: il turno passa subito); timer 12 s per sparo (25 s con Mozzo e nel Prologo); turno IA ≤ 4 s con la mira visibile 0,8 s; compagni mai sotto i tasti; frecce rosse sul bordo per i nemici fuori vista + panoramica 1,2 s a inizio turno.
- **Pirata a pezzi** (Arte, Animazione, Tecnica): ~9-10 sprite (cappello, testa, torace, bacino, 2 braccia, 2 gambe, arma) animati da codice, passo guidato dalla distanza, pose per riposo/corsa/salto/caduta/atterraggio/colpito/mira/scala/liana/morte. **Passo 0: pezzi disegnati nel codice** (gratis), cappello di forma diversa per ciurma. Sotto zoom 0,6 si torna allo sprite unico.
- **Audio, in parallelo:** motore nuovo con bus e registro, ogni evento a un suono, esplosioni a 3 strati, evento sim nuovo `passo`/`scivola`, via "boing" e "sproing", musica segnaposto procedurale, slider musica/effetti.
- **Numeri di battaglia di Bilanciamento** (un solo commit, §7): cannone 60 raggio 70, granata 52 raggio 64, pistola 28×2, sciabola 40, Mozzo ±14°/gittata ±35%.
- **Criterio di uscita:** 4 foto su 6 diverse nella camminata; turno umano ≤ 10 s; 3 contro 3 in ≤ 2-4 min; replay rigenerati.

### Fase 2 — Cala Pappagallo in alta definizione (L)
- **Terreno HD** (Tecnica): arte 4096×2048 in tessere 512, la distruzione la fa uno shader che legge la maschera della sim come texture (bordi lisci, bordo bruciato, fondo grotta); niente più ridisegno dei crateri sulla CPU. Risoluzione canvas fino a 2 con regolazione dinamica (se il frame supera 14,5 ms scende a 1,5 poi 1,25).
- **Arte della mappa** (Arte, Livelli, Mondo): fatta **in casa** col pittore in Chromium, a 2× (3× se i fps reggono). Stile "cartone dipinto": contorno marrone caldo, ombre dipinte, parallasse solo su cielo e lontano, niente oggetti sospesi, texture variate. Guida di sagoma sovrapposta all'arte con scarto ≤ 3 px.
- **Cala v3** (Livelli): stesso scheletro (4 livelli per lato, Rocca, ponti, arco), contorni rifatti con cengie e strapiombi; due vere gallerie al posto delle grotte ovali; asimmetria (lato dolce con rampa di sabbia a destra, parete con scala a sinistra); spiaggia, molo e veliero, orizzonte, alba nebbiosa (Mondo, Narrativa: Molo Storto, Relitto del Pappagallo Verde, Torre del Vedetta, Rocca dell'Occhio).
- **Appoggi da pirata:** muretti e casse alti 24-32 px ogni ~150 px (scavalcabili, riparo), 2 anelli di ferro per lato (punti per il rampino), liana-pendolo sul varco di 140 px, pozza di marea (tuffo senza danno). Collisioni e appigli **ricalcolati sull'arte nuova**.
- **Criterio di uscita:** guida sovrapposta ≤ 3 px; 60 fps su Pixel 6; caricamento ≤ 3 s; crateri integrati con l'arte (QA §3.3, §3.9).

### Fase 3 — Il campo si spezza (L)
- **Sostegno strutturale, tempo 1** (Livelli, Game design): dopo ogni esplosione, legno e roccia sotto 24 px non più collegati a terra, ferro o ancoraggi cadono in blocco e fanno macerie (8 PV a pirata, massimo 20 a turno, mai morte sicura). Calcolo solo attorno al colpo, ≤ 2 ms.
- **Elementi di Cala** (3 per lato): torre di vedetta che crolla, ponte di corda con 2 ancoraggi (tagli uno, cala di lato), **masso in bilico** che rotola fino alla Valle (danno 20 e spinta, da provare dopo l'implementazione).
- **Materiali:** legno che brucia 4 s, sabbia che chiude i buchi piccoli. Barili e casse riconoscibili (rosso esplode, blu acqua, giallo fuoco).
- **Strutture dipinte in pezzi** (Arte): 4-8 per struttura, ognuno con la sua maschera, così il codice li stacca; sprite di fuoco, fumo, spruzzo, polvere di crollo, scintille della miccia.
- **Leggibilità:** **anteprima delle conseguenze** tenendo premuto sul punto d'impatto (cratere e pezzi che cadrebbero, in rosso, con `simulaColpo`); combo "×N" con rallentamento 1,2 s, **senza bonus di danno**; contorno bianco ai pirati, ancora/teschio sopra la testa.
- **Regole anti-frustrazione:** niente crollo entro 120 px dagli spawn, niente crollo al turno 1, per ogni elemento un test che lo attiva con un colpo e misura il danno massimo.
- **Criterio di uscita:** almeno 2 elementi interattivi per mappa con test deterministico e replay rigenerato in commit a parte (QA §3.6).

### Fase 4 — Rampino, armi nuove, due spari, Prologo (L)
- **Rampino a corda** (Game design, UX, Tecnica): 2 lanci a turno, 260 px, non chiude il turno; si aggancia a roccia, travi, anelli di ferro, liane; dondolo a pendolo con tabella di seni; SALTA stacca e lancia con la velocità del momento. **Dondolo sulle liane** (seconda fase, dopo i movimenti base).
- **4 armi nuove:** Barile rotolante (tocco = piazza, tenuto = lo spingi giù per il pendio; esplode al secondo urto o dopo 3 s), Palla incatenata, Arpione (tira un nemico di 120 px verso bordo o mare), Sciabola che taglia funi e ponti. Con le 4 base fanno **8 armi attive**.
- **Due spari per turno di squadra** (timer unico 15 s, scegli chi spara toccando il pirata) insieme ai numeri di Bilanciamento (conflitto 4). Il tasto FUOCO e il timer vanno rivisti per i due mirini (con UX e Comandi).
- **Prologo a stazioni, ~4 minuti, giocabile subito** (Livelli, Narrativa, UX, Bilanciamento: oggi è perso, vince solo il 18-35% degli umani; servono un **Mozzo Tutorial** che spara a turni alterni e mai a meno di 150 px, spawn ≥ 300 px invece di 176, fuoco amico spento, obiettivo 80-90% di vittorie): Scarlatta e **Mastro Gancio** (2 pirati) contro 2 marinai; Gancio mostra e parla (fumetti da 5 parole, massimo 12 parole di testo), una mossa per volta: 1) molo e muretto, 2) scala della torre, 3) cannonata al ponte di corda, 4) liana-pendolo, 5) parabola sulla Rocca. Verbale, il pappagallo, ripete le regole del Re. Si entra senza menu e il primo scoppio arriva entro 90 s.
- **Criterio di uscita:** QA §3 interi, 8 armi, 60 fps, 3 contro 3 in 2-4 minuti, 0 errori in console, Prologo completabile dal bot.

### Squadra consigliata per P1 (un thread per agente, tutti Fable)
Come in M1: **Lead P1** (congela i contratti in `src/core/`, integra, unisce in `claude/studio-v2-integrazione`) e quattro agenti che riferiscono al Lead: **Fisica e combattimento** (movimento, crolli, rampino, armi, ritmo, IA), **Render e HD** (shader terreno, pirata a pezzi, effetti, camera), **Mappa e livelli** (Cala v3, pittore, appoggi, Prologo, test di raggiungibilità), **Audio** (motore, eventi, musica segnaposto). Più i controllori Design e QA già esistenti.

---

## 4. Pacchetto 2 — Mappa del mondo fisica + primo scenario (Opus)

**Obiettivo:** dal Prologo il giocatore vede il mare, salpa, conquista le 8 isole di «Acque di Casa» e arriva al paywall da 1,99 € con voglia di continuare. Durata attesa del cap. 1: ~35-45 min, tutta la parte gratuita.

**Cosa si può avviare subito, in parallelo a P1:** mappa del mondo (Pixi), tavolo e pedine, dati dello scenario, kit UI, menu. **Cosa aspetta la Fase 3 di P1:** i moduli di livello che usano i crolli e il generatore.

### Lavori
1. **Mappa del mondo fisica** (Mondo, Narrativa, Tecnica): scena Pixi separata, un'immagine unica in tessere 512, isole come sprite su un fondale unico, zone cliccabili da un'immagine "a indici" (un colore per isola), pan e zoom con la camera esistente, mappa logica 3072×1728, hitbox ≥ 56 px CSS. Fascia d'onda attorno all'isola col colore della ciurma, bandiera con emblema, **segnalino di legno col numero di pirati**, cartello grigio della Marina sulle isole nemiche, **icona del premio** sopra le isole non prese. Il resto del mondo sotto nebbia, che si alza per capitolo. Nessun shader d'acqua pesante: due fondali che scorrono.
2. **Il Tavolo del Timone** (Narrativa): carta stesa sul tavolo di Mastro Gancio a Porto Teschio; conquistare = Scarlatta stacca il cartello e pianta la bandierina rossa. Otto cartelli assurdi del Re, uno per isola, scritti nel copione.
3. **Il viaggio dopo il Prologo** (Mondo): il veliero va da Pappagallo a Porto Teschio con una scia e la nebbia si apre solo su 1A-1H. Cala Pappagallo compare sul bordo sud con la stessa silhouette della battaglia.
4. **Le 8 isole** (Livelli): 1A Porto Teschio (a mano, firma), 1B Baia dei Corvi, 1C Forte Rampino, 1D Scoglio della Vedetta, 1E Scogli del Rum, 1F Laguna Nera, 1G Secca del Barile, 1H Isolotto delle Cozze. **Un trucco ambientale ciascuna** (palafitte che crollano, gru con carico, bastione di ferro, torre con scale e liane, archi che crollano, stalattiti, dune con marea, palma-ponte). Biomi solo Isola, Porto, Scogliera, Grotta. Seme fisso validato per ognuna; icona sulla mappa nata dalla maschera.
5. **Kit di 12 moduli + generatore** (Livelli): torre, ponte, rampa, galleria, cengia, arco, molo, gru, muretto, masso, pozza, anello. Il generatore compone sagoma e moduli dal seme; validazione anti-frustrazione 06 §7 estesa.
6. **Tre tipi di scontro** (Progressione): **Assalto** (elimina tutti), **Bandiera** (sulla vetta, chi la strappa vince: si sale con scale, liane, rampino; condizione di vittoria nuova in `sim/`), **Duello** 1 contro 1 col capo (nessun codice nuovo).
7. **Premio subito a ogni isola** (Progressione): 1D Bandiera → Salto d'appoggio; 1C Assalto → Rampino in stiva + Dondolo; 1E → recluta; 1F notturna → Ancora d'abisso + Scivolata; 1G con 5 barili → recluta; 1H Duello con Cadetto Rigidini → Tuffo + bandiera Teschio fumante. Recluta = nome e aspetto diversi, stessi PV e stessa fisica. Stelle: ★★ entro il round 6, ★★★ senza perdere pirati nel Bandiera e nel Duello. Limite 8 round.
8. **Narrativa del cap. 1** (Narrativa): scene di apertura, cartelli, Rigidini in ogni boss minore con una scusa diversa, premi con 6 battute, **finale con cliffhanger** (lettera di Barbabrina che sfida Scarlatta). Mestieri dei pirati (Gabbiere, Cannoniere, Nostromo, Mozzo, Cuoco) come sapore.
9. **Kit UI dipinto e menu** (Arte, UX): pannelli a 9 fette in legno e pergamena, icone armi dipinte 128 px con la stessa grammatica, menu con un solo pulsante grande ("Carriera" o "Continua") e "Schermaglia" in basso.
10. **Business** (Business): wow di distruzione entro 5 minuti (ponte che crolla, barili a catena), prima arma nuova entro 10; **paywall solo dopo una vittoria**, a fine cap. 1 (schermata unica, un prodotto non consumabile 1,99 €, "Ripristina acquisto", "Continua gratis"); Play Billing, AAB firmato, inglese (~300 stringhe) **prima** del test chiuso; verifica nome sul Play Store e questionario IARC.
11. **Audio del pacchetto 2:** `mus_mappa`, `mus_conquista`, borbottio di Gancio, Verbale, Marina.
12. **Test chiuso 12 tester × 14 giorni:** va in calendario appena Prologo e cap. 1 reggono; è sul percorso critico (sono 14 giorni di attesa fissi).

### Criteri di uscita P2 (QA §3.10)
Un bot gioca ogni battaglia del cap. 1 in ≤ 4 min senza blocchi; salvataggio e ripresa a metà scenario senza perdite; ~95% di vittorie al primo tentativo; durata 35-45 min.

### Squadra consigliata per P2 (Opus, un thread per agente)
**Lead P2** + **Mondo e mappa** (Pixi, tavolo, nebbia, viaggio), **Scenario e livelli** (8 mappe, kit, generatore, Bandiera), **Campagna e narrativa** (progressione, premi, scene, paywall, salvataggio), **Arte UI** (kit dipinto, menu).

---

## 5. Ordine e dipendenze

```
P1 Fase 0 ─► Fase 1 ─► Fase 2 ─► Fase 3 ─► Fase 4
 (scale)   (movimento)  (Cala HD)  (crolli)  (rampino, armi, Prologo)
                │                      │
P2:   mappa del mondo, tavolo, menu ───┘ (parte subito, indipendente)
                       moduli, 8 isole, generatore ◄── dopo Fase 3
                       Bandiera, premi, paywall ◄── dopo Fase 4 (rampino)
```

**Percorso critico:** Fase 0 → Fase 1 → Fase 2 → Fase 3 → Prologo → 8 isole → test chiuso. Il test chiuso di 14 giorni non si può comprimere.

---

## 6. Modifiche a 00-DECISIONI da applicare

Il proprietario ha detto "decidete voi", quindi le registro in 00 §7 (decisioni prese senza chiedere). Se il proprietario non è d'accordo, si torna indietro:

1. §1.1 **timer 12 s per sparo** (25 s con Mozzo e Prologo, Timer lungo 45 s), **fuga 1,5 s interrompibile**, **cannone 60/70 e granata 52/64**.
2. §1.2 **camminata 60 px/s resta, corsa 96 px/s, scavalco 28 px (era 8)**.
3. 01 §3 "**il sospeso non crolla**" → **il campo si spezza** (tempo 1 in P1).
4. **Rampino da M2 a M1**; **Palla incatenata da v1.1 a M1**; **salto all'indietro abolito**.
5. **Due spari per turno di squadra**, insieme ai numeri di Bilanciamento (conflitto 4).
6. 03 §5.4 e n.30 (velatura al 35%, pergamena piatta) **decadono**: vale la mappa fisica col Tavolo del Timone.
7. 15 §2 e 16: sblocchi **per isola**; «Forte Uncino» → «Forte Rampino»; Prologo con 2 pirati giocabili.
8. Pittura della mappa: **a 2 px per unità, in casa**; Magnific solo per riferimenti.

---

## 7. Bilanciamento (misurato su ~9000 battaglie con sim e IA vere)

Documento: `bilanciamento.md`. Numeri decisi:
- **Armi con più raggio che danno:** cannone 60 / raggio 70, granata 52 / raggio 64 (era 45/55). Pistola 18×2 → 28×2, sciabola 25 → 40 (spinta 450 invariata). L'IA riceve +15 punti se la spinta porta in mare entro 100 px.
- **Due spari per turno insieme ai numeri nuovi:** 5 contro 5 passa da 17,7 a 14,0 turni, battaglie a tempo da 60% a 7,5%; 3 contro 3 ≈ 10,9 turni, 77 s di sim (≈ 2 min con la mira umana). Con i vecchi 45/55 resterebbe 24% a tempo: i due interventi vanno insieme.
- **Fuga 1,5 s interrompibile; timer 12 s per sparo (25 s Mozzo/Prologo); Timer lungo 45 s resta.** Il timer è una stima, non simulabile.
- **Mozzo:** errore ±14° e gittata ±35% (umano medio batte Mozzo ~83%; obiettivo 85%). Il Capitano va ritarato dopo.
- **Macerie:** 8 PV a pirata, massimo 20 per turno, sotto 5 PV non si mostra, non valgono come uccisione per l'IA. **Numeri a priori: si provano col simulatore dopo la Fase 3.**
- **Limite 18 turni, mare dal turno 12** restano. Le mappe devono essere più spesse (raggio 70-85 le svuota prima).
- **Replay d'oro:** un solo commit cambia tutti i numeri, alza `VERSIONE_REGOLE` e rigenera i 10 file (`npx tsx tests/replay/genera.ts`); la copertura (barile, mare, ritirata, lapide) resta verde. Non un numero alla volta.
- **Velocità di camminata/corsa:** non si tara ora (nella sim non influenza Mozzo): si ripete la misura dopo la Fase 1.
- Gli script del simulatore sono in `/mnt/project-files/studio-v2/bilanciamento/`.

---

## 8. Cosa NON si fa (somma dei ruoli)
Spine o altri rig a pagamento · spritesheet da video per i movimenti · ragdoll · motori fisici esterni · WebGPU · acqua che scorre · fuoco che si propaga · parallasse "per profondità" · mappa generata da Magnific in un colpo (esce a 1024 px) · joystick e tasti grandi · minimappa fissa · bonus di danno per le combo · tutte le 16 armi insieme · musica ElevenLabs da 90 s · voci in italiano · pubblicità, energia, cosmetici in vendita · le parole "Worms" o "Risk" nello Store · pause del timer con la griglia armi aperta.
