#!/usr/bin/env node
'use strict';

/**
 * audit-hreflang-completeness.js
 *
 * scripts/audit-hreflang.js checks PAIRWISE reciprocity: if page A declares
 * an alternate to page B, does B declare one back to A. That check has a
 * blind spot — if two members of the same cluster BOTH omit each other
 * (neither declares an edge to the other at all), there is no directed edge
 * for the reciprocity walk to inspect, so nothing gets flagged. Discovered
 * 2026-07-26: 5 of 8 members of a real hreflang cluster (es, ko, pt, ar, id)
 * were each missing 1-2 sibling entries — always a mutual omission, which is
 * exactly the case pairwise reciprocity cannot see.
 *
 * This script instead reconstructs true cluster membership independent of
 * the edges being checked — the same way scripts/audit-translation-parity.js
 * does via scripts/lib/translation-clusters.js's discoverClusters(): a
 * page's cluster is whichever EN URL its OWN hreflang="en" entry points at
 * (or itself, if it IS the EN page). Given that membership, it checks each
 * member's <link rel="alternate"> block contains an entry for EVERY OTHER
 * member (right hreflang code, right href) — full N-way coverage, not just
 * "whatever edges happen to exist."
 *
 * Ratified local-only exception pages (see CLAUDE.md's "Ratified local-only
 * exceptions") intentionally fall back to the bare EN homepage as a generic
 * x-default default, not a real translation-sibling claim, and must not be
 * forced into the homepage's full mesh. Handled generically, not via a
 * hardcoded page list: a member whose declared "en" anchor IS a homepage
 * URL, but whose own canonical is NOT itself a homepage URL, is a
 * placeholder claim and is excluded from that cluster's membership.
 *
 * Usage:
 *   node scripts/audit-hreflang-completeness.js                  # report to stdout
 *   node scripts/audit-hreflang-completeness.js --fix             # also repair
 *   node scripts/audit-hreflang-completeness.js --fix --scope-files <path...>
 *   node scripts/audit-hreflang-completeness.js --json out.json
 *   node scripts/audit-hreflang-completeness.js --report out.md
 *
 * Exit code 0 = complete (or fixed), 1 = incomplete clusters remain.
 */

const fs = require('fs');
const path = require('path');
const { discoverClusters, normalizeUrl } = require('./lib/translation-clusters');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const FIX = args.includes('--fix');
const jsonIdx = args.indexOf('--json');
const reportIdx = args.indexOf('--report');
const jsonPath = jsonIdx !== -1 ? args[jsonIdx + 1] : null;
const reportPath = reportIdx !== -1 ? args[reportIdx + 1] : null;

const scopeIdx = args.indexOf('--scope-files');
const scopeFiles = [];
if (scopeIdx !== -1) {
  for (let i = scopeIdx + 1; i < args.length && !args[i].startsWith('--'); i++) scopeFiles.push(args[i]);
}

function isHomepage(url) {
  return /^https:\/\/ultratextgen\.com\/([a-z]{2}(-[a-z]+)?\/)?$/.test(url);
}

// ─── Discover clusters (anchor = the EN URL each member's own hreflang="en" points at) ──

const { byUrl, clusters } = discoverClusters(ROOT);

let scopeRels = null;
if (scopeFiles.length) {
  scopeRels = new Set(scopeFiles.map((f) => path.relative(ROOT, path.resolve(ROOT, f)).replace(/\\/g, '/')));
}

const incomplete = []; // { anchor, memberRel, missing: [{hreflang, href, viaRel}] }

const duplicateClusters = []; // { anchor, lang, members: [rec, rec, ...] } — two+ members claim the same locale

