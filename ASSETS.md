# Asset: come sostituire i segnaposto

Tutti i riferimenti grafici e sonori passano da **`src/assets/registry.ts`**. Oggi ogni voce ha solo un `glyph` (un simbolo segnaposto). Per mettere l'asset definitivo:

1. salva il file in `public/assets/<categoria>/<id>.webp` (o `.png`, `.svg`; per i suoni `.ogg`/`.mp3`);
2. in `registry.ts` aggiungi `image: 'assets/<categoria>/<id>.webp'` (o `sample:` per i suoni) alla voce con lo stesso id.

Il componente `Art` mostra l'immagine se c'è, altrimenti il glifo: si possono sostituire gli asset uno alla volta.

## Elenco

| Registro | Voci | Uso | Dimensione consigliata |
|---|---|---|---|
| `ENEMY_ART` | 30 sventure, 3 élite, 3 Mazzieri, gettoni (Copia, Scartina, Corvo, Disperazione) | illustrazione al centro della carta | 256×256, leggibile a 96 px, sfondo trasparente |
| `DEFENSE_ART` | 37 difese | sigillo d'inchiostro dentro la forma della famiglia | 128×128, monocromo oro su trasparente |
| `SEME_ASSET` | 4 semi + Neutra + Mazziere | icona del seme in alto a destra della carta | 64×64 |
| `SCENE_ART` | porta, lume, mazzo, Mazzieri, nodi della mappa, 4 Bari, 10 eventi | scene e ritratti | 512×512 (eventi), 128×128 (icone) |
| `SOUNDS` | 22 cue | effetti | ogg, mono, < 1 s |
| `MUSIC` | 9 stem | musica adattiva (GDD §11.2) | ogg in loop a 96 BPM |

Gli id corrispondono a quelli in `src/content/enemies.ts` e `src/content/defenses.ts`.

## Regole visive da rispettare (GDD §10)

- **L'oro è solo del giocatore**: difese, Patti, interfaccia amica.
- I semi si distinguono su tre canali: colore, cornice (Bastoni dentellata, Coppe tratteggiata, Spade con bulloni, Denari doppia) e icona.
- Le famiglie di difese si distinguono dalla forma: Segno esagono, Trucco rombo, Rito cerchio con freccia, Patto cerchio con catena. Le forme sono disegnate in CSS (`style.css`, classi `.hex`, `.rombo`, `.cerchio`, `.patto`): l'asset va dentro.
- Gerarchia della carta: Forza, seme, keyword, illustrazione.
- Colori della palette: variabili CSS in cima a `src/ui/style.css`.
