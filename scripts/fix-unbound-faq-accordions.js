#!/usr/bin/env node
'use strict';

/**
 * fix-unbound-faq-accordions.js — convert button-variant FAQ items that have
 * no accordion binder into the JS-free <details> disclosure variant.
 *
 * Why this exists
 * ---------------
 * style.css sets `.faq-answer { display: none }` and reveals it only via
 * `.faq-item.open` (added by JS) or `details[open]` (native). A page using
 *
 *     <div class="faq-item"><button class="faq-question">Q</button>
 *       <div class="faq-answer">A</div></div>
 *
 * with nothing binding a click handler therefore renders its answers *never*,
 * while still shipping FAQPage schema describing them — invisible-content
 * markup, which forfeits the rich result and is spammy-structured-markup
 * territory. 63 live pages were in that state (298 answers).
 *
 * It went unnoticed because `auditHtml`'s visibility test reads document text
 * and has no model of CSS, so every one of those pages reported 'ok'.
 * `unboundFaqItems()` in lib/faq-schema-audit.js is the detector, shared with
 * the PR gate; this script is the repair, sharing the same predicate so the
 * two can never disagree about which pages need fixing.
 *
 * The conversion is text-level and deliberately conservative: it rewrites only
 * items matching the exact house shape, preserves the answer's inner markup
 * verbatim, and drops the decorative chevron <svg> (the <details> marker
 * replaces it). Pages that already have a binder are never touched.
 *
 * Usage:
 *   node scripts/fix-unbound-faq-accordions.js            # report only
 *   node scripts/fix-unbound-faq-accordions.js --write    # apply
 */

const fs = require('fs');
const path = require('path');
const { findBinderScripts, unboundFaqItems } = require('./lib/faq-schema-audit');

const ROOT = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');

const ITEM = new RegExp(
  '<div[^>]*class=["\']faq-item["\'][^>]*>\\s*' +
    '<button[^>]*class=["\']faq-question["\'][^>]*>([\\s\\S]*?)</button>\\s*' +
    '<(p|div)[^>]*class=["\']faq-answer["\'][^>]*>([\\s\\S]*?)</\\2>\\s*' +
    '</div>',
  'g'
);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name === 'index.html') out.push(path.relative(ROOT, full));
  }
  return out;
}

const binderScripts = findBinderScripts(ROOT);
let pages = 0;
let items = 0;
const skipped = [];

for (const rel of walk(ROOT)) {
  const file = path.join(ROOT, rel);
  const html = fs.readFileSync(file, 'utf8');
  const hidden = unboundFaqItems(html, { pagePath: rel, binderScripts });
  if (!hidden) continue;

  let converted = 0;
  const next = html.replace(ITEM, (_m, q, _tag, a) => {
    converted++;
    const question = q.replace(/<svg\b[\s\S]*?<\/svg>/g, '').trim();
    return (
      '<details class="faq-item">' +
      `<summary class="faq-question">${question}</summary>` +
      `<p class="faq-answer">${a.trim()}</p>` +
      '</details>'
    );
  });

  // Every item on the page must convert. A partial rewrite would leave a page
  // half-broken, which is worse than leaving it alone for a human to look at.
  if (converted !== hidden) {
    skipped.push({ rel, hidden, converted });
    continue;
  }

  pages++;
  items += converted;
  if (WRITE) fs.writeFileSync(file, next);
  console.log(`  ${WRITE ? 'fixed' : 'would fix'} ${rel} (${converted} item(s))`);
}

console.log('');
console.log(`${WRITE ? 'Converted' : 'Would convert'} ${items} unbound FAQ item(s) across ${pages} page(s).`);
if (skipped.length) {
  console.log(`\n${skipped.length} page(s) SKIPPED — markup does not match the house shape, review by hand:`);
  for (const s of skipped) console.log(`  ${s.rel}: ${s.hidden} unbound, ${s.converted} convertible`);
}
if (!WRITE && items) console.log('Re-run with --write to apply.');
