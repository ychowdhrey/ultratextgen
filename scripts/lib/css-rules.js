'use strict';

/**
 * css-rules.js — read a stylesheet as a flat list of `{selector, body, line}`.
 *
 * BY BRACE WALK, NOT BY REGEX. `style.css` carries `@media` and `@supports`
 * blocks, and a regex for `selector { … }` matches the at-rule's own preamble
 * as if it were a selector. The walk skips the preamble and lets the loop read
 * the rules inside it, which is what a print check wants: a rule inside
 * `@media print` applies to the printed sheet and has to be compared like any
 * other. Comments are skipped, so a selector quoted in prose is not a rule.
 *
 * The flattening is deliberate and it is the limit of this reader: it answers
 * "what does the file declare", not "what applies at this viewport". A caller
 * that needs the at-rule context has to parse for it.
 */
function rules(css) {
  const out = [];
  let i = 0;
  let buf = '';
  while (i < css.length) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') { const end = css.indexOf('*/', i); i = end === -1 ? css.length : end + 2; continue; }
    if (c === '{') {
      const sel = buf.trim(); buf = '';
      if (sel.startsWith('@')) { i++; continue; }
      let depth = 1, j = i + 1, body = '';
      while (j < css.length && depth > 0) {
        if (css[j] === '/' && css[j + 1] === '*') { const e = css.indexOf('*/', j); j = e === -1 ? css.length : e + 2; continue; }
        if (css[j] === '{') depth++;
        else if (css[j] === '}') { depth--; if (!depth) break; }
        body += css[j]; j++;
      }
      out.push({ selector: sel, body: body, line: css.slice(0, i).split('\n').length });
      i = j + 1; continue;
    }
    if (c === '}') { buf = ''; i++; continue; }
    buf += c; i++;
  }
  return out;
}

/* (a, b, c) as the cascade defines it: ids, then classes/attributes/pseudo
   classes, then type selectors and pseudo elements. Enough to answer "does
   this rule beat that one", which is all either caller asks. */
function specificity(sel) {
  const s = sel.replace(/\/\*[\s\S]*?\*\//g, '').trim();
  const ids = (s.match(/#[\w-]+/g) || []).length;
  const classes = (s.match(/\.[\w-]+/g) || []).length
    + (s.match(/\[[^\]]+\]/g) || []).length
    + (s.match(/:(?!:)[\w-]+/g) || []).filter((p) => !/^:(not|is|where)$/.test(p)).length;
  const types = (s.match(/(^|[\s>+~(])([a-zA-Z][\w-]*)/g) || []).length
    + (s.match(/::[\w-]+/g) || []).length;
  return [ids, classes, types];
}

function beats(a, b) {
  for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] > b[i]; }
  return false;
}

/* The last compound selector — the element a rule actually styles. */
function subject(sel) {
  const parts = sel.trim().split(/\s*[\s>+~]\s*/);
  return parts[parts.length - 1] || '';
}

function classesIn(sel) {
  return new Set((sel.match(/\.[\w-]+/g) || []).map((c) => c.slice(1)));
}

module.exports = { rules, specificity, beats, subject, classesIn };
