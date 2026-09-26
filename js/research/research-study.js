/*
 * research-study.js: reading aids for a /research/ study page.
 *
 * The study page is the canonical record and is complete without this file:
 * every section, number and figure is static HTML, and the PDF is printed from
 * it. This only adds what a long record needs on screen:
 *
 *   contents    the list marks the section in view. On wide screens it is a
 *               sticky sidebar; on narrow ones CSS turns it into a row of
 *               section chips, and once that row has scrolled away a floating
 *               Contents button (with a reading-progress line) opens the list
 *               in a sheet.
 *   compare     a figure with data-compare="Standard|A|B|C" whose image is
 *               four panels side by side gets Standard next to one chosen
 *               panel, large enough to read on a phone. The full image stays
 *               in the page and is what prints.
 *   citation    a Copy citation button under the citation.
 *   print       reference tables folded into <details> open for printing.
 */
(function () {
  "use strict";

  const WIDE = window.matchMedia("(min-width: 1120px)");

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  /* ---------------------------------------------------------- contents */
  function initContents() {
    const nav = document.querySelector(".study-toc");
    if (!nav) return;
    const navLinks = Array.from(nav.querySelectorAll(".study-toc-list a[href^='#']"));
    const targets = navLinks
      .map((a) => document.getElementById(a.getAttribute("href").slice(1)))
      .filter(Boolean);
    if (!targets.length) return;

    const sheet = el("dialog", "study-toc-sheet");
    sheet.setAttribute("aria-label", "On this page");
    const inner = el("div", "study-toc-sheet-inner");
    const head = el("div", "study-toc-sheet-head");
    const close = el("button", "study-toc-close", "Close");
    close.type = "button";
    head.append(el("p", "study-toc-title", "On this page"), close);
    inner.append(head);
    Array.from(nav.children).forEach((child) => {
      if (child.classList.contains("study-toc-title")) return;
      inner.append(child.cloneNode(true));
    });
    sheet.append(inner);
    document.body.append(sheet);
    const sheetLinks = Array.from(sheet.querySelectorAll(".study-toc-list a"));

    const fab = el("button", "study-toc-fab");
    fab.type = "button";
    fab.setAttribute("aria-haspopup", "dialog");
    const fabCurrent = el("span", "study-toc-fab-current");
    const progress = el("span", "study-toc-fab-progress");
    const bar = el("span");
    progress.append(bar);
    progress.setAttribute("aria-hidden", "true");
    const icon = el("span", "study-toc-fab-icon");
    icon.setAttribute("aria-hidden", "true");
    fab.append(icon, el("span", "", "Contents"), fabCurrent, progress);
    document.body.append(fab);

    function openSheet() {
      if (typeof sheet.showModal === "function") sheet.showModal();
      else sheet.setAttribute("open", "");
      const current = sheet.querySelector("[aria-current='true']") || sheetLinks[0];
      if (current) current.focus();
    }
    function closeSheet() {
      if (typeof sheet.close === "function") sheet.close();
      else sheet.removeAttribute("open");
    }
    fab.addEventListener("click", openSheet);
    close.addEventListener("click", closeSheet);
    // A click on the backdrop lands on the dialog itself, outside the inner panel.
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet) closeSheet();
      else if (e.target.closest("a[href^='#']")) closeSheet();
    });

    const footer = document.querySelector(".footer");
    let currentId = "";
    let queued = false;

    function update() {
      queued = false;
      const line = WIDE.matches ? 120 : Math.min(window.innerHeight * 0.4, 260);
      let active = targets[0];
      for (const t of targets) {
        if (t.getBoundingClientRect().top - line <= 0) active = t;
        else break;
      }
      if (active.id !== currentId) {
        currentId = active.id;
        const href = "#" + currentId;
        navLinks.concat(sheetLinks).forEach((a) => {
          if (a.getAttribute("href") === href) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
        const label = navLinks.find((a) => a.getAttribute("href") === href);
        fabCurrent.textContent = label ? label.textContent : "";
      }
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ")";
      const pastList = nav.getBoundingClientRect().bottom < 0;
      const atFooter = footer && footer.getBoundingClientRect().top < window.innerHeight;
      fab.classList.toggle("is-visible", !WIDE.matches && pastList && !atFooter);
    }
    function queue() {
      if (!queued) {
        queued = true;
        window.requestAnimationFrame(update);
      }
    }
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    if (WIDE.addEventListener) WIDE.addEventListener("change", () => { closeSheet(); queue(); });
    update();
  }

  /* ----------------------------------------------------------- compare */
  function initCompare() {
    document.querySelectorAll("figure[data-compare]").forEach((fig) => {
      const labels = fig.getAttribute("data-compare").split("|");
      const subject = fig.getAttribute("data-compare-subject") || "";
      const source = fig.querySelector("img");
      const cols = labels.length;
      const w = Number(source && source.getAttribute("width"));
      const h = Number(source && source.getAttribute("height"));
      if (!source || cols < 2 || !w || !h) return;
      const panelW = w / cols;

      function buildPane(index) {
        const node = el("div", "rc-pane");
        const label = el("p", "rc-label");
        const crop = el("div", "rc-crop");
        crop.style.aspectRatio = panelW + " / " + h;
        const img = el("img");
        img.src = source.getAttribute("src");
        img.loading = "lazy";
        img.decoding = "async";
        img.style.width = cols * 100 + "%";
        crop.append(img);
        node.append(label, crop);
        function show(i) {
          label.textContent = labels[i];
          img.alt = subject + ": " + labels[i];
          img.style.transform = "translateX(" + (-100 * i / cols) + "%)";
        }
        show(index);
        return { node: node, show: show };
      }

      const box = el("div", "render-compare");
      const controls = el("div", "rc-controls");
      controls.setAttribute("role", "group");
      controls.setAttribute("aria-label", "Compare Standard with");
      controls.append(el("span", "rc-controls-label", "Compare Standard with:"));
      const stage = el("div", "rc-stage" + (panelW > h ? " is-landscape" : ""));
      const standard = buildPane(0);
      const chosen = buildPane(1);
      stage.append(standard.node, chosen.node);

      const buttons = labels.slice(1).map((text, k) => {
        const b = el("button", "rc-btn", text);
        b.type = "button";
        b.setAttribute("aria-pressed", k === 0 ? "true" : "false");
        b.addEventListener("click", () => {
          buttons.forEach((other) => other.setAttribute("aria-pressed", other === b ? "true" : "false"));
          chosen.show(k + 1);
        });
        return b;
      });
      controls.append(...buttons);

      const link = fig.querySelector("a[href]");
      const full = el("a", "rc-full", "Open all " + cols + " side by side");
      full.href = link ? link.getAttribute("href") : source.getAttribute("src");

      box.append(controls, stage, full);
      fig.prepend(box);
      fig.classList.add("is-enhanced");
    });
  }

  /* ---------------------------------------------------------- citation */
  function initCitation() {
    const cite = document.getElementById("citation-text");
    if (!cite || !navigator.clipboard) return;
    const row = el("div", "citation-actions");
    const btn = el("button", "rc-btn", "Copy citation");
    btn.type = "button";
    const status = el("span", "citation-status");
    status.setAttribute("role", "status");
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(cite.textContent.trim()).then(
        () => {
          status.textContent = "Copied";
          window.setTimeout(() => { status.textContent = ""; }, 2500);
        },
        () => { status.textContent = "Select the citation above to copy it"; }
      );
    });
    row.append(btn, status);
    cite.after(row);
  }

  /* ------------------------------------------------------------- print */
  function initPrint() {
    window.addEventListener("beforeprint", () => {
      document.querySelectorAll("details.study-details:not([open])").forEach((d) => {
        d.setAttribute("data-print-opened", "");
        d.open = true;
      });
    });
    window.addEventListener("afterprint", () => {
      document.querySelectorAll("details[data-print-opened]").forEach((d) => {
        d.open = false;
        d.removeAttribute("data-print-opened");
      });
    });
  }

  initContents();
  initCompare();
  initCitation();
  initPrint();
})();
