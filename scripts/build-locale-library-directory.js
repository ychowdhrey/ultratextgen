#!/usr/bin/env node
'use strict';

/**
 * build-locale-library-directory.js
 *
 * The locale counterpart of `build-library-directory.js`: pre-renders each
 * `<lang>/library/index.html` browse directory into real static HTML.
 *
 * WHY
 * ---
 * `build-library-directory.js` fixed exactly this on the English hub — its own
 * header explains that crawlers fetching HTML without executing JavaScript
 * (GPTBot, ClaudeBot, Amazonbot, meta-externalagent, Google-Extended, every one
 * of which `robots.txt` explicitly invites) saw a hub page with zero links to
 * the pages it is a hub for.
 *
 * That fix was never propagated to the locale hubs. Measured 2026-08-26:
 * `library/index.html` carries 336 pre-rendered links, while es, fr, id, it,
 * ko, pt and tr each ship `<main id="libDirectory"></main>` empty, with 265
 * entries between them existing only inside a runtime `LIBRARY` array. A
 * non-JS crawler saw seven hub pages linking nothing.
 *
 * HOW
 * ---
 * Same contract as the English builder, and for the same reason: nothing here
 * re-implements the markup. Per file it extracts
 *
 *   1. the page's own `LIBRARY` array,
 *   2. the page's own `escHtml()`, and
 *   3. the page's own group-by-alpha render block, from `const groups = {}`
 *      up to `dir.innerHTML = html;`, plus whatever module-level constants and
 *      helpers that block reaches for
 *
 * then runs (3) over (1) with no filters active and writes the result into the
 * page's `#libDirectory` element. Static markup and runtime markup are produced
 * by the same code over the same data, so they cannot drift — and because the
 * copy comes from the locale page's own array, nothing English is introduced.
 *
 * The locale `render()` still runs on load and rebuilds the same DOM, so search,
 * alphabet and pill behaviour are unchanged for users with JavaScript.
 *
 * Usage:
 *   node scripts/build-locale-library-directory.js           # write
 *   node scripts/build-locale-library-directory.js --check   # verify, exit 1 on drift
 */

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT  = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');

/** Locale library hubs, discovered rather than hardcoded. */
function localeIndexes() {
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && /^[a-z]{2}(-[a-z]{2})?$/.test(d.name))
    .map(d => path.join(ROOT, d.name, 'library', 'index.html'))
    .filter(fs.existsSync);
}

/** Pull a balanced `const LIBRARY = [ … ];` literal out of the page. */
function extractLibrary(html) {
  const m = /const LIBRARY\s*=\s*\[[\s\S]*?\n\s*\];/.exec(html);
  return m ? m[0] : null;
}

/** Pull the page's own escHtml helper. */
function extractEscHtml(html) {
  const m = /function escHtml\s*\([\s\S]*?\n\s{2}\}/.exec(html);
  return m ? m[0] : null;
}

/**
 * Pull the render block that turns `filtered` into directory markup.
 *
 * Anchored on `const groups = {}` rather than the `// Group by alpha` comment:
 * every locale hub has the statement, only some carry the comment.
 * Ends at the assignment, which is where the page hands markup to the DOM.
 */
function extractRenderBlock(html) {
  const start = html.indexOf('const groups = {}');
  if (start === -1) return null;
  const end = html.indexOf('dir.innerHTML = html;', start);
  if (end === -1) return null;
  return html.slice(start, end);
}

/**
 * Pull one named top-level `const` or `function` declaration out of the page.
 * Returns '' when the page has no such declaration.
 */
