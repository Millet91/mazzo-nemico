# Revisione 1: cosa è cambiato dopo il test dello studio

Il primo giro di test ha prodotto 13 review in `studio/review/`: 12 ruoli più il Lead Designer. Questo documento dice cosa è stato fatto, come sono stati risolti i conflitti tra review e cosa resta aperto.

Il feedback di Daniele dopo la prima partita era: *"Non credo di aver capito come si gioca. Ma ho vinto tutto. Graficamente brutto e confuso. Meccaniche noiose."* Per questo le priorità sono state, in quest'ordine:

1. far capire il gioco;
2. far vedere causa ed effetto durante la risoluzione;
3. rendere la notte più difficile;
4. rendere le scelte più significative.

## 1. Capire come si gioca (UX, Marketing, Narrative, Creative Director)

- **Tutorial con la Nonna.** È un personaggio che parla, ha una voce e lascia una Brace già piazzata nel primo rintocco. I suggerimenti compaiono solo in Offerta e in Preparazione, mai durante la risoluzione.
- **Title screen.** Chi gioca per la prima volta trova come prima voce "Gioca la Prova con la Nonna". C'è anche una riga che racconta il mondo.
- **"Come si gioca, in tre righe".** Compare nella prima Preparazione di una notte vera e si chiude con "Ho capito".
- **Didascalie dei luoghi.** Spiegano la Coda, la Fila, la porta e il Rito. Ci sono etichette fisse anche su "Rito", "Trucchi", "porta" e "in Coda".
- **Didascalia della prima abilità nemica.** La prima volta che compare un'abilità nella Coda scoperta, il gioco la spiega.
- **Suggerimenti una tantum.** Uno spiega le forme delle difese nell'Offerta, uno la mappa e uno la Preparazione. Si possono riattivare dalle Impostazioni.
- **Previsione a parole.** Dice "perderai circa N Lumi (di solito tra A e B; hai L Lumi)", con colore di gravità e un avviso esplicito quando il rintocco può costare la notte.
- **Δ qualitativo nelle offerte.**
  - Simboli: ▲▲ aiuta molto, ▲ aiuta, = cambia poco, ▼ peggiora.
  - Si aggiunge "salva circa N Lumi". I numeri esatti si vedono con "Previsione dettagliata".
  - Se tutte le opzioni cambiano poco, il gioco dice di scegliere pensando ai rintocchi futuri.
- **Δ per Passo.** Mentre si piazza o si sposta un Segno, ogni Passo mostra i Lumi che si perderebbero mettendolo lì. Il migliore è evidenziato in verde.
- **Riepilogo dell'ondata.**
  - Riga "Senza i tuoi Segni, Trucchi e Rito avresti perso N Lumi", con il replay di quella versione.
  - Le 3 difese che hanno lavorato di più.
  - L'elenco di chi è arrivato alla porta, con il "Perché?" di ciascuno.
- **Introduzioni.** Ogni atto ha una schermata (nome, riga, famiglia di sventure in arrivo). Ogni Mazziere ha la sua (ritratto, battuta, regola).
- **Mazzieri che parlano.** Hanno battute per fase, quando perdono la loro carta e quando ti feriscono. Le élite entrano con una riga.
- **Glossario.** Nuovo in "Come si gioca": Lumi, Spiccioli, Deposito, Rancore (N5), Esilio, Lealtà, Silenzio, Affinare.
- **Contatori.** "Rintocco N di 15" nella barra in alto: con la mappa fissa la notte dura sempre 15 rintocchi (N8).

## 2. Causa ed effetto, e juice (UX, Art, Audio, Creative Director)

- Il sigillo che agisce si illumina e pulsa. Un raggio unisce la fonte al bersaglio quando sono su Passi diversi (Catena, Campana).
- **Colpi, blocchi e morti.**
  - La carta colpita trema e lampeggia; il blocco della Corazza ha il suo lampo.
  - La morte ha uno scoppio. I numeri fluttuanti salgono sopra la carta senza coprire la Forza.
- **Telegrafo e impatto.**
  - La carta sull'Uscio pulsa in rosso prima di colpire la porta.
  - All'impatto la Fila trema con una vignetta rossa, e c'è un breve hit-stop sui colpi grossi.
- **Altri segnali.**
  - Badge "Combo ×N" quando nello stesso tick scattano 3 o più colpi.
  - La porta ha 3 stati in base ai Lumi rimasti: integra, scheggiata, sfondata che tremola.
- **Riproduzione.**
  - Linea del tempo trascinabile, con segni per impatti, distruzioni e furti.
  - Il registro è cliccabile: si salta all'evento.
  - Tasti ←/→/Fine/Invio. ⚡ salta subito alla fine.
  - A fine ondata compare il grande "Riepilogo ▶", al posto dell'uscita automatica.
- **Audio.**
  - Nuovi cue: copia, abilità, campanello dei Segni intonato sul Passo, esilio, rimando, cadenza di fine, battito del cuore con pochi Lumi.
  - Opzione "audio ridotto". Il gioco tace quando l'app va in secondo piano.
