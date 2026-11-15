/* =====================================================================
   UltraTextGen — Static decoration showcase copy handler
   Attaches click / keyboard "copy to clipboard" to .deco-chip[data-copy]
   in the crawlable "Popular <context> decorations" section. Self-contained;
   does not depend on script.js (works on content pages that omit it).
   ===================================================================== */
(function () {
  "use strict";

  // Chip confirmation words. English lives here; every other language is
  // copied from locales/<lang>.json (ui.copyButtons) by
  // `npm run sync:explorer-strings`, and `check:explorer-strings` fails when
  // they drift. Never hand-author an entry.
  const UI_STRINGS = {
    en: {
      copied: "✓ Copied",
      failed: "✗ Failed"
    },
    ar: {
      copied: "✓ تم النسخ",
      failed: "✗ فشل"
    },
    bs: {
      copied: "✓ Kopirano",
      failed: "✗ Neuspjelo"
    },
    cs: {
      copied: "✓ Zkopírováno",
      failed: "✗ Selhalo"
    },
    da: {
      copied: "✓ Kopieret",
      failed: "✗ Mislykkedes"
    },
    de: {
      copied: "✓ Kopiert",
      failed: "✗ Fehlgeschlagen"
    },
    es: {
      copied: "✓ Copiado",
      failed: "✗ Falló"
    },
    fi: {
      copied: "✓ Kopioitu",
      failed: "✗ Epäonnistui"
    },
    fr: {
      copied: "✓ Copié",
      failed: "✗ Échec"
    },
    hi: {
      copied: "✓ कॉपी हो गया",
      failed: "✗ विफल"
    },
    hr: {
      copied: "✓ Kopirano",
      failed: "✗ Neuspjelo"
    },
    hu: {
      copied: "✓ Másolva",
      failed: "✗ Sikertelen"
    },
    id: {
      copied: "✓ Tersalin",
      failed: "✗ Gagal"
    },
    it: {
      copied: "✓ Copiato",
      failed: "✗ Errore"
    },
    ja: {
      copied: "✓ コピーしました",
      failed: "✗ 失敗しました"
    },
    ko: {
      copied: "✓ 복사됨",
      failed: "✗ 실패"
    },
    ms: {
      copied: "✓ Disalin",
      failed: "✗ Gagal"
    },
    nl: {
      copied: "✓ Gekopieerd",
      failed: "✗ Mislukt"
    },
    no: {
      copied: "✓ Kopiert",
      failed: "✗ Mislyktes"
    },
    pl: {
      copied: "✓ Skopiowano",
      failed: "✗ Błąd"
    },
    pt: {
      copied: "✓ Copiado",
      failed: "✗ Falhou"
    },
    ro: {
      copied: "✓ Copiat",
      failed: "✗ Eșuat"
    },
    ru: {
      copied: "✓ Скопировано",
      failed: "✗ Ошибка"
    },
    sk: {
      copied: "✓ Skopírované",
      failed: "✗ Zlyhalo"
    },
    sr: {
      copied: "✓ Kopirano",
      failed: "✗ Neuspelo"
    },
    sv: {
      copied: "✓ Kopierad",
      failed: "✗ Misslyckades"
    },
    th: {
      copied: "✓ คัดลอกแล้ว",
      failed: "✗ ล้มเหลว"
    },
    tl: {
      copied: "✓ Nakopya",
      failed: "✗ Nabigo"
    },
    tr: {
      copied: "✓ Kopyalandı",
      failed: "✗ Başarısız"
    },
    uk: {
      copied: "✓ Скопійовано",
      failed: "✗ Помилка"
    },
    vi: {
      copied: "✓ Đã sao chép",
      failed: "✗ Thất bại"
    },
    zh: {
      copied: "✓ 已複製",
      failed: "✗ 失敗"
    }
  };
  const PAGE_LANG = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  const STR = UI_STRINGS[PAGE_LANG] || UI_STRINGS.en;

  // Resolves only when the text is on the clipboard; rejects when neither
  // writeText nor execCommand put it there. script.js publishes the site's
  // shared helper with this contract; the local copy below is the same
  // contract for the few pages that load this file without script.js.
  function localWrite(text) {
    function legacy() {
      const focused = document.activeElement;
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
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
    const ns = window.UltraTextGen;
    if (ns && typeof ns.writeClipboard === "function") return ns.writeClipboard(text);
    return localWrite(text);
  }

  // One polite live region for the whole showcase, created on first use, so a
  // screen reader hears the outcome once. Skipped where the page already has
  // a copy toast that announces (symbol-explorer.js takes those pages below).
  let statusEl = null;
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
    const label = chip.querySelector(".deco-chip-label");
    const word = (ok ? STR.copied : STR.failed) || (ok ? UI_STRINGS.en.copied : UI_STRINGS.en.failed);
    if (label) label.setAttribute("data-copy-msg", word);
    chip.classList.remove("copied", "copy-failed");
    chip.classList.add(ok ? "copied" : "copy-failed");
    window.clearTimeout(chip._decoTimer);
    chip._decoTimer = window.setTimeout(function () {
      chip.classList.remove("copied", "copy-failed");
    }, ok ? 1200 : 2400);
    const name = label ? label.textContent.trim() : "";
    announce(name ? word + ": " + name : word);
  }

  function init() {
    const chips = document.querySelectorAll(".deco-chip[data-copy]");
    Array.prototype.forEach.call(chips, function (chip) {
      chip.setAttribute("role", "button");
      chip.setAttribute("tabindex", "0");
      function fire() {
        const text = chip.getAttribute("data-copy");
        // Where symbol-explorer.js is on the page, use its copy path: it
        // falls back to execCommand, says "failed" when neither path worked,
        // shows its localized toast and records one copy_text.
        const ns = window.UltraTextGen;
        if (ns && typeof ns.copyText === "function" && document.getElementById("symbolToast")) {
          const name = chip.querySelector(".deco-chip-label");
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
