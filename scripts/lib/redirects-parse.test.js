#!/usr/bin/env node
'use strict';

/**
 * redirects-parse.test.js — the runtime-loop rule, on in-memory rule sets.
 *
 * htmlRewriteLoops() flags a 200 rewrite that Cloudflare's parser accepts and
 * the Pages runtime turns into an endless 308. The first case is the real rule
 * that looped in production from 2026-05-03 to 2026-11-15 (`/404  /404.html
 * 200`); the rest are a second shape of the same defect and the controls that
 * must not fire, including the Petal verification rewrite that has to stay.
 *
 * The end-to-end gate is proven too: check-redirects.js is run against a probe
 * copy of the real _redirects with the old rule put back, and must exit 1.
 *
 *   node scripts/lib/redirects-parse.test.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { parseRedirects, htmlRewriteLoops } = require('./redirects-parse.js');

let pass = 0;
const fails = [];
function eq(label, got, want) {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else fails.push(`${label} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`);
}
const loops = (text) => htmlRewriteLoops(parseRedirects(text).rules).map((l) => l.from);

// ── the defect ─────────────────────────────────────────────────────────────
eq('the production rule: /404 -> /404.html 200 loops', loops('/404  /404.html  200'), ['/404']);
eq('the parser still accepts it, which is why this check exists',
  parseRedirects('/404  /404.html  200').invalid.length, 0);
eq('same shape on another file', loops('/about  /about.html  200'), ['/about']);
eq('a nested path loops the same way', loops('/guide/x  /guide/x.html  200'), ['/guide/x']);

// ── controls: must not fire ────────────────────────────────────────────────
eq('verification rewrite to a .txt (Pages serves .txt as-is)', loops('/ff044916b7.html  /ff044916b7.txt  200'), []);
eq('a 301 to an .html target is a redirect, not a rewrite', loops('/old  /old.html  301'), []);
eq('a rewrite to a different page does not normalise back', loops('/a  /b.html  200'), []);
eq('`/  /index.html  200` is rejected by the parser, so it is not a live rule here',
  loops('/  /index.html  200'), []);
eq('splat rewrites are out of scope', loops('/x/*  /x/:splat.html  200'), []);

// ── the gate, end to end, on the real file ─────────────────────────────────
{
  const repo = path.join(__dirname, '..', '..');
  const real = fs.readFileSync(path.join(repo, '_redirects'), 'utf8');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'redirects-probe-'));
  const probe = path.join(dir, '_redirects');
  const gate = (text) => {
    fs.writeFileSync(probe, text);
    return spawnSync(process.execPath, [path.join(repo, 'scripts', 'check-redirects.js'), '--file', probe, '--root', repo], { encoding: 'utf8' });
  };
  // The loop rule goes above the splat block, where it stood in production.
  const broken = real.replace('/cdn-cgi/*  /contact/ 301', '/404  /404.html  200\n\n/cdn-cgi/*  /contact/ 301');
  eq('probe actually carries the loop rule', broken.includes('/404  /404.html  200'), true);
  const red = gate(broken);
  eq('check-redirects exits 1 with the loop rule restored', red.status, 1);
  eq('and names the loop', /redirect loop at runtime/.test(red.stderr), true);
  eq('check-redirects exits 0 on the real file', gate(real).status, 0);
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(`redirects-parse: ${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log(`  FAIL ${f}`);
process.exit(fails.length ? 1 : 0);
