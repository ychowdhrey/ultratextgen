#!/usr/bin/env node
'use strict';

/**
 * fix-source-attribution.js — the repair pass for the Sources standard.
 *
 * It does the three things that are mechanical, and refuses the one that is
 * not:
 *
 *   1. Wraps an existing Sources block's body in a .source-note panel
 *      (it was reusing .editorial-block, which renders a page's citation
 *      apparatus with exactly the weight of the answer above it).
 *   2. Sets every citation's rel from data/source_authority.json — a
 *      primary source is followed, everything else is nofollow — and adds
 *      the target="_blank" the convention has always carried.
 *   3. Migrates a locale's legacy Sources label to that locale's canonical
 *      one (ja 情報源 -> 出典, th แหล่งข้อมูล -> แหล่งอ้างอิง).
 *   4. Projects the block's citations into the page's JSON-LD as
 *      schema.org `citation`, so an answer engine can read the evidence a
 *      human reader can see. Derived from the block, never authored twice.
 *
 * It will NOT create a Sources block on a page that lacks one. The block's
 * content is a sentence saying which claim each source backs — "Release date
 * and repertoire stability come from Unicode 18.0.0" — and that sentence has
 * to be written, in the page's own language, by someone who knows what the
 * page claims. Generating "Sources: <list of links>" would satisfy the gate
 * and defeat the standard, so the gate names such a page and stops.
 *
 * Idempotent: a second run reports 0 files changed.
 *
 * Usage:
 *   node scripts/fix-source-attribution.js            # report only
 *   node scripts/fix-source-attribution.js --write    # apply
 *   node scripts/fix-source-attribution.js --write <file...>   # scoped
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib/source-attribution.js');

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const files = argv.filter((a) => !a.startsWith('--'));

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'assets') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'index.html') out.push(path.relative(L.REPO, p));
  }
  return out;
}

const targets = files.length
  ? files.map((f) => path.relative(L.REPO, path.resolve(f)))
  : walk(L.REPO).sort();

/** Rewrite one <a …> citation tag so its rel matches the domain's tier. */
function fixAnchor(tag, url) {
  const want = L.relFor(url);
  let out = /\srel="[^"]*"/i.test(tag)
    ? tag.replace(/\srel="[^"]*"/i, ` rel="${want}"`)
    : tag.replace(/^<a\s/i, `<a rel="${want}" `);
  if (!/\starget="/i.test(out)) out = out.replace(/^<a\s/i, '<a target="_blank" ');
  return out;
}

let changedFiles = 0;
const log = [];

for (const rel of targets) {
  const abs = path.join(L.REPO, rel);
  if (!fs.existsSync(abs)) continue;
  if (L.isExempt(rel)) continue;

  let html = fs.readFileSync(abs, 'utf8');
  const before = html;
  const locale = L.localeOf(rel);
  const labels = L.LOCALE_LABELS[locale];
  const did = [];

  // 3. Legacy label -> canonical, scoped to the section label element so a
  //    word that also appears in body prose is never touched.
  if (labels) {
    for (const legacy of labels.slice(1)) {
      const re = new RegExp(`(<span class="article-section-label">)${legacy}(</span>)`, 'g');
      if (re.test(html)) {
        html = html.replace(re, `$1${labels[0]}$2`);
        did.push(`label "${legacy}" -> "${labels[0]}"`);
      }
    }
  }

  // 1. .editorial-block -> .source-note, only inside the Sources section.
  const sec = L.sourceSection(L.bodyOf(html), locale);
  if (sec && /class="editorial-block"/.test(sec.html)) {
    const upgraded = sec.html.replace(/class="editorial-block"/, 'class="source-note"');
    html = html.replace(sec.html, upgraded);
    did.push('editorial-block -> source-note');
  }

  // 2. rel/target on every citation on the page.
  let relFixes = 0;
  for (const c of L.citationLinks(L.bodyOf(html))) {
    const fixed = fixAnchor(c.tag, c.url);
    if (fixed !== c.tag) {
      html = html.replace(c.tag, fixed);
      relFixes++;
    }
  }
  if (relFixes) did.push(`${relFixes} citation rel/target`);

  // 4. Project the block's citations into the page's JSON-LD.
  const sec2 = L.sourceSection(L.bodyOf(html), locale);
  if (sec2) {
    const list = L.citationsFromSection(sec2.html);
    const withLd = L.withJsonLdCitations(html, list);
    if (withLd === null) {
      console.warn(`  ! ${rel}: has a Sources block but no JSON-LD CreativeWork node to carry citation`);
    } else if (withLd !== html) {
      html = withLd;
      did.push(`${list.length} JSON-LD citation(s)`);
    }
  }

  if (html !== before) {
    changedFiles++;
    log.push(`  ${rel}\n      ${did.join('; ')}`);
    if (WRITE) fs.writeFileSync(abs, html);
  }
}

console.log(WRITE ? 'FIX SOURCE ATTRIBUTION (writing)' : 'FIX SOURCE ATTRIBUTION (dry run — pass --write to apply)');
console.log('='.repeat(72));
if (log.length) console.log(log.join('\n'));
console.log('');
console.log(`${changedFiles} file(s) ${WRITE ? 'updated' : 'would change'}.`);
