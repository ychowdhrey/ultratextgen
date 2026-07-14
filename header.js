(function () {
  "use strict";

  // GTM loads solely via the inline snippet each page ships in <head>;
  // this selector only locates the noscript iframe to position the header.
  const GTM_NOSCRIPT_SELECTOR = 'noscript iframe[src*="googletagmanager.com/ns.html"]';

  // Dedicated ad slots — injected once here so every page that loads
  // header.js gets them automatically, with no per-page markup to maintain.
  // Auto ads (Anchor, etc.) still runs from the loader script each page
  // already ships in <head>; these two are the fixed, hand-placed units.
  const AD_CLIENT = "ca-pub-8242324164413945";

  const topBannerHTML = '<div class="ad-slot ad-top-banner">' +
      '<ins class="adsbygoogle" style="display:block" ' +
        'data-ad-client="' + AD_CLIENT + '" ' +
        'data-ad-slot="7584734719" ' +
        'data-ad-format="auto" ' +
        'data-full-width-responsive="true"></ins>' +
    '</div>';

  const rightRailHTML = '<aside class="ad-slot ad-rail-right">' +
      '<ins class="adsbygoogle" style="display:inline-block;width:300px;height:600px" ' +
        'data-ad-client="' + AD_CLIENT + '" ' +
        'data-ad-slot="5968968934"></ins>' +
    '</aside>';

  var headerHTML = '<header class="header">' +
    '<div class="header-inner">' +
      '<a href="/" class="logo">' +
        '<span class="logo-icon">U</span>' +
        '<span>UltraTextGen</span>' +
      '</a>' +
      '<div class="search-bar">' +
        '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>' +
        '</svg>' +
        '<input type="search" id="searchInput" placeholder="Search font styles…" aria-label="Search font styles">' +
      '</div>' +
      '<div class="header-actions">' +
        '<a class="header-btn" href="/guide/" aria-label="Guide">' +
          '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l7-7 3 3-7 7-3-3zM18 13l-6-6-8 8v6h6l8-8z" />' +
          '</svg>' +
          '<span>Guide</span>' +
        '</a>' +
        '<a class="header-btn" href="/answers/" aria-label="Answers">' +
          '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4v-4z" />' +
          '</svg>' +
          '<span>Answers</span>' +
        '</a>' +
        '<a class="header-btn" href="/category/" aria-label="Category">' +
          '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h6v6H3V7zm12 0h6v6h-6V7zM3 17h6v4H3v-4zm12 0h6v4h-6v-4z"></path>' +
          '</svg>' +
          '<span>Category</span>' +
        '</a>' +
        '<a class="header-btn" href="/usecase/" aria-label="Use cases">' +
          '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />' +
          '</svg>' +
          '<span>Use cases</span>' +
        '</a>' +
        '<a class="header-btn" href="/library/" aria-label="Library">' +
          '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />' +
          '</svg>' +
          '<span>Library</span>' +
        '</a>' +
        '<a class="header-btn" href="/printables/" aria-label="Printables">' +
          '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />' +
          '</svg>' +
          '<span>Printables</span>' +
        '</a>' +
        '<a class="header-btn" href="/events/" aria-label="Events">' +
          '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />' +
          '</svg>' +
          '<span>Events</span>' +
        '</a>' +
        '<button class="header-btn" id="darkModeBtn" aria-label="Toggle dark mode" type="button">' +
          '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>' +
          '</svg>' +
        '</button>' +
      '</div>' +
    '</div>' +
  '</header>';

  function initializeSharedHeader() {
    var placeholder = document.getElementById("shared-header");
    if (placeholder) {
      placeholder.outerHTML = headerHTML;
    } else {
      const body = document.body;
      let insertAfter = body.querySelector(GTM_NOSCRIPT_SELECTOR);
      if (insertAfter) {
        insertAfter = insertAfter.parentNode;
      } else {
        for (let i = 0; i < body.childNodes.length; i++) {
          const node = body.childNodes[i];
          if (node.nodeType === 8 && node.nodeValue.trim() === "End Google Tag Manager (noscript)") {
            insertAfter = node;
            break;
          }
        }
      }
      const tmp = document.createElement("div");
      tmp.innerHTML = headerHTML;
      const header = tmp.firstChild;
      body.insertBefore(header, insertAfter ? insertAfter.nextSibling : body.firstChild);
    }

    // Ad slots: top banner right after the nav, right rail appended to
    // <body> (it's position:fixed, so its DOM position doesn't matter).
    const headerEl = document.querySelector("header.header");
    if (headerEl) {
      headerEl.insertAdjacentHTML("afterend", topBannerHTML);
    }
    document.body.insertAdjacentHTML("beforeend", rightRailHTML);
    if (window.adsbygoogle === undefined) {
      window.adsbygoogle = [];
    }
    // Top banner always requests — it's visible at every viewport width.
    window.adsbygoogle.push({});
    // Right rail is CSS-hidden below 1600px (see .ad-rail-right in style.css);
    // only request it when it'll actually be seen, so narrow viewports don't
    // burn an impression on a slot nobody can view.
    if (window.matchMedia("(min-width: 1600px)").matches) {
      window.adsbygoogle.push({});
    }

    // Dark mode: apply saved preference immediately (before paint)
    if (localStorage.getItem("darkMode") === "true") {
      document.body.classList.add("dark-mode");
    }

    // Dark mode toggle
    var dmBtn = document.getElementById("darkModeBtn");
    if (dmBtn) {
      dmBtn.addEventListener("click", function () {
        var isDark = document.body.classList.toggle("dark-mode");
        localStorage.setItem("darkMode", isDark ? "true" : "false");
      });
    }
  }

  if (document.body) {
    initializeSharedHeader();
  } else {
    document.addEventListener("DOMContentLoaded", initializeSharedHeader);
  }
})();
