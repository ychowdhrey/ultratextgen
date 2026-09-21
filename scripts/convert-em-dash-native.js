#!/usr/bin/env node
/**
 * Convert em dashes to each locale's OWN native mark, per
 * data/em_dash_locale_policy.json — the ledger that already names the
 * replacement for every `ban` and `double-dash` locale.
 *
 * IT APPLIES THE REMEDY, NOT THE CHARACTER. An earlier version swapped — for
 * – and stopped. That is correct typography and it does not do the job: the
 * tell is the CONSTRUCTION `claim — elaboration`, which reads the same with
 * either mark. Measured over the 807 pages it had converted, 94% of the
 * dashes were that construction and 5.9% were genuine A–Z ranges.
 *
 * The ledger said so already: `de`.replacement is "the spaced en dash ( – ),
 * WHICH IS NEVER FLAGGED; or a comma pair, parentheses, a colon or a full
 * stop" — five options, the first of which clears the gate and changes
 * nothing for the reader. English has no en-dash option at all, which is why
 * it is in scope here.
 *
 * WHAT MAKES IT SAFE IS A VERIFIER, NOT A PROMISE. Every file is checked with
 * significanceHash() from scripts/lib/content-significance.js: if the hash
 * moves, a word moved, and the edit is refused. That is the function the
 * sitemap itself uses, so "no <lastmod> advances" is proven per file — and it
 * holds for a full stop, a colon, a comma pair and parentheses alike, because
 * that function strips punctuation and case-folds.
 *
 * Two things keep the blast radius honest:
 *
 *   1. TEXT NODES ONLY, PATCHED BY SOURCE OFFSET. The file is never
 *      re-serialised through cheerio — the same rule the JSON-LD fixer follows
 *      in docs/source-attribution.md §4, and for the same reason: a
 *      round-trip rewrites formatting across the whole file and buries the
 *      real change in noise. Attribute values are never touched.
 *   2. THE SLOT SET IS THE CORPUS'S OWN. Exclusions are imported from
 *      scripts/lib/editorial-corpus.js rather than restated, so the rewriter
 *      and the gate cannot disagree about what is editorial copy. A second
 *      copy of that list would drift, which is the failure CLAUDE.md records
 *      against exactly this kind of pass.
 *
 * Held back deliberately: <title>, meta description and <h1>. Not because the
 * dash is different there, but because docs/em-dash-policy.md §3 is explicit
 * that a changed title re-enters Google's title-link selection — churn, not
 * punctuation, is the risk — and 700 snippets should not move in one week.
 * Those drain with each page's own next edit.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const cheerio = require('cheerio');
const { DROP_SELECTORS, UI_SELECTORS } = require('./lib/editorial-corpus.js');
const { significanceHash } = require('./lib/content-significance.js');

/**
 * WHY ja AND zh-tw ARE NOT CONVERTED HERE (measured 2026-09-20)
 *
 * Their ledger replacement is the paired —— , and converting a lone — to it is
 * correct: the 文化庁 and 教育部 manuals both prescribe the two-cell dash, and
 * both corpora already use it for 1,810 of 2,565 and 1,036 of 1,121.
 *
 * But `punctuationFingerprint` in scripts/lib/editorial-footprint.js counts em
 * dash CHARACTERS raw — `(ed.match(/—/g) || []).length`, with no reference to
 * data/em_dash_locale_policy.json. So —— counts as two, and writing Japanese
 * correctly DOUBLES the page's em-dash rate. Measured: three ja guides blocked
 * the EFR ratchet at +3.5, +3.6 and +3.4 for exactly this, with
 * punctuationFingerprint the top or second contributor on each.
 *
 * The two halves of one system disagree about what a Japanese dash is: the
 * em-dash RULE consults the policy and does not flag a new ——, while the
 * FINGERPRINT feeding EFR does not. Teaching the fingerprint the policy is the
 * right fix, but it changes a measurement, which moves the cohort median and
 * is a re-baseline event for data/editorial_footprint_baseline.json — a
 * deliberate change of its own, never a rider on a content conversion.
 */

const REPO = path.resolve(__dirname, '..');
const POLICY = JSON.parse(fs.readFileSync(path.join(REPO, 'data/em_dash_locale_policy.json'), 'utf8'));
const LOCALES = POLICY.locales || POLICY;
const policyFor = (c) => (LOCALES[c] && LOCALES[c].policy) || null;
/** English plus the thirteen en-dash locales. ja/zh-tw stay out: see above. */
const IN_SCOPE = new Set('en de nl it fi no cs sk hr sv sr bs da hu'.split(' '));
const CODES = new Set(Object.keys(LOCALES).filter((c) => c !== 'en'));

/**
 * The dash is the SUBJECT on these pages, so it is content, never a defect.
 *
 * Matched against the page's OWN `hreflang="en"` parent, never against its
 * path: `nl/symbol/em-streep` and `de/library/halbgeviertstrich` are the same
 * four pages in another language, and a path test silently converts the very
 * pages the policy exempts. This is the same rule the peer-link and parity
 * tooling already follow — cluster membership comes from the page's own
 * declaration, never from a guessed locale slug. Caught by running the pass
 * and reading which specs it touched.
 */
const SUBJECT = /(^|\/)(symbol\/(em-dash|en-dash)|library\/(dash-hyphen-symbols|punctuation-symbols))\/?$/;

/** The EN parent a page declares for itself, or its own path when it is EN. */
function enParentOf($, rel) {
  const href = $('head link[rel="alternate"][hreflang="en"]').attr('href');
  if (href) { try { return new URL(href).pathname; } catch { /* fall through */ } }
  return '/' + rel.replace(/index\.html$/, '');
}
function isSubject(p) {
  return SUBJECT.test(String(p).replace(/\/+$/, '') + '/') || SUBJECT.test(String(p));
}

/**
 * Never rewritten: the churn class (policy §3), quoted third-party words, and
 * the Sources apparatus, which editorial-corpus.js drops before slot
 * extraction and which is therefore measured nowhere. CARD_SELECTORS are
 * deliberately NOT here — a card IS the `cta` slot, and the cta slot holds
 * 2,280 of the em dashes this pass exists to convert.
 */
const HELD = ['h1', 'q', 'blockquote', 'cite', '.source-note'];

