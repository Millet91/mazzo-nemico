# Pacchetto 2 — Contratti e regia (Lead P2)

*Lead P2 (Opus), 21/11/2026. Base: `PIANO.md` §4. Ramo di integrazione: `claude/p2-integrazione` (parte da `claude/studio-v2`). Ogni agente lavora sul suo ramo `claude/p2-<area>` e apre la PR **verso `claude/p2-integrazione`**. Il Lead unisce, prova e porta tutto in `claude/studio-v2-integrazione` quando P1 lo ha creato.*

## 1. Fasi e APK

| Fase | Cosa | Dipende da | APK per il proprietario |
|---|---|---|---|
| **A** (subito) | Menu nuovo, Tavolo del Timone con le 8 isole (segnaposto dipinti in casa), salvataggio, round di rinforzi e attacco, battaglie di carriera **Assalto** sulle mappe di oggi, conquista con premio, Marina che contrattacca, fine capitolo | niente | «Dal menu entro in Carriera, vedo il mare, attacco un'isola, vinco, la bandierina diventa rossa e ricevo il premio» |
| **B** | Le 8 isole vere (kit di 12 moduli + generatore + 1A a mano), trucco ambientale per isola, icona sulla mappa nata dalla maschera, viaggio dopo il Prologo | P1 Fase 3 (crolli) | «Ogni isola ha un trucco diverso» |
| **C** | Bandiera e Duello, mosse premio accese davvero, Prologo agganciato alla carriera, paywall 1,99 €, inglese, AAB firmato, test chiuso | P1 Fase 4 (rampino, mosse, Prologo) | «Cap. 1 completo dall'inizio al paywall» |

Criteri di uscita finali: QA §3.10 (bot in ≤ 4 min a battaglia, salvataggio e ripresa senza perdite, ~95% vittorie al primo tentativo, 35-45 min).

## 2. Contratto congelato

- **`src/core/carriera.ts`**: isole, regioni, capitolo, scontri, premi, mosse, stato salvato, animazioni della mappa.
- **`src/core/bus.ts`, sezione «Carriera e mappa del mondo»**: `schermata`, `carriera`, `evidenzaMondo`, `mondoOccupato`, `animaMondo`, `isolaToccata`, `battagliaCarriera`.
- **`src/contenuti/capitolo-1.ts`**: le 8 isole con rotte di 15 §2 (controllate da `tests/mondo/capitolo-1.test.ts`), posizioni sulla mappa logica 3072×1728, Cala Pappagallo sul bordo sud.

Solo il Lead P2 cambia questi tre file. Un campo nuovo si chiede al Lead nel suo thread.

### Chi scrive e chi legge

```
Menu (Arte UI) ──► bus.schermata = 'mondo'
Campagna ──► bus.carriera, bus.evidenzaMondo, bus.animaMondo ──► Scena del mondo (Mondo e mappa)
Scena del mondo ──► bus.isolaToccata, bus.mondoOccupato ──► Campagna
Campagna ──► bus.battagliaCarriera, poi bus.richiestaBattaglia ──► battaglia (P1)
battaglia ──► bus.battaglia.esito ──► Campagna (conquista, premio, scena)
```

- La battaglia copre tutto come oggi. Fuori dalla battaglia comanda `bus.schermata`.
- La scena del mondo è **solo grafica**: non conosce le regole. Disegna `bus.carriera` (padroni, pirati, premi delle isole non prese) e esegue `animaMondo` in coda.
- La Campagna è **pura** nelle regole (`src/mondo/carriera/regole.ts`, senza Pixi né Preact, testabile) e usa la UI Preact per i pannelli.

## 3. Agenti, rami e cartelle

| Agente | Ramo | Cartelle sue |
|---|---|---|
| **Mondo e mappa** | `claude/p2-mondo` | `src/mondo/scena/` (scena Pixi: tavolo, carta, isole-sprite, mare, nebbia, pedine, cartelli, bandierine, camera, tocchi), `scripts/mondo/` (pittore della carta in Chromium), `public/assets/mondo/`. Una riga in `src/render/grafica.ts` per caricare la scena. |
| **Scenario e livelli** | `claude/p2-livelli` | `src/battaglia/mappe/isola-*`, `src/battaglia/gen/moduli/`, `scripts/mappe/isole/`; nei dati del cap. 1 i campi `mappa`, `bioma`, `trucco`. |
| **Campagna e narrativa** | `claude/p2-campagna` | `src/mondo/carriera/` (regole, IA della Marina, stelle), `src/ui/carriera/` (pannelli della mappa, scene di copione, «Nuovo!», fine capitolo, paywall), `src/piattaforma/salvataggio.ts`, `src/piattaforma/acquisti.ts`, sezione `carriera` di `src/testi/it.ts`, `tests/mondo/`. |
| **Arte UI** | `claude/p2-arte-ui` | `src/ui/kit/` (pannello a 9 fette legno/pergamena, pulsanti, cornici), `public/assets/ui/`, icone delle armi 128 px, menu principale in `src/ui/App.tsx` e la sua parte di `style.css`. |

Regole di sempre: niente Magnific senza il tetto del proprietario (oggi si lavora in casa); Pixel 6 a 60 fps (la mappa del mondo ≤ 8 ms di disegno, texture ≤ 40 MB); hitbox delle isole ≥ 56 px CSS a ogni zoom; testi in `it.ts`, mai nel codice.

## 4. Richieste al Lead P1 (contratto di battaglia)

Il Pacchetto 1 possiede `src/core/tipi.ts`. Per la carriera servono, quando P1 li può aggiungere:
1. `ConfigBattaglia.scontro?: ConfigScontro` (da `core/carriera.ts`) e `MotivoFine` con `'bandiera'`; evento sim `{ t: 'bandieraPresa'; pirata }`. La regola Bandiera la scrive P2 in `sim/` nel punto d'aggancio che P1 lascia.
2. `ConfigSquadra.mosse?: IdMossa[]` (assente = tutte, come in Schermaglia) per accendere le mosse premio in carriera.
3. `ConfigSquadra.nomi?: string[]` per le reclute.
4. Il Prologo di P1 scrive a fine battaglia `bus.battaglia.esito` come oggi: la Campagna lo legge e segna il capitolo 0 vinto.

Fino ad allora la Fase A usa solo Assalto e la configurazione di oggi.

## 5. APK di prova

`claude/p2-integrazione` finisce in `-integrazione`, quindi aggiorna anche lui la pre-release `apk-prova`. Per non far vedere al proprietario un gioco «a salti», il Lead P2 tiene `claude/p2-integrazione` sempre aggiornato con l'ultimo `claude/studio-v2-integrazione` di P1 prima di ogni push.
