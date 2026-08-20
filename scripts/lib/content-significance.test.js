'use strict';
/**
 * node scripts/lib/content-significance.test.js
 *
 * Zero-dependency assertions for the lastmod significance hash. This module
 * decides whether <lastmod> advances, so a silent regression here re-creates
 * the exact defect it was written for: 2,533 pages bumped on 2026-08-15/16 by
 * cosmetic passes, and 69% of pages advertising a lastmod newer than their
 * real content change.
 *
 * The two halves matter equally. Over-sensitivity re-floods the sitemap with
 * meaningless bumps; under-sensitivity hides genuine copy fixes from Google,
 * which would make a translation repair pass invisible.
 */

const { significanceHash } = require('./content-significance');

const PAGE = [
  '<!DOCTYPE html><html lang="id"><head>',
  '<title>Nama FF Keren</title>',
  '<meta name="description" content="Generator nama">',
  '<link rel="canonical" href="https://ultratextgen.com/id/">',
  '<link rel="alternate" hreflang="en" href="https://ultratextgen.com/">',
  '<script>var gtm=1;</script>',
  '<script type="application/ld+json">{"@type":"FAQPage"}</script>',
  '</head><body>',
  '<nav aria-label="Breadcrumb"><a href="/id/">Beranda</a></nav>',
  '<h1>Nama FF Keren</h1>',
  '<p>Buat nama keren untuk Free Fire.</p>',
  '<button data-symbol="♥" aria-label="Salin hati">Salin</button>',
  '<span class="flag-label">Hati</span>',
  '<a href="/id/usecase/nama-tiktok-keren/">Nama TikTok</a>',
  '</body></html>',
].join('\n');

const IGNORED = [
  ['aria-label rewritten',   h => h.replace(/aria-label="Breadcrumb"/, 'aria-label="Navigasi remah"')],
  ['hreflang entry added',   h => h.replace('</head>', '<link rel="alternate" hreflang="de" href="https://x/"></head>')],
  ['canonical changed',      h => h.replace(/rel="canonical" href="[^"]*"/, 'rel="canonical" href="https://y/"')],
  ['JSON-LD edited',         h => h.replace('"FAQPage"', '"QAPage"')],
  ['inline script changed',  h => h.replace('var gtm=1;', 'var gtm=2;')],
  ['whitespace reflowed',    h => h.replace(/\n/g, '\n  ')],
  ['HTML comment added',     h => h.replace('<body>', '<body><!-- build 42 -->')],
];

const DETECTED = [
  ['visible prose changed',  h => h.replace('Buat nama keren', 'Bikin nama keren')],
  ['H1 changed',             h => h.replace('<h1>Nama FF Keren</h1>', '<h1>Nama FF Terbaik</h1>')],
  ['title changed',          h => h.replace('<title>Nama FF Keren</title>', '<title>Nama FF Baru</title>')],
  ['meta description',       h => h.replace('content="Generator nama"', 'content="Generator nama FF"')],
  ['clipboard payload',      h => h.replace('data-symbol="♥"', 'data-symbol="❤"')],
  ['visible tile label',     h => h.replace('>Hati<', '>Cinta<')],
  ['internal link added',    h => h.replace('</body>', '<a href="/id/font-tiktok/">x</a></body>')],
  ['internal link removed',  h => h.replace(/<a href="\/id\/usecase\/nama-tiktok-keren\/">[^<]*<\/a>/, '')],
];

const base = significanceHash(PAGE);
let pass = 0;
const fails = [];

for (const [name, mutate] of IGNORED) {
  const same = significanceHash(mutate(PAGE)) === base;
  same ? pass++ : fails.push(`IGNORED "${name}" changed the hash (would bump lastmod for nothing)`);
}
for (const [name, mutate] of DETECTED) {
  const moved = significanceHash(mutate(PAGE)) !== base;
  moved ? pass++ : fails.push(`DETECTED "${name}" did not change the hash (real edit would stay invisible)`);
}

const total = IGNORED.length + DETECTED.length;
if (fails.length) {
  console.error(`content-significance: ${pass}/${total} passed\n`);
  for (const f of fails) console.error('  FAIL  ' + f);
  process.exit(1);
}
console.log(`content-significance: ${pass}/${total} assertions pass ` +
            `(${IGNORED.length} cosmetic ignored, ${DETECTED.length} real changes detected)`);