function extractBinding(html, name) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Order matters. A single-line declaration must be tried before the
  // multi-line brace form: `const INITIAL_ID = { … };` on one line does not
  // match `{…\n};`, so the multi-line pattern would run on past it to the next
  // `\n};` anywhere in the file and return unbalanced source ("Unexpected end
  // of input"). Single-line first; anything with newlines falls through.
  const patterns = [
    new RegExp(`const ${esc}\\s*=\\s*[^;\\n]+;`),
    new RegExp(`const ${esc}\\s*=\\s*\\[[\\s\\S]*?\\n\\s*\\];`),
    new RegExp(`const ${esc}\\s*=\\s*\\{[\\s\\S]*?\\n\\s*\\};`),
    new RegExp(`function ${esc}\\s*\\([\\s\\S]*?\\n\\s{2}\\}`),
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m) return m[0];
  }
  return '';
}

/** Run the page's own code over the page's own data, unfiltered. */
function renderDirectory(html) {
  const lib   = extractLibrary(html);
  const esc   = extractEscHtml(html);
  const block = extractRenderBlock(html);
  if (!lib || !esc || !block) return null;

  // Locales group and collate differently — Turkish and French each declare
  // their own ALPHABET, Korean buckets by initial consonant (INITIAL_ID). Rather
  // than enumerate those by name and miss the next one, resolve whatever the
  // page's own block reaches for: run it, and on "X is not defined" lift X's
  // declaration out of the same page and retry. Bounded so a genuinely broken
  // page fails loudly instead of looping.
  const extras = [];
  for (let attempt = 0; attempt < 12; attempt++) {
    const src = `
      ${lib}
      ${esc}
      ${extras.join('\n')}
      const filtered = LIBRARY;
      ${block}
      html;
    `;
    try {
      return vm.runInNewContext(src, { html: '' }, { timeout: 10000 });
    } catch (err) {
      const miss = /^(\w+) is not defined$/.exec(err.message);
      if (!miss) return { error: err.message };
      const binding = extractBinding(html, miss[1]);
      if (!binding) return { error: `${err.message} (no declaration found in page)` };
      extras.push(binding);
    }
  }
  return { error: 'could not resolve the render block\'s dependencies in 12 attempts' };
}

/** Replace the contents of the page's #libDirectory element. */
function injectDirectory(html, markup) {
  const re = /(<main[^>]*id="libDirectory"[^>]*>)([\s\S]*?)(<\/main>)/;
  if (!re.test(html)) return null;
  return html.replace(re, (_, open, __, close) => `${open}\n${markup}\n${close}`);
}

function main() {
  let changed = 0, skipped = 0, drift = 0;

  for (const file of localeIndexes()) {
    const rel  = path.relative(ROOT, file);
    const html = fs.readFileSync(file, 'utf8');

    if (!/id="libDirectory"/.test(html)) {
      console.log(`  skip  ${rel} — no #libDirectory element`);
      skipped++;
      continue;
    }

    const markup = renderDirectory(html);
    if (markup === null) {
      console.log(`  skip  ${rel} — no LIBRARY array / render block to drive`);
      skipped++;
      continue;
    }
    if (markup && markup.error) {
      console.error(`ERROR ${rel} — render failed: ${markup.error}`);
      process.exit(1);
    }

    const links = (markup.match(/href=/g) || []).length;
    const updated = injectDirectory(html, markup);
    if (updated === null) {
      console.error(`ERROR ${rel} — could not locate #libDirectory to write into`);
      process.exit(1);
    }

    if (updated === html) {
      console.log(`  ok    ${rel} — already current (${links} links)`);
      continue;
    }

    if (CHECK) {
      console.error(`DRIFT ${rel} — pre-rendered directory is stale or missing (${links} links)`);
      drift++;
      continue;
    }

    fs.writeFileSync(file, updated, 'utf8');
    console.log(`  wrote ${rel} — ${links} links pre-rendered`);
    changed++;
  }

  if (CHECK) {
    if (drift) {
      console.error(`\n${drift} locale hub(s) out of date. Run: node scripts/build-locale-library-directory.js`);
      process.exit(1);
    }
    console.log('\nAll locale library hubs are pre-rendered and current.');
    return;
  }

  console.log(`\nDone. ${changed} file(s) updated, ${skipped} skipped.`);
}

main();