function localeOf(rel) {
  const m = ('/' + rel).match(/^\/([a-z]{2}(?:-[a-z]{2})?)\//);
  return m && CODES.has(m[1]) ? m[1] : 'en';
}



/* ---- what a candidate IS ------------------------------------------------ */
/**
 * A candidate is a SPACED EM DASH and nothing else.
 *
 * The first run indexed /[—–]/ and turned `Buchstaben A–Z, a–z` into
 * `Buchstaben A) Z, a (z`. An en dash in this corpus is already a correct
 * range; a TIGHT em dash (`2019—2024`) is a range too, and the policy's own
 * table sends that to an en dash, never to a clause mark.
 */

/**
 * Blocks that bound a sentence for classification.
 *
 * `div` and `section` are here because leaving them out is not a smaller
 * block, it is NO block: blockOf walks up until it matches, so a `.faq-answer`
 * div sent the walk to the top of the document and made the WHOLE PAGE one
 * block. Ten rows of one twelve-row glossary converted and two did not.
 */
const BLOCK_RE = /^(p|li|td|th|h2|h3|h4|h5|h6|dd|dt|div|section|article|aside|figcaption|summary|caption|blockquote)$/i;
/** A label separator lives in these; the tone standard's own mark is a colon. */
const LABEL_TAG_RE = /^(h2|h3|h4|h5|h6|th|dt|summary|figcaption|caption)$/i;

/** Coordinating conjunctions: a dash in front of one is a compound joint. */
const CONJ = {
  en: ['and','but','or','so','yet','nor','then','which','while','though'],
  de: ['und','aber','oder','denn','sondern','doch'],
  nl: ['en','maar','of','want','dus'],
  it: ['e','ma','o','però','quindi','oppure'],
  fi: ['ja','mutta','tai','joten','eli','sekä'],
  no: ['og','men','eller','så'], da: ['og','men','eller','så'], sv: ['och','men','eller','så'],
  cs: ['a','ale','nebo','takže','tedy'], sk: ['a','ale','alebo','takže','teda'],
  hr: ['a','i','ali','ili','pa','te'], bs: ['a','i','ali','ili','pa','te'],
  sr: ['a','i','ali','ili','pa','те'], hu: ['és','de','vagy','tehát','így'],
};

const R = { PERIOD:'.', COLON:':', COMMA:',', OPEN:'(', CLOSE:')',
            KEEP:'-', DROP:'x', NOOP:'_', DEFER:'?' };
// DROP removes a dash that is redundant against punctuation the sentence
// already carries: `…(WHITE CHESS PAWN) —, beide Teil des Blocks` wants the
// comma alone. It is the table's "two jobs in one sentence" case, and it is
// a judgement, so it is only ever reachable from the ledger.

/**
 * `(—)` is the character shown AS A SPECIMEN, not used as punctuation.
 * `Geviertstrich (—)` is German FOR em dash and `Em-streep (—)` is Dutch for
 * it, so converting there labels an em dash with something else. NOOP is
 * distinct from KEEP on purpose: KEEP still writes an en dash, and here even
 * that states a falsehood.
 */
const SPECIMEN_AT = (t, at) => /[(\[（【][ \t]*$/.test(t.slice(Math.max(0, at - 3), at))
                            && /^[ \t]*[)\]）】]/.test(t.slice(at + 1, at + 4));

/**
 * Plan every em dash in one block at once, SENTENCE BY SENTENCE.
 *
 * The first version asked "does this block hold two or more dashes?" and
 * paired them by parity. A long FAQ answer holds six unrelated joints, so it
 * produced `Unicode-Zeichen) also in Buchstaben` — a stray bracket mid
 * sentence. An aside is a property of a SENTENCE, never of a paragraph.
 *
 * NOTE THE ONE REMEDY THIS NEVER RETURNS: a full stop. That needs the
 * following segment to be an independent clause, which needs a finite verb
 * and is not detectable across fourteen languages; get it wrong and you
 * strand a fragment (`… – bez Nitra, dodatka ili posebne aplikacije.` has no
 * verb). A full stop reaches the applier only from the judgement ledger.
 */
function planBlock(blockText, tag, code, noopOrdinals, deferOrdinals) {
  const conj = CONJ[code] || CONJ.en;
  const all = [...blockText.matchAll(/—/g)].map((m) => m.index);
  const plan = new Array(all.length).fill(R.DEFER);

  const bounds = [0];
  for (const m of blockText.matchAll(/[.!?…](\s|$)/g)) bounds.push(m.index + m[0].length);
  bounds.push(blockText.length + 1);
  const sentenceOf = (i) => {
    for (let k = 0; k < bounds.length - 1; k++) if (i >= bounds[k] && i < bounds[k + 1]) return k;
    return bounds.length - 2;
  };

  const bySentence = new Map();
  const odd = new Set();
  all.forEach((at, i) => {
    if (noopOrdinals && noopOrdinals.has(i)) { plan[i] = R.NOOP; return; }
    if (deferOrdinals && deferOrdinals.has(i)) { plan[i] = R.DEFER; return; }
    if (SPECIMEN_AT(blockText, at)) { plan[i] = R.NOOP; return; }
    /**
     * A DASH WITH NOTHING BEFORE IT IS NOT A JOINT.
     *
     * `ws()` answers true for `undefined` so that the range guard below reads
     * the block edges as whitespace — correct for a range, wrong here: a dash
     * at offset 0 has no left-hand clause to join to anything, so the label
     * rule below fired on it and turned the em dash's OWN hub card,
     * `<h4>— Em Dash</h4>`, into `<h4>: Em Dash</h4>` on all four locale
     * hubs. The card is the specimen. Same at the other end.
     */
    if (!blockText.slice(0, at).trim() || !blockText.slice(at + 1).trim()) { plan[i] = R.NOOP; return; }
    /**
     * A JOINT DOES NOT FOLLOW A TERMINAL MARK.
     *
     * `Allowed characters: lowercase a–z, 0–9, _ and . — nothing else.` names
     * the FULL STOP as an allowed character, so the dash is preceded by a
     * period that is content rather than punctuation. A colon there reads
     * `_ and .: nothing else` — doubled punctuation, on 16 Discord guide
     * pages in as many languages. `)` and a closing quote are deliberately
     * NOT in this set: `(U+2014) — the rest` is an ordinary joint.
     */
    if (/[.,:;!?]/.test((blockText.slice(0, at).trimEnd().slice(-1)) || '')) { plan[i] = R.DEFER; return; }
    const l = blockText[at - 1], r = blockText[at + 1];
    const alnum = (c) => c !== undefined && /[\p{L}\p{N}]/u.test(c);
    const ws = (c) => c === undefined || /\s/.test(c);
    /**
     * A RANGE is digits either side — `2019—2024`, which the policy's own
     * table sends to an en dash. NOT merely "tight": measured across the
     * whole in-scope corpus there are exactly THREE tight em dashes and all
     * three are joints (`No—Unicode`, `spaces—like`), none a range. The
     * "tight therefore a range" rule I wrote first had zero true instances
     * and one false one, and wrote `No – Unicode`.
     */
    if (/\d/.test(l || '') && /\d/.test(r || '')) { plan[i] = R.KEEP; return; }
    if (alnum(l) && alnum(r)) { plan[i] = R.DEFER; return; }
    if (!ws(l) || !ws(r)) { plan[i] = R.DEFER; odd.add(sentenceOf(at)); return; }
    const sk = sentenceOf(at);
    if (!bySentence.has(sk)) bySentence.set(sk, []);
    bySentence.get(sk).push(i);
  });

  /**
   * WHICH DASHES ARE EACH OTHER'S PARTNERS.
   *
   * Recorded for every same-sentence group of SPACE-SURROUNDED dashes,
   * independently of how each one was classified above, because the ledger and
   * the tail rules both get a say after this function returns and either can
   * convert one side of an aside on its own. A tight dash is never a member: a
   * range (`2019-2024`) does not delimit anything.
   */
  const spacedAt = (at) => (at === 0 || /\s/.test(blockText[at - 1] || '')) && /\s/.test(blockText[at + 1] || '');
  const perSentence = new Map();
  all.forEach((at, i) => {
    if (!spacedAt(at)) return;
    const k = sentenceOf(at);
    if (!perSentence.has(k)) perSentence.set(k, []);
    perSentence.get(k).push(i);
  });
  Object.defineProperty(plan, 'pairs', {
    value: [...perSentence.values()].filter((g) => g.length >= 2), enumerable: false,
  });

  // A dash sitting against punctuation is ambiguous, and its PARTNER must not
  // be converted alone: half a converted aside is worse than none.
  for (const sk of odd) if (bySentence.has(sk)) bySentence.delete(sk);

  for (const [, group] of bySentence) {
    // B. a true paired aside: exactly two joints in ONE sentence, with a span
    //    short enough and clean enough to read as parenthetical.
    if (group.length === 2) {
      const [a, b] = group;
      const inner = blockText.slice(all[a] + 1, all[b]).trim();
      if (inner.length <= 60 && !/[.!?]/.test(inner)) {
        const pair = inner.includes(',') ? [R.OPEN, R.CLOSE] : [R.COMMA, R.COMMA];
        plan[a] = pair[0]; plan[b] = pair[1];
        continue;
      }
      /**
       * AN ASIDE THE RULE ABOVE DECLINES IS STILL AN ASIDE.
       *
       * Falling through to the per-dash rules below converted the OPENING dash
       * of a long aside and left the closing one standing, because rule D sees
       * two commas inside the aside and rule F sees a bare clause after it:
       * `a chunk of your audience: often older Android phones, certain web
       * browsers, or specific apps - sees a row of squares.` That shipped on
       * 69 sentences in 11 languages. The `odd` set two lines down already
       * states the principle for a punctuation-adjacent partner; this is the
       * same principle for a partner the 60-character test rejected.
       */
      continue;
    }
    if (group.length > 2) continue;                     // ambiguous: judge it
    for (const i of group) {
      const at = all[i];
      const before = blockText.slice(0, at).trim();
      const after = blockText.slice(at + 1).trim();
      const first = (after.split(/[\s,.;:]/)[0] || '').toLowerCase().replace(/[^\p{L}]/gu, '');
      if (LABEL_TAG_RE.test(tag)) { plan[i] = R.COLON; continue; }    // A. label row
      if (conj.includes(first)) { plan[i] = R.COMMA; continue; }      // C. compound joint
      const se = after.search(/[.!?](\s|$)/);
      const win = se === -1 ? after : after.slice(0, se);
      if ((win.match(/,/g) || []).length >= 2) { plan[i] = R.COLON; continue; }  // D. list
      // A colon ends a label context as surely as a full stop does. Splitting
      // on sentence enders alone left row 1 of a <br>-separated glossary with
      // a 55-character `before` and rows 2-12 with a short one: eleven colons
      // and one untouched dash in one list.
      const bTail = before.split(/[.!?:]\s/).pop() || before;
      if (bTail.length < 34) { plan[i] = R.COLON; continue; }         // E. label–gloss
      plan[i] = R.DEFER;                                              // F. judgement
    }
  }
  return plan;
}

/**
 * BOTH OR NEITHER.
 *
 * Runs on the FINAL remedy array, after the plan, the ledger and the tail
 * rules have each had their say, because any of the three can convert one
 * dash of an aside on its own and only the finished array shows it. Where a
 * sentence's spaced dashes disagree, the converted ones are demoted rather
 * than the unconverted ones promoted: a mark this pass cannot choose is a
 * judgement, and guessing the partner is how the defect was introduced.
 *
 * Returns the demoted ordinals so the caller can account for them as deferred
 * instead of silently dropping them out of the pending list.
 */
function settlePairs(plan, remedies) {
  const live = (r) => !!r && r !== R.DEFER && r !== R.NOOP;
  const demoted = [];
  for (const group of plan.pairs || []) {
    if (group.every((i) => live(remedies[i])) || group.every((i) => !live(remedies[i]))) continue;
    for (const i of group) if (live(remedies[i])) { remedies[i] = R.DEFER; demoted.push(i); }
  }
  return demoted;
}

/* ---- applying a remedy to the RAW SOURCE SLICE -------------------------- */

/** The separator to put after a mark: none when the next character is itself
 *  punctuation or whitespace, one space otherwise. */
const gap = (right, raw, e) => right || (/^[\s,.;:!?)\]…]/.test(raw.slice(e)) || e >= raw.length ? '' : ' ');

