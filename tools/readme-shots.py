# Recadre les captures de tools/shots (npm start -- --farm-shots ...) pour le README : docs/img/*.png
# Usage : python tools/readme-shots.py [préfixe]   (préfixe ajouté aux noms, ex. « pets- »)
import os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'shots')
DST = os.path.join(ROOT, 'docs', 'img')
prefix = sys.argv[1] if len(sys.argv) > 1 else ''
os.makedirs(DST, exist_ok=True)


def content_box(im, pad=6):
    """Rectangle des pixels non transparents (la fenêtre est transparente autour du jeu)."""
    box = im.split()[-1].getbbox() if im.mode == 'RGBA' else im.getbbox()
    if not box:
        return (0, 0, im.width, im.height)
    l, t, r, b = box
    return (max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad))


for name in sorted(os.listdir(SRC)):
    if not name.endswith('.png'):
        continue
    im = Image.open(os.path.join(SRC, name)).convert('RGBA')
    crop = im.crop(content_box(im))
    # Fond sombre : la bande est transparente dans le jeu, illisible sur fond blanc (GitHub clair).
    bg = Image.new('RGBA', crop.size, (34, 40, 52, 255))
    bg.alpha_composite(crop)
    out = os.path.join(DST, prefix + name)
    bg.convert('RGB').save(out, optimize=True)
    print(out, bg.size)
