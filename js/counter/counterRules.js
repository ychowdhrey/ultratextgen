/* ==========================================================
   counterRules.js
   Platform/use-case character-limit rule table for UltraTextGen's
   character & word counter (/character-counter/).

   Same shape as js/gamename/game-rules.js (RULES table + analyze() +
   a mountable checker UI), generalized from per-game nickname limits to
   per-platform post/bio/title limits — and from the one-off
   PLATFORM_LIMITS fit-badges in usecase/zalgo-text/zalgo-text.js, which
   only ever needed 4 platforms hardcoded to one page. This is the
   shared, expandable version: one rule table, any page can mount it.

   Counting engine: most platforms count Unicode code points, but not
   all — X/Twitter uses its published weighted algorithm (twitter-text
   v3: URLs = 23, most non-Latin/symbol/styled characters = 2) and SMS
   is segment-based (GSM-7 160/153 vs UCS-2 70/67, where one non-GSM
   character flips the whole message). Each rule may declare a
   `countMode` ("codepoint" default | "x-weighted" | "gsm"); analyze()
   counts the way that destination actually counts. The raw counting
   helpers are exposed as UltraTextGen.counterCounts so the page
   controller can show UTF-16/byte/grapheme stats from the same logic.

   Data:  UltraTextGen.counterRules.LIMITS
   Logic: UltraTextGen.counterRules.analyze(str, limitId)
   UI:    UltraTextGen.counterRules.initChecker(config)
   ========================================================== */
