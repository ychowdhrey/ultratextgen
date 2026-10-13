import sys, os
from playwright.sync_api import sync_playwright
import render_harness as H
from conditions import *
url = sys.argv[1]
with sync_playwright() as pw:
    for cond in ['A_minimal', 'A_distro', 'B_noto']:
        c = condition(cond); env = dict(os.environ); env['LANG'] = 'en_US.UTF-8'; env['LC_ALL'] = 'C.UTF-8'
        if c['fc_file']: env['FONTCONFIG_FILE'] = c['fc_file']
        br = pw.chromium.launch(executable_path=H.CHROME, args=H.FLAGS, env=env, headless=True); pg = br.new_context(viewport={'width': 1200, 'height': 900}).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(url, wait_until='load', timeout=60000); pg.wait_for_timeout(2500)
        n_cards = pg.evaluate("document.querySelectorAll('.ts-pill').length")
        warn = pg.evaluate("Array.from(document.querySelectorAll('.ts-pill-risk')).filter(e=>/device/i.test(e.textContent)).map(e=>{const card=e.closest('[data-style],.style-card,.card,li,div');return (card?card.textContent.trim().slice(0,40):'')})")
        print(cond, 'pills', n_cards, 'device warnings', len(warn), warn[:4], 'page errors', errs[:2])
        br.close()
