#!/usr/bin/env node

const fs   = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');
const { significanceHash, pickSignificantDate } = require('./lib/content-significance');

const BASE_URL     = 'https://ultratextgen.com';
const SITEMAP_PATH = path.resolve(__dirname, '..', 'sitemap.xml');
const REPO_ROOT    = path.resolve(__dirname, '..');
const LASTMOD_CACHE = path.resolve(__dirname, '..', 'data', 'sitemap-lastmod-cache.json');

const EXCLUDED_FOLDERS = [
  'assets', 'css', 'js', 'images', 'img',
  'fonts', 'data', 'scripts', 'node_modules',
  'dist', 'build', '.git'
];

// ─── Filesystem scan ──────────────────────────────────────────────────────────

function findIndexFiles(dir, relativePath = '') {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue; // skip hidden dirs/files
    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (EXCLUDED_FOLDERS.includes(entry.name)) continue;
      results.push(...findIndexFiles(path.join(dir, entry.name), relPath));
    } else if (entry.name === 'index.html') {
      results.push(relPath);
    }
  }

  return results;
}

// ─── Image SEO ────────────────────────────────────────────────────────────────

// Matches both attribute-quote styles used across the repo's page templates
// (double-quoted, hand-authored pages vs single-quoted, generator-authored
// locale pages) — see docs/image-seo-fixes.md for the og:image convention.
const OG_IMAGE_RE = /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/;
const LOGO_FALLBACK = `${BASE_URL}/logo.png`;

