# Kaboom Ahoy! – Isole Spezzate

Gioco per telefoni Android, a tema pirata. Le battaglie sono a turni come Worms, su isole 2D completamente distruttibili. Sopra c'è una mappa strategica come Risiko: i pirati che sposti in un territorio sono quelli con cui combatti.

**Stato: M0 (pulizia della repo).** C'è lo scheletro del progetto: mare animato segnaposto, titolo e Impostazioni → Info. Le regole di gioco non ci sono ancora.

Tutte le decisioni di progetto sono in [`docs/progetto/00-DECISIONI.md`](docs/progetto/00-DECISIONI.md), che prevale sugli altri documenti di `docs/progetto/`.

## Tecnologie

Vite, TypeScript, Preact con signals (interfaccia), PixiJS 8 (grafica), Capacitor 7 (app Android), Vitest e Playwright (test). Telefono minimo: Pixel 6 (Android 12, minSdk 31).

## Comandi

```bash
npm ci                 # installa le dipendenze
npm run dev            # gioco nel browser, anche dal telefono sulla stessa rete
npm run typecheck      # controllo dei tipi
npm test               # unit test (L1)
npm run test:e2e       # test visivi delle schermate (L4); in locale: PW_CHROME=/percorso/di/chrome
npm run build          # build web in dist/
npm run assets:check   # stato del registro asset
npm run android:apk    # APK di debug in locale (serve l'Android SDK)
```

## Installare l'APK di prova

1. Dal telefono apri la pagina **Releases** del repository e scegli la pre-release **`apk-prova`**.
2. Scarica `kaboom-ahoy-prova.apk` e aprilo. Se Android lo chiede, consenti l'installazione da questa fonte.
3. L'app si chiama **Kaboom Ahoy!** e si installa accanto al vecchio Baro, senza sostituirlo.
4. In **Impostazioni → Info** trovi versione, build e commit: scrivili sempre quando segnali un problema. Per accendere il contatore FPS tocca 5 volte il numero di versione.

L'APK lo costruisce GitHub Actions (`.github/workflows/apk.yml`) a ogni push. La pre-release `apk-prova` la aggiornano solo `main` e i rami `claude/*-integrazione` e `claude/m0-*`; gli altri rami caricano l'APK solo come artifact del workflow.

## Struttura

Le cartelle sono quelle di 04 §4. Ognuna ha un `README.md` che dice chi ne è proprietario. `src/core/` e `package.json` li cambia solo il Lead Tecnico. Tutti i testi stanno in `src/testi/it.ts`.
