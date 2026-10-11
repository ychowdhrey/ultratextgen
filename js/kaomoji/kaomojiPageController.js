/* ==========================================================================
   UltraTextGen — kaomojiPageController.js
   Controller for the kaomoji generator. Builds the part-picker UI, keeps a
   live preview, filters parts by mood ("mood dial"), auto-matches symmetric
   left/right pairs, does curated random faces, and copies the result.

   Reuses symbol-explorer.js for the clipboard + toast (window.UltraTextGen),
   and the ?q= share-URL pattern. Data comes from window.UTG_KAOMOJI_DATA.
   Loaded after the data module; suppresses the core generator via
   window.UTG_KAOMOJI_MODE.
   ========================================================================== */

(function () {
  "use strict";

  var DATA = window.UTG_KAOMOJI_DATA;
  if (!DATA) return;

  /* ---- i18n (optional, falls back to English) ---------------------------- */
  var I18N = window.kaomojiI18n || {};
  function t(key, fallback) {
    return (I18N && typeof I18N[key] === "string") ? I18N[key] : fallback;
  }

  /* ---- tiny DOM helpers -------------------------------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  /* ---- picker markup ------------------------------------------------------
     Everything between the markers below is ALSO evaluated at build time by
     scripts/build-kaomoji-generator-static.js, which writes the moods, presets
     and parts into kaomoji-generator/index.html as static HTML so crawlers that
     run no JavaScript see the tool. One definition serves both, so the static
     markup and the runtime markup cannot drift. Keep these functions pure:
     they may read DATA and t() and nothing else. Move the markers if you move
     the code; the build script throws when one is missing. */
  /* @kaomoji-markup:begin */
  /* The part categories, in the order they appear in the picker. */
  const ORDER = [
    { cat: "brackets",    label: "Face" },
    { cat: "eyes",        label: "Eyes" },
    { cat: "mouths",      label: "Mouth" },
    { cat: "cheeks",      label: "Cheeks" },
    { cat: "arms",        label: "Arms" },
    { cat: "decorations", label: "Extra" }
  ];

  function part(cat, id) {
    const list = DATA.PARTS[cat] || [];
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }

  /* arms.l + bracket.l + cheek.l + eye.l + mouth + eye.r + cheek.r
       + bracket.r + arms.r + decoration */
  function assembleFrom(s) {
    const b = part("brackets", s.brackets);
    const e = part("eyes", s.eyes);
    const mo = part("mouths", s.mouths);
    const c = part("cheeks", s.cheeks);
    const a = part("arms", s.arms);
    const d = part("decorations", s.decorations);
    return a.l + b.l + c.l + e.l + mo.c + e.r + c.r + b.r + a.r + (d.c || "");
  }

  function optionLabel(p) {
    if (p.id === "none") return "∅";
    if (p.label) return p.label;
    if (p.c != null) return p.c;
    return (p.l || "") + (p.r || "");
  }

  function escHtml(v) {
    return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function moodsHtml() {
    let html = '<button type="button" class="kao-mood is-active" data-mood="all" aria-pressed="true">' +
      escHtml(t("moodAll", "All")) + "</button>";
    DATA.MOODS.forEach(function (m) {
      html += '<button type="button" class="kao-mood" data-mood="' + escHtml(m.id) +
        '" aria-pressed="false">' + escHtml(m.label) + "</button>";
    });
    return html;
  }

  function presetsHtml() {
    let html = "";
    DATA.PRESETS.forEach(function (preset, i) {
      const face = assembleFrom(Object.assign({}, DEFAULT_SEL, preset.parts));
      html += '<button type="button" class="kao-preset" data-preset="' + i + '">' +
        '<span class="kao-preset-face">' + escHtml(face) + "</span>" +
        '<span class="kao-preset-label">' + escHtml(preset.label) + "</span></button>";
    });
    return html;
  }

  function partsHtml() {
    let html = "";
    ORDER.forEach(function (row) {
      html += '<div class="kao-part-row"><span class="kao-part-label">' +
        escHtml(t("part_" + row.cat, row.label)) + '</span><div class="kao-part-options">';
      (DATA.PARTS[row.cat] || []).forEach(function (p) {
        html += '<button type="button" class="kao-part-opt" data-cat="' + escHtml(row.cat) +
          '" data-id="' + escHtml(p.id) + '" aria-label="' +
          escHtml(row.label + ": " + (p.label || p.c || p.id)) + '">' +
          escHtml(optionLabel(p)) + "</button>";
      });
      html += "</div></div>";
    });
    return html;
  }

  const DEFAULT_SEL = { brackets: "round", eyes: "happy", mouths: "omega", cheeks: "none", arms: "none", decorations: "none" };
  /* @kaomoji-markup:end */

  /* ---- generator-step telemetry -------------------------------------------
     One kaomoji_generator_step row per deliberate action, so the funnel from
     "opened the tool" to "copied a face" can be read. Pure, so header.test.js
     slices this block out and asserts what leaves the page.

     kaomoji_step is a short enum. kaomoji_value is a catalogue id and only for
     the three steps that pick one: a mood id, a preset id, a part category id.
     NEVER the face. Visitors paste and type faces (and sometimes more), so the
     value of every other step is cleared, and an id that is not made of id
     characters is cleared too, so a typed string cannot get through by accident.
     Both keys are always present; undefined clears a key GTM would otherwise
     carry over from the previous row. */
  /* @kaomoji-step:begin */
  const STEPS_WITH_VALUE = { mood: 1, preset: 1, part: 1 };
  const STEPS_WITHOUT_VALUE = { surprise: 1, reset: 1, recent: 1, paste_edit: 1, url_load: 1 };

  function presetId(preset, index) {
    const slug = String((preset && preset.label) || "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return slug || "preset_" + index;
  }

  function stepPayload(step, value) {
    const known = Object.prototype.hasOwnProperty.call(STEPS_WITH_VALUE, step) ||
      Object.prototype.hasOwnProperty.call(STEPS_WITHOUT_VALUE, step);
    if (!known) return null;
    const keep = Object.prototype.hasOwnProperty.call(STEPS_WITH_VALUE, step) &&
      typeof value === "string" && /^[a-z0-9_-]{1,40}$/i.test(value);
    return {
      event: "kaomoji_generator_step",
      kaomoji_step: step,
      kaomoji_value: keep ? value : undefined
    };
  }
  /* @kaomoji-step:end */

  function trackStep(step, value) {
    const payload = stepPayload(step, value);
    if (!payload) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  }

  /* Current selection (part ids per category), active mood, and any freeform
     override the visitor typed/pasted into the face field. */
  var sel = Object.assign({}, DEFAULT_SEL);
  var activeMood = "all";
  var freeform = null;

  var refs = {};

  /* ---- recently made faces (localStorage, like the site's other "recent"
     lists) ---------------------------------------------------------------- */
  var RECENT_KEY = "utg_kaomoji_recent";
  var RECENT_MAX = 8;

  function loadRecent() {
    try {
      var list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function pushRecent(face) {
    if (!face) return;
    var list = loadRecent().filter(function (f) { return f !== face; });
    list.unshift(face);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX))); } catch (e) { /* no-op */ }
    renderRecent();
  }
  function renderRecent() {
    if (!refs.recent) return;
    var list = loadRecent();
    refs.recent.innerHTML = "";
    if (refs.recentWrap) refs.recentWrap.classList.toggle("u-hidden", !list.length);
    list.forEach(function (face) {
      var b = el("button", "kao-recent-face", face);
      b.type = "button";
      b.setAttribute("aria-label", t("loadFace", "Load face") + ": " + face);
      b.addEventListener("click", function () {
        freeform = face;
        render();
        syncUrl(face);
        trackStep("recent");
      });
      refs.recent.appendChild(b);
    });
  }

  function fitsMood(p, mood) {
    if (mood === "all") return true;
    var m = p.m || [];
    return m.indexOf("*") !== -1 || m.indexOf(mood) !== -1;
  }

  /* ---- assemble the face from the current selection ---------------------- */
  function assemble() { return assembleFrom(sel); }

  /* The face currently shown/copied: freeform text if the visitor edited it,
     otherwise the assembled face. */
  function currentFace() {
    return (freeform != null) ? freeform : assemble();
  }

  /* ---- platform-compatibility hint -------------------------------------- */
  /* Three different ways a face can arrive changed, each named on the page's
     FAQ ("Will my kaomoji work everywhere?"): stacked combining marks that
     shift on older iOS, characters from scripts a device may have no font for
     (drawn as a box), and characters Discord and Reddit read as formatting. */
  const RISKY = /[̀-ͯ҃-҉᪰-᫿᷀-᷿⃐-⃿︠-︯]/;
  const SCRIPTS = [
    ["Arabic", /[\u0600-\u06FF]/],
    ["Thai", /[\u0E00-\u0E7F]/],
    ["Gujarati", /[\u0A80-\u0AFF]/],
    ["Kannada", /[\u0C80-\u0CFF]/],
    ["Tibetan", /[\u0F00-\u0FFF]/],
    ["Canadian syllabics", /[\u1400-\u167F\u18B0-\u18FF]/],
    ["Cherokee", /[\u13A0-\u13FF]/],
    ["Yi", /[\uA000-\uA4CF]/]
  ];
  /* Underscores and asterisks italicise, a backslash escapes, a leading > quotes. */
  const MARKDOWN = /[_*\\]|^>/;
  function scriptsIn(face) {
    const found = [];
    for (let i = 0; i < SCRIPTS.length; i++) {
      if (SCRIPTS[i][1].test(face)) found.push(SCRIPTS[i][0]);
    }
    return found;
  }
  function updateHint(face) {
    if (!refs.hint) return;
    const notes = [];
    if (RISKY.test(face)) {
      notes.push(t("hintMarks", "Stacked marks can shift on older iOS or in some apps."));
    }
    const scripts = scriptsIn(face);
    if (scripts.length) {
      notes.push(t("hintScript", "Uses letters from {scripts}; a device without a font for them shows a box.")
        .replace("{scripts}", scripts.join(", ")));
    }
    if (MARKDOWN.test(face)) {
      notes.push(t("hintMarkdown", "Discord and Reddit read _ * \\ and a leading > as formatting; wrapping the face in backticks keeps every character."));
    }
    if (notes.length) {
      refs.hint.textContent = notes.join(" ");
      refs.hint.classList.add("is-risky");
    } else {
      refs.hint.textContent = t("hintSafe", "No stacked marks, rare-script letters or formatting characters in this face.");
      refs.hint.classList.remove("is-risky");
    }
  }

  /* ---- render ------------------------------------------------------------ */
  function render() {
    var face = currentFace();
    if (refs.preview) refs.preview.textContent = face || " ";
    if (refs.faceInput && document.activeElement !== refs.faceInput) refs.faceInput.value = face;
    updateHint(face);
    // reflect selection + mood filtering on the option tiles
    var opts = refs.parts.querySelectorAll(".kao-part-opt");
    for (var i = 0; i < opts.length; i++) {
      var o = opts[i];
      var cat = o.getAttribute("data-cat");
      var id = o.getAttribute("data-id");
      var isSelected = freeform == null && sel[cat] === id;
      o.classList.toggle("is-selected", isSelected);
      o.classList.toggle("is-hidden", !fitsMood(part(cat, id), activeMood));
      o.setAttribute("aria-pressed", isSelected ? "true" : "false");
    }
  }

  /* Push the current face to the URL so it can be shared / linked ("edit in
     generator" deep links land here). */
  function syncUrl(face) {
    if (!window.history || !window.history.replaceState) return;
    try {
      var u = new URL(window.location.href);
      if (face) u.searchParams.set("q", face); else u.searchParams.delete("q");
      window.history.replaceState(null, "", u);
    } catch (e) { /* no-op */ }
  }

  /* ---- selection actions ------------------------------------------------- */
  function selectPart(cat, id) {
    freeform = null;
    sel[cat] = id;
    render();
  }

  /* Curated random: pick a coherent face, honouring the active mood. Optional
     categories (cheeks/arms/extra) are often left empty so faces stay clean. */
  function pick(cat, mood, allowNone) {
    var list = DATA.PARTS[cat].filter(function (p) { return fitsMood(p, mood); });
    var noneAble = list.filter(function (p) { return p.id !== "none"; });
    if (allowNone && Math.random() < 0.5) return "none";
    var pool = noneAble.length ? noneAble : list;
    if (!pool.length) return list[0] ? list[0].id : "none";
    return pool[Math.floor(Math.random() * pool.length)].id;
  }
  function randomFace(mood) {
    freeform = null;
    sel.brackets = pick("brackets", mood, false);
    sel.eyes = pick("eyes", mood, false);
    sel.mouths = pick("mouths", mood, false);
    sel.cheeks = pick("cheeks", mood, true);
    sel.arms = pick("arms", mood, true);
    sel.decorations = pick("decorations", mood, true);
    render();
  }

  /* Reflect the active mood in the URL (?mood=<id>) so a mood can be linked
     to and shared; "all" clears it. */
  function syncMoodUrl(mood) {
    if (!window.history || !window.history.replaceState) return;
    try {
      var u = new URL(window.location.href);
      if (mood && mood !== "all") u.searchParams.set("mood", mood); else u.searchParams.delete("mood");
      window.history.replaceState(null, "", u);
    } catch (e) { /* no-op */ }
  }

  function isMood(id) {
    return id === "all" || DATA.MOODS.some(function (m) { return m.id === id; });
  }

  function markMood(mood) {
    activeMood = mood;
    syncMoodUrl(mood);
    var chips = refs.moods.querySelectorAll(".kao-mood");
    for (var i = 0; i < chips.length; i++) {
      var isActive = chips[i].getAttribute("data-mood") === mood;
      chips[i].classList.toggle("is-active", isActive);
      chips[i].setAttribute("aria-pressed", isActive ? "true" : "false");
    }
  }

  function setMood(mood) {
    markMood(mood);
    // A mood is a dial: reselect a coherent face in that mood (unless "All").
    if (mood !== "all") randomFace(mood); else render();
  }

  function applyPreset(preset) {
    freeform = null;
    var keys = Object.keys(preset.parts);
    for (var i = 0; i < keys.length; i++) sel[keys[i]] = preset.parts[keys[i]];
    render();
  }

  function copyFace(btn) {
    var face = currentFace();
    if (!face) return;
    if (window.UltraTextGen && window.UltraTextGen.copyText) {
      // Its own method: a generator copy is not a library-tile copy, and the
      // face may be text the visitor typed, so copy_item stays empty for it.
      window.UltraTextGen.copyText(face, btn, face, "kaomoji_generator");
    }
    syncUrl(face);
    pushRecent(face);
  }

  /* Copy the shareable ?q= link (not the face text) so a creation can be
     handed off/posted, same job as a competitor's "unique URL" callout. */
  function copyLink(btn) {
    var face = currentFace();
    if (!face) return;
    syncUrl(face);
    if (window.UltraTextGen && window.UltraTextGen.copyText) {
      // The payload is the page URL, never catalogue content.
      window.UltraTextGen.copyText(window.location.href, btn, t("linkCopied", "link"), "kaomoji_link");
    }
    pushRecent(face);
  }

  /* ---- UI construction --------------------------------------------------- */
  /* The moods, presets and parts are pre-rendered into the page by
     scripts/build-kaomoji-generator-static.js. Adopt that markup when it is
     there; build it from the same functions when it is not (a page that was
     never built, or a stale copy). Clicks are delegated, so either way the
     wiring is identical. */
  function fill(container, selector, html) {
    if (!container.querySelector(selector)) container.innerHTML = html;
  }

  function buildMoods() {
    fill(refs.moods, ".kao-mood", moodsHtml());
    refs.moods.addEventListener("click", function (ev) {
      const chip = ev.target.closest(".kao-mood");
      if (chip) {
        setMood(chip.getAttribute("data-mood"));
        trackStep("mood", chip.getAttribute("data-mood"));
      }
    });
  }

  function buildParts() {
    fill(refs.parts, ".kao-part-opt", partsHtml());
    refs.parts.addEventListener("click", function (ev) {
      const opt = ev.target.closest(".kao-part-opt");
      if (opt) {
        selectPart(opt.getAttribute("data-cat"), opt.getAttribute("data-id"));
        trackStep("part", opt.getAttribute("data-cat"));
      }
    });
  }

  function buildPresets() {
    if (!refs.presets) return;
    fill(refs.presets, ".kao-preset", presetsHtml());
    refs.presets.addEventListener("click", function (ev) {
      const btn = ev.target.closest(".kao-preset");
      const index = btn ? Number(btn.getAttribute("data-preset")) : -1;
      const preset = btn && DATA.PRESETS[index];
      if (preset) {
        applyPreset(preset);
        trackStep("preset", presetId(preset, index));
      }
    });
  }

  /* ---- init -------------------------------------------------------------- */
  function init() {
    refs.preview    = $("#kaomojiPreview");
    refs.faceInput  = $("#kaomojiFaceInput");
    refs.parts      = $("#kaomojiParts");
    refs.moods      = $("#kaomojiMoods");
    refs.presets    = $("#kaomojiPresets");
    refs.hint       = $("#kaomojiHint");
    refs.recent     = $("#kaomojiRecent");
    refs.recentWrap = $("#kaomojiRecentWrap");
    if (!refs.preview || !refs.parts || !refs.moods) return;

    buildMoods();
    buildParts();
    buildPresets();
    renderRecent();

    // Deep links: ?q=<face> preloads the face ("edit in generator");
    // ?mood=<id> opens the generator on that mood, e.g. from a subject page.
    var linkedMood = null;
    try {
      var params = new URL(window.location.href).searchParams;
      var q = params.get("q");
      if (q) freeform = q;
      var m = params.get("mood");
      if (m && m !== "all" && isMood(m)) linkedMood = m;
    } catch (e) { /* no-op */ }

    var copyBtn = $("#kaomojiCopyBtn");
    if (copyBtn) copyBtn.addEventListener("click", function () { copyFace(copyBtn); });

    var copyLinkBtn = $("#kaomojiCopyLinkBtn");
    if (copyLinkBtn) copyLinkBtn.addEventListener("click", function () { copyLink(copyLinkBtn); });

    var surprise = $("#kaomojiSurpriseBtn");
    if (surprise) surprise.addEventListener("click", function () {
      randomFace(activeMood);
      trackStep("surprise");
    });

    var clear = $("#kaomojiClearBtn");
    if (clear) clear.addEventListener("click", function () {
      activeMood = "all";
      setMood("all");
      sel = Object.assign({}, DEFAULT_SEL);
      freeform = null;
      render();
      syncUrl("");
      trackStep("reset");
    });

    if (refs.faceInput) {
      // One paste_edit per settled edit, not per keystroke. The row says an
      // edit happened; it never carries what was typed.
      let editTimer = null;
      refs.faceInput.addEventListener("input", function () {
        clearTimeout(editTimer);
        editTimer = setTimeout(function () { trackStep("paste_edit"); }, 800);
        freeform = refs.faceInput.value;
        if (refs.preview) refs.preview.textContent = freeform || " ";
        updateHint(freeform);
        // typed text detaches from the part tiles
        var opts = refs.parts.querySelectorAll(".kao-part-opt.is-selected");
        for (var i = 0; i < opts.length; i++) opts[i].classList.remove("is-selected");
      });
    }

    // A face arriving by ?q= ("edit in generator", a shared link) is a start
    // of its own kind; recorded once, without the face.
    if (freeform) trackStep("url_load");

    // A linked mood picks a face in that mood; if ?q= already named a face,
    // keep it and only switch the mood filter.
    if (linkedMood && !freeform) setMood(linkedMood);
    else {
      if (linkedMood) markMood(linkedMood);
      render();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
