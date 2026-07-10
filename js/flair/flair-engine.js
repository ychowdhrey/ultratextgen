/* ==========================================================
   flair-engine.js
   Shared "flair" (decoration) registry for UltraTextGen.

   Flair is the layer that wraps / decorates a generated name so it
   matches the aesthetic a game or platform actually rewards — the
   umbrella ꧁꧂ frame, the crown, the katakana slash. The transform
   itself lives in script.js (applyDecoration); this file is the
   reusable *data* + composition so pages don't re-declare the same
   arrays, and so generated/"surprise" flair can draw from one source.

   Hard line (unchanged): flair output is always paste-safe Unicode
   built from these building blocks — never an image, a bundled font,
   or a dependency. Only the *selection* may be generative.

   Entry shape (same object script.js consumes):
     { text, prefix, suffix, mode?, fill?, sep? }
       mode "wrap"       (default) prefix + name + suffix
       mode "space"      also replaces spaces with `fill` (no-space games)
       mode "interleave" inserts `sep` between graphemes

   API (window.UltraTextGen.flair):
     PACKS               named, reusable decoration sets
     compose(spec)       -> { tabKey: [entries] } for window.UTG_DECORATIONS
     pickRandom(entries) -> one random entry (for generative "surprise" flair)
   ========================================================== */
(function () {
  "use strict";

  const ns = (window.UltraTextGen = window.UltraTextGen || {});

  // Universal mobile-game frame set. Symbols are language-neutral and render
  // in Free Fire / PUBG / ML / Standoff name fields on current clients.
  // Space-less so the result is legal in the strictest field.
  const gameFrames = [
    { text: "꧁༒text༒꧂", prefix: "꧁༒", suffix: "༒꧂" },
    { text: "꧁text꧂", prefix: "꧁", suffix: "꧂" },
    { text: "꧁•text•꧂", prefix: "꧁•", suffix: "•꧂" },
    { text: "༺text༻", prefix: "༺", suffix: "༻" },
    { text: "༺༒text༒༻", prefix: "༺༒", suffix: "༒༻" },
    { text: "❰text❱", prefix: "❰", suffix: "❱" },
    { text: "「text」", prefix: "「", suffix: "」" },
    { text: "『text』", prefix: "『", suffix: "』" },
    { text: "【text】", prefix: "【", suffix: "】" },
    { text: "★彡text彡★", prefix: "★彡", suffix: "彡★" },
    { text: "メtext彡", prefix: "メ", suffix: "彡" },
    { text: "☬text☬", prefix: "☬", suffix: "☬" },
    { text: "࿐text࿐", prefix: "࿐", suffix: "࿐" },
    { text: "★text★", prefix: "★", suffix: "★" }
  ];

  const crowns = [
    { text: "♛text♛", prefix: "♛", suffix: "♛" },
    { text: "♚text♚", prefix: "♚", suffix: "♚" },
    { text: "♔text♔", prefix: "♔", suffix: "♔" },
    { text: "♕text♕", prefix: "♕", suffix: "♕" },
    { text: "👑text♛", prefix: "👑", suffix: "♛" },
    { text: "⚜text⚜", prefix: "⚜", suffix: "⚜" }
  ];

  const warrior = [
    { text: "†text†", prefix: "†", suffix: "†" },
    { text: "⚔text⚔", prefix: "⚔", suffix: "⚔" },
    { text: "☠text☠", prefix: "☠", suffix: "☠" },
    { text: "亗text亗", prefix: "亗", suffix: "亗" },
    { text: "⚡text⚡", prefix: "⚡", suffix: "⚡" },
    { text: "🔥text🔥", prefix: "🔥", suffix: "🔥" }
  ];

  const hearts = [
    { text: "♡text♡", prefix: "♡", suffix: "♡" },
    { text: "❤︎text❤︎", prefix: "❤︎", suffix: "❤︎" },
    { text: "✿text✿", prefix: "✿", suffix: "✿" },
    { text: "❀text❀", prefix: "❀", suffix: "❀" },
    { text: "⋆˚text˚⋆", prefix: "⋆˚", suffix: "˚⋆" },
    { text: "🦋text🦋", prefix: "🦋", suffix: "🦋" }
  ];

  const brackets = [
    { text: "「text」", prefix: "「", suffix: "」" },
    { text: "『text』", prefix: "『", suffix: "』" },
    { text: "【text】", prefix: "【", suffix: "】" },
    { text: "〖text〗", prefix: "〖", suffix: "〗" },
    { text: "«text»", prefix: "«", suffix: "»" },
    { text: "‹text›", prefix: "‹", suffix: "›" }
  ];

  // Spacing modes — the model can do more than wrap. `space` fills the gap
  // between words (games that reject a plain space); `interleave` threads a
  // separator between every letter. Previews use letters (not the "text"
  // placeholder) so the operation reads at a glance.
  const spacing = [
    { text: "A B → A B", mode: "space", fill: "ㅤ" }, // invisible U+3164
    { text: "A B → A•B", mode: "space", fill: "•" },
    { text: "A B → A_B", mode: "space", fill: "_" },
    { text: "a•b•c", mode: "interleave", sep: "•" },
    { text: "a˚b˚c", mode: "interleave", sep: "˚" },
    { text: "a꞉b꞉c", mode: "interleave", sep: "꞉" }
  ];

  const PACKS = {
    gameFrames: gameFrames,
    crowns: crowns,
    warrior: warrior,
    hearts: hearts,
    brackets: brackets,
    spacing: spacing
  };

  // compose({ tabKey: [ packName | entryObject | entryArray, … ] })
  //   -> { tabKey: [flat entries] } ready for window.UTG_DECORATIONS.
  // Unknown pack names are skipped (not fatal), so a page never breaks on a typo.
  function compose(spec) {
    const out = {};
    Object.keys(spec || {}).forEach(function (tabKey) {
      const items = spec[tabKey] || [];
      const entries = [];
      items.forEach(function (item) {
        if (typeof item === "string") {
          (PACKS[item] || []).forEach(function (e) { entries.push(e); });
        } else if (Array.isArray(item)) {
          item.forEach(function (e) { entries.push(e); });
        } else if (item && typeof item === "object") {
          entries.push(item);
        }
      });
      out[tabKey] = entries;
    });
    return out;
  }

  // Generative selection helper — pick one flair at random. The output is still
  // deterministic paste-safe Unicode; only *which* flair is chosen varies.
  function pickRandom(entries) {
    if (!entries || !entries.length) return null;
    return entries[Math.floor(Math.random() * entries.length)];
  }

  ns.flair = { PACKS: PACKS, compose: compose, pickRandom: pickRandom };
})();
