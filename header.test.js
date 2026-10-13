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
 * header.js is an IIFE with no exports, by design (`.claude/rules/frontend-javascript.md`: "No ES modules —
 * scripts use global scope communication intentionally"). So this test does what
 * check-zalgo-decodes.js already does for `generateZalgo()`: it SLICES the pure
 * functions out of the live header.js and evaluates them, rather than
 * reimplementing them here. A second copy of the logic would drift from the
 * first, which is the failure that technique exists to avoid.
 *
 * Scope is analytics classifiers and payload builders: the pair
 * behind the `cta_click` event, and the copy-identity engine behind
 * `copy_text` (see its own section below), plus the browse events (kaomoji
 * hub mood links, /library/ filter and search) and the kaomoji generator's
 * step payload, each sliced out of its shipped file the same way.
 *
 * The `cta_click` half covers the two classifiers. They decide what
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
const { loadCopyIdentity } = require('./scripts/lib/copy-identity-engine.js');

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

/* ==========================================================================
   copy_text item identity  (copy_item / copy_item_group)
   --------------------------------------------------------------------------
   Sliced through scripts/lib/copy-identity-engine.js — the same mechanism
   scripts/lib/zalgo-engine.js uses, and for the same reason: a second copy of
   a 164-entry Unicode block table would drift from the shipped one.

   Two things make this worth testing rather than eyeballing:

     · The table is a factual assertion about encodings. the rule
       is that a surface asserting facts (limits, counts, encodings) earns a
       test, and a visual check cannot catch an off-by-one block boundary.
     · The whole-site coverage case below is a self-maintaining gate: ship a
       page in a script the table does not cover and this goes red, instead of
       that page's copies quietly arriving as "Other".
   ========================================================================== */

const CI = loadCopyIdentity();
const grp = (s) => CI.copyIdentity(s).group;
const item = (s) => CI.copyIdentity(s).item;

// ── the table itself ──────────────────────────────────────────────────────
t('block table is sorted ascending with no duplicate starts', () => {
  for (let i = 1; i < CI.COPY_BLOCKS.length; i++) {
    if (CI.COPY_BLOCKS[i][0] <= CI.COPY_BLOCKS[i - 1][0]) {
      throw new Error(
        `entry ${i} (U+${CI.COPY_BLOCKS[i][0].toString(16)}) does not follow ` +
        `U+${CI.COPY_BLOCKS[i - 1][0].toString(16)} — binary search needs ascending order`
      );
    }
  }
});

// ── the families this site actually ships ─────────────────────────────────
t('a plain ASCII symbol', () => eq(grp('$'), 'Basic Latin'));
t('a currency sign', () => eq(grp('€'), 'Currency Symbols'));
t('a math operator', () => eq(grp('∑'), 'Mathematical Operators'));
t('an arrow', () => eq(grp('→'), 'Arrows'));
t('a misc symbol', () => eq(grp('☑'), 'Miscellaneous Symbols'));
t('a dingbat', () => eq(grp('✿'), 'Dingbats'));
t('the Free Fire name ornament', () => eq(grp('꧁'), 'Javanese'));
t('a hieroglyph', () => eq(grp('𓀀'), 'Egyptian Hieroglyphs'));
t('a styled generator letter', () => eq(grp('𝗕'), 'Mathematical Alphanumeric Symbols'));
t('kana', () => eq(grp('あ'), 'Hiragana'));
t('a kaomoji arm', () => eq(grp('ᕕ'), 'Unified Canadian Aboriginal Syllabics'));

// ── the special cases, each one a decision ────────────────────────────────
t('a regional-indicator pair is a Flag, not Enclosed Alphanumeric Supplement', () => eq(grp('🇺🇸'), 'Flags'));
t('a face', () => eq(grp('😀'), 'Emoticons'));
t('a ZWJ sequence reports its LEAD pictograph, not the joiner',
  () => eq(grp('👨‍👩‍👧‍👦'), 'Miscellaneous Symbols and Pictographs'));
t('a skin-tone modifier is skipped, not reported as the identity',
  () => eq(grp('👍🏽'), 'Miscellaneous Symbols and Pictographs'));
t('a zalgo string reports its base letter', () => eq(grp('Z̸̧͝a'), 'Basic Latin'));

// ── the regression this shipped to fix ────────────────────────────────────
// 311 tiles across 41 pages in 18 locales copy a payload that IS whitespace.
// String.prototype.trim() removes every one of these, so trimming for
// identity erased exactly the thing being recorded.
t('an invisible-character payload keeps its identity through trim()', () => {
  const invisible = [
    ['\u00A0', 'Latin-1 Supplement', 'NO-BREAK SPACE'],
    ['\u2003', 'General Punctuation', 'EM SPACE'],
    ['\u202F', 'General Punctuation', 'NARROW NO-BREAK SPACE'],
    ['\u3000', 'CJK Symbols and Punctuation', 'IDEOGRAPHIC SPACE'],
    ['\uFEFF', 'Arabic Presentation Forms-B', 'ZERO WIDTH NO-BREAK SPACE'],
    ['\u0020', 'Basic Latin', 'SPACE']
  ];
  for (const [ch, expected, name] of invisible) {
    const r = CI.copyIdentity(ch);
    if (r.item !== ch) throw new Error(`${name}: item was erased (got ${JSON.stringify(r.item)})`);
    if (r.group !== expected) throw new Error(`${name}: group ${r.group} != ${expected}`);
  }
});

// ── safety ────────────────────────────────────────────────────────────────
t('empty input', () => eq(item(''), ''));
t('empty input has no group', () => eq(grp(''), ''));
t('null input', () => eq(item(null), ''));
t('undefined input', () => eq(item(undefined), ''));
t('surrounding whitespace is still cleaned when something survives', () => eq(item('  $  '), '$'));
t('item is capped so a paragraph copy cannot blow the event size', () => {
  eq(CI.copyIdentity('x'.repeat(500)).item.length, 60, 'capped length');
});

// ── copy_item privacy: typed text never leaves the page ─────────────────
t('a typed-text copy sends the group but no copy_item', () => {
  for (const m of ['button', 'manual', 'main_bar', 'some_new_surface']) {
    const p = CI.copyPayload(m, 'Luna Maria', { style_name: 'ultra-bold' });
    eq('copy_item' in p, true, m + ' keeps the key so GTM clears the last value');
    eq(p.copy_item, undefined, m + ' must not carry the typed text');
    eq(p.copy_item_group, 'Basic Latin', m + ' group');
    eq(p.style_name, 'ultra-bold', m + ' extra survives');
  }
});
t('a catalogue copy still sends the exact item', () => {
  for (const m of ['symbol_tile', 'symbol_look_switch', 'grid_collection', 'saved_collection', 'glyph', 'ascii_art']) {
    eq(CI.copyPayload(m, '★').copy_item, '★', m);
  }
});

// The kaomoji tools copy a face the visitor built, pasted or loaded from a link,
// and the link copy sends the page URL. None of those is catalogue content, so
// each method sends the group and clears copy_item (and the text never appears
// anywhere in the payload).
t('the kaomoji generator, link and decoder copies keep typed text out of the payload', () => {
  const typed = 'my private text 123';
  for (const m of ['kaomoji_generator', 'kaomoji_link', 'kaomoji_decoder']) {
    const p = CI.copyPayload(m, typed);
    eq(p.copy_method, m, m + ' method is reported as itself, not symbol_tile');
    eq('copy_item' in p, true, m + ' keeps the key so GTM clears the last value');
    eq(p.copy_item, undefined, m + ' must not carry the typed text');
    eq(p.copy_item_group, 'Basic Latin', m + ' still sends the group');
    if (JSON.stringify(p).includes('private')) throw new Error(m + ' leaked the typed text into the payload');
  }
  const link = CI.copyPayload('kaomoji_link', 'https://ultratextgen.com/kaomoji-generator/?q=%28my+private+text%29');
  eq(link.copy_item, undefined, 'the link copy must not push the page URL as copy_item');
});

// ── copy_look: which look of a two-look symbol left the page ────────────
t('copy_look is always a key, cleared unless the caller sets it', () => {
  const p = CI.copyPayload('symbol_tile', '★');
  eq('copy_look' in p, true, 'key present so GTM clears the last look');
  eq(p.copy_look, undefined, 'cleared by default');
});
t('copy_look carries the look and the item stays the bare character', () => {
  const p = CI.copyPayload('symbol_look_switch', '\u2764', { copy_look: 'plain' });
  eq(p.copy_look, 'plain', 'look');
  eq(p.copy_item, '\u2764', 'item');
});

// ── the self-maintaining coverage gate ────────────────────────────────────
t('every data-symbol payload on the site resolves to a real Unicode block', () => {
  const files = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) files.push(p);
    }
  })(__dirname);

  const unresolved = new Map();
  let seen = 0;
  const re = /data-symbol="([^"]*)"/g;
  const unescape = (s) =>
    s.replace(/&nbsp;/g, '\u00A0').replace(/&amp;/g, '&')
     .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
     .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
     .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));

  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(text)) !== null) {
      const v = unescape(m[1]);
      if (!v) continue;
      seen++;
      const g = CI.copyIdentity(v).group;
      if (!g || g === 'Other') {
        const lead = (v.trim() || v).codePointAt(0);
        unresolved.set('U+' + lead.toString(16).toUpperCase(), path.relative(__dirname, f));
      }
    }
  }
  if (!seen) throw new Error('found no data-symbol tiles at all — the scan is broken, not the table');
  if (unresolved.size) {
    const shown = [...unresolved.entries()].slice(0, 10)
      .map(([cp, f]) => `  ${cp}  first seen in ${f}`).join('\n');
    throw new Error(
      `${unresolved.size} codepoint block(s) copied on this site are missing from COPY_BLOCKS ` +
      `in header.js, so their copies would arrive as "Other":\n${shown}\n` +
      'Add the real Unicode block for each, keeping the table sorted.'
    );
  }
});

