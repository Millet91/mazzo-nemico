# Narrativa — Studio v2

## 1. Cosa ho provato
Build di `claude/m1-integrazione` (c36bb52): `vite build` + preview, Chromium headless a 800×360 con tocchi veri. Ho aperto il menu, la Schermaglia 3 contro 3 su Cala Pappagallo, ho sparato un colpo e aspettato il turno dell'IA fino al turno 3. Guardati 6 screenshot e la mappa del Prologo in `arte/`. Riletti 00, 07, 10, 15, 16 e `it.ts`. Il copione completo (testi pronti) è in **`narrativa-copione.md`**.

## 2. Cosa non va
1. **Il gioco non racconta niente.** Nessun fumetto, nessuna scena, nessuna battuta. L'unica "voce" è «Trascina il mirino oro» (screenshot 03). Un pirata che non parla è un verme con il cappello.
2. **Tutti i pirati sono la stessa sagoma rossa** con un nome sopra. Non si capisce chi è Scarlatta. Nel turno dell'IA (screenshot 06) il pirata in alto a destra mi è sembrato rosso, non grigio: da controllare con l'Arte, perché la Marina deve essere grigia (00 §2.1).
3. **Nomi segnaposto sbagliati in `it.ts`:** «Uncino» è un riferimento a un'opera esistente (e Mastro Gancio ha già l'uncino); «Bottone» è il pinguino muto; Barbabrina, Dobloncino, Morgana e Ceralacca sono usati come pirati qualunque, ma sono i boss e devono restare unici. Stesso problema per l'isola «Forte Uncino».
4. **Il movimento da verme non ha una ragione nel mondo.** Nulla dice perché un pirata saltelli. Se la regola di bordo è un'altra, lo sentiranno anche gli animatori.
5. **Cala Pappagallo è muta.** Molo, relitto, torre e rocca esistono sulla mappa ma non hanno nome né funzione nel racconto.
6. **Fine battaglia fredda:** «Vittoria! Ciurma nemica tutta a mollo o a terra.» Nessuna ricompensa di storia.
7. **La mappa del mondo non ha un perché fisico.** Per farla "stile fisico" serve un oggetto nel mondo: un tavolo con pedine.

## 3. Decisioni

1. **Legge di bordo** (S, Pacchetto 1). *«Sul ponte si corre, sul sartiame si sale, nessun pirata striscia.»* È la regola di mondo che giustifica il nuovo movimento: corsa a falcate, arrampicata su corde e liane, dondolio, tuffo. Mastro Gancio l'ha insegnata a tutti con il suo uncino: così il **Rampino** è una "lezione di Gancio", non un'arma strana. L'Animazione sceglie i gesti, io do le battute (una per gesto, §7 del copione).
2. **Ogni pirata ha un mestiere** (S, P1): Gabbiere (si arrampica), Cannoniere, Nostromo, Mozzo, Cuoco. Solo sapore: nome, una frase tipica e un gesto di riposo diverso. Così non sono cinque sagome uguali.
3. **Mastro Gancio gioca il Prologo** (M, P1): è il secondo pirata del giocatore (10 prevede 2 contro 2) e la voce dei suggerimenti. Il tutorial diventa lui che mostra, non un fumetto anonimo.
4. **Verbale, il pappagallo della Marina** (S, P1+P2): vive sul cartello di Cala Pappagallo e ripete le regole del Re («Vietato sbarcare!»). Dà il nome all'isola. Alla fine del Prologo passa dalla parte di Scarlatta e diventa la mascotte della ciurma e il **Pappagallo postino** (arma 9). Parla poco, non è un personaggio da dialogo.
5. **Cala Pappagallo in 3 atti con luoghi con nome** (M, P1): *Molo Storto* (spawn, sbarco), *Relitto del Pappagallo Verde* (cassa e Rum), *Torre del Vedetta* e *Rocca dell'Occhio* (il marinaio sul bordo e quello nella buca). Ogni atto ha una scena breve. Ai Livelli serve solo mettere i segnaposti dove già sono.
6. **Marina grigia con nomi da regolamento** (S, P1): grado + cognome (Cadetto Rigidini, Sergente Bottoni…), mai i nomi dei boss. Ceralacca resta solo boss del cap. 3. Le liste definitive sono nel copione §8.
7. **Fumetti in battaglia** (M, P1): 5 parole, 40%, come 07 §6, più una battuta per ogni gesto di movimento e per l'arma usata. Voce: borbottio, il testo sta nel fumetto.
8. **Il Tavolo del Timone** (M, P2): la mappa del mondo è una carta stesa sul tavolo di Mastro Gancio a Porto Teschio, con **pedine di legno** (i pirati) e **cartelli grigi di cartone** della Marina. Conquistare = Scarlatta stacca il cartello e pianta una bandierina rossa. Dà senso fisico al "come Risiko".
9. **Primo scenario = Cap. 1 "Acque di Casa", reso più personale** (L, P2): ogni isola ha un cartello assurdo della Marina (regola del Re). Toccando l'isola si legge il cartello. Rigidini torna in ogni boss minore con una scusa diversa (il panino). Otto cartelli scritti nel copione §5.
10. **Rinomina** (S, P2): «Forte Uncino» → **Forte Rampino**; liste nomi di `it.ts` sostituite (copione §8).

## 4. Cosa NON fare
- Niente voci vere né dialoghi lunghi: 3 fumetti, 12 parole, tasto «Salta».
- Niente scelte o rami. La storia è lineare, il giocatore gioca solo le battaglie.
- Niente lore di Terramagna e del Vecchio Brontolone nel Prologo: sta nei cap. 7-8 (la zanzara è l'epilogo).
- Niente riferimenti a opere esistenti (Davy Jones, Uncino, e simili).
- Niente ubriachi: il Rum cura e brucia, nessuno barcolla (00 §9.6).
- Niente storia personale per ogni pirata semplice: bastano nome, mestiere e una frase.

## 5. Dipendenze e conflitti
- **Animazione:** i gesti della Legge di bordo; ogni gesto ha una battuta già scritta.
- **Arte/UI:** Marina grigia, fumetti da 5 parole sopra un pirata di 37 px, pedine e cartelli del Tavolo, scena-pergamena con ritratto.
- **Livelli:** segnaposti con nome sulla mappa HD (molo, relitto, torre, rocca, cartello).
- **UX/Onboarding:** il tutorial di 10 cambia voce (Gancio) ma non passi; «Vai dai pesci!» resta.
- **Game design:** serve che il Prologo abbia 2 pirati giocabili (Scarlatta e Gancio) e 2 marinai.
- **Audio:** borbottio diverso per Gancio, Verbale, Marina.
- **Business/Progressione:** il cap. 1 chiude su un aggancio (biglietto di Barbabrina); nessun cambio.

## 6. Domande per il proprietario
Nessuna indispensabile.
