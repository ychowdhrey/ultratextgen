(function () {
  "use strict";

  var Render = window.UltraTextGenRender;
  var styles = window.textStyles || {};

  /* ─── Runtime strings ───────────────────────────────────────────────
     404.html already loads i18n.js and already binds ten notFound.* keys
     through data-i18n. The strings this file injects at runtime — the copy
     button, its copied state, its failure state and the two toasts — were
     hardcoded English, while `notFound.copy` and `notFound.copied` sat
     translated in all 25 locale JSONs with nothing reading them. This is the
     404 page for every locale on the site, so that English was showing on
     every localized miss.

     Nothing here is invented: every string below already existed in every
     locale file. The failure state reuses `copyButtons.failed`, which is the
     generator's own translated word for the same event, rather than adding a
     key that would need 25 new translations.
     ------------------------------------------------------------------- */
  // A locale file has TWO shapes and this must read both. Measured across all
  // 30 files: `notFound` is TOP-LEVEL in every one of the 25 that carry it and
  // never under `ui`, while `scopeControl` and friends are always under `ui`.
  // `copyButtons` is under `ui` in 20 and absent in exactly the 10 languages
  // script.js's own older UI_STRINGS table already covers (de es fr id it nl
  // pl pt tr vi) — coherent, because computeStr() merges the JSON over that
  // table. 404.js does not load script.js, so for those 10 the failure label
  // falls back to English; the copy and copied labels do not, because
  // notFound.copy/copied exist in all 25.
  function dig(root, path) {
    return path.split(".").reduce(function (acc, key) {
      return acc != null ? acc[key] : undefined;
    }, root);
  }
  function t(path, fallback) {
    var i18n = window.UTG_I18N;
    if (!i18n) return fallback;
    var val = dig(i18n, path);
    if (val == null) val = dig(i18n.ui || {}, path);
    return val != null ? val : fallback;
  }
  function copyLabel() { return t("notFound.copy", "Copy"); }
  function copiedLabel() { return t("notFound.copied", "Copied"); }
  function failedLabel() { return t("copyButtons.failed", "Error"); }
  // notFound.copy is present in all 25 locale files; copyButtons.copyTitle in
  // only 20 — so the accessible name is built from the one that always exists.
  function copyAria(name) { return copyLabel() + ": " + name; }

  /* ─── Style name lists ──────────────────── */
  var HERO_STYLE_NAMES = [
    "Ultra Bold",
    "Ultra Bold Serif",
    "Ultra Italic",
    "Ultra Script",
    "Ultra Gothic",
    "Ultra Bubble",
    "Ultra Bubble Filled",
    "Ultra Upside Down"
  ].filter(function (n) { return !!styles[n]; });

  var MARQUEE_STYLE_NAMES = [
    "Ultra Bold",
    "Ultra Italic",
    "Ultra Script",
    "Ultra Gothic",
    "Ultra Bubble",
    "Ultra Bubble Filled",
    "Ultra Strike",
    "Ultra Underline",
    "Ultra Upside Down",
    "Ultra Mono"
  ].filter(function (n) { return !!styles[n]; });

  var PLAYGROUND_STYLE_NAMES = [
    "Ultra Bold",
    "Ultra Italic",
    "Ultra Script",
    "Ultra Gothic",
    "Ultra Bubble",
    "Ultra Bubble Filled",
    "Ultra Strike",
    "Ultra Underline",
    "Ultra Upside Down"
  ].filter(function (n) { return !!styles[n]; });

  /* ─── Copy helper ───────────────────────── */
  var toastTimer = null;

  function showCopyToast(message) {
    var toast = document.getElementById("copyToast");
    if (!toast) return;
    toast.textContent = message || "Copied!";
    toast.classList.add("is-visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 1800);
  }

  function copyText(text, button, label) {
    if (!navigator.clipboard) {
      // Fallback for older browsers
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (error) { /* silent */ }
      document.body.removeChild(ta);
      button.classList.add("copied");
      button.textContent = copiedLabel();
      showCopyToast(copiedLabel());
      setTimeout(function () {
        button.classList.remove("copied");
        button.textContent = copyLabel();
      }, 1200);
      return;
    }
    navigator.clipboard.writeText(text).then(function () {
      button.classList.add("copied");
      button.textContent = copiedLabel();
      showCopyToast(copiedLabel());
      if (window.dataLayer) {
        if (window.UltraTextGen && window.UltraTextGen.trackCopy) {
          window.UltraTextGen.trackCopy("button", text, { label: label || "" });
        } else {
          window.dataLayer.push({ event: "copy_text", copy_method: "button", label: label || "" });
        }
      }
      setTimeout(function () {
        button.classList.remove("copied");
        button.textContent = copyLabel();
      }, 1200);
    }).catch(function () {
      button.classList.add("copy-error");
      button.textContent = failedLabel();
      showCopyToast(failedLabel());
      setTimeout(function () {
        button.classList.remove("copy-error");
        button.textContent = copyLabel();
      }, 1200);
    });
  }

  /* ─── Hero digit cycling ────────────────── */
  var DIGITS = ["4", "0", "4"];
  var digitIndices = [0, 1, 2];

  function renderHeroDigits() {
    for (var i = 0; i < 3; i++) {
      var el = document.getElementById("heroDigit" + i);
      if (!el) continue;
      if (HERO_STYLE_NAMES.length === 0) {
        el.textContent = DIGITS[i];
        continue;
      }
      var styleKey = HERO_STYLE_NAMES[digitIndices[i] % HERO_STYLE_NAMES.length];
      var styleObj = styles[styleKey];
      if (styleObj && Render) {
        el.textContent = Render.renderAny(DIGITS[i], styleObj);
      } else {
        el.textContent = DIGITS[i];
      }
    }
  }

  function advanceHeroDigits() {
    for (var i = 0; i < 3; i++) {
      digitIndices[i] = (digitIndices[i] + 1) % Math.max(HERO_STYLE_NAMES.length, 1);
    }
    renderHeroDigits();
  }

  renderHeroDigits();
  setInterval(advanceHeroDigits, 2000);

  /* ─── Marquee ───────────────────────────── */
  function buildMarquee() {
    var track = document.getElementById("marqueeTrack");
    if (!track) return;

    var names = MARQUEE_STYLE_NAMES.length ? MARQUEE_STYLE_NAMES : Object.keys(styles).slice(0, 10);
    var items = [];

    names.forEach(function (name) {
      var styleObj = styles[name];
      if (!styleObj || !Render) return;
      var rendered = Render.renderAny("404", styleObj);
      items.push({ rendered: rendered, name: name });
    });

    if (items.length === 0) return;

    // Build two copies for seamless looping
    var html = "";
    for (var pass = 0; pass < 2; pass++) {
      items.forEach(function (item) {
        html +=
          '<span class="notfound-marquee-item">' +
            '<span>' + escapeHtml(item.rendered) + '</span>' +
            '<span class="notfound-marquee-style-name">' + escapeHtml(item.name) + '</span>' +
          '</span>';
      });
    }
    track.innerHTML = html;
  }

  buildMarquee();

  /* ─── Specimen wall ─────────────────────── */
  function buildWall() {
    var grid = document.getElementById("wallGrid");
    if (!grid) return;

    var entries = Object.entries(styles);
    if (entries.length === 0) return;

    var fragment = document.createDocumentFragment();

    entries.forEach(function (entry, index) {
      var name = entry[0];
      var styleObj = entry[1];

      if (!styleObj || !Render) return;
      var rendered = Render.renderAny("404", styleObj);

      var card = document.createElement("div");
      card.className = "notfound-card";

      // Featured treatments
      if (name.includes("Mono")) card.classList.add("notfound-card-terminal");
      if (name.includes("Zalgo")) card.classList.add("notfound-card-glitch");
      if (name.includes("Bubble Filled") || name.includes("Inverse")) card.classList.add("notfound-card-ink");
      if (index === 0) card.classList.add("notfound-card-accent");

      var num = String(index + 1).padStart(2, "0");
      var ariaLabel = copyAria(name);

      card.innerHTML =
        '<div class="notfound-card-number">' + escapeHtml(num) + '</div>' +
        '<div class="notfound-card-rendered">' + escapeHtml(rendered) + '</div>' +
        '<div class="notfound-card-name">' + escapeHtml(name) + '</div>' +
        '<button class="copy-btn" type="button" aria-label="' + escapeHtml(ariaLabel) + '" data-copy-text="' + escapeHtml(rendered) + '" data-style-name="' + escapeHtml(name) + '">' + escapeHtml(copyLabel()) + '</button>';

      fragment.appendChild(card);
    });

    grid.appendChild(fragment);
  }

  buildWall();

  /* ─── Playground ────────────────────────── */
  function renderPlayground(text) {
    var container = document.getElementById("playgroundResults");
    if (!container) return;

    var names = PLAYGROUND_STYLE_NAMES.length ? PLAYGROUND_STYLE_NAMES : Object.keys(styles).slice(0, 6);

    container.innerHTML = "";
    var fragment = document.createDocumentFragment();

    names.forEach(function (name) {
      var styleObj = styles[name];
      if (!styleObj || !Render) return;
      var rendered = text ? Render.renderAny(text, styleObj) : "";

      var row = document.createElement("div");
      row.className = "notfound-playground-row";

      var labelEl = document.createElement("span");
      labelEl.className = "notfound-playground-row-label";
      labelEl.textContent = name;

      var textEl = document.createElement("span");
      textEl.className = "notfound-playground-row-text";
      textEl.textContent = rendered;

      var btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", copyAria(name));
      btn.textContent = copyLabel();
      btn.setAttribute("data-copy-text", rendered);
      btn.setAttribute("data-style-name", name);

      row.appendChild(labelEl);
      row.appendChild(textEl);
      row.appendChild(btn);
      fragment.appendChild(row);
    });

    container.appendChild(fragment);
  }

  // Initial render
  var inputEl = document.getElementById("notfoundInput");
  var charCountEl = document.getElementById("notfoundCharCount");

  function updateCharCount(val) {
    if (charCountEl) {
      charCountEl.textContent = val.length + " / 500";
    }
  }

  if (inputEl) {
    renderPlayground(inputEl.value);
    updateCharCount(inputEl.value);

    inputEl.addEventListener("input", function () {
      var val = inputEl.value;
      if (val.length > 500) {
        val = val.slice(0, 500);
        inputEl.value = val;
      }
      updateCharCount(val);
      renderPlayground(val);
    });
  }

  /* ─── Global copy-btn handler ───────────── */
  // Handles clicks anywhere on .notfound-page (wall + playground)
  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".copy-btn") : null;
    if (!btn) return;
    // Only handle if inside our page sections (avoid double-handling homepage)
    var page = document.querySelector(".notfound-page");
    if (!page || !page.contains(btn)) return;

    var text = btn.getAttribute("data-copy-text") || btn.dataset.text || "";
    var styleName = btn.getAttribute("data-style-name") || "";
    copyText(text, btn, styleName);
  });

  /* ─── Utility ───────────────────────────── */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }


  /* i18n.js's locale fetch is async, so any copy button rendered before it
     resolves carries the English fallback. Relabel on arrival — the same
     patch-on-arrival contract script.js uses for its own injected controls. */
  document.addEventListener("utg:i18nready", function () {
    var label = copyLabel();
    Array.prototype.forEach.call(document.querySelectorAll(".copy-btn"), function (btn) {
      if (btn.classList.contains("copied") || btn.classList.contains("copy-error")) return;
      btn.textContent = label;
      var name = btn.getAttribute("data-style-name");
      if (name) btn.setAttribute("aria-label", copyAria(name));
    });
  });

})();
