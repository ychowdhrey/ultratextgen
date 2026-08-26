#!/usr/bin/env node
'use strict';

/**
 * mine-editorial-phrases.js
 *
 * Discovers this site's OWN editorial fingerprints, rather than testing it
 * against a borrowed list of famous "AI words".
 *
 * That choice is not stylistic. Run against the EN corpus, the widely-cited
 * marker list scores close to zero here: `delve`, `showcase`, `tapestry`,
 * `in today's`, `at its core`, `when it comes to`, `it is worth noting`,
 * `robust`, `vibrant`, `pivotal` and `comprehensive` occur **0 times** across
 * 911 English pages; `crucial`, `powerful` and `effortlessly` occur once each.
 * A system built on that list would have found nothing and reported success.
 *
 * Two of the list's apparent hits are worse than misses, and both are real:
 *   · `transform` — 911 occurrences on 443 pages — is the shared CTA card
 *     ("Transform text with Unicode fonts"). One template string, not a habit.
 *   · `underscore` — 169 occurrences on 65 pages — is the CHARACTER `_`, in
 *     factual platform username rules. Banning it would delete facts.
 *
 * ── The distinction the miner exists to draw ───────────────────────────────
 * Page frequency alone cannot tell a template from a habit, and they need
 * opposite fixes. So every pattern also carries `distinctSentences`: how many
 * DIFFERENT sentences it occurs in.
 *
 *   pages 400, distinct sentences 1   -> one shared string. Fix the template.
 *   pages 400, distinct sentences 380 -> an editorial habit. Fix the writing.
 *
 * The ratio is reported as `variety`. Nothing else in the system can recover
 * this once the counts are aggregated, which is why it is computed here.
 *
 * Usage:
 *   node scripts/mine-editorial-phrases.js                    # EN, to stdout
 *   node scripts/mine-editorial-phrases.js --locale es
 *   node scripts/mine-editorial-phrases.js --all --json out.json
 *   node scripts/mine-editorial-phrases.js --report docs/x.md
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const {
  extractPage, editorialText, proseText, joinSlots, sentences, words, clean
} = require('./lib/editorial-corpus');

const ROOT = path.resolve(__dirname, '..');
const IGNORE = [
  'node_modules/**', 'assets/**', 'scripts/**', 'docs/**', 'js/**',
  'functions/**', '.github/**', 'data/**', 'reports/**', 'embed/**', 'locales/**'
];

/** A locale needs this many pages before phrase mining says anything real. */
const MIN_LOCALE_PAGES = 40;

/** Report an n-gram only at/above these floors. */
const MIN_PAGES = 5;

// ── pattern families that are structural, not lexical ───────────────────────

/**
 * Negative parallelism: "not just X but Y", "not only X but also Y",
 * "it isn't X, it's Y", "less about X, more about Y".
 * Pew's corpus analysis reports this construction nearly TRIPLED on the web
 * post-2023, which is why it gets its own detector rather than living in the
 * n-gram soup where its variants would each fall below the floor.
 */
const NEGATIVE_PARALLELISM = [
  /\bnot just\b[^.!?]{2,60}?\b(?:but|it['’]s|they['’]re)\b/gi,
  /\bnot only\b[^.!?]{2,60}?\bbut\b/gi,
  /\b(?:isn['’]t|aren['’]t|is not|are not)\b[^.!?]{2,50}?[,;]\s*(?:it['’]s|they['’]re|but)\b/gi,
  /\bless about\b[^.!?]{2,50}?\bmore about\b/gi,
  /\bmore than just\b/gi,
  /\bit['’]s not\b[^.!?]{2,50}?[,;]\s*it['’]s\b/gi
];

