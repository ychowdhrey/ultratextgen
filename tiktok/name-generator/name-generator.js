(function () {
  "use strict";

  const vibeBanks = {
    aesthetic: {
      prefix: ["soft", "velvet", "luna", "nova", "dream", "aura", "mist", "ivy"],
      suffix: ["vibes", "edit", "verse", "core", "mood", "wave", "glow", "diary"]
    },
    cute: {
      prefix: ["cutie", "tiny", "peach", "boba", "panda", "sweet", "chibi", "candy"],
      suffix: ["buns", "beans", "smile", "puff", "kit", "sprout", "hug", "nest"]
    },
    tuff: {
      prefix: ["raw", "grim", "iron", "drip", "venom", "storm", "slick", "rage"],
      suffix: ["zone", "mode", "run", "era", "cult", "vault", "gang", "pack"]
    },
    gamer: {
      prefix: ["pixel", "lag", "frag", "quest", "combo", "spawn", "aim", "loot"],
      suffix: ["main", "ops", "grind", "squad", "hub", "gg", "run", "x"]
    },
    minimal: {
      prefix: ["just", "real", "its", "the", "only", "true", "my", "neo"],
      suffix: ["daily", "studio", "space", "log", "notes", "file", "line", "dot"]
    }
  };

  let runNonce = 0;

  const el = {
    keyword: document.getElementById("tngKeyword"),
    initials: document.getElementById("tngInitials"),
    vibe: document.getElementById("tngVibe"),
    generate: document.getElementById("tngGenerate"),
    results: document.getElementById("tngResults")
  };

  function sanitizeToken(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, "")
      .replace(/\.{2,}/g, ".")
      .replace(/^\.+|\.+$/g, "");
  }

  function buildHandle(parts) {
    const handle = sanitizeToken(parts.join(""));
    if (!handle || handle.length < 2 || handle.length > 24) return null;
    return handle;
  }

  function unique(list) {
    return Array.from(new Set(list.filter(Boolean)));
  }

  function generateHandles() {
    const keyword = sanitizeToken(el.keyword.value || "creator").slice(0, 12);
    const initials = sanitizeToken(el.initials.value || "").slice(0, 3);
    const vibe = vibeBanks[el.vibe.value] || vibeBanks.aesthetic;

    const base = keyword || "creator";
    runNonce += 1;
    const seed = Date.now() + runNonce;
    const picks = [];

    for (let i = 0; i < 16; i++) {
      const p = vibe.prefix[(seed + i) % vibe.prefix.length];
      const s = vibe.suffix[(seed + i * 3) % vibe.suffix.length];
      const n = String((seed + i) % 99).padStart(2, "0");

      picks.push(
        buildHandle([p, base]),
        buildHandle([base, s]),
        buildHandle([p, ".", base]),
        buildHandle([base, "_", s]),
        buildHandle([p, base, n]),
        initials ? buildHandle([base, "_", initials]) : null,
        initials ? buildHandle([initials, "_", base]) : null
      );
    }

    return unique(picks).slice(0, 24);
  }

  async function copy(value, btn) {
    try {
      await navigator.clipboard.writeText(value);
      btn.textContent = "Copied";
      setTimeout(() => { btn.textContent = "Copy"; }, 900);
    } catch (err) {
      console.error(err);
    }
  }

  function render(handles) {
    if (!el.results) return;
    if (!handles.length) {
      el.results.innerHTML = '<div class="tng-empty">No valid handles generated. Try a shorter keyword.</div>';
      return;
    }

    el.results.innerHTML = handles
      .map((h) => {
        return (
          '<div class="tng-card">' +
            '<div class="tng-handle">@' + h + '</div>' +
            '<div class="tng-meta">ASCII-safe · ' + h.length + '/24 chars</div>' +
            '<button class="copy-btn" type="button" data-handle="' + h + '">Copy</button>' +
          '</div>'
        );
      })
      .join("");
  }

  function run() {
    render(generateHandles());
  }

  function init() {
    if (!el.generate || !el.results) return;
    run();

    el.generate.addEventListener("click", run);
    el.results.addEventListener("click", function (e) {
      const btn = e.target.closest("button[data-handle]");
      if (!btn) return;
      copy("@" + btn.dataset.handle, btn);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
