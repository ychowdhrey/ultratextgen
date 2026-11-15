/* =====================================================================
   UltraTextGen — Static decoration showcase copy handler
   Attaches click / keyboard "copy to clipboard" to .deco-chip[data-copy]
   in the crawlable "Popular <context> decorations" section. Self-contained;
   does not depend on script.js (works on content pages that omit it).
   ===================================================================== */
(function () {
  "use strict";

  // Chip confirmation words, one pair per page language. Same wording as
  // symbol-explorer.js's toast table (its "copied" without the trailing
  // colon), so a chip and a tile on one page say the same thing.
  var LABELS = {
    en: ["Copied", "Failed"], vi: ["Đã sao chép", "Thất bại"],
    pt: ["Copiado", "Falhou"], es: ["Copiado", "Falló"],
    de: ["Kopiert", "Fehlgeschlagen"], id: ["Disalin", "Gagal"],
    tr: ["Kopyalandı", "Başarısız"], fr: ["Copié", "Échec"],
    nl: ["Gekopieerd", "Mislukt"], it: ["Copiato", "Errore"],
    pl: ["Skopiowano", "Błąd"], th: ["คัดลอกแล้ว", "ล้มเหลว"],
    zh: ["已複製", "失敗"], ko: ["복사됨", "실패"],
    ar: ["تم النسخ", "فشل"], no: ["Kopiert", "Mislyktes"],
    ja: ["コピーしました", "失敗しました"], ru: ["Скопировано", "Ошибка"],
    da: ["Kopieret", "Mislykkedes"], sv: ["Kopierat", "Misslyckades"],
    cs: ["Zkopírováno", "Selhalo"], sk: ["Skopírované", "Zlyhalo"],
    hr: ["Kopirano", "Neuspjelo"], bs: ["Kopirano", "Neuspjelo"],
    sr: ["Копирано", "Neuspelo"], ro: ["Copiat", "Eșuat"],
    hu: ["Másolva", "Sikertelen"], hi: ["कॉपी हुआ", "विफल"],
    tl: ["Kinopya", "Nabigo"], fi: ["Kopioitu", "Epäonnistui"]
  };
  var LANG = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  var WORDS = LABELS[LANG] || LABELS.en;

  // Resolves only when the text is on the clipboard; rejects when neither
  // writeText nor execCommand put it there. script.js publishes the site's
  // shared helper with this contract; the local copy below is the same
  // contract for the few pages that load this file without script.js.
  function localWrite(text) {
    function legacy() {
      var focused = document.activeElement;
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = !!document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (focused && typeof focused.focus === "function") focused.focus();
      return ok ? Promise.resolve() : Promise.reject(new Error("copy refused"));
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(legacy);
    }
    return legacy();
  }

  function writeClipboard(text) {
    var ns = window.UltraTextGen;
    if (ns && typeof ns.writeClipboard === "function") return ns.writeClipboard(text);
    return localWrite(text);
  }

  // One polite live region for the whole showcase, created on first use, so a
  // screen reader hears the outcome once. Skipped where the page already has
  // a copy toast that announces (symbol-explorer.js takes those pages below).
  var statusEl = null;
  function announce(msg) {
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.className = "sr-only";
      statusEl.setAttribute("role", "status");
      statusEl.setAttribute("aria-live", "polite");
      document.body.appendChild(statusEl);
    }
    statusEl.textContent = "";
    // A fresh text node after a tick makes repeat announcements of the same
    // word reach assistive tech.
    window.setTimeout(function () { statusEl.textContent = msg; }, 50);
  }

  function showState(chip, ok) {
    var label = chip.querySelector(".deco-chip-label");
    var word = ok ? WORDS[0] : WORDS[1];
    if (label) label.setAttribute("data-copy-msg", word);
    chip.classList.remove("copied", "copy-failed");
    chip.classList.add(ok ? "copied" : "copy-failed");
    window.clearTimeout(chip._decoTimer);
    chip._decoTimer = window.setTimeout(function () {
      chip.classList.remove("copied", "copy-failed");
    }, ok ? 1200 : 2400);
    var name = label ? label.textContent.trim() : "";
    announce(name ? word + ": " + name : word);
  }

  function init() {
    var chips = document.querySelectorAll(".deco-chip[data-copy]");
    Array.prototype.forEach.call(chips, function (chip) {
      chip.setAttribute("role", "button");
      chip.setAttribute("tabindex", "0");
      function fire() {
        var text = chip.getAttribute("data-copy");
        // Where symbol-explorer.js is on the page, use its copy path: it
        // falls back to execCommand, says "failed" when neither path worked,
        // shows its localized toast and records one copy_text.
        var ns = window.UltraTextGen;
        if (ns && typeof ns.copyText === "function" && document.getElementById("symbolToast")) {
          var name = chip.querySelector(".deco-chip-label");
          ns.copyText(text, chip, name ? name.textContent.trim() : text, "button");
          return;
        }
        // Elsewhere: confirm and record only after the clipboard accepted the
        // text; say "failed" (localized) when it did not.
        writeClipboard(text).then(function () {
          showState(chip, true);
          if (window.UltraTextGen && window.UltraTextGen.trackCopy) {
            window.UltraTextGen.trackCopy("button", text);
          }
        }, function () {
          showState(chip, false);
        });
      }
      chip.addEventListener("click", fire);
      chip.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          fire();
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
