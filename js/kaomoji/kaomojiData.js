/* ==========================================================================
   UltraTextGen — kaomojiData.js
   Data for the kaomoji generator: part banks (brackets, eyes, mouths, cheeks,
   arms, decorations) tagged with mood metadata, plus curated starter presets.
   Parts are stored as symmetric left/right pairs so picking one side auto-
   completes the other. Data only — logic lives in kaomojiPageController.js.

   A face is assembled as:
     arms.l + bracket.l + cheek.l + eye.l + mouth + eye.r + cheek.r
       + bracket.r + arms.r + decoration

   Each part carries `m`: an array of mood ids it fits. The token '*' means the
   part fits every mood (used for neutral parts).
   ========================================================================== */

(function () {
  "use strict";

  window.UTG_KAOMOJI_DATA = {

    MOODS: [
      { id: "happy",     label: "Happy" },
      { id: "cute",      label: "Cute" },
      { id: "love",      label: "Love" },
      { id: "sad",       label: "Sad" },
      { id: "angry",     label: "Angry" },
      { id: "shy",       label: "Shy" },
      { id: "surprised", label: "Surprised" },
      { id: "silly",     label: "Silly" },
      { id: "chaotic",   label: "Chaotic" }
    ],

    /* Every part: { id, label, l, r, m }.  Single-glyph parts (mouth,
       decoration) use `c` instead of l/r. */
    PARTS: {

      brackets: [
        { id: "none",   label: "None",   l: "",  r: "",  m: ["*"] },
        { id: "round",  label: "( )",    l: "(", r: ")", m: ["*"] },
        { id: "wide",   label: "（ ）",   l: "（", r: "）", m: ["happy", "cute", "love", "surprised"] },
        { id: "curly",  label: "{ }",    l: "{", r: "}", m: ["cute", "silly"] },
        { id: "square", label: "[ ]",    l: "[", r: "]", m: ["angry", "chaotic"] },
        { id: "kana",   label: "｢ ｣",    l: "｢", r: "｣", m: ["silly", "chaotic"] },
        { id: "lenny",  label: "( ͡ ͡ )", l: "( ͡", r: " ͡)", m: ["silly", "chaotic"] }
      ],

      eyes: [
        { id: "dot",     label: "• •", l: "•", r: "•", m: ["cute", "happy", "love", "shy", "surprised"] },
        { id: "round",   label: "◕ ◕", l: "◕", r: "◕", m: ["cute", "happy", "love"] },
        { id: "big",     label: "● ●", l: "●", r: "●", m: ["surprised", "chaotic"] },
        { id: "happy",   label: "^ ^", l: "^", r: "^", m: ["happy", "silly", "cute"] },
        { id: "closed",  label: "˘ ˘", l: "˘", r: "˘", m: ["happy", "love", "shy"] },
        { id: "curve",   label: "ᵔ ᵔ", l: "ᵔ", r: "ᵔ", m: ["happy", "cute", "love"] },
        { id: "star",    label: "★ ★", l: "★", r: "★", m: ["happy", "surprised", "love"] },
        { id: "sparkle", label: "✧ ✧", l: "✧", r: "✧", m: ["love", "cute", "surprised"] },
        { id: "heart",   label: "♥ ♥", l: "♥", r: "♥", m: ["love"] },
        { id: "teary",   label: "╥ ╥", l: "╥", r: "╥", m: ["sad"] },
        { id: "cry",     label: "T T", l: "T", r: "T", m: ["sad"] },
        { id: "sadcurve",label: "•́ •̀", l: "•́", r: "•̀", m: ["sad", "shy"] },
        { id: "angry",   label: "ಠ ಠ", l: "ಠ", r: "ಠ", m: ["angry", "surprised"] },
        { id: "rage",    label: "◣ ◢", l: "◣", r: "◢", m: ["angry"] },
        { id: "wink",    label: "^ -", l: "^", r: "-", m: ["happy", "silly"] },
        { id: "squint",  label: "> <", l: ">", r: "<", m: ["happy", "silly", "angry"] },
        { id: "flat",    label: "- -", l: "-", r: "-", m: ["silly", "sad", "chaotic"] },
        { id: "surprise",label: "O O", l: "O", r: "O", m: ["surprised"] },
        { id: "dizzy",   label: "@ @", l: "@", r: "@", m: ["chaotic", "silly"] },
        { id: "dead",    label: "x x", l: "x", r: "x", m: ["chaotic", "silly"] }
      ],

      mouths: [
        { id: "omega", label: "ω", c: "ω", m: ["cute", "love", "happy"] },
        { id: "smile", label: "‿", c: "‿", m: ["happy", "love", "cute", "shy"] },
        { id: "w",     label: "w", c: "w", m: ["cute", "silly"] },
        { id: "under", label: "_", c: "_", m: ["silly", "sad", "surprised"] },
        { id: "open",  label: "o", c: "o", m: ["surprised", "cute"] },
        { id: "big",   label: "Д", c: "Д", m: ["surprised", "angry", "chaotic"] },
        { id: "grin",  label: "∀", c: "∀", m: ["silly", "happy"] },
        { id: "frown", label: "︿", c: "︿", m: ["sad", "shy"] },
        { id: "wavy",  label: "﹏", c: "﹏", m: ["sad"] },
        { id: "kiss",  label: "³", c: "³", m: ["love"] },
        { id: "pursed",label: "ε", c: "ε", m: ["love", "shy"] },
        { id: "cat",   label: "ᴥ", c: "ᴥ", m: ["cute"] },
        { id: "vv",    label: "v", c: "v", m: ["cute", "silly"] },
        { id: "delta", label: "Δ", c: "Δ", m: ["chaotic", "angry"] },
        { id: "wave",  label: "〜", c: "〜", m: ["silly", "chaotic"] }
      ],

      cheeks: [
        { id: "none",  label: "None", l: "",  r: "",  m: ["*"] },
        { id: "blush", label: "๑ ๑",  l: "๑", r: "๑", m: ["cute", "shy", "love"] },
        { id: "soft",  label: ",, ,,", l: ",,", r: ",,", m: ["shy", "cute"] },
        { id: "lines", label: "⁄ ⁄",  l: "⁄", r: "⁄", m: ["shy", "love"] },
        { id: "dots",  label: "˶ ˶",  l: "˶", r: "˶", m: ["cute"] },
        { id: "star",  label: "✧ ✧",  l: "✧", r: "✧", m: ["love", "surprised"] }
      ],

      arms: [
        { id: "none",   label: "None",  l: "",    r: "",    m: ["*"] },
        { id: "cheer",  label: "ヽ ノ",  l: "ヽ",   r: "ノ",   m: ["happy", "surprised"] },
        { id: "strong", label: "ᕦ ᕤ",  l: "ᕦ",   r: "ᕤ",   m: ["happy", "silly", "chaotic"] },
        { id: "raise",  label: "٩ ۶",  l: "٩",   r: "۶",   m: ["happy", "love", "angry"] },
        { id: "march",  label: "ᕕ ᕗ",  l: "ᕕ",   r: "ᕗ",   m: ["silly", "chaotic"] },
        { id: "present",label: "╲ ╱",  l: "╲",   r: "╱",   m: ["happy", "surprised"] },
        { id: "shrug",  label: "¯\\ /¯", l: "¯\\", r: "/¯", m: ["silly"] },
        { id: "hug",    label: "⊂ ⊃",  l: "⊂",   r: "⊃",   m: ["love", "cute"] }
      ],

      decorations: [
        { id: "none",    label: "None", c: "",  m: ["*"] },
        { id: "sparkle", label: "✧",    c: "✧", m: ["love", "cute", "surprised"] },
        { id: "heart",   label: "♡",    c: "♡", m: ["love"] },
        { id: "heart2",  label: "❤",    c: "❤", m: ["love"] },
        { id: "star",    label: "☆",    c: "☆", m: ["happy", "surprised"] },
        { id: "note",    label: "♪",    c: "♪", m: ["happy", "silly"] },
        { id: "tilde",   label: "~",    c: "~", m: ["silly", "love"] },
        { id: "flower",  label: "✿",    c: "✿", m: ["cute", "love"] },
        { id: "spark2",  label: "｡ﾟ",   c: "｡ﾟ", m: ["chaotic", "surprised"] }
      ]
    },

    /* Curated starter presets — coherent faces defined by part ids so they load
       cleanly into the builder. Also power the "edit in generator" cross-sell. */
    PRESETS: [
      { label: "Happy",   parts: { brackets: "round", eyes: "happy",   mouths: "omega", cheeks: "none",  arms: "none",  decorations: "none" } },
      { label: "Cute",    parts: { brackets: "round", eyes: "round",   mouths: "smile", cheeks: "blush", arms: "none",  decorations: "flower" } },
      { label: "Love",    parts: { brackets: "round", eyes: "heart",   mouths: "omega", cheeks: "none",  arms: "none",  decorations: "heart" } },
      { label: "Cheer",   parts: { brackets: "round", eyes: "happy",   mouths: "omega", cheeks: "none",  arms: "cheer", decorations: "none" } },
      { label: "Shrug",   parts: { brackets: "round", eyes: "flat",    mouths: "under", cheeks: "none",  arms: "shrug", decorations: "none" } },
      { label: "Lenny",   parts: { brackets: "lenny", eyes: "sadcurve",mouths: "pursed",cheeks: "none",  arms: "none",  decorations: "none" } },
      { label: "Crying",  parts: { brackets: "round", eyes: "teary",   mouths: "frown", cheeks: "none",  arms: "none",  decorations: "none" } },
      { label: "Angry",   parts: { brackets: "round", eyes: "angry",   mouths: "big",   cheeks: "none",  arms: "raise", decorations: "none" } },
      { label: "Wink",    parts: { brackets: "round", eyes: "wink",    mouths: "smile", cheeks: "none",  arms: "none",  decorations: "star" } }
    ]
  };
})();
