# 06 — Livelli e generazione mappe (Level Designer)

Valori iniziali da tarare col simulatore (`sim battaglie`). Non esiste ancora 05-revisione: dove 01 e 04 non concordano, qui scelgo e lo segnalo.

## 0. Scelte di base
- **Dimensioni: 2048×1024 px logici** (04), cioè 8×4 tile da 256. Il 2400×1100 di 01 decade. Le distanze di 01 (spawn, cadute, raggi) restano in pixel come sono, perché il pirata ha la stessa misura.
- **Fasce verticali** (y cresce verso il basso):
  - 0–160: cielo libero, senza terreno (serve a casse, Ancora e Bordata). Nella Grotta questa fascia è soffitto.
  - 160–944: terreno.
  - **944: mare iniziale.** Con l'evento "Marea alta" parte da 896.
  - 984–1024: fondale in ferro indistruttibile.
- **Bordi laterali:** 0–64 e 1984–2048 sempre acqua aperta oppure parete di ferro, secondo il bioma. Non c'è mai terra che esce dallo schermo.
- **Materiali nella maschera** (estende 04, che prevede solo 0/1/2): 0 aria · 1 sabbia · 2 legno · 3 roccia · 4 ghiaccio · 5 ferro. I moltiplicatori del cratere sono quelli di 01. Il ferro non supera il **3% del solido**.
- **Riempimento:** il solido occupa il 35–50% dell'area tra y 160 e 944. Sotto il 35% troppa gente annega, sopra il 50% è tutto trincee.

## 1. Pipeline di generazione (uguale per tutti i biomi)
1. **Sagoma:** se ne estrae una tra le 12 del bioma. È una maschera a bassa risoluzione 256×128 disegnata a mano e ingrandita ×8. Con il seme si decide anche lo **specchio orizzontale (50%)**, così l'attaccante non parte sempre da sinistra.
2. **Rumore:** sul profilo superiore si applica un rumore 1D con ampiezza e frequenza del bioma, tenuto entro ±48 px dalla sagoma.
3. **Grotte e buchi:** metaball, in numero fissato dal bioma.
4. **Strati di materiale:** si calcolano dalla profondità sotto la superficie (tabella §2).
5. **Ostacoli e punti di interesse:** si piazzano props e strutture (§2).
6. **Spawn:** 4 posti per lato + 1 punto di sbarco riserve (§4).
7. **Validazione anti-frustrazione** (§6). Se fallisce si riprova con seme+1, fino a 8 tentativi. Dopo l'ottavo si usa la **sagoma di riserva** del bioma, già validata a mano. Quel seme va nel log.

Il seme è `hash(seme campagna, territorio, round)`. Rigiocare la stessa battaglia (02 §7) ridà la stessa mappa.

## 2. I sei biomi (da 01 §7)

