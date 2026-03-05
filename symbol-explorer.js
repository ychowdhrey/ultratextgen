/* ==========================================================
   symbol-explorer.js
   Shared runtime for UltraTextGen symbol / emoji explorer pages.

   Provides:
     - UltraTextGen.isoToFlag(code)   — ISO alpha-2 → flag emoji
     - UltraTextGen.toast(msg)        — show a brief toast
     - UltraTextGen.copyText(text, el, label) — clipboard helper
     - UltraTextGen.copySymbol(tile)  — copy data-symbol from a tile
     - UltraTextGen.buildGrids(containerId, groups) — build grid UI
     - UltraTextGen.parseTwemoji(root) — safe twemoji parse wrapper
     - Auto-wired delegated click/keyboard for .symbol-tile elements
   ========================================================== */
(function () {
  "use strict";

  var ns = (window.UltraTextGen = window.UltraTextGen || {});

  /* ============================
     Icons (inline SVG strings)
     ============================ */
  var COPY_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>' +
    '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

  var CHECK_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="20 6 9 17 4 12"/></svg>';

  /* ============================
     Toast
     ============================ */
  var toastEl = null;
  var toastTimer = null;

  function getToast() {
    if (!toastEl) toastEl = document.getElementById("symbolToast");
    return toastEl;
  }

  function showToast(msg) {
    var t = getToast();
    if (!t) return;
    t.textContent = "Copied: " + msg;
    t.classList.add("is-visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove("is-visible");
    }, 1000);
  }
  ns.toast = showToast;

  /* ============================
     Clipboard helpers
     ============================ */
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* silent */ }
    document.body.removeChild(ta);
  }
  ns.fallbackCopy = fallbackCopy;

  function copyText(text, el, label) {
    label = label || text;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        feedback(el, label);
      }).catch(function () {
        fallbackCopy(text);
        feedback(el, label);
      });
    } else {
      fallbackCopy(text);
      feedback(el, label);
    }
  }
  ns.copyText = copyText;

  function copySymbol(tile) {
    var symbol = (tile.getAttribute("data-symbol") || "").trim();
    if (!symbol) return;
    copyText(symbol, tile, symbol);
  }
  ns.copySymbol = copySymbol;

  function feedback(el, label) {
    el.classList.add("is-copied");
    setTimeout(function () {
      el.classList.remove("is-copied");
    }, 1000);
    showToast(label);
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "copy_text", copy_method: "symbol_tile" });
  }

  /* ============================
     ISO alpha-2 → flag emoji
     ============================ */
  function isoToFlag(code) {
    if (!code) return "";
    var cc = String(code).trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc)) return "";
    var base = 0x1F1E6;
    return String.fromCodePoint(
      base + (cc.charCodeAt(0) - 65),
      base + (cc.charCodeAt(1) - 65)
    );
  }
  ns.isoToFlag = isoToFlag;

  /* ============================
     Twemoji wrapper
     ============================ */
  function parseTwemoji(root) {
    if (typeof twemoji !== "undefined") {
      twemoji.parse(root || document.body, { folder: "svg", ext: ".svg" });
    }
  }
  ns.parseTwemoji = parseTwemoji;

  /* ============================
     Format helpers
     ============================ */
  var FORMATS = [
    { id: "inline",   label: "Inline" },
    { id: "vertical", label: "Vertical" },
    { id: "comma",    label: "Comma" },
    { id: "space",    label: "Space" },
    { id: "bullet",   label: "Bullet" }
  ];

  function formatItems(items, formatId) {
    switch (formatId) {
      case "vertical": return items.join("\n");
      case "comma":    return items.join(", ");
      case "space":    return items.join(" ");
      case "bullet":   return items.map(function (f) { return "• " + f; }).join("\n");
      default:         return items.join(" "); // inline
    }
  }
  ns.formatItems = formatItems;

  /* ============================
     Build grid UI
     Call:  UltraTextGen.buildGrids("containerId", groups)
     where groups = [{ name: "EU", flags: ["🇦🇹", …] }, …]
     ============================ */
  function buildGrids(containerId, groups) {
    var container = document.getElementById(containerId);
    if (!container) return;

   var activeFormats = groups.map(function () { return "vertical"; });

    groups.forEach(function (group, gi) {
      var section = document.createElement("div");
      section.className = "mood-explainer flag-grid-section";

      /* Title */
      var h3 = document.createElement("h3");
      h3.textContent = group.name;
      section.appendChild(h3);

      /* Browse grid (static) */
      var grid = document.createElement("div");
      grid.className = "flag-grid-display";
      grid.textContent = group.flags.join(" ");
      section.appendChild(grid);

      /* Format selector */
      var selWrap = document.createElement("div");
      selWrap.className = "format-selector";

      var selLabel = document.createElement("div");
      selLabel.className = "format-selector-label";
      selLabel.textContent = "Copy Format";
      selWrap.appendChild(selLabel);

      var tabs = document.createElement("div");
      tabs.className = "format-tabs";

      FORMATS.forEach(function (fmt, fi) {
        var tab = document.createElement("button");
        tab.className = "format-tab" + (fmt.id === "vertical" ? " active" :
        tab.setAttribute("data-format", fmt.id);
        tab.setAttribute("data-group", gi);
        tab.textContent = fmt.label;
        tabs.appendChild(tab);
      });

      selWrap.appendChild(tabs);
      section.appendChild(selWrap);

      /* Preview */
      var preview = document.createElement("div");
      preview.className = "format-preview";
      preview.id = "preview-" + gi;
      preview.textContent = formatItems(group.flags, "vertical");
      section.appendChild(preview);

      /* Copy button */
      var copyBtn = document.createElement("button");
      copyBtn.className = "copy-collection-btn";
      copyBtn.id = "copyBtn-" + gi;
      copyBtn.setAttribute("data-group", gi);
      copyBtn.innerHTML = COPY_ICON + " Copy Collection";
      section.appendChild(copyBtn);

      container.appendChild(section);
    });

    /* Delegated events for this container */
    container.addEventListener("click", function (e) {
      /* Format tab */
      var tab = e.target.closest(".format-tab");
      if (tab) {
        var gi = parseInt(tab.getAttribute("data-group"), 10);
        var fmt = tab.getAttribute("data-format");
        activeFormats[gi] = fmt;

        tab.parentNode.querySelectorAll(".format-tab").forEach(function (s) {
          s.classList.remove("active");
        });
        tab.classList.add("active");

        var preview = document.getElementById("preview-" + gi);
        preview.textContent = formatItems(groups[gi].flags, fmt);
        parseTwemoji(preview);
        return;
      }

      /* Copy button */
      var btn = e.target.closest(".copy-collection-btn");
      if (btn) {
        var gi2 = parseInt(btn.getAttribute("data-group"), 10);
        var text = formatItems(groups[gi2].flags, activeFormats[gi2]);

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            copyCollectionFeedback(btn);
          }).catch(function () {
            fallbackCopy(text);
            copyCollectionFeedback(btn);
          });
        } else {
          fallbackCopy(text);
          copyCollectionFeedback(btn);
        }

        showToast(groups[gi2].flags[0] + "…");
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "copy_text", copy_method: "grid_collection" });
      }
    });
  }
  ns.buildGrids = buildGrids;

  function copyCollectionFeedback(btn) {
    btn.classList.add("is-copied");
    btn.innerHTML = CHECK_ICON + " Copied!";
    setTimeout(function () {
      btn.classList.remove("is-copied");
      btn.innerHTML = COPY_ICON + " Copy Collection";
    }, 1500);
  }

  /* ============================
     Auto-wire: delegated click / keyboard for .symbol-tile
     ============================ */
  document.addEventListener("click", function (e) {
    var tile = e.target.closest(".symbol-tile");
    if (tile) copySymbol(tile);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var tile = e.target.closest(".symbol-tile");
    if (!tile) return;
    e.preventDefault();
    copySymbol(tile);
  });

})();
