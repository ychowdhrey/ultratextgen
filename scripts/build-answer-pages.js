#!/usr/bin/env node
/* ==========================================================================
   build-answer-pages.js

   Emits answers/<slug>/index.html for the accent/device/searchability
   cluster from per-page content configs, sharing one correct copy of the
   GTM + head + JSON-LD (FAQPage + BreadcrumbList) boilerplate so every
   answer page stays consistent. Mirrors the hand-authored answers template
   (Short-answer block, editorial-section bodies, CTA, related, FAQ).

   Run:
     node scripts/build-answer-pages.js                    # DRY RUN — reports drift, writes nothing
     node scripts/build-answer-pages.js <slug> [<slug>…]   # regenerate only those pages
     node scripts/build-answer-pages.js --all              # rewrite every page from the config
     node scripts/build-answer-pages.js --list             # list available slugs

   A bare run used to rewrite all 19 pages, which silently reset any content
   that lives only in the HTML — several live pages carry hand-added sections
   and example blocks that were never back-ported into the config. So the
   destructive mode is now opt-in (--all) and the default reports what would
   change instead. Name the slug you mean when adding or editing one page.

   Pages are emitted COMPLETE: the Funding Choices tag and the decorative hero
   figure are part of the template, so no post-generation pass has to inject
   them and regenerating a page cannot drop them.

   Ads: pages carry the Google AdSense loader (Auto Ads). The Journey/Grow/
   Mediavine scripts were removed site-wide in favor of AdSense.
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://ultratextgen.com';

// Google Funding Choices (ad-blocking recovery) tag. Read from
// scripts/data/funding-choices-tag.html — the single source of truth shared
// with scripts/inject-funding-choices-tag.js, so this generator and the
// injector can never emit different snippets. Every page must carry it
// (scripts/check-funding-choices.js enforces it); emitting pages without it
// meant a regenerated page silently lost a tag the injector had added.
const FUNDING_CHOICES_TAG = fs
  .readFileSync(path.join(__dirname, 'data', 'funding-choices-tag.html'), 'utf8')
  .trim();

function faqJsonLd(faq) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  }, null, 2);
}

function breadcrumbJsonLd(slug, name) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Answers', item: BASE + '/answers/' },
      { '@type': 'ListItem', position: 3, name: name, item: `${BASE}/answers/${slug}/` }
    ]
  }, null, 2);
}

/**
 * Decorative hero figure, emitted here rather than injected afterwards by
 * scripts/wire-site-art.py. The generator knows the slug, so it knows the art
 * path — and a page that generates complete needs no post-hoc mutation pass,
 * which is what made regenerating one page silently drop the figure from it.
 *
 * Emitted only when the SVG actually exists: referencing art that isn't on
 * disk would ship a 404 to Googlebot (see CLAUDE.md, "New pages must ship with
 * their hero/OG/Twitter art in the same change"), so a missing file warns and
 * emits nothing instead.
 */
function heroFigure(slug) {
  const rel = `assets/hero/answers-${slug}.svg`;
  if (!fs.existsSync(path.join(ROOT, rel))) {
    console.warn(
      `  ! no hero art for answers/${slug} — expected ${rel}.\n` +
        `    Register it in scripts/generate-site-art.py's PAGES dict as ` +
        `"answers-${slug}" and run:\n` +
        `      python3 scripts/generate-site-art.py answers-${slug}`
    );
    return '';
  }
  return `<figure class="page-hero-figure" data-uthero aria-hidden="true">
  <img src="/${rel}" width="1200" height="340"
       fetchpriority="high" alt="">
</figure>`;
}

