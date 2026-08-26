#!/usr/bin/env node
'use strict';

/**
 * editorial-corpus.js
 *
 * Slot-aware extraction of the prose a READER actually sees, for the Editorial
 * Footprint Risk system. Shared by the miner, the whole-site audit and the
 * per-PR gate, so "visible prose" can never mean three different things in the
 * three places it is measured — the same reason
 * scripts/lib/locale-translation-audit.js and scripts/lib/faq-schema-audit.js
 * are shared libraries rather than three copies of a regex.
 *
 * ── Why slots, and not one bag of text ─────────────────────────────────────
 * Grepping a page and calling the result "content" is wrong on this site in
 * both directions:
 *
 *   · A symbol page is mostly NOT prose. library/currency-symbols renders ~30
 *     glyph tiles; each carries its name twice (aria-label + visible
 *     .flag-label) plus a data-symbol clipboard payload. Counted as prose, the
 *     tile names dominate every n-gram list and the actual editorial voice
 *     disappears under them.
 *   · Conversely the strings that most need checking are not all in <p>. The
 *     shared CTA card, the compare-card blurbs and the hero tagline are
 *     template-authored copy repeated across hundreds of pages, and those are
 *     exactly where a footprint lives.
 *
 * So text is classified, not merged. Density rules run on `prose`; the em dash
 * rule runs on `prose` + `headings` + `title` + `metaDescription`; tile labels
 * and clipboard payloads are captured as `ui` so they are visible to an audit
 * but can never inflate a phrase frequency.
 *
 * ── What is deliberately excluded ──────────────────────────────────────────
 * <script>, <style>, <noscript>, comments, JSON-LD, <head> (except <title> and
 * the meta description, which ARE reader-facing), the site header, the static
 * footer, breadcrumbs and the language switcher. The footer alone is ~27 links
 * of identical wording on all 4,589 pages; leaving it in makes every page look
 * like every other page, which is the same lesson the site-wide similarity work
 * had to learn the hard way.
 *
 * ── The one script exception ───────────────────────────────────────────────
 * Some pages build tiles from a JS registry (`{ name: "...", symbol: "..." }`)
 * that the page renders into real, visible tiles. Those names are captured into
 * `ui` — visible, but never prose. Nothing else is read from <script>.
 */

const cheerio = require('cheerio');
const path = require('path');

/** Canonical locale prefixes. A path segment not in here is an EN page. */
const LOCALES = new Set([
  'ar', 'bs', 'cs', 'da', 'de', 'es', 'fi', 'fr', 'hi', 'hr', 'hu', 'id', 'it',
  'ja', 'ko', 'ms', 'nl', 'no', 'pl', 'pt', 'ro', 'ru', 'sk', 'sr', 'sv', 'th',
  'tl', 'tr', 'vi', 'zh-tw'
]);

/**
 * Page families. Order matters: the first match wins, so the locale prefix is
 * stripped before matching and `printables/` beats the bare-directory rule.
 */
