#!/usr/bin/env node
'use strict';
/**
 * text-object-grid.test.js — the glyph / text-object boundary, pinned.
 *
 * Run: node scripts/lib/text-object-grid.test.js   (exit 1 on any failure)
 *
 * The cases are the ones string length gets wrong, plus the two parser bugs
 * the first whole-site run found: single-quoted attributes skipped silently,
 * and a partial entity table reading data-symbol="&laquo;" as seven characters.
 */

const lib = require('./text-object-grid.js');

let failed = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { failed++; console.log(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
}

// Glyphs: one visual character, whatever the code-unit count.
for (const g of ['√', '★', '☥', '¶', '❤️', '👨‍👩‍👧', '🏳️‍🌈', '🇰🇷', '👍🏽', 'ㅋ', '꧁', '﷽', '⟶', ':D', '<3', ' ', '​', 'ㅤ']) {
  eq(`glyph ${JSON.stringify(g)}`, lib.isTextObject(g), false);
}
// Text objects: a composed expression.
for (const t of ['(◕‿◕)', '¯\\_(ツ)_/¯', '(╯°□°）╯︵ ┻━┻', '( ͡° ͜ʖ ͡°)', 'ㅋㅋㅋ', 'ㅠㅠ', 'ಠ_ಠ',
  '🇰🇷 ⚽ 🔥 🏆', '🎀🌸✨', '♡━━♡', '✦──✦', '★★★★★', 'cm²', 'ヽ༼ຈل͜ຈ༽ﾉ']) {
  eq(`text ${JSON.stringify(t)}`, lib.isTextObject(t), true);
}
// Width counts grapheme clusters, so combining marks and ZWJ add nothing.
eq('width ( ͡° ͜ʖ ͡°)', lib.copyItemWidth('( ͡° ͜ʖ ͡°)'), 8);
eq('width family', lib.copyItemWidth('👨‍👩‍👧'), 2);
// Surrounding spaces are trimmed, never counted. The case used to read
// copyItemWidth('  ★  ') === 1, which has failed since the day it was added:
// ★ (U+2605) is Extended_Pictographic, so the shipped rule weights it 2 like
// any pictograph. The assertion was about trimming, so it now says that.
eq('width padded', lib.copyItemWidth('  √  '), 1);
eq('width padded pictograph', lib.copyItemWidth('  ★  '), lib.copyItemWidth('★'));

// Entities are decoded before judging.
eq('entity laquo', lib.decodeAttr('&laquo;'), '«');
eq('entity numeric', lib.decodeAttr('&#x2764;&#65039;'), '❤️');
eq('entity quot', lib.decodeAttr('(&quot;･ω･&quot;)'), '("･ω･")');

// Parsing: both quote styles, nested divs, runtime-filled grids.
const page = [
  '<div class="flag-rows"><div class="flag-row"><button data-symbol="★">★</button></div></div>',
  "<div class='flag-rows'><div class='flag-row'><button data-symbol='(^▽^)'>(^▽^)</button></div></div>",
  '<div class="flag-rows"><div class="flag-row"><button data-symbol="&laquo;">«</button></div></div>',
  '<div class="flag-rows" id="countryFlagList"></div>',
  '<div class="flag-rows flag-rows--text"><div class="flag-row"><button data-symbol="√">√</button></div></div>',
].join('\n');
const grids = lib.findGrids(page);
eq('grids found', grids.length, 5);
eq('should have class', grids.map((g) => g.shouldHaveClass), [false, true, false, false, false]);
eq('has class', grids.map((g) => g.hasClass), [false, false, false, false, true]);

const fixed = lib.applyClasses(page);
eq('repairs', fixed.changed, 2);
eq('single quotes kept', fixed.html.includes("class='flag-rows flag-rows--text'"), true);
eq('stale class removed', fixed.html.includes('class="flag-rows flag-rows--text"'), false);
eq('idempotent', lib.applyClasses(fixed.html).changed, 0);
eq('only class attributes change', fixed.html.replace(/ flag-rows--text/g, ''), page.replace(/ flag-rows--text/g, ''));

if (failed) { console.log(`\n${failed} failure(s)`); process.exit(1); }
console.log('text-object-grid: all cases pass ✓');
