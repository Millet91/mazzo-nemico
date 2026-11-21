# 02 — Mondo e strato strategico ("Risiko")

## 1. Il mondo: le Isole Spezzate
Un arcipelago nel **Mare dei Cento Venti**, nato quando un dio-pirata ubriaco spaccò il continente a cannonate. Da allora le isole sono contese da quattro ciurme e dalla **Marina Reale** (neutrali). 28 territori, 6 regioni.

### Mappa schematica
```
                [C] MARI DI BRINA (nord)
                 C1  C2
                   C3  C4
   [A] COSTA         |      \
   DEL TESCHIO   [D] ARCIPELAGO D'ORO    [F] ISOLE DEL SOLE
   (ovest)        D1 D2 D5 ---------- F1 F3 F5
   A1 A2 A4 ----- D3 D4 ------------- F2 F4
   A3 A5           |   \                  |
     |            [B]   [E] MARE DELLE OSSA (sud-est)
   [B] ISOLE SMERALDO    E1 E2 E3 E4 E5
   (sud-ovest)
```

### Regioni, bonus e territori
| Regione | Terr. | Porte d'accesso | Bonus rinforzi |
|---|---|---|---|
| A Costa del Teschio | 5 | 4 | +3 |
| B Isole Smeraldo | 4 | 3 | +2 |
| C Mari di Brina | 4 | 3 | +2 |
| D Arcipelago d'Oro | 5 | 5 | +4 (+2 dobloni) |
| E Mare delle Ossa | 5 | 3 | +3 |
| F Isole del Sole | 5 | 3 | +3 |

Regola usata: bonus ≈ (territori + porte) / 3, arrotondato. D è al centro, ricca e difficile da tenere.

### Elenco adiacenze completo (rotte marine, tutte bidirezionali)
**A — Costa del Teschio**
- A1 Porto Teschio ★: A2, A3, A4
- A2 Baia dei Corvi: A1, A4, **C1**
- A3 Scogli del Rum: A1, A5, **B1**
- A4 Forte Uncino: A1, A2, A5, **D1**
- A5 Laguna Nera: A3, A4, **B1**, **D3**

**B — Isole Smeraldo**
- B1 Cala Pappagallo: B2, B4, **A3**, **A5**
- B2 Giungla dei Tamburi: B1, B3, B4, **D3**
- B3 Vulcano Brontolone: B2, B4, **E1**
- B4 Spiaggia del Naufrago: B1, B2, B3

**C — Mari di Brina**
- C1 Punta Ghiacciolo: C2, C3, **A2**
- C2 Fiordo del Kraken ★: C1, C3, C4
- C3 Faro Spento: C1, C2, C4, **D2**
- C4 Banchisa dei Lupi: C2, C3, **F1**

**D — Arcipelago d'Oro**
- D1 Isola del Tesoro: D2, D3, **A4**
- D2 Zecca Clandestina: D1, D3, D5, **C3**
- D3 Mercato dei Ladri ★: D1, D2, D4, **A5**, **B2**
- D4 Molo dei Dobloni: D3, D5, **F2**, **E2**
- D5 Torre del Governatore: D2, D4, **F1**

**E — Mare delle Ossa**
- E1 Relitto Fantasma: E2, E3, **B3**
- E2 Gorgo del Diavolo: E1, E3, E5, **D4**
- E3 Cimitero di Galeoni ★: E1, E2, E4
- E4 Isola Sirena: E3, E5
- E5 Scoglio della Forca: E2, E4, **F4**

**F — Isole del Sole**
- F1 Duna del Cannone: F2, F3, **C4**, **D5**
- F2 Oasi dei Contrabbandieri: F1, F3, F4, **D4**
- F3 Tempio Sommerso: F1, F2, F5
- F4 Rocca Scorpione: F2, F5, **E5**
- F5 Capo Tempesta: F3, F4

★ = capitale di una ciurma. In grassetto le rotte tra regioni (13 in totale; 47 rotte complessive, verificate simmetriche). Ogni territorio ha anche un **bioma** per la battaglia Worms: A porto/legno, B giungla, C ghiaccio, D città/oro, E relitti/ossa, F sabbia/rovine.

