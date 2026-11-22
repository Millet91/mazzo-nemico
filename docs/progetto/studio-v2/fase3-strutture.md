# Fase 3 · Strutture di Cala Pappagallo v3 (proposta di Mappa e livelli)

*Agente Mappa e livelli (Opus), 22/11/2026. Proposta per il Lead P1, prima di dipingere i pezzi. Vale insieme a
`PIANO.md` §3 Fase 3 e a `livelli.md` decisioni 4, 5 e 10. Il codice della sim (sostegno, crolli, masso che rotola) è
di Fisica: qui ci sono solo i dati della mappa e le regole che servono perché la Cala regga.*

Figura: `fase3-strutture.png` (grigio = ancoraggi A1-A7, rosso = elementi che crollano, arancio = dove cadono i pezzi).

## 1. Il problema: la parte alta della Cala non tocca il fondale

Con 4 vicini, togliendo il legno, la Cala v3 ha **tre masse che non toccano il fondale** (misura sulla maschera di
`cala-pappagallo-v3`, uguale nel Prologo):

| Massa | Pixel | x | y | Perché è staccata |
|---|---|---|---|---|
| Blocco della Mesa sinistra (Terrazza media, rampa, Mesa) | 47 769 | 433-822 | 582-833 | la galleria bassa sinistra la taglia da x 404 a 846 |
| Rocca (con balconi, Nido, cengia ovest) | 71 021 | 892-1156 | 273-757 | l'arco la taglia da x 882 a 1166: la Rocca non ha piedi |
| Blocco della Mesa destra (con la Grotta della Liana) | 44 563 | 1224-1615 | 580-835 | la galleria bassa destra, da x 1202 a 1644 |

Con il legno le tre masse sono un pezzo solo, tenuto insieme dai due ponti di corda. Se il sostegno guarda solo il
fondale, al primo calcolo cadrebbe mezza isola. La regola del tempo 1 ("legno e roccia **sotto 24 px**") non le tocca
perché sono spesse, ma il tempo 2 ("le masse isolate cadono intere") sì.

## 2. Proposta: ancoraggi come dato della mappa, non nella maschera

**Consiglio: una lista di rettangoli `sostegni` nei dati della mappa** (`DatiMappaFatta` e `MappaGenerata`, campo
facoltativo; il contratto lo decide il Lead). Un pezzo staccato è "appoggiato" se tocca il fondale **oppure** se ha
almeno un pixel pieno dentro un rettangolo di `sostegni`. Se le esplosioni svuotano tutto un rettangolo, quell'ancoraggio
non regge più (è giusto: hai scavato il pilastro).

Perché non i byte nella maschera:
- **ferro**: non si scava. Un nucleo di ferro nella Rocca o sopra le gallerie diventerebbe un chiodo indistruttibile che
  spunta dai crateri, e cambierebbe le traiettorie e i replay d'oro;
- **materiale nuovo "ancora"**: tocca `core/tipi.ts`, la collisione, il render (shader e pittore), l'audio dei
  materiali e tutte le mappe. Troppo per un'informazione che serve solo al calcolo del sostegno.

Ancoraggi della Cala v3 (rettangoli compresi gli estremi; tutti pieni al 97-100% e dentro la massa giusta, verificato):

| | Massa | x | y | Cosa rappresenta |
|---|---|---|---|---|
| A1 | Mesa sinistra | 436-456 | 790-806 | piede della parete, sopra la bocca della galleria |
| A2 | Mesa sinistra | 778-798 | 796-812 | piede del dirupo, sopra lo sbocco nella Valle |
| A3 | Mesa destra | 1250-1270 | 792-808 | piede del dirupo |
| A4 | Mesa destra | 1590-1608 | 786-802 | piede della parete |
| A5 | Rocca | 1000-1048 | 560-640 | nucleo di roccia viva (non si svuota con un colpo) |
| A6 | Rocca | 940-960 | 680-700 | spalla ovest dell'arco |
| A7 | Rocca | 1090-1110 | 680-700 | spalla est dell'arco |

Due ancoraggi per Mesa, tre per la Rocca: per far cadere un blocco intero bisogna svuotarli tutti, cioè molti colpi
mirati. Non succede per caso.

