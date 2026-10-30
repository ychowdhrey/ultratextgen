/* ==========================================================================
   UltraTextGen — asciiBannerController.js
   Wires the /ascii-art-generator/ page to asciiBannerFonts.js. Live-renders a
   FIGlet-style block-letter banner as the user types and lets them switch
   between font styles one at a time. Reuses the shared copy/toast helper from
   symbol-explorer.js (UltraTextGen.copyText) rather than reinventing clipboard
   handling — same as asciiConverterController.js.

   Requires (loaded before this): asciiBannerFonts.js, asciiShare.js, and symbol-explorer.js
   for the shared copy/toast helper (falls back to the Clipboard API alone if
   it isn't present).
   ========================================================================== */

(function () {
  "use strict";

  const Banner = window.UTG_ASCII_BANNER_FONTS;
  if (!Banner) return;

  /* Preview text sizes in px, largest first. The size only changes how the
     banner is drawn on this page; the copied text never changes. */
  const SIZES = [14, 12, 10, 8];

  let el = {};
  let currentFont = Banner.fonts.length ? Banner.fonts[0].key : "standard";
  let sizeIndex = 0;
  let sizeChosen = false; /* true once the visitor presses Smaller or Larger */
  let lastArt = "";
  let blankReason = "";

  function $(sel, root) { return (root || document).querySelector(sel); }

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function widestLine(text) {
    let widest = 0;
    text.split("\n").forEach(function (line) {
      if (line.length > widest) widest = line.length;
    });
    return widest;
  }

  function fontByKey(key) {
    for (let i = 0; i < Banner.fonts.length; i += 1) {
      if (Banner.fonts[i].key === key) return Banner.fonts[i];
    }
    return null;
  }

  /* Say how wide the banner is, and when it is wider than its box, say so and
     name the two ways out. Called after every render and every resize. */
  function updateMeta() {
    if (!el.meta) return;
    if (!lastArt) {
      el.meta.textContent = "";
      return;
    }
    let cols = widestLine(lastArt);
    let text = cols + (cols === 1 ? " column" : " columns");
    let overflows = el.wrap && el.wrap.scrollWidth > el.wrap.clientWidth + 1;
    if (overflows) {
      text += ", wider than the box. Scroll sideways or press Smaller.";
    }
    el.meta.textContent = text;
    el.meta.classList.toggle("is-wide", !!overflows);
  }

  function applySize() {
    if (el.output) el.output.style.fontSize = SIZES[sizeIndex] + "px";
    if (el.smaller) el.smaller.setAttribute("aria-disabled", sizeIndex >= SIZES.length - 1 ? "true" : "false");
    if (el.larger) el.larger.setAttribute("aria-disabled", sizeIndex <= 0 ? "true" : "false");
    updateMeta();
  }

  /* Until the visitor picks a size, use the largest one that fits the box, so
     a short word is not cut off on a phone. Their own choice always wins. */
  function autoFit() {
    if (sizeChosen || !el.wrap || !lastArt) return;
    for (let i = 0; i < SIZES.length; i += 1) {
      sizeIndex = i;
      el.output.style.fontSize = SIZES[i] + "px";
      if (el.wrap.scrollWidth <= el.wrap.clientWidth + 1) break;
    }
    applySize();
  }

  function setCopyState(canCopy, reason) {
    blankReason = canCopy ? "" : reason;
    [el.copyBtn, el.copyDiscord, el.copyReddit].forEach(function (b) {
      if (b) b.setAttribute("aria-disabled", canCopy ? "false" : "true");
    });
    if (el.discord) {
      const share = window.UTG_ASCII_SHARE;
      el.discord.textContent = canCopy && share ? share.discordFit(lastArt).message : "";
      el.discord.hidden = !el.discord.textContent;
    }
  }

  function renderArt() {
    let raw = el.input ? el.input.value : "";
    let art = raw.trim() ? Banner.render(raw, currentFont) : "";
    let blank = !!raw.trim() && !art.trim();
    lastArt = blank ? "" : art;

    if (el.output) {
      el.output.textContent = lastArt;
    }
    if (el.empty) {
      el.empty.hidden = !!raw.trim();
    }
    setCopyState(!!lastArt, raw.trim() ? "" : "Nothing to copy yet");

    if (el.notice) {
      // Say which characters were left blank instead of dropping them in
      // silence. Accented Latin letters are folded and never listed here.
      let missing = Banner.unsupported ? Banner.unsupported(raw) : [];
      let message = "";
      if (blank) {
        message = "These characters have no ASCII letters here. Try A to Z or 0 to 9.";
        blankReason = message;
      } else if (missing.length) {
        message = "No block letter for " + missing.join(" ") + ", so " +
          (missing.length === 1 ? "it shows" : "they show") + " as a space.";
      }
      el.notice.textContent = message;
      el.notice.hidden = !message;
    }
    autoFit();
    updateMeta();
  }

  function selectFont(key) {
    if (!key || key === currentFont) return;
    currentFont = key;
    syncPicker();
    renderArt();
  }

  function syncPicker() {
    if (el.picker) {
      Array.prototype.forEach.call(el.picker.querySelectorAll(".ascii-font-tab"), function (b) {
        let isActive = b.getAttribute("data-font") === currentFont;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    }
    if (el.select) el.select.value = currentFont;
    let font = fontByKey(currentFont);
    if (el.fontNote) el.fontNote.textContent = font ? font.description : "";
  }

  function buildPicker() {
    Banner.fonts.forEach(function (font) {
      if (el.picker) {
        let btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ascii-font-tab";
        btn.setAttribute("data-font", font.key);
        btn.textContent = font.name;
        el.picker.appendChild(btn);
      }
      if (el.select) {
        let opt = document.createElement("option");
        opt.value = font.key;
        opt.textContent = font.name;
        el.select.appendChild(opt);
      }
    });

    if (el.picker) {
      el.picker.addEventListener("click", function (e) {
        let btn = e.target.closest(".ascii-font-tab");
        if (btn) selectFont(btn.getAttribute("data-font"));
      });
    }
    if (el.select) {
      el.select.addEventListener("change", function () { selectFont(el.select.value); });
    }
    syncPicker();
  }

  function flash(btn) {
    btn.classList.add("copied");
    window.clearTimeout(btn._copiedTimer);
    btn._copiedTimer = window.setTimeout(function () {
      btn.classList.remove("copied");
    }, 1500);
  }

  /* A copy that cannot happen says why, in the live region, and writes
     nothing to the clipboard: no "Copied" toast over an empty or blank
     banner. */
  function refuseCopy() {
    if (!el.meta) return;
    el.meta.textContent = blankReason || "Nothing to copy yet";
    el.meta.classList.remove("is-wide");
  }

  /* `build` turns the art into the pasted text, called at click time so a
     variant is never built from a stale copy. */
  function copyArt(btn, build, label, method) {
    if (!lastArt) {
      refuseCopy();
      return;
    }
    const text = build(lastArt);
    const ns = window.UltraTextGen;
    if (ns && typeof ns.copyText === "function") {
      ns.copyText(text, btn, label, method);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    flash(btn);
  }

  function step(delta) {
    let next = sizeIndex + delta;
    if (next < 0 || next > SIZES.length - 1) return;
    sizeIndex = next;
    sizeChosen = true;
    applySize();
  }

  ready(function () {
    el.input = $("#asciiBannerInput");
    el.picker = $("#asciiFontPicker");
    el.select = $("#asciiFontSelect");
    el.fontNote = $("#asciiFontNote");
    el.output = $("#asciiBannerOutput");
    el.wrap = $("#asciiBannerWrap");
    el.meta = $("#asciiBannerMeta");
    el.empty = $("#asciiBannerEmpty");
    el.notice = $("#asciiBannerNotice");
    el.copyBtn = $("#asciiBannerCopy");
    el.copyDiscord = $("#asciiBannerCopyDiscord");
    el.copyReddit = $("#asciiBannerCopyReddit");
    el.discord = $("#asciiBannerDiscord");
    el.smaller = $("#asciiBannerSmaller");
    el.larger = $("#asciiBannerLarger");

    buildPicker();

    if (el.input) el.input.addEventListener("input", renderArt);
    const share = window.UTG_ASCII_SHARE;
    if (el.copyBtn) {
      el.copyBtn.addEventListener("click", function () {
        copyArt(el.copyBtn, function (art) { return art; }, "ASCII art", "ascii_banner");
      });
    }
    if (el.copyDiscord && share) {
      el.copyDiscord.addEventListener("click", function () {
        copyArt(el.copyDiscord, share.discordBlock, "ASCII art code block", "ascii_banner_discord");
      });
    }
    if (el.copyReddit && share) {
      el.copyReddit.addEventListener("click", function () {
        copyArt(el.copyReddit, share.redditBlock, "ASCII art for Reddit", "ascii_banner_reddit");
      });
    }
    if (el.smaller) el.smaller.addEventListener("click", function () { step(1); });
    if (el.larger) el.larger.addEventListener("click", function () { step(-1); });
    window.addEventListener("resize", function () { autoFit(); updateMeta(); });

    renderArt();
    applySize();
  });
})();
