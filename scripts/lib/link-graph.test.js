#!/usr/bin/env node
'use strict';

/**
 * link-graph.test.js — the reachability rules, on in-memory trees.
 *
 * The gate's delta needs git; the rules it applies do not, and have no backlog,
 * so THESE gate. Each resolver case is a Cloudflare Pages behaviour the site
 * depends on (see _redirects' header and scripts/lib/redirects-parse.js); each
 * graph case is a shape measured on the live tree on 2026-11-01.
 *
 *   node scripts/lib/link-graph.test.js
 */

const G = require('./link-graph.js');

let pass = 0;
const fails = [];
function ok(label, cond) { if (cond) pass++; else fails.push(label); }
function eq(label, got, want) {
  ok(`${label} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`, JSON.stringify(got) === JSON.stringify(want));
}

/** A tree from { path: html }. */
function tree(obj, label = 'fixture') {
  const files = new Set(Object.keys(obj));
  return { label, files, read: (rel) => (files.has(rel) ? obj[rel] : null) };
}
const page = (...hrefs) => `<html><head><title>t</title></head><body><h1>x</h1>${hrefs.map((h) => `<a href="${h}">l</a>`).join('')}</body></html>`;
const NOINDEX = '<meta name="robots" content="noindex, nofollow">';

// ── resolver: Cloudflare Pages URL handling ────────────────────────────────
{
  const files = new Set(['index.html', 'a/index.html', 'b/index.html', 'x.html', 'retired-target/index.html']);
  const redirects = [
    '/old/  /a/  301',
    '/old/index.html  /a/  301',
    '/chain/  /old/  301',
    '/b/  /a/  301',
    '/loop1/  /loop2/  301',
    '/loop2/  /loop1/  301',
    '/away/  https://example.com/  301',
    '/abs/  https://ultratextgen.com/a/  301',
    '/404  /404.html  200',
    '/blog/*  /a/  301',
    '/item/:slug  /:slug/  301',
  ].join('\n');
  const R = G.createResolver(files, redirects);
  const at = (p) => { const r = R.resolve(p); return r && r.url; };
  eq('a directory page is served at its slash URL', at('/a/'), '/a/');
  eq('/a 308s to /a/ while a/index.html exists', at('/a'), '/a/');
  eq('/a/index.html 308s to /a/', at('/a/index.html'), '/a/');
  eq('/index.html 308s to /', at('/index.html'), '/');
  eq('a non-index .html file is served without .html', at('/x'), '/x');
  eq('/x.html 308s to /x', at('/x.html'), '/x');
  eq('a static rule matches its exact source', at('/old/'), '/a/');
  eq('a static rule does NOT match the other slash spelling', at('/old'), null);
  eq('a redirect chain is followed to its last page', at('/chain/'), '/a/');
  eq('a _redirects rule applies even when a page exists at the path', at('/b/'), '/a/');
  eq('a redirect loop resolves to nothing', at('/loop1/'), null);
  eq('an off-site redirect leaves the site', at('/away/'), null);
  eq('an absolute same-host redirect target is followed', at('/abs/'), '/a/');
  eq('a 200 rewrite to a non-page file is not a page', at('/404'), null);
  eq('a splat rule matches in order', at('/blog/2026/post'), '/a/');
  eq('a :placeholder is substituted', at('/item/a'), '/a/');
  eq('an asset is not a page', at('/logo.png'), null);
  eq('a path with no file and no rule is a 404', at('/nope/'), null);
  ok('a resolution through a redirect records its hops', R.resolve('/chain/').hops === 2);
  ok('a direct resolution has no hops', R.resolve('/a/').hops === 0);

  eq('a relative href resolves against the page URL', (G.resolveHref(R, '../../a/', '/b/c/') || {}).url, '/a/');
  eq('a same-host absolute href counts', (G.resolveHref(R, 'https://ultratextgen.com/a/', '/') || {}).url, '/a/');
  eq('a www. href counts as the same site', (G.resolveHref(R, 'https://www.ultratextgen.com/a/', '/') || {}).url, '/a/');
  eq('a query string and fragment are ignored', (G.resolveHref(R, '/a/?q=1#top', '/') || {}).url, '/a/');
  eq('an off-site href is not a link', G.resolveHref(R, 'https://example.com/a/', '/'), null);
  eq('a mailto href is not a link', G.resolveHref(R, 'mailto:x@y.z', '/'), null);
  eq('a fragment-only href is not a link', G.resolveHref(R, '#faq', '/'), null);
}

