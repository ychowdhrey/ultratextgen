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

function buildUrlBlock(url, lastmod, changefreq, priority) {
  return [
    '  <url>',
    `    <loc>${BASE_URL}${url}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n');
}

function buildSitemap(urlEntries) {
  const blocks = urlEntries.map(e =>
    buildUrlBlock(e.url, e.lastmod, e.changefreq, e.priority)
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
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

  const indexFiles = findIndexFiles(REPO_ROOT);
  console.log(`   Pages discovered: ${indexFiles.length}`);

  // Build URL entries — fully derived from filesystem, no sitemap.xml read
  const urlEntries = indexFiles
    .map(filePath => {
      const url      = pathToUrl(filePath);
      const lastmod  = getGitLastMod(filePath);
      const defaults = getUrlDefaults(url);
      return { url, lastmod, ...defaults };
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
