#!/usr/bin/env node
'use strict';

/**
 * check-link-reachability.js — per-PR gate: no new island off the homepage.
 *
 * An indexable page that no chain of static `<a href>` links from `/` reaches
 * is invisible to a crawler that starts at the homepage. A page with zero
 * inbound links is the one-page case; the case that had no gate is the ISLAND:
 * pages that link each other and that nothing reachable links. On 2026-11-01
 * 23 indexable sitemap pages were in that state with every gate green, because
 * each island member had an inbound link from another member.
 *
 * What a link is, how a link through a redirect resolves, which pages count
 * and the two deliberate non-links are all defined once, in
 * scripts/lib/link-graph.js. This file only runs the comparison.
 *
 * DELTA-SCOPED. Islands stand on main deliberately (some pages are under
 * active measurement), so a state check would be red on every PR. A page fails
 * only when the branch
 *   - adds it (or makes it indexable) and `/` does not reach it,
 *   - changes it visibly (content-significance.js) and `/` does not reach it, or
 *   - makes it unreachable when `/` reached it at the merge base.
 * Pre-existing islands are REPORTED every run, never silenced, and never
 * counted against the branch.
 *
 * Usage:
 *   npm run check:link-reachability
 *   node scripts/check-link-reachability.js --base origin/main
 *   node scripts/check-link-reachability.js --exceptions <ledger.json>
 *
 * Reads the working tree as the branch head (tracked plus untracked files), so
 * an uncommitted page is checked rather than silently missed.
 *
 * Exit 0 = clean, 1 = this branch strands a page, 2 = UNKNOWN (base, merge
 * base, ledger or homepage could not be read; nothing was compared).
 */

const path = require('path');
const { execFileSync } = require('child_process');
const G = require('./lib/link-graph.js');

const args = process.argv.slice(2);
const argOf = (flag, dflt) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
};
const requestedBase = argOf('--base', 'origin/main');
const exceptionsFile = path.resolve(argOf('--exceptions', G.EXCEPTIONS_FILE));

function git(cmdArgs, opts = {}) {
  return execFileSync('git', cmdArgs, { cwd: G.ROOT, encoding: 'utf8', maxBuffer: 1 << 30, ...opts });
}

function unknown(msg) {
  console.error(`UNKNOWN: ${msg}`);
  console.error('Nothing was compared. This is not a pass.');
  process.exit(2);
}