function applyRemedy(raw, k, remedy) {
  let seen = -1, pos = -1;
  for (const m of raw.matchAll(/—/g)) { if (++seen === k) { pos = m.index; break; } }
  if (pos === -1) return null;
  let s = pos, e = pos + 1;
  while (s > 0 && (raw[s - 1] === ' ' || raw[s - 1] === '\t')) s--;
  while (e < raw.length && (raw[e] === ' ' || raw[e] === '\t')) e++;
  const left = raw.slice(s, pos), right = raw.slice(pos + 1, e);
  let mid;
  switch (remedy) {
    case '.': {
      const tail = raw.slice(e);
      const li = tail.search(/\p{L}/u);
      // No letter left in THIS node to capitalise: a full stop would open a
      // sentence whose start we cannot see. Downgrade rather than guess.
      if (li === -1 || li > 3) return applyRemedy(raw, k, ':');
      /**
       * CAPITALISE ONLY WHERE THE CASE PAIR ROUND-TRIPS.
       *
       * `'ϑ'.toUpperCase()` is `'Θ'`, and `'Θ'.toLowerCase()` is `'θ'` — a
       * DIFFERENT letter. On it/symbol/simbolo-theta, whose subject is exactly
       * the difference between θ and ϑ, that silently rewrote the character
       * the sentence is about. `'ß'.toUpperCase()` is `'SS'`, two letters for
       * one. The significance verifier refused the file, which is what it is
       * for; this is the fix rather than the workaround.
       *
       * Where the pair does not round-trip, the full stop still applies and
       * the letter is left alone: a sentence opening with a lowercase Greek
       * letter is ordinary in mathematical prose.
       */
      const up = tail[li].toUpperCase();
      const safe = up.length === 1 && up.toLowerCase() === tail[li];
      return raw.slice(0, s) + '.' + gap(right, raw, e)
           + tail.slice(0, li) + (safe ? up : tail[li]) + tail.slice(li + 1);
    }
    // Only re-open a gap if what follows needs one. The dash may sit directly
    // against punctuation the sentence already carries (`… Zug —, schlägt`),
    // and an unconditional space writes `Zug) , schlägt`.
    case ':': mid = ':' + gap(right, raw, e); break;
    case ',': mid = ',' + gap(right, raw, e); break;
    case '(': mid = (left || ' ') + '('; break;
    case ')': mid = ')' + gap(right, raw, e); break;
    case '-': mid = (left === '' && right === '') ? ' – ' : left + '–' + right; break;
    case 'x': {
      // Collapse the dash away entirely, keeping one separator if the text
      // on either side would otherwise run together.
      const after = raw.slice(e), before = raw.slice(0, s);
      const glue = /^[\s,.;:!?)\]]/.test(after) || /[([\s]$/.test(before) ? '' : ' ';
      return before + glue + after;
    }
    default: return null;
  }
  return raw.slice(0, s) + mid + raw.slice(e);
}


