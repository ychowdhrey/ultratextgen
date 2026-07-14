#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const ROOT = path.resolve(__dirname, '..');
const FIX = process.argv.includes('--fix');

// Same skip pattern as check-gtm.js — embeds/widgets/tests don't carry a real hreflang cluster.
const SKIP_SEGMENTS = ['embed', 'widget', 'test', 'demo', '404', '_root'];
const SKIP_DIRS = ['node_modules', 'reports', 'data', 'functions', 'fonts'];

function shouldSkip(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  // _root.html is a literal build duplicate of index.html (see package.json's
  // "build" script) — it shares the homepage's canonical URL and would
  // collide with it in the URL->page map, not a distinct page to audit.
  if (rel === '_root.html') return true;
  const segments = rel.split('/');
  for (const seg of segments) {
    const lower = seg.toLowerCase();
    if (SKIP_SEGMENTS.includes(lower)) return true;
    if (SKIP_DIRS.includes(lower)) return true;
    if (/\.(test|demo|widget|embed)\b/i.test(seg)) return true;
  }
  return false;
}

function getAttr(tag, name) {
  // Some generated pages use single-quoted attributes instead of double — support both.
  const m = tag.match(new RegExp(name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')', 'i'));
  return m ? (m[1] !== undefined ? m[1] : m[2]) : null;
}

function normalize(url) {
  if (!url) return url;
  return url.trim().replace(/^http:/, 'https:').replace(/\/+$/, '/');
}

// A bare site root or bare `/xx/` locale homepage. Some pages fall back to
// linking the homepage as a placeholder "EN version" when no real translated
// counterpart exists — that's a fine claim for THAT page to make, but it must
// never be auto-propagated as a sibling relationship into another page's
// reconstructed cluster, and the homepage itself must never be auto-edited to
// link back to one arbitrary subpage.
function isHomepage(url) {
  return /^https:\/\/ultratextgen\.com\/([a-z]{2}(-[a-z]+)?\/)?$/.test(url);
}

function extractLinks(html) {
  let canonical = null;
  const alternates = []; // { hreflang, href }
  const tagRe = /<link\b[^>]*>/gi;
  let m;
  while ((m = tagRe.exec(html))) {
    const tag = m[0];
    const rel = (getAttr(tag, 'rel') || '').toLowerCase();
    const href = getAttr(tag, 'href');
    if (!href) continue;
    if (rel === 'canonical') {
      canonical = href;
    } else if (rel === 'alternate') {
      const hreflang = getAttr(tag, 'hreflang');
      if (hreflang) alternates.push({ hreflang, href });
    }
  }
  return { canonical, alternates };
}

// ─── Scan every page that has a canonical tag ─────────────────────────────────

const files = globSync('**/*.html', { cwd: ROOT, absolute: true }).filter((f) => !shouldSkip(f));

const pages = []; // pages that declare at least one alternate (the "cluster" pages)
const byUrl = new Map(); // normalized canonical url -> page-like record (cluster page OR headless page)

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const html = fs.readFileSync(file, 'utf8');
  const { canonical, alternates } = extractLinks(html);
  if (!canonical) continue; // no canonical at all — not part of any hreflang audit

  const canon = normalize(canonical);
  const alts = alternates.map((a) => ({ hreflang: a.hreflang, href: normalize(a.href) }));
  const selfEntry = alts.find((a) => a.href === canon && a.hreflang !== 'x-default');
  const record = { rel, filePath: file, canonical: canon, alternates: alts, ownLang: selfEntry ? selfEntry.hreflang : null };

  byUrl.set(canon, record);
  if (alts.length > 0) pages.push(record);
}

console.log('hreflang Reciprocity Audit');
console.log(`  Pages with a canonical tag:      ${byUrl.size}`);
console.log(`  Pages declaring hreflang:        ${pages.length}`);

const brokenList = []; // target href matches no known page at all
const headless = new Map(); // target record -> [{ sourcePage, hreflang }]  (target exists, but has zero alternates)
const nonReciprocal = []; // { page, target, hreflang }  (target exists, has alternates, doesn't link back)

