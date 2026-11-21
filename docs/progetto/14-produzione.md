# 14 · Produzione: da M0 alla 1.0 sul Play Store (Producer)

Si basa su 01-13; dove non sono d'accordo vale 05. Le correzioni di 05 che toccano i criteri di 13 sono queste: **niente riserve** (spariscono "sbarco delle riserve" e "+ riserve"), **timer 20 s**, **vittoria a 16 territori**, **10 armi in M2**. Se 09 dice cose diverse da 05, vale 05; la Bomba a mitraglia di 09 resta una domanda aperta.

**Sessione di lavoro** = contratto congelato dal Lead, agenti in parallelo, unione con test verdi, APK provato sul telefono. Totale previsto: **24-31 sessioni**, più i **14 giorni di calendario** del test chiuso, in parte sovrapposti a M6.

## Regole di squadra (valgono per tutte le milestone)

- **Proprietà per cartelle.** Ogni agente lavora solo nelle sue cartelle (04 §4). Il **Lead** è l'unico che tocca `src/core/` (tipi e bus), `contenuti/armi.ts`, `contenuti/bilanciamento.ts` e `package.json`, e lo fa all'inizio della milestone.
- **Rami** `claude/<milestone>-<area>`, per esempio `claude/m1-sim`. Il Lead unisce tutto in `claude/<milestone>-integrazione` e poi in `main`.
- **Un solo APK di prova.** Oggi ogni push su `claude/**` sovrascrive `apk-prova`: con 4 rami paralleli si pestano. Da M0 **solo `main` e i rami `*-integrazione` aggiornano la pre-release**; gli altri caricano solo l'artifact.
- **Una milestone è chiusa** quando valgono sia il "Fatto" di 04 §10 sia i criteri di 13 §4, e il proprietario ha superato la checklist di 13 §5.

---

## M0 · Pulizia della repo (1-2 sessioni)

