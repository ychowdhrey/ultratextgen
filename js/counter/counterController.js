/* ==========================================================
   counterController.js
   Page controller for /character-counter/.

   Drives three layers, in the order the user actually needs them:
     1. MEASURE  — live stats, in every counting unit that matters
     2. DIAGNOSE — what is in the text that the field counts but you
                   cannot see (invisible characters, styled Unicode,
                   the one character that just doubled your SMS bill)
     3. FIX      — one-click reducers with real savings, and a trim that
                   cuts on a word boundary in the destination's own unit

   Pairs with counterRules.js (limits + counting engine + target picker)
   and counterReduce.js (the fix layer).
   ========================================================== */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);

  const READING_WPM = 225;
  const SPEAKING_WPM = 130;

  function countWords(str) {
    const trimmed = str.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  function countSentences(str) {
    const trimmed = str.trim();
    if (!trimmed) return 0;
    const matches = trimmed.match(/[^.!?]+[.!?]+/g) || [];
    const consumed = matches.join("").length;
    const remainder = trimmed.slice(consumed).trim();
    return matches.length + (remainder ? 1 : 0);
  }

  function countParagraphs(str) {
    return str.split(/\n+/).map((p) => p.trim()).filter(Boolean).length;
  }

  function countLines(str) {
    if (!str) return 0;
    return str.split("\n").length;
  }

  /* Locale overrides. A page sets window.UTG_COUNTER_I18N before this script
     runs; anything it omits falls back to the English default below, the same
     merge-over-defaults pattern script.js uses for window.UTG_DECORATIONS.
     `units` lets a locale add billing/page-unit stat tiles: each entry is
     { id: <element id>, per: <chars per unit>, of: "chars"|"charsNoSpaces",
       decimals: <fraction digits, default 1> } — e.g. Poland's billing page
     (1800 characters with spaces) or Italy's cartella. The tile's markup
     lives in the page HTML; the controller only fills the number. */
  const I18N = Object.assign({
    sec: "sec",
    min: "min",
    copied: "Copied!",
    label: "Where is this text going?",
    ok: "Fits ✓",
    fail: "Over the limit ✕",
    xNote: null,
    smsSegments: null,
    smsUnicode: null,
    visibleNote: null,
    platformLabel: null,
    fieldLabel: null,
    labels: null,
    fields: null,
    platforms: null,
    groups: null,
    units: null,
    selected: null,
    /* Fix-layer button copy. The reducers themselves live in
       counterReduce.js with English labels; a locale page overrides them by
       reducer id here (`reducers`/`reducerHints`) rather than forking the
       module, so a reducer added later falls back to English instead of
       silently disappearing from translated pages. */
    reducers: null,
    reducerHints: null,
    segShort: "seg",
    overBy: "Over by {n} — pick a fix:",
    trimToFit: "Trim to fit",
    undo: "Undo",
    applied: "Applied",
    fitsHeading: "Where else this text fits",
    inspectStyled: "{n} styled Unicode letters — they cost 2 each on X and in many app fields.",
    inspectInvisible: "{n} invisible characters that still count.",
    inspectCombining: "{n} stacked diacritic marks."
  }, window.UTG_COUNTER_I18N || {});

  function fmt(t, vars) {
    return String(t).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  }

  function formatTime(words, wpm) {
    if (!words) return "0 " + I18N.sec;
    const minutes = words / wpm;
    if (minutes < 1) {
      const seconds = Math.max(1, Math.round(minutes * 60));
      return seconds + " " + I18N.sec;
    }
    return Math.ceil(minutes) + " " + I18N.min;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function init() {
    const input = document.getElementById("counterInput");
    if (!input) return;

    const urlQ = new URLSearchParams(window.location.search).get("q");
    if (urlQ) input.value = urlQ;

    const stat = {
      chars: $("#statChars"),
      charsNoSpaces: $("#statCharsNoSpaces"),
      words: $("#statWords"),
      sentences: $("#statSentences"),
      paragraphs: $("#statParagraphs"),
      readingTime: $("#statReadingTime"),
      speakingTime: $("#statSpeakingTime"),
      lines: $("#statLines"),
      graphemes: $("#statGraphemes"),
      utf16: $("#statUtf16"),
      bytes: $("#statBytes")
    };
    const clearBtn = document.getElementById("counterClearBtn");
    const copyBtn = document.getElementById("counterCopyBtn");
    const liveCount = document.getElementById("counterLiveCount");
    const fixBar = document.getElementById("counterFixBar");
    const inspectBar = document.getElementById("counterInspect");
    const fitGrid = document.getElementById("counterFitGrid");

    const ns = window.UltraTextGen || {};
    const counts = ns.counterCounts || null;
    const rules = ns.counterRules || null;
    const reduce = ns.counterReduce || null;

    let checker = null;
    let undoValue = null;

    function activeLimitId() {
      return checker ? checker.getLimitId() : (rules ? rules.LIMITS[0].id : null);
    }

    /* ---------- 3. FIX ---------- */
    function applyValue(next) {
      undoValue = input.value;
      input.value = next;
      renderAll();
      input.focus();
    }

    function renderFix() {
      if (!fixBar || !rules || !reduce) return;
      const value = input.value;
      const limitId = activeLimitId();
      if (!value || !limitId) { fixBar.hidden = true; return; }

      const report = rules.analyze(value, limitId);
      const suggestions = reduce.suggest(value, limitId).slice(0, 4);
      const over = !report.fits;

      // Nothing to say: it fits and there is no saving worth offering.
      if (!over && !suggestions.length && !undoValue) { fixBar.hidden = true; return; }

      fixBar.innerHTML = "";
      fixBar.hidden = false;
      fixBar.classList.toggle("is-over", over);

      if (over) {
        const need = Math.abs(report.remaining);
        fixBar.appendChild(el("p", "cc-fix-lead", fmt(I18N.overBy, { n: need.toLocaleString() })));
      }

      const actions = el("div", "cc-fix-actions");
      suggestions.forEach((s) => {
        const btn = el("button", "cc-fix-btn");
        btn.type = "button";
        btn.title = (I18N.reducerHints && I18N.reducerHints[s.id]) || s.hint || "";
        btn.appendChild(el("span", "cc-fix-btn-label",
          (I18N.reducers && I18N.reducers[s.id]) || s.label));
        const tag = s.segmentsAfter != null
          ? s.segmentsBefore + " → " + s.segmentsAfter + " " + I18N.segShort
          : "−" + s.saved;
        btn.appendChild(el("span", "cc-fix-btn-save", tag));
        btn.addEventListener("click", () => applyValue(s.result));
        actions.appendChild(btn);
      });

      if (over) {
        const trim = el("button", "cc-fix-btn cc-fix-btn-trim");
        trim.type = "button";
        trim.appendChild(el("span", "cc-fix-btn-label", I18N.trimToFit));
        trim.appendChild(el("span", "cc-fix-btn-save", "✂"));
        trim.addEventListener("click", () => {
          applyValue(reduce.trimToFit(input.value, limitId, { ellipsis: true }));
        });
        actions.appendChild(trim);
      }

      if (undoValue !== null) {
        const undo = el("button", "cc-fix-btn cc-fix-btn-undo");
        undo.type = "button";
        undo.textContent = I18N.undo;
        undo.addEventListener("click", () => {
          const prev = undoValue;
          undoValue = null;
          input.value = prev;
          renderAll();
          input.focus();
        });
        actions.appendChild(undo);
      }

      fixBar.appendChild(actions);
    }

    /* ---------- 2. DIAGNOSE ---------- */
    function renderInspect() {
      if (!inspectBar || !reduce) return;
      const value = input.value;
      if (!value) { inspectBar.hidden = true; return; }
      const info = reduce.inspect(value);
      const bits = [];
      if (info.invisible) bits.push(fmt(I18N.inspectInvisible, { n: info.invisible }));
      if (info.styled) bits.push(fmt(I18N.inspectStyled, { n: info.styled }));
      if (info.combining) bits.push(fmt(I18N.inspectCombining, { n: info.combining }));
      inspectBar.textContent = bits.join(" ");
      inspectBar.hidden = bits.length === 0;
    }

    /* ---------- the live count that sits with the box ---------- */
    function renderLive() {
      if (!liveCount || !rules) return;
      const limitId = activeLimitId();
      if (!limitId) return;
      const report = rules.analyze(input.value, limitId);
      liveCount.textContent = report.glyphs.toLocaleString() + " / " + report.limit.toLocaleString();
      liveCount.classList.toggle("is-over", !report.fits);
      liveCount.classList.toggle("is-close", report.fits && report.limit && (report.glyphs / report.limit) >= 0.9);
      input.classList.toggle("is-over-limit", !report.fits && report.glyphs > 0);
    }

    /* ---------- where else does it fit ---------- */
    function renderFitGrid() {
      if (!fitGrid || !rules) return;
      const value = input.value;
      if (!value) { fitGrid.hidden = true; return; }
      fitGrid.hidden = false;
      fitGrid.innerHTML = "";
      const activeId = activeLimitId();
      rules.fitsAll(value).forEach((row) => {
        const chip = el("span", "cc-fit-chip " + (row.fits ? "is-fit" : "is-unfit"));
        if (row.rule.id === activeId) chip.classList.add("is-active");
        const name = (I18N.labels && I18N.labels[row.rule.id]) || row.rule.label;
        chip.appendChild(el("span", "cc-fit-name", name));
        chip.appendChild(el("span", "cc-fit-num", row.fits
          ? row.remaining.toLocaleString()
          : "−" + Math.abs(row.remaining).toLocaleString()));
        fitGrid.appendChild(chip);
      });
    }

    /* ---------- 1. MEASURE ---------- */
    function renderStats() {
      const val = input.value;
      const chars = Array.from(val).length;
      const charsNoSpaces = Array.from(val.replace(/\s/g, "")).length;
      const words = countWords(val);

      if (stat.chars) stat.chars.textContent = chars.toLocaleString();
      if (stat.charsNoSpaces) stat.charsNoSpaces.textContent = charsNoSpaces.toLocaleString();
      if (stat.words) stat.words.textContent = words.toLocaleString();
      if (stat.sentences) stat.sentences.textContent = countSentences(val).toLocaleString();
      if (stat.paragraphs) stat.paragraphs.textContent = countParagraphs(val).toLocaleString();
      if (stat.readingTime) stat.readingTime.textContent = formatTime(words, READING_WPM);
      if (stat.speakingTime) stat.speakingTime.textContent = formatTime(words, SPEAKING_WPM);
      if (stat.lines) stat.lines.textContent = countLines(val).toLocaleString();

      if (counts) {
        if (stat.graphemes) stat.graphemes.textContent = counts.graphemes(val).toLocaleString();
        if (stat.utf16) stat.utf16.textContent = counts.utf16Units(val).toLocaleString();
        if (stat.bytes) stat.bytes.textContent = counts.utf8Bytes(val).toLocaleString();
      }

      if (I18N.units) {
        I18N.units.forEach((unit) => {
          const node = document.getElementById(unit.id);
          if (!node || !unit.per) return;
          const base = unit.of === "charsNoSpaces" ? charsNoSpaces : chars;
          const decimals = unit.decimals != null ? unit.decimals : 1;
          node.textContent = (base / unit.per).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals
          });
        });
      }

      if (clearBtn) clearBtn.hidden = chars === 0;
    }

    function renderAll() {
      renderStats();
      renderLive();
      renderInspect();
      renderFix();
      renderFitGrid();
      if (checker) checker.render();
    }

    input.addEventListener("input", () => { undoValue = null; renderAll(); });

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        input.value = "";
        undoValue = null;
        input.focus();
        renderAll();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        if (!input.value) return;
        try {
          await navigator.clipboard.writeText(input.value);
          const original = copyBtn.textContent;
          copyBtn.textContent = I18N.copied;
          copyBtn.classList.add("is-copied");
          setTimeout(() => {
            copyBtn.textContent = original;
            copyBtn.classList.remove("is-copied");
          }, 1500);
        } catch (err) {
          console.error("Copy failed:", err);
        }
      });
    }

    if (rules && rules.initChecker) {
      checker = rules.initChecker({
        mount: "platformChecker",
        inputId: "counterInput",
        selected: I18N.selected || undefined,
        text: {
          label: I18N.label,
          ok: I18N.ok,
          fail: I18N.fail,
          xNote: I18N.xNote || undefined,
          smsSegments: I18N.smsSegments || undefined,
          smsUnicode: I18N.smsUnicode || undefined,
          visibleNote: I18N.visibleNote || undefined,
          platformLabel: I18N.platformLabel || undefined,
          fieldLabel: I18N.fieldLabel || undefined
        },
        labels: I18N.labels || undefined,
        fields: I18N.fields || undefined,
        platforms: I18N.platforms || undefined,
        groups: I18N.groups || undefined
      });
      document.addEventListener("utg:counterlimitchange", renderAll);
    }

    renderAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
