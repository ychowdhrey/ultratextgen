(function () {
  "use strict";

  var footerLinksHTML =
    '<div class="footer-links">' +
      '<a href="/about/" class="footer-link">About</a>' +
      '<a href="/privacy/" class="footer-link">Privacy Policy</a>' +
      '<a href="/terms/" class="footer-link">Terms of Service</a>' +
      '<a href="/contact/" class="footer-link">Contact</a>' +
    '</div>' +
    '<div class="footer-bottom">' +
      '\u00a9 2026 UltraTextGen. Fast text styles that work everywhere.' +
    '</div>';

  // Idempotency guard — do nothing if footer-bottom already exists
  if (document.querySelector(".footer-bottom")) {
    return;
  }

  var footer = document.querySelector("footer.footer");

  if (footer) {
    var inner = footer.querySelector(".footer-inner");
    if (!inner) {
      inner = document.createElement("div");
      inner.className = "footer-inner";
      footer.appendChild(inner);
    }
    var tmp = document.createElement("div");
    tmp.innerHTML = footerLinksHTML;
    while (tmp.firstChild) {
      inner.appendChild(tmp.firstChild);
    }
  } else {
    var fullFooterHTML =
      '<footer class="footer">' +
        '<div class="footer-inner">' +
          footerLinksHTML +
        '</div>' +
      '</footer>';
    var tmpFull = document.createElement("div");
    tmpFull.innerHTML = fullFooterHTML;
    document.body.appendChild(tmpFull.firstChild);
  }
})();