// ── printable_nav: a sibling card is not a hub card ───────────────────────
//
// The foot of a printables family page reuses the hub's .printable-card inside
// a .pt-siblings section. printableNavKind() is DOM-bound, so the link is a stub
// that answers matches()/closest() for the selectors it is given.

const NAV_KIND = new Function(
  `${slice('  function printableNavKind(link) {', '  function initializePrintableNavTracking()')}\nreturn printableNavKind;`
)();
const fakeLink = (matching, ancestors) => ({
  matches: (sel) => sel.split(',').some((s) => matching.includes(s.trim())),
  closest: (sel) => (ancestors.includes(sel) || sel.split(',').some((s) => matching.includes(s.trim())) ? {} : null),
});

t('a printable card inside .pt-siblings is "sibling_card"',
  () => eq(NAV_KIND(fakeLink(['a.printable-card[href]'], ['.pt-siblings'])), 'sibling_card'));
t('a printable card on the hub is still "hub_card"',
  () => eq(NAV_KIND(fakeLink(['a.printable-card[href]'], [])), 'hub_card'));
t('an A-Z strip link inside .pt-siblings stays "az_strip"',
  () => eq(NAV_KIND(fakeLink(['.pt-az-link'], ['.pt-siblings'])), 'az_strip'));

// ── browse events: kaomoji hub mood links, /library/ filter + search ─────
//
// The block is sliced out of header.js and evaluated with a fake clock, so the
// debounce is asserted for real (a run of changes records only the last).

