#!/usr/bin/env node

/**
 * inject-image-schema.js
 *
 * Adds a schema.org "image" property (pointing at the page's own canonical
 * og:image asset) to the primary content entity in each indexable page's
 * JSON-LD — the entity types Google's structured-data docs associate with
 * image indexing/rich results (Article/NewsArticle explicitly require it
 * for rich-result eligibility) or that otherwise represent "this page"
 * (WebApplication, WebPage, CollectionPage, HowTo, QAPage, WebSite).
 *
 * Deliberately narrow: FAQPage, BreadcrumbList, Organization and Person are
 * left untouched (image means something different — or nothing — for those
 * types) and no new visual asset is created; this only wires existing
 * og:image URLs into existing JSON-LD, and only where that field is
 * currently missing (idempotent).
 *
 * Pure string-level substitution — every file is byte-identical except for
 * the JSON-LD payload text itself, no full-document re-serialization.
 *
 * Usage:
 *   node scripts/inject-image-schema.js              # all HTML files
 *   node scripts/inject-image-schema.js discord/index.html
 *
 * Requirements:
 *   npm install glob
 */

const fs = require("fs");
const path = require("path");
const { globSync } = require("glob");

const REPO_ROOT = path.resolve(__dirname, "..");
const BASE_URL = "https://ultratextgen.com";
const LOGO_FALLBACK = `${BASE_URL}/logo.png`;

// Entity types that represent "this page" (or, for Article/NewsArticle,
// types where Google's own guidelines call for an image). Left out on
// purpose: FAQPage, BreadcrumbList, Organization, Person, Question, Answer,
// Offer, ImageObject — image means something different (or nothing) there.
const TARGET_TYPES = new Set([
  "WebApplication",
  "SoftwareApplication",
  "Article",
  "NewsArticle",
  "BlogPosting",
  "WebPage",
  "CollectionPage",
  "HowTo",
  "QAPage",
  "WebSite",
]);

const OG_IMAGE_RE = /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/;
const SCRIPT_RE = /(<script\s+type=["']application\/ld\+json["']>)([\s\S]*?)(<\/script>)/g;

function getOgImage(html) {
  const m = html.match(OG_IMAGE_RE);
  if (!m || m[1] === LOGO_FALLBACK) return null;
  return m[1];
}

function processFile(file) {
  const abs = path.join(REPO_ROOT, file);
  const html = fs.readFileSync(abs, "utf8");
  const image = getOgImage(html);
  if (!image) return { file, skipped: "no og:image" };

  let touchedBlocks = 0;
  const output = html.replace(SCRIPT_RE, (whole, openTag, payload, closeTag) => {
    let data;
    try {
      data = JSON.parse(payload);
    } catch {
      return whole; // malformed / non-JSON block — leave untouched
    }

    const items = Array.isArray(data) ? data : [data];
    let touchedThisBlock = false;
    for (const item of items) {
      if (
        item &&
        typeof item === "object" &&
        TARGET_TYPES.has(item["@type"]) &&
        !("image" in item)
      ) {
        item.image = image;
        touchedThisBlock = true;
      }
    }
    if (!touchedThisBlock) return whole;
    touchedBlocks++;

    const pretty = payload.includes("\n");
    const rebuilt = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    return pretty ? `${openTag}\n${rebuilt}\n${closeTag}` : `${openTag}${rebuilt}${closeTag}`;
  });

  if (touchedBlocks === 0) return { file, skipped: "no eligible entity missing image" };

  fs.writeFileSync(abs, output, "utf8");
  return { file, updated: touchedBlocks };
}

function main() {
  const only = process.argv[2];
  const files = only
    ? [only]
    : globSync("**/index.html", { cwd: REPO_ROOT, ignore: ["node_modules/**", ".git/**"] });

  let updatedFiles = 0;
  let updatedBlocks = 0;
  let skippedNoImage = 0;
  let skippedNoop = 0;

  for (const file of files) {
    const result = processFile(file);
    if (result.updated) {
      updatedFiles++;
      updatedBlocks += result.updated;
    } else if (result.skipped === "no og:image") {
      skippedNoImage++;
    } else {
      skippedNoop++;
    }
  }

  console.log(`Files scanned:        ${files.length}`);
  console.log(`Files updated:        ${updatedFiles}`);
  console.log(`JSON-LD blocks fixed: ${updatedBlocks}`);
  console.log(`Skipped (no og:image):${skippedNoImage}`);
  console.log(`Skipped (no-op):      ${skippedNoop}`);
}

main();
