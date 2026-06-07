(function () {
  "use strict";

  const CONTEXTS = {
    "channel-name": {
      limit: 50,
      guidance: "Default destination. Channel names support Unicode text styles and are the best place to use fancy fonts.",
      placeholder: "Your Channel Name",
      mode: "normal"
    },
    "description": {
      limit: 5000,
      guidance: "Descriptions support Unicode, but keep your primary keywords in plain text so YouTube can parse them clearly.",
      placeholder: "Weekly uploads about tech and productivity.",
      mode: "normal"
    },
    "video-title": {
      limit: 100,
      guidance: "YouTube strips styled Unicode from titles. You can copy styles here, but keep your real title plain text.",
      placeholder: "How I Grew to 100K Subscribers",
      mode: "title"
    },
    comment: {
      limit: 10000,
      guidance: "Comments support Unicode styles. For comment-specific examples and layouts, use the dedicated comment tool.",
      placeholder: "This edit is fire 🔥",
      mode: "normal",
      routeHtml: 'Comment-specific examples: <a href="/usecase/comment-font/">Comment Font Generator</a>.'
    },
    bio: {
      limit: 1000,
      guidance: "About text supports Unicode styles. Keep the first line readable and concise for profile clarity.",
      placeholder: "Creator · tutorials · weekly videos",
      mode: "normal",
      routeHtml: 'Bio-focused layouts: <a href="/usecase/bio-font/">Bio Font Generator</a>.'
    },
    handle: {
      limit: 30,
      guidance: "YouTube handles only allow letters, numbers, underscores, hyphens, and periods.",
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

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getInputText() {
    if (!el.input) return "";
    return el.input.value || "";
  }

  function updateCounter() {
    if (!el.input || !el.charCount || !el.charLimit) return;
    const ctx = CONTEXTS[currentContext];
    const len = el.input.value.length;
    const warnAt = Math.floor(ctx.limit * 0.9);

    el.charCount.textContent = String(len);
    el.charLimit.textContent = String(ctx.limit);
    el.charWrap.classList.toggle("char-warning", len >= warnAt);

    if (len >= warnAt && len < ctx.limit && !thresholdAnnounced && el.counterAnnounce) {
      el.counterAnnounce.textContent = "Approaching limit.";
      thresholdAnnounced = true;
    }
    if (len < warnAt) {
      thresholdAnnounced = false;
      if (el.counterAnnounce) el.counterAnnounce.textContent = "";
    }
  }

  function renderGuidance() {
    if (!el.guidance) return;
    const ctx = CONTEXTS[currentContext];
    el.guidance.innerHTML = ctx.guidance + ' <span class="limit-pill">' + ctx.limit + '-character limit</span>';
  }

  function renderPanel() {
    if (!el.panel) return;
    const ctx = CONTEXTS[currentContext];
    const raw = getInputText();
    const text = escapeHtml(raw || ctx.placeholder);

    el.panel.classList.add("is-fading");
    setTimeout(function () {
      if (ctx.mode === "handle") {
        el.panel.innerHTML = '<div class="youtube-handle-explainer"><strong>YouTube handles only allow letters, numbers, <code>_ - .</code> — fancy fonts won\'t save.</strong> Style your <strong>channel name</strong> instead, or get handle ideas in <a href="/youtube/name-generator/">YouTube Name Generator</a>.</div>';
      } else {
        const label = currentContext === "video-title" ? "Preview · Video title context" : "Preview · YouTube " + currentContext.replace("-", " ");
        el.panel.innerHTML = '<div class="youtube-context-preview"><div class="preview-label">' + label + '</div><div class="preview-line">' + text + "</div></div>";
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
        '<div class="style-card"><div class="style-info"><p class="style-preview placeholder">YouTube handles are ASCII only. Styled results are disabled for @Handle. Use channel-name styles instead or try <a href="/youtube/name-generator/">YouTube Name Generator</a>.</p></div></div>';
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
        badge.textContent = "Plain text: YouTube strips title styling";
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
      const name = btn.closest(".style-card")?.querySelector(".style-name")?.childNodes?.[0]?.textContent?.trim() || "style";
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
