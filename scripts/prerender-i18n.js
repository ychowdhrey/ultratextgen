#!/usr/bin/env node

/**
 * prerender-i18n.js
 *
 * Pre-renders translations into localized HTML pages so that search engines
 * see genuinely different content instead of identical English body text
 * that depends on client-side JavaScript for translation.
 *
 * For each language directory (fr/, de/, es/, etc.), this script:
 *   1. Reads the locale JSON from locales/{lang}.json
 *   2. Reads the HTML file (e.g. fr/index.html)
 *   3. Replaces English text with translations for all data-i18n attributes:
 *      - data-i18n        → replaces textContent
 *      - data-i18n-html   → replaces innerHTML
 *      - data-i18n-placeholder → replaces placeholder attribute
 *      - data-i18n-content     → replaces content attribute
 *   4. Updates the FAQ JSON-LD schema with translated Q&A
 *   5. Writes the updated HTML back
 *
 * Usage:
 *   node scripts/prerender-i18n.js              # all localized pages
 *   node scripts/prerender-i18n.js fr            # French only
 *   node scripts/prerender-i18n.js fr de es      # specific languages
 *
 * Requirements:
 *   npm install cheerio
 */

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const ROOT = path.resolve(__dirname, "..");
const LOCALES_DIR = path.join(ROOT, "locales");
const SUPPORTED = ["de", "es", "fr", "id", "it", "nl", "pl", "pt", "tr", "vi"];

/* ───────────────────────── helpers ───────────────────────── */

/**
 * Resolve a dot-notation path (e.g. "faq.categories.0.items.1.question")
 * against a nested object/array structure.
 */
function getNestedValue(obj, keyPath) {
  return keyPath.split(".").reduce(function (acc, key) {
    if (acc == null) return undefined;
    // Support numeric indices for arrays
    const idx = Number(key);
    if (Array.isArray(acc) && !isNaN(idx)) return acc[idx];
    return acc[key];
  }, obj);
}

/* ──────────────────── translation logic ─────────────────── */

function prerenderTranslations($, translations) {
  let count = 0;

  // 1. data-i18n → replace textContent (skip <title>, handled in head)
  $("[data-i18n]").each(function () {
    const el = $(this);
    if (el.is("title")) return; // title already has translated content in head
    const key = el.attr("data-i18n");
    const val = getNestedValue(translations, key);
    if (val != null) {
      el.text(val);
      count++;
    }
  });

  // 2. data-i18n-html → replace innerHTML
  $("[data-i18n-html]").each(function () {
    const el = $(this);
    const key = el.attr("data-i18n-html");
    const val = getNestedValue(translations, key);
    if (val != null) {
      el.html(val);
      count++;
    }
  });

  // 3. data-i18n-placeholder → replace placeholder attribute
  $("[data-i18n-placeholder]").each(function () {
    const el = $(this);
    const key = el.attr("data-i18n-placeholder");
    const val = getNestedValue(translations, key);
    if (val != null) {
      el.attr("placeholder", val);
      count++;
    }
  });

  // 4. data-i18n-content → replace content attribute (meta tags)
  //    (These are typically already translated in the <head>, but handle anyway)
  $("[data-i18n-content]").each(function () {
    const el = $(this);
    const key = el.attr("data-i18n-content");
    const val = getNestedValue(translations, key);
    if (val != null) {
      el.attr("content", val);
      count++;
    }
  });

  return count;
}

/* ────────────── FAQ JSON-LD schema translation ──────────── */

function translateFaqSchema($, translations) {
  const faqCats = translations.faq && translations.faq.categories;
  if (!faqCats) return 0;

  let updated = 0;

  $('script[type="application/ld+json"]').each(function () {
    let data;
    try {
      data = JSON.parse($(this).html());
    } catch {
      return;
    }

    // Handle standalone FAQPage
    if (data && data["@type"] === "FAQPage" && Array.isArray(data.mainEntity)) {
      const translated = buildFaqEntities(faqCats);
      data.mainEntity = translated;
      $(this).html("\n" + JSON.stringify(data, null, 2) + "\n");
      updated++;
      return;
    }

    // Handle FAQPage inside an array
    if (Array.isArray(data)) {
      data.forEach(function (entry) {
        if (entry && entry["@type"] === "FAQPage" && Array.isArray(entry.mainEntity)) {
          const translated = buildFaqEntities(faqCats);
          entry.mainEntity = translated;
          updated++;
        }
      });
      if (updated > 0) {
        $(this).html("\n" + JSON.stringify(data, null, 2) + "\n");
      }
    }
  });

  return updated;
}

function buildFaqEntities(faqCategories) {
  const entities = [];
  faqCategories.forEach(function (cat) {
    if (!cat.items) return;
    cat.items.forEach(function (item) {
      if (!item.question || !item.answer) return;
      // Strip HTML tags for schema.org text
      const plainAnswer = item.answer.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      entities.push({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: plainAnswer,
        },
      });
    });
  });
  return entities;
}

/* ──────────────────────── main ───────────────────────────── */

function processLanguage(lang) {
  const localeFile = path.join(LOCALES_DIR, lang + ".json");
  const htmlFile = path.join(ROOT, lang, "index.html");

  if (!fs.existsSync(localeFile)) {
    console.log(`  ⚠  Locale file not found: locales/${lang}.json — skipping.`);
    return false;
  }
  if (!fs.existsSync(htmlFile)) {
    console.log(`  ⚠  HTML file not found: ${lang}/index.html — skipping.`);
    return false;
  }

  const translations = JSON.parse(fs.readFileSync(localeFile, "utf-8"));
  const html = fs.readFileSync(htmlFile, "utf-8");
  const $ = cheerio.load(html, { decodeEntities: false });

  // Pre-render translations into body elements
  const textCount = prerenderTranslations($, translations);

  // Translate FAQ JSON-LD schema
  const schemaCount = translateFaqSchema($, translations);

  // Write back
  fs.writeFileSync(htmlFile, $.html(), "utf-8");

  console.log(
    `  ✅ ${lang}/index.html — ${textCount} text elements + ${schemaCount} schema block(s) translated.`
  );
  return true;
}

function main() {
  const args = process.argv.slice(2);
  const langs = args.length > 0 ? args : SUPPORTED;

  console.log(`\n🌐 Pre-rendering i18n translations into HTML...\n`);
  console.log(`   Languages: ${langs.join(", ")}\n`);

  let successCount = 0;
  for (const lang of langs) {
    if (processLanguage(lang)) {
      successCount++;
    }
  }

  console.log(`\n🏁 Done — ${successCount}/${langs.length} pages updated.\n`);
}

main();
