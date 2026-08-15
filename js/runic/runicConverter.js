/*
 * Runic name converter — wires the already-shipped "Ultra Runic" style
 * (styles.js, type: 'map', Elder Futhark U+16A0–U+16FF) onto the reference
 * page that actually has the topical authority for it. The transform was
 * live on category/ancient-fonts/ and usecase/name-to-symbols/ long before
 * this; library/norse-viking-runes/ was a static chart with no way to type
 * your own name into it.
 *
 * Honesty rules this module exists to enforce, because a silent
 * substitution is the standard failure of every rune converter on the web:
 *
 *   1. Elder Futhark has 24 runes for 26 Latin letters. C, K and Q all
 *      resolve to ᚲ (Kaunan) — that is correct transliteration, not a bug,
 *      but the reader should be told rather than left to notice.
 *   2. The style is accentSafe:false. å, ä, ö, æ, ø, é and friends have no
 *      Elder Futhark equivalent at all and pass through unconverted. We
 *      name them instead of pretending they converted.
 *
 * Depends on styles.js + renderer.js only (no script.js) — this page is a
 * reference chart, not the generator, so it does not need the decorations
 * layer or its global UI bindings.
 */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);

  // Optional per-page localization table, same convention as cursiveI18n.
  // Every string falls back to English, so the EN page needs no table.
  const I18N = window.runicI18n || {};
  function t(key, fallback) {
    return I18N[key] != null ? I18N[key] : fallback;
  }
  function fmt(str, map) {
    return String(str).replace(/\{(\w+)\}/g, (m, k) => (map[k] != null ? map[k] : m));
  }

  const STYLE_KEY = "Ultra Runic";
  // Letters with no distinct Elder Futhark rune — they share one, or have none.
  const SHARED = { c: "ᚲ", k: "ᚲ", q: "ᚲ" };

  const el = {
    input: $("#runicInput"),
    output: $("#runicOutput"),
    copy: $("#runicCopy"),
    note: $("#runicNote"),
  };

  function styleObject() {
    const styles = window.textStyles;
    return styles && styles[STYLE_KEY] ? styles[STYLE_KEY] : null;
  }

  // Characters the Elder Futhark map leaves untouched: anything that is a
  // letter but comes back identical after rendering (accented vowels,
  // non-Latin scripts). Digits, spaces and punctuation are expected to pass
  // through and are not worth warning about.
  function unconverted(source, rendered) {
    const src = Array.from(source);
    const out = Array.from(rendered);
    const stuck = [];
    if (src.length !== out.length) return stuck;
    src.forEach((ch, i) => {
      if (out[i] !== ch) return;
      if (!/\p{Letter}/u.test(ch)) return;
      if (stuck.indexOf(ch) === -1) stuck.push(ch);
    });
    return stuck;
  }

  function sharedRunesUsed(source) {
    const used = [];
    Array.from(source.toLowerCase()).forEach((ch) => {
      if (SHARED[ch] && used.indexOf(ch) === -1) used.push(ch);
    });
    return used;
  }

  function render() {
    const style = styleObject();
    const renderer = window.UltraTextGenRender;
    if (!style || !renderer || !el.output) return;

    const raw = el.input ? el.input.value : "";
    const source = raw.trim() ? raw : t("demoName", "Ragnar");
    const isDemo = !raw.trim();

    const runes = renderer.renderAny(source, style);
    el.output.textContent = runes;
    el.output.classList.toggle("runic-output-demo", isDemo);
    if (el.copy) {
      el.copy.disabled = isDemo;
      el.copy.dataset.text = isDemo ? "" : runes;
    }

    if (!el.note) return;
    const notes = [];
    const shared = sharedRunesUsed(source);
    if (shared.length) {
      notes.push(fmt(
        t("sharedRune", "Elder Futhark has 24 runes for 26 letters: {letters} all share ᚲ (Kaunan)."),
        { letters: shared.map((c) => c.toUpperCase()).join(", ") }
      ));
    }
    const stuck = unconverted(source, runes);
    if (stuck.length) {
      notes.push(fmt(
        t("noEquivalent", "No Elder Futhark equivalent for {chars} — shown unchanged rather than swapped for a rune that means something else."),
        { chars: stuck.join(", ") }
      ));
    }
    el.note.textContent = notes.join(" ");
    el.note.hidden = notes.length === 0;
  }

  function copyRunes() {
    const text = el.copy && el.copy.dataset.text;
    if (!text || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      const original = el.copy.textContent;
      el.copy.textContent = t("copied", "Copied");
      setTimeout(() => { el.copy.textContent = original; }, 1400);
    }).catch(() => {});
  }

  function init() {
    if (!el.output) return;
    if (el.input) el.input.addEventListener("input", render);
    if (el.copy) el.copy.addEventListener("click", copyRunes);
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
