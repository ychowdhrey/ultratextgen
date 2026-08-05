#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const ROOT = path.resolve(__dirname, '..');
const FIX = process.argv.includes('--fix');

// --scope-files <path...> (only meaningful with --fix): the audit always
// scans the WHOLE tree — reciprocity can't be judged from a subset — but
// writes are restricted to the named files plus the members of their own
// hreflang clusters. Siblings must stay writable (adding a page means its
// cluster gains back-links), but pages in unrelated clusters must never be
// mutated by a scoped run. This exists because an unscoped fix pass once
// edited two ratified local-only pages in a cluster the invoking PR never
// touched (`148fcd59`).
const argvTail = process.argv.slice(2);
const scopeIdx = argvTail.indexOf('--scope-files');
const scopeFiles = [];
if (scopeIdx !== -1) {
  for (let i = scopeIdx + 1; i < argvTail.length && !argvTail[i].startsWith('--'); i++) scopeFiles.push(argvTail[i]);
}

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

// x-default direction. CLAUDE.md: x-default ALWAYS points at the English
// canonical, and must never point at a non-EN page (least of all at itself).
// Reciprocity alone can't catch this — a cluster can be perfectly reciprocal
// while every member's x-default points at the Spanish URL — so it needs its
// own pass. This has been the single most-repeated hreflang bug on the site.
const badXDefault = []; // { page, current, expected }
const conflictedBlocks = []; // pages whose own block declares a code twice
for (const page of pages) {
  const xd = page.alternates.find((a) => a.hreflang === 'x-default');
  if (!xd) continue;

  // A block that declares the same hreflang code twice with different hrefs is
  // two clusters stacked into one page. Which cluster owns the page is an
  // editorial call, so retargeting its x-default would be picking a side.
  // Same policy the --fix pass already applies to conflicting codes: flag for
  // manual review, never auto-resolve.
  const seen = new Map();
  let conflicted = false;
  for (const a of page.alternates) {
    if (a.hreflang === 'x-default') continue;
    if (seen.has(a.hreflang) && seen.get(a.hreflang) !== a.href) conflicted = true;
    seen.set(a.hreflang, a.href);
  }
  if (conflicted) {
    conflictedBlocks.push(page);
    continue;
  }

  // The cluster's English member, as this page itself declares it.
  const enAlt = page.alternates.find((a) => a.hreflang === 'en');
  if (!enAlt) continue; // no EN member declared — nothing to assert against
  if (xd.href !== enAlt.href) {
    badXDefault.push({ page, current: xd.href, expected: enAlt.href });
  }
}

console.log(`  Non-reciprocal pairs:            ${nonReciprocal.length}`);
console.log(`  Headless targets (no hreflang):  ${headless.size}`);
console.log(`  Broken hreflang targets:         ${brokenList.length}`);
console.log(`  x-default not pointing at EN:    ${badXDefault.length}`);

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
if (badXDefault.length) {
  console.log('');
  console.log('x-default pointing somewhere other than the cluster\'s EN member:');
  for (const item of badXDefault) {
    console.log(`  ✗ ${item.page.rel}  x-default -> ${item.current}  (should be ${item.expected})`);
  }
}
if (conflictedBlocks.length) {
  console.log('');
  console.log('Conflicted hreflang blocks (same code declared twice with different hrefs — two clusters stacked on one page). x-default left untouched; resolve cluster membership by hand:');
  for (const page of conflictedBlocks) console.log(`  ⚠ ${page.rel}`);
}

