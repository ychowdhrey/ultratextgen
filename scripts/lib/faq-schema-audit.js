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
 */

const cheerio = require('cheerio');

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

module.exports = {
  auditHtml,
  extractSchemaQuestions,
  extractVisibleText,
  normalizeText,
  normalizeQuestion,
  ANSWER_OVERLAP_THRESHOLD
};
