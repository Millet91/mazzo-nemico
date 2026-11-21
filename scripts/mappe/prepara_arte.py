#!/usr/bin/env python3
"""Prepara la grafica di una mappa fatta a mano dalle immagini di Magnific (sfondo verde #00FF00 = trasparente).

  python3 scripts/mappe/prepara_arte.py <cartella-immagini> <id-mappa> [--pittore]

Nella cartella: terreno.*, cielo.*, lontano.*, medio.*, oggetti.* (png/jpg/webp; quelli che mancano si saltano).
Scrive public/assets/mappe/<id>/*.webp e /tmp/claude-0/<id>-terreno.png (RGBA 2048x1024 per costruisci.ts).
Il terreno si allinea alla sagoma disegnata: il riquadro della terra dipinta va sul riquadro della guida
(x 80-1960, cima a y 290, fondo a 1024), così la mappa resta quella validata. Serve Pillow e numpy.
"""
import sys, os, glob
import numpy as np
from PIL import Image

W, H = 2048, 1024
GUIDA = dict(x0=78, x1=1968, y0=290, y1=1024)


def apri(cartella, nome):
    for f in sorted(glob.glob(os.path.join(cartella, nome + '.*'))):
        return Image.open(f).convert('RGBA')
    return None


def chiave(img, duro=False):
    """Toglie il verde: alfa dal 'quanto è verde', poi niente alone verde sui bordi."""
    a = np.asarray(img).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    verde = g - np.maximum(r, b)
    alfa = np.clip(1 - (verde - 40) / 70, 0, 1)
    if duro:
        alfa = (alfa >= 0.5).astype(np.float32)
    # despill: dove resta un po' di verde, il canale verde non supera il più forte degli altri due
    g2 = np.where(verde > 0, np.minimum(g, np.maximum(r, b) + 8), g)
    out = np.dstack([r, g2, b, alfa * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def riquadro(img):
    al = np.asarray(img)[..., 3] > 127
    ys, xs = np.nonzero(al)
    return xs.min(), xs.max() + 1, ys.min(), ys.max() + 1


def salva(img, percorso, q=86):
    img.save(percorso, 'WEBP', quality=q, method=6)
    print(f'{percorso}: {img.size[0]}x{img.size[1]}, {os.path.getsize(percorso) // 1024} KB')


def main():
    cartella, mid = sys.argv[1], sys.argv[2]
    dest = os.path.join('public', 'assets', 'mappe', mid)
    os.makedirs(dest, exist_ok=True)

    t = apri(cartella, 'terreno')
    if t is not None:
        k = chiave(t)
        x0, x1, y0, y1 = riquadro(k)
        tela = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        pezzo = k.crop((x0, y0, x1, y1)).resize((GUIDA['x1'] - GUIDA['x0'], GUIDA['y1'] - GUIDA['y0']), Image.LANCZOS)
        tela.alpha_composite(pezzo, (GUIDA['x0'], GUIDA['y0']))
        a = np.asarray(tela).copy()
        a[..., 3] = np.where(a[..., 3] >= 128, 255, 0)   # alfa netto: pixel = maschera
        a[:160, :, 3] = 0
        a[:, :64, 3] = 0
        a[:, W - 64:, 3] = 0
        a[a[..., 3] == 0, :3] = 0
        tela = Image.fromarray(a, 'RGBA')
        tela.save(f'/tmp/claude-0/{mid}-terreno.png')
        salva(tela, os.path.join(dest, 'terreno.webp'), 90)

    c = apri(cartella, 'cielo')
    if c is not None:
        c = c.convert('RGB')
        salva(c.resize((2048, round(2048 * c.size[1] / c.size[0])), Image.LANCZOS), os.path.join(dest, 'cielo.webp'), 82)

    for nome, alto in (('lontano', 256), ('medio', 320)):
        s = apri(cartella, nome)
        if s is None:
            continue
        s = chiave(s)
        _, _, y0, y1 = riquadro(s)
        s = s.crop((0, y0, s.size[0], s.size[1]))
        # la striscia si ripete: accanto alla sua copia specchiata non si vede la cucitura (niente ritagli)
        doppia = Image.new('RGBA', (s.size[0] * 2, s.size[1]))
        doppia.paste(s, (0, 0)); doppia.paste(s.transpose(Image.FLIP_LEFT_RIGHT), (s.size[0], 0))
        s = doppia
        largo = round(alto * s.size[0] / s.size[1])
        if largo > 4096:   # i telefoni non caricano texture più larghe
            alto, largo = round(alto * 4096 / largo), 4096
        salva(s.resize((largo, alto), Image.LANCZOS), os.path.join(dest, nome + '.webp'))

    o = apri(cartella, 'oggetti')
    if o is not None:
        o = chiave(o)
        mw, mh = o.size[0] // 2, o.size[1] // 2
        for i, (nome, alto) in enumerate((('palma', 300), ('cespuglio', 96), ('masso', 88), ('rovina', 160))):
            q = o.crop(((i % 2) * mw, (i // 2) * mh, (i % 2 + 1) * mw, (i // 2 + 1) * mh))
            q = q.crop(riquadro(q)[0:1] + riquadro(q)[2:3] + riquadro(q)[1:2] + riquadro(q)[3:4])
            salva(q.resize((max(1, round(alto * q.size[0] / q.size[1])), alto), Image.LANCZOS), os.path.join(dest, nome + '.webp'))




def da_pittore(cartella, mid):
    """Grafica già allineata (scripts/mappe/dipingi): solo conversione in WebP."""
    dest = os.path.join('public', 'assets', 'mappe', mid)
    os.makedirs(dest, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(cartella, '*.png'))):
        nome = os.path.splitext(os.path.basename(f))[0]
        if 'anteprima' in nome:
            continue
        im = Image.open(f)
        if nome == 'cielo':
            im = im.convert('RGB')
        if nome == 'terreno':
            im.save(os.path.join(dest, 'terreno.webp'), 'WEBP', lossless=True, method=6)   # alfa e colori esatti: alfa = maschera
            print('terreno.webp', os.path.getsize(os.path.join(dest, 'terreno.webp')) // 1024, 'KB')
        else:
            salva(im, os.path.join(dest, nome + '.webp'), 86)


if __name__ == '__main__':
    if len(sys.argv) > 3 and sys.argv[3] == '--pittore':
        da_pittore(sys.argv[1], sys.argv[2])
    else:
        main()
