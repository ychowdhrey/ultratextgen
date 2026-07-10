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

  /* The part categories, in the order they appear in the picker. */
  var ORDER = [
    { cat: "brackets",    label: "Face" },
    { cat: "eyes",        label: "Eyes" },
    { cat: "mouths",      label: "Mouth" },
    { cat: "cheeks",      label: "Cheeks" },
    { cat: "arms",        label: "Arms" },
    { cat: "decorations", label: "Extra" }
  ];

  /* Current selection (part ids per category), active mood, and any freeform
     override the visitor typed/pasted into the face field. */
  var sel = { brackets: "round", eyes: "happy", mouths: "omega", cheeks: "none", arms: "none", decorations: "none" };
  var activeMood = "all";
  var freeform = null;

  var refs = {};

  /* ---- part lookup ------------------------------------------------------- */
  function part(cat, id) {
    var list = DATA.PARTS[cat] || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }
  function fitsMood(p, mood) {
    if (mood === "all") return true;
    var m = p.m || [];
    return m.indexOf("*") !== -1 || m.indexOf(mood) !== -1;
  }

  /* ---- assemble the face from the current selection ---------------------- */
  function assemble() {
    var b = part("brackets", sel.brackets);
    var e = part("eyes", sel.eyes);
    var mo = part("mouths", sel.mouths);
    var c = part("cheeks", sel.cheeks);
    var a = part("arms", sel.arms);
    var d = part("decorations", sel.decorations);
    return a.l + b.l + c.l + e.l + mo.c + e.r + c.r + b.r + a.r + (d.c || "");
  }

  /* The face currently shown/copied: freeform text if the visitor edited it,
     otherwise the assembled face. */
  function currentFace() {
    return (freeform != null) ? freeform : assemble();
  }

  /* ---- platform-compatibility hint -------------------------------------- */
  /* Stacked combining marks (Lenny brows, blush lines, accented eyes) are the
     glyphs most likely to break on older iOS / some apps. */
  var RISKY = /[̀-ͯ҃-҉᪰-᫿᷀-᷿⃐-⃿︠-︯]/;
  function updateHint(face) {
    if (!refs.hint) return;
    if (RISKY.test(face)) {
      refs.hint.textContent = t("hintRisky", "Uses stacked marks — may not show on every device (especially older iOS). Test before posting.");
      refs.hint.classList.add("is-risky");
    } else {
      refs.hint.textContent = t("hintSafe", "Built from widely supported characters — works on most platforms.");
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
      o.classList.toggle("is-selected", freeform == null && sel[cat] === id);
      o.classList.toggle("is-hidden", !fitsMood(part(cat, id), activeMood));
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

  function setMood(mood) {
    activeMood = mood;
    var chips = refs.moods.querySelectorAll(".kao-mood");
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle("is-active", chips[i].getAttribute("data-mood") === mood);
    }
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
      window.UltraTextGen.copyText(face, btn, face);
    }
    syncUrl(face);
  }

  /* ---- UI construction --------------------------------------------------- */
  function buildMoods() {
    var frag = document.createDocumentFragment();
    var all = el("button", "kao-mood is-active", t("moodAll", "All"));
    all.type = "button";
    all.setAttribute("data-mood", "all");
    frag.appendChild(all);
    DATA.MOODS.forEach(function (m) {
      var b = el("button", "kao-mood", m.label);
      b.type = "button";
      b.setAttribute("data-mood", m.id);
      frag.appendChild(b);
    });
    refs.moods.appendChild(frag);
    refs.moods.addEventListener("click", function (ev) {
      var chip = ev.target.closest(".kao-mood");
      if (chip) setMood(chip.getAttribute("data-mood"));
    });
  }

  function optionLabel(p) {
    if (p.id === "none") return "∅";
    if (p.label) return p.label;
    if (p.c != null) return p.c;
    return (p.l || "") + (p.r || "");
  }

  function buildParts() {
    ORDER.forEach(function (row) {
      var wrap = el("div", "kao-part-row");
      wrap.appendChild(el("span", "kao-part-label", t("part_" + row.cat, row.label)));
      var opts = el("div", "kao-part-options");
      (DATA.PARTS[row.cat] || []).forEach(function (p) {
        var b = el("button", "kao-part-opt", optionLabel(p));
        b.type = "button";
        b.setAttribute("data-cat", row.cat);
        b.setAttribute("data-id", p.id);
        b.setAttribute("aria-label", row.label + ": " + (p.label || p.c || p.id));
        opts.appendChild(b);
      });
      wrap.appendChild(opts);
      refs.parts.appendChild(wrap);
    });
    refs.parts.addEventListener("click", function (ev) {
      var opt = ev.target.closest(".kao-part-opt");
      if (opt) selectPart(opt.getAttribute("data-cat"), opt.getAttribute("data-id"));
    });
  }

  function buildPresets() {
    if (!refs.presets) return;
    var frag = document.createDocumentFragment();
    DATA.PRESETS.forEach(function (preset) {
      var b = el("button", "kao-preset", "");
      b.type = "button";
      // preview glyph + label
      var glyph = el("span", "kao-preset-face");
      var saved = { s: copyObj(sel), f: freeform };
      freeform = null; setSel(preset.parts);
      glyph.textContent = assemble();
      sel = saved.s; freeform = saved.f;
      b.appendChild(glyph);
      b.appendChild(el("span", "kao-preset-label", preset.label));
      b.addEventListener("click", function () { applyPreset(preset); });
      frag.appendChild(b);
    });
    refs.presets.appendChild(frag);
  }
  function copyObj(o) { var r = {}; for (var k in o) if (o.hasOwnProperty(k)) r[k] = o[k]; return r; }
  function setSel(parts) { for (var k in parts) if (parts.hasOwnProperty(k)) sel[k] = parts[k]; }

  /* ---- init -------------------------------------------------------------- */
  function init() {
    refs.preview   = $("#kaomojiPreview");
    refs.faceInput = $("#kaomojiFaceInput");
    refs.parts     = $("#kaomojiParts");
    refs.moods     = $("#kaomojiMoods");
    refs.presets   = $("#kaomojiPresets");
    refs.hint      = $("#kaomojiHint");
    if (!refs.preview || !refs.parts || !refs.moods) return;

    buildMoods();
    buildParts();
    buildPresets();

    // Deep link / "edit in generator": ?q=<face> preloads the face.
    try {
      var q = new URL(window.location.href).searchParams.get("q");
      if (q) freeform = q;
    } catch (e) { /* no-op */ }

    var copyBtn = $("#kaomojiCopyBtn");
    if (copyBtn) copyBtn.addEventListener("click", function () { copyFace(copyBtn); });

    var surprise = $("#kaomojiSurpriseBtn");
    if (surprise) surprise.addEventListener("click", function () { randomFace(activeMood); });

    var clear = $("#kaomojiClearBtn");
    if (clear) clear.addEventListener("click", function () {
      activeMood = "all";
      setMood("all");
      sel = { brackets: "round", eyes: "happy", mouths: "omega", cheeks: "none", arms: "none", decorations: "none" };
      freeform = null;
      render();
      syncUrl("");
    });

    if (refs.faceInput) {
      refs.faceInput.addEventListener("input", function () {
        freeform = refs.faceInput.value;
        if (refs.preview) refs.preview.textContent = freeform || " ";
        updateHint(freeform);
        // typed text detaches from the part tiles
        var opts = refs.parts.querySelectorAll(".kao-part-opt.is-selected");
        for (var i = 0; i < opts.length; i++) opts[i].classList.remove("is-selected");
      });
    }

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
