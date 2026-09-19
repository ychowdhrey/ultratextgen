#!/usr/bin/env node
'use strict';
/**
 * rebaseline-sitemap-lastmod-cache.js <commit>
 *
 * Recompute every stored significance hash in data/sitemap-lastmod-cache.json
 * from each page AS IT WAS AT <commit>, keeping every URL's lastmod exactly as
 * it is. Run this whenever scripts/lib/content-significance.js changes what it
 * hashes: the stored hashes were made by the previous function, so without a
 * re-baseline the next sitemap run would read every URL as changed and advance
 * all 4,576 lastmods at once — the failure the cache exists to prevent.
 *
 * <commit> is the tree the cache's lastmods describe: the commit of the last
 * sitemap run, i.e. `git log -1 --format=%h -- data/sitemap-lastmod-cache.json`.
 * Hashing that tree (not HEAD) is what keeps the cache honest: a page that has
 * changed meaningfully since then still reads as changed on the next run, and
 * a page that changed only in ways the new function ignores reads as held.
 *
 * Usage:  node scripts/rebaseline-sitemap-lastmod-cache.js df1f93e7f
 *         npm run rebaseline:sitemap-cache -- df1f93e7f
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { significanceHash } = require('./lib/content-significance');

const REPO_ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(REPO_ROOT, 'data', 'sitemap-lastmod-cache.json');
const commit = process.argv[2];
if (!commit) {
  console.error('usage: rebaseline-sitemap-lastmod-cache.js <commit-of-last-sitemap-run>');
  process.exit(2);
}
const sha = execFileSync('git', ['rev-parse', '--verify', `${commit}^{commit}`], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();

const cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
const urls = Object.keys(cache).sort();
let rehashed = 0, changed = 0, missing = 0;
const next = {};
for (const url of urls) {
  const rel = url === '/' ? 'index.html' : url.replace(/^\//, '') + (url.endsWith('/') ? 'index.html' : '');
  let html = null;
  try {
    html = execFileSync('git', ['show', `${sha}:${rel}`], { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { /* not in that tree */ }
  if (html === null) {
    // The page was not in the baseline tree, so its cached hash cannot be
    // re-derived from it. Keep the entry untouched: it reads as changed on the
    // next run and gets dated by its own history, which is correct for a page
    // that appeared after the last run.
    next[url] = cache[url];
    missing++;
    continue;
  }
  const hash = significanceHash(html);
  if (hash !== cache[url].hash) changed++;
  next[url] = { hash, lastmod: cache[url].lastmod };
  rehashed++;
}
fs.writeFileSync(CACHE, JSON.stringify(next, null, 1) + '\n', 'utf8');
console.log(`Re-baselined ${rehashed} of ${urls.length} URLs against ${sha.slice(0, 9)} (${changed} hashes moved, ${missing} not in that tree, every lastmod kept).`);
