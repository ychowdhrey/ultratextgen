#!/usr/bin/env node
'use strict';

/**
 * header.test.js
 *
 * Run: node header.test.js        (npm run test:cta-tracking)
 *
 * Zero dependencies, no framework — the same idiom as
 * js/counter/counterRules.test.js and scripts/lib/generator_parity.test.js.
 *
 * WHAT IT COVERS, AND WHY ONLY THIS
 * ---------------------------------
 * header.js is an IIFE with no exports, by design (CLAUDE.md: "No ES modules —
 * scripts use global scope communication intentionally"). So this test does what
 * check-zalgo-decodes.js already does for `generateZalgo()`: it SLICES the pure
 * functions out of the live header.js and evaluates them, rather than
 * reimplementing them here. A second copy of the logic would drift from the
 * first, which is the failure that technique exists to avoid.
 *
 * Scope is the two classifiers behind the `cta_click` event. They decide what
 * every future CTA number means, and both have a real trap in them:
 *
 *   · `/js/` is a genuine two-letter top-level directory on this site and is
 *     NOT a locale. A /^[a-z]{2}/ regex would strip it as one.
 *   · `/library/` and `/library/currency-symbols/` are different answers —
 *     a browse hub versus a specific page — and the locale-prefixed forms
 *     have to agree with the unprefixed ones.
 *
 * The click listener itself is DOM-bound and is not covered here; it is three
 * lines of delegation with no branching.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, 'header.js'), 'utf8');

// Slice the live source: the NAV table plus the three pure functions, exactly
// as written, with nothing retyped.
function slice(startMarker, endMarker) {
  const a = SRC.indexOf(startMarker);
  const b = SRC.indexOf(endMarker, a);
  if (a === -1 || b === -1) {
    throw new Error(`could not slice ${JSON.stringify(startMarker)} out of header.js — has it been renamed?`);
  }
  return SRC.slice(a, b);
}

const NAV_SRC = slice('const NAV = {', '  const EN = {');
const FN_SRC = slice('  var PILLARS = [', '  function initializeCtaTracking()');

const sandbox = { window: { location: { pathname: '/', href: 'https://ultratextgen.com/' } } };
const build = new Function(
  'window',
  `${NAV_SRC}\n${FN_SRC}\nreturn { NAV: NAV, ctaDestinationType: ctaDestinationType, ctaSourceFamily: ctaSourceFamily, stripLocale: stripLocale };`
);
const H = build(sandbox.window);

let PASS = 0, FAIL = 0;
const LINES = [];

function t(name, fn) {
  try {
    fn();
    PASS++; LINES.push(`  ok   ${name}`);
  } catch (err) {
    FAIL++; LINES.push(`  FAIL ${name}\n         ${err.message}`);
  }
}

function eq(actual, expected, what) {
  if (actual !== expected) throw new Error(`${what || ''} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const dest = (href, onPath) => {
  sandbox.window.location.pathname = onPath || '/';
  sandbox.window.location.href = 'https://ultratextgen.com' + (onPath || '/');
  return H.ctaDestinationType(href);
};
const family = (onPath) => {
  sandbox.window.location.pathname = onPath;
  return H.ctaSourceFamily();
};

// ── the case the whole exercise is about ──────────────────────────────────

t('a bare EN homepage href is "homepage"', () => eq(dest('/'), 'homepage'));
t('a locale homepage href is "homepage"', () => eq(dest('/fr/'), 'homepage'));
t('a hyphenated locale homepage is "homepage"', () => eq(dest('/zh-tw/'), 'homepage'));
t('an absolute homepage URL is "homepage"',
  () => eq(dest('https://ultratextgen.com/'), 'homepage'));
t('an absolute locale homepage URL is "homepage"',
  () => eq(dest('https://ultratextgen.com/es/'), 'homepage'));

// ── pillar index vs. a page inside that pillar ────────────────────────────

t('a pillar index is <pillar>_index', () => eq(dest('/library/'), 'library_index'));
t('a page inside a pillar is <pillar>', () => eq(dest('/library/currency-symbols/'), 'library'));
t('a locale pillar index is still <pillar>_index', () => eq(dest('/fr/library/'), 'library_index'));
t('a locale page inside a pillar is still <pillar>', () => eq(dest('/fr/library/symboles/'), 'library'));
t('a symbol spoke is "symbol"', () => eq(dest('/symbol/euro-sign/'), 'symbol'));
t('a category page is "category"', () => eq(dest('/category/bubble-fonts/'), 'category'));

// ── everything else is a tool ─────────────────────────────────────────────

t('a standalone tool is "tool"', () => eq(dest('/character-counter/'), 'tool'));
t('a platform page is "tool"', () => eq(dest('/discord/'), 'tool'));
t('the X platform page is "tool", not a locale',
  () => eq(dest('/x/'), 'tool'));
t('a locale-prefixed tool is "tool"', () => eq(dest('/id/tulisan-cuping/'), 'tool'));

// ── the /js/ trap ─────────────────────────────────────────────────────────

t('TRAP: /js/ is a real directory and is NOT stripped as a locale', () => {
  eq(H.stripLocale(['js', 'flair']).length, 2, '/js/flair should keep both segments:');
  eq(H.stripLocale(['fr', 'library']).length, 1, '/fr/library should drop the locale:');
});

t('TRAP: NAV is the locale authority, not a two-letter regex', () => {
  if (H.NAV.js) throw new Error('NAV should not contain a "js" entry');
  if (!H.NAV.fr) throw new Error('NAV should contain "fr" — the slice may have missed the table');
  if (!H.NAV['zh-tw']) throw new Error('NAV should contain "zh-tw"');
});

// ── source family ─────────────────────────────────────────────────────────

t('source family on an EN symbol page', () => eq(family('/symbol/euro-sign/'), 'symbol'));
t('source family on a locale library page', () => eq(family('/fr/library/symboles/'), 'library'));
t('source family on the EN homepage', () => eq(family('/'), 'homepage'));
t('source family on a locale homepage', () => eq(family('/nl/'), 'homepage'));

// ── malformed input must not throw ────────────────────────────────────────

t('a malformed href degrades to "unknown" rather than throwing',
  () => eq(dest('http://['), 'unknown'));
t('an empty href is not a crash', () => eq(dest(''), 'homepage'));
t('an anchor-only href resolves against the current page',
  () => eq(dest('#faq', '/symbol/euro-sign/'), 'symbol'));

console.log('CTA click tracking (header.js) — tests\n');
LINES.forEach((l) => console.log(l));
console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
