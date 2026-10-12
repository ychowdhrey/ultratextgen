/* ==========================================================
   engine.test.js
   Assertions for the pure engine behind /ai-writing-footprint-checker/.

   No DOM, no dependencies, no runner:
       node js/writing-footprint/engine.test.js
   Exits non-zero if any assertion fails, and prints every assertion.

   The page makes claims that can be wrong: that one dash is never a
   signal, that short text gets no aggregate, that undo restores the
   original byte for byte, that the text goes nowhere. They are pinned
   here instead of trusted to a visual check.
   ========================================================== */
const fs = require("fs");
const path = require("path");

global.window = {};
const dir = __dirname;
["patterns.js", "engine.js"].forEach(function (f) {
  new Function(fs.readFileSync(path.join(dir, f), "utf8"))();
});
const WF = window.UltraTextGen.writingFootprint;
const E = WF.engine;
const P = WF.patterns;
const corpus = require("./test-corpus.js");

let fail = 0;
let total = 0;
const t = function (name, got, want) {
  total++;
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  got=" + JSON.stringify(got) + " want=" + JSON.stringify(want)));
};
const ok = function (name, cond, detail) {
  total++;
  if (!cond) fail++;
  console.log((cond ? "PASS " : "FAIL ") + name + (cond ? "" : "  " + (detail || "")));
};
const elevated = function (a) { return a.categories.filter(function (c) { return E.LEVEL_RANK[c.level] >= 2; }).length; };
const EM = "—";

/* ---- 1. the corpus ---- */
corpus.forEach(function (s) {
  const a = E.analyze(s.text, { genre: s.expect.genre || "general" });
  const e = s.expect;
  if (e.status) t("corpus " + s.id + " status", a.status, e.status);
  else t("corpus " + s.id + " status", a.status, "ok");
  if (e.tier) t("corpus " + s.id + " tier", a.tier, e.tier);
  if (e.maxElevated != null) ok("corpus " + s.id + " elevated categories <= " + e.maxElevated, elevated(a) <= e.maxElevated, "got " + elevated(a));
  if (e.minElevated != null) ok("corpus " + s.id + " elevated categories >= " + e.minElevated, elevated(a) >= e.minElevated, "got " + elevated(a));
  if (e.minFindings != null) ok("corpus " + s.id + " findings >= " + e.minFindings, a.findings.length >= e.minFindings, "got " + a.findings.length);
  if (e.noAggregate) {
    ok("corpus " + s.id + " has no aggregate summary of patterns", /too short|Short sample|short/i.test(a.summary) && elevated(a) === 0, a.summary);
  }
  if (e.noEmDashFinding) {
    ok("corpus " + s.id + " raises no em dash finding", !a.findings.some(function (f) { return f.patternId === "PUN-EMDASH"; }));
  }
  if (e.noFindingInsideQuotes) {
    const prot = E.protectedRanges(s.text);
    const inside = a.findings.filter(function (f) {
      return prot.some(function (r) { return f.start < r[1] && f.end > r[0]; });
    });
    t("corpus " + s.id + " no finding inside quotes, block quotes, links or citations", inside.length, 0);
  }
});

/* ---- 2. the named acceptance tests ---- */
(function () {
  const long = corpus.filter(function (c) { return c.id === "single-dash-long"; })[0].text;
  const a = E.analyze(long, {});
  const dashRule = a.rules.filter(function (r) { return r.id === "RULE-EMDASH"; })[0];
  t("1 single em dash: rule level is none", dashRule.level, "none");
  t("1 single em dash: counted as 1", dashRule.count, 1);
  const three = long + " A " + EM + " b " + EM + " c.";
  const a3 = E.analyze(three, {});
  t("1 three dashes in a long text is still below the minimum count, no warning",
    E.LEVEL_RANK[a3.rules.filter(function (r) { return r.id === "RULE-EMDASH"; })[0].level] < E.LEVEL_RANK.noticeable, true);
})();

(function () {
  const a = E.analyze("In conclusion, this is important. Furthermore, it is not just about speed " + EM + " it is about people.", {});
  t("2 short text: tier", a.tier, "observations");
  ok("2 short text: no category is above 'low'", elevated(a) === 0);
  ok("2 short text: summary refuses a pattern verdict", /short/i.test(a.summary) && !/categories crossed/.test(a.summary), a.summary);
  ok("2 short text: density rules are not evaluated", a.rules.filter(function (r) { return r.id === "RULE-EMDASH" && r.applicable; }).length === 0);
})();