/** The node is the entire content of its parent and is just the dash:
 *  `<td>—</td>` is a data cell meaning "none", not prose. Deliberately NOT
 *  matched: a node that merely STARTS with a dash (`— <strong>Profil…`), which
 *  is a list marker and ordinary punctuation — 461 nodes look like that. */
function isLoneSpecimen(node) {
  const kids = (node.parent && node.parent.children) || [];
  return kids.length === 1 && kids[0] === node && /^[\s—]*—[\s—]*$/.test(node.data);
}

/* ---- the judgement ledger ---------------------------------------------- */
/**
 * data/em_dash_rewrites.json holds the ~28% the planner refuses, where
 * choosing between a full stop and a colon means reading the sentence. Key is
 * the block's whitespace-collapsed text, value is one remedy code per em dash
 * in that block, in order, so one entry covers every page carrying it.
 *
 * A ledger like every other one here: entries are decisions, never added to
 * make a gate pass. An unjudged block is left exactly as it is and reported.
 */
const LEDGER_PATH = path.join(REPO, 'data/em_dash_rewrites.json');
const LEDGER = fs.existsSync(LEDGER_PATH)
  ? JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8')) : { entries: {} };
const JUDGED = LEDGER.entries || {};
/**
 * `tails` is the same kind of decision as `entries`, keyed by what FOLLOWS
 * the dash rather than by the whole block — because one CTA sentence recurs
 * verbatim across dozens of pages that are otherwise unrelated, and 110
 * identical judgements is not 110 decisions. Matched on the exact remainder
 * sentence, so it can never fire on a sentence somebody has not read. Ranked
 * by leverage, which is the method docs/em-dash-policy.md already prescribes
 * for this class of pass.
 */
const TAILS = LEDGER.tails || {};
const tailAfter = (text, at) => text.slice(at + 1).trim().split(/(?<=[.!?])\s/)[0];

/**
 * THE TAIL RULE MUST NOT REACH A TIGHT DASH.
 *
 * `planBlock` defers a dash that is not spaced on BOTH sides, because that
 * shape is a range, a compound or a specimen — never the `claim — elaboration`
 * joint this pass converts. The tail fallback then read the deferral as "no
 * decision yet" and applied one anyway, on a key it was never judged against.
 *
 * It deleted the em dash from `the em dash (—, U+2014).` in three specs
 * (en-dash, it/trattino-medio, nl/en-streep) — pages whose SUBJECT is that
 * character — because the tail `, U+2014).` matches a legitimate rule learned
 * from ` —,` on two German pages, where dropping the dash of a dash-comma pair
 * is right. The tail is the same string; the dash is not the same dash.
 *
 * The HTML pass was spared only by accident (its block stayed deferred), which
 * is why the damage showed up in the specs alone. Guarding at the one place
 * both passes resolve a tail is what keeps them from disagreeing again.
 */
const SPACED_AT = (text, at) => /[ \t]/.test(text[at - 1] || '') && /[ \t]/.test(text[at + 1] || '');
const tailRemedy = (TAILS, text, at) =>
  (at === undefined || !SPACED_AT(text, at)) ? null : (TAILS[tailAfter(text, at)] || null);
const collapse = (s) => s.replace(/\s+/g, ' ').trim();

/**
 * ONE OWNER FOR A STANDALONE STRING.
 *
 * Used by the spec pass and by data/accent_notice_copy.json, which is an
 * UPSTREAM rather than an output: the builder bakes it into 26 pages, so a
 * pass that converted the pages and not this file was undone by the next
 * bake. That happened twice. Reading it here is what makes the tree
 * reproducible from the ledger alone.
 */
