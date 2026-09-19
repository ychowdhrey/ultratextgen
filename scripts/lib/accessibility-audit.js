'use strict';

/**
 * accessibility-audit.js
 *
 * The one definition of "accessibility defect" for this repo, shared by
 * scripts/audit-accessibility.js (whole-site dashboard, informational) and
 * scripts/check-accessibility.js (diff-scoped PR gate) — so the audit and the
 * gate can never disagree about what a defect is, the same reason
 * scripts/lib/faq-schema-audit.js and scripts/lib/numeric-parity.js exist.
 *
 * WHY THE RULES ARE SPLIT INTO TWO STRENGTHS
 * ------------------------------------------
 * This repo's standing rule is that a check with a real backlog must inform
 * rather than gate, because a check that is red regardless of your change is
 * one people learn to ignore (see CLAUDE.md on check:images vs
 * check:new-page-images). Measured across all 4,647 pages on 2026-09-05:
 *
 *   BLOCKING classes — every one of them stands at ZERO today, so they gate
 *   with no backlog to be permanently red against, the same call as
 *   check:zalgo-decodes. The site's baseline here is genuinely strong; these
 *   rules keep it that way rather than paying down debt.
 *
 *   ADVISORY classes — heading-level skips stand at 909 pages, and every one
 *   is the same design-system decision rather than an oversight: a
 *   `.compare-card` titles itself with <h4> inside a section headed <h2>.
 *   Restructuring 899 pages' card markup is a design-system call for the
 *   owner, not something a validator should force, so it is reported and
 *   never billed.
 *
 * WHAT COUNTS AS A PAGE
 * ---------------------
 * A file with an <html> element. Two tracked .html files are not pages — the
 * Naver verification token and scripts/data/funding-choices-tag.html, a
 * script fragment — and both would otherwise report as missing a lang, an h1
 * and a title. The filter is structural rather than a hardcoded skip list, so
 * a fragment added later is excluded automatically and a real page added
 * later is included automatically.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve(__dirname, '..', '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'assets']);

/** Rules that fail a PR. Each stands at zero across the site. */
const BLOCKING = new Set([
  'duplicate-id',
  'multiple-main',
  'img-no-alt',
  'control-no-name',
  'input-no-label',
  'empty-href',
  'iframe-no-title',
  'no-h1',
  'multiple-h1',
  'missing-lang',
  'positive-tabindex'
]);

/** Rules that are reported and never billed. */
const ADVISORY = new Set(['heading-skip']);

const RULE_HELP = {
  'duplicate-id': 'ids must be unique: JS binds the first match and the rest are dead, and assistive tech cannot disambiguate them',
  'multiple-main': 'a document has exactly one main landmark',
  'img-no-alt': 'every <img> needs an alt attribute (alt="" for decorative)',
  'control-no-name': 'a button or link needs text, aria-label, aria-labelledby, title, or an alt on an image inside it',
  'input-no-label': 'a form control needs a <label for>, a wrapping <label>, aria-label, aria-labelledby, title or placeholder',
  'empty-href': 'an <a> with no href is not focusable or announced as a link',
  'iframe-no-title': 'an <iframe> needs a title so it is announced as something rather than "frame"',
  'no-h1': 'a page needs one h1 naming what it is',
  'multiple-h1': 'more than one h1 makes the page outline ambiguous',
  'missing-lang': '<html lang> drives screen-reader pronunciation and is the basis of the locale mesh',
  'positive-tabindex': 'a positive tabindex overrides document order and breaks keyboard flow',
  'heading-skip': 'heading levels should not skip (h2 -> h4); on this site these are .compare-card titles'
};

function listPages(root = ROOT) {
  const out = [];
  (function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (SKIP_DIRS.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) out.push(p);
    }
  })(root);
  return out.sort();
}

/** A page is a file with an <html> element; everything else is a fragment. */
function isPage(html) {
  return /<html[\s>]/i.test(html);
}

