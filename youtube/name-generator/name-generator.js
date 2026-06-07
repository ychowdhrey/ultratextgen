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
  const MAX_KEYWORD_LENGTH = 24;
  const MAX_INITIALS_LENGTH = 4;

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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
    const keyword = sanitizeToken(el.keyword?.value || "creator").slice(0, MAX_KEYWORD_LENGTH);
    const initials = compact(el.initials?.value || "").slice(0, MAX_INITIALS_LENGTH).toUpperCase();
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

    return unique(picks).slice(0, 20);
  }

  function deriveHandle(name) {
    const handle = String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (handle.length < 3 || handle.length > 30) return null;
    return handle;
  }

  async function copy(value, btn) {
    const original = btn.textContent;
    try {
      await navigator.clipboard.writeText(value);
      btn.textContent = "Copied!";
      setTimeout(function () { btn.textContent = original; }, 1000);
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
      const safeName = escapeHtml(name);
      const handle = deriveHandle(name);
      const handleRow = handle
        ? '<div class="tng-handle-row"><span class="tng-handle-suggest">@' + escapeHtml(handle) + '</span><span class="tng-handle-tag">handle-safe</span></div>'
        : '<div class="tng-handle-row"><span class="tng-handle-tag warn">Shorten the name for a clean handle</span></div>';
      const handleCopyBtn = handle
        ? '<button class="copy-btn" type="button" data-handle="' + escapeHtml(handle) + '">Copy @handle</button>'
        : '';
      return '<div class="tng-card">' +
        '<div class="tng-name">' + safeName + '</div>' +
        '<div class="tng-meta' + (warn ? ' char-warning' : '') + '">' + len + '/50 chars' + (over ? ' · Over channel-name limit' : warn ? ' · Near channel-name limit' : '') + '</div>' +
        handleRow +
        '<div class="tng-actions">' +
          '<button class="copy-btn" type="button" data-name="' + safeName + '">Copy name</button>' +
          handleCopyBtn +
          '<a class="copy-btn" href="/youtube/?q=' + encodeURIComponent(name) + '">Style this →</a>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  function validateHandle(raw) {
    const value = String(raw || "").trim().replace(/^@/, "");
    if (!value) {
      return { valid: false, normalized: "", reasons: ["Enter a handle to check format."], youtubeUrl: "" };
    }
    const reasons = [];
    if (value.length < 3) reasons.push("Too short. Use 3–30 characters.");
    if (value.length > 30) reasons.push("Too long. Use 3–30 characters.");
    if (!/^[A-Za-z0-9._-]+$/.test(value)) reasons.push("Contains unsupported characters. Use A–Z, 0–9, . _ - only.");
    if (/^[._-]|[._-]$/.test(value)) reasons.push("Cannot start or end with . _ -");
    const valid = reasons.length === 0;
    return { valid, normalized: value, reasons, youtubeUrl: "https://www.youtube.com/@" + value };
  }

  function runValidation() {
    if (!el.checkResult || !el.check) return;
    const result = validateHandle(el.check.value);
    el.checkResult.innerHTML = "";

    if (!result.normalized) {
      const empty = document.createElement("div");
      empty.className = "tng-empty";
      empty.textContent = "Enter a handle to check the format.";
      el.checkResult.appendChild(empty);
      return;
    }

    if (!result.valid) {
      const wrap = document.createElement("div");
      wrap.className = "block-example";
      const strong = document.createElement("strong");
      strong.textContent = "Format needs fixes:";
      wrap.appendChild(strong);
      const list = document.createElement("ul");
      result.reasons.forEach(function (reason) {
        const li = document.createElement("li");
        li.textContent = reason;
        list.appendChild(li);
      });
      wrap.appendChild(list);
      el.checkResult.appendChild(wrap);
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "block-example";
    const strong = document.createElement("strong");
    strong.textContent = "Format looks valid.";
    wrap.appendChild(strong);
    wrap.appendChild(document.createTextNode(" "));
    const link = document.createElement("a");
    link.href = result.youtubeUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Check @" + result.normalized + " on YouTube →";
    wrap.appendChild(link);
    const note = document.createElement("p");
    note.textContent = "Availability is checked on YouTube, not here.";
    wrap.appendChild(note);
    el.checkResult.appendChild(wrap);
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
      const nameBtn = event.target.closest("button[data-name]");
      if (nameBtn) {
        copy(nameBtn.dataset.name, nameBtn);
        return;
      }
      const handleBtn = event.target.closest("button[data-handle]");
      if (handleBtn) {
        copy(handleBtn.dataset.handle, handleBtn);
      }
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
