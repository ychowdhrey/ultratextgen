/* ==========================================================
   update-sitemap.test.js
   Assertions for getContentImages() — the rule deciding which on-page
   images the sitemap declares.

   No DOM, no dependencies, no runner:
       node scripts/update-sitemap.test.js
   Exits non-zero on the first failure, and prints every assertion.

   This file exists because the decorative/content split is invisible when
   it breaks. Getting it wrong in one direction declares ~2,000 decorative
   hero banners that restate their own <h1> — images an image sitemap is
   explicitly not for. Getting it wrong in the other direction silently
   drops the specimen charts the whole image-SEO probe depends on, and the
   only symptom would be a null result 45 days later that looks like the
   experiment failing rather than the images never being declared.

   The site's own markup already encodes the distinction, and the rule reads
   it rather than hardcoding paths: guide/ uses a visible guide-hero-figure
   with real descriptive alt, while answers/ and most pages use a decorative
   page-hero-figure shipped aria-hidden with a null alt (see CLAUDE.md,
   "Content Type: Updates", which states that split directly).
   ========================================================== */
const { getContentImages } = require("./update-sitemap.js");

let pass = 0;
let fail = 0;

function eq(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
    console.log(`  ok   ${label}`);
  } else {
    fail++;
    console.error(`  FAIL ${label}\n         expected ${e}\n         actual   ${a}`);
  }
}

const B = "https://ultratextgen.com";

// --- decorative: excluded -------------------------------------------------
eq("decorative hero (aria-hidden figure + null alt) is not declared",
  getContentImages(
    '<figure class="page-hero-figure" data-uthero aria-hidden="true">' +
    '<img src="/assets/hero/about.svg" width="1200" height="340" alt=""></figure>'),
  []);

eq("null alt alone is enough to exclude, with no aria-hidden anywhere",
  getContentImages('<img src="/assets/hero/x.svg" alt="">'),
  []);

eq("whitespace-only alt counts as null, not as a description",
  getContentImages('<img src="/assets/hero/x.svg" alt="   ">'),
  []);

eq("no alt attribute at all is excluded — undescribed is not indexable content",
  getContentImages('<img src="/assets/hero/x.svg">'),
  []);

eq("aria-hidden on the <img> itself excludes it even with a real alt",
  getContentImages('<img src="/a.png" alt="Real description" aria-hidden="true">'),
  []);

// --- content: included ----------------------------------------------------
eq("specimen chart is declared",
  getContentImages(
    '<figure class="specimen-figure">' +
    '<img src="/assets/specimen/library-roblox-symbols.png" width="1200" height="1076" ' +
    'loading="lazy" decoding="async" alt="Roblox Symbols"></figure>'),
  [`${B}/assets/specimen/library-roblox-symbols.png`]);

eq("visible guide hero (no aria-hidden, descriptive alt) is declared",
  getContentImages(
    '<figure class="guide-hero-figure">' +
    '<img src="/guide/assets/bio-formatting-without-spam.svg" alt="A cluttered bio card ' +
    'next to a clean one."></figure>'),
  [`${B}/guide/assets/bio-formatting-without-spam.svg`]);

eq("a non-Latin alt is a real description",
  getContentImages('<img src="/assets/specimen/ko.png" alt="화살표 기호">'),
  [`${B}/assets/specimen/ko.png`]);

eq("an already-absolute same-origin src is kept as-is, not double-prefixed",
  getContentImages(`<img src="${B}/assets/specimen/x.png" alt="Described">`),
  [`${B}/assets/specimen/x.png`]);

// --- origin and URL-shape rules ------------------------------------------
eq("a third-party image is never declared — not ours to claim",
  getContentImages('<img src="https://example.com/a.png" alt="Described">'),
  []);

eq("a data: URI is skipped — there is no URL for Google Images to index",
  getContentImages('<img src="data:image/png;base64,iVBOR" alt="Described">'),
  []);

eq("a protocol-relative URL is skipped rather than mangled into a path",
  getContentImages('<img src="//cdn.example.com/a.png" alt="Described">'),
  []);

// --- mixed pages ----------------------------------------------------------
eq("a page with both keeps only the content image, in document order",
  getContentImages(
    '<figure class="page-hero-figure" aria-hidden="true">' +
    '<img src="/assets/hero/library-roblox-symbols.svg" alt=""></figure>' +
    '<p>copy</p>' +
    '<figure class="specimen-figure">' +
    '<img src="/assets/specimen/library-roblox-symbols.png" alt="Roblox Symbols"></figure>'),
  [`${B}/assets/specimen/library-roblox-symbols.png`]);

eq("two decorative figures do not swallow a content image sitting between them",
  getContentImages(
    '<figure aria-hidden="true"><img src="/a.svg" alt=""></figure>' +
    '<img src="/mid.png" alt="Between">' +
    '<figure aria-hidden="true"><img src="/b.svg" alt=""></figure>'),
  [`${B}/mid.png`]);

eq("single-quoted attributes parse the same as double-quoted",
  getContentImages("<img src='/assets/specimen/x.png' alt='Described'>"),
  [`${B}/assets/specimen/x.png`]);

eq("a page with no images yields none",
  getContentImages("<p>no images here</p>"),
  []);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
