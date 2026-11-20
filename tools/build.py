#!/usr/bin/env python3
"""Build a standalone index.html (Three.js r160 + game + PNG/JPEG assets inlined as base64)."""
import base64, os, re, json
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
ART = D + 'art/'
NEED = ['logo.png', 'arena_wide.jpg', 'arena_back.jpg', 'court.jpg', 'planks.jpg', 'hoop_full.png', 'hoop_front.png',
        'ball.png', 'moneyball.png', 'stanchion.png'] + ['%s_%s.png' % (c, p) for c in ('hakeem', 'clyde') for p in ('ready', 'set', 'shoot', 'follow', 'cheer')]
A = {}
for n in NEED:
    src = D + 'art_web/' + n if os.path.exists(D + 'art_web/' + n) else ART + n
    A[n] = 'data:%s;base64,' % ('image/jpeg' if n.endswith('.jpg') else 'image/png') + base64.b64encode(open(src, 'rb').read()).decode()
css = open(D + 'src/style.css').read(); html = open(D + 'src/template.html').read()
three = open(D + 'vendor/three.module.min.js').read()
m = re.search(r'export\{([^}]*)\};?\s*$', three); assert m
pairs = []
for part in m.group(1).split(','):
    a = part.strip().split(' as ')
    pairs.append('%s:%s' % ((a[1].strip() if len(a) > 1 else a[0].strip()), a[0].strip()))
three_js = 'const THREE=(()=>{"use strict";' + three[:m.start()] + ';return Object.freeze({' + ','.join(pairs) + '});})();'
game = '\n'.join(open(D + 'src/%s.js' % n).read() for n in ['00_util', '10_audio', '20_input', '30_game'])
body = ('(function(){"use strict";\n' + three_js + '\n' + game + '\n})();').replace('</script', '<\\/script')
html = html.replace('/*CSS*/', css).replace('<script>/*SCRIPT*/</script>', '<script>window.__ASSETS=' + json.dumps(A) + ';</script>\n<script>\n' + body + '\n</script>')
open(D + 'index.html', 'w').write(html)
print('index.html', round(os.path.getsize(D + 'index.html') / 1e6, 2), 'MB')
