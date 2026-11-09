#!/usr/bin/env node
'use strict';

/**
 * audit-link-reachability.js — whole-site dashboard of pages `/` cannot reach.
 *
 * Informational. The gate (check-link-reachability.js) counts only what a
 * branch changes; this lists the whole standing backlog, grouped into islands,
 * with each group's nearest reachable ancestors as candidate donors. Both read
 * the same definitions in scripts/lib/link-graph.js, so they cannot disagree
 * about what "reachable" means.
 *
 * It also cross-checks its page set against sitemap.xml: the two must list the
 * same URLs, because both come from update-sitemap.js's definition. A mismatch
 * on a branch usually means the sitemap has not been regenerated yet (it is
 * rebuilt after merge); on main it means the definitions drifted.
 *
 * Usage:
 *   npm run audit:link-reachability
 *   node scripts/audit-link-reachability.js --json
 *
 * Exit 0 = report written (whatever it found), 2 = UNKNOWN (no homepage, or
 * no links on it, so nothing could be measured).
 */

const fs = require('fs');
const path = require('path');
const G = require('./lib/link-graph.js');

const asJson = process.argv.includes('--json');
const tree = G.workingTree();
const graph = G.buildGraph(tree);
if (!graph.pages.has(G.START) || !(graph.edges.get(G.START) || new Set()).size) {
  console.error('UNKNOWN: no index.html, or no links found on it, so reachability cannot be measured. This is not a pass.');
  process.exit(2);
}
const a = G.analyse(graph);
let exceptions = new Map();
try { exceptions = G.loadExceptions(); } catch (e) {
  console.error(`UNKNOWN: ${path.relative(G.ROOT, G.EXCEPTIONS_FILE)} is not valid JSON: ${e.message}`);
  process.exit(2);
}

let sitemapDrift = null;
const sitemapPath = path.join(G.ROOT, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  const locs = new Set([...fs.readFileSync(sitemapPath, 'utf8').matchAll(/<loc>https:\/\/ultratextgen\.com([^<]*)<\/loc>/g)].map((m) => m[1]));
  sitemapDrift = {
    notInSitemap: [...a.indexable].filter((u) => !locs.has(u)).sort(),
    sitemapOnly: [...locs].filter((u) => !a.indexable.has(u)).sort(),
  };
}

const groups = a.components.map((members) => ({
  members: members.map((u) => ({ ...a.details.get(u), excused: exceptions.has(u) })),
  suggest: [...new Set(members.flatMap((u) => G.suggestDonors(u, graph, a.parent)))].slice(0, 3),
}));

if (asJson) {
  console.log(JSON.stringify({
    indexable: a.indexable.size,
    reachable: a.indexable.size - a.unreachable.size,
    unreachable: a.unreachable.size,
    internalLinks: graph.linkCount,
    linksThroughRedirect: graph.viaRedirect,
    groups,
    sitemapDrift,
  }, null, 2));
  process.exit(0);
}

const fmt = (n) => n.toLocaleString('en-US');
console.log('Link Reachability Audit — whole site, informational');
console.log('===================================================\n');
console.log(`${fmt(a.indexable.size)} indexable pages; ${fmt(a.indexable.size - a.unreachable.size)} reachable from /; ${fmt(a.unreachable.size)} not.`);
console.log(`${fmt(graph.linkCount)} internal page-to-page links, ${fmt(graph.viaRedirect)} of them through a redirect.\n`);

if (!groups.length) {
  console.log('Every indexable page is reachable from /.');
} else {
  console.log(`${groups.length} group(s), largest first:\n`);
  for (const g of groups.sort((x, y) => y.members.length - x.members.length)) {
    const kind = g.members.length === 1 ? (g.members[0].kind === 'orphan' ? 'orphan (no inbound link at all)' : 'island of 1') : `island of ${g.members.length}`;
    console.log(`  ${kind}`);
    for (const m of g.members) console.log(`    ${m.url}${m.excused ? '   [excused by ledger]' : ''}`);
    console.log(`    candidate donors: ${g.suggest.length ? g.suggest.join(', ') : 'none in its URL path'}\n`);
  }
}

if (sitemapDrift) {
  const { notInSitemap, sitemapOnly } = sitemapDrift;
  if (!notInSitemap.length && !sitemapOnly.length) console.log('sitemap.xml lists exactly the indexable pages measured here.');
  else {
    console.log(`sitemap.xml differs: ${notInSitemap.length} indexable page(s) not in it, ${sitemapOnly.length} URL(s) only in it.`);
    for (const u of [...notInSitemap, ...sitemapOnly].slice(0, 10)) console.log(`  ${u}`);
  }
} else {
  console.log('sitemap.xml not found; page set not cross-checked.');
}
process.exit(0);
