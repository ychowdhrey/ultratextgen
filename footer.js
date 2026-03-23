(function () {
  "use strict";

  var footerLinksHTML =
    '<div class="footer-links">' +
      '<div class="footer-nav-links">' +
        '<a href="/about/" class="footer-link">About</a>' +
        '<a href="/library/" class="footer-link">Library</a>' +
        '<a href="/privacy/" class="footer-link">Privacy Policy</a>' +
        '<a href="/terms/" class="footer-link">Terms of Service</a>' +
        '<a href="/contact/" class="footer-link">Contact</a>' +
      '</div>' +
      '<div class="footer-social-links">' +
        '<a href="https://www.youtube.com/@UltraTextGen" class="footer-link" target="_blank" rel="noopener noreferrer">YouTube</a>' +
        '<a href="https://www.facebook.com/profile.php?id=61588587387596" class="footer-link" target="_blank" rel="noopener noreferrer">Facebook</a>' +
        '<a href="https://www.linkedin.com/company/71290348/" class="footer-link" target="_blank" rel="noopener noreferrer">LinkedIn</a>' +
        '<a href="https://x.com/UltraTextGen" class="footer-link" target="_blank" rel="noopener noreferrer">X</a>' +
      '</div>' +
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