# Studio v2 · Audio (Sound Designer)

## 1. Cosa ho provato
Build web di `claude/m1-integrazione` (poi `studio-v2`), servita con `vite preview`, giocata in Chromium headless a 800×360 con tocchi e comandi veri: menu → Schermaglia → 5 turni di cannone, 60 s di battaglia con IA, una morte con lapide, casse, barili. Ho agganciato `AudioContext` per registrare ogni suono davvero partito e l'ho confrontato con il registro degli eventi del bus (`eventiBattaglia`). Ho riletto `piattaforma/audio.ts`, `ui/battaglia/stato.ts`, `08-audio.md`. Ho anche chiesto a Magnific i prezzi (sola simulazione, niente generato).

## 2. Cosa non va
1. **Il gioco suona poco e male.** Ci sono solo 14 suoni sintetizzati (bip e rumore filtrato): niente musica, niente ambiente, niente voci. Su 60 s di battaglia ho contato circa 30 suoni, quasi tutti "sparo" e "esplosione".
2. **Eventi muti:** `morto`, `lapide`, `turnoIniziato`, `mareSale`, `atterrato`, `colpoSciabola`, `colpoPistola`, `aggrappato`, `staccato`, `appiglioRotto`. La morte di un pirata avviene in silenzio.
3. **Il movimento non ha suono.** Non esiste nemmeno l'evento "passo": camminata, scalata e scivolata sono mute. Peggio ancora per il feedback "i pirati non sono vermi": oggi niente fa sentire che sono marinai.
4. **I suoni non pesano.** Un'esplosione è un solo rumore uguale per ogni materiale e dimensione, senza ducking: il colpo "non si sente nello stomaco".
5. **Volume unico a 3 scatti**, niente musica/effetti separati.
6. **Magnific è quasi a secco: 35 crediti disponibili.** Costi simulati: effetto 5 crediti per secondo per variante (cannone 2 s × 3 varianti = 30), ambiente 20 s = 100, musica Lyria 30 s = 80, musica ElevenLabs 90 s = **1.800**, battuta di voce ≈ 6. Il piano di `08-audio.md` (≈ 400 file, 14 musiche da 90 s) costerebbe oltre 30.000 crediti: non è realistico.

