(function () {
  "use strict";

  function getNestedValue(obj, path) {
    return path.split(".").reduce(function (acc, key) {
      return acc != null ? acc[key] : undefined;
    }, obj);
  }

  function applyTranslations(lang, t) {
    // Set html lang attribute
    document.documentElement.lang = lang;

    // Update <title> via data-i18n on the title element
    var titleEl = document.querySelector("title[data-i18n]");
    if (titleEl) {
      var titleVal = getNestedValue(t, titleEl.getAttribute("data-i18n"));
      if (titleVal) titleEl.textContent = titleVal;
    }

    // Update meta[data-i18n-content] — e.g. meta description
    document.querySelectorAll("[data-i18n-content]").forEach(function (el) {
      var val = getNestedValue(t, el.getAttribute("data-i18n-content"));
      if (val) el.setAttribute("content", val);
    });

    // Replace textContent for data-i18n elements
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      if (el.tagName === "TITLE") return; // handled above
      var val = getNestedValue(t, el.getAttribute("data-i18n"));
      if (val != null) el.textContent = val;
    });

    // Replace innerHTML for data-i18n-html elements (FAQ answers etc.)
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var val = getNestedValue(t, el.getAttribute("data-i18n-html"));
      if (val != null) el.innerHTML = val;
    });

    // Replace placeholder for data-i18n-placeholder elements
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var val = getNestedValue(t, el.getAttribute("data-i18n-placeholder"));
      if (val) el.setAttribute("placeholder", val);
    });

    // Update FAQ JSON-LD schema
    updateFAQSchema(t);
  }

  function updateFAQSchema(t) {
    var faqCats = t.faq && t.faq.categories;
    if (!faqCats) return;

    var scripts = document.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach(function (script) {
      try {
        var data = JSON.parse(script.textContent);
        if (data["@type"] !== "FAQPage") return;

        var entities = [];
        faqCats.forEach(function (cat) {
          if (!cat.items) return;
          cat.items.forEach(function (item) {
            if (!item.question || !item.answer) return;
            // Strip HTML tags for schema.org text (schema prefers plain text)
            var plainAnswer = item.answer.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            entities.push({
              "@type": "Question",
              "name": item.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": plainAnswer
              }
            });
          });
        });

        data.mainEntity = entities;
        script.textContent = JSON.stringify(data, null, 2);
      } catch (e) {
        // Leave schema unchanged on parse error
      }
    });
  }

  function markActiveLang(lang) {
    document.querySelectorAll(".lang-option").forEach(function (a) {
      var href = a.getAttribute("href");
      // Match path-based (/fr/) or root (/) or legacy (?lang=xx)
      var hrefLang;
      if (href === "/" || href === "?lang=en") {
        hrefLang = "en";
      } else {
        var pathMatch = href.match(/^\/([a-z]{2})\/$/);
        hrefLang = pathMatch ? pathMatch[1] : href.replace("?lang=", "");
      }
      a.classList.toggle("active", hrefLang === lang);
    });
  }

  function detectLang() {
    var supported = ["en", "es", "fr", "pt", "de", "id", "it", "nl", "tr", "pl", "vi"];

    // 1. Detect from URL path prefix (e.g. /fr/, /de/)
    var pathMatch = window.location.pathname.match(/^\/([a-z]{2})\//);
    if (pathMatch && supported.indexOf(pathMatch[1]) !== -1) {
      return pathMatch[1];
    }

    // 2. Fall back to ?lang= query param (legacy / redirect fallback)
    var params = new URLSearchParams(window.location.search);
    var queryLang = params.get("lang");
    if (queryLang && supported.indexOf(queryLang) !== -1) {
      return queryLang;
    }

    return "en";
  }

  function init() {
    var lang = detectLang();

    // Always set html lang attribute
    document.documentElement.lang = lang;

    markActiveLang(lang);

    if (lang === "en") return; // English is already in the HTML

    fetch("/locales/" + lang + ".json")
      .then(function (r) {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(function (t) {
        applyTranslations(lang, t);
      })
      .catch(function () {
        // Fall back to English (default HTML content stays unchanged)
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
