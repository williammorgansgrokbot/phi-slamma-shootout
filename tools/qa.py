#!/usr/bin/env python3
import sys, time, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
D = Path(__file__).resolve().parent.parent; SH = D / 'shots'; SH.mkdir(exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8781', '--bind', '127.0.0.1'], cwd=D, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
SIZES = [(844, 390), (932, 430), (667, 375)]
engines = sys.argv[1:] or ['chromium']
errs = []
try:
    with sync_playwright() as p:
        for eng in engines:
            bt = getattr(p, eng)
            b = bt.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] if eng == 'chromium' else [])
            for w, h in SIZES:
                tag = f'{eng}_{w}x{h}'
                ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if w == 844 else 1, has_touch=True)
                pg = ctx.new_page()
                pg.on('console', lambda m, tag=tag: m.type == 'error' and errs.append(tag + ' console: ' + m.text))
                pg.on('pageerror', lambda e, tag=tag: errs.append(tag + ' page: ' + str(e)))
                pg.goto('http://127.0.0.1:8781/index.html'); pg.wait_for_timeout(2500)
                pg.screenshot(path=str(SH / f'{tag}_1_title.png'))
                pg.click('[data-mode=cpu]'); pg.wait_for_timeout(500)
                pg.screenshot(path=str(SH / f'{tag}_2_select.png'))
                pg.click('.card[data-char=hakeem]'); pg.wait_for_timeout(1200)
                # take a few shots: hold Space for ~0.74s (around sweet spot)
                for i in range(7):
                    pg.keyboard.down('Space'); pg.wait_for_timeout(560 if i == 1 else 740); 
                    if i == 2: pg.screenshot(path=str(SH / f'{tag}_3_charge.png'))
                    pg.keyboard.up('Space'); pg.wait_for_timeout(650 if i != 3 else 300)
                    if i == 3: pg.screenshot(path=str(SH / f'{tag}_4_flight.png')); pg.wait_for_timeout(400)
                pg.wait_for_timeout(900)
                pg.screenshot(path=str(SH / f'{tag}_5_rack2.png'))
                st = pg.evaluate('({score: __game.S.score, rack: __game.S.rack, ball: __game.S.ball, shots: __game.S.shots.length, time: __game.S.time})')
                print(tag, st)
                # fast-forward: end the human round, then skip CPU
                pg.evaluate('__game.S.time = 0.05'); pg.wait_for_timeout(2600)
                pg.screenshot(path=str(SH / f'{tag}_6_cpu.png'))
                pg.wait_for_timeout(1500)
                pg.click('#btnSkip'); pg.wait_for_timeout(2400)
                pg.screenshot(path=str(SH / f'{tag}_7_results.png'))
                ctx.close()
            b.close()
finally:
    srv.terminate()
print('ERRORS:', len(errs)); [print(' ', e) for e in errs[:20]]
