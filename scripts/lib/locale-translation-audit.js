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
 * Every surface a reader can see or a screen reader can speak. Order does not
 * matter — results go into a set.
 *
 * `data-symbol` is included on purpose: it is what the button actually copies
 * to the clipboard, so an untranslated payload is a worse defect than an
 * untranslated label, not a lesser one.
 */
const EXTRACTORS = [
  /<title>([\s\S]*?)<\/title>/g,
  /name="description" content="([^"]*)"/g,
  /<h1[^>]*>([\s\S]*?)<\/h1>/g,
  /<h2[^>]*>([\s\S]*?)<\/h2>/g,
  /<h3[^>]*>([\s\S]*?)<\/h3>/g,
  /<h4[^>]*>([\s\S]*?)<\/h4>/g,
  /<p[^>]*>([\s\S]*?)<\/p>/g,
  /<li[^>]*>([\s\S]*?)<\/li>/g,
  /<th[^>]*>([\s\S]*?)<\/th>/g,
  /<td[^>]*>([\s\S]*?)<\/td>/g,
  /<summary[^>]*>([\s\S]*?)<\/summary>/g,
  /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g,
  /<button[^>]*>([\s\S]*?)<\/button>/g,
  /<span class="[^"]*label"[^>]*>([\s\S]*?)<\/span>/g,
  /class="article-section-label"[^>]*>([\s\S]*?)</g,
  /aria-label="([^"]*)"/g,
  /data-symbol="([^"]*)"/g,
  /\bname:\s*"([^"]*)"/g
];

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
function translatableStrings(html) {
  const body = bodyOf(html);
  const out = new Set();
  for (const re of EXTRACTORS) {
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
function auditPair(localeHtml, parentHtml, locale) {
  const en = translatableStrings(parentHtml);
  const loc = translatableStrings(localeHtml);
  const ledger = loadLedger().get(locale) || new Set();
  const survivors = [];
  const ledgered = [];
  for (const s of en) {
    if (!loc.has(s)) continue;
    (ledger.has(s) ? ledgered : survivors).push(s);
  }
  survivors.sort();
  return { survivors, ledgered, enCount: en.size };
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

  const { survivors, ledgered, enCount } = auditPair(html, read(parentPath), locale);
  return {
    status: survivors.length ? 'untranslated' : 'ok',
    locale,
    parent: parentRel,
    survivors,
    ledgered,
    enCount
  };
}

module.exports = {
  auditPair,
  auditLocalePage,
  translatableStrings,
  englishParentOf,
  localeOf,
  loadLedger,
  UNIVERSAL_ALLOW,
  LEDGER_PATH: LEDGER
};
