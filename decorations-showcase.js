/* =====================================================================
   UltraTextGen — Static decoration showcase copy handler
   Attaches click / keyboard "copy to clipboard" to .deco-chip[data-copy]
   in the crawlable "Popular <context> decorations" section. Self-contained;
   does not depend on script.js (works on content pages that omit it).
   ===================================================================== */
(function () {
  "use strict";

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  function init() {
    var chips = document.querySelectorAll(".deco-chip[data-copy]");
    Array.prototype.forEach.call(chips, function (chip) {
      chip.setAttribute("role", "button");
      chip.setAttribute("tabindex", "0");
      function fire() {
        copyText(chip.getAttribute("data-copy"));
        chip.classList.add("copied");
        window.setTimeout(function () { chip.classList.remove("copied"); }, 1200);
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
