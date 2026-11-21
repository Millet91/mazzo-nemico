# 04 · Progetto tecnico (Lead Tecnico)

Solo progettazione. Gli snippet TypeScript sono contratti di massima, non codice di gioco.

## 1. Stack: decisione

| Opzione | Pro | Contro | Voto |
|---|---|---|---|
| **Phaser 3** | scene, tween, audio, input pronti | ~1 MB, i suoi motori fisici (Arcade/Matter) non gestiscono terreno a pixel: la fisica va riscritta comunque; ha un suo sistema scene/input che litiga con Preact | 2° |
| **PixiJS 8 + fisica nostra** | solo rendering WebGL, batching ottimo, spritesheet animati, filtri; ~450 KB; nessuna opinione su stato e input | audio, tween e camera li scriviamo noi (poche centinaia di righe) | **scelto** |
| Canvas 2D puro | zero dipendenze | su Android medio regge male 60 fps con parallasse, particelle e sprite animati; nessun batching | scartato |

**Stack finale:** Vite 6 + TypeScript 5.9 + Preact 10 (+ `@preact/signals`) + **PixiJS 8** + Capacitor 7 (`app`, `haptics`, `preferences`). Test: Vitest + tsx. Audio: WebAudio diretto (sintetizzato come oggi, poi campioni).

Regola d'oro: **la simulazione è TypeScript puro**, senza DOM né Pixi. Gira identica nel telefono, in Node (test, simulatore) e dentro l'IA.

## 2. Battaglia: terreno, fisica, prestazioni

**Risoluzione logica.** Mondo di battaglia 2048×1024 px logici. Viewport logico 960×540 (16:9, orizzontale), scalato allo schermo; camera con zoom 0,6–1,5 e pan. Risoluzione del renderer = `min(devicePixelRatio, 1.5)`: su un Android medio (Snapdragon serie 6, 4 GB) è la differenza tra 45 e 60 fps.

**Terreno distruttibile.**
- Maschera solida: `Uint8Array` 2048×1024 (2 MB), 0 = aria, 1 = terra, 2 = roccia indistruttibile (fondo e bordi).
- Grafica: immagine del terreno divisa in **32 tile da 256×256**, ognuna con un proprio canvas offscreen e una texture Pixi. Un'esplosione cancella un cerchio sulla maschera e, sui canvas toccati, disegna con `destination-out` + un bordo bruciato; si ricaricano in GPU **solo le tile sporche** (di norma 1–4).
- Mappe generate da seme: rumore 1D per il profilo, grotte con metaball, isole sospese; poi texture pirata (sabbia, roccia, legno di relitto) mascherata. Le mappe disegnate a mano (PNG con alfa → maschera) sono supportate dallo stesso formato.

**Collisioni a pixel.**
- Proiettili: punto o cerchio piccolo; ogni passo si traccia il segmento dalla posizione precedente alla nuova a passi di 1 px (niente tunnelling anche a 25 px/passo).
- Pirati (i "vermi"): cerchio di raggio 7 px; sta a terra se c'è solido nei 2 px sotto i piedi; cammina salendo gradini fino a 4 px; oltre, si blocca; normale del pendio stimata campionando 8 pixel attorno al punto di contatto.
- Acqua (mare) a quota fissa in fondo: chi ci cade muore. Si alza di 8 px a turno dopo il turno 20 (morte improvvisa).

**Fisica deterministica a passo fisso.**
- `TICK = 1/60 s`, accumulatore: il render interpola, la sim avanza a tick interi. Gravità 0,25 px/tick², vento ±0,02 px/tick² su proiettili sensibili.
- Determinismo: solo numeri della sim, **PRNG con seme** (mulberry32) dentro lo stato, mai `Math.random` né `Date.now`, ordine di iterazione fisso, niente `Math.sin` su dati di input (angoli da tabella a 0,5°). Test: stesso seme + stessi input ⇒ stesso hash dello stato dopo 10 000 tick.
- Esplosione: cratere raggio R; danno `max × (1 − d/R)`; spinta radiale `k × (1 − d/R)`; danno da caduta oltre 60 px di volo.
- Turno = sequenza di **comandi** (muovi, salta, mira, spara con potenza). Uno stato + lista di comandi = replay completo, ripresa di partita e debug.

**Budget di un frame (16,6 ms):** sim ≤ 2 ms, upload tile ≤ 2 ms, render ≤ 8 ms, resto UI. Particelle max 300 (pool), sprite in un unico atlante per scena, nessun filtro full-screen durante il volo.

## 3. UI moderna e motore: come convivono

