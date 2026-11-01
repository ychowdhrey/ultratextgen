'use strict';

/**
 * link-graph.js — the ONE definition of "linked" and "reachable" for this site.
 *
 * WHY THIS EXISTS
 * ---------------
 * On 2026-11-01 a static link-graph walk from `/` over every served page found
 * 23 indexable sitemap pages that no chain of links from the homepage reaches:
 * the 9 `/hi/` pages, the 3 `/uk/` pages, four Korean tool pages, one German
 * tool page and six pl/sv/zh-tw Unicode 18 updates. Every CI gate was green.
 * The inbound-link checks that existed were lane-scoped (symbol spokes, library
 * hubs) and asked "does anything link to this page?", which an ISLAND passes:
 * `/ko/araecheomja-byeonhwan/` and `/ko/wicheomja-byeonhwan/` link each other,
 * so each has an inbound link, and neither is reachable from anywhere else.
 *
 * Google's own wording is the bar: "Every page you care about should have a
 * link from at least one other page on your site"
 * (developers.google.com/search/docs/crawling-indexing/links-crawlable), and a
 * crawler that starts at the homepage only meets a page through a chain of
 * links. So the measure here is REACHABILITY FROM `/`, which subsumes the
 * zero-inbound orphan (an orphan is the one-page island) and catches the
 * multi-page island the orphan question cannot.
 *
 * WHAT COUNTS AS A LINK
 * ---------------------
 * An `<a href>` in the page's static HTML, with header, footer, breadcrumbs and
 * language switchers INCLUDED: they are real links a crawler follows. Not
 * counted: hreflang `<link>` tags, the sitemap, `llms.txt`, anything inside
 * `<script>`/`<style>`/`<template>` or an HTML comment, and every page whose
 * robots meta says `nofollow`. Static HTML is the right measure because the site
 * has no runtime language menu (`i18n.js` only highlights `.lang-option`) and
 * `header.js`'s injected nav reaches no page the static graph does not, and
 * several registered crawlers execute no JavaScript at all.
 *
 * HOW A LINK RESOLVES (Cloudflare Pages, modelled)
 * ------------------------------------------------
 * A link through a redirect still reaches the page it lands on, so every href
 * is followed to its final page:
 *   - `_redirects` first, parsed by scripts/lib/redirects-parse.js (the same
 *     model check-redirects.js gates on). Static sources match EXACTLY, slash
 *     included; splat/placeholder rules match in file order after them. Pages
 *     applies a matching rule even when a file exists at the path.
 *   - `X/index.html` is served at `/X/`; `/X` and `/X/index.html` 308 there.
 *   - `X/foo.html` is served at `/X/foo`; `/X/foo.html` 308s there.
 *   - Anything else is an asset or a 404, not a page.
 *
 * WHAT IS A PAGE WE CARE ABOUT
 * ----------------------------
 * Exactly what scripts/update-sitemap.js puts in the sitemap: an `index.html`
 * outside its EXCLUDED_FOLDERS whose robots meta is not `noindex` (its own
 * NOINDEX_RE, imported, not copied). A noindex page is exempt as a target; it
 * still donates links unless it is also nofollow.
 *
 * DELIBERATE NON-LINKS
 * --------------------
 * `answers/` is unlinked from every homepage and `symbol/` has no nav entry,
 * by recorded decision (`.claude/rules/content-architecture.md`). Reachability
 * never demands a particular donor, so neither is ever required here; and the
 * repair hints below never suggest either withheld link. DELIBERATE_NON_LINKS
 * is where those two decisions are encoded, so a hint cannot drift from them.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { parseRedirects } = require('./redirects-parse.js');
const { significanceHash } = require('./content-significance.js');
const { LOCALES } = require('./locale-parent-registry.js');
const { EXCLUDED_FOLDERS, NOINDEX_RE } = require('../update-sitemap.js');

const ROOT = path.resolve(__dirname, '..', '..');
const ORIGIN = 'https://ultratextgen.com';
const SITE_HOSTS = new Set(['ultratextgen.com', 'www.ultratextgen.com']);
const START = '/';
const MAX_HOPS = 10;

const NOFOLLOW_RE = /<meta\s+name=["']robots["']\s+content=["'][^"']*nofollow[^"']*["']/i;

// ─── trees: where the HTML is read from ─────────────────────────────────────

/** Split NUL-separated git output into paths. */
function nulList(buf) {
  return String(buf).split('\0').filter(Boolean);
}

function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: ROOT, maxBuffer: 1 << 30, ...opts });
}

