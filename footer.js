(function () {
  "use strict";

  const exploreCol =
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
    '</div>';

  // Default middle columns — the copy-and-paste Unicode audience
  const defaultMiddleCols =
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
    '</div>';

  // Printables middle columns — the print / trace / color audience
  // (parents, teachers, kids), a different job from the copy-paste tools.
  const printablesMiddleCols =
    '<div class="footer-col">' +
      '<span class="footer-col-title">Printable Alphabets</span>' +
      '<a href="/printables/bubble-letters/" class="footer-link">Bubble Letters</a>' +
      '<a href="/printables/block-letters/" class="footer-link">Block Letters</a>' +
      '<a href="/printables/cursive-alphabet/" class="footer-link">Cursive Alphabet</a>' +
      '<a href="/printables/calligraphy-alphabet/" class="footer-link">Calligraphy Alphabet</a>' +
      '<a href="/printables/alphabet-coloring-pages/" class="footer-link">Coloring Pages</a>' +
      '<a href="/printables/dot-to-dot-alphabet/" class="footer-link">Dot-to-Dot Alphabet</a>' +
    '</div>' +
    '<div class="footer-col">' +
      '<span class="footer-col-title">Trace &amp; Make</span>' +
      '<a href="/printables/name-tracing/" class="footer-link">Name Tracing</a>' +
      '<a href="/printables/handwriting-worksheet-generator/" class="footer-link">Handwriting Worksheets</a>' +
      '<a href="/printables/sight-word-tracing/" class="footer-link">Sight Word Tracing</a>' +
      '<a href="/printables/name-puzzle-maker/" class="footer-link">Name Puzzle Maker</a>' +
      '<a href="/printables/banner-maker/" class="footer-link">Banner Maker</a>' +
      '<a href="/printables/monogram-maker/" class="footer-link">Monogram Maker</a>' +
    '</div>';

  const companyCol =
    '<div class="footer-col">' +
      '<span class="footer-col-title">Company</span>' +
      '<a href="/about/" class="footer-link">About</a>' +
      '<a href="/privacy/" class="footer-link">Privacy Policy</a>' +
      '<a href="/terms/" class="footer-link">Terms of Service</a>' +
      '<a href="/contact/" class="footer-link">Contact</a>' +
    '</div>';

  // Section-aware footer: the printables tree serves a print/trace/color job,
  // not the copy-and-paste Unicode job the default footer is built for, so its
  // middle columns and tagline point at printable resources instead.
  const isPrintables = window.location.pathname.indexOf("/printables/") === 0;
  const middleCols = isPrintables ? printablesMiddleCols : defaultMiddleCols;
  const tagline = isPrintables
    ? "© 2026 UltraTextGen. Free printable letters, coloring pages & tracing sheets."
    : "© 2026 UltraTextGen. Fast text styles that work everywhere.";

  const footerLinksHTML =
    '<div class="footer-columns">' +
      exploreCol +
      middleCols +
      companyCol +
    '</div>' +
    '<div class="footer-social-links">' +
      '<a href="https://www.youtube.com/@UltraTextGen" class="footer-link" target="_blank" rel="noopener noreferrer">YouTube</a>' +
      '<a href="https://www.facebook.com/profile.php?id=61588587387596" class="footer-link" target="_blank" rel="noopener noreferrer">Facebook</a>' +
      '<a href="https://www.linkedin.com/company/71290348/" class="footer-link" target="_blank" rel="noopener noreferrer">LinkedIn</a>' +
      '<a href="https://x.com/UltraTextGen" class="footer-link" target="_blank" rel="noopener noreferrer">X</a>' +
    '</div>' +
    '<div class="footer-bottom">' +
      tagline +
    '</div>';

  // Idempotency guard — do nothing if footer-bottom already exists
  if (document.querySelector(".footer-bottom")) {
    return;
  }

  const footer = document.querySelector("footer.footer");

  if (footer) {
    let inner = footer.querySelector(".footer-inner");
    if (!inner) {
      inner = document.createElement("div");
      inner.className = "footer-inner";
      footer.appendChild(inner);
    }
    const tmp = document.createElement("div");
    tmp.innerHTML = footerLinksHTML;
    while (tmp.firstChild) {
      inner.appendChild(tmp.firstChild);
    }
  } else {
    const fullFooterHTML =
      '<footer class="footer">' +
        '<div class="footer-inner">' +
          footerLinksHTML +
        '</div>' +
      '</footer>';
    const tmpFull = document.createElement("div");
    tmpFull.innerHTML = fullFooterHTML;
    document.body.appendChild(tmpFull.firstChild);
  }
})();
