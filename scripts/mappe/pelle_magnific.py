#!/usr/bin/env python3
"""Pelle del terreno da Magnific: i colori vengono dalle due metà ridipinte dall'AI, la forma resta quella della maschera.

  python3 -I scripts/mappe/pelle_magnific.py <dipinto.png> <sinistra.png> <destra.png> <uscita.png> [--prologo]

<dipinto.png> è il terreno del pittore (2048×1024, alfa = maschera, grotte ad alfa 110). Le due metà sono le
uscite di Magnific dalle guide in scripts/mappe/guide (stessa inquadratura: x 40-1060 e 988-2008, y 235-1000,
verde #00FF00 = vuoto). Dove l'AI ha dipinto terreno si usano i suoi colori; dove non c'è (bordi spostati di
qualche pixel) resta il pittore. L'alfa non cambia mai, così la maschera di gioco resta identica.
Con --prologo la spiaggia sinistra (molo) e il gradino restano del pittore: l'AI ha dipinto il relitto.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

PEZZI = {'sinistra': (40, 1060), 'destra': (988, 2008)}
Y0, Y1 = 235, 1000


def verde(img):
    a = np.asarray(img.convert('RGB')).astype(np.float32)
    v = a[..., 1] - np.maximum(a[..., 0], a[..., 2])
    return np.clip(1 - (v - 40) / 70, 0, 1)   # 1 = terreno dipinto


def main():
    dip, sx, dx, out = sys.argv[1:5]
    prologo = '--prologo' in sys.argv
    base = np.asarray(Image.open(dip).convert('RGBA')).astype(np.float32)
    H, W = base.shape[:2]
    col = np.zeros((H, W, 3), np.float32)
    peso = np.zeros((H, W), np.float32)
    for nome, f in (('sinistra', sx), ('destra', dx)):
        x0, x1 = PEZZI[nome]
        im = Image.open(f).convert('RGB').resize((x1 - x0, Y1 - Y0), Image.LANCZOS)
        a = verde(im)
        # dissolvenza nella zona in comune al centro (988-1060)
        rampa = np.ones(x1 - x0, np.float32)
        if nome == 'sinistra':
            rampa[-72:] = np.linspace(1, 0, 72)
        else:
            rampa[:72] = np.linspace(0, 1, 72)
        w = a * rampa[None, :]
        col[Y0:Y1, x0:x1] += np.asarray(im).astype(np.float32) * w[..., None]
        peso[Y0:Y1, x0:x1] += w
    ok = peso > 0.05
    ai = np.where(ok[..., None], col / np.maximum(peso, 1e-3)[..., None], 0)
    # quanto fidarsi dell'AI: pieno dentro, sfumato vicino al bordo del suo terreno (niente aloni verdi)
    fid = Image.fromarray((np.clip(peso, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(2))
    fid = np.asarray(fid).astype(np.float32) / 255
    if prologo:
        fid[:, :250] = 0
        fid[780:850, 330:430] = 0
    alfa = base[..., 3]
    solido = alfa >= 128
    fid = np.where(solido, fid, 0)   # grotte e aria: restano del pittore
    rgb = base[..., :3] * (1 - fid[..., None]) + ai * fid[..., None]
    res = np.dstack([rgb, alfa]).clip(0, 255).astype(np.uint8)
    Image.fromarray(res, 'RGBA').save(out)
    print(f'{out}: pelle AI su {(fid > 0.5).sum() / max(1, solido.sum()) * 100:.0f}% del terreno')


if __name__ == '__main__':
    main()
