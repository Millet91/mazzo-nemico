"""Guida di sagoma (Fase 2): quanto il terreno HD si vede più grande della maschera che si colpisce.

    python3 scripts/mappe/guida-sagoma.py <materiali.png della mappa> <cartella hd> [px di mondo, predefinito 3]

Rimonta le tessere, prende i pixel visibili (alfa >= 128, la parete delle grotte ad alfa 110 non conta) e misura la
distanza dalla maschera (canale alfa della PNG dei materiali, ingrandita a 2x). Esce con errore se un pixel visibile
sta oltre il limite. Il contrario (maschera senza disegno) lo controlla già costruisci-v3.ts sul quadro.
"""
import json, os, sys
import numpy as np
from PIL import Image

materiali, cartella = sys.argv[1], sys.argv[2]
limite = float(sys.argv[3]) if len(sys.argv) > 3 else 3
m = np.asarray(Image.open(materiali).convert('RGBA'))[..., 3] >= 128
m2 = np.repeat(np.repeat(m, 2, 0), 2, 1)
indice = json.load(open(os.path.join(cartella, 'indice.json')))
lato, bordo = indice['lato'], indice['bordo']
vis = np.zeros(m2.shape, bool)
nomi = list(indice['tessere'])
if indice.get('base'):
    base = os.path.join(os.path.dirname(cartella.rstrip('/')), indice['base'])
    nomi = [(os.path.join(base, n)) for n in json.load(open(os.path.join(base, 'indice.json')))['tessere'] if n not in nomi] + [os.path.join(cartella, n) for n in nomi]
else:
    nomi = [os.path.join(cartella, n) for n in nomi]
for f in nomi:
    c, r = map(int, os.path.basename(f)[2:].split('-'))
    a = np.asarray(Image.open(f + '.webp').convert('RGBA'))[bordo:bordo + lato, bordo:bordo + lato, 3]
    vis[r * lato:(r + 1) * lato, c * lato:(c + 1) * lato] = a >= 128
# distanza (in px HD, a passi di 8 vicini) di ogni pixel visibile dalla maschera
dil, passi, fuori = m2.copy(), 0, vis & ~m2
peggio = 0
while fuori.any() and passi < 40:
    passi += 1
    p = np.pad(dil, 1)
    dil = dil | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:] | p[:-2, :-2] | p[:-2, 2:] | p[2:, :-2] | p[2:, 2:]
    if (fuori & dil).any(): peggio = passi
    fuori = fuori & ~dil
print(f'{cartella}: il disegno sborda al massimo {peggio / 2} px di mondo oltre la maschera (limite {limite})')
if peggio / 2 > limite or fuori.any():
    sys.exit(1)