for (const page of pages) {
  for (const alt of page.alternates) {
    if (alt.hreflang === 'x-default') continue; // informational hint, not a reciprocal pair
    if (alt.href === page.canonical) continue; // self-reference, expected

    const target = byUrl.get(alt.href);
    if (!target) {
      brokenList.push(`${page.rel}  declares hreflang="${alt.hreflang}" -> ${alt.href}  (target page not found)`);
      continue;
    }

    if (target.alternates.length === 0) {
      const arr = headless.get(target) || [];
      arr.push({ sourcePage: page, hreflang: alt.hreflang });
      headless.set(target, arr);
      continue;
    }

    const linksBack = target.alternates.some((a) => a.href === page.canonical);
    if (!linksBack && page.ownLang) {
      nonReciprocal.push({ page, target, hreflang: page.ownLang });
    }
  }
}

console.log(`  Non-reciprocal pairs:            ${nonReciprocal.length}`);
console.log(`  Headless targets (no hreflang):  ${headless.size}`);
console.log(`  Broken hreflang targets:         ${brokenList.length}`);

if (nonReciprocal.length) {
  console.log('');
  console.log('Non-reciprocal (target does not link back to source):');
  for (const item of nonReciprocal) {
    console.log(`  ✗ ${item.page.rel}  ->  ${item.target.rel}  (missing hreflang="${item.hreflang}")`);
  }
}
if (headless.size) {
  console.log('');
  console.log('Headless targets (page exists, canonical exists, but declares no hreflang at all):');
  for (const [target, sources] of headless) {
    const via = sources.map((s) => `${s.sourcePage.rel} (hreflang="${s.hreflang}")`).join(', ');
    console.log(`  ✗ ${target.rel}  <-  referenced by ${via}`);
  }
}
if (brokenList.length) {
  console.log('');
  console.log('Broken targets (declared href matches no page anywhere in the repo):');
  for (const line of brokenList) console.log(`  ✗ ${line}`);
}

// ─── --fix ─────────────────────────────────────────────────────────────────
//
// Two repair modes:
//  1. Non-reciprocal: inject the one missing <link> into the target's existing block.
//  2. Headless: the target has NO hreflang block at all. Reconstruct its full
//     cluster from every source that already claims it — union each source's
//     own alternates (their siblings are the target's siblings too) plus the
//     target's own self-entry — then insert a brand-new block after its
//     canonical tag.

