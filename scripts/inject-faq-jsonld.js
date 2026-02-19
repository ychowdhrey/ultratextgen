#!/usr/bin/env node

/**
 * inject-faq-jsonld.js
 *
 * Parses HTML files, extracts FAQ blocks from the DOM,
 * scores each FAQ by answer length and question uniqueness,
 * selects the top 10, builds FAQPage JSON-LD, and injects it before </head>.
 *
 * Scoring formula (per FAQ item):
 *   lengthScore   = min(answerPlainText.length / 400, 1)          0 → 1
 *   uniqueScore   = 1 − (maxBigramOverlap with any previous FAQ)  0 → 1
 *   totalScore    = (0.4 × lengthScore) + (0.6 × uniqueScore)
 *
 * Only the top MAX_FAQ (default 10) items by totalScore are injected.
 *
 * Safely handles pages that already contain manually pasted JSON-LD:
 *   • Standalone FAQPage blocks  → removed and replaced
 *   • FAQPage inside a JSON array (alongside WebSite, Organization, etc.)
 *       → only the FAQPage entry is removed; other entries are preserved
 *
 * Usage:
 *   node scripts/inject-faq-jsonld.js                       # all HTML files
 *   node scripts/inject-faq-jsonld.js linkedin/index.html    # single file
 *   MAX_FAQ=5 node scripts/inject-faq-jsonld.js              # override limit
 *
 * Requirements:
 *   npm install cheerio glob
 */

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { globSync } = require("glob");

const MAX_FAQ = parseInt(process.env.MAX_FAQ, 10) || 10;

/* ───────────────────────── helpers ───────────────────────── */

function cleanText(el, $) {
  const clone = $(el).clone();
  clone.find("svg").remove();
  return clone.text().replace(/\s+/g, " ").trim();
}

function answerHtml(el, $) {
  return $(el).html().replace(/\s+/g, " ").trim();
}

/** Strip HTML tags to get plain text (used for scoring). */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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

/* ──────────────────────── scoring ─────────────────────────── */

/**
 * Build a Set of word bigrams from a string.
 * e.g. "how does it work" → {"how does", "does it", "it work"}
 */
function bigrams(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  const set = new Set();
  for (let i = 0; i < words.length - 1; i++) {
    set.add(words[i] + " " + words[i + 1]);
  }
  return set;
}

/**
 * Jaccard similarity between two bigram sets (0 → 1).
 */
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const bg of setA) {
    if (setB.has(bg)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Score and rank FAQ items.  Returns the top `limit` items.
 *
 * Each item is scored on two axes:
 *   1. Length score  — longer answers are more valuable to searchers.
 *      Normalized: min(plainTextLength / 400, 1).  400 chars ≈ a solid paragraph.
 *
 *   2. Uniqueness score — penalizes questions that are near-duplicates of
 *      higher-scoring items already selected.
 *      Measured via bigram Jaccard distance against all previously selected Qs.
 *
 * Weights: 40% length, 60% uniqueness (uniqueness matters more for rich results).
 */
function rankFaqItems(items, limit) {
  if (items.length <= limit) return items;

  // Pre-compute plain-text answer lengths and question bigrams
  const enriched = items.map((item) => ({
    ...item,
    plainAnswer: stripHtml(item.answer),
    qBigrams: bigrams(item.question),
  }));

  // Greedy selection: pick the best remaining item each round
  const selected = [];
  const remaining = [...enriched];

  while (selected.length < limit && remaining.length > 0) {
    let bestIdx = -1;
    let bestScore = -1;

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];

      // ── Length score (0 → 1) ──
      const lengthScore = Math.min(item.plainAnswer.length / 400, 1);

      // ── Uniqueness score (0 → 1) ──
      let maxOverlap = 0;
      for (const prev of selected) {
        const sim = jaccardSimilarity(item.qBigrams, prev.qBigrams);
        if (sim > maxOverlap) maxOverlap = sim;
      }
      const uniqueScore = 1 - maxOverlap;

      // ── Combined score ──
      const totalScore = 0.4 * lengthScore + 0.6 * uniqueScore;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestIdx = i;
      }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  console.log(`    📊 Scored ${items.length} FAQs → selected top ${selected.length}:`);
  selected.forEach((s, i) => {
    const len = s.plainAnswer.length;
    console.log(`       ${i + 1}. [${len} chars] ${s.question.slice(0, 80)}${s.question.length > 80 ? "…" : ""}`);
  });

  // Return only the fields needed downstream
  return selected.map(({ question, answer }) => ({ question, answer }));
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
  return `<script type=\"application/ld+json\">
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
          $(el).html(\n" + JSON.stringify(filtered, null, 2) + "\n);
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
        $(el).html(\n" + JSON.stringify(data, null, 2) + "\n);
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
  const allItems = extractFaqItems(html);

  if (allItems.length === 0) {
    console.log(`⏭  ${filePath} — no FAQ items found, skipping.`);
    return;
  }

  // Score, rank, and select the top FAQs
  const topItems = rankFaqItems(allItems, MAX_FAQ);

  const output = injectJsonLd(html, topItems);
  fs.writeFileSync(filePath, output, "utf-8");
  console.log(`✅ ${filePath} — injected ${topItems.length}/${allItems.length} FAQ items.\n`);
}

function main() {
  const args = process.argv.slice(2);
  const files =
    args.length > 0
      ? args.map((f) => path.resolve(f))
      : globSync("**/*.html", { ignore: ["node_modules/**"], absolute: true });

  console.log(`\n🔍 Found ${files.length} HTML file(s) to process.`);
  console.log(`📏 MAX_FAQ = ${MAX_FAQ} (override with MAX_FAQ=N env var)\n`);

  for (const file of files) processFile(file);

  console.log(`🏁 Done.\n`);
}

main();