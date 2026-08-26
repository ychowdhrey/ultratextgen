#!/usr/bin/env node
'use strict';

/**
 * seo-snapshot.js
 *
 * The SEO Preservation Gate: a page-level snapshot of everything an editorial
 * edit must not silently destroy, and the comparison between two snapshots.
 *
 * DELIBERATELY SEPARATE FROM THE EDITORIAL SCORE, and never averaged into it.
 * They answer different questions and have different failure costs. A lower
 * Editorial Footprint Risk score bought by dropping the page's primary query
 * language is a loss, not an improvement, and a blended number would hide the
 * trade rather than surface it.
 *
 * -- What it protects, and why these fields ---------------------------------
 * Google states its systems "can understand synonyms and general meanings of
 * what someone is seeking, in order to connect them with content that might not
 * use the same precise words". Read carefully, that lowers the risk of
 * rewording INCIDENTAL prose and leaves the risk on PRIMARY content intact. So
 * the split this file enforces is:
 *
 *   PROTECTED  - title, H1, canonical, robots, hreflang, primary query terms,
 *                entity names, Unicode terminology, concrete examples, internal
 *                links and their anchor text, FAQ questions, structured data.
 *   NEGOTIABLE - introductions, transitions, benefit claims, CTA phrasing,
 *                closing paragraphs. These carry the footprint and almost none
 *                of the relevance.
 *
 * -- The default when performance data is missing ---------------------------
 * Ranking sensitivity is `unknown` unless an overlay is supplied. `unknown` is
 * the CONSERVATIVE class, never a licence: with no evidence that a page does not
 * rank, broad rewriting is not justified. Performance data is never fabricated
 * and never lives in this repository - see docs/editorial-footprint-risk.md.
 */

const { extractPage, joinSlots, words } = require('./editorial-corpus');

/**
 * Terms whose removal is a relevance loss regardless of what a style score
 * says. Harvested from the phrase bank's `search_protected` class so the two
 * cannot disagree about what is protected.
 */
function protectedTerms(bank) {
  return bank.entries
    .filter((e) => e.category === 'search_protected')
    .map((e) => ({
      id: e.id,
      rx: e.matchType === 'regex' ? new RegExp(e.pattern, 'gi') : null,
      literal: e.matchType === 'literal' ? e.pattern : null,
      language: e.language
    }));
}

function termSet(text, terms, locale) {
  const found = new Set();
  for (const t of terms) {
    if (t.language !== '*' && t.language !== locale) continue;
    if (t.rx) {
      t.rx.lastIndex = 0;
      for (const m of text.match(t.rx) || []) found.add(m.toLowerCase());
    } else if (t.literal && text.includes(t.literal)) {
      found.add(t.literal.toLowerCase());
    }
  }
  return found;
}

/**
 * Concrete examples: literal payloads a reader copies or a fact cites. Losing
 * one is losing information, which is the opposite of what this system asks for.
 */
function exampleSet(page) {
  const out = new Set();
  for (const t of joinSlots(page, ['technical'])) out.add(t.trim());
  for (const t of joinSlots(page, ['ui'])) if (t.length <= 60) out.add(t.trim());
  return out;
}

/** Codepoints, versions, alt codes and limits stated anywhere on the page. */
function factSet(text) {
  const out = new Set();
  for (const rx of [
    /U\+[0-9A-Fa-f]{4,6}/g,
    /\bUnicode\s+\d+(?:\.\d+)?\b/gi,
    /\bAlt\s*\+?\s*\d{3,5}\b/gi,
    /\b\d{1,5}\s*(?:characters?|chars?|bytes?|codepoints?)\b/gi
  ]) for (const m of text.match(rx) || []) out.add(m.toLowerCase());
  return out;
}

/**
 * Build the snapshot. `html` may be a raw string (a git blob) or an already
 * extracted page, so the gate can snapshot both sides of a diff without
 * re-reading the tree.
 */
function snapshot(htmlOrPage, rel, bank) {
  const page = typeof htmlOrPage === 'string' ? extractPage(htmlOrPage, rel) : htmlOrPage;
  if (!page) return null;

  const terms = protectedTerms(bank);
  const editorial = [
    ...page.slots.title, ...page.slots.metaDescription, ...page.slots.h1,
    ...page.slots.headings, ...page.slots.prose, ...page.slots.faqQuestions,
    ...page.slots.faqAnswers, ...page.slots.cta
  ].join(' ');

  return {
    rel: page.rel,
    locale: page.locale,
    family: page.family,
    canonical: page.canonical,
    robots: page.robots,
    indexable: page.indexable,
    title: page.slots.title[0] || null,
    h1: page.slots.h1[0] || null,
    metaDescription: page.slots.metaDescription[0] || null,
    headings: page.slots.headings.slice(),
    faqQuestions: page.slots.faqQuestions.slice(),
    hreflang: page.hreflang.map((h) => `${h.lang}|${h.href}`).sort(),
    links: page.links.map((l) => l.href).sort(),
    anchors: page.links.map((l) => `${l.href}|${l.text}`).sort(),
    protectedTerms: [...termSet(editorial, terms, page.locale)].sort(),
    facts: [...factSet(`${editorial} ${joinSlots(page, ['technical']).join(' ')}`)].sort(),
    examples: [...exampleSet(page)].sort(),
    wordCount: words(editorial).length
  };
}