/** Manufactured contrast openers that carry no information. */
const GENERIC_OPENER = [
  /^\s*(?:in today['’]s|in the world of|in an era)\b/i,
  /^\s*(?:whether you(?:['’]re| are)?)\b/i,
  /^\s*(?:looking for|if you(?:['’]re| are) looking)\b/i,
  /^\s*(?:when it comes to|at its core|let['’]s (?:dive|explore))\b/i,
  /^\s*(?:it['’]s (?:important|worth) (?:to note|noting)|it is (?:important|worth))\b/i
];

/** Abstract benefit claims with no observable referent. */
const PROMOTIONAL = [
  /\b(?:perfect|ideal|great|excellent) for\b/gi,
  /\b(?:stand|standing) out\b/gi,
  /\b(?:take|takes|elevate|elevates) (?:your|it) [^.!?]{0,30}?to the next level\b/gi,
  /\b(?:seamless|seamlessly|effortless|effortlessly|versatile|robust|vibrant|cutting[- ]edge|game[- ]chang\w+)\b/gi,
  /\b(?:unlock|unleash|supercharge|transform your|elevate your|revolutioni[sz]e)\b/gi,
  /\b(?:powerful|amazing|stunning|beautiful|incredible|awesome) (?:tool|way|feature|option|collection|generator)\b/gi,
  /\b(?:designed to|built to|crafted to)\b/gi,
  /\b(?:easy to use|user[- ]friendly|make it easy|makes it easy)\b/gi
];

/** Concrete-information markers — the counterweight to PROMOTIONAL. */
const SPECIFICITY = [
  { rx: /U\+[0-9A-Fa-f]{4,6}/g, kind: 'codepoint' },
  { rx: /\bUnicode\s+\d+(?:\.\d+)?\b/gi, kind: 'unicode-version' },
  { rx: /\bAlt\s*\+?\s*\d{3,5}\b/gi, kind: 'alt-code' },
  { rx: /\b\d{1,4}\s*(?:characters?|chars?|bytes?|codepoints?|pixels?|px|dpi)\b/gi, kind: 'limit' },
  { rx: /\b(?:UTF-8|UTF-16|NFC|NFD|NFKC|NFKD|ASCII|GSM-7|ISO[- ]8859)\b/g, kind: 'encoding' },
  { rx: /\b(?:combining|diacritic|ligature|grapheme|glyph|codepoint|surrogate|zero[- ]width|variation selector)\b/gi, kind: 'terminology' },
  { rx: /\b(?:Discord|Instagram|TikTok|LinkedIn|WhatsApp|Roblox|Snapchat|Telegram|YouTube|Facebook|Pinterest|Threads|Fortnite|PUBG)\b/g, kind: 'platform' },
  { rx: /\b(?:Windows|macOS|iOS|Android|Linux|Chrome|Safari|Firefox|Edge)\b/g, kind: 'environment' },
  { rx: /\b(?:does not|doesn['’]t|will not|won['’]t|cannot|can['’]t|is rejected|is stripped|falls back|renders as)\b/gi, kind: 'constraint' },
  { rx: /\b(?:for example|e\.g\.|such as|like this:|for instance)\b/gi, kind: 'example' }
];

// ── helpers ────────────────────────────────────────────────────────────────

/**
 * Is this masked 5-gram worth reporting? It must contain a mask (otherwise it
 * is an ordinary n-gram, already covered), at most three masks (otherwise it is
 * mostly holes), and at least two surviving CONTENT words — tokens common
 * enough to be kept by the mask but not among the locale's 40 function words.
 */
function informativeSkeleton(g, functionWords) {
  const toks = g.split(' ');
  const masks = toks.filter((t) => t === '<X>').length;
  if (masks === 0 || masks > 3) return false;
  let content = 0;
  for (const t of toks) if (t !== '<X>' && !functionWords.has(t)) content++;
  return content >= 2;
}

function ngrams(toks, n) {
  const out = [];
  for (let i = 0; i + n <= toks.length; i++) out.push(toks.slice(i, i + n).join(' '));
  return out;
}

/**
 * Template skeleton: mask every token that is NOT among the locale's most
 * common tokens. "Make your Discord name stand out with symbols" and "Make your
 * Roblox bio stand out with fonts" both collapse to
 * "make your <X> <X> stand out with <X>", so a template survives its own
 * per-page nouns — which is exactly what page-specific substitution hides.
 */
function skeletonize(toks, commonSet) {
  return toks.map((t) => (commonSet.has(t) ? t : '<X>'));
}

function bump(map, key, page) {
  let e = map.get(key);
  if (!e) { e = { count: 0, pages: new Set(), sentences: new Set() }; map.set(key, e); }
  e.count++;
  e.pages.add(page);
  return e;
}

function finalize(map, minPages, totalPages) {
  const out = [];
  for (const [k, e] of map) {
    if (e.pages.size < minPages) continue;
    out.push({
      pattern: k,
      count: e.count,
      pages: e.pages.size,
      pagePct: +(100 * e.pages.size / totalPages).toFixed(2),
      distinctSentences: e.sentences.size || null,
      variety: e.sentences.size ? +(e.sentences.size / e.pages.size).toFixed(2) : null
    });
  }
  out.sort((a, b) => b.pages - a.pages || b.count - a.count);
  return out;
}

// ── the mine ───────────────────────────────────────────────────────────────

function loadCorpus(cacheFile) {
  if (cacheFile && fs.existsSync(cacheFile)) {
    return fs.readFileSync(cacheFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  }
  const files = globSync('**/*.html', { cwd: ROOT, ignore: IGNORE }).sort();
  const pages = [];
  for (const rel of files) {
    let pg;
    try { pg = extractPage(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel); } catch { continue; }
    if (pg) pages.push(pg);
  }
  return pages;
}

function mine(pages, locale) {
  const set = pages.filter((p) => p.locale === locale);
  const N = set.length;
  if (!N) return null;

  // Locale token frequency, for skeletonisation.
  const df = new Map();
  for (const p of set) {
    for (const w of new Set(words(editorialText(p)))) df.set(w, (df.get(w) || 0) + 1);
  }
  const ranked = [...df.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w);
  const common = new Set(ranked.slice(0, 300));
  // The top ~40 tokens of any locale are its function words (the, and, to, of).
  // A skeleton built only from those plus masks — `<X> and the <X> <X>` — is
  // grammar, not a template, and it drowns the real findings: the first run of
  // this miner returned 18 such rows above `<X> click any symbol to`, which is
  // the actual 132-page template string. A skeleton must therefore carry at
  // least two CONTENT words that survived masking.
  const functionWords = new Set(ranked.slice(0, 40));

  const maps = {
    words: new Map(), bi: new Map(), tri: new Map(), quad: new Map(),
    skeleton: new Map(), sentenceOpening: new Map(), paragraphOpening: new Map(),
    closing: new Map(), cta: new Map(), rhetorical: new Map(),
    negativeParallelism: new Map(), threeItem: new Map(), genericOpener: new Map(),
    promotional: new Map(), templateString: new Map()
  };
  const specificity = new Map();

  for (const p of set) {
    const rel = p.rel;
    const ed = editorialText(p);
    const edToks = words(ed);
    for (const w of edToks) bump(maps.words, w, rel);

    // n-grams over running prose only, so tile labels cannot manufacture them.
    const proseBlocks = joinSlots(p, ['prose', 'faqAnswers']);
    for (const block of proseBlocks) {
      const toks = words(block);
      for (const n of [2, 3, 4]) {
        const key = n === 2 ? 'bi' : n === 3 ? 'tri' : 'quad';
        for (const g of ngrams(toks, n)) bump(maps[key], g, rel);
      }
      for (const g of ngrams(skeletonize(toks, common), 5)) {
        if (!informativeSkeleton(g, functionWords)) continue;
        bump(maps.skeleton, g, rel);
      }
      const first = words(block).slice(0, 4).join(' ');
      if (first) bump(maps.paragraphOpening, first, rel);

      for (const s of sentences(block)) {
        const open = words(s).slice(0, 3).join(' ');
        if (open) bump(maps.sentenceOpening, open, rel);
        if (/\?\s*$/.test(s)) bump(maps.rhetorical, clean(s).toLowerCase(), rel);
        for (const rx of NEGATIVE_PARALLELISM) {
          for (const m of s.match(rx) || []) {
            const e = bump(maps.negativeParallelism, m.toLowerCase().replace(/\s+/g, ' '), rel);
            e.sentences.add(clean(s).toLowerCase());
          }
        }
        for (const rx of GENERIC_OPENER) {
          const m = s.match(rx);
          if (m) {
            const e = bump(maps.genericOpener, m[0].toLowerCase().trim(), rel);
            e.sentences.add(clean(s).toLowerCase());
          }
        }
        for (const rx of PROMOTIONAL) {
          for (const m of s.match(rx) || []) {
            const e = bump(maps.promotional, m.toLowerCase(), rel);
            e.sentences.add(clean(s).toLowerCase());
          }
        }
        // three-item list: "A, B, and C" / "A, B and C"
        for (const m of s.match(/\b[\p{L}\p{N}'’-]+(?:\s+[\p{L}\p{N}'’-]+){0,2},\s+[\p{L}\p{N}'’-]+(?:\s+[\p{L}\p{N}'’-]+){0,2},\s+(?:and|or)\s+[\p{L}\p{N}'’-]+/giu) || []) {
          const e = bump(maps.threeItem, 'triad', rel);
          e.sentences.add(clean(m).toLowerCase());
        }
      }
      const ss = sentences(block);
      if (ss.length) {
        const last = words(ss[ss.length - 1]).slice(-4).join(' ');
        if (last) bump(maps.closing, last, rel);
      }
    }

    for (const c of joinSlots(p, ['cta'])) {
      const norm = clean(c).toLowerCase().slice(0, 160);
      if (norm) bump(maps.cta, norm, rel);
    }

    // Whole-sentence repeats: the template-string detector.
    for (const block of proseBlocks) {
      for (const s of sentences(block)) {
        const norm = clean(s).toLowerCase();
        if (norm.length < 25) continue;
        bump(maps.templateString, norm, rel);
      }
    }

    // Specificity inventory, distinct-hit based.
    const hits = new Map();
    for (const { rx, kind } of SPECIFICITY) {
      const found = new Set((ed.match(rx) || []).map((s) => s.toLowerCase()));
      if (found.size) hits.set(kind, found.size);
    }
    specificity.set(rel, Object.fromEntries(hits));
  }

  // Attach containing-sentence variety to the lexical n-grams.
  for (const p of set) {
    for (const block of joinSlots(p, ['prose', 'faqAnswers'])) {
      for (const s of sentences(block)) {
        const norm = clean(s).toLowerCase();
        const toks = words(s);
        for (const [n, key] of [[2, 'bi'], [3, 'tri'], [4, 'quad']]) {
          for (const g of ngrams(toks, n)) {
            const e = maps[key].get(g);
            if (e) e.sentences.add(norm);
          }
        }
        for (const g of ngrams(skeletonize(toks, common), 5)) {
          if (!informativeSkeleton(g, functionWords)) continue;
          const e = maps.skeleton.get(g);
          if (e) e.sentences.add(norm);
        }
      }
    }
  }

  const res = { locale, pages: N, patterns: {} };
  for (const [key, m] of Object.entries(maps)) {
    const floor = key === 'words' ? Math.max(MIN_PAGES, Math.ceil(N * 0.05)) : MIN_PAGES;
    res.patterns[key] = finalize(m, floor, N).slice(0, key === 'words' ? 200 : 120);
  }
  res.specificity = specificity;
  return res;
}

// ── report ─────────────────────────────────────────────────────────────────

/**
 * English-derived regex families. Reported for `en` only.
 *
 * Running them against a Turkish or Japanese page and printing "none above the
 * floor" reads as "this locale is clean", when what actually happened is that
 * the locale was never measured. That misreading is the exact bias the research
 * memo's §6 forbids, arriving through the report rather than through the score.
 */
const EN_ONLY_SECTIONS = new Set([
  'Negative parallelism', 'Generic introductions', 'Promotional vagueness'
]);

function section(title, rows, limit = 20, locale = 'en') {
  if (EN_ONLY_SECTIONS.has(title) && locale !== 'en') {
    return `### ${title}\n\n_Not measured for \`${locale}\`. This detector is an English regex family; ` +
      `applying it to another language and printing a zero would report "never measured" as "clean". ` +
      `An equivalent for \`${locale}\` needs \`${locale}\` corpus evidence, not a translation of the English one._\n\n`;
  }
  if (!rows || !rows.length) return `### ${title}\n\n_none above the floor._\n\n`;
  let s = `### ${title}\n\n| pattern | occurrences | pages | % of locale | distinct sentences | variety |\n|---|---:|---:|---:|---:|---:|\n`;
  for (const r of rows.slice(0, limit)) {
    const pat = r.pattern.length > 80 ? `${r.pattern.slice(0, 80)}…` : r.pattern;
    s += `| \`${pat.replace(/\|/g, '\\|')}\` | ${r.count} | ${r.pages} | ${r.pagePct}% | ${r.distinctSentences ?? '—'} | ${r.variety ?? '—'} |\n`;
  }
  return `${s}\n`;
}

function main() {
  const args = process.argv.slice(2);
  const get = (f) => { const i = args.indexOf(f); return i === -1 ? null : args[i + 1]; };
  const cache = get('--cache');
  const jsonOut = get('--json');
  const reportOut = get('--report');
  const all = args.includes('--all');
  const one = get('--locale') || 'en';

  const pages = loadCorpus(cache);
  const byLocale = new Map();
  for (const p of pages) byLocale.set(p.locale, (byLocale.get(p.locale) || 0) + 1);

  const locales = all
    ? [...byLocale.entries()].filter(([, n]) => n >= MIN_LOCALE_PAGES).map(([l]) => l).sort()
    : [one];

  const results = {};
  for (const loc of locales) {
    const r = mine(pages, loc);
    if (!r) continue;
    delete r.specificity;          // per-page, not a phrase-bank input
    results[loc] = r;
  }

  const belowFloor = [...byLocale.entries()]
    .filter(([, n]) => n < MIN_LOCALE_PAGES)
    .sort((a, b) => b[1] - a[1]);

  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify({ generated: 'mine-editorial-phrases', totalPages: pages.length, locales: results, belowFloor }, null, 1));
    console.log(`Wrote ${jsonOut}`);
  }

  let md = `# Editorial phrase-frequency report\n\nGenerated by \`scripts/mine-editorial-phrases.js\` over ${pages.length} pages.\n\n`;
  md += `Every table below carries **pages** (how many distinct pages the pattern occurs on) and **variety** (distinct containing sentences ÷ pages). Variety is the load-bearing column:\n\n`;
  md += `* **variety ≈ 0** — one shared string repeated verbatim. That is a **template**, and the fix is upstream, in the generator or the spec.\n`;
  md += `* **variety ≈ 1** — the same construction written many different times. That is an **editorial habit**, and the fix is in the writing.\n\n`;
  md += `Mixing the two is how a phrase bank ends up asking 400 pages to each hand-edit one string that has a single source.\n\n`;
  if (belowFloor.length) {
    md += `**Locales below the ${MIN_LOCALE_PAGES}-page mining floor** (structural dimensions only, no phrase rules): `;
    md += belowFloor.map(([l, n]) => `${l} (${n})`).join(', ');
    md += `.\n\n`;
  }
  for (const [loc, r] of Object.entries(results)) {
    md += `---\n\n## ${loc.toUpperCase()} — ${r.pages} pages\n\n`;
    md += section('Repeated whole sentences (template strings)', r.patterns.templateString, 20, loc);
    md += section('CTA constructions', r.patterns.cta, 12, loc);
    md += section('Template skeletons (page-specific nouns masked)', r.patterns.skeleton, 20, loc);
    md += section('4-grams', r.patterns.quad, 20, loc);
    md += section('3-grams', r.patterns.tri, 20, loc);
    md += section('Sentence openings', r.patterns.sentenceOpening, 15, loc);
    md += section('Paragraph openings', r.patterns.paragraphOpening, 15, loc);
    md += section('Closing constructions', r.patterns.closing, 12, loc);
    md += section('Negative parallelism', r.patterns.negativeParallelism, 12, loc);
    md += section('Generic introductions', r.patterns.genericOpener, 10, loc);
    md += section('Promotional vagueness', r.patterns.promotional, 15, loc);
    md += section('Rhetorical questions', r.patterns.rhetorical, 10, loc);
    md += section('Three-item constructions', r.patterns.threeItem, 3, loc);
  }

  if (reportOut) {
    fs.writeFileSync(reportOut, md);
    console.log(`Wrote ${reportOut}`);
  } else if (!jsonOut) {
    process.stdout.write(md);
  }
}

if (require.main === module) main();
module.exports = { mine, loadCorpus, NEGATIVE_PARALLELISM, GENERIC_OPENER, PROMOTIONAL, SPECIFICITY, skeletonize, MIN_LOCALE_PAGES };
