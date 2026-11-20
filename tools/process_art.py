#!/usr/bin/env python3
"""Chroma-key painted raws in art_src/ -> art/ PNG/JPEG (run from repo root)."""
import sys, numpy as np
from PIL import Image
sys.path.insert(0, 'tools')
from key import key
S, O = 'art_src/', 'art/'

def split_cols(im, n):
    a = np.asarray(im)[..., 3] > 40
    col = a.sum(0); W = len(col)
    empty = col < 2
    # find runs of non-empty columns
    runs = []; x = 0
    while x < W:
        if not empty[x]:
            s = x
            while x < W and not empty[x]: x += 1
            runs.append([s, x])
        x += 1
    # merge tiny runs into neighbours until n remain
    while len(runs) > n:
        gaps = [runs[i+1][0] - runs[i][1] for i in range(len(runs)-1)]
        i = int(np.argmin(gaps)); runs[i] = [runs[i][0], runs[i+1][1]]; del runs[i+1]
    return [im.crop((s, 0, e, im.height)) for s, e in runs]

def fit(im, h=None, w=None):
    im = im.crop(im.getbbox())
    if h: im = im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)
    elif w: im = im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)
    return im

for who in ['hakeem', 'clyde']:
    k = key(S + who + '_sheet_raw.jpg', hole_min=20)
    parts = split_cols(k, 3)
    for name, p in zip(['ready', 'shoot', 'cheer'], parts):
        im = fit(p, h=720); im.save(O + '%s_%s.png' % (who, name), optimize=True); print(who, name, im.size)

for n, w in [('logo', 1000), ('crest', 560), ('hoop', 640), ('rack', 700)]:
    im = fit(key(S + n + '_raw.jpg', hole_min=20), w=w); im.save(O + n + '.png', optimize=True); print(n, im.size)
balls = split_cols(key(S + 'balls_raw.jpg'), 2)
for name, p in zip(['ball', 'moneyball'], balls):
    im = fit(p, w=160); im.save(O + name + '.png', optimize=True); print(name, im.size)
Image.open(S + 'arena_back_raw.jpg').convert('RGB').save(O + 'arena_back.jpg', quality=86)
Image.open(S + 'court_raw.jpg').convert('RGB').resize((1024, 1024), Image.LANCZOS).save(O + 'court.jpg', quality=86)
Image.open(S + 'arena_wide_raw.jpg').convert('RGB').save(O + 'arena_wide.jpg', quality=84)
for who in ['hakeem', 'clyde']:
    parts = split_cols(key(S + who + '_back_raw.jpg', hole_min=20), 2)
    for name, p in zip(['set', 'follow'], parts):
        im = fit(p, h=720); im.save(O + '%s_%s.png' % (who, name), optimize=True); print(who, name, im.size)
# hoop: crop away the side arm, then key; layers: back (full) and front (rim front half + net)
hk = key(S + 'hoop_crop.jpg', hole_min=20)
print('hoop bbox', hk.getbbox(), hk.size)
hk.save(O + 'hoop_full.png', optimize=True)
a = np.array(hk); a[425:, 442:, 3] = 0; a[:, 616:, 3] = 0
hk = Image.fromarray(a)
rgb = a[..., :3].astype(int); orange = (rgb[..., 0] > 170) & (rgb[..., 1] < 120) & (rgb[..., 2] < 90) & (a[..., 3] > 200)
ys, xs = np.nonzero(orange[300:450]); ys = ys + 300
print('rim px x', xs.min(), xs.max(), 'y', ys.min(), ys.max())
hk = hk.crop(hk.getbbox()); print('hoop final', hk.size, 'offset', Image.fromarray(a).getbbox())
hk.save(O + 'hoop_full.png', optimize=True)
# front layer = everything below the rim centre line (front rim + net) so the ball can drop "inside" the net
fr = hk.copy(); fa = np.array(fr); fa[:368, :, 3] = 0; Image.fromarray(fa).save(O + 'hoop_front.png', optimize=True)
# plain plank tile for the floor around the court
Image.open(O + 'court.jpg').crop((20, 730, 300, 960)).save(O + 'planks.jpg', quality=88)
st = fit(key(S + 'stanchion_raw.jpg', hole_min=20), h=700); st.save(O + 'stanchion.png', optimize=True); print('stanchion', st.size)
