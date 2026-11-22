# QA — studio v2 (21/11/2026, sera)

## 1. Cosa ho provato
Build di produzione di `claude/m1-integrazione` (c36bb52; `main` ha solo lo scheletro M0), Chromium headless con tocchi veri, a **800×360** e **1080×486**. Ho giocato a mano la prima mossa, camminata, salto, scale, menu armi, pausa, esci. Poi 4 partite intere contro l'IA con un bot che tocca davvero i tasti (Cala Pappagallo 800 e 1080, isola casuale 1080) e 2 sonde sulla simulazione (stessa mappa, stessi numeri). Ho guardato circa 60 screenshot. Prove e script: `qa-sonde-scale.ts.txt`, `qa-bot-*.txt`; immagini in project files `qa/studio-v2/`.
Limite onesto: il bot mira a caso, quindi non posso dire se un umano riesce a colpire; gli fps in browser senza GPU (software) non valgono per il Pixel 6.

## 2. Cosa non va (per gravità)
1. **Le scale non funzionano** (segnalazione del proprietario, riprodotta). Sulla sim con la mappa vera: la scala x=428 e la x=1618 (le due vicine ai pirati 2 e 3 di ciascuna squadra) portano il pirata solo da y 840 a ~807 su una scala alta 86 px: poi resta appeso fermo, per sempre. Dall'alto, "scendi" lo aggancia e lo molla subito a terra (provato anche nel browser: 9 secondi col tasto premuto, il pirata non si muove). La scala x=202 funziona su e giù. Probabile causa: l'asse della scala è a 6 px dalla roccia e il pirata (largo 12) non si centra sull'asse, quindi con la capsula urta la parete. Foto `04-scala-428-ferma.png`.
2. **La liana di Cala Pappagallo non si raggiunge.** Il primo pirata (Scarlatta) camminando a destra si ferma a x=899: la cengia con barile e liana (x=906–936) sta 18-20 px più in alto, e il massimo scalino è 8. Sei salti di fila: salgono di ~40 px e ricadono nello stesso punto. Nel browser lo stesso salto a volte fa cadere giù per il ponte con danno (−6 PV). Foto `02`, `03`.
3. **Un compagno blocca la strada a un altro.** Uncino cammina a sinistra e si ferma contro Fumo per 10 secondi: la scala dietro Fumo è irraggiungibile per lui (visto in 1 partita, da confermare nel codice).
4. **Il pirata si muove "da verme"**: nella camminata (6 foto a 150 ms, `07`) lo sprite è identico in tutte, scivola sul terreno senza gambe né dondolio; il salto è un saltello (alto 44 px, 0,4 s). Tutti i pirati sono la stessa capsula rossa con un occhio.
5. **Combattimento lento e monotono.** 4 armi (cannone sempre selezionato; 12 lucchetti nel menu), un solo colpo a turno. Tra due miei colpi passano 13-14 s (6-7 miei, 6 dell'IA che "medita"). 18 turni = 9 a testa ≈ 2 minuti; la partita 1 è finita a tempo senza che l'IA perdesse un pirata. Niente elementi ambientali oltre ai barili e al mare che sale dal turno 12.
6. **Aspetto e HUD a 800×360**: i crateri sono cerchi neri sopra l'arte dipinta; sul campo c'è una banda scura rettangolare semitrasparente (visibile in `04`); la mappa casuale ha colori piatti e macchie grigie (`05`); le frecce ◀▶ coprono i pirati compagni e il suggerimento copre il fondo; il menu armi occupa metà campo e non si chiude con Esc (`06`).
7. **Tiro che ferisce chi spara**: un colpo a 37°/73% contro il pendio vicino ha tolto 17 PV a chi lo ha sparato (`05`). Il tasto FUOCO non avvisa quando l'impatto è a meno di ~60 px.

Tutto il resto regge: 0 errori in console in 4 partite, pausa ferma il timer (29→29 in 3 s), "Esci" torna al menu, fine partita corretta.

## 3. Decisioni (criteri di accettazione della v2)
1. **Scale e liane percorribili** (S, Pacchetto 1). Pirata centrato sull'asse all'aggancio; asse ≥ 10 px dalla roccia; "scendi" dall'alto funziona. *Accettazione:* test automatico su ogni mappa fatta: ogni appiglio si percorre tutto, su e giù, in ≤ lunghezza/40 + 1 s; più un e2e nel browser con tasti veri.
2. **Raggiungibilità** (S–M, P1). Test "dagli spawn si arriva a ogni cengia, barile, appiglio con le mosse vere" (camminare, saltare, scale). *Accettazione:* zero zone utili irraggiungibili; scalino ≤ 8 px o rampa; il salto supera uno scalino di 24 px; i compagni non bloccano.
3. **Mappa in alta definizione** (M–L, P1). Arte ridisegnata, ma collisione e appigli ricalcolati sull'arte nuova. *Accettazione:* guida di sagoma sovrapposta all'arte (scarto ≤ 3 px); crateri integrati con la grafica (non cerchi neri).
4. **Movimento da pirata** (L, P1, lo decide Animazione). *Accettazione QA:* in 6 foto a 150 ms di camminata, almeno 4 diverse; arrampicata, dondolio e scivolata visibili in foto; il salto non è più un saltello da 44 px.
5. **Ritmo** (M, P1). *Accettazione:* tempo morto fra due azioni dell'umano ≤ 8 s se non tocca nulla (oggi 13-14 s con l'IA); turno IA ≤ 4 s; partita media 2-4 minuti, almeno 1 pirata colpito per squadra nel 90% delle partite del bot di prova.
6. **Più armi e ambiente interattivo** (L, P1, lo decide il Game Designer). *Accettazione:* ≥ 8 armi attive; ≥ 2 elementi ambientali per mappa (es. ponte che cede, sassi che crollano) con test deterministico ciascuno e replay d'oro rigenerato in commit separato.
7. **Sicurezza del tiro** (S, P1). Avviso se l'impatto è vicino al pirata; nessun danno a sé nei casi "pendio vicino" della sim.
8. **HUD 800×360** (S, P1). Frecce non sopra i compagni; menu armi < 35% del campo e si chiude toccando fuori e col tasto indietro; nessun controllo sotto i 44 px di tocco.
9. **60 fps Pixel 6** (M, P1+P2). *Accettazione:* "Prova 60 fps" sul telefono con mappa HD e effetti: medio ≥ 58, minimo ≥ 50; sim ≤ 2 ms/tick; caricamento mappa ≤ 3 s; il Lead tecnico fissa il peso massimo delle texture. In browser senza GPU contano solo i confronti prima/dopo.
10. **Mappa del mondo e primo scenario** (P2). *Accettazione:* ogni isola ha una battaglia vincibile (bot di partita intera completa ogni battaglia dello scenario in ≤ 4 min senza blocchi); salvataggio e ripresa a metà scenario senza perdite.

## 4. Cosa NON fare
- Non cambiare di nuovo i comandi v3 (il proprietario li ha approvati): solo rifiniture.
- Non misurare gli fps con il browser software e dirli "del telefono".
- Non spostare la liana disegnandola altrove senza ricalcolare gli appigli.
- Non giudicare il bilanciamento con il mio bot casuale.
- Non rigenerare i replay d'oro insieme ad altre modifiche.

## 5. Dipendenze e conflitti
- **Level Designer / Art Director:** collisioni e appigli dipendono dall'arte HD; vanno rifatti insieme, non uno dopo l'altro.
- **Animazione:** il movimento da pirata cambia la capsula di collisione; avvisare QA prima.
- **Game Designer combattimento:** armi e ambiente rompono i replay d'oro; vanno rigenerati dopo.
- **Lead Tecnico:** budget texture e il test di raggiungibilità vivono in `tests/qa/`.

## 6. Domande per il proprietario
Nessuna indispensabile.