function convertString(node, code, { rel, defer }) {
  const text = collapse(node);
  const plan = planBlock(text, 'p', code, null);
  const decided = JUDGED[text];
  const positions = [...text.matchAll(/—/g)].map((m) => m.index);
  // Tail rules apply here too. Reading only `entries` here let the two key
  // spaces disagree: a tail moved to a colon stayed a full stop in every
  // spec, which is how `Click any emoji or combo to copy it.` survived as a
  // standalone sentence in 36 of them.
  const remedies = plan.map((p, i) => {
    let r = (decided && decided[i] && decided[i] !== R.DEFER) ? decided[i] : p;
    if (r === R.DEFER) { const t = tailRemedy(TAILS, text, positions[i]); if (t) r = t; }
    return r;
  });
  settlePairs(plan, remedies);
  let cur = node;
  for (let i = remedies.length - 1; i >= 0; i--) {     // right to left, as above
    const remedy = remedies[i];
    if (!remedy || remedy === R.DEFER) { if (defer) defer.push({ rel, code, key: text, n: plan.length }); continue; }
    if (remedy === R.NOOP) continue;
    const nx = applyRemedy(cur, i, remedy);
    if (nx != null) cur = nx;
  }
  return cur;
}

/* ---- the accent-notice copy table --------------------------------------- */

const ACCENT_NOTICE = 'data/accent_notice_copy.json';
const ACCENT_TEXT_KEYS = new Set(['default', 'upsideDown']);

function convertAccentNotice({ write, defer }) {
  const abs = path.join(REPO, ACCENT_NOTICE);
  if (!fs.existsSync(abs)) return null;
  const src = fs.readFileSync(abs, 'utf8');
  if (!src.includes('\u2014')) return null;
  let parsed; try { parsed = JSON.parse(src); } catch { return null; }

  const subs = [];
  for (const [code, entry] of Object.entries(parsed.locales || {})) {
    if (!IN_SCOPE.has(String(code).toLowerCase()) || !entry) continue;
    for (const [k, v] of Object.entries(entry)) {
      if (!ACCENT_TEXT_KEYS.has(k) || typeof v !== 'string' || !v.includes('\u2014')) continue;
      const cur = convertString(v, String(code).toLowerCase(), { rel: ACCENT_NOTICE, defer });
      if (cur !== v) subs.push([v, cur]);
    }
  }
  if (!subs.length) return null;

  let out = src;                                        // patched as text, never re-serialised
  for (const [a, b] of subs) {
    const from = JSON.stringify(a).slice(1, -1), to = JSON.stringify(b).slice(1, -1);
    if (out.includes(from)) out = out.split(from).join(to);
  }
  if (out === src) return null;
  try { JSON.parse(out); } catch { return { rel: ACCENT_NOTICE, code: 'multi', refused: true }; }
  if (write) fs.writeFileSync(abs, out);
  return { rel: ACCENT_NOTICE, code: 'multi', strings: subs.length };
}

/* ---- the file pass ------------------------------------------------------ */