(function () {
  const tech = "The service is robust against restarts and exposes a comprehensive API. We leverage the cache to facilitate fast reads. It is robust. A robust queue, a comprehensive log and a comprehensive schema are used. The foundational layer is simple. " +
    "Each node stores its own state, and a comprehensive health check runs every ten seconds. The robust retry logic backs off after three failures. We leverage connection pooling, and we facilitate upgrades by versioning every message. Operators read the foundational docs first and then the comprehensive runbook.";
  const general = E.analyze(tech, { genre: "general" });
  const technical = E.analyze(tech, { genre: "technical" });
  ok("3 technical vocabulary is exempt in technical genre", technical.findings.filter(function (f) { return f.patternId === "RULE-STOCKWORDS"; }).length === 0);
  ok("3 same text in general genre is read more strictly than technical",
    general.findings.length >= technical.findings.length);
  const single = E.analyze("The pipeline is robust. " + "We shipped it on Tuesday and nobody noticed. ".repeat(20), {});
  t("3 a single stock word is never a finding", single.findings.filter(function (f) { return f.patternId === "RULE-STOCKWORDS"; }).length, 0);
})();

(function () {
  const text = 'He said, "it\'s important to note that the sky is delving into the realm of seamlessly robust." It\'s important to note that this is outside quotes.';
  const a = E.analyze(text, {});
  const inQuote = a.findings.filter(function (f) { return f.start < text.indexOf('."'); });
  t("4 a stock phrase inside quotes is not flagged", inQuote.length, 0);
  ok("4 the same phrase outside quotes is flagged", a.findings.some(function (f) { return f.patternId === "PHR-NOTE-THAT" && f.start > text.indexOf('."'); }));
  t("4 skipped-inside-quotes is reported", a.skipped.quoted > 0, true);
})();

/* ---- 3. suggestions preserve meaning-bearing tokens; undo is exact ---- */
(function () {
  const text = "It's important to note that the 2024 budget of $4,500 was approved by Dr. Okafor at https://example.com/budget-2024 on 12 May. Furthermore, the committee [3] agreed. Moreover, we delve into the data (Smith, 2020) and see a trend.";
  const a = E.analyze(text, {});
  const edits = [];
  a.findings.forEach(function (f) {
    if (f.options.length) edits.push({ start: f.options[0].start, end: f.options[0].end, replacement: f.options[0].replacement });
  });
  ok("5 there are edits to apply in the sample", edits.length >= 2, "edits=" + edits.length);
  const r = E.applyEdits(text, edits);
  const tokens = function (s, re) { return (s.match(re) || []).join("|"); };
  t("5 numbers survive", tokens(r.text, /\d[\d,.]*/g), tokens(text, /\d[\d,.]*/g));
  t("5 URLs survive", tokens(r.text, /https?:\/\/\S+/g), tokens(text, /https?:\/\/\S+/g));
  t("5 names survive", tokens(r.text, /Okafor|Smith/g), tokens(text, /Okafor|Smith/g));
  t("5 citations survive", tokens(r.text, /\[\d+\]|\(Smith, 2020\)/g), tokens(text, /\[\d+\]|\(Smith, 2020\)/g));
  ok("5 text actually changed", r.text !== text);
  ok("5 sentence starts are re-capitalised after a removal", /Dr\. Okafor/.test(r.text) && /(^|\. )The 2024 budget/.test(r.text), r.text);
  t("6 undo (no edits) restores the original exactly", E.applyEdits(text, []).text, text);
  // remove each edit one at a time: the result is the same as applying the rest
  let all = true;
  for (let i = 0; i < edits.length; i++) {
    const rest = edits.filter(function (_, j) { return j !== i; });
    const a1 = E.applyEdits(text, rest).text;
    const a2 = E.applyEdits(text, rest.slice().reverse()).text;
    if (a1 !== a2) all = false;
  }
  ok("6 edit order does not matter, so undo of any one is exact", all);
  const clash = E.applyEdits("abcdef", [{ start: 1, end: 4, replacement: "X" }, { start: 2, end: 5, replacement: "Y" }]);
  t("6 overlapping edits are skipped, never merged", [clash.text, clash.skipped.length], ["aXef", 1]);
})();