- **Layout.**
  - Carte più grandi su desktop (Fila fino a 900 px) e barra in alto solida.
  - Grana del feltro, numeri tabulari, glifi dei nemici unici, niente oro sulle carte del Fato (Esattore, Processione).
  - Su telefono: barra delle azioni fissa in basso, bersagli di 44 px, `dvh`, safe area, niente overscroll.

## 3. Difficoltà (Balance, Systems, Lead Designer, QA)

- Vittorie del bot medio dall'**81% al 55%**, e del casuale dal 29% al 10% (1.200 run). Il report completo è in `docs/bilanciamento.md`.
- Mappa fissa con 4 rintocchi per atto (SD-1), Lumi 32, bonus notturno dell'Atto 3 a +2, Piena 12, élite più forti, Silenzio a cariche.
- I Segni che tolgono Forza colpiscono anche i tuoi Patti (CD-2).
- Tutti i bug P0 e P1 del QA sono corretti e hanno un test di regressione (`tests/revisione.test.ts`), tra cui il salvataggio che permetteva di rigiocare un'ondata ricaricando la pagina (P0-1).

## 4. Scelte più significative (Systems, Content, Lead Designer)

- **Deposito.** Tiene al massimo 4 difese: oltre, se ne vende una a metà prezzo (SD-4).
- **Affinare.**
  - Quando i posti di una famiglia sono pieni, la terza opzione diventa "Affina una tua difesa".
  - Al Mercante: 20 ¢, una volta per negozio.
- **Offerte.**
  - Le triadi hanno sempre almeno 2 famiglie diverse.
  - Stracciare la carta del Mazziere dà un trofeo: una difesa rara in premio.
- **Patti.** Al massimo 3 candidati, 4 Patti nell'Atto 3.
- **Coda.** Le carte scoperte in Preparazione sono quelle vere, fissate prima del Rito. La previsione le tiene ferme.

## Conflitti tra review e come sono stati risolti

| Tema | Posizioni | Decisione |
|---|---|---|
| Gazza che ruba due volte | QA: lista di bottini. Systems: un solo bottino. | Un solo bottino; una carta che ne ha già uno prende 3 Spiccioli. Più leggibile. |
| Asso "Scambia" su un tuo Patto | QA lo segnala come bug, il Lead Designer chiede di vietarlo | Vietato: lo scambio rifiuta i Patti. |
| Tagliola | Lead Designer: paga solo le sue uccisioni. Content: solo economia. | Paga solo se la carta muore nel suo Passo (proposta del Lead Designer). |
| Rogo troppo forte | Lead Designer e Balance: nerf dei numeri. Creative Director: dargli un prezzo. | Numeri invariati; il prezzo è CD-2 (colpisce anche i tuoi Patti). Da rimisurare dopo il playtest umano. |
| Lumi iniziali | Lead Designer 33, Systems 32, Balance 40 con ondate più dure | 32: con la mappa fissa e le élite più forti il medio è già al 55%. |
| Pescate del Sagrestano | Balance: −1 pescata | Invariate: abbassare il Sagrestano alza la quota di danno degli altri Mazzieri. Resta aperto (vedi sotto). |
| Spina contro Corazza 2 | QA chiede di chiarire | Comportamento attuale confermato, come dice il testo: la Spina toglie 1 Corazza e colpisce nello stesso tick. Lo Spaventapasseri ora ha Corazza 1 (Content), quindi il caso "Corazza 2" non c'è più nel mazzo base. |
| Prefica che si dà +1 | QA: bug | Corretto: il Lamento vale per le *altre* carte. |

## Resta aperto per il prossimo giro

- **Bilanciamento.**
  - I Mazzieri pesano il 42% del danno (obiettivo sotto il 35%).
  - I bot finiscono con circa 100 Spiccioli non spesi.
  - Il Rogo resta la difesa con più vittorie.
- **Musica.** Gli stem del GDD §11.2 (temi dei Mazzieri, griglia a 96 BPM, mixer a 3 canali) si fanno con l'audio definitivo. Oggi c'è il pulse sintetizzato più i cue nuovi.
- **Grafica definitiva.** Il registro è pronto: `image2x`, `source`, `tint`, cornici, overlay ed effetti, `npm run assets:check`. Le regole di prompt e i 3 lotti per Magnific sono in `ASSETS.md`. Logo con i semi, glifi SVG dei semi, candele alla porta e spessore del mazzo arrivano con gli asset.
- **Mobile avanzato.** Offerta a carosello in un pannello dal basso e Fila verticale compatta con le etichette dei Segni: da rifare sul layout definitivo, dopo l'APK di prova.
- **Narrativa.**
  - Gli abitanti che ricordano il Baro (N15) richiedono un registro per profilo degli incontri.
  - Il Baro Caduto completo (N17) è solo accennato: c'è la riga del Quaderno alla sconfitta.
- **Strumenti di playtest.**
  - Già pronti: telemetria locale, micro-questionario a fine notte, "Segnala un problema", esporta e importa i dati, seed leggibili, Notte della settimana, testo da condividere e Quaderno come immagine.
  - Mancano la modalità registrazione video e i link di sfida con il risultato da battere.
