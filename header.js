(function () {
  "use strict";

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
        '<button class="header-btn" id="darkModeBtn" aria-label="Toggle dark mode" type="button">' +
          '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>' +
          '</svg>' +
        '</button>' +
      '</div>' +
    '</div>' +
  '</header>';

  var placeholder = document.getElementById("shared-header");
  if (placeholder) {
    placeholder.outerHTML = headerHTML;
  } else {
    var body = document.body;
    var insertAfter = null;
    for (var i = 0; i < body.childNodes.length; i++) {
      var node = body.childNodes[i];
      if (node.nodeType === 8 && node.nodeValue.trim() === "End Google Tag Manager (noscript)") {
        insertAfter = node;
        break;
      }
    }
    var tmp = document.createElement("div");
    tmp.innerHTML = headerHTML;
    var header = tmp.firstChild;
    if (insertAfter && insertAfter.nextSibling) {
      body.insertBefore(header, insertAfter.nextSibling);
    } else {
      body.insertBefore(header, body.firstChild);
    }
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
})();