const setDiff = (a, b) => a.filter((x) => !b.includes(x));

/**
 * Compare two snapshots and return the violations an editorial edit introduced.
 *
 * Severity is fixed here, not by the caller, so the audit and the gate cannot
 * disagree about what counts as a blocking loss.
 */
function compare(before, after, opts = {}) {
  const findings = [];
  const add = (severity, rule, detail) => findings.push({ severity, rule, detail });

  if (!before || !after) return findings;

  // Identity fields: never changed to lower a style score.
  for (const [field, rule] of [
    ['canonical', 'canonical-changed'],
    ['title', 'title-changed'],
    ['h1', 'h1-changed'],
    ['robots', 'robots-changed']
  ]) {
    if ((before[field] || null) !== (after[field] || null)) {
      add('error', rule, `${field}: "${before[field] || '(none)'}" -> "${after[field] || '(none)'}"`);
    }
  }

  if (before.indexable && !after.indexable) {
    add('error', 'deindexed', 'page became noindex');
  }

  const lostHreflang = setDiff(before.hreflang, after.hreflang);
  if (lostHreflang.length) {
    add('error', 'hreflang-lost', `${lostHreflang.length} alternate(s) removed: ${lostHreflang.slice(0, 4).join(', ')}`);
  }

  const lostTerms = setDiff(before.protectedTerms, after.protectedTerms);
  if (lostTerms.length) {
    add('error', 'protected-term-lost',
      `search-protected language removed: ${lostTerms.slice(0, 6).join(', ')}` +
      `${lostTerms.length > 6 ? ` (+${lostTerms.length - 6})` : ''}`);
  }

  const lostFacts = setDiff(before.facts, after.facts);
  if (lostFacts.length) {
    add('error', 'concrete-fact-lost',
      `codepoint/limit/version removed: ${lostFacts.slice(0, 6).join(', ')}` +
      `${lostFacts.length > 6 ? ` (+${lostFacts.length - 6})` : ''}`);
  }

  const lostLinks = setDiff(before.links, after.links);
  if (lostLinks.length) {
    add('error', 'internal-link-lost',
      `${lostLinks.length} internal link(s) removed: ${lostLinks.slice(0, 4).join(', ')}`);
  }

  // Anchor text moving while the href stays is a relevance change, not a
  // structural one - warning, because a genuine rewording is legitimate.
  const beforeHrefs = new Set(before.links);
  const anchorChanged = after.anchors.filter((a) => {
    const href = a.split('|')[0];
    return beforeHrefs.has(href) && !before.anchors.includes(a);
  });
  if (anchorChanged.length) {
    add('warning', 'anchor-text-changed',
      `${anchorChanged.length} anchor(s) reworded on links that still exist`);
  }

  const lostQuestions = setDiff(before.faqQuestions, after.faqQuestions);
  if (lostQuestions.length) {
    add('warning', 'faq-question-changed',
      `${lostQuestions.length} FAQ question(s) changed or removed - check the JSON-LD still matches`);
  }

  const lostExamples = setDiff(before.examples, after.examples);
  if (lostExamples.length) {
    add('warning', 'example-removed', `${lostExamples.length} concrete example/payload removed`);
  }

  const lostHeadings = setDiff(before.headings, after.headings);
  if (lostHeadings.length > (opts.headingTolerance || 0)) {
    add('warning', 'heading-changed', `${lostHeadings.length} heading(s) changed or removed`);
  }

  // A large drop in body length is a depth loss even when nothing named above
  // was touched. 25% is deliberately loose: trimming filler is the point.
  if (before.wordCount >= 200 && after.wordCount < before.wordCount * 0.75) {
    add('warning', 'depth-reduced',
      `body shrank ${before.wordCount} -> ${after.wordCount} words (${Math.round(100 * (1 - after.wordCount / before.wordCount))}%)`);
  }

  return findings;
}

/**
 * The posture the gate applies given a page's ranking sensitivity.
 * `unknown` is conservative by design.
 */
function posture(sensitivity) {
  switch (sensitivity) {
    case 'protected':
      return { allowBroadRewrite: false, note: 'ranks or draws traffic - recommendations only, no broad rewriting' };
    case 'observed':
      return { allowBroadRewrite: false, note: 'some performance evidence - conservative changes only' };
    case 'candidate':
      return { allowBroadRewrite: true, note: 'editorial risk plus evidence that improvement is justified' };
    default:
      return { allowBroadRewrite: false, note: 'no reliable performance data - act conservatively; this is not a claim the page is worthless' };
  }
}

module.exports = { snapshot, compare, posture, protectedTerms, factSet, exampleSet };
