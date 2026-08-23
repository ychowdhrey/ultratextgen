'use strict';

/**
 * faq-schema-audit.js — shared FAQ-schema/visible-content logic.
 *
 * Google's structured-data policy requires FAQPage (and QAPage) markup to
 * mirror content that is actually visible on the page. A page that ships a
 * FAQPage block whose questions appear nowhere in the rendered body is
 * claiming content it does not have — that costs the rich result and is
 * spammy-structured-markup territory for a manual action.
 *
 * Two consumers share this module so the whole-site audit
 * (scripts/audit-faq-schema.js) and the diff-scoped PR gate
 * (scripts/check-faq-schema.js) can never disagree about what "visible"
 * means:
 *
 *   auditHtml(html) -> {
 *     hasFaqSchema, totalQuestions, visibleQuestions, missingQuestions[],
 *     answersMissing[], status
 *   }
 *
 * status is one of:
 *   'no-faq-schema'   — nothing to check
 *   'ok'              — every schema question is visible on the page
 *   'partial'         — some questions visible, some not (usually stale schema)
 *   'no-visible-faq'  — zero questions visible (the headline violation)
 *
 * ── "in the DOM" is not the same as "visible" (added 2026-08-13) ──────────
 *
 * `extractVisibleText` reads the document's text. It has no model of CSS, and
 * that was a real blind spot: style.css sets
 *
 *     .faq-answer { display: none }
 *
 * and reveals it only via `.faq-item.open` — which some JS has to add — or via
 * `details[open]`, which the browser handles natively. So a page using the
 * *button* variant
 *
 *     <div class="faq-item"><button class="faq-question">Q</button>
 *       <div class="faq-answer">A</div></div>
 *
 * with nothing on the page binding a click handler renders its answers
 * **never**, while `auditHtml` reported it 'ok' because the text was in the
 * DOM. 63 live pages were in exactly that state, shipping 298 schema questions
 * for 298 answers no reader could open.
 *
 * `unboundFaqItems()` closes it. Three things count as a binder, and all three
 * are in live use — checking only the first is what produced a 20× overcount
 * the first time this was measured:
 *
 *   1. `/script.js` (the global accordion handler)
 *   2. an inline `document.querySelectorAll('.faq-question')` block
 *   3. a page-local JS file that binds it (upside-down.js, comment-font.js, …)
 *
 * Script `src` values are resolved relative to the page before comparison —
 * `category/upside-down-text/` references its binder relatively and is
 * otherwise a false positive.
 *
 * The `<details>` variant needs no binder and is always visible, which is why
 * CLAUDE.md prescribes it for pages that do not load /script.js.
 */

const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

/* ───────────────────────── text normalization ───────────────────────── */

/**
 * Fold the cosmetic differences that separate a JSON-LD string from the same
 * sentence rendered in HTML: smart quotes, dash variants, non-breaking and
 * collapsed whitespace, case.
 */
