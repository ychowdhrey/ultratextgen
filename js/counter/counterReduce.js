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
     .listHidden(text)      -> [{ cp, code, name, kind, index, line, col }]
     .cleanHidden(text)     -> text with odd spaces normalised, the rest removed
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

  /* ---------- invisible characters ----------
     Built from the HIDDEN table further down, so the remove button, the inspect
     chip and the hidden-character list agree on what is invisible (before this
     the button knew 13 code points and the list knew 39). Left alone on purpose:
     the zero-width joiner, which holds emoji and Indic and Arabic-script clusters
     together; and U+2800, which is the word space inside braille text, so it goes
     only from text that holds no other braille cell. Spaces (NBSP, thin space)
     are not removed here: cleanHidden() turns them into normal spaces. */
  let invisibleRe = null;
  const BRAILLE_CELL_RE = /[\u2801-\u28FF]/;

  function invisibleRegex() {
    if (!invisibleRe) {
      const cps = Object.keys(HIDDEN).map(Number).filter((cp) =>
        cp !== 0x200D && HIDDEN[cp][1] !== "space");
      invisibleRe = new RegExp("[" + cps.map((cp) => "\\u{" + cp.toString(16) + "}").join("") + "]", "gu");
    }
    return invisibleRe;
  }

  function stripInvisible(str) {
    const s = str || "";
    const keepBlank = BRAILLE_CELL_RE.test(s);
    return s.replace(invisibleRegex(), (m) => (keepBlank && m === "\u2800" ? m : ""));
  }

  function countInvisible(str) {
    const s = str || "";
    return Array.from(s).length - Array.from(stripInvisible(s)).length;
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
    // `always`: offered whenever it changes the text, even at a saving of 0.
    // A styled letter is one code point, so on every code-point destination
    // the saving is 0 — yet a field that rejects or mangles styled letters
    // is exactly why someone wants plain text back.
    { id: "plain", label: "Convert fancy text to plain", hint: "Styled Unicode letters cost 2 units each in most fields.", fn: toPlain, always: true },
    { id: "invisible", label: "Remove invisible characters", hint: "Zero-width and filler characters you cannot see but the field counts.", fn: stripInvisible },
    { id: "combining", label: "Remove stacked diacritics", hint: "Glitch/zalgo marks add a character each.", fn: stripCombining },
    { id: "emoji", label: "Remove emoji", hint: "Emoji cost 2 on X and flip an SMS to 70-character segments.", fn: stripEmoji },
    { id: "quotes", label: "Straighten quotes and dashes", hint: "Curly quotes and em dashes are what usually breaks GSM-7 on SMS.", fn: straighten },
    { id: "spaces", label: "Collapse double spaces", hint: "Repeated spaces and trailing whitespace.", fn: collapseSpaces },
    { id: "blanklines", label: "Collapse blank lines", hint: "Three or more line breaks in a row.", fn: collapseBlankLines },
    { id: "hashtags", label: "Remove hashtags", hint: "Move them to a comment instead.", fn: stripHashtags }
  ];

  /* Letters with no GSM-7 form that fold to one that has: Polish ł, Czech ů,
     Turkish ş, Vietnamese ạ. GSM-7 keeps é è ù ì ò ç Ñ ñ Ä Ö Ü ä ö ü ß and the
     Scandinavian å ø æ, so those are never touched. The fold changes spelling
     (łódź becomes lodz), so it only runs when the text would otherwise stay in
     70-character Unicode segments, and the button says so. */
  const ACCENT_FOLD = {
    "ł": "l", "Ł": "L", "đ": "d", "Đ": "D", "ð": "d", "Ð": "D", "ħ": "h", "Ħ": "H",
    "ı": "i", "œ": "oe", "Œ": "OE", "þ": "th", "Þ": "Th"
  };

  function isGsm7(str) {
    const counts = ns.counterCounts;
    return counts ? counts.gsmInfo(str).encoding === "GSM-7" : true;
  }

  function foldAccents(str) {
    const memo = {};
    let out = "";
    for (const ch of str || "") {
      if (!(ch in memo)) {
        let folded = ch;
        if (!isGsm7(ch)) {
          const candidate = ACCENT_FOLD[ch] || ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (candidate !== ch && candidate && isGsm7(candidate)) folded = candidate;
        }
        memo[ch] = folded;
      }
      out += memo[ch];
    }
    return out;
  }

  /** straighten + strip the things that force UCS-2, in one move. Accents are
      folded only when everything else still leaves the text in Unicode mode. */
  function gsmSafe(str, opts) {
    const base = collapseSpaces(stripEmoji(stripInvisible(toPlain(straighten(str || "")))));
    if (opts && opts.accents === false) return base;
    return isGsm7(base) ? base : collapseSpaces(foldAccents(base));
  }

  /** User-perceived characters, so a cut never lands inside an emoji sequence
      (a family emoji cut at a joiner), a flag pair or a base + combining mark. */
  const clusterSegmenter = (typeof Intl !== "undefined" && Intl.Segmenter)
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

  function clusters(str) {
    if (!clusterSegmenter) return Array.from(str || "");
    return Array.from(clusterSegmenter.segment(str || ""), (x) => x.segment);
  }

  function measureFor(text, limitId) {
    const rules = ns.counterRules;
    return rules ? rules.measure(text, limitId) : Array.from(text || "").length;
  }

  /**
   * Which reducers actually help, for this text and this destination.
   * Ordered by how much each saves. Only non-zero savings are returned,
   * so the UI never offers a button that would do nothing — except an
   * `always` reducer, which is returned whenever it changes the text
   * (saved: 0 when the destination does not charge extra for it).
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
          const folded = fixed !== gsmSafe(text, { accents: false });
          out.push({
            id: "gsm-safe",
            label: "Make it SMS-safe (back to 160 per segment)",
            hint: (folded
              ? "Swaps accented letters for plain ones (ł becomes l), which changes the spelling, and removes what else forces Unicode mode: "
              : "Removes the characters forcing Unicode mode: ") + info.flipChars.slice(0, 5).join(" "),
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
      if (saved > 0 || t.always) out.push({ id: t.id, label: t.label, hint: t.hint, result, saved: Math.max(0, saved) });
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
      const chars = clusters(text);
      let built = "";
      for (let i = 0; i < chars.length; i++) {
        if (measureFor(built + chars[i] + suffix, limitId) > limit) break;
        built += chars[i];
      }
      acc = built;
    }
    return acc + (acc && suffix ? suffix : "");
  }

  /* ---------- hidden-character list ----------
     The inspect line says HOW MANY invisible characters a text holds. This
     says WHICH ones and WHERE, because the people who search for it are
     debugging: a zero-width space that broke their code, a narrow no-break
     space a chat model wrote instead of a space, a CHAR(160) that makes an
     Excel lookup miss. Three kinds, because they need different fixes:
       space     — a non-standard space; cleaned to a normal space
       invisible — renders as nothing; cleaned by removing it
       direction — a bidi control; cleaned by removing it
     A zero-width joiner between two emoji is part of the emoji (family,
     profession sequences) and is never listed or removed. */
  const HIDDEN = {
    0x00A0: ["No-Break Space", "space"],
    0x00AD: ["Soft Hyphen", "invisible"],
    0x034F: ["Combining Grapheme Joiner", "invisible"],
    0x061C: ["Arabic Letter Mark", "direction"],
    0x115F: ["Hangul Choseong Filler", "invisible"],
    0x1160: ["Hangul Jungseong Filler", "invisible"],
    0x17B4: ["Khmer Vowel Inherent Aq", "invisible"],
    0x17B5: ["Khmer Vowel Inherent Aa", "invisible"],
    0x180E: ["Mongolian Vowel Separator", "invisible"],
    0x2000: ["En Quad", "space"],
    0x2001: ["Em Quad", "space"],
    0x2002: ["En Space", "space"],
    0x2003: ["Em Space", "space"],
    0x2004: ["Three-Per-Em Space", "space"],
    0x2005: ["Four-Per-Em Space", "space"],
    0x2006: ["Six-Per-Em Space", "space"],
    0x2007: ["Figure Space", "space"],
    0x2008: ["Punctuation Space", "space"],
    0x2009: ["Thin Space", "space"],
    0x200A: ["Hair Space", "space"],
    0x200B: ["Zero Width Space", "invisible"],
    0x200C: ["Zero Width Non-Joiner", "invisible"],
    0x200D: ["Zero Width Joiner", "invisible"],
    0x200E: ["Left-to-Right Mark", "direction"],
    0x200F: ["Right-to-Left Mark", "direction"],
    0x202A: ["Left-to-Right Embedding", "direction"],
    0x202B: ["Right-to-Left Embedding", "direction"],
    0x202C: ["Pop Directional Formatting", "direction"],
    0x202D: ["Left-to-Right Override", "direction"],
    0x202E: ["Right-to-Left Override", "direction"],
    0x202F: ["Narrow No-Break Space", "space"],
    0x205F: ["Medium Mathematical Space", "space"],
    0x2060: ["Word Joiner", "invisible"],
    0x2061: ["Function Application", "invisible"],
    0x2062: ["Invisible Times", "invisible"],
    0x2063: ["Invisible Separator", "invisible"],
    0x2064: ["Invisible Plus", "invisible"],
    0x2066: ["Left-to-Right Isolate", "direction"],
    0x2067: ["Right-to-Left Isolate", "direction"],
    0x2068: ["First Strong Isolate", "direction"],
    0x2069: ["Pop Directional Isolate", "direction"],
    0x2800: ["Braille Pattern Blank", "invisible"],
    0x3000: ["Ideographic Space", "space"],
    0x3164: ["Hangul Filler", "invisible"],
    0xFEFF: ["Zero Width No-Break Space (BOM)", "invisible"],
    0xFFA0: ["Halfwidth Hangul Filler", "invisible"]
  };
  const PICTO_RE = /\p{Extended_Pictographic}/u;

  function hexCp(cp) {
    return "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
  }

  /** Every hidden character, in order: { cp, code, name, kind, index, line, col }.
      index/col count code points from 1, the way an editor's column does. */
  function listHidden(text) {
    const chars = Array.from(text || "");
    const out = [];
    let line = 1, col = 0;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (ch === "\n") { line++; col = 0; continue; }
      col++;
      const cp = ch.codePointAt(0);
      const hit = HIDDEN[cp];
      if (!hit) continue;
      if (cp === 0x200D && i > 0 && i < chars.length - 1 &&
          PICTO_RE.test(chars[i - 1]) && PICTO_RE.test(chars[i + 1])) continue;
      out.push({ cp: cp, code: hexCp(cp), name: hit[0], kind: hit[1], index: i + 1, line: line, col: col });
    }
    return out;
  }

  /** The same text with every listed character fixed: odd spaces become a
      normal space, everything else is removed. Emoji joiners are kept. */
  function cleanHidden(text) {
    const chars = Array.from(text || "");
    const hits = {};
    listHidden(text).forEach(function (h) { hits[h.index - 1] = h; });
    let out = "";
    for (let i = 0; i < chars.length; i++) {
      const h = hits[i];
      if (!h) out += chars[i];
      else if (h.kind === "space") out += " ";
    }
    return out;
  }

  /** What is in this text that the user cannot see but the field counts. */
  function inspect(text) {
    const s = text || "";
    const invisible = countInvisible(s);
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

  ns.counterReduce = { TRANSFORMS, suggest, trimToFit, inspect, toPlain, gsmSafe, listHidden, cleanHidden };
})();
