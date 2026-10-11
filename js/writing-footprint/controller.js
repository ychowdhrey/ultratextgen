/* ==========================================================
   js/writing-footprint/controller.js
   DOM wiring for /ai-writing-footprint-checker/. All analysis is in
   engine.js and runs in this tab; nothing here sends the text anywhere.

   Text handling rules this file keeps:
   - User text is only ever written with textContent / text nodes, never
     innerHTML, so pasted markup cannot execute.
   - Highlighting does not alter the text: the marked view is the original
     string split into text nodes and buttons.
   - An edit is a {start, end, replacement} against the ORIGINAL string.
     The improved text is always applyEdits(original, accepted), so Undo
     and Reset restore the original byte for byte.

   Analytics (dataLayer): action types and banded counts only. Never the
   pasted text, a matched phrase, a name or a URL. Typing, selecting and
   toggling never fire an event; only the six actions below do.
   ========================================================== */
(function () {
  "use strict";

  const UTG = window.UltraTextGen || {};
  const WF = UTG.writingFootprint || {};
  const engine = WF.engine;
  if (!engine) return;

  const $ = function (id) { return document.getElementById(id); };
  const LEVEL_LABEL = { none: "Not observed", low: "Observed, below threshold", noticeable: "Noticeable", high: "Frequent" };
  const EVIDENCE_LABEL = {
    population: "Measured shift in published text. Says nothing about this one text.",
    reader: "Readers and editors often name this. Nothing shows it predicts who wrote a text.",
    house: "A style judgement, with no authorship claim."
  };
  const SAFETY_LABEL = {
    safe_to_propose: "Safe to propose",
    requires_context: "Needs your judgement",
    explanation_only: "Explanation only"
  };

  const state = {
    original: "",
    analysis: null,
    edits: new Map(),
    order: [],
    ignored: new Set(),
    selected: null,
    showSuggestions: false,
    genre: "general"
  };
  let els = {};

  /* ----------------------------------------------------------- analytics */

  function band(n, edges, labels) {
    for (let i = 0; i < edges.length; i++) if (n < edges[i]) return labels[i];
    return labels[labels.length - 1];
  }
  const wordBand = function (n) { return band(n, [50, 200, 500, 2000], ["under_50", "50_199", "200_499", "500_1999", "2000_plus"]); };
  const findingBand = function (n) { return band(n, [1, 6, 16], ["0", "1_5", "6_15", "16_plus"]); };
  const durationBand = function (ms) { return band(ms, [50, 200], ["under_50ms", "50_199ms", "200ms_plus"]); };

  function track(name, params) {
    try {
      window.dataLayer = window.dataLayer || [];
      const payload = { event: name };
      Object.keys(params || {}).forEach(function (k) { payload[k] = params[k]; });
      window.dataLayer.push(payload);
    } catch (e) { /* analytics must never break the tool */ }
  }

  /* -------------------------------------------------------------- helpers */

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function nowMs() { return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now(); }
  function isIgnored(f) { return state.ignored.has(f.key); }
  function liveFindings() {
    return state.analysis ? state.analysis.findings.filter(function (f) { return !isIgnored(f); }) : [];
  }
  function findingByKey(key) {
    const list = state.analysis ? state.analysis.findings : [];
    for (let i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
  }
  function improvedText() {
    const edits = state.order.map(function (k) { return state.edits.get(k); }).filter(Boolean);
    return engine.applyEdits(state.original, edits).text;
  }
  function liveStatus(msg) {
    els.status.textContent = msg;
  }

  /* ---------------------------------------------------------------- counts */

  function updateCounts() {
    const t = els.input.value;
    const w = engine.countWords(t);
    els.counts.textContent = w.toLocaleString("en-US") + (w === 1 ? " word" : " words") + " · " + t.length.toLocaleString("en-US") + " characters";
    els.analyse.disabled = w === 0;
    els.clearBtn.disabled = t.length === 0 && !state.analysis;
    els.limit.hidden = !(w > engine.MAX_WORDS || t.length > engine.MAX_CHARS);
  }

  /* --------------------------------------------------------------- analyse */

  function runAnalysis() {
    const text = els.input.value;
    const w = engine.countWords(text);
    track("writing_analysis_started", { input_word_band: wordBand(w), genre: els.genre.value });
    els.analyse.disabled = true;
    liveStatus("Analysing…");
    const go = function () {
      const t0 = nowMs();
      state.original = text;
      state.genre = els.genre.value;
      state.edits = new Map();
      state.order = [];
      state.ignored = new Set();
      state.selected = null;
      state.analysis = engine.analyze(text, { genre: state.genre });
      const ms = nowMs() - t0;
      renderAll();
      els.analyse.disabled = false;
      const a = state.analysis;
      track("writing_analysis_completed", {
        input_word_band: wordBand(a.words),
        total_finding_band: findingBand(a.findings.length),
        analysis_duration_band: durationBand(ms),
        analysis_status: a.status,
        analysis_tier: a.tier,
        categories_elevated: a.categories.filter(function (c) { return engine.LEVEL_RANK[c.level] >= 2; }).length,
        genre: state.genre
      });
      liveStatus(a.summary);
      if (a.status === "ok") els.report.scrollIntoView({ block: "start", behavior: "smooth" });
    };
    // let the "Analysing…" state paint before a large synchronous run
    if (w > 4000) setTimeout(go, 0); else go();
  }

  function resetAll() {
    const had = !!state.analysis;
    state.analysis = null;
    state.edits = new Map();
    state.order = [];
    state.ignored = new Set();
    state.selected = null;
    state.original = "";
    els.input.value = "";
    els.report.hidden = true;
    updateCounts();
    liveStatus("Cleared.");
    if (had) track("writing_analysis_reset", { reset_kind: "clear" });
    els.input.focus();
  }

  /* ------------------------------------------------------------- rendering */

  function renderAll() {
    const a = state.analysis;
    if (!a) { els.report.hidden = true; return; }
    els.report.hidden = false;
    els.summary.textContent = a.summary;
    const hasFindings = a.status === "ok";
    els.reportBody.hidden = !hasFindings;
    if (!hasFindings) { updateCounts(); return; }
    renderCategories();
    renderText();
    renderDetail();
    renderSuggestions();
    renderControls();
    renderCompare();
    renderRules();
    renderLimits();
    updateCounts();
  }

  function renderCategories() {
    const a = state.analysis;
    clear(els.categories);
    a.categories.forEach(function (c) {
      const tr = el("tr");
      tr.appendChild(el("th", null, c.name)).setAttribute("scope", "row");
      const lv = el("td");
      const badge = el("span", "wf-level wf-level-" + (c.evaluated ? c.level : "na"), c.evaluated ? LEVEL_LABEL[c.level] : "Needs more text");
      lv.appendChild(badge);
      tr.appendChild(lv);
      const rs = a.rules.filter(function (r) { return r.category === c.id && r.applicable && r.count != null && r.count > 0; });
      tr.appendChild(el("td", null, rs.length ? rs.map(function (r) { return r.name + ": " + r.observed; }).join(" · ") : (c.evaluated ? "Nothing found" : "Not enough text to read this")));
      els.categories.appendChild(tr);
    });
  }

  function renderText() {
    const f = liveFindings();
    clear(els.marked);
    let cursor = 0;
    const text = state.original;
    f.forEach(function (x) {
      if (x.start < cursor) return;
      if (x.start > cursor) els.marked.appendChild(document.createTextNode(text.slice(cursor, x.start)));
      const b = el("button", "wf-mark wf-mark-" + x.prominence + (state.edits.has(x.key) ? " wf-applied" : "") + (state.selected === x.key ? " wf-selected" : ""));
      b.type = "button";
      b.textContent = text.slice(x.start, x.end);
      b.setAttribute("data-key", x.key);
      b.setAttribute("aria-label", text.slice(x.start, x.end) + ". Flagged: " + x.name + (state.edits.has(x.key) ? ". Change applied" : ""));
      b.setAttribute("aria-controls", "wfDetail");
      b.setAttribute("aria-pressed", state.selected === x.key ? "true" : "false");
      els.marked.appendChild(b);
      cursor = x.end;
    });
    if (cursor < text.length) els.marked.appendChild(document.createTextNode(text.slice(cursor)));
    const n = f.length;
    els.markedCount.textContent = n === 0 ? "No highlights" : n + (n === 1 ? " highlight" : " highlights");
  }

  function renderDetail() {
    const d = els.detail;
    clear(d);
    const f = state.selected ? findingByKey(state.selected) : null;
    if (!f || isIgnored(f)) {
      d.appendChild(el("p", "wf-detail-empty", "Select a highlighted phrase to see why it was flagged."));
      return;
    }
    d.appendChild(el("h3", "wf-detail-title", f.name));
    const dl = el("dl", "wf-detail-list");
    const row = function (k, v) { dl.appendChild(el("dt", null, k)); dl.appendChild(el("dd", null, v)); };
    row("What was found", "“" + state.original.slice(f.start, f.end).trim() + "”");
    row("Why it was flagged", f.explanation);
    row("Why a reader might notice", f.why);
    row("Evidence strength", EVIDENCE_LABEL[f.evidence] + " Rule confidence: " + f.ruleConfidence + ".");
    row("Could be a false alarm when", f.falsePositives);
    row("How to improve it", f.suggestion);
    d.appendChild(dl);
    const actions = el("div", "wf-detail-actions");
    if (f.options.length) {
      const fs = el("fieldset", "wf-options");
      fs.appendChild(el("legend", null, "Replace with (" + SAFETY_LABEL[f.safety].toLowerCase() + ")"));
      f.options.forEach(function (o, i) {
        const id = "wfOpt" + i;
        const lab = el("label", "wf-option");
        lab.setAttribute("for", id);
        const r = el("input");
        r.type = "radio"; r.name = "wfOpt"; r.id = id; r.value = String(i);
        const cur = state.edits.get(f.key);
        r.checked = cur ? cur.optionIndex === i : i === 0;
        lab.appendChild(r);
        lab.appendChild(el("span", null, o.label));
        fs.appendChild(lab);
      });
      d.appendChild(fs);
      const ap = el("button", "wf-btn wf-btn-primary", state.edits.has(f.key) ? "Change applied" : "Apply this change");
      ap.type = "button"; ap.disabled = state.edits.has(f.key);
      ap.addEventListener("click", function () {
        const sel = d.querySelector("input[name=wfOpt]:checked");
        applyOne(f, sel ? parseInt(sel.value, 10) : 0, "detail");
      });
      actions.appendChild(ap);
    } else {
      d.appendChild(el("p", "wf-detail-note", "No automatic replacement for this one. Rewriting it needs your knowledge of what you meant."));
    }
    const ig = el("button", "wf-btn", "Ignore this one");
    ig.type = "button";
    ig.addEventListener("click", function () {
      state.ignored.add(f.key);
      if (state.edits.has(f.key)) undoKey(f.key);
      state.selected = null;
      renderAll();
      liveStatus("Ignored. It no longer counts.");
    });
    actions.appendChild(ig);
    d.appendChild(actions);
    d.appendChild(el("p", "wf-detail-cat", "Category: " + categoryName(f.category)));
    // Both answers are asked for, so the rate of wrong flags has a denominator.
    // Only the library's pattern id and the answer are recorded, never text.
    const fb = el("div", "wf-feedback");
    fb.appendChild(el("span", "wf-feedback-q", "Was this flag useful?"));
    [["useful", "Useful"], ["not_useful", "Not useful"]].forEach(function (v) {
      const b = el("button", "wf-btn wf-btn-small", v[1]);
      b.type = "button";
      b.addEventListener("click", function () {
        track("writing_flag_feedback", { pattern_id: f.patternId, verdict: v[0] });
        fb.textContent = "Thanks. That answer was recorded without your text.";
      });
      fb.appendChild(b);
    });
    d.appendChild(fb);
  }

  function categoryName(id) {
    const c = WF.patterns.CATEGORIES.filter(function (x) { return x.id === id; })[0];
    return c ? c.name : id;
  }

  function renderSuggestions() {
    clear(els.suggestions);
    els.suggestionsWrap.hidden = !state.showSuggestions;
    if (!state.showSuggestions) return;
    const list = liveFindings().filter(function (f) { return f.options.length; });
    if (!list.length) {
      els.suggestions.appendChild(el("p", "wf-detail-note", "No replacements are proposed for this text. The highlights above are explanations only, because rewriting them depends on what you meant."));
      return;
    }
    list.forEach(function (f, idx) {
      const li = el("li", "wf-sug");
      const id = "wfSug" + idx;
      const cb = el("input"); cb.type = "checkbox"; cb.id = id; cb.setAttribute("data-key", f.key);
      cb.checked = state.edits.has(f.key);
      li.appendChild(cb);
      const body = el("div", "wf-sug-body");
      const lab = el("label", null, state.original.slice(f.start, f.end).trim() + "  →  ");
      lab.setAttribute("for", id);
      const sel = el("select", "wf-sug-select");
      sel.setAttribute("aria-label", "Replacement for " + f.name);
      f.options.forEach(function (o, i) {
        const op = el("option", null, o.label);
        op.value = String(i);
        sel.appendChild(op);
      });
      const cur = state.edits.get(f.key);
      if (cur) sel.value = String(cur.optionIndex);
      sel.setAttribute("data-key", f.key);
      lab.appendChild(sel);
      body.appendChild(lab);
      body.appendChild(el("span", "wf-sug-tag wf-safety-" + f.safety, SAFETY_LABEL[f.safety] + " · " + f.name));
      li.appendChild(body);
      els.suggestions.appendChild(li);
    });
  }

  function renderControls() {
    const a = state.analysis;
    const any = a && a.findings.some(function (f) { return f.options.length && !isIgnored(f); });
    els.showSug.setAttribute("aria-pressed", state.showSuggestions ? "true" : "false");
    els.showSug.textContent = state.showSuggestions ? "Hide Suggestions" : "Show Suggestions";
    els.showSug.disabled = !any;
    els.apply.disabled = !state.showSuggestions;
    els.undo.disabled = state.order.length === 0;
    els.resetOrig.disabled = state.order.length === 0;
    els.copy.disabled = state.order.length === 0;
    els.improvedWrap.hidden = state.order.length === 0;
    els.hint.textContent = any ? "" : "No automatic replacements for this text. Highlights are explanations only.";
  }

  function renderCompare() {
    const wrap = els.compareWrap;
    if (!state.order.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    const improved = improvedText();
    els.improved.textContent = improved;
    const before = engine.compareMetrics(state.analysis);
    const after = engine.compareMetrics(engine.analyze(improved, { genre: state.genre }));
    clear(els.compare);
    const rows = [
      ["Stock phrase and construction matches", before.phraseMatches, after.phraseMatches],
      ["Sentences opening with a linking word", before.transitionOpeners, after.transitionOpeners],
      ["Runs of repeated sentence openings", before.repeatedOpeningRuns, after.repeatedOpeningRuns],
      ["Em dashes", before.emDashes, after.emDashes],
      ["Sentence length variation", before.sentenceVariation, after.sentenceVariation]
    ];
    rows.forEach(function (r) {
      const tr = el("tr");
      tr.appendChild(el("th", null, r[0])).setAttribute("scope", "row");
      const fmt = function (v) { return v == null ? "Not read" : String(v); };
      tr.appendChild(el("td", null, fmt(r[1])));
      tr.appendChild(el("td", null, fmt(r[2])));
      els.compare.appendChild(tr);
    });
  }

  function renderRules() {
    const a = state.analysis;
    clear(els.rules);
    a.rules.filter(function (r) { return r.applicable; }).forEach(function (r) {
      const d = el("details", "wf-rule");
      d.setAttribute("data-category", r.category);
      const s = el("summary", null, r.name + " · " + LEVEL_LABEL[r.level]);
      d.appendChild(s);
      const dl = el("dl", "wf-detail-list");
      const row = function (k, v) { if (v) { dl.appendChild(el("dt", null, k)); dl.appendChild(el("dd", null, v)); } };
      row("What was measured", r.measured);
      row("What was observed", r.observed);
      row("Why readers might notice", r.why);
      row("How to improve it", r.improve);
      row("How certain this is", r.certainty);
      row("Note", r.note);
      d.appendChild(dl);
      d.addEventListener("toggle", function () {
        if (d.open) track("writing_pattern_expanded", { pattern_category: r.category });
      });
      els.rules.appendChild(d);
    });
  }

  function renderLimits() {
    const a = state.analysis;
    clear(els.limits);
    const skipped = a.skipped;
    const bits = [];
    if (skipped.quoted) bits.push(skipped.quoted + " match" + (skipped.quoted === 1 ? " was" : "es were") + " inside quotes, code, links or citations and left alone.");
    if (skipped.exempt) bits.push(skipped.exempt + " match" + (skipped.exempt === 1 ? " was" : "es were") + " skipped because the " + a.genre + " setting treats them as normal.");
    if (skipped.overlap) bits.push(skipped.overlap + " overlapping match" + (skipped.overlap === 1 ? " was" : "es were") + " counted once, under the more prominent pattern.");
    bits.forEach(function (b) { els.limits.appendChild(el("li", null, b)); });
    a.notMeasured.forEach(function (n) { els.limits.appendChild(el("li", null, "Not measured: " + n.name + ". " + n.why)); });
  }

  /* --------------------------------------------------------------- edits */

  function applyOne(f, optionIndex, source) {
    const o = f.options[optionIndex];
    if (!o) return false;
    if (state.edits.has(f.key)) undoKey(f.key, true);
    // reject an edit that collides with an edit already accepted
    const clash = state.order.some(function (k) {
      const e = state.edits.get(k);
      return e && o.start < e.end && o.end > e.start;
    });
    if (clash) { liveStatus("That change overlaps one you already applied."); return false; }
    state.edits.set(f.key, { start: o.start, end: o.end, replacement: o.replacement, optionIndex: optionIndex });
    state.order.push(f.key);
    track("writing_suggestion_applied", {
      pattern_category: f.category, improvement_action_count: state.order.length, apply_source: source
    });
    return true;
  }

  function undoKey(key, silent) {
    state.edits.delete(key);
    state.order = state.order.filter(function (k) { return k !== key; });
    if (!silent) track("writing_suggestion_undone", { improvement_action_count: state.order.length });
  }

  function applySelected() {
    let n = 0;
    Array.prototype.forEach.call(els.suggestions.querySelectorAll("input[type=checkbox]"), function (cb) {
      const f = findingByKey(cb.getAttribute("data-key"));
      if (!f || !cb.checked) return;
      const sel = els.suggestions.querySelector("select[data-key=\"" + cb.getAttribute("data-key") + "\"]");
      const idx = sel ? parseInt(sel.value, 10) : 0;
      const cur = state.edits.get(f.key);
      if (cur && cur.optionIndex === idx) return;
      if (applyOne(f, idx, "bulk")) n++;
    });
    // checkboxes cleared by the user remove their edit
    Array.prototype.forEach.call(els.suggestions.querySelectorAll("input[type=checkbox]"), function (cb) {
      if (!cb.checked && state.edits.has(cb.getAttribute("data-key"))) undoKey(cb.getAttribute("data-key"));
    });
    renderAll();
    liveStatus(n ? n + " change" + (n === 1 ? "" : "s") + " applied. Original text is untouched." : "No new changes selected.");
  }

  function undoLast() {
    if (!state.order.length) return;
    undoKey(state.order[state.order.length - 1]);
    renderAll();
    liveStatus("Last change undone.");
  }

  function resetToOriginal() {
    if (!state.order.length) return;
    state.edits = new Map();
    state.order = [];
    renderAll();
    track("writing_analysis_reset", { reset_kind: "original" });
    liveStatus("Back to your original text.");
  }

  /* ----------------------------------------------------------------- copy */

  function legacyCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function copyImproved() {
    const text = improvedText();
    const done = function (ok) {
      if (!ok) { liveStatus("Copy failed. Select the improved text and copy it by hand."); return; }
      track("writing_result_copied", { improvement_action_count: state.order.length });
      liveStatus("Improved text copied.");
      els.copy.textContent = "Copied";
      setTimeout(function () { els.copy.textContent = "Copy Improved Text"; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(legacyCopy(text)); });
    } else {
      done(legacyCopy(text));
    }
  }

  /* ------------------------------------------------------------------ init */

  function init() {
    els = {
      input: $("wfInput"), counts: $("wfCounts"), limit: $("wfLimit"), genre: $("wfGenre"),
      analyse: $("wfAnalyse"), clearBtn: $("wfClear"), status: $("wfStatus"),
      report: $("wfReport"), reportBody: $("wfReportBody"), summary: $("wfSummary"),
      categories: $("wfCategories"), marked: $("wfMarked"), markedCount: $("wfMarkedCount"),
      detail: $("wfDetail"), suggestionsWrap: $("wfSuggestionsWrap"), suggestions: $("wfSuggestions"),
      showSug: $("wfShowSug"), apply: $("wfApply"), undo: $("wfUndo"), resetOrig: $("wfResetOrig"),
      copy: $("wfCopy"), hint: $("wfHint"), improvedWrap: $("wfImprovedWrap"), improved: $("wfImproved"),
      compareWrap: $("wfCompareWrap"), compare: $("wfCompare"), rules: $("wfRules"), limits: $("wfLimits")
    };
    if (!els.input || !els.analyse) return;

    els.input.addEventListener("input", function () {
      updateCounts();
      // The report belongs to the text that was analysed. Editing the box
      // retires it rather than leaving highlights pointing at moved text.
      if (state.analysis && els.input.value !== state.original) {
        state.analysis = null;
        state.edits = new Map();
        state.order = [];
        els.report.hidden = true;
        liveStatus("Text changed. Analyse again to refresh the report.");
      }
    });
    els.analyse.addEventListener("click", runAnalysis);
    els.clearBtn.addEventListener("click", resetAll);
    els.marked.addEventListener("click", function (e) {
      const b = e.target.closest ? e.target.closest(".wf-mark") : null;
      if (!b) return;
      state.selected = b.getAttribute("data-key");
      renderText();
      renderDetail();
      const again = els.marked.querySelector("[data-key=\"" + state.selected + "\"]");
      if (again) again.focus();
    });
    els.showSug.addEventListener("click", function () {
      state.showSuggestions = !state.showSuggestions;
      renderSuggestions();
      renderControls();
    });
    els.apply.addEventListener("click", applySelected);
    els.undo.addEventListener("click", undoLast);
    els.resetOrig.addEventListener("click", resetToOriginal);
    els.copy.addEventListener("click", copyImproved);
    updateCounts();
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init);
})();
