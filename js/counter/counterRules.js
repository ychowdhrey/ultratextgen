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

   Data:  UltraTextGen.counterRules.LIMITS
   Logic: UltraTextGen.counterRules.analyze(str, limitId)
   UI:    UltraTextGen.counterRules.initChecker(config)
   ========================================================== */
(function () {
  "use strict";

  const ns = (window.UltraTextGen = window.UltraTextGen || {});

  /* ============================
     Rule table — verified against each platform's current published
     limit (see docs referenced in the character-counter page FAQ).
     Character counting uses Array.from() (Unicode code points), matching
     game-rules.js, so emoji/accents count as platforms actually see them.

     `group` is a stable key, not display text — DEFAULT_GROUPS below holds
     the English display string, and a page's initChecker() config can pass
     `groups`/`labels` overrides so one rule table drives every locale
     (same reasoning as game-rules.js's config.text: numbers live once,
     translated strings are supplied per page).
     ============================ */
  const LIMITS = [
    { id: "x-post", label: "X / Twitter post", limit: 280, group: "posts" },
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
    { id: "sms", label: "SMS (1 segment)", limit: 160, group: "titles" }
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
    const glyphs = Array.from(str || "").length;
    const fits = glyphs <= rule.limit;
    return {
      rule: rule,
      glyphs: glyphs,
      limit: rule.limit,
      fits: fits,
      remaining: rule.limit - glyphs
    };
  }

  /* ============================
     Checker UI
     config = {
       mount:   element id to render into
       inputId: main counter textarea to mirror live
       selected: optional starting limit id (defaults to LIMITS[0])
       text:    { label, ok, fail }
       labels:  optional { limitId: translatedLabel } — falls back to the
                English LIMITS[].label so a locale only needs to translate
                the platforms it wants to relabel (platform proper nouns
                like "Instagram" usually stay as-is).
       groups:  optional { groupKey: translatedGroupName } — falls back to
                DEFAULT_GROUPS.
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

    const input = cfg.inputId ? document.getElementById(cfg.inputId) : null;

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
    }

    select.addEventListener("change", function () {
      state.limitId = select.value;
      render();
    });
    if (input) input.addEventListener("input", render);

    render();
    return { render: render };
  }

  ns.counterRules = { LIMITS: LIMITS, analyze: analyze, initChecker: initChecker };
})();
