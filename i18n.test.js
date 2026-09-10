#!/usr/bin/env node
'use strict';

/**
 * i18n.test.js
 *
 * Run: node i18n.test.js        (npm run test:i18n-faq-schema)
 *
 * Zero dependencies, no framework — the same idiom as header.test.js,
 * js/counter/counterRules.test.js and scripts/lib/generator_parity.test.js.
 *
 * WHAT IT COVERS, AND WHY IT EXISTS
 * ---------------------------------
 * i18n.js rewrites a page's FAQPage JSON-LD from the locale JSON it fetches.
 * The FAQ in a locale JSON is the HOMEPAGE's FAQ, and only a homepage renders
 * it — so on any other page that rewrite substitutes questions the page never
 * shows. That is invisible-content FAQ markup, which forfeits the rich result
 * and is the shape Google treats as spammy structured markup.
 *
 * It was live, not hypothetical: 11 locale zalgo pages load i18n.js, carry
 * their own 6-question FAQPage schema, and had it replaced at runtime by the
 * homepage's 21 questions — overlap ZERO. check-faq-schema.js could not see it
 * because that gate reads the STATIC html while the substitution happens in the
 * renderer, which is this repo's recurring lesson that a check reporting
 * nothing is indistinguishable from a check that passes.
 *
 * So the guard is load-bearing and easy to delete by accident, and this pins
 * it. i18n.js is an IIFE that touches `document` at boot and cannot be
 * required, so the function is SLICED out of the live file and driven against
 * a DOM stub — the same technique scripts/lib/zalgo-engine.js uses, for the
 * same reason: a reimplementation here would drift from the shipped code.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, 'i18n.js'), 'utf8');

const BEGIN = '  // Selector for the elements that RENDER';
const END = '  function markActiveLang(';
const a = SRC.indexOf(BEGIN);
const b = SRC.indexOf(END, a);
if (a === -1 || b === -1) {
  throw new Error(
    'could not slice updateFAQSchema() out of i18n.js — if it was refactored, ' +
    'move the slice markers with it. Do NOT reimplement the function here.'
  );
}
const BODY = SRC.slice(a, b);

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

/**
 * Build a minimal document stub carrying one FAQPage JSON-LD block.
 * `rendersLocaleFaq` decides whether querySelector(FAQ_RENDER_SELECTOR) hits,
 * i.e. whether this page is a homepage that actually shows the locale FAQ.
 */
function harness(rendersLocaleFaq, pageQuestions) {
  const script = {
    textContent: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: pageQuestions.map((q) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: 'a' }
      }))
    })
  };
  let selectorAsked = null;
  const document = {
    querySelector(sel) {
      selectorAsked = sel;
      return rendersLocaleFaq ? {} : null;
    },
    querySelectorAll(sel) {
      return sel.includes('ld+json') ? [script] : [];
    }
  };
  const sandbox = { document, JSON };
  vm.createContext(sandbox);
  new vm.Script(`${BODY}\nglobalThis.__run = updateFAQSchema;\nglobalThis.__sel = FAQ_RENDER_SELECTOR;`,
    { filename: 'i18n.js#updateFAQSchema' }).runInContext(sandbox);
  return {
    run: (localeJson) => sandbox.__run(localeJson),
    selector: () => sandbox.__sel,
    questions: () => JSON.parse(script.textContent).mainEntity.map((e) => e.name),
    raw: () => script.textContent,
    selectorAsked: () => selectorAsked
  };
}

// The real shape: a locale JSON whose faq.categories is the HOMEPAGE FAQ.
const HOMEPAGE_LOCALE_JSON = {
  faq: {
    categories: [
      { title: 'Basics', items: [
        { question: "C'est quoi UltraTextGen, concrètement ?", answer: '<p>x</p>' },
        { question: 'Est-ce que tout est gratuit ?', answer: '<p>y</p>' }
      ] }
    ]
  }
};
const PAGE_QUESTIONS = [
  "Qu'est-ce que le texte Zalgo ?",
  'Comment fonctionne le texte Zalgo ?'
];

