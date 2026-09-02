#!/usr/bin/env node
'use strict';

/**
 * editorial-footprint.js
 *
 * The Editorial Footprint Risk (EFR) model: phrase-bank matching, nine scored
 * dimensions, and the cross-page similarity index. Shared by the whole-site
 * audit and the per-PR gate so "editorial footprint" can never mean two
 * different things in the two places it is measured.
 *
 * READ FIRST: docs/editorial-footprint-research-2026-08-26.md
 *
 * -- What this is not ------------------------------------------------------
 * Not an AI detector. It emits no probability of machine authorship, consumes
 * no commercial detector score, and no output of it supports a claim about who
 * or what wrote a page. Three independent findings force that line: detectors
 * lose 5-30 AUROC points out of domain; they misclassify 61.3% of non-native
 * English writing as machine-written, which would systematically indict this
 * site's 29 locales; and the population studies behind every marker list state
 * that they cannot identify individual documents. Findings here are phrased
 * about the TEXT ("this construction repeats on 340 pages"), never its origin.
 *
 * -- Three design choices that came from the research, not from intuition ---
 *
 * 1. COMPARATIVE, not absolute. Human raters judging one text alone score at
 *    ~55-57% - barely above chance - but reach ~78% judging texts side by side.
 *    So every threshold here is a percentile within the page's own locale and
 *    family, plus a comparison against the page's own prior state. There is no
 *    universal "a page scores 60" constant.
 *
 * 2. NO per-page lexical-diversity metric. The intuitive move - MTLD, MATTR,
 *    type-token ratio - is contradicted: an ACL 2025 study found homogenization
 *    "does not show clearly" in exactly those measures. What replicates is
 *    COLLECTIVE diversity across a set of documents. So the budget goes to
 *    cross-page sameness (weight 15) and per-page richness gets weight 0.
 *
 * 3. DENSITY, never presence. Roughly a third of English pages published since
 *    2023 carry at least one marker word. At that base rate, presence says
 *    almost nothing about one page. Every lexical dimension is a rate per 1,000
 *    words, and search-protected terms are exempt from density scoring entirely.
 *
 * -- The pages/variety distinction, which is load-bearing ------------------
 * A phrase on 400 pages in 1 distinct sentence is a TEMPLATE - one upstream
 * edit. The same phrase on 400 pages in 380 distinct sentences is a HABIT -
 * an editorial fix. `sharedTemplateStrings` in the phrase bank records the
 * former so the score does not bill hundreds of pages for one string.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  editorialText, proseText, joinSlots, sentences, words
} = require('./editorial-corpus');

const ROOT = path.resolve(__dirname, '..', '..');
const BANK_PATH = path.join(ROOT, 'data', 'editorial_phrase_bank.json');

/**
 * Below this many editorial words a page has no measurable prose and every
 * rate explodes. Measured: `usecase/*` embed stubs carry a single em dash in
 * ~17 words and reported 58.8 per 1,000 - the worst score on the site, for a
 * noindex fragment. Such pages are reported as `insufficient-prose`, not scored.
 */
const MIN_WORDS_FOR_RATE = 120;

/** A locale needs this many pages before its percentile norms mean anything. */
const MIN_LOCALE_PAGES = 40;

// -- phrase bank -----------------------------------------------------------

let _bank = null;
function loadBank(p = BANK_PATH) {
  if (_bank && _bank.__path === p) return _bank;
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const e of raw.entries) {
    // `caseSensitive: true` drops the `i` flag for one entry. It exists because
    // a pattern can need case to mean anything: EFR-F-005's TODO/FIXME/TBD are
    // placeholders only in caps, and case-folded "TODO" matches the ordinary
    // Spanish and Portuguese word "todo" on 301 pages.
    const flags = (e.pattern.startsWith('^') ? 'gm' : 'g') + (e.caseSensitive ? '' : 'i');
    e._rx = e.matchType === 'regex' ? new RegExp(e.pattern, flags) : null;
  }
  raw.__path = p;
  _bank = raw;
  return raw;
}

/**
 * Does an entry's `subject` exemption apply to this page?
 *
 * This is not a nicety. Every leakage pattern tested against the live corpus
 * fired ONLY on pages whose subject is that exact character or syntax: CJK
 * corner brackets on library/bracket-symbols, `**bold**` on the Discord
 * Markdown answers, `## heading` on how-to-make-big-text-in-discord,
 * straight-vs-curly quotes on the quotation-mark symbol pages, and "as an AI"
 * on symbol/em-dash - a page titled
 * 'Em Dash: Copy & Paste + Why It Became the "AI Writing" Tell'.
 * A naive pattern check scored 100% false positives here.
 */
function subjectExempt(entry, page) {
  const ex = (entry.exemptions || []).find((x) => x.type === 'subject');
  if (!ex) return false;
  const slug = page.rel.toLowerCase();
  const title = (page.slots.title[0] || '').toLowerCase();
  const h1 = (page.slots.h1[0] || '').toLowerCase();
  return ex.values.some((v) => {
    const term = v.toLowerCase();
    const spaced = term.replace(/-/g, ' ');
    return slug.includes(`/${term}/`) || slug.includes(`/${term}-`) ||
      title.includes(spaced) || h1.includes(spaced);
  });
}

const ALL_EDITORIAL_SLOTS = ['title', 'metaDescription', 'h1', 'headings', 'prose', 'faqQuestions', 'faqAnswers', 'cta'];