function page(cfg) {
  const url = `${BASE}/answers/${cfg.slug}/`;
  const og = `${BASE}/assets/og/answers-${cfg.slug}.png`;
  const sections = cfg.sections.map(s => `
<div class="section-divider"></div>

<section class="editorial-section">
  <span class="article-section-label">${s.label}</span>
  <h2>${s.h2}</h2>
  ${s.bodyHtml}
</section>`).join('\n');

  const faqItems = cfg.faq.map(f => `
  <div class="faq-item">
    <button class="faq-question" type="button">${f.q}</button>
    <div class="faq-answer">
      <p>${f.aHtml || f.a}</p>
    </div>
  </div>`).join('');

  return `<!DOCTYPE html><html lang="en"><head>
${FUNDING_CHOICES_TAG}
  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-P55HXK8Q');</script>
  <!-- End Google Tag Manager -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8242324164413945"
       crossorigin="anonymous"></script>

  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>${cfg.pageTitle} | UltraTextGen</title>
  <meta name="description" content="${cfg.metaDesc}">
  <link rel="canonical" href="${url}">
  <meta property="og:title" content="${cfg.pageTitle}">
  <meta property="og:description" content="${cfg.metaDesc}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="${og}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${cfg.pageTitle}">
  <meta name="twitter:description" content="${cfg.twitterDesc || cfg.metaDesc}">
  <meta name="twitter:image" content="${og}">

  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">

<script type="application/ld+json">
${faqJsonLd(cfg.faq)}
</script>

<script type="application/ld+json">
${breadcrumbJsonLd(cfg.slug, cfg.crumb)}
</script>
</head>
<body>
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-P55HXK8Q"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->
<script src="/header.js"></script>

<nav class="breadcrumbs" aria-label="Breadcrumb">
  <a href="/">Home</a>
  <span class="breadcrumb-separator">›</span>
  <a href="/answers/">Answers</a>
  <span class="breadcrumb-separator">›</span>
  <span class="breadcrumb-current">${cfg.crumb}</span>
</nav>

<section class="hero">
  <div class="hero-inner">
    <h1 class="hero-headline">${cfg.h1}</h1>
    <p class="hero-tagline">${cfg.tagline}</p>
  </div>
</section>
${heroFigure(cfg.slug)}

<section class="editorial-section">
  <span class="article-section-label">Short answer</span>
  <div class="editorial-block">
    <p>${cfg.shortAnswer}</p>
  </div>${cfg.oneLiner ? `
  <div class="block-example">
    ${cfg.oneLiner}
  </div>` : ''}
</section>
${sections}

<div class="cta-card">
  <h3>${cfg.cta.h3}</h3>
  <p>${cfg.cta.p}</p>
  <a href="${cfg.cta.href}" class="cta-btn">${cfg.cta.label}</a>
</div>

<section class="editorial-section">
  <div class="editorial-block">
    <p>${cfg.related}</p>
  </div>
</section>

<footer class="footer">
  <div class="footer-inner">
  </div>
</footer>

<!-- FAQ -->
<section class="editorial-section">
  <span class="article-section-label">FAQ</span>
  <h2>Frequently Asked Questions</h2>
${faqItems}
</section>

<script>
  document.querySelectorAll('.faq-question').forEach(function(btn){
    btn.addEventListener('click', function(){ this.closest('.faq-item').classList.toggle('open'); });
  });
</script>
<script src="/footer.js"></script>
</body>
</html>
`;
}

const PAGES = require('./answer-pages-content.js');

// Slug filter. Without one this rewrites all 19 pages from the config on every
// run, which silently reverts anything added to a page after it was generated —
// exactly how a regenerated page used to lose its Funding Choices tag, and how
// any later hand-edit would be lost too. Pass slugs to regenerate only those:
//
//   node scripts/build-answer-pages.js                       # all (unchanged)
//   node scripts/build-answer-pages.js what-does-o7-mean     # just that page
//   node scripts/build-answer-pages.js --list                # show slugs
//
// Prefer naming slugs when adding or editing one page. A full run is still
// correct, but review its diff — a page that has drifted from the config will
// be reset to it.
const args = process.argv.slice(2).filter((a) => a !== '--');

if (args.includes('--list')) {
  PAGES.forEach((cfg) => console.log(cfg.slug));
  process.exit(0);
}

const wantAll = args.includes('--all');
const slugArgs = args.filter((a) => !a.startsWith('--'));

const known = new Set(PAGES.map((cfg) => cfg.slug));
const unknown = slugArgs.filter((a) => !known.has(a));
if (unknown.length) {
  console.error(`Unknown slug(s): ${unknown.join(', ')}`);
  console.error('Run with --list to see the available slugs.');
  process.exit(1);
}

// A full rewrite is destructive and no longer the default. Several live pages
// carry content that exists only in their HTML — hand-added sections, examples,
// styled blocks — and were being silently reset to the config on every run. So
// with no slugs and no --all, report what a full run WOULD change and stop.
if (!slugArgs.length && !wantAll) {
  const drifted = [];
  for (const cfg of PAGES) {
    const file = path.join(ROOT, 'answers', cfg.slug, 'index.html');
    if (!fs.existsSync(file)) {
      drifted.push({ slug: cfg.slug, delta: null });
      continue;
    }
    const current = fs.readFileSync(file, 'utf8');
    const next = page(cfg);
    if (current !== next) drifted.push({ slug: cfg.slug, delta: next.length - current.length });
  }

  console.log('Answer-page build — dry run (no files written)\n');
  if (!drifted.length) {
    console.log('Every page already matches its config. Nothing to do.');
    process.exit(0);
  }
  for (const d of drifted) {
    if (d.delta === null) console.log(`  + answers/${d.slug}/  (does not exist yet)`);
    else if (d.delta < 0) console.log(`  ! answers/${d.slug}/  would SHRINK by ${-d.delta} bytes — likely HTML-only content that is not in the config`);
    else console.log(`  ~ answers/${d.slug}/  would grow by ${d.delta} bytes`);
  }
  console.log(
    `\n${drifted.length} page(s) differ from the config.\n` +
      'Nothing was written. Name the slug(s) you mean, or pass --all to rewrite every page\n' +
      'from the config — which will DISCARD any content that lives only in the HTML.\n' +
      'Anything worth keeping should be moved into scripts/answer-pages-content.js first.'
  );
  process.exit(0);
}

const selected = slugArgs.length ? PAGES.filter((cfg) => slugArgs.includes(cfg.slug)) : PAGES;

let count = 0;
for (const cfg of selected) {
  const dir = path.join(ROOT, 'answers', cfg.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(cfg));
  console.log('wrote answers/' + cfg.slug + '/index.html');
  count++;
}
console.log(
  `\n${count} answer page${count === 1 ? '' : 's'} written` +
    (slugArgs.length ? ` (filter: ${slugArgs.join(", ")})` : " — FULL run (--all)") +
    '.'
);
