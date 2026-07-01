#!/usr/bin/env node
/* ==========================================================================
   classify-accent-support.js

   SINGLE SOURCE OF TRUTH for how each style in styles.js handles accented /
   diacritic characters (Western-European á é ñ ü ç AND Vietnamese ữ ế đ ...).

   It loads the REAL engine (styles.js + renderer.js) and renders a fixed
   accent sample through every registered style, then buckets each style by
   observed behaviour — so the guide page and the in-generator hint can both
   read one accurate, regenerable classification instead of a hand-kept list.

   Buckets:
     full    - accented letters keep their accent AND receive the style's
               effect, exactly like the plain letters around them
               (mark-based decorators, symbol word-wraps)
     partial - plain letters are styled, but accented letters fall back to
               their plain form (accent intact, just not restyled)
               (the Mathematical-Alphanumeric alphabet fonts, most of them)
     breaks  - accented letters lose their accent or the mark detaches /
               mis-attaches (accent not preserved in output)
     na      - the style replaces/destroys the input regardless of accents
               (redact blackout, pattern fill)

   Output:
     - data/accent-support.json  (consumed by the guide + generator UI)
     - a human-readable summary table on stdout

   Run:  node scripts/classify-accent-support.js
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/* --- Load the real engine with a minimal browser shim ------------------- */
global.window = global.window || {};
// styles.js sets window.textStyles / CATEGORY_PAGES / SITE_PAGES
eval(fs.readFileSync(path.join(ROOT, 'styles.js'), 'utf8'));
// renderer.js procedures reference the bare global `textStyles`
global.textStyles = global.window.textStyles;
// renderer.js sets window.UltraTextGenRender
eval(fs.readFileSync(path.join(ROOT, 'renderer.js'), 'utf8'));

const { renderAny } = global.window.UltraTextGenRender;
const styles = global.window.textStyles || {};

/* --- Accent sample ------------------------------------------------------- */
// NFC precomposed accented letters: Western-European + Vietnamese coverage.
const ACCENT_CHARS = Array.from(
  'áéíóúàèìòùâêîôûäëïöüãõñç' +      // Western European
  'ăâđêôơư' +                        // Vietnamese base letters
  'ữứựếệểồộớợằ'                      // Vietnamese vowel + tone stacks
);

// Display samples for the table (mixed accented + plain).
const SAMPLES = { es: 'Señor', vi: 'Việt' };

const NFD = s => s.normalize('NFD');

function codepointCounts(s) {
  const m = new Map();
  for (const cp of s) m.set(cp, (m.get(cp) || 0) + 1);
  return m;
}

// True if every codepoint of the accented cluster `c` still appears in `out`
// at least as often. Multiset-based, so it is robust to (a) canonical
// re-ordering of combining marks when a decorator appends its own mark, and
// (b) extra marks being added around the original accent.
function accentPreserved(c, out) {
  const need = codepointCounts(NFD(c));
  const have = codepointCounts(NFD(out));
  for (const [cp, n] of need) {
    if ((have.get(cp) || 0) < n) return false;
  }
  return true;
}

// Strip the longest common prefix and suffix (code-point aware) shared by two
// rendered outputs, returning the differing cores. This removes any per-word
// wrapper/banner/mark that both a plain and an accented letter received alike.
function differingCores(a, b) {
  const A = Array.from(a), B = Array.from(b);
  let p = 0;
  while (p < A.length && p < B.length && A[p] === B[p]) p++;
  let sa = A.length, sb = B.length;
  while (sa > p && sb > p && A[sa - 1] === B[sb - 1]) { sa--; sb--; }
  return [A.slice(p, sa).join(''), B.slice(p, sb).join('')];
}

// Does the accented letter get the SAME per-letter treatment as its plain base?
// For each (base, accented) pair we render both, strip the shared decoration,
// and compare the cores. A style is consistent for that pair when either the
// base's core is still the plain base letter (all styling lived in the shared
// wrapper/mark, so the accent got it too) OR the accented core was itself
// transformed. It is INCONSISTENT — the half-styled look — when the base was
// swapped for a distinct glyph (𝗲, ⦅e⦆, 𝖊, ǝ) while the accent stayed plain.
function accentConsistency(R) {
  const PAIRS = [['e', 'é'], ['e', 'ê'], ['e', 'ệ'], ['o', 'ô'], ['a', 'ă'],
                 ['u', 'ư'], ['u', 'ữ'], ['n', 'ñ'], ['c', 'ç'], ['d', 'đ']];
  let consistent = 0;
  for (const [base, acc] of PAIRS) {
    const [coreBase, coreAcc] = differingCores(R(base), R(acc));
    if (coreBase === base || coreAcc !== acc) consistent++;
  }
  return consistent / PAIRS.length;
}

function classify(style) {
  const R = s => {
    try { return renderAny(s, style); } catch (e) { return s; }
  };

  // Content-replacing styles: accents are moot by design.
  if (style.type === 'redact' || style.type === 'pattern') {
    return { bucket: 'na' };
  }

  // Does the style change plain ASCII at all?
  const plainActive = R('a') !== 'a' || R('e') !== 'e' || R('o') !== 'o' || R('M') !== 'M';
  if (!plainActive) return { bucket: 'none' };

  // Are all accents preserved in the output (no mark lost or detached)?
  const preservedAll = ACCENT_CHARS.every(c => accentPreserved(c, R(c)));
  if (!preservedAll) return { bucket: 'breaks' };

  // Accents survive — the split is whether the accented letter is styled
  // consistently with the plain letters around it, or stranded in plain form.
  return { bucket: accentConsistency(R) > 0.999 ? 'full' : 'partial' };
}

/* --- Run ----------------------------------------------------------------- */
const results = [];
for (const name of Object.keys(styles)) {
  const style = styles[name];
  const { bucket } = classify(style);
  results.push({
    name,
    slug: style.slug || null,
    type: style.type || null,
    category: style.category || null,
    groupSlug: style.groupSlug || null,
    bucket,
    example_es: (() => { try { return renderAny(SAMPLES.es, style); } catch { return SAMPLES.es; } })(),
    example_vi: (() => { try { return renderAny(SAMPLES.vi, style); } catch { return SAMPLES.vi; } })()
  });
}

const order = { full: 0, partial: 1, breaks: 2, na: 3, none: 4 };
results.sort((a, b) => (order[a.bucket] - order[b.bucket]) || a.name.localeCompare(b.name));

const counts = results.reduce((m, r) => (m[r.bucket] = (m[r.bucket] || 0) + 1, m), {});

const outPath = path.join(ROOT, 'data', 'accent-support.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({
  generated: 'run scripts/classify-accent-support.js to regenerate',
  sample: { accentChars: ACCENT_CHARS.join(''), samples: SAMPLES },
  counts,
  styles: results
}, null, 2) + '\n');

/* --- Report -------------------------------------------------------------- */
const pad = (s, n) => String(s).padEnd(n).slice(0, n);
console.log(`\nTotal styles: ${results.length}`);
console.log('Buckets:', JSON.stringify(counts));
console.log(
  '\n' + pad('STYLE', 30) + pad('BUCKET', 9) + pad('TYPE', 11) +
  pad('Señor →', 16) + 'Việt →'
);
console.log('-'.repeat(90));
for (const r of results) {
  console.log(
    pad(r.name, 30) + pad(r.bucket, 9) + pad(r.type || '', 11) +
    pad(r.example_es, 16) + r.example_vi
  );
}
console.log(`\nWrote ${path.relative(ROOT, outPath)}`);