function slotsFor(entry) {
  const base = (!entry.slots || entry.slots.includes('*')) ? ALL_EDITORIAL_SLOTS : entry.slots;
  const excl = (entry.exemptions || []).find((x) => x.type === 'slot');
  const exempt = new Set(excl ? excl.values : []);
  return base.filter((s) => !exempt.has(s));
}

/** Text that is quoted material, so a forbidden character inside it is not ours. */
function quotedList(page) {
  return (page.quoted || []).map((q) => q.toLowerCase()).filter((q) => q.length > 8);
}

function excerpt(text, idx, len) {
  const a = Math.max(0, idx - 45);
  const b = Math.min(text.length, idx + len + 45);
  return `${a > 0 ? '...' : ''}${text.slice(a, b)}${b < text.length ? '...' : ''}`;
}

/**
 * Every phrase-bank hit on a page, with the slot and the surrounding text so a
 * finding can name the exact passage rather than just a count.
 */
function matchBank(page, bank = loadBank()) {
  const hits = [];
  const quoted = quotedList(page);
  for (const entry of bank.entries) {
    if (entry.language !== '*' && entry.language !== page.locale) continue;
    if (entry.contentFamilies && !entry.contentFamilies.includes('*') &&
        !entry.contentFamilies.includes(page.family)) continue;
    if (subjectExempt(entry, page)) continue;

    for (const slot of slotsFor(entry)) {
      for (const text of page.slots[slot] || []) {
        const lower = text.toLowerCase();
        if (quoted.some((q) => q.includes(lower) || lower.includes(q))) continue;
        if (entry.matchType === 'literal') {
          let idx = -1;
          while ((idx = text.indexOf(entry.pattern, idx + 1)) !== -1) {
            hits.push({
              id: entry.id, category: entry.category, severity: entry.severity,
              slot, match: entry.pattern, index: idx, context: excerpt(text, idx, entry.pattern.length)
            });
          }
        } else {
          entry._rx.lastIndex = 0;
          let m;
          while ((m = entry._rx.exec(text)) !== null) {
            hits.push({
              id: entry.id, category: entry.category, severity: entry.severity,
              slot, match: m[0], index: m.index, context: excerpt(text, m.index, m[0].length)
            });
            if (m[0].length === 0) entry._rx.lastIndex++;
          }
        }
      }
    }
  }
  return hits;
}

// -- structural detectors --------------------------------------------------

const NEG_PARALLEL = /\b(?:not just\b[^.!?]{2,60}?\b(?:but|it['\u2019]s|they['\u2019]re)|not only\b[^.!?]{2,60}?\bbut|more than just\b|less about\b[^.!?]{2,50}?\bmore about\b|it['\u2019]s not\b[^.!?]{2,50}?[,;]\s*it['\u2019]s\b)/gi;

/**
 * Three-item constructions, per locale.
 *
 * The first version of this used one English conjunction list against every
 * language. Measured, that produced 8.08 of the 8.6-point mean gap between EN
 * and every other locale - not because English pages triple more, but because
 * the detector could only fire in English. That is the locale bias the research
 * memo's section 6 forbids, arriving through the detector instead of the bank.
 *
 * A locale absent from this table has its triad term reported as NOT MEASURED
 * rather than as zero. Zero and unmeasured are opposite claims, and printing
 * one as the other is what makes an unmeasured locale look clean.
 *
 * CJK and Thai are deliberately absent: they list with an ideographic comma
 * (U+3001) and no spacing, so this comma-and-space shape cannot apply. Guessing
 * an equivalent would be worse than declaring it unmeasured.
 */
const TRIAD_CONJUNCTIONS = {
  en: ['and', 'or'],
  es: ['y', 'e', 'o', 'u'],
  pt: ['e', 'ou'],
  it: ['e', 'ed', 'o', 'od'],
  fr: ['et', 'ou'],
  de: ['und', 'oder'],
  nl: ['en', 'of'],
  pl: ['i', 'oraz', 'lub', 'albo'],
  ru: ['\u0438', '\u0438\u043b\u0438'],
  tr: ['ve', 'veya'],
  id: ['dan', 'atau', 'serta'],
  ms: ['dan', 'atau', 'serta'],
  vi: ['v\u00e0', 'ho\u1eb7c', 'hay'],
  ar: ['\u0648', '\u0623\u0648'],
  cs: ['a', 'nebo'],
  sk: ['a', 'alebo'],
  hr: ['i', 'ili'],
  sr: ['i', 'ili'],
  bs: ['i', 'ili'],
  da: ['og', 'eller'],
  no: ['og', 'eller'],
  sv: ['och', 'eller'],
  fi: ['ja', 'tai'],
  hu: ['\u00e9s', 'vagy'],
  ro: ['\u0219i', 'sau'],
  hi: ['\u0914\u0930', '\u092f\u093e'],
  tl: ['at', 'o']
};

const _triadCache = new Map();
function triadRegex(locale) {
  if (_triadCache.has(locale)) return _triadCache.get(locale);
  const conj = TRIAD_CONJUNCTIONS[locale];
  const rx = conj
    ? new RegExp(
        "\\b[\\p{L}\\p{N}'\u2019-]+(?:\\s+[\\p{L}\\p{N}'\u2019-]+){0,2}," +
        "\\s+[\\p{L}\\p{N}'\u2019-]+(?:\\s+[\\p{L}\\p{N}'\u2019-]+){0,2}," +
        `\\s+(?:${conj.join('|')})\\s+[\\p{L}\\p{N}'\u2019-]+`,
        'giu')
    : null;
  _triadCache.set(locale, rx);
  return rx;
}