**Stato attuale.** `main` contiene solo il commit iniziale. Il vecchio gioco Baro sta sui rami `claude/project-thread-3o2b2q` e `-ulg1yx` (PR #1 e #2). Esiste anche il tag `apk-prova`.

**Lavoro.** 1 agente, in sequenza, perché tocca tutto.
1. Dai vecchi rami si recuperano **solo** queste cose:
   - `.github/workflows/apk.yml`, rinominando l'APK e i testi;
   - `android/`, rigenerando il package Java col nuovo `appId`;
   - `capacitor.config.ts`, con l'orientamento orizzontale bloccato;
   - gli script npm;
   - il **modello del registro asset** (`VisualAsset`, `glyph`→`image`, componente `Art`, `assets:check`), svuotato ed esteso con i campi di 03 §8.1.
2. Si crea lo scheletro delle cartelle (04 §4) e si aggiungono PixiJS 8, Preferences e Playwright.
3. Si chiudono le PR #1 e #2 senza unirle e si **cancellano i due rami**. Il vecchio codice resta solo nella cartella `design/vecchio/`.

**Da provare sul telefono.** L'app nuova si installa **accanto** a Baro, con nome e icona provvisori, e mostra un canvas Pixi a 60 fps. Impostazioni → Info mostra commit e build. Il contatore FPS funziona. Si controlla anche WebGL2 (rischio indicato in 05 §2.7).

**Fatto quando.** `npm test` è verde, L1 e L4 girano in CI, la rotazione di 180° non rompe niente.

**Decisioni del proprietario, prima di M0.**
- Nome del gioco e `appId`. Proposta: "Kaboom Ahoy!", da verificare sul Play Store perché l'`appId` non si cambia più.
- Tipo di account Play Console. Va **aperto subito**, perché la verifica dell'identità richiede tempo.
- Modelli dei telefoni di prova.

---

## M1 · Schermaglia 3v3 contro IA, con segnaposto (5-6 sessioni) ★ primo traguardo

Fonde M1 e il primo pezzo di M2 di 04, come chiede 05 (decisione 23 e domanda 5).

**Da provare sul telefono.** Menu → Schermaglia → battaglia **3 contro 3 contro l'IA Mozzo**.
- Terreno distruttibile generato da seme, in un solo bioma: isola tropicale.
- Pirati segnaposto (11 §5), mira a fionda, timer di 20 s, vento, mare che uccide.
- 4 armi: cannone, granata, sciabola, pistola.
- Lapide-barilotto, morte improvvisa dal turno 12, schermata di esito.

| Agente | Cartelle | Ramo |
|---|---|---|
| A Fisica | `battaglia/sim`, `tests/replay` | `claude/m1-sim` |
| B Rendering e input | `battaglia/render` | `claude/m1-render` |
| C Generatore | `battaglia/gen` (pipeline di 06 §1, spawn equi di 06 §4) | `claude/m1-gen` |
| D HUD | `ui/` (HUD di 03, griglia 4×4 con 4 celle attive, pausa) | `claude/m1-hud` |
| E IA | `battaglia/ia`, in un Web Worker (05 n. 19) | `claude/m1-ia` |
| F Arte (in parallelo) | `arte/`, `tools/arte/` (script S1-S3, S7 di 11) | `claude/m1-arte` |

**Dipendenze.** Il Lead congela `StatoBattaglia`, `Comando` ed `EventoBattaglia` nella prima sessione. E parte quando A ha la traiettoria pura. B usa la maschera finta di C finché non arriva quella vera.

**Fatto quando.**
- 10 replay d'oro verdi su Node **e** sul telefono.
- Fuzz da 2.000 battaglie pulito.
- Casi 1-3, 6-8, 10, 18 e 22-24 di 13 superati.
- 60 fps medi e 45 minimi sul telefono medio, 30 su quello economico.
- Si gioca una battaglia contro l'IA dall'inizio alla fine senza intoppi.

**Magnific.** Si producono l'**immagine di stile** (4 pirati e 1 terreno) e la **prova di pipeline su `pirata_cammina`** (05 §2.7). Il lotto grafico non parte ancora.

**Decisioni del proprietario.**
- Scegliere l'immagine di stile.
- Fissare il budget di crediti per lotto (11 e 08).
- Dire se i comandi a due pollici sono comodi.

---

## M2 · Arsenale e IA completa (3-4 sessioni)

**Da provare sul telefono.** Schermaglia da 1 a 5 per lato con le **10 armi** di 05 (1-6, 9, 11, 13 e 15, cioè la Bussola Stregata) e casse. L'IA ha tre livelli: Mozzo, Nostromo e Capitano.

**Agenti.** A armi balistiche e B armi speciali in `battaglia/sim/armi/`, un file per comportamento (`claude/m2-balistiche`, `-speciali`); C IA in `battaglia/ia`; D interfaccia in `ui/`, con griglia armi, casse e ×2/×4 sui turni IA; E simulatore L3 in `sim/`.

**Fatto quando.**
- Ogni arma ha un test e un replay.
- Casi 4, 5 e 11-13 superati.
- Il simulatore è verde: 10-16 turni a battaglia, Nostromo batte Mozzo almeno nel 70% dei casi.
- Il turno dell'IA dura al massimo 2 s e non scende mai sotto i 45 fps.

**Magnific.** Parte il **lotto grafico 1** (32 asset di 03 §8.4, con `icone_armi` a 16 celle), che va avanti anche durante M3. Ogni asset entra nel registro appena supera 11 §7. Il lotto 1 musica e audio (circa 120 file, 08) parte dal tema `mus_menu`.

---

## M3 · Mappa del mondo (3-4 sessioni)

**Da provare sul telefono.** Campagna completa sui 28 territori. Le battaglie si risolvono **in automatico**. Ci sono reclutamento, attacco unito fino a 5, fortificazione, dobloni, Pergamene, eventi e la Rotta breve. Il salvataggio ha 3 slot.

**Agenti.** A regole e IA strategica in `mondo/`, `contenuti/territori.ts` e `ciurme.ts`; B mappa SVG e schermate di rinforzi, bottega e Pergamene in `ui/mondo`; C salvataggio in `piattaforma/`; D testi di 07 in `contenuti/stringhe/`. Rami `claude/m3-<area>`.

**Fatto quando.**
- Le regole di 02 e 05 hanno test con gli esempi dei documenti.
- 100 campagne simulate terminano tutte, con vittoria a 16 territori.
- Il salvataggio sopravvive alla chiusura forzata (caso 15).
- I 3 slot sono indipendenti.

**Decisioni del proprietario.** Durata della campagna, difese giocate in automatico per default, Palla incatenata o Bomba a mitraglia (09).

---

## M4 · Collegamento mondo-battaglia (2-3 sessioni)

**Da provare sul telefono.** Conquistare un territorio giocando la battaglia vera, con N pirati spostati e N pirati in campo. Il bioma del territorio decide la mappa. Si chiude l'app a metà battaglia, la si riapre e si riprende dal replay.

**Agenti.** A adattatore mondo-battaglia (`claude/m4-ponte`); B `battaglia/gen` per i 6 biomi e le 3 mappe firma di 06 (`claude/m4-biomi`); C ripresa da replay (`claude/m4-ripresa`).

**Fatto quando.**
- Casi 14, 16, 17 e 26 superati.
- Il numero di pirati si conserva in 500 campagne simulate.

**Magnific.** Lotto grafico 2 (03 §8.5) e animazioni mancanti (11 §8). La grafica di biomi e prop si produce **un bioma per sessione**.

---

## M5 · Interfaccia definitiva, asset, audio e tutorial (4-6 sessioni)

**Da provare sul telefono.** Il gioco completo e rifinito: Prologo "Cala Pappagallo" (10), turno di campagna protetto, menu col video, audio e vibrazione.

**Agenti.** A interfaccia in `ui/`; B atlanti e ricolorazione in `public/assets` (script S4-S6 di 11); C audio in `piattaforma/audio`; D tutorial in `ui/tutorial`; E inglese in `contenuti/stringhe/en`. Rami `claude/m5-<area>`.

**Fatto quando.**
- L4 verde su tutte le schermate e in tutti i formati.
- Nessun glifo segnaposto; `assets:check` pulito.
- Il proprietario completa il tutorial da solo in meno di 5 minuti.
- Caso 25 superato.

**Magnific.** Lotto audio 2 (gli altri biomi e le voci) e **grafica per lo store**: icona 512, grafica in evidenza 1024×500, screenshot.

**Decisioni del proprietario.**
- Voci in lingua inventata o vere.
- Rum sostituito con il latte di cocco (PEGI 7).
- Vibrazione accesa o spenta di default.
- **1.0 gratis o con sblocco a 4,99 €** (12).

---

## Test chiuso e M6 · Rifinitura (in parallelo: 14 giorni, 3-4 sessioni)

**Prima del test** (1 sessione):
- secondo workflow `release.yml`, che produce un **AAB firmato** con la chiave di caricamento nei secret di GitHub e Play App Signing;
- API di destinazione verificata;
- privacy policy pubblicata sul sito del proprietario;
- scheda "Sicurezza dei dati" con "nessun dato raccolto";
- questionario IARC e pubblico 13+.

**Test chiuso.** Parte con la build di fine M5, con tutto sbloccato (12 §6).
- Servono **almeno 12 tester iscritti per 14 giorni di fila**. Conviene reclutarne **15**: se qualcuno esce, il conteggio dei giorni non si azzera.
- La lista di indirizzi Google si raccoglie durante M3.
- Si pubblica un aggiornamento ogni 3-4 giorni.
- I tester segnalano i bug col codice replay (13 §6).

**M6 durante il test.** Un agente per area di bug, ciascuno nella cartella in cui sta il bug, sui rami `claude/m6-<area>`. Il lavoro è taratura col simulatore, prestazioni, haptics e accessibilità.

**Fatto quando.**
- 30 minuti senza crash su 2 telefoni.
- APK sotto i 40 MB.
- Avvio a freddo in meno di 4 s.
- Zero bug bloccanti o gravi.
- Simulatore tutto verde, oppure giallo motivato.

## 1.0 (1 sessione e i tempi di Google)

Si chiede l'accesso alla produzione con le risposte sul test chiuso, poi si attende la revisione di Google, che può richiedere alcuni giorni. Si pubblica col rilascio graduale al 20%, poi al 100% dopo 48 ore senza crash nuovi.

## Calendario riassuntivo

| Fase | Sessioni | Asset Magnific |
|---|---|---|
| M0 | 1-2 | — |
| M1 ★ | 5-6 | stile + prova `pirata_cammina` |
| M2 | 3-4 | grafica lotto 1, audio lotto 1 |
| M3 | 3-4 | lotto 1 continua; lista tester |
| M4 | 2-3 | grafica lotto 2 + animazioni mancanti |
| M5 | 4-6 | audio lotto 2, grafica store |
| Test chiuso + M6 | 3-4 (+14 giorni) | ritocchi |
| 1.0 | 1 | — |

## Domande per il proprietario

1. **Account Play Console personale o aziendale?** Se è personale, il test chiuso con 12 tester per 14 giorni è obbligatorio. Se è aziendale, di norma non serve e si risparmiano circa 2 settimane, ma servono i documenti dell'attività.
2. **Chi sono i 12-15 tester?** Servono indirizzi Google che usano un telefono Android e che restino iscritti per 14 giorni.
3. **Budget Magnific complessivo.** Va confermato prima di M2: lotto grafico 1 con circa 13 video e i tentativi, lotto audio 1 con circa 120 file.