**Rete di sicurezza (da decidere col Game design):** al tempo 2 cadono intere solo le masse **fino a 6 000 px**
(una torre come la poppa del relitto sopra un taglio). Sopra questa soglia, una massa staccata e senza ancoraggi si
sbriciola solo nei pezzi sottili (tempo 1). Così una mappa generata o fatta male non perde mai mezza isola in un colpo.

**Prova da aggiungere per ogni mappa** (generate comprese): al tick 0 nessun pezzo è staccato, cioè il sostegno non fa
cadere niente prima del primo colpo. Le isole generate non hanno `sostegni`: per loro conta solo il fondale, e la prova
dice se il generatore scava gallerie passanti.

## 3. I tre elementi per lato

Regole comuni (PIANO §3 Fase 3): niente crollo al turno 1; macerie 8 PV a pirata, massimo 20 a turno (`BIL.macerie`);
mai morte sicura da piena salute (PV 70); per ogni elemento una prova che lo attiva con un colpo e misura il danno
massimo. Le distanze sono dai piedi della partenza più vicina.

### 3.1 Torre: a sinistra la poppa del relitto, a destra la Vedetta della Duna

**Torre del relitto (sinistra).** Poppa di legno x 106-172, cima a y 730, con la tettoia (già nella maschera).
Oggi poggia sulla sabbia fino a y 968, quindi è appoggiata. Larga 66 px: non è "sotto 24", ma un colpo di cannone
(raggio 70) la taglia da parte a parte. Quello che resta sopra il taglio è una massa staccata sotto i 6 000 px e cade
intera (tempo 2).
- **Pezzi (6):** tettoia (tetto e muro), cassero alto (y 730-770), finestre alte (770-800), finestre basse (800-830),
  base della poppa (830-866), fasciame con l'oblò.
