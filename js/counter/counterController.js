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

   Opt-in per page, so a page that declares none of them is unchanged:
     - script tiles (#statHan, #statCjkPunct, #statOtherChars, #statSegWords),
       filled only where the markup carries them (the Chinese counters);
     - side fields ([data-counter-rule]), extra boxes each bound to one rule
       (the X counter's bio and display name);
     - the three counter events, behind window.UTG_COUNTER_EVENTS = true
       (see @counter-events below).
   ========================================================== */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);

  const READING_WPM = 225;
  const SPEAKING_WPM = 130;

  // Thai, Lao, Khmer, Burmese, Japanese and Chinese run words together, so
  // splitting on spaces read a whole paragraph as one word, and the reading and
  // speaking times were derived from that 1. The browser's own dictionary
  // segmenter counts them; where it is missing the old split stays.
  const UNSPACED_RE = /[\u0E00-\u0EFF\u1000-\u109F\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uF900-\uFAFF]/;

  function countWords(str) {
    const trimmed = str.trim();
    if (!trimmed) return 0;
    if (UNSPACED_RE.test(trimmed) && typeof Intl !== "undefined" && Intl.Segmenter) {
      const lang = (typeof document !== "undefined" && document.documentElement.lang) || undefined;
      let words = 0;
      try {
        for (const part of new Intl.Segmenter(lang, { granularity: "word" }).segment(trimmed)) {
          if (part.isWordLike) words++;
        }
      } catch (e) {
        return trimmed.split(/\s+/).length;
      }
      return words;
    }
    return trimmed.split(/\s+/).length;
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
    pastFold: null,
    showAllFits: "Show all {n}",
    showFewerFits: "Show fewer",
    /* The fold layer. Every string a locale page must translate. */
    foldHeading: "What people see before \u201csee more\u201d",
    foldMore: "see more",
    foldMeta: "{shown} of {total} characters shown \u00b7 {hidden} hidden behind the tap",
    foldRoom: "{n} characters of hook left before it gets cut",
    foldDevices: "Mobile cuts at {m}, desktop at {d}.",
    overBy: "Over by {n} — pick a fix:",
    trimToFit: "Trim to fit",
    undo: "Undo",
    applied: "Applied",
    fitsHeading: "Where else this text fits",
    inspectStyled: "{n} styled Unicode letters — they cost 2 each on X and in many app fields.",
    inspectInvisible: "{n} invisible characters that still count.",
    inspectCombining: "{n} stacked diacritic marks.",
    /* The hidden-character list. Only pages that carry #counterHidden show
       it, so a locale page without translated strings never renders it. */
    hiddenHeading: "{n} hidden characters in your text",
    hiddenAt: "line {line}, character {col}",
    hiddenKinds: { space: "odd space", invisible: "invisible", direction: "direction mark" },
    hiddenMore: "+{n} more",
    hiddenClean: "Clean them in the box",
    hiddenCopyClean: "Copy cleaned text",
    /* The own-limit option. Null on purpose: a locale page shows it only once
       it carries these strings, and the English pages get EN_CUSTOM below. */
    custom: null
  }, window.UTG_COUNTER_I18N || {});

  const EN_CUSTOM = {
    name: "Your own limit",
    limitLabel: "Your limit",
    modeLabel: "What the limit counts",
    modes: { codepoint: "Characters, spaces included", nospace: "Characters, spaces not counted", utf8: "Bytes (UTF-8)" }
  };
  const PAGE_IS_ENGLISH = typeof document === "undefined" ||
    /^en\b/i.test(document.documentElement.lang || "en");

  // One copy_text row per successful copy, through the site's one writer
  // (header.js trackCopy). "counter" is not a catalogue method, so the row
  // never carries the visitor's text (2026-11-08 audit).
  function trackCopied(text) {
    const U = window.UltraTextGen;
    if (U && U.trackCopy) U.trackCopy("counter", text);
  }

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

  /* @counter-events:begin */
  /* Three counter events (added 2026-11-28), on pages that opt in with
     window.UTG_COUNTER_EVENTS = true before this script runs:
       counter_limit_chosen  the visitor picked a destination (a rule id)
       counter_fix_applied   a fix button changed the text (a fix id)
       counter_fit_reached   the fit verdict settled on a new value
     A row names a rule id, a fix id and a verdict word, nothing else: never
     the text, its length, or the number a visitor typed as their own limit.
     Every value must be a short lower-case id or it is dropped, so a string
     typed into the box cannot reach a row even through a bug upstream. Every
     key is pushed on every row (undefined clears it), because GTM's data
     layer keeps a key's last value. docs/measurement-ga4.md is the record. */
  const COUNTER_EVENT_KEYS = ["counter_rule", "counter_unit", "counter_fix", "counter_fit", "counter_fit_via"];
  const COUNTER_ID_RE = /^[a-z0-9_-]{1,40}$/;

  function counterPayload(event, fields, locale) {
    const f = fields || {};
    const row = { event: event };
    COUNTER_EVENT_KEYS.forEach((k) => {
      const v = f[k];
      row[k] = typeof v === "string" && COUNTER_ID_RE.test(v) ? v : undefined;
    });
    row.locale = typeof locale === "string" && /^[a-z]{2}(-[a-z]{2,4})?$/.test(locale) ? locale : undefined;
    return row;
  }

  /** The verdict the badge shows, as a fixed word: empty, over, past_fold or fits. */
  function fitVerdict(rules, value, limitId) {
    const report = rules.analyze(value, limitId);
    if (!report.glyphs) return "empty";
    if (!report.fits) return "over";
    const fold = rules.foldInfo(value, limitId);
    return fold && fold.truncated ? "past_fold" : "fits";
  }

  /** Pushes once a run of observations has been quiet for `delay` ms, and only
      when the key that settled differs from the last one pushed (or set as the
      baseline). A null key is observed but never pushed. */
  function createSettler(delay, push, timers) {
    const t = timers || { set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id) };
    let timer = 0;
    let pending = null;
    let last = null;
    return {
      observe(key, fields) {
        pending = { key: key, fields: fields };
        if (timer) t.clear(timer);
        timer = t.set(() => {
          timer = 0;
          const p = pending;
          pending = null;
          if (!p || p.key === null || p.key === last) return;
          last = p.key;
          push(p.fields);
        }, delay);
      },
      baseline(key) { last = key; }
    };
  }
  /* @counter-events:end */

  const EVENTS_ON = typeof window !== "undefined" && window.UTG_COUNTER_EVENTS === true;
  const SETTLE_MS = 800;

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
      bytes: $("#statBytes"),
      bytesKr: $("#statBytesKr"),
      /* Script tiles: only the Chinese counters carry them. */
      han: $("#statHan"),
      cjkPunct: $("#statCjkPunct"),
      otherChars: $("#statOtherChars"),
      segWords: $("#statSegWords")
    };
    const hasScriptTiles = !!(stat.han || stat.cjkPunct || stat.otherChars);
    const clearBtn = document.getElementById("counterClearBtn");
    const copyBtn = document.getElementById("counterCopyBtn");
    const liveCount = document.getElementById("counterLiveCount");
    const fixBar = document.getElementById("counterFixBar");
    const inspectBar = document.getElementById("counterInspect");
    const fitGrid = document.getElementById("counterFitGrid");
    const foldBar = document.getElementById("counterFold");
    const hiddenBox = document.getElementById("counterHidden");

    const ns = window.UltraTextGen || {};
    const counts = ns.counterCounts || null;
    const rules = ns.counterRules || null;
    const reduce = ns.counterReduce || null;

    let checker = null;
    let undoValue = null;
    let fitGridExpanded = false;

    function activeLimitId() {
      return checker ? checker.getLimitId() : (rules ? rules.LIMITS[0].id : null);
    }

    /* ---------- MEASURE USE (opt-in, see @counter-events) ---------- */
    const pageLocale = (document.documentElement.lang || "").toLowerCase();
    /* What last changed the verdict: typing, a fix, a new limit, or a ?q= load. */
    let cause = "load";

    function pushCounter(event, fields) {
      if (!EVENTS_ON) return;
      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(counterPayload(event, fields, pageLocale));
      } catch (e) { /* analytics must never break the tool */ }
    }

    /* The unit is recorded only for the visitor's own limit, where they chose
       it. The limit figure itself is never recorded. */
    function ruleFields(limitId) {
      const rule = rules ? rules.ruleById(limitId) : null;
      return {
        counter_rule: limitId,
        counter_unit: rule && rule.custom ? (rule.countMode || "codepoint") : undefined
      };
    }

    const limitSettler = createSettler(SETTLE_MS, (f) => pushCounter("counter_limit_chosen", f));
    const fitSettler = createSettler(SETTLE_MS, (f) => pushCounter("counter_fit_reached", f));

    function observeLimit() {
      if (!EVENTS_ON || !rules) return;
      const f = ruleFields(activeLimitId());
      limitSettler.observe(f.counter_rule + "|" + (f.counter_unit || ""), f);
    }

    function observeFit() {
      if (!EVENTS_ON || !rules) return;
      const limitId = activeLimitId();
      if (!limitId) return;
      const verdict = fitVerdict(rules, input.value, limitId);
      const f = ruleFields(limitId);
      f.counter_fit = verdict;
      f.counter_fit_via = cause;
      fitSettler.observe(verdict === "empty" ? null : f.counter_rule + "|" + verdict, f);
    }

    /* ---------- 3. FIX ---------- */
    function applyValue(next, fixId) {
      undoValue = input.value;
      input.value = next;
      cause = "fix";
      renderAll();
      input.focus();
      if (fixId && EVENTS_ON) {
        const limitId = activeLimitId();
        const f = ruleFields(limitId);
        f.counter_fix = fixId;
        f.counter_fit = fitVerdict(rules, input.value, limitId);
        pushCounter("counter_fix_applied", f);
      }
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
        // A reducer offered at no saving (fancy → plain on a code-point
        // field) shows what it does, not "−0".
        const tag = s.segmentsAfter != null
          ? s.segmentsBefore + " → " + s.segmentsAfter + " " + I18N.segShort
          : s.saved > 0 ? "−" + s.saved : "𝒜 → A";
        btn.appendChild(el("span", "cc-fix-btn-save", tag));
        btn.addEventListener("click", () => applyValue(s.result, s.id));
        actions.appendChild(btn);
      });

      if (over) {
        const trim = el("button", "cc-fix-btn cc-fix-btn-trim");
        trim.type = "button";
        trim.appendChild(el("span", "cc-fix-btn-label", I18N.trimToFit));
        trim.appendChild(el("span", "cc-fix-btn-save", "✂"));
        trim.addEventListener("click", () => {
          applyValue(reduce.trimToFit(input.value, limitId, { ellipsis: true }), "trim");
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
          cause = "fix";
          renderAll();
          input.focus();
          if (EVENTS_ON) {
            const f = ruleFields(activeLimitId());
            f.counter_fix = "undo";
            f.counter_fit = fitVerdict(rules, input.value, activeLimitId());
            pushCounter("counter_fix_applied", f);
          }
        });
        actions.appendChild(undo);
      }

      fixBar.appendChild(actions);
    }

    /* ---------- 2b. THE FOLD — the second budget ----------
       The hard limit decides whether a post sends; the fold decides whether
       anyone reads it. LinkedIn accepts 3,000 characters and then shows ~140
       of them on a phone. Every other counter reports the number nobody is
       actually writing against, so this renders the one they are: exactly
       what the reader sees before "see more", with the rest dimmed behind
       the cut, and whether the same text survives the fold everywhere else. */
    function renderFold() {
      if (!foldBar || !rules || !rules.foldInfo) return;
      const value = input.value;
      const limitId = activeLimitId();
      const info = value && limitId ? rules.foldInfo(value, limitId) : null;
      if (!info) { foldBar.hidden = true; return; }

      foldBar.innerHTML = "";
      foldBar.hidden = false;
      foldBar.classList.toggle("is-cut", info.truncated);

      foldBar.appendChild(el("p", "cc-fold-head", I18N.foldHeading));

      const preview = el("div", "cc-fold-preview");
      preview.appendChild(el("span", "cc-fold-shown", info.preview));
      if (info.truncated) {
        preview.appendChild(el("span", "cc-fold-more", "… " + I18N.foldMore));
        preview.appendChild(el("span", "cc-fold-hidden", info.hiddenText));
      }
      foldBar.appendChild(preview);

      const meta = el("p", "cc-fold-meta");
      meta.textContent = info.truncated
        ? fmt(I18N.foldMeta, {
            shown: info.shown.toLocaleString(),
            total: info.total.toLocaleString(),
            hidden: info.hidden.toLocaleString()
          })
        : fmt(I18N.foldRoom, { n: info.remaining.toLocaleString() });
      if (info.desktop) {
        meta.appendChild(el("span", "cc-fold-devices",
          " " + fmt(I18N.foldDevices, { m: info.at, d: info.desktop })));
      }
      foldBar.appendChild(meta);

      /* Cross-platform: the same hook, against every fold on the site. This is
         the part that makes the fold a capability rather than one platform's
         footnote — a manager writing one hook for four feeds needs all four. */
      const others = rules.foldsAll(value).filter((f) => f.rule.id !== limitId);
      if (others.length) {
        const row = el("div", "cc-fold-others");
        others.forEach((f) => {
          const chip = el("span", "cc-fit-chip " + (f.truncated ? "is-unfit" : "is-fit"));
          chip.appendChild(el("span", "cc-fit-name",
            (I18N.labels && I18N.labels[f.rule.id]) || f.rule.label));
          chip.appendChild(el("span", "cc-fit-num", f.label));
          row.appendChild(chip);
        });
        foldBar.appendChild(row);
      }
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

    /* The same diagnosis, itemised: which hidden character, where, and a
       fix. Someone pasting text that broke code, a spreadsheet lookup or a
       form needs the location, not just the count. */
    const HIDDEN_SHOWN = 30;
    function renderHidden() {
      if (!hiddenBox || !reduce || !reduce.listHidden) return;
      const value = input.value;
      const hits = value ? reduce.listHidden(value) : [];
      if (!hits.length) { hiddenBox.hidden = true; hiddenBox.textContent = ""; return; }
      hiddenBox.hidden = false;
      hiddenBox.textContent = "";
      hiddenBox.appendChild(el("p", "counter-hidden-head", fmt(I18N.hiddenHeading, { n: hits.length })));
      const list = el("ol", "counter-hidden-list");
      hits.slice(0, HIDDEN_SHOWN).forEach((h) => {
        const li = el("li", "counter-hidden-item");
        li.appendChild(el("code", "counter-hidden-code", h.code));
        li.appendChild(el("span", "counter-hidden-name", h.name));
        li.appendChild(el("span", "counter-hidden-kind is-" + h.kind, (I18N.hiddenKinds && I18N.hiddenKinds[h.kind]) || h.kind));
        li.appendChild(el("span", "counter-hidden-at", fmt(I18N.hiddenAt, { line: h.line, col: h.col })));
        list.appendChild(li);
      });
      hiddenBox.appendChild(list);
      if (hits.length > HIDDEN_SHOWN) {
        hiddenBox.appendChild(el("p", "counter-hidden-more", fmt(I18N.hiddenMore, { n: hits.length - HIDDEN_SHOWN })));
      }
      const actions = el("div", "cc-fix-actions");
      const cleanBtn = el("button", "cc-fix-btn", I18N.hiddenClean);
      cleanBtn.type = "button";
      cleanBtn.addEventListener("click", () => applyValue(reduce.cleanHidden(input.value), "clean_hidden"));
      const copyClean = el("button", "cc-fix-btn", I18N.hiddenCopyClean);
      copyClean.type = "button";
      copyClean.addEventListener("click", async () => {
        try {
          const cleaned = reduce.cleanHidden(input.value);
          await navigator.clipboard.writeText(cleaned);
          trackCopied(cleaned);
          copyClean.textContent = I18N.copied;
          setTimeout(() => { copyClean.textContent = I18N.hiddenCopyClean; }, 1500);
        } catch (err) {
          console.error("Copy failed:", err);
        }
      });
      actions.appendChild(cleanBtn);
      actions.appendChild(copyClean);
      hiddenBox.appendChild(actions);
    }

    /* ---------- the live count that sits with the box ---------- */
    function renderLive() {
      if (!liveCount || !rules) return;
      const limitId = activeLimitId();
      if (!limitId) return;
      const report = rules.analyze(input.value, limitId);
      liveCount.textContent = rules.countLabel(report);
      liveCount.classList.toggle("is-over", !report.fits);
      liveCount.classList.toggle("is-close", report.fits && report.limit && rules.fillRatio(report) >= 0.9);
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
      /* Order by distance from the boundary, over-limit side first: the fields
         you just broke by a little are the ones one more fix would rescue, and
         the fields with a hair of headroom left are the ones to watch. Raw
         table order buries both under whatever has 63,206 characters spare. */
      const rows = rules.fitsAll(value).slice().sort((a, b) => {
        if (a.fits !== b.fits) return a.fits ? 1 : -1;
        return Math.abs(a.remaining) - Math.abs(b.remaining);
      });
      /* 38 chips at once is a wall, not an answer. Show the ones a writer can
         act on — everything the text already breaks, plus the nearest few it
         still fits — and keep the rest one click away. Ordering already puts
         the boundary cases first, so this is a prefix, not a filter. */
      const PREVIEW = 12;
      const collapsed = rows.length > PREVIEW && !fitGridExpanded;
      let shown = rows;
      if (collapsed) {
        shown = rows.slice(0, PREVIEW);
        /* The destination you actually selected must never be the one the
           collapse hides — and it sorts to the bottom precisely when it has
           the most headroom, which is exactly when you are least worried and
           most likely to trust the grid. Pin it in. */
        if (!shown.some((r) => r.rule.id === activeId)) {
          const active = rows.find((r) => r.rule.id === activeId);
          if (active) shown = shown.slice(0, PREVIEW - 1).concat([active]);
        }
      }

      shown.forEach((row) => {
        const chip = el("span", "cc-fit-chip " + (row.fits ? "is-fit" : "is-unfit"));
        if (row.rule.id === activeId) chip.classList.add("is-active");
        const name = (I18N.labels && I18N.labels[row.rule.id]) || row.rule.label;
        chip.appendChild(el("span", "cc-fit-name", name));
        chip.appendChild(el("span", "cc-fit-num", row.fits
          ? row.remaining.toLocaleString()
          : "−" + Math.abs(row.remaining).toLocaleString()));
        fitGrid.appendChild(chip);
      });

      if (rows.length > PREVIEW) {
        const toggle = el("button", "cc-fit-toggle");
        toggle.type = "button";
        toggle.textContent = collapsed
          ? fmt(I18N.showAllFits, { n: rows.length })
          : I18N.showFewerFits;
        toggle.addEventListener("click", () => {
          fitGridExpanded = !fitGridExpanded;
          renderFitGrid();
        });
        fitGrid.appendChild(toggle);
      }
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
        if (stat.bytesKr) stat.bytesKr.textContent = counts.hangul2Bytes(val).toLocaleString();
        if (hasScriptTiles && counts.scriptCounts) {
          const sc = counts.scriptCounts(val);
          if (stat.han) stat.han.textContent = sc.han.toLocaleString();
          if (stat.cjkPunct) stat.cjkPunct.textContent = sc.punct.toLocaleString();
          if (stat.otherChars) stat.otherChars.textContent = sc.other.toLocaleString();
        }
        if (stat.segWords && counts.segmentedWords) {
          const seg = counts.segmentedWords(val, stat.segWords.getAttribute("data-locale") ||
            document.documentElement.lang || undefined);
          if (seg === null) {
            /* No word segmenter in this browser: drop the tile rather than
               show a figure split on spaces, which reads a whole Chinese
               sentence as one word. */
            const tile = stat.segWords.closest(".counter-stat");
            if (tile) tile.style.display = "none";
          } else {
            stat.segWords.textContent = seg.toLocaleString();
          }
        }
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
      renderHidden();
      renderFold();
      renderFix();
      renderFitGrid();
      if (checker) checker.render();
      observeFit();
    }

    input.addEventListener("input", () => { undoValue = null; cause = "edit"; renderAll(); });

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        input.value = "";
        undoValue = null;
        input.focus();
        cause = "edit";
        renderAll();
      });
    }

    /* ---------- side fields: more than one field of one destination ----------
       A page can set further boxes beside the main one, each bound to one rule
       by data-counter-rule (the X counter's bio and display name), with its
       live count in [data-counter-live]. Each counts in its rule's own unit
       and caps. A page without them is unchanged. */
    if (rules) {
      document.querySelectorAll("[data-counter-rule]").forEach((box) => {
        const id = box.getAttribute("data-counter-rule");
        const field = box.querySelector("input, textarea");
        const live = box.querySelector("[data-counter-live]");
        if (!field || !live || !rules.LIMITS.some((r) => r.id === id)) return;
        const paint = () => {
          const report = rules.analyze(field.value, id);
          live.textContent = rules.countLabel(report);
          live.classList.toggle("is-over", !report.fits);
          live.classList.toggle("is-close", report.fits && rules.fillRatio(report) >= 0.9);
          field.classList.toggle("is-over-limit", !report.fits && report.glyphs > 0);
        };
        field.addEventListener("input", paint);
        paint();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        if (!input.value) return;
        try {
          await navigator.clipboard.writeText(input.value);
          trackCopied(input.value);
          // Only the first click of a burst reads the label.
          if (copyBtn._copyTimer) clearTimeout(copyBtn._copyTimer); else copyBtn._copyPrev = copyBtn.textContent;
          copyBtn.textContent = I18N.copied;
          copyBtn.classList.add("is-copied");
          copyBtn._copyTimer = setTimeout(() => {
            copyBtn.textContent = copyBtn._copyPrev;
            copyBtn.classList.remove("is-copied");
            copyBtn._copyTimer = 0;
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
          pastFold: I18N.pastFold || undefined,
          platformLabel: I18N.platformLabel || undefined,
          fieldLabel: I18N.fieldLabel || undefined
        },
        labels: I18N.labels || undefined,
        fields: I18N.fields || undefined,
        platforms: I18N.platforms || undefined,
        groups: I18N.groups || undefined,
        custom: I18N.custom || (PAGE_IS_ENGLISH ? EN_CUSTOM : undefined)
      });
      document.addEventListener("utg:counterlimitchange", () => {
        cause = "limit";
        observeLimit();
        renderAll();
      });
      if (EVENTS_ON) {
        /* The destination the page opened with is the baseline, not a choice. */
        const start = ruleFields(checker ? checker.getLimitId() : activeLimitId());
        limitSettler.baseline(start.counter_rule + "|" + (start.counter_unit || ""));
      }
    }

    renderAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
