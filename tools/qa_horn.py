#!/usr/bin/env python3
"""Fixed hoop + shooter walking the horn + random sweet spot. Shoots a full solo round aiming at each
throw's sweet spot, screenshots mid-charge at racks 1/3/5 and during a walk, logs sweet-spot centres."""
import sys, time, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
D = Path(__file__).resolve().parent.parent; SH = D / 'shots'
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8786', '--bind', '127.0.0.1'], cwd=D, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(.6)
errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chrome', args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2)
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        pg.goto('http://127.0.0.1:8786/index.html'); pg.wait_for_timeout(1500)
        pg.click('[data-mode=solo]'); pg.wait_for_timeout(300); pg.click('.card[data-char=clyde]'); pg.wait_for_timeout(900)
        sweets = []; walked = False; t0 = time.time()
        while pg.evaluate('__game.S.screen') == 'play' and time.time() - t0 < 120:
            st = pg.evaluate('({ph:__game.S.phase, r:__game.S.rack, b:__game.S.ball, c:__game.S.sweetC, w:__game.S.sweetW, mv:__game.S.moveT, rel:__game.S.reloadT})')
            if st['mv'] < -0.3 and not walked:
                pg.screenshot(path=str(SH / 'horn_walk.png')); walked = True
            if st['ph'] != 'ready' or st['mv'] != 0 or st['rel'] > 0 or st['r'] >= 5:
                pg.wait_for_timeout(60); continue
            sweets.append((st['r'], st['b'], round(st['c'], 3), round(st['w'], 3)))
            pg.keyboard.down('Space')
            # wait until the meter reaches the sweet spot centre, measured in game time
            snap = st['b'] == 2 and st['r'] in (0, 2, 4)
            while True:
                h = pg.evaluate('__game.S.holdT / 0.95')
                if snap and h > st['c'] - 0.12:
                    pg.screenshot(path=str(SH / f"horn_rack{st['r']+1}_meter.png")); snap = False
                if h >= st['c'] - 0.02 or pg.evaluate('__game.S.phase') != 'charge' and h > 0.05: break
                pg.wait_for_timeout(8)
            pg.keyboard.up('Space'); pg.wait_for_timeout(120)
        print(pg.evaluate('__game.S.shots.map(s=>[s.c,s.v,s.made])'))
        res = pg.evaluate('({screen:__game.S.screen, shots:__game.S.shots.length, made:__game.S.shots.filter(s=>s.made).length, score:__game.S.players[0].score})')
        print(res); print('sweet centres:', sweets)
        pg.screenshot(path=str(SH / 'horn_results.png'))
        b.close()
finally:
    srv.terminate()
print('ERRORS', errs)