(function () {
  "use strict";

  const ns = (window.UltraTextGen = window.UltraTextGen || {});

  /* ============================
     Counting helpers
     ============================ */

  function codePoints(str) {
    return Array.from(str || "").length;
  }

  function utf16Units(str) {
    return (str || "").length;
  }

  function utf8Bytes(str) {
    if (!str) return 0;
    let bytes = 0;
    for (const ch of str) {
      const cp = ch.codePointAt(0);
      if (cp <= 0x7f) bytes += 1;
      else if (cp <= 0x7ff) bytes += 2;
      else if (cp <= 0xffff) bytes += 3;
      else bytes += 4;
    }
    return bytes;
  }

  const graphemeSegmenter = (typeof Intl !== "undefined" && Intl.Segmenter)
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

  function graphemes(str) {
    if (!str) return 0;
    if (!graphemeSegmenter) return codePoints(str);
    let n = 0;
    for (const s of graphemeSegmenter.segment(str)) { void s; n++; }
    return n;
  }

  /* --- X/Twitter weighted counting (twitter-text v3 config) ---
     Weight-1 code point ranges; everything else weighs 2. Any URL is
     replaced by t.co and always counts as 23, regardless of length. */
  const X_URL_WEIGHT = 23;
  const X_LIGHT_RANGES = [
    [0x0000, 0x10ff],
    [0x2000, 0x200d],
    [0x2010, 0x201f],
    [0x2032, 0x2037]
  ];
  const URL_RE = /(?:https?:\/\/|www\.)[^\s]+/gi;

  function xWeight(cp) {
    for (let i = 0; i < X_LIGHT_RANGES.length; i++) {
      if (cp >= X_LIGHT_RANGES[i][0] && cp <= X_LIGHT_RANGES[i][1]) return 1;
    }
    return 2;
  }

  function xWeightedLength(str) {
    if (!str) return 0;
    let total = 0;
    const withoutUrls = str.replace(URL_RE, function () {
      total += X_URL_WEIGHT;
      return "";
    });
    for (const ch of withoutUrls) total += xWeight(ch.codePointAt(0));
    return total;
  }

  /* --- SMS segment counting (GSM 03.38) ---
     GSM-7 basic set costs 1 septet, the extension set (€ ~ [ ] { } \ | ^
     and form feed) costs 2. Any character outside both flips the whole
     message to UCS-2: 70 chars/segment (67 when concatenated) instead
     of 160 (153). */
  const GSM_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑܧ¿abcdefghijklmnopqrstuvwxyzäöñüà";
  const GSM_EXT = "€~[]{}\\|^\f";

  function gsmInfo(str) {
    const s = str || "";
    let septets = 0;
    let gsmSafe = true;
    const flipChars = [];
    for (const ch of s) {
      if (GSM_BASIC.indexOf(ch) !== -1) {
        septets += 1;
      } else if (GSM_EXT.indexOf(ch) !== -1) {
        septets += 2;
      } else {
        gsmSafe = false;
        if (flipChars.length < 8 && flipChars.indexOf(ch) === -1) flipChars.push(ch);
      }
    }
    const units = utf16Units(s);
    let encoding, perSegment, length, segments;
    if (gsmSafe) {
      encoding = "GSM-7";
      length = septets;
      segments = length === 0 ? 0 : (length <= 160 ? 1 : Math.ceil(length / 153));
      perSegment = segments > 1 ? 153 : 160;
    } else {
      encoding = "UCS-2";
      length = units;
      segments = length === 0 ? 0 : (length <= 70 ? 1 : Math.ceil(length / 67));
      perSegment = segments > 1 ? 67 : 70;
    }
    return {
      encoding: encoding,
      length: length,
      segments: segments,
      perSegment: perSegment,
      flipChars: flipChars
    };
  }

  /* ============================
     Rule table — verified against each platform's current published
     limit (see the counting-modes section on the character-counter
     page for sources). Default counting uses Unicode code points,
     matching game-rules.js; rules with a `countMode` count the way
     that specific destination counts.

     `group` is a stable key, not display text — DEFAULT_GROUPS below holds
     the English display string, and a page's initChecker() config can pass
     `groups`/`labels` overrides so one rule table drives every locale
     (same reasoning as game-rules.js's config.text: numbers live once,
     translated strings are supplied per page).
     ============================ */
  const LIMITS = [
    { id: "x-post", label: "X / Twitter post", limit: 280, group: "posts", countMode: "x-weighted" },
    { id: "discord-message", label: "Discord message", limit: 2000, group: "posts" },
    { id: "ig-caption", label: "Instagram caption", limit: 2200, group: "posts" },
    { id: "tiktok-caption", label: "TikTok caption", limit: 2200, group: "posts" },
    { id: "li-post", label: "LinkedIn post", limit: 3000, group: "posts" },
    { id: "fb-post", label: "Facebook post", limit: 63206, group: "posts" },
    { id: "yt-description", label: "YouTube description", limit: 5000, group: "posts" },
    { id: "pinterest-description", label: "Pinterest pin description", limit: 500, group: "posts" },
    { id: "telegram-message", label: "Telegram message", limit: 4096, group: "posts" },
    { id: "telegram-caption", label: "Telegram photo/video caption", limit: 1024, group: "posts" },
    { id: "threads-post", label: "Threads post", limit: 500, group: "posts" },
    { id: "bluesky-post", label: "Bluesky post", limit: 300, group: "posts" },
    { id: "reddit-title", label: "Reddit post title", limit: 300, group: "posts" },
    { id: "zalo-post", label: "Zalo post/status", limit: 2000, group: "posts" },

    { id: "ig-bio", label: "Instagram bio", limit: 150, group: "bios" },
    { id: "tiktok-bio", label: "TikTok bio", limit: 80, group: "bios" },
    { id: "li-headline", label: "LinkedIn headline", limit: 220, group: "bios" },
    { id: "whatsapp-about", label: "WhatsApp About", limit: 139, group: "bios" },
    { id: "telegram-bio", label: "Telegram bio", limit: 70, group: "bios" },
    { id: "vk-status", label: "VK status", limit: 140, group: "bios" },

    { id: "discord-nick", label: "Discord nickname", limit: 32, group: "usernames" },
    { id: "tiktok-username", label: "TikTok username", limit: 24, group: "usernames" },
    { id: "ig-username", label: "Instagram username", limit: 30, group: "usernames" },

    { id: "yt-title", label: "YouTube title", limit: 100, group: "titles" },
    { id: "meta-title", label: "SEO meta title", limit: 60, group: "titles" },
    { id: "meta-description", label: "SEO meta description", limit: 155, group: "titles" },
    { id: "sms", label: "SMS text message", limit: 160, group: "titles", countMode: "gsm" }
  ];

  const DEFAULT_GROUPS = {
    posts: "Posts",
    bios: "Bios & profiles",
    usernames: "Usernames",
    titles: "Titles & meta"
  };

  /* ============================
     analyze(str, limitId) → report
     ============================ */
  function analyze(str, limitId) {
    const rule = LIMITS.find((r) => r.id === limitId) || LIMITS[0];
    const mode = rule.countMode || "codepoint";
    const report = {
      rule: rule,
      mode: mode,
      limit: rule.limit
    };

    if (mode === "gsm") {
      const info = gsmInfo(str || "");
      report.glyphs = info.length;
      report.limit = info.perSegment;
      report.fits = info.segments <= 1;
      report.remaining = info.perSegment * Math.max(1, info.segments) - info.length;
      report.sms = info;
      return report;
    }

    if (mode === "x-weighted") {
      report.glyphs = xWeightedLength(str || "");
    } else {
      report.glyphs = codePoints(str || "");
    }
    report.fits = report.glyphs <= rule.limit;
    report.remaining = rule.limit - report.glyphs;
    return report;
  }

  /* ============================
     Checker UI
     config = {
       mount:   element id to render into
       inputId: main counter textarea to mirror live
       selected: optional starting limit id (defaults to LIMITS[0])
       text:    { label, ok, fail, xNote, smsSegments, smsUnicode }
       labels:  optional { limitId: translatedLabel } — falls back to the
                English LIMITS[].label so a locale only needs to translate
                the platforms it wants to relabel (platform proper nouns
                like "Instagram" usually stay as-is).
       groups:  optional { groupKey: translatedGroupName } — falls back to
                DEFAULT_GROUPS.
     }
     text.smsSegments may contain {n} (segment count) and {per}
     (chars per segment); text.smsUnicode may contain {chars} (the
     characters that flipped the message to Unicode mode).
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
    if (!mount) return null;

    const text = cfg.text || {};
    const labels = cfg.labels || {};
    const groupNames = cfg.groups || {};
    const state = { limitId: cfg.selected && LIMITS.some((r) => r.id === cfg.selected) ? cfg.selected : LIMITS[0].id };

    mount.innerHTML = "";
    mount.classList.add("cc-checker");

    if (text.label) mount.appendChild(el("div", "cc-label", text.label));

    const select = document.createElement("select");
    select.className = "cc-select";
    select.setAttribute("aria-label", text.label || "Check against a platform limit");
    const groups = {};
    LIMITS.forEach((rule) => {
      if (!groups[rule.group]) {
        groups[rule.group] = document.createElement("optgroup");
        groups[rule.group].label = groupNames[rule.group] || DEFAULT_GROUPS[rule.group] || rule.group;
        select.appendChild(groups[rule.group]);
      }
      const opt = document.createElement("option");
      opt.value = rule.id;
      opt.textContent = (labels[rule.id] || rule.label) + " (" + rule.limit.toLocaleString() + ")";
      if (rule.id === state.limitId) opt.selected = true;
      groups[rule.group].appendChild(opt);
    });
    mount.appendChild(select);

    const meta = el("div", "cc-meta");
    const badge = el("span", "cc-badge");
    const count = el("span", "cc-count");
    meta.appendChild(badge);
    meta.appendChild(count);
    mount.appendChild(meta);

    const bar = el("div", "cc-bar");
    const fill = el("div", "cc-bar-fill");
    bar.appendChild(fill);
    mount.appendChild(bar);

    const note = el("div", "cc-note");
    note.hidden = true;
    mount.appendChild(note);

    const input = cfg.inputId ? document.getElementById(cfg.inputId) : null;

    function fmt(template, vars) {
      return template.replace(/\{(\w+)\}/g, function (m, key) {
        return vars[key] != null ? vars[key] : m;
      });
    }

    function render() {
      const report = analyze(input ? input.value : "", state.limitId);

      badge.className = "cc-badge cc-badge-" + (report.glyphs === 0 ? "empty" : report.fits ? "ok" : "fail");
      badge.textContent = report.glyphs === 0
        ? ""
        : report.fits
          ? (text.ok || "Fits ✓")
          : (text.fail || "Over the limit ✕");

      count.textContent = report.glyphs.toLocaleString() + " / " + report.limit.toLocaleString();
      count.classList.toggle("is-over", !report.fits);

      const pct = Math.min(100, (report.glyphs / report.limit) * 100);
      fill.style.width = pct + "%";
      fill.classList.toggle("is-over", !report.fits);

      let noteText = "";
      if (report.mode === "x-weighted" && report.glyphs > 0) {
        noteText = text.xNote || "Counted the way X counts: every URL = 23, and most symbols, emoji, and styled Unicode letters = 2 each.";
      } else if (report.mode === "gsm" && report.sms && report.sms.segments > 0) {
        const sms = report.sms;
        noteText = fmt(text.smsSegments || "{n} SMS segment(s) · {per} characters per segment ({enc})", {
          n: sms.segments, per: sms.perSegment, enc: sms.encoding
        });
        if (sms.encoding === "UCS-2" && sms.flipChars.length) {
          noteText += " — " + fmt(text.smsUnicode || "switched to Unicode mode by: {chars}", {
            chars: sms.flipChars.join(" ")
          });
        }
      }
      note.textContent = noteText;
      note.hidden = !noteText;
    }

    select.addEventListener("change", function () {
      state.limitId = select.value;
      render();
    });
    if (input) input.addEventListener("input", render);

    render();
    return { render: render };
  }

  ns.counterCounts = {
    codePoints: codePoints,
    utf16Units: utf16Units,
    utf8Bytes: utf8Bytes,
    graphemes: graphemes,
    xWeightedLength: xWeightedLength,
    gsmInfo: gsmInfo
  };
  ns.counterRules = { LIMITS: LIMITS, analyze: analyze, initChecker: initChecker };
})();