const BROWSE_SRC = slice('  /* @browse-events:begin */', '  /* @browse-events:end */');
function browseHarness() {
  const w = { dataLayer: [] };
  const pending = [];
  let now = 0;
  const fakeSet = (fn, ms) => { pending.push({ fn, at: now + ms, live: true }); return pending.length - 1; };
  const fakeClear = (id) => { if (pending[id]) pending[id].live = false; };
  const api = new Function(
    'window', 'setTimeout', 'clearTimeout',
    `${BROWSE_SRC}\nreturn { moodIndexClickPayload, libraryFilterPayload, librarySearchPayload, trackLibraryFilter, trackLibrarySearch };`
  )(w, fakeSet, fakeClear);
  const advance = (ms) => {
    now += ms;
    pending.filter((p) => p.live && p.at <= now).forEach((p) => { p.live = false; p.fn(); });
  };
  return { w, api, advance };
}

t('a mood-index click pushes the destination path and the 1-based group, every key present', () => {
  const { api } = browseHarness();
  const p = api.moodIndexClickPayload('/library/happy-kaomoji/', 1);
  eq(JSON.stringify(p), JSON.stringify({ event: 'kaomoji_mood_index_click', destination_path: '/library/happy-kaomoji/', mood_group: 1 }), 'payload');
  const none = api.moodIndexClickPayload('/library/x/', 0);
  eq('mood_group' in none, true, 'mood_group key kept so GTM clears the last value');
  eq(none.mood_group, undefined, 'an unknown group is cleared, not 0');
});
t('library_filter carries the chip, never free text, and every key', () => {
  const { api } = browseHarness();
  const p = api.libraryFilterPayload('type', 'Kaomoji', 42);
  eq(JSON.stringify(p), JSON.stringify({ event: 'library_filter', filter_type: 'type', filter_value: 'Kaomoji', result_count: 42 }), 'payload');
});
t('library_search trims and caps the term at 100 characters, like site_search', () => {
  const { api } = browseHarness();
  eq(api.librarySearchPayload('  heart  ', 7).search_term, 'heart', 'trimmed');
  eq(api.librarySearchPayload('x'.repeat(300), 0).search_term.length, 100, 'capped');
  eq(api.librarySearchPayload('heart', 0).result_count, 0, 'a zero count is kept');
});
t('a run of library searches records one row, after the window, with the last term', () => {
  const { w, api, advance } = browseHarness();
  api.trackLibrarySearch('h', 300);
  advance(300);
  api.trackLibrarySearch('he', 120);
  advance(300);
  api.trackLibrarySearch('heart', 12);
  advance(799);
  eq(w.dataLayer.length, 0, 'nothing before the window closes');
  advance(1);
  eq(w.dataLayer.length, 1, 'exactly one row');
  eq(w.dataLayer[0].search_term, 'heart', 'the settled term');
  eq(w.dataLayer[0].result_count, 12, 'the settled count');
});
t('clearing the search box cancels the pending row and sends nothing', () => {
  const { w, api, advance } = browseHarness();
  api.trackLibrarySearch('heart', 12);
  api.trackLibrarySearch('   ', 336);
  advance(2000);
  eq(w.dataLayer.length, 0, 'no row for an empty box');
});
t('library_filter and library_search debounce independently', () => {
  const { w, api, advance } = browseHarness();
  api.trackLibraryFilter('type', 'Kaomoji', 40);
  api.trackLibrarySearch('cat', 3);
  advance(800);
  eq(w.dataLayer.map((r) => r.event).sort().join(','), 'library_filter,library_search', 'both fire');
});

