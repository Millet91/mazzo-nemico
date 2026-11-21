# 16 — Storia della Carriera (scene, boss, finale, sconfitte)

*Narrative Designer. Si basa su 00 (fonte di verità, comprese le risposte del proprietario in §9: il rum resta, si gioca sempre con Scarlatta, capitolo perso = da capo), su 15-carriera (Prologo + 8 capitoli) e su 07. Dove 07 dice altro, per la Carriera vale questo documento; in §12 c'è l'elenco delle righe di 07 da cambiare. Tutti i testi sono originali, senza riferimenti a opere esistenti, e vanno nel file di stringhe con le chiavi indicate.*

## 1. Regole di scrittura delle scene

- **Scena** = pergamena con ritratto di chi parla (03), fumetti che si avanzano con un tocco, tasto «Salta» sempre visibile. Ogni scena parte da un **evento di gioco**, appare **una volta per partita al capitolo** e si rivede nel **Diario di bordo**.
- **Al massimo 3 fumetti per scena, al massimo 12 parole a fumetto.** Le righe `[regia]` sono istruzioni per grafica e animazione: **non** compaiono a schermo.
- Ogni capitolo ha **Inizio** e **Fine**; **Metà** e **Boss** solo dove servono. Se il capitolo si rigioca da capo dopo una sconfitta, le scene già viste si saltano da sole (resta «Rivedi» nel Diario).
- **Battute boss in battaglia**: massimo **5 parole** (regola di 07 §6), fumetto da 1,2 s, al 40% per evento, mai due di fila uguali.
- Chiavi delle stringhe: `car.c<N>.<scena>.<n>` (scene: `inizio`, `meta`, `boss`, `fine`, `fine_b`, `sconfitta`); battute boss: `car.boss.<nome>.<n>`.
- Voce: lingua inventata (00 §9.5), quindi il testo è tutto nel fumetto.
- Bottone, il pinguino, non parla mai: reagisce solo in `[regia]`.