function normalizeText(input) {
  return String(input == null ? '' : input)
    .replace(/[‘’ʼ‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/[–—−‒]/g, '-')
    .replace(/[       ]/g, ' ')
    .replace(/[​‌‍﻿]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

/** Questions differ harmlessly in trailing punctuation between schema and heading. */
function normalizeQuestion(input) {
  return normalizeText(input).replace(/[?!.:,;؟。？]+$/, '').trim();
}

/* ───────────────────────── JSON-LD extraction ───────────────────────── */

const FAQ_TYPES = new Set(['FAQPage', 'QAPage']);

function typesOf(node) {
  const t = node && node['@type'];
  if (!t) return [];
  return Array.isArray(t) ? t : [t];
}

function answerTextOf(question) {
  let answer = question.acceptedAnswer;
  if (!answer && question.suggestedAnswer) {
    answer = Array.isArray(question.suggestedAnswer)
      ? question.suggestedAnswer[0]
      : question.suggestedAnswer;
  }
  if (!answer || typeof answer !== 'object') return '';
  return typeof answer.text === 'string' ? answer.text : '';
}

/**
 * Walk arbitrarily-nested JSON-LD (bare objects, top-level arrays, @graph)
 * and collect every Question hanging off an FAQPage/QAPage node.
 */
function collectQuestions(node, out, seen) {
  if (!node || typeof node !== 'object') return;
  if (seen.has(node)) return;
  seen.add(node);

  if (Array.isArray(node)) {
    for (const child of node) collectQuestions(child, out, seen);
    return;
  }

  if (node['@graph']) collectQuestions(node['@graph'], out, seen);

  if (typesOf(node).some((t) => FAQ_TYPES.has(t))) {
    const entity = node.mainEntity || node.mainEntityOfPage;
    const items = Array.isArray(entity) ? entity : entity ? [entity] : [];
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      if (!typesOf(item).includes('Question')) continue;
      out.push({
        question: typeof item.name === 'string' ? item.name : '',
        answer: answerTextOf(item)
      });
    }
  }
}

/** Every FAQ question declared by any JSON-LD block in the document. */
function extractSchemaQuestions($) {
  const questions = [];
  const seen = new WeakSet();
  $('script[type="application/ld+json"]').each((_i, el) => {
    const raw = $(el).contents().text();
    if (!raw || !raw.trim()) return;
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      return; // malformed JSON-LD is a separate problem; not this check's job
    }
    collectQuestions(data, questions, seen);
  });
  return questions;
}

/* ───────────────────────── visible text ───────────────────────── */

/**
 * What a reader (and a rendering crawler) actually sees. `<head>`, scripts,
 * styles and `<template>` content are not visible; `<noscript>` is dropped
 * too because its content only appears when JS is off, which is not the state
 * Google evaluates rich results in.
 */
function extractVisibleText($) {
  const $doc = cheerio.load($.html());
  $doc('head, script, style, noscript, template').remove();
  return normalizeText($doc.root().text());
}

/* ───────────────────────── the audit ───────────────────────── */

/**
 * Answer coverage is advisory only. Visible answers are routinely reworded,
 * split across paragraphs, or carry inline markup the plain-text schema
 * string flattens away, so requiring a verbatim match would flag hundreds of
 * legitimate pages. A token-overlap ratio catches the case that actually
 * matters: a schema answer with essentially no counterpart in the body.
 */
const ANSWER_OVERLAP_THRESHOLD = 0.5;

function answerCoverage(answer, visible) {
  const tokens = normalizeText(answer)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 3);
  if (tokens.length < 4) return 1; // too short to judge
  const unique = [...new Set(tokens)];
  const hits = unique.filter((t) => visible.includes(t)).length;
  return hits / unique.length;
}

/* ───────────── per-answer drift (the enforceable half) ───────────── */

/**
 * `answerCoverage` above asks "does this schema answer have *a* counterpart
 * somewhere in the body" — it searches the WHOLE page text and passes at 50%
 * token overlap. Two holes follow from that, and both are real:
 *
 *   1. Tokens matched anywhere on the page count, so a schema answer can
 *      claim a sentence the page never renders and still score high on words
 *      borrowed from unrelated sections.
 *   2. Adding content to the schema barely moves a ratio, so an appended
 *      sentence is invisible to it.
 *
 * A live case (2026-08-21): `updates/unicode-18-most-anticipated-emoji`
 * shipped a JSON-LD answer ending "See our Unicode 18.0 Release Date
 * Confirmed update for the full story." that its visible answer did not
 * contain. `answerCoverage` scored it far above threshold — and the gate
 * never read the result anyway.
 *
 * This pairs each schema answer with **its own** visible answer and reports
 * the content tokens the schema claims that that answer does not show. It is
 * deliberately a *count*, not a boolean: the whole-site backlog is ~920
 * paraphrase-drifted pairs across ~336 pages (measured 2026-08-21), so the
 * consumer gates on the DELTA against the merge base, never on the state —
 * the same reasoning `check-locale-translation.js` documents.
 */

/** Schema answers routinely embed markup (`<p>`, `<a href>`, `<strong>`). */
function stripSchemaHtml(input) {
  return String(input == null ? '' : input)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ');
}

function contentTokens(input) {
  return normalizeText(stripSchemaHtml(input))
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 3);
}

/**
 * Visible answer text keyed by normalized question.
 *
 * The answer is read as "everything in the .faq-item except the question",
 * not by selecting `.faq-answer`. That is not a stylistic choice: 21 pages
 * carry invalid nested markup (`<p class="faq-answer"><p>…</p></p>`), and
 * every HTML parser auto-closes the outer `<p>` at the inner one — leaving
 * `.faq-answer` an EMPTY element with the real text hoisted out as its
 * sibling. Selecting `.faq-answer` reports those 97 answers as blank and
 * scores them 100% drifted, which is how this function was first written
 * and why it is written this way now.
 */
function visibleAnswers($) {
  const map = new Map();
  $('.faq-item').each((_i, el) => {
    const $el = $(el);
    const $q = $el.find('.faq-question').first().clone();
    $q.find('svg').remove();
    const key = normalizeQuestion($q.text());
    if (!key || map.has(key)) return;
    const $rest = $el.clone();
    $rest.find('.faq-question').remove();
    $rest.find('svg').remove();
    map.set(key, $rest.text());
  });
  return map;
}

/**
 * @returns {Map<string,number>} normalized question -> count of content
 *   tokens the schema answer claims that its own visible answer omits.
 *   Questions with no visible counterpart are absent (that is
 *   `missingQuestions`' job, reported separately).
 */
