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
    cool: {
      prefix: ["ace", "blitz", "echo", "onyx", "vibe", "zen", "flux", "apex"],
      suffix: ["era", "club", "wave", "hour", "zone", "code", "lab", "official"]
    },
    tuff: {
      prefix: ["raw", "grim", "iron", "drip", "venom", "storm", "slick", "rage"],
      suffix: ["zone", "mode", "run", "era", "cult", "vault", "gang", "pack"]
    },
    baddie: {
      prefix: ["glam", "posh", "lush", "bossy", "sassy", "foxy", "diva", "vixen"],
      suffix: ["glow", "queen", "aura", "era", "baby", "doll", "luxe", "vibez"]
    },
    funny: {
      prefix: ["notyour", "certified", "average", "local", "chaotic", "sleepy", "broke", "random"],
      suffix: ["enjoyer", "problems", "energy", "moment", "cant", "vibes", "era", "official"]
    },
    gamer: {
      prefix: ["pixel", "lag", "frag", "quest", "combo", "spawn", "aim", "loot"],
      suffix: ["main", "ops", "grind", "squad", "hub", "gg", "run", "x"]
    },
    soft: {
      prefix: ["milk", "cloud", "honey", "petal", "dewy", "hush", "lull", "bloom"],
      suffix: ["whisper", "haze", "drift", "glow", "dust", "lace", "halo", "bloom"]
    },
    emo: {
      prefix: ["void", "ashen", "grey", "faded", "numb", "ghost", "lonely", "dusk"],
      suffix: ["tears", "ache", "ruin", "static", "echo", "decay", "core", "after"]
    },
    grunge: {
      prefix: ["rust", "static", "smoke", "thorn", "grime", "faded", "torn", "acid"],
      suffix: ["y2k", "era", "tape", "noise", "burn", "kid", "wreck", "core"]
    },
    minimal: {
      prefix: ["just", "real", "its", "the", "only", "true", "my", "neo"],
      suffix: ["daily", "studio", "space", "log", "notes", "file", "line", "dot"]
    },
    brandable: {
      prefix: ["neo", "lume", "vera", "kova", "zentra", "atlas", "vael", "oblik"],
      suffix: ["studio", "co", "labs", "media", "works", "house", "group", "dot"]
    }
  };

  let runNonce = 0;

  const el = {
    keyword: document.getElementById("tngKeyword"),
    initials: document.getElementById("tngInitials"),
    vibe: document.getElementById("tngVibe"),
    generate: document.getElementById("tngGenerate"),
    results: document.getElementById("tngResults"),
    check: document.getElementById("tngCheck"),
    checkButton: document.getElementById("tngCheckButton"),
    checkResult: document.getElementById("tngCheckResult")
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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function validateHandle(raw) {
    const v = String(raw || "").trim().toLowerCase().replace(/^@/, "");
    const reasons = [];
    if (v.length < 2 || v.length > 24) reasons.push("Must be 2–24 characters.");
    if (!/^[a-z0-9._]+$/.test(v)) reasons.push("Only letters, numbers, _ and . allowed.");
    if (/^\.|\.$/.test(v)) reasons.push("Can't start or end with a period.");
    if (/\.\./.test(v)) reasons.push("No consecutive periods.");
    const valid = reasons.length === 0 && v.length > 0;
    return { valid, normalized: v, reasons: reasons, tiktokUrl: "https://www.tiktok.com/@" + v };
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

  function runValidation() {
    if (!el.check || !el.checkResult) return;
    const result = validateHandle(el.check.value);

    if (!result.normalized) {
      el.checkResult.innerHTML = '<div class="tng-empty">Enter a handle to check the format.</div>';
      return;
    }

    if (!result.valid) {
      el.checkResult.innerHTML =
        '<div class="block-example"><strong>Format needs fixes:</strong><ul>' +
        result.reasons.map(function (reason) { return "<li>" + escapeHtml(reason) + "</li>"; }).join("") +
        "</ul></div>";
      return;
    }

    el.checkResult.innerHTML =
      '<div class="block-example"><strong>Format looks valid.</strong> ' +
      '<a href="' + result.tiktokUrl + '" target="_blank" rel="noopener">Check @' + escapeHtml(result.normalized) + ' on TikTok →</a>' +
      '<p>Availability is confirmed on TikTok, not here.</p></div>';
  }

  function init() {
    if (!el.generate || !el.results) return;
    run();

    el.generate.addEventListener("click", run);
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
