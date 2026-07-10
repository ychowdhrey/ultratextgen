/* ==========================================================================
   UltraTextGen — kaomojiDecoderController.js
   Controller for the kaomoji decoder / dictionary. Takes a pasted face and
   reports: a name (if known), a plain-English meaning, mood tags, and a
   part-by-part construction breakdown. Reuses window.UTG_KAOMOJI_DATA (part
   banks, for mood detection) and window.UTG_KAOMOJI_DICT (named faces +
   glyph meanings). Clipboard + toast come from symbol-explorer.js.
   ========================================================================== */

(function () {
  "use strict";

  var DATA = window.UTG_KAOMOJI_DATA;
  var DICT = window.UTG_KAOMOJI_DICT;
  if (!DATA || !DICT) return;

  var I18N = window.kaomojiI18n || {};
  function t(key, fallback) { return (typeof I18N[key] === "string") ? I18N[key] : fallback; }

  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var MOOD_LABEL = {};
  (DATA.MOODS || []).forEach(function (m) { MOOD_LABEL[m.id] = m.label; });

  var refs = {};

  /* ---- matching helpers -------------------------------------------------- */
  function collapse(s) { return s.replace(/\s+/g, ""); }

  function findNamed(face) {
    var f = face.trim();
    var byExact = DICT.NAMED.filter(function (n) { return n.face === f; })[0];
    if (byExact) return byExact;
    var cf = collapse(f);
    return DICT.NAMED.filter(function (n) { return collapse(n.face) === cf; })[0] || null;
  }

  /* Glyphs that carry a mood, gathered from the generator's part banks. */
  function detectMoods(face) {
    var tally = {};
    ["eyes", "mouths", "cheeks", "arms", "decorations"].forEach(function (cat) {
      (DATA.PARTS[cat] || []).forEach(function (p) {
        var glyphs = [p.l, p.r, p.c].filter(function (g) { return g && g.length; });
        var hit = glyphs.some(function (g) { return face.indexOf(g) !== -1; });
        if (!hit) return;
        (p.m || []).forEach(function (mid) {
          if (mid === "*") return;
          tally[mid] = (tally[mid] || 0) + 1;
        });
      });
    });
    return tally;
  }

  /* Recognisable components, richest (longest) key first, de-duplicated. */
  function components(face) {
    var keys = Object.keys(DICT.CHARS).sort(function (a, b) { return b.length - a.length; });
    var out = [];
    var seen = {};
    keys.forEach(function (k) {
      if (!k.trim()) return;
      if (face.indexOf(k) === -1) return;
      if (seen[k]) return;
      seen[k] = true;
      out.push({ char: k, role: DICT.CHARS[k].role, meaning: DICT.CHARS[k].meaning });
    });
    return out.slice(0, 8);
  }

  function moodChips(tally, namedMood) {
    var ids = Object.keys(tally).sort(function (a, b) { return tally[b] - tally[a]; });
    if (namedMood && ids.indexOf(namedMood) === -1) ids.unshift(namedMood);
    else if (namedMood) { ids.splice(ids.indexOf(namedMood), 1); ids.unshift(namedMood); }
    return ids.slice(0, 3);
  }

  /* ---- render ------------------------------------------------------------ */
  function decode(face) {
    face = (face || "").trim();
    refs.result.innerHTML = "";
    if (!face) {
      refs.result.appendChild(el("p", "kao-dec-empty", t("decEmpty", "Paste a kaomoji above to decode it.")));
      return;
    }

    var named = findNamed(face);
    var comps = components(face);
    var moods = moodChips(detectMoods(face), named && named.mood);

    var panel = el("div", "kao-dec-panel");

    // face + name
    panel.appendChild(el("div", "kao-dec-face", face));
    panel.appendChild(el("h2", "kao-dec-name", named ? named.name : t("decCustom", "Custom kaomoji")));

    // meaning
    var meaningText;
    if (named) {
      meaningText = named.meaning;
    } else if (moods.length) {
      var labels = moods.map(function (m) { return (MOOD_LABEL[m] || m).toLowerCase(); });
      meaningText = t("decReads", "This isn't a named classic, but its parts read as ") + labels.join(", ") + ".";
    } else {
      meaningText = t("decUnknown", "A custom text face. Copy it, or remix it in the generator to make it your own.");
    }
    panel.appendChild(el("p", "kao-dec-meaning", meaningText));

    // mood chips
    if (moods.length) {
      var moodWrap = el("div", "kao-dec-moods");
      moodWrap.appendChild(el("span", "kao-dec-sublabel", t("decMood", "Mood")));
      moods.forEach(function (m) { moodWrap.appendChild(el("span", "kao-dec-mood", MOOD_LABEL[m] || m)); });
      panel.appendChild(moodWrap);
    }

    // breakdown
    if (comps.length) {
      panel.appendChild(el("span", "kao-dec-sublabel", t("decInside", "What's inside")));
      var list = el("ul", "kao-dec-parts");
      comps.forEach(function (c) {
        var li = el("li");
        li.appendChild(el("span", "kao-dec-glyph", c.char));
        li.appendChild(el("span", "kao-dec-role", c.role));
        li.appendChild(el("span", "kao-dec-desc", c.meaning));
        list.appendChild(li);
      });
      panel.appendChild(list);
    }

    // actions
    var actions = el("div", "kao-dec-actions");
    var copyBtn = el("button", "kao-btn kao-btn-primary", t("decCopy", "Copy Face"));
    copyBtn.type = "button";
    copyBtn.addEventListener("click", function () {
      if (window.UltraTextGen && window.UltraTextGen.copyText) window.UltraTextGen.copyText(face, copyBtn, face);
    });
    var remix = el("a", "kao-btn", t("decRemix", "Remix in Generator →"));
    remix.href = "/kaomoji-generator/?q=" + encodeURIComponent(face);
    actions.appendChild(copyBtn);
    actions.appendChild(remix);
    panel.appendChild(actions);

    // similar
    var top = moods[0];
    if (top) {
      var sim = DICT.NAMED.filter(function (n) { return n.mood === top && n.face !== face; }).slice(0, 4);
      if (sim.length) {
        panel.appendChild(el("span", "kao-dec-sublabel", t("decSimilar", "Similar faces")));
        var simWrap = el("div", "kao-dec-similar");
        sim.forEach(function (n) {
          var b = el("button", "kao-dec-sim", n.face);
          b.type = "button";
          b.title = n.name;
          b.addEventListener("click", function () { refs.input.value = n.face; decode(n.face); });
          simWrap.appendChild(b);
        });
        panel.appendChild(simWrap);
      }
    }

    refs.result.appendChild(panel);
  }

  /* ---- init -------------------------------------------------------------- */
  function init() {
    refs.input = $("#decoderInput");
    refs.result = $("#decoderResult");
    refs.examples = $("#decoderExamples");
    if (!refs.input || !refs.result) return;

    var btn = $("#decoderBtn");
    if (btn) btn.addEventListener("click", function () { decode(refs.input.value); });
    refs.input.addEventListener("input", function () { decode(refs.input.value); });
    refs.input.addEventListener("keydown", function (ev) { if (ev.key === "Enter") decode(refs.input.value); });

    // example chips from a spread of named faces
    if (refs.examples) {
      var picks = ["¯\\_(ツ)_/¯", "( ͡° ͜ʖ ͡°)", "ಠ_ಠ", "(╯°□°）╯︵ ┻━┻", "(◕‿◕)", "UwU", "ʕ•ᴥ•ʔ"];
      picks.forEach(function (f) {
        var b = el("button", "kao-dec-eg", f);
        b.type = "button";
        b.addEventListener("click", function () { refs.input.value = f; decode(f); });
        refs.examples.appendChild(b);
      });
    }

    // deep link ?q=<face>, else a friendly default
    var start = "";
    try { start = new URL(window.location.href).searchParams.get("q") || ""; } catch (e) {}
    if (start) { refs.input.value = start; decode(start); }
    else decode("¯\\_(ツ)_/¯");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
