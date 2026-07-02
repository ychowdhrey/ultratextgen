#!/usr/bin/env node
/* ==========================================================================
   build-answer-pages.js

   Emits answers/<slug>/index.html for the accent/device/searchability
   cluster from per-page content configs, sharing one correct copy of the
   GTM + head + JSON-LD (FAQPage + BreadcrumbList) boilerplate so every
   answer page stays consistent. Mirrors the hand-authored answers template
   (Short-answer block, editorial-section bodies, CTA, related, FAQ).

   Run:  node scripts/build-answer-pages.js
   The site build injects the scriptwrapper tag server-side, so it is not
   emitted here.
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://ultratextgen.com';

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
  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-P55HXK8Q');</script>
  <!-- End Google Tag Manager -->
  <script data-grow-initializer="">!(function(){window.growMe||((window.growMe=function(e){window.growMe._.push(e);}),(window.growMe._=[]));var e=document.createElement("script");(e.type="text/javascript"),(e.src="https://faves.grow.me/main.js"),(e.defer=!0),e.setAttribute("data-grow-faves-site-id","U2l0ZTplMzgxNTIwYS1jYTIzLTQ4Y2EtYTA2Ni04M2M0MjBkZGRkZWE=");var t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t);})();</script>
  <script type="text/javascript" async="async" data-noptimize="1" data-cfasync="false" src="//scripts.scriptwrapper.com/tags/e381520a-ca23-48ca-a066-83c420ddddea.js"></script>
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

let count = 0;
for (const cfg of PAGES) {
  const dir = path.join(ROOT, 'answers', cfg.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(cfg));
  console.log('wrote answers/' + cfg.slug + '/index.html');
  count++;
}
console.log(`\n${count} answer pages written.`);