## 2. Fazioni (4 ciurme)
| Ciurma | Capitano | Base | Tratto (piccolo) |
|---|---|---|---|
| Teschio Rosso | Capitana **Scarlatta Mano di Fuoco** | A1 | Esplosivi +10% danno |
| Corsari del Gelo | Capitano **Barbabrina** | C2 | In difesa ogni pirata ha +20 PV |
| Fratellanza dell'Oro | **Don Dobloncino** | D3 | +2 dobloni a turno, bottega −20% |
| Dannati della Marea | Capitana **Morgana Salsedine** | E3 | Se vince una battaglia, 1 pirata caduto risorge |

Neutrali: **Marina Reale** (giubbe rosse), presidiano B, F e i territori non assegnati. Non attaccano mai, si difendono.

**Setup**: ogni ciurma parte con la capitale (4 pirati) + 2 territori adiacenti della regione base (2 pirati ciascuno): A1+A2+A4, C1+C2+C3, D1+D2+D3, E1+E2+E3. I restanti 16 territori sono della Marina con 1–3 pirati (casuale, seme salvato).

## 3. Il turno strategico
Ordine dei turni a rotazione. Ogni turno ha 4 fasi:

### 3.1 Reclutamento (rinforzi = nuovi pirati)
**Rinforzi = max(3, ⌊territori/3⌋) + bonus regioni complete + 1 se possiedi la tua capitale + carte.**
Esempio: 11 territori, regione C intera, capitale → 3 + 2 + 1 = 6 pirati.
Si piazzano solo su territori propri. **Tetto: 5 pirati per territorio** ("una scialuppa ne porta 5"). Niente mega-pile: semplifica tutto e coincide con la squadra Worms massima.

### 3.2 Attacco (0..N attacchi)
1. Scegli territorio di partenza (≥2 pirati) e bersaglio adiacente non tuo.
2. Scegli quanti pirati imbarcare: 1..(pirati−1), **max 5**. Almeno 1 resta a casa.
3. I difensori combattono **tutti** (sono al massimo 5).
4. **Battaglia Worms** (o risoluzione automatica, §6). Si combatte fino all'eliminazione di una squadra; dopo 12 turni totali scatta il "morte improvvisa" (l'acqua sale di colpo). Se a fine morte improvvisa restano entrambi, il territorio resta al difensore.
5. **Esito**:
   - Vince l'attaccante: i sopravvissuti **occupano** il territorio (curati al 100%). Il difensore perde tutto il presidio.
   - Vince il difensore: i sopravvissuti restano lì (curati); l'attaccante perde tutti gli imbarcati.
   - **Ritirata**: dal turno 4 della battaglia l'attaccante può alzare bandiera bianca: i suoi sopravvissuti tornano al territorio di partenza, il difensore tiene il territorio.
6. I pirati non hanno identità persistente: contano solo i numeri. I PV si resettano a fine battaglia.

Ogni territorio può essere attaccato più volte nello stesso turno; ogni pirata può partecipare a una sola battaglia per turno (i vincitori che occupano non attaccano più in quel turno).

### 3.3 Fortificazione
Un solo spostamento: N pirati da un tuo territorio a un altro tuo **collegato da una catena di tuoi territori**, lasciandone almeno 1, rispettando il tetto 5.

### 3.4 Fine turno
Se hai conquistato ≥1 territorio peschi 1 **Mappa del Tesoro** (carta). Incasso dobloni. Autosalvataggio.

