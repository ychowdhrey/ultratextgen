/* ==========================================================
   couple-generator.js
   Matching-name generator for couples / pasangan (UltraTextGen).

   The job this page owns is not "one styled name" — it is TWO names
   that visibly belong together: the same frame/theme applied to both,
   or a complementary His&Hers pairing. It is a thin controller on top
   of the shared systems, not a new engine:

     - Frames come from UltraTextGen.flair.PACKS (the flair engine).
       This file never invents a decoration set; the page passes in
       themes whose prefix/suffix are sourced from those packs.
     - The optional base font uses UltraTextGenRender.renderAny with a
       style from window.textStyles (paste-safe Unicode, no bundled font).
     - The per-name "will this fit Free Fire?" badge reuses
       UltraTextGen.gameRules.analyze, so the count reflects exactly what
       the player pastes (frame + font both counted, symbols weighted x2).

   All copy is delegated by symbol-explorer.js (.symbol-tile), so the
   generated buttons are click-to-copy with zero extra wiring.

   API:  UltraTextGen.coupleGenerator.init(config)
     config = {
       inputAId, inputBId,   // the two name fields
       themesId,             // container for theme chips
       outputId,             // container for the two result cards
       surpriseId,           // optional: random-theme button
       copyBothId,           // optional: "copy both names" button
       themes: [ { id, label, font, a:{prefix,suffix}, b:{prefix,suffix} } ],
       game,                 // gameId for the fit-checker (default "ff")
       text: { labelA, labelB, copyBoth, copyBothDone,
               statusOk, statusWarn, statusFail, cardHint }
     }
   ========================================================== */
(function () {
  "use strict";

  const ns = (window.UltraTextGen = window.UltraTextGen || {});

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // Render one name in a base font (paste-safe Unicode) if the renderer and
  // registry are present; otherwise return the plain name unchanged.
  function toFont(name, fontKey) {
    if (!fontKey) return name;
    const styles = window.textStyles;
    const renderer = window.UltraTextGenRender;
    if (styles && styles[fontKey] && renderer && renderer.renderAny) {
      return renderer.renderAny(name, styles[fontKey]);
    }
    return name;
  }

  function compose(name, frame, fontKey) {
    const base = toFont(name || "", fontKey);
    const pre = (frame && frame.prefix) || "";
    const suf = (frame && frame.suffix) || "";
    return pre + base + suf;
  }

  function init(config) {
    const cfg = config || {};
    const inputA = document.getElementById(cfg.inputAId);
    const inputB = document.getElementById(cfg.inputBId);
    const themesWrap = document.getElementById(cfg.themesId);
    const output = document.getElementById(cfg.outputId);
    const themes = (cfg.themes || []).filter(function (t) { return t && t.a && t.b; });
    if (!inputA || !inputB || !themesWrap || !output || !themes.length) return;

    const text = cfg.text || {};
    const gameId = cfg.game || "ff";
    const state = { theme: themes[0] };

    // ---- Theme chips (reuse the decoration-tab look) --------------------
    themesWrap.innerHTML = "";
    themes.forEach(function (theme, i) {
      const chip = el("button", "decoration-tab" + (i === 0 ? " active" : ""), theme.label);
      chip.type = "button";
      chip.setAttribute("data-theme", theme.id);
      themesWrap.appendChild(chip);
    });
    themesWrap.addEventListener("click", function (e) {
      const chip = e.target.closest(".decoration-tab");
      if (!chip) return;
      const id = chip.getAttribute("data-theme");
      const found = themes.filter(function (t) { return t.id === id; })[0];
      if (!found) return;
      state.theme = found;
      syncChips();
      render();
    });

    function syncChips() {
      themesWrap.querySelectorAll(".decoration-tab").forEach(function (chip) {
        chip.classList.toggle("active", chip.getAttribute("data-theme") === state.theme.id);
      });
    }

    // ---- One result card ------------------------------------------------
    function buildCard(label, composed) {
      const card = el("div", "couple-card");

      card.appendChild(el("div", "uname-note", label));

      const chip = el("button", "uname-chip symbol-tile");
      chip.type = "button";
      chip.setAttribute("data-symbol", composed);
      chip.setAttribute("aria-label", text.copyLabel || "Copy name");
      chip.textContent = composed;
      card.appendChild(chip);

      // Fit badge (Free Fire etc.) — reuse the shared rule engine.
      if (ns.gameRules && ns.gameRules.analyze) {
        const report = ns.gameRules.analyze(composed, gameId);
        const meta = el("div", "gr-meta");
        const badge = el("span", "gr-badge gr-badge-" + report.level);
        badge.textContent =
          report.level === "ok" ? (text.statusOk || "") :
          report.level === "warn" ? (text.statusWarn || "") :
          report.level === "fail" ? (text.statusFail || "") : "";
        meta.appendChild(badge);
        if (report.limit) {
          const count = el("span", "gr-count", report.effective + " / " + report.limit);
          if (report.effective > report.limit) count.classList.add("is-over");
          meta.appendChild(count);
        }
        card.appendChild(meta);
      }
      return card;
    }

    function currentPair() {
      const theme = state.theme;
      return {
        a: compose(inputA.value, theme.a, theme.font),
        b: compose(inputB.value, theme.b, theme.font)
      };
    }

    function render() {
      const pair = currentPair();
      output.innerHTML = "";
      output.appendChild(buildCard(text.labelA || "You", pair.a));
      output.appendChild(buildCard(text.labelB || "Partner", pair.b));
    }

    // ---- Wiring ---------------------------------------------------------
    inputA.addEventListener("input", render);
    inputB.addEventListener("input", render);

    if (cfg.surpriseId) {
      const surprise = document.getElementById(cfg.surpriseId);
      if (surprise) {
        surprise.addEventListener("click", function () {
          const pick = (ns.flair && ns.flair.pickRandom)
            ? ns.flair.pickRandom(themes)
            : themes[Math.floor(Math.random() * themes.length)];
          if (pick) { state.theme = pick; syncChips(); render(); }
        });
      }
    }

    if (cfg.copyBothId) {
      const copyBoth = document.getElementById(cfg.copyBothId);
      if (copyBoth) {
        const defaultLabel = copyBoth.textContent;
        copyBoth.addEventListener("click", function () {
          const pair = currentPair();
          const combined = pair.a + "\n" + pair.b;
          if (ns.copyText) {
            ns.copyText(combined, copyBoth, pair.a + " · " + pair.b);
          } else if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(combined);
          }
          if (text.copyBothDone) {
            copyBoth.textContent = text.copyBothDone;
            setTimeout(function () { copyBoth.textContent = defaultLabel; }, 1500);
          }
        });
      }
    }

    render();
  }

  ns.coupleGenerator = { init: init, compose: compose };
})();
