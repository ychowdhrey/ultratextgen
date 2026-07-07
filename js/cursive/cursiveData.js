/*
 * cursiveData.js — data for the dedicated cursive experience
 * (category/cursive-fonts/). Flourish presets for the generator, signature
 * presets for the name studio, single-letter accent wrappers for the A–Z
 * explorer, and the quick-fill word/name chips. Pure data, no logic — read by
 * js/cursive/cursivePageController.js. Exposes window.UTG_CURSIVE_DATA only.
 */
(function () {
  "use strict";

  window.UTG_CURSIVE_DATA = {

    // Flourish presets rendered as extra cards in the main generator, on top
    // of the registry's cursive styles. `base` names a style in
    // window.textStyles; `pre`/`post` wrap the rendered text.
    presets: [
      { name: "Script Hearts",       base: "Ultra Script",      pre: "♡ ",      post: " ♡" },
      { name: "Script Arrow Bio",    base: "Ultra Script",      pre: "╰┈➤ ",   post: "" },
      { name: "Bold Script Stars",   base: "Ultra Script Bold", pre: "✦ ",      post: " ✦" },
      { name: "Script Vintage",      base: "Ultra Script",      pre: "❦ ",      post: " ❦" },
      { name: "Script Soft Dots",    base: "Ultra Script",      pre: "˚₊· ",    post: " ·₊˚" },
      { name: "Bold Script Ribbon",  base: "Ultra Script Bold", pre: "⊹ ࣪ ˖ ",  post: " ˖ ࣪ ⊹" },
      { name: "Script Underline",    base: "Ultra Script",      combining: "̲" },
      { name: "Bold Script Crown",   base: "Ultra Script Bold", pre: "♛ ",      post: "" }
    ],

    // Signature looks for the name & signature studio. Rendered from the
    // typed name; `initials: true` presets use the first letter of each word.
    signatures: [
      { name: "Classic Signature",   base: "Ultra Script" },
      { name: "Bold Signature",      base: "Ultra Script Bold" },
      { name: "Signed Underline",    base: "Ultra Script Bold", combining: "̲" },
      { name: "Sparkle Signature",   base: "Ultra Script",      pre: "⋆˚ ",  post: " ˚⋆" },
      { name: "Ornate Nameplate",    base: "Ultra Script Bold", pre: "꧁ ",   post: " ꧂" },
      { name: "Autograph Star",      base: "Ultra Script Bold", pre: "",     post: " ✦" },
      { name: "Monogram Initials",   base: "Ultra Script Bold", initials: true, joiner: "." },
      { name: "Gothic Signature",    base: "Ultra Gothic Script" }
    ],

    // Accent wrappers offered for a single letter in the A–Z explorer.
    letterAccents: [
      { name: "Sparkle",  pre: "⋆ ",    post: " ⋆" },
      { name: "Hearts",   pre: "♡",     post: "♡" },
      { name: "Wings",    pre: "-ˋˏ ",  post: " ˎˊ-" },
      { name: "Ornate",   pre: "꧁",     post: "꧂" }
    ],

    // Quick-fill chips under the main input — the words people actually
    // search for ("love in cursive", "happy birthday in cursive", …).
    quickWords: ["love", "Happy Birthday", "Thank You", "family", "forever", "blessed"],

    // Popular-name chips for the signature studio (top "«name» in cursive"
    // searches). Kept short; any name can be typed.
    nameChips: ["Olivia", "Isabella", "Emily", "Elizabeth", "Emma", "Sophia", "Grace", "David", "Joseph", "Alex"],

    // Platform bio limits for the will-it-fit badges (counted in code points,
    // matching how the platforms count pasted Unicode).
    platformLimits: [
      { label: "Instagram bio", limit: 150 },
      { label: "TikTok bio",    limit: 80 },
      { label: "X bio",         limit: 160 }
    ]
  };
})();
