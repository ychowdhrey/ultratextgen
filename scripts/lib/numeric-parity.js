#!/usr/bin/env node
'use strict';

/**
 * numeric-parity.js — the axis every other gate in this repo is blind to.
 *
 * WHY THIS EXISTS
 * ---------------
 * On 2026-09-01 commit 63d04e71b ("rewrite every English /updates/ entry to
 * the Tone of Voice standard") corrected Unicode 18.0 from 13,047 characters
 * to 13,007. It touched 11 English files and zero locale files. Seven
 * translations went on asserting 13,047 in their title, meta description,
 * OG/Twitter cards, JSON-LD, hero, pill, <h2> and FAQ — as current fact, for
 * a month — and the full CI suite passed on every PR in that window.
 *
 * Each gate was right to pass it:
 *
 *   check-translation-parity   compares a STRUCTURAL fingerprint — links,
 *                              h2/FAQ/tile counts. 13,047 -> 13,007 moves no
 *                              structural element at all.
 *   check-locale-translation   looks for English strings surviving on a
 *                              locale page. "13.047 neue Zeichen" is
 *                              perfectly German.
 *   check-faq-schema           compares a page against itself. Both halves
 *                              said 13,047, in perfect agreement.
 *
 * Structure, language, schema, assets. Nothing measured VALUES. A number is
 * the one thing that can be well-structured, correctly translated,
 * internally consistent — and false.
 *
 * WHAT THIS MEASURES, AND WHY IT IS SHAPED THIS WAY
 * -------------------------------------------------
 * Not "do EN and its translations carry the same numbers" — they legitimately
 * do not, and a whole-site state check would be permanently red, which is how
 * a gate gets ignored (see check-images). It measures a DELTA with a specific
 * shape: a page REPLACED a number — dropped one and added another in the same
 * slot — while a sibling in its hreflang cluster still carries the dropped
 * one. That is a value correction that did not propagate, and it is precisely
 * the 13,047 incident.
 *
 * Requiring a substitution rather than a bare deletion is load-bearing. Prose
 * gets reworded and numbers get dropped for innocent reasons all the time; a
 * number replaced BY ANOTHER NUMBER in the same slot is a fact changing.
 *
 * Matching is scoped BY SLOT TYPE, not page-wide. EN's <h2> set dropping
 * 13047 is checked against the sibling's <h2> set, never against a stray
 * "13047" elsewhere on the page. Page-wide matching drowns in false hits from
 * dates and counts; slot scoping is what makes this precise enough to gate.
 *
 * Separators are normalised before comparison, which is not optional here:
 * German writes the same number as 13.047 and English as 13,047. Without
 * normalisation this check would report every European locale as divergent
 * and nothing else.
 */

const SLOTS = {
  title:      [/<title[^>]*>([\s\S]*?)<\/title>/gi],
  metaDesc:   [/<meta\s+name="description"\s+content="([^"]*)"/gi],
  ogDesc:     [/<meta\s+property="og:description"\s+content="([^"]*)"/gi],
  twDesc:     [/<meta\s+name="twitter:description"\s+content="([^"]*)"/gi],
  jsonLd:     [/"(?:description|text|headline)":\s*"((?:[^"\\]|\\.)*)"/g],
  h1:         [/<h1[^>]*>([\s\S]*?)<\/h1>/gi],
  h2:         [/<h2[^>]*>([\s\S]*?)<\/h2>/gi],
  pill:       [/<span class="guide-pill[^"]*">([\s\S]*?)<\/span>/gi],
  heroTag:    [/<p class="hero-tagline">([\s\S]*?)<\/p>/gi],
  faqAnswer:  [/<(?:p|div) class="faq-answer">([\s\S]*?)<\/(?:p|div)>/gi],
};

/** Arabic-Indic and Extended Arabic-Indic digits -> ASCII. */
function asciiDigits(s) {
  return s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
          .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

/**
 * Canonical numbers in a run of text. "13.047", "13,047", "13 047" and
 * "13047" all canonicalise to "13047"; a decimal fraction keeps its point.
 * Numbers shorter than MIN_DIGITS are dropped — a bare "3" or "9" changes
 * for a hundred innocent reasons and would make this unusable.
 */
// Three digits, not two — a measured trade, not a guess. Replayed against the
// last 52 commits that touched HTML, a two-digit floor fired four times: twice
// on library/index.html (catalogue pages, whose per-locale item counts differ
// by design) and twice on bare date/version fragments like "27" and "18". At
// three digits, plus the catalogue exclusion below, that becomes zero false
// positives while still catching the incident this exists for (13047, 172848).
//
// The cost is real and stated: a one- or two-digit fact that changes — "12 to
// 15 characters" — does not trip this. Every value that has actually mattered
// on this site is larger: character counts, repertoire totals, message limits,
// code point counts. A gate with no false positives is one people act on; a
// noisy one is one they learn to skip.
const MIN_DIGITS = 3;
function numbersIn(text) {
  const plain = asciiDigits(String(text).replace(/<[^>]+>/g, ' '));
  const out = new Set();
  // A number is a leading run followed only by EXACT three-digit groups, each
  // introduced by a SINGLE separator character. Anchoring it this tightly is
  // what stops "May 26, 2026" being read as one number, 262026 — the first
  // draft of this function did exactly that, and a spurious token like that is
  // a false positive waiting to happen on any page that reorders a date.
  for (const m of plain.matchAll(/\d+(?:[.,\u00a0\u202f ]\d{3})*/g)) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length < MIN_DIGITS) continue;
    // Years are date components, not measured facts, and every locale writes
    // dates its own way — so a reordered date must never read as a changed
    // value. Excluding them is what keeps the signal (13047, 172848) from
    // being buried under "2026".
    if (/^(?:19|20)\d{2}$/.test(digits)) continue;
    out.add(digits);
  }
  return out;
}

/** slot name -> Set of canonical numbers appearing in that slot type. */
function slotNumbers(html) {
  const map = new Map();
  for (const [slot, patterns] of Object.entries(SLOTS)) {
    const set = new Set();
    for (const re of patterns) {
      for (const m of String(html).matchAll(re)) {
        for (const n of numbersIn(m[1])) set.add(n);
      }
    }
    map.set(slot, set);
  }
  return map;
}

/**
 * Value substitutions between two versions of one page: per slot, the numbers
 * that disappeared, but ONLY where something also appeared. Returns
 * Map<slot, {dropped:Set, added:Set}> with entries only for real swaps.
 */
function substitutions(baseHtml, headHtml) {
  const a = slotNumbers(baseHtml);
  const b = slotNumbers(headHtml);
  const out = new Map();
  for (const slot of a.keys()) {
    const before = a.get(slot), after = b.get(slot);
    const dropped = new Set([...before].filter((n) => !after.has(n)));
    const added = new Set([...after].filter((n) => !before.has(n)));
    if (dropped.size && added.size) out.set(slot, { dropped, added });
  }
  return out;
}

/** Which of `dropped` a sibling still carries in the SAME slot type. */
function staleIn(siblingHtml, slot, dropped) {
  const have = slotNumbers(siblingHtml).get(slot) || new Set();
  return [...dropped].filter((n) => have.has(n));
}

module.exports = { slotNumbers, numbersIn, substitutions, staleIn, SLOTS, MIN_DIGITS };
