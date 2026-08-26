#!/usr/bin/env node
'use strict';

/**
 * sync-readme.js
 *
 * Reads sitemap.xml and refreshes the marker-delimited blocks in README.md and
 * every translated README.
 *
 * Markers (identical in every language file):
 *   <!-- START_PILLARS -->   … <!-- END_PILLARS -->    section index + live counts
 *   <!-- START_PLATFORMS --> … <!-- END_PLATFORMS -->  the 11 platform pages
 *   <!-- START_EMBED -->     … <!-- END_EMBED -->      embeddable widgets
 *   <!-- START_LOCALES -->   … <!-- END_LOCALES -->    languages the site ships in
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
    { lang: 'ar', path: path.join(__dirname, '..', 'README.ar.md') },
    { lang: 'de', path: path.join(__dirname, '..', 'README.de.md') },
    { lang: 'es', path: path.join(__dirname, '..', 'README.es.md') },
    { lang: 'fr', path: path.join(__dirname, '..', 'README.fr.md') },
    { lang: 'pl', path: path.join(__dirname, '..', 'README.pl.md') },
    { lang: 'pt', path: path.join(__dirname, '..', 'README.pt.md') },
    { lang: 'ru', path: path.join(__dirname, '..', 'README.ru.md') },
    { lang: 'tr', path: path.join(__dirname, '..', 'README.tr.md') },
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
    locales:   n => `The site ships in ${n} languages:`,
  },
  ar: {
    platforms: { socialHeading: '### منصات التواصل الاجتماعي', messagingHeading: '### منصات المراسلة' },
    table:     { section: 'القسم', english: 'صفحات إنجليزية', localized: 'صفحات مترجمة' },
    pillars:   { library: 'المكتبة', symbol: 'الرموز', answers: 'الإجابات', usecase: 'حالات الاستخدام',
                 guide: 'الأدلة', category: 'الفئات', updates: 'التحديثات', embed: 'أدوات التضمين' },
    total:     (t, l) => `**${t} رابط إجمالاً**، عبر ${l} لغة.`,
    locales:   n => `الموقع متاح بـ ${n} لغة:`,
  },
  de: {
    platforms: { socialHeading: '### Social-Media-Plattformen', messagingHeading: '### Messaging-Plattformen' },
    table:     { section: 'Bereich', english: 'Englische Seiten', localized: 'Lokalisierte Seiten' },
    pillars:   { library: 'Bibliothek', symbol: 'Symbole', answers: 'Antworten', usecase: 'Anwendungsfälle',
                 guide: 'Ratgeber', category: 'Kategorien', updates: 'Updates', embed: 'Embed-Tools' },
    total:     (t, l) => `**Insgesamt ${t} URLs** in ${l} Sprachen.`,
    locales:   n => `Die Website ist in ${n} Sprachen verfügbar:`,
  },
  es: {
    platforms: { socialHeading: '### Plataformas de Redes Sociales', messagingHeading: '### Plataformas de Mensajería' },
    table:     { section: 'Sección', english: 'Páginas en inglés', localized: 'Páginas localizadas' },
    pillars:   { library: 'Biblioteca', symbol: 'Símbolos', answers: 'Respuestas', usecase: 'Casos de Uso',
                 guide: 'Guías', category: 'Categorías', updates: 'Novedades', embed: 'Herramientas Integrables' },
    total:     (t, l) => `**${t} URLs en total**, en ${l} idiomas.`,
    locales:   n => `El sitio está disponible en ${n} idiomas:`,
  },
  fr: {
    platforms: { socialHeading: '### Plateformes de Réseaux Sociaux', messagingHeading: '### Plateformes de Messagerie' },
    table:     { section: 'Section', english: 'Pages en anglais', localized: 'Pages localisées' },
    pillars:   { library: 'Bibliothèque', symbol: 'Symboles', answers: 'Réponses', usecase: "Cas d'Usage",
                 guide: 'Guides', category: 'Catégories', updates: 'Mises à Jour', embed: 'Outils Intégrables' },
    total:     (t, l) => `**${t} URL au total**, dans ${l} langues.`,
    locales:   n => `Le site est disponible en ${n} langues :`,
  },
  pl: {
    platforms: { socialHeading: '### Platformy Społecznościowe', messagingHeading: '### Komunikatory' },
    table:     { section: 'Sekcja', english: 'Strony po angielsku', localized: 'Strony zlokalizowane' },
    pillars:   { library: 'Biblioteka', symbol: 'Symbole', answers: 'Odpowiedzi', usecase: 'Zastosowania',
                 guide: 'Poradniki', category: 'Kategorie', updates: 'Aktualizacje', embed: 'Narzędzia do Osadzenia' },
    total:     (t, l) => `**Łącznie ${t} adresów URL** w ${l} językach.`,
    locales:   n => `Witryna jest dostępna w ${n} językach:`,
  },
  pt: {
    platforms: { socialHeading: '### Plataformas de Redes Sociais', messagingHeading: '### Plataformas de Mensagens' },
    table:     { section: 'Seção', english: 'Páginas em inglês', localized: 'Páginas localizadas' },
    pillars:   { library: 'Biblioteca', symbol: 'Símbolos', answers: 'Respostas', usecase: 'Casos de Uso',
                 guide: 'Guias', category: 'Categorias', updates: 'Atualizações', embed: 'Ferramentas Incorporáveis' },
    total:     (t, l) => `**${t} URLs no total**, em ${l} idiomas.`,
    locales:   n => `O site está disponível em ${n} idiomas:`,
  },
  ru: {
    platforms: { socialHeading: '### Социальные сети', messagingHeading: '### Мессенджеры' },
    table:     { section: 'Раздел', english: 'Страниц на английском', localized: 'Локализованных страниц' },
    pillars:   { library: 'Библиотека', symbol: 'Символы', answers: 'Ответы', usecase: 'Сценарии использования',
                 guide: 'Руководства', category: 'Категории', updates: 'Обновления', embed: 'Встраиваемые инструменты' },
    total:     (t, l) => `**Всего ${t} URL** на ${l} языках.`,
    locales:   n => `Сайт доступен на ${n} языках:`,
  },
  tr: {
    platforms: { socialHeading: '### Sosyal Medya Platformları', messagingHeading: '### Mesajlaşma Platformları' },
    table:     { section: 'Bölüm', english: 'İngilizce sayfa', localized: 'Yerelleştirilmiş sayfa' },
    pillars:   { library: 'Kütüphane', symbol: 'Semboller', answers: 'Cevaplar', usecase: 'Kullanım Alanları',
                 guide: 'Rehberler', category: 'Kategoriler', updates: 'Güncellemeler', embed: 'Gömme Araçları' },
    total:     (t, l) => `**Toplam ${t} URL**, ${l} dilde.`,
    locales:   n => `Site ${n} dilde mevcut:`,
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

// BCP-47 tag per README language, so thousands separators follow that
// language's own convention: 4.576 in de/es/tr, 4 576 in fr/pl/ru, 4,576 in en.
const NUMBER_LOCALES = {
  // ar-u-nu-latn, not ar-EG: the Arabic README writes every other number in
  // Western digits, and ar-EG would render these alone as ٤٬٥٧٦.
  en: 'en-US', ar: 'ar-u-nu-latn', de: 'de-DE', es: 'es-ES',
  fr: 'fr-FR', pl: 'pl-PL', pt: 'pt-BR', ru: 'ru-RU', tr: 'tr-TR',
};

/** Format an integer with the thousands separator `lang` actually uses. */
function fmt(n, lang) {
  return n.toLocaleString(NUMBER_LOCALES[lang] || 'en-US');
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
    lines.push(`| [${label}](${url}) | ${fmt(c.en, lang)} | ${fmt(c.localized, lang)} |`);
  }

  lines.push('');
  lines.push(t.total(fmt(stats.total, lang), stats.locales.length));

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

/** Locale list, using endonyms so it is identical in every language file. */
function buildLocalesContent(stats, lang) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const names = stats.locales.map(code => `${LOCALE_NAMES[code]} (\`${code}\`)`);
  return `${t.locales(stats.locales.length)}\n\n${names.join(' · ')}`;
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
