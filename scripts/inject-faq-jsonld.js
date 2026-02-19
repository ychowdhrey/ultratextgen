#!/usr/bin/env node

/**
 * inject-faq-jsonld.js
 *
 * Parses HTML files, extracts FAQ blocks from the DOM,
 * builds FAQPage JSON-LD, and injects it before </head>.
 *
 * Safely handles pages that already contain manually pasted JSON-LD:
 *   • Standalone FAQPage blocks  → removed and replaced
 *   • FAQPage inside a JSON array (alongside WebSite, Organization, etc.)
 *       → only the FAQPage entry is removed; other entries are preserved
 *
 * Usage:
 *   node scripts/inject-faq-jsonld.js                       # all HTML files
 *   node scripts/inject-faq-jsonld.js linkedin/index.html    # single file
 *
 * Requirements:
 *   npm install cheerio glob
 */

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { globSync } = require("glob");

/* ───────────────────────── helpers ───────────────────────── */

function cleanText(el, $) {
  const clone = $(el).clone();
  clone.find("svg").remove();
  return clone.text().replace(/\s+/g, " ").trim();
}

function answerHtml(el, $) {
  return $(el).html().replace(/\s+/g, " ").trim();
}

/* ──────────────────────── extraction ─────────────────────── */

function extractFaqItems(html) {
  const $ = cheerio.load(html);
  const items = [];

  $(".faq-item").each((_, faqItem) => {
    const questionEl = $(faqItem).find(".faq-question").first();
    const answerEl = $(faqItem).find(".faq-answer").first();
    if (!questionEl.length || !answerEl.length) return;

    const question = cleanText(questionEl, $);
    const answer = answerHtml(answerEl, $);
    if (question && answer) items.push({ question, answer });
  });

  return items;
}

/* ──────────────────────── JSON-LD ────────────────────────── */

function buildJsonLd(faqItems) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };
}

function jsonLdTag(faqItems) {
  const payload = JSON.stringify(buildJsonLd(faqItems), null, 2);
  return `<script type="application/ld+json">
${payload}
</script>`;
}

/* ────────────── safe removal of existing FAQPage ─────────── */

/**
 * Iterate over every <script type="application/ld+json"> tag and:
 *
 *  1. If the payload is a plain object with "@type": "FAQPage"
 *     → remove the entire <script> tag.
 *
 *  2. If the payload is an array that *contains* a FAQPage entry
 *     (like index.html: [WebSite, Organization, WebApp, FAQPage])
 *     → filter out only the FAQPage entry, keep everything else.
 *
 *  3. All other ld+json blocks (WebSite, Organization, etc.)
 *     → left completely untouched.
 */
function stripExistingFaqJsonLd(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  let removedCount = 0;

  $('script[type="application/ld+json"]').each((_, el) => {
    let data;
    try {
      data = JSON.parse($(el).html());
    } catch {
      return; // malformed JSON — skip
    }

    // ── Case 1: standalone FAQPage object ──
    if (data && !Array.isArray(data) && data["@type"] === "FAQPage") {
      $(el).remove();
      removedCount++;
      return;
    }

    // ── Case 2: FAQPage inside a JSON array ──
    if (Array.isArray(data)) {
      const before = data.length;
      const filtered = data.filter(
        (entry) => !(entry && entry["@type"] === "FAQPage")
      );

      if (filtered.length < before) {
        removedCount++;
        if (filtered.length === 0) {
          // every entry was FAQPage — remove the whole tag
          $(el).remove();
        } else {
          // preserve the remaining entries
          $(el).html("\n" + JSON.stringify(filtered, null, 2) + "\n");
        }
      }
    }

    // ── Case 3: @graph wrapper ──
    if (data && Array.isArray(data["@graph"])) {
      const before = data["@graph"].length;
      data["@graph"] = data["@graph"].filter(
        (node) => !(node && node["@type"] === "FAQPage")
      );
      if (data["@graph"].length < before) {
        removedCount++;
        $(el).html("\n" + JSON.stringify(data, null, 2) + "\n");
      }
    }
  });

  return { html: $.html(), removedCount };
}

/* ──────────────────────── injection ──────────────────────── */

function injectJsonLd(html, faqItems) {
  // 1. Safely remove any existing FAQPage (handles all formats)
  const { html: cleaned, removedCount } = stripExistingFaqJsonLd(html);

  if (removedCount > 0) {
    console.log(`    ♻️  Removed ${removedCount} existing FAQPage block(s).`);
  }

  // 2. Build new tag
  const tag = jsonLdTag(faqItems);

  // 3. Inject before </head>
  const headClose = cleaned.indexOf("</head>");
  if (headClose === -1) {
    console.warn("    ⚠  No </head> found; appending to end of file.");
    return cleaned + "\n" + tag + "\n";
  }

  return cleaned.slice(0, headClose) + tag + "\n" + cleaned.slice(headClose);
}

/* ──────────────────────── main ───────────────────────────── */

function processFile(filePath) {
  const html = fs.readFileSync(filePath, "utf-8");
  const faqItems = extractFaqItems(html);

  if (faqItems.length === 0) {
    console.log(`⏭  ${filePath} — no FAQ items found, skipping.`);
    return;
  }

  const output = injectJsonLd(html, faqItems);
  fs.writeFileSync(filePath, output, "utf-8");
  console.log(`✅ ${filePath} — injected ${faqItems.length} FAQ items.`);
}

function main() {
  const args = process.argv.slice(2);
  const files =
    args.length > 0
      ? args.map((f) => path.resolve(f))
      : globSync("**/*.html", { ignore: ["node_modules/**"], absolute: true });

  console.log(`\n🔍 Found ${files.length} HTML file(s) to process.\n`);

  for (const file of files) processFile(file);

  console.log(`\n🏁 Done.\n`);
}

main();