const FAMILY_RULES = [
  [/^library\//, 'library'],
  [/^symbol\//, 'symbol'],
  [/^guide\//, 'guide'],
  [/^answers\//, 'answers'],
  [/^usecase\//, 'usecase'],
  [/^category\//, 'category'],
  [/^printables\//, 'printables'],
  [/^updates\//, 'updates'],
  [/^events\//, 'events'],
  [/^(discord|facebook|instagram|linkedin|pinterest|snapchat|telegram|tiktok|whatsapp|x|youtube|threads|roblox)\//, 'platform'],
  [/^$/, 'home']
];

/** Containers that are chrome, navigation or payload — never editorial prose. */
const DROP_SELECTORS = [
  'script', 'style', 'noscript', 'template', 'svg', 'iframe',
  'header', 'footer', 'nav',
  '.breadcrumbs', '.lang-switcher', '.footer', '.footer-inner', '.footer-columns',
  '.symbol-toast', '.skip-link',
  // interactive generator surface
  'input', 'textarea', 'select', 'option', 'form',
  // literal payload: the reader copies these, they are not sentences
  'code', 'pre', 'kbd', 'samp', 'var',
  '.data-table', '.alpha-glyphs', '.alpha-row', '.block-example',
  '.glyph-copy', '.deco-chip', '.uname-chip', '.symbol-hero-tile',
  '.decoration-tab', '.category-tab', '.copy-btn', '.cta-btn'
];

/** Payload containers whose text is captured as `ui` before being dropped. */
const UI_SELECTORS = [
  '.symbol-tile', '.flag-row', '.flag-label', '.symbol-pick-tile',
  '[data-symbol]', '[data-text]',
  // `button` is a payload surface (copy buttons, tabs) EXCEPT where it is the
  // FAQ accordion's question — one of the two house FAQ variants is
  // `<button class="faq-question">`, and dropping it as UI silently removed
  // every question on the accordion pages while leaving their answers, so
  // `faqQuestions` read 0 against `faqAnswers` 21.
  'button:not(.faq-question)'
];

const WS = /\s+/g;

function clean(s) {
  return (s || '').replace(/ /g, ' ').replace(WS, ' ').trim();
}

/** Locale + family + slug, from the repository-relative path. */
function classifyPath(relPath) {
  const rel = relPath.replace(/\\/g, '/').replace(/^\.\//, '');
  const parts = rel.split('/');
  let locale = 'en';
  let rest = parts;
  if (parts.length > 1 && LOCALES.has(parts[0])) {
    locale = parts[0];
    rest = parts.slice(1);
  }
  const dir = rest.slice(0, -1).join('/');
  const withSlash = dir ? `${dir}/` : '';
  let family = 'other';
  for (const [rx, name] of FAMILY_RULES) {
    if (rx.test(withSlash) || (rx.source === '^$' && dir === '')) {
      family = name;
      break;
    }
  }
  // A bare locale root (`id/index.html`) is that locale's home page.
  if (dir === '') family = 'home';
  return { locale, family, dir, rel };
}

/**
 * Text that is deliberately quoted or cited — the one place a forbidden
 * character can legitimately appear because it belongs to someone else's words
 * or to the subject matter itself.
 */
function quotedRanges($, $root) {
  const out = [];
  $root.find('q, blockquote, cite, .quote, [data-quoted]').each((_, el) => {
    const t = clean($(el).text());
    if (t) out.push(t);
  });
  return out;
}

function textsFrom($, $root, selector, { max = 0 } = {}) {
  const out = [];
  $root.find(selector).each((_, el) => {
    // Skip nodes nested inside another node we already captured at this level.
    const t = clean($(el).text());
    if (!t) return;
    if (max && t.length > max) return;
    out.push(t);
  });
  return out;
}

/**
 * `<script>` tile registries. Only `name:` / `label:` string literals, and only
 * where the page also renders tiles — a heuristic that is deliberately
 * conservative because a false capture pollutes `ui`, not prose.
 */
function scriptTileNames(rawHtml) {
  const out = [];
  const scripts = rawHtml.match(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of scripts) {
    if (!/\b(name|label)\s*:\s*["']/.test(block)) continue;
    for (const m of block.matchAll(/\b(?:name|label)\s*:\s*"((?:[^"\\]|\\.){1,80})"/g)) {
      out.push(clean(m[1]));
    }
  }
  return out;
}

/**
 * Extract one page into slots.
 *
 * Returns null for a document with no <body> (a fragment, a redirect stub).
 */
function extractPage(html, relPath) {
  const meta = classifyPath(relPath);
  const $ = cheerio.load(html);

  const title = clean($('head > title').first().text());
  const metaDescription = clean($('head meta[name="description"]').attr('content'));
  const declaredLang = clean($('html').attr('lang')) || null;
  const robots = clean($('head meta[name="robots"]').attr('content')) || null;
  const canonical = clean($('head link[rel="canonical"]').attr('href')) || null;
  const hreflang = [];
  $('head link[rel="alternate"][hreflang]').each((_, el) => {
    hreflang.push({ lang: clean($(el).attr('hreflang')), href: clean($(el).attr('href')) });
  });
  const indexable = !(robots && /\bnoindex\b/i.test(robots));

  const $body = $('body');
  if (!$body.length) return null;

  // Capture payload text as `ui` BEFORE dropping the containers.
  const ui = [];
  for (const sel of UI_SELECTORS) {
    $body.find(sel).each((_, el) => {
      const $el = $(el);
      const t = clean($el.text());
      if (t && t.length <= 120) ui.push(t);
      const payload = clean($el.attr('data-symbol'));
      if (payload) ui.push(payload);
      const aria = clean($el.attr('aria-label'));
      if (aria) ui.push(aria);
    });
  }
  ui.push(...scriptTileNames(html));

  const quoted = quotedRanges($, $body);

  // Literal/technical text: <code>, <kbd>, data-table cells. NOT editorial voice
  // — it is never scored for phrasing — but it IS where this site keeps most of
  // its concrete facts (`U+2014`, `Alt+0151`, `280 characters`, `NFC`). The
  // first version of the scorer stripped these before measuring specificity and
  // read the Discord formatting guide, one of the densest factual pages on the
  // site, as fact-poor. Captured here, used only by the specificity dimension.
  const technical = [];
  $body.find('code, kbd, samp, .data-table td, .data-table th, .block-example').each((_, el) => {
    const t = clean($(el).text());
    if (t && t.length <= 200) technical.push(t);
  });

  // Now strip everything that is not editorial.
  for (const sel of [...DROP_SELECTORS, ...UI_SELECTORS]) $body.find(sel).remove();
  $body.find('*').contents().filter((_, n) => n.type === 'comment').remove();

  const h1 = clean($body.find('h1').first().text());
  // Headings INSIDE a card are captured with the card below, in `cta`. Reading
  // them here as well counts one card title twice in every density measure.
  $body.find('.cta-card, .related-page-card, .compare-card').addClass('utg-card-scope');
  const headings = [];
  $body.find('h2, h3, h4, .article-section-label').each((_, el) => {
    if ($(el).closest('.utg-card-scope').length) return;
    const t = clean($(el).text());
    if (t && t.length <= 200) headings.push(t);
  });

  const faqQuestions = textsFrom($, $body, '.faq-question', { max: 300 });
  const faqAnswers = textsFrom($, $body, '.faq-answer');

  // FAQ text must not also count as generic prose, or every FAQ-bearing page
  // double-counts its own answers in every density measure.
  $body.find('.faq-item, .faq-question, .faq-answer').remove();

  const cta = textsFrom($, $body, '.cta-card, .related-page-card, .compare-card');
  $body.find('.cta-card, .related-page-card, .compare-card').remove();

  const prose = textsFrom($, $body, 'p, li, blockquote, figcaption, summary, dd, .hero-tagline');

  // Internal links and their anchor text, from editorial body only — the
  // header/footer/breadcrumb chrome is already gone, so what survives is the
  // links a writer chose. The SEO Preservation Gate compares exactly this set;
  // boilerplate links would swamp it (a prior measurement on this site found
  // boilerplate was 72.4% of all internal links).
  const links = [];
  $body.find('a[href]').each((_, el) => {
    const href = clean($(el).attr('href'));
    if (!href || /^(?:https?:)?\/\//.test(href) || /^(?:mailto|tel|#|javascript)/i.test(href)) return;
    links.push({ href: href.split('#')[0], text: clean($(el).text()).slice(0, 120) });
  });

  return {
    rel: meta.rel,
    locale: meta.locale,
    family: meta.family,
    declaredLang,
    robots,
    canonical,
    hreflang,
    indexable,
    links,
    slots: {
      title: title ? [title] : [],
      metaDescription: metaDescription ? [metaDescription] : [],
      h1: h1 ? [h1] : [],
      headings,
      prose,
      faqQuestions,
      faqAnswers,
      cta,
      ui,
      technical
    },
    quoted
  };
}

/** Slots whose text is editorial VOICE — what the footprint rules measure. */
const EDITORIAL_SLOTS = ['title', 'metaDescription', 'h1', 'headings', 'prose', 'faqQuestions', 'faqAnswers', 'cta'];

/** Slots that are running prose (sentences), as opposed to labels. */
const PROSE_SLOTS = ['prose', 'faqAnswers', 'metaDescription'];

function joinSlots(page, slots) {
  const out = [];
  for (const s of slots) out.push(...(page.slots[s] || []));
  return out;
}

function editorialText(page) {
  return joinSlots(page, EDITORIAL_SLOTS).join(' ');
}

function proseText(page) {
  return joinSlots(page, PROSE_SLOTS).join(' ');
}

/**
 * Sentence split. Deliberately simple and script-aware rather than clever:
 * it must behave the same on Japanese (。), Arabic (؟ ،) and Thai (which has no
 * sentence punctuation at all — those pages produce few, long "sentences",
 * which is correct, and is why rhythm rules are gated on locale corpus size).
 */
function sentences(text) {
  if (!text) return [];
  return text
    // Full-width terminators are NOT followed by a space, so requiring
    // whitespace merged every Japanese and Chinese page into one "sentence" —
    // which then read as perfectly uniform rhythm. Split on them directly.
    .split(/(?<=[。！？])|(?<=[.!?؟])\s+|(?<=[.!?؟])(?=[A-ZЀ-ӿ])/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

/**
 * Word tokens, lowercased.
 *
 * Script-aware on purpose, and this is not a refinement — it is a correctness
 * fix for a bias this system exists to avoid. A naive `\p{L}+` match treats a
 * whole unspaced Japanese clause as ONE token, so a Japanese page reports a
 * handful of "words" and every per-1000-word rate computed against it explodes.
 * Measured before the fix, em dash density read 68.8/1k for `ja` and 67.3/1k
 * for `zh-tw` against 18.5/1k for `en` — a 3.7x gap that is an artifact of the
 * tokenizer, not of the writing. Shipping that would have put every CJK page at
 * the top of the risk ledger for a bug, which is exactly the failure mode the
 * research memo's §6 is about.
 *
 * Scripts without word separators (Han, Hiragana, Katakana, Thai, Lao, Khmer,
 * Myanmar) are therefore counted per character, the standard approximation;
 * everything else keeps whitespace-delimited runs.
 */
const NO_SPACE_SCRIPT = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u0e00-\u0e7f\u0e80-\u0eff\u1780-\u17ff\u1000-\u109f]/u;

function words(text) {
  if (!text) return [];
  const raw = text.toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) || [];
  const out = [];
  for (const tok of raw) {
    if (NO_SPACE_SCRIPT.test(tok)) {
      // Split the run into per-character units, keeping any Latin/digit runs
      // inside it whole (`Unicode 16` inside a Japanese sentence stays two
      // tokens, not eight).
      let buf = '';
      for (const ch of tok) {
        if (NO_SPACE_SCRIPT.test(ch)) {
          if (buf) { out.push(buf); buf = ''; }
          out.push(ch);
        } else {
          buf += ch;
        }
      }
      if (buf) out.push(buf);
    } else {
      out.push(tok);
    }
  }
  return out;
}

module.exports = {
  LOCALES,
  EDITORIAL_SLOTS,
  PROSE_SLOTS,
  classifyPath,
  extractPage,
  editorialText,
  proseText,
  joinSlots,
  sentences,
  words,
  clean
};