function accessibleName($, el) {
  const n = $(el);
  const text = (n.text() || '').trim();
  if (text) return text;
  for (const attr of ['aria-label', 'title', 'aria-labelledby']) {
    if ((n.attr(attr) || '').trim()) return n.attr(attr);
  }
  const imgAlt = (n.find('img[alt]').attr('alt') || '').trim();
  if (imgAlt) return imgAlt;
  const svgTitle = (n.find('svg title').text() || '').trim();
  if (svgTitle) return svgTitle;
  return '';
}

/**
 * Audit one page. Returns findings as
 * { rule, detail } — the caller decides blocking vs advisory via BLOCKING.
 */
function auditPage(html) {
  const findings = [];
  const add = (rule, detail) => findings.push({ rule, detail });
  let $;
  try { $ = cheerio.load(html); } catch (err) { return findings; }

  if (!($('html').attr('lang') || '').trim()) add('missing-lang', '<html> has no lang');

  const mains = $('main').length;
  if (mains > 1) add('multiple-main', `${mains} <main> elements`);

  $('img').each((i, el) => {
    if ($(el).attr('alt') === undefined) {
      add('img-no-alt', ($(el).attr('src') || '(no src)').slice(0, 80));
    }
  });

  $('button').each((i, el) => {
    if (!accessibleName($, el)) add('control-no-name', $.html(el).replace(/\s+/g, ' ').slice(0, 100));
  });

  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (href === undefined || href === '') {
      add('empty-href', $.html(el).replace(/\s+/g, ' ').slice(0, 100));
    } else if (!accessibleName($, el)) {
      add('control-no-name', $.html(el).replace(/\s+/g, ' ').slice(0, 100));
    }
  });

  $('input,select,textarea').each((i, el) => {
    const n = $(el);
    if ((n.attr('type') || '').toLowerCase() === 'hidden') return;
    const id = n.attr('id');
    const labelled =
      n.attr('aria-label') || n.attr('aria-labelledby') || n.attr('title') ||
      n.attr('placeholder') ||
      (id && $(`label[for="${id}"]`).length) || n.parents('label').length;
    if (!labelled) add('input-no-label', $.html(el).replace(/\s+/g, ' ').slice(0, 100));
  });

  $('iframe').each((i, el) => {
    if (!($(el).attr('title') || '').trim()) {
      add('iframe-no-title', ($(el).attr('src') || '(no src)').slice(0, 80));
    }
  });

  $('[tabindex]').each((i, el) => {
    const t = parseInt($(el).attr('tabindex'), 10);
    if (t > 0) add('positive-tabindex', `tabindex="${t}"`);
  });

  const ids = new Map();
  $('[id]').each((i, el) => {
    const v = $(el).attr('id');
    ids.set(v, (ids.get(v) || 0) + 1);
  });
  for (const [id, count] of ids) {
    if (count > 1) add('duplicate-id', `id="${id}" appears ${count} times`);
  }

  const h1 = $('h1').length;
  if (h1 === 0) add('no-h1', 'no h1 on the page');
  else if (h1 > 1) add('multiple-h1', `${h1} h1 elements`);

  let prev = 0;
  let reported = false;
  $('h1,h2,h3,h4,h5,h6').each((i, el) => {
    const lv = Number(el.tagName[1]);
    if (prev && lv > prev + 1 && !reported) {
      add('heading-skip', `h${prev} -> h${lv}`);
      reported = true;
    }
    prev = lv;
  });

  return findings;
}

/** Audit a list of absolute file paths, skipping fragments. */
function auditFiles(files) {
  const results = [];
  for (const f of files) {
    let html;
    try { html = fs.readFileSync(f, 'utf8'); } catch { continue; }
    if (!isPage(html)) continue;
    const findings = auditPage(html);
    if (findings.length) results.push({ file: path.relative(ROOT, f), findings });
  }
  return results;
}

module.exports = {
  ROOT, BLOCKING, ADVISORY, RULE_HELP,
  listPages, isPage, accessibleName, auditPage, auditFiles
};