if (FIX) {
  let filesFixed = 0;
  let linksAdded = 0;

  // 1. Non-reciprocal — append into an existing alternate block. Only skip
  // when a SUBPAGE claims a homepage as its "EN version" (a common
  // placeholder when no real translated counterpart exists yet) — writing
  // that back would turn the homepage into linking to one arbitrary subpage.
  // Homepage-to-homepage claims (every locale homepage listing every other
  // locale homepage) are the normal, legitimate cluster pattern and must
  // still be fixed reciprocally, e.g. a new locale's homepage needs every
  // existing locale homepage to link back to it.
  const fixesByFile = new Map(); // filePath -> [{hreflang, href}]
  let skippedHomepageTargets = 0;
  for (const item of nonReciprocal) {
    if (isHomepage(item.target.canonical) && !isHomepage(item.page.canonical)) {
      skippedHomepageTargets++;
      continue;
    }
    const arr = fixesByFile.get(item.target.filePath) || [];
    arr.push({ hreflang: item.hreflang, href: item.page.canonical });
    fixesByFile.set(item.target.filePath, arr);
  }

  for (const [filePath, links] of fixesByFile) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let lastAltIdx = -1;
    let xDefaultIdx = -1;
    let indent = '  ';
    lines.forEach((line, i) => {
      if (/<link\b[^>]*rel="alternate"/i.test(line)) {
        lastAltIdx = i;
        const m = line.match(/^(\s*)/);
        if (m) indent = m[1];
        if (/hreflang="x-default"/i.test(line)) xDefaultIdx = i;
      }
    });

    const insertAt = xDefaultIdx !== -1 ? xDefaultIdx : lastAltIdx + 1;
    if (insertAt < 0) continue;

    const existing = new Set(lines.map((l) => l.trim()));
    const deduped = links.filter(
      (l, idx, arr) => arr.findIndex((x) => x.hreflang === l.hreflang && x.href === l.href) === idx
    );
    const newLines = deduped
      .map((l) => `${indent}<link rel="alternate" hreflang="${l.hreflang}" href="${l.href}">`)
      .filter((line) => !existing.has(line.trim()));

    if (!newLines.length) continue;
    lines.splice(insertAt, 0, ...newLines);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    filesFixed++;
    linksAdded += newLines.length;
  }

  // 2. Headless — build a brand-new block from every source that references it.
  for (const [target, sources] of headless) {
    const cluster = new Map(); // hreflang -> href
    let xDefaultHref = null;

    for (const { sourcePage, hreflang: targetLangFromSource } of sources) {
      cluster.set(targetLangFromSource, target.canonical);
      cluster.set(sourcePage.ownLang || 'en', sourcePage.canonical);
      for (const a of sourcePage.alternates) {
        if (isHomepage(a.href)) continue; // placeholder fallback, not a real sibling — don't propagate
        if (a.hreflang === 'x-default') {
          xDefaultHref = xDefaultHref || a.href;
          continue;
        }
        if (!cluster.has(a.hreflang)) cluster.set(a.hreflang, a.href);
      }
    }
    // Only keep the target's own entry pinned to its own canonical (in case a
    // source had a stale href for it under the same hreflang code).
    const targetLang = sources[0].hreflang;
    cluster.set(targetLang, target.canonical);
    if (!xDefaultHref) xDefaultHref = cluster.get('en') || target.canonical;

    const content = fs.readFileSync(target.filePath, 'utf8');
    const lines = content.split('\n');
    let canonIdx = -1;
    let indent = '  ';
    lines.forEach((line, i) => {
      if (/<link\b[^>]*rel="canonical"/i.test(line)) {
        canonIdx = i;
        const m = line.match(/^(\s*)/);
        if (m) indent = m[1];
      }
    });
    if (canonIdx < 0) continue; // shouldn't happen — record required a canonical to exist

    const sortedLangs = Array.from(cluster.keys()).sort();
    const blockLines = sortedLangs.map(
      (lang) => `${indent}<link rel="alternate" hreflang="${lang}" href="${cluster.get(lang)}">`
    );
    blockLines.push(`${indent}<link rel="alternate" hreflang="x-default" href="${xDefaultHref}">`);

    lines.splice(canonIdx + 1, 0, ...blockLines);
    fs.writeFileSync(target.filePath, lines.join('\n'), 'utf8');
    filesFixed++;
    linksAdded += blockLines.length;
  }

  console.log('');
  console.log(`🔧 Fixed ${filesFixed} file(s), added ${linksAdded} hreflang link(s).`);
  if (skippedHomepageTargets) {
    console.log(`⚠️  Skipped ${skippedHomepageTargets} pair(s) whose target is a homepage — a subpage claims the homepage as its placeholder translation; fix the subpage's own claim by hand instead.`);
  }
}

const totalIssues = nonReciprocal.length + headless.size + brokenList.length;
if (totalIssues && !FIX) {
  console.log('');
  console.log(`❌ ${totalIssues} hreflang issue(s) found. Run with --fix to auto-repair non-reciprocal pairs and headless targets.`);
  process.exit(1);
} else if (brokenList.length) {
  console.log('');
  console.log(`❌ ${brokenList.length} broken hreflang target(s) remain (no matching page anywhere — verify the URL/slug by hand).`);
  process.exit(1);
} else {
  console.log('');
  console.log('✅ All hreflang clusters are fully reciprocal (or the sole remaining gaps are homepage-placeholder claims, left for manual review).');
  process.exit(0);
}
