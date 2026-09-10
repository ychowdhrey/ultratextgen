'use strict';
/**
 * locale-string-attestation.js — is this locale string built from words this
 * site already uses in that language?
 *
 * WHAT PROBLEM THIS SOLVES, AND WHAT IT DOES NOT
 *
 * A new locale UI string normally gets a native reviewer. When none is
 * available, the next-best evidence is the site's OWN pages in that language:
 * 490 Malay pages already say `Salin` for copy, `ms/library/ruang-kosong`
 * already calls a space `Ruang`, and the `ms/` footer already calls vertical
 * text `Teks Menegak`. A proposed string assembled from those words is grounded
 * in first-party evidence; one assembled from a dictionary guess is not, and
 * before this module nothing could tell the two apart.
 *
 * SO THIS MEASURES CORPUS SUPPORT, NOT CORRECTNESS, and the difference is not
 * a quibble. A string can be fully attested and still be wrong:
 *
 *   - Wrong inflection. CLAUDE.md records the real case — Swedish "kontrollerat"
 *     (neuter, agreeing with *innehållet*) where a first draft guessed
 *     "kontrollerad". Both stems are attested; only one agrees.
 *   - Wrong collocation. Every word of a phrase can be attested while the
 *     phrase itself is not something anyone says.
 *   - Wrong register. The corpus cannot tell you a word is too formal for a
 *     button.
 *
 * An `attested` verdict therefore means "no word here is invented", which is a
 * real and checkable claim, and nothing more. It never substitutes for a native
 * reader; it tells you which strings still need one.
 *
 * HOW A WORD IS MATCHED
 *
 * Stem-prefix, not exact. Finnish and Turkish inflect heavily, so `kokoelma`
 * appears as `kokoelmaan` and `salinan` beside `salin`; requiring an exact token
 * would report correct words as invented. A candidate word counts as attested
 * when some token in that locale's own visible text starts with its first
 * STEM_LEN characters (or the whole word, when shorter).
 *
 * Scripts without word spacing (CJK, Thai) are matched as substrings of the
 * locale's own text instead of being tokenised, because tokenising them here
 * would make this module the authority on CJK segmentation, which is not a
 * thing a corpus check should own.
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const ROOT = path.join(__dirname, '..', '..');

/** Characters to compare on; below this a word is matched whole. */
const STEM_LEN = 5;
/**
 * Shorter than this and a word carries no evidence either way — but the
 * threshold is script-aware. A Hangul syllable carries far more than a Latin
 * letter, so Korean 공유 (share) and 없음 (none) are whole words at two
 * characters; a flat minimum of 3 discarded them and returned
 * `no-evidence-needed`, which reads as "fine" when it means "not checked".
 */
const MIN_WORD_LATIN = 3;
const MIN_WORD_OTHER = 2;
const LATIN = /^[\p{Script=Latin}\p{M}]+$/u;
const minWordFor = (w) => (LATIN.test(w) ? MIN_WORD_LATIN : MIN_WORD_OTHER);

/** Words that are the same in every language and prove nothing. */
const NEUTRAL = new Set(['ultratextgen', 'unicode', 'emoji', 'html', 'css', 'url', 'sms']);

const SPACELESS = /[぀-ヿ㐀-䶿一-鿿豈-﫿฀-๿]/;