for (const [anchor, memberSet] of clusters) {
  const anchorIsHomepage = isHomepage(anchor);
  const members = [...memberSet]
    .map((url) => byUrl.get(url))
    .filter(Boolean)
    // Exclude placeholder claims: a non-homepage page whose only "en" claim
    // is the bare homepage is NOT a real sibling of the homepage cluster.
    .filter((rec) => !(anchorIsHomepage && !isHomepage(rec.canonical)));

  if (members.length < 2) continue; // nothing to reconcile

  // A cluster is "ambiguous" when two members declare the SAME own language
  // — not a completeness gap but a duplicate-page bug (see CLAUDE.md,
  // "Parallel sessions build the same thing under different names"): there
  // is no single correct href to fill in for that language on every other
  // member, so auto-filling would either silently pick a side or (worse)
  // stack two entries for the same hreflang code in one file. Detect and
  // set aside for manual resolution instead of guessing.
  const byLang = new Map();
  for (const m of members) {
    if (!m.ownLang) continue;
    if (!byLang.has(m.ownLang)) byLang.set(m.ownLang, []);
    byLang.get(m.ownLang).push(m);
  }
  const ambiguousLangs = new Set();
  for (const [lang, recs] of byLang) {
    if (recs.length > 1) {
      ambiguousLangs.add(lang);
      duplicateClusters.push({ anchor, lang, members: recs });
    }
  }

  for (const member of members) {
    const missing = [];
    for (const other of members) {
      if (other === member) continue;
      const otherLang = other.ownLang || (other.canonical === anchor ? 'en' : null);
      // Skip filling in a link to (or from) either side of an ambiguous
      // pair — including the member's own reflexive slot, e.g. two "ja"
      // pages can't fill each other's "ja" entry either.
      if (otherLang && ambiguousLangs.has(otherLang)) continue;
      if (member.ownLang && ambiguousLangs.has(member.ownLang)) continue;
      const already = member.alternates.some((a) => normalizeUrl(a.href) === other.canonical);
      if (!already) {
        missing.push({ hreflang: otherLang, href: other.canonical, viaRel: other.rel });
      }
    }
    if (missing.length) {
      incomplete.push({ anchor, memberRel: member.rel, memberFile: member.filePath, memberCanonical: member.canonical, missing });
    }
  }
}

// ─── Cross-cluster edges ────────────────────────────────────────────────
// A THIRD failure mode, distinct from both checks that already exist. Page A
// names B as its sibling for locale L, but B's own hreflang="en" claims a
// different EN parent than A's — so the two pages belong to different
// clusters and A is advertising another cluster's page as its translation.
//
// Neither existing check can see it:
//   - completeness (above) reconstructs membership from each page's own
//     hreflang="en", so B simply isn't a member of A's cluster and the stray
//     edge is never examined;
//   - reciprocity (audit-hreflang.js) only asks whether the edge points both
//     ways, and a cross-cluster edge can be perfectly two-way and still wrong.
//
// Real case (fixed 2026-08-08): every member of library/aesthetic-symbols
// correctly listed it/library/simboli as its Italian page, while
// nl/library/speciale-tekens — a member of library/special-characters —
// listed that same Italian page as *its* Italian version, and simboli listed
// speciale-tekens back as its Dutch version. Mutually reciprocal, and wrong
// in both directions: it told Google two different EN pages share one
// Italian translation.
const crossCluster = []; // { fromRel, fromAnchor, code, toRel, toAnchor }

function anchorOf(rec) {
  if (!rec) return null;
  if (rec.ownLang === 'en') return rec.canonical;
  const enAlt = rec.alternates.find((a) => a.hreflang === 'en');
  return enAlt ? enAlt.href : null;
}

for (const [, rec] of byUrl) {
  const fromAnchor = anchorOf(rec);
  if (!fromAnchor) continue; // headless — audit-hreflang.js reports these
  for (const alt of rec.alternates) {
    if (alt.hreflang === 'x-default') continue;
    if (alt.href === rec.canonical) continue; // self-reference
    const target = byUrl.get(alt.href);
    if (!target) continue; // broken target — audit-hreflang.js reports these
    const toAnchor = anchorOf(target);
    if (!toAnchor) continue; // headless target — likewise
    if (toAnchor !== fromAnchor) {
      crossCluster.push({
        fromRel: rec.rel, fromAnchor, code: alt.hreflang, toRel: target.rel, toAnchor,
      });
    }
  }
}

// ─── Report ─────────────────────────────────────────────────────────────

