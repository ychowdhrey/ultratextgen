'use strict';

/**
 * jsonld-parse.js — the one definition of "a JSON-LD block no consumer can
 * read", shared by scripts/check-jsonld-parse.js (the diff-scoped CI gate)
 * and scripts/audit-jsonld-parse.js (the whole-site dashboard), so the two
 * can never disagree about what a defect is.
 *
 * Why this exists: every other script that reads JSON-LD here wraps
 * JSON.parse in a try/catch and skips the block on failure (it is "a
 * separate problem; not this check's job"). So a block that does not parse
 * passes every structured-data gate, because none of them can see it. That
 * is how a FAQPage block on library/steam-symbols shipped with an unescaped
 * `"math"` inside a string: valid-looking markup, every gate green, and no
 * consumer able to read any of it until a site-wide crawl found it.
 *
 * A defect is a <script type="application/ld+json"> element whose text:
 *   - is empty or whitespace only, or
 *   - does not survive JSON.parse, or
 *   - parses to something other than an object or an array (a bare string or
 *     number is valid JSON but not JSON-LD any consumer reads).
 *
 * The text is taken exactly as an HTML parser would hand it over: a script
 * element's content runs to the first `</script`, entities are not decoded,
 * and a block inside an HTML comment is not a block at all.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// One tokenizer for comments and script elements, in document order, so a
// commented-out block is consumed as a comment and a `<!--` inside a script
// is consumed as script text. Mirrors the HTML tokenizer at the top level.
const TOKEN_RE = /<!--[\s\S]*?-->|<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const TYPE_RE = /(?:^|\s)type\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

/** Every JSON-LD block in a document: [{ line, raw }]. */
function jsonLdBlocks(html) {
  const blocks = [];
  TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = TOKEN_RE.exec(html))) {
    if (m[1] === undefined) continue; // an HTML comment
    const t = TYPE_RE.exec(m[1]);
    const type = t ? (t[1] ?? t[2] ?? t[3] ?? '') : '';
    if (type.trim().toLowerCase() !== 'application/ld+json') continue;
    blocks.push({ line: lineAt(html, m.index), raw: m[2] });
  }
  return blocks;
}

/** Why a block's text is unreadable as JSON-LD, or null when it is fine. */
function blockDefect(raw) {
  if (!raw.trim()) return 'empty block';
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return `does not parse: ${err.message}`;
  }
  if (data === null || typeof data !== 'object') {
    return `parses to a ${data === null ? 'null' : typeof data}, not an object or array`;
  }
  return null;
}

/** Unreadable blocks in a document: [{ line, error, raw }]. */
function jsonLdFailures(html) {
  const out = [];
  for (const b of jsonLdBlocks(html)) {
    const error = blockDefect(b.raw);
    if (error) out.push({ line: b.line, error, raw: b.raw });
  }
  return out;
}

/**
 * Which tracked files are pages. Test harness pages and fixtures may carry a
 * deliberately broken block; they are not part of the served site's
 * structured data.
 */
function isPageFile(rel) {
  return (
    rel.endsWith('.html') &&
    !rel.endsWith('.test.html') &&
    !rel.startsWith('node_modules/') &&
    !rel.startsWith('reports/') &&
    !rel.startsWith('scripts/')
  );
}

/**
 * Whole-tree scan of tracked pages. Throws when git cannot list the tree:
 * an empty list would read as "no defects" when nothing was checked.
 */
function scanTree(root) {
  const listed = execFileSync('git', ['ls-files', '-z', '--', '*.html'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })
    .split('\0')
    .filter(Boolean)
    .filter(isPageFile);
  if (!listed.length) throw new Error('git ls-files returned no HTML pages');
  const failures = [];
  let blocks = 0;
  let scanned = 0;
  for (const rel of listed) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    const html = fs.readFileSync(abs, 'utf8');
    scanned++;
    blocks += jsonLdBlocks(html).length;
    for (const f of jsonLdFailures(html)) failures.push({ rel, ...f });
  }
  return { scanned, blocks, failures };
}

module.exports = { jsonLdBlocks, jsonLdFailures, blockDefect, isPageFile, scanTree };