/** Question marks in every script this site publishes in. */
const RHETORICAL = /[?\u061f\uff1f]\s*$/;

const GAME_RULES_PATH = path.join(ROOT, 'js', 'gamename', 'game-rules.js');

/**
 * Game names from the site's own nickname rule engine.
 *
 * Reads every `label: "…"` in js/gamename/game-rules.js, drops the field
 * qualifier ("Valorant (Riot ID)" -> "Valorant", "YouTube @handle" ->
 * "YouTube"), and drops any label the platform rule already recognises so a
 * name is never two facts. Longest first, so "Free Fire MAX" cannot be cut
 * to "Free Fire" by an earlier alternative.
 */
function harvestGameNames(src, alreadyMatched = () => false) {
  const names = new Set();
  const re = /label:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const v = m[1].replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*@handle$/, '').trim();
    if (v && !alreadyMatched(v)) names.add(v);
  }
  return [...names].sort((a, b) => b.length - a.length);
}

const PLATFORM_ALTS = 'Discord|Instagram|TikTok|LinkedIn|WhatsApp|Roblox|Snapchat|Telegram|YouTube|Facebook|Pinterest|Threads|Fortnite|PUBG|Minecraft|Nitro|Markdown|Xbox|PlayStation|PSN|Steam|Valorant|Garena';

/**
 * Games this site writes about that have no row in the rule engine yet (a
 * game earns a RULES row when its name checker ships, not when it is first
 * mentioned). Measured on English pages before adding: Forza Horizon on 5,
 * BGMI 7, Arena of Valor 2, Warzone 2. Move a name OUT of here the day it
 * gains a RULES row; the harvest will pick it up and the duplicate is
 * de-duplicated by the Set anyway.
 */
const EXTRA_GAMES = ['Forza Horizon', 'BGMI', 'Arena of Valor', 'Warzone', 'Apex Legends', 'League of Legends', 'Genshin Impact', 'Among Us', 'Honor of Kings', 'Rocket League', 'Overwatch', 'Free Fire MAX'];