```
<div id="app">
  <canvas>  ← Pixi (battaglia) ; mappa mondo = SVG di Preact
  <div class="ui"> ← Preact, position:absolute, pointer-events solo sui controlli
```
- Il motore non importa Preact; la UI non tocca Pixi. Si parlano tramite un **bus tipato**: il motore pubblica `EventoBattaglia` (turnoIniziato, colpito, morto, fine) in signals letti dalla UI; la UI invia `Comando` (scegliArma, fine turno, pausa).
- In Preact: HUD (timer, vento, ruota armi, barre squadre), menu, mappa del mondo, schermate di esito. In Pixi: tutto ciò che segue la camera (nomi e vita sopra i pirati, mirino, traiettoria).
- Input di mira e movimento sul canvas (gestito dal modulo `input` del motore): trascina per mirare, tieni premuto per la potenza, tasti grandi a sinistra per camminare/saltare.

## 4. Struttura cartelle

```
src/
  core/        rng, tipi condivisi, bus eventi, costanti   (puro)
  battaglia/
    sim/       terreno, fisica, pirata, armi, turno, battaglia   (puro)
    ia/        IA di battaglia                                   (puro)
    gen/       generatore mappe da seme                          (puro)
    render/    Pixi: scena, tile terreno, sprite, camera, input, particelle
  mondo/       regole Risiko, IA strategica                      (puro)
  contenuti/   armi.ts, territori.ts, ciurme.ts, bilanciamento.ts (dati)
  ui/          schermate e componenti Preact, style.css
  assets/      registry.ts (+ componente Art)
  piattaforma/ salvataggio, haptics, audio, ciclo di vita app
sim/           simulatore da riga di comando
tests/         per cartella, stessi nomi
```

## 5. Modello dati (a grandi linee)

```ts
type Id = string;
interface Mondo { seme: number; turno: number; territori: Record<Id, Territorio>; regioni: Regione[];
                  fazioni: Record<Id, Fazione>; attiva: Id; }
interface Territorio { id: Id; nome: string; regione: Id; confini: Id[]; proprietario: Id | null;
                       pirati: number; bioma: 'isola'|'scogliera'|'porto'|'giungla'|'vulcano'; }
interface Regione { id: Id; territori: Id[]; bonus: number }            // come i continenti di Risiko
interface Fazione { id: Id; nome: string; ia: boolean; colore: string; ciurma: Ciurma; arsenale: Record<IdArma, number> }
interface Ciurma { capitano: string; nomi: string[] }
interface Attacco { da: Id; a: Id; pirati: number }                     // N pirati spostati = N in battaglia

interface StatoBattaglia { tick: number; rng: number; terreno: Terreno; vento: number;
  squadre: Squadra[]; pirati: Pirata[]; proiettili: Proiettile[]; turno: { squadra: number; pirata: Id; resto: number };
  esito: null | { vincitore: number; superstiti: Record<number, number> }; }
interface Pirata { id: Id; squadra: number; x: number; y: number; vx: number; vy: number; vita: number; verso: 1|-1 }
interface Terreno { w: number; h: number; maschera: Uint8Array; acqua: number }
interface Arma { id: IdArma; tipo: 'balistica'|'lancio'|'istantanea'|'mischia'|'piazzabile'|'aerea';
  danno: number; raggio: number; spinta: number; vento: boolean; miccia?: number; rimbalzo?: number;
  frammenti?: { n: number; arma: IdArma }; munizioni: number | 'inf' }
```
Le armi sono **dati** interpretati da pochi comportamenti generici: una nuova arma è una riga in `contenuti/armi.ts`, non un file nuovo. Esito della battaglia → il mondo: i superstiti dell'attaccante occupano il territorio, quelli del difensore restano se vince.

## 6. Salvataggio

- **Capacitor Preferences** (SharedPreferences su Android, localStorage su web), dietro un'interfaccia `Salvataggio` in `piattaforma/`. La campagna è un JSON di 10–40 KB: IndexedDB non serve.
- Chiavi: `impostazioni`, `campagna` (con `versione` e migrazioni), `battaglia-in-corso` = seme + stato iniziale compresso + lista comandi. Grazie al determinismo la battaglia si riprende rigiocando i comandi (≈ 1 s di calcolo), senza salvare la maschera da 2 MB.
- Si salva a fine azione sul mondo, a fine turno di battaglia e su `appStateChange` (app in background).

## 7. IA

- **Battaglia:** per ogni pirata e arma utile, campiona 72 angoli × 8 potenze (+ 3 punti di cammino), simula il solo proiettile sulla maschera corrente senza scavare (≈ 0,05 ms a traiettoria), punteggio = danno ai nemici + uccisioni×50 − danno amico×1,5 − rischio caduta in acqua. Calcolo spezzato su più frame (≤ 4 ms per frame) o in un Web Worker se serve. Difficoltà = rumore su angolo/potenza (Facile ±8°/±15%, Normale ±3°, Difficile 0) e numero di candidati.
- **Mondo:** euristica a punteggio: attacca dove `pirati_miei / pirati_suoi ≥ 1,5`, preferisce completare regioni, rinforza i confini minacciati. Riusa le stesse funzioni pure di `mondo/regole.ts`.

## 8. Test