// ── link extraction: only what a crawler parses as an <a href> ─────────────
{
  const html = [
    '<a href="/one/">1</a>',
    "<a class='c' href='/two/'>2</a>",
    '<a title="a > b" href="/three/">3</a>',
    '<a href="/four/?a=1&amp;b=2">4</a>',
    '<!-- <a href="/commented/">c</a> -->',
    '<script>var s = \'<a href="/scripted/">s</a>\';</script>',
    '<script type="application/ld+json">{"text":"<a href=\\"/jsonld/\\">j</a>"}</script>',
    '<template><a href="/templated/">t</a></template>',
    '<link rel="alternate" hreflang="de" href="/de/">',
    '<a name="anchor-only">n</a>',
  ].join('\n');
  eq('extractHrefs keeps real anchors and drops comments, scripts, JSON-LD, templates and <link>',
    G.extractHrefs(html), ['/one/', '/two/', '/three/', '/four/?a=1&b=2']);
}

// ── pages: the sitemap's own definition ────────────────────────────────────
eq('root index.html is a page', G.isPageFile('index.html'), true);
eq('a lane index.html is a page', G.isPageFile('ko/usecase/dantokbang-ireum/index.html'), true);
eq('a non-index .html is not a sitemap page', G.isPageFile('404.html'), false);
eq('an excluded folder holds no pages', G.isPageFile('js/printables/index.html'), false);
eq('a dot folder holds no pages', G.isPageFile('.github/index.html'), false);
eq('fileToUrl maps a directory page to its slash URL', G.fileToUrl('uk/nevydymyi-tekst/index.html'), '/uk/nevydymyi-tekst/');
eq('fileToUrl maps a .html file to its extensionless URL', G.fileToUrl('js/x.test.html'), '/js/x.test');

// ── the graph: orphans, islands and exemptions ─────────────────────────────
const site = {
  'index.html': page('/a/', '/old-b/', '/answers/'),
  'a/index.html': page('/'),
  'b/index.html': page('/'), // reached only through a redirect
  '_redirects': '/old-b/  /b/  301\n',
  'answers/index.html': page('/answers/q/'),
  'answers/q/index.html': page('/answers/'),
  'ko/index.html': page('/'), // reached by nothing here: an orphan
  'ko/x/index.html': page('/ko/y/'), // ko/x <-> ko/y: an island
  'ko/y/index.html': page('/ko/x/'),
  'fixture/index.html': `<html><head>${NOINDEX}</head><body>${page('/hidden-by-nofollow/')}</body></html>`,
  'hidden-by-nofollow/index.html': page('/'),
  'noindex-island/index.html': `<html><head><meta name="robots" content="noindex"></head><body></body></html>`,
};
{
  const g = G.buildGraph(tree(site));
  const a = G.analyse(g);
  eq('a link through a redirect reaches its final page', a.parent.has('/b/'), true);
  eq('viaRedirect counts the link that took a hop', g.viaRedirect, 1);
  eq('unreachable indexable pages, sorted', [...a.unreachable].sort(), ['/hidden-by-nofollow/', '/ko/', '/ko/x/', '/ko/y/']);
  eq('a noindex page is exempt as a target', a.unreachable.has('/noindex-island/') || a.unreachable.has('/fixture/'), false);
  eq('a page with no donor is an orphan', a.details.get('/ko/').kind, 'orphan');
  eq('pages that link only each other are an island', a.details.get('/ko/x/').kind, 'island');
  eq('an island is one component', a.components.find((c) => c.includes('/ko/x/')), ['/ko/x/', '/ko/y/']);
  eq('a nofollow page donates nothing', a.details.get('/hidden-by-nofollow/').kind, 'orphan');
  eq('pathTo gives the route from /', G.pathTo(a.parent, '/answers/q/'), ['/', '/answers/', '/answers/q/']);
  eq('an island is suggested its nearest reachable ancestor', G.suggestDonors('/ko/x/', g, a.parent), ['/']);
}

// ── deliberate non-links are never proposed ─────────────────────────────────
{
  const g = G.buildGraph(tree({
    'index.html': page('/de/'),
    'de/index.html': page('/', '/de/library/'),
    'de/library/index.html': page('/de/answers/'), // the hub is reached, not from a homepage
    'de/answers/index.html': page('/'),
    'de/answers/frage/index.html': page('/'),
    'de/symbol/index.html': page('/'),
  }));
  const a = G.analyse(g);
  eq('no homepage, EN or locale, is ever proposed for an answers/ hub', G.suggestDonors('/de/answers/', g, a.parent), []);
  eq('an answers/ spoke is offered its hub, never a homepage', G.suggestDonors('/de/answers/frage/', g, a.parent), ['/de/answers/']);
  eq('isWithheld: locale homepage -> answers/', G.isWithheld('/de/', '/de/answers/'), true);
  eq('isWithheld: EN homepage -> answers/', G.isWithheld('/', '/answers/'), true);
  eq('isWithheld: a five-character locale homepage -> its answers/', G.isWithheld('/zh-tw/', '/zh-tw/answers/x/'), true);
  eq('isWithheld: a slug merely starting with answers is not the lane', G.isWithheld('/', '/library/answers-faq/'), false);
  eq('isWithheld: a non-locale prefix is not a homepage', G.isWithheld('/xx/', '/xx/answers/'), false);
  eq('isWithheld: a library page -> answers/ is a normal link', G.isWithheld('/library/', '/answers/'), false);
  eq('a symbol/ page may take a homepage link (only the nav is withheld)', G.isWithheld('/de/', '/de/symbol/'), false);
}