// ── kaomoji_generator_step: the funnel row, and what it must never carry ──
//
// The builder is sliced out of the generator's controller (the same technique
// the kaomoji static build uses), so the test reads the shipped code.

const KAO_SRC = fs.readFileSync(path.join(__dirname, 'js', 'kaomoji', 'kaomojiPageController.js'), 'utf8');
const KB = KAO_SRC.indexOf('/* @kaomoji-step:begin */');
const KE = KAO_SRC.indexOf('/* @kaomoji-step:end */');
if (KB === -1 || KE === -1 || KE < KB) throw new Error('could not slice the @kaomoji-step block out of kaomojiPageController.js — move the markers with the code');
const KAO = new Function(`${KAO_SRC.slice(KB, KE)}\nreturn { stepPayload, presetId };`)();

t('kaomoji_generator_step: mood, preset and part carry their catalogue id', () => {
  eq(JSON.stringify(KAO.stepPayload('mood', 'happy')), JSON.stringify({ event: 'kaomoji_generator_step', kaomoji_step: 'mood', kaomoji_value: 'happy' }), 'mood');
  eq(KAO.stepPayload('preset', 'cute').kaomoji_value, 'cute', 'preset');
  eq(KAO.stepPayload('part', 'eyes').kaomoji_value, 'eyes', 'part category');
});
t('kaomoji_generator_step: every other step clears kaomoji_value, key still present', () => {
  for (const step of ['surprise', 'reset', 'recent', 'paste_edit', 'url_load']) {
    const p = KAO.stepPayload(step, 'ʕ•ᴥ•ʔ typed or pasted face');
    eq('kaomoji_value' in p, true, step + ' keeps the key so GTM clears the last value');
    eq(p.kaomoji_value, undefined, step + ' must carry no value');
    eq(p.kaomoji_step, step, step + ' name');
  }
});
t('kaomoji_generator_step: a face or typed text can never be the value, even on a value step', () => {
  for (const typed of ['(๑•̀ㅂ•́)و✧', 'my private text 123', 'ʕ•ᴥ•ʔ', 'x'.repeat(41), '', null, undefined, 42]) {
    for (const step of ['mood', 'preset', 'part']) {
      const p = KAO.stepPayload(step, typed);
      eq(p.kaomoji_value, undefined, `${step} with ${JSON.stringify(typed)}`);
      if (typed && JSON.stringify(p).includes(String(typed))) throw new Error('leaked ' + typed);
    }
  }
});
t('kaomoji_generator_step: an unknown step is not sent at all', () => eq(KAO.stepPayload('typed_face', 'x'), null));
t('kaomoji_generator_step: a preset id is its label as an id, or its index', () => {
  eq(KAO.presetId({ label: 'Happy' }, 0), 'happy', 'label slug');
  eq(KAO.presetId({ label: 'Wink Wink!' }, 3), 'wink_wink', 'punctuation folded');
  eq(KAO.presetId({ label: '笑顔' }, 7), 'preset_7', 'a non-Latin label falls back to the index');
});

console.log('header.js — CTA click tracking + copy_text item identity + browse events + kaomoji steps\n');
LINES.forEach((l) => console.log(l));
console.log(`\n${PASS} passed, ${FAIL} failed`);

process.exit(FAIL ? 1 : 0);
