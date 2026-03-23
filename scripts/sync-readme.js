#!/usr/bin/env node
'use strict';

/**
 * sync-readme.js
 *
 * Reads sitemap.xml, extracts URLs, and updates predefined marker-delimited
 * sections in README.md and all translated README files.
 *
 * Markers (identical in every language file):
 *   <!-- START_PLATFORMS --> … <!-- END_PLATFORMS -->
 *   <!-- START_CATEGORIES --> … <!-- END_CATEGORIES -->
 *   <!-- START_USECASES --> … <!-- END_USECASES -->
 *   <!-- START_GUIDES --> … <!-- END_GUIDES -->
 *   <!-- START_LIBRARY --> … <!-- END_LIBRARY -->
 *   <!-- START_EMBED --> … <!-- END_EMBED -->
 *
 * Usage:
 *   node scripts/sync-readme.js
 *   npm run sync-readme
 */

const fs   = require('fs');
const path = require('path');

// ─── Translation config ───────────────────────────────────────────────────────
// Defines section headings and "all X" links per language.
// heading: null means no extra heading line is emitted before the list.

const TRANSLATIONS = {
  en: {
    platforms: {
      socialHeading:    '### Social Media Platforms',
      messagingHeading: '### Messaging Platforms',
    },
    categories: {
      allLink: '**All categories:** https://ultratextgen.com/category/',
    },
    usecases: {
      allLink: '**All use cases:** https://ultratextgen.com/usecase/',
    },
    guides:  { heading: null },
    library: { heading: null },
    embed:   { heading: null },
  },
  ar: {
    platforms: {
      socialHeading:    '### منصات التواصل الاجتماعي',
      messagingHeading: '### منصات المراسلة',
    },
    categories: {
      allLink: '**جميع الفئات:** https://ultratextgen.com/category/',
    },
    usecases: {
      allLink: '**جميع حالات الاستخدام:** https://ultratextgen.com/usecase/',
    },
    guides:  { heading: null },
    library: { heading: null },
    embed:   { heading: null },
  },
  de: {
    platforms: {
      socialHeading:    '### Social-Media-Plattformen',
      messagingHeading: '### Messaging-Plattformen',
    },
    categories: {
      allLink: '**Alle Kategorien:** https://ultratextgen.com/category/',
    },
    usecases: {
      allLink: '**Alle Anwendungsfälle:** https://ultratextgen.com/usecase/',
    },
    guides:  { heading: null },
    library: { heading: null },
    embed:   { heading: null },
  },
  es: {
    platforms: {
      socialHeading:    '### Plataformas de Redes Sociales',
      messagingHeading: '### Plataformas de Mensajería',
    },
    categories: {
      allLink: '**Todas las categorías:** https://ultratextgen.com/category/',
    },
    usecases: {
      allLink: '**Todos los casos de uso:** https://ultratextgen.com/usecase/',
    },
    guides:  { heading: null },
    library: { heading: null },
    embed:   { heading: null },
  },
  fr: {
    platforms: {
      socialHeading:    '### Plateformes de Réseaux Sociaux',
      messagingHeading: '### Plateformes de Messagerie',
    },
    categories: {
      allLink: '**Toutes les catégories:** https://ultratextgen.com/category/',
    },
    usecases: {
      allLink: "**Tous les cas d'usage:** https://ultratextgen.com/usecase/",
    },
    guides:  { heading: null },
    library: { heading: null },
    embed:   { heading: null },
  },
  pl: {
    platforms: {
      socialHeading:    '### Platformy Mediów Społecznościowych',
      messagingHeading: '### Komunikatory',
    },
    categories: {
      allLink: '**Wszystkie kategorie:** https://ultratextgen.com/category/',
    },
    usecases: {
      allLink: '**Wszystkie przypadki użycia:** https://ultratextgen.com/usecase/',
    },
    guides:  { heading: null },
    library: { heading: null },
    embed:   { heading: null },
  },
  pt: {
    platforms: {
      socialHeading:    '### Plataformas de Redes Sociais',
      messagingHeading: '### Plataformas de Mensagens',
    },
    categories: {
      allLink: '**Todas as categorias:** https://ultratextgen.com/category/',
    },
    usecases: {
      allLink: '**Todos os casos de uso:** https://ultratextgen.com/usecase/',
    },
    guides:  { heading: null },
    library: { heading: null },
    embed:   { heading: null },
  },
  ru: {
    platforms: {
      socialHeading:    '### Платформы Социальных Сетей',
      messagingHeading: '### Мессенджеры',
    },
    categories: {
      allLink: '**Все категории:** https://ultratextgen.com/category/',
    },
    usecases: {
      allLink: '**Все сценарии использования:** https://ultratextgen.com/usecase/',
    },
    guides:  { heading: null },
    library: { heading: null },
    embed:   { heading: null },
  },
  tr: {
    platforms: {
      socialHeading:    '### Sosyal Medya Platformları',
      messagingHeading: '### Mesajlaşma Platformları',
    },
    categories: {
      allLink: '**Tüm kategoriler:** https://ultratextgen.com/category/',
    },
    usecases: {
      allLink: '**Tüm kullanım senaryoları:** https://ultratextgen.com/usecase/',
    },
    guides:  { heading: null },
    library: { heading: null },
    embed:   { heading: null },
  },
};

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
  // Base URL for the site
  baseUrl: 'https://ultratextgen.com',

  // Path to sitemap.xml relative to project root
  sitemapPath: path.join(__dirname, '..', 'sitemap.xml'),

  // README files to update: { lang, path }
  readmeFiles: [
    { lang: 'en', path: path.join(__dirname, '..', 'README.md') },
    { lang: 'ar', path: path.join(__dirname, '..', 'README.ar.md') },
    { lang: 'de', path: path.join(__dirname, '..', 'README.de.md') },
    { lang: 'es', path: path.join(__dirname, '..', 'README.es.md') },
    { lang: 'fr', path: path.join(__dirname, '..', 'README.fr.md') },
    { lang: 'pl', path: path.join(__dirname, '..', 'README.pl.md') },
    { lang: 'pt', path: path.join(__dirname, '..', 'README.pt.md') },
    { lang: 'ru', path: path.join(__dirname, '..', 'README.ru.md') },
    { lang: 'tr', path: path.join(__dirname, '..', 'README.tr.md') },
  ],

  // URLs to exclude by exact path
  excludedUrls: [
    '/about/',
    '/contact/',
    '/privacy/',
    '/terms/',
    '/guide/',
    '/usecase/',
    '/category/',
    '/usecase/linkedin-headline/embed/',  // old embed path — superseded
  ],

  // URL substrings or regex patterns to exclude
  // Add entries here for future noindex pages
  excludedPatterns: [
    // Example: '/hidden-page/'
  ],

  // Dry-run mode: print changes without writing any files
  dryRun: false,
};

