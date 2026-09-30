/* embed-widget.js — shared runtime for every iframe widget under
   /<tool>/embed/ (the documents the /embed/<slug>/ landing pages tell other
   sites to iframe).

   It does two things, and neither needs the widget's own code to change:

   1. Analytics. One dataLayer row per interaction, named
      `<prefix>_widget_interaction`, where <prefix> comes from the body's
      data-embed-widget. Rows carry:
        widget_action   type | option | copy
        widget_option   the preset/font/game picked, or what was copied
        widget_context  preview (our own /embed/ page iframing it)
                        | third_party (someone else's site) | direct
        widget_host     the embedding site's hostname, third_party only
                        (never the full URL)
        embed_source    the /embed/<slug>/ slug
      On the preview the row goes to the landing page's dataLayer (same
      origin), so "tried the widget" and "copied the embed code" read off one
      page's funnel. Everywhere else it stays in this document.

   2. Accessibility every widget needs and none had: a polite live region
      that announces a successful copy (each Copy button only showed it
      visually), and aria-pressed kept in sync with the `.active` preset,
      font or frame tab.

   A copy is detected when a button gains `copied` or `is-copied` — the class
   every widget's copy handler adds AFTER the clipboard write resolves — so a
   row fires on success, never on intent (the rule the share events follow).

   Opt-in: <body data-embed-widget="<prefix>" data-embed-source="<slug>">. */
(function () {
  "use strict";

  const body = document.body;
  const PREFIX = body && body.getAttribute("data-embed-widget");
  if (!PREFIX) return;
  const SOURCE = body.getAttribute("data-embed-source") || "";
  const EVENT = PREFIX + "_widget_interaction";
  const COPIED_CLASSES = ["copied", "is-copied"];

  const CONTEXT = (() => {
    if (window.parent === window) return "direct";
    try {
      return window.parent.location.hostname === window.location.hostname ? "preview" : "third_party";
    } catch (e) {
      return "third_party";
    }
  })();
  const HOST = (() => {
    if (CONTEXT !== "third_party") return "";
    try {
      return document.referrer ? new URL(document.referrer).hostname : "";
    } catch (e) {
      return "";
    }
  })();

  function clean(text) {
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, 60);
  }

  function track(action, option) {
    try {
      const target = CONTEXT === "preview" ? window.parent : window;
      target.dataLayer = target.dataLayer || [];
      target.dataLayer.push({
        event: EVENT,
        widget_action: action,
        widget_option: clean(option),
        widget_context: CONTEXT,
        widget_host: HOST,
        embed_source: SOURCE
      });
    } catch (e) { /* analytics must never break the widget */ }
  }

  // What a button stands for: its first data-* value (data-preset,
  // data-font, data-game, …) when it has one, else its visible text.
  function optionOf(el) {
    const data = el.dataset || {};
    const keys = Object.keys(data);
    return keys.length ? data[keys[0]] : el.textContent;
  }

  // What a copy button copied: the name on its result card, else its label.
  function copiedOf(btn) {
    const card = btn.closest(".style-card");
    const name = card && card.querySelector(".style-name");
    if (name) return name.textContent;
    return btn.getAttribute("aria-label") || btn.id || "copy";
  }

  // Preset / font / frame tabs mark the current one with `.active` only;
  // mirror it into aria-pressed so a screen reader hears which is selected.
  function syncPressed(tab) {
    tab.setAttribute("aria-pressed", tab.classList.contains("active") ? "true" : "false");
  }
  document.querySelectorAll(".decoration-tab").forEach(syncPressed);

  const status = document.createElement("span");
  status.className = "sr-only";
  status.setAttribute("aria-live", "polite");
  body.appendChild(status);
  let statusTimer = null;

  let typed = false;
  document.addEventListener("input", (e) => {
    if (typed || !e.target.matches("textarea, input")) return;
    typed = true;
    track("type", "");
  });

  document.addEventListener("change", (e) => {
    if (e.target.matches("select")) track("option", e.target.value);
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("button");
    if (!btn || btn.closest(".embed-attribution")) return;
    if (btn.matches(".copy-btn, [id$='CopyBtn'], [class*='clear']")) return;
    track("option", optionOf(btn));
  });

  new MutationObserver((records) => {
    records.forEach((r) => {
      const el = r.target;
      if (el.tagName !== "BUTTON") return;
      if (el.classList.contains("decoration-tab")) syncPressed(el);
      const was = COPIED_CLASSES.some((c) => (r.oldValue || "").split(/\s+/).includes(c));
      const is = COPIED_CLASSES.some((c) => el.classList.contains(c));
      if (was || !is) return;
      track("copy", copiedOf(el));
      status.textContent = "Copied to clipboard";
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => { status.textContent = ""; }, 1500);
    });
  }).observe(body, { subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true });
})();
