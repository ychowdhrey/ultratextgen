/* ============================================================
   instagram-surfaces.js — Instagram surface router
   ------------------------------------------------------------
   The one thing that is only true of Instagram: the same styled
   text behaves differently depending on which field it lands in.
   Bio takes it. The @username flatly does not. The Story editor
   has its own separate font picker that has nothing to do with
   Unicode at all.

   This module lets the user say where the text is going, then:
     - rebinds the live counter to that field's real limit
     - renders an honest verdict for that field
     - for @username, actually validates the text against
       Instagram's handle charset and names the offending
       characters, rather than letting Instagram return a
       generic "not available"

   Locale pages translate the strings by setting
   window.UTG_IG_SURFACES before this file loads — same
   merge-over-defaults convention as window.UTG_DECORATIONS
   and window.UTG_BIO_PLATFORMS. Only label/note/verdict text
   needs supplying; the limits and the charset rule are facts,
   not copy, and stay here.
   ============================================================ */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  /* ------------------------------------------------------------
     Surface facts.
     `limit` is the field's character limit.
     `status` is one of "safe" | "partial" | "blocked" and maps to
     the shared --ts-safe / --ts-risk / --ts-fail tokens.
     ------------------------------------------------------------ */
  const SURFACES = {
    "display-name": {
      label: "Display name",
      limit: 64,
      status: "safe",
      note: "Works. This is the name shown above your handle, and it accepts styled Unicode — it is where fancy text belongs on a profile."
    },
    bio: {
      label: "Bio",
      limit: 150,
      status: "safe",
      note: "Works. Every character counts against the limit, including line breaks and invisible spacers."
    },
    caption: {
      label: "Caption",
      limit: 2200,
      status: "safe",
      note: "Works. Only the first ~125 characters show before “more”, so put styled text early."
    },
    comment: {
      label: "Comment",
      limit: 2200,
      status: "safe",
      note: "Works. Same styled text as a caption, same limit."
    },
    story: {
      label: "Story",
      limit: 2200,
      status: "partial",
      note: "Partly. You can paste styled text into a Story text box, but Instagram’s own Story fonts (Classic, Modern, Neon, Typewriter, Strong) are a separate picker inside the app — they are not Unicode and cannot be copied out."
    },
    username: {
      label: "@username",
      limit: 30,
      status: "blocked",
      note: "Does not work. Handles accept only lowercase letters, numbers, periods and underscores. Styled characters are rejected — and Instagram reports this as “not available”, which reads like the name is taken when it is not."
    }
  };

  const DEFAULT_SURFACE = "bio";
  const HANDLE_OK = /^[a-z0-9._]*$/;

  function surfaceData() {
    const overrides = window.UTG_IG_SURFACES || {};
    const merged = {};
    Object.keys(SURFACES).forEach((key) => {
      merged[key] = Object.assign({}, SURFACES[key], overrides[key]);
    });
    return merged;
  }

  /* Visible characters, not UTF-16 code units. A styled letter like
     𝗔 is a single thing to the reader but two code units to
     String.length — counting code units would tell the user their
     10-character name is 20 characters long. */
  const segmenter =
    typeof Intl !== "undefined" && Intl.Segmenter
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;

  function visibleLength(str) {
    if (!str) return 0;
    if (segmenter) {
      let n = 0;
      for (const _ of segmenter.segment(str)) n++;
      return n;
    }
    return Array.from(str).length;
  }

  /* Which characters would Instagram reject in a handle?
     Returns a de-duplicated, display-safe list. */
  function badHandleChars(str) {
    const seen = [];
    Array.from(str.toLowerCase()).forEach((ch) => {
      if (HANDLE_OK.test(ch)) return;
      if (seen.indexOf(ch) === -1) seen.push(ch);
    });
    return seen;
  }

  const el = {
    input: $("#mainInput"),
    row: $("#igSurfaceRow"),
    count: $("#igCount"),
    limit: $("#igLimit"),
    counter: $("#igCounter"),
    verdict: $("#igVerdict"),
    verdictText: $("#igVerdictText"),
    detail: $("#igVerdictDetail")
  };

  let current = DEFAULT_SURFACE;
  const initial = $(".ig-surface-tab.active[data-surface]");
  if (initial && initial.dataset.surface) current = initial.dataset.surface;

  function render() {
    const data = surfaceData();
    const s = data[current] || data[DEFAULT_SURFACE];
    const raw = el.input ? el.input.value : "";
    const len = visibleLength(raw);
    const over = len > s.limit;

    if (el.count) el.count.textContent = String(len);
    if (el.limit) el.limit.textContent = String(s.limit);
    if (el.counter) el.counter.classList.toggle("over", over);

    /* Start from the surface's standing verdict, then let the
       actual typed text override it — a handle with only legal
       characters is genuinely fine, and saying otherwise would be
       the same unhelpful blanket "no" Instagram already gives. */
    let status = s.status;
    let text = s.note;

    if (current === "username" && raw) {
      const bad = badHandleChars(raw);
      if (bad.length) {
        status = "blocked";
        text =
          "Instagram will reject this handle. These characters are not allowed: " +
          bad.slice(0, 8).map((c) => "“" + c + "”").join(" ") +
          (bad.length > 8 ? " …" : "") +
          ". Put the styled version in your display name instead — that field accepts it.";
      } else {
        status = "safe";
        text = "These characters are all legal in a handle. If Instagram still says “not available”, the name is genuinely taken.";
      }
    }

    if (over) {
      status = "blocked";
      text = "Too long for this field — " + len + " of " + s.limit + " characters. " + text;
    }

    if (el.verdictText) el.verdictText.textContent = text;
    if (el.verdict) {
      el.verdict.dataset.status = status;
      el.verdict.hidden = false;
    }

    /* Styled Unicode sits outside the BMP, so some fields measure it
       as two units per letter. We do not claim to know which fields
       Instagram counts which way — we say the number and let the
       user paste-test, which is the honest version of this advice. */
    if (el.detail) {
      const units = raw.length;
      if (units !== len && len > 0) {
        el.detail.textContent =
          "Heads up: this is " + len + " visible characters but " + units +
          " code units. Some fields count the larger number — paste-test before you rely on it.";
        el.detail.hidden = false;
      } else {
        el.detail.hidden = true;
      }
    }
  }

  function bindTabs() {
    if (!el.row) return;
    $$(".ig-surface-tab", el.row).forEach((tab) => {
      tab.addEventListener("click", () => {
        $$(".ig-surface-tab", el.row).forEach((t) => {
          t.classList.remove("active");
          t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");
        current = tab.dataset.surface || DEFAULT_SURFACE;
        render();
      });
    });
  }

  function init() {
    if (!el.row || !el.input) return;
    bindTabs();
    el.input.addEventListener("input", render);
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
