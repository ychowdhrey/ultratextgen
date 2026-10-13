#!/usr/bin/env python3
"""Calibrate UltraTextGen's shipped device glyph probe (script.js deviceRendersGlyph) against this study's measured rendering.
The probe's JS is extracted VERBATIM from the public repo at the pinned commit (lines between 'const glyphSupportCache' and the end of deviceRendersGlyph) and executed in
the same Chromium/font conditions on every Dataset-1 code point and every UTG-inventory code point. Variants change only the 'tofu' reference.
Ground truth = this study's DOM rendering classification (as_intended). Note the probe draws on a canvas with '18px sans-serif' (not the study's CSS stacks);
disagreement therefore includes that difference, which is why emoji code points are tabulated separately."""
import sys, os, re, json, gzip, csv, subprocess
import pandas as pd
from playwright.sync_api import sync_playwright
import render_harness as H
from conditions import *
REPO = sys.argv[1] if len(sys.argv) > 1 else '/home/user/ultratextgen'
src = open(f'{REPO}/script.js', encoding='utf-8').read()
a = src.index('const glyphSupportCache = {};'); b = src.index('// A representative converted character for a style')
probe_js = src[a:b]
sha = subprocess.run(['git', '-C', REPO, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
JS = '(() => {' + probe_js + '''
  const out = {};
  const refs = { shipped: '\\u{E01ED}', u0378: '\\u0378', uFFFF: '\\uFFFF' };
  const ctxc = (() => { const c = document.createElement('canvas'); c.width = c.height = 24; return c.getContext('2d', { willReadFrequently: true }); })();
  const draw = (c) => { ctxc.clearRect(0, 0, 24, 24); ctxc.font = '18px sans-serif'; ctxc.fillText(c, 2, 18); return ctxc.getImageData(0, 0, 24, 24).data.join(','); };
  const blank = draw('');
  const refDraw = { u0378: draw(refs.u0378), uFFFF: draw(refs.uFFFF), shipped: draw(refs.shipped) };
  window.__probe = (cps) => cps.map(cp => {
    const ch = String.fromCodePoint(cp); const d = draw(ch);
    return [deviceRendersGlyph(ch) ? 1 : 0,              // shipped probe, executed verbatim
            (d !== refDraw.u0378) ? 1 : 0,               // V1: reference U+0378 (unassigned, not default-ignorable)
            (d !== refDraw.u0378 && d !== refDraw.uFFFF && d !== blank) ? 1 : 0];   // V2: two unassigned references + blank
  });
  window.__refs = { blankInk: blank.split(',').some(x => x !== '0'), shipped_is_blank: refDraw.shipped === blank };
})();''' 
ground = {}
CONDS = ['A_stock', 'A_minimal', 'A_distro', 'B_noto']; CH = 'c155'
def gt(cond):
    rows = {}
    for run in (f'{cond}__codepoints__{CH}', f'{cond}__utgcp__{CH}'):
        d = pd.read_csv(f'{ROOT}/results/classified/{run}.csv.gz', dtype=str, keep_default_na=False); d = d[d.item_kind == 'codepoint']
        for r in d.itertuples():
            if r.render_class in ('INVISIBLE_OK', 'UNKNOWN') or r.combining == '1': continue      # combining marks need a base; the probe draws them alone
            rows[int(r.item_id[2:], 16)] = (r.render_class in ('MONO_GLYPH', 'COLOR_EMOJI'), r.emoji == '1' if hasattr(r, 'emoji') else False)
    return rows
res = []
with sync_playwright() as pw:
    for cond in CONDS:
        c = condition(cond); env = dict(os.environ); env['LANG'] = 'en_US.UTF-8'; env['LC_ALL'] = 'C.UTF-8'
        if c['fc_file']: env['FONTCONFIG_FILE'] = c['fc_file']
        br = pw.chromium.launch(executable_path=H.CHROME, args=H.FLAGS, env=env, headless=True); pg = br.new_context(viewport={'width': 400, 'height': 300}).new_page(); pg.set_content('<html></html>')
        pg.evaluate(JS); info = pg.evaluate('window.__refs')
        truth = gt(cond); cps = sorted(truth)
        out = []
        for i in range(0, len(cps), 4000): out += pg.evaluate('(c) => window.__probe(c)', cps[i:i + 4000])
        br.close()
        for cp, (p0, p1, p2) in zip(cps, out):
            ok, emo = truth[cp]
            for name, v in (('shipped', p0), ('ref_U+0378', p1), ('ref_U+0378+U+FFFF+blank', p2)):
                res.append(dict(condition=cond, variant=name, cp=cp, truly_supported=int(ok), probe_says_supported=v, emoji=int(emo)))
        print(cond, info, len(cps), flush=True)
df = pd.DataFrame(res); df.to_csv(f'{ROOT}/data/derived/probe_calibration_long.csv.gz', index=False)
rows = []
for (cond, var), g in df.groupby(['condition', 'variant']):
    for scope, x in (('all', g), ('non_emoji', g[g.emoji == 0])):
        tn = int(((x.truly_supported == 0) & (x.probe_says_supported == 0)).sum()); fp = int(((x.truly_supported == 0) & (x.probe_says_supported == 1)).sum())
        fn = int(((x.truly_supported == 1) & (x.probe_says_supported == 0)).sum()); tp = int(((x.truly_supported == 1) & (x.probe_says_supported == 1)).sum())
        rows.append(dict(condition=cond, variant=var, scope=scope, n=len(x), truly_unsupported=tn + fp, flagged_unsupported_correctly=tn, missed_unsupported=fp, pct_unsupported_detected=round(100 * tn / (tn + fp), 2) if tn + fp else '',
                         truly_supported=tp + fn, falsely_flagged_unsupported=fn, pct_false_alarm=round(100 * fn / (tp + fn), 2) if tp + fn else ''))
out = pd.DataFrame(rows); out['public_repo_commit'] = sha; out.to_csv(f'{ROOT}/results/tables/utg_probe_calibration.csv', index=False)
print(out[out.scope == 'non_emoji'].to_string())
