/* UltraTextGen — printables hub facets (PR-18).
   ------------------------------------------------------------------
   /printables/ was a flat grid of 24 cards with no search, no filter and no
   facet, so the only way in was by knowing the NAME of the printable you
   wanted. That is not how the job arrives: it arrives as "something to trace
   with his name on it" or "something to cut out".

   Two facets, and only two, because these are the two properties every card
   can be assigned from its own description without guessing:

     job    what the sheet is for   — trace / colour / craft / play / reference
     input  whose words are on it   — the visitor's own, or a ready-made A–Z

   The audit also proposed age, duration and ink. They are left out on
   purpose. Ink is not a property of a card at all (the ink saver is a print
   setting that applies to every one of them), and age and duration would be
   invented per card rather than read off it — a facet that sorts by a
   guessed value is worse than no facet, because it looks authoritative.

   No new URL, and no URL change: the state is never written to the address
   bar, so nothing here can be crawled as a thin variant of the hub.

   ENGLISH ONLY. Every label below is a new string and the site's own corpus
   attests no translation of "trace"/"craft" as a category name in the seven
   other locales, so their hubs are left exactly as they are rather than
   shipping an English filter bar over translated cards. */
(function () {
  "use strict";
  const lang = (document.documentElement.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
  if (lang !== "en") return;

  const GROUPS = [
    { key: "job", label: "What it is for", attr: "data-pt-job", options: [
      { key: "", label: "All" },
      { key: "trace", label: "Trace" },
      { key: "colour", label: "Colour" },
      { key: "craft", label: "Cut and make" },
      { key: "play", label: "Play" },
      { key: "reference", label: "Reference" }
    ] },
    { key: "input", label: "Whose words", attr: "data-pt-input", options: [
      { key: "", label: "Either" },
      { key: "typed", label: "Type your own" },
      { key: "ready", label: "Ready-made A to Z" }
    ] }
  ];

  const state = { job: "", input: "" };

  function init() {
    const grid = document.querySelector(".printable-hub-grid");
    if (!grid || document.getElementById("pt-hub-facets")) return;
    const cards = Array.prototype.slice.call(grid.querySelectorAll("[data-pt-job]"));
    // Nothing to filter is not a filter bar: a hub whose cards were never
    // tagged must look exactly as it did rather than growing a control that
    // hides everything.
    if (cards.length < 2) return;

    const bar = document.createElement("div");
    bar.id = "pt-hub-facets";
    bar.className = "pt-hub-facets";

    GROUPS.forEach(function (group) {
      // Only offer a value some card actually carries, so the bar cannot
      // advertise an empty result.
      const present = {};
      cards.forEach(function (c) { present[c.getAttribute(group.attr) || ""] = true; });
      const opts = group.options.filter(function (o) { return o.key === "" || present[o.key]; });
      if (opts.length < 2) return;

      const field = document.createElement("div");
      field.className = "pt-hub-facet";
      const lab = document.createElement("span");
      lab.className = "pt-hub-facet-label";
      lab.textContent = group.label;
      field.appendChild(lab);

      const row = document.createElement("div");
      row.className = "pt-choice-row";
      row.setAttribute("role", "radiogroup");
      row.setAttribute("aria-label", group.label);
      opts.forEach(function (o) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pt-choice";
        b.textContent = o.label;
        b.setAttribute("role", "radio");
        const on = state[group.key] === o.key;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-checked", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
        b.addEventListener("click", function () {
          state[group.key] = o.key;
          Array.prototype.forEach.call(row.querySelectorAll(".pt-choice"), function (other) {
            const sel = other === b;
            other.classList.toggle("is-active", sel);
            other.setAttribute("aria-checked", sel ? "true" : "false");
            other.tabIndex = sel ? 0 : -1;
          });
          apply(cards, count);
        });
        row.appendChild(b);
      });
      field.appendChild(row);
      bar.appendChild(field);
    });

    if (!bar.children.length) return;

    const count = document.createElement("p");
    count.className = "pt-hub-count";
    count.setAttribute("aria-live", "polite");
    bar.appendChild(count);

    grid.parentNode.insertBefore(bar, grid);
    apply(cards, count);
  }

  function apply(cards, count) {
    let shown = 0;
    cards.forEach(function (c) {
      const ok = (!state.job || c.getAttribute("data-pt-job") === state.job) &&
                 (!state.input || c.getAttribute("data-pt-input") === state.input);
      // hidden, not display:none in a stylesheet — a hidden card is out of the
      // tab order and out of the accessibility tree, which is what "filtered
      // out" has to mean for someone not using a mouse.
      c.hidden = !ok;
      if (ok) shown++;
    });
    count.textContent = shown === cards.length
      ? ""
      : shown + " of " + cards.length + (shown === 1 ? " printable" : " printables");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