function stripMarkup(html) {
  let h = html;
  h = h.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  h = h.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  h = h.replace(/<head[\s\S]*?<\/head>/i, ' ');
  h = h.replace(/<!--[\s\S]*?-->/g, ' ');
  // Attribute values a reader hears (aria-label, title, alt) count as the
  // site's own wording in that language just as visible text does.
  const attrs = [];
  for (const m of h.matchAll(/\b(?:aria-label|title|alt|data-symbol)="([^"]*)"/gi)) attrs.push(m[1]);
  h = h.replace(/<[^>]+>/g, ' ');
  return (h + ' ' + attrs.join(' ')).replace(/&[a-z]+;|&#\d+;/gi, ' ');
}

function tokens(text) {
  return (text.toLowerCase().match(/[\p{L}\p{M}]{2,}/gu) || []);
}

/**
 * Build the evidence index for one locale from its own pages.
 * @returns {{stems:Set<string>, text:string, pages:number}}
 */
function buildCorpus(localeCode) {
  const dir = path.join(ROOT, localeCode);
  if (!fs.existsSync(dir)) return { stems: new Set(), text: '', pages: 0 };
  const files = globSync('**/index.html', { cwd: dir });
  const stems = new Set();
  const chunks = [];
  for (const rel of files) {
    const text = stripMarkup(fs.readFileSync(path.join(dir, rel), 'utf8'));
    chunks.push(text.toLowerCase());
    for (const t of tokens(text)) stems.add(t.slice(0, STEM_LEN));
  }
  return { stems, text: chunks.join(' \n'), pages: files.length };
}

/** Content words of a candidate string, minus anything that proves nothing. */
function candidateWords(str) {
  return tokens(String(str))
    .filter((w) => w.length >= minWordFor(w))
    .filter((w) => !NEUTRAL.has(w));
}

/**
 * @returns {{verdict:'attested'|'partial'|'unattested'|'no-evidence-needed',
 *            words:Array<{word:string, found:boolean}>}}
 */
function attest(str, corpus) {
  const raw = String(str == null ? '' : str);
  if (SPACELESS.test(raw)) {
    // Substring match on the locale's own text; see the header comment.
    const needles = raw.split(/[\s·、。，,:：/（）()]+/).filter((s) => s && SPACELESS.test(s));
    if (!needles.length) return { verdict: 'no-evidence-needed', words: [] };
    const words = needles.map((w) => ({ word: w, found: corpus.text.includes(w.toLowerCase()) }));
    const hits = words.filter((w) => w.found).length;
    return {
      verdict: hits === words.length ? 'attested' : hits ? 'partial' : 'unattested',
      words
    };
  }
  const ws = candidateWords(raw);
  if (!ws.length) return { verdict: 'no-evidence-needed', words: [] };
  // Stem-set OR substring. The substring arm matters for agglutinative and
  // particle-suffixing languages, where the inflected form on the page is
  // LONGER than the candidate word and so hashes to a different stem: Korean
  // writes 스타일을 for the bare 스타일, Finnish kokoelmaan for kokoelma. Without
  // it the method reports correct words as invented, which is the failure mode
  // that matters here — a false "unattested" sends a reviewer chasing nothing.
  const words = ws.map((w) => ({
    word: w,
    found: corpus.stems.has(w.slice(0, STEM_LEN)) || corpus.text.includes(w)
  }));
  const hits = words.filter((w) => w.found).length;
  return {
    verdict: hits === words.length ? 'attested' : hits ? 'partial' : 'unattested',
    words
  };
}

/** Flatten a locale JSON into [{path, value}], skipping `_readme`. */
function flatten(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k === '_readme') continue;
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatten(v, p));
    else if (typeof v === 'string') out.push({ path: p, value: v });
    else if (Array.isArray(v)) v.forEach((x, i) => {
      if (typeof x === 'string') out.push({ path: `${p}[${i}]`, value: x });
      else if (x && typeof x === 'object') out.push(...flatten(x, `${p}[${i}]`));
    });
  }
  return out;
}

/**
 * Which matching path a locale takes, and how much to trust the number.
 *
 * The spaceless path can only ask whether a whole segment appears verbatim on a
 * content page, which a UI phrase rarely does however natural it is — so ja, th
 * and zh-tw read far lower than the Latin locales on identical quality and the
 * two sets are NOT comparable. A thin corpus lowers the number the same way for
 * a different reason. Both are stated rather than averaged away.
 */
function methodFor(sampleStrings, pages) {
  const spaceless = sampleStrings.some((s) => SPACELESS.test(String(s)));
  const notes = [];
  if (spaceless) notes.push('spaceless script: verbatim segment match, reads low');
  if (pages < 30) notes.push(`thin corpus (${pages} pages)`);
  return { method: spaceless ? 'substring' : 'token', notes };
}

module.exports = {
  ROOT, STEM_LEN, buildCorpus, attest, flatten, candidateWords, stripMarkup, methodFor
};
