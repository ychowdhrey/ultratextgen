/* embed-landing.js — shared runtime for the /embed/<slug>/ landing pages
   (widget distribution: preview -> copy -> install -> what else).

   Opt-in: <main data-embed-landing="<prefix>" data-embed-source="<slug>">,
   with the same <prefix> the widget's own <body data-embed-widget> carries.

   dataLayer rows (each needs its GTM trigger + GA4 tag created by hand):
     <prefix>_embed_copy   on a SUCCESSFUL copy of the embed code, never on
                           intent. embed_copy_location (the button's
                           data-embed-copy), embed_copy_method (button |
                           manual_select), widget_interacted (the preview
                           widget pushed a <prefix>_widget_interaction into
                           this page's dataLayer first), embed_source.
     other_embed_click     a "More widgets" card or "Explore all" link.
                           embed_target, embed_source. */
(function () {
  "use strict";

  const root = document.querySelector("[data-embed-landing]");
  if (!root) return;
  const PREFIX = root.getAttribute("data-embed-landing");
  const SOURCE = root.getAttribute("data-embed-source") || "";
  const code = document.getElementById("embedCode");
  const status = document.getElementById("embedCopyStatus");
  const buttons = document.querySelectorAll("[data-embed-copy]");
  if (!code) return;

  function track(row) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(row);
    } catch (e) { /* analytics must never break the page */ }
  }

  function widgetInteracted() {
    const name = PREFIX + "_widget_interaction";
    return (window.dataLayer || []).some((row) => row && row.event === name);
  }

  function recordCopy(location, method) {
    track({
      event: PREFIX + "_embed_copy",
      embed_copy_location: location,
      embed_copy_method: method,
      widget_interacted: widgetInteracted(),
      embed_source: SOURCE
    });
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.className = "sr-only";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  const timers = new WeakMap();
  function showCopied(btn) {
    const label = btn.querySelector(".embed-copy-text");
    buttons.forEach((b) => b.classList.remove("is-copied"));
    btn.classList.add("is-copied");
    if (label) label.textContent = "Copied!";
    if (status) status.textContent = "Embed code copied to clipboard";
    clearTimeout(timers.get(btn));
    timers.set(btn, setTimeout(() => {
      btn.classList.remove("is-copied");
      if (label) label.textContent = "Copy embed code";
      if (status) status.textContent = "";
    }, 2000));
  }

  // Both clipboard paths refused (locked-down browser, embedded webview):
  // select the code so one keystroke finishes the job, and say which.
  function selectForManualCopy() {
    const range = document.createRange();
    range.selectNodeContents(code);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const key = /Mac|iPhone|iPad/.test(navigator.platform || "") ? "Cmd" : "Ctrl";
    if (status) status.textContent = "Code selected. Press " + key + "+C to copy.";
    const hint = document.getElementById("embedCopyHint");
    if (hint) {
      hint.textContent = "Code selected. Press " + key + "+C to copy.";
      hint.hidden = false;
    }
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = code.textContent;
      const location = btn.getAttribute("data-embed-copy");
      const done = () => { showCopied(btn); recordCopy(location, "button"); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, () => {
          if (fallbackCopy(text)) done();
          else selectForManualCopy();
        });
      } else if (fallbackCopy(text)) {
        done();
      } else {
        selectForManualCopy();
      }
    });
  });

  // Selecting the code and pressing Ctrl+C is the same conversion.
  code.addEventListener("copy", () => recordCopy("code_panel", "manual_select"));

  document.querySelectorAll("[data-other-embed]").forEach((link) => {
    link.addEventListener("click", () => {
      track({
        event: "other_embed_click",
        embed_target: link.getAttribute("data-other-embed"),
        embed_source: SOURCE
      });
    });
  });
})();
