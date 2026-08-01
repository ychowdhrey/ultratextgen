/* ==========================================================
   game-rules.js
   Per-game nickname rule engine for UltraTextGen.

   The one thing no nickname site does: tell the player whether
   the styled name they are about to copy will actually SURVIVE
   the game's rename screen — before they spend a Name Change
   Card, diamonds, UC, or a 14-day cooldown on a rejected paste.

   Data:    UltraTextGen.gameRules.RULES          (per-game rule table)
   Logic:   UltraTextGen.gameRules.analyze(str, gameId)
   UI:      UltraTextGen.gameRules.initChecker(config)

   analyze()'s report includes perChar: a per-grapheme pass/warn/reject
   verdict (see charVerdict), which initChecker renders as a small
   glyph-survival panel — which specific characters in THIS name are the
   ones that might get boxed or stripped, not just an aggregate badge.

   Rules are structural (limits, weighting, charset policy) and live
   here so twenty pages share one maintenance point. All UI labels
   are passed in via config.text, so the same engine drives EN, ID,
   VI, PT, TR… pages — same pattern as tag-studio.js.
   ========================================================== */
(function () {
  "use strict";

  const ns = (window.UltraTextGen = window.UltraTextGen || {});

  /* ============================
     Rule table
     limit        max glyphs the name field accepts
     min          min glyphs
     weighted     true = decorative Unicode counts as 2 glyphs (Free Fire)
     weightUncertain
                  true = the field is BELIEVED to count something other than
                  glyphs, but the rule is not sourced. `effective` stays at 1x
                  (we never assert an unverified limit), and instead a name that
                  fits at 1x but would NOT fit counting UTF-16 code units raises
                  a "weight-uncertain" warning. Use this instead of guessing at
                  `weighted` when the evidence is a pile of player reports rather
                  than a document.
     asciiPattern set = the field only accepts this charset (username-locked
                  games); everything else is rejected outright
     noSpace      true = a plain space is rejected (invisible chars instead)
     field        which name this rule describes: 'display' or 'username'
     ============================ */
  const RULES = {
    ff: { label: "Free Fire", limit: 12, min: 1, weighted: true, noSpace: true, field: "display" },
    ml: { label: "Mobile Legends", limit: 16, min: 4, weighted: false, noSpace: false, field: "display" },
    // Krafton publishes NO name rules for PUBG Mobile. The help centre article
    // ("How do I change my in-game nickname?", unchanged since at least 2022)
    // documents only the Rename Card flow — level-10 Growth Mission, Shop ->
    // Cards, one use per day — and says nothing about length, minimum, charset,
    // price, or what happens when a name is rejected. The 14 here comes from the
    // client's own error string, "Name cannot exceed 14 characters", quoted with
    // identical wording across independent community sources and with its own
    // troubleshooting-video genre. That is strong evidence of a real client
    // string, but it is not a document — treat it as such.
    // Beware: the "4-16 characters, letters/digits/hyphen/underscore only" rule
    // circulating for this game is Krafton's PUBG: BATTLEGROUNDS (PC) policy,
    // laundered into mobile articles. It is wrong here.
    // weightUncertain: players repeatedly report the 14-character error firing
    // on names that LOOK shorter than 14. That is consistent with the field
    // counting UTF-16 code units rather than glyphs — every classic decoration
    // (꧁ ꧂ ༒ 彡 乡 ★ ツ) and every small-caps letter is 1 unit, but every
    // mathematical-alphanumeric letter (bold/script/fraktur) is 2, so a fully
    // bold name would cap at 7 visible letters rather than 14. Nobody documents
    // the counting behaviour, so we do NOT assert it: `effective` stays at 1x
    // and we only warn inside the ambiguous band. One controlled in-client test
    // would settle it.
    pubg: { label: "PUBG Mobile", limit: 14, min: 1, weighted: false, weightUncertain: true, noSpace: true, field: "display" },
    coc: { label: "Clash of Clans", limit: 15, min: 2, weighted: false, noSpace: false, field: "display" },
    lienquan: { label: "Liên Quân Mobile", limit: 12, min: 1, weighted: false, noSpace: true, field: "display" },
    standoff2: { label: "Standoff 2", limit: 16, min: 2, weighted: false, noSpace: false, field: "display" },
    discord: { label: "Discord", limit: 32, min: 1, weighted: false, noSpace: false, field: "display" },
    tiktok: { label: "TikTok", limit: 30, min: 1, weighted: false, noSpace: false, field: "display" },
    fortnite: { label: "Fortnite", limit: 16, min: 3, weighted: false, noSpace: false, field: "display", strict: true },
    valorant: { label: "Valorant (Riot ID)", limit: 16, min: 3, weighted: false, noSpace: false, field: "display", strict: true },
    roblox: { label: "Roblox (username)", limit: 20, min: 3, weighted: false, noSpace: true, field: "username", asciiPattern: /^[A-Za-z0-9_]+$/, singleUnderscore: true },
    robloxDisplay: { label: "Roblox (display name)", limit: 20, min: 3, weighted: false, noSpace: false, field: "display" },
    minecraft: { label: "Minecraft", limit: 16, min: 3, weighted: false, noSpace: true, field: "username", asciiPattern: /^[A-Za-z0-9_]+$/ },
    // Stumble Guys' rename screen enforces 4-12 characters (Stumble Guys Help
    // Center) and its official UI form-validates against symbol characters —
    // but players widely report styled Unicode letters (Cyrillic/Greek/small
    // caps look-alikes) and common decorative symbols (crowns, stars, arrows)
    // surviving in practice, the same "may not always stick" profile as
    // Fortnite/Valorant, hence strict rather than an outright block.
    stumbleguys: { label: "Stumble Guys", limit: 12, min: 4, weighted: false, noSpace: false, field: "display", strict: true },
    // Xbox Gamertags are plain text only — styled Unicode has never been
    // accepted here, at any character count. As of Microsoft's July 2026
    // console update, a gamertag that is unique, available, and Latin-only
    // can run up to 15 characters, but any name needing the auto-assigned
    // #1234 suffix (i.e. not unique) or written in a non-Latin script stays
    // capped at the old 12-character limit. We validate against the
    // guaranteed 12-char floor rather than the conditional 15, since
    // uniqueness can't be known until the player actually tries to claim
    // the name — see /updates/xbox-gamertag-15-character-limit/.
    xbox: { label: "Xbox Gamertag", limit: 12, min: 1, weighted: false, noSpace: false, field: "username", asciiPattern: /^[A-Za-z][A-Za-z0-9]*(?: [A-Za-z0-9]+)*$/ },
    // PSN Online IDs are plain ASCII only (no styled Unicode, ever): 3-16
    // characters, must start with a letter, then letters/numbers/hyphens/
    // underscores only (Sony's own account-signup documentation).
    psn: { label: "PSN Online ID", limit: 16, min: 3, weighted: false, noSpace: true, field: "username", asciiPattern: /^[A-Za-z][A-Za-z0-9_-]*$/ },
    // Clash Royale names: 2-15 characters (Supercell Support). Unlike Free
    // Fire/Clash of Clans, Supercell's own article warns that symbols and
    // non-Latin characters "may not be displayed properly" and can make a
    // name appear invisible to other players — so we flag decorative
    // Unicode as a warning here (strict) rather than treating it as safe.
    clashroyale: { label: "Clash Royale", limit: 15, min: 2, weighted: false, noSpace: false, field: "display", strict: true }
  };

  /* ============================
     Character classification
     ============================ */

  // Symbols the mobile-game community uses at scale and that render
  // in Free Fire / PUBG / ML name fields on current clients.
  const SAFE_SYMBOLS =
    "꧁꧂꧅" + // ꧁ ꧂ ꧅ Javanese umbrellas
    "༺༻༼༽ྺྻ༒࿐" + // ༺ ༻ ༼ ༽ ྺ ྻ ༒ ࿐-family
    "ༀ࿓࿔" +
    "メ彡ツッシ〆乂亞亗" + // メ 彡 ツ ッ シ 〆 乂 亞 亗-family
    "亀龍鬼刀王星火雷神桜夜" + // common kanji accents
    "☠⚔†‡☭⛧" + // ☠ ⚔ † ‡
    "♛♚♕♔⛜⚜" + // ♛ ♚ ♕ ♔ ⚜
    "★☆✦✧✩✪✯✰✴✵✶✿❀❁❤♡♥♦♣♠" + // stars, florettes, hearts, suits
    "•◦∙⋆°˚。｡・" + // dots & interpuncts
    "『』【】「」〈〉《》｢｣" + // 『』【】「」〈〉《》
    "‹›«»❰❱❬❭❮❯" + // quotes/ornate brackets
    "™®©∞×÷✖❌" + // ™ ® © ∞ ×
    "☀☁☂☔⛱✈✻✼☘❤" + // ☀ ☁ ☂ ☔ ⛱ payung set
    "᲼ㅤ​⠀" + // invisible fillers (ㅤ U+3164, braille blank, ZWSP)
    "■□▲△▼▽●○◆◇▀▄︻︼" + // geometry / ▄▀ / ︻︼ sniper art
    "一丶丿"; // stroke marks

  // Unicode ranges of the "styled letter" alphabets our generator emits.
  // These render almost everywhere modern, but are technically exotic —
  // we call them 'styled', count them fine, and only warn on truly
  // unknown characters.
  const STYLED_RANGES = [
    [0x1d400, 0x1d7ff], // Mathematical Alphanumeric Symbols (bold/italic/script/fraktur/…)
    [0x1d100, 0x1d1ff], // musical (rare accents)
    [0x2460, 0x24ff],   // enclosed alphanumerics
    [0x1f100, 0x1f1ff], // enclosed alphanumeric supplement
    [0xff00, 0xffef],   // full-width forms
    [0x1e00, 0x1eff],   // latin extended additional (Vietnamese!)
    [0x0100, 0x024f],   // latin extended A/B
    [0xa720, 0xa7ff],   // latin extended-D (small-cap ꜱ, ꜰ, etc. — already
                         // used in several pages' ready-made name lists, e.g. ꜱɴɪᴘᴇʀ)
    [0x0400, 0x04ff],   // Cyrillic (renders everywhere; display-name fields accept it)
    [0x0250, 0x02af],   // IPA (small caps live here)
    [0x1d00, 0x1d7f],   // phonetic extensions (small caps)
    [0x02b0, 0x02ff],   // spacing modifiers (superscripts)
    [0x1d2c, 0x1d6a],   // superscript letters
    [0x2070, 0x209f],   // super/subscripts
    [0x0300, 0x036f],   // combining diacritics (zalgo-lite accents)
    [0x3040, 0x30ff],   // hiragana + katakana
    [0x0e00, 0x0e7f],   // Thai
    [0x0600, 0x06ff]    // Arabic
  ];

  function isAsciiWord(cp) {
    return (
      (cp >= 0x30 && cp <= 0x39) ||
      (cp >= 0x41 && cp <= 0x5a) ||
      (cp >= 0x61 && cp <= 0x7a) ||
      cp === 0x5f || cp === 0x2e || cp === 0x2d || cp === 0x27
    );
  }

  function inStyledRanges(cp) {
    for (let i = 0; i < STYLED_RANGES.length; i++) {
      if (cp >= STYLED_RANGES[i][0] && cp <= STYLED_RANGES[i][1]) return true;
    }
    return false;
  }

  function classifyChar(ch) {
    const cp = ch.codePointAt(0);
    if (cp === 0x20) return "space";
    if (isAsciiWord(cp)) return "ascii";
    if (SAFE_SYMBOLS.indexOf(ch) !== -1) return "safe";
    if (inStyledRanges(cp)) return "styled";
    // Emoji presentation & pictographs: widely supported in FF/PUBG,
    // but count double and can be blocked by stricter games.
    if (cp >= 0x1f000 && cp <= 0x1faff) return "emoji";
    if (cp >= 0x2190 && cp <= 0x2bff) return "safe"; // arrows/misc symbols block
    return "unknown";
  }

  // Grapheme-cluster split (a zalgo-style base+combining-marks stack reads
  // as one glyph, not N). Display-only — analyze()'s counting below stays on
  // Array.from codepoints, since the per-game limit math is already
  // calibrated against that and must not shift underneath existing pages.
  const graphemeSeg =
    typeof Intl !== "undefined" && Intl.Segmenter
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;
  function graphemes(str) {
    return graphemeSeg ? Array.from(graphemeSeg.segment(str), function (s) { return s.segment; }) : Array.from(str);
  }

  // Per-glyph survival verdict for the compatibility panel: will this
  // specific character clear the target game's field, or is it likely to
  // get boxed/stripped/rejected? Reuses the exact same classification and
  // per-game flags analyze() already uses — no separate platform-support
  // data set, so it never asserts anything beyond what this file already
  // encodes about a game's charset policy.
  function charVerdict(ch, rule) {
    if (rule.asciiPattern) return rule.asciiPattern.test(ch) ? "pass" : "reject";
    if (ch === " ") return rule.noSpace ? "reject" : "pass";
    // ch may be a multi-codepoint grapheme (base + combining marks) — classify
    // by its first codepoint, same base that carries the visible glyph.
    const base = Array.from(ch)[0] || ch;
    const cls = classifyChar(base);
    if (cls === "ascii" || cls === "space") return "pass";
    if (cls === "unknown") return "warn"; // may render as a box, client-dependent
    // safe / styled / emoji: fine almost everywhere, but strict-mode games
    // (Fortnite, Valorant) are known to strip decorative Unicode from names.
    return rule.strict ? "warn" : "pass";
  }

  /* ============================
     analyze(str, gameId) → report
     ============================ */
  function analyze(str, gameId) {
    const rule = RULES[gameId] || RULES.ff;
    const chars = Array.from(str || "");
    let weightedLen = 0;
    let plain = 0, safe = 0, styled = 0, emoji = 0, unknown = 0, spaces = 0;
    const badChars = [];

    chars.forEach(function (ch) {
      const cls = classifyChar(ch);
      if (cls === "ascii") { plain++; weightedLen += 1; }
      else if (cls === "space") { spaces++; weightedLen += 1; }
      else { // safe / styled / emoji / unknown all count double where weighted
        if (cls === "safe") safe++;
        else if (cls === "styled") styled++;
        else if (cls === "emoji") emoji++;
        else { unknown++; if (badChars.indexOf(ch) === -1) badChars.push(ch); }
        weightedLen += rule.weighted ? 2 : 1;
      }
    });

    const glyphs = chars.length;
    const effective = rule.weighted ? weightedLen : glyphs;
    // JS strings are UTF-16, so str.length IS the code-unit count — the thing a
    // field counts when it counts "characters" the naive way. Only used by
    // weightUncertain; never fed into `effective`.
    const utf16 = (str || "").length;
    const issues = [];

    if (!glyphs) issues.push("empty");
    if (glyphs && rule.min && glyphs < rule.min) issues.push("too-short");
    if (rule.limit && effective > rule.limit) issues.push("over-limit");
    if (rule.noSpace && spaces > 0) issues.push("space");
    if (rule.asciiPattern && glyphs && !rule.asciiPattern.test(str)) issues.push("charset");
    if (rule.singleUnderscore && glyphs) {
      const u = str.split("_").length - 1;
      if (u > 1 || /^_|_$/.test(str)) issues.push("underscore");
    }
    // Fits counting glyphs, would not fit counting UTF-16 units. We cannot say
    // which the game does, so we say exactly that rather than picking one.
    if (rule.weightUncertain && rule.limit && effective <= rule.limit && utf16 > rule.limit) {
      issues.push("weight-uncertain");
    }
    if (!rule.asciiPattern && unknown > 0) issues.push("unknown-chars");
    if (rule.strict && (safe + styled + emoji + unknown) > 0) issues.push("strict-symbols");

    // Level: fail = the game will reject it; warn = may render as boxes
    // or be rejected on some clients; ok = clears every structural rule.
    let level = "ok";
    if (
      issues.indexOf("over-limit") !== -1 ||
      issues.indexOf("charset") !== -1 ||
      issues.indexOf("underscore") !== -1 ||
      issues.indexOf("space") !== -1 ||
      issues.indexOf("too-short") !== -1
    ) level = "fail";
    else if (
      issues.indexOf("unknown-chars") !== -1 ||
      issues.indexOf("strict-symbols") !== -1 ||
      issues.indexOf("weight-uncertain") !== -1
    ) level = "warn";
    if (issues.indexOf("empty") !== -1) level = "empty";

    // Per-glyph breakdown for the compatibility panel — grapheme clusters,
    // not codepoints, so a combining-mark stack reads as one tile.
    const perChar = graphemes(str || "").map(function (ch) {
      return { ch: ch, verdict: charVerdict(ch, rule) };
    });

    return {
      game: gameId,
      rule: rule,
      glyphs: glyphs,
      effective: effective,
      utf16: utf16,
      limit: rule.limit || 0,
      counts: { plain: plain, safe: safe, styled: styled, emoji: emoji, unknown: unknown, spaces: spaces },
      badChars: badChars,
      perChar: perChar,
      issues: issues,
      level: level
    };
  }

  /* ============================
     Checker UI
     config = {
       mount:   element id to render into
       games:   [gameId, …] shown as tabs (first = active)
       inputId: optional main generator input to mirror until the user
                pastes/types into the checker box directly
       text: {
         inputLabel, placeholder, counterOver,
         ok, warn, fail, empty,               // badge labels
         issue: { 'over-limit': …, space: …, charset: …, underscore: …,
                  'unknown-chars': …, 'strict-symbols': …, 'too-short': …,
                  'weight-uncertain': … },
         weightNote                            // e.g. "symbols count as 2"
       }
     }
     ============================ */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function initChecker(config) {
    const cfg = config || {};
    const mount = document.getElementById(cfg.mount);
    if (!mount) return;

    const text = cfg.text || {};
    const issueText = text.issue || {};
    const games = (cfg.games || ["ff"]).filter(function (g) { return RULES[g]; });
    if (!games.length) return;

    const state = { game: games[0], dirty: false };

    mount.innerHTML = "";
    mount.classList.add("gr-checker");

    // Game tabs (only when more than one game is offered)
    let tabsWrap = null;
    if (games.length > 1) {
      tabsWrap = el("div", "gr-tabs");
      games.forEach(function (g) {
        const tab = el("button", "gr-tab", RULES[g].label);
        tab.type = "button";
        tab.setAttribute("data-game", g);
        tabsWrap.appendChild(tab);
      });
      tabsWrap.addEventListener("click", function (e) {
        const tab = e.target.closest(".gr-tab");
        if (!tab) return;
        state.game = tab.getAttribute("data-game");
        render();
      });
      mount.appendChild(tabsWrap);
    }

    if (text.inputLabel) mount.appendChild(el("div", "gr-label", text.inputLabel));

    const box = document.createElement("input");
    box.type = "text";
    box.className = "gr-input";
    box.placeholder = text.placeholder || "";
    box.setAttribute("aria-label", text.inputLabel || text.placeholder || "Name to check");
    mount.appendChild(box);

    const meta = el("div", "gr-meta");
    const badge = el("span", "gr-badge");
    const count = el("span", "gr-count");
    meta.appendChild(badge);
    meta.appendChild(count);
    mount.appendChild(meta);

    const notes = el("ul", "gr-notes");
    mount.appendChild(notes);

    const charRow = el("div", "gr-chars");
    mount.appendChild(charRow);

    // Mirror the main generator input until the user touches the checker, so
    // the counter feels live without any extra step. We mirror the *flaired*
    // text (name + selected decoration) when script.js exposes it, so the count
    // reflects exactly what the player will paste — e.g. a ꧁༒…༒꧂ frame that
    // pushes a "fits" name over the limit shows up here. Falls back to the raw
    // value on pages without the generator bridge.
    const mainInput = cfg.inputId ? document.getElementById(cfg.inputId) : null;
    function mirrorSource() {
      if (ns.flairedMainInput) return ns.flairedMainInput() || "";
      return (mainInput ? mainInput.value : "") || "";
    }
    if (mainInput) {
      mainInput.addEventListener("input", function () {
        if (!state.dirty) { box.value = mirrorSource(); render(); }
      });
      // The selected flair changed in the generator — re-mirror so the badge
      // and counter track the decorated name, not just the typed base.
      document.addEventListener("utg:flairchange", function () {
        if (!state.dirty) { box.value = mirrorSource(); render(); }
      });
      box.value = mirrorSource();
    }
    box.addEventListener("input", function () { state.dirty = true; render(); });

    function render() {
      const report = analyze(box.value, state.game);
      const rule = report.rule;

      if (tabsWrap) {
        tabsWrap.querySelectorAll(".gr-tab").forEach(function (tab) {
          tab.classList.toggle("active", tab.getAttribute("data-game") === state.game);
        });
      }

      // Badge
      badge.className = "gr-badge gr-badge-" + report.level;
      badge.textContent =
        report.level === "ok" ? (text.ok || "Looks safe") :
        report.level === "warn" ? (text.warn || "May show boxes") :
        report.level === "fail" ? (text.fail || "Will be rejected") :
        (text.empty || "");

      // Counter — weighted games show the effective count.
      if (report.limit) {
        count.textContent = report.effective + " / " + report.limit;
        count.classList.toggle("is-over", report.effective > report.limit);
      } else {
        count.textContent = String(report.glyphs);
      }

      // Notes
      notes.innerHTML = "";
      if (rule.weighted && text.weightNote && report.glyphs) {
        notes.appendChild(el("li", "gr-note", text.weightNote));
      }
      report.issues.forEach(function (code) {
        if (code === "empty") return;
        let msg = issueText[code];
        if (!msg) return;
        if (code === "unknown-chars" && report.badChars.length) {
          msg += " " + report.badChars.slice(0, 6).join(" ");
        }
        notes.appendChild(el("li", "gr-note gr-note-" + code, msg));
      });

      // Per-glyph compatibility panel — only the characters worth a second
      // look (pass is the silent default), capped so a long decorated name
      // doesn't produce a wall of tiles on mobile.
      charRow.innerHTML = "";
      const flagged = report.perChar.filter(function (p) { return p.verdict !== "pass"; }).slice(0, 16);
      if (flagged.length) {
        charRow.appendChild(el("span", "gr-chars-label", text.charsToWatch || "Check these characters:"));
        flagged.forEach(function (p) {
          const cp = "U+" + p.ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
          const tile = el("span", "gr-char gr-char-" + p.verdict, p.ch);
          tile.title = cp;
          charRow.appendChild(tile);
        });
      }
    }

    render();
  }

  ns.gameRules = {
    RULES: RULES,
    analyze: analyze,
    initChecker: initChecker,
    classifyChar: classifyChar,
    graphemes: graphemes,
    charVerdict: charVerdict
  };
})();
