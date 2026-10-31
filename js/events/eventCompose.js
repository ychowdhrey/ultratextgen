/* ==========================================================================
   UltraTextGen — eventCompose.js
   The one place an event page's outputs are built: occasion compositions
   (frames, charm stacks, banners, sprinkles, couple lines), hand-off URLs into
   the generators and printable makers, and the markup of every card and tile
   the event sections show.

   It has two callers and they must agree byte for byte:

     - js/events/eventPageController.js, in the browser, re-renders the live
       sections on every keystroke;
     - scripts/lib/event-prerender.js, at build time, runs THIS file in a Node
       vm to write the same sections into the static HTML, so a crawler that
       runs no JavaScript sees the page's real payload.

   A second copy of this logic in the build script would drift from the first
   and nothing would report it, so there is none: change it here.

   Pure functions only. Nothing here touches the DOM, storage or analytics;
   the caller passes in the renderer, the style registry and the decorator
   engine (`deps`).

   Exposes window.UTGEventCompose:
     compose(cfg, text, partner, intensity, seed, deps) -> [{id, label, recipe, text}]
     handoffHref(handoff, target, text, partner)        -> "/path/?a=b"
     styleLabel(key, words)                             -> "Script Bold"
     html.* (string builders, all escaped)
   ========================================================================== */