// ─── Platform grouping ────────────────────────────────────────────────────────

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

// ─── Marker names ─────────────────────────────────────────────────────────────

const MARKERS = ['PLATFORMS', 'CATEGORIES', 'USECASES', 'GUIDES', 'LIBRARY', 'EMBED'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a URL slug to a readable, title-cased label.
 * Applies brand-specific overrides for known names.
 * @param {string} slug  e.g. "linkedin-headline"
 * @returns {string}     e.g. "LinkedIn Headline"
 */
function slugToLabel(slug) {
  return slug
    .split('-')
    .map(word => LABEL_OVERRIDES[word.toLowerCase()] || (word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

/**
 * Parse <loc> values from sitemap XML using regex.
 * Returns an array of absolute URL strings.
 * @param {string} xml
 * @returns {string[]}
 */
function parseLocUrls(xml) {
  const urls = [];
  const re = /<loc>\s*(https?:\/\/[^\s<]+)\s*<\/loc>/g;
  let match;
  while ((match = re.exec(xml)) !== null) {
    urls.push(match[1].trim());
  }
  return urls;
}

/**
 * Strip the base URL from an absolute URL to get the path.
 * Returns null if the URL does not start with the base URL.
 * @param {string} url
 * @returns {string|null}
 */
function urlToPath(url) {
  if (!url.startsWith(CONFIG.baseUrl)) return null;
  return url.slice(CONFIG.baseUrl.length) || '/';
}

/**
 * Return true if this path should be excluded from all sections.
 * @param {string} urlPath  e.g. "/about/"
 * @returns {boolean}
 */
function isExcluded(urlPath) {
  if (CONFIG.excludedUrls.includes(urlPath)) return true;
  for (const pattern of CONFIG.excludedPatterns) {
    if (typeof pattern === 'string' && urlPath.includes(pattern)) return true;
    if (pattern instanceof RegExp && pattern.test(urlPath)) return true;
  }
  return false;
}

/**
 * Group an array of paths into the six content sections.
 * Returns an object with keys: social, messaging, categories, usecases,
 * guides, library, embed.
 * @param {string[]} paths
 * @returns {object}
 */
function groupPaths(paths) {
  const groups = {
    social:     [],
    messaging:  [],
    categories: [],
    usecases:   [],
    guides:     [],
    library:    [],
    embed:      [],
  };

  for (const p of paths) {
    if (isExcluded(p)) continue;

    // Social platforms (exact match)
    if (SOCIAL_PLATFORMS.includes(p)) {
      groups.social.push(p);
      continue;
    }

    // Messaging platforms (exact match)
    if (MESSAGING_PLATFORMS.includes(p)) {
      groups.messaging.push(p);
      continue;
    }

    // Embed tools: /embed/<slug>/ or /usecase/<slug>/embed/
    if (/^\/embed\/[^/]+\/$/.test(p)) {
      groups.embed.push(p);
      continue;
    }
    if (/^\/usecase\/[^/]+\/embed\/$/.test(p)) {
      groups.embed.push(p);
      continue;
    }

    // Categories: only /category/<slug>/ (one segment after /category/)
    if (/^\/category\/[^/]+\/$/.test(p)) {
      groups.categories.push(p);
      continue;
    }

    // Use cases: /usecase/<slug>/ (exclude index and embed nested paths)
    if (/^\/usecase\/[^/]+\/$/.test(p)) {
      groups.usecases.push(p);
      continue;
    }

    // Guides: /guide/<slug>/
    if (/^\/guide\/[^/]+\/$/.test(p)) {
      groups.guides.push(p);
      continue;
    }

    // Library: /library/<slug>/
    if (/^\/library\/[^/]+\/$/.test(p)) {
      groups.library.push(p);
      continue;
    }
    // All other paths are ignored (root, nested sub-pages, etc.)
  }

  // Sort each group alphabetically for deterministic output
  for (const key of Object.keys(groups)) {
    groups[key].sort();
  }

  return groups;
}

/**
 * Generate the markdown content for the PLATFORMS block.
 * @param {object}   groups   result of groupPaths()
 * @param {string}   lang     language code
 * @returns {string}
 */
function buildPlatformsContent(groups, lang) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const lines = [];

  lines.push(t.platforms.socialHeading);
  for (const p of groups.social) {
    const slug = p.replace(/^\/|\/$/g, '');
    const label = slugToLabel(slug);
    lines.push(`**${label}:** ${CONFIG.baseUrl}${p}`);
  }

  lines.push('');
  lines.push(t.platforms.messagingHeading);
  for (const p of groups.messaging) {
    const slug = p.replace(/^\/|\/$/g, '');
    const label = slugToLabel(slug);
    lines.push(`**${label}:** ${CONFIG.baseUrl}${p}`);
  }

  return lines.join('\n');
}

/**
 * Generate the markdown content for the CATEGORIES block.
 * @param {object}   groups
 * @param {string}   lang
 * @returns {string}
 */
function buildCategoriesContent(groups, lang) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const lines = [];

  lines.push(t.categories.allLink);
  lines.push('');
  for (const p of groups.categories) {
    lines.push(`- ${CONFIG.baseUrl}${p}`);
  }

  return lines.join('\n');
}

/**
 * Generate the markdown content for the USECASES block.
 * @param {object}   groups
 * @param {string}   lang
 * @returns {string}
 */
function buildUsecasesContent(groups, lang) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const lines = [];

  lines.push(t.usecases.allLink);
  lines.push('');
  for (const p of groups.usecases) {
    lines.push(`- ${CONFIG.baseUrl}${p}`);
  }

  return lines.join('\n');
}

/**
 * Generate a simple bullet-list block (guides, library, embed).
 * @param {string[]} paths
 * @returns {string}
 */
function buildSimpleList(paths) {
  return paths.map(p => `- ${CONFIG.baseUrl}${p}`).join('\n');
}

/**
 * Replace the content between a marker pair in a README string.
 * Returns the updated string.
 *
 * The replacement keeps the start/end markers intact and places the new
 * content between them, surrounded by a single newline on each side.
 *
 * @param {string} content   full file content
 * @param {string} name      marker name, e.g. "PLATFORMS"
 * @param {string} newBlock  new markdown to place between the markers
 * @returns {string}
 */
/** Escape special regex characters in a literal string. */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceMarkerBlock(content, name, newBlock) {
  const startMarker = `<!-- START_${name} -->`;
  const endMarker   = `<!-- END_${name} -->`;

  // Use a regex that matches everything (including newlines) between the markers
  const re = new RegExp(
    `(${escapeRegex(startMarker)})[\\s\\S]*?(${escapeRegex(endMarker)})`,
    'g'
  );

  return content.replace(re, `$1\n${newBlock}\n$2`);
}

/**
 * Verify that all required marker pairs exist in the file content.
 * Throws a descriptive error if any marker is missing.
 * @param {string} content
 * @param {string} filePath
 */
function validateMarkers(content, filePath) {
  for (const name of MARKERS) {
    const startMarker = `<!-- START_${name} -->`;
    const endMarker   = `<!-- END_${name} -->`;
    if (!content.includes(startMarker)) {
      console.error(`ERROR: Missing marker ${startMarker} in ${filePath}`);
      process.exit(1);
    }
    if (!content.includes(endMarker)) {
      console.error(`ERROR: Missing marker ${endMarker} in ${filePath}`);
      process.exit(1);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Print each section name and its content to stdout (used in dry-run mode).
 * @param {object} sections  map of marker name → markdown content
 */
function logSections(sections) {
  for (const [name, newBlock] of Object.entries(sections)) {
    console.log(`  --- ${name} ---`);
    console.log(newBlock);
  }
}

function main() {
  // 1. Read sitemap
  if (!fs.existsSync(CONFIG.sitemapPath)) {
    console.error(`ERROR: sitemap.xml not found at ${CONFIG.sitemapPath}`);
    process.exit(1);
  }
  const sitemapXml = fs.readFileSync(CONFIG.sitemapPath, 'utf8');

  // 2. Parse and filter URLs
  const allUrls  = parseLocUrls(sitemapXml);
  const allPaths = allUrls
    .map(urlToPath)
    .filter(p => p !== null && p !== '/');

  // 3. Group into sections
  const groups = groupPaths(allPaths);

  // 4. Process each README file
  let updatedCount = 0;

  for (const file of CONFIG.readmeFiles) {
    const { lang, path: filePath } = file;

    // Check file exists
    if (!fs.existsSync(filePath)) {
      console.error(`ERROR: README file not found: ${filePath}`);
      process.exit(1);
    }

    const originalContent = fs.readFileSync(filePath, 'utf8');

    // Validate all markers are present
    validateMarkers(originalContent, filePath);

    // Build section content for this language
    const sections = {
      PLATFORMS:  buildPlatformsContent(groups, lang),
      CATEGORIES: buildCategoriesContent(groups, lang),
      USECASES:   buildUsecasesContent(groups, lang),
      GUIDES:     buildSimpleList(groups.guides),
      LIBRARY:    buildSimpleList(groups.library),
      EMBED:      buildSimpleList(groups.embed),
    };

    // Replace each marker block
    let updatedContent = originalContent;
    for (const [name, newBlock] of Object.entries(sections)) {
      updatedContent = replaceMarkerBlock(updatedContent, name, newBlock);
    }

    if (CONFIG.dryRun) {
      if (updatedContent !== originalContent) {
        console.log(`[DRY RUN] Would update: ${filePath}`);
        logSections(sections);
      } else {
        console.log(`[DRY RUN] No changes: ${filePath}`);
      }
    } else {
      if (updatedContent !== originalContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`✅ Updated: ${filePath}`);
        updatedCount++;
      } else {
        console.log(`  No changes: ${filePath}`);
      }
    }
  }

  // 5. Summary
  if (CONFIG.dryRun) {
    console.log('\n[DRY RUN] Complete. No files were written.');
  } else {
    console.log(`\nDone. ${updatedCount} file(s) updated.`);
  }
}

main();