console.log('hreflang Cluster Completeness Audit');
console.log(`  Clusters with >=2 real members:  ${[...clusters.values()].filter((s) => s.size >= 2).length}`);
console.log(`  Pages with missing sibling entries: ${incomplete.length}`);
console.log(`  Duplicate-page clusters (NOT auto-fixed): ${duplicateClusters.length}`);
console.log(`  Cross-cluster edges (NOT auto-fixed):     ${crossCluster.length}`);
console.log('');

if (crossCluster.length) {
  console.log('Cross-cluster edges — this page names a sibling that belongs to a DIFFERENT');
  console.log('EN cluster. Two EN parents cannot share one translation. Resolve by hand:');
  console.log('drop the stray entry, or repoint it at that locale\'s real page in this');
  console.log('cluster (never auto-filled — which of the two is wrong is a content call):');
  for (const c of crossCluster) {
    console.log(`  ✗ ${c.fromRel}`);
    console.log(`      declares hreflang="${c.code}" -> ${c.toRel}`);
    console.log(`      but this page's cluster is ${c.fromAnchor}`);
    console.log(`      while that page's cluster is ${c.toAnchor}`);
  }
  console.log('');
}

if (duplicateClusters.length) {
  console.log('Duplicate-page clusters — two+ pages claim the same locale for one EN parent.');
  console.log('This is the "Parallel sessions build the same thing under different names" bug');
  console.log('(CLAUDE.md, Git Workflow) — resolve by hand (keep the more-integrated page, 301');
  console.log('the other, repoint references), never auto-filled:');
  for (const d of duplicateClusters) {
    console.log(`  ✗ cluster ${d.anchor} — hreflang="${d.lang}" claimed by:`);
    for (const m of d.members) console.log(`      ${m.rel}  (${m.canonical})`);
  }
  console.log('');
}

if (incomplete.length) {
  // Group by anchor for a readable report.
  const byAnchor = new Map();
  for (const item of incomplete) {
    if (!byAnchor.has(item.anchor)) byAnchor.set(item.anchor, []);
    byAnchor.get(item.anchor).push(item);
  }
  for (const [anchor, items] of byAnchor) {
    console.log(`✗ cluster ${anchor}`);
    for (const item of items) {
      console.log(`    ${item.memberRel} is missing:`);
      for (const m of item.missing) {
        console.log(`      hreflang="${m.hreflang || '?'}" -> ${m.href}`);
      }
    }
  }
  console.log('');
}

if (jsonPath) {
  fs.writeFileSync(path.resolve(ROOT, jsonPath), JSON.stringify(incomplete, null, 2));
  console.log(`Wrote JSON snapshot to ${jsonPath}`);
}
if (reportPath) {
  const lines = ['# hreflang Cluster Completeness Audit', ''];
  for (const item of incomplete) {
    lines.push(`## ${item.memberRel}`);
    lines.push(`Cluster anchor: ${item.anchor}`);
    for (const m of item.missing) lines.push(`- missing hreflang="${m.hreflang || '?'}" -> ${m.href}`);
    lines.push('');
  }
  fs.writeFileSync(path.resolve(ROOT, reportPath), lines.join('\n'));
  console.log(`Wrote markdown report to ${reportPath}`);
}

// ─── --fix ─────────────────────────────────────────────────────────────

let filesFixed = 0;
let linksAdded = 0;
let skippedOutOfScope = 0;
const conflictWarnings = [];

