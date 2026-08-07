/* ==========================================================
   counterReduce.js
   "Your text is 34 characters too long" is where every other counter
   stops. This is the part that fixes it.

   Each reducer is a pure string transform. The controller asks this
   module which reducers would actually save something FOR THE ACTIVE
   DESTINATION — savings are measured in that destination's own counting
   unit, so removing one emoji reports −2 on X (weighted) and −1 almost
   everywhere else, and straightening a curly quote reports the real
   win on SMS (it can take the whole message back from 70-character
   Unicode segments to 160-character GSM-7).

   The reducer this site is uniquely able to offer is `plain`: we are the
   site whose generator produces the styled Unicode that overflows these
   fields in the first place, so we are the one tool that can hand it
   back as plain text on one click.

   API: UltraTextGen.counterReduce
     .TRANSFORMS            [{ id, label, hint, fn }]
     .suggest(text, limitId)  -> [{ id, label, hint, result, saved }]
     .trimToFit(text, limitId, opts) -> string
     .inspect(text)         -> { invisible, nonGsm, styled, combining }
   ========================================================== */
(function () {
  "use strict";

  const ns = (window.UltraTextGen = window.UltraTextGen || {});

  /* ---------- fancy Unicode → plain ----------
     Most decorative alphabets (Mathematical Alphanumeric Symbols,
     fullwidth forms, circled letters) carry a Unicode compatibility
     decomposition, so NFKD returns the plain letter. Applied per
     character and only kept when the result is pure ASCII, so accented
     Latin (é → e + combining acute, not ASCII) and every non-Latin
     script are left untouched. Small caps and a few IPA-derived letters
     have no decomposition and need the explicit map below. */
  const SMALL_CAPS = {
    "ᴀ": "a", "ʙ": "b", "ᴄ": "c", "ᴅ": "d", "ᴇ": "e", "ꜰ": "f", "ɢ": "g",
    "ʜ": "h", "ɪ": "i", "ᴊ": "j", "ᴋ": "k", "ʟ": "l", "ᴍ": "m", "ɴ": "n",
    "ᴏ": "o", "ᴘ": "p", "ǫ": "q", "ʀ": "r", "ѕ": "s", "ᴛ": "t", "ᴜ": "u",
    "ᴠ": "v", "ᴡ": "w", "х": "x", "ʏ": "y", "ᴢ": "z"
  };

  function toPlain(str) {
    if (!str) return "";
    let out = "";
    for (const ch of str) {
      const cp = ch.codePointAt(0);
      if (cp < 128) { out += ch; continue; }
      if (SMALL_CAPS[ch]) { out += SMALL_CAPS[ch]; continue; }
      const nfkd = ch.normalize("NFKD");
      out += /^[A-Za-z0-9]+$/.test(nfkd) ? nfkd : ch;
    }
    return out;
  }

  /* ---------- emoji ---------- */
  let EMOJI_RE = null;
  try {
    EMOJI_RE = new RegExp(
      "\\p{Extended_Pictographic}(\\uFE0F)?(\\u200D\\p{Extended_Pictographic}(\\uFE0F)?)*(\\p{Emoji_Modifier})?",
      "gu"
    );
  } catch (e) {
    EMOJI_RE = /[‼-㊙\u{1F000}-\u{1FAFF}]/gu;
  }

  function stripEmoji(str) {
    if (!str) return "";
    const out = str.replace(EMOJI_RE, "");
    if (out === str) return str;
    // Only tidy the gaps the removal itself opened — never claim the
    // space-collapsing win, that is its own reducer with its own label.
    return out.replace(/ {2,}/g, " ").replace(/ +$/gm, "");
  }

  /* ---------- smart punctuation → GSM-safe ASCII ---------- */
  const PUNCT = {
    "‘": "'", "’": "'", "‚": "'", "‛": "'",
    "“": '"', "”": '"', "„": '"', "‟": '"',
    "–": "-", "—": "-", "―": "-", "−": "-",
    "…": "...", "•": "*", "·": "*",
    "«": '"', "»": '"', "‹": "'", "›": "'",
    " ": " ", " ": " ", " ": " ", " ": " ",
    " ": " ", " ": " ", " ": " ", " ": " ",
    " ": " ", " ": " ", "　": " ", "‑": "-",
    "™": "TM", "®": "(R)", "©": "(c)"
  };

  function straighten(str) {
    if (!str) return "";
    let out = "";
    for (const ch of str) out += (PUNCT[ch] != null ? PUNCT[ch] : ch);
    return out;
  }

  /* ---------- whitespace ---------- */
  function collapseSpaces(str) {
    if (!str) return "";
    return str
      .split("\n")
      .map((line) => line.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+$/g, ""))
      .join("\n")
      .replace(/^\s+|\s+$/g, "");
  }

  function collapseBlankLines(str) {
    if (!str) return "";
    return str.replace(/\n{3,}/g, "\n\n").replace(/^\s+|\s+$/g, "");
  }

  /* ---------- invisible characters ---------- */
  const INVISIBLE_RE = /[​‌⁠﻿­᠎͏឴឵ᅟᅠㅤﾠ]/g;

  function stripInvisible(str) {
    return (str || "").replace(INVISIBLE_RE, "");
  }

  /* ---------- zalgo / stacked diacritics ---------- */
  const COMBINING_RE = /[̀-ͯ҃-҉᪰-᫿᷀-᷿⃐-⃰︠-︯]/g;

  function stripCombining(str) {
    return (str || "").replace(COMBINING_RE, "");
  }

  /* ---------- hashtags ---------- */
  function stripHashtags(str) {
    if (!str) return "";
    const out = str.replace(/(^|\s)#[^\s#]+/g, "$1");
    if (out === str) return str;
    return out.replace(/ {2,}/g, " ").replace(/ +$/gm, "").replace(/\s+$/, "");
  }

  const TRANSFORMS = [
    { id: "plain", label: "Convert fancy text to plain", hint: "Styled Unicode letters cost 2 units each in most fields.", fn: toPlain },
    { id: "invisible", label: "Remove invisible characters", hint: "Zero-width and filler characters you cannot see but the field counts.", fn: stripInvisible },
    { id: "combining", label: "Remove stacked diacritics", hint: "Glitch/zalgo marks add a character each.", fn: stripCombining },
    { id: "emoji", label: "Remove emoji", hint: "Emoji cost 2 on X and flip an SMS to 70-character segments.", fn: stripEmoji },
    { id: "quotes", label: "Straighten quotes and dashes", hint: "Curly quotes and em dashes are what usually breaks GSM-7 on SMS.", fn: straighten },
    { id: "spaces", label: "Collapse double spaces", hint: "Repeated spaces and trailing whitespace.", fn: collapseSpaces },
    { id: "blanklines", label: "Collapse blank lines", hint: "Three or more line breaks in a row.", fn: collapseBlankLines },
    { id: "hashtags", label: "Remove hashtags", hint: "Move them to a comment instead.", fn: stripHashtags }
  ];

  /** straighten + strip the things that force UCS-2, in one move. */
  function gsmSafe(str) {
    return collapseSpaces(stripEmoji(stripInvisible(toPlain(straighten(str || "")))));
  }

  function measureFor(text, limitId) {
    const rules = ns.counterRules;
    return rules ? rules.measure(text, limitId) : Array.from(text || "").length;
  }

  /**
   * Which reducers actually help, for this text and this destination.
   * Ordered by how much each saves. Only non-zero savings are returned,
   * so the UI never offers a button that would do nothing.
   */
  function suggest(text, limitId) {
    const base = measureFor(text, limitId);
    const out = [];

    // SMS special case: individual reducers can each save nothing while the
    // combination is worth real money — one non-GSM character anywhere holds
    // the whole message in 70-character Unicode segments.
    const rules = ns.counterRules;
    if (rules && (rules.ruleById(limitId).countMode === "gsm")) {
      const info = ns.counterCounts.gsmInfo(text || "");
      if (info.encoding === "UCS-2") {
        const fixed = gsmSafe(text);
        const after = ns.counterCounts.gsmInfo(fixed);
        if (after.encoding === "GSM-7") {
          out.push({
            id: "gsm-safe",
            label: "Make it SMS-safe (back to 160 per segment)",
            hint: "Removes the characters forcing Unicode mode: " + info.flipChars.slice(0, 5).join(" "),
            result: fixed,
            saved: Math.max(0, base - measureFor(fixed, limitId)),
            segmentsBefore: info.segments,
            segmentsAfter: after.segments
          });
        }
      }
    }
    TRANSFORMS.forEach((t) => {
      let result;
      try { result = t.fn(text); } catch (e) { return; }
      if (result === text) return;
      const saved = base - measureFor(result, limitId);
      if (saved > 0) out.push({ id: t.id, label: t.label, hint: t.hint, result, saved });
    });
    return out.sort((a, b) => b.saved - a.saved);
  }

  /**
   * Cut to the limit on a word boundary (never mid-word), measured in the
   * destination's own counting unit. `ellipsis` appends "…" inside budget.
   */
  function trimToFit(text, limitId, opts) {
    const options = opts || {};
    const suffix = options.ellipsis ? "…" : "";
    if (!text) return "";

    const rules = ns.counterRules;
    const rule = rules ? rules.ruleById(limitId) : null;
    // SMS is segment-based: the meaningful target is one segment, and which
    // segment size applies depends on the encoding the text currently forces.
    let limit = options.limit;
    if (!limit && rule) {
      limit = rule.limit;
      if (rule.countMode === "gsm" && rules) limit = rules.analyze(text, limitId).limit;
    }
    if (!limit) return text;
    if (measureFor(text, limitId) <= limit) return text;

    const words = text.split(/(\s+)/);
    let acc = "";
    for (let i = 0; i < words.length; i++) {
      const next = acc + words[i];
      if (measureFor(next + suffix, limitId) > limit) break;
      acc = next;
    }
    acc = acc.replace(/\s+$/, "");
    if (!acc) {
      // A single word longer than the whole limit — cut inside it.
      const chars = Array.from(text);
      let built = "";
      for (let i = 0; i < chars.length; i++) {
        if (measureFor(built + chars[i] + suffix, limitId) > limit) break;
        built += chars[i];
      }
      acc = built;
    }
    return acc + (acc && suffix ? suffix : "");
  }

  /** What is in this text that the user cannot see but the field counts. */
  function inspect(text) {
    const s = text || "";
    const invisible = (s.match(INVISIBLE_RE) || []).length;
    const combining = (s.match(COMBINING_RE) || []).length;
    let styled = 0;
    for (const ch of s) {
      const cp = ch.codePointAt(0);
      if (cp < 128) continue;
      if (SMALL_CAPS[ch]) { styled++; continue; }
      const nfkd = ch.normalize("NFKD");
      if (/^[A-Za-z0-9]+$/.test(nfkd)) styled++;
    }
    const counts = ns.counterCounts;
    const nonGsm = counts ? counts.gsmInfo(s).flipChars : [];
    return { invisible, combining, styled, nonGsm };
  }

  ns.counterReduce = { TRANSFORMS, suggest, trimToFit, inspect, toPlain, gsmSafe };
})();
