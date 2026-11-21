# Piano di test della M1 · Schermaglia 3v3 contro l'IA Mozzo

Proprietario: **Lead test/QA** (cartella `tests/qa/`, ramo `claude/m1-qa`).
Fonti: `14-produzione.md` §M1, `13-qa.md`, e **`00-DECISIONI.md`, che prevale** (numeri in §1.1-1.2, telefono in §9 n. 10).

## 0. Numeri che valgono per la M1 (da 00, non da 13 §1)

| Tema | Valore | Dove si legge nel codice |
|---|---|---|
| Mondo | 2048×1024, mare a y = 950, fondale di ferro 984-1024 | costanti di `contenuti/` o `core/` (mai ricopiate nei test) |
| Fisica | 60 Hz fisso, g = 600 px/s², proiettili max 950 px/s, max 5 tick per frame | idem |
| Pirata | capsula 12×22, gradino 8 px, 70 PV, si ferma sotto 5 px/s | idem |
| Turno | 20 s (30 s a Mozzo, quindi **30 s nella Schermaglia M1**), 3 s di fuga dopo lo sparo | idem |
| Morte improvvisa | il mare sale di 25 px a fine turno dal turno 12; fine al turno 18 | idem |
| Pirati per lato | 1-5 (la M1 consegna 3v3, ma **i test di prestazioni usano 5v5**, il caso peggiore) | |
| Prestazioni | **Google Pixel 6**, 60 fps stabili in battaglia (00 §9 n. 10). Sostituisce "telefono medio/economico" di 13 §4 | |

Regola QA: i test leggono i numeri dal codice, non li ricopiano. Così una taratura non rompe 50 test.

## 1. "Fatto quando" della M1 e chi lo dimostra

| # | Criterio | Come si verifica | Chi | Quando |
|---|---|---|---|---|
| F1 | 10 replay d'oro verdi su Node | `tests/replay/*.json` rigiocati da Vitest in CI | A Fisica scrive i replay, QA li rivede | ogni PR verso l'integrazione |
| F2 | Gli stessi 10 replay verdi **sul telefono** | Impostazioni → Diagnostica → "Rigioca replay" mostra ✅/❌ | D HUD (schermata), QA (verifica sul Pixel 6) | APK di fine fase |
| F3 | Fuzz da 2.000 battaglie pulito | `tests/qa/fuzz.test.ts` (QA). In CI ne giriamo 50 a ogni push, le 2.000 a mano e prima dell'unione in `main` | QA | dopo il congelamento dei contratti |
| F4 | Casi 1-3, 6-8, 10, 18, 22-24 di 13 §3 | tabella §3 sotto | vari | prima dell'unione in `main` |
| F5 | 60 fps sul Pixel 6 | "Prova prestazioni" §4 + contatore FPS nascosto | B Render (scena), QA (misura) | APK di fine fase |
| F6 | Una battaglia intera contro l'IA senza intoppi | prova a mano + test automatico "IA contro IA finisce" | E IA, QA | ogni PR di E |
| F7 | CI verde | L1 + L4 a ogni push; nessuna PR si unisce con la CI rossa | tutti, QA controlla | sempre |

## 2. Livelli di test nella M1

**L1 · unit test (a ogni push).** Ogni agente testa la sua cartella in `tests/<cartella>/`. Minimo atteso:
- **A Fisica:** traiettoria pura (stessa posizione con stessi input; vento; rimbalzo); cratere per materiale (ferro non si buca); danno `D × (1 − d/r)` con minimo 1 al bordo e caso d = 0 (caso 5); acqua che uccide; danno da caduta oltre 90 px, max 25; tetto di 5 tick per frame.
- **C Generatore:** stesso seme → stessa maschera (hash); spawn equi (06 §4) e nessun pirata nato dentro il solido o in acqua; ferro ≤ 3% del solido; seme di riserva dopo 8 fallimenti.
- **E IA:** dato uno stato, la mossa è sempre la stessa; il turno dell'IA restituisce un comando valido entro il budget (si misura in iterazioni, non in millisecondi, per restare riproducibile).
- **D HUD:** griglia 4×4 con 4 celle attive; tocco fuori chiude; il timer non si ferma col selettore aperto.

**Guardie del QA (già attive, `tests/qa/purezza.test.ts`).** Falliscono se `battaglia/sim`, `battaglia/gen` o `core` usano `Math.random`, `Date.now`, `performance.now`, timer, o la trigonometria nativa (si usa la tabella a 0,5°); se l'IA usa `Math.random`; se una cartella pura importa Pixi, Preact, Capacitor, `render/`, `ui/`, `piattaforma/` o tocca il DOM.

**L2 · replay d'oro e fuzz.**
- Formato proposto (da congelare nei contratti): `{ versioneRegole, seme, bioma, squadre, comandi: [{ tick, comando }], hash: { "600": "…", "1200": "…" } }`. L'hash è calcolato da una funzione unica in `core/` su una serializzazione fissa dello stato, **maschera del terreno compresa**.
- I 10 replay della M1 coprono: ognuna delle 4 armi, annegamento, lapide-barilotto che esplode, catena di 2 lapidi, morte improvvisa (mare che sale), fine al turno 18 con parità vinta dal difensore, una battaglia 5v5 completa.
- Un hash cambiato per un cambio voluto si rigenera **in un commit separato** con il motivo.
- Fuzz, invarianti: niente NaN o Infinity; nessun pirata dentro il solido per più di 3 tick; ogni turno si chiude entro 15 s simulati dopo lo sparo; ogni battaglia finisce entro il turno 18; **vivi + morti = iniziali**; stesso seme e stessi comandi → stesso hash (giocato due volte). Un caso fallito si salva da solo come replay di regressione.

