/* ==========================================================================
   UltraTextGen — decoratorData.js
   Curated theme packs for the text decoration engine.
   Exposes window.UTG_DECORATOR_THEMES (ordered array of theme objects).

   Theme shape:
   {
     key:       'sparkle',          // stable id (localStorage, analytics)
     label:     'Sparkle',          // chip label
     icon:      '✨',               // chip icon
     pairs:     [['✧･ﾟ','ﾟ･✧']],   // [left, right] wrapper pairs
     charms:    ['✦','✧'],          // single symbols stacked at the ends
     sprinkles: ['✦'],              // joiners between words / banner atoms
     lines:     ['⋆ ˚ ⋆ ˚ ⋆']       // ready-made divider lines (above/below)
   }

   Every pair must render on stock iOS + Android keyboards' system fonts —
   stick to well-supported Unicode blocks and common emoji.
   ========================================================================== */

(function () {
  "use strict";

  window.UTG_DECORATOR_THEMES = [

    {
      key: 'sparkle', label: 'Sparkle', icon: '✨',
      pairs: [
        ['✧･ﾟ: *', '* :･ﾟ✧'],
        ['⋆｡°✩', '✩°｡⋆'],
        ['˚₊· ͟͟͞͞➳', '⋆˚₊'],
        ['·:*¨༺', '༻¨*:·'],
        ['✦•·', '·•✦'],
        ['*.✦', '✦.*']
      ],
      charms: ['✦', '✧', '⋆', '˚', '✩', '·'],
      sprinkles: ['✦', '⋆', '✧'],
      lines: ['⋆ ˚ ✦ ˚ ⋆ ˚ ✦ ˚ ⋆', '✧ ∘ ✦ ∘ ✧ ∘ ✦ ∘ ✧']
    },

    {
      key: 'hearts', label: 'Hearts', icon: '♡',
      pairs: [
        ['♡', '♡'],
        ['꒰♡', '♡꒱'],
        ['≪♡', '♡≫'],
        ['🫶', '🫶'],
        ['💗', '💗'],
        ['𓆩♡', '♡𓆪']
      ],
      charms: ['♡', '♥︎', '❣', 'ᰔ', '❤︎'],
      sprinkles: ['♡', '❤︎', '∙'],
      lines: ['♡ ∙ ♡ ∙ ♡ ∙ ♡ ∙ ♡', '❤︎ ⎯ ❤︎ ⎯ ❤︎']
    },

    {
      key: 'coquette', label: 'Coquette', icon: '🎀',
      pairs: [
        ['🎀', '🎀'],
        ['⋆˙⟡', '⟡˙⋆'],
        ['୨୧ ·', '· ୨୧'],
        ['˗ˏˋ', 'ˎˊ˗'],
        ['ᯓ', 'ᯓ']
      ],
      charms: ['🎀', '⟡', '୨୧', 'ᰔ', '˚'],
      sprinkles: ['⟡', '୨୧', '·'],
      lines: ['୨୧ ⋆ ˚ ୨୧ ⋆ ˚ ୨୧', '⟡ ࣪ ⟡ ࣪ ⟡']
    },

    {
      key: 'kawaii', label: 'Kawaii', icon: 'ʚɞ',
      pairs: [
        ['꒰', '꒱'],
        ['₍ᐢ•ᴥ•ᐢ₎', '₍ᐢ•ᴥ•ᐢ₎'],
        ['ʚ', 'ɞ'],
        ['(´｡•', '•｡`)'],
        ['✿◕', '◕✿']
      ],
      charms: ['ෆ', '⑅', 'ᵕ̈', '°', '๑'],
      sprinkles: ['⑅', 'ෆ', '๑'],
      lines: ['⌒ ⑅ ⌒ ⑅ ⌒ ⑅ ⌒', '꒷꒦꒷꒦꒷꒦꒷꒦꒷']
    },

    {
      key: 'gaming', label: 'Gaming', icon: '꧁꧂',
      pairs: [
        ['꧁', '꧂'],
        ['꧁༺', '༻꧂'],
        ['『', '』'],
        ['×͜×', '×͜×'],
        ['▄︻', '︻▄'],
        ['◤', '◥']
      ],
      charms: ['亗', '★', 'ソ', '么', '✘'],
      sprinkles: ['彡', '★', '×'],
      lines: ['━━━━━━━━━━', '▰▰▰▰▰▰▰▰']
    },

    {
      key: 'gothic', label: 'Gothic', icon: '†',
      pairs: [
        ['†', '†'],
        ['✞', '✞'],
        ['⛧', '⛧'],
        ['☠︎', '☠︎'],
        ['𖤐', '𖤐']
      ],
      charms: ['†', '⛧', '𖤐', '✞', '☾'],
      sprinkles: ['†', '⛧', '─'],
      lines: ['✞ ─ ⛧ ─ ✞ ─ ⛧ ─ ✞', '† † † † †']
    },

    {
      key: 'dark-academia', label: 'Dark Academia', icon: '📖',
      pairs: [
        ['📖', '📖'],
        ['🕯️', '🕯️'],
        ['⟪', '⟫'],
        ['🖋️', '🖋️'],
        ['❦', '❦']
      ],
      charms: ['🕯️', '🪶', '📜', '⏳', '♟️'],
      sprinkles: ['·', '❦', '§'],
      lines: ['📖 ⋆ 🕯️ ⋆ 📖 ⋆ 🕯️ ⋆ 📖', '❦ ⸻ ❦ ⸻ ❦']
    },

    {
      key: 'celestial', label: 'Celestial', icon: '☾',
      pairs: [
        ['☾', '☽'],
        ['⋆⁺₊', '₊⁺⋆'],
        ['✩', '✩'],
        ['🌙', '⭐'],
        ['☁︎', '☁︎']
      ],
      charms: ['☾', '✩', '⋆', '☁︎', '˚'],
      sprinkles: ['✩', '⋆', '∘'],
      lines: ['⋆ ˚ ☾ ˚ ⋆ ˚ ☽ ˚ ⋆', '✩ ₊ ˚ ✩ ₊ ˚ ✩']
    },

    {
      key: 'flowers', label: 'Flowers', icon: '✿',
      pairs: [
        ['✿', '✿'],
        ['❀', '❀'],
        ['⚘', '⚘'],
        ['🌸', '🌸'],
        ['꒷꒦', '꒦꒷']
      ],
      charms: ['✿', '❀', '❁', '✾', 'ᨒ'],
      sprinkles: ['✿', 'ᨒ', '·'],
      lines: ['✿ ᨒ ✿ ᨒ ✿ ᨒ ✿', '❀ ⚘ ❀ ⚘ ❀']
    },

    {
      key: 'cottagecore', label: 'Cottagecore', icon: '🍄',
      pairs: [
        ['🌾', '🌾'],
        ['🍄', '🍄'],
        ['🧺 ·', '· 🧺'],
        ['𓂃', '𓂃'],
        ['⋆｡🐝', '🐝｡⋆']
      ],
      charms: ['🍄', '🌿', '🍯', '🐌', '✦'],
      sprinkles: ['🌿', '🍄', '·'],
      lines: ['🌾 ⋆ 🍄 ⋆ 🌾 ⋆ 🍄 ⋆ 🌾', '🐝 · 🌿 · 🐝 · 🌿 · 🐝']
    },

    {
      key: 'birthday', label: 'Birthday', icon: '🎂',
      pairs: [
        ['🎉', '🎉'],
        ['🎂', '🎂'],
        ['🥳', '🥳'],
        ['🎈', '🎈'],
        ['⋆🎊', '🎊⋆'],
        ['🎁', '🎁']
      ],
      charms: ['🎉', '🎂', '🎈', '🎁', '✨', '🎊'],
      sprinkles: ['🎉', '🎈', '✨'],
      lines: ['🎉 ✨ 🎂 ✨ 🎉 ✨ 🎂 ✨ 🎉', '🎈 🎊 🎈 🎊 🎈 🎊 🎈']
    },

    {
      key: 'energy', label: 'Fire & Ice', icon: '🔥',
      pairs: [
        ['🔥', '🔥'],
        ['❄️', '❄️'],
        ['⚡', '⚡'],
        ['💥', '💥'],
        ['🧊', '🧊']
      ],
      charms: ['🔥', '❄️', '⚡', '✨'],
      sprinkles: ['🔥', '❄️', '•'],
      lines: ['🔥 • 🔥 • 🔥', '❄️ ∙ ❄️ ∙ ❄️']
    },

    {
      key: 'y2k', label: 'Y2K', icon: '★彡',
      pairs: [
        ['★彡', '彡★'],
        ['☆彡', '彡☆'],
        ['≋', '≋'],
        ['✰', '✰'],
        ['⋆⭒˚｡⋆', '⋆｡˚⭒⋆']
      ],
      charms: ['★', '☆', '✰', '〜', '⭒'],
      sprinkles: ['★', '☆', '〜'],
      lines: ['≋ ≋ ≋ ≋ ≋ ≋ ≋', '★ 〜 ☆ 〜 ★ 〜 ☆']
    },

    {
      key: 'arrows', label: 'Arrows', icon: '➤',
      pairs: [
        ['→', '←'],
        ['⇢', '⇠'],
        ['»', '«'],
        ['➳', '➳'],
        ['↝', '↜']
      ],
      charms: ['➤', '➳', '⇢', '↣'],
      sprinkles: ['➤', '→', '›'],
      lines: ['→ → → → →', '➳ ➳ ➳ ➳ ➳']
    },

    {
      key: 'music', label: 'Music', icon: '♪',
      pairs: [
        ['♪', '♪'],
        ['♫', '♫'],
        ['𝄞', '𝄞'],
        ['₊˚🎧', '🎧˚₊'],
        ['♩ ·', '· ♩']
      ],
      charms: ['♪', '♫', '♬', '♩'],
      sprinkles: ['♪', '♫', '·'],
      lines: ['♪ ♫ ♪ ♫ ♪ ♫ ♪', '𝄞 ⎯ ♪ ⎯ ♫ ⎯ 𝄞']
    },

    {
      key: 'minimal', label: 'Minimal', icon: '·',
      pairs: [
        ['—', '—'],
        ['·', '·'],
        ['｜', '｜'],
        ['‹', '›'],
        ['◦', '◦']
      ],
      charms: ['·', '◦', '—', '∙'],
      sprinkles: ['·', '◦', '—'],
      lines: ['─────────────', '· · · · · · · · ·']
    },

    {
      key: 'brackets', label: 'Brackets', icon: '【】',
      pairs: [
        ['【', '】'],
        ['〖', '〗'],
        ['「', '」'],
        ['《', '》'],
        ['⟦', '⟧'],
        ['﴾', '﴿'],
        ['⌜', '⌟']
      ],
      charms: ['¤', '◈', '▸'],
      sprinkles: ['◈', '¤', '｜'],
      lines: ['┈┈┈┈┈┈┈┈┈┈', '▸ ◈ ▸ ◈ ▸']
    }

  ];

})();
