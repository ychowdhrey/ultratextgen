/* ==========================================================
   js/writing-footprint/engine.js
   The pure analysis engine behind /ai-writing-footprint-checker/.

   No DOM, no network, no clock, no model. The same input and options
   always return the same output, so every claim can be pinned in
   engine.test.js. Text never leaves the caller: this file has no way
   to send it anywhere.

   WHAT IT REPORTS. Observable patterns in the wording: stock phrases,
   set rhetorical constructions, punctuation density, sentence rhythm,
   transition density, vocabulary density and specificity. Each result
   says what was measured, what was seen, why a reader might notice, how
   to improve it and how certain the rule is.

   WHAT IT NEVER REPORTS. A probability of AI authorship, a composite
   score, or a verdict. There is no such number in the output object.
   Category levels are the maximum of their own rules, never a sum, so
   correlated signals cannot be double counted.

   Offsets: every finding and edit is an index into the ORIGINAL string.
   Edits are applied against the original and never stacked, so undo is
   exact by construction (remove the edit and the original is back).
   ========================================================== */
(function () {
  "use strict";

  const UTG = (window.UltraTextGen = window.UltraTextGen || {});
  const WF = (UTG.writingFootprint = UTG.writingFootprint || {});
  const P = WF.patterns;
  const T = P.THRESHOLDS;

  const MAX_WORDS = 20000;
  const MAX_CHARS = 150000;
  const LEVEL_RANK = { none: 0, low: 1, noticeable: 2, high: 3 };
  const PROMINENCE_RANK = { high: 3, medium: 2, low: 1 };
  const STOPWORDS = new Set(("the of and to a in is that it for on with as was are be this by i you have at or from an not but they we his her " +
    "there their what all were been has had which will would can if do so no than them then these those its our your my").split(" "));
  const ENGLISH_FUNCTION = new Set(("the of and to a in is that it for on with as was are be this by i you have at or from an not but they we " +
    "he she his her there their what all were been has had which will would can if do so no than them then these those its our your my " +
    "me about out up more some into who when how just also").split(" "));
  const ABBREVIATION_END = /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|e\.g|i\.e|Fig|No|cf)\.$/;
  const WORD_RE = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
  const LIST_MARKER = /^[ \t]*(?:[-*•]|\d+[.)])[ \t]+/;

  /* ---------------------------------------------------------------- basics */

  function clampText(text) {
    return typeof text === "string" ? text : "";
  }

  function tokenize(text) {
    const out = [];
    const re = new RegExp(WORD_RE.source, WORD_RE.flags);
    let m;
    while ((m = re.exec(text)) !== null) {
      out.push({ start: m.index, end: m.index + m[0].length, word: m[0] });
    }
    return out;
  }

  /* Word count the UI shows live. The same tokenizer the analysis uses,
     so the number on screen and the number in the report cannot differ. */
  function countWords(text) {
    const m = clampText(text).match(WORD_RE);
    return m ? m.length : 0;
  }

  function mean(a) {
    return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0;
  }
  function stdev(a) {
    if (a.length < 2) return 0;
    const m = mean(a);
    return Math.sqrt(a.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / a.length);
  }
  function cv(a) {
    const m = mean(a);
    return m ? stdev(a) / m : 0;
  }
  function round(n, d) {
    const f = Math.pow(10, d == null ? 2 : d);
    return Math.round(n * f) / f;
  }
  function per1000(count, words) {
    return words ? (count / words) * 1000 : 0;
  }
  function upperFirst(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }
  function maxLevel(a, b) {
    return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;
  }

  /* ----------------------------------------------------------- protected spans
     Quoted passages, block quotes, code, URLs, e-mail and citations are
     someone else's words or machine-readable. Patterns found inside them
     are skipped, and no edit may touch them. */
  function protectedRanges(text) {
    const ranges = [];
    const add = function (re) {
      const r = new RegExp(re.source, re.flags);
      let m;
      while ((m = r.exec(text)) !== null) {
        ranges.push([m.index, m.index + m[0].length]);
        if (m[0].length === 0) r.lastIndex++;
      }
    };
    add(/"[^"\n]{2,}"/g);
    add(/“[^”\n]{2,}”/g);
    add(/^[ \t]*>.*$/gm);
    add(/`[^`\n]+`/g);
    add(/https?:\/\/[^\s)]+|www\.[^\s)]+/gi);
    add(/[\w.+-]+@[\w-]+\.[\w.-]+/g);
    add(/\[\d+(?:[,–-]\s*\d+)*\]/g);
    add(/\((?:[A-Z][A-Za-z-]+(?: et al\.)?(?:,? (?:and|&) [A-Z][A-Za-z-]+)?,? \d{4}[a-z]?(?:[,;] ?[^)]{0,40})?)\)/g);
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    const merged = [];
    ranges.forEach(function (r) {
      const last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else merged.push([r[0], r[1]]);
    });
    return merged;
  }

  function overlapsRanges(ranges, s, e) {
    let lo = 0;
    let hi = ranges.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const r = ranges[mid];
      if (r[1] <= s) lo = mid + 1;
      else if (r[0] >= e) hi = mid - 1;
      else return true;
    }
    return false;
  }

  /* ------------------------------------------------------------ segmentation */

  function paragraphsOf(text) {
    const out = [];
    const re = /(?:[^\n]|\n(?![ \t\r]*\n))+/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const raw = m[0];
      const lead = raw.length - raw.replace(/^\s+/, "").length;
      const trimmed = raw.trim();
      if (trimmed) out.push({ start: m.index + lead, end: m.index + lead + trimmed.length });
    }
    return out;
  }

  /* A paragraph is split into chunks at list items, and each chunk is
     segmented into sentences. Intl.Segmenter does the splitting where it
     exists; a punctuation scan is the fallback. Both then apply the same
     repairs for titles and abbreviations. */
  function sentencesOf(text, para, useSegmenter) {
    const body = text.slice(para.start, para.end);
    const lines = [];
    const lre = /[^\n]*(?:\n|$)/g;
    let lm;
    while ((lm = lre.exec(body)) !== null) {
      if (lm[0] === "") { lre.lastIndex++; if (lre.lastIndex > body.length) break; continue; }
      lines.push({ start: lm.index, text: lm[0] });
    }
    const chunks = [];
    lines.forEach(function (ln) {
      if (!chunks.length || LIST_MARKER.test(ln.text)) chunks.push({ start: ln.start, text: ln.text });
      else chunks[chunks.length - 1].text += ln.text;
    });
    const raw = [];
    const seg = useSegmenter && typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
      ? new Intl.Segmenter("en", { granularity: "sentence" }) : null;
    chunks.forEach(function (ch) {
      if (seg) {
        const it = seg.segment(ch.text);
        for (const s of it) raw.push({ start: ch.start + s.index, text: s.segment });
      } else {
        const re = /[^.!?\n]+(?:[.!?]+["')\]”’]*|$)|[.!?]+/g;
        let m;
        while ((m = re.exec(ch.text)) !== null) raw.push({ start: ch.start + m.index, text: m[0] });
      }
    });
    const sentences = [];
    raw.forEach(function (r) {
      const lead = r.text.length - r.text.replace(/^\s+/, "").length;
      const t = r.text.trim();
      if (!t) return;
      const start = para.start + r.start + lead;
      const prev = sentences[sentences.length - 1];
      const startsLower = /^\p{Ll}/u.test(t);
      if (prev && prev.paraStart === para.start && (ABBREVIATION_END.test(prev.text) || (startsLower && !LIST_MARKER.test(t)))) {
        prev.end = start + t.length;
        prev.text = text.slice(prev.start, prev.end);
      } else {
        sentences.push({ start: start, end: start + t.length, text: t, paraStart: para.start });
      }
    });
    return sentences;
  }

  /* --------------------------------------------------------------- language */

  /* English function words make up well over a third of running English
     text. A text far below that is another language, mostly code, or a
     list of names, and English rules would misjudge it. */
  function languageGate(text, tokens) {
    let latin = 0;
    let letters = 0;
    for (const ch of text) {
      if (/\p{L}/u.test(ch)) {
        letters++;
        if (/\p{Script=Latin}/u.test(ch)) latin++;
      }
    }
    // A run of CJK or Thai characters is one "word" to the tokenizer, so the
    // script check has to come before the word-count shortcut.
    if (letters >= 20 && latin / letters < 0.7) return { ok: false, ratio: null, latinShare: round(latin / letters, 3) };
    if (tokens.length < 12) return { ok: true, ratio: null, latinShare: letters ? latin / letters : 1 };
    let fn = 0;
    tokens.forEach(function (t) { if (ENGLISH_FUNCTION.has(t.word.toLowerCase())) fn++; });
    const ratio = fn / tokens.length;
    const latinShare = letters ? latin / letters : 1;
    return { ok: latinShare >= 0.7 && ratio >= 0.2, ratio: round(ratio, 3), latinShare: round(latinShare, 3) };
  }

  /* ----------------------------------------------------------------- helpers */

  function atSentenceStart(text, i) {
    let j = i - 1;
    while (j >= 0 && /[\s"'“‘(\[]/.test(text[j])) {
      if (text[j] === "\n") return true;
      j--;
    }
    return j < 0 || /[.!?:]/.test(text[j]);
  }

  /* Builds one concrete edit from an option, against the original text. */
  function resolveOption(text, finding, opt, matchedText) {
    let start = finding.editStart != null ? finding.editStart : finding.start;
    let end = finding.editEnd != null ? finding.editEnd : finding.end;
    let replacement = opt.text;
    if (opt.forms) {
      const key = matchedText.toLowerCase().split(/\s+/)[0];
      if (opt.forms[key] != null) replacement = opt.forms[key];
    }
    if (replacement && /^\p{Lu}/u.test(matchedText)) replacement = upperFirst(replacement);
    if (opt.capitalizeNext) {
      const nextCh = text.charAt(end);
      if (replacement === "" && /\p{Ll}/u.test(nextCh) && atSentenceStart(text, start)) {
        replacement = nextCh.toUpperCase();
        end += 1;
      } else if (replacement !== "" && opt.capitalizeAfter && /\p{Ll}/u.test(nextCh)) {
        replacement = replacement + nextCh.toUpperCase();
        end += 1;
      }
    }
    if (opt.eatSpace) {
      while (end < text.length && text[end] === " " && /\s$/.test(text.slice(Math.max(0, start - 1), start) || " ")) end++;
    }
    return { label: opt.label, start: start, end: end, replacement: replacement };
  }

  /* ------------------------------------------------------------------ detect */

  function analyze(input, options) {
    const opts = options || {};
    const genre = P.GENRE_SCALE[opts.genre] ? opts.genre : "general";
    const scale = P.GENRE_SCALE[genre];
    const text = clampText(input);
    const tokens = tokenize(text);
    const words = tokens.length;
    const result = {
      status: "ok",
      genre: genre,
      words: words,
      chars: text.length,
      sentences: 0,
      paragraphs: 0,
      tier: "empty",
      summary: "",
      language: null,
      truncated: false,
      findings: [],
      rules: [],
      categories: [],
      measurements: {},
      skipped: { quoted: 0, overlap: 0, exempt: 0 },
      notMeasured: P.NOT_MEASURED
    };

    if (!words) {
      result.status = "empty";
      result.summary = "Paste some writing to see its patterns.";
      result.categories = emptyCategories("none");
      return result;
    }
    if (words > MAX_WORDS || text.length > MAX_CHARS) {
      result.status = "too_long";
      result.truncated = true;
      result.summary = "This is over " + MAX_WORDS.toLocaleString("en-US") + " words. Paste a section at a time so the page stays fast.";
      result.categories = emptyCategories("none");
      return result;
    }

    const lang = languageGate(text, tokens);
    result.language = lang;
    if (!lang.ok) {
      result.status = "unsupported_language";
      result.summary = "This checker reads English only. Its phrase lists and sentence rules were written for English, and applying them to another language would flag ordinary writing.";
      result.categories = emptyCategories("none");
      return result;
    }

    const prot = protectedRanges(text);
    const paras = paragraphsOf(text);
    let sentences = [];
    paras.forEach(function (p) {
      sentencesOf(text, p, opts.noSegmenter ? false : true).forEach(function (s) { sentences.push(s); });
    });
    // word counts per sentence by walking the token list once
    let ti = 0;
    sentences.forEach(function (s, idx) {
      while (ti < tokens.length && tokens[ti].start < s.start) ti++;
      let k = ti;
      const toks = [];
      while (k < tokens.length && tokens[k].end <= s.end) { toks.push(tokens[k]); k++; }
      s.tokens = toks;
      s.words = toks.length;
      s.first = toks.length ? toks[0].word.toLowerCase() : "";
      s.index = idx;
    });
    sentences = sentences.filter(function (s) { return s.words > 0; });
    sentences.forEach(function (s, i) { s.index = i; });

    result.sentences = sentences.length;
    result.paragraphs = paras.length;
    const tier = words < 40 ? "observations" : words < T.minWordsForDensity ? "limited" : "full";
    result.tier = tier;

    const findings = [];
    const rules = [];
    const pushFinding = function (f) {
      if (overlapsRanges(prot, f.start, f.end)) { result.skipped.quoted++; return false; }
      findings.push(f);
      return true;
    };

    /* ---- exact-phrase patterns: reported at any length ---- */
    function runPatterns(list, categoryId, cfg, ruleId, ruleName, ruleCopy) {
      let count = 0;
      const mine = [];
      list.forEach(function (pat) {
        if (pat.exemptions && ((pat.exemptions.indexOf("formal") >= 0 && genre !== "general") ||
            (pat.exemptions.indexOf("technical") >= 0 && genre === "technical"))) {
          const rx = new RegExp(pat.regex.source, pat.regex.flags);
          let mm;
          while ((mm = rx.exec(text)) !== null) { result.skipped.exempt++; if (!mm[0]) rx.lastIndex++; }
          return;
        }
        const re = new RegExp(pat.regex.source, pat.regex.flags);
        let m;
        while ((m = re.exec(text)) !== null) {
          if (!m[0]) { re.lastIndex++; continue; }
          let s = m.index;
          let matched = m[0];
          if (pat.group && m[pat.group]) {
            s = m.index + m[0].indexOf(m[pat.group]);
            matched = m[pat.group];
          }
          const f = {
            key: pat.id + ":" + s,
            patternId: pat.id, name: pat.name, category: categoryId,
            start: s, end: s + matched.length,
            prominence: pat.prominence, evidence: pat.evidence,
            explanation: pat.explanation, why: pat.why, suggestion: pat.suggestion,
            falsePositives: pat.falsePositives, ruleConfidence: pat.ruleConfidence,
            references: pat.references, safety: pat.safety, options: []
          };
          if (pat.options && pat.options.length && !(pat.noOptionsIf && pat.noOptionsIf.test(matched))) {
            f.options = pat.options.map(function (o) { return resolveOption(text, f, o, matched); });
          } else if (pat.safety !== "explanation_only") {
            f.safety = "explanation_only";
          }
          if (pushFinding(f)) { count++; mine.push(f); }
        }
      });
      const d = per1000(count, words);
      let level = "none";
      if (count >= 1) level = "low";
      if (words >= T.minWordsForDensity || count >= cfg.highCount) {
        if (count >= cfg.noticeableCount && (words < T.minWordsForDensity || d >= cfg.noticeableDensity * scale)) level = "noticeable";
        if (count >= cfg.highCount && (words < T.minWordsForDensity || d >= cfg.highDensity * scale)) level = "high";
      } else if (count >= cfg.noticeableCount) {
        level = "low";
      }
      rules.push(makeRule(ruleId, ruleName, categoryId, level, {
        measured: ruleCopy.measured,
        observed: count ? count + " match" + (count === 1 ? "" : "es") + " (" + round(d, 1) + " per 1,000 words)" : "None found",
        why: ruleCopy.why, improve: ruleCopy.improve,
        certainty: ruleCopy.certainty, count: count, density: round(d, 2)
      }));
    }

    runPatterns(P.PHRASES, "phrases", T.phrases, "RULE-PHRASES", "Stock phrases", {
      measured: "Exact matches against a short list of stock lead-ins, metaphors and closers.",
      why: "These phrases fit any topic, so a reader who has seen them often stops reading them.",
      improve: "Replace each with the specific fact it stands in for. Where a fix is safe, a suggestion is offered.",
      certainty: "High that the phrase is present. Only that readers often name these phrases as tells; nothing shows they predict who wrote a text."
    });
    runPatterns(P.RHETORIC, "rhetoric", T.rhetoric, "RULE-RHETORIC", "Rhetorical constructions", {
      measured: "Matches for set constructions such as 'not just X but Y' and 'whether you're X or Y'.",
      why: "One use is ordinary. Repetition is what makes them audible as a template.",
      improve: "State the positive claim directly. Keep a construction only where the contrast is the point.",
      certainty: "Medium. These are common in persuasive human writing, so repetition matters far more than a single use."
    });

    /* ---- punctuation ---- */
    runPunctuation(text, tokens, words, tier, scale, prot, pushFinding, rules, result, opts);

    /* ---- transitions ---- */
    runTransitions(text, sentences, words, tier, scale, pushFinding, rules, result);

    /* ---- vocabulary ---- */
    runVocabulary(text, tokens, words, tier, scale, genre, pushFinding, rules, result, prot);

    /* ---- rhythm & structure ---- */
    runRhythm(text, sentences, words, tier, genre, pushFinding, rules, result);
    runStructure(text, paras, sentences, words, tier, pushFinding, rules, result);

    /* ---- specificity ---- */
    runSpecificity(text, tokens, sentences, words, tier, rules, result);

    /* ---- dedupe overlapping spans: the more prominent, then longer, wins ---- */
    findings.sort(function (a, b) {
      const pr = PROMINENCE_RANK[b.prominence] - PROMINENCE_RANK[a.prominence];
      if (pr) return pr;
      return (b.end - b.start) - (a.end - a.start);
    });
    const kept = [];
    findings.forEach(function (f) {
      for (let i = 0; i < kept.length; i++) {
        if (f.start < kept[i].end && f.end > kept[i].start) { result.skipped.overlap++; return; }
      }
      kept.push(f);
    });
    kept.sort(function (a, b) { return a.start - b.start; });
    result.findings = kept;
    result.rules = rules;

    result.categories = P.CATEGORIES.map(function (c) {
      const rs = rules.filter(function (r) { return r.category === c.id && r.applicable; });
      let level = "none";
      rs.forEach(function (r) { level = maxLevel(level, r.level); });
      return { id: c.id, name: c.name, blurb: c.blurb, level: level, evaluated: rs.length > 0, rules: rs.map(function (r) { return r.id; }) };
    });

    if (tier === "observations") {
      result.summary = "This is short. Individual observations are listed, but patterns need more text to mean anything.";
    } else if (tier === "limited") {
      result.summary = "Short sample. Exact phrases are reported, but density and rhythm readings need about " + T.minWordsForDensity + " words.";
    } else {
      const elevated = result.categories.filter(function (c) { return LEVEL_RANK[c.level] >= LEVEL_RANK.noticeable; }).length;
      result.summary = elevated === 0
        ? "No category crossed its threshold. That says nothing about who wrote this."
        : elevated + " of " + result.categories.length + " categories crossed their threshold. Each is a pattern in the wording, not a claim about authorship.";
    }
    result.measurements = measurements(text, tokens, sentences, paras, words);
    return result;
  }

  function emptyCategories(level) {
    return P.CATEGORIES.map(function (c) {
      return { id: c.id, name: c.name, blurb: c.blurb, level: level, evaluated: false, rules: [] };
    });
  }

  function makeRule(id, name, category, level, o) {
    return {
      id: id, name: name, category: category, level: level,
      applicable: o.applicable !== false,
      measured: o.measured, observed: o.observed, why: o.why, improve: o.improve, certainty: o.certainty,
      count: o.count == null ? null : o.count, density: o.density == null ? null : o.density,
      note: o.note || ""
    };
  }

  function notApplicable(id, name, category, measured, note) {
    return makeRule(id, name, category, "none", {
      applicable: false, measured: measured, observed: "Not evaluated", why: "", improve: "", certainty: "", note: note
    });
  }

  function densityLevel(count, words, cfg, scale) {
    if (count < cfg.minCount) return "none";
    const d = per1000(count, words);
    if (d >= cfg.high * scale && count >= (cfg.highMinCount || cfg.minCount)) return "high";
    if (d >= cfg.noticeable * scale) return "noticeable";
    return "low";
  }

  /* ---------------------------------------------------------------- punctuation */

  function runPunctuation(text, tokens, words, tier, scale, prot, pushFinding, rules, result, opts) {
    const dense = words >= T.minWordsForDensity;
    const needNote = "Needs about " + T.minWordsForDensity + " words for a density reading.";

    // em dashes (and a double hyphen standing in for one)
    const dashRe = /\s*(?:—|--)\s*/g;
    const dashes = [];
    let m;
    while ((m = dashRe.exec(text)) !== null) {
      const dashIdx = m.index + m[0].search(/—|--/);
      const dashLen = m[0].indexOf("--") >= 0 && m[0].indexOf("—") < 0 ? 2 : 1;
      dashes.push({ editStart: m.index, editEnd: m.index + m[0].length, start: dashIdx, end: dashIdx + dashLen });
    }
    const protectedDashes = dashes.filter(function (d) { return overlapsRanges(prot, d.start, d.end); });
    const live = dashes.filter(function (d) { return !overlapsRanges(prot, d.start, d.end); });
    result.skipped.quoted += protectedDashes.length;
    const cfg = T.emDash;
    const level = dense ? densityLevel(live.length, words, cfg, scale) : "none";
    const d = per1000(live.length, words);
    if (dense) {
      rules.push(makeRule("RULE-EMDASH", "Em dashes", "punctuation", level, {
        measured: "Em dashes per 1,000 words. A single dash is never counted as a signal; at least " + cfg.minCount + " are needed.",
        observed: live.length ? live.length + " (" + round(d, 1) + " per 1,000 words)" : "None found",
        why: "Frequent dashes make sentences read as a series of asides, and readers who associate them with machine-written text may notice them.",
        improve: "Keep the dashes that do real work. Where a dash only joins two clauses, a full stop, comma or colon is usually clearer.",
        certainty: "Medium that the count is right. Dash frequency in web text rose after 2022 at population level; many careful human writers use dashes heavily. This says nothing about who wrote the text.",
        count: live.length, density: round(d, 2)
      }));
    } else {
      rules.push(notApplicable("RULE-EMDASH", "Em dashes", "punctuation", "Em dashes per 1,000 words.", needNote));
    }
    if (dense && LEVEL_RANK[level] >= LEVEL_RANK.noticeable) {
      live.forEach(function (dd) {
        const around = text.slice(dd.editStart, dd.editEnd);
        const f = {
          key: "PUN-EMDASH:" + dd.start, patternId: "PUN-EMDASH", name: "Frequent em dashes", category: "punctuation",
          start: dd.start, end: dd.end, editStart: dd.editStart, editEnd: dd.editEnd,
          prominence: "low", evidence: "population",
          explanation: "One of several dashes in a text that uses them often.",
          why: "Repeated dashes make each sentence read as an aside.",
          suggestion: "Choose the punctuation that matches the relationship: a comma for an aside, a full stop for a new thought, a colon for an explanation.",
          falsePositives: "A deliberate stylistic choice. Dashes are standard in good prose.",
          ruleConfidence: "medium", references: ["housestyle"], safety: "requires_context", options: []
        };
        const hasWordBefore = dd.editStart > 0 && !/\n\s*$/.test(text.slice(0, dd.editStart));
        const hasWordAfter = dd.editEnd < text.length && !/^\s*\n/.test(text.slice(dd.editEnd));
        if (hasWordBefore && hasWordAfter && !/\n/.test(around)) {
          f.options = [
            { label: "Comma", start: dd.editStart, end: dd.editEnd, replacement: ", " },
            { label: "Colon", start: dd.editStart, end: dd.editEnd, replacement: ": " }
          ];
          const nextCh = text.charAt(dd.editEnd);
          if (/\p{Ll}/u.test(nextCh)) {
            f.options.push({ label: "Full stop", start: dd.editStart, end: dd.editEnd + 1, replacement: ". " + nextCh.toUpperCase() });
          } else {
            f.options.push({ label: "Full stop", start: dd.editStart, end: dd.editEnd, replacement: ". " });
          }
        } else {
          f.safety = "explanation_only";
        }
        pushFinding(f);
      });
    }

    // paired dashes (parenthetical asides) within one sentence
    if (dense) {
      let pairs = 0;
      const pre = /—[^—.!?\n]{2,120}—/g;
      let pm;
      while ((pm = pre.exec(text)) !== null) {
        if (!overlapsRanges(prot, pm.index, pm.index + pm[0].length)) pairs++;
        pre.lastIndex = pm.index + 1 + pm[0].length - 1;
      }
      rules.push(makeRule("RULE-EMDASH-PAIRS", "Paired dashes", "punctuation", pairs >= T.emDashPairs.noticeable ? "noticeable" : pairs ? "low" : "none", {
        measured: "Sentences with an aside set off by two em dashes.",
        observed: pairs ? pairs + " paired aside" + (pairs === 1 ? "" : "s") : "None found",
        why: "Several paired asides in one piece slow the reader down in the same way each time.",
        improve: "Try a pair of commas or brackets, or split the aside into its own sentence.",
        certainty: "Medium. A style habit that many human writers share.",
        count: pairs, density: round(per1000(pairs, words), 2)
      }));
    } else {
      rules.push(notApplicable("RULE-EMDASH-PAIRS", "Paired dashes", "punctuation", "Sentences with an aside between two dashes.", needNote));
    }

    const simple = function (id, name, re, cfgK, measured, why, improve, certainty, filter) {
      if (!dense) { rules.push(notApplicable(id, name, "punctuation", measured, needNote)); return; }
      let c = 0;
      const r = new RegExp(re.source, re.flags);
      let mm;
      while ((mm = r.exec(text)) !== null) {
        if (overlapsRanges(prot, mm.index, mm.index + mm[0].length)) continue;
        if (filter && !filter(mm, text)) continue;
        c++;
      }
      // No evidence ties these marks to AI-sounding text, so they are shown
      // for context and never raise a category above "observed".
      const lv0 = densityLevel(c, words, T[cfgK], scale);
      const lv = LEVEL_RANK[lv0] >= LEVEL_RANK.noticeable ? "low" : lv0;
      rules.push(makeRule(id, name, "punctuation", lv, {
        note: "Context only. Not scored: no evidence ties this mark to AI-sounding writing.",
        measured: measured, observed: c ? c + " (" + round(per1000(c, words), 1) + " per 1,000 words)" : "None found",
        why: why, improve: improve, certainty: certainty, count: c, density: round(per1000(c, words), 2)
      }));
    };
    simple("RULE-SEMICOLON", "Semicolons", /;/g, "semicolon",
      "Semicolons per 1,000 words.", "Frequent semicolons give a text a uniformly formal, balanced cadence.",
      "Keep them where two full thoughts belong together. Otherwise a full stop is plainer.",
      "Low. Heavy semicolon use is normal in academic and legal prose, so the formal genre setting raises the threshold.");
    simple("RULE-COLON", "Colons", /:/g, "colon",
      "Colons per 1,000 words, excluding times, ratios and links.", "Many colons can make every paragraph read as label-then-explanation.",
      "Vary the construction. Let a sentence carry the explanation instead of a colon.",
      "Low. Lists and instructions legitimately use many colons.",
      function (mm, t) { return !/\d/.test(t.charAt(mm.index - 1)) && !/^\/\//.test(t.slice(mm.index + 1, mm.index + 3)); });
    simple("RULE-ELLIPSIS", "Ellipses", /…|\.{3}/g, "ellipsis",
      "Ellipses per 1,000 words.", "Repeated ellipses add a trailing-off tone that readers can find affected.",
      "Use a full stop unless the sentence really does trail off.",
      "Low. Common in casual human writing and dialogue.");
    simple("RULE-PARENS", "Parenthetical remarks", /\((?![\d,;\s.-]*\))[^()\n]{6,}\)/g, "parenthetical",
      "Bracketed remarks per 1,000 words, excluding citations and numbers.", "Frequent brackets interrupt the line of the sentence.",
      "Fold the remark into the sentence, or cut it if the reader does not need it.",
      "Low. Normal in technical and explanatory writing.");
  }

  /* --------------------------------------------------------------- transitions */

  function runTransitions(text, sentences, words, tier, scale, pushFinding, rules, result) {
    const list = P.TRANSITIONS.slice().sort(function (a, b) { return b.length - a.length; });
    const re = new RegExp("^[\"'“(\\s]*(" + list.map(function (t) { return t.replace(/ /g, "\\s+"); }).join("|") + ")\\b,?\\s*", "i");
    const hits = [];
    sentences.forEach(function (s) {
      const m = re.exec(text.slice(s.start, s.end));
      if (m) {
        const lead = m[0].indexOf(m[1]);
        const wordStart = s.start + lead;
        hits.push({ sentence: s, word: m[1].toLowerCase().replace(/\s+/g, " "), start: wordStart, end: s.start + m[0].length, rawEnd: wordStart + m[1].length });
      }
    });
    const enough = sentences.length >= T.minSentencesForRhythm;
    const share = sentences.length ? hits.length / sentences.length : 0;
    const counts = {};
    hits.forEach(function (h) { counts[h.word] = (counts[h.word] || 0) + 1; });
    const maxSame = Object.keys(counts).reduce(function (mx, k) { return Math.max(mx, counts[k]); }, 0);
    const cfg = T.transitions;
    let level = "none";
    if (hits.length >= 1) level = "low";
    if (enough && hits.length >= cfg.minCount) {
      if (share >= cfg.noticeableShare * scale) level = "noticeable";
      if (share >= cfg.highShare * scale) level = "high";
    }
    if (maxSame >= cfg.repeatSame) level = maxLevel(level, "noticeable");
    if (tier === "observations") level = hits.length ? "low" : "none";
    rules.push(makeRule("RULE-TRANSITIONS", "Transition openers", "transitions", level, {
      measured: "Share of sentences that open with a linking word such as 'Furthermore' or 'Moreover', and repeats of the same one.",
      observed: hits.length ? hits.length + " of " + sentences.length + " sentences (" + Math.round(share * 100) + "%)" + (maxSame >= 2 ? ", the most repeated used " + maxSame + " times" : "") : "None found",
      why: "A linking word at the start of most sentences gives every sentence the same entrance.",
      improve: "Delete the linking word where the logic is already clear. Keep 'however' and 'therefore' where they do real work.",
      certainty: "Medium. Common in formal writing, so the formal genre setting raises the threshold.",
      count: hits.length, density: round(share, 3)
    }));
    if (LEVEL_RANK[level] >= LEVEL_RANK.noticeable) {
      hits.forEach(function (h) {
        const f = {
          key: "TRN:" + h.start, patternId: "TRN-OPENER", name: "Transition opener", category: "transitions",
          start: h.start, end: h.rawEnd, prominence: "low", evidence: "reader",
          explanation: "A sentence that opens with a linking word, in a text where many do.",
          why: "When most sentences begin this way the logic is announced rather than shown.",
          suggestion: "Try deleting it. If the sentence still follows from the one before, it did not need the word.",
          falsePositives: "Appropriate in formal and academic writing.", ruleConfidence: "medium",
          references: ["housestyle"], safety: "explanation_only", options: []
        };
        if (P.TRANSITION_ALSO.indexOf(h.word) >= 0) {
          f.safety = "safe_to_propose";
          f.editStart = h.start; f.editEnd = h.end;
          f.options = [resolveOption(text, f, { label: "Remove it", text: "", capitalizeNext: true }, text.slice(h.start, h.rawEnd))];
          if (h.word === "furthermore" || h.word === "moreover" || h.word === "additionally") {
            f.options.push(resolveOption(text, f, { label: "Also,", text: "Also, ", capitalizeNext: false }, text.slice(h.start, h.rawEnd)));
            const alt = f.options[1];
            const nextCh = text.charAt(h.end);
            if (/\p{Lu}/u.test(nextCh) && /^\p{Lu}[\p{Ll}]/u.test(text.slice(h.end, h.end + 2)) && !/^(?:I|[A-Z]{2,})\b/.test(text.slice(h.end, h.end + 4))) {
              alt.replacement = "Also, " + nextCh.toLowerCase();
              alt.end = h.end + 1;
            }
          }
        }
        pushFinding(f);
      });
    }
  }

  /* ---------------------------------------------------------------- vocabulary */

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function listHits(text, listRe, prot, result) {
    const re = new RegExp(listRe, "gi");
    const out = [];
    let m;
    while ((m = re.exec(text)) !== null) {
      if (overlapsRanges(prot, m.index, m.index + m[0].length)) { result.skipped.quoted++; continue; }
      out.push({ start: m.index, end: m.index + m[0].length, word: m[0].toLowerCase() });
    }
    return out;
  }

  function runVocabulary(text, tokens, words, tier, scale, genre, pushFinding, rules, result, prot) {
    const dense = words >= T.minWordsForDensity;
    const needNote = "Needs about " + T.minWordsForDensity + " words for a density reading.";
    const mk = function (id, name, hits, cfg, measured, why, improve, certainty, patternName, explanation, prominence) {
      if (!dense) { rules.push(notApplicable(id, name, "vocabulary", measured, needNote)); return; }
      const distinct = new Set(hits.map(function (h) { return h.word; })).size;
      let level = densityLevel(hits.length, words, cfg, scale);
      if (cfg.minDistinct && distinct < cfg.minDistinct && level !== "none") level = "low";
      const d = per1000(hits.length, words);
      rules.push(makeRule(id, name, "vocabulary", level, {
        measured: measured,
        observed: hits.length ? hits.length + " (" + distinct + " different, " + round(d, 1) + " per 1,000 words)" : "None found",
        why: why, improve: improve, certainty: certainty, count: hits.length, density: round(d, 2)
      }));
      if (LEVEL_RANK[level] >= LEVEL_RANK.noticeable) {
        hits.forEach(function (h) {
          pushFinding({
            key: id + ":" + h.start, patternId: id, name: patternName, category: "vocabulary",
            start: h.start, end: h.end, prominence: prominence || "low",
            evidence: id === "RULE-STOCKWORDS" ? "population" : "house",
            explanation: explanation, why: why, suggestion: improve,
            falsePositives: "A single use is ordinary. This is flagged because the list is dense in this text.",
            ruleConfidence: "medium", references: id === "RULE-STOCKWORDS" ? ["kobak2025"] : ["housestyle"],
            safety: "explanation_only", options: []
          });
        });
      }
    };

    const stock = P.STOCK_WORDS.filter(function (w) { return !(w.technical && genre === "technical"); });
    const stockRe = "\\b(?:" + stock.map(function (w) { return w.re; }).join("|") + ")\\b";
    const stockHits = listHits(text, stockRe, prot, result).filter(function (h) {
      // 'delve into' is its own phrase rule; leave it there so it is not counted twice
      return !/^delv/.test(h.word) || !/^\s+(?:deeper\s+)?into\b/i.test(text.slice(h.end, h.end + 14));
    }).filter(function (h) {
      return !(/^leverag/.test(h.word) && /^\s+(?:buyout|loan|etf|position|debt)/i.test(text.slice(h.end, h.end + 12)));
    });
    mk("RULE-STOCKWORDS", "Stock words", stockHits, T.vocabulary,
      "Density of words whose frequency rose sharply in published text after 2022 (such as 'pivotal', 'intricate', 'showcase').",
      "A handful is fine. A dense cluster gives a text a polished, interchangeable tone.",
      "Swap in the plain word you would say aloud, or the specific detail the word is gesturing at.",
      "Low per text. The word list comes from a corpus-level study that says it cannot identify individual documents.",
      "Dense stock vocabulary", "One of a cluster of stock words in this text.", "low");

    const wl = function (arr) { return "\\b(?:" + arr.map(escapeRe).join("|") + ")\\b"; };
    mk("RULE-INTENSIFIERS", "Intensifiers", listHits(text, wl(P.INTENSIFIERS), prot, result), T.intensifiers,
      "Density of words like 'very', 'truly' and 'incredibly'.",
      "Piling on intensifiers lowers their force; the claim underneath still has to be shown.",
      "Cut the intensifier, or replace the claim with the measurement that justifies it.",
      "Low. A common habit in casual writing.", "Dense intensifiers", "An intensifier in a text that uses many.", "low");
    mk("RULE-POSITIVE", "Generic praise", listHits(text, wl(P.GENERIC_POSITIVE), prot, result), T.genericPositive,
      "Density of stock positive adjectives such as 'powerful', 'innovative' and 'game-changing'.",
      "Praise with no evidence behind it is easy to skim past.",
      "Say what it does and for whom. Use a number, a name or a result.",
      "Medium. Marketing copy uses these on purpose; the issue is vagueness, not marketing.", "Generic praise", "Praise with no evidence attached.", "low");
    mk("RULE-CORPORATE", "Corporate abstractions", listHits(text, wl(P.CORPORATE), prot, result), T.corporate,
      "Density of abstract business terms such as 'ecosystem', 'actionable' and 'stakeholders'.",
      "Abstract terms feel professional but say little about what actually happens.",
      "Name the real people, tools or steps.",
      "Low. Standard in business writing, so the formal genre setting raises the threshold.", "Corporate abstraction", "An abstract business term in a text that uses many.", "low");
    mk("RULE-VAGUE", "Vague nouns", listHits(text, wl(P.VAGUE_NOUNS), prot, result), T.vagueNouns,
      "Density of broad nouns such as 'aspects', 'factors' and 'landscape'.",
      "Broad nouns stand in for the specific things the reader wants named.",
      "Replace 'various factors' with the factors.",
      "Low. These are ordinary words; only a dense cluster matters.", "Vague nouns", "A broad noun in a text that leans on them.", "low");

    // repeated phrase sequences (n-grams of 4 with at least two content words)
    if (!dense) {
      rules.push(notApplicable("RULE-REPEATS", "Repeated phrases", "vocabulary", "Four-word sequences that repeat three or more times.", needNote));
    } else {
      const spans = repeatedSpans(text, tokens, prot);
      const lv = spans.groups >= 6 ? "high" : spans.groups >= 3 ? "noticeable" : spans.groups >= 1 ? "low" : "none";
      rules.push(makeRule("RULE-REPEATS", "Repeated phrases", "vocabulary", lv, {
        measured: "Four-word sequences, containing at least two content words, that appear " + T.repeatedPhrase.minOccurrences + " or more times.",
        observed: spans.groups ? spans.groups + " repeated phrase" + (spans.groups === 1 ? "" : "s") : "None found",
        why: "Re-using an identical phrase across a text is one of the clearest ways wording becomes monotonous.",
        improve: "Keep the first use and rephrase or cut the others.",
        certainty: "High that the repetition exists. Repetition can be intentional, in titles, product names or terms of art.",
        count: spans.groups, density: round(per1000(spans.groups, words), 2)
      }));
      if (LEVEL_RANK[lv] >= LEVEL_RANK.noticeable) {
        spans.list.forEach(function (sp) {
          pushFinding({
            key: "REPEAT:" + sp.start, patternId: "RULE-REPEATS", name: "Repeated phrase", category: "vocabulary",
            start: sp.start, end: sp.end, prominence: "low", evidence: "house",
            explanation: "This exact phrase appears " + sp.n + " times.",
            why: "Identical wording across a text reads as monotone.",
            suggestion: "Keep the first use and vary or cut the others.",
            falsePositives: "A product name, a title or a defined term should repeat.", ruleConfidence: "high",
            references: ["housestyle"], safety: "explanation_only", options: []
          });
        });
      }
    }
  }

  function repeatedSpans(text, tokens, prot) {
    const n = T.repeatedPhrase.n;
    const words = tokens.map(function (t) { return t.word.toLowerCase(); });
    const grams = new Map();
    for (let i = 0; i + n <= words.length; i++) {
      const slice = words.slice(i, i + n);
      let content = 0;
      slice.forEach(function (w) { if (!STOPWORDS.has(w)) content++; });
      if (content < 2) continue;
      const key = slice.join(" ");
      if (!grams.has(key)) grams.set(key, []);
      grams.get(key).push(i);
    }
    const covered = new Uint8Array(words.length);
    grams.forEach(function (pos) {
      if (pos.length >= T.repeatedPhrase.minOccurrences) {
        pos.forEach(function (p) { for (let k = 0; k < n; k++) covered[p + k] = 1; });
      }
    });
    const spans = [];
    let i = 0;
    while (i < words.length) {
      if (!covered[i]) { i++; continue; }
      let j = i;
      while (j + 1 < words.length && covered[j + 1]) j++;
      spans.push({ a: i, b: j });
      i = j + 1;
    }
    const byText = new Map();
    spans.forEach(function (s) {
      const start = tokens[s.a].start;
      const end = tokens[s.b].end;
      if (overlapsRanges(prot, start, end)) return;
      const key = words.slice(s.a, s.b + 1).join(" ");
      if (!byText.has(key)) byText.set(key, []);
      byText.get(key).push({ start: start, end: end });
    });
    const list = [];
    let groups = 0;
    byText.forEach(function (arr) {
      if (arr.length >= T.repeatedPhrase.minOccurrences) {
        groups++;
        arr.forEach(function (a) { list.push({ start: a.start, end: a.end, n: arr.length }); });
      }
    });
    return { groups: groups, list: list };
  }

  /* -------------------------------------------------------------------- rhythm */

  function runRhythm(text, sentences, words, tier, genre, pushFinding, rules, result) {
    const enough = words >= T.minWordsForRhythm && sentences.length >= T.minSentencesForRhythm;
    const needNote = "Needs at least " + T.minSentencesForRhythm + " sentences and about " + T.minWordsForRhythm + " words.";
    if (!enough) {
      rules.push(notApplicable("RULE-VARIATION", "Sentence length variation", "rhythm", "How much sentence length varies (coefficient of variation).", needNote));
      rules.push(notApplicable("RULE-OPENINGS", "Repeated openings", "rhythm", "Runs of sentences that start with the same word.", needNote));
      rules.push(notApplicable("RULE-LENGTH-RUNS", "Runs of same-length sentences", "rhythm", "Stretches of sentences with almost identical length.", needNote));
      return;
    }
    const lens = sentences.map(function (s) { return s.words; });
    const m = mean(lens);
    const sd = stdev(lens);
    const c = m ? sd / m : 0;
    const relax = genre === "general" ? 0 : T.rhythm.formalRelax;
    let level = "none";
    if (c < T.rhythm.cvNoticeable - relax) level = "noticeable";
    if (c < T.rhythm.cvHigh - relax) level = "high";
    rules.push(makeRule("RULE-VARIATION", "Sentence length variation", "rhythm", level, {
      measured: "Coefficient of variation of sentence length (standard deviation divided by the mean). Higher means more varied.",
      observed: "Mean " + round(m, 1) + " words, standard deviation " + round(sd, 1) + ", variation " + round(c, 2),
      why: "Sentences of nearly the same length create a steady, drumming rhythm.",
      improve: "Mix a few short sentences with longer ones. Let the content decide, not a quota.",
      certainty: "Low. Varies with genre: instructions, legal text and children's writing are legitimately even.",
      count: sentences.length, density: round(c, 3)
    }));

    // runs of same opening word
    const runs = [];
    let i = 0;
    while (i < sentences.length) {
      let j = i;
      while (j + 1 < sentences.length && sentences[j + 1].first && sentences[j + 1].first === sentences[i].first &&
             sentences[j + 1].paraStart === sentences[i].paraStart) j++;
      if (j - i + 1 >= T.rhythm.runLength) runs.push({ a: i, b: j });
      i = j + 1;
    }
    const openLevel = runs.length >= 2 ? "high" : runs.length === 1 ? "noticeable" : "none";
    rules.push(makeRule("RULE-OPENINGS", "Repeated openings", "rhythm", openLevel, {
      measured: "Runs of " + T.rhythm.runLength + " or more consecutive sentences, within one paragraph, that start with the same word.",
      observed: runs.length ? runs.length + " run" + (runs.length === 1 ? "" : "s") : "None found",
      why: "A run of identical openings is audible to a reader even when each sentence is fine.",
      improve: "Reorder a sentence, or start with the detail that matters: the time, the place, the object.",
      certainty: "High that the run exists. Lists and parallel structures use repeated openings on purpose.",
      count: runs.length, density: 0
    }));
    runs.forEach(function (r) {
      for (let k = r.a; k <= r.b; k++) {
        const s = sentences[k];
        const t = s.tokens[0];
        pushFinding({
          key: "OPEN:" + t.start, patternId: "RULE-OPENINGS", name: "Repeated sentence opening", category: "rhythm",
          start: t.start, end: t.end, prominence: "medium", evidence: "house",
          explanation: "Sentence " + (k - r.a + 1) + " of " + (r.b - r.a + 1) + " in a row that starts with '" + t.word + "'.",
          why: "Identical openings in a row create a drumbeat.",
          suggestion: "Vary the entrance: start with the time, the place or the object instead of the subject.",
          falsePositives: "Intentional in lists and parallel structure.", ruleConfidence: "high",
          references: ["housestyle"], safety: "explanation_only", options: []
        });
      }
    });

    // runs of near-equal sentence length
    const lruns = [];
    i = 0;
    while (i < sentences.length) {
      let j = i;
      while (j + 1 < sentences.length && Math.abs(sentences[j + 1].words - sentences[i].words) <= T.rhythm.lengthRunTolerance &&
             sentences[j + 1].paraStart === sentences[i].paraStart && sentences[i].words >= 6) j++;
      if (j - i + 1 >= T.rhythm.lengthRun) lruns.push({ a: i, b: j });
      i = Math.max(j + 1, i + 1);
    }
    rules.push(makeRule("RULE-LENGTH-RUNS", "Runs of same-length sentences", "rhythm", lruns.length >= 2 ? "high" : lruns.length ? "noticeable" : "none", {
      measured: "Runs of " + T.rhythm.lengthRun + " or more consecutive sentences whose lengths differ by " + T.rhythm.lengthRunTolerance + " words or fewer.",
      observed: lruns.length ? lruns.length + " run" + (lruns.length === 1 ? "" : "s") : "None found",
      why: "A stretch of equally long sentences has a mechanical cadence.",
      improve: "Break one up, or join two. A very short sentence resets the rhythm.",
      certainty: "Low to medium. Genre dependent.",
      count: lruns.length, density: 0
    }));
    lruns.forEach(function (r) {
      pushFinding({
        key: "LRUN:" + sentences[r.a].start, patternId: "RULE-LENGTH-RUNS", name: "Same-length sentences", category: "rhythm",
        start: sentences[r.a].start, end: sentences[r.b].end, prominence: "low", evidence: "house",
        explanation: (r.b - r.a + 1) + " sentences in a row of almost the same length.",
        why: "Equal-length sentences have a steady, mechanical cadence.",
        suggestion: "Vary the lengths: join two, or add a short sentence.",
        falsePositives: "Instructions and lists are often evenly paced.", ruleConfidence: "medium",
        references: ["housestyle"], safety: "explanation_only", options: []
      });
    });
  }

  /* ----------------------------------------------------------------- structure */

  const SUMMARY_START = /^[\s"'“(]*(?:ultimately|overall|in essence|in short|in summary|simply put|at the end of the day|all in all)\b/i;
  const LABEL_BULLET = /^[ \t]*(?:[-*•]|\d+[.)])[ \t]+(?:\*\*[^*\n]{2,40}\*\*:?|[A-Z][^:\n]{2,40}:)[ \t]+\S/gm;

  function runStructure(text, paras, sentences, words, tier, pushFinding, rules, result) {
    const need = "Needs at least " + T.minParagraphsForStructure + " paragraphs.";
    if (paras.length < T.minParagraphsForStructure || words < T.minWordsForDensity) {
      rules.push(notApplicable("RULE-PARA-UNIFORM", "Paragraph length", "structure", "Evenness of paragraph length.", need + " And about " + T.minWordsForDensity + " words."));
      rules.push(notApplicable("RULE-PARA-ENDINGS", "Summary endings", "structure", "Paragraphs that finish with a summing-up sentence.", need));
    } else {
      const counts = paras.map(function (p) { return countWords(text.slice(p.start, p.end)); });
      const body = counts.filter(function (n) { return n >= 25; });
      const pcv = cv(counts);
      const uniform = body.length === counts.length && pcv < T.structure.paraCvNoticeable;
      rules.push(makeRule("RULE-PARA-UNIFORM", "Paragraph length", "structure", uniform ? "noticeable" : "none", {
        measured: "Variation in paragraph length across " + paras.length + " paragraphs.",
        observed: "Paragraphs run " + Math.min.apply(null, counts) + " to " + Math.max.apply(null, counts) + " words, variation " + round(pcv, 2),
        why: "Paragraphs of near-identical size give a piece a templated shape.",
        improve: "Let the content set the length. Merge a thin paragraph or split a heavy one.",
        certainty: "Low. Short-form formats such as posts and captions are uniform by design.",
        count: paras.length, density: round(pcv, 3)
      }));
      const enders = [];
      paras.forEach(function (p) {
        const ss = sentences.filter(function (s) { return s.start >= p.start && s.end <= p.end; });
        if (ss.length >= 2) {
          const last = ss[ss.length - 1];
          const m = SUMMARY_START.exec(text.slice(last.start, last.end));
          if (m) {
            const lead = m[0].search(/\S/);
            const w = /[A-Za-z' ]+/.exec(m[0].slice(lead));
            enders.push({ start: last.start + lead, end: last.start + lead + (w ? w[0].trimEnd().length : 3) });
          }
        }
      });
      rules.push(makeRule("RULE-PARA-ENDINGS", "Summary endings", "structure", enders.length >= T.structure.summaryEndings ? "noticeable" : enders.length ? "low" : "none", {
        measured: "Paragraphs whose last sentence opens with 'Ultimately', 'Overall', 'In essence' or similar.",
        observed: enders.length ? enders.length + " of " + paras.length + " paragraphs" : "None found",
        why: "A summing-up line at the end of every paragraph repeats what was just said.",
        improve: "End on the last new fact. Trust the paragraph.",
        certainty: "Medium. A familiar essay habit in human writing too.",
        count: enders.length, density: 0
      }));
      if (enders.length >= T.structure.summaryEndings) {
        enders.forEach(function (e) {
          pushFinding({
            key: "ENDER:" + e.start, patternId: "RULE-PARA-ENDINGS", name: "Summary ending", category: "structure",
            start: e.start, end: e.end, prominence: "low", evidence: "reader",
            explanation: "A paragraph that ends by summing itself up, in a text where many do.",
            why: "The summing-up line repeats the paragraph.",
            suggestion: "End on the last new fact.", falsePositives: "A closing paragraph can legitimately summarise.",
            ruleConfidence: "medium", references: ["housestyle"], safety: "explanation_only", options: []
          });
        });
      }
    }
    // list formatting
    const labelled = (text.match(LABEL_BULLET) || []).length;
    rules.push(makeRule("RULE-LISTS", "Label-and-explanation lists", "structure", labelled >= T.structure.listItems ? "low" : "none", {
      measured: "List items written as a bold or capitalised label followed by a colon and an explanation.",
      observed: labelled ? labelled + " item" + (labelled === 1 ? "" : "s") : "None found",
      why: "A long run of identically built list items looks assembled from a template.",
      improve: "Vary the items, or turn a few into sentences if they are connected.",
      certainty: "Low. Standard in documentation. Reported for awareness; never raised above 'observed'.",
      count: labelled, density: 0
    }));
  }

  /* --------------------------------------------------------------- specificity */

  function runSpecificity(text, tokens, sentences, words, tier, rules, result) {
    const dense = words >= T.specificity.minWords;
    const numbers = new Set();
    const nre = /(?:^|[^\w])(\d[\d,.]*\d|\d)(?!\w)/g;
    let m;
    while ((m = nre.exec(text)) !== null) {
      const before = text.slice(Math.max(0, m.index - 1), m.index + 1);
      if (/^\n?\d$/.test(before) && /(?:^|\n)[ \t]*\d+[.)]\s/.test(text.slice(Math.max(0, m.index - 1), m.index + m[0].length + 3))) continue;
      numbers.add(m[1]);
    }
    const names = new Set();
    sentences.forEach(function (s) {
      s.tokens.forEach(function (t, i) {
        if (i > 0 && /^\p{Lu}[\p{Ll}]+/u.test(t.word) && t.word !== "I") names.add(t.word);
      });
    });
    const concrete = numbers.size + names.size;
    const lower = tokens.map(function (t) { return t.word.toLowerCase(); });
    let first = 0;
    let contractions = 0;
    lower.forEach(function (w) {
      if (/^(?:i|me|my|mine|we|our|ours|us)$/.test(w)) first++;
      if (/['’](?:s|t|re|ve|ll|d|m)$/.test(w)) contractions++;
    });
    const questions = sentences.filter(function (s) { return /\?["')”]*$/.test(s.text); }).length;
    result.specificity = { numbers: numbers.size, names: names.size, firstPerson: first, contractions: contractions, questions: questions };
    if (!dense) {
      rules.push(notApplicable("RULE-SPECIFIC", "Concrete details", "specificity", "Numbers and mid-sentence names per 1,000 words.", "Needs about " + T.specificity.minWords + " words."));
      return;
    }
    const d = per1000(concrete, words);
    const level = d < T.specificity.concretePer1000 ? "noticeable" : "none";
    rules.push(makeRule("RULE-SPECIFIC", "Concrete details", "specificity", level, {
      measured: "Distinct numbers and capitalised names that appear mid-sentence, per 1,000 words. First-person words, contractions and questions are shown for context and are not scored.",
      observed: numbers.size + " numbers and " + names.size + " names (" + round(d, 1) + " per 1,000 words); " + first + " first-person words, " + contractions + " contractions, " + questions + " questions",
      why: "Text with few checkable details gives a reader little to hold on to.",
      improve: "Add a real example, number, date or name that you know to be true. Do not invent them.",
      certainty: "Low. A reflective essay may reasonably have few numbers. Using 'I' or contractions does not show a person wrote it.",
      count: concrete, density: round(d, 2)
    }));
  }

  /* ------------------------------------------------------------- measurements */

  /* Reported for context only, never scored. Lexical diversity (MATTR) is
     shown because readers ask for it, but the research on it is mixed
     and it carries no weight in any level. */
  function measurements(text, tokens, sentences, paras, words) {
    const lower = tokens.map(function (t) { return t.word.toLowerCase(); });
    let mattr = null;
    const W = 50;
    if (lower.length >= W) {
      const win = new Map();
      let types = 0;
      let sum = 0;
      let n = 0;
      for (let i = 0; i < lower.length; i++) {
        const w = lower[i];
        if (!win.has(w)) { win.set(w, 0); }
        if (win.get(w) === 0) types++;
        win.set(w, win.get(w) + 1);
        if (i >= W) {
          const old = lower[i - W];
          win.set(old, win.get(old) - 1);
          if (win.get(old) === 0) types--;
        }
        if (i >= W - 1) { sum += types / W; n++; }
      }
      mattr = n ? round(sum / n, 3) : null;
    }
    const lens = sentences.map(function (s) { return s.words; });
    return {
      words: words, sentences: sentences.length, paragraphs: paras.length,
      meanSentenceWords: round(mean(lens), 1), sentenceCv: round(cv(lens), 3),
      mattr: mattr
    };
  }

  /* ------------------------------------------------------------ edits & compare */

  /* Applies chosen edits to the ORIGINAL string. Edits that overlap an
     earlier one are skipped and reported, never merged. */
  function applyEdits(original, edits) {
    const sorted = edits.slice().sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    let out = "";
    let cursor = 0;
    const applied = [];
    const skipped = [];
    sorted.forEach(function (e) {
      if (e.start < cursor || e.end < e.start || e.end > original.length) { skipped.push(e); return; }
      out += original.slice(cursor, e.start) + e.replacement;
      cursor = e.end;
      applied.push(e);
    });
    out += original.slice(cursor);
    return { text: out, applied: applied, skipped: skipped };
  }

  /* The before/after figures. Plain counts and shares, no score. */
  function compareMetrics(a) {
    const rule = function (id) {
      for (let i = 0; i < a.rules.length; i++) if (a.rules[i].id === id) return a.rules[i];
      return null;
    };
    const num = function (id, k) { const r = rule(id); return r && r.applicable && r[k] != null ? r[k] : null; };
    return {
      words: a.words,
      phraseMatches: (num("RULE-PHRASES", "count") || 0) + (num("RULE-RHETORIC", "count") || 0),
      transitionOpeners: num("RULE-TRANSITIONS", "count"),
      repeatedOpeningRuns: num("RULE-OPENINGS", "count"),
      emDashes: num("RULE-EMDASH", "count"),
      sentenceVariation: a.measurements && a.measurements.sentenceCv != null ? a.measurements.sentenceCv : null
    };
  }

  WF.engine = {
    analyze: analyze,
    applyEdits: applyEdits,
    compareMetrics: compareMetrics,
    countWords: countWords,
    protectedRanges: protectedRanges,
    MAX_WORDS: MAX_WORDS,
    MAX_CHARS: MAX_CHARS,
    LEVEL_RANK: LEVEL_RANK
  };
})();
