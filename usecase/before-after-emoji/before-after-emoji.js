(() => {
  "use strict";

  // =========================================================================
  // DATA — Emoji pair arcs (12 total: 9 original + 3 new)
  // Each arc: id, label, signaturePair, useLabel, pairs [[start, end], ...]
  // =========================================================================
  const ARCS = [
    {
      id: "motivation-lift",
      label: "Motivation Lift",
      signaturePair: ["😴", "🔥"],
      useLabel: "energy boost",
      pairs: [
        ["😴","🔥"],["😴","🚀"],["😴","💥"],["😴","⚡"],["😴","💪"],
        ["😴","🏃"],["😴","✊"],["😴","🎯"],
        ["😮‍💨","🔥"],["😮‍💨","🚀"],["😮‍💨","⚡"],
        ["🥱","🔥"],["🥱","🚀"],["🥱","💥"],["🥱","⚡"],["😪","🔥"]
      ]
    },
    {
      id: "confidence-shift",
      label: "Confidence Shift",
      signaturePair: ["🤔", "💪"],
      useLabel: "self-belief",
      pairs: [
        ["🤔","💪"],["🤔","😌"],["🤔","👑"],["🤔","✅"],["🤔","💯"],
        ["🤔","🫡"],["🤔","🏆"],["🤔","😤"],
        ["😟","💪"],["😟","😌"],["😟","👑"],["😟","✅"],
        ["🫤","💪"],["🫤","👑"],["🫤","😌"],["🤷","💪"]
      ]
    },
    {
      id: "clarity-breakthrough",
      label: "Clarity Breakthrough",
      signaturePair: ["😵", "🎯"],
      useLabel: "insight",
      pairs: [
        ["😵","😌"],["😵","🎯"],["😵","🧠"],["😵","✨"],["😵","💡"],
        ["🤯","😌"],["🤯","🎯"],["🤯","🧠"],["🤯","✨"],
        ["😖","😌"],["😖","🎯"],["😖","🧠"],["😖","✨"],
        ["😵‍💫","😌"],["😵‍💫","🎯"],["😵‍💫","💡"]
      ]
    },
    {
      id: "glow-up",
      label: "Glow-up",
      signaturePair: ["🐛", "🦋"],
      useLabel: "appearance",
      pairs: [
        ["🐛","🦋"],["🐛","🌟"],["🐛","💅"],["🐛","✨"],
        ["😔","💅"],["😔","✨"],["😔","🌟"],["😔","👑"],
        ["💤","✨"],["💤","🌟"],["💤","💅"],
        ["😴","💅"],["😴","✨"],["😴","🌟"],
        ["🫠","💅"],["🫠","✨"]
      ]
    },
    {
      id: "time-era",
      label: "Time / Era",
      signaturePair: ["📅", "🌟"],
      useLabel: "then vs now",
      pairs: [
        ["📅","🌟"],["📅","🔥"],["📅","🚀"],["📅","💪"],["📅","✨"],
        ["🕰️","🌟"],["🕰️","🔥"],["🕰️","💪"],
        ["😴","⭐"],["😴","🌅"],["😴","🌟"],
        ["🌱","🌳"],["🌱","🌟"],["🌱","💪"],
        ["❄️","🌸"],["🌑","🌕"]
      ]
    },
    {
      id: "growth-reframe",
      label: "Growth Reframe",
      signaturePair: ["❌", "📈"],
      useLabel: "setback → win",
      pairs: [
        ["❌","📈"],["❌","🌱"],["❌","💡"],["❌","👑"],["❌","🔑"],
        ["❌","📖"],["❌","🦋"],["❌","💎"],
        ["👎","📈"],["👎","🌱"],["👎","💡"],["👎","👑"],
        ["🚫","📈"],["🚫","🌱"],["🚫","💡"],["💔","📈"]
      ]
    },
    {
      id: "courage-activation",
      label: "Courage Activation",
      signaturePair: ["😰", "🦁"],
      useLabel: "bold moves",
      pairs: [
        ["😰","🦁"],["😰","👑"],["😰","💪"],["😰","🔥"],["😰","⚔️"],["😰","🫡"],
        ["😨","🦁"],["😨","👑"],["😨","💪"],["😨","🔥"],
        ["😱","🦁"],["😱","👑"],["😱","💪"],
        ["🫣","🦁"],["🫣","👑"],["🫣","💪"]
      ]
    },
    {
      id: "relief-release",
      label: "Relief Release",
      signaturePair: ["😓", "😮‍💨"],
      useLabel: "letting go",
      pairs: [
        ["😓","😮‍💨"],["😓","😌"],["😓","🕊️"],["😓","☺️"],["😓","🙏"],["😓","💆"],
        ["😰","😮‍💨"],["😰","😌"],["😰","🕊️"],["😰","☺️"],
        ["😤","😮‍💨"],["😤","😌"],["😤","🕊️"],
        ["😩","😮‍💨"],["😩","😌"],["😫","😌"]
      ]
    },
    {
      id: "funny-fail",
      label: "Funny / Fail",
      signaturePair: ["💀", "😂"],
      useLabel: "relatable fail",
      pairs: [
        ["💀","😂"],["💀","😅"],["💀","🤣"],["💀","😬"],
        ["🤡","😂"],["🤡","😅"],["🤡","🤣"],["🤡","🫠"],
        ["😭","😂"],["😭","😅"],["😭","🤣"],
        ["😵","😂"],["😵","😅"],["😵","🤣"],
        ["🫠","😂"],["🫠","🤣"]
      ]
    },
    {
      id: "acceptance-turn",
      label: "Acceptance Turn",
      signaturePair: ["🙄", "👍"],
      useLabel: "coming around",
      pairs: [
        ["🙄","👍"],["🙄","💯"],["🙄","🤝"],["🙄","😌"],["🙄","✅"],["🙄","🫡"],
        ["😑","👍"],["😑","💯"],["😑","🤝"],["😑","😌"],["😑","✅"],
        ["😒","👍"],["😒","💯"],["😒","🤝"],
        ["🤨","👍"],["🤨","🤝"]
      ]
    },
    {
      id: "cool-defiance",
      label: "Cool Defiance",
      signaturePair: ["🙃", "😎"],
      useLabel: "witty refusal",
      pairs: [
        ["🙃","😎"],["🙃","😌"],["🙃","✨"],["🙃","💅"],["🙃","🤷"],["🙃","🫠"],
        ["😏","😎"],["😏","😌"],["😏","✨"],["😏","💅"],
        ["🤪","😎"],["🤪","😌"],["🤪","✨"],
        ["😜","😎"],["😜","😌"],["😝","😎"]
      ]
    },
    {
      id: "understanding-moment",
      label: "Understanding Moment",
      signaturePair: ["❓", "💡"],
      useLabel: "lightbulb",
      pairs: [
        ["❓","💡"],["❓","🧠"],["❓","📘"],["❓","✅"],["❓","🎯"],["❓","🔓"],
        ["🤔","💡"],["🤔","🧠"],["🤔","📘"],["🤔","🎯"],
        ["😕","💡"],["😕","🧠"],["😕","📘"],
        ["🧐","💡"],["🧐","🧠"],["🧐","📘"]
      ]
    }
  ];

  // =========================================================================
  // DATA — Library cards (8 use-case categories)
  // =========================================================================
  const LIBRARY_USES = [
    {
      id: "fitness",
      label: "🏃 Fitness",
      cards: [
        { message: "from couch to 5K", start: "😴", end: "💪", arc: "motivation-lift" },
        { message: "skipped a month, then hit a new PB", start: "😰", end: "🏆", arc: "courage-activation" },
        { message: "rest days are part of the plan", start: "😓", end: "😌", arc: "relief-release" },
        { message: "one workout at a time", start: "🤔", end: "🔥", arc: "confidence-shift" }
      ]
    },
    {
      id: "glow-up",
      label: "✨ Glow-up",
      cards: [
        { message: "glow-up still loading", start: "🐛", end: "🦋", arc: "glow-up" },
        { message: "started the skincare routine", start: "😔", end: "💅", arc: "glow-up" },
        { message: "hair, skin, mindset — all upgraded", start: "💤", end: "✨", arc: "glow-up" },
        { message: "transformation Tuesday, every week", start: "🐛", end: "🌟", arc: "glow-up" }
      ]
    },
    {
      id: "career",
      label: "💼 Career",
      cards: [
        { message: "from rejected to promoted in 12 months", start: "❌", end: "📈", arc: "growth-reframe" },
        { message: "bet on myself and it paid off", start: "😰", end: "🦁", arc: "courage-activation" },
        { message: "the pivot nobody saw coming", start: "🤔", end: "💡", arc: "understanding-moment" },
        { message: "LinkedIn update incoming", start: "😓", end: "🎯", arc: "clarity-breakthrough" }
      ]
    },
    {
      id: "study",
      label: "📚 Study",
      cards: [
        { message: "all-nighter to first class honours", start: "😴", end: "🏆", arc: "motivation-lift" },
        { message: "confused until it finally clicked", start: "😵", end: "💡", arc: "clarity-breakthrough" },
        { message: "failed the exam, passed the lesson", start: "❌", end: "📈", arc: "growth-reframe" },
        { message: "exam season → study mode activated", start: "🥱", end: "🎯", arc: "motivation-lift" }
      ]
    },
    {
      id: "mindset",
      label: "🧠 Mindset",
      cards: [
        { message: "stopped seeking approval", start: "🤔", end: "👑", arc: "confidence-shift" },
        { message: "progress over perfection", start: "🌱", end: "📈", arc: "time-era" },
        { message: "chose peace", start: "😤", end: "😮‍💨", arc: "relief-release" },
        { message: "the version of me I chose to become", start: "📅", end: "🌟", arc: "time-era" }
      ]
    },
    {
      id: "relationship",
      label: "💛 Relationship",
      cards: [
        { message: "healed and no longer available for chaos", start: "💔", end: "🌱", arc: "growth-reframe" },
        { message: "chose my peace over the drama", start: "😤", end: "🕊️", arc: "relief-release" },
        { message: "finally found my people", start: "😔", end: "✨", arc: "glow-up" },
        { message: "the relationship I built with myself first", start: "🌱", end: "💅", arc: "glow-up" }
      ]
    },
    {
      id: "time-era",
      label: "🗓️ Time / Era",
      cards: [
        { message: "2020 → 2026 — the arc they don't talk about", start: "📅", end: "🔥", arc: "time-era" },
        { message: "New Year, different energy", start: "🕰️", end: "🌟", arc: "time-era" },
        { message: "same person, different chapter", start: "📅", end: "✨", arc: "time-era" },
        { message: "TransformationTuesday is every day now", start: "🌱", end: "🌳", arc: "time-era" }
      ]
    },
    {
      id: "funny",
      label: "😂 Funny",
      cards: [
        { message: "glow-up still buffering", start: "🤡", end: "😂", arc: "funny-fail" },
        { message: "from chaos to organised chaos", start: "💀", end: "😅", arc: "funny-fail" },
        { message: "accidentally became an adult", start: "🫠", end: "😂", arc: "funny-fail" },
        { message: "peak productivity: made a to-do list", start: "😭", end: "😅", arc: "funny-fail" }
      ]
    }
  ];

  // =========================================================================
  // STATE
  // =========================================================================
  let isInline = true;
  let currentMode = "library"; // "library" | "build"
  let currentUseCase = "fitness";
  let platformTone = "bold"; // "bold" | "restrained"
  let currentArcId = "motivation-lift";

  // =========================================================================
  // MOOD → FONT SLUG MAP (same as original)
  // =========================================================================
  const MOOD_MAP = {
    all: [
      "ultra-bold","ultra-bold-italic","ultra-bold-serif",
      "ultra-strike","ultra-underline",
      "ultra-script","ultra-script-bold","ultra-italic","ultra-italic-serif",
      "ultra-bubble","ultra-bubble-filled","ultra-squared","ultra-squared-filled",
      "ultra-gothic","ultra-gothic-bold",
      "ultra-double-struck","ultra-monospace","ultra-small-caps"
    ],
    emphasis: ["ultra-bold","ultra-bold-italic","ultra-bold-serif"],
    sarcasm: ["ultra-strike","ultra-underline"],
    warmth: ["ultra-script","ultra-script-bold","ultra-italic","ultra-italic-serif"],
    playful: ["ultra-bubble","ultra-bubble-filled","ultra-squared","ultra-squared-filled"],
    edgy: ["ultra-gothic","ultra-gothic-bold"],
    clean: ["ultra-double-struck","ultra-monospace","ultra-small-caps"]
  };

  // =========================================================================
  // BUILD UTG_DECORATIONS from current arc + output mode
  // =========================================================================
  function buildDecorations(inline) {
    const result = {};
    ARCS.forEach(arc => {
      result[arc.id] = arc.pairs.map(([start, end]) => ({
        text: `${start} → ${end}`,
        prefix: inline ? `${start} ` : `${start}\n`,
        suffix: inline ? ` ${end}` : `\n${end}`
      }));
    });
    return result;
  }

  function applyDecorations() {
    window.UTG_DECORATIONS = buildDecorations(isInline);
    window.UTG_DEFAULT_DECO_TAB = currentArcId;
  }

  // Set initial state
  applyDecorations();
  window.UTG_FONT_SLUGS = MOOD_MAP.all;

  // =========================================================================
  // HELPERS
  // =========================================================================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function triggerRerender() {
    const input = $("#mainInput");
    if (input) input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function buildInlineString(start, end, message) {
    return `${start} ${message} ${end}`;
  }

  function buildStackedString(start, end, message) {
    return `${start}\n${message}\n${end}`;
  }

  function buildOutputString(start, end, message) {
    return isInline ? buildInlineString(start, end, message) : buildStackedString(start, end, message);
  }

  // =========================================================================
  // COPY UTILITY
  // =========================================================================
  function copyText(text, btn) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const original = btn.textContent;
      btn.textContent = "Copied ✓";
      btn.classList.add("etg-copied");
      const liveRegion = $("#etgCopyAnnounce");
      if (liveRegion) liveRegion.textContent = "Copied";
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("etg-copied");
        if (liveRegion) liveRegion.textContent = "";
      }, 1500);
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
  }

  // =========================================================================
  // RENDER LIBRARY CARDS
  // =========================================================================
  function renderLibraryCards() {
    const grid = $("#etgLibraryGrid");
    if (!grid) return;

    const useCase = LIBRARY_USES.find(u => u.id === currentUseCase);
    if (!useCase) return;

    // Filter by platform tone
    let cards = useCase.cards;
    if (platformTone === "restrained") {
      // Prefer professional emojis, soft-filter (show all but re-rank)
      const professionalEnds = new Set(["💡","📈","🎯","✅","🧠","🌱","😌","💆","😮‍💨","🏆","🔑","📘"]);
      const professional = cards.filter(c => professionalEnds.has(c.end));
      const casual = cards.filter(c => !professionalEnds.has(c.end));
      cards = [...professional, ...casual];
    }

    grid.innerHTML = cards.map(card => {
      const output = buildOutputString(card.start, card.end, card.message);
      const previewText = buildInlineString(card.start, card.end, card.message);
      const arcLabel = ARCS.find(a => a.id === card.arc)?.label || "";
      return `
        <div class="etg-library-card" role="article">
          <p class="etg-library-preview" aria-label="Preview: ${previewText}">${previewText}</p>
          <p class="etg-library-arc-tag">${arcLabel}</p>
          <div class="etg-library-card-actions">
            <button class="copy-btn etg-copy-btn" type="button"
              data-copy-text="${encodeURIComponent(output)}"
              aria-label="Copy: ${previewText}">Copy</button>
            <button class="etg-customize-btn" type="button"
              data-message="${encodeURIComponent(card.message)}"
              data-arc="${card.arc}"
              aria-label="Customize this transformation">Customize →</button>
          </div>
        </div>`;
    }).join("");

    // Bind copy buttons
    $$(".etg-copy-btn", grid).forEach(btn => {
      btn.addEventListener("click", () => {
        const text = decodeURIComponent(btn.dataset.copyText || "");
        copyText(text, btn);
      });
    });

    // Bind customize buttons — load into Build-your-own
    $$(".etg-customize-btn", grid).forEach(btn => {
      btn.addEventListener("click", () => {
        const message = decodeURIComponent(btn.dataset.message || "");
        const arc = btn.dataset.arc;
        loadIntoBuild(message, arc);
      });
    });
  }

  // =========================================================================
  // LOAD INTO BUILD-YOUR-OWN
  // =========================================================================
  function loadIntoBuild(message, arcId) {
    // Update textarea
    const input = $("#mainInput");
    if (input) {
      input.value = message;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    // Select the arc
    selectArc(arcId, false);
    // Switch to build mode
    switchMode("build");
  }

  // =========================================================================
  // MODE SWITCHING
  // =========================================================================
  function switchMode(mode) {
    currentMode = mode;

    $$(".etg-mode-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
      btn.setAttribute("aria-selected", btn.dataset.mode === mode ? "true" : "false");
    });

    $$("[data-mode-panel]").forEach(panel => {
      const isActive = panel.dataset.modePanel === mode;
      panel.hidden = !isActive;
    });

    // Show/hide inline/stacked toggle (only in build mode)
    const outputToggle = $("#etgOutputToggle");
    if (outputToggle) {
      outputToggle.hidden = mode !== "build";
    }

    if (mode === "build") {
      triggerRerender();
    }
  }

  // =========================================================================
  // ARC SELECTION (transformation card)
  // =========================================================================
  function selectArc(arcId, rerender = true) {
    currentArcId = arcId;
    window.UTG_DEFAULT_DECO_TAB = arcId;

    // Update visual state of transformation cards
    $$(".etg-transformation-card").forEach(card => {
      const isSelected = card.dataset.arcId === arcId;
      card.classList.toggle("selected", isSelected);
      card.setAttribute("aria-selected", isSelected ? "true" : "false");
    });

    // Trigger script.js decoration tab click
    const decoTab = $(`.decoration-tab[data-deco-tab="${arcId}"]`);
    if (decoTab) decoTab.click();

    if (rerender) triggerRerender();
  }

  // =========================================================================
  // RENDER TRANSFORMATION CARDS (Step 1 in Build-your-own)
  // =========================================================================
  function renderTransformationCards() {
    const container = $("#etgTransformationCards");
    if (!container) return;

    container.innerHTML = ARCS.map(arc => {
      const [s, e] = arc.signaturePair;
      const isSelected = arc.id === currentArcId;
      return `
        <button class="etg-transformation-card${isSelected ? " selected" : ""}"
          type="button"
          data-arc-id="${arc.id}"
          role="radio"
          aria-selected="${isSelected}"
          aria-label="${arc.label}: ${s} to ${e}, for ${arc.useLabel}">
          <span class="etg-card-pair">${s} → ${e}</span>
          <span class="etg-card-label">${arc.label}</span>
          <span class="etg-card-use">${arc.useLabel}</span>
        </button>`;
    }).join("");

    $$(".etg-transformation-card", container).forEach(card => {
      card.addEventListener("click", () => selectArc(card.dataset.arcId));
    });
  }

  // =========================================================================
  // USE-CASE CHIP SELECTION
  // =========================================================================
  function selectUseCase(id) {
    currentUseCase = id;
    $$(".etg-usecase-chip").forEach(chip => {
      chip.classList.toggle("active", chip.dataset.usecase === id);
      chip.setAttribute("aria-selected", chip.dataset.usecase === id ? "true" : "false");
    });
    renderLibraryCards();
  }

  // =========================================================================
  // PLATFORM TONE TOGGLE
  // =========================================================================
  function setPlatformTone(tone) {
    platformTone = tone;
    $$(".etg-tone-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tone === tone);
    });
    renderLibraryCards();
  }

  // =========================================================================
  // INLINE / STACKED TOGGLE
  // =========================================================================
  function setOutputMode(mode) {
    isInline = mode === "inline";
    $$(".etg-toggle-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.output === mode);
    });
    applyDecorations();
    // Re-init the decoration tabs via script.js
    const decoTab = $(`.decoration-tab[data-deco-tab="${currentArcId}"]`);
    if (decoTab) decoTab.click();
    triggerRerender();
  }

  // =========================================================================
  // KEYBOARD NAVIGATION for card groups
  // =========================================================================
  function handleRovingTabindex(container, selector, event) {
    const items = $$(selector, container);
    const currentIndex = items.findIndex(el => el === document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % items.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    } else {
      return;
    }
    event.preventDefault();
    items[nextIndex].focus();
  }

  // =========================================================================
  // CHAR COUNT
  // =========================================================================
  function updateCharCount() {
    const input = $("#mainInput");
    const display = $("#charCount");
    if (input && display) {
      display.textContent = input.value.length;
    }
  }

  // =========================================================================
  // INIT — runs after DOM is parsed (deferred script)
  // =========================================================================
  function init() {
    // Pre-fill textarea
    const input = $("#mainInput");
    if (input && !input.value) {
      input.value = "from couch to 5K";
      updateCharCount();
    }

    // Char count listener
    if (input) {
      input.addEventListener("input", updateCharCount);
    }

    // Mode toggle
    $$(".etg-mode-btn").forEach(btn => {
      btn.addEventListener("click", () => switchMode(btn.dataset.mode));
    });

    // Inline/stacked toggle
    $$(".etg-toggle-btn").forEach(btn => {
      btn.addEventListener("click", () => setOutputMode(btn.dataset.output));
    });

    // Use-case chips
    $$(".etg-usecase-chip").forEach(chip => {
      chip.addEventListener("click", () => selectUseCase(chip.dataset.usecase));
    });

    // Platform tone buttons
    $$(".etg-tone-btn").forEach(btn => {
      btn.addEventListener("click", () => setPlatformTone(btn.dataset.tone));
    });

    // Render transformation cards (Step 1)
    renderTransformationCards();

    // Keyboard nav for transformation cards
    const cardsContainer = $("#etgTransformationCards");
    if (cardsContainer) {
      cardsContainer.addEventListener("keydown", e =>
        handleRovingTabindex(cardsContainer, ".etg-transformation-card", e)
      );
    }

    // Render initial library cards
    renderLibraryCards();

    // Initial mode state — library is default
    switchMode("library");

    // Mood tabs for Step 2 text style
    $$("[data-style-mood]").forEach(tab => {
      tab.addEventListener("click", () => {
        $$("[data-style-mood]").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const mood = tab.dataset.styleMood;
        window.UTG_FONT_SLUGS = MOOD_MAP[mood] || MOOD_MAP.all;
        triggerRerender();
      });
    });
  }

  // DOM is ready when deferred script runs
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose for testing / debugging
  window.ETG = { selectArc, loadIntoBuild, setOutputMode, switchMode, ARCS, LIBRARY_USES };
})();
