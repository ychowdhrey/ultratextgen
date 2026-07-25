#!/usr/bin/env node

/**
 * inject-og-image-alt.js
 *
 * Adds a missing <meta property="og:image:alt"> to every page that has an
 * og:image but no matching alt text. Content is reused verbatim from the
 * page's own <meta property="og:title"> (already page-specific, already
 * HTML-escaped, and literally what the generated OG preview card renders) —
 * no fabrication, no re-encoding.
 *
 * Deliberately regex/line-based rather than a full cheerio DOM round-trip:
 * this repo's HTML pages carry raw emoji/glyphs (✦, ♡, …) in <title>/meta
 * content, and re-serializing 2000+ diverse files through a DOM parser risks
 * subtle whitespace/entity drift across files this script has no reason to
 * touch. A surgical single-line insertion avoids that.
 *
 * Usage:
 *   node scripts/inject-og-image-alt.js                # all HTML files
 *   node scripts/inject-og-image-alt.js discord/index.html
 */

const fs = require("fs");
const path = require("path");
const { globSync } = require("glob");

const OG_TITLE_RE = /<meta\s+property="og:title"\s+content="([^"]*)"\s*\/?>/;
const OG_IMAGE_LINE_RE = /^([ \t]*)<meta property="og:image" content="[^"]*">[ \t]*$/m;
const OG_IMAGE_ALT_RE = /<meta\s+property="og:image:alt"/;

function processFile(file) {
  const html = fs.readFileSync(file, "utf-8");

  if (!/<meta property="og:image" content=/.test(html)) return "no-og-image";
  if (OG_IMAGE_ALT_RE.test(html)) return "already-has-alt";

  const titleMatch = html.match(OG_TITLE_RE);
  if (!titleMatch) return "no-og-title";
  const altContent = titleMatch[1];

  const lines = html.split("\n");
  const imgLineIdx = lines.findIndex((l) => OG_IMAGE_LINE_RE.test(l));
  if (imgLineIdx === -1) return "og-image-line-not-matched";

  const indentMatch = lines[imgLineIdx].match(/^([ \t]*)/);
  const indent = indentMatch ? indentMatch[1] : "";

  // Walk past any immediately-following og:image:width/height/type lines
  // so og:image:alt joins that group rather than splitting it.
  let insertAt = imgLineIdx + 1;
  while (
    insertAt < lines.length &&
    /^[ \t]*<meta property="og:image:(width|height|type)" content="[^"]*">[ \t]*$/.test(
      lines[insertAt]
    )
  ) {
    insertAt++;
  }

  const newLine = `${indent}<meta property="og:image:alt" content="${altContent}">`;
  lines.splice(insertAt, 0, newLine);

  fs.writeFileSync(file, lines.join("\n"), "utf-8");
  return "injected";
}

function main() {
  const args = process.argv.slice(2);
  const files =
    args.length > 0
      ? args.map((f) => path.resolve(f))
      : globSync("**/*.html", { ignore: ["node_modules/**"], absolute: true });

  console.log(`🔍 Found ${files.length} HTML file(s) to check.\n`);

  const counts = {};
  const skippedDetails = [];

  for (const file of files) {
    const result = processFile(file);
    counts[result] = (counts[result] || 0) + 1;
    if (result !== "injected" && result !== "already-has-alt" && result !== "no-og-image") {
      skippedDetails.push(`${path.relative(process.cwd(), file)} — ${result}`);
    }
  }

  console.log("── Summary ──");
  for (const [k, v] of Object.entries(counts)) {
    console.log(`   ${k}: ${v}`);
  }

  if (skippedDetails.length) {
    console.log("\n⚠  Needs manual attention:");
    skippedDetails.forEach((d) => console.log(`   ${d}`));
  }

  console.log("\n🏁 Done.");
}

main();
