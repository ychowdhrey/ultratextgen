#!/usr/bin/env node
'use strict';

/**
 * sync-readme.js
 *
 * Reads sitemap.xml and refreshes the marker-delimited blocks in README.md.
 *
 * Markers:
 *   <!-- START_PILLARS -->   … <!-- END_PILLARS -->    section index + live counts
 *   <!-- START_PLATFORMS --> … <!-- END_PLATFORMS -->  the 11 platform pages
 *   <!-- START_EMBED -->     … <!-- END_EMBED -->      embeddable widgets
 *   <!-- START_LOCALES -->   … <!-- END_LOCALES -->    switcher → live locale homepages
 *
 * Design note — why this syncs counts, not page lists (2026-08-26):
 *
 *   Until this rewrite the script emitted one line per page for four pillars,
 *   which had grown to 447 URL lines out of a 606-line README. That was wrong
 *   in two directions at once.
 *
 *   Too much: those lines are `rel="nofollow"` once GitHub renders them, so the
 *   dump earned nothing, buried the actual description ~600 lines below the
 *   fold, and had to be carried in nine languages.
 *
 *   Too little: `groupPaths()` had buckets for category/usecase/guide/library
 *   and none for symbol/, answers/ or updates/, so 189 English pages were read
 *   out of the sitemap and silently dropped — including symbol/, which is the
 *   single largest pillar on the site once locales are counted (1,765 pages).
 *   No amount of re-running fixed that; a list that looks exhaustive and covers
 *   13% of the site misinforms more than a short one does.
 *
 *   So the script now emits per-pillar counts and a link to each pillar's own
 *   index, which already carries real browse/search UI and — unlike a README —
 *   covers the 3,667 localized pages too. Counts stay honest automatically and
 *   cost ~20 lines instead of 634.
 *
 * One README, not nine (decided 2026-08-26):
 *
 *   The eight translated READMEs were dropped. The case for keeping them was
 *   crawl discovery — nofollow is a hint, not a directive, and GitHub is read
 *   heavily by search and AI crawlers, so those links genuinely do get
 *   followed. That mechanism is real; it just does not favour more files.
 *
 *   Linking the eight pillar indexes puts ~602 of 624 English pillar pages one
 *   hop from the repo landing page (library/index.html alone links 339 of its
 *   336). The old nine-file dump reached 447 and missed symbol/, answers/ and
 *   updates/ entirely. Extra translations add no new site URLs — they repeat
 *   the same ~50 links on blob sub-pages, which carry far less crawl priority
 *   than README.md itself. Nine copies of one link graph is not nine times the
 *   signal, and sitemap.xml (4,576 URLs, regenerated daily) is the primary
 *   discovery channel regardless.
 *
 *   The language switcher now points at the live locale homepages instead of
 *   at sibling README files, so it covers all 30 languages rather than 8, adds
 *   30 real inbound links to the site from the highest-priority page in the
 *   repo, and sends a non-English reader to the product rather than to a
 *   translated repo document.
 *
 * Usage:
 *   node scripts/sync-readme.js
 *   npm run sync-readme
 */

const fs   = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
  baseUrl: 'https://ultratextgen.com',

  sitemapPath: path.join(__dirname, '..', 'sitemap.xml'),

  readmeFiles: [
    { lang: 'en', path: path.join(__dirname, '..', 'README.md') },
  ],

  // Dry-run mode: print changes without writing any files
  dryRun: process.argv.includes('--dry-run'),
};

// ─── Pillars ──────────────────────────────────────────────────────────────────
// One entry per content section, in the order they appear in the README table.
// `slug` is both the URL segment and the key used by TRANSLATIONS[lang].pillars.

const PILLARS = [
  { slug: 'library'  },
  { slug: 'symbol'   },
  { slug: 'answers'  },
  { slug: 'usecase'  },
  { slug: 'guide'    },
  { slug: 'category' },
  { slug: 'updates'  },
  { slug: 'embed'    },
];

const SOCIAL_PLATFORMS = [
  '/facebook/', '/instagram/', '/linkedin/', '/pinterest/',
  '/snapchat/', '/tiktok/', '/x/', '/youtube/',
];

const MESSAGING_PLATFORMS = [
  '/discord/', '/telegram/', '/whatsapp/',
];

// ─── Slug → readable label overrides ─────────────────────────────────────────
// Applied word-by-word after splitting on '-'.

const LABEL_OVERRIDES = {
  linkedin:  'LinkedIn',
  tiktok:    'TikTok',
  youtube:   'YouTube',
  whatsapp:  'WhatsApp',
  discord:   'Discord',
  facebook:  'Facebook',
  instagram: 'Instagram',
  snapchat:  'Snapchat',
  telegram:  'Telegram',
  pinterest: 'Pinterest',
  x:         'X (Twitter)',
};

// ─── Locale endonyms ─────────────────────────────────────────────────────────
// Native names, so the locale block is byte-identical in all nine READMEs and
// needs no per-language translation. Keyed by the URL prefix in the sitemap.

