#!/usr/bin/env node

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL     = 'https://ultratextgen.com';
const SITEMAP_PATH = path.resolve(__dirname, '..', 'sitemap.xml');
const REPO_ROOT    = path.resolve(__dirname, '..');

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

function getOgImage(filePath) {
  let html;
  try {
    html = fs.readFileSync(path.join(REPO_ROOT, filePath), 'utf8');
  } catch {
    return null;
  }
  const m = html.match(OG_IMAGE_RE);
  if (!m || m[1] === LOGO_FALLBACK) return null;
  return m[1];
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

// ─── XML builder ──────────────────────────────────────────────────────────────

function buildUrlBlock(url, lastmod, changefreq, priority, image) {
  const lines = [
    '  <url>',
    `    <loc>${BASE_URL}${url}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
  ];
  if (image) {
    lines.push('    <image:image>', `      <image:loc>${image}</image:loc>`, '    </image:image>');
  }
  lines.push('  </url>');
  return lines.join('\n');
}

function buildSitemap(urlEntries) {
  const blocks = urlEntries.map(e =>
    buildUrlBlock(e.url, e.lastmod, e.changefreq, e.priority, e.image)
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

// ─── Main ─────────────────────────────────────────────────────────────────────

function generateSitemap() {
  console.log('🔍 Scanning for index.html pages...');

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
      const lastmod  = getGitLastMod(filePath);
      const defaults = getUrlDefaults(url);
      const image    = getOgImage(filePath);
      return { url, lastmod, image, ...defaults };
    })
    .sort((a, b) => urlSortKey(a.url).localeCompare(urlSortKey(b.url)));

  const xml = buildSitemap(urlEntries);

  fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');

  console.log(`   URLs written:     ${urlEntries.length}`);
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

module.exports = { generateSitemap };