// Decorative figures are stripped before scanning for content images. The hero
// banner restates the page's own <h1>, so wire-site-art.py ships it as
// aria-hidden with a null alt — the WCAG-correct call for an image that adds
// nothing a screen reader user isn't already getting. An image sitemap should
// list images we want *indexed*, and a decorative one is by definition not that.
const DECORATIVE_FIGURE_RE = /<figure\b[^>]*\baria-hidden=["']true["'][^>]*>[\s\S]*?<\/figure>/gi;
const IMG_TAG_RE = /<img\b[^>]*>/gi;
const SRC_RE = /\bsrc=["']([^"']+)["']/i;
const ALT_RE = /\balt=["']([^"']*)["']/i;

// Content images: an <img> with a real (non-empty) alt, outside any decorative
// figure. That rule is the reason specimen charts (assets/specimen/*.png — a
// rendered grid of the page's own symbols, which carries information the prose
// does not) get declared, while the ~2,000 decorative hero SVGs never do. It is
// deliberately a property of the markup rather than a hardcoded path: any future
// content image described well enough to deserve indexing qualifies on its own,
// and nothing here needs updating when one is added.
function getContentImages(html) {
  const out = [];
  for (const tag of html.replace(DECORATIVE_FIGURE_RE, '').match(IMG_TAG_RE) || []) {
    if (/\baria-hidden=["']true["']/i.test(tag)) continue;
    const alt = tag.match(ALT_RE);
    if (!alt || !alt[1].trim()) continue;
    const src = tag.match(SRC_RE);
    if (!src) continue;
    const url = src[1].trim();
    // Same-origin only. A data: URI has no URL to index, and an image we do not
    // host is not ours to declare. `//host/path` is protocol-relative and points
    // at another origin despite its leading slash — prefixing it would produce
    // https://ultratextgen.com//cdn.example.com/... and declare an image that
    // 404s. Caught by update-sitemap.test.js rather than by review.
    if (url.startsWith('//')) continue;
    if (url.startsWith('/')) out.push(`${BASE_URL}${url}`);
    else if (url.startsWith(`${BASE_URL}/`)) out.push(url);
  }
  return out;
}

// Every image this page wants indexed, og:image first, de-duplicated. A page may
// legitimately declare several — the sitemap spec allows up to 1,000 per URL.
function getPageImages(filePath) {
  let html;
  try {
    html = fs.readFileSync(path.join(REPO_ROOT, filePath), 'utf8');
  } catch {
    return [];
  }
  const images = [];
  const og = html.match(OG_IMAGE_RE);
  if (og && og[1] !== LOGO_FALLBACK) images.push(og[1]);
  images.push(...getContentImages(html));
  return [...new Set(images)];
}

// A sitemap is a list of pages we WANT indexed — advertising a noindex page
// (the /usecase/*/embed/ widgets, etc.) sends crawlers a contradictory signal.
const NOINDEX_RE = /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex[^"']*["']/i;

function isNoindex(filePath) {
  try {
    return NOINDEX_RE.test(fs.readFileSync(path.join(REPO_ROOT, filePath), 'utf8'));
  } catch {
    return false;
  }
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

function pathToUrl(filePath) {
  if (filePath === 'index.html') return '/';
  // Use forward slashes explicitly — safe on all OSes
  const parts = filePath.split('/');
  // Drop trailing 'index.html'
  parts.pop();
  return '/' + parts.join('/') + '/';
}

function getUrlDefaults(url) {
  if (url === '/') {
    return { changefreq: 'daily', priority: '1.0' };
  }
  if (url === '/category/') {
    return { changefreq: 'weekly', priority: '0.9' };
  }
  // /category/foo/bar/ — category subpage
  if (/^\/category\/[^/]+\/[^/]+\/$/.test(url)) {
    return { changefreq: 'monthly', priority: '0.7' };
  }
  // /category/foo/ — category family index
  if (/^\/category\/[^/]+\/$/.test(url)) {
    return { changefreq: 'weekly', priority: '0.8' };
  }
  // /foo/ — platform page (one level deep)
  if (/^\/[^/]+\/$/.test(url)) {
    return { changefreq: 'weekly', priority: '0.8' };
  }
  return { changefreq: 'monthly', priority: '0.7' };
}

// ─── Git lastmod ──────────────────────────────────────────────────────────────

function getGitLastMod(filePath) {
  try {
    const isoDate = execSync(
      `git log -1 --format=%cI -- "${filePath}"`,
      { cwd: REPO_ROOT, encoding: 'utf8' }
    ).trim();
    return isoDate ? isoDate.split('T')[0] : todayDate();
  } catch {
    return todayDate();
  }
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Significant lastmod: date the change a reader can see ───────────────────
//
// getGitLastMod() returns the newest commit that TOUCHED the file. On this site
// that is usually the wrong date: a mesh pass, a static-footer rebuild or a
// template fix lands on thousands of pages after their real edit, so 2,000
// pages would all report the same day. So for a page whose hash moved, walk its
// recent commits newest-first, hash each blob, and take the newest commit whose
// hash differs from the one before it (scripts/lib/content-significance.js,
// pickSignificantDate). Only bumped pages pay for the walk; a held page costs
// nothing, as before.

const SIGNIFICANT_WALK_LIMIT = 15;

function gitTouches(filePath, limit) {
  try {
    // execFileSync, not execSync: the format string carries a `|`, which a
    // shell would read as a pipe and silently return nothing — every page
    // would then date as today, which is the failure this walk exists to fix.
    const out = execFileSync('git', ['log', '-n', String(limit), '--format=%H|%cI', '--', filePath],
      { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
    if (!out) return [];
    return out.split('\n').map((line) => {
      const [sha, iso] = line.split('|');
      return { sha, date: iso.split('T')[0] };
    });
  } catch {
    return [];
  }
}

function blobHash(sha, filePath) {
  try {
    return significanceHash(execFileSync('git', ['show', `${sha}:${filePath}`],
      { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    return null;
  }
}

function getSignificantLastMod(filePath, currentHash) {
  const touches = gitTouches(filePath, SIGNIFICANT_WALK_LIMIT);
  if (!touches.length) return todayDate();
  const entries = touches.map((t) => ({ date: t.date, hash: blobHash(t.sha, filePath) }));
  // The edit is still only in the working tree (HEAD's blob hashes differently):
  // git cannot date it, so today is the honest answer — same rule as before.
  if (entries[0].hash !== null && entries[0].hash !== currentHash) return todayDate();
  return pickSignificantDate(entries) || touches[0].date;
}

// ─── lastmod significance cache ───────────────────────────────────────────────
//
// <lastmod> must mean "the content meaningfully changed", not "some byte in the
// file moved". getGitLastMod() alone cannot tell the difference: on 2026-08-15/16
// two cosmetic passes (breadcrumb aria-labels, three template strings) bumped
// 2,533 pages without altering a word a reader could see, and 69% of pages were
// advertising a lastmod newer than their real content change, median 11 days.
//
// So we keep {url: {hash, lastmod}} beside the sitemap. Each run hashes the page
// (scripts/lib/content-significance.js) and only advances lastmod when the hash
// moves. O(1) per page, no history walking.
//
// SEEDING: on the very first run the cache does not exist. Do NOT stamp today —
// that would bump every URL at once, which is precisely the failure being fixed.
// Seed from the lastmod values already in sitemap.xml instead, so the first run
// after this change writes an identical file.

function loadLastmodCache() {
  try {
    return JSON.parse(fs.readFileSync(LASTMOD_CACHE, 'utf8'));
  } catch {
    return null;
  }
}

function seedFromExistingSitemap() {
  const seed = {};
  try {
    const xml = fs.readFileSync(SITEMAP_PATH, 'utf8');
    const re = /<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g;
    let m;
    while ((m = re.exec(xml)) !== null) seed[m[1].replace(BASE_URL, '')] = m[2];
  } catch {
    /* no sitemap yet — every page is genuinely new */
  }
  return seed;
}

function saveLastmodCache(cache) {
  fs.mkdirSync(path.dirname(LASTMOD_CACHE), { recursive: true });
  const ordered = {};
  for (const k of Object.keys(cache).sort()) ordered[k] = cache[k];
  fs.writeFileSync(LASTMOD_CACHE, JSON.stringify(ordered, null, 1) + '\n', 'utf8');
}

// ─── XML builder ──────────────────────────────────────────────────────────────

function buildUrlBlock(url, lastmod, changefreq, priority, images) {
  const lines = [
    '  <url>',
    `    <loc>${BASE_URL}${url}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
  ];
  for (const image of images || []) {
    lines.push('    <image:image>', `      <image:loc>${image}</image:loc>`, '    </image:image>');
  }
  lines.push('  </url>');
  return lines.join('\n');
}

function buildSitemap(urlEntries) {
  const blocks = urlEntries.map(e =>
    buildUrlBlock(e.url, e.lastmod, e.changefreq, e.priority, e.images)
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    '',
    blocks.join('\n\n'),
    '',
    '</urlset>',
    '', // trailing newline
  ].join('\n');
}

// ─── URL sort order ───────────────────────────────────────────────────────────

function urlSortKey(url) {
  // Root first, then alphabetically
  if (url === '/') return '\x00';
  return url;
}

let resolveLastMod; // assigned inside generateSitemap (closes over the cache)

// ─── Main ─────────────────────────────────────────────────────────────────────

function generateSitemap() {
  console.log('🔍 Scanning for index.html pages...');

  const priorCache = loadLastmodCache();
  const cache      = priorCache || {};
  const seed       = priorCache ? null : seedFromExistingSitemap();
  const nextCache  = {};
  let bumped = 0;
  let held   = 0;

  resolveLastMod = function (filePath, url) {
    let html = '';
    try {
      html = fs.readFileSync(path.join(REPO_ROOT, filePath), 'utf8');
    } catch {
      return getGitLastMod(filePath);
    }
    const hash = significanceHash(html);
    const prev = cache[url];

    let lastmod;
    if (prev && prev.hash === hash) {
      lastmod = prev.lastmod;                 // unchanged content — hold the date
      held++;
    } else if (!prev && seed && seed[url]) {
      lastmod = seed[url];                    // first run — inherit, never mass-bump
      held++;
    } else {
      // Real change, or a genuinely new page. Date it by the newest commit that
      // changed what a reader sees, not the newest commit that touched the file
      // (see getSignificantLastMod). A date can never move backwards: if the walk
      // lands before the date already published, keep the published one.
      const sigDate = getSignificantLastMod(filePath, hash);
      lastmod = (prev && sigDate < prev.lastmod) ? prev.lastmod : sigDate;
      bumped++;
    }
    nextCache[url] = { hash, lastmod };
    return lastmod;
  };

  generateSitemap._report = () => ({ bumped, held, nextCache });

  const discovered = findIndexFiles(REPO_ROOT);
  const indexFiles = discovered.filter(f => !isNoindex(f));
  console.log(`   Pages discovered: ${discovered.length}`);
  if (discovered.length !== indexFiles.length) {
    console.log(`   Skipped noindex:  ${discovered.length - indexFiles.length}`);
  }

  // Build URL entries — fully derived from filesystem, no sitemap.xml read
  const urlEntries = indexFiles
    .map(filePath => {
      const url      = pathToUrl(filePath);
      const lastmod  = resolveLastMod(filePath, url);
      const defaults = getUrlDefaults(url);
      const images   = getPageImages(filePath);
      return { url, lastmod, images, ...defaults };
    })
    .sort((a, b) => urlSortKey(a.url).localeCompare(urlSortKey(b.url)));

  const xml = buildSitemap(urlEntries);

  fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');

  const { bumped: b, held: h, nextCache: nc } = generateSitemap._report();
  saveLastmodCache(nc);

  console.log(`   URLs written:     ${urlEntries.length}`);
  console.log(`   lastmod advanced: ${b}  (content actually changed)`);
  console.log(`   lastmod held:     ${h}  (no meaningful change)`);
  console.log(`   Output path:      ${SITEMAP_PATH}`);
  console.log('✅ sitemap.xml fully regenerated.');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

if (require.main === module) {
  try {
    generateSitemap();
  } catch (err) {
    console.error('❌ Sitemap generation failed:', err.message);
    process.exit(1);
  }
}

module.exports = { generateSitemap, getContentImages };
