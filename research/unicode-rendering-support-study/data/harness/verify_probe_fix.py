#!/usr/bin/env python3
"""Verify a change to script.js's glyph probe: run the OLD (git HEAD) and NEW (working tree) deviceRendersGlyph + sampleGlyph, verbatim, against every style in styles.js,
in the four font conditions, and compare with this study's DOM ground truth for each style's sample glyph.
usage: verify_probe_fix.py <public repo>"""
import sys, os, json, subprocess, re
import pandas as pd
from playwright.sync_api import sync_playwright
import render_harness as H
from conditions import *
REPO = sys.argv[1]
def extract(src):
    a = src.index('const glyphSupportCache = {};'); b = src.index('/* ===================\n     SAFE MODE (F2)')
    return src[a:b]
new_js = extract(open(f'{REPO}/script.js', encoding='utf-8').read())
old_js = extract(subprocess.run(['git', '-C', REPO, 'show', 'HEAD:script.js'], capture_output=True, text=True).stdout)
styles = json.loads(subprocess.run(['node', '-e', "global.window=global;require('%s/styles.js');const o={};for(const [n,s] of Object.entries(window.textStyles))o[n]={upper:s.upper,lower:s.lower,nums:s.nums};process.stdout.write(JSON.stringify(o))" % REPO], capture_output=True, text=True).stdout)
def build(js, tag):
    return '(() => {' + js.replace('function deviceRendersGlyph', f'function deviceRendersGlyph_{tag}').replace('function sampleGlyph', f'function sampleGlyph_{tag}').replace('glyphSupportCache', f'glyphSupportCache_{tag}').replace('glyphCtx', f'glyphCtx_{tag}').replace('deviceRendersGlyph(', f'deviceRendersGlyph_{tag}(') + f'''
  window.__{tag} = (styles) => Object.entries(styles).map(([n, s]) => {{ const g = sampleGlyph_{tag}(s); return [n, g, g ? (deviceRendersGlyph_{tag}(g) ? 1 : 0) : null]; }});
}})();'''
def gt(cond, cp):
    for run in (f'{cond}__codepoints__c155', f'{cond}__utgcp__c155'):
        d = pd.read_csv(f'{ROOT}/results/classified/{run}.csv.gz', dtype=str, keep_default_na=False)
        r = d[(d.item_id == f'U+{cp:04X}') & (d.item_kind == 'codepoint')]
        if len(r): return r.iloc[0].render_class in ('MONO_GLYPH', 'COLOR_EMOJI')
    return None
rows = []
with sync_playwright() as pw:
    for cond in ['A_stock', 'A_minimal', 'A_distro', 'B_noto']:
        c = condition(cond); env = dict(os.environ); env['LANG'] = 'en_US.UTF-8'; env['LC_ALL'] = 'C.UTF-8'
        if c['fc_file']: env['FONTCONFIG_FILE'] = c['fc_file']
        br = pw.chromium.launch(executable_path=H.CHROME, args=H.FLAGS, env=env, headless=True); pg = br.new_context().new_page(); pg.set_content('<html></html>')
        pg.evaluate(build(old_js, 'old')); pg.evaluate(build(new_js, 'new'))
        old = {n: (g, v) for n, g, v in pg.evaluate('(s) => window.__old(s)', styles)}; new = {n: (g, v) for n, g, v in pg.evaluate('(s) => window.__new(s)', styles)}
        br.close()
        for n in styles:
            go, vo = old[n]; gn, vn = new[n]
            truth = gt(cond, ord(gn)) if gn else None
            rows.append(dict(condition=cond, style=n, old_sample=f'U+{ord(go[0]):04X}' if go else '', old_probe=vo, new_sample=f'U+{ord(gn):04X}' if gn else '', new_probe=vn, truly_supported=truth))
df = pd.DataFrame(rows); df.to_csv(f'{ROOT}/results/tables/probe_fix_verification.csv', index=False)
for cond, g in df.groupby('condition'):
    p = g[g.new_sample != '']; lone = int(g.old_sample.eq('U+D835').sum())
    print(cond, 'styles probed(new)', len(p), '| old probe says unsupported:', int((g.old_probe == 0).sum()), '| old samples that were lone surrogates:', lone,
          '| new probe says unsupported:', int((p.new_probe == 0).sum()), '| truly unsupported sample glyphs:', int((p.truly_supported == False).sum()),
          '| new probe wrong:', int(((p.new_probe == 1) != (p.truly_supported == True))[p.truly_supported.notna()].sum()))