function gameNameRegex() {
  let src = '';
  try { src = fs.readFileSync(GAME_RULES_PATH, 'utf8'); } catch { src = ''; }
  const platformRx = new RegExp(`\\b(?:${PLATFORM_ALTS})\\b`);
  const names = [...new Set([...harvestGameNames(src, (v) => platformRx.test(v)), ...EXTRA_GAMES.filter((v) => !platformRx.test(v))])]
    .sort((a, b) => b.length - a.length);
  if (!names.length) return /(?!)/g;
  const esc = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b(?:${esc.join('|')})\\b`, 'g');
}

const SPECIFICITY_RULES = [
  { rx: /U\+[0-9A-Fa-f]{4,6}/g, kind: 'codepoint' },
  { rx: /\bUnicode\s+\d+(?:\.\d+)?\b/gi, kind: 'unicode-version' },
  { rx: /\bAlt\s*\+?\s*\d{3,5}\b/gi, kind: 'alt-code' },
  // A limit with a thousands separator ("4,096 characters", "32,768") matched
  // only by accident before 2026-09-02 - "\b\d{1,5}" caught the "096" - and a
  // bare "32,768" in a table cell not at all.
  { rx: /\b(?:\d{1,3}(?:,\d{3})+|\d{1,5})\s*(?:characters?|chars?|bytes?|codepoints?|glyphs?|px|pixels?|dpi|mm|cm|pt)\b/gi, kind: 'limit' },
  { rx: /\b\d{1,3}(?:,\d{3})+\b/g, kind: 'figure' },
  // Durations, dates and percentages are the facts a rules-change entry is
  // made of, and none was counted: `lienquan-mobile-name-penalty-update`
  // says "1 day to 3 years" and "January 1, 2026" and was credited with the
  // bare year only, once, however many distinct dates it named.
  { rx: /\b\d{1,5}\s*(?:seconds?|secs?|minutes?|mins?|hours?|days?|weeks?|months?|years?)\b/gi, kind: 'duration' },
  { rx: /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(?:\d{1,2},?\s+)?\d{4}\b|\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}\b/g, kind: 'date' },
  { rx: /\b\d{1,3}(?:\.\d+)?%/g, kind: 'percentage' },
  // Engagement counts a social page states as fact: "5-10 comments per day",
  // "10+ reactions". Deliberately NOT the site's own generic units ("3 styles",
  // "12 symbols", "two lines"): a first draft counted those and moved the guide
  // cohort median enough to fail three untouched guides, because every guide
  // here says "5 fonts" somewhere. A bare "14" is not a fact either.
  { rx: /\b\d{1,6}\+?\s*(?:comments?|reactions?|replies|posts?|followers?|likes?|views?|shares?|players?|accounts?|subscribers?)\b/gi, kind: 'quantity' },
  { rx: /\b(?:UTF-8|UTF-16|NFC|NFD|NFKC|NFKD|ASCII|GSM-7|ISO[- ]8859|Latin-1)\b/g, kind: 'encoding' },
  { rx: /\b(?:combining|diacritic|ligature|grapheme|glyph|codepoint|surrogate|zero[- ]width|variation selector|serif|monospace|blackletter)\b/gi, kind: 'terminology' },
  // Console and storefront names were missing until 2026-09-01, and this list
  // was never social-only: Roblox, Fortnite, PUBG and Minecraft were always in
  // it. There is no principled reason "Roblox" reads as a concrete fact and
  // "Xbox" does not, and the omission systematically under-scored the pages
  // carrying game-identity content. Measured on /updates/, it inflated
  // specificityDeficit on `forza-horizon-6-gamertag-rules` from 4.18 to 10.51
  // and on `lienquan-mobile-name-penalty-update` from 7.34 to 9.15, purely
  // because the detector could not read the subject those pages are about.
  // `Steam` is the one ambiguous token (an ordinary English word), which is why
  // this rule stays case-sensitive; all 85 pages carrying capitalised "Steam"
  // mean Valve's, checked 2026-09-01.
  // Widened 2026-09-02 (Twitter through iMessage): every name below is cited
  // on English pages in the corpus (Twitter on 63, Reddit 9, Twitch 7, Slack 5)
  // and none is an ordinary English word when capitalised. "Signal", "Word",
  // "Kick", "Notion" and "Apple" are deliberately NOT here: each is a common
  // noun or an emoji name ("Red Apple") somewhere on this site, and a rule
  // that counts them would manufacture facts out of vocabulary.
  { rx: /\b(?:Discord|Instagram|TikTok|LinkedIn|WhatsApp|Roblox|Snapchat|Telegram|YouTube|Facebook|Pinterest|Threads|Fortnite|PUBG|Minecraft|Nitro|Markdown|Xbox|PlayStation|PSN|Steam|Valorant|Garena|Twitter|Reddit|Twitch|Slack|Bluesky|Mastodon|Messenger|WeChat|KakaoTalk|Zalo|Viber|Tinder|Bumble|iMessage)\b/g, kind: 'platform' },
  { rx: /\b(?:Windows|macOS|iOS|Android|Linux|Chrome|Safari|Firefox|Edge|ChromeOS)\b/g, kind: 'environment' },
  // Games are HARVESTED from the site's own rule engine
  // (js/gamename/game-rules.js), not typed here, for the reason
  // locale-translation-audit.js harvests Unicode block names from the pages:
  // the site is the authority on what it covers, and a harvested list maintains
  // itself when a game is added. A label the platform rule above already
  // matches is dropped from the harvest, so one mention of "PUBG Mobile" is one
  // fact, not two. Added 2026-09-02, when the vocabulary was widened after the
  // gate's first report: `lienquan-mobile-name-penalty-update` was FAIL on
  // specificity with "Liên Quân Mobile" in every other sentence, and the
  // detector could not read the subject the page is about - the same defect
  // the console-name omission above had, one list over.
  { rx: gameNameRegex(), kind: 'game' },
  // Publishers, vendors and standards bodies. A page that says WHO decided
  // something is more concrete than one that says "the platform"; measured
  // before adding: Google is cited on 710 English pages, Microsoft 21,
  // Samsung 20, Unicode Consortium 15, Emojipedia 6. "Apple" and "Meta" are
  // excluded (emoji names and an ordinary word respectively).
  { rx: /\b(?:Unicode Consortium|Emojipedia|Riot Games|Epic Games|Tencent|Supercell|Moonton|Microsoft|Google|Samsung|Nintendo|Sony|Valve)\b/g, kind: 'organisation' },
  // Emoji font sets - the fact that decides how a character renders, and the
  // vocabulary the rendering-gap pages are written in (Twemoji on 241 pages,
  // Noto 19, Segoe 11).
  { rx: /\b(?:Twemoji|Noto (?:Color Emoji|Emoji|Sans(?: Symbols2?| CJK)?)|Segoe UI(?: Emoji| Symbol)?|Apple Color Emoji|JoyPixels|EmojiOne)\b/g, kind: 'emoji-font' },
  // "Emoji 16.0" is a dated release like "Unicode 16.0" and was invisible.
  { rx: /\bEmoji\s+\d+(?:\.\d+)?\b/g, kind: 'emoji-version' },
  // "iOS 18.4" is a version, a different fact from "iOS" the environment.
  { rx: /\b(?:iOS|Android|Windows|macOS|One UI)\s+\d+(?:\.\d+)?\b/g, kind: 'os-version' },
  { rx: /\b(?:does not|doesn['’]t|will not|won['’]t|cannot|can['’]t|is rejected|is stripped|falls back|renders as|is ignored)\b/gi, kind: 'constraint' },
  { rx: /\b(?:for example|e\.g\.|such as|for instance|like this)\b/gi, kind: 'example' },
  // Script-agnostic: a codepoint, a version number or a digit-plus-unit is
  // concrete in any language, so a locale page is not penalised for having its
  // facts in its own words.
  { rx: /\b\d{4}\b/g, kind: 'year-or-number' }
];

/**
 * Concrete facts, counted as DISTINCT values rather than occurrences.
 *
 * Occurrence counting would reward restating one codepoint eight times, which
 * is keyword stuffing wearing a specificity badge - the over-correction risk
 * the research memo section 5.5 names.
 */
function specificityInventory(text) {
  const byKind = {};
  let distinct = 0;
  for (const { rx, kind } of SPECIFICITY_RULES) {
    const found = new Set((text.match(rx) || []).map((s) => s.toLowerCase()));
    if (found.size) { byKind[kind] = found.size; distinct += found.size; }
  }
  return { distinct, byKind };
}

// -- cross-page similarity (MinHash + LSH) ---------------------------------

const NUM_PERM = 128;
const BANDS = 32;
const ROWS_PER_BAND = NUM_PERM / BANDS;
const MASK = (1n << 61n) - 1n;

/**
 * Deterministic permutation seeds.
 *
 * Derived from a fixed string via BLAKE2b, NOT from any language's built-in
 * `hash()`. Python's `hash()` on strings is randomised per process unless
 * PYTHONHASHSEED is pinned, so a signature built from it differs between runs -
 * which produces a similarity gate that passes locally and fails in CI for no
 * visible reason. Same trap in reverse for anything seeded from a clock.
 */
const SEEDS = (() => {
  const a = [], b = [];
  for (let i = 0; i < NUM_PERM; i++) {
    const h = crypto.createHash('blake2b512').update(`utg-efr-perm-${i}`).digest();
    a.push((BigInt(`0x${h.subarray(0, 8).toString('hex')}`) & MASK) | 1n);
    b.push(BigInt(`0x${h.subarray(8, 16).toString('hex')}`) & MASK);
  }
  return { a, b };
})();

function hash64(s) {
  return BigInt(`0x${crypto.createHash('blake2b512').update(s).digest().subarray(0, 8).toString('hex')}`);
}

/** 5-word shingles over the page's editorial prose. */
function shingles(text, k = 5) {
  const w = words(text);
  if (w.length < k) return w.length ? new Set([w.join(' ')]) : new Set();
  const out = new Set();
  for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(' '));
  return out;
}

function signature(sh) {
  if (!sh.size) return null;
  const hs = [...sh].map(hash64);
  const sig = new Array(NUM_PERM);
  for (let i = 0; i < NUM_PERM; i++) {
    let min = MASK;
    const a = SEEDS.a[i], b = SEEDS.b[i];
    for (const h of hs) {
      const v = (a * h + b) & MASK;
      if (v < min) min = v;
    }
    sig[i] = min;
  }
  return sig;
}

function jaccard(A, B) {
  if (!A.size || !B.size) return 0;
  const [s, l] = A.size <= B.size ? [A, B] : [B, A];
  let inter = 0;
  for (const x of s) if (l.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

/**
 * Candidate pairs via LSH banding, then exact Jaccard on candidates only.
 *
 * Comparison is scoped WITHIN a locale. Cross-locale pairs are translations of
 * each other and are supposed to say the same thing; scoring them as duplicates
 * would mark every correct translation on the site as a defect. A prior
 * site-wide measurement hit exactly this: an Egyptian-hieroglyph cluster scored
 * 0.72-0.80 across four languages purely on shared Gardiner codes and Unicode
 * character names, which are identical in every language.
 */
function similarityIndex(pages, { minJaccard = 0.5 } = {}) {
  const shs = new Map(), sigs = new Map();
  for (const p of pages) {
    const sh = shingles(editorialText(p));
    shs.set(p.rel, sh);
    sigs.set(p.rel, signature(sh));
  }
  const buckets = new Map();
  for (const p of pages) {
    const sig = sigs.get(p.rel);
    if (!sig) continue;
    for (let band = 0; band < BANDS; band++) {
      const slice = sig.slice(band * ROWS_PER_BAND, (band + 1) * ROWS_PER_BAND).join(',');
      const key = `${p.locale}|${band}|${slice}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(p.rel);
    }
  }
  const candidates = new Set();
  for (const members of buckets.values()) {
    if (members.length < 2 || members.length > 400) continue;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        candidates.add(members[i] < members[j] ? `${members[i]}\t${members[j]}` : `${members[j]}\t${members[i]}`);
      }
    }
  }
  const pairs = [];
  const best = new Map();
  for (const key of candidates) {
    const [a, b] = key.split('\t');
    const j = jaccard(shs.get(a), shs.get(b));
    if (j < minJaccard) continue;
    pairs.push({ a, b, jaccard: +j.toFixed(4) });
    if (!best.has(a) || best.get(a).jaccard < j) best.set(a, { peer: b, jaccard: +j.toFixed(4) });
    if (!best.has(b) || best.get(b).jaccard < j) best.set(b, { peer: a, jaccard: +j.toFixed(4) });
  }
  pairs.sort((x, y) => y.jaccard - x.jaccard);
  return { pairs, best, shingleSets: shs };
}

