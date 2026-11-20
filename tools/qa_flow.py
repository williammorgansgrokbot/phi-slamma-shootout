#!/usr/bin/env python3
"""Pass-and-play flow with pointer holds on the SHOOT button + portrait rotate check."""
import sys, time, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
D = Path(__file__).resolve().parent.parent; SH = D / 'shots'
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8783', '--bind', '127.0.0.1'], cwd=D, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(.6)
errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2, has_touch=True)
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        pg.goto('http://127.0.0.1:8783/index.html'); pg.wait_for_timeout(1800)
        pg.click('[data-mode=pass]'); pg.wait_for_timeout(300)
        pg.click('.card[data-char=hakeem]'); pg.wait_for_timeout(200); pg.click('.card[data-char=clyde]'); pg.wait_for_timeout(1000)
        bb = pg.locator('#btnShoot').bounding_box(); x, y = bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2
        for i in range(6):
            pg.mouse.move(x, y); pg.mouse.down(); pg.wait_for_timeout(745); pg.mouse.up(); pg.wait_for_timeout(700)
        print('P1 after 6', pg.evaluate('({s:__game.S.score, n:__game.S.shots.length})'))
        pg.evaluate('__game.S.time=0.05'); pg.wait_for_timeout(2400)
        pg.screenshot(path=str(SH / 'flow_handoff.png'))
        pg.click('#hoGo'); pg.wait_for_timeout(800)
        for i in range(3):
            pg.mouse.move(x, y); pg.mouse.down(); pg.wait_for_timeout(745); pg.mouse.up(); pg.wait_for_timeout(700)
        print('P2 after 3', pg.evaluate('({s:__game.S.score, n:__game.S.shots.length, who:__game.S.cur.label})'))
        pg.evaluate('__game.S.time=0.05'); pg.wait_for_timeout(2400)
        pg.screenshot(path=str(SH / 'flow_results.png'))
        print('screen', pg.evaluate('__game.S.screen'))
        pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(400); pg.screenshot(path=str(SH / 'flow_portrait.png'))
        b.close()
finally:
    srv.terminate()
print('ERRORS', errs)