- **Dove cade:** dritta in giù e si spezza all'urto, sulla spiaggia (x 64-250, y 840-975) o in mare. La scala della torre
  (x 182) si taglia con la torre (`tagliaAppigli` c'è già).
- **Danno massimo:** 20 (macerie col tetto massimo del turno) a chi sta sulla scala o sulla coperta.
- **Partenza più vicina:** (373, 844), a 201 px dalla torre e a 123 px dalla zona di caduta.
- Nel **Prologo** al suo posto c'è la torre di guardia del molo (x 72-108): stessi pezzi, cade in mare.

**Vedetta della Duna (destra).** Oggi è solo una tettoia di legno (muro di 6 px e tetto da x 1917), 408 px: è sottile,
quindi crolla già col tempo 1 se si colpisce il muro. Proposta per farla diventare una torre vera **senza alzarla**:
due pali di 6 px (x 1920 e 1940), il piano di vedetta alla quota del tetto di oggi (y 687-693, da x 1917 a 1946, così lo
scavalco del muretto resta com'è) e un tetto a punta sopra (fino a y 650).
- **Pezzi (5):** palo ovest, palo est, piano, tetto, ringhiera.
- **Dove cade:** sul pianoro della Duna o giù dalla scogliera in mare (x 1860-1984).
- **Danno massimo:** 16 (due pezzi di macerie) a chi è sotto, sul pianoro.
- **Partenza più vicina:** (1695, 843), a 222 px.

### 3.2 Ponte di corda con 2 ancoraggi (uno per lato)

Ponti di legno: sinistro x 800-911 (1 544 px), destro x 1137-1248 (1 547 px). Ogni ponte ha **due ancoraggi**, uno per
capo: sul bordo della Mesa (x 794-800, y 606-622; a destra x 1248-1254) e sul balcone della Rocca (x 906-912 e
1136-1142, y 544-558). Sono i due punti dove le assi toccano la roccia.
- **Comportamento:** tagli un capo e il ponte non cade: **si apre e resta appeso all'altro capo**, giù lungo il dirupo o
  il fianco della Rocca. Chi c'era sopra cade nella Valle (danno da caduta normale, più 8 di macerie). Tagli tutti e
  due i capi e cade intero nella Valle.
- **Pezzi (8):** assi a gruppi di circa 14 px, legate tra loro. Appese formano una catena.
- **Facoltativo, Fase 4, per Fisica:** il ponte appeso diventa una scala di corda (un appiglio nuovo dal capo rimasto
  fin quasi al fondo della Valle: circa 118 px).
- **Dove cade:** nella Valle (x 803-912, fino a y 832; a destra x 1136-1246).
- **Danno massimo:** 8 di macerie, più la caduta di chi era sopra.
- **Partenza più vicina:** (777, 606) e (1271, 605). **Qui la regola dei 120 px non torna:** il capo del ponte è a
  23 px dalla partenza. Le assi però cadono o pendono **sotto** la Mesa, nella Valle, e non passano mai sopra la
  partenza. **Proposta:** per i ponti la distanza si misura dalla zona dove cadono i pezzi, non dall'ancoraggio
  (la partenza resta fuori dalla zona di caduta di almeno 26 px in x e 200 px in y). In alternativa bisogna togliere
  una partenza dalla Mesa (5 → 4 per lato su questo livello), e non lo consiglio.

### 3.3 Masso in bilico sulle cengie della Rocca

`livelli.md` lo metteva su una cengia della Mesa, ma lì rotolerebbe giù per la rampa sulle partenze della Terrazza
media (545 e 469) o cadrebbe accanto alla partenza 777. Lo propongo **sulle due cengie basse della Rocca**, sopra le
Valli, dove nessuno parte:
- **Sinistra:** cengia allungata verso la Valle a x 882-908, y 706 (oggi 892-908, spessa 10 px: è "sotto 24", quindi
  cede al tempo 1). Masso di roccia, raggio 11, centro (892, 694), staccato di almeno 4 px dal fianco della Rocca
  (se lo toccasse sarebbe parte della Rocca e non cadrebbe).
- **Destra:** cengia x 1134-1162, y 664 (spessa 9 px). Masso raggio 11, centro (1148, 652).
- **Comportamento:** colpisci la cengia (o il masso da sotto), la cengia cade a pezzi e il masso cade sul fianco della
  Rocca, rotola nella Valle e, se ha abbastanza slancio, entra nella galleria e si ferma nella sala (x ~630 a sinistra,
  ~1372 a destra). Non esce mai dalla parte delle Terrazze: la galleria risale verso le bocche.
- **Pezzi (4 per lato):** masso, cengia in 2 pezzi, polvere.
- **Danno massimo:** 20 e spinta (numero di `livelli.md`, da provare col simulatore). È il trucco del "dove e quando
  mirare": far cadere il masso quando un nemico passa per la Valle o per la galleria.
- **Partenza più vicina:** sinistra (777, 606) a 145 px, destra (1271, 605) a 132 px.
- Serve il corpo rigido che rotola (Fisica, tempo 2). Senza, il masso cade dritto e si ferma dove tocca.

## 4. Cosa cambia nella mappa, e quando

Se il Lead approva:
1. `scripts/mappe/cala-v3-forma.ts`: `SOSTEGNI` (A1-A7), cengie allungate e i due massi, Vedetta su pali; etichette nuove
   nella PNG dei materiali per i pezzi (un'etichetta per pezzo, così il pittore li dipinge separati e la sim li stacca).
   Partenze, barili e appigli restano dove sono; i dati e la prova "i dati sono la forma" si rigenerano.
2. Arte: i pezzi dipinti a parte (4-8 per struttura) nel formato HD delle tessere, più sprite di polvere e schegge.
3. Prove in `tests/mappe/`: nessun pezzo staccato al tick 0; partenze fuori dalle zone di caduta; ogni ancoraggio dentro
   la sua massa. Le prove "un colpo, danno massimo" sono di Fisica, con i colpi che indico per ogni elemento.

**Da decidere dal Lead:** (a) `sostegni` come dato (consigliato) o byte nella maschera; (b) soglia di 6 000 px per il
tempo 2; (c) per i ponti, distanza misurata dalla zona di caduta; (d) masso sulle cengie della Rocca invece che sulla
Mesa; (e) Vedetta su pali alla quota di oggi.