**Chi parla.** Scarlatta (sempre la protagonista), **Mastro Gancio** (il suo vecchio nostromo e guida: barba bianca, uncino lucidato, prudente, l'unico che le dice "piano"), i quattro boss, qualche marinaio della Marina (nomi di 07 §7).

## 2. La storia in breve

Scarlatta trova sulla spiaggia di Cala Pappagallo una mappa del **Timone dei Venti**. Uno dei quattro **Raggi** è già suo, a Porto Teschio; gli altri tre li tengono Barbabrina (cap. 2), Dobloncino (cap. 4) e Morgana (cap. 6). Nel cap. 3 l'Ammiraglio Ceralacca le **sequestra** il Raggio del Gelo "per mancata dichiarazione in dogana", armato per la prima volta di un modulo firmato dal Re. Ogni boss battuto le **presta la ciurma** (diventa giocabile in Mondo libero e Schermaglia), ma resta un rivale: "il Timone resta una gara".

Nel cap. 7 Scarlatta deve tenere la Rotta dei Raggi perché il Timone giri, mentre Dobloncino e Morgana provano a portarglielo via. Vince, lo gira **troppo forte**: i Raggi schizzano di nuovo nelle capitali e tutti i mari dei capitoli si rimescolano nelle **28 Isole Spezzate**. Nel cap. 8, **"Il Gran Rimescolio"**, si riconquista tutto contro i tre rivali insieme. Nel finale lo gira piano. Quasi.

> **Nota sul mondo (per 07 §2).** Prima del rimescolio i mari dei capitoli sono lontani e separati; dopo, le isole finiscono tutte nel Mare dei Cento Venti, nella forma che il Mondo libero usa. Il menu della carriera lo mostra: la nebbia della `mappa_mondo` si alza mare per mare, e dopo il cap. 7 la mappa si "rimescola" con un'animazione di 3 s.

---

## 3. Capitolo 0 — Prologo: "Sbarco a Cala Pappagallo"

#### c0.inizio — dopo lo splash, sulla scialuppa (prima dei comandi di 10)
`[regia]` Nebbia all'alba. Scialuppa che tocca la sabbia. Scarlatta in piedi a prua, Mastro Gancio ai remi. Sulla spiaggia un cartello grigio e due marinai.
1. **Mastro Gancio**: «Capitana, è solo una spiaggia. Due marinai e un cartello.»
2. **Scarlatta**: «Un cartello? Allora c'è qualcosa da far saltare!»
3. **Cadetto Rigidini**: «Vietato sbarcare! Articolo sette, comma… ehm, sette.»

*(Il tutorial di 10 prosegue con i suoi fumetti. In 10 la battuta "Da Davy Jones!" va sostituita con "Vai dai pesci!": è un riferimento a un'opera esistente.)*

#### c0.fine — vittoria della battaglia
`[regia]` Il cartello fuma. Sotto la sabbia smossa da un cratere spunta una pergamena: la mappa dei mari coperta di nebbia, con quattro punti luminosi.
1. **Mastro Gancio**: «Una mappa del Timone dei Venti! Quattro Raggi, quattro capitali.»
2. **Scarlatta**: «Uno è già nostro. Gli altri tre… li andiamo a prendere.»
3. **Cadetto Rigidini** (scappando a nuoto): «Questo sarà verbalizzato!»

#### c0.partenza — si salpa da Cala Pappagallo (00 §9.18), subito dopo c0.fine
`[regia]` La ciurma carica la scialuppa sul veliero ormeggiato al molo di Cala Pappagallo. Le vele si gonfiano, l'isola con la sua Rocca si allontana. La camera sale e la mappa del Timone si apre sul mare: si entra nella mappa del cap. 1.
1. **Mastro Gancio**: «Si torna a casa, capitana?»
2. **Scarlatta**: «A casa, sì. A riprendercela.»

---

## 4. Capitolo 1 — Acque di Casa

#### c1.inizio — prima del round 1 (turno protetto)
`[regia]` Il veliero arriva da Cala Pappagallo e attracca a Porto Teschio. Su ogni isolotto vicino sventola un cartello grigio della Marina. Scarlatta stringe la mappa.
1. **Mastro Gancio**: «La Marina ha piantato cartelli su tutte le isole di casa.»
2. **Scarlatta**: «Su casa MIA? Ciurma, si stacca un cartello alla volta.»
3. **Mastro Gancio**: «Prima i rinforzi, poi l'attacco. E niente fretta, capitana.»

#### c1.meta — prima regione completa (primo bonus regione)
1. **Mastro Gancio**: «Regione intera! Ogni round arrivano pirati in più.»
2. **Scarlatta**: «Pirati gratis? Adoro la geografia.»

#### c1.boss — "Ultima isola": alla Marina resta 1 sola isola (nessun boss in questo capitolo)
1. **Cadetto Rigidini**: «Signora, quest'isola è l'ultima. Posso almeno finire il panino?»
2. **Scarlatta**: «Finiscilo in scialuppa. Hai trenta secondi.»

#### c1.fine — tutte le 8 isole conquistate
`[regia]` Fuochi d'artificio su Porto Teschio. Su un pezzo di ghiaccio arriva un pinguino (Bottone) con un biglietto nel becco, lo consegna e se ne va offeso.
1. **Scarlatta**: «Un pinguino? Nei mari caldi? Fammi leggere.»
2. **Mastro Gancio**: «"Stai lontana dal Raggio del nord. Firmato: Barbabrina."»
3. **Scarlatta**: «Mi ha appena dato l'indirizzo. Rotta a nord!»

*Fine della parte gratuita (00 §9.12): dopo questa scena, quando ci sarà lo sblocco a 1,99 €, compare la schermata "Sblocca". La scena chiude apposta su un aggancio.*

---

## 5. Capitolo 2 — Mari di Brina (boss: Barbabrina)

#### c2.inizio — prima del round 1
`[regia]` Neve sul ponte. Il guanto di Scarlatta fuma e scioglie i fiocchi. All'orizzonte la bandiera turchese a strisce del Gelo.
1. **Scarlatta**: «Che freddo! Per fortuna il mio guanto scalda sempre.»
2. **Mastro Gancio**: «Il Gelo attaccherà. Le difese, stavolta, le combatti tu.»
3. **Mastro Gancio**: «E c'è la bottega: mercenari e armi per la stiva.»

#### c2.meta — prima difesa vinta contro il Gelo
1. **Barbabrina**: «Hm. Respinti.»
2. **Scarlatta**: «Barbabrina! Ancora offeso per la storia della barba?»
3. **Barbabrina**: «La barba ricresce. Il rancore pure.»

#### c2.boss — prima della battaglia sul Fiordo del Kraken
`[regia]` Fiordo ghiacciato, mappa firma C2 (lotto 2; fino ad allora seme fisso). Barbabrina seduto su un trono di ghiaccio, Bottone nella barba. Dietro di lui il Raggio azzurro dentro un blocco di ghiaccio.
1. **Barbabrina**: «Il Raggio resta qui. Il nord resta a nord.»
2. **Scarlatta**: «Il Raggio viene con me. Il nord può venire a trovarlo.»
3. **Barbabrina**: «Bottone, prendi nota. Lei scivolerà.»

**Battute di Barbabrina in battaglia** (`car.boss.barbabrina.*`): «Hm.» · «Il ghiaccio aspetta. Anch'io.» · «Scivola, scintilla.» · «Bottone, prendi nota.» · colpito: «La mia barba!» · in mare: «Fresca. Hm.»

#### c2.fine — Fiordo del Kraken conquistato (sblocca i Corsari del Gelo)
`[regia]` Il ghiaccio si spacca, il Raggio azzurro vola in mano a Scarlatta. Bottone le becca le dita, poi le fa il saluto militare.
1. **Barbabrina**: «Hm. Le mie isole scivolano ancora a sud, capitana.»
2. **Scarlatta**: «Allora presta i tuoi ragazzi a me. Le fermiamo insieme.»
3. **Barbabrina**: «La ciurma te la presto. Il Timone resta una gara.»

---

## 6. Capitolo 3 — Isole Smeraldo (boss: Ammiraglio Ceralacca)

#### c3.inizio — prima del round 1
`[regia]` Molo di Cala Pappagallo (lo stesso del Prologo, ora con palme e giungla). Una nave grigia attracca, un marinaio mette un timbro enorme sul Raggio azzurro e lo porta via in una cassetta. L'Ammiraglio Ceralacca, giubba grigia, bottoni d'oro, parla da un megafono.
1. **Ceralacca**: «Raggio non dichiarato in dogana. Sequestrato, in nome del Re!»
2. **Scarlatta**: «Ridammelo subito, o ti timbro io!»
3. **Ceralacca**: «Impossibile. Ho il modulo firmato. Possiamo perfino attaccare!»

#### c3.meta — primo contrattacco della Marina (regola "Il modulo è firmato!")
1. **Ceralacca**: «Il modulo è firmato! Contrattacco autorizzato. In triplice copia.»
2. **Mastro Gancio**: «Mai vista la Marina attaccare. Tengono duro, capitana.»
3. **Scarlatta**: «Allora finalmente ci divertiamo!»

#### c3.boss — prima della battaglia sul Bastione di Ceralacca
`[regia]` Bastione con il Forte (ferro e roccia attorno a 2 spawn, su una collinetta). Ceralacca in cima a una pila di scartoffie. Il Raggio dentro una teca piena di timbri.
1. **Ceralacca**: «Per entrare serve il modulo B-12. In carta bollata.»
2. **Scarlatta**: «Ho portato un barile di polvere. Vale come timbro?»
3. **Ceralacca**: «…Questo sarà verbalizzato. Fuoco a volontà, uomini!»

**Battute di Ceralacca in battaglia** (`car.boss.ceralacca.*`): «Vietato sbarcare!» · «Fuoco! Firmato e controfirmato!» · «Mi serve un timbro…» · «Protocollo violato!» · colpito: «La mia giubba stirata!» · in mare: «Rapporto al Re. Glu.»

#### c3.fine — Bastione conquistato
`[regia]` Le scartoffie volano come coriandoli. Ceralacca, spettinato, fruga tra i fogli con il monocolo appannato.
1. **Ceralacca**: «Il modulo… è scaduto ieri. Isola ceduta temporaneamente.»
2. **Scarlatta**: «E il mio Raggio?»
3. **Ceralacca**: «Ritiro bagagli, sportello tre. Chiude tra cinque minuti.»

---

## 7. Capitolo 4 — Arcipelago d'Oro (boss: Don Dobloncino)

#### c4.inizio — prima del round 1
`[regia]` Isole con cartellini del prezzo. Un casello galleggiante sbarra la rotta; dentro, Dobloncino con il monocolo d'oro e un pallottoliere.
1. **Dobloncino**: «Benvenuta, capitana! Pedaggio d'ingresso: un doblone a onda.»
2. **Scarlatta**: «E se faccio saltare il casello?»
3. **Dobloncino**: «Allora il pedaggio raddoppia. E i miei avvocati si offendono.»

#### c4.meta — round 3, appare il Galeone del Tesoro (garantito, 15 §1.2)
1. **Mastro Gancio**: «Vele d'oro all'orizzonte! Il Galeone del Tesoro!»
2. **Dobloncino**: «Quel galeone è prenotato! Ho la ricevuta!»
3. **Scarlatta**: «Chi arriva prima, arraffa. Ciurma, ai remi!»

#### c4.boss — prima della battaglia al Mercato dei Ladri
`[regia]` Bancarelle, bilance, una cassaforte grande come una casa con il Raggio viola dentro. Dobloncino in piedi su un forziere per sembrare più alto.
1. **Dobloncino**: «Facciamo un affare: il Raggio, a rate. Comode rate.»
2. **Scarlatta**: «Facciamo un altro affare: io sparo, tu scappi.»
3. **Dobloncino**: «Offerta rifiutata. Ragazzi, difendete la merce!»

**Battute di Dobloncino in battaglia** (`car.boss.dobloncino.*`): «Ogni colpo ha un prezzo.» · «Ti faccio lo sconto!» · «Questo lo metto in conto.» · colpito: «Rimborso! Esigo un rimborso!» · colpita una cassa: «Era merce fragile!» · in mare: «Il mio monocolo!»

#### c4.fine — Mercato dei Ladri conquistato (sblocca la Fratellanza dell'Oro)
`[regia]` La cassaforte si apre con un PUF di fumo viola. Dobloncino conta le ultime monete, sconsolato.
1. **Dobloncino**: «Il Raggio è tuo. La ciurma, però, te la noleggio.»
2. **Scarlatta**: «Noleggio? Gratis, Don. Hai perso.»
3. **Dobloncino**: «Gratis… che parola orribile. Va bene. Ma il Timone si contratta!»

---

## 8. Capitolo 5 — Isole del Sole (Gelo + Oro, rivincita)

Nessun boss singolo: 15 lo prevede come capitolo "di respiro" con due rivali già conosciuti.

#### c5.inizio — prima del round 1
`[regia]` Dune e rovine sotto un sole enorme. Barbabrina sotto un ombrellone, Bottone che suda. Dobloncino che vende ventagli ai suoi stessi pirati.
1. **Barbabrina**: «Hm. Troppo sole. Ci rifacciamo, capitana.»
2. **Dobloncino**: «Rivincita! Io e il vecchio, soci. Cinquanta e cinquanta.»
3. **Scarlatta**: «Due contro una? Finalmente una sfida decente!»

#### c5.meta — prima battaglia tra Gelo e Oro
1. **Dobloncino**: «Socio! Quell'isola era mia, da contratto!»
2. **Barbabrina**: «Non leggo i contratti. Hm.»
3. **Scarlatta**: «Litigate pure, ragazzi. Io intanto prendo il resto.»

#### c5.boss — una riga quando cade la prima capitale rivale (variante per capitale)
- `car.c5.boss.gelo` (Duna del Cannone) — **Barbabrina**: «Anche al caldo, sei un incendio. Hm. Rispetto.»
- `car.c5.boss.oro` (Oasi dei Contrabbandieri) — **Dobloncino**: «L'oasi! Era la mia filiale migliore!»

#### c5.fine — vittoria (9 isole o le 2 capitali)
`[regia]` Tramonto sulle dune. All'orizzonte un miraggio: un galeone coperto di alghe con lanterne verdi, che naviga *sotto* l'acqua.
1. **Scarlatta**: «Bel miraggio. Nave verde, lanterne… e naviga sott'acqua?»
2. **Barbabrina**: «Non è un miraggio. È Morgana. Ha l'ultimo Raggio.»
3. **Dobloncino**: «Attenta: dice che le devo dei soldi. Calunnie!»

---

## 9. Capitolo 6 — Mare delle Ossa (boss: Morgana Salsedine)

#### c6.inizio — prima del round 1
`[regia]` Nebbia verde, relitti, lanterne che si accendono da sole. Morgana emerge da un'onda con un inchino teatrale, gocciolando.
1. **Morgana**: «Benvenuta nel Mare delle Ossa. Che entrata, eh? La mia.»
2. **Scarlatta**: «Bella. Ma la mia fa più rumore.»
3. **Morgana**: «Qui nessuno resta a fondo. Ogni round, uno dei miei torna.»

#### c6.meta — inizio del round 4 (regola "Vecchi lupi": Gelo e Marea si attaccano per ultimi tra loro)
1. **Barbabrina**: «Morgana. Vecchia amica. Hm.»
2. **Morgana**: «Barbabrina. Non ti attacco. Per ora.»
3. **Scarlatta**: «Ehi! Io sono qui! Attaccate me, almeno per educazione!»

#### c6.boss — prima della battaglia sul Cimitero di Galeoni
`[regia]` Cimitero di Galeoni di notte (mappa firma E3, lotto 2). Lanterne verdi che si accendono una a una. Morgana in piedi sull'albero maestro di un relitto, il Raggio verde appeso come una lanterna.
1. **Morgana**: «Il mare si è tenuto metà ciurma. Col Timone la riprendo.»
2. **Scarlatta**: «E se te li riporto io, i tuoi ragazzi?»
3. **Morgana**: «Prima battimi. Poi parliamo. Dal fondo si torna sempre.»

**Battute di Morgana in battaglia** (`car.boss.morgana.*`): «Che entrata, eh?» · «Il mare non dimentica.» · quando un suo pirata torna (sulla mappa, a fine battaglia): «Torna su, ragazzo!» · colpita: «Gocciolo, ma vinco.» · in mare: «Finalmente a casa!»

#### c6.fine — Cimitero di Galeoni conquistato (sblocca i Dannati della Marea)
`[regia]` L'ultima lanterna si spegne. Il Raggio verde galleggia da solo fino alle mani di Scarlatta.
1. **Morgana**: «Hai vinto. Tieni il Raggio, ma mantieni la promessa.»
2. **Scarlatta**: «Col Timone intero i tuoi ragazzi tornano. Parola di Scarlatta.»
3. **Morgana**: «Allora la mia ciurma è con te. Gocciolante, ma con te.»

---

## 10. Capitolo 7 — La Rotta dei Raggi (e il colpo di scena)

#### c7.inizio — prima del round 1
`[regia]` Porto Teschio. I quattro Raggi sul tavolo, il Timone quasi intero che vibra. All'orizzonte due vele: viola e verde.
1. **Mastro Gancio**: «Il Timone gira solo se teniamo la Rotta. Dieci isole, capitana.»
2. **Dobloncino**: «Contratto rivisto: il Timone è mio. Clausola scritta in piccolo.»
3. **Morgana**: «Niente di personale, Scarlatta. Ma lo giro io. Per sicurezza.»

#### c7.meta — primo attacco nemico a Porto Teschio
1. **Mastro Gancio**: «Attaccano Porto Teschio! Se cade, perdiamo i Raggi!»
2. **Scarlatta**: «Nessuno tocca casa mia. Nemmeno con un modulo firmato.»

#### c7.fine — vittoria (10 isole o le 2 capitali): il Timone
`[regia]` Notte di stelle su Porto Teschio. I quattro Raggi si incastrano con un CLICK e il Timone si accende d'oro. Tutta la ciurma trattiene il fiato.
1. **Scarlatta**: «Il Timone dei Venti. Intero. Nostro! Va be', mio.»
2. **Mastro Gancio**: «Piano, capitana. Un giro leggero, come una carezza.»
3. **Scarlatta**: «Leggero? Io? Tenetevi forte!»

#### c7.fine_b — COLPO DI SCENA: "Il Gran Rimescolio" (subito dopo, senza tornare alla mappa)
`[regia]` Scarlatta gira con tutte e due le mani. Il Timone vortica come una trottola, si spezza con un BOOM d'oro e i quattro Raggi schizzano via verso le quattro capitali. Le isole di tutti i mari ballano, si scontrano piano (BONK, BONK) e si rimescolano. La camera si allarga: la nebbia della `mappa_mondo` sparisce e appaiono le 28 Isole Spezzate in un mare solo. Sulle tre capitali rivali tornano le bandiere di Gelo, Oro e Marea.
1. **Mastro Gancio**: «Capitana… i Raggi sono tornati nelle capitali. Tutti e quattro.»
2. **Scarlatta**: «Ops. Però, che botto! Il più bello della storia.»
3. **Scarlatta**: «Si ricomincia. Tutti contro tutti. E stavolta lo giro piano. Promesso.»

*Dopo la scena: "Nuovo nella stiva!" (Coalizione, Rotta breve) e la mappa del menu che si rimescola (3 s). Il cap. 8 si apre dal menu, non in automatico.*

---

## 11. Capitolo 8 — Il Gran Rimescolio

#### c8.inizio — prima del round 1
`[regia]` La mappa intera delle Isole Spezzate. Tre capitani sui ponti delle loro navi, ognuno davanti alla sua capitale. Bottone guarda una bussola che gira a vuoto.
1. **Barbabrina**: «Hm. Il nord è finito a sud-est. Grazie, capitana.»
2. **Dobloncino**: «Raggi tornati a casa. Si riaprono le trattative!»
3. **Morgana**: «Tutti contro tutti, allora. Che entrata, questo finale!»

#### c8.meta — scatta la Coalizione contro il giocatore (≥ 12 isole)
1. **Dobloncino**: «Signori, la capitana è troppo grande. Proposta: tutti contro lei.»
2. **Morgana**: «Per una volta, siamo d'accordo. Coalizione!»
3. **Scarlatta**: «Tre contro una? Mi state facendo un complimento.»

#### c8.boss — una riga quando cade ogni capitale rivale (Raggio ripreso)
- `car.c8.boss.gelo` (Fiordo del Kraken) — **Barbabrina**: «Hm. Di nuovo. Bottone, segna: due a zero.»
- `car.c8.boss.oro` (Mercato dei Ladri) — **Dobloncino**: «Ancora tu! Il mio assicuratore non mi risponde più.»
- `car.c8.boss.marea` (Cimitero di Galeoni) — **Morgana**: «Il Raggio è tuo. La promessa, ricordatela.»

#### c8.fine — FINALE DELLA CARRIERA, parte 1: "Piano, stavolta" (vittoria: 16 isole o tutte le capitali)
`[regia]` Porto Teschio in festa. Le tre ciurme rivali sedute a un tavolo lunghissimo, bandiere intrecciate sopra le teste. Il Timone di nuovo intero al centro. Scarlatta lo sfiora con un dito solo. Le isole si avvicinano dolcemente e le rotte si allineano. Le isole del Gelo scivolano verso nord: Barbabrina **sorride** (mai visto) e Bottone sviene dall'emozione. Dobloncino pianta un casello e scopre che nessuno ha spiccioli. Dalla marea che si ritira risalgono i pirati di Morgana, interi e un po' confusi.
1. **Mastro Gancio**: «Capitana. Piano, stavolta. Pianissimo.»
2. **Scarlatta**: «Piano. Lo so fare. Credo.»
3. **Morgana**: «I miei ragazzi! Tutti interi! Asciugatevi, siamo a una festa.»

#### c8.fine_b — FINALE DELLA CARRIERA, parte 2: epilogo
`[regia]` Silenzio. Poi un ronzio. Una zanzara si posa sul Timone. Tra le nuvole un'ombra grande come una montagna si gira nell'amaca: il Vecchio Brontolone. Tutti guardano Scarlatta. Scarlatta guarda il cielo, poi il suo guanto che comincia a fumare.
1. **Vecchio Brontolone** (dal cielo, assonnato): «Zzz… chi ha toccato il mio timone?»
2. **Scarlatta**: «Nessuno! Cioè, io. Ma piano!»
3. **Scarlatta**: «Ciurma… qualcuno sa dov'è finito il Cannone delle Stelle?»

`[regia]` Stacco su nero, un solo BUM lontano, poi i titoli di coda sulla mappa delle Isole Spezzate. Dopo i titoli: "Nuovo nella stiva!" (bandiera Timone dei Venti, titolo "Leggenda dei Cento Venti", opzioni avanzate del Mondo libero) e un'ultima riga di Mastro Gancio: «Il mare è tutto vostro. Mondo libero, quando volete.»

---

## 12. Sconfitta del capitolo: "si ricomincia da capo"

Regola (00 §9.13): un capitolo perso **si ricomincia da capo**, dal round 1. L'autosalvataggio a metà capitolo esiste ma la sconfitta lo cancella. Gli sblocchi già guadagnati restano.

**Schermata fissa** (03, "La ciurma è affondata", in versione Carriera):
- Titolo: `car.sconfitta.titolo` «Capitolo perso»
- Riga fissa: `car.sconfitta.riga` «Si ricomincia da capo. Il mare aspetta.»
- Rassicurazione: `car.sconfitta.sblocchi` «Gli sblocchi restano tuoi. Il capitolo riparte dal round 1.»
- Tasti: `car.sconfitta.da_capo` «Da capo!» (primario) · `car.sconfitta.mappa` «Mappa dei mari» · `car.sconfitta.difficolta` «Cambia difficoltà» (15 §1.1)

Sopra la riga fissa, una mini-scena da 2 fumetti (avversario + Scarlatta). Causa: tutte le isole perse o limite di round; nel cap. 7 anche Porto Teschio caduto.

| Cap. | Avversario | Scarlatta |
|---|---|---|
| 0 | **Mastro Gancio**: «Niente paura, capitana. Si riprova lo sbarco.» | «Stavolta sbarco più forte.» |
| 1 | **Cadetto Rigidini**: «Isole restituite al Re. Compilate il modulo di uscita.» | «Da capo. E stavolta niente panino per nessuno.» |
| 2 | **Barbabrina**: «Hm. Il ghiaccio aspetta. Torna quando sei più fresca.» | «Si ricomincia da capo. Bottone, tieni pronto il taccuino.» |
| 3 | **Ceralacca**: «Pratica respinta. Ripresentare la domanda dall'inizio.» | «Da capo? Va bene. Ma il timbro lo porto io.» |
| 4 | **Dobloncino**: «Bilancio chiuso in perdita. Per te, s'intende.» | «Da capo. E il pedaggio non lo pago.» |
| 5 | **Barbabrina**: «Hm. Troppo sole, capitana. Riprova da capo.» | «Due contro una, di nuovo. Da capo!» |
| 6 | **Morgana**: «Dal fondo si torna sempre. Anche tu: da capo.» | «Torno su. E porto più polvere.» |
| 7 (Porto Teschio caduto) | **Dobloncino**: «Raggi acquisiti! Ottimo affare, capitana.» | «Da capo. E stavolta la porta di casa la chiudo.» |
| 7 (limite di round) | **Morgana**: «Il Timone non gira da solo, Scarlatta.» | «Allora da capo. Lo spingo io.» |
| 8 | **Morgana**: «Stagione delle tempeste. Il mare più grande non è tuo.» | «Da capo, allora. Tanto il mare lo conosco a memoria.» |

---

## 13. "Nuovo nella stiva!": una riga di Mastro Gancio per capitolo

| Dopo | Riga (`car.stiva.c<N>`) |
|---|---|
| Cap. 0 | «Barile, Mina e Vanga. Usali con giudizio. Ah, già: tu no.» |
| Cap. 1 | «Rampino e Ancora d'abisso. E la bottega apre per te.» |
| Cap. 2 | «Il Gelo è con noi! Più Palla spezzata e Bussola stregata.» |
| Cap. 3 | «Il Pappagallo postino consegna sempre. Anche quando esplode.» |
| Cap. 4 | «Rum incendiario: una bottiglia, sei fiammelle, zero pazienza.» |
| Cap. 5 | «Nelle casse ora può esserci l'Ira del Kraken. Occhio.» |
| Cap. 6 | «I Dannati della Marea sono con noi. Portate asciugamani.» |
| Cap. 7 | «Rotta breve pronta nel Mondo libero. E attenti alla Coalizione.» |
| Cap. 8 | «Il mare è tutto vostro. Mondo libero, quando volete.» |

---

## 14. Righe di 07 da cambiare

Il proprietario ha deciso che **il rum resta** (00 §9.6). Classificazione attesa probabile **PEGI 12** (la decide il questionario IARC). Linea di tono: il rum c'è come **cassa che cura** e come **arma**, ma nessuno si ubriaca: niente barcollamenti, niente "hic", niente battute sul bere troppo.

**§1 Tono**
- "per tutti (target PEGI 7)" → «per famiglie (classificazione attesa PEGI 12 per il rum: decide IARC)».
- "Niente sangue, insulti veri, crudeltà o alcol mostrato come bevuto (vedi domanda 2)" → «Niente sangue, insulti veri o crudeltà. Il rum compare come cassa (cura) e come arma (Rum incendiario), mai come ubriachezza.»
- "I dialoghi della campagna hanno al massimo 3 fumetti da 120 caratteri" → «Le scene hanno al massimo 3 fumetti da 12 parole (vedi 16 §1).»

**§2 Premessa**
- "con 18 isole il Timone gira" → «con **16** isole».
- Aggiungere in fondo la nota sul rimescolio di 16 §2 (i mari dei capitoli separati, poi uniti nelle 28 Isole Spezzate dopo il cap. 7).
- La nota sul dio "ubriaco" di 02 resta com'è: il Brontolone è infastidito da una zanzara, non ubriaco, anche con il rum ammesso (serve all'epilogo di 16 §11).

**§3 Capitani**
- "Il giocatore ne sceglie uno nella schermata Selezione ciurma" → «In **Carriera** si gioca sempre Scarlatta; le altre tre ciurme si sbloccano battendo il loro capitano (cap. 2, 4, 6) e si scelgono in Mondo libero e Schermaglia.»

**§4 Marina Reale**
- "Giubbe rosse impeccabili" → «Giubbe **grigie** con bottoni d'oro».
- "compare solo negli eventi e in un pannello di benvenuto" → «compare negli eventi ed è il **boss del cap. 3** (16 §6)».

**§5 Struttura della campagna**
- Titolo → «Momenti del **Mondo libero**» (la Carriera è in 16).
- Tabella: "9 isole" → «**8** isole»; "Finale: vittoria (18 isole…)" → «vittoria (**16** isole o tutte le capitali)».
- Teschio Rosso, Metà: "Nove isole e neanche un'ustione grave" → «Otto isole e neanche un'ustione grave…».
- Teschio Rosso, Finale: la gag del Timone girato troppo forte ora è il colpo di scena del cap. 7. Nuovo finale per il Mondo libero: «Scarlatta gira il Timone piano, per la prima volta. *"Visto? So essere delicata. …Non ditelo a nessuno."*»
- Fratellanza, Metà: "Nove isole!" → «Otto isole!».
- Aggiungere **Intro della Rotta breve** (uguale per tutti, prima del round 1): «Tre mari, due rivali, una rotta. Chi la tiene, gira il Timone.»

**§6 Battute in battaglia**: aggiungere due colonne.

| Cassa di Rum (+25 PV) | Rum incendiario (sparo) |
|---|---|
| "Rum! Come nuovo!" | "Rum incendiario in arrivo!" |
| "Cassa di Rum, evviva!" | "Scotta, eh?" |
| "Rimesso a nuovo!" | "Fiammelle per tutti!" |

**§7 Nomi**: "Uber" → **Ubaldo** (Ubaldo ha 6 caratteri, sta negli 8 previsti).

**§9 Carte**
- Titolo "Carte Mappa del Tesoro" → «**Pergamene**».
- "Bordata" → «**Fuoco di Copertura**» (la frase d'atmosfera resta).
- Il paragrafo sull'arma 15 "Scorciatoia segnata" si cancella: l'arma si chiama **Bussola stregata** (00 §1.3).

**§10 Coerenze**: tutto risolto da 00 §2.1 (nomi, colori, emblemi: Marea = conchiglia-teschio; il colore segue la ciurma). La sezione si cancella.

**Personaggi da aggiungere**
- **Mastro Gancio**: vecchio nostromo di Scarlatta e guida del tutorial (00 §2.1). Barba bianca, uncino lucidato, prudente. Battuta tipo: *"Piano, capitana."*
- **Bottone** (il pinguino) non parla: solo reazioni in regia.

**Domande per il proprietario**: tutte chiuse (1: nomi di 02 e colore per ciurma, 00 §2.1; 2: **il rum resta**, cassa Rum e arma Rum incendiario, il "Latte di cocco" e il "Fiasco al peperoncino" sono **aboliti**; 3: lingua inventata). La riga di 00 §6 "la cassa Latte di cocco nelle battute" decade.

**Da riportare anche fuori da 07** (per gli autori): 00 §1.1 e §1.3 (cassa **Rum** 30%, arma 7 **Rum incendiario**), 08 (`sfx_cassa_rum` resta, `sfx_arma_fiasco_rottura` → `sfx_arma_rum_rottura`), 09 §5.5 e 12 (il rum c'è), 10 (battuta "Da Davy Jones!" → «Vai dai pesci!»; dopo il Prologo niente scelta della ciurma).
