(function () {
  "use strict";

  /* Destination switcher for the YouTube hub.

     Each context carries the field's real limit and an honest verdict about
     styled Unicode there. Sources: handle rules and the 3-30 length are
     Google's own (support.google.com/youtube/answer/11585688); the rename
     throttle is answer/2657964. The channel-name 50 is the observed client
     limit, not a documented one — same caveat as RULES.youtube in
     js/gamename/game-rules.js, which is the single maintenance point for
     these numbers on checker surfaces.

     status: "safe" | "caution" | "blocked" — drives the guidance badge.
     Video titles are "caution", not "blocked": Unicode letters DO save in
     titles; the cost is search matching and screen readers, so the advice
     is keep keyword words plain, decorate around them. */
  const CONTEXTS = {
    "channel-name": {
      limit: 50,
      status: "safe",
      guidance: "Default destination. Channel names accept Unicode styles, symbols, and emoji. Keep it readable — names spelled entirely in lookalike symbols can be rejected as impersonation.",
      placeholder: "Your Channel Name",
      mode: "normal"
    },
    "description": {
      limit: 5000,
      status: "safe",
      guidance: "Video descriptions accept Unicode, but keep your primary keywords in plain text so search can parse them clearly.",
      placeholder: "Weekly uploads about tech and productivity.",
      mode: "normal"
    },
    "video-title": {
      limit: 100,
      status: "caution",
      guidance: "Titles do save Unicode styles, but search doesn't read a styled word as its plain spelling. Keep keyword words plain and decorate around them.",
      placeholder: "How I Grew to 100K Subscribers",
      mode: "title"
    },
    comment: {
      limit: 10000,
      status: "safe",
      guidance: "Comments accept Unicode styles, and YouTube also has native formatting: *bold*, _italic_, -strikethrough-. For comment-specific examples, use the dedicated comment tool.",
      placeholder: "This edit is fire 🔥",
      mode: "normal",
      routeHtml: 'Comment-specific examples: <a href="/usecase/comment-font/">Comment Font Generator</a>.'
    },
    bio: {
      limit: 1000,
      status: "safe",
      guidance: "About text accepts Unicode styles. Keep the first line readable and concise for profile clarity.",
      placeholder: "Creator · tutorials · weekly videos",
      mode: "normal",
      routeHtml: 'Bio-focused layouts: <a href="/usecase/bio-font/">Bio Font Generator</a>.'
    },
    handle: {
      limit: 30,
      status: "blocked",
      guidance: "Handles allow letters and numbers plus . _ - (never at the start or end), 3–30 characters, no fancy fonts, no emoji, no spaces. Style your channel name instead.",
      placeholder: "yourhandle",
      mode: "handle"
    }
  };

  let currentContext = "channel-name";
  let thresholdAnnounced = false;

  const el = {
    input: document.getElementById("mainInput"),
    tabs: document.getElementById("youtubeContextTabs"),
    guidance: document.getElementById("youtubeContextGuidance"),
    panel: document.getElementById("youtubeContextPanel"),
    route: document.getElementById("youtubeContextRoute"),
    charCount: document.getElementById("charCount"),
    charLimit: document.getElementById("charLimit"),
    charWrap: document.getElementById("charCountWrapper"),
    counterAnnounce: document.getElementById("youtubeCounterAnnounce"),
    copyAnnounce: document.getElementById("youtubeCopyAnnounce"),
    results: document.getElementById("resultsGrid")
  };

  // Visible characters, not UTF-16 units — a bold 10-letter name is 10
  // graphemes but 20 code units. We count graphemes for the main readout
  // (that's what a person sees) and surface the code-unit figure separately
  // when the two differ, because nobody documents which one YouTube's
  // fields meter and pretending to know would be worse than saying both.
  const graphemeSeg =
    typeof Intl !== "undefined" && Intl.Segmenter
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;
  function graphemeCount(str) {
    if (!str) return 0;
    if (!graphemeSeg) return Array.from(str).length;
    let n = 0;
    for (const s of graphemeSeg.segment(str)) { void s; n++; }
    return n;
  }

  function getInputText() {
    if (!el.input) return "";
    return el.input.value || "";
  }

  function updateCounter() {
    if (!el.input || !el.charCount || !el.charLimit) return;
    const ctx = CONTEXTS[currentContext];
    const raw = el.input.value;
    const visible = graphemeCount(raw);
    const units = raw.length;
    const warnAt = Math.floor(ctx.limit * 0.9);

    el.charCount.textContent = units > visible ? visible + " (" + units + " units)" : String(visible);
    el.charLimit.textContent = String(ctx.limit);
    el.charWrap.classList.toggle("char-warning", units >= warnAt);

    if (units >= warnAt && units < ctx.limit && !thresholdAnnounced && el.counterAnnounce) {
      el.counterAnnounce.textContent = "Approaching limit.";
      thresholdAnnounced = true;
    }
    if (units < warnAt) {
      thresholdAnnounced = false;
      if (el.counterAnnounce) el.counterAnnounce.textContent = "";
    }
  }

  function renderGuidance() {
    if (!el.guidance) return;
    const ctx = CONTEXTS[currentContext];
    el.guidance.textContent = "";
    const badge = document.createElement("span");
    badge.className = "youtube-status-pill youtube-status-" + ctx.status;
    badge.textContent =
      ctx.status === "safe" ? "Fancy text: works here" :
      ctx.status === "caution" ? "Fancy text: use with care" :
      "Fancy text: rejected here";
    el.guidance.appendChild(badge);
    el.guidance.appendChild(document.createTextNode(" " + ctx.guidance + " "));
    const pill = document.createElement("span");
    pill.className = "limit-pill";
    pill.textContent = ctx.limit + "-character limit";
    el.guidance.appendChild(pill);
  }

  function renderPanel() {
    if (!el.panel) return;
    const ctx = CONTEXTS[currentContext];
    const raw = getInputText();
    const text = raw || ctx.placeholder;

    el.panel.classList.add("is-fading");
    setTimeout(function () {
      el.panel.textContent = "";
      if (ctx.mode === "handle") {
        const wrap = document.createElement("div");
        wrap.className = "youtube-handle-explainer";
        const strong = document.createElement("strong");
        strong.textContent = "YouTube handles only allow letters and numbers plus . _ - — fancy fonts won't save.";
        wrap.appendChild(strong);
        wrap.appendChild(document.createTextNode(" Style your "));
        const channelStrong = document.createElement("strong");
        channelStrong.textContent = "channel name";
        wrap.appendChild(channelStrong);
        wrap.appendChild(document.createTextNode(" instead, or get handle ideas in "));
        const link = document.createElement("a");
        link.href = "/youtube/name-generator/";
        link.textContent = "YouTube Name Generator";
        wrap.appendChild(link);
        wrap.appendChild(document.createTextNode("."));
        el.panel.appendChild(wrap);
      } else {
        const label = currentContext === "video-title" ? "Preview · Video title context" : "Preview · YouTube " + currentContext.replace("-", " ");
        const preview = document.createElement("div");
        preview.className = "youtube-context-preview";
        const previewLabel = document.createElement("div");
        previewLabel.className = "preview-label";
        previewLabel.textContent = label;
        const previewLine = document.createElement("div");
        previewLine.className = "preview-line";
        previewLine.textContent = text;
        preview.appendChild(previewLabel);
        preview.appendChild(previewLine);
        el.panel.appendChild(preview);
      }
      el.panel.classList.remove("is-fading");
    }, 25);

    if (!el.route) return;
    if (ctx.routeHtml) {
      el.route.innerHTML = ctx.routeHtml;
      el.route.classList.add("show");
    } else {
      el.route.classList.remove("show");
      el.route.innerHTML = "";
    }
  }

  function applyResultState() {
    if (!el.results) return;
    const ctx = CONTEXTS[currentContext];

    if (ctx.mode === "handle") {
      el.results.innerHTML =
        '<div class="style-card"><div class="style-info"><p class="style-preview placeholder">YouTube handles only accept plain letters, numbers, and . _ - so styled results are disabled for @Handle. Use channel-name styles instead or try <a href="/youtube/name-generator/">YouTube Name Generator</a>.</p></div></div>';
      return;
    }

    const cards = el.results.querySelectorAll(".style-card");
    cards.forEach(function (card) {
      const name = card.querySelector(".style-name");
      if (!name) return;
      const existing = name.querySelector(".youtube-result-warning");
      if (existing) existing.remove();

      if (ctx.mode === "title") {
        const badge = document.createElement("span");
        badge.className = "youtube-result-warning";
        badge.textContent = "Keep keyword words plain for search";
        name.appendChild(badge);
      }
    });
  }

  function rerenderGeneratorResults() {
    if (typeof window.UTG_RENDER_RESULTS === "function" && CONTEXTS[currentContext].mode !== "handle") {
      window.UTG_RENDER_RESULTS();
    }
    applyResultState();
  }

  function setContext(contextKey) {
    if (!CONTEXTS[contextKey] || !el.input) return;
    currentContext = contextKey;
    thresholdAnnounced = false;

    const ctx = CONTEXTS[contextKey];
    el.input.maxLength = ctx.limit;

    if (el.tabs) {
      const tabs = el.tabs.querySelectorAll(".youtube-context-tab");
      tabs.forEach(function (tab) {
        const active = tab.dataset.context === contextKey;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
      });
    }

    renderGuidance();
    renderPanel();
    updateCounter();
    rerenderGeneratorResults();
  }

  function bindEvents() {
    if (!el.input || !el.tabs) return;

    el.tabs.addEventListener("click", function (event) {
      const tab = event.target.closest(".youtube-context-tab");
      if (!tab || !tab.dataset.context) return;
      setContext(tab.dataset.context);
    });

    el.input.addEventListener("input", function () {
      renderPanel();
      updateCounter();
      rerenderGeneratorResults();
    });

    document.addEventListener("click", function (event) {
      const btn = event.target.closest ? event.target.closest(".copy-btn") : null;
      if (!btn || !el.copyAnnounce) return;
      let name = "style";
      const card = btn.closest(".style-card");
      if (card) {
        const nameEl = card.querySelector(".style-name");
        if (nameEl) {
          const cleanName = nameEl.cloneNode(true);
          const badge = cleanName.querySelector(".youtube-result-warning");
          if (badge) badge.remove();
          const trimmed = cleanName.textContent.trim();
          if (trimmed) name = trimmed;
        }
      }
      setTimeout(function () {
        el.copyAnnounce.textContent = "Copied " + name + " to clipboard.";
      }, 120);
    }, true);

    const observer = new MutationObserver(function () {
      applyResultState();
    });

    if (el.results) {
      observer.observe(el.results, { childList: true, subtree: true });
    }
  }

  function init() {
    if (!el.input || !el.tabs) return;
    bindEvents();
    setContext("channel-name");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