## 3. Decisioni
1. **Collegare tutti gli eventi a un suono, con 3 strati per le esplosioni** (boom per dimensione + strato materiale sabbia/legno/roccia/ferro + coda di detriti), pan stereo dalla x e ducking della musica (−5 dB sul boom grande). *Perché:* è l'intervento che fa "pesare" il colpo. **S** · Pacchetto 1.
2. **Suoni di movimento da pirata, non da verme.** Corsa a falcate = 2 passi per ciclo (stivale + tintinnio di fibbie), scalata = corda/legno che scricchiola a ogni presa (`aggrappato`/`staccato`), dondolio su liana = fruscio + scricchiolio a tempo, scivolata = sabbia/ghiaccio, tuffo = splash piccolo + "yo-ho". **Via il "boing" e lo "sproing" cartoon** dal pirata colpito e dal salto (08 §3.2): erano suoni da verme. Serve un evento nuovo `passo{pirata,materiale}` (e `scivola`) dalla sim, chiesto al Lead. **M** · Pacchetto 1.
3. **Musica: poche tracce, ma vere.** Lotto 1: `mus_menu`, `mus_prologo` (ukulele + fisarmonica, tranquilla, per Cala Pappagallo e il tutorial), `mus_batt_isola` (loop con due strati: base sempre, percussioni che entrano al turno 12 e quando un pirata muore), `mus_vittoria`, `mus_sconfitta`. Si tiene il re dorico e il motivo di 5 note di 08. Niente musica per ogni bioma finché non esistono i biomi. **M** · Pacchetto 1. Dal Pacchetto 2: `mus_mappa` (tappeto basso) e `mus_conquista`.
4. **Motore audio nuovo al posto di `audio.ts`:** registro `AUDIO` (id, varianti, volume, bus), bus musica/effetti/voci/UI, polifonia 24, 3 istanze per id, intonazione ±4%. Dove manca il campione resta il sintetico. **M** · Pacchetto 1.
5. **Musica segnaposto gratuita.** Finché non ci sono crediti: un loop procedurale in WebAudio (basso, pizzicato, tamburo, fisarmonica a onda stretta) in re dorico, 8 battute, due strati. Suona "indie" ma fa 90% del lavoro di far sentire il gioco vivo. **M** · Pacchetto 1.
6. **Voci: lingua inventata (decisa in 00 §9.5), ma ridotta.** Lotto 1: 2 timbri × 5 battute (`tocca`, `spara`, `colpito`, `morte`, `vittoria`) + 1 capitano. Tono da marinaio ("Arr!", "Yo-ho!"), non da verme ("uh-oh" acuto). Max una voce ogni 1,5 s. **S** · Pacchetto 1; capitani e fazioni Pacchetto 2.
7. **Ambiente:** `amb_mare_loop` e `amb_cala_loop` (pappagalli, legni, vento lontano). Fa da pavimento al silenzio tra i turni. **S** · Pacchetto 1.
8. **Segnali di gioco sonori:** campana di bordo a inizio turno (2 rintocchi tuo, 1 grave nemico), tic-tac negli ultimi 5 s (già c'è), rombo + legni quando il mare sale, rintocco su uccisione. Il banner resta: niente informazione solo sonora. **S** · Pacchetto 1.
9. **Impostazioni:** due slider (musica, effetti+voci) al posto del volume a 3 scatti; vibrazione resta accesa. Un solo evento muove suono e vibrazione. **S** · Pacchetto 1.
10. **Lotto 1 su Magnific, solo dopo il tetto del proprietario:** ≈ 40 effetti × 2 varianti × ~1,2 s (≈ 500), 2 ambienti da 20 s (200), 5 musiche con Lyria 30 s × 2 prove (≈ 800), 6 voci × 2 prese × 2 timbri (≈ 300): **circa 1.800-2.000 crediti**. Si parte da una prova da ≈ 150 (menu, cannone, esplosione) per giudicare la qualità. **S** · Pacchetti 1 e 2.

## 4. Cosa NON fare
- Niente 14 musiche e 400 file ora (08 §2-3): serve solo ciò che esiste nel gioco.
- Niente musica ElevenLabs da 90 s (1.800 crediti l'una): si usa Lyria 30 s e si fa il loop su battute intere.
- Niente voci in italiano, niente orchestra epica, niente basso sotto 60 Hz (il telefono non lo riproduce).
- Niente audio spaziale 3D: pan stereo semplice basta.
- Non generare nulla senza il tetto di crediti del proprietario.

## 5. Dipendenze e conflitti
- **Tecnica / Lead sviluppo:** evento `passo`/`scivola` nel contratto; motore audio in `piattaforma/` (oggi `audio.ts` è del Lead).
- **Animazione:** i passi devono partire sul fotogramma di appoggio del piede; se la falcata cambia, cambio anch'io.
- **Combattimento/Bilanciamento:** fermo immagine 70 ms e scossa camera (m1-ritmo §4) vanno sincronizzati al boom; non cambio i tempi, mi adatto.
- **UX / Arte-UI:** slider e icona suono in Impostazioni.
- **Narrativa:** nomi e carattere del capitano per le voci; il tutorial del Prologo usa `mus_prologo` e un rintocco a ogni passo completato.
- **Business:** i crediti Magnific sono un costo reale (oggi 35 disponibili).
- **QA:** verifica "nessun evento senza suono" con lo stesso aggancio di `AudioContext` che ho usato.

## 6. Domanda per il proprietario
Quanti crediti Magnific posso spendere per l'audio? (oggi ne restano 35)
- **A · Lotto 1 completo, a passi (consigliata):** ≈ 2.000 crediti, prima una prova da ≈ 150.
- **B · Solo effetti e voci:** ≈ 800 crediti; la musica resta il loop gratuito del codice.
- **C · Zero crediti:** tutto sintetizzato e migliorato nel codice.
