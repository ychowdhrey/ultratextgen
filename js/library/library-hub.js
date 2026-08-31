/**
 * library-hub.js — the shared browse UI for every `library/` hub.
 *
 * WHY THIS IS SHARED
 * ------------------
 * It used not to be. Each hub carried its own inline copy of this logic, and on
 * 2026-07-14 three commits in one rollout batch built two hubs apiece from two
 * different templates — `ac27ccdf5` gave fr the browse UI and ja a plain list,
 * `a77a67b03` did the same to es/th, `f9f913976` to tr/vi. A month later zh-tw
 * was built plain again. Twelve of nineteen locale hubs ended up without the
 * search/filter UI that CLAUDE.md uses to *define* the pillar ("`library/` stays
 * the sole browse-and-find surface").
 *
 * Copying the template a twelfth time would have re-created the condition that
 * caused it: ~700 lines of inline logic per page with nothing keeping them in
 * step. One implementation cannot drift from itself.
 *
 * CONTRACT
 * --------
 * A hub page declares its data and its own language's strings, then loads this:
 *
 *   window.UTG_LIBRARY_HUB = {
 *     locale:   "ja",                  // BCP-47, used for collation
 *     basePath: "/ja/library/",        // every entry href is basePath + slug + "/"
 *     items:    [ { title, slug, description, preview,
 *                   type, subject, useCases: [], platforms: [] }, … ],
 *     i18n:     { … }                  // see I18N_KEYS below; all page copy
 *   };
 *
 * Nothing in this file is user-visible English: every string rendered comes from
 * the page's own `i18n` block, so a locale hub cannot leak English through it.
 *
 * COLLATION IS DERIVED, NOT DECLARED
 * ----------------------------------
 * The old inline copies each hardcoded their own alphabet — a Latin A–Z string,
 * Turkish's Ç/Ğ/İ/Ö/Ş/Ü ordering, Korean's INITIAL_ID consonant buckets. That
 * does not scale to ar/ja/ru/th/zh-tw and is a table to get wrong per locale.
 * Instead the bar is built from the data: bucket by first grapheme, order with
 * `Intl.Collator(locale)`. Every script works with no per-locale table, and the
 * bar only ever shows buckets that actually have entries.
 *
 * ALSO RUNS IN NODE
 * -----------------
 * `scripts/build-locale-library-directory.js` pre-renders each hub's directory
 * so non-JS crawlers see the links. It requires this file and calls
 * `renderDirectory()` directly, so the static markup and the runtime markup come
 * from one function by construction. The CommonJS export at the bottom exists
 * only for that build step — the browser path is the plain IIFE, per CLAUDE.md's
 * "no ES modules" rule.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;          // build-time only (see header)
  } else {
    root.UltraTextGenLibraryHub = api;
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { api.mount(); });
      } else {
        api.mount();
      }
    }
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Every string the UI can render. A hub must supply all of them. */
  const I18N_KEYS = [
    'searchLabel', 'searchPlaceholder', 'clearFilters', 'resultCount',
    'emptyTitle', 'emptyBody', 'emptyReset', 'backTop',
    'filterBy', 'alphaJump', 'noItems', 'directoryLabel',
  ];

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Scripts whose combining marks are vowel signs hung off a base consonant,
   * rather than marks that can form a letter of the alphabet in their own right.
   *
   * The distinction is load-bearing and cuts both ways. Thai orders by base
   * consonant, so `ลูกศร` belongs under ล, not under the cluster ลู — folding is
   * right. But Swedish, Danish and Norwegian treat Å, Ä and Ö as separate
   * letters sorting *after* Z, so folding those into A/O would put them in the
   * wrong bucket entirely. So folding is applied per script, never globally.
   */
  /* ── Hangul 초성 (initial-consonant) index ──
     A Korean "alphabetical" index is the 가나다 초성, not the syllable: a reader
     looks 감귤 up under ㄱ, exactly as a Thai reader looks past a vowel sign to
     the consonant below. Without this every syllable becomes its own bucket —
     measured on ko/library: 48 buckets for 56 entries, an index with roughly one
     entry per letter, which is no index at all.

     Syllables are algorithmic, not combining sequences, so NFD + mark-stripping
     (what VOWEL_SIGN_SCRIPTS does) cannot reach them: U+AC00 + i/588 is the only
     way in. The five tensed initials fold onto their base the way Korean indexes
     print them, giving the conventional 14 buckets rather than 19.

     Ported from the pre-migration ko/library/index.html, which got this right in
     its own hand-written CHO/CHO_BASE tables. */
  const HANGUL_CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
                      'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const HANGUL_CHO_BASE = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };

  const VOWEL_SIGN_SCRIPTS =
    /[\u0900-\u0DFF\u0E00-\u0EFF\u0F00-\u0FFF\u1000-\u109F\u1780-\u17FF\u0600-\u06FF\u0750-\u077F]/;

  /**
   * First grapheme of a title, upper-cased where the script has case.
   *
   * Uses Intl.Segmenter so a surrogate pair or a combining sequence is never cut
   * in half — the same reason script.js reaches for it in the flair layer.
   */
  function firstGrapheme(title, locale) {
    const s = String(title).trim();
    if (!s) return '#';
    let g = s;
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const seg = new Intl.Segmenter(locale, { granularity: 'grapheme' });
      const it = seg.segment(s)[Symbol.iterator]().next();
      if (!it.done) g = it.value.segment;
    } else {
      g = Array.from(s)[0];
    }
    const cp = g.codePointAt(0);
    if (cp >= 0xAC00 && cp <= 0xD7A3) {
      const cho = HANGUL_CHO[Math.floor((cp - 0xAC00) / 588)];
      return HANGUL_CHO_BASE[cho] || cho;
    }
    if (VOWEL_SIGN_SCRIPTS.test(g)) {
      // Drop the vowel signs, keep the consonant the reader would look under.
      const base = g.normalize('NFD').replace(/\p{M}/gu, '');
      if (base) g = base;
    }
    return g.toLocaleUpperCase(locale);
  }

  /**
   * A DOM-id-safe token for a bucket.
   *
   * Latin letters and digits pass through so `#lib-letter-A` keeps working and
   * existing anchors stay valid; anything else becomes its codepoints in hex,
   * which is stable, collision-free and valid in both an `id` and a fragment.
   */
  function bucketId(grapheme) {
    if (/^[A-Za-z0-9]$/.test(grapheme)) return grapheme.toUpperCase();
    return 'u' + Array.from(grapheme)
      .map(function (c) { return c.codePointAt(0).toString(16); })
      .join('-');
  }

  function collator(locale) {
    try {
      return new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
    } catch (e) {
      return new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
    }
  }

  /** Group items into ordered buckets keyed by first grapheme. */
  function bucketize(items, locale) {
    const cmp = collator(locale);
    const groups = new Map();
    items.forEach(function (item) {
      const g = firstGrapheme(item.title, locale);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(item);
    });
    const keys = Array.from(groups.keys()).sort(cmp.compare);
    return keys.map(function (k) {
      return {
        grapheme: k,
        id: bucketId(k),
        items: groups.get(k).slice().sort(function (a, b) {
          return cmp.compare(a.title, b.title);
        }),
      };
    });
  }

  /**
   * Render the whole directory to a markup string.
   *
   * Pure: no DOM access, so the Node build step can call it to pre-render.
   */
  function renderDirectory(cfg, items) {
    const i18n = cfg.i18n || {};
    const base = cfg.basePath;
    let html = '';

    bucketize(items, cfg.locale).forEach(function (bucket) {
      html += '<section class="lib-letter-section" id="lib-letter-' + bucket.id +
        '" aria-labelledby="lib-letter-heading-' + bucket.id + '">';
      html += '<h2 class="lib-letter-heading" id="lib-letter-heading-' + bucket.id + '">' +
        '<span class="letter">' + escHtml(bucket.grapheme) + '</span>' +
        '<span class="lcount">(' + bucket.items.length + ')</span></h2>';

      bucket.items.forEach(function (item, idx) {
        const titleId = 'lib-entry-title-' + bucket.id + '-' + idx;
        const tags = [];

        function tagBtn(filterKey, val, extraClass) {
          const cls = 'lib-entry-tag' + (extraClass ? ' ' + extraClass : '');
          const label = (i18n.filterBy || 'Filter') + ': ' + val;
          return '<button type="button" class="' + cls + '"' +
            ' data-filter="' + escHtml(filterKey) + '"' +
            ' data-value="' + escHtml(val) + '"' +
            ' aria-label="' + escHtml(label) + '">' +
            escHtml(val) + '</button>';
        }

        if (item.type) tags.push(tagBtn('type', item.type, 'is-type'));
        (item.useCases || []).slice(0, 3).forEach(function (uc) {
          tags.push(tagBtn('useCases', uc));
        });
        (item.platforms || []).slice(0, 2).forEach(function (pl) {
          tags.push(tagBtn('platforms', pl));
        });

        html += '<article class="lib-entry">';
        html += '<h3 class="lib-entry-title" id="' + titleId + '">' +
          '<a class="lib-entry-title-link" href="' + base + encodeURIComponent(item.slug) + '/">' +
          escHtml(item.title) + '</a></h3>';
        html += '<p class="lib-entry-desc">' + escHtml(item.description || '') + '</p>';
        if (item.preview) {
          html += '<span class="lib-entry-preview" aria-hidden="true">' +
            escHtml(item.preview) + '</span>';
        }
        if (tags.length) {
          html += '<div class="lib-entry-meta">' + tags.join('') + '</div>';
        }
        html += '</article>';
      });

      html += '</section>';
    });

    return html;
  }

  /** Distinct values for a facet, in first-seen order, with counts. */
  function vocabulary(items, key) {
    const counts = new Map();
    items.forEach(function (item) {
      const v = item[key];
      (Array.isArray(v) ? v : (v ? [v] : [])).forEach(function (val) {
        counts.set(val, (counts.get(val) || 0) + 1);
      });
    });
    return counts;
  }

  // ─── Browser mount ──────────────────────────────────────────────────────────

  function mount() {
    const cfg = (typeof window !== 'undefined') && window.UTG_LIBRARY_HUB;
    if (!cfg || !Array.isArray(cfg.items)) return;

    const $ = function (id) { return document.getElementById(id); };
    const dir = $('libDirectory');
    if (!dir) return;

    const i18n = cfg.i18n || {};
    const items = cfg.items;
    const state = { type: null, subject: null, useCases: null, platforms: null, q: '' };

    const FACETS = [
      { key: 'type',      container: 'libTypeFilters' },
      { key: 'subject',   container: 'libSubjectFilters' },
      { key: 'useCases',  container: 'libUseCaseFilters' },
      { key: 'platforms', container: 'libPlatformFilters' },
    ];

    function matches(item) {
      if (state.type && item.type !== state.type) return false;
      if (state.subject && item.subject !== state.subject) return false;
      if (state.useCases && (item.useCases || []).indexOf(state.useCases) === -1) return false;
      if (state.platforms && (item.platforms || []).indexOf(state.platforms) === -1) return false;
      if (state.q) {
        const hay = (item.title + ' ' + (item.description || '') + ' ' +
          (item.useCases || []).join(' ') + ' ' + (item.type || '')).toLocaleLowerCase(cfg.locale);
        if (hay.indexOf(state.q) === -1) return false;
      }
      return true;
    }

    function filtered() { return items.filter(matches); }

    function buildPills() {
      FACETS.forEach(function (facet) {
        const row = $(facet.container);
        if (!row) return;
        row.textContent = '';
        vocabulary(items, facet.key).forEach(function (count, val) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'lib-pill';
          btn.dataset.filter = facet.key;
          btn.dataset.value = val;
          btn.setAttribute('aria-pressed', 'false');
          btn.setAttribute('aria-label', (i18n.filterBy || 'Filter') + ': ' + val);
          btn.innerHTML = escHtml(val) + '<span class="lib-pill-count">' + count + '</span>';
          row.appendChild(btn);
        });
      });
    }

    function syncPills() {
      Array.prototype.forEach.call(document.querySelectorAll('.lib-pill'), function (btn) {
        const on = state[btn.dataset.filter] === btn.dataset.value;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    function buildAlphaBar(list) {
      const bar = $('libAlphaBar');
      if (!bar) return;
      bar.textContent = '';
      bucketize(list, cfg.locale).forEach(function (bucket) {
        const a = document.createElement('a');
        a.className = 'lib-alpha-btn';
        a.href = '#lib-letter-' + bucket.id;
        a.setAttribute('aria-label', bucket.grapheme + ' — ' + bucket.items.length);
        a.innerHTML = escHtml(bucket.grapheme) +
          '<span class="alpha-count">' + bucket.items.length + '</span>';
        bar.appendChild(a);
      });
    }

    function render() {
      const list = filtered();
      syncPills();
      buildAlphaBar(list);

      const countEl = $('libResultCount');
      if (countEl) {
        const any = state.type || state.subject || state.useCases || state.platforms || state.q;
        countEl.hidden = !any;
        countEl.textContent = any
          ? String(i18n.resultCount || '{shown}/{total}')
              .replace('{shown}', list.length).replace('{total}', items.length)
          : '';
      }

      const empty = $('libEmpty');
      if (empty) empty.hidden = list.length !== 0;

      dir.innerHTML = renderDirectory(cfg, list);
    }

    function clearAll() {
      state.type = state.subject = state.useCases = state.platforms = null;
      state.q = '';
      const search = $('libSearch');
      if (search) search.value = '';
      render();
    }

    const search = $('libSearch');
    if (search) {
      search.addEventListener('input', function () {
        state.q = search.value.trim().toLocaleLowerCase(cfg.locale);
        render();
      });
    }

    // One delegated handler covers both the filter pills and the per-entry tags,
    // so tags rendered after a filter change stay live without re-binding.
    document.addEventListener('click', function (e) {
      const btn = e.target.closest && e.target.closest('.lib-pill, .lib-entry-tag');
      if (!btn) return;
      const key = btn.dataset.filter;
      const val = btn.dataset.value;
      if (!key) return;
      state[key] = state[key] === val ? null : val;
      render();
    });

    const clearBtn = $('libClearFilters');
    if (clearBtn) clearBtn.addEventListener('click', clearAll);
    const emptyReset = $('libEmptyReset');
    if (emptyReset) emptyReset.addEventListener('click', clearAll);

    const backTop = $('libBackTop');
    if (backTop) {
      window.addEventListener('scroll', function () {
        backTop.classList.toggle('is-visible', window.scrollY > 800);
      }, { passive: true });
      backTop.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    buildPills();
    render();
    injectItemListJsonLd(cfg);
  }

  /** ItemList JSON-LD describing the full (unfiltered) hub inventory. */
  function injectItemListJsonLd(cfg) {
    if (typeof document === 'undefined') return;
    const origin = (typeof location !== 'undefined' && location.origin) || '';
    const data = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: cfg.items.map(function (item, idx) {
        return {
          '@type': 'ListItem',
          position: idx + 1,
          name: item.title,
          url: origin + cfg.basePath + item.slug + '/',
        };
      }),
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  return {
    I18N_KEYS: I18N_KEYS,
    escHtml: escHtml,
    firstGrapheme: firstGrapheme,
    bucketId: bucketId,
    bucketize: bucketize,
    vocabulary: vocabulary,
    renderDirectory: renderDirectory,
    mount: mount,
  };
});
