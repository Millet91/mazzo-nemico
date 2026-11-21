# ui/kit/ — kit UI dipinto (P2, Arte UI). Proprietario: agente Arte UI (ramo claude/p2-arte-ui).

Pannelli a 9 fette in legno e pergamena, pulsanti di legno, medaglione tondo e icone delle 16 armi a 128 px.
Le immagini stanno in `public/assets/ui/` e si rifanno con `node scripts/ui/dipingi-kit.mjs`
(in casa con Chromium, niente Magnific; `PW_CHROME=/opt/pw-browsers/chromium` se serve).

Uso (da `import { … } from '../kit'`):
- `<Pannello tipo="cornice">` legno con dentro la pergamena (pannelli della mappa del mondo), `tipo="legno"` tavola scura
  con testo chiaro, `tipo="pergamena"` foglio (cartelli del Re, lettere, premi).
- `<PulsanteKit tipo="oro" grande>` una sola azione principale per schermata; `tipo="legno"` per le altre. `sotto` = riga piccola.
- `<PulsanteTondo label="…">` per ⚙, ‹, ✕ (minimo 52 px).
- `<IconaArma arma="cannone" dim={48} bloccata?>` tra 40 e 64 px CSS.

Regole: HUD di battaglia resta in vetro scuro (non usa il kit); testi sempre da `testi/it.ts`;
sorgenti a 3× (fetta 72 px → 24 px CSS); webp qualità 0,82.