const LOCALE_NAMES = {
  ar: 'العربية',      bs: 'Bosanski',   cs: 'Čeština',
  da: 'Dansk',        de: 'Deutsch',    es: 'Español',
  fi: 'Suomi',        fr: 'Français',   hi: 'हिन्दी',
  hr: 'Hrvatski',     hu: 'Magyar',     id: 'Bahasa Indonesia',
  it: 'Italiano',     ja: '日本語',       ko: '한국어',
  ms: 'Bahasa Melayu', nl: 'Nederlands', no: 'Norsk',
  pl: 'Polski',       pt: 'Português',  ro: 'Română',
  ru: 'Русский',      sk: 'Slovenčina', sr: 'Српски',
  sv: 'Svenska',      th: 'ไทย',         tl: 'Tagalog',
  tr: 'Türkçe',       vi: 'Tiếng Việt', 'zh-tw': '繁體中文',
};

// ─── Translation config ───────────────────────────────────────────────────────

const TRANSLATIONS = {
  en: {
    platforms: { socialHeading: '### Social Media Platforms', messagingHeading: '### Messaging Platforms' },
    table:     { section: 'Section', english: 'English pages', localized: 'Localized pages' },
    pillars:   { library: 'Library', symbol: 'Symbols', answers: 'Answers', usecase: 'Use Cases',
                 guide: 'Guides', category: 'Categories', updates: 'Updates', embed: 'Embed Tools' },
    total:     (t, l) => `**${t} URLs in total**, across ${l} languages.`,
    locales:   n => `Available in ${n} languages — each with its own pages, not a translated interface:`,
  },
};

