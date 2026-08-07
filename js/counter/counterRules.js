/* ==========================================================
   counterRules.js
   Platform/field character-limit rule table + counting engine for
   UltraTextGen's character counter (/character-counter/).

   The job this serves is not "count my characters" — it is "will my
   text fit where it is going, counted the way THAT destination counts."
   So every rule declares which platform and field it belongs to, what
   its limit is, how that destination counts (`countMode`), and — where
   the platform truncates a post visually long before its hard limit —
   where the reader stops seeing it (`visibleAt`).

   Counting modes:
     "codepoint"  (default) Unicode code points — what most platforms use
     "x-weighted" X/Twitter's published algorithm (twitter-text v3):
                  every URL = 23, weight-1 ranges below, everything else 2
     "gsm"        SMS segments — GSM-7 (160/153) until one character
                  outside the alphabet flips the whole message to UCS-2
                  (70/67), which is why one emoji can double an SMS bill

   Rule IDs are STABLE — locale pages map translated strings onto them
   via initChecker's `labels` config, so an id must never be renamed.

   Data:  UltraTextGen.counterRules.LIMITS / .PLATFORMS
   Logic: .analyze(str, limitId) · .measure(str, limitId) · .fitsAll(str)
   UI:    .initChecker(config)
   Counts: UltraTextGen.counterCounts (shared with the page controller)
   ========================================================== */