/**
 * The checkout as it stands: tracked files plus untracked, non-ignored ones,
 * read from disk. Untracked files are included so a page that is not committed
 * yet is not silently absent; the gate's "changed" set includes them too.
 */
function workingTree(root = ROOT) {
  const files = new Set(
    nulList(git(['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root }))
      .filter((f) => fs.existsSync(path.join(root, f)))
  );
  return {
    label: 'working tree',
    files,
    read(rel) {
      try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch { return null; }
    },
  };
}

/**
 * Read many blobs in one `git cat-file --batch` call. `specs` are `<rev>:<path>`.
 * Returns Map spec -> string (null when the blob is missing).
 */
function readBlobs(specs, root = ROOT) {
  const map = new Map();
  if (!specs.length) return map;
  const out = git(['cat-file', '--batch'], { cwd: root, input: specs.join('\n') + '\n' });
  let pos = 0;
  for (const spec of specs) {
    const nl = out.indexOf(0x0a, pos);
    const header = out.toString('utf8', pos, nl);
    pos = nl + 1;
    if (/ missing$/.test(header)) { map.set(spec, null); continue; }
    const size = Number(header.split(' ')[2]);
    map.set(spec, out.toString('utf8', pos, pos + size));
    pos += size + 1;
  }
  return map;
}

/**
 * The tree at commit `rev`. Files the working tree still holds byte-for-byte
 * are read from disk (fast); every other `.html` and `_redirects` comes from
 * git. `differs` is the set of paths whose working-tree content differs from
 * `rev` (git diff --name-only rev); the caller already has it.
 */
function commitTree(rev, differs, root = ROOT) {
  const files = new Set(nulList(git(['ls-tree', '-r', '-z', '--name-only', rev], { cwd: root })));
  const fromGit = [...files].filter((f) => differs.has(f) && (f.endsWith('.html') || f === '_redirects'));
  const blobs = readBlobs(fromGit.map((f) => `${rev}:${f}`), root);
  return {
    label: `commit ${rev.slice(0, 12)}`,
    files,
    read(rel) {
      if (!files.has(rel)) return null;
      if (differs.has(rel)) {
        const spec = `${rev}:${rel}`;
        return blobs.has(spec) ? blobs.get(spec) : readBlobs([spec], root).get(spec);
      }
      try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch { return null; }
    },
  };
}

// ─── pages ───────────────────────────────────────────────────────────────────

/** A file the sitemap would list if it is not noindex (update-sitemap.js's walk). */
function isPageFile(rel) {
  if (!rel.endsWith('index.html') || !(rel === 'index.html' || rel.endsWith('/index.html'))) return false;
  const dirs = rel.split('/').slice(0, -1);
  return !dirs.some((d) => d.startsWith('.') || EXCLUDED_FOLDERS.includes(d));
}

/** The URL Pages serves a .html file at. */
function fileToUrl(rel) {
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel.slice(0, -'.html'.length)}`;
}

function robots(html) {
  return { noindex: NOINDEX_RE.test(html), nofollow: NOFOLLOW_RE.test(html) };
}

// ─── links ───────────────────────────────────────────────────────────────────

const A_TAG_RE = /<a\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;
const HREF_ATTR_RE = /(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i;

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Every `<a href>` value in the static markup a crawler would parse. */
function extractHrefs(html) {
  const markup = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<template\b[\s\S]*?<\/template\s*>/gi, ' ');
  const out = [];
  let m;
  A_TAG_RE.lastIndex = 0;
  while ((m = A_TAG_RE.exec(markup)) !== null) {
    const h = HREF_ATTR_RE.exec(m[1]);
    if (!h) continue;
    out.push(decodeEntities((h[1] ?? h[2] ?? h[3]).trim()));
  }
  return out;
}

// ─── resolution ──────────────────────────────────────────────────────────────

function compilePattern(from) {
  const names = [];
  const src = from.split(/(\*|:[A-Za-z]\w*)/).map((part) => {
    if (part === '*') { names.push('splat'); return '(.*)'; }
    if (/^:[A-Za-z]/.test(part)) { names.push(part.slice(1)); return '([^/]+)'; }
    return part.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
  return { re: new RegExp(`^${src}$`), names };
}

/**
 * Build a resolver over a tree. resolve(pathname) follows `_redirects` and the
 * Pages slash/`.html` rules to the page that finally serves, and returns
 * `{ url, file, hops }` — or null when the path ends on no HTML page (an asset,
 * a 404, a loop, an off-site redirect).
 */
function createResolver(files, redirectsText) {
  const parsed = parseRedirects(redirectsText || '');
  const statics = new Map();
  const dynamics = [];
  for (const r of parsed.rules) {
    if (r.ownDynamic) dynamics.push({ rule: r, ...compilePattern(r.from) });
    else if (!statics.has(r.from)) statics.set(r.from, r);
  }
  const cache = new Map();

  function matchRule(p) {
    const s = statics.get(p);
    if (s) return { rule: s, to: s.to };
    for (const d of dynamics) {
      const m = d.re.exec(p);
      if (!m) continue;
      let to = d.rule.to;
      d.names.forEach((n, i) => { to = to.split(`:${n}`).join(m[i + 1]); });
      return { rule: d.rule, to };
    }
    return null;
  }

  function resolve(pathname) {
    if (cache.has(pathname)) return cache.get(pathname);
    let p = pathname;
    let hops = 0;
    let result = null;
    const seen = new Set();
    while (hops <= MAX_HOPS && !seen.has(p)) {
      seen.add(p);
      const hit = matchRule(p);
      if (hit) {
        let next;
        try { next = new URL(hit.to, ORIGIN + p); } catch { break; }
        if (!SITE_HOSTS.has(next.hostname)) break;
        p = safeDecode(next.pathname);
        hops++;
        continue;
      }
      const rel = p.slice(1);
      if (p.endsWith('/')) {
        if (files.has(`${rel}index.html`)) { result = { url: p, file: `${rel}index.html`, hops }; break; }
        if (p !== '/' && files.has(`${rel.slice(0, -1)}.html`)) { p = p.slice(0, -1); hops++; continue; }
        break;
      }
      if (p.endsWith('/index.html')) { p = p.slice(0, -'index.html'.length); hops++; continue; }
      if (p.endsWith('.html')) {
        if (files.has(rel)) { p = p.slice(0, -'.html'.length); hops++; continue; }
        break;
      }
      if (files.has(`${rel}/index.html`)) { p = `${p}/`; hops++; continue; }
      if (files.has(`${rel}.html`)) { result = { url: p, file: `${rel}.html`, hops }; break; }
      break;
    }
    cache.set(pathname, result);
    return result;
  }

  return { resolve, invalidRules: parsed.invalid };
}

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

/** Resolve one href found on the page served at `fromUrl`. */
function resolveHref(resolver, href, fromUrl) {
  if (!href || href.startsWith('#')) return null;
  let u;
  try { u = new URL(href, ORIGIN + fromUrl); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || !SITE_HOSTS.has(u.hostname)) return null;
  return resolver.resolve(safeDecode(u.pathname));
}

// ─── the graph ───────────────────────────────────────────────────────────────

/**
 * pages: Map url -> { file, page, indexable, nofollow }   (every served .html)
 * edges: Map url -> Set<url>                              (resolved, self-links dropped)
 * viaRedirect: count of links that reached their page through at least one hop
 */
function buildGraph(tree) {
  const redirectsText = tree.files.has('_redirects') ? tree.read('_redirects') : '';
  const htmlFiles = [...tree.files].filter((f) => f.endsWith('.html')).sort();
  const files = tree.files;
  const resolver = createResolver(files, redirectsText);
  const pages = new Map();
  const edges = new Map();
  let viaRedirect = 0;
  let linkCount = 0;

  for (const file of htmlFiles) {
    const dirs = file.split('/').slice(0, -1);
    if (dirs.some((d) => d.startsWith('.'))) continue;
    const html = tree.read(file);
    if (html == null) continue;
    const url = fileToUrl(file);
    const r = robots(html);
    const page = isPageFile(file);
    pages.set(url, { file, page, indexable: page && !r.noindex, nofollow: r.nofollow });
    const out = new Set();
    if (!r.nofollow) {
      for (const href of extractHrefs(html)) {
        const hit = resolveHref(resolver, href, url);
        if (!hit || hit.url === url) continue;
        linkCount++;
        if (hit.hops > 0) viaRedirect++;
        out.add(hit.url);
      }
    }
    edges.set(url, out);
  }
  return { label: tree.label, pages, edges, viaRedirect, linkCount, hasRedirects: tree.files.has('_redirects') };
}

/** BFS from `start`; returns Map url -> parent url (start maps to null). */
function reach(graph, start = START) {
  const parent = new Map();
  if (!graph.pages.has(start)) return parent;
  parent.set(start, null);
  const queue = [start];
  while (queue.length) {
    const u = queue.shift();
    for (const v of graph.edges.get(u) || []) {
      if (!parent.has(v)) { parent.set(v, u); queue.push(v); }
    }
  }
  return parent;
}

/** The chain of pages `/` -> ... -> url, from a reach() map. */
function pathTo(parent, url) {
  if (!parent.has(url)) return null;
  const chain = [];
  for (let u = url; u != null; u = parent.get(u)) chain.unshift(u);
  return chain;
}

/** Map url -> Set of urls linking to it. */
function inbound(graph) {
  const inn = new Map();
  for (const [u, outs] of graph.edges) {
    for (const v of outs) {
      if (!inn.has(v)) inn.set(v, new Set());
      inn.get(v).add(u);
    }
  }
  return inn;
}

/**
 * Every indexable page `/` does not reach, classified:
 *   orphan  — no other page links to it at all;
 *   island  — it has donors, but every one is itself unreachable.
 * Grouped into components (pages joined by links in either direction among the
 * unreachable set), because an island is fixed once, from outside, not per page.
 */
function analyse(graph, start = START) {
  const parent = reach(graph, start);
  const inn = inbound(graph);
  const indexable = [...graph.pages].filter(([, p]) => p.indexable).map(([u]) => u);
  const unreachable = indexable.filter((u) => !parent.has(u)).sort();
  const un = new Set(unreachable);
  const details = new Map();
  for (const u of unreachable) {
    const donors = [...(inn.get(u) || [])].sort();
    details.set(u, { url: u, file: graph.pages.get(u).file, kind: donors.length ? 'island' : 'orphan', donors });
  }
  // components over the unreachable set
  const comp = new Map();
  const components = [];
  for (const u of unreachable) {
    if (comp.has(u)) continue;
    const members = [];
    const stack = [u];
    comp.set(u, components.length);
    while (stack.length) {
      const x = stack.pop();
      members.push(x);
      const nbrs = [...(graph.edges.get(x) || []), ...(inn.get(x) || [])];
      for (const y of nbrs) {
        if (un.has(y) && !comp.has(y)) { comp.set(y, components.length); stack.push(y); }
      }
    }
    components.push(members.sort());
  }
  return { parent, inbound: inn, indexable: new Set(indexable), unreachable: un, details, components, componentOf: comp };
}

// ─── repair hints ────────────────────────────────────────────────────────────

const LOCALE_SET = new Set(LOCALES);

function localeOf(url) {
  const first = url.split('/')[1];
  return LOCALE_SET.has(first) ? first : null;
}

function homepageOf(url) {
  const lc = localeOf(url);
  return lc ? `/${lc}/` : '/';
}

/** The lane a URL sits in, after its locale prefix: '/de/answers/x/' -> 'answers'. */
function laneOf(url) {
  const parts = url.split('/').filter(Boolean);
  const rest = localeOf(url) ? parts.slice(1) : parts;
  return rest[0] || '';
}

/**
 * The two links this site withholds on purpose. A hint never proposes them.
 * `donor` tests the would-be linking page, `target` the unreachable one.
 */
const DELIBERATE_NON_LINKS = [
  {
    id: 'answers-from-homepage',
    why: '`answers/` is deliberately not linked from any homepage (docs/decisions/content-lanes.md)',
    donor: (url) => url === homepageOf(url),
    target: (url) => laneOf(url) === 'answers',
  },
  {
    id: 'symbol-in-nav',
    why: '`symbol/` deliberately has no nav entry; its discovery is search- and pin-driven',
    donor: () => false, // the nav is header.js, never a page donor; the hint never names it
    target: (url) => laneOf(url) === 'symbol',
  },
];

function isWithheld(donorUrl, targetUrl) {
  return DELIBERATE_NON_LINKS.some((d) => d.target(targetUrl) && d.donor(donorUrl));
}

/**
 * Reachable pages that would naturally link an unreachable one: its own
 * ancestors in the URL tree, nearest first (a lane hub before the homepage),
 * minus any link DELIBERATE_NON_LINKS withholds.
 */
function suggestDonors(url, graph, parent, limit = 3) {
  const out = [];
  const parts = url.split('/').filter(Boolean);
  for (let i = parts.length - 1; i >= 0 && out.length < limit; i--) {
    const anc = i === 0 ? '/' : `/${parts.slice(0, i).join('/')}/`;
    if (anc === url || !parent.has(anc) || isWithheld(anc, url)) continue;
    out.push(anc);
  }
  return out;
}

// ─── the delta rule (what check-link-reachability.js gates on) ───────────────

const EXCEPTIONS_FILE = path.join(ROOT, 'data', 'link_reachability_exceptions.json');

/** Map route -> entry. Throws on unreadable JSON: an unparseable ledger is UNKNOWN, not empty. */
function loadExceptions(file = EXCEPTIONS_FILE) {
  if (!fs.existsSync(file)) return new Map();
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  const map = new Map();
  for (const e of parsed.exceptions || []) {
    if (!e || !e.route) continue;
    map.set(`${String(e.route).replace(/\/+$/, '')}/`, e);
  }
  return map;
}

/**
 * The first hop of the merge base's own route to `url` that the branch no
 * longer has — the link (or page) whose removal stranded it.
 */
function brokenHop(chain, gHead) {
  for (let i = 0; i < chain.length - 1; i++) {
    const from = chain[i];
    const to = chain[i + 1];
    if (!gHead.pages.has(from)) return { from, to, why: `${from} no longer exists on this branch` };
    if (!(gHead.edges.get(from) || new Set()).has(to)) return { from, to, why: `${from} no longer links ${to}` };
  }
  return null;
}

/**
 * Compare the merge base with the branch. A page FAILS when it is indexable on
 * the branch, `/` does not reach it there, and either
 *   added    — the branch adds it, or makes a noindex page indexable;
 *   changed  — the branch changes it in a way a reader can see. "Changed" is
 *              content-significance.js's definition (the one the sitemap's
 *              <lastmod> uses), so a static-footer rebuild or a punctuation
 *              pass that sweeps every page never drags the standing backlog
 *              into an unrelated PR; or
 *   lost     — `/` reached it at the merge base. A sweep that removes a link is
 *              caught here whatever else it touched.
 * Every other unreachable page is PRE-EXISTING: reported, never counted.
 *
 * `changedFiles` is every path whose content differs between base and head.
 */
function reachabilityDelta({ base, head, changedFiles, exceptions = new Map() }) {
  const gBase = buildGraph(base);
  const gHead = buildGraph(head);
  const aBase = analyse(gBase);
  const aHead = analyse(gHead);
  const hits = new Map();
  const flag = (url, change) => {
    if (!hits.has(url)) hits.set(url, { url, changes: [] });
    hits.get(url).changes.push(change);
  };

  for (const file of changedFiles) {
    if (!file.endsWith('.html')) continue;
    const url = fileToUrl(file);
    const hp = gHead.pages.get(url);
    if (!hp || !hp.indexable || hp.file !== file || aHead.parent.has(url)) continue;
    const bp = gBase.pages.get(url);
    if (!bp || !bp.indexable) { flag(url, 'added'); continue; }
    if (significanceHash(head.read(file) || '') !== significanceHash(base.read(file) || '')) flag(url, 'changed');
  }
  for (const url of aHead.unreachable) {
    if (aBase.parent.has(url)) flag(url, 'lost');
  }

  const failures = [];
  const excused = [];
  for (const hit of [...hits.values()].sort((a, b) => a.url.localeCompare(b.url))) {
    const d = aHead.details.get(hit.url);
    const entry = {
      ...hit,
      kind: d.kind,
      file: d.file,
      donors: d.donors,
      component: aHead.components[aHead.componentOf.get(hit.url)],
      suggest: suggestDonors(hit.url, gHead, aHead.parent),
      broke: hit.changes.includes('lost') ? brokenHop(pathTo(aBase.parent, hit.url), gHead) : null,
      baseRoute: hit.changes.includes('lost') ? pathTo(aBase.parent, hit.url) : null,
    };
    if (exceptions.has(hit.url)) excused.push({ ...entry, exception: exceptions.get(hit.url) });
    else failures.push(entry);
  }
  const counted = new Set(hits.keys());
  const preexisting = aHead.components
    .map((c) => c.filter((u) => !counted.has(u)))
    .filter((c) => c.length);
  const staleExceptions = [...exceptions.keys()].filter((r) => !aHead.unreachable.has(r));
  return { gBase, gHead, aBase, aHead, failures, excused, preexisting, staleExceptions };
}

module.exports = {
  ROOT,
  START,
  EXCEPTIONS_FILE,
  DELIBERATE_NON_LINKS,
  loadExceptions,
  reachabilityDelta,
  brokenHop,
  workingTree,
  commitTree,
  readBlobs,
  isPageFile,
  fileToUrl,
  robots,
  extractHrefs,
  createResolver,
  resolveHref,
  buildGraph,
  reach,
  pathTo,
  inbound,
  analyse,
  suggestDonors,
  isWithheld,
};