(function () {
  "use strict";

  /* Recipe ids in the spec -> the label the decorator engine stamps on each
     result (js/decorator/decoratorEngine.js RECIPES). */
  const RECIPE_LABEL = {
    classic: "Classic",
    stacked: "Stacked",
    layered: "Layered",
    banner: "Banner",
    interleave: "Rhythm"
  };

  function graphemes(str) {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      return Array.from(new Intl.Segmenter("en", { granularity: "grapheme" }).segment(str),
        function (s) { return s.segment; });
    }
    return Array.from(str);
  }

  function styled(text, key, deps) {
    if (!key || !text) return text;
    const style = deps.styles && deps.styles[key];
    if (!style) return text;
    try { return deps.renderAny(text, style); } catch (e) { return text; }
  }

  /* One composition card per entry in cfg.cards, each a named recipe from the
     shared decorator engine run on an occasion theme the spec supplies.

     With a partner name and a `couple` block, the text becomes the couple line
     "A <joiner> B" and the sprinkle card (which would weave more joiners
     between the names: "Maya ♡ ♡ ♡ Sam") is replaced by the bare couple line.

     Deterministic: the same text, intensity and seed give the same cards, so
     typing never reshuffles and "Another one" (seed + 1) always changes them. */
  function compose(cfg, text, partner, intensity, seed, deps) {
    if (!cfg || !cfg.cards || !deps || !deps.engine) return [];
    const raw = String(text || "").trim();
    if (!raw) return [];
    const pair = String(partner || "").trim();
    const couple = pair && cfg.couple ? cfg.couple : null;
    const level = Math.min(3, Math.max(1, intensity | 0 || 2));
    const out = [];

    cfg.cards.forEach(function (card, i) {
      if (couple && card.recipe === "interleave") {
        const cs = couple.style || card.style;
        out.push({
          id: "couple",
          label: couple.label || "Couple",
          recipe: "couple",
          text: styled(raw, cs, deps) + " " + couple.joiner + " " + styled(pair, cs, deps)
        });
        return;
      }
      let base = styled(raw, card.style, deps);
      if (couple) base = base + " " + couple.joiner + " " + styled(pair, card.style, deps);

      const want = RECIPE_LABEL[card.recipe];
      const scopes = [card.scope || "text"];
      // A sprinkle needs two words; on a single name it sprinkles the letters.
      if (card.recipe === "interleave" && scopes[0] !== "letters") scopes.push("letters");

      let hit = null;
      for (let s = 0; s < scopes.length && !hit; s++) {
        const results = deps.engine.generate(base, {
          theme: cfg.theme.key,
          intensity: level,
          seed: (seed | 0) * 31 + i,
          perTheme: 10,
          scope: scopes[s]
        });
        for (let r = 0; r < results.length; r++) {
          if (results[r].recipe === want) { hit = results[r]; break; }
        }
      }
      if (hit) out.push({ id: card.id, label: card.label, recipe: card.recipe, text: hit.text });
    });
    return out;
  }

  /* --------------------------------------------------------------------------
     Hand-offs. A hand-off is a link to the page that owns the next job (a
     printable maker, the text decorator, the zalgo tool), prefilled from the
     visitor's text. `target` comes from data/event_capabilities.json and says
     which parameter that page reads; `handoff` comes from the event spec and
     says what to send.

     The static href (no visitor text) carries only fixed data, never a name.
     -------------------------------------------------------------------------- */
  function clip(str, max) {
    if (!max) return str;
    const g = graphemes(str);
    return g.length > max ? g.slice(0, max).join("").trim() : str;
  }

  function handoffText(handoff, target, text, partner) {
    const typed = String(text || "").trim();
    let value;
    if (handoff.text === "fixed") value = handoff.fixed_text || "";
    else if (typed) {
      const pair = String(partner || "").trim();
      const template = (pair && handoff.pair_template) || handoff.text_template;
      value = template ? template.replace("{text}", typed).replace("{partner}", pair).trim() : typed;
    } else value = handoff.fallback_text || "";
    if (handoff.upper) value = value.toUpperCase();
    return clip(value, target.max_len);
  }

  function handoffHref(handoff, target, text, partner) {
    const parts = [];
    if (target.text_param) {
      const value = handoffText(handoff, target, text, partner);
      if (value) parts.push(target.text_param + "=" + encodeURIComponent(value));
    }
    const params = handoff.params || {};
    Object.keys(params).forEach(function (k) {
      const v = params[k];
      if (Array.isArray(v)) {
        parts.push(k + "=" + v.map(function (w) { return encodeURIComponent(w); }).join("|"));
      } else if (v != null && v !== "") {
        parts.push(k + "=" + encodeURIComponent(String(v)));
      }
    });
    return target.path + (parts.length ? "?" + parts.join("&") : "");
  }

  /* "Ultra Script Bold" -> "Script Bold"; then each word through the page's
     own translation table, so a Spanish page says "Cursiva Negrita". The
     registry key itself stays the analytics value (data-style). */
  function styleLabel(key, words) {
    const base = String(key).replace(/^Ultra\s+/, "");
    if (!words) return base;
    return base.split(/\s+/).map(function (w) {
      return Object.prototype.hasOwnProperty.call(words, w) ? words[w] : w;
    }).filter(Boolean).join(" ");
  }

  /* --------------------------------------------------------------------------
     Markup. Every builder escapes what it is given.
     -------------------------------------------------------------------------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function attr(s) {
    return esc(s).replace(/"/g, "&quot;");
  }

  const html = {
    esc: esc,
    attr: attr,

    compositionCard: function (card, ui) {
      const copy = (ui && ui.copyButton) || "Copy";
      const aria = ((ui && ui.copyAriaPrefix) || "Copy ") + card.label;
      return '<div class="event-comp-card" data-recipe="' + attr(card.recipe) + '">' +
        '<p class="event-comp-label">' + esc(card.label) + "</p>" +
        '<p class="event-comp-text" dir="auto">' + esc(card.text) + "</p>" +
        '<div class="event-comp-actions">' +
        '<button type="button" class="event-comp-copy" data-card="' + attr(card.id) +
        '" data-recipe="' + attr(card.recipe) + '" data-text="' + attr(card.text) +
        '" aria-label="' + attr(aria) + '">' + esc(copy) + "</button>" +
        "</div></div>";
    },

    fontCard: function (label, text, key, ui) {
      const copy = (ui && ui.copyButton) || "Copy";
      return '<div class="style-card">' +
        '<div class="style-info"><p class="style-name">' + esc(label) + "</p>" +
        '<p class="style-preview">' + esc(text) + "</p></div>" +
        '<div class="style-actions"><button class="copy-btn" type="button" data-text="' +
        attr(text) + '" data-style="' + attr(key) + '">' + esc(copy) + "</button></div></div>";
    },

    handoffCard: function (h, href) {
      return '<a class="event-handoff" href="' + attr(href) + '" data-handoff="' + attr(h.id) +
        '" data-cta-path-only>' +
        '<span class="event-handoff-icon" aria-hidden="true">' + esc(h.icon || "→") + "</span>" +
        '<span class="event-handoff-body"><span class="event-handoff-title">' + esc(h.title) + "</span>" +
        '<span class="event-handoff-desc">' + esc(h.desc) + "</span></span></a>";
    },

    phraseChip: function (p) {
      return '<button type="button" class="event-chip" data-phrase="' + attr(p.text) + '">' +
        esc(p.text) + "</button>";
    },

    phraseCard: function (p) {
      const head = p.nativeScript || p.text;
      let out = '<button type="button" class="compare-card event-phrase-card" data-phrase="' +
        attr(p.text) + '"><h4>' + esc(head) + "</h4>";
      const same = function (a, b) { return a && b && a.trim().toLowerCase() === b.trim().toLowerCase(); };
      if (p.romanization && !same(p.romanization, head) && !same(p.romanization, p.text)) {
        out += "<p>" + esc(p.romanization) + "</p>";
      }
      if (p.translation && !same(p.translation, head) && !same(p.translation, p.text)) {
        out += '<p class="u-secondary-tight">' + esc(p.translation) + "</p>";
      }
      return out + "</button>";
    },

    nativeTile: function (p, ui) {
      let out = '<button type="button" class="glyph-copy event-native-tile" data-text="' +
        attr(p.nativeScript) + '" aria-label="' + attr(((ui && ui.copyAriaPrefix) || "Copy ") + p.nativeScript) + '">' +
        '<span class="event-native-script" dir="auto">' + esc(p.nativeScript) + "</span>";
      if (p.romanization) out += '<span class="event-native-roman">' + esc(p.romanization) + "</span>";
      return out + "</button>";
    },

    glyphTile: function (text, label, ui) {
      return '<button type="button" class="glyph-copy" data-text="' + attr(text) + '"' +
        (label ? ' aria-label="' + attr(((ui && ui.copyAriaPrefix) || "Copy ") + label) + '"' : "") +
        ">" + esc(text) + "</button>";
    },

    asciiCard: function (piece, ui) {
      const label = piece.label || (ui && ui.asciiArtDefaultLabel) || "ASCII art";
      const copy = (ui && ui.copyButton) || "Copy";
      return '<div class="art-piece-card"><div class="art-piece-head">' +
        '<span class="art-piece-label">' + esc(label) + "</span>" +
        '<button type="button" class="art-piece-copy" data-label="' + attr(label) + '" aria-label="' +
        attr(((ui && ui.copyAriaPrefix) || "Copy ") + label) + '">' + esc(copy) + "</button></div>" +
        '<div class="art-piece-body"><pre class="art-piece-pre">' + esc(piece.art) + "</pre></div></div>";
    }
  };

  window.UTGEventCompose = {
    RECIPE_LABEL: RECIPE_LABEL,
    compose: compose,
    handoffHref: handoffHref,
    handoffText: handoffText,
    styleLabel: styleLabel,
    graphemes: graphemes,
    html: html
  };
})();
