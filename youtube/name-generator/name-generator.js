(function () {
  "use strict";

  const vibeBanks = {
    aesthetic: { prefix: ["luna", "velvet", "nova", "aura", "dream", "glow"], suffix: ["studio", "diary", "verse", "world", "collective", "tv"] },
    cute: { prefix: ["peach", "bunny", "honey", "chibi", "cookie", "sunny"], suffix: ["corner", "club", "world", "hq", "spark", "vibes"] },
    cool: { prefix: ["echo", "blitz", "onyx", "apex", "vibe", "zen"], suffix: ["lab", "zone", "collective", "media", "works", "hq"] },
    gaming: { prefix: ["pixel", "frag", "loot", "spawn", "combo", "quest"], suffix: ["squad", "arena", "hub", "plays", "gg", "vault"] },
    vlog: { prefix: ["daily", "city", "weekend", "studio", "story", "lifestyle"], suffix: ["journal", "vlog", "diary", "files", "live", "moments"] },
    tech: { prefix: ["byte", "stack", "chip", "build", "code", "future"], suffix: ["lab", "insider", "review", "daily", "scope", "network"] },
    faceless: { prefix: ["shadow", "unknown", "masked", "silent", "hidden", "anon"], suffix: ["stories", "archive", "narrator", "files", "chronicles", "channel"] },
    funny: { prefix: ["chaotic", "random", "meme", "awkward", "local", "sleepy"], suffix: ["energy", "club", "moments", "zone", "show", "factory"] },
    edgy: { prefix: ["void", "night", "grim", "raw", "acid", "rebel"], suffix: ["mode", "core", "network", "zone", "wave", "sector"] },
    minimal: { prefix: ["simple", "plain", "real", "mono", "clean", "true"], suffix: ["studio", "space", "notes", "line", "files", "dot"] },
    brandable: { prefix: ["nova", "kairo", "zentra", "lumo", "atlas", "vera"], suffix: ["media", "labs", "works", "studio", "group", "co"] },
    "kids-family": { prefix: ["happy", "family", "kiddo", "play", "sunshine", "tiny"], suffix: ["adventures", "fun", "world", "time", "tv", "club"] }
  };

  const blockedTerms = ["slur", "hate", "violent"]; 
  const vibeList = [
    ["aesthetic", "Aesthetic"],
    ["cute", "Cute"],
    ["cool", "Cool"],
    ["gaming", "Gaming"],
    ["vlog", "Vlog"],
    ["tech", "Tech"],
    ["faceless", "Faceless"],
    ["funny", "Funny"],
    ["edgy", "Edgy"],
    ["minimal", "Minimal"],
    ["brandable", "Pro/Brandable"],
    ["kids-family", "Kids/Family"]
  ];

  let selectedVibe = "";
  let runNonce = 0;

  const el = {
    keyword: document.getElementById("tngKeyword"),
    initials: document.getElementById("tngInitials"),
    vibes: document.getElementById("tngVibes"),
    generate: document.getElementById("tngGenerate"),
    results: document.getElementById("tngResults"),
    check: document.getElementById("tngCheck"),
    checkButton: document.getElementById("tngCheckButton"),
    checkResult: document.getElementById("tngCheckResult")
  };

  function sanitizeToken(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compact(value) {
    return String(value || "").replace(/[^a-z0-9]/gi, "");
  }

  function unique(list) {
    return Array.from(new Set(list.filter(Boolean)));
  }

  function updateGenerateState() {
    if (!el.generate) return;
    const hasKeyword = sanitizeToken(el.keyword?.value).length > 0;
    const hasVibe = selectedVibe.length > 0;
    el.generate.disabled = !hasKeyword && !hasVibe;
  }

  function renderVibes() {
    if (!el.vibes) return;
    el.vibes.innerHTML = vibeList.map(function (entry) {
      const key = entry[0];
      const label = entry[1];
      return '<button class="tng-vibe" type="button" role="radio" aria-checked="false" data-vibe="' + key + '">' + label + '</button>';
    }).join("");
  }

  function pickVibe() {
    return selectedVibe && vibeBanks[selectedVibe] ? vibeBanks[selectedVibe] : vibeBanks.aesthetic;
  }

  function isBlocked(name) {
    const n = name.toLowerCase();
    return blockedTerms.some(function (term) { return n.includes(term); });
  }

  function titleCase(input) {
    return input.split(/\s+/).filter(Boolean).map(function (part) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    }).join(" ");
  }

  function buildName(parts) {
    const raw = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    if (!raw) return null;
    return titleCase(raw);
  }

  function generateNames() {
    const keyword = sanitizeToken(el.keyword?.value || "creator").slice(0, 24);
    const initials = compact(el.initials?.value || "").slice(0, 4).toUpperCase();
    const bank = pickVibe();
    const base = keyword || "creator";

    runNonce += 1;
    const seed = Date.now() + runNonce;
    const picks = [];

    for (let i = 0; i < 24; i++) {
      const p = bank.prefix[(seed + i) % bank.prefix.length];
      const s = bank.suffix[(seed + i * 2) % bank.suffix.length];
      picks.push(
        buildName([p, base]),
        buildName([base, s]),
        buildName([p, s]),
        initials ? buildName([base, initials]) : null,
        initials ? buildName([initials, p, base]) : null
      );
    }

    return unique(picks).filter(function (name) {
      return !isBlocked(name);
    }).slice(0, 20);
  }

  async function copy(value, btn) {
    try {
      await navigator.clipboard.writeText(value);
      btn.textContent = "Copied!";
      setTimeout(function () { btn.textContent = "Copy"; }, 1000);
    } catch (err) {
      console.error(err);
    }
  }

  function render(names) {
    if (!el.results) return;
    if (!names.length) {
      el.results.innerHTML = '<div class="tng-empty">Try a broader keyword or a different vibe.</div>';
      return;
    }

    el.results.innerHTML = names.map(function (name) {
      const len = name.length;
      const warn = len >= 45;
      const over = len > 50;
      return '<div class="tng-card">' +
        '<div class="tng-name">' + name + '</div>' +
        '<div class="tng-meta' + (warn ? ' char-warning' : '') + '">' + len + '/50 chars' + (over ? ' · Over channel-name limit' : warn ? ' · Near channel-name limit' : '') + '</div>' +
        '<div class="tng-actions">' +
          '<button class="copy-btn" type="button" data-name="' + name.replace(/"/g, '&quot;') + '">Copy</button>' +
          '<a class="copy-btn" href="/youtube/?q=' + encodeURIComponent(name) + '">Style this →</a>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  function validateHandle(raw) {
    const value = String(raw || "").trim().replace(/^@/, "");
    if (!value) return { valid: false, reasons: ["Enter a handle to check format."] };
    if (value.length < 3) return { valid: false, reasons: ["Too short. Use 3-30 characters."] };
    if (value.length > 30) return { valid: false, reasons: ["Too long. Use 3-30 characters."] };
    if (/^[._-]|[._-]$/.test(value)) return { valid: false, reasons: ["Cannot start or end with . _ -"] };
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9._-]{1,28})[A-Za-z0-9]$/.test(value)) {
      return { valid: false, reasons: ["Contains unsupported characters. Use A-Z, 0-9, . _ - only."] };
    }
    return { valid: true, reasons: [] };
  }

  function runValidation() {
    if (!el.checkResult || !el.check) return;
    const result = validateHandle(el.check.value);
    if (!result.valid) {
      el.checkResult.innerHTML = '<div class="block-example"><strong>Format needs fixes:</strong><ul>' + result.reasons.map(function (reason) {
        return '<li>' + reason + '</li>';
      }).join("") + '</ul></div>';
      return;
    }
    el.checkResult.innerHTML = '<div class="block-example"><strong>Format looks valid (availability not checked).</strong></div>';
  }

  function runGenerate() {
    if (!el.generate) return;
    const original = el.generate.textContent;
    el.generate.disabled = true;
    el.generate.setAttribute("aria-busy", "true");
    el.generate.textContent = "Generating…";
    setTimeout(function () {
      render(generateNames());
      el.generate.textContent = original;
      el.generate.removeAttribute("aria-busy");
      updateGenerateState();
    }, 220);
  }

  function init() {
    if (!el.generate || !el.results) return;
    renderVibes();
    render(generateNames());
    updateGenerateState();

    if (el.keyword) {
      el.keyword.addEventListener("input", updateGenerateState);
    }

    if (el.vibes) {
      el.vibes.addEventListener("click", function (event) {
        const btn = event.target.closest(".tng-vibe");
        if (!btn) return;
        const next = btn.dataset.vibe || "";
        selectedVibe = selectedVibe === next ? "" : next;
        el.vibes.querySelectorAll(".tng-vibe").forEach(function (chip) {
          const active = chip.dataset.vibe === selectedVibe;
          chip.classList.toggle("active", active);
          chip.setAttribute("aria-checked", active ? "true" : "false");
        });
        updateGenerateState();
      });
    }

    el.generate.addEventListener("click", runGenerate);

    el.results.addEventListener("click", function (event) {
      const btn = event.target.closest("button[data-name]");
      if (!btn) return;
      copy(btn.dataset.name, btn);
    });

    if (el.checkButton) {
      el.checkButton.addEventListener("click", runValidation);
    }

    if (el.check) {
      el.check.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          runValidation();
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
