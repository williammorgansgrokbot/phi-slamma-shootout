#!/usr/bin/env python3
"""Shrink art/ into art_web/ for the single-file build (quantized PNG, lighter JPEG)."""
import os
from PIL import Image
os.makedirs('art_web', exist_ok=True)
for n in os.listdir('art'):
    im = Image.open('art/' + n)
    if n.endswith('.jpg'):
        if n == 'arena_back.jpg': im = im.resize((1536, 864), Image.LANCZOS)
        im.save('art_web/' + n, quality=80, optimize=True, progressive=True); continue
    if n.startswith(('hakeem', 'clyde')): im = im.resize((round(im.width * 600 / im.height), 600), Image.LANCZOS)
    if n.startswith('hoop'): im = im.resize((im.width * 3 // 4, im.height * 3 // 4), Image.LANCZOS)
    if n == 'logo.png': im = im.resize((800, round(im.height * 800 / im.width)), Image.LANCZOS)
    q = im.convert('RGBA').quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    q.save('art_web/' + n, optimize=True)
