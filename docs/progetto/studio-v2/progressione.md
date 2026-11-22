# Progressione — Scenario 1 «Acque di Casa» (agente Progressione, studio v2)

## 1. Cosa ho provato
Build di `claude/m1-integrazione` (`npm ci`, `npm run build`, `vite preview`), Chromium headless a 800×360 con mouse veri: menu → Schermaglia 3 contro 3 su Cala Pappagallo → camminata, salto lungo, salto alto, mirino, FUOCO, primo turno dell'IA. Ho guardato 8 screenshot (menu, scelta, battaglia, salti, mira, impatto, turno IA). Ho riletto 00, 15, 16, 17: la Carriera a 8 capitoli esiste già sulla carta, non nel gioco.

## 2. Cosa non va
1. **Non esiste progressione.** Il menu ha solo «Schermaglia»; `src/mondo/` è vuota. Dopo una battaglia non c'è nessun motivo per farne un'altra.
2. **Un solo tipo di scontro** (elimina tutti) su ogni isola. Il cap. 1 di 15 è «7 battaglie uguali»: la monotonia che il proprietario ha già segnalato.
3. **I pirati sono tutti uguali** (stessa sagoma rossa) e salto lungo/alto sono da verme (screenshot dei salti). Niente per cui «crescere come pirati».
4. **Gli sblocchi di 15 arrivano tutti a fine capitolo**, dopo ~45 minuti. Il giocatore gratuito vede un solo «Nuovo nella stiva!».
5. **Le 8 isole valgono tutte uguale**: nessuna scelta su cosa prendere prima, oltre al bonus regione.
6. **Il cap. 1 dipende da armi M2** (Rampino, Ancora, Barile, Mina, Vanga): oggi in M1 non ci sono.

