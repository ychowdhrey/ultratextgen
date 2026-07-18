(function () {
  "use strict";

  // Context-aware footer: printables/learn pages serve parents, teachers and
  // crafters — the social-fonts columns (Zalgo, LinkedIn Headline, Bold
  // Fonts…) are the wrong audience there and leak the cluster's internal
  // link equity into the fonts cluster. Those pages get printables-native
  // columns plus one bridge line back to the font generator.
  var path = (window.location && window.location.pathname) || "";
  var isPrintablesContext = path.indexOf("/printables/") === 0 || path.indexOf("/learn/") === 0;

  var printablesLinksHTML =
    '<div class="footer-columns">' +
      '<div class="footer-col">' +
        '<span class="footer-col-title">Printables</span>' +
        '<a href="/printables/" class="footer-link">All Printables</a>' +
        '<a href="/printables/bubble-letters/" class="footer-link">Bubble Letters A–Z</a>' +
        '<a href="/printables/alphabet-coloring-pages/" class="footer-link">Alphabet Coloring Pages</a>' +
        '<a href="/printables/dot-to-dot-alphabet/" class="footer-link">Dot-to-Dot Alphabet</a>' +
        '<a href="/printables/cursive-alphabet/" class="footer-link">Cursive Alphabet</a>' +
        '<a href="/printables/block-letters/" class="footer-link">Block Letters &amp; Stencils</a>' +
      '</div>' +
      '<div class="footer-col">' +
        '<span class="footer-col-title">Generators</span>' +
        '<a href="/printables/handwriting-worksheet-generator/" class="footer-link">Handwriting Worksheets</a>' +
        '<a href="/printables/coloring-page-maker/" class="footer-link">Coloring Page Maker</a>' +
        '<a href="/printables/name-tracing/" class="footer-link">Name Tracing</a>' +
        '<a href="/printables/dot-to-dot-name/" class="footer-link">Dot-to-Dot Name</a>' +
        '<a href="/printables/banner-maker/" class="footer-link">Banner Maker</a>' +
        '<a href="/printables/monogram-maker/" class="footer-link">Monogram Maker</a>' +
      '</div>' +
      '<div class="footer-col">' +
        '<span class="footer-col-title">Company</span>' +
        '<a href="/about/" class="footer-link">About</a>' +
        '<a href="/privacy/" class="footer-link">Privacy Policy</a>' +
        '<a href="/terms/" class="footer-link">Terms of Service</a>' +
        '<a href="/contact/" class="footer-link">Contact</a>' +
      '</div>' +
    '</div>' +
    '<div class="footer-bridge">Looking for text fonts for bios and posts? <a href="/" class="footer-link">Try the font generator →</a></div>' +
    '<div class="footer-social-links">' +
      '<a href="https://www.youtube.com/@UltraTextGen" class="footer-link" target="_blank" rel="noopener noreferrer">YouTube</a>' +
      '<a href="https://www.facebook.com/profile.php?id=61588587387596" class="footer-link" target="_blank" rel="noopener noreferrer">Facebook</a>' +
      '<a href="https://www.linkedin.com/company/71290348/" class="footer-link" target="_blank" rel="noopener noreferrer">LinkedIn</a>' +
      '<a href="https://x.com/UltraTextGen" class="footer-link" target="_blank" rel="noopener noreferrer">X</a>' +
    '</div>' +
    '<div class="footer-bottom">' +
      '© 2026 UltraTextGen. Free printable letters, worksheets and generators.' +
    '</div>';

  var footerLinksHTML =
    '<div class="footer-columns">' +
      '<div class="footer-col">' +
        '<span class="footer-col-title">Explore</span>' +
        '<a href="/" class="footer-link">Home</a>' +
        '<a href="/guide/" class="footer-link">Guides</a>' +
        '<a href="/answers/" class="footer-link">Answers</a>' +
        '<a href="/usecase/" class="footer-link">Use Cases</a>' +
        '<a href="/category/" class="footer-link">Categories</a>' +
        '<a href="/library/" class="footer-link">Library</a>' +
        '<a href="/printables/" class="footer-link">Printables</a>' +
        '<a href="/events/" class="footer-link">Events</a>' +
      '</div>' +
      '<div class="footer-col">' +
        '<span class="footer-col-title">Popular Tools</span>' +
        '<a href="/usecase/text-to-emoji/" class="footer-link">Text to Emoji</a>' +
        '<a href="/usecase/linkedin-headline/" class="footer-link">LinkedIn Headline</a>' +
        '<a href="/usecase/comment-font/" class="footer-link">Comment Font</a>' +
        '<a href="/usecase/bio-font/" class="footer-link">Bio Font</a>' +
        '<a href="/usecase/vertical-text/" class="footer-link">Vertical Text</a>' +
        '<a href="/usecase/scrolling-text/" class="footer-link">Scrolling Text</a>' +
        '<a href="/usecase/repeat-text/" class="footer-link">Repeat Text</a>' +
        '<a href="/usecase/zalgo-text/" class="footer-link">Zalgo Text</a>' +
        '<a href="/ascii-art-generator/" class="footer-link">ASCII Art Generator</a>' +
      '</div>' +
      '<div class="footer-col">' +
        '<span class="footer-col-title">Popular Categories</span>' +
        '<a href="/category/bold-fonts/" class="footer-link">Bold Fonts</a>' +
        '<a href="/category/cursive-fonts/" class="footer-link">Cursive Fonts</a>' +
        '<a href="/category/gothic-fonts/" class="footer-link">Gothic Fonts</a>' +
        '<a href="/category/bubble-fonts/" class="footer-link">Bubble Fonts</a>' +
        '<a href="/category/strikethrough-text/" class="footer-link">Strikethrough</a>' +
      '</div>' +
      '<div class="footer-col">' +
        '<span class="footer-col-title">Company</span>' +
        '<a href="/about/" class="footer-link">About</a>' +
        '<a href="/privacy/" class="footer-link">Privacy Policy</a>' +
        '<a href="/terms/" class="footer-link">Terms of Service</a>' +
        '<a href="/contact/" class="footer-link">Contact</a>' +
      '</div>' +
    '</div>' +
    '<div class="footer-social-links">' +
      '<a href="https://www.youtube.com/@UltraTextGen" class="footer-link" target="_blank" rel="noopener noreferrer">YouTube</a>' +
      '<a href="https://www.facebook.com/profile.php?id=61588587387596" class="footer-link" target="_blank" rel="noopener noreferrer">Facebook</a>' +
      '<a href="https://www.linkedin.com/company/71290348/" class="footer-link" target="_blank" rel="noopener noreferrer">LinkedIn</a>' +
      '<a href="https://x.com/UltraTextGen" class="footer-link" target="_blank" rel="noopener noreferrer">X</a>' +
    '</div>' +
    '<div class="footer-bottom">' +
      '\u00a9 2026 UltraTextGen. Fast text styles that work everywhere.' +
    '</div>';

  if (isPrintablesContext) {
    footerLinksHTML = printablesLinksHTML;
  }

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