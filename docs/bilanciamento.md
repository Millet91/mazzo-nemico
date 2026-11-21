# Bilanciamento: ultimo report del simulatore

Comando: `npm run sim -- 150 random,medio,greedy` (Sigillo 0, tutti i pacchetti di difese sbloccati). Il simulatore gioca le regole vere del gioco, non una copia.

## In sintesi

| Bot | Vittorie | Obiettivo GDD §7.4 |
|---|---|---|
| Casuale | 26% | ~20% |
| Medio | 70% | 50-60% |
| Greedy | 95% | ~93% |

- **0 errori di regole** e **0 ondate al limite di tick** su 450 run.
- La notte è **un po' troppo facile** per il bot medio (70% contro 50-60%). Non ho ritoccato i numeri: lo decide il Balance Designer durante il test di studio.
- Il punto di morte principale è l'**Atto 3** (ondate e fase 3 del Mazziere): coerente con la curva voluta.
- **Scelte quasi indifferenti**: nel 54% (medio) e 61% (greedy) delle offerte, la 1ª e la 2ª difesa differiscono di meno di 0,5 Lumi di danno previsto. Il GDD chiede scelte più nette.

## Leve consigliate (tutte in `src/content/config.ts`)

1. `P.LUMI` da 35 a 32: abbassa le vittorie del medio di circa 8-10 punti (stima da provare).
2. `P.ADDS` dell'Atto 3: +1 carta aggiunta per rintocco.
3. Difese troppo prese: **Rogo** (92%) e **Tagliola** (83%). Valutare un nerf. Difese poco prese (sotto il 12%): Oracolo, Segnare, Retroguardia, Alternanza, Catena, Raggruppa: valutare un buff.

## Report completo

```
Baro, simulatore headless. 150 run per politica, Sigillo 0, Lumi 35, K=8

=== random (150 run, 0.5 s) ===
Vittorie: 26%
Dove si perde: ondata@3 34%, ondata@2 13%, Mazziere, fase 3@2 9%, Mazziere, fase 3@3 8%, elite@3 5%, elite@2 5%, Mazziere, fase 2@2 1%
Danno medio per rintocco: ondata A1: 1.6 · Mazziere A1: 2.9 · ondata A2: 3.9 · elite A2: 7.0 · Mazziere A2: 4.9 · ondata A3: 5.6 · elite A3: 9.9 · Mazziere A3: 6.3 · elite A1: 6.9
Tick per ondata: media 14.6, max 49; ondate al limite: 0
Patti per run: 1.47; carte del Mazziere distrutte per run: 0.13
Errori di regole (azioni rifiutate): 0

=== medio (150 run, 18.3 s) ===
Vittorie: 70%
Dove si perde: ondata@3 13%, Mazziere, fase 3@3 11%, Mazziere, fase 3@2 4%, elite@3 1%, Mazziere, fase 2@3 1%, ondata@2 1%
Danno medio per rintocco: ondata A1: 0.9 · elite A1: 4.7 · Mazziere A1: 1.4 · ondata A2: 2.3 · elite A2: 4.9 · Mazziere A2: 2.7 · ondata A3: 3.4 · elite A3: 9.4 · Mazziere A3: 5.6
Tick per ondata: media 14.9, max 52; ondate al limite: 0
Patti per run: 3.63; carte del Mazziere distrutte per run: 0.77
Scarto 1ª-2ª opzione: mediana 0.41 Lumi; quasi indifferenti (<0,5): 54%
Errori di regole (azioni rifiutate): 0

=== greedy (150 run, 43.6 s) ===
Vittorie: 95%
Dove si perde: ondata@3 3%, Mazziere, fase 3@3 1%, elite@2 1%
Danno medio per rintocco: ondata A1: 0.5 · elite A1: 4.2 · Mazziere A1: 1.2 · ondata A2: 1.3 · elite A2: 2.8 · Mazziere A2: 1.7 · ondata A3: 2.1 · elite A3: 7.2 · Mazziere A3: 4.4
Tick per ondata: media 15.9, max 51; ondate al limite: 0
Patti per run: 4.87; carte del Mazziere distrutte per run: 0.98
Scarto 1ª-2ª opzione: mediana 0.30 Lumi; quasi indifferenti (<0,5): 61%
Errori di regole (azioni rifiutate): 0

Pick rate (greedy): difesa, offerta, presa
  Rogo                   140   129  92%
  Tagliola               130   108  83%
  Corno                  137    82  60%
  Specchio               199   103  52%
  Lanterna               184    93  51%
  Rimando                144    72  50%
  Mazzo Truccato         194    96  49%
  Rogo dell'Archivio     210    99  47%
  Spina                  187    84  45%
  Bastione               190    83  44%
  Censura                233    92  39%
  Pozzo                  212    79  37%
  Gelo                   189    64  34%
  Discesa                220    73  33%
  Campana a Morto        224    66  29%
  Trappola per Lupi      153    44  29%
  Scartine               234    67  29%
  Malocchio              193    54  28%
  Bavaglio               183    48  26%
  Esca                   219    56  26%
  Calamita               169    42  25%
  Riserva                196    48  24%
  Moneta Falsa           177    40  23%
  Scala                  243    53  22%
  Passo Cadenzato        251    49  20%
  Pescata Avara          261    50  19%
  Avanguardia            256    49  19%
  Setaccio               261    44  17%
  Contrabbando           196    27  14%
  Raggruppa              216    26  12%
  Catena                 184    22  12%
  Alternanza             206    23  11%
  Retroguardia           273    30  11%
  Segnare                206    22  11%
  Oracolo                237    25  11%
```
