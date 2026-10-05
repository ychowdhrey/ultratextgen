/* ==========================================================================
   site-search.js — the header search box's suggestions list
   ==========================================================================

   header.js renders the search box on every page and loads this file the
   first time a visitor focuses or types in it, so a page that is never
   searched pays nothing. It then fetches /js/search/index/<locale>.json
   (written by scripts/build-search-index.js from each page's own <h1> and
   description) and shows up to eight matching pages under the box.

   On a generator page script.js still filters the style cards from the same
   box; that listener is independent of this one and keeps working.

   Keys: ArrowDown/ArrowUp move, Enter opens the highlighted page (the first
   one when nothing is highlighted), Escape closes. Each suggestion is a real
   <a href>, so middle-click and "open in new tab" behave like any link.

   The ranking (normalize/tokenize/prepare/search) is pure and exposed on
   window.UTGSiteSearch so site-search.test.js can run it under node.
   ========================================================================== */
(function () {
  "use strict";

  const MAX_RESULTS = 8;
  const MAX_PER_FOLDER = 2;
  const INDEX_BASE = "/js/search/index/";

  // Scripts written without spaces between words (Thai, Japanese, Chinese)
  // and Korean compounds cannot be matched at a word start, so a token in one
  // of them matches anywhere in the text instead.
  const SPACELESS = /[฀-๿぀-ヿ㐀-鿿가-힯ᄀ-ᇿ]/;

  function normalize(s) {
    // Strip Latin combining accents only ("é" finds "e"). Thai vowel signs and
    // other scripts' marks are letters there, so they are left alone.
    return String(s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }

  function tokenize(s) {
    return normalize(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  }

  function slugWords(path) {
    return path.replace(/^\/[a-z]{2}(?:-[a-z]{2})?\//, "/").split(/[\/-]+/).filter(Boolean).join(" ");
  }

  // rows: [path, title, description, section]
  function prepare(rows, extra) {
    return rows.map(function (r) {
      const title = normalize(r[1]);
      return {
        path: r[0],
        title: r[1],
        desc: r[2],
        section: r[3],
        extra: !!extra,
        depth: r[0].split("/").filter(Boolean).length,
        fields: [
          { text: title, words: tokenize(r[1]), weight: 3 },
          { text: normalize(slugWords(r[0])), words: tokenize(slugWords(r[0])), weight: 2 },
          { text: normalize(r[2]), words: tokenize(r[2]), weight: 1 }
        ],
        titleNorm: title
      };
    });
  }

  // Best score one token earns in one field, 0 when it does not match there.
  function tokenScore(token, field) {
    if (SPACELESS.test(token)) return field.text.indexOf(token) !== -1 ? field.weight : 0;
    let best = 0;
    for (let i = 0; i < field.words.length; i++) {
      const w = field.words[i];
      if (w === token) return field.weight * 1.5;
      if (w.indexOf(token) === 0) best = field.weight;
    }
    return best;
  }

  function scoreEntry(entry, tokens, phrase) {
    let score = 0;
    for (let t = 0; t < tokens.length; t++) {
      let best = 0;
      for (let f = 0; f < entry.fields.length; f++) {
        const s = tokenScore(tokens[t], entry.fields[f]);
        if (s > best) best = s;
      }
      // Every word the visitor typed has to appear somewhere.
      if (!best) return null;
      score += best;
    }
    if (entry.titleNorm.indexOf(phrase) === 0) score += 3;
    else if (tokens.length > 1 && entry.titleNorm.indexOf(phrase) !== -1) score += 2;
    // Prefer a hub over the 26 per-letter pages under it, and a short, exact
    // title over a long one that merely mentions the word.
    score -= 0.4 * Math.max(0, entry.depth - 1);
    score -= entry.title.length / 120;
    if (entry.extra) score -= 2;
    return score;
  }

  function search(entries, query, limit) {
    const tokens = tokenize(query);
    if (!tokens.length) return [];
    const phrase = tokens.join(" ");
    const hits = [];
    for (let i = 0; i < entries.length; i++) {
      const s = scoreEntry(entries[i], tokens, phrase);
      if (s !== null) hits.push({ entry: entries[i], score: s });
    }
    hits.sort(function (a, b) {
      return b.score - a.score || (a.entry.path < b.entry.path ? -1 : 1);
    });
    // A family of per-item pages (Bubble Letter A…Z, Cursive A…Z) would
    // otherwise fill the whole list and push its own hub off it, so at most
    // two pages are shown from any one folder two or more levels down.
    const perParent = {};
    const out = [];
    for (let i = 0; i < hits.length && out.length < (limit || MAX_RESULTS); i++) {
      const e = hits[i].entry;
      if (e.depth >= 3) {
        const parent = e.path.replace(/[^\/]+\/$/, "");
        perParent[parent] = (perParent[parent] || 0) + 1;
        if (perParent[parent] > MAX_PER_FOLDER) continue;
      }
      out.push(e);
    }
    return out;
  }

  /* ── Index loading ─────────────────────────────────────────────────────── */

  const cache = {};
  function loadIndex(locale) {
    if (!cache[locale]) {
      cache[locale] = fetch(INDEX_BASE + locale + ".json")
        .then(function (res) {
          if (!res.ok) throw new Error("search index " + locale + ": " + res.status);
          return res.json();
        })
        .then(function (data) {
          return prepare(data.pages || [], false);
        })
        .catch(function (err) {
          delete cache[locale];
          throw err;
        });
    }
    return cache[locale];
  }

  /* ── UI ────────────────────────────────────────────────────────────────── */

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function attach(input, opts) {
    if (!input || input.dataset.siteSearch) return;
    input.dataset.siteSearch = "1";
    opts = opts || {};
    const locale = opts.locale || "en";
    const labels = opts.sectionLabels || {};
    const emptyText = opts.emptyText || "";

    const bar = input.parentNode;
    const list = document.createElement("ul");
    list.id = "siteSearchResults";
    list.className = "site-search-results";
    list.setAttribute("role", "listbox");
    list.hidden = true;
    bar.appendChild(list);

    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", list.id);
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("autocomplete", "off");

    let entries = null;
    let englishEntries = null;
    let results = [];
    let active = -1;
    let seq = 0;

    function close() {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      active = -1;
    }

    function setActive(i) {
      const items = list.querySelectorAll(".site-search-item");
      if (!items.length) return;
      active = (i + items.length) % items.length;
      items.forEach(function (el, n) {
        el.setAttribute("aria-selected", n === active ? "true" : "false");
      });
      input.setAttribute("aria-activedescendant", items[active].id);
      items[active].scrollIntoView({ block: "nearest" });
    }

    function render(query) {
      results = query ? merged(query) : [];
      active = -1;
      input.removeAttribute("aria-activedescendant");
      if (!query.trim()) { close(); return; }
      if (!results.length) {
        if (!emptyText) { close(); return; }
        list.innerHTML = '<li class="site-search-empty" role="presentation">' + escapeHtml(emptyText) + "</li>";
      } else {
        list.innerHTML = results.map(function (r, i) {
          const label = labels[r.section] || "";
          return '<li class="site-search-item" role="option" id="siteSearchOpt' + i + '" aria-selected="false">' +
            '<a href="' + escapeHtml(r.path) + '" tabindex="-1" data-rank="' + (i + 1) + '">' +
              '<span class="site-search-title">' + escapeHtml(r.title) + "</span>" +
              (label ? '<span class="site-search-section">' + escapeHtml(label) + "</span>" : "") +
              (r.desc ? '<span class="site-search-desc">' + escapeHtml(r.desc) + "</span>" : "") +
            "</a></li>";
        }).join("");
      }
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    // Locale results first; on a locale page whose own index runs short, the
    // English pages fill the rest of the list, ranked below every local one.
    function merged(query) {
      const own = search(entries || [], query, MAX_RESULTS);
      if (own.length >= MAX_RESULTS || !englishEntries) return own;
      return own.concat(search(englishEntries, query, MAX_RESULTS - own.length));
    }

    function update() {
      const query = input.value || "";
      const mine = ++seq;
      if (entries) { render(query); }
      ensureLoaded().then(function () {
        if (mine === seq) render(input.value || "");
      }, function () { /* offline or blocked: the box simply stays a filter */ });
    }

    let loading = null;
    function ensureLoaded() {
      if (!loading) {
        loading = loadIndex(locale).then(function (e) {
          entries = e;
          if (locale === "en") return;
          return loadIndex("en").then(function (en) {
            englishEntries = en.map(function (x) { return Object.assign({}, x, { extra: true }); });
          }, function () { /* the locale index alone is still useful */ });
        });
        loading.catch(function () { loading = null; });
      }
      return loading;
    }

    function go(i) {
      const r = results[i];
      if (!r) return;
      track(r, i + 1);
      window.location.href = r.path;
    }

    function track(r, rank) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "site_search",
        search_term: (input.value || "").trim().slice(0, 100),
        search_result_url: r.path,
        search_result_rank: rank,
        locale: locale
      });
    }

    input.addEventListener("input", update);
    input.addEventListener("focus", function () { if (input.value.trim()) update(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") {
        if (list.hidden) update();
        else setActive(active + 1);
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        if (!list.hidden) { setActive(active - 1); e.preventDefault(); }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results.length) go(active >= 0 ? active : 0);
      } else if (e.key === "Escape") {
        if (!list.hidden) { close(); e.preventDefault(); }
      }
    });
    // Keep focus in the box while a suggestion is clicked, so blur does not
    // close the list before the click lands.
    list.addEventListener("mousedown", function (e) { e.preventDefault(); });
    list.addEventListener("click", function (e) {
      const a = e.target.closest && e.target.closest("a[data-rank]");
      if (!a) return;
      const i = Number(a.getAttribute("data-rank")) - 1;
      if (results[i]) track(results[i], i + 1);
    });
    input.addEventListener("blur", function () { setTimeout(close, 150); });
    document.addEventListener("click", function (e) {
      if (!bar.contains(e.target)) close();
    });

    if (document.activeElement === input || input.value.trim()) update();
  }

  window.UTGSiteSearch = {
    attach: attach,
    normalize: normalize,
    tokenize: tokenize,
    prepare: prepare,
    search: search
  };
})();
