/* =====================================================================
   saved-items.js — one "things this device saved" store, for every
   surface that lets a user copy something.

   Why this exists (2026-09-05). Save was written for the generator and
   hard-coded to that page's unit of content: SAVED_KEY held a flat array
   of *style names*, and script.js's toggleSaved() bailed on
   `!stylesRegistry[name]`. A symbol, a kaomoji, a whole collection — none
   of them are styles, so none could be represented at all. That is why
   1,651 library and symbol pages, carrying 34% of every copy on the site,
   shipped with no Save button: not an oversight, a data model that could
   not describe what those pages hold.

   The record is now typed:

       { type: "style" | "symbol" | "collection",
         value: "★",         // what Copy would put on the clipboard
         label: "Black Star",     // human name, for rendering
         href:  "/library/...",   // where it came from (optional)
         t:     1757030400000 }   // saved-at, for newest-first ordering

   `type` + `value` is the identity. Two pages saving the same symbol under
   different labels are one record, which is correct: the user saved the
   glyph, not the page's caption for it.

   MIGRATION. The old flat array under "utg_saved_styles" is read and
   folded in as type:"style" records, and kept in step on every write.
   Keeping it means a user who lands on a page still serving an older
   cached script.js keeps their saved styles instead of watching them
   vanish; the cost is one duplicated key, which is cheaper than the
   alternative.

   No dependencies. Safe to load anywhere, before or after its callers.
   ===================================================================== */
(function () {
  "use strict";

  const UTG = (window.UltraTextGen = window.UltraTextGen || {});
  if (UTG.saved) return; // already loaded

  const KEY = "utg_saved_items";
  const LEGACY_STYLE_KEY = "utg_saved_styles";
  const TYPES = ["style", "symbol", "collection"];
  const MAX = 200; // a saved list is a shortlist; past this it is a junk drawer

  function readRaw(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null; // private mode, quota, or corrupt JSON — behave as empty
    }
  }

  function isRecord(r) {
    return !!r && typeof r === "object"
      && TYPES.indexOf(r.type) !== -1
      && typeof r.value === "string" && r.value !== "";
  }

  function load() {
    const list = readRaw(KEY);
    const items = Array.isArray(list) ? list.filter(isRecord) : [];

    // Fold the pre-typed store in. Records already present win, so this can
    // never duplicate or overwrite on a re-read.
    const legacy = readRaw(LEGACY_STYLE_KEY);
    if (Array.isArray(legacy) && legacy.length) {
      const seen = {};
      items.forEach((r) => { seen[r.type + " " + r.value] = true; });
      legacy.forEach((name) => {
        if (typeof name !== "string" || !name) return;
        if (seen["style " + name]) return;
        items.push({ type: "style", value: name, label: name, href: "", t: 0 });
      });
    }
    return items;
  }

  let items = load();

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
    } catch (err) {
      // Storage unavailable — the in-memory list still works for this page.
    }
    // Keep the legacy key in step so an older cached script.js in another
    // tab cannot resurrect styles this one just removed.
    try {
      const styles = items.filter((r) => r.type === "style").map((r) => r.value);
      localStorage.setItem(LEGACY_STYLE_KEY, JSON.stringify(styles));
    } catch (err) { /* same */ }
  }

  function indexOf(type, value) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].type === type && items[i].value === value) return i;
    }
    return -1;
  }

  function emit() {
    try {
      document.dispatchEvent(new CustomEvent("utg:savedchange", { detail: { count: items.length } }));
    } catch (err) { /* CustomEvent unsupported — callers re-read on next render */ }
  }

  UTG.saved = {
    /** Every saved record of a type (or all of them), newest first. Returns
        a copy, so a caller cannot mutate the store by editing the result. */
    all(type) {
      const list = type ? items.filter((r) => r.type === type) : items.slice();
      return list.slice().sort((a, b) => (b.t || 0) - (a.t || 0));
    },

    has(type, value) {
      return indexOf(type, value) !== -1;
    },

    count(type) {
      return type ? items.filter((r) => r.type === type).length : items.length;
    },

    /** Add or remove. Returns the resulting state (true = now saved), or
        null when the record was malformed and nothing changed. */
    toggle(rec) {
      if (!isRecord(rec)) return null;
      const i = indexOf(rec.type, rec.value);
      const nowSaved = i === -1;
      if (nowSaved) {
        items.unshift({
          type: rec.type,
          value: rec.value,
          label: rec.label || rec.value,
          href: rec.href || "",
          t: Date.now()
        });
        if (items.length > MAX) items.length = MAX;
      } else {
        items.splice(i, 1);
      }
      persist();

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        // save_style is kept as the event name so the existing GA4 reports and
        // their history stay continuous. item_type is what separates a saved
        // symbol from a saved font from here on.
        event: nowSaved ? "save_style" : "unsave_style",
        item_type: rec.type,
        item_label: rec.label || rec.value,
        style_name: rec.type === "style" ? rec.value : undefined
      });
      emit();
      return nowSaved;
    },

    clear(type) {
      items = type ? items.filter((r) => r.type !== type) : [];
      persist();
      emit();
    }
  };
})();
