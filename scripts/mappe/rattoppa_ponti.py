#!/usr/bin/env python3
"""Rattoppo della pittura del terreno dopo lo spostamento dei ponti (studio v2, Fase 0), senza ridipingere.

  python3 -I scripts/mappe/rattoppa_ponti.py <id> [--tutto]

I ponti di Cala Pappagallo ora finiscono a filo dei balconi (cala-pappagallo-forma.ts: PONTI, PONTE_FRECCIA).
La pittura (public/assets/mappe/<id>/terreno.webp, alfa = maschera) va spostata con loro: questo script prende le
assi del ponte già dipinte e le rimette alla quota nuova, colonna per colonna; i pochi pixel nuovi che non sono
ponte (la base dei barili) prendono il colore del vicino già dipinto; dove ora c'è aria l'alfa va a 0.
La maschera nuova si legge da /tmp/claude-0/<id>-materiali.png, che scrivono costruisci.ts e costruisci-prologo.ts
(eseguirli prima, senza l'immagine). Senza --tutto si tocca solo la zona dei ponti; con --tutto l'alfa di tutta
l'immagine torna identica alla maschera (serve al Prologo, che la vuole esatta).
"""
import math
import sys
import numpy as np
from PIL import Image

LEGNO = 3
# (x0, x1, y0, y1, freccia): com'erano i ponti nella pittura, e come sono adesso
VECCHI = [(794, 930, 608, 544, 14), (1118, 1254, 544, 608, 14)]
NUOVI = [(794, 912, 608, 544, 10), (1136, 1254, 544, 608, 10)]
SPESSORE = 14
# tratto del vecchio ponte dipinto pulito (senza balcone né base del barile): fuori da qui si specchia
PULITO = [(794, 896), (1160, 1254)]
ZONA = (780, 1270, 520, 640)   # x0, x1, y0, y1


def quota(p, x):
    x0, x1, y0, y1, f = p
    t = (x - x0) / (x1 - x0)
    return math.floor(y0 + (y1 - y0) * t + math.sin(math.pi * t) * f + 0.5)


def main():
    mid = sys.argv[1]
    tutto = '--tutto' in sys.argv
    file = f'public/assets/mappe/{mid}/terreno.webp'
    arte = np.asarray(Image.open(file).convert('RGBA')).copy()
    vecchia = arte.copy()
    mat = np.asarray(Image.open(f'/tmp/claude-0/{mid}-materiali.png').convert('RGBA'))
    solido = mat[..., 3] > 0
    materiale = np.round(mat[..., 0] / 40).astype(int)
    H, W = solido.shape
    zona = np.zeros((H, W), bool)
    if tutto:
        zona[:] = True
    else:
        zona[ZONA[2]:ZONA[3], ZONA[0]:ZONA[1]] = True
    dipinto = arte[..., 3] >= 128

    # 1) le assi del ponte, alla quota nuova
    fatti = np.zeros((H, W), bool)
    for v, n, (p0, p1) in zip(VECCHI, NUOVI, PULITO):
        for x in range(n[0], n[1] + 1):
            xs = x
            if xs > p1:
                xs = p1 - (xs - p1)
            if xs < p0:
                xs = p0 + (p0 - xs)
            yn, yv = quota(n, x), quota(v, xs)
            for k in range(SPESSORE):
                y = yn + k
                if not solido[y, x] or materiale[y, x] != LEGNO:
                    continue
                px = vecchia[yv + k, xs]
                if px[3] < 128:
                    continue
                arte[y, x] = (px[0], px[1], px[2], 255)
                fatti[y, x] = True

    # 2) dove ora c'è aria: via
    via = zona & ~solido & (arte[..., 3] >= 128)
    arte[via] = 0
    # 3) i pixel pieni rimasti senza colore: dal vicino già dipinto (a strati)
    buoni = (dipinto & solido) | fatti
    mancano = zona & solido & ~buoni
    giri = 0
    while mancano.any() and giri < 64:
        giri += 1
        nuovi = []
        ys, xs_ = np.nonzero(mancano)
        for y, x in zip(ys, xs_):
            for dy, dx in ((1, 0), (0, -1), (0, 1), (-1, 0), (1, -1), (1, 1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and buoni[yy, xx]:
                    nuovi.append((y, x, yy, xx))
                    break
        if not nuovi:
            break
        for y, x, yy, xx in nuovi:
            arte[y, x] = (arte[yy, xx][0], arte[yy, xx][1], arte[yy, xx][2], 255)
        for y, x, _, _ in nuovi:
            buoni[y, x] = True
            mancano[y, x] = False
    diversi = int(((arte[..., 3] >= 128) != solido)[zona].sum())
    print(f'{mid}: spostati {int(fatti.sum())} px di ponte, tolti {int(via.sum())}, riempiti dal vicino {giri} giri; '
          f'diversi dalla maschera nella zona: {diversi}; in tutto: {int(((arte[..., 3] >= 128) != solido).sum())}')
    if diversi:
        sys.exit('il rattoppo non combacia con la maschera')
    Image.fromarray(arte, 'RGBA').save(file, 'WEBP', lossless=True, method=6)
    Image.fromarray(arte, 'RGBA').save(f'/tmp/claude-0/{mid}-terreno.png')


if __name__ == '__main__':
    main()
