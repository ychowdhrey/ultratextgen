'use strict';
/**
 * inline-script-capture.js — run a page's OWN inline script in Node and record
 * what it asked the shared renderer to draw, then splice that drawing back
 * into the page.
 *
 * Two build-time generators pre-render markup that the site otherwise builds
 * on load — scripts/prerender-collection-grids.js (the 898 collection
 * sections) and scripts/prerender-country-flags.js (the 17 emoji-flag pages'
 * 195 country tiles). Both face the same three problems, so the answers live
 * here once instead of twice:
 *
 *   1. The data is not parseable. A page's groups may be built by mapping ISO
 *      codes through isoToFlag, so the array is COMPUTED, not written out.
 *      The script is therefore EXECUTED against a capturing stub and the real
 *      arguments are recorded — never regex-scraped out of the source.
 *   2. The DOM it touches is incidental. A page may append unrelated tiles
 *      before reaching the call we care about, so the stub answers any DOM
 *      shape rather than returning null and throwing.
 *   3. The splice must not reformat the file. Markup is inserted as TEXT
 *      between HTML comments, never round-tripped through a parser — the same
 *      reason docs/source-attribution.md §4 gives for the JSON-LD fixer.
 *
 * A stub cannot smuggle in a call the browser would not make: each caller
 * checks every captured container id against the real HTML, and asserts the
 * container's child count grew by exactly the number of things rendered.
 */

const cheerio = require('cheerio');
const vm = require('vm');

/** A callable, infinitely-chainable stub, so an inline script can poke at any
 *  DOM shape it likes without the extraction caring. */
function anyProxy() {
  const target = function () {};
  return new Proxy(target, {
    get(_t, key) {
      if (key === Symbol.toPrimitive) return () => '';
      if (key === Symbol.iterator) return function* () {};
      if (key === 'toString') return () => '';
      if (key === 'length') return 0;
      return anyProxy();
    },
    apply() { return anyProxy(); },
    has() { return true; }
  });
}

function withFallback(real) {
  return new Proxy(real, {
    get(t, key) {
      if (key in t) return t[key];
      return anyProxy();
    },
    has() { return true; }
  });
}

/**
 * Run every inline script matching `trigger` and return whatever the installed
 * capture methods recorded.
 *
 * @param {string} html      the page source
 * @param {object} opts
 * @param {string} opts.lang       document.documentElement.lang for the stub
 * @param {RegExp} opts.trigger    which inline scripts to run
 * @param {object} opts.methods    extra UltraTextGen methods (the capturers)
 * @param {function(string): *} [opts.elementFor]  given an id, the stub
 *        document.getElementById should return. Defaults to anyProxy, which
 *        answers anything. A caller that needs to know WHICH container was
 *        written to supplies an id-aware stub here rather than assuming the
 *        id, so a page that later renames its container is reported instead
 *        of silently skipped.
 */
function captureInlineCalls(html, opts) {
  const $ = cheerio.load(html);
  const ready = [];

  const ns = withFallback(Object.assign({
    parseTwemoji() {}
  }, opts.methods || {}));

  const documentStub = withFallback({
    documentElement: withFallback({ lang: opts.lang }),
    addEventListener(evt, fn) { if (evt === 'DOMContentLoaded' && typeof fn === 'function') ready.push(fn); },
    removeEventListener() {},
    // A live element stub rather than null: a page may build other tiles in
    // the same script and would throw on getElementById(...).appendChild
    // before reaching the call being captured.
    getElementById(id) {
      return opts.elementFor ? opts.elementFor(id) : anyProxy();
    },
    querySelector() { return anyProxy(); },
    querySelectorAll() { return []; },
    createElement() { return anyProxy(); }
  });
  const windowStub = withFallback({ UltraTextGen: ns, document: documentStub });
  const sandbox = withFallback({
    window: windowStub, document: documentStub, UltraTextGen: ns,
    console: { log() {}, warn() {}, error() {} },
    setTimeout() { return 0; }, clearTimeout() {},
    JSON, Math, Object, Array, String, Number, Boolean, RegExp, Date, Map, Set
  });
  const context = vm.createContext(sandbox);

  $('script').each((_, el) => {
    if ($(el).attr('src')) return;
    const code = $(el).html() || '';
    if (!opts.trigger.test(code)) return;
    vm.runInContext(code, context, { timeout: 5000 });
  });
  for (const fn of ready) fn();
}

/**
 * Byte offsets of a container element's inner content in raw HTML.
 * Depth-scans the element's own tag name, so nested divs are handled.
 */
function innerRange(html, id) {
  const attr = new RegExp(`<([a-zA-Z][\\w-]*)\\b[^>]*\\bid="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`);
  const m = attr.exec(html);
  if (!m) return null;
  const tag = m[1];
  const openEnd = html.indexOf('>', m.index);
  if (openEnd === -1) return null;
  const re = new RegExp(`<${tag}\\b|</${tag}\\s*>`, 'gi');
  re.lastIndex = openEnd + 1;
  let depth = 1, hit;
  while ((hit = re.exec(html))) {
    if (hit[0][1] === '/') {
      depth -= 1;
      if (depth === 0) return { start: openEnd + 1, end: hit.index };
    } else {
      depth += 1;
    }
  }
  return null;
}

/**
 * Append a generated block inside the container, preserving the file's own
 * byte layout around it: existing children untouched, the block indented like
 * the container's other children, the closing tag left where it was.
 *
 * @param {function(string): string} render  given the child indent, the block
 */
function spliceInner(html, containerId, blockRe, render) {
  const stripped = html.replace(blockRe, '');
  const range = innerRange(stripped, containerId);
  if (!range) return null;

  const head = stripped.slice(0, range.start);
  const inner = stripped.slice(range.start, range.end);

  // Indentation of the line the container's own opening tag sits on.
  const openLine = head.slice(head.lastIndexOf('\n', head.length - 1) + 1);
  const openIndent = (/^[ \t]*/.exec(openLine) || [''])[0];

  // Whitespace the closing tag currently sits behind, and the body before it.
  // An empty container is written on one line (`<div id="x"></div>`), so there
  // is no existing indentation to preserve and the closing tag lines up with
  // the opening one instead.
  const trailing = /(?:^|\n)([ \t]*)$/.exec(inner);
  const closeIndent = inner.trim() === '' ? openIndent : (trailing ? trailing[1] : openIndent);
  let body = trailing ? inner.slice(0, inner.length - closeIndent.length) : inner;
  if (body && !body.endsWith('\n')) body += '\n';
  if (!body) body = '\n';

  // One step in from the container's own opening tag. Derived from the tag
  // rather than from a sampled child line, so every file indents identically
  // instead of inheriting whatever the nearest inner line happened to use.
  const childIndent = openIndent + '  ';

  return head + body + render(childIndent) + closeIndent + stripped.slice(range.end);
}

module.exports = { anyProxy, withFallback, captureInlineCalls, innerRange, spliceInner };