| Bioma | Sagome tipiche | Strati (dall'alto) | Vento | Ostacoli | Punti di interesse | Rischi di mare |
|---|---|---|---|---|---|---|
| **Isola tropicale** | 1–2 colline larghe, ampie spiagge, lago interno | 24 px sabbia, poi roccia sotto 160 px | ±6 | palme (solo grafica), 1–2 massi di roccia | 1 laguna interna poco profonda (acqua che non uccide), 1 rovina in roccia | rive dolci, pendenza max 30°: si scivola poco |
| **Cimitero di navi** | 3–5 scafi separati, ponti sospesi | legno; chiglia in ferro solo sul fondo degli scafi | ±8 | alberi maestri (legno 16 px), gabbie | 1 scafo centrale più alto ("torre"), forzieri decorativi | **alto:** varchi di 80–200 px tra gli scafi, mare sotto ogni varco |
| **Scogliera vulcanica** | pareti verticali, terrazze sfalsate | roccia; ferro (basalto) su 2–3 creste | ±10 | pinnacoli, archi naturali | 1 terrazza alta "nido d'aquila", grotte laterali | bassi: le pareti trattengono, ma chi cade dalle terrazze prende danno da caduta |
| **Porto della Tortuga** | molo + paese su collina | legno (case, pontili) sopra roccia | ±5 | case con tetti (legno, 40 px di spessore), 3–5 **barili di polvere** già piazzati | taverna (struttura più grande), gru | pontili sull'acqua: legno sottile 20 px, si rompe e si cade |
| **Ghiacci del Nord** | lastroni piatti, crepacci | 32 px ghiaccio sopra roccia | ±7 | stalagmiti di ghiaccio, nave incagliata | 1 crepaccio profondo con riparo | **alto:** attrito 0,2, le spinte valgono il doppio. Bordo ghiacciato di ogni scogliera con gradino anti-scivolo (vedi §6) |
| **Grotta dei contrabbandieri** | caverna chiusa, gallerie, laghetto | roccia; sabbia in tasche; soffitto 0–160 roccia + 48 px ferro | 0 | colonne, travi in legno | deposito di casse (le casse "cadono" da 3 botole fisse) | mare solo sul fondo; il soffitto basso impedisce i salti alti |

Le **varianti** sono un tema grafico (tavolozza, props, sfondo) più al massimo una piccola regola. Non sono biomi nuovi.
- **Città d'oro** (variante del Porto): tetti dorati, un mercato coperto, 2 casseforti in ferro (coperture indistruttibili, rientrano nel 3%), barili 2–3.
- **Deserto di rovine** (variante dell'Isola): sabbia fino a 96 px di profondità (crateri grandi), colonne di roccia, vento ±8.
- **Giungla** (variante dell'Isola): alberi giganti con piattaforme di legno, liane solo come grafica, rumore più alto (±48).
- **Ossa** (variante del Cimitero): costole di balena in roccia usate come ponti, nebbia sullo sfondo.

**Il tipo `bioma` di 04 va sostituito** con: `isola | cimitero | scogliera | porto | ghiacci | grotta`, più `variante?: 'oro'|'rovine'|'giungla'|'ossa'|'tempesta'`.

## 3. Dal territorio al bioma (i 28 di 02)

| Terr. | Bioma · variante | | Terr. | Bioma · variante |
|---|---|---|---|---|
| A1 Porto Teschio ★ | **firma** (Porto) | | D1 Isola del Tesoro | Isola |
| A2 Baia dei Corvi | Porto | | D2 Zecca Clandestina | Grotta · oro |
| A3 Scogli del Rum | Scogliera | | D3 Mercato dei Ladri ★ | Porto · oro (seme fisso) |
| A4 Forte Uncino | Porto (Forte gratuito decorativo: solo grafica) | | D4 Molo dei Dobloni | Porto · oro |
| A5 Laguna Nera | Grotta | | D5 Torre del Governatore | Scogliera · oro |
| B1 Cala Pappagallo | Isola | | E1 Relitto Fantasma | Cimitero · ossa |
| B2 Giungla dei Tamburi | Isola · giungla | | E2 Gorgo del Diavolo | Cimitero (mare +32 px) |
| B3 Vulcano Brontolone | Scogliera | | E3 Cimitero di Galeoni ★ | **firma** (Cimitero) |
| B4 Spiaggia del Naufrago | Isola | | E4 Isola Sirena | Isola |
| C1 Punta Ghiacciolo | Ghiacci | | E5 Scoglio della Forca | Scogliera · ossa |
| C2 Fiordo del Kraken ★ | **firma** (Ghiacci) | | F1 Duna del Cannone | Isola · rovine |
| C3 Faro Spento | Scogliera (variante grafica ghiaccio) | | F2 Oasi dei Contrabbandieri | Grotta · rovine |
| C4 Banchisa dei Lupi | Ghiacci | | F3 Tempio Sommerso | Grotta · rovine |
| | | | F4 Rocca Scorpione | Scogliera · rovine |
| | | | F5 Capo Tempesta | Isola · tempesta (vento ±10) |

Ogni bioma compare almeno 3 volte. La Grotta, senza vento e con armi diverse, è il 18% delle mappe: abbastanza da variare, non tanto da stancare.

## 4. Spawn equi
- **Zone:** l'attaccante sbarca nel 12–40% della larghezza dal proprio lato, il difensore nel 60–88%. Il lato si decide con lo specchio del §1.
- **Requisiti di un posto di spawn:**
  - piano largo ≥ 32 px con pendenza ≤ 15°;
  - non ghiaccio e non legno sottile;
  - almeno 48 px di solido sotto i piedi;
  - almeno 40 px di aria sopra la testa;
  - almeno 150 px dai nemici (01);
  - almeno 60 px dai compagni, così una granata (raggio 50) non ne prende due;
  - almeno 80 px sopra il mare.
- **Equità tra i due lati.** Tutte queste condizioni devono valere insieme:
  - quota media degli spawn che differisce di ≤ 64 px;
  - distanza media dal mare che differisce di ≤ 40 px;
  - massa di terreno della propria metà che differisce di ≤ 15%;
  - numero di nemici in linea di tiro diretta che differisce di ≤ 1 per pirata.
- **Riserve:** atterrano sul punto di sbarco del proprio bordo oppure nel posto sicuro di 01 §4. Il punto di sbarco si ricontrolla prima di ogni atterraggio, perché nel frattempo il terreno sarà stato scavato.
- **Con 5 pirati** (tetto di 02): 4 in campo e 1 riserva (01). Non servono più di 4 posti per lato.

## 5. Effetto del Forte (02 §4)
Se il territorio difeso ha un Forte, il generatore lo piazza **dopo la sagoma e prima degli spawn**:
- **Collina del forte:** il terreno della metà del difensore si alza di 64 px, in un'area larga 400 px.
- **Bunker:**
  - 192×128 px in roccia, con muri da 32 px e tetto da 40 px;
  - pavimento in ferro da 16 px, così non si scava sotto per affondarlo;
  - 2 feritoie alte 24 px rivolte verso l'attaccante;
  - **2 dei 4 spawn del difensore sono dentro il bunker.**
- **Cannone fisso** sul tetto: un prop in legno+ferro con 80 PV di struttura. Proposta per 01 e 09: un pirata del difensore che sta entro 40 px dal cannone può usarlo come arma gratuita (danno 50, raggio 60, angolo bloccato tra 0° e 60° verso l'attaccante). Una volta distrutto non torna.
- **Palizzata:** 2 pali di legno 24×96 px davanti al bunker.
- Per l'equità tra i lati il vantaggio del forte è voluto: quei controlli valgono solo sul lato dell'attaccante. Le regole anti-frustrazione (§6) invece valgono per entrambi.
- Il forte di A4 Forte Uncino è solo una scenografia sullo sfondo. Il Forte comprato vale per una sola mappa e sparisce con la conquista. La battaglia successiva su quel territorio mostra le rovine come decorazione.

## 5-bis. Cala Pappagallo (mappa a mano del Prologo, 00 §9.18)
Isola di partenza del tutorial e della Carriera, dipinta a mano: due piane, Rocca centrale (cima a y 292) con arco percorribile, relitto, rovina, 2 grotte, 3 barili, 5 spawn per lato. Forma in `scripts/mappe/cala-pappagallo-forma.ts`. Nel Prologo (2 contro 2) servono anche i punti di 10 §2: cassa a 150 px dal primo pirata, gradino di 20 px, un marinaio sul bordo di una scogliera sul mare, una buca per l'ultimo marinaio.

## 6. Tre mappe firma (fatte a mano)
**Formato:** PNG 2048×1024 indicizzato (un colore per materiale) + JSON con spawn, props, punto di sbarco e mare. Passano lo stesso validatore del §1. Se c'è un Forte, va in un punto prestabilito della mappa.

1. **A1 Porto Teschio — "La Bocca del Teschio"** (capitale di Scarlatta).
   - Al centro uno scoglio a forma di teschio largo 520 px, in roccia. Gli occhi sono due grotte collegate, la bocca è un tunnel sul livello del mare.
   - L'attaccante sbarca da pontili di legno a sinistra. Il difensore sta nel paese a destra, con tetti e 5 barili di polvere: è il suo tratto esplosivi.
   - Il teschio domina la mappa: chi lo prende spara su tutto, ma è esposto da due lati.
2. **C2 Fiordo del Kraken — "La Gola Bianca"** (Barbabrina).
   - Due falesie di ghiaccio e roccia, separate da un canale di mare largo 320 px.
   - Il canale è attraversato da 2 ponti di ghiaccio spessi 24 px, uno alto e uno basso.
   - Dal turno 6 il Kraken (scripted) dà una tentacolata a un ponte ogni 4 turni e cancella 64 px. Il preavviso è un'ombra nell'acqua un turno prima.
   - Il rampino diventa l'arma chiave. Gli spawn sono lontani ≥ 200 px dal bordo del canale.
3. **E3 Cimitero di Galeoni — "La Torre dei Relitti"** (Morgana, la più difficile).
   - Tre galeoni impilati in verticale al centro, alti fino a y 220, uniti da passerelle.
   - Ai lati due relitti bassi, dove compaiono gli spawn.
   - Il mare parte a y 912. Nebbia grafica sullo sfondo e lanterne verdi.
   - Per il tratto di Morgana (risorge un caduto) le riserve del difensore sbarcano in cima alla torre, e solo se c'è un posto valido.

D3 Mercato dei Ladri usa un seme fisso: la mappa è sempre la stessa ma è generata, non disegnata. Diventerà una quarta mappa firma se c'è tempo (domanda 2).

## 7. Regole anti-frustrazione
1. **Niente spawn su sporgenze.** Su entrambi i lati dello spawn, entro 170 px, c'è solido continuo oppure una parete alta ≥ 40 px. 170 px è la gittata di un pirata spinto da un colpo diretto di cannone (315 px/s a 45°, gravità 600).
2. **Test del primo turno:**
   - per ogni spawn si simulano un colpo diretto di cannone e un colpo di sciabola (450 px/s) da entrambe le direzioni;
   - se una traiettoria finisce in mare, lo spawn è scartato;
   - se lo scarto riguarda la sciabola, basta che nessuno spawn nemico sia raggiungibile camminando in un turno (1200 px di percorso).
3. **Gradino anti-scivolo:** ogni scogliera che dà sul mare ha un orlo rialzato di 10 px. Nel Ghiaccio l'orlo è di roccia, non di ghiaccio.
4. **Nessun annegamento gratis nel round 1:** casse dal turno 3 (01), mare fermo fino alla morte improvvisa, barili del Porto ad almeno 200 px da ogni spawn.
5. **Niente stalli irraggiungibili:**
   - ogni spawn deve poter colpire almeno un nemico con cannone o granata, verificato con il campionatore dell'IA;
   - ogni coppia di spawn nemici è collegata camminando, saltando o con il rampino;
   - le aree chiuse da ferro sono vietate.
6. **Marea alta (evento di 02):** la validazione si rifà con il mare a 896. Le sagome che non passano sono escluse quel round.
7. **Lettura:** nessun props davanti agli spawn che copra più del 30% del pirata. I pontili sottili sono segnalati con corde visibili.
8. **Telemetria:** se una mappa supera il 50% di morti in acqua nei primi 4 turni (simulatore, 200 battaglie per sagoma), la sagoma va ridisegnata. L'obiettivo complessivo resta il 30–40% di annegamenti a battaglia (01 §10).

## Domande per il proprietario
1. Le 3 mappe firma vanno bene su A1, C2 ed E3, con D3 a seme fisso? Oppure preferisci che la firma sia sempre la capitale dell'**ultimo boss** rimasto?
2. Vuoi il **cannone fisso** del Forte utilizzabile dal difensore (più divertente) o solo come struttura che spara da sola un colpo a round (più semplice)?
3. Il tratto di Scarlatta (esplosivi) deve vedersi anche nel livello, con più barili sulle sue mappe? Oppure i biomi restano neutrali rispetto alle fazioni?