/* ---- 4. privacy: nothing in the engine or controller can send text ---- */
(function () {
  const forbidden = /\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|importScripts|EventSource|navigator\.sendBeacon)\b/;
  ["patterns.js", "engine.js"].forEach(function (f) {
    const src = fs.readFileSync(path.join(dir, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    ok("7 " + f + " contains no network API", !forbidden.test(src));
  });
  const ctl = fs.readFileSync(path.join(dir, "controller.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok("7 controller contains no network API", !forbidden.test(ctl));
  // every analytics parameter is a banded count, a library id or a fixed label
  const calls = ctl.match(/track\("[a-z_]+",\s*\{[^}]*\}\)/g) || [];
  ok("7 controller has analytics calls to inspect", calls.length >= 6, "found " + calls.length);
  const allowed = new Set(["input_word_band", "genre", "total_finding_band", "analysis_duration_band", "analysis_status", "analysis_tier", "categories_elevated",
    "pattern_category", "improvement_action_count", "apply_source", "reset_kind", "pattern_id", "verdict"]);
  let badKey = null;
  calls.forEach(function (c) {
    (c.match(/\b([a-z_]+):/g) || []).forEach(function (k) {
      const key = k.slice(0, -1);
      if (!allowed.has(key)) badKey = badKey || key;
    });
  });
  ok("7 analytics parameters are all on the allowlist", badKey === null, "unexpected key " + badKey);
  ok("7 no analytics call references the text, a match or a span", !/track\([^)]*(els\.input|state\.original|improvedText|\.slice\(|textContent)/.test(ctl));
  ok("7 user text is never written with innerHTML", !/innerHTML|insertAdjacentHTML|outerHTML/.test(ctl));
})();

/* ---- 5. shape: no score, no probability, no authorship field ---- */
(function () {
  const a = E.analyze(corpus[5].text, {});
  const flat = JSON.stringify(Object.keys(a)).toLowerCase();
  ok("8 result has no score or probability field", !/score|probab|likelihood|authorship|isai|ai_/.test(flat), flat);
  ok("8 summary never claims AI authorship", !/(written|generated) by (an )?ai|% ai|ai[- ]generated/i.test(a.summary), a.summary);
  ok("8 every category level is one of four", a.categories.every(function (c) { return ["none", "low", "noticeable", "high"].indexOf(c.level) >= 0; }));
  ok("8 every finding has the explanation fields", a.findings.every(function (f) {
    return f.name && f.explanation && f.why && f.suggestion && f.evidence && f.ruleConfidence && f.falsePositives && f.category;
  }));
  ok("8 every rule has the five explanation fields", a.rules.filter(function (r) { return r.applicable; }).every(function (r) {
    return r.measured && r.observed && r.why && r.improve && r.certainty;
  }));
  ok("8 every pattern has an id, a method and an evidence tier", P.PHRASES.concat(P.RHETORIC).every(function (p) {
    return p.id && p.method && ["population", "reader", "house"].indexOf(p.evidence) >= 0 && p.explanation && p.suggestion && p.falsePositives;
  }));
  t("8 pattern ids are unique", new Set(P.PHRASES.concat(P.RHETORIC).map(function (p) { return p.id; })).size, P.PHRASES.length + P.RHETORIC.length);
  t("8 the same input gives the same output", JSON.stringify(E.analyze(corpus[5].text, {})), JSON.stringify(E.analyze(corpus[5].text, {})));
})();

/* ---- 6. robustness ---- */
(function () {
  const t1 = corpus.filter(function (c) { return c.id === "ai-styled-generic"; })[0].text;
  const withSeg = E.analyze(t1, {});
  const noSeg = E.analyze(t1, { noSegmenter: true });
  t("9 without Intl.Segmenter the sentence count is the same", noSeg.sentences, withSeg.sentences);
  t("9 without Intl.Segmenter the findings are the same", noSeg.findings.length, withSeg.findings.length);
  const crlf = E.analyze(t1.replace(/\n/g, "\r\n"), {});
  t("10 CRLF input gives the same paragraph count", crlf.paragraphs, withSeg.paragraphs);
  t("10 empty input", E.analyze("", {}).status, "empty");
  t("10 whitespace input", E.analyze("   \n\n  ", {}).status, "empty");
  t("10 non-string input", E.analyze(null, {}).status, "empty");
  const big = E.analyze("word ".repeat(E.MAX_WORDS + 5), {});
  t("10 over the limit is refused with a message", [big.status, big.truncated], ["too_long", true]);
  ok("10 abbreviations do not split sentences",
    E.analyze("Dr. Okafor met Mr. Lee at 9 a.m. on St. James Street. They talked for an hour.", {}).sentences === 2);
  t("10 word count matches the analysis", E.countWords("Don't stop-believing, it's 3.5 million."), E.analyze("Don't stop-believing, it's 3.5 million.", {}).words);
  ok("10 emoji and accents do not throw", E.analyze("The caf\u00e9 is on the corner and we like it \ud83d\ude00. Her na\u00efve plan had a fa\u00e7ade of calm \u2014 and it was fine \ud83c\udf89. ".repeat(30), {}).status === "ok");
  ok("10 a lone surrogate does not throw", E.analyze("hello \ud83d world and more words to read here today", {}).status === "ok");
})();

/* ---- 7. rule behaviour the page promises ---- */
(function () {
  const rep = "Our team is great. Our team is large. Our team is local. Our team is open. Our team is small. We build tables for schools and the local church, and we do it by hand. " +
    "The workshop has been open since 1998 and the same four people still run it. Orders take about three weeks. ";
  const a = E.analyze(rep.repeat(3), {});
  const open = a.rules.filter(function (r) { return r.id === "RULE-OPENINGS"; })[0];
  ok("11 a run of repeated openings is found", open && open.count >= 1, JSON.stringify(open));
  const uniform = ("The cat sat on the old red mat today. The dog ran by the big dark barn then. A bird sang in the tall green tree. One fox hid under the wide grey wall. " +
    "Some bees hum around the pale blue lamp. Each cow ate near the long brown fence. ").repeat(4);
  const u = E.analyze(uniform, {});
  ok("11 uniform sentence length reads as low variation", u.rules.filter(function (r) { return r.id === "RULE-VARIATION"; })[0].level !== "none");
  const varied = E.analyze(corpus[0].text + "\n\n" + corpus[1].text, {});
  t("11 varied human prose is not flagged for variation", varied.rules.filter(function (r) { return r.id === "RULE-VARIATION"; })[0].level, "none");
  ok("11 semicolons are context only and never raise a category",
    E.analyze(("It rained; we stayed in; the dog slept; nobody minded; the kettle boiled; we read. ").repeat(6), {}).rules
      .filter(function (r) { return r.id === "RULE-SEMICOLON"; })[0].level !== "high");
  const noteThat = E.analyze("It's important to note that the vote is Tuesday.", {}).findings[0];
  t("12 a lead-in removal offers a capitalised sentence", E.applyEdits("It's important to note that the vote is Tuesday.", [noteThat.options[0]]).text, "The vote is Tuesday.");
  t("12 'delve into' offers plain verbs, inflected to match",
    (function () {
      const s = "We delve into the numbers and she delves into the logs.";
      const a = E.analyze(s, {});
      return E.applyEdits(s, a.findings.filter(function (f) { return f.options.length; }).map(function (f) { return f.options[0]; })).text;
    })(), "We look at the numbers and she looks at the logs.");
  t("12 'delve deeper into' gets no automatic replacement",
    E.analyze("We delve deeper into the numbers.", {}).findings[0].options.length, 0);
  t("12 explanation-only patterns offer no replacement",
    E.analyze("In today's rapidly evolving landscape we sell chairs.", {}).findings[0].options.length, 0);
  const emd = "First point " + EM + " then second " + EM + " then third " + EM + " then fourth " + EM + " then fifth " + EM + " done. ";
  const d = E.analyze((emd + "Plain sentence number one is here to pad the length of this paragraph a little. ").repeat(9), {});
  ok("12 dash replacement offers comma, colon and full stop", d.findings.some(function (f) { return f.patternId === "PUN-EMDASH" && f.options.length === 3; }));
  const dashFinding = d.findings.filter(function (f) { return f.patternId === "PUN-EMDASH"; })[0];
  const fs2 = dashFinding.options.filter(function (o) { return o.label === "Full stop"; })[0];
  ok("12 the full-stop option capitalises the next word", /^\. [A-Z]$/.test(fs2.replacement), JSON.stringify(fs2));
  ok("12 genre 'formal' is at least as tolerant as 'general'",
    E.analyze(corpus[5].text, { genre: "formal" }).findings.length <= E.analyze(corpus[5].text, { genre: "general" }).findings.length);
})();

/* ---- 8. benchmark: recorded, with a generous ceiling so CI is not flaky ---- */
(function () {
  const sample = corpus.filter(function (c) { return c.id === "human-casual" || c.id === "human-academic" || c.id === "ai-styled-generic"; })
    .map(function (c) { return c.text; }).join("\n\n");
  const per = E.countWords(sample);
  const out = [];
  [1000, 5000, 20000].forEach(function (n) {
    const reps = Math.max(1, Math.floor(n / per));
    const text = new Array(reps).fill(sample).join("\n\n");
    const words = E.countWords(text);
    if (words > E.MAX_WORDS) return;
    E.analyze(text, {});
    const t0 = process.hrtime.bigint();
    const runs = 5;
    for (let i = 0; i < runs; i++) E.analyze(text, {});
    const ms = Number(process.hrtime.bigint() - t0) / 1e6 / runs;
    out.push({ words: words, ms: Math.round(ms * 10) / 10 });
    ok("13 analysing ~" + words + " words stays under 1500 ms on this machine", ms < 1500, ms + " ms");
  });
  console.log("BENCHMARK (node " + process.version + ", mean of 5 runs): " + JSON.stringify(out));
})();

console.log("\n" + (total - fail) + "/" + total + " assertions passed");
process.exit(fail ? 1 : 0);
