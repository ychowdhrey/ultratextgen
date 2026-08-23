#!/usr/bin/env node
'use strict';

/**
 * check-zalgo-decodes.js
 *
 * Every zalgo example card must decode back to its own label using the
 * page's own unzalgo widget.
 *
 * WHY THIS EXISTS
 * ---------------
 * usecase/zalgo-text and it/usecase/zalgo-text shipped twelve cards whose
 * combining marks had been NFC-composed into precomposed characters — "ZALGO"
 * rendered as ZĄLGO, "ciao" as çiao. The decoder strips marks by codepoint
 * range and cannot decompose, so each card contradicted the widget sitting
 * directly below it. Nothing caught it: the markup was valid, the strings
 * looked like zalgo, and no gate compared a card against its own label.
 *
 * This is a latent, site-wide hazard rather than a one-off. ALL twelve zalgo
 * pages store base + combining marks, which is what makes them decodable —
 * and it is also what makes them fragile: run any tool that NFC-normalises a
 * file and 69 of the site's zalgo strings compose into different letters at
 * once, permanently, with no way to recover the original. That is what
 * happened to EN and IT. This check is the tripwire.
 *
 * It gates rather than informs, unlike the whole-site image/peer-link audits:
 * there is no backlog to be permanently red against — a card either decodes
 * or it does not, and all 72 currently do.
 *
 * The strip pattern is READ FROM THE PAGE'S OWN JS, never hardcoded here, for
 * the same reason generate-site-art.py reads a page's own tiles: the site is
 * the authority, and a second copy of that range list would drift from the
 * first — which is the exact class of bug this file exists to catch.
 *
 * Usage:  node scripts/check-zalgo-decodes.js
 * Exit:   0 = every card decodes, 1 = at least one does not.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { globSync } = require('glob');

const ROOT = path.resolve(__dirname, '..');
const GENERATOR_JS = path.join(ROOT, 'usecase', 'zalgo-text', 'zalgo-text.js');

/** Lift the decoder's own strip pattern out of the shipped widget code. */
function decoderStripPattern() {
  const src = fs.readFileSync(GENERATOR_JS, 'utf8');
  // The decode handler is: raw.replace(/<ranges>/g, '')
  const m = src.match(/decodeInput\.value[\s\S]{0,400}?\.replace\((\/\[[^/]+\]\/g)\s*,\s*''\)/);
  if (!m) {
    console.error(
      'Could not find the decode strip pattern in usecase/zalgo-text/zalgo-text.js.\n' +
        'If the widget was refactored, update this matcher — do NOT hardcode the ranges here.'
    );
    process.exit(2);
  }
  const body = m[1].replace(/^\//, '').replace(/\/g$/, '');
  return new RegExp(body, 'g');
}

const STRIP = decoderStripPattern();

const files = globSync('**/*.html', {
  cwd: ROOT,
  ignore: ['node_modules/**', '**/*.test.html'],
});

const failures = [];
let cards = 0;
let pages = 0;

for (const rel of files) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (!html.includes('zx-example')) continue;
  const $ = cheerio.load(html);
  const found = $('.zx-example');
  if (!found.length) continue;
  pages++;
  found.each((_i, el) => {
    const text = $(el).find('.zx-text').text();
    const label = $(el).find('.zx-label').text().trim();
    if (!text || !label) return;
    cards++;
    const decoded = text.replace(STRIP, '');
    if (decoded !== label) {
      failures.push({ rel, label, decoded, kind: 'decode' });
      return;
    }
    // A card that decodes perfectly because it carries no marks at all is not
    // a zalgo example. Found by probing this very check: replacing a card's
    // text with the plain word passed cleanly, since stripping nothing from
    // plain text trivially returns the label.
    if (text.length === decoded.length) {
      failures.push({ rel, label, decoded, kind: 'unmarked' });
    }
  });
}

console.log('Zalgo example decode check');
console.log(`  pages with example cards: ${pages}`);
console.log(`  cards checked:            ${cards}`);
console.log(`  cards that fail:          ${failures.length}`);
console.log('');

if (!failures.length) {
  console.log('Every zalgo example card decodes back to its own label. ✓');
  process.exit(0);
}

for (const f of failures) {
  console.log(`✗ ${f.rel}`);
  if (f.kind === 'unmarked') {
    console.log(`    card labelled ${JSON.stringify(f.label)} carries no combining marks — it is not zalgo`);
  } else {
    console.log(`    card labelled ${JSON.stringify(f.label)} decodes to ${JSON.stringify(f.decoded)}`);
  }
}
console.log('');
console.log(
  'Fix: the card\'s combining marks have been composed into precomposed characters,\n' +
    '     so the page\'s own unzalgo box cannot recover the word. Regenerate the string\n' +
    '     with the page\'s own generateZalgo() and confirm that stripping the decoder\'s\n' +
    '     ranges returns the label. Do NOT hand-type zalgo, and do not run a tool that\n' +
    '     NFC-normalises these files — that is what broke EN and IT.'
);
process.exit(1);
