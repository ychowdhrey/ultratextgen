/*
 * personaTranslator.js — shared, config-driven engine + page controller for the
 * curated persona / dialect text translators (Pirate Speak, Old English).
 *
 * DELIBERATELY SCOPED DOWN: this is word/phrase substitution ONLY. Every
 * translation is fully deterministic — the same input always produces the same
 * output. There is no randomness in the translation, no sentence reordering,
 * and no grammar engine (true grammar inversion was considered and rejected as
 * too complex / low-fidelity for this build). The only "flourish" is a single
 * fixed, always-on suffix per persona.
 *
 * One engine powers every persona page. A page declares
 *   window.UTG_PERSONA_PAGE = { key: "pirate" | "oldEnglish", demoText: "…" };
 * and includes the mount points it wants; the controller wires them up only if
 * they exist on the page (same gate-on-presence pattern as printablesEngine.js):
 *   #persona-input   (textarea)          — user text
 *   #persona-output  (display element)   — live translated output
 *   #persona-copy    (button)            — copy the current output
 *   #persona-clear   (button, optional)  — clear the input
 *   #persona-count   (element, optional) — character counter
 *
 * The engine (dictionaries + UTG_personaTranslate) is defined unconditionally so
 * other scripts / pages can reuse it; only the DOM controller gates on the page
 * config. Self-contained IIFE — no imports, no dependencies.
 */