function convertFile(rel, { write, defer }) {
  const abs = path.join(REPO, rel);
  const code = localeOf(rel);
  if (!IN_SCOPE.has(code)) return null;
  const html = fs.readFileSync(abs, 'utf8');
  if (!html.includes('—')) return null;

  const $ = cheerio.load(html, { sourceCodeLocationInfo: true });
  if (isSubject(enParentOf($, rel))) return null;
  const body = $('body')[0];
  if (!body) return null;

  const excluded = new Set();
  for (const sel of [...DROP_SELECTORS, ...UI_SELECTORS, ...HELD]) $(sel).each((_, el) => excluded.add(el));
  const isExcluded = (node) => { for (let n = node; n; n = n.parent) if (excluded.has(n)) return true; return false; };

  /**
   * WHAT THE PAGE ALSO SAYS WHERE THIS PASS CANNOT REACH.
   *
   * The `events/*` template renders its FAQ inside `<footer>`, which is
   * dropped, so the intro paragraph converted while the footer's copy of the
   * same sentence could not — and the page then showed one sentence two ways.
   * A sentence with a twin in a held or dropped region is therefore deferred
   * rather than converted: the same both-or-neither rule the paired-aside
   * guard applies inside a sentence, applied across the exclusion boundary.
   * 40 characters keeps a nav label or a heading from matching prose.
   */
  const notATwin = (el) => {
    const t = (el.tagName || '').toLowerCase();
    if (t === 'style' || t === 'noscript' || t === 'template') return true;
    // The JSON-LD is this pass's own MIRROR TARGET, not an independent twin:
    // counting it here deferred every sentence the schema repeats (2,435
    // extra blocks) and left the mirror nothing to replay. Every OTHER inline
    // script IS a twin - `cs/usecase/pismo-pro-bio` renders its compatibility
    // note from a `note:` string in page JS, so converting only the static
    // span left the visitor reading the dash the moment that script ran.
    return t === 'script' && /ld\+json/i.test($(el).attr('type') || '');
  };
  const heldText = [...excluded].filter((el) => !notATwin(el))
    .map((el) => $(el).text()).join(' \u0000 ').replace(/\s+/g, ' ');
  const TWIN_MIN = 40;
  const hasHeldTwin = (blockText, at) => {
    const s0 = blockText.lastIndexOf('. ', at), s1 = blockText.indexOf('. ', at);
    const sent = blockText.slice(s0 === -1 ? 0 : s0 + 2, s1 === -1 ? blockText.length : s1 + 1)
      .replace(/\s+/g, ' ').trim();
    return sent.length >= TWIN_MIN && sent.includes('—') && heldText.includes(sent);
  };

  /**
   * Gather EVERY non-excluded text node, grouped by block, in document order —
   * not just the dash-bearing ones, and never via $(block).text().
   *
   * The plan is indexed by dash ORDINAL and the edits are applied by dash
   * ordinal within each node. Those two agree only if both are counted over
   * the same character stream. $(block).text() includes excluded descendants
   * whose dashes the edit walk skips, so every later ordinal in that block
   * shifts by one and lands on the wrong dash. Building the block's text FROM
   * the nodes makes the alignment structural rather than something to get
   * right.
   */
  const blocks = new Map();
  (function walk(node) {
    if (!node) return;
    if (node.type === 'text') {
      if (isExcluded(node.parent)) return;
      let b = node.parent;
      while (b && b.parent && !BLOCK_RE.test(b.name || '')) b = b.parent;
      b = b || body;
      if (!blocks.has(b)) blocks.set(b, []);
      blocks.get(b).push(node);
      return;
    }
    for (const c of node.children || []) walk(c);
  })(body);

  const edits = [];
  const pairs = [];
  const deferred = [];
  let judged = 0, auto = 0;

  for (const [b, nodes] of blocks) {
    if (!nodes.some((n) => n.data.includes('—'))) continue;
    const noop = new Set();
    /**
     * WHAT THE BLOCK TEXT CANNOT SEE.
     *
     * `walk` skips excluded nodes, so an inline `code`/`kbd`/`var` between two
     * text nodes closes the gap and makes their characters look adjacent. On
     * `… <code>_</code> and <code>.</code> — nothing else.` the block text
     * reads `_ and — nothing else`: the FULL STOP, which is the content being
     * listed, is invisible, and the joint took a colon — `_ and .: nothing
     * else` on 16 Discord guide pages in as many languages.
     *
     * The character is still in the SOURCE, between the two nodes' offsets.
     * Reading it there feeds the guard without changing `blockText`, which is
     * the ledger's key — recomputing that would orphan every judged block
     * holding an inline element.
     */
    const deferOrd = new Set();
    let ord = 0, buf = '', prevEnd = null;
    for (const n of nodes) {
      const c = (n.data.match(/—/g) || []).length;
      if (isLoneSpecimen(n)) for (let i = 0; i < c; i++) noop.add(ord + i);
      if (c && prevEnd != null && n.sourceCodeLocation) {
        const between = html.slice(prevEnd, n.sourceCodeLocation.startOffset);
        const gap = between.replace(/<[^>]*>/g, '').trimEnd();
        const lead = n.data.slice(0, n.data.indexOf('—')).trim();
        if (!lead && /[.,:;!?]$/.test(gap)) deferOrd.add(ord);
        /**
         * A DASH THAT OPENS A LINE IS A BULLET, NOT A JOINT.
         *
         * `<strong>Melyik milyen érzést ad</strong><br>\n    — Kézírás (…)`
         * collapses to one block, so the label rule saw a 22-character
         * clause before the dash and wrote `: Kézírás` at the START of the
         * rendered row. The rule cannot tell a list marker from a gloss
         * because the line break is markup, not text; only the source gap
         * shows it. Deferred rather than marked no-op: the row still wants
         * the locale's own bullet, which is a judgement.
         */
        if (!lead && /<br\s*\/?>/i.test(between)) deferOrd.add(ord);
      }
      ord += c; buf += n.data;
      if (n.sourceCodeLocation) prevEnd = n.sourceCodeLocation.endOffset;
    }
    const blockText = collapse(buf);
    const tag = (b.name || 'p').toLowerCase();
    const plan = planBlock(blockText, tag, code, noop, deferOrd);
    const decided = JUDGED[blockText];

    /* Settled for the WHOLE block before any node is touched: a partner can
     * live in a different text node from the dash it closes, so a per-node
     * decision cannot see the pair. `origin` keeps the per-dash accounting
     * the node loop below reports. */
    const dashAt = [...blockText.matchAll(/—/g)].map((m) => m.index);
    const remedies = [], origin = [];
    for (let g = 0; g < plan.length; g++) {
      if (decided && decided[g] && decided[g] !== R.DEFER) { remedies[g] = decided[g]; origin[g] = 'judged'; continue; }
      const p0 = plan[g];
      if (p0 === R.DEFER || p0 === undefined) {
        const t = tailRemedy(TAILS, blockText, dashAt[g]);
        if (t) { remedies[g] = t; origin[g] = 'judged'; } else { remedies[g] = null; origin[g] = 'defer'; }
        continue;
      }
      remedies[g] = p0; origin[g] = p0 === R.NOOP ? 'noop' : 'auto';
    }
    for (let g = 0; g < plan.length; g++) {
      if (origin[g] !== 'defer' && origin[g] !== 'noop' && hasHeldTwin(blockText, dashAt[g])) {
        remedies[g] = null; origin[g] = 'defer';
      }
    }
    for (const g of settlePairs(plan, remedies)) { remedies[g] = null; origin[g] = 'defer'; }

    let seenInBlock = 0;
    for (const bn of nodes) {
      const loc = bn.sourceCodeLocation;
      const dataDashes = (bn.data.match(/—/g) || []).length;
      if (!dataDashes) continue;
      if (!loc) { seenInBlock += dataDashes; continue; }
      const raw = html.slice(loc.startOffset, loc.endOffset);
      // An em dash is never written as an entity here; if raw and decoded
      // disagree the offsets cannot be trusted, so leave the node rather than
      // guess. This is what keeps &amp; &lt; &gt; intact — 155 of them were
      // destroyed the first time by writing cheerio's decoded .data back.
      if (dataDashes !== (raw.match(/—/g) || []).length) { seenInBlock += dataDashes; continue; }

      /**
       * RIGHT TO LEFT, and indexed plainly.
       *
       * Replacing a dash removes it from `cur`, so going forwards every later
       * ordinal shifts: the second half of a paired aside was never found and
       * `(Xīnnián kuàilè) — literally 'New Year happy' —` shipped as
       * `…), literally 'New Year happy' —` — one comma, one dash, an aside
       * closed with the wrong mark. A `skipped` counter cannot fix it either,
       * because a NOOP dash is still a dash in `cur`; that mis-correction is
       * what turned `em-streep (—) — ook` into `(: ) —`. Descending, index i
       * always names the i-th dash of the original node, because everything
       * already replaced sits to its right.
       */
      let cur = raw;
      const applied = new Array(dataDashes).fill(null);   // for the JSON-LD mirror
      for (let i = dataDashes - 1; i >= 0; i--) {
        const g = seenInBlock + i;
        const remedy = remedies[g];
        if (origin[g] === 'judged') judged++;
        else if (origin[g] === 'auto') auto++;
        else if (origin[g] === 'defer') deferred.push({ rel, code, key: blockText, n: plan.length });
        if (!remedy || remedy === R.NOOP) continue;
        /**
         * A DASH THAT OPENS ITS OWN TEXT NODE CANNOT BE CONVERTED HERE.
         *
         * The space before it lives in the PREVIOUS node, which this
         * one-node edit cannot reach, so `Heading <span>— optional</span>`
         * became `Heading <span>: optional</span>` and rendered
         * `Heading : optional` on five printables pages. `gap()` owns the
         * space after the mark; nothing owns the space before it across a
         * node boundary. A node-initial dash is either this case or the
         * block-edge case the plan already protects, so skipping it loses
         * nothing that was convertible.
         */
        if (i === 0 && /^—/.test(raw)) continue;
        const next = applyRemedy(cur, i, remedy);
        if (next != null) { cur = next; applied[i] = remedy; }
      }
      seenInBlock += dataDashes;
      if (cur !== raw) {
        edits.push({ start: loc.startOffset, end: loc.endOffset, next: cur, prev: raw });
        if (collapse(raw).length >= 12) pairs.push([raw, cur, applied]);
      }
    }
  }

  if (defer) for (const d of deferred) defer.push(d);
  if (!edits.length) return null;

  let out = html;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.next + out.slice(e.end);
  const mirror = syncJsonLdMirror(out, pairs);
  out = mirror.html;

  // THE VERIFIER. The same function the sitemap uses, so "no <lastmod>
  // advances" is measured rather than argued — and because it strips
  // punctuation and case-folds, it equally proves no word was added, dropped
  // or changed by any of the five remedies.
  if (significanceHash(html) !== significanceHash(out)) return { rel, code, refused: true, nodes: edits.length };
  if (write) fs.writeFileSync(abs, out);
  return { rel, code, nodes: edits.length, auto, judged, deferred: deferred.length, mirror: mirror.changed };
}