- **Regole pure (Vitest):** terreno (cratere, tile sporche), collisioni, danno/spinta, turni, ogni arma, regole del mondo (rinforzi, bonus regione, conquista), migrazioni del salvataggio, registro asset completo.
- **Determinismo:** test di hash su replay registrati ("replay d'oro" in `tests/replay/`).
- **Simulatore** come nel vecchio progetto: `npm run sim -- battaglie 500` (IA contro IA: durata media in turni, % vittorie per lato e per numero di pirati 1–8, uso delle armi, % morti in acqua) e `npm run sim -- campagna 100` (durata, snowball). Obiettivi: battaglia 4 contro 4 = 8–14 turni; vantaggio numerico 5 vs 3 vince il 75–85%.

## 9. Vecchia repo: cosa resta, cosa va

**Si tiene:** `apk.yml` (cambiare `baro-prova.apk`, titolo e note della release al nuovo nome; resta la pre-release `apk-prova` e i trigger `claude/**`); `capacitor.config.ts` con orientamento orizzontale bloccato (rinominare `appName` e `appId`, es. `it.<autore>.pirati`: cambiare l'`appId` installa un'app nuova, si fa una volta sola, in M0); cartella `android/` (rigenerare il package Java con il nuovo id); script npm `dev/build/test/typecheck/sim/android:*`; Vite, Preact, Vitest, tsx, Haptics, App; il **modello del registro asset** (`VisualAsset`, `glyph` → `image`, componente `Art`, test di completezza, `assets:check`) svuotato e esteso con `atlas`/`frames`/`fps` per gli animati Magnific (video → fotogrammi → spritesheet WebP).
**Si cancella:** `src/game`, `src/content`, carte, nemici, difese, `docs/v1`, `sim/sim.ts`, test delle carte, palette e classi di `style.css` (si tiene solo la struttura a variabili CSS), `ASSETS.md` (da riscrivere), font Cinzel se l'Art Director sceglie altro. `vite-plugin-singlefile` resta solo se serve una demo da browser.

## 10. Milestone e lavoro parallelo

Regola anti-conflitto: **ogni agente possiede cartelle, non file sparsi**. `core/tipi.ts` e il bus eventi li cambia solo il Lead, all'inizio di ogni milestone (contratto congelato). Ogni agente lavora su un ramo `claude/<milestone>-<area>`, unisce dopo test verdi.

| M | Contenuto | "Fatto" quando | Divisione |
|---|---|---|---|
| **M0 Pulizia** | cancellare il vecchio, rinominare app/APK, aggiungere Pixi e Preferences, scheletro cartelle, registro vuoto | APK nuovo si installa, mostra una schermata vuota con un canvas Pixi a 60 fps; `npm test` verde | 1 agente (sequenziale, tocca tutto) |
| **M1 Battaglia grezza** | terreno da seme, 2 squadre × 3 pirati a cerchi colorati, cammina/salta, un'arma (bazooka), turni a 45 s, acqua, vittoria | partita completa in 2 giocatori sullo stesso telefono; test determinismo verde; 60 fps su telefono medio | A: `battaglia/sim` · B: `battaglia/render` + input · C: `battaglia/gen` · D: HUD minimo in `ui/` |
| **M2 Armi** | 12 armi (cannone, granata, barile di polvere, moschetto, sciabola, ancora aerea, mina, dinamite, cannone a grappolo, pappagallo kamikaze, corda, teletrasporto), IA di battaglia, ruota armi | ogni arma ha test; `sim battaglie` dà 8–14 turni; IA Normale batte Facile ≥ 70% | A: armi balistiche · B: armi speciali/mobilità (ogni comportamento in un file proprio; la tabella `contenuti/armi.ts` la tiene il Lead) · C: `battaglia/ia` · D: ruota armi UI |
| **M3 Mappa mondo** | ~24 territori in 6 regioni (dal documento di design), regole Risiko, IA strategica, battaglia risolta con stub automatico | campagna intera giocabile con stub; `sim campagna` termina sempre; salvataggio/ripresa | A: `mondo/` regole + IA · B: mappa SVG in `ui/mondo` · C: `piattaforma/salvataggio` |
| **M4 Collegamento** | N pirati spostati → battaglia con N; esito → mondo; ripresa battaglia da replay; bioma → generatore | conquista di un territorio giocando una vera battaglia, chiusura e riapertura dell'app a metà battaglia senza perdite | A: adattatore mondo↔battaglia · B: gen per bioma · C: ripresa/replay |
| **M5 UI e asset** | stile definitivo, sprite animati via registro, audio, menu, tutorial | nessun glifo segnaposto nelle schermate principali; `assets:check` pulito per il lotto 1 | A: UI Preact · B: pipeline sprite/atlante · C: audio · D: tutorial |
| **M6 Rifinitura** | taratura, prestazioni, haptics, accessibilità, APK firmato | 30 min di gioco senza crash su 2 telefoni medi; 60 fps medi, minimo 45; dimensione APK < 40 MB | per area di bug, un agente per cartella |