## 3. Decisioni
1. **Il cap. 1 diventa uno scenario guidato.** Stesse 8 isole di 15 §2 (nomi e rotte invariati), ma ogni isola ha scontro e premio propri (tabella sotto). Ordine libero, consigliato: round 1 → 1D e 1C; 2 → 1E; 3 → 1F e 1G; 4 → 1H. Limite 8 round (17). *S · Pacchetto 2.*
2. **Tre tipi di scontro, non uno.** **Assalto** (elimina tutti, come oggi); **Bandiera** (sulla vetta c'è la bandiera della Marina: chi la strappa vince subito, quindi si sale con scale, liane, rampino); **Duello** (1 contro 1 contro il capo, ~2 min: è già una battaglia 1-5 per lato, nessun codice nuovo). Solo il Bandiera richiede regole nuove. *Bandiera M, Duello S · Pacchetto 1 (regole) e 2 (uso).*
3. **Premio subito, non a fine capitolo.** Ogni isola presa mostra «Nuovo!» con un premio solo (arma, mossa o recluta). Il bonus regione (+2) resta: la Costa (1A-1D) si completa già al round 1, quindi il round 2 dà 5 rinforzi. *S · Pacchetto 2.*
4. **Mosse da pirata come sblocchi, non solo armi.** Dal Prologo: corsa a falcate, scale e liane. Poi una mossa per isola (vedi tabella): Dondolo, Salto d'appoggio, Scivolata, Tuffo. L'effetto preciso lo decide Combattimento; qui fisso solo *quando* arrivano. Risponde a «non è Worms». *M · Pacchetto 1.*
5. **Ciurma con volti, senza statistiche.** Scarlatta è sempre il pirata n. 1. Le **reclute** (1E, 1G) hanno nome e aspetto diverso (cappello, fascia, barba), ma stessi PV e stessa fisica. Nessuna identità persistente, nessun ferito: resta valido 00 §1.1. *S · Pacchetto 1 (aspetti) e 2 (reclute).*
6. **Armi in sequenza chiara.** Prologo: Barile, Mina, Vanga. Cap. 1: Rampino (1C), Ancora (1F). Se M2 non è pronta, il premio si dà lo stesso e l'arma resta «in arrivo». Dobloni nascosti fino al cap. 2 (17 §5). *S.*
7. **Stelle ritoccate:** ★★ vincere entro il round 6; ★★★ senza perdere pirati nel Bandiera e nel Duello. Premiano la varietà. *S.*
8. **Mappa del mondo fisica (come Risiko), per Opus:** un tavolo di legno con carta dipinta; le 8 isole come pedine di terra; **segnalini di legno con il numero di pirati**; bandierina di chi controlla; sopra ogni isola non presa **l'icona del premio** (rampino, ancora, recluta, bandiera). Il resto del mondo è coperto da nebbia e si alza per capitolo. *M-L · Pacchetto 2.*
9. **Misure:** ~35-40 min (6 battaglie), vittoria al primo tentativo 95% (17 §3).

| Isola | Marina | Scontro | Premio |
|---|---|---|---|
| 1D Scoglio della Vedetta | 1 | **Bandiera** (prima vetta, con tutorial di scala) | mossa **Salto d'appoggio** |
| 1C Forte Uncino | 2 | Assalto (primo attacco unito 1A+1B) | **Rampino** + mossa **Dondolo** |
| 1E Scogli del Rum | 2 | Assalto | **Recluta** |
| 1F Laguna Nera | 2 | Assalto notturno | **Ancora d'abisso** + mossa **Scivolata** |
| 1G Secca del Barile | 1 | Assalto con 5 barili già piazzati | **Recluta** |
| 1H Isolotto delle Cozze | 1 | **Duello** con il Cadetto Rigidini | mossa **Tuffo**, bandiera Teschio fumante, scena del pinguino |

## 4. Cosa NON fare
- Livelli, XP o alberi di abilità per pirata: contro 00 §1.1 e troppo lavoro.
- Più di 3 tipi di scontro nel cap. 1 (Pacchetto 1 non li regge insieme al resto).
- Eventi, bottega o Pergamene nel cap. 1 (insegna solo rinforzi, attacco unito, bonus regione).
- Battaglie in automatico per il giocatore (00 §9.7).
- Mosse nuove come tasti in più sull'HUD: si usano con i comandi v3 già decisi (gesti sul pirata o tasti contestuali accanto a scale e liane).

## 5. Dipendenze e conflitti
- **Combattimento:** regola Bandiera, effetto delle 4 mosse, Duello 1 contro 1. Se rifiuta le mosse, restano le armi come premi e perdo la risposta a «non è Worms».
- **Animazione/Arte:** quattro animazioni nuove (dondolo, appoggio, scivolata, tuffo) e aspetti delle reclute; mappa Cala Pappagallo HD (vale anche per il cap. 3).
- **Mappe/Livelli:** 5 mappe nuove per le isole, 1D con una vetta (la torre di Cala Pappagallo v2 va bene come modello), 1F notturna.
- **Narrativa:** le scene di 16 §4 restano; aggiungere 6 battute di «premio».
- **Onboarding/UX:** attacco unito e rinforzi si insegnano a 1C; 10 va riscritto sul cap. 1.
- **Bilanciamento:** `sim capitolo 1` con i tre scontri.
- **UX (`ux.md` dec. 3):** vuole il Rampino «Gancio» dal turno 1. Io lo darei al Forte Uncino (1C). Proposta di compromesso: nel Prologo c'è un solo punto con Rampino scritto, e il premio di 1C è il Rampino **in Stiva a ogni battaglia**; decide il Producer.
- **Mondo (`mondo.md` D8):** scrive 7 battaglie; io 6 conquiste + 1 eventuale ripetizione. Stesso scenario, solo un conteggio diverso.
- **Conflitto con 00/15:** 15 consegna gli sblocchi a fine capitolo; qui sono per isola. Cambia solo il momento, non l'elenco.

## 6. Domande per il proprietario
Nessuna indispensabile.
