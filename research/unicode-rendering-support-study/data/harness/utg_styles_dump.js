#!/usr/bin/env node
'use strict';
// Dump every string UltraTextGen's style registry can emit for a probe alphabet.
// usage: node utg_styles_dump.js <path-to-public-repo> > styles_dump.json
// Loads the real styles.js and renderer.js (same idiom as renderer.case.test.js) so the dump cannot drift from shipped code.
const path = require('path');
const repo = process.argv[2];
global.window = global;
global.document = { documentElement: { lang: 'en' } };
require(path.join(repo, 'styles.js'));
require(path.join(repo, 'renderer.js'));
const render = window.UltraTextGenRender.renderAny;
const styles = window.textStyles;
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const PUNCT = ' .,!?-_@#&()[]:;\'"/+=*%$';
const out = {};
let errors = 0;
for (const [name, st] of Object.entries(styles)) {
  const outs = new Set();
  const tries = [...ALPHA, ...PUNCT, 'Hello World', 'The quick brown fox 123', 'UltraTextGen'];
  for (const t of tries) {
    try { const r = render(t, st); if (typeof r === 'string') outs.add(r); } catch (e) { errors++; }
  }
  out[name] = { type: st.type, familySlug: st.familySlug || null, slug: st.slug || null, outputs: [...outs] };
}
process.stdout.write(JSON.stringify({ n_styles: Object.keys(styles).length, errors, styles: out }));
