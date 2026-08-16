#!/usr/bin/env node
'use strict';

/**
 * locale-translation-audit.js
 *
 * Shared logic for scripts/audit-locale-translation.js (whole-site dashboard)
 * and scripts/check-locale-translation.js (per-PR gate), so "untranslated" can
 * never mean two different things in the two places it is measured.
 *
 * ── The gap this closes ────────────────────────────────────────────────────
 * check-translation-parity.js compares STRUCTURE — link sets, <h2>/FAQ/tile
 * counts. A locale page that is 90% translated has exactly the same structure
 * as one that is 100% translated, so it passes. Every other gate is blind to
 * language too: the mesh gate reads hrefs, the image gate reads asset paths,
 * the FAQ gate compares a page against ITSELF.
 *
 * That is not hypothetical. Three separate classes shipped through all five
 * gates during the 2026-08-15 library expansion:
 *
 *   1. Body prose. Seven pages went live with an English intro paragraph, an
 *      English combo blurb, and the English "Transform text with Unicode fonts"
 *      CTA card, because verification had looked at aria-labels and headings.
 *   2. Visible tile labels. Every symbol tile carries its name TWICE — once in
 *      aria-label="Copy X" and again as visible text in
 *      <span class="flag-label">X</span>. Only the aria-label was translated,
 *      so 24 already-pushed pages showed English labels under localised
 *      buttons.
 *   3. Copy payloads. data-symbol="☑ Done" pastes English from a locale page —
 *      the one-click greeting that is the page's whole point.
 *
 * The method here is deliberately not pattern-based, because that is what
 * failed: each fix caught the surface it was written for and missed the next
 * one. Instead it extracts every translatable string from the page's own
 * English parent and asserts that NONE of them survives verbatim.
 *
 * ── Two things it must not do ──────────────────────────────────────────────
 * · Compare substrings. A naive `enString in localeHtml` test reports "Dove"
 *   as untranslated on an Italian page, because *dove* is an ordinary Italian
 *   word. Both sides are extracted into string SETS and intersected.
 * · Flag a correct translation that happens to be byte-identical. "Cupcake"
 *   in Dutch is "Cupcake"; Jupiter, Mars and Pluto are spelled the same in
 *   Dutch; "Joystick" is German. Those live in the per-locale ledger at
 *   data/translation_identical_strings.json — a real ledger with a reason per
 *   entry, not a silent suppression list.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LEDGER = path.join(ROOT, 'data', 'translation_identical_strings.json');
const BASE = 'https://ultratextgen.com';

/**
 * Strings that legitimately survive translation in every language: brand and
 * platform names, format/standard names, and anything with no letters of its
 * own. Kept deliberately small — a broad allow-list here would hide exactly
 * the defects this exists to catch, so a genuine per-language identity belongs
 * in the ledger (where it carries a reason) rather than in this regex.
 */
const UNIVERSAL_ALLOW = new RegExp(
  '^(' +
    [
      'UltraTextGen', 'Unicode', 'ASCII', 'HTML', 'CSS', 'JSON', 'LaTeX', 'IPA', 'Alt',
      'Emoji', 'Kaomoji', 'Discord', 'Instagram', 'WhatsApp', 'Facebook', 'TikTok',
      'Snapchat', 'Telegram', 'LinkedIn', 'Pinterest', 'YouTube', 'Roblox', 'Fortnite',
      'Windows', 'Mac', 'macOS', 'iPhone', 'iPad', 'iOS', 'Android', 'Linux', 'Google',
      'Y2K', 'PUBG',
      '[^A-Za-z]+'
    ].join('|') +
    ')$'
);

/**
 * Strings that are FORMAL IDENTIFIERS, not English prose. Translating any of
 * these breaks the page, so they can never be translation debt.
 *
 * The rules were derived by reading the strings a whole-site run actually
 * produced, not reasoned up front — see the audit doc's taxonomy. Between them
 * they account for ~2,160 of the occurrences a naive comparison reports.
 */
