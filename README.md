# Baro · il nucleo

*Il Mazziere gira le carte contro di te. Tu bari.*

Prototipo minimo per rispondere a una sola domanda: **il nucleo è divertente?**
Una schermata orizzontale, cinque regole, partita da circa 10 minuti. La versione completa
precedente (Segni, Riti, Patti, atti, meta) è nella storia di git e in `docs/v1/`.

## Le regole (si imparano giocando)

1. Il Mazziere gira le sue carte nella **fila** di 5 caselle. A ogni fine turno la fila avanza verso la tua porta.
2. Il nemico che **esce** dalla fila ti toglie tante **Vite** quanta è la sua **Forza** (numero rosso).
3. Ogni turno peschi **5 carte** e hai **3 fiche**. Tocca una carta, poi un nemico. Il numero giallo è il costo.
4. **Ruba**: un nemico con Forza 2 o meno diventa una tua carta, per sempre, e non torna più nel suo mazzo.
5. Svuota il mazzo del Mazziere per superare la mano. Dopo ogni mano scegli 1 trucco su 3; il Mazziere
   risponde rinforzandosi. Dopo 3 mani (l'ultima chiusa dal Mazziere in persona) hai vinto.

Niente tempo reale, niente selettori di velocità: il gioco aspetta te, e ogni volta che si ferma è perché devi decidere.

## Contenuti

- **8 nemici**, ognuno chiede una risposta diversa: Scagnozzo (base), Bruto (tanta Forza), Corazzato (max 1 danno a colpo),
  Lesto (avanza di 2), Spettro (immune ai danni: va rubato), Barile (esplode sui vicini, se esce fa 5), Oste (rinforza i vicini),
  Capobanda (finché c'è non puoi rubare). Più il **Mazziere** (boss).
- **4 carte iniziali** (Colpo, Ruba, Spingi), **12 trucchi** da scegliere, **8 carte** che ottieni rubando i nemici.
- Tutto in `src/game/carte.ts`; le regole in `src/game/regole.ts` (pure, testate).

## Comandi

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # test delle regole
npm run sim -- 300   # 3 giocatori finti: casuale / medio / bravo
npm run build:single # tutto il gioco in dist-single/index.html
```

Taratura attuale (300 partite): casuale vince ~1%, medio ~76%, bravo ~98%. Le leve: `VITE`, `BONUS_MANO`,
`DIM_MAZZO`, `RITMO` in `regole.ts`, le Forze in `carte.ts`.

## Grafica

Provvisoria (emoji + colori). Per sostituirla con le illustrazioni basta cambiare `src/ui/arte.ts`.

## Android

Ogni push sui rami `claude/**` costruisce l'APK di prova e lo pubblica nella pre-release
[`apk-prova`](https://github.com/Millet91/mazzo-nemico/releases/tag/apk-prova). L'app è bloccata in orizzontale;
nel browser in verticale la schermata ruota da sola.