function answerDrift(html) {
  const drift = new Map();
  if (!html || (!html.includes('FAQPage') && !html.includes('QAPage'))) return drift;
  const $ = cheerio.load(html);
  const schema = extractSchemaQuestions($);
  if (!schema.length) return drift;
  const visible = visibleAnswers($);
  for (const item of schema) {
    const key = normalizeQuestion(item.question);
    if (!key || !visible.has(key)) continue;
    const shown = new Set(contentTokens(visible.get(key)));
    const claimed = new Set(contentTokens(item.answer));
    let extra = 0;
    for (const t of claimed) if (!shown.has(t)) extra++;
    drift.set(key, extra);
  }
  return drift;
}

/**
 * Audit one HTML document.
 *
 * @param {string} html raw file contents
 * @returns {object} audit result (see module docblock for `status` values)
 */
function auditHtml(html) {
  const empty = {
    hasFaqSchema: false,
    totalQuestions: 0,
    visibleQuestions: 0,
    missingQuestions: [],
    answersMissing: [],
    status: 'no-faq-schema'
  };

  if (!html || (!html.includes('FAQPage') && !html.includes('QAPage'))) return empty;

  const $ = cheerio.load(html);
  const schemaQuestions = extractSchemaQuestions($);
  if (!schemaQuestions.length) return empty;

  const visible = extractVisibleText($);

  const missingQuestions = [];
  const answersMissing = [];
  let visibleCount = 0;

  for (const item of schemaQuestions) {
    const needle = normalizeQuestion(item.question);
    // A schema question with no `name` can never be mirrored on the page.
    if (!needle || !visible.includes(needle)) {
      missingQuestions.push(item.question);
      continue;
    }
    visibleCount++;
    if (answerCoverage(item.answer, visible) < ANSWER_OVERLAP_THRESHOLD) {
      answersMissing.push(item.question);
    }
  }

  let status = 'ok';
  if (visibleCount === 0) status = 'no-visible-faq';
  else if (missingQuestions.length > 0) status = 'partial';

  return {
    hasFaqSchema: true,
    totalQuestions: schemaQuestions.length,
    visibleQuestions: visibleCount,
    missingQuestions,
    answersMissing,
    status
  };
}

/* ──────────────── accordion binding (see the module docblock) ──────────── */

const INLINE_BINDER = /querySelectorAll\(\s*['"]\.faq-question/;
const GLOBAL_BINDER = 'script.js';

/**
 * Repo-relative paths of every local JS file that binds `.faq-question`.
 * Scanned once by the caller and passed in, so this module never walks the
 * tree per page. `scripts/` is excluded — those are build tools, not shipped.
 */
function findBinderScripts(rootDir) {
  const found = new Set();
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(rootDir, full).split(path.sep).join('/');
      if (entry.isDirectory()) {
        if (rel !== 'scripts') walk(full);
      } else if (entry.name.endsWith('.js')) {
        const src = fs.readFileSync(full, 'utf8');
        if (src.includes('faq-question') && /addEventListener|onclick/.test(src)) {
          found.add(rel);
        }
      }
    }
  })(rootDir);
  return found;
}

/**
 * Button-variant FAQ items on a page with nothing to open them.
 *
 * @param {string} html      raw file contents
 * @param {object} opts
 * @param {string} opts.pagePath       repo-relative path, for resolving relative src
 * @param {Set<string>} opts.binderScripts  from findBinderScripts()
 * @returns {number} count of permanently-hidden answers (0 when fine)
 */
function unboundFaqItems(html, { pagePath = '', binderScripts = new Set() } = {}) {
  const buttons = html.match(/<button[^>]*class=["']faq-question/g);
  if (!buttons) return 0;
  if (INLINE_BINDER.test(html)) return 0;

  const dir = path.posix.dirname(pagePath.split(path.sep).join('/'));
  for (const m of html.matchAll(/<script[^>]*\bsrc=["']([^"']+)["']/g)) {
    const src = m[1];
    if (/^https?:\/\//.test(src)) continue;
    const rel = src.startsWith('/')
      ? src.replace(/^\/+/, '')
      : path.posix.normalize(path.posix.join(dir, src));
    if (rel === GLOBAL_BINDER || binderScripts.has(rel)) return 0;
  }
  return buttons.length;
}

module.exports = {
  auditHtml,
  answerDrift,
  visibleAnswers,
  contentTokens,
  findBinderScripts,
  unboundFaqItems,
  extractSchemaQuestions,
  extractVisibleText,
  normalizeText,
  normalizeQuestion,
  ANSWER_OVERLAP_THRESHOLD
};