(function () {
  "use strict";

  const ns = (window.UltraTextGen = window.UltraTextGen || {});

  /* ============================================================
     Counting helpers
     ============================================================ */

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

  /** First n graphemes, so a cut never lands inside an emoji or a
      combining sequence — the fold preview must render, not mojibake. */
  function takeGraphemes(str, n) {
    if (!str || n <= 0) return "";
    if (!graphemeSegmenter) return Array.from(str).slice(0, n).join("");
    let out = "", i = 0;
    for (const s of graphemeSegmenter.segment(str)) {
      if (i++ >= n) break;
      out += s.segment;
    }
    return out;
  }

  /* --- X/Twitter weighted counting (twitter-text v3 config) --- */
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

  /* --- SMS segment counting (GSM 03.38) --- */
  const GSM_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
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
    return { encoding, length, segments, perSegment, flipChars };
  }

  /* ============================================================
     Platforms and their fields

     `visibleAt` = where the platform truncates in the feed, when that
     is meaningfully shorter than the hard limit. It is NOT a limit you
     cannot cross — it is where most readers stop seeing your text.
     ============================================================ */
  const PLATFORMS = [
    { id: "x", label: "X / Twitter" },
    { id: "instagram", label: "Instagram" },
    { id: "tiktok", label: "TikTok" },
    { id: "linkedin", label: "LinkedIn" },
    { id: "youtube", label: "YouTube" },
    { id: "facebook", label: "Facebook" },
    { id: "discord", label: "Discord" },
    { id: "telegram", label: "Telegram" },
    { id: "threads", label: "Threads" },
    { id: "bluesky", label: "Bluesky" },
    { id: "reddit", label: "Reddit" },
    { id: "pinterest", label: "Pinterest" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "vk", label: "VK" },
    { id: "zalo", label: "Zalo" },
    { id: "sms", label: "SMS" },
    { id: "seo", label: "Google search result" }
  ];

  const LIMITS = [
    /* X / Twitter — the only mainstream platform that counts by weight */
    { id: "x-post", platform: "x", field: "Post", label: "X / Twitter post", limit: 280, group: "posts", countMode: "x-weighted" },
    { id: "x-bio", platform: "x", field: "Bio", label: "X / Twitter bio", limit: 160, group: "bios" },
    { id: "x-name", platform: "x", field: "Display name", label: "X / Twitter display name", limit: 50, group: "usernames" },

    { id: "ig-caption", platform: "instagram", field: "Caption", label: "Instagram caption", limit: 2200, group: "posts", visibleAt: 125 },
    { id: "ig-bio", platform: "instagram", field: "Bio", label: "Instagram bio", limit: 150, group: "bios" },
    { id: "ig-username", platform: "instagram", field: "Username", label: "Instagram username", limit: 30, group: "usernames" },
    { id: "ig-alt", platform: "instagram", field: "Alt text", label: "Instagram alt text", limit: 100, group: "titles" },

    { id: "tiktok-caption", platform: "tiktok", field: "Caption", label: "TikTok caption", limit: 2200, group: "posts" },
    { id: "tiktok-bio", platform: "tiktok", field: "Bio", label: "TikTok bio", limit: 80, group: "bios" },
    { id: "tiktok-username", platform: "tiktok", field: "Username", label: "TikTok username", limit: 24, group: "usernames" },

    { id: "li-post", platform: "linkedin", field: "Post", label: "LinkedIn post", limit: 3000, group: "posts", visibleAt: 140, foldDesktop: 210 },
    { id: "li-headline", platform: "linkedin", field: "Headline", label: "LinkedIn headline", limit: 220, group: "bios" },
    { id: "li-about", platform: "linkedin", field: "About section", label: "LinkedIn About", limit: 2600, group: "bios" },
    { id: "li-comment", platform: "linkedin", field: "Comment", label: "LinkedIn comment", limit: 1250, group: "posts" },

    { id: "yt-title", platform: "youtube", field: "Video title", label: "YouTube title", limit: 100, group: "titles" },
    { id: "yt-description", platform: "youtube", field: "Description", label: "YouTube description", limit: 5000, group: "posts", visibleAt: 157 },
    { id: "yt-comment", platform: "youtube", field: "Comment", label: "YouTube comment", limit: 10000, group: "posts" },

    { id: "fb-post", platform: "facebook", field: "Post", label: "Facebook post", limit: 63206, group: "posts", visibleAt: 477 },

    { id: "discord-message", platform: "discord", field: "Message", label: "Discord message", limit: 2000, group: "posts" },
    { id: "discord-nick", platform: "discord", field: "Nickname", label: "Discord nickname", limit: 32, group: "usernames" },
    { id: "discord-status", platform: "discord", field: "Custom status", label: "Discord custom status", limit: 128, group: "bios" },

    { id: "telegram-message", platform: "telegram", field: "Message", label: "Telegram message", limit: 4096, group: "posts" },
    { id: "telegram-caption", platform: "telegram", field: "Photo/video caption", label: "Telegram photo/video caption", limit: 1024, group: "posts" },
    { id: "telegram-bio", platform: "telegram", field: "Bio", label: "Telegram bio", limit: 70, group: "bios" },

    { id: "threads-post", platform: "threads", field: "Post", label: "Threads post", limit: 500, group: "posts" },
    { id: "threads-bio", platform: "threads", field: "Bio", label: "Threads bio", limit: 150, group: "bios" },

    /* Bluesky is the one platform that counts what you actually see: the
       AT Protocol lexicon caps a post at 300 *graphemes* (and a profile
       description at 256), so a family emoji built from a 7-code-point ZWJ
       sequence costs 1, not 7. */
    { id: "bluesky-post", platform: "bluesky", field: "Post", label: "Bluesky post", limit: 300, group: "posts", countMode: "graphemes" },
    { id: "bluesky-bio", platform: "bluesky", field: "Bio", label: "Bluesky bio", limit: 256, group: "bios", countMode: "graphemes" },

    { id: "reddit-title", platform: "reddit", field: "Post title", label: "Reddit post title", limit: 300, group: "posts" },
    { id: "reddit-comment", platform: "reddit", field: "Comment", label: "Reddit comment", limit: 10000, group: "posts" },

    { id: "pinterest-description", platform: "pinterest", field: "Pin description", label: "Pinterest pin description", limit: 500, group: "posts" },
    { id: "pinterest-title", platform: "pinterest", field: "Pin title", label: "Pinterest pin title", limit: 100, group: "titles" },

    { id: "whatsapp-about", platform: "whatsapp", field: "About", label: "WhatsApp About", limit: 139, group: "bios" },

    { id: "vk-status", platform: "vk", field: "Status", label: "VK status", limit: 140, group: "bios" },

    { id: "zalo-post", platform: "zalo", field: "Post/status", label: "Zalo post/status", limit: 2000, group: "posts" },

    { id: "sms", platform: "sms", field: "Text message", label: "SMS text message", limit: 160, group: "titles", countMode: "gsm" },

    { id: "meta-title", platform: "seo", field: "Page title", label: "SEO meta title", limit: 60, group: "titles" },
    { id: "meta-description", platform: "seo", field: "Meta description", label: "SEO meta description", limit: 155, group: "titles" }
  ];

  const DEFAULT_GROUPS = {
    posts: "Posts",
    bios: "Bios & profiles",
    usernames: "Usernames",
    titles: "Titles & meta"
  };

  /* ============================================================
     analyze / measure
     ============================================================ */
  function ruleById(limitId) {
    return LIMITS.find((r) => r.id === limitId) || LIMITS[0];
  }

  /** Length of `str` in the unit `limitId`'s destination actually counts. */
  function measure(str, limitId) {
    const rule = ruleById(limitId);
    const mode = rule.countMode || "codepoint";
    if (mode === "gsm") return gsmInfo(str || "").length;
    if (mode === "x-weighted") return xWeightedLength(str || "");
    if (mode === "graphemes") return graphemes(str || "");
    return codePoints(str || "");
  }

  function analyze(str, limitId) {
    const rule = ruleById(limitId);
    const mode = rule.countMode || "codepoint";
    const report = { rule, mode, limit: rule.limit };

    if (mode === "gsm") {
      const info = gsmInfo(str || "");
      report.glyphs = info.length;
      report.limit = info.perSegment;
      report.fits = info.segments <= 1;
      report.remaining = info.perSegment * Math.max(1, info.segments) - info.length;
      report.sms = info;
      return report;
    }

    report.glyphs = mode === "x-weighted" ? xWeightedLength(str || "") : codePoints(str || "");
    report.fits = report.glyphs <= rule.limit;
    report.remaining = rule.limit - report.glyphs;
    return report;
  }

  /** Every rule with a fits/over verdict — powers the "fits everywhere" grid. */
  function fitsAll(str) {
    return LIMITS.map((rule) => {
      const r = analyze(str, rule.id);
      return { rule, fits: r.fits, used: r.glyphs, limit: r.limit, remaining: r.remaining };
    });
  }

  /**
   * The fold — the second budget.
   *
   * A feed post has two numbers that matter, and the one everybody tracks is
   * the less important one. The hard limit decides whether the post SENDS;
   * the fold decides whether anyone READS it. LinkedIn will happily accept
   * 3,000 characters and then show ~140 of them on a phone behind "see more".
   * For anyone writing a hook, the fold IS the limit.
   *
   * Measured in graphemes, because this is about what the reader's screen
   * shows, not how the backend stores it. Returns null for destinations that
   * don't truncate (a username, an SMS, an X post that fits whole).
   *
   * Honest about its own precision: these are community-measured observations
   * of a UI, not published API limits, and platforms also fold on line COUNT
   * (a few early line breaks can cut a post short of any character number).
   * Treat as "what reliably shows", which is how the page frames it.
   */
  function foldInfo(str, limitId) {
    const rule = ruleById(limitId);
    if (!rule.visibleAt) return null;
    const s = str || "";
    const at = rule.visibleAt;
    const total = graphemes(s);
    return {
      rule: rule,
      at: at,
      desktop: rule.foldDesktop || null,
      /* Digits only — this string is dropped into each locale's own
         translated sentence, so it must carry no English. */
      label: rule.foldDesktop ? at + "–" + rule.foldDesktop : String(at),
      total: total,
      shown: Math.min(total, at),
      hidden: Math.max(0, total - at),
      remaining: at - total,
      truncated: total > at,
      preview: takeGraphemes(s, at),
      /* What the fold costs you on the far side of the cut. */
      hiddenText: total > at ? s.slice(takeGraphemes(s, at).length) : ""
    };
  }

  /** Every destination that folds, and whether this text survives its fold. */
  function foldsAll(str) {
    return LIMITS.filter((r) => r.visibleAt).map((r) => foldInfo(str, r.id));
  }

  /* ============================================================
     Checker UI — target first, two tiers (platform → field)
     ============================================================ */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function fmt(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  }

  function initChecker(config) {
    const cfg = config || {};
    const mount = document.getElementById(cfg.mount);
    if (!mount) return null;

    const text = cfg.text || {};
    const labels = cfg.labels || {};
    const fieldLabels = cfg.fields || {};
    const platformLabels = cfg.platforms || {};
    const start = cfg.selected && LIMITS.some((r) => r.id === cfg.selected) ? cfg.selected : LIMITS[0].id;
    const state = { limitId: start };

    mount.innerHTML = "";
    mount.classList.add("cc-checker");

    if (text.label) mount.appendChild(el("div", "cc-label", text.label));

    const row = el("div", "cc-selects");

    const platformSelect = document.createElement("select");
    platformSelect.className = "cc-select";
    platformSelect.setAttribute("aria-label", text.platformLabel || "Platform");
    PLATFORMS.forEach((p) => {
      if (!LIMITS.some((r) => r.platform === p.id)) return;
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = platformLabels[p.id] || p.label;
      platformSelect.appendChild(opt);
    });

    const fieldSelect = document.createElement("select");
    fieldSelect.className = "cc-select";
    fieldSelect.setAttribute("aria-label", text.fieldLabel || "Field");

    row.appendChild(platformSelect);
    row.appendChild(fieldSelect);
    mount.appendChild(row);

    const meta = el("div", "cc-meta");
    const badge = el("span", "cc-badge");
    const count = el("span", "cc-count");
    meta.appendChild(badge);
    meta.appendChild(count);
    mount.appendChild(meta);

    const bar = el("div", "cc-bar");
    const fill = el("div", "cc-bar-fill");
    /* A tick on the bar where the feed truncates. Without it the bar answers
       only "will this send", which on a 3,000-character field is a question
       nobody is asking. */
    const foldMark = el("span", "cc-bar-fold");
    foldMark.hidden = true;
    bar.appendChild(fill);
    bar.appendChild(foldMark);
    mount.appendChild(bar);

    const note = el("div", "cc-note");
    note.hidden = true;
    mount.appendChild(note);

    const input = cfg.inputId ? document.getElementById(cfg.inputId) : null;

    function fieldsFor(platformId) {
      return LIMITS.filter((r) => r.platform === platformId);
    }

    function paintFields(platformId, preferId) {
      fieldSelect.innerHTML = "";
      const fields = fieldsFor(platformId);
      fields.forEach((r) => {
        const opt = document.createElement("option");
        opt.value = r.id;
        const name = fieldLabels[r.id] || labels[r.id] || r.field;
        opt.textContent = name + " · " + r.limit.toLocaleString();
        fieldSelect.appendChild(opt);
      });
      const pick = fields.some((r) => r.id === preferId) ? preferId : (fields[0] && fields[0].id);
      if (pick) {
        fieldSelect.value = pick;
        state.limitId = pick;
      }
      fieldSelect.hidden = fields.length < 2;
    }

    function emitChange() {
      mount.dispatchEvent(new CustomEvent("utg:counterlimitchange", {
        bubbles: true,
        detail: { limitId: state.limitId, rule: ruleById(state.limitId) }
      }));
    }

    function render() {
      const value = input ? input.value : "";
      const report = analyze(value, state.limitId);
      const rule = report.rule;

      /* Three states, not two. "Fits" and "over the limit" leave out the one
         that matters most on a feed field: it will post, and almost nobody
         will read past the cut. That gets its own amber state rather than a
         green tick and a footnote. */
      const fold = foldInfo(value, state.limitId);
      const pastFold = !!(fold && fold.truncated && report.fits);
      const status = report.glyphs === 0 ? "empty" : !report.fits ? "fail" : pastFold ? "warn" : "ok";
      badge.className = "cc-badge cc-badge-" + status;
      badge.textContent = status === "empty" ? ""
        : status === "fail" ? (text.fail || "Over the limit ✕")
        : status === "warn" ? fmt(text.pastFold || "Fits — cut at {n} ⚠", { n: fold.at })
        : (text.ok || "Fits ✓");

      count.textContent = report.glyphs.toLocaleString() + " / " + report.limit.toLocaleString();
      count.classList.toggle("is-over", !report.fits);

      const pct = Math.min(100, (report.glyphs / report.limit) * 100);
      fill.style.width = pct + "%";
      fill.classList.toggle("is-over", !report.fits);
      fill.classList.toggle("is-past-fold", pastFold);
      fill.classList.toggle("is-close", report.fits && !pastFold && pct >= 90);

      if (fold && rule.limit) {
        foldMark.hidden = false;
        foldMark.style.left = Math.min(100, (fold.at / rule.limit) * 100) + "%";
        foldMark.title = fold.label;
      } else {
        foldMark.hidden = true;
      }

      const notes = [];
      if (report.mode === "x-weighted" && report.glyphs > 0) {
        notes.push(text.xNote || "Counted the way X counts: every URL = 23, and most symbols, emoji, and styled Unicode letters = 2 each.");
      }
      if (report.mode === "gsm" && report.sms && report.sms.segments > 0) {
        const sms = report.sms;
        let s = fmt(text.smsSegments || "{n} SMS segment(s) · {per} characters per segment ({enc})",
          { n: sms.segments, per: sms.perSegment, enc: sms.encoding });
        if (sms.encoding === "UCS-2" && sms.flipChars.length) {
          s += " — " + fmt(text.smsUnicode || "switched to Unicode mode by: {chars}", { chars: sms.flipChars.join(" ") });
        }
        notes.push(s);
      }
      if (rule.visibleAt && report.glyphs > rule.visibleAt) {
        /* `visibleAtLabel` is deliberately digits-only (e.g. "140–210") rather
           than prose: it is substituted into every locale's own translated
           visibleNote, so anything wordier would leak English onto 14
           translated pages. */
        notes.push(fmt(text.visibleNote || "Only about the first {n} characters show before it is truncated — put what matters first.",
          { n: foldInfo(value, state.limitId).label }));
      }
      note.textContent = notes.join(" ");
      note.hidden = notes.length === 0;
    }

    platformSelect.addEventListener("change", function () {
      paintFields(platformSelect.value);
      render();
      emitChange();
    });
    fieldSelect.addEventListener("change", function () {
      state.limitId = fieldSelect.value;
      render();
      emitChange();
    });
    if (input) input.addEventListener("input", render);

    const startRule = ruleById(state.limitId);
    platformSelect.value = startRule.platform;
    paintFields(startRule.platform, startRule.id);
    render();

    return {
      render,
      getLimitId: () => state.limitId,
      getRule: () => ruleById(state.limitId),
      setLimitId(id) {
        if (!LIMITS.some((r) => r.id === id)) return;
        const r = ruleById(id);
        platformSelect.value = r.platform;
        paintFields(r.platform, id);
        render();
        emitChange();
      },
      element: mount
    };
  }

  ns.counterCounts = {
    codePoints, utf16Units, utf8Bytes, graphemes, takeGraphemes, xWeightedLength, gsmInfo
  };
  ns.counterRules = {
    LIMITS, PLATFORMS, DEFAULT_GROUPS,
    analyze, measure, fitsAll, foldInfo, foldsAll, ruleById, initChecker
  };
})();