if (FIX && incomplete.length) {
  for (const item of incomplete) {
    if (scopeRels && !scopeRels.has(item.memberRel)) {
      skippedOutOfScope++;
      continue;
    }
    const content = fs.readFileSync(item.memberFile, 'utf8');
    const lines = content.split('\n');

    let lastAltIdx = -1;
    let xDefaultIdx = -1;
    let indent = '  ';
    const existingByLang = new Map(); // lang(lower) -> Set of normalized hrefs
    lines.forEach((line) => {
      if (!/<link\b[^>]*rel\s*=\s*["']alternate["']/i.test(line)) return;
      const langMatch = line.match(/hreflang\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      const hrefMatch = line.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      const lang = langMatch ? langMatch[1] || langMatch[2] : null;
      const href = hrefMatch ? hrefMatch[1] || hrefMatch[2] : null;
      if (lang && href) {
        const key = lang.toLowerCase();
        if (!existingByLang.has(key)) existingByLang.set(key, new Set());
        existingByLang.get(key).add(normalizeUrl(href));
      }
    });
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
    const toAdd = [];

    // Two (or more) missing entries can share an hreflang code but disagree
    // on href — e.g. a page sits in a cluster where TWO locale pages both
    // claim to be its "id" sibling (a duplicate-page bug, not a completeness
    // gap). Neither pre-exists in the file, so the pre-existing-content
    // conflict check below can't see it; check within this batch too, and
    // when it happens, never auto-stack either — same "flag for manual
    // review" policy as an existing-content conflict.
    const missingByLang = new Map(); // lang(lower) -> Set of normalized hrefs
    for (const m of item.missing) {
      if (!m.hreflang) continue;
      const key = m.hreflang.toLowerCase();
      if (!missingByLang.has(key)) missingByLang.set(key, new Set());
      missingByLang.get(key).add(normalizeUrl(m.href));
    }

    for (const m of item.missing) {
      if (!m.hreflang) {
        conflictWarnings.push(`${item.memberRel}: could not determine hreflang code for sibling ${m.href} — resolve by hand`);
        continue;
      }
      const key = m.hreflang.toLowerCase();
      if (missingByLang.get(key).size > 1) {
        conflictWarnings.push(
          `${item.memberRel}: cluster has multiple candidates for hreflang="${m.hreflang}" (${[...missingByLang.get(key)].join(', ')}) — likely a duplicate-page bug; resolve by hand`
        );
        continue;
      }
      const have = existingByLang.get(key);
      if (have && !have.has(normalizeUrl(m.href))) {
        conflictWarnings.push(
          `${item.memberRel}: already declares hreflang="${m.hreflang}" with a different href — wanted to add ${m.href}; resolve by hand`
        );
        continue;
      }
      const line = `${indent}<link rel="alternate" hreflang="${m.hreflang}" href="${m.href}">`;
      if (!existing.has(line.trim())) toAdd.push(line);
    }

    if (!toAdd.length) continue;
    lines.splice(insertAt, 0, ...toAdd);
    fs.writeFileSync(item.memberFile, lines.join('\n'), 'utf8');
    filesFixed++;
    linksAdded += toAdd.length;
  }

  console.log(`🔧 Fixed ${filesFixed} file(s), added ${linksAdded} hreflang link(s).`);
  if (skippedOutOfScope) console.log(`⚠️  Skipped ${skippedOutOfScope} fix(es) outside --scope-files.`);
  if (conflictWarnings.length) {
    console.log(`⚠️  ${conflictWarnings.length} conflict(s) left unfixed (never auto-stacked):`);
    for (const w of conflictWarnings) console.log(`    ${w}`);
  }
}

// Cross-cluster edges are blocking. Unlike the duplicate-page clusters above
// (a pre-existing content backlog this script only surfaces), this class was
// driven to zero in the same change that added the check, so any occurrence
// is new — and there is no legitimate case for one, since two EN parents
// sharing a translation is always a bug on one side or the other.
if (crossCluster.length) {
  console.log(`❌ ${crossCluster.length} cross-cluster hreflang edge(s) — see above. Not auto-fixable.`);
  process.exit(1);
} else if (incomplete.length && !FIX) {
  console.log(`❌ ${incomplete.length} page(s) with incomplete hreflang cluster coverage. Run with --fix to auto-repair.`);
  process.exit(1);
} else if (FIX && (incomplete.length - filesFixed) > 0) {
  console.log('⚠️  Some incomplete pages remain (out of scope or conflicting) — see warnings above.');
  process.exit(conflictWarnings.length || skippedOutOfScope ? 0 : 1);
} else {
  console.log('✅ Every hreflang cluster has full N-way coverage among its real members, with no cross-cluster edges.');
  process.exit(0);
}
