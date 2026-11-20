#!/usr/bin/env python3
"""Shoot all 25 balls in solo mode by holding Space; confirm the round ends on the last rack."""
import sys, time, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
D = Path(__file__).resolve().parent.parent
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8784', '--bind', '127.0.0.1'], cwd=D, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(.6)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chrome', args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': 844, 'height': 390})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://127.0.0.1:8784/index.html'); pg.wait_for_timeout(1500)
        pg.click('[data-mode=solo]'); pg.wait_for_timeout(300); pg.click('.card[data-char=clyde]'); pg.wait_for_timeout(900)
        t0 = time.time()
        while pg.evaluate('__game.S.screen') == 'play' and time.time() - t0 < 90:
            pg.keyboard.down('Space'); pg.wait_for_timeout(740); pg.keyboard.up('Space'); pg.wait_for_timeout(420)
            if pg.evaluate('__game.S.rack') == 2 and pg.evaluate('__game.S.ball') == 0: pg.screenshot(path=str(D / 'shots/full_rack3.png'))
        st = pg.evaluate('({screen:__game.S.screen, shots:__game.S.shots.length, score:__game.S.players[0].score, time:__game.S.time})')
        print(st, 'wall', round(time.time() - t0, 1), 'errs', errs)
        pg.screenshot(path=str(D / 'shots/full_results.png'))
        b.close()
finally:
    srv.terminate()