/* ---- JSON-LD mirror ----------------------------------------------------- */
/**
 * Unchanged in purpose from the first version and changed in mechanism: the
 * conversion is no longer a pure function of the character, so the mirror
 * cannot re-derive it. It replays the exact (before -> after) pairs this file
 * just applied to its visible text, which by construction converts only the
 * strings whose visible twin moved and leaves a held slot's mirror alone.
 *
 * check-faq-schema cannot see this split — it compares content tokens with a
 * 4-token tolerance and punctuation is not a content token — which is exactly
 * why it has to be done here. It was 453 pages and 1,061 string pairs the
 * first time it was missed.
 */
const LD_BLOCK = /(<script[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g;
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');

function syncJsonLdMirror(html, pairs) {
  if (!pairs.length) return { html, changed: 0 };
  const flat = (s) => s.replace(/\s+/g, ' ').trim();
  const visible = flat(decode(html.replace(LD_BLOCK, '')));

  /**
   * THE MATCHING UNIT IS A SENTENCE, NOT A NODE.
   *
   * A JSON-LD answer is frequently a SHORTENED retelling of the visible one
   * (on bs/goticka-slova the visible node is 438 characters and its schema
   * twin 391), so the node text is not a substring of the value and a
   * whole-node test mirrors nothing. A sentence survives that: it is also the
   * unit Google compares a FAQ answer on. The whole node is kept as the first
   * candidate so an exact page still matches in one step; once it has
   * converted, its sentences no longer carry a dash and cannot match again.
   */
  const SENT = /[^.!?…]*[.!?…]+["'\u2019\u201d)\]]*|[^.!?…]+$/g;
  const units = [];
  for (const [a0, b0, rem] of pairs) {
    const a = flat(decode(a0));
    if (!a.includes('—') || a.length < 12) continue;
    const marks = rem || [];
    units.push([a, marks]);
    let k = 0;
    for (const sm of a.match(SENT) || []) {
      const n = (sm.match(/—/g) || []).length;
      const t = sm.trim();
      if (n && t.length >= 25 && t !== a) units.push([t, marks.slice(k, k + n)]);
      k += n;
    }
  }
  const dec = units
    .filter(([a]) => !visible.includes(a))
    .sort((x, y) => y[0].length - x[0].length);   // longest first: never a partial hit
  if (!dec.length) return { html, changed: 0 };

  /**
   * A QUOTE IS NOT THE SAME CHARACTER ON BOTH SIDES.
   *
   * A double quote inside a JSON string has to be escaped, so these pages
   * were authored with the JSON-LD twin carrying `'ASCII art'` where the
   * visible text carries `"ASCII art"`. An exact test missed every sentence
   * containing a quotation. Any quote matches any quote, and a run of
   * whitespace matches a run of any length.
   */
  const QUOTES = /["'\u2018\u2019\u201c\u201d\u00ab\u00bb]/g;
  const loose = (a) => new RegExp(
    a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ +/g, '\\s+')
     .replace(QUOTES, '["\'\u2018\u2019\u201c\u201d\u00ab\u00bb]'), 'g');

  let changed = 0;
  const out = html.replace(LD_BLOCK, (m, open, bodyText, close) => {
    const next = bodyText.replace(/"(?:[^"\\]|\\.)*"/g, (lit) => {
      if (!lit.includes('—')) return lit;
      let parsed; try { parsed = JSON.parse(lit); } catch { return lit; }
      let v = parsed;
      let openedGap = false;
      for (const [a, marks] of dec) {
        if (!v.includes('—')) break;
        const want = (a.match(/—/g) || []).length;
        /**
         * THE MATCHED SPAN IS EDITED, NOT REPLACED.
         *
         * Writing the converted text over the match would carry the VISIBLE
         * side's quote characters into the JSON-LD and rewrite text this pass
         * has no business touching. Running the node's own remedies over the
         * span moves exactly the dashes and leaves every other character of
         * the value as its author wrote it.
         */
        v = v.replace(loose(a), (span) => {
          if ((span.match(/—/g) || []).length !== want) return span;
          let edited = span;
          for (let k = marks.length - 1; k >= 0; k--) {
            if (!marks[k] || marks[k] === R.NOOP) continue;
            const nx = applyRemedy(edited, k, marks[k]);
            if (nx != null) edited = nx;
          }
          if (edited !== span) changed++;
          if (/^[:,.)]/.test(edited)) openedGap = true;
          return edited;
        });
      }
      /**
       * The matched span began AFTER the space preceding its dash - that
       * space sits between `</strong>` and the text node, so it is not part
       * of the node and `applyRemedy` cannot see it. Left alone it reads
       * `Bold : sans, serif` in 17 schema strings. Closed only when a span
       * actually started with a mark, so a locale that spaces its colons is
       * never touched by a page this pass did not edit that way.
       */
      if (openedGap) v = v.replace(/[ \t]+([:,.)])/g, '$1');
      return v === parsed ? lit : JSON.stringify(v);
    });
    return open + next + close;
  });
  return { html: out, changed };
}

