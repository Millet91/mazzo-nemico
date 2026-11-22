"""Toglie il taglio dritto in cima alla striscia `medio.webp` (scogli alti che toccano il bordo dell'immagine).

    python3 scripts/mappe/sfuma-medio.py public/assets/mappe/<id>/medio.webp

Nelle colonne dove lo scoglio arriva alle prime 12 righe (più 24 px attorno) la cima diventa irregolare e sfuma in
30 px: nel gioco la striscia non mostra più una riga orizzontale dove finisce. Il resto della striscia non cambia.
"""
import math
import sys

from PIL import Image

f = sys.argv[1]
im = Image.open(f).convert('RGBA')
w, h = im.size
px = im.load()
alti = [any(px[x, y][3] > 40 for y in range(0, 12)) for x in range(w)]
# colonne vicine (±24 px, con il giro: la striscia si ripete) a uno scoglio tagliato
vicino = [any(alti[(x + d) % w] for d in range(-24, 25, 4)) for x in range(w)]
cambiati = 0
for x in range(w):
    if not vicino[x]:
        continue
    # cima irregolare: 27-57 px sotto il bordo, due onde lente (periodo multiplo della larghezza: la striscia si ripete)
    t = 42 + 10 * math.sin(2 * math.pi * x * 7 / w) + 5 * math.sin(2 * math.pi * x * 23 / w + 1.3)
    for y in range(0, min(h, int(t) + 1)):
        r, g, b, a = px[x, y]
        if a == 0:
            continue
        k = max(0.0, min(1.0, (y - t) / 30 + 1))
        k = k * k * (3 - 2 * k)
        na = int(round(a * k))
        if na != a:
            px[x, y] = (r, g, b, na) if na else (0, 0, 0, 0)
            cambiati += 1
im.save(f, lossless=True, method=6)
print(f, 'colonne sfumate', sum(vicino), 'pixel cambiati', cambiati)