## 4. Economia leggera: dobloni
Serve, ma con solo 3 usi.
**Entrate a turno**: 1 doblone ogni 2 territori + 2 per ogni battaglia vinta + 2 se possiedi tutta la regione D.
**Spese** (bottega del porto):
| Acquisto | Costo | Effetto |
|---|---|---|
| Pirata mercenario | 3 | +1 pirata (max 2 per turno) |
| Arma speciale | 2–5 | Consumabile per una battaglia (le armi base sono sempre gratis e infinite; l'elenco armi è nel doc di combattimento) |
| Forte | 8 | Sul territorio: in battaglia il difensore ha un bunker in pietra e un cannone fisso; in auto-risoluzione forza difesa ×1,5 invece di ×1,2. Max 1 per territorio, distrutto se il territorio cade |

Perdere la capitale = perdi metà dei dobloni (saccheggio) a chi la conquista.

## 5. Carte ed eventi
### Mappe del Tesoro (mano max 4, usabili nel proprio turno)
1. **Ciurma di Rinforzo** — +3 pirati subito.
2. **Bordata** — prima di una battaglia, 25 danni a ogni difensore.
3. **Nebbia** — un tuo territorio non può essere attaccato fino al tuo prossimo turno.
4. **Vento in Poppa** — un attacco può partire da un territorio a 2 rotte di distanza.
5. **Ammutinamento** — contro un presidio ≥3, un difensore passa dalla tua parte.
6. **Forziere** — +6 dobloni.
7. **Polvere Nera** — un'arma speciale gratis.
8. **Ancora di Salvezza** — se perdi una battaglia in attacco, 2 pirati tornano a casa.

### Eventi del mare (inizio round, 30% di probabilità, uno alla volta)
- **Tempesta**: una rotta tra regioni chiusa per 1 round.
- **Kraken**: un territorio casuale perde 1 pirata (mai sotto 1).
- **Marea alta**: in questo round tutte le battaglie partono con l'acqua più alta.
- **Galeone del Tesoro**: segnalato su un territorio; chi lo conquista per primo prende +10 dobloni.
- **Scorbuto**: −1 rinforzo a tutti questo round.
- **Flotta Reale**: +2 pirati Marina sul territorio neutrale più debole.

## 6. Tenere corta la campagna
**Durata target**: 60–120 minuti, giocabili in sessioni da 10–20 min. Circa 15–20 battaglie giocate a mano da 3–5 minuti + strategia.

Leve:
1. **Le battaglie IA contro IA sono sempre automatiche** (animazione di 2 s sulla mappa). Il giocatore gioca solo le sue.
2. **Risoluzione automatica** a scelta per qualsiasi battaglia del giocatore (pulsante "Arrembaggio rapido"); proposta di default quando il rapporto forze è ≥2:1 o contro presidi Marina ≤2.
   - Forza attacco A = n° attaccanti; forza difesa D = difensori × 1,2 (× 1,5 con forte; tratto Gelo +0,1).
   - Probabilità vittoria attaccante **P = A² / (A² + D²)**.
   - Perdite del vincitore = arrotonda(0,6 × Dperdente² / Fvincitore), tra 0 e vincitore−1.
   - Esempi: 5 vs 2 → P≈81%, vincitore perde 1. 4 vs 4 → P≈41%, se vince resta 1.
   - Leggero malus voluto: in manuale un buon giocatore fa meglio dell'automatico.
3. **Vittoria anticipata**: vince chi controlla **18 territori su 28** oppure **tutte le capitali nemiche ancora in gioco**. Le ciurme IA eliminate non rientrano.
4. **Limite di 25 round**: se raggiunto vince chi ha più punti (1 per territorio, +3 per capitale, +2 per regione completa).
5. Timer turno in battaglia 30 s, morte improvvisa dopo 12 turni.

## 7. Salvataggio
- Autosalvataggio a fine di ogni fase strategica e dopo ogni battaglia (stato mappa, dobloni, carte, round, seme casuale).
- Se l'app si chiude **durante** una battaglia, al rientro la battaglia riparte da capo con le stesse forze (niente salvataggio del terreno a metà: più semplice e robusto).
- 3 slot di campagna.

## 8. Modalità
- **Campagna single player** (v1): 1 umano + 3 ciurme IA. Difficoltà Mozzo / Nostromo / Capitano (IA più aggressiva, +1 rinforzo per l'IA a Capitano, mira migliore in battaglia). Ogni capitano IA ha una personalità: Scarlatta attacca sempre, Barbabrina fortifica, Dobloncino compra, Morgana punta le capitali.
- **Pass and play** (futuro): 2–4 umani sullo stesso telefono; schermata "Passa il telefono a…" tra i turni; battaglie umano contro umano a turni alternati con lo stesso dispositivo; contro IA come sopra.
- Online: fuori perimetro.

## 9. Numeri di controllo
- Pirati totali a inizio partita: 4 ciurme × 8 + ~32 Marina ≈ 64.
- Rinforzi tipici: 4 a inizio, 6–9 a metà partita.
- Battaglie per giocatore umano: ~1–2 per turno × ~12 turni utili = 15–25 (di cui un terzo auto-risolvibili).