/* ---- upstream: the page specs ------------------------------------------ */
/**
 * Fixing only the rendered HTML is undone by the next generator run, which
 * CLAUDE.md names explicitly. The locale specs under
 * data/library_page_specs/<lang>/ are that upstream and a `*.json` glob does
 * not see them — they are a second set of 885 beside the 628 at the top.
 *
 * Keys are allowlisted, never swept: `char` is the copy payload and the em
 * dash IS the product there; title/meta_description/hero_h1 are the churn
 * class held by policy §3; `symbols[].label` is captured as `ui` rather than
 * as an editorial slot, so the HTML pass does not touch it either and the two
 * stay in step.
 */
const SPEC_TEXT_KEYS = new Set(['hero_tagline', 'intro', 'h2', 'desc', 'text', 'body', 'answer',
  'question', 'cta', 'note', 'notes', 'lead', 'summary', 'caption', 'blurb']);
const SPEC_NEVER = new Set(['char', 'title', 'meta_description', 'hero_h1', 'label', 'slug', 'id', 'url', 'href', 'date']);

function convertSpec(rel, { write, defer }) {
  const abs = path.join(REPO, rel);
  const src = fs.readFileSync(abs, 'utf8');
  if (!src.includes('—')) return null;
  /**
   * THE SPEC'S OWN `lang`, which is what the generator reads
   * (generate_library_page_from_spec.py: `spec.get("lang", "en")`), never the
   * path and never the filename.
   *
   * 301 locale specs live at the TOP level of data/library_page_specs/ as
   * `<lang>-<slug>.json`, so a directory-only rule calls every one of them
   * English. That was harmless while English was out of scope and became a
   * scope violation the moment it came in: 14 `ru-`, 21 `fr-`, 12 `pt-`, 8
   * `pl-` and 3 `es-` specs belong to NATIVE-dash locales that must never be
   * touched. A filename prefix is not a safe substitute either — `pi-`,
   * `om-` and `ml-` are English specs about pi, om and millilitres.
   */
  let parsed;
  try { parsed = JSON.parse(src); } catch { return null; }
  const code = String(parsed.lang || 'en').toLowerCase();
  if (!IN_SCOPE.has(code)) return null;

  const subs = [];
  (function walk(node, key) {
    if (typeof node === 'string') {
      if (!node.includes('—') || SPEC_NEVER.has(key) || !SPEC_TEXT_KEYS.has(key)) return;
      const cur = convertString(node, code, { rel, defer });
      if (cur !== node) subs.push([node, cur]);
      return;
    }
    if (Array.isArray(node)) { for (const v of node) walk(v, key); return; }
    if (node && typeof node === 'object') { for (const [k, v] of Object.entries(node)) walk(v, k); }
  })(parsed, null);

  if (!subs.length) return null;
  // Patch the TEXT, never round-trip: 637 of the 1,555 specs do not survive
  // JSON.parse -> JSON.stringify(null, 2) byte for byte, so a re-serialising
  // writer reformats a third of the corpus and buries the real change.
  let out = src;
  for (const [a, b] of subs) {
    const from = JSON.stringify(a).slice(1, -1), to = JSON.stringify(b).slice(1, -1);
    if (out.includes(from)) out = out.split(from).join(to);
  }
  if (out === src) return null;
  try { JSON.parse(out); } catch { return { rel, code, refused: true }; }
  if (write) fs.writeFileSync(abs, out);
  return { rel, code, strings: subs.length };
}


/* ---- CLI ---------------------------------------------------------------- */

function listFiles(args) {
  const i = args.indexOf('--files');
  if (i !== -1) return args.slice(i + 1).filter((a) => !a.startsWith('--'));
  const out = execSync(
    "git ls-files '*/index.html' 'index.html' 'data/library_page_specs/**/*.json' 'data/library_page_specs/*.json'",
    { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.trim().split('\n').filter(Boolean);
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const deferOutIdx = args.indexOf('--defer-out');
  const deferOut = deferOutIdx === -1 ? null : args[deferOutIdx + 1];
  const defer = [];
  const files = listFiles(args);

  const done = [], refused = [];
  let nodes = 0, autoN = 0, judgedN = 0, specs = 0, mirrors = 0;
  {
    const an = convertAccentNotice({ write, defer });
    if (an) (an.refused ? refused : done).push(an);
  }
  for (const rel of files) {
    const r = rel.endsWith('.json') ? convertSpec(rel, { write, defer }) : convertFile(rel, { write, defer });
    if (!r) continue;
    if (r.refused) { refused.push(r); continue; }
    done.push(r);
    if (r.strings) { specs += r.strings; continue; }
    nodes += r.nodes; autoN += r.auto || 0; judgedN += r.judged || 0; mirrors += r.mirror || 0;
  }

  // group the deferrals by their ledger key so one decision covers every page
  const byKey = new Map();
  for (const d of defer) {
    const e = byKey.get(d.key) || { key: d.key, code: d.code, n: d.n, pages: 0 };
    e.pages++; byKey.set(d.key, e);
  }
  const pending = [...byKey.values()].sort((a, b) => b.pages - a.pages);

  console.log(`files changed      ${done.length}${write ? '' : '   (dry run — pass --write)'}`);
  console.log(`  text nodes       ${nodes}`);
  console.log(`  auto remedies    ${autoN}    (colon / comma / brackets — never a full stop)`);
  console.log(`  judged remedies  ${judgedN}    (from data/em_dash_rewrites.json)`);
  console.log(`  json-ld mirrored ${mirrors}`);
  console.log(`  spec strings     ${specs}`);
  console.log(`REFUSED by the significance verifier: ${refused.length}`);
  for (const r of refused.slice(0, 20)) console.log(`   ! ${r.rel}`);
  console.log(`deferred for judgement: ${defer.length} occurrences in ${pending.length} distinct blocks`);
  if (deferOut) {
    fs.writeFileSync(deferOut, JSON.stringify(pending, null, 1));
    console.log(`  written to ${deferOut}`);
  }
  if (refused.length) process.exitCode = 1;
}

if (require.main === module) main();