**L4 · schermate (Playwright, a ogni push).** Si aggiungono: HUD di battaglia a seme fisso al tick 0 e 600, selettore armi aperto, pausa, esito. Target in battaglia **64 px** (00, correzioni a 13). Formati 800×360, 844×390, 1024×768.

**L5 · telefono.** APK da `apk-prova` sul Pixel 6, checklist del proprietario a fine fase (§5).

## 3. Casi limite della M1 (13 §3)

| Caso | Cosa | Test | Chi |
|---|---|---|---|
| 1 | Proiettile a 950 px/s contro parete di 1-2 px, angoli ogni 5° | unit test, nessun attraversamento | A |
| 2 | Passaggio in diagonale tra due pixel che si toccano per l'angolo | unit test con connettività a 8 | A |
| 3 | Proiettile che esce in alto e rientra col vento | unit test: non esplode sul bordo, non sparisce | A |
| 6 | Frame lento: max 5 tick per frame, niente "spirale" | unit test dell'accumulatore con delta di 1 s | A (e B per il ciclo) |
| 7 | Spinta che infila il pirata nella roccia → espulso verso l'aria più vicina | unit test + invariante del fuzz | A |
| 8 | Pirata che vibra in una buca: fermato d'ufficio dopo 10 s | unit test + invariante "il turno si chiude" | A |
| 10 | Due pirati nello stesso punto: niente divisione per zero nella spinta | unit test (spinta verso l'alto) | A |
| 18 | Rotazione di 180°: l'HUD segue il notch senza riavviare la battaglia | Playwright (notch a sinistra/destra) + telefono | D, QA |
| 22 | Due pollici insieme; FUOCO toccato due volte spara una volta | test dell'input con eventi pointer simulati | B, D |
| 23 | Indietro di Android in battaglia apre la pausa | telefono + test del gestore di `ciclo-vita` | D, QA |
| 24 | Home durante un tiro: al rientro niente tick recuperati, timer fermo | unit test (pausa del ciclo) + telefono | B, QA |

## 4. Come rendiamo verificabili i 60 fps sul Pixel 6

1. **Contatore FPS** (c'è già da M0): 5 tocchi sulla versione in Impostazioni → Info. Mostra fps medio e minimo sugli ultimi 60 s.
2. **"Prova prestazioni"** (da aggiungere, proposta al Lead): Impostazioni → Diagnostica → "Prova 60 fps". Gioca da sola per 60 s un replay fisso **5v5** con esplosioni, crateri, camera che si sposta e zoom al massimo, poi mostra: fps medio, fps minimo per secondo, frame sopra 20 ms, ms medi della sim per tick. Così la misura è sempre la stessa e si può ripetere a ogni APK.
3. **Soglie di accettazione sul Pixel 6:** fps medio ≥ 58, minimo per secondo ≥ 50, sim ≤ 2 ms per tick. Sotto soglia la M1 non si chiude.
4. **Guardia in CI (Node):** un test misura il tempo medio di un tick della sim in una battaglia 5v5 e fallisce se supera un tetto largo (es. 4 ms in CI), per accorgersi subito di un peggioramento grosso. Non sostituisce la prova sul telefono.

## 5. Revisione delle PR verso `claude/m1-integrazione`

Il QA guarda ogni PR prima che il Lead la unisca. Controlla:
- CI verde (L1 e L4), compresi i test del QA.
- Ogni regola nuova ha almeno un test; ogni bug corretto ha prima il suo test di regressione.
- Nessun numero ricopiato a mano nei test.
- L'agente tocca solo le sue cartelle (14 §M1).
- Se cambia un hash di replay d'oro: commit separato con il motivo.

I problemi si scrivono come commento nella PR e con un messaggio al thread dell'agente.

## 6. Checklist del proprietario a fine M1 (bozza, si rifinisce sull'APK vero)

Scarica l'ultimo APK da `apk-prova`, apri Impostazioni → Info e annota il numero di build. Poi rispondi sì/no:

1. Menu → Schermaglia: la battaglia 3 contro 3 parte?
2. Camminare, saltare e mirare con due pollici sono comodi?
3. Le 4 armi (cannone, granata, sciabola, pistola) funzionano? Il terreno si buca dove te lo aspetti?
4. Qualche colpo è passato **attraverso** il terreno?
5. Un pirata buttato in mare muore subito?
6. Un pirata è rimasto incastrato o "tremolante", o un turno non è mai finito?
7. Dal turno 12 il mare sale? La battaglia finisce con la schermata di esito?
8. Durante un tiro premi Home, aspetta 30 s e rientra: tutto com'era e il timer fermo?
9. Il tasto indietro apre la pausa e non chiude il gioco?
10. Gira il telefono di 180°: i pulsanti si spostano lontano dalla fotocamera?
11. Impostazioni → Diagnostica → "Rigioca replay": tutti ✅?
12. Impostazioni → Diagnostica → "Prova 60 fps": che numeri escono? (scrivili)
13. C'è una cosa che non hai capito come fare? Scrivila.
