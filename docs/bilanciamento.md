# Bilanciamento: report del simulatore (Revisione 1)

Comando: `npm run sim -- 400 random,medio,greedy 0` (Sigillo 0, tutti i pacchetti sbloccati, 1.200 run). Il simulatore gioca le regole vere del gioco. Con `OUT=report.json` salva il report completo; con `TUNE='{"LUMI":30}'` prova valori diversi senza toccare il codice; esce con codice 1 se trova errori di regole o ondate al limite.

## In sintesi

| Bot | Vittorie | Obiettivo | Danno dai Mazzieri | Spiccioli non spesi a fine run |
|---|---|---|---|---|
| Casuale | 10% | ~10-20% | 38% | 112 |
| Medio | 55% | 50-60% | 42% | 101 |
| Greedy (guarda avanti) | 89% | ~90% | 52% | 77 |

- **0 errori di regole** e **0 ondate al limite di tick** su 1.200 run.
- Prima della revisione il bot medio vinceva il **81%** e il casuale il **29%**: era il "ho vinto tutto" di Daniele. Ora il medio vince il **55%**, dentro la fascia 50-60% del GDD §7.4.
- Leve usate: `LUMI` 35 → 32, bonus notturno dell'Atto 3 a +2, Piena con Forza 12, mappa con 4 rintocchi per atto (SD-1), Silenzio a cariche, Segni che colpiscono anche i Patti (CD-2), élite più forti.

## Danno medio per tipo di scontro (Lumi persi)

| Scontro | Medio | Casuale | Greedy |
|---|---|---|---|
| ondata A1 | 0.7 | 1.6 | 0.2 |
| elite A1 | 2.2 | 4.7 | 1.3 |
| Mazziere A1 | 1.4 | 2.5 | 1.1 |
| ondata A2 | 1.7 | 3.2 | 0.6 |
| elite A2 | 3.3 | 6.6 | 1.5 |
| Mazziere A2 | 1.9 | 4.0 | 1.1 |
| ondata A3 | 3.8 | 6.1 | 2.2 |
| elite A3 | 6.5 | 9.1 | 3.7 |
| Mazziere A3 | 4.7 | 6.3 | 3.4 |

La curva sale da un atto all'altro come chiede il GDD. Le élite pesano più di una ondata normale.

## Aperti per il prossimo giro

1. **Quota dei Mazzieri sul danno**: 42% per il medio, contro un obiettivo sotto il 35% (Balance). Il Sagrestano resta invariato (vedi `docs/revisione-1.md`). Prossima leva: −1 pescata nella fase 3 della Piena.
2. **Spiccioli non spesi**: i bot arrivano a fine notte con circa 100 Spiccioli. È in parte un limite dei bot (comprano poco al Mercante), ma suggerisce che i prezzi del Mercante possono salire o che servono più cose in cui spendere.
3. **Vittorie per difesa presa** (medio, almeno 60 run): le più alte bastione 65%, rogo 63%, censura 62%, lanterna 62%, brace 62%; le più basse taglio 39%, moneta 40%, catena 40%, gelo 41%, calamita 46%. Il Rogo resta la difesa più forte: il suo "prezzo" ora è CD-2 (colpisce anche i tuoi Patti), da rimisurare dopo un giro di playtest umano.
4. Le opzioni **Affina** sono prese spesso dai bot, che però non sanno valutarle bene: i numeri per singola difesa affinata sono rumorosi.