const MARKERS = ['PILLARS', 'PLATFORMS', 'EMBED', 'LOCALES'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a URL slug to a readable, title-cased label. */
function slugToLabel(slug) {
  return slug
    .split('-')
    .map(word => LABEL_OVERRIDES[word.toLowerCase()] || (word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

/** Parse <loc> values from sitemap XML. Returns absolute URL strings. */
function parseLocUrls(xml) {
  const urls = [];
  const re = /<loc>\s*(https?:\/\/[^\s<]+)\s*<\/loc>/g;
  let match;
  while ((match = re.exec(xml)) !== null) {
    urls.push(match[1].trim());
  }
  return urls;
}

/** Strip the base URL to get a path. Returns null for foreign URLs. */
function urlToPath(url) {
  if (!url.startsWith(CONFIG.baseUrl)) return null;
  return url.slice(CONFIG.baseUrl.length) || '/';
}

/** Escape special regex characters in a literal string. */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


/** Format an integer with thousands separators. */
function fmt(n) {
  return n.toLocaleString('en-US');
}

/**
 * Count pages per pillar, split into English and localized, plus the set of
 * locale prefixes actually present in the sitemap.
 *
 * A page counts for a pillar when its path is exactly one segment deep under
 * that pillar — `/library/<slug>/` or `/<lang>/library/<slug>/`. Pillar index
 * pages and deeper nested paths are deliberately excluded, so the numbers match
 * "how many content pages are in this section".
 *
 * @param {string[]} paths      content paths, homepage excluded
 * @param {number}   totalUrls  every URL in the sitemap, homepage included
 * @returns {{counts: object, locales: string[], total: number}}
 */
function countPillars(paths, totalUrls) {
  const counts = {};
  for (const { slug } of PILLARS) counts[slug] = { en: 0, localized: 0 };

  const locales = new Set();
  const localeRe = /^\/([a-z]{2}(?:-[a-z]{2})?)\//;

  for (const p of paths) {
    const localeMatch = localeRe.exec(p);
    // Only treat a prefix as a locale if we know it — guards against a future
    // two-letter top-level directory being miscounted as a language.
    const locale = localeMatch && LOCALE_NAMES[localeMatch[1]] ? localeMatch[1] : null;
    if (locale) locales.add(locale);

    const rest = locale ? p.slice(locale.length + 1) : p;

    for (const { slug } of PILLARS) {
      if (new RegExp(`^/${slug}/[^/]+/$`).test(rest)) {
        if (locale) counts[slug].localized++;
        else counts[slug].en++;
        break;
      }
    }
  }

  return { counts, locales: [...locales].sort(), total: totalUrls };
}

// ─── Block builders ───────────────────────────────────────────────────────────

/** Section table: one row per pillar, with live English/localized counts. */
function buildPillarsContent(stats, lang) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const lines = [];

  lines.push(`| ${t.table.section} | ${t.table.english} | ${t.table.localized} |`);
  lines.push('|---|---:|---:|');

  for (const { slug } of PILLARS) {
    const c = stats.counts[slug];
    const label = t.pillars[slug];
    const url = `${CONFIG.baseUrl}/${slug}/`;
    lines.push(`| [${label}](${url}) | ${fmt(c.en)} | ${fmt(c.localized)} |`);
  }

  lines.push('');
  lines.push(t.total(fmt(stats.total), stats.locales.length));

  return lines.join('\n');
}

/** The platform pages, split social vs messaging. */
function buildPlatformsContent(groups, lang) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const lines = [];

  lines.push(t.platforms.socialHeading);
  for (const p of groups.social) {
    lines.push(`**${slugToLabel(p.replace(/^\/|\/$/g, ''))}:** ${CONFIG.baseUrl}${p}`);
  }

  lines.push('');
  lines.push(t.platforms.messagingHeading);
  for (const p of groups.messaging) {
    lines.push(`**${slugToLabel(p.replace(/^\/|\/$/g, ''))}:** ${CONFIG.baseUrl}${p}`);
  }

  return lines.join('\n');
}

/** Embeddable widget URLs — bounded, and the audience is integrators. */
function buildEmbedContent(groups) {
  return groups.embed.map(p => `- ${CONFIG.baseUrl}${p}`).join('\n');
}

/**
 * Language switcher: each endonym links to that locale's own live homepage.
 *
 * These used to point at sibling README.<lang>.md files, which sent a
 * non-English reader to a translated repo document rather than to the product.
 * Pointing them at the site covers all 30 locales instead of 8, needs no
 * translation upkeep, and puts 30 real inbound links on the repo landing page.
 */
function buildLocalesContent(stats, lang) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const links = stats.locales.map(
    code => `[${LOCALE_NAMES[code]}](${CONFIG.baseUrl}/${code}/)`
  );
  return `${t.locales(stats.locales.length)}\n\n${links.join(' · ')}`;
}

/** Collect the platform and embed paths the two blocks above need. */
function groupPaths(paths) {
  const groups = { social: [], messaging: [], embed: [] };

  for (const p of paths) {
    if (SOCIAL_PLATFORMS.includes(p))         { groups.social.push(p);    continue; }
    if (MESSAGING_PLATFORMS.includes(p))      { groups.messaging.push(p); continue; }
    if (/^\/embed\/[^/]+\/$/.test(p))         { groups.embed.push(p);     continue; }
  }

  for (const key of Object.keys(groups)) groups[key].sort();
  return groups;
}

// ─── Marker replacement ───────────────────────────────────────────────────────

function replaceMarkerBlock(content, name, newBlock) {
  const startMarker = `<!-- START_${name} -->`;
  const endMarker   = `<!-- END_${name} -->`;

  const re = new RegExp(
    `(${escapeRegex(startMarker)})[\\s\\S]*?(${escapeRegex(endMarker)})`,
    'g'
  );

  return content.replace(re, `$1\n${newBlock}\n$2`);
}

/** Verify every required marker pair exists; exit non-zero if one is missing. */
function validateMarkers(content, filePath) {
  for (const name of MARKERS) {
    for (const marker of [`<!-- START_${name} -->`, `<!-- END_${name} -->`]) {
      if (!content.includes(marker)) {
        console.error(`ERROR: Missing marker ${marker} in ${filePath}`);
        process.exit(1);
      }
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(CONFIG.sitemapPath)) {
    console.error(`ERROR: sitemap.xml not found at ${CONFIG.sitemapPath}`);
    process.exit(1);
  }

  const sitemapXml = fs.readFileSync(CONFIG.sitemapPath, 'utf8');
  const sitePaths = parseLocUrls(sitemapXml)
    .map(urlToPath)
    .filter(p => p !== null);
  // Pillar matching ignores the homepage; the headline total does not.
  const allPaths = sitePaths.filter(p => p !== '/');

  const stats  = countPillars(allPaths, sitePaths.length);
  const groups = groupPaths(allPaths);

  let updatedCount = 0;

  for (const { lang, path: filePath } of CONFIG.readmeFiles) {
    if (!fs.existsSync(filePath)) {
      console.error(`ERROR: README file not found: ${filePath}`);
      process.exit(1);
    }

    const originalContent = fs.readFileSync(filePath, 'utf8');
    validateMarkers(originalContent, filePath);

    const sections = {
      PILLARS:   buildPillarsContent(stats, lang),
      PLATFORMS: buildPlatformsContent(groups, lang),
      EMBED:     buildEmbedContent(groups),
      LOCALES:   buildLocalesContent(stats, lang),
    };

    let updatedContent = originalContent;
    for (const [name, newBlock] of Object.entries(sections)) {
      updatedContent = replaceMarkerBlock(updatedContent, name, newBlock);
    }

    if (CONFIG.dryRun) {
      console.log(updatedContent !== originalContent
        ? `[DRY RUN] Would update: ${filePath}`
        : `[DRY RUN] No changes: ${filePath}`);
      continue;
    }

    if (updatedContent !== originalContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      updatedCount++;
    } else {
      console.log(`  No changes: ${filePath}`);
    }
  }

  if (CONFIG.dryRun) {
    console.log('\n[DRY RUN] Complete. No files were written.');
  } else {
    console.log(`\nDone. ${updatedCount} file(s) updated.`);
  }
}

main();