/** Heading/FAQ/paragraph shape, for structural template dependence. */
function structureKey(page) {
  return `${page.slots.headings.length}:${page.slots.faqQuestions.length}:${page.slots.prose.length}`;
}

// -- the nine dimensions ---------------------------------------------------

/**
 * Weights. Sum to 100.
 *
 * Moved from the initial proposal on measured evidence; every change and its
 * reason is recorded in docs/editorial-footprint-calibration-2026-08-26.md.
 * Read that before touching a number here.
 *
 * A weight is PROTECTIVE CAPACITY, not observed contribution. Four dimensions
 * currently read ~0 on 97-100% of pages, because this site genuinely does not
 * use those constructions. Cutting their weight for that reason would remove
 * the guard that keeps it true.
 */
const WEIGHTS = {
  formulaicPhraseDensity: 12,
  formulaicSyntax: 12,
  genericIntroductions: 8,
  promotionalVagueness: 8,
  specificityDeficit: 20,
  crossPageSameness: 15,
  structuralTemplate: 12,
  punctuationFingerprint: 8,
  rhythmRepetition: 5
};

/** Map a raw rate onto 0-1 against a soft ceiling. Linear, then clamped. */
function ramp(value, ceiling) {
  if (!ceiling || ceiling <= 0) return 0;
  return Math.max(0, Math.min(1, value / ceiling));
}

