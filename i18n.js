(function () {
  "use strict";

  // Right-to-left languages. Kept in one place so i18n.js and the
  // prerender build stay in sync on which locales are RTL.
  var RTL_LANGS = ["ar", "he", "fa", "ur"];

  function isRtl(lang) {
    return RTL_LANGS.indexOf(lang) !== -1;
  }

  function applyDir(lang) {
    document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
  }

  function getNestedValue(obj, path) {
    return path.split(".").reduce(function (acc, key) {
      return acc != null ? acc[key] : undefined;
    }, obj);
  }

  // detectLang() reads the lowercased URL path segment, so a region subtag
  // comes back as "zh-tw" while the page's own markup (and every canonical/
  // hreflang reference to it) uses the conventional "zh-TW". BCP-47 is
  // case-insensitive, but rewriting a live lang attribute is still a change
  // nobody asked for — so keep the document's own casing whenever it differs
  // only by case.
  function setDocumentLang(lang) {
    var current = document.documentElement.lang || "";
    if (current && current.toLowerCase() === String(lang).toLowerCase()) return;
    document.documentElement.lang = lang;
  }

  function applyTranslations(lang, t) {
    // Set html lang + direction attributes
    setDocumentLang(lang);
    applyDir(lang);

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
      var linkLang = a.getAttribute("hreflang") || "en";
      a.classList.toggle("active", linkLang === lang);
    });
  }

  function detectLang() {
    // Locales recognized from the URL path so <html lang> and text direction get
    // set correctly. Includes prerendered "shadow" locales (ko, hi, zh-tw) that
    // ship fully translated pages but carry no runtime translation JSON — those
    // only need the lang/dir attributes, not a fetch (see withRuntimeJson below).
    var supported = ["en", "es", "fr", "pt", "de", "id", "it", "nl", "tr", "pl", "vi", "tl", "da", "sv", "no", "ja", "th", "ru", "ar", "cs", "sk", "hr", "bs", "sr", "ro", "hu", "ko", "hi", "zh-tw", "fi"];

    // 1. Detect from URL path prefix (e.g. /fr/, /de/, /zh-tw/)
    var pathMatch = window.location.pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\//);
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

    // Always set html lang + direction attributes
    setDocumentLang(lang);
    applyDir(lang);

    markActiveLang(lang);

    if (lang === "en") return; // English is already in the HTML

    // Only fetch a translation file for locales that actually ship one.
    //
    // The prerendered "shadow" locales (ko, hi, zh-tw, hu, fi) carry fully
    // translated HTML and no data-i18n attributes, so they long skipped this
    // fetch entirely. That left a real gap: every control script.js *injects*
    // at runtime — Copy, Save, Share, the scope row, safe mode, saved styles,
    // the safety badges — reads window.UTG_I18N, which only this fetch
    // populates. A Korean page therefore rendered Korean prose with English
    // buttons on it. They now ship a UI-only /locales/<lang>.json (see that
    // file's own _readme) purely to fill that object; because those pages
    // declare no data-i18n hooks, applyTranslations() cannot touch their
    // prerendered copy.
    const withRuntimeJson = ["es", "fr", "pt", "de", "id", "it", "nl", "tr", "pl", "vi", "tl", "da", "sv", "no", "ja", "th", "ru", "ar", "cs", "sk", "hr", "bs", "sr", "ro", "ko", "hi", "zh-tw", "hu", "fi"];
    if (withRuntimeJson.indexOf(lang) === -1) return;

    fetch("/locales/" + lang + ".json")
      .then(function (r) {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(function (t) {
        applyTranslations(lang, t);
        // Expose the fetched translation object so other already-loaded
        // scripts (e.g. script.js's category-tab renderer) can read it
        // after the fact, plus a ready event for scripts that want to react
        // the moment it lands instead of polling.
        window.UTG_I18N = t;
        document.dispatchEvent(new CustomEvent("utg:i18nready", { detail: t }));
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
