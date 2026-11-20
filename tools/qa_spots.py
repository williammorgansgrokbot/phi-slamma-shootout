#!/usr/bin/env python3
"""Screenshot each of the 5 rack spots (camera + court alignment check)."""
import sys, time, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
D = Path(__file__).resolve().parent.parent
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8785', '--bind', '127.0.0.1'], cwd=D, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(.6)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chrome', args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2)
        pg.goto('http://127.0.0.1:8785/index.html'); pg.wait_for_timeout(1500)
        pg.click('[data-mode=solo]'); pg.wait_for_timeout(300); pg.click('.card[data-char=hakeem]'); pg.wait_for_timeout(900)
        for i in range(5):
            pg.evaluate(f'__game.S.rack={i}; __game.S.moveT=-0.001; __game.S.moveFrom={max(0,i-1)}'); pg.wait_for_timeout(500)
            pg.screenshot(path=str(D / f'shots/spot_{i}.png'))
        b.close()
finally:
    srv.terminate()