/**
 * How far BELOW its cohort's median a page sits, as a 0-1 shortfall, tempered
 * by `scale` so a tiny median cannot produce a maximum penalty.
 *
 * This is the "comparative, not absolute" principle made concrete, and it
 * replaces a fixed ceiling that did not survive contact with the corpus: at 25
 * distinct facts per 1,000 words, the median page (5.7) scored 0.80 and the
 * dimension contributed 69% of its ceiling to EVERY page. A constant tax is not
 * a measurement. It also erased the thing this dimension must respect - that a
 * symbol reference page (median 15.6 facts per 1,000 words) and a library
 * collection page (2.6) have legitimately different fact densities.
 *
 * `scale` is what stops the cure becoming the disease. Dividing by the median
 * alone means a cohort whose median is one fact per page awards a FULL deficit
 * to a page with zero - a whole-dimension penalty for one missing fact. Dividing
 * by max(median, scale) makes the penalty proportional to how much information
 * the cohort has demonstrated is achievable: at a median of 2.9 a fact-free page
 * scores 0.49, at a median of 15.6 it scores 1.0.
 */
function shortfallBelow(value, median, scale = 6) {
  if (median === null || median === undefined || median <= 0) return 0;
  return Math.max(0, Math.min(1, (median - value) / Math.max(median, scale)));
}

/** How far ABOVE its cohort's median a page sits, tempered the same way. */
function excessAbove(value, median, multiple, scale = 6) {
  if (median === null || median === undefined || median < 0) return 0;
  return Math.max(0, Math.min(1, (value - median) / (Math.max(median, scale) * multiple)));
}

const COHORT_MIN = 8;

/**
 * A cohort median is only a usable reference if it is meaningfully above zero.
 *
 * This is the single most important guard in the model, and it was added after
 * the first calibration run put nine GOOD pages at the top of the risk ledger.
 * Relative measures are unstable at low base rates, and the instability always
 * lands on the smallest and most different cohorts - which here means the
 * non-English ones. Three separate instances, all from one run:
 *
 *   · `nl|library` has a triad median of 0, so excessAbove() with a zero
 *     reference degenerated to a boolean and ONE triad maxed the dimension at
 *     12/12. `en|library` has a median of 15.5 per 1,000 words, so an English
 *     page needed 62 to score the same. Exactly backwards.
 *   · `th|library` has an em dash median of 1.49 per 1,000, so six em dashes on
 *     a 1,156-word Thai page read as 1.66x the ceiling and maxed punctuation.
 *   · `nl|library` has a specificity median of 2.9 per 1,000 - about one fact on
 *     a 350-word page - so a page one fact short scored a full deficit.
 *
 * Two different fixes, because they are two different failures. The last one is
 * a SCALE problem and is handled inside shortfallBelow()/excessAbove() by
 * tempering with `scale`, which keeps the cohort comparison alive. The first is
 * a MEASUREMENT GAP - a triad median of exactly zero across 198 Dutch pages
 * means the detector does not fire in Dutch, not that Dutch pages never list
 * three things - and no arithmetic can repair that, so it is declared NOT
 * MEASURED. Reporting "no instrument" as "worst possible" is how a measurement
 * turns into an accusation.
 *
 * A hard floor is therefore kept ONLY for triads, and only to detect that gap.
 */
const COHORT_MIN_MEDIAN = { triads: 2.0 };

/**
 * Cohort median for a rate, preferring locale+family and falling back to
 * locale. Returns null when no cohort clears the reference floor.
 */
function cohortMedian(ctx, page, metric) {
  if (!ctx.cohortNorms) return null;
  const floor = COHORT_MIN_MEDIAN[metric] || 0;
  const fam = ctx.cohortNorms.get(`${page.locale}|${page.family}|${metric}`);
  if (fam && fam.n >= COHORT_MIN && fam.median >= floor) return fam.median;
  const loc = ctx.cohortNorms.get(`${page.locale}||${metric}`);
  if (loc && loc.median >= floor) return loc.median;
  return null;
}

/**
 * The sentence splitter cannot segment a script with no sentence-final
 * punctuation. Thai `cat-kaomoji` yields 7 "sentences" across 1,156 words -
 * a mean of 165 - and seven equally enormous blocks have a low coefficient of
 * variation, so the uniform-rhythm term scored a maximum on a page whose rhythm
 * was never measured at all. Require enough sentences AND a plausible mean
 * length before trusting the shape.
 */
const RHYTHM_MIN_SENTENCES = 8;
const RHYTHM_MAX_MEAN_WORDS = 60;

/**
 * Score one page.
 *
 * Dimensions carry `measured: false` where the instrument does not exist for
 * this page's language, and the total is renormalised over the measured weights
 * only. Scoring an unmeasured dimension as 0 would flatter every locale the
 * English detectors cannot reach - which is exactly how the triad detector
 * produced an 8-point EN penalty that was an artifact of the regex, not of the
 * writing.
 */