let skippedOutOfScope = 0;
const conflictWarnings = [];

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

  // Build the write-allowed set when --scope-files was given: each named
  // file, every page its alternates point at, and every page that points an
  // alternate at it (both directions, so a stale one-way link still keeps
  // the pair in scope). null = unscoped, whole tree writable.
  let allowedFiles = null;
  if (scopeFiles.length) {
    allowedFiles = new Set();
    const scopeRels = new Set(
      scopeFiles.map((f) => path.relative(ROOT, path.resolve(ROOT, f)).replace(/\\/g, '/'))
    );
    const scopeRecs = [...byUrl.values()].filter((r) => scopeRels.has(r.rel));
    for (const rec of scopeRecs) {
      allowedFiles.add(rec.filePath);
      for (const a of rec.alternates) {
        const t = byUrl.get(a.href);
        if (t) allowedFiles.add(t.filePath);
      }
      for (const p of byUrl.values()) {
        if (p.alternates.some((a) => a.href === rec.canonical)) allowedFiles.add(p.filePath);
      }
    }
    console.log('');
    console.log(`  fix scope: ${scopeFiles.length} named file(s) -> ${allowedFiles.size} writable file(s) (named files + their cluster members)`);
  }

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
    if (allowedFiles && !allowedFiles.has(item.target.filePath)) {
      skippedOutOfScope++;
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

    // Conflict guard: never insert a second entry for an hreflang code the
    // file already declares with a DIFFERENT href. Two entries for one code
    // is always wrong (the duplicate-`zh-TW` failure in `148fcd59`); which
    // href is correct is a judgment call, so flag it for manual review
    // instead of stacking a duplicate.
    const existingByLang = new Map(); // lang(lower) -> Set of normalized hrefs
    for (const line of lines) {
      if (!/<link\b[^>]*rel\s*=\s*["']alternate["']/i.test(line)) continue;
      const lang = getAttr(line, 'hreflang');
      const href = getAttr(line, 'href');
      if (!lang || !href) continue;
      const key = lang.toLowerCase();
      if (!existingByLang.has(key)) existingByLang.set(key, new Set());
      existingByLang.get(key).add(normalize(href));
    }

    const deduped = links.filter(
      (l, idx, arr) => arr.findIndex((x) => x.hreflang === l.hreflang && x.href === l.href) === idx
    );
    const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
    const nonConflicting = deduped.filter((l) => {
      const have = existingByLang.get(l.hreflang.toLowerCase());
      if (have && !have.has(normalize(l.href))) {
        conflictWarnings.push(
          `${rel}: already declares hreflang="${l.hreflang}" with a different href — wanted to add ${l.href}; resolve by hand`
        );
        return false;
      }
      return true;
    });
    const newLines = nonConflicting
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
    if (allowedFiles && !allowedFiles.has(target.filePath)) {
      skippedOutOfScope++;
      continue;
    }
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
  // 3. x-default direction — rewrite the href in place. This is a pure
  // retarget of an existing tag (no insertion, no cluster reconstruction), so
  // it runs independently of the two repairs above and can apply to a file
  // they never touched.
  let xDefaultFixed = 0;
  for (const item of badXDefault) {
    if (allowedFiles && !allowedFiles.has(item.page.filePath)) {
      skippedOutOfScope++;
      continue;
    }
    const html = fs.readFileSync(item.page.filePath, 'utf8');
    const patched = html.replace(
      /(<link\s+rel="alternate"\s+hreflang="x-default"\s+href=")([^"]*)(")/i,
      `$1${item.expected}$3`
    );
    if (patched === html) continue; // tag shape didn't match — leave for manual review
    fs.writeFileSync(item.page.filePath, patched);
    xDefaultFixed++;
  }

  console.log(`🔧 Fixed ${filesFixed} file(s), added ${linksAdded} hreflang link(s).`);
  if (xDefaultFixed) {
    console.log(`🔧 Repointed ${xDefaultFixed} x-default tag(s) at their cluster's EN canonical.`);
  }
  if (skippedHomepageTargets) {
    console.log(`⚠️  Skipped ${skippedHomepageTargets} pair(s) whose target is a homepage — a subpage claims the homepage as its placeholder translation; fix the subpage's own claim by hand instead.`);
  }
  if (skippedOutOfScope) {
    console.log(`⚠️  Skipped ${skippedOutOfScope} fix(es) outside --scope-files (named files + their cluster members). Run unscoped to apply site-wide.`);
  }
  if (conflictWarnings.length) {
    console.log(`⚠️  ${conflictWarnings.length} conflicting hreflang entr${conflictWarnings.length === 1 ? 'y' : 'ies'} left unfixed (same code, different href — never auto-stacked):`);
    for (const w of conflictWarnings) console.log(`    ${w}`);
  }
}

const totalIssues = nonReciprocal.length + headless.size + brokenList.length + badXDefault.length;
if (totalIssues && !FIX) {
  console.log('');
  console.log(`❌ ${totalIssues} hreflang issue(s) found. Run with --fix to auto-repair non-reciprocal pairs, headless targets, and misdirected x-default tags.`);
  process.exit(1);
} else if (brokenList.length) {
  console.log('');
  console.log(`❌ ${brokenList.length} broken hreflang target(s) remain (no matching page anywhere — verify the URL/slug by hand).`);
  process.exit(1);
} else if (FIX && (skippedOutOfScope || conflictWarnings.length)) {
  console.log('');
  console.log('✅ In-scope clusters repaired. Issues outside --scope-files, or flagged conflicts, remain — see warnings above; run unscoped (or resolve conflicts by hand) to clear them.');
  process.exit(0);
} else {
  console.log('');
  console.log('✅ All hreflang clusters are fully reciprocal (or the sole remaining gaps are homepage-placeholder claims, left for manual review).');
  process.exit(0);
}
