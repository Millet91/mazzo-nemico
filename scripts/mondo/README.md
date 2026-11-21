# scripts/mondo — pittore del Tavolo del Timone (in casa, senza Magnific)

`npx tsx scripts/mondo/dipingi.ts [nome…]` dipinge con il canvas di Chromium (Playwright) i pezzi della mappa del mondo e li salva in `public/assets/mondo/` (~2,4 MB). Senza nomi li rifà tutti (~20 s); con dei nomi solo quelli, es. `isola-1C onda-1C carta`.

- `pittore.ts` gira nella pagina: carta 3072×1728 (tessere 512), tavolo, isole e fasce d'onda a 2×, `indici.png` (1/4, rosso = isola × 20), pedine, cartello, bandierina, premi, boccale, nebbia, veliero, onde.
- `forme.ts` rumore e sagome delle isole (puro, con seme: stessa carta a ogni giro).
- Se si spostano le isole in `contenuti/capitolo-1.ts` vanno ridipinte carta e `indici`.
- Fase B: le icone delle isole nasceranno dalle maschere di battaglia; gli stessi nomi di file si possono sostituire con arte definitiva.
