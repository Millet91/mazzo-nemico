#!/usr/bin/env python3
"""Taglia il terreno HD (4096x2048, uscito dal pittore a scala 2) nelle tessere del formato concordato con Render
(P1-contratti §6).

  python3 scripts/mappe/tessere-hd.py <terreno@2x.png> <id-mappa> [<terreno-variante@2x.png> <cartella-variante>]

Scrive public/assets/mappe/<id>/hd/t-<colonna>-<riga>.webp e hd/indice.json:
- 8x4 tessere, contenuto 512x512 con 2 px di margine per lato (file 516x516, contenuto da (2,2)); sul bordo del
  mondo si ripete l'ultimo pixel;
- l'arte sborda: oltre la sagoma il colore del pieno vicino si allarga, ad alfa 255, per 8 px del quadro HD
  (4 px di mondo); più in là resta il quadro com'è (trasparente, o la parete in fondo alle grotte ad alfa 110);
- WebP senza perdita; nell'indice solo le tessere non vuote.
Con la variante (per esempio il Prologo) scrive in public/assets/mappe/<id>/<cartella-variante>/ solo le tessere
che cambiano rispetto alla mappa base, anche quelle che nella variante diventano vuote (file trasparente), e il suo
indice.json con `base` = la cartella della mappa base.
Serve Pillow e numpy.
"""
import json, os, sys
import numpy as np
from PIL import Image

W, H, LATO, BORDO, COLONNE, RIGHE, SBORDO = 4096, 2048, 512, 2, 8, 4, 8


def sborda(rgba):
    """Allarga il colore del pieno (alfa 255) di SBORDO px, ad alfa 255: media dei vicini pieni (8 vicini)."""
    a = rgba.astype(np.float32)
    pieno = rgba[..., 3] == 255
    col = a[..., :3] * pieno[..., None]
    for _ in range(SBORDO):
        somma = np.zeros_like(col)
        n = np.zeros(pieno.shape, np.float32)
        p = np.pad(pieno, 1).astype(np.float32)
        c = np.pad(col, ((1, 1), (1, 1), (0, 0)))
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                sl = (slice(1 + dy, 1 + dy + pieno.shape[0]), slice(1 + dx, 1 + dx + pieno.shape[1]))
                somma += c[sl]
                n += p[sl]
        nuovi = (~pieno) & (n > 0)
        col[nuovi] = somma[nuovi] / n[nuovi][:, None]
        pieno = pieno | nuovi
    out = rgba.copy()
    allargato = pieno & (rgba[..., 3] != 255)
    out[allargato, :3] = np.clip(np.round(col[allargato]), 0, 255).astype(np.uint8)
    out[allargato, 3] = 255
    return out


def tessere(file):
    im = np.asarray(Image.open(file).convert('RGBA'))
    if im.shape[:2] != (H, W):
        raise SystemExit(f'{file}: {im.shape[1]}x{im.shape[0]}, serve {W}x{H}')
    im = sborda(im)
    pad = np.pad(im, ((BORDO, BORDO), (BORDO, BORDO), (0, 0)), mode='edge')
    out = {}
    for r in range(RIGHE):
        for c in range(COLONNE):
            t = pad[r * LATO:r * LATO + LATO + 2 * BORDO, c * LATO:c * LATO + LATO + 2 * BORDO]
            vuota = not im[r * LATO:(r + 1) * LATO, c * LATO:(c + 1) * LATO, 3].any()
            out[f't-{c}-{r}'] = (t, vuota)
    return out


def salva(tess, cartella, nomi, extra=None):
    os.makedirs(cartella, exist_ok=True)
    for f in os.listdir(cartella):
        if f.startswith('t-') and f.endswith('.webp'):
            os.remove(os.path.join(cartella, f))
    totale = 0
    for n in nomi:
        p = os.path.join(cartella, n + '.webp')
        Image.fromarray(tess[n][0], 'RGBA').save(p, 'WEBP', lossless=True, quality=100, method=6, exact=True)
        totale += os.path.getsize(p)
    indice = dict(scala=2, lato=LATO, bordo=BORDO, colonne=COLONNE, righe=RIGHE, tessere=nomi, **(extra or {}))
    with open(os.path.join(cartella, 'indice.json'), 'w') as f:
        json.dump(indice, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'{cartella}: {len(nomi)} tessere, {totale // 1024} KB')


def main():
    if len(sys.argv) not in (3, 5):
        raise SystemExit(__doc__)
    base = tessere(sys.argv[1])
    dest = os.path.join('public/assets/mappe', sys.argv[2])
    salva(base, os.path.join(dest, 'hd'), [n for n, (t, vuota) in base.items() if not vuota])
    if len(sys.argv) == 5:
        # il pittore ridipinge tutto il quadro della variante (sassi e fiori cadono in altri posti): si prende la
        # tessera della variante solo dove la sagoma cambia davvero (pieno diverso nella tessera o nei suoi 16 px attorno; i funghetti delle grotte non contano),
        # altrove resta quella della base, così l'indice della variante elenca solo le tessere che cambiano
        a0 = np.asarray(Image.open(sys.argv[1]).convert('RGBA'))[..., 3] >= 128
        a1 = np.asarray(Image.open(sys.argv[3]).convert('RGBA'))[..., 3] >= 128
        var = tessere(sys.argv[3])
        def cambia(n):
            c, r = map(int, n[2:].split('-'))
            y0, x0 = max(0, r * LATO - 16), max(0, c * LATO - 16)
            return not np.array_equal(a0[y0:(r + 1) * LATO + 16, x0:(c + 1) * LATO + 16], a1[y0:(r + 1) * LATO + 16, x0:(c + 1) * LATO + 16])
        cambiano = [n for n in var if cambia(n) and not (var[n][1] and base[n][1])]
        salva(var, os.path.join(dest, sys.argv[4]), cambiano, dict(base='hd'))


if __name__ == '__main__':
    main()