(function () {
  "use strict";

  /* =================================================================
     Dictionaries — [matchPhrase, replacement], matched case-insensitively.
     Curated; do not "improve" the word choices. Phrases may be 1–4 words.
     ================================================================= */

  const PIRATE_DICT = [
    ["how are you", "how be ye"],
    ["you are", "ye be"],
    ["you're", "ye're"],
    ["i am", "I be"],
    ["is not", "ain't"],
    ["are not", "ain't"],
    ["excuse me", "avast"],
    ["hello", "ahoy"],
    ["hi", "ahoy"],
    ["hey", "arr"],
    ["greetings", "ahoy"],
    ["yes", "aye"],
    ["no", "nay"],
    ["your", "yer"],
    ["yours", "yers"],
    ["you", "ye"],
    ["my", "me"],
    ["mine", "me own"],
    ["friends", "mateys"],
    ["friend", "matey"],
    ["mister", "cap'n"],
    ["mr", "cap'n"],
    ["sir", "cap'n"],
    ["madam", "milady"],
    ["boy", "lad"],
    ["girl", "lass"],
    ["woman", "lass"],
    ["man", "matey"],
    ["money", "doubloons"],
    ["gold", "doubloons"],
    ["treasure", "booty"],
    ["stop", "avast"],
    ["listen", "hark"],
    ["old", "auld"],
    ["drink", "grog"],
    ["beer", "grog"],
    ["food", "grub"],
    ["ship", "vessel"],
    ["boat", "vessel"],
    ["bathroom", "head"],
    ["toilet", "head"],
    ["here", "o'er here"],
    ["there", "yonder"],
    ["before", "afore"],
    ["are", "be"],
    ["is", "be"],
    ["am", "be"],
    ["was", "were"],
    ["very", "mighty"],
    ["big", "mighty"],
    ["strong", "hearty"],
    ["good", "fine"],
    ["excellent", "grand"],
    ["crazy", "mad"],
    ["because", "fer"],
    ["for", "fer"],
    ["never", "ne'er"],
    ["over", "o'er"],
    ["sailor", "sea dog"],
    ["enemy", "scurvy dog"],
    ["idiot", "scallywag"],
    ["coward", "bilge rat"]
  ];

  const OLD_ENGLISH_DICT = [
    ["you are", "thou art"],
    ["are you", "art thou"],
    ["will you", "wilt thou"],
    ["do you", "dost thou"],
    ["you have", "thou hast"],
    ["you will", "thou shalt"],
    ["you would", "thou wouldst"],
    ["yourself", "thyself"],
    ["yours", "thine"],
    ["your", "thy"],
    ["you", "thou"],
    ["am", "art"],
    ["have", "hast"],
    ["has", "hath"],
    ["will", "shall"],
    ["would", "wouldst"],
    ["does", "doth"],
    ["do", "dost"],
    ["did", "didst"],
    ["yes", "yea"],
    ["no", "nay"],
    ["hello", "hail"],
    ["hi", "hail"],
    ["goodbye", "farewell"],
    ["bye", "farewell"],
    ["friend", "good fellow"],
    ["friends", "good fellows"],
    ["my", "mine"],
    ["before", "ere"],
    ["soon", "anon"],
    ["always", "evermore"],
    ["never", "nevermore"],
    ["very", "most"],
    ["children", "babes"],
    ["child", "babe"],
    ["man", "gentleman"],
    ["woman", "maiden"],
    ["people", "folk"],
    ["here", "hither"],
    ["there", "thither"],
    ["where", "whither"],
    ["why", "wherefore"],
    ["please", "prithee"],
    ["sorry", "forgive me"],
    ["stupid", "foolish"],
    ["crazy", "mad"],
    ["cool", "wondrous"],
    ["awesome", "wondrous"],
    ["great", "grand"],
    ["okay", "well enough"],
    ["alright", "well enough"],
    ["now", "anon"],
    ["today", "this day"],
    ["tomorrow", "the morrow"],
    ["yesterday", "yestermorn"],
    ["old", "olden"],
    ["love", "adore"],
    ["like", "fancy"],
    ["know", "ken"]
  ];

  window.UTG_PERSONA_DICTS = { pirate: PIRATE_DICT, oldEnglish: OLD_ENGLISH_DICT };

  /* =================================================================
     Matcher builder
     -----------------------------------------------------------------
     Longest-phrase-first: sort by word count DESCENDING so multi-word
     phrases ("how are you") are tried before the single words they contain
     ("you", "are"). Within the same word count, authored order is preserved.

     One big case-insensitive regex alternation is built, wrapped in a leading
     \b and a trailing (?![A-Za-z']) lookahead. That trailing lookahead does
     two jobs at once:
       1. Contractions: it stops "you" firing inside "you're" (the ' would
          otherwise be a word boundary), so the dedicated "you're" entry wins.
       2. Prefix words: it stops "friend" firing inside "friends" and "do"
          inside "does", so the longer/base entry wins regardless of order.
     A single global text.replace() pass applies every substitution.
     ================================================================= */

  function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function wordCount(phrase) {
    const t = String(phrase).trim();
    return t ? t.split(/\s+/).length : 0;
  }

  // Normalize a matched slice to the dictionary key form (lowercase, single
  // spaces) so the replacement lookup is robust to case and extra whitespace.
  function normalizePhrase(match) {
    return String(match).toLowerCase().replace(/\s+/g, " ").trim();
  }

  function buildMatcher(dict) {
    // Stable sort by word count DESC (index tiebreaker keeps authored order).
    const sorted = dict
      .map(function (pair, i) { return { pair: pair, i: i }; })
      .sort(function (a, b) {
        return (wordCount(b.pair[0]) - wordCount(a.pair[0])) || (a.i - b.i);
      })
      .map(function (x) { return x.pair; });

    const map = Object.create(null);
    const patterns = [];
    sorted.forEach(function (entry) {
      const phrase = entry[0];
      const repl = entry[1];
      const key = normalizePhrase(phrase);
      if (!(key in map)) map[key] = repl; // first (longest/earliest) wins on dup
      // Each word escaped; run-of-whitespace between words matches as \s+.
      const body = phrase
        .trim()
        .split(/\s+/)
        .map(escapeRegex)
        .join("\\s+");
      patterns.push(body);
    });

    const regex = new RegExp("\\b(?:" + patterns.join("|") + ")(?![A-Za-z'])", "gi");
    return { regex: regex, map: map };
  }

  /* =================================================================
     Capitalization preservation
     -----------------------------------------------------------------
     Map the ORIGINAL matched text's casing pattern onto the replacement:
       ALL CAPS  -> uppercase the whole replacement
       First cap -> uppercase only the replacement's first letter
       otherwise -> leave the replacement exactly as authored
     ================================================================= */

  function applyCase(matched, repl) {
    const hasLetter = /[A-Za-z]/.test(matched);
    if (hasLetter && matched === matched.toUpperCase() && matched !== matched.toLowerCase()) {
      return repl.toUpperCase();
    }
    const firstLetter = matched.match(/[A-Za-z]/);
    if (firstLetter && firstLetter[0] === firstLetter[0].toUpperCase()) {
      return repl.replace(/[A-Za-z]/, function (c) { return c.toUpperCase(); });
    }
    return repl;
  }

  /* =================================================================
     Deterministic per-persona flourish (applied AFTER substitution).
     Pirate: always append a fixed "arrr". Old English: nothing.
     ================================================================= */

  function pirateFlourish(s) {
    let trimmed = s.replace(/\s+$/, "");
    if (!trimmed) return s;
    const last = trimmed.charAt(trimmed.length - 1);
    if (last === "!" || last === "?") return trimmed + " Arrr!";
    if (last === ".") trimmed = trimmed.slice(0, -1);
    return trimmed + ", arrr!";
  }

  const MATCHERS = {
    pirate: buildMatcher(PIRATE_DICT),
    oldEnglish: buildMatcher(OLD_ENGLISH_DICT)
  };

  // Pure/deterministic: same (text, personaKey) always yields the same string.
  function translate(text, personaKey) {
    const str = String(text == null ? "" : text);
    const built = MATCHERS[personaKey];
    if (!built || !str.trim()) return str;
    let out = str.replace(built.regex, function (match) {
      const repl = built.map[normalizePhrase(match)];
      if (repl == null) return match; // safety: shouldn't happen
      return applyCase(match, repl);
    });
    if (personaKey === "pirate") out = pirateFlourish(out);
    return out;
  }

  window.UTG_personaTranslate = translate;

  /* =================================================================
     Generic page controller (gated on window.UTG_PERSONA_PAGE + mounts)
     ================================================================= */

  const CFG = window.UTG_PERSONA_PAGE;
  if (!CFG) return;

  let copyTimer = null;

  // Clipboard copy with an execCommand fallback and a "Copied!" label swap,
  // mirroring the copyText()/copyToClipboard helpers used elsewhere in the repo
  // (js/printables/printablesEngine.js, usecase/zalgo-text). Standalone here.
  function copyToClipboard(value, btn) {
    const done = function () {
      if (!btn) return;
      if (btn.dataset.origLabel == null) btn.dataset.origLabel = btn.textContent;
      btn.classList.add("is-copied");
      btn.textContent = "Copied!";
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(function () {
        btn.textContent = btn.dataset.origLabel;
        btn.classList.remove("is-copied");
      }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(done).catch(done);
    } else {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) { /* noop */ }
      document.body.removeChild(ta);
      done();
    }
  }

  function initController() {
    const input = document.getElementById("persona-input");
    const output = document.getElementById("persona-output");
    if (!input || !output) return; // nothing to wire up on this page

    const copyBtn = document.getElementById("persona-copy");
    const clearBtn = document.getElementById("persona-clear");
    const counter = document.getElementById("persona-count");
    const key = CFG.key;
    const demoText = CFG.demoText || "";
    let currentOutput = "";

    function render() {
      const raw = input.value;
      // Fall back to the demo sentence when the box is empty, so the page never
      // shows a blank output on first load.
      const source = (raw && raw.trim()) ? raw : demoText;
      currentOutput = translate(source, key);
      output.textContent = currentOutput;
      if (counter) counter.textContent = String(input.value.length);
    }

    let timer = null;
    input.addEventListener("input", function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(render, 120);
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        input.value = "";
        render();
        input.focus();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        copyToClipboard(currentOutput, copyBtn);
      });
    }

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initController);
  } else {
    initController();
  }
})();