function scorePage(page, ctx = {}) {
  const bank = ctx.bank || loadBank();
  const ed = editorialText(page);
  const pr = proseText(page);
  const wordCount = words(ed).length;
  const per1k = (n) => (wordCount ? (1000 * n) / wordCount : 0);

  const hits = matchBank(page, bank);
  const byCat = { forbidden: [], strongly_discouraged: [], density_limited: [], search_protected: [] };
  for (const h of hits) (byCat[h.category] = byCat[h.category] || []).push(h);

  const counts0 = {
    forbidden: byCat.forbidden.length,
    stronglyDiscouraged: byCat.strongly_discouraged.length,
    densityLimited: byCat.density_limited.length,
    searchProtected: byCat.search_protected.length
  };

  if (wordCount < MIN_WORDS_FOR_RATE) {
    return {
      rel: page.rel, locale: page.locale, family: page.family,
      status: 'insufficient-prose', wordCount, score: null, dimensions: null,
      counts: counts0, hits
    };
  }

  /** Does the bank carry any rule of this category for this page's language? */
  const hasRules = (category) => bank.entries.some(
    (e) => e.category === category && (e.language === '*' || e.language === page.locale)
  );

  const proseSentences = joinSlots(page, ['prose', 'faqAnswers']).flatMap((b) => sentences(b));
  const spec = specificityInventory(`${ed} ${joinSlots(page, ['technical']).join(' ')}`);
  const emdash = byCat.forbidden.filter((h) => h.id === 'EFR-F-001').length;
  const ellipsis = (ed.match(/…/g) || []).length;

  const triadRx = triadRegex(page.locale);
  const triads = triadRx ? (pr.match(triadRx) || []).length : null;
  const negPar = page.locale === 'en' ? (pr.match(NEG_PARALLEL) || []).length : null;
  const rhetorical = proseSentences.filter((s) => RHETORICAL.test(s)).length;

  // 1. Formulaic phrase density - strongly-discouraged bank hits, as a rate.
  const d1 = { value: ramp(per1k(byCat.strongly_discouraged.length), 6), measured: hasRules('strongly_discouraged') };

  // 2. Formulaic syntax - negative parallelism, triads, rhetorical-question share.
  //    Rhetorical share is language-independent; the other two are not, so a
  //    locale without them is scored on what IS measurable rather than on zero.
  const syntaxTerms = [ramp(proseSentences.length ? rhetorical / proseSentences.length : 0, 0.25)];
  if (negPar !== null) syntaxTerms.push(ramp(per1k(negPar), 2));
  const triadRef = triads === null ? null : cohortMedian(ctx, page, 'triads');
  if (triadRef !== null) syntaxTerms.push(excessAbove(per1k(triads), triadRef, 3, 5));
  const d2 = { value: Math.max(...syntaxTerms), measured: true, partial: triadRef === null };

  // 3. Generic introductions - the two sentence-initial bank entries.
  const genericOpeners = byCat.strongly_discouraged.filter((h) => h.id === 'EFR-D-003' || h.id === 'EFR-D-004').length;
  const d3 = { value: ramp(genericOpeners, 3), measured: page.locale === 'en' };

  // 4. Promotional vagueness - density-limited hits against their own caps.
  let promoScore = 0;
  for (const entry of bank.entries) {
    if (entry.category !== 'density_limited' || !entry.maxPer1000Words) continue;
    if (entry.language !== '*' && entry.language !== page.locale) continue;
    const n = byCat.density_limited.filter((h) => h.id === entry.id).length;
    promoScore = Math.max(promoScore, ramp(per1k(n), entry.maxPer1000Words * 3));
  }
  const d4 = { value: promoScore, measured: hasRules('density_limited') };

  // 5. Specificity deficit - shortfall against the page's own cohort median.
  const specRef = cohortMedian(ctx, page, 'specific');
  const d5 = { value: shortfallBelow(per1k(spec.distinct), specRef, 6), measured: specRef !== null };

  // 6. Cross-page sameness - nearest same-locale neighbour's Jaccard.
  const near = ctx.nearest ? ctx.nearest.get(page.rel) : null;
  const d6 = { value: near ? ramp((near.jaccard - 0.45) / 0.35, 1) : 0, measured: !!ctx.nearest };

  // 7. Structural template dependence.
  const shareCount = ctx.structureCounts
    ? (ctx.structureCounts.get(`${page.locale}|${page.family}|${structureKey(page)}`) || 1) : 1;
  const famSize = ctx.familySizes ? (ctx.familySizes.get(`${page.locale}|${page.family}`) || 1) : 1;
  const d7 = { value: famSize > 3 ? ramp((shareCount - 1) / famSize, 0.6) : 0, measured: !!ctx.structureCounts && famSize > 3 };

  // 8. Punctuation fingerprint - excess over the cohort, not raw presence.
  //    98.9% of pages carry an em dash, so an absolute measure here is a
  //    constant, not a signal. What the SCORE should surface is a page unusually
  //    heavy for its own cohort; the house-style rule itself is enforced
  //    separately and forward-only by the gate.
  const emRef = cohortMedian(ctx, page, 'emdash');
  const punctTerms = [ramp(per1k(ellipsis), 8)];
  if (emRef !== null) punctTerms.push(excessAbove(per1k(emdash), emRef, 1.5, 8));
  const d8 = { value: Math.max(...punctTerms), measured: !!ctx.cohortNorms, partial: emRef === null };

  // 9. Rhythm - repeated sentence openings and uniform sentence length.
  const openings = new Map();
  for (const s of proseSentences) {
    const key = words(s).slice(0, 3).join(' ');
    if (key) openings.set(key, (openings.get(key) || 0) + 1);
  }
  const maxRepeat = openings.size ? Math.max(...openings.values()) : 0;
  const repeatShare = proseSentences.length ? maxRepeat / proseSentences.length : 0;
  const lens = proseSentences.map((s) => words(s).length).filter((n) => n > 0);
  const mean = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const sd = lens.length > 1
    ? Math.sqrt(lens.reduce((a, n) => a + (n - mean) ** 2, 0) / (lens.length - 1))
    : 0;
  const cv = mean ? sd / mean : 1;
  const rhythmTerms = [ramp(repeatShare, 0.4)];
  const cvUsable = proseSentences.length >= RHYTHM_MIN_SENTENCES && mean > 0 && mean <= RHYTHM_MAX_MEAN_WORDS;
  if (cvUsable) rhythmTerms.push(1 - ramp(cv, 0.55));
  // Both terms need enough sentences to mean anything: with 7 "sentences" over
  // 1,156 words (Thai, which the splitter cannot segment) three sharing an
  // opening is 43% and maxes the dimension on a page whose rhythm was never
  // observed. Measured only at RHYTHM_MIN_SENTENCES or above.
  const d9 = {
    value: proseSentences.length >= RHYTHM_MIN_SENTENCES ? Math.max(...rhythmTerms) : 0,
    measured: proseSentences.length >= RHYTHM_MIN_SENTENCES,
    partial: !cvUsable
  };

  const dims = {
    formulaicPhraseDensity: d1, formulaicSyntax: d2, genericIntroductions: d3,
    promotionalVagueness: d4, specificityDeficit: d5, crossPageSameness: d6,
    structuralTemplate: d7, punctuationFingerprint: d8, rhythmRepetition: d9
  };

  let weighted = 0, measuredWeight = 0;
  const unmeasured = [];
  for (const [k, w] of Object.entries(WEIGHTS)) {
    if (!dims[k].measured) { unmeasured.push(k); continue; }
    weighted += dims[k].value * w;
    measuredWeight += w;
  }
  const score = measuredWeight ? +((100 * weighted) / measuredWeight).toFixed(1) : null;

  return {
    rel: page.rel, locale: page.locale, family: page.family,
    status: ctx.nearest ? 'scored' : 'partial',
    wordCount,
    score,
    measuredWeight,
    unmeasuredDimensions: unmeasured,
    dimensions: Object.fromEntries(Object.entries(dims).map(([k, v]) => [k, v.measured ? +(v.value * WEIGHTS[k]).toFixed(2) : null])),
    raw: Object.fromEntries(Object.entries(dims).map(([k, v]) => [k, v.measured ? +v.value.toFixed(3) : null])),
    counts: Object.assign(counts0, {
      emdash, ellipsis, negativeParallelism: negPar, triads,
      rhetoricalQuestions: rhetorical, distinctSpecificFacts: spec.distinct,
      sentences: proseSentences.length
    }),
    specificity: spec.byKind,
    nearest: near || null,
    structureSharedWith: shareCount - 1,
    hits
  };
}