function resolveBase(base) {
  try {
    git(['rev-parse', '--verify', `${base}^{commit}`], { stdio: 'ignore' });
    return base;
  } catch {
    const branch = base.replace(/^origin\//, '');
    try {
      git(['fetch', '--depth=200', 'origin', branch], { stdio: 'ignore' });
      const candidate = `origin/${branch}`;
      git(['rev-parse', '--verify', `${candidate}^{commit}`], { stdio: 'ignore' });
      return candidate;
    } catch (e) {
      return unknown(`could not resolve or fetch base ref "${base}": ${e.message.split('\n')[0]}`);
    }
  }
}

const base = resolveBase(requestedBase);
let mergeBase;
try {
  mergeBase = git(['merge-base', base, 'HEAD']).trim();
} catch (e) {
  unknown(`no merge base between ${base} and HEAD (a shallow clone? run git fetch --deepen=200): ${e.message.split('\n')[0]}`);
}

let exceptions;
try {
  exceptions = G.loadExceptions(exceptionsFile);
} catch (e) {
  unknown(`${path.relative(G.ROOT, exceptionsFile)} is not valid JSON: ${e.message}`);
}

// Every path whose content differs between the merge base and the working tree.
const changedFiles = new Set([
  ...git(['diff', '--name-only', '-z', mergeBase]).split('\0').filter(Boolean),
  ...git(['ls-files', '-z', '--others', '--exclude-standard']).split('\0').filter(Boolean),
]);

const head = G.workingTree();
const baseTree = G.commitTree(mergeBase, changedFiles);
const r = G.reachabilityDelta({ base: baseTree, head, changedFiles, exceptions });

// A graph with no homepage, or a homepage with no links, cannot answer the
// question: every page would read as unreachable, or none would be compared.
for (const [label, g] of [['branch', r.gHead], ['merge base', r.gBase]]) {
  if (!g.pages.has(G.START)) unknown(`the ${label} tree has no index.html, so there is no / to walk from`);
  if (!(g.edges.get(G.START) || new Set()).size) unknown(`the link extractor found no links on / in the ${label} tree`);
}

const fmt = (n) => n.toLocaleString('en-US');
console.log('Link Reachability Check — indexable pages a crawler starting at / can reach');
console.log('============================================================================\n');
console.log(`Base: ${base}   merge base: ${mergeBase.slice(0, 12)}`);
for (const [label, g, a] of [['merge base', r.gBase, r.aBase], ['this branch', r.gHead, r.aHead]]) {
  console.log(`  ${label.padEnd(11)}  ${fmt(a.indexable.size)} indexable pages, ${fmt(a.indexable.size - a.unreachable.size)} reachable from /, ` +
    `${fmt(a.unreachable.size)} not (${fmt(g.linkCount)} internal links, ${fmt(g.viaRedirect)} through a redirect)`);
}
const htmlChanged = [...changedFiles].filter((f) => f.endsWith('.html')).length;
console.log(`  ${fmt(htmlChanged)} .html file(s) differ from the merge base\n`);

const WHAT = { added: 'added or made indexable here', changed: 'visibly changed here', lost: 'reachable at the merge base, not here' };

/**
 * One block per island, not per page: a 9-page locale stranded by one removed
 * link is one defect with one fix, and printing it nine times buries that.
 */
function describeGroup(group) {
  const lines = [];
  const members = group.component;
  const failing = new Map(group.items.map((f) => [f.url, f]));
  const head = members.length === 1
    ? (group.items[0].kind === 'orphan' ? 'orphan: no page links to it' : 'unreachable page')
    : `island of ${members.length}: these pages link each other, and no page / reaches links any of them`;
  lines.push(`  ✗ ${head}`);
  for (const u of members) {
    const f = failing.get(u);
    lines.push(`      ${f ? '✗' : '·'} ${u}${f ? `   (${f.changes.map((c) => WHAT[c]).join('; ')})` : '   (already unreachable; not counted)'}`);
  }
  // One line per distinct broken hop, shown on the shortest route through it
  // (the island's entry point), not on whichever member happened to sort last.
  const broken = [];
  const seenWhy = new Set();
  for (const f of group.items.filter((x) => x.broke).sort((a, b) => a.baseRoute.length - b.baseRoute.length)) {
    if (seenWhy.has(f.broke.why)) continue;
    seenWhy.add(f.broke.why);
    broken.push(f);
  }
  for (const f of broken) {
    lines.push(`      the merge base reached ${f.url} via ${f.baseRoute.join(' → ')}`);
    lines.push(`      broken here: ${f.broke.why}`);
  }
  const suggest = [...new Set(group.items.flatMap((f) => f.suggest))].slice(0, 3);
  const fix = suggest.length
    ? `one link from a page / reaches, e.g. ${suggest.join(' or ')} (nearest reachable ancestors)`
    : 'one link from any page / reaches (no reachable ancestor in its URL path)';
  lines.push(`      fix: ${fix}${members.length > 1 ? '; one link into the island reaches all of it' : ''}.`);
  return lines.join('\n');
}

if (r.failures.length) {
  const groups = new Map();
  for (const f of r.failures) {
    const key = f.component.join(' ');
    if (!groups.has(key)) groups.set(key, { component: f.component, items: [] });
    groups.get(key).items.push(f);
  }
  console.log(`ERRORS — ${r.failures.length} page(s) in ${groups.size} group(s) this branch leaves unreachable from /:\n`);
  for (const g of groups.values()) console.log(describeGroup(g) + '\n');
  console.log('A link counts from anywhere a crawler parses: body, header, footer, breadcrumb or language switcher.');
  console.log('Hreflang tags, sitemap.xml and llms.txt do not. The deliberate non-links stay withheld:');
  for (const d of G.DELIBERATE_NON_LINKS) console.log(`  - ${d.why}`);
  console.log('');
}

if (r.excused.length) {
  console.log(`EXCUSED by ${path.relative(G.ROOT, exceptionsFile)} — ${r.excused.length} (reported, not counted):`);
  for (const f of r.excused) {
    console.log(`  ~ ${f.url}  — ${f.exception.reason || 'no reason recorded'} (${f.exception.decided || 'undated'}, ${f.exception.decidedBy || 'no owner'})`);
  }
  console.log('');
}
if (r.staleExceptions.length) {
  console.log(`NOTE — ${r.staleExceptions.length} exception(s) name a page / now reaches or that no longer exists; the entry can be retired:`);
  for (const route of r.staleExceptions) console.log(`  - ${route}`);
  console.log('');
}

const pre = r.preexisting.reduce((n, c) => n + c.length, 0);
if (pre) {
  console.log(`PRE-EXISTING — ${pre} indexable page(s) in ${r.preexisting.length} group(s) were already unreachable and this branch did not touch them.`);
  console.log('Reported, never silenced, not counted against this branch (whole-site detail: npm run audit:link-reachability):');
  for (const c of r.preexisting) console.log(`  · ${c.join(', ')}`);
  console.log('');
} else {
  console.log('PRE-EXISTING — none: every indexable page is reachable from /.\n');
}

if (r.failures.length) {
  console.log(`FAIL — ${r.failures.length} page(s) stranded by this branch.`);
  process.exit(1);
}
console.log('PASS — this branch strands no indexable page.');
process.exit(0);