// ── the regression this shipped to fix ────────────────────────────────────
t('a NON-homepage keeps its own FAQ schema (the live 11-page bug)', () => {
  const h = harness(false, PAGE_QUESTIONS);
  const before = h.raw();
  h.run(HOMEPAGE_LOCALE_JSON);
  if (h.raw() !== before) {
    throw new Error(
      `schema was rewritten on a page that does not render the locale FAQ.\n` +
      `         now: ${JSON.stringify(h.questions())}`
    );
  }
});

t('the guard asks for the FAQ render hook, not something incidental', () => {
  const h = harness(false, PAGE_QUESTIONS);
  h.run(HOMEPAGE_LOCALE_JSON);
  const asked = h.selectorAsked();
  if (!asked || !asked.includes('faq.')) {
    throw new Error(`guard queried ${JSON.stringify(asked)}, which does not scope to faq.* bindings`);
  }
  if (asked !== h.selector()) {
    throw new Error('guard did not use FAQ_RENDER_SELECTOR — the test and the code have diverged');
  }
});

// ── the behaviour that must be preserved ──────────────────────────────────
t('a homepage DOES get its FAQ schema localised', () => {
  const h = harness(true, PAGE_QUESTIONS);
  h.run(HOMEPAGE_LOCALE_JSON);
  const qs = h.questions();
  if (qs.length !== 2 || qs[0] !== "C'est quoi UltraTextGen, concrètement ?") {
    throw new Error(`homepage schema was not localised — got ${JSON.stringify(qs)}`);
  }
});

t('answers are flattened to plain text for schema.org', () => {
  const h = harness(true, PAGE_QUESTIONS);
  h.run({ faq: { categories: [{ items: [{ question: 'Q', answer: '<p>hello <b>there</b></p>' }] }] } });
  const text = JSON.parse(h.raw()).mainEntity[0].acceptedAnswer.text;
  if (text !== 'hello there') throw new Error(`expected "hello there", got ${JSON.stringify(text)}`);
});

// ── safety ────────────────────────────────────────────────────────────────
t('a locale JSON with no FAQ never touches the schema', () => {
  const h = harness(true, PAGE_QUESTIONS);
  const before = h.raw();
  h.run({ ui: { copy: 'Copier' } });
  if (h.raw() !== before) throw new Error('schema changed with no faq.categories in the locale JSON');
});

t('an unparseable JSON-LD block is left alone rather than throwing', () => {
  const h = harness(true, PAGE_QUESTIONS);
  h.run({ faq: { categories: [{ items: [{ question: 'Q' }] }] } }); // item lacks an answer
  const qs = h.questions();
  if (qs.length !== 0) throw new Error(`an item without an answer must be skipped, got ${JSON.stringify(qs)}`);
});

// ── the site-level invariant the guard rests on ───────────────────────────
t('every page in the tree that binds faq.* is a homepage', () => {
  const bound = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) {
        if (/data-i18n(-html)?="faq\./.test(fs.readFileSync(p, 'utf8'))) {
          bound.push(path.relative(__dirname, p));
        }
      }
    }
  })(__dirname);
  if (!bound.length) throw new Error('no page binds faq.* at all — the scan is broken, not the site');
  const deep = bound.filter((f) => f.split('/').length > 2);
  if (deep.length) {
    throw new Error(
      `${deep.length} non-homepage page(s) now render the locale FAQ:\n         ` +
      deep.slice(0, 8).join('\n         ') +
      '\n         The guard in i18n.js assumes only homepages do. Re-check it before shipping these.'
    );
  }
});

console.log('i18n.js — FAQ schema localisation guard\n');
LINES.forEach((l) => console.log(l));
console.log(`\n${PASS} passed, ${FAIL} failed`);

process.exit(FAIL ? 1 : 0);