function median(arr) {
  if (!arr.length) return 0;
  const v = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/**
 * Corpus-level context: similarity neighbours, structure histogram, and the
 * per-cohort rate medians the comparative dimensions are scored against.
 */
function buildContext(pages, opts = {}) {
  const scored = pages.filter((p) => p.indexable !== false);
  const { best, pairs } = similarityIndex(scored, opts);
  const structureCounts = new Map();
  const familySizes = new Map();
  const localeSizes = new Map();
  const raw = new Map();

  const push = (key, v) => { if (!raw.has(key)) raw.set(key, []); raw.get(key).push(v); };

  for (const p of scored) {
    const sk = `${p.locale}|${p.family}|${structureKey(p)}`;
    structureCounts.set(sk, (structureCounts.get(sk) || 0) + 1);
    familySizes.set(`${p.locale}|${p.family}`, (familySizes.get(`${p.locale}|${p.family}`) || 0) + 1);
    localeSizes.set(p.locale, (localeSizes.get(p.locale) || 0) + 1);

    const ed = editorialText(p);
    const n = words(ed).length;
    if (n < MIN_WORDS_FOR_RATE) continue;
    const per1k = (x) => (1000 * x) / n;
    const spec = specificityInventory(`${ed} ${joinSlots(p, ['technical']).join(' ')}`).distinct;
    const em = (ed.match(/—/g) || []).length;
    const rx = triadRegex(p.locale);
    const tri = rx ? (proseText(p).match(rx) || []).length : null;

    for (const [scope, metric, val] of [
      [`${p.locale}|${p.family}`, 'specific', per1k(spec)],
      [`${p.locale}|`, 'specific', per1k(spec)],
      [`${p.locale}|${p.family}`, 'emdash', per1k(em)],
      [`${p.locale}|`, 'emdash', per1k(em)]
    ]) push(`${scope}|${metric}`, val);
    if (tri !== null) {
      push(`${p.locale}|${p.family}|triads`, per1k(tri));
      push(`${p.locale}||triads`, per1k(tri));
    }
  }

  const cohortNorms = new Map();
  for (const [k, v] of raw) cohortNorms.set(k, { median: median(v), n: v.length });

  return { nearest: best, pairs, structureCounts, familySizes, localeSizes, cohortNorms, bank: loadBank() };
}

/** Percentiles of a numeric array. */
function percentiles(values, qs = [0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99]) {
  const v = values.slice().sort((a, b) => a - b);
  const out = {};
  for (const q of qs) {
    out[`p${Math.round(q * 100)}`] = v.length
      ? +v[Math.min(v.length - 1, Math.floor(q * v.length))].toFixed(1) : null;
  }
  return out;
}

module.exports = {
  WEIGHTS, MIN_WORDS_FOR_RATE, MIN_LOCALE_PAGES, BANK_PATH, ALL_EDITORIAL_SLOTS,
  loadBank, matchBank, subjectExempt, specificityInventory,
  shingles, signature, jaccard, similarityIndex, structureKey,
  scorePage, buildContext, percentiles,
  NEG_PARALLEL, TRIAD_CONJUNCTIONS, triadRegex, RHETORICAL, SPECIFICITY_RULES, harvestGameNames, gameNameRegex, GAME_RULES_PATH, EXTRA_GAMES,
  shortfallBelow, excessAbove, ramp
};
