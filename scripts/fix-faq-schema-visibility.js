#!/usr/bin/env node
'use strict';

/**
 * fix-faq-schema-visibility.js
 *
 * Repairs the mismatch scripts/audit-faq-schema.js reports: FAQPage/QAPage
 * JSON-LD that describes Q&A the page never shows. Two repairs, chosen per
 * page by whether the page already has a real, visible FAQ block:
 *
 *   RENDER  (page has no .faq-item markup at all)
 *           Insert a house-style FAQ section that renders every schema
 *           question and answer verbatim. Nothing is invented — the copy
 *           already exists, it was just never put on the page.
 *
 *   PRUNE   (page already renders a visible FAQ)
 *           Delete from the JSON-LD the questions with no visible
 *           counterpart — usually stale entries left behind when the visible
 *           FAQ was edited — then backfill from FAQ items the page really
 *           does render but the schema never claimed, up to the count it had
 *           before. The visible FAQ is the source of truth and is never
 *           touched; the schema ends up a strict subset of it, without the
 *           page silently losing rich-result coverage it had earned.
 *
 * The rendered markup is the site's JS-free disclosure variant
 * (`<details class="faq-item"><summary class="faq-question">`), already used
 * by 400+ pages and fully covered by style.css. It needs no accordion
 * binding, so it works identically on pages that load /script.js and pages
 * that don't — and can't double-bind with script.js's own .faq-question
 * handler.
 *
 * Section label + heading come from ATTESTED strings already used by that
 * locale's own pages (see LOCALE_FAQ_STRINGS) — not machine translation.
 *
 * Usage:
 *   node scripts/fix-faq-schema-visibility.js --dry-run    # report only
 *   node scripts/fix-faq-schema-visibility.js --write
 *   node scripts/fix-faq-schema-visibility.js --write path/to/index.html ...
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { globSync } = require('glob');
const {
  auditHtml,
  extractVisibleText,
  normalizeQuestion
} = require('./lib/faq-schema-audit');

const ROOT = path.resolve(__dirname, '..');

/**
 * `label` is the small kicker above the heading, `heading` the <h2>.
 * Every string here is lifted from FAQ sections that already ship in that
 * locale on this site — harvested from existing `<section id="faq">` blocks
 * rather than translated fresh, so a fixed page reads like its neighbours.
 * Locales absent from this map fall back to English.
 */
const LOCALE_FAQ_STRINGS = {
  en: { label: 'FAQ', heading: 'Frequently Asked Questions' },
  ar: { label: 'الأسئلة الشائعة', heading: 'أسئلة شائعة' },
  bs: { label: 'FAQ', heading: 'Česta pitanja' },
  cs: { label: 'FAQ', heading: 'Časté otázky' },
  da: { label: 'FAQ', heading: 'Ofte stillede spørgsmål' },
  de: { label: 'FAQ', heading: 'Häufige Fragen' },
  es: { label: 'FAQ', heading: 'Preguntas frecuentes' },
  fi: { label: 'FAQ', heading: 'Usein kysytyt kysymykset' },
  fr: { label: 'FAQ', heading: 'Questions fréquentes' },
  hi: { label: 'FAQ', heading: 'अक्सर पूछे जाने वाले प्रश्न' },
  hr: { label: 'FAQ', heading: 'Najčešća pitanja' },
  hu: { label: 'GYIK', heading: 'Gyakori kérdések' },
  id: { label: 'FAQ', heading: 'Pertanyaan yang Sering Ditanya' },
  it: { label: 'FAQ', heading: 'Domande frequenti' },
  ja: { label: 'FAQ', heading: 'よくある質問' },
  ko: { label: 'FAQ', heading: '자주 묻는 질문' },
  ms: { label: 'Soalan Lazim', heading: 'Soalan lazim' },
  nl: { label: 'FAQ', heading: 'Veelgestelde vragen' },
  no: { label: 'FAQ', heading: 'Ofte stilte spørsmål' },
  pl: { label: 'FAQ', heading: 'Najczęstsze pytania' },
  pt: { label: 'FAQ', heading: 'Perguntas frequentes' },
  ro: { label: 'FAQ', heading: 'Întrebări frecvente' },
  ru: { label: 'FAQ', heading: 'Частые вопросы' },
  sk: { label: 'FAQ', heading: 'Časté otázky' },
  sr: { label: 'FAQ', heading: 'Česta pitanja' },
  sv: { label: 'FAQ', heading: 'Vanliga frågor' },
  th: { label: 'FAQ', heading: 'คำถามที่พบบ่อย' },
  tr: { label: 'SSS', heading: 'Sık sorulan sorular' },
  vi: { label: 'Hỏi đáp', heading: 'Câu hỏi thường gặp' },
  'zh-tw': { label: '常見問題', heading: '常見問題' }
};