// ── the delta rule ─────────────────────────────────────────────────────────
{
  const base = {
    'index.html': page('/tr/'),
    'tr/index.html': page('/', '/hi/'),
    'hi/index.html': page('/hi/guide/'),
    'hi/guide/index.html': page('/hi/'),
    'uk/index.html': page('/uk/a/'), // a pre-existing island
    'uk/a/index.html': page('/uk/'),
  };
  const run = (head, changed, exceptions) => G.reachabilityDelta({
    base: tree(base, 'base'), head: tree(head, 'head'), changedFiles: new Set(changed), exceptions,
  });

  const clean = run(base, []);
  eq('no change: nothing fails', clean.failures.length, 0);
  eq('no change: the standing island is reported as pre-existing', clean.preexisting, [['/uk/', '/uk/a/']]);

  // The real 2026-11-01 shape: a switcher link removed strands a whole locale.
  const lost = run({ ...base, 'tr/index.html': page('/') }, ['tr/index.html']);
  eq('removing the only link into a locale fails every page it stranded', lost.failures.map((f) => f.url), ['/hi/', '/hi/guide/']);
  eq('a stranded page is reported as lost', lost.failures[0].changes, ['lost']);
  eq('the broken hop is named', lost.failures[0].broke && lost.failures[0].broke.why, '/tr/ no longer links /hi/');

  // Two new pages that link only each other: an island added in one PR.
  const added = run({ ...base, 'ko/a/index.html': page('/ko/b/'), 'ko/b/index.html': page('/ko/a/') }, ['ko/a/index.html', 'ko/b/index.html']);
  eq('a new island fails, both members', added.failures.map((f) => [f.url, f.changes[0], f.kind]), [['/ko/a/', 'added', 'island'], ['/ko/b/', 'added', 'island']]);

  // Negative control: a new page linked from a reachable page.
  const linked = run({ ...base, 'tr/index.html': page('/', '/hi/', '/tr/new/'), 'tr/new/index.html': page('/tr/') }, ['tr/index.html', 'tr/new/index.html']);
  eq('a new page linked from a reachable page passes', linked.failures.length, 0);

  // Visible edit to a page that was already an island: it fails.
  const edited = run({ ...base, 'uk/a/index.html': page('/uk/').replace('<h1>x</h1>', '<h1>new words</h1>') }, ['uk/a/index.html']);
  eq('a visible edit to an island page fails', edited.failures.map((f) => [f.url, f.changes[0]]), [['/uk/a/', 'changed']]);

  // A chrome-only change (the static footer) to an island page does not.
  const footer = '<!-- BEGIN static footer --><a href="/x/">x</a><!-- END static footer -->';
  const chrome = run({ ...base, 'uk/a/index.html': page('/uk/').replace('</body>', `${footer}</body>`) }, ['uk/a/index.html']);
  eq('a static-footer-only change to an island page does not fail', chrome.failures.length, 0);

  // A new noindex page is exempt.
  const hidden = run({ ...base, 'ko/f/index.html': `<html><head>${NOINDEX}</head><body></body></html>` }, ['ko/f/index.html']);
  eq('a new noindex page is exempt', hidden.failures.length, 0);

  // Making a noindex island indexable counts as adding it.
  const b2 = { ...base, 'ko/f/index.html': `<html><head><meta name="robots" content="noindex"></head><body><h1>x</h1></body></html>` };
  const reindexed = G.reachabilityDelta({
    base: tree(b2), head: tree({ ...b2, 'ko/f/index.html': page() }), changedFiles: new Set(['ko/f/index.html']),
  });
  eq('removing noindex from an unreachable page counts as adding it', reindexed.failures.map((f) => f.changes[0]), ['added']);

  // The exceptions ledger excuses a failure and still reports it.
  const ex = new Map([['/uk/a/', { route: '/uk/a/', reason: 'under measurement', decided: '2026-11-01', decidedBy: 'test' }]]);
  const excused = run({ ...base, 'uk/a/index.html': page('/uk/').replace('<h1>x</h1>', '<h1>new words</h1>') }, ['uk/a/index.html'], ex);
  eq('an excepted page goes from failing to excused', [excused.failures.length, excused.excused.map((f) => f.url)], [0, ['/uk/a/']]);
  eq('an exception for a reachable page is stale', run(base, [], new Map([['/tr/', {}]])).staleExceptions, ['/tr/']);
}

console.log(`link-graph: ${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log(`  FAIL ${f}`);
process.exit(fails.length ? 1 : 0);