const IDENTIFIER_RULES = [
  // Unicode codepoint names: "Thin Space — U+2009", "Black Chess Pawn (U+265F)"
  [/U\+[0-9A-Fa-f]{4}/, 'unicode-codepoint'],
  // literal CSS/LaTeX the reader copies: content: "\007C", \sqrt{x}, \surd
  [/content:\s*"|\\|\{|\}|&#/, 'code-literal'],
  // A bare CSS property reference — "CSS content" is the name of the `content`
  // property, cited the same way as `content: "\\007C"` a row below it. The
  // existing code-literal rule only fires when the colon is present.
  [/^CSS [a-z-]+$/, 'css-property'],
  // key names are not localised on the keyboard itself
  [/\b(?:Option|Alt|Ctrl|Cmd|Shift|Fn)\s*\+/, 'keyboard-shortcut'],
  [/&(?:amp;)?[a-zA-Z]{2,6};/, 'html-entity'],
  // Markdown/formatting examples, where the syntax IS the content
  [/\*\*|__|~~|`/, 'markdown-syntax']
];

/** ALL-CAPS formal Unicode character names: DIVISION SIGN, SQUARE ROOT. */
function isFormalUnicodeName(s) {
  return s === s.toUpperCase() && /[A-Z]/.test(s) && s.split(/\s+/).length <= 4;
}

function identifierClass(s) {
  for (const [re, name] of IDENTIFIER_RULES) if (re.test(s)) return name;
  if (isFormalUnicodeName(s)) return 'formal-unicode-name';
  return null;
}

/**
 * Slots whose text is page COPY (a heading, a card title, a section label, an
 * announced label). Everything else — prose, table cells, list items — can
 * legitimately carry a cited identifier in the middle of translated text.
 *
 * This split is what lets a Unicode block name be exempt in
 * `<td>Latin-1 Supplement</td>` while the same words stay a real defect in
 * `<h4>Currency Symbols</h4>`, which is a related-card heading linking to the
 * currency-symbols library page. Both occur on this site; a string-level
 * exemption would wrongly clear 14 genuine card headings.
 */
const COPY_SLOT_EXTRACTORS = [
  /<title>([\s\S]*?)<\/title>/g,
  /name="description" content="([^"]*)"/g,
  /<h1[^>]*>([\s\S]*?)<\/h1>/g,
  /<h2[^>]*>([\s\S]*?)<\/h2>/g,
  /<h3[^>]*>([\s\S]*?)<\/h3>/g,
  /<h4[^>]*>([\s\S]*?)<\/h4>/g,
  /class="article-section-label"[^>]*>([\s\S]*?)</g,
  /aria-label="([^"]*)"/g
];

/**
 * Every surface a reader can see or a screen reader can speak. Order does not
 * matter — results go into a set.
 *
 * `data-symbol` is included on purpose: it is what the button actually copies
 * to the clipboard, so an untranslated payload is a worse defect than an
 * untranslated label, not a lesser one.
 */
const BODY_SLOT_EXTRACTORS = [
  /<p[^>]*>([\s\S]*?)<\/p>/g,
  /<li[^>]*>([\s\S]*?)<\/li>/g,
  /<th[^>]*>([\s\S]*?)<\/th>/g,
  /<td[^>]*>([\s\S]*?)<\/td>/g,
  /<summary[^>]*>([\s\S]*?)<\/summary>/g,
  /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g,
  /<button[^>]*>([\s\S]*?)<\/button>/g,
  /<span class="[^"]*label"[^>]*>([\s\S]*?)<\/span>/g,
  /data-symbol="([^"]*)"/g,
  /\bname:\s*"([^"]*)"/g
];

const EXTRACTORS = [...COPY_SLOT_EXTRACTORS, ...BODY_SLOT_EXTRACTORS];

function stripTags(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Everything before <meta charset= is the GTM / consent-manager blob: minified
 * third-party JS full of English identifiers that is identical on every page
 * in every language by design. Reading it would produce thousands of false
 * positives on every single page.
 */
function bodyOf(html) {
  const cut = html.indexOf('<meta charset=');
  return cut === -1 ? html : html.slice(cut);
}

/**
 * The translatable string set of one page.
 *
 * A candidate needs a run of at least four Latin letters to count. That single
 * threshold is what keeps the set free of glyph tiles (♠ ☮ ✓), numeric labels,
 * and CJK/Arabic/Cyrillic strings that contain no Latin at all — those cannot
 * be "untranslated English" in any useful sense.
 */
function extractWith(patterns, body) {
  const out = new Set();
  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(body)) !== null) {
      const text = stripTags(m[1]);
      if (text.length <= 3) continue;
      if (!/[A-Za-z]{4}/.test(text)) continue;
      if (UNIVERSAL_ALLOW.test(text)) continue;
      out.add(text);
    }
  }
  return out;
}

function translatableStrings(html) {
  return extractWith(EXTRACTORS, bodyOf(html));
}

/** Only the strings sitting in a copy slot — headings, card titles, aria-labels. */
function copySlotStrings(html) {
  return extractWith(COPY_SLOT_EXTRACTORS, bodyOf(html));
}

/**
 * Unicode block names, harvested from the ENGLISH pages' own "Unicode block"
 * property rows rather than hardcoded. Self-sourcing for the same reason
 * generate-site-art.py reads a page's own tiles: the site is the authority on
 * which blocks it actually cites, and the list maintains itself.
 *
 * These stay English by decision (2026-08-15): a Unicode block is a proper name
 * in the standard, and the other Latin-script languages on this site cite it by
 * that name inside otherwise-translated prose — Spanish "en el bloque Latin-1
 * Supplement", French "du bloc « Latin-1 Supplement »", German "im Block
 * Currency Symbols von Unicode". Several locales even set it in citation quotes,
 * which is the tell that it is being quoted, not left untranslated.
 */
/**
 * Place names, harvested from the English emoji-flags page's own registry.
 *
 * Same decision and same reasoning as the block names above: a country is a
 * proper name, and where the target language uses that same name there is
 * nothing to translate. Verified rather than assumed before exempting them —
 * the flag pages translate every name that DOES differ (Germany→Duitsland in
 * Dutch, →Germania in Italian, →Đức in Vietnamese) and keep only the ones that
 * genuinely coincide. Those pages were the three worst in the first whole-site
 * run precisely BECAUSE they are complete: a fully-translated 200-tile page
 * throws more identical-name coincidences than a half-translated 20-tile one.
 */
let placeCache = null;
/**
 * True when every word in a cell is a brand/acronym rather than ordinary English.
 *
 * The column this reads also carries USAGE CONTEXTS — "Documents, emails, bios",
 * "Recommended form", "Mobile keyboard" — which every locale genuinely translates.
 * Harvesting those as proper names would silently exempt real defects, so the
 * shape test is what separates `Windows (Word)` from `Recommended form`. Both
 * were in the first raw harvest; only the first should be exempt.
 */
function isProperNounPhrase(v) {
  const words = v.replace(/[(),/]/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  return words.every(
    (w) =>
      /^[A-Z0-9][A-Za-z0-9.+#-]*$/.test(w) || // Mac, Windows, HTML, AutoCAD, Word
      /^i[A-Z]/.test(w) ||                    // iOS, iPhone
      /^[a-z]{1,3}$/.test(w)                  // short joiners: "on", "or"
  );
}

let platformCache = null;
/**
 * Platform / tool names cited in the input-method tables — "Windows (Word)",
 * "Mac", "iOS / Android", "HTML", "CSS content".
 *
 * Harvested from the ENGLISH pages' own tables, exactly like unicodeBlockNames
 * above and for the same reason: the site is the authority on what it cites,
 * and a harvested list maintains itself as pages change.
 *
 * These are product names and code identifiers. Every locale on this site
 * already cites them untranslated inside otherwise-translated tables — the
 * Italian page that says `<th>Metodo</th>` still says `<td>Mac</td>` — which is
 * the same citation pattern the Unicode block names follow.
 *
 * They enter `properNames`, NOT `IDENTIFIER_RULES`, so the exemption stays
 * SLOT-SCOPED: exempt in a cited `<td>`, still a real defect in a heading or a
 * card title. That distinction is load-bearing and is regression-tested against
 * the `Currency Symbols` pair described above.
 *
 * Scoped to the first column of a two-column table whose header pair is one of
 * the known input-method shapes, so ordinary content cells cannot leak in.
 */
function platformToolNames(root = ROOT) {
  if (platformCache) return platformCache;
  const out = new Set();
  // ONLY the input-method tables. `Property|Value` is deliberately excluded: its
  // first column holds row LABELS ("Category", "Formal name", "Introduced in")
  // which every locale genuinely translates, and harvesting those would silently
  // exempt real defects. Caught by reading what a first, wider pattern matched.
  const HEADERS = /<tr><th>(?:Method|Platform|Platform \/ Tool)<\/th><th>(?:Input|Works\?|Method)<\/th><\/tr>/i;
  const walkEn = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        if (dir === root && /^[a-z]{2}(-[a-z]{2})?$/.test(e.name) && e.name !== 'js') continue;
        walkEn(p);
      } else if (e.name === 'index.html') {
        const html = fs.readFileSync(p, 'utf8');
        for (const tbl of html.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || []) {
          if (!HEADERS.test(tbl)) continue;
          const re = /<tr><td>([\s\S]*?)<\/td>/gi;
          let m;
          while ((m = re.exec(tbl)) !== null) {
            const v = stripTags(m[1]);
            if (v && v.length <= 24 && !/[.!?]/.test(v) && isProperNounPhrase(v)) out.add(v);
          }
        }
      }
    }
  };
  try { walkEn(root); } catch { /* best effort */ }
  platformCache = out;
  return out;
}

function placeNames(root = ROOT) {
  if (placeCache) return placeCache;
  const out = new Set(['Africa', 'Asia', 'Oceania', 'Europe', 'Americas', 'Antarctica']);
  try {
    const src = fs.readFileSync(path.join(root, 'library', 'emoji-flags', 'index.html'), 'utf8');
    // The JS registry holds the 202 countries; the hand-written tiles above it
    // hold the rest (Scotland, Wales, England — subdivisions with their own flag
    // but no row in the registry). Both are read, and ONLY from this page, so a
    // flag-label on any other page still means an ordinary tile name.
    for (const re of [/\bname:\s*"([^"]*)"/g, /<span class="flag-label"[^>]*>([\s\S]*?)<\/span>/g]) {
      let m;
      while ((m = re.exec(src)) !== null) {
        const v = stripTags(m[1]);
        if (v) out.add(v);
      }
    }
  } catch {
    /* best effort */
  }
  placeCache = out;
  return out;
}

let blockCache = null;
function unicodeBlockNames(root = ROOT) {
  if (blockCache) return blockCache;
  const out = new Set();
  const walkEn = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        // English pages only — a locale directory cannot define the canonical name
        if (dir === root && /^[a-z]{2}(-[a-z]{2})?$/.test(e.name) && e.name !== 'js') continue;
        walkEn(p);
      } else if (e.name === 'index.html') {
        const html = fs.readFileSync(p, 'utf8');
        const re = /<td>Unicode block<\/td>\s*<td>([\s\S]*?)<\/td>/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
          const v = stripTags(m[1]);
          if (v) out.add(v);
        }
      }
    }
  };
  try {
    walkEn(root);
  } catch {
    /* best effort — an unreadable tree just means no exemptions */
  }
  blockCache = out;
  return out;
}

/** The EN parent a locale page itself claims, as a repo-relative path. */
function englishParentOf(html) {
  const m = /hreflang="en"\s+href="([^"]*)"/.exec(html);
  if (!m) return null;
  const url = m[1];
  if (!url.startsWith(BASE)) return null;
  const rel = url.slice(BASE.length).replace(/^\/+|\/+$/g, '');
  // A subpage naming the bare homepage is the documented shape of a ratified
  // local-only page (see CLAUDE.md, "Ratified local-only exceptions") — it is a
  // placeholder claim, not a translation relationship, so there is no parent
  // whose strings this page should have replaced.
  if (rel === '') return null;
  return path.join(rel, 'index.html');
}

/** Locale code from a repo-relative path, or null for an English page. */
function localeOf(relPath) {
  const first = relPath.split('/')[0];
  return /^[a-z]{2}(-[a-z]{2})?$/.test(first) && first !== 'js' ? first : null;
}

let ledgerCache = null;
function loadLedger() {
  if (ledgerCache) return ledgerCache;
  let raw = { entries: {} };
  if (fs.existsSync(LEDGER)) raw = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const byLocale = new Map();
  for (const [locale, items] of Object.entries(raw.entries || {})) {
    byLocale.set(locale, new Set((items || []).map((e) => e.string)));
  }
  ledgerCache = byLocale;
  return ledgerCache;
}

/**
 * The core comparison, on two HTML strings rather than two paths, so callers
 * can feed it git blobs as easily as files on disk.
 */
function auditPair(localeHtml, parentHtml, locale, { root = ROOT } = {}) {
  const en = translatableStrings(parentHtml);
  const loc = translatableStrings(localeHtml);
  const ledger = loadLedger().get(locale) || new Set();
  const properNames = new Set([
    ...unicodeBlockNames(root),
    ...placeNames(root),
    ...platformToolNames(root)
  ]);
  const copySlots = copySlotStrings(localeHtml);
  const survivors = [];
  const ledgered = [];
  const identifiers = [];
  for (const s of en) {
    if (!loc.has(s)) continue;
    if (ledger.has(s)) {
      ledgered.push(s);
      continue;
    }
    const cls = identifierClass(s);
    if (cls) {
      identifiers.push(s);
      continue;
    }
    // A proper name — a Unicode block, a country — is exempt only where it is
    // CITED: in prose, a table cell, a tile label. The same words in a heading
    // or card title are page copy and stay a defect. Both occur here:
    // "Currency Symbols" is a cited block name in a <td> on symbol pages AND a
    // related-card <h4> on 14 others.
    if (properNames.has(s) && !copySlots.has(s)) {
      identifiers.push(s);
      continue;
    }
    survivors.push(s);
  }
  survivors.sort();
  return { survivors, ledgered, identifiers, enCount: en.size };
}

/**
 * Audit one locale page against its own English parent.
 *
 * Returns { status, parent, survivors, ledgered } where status is:
 *   'ok'           — no English source string survives
 *   'untranslated' — one or more do; `survivors` lists them
 *   'no-parent'    — page declares no usable hreflang="en" (nothing to compare)
 *   'parent-missing' — the declared parent is not on disk
 *   'not-a-locale-page' — English page, or outside a locale directory
 */
function auditLocalePage(relPath, { root = ROOT, readFile } = {}) {
  const read = readFile || ((p) => fs.readFileSync(p, 'utf8'));
  const locale = localeOf(relPath);
  if (!locale) return { status: 'not-a-locale-page' };

  const html = read(path.join(root, relPath));
  const parentRel = englishParentOf(html);
  if (!parentRel) return { status: 'no-parent', locale };

  const parentPath = path.join(root, parentRel);
  if (!fs.existsSync(parentPath)) return { status: 'parent-missing', locale, parent: parentRel };

  const { survivors, ledgered, identifiers, enCount } = auditPair(
    html, read(parentPath), locale, { root }
  );
  return {
    status: survivors.length ? 'untranslated' : 'ok',
    locale,
    parent: parentRel,
    survivors,
    ledgered,
    identifiers,
    enCount
  };
}

module.exports = {
  auditPair,
  identifierClass,
  unicodeBlockNames,
  placeNames,
  platformToolNames,
  copySlotStrings,
  auditLocalePage,
  translatableStrings,
  englishParentOf,
  localeOf,
  loadLedger,
  UNIVERSAL_ALLOW,
  LEDGER_PATH: LEDGER
};