function localeOf(rel) {
  const first = rel.split('/')[0];
  return /^[a-z]{2}(-[a-z]{2})?$/.test(first) ? first : 'en';
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * A handful of JSON-LD answers were authored with raw markup inside them
 * (an <a href> in the Mother's Day / Valentine's Day pages, for instance) —
 * schema.org answer text is meant to be plain text, and escaping the tag
 * would print it at the reader. Flatten to plain text and write the flattened
 * form back into the JSON-LD too, so schema and page stay identical.
 */
function flattenAnswer(text) {
  if (!/<[a-z/][^>]*>/i.test(text)) return text;
  return cheerio
    .load(`<div>${text}</div>`)('div')
    .text()
    .replace(/\s+/g, ' ')
    .trim();
}

/* ───────────────────────── JSON-LD rewriting ───────────────────────── */

const FAQ_TYPES = new Set(['FAQPage', 'QAPage']);

function typesOf(node) {
  const t = node && node['@type'];
  if (!t) return [];
  return Array.isArray(t) ? t : [t];
}

/**
 * Walk a parsed JSON-LD document and hand every FAQPage/QAPage node to
 * `mutate`, which returns the questions it should keep.
 * Returns true if anything changed.
 */
function walkFaqNodes(node, mutate) {
  let changed = false;
  if (!node || typeof node !== 'object') return changed;

  if (Array.isArray(node)) {
    for (const child of node) changed = walkFaqNodes(child, mutate) || changed;
    return changed;
  }

  if (node['@graph']) changed = walkFaqNodes(node['@graph'], mutate) || changed;

  if (typesOf(node).some((t) => FAQ_TYPES.has(t))) {
    const key = node.mainEntity ? 'mainEntity' : node.mainEntityOfPage ? 'mainEntityOfPage' : null;
    if (key) {
      const before = node[key];
      const items = Array.isArray(before) ? before : [before];
      const kept = mutate(items.filter((q) => q && typeof q === 'object'));
      if (kept.length !== items.length || kept.some((q, i) => q !== items[i])) {
        node[key] = kept;
        changed = true;
      }
    }
  }
  return changed;
}

/** Rewrite every JSON-LD block in `html` via `mutate`; returns new html or null. */
function rewriteJsonLd(html, mutate) {
  const blockRe = /(<script[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi;
  let touched = false;

  const out = html.replace(blockRe, (whole, open, body, close) => {
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return whole; // malformed JSON-LD is audit-hreflang/other tooling's problem
    }
    if (!walkFaqNodes(data, mutate)) return whole;
    touched = true;
    // Match the indentation of the opening tag so the block sits naturally.
    return `${open}\n${JSON.stringify(data, null, 2)}\n${close}`;
  });

  return touched ? out : null;
}

/* ───────────────────────── visible FAQ items ───────────────────────── */

/**
 * The Q&A the page actually renders, in document order. Covers both house
 * variants: `<div class="faq-item"><button class="faq-question">` and the
 * JS-free `<details class="faq-item"><summary class="faq-question">`.
 */
function visibleFaqItems($) {
  const items = [];
  $('.faq-item').each((_i, el) => {
    const $el = $(el);
    const $q = $el.find('.faq-question').first();
    const $a = $el.find('.faq-answer').first();
    if (!$q.length || !$a.length) return;
    const qClone = $q.clone();
    qClone.find('svg').remove();
    const question = qClone.text().replace(/\s+/g, ' ').trim();
    const answer = $a.text().replace(/\s+/g, ' ').trim();
    if (question && answer) items.push({ question, answer });
  });
  return items;
}

/* ───────────────────────── RENDER ───────────────────────── */

function buildFaqSection(questions, locale, useId) {
  const strings = LOCALE_FAQ_STRINGS[locale] || LOCALE_FAQ_STRINGS.en;
  const items = questions
    .map(
      (q) =>
        `  <details class="faq-item">\n` +
        `    <summary class="faq-question">${escapeHtml(q.question)}</summary>\n` +
        `    <p class="faq-answer">${escapeHtml(q.answer)}</p>\n` +
        `  </details>`
    )
    .join('\n');

  return (
    `<!-- FAQ -->\n` +
    `<section class="editorial-section"${useId ? ' id="faq"' : ''}>\n` +
    `  <span class="article-section-label">${escapeHtml(strings.label)}</span>\n` +
    `  <h2>${escapeHtml(strings.heading)}</h2>\n` +
    `${items}\n` +
    `</section>\n`
  );
}

/**
 * The offset where a page's visible content stops — i.e. `</body>` walked
 * back past the trailing run of `<script>`, `<noscript>` and comments that
 * every page on this site ends with.
 */
function endOfContentIndex(html) {
  const bodyIdx = html.lastIndexOf('</body>');
  let cut = bodyIdx === -1 ? html.length : bodyIdx;
  // Peel one trailing element at a time, matching each closer back to its own
  // opener. A single regex can't do this: unanchored at the start, it happily
  // matches from the document's FIRST <script> to its last </script> and eats
  // the whole page.
  const CLOSERS = [
    ['</script>', '<script'],
    ['</noscript>', '<noscript'],
    ['-->', '<!--']
  ];
  for (;;) {
    const before = html.slice(0, cut).replace(/\s+$/, '');
    const hit = CLOSERS.find(([close]) => before.endsWith(close));
    if (!hit) return before.length;
    const open = before.lastIndexOf(hit[1]);
    if (open === -1) return before.length;
    cut = open;
  }
}

/**
 * Where the section goes: last thing before the footer if the page has a
 * static one, otherwise last thing before the closing scripts. Never after
 * `</footer>` — an FAQ rendering below the site footer is a separate defect
 * this repo has already had to fix.
 *
 * `</main>` is deliberately NOT the first choice. On this site `<main>`
 * frequently wraps only the generator widget, with the page's editorial
 * sections following it, so inserting before `</main>` would drop the FAQ
 * above the body content instead of after it. It is used only when nothing
 * but whitespace separates `</main>` from the end of the content.
 */
function insertSection(html, section, useDivider) {
  const block = (useDivider ? '<div class="section-divider"></div>\n\n' : '') + section + '\n';

  let cut;
  const footerMatch = /<footer[^>]*class=["'][^"']*\bfooter\b/i.exec(html);
  if (footerMatch) {
    cut = footerMatch.index;
    // Keep any "<!-- FOOTER -->"-style comment attached to the footer below us.
    const trailingComment = /<!--[^>]*-->\s*$/.exec(html.slice(0, cut));
    if (trailingComment) cut = trailingComment.index;
  } else {
    cut = endOfContentIndex(html);
    // Everything really is inside <main> — stay inside it.
    const mainClose = html.lastIndexOf('</main>');
    if (mainClose !== -1 && !html.slice(mainClose + '</main>'.length, cut).trim()) {
      cut = mainClose;
    }
  }

  return html.slice(0, cut) + block + html.slice(cut);
}

/* ───────────────────────── per-file repair ───────────────────────── */

function repairFile(rel) {
  const filePath = path.join(ROOT, rel);
  let html = fs.readFileSync(filePath, 'utf8');
  const audit = auditHtml(html);
  if (!audit.hasFaqSchema || audit.status === 'ok') return null;

  const $ = cheerio.load(html);
  const hasVisibleFaqBlock = $('.faq-item, .faq-question').length > 0;

  if (hasVisibleFaqBlock) {
    // PRUNE — the visible FAQ wins; drop schema entries it doesn't back, then
    // top the block back up from FAQ items the page renders but never
    // declared, so a page doesn't lose eligible Q&A just because some of its
    // schema had gone stale.
    const visible = extractVisibleText($);
    const onPage = visibleFaqItems($);
    const detail = [];
    const next = rewriteJsonLd(html, (items) => {
      const kept = items.filter((q) => {
        if (!typesOf(q).includes('Question')) return true;
        const needle = normalizeQuestion(q.name || '');
        if (needle && visible.includes(needle)) return true;
        detail.push(`− ${q.name || '(unnamed question)'}`);
        return false;
      });

      const shortfall = items.length - kept.length;
      if (shortfall > 0) {
        const claimed = new Set(kept.map((q) => normalizeQuestion(q.name || '')));
        for (const item of onPage) {
          if (kept.length >= items.length) break;
          if (claimed.has(normalizeQuestion(item.question))) continue;
          claimed.add(normalizeQuestion(item.question));
          kept.push({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer }
          });
          detail.push(`+ ${item.question}`);
        }
      }
      return kept;
    });
    if (!next) return null;
    return { rel, mode: 'prune', html: next, detail };
  }

  // RENDER — no FAQ on the page at all; put the schema's own Q&A on it.
  const questions = [];
  const flattened = new Map();
  rewriteJsonLd(html, (items) => {
    for (const q of items) {
      if (!typesOf(q).includes('Question')) continue;
      const answerNode = q.acceptedAnswer || q.suggestedAnswer;
      const answer = answerNode && typeof answerNode === 'object' ? answerNode.text || '' : '';
      const plain = flattenAnswer(answer);
      if (plain !== answer) flattened.set(q.name, plain);
      questions.push({ question: q.name || '', answer: plain });
    }
    return items;
  });

  const usable = questions.filter((q) => q.question && q.answer);
  if (!usable.length) return null;

  // If any answer carried markup, rewrite the JSON-LD to the flattened text
  // so the schema string and the rendered string are byte-identical.
  if (flattened.size) {
    const next = rewriteJsonLd(html, (items) => {
      for (const q of items) {
        if (!flattened.has(q.name)) continue;
        const answerNode = q.acceptedAnswer || q.suggestedAnswer;
        if (answerNode && typeof answerNode === 'object') answerNode.text = flattened.get(q.name);
      }
      return items;
    });
    if (next) html = next;
  }

  const section = buildFaqSection(usable, localeOf(rel), !/id=["']faq["']/.test(html));
  return {
    rel,
    mode: 'render',
    html: insertSection(html, section, html.includes('section-divider')),
    detail: usable.map((q) => q.question)
  };
}

/* ───────────────────────── entry point ───────────────────────── */

function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const verbose = args.includes('--verbose');
  const explicit = args.filter((a) => !a.startsWith('--'));

  const files = explicit.length
    ? explicit.map((f) => path.relative(ROOT, path.resolve(f)))
    : globSync('**/*.html', { cwd: ROOT, ignore: ['node_modules/**', 'reports/**'] }).sort();

  const results = [];
  for (const rel of files) {
    if (!fs.existsSync(path.join(ROOT, rel))) continue;
    const repair = repairFile(rel);
    if (repair) results.push(repair);
  }

  const rendered = results.filter((r) => r.mode === 'render');
  const pruned = results.filter((r) => r.mode === 'prune');

  console.log('FAQ schema visibility fixer');
  console.log(`  pages scanned            : ${files.length}`);
  console.log(`  FAQ section rendered     : ${rendered.length}`);
  console.log(`  stale schema Qs pruned   : ${pruned.length} pages, ` +
    `${pruned.reduce((n, r) => n + r.detail.length, 0)} questions`);
  console.log(`  mode                     : ${write ? 'WRITE' : 'dry run (pass --write to apply)'}`);

  if (verbose) {
    for (const r of results) {
      console.log(`\n  ${r.mode.toUpperCase()} ${r.rel}`);
      for (const d of r.detail) console.log(`      · ${d}`);
    }
  }

  if (write) {
    for (const r of results) fs.writeFileSync(path.join(ROOT, r.rel), r.html);
    console.log(`\nWrote ${results.length} files.`);
  }
}

main();
