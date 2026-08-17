/* =====================================================================
   UltraTextGen — Contextual Decorator Registry
   ---------------------------------------------------------------------
   Central source of truth for per-page decorator sets. Implements the
   framework in docs/decorator-framework.md.

   A page opts in with ONE line before this script loads:

       <script>window.UTG_DECORATOR_PROFILE = "gothic";</script>
       <script src="/decorators.js"></script>

   The resolver below reads that profile and:
     1. builds window.UTG_DECORATIONS  (read by script.js:27)
     2. sets  window.UTG_DEFAULT_DECO_TAB (read by script.js:218)
     3. rebuilds the standard .decoration-tabs buttons from the profile

   Items are authored as compact [prefix, suffix] tuples; the resolver
   computes the preview `text` as prefix + word + suffix. `word` defaults
   to "text" but is "name" on identity pages (bios, nicknames).

   Adding/curating: keep 4-6 tabs x 8-12 items, best first, default tab =
   the page's primary job. Prefer widely-rendered BMP glyphs; anything
   risky on a target platform should be dropped, not shipped as a top pick.
   Localized mirrors (vi/, tr/, pt/, ...) reference the same profile — do
   NOT fork bespoke sets per locale.

   Display-only i18n: each tab's `label` and each profile's `word` are
   DISPLAY values, translated (with English fallback) via
   window.UTG_I18N.ui.decoratorProfiles[profileKey] once i18n.js's locale
   fetch resolves (see i18n.js's withRuntimeJson + "utg:i18nready"). The
   structural `key`s below (decorations[key] lookups) are never touched by
   translation — same split script.js's getCategoryTabLabel() applies to
   category tabs. Translations live in locales/<lang>.json, not here.
   ===================================================================== */
(function () {
  "use strict";

  /* ----- shared palettes (reused across profiles) ----- */
  var HEARTS      = [["♥ "," ♥"],["♡ "," ♡"],["❤ "," ❤"],["❥ "," ❥"],["ღ "," ღ"],["˚♡˚ "," ˚♡˚"],["♡⃝ "," ♡⃝"],["❣ "," ❣"],["♥︎ "," ♥︎"],["❤︎ "," ❤︎"]];
  var STARS       = [["★ "," ★"],["☆ "," ☆"],["✦ "," ✦"],["✧ "," ✧"],["✪ "," ✪"],["✫ "," ✫"],["✬ "," ✬"],["✭ "," ✭"],["✮ "," ✮"],["⋆ "," ⋆"]];
  var SPARKLE     = [["⋆˙⟡ "," ⟡˙⋆"],["✧˖° "," °˖✧"],["˚₊‧ "," ‧₊˚"],["·˚ "," ˚·"],["｡ﾟ "," ﾟ｡"],["⋆｡°✩ "," ✩°｡⋆"],["⊹ ⋆ "," ⋆ ⊹"],["˚. ✦ "," ✦ .˚"],["·:*¨ "," ¨*:·"],["｡˚ ⋆ "," ⋆ ˚｡"]];
  var FLOWERS     = [["✿ "," ✿"],["❀ "," ❀"],["⚘ "," ⚘"],["❁ "," ❁"],["✾ "," ✾"],["ꕥ "," ꕥ"],["✽ "," ✽"],["❃ "," ❃"],["⁕ "," ⁕"],["✤ "," ✤"]];
  var MINIMAL     = [["• "," •"],["· "," ·"],["° "," °"],["‧ "," ‧"],["– "," –"],["— "," —"],["| "," |"],["› "," ‹"],["◦ "," ◦"],["⋅ "," ⋅"]];
  var ARROWS      = [["→ "," ←"],["➤ "," ➤"],["➜ "," ➜"],["» "," «"],["▸ "," ◂"],["▶ "," ◀"],["⟶ "," ⟵"],["➔ "," ➔"],["↝ "," ↜"],["⮞ "," ⮜"]];
  var GAMING      = [["꧁ "," ꧂"],["【 "," 】"],["『 "," 』"],["「 "," 」"],["⟬ "," ⟭"],["⫸ "," ⫷"],["◥ "," ◤"],["▄︻デ═一 ",""],["≫ "," ≪"],["⌁ "," ⌁"]];
  var FACES       = [["( ◕‿◕ ) "," ( ◕‿◕ )"],["ʕ•ᴥ•ʔ "," ʕ•ᴥ•ʔ"],["(｡•́‿•̀｡) "," (｡•́‿•̀｡)"],["(≧◡≦) "," (≧◡≦)"],["( ˶ˆ ᗜ ˆ˵ ) ",""],["ヾ(≧▽≦*)o ",""],["(´｡• ᵕ •｡`) ",""],["♡( ◡‿◡ ) "," ( ◡‿◡ )♡"],["(⁠づ⁠｡⁠◕‿‿◕⁠｡⁠)⁠づ ",""],["٩(◕‿◕)۶ "," ٩(◕‿◕)۶"]];
  var DIVIDERS    = [["═══ "," ═══"],["━━━ "," ━━━"],["─── "," ───"],["••• "," •••"],["✧･ﾟ "," ﾟ･✧"],["≡ "," ≡"],["❖ "," ❖"],["◈◈ "," ◈◈"],["⋆⑅⋆ "," ⋆⑅⋆"],["·͙⁺˚ "," ˚⁺·͙"]];

  var PROFILES = {

    /* =========================================================
       LENS A — Category / Font pages (typographic pairing)
       ========================================================= */
    "gothic": {
      defaultTab: "occult",
      tabs: [
        { key: "occult",   label: "Occult",   items: [["✝ "," ✝"],["☩ "," ☩"],["✞ "," ✞"],["✟ "," ✟"],["☨ "," ☨"],["♰ "," ♰"],["♱ "," ♱"],["⚰ "," ⚰"],["⚱ "," ⚱"],["☠ "," ☠"]] },
        { key: "cross",    label: "Cross",    items: [["† "," †"],["‡ "," ‡"],["☦ "," ☦"],["✠ "," ✠"],["✚ "," ✚"],["✛ "," ✛"],["✜ "," ✜"],["♁ "," ♁"]] },
        { key: "medieval", label: "Medieval", items: [["⚜ "," ⚜"],["♜ "," ♜"],["♛ "," ♛"],["⚔ "," ⚔"],["🗡 "," 🗡"],["⚑ "," ⚑"],["☗ "," ☗"],["♆ "," ♆"]] },
        { key: "ornate",   label: "Ornate",   items: [["༒ "," ༒"],["꧁ "," ꧂"],["༺ "," ༻"],["ᯓ★ "," ★ᯓ"],["⛧ "," ⛧"],["𖤐 "," 𖤐"],["᯽ "," ᯽"],["⭑ "," ⭑"]] },
        { key: "dark",     label: "Dark",     items: [["☾ "," ☽"],["🥀 "," 🥀"],["🖤 "," 🖤"],["⛓ "," ⛓"],["🕸 "," 🕸"],["🦇 "," 🦇"],["☽◯☾ ",""],["◈ "," ◈"]] }
      ]
    },
    "bold": {
      defaultTab: "heavy",
      tabs: [
        { key: "heavy",   label: "Heavy",   items: [["▌ "," ▐"],["█ "," █"],["▛ "," ▜"],["◤ "," ◥"],["■ "," ■"],["▰ "," ▰"],["▮ "," ▮"],["▬ "," ▬"]] },
        { key: "blocks",  label: "Blocks",  items: [["【 "," 】"],["▐ "," ▌"],["▙ "," ▟"],["◣ "," ◢"],["▣ "," ▣"],["▤ "," ▤"],["⬛ "," ⬛"],["▪ "," ▪"]] },
        { key: "stars",   label: "Stars",   items: STARS.slice(0, 8) },
        { key: "impact",  label: "Impact",  items: [["‼ "," ‼"],["❗ "," ❗"],["★彡 "," 彡★"],["➤ "," ➤"],["➜ "," ➜"],["⮞ "," ⮜"],["» "," «"],["✦ "," ✦"]] },
        { key: "minimal", label: "Minimal", items: MINIMAL.slice(0, 8) }
      ]
    },
    "cursive": {
      defaultTab: "flourish",
      tabs: [
        { key: "flourish", label: "Flourish", items: [["❦ "," ❦"],["❧ "," ❧"],["⚜ "," ⚜"],["✒ "," ✒"],["❢ "," ❢"],["⁘ "," ⁘"],["❥ "," ❥"],["⟡ "," ⟡"]] },
        { key: "hearts",   label: "Hearts",   items: HEARTS.slice(0, 8) },
        { key: "flowers",  label: "Flowers",  items: FLOWERS.slice(0, 8) },
        { key: "sparkle",  label: "Sparkle",  items: SPARKLE.slice(0, 8) },
        { key: "minimal",  label: "Delicate", items: [["· "," ·"],["˙ "," ˙"],["⋆ "," ⋆"],["◦ "," ◦"],["‧ "," ‧"],["⟡ "," ⟡"],["– "," –"],["✿ "," ✿"]] }
      ]
    },
    "cute": {
      word: "name",
      defaultTab: "kawaii",
      tabs: [
        { key: "kawaii",  label: "Kawaii",  items: [["♡ "," ♡"],["ꕥ "," ꕥ"],["ᰔ "," ᰔ"],["♡⃝ "," ♡⃝"],["˚ʚ♡ɞ˚ ",""],["⑅ "," ⑅"],["ꕤ "," ꕤ"],["🎀 "," 🎀"]] },
        { key: "faces",   label: "Faces",   items: FACES.slice(0, 8) },
        { key: "hearts",  label: "Hearts",  items: HEARTS.slice(0, 8) },
        { key: "sparkle", label: "Sparkle", items: SPARKLE.slice(0, 8) },
        { key: "pastel",  label: "Pastel",  items: [["˚₊‧ "," ‧₊˚"],["⊹ "," ⊹"],["๑ "," ๑"],["✿ "," ✿"],["🧸 "," 🧸"],["🍓 "," 🍓"],["🌸 "," 🌸"],["🫧 "," 🫧"]] }
      ]
    },
    "aesthetic": {
      defaultTab: "celestial",
      tabs: [
        { key: "celestial", label: "Celestial", items: [["☾ "," ☽"],["✦ "," ✦"],["｡ﾟ "," ﾟ｡"],["⋆ "," ⋆"],["★彡 "," 彡★"],["☄ "," ☄"],["🌙 "," 🌙"],["✧ "," ✧"]] },
        { key: "sparkle",   label: "Sparkle",   items: SPARKLE.slice(0, 8) },
        { key: "y2k",       label: "Y2K",       items: [["✩ "," ✩"],["⋆｡°✩ "," ✩°｡⋆"],["✮ "," ✮"],["★ "," ★"],["♱ "," ♱"],["🦋 "," 🦋"],["💫 "," 💫"],["✯ "," ✯"]] },
        { key: "soft",      label: "Soft",      items: [["♡ "," ♡"],["⊹ "," ⊹"],["˚. "," .˚"],["๑ "," ๑"],["⟡ "," ⟡"],["◜♡◝ ",""],["ᯓ "," ᯓ"],["◦ "," ◦"]] },
        { key: "minimal",   label: "Minimal",   items: MINIMAL.slice(0, 8) }
      ]
    },
    "bubble": {
      word: "name",
      defaultTab: "rounded",
      tabs: [
        { key: "rounded", label: "Rounded", items: [["◦ "," ◦"],["○ "," ○"],["◍ "," ◍"],["◌ "," ◌"],["● "," ●"],["⊹ "," ⊹"],["⭕ "," ⭕"],["◉ "," ◉"]] },
        { key: "soft",    label: "Soft",    items: [["♡ "," ♡"],["ꕥ "," ꕥ"],["✿ "," ✿"],["๑ "," ๑"],["⑅ "," ⑅"],["◜◝ ",""],["🫧 "," 🫧"],["🍡 "," 🍡"]] },
        { key: "stars",   label: "Stars",   items: STARS.slice(0, 8) },
        { key: "hearts",  label: "Hearts",  items: HEARTS.slice(0, 8) },
        { key: "minimal", label: "Minimal", items: MINIMAL.slice(0, 8) }
      ]
    },
    "italic": {
      defaultTab: "airy",
      tabs: [
        { key: "airy",     label: "Airy",     items: [["⋆ "," ⋆"],["˚ "," ˚"],["｡ "," ｡"],["·˚ "," ˚·"],["⟡ "," ⟡"],["✧ "," ✧"],["˙ "," ˙"],["‧ "," ‧"]] },
        { key: "elegant",  label: "Elegant",  items: [["❧ "," ❧"],["❦ "," ❦"],["⟡ "," ⟡"],["❥ "," ❥"],["◈ "," ◈"],["⁘ "," ⁘"],["✒ "," ✒"],["⚜ "," ⚜"]] },
        { key: "stars",    label: "Stars",    items: STARS.slice(0, 8) },
        { key: "emphasis", label: "Emphasis", items: [["» "," «"],["▸ "," ◂"],["➤ "," ➤"],["/ "," /"],["✦ "," ✦"],["— "," —"],["‹ "," ›"],["| "," |"]] },
        { key: "minimal",  label: "Minimal",  items: MINIMAL.slice(0, 8) }
      ]
    },
    "small-text": {
      defaultTab: "subtle",
      tabs: [
        { key: "subtle",  label: "Subtle",  items: [["· "," ·"],["˙ "," ˙"],["‧ "," ‧"],["⋅ "," ⋅"],["° "," °"],["ᐧ "," ᐧ"],["˚ "," ˚"],["• "," •"]] },
        { key: "tiny",    label: "Tiny",    items: [["˖ "," ˖"],["⟡ "," ⟡"],["⊹ "," ⊹"],["✦ "," ✦"],["✧ "," ✧"],["⋆ "," ⋆"],["◦ "," ◦"],["₊ "," ₊"]] },
        { key: "brackets",label: "Brackets",items: [["₍ "," ₎"],["⟨ "," ⟩"],["‹ "," ›"],["「 "," 」"],["( "," )"],["[ "," ]"],["˹ "," ˺"],["⌈ "," ⌉"]] },
        { key: "minimal", label: "Minimal", items: MINIMAL.slice(0, 8) }
      ]
    },
    "upside-down": {
      defaultTab: "playful",
      tabs: [
        { key: "playful", label: "Playful", items: [["¡ "," !"],["¿ "," ?"],["★ "," ★"],["✦ "," ✦"],["♪ "," ♪"],["☺ "," ☺"],["✌ "," ✌"],["♡ "," ♡"]] },
        { key: "spin",    label: "Spin",    items: [["↺ "," ↻"],["↶ "," ↷"],["⟲ "," ⟳"],["◐ "," ◑"],["◓ "," ◒"],["⤾ "," ⤿"],["≀ "," ≀"],["∴ "," ∵"]] },
        { key: "faces",   label: "Faces",   items: [["( ͡° ͜ʖ ͡°) ",""],["ツ "," ツ"],["¯\\_(ツ)_/¯ ",""],["(╯°□°)╯ ",""],["ಠ_ಠ "," ಠ_ಠ"],["◔̯◔ "," ◔̯◔"],["㋡ "," ㋡"],["☂ "," ☂"]] },
        { key: "minimal", label: "Minimal", items: MINIMAL.slice(0, 8) }
      ]
    },
    "word-wrappers": {
      defaultTab: "brackets",
      tabs: [
        { key: "brackets", label: "Brackets", items: [["【 "," 】"],["『 "," 』"],["「 "," 」"],["〖 "," 〗"],["〔 "," 〕"],["《 "," 》"],["〘 "," 〙"],["⟦ "," ⟧"]] },
        { key: "fancy",    label: "Fancy",    items: [["꧁ "," ꧂"],["⟬ "," ⟭"],["⫸ "," ⫷"],["༺ "," ༻"],["◥ "," ◤"],["≫ "," ≪"],["ᯓ★ "," ★ᯓ"],["【★ "," ★】"]] },
        { key: "frames",   label: "Frames",   items: [["▛ "," ▜"],["◤ "," ◥"],["┏ "," ┓"],["╔ "," ╗"],["▐ "," ▌"],["▁ "," ▁"],["⌜ "," ⌝"],["⎡ "," ⎤"]] },
        { key: "ornate",   label: "Ornate",   items: [["᯽ "," ᯽"],["✦•· "," ·•✦"],["¸,ø¤º° "," °º¤ø,¸"],["•´¯`•. "," .•´¯`•"],["≪◈≫ "," ≪◈≫"],["⋇ "," ⋇"],["✧･ﾟ "," ﾟ･✧"],["◈◈◈ "," ◈◈◈"]] },
        { key: "symbols",  label: "Symbols",  items: [["✦ "," ✦"],["◈ "," ◈"],["⭑ "," ⭑"],["♛ "," ♛"],["☾ "," ☽"],["❖ "," ❖"],["✥ "," ✥"],["♜ "," ♜"]] }
      ]
    },

    /* =========================================================
       LENS B — Platform pages (renders + native convention)
       ========================================================= */
    "discord": {
      word: "name",
      defaultTab: "gaming",
      tabs: [
        { key: "gaming",   label: "Gaming",   items: [["꧁ "," ꧂"],["【 "," 】"],["『 "," 』"],["⟬ "," ⟭"],["⫸ "," ⫷"],["◥ "," ◤"],["≫ "," ≪"],["⌁ "," ⌁"],["⚔ "," ⚔"],["◈ "," ◈"]] },
        { key: "spoiler",  label: "Spoiler",  items: [["|| "," ||"],["`` "," ``"],["*** "," ***"],["__ "," __"],["~~ "," ~~"],["> ",""],["# ",""],["-# ",""]] },
        { key: "status",   label: "Status",   items: [["🟢 "," 🟢"],["🔴 "," 🔴"],["⚡ "," ⚡"],["★ "," ★"],["✦ "," ✦"],["▸ "," ◂"],["» "," «"],["◈ "," ◈"]] },
        { key: "faces",    label: "Kaomoji",  items: FACES.slice(0, 8) },
        { key: "symbols",  label: "Symbols",  items: STARS.slice(0, 8) }
      ]
    },
    "instagram": {
      word: "name",
      defaultTab: "aesthetic",
      tabs: [
        { key: "aesthetic", label: "Aesthetic", items: SPARKLE.slice(0, 8) },
        { key: "celestial", label: "Celestial", items: [["☾ "," ☽"],["✦ "," ✦"],["｡ﾟ "," ﾟ｡"],["⋆ "," ⋆"],["★彡 "," 彡★"],["🌙 "," 🌙"],["✧ "," ✧"],["☄ "," ☄"]] },
        { key: "hearts",    label: "Hearts",    items: HEARTS.slice(0, 8) },
        { key: "flowers",   label: "Flowers",   items: FLOWERS.slice(0, 8) },
        { key: "minimal",   label: "Minimal",   items: MINIMAL.slice(0, 8) }
      ]
    },
    "linkedin": {
      defaultTab: "minimal",
      tabs: [
        { key: "minimal",    label: "Minimal",    items: [["• "," •"],["| "," |"],["– "," –"],["— "," —"],["· "," ·"],["▪ "," ▪"],["‧ "," ‧"],["/ "," /"]] },
        { key: "bullets",    label: "Bullets",    items: [["‣ "," ‣"],["◦ "," ◦"],["▸ "," ◂"],["▹ "," ◃"],["» "," «"],["➤ "," ➤"],["✓ "," ✓"],["★ "," ★"]] },
        { key: "separators", label: "Separators", items: [["│ "," │"],["┃ "," ┃"],["⎯ "," ⎯"],["— • — ",""],["·  ·  · ",""],["|  | ",""],["›  ‹ ",""],["/  / ",""]] },
        { key: "arrows",     label: "Arrows",     items: [["→ "," →"],["➜ "," ➜"],["➤ "," ➤"],["⟶ "," ⟶"],["▸ "," ▸"],["↳ ",""],["» "," »"],["➔ "," ➔"]] },
        { key: "pro",        label: "Accent",     items: [["★ "," ★"],["✦ "," ✦"],["✔ "," ✔"],["◆ "," ◆"],["❖ "," ❖"],["✧ "," ✧"],["⭐ "," ⭐"],["✱ "," ✱"]] }
      ]
    },
    "tiktok": {
      word: "name",
      defaultTab: "trendy",
      tabs: [
        { key: "trendy",    label: "Trendy",    items: [["✩ "," ✩"],["⋆｡°✩ "," ✩°｡⋆"],["🦋 "," 🦋"],["★彡 "," 彡★"],["✮ "," ✮"],["💫 "," 💫"],["⟡ "," ⟡"],["✯ "," ✯"]] },
        { key: "aesthetic", label: "Aesthetic", items: SPARKLE.slice(0, 8) },
        { key: "gaming",    label: "Gaming",    items: GAMING.slice(0, 8) },
        { key: "hearts",    label: "Hearts",    items: HEARTS.slice(0, 8) },
        { key: "faces",     label: "Faces",     items: FACES.slice(0, 8) }
      ]
    },
    "whatsapp": {
      defaultTab: "hearts",
      tabs: [
        { key: "hearts",  label: "Hearts",  items: HEARTS.slice(0, 8) },
        { key: "simple",  label: "Simple",  items: [["• "," •"],["★ "," ★"],["✦ "," ✦"],["♡ "," ♡"],["✿ "," ✿"],["» "," «"],["◦ "," ◦"],["✓ "," ✓"]] },
        { key: "flowers", label: "Flowers", items: FLOWERS.slice(0, 8) },
        { key: "stars",   label: "Stars",   items: STARS.slice(0, 8) },
        { key: "minimal", label: "Minimal", items: MINIMAL.slice(0, 8) }
      ]
    },
    "x": {
      defaultTab: "minimal",
      tabs: [
        { key: "minimal",  label: "Minimal",  items: MINIMAL.slice(0, 8) },
        { key: "arrows",   label: "Arrows",   items: ARROWS.slice(0, 8) },
        { key: "symbols",  label: "Symbols",  items: STARS.slice(0, 8) },
        { key: "dividers", label: "Dividers", items: [["─── "," ───"],["━━ "," ━━"],["· · · ",""],["✦ "," ✦"],["≡ "," ≡"],["|| "," ||"],["— "," —"],["⋆ "," ⋆"]] },
        { key: "accent",   label: "Accent",   items: [["★ "," ★"],["✦ "," ✦"],["◆ "," ◆"],["▸ "," ◂"],["» "," «"],["❖ "," ❖"],["✧ "," ✧"],["➤ "," ➤"]] }
      ]
    },
    "threads": {
      defaultTab: "minimal",
      tabs: [
        { key: "minimal",   label: "Minimal",   items: MINIMAL.slice(0, 8) },
        { key: "aesthetic", label: "Aesthetic", items: SPARKLE.slice(0, 8) },
        { key: "arrows",    label: "Arrows",    items: ARROWS.slice(0, 8) },
        { key: "symbols",   label: "Symbols",   items: STARS.slice(0, 8) },
        { key: "dividers",  label: "Dividers",  items: [["─── "," ───"],["━━ "," ━━"],["· · · ",""],["✦ "," ✦"],["≡ "," ≡"],["|| "," ||"],["— "," —"],["⋆ "," ⋆"]] }
      ]
    },
    "snapchat": {
      word: "name",
      defaultTab: "playful",
      tabs: [
        { key: "playful", label: "Playful", items: [["👻 "," 👻"],["⚡ "," ⚡"],["★ "," ★"],["✨ "," ✨"],["🔥 "," 🔥"],["💛 "," 💛"],["✦ "," ✦"],["☀ "," ☀"]] },
        { key: "hearts",  label: "Hearts",  items: HEARTS.slice(0, 8) },
        { key: "sparkle", label: "Sparkle", items: SPARKLE.slice(0, 8) },
        { key: "faces",   label: "Faces",   items: FACES.slice(0, 8) },
        { key: "stars",   label: "Stars",   items: STARS.slice(0, 8) }
      ]
    },
    "telegram": {
      defaultTab: "minimal",
      tabs: [
        { key: "minimal",  label: "Minimal",  items: MINIMAL.slice(0, 8) },
        { key: "symbols",  label: "Symbols",  items: STARS.slice(0, 8) },
        { key: "arrows",   label: "Arrows",   items: ARROWS.slice(0, 8) },
        { key: "hearts",   label: "Hearts",   items: HEARTS.slice(0, 8) },
        { key: "dividers", label: "Dividers", items: [["─── "," ───"],["━━ "," ━━"],["≡ "," ≡"],["✦ "," ✦"],["• • • ",""],["◈ "," ◈"],["— "," —"],["»» "," ««"]] }
      ]
    },
    "facebook": {
      defaultTab: "hearts",
      tabs: [
        { key: "hearts",  label: "Hearts",  items: HEARTS.slice(0, 8) },
        { key: "stars",   label: "Stars",   items: STARS.slice(0, 8) },
        { key: "flowers", label: "Flowers", items: FLOWERS.slice(0, 8) },
        { key: "simple",  label: "Simple",  items: [["• "," •"],["★ "," ★"],["♡ "," ♡"],["✦ "," ✦"],["» "," «"],["✿ "," ✿"],["◦ "," ◦"],["✓ "," ✓"]] },
        { key: "minimal", label: "Minimal", items: MINIMAL.slice(0, 8) }
      ]
    },
    "youtube": {
      defaultTab: "symbols",
      tabs: [
        { key: "symbols", label: "Symbols", items: STARS.slice(0, 8) },
        { key: "arrows",  label: "Arrows",  items: [["▶ "," ◀"],["➤ "," ➤"],["» "," «"],["➜ "," ➜"],["⏵ "," ⏴"],["→ "," ←"],["▸ "," ◂"],["⮞ "," ⮜"]] },
        { key: "music",   label: "Music",   items: [["♪ "," ♪"],["♫ "," ♫"],["♬ "," ♬"],["♩ "," ♩"],["🎵 "," 🎵"],["🎶 "," 🎶"],["𝄞 "," 𝄞"],["♭ "," ♭"]] },
        { key: "hype",    label: "Hype",    items: [["🔥 "," 🔥"],["⚡ "," ⚡"],["★ "," ★"],["‼ "," ‼"],["💥 "," 💥"],["✦ "," ✦"],["▲ "," ▲"],["✔ "," ✔"]] },
        { key: "minimal", label: "Minimal", items: MINIMAL.slice(0, 8) }
      ]
    },
    "pinterest": {
      defaultTab: "aesthetic",
      tabs: [
        { key: "aesthetic", label: "Aesthetic", items: SPARKLE.slice(0, 8) },
        { key: "hearts",    label: "Hearts",    items: HEARTS.slice(0, 8) },
        { key: "flowers",   label: "Flowers",   items: FLOWERS.slice(0, 8) },
        { key: "stars",     label: "Stars",     items: STARS.slice(0, 8) },
        { key: "minimal",   label: "Minimal",   items: MINIMAL.slice(0, 8) }
      ]
    },

    /* =========================================================
       LENS C — Use-case / JTBD pages (sub-jobs)
       ========================================================= */
    "nickname": {
      word: "name",
      defaultTab: "gaming",
      tabs: [
        { key: "gaming",    label: "Gaming",    items: GAMING.slice(0, 8) },
        { key: "aesthetic", label: "Aesthetic", items: SPARKLE.slice(0, 8) },
        { key: "symbols",   label: "Symbols",   items: [["◈ "," ◈"],["⚔ "," ⚔"],["⭑ "," ⭑"],["♛ "," ♛"],["☾ "," ☽"],["✦ "," ✦"],["❖ "," ❖"],["⚡ "," ⚡"]] },
        { key: "hearts",    label: "Hearts",    items: HEARTS.slice(0, 8) },
        { key: "faces",     label: "Kaomoji",   items: FACES.slice(0, 8) }
      ]
    },
    "football": {
      defaultTab: "emojis",
      tabs: [
        { key: "symbols", label: "Symbols", items: [["⚽ "," ⚽"],["🏆 "," 🏆"],["🥅 "," 🥅"],["🔥 "," 🔥"],["⭐ "," ⭐"],["👑 "," 👑"],["🐐 "," 🐐"],["💪 "," 💪"],["🎯 "," 🎯"],["🚩 "," 🚩"]] },
        { key: "frames", label: "Frames", items: [["「","」"],["【","】"],["⚽•","•⚽"],["►","◄"],["▌","▐"],["〔","〕"],["❰","❱"],["⟦","⟧"]] },
        { key: "dividers", label: "Dividers", items: [["─⚽─ "," ─⚽─"],["✦⚽✦ "," ✦⚽✦"],["▰▰⚽ "," ⚽▰▰"],["•◦⚽◦• "," •◦⚽◦•"],["═══⚽ "," ⚽═══"],["₊˚⚽ "," ⚽˚₊"]] },
        { key: "arrows", label: "Arrows", items: [["➤ "," ➤"],["» "," «"],["→ "," ←"],["⟶ "," ⟵"],["⚽➤ "," ➤⚽"],["➔ "," ➔"]] },
        { key: "minimal", label: "Minimal", items: [["˚⚽˚ "," ˚⚽˚"],["·⚽· "," ·⚽·"],["⊹ "," ⊹"],["✦ "," ✦"],["˖ "," ˖"],[".⚽. "," .⚽."]] },
        { key: "emojis", label: "Emojis", items: [["⚽🔥 "," 🔥⚽"],["🏆⚽ "," ⚽🏆"],["🥅⚽ "," ⚽🥅"],["🐐⚽ "," ⚽🐐"],["🎉⚽ "," ⚽🎉"],["💪🔥 "," 🔥💪"],["⚽⭐ "," ⭐⚽"],["🚩⚽ "," ⚽🚩"]] },
        { key: "flags", label: "Flags", items: [["🇧🇷 "," 🇧🇷"],["🇦🇷 "," 🇦🇷"],["🏴󠁧󠁢󠁥󠁮󠁧󠁿 "," 🏴󠁧󠁢󠁥󠁮󠁧󠁿"],["🇫🇷 "," 🇫🇷"],["🇪🇸 "," 🇪🇸"],["🇩🇪 "," 🇩🇪"],["🇵🇹 "," 🇵🇹"],["🇮🇹 "," 🇮🇹"]] }
      ]
    },
    "classified": {
      word: "name",
      defaultTab: "redaction",
      tabs: [
        { key: "redaction", label: "Redaction", items: [["███ "," ███"],["████ "," ████"],["██████ "," ██████"],["▓▓▓ "," ▓▓▓"],["▓▓▓▓ "," ▓▓▓▓"],["▒▒▒ "," ▒▒▒"],["▒▒▒▒ "," ▒▒▒▒"],["■■■ "," ■■■"],["■■■■ "," ■■■■"],["⬛⬛⬛ "," ⬛⬛⬛"],["⬜⬜⬜ "," ⬜⬜⬜"],["▀▀▀ "," ▀▀▀"],["▄▄▄ "," ▄▄▄"]] },
        { key: "stamps", label: "Stamps", items: [["⟦ CLASSIFIED ⟧ ",""],["⟦ CONFIDENTIAL ⟧ ",""],["⟦ RESTRICTED ⟧ ",""],["⟦ TOP SECRET ⟧ ",""],["⟦ EYES ONLY ⟧ ",""],["⟦ CLEARANCE REQUIRED ⟧ ",""],["【 CLASSIFIED 】",""],["【 CONFIDENTIAL 】",""],["【 TOP SECRET 】",""]] },
        { key: "dossier", label: "Dossier", items: [["⟦ "," ⟧"],["【 "," 】"],["〔 "," 〕"],["⟪ "," ⟫"],["⌈ "," ⌉"],["⌊ "," ⌋"],["⟦ ███ "," ███ ⟧"],["【 ■■■ "," ■■■ 】"],["〔 ▓▓▓ "," ▓▓▓ 〕"],["⟪ ⬛⬛⬛ "," ⬛⬛⬛ ⟫"]] },
        { key: "access", label: "Access", items: [["🔒 "," 🔒"],["⛔ "," ⛔"],["🚫 "," 🚫"],["🕵️ "," 🕵️"],["🗄️ "," 🗄️"],["🧾 "," 🧾"],["🔎 "," 🔎"],["🔐 "," 🔐"],["⚠️ "," ⚠️"]] },
        { key: "evidence", label: "Evidence", items: [["CASE: ",""],["FILE: ",""],["DOC: ",""],["ID: ",""],["REF: ",""],["SUBJECT: ",""],["LOCATION: ",""],["STATUS: ",""],["CLEARANCE: ",""],["TAG: ",""]] },
        { key: "dividers", label: "Dividers", items: [["████████ "," ████████"],["■■■■■■■■ "," ■■■■■■■■"],["▓▓▓▓▓▓▓▓ "," ▓▓▓▓▓▓▓▓"],["▒▒▒▒▒▒▒▒ "," ▒▒▒▒▒▒▒▒"],["▀▀▀▀▀▀▀▀ "," ▀▀▀▀▀▀▀▀"],["▄▄▄▄▄▄▄▄ "," ▄▄▄▄▄▄▄▄"],["▀▄▀▄▀▄ "," ▀▄▀▄▀▄"],["▄▄▀▀▄▄ "," ▄▄▀▀▄▄"],["■ □ ■ □ "," □ ■ □ ■"]] },
        { key: "minimal", label: "Minimal", items: [["[ "," ]"],["( "," )"],["{ "," }"],["| "," |"],["— "," —"],["• "," •"],["⟨ "," ⟩"],["⟪ "," ⟫"]] }
      ]
    },
    "emoji-combinations": {
      defaultTab: "teasing",
      tabs: [
        { key: "teasing", label: "Teasing", items: [[""," 🔥🚀"],[""," 👀✨"],[""," ⏳🎯"],[""," 🚀🌟"],[""," 🔥📢"],[""," ✨🕒"],[""," 🚧🚀"],[""," 👀🔥"],[""," ⚡🎬"],[""," 🎯🔥"]] },
        { key: "win", label: "Win", items: [[""," 🎉🥂"],[""," 🏆✨"],[""," 🚀📈"],[""," 🎊🔥"],[""," 💥🏆"],[""," 🎉🚀"],[""," 🥳✨"],[""," 🏅📈"],[""," 🎉💎"],[""," 🚀🎯"]] },
        { key: "motivation", label: "Motivation", items: [[""," 🔥💪"],[""," 🚀⚡"],[""," 🎯🔥"],[""," 💼🔥"],[""," ⚡🎯"],[""," 🚀💥"],[""," 🔥📈"],[""," 💪🚀"],[""," ⚡💼"],[""," 🎯🔥"]] },
        { key: "confidence", label: "Confidence", items: [[""," 💎✨"],[""," 👑🔥"],[""," 🎯🧠"],[""," 💎🚀"],[""," 👑💼"],[""," 🔥🎯"],[""," 💎⚡"],[""," 👑📈"],[""," 🔥🧠"],[""," 🎯💎"]] },
        { key: "announcement", label: "Announcement", items: [[""," 📢🔥"],[""," 🚀🎉"],[""," ✨🎯"],[""," 📣🚀"],[""," 🔥📦"],[""," 🎉🚀"],[""," ⚡📢"],[""," 🚀📅"],[""," 🎯📢"],[""," 🔥🚀"]] },
        { key: "cta", label: "CTA", items: [[""," 👉📌"],[""," 🎯📊"],[""," 🚀✨"],[""," 📌🔥"],[""," 👉🚀"],[""," 🎯📥"],[""," 📢👉"],[""," 🔥📌"],[""," 🚀👉"],[""," 🎯📎"]] }
      ]
    },
    "bio": {
      word: "name",
      defaultTab: "gaming",
      tabs: [
        { key: "gaming", label: "Gaming", items: [["『","』"],["꧁","꧂"],["▸ "," ◂"],["⟬","⟭"],["✦ "," ✦"],["【","】"],["◥","◤"],["⫸ "," ⫷"],["⌁ "," ⌁"],["≫ "," ≪"],["╾ "," ╼"],["◈ "," ◈"]] },
        { key: "aesthetic", label: "Aesthetic", items: [["·˚ ♡ "," ♡ ˚·"],["✿ "," ✿"],["⋆˙⟡ "," ⟡˙⋆"],["˚₊‧ "," ‧₊˚"],["⊹ ⋆ "," ⋆ ⊹"],["·:*¨ "," ¨*:·"],["。˚ ✦ "," ✦ ˚。"],["ꕥ "," ꕥ"],["✧˖° "," °˖✧"],["᯽ "," ᯽"]] },
        { key: "edgy", label: "Edgy", items: [["† "," †"],["꧁☠ "," ☠꧂"],["✞ "," ✞"],["⛧ "," ⛧"],["☬ "," ☬"],["⸸ "," ⸸"],["༒ "," ༒"],["⚰ "," ⚰"],["☽ "," ☾"],["⊗ "," ⊗"]] },
        { key: "royal", label: "Royal", items: [["♛ "," ♛"],["♚ "," ♚"],["◆ "," ◆"],["❖ "," ❖"],["⚜ "," ⚜"],["۞ "," ۞"],["❂ "," ❂"],["⊰ "," ⊱"],["✠ "," ✠"]] },
        { key: "cute", label: "Cute", items: [["♡ "," ♡"],["☆ "," ☆"],["₊˚ "," ˚₊"],["🎀 "," 🎀"],["⋆ ˚꒰ "," ꒱˚ ⋆"],["♪ "," ♪"],["✩°｡⋆ "," ⋆｡°✩"],["ʚ "," ɞ"],["𖦹 "," 𖦹"]] },
        { key: "bold", label: "Bold", items: [["⚡","⚡"],["★ "," ★"],["》","《"],["▓▒░ "," ░▒▓"],["█▓ "," ▓█"],["◄ "," ►"],["⧫ "," ⧫"]] },
        { key: "clean", label: "Clean", items: [["— "," —"],["• "," •"],["| "," |"],["· "," ·"],["‹ "," ›"],["⟨ "," ⟩"],["⌈ "," ⌉"],["⌊ "," ⌋"]] },
        { key: "mystical", label: "Mystical", items: [["☾ "," ☽"],["⊹ "," ⊹"],["✧ "," ✧"],["☸ "," ☸"],["⊛ "," ⊛"],["⌘ "," ⌘"],["❋ "," ❋"],["⟁ "," ⟁"]] },
        { key: "retro", label: "Retro", items: [["►► "," ◄◄"],["■□ "," □■"],["«« "," »»"],["┃ "," ┃"],["░░ "," ░░"],["▶ "," ◀"],["⊞ "," ⊞"],["⏏ "," ⏏"]] },
        { key: "nature", label: "Nature", items: [["⚘ "," ⚘"],["❧ "," ❧"],["✾ "," ✾"],["⊱✿ "," ✿⊰"],["☘ "," ☘"],["❀ "," ❀"],["❦ "," ❦"]] }
      ]
    },
    "strikethrough": {
      defaultTab: "done",
      tabs: [
        { key: "done", label: "Done", items: [["✔ "," ✔"],["✅ "," ✅"],["☑ "," ☑"],["✓ "," ✓"],["🗹 "," 🗹"],["👍 "," 👍"],["🎉 "," 🎉"],["🏁 "," 🏁"]] },
        { key: "sale", label: "Sale", items: [["🏷 "," 🏷"],["🔥 "," 🔥"],["💸 "," 💸"],["💥 "," 💥"],["⬇ "," ⬇"],["‼ "," ‼"],["★ "," ★"],["❗ "," ❗"]] },
        { key: "cross", label: "Cross", items: [["✗ "," ✗"],["✘ "," ✘"],["✖ "," ✖"],["❌ "," ❌"],["⊘ "," ⊘"],["⨯ "," ⨯"],["╳ "," ╳"],["☓ "," ☓"]] },
        { key: "redacted", label: "Redacted", items: [["█ "," █"],["▓ "," ▓"],["▒ "," ▒"],["░ "," ░"],["▬ "," ▬"],["■ "," ■"],["▮ "," ▮"],["▪ "," ▪"]] },
        { key: "sass", label: "Sass", items: [["😏 "," 😏"],["💀 "," 💀"],["🙄 "," 🙄"],["🤡 "," 🤡"],["😂 "," 😂"],["🤷 "," 🤷"],["* "," *"],["~ "," ~"]] }
      ]
    },
    "underline": {
      defaultTab: "emphasis",
      tabs: [
        { key: "emphasis", label: "Emphasis", items: [["‼ "," ‼"],["❗ "," ❗"],["★ "," ★"],["➤ "," ➤"],["» "," «"],["▸ "," ◂"],["✦ "," ✦"],["❖ "," ❖"]] },
        { key: "rules", label: "Rules", items: [["▬▬ "," ▬▬"],["══ "," ══"],["── "," ──"],["―― "," ――"],["▔▔ "," ▔▔"],["‾‾ "," ‾‾"],["━━ "," ━━"],["═ "," ═"]] },
        { key: "pointers", label: "Pointers", items: [["→ "," ←"],["⟶ "," ⟵"],["☞ "," ☜"],["▶ "," ◀"],["➜ "," ➜"],["⇒ "," ⇐"],["➤ "," ➤"],["› "," ‹"]] },
        { key: "important", label: "Important", items: [["📌 "," 📌"],["⚠ "," ⚠"],["🔖 "," 🔖"],["📍 "," 📍"],["🚩 "," 🚩"],["📢 "," 📢"],["✅ "," ✅"],["❗ "," ❗"]] },
        { key: "minimal", label: "Minimal", items: [["• "," •"],["· "," ·"],["° "," °"],["○ "," ○"],["◦ "," ◦"],["⋆ "," ⋆"],["– "," –"],["— "," —"]] }
      ]
    }

  };

  /* ----- resolver ----- */
  var name = window.UTG_DECORATOR_PROFILE;
  if (!name || !PROFILES[name]) return;

  var profile = PROFILES[name];
  var defaultTab = profile.defaultTab || (profile.tabs[0] && profile.tabs[0].key);

  // Translated { word, tabs: { key: label } } for THIS profile, read from the
  // locale JSON i18n.js fetches (locales/<lang>.json's ui.decoratorProfiles).
  // Undefined until i18n.js's fetch resolves (see "utg:i18nready" below) —
  // which is always true the first time this file runs, since this script is
  // synchronous/non-defer and i18n.js's fetch is async — and stays undefined
  // forever on the English site, where window.UTG_I18N is never set. Every
  // caller falls back to the profile's own English word/label, so this is
  // purely additive: same split as script.js's getCategoryTabLabel().
  function translatedProfileData() {
    var i18n = window.UTG_I18N;
    return i18n && i18n.ui && i18n.ui.decoratorProfiles && i18n.ui.decoratorProfiles[name];
  }

  function currentWord() {
    var t = translatedProfileData();
    return (t && t.word) || profile.word || "text";
  }

  function tabLabel(tab) {
    var t = translatedProfileData();
    var translated = t && t.tabs && t.tabs[tab.key];
    return translated || tab.label;
  }

  var decorations = {};

  // (Re)computes every tab's preview items from the CURRENT word (English on
  // the first call, translated once i18n lands). Mutates existing item
  // objects/arrays in place rather than replacing them, so that script.js's
  // own `decorations` — captured once at parse time as
  // Object.assign({}, DEFAULT_DECORATIONS, window.UTG_DECORATIONS), which
  // holds these SAME array/object references — sees the updated text on its
  // next render (tab switch, "Surprise" pick, etc.) without decorators.js
  // ever reassigning window.UTG_DECORATIONS after the initial build.
  function buildDecorations() {
    var word = currentWord();
    profile.tabs.forEach(function (tab) {
      var list = decorations[tab.key] || (decorations[tab.key] = []);
      tab.items.forEach(function (it, i) {
        // Compact tuple form [prefix, suffix] — the resolver computes the preview.
        // Full object form { prefix, suffix, text? } — used by migrated profiles
        // that carry their own exact preview strings; a literal `text` has no
        // {word} slot and is left exactly as authored.
        var prefix = Array.isArray(it) ? it[0] : (it.prefix || "");
        var suffix = Array.isArray(it) ? it[1] : (it.suffix || "");
        var explicitText = Array.isArray(it) ? null : it.text;
        var text = explicitText || (prefix + word + suffix);
        if (list[i]) {
          list[i].text = text;
          list[i].prefix = prefix;
          list[i].suffix = suffix;
        } else {
          list[i] = { text: text, prefix: prefix, suffix: suffix };
        }
      });
    });
  }

  buildDecorations();

  window.UTG_DECORATIONS = decorations;
  window.UTG_DEFAULT_DECO_TAB = defaultTab;

  /* Rebuild the standard decoration tabs. On platform pages there can be a
     second .decoration-tabs row (e.g. Discord's context tabs, which use
     data-context) — target only the container that holds [data-deco-tab],
     falling back to the one nearest #decorationGrid. */
  function findTabsContainer() {
    var all = document.querySelectorAll(".decoration-tabs");
    for (var i = 0; i < all.length; i++) {
      if (all[i].querySelector("[data-deco-tab]")) return all[i];
    }
    var grid = document.getElementById("decorationGrid");
    if (grid) {
      var section = grid.closest ? grid.closest(".decoration-section") : null;
      var scope = section || grid.parentElement;
      if (scope) return scope.querySelector(".decoration-tabs");
    }
    return null;
  }

  function buildTabs() {
    var container = findTabsContainer();
    if (!container) return false;
    var html = "";
    profile.tabs.forEach(function (tab) {
      var active = tab.key === defaultTab ? " active" : "";
      html += '<button class="decoration-tab' + active + '" data-deco-tab="' + tab.key + '">' + tabLabel(tab) + "</button>";
    });
    container.innerHTML = html;
    return true;
  }

  // Build synchronously NOW. This script is non-defer and placed at the end
  // of <body>, so the decoration section above is already parsed. Building here
  // — before the deferred script.js runs init() and wires the tab click
  // handlers (script.js:918) — guarantees script.js binds the NEW buttons.
  // Deferring to DOMContentLoaded would run AFTER script.js init and leave the
  // rebuilt tabs without click handlers.
  var built = buildTabs();
  if (built === false) {
    // Safety net for any template that places scripts before the tabs.
    document.addEventListener("DOMContentLoaded", buildTabs);
  }

  // i18n.js's fetch resolves asynchronously, after the synchronous build
  // above has already rendered tabs + preview text with the English
  // fallback. When the translation lands, patch everything in place instead
  // of tearing the tabs down and rebuilding — same reasoning as script.js's
  // updateCategoryTabLabels(): relabel the tab buttons, recompute preview
  // text (mutating decorations in place, see buildDecorations() above so
  // script.js's copy of the same objects stays in sync), and patch whatever
  // decoration chips happen to already be on screen for the active tab.
  //
  // On the English site i18n.js returns early and never fetches, so this
  // event never fires and nothing here runs — zero behavior change there.
  function applyTranslatedProfile() {
    if (!translatedProfileData()) return; // no translation for this profile/locale — stay on English fallback

    buildDecorations();

    var container = findTabsContainer();
    if (!container) return;

    var buttons = container.querySelectorAll("[data-deco-tab]");
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      for (var j = 0; j < profile.tabs.length; j++) {
        if (profile.tabs[j].key === btn.dataset.decoTab) {
          btn.textContent = tabLabel(profile.tabs[j]);
          break;
        }
      }
    }

    // Patch whatever decoration chips script.js's renderDecorations() has
    // already rendered into #decorationGrid for the currently active tab —
    // those .decoration-item elements are built in the same order as
    // decorations[currentDecoTab], the array we just mutated above.
    var activeBtn = container.querySelector(".decoration-tab.active");
    var activeKey = (activeBtn && activeBtn.dataset.decoTab) || defaultTab;
    var activeItems = decorations[activeKey];
    var grid = document.getElementById("decorationGrid");
    if (grid && activeItems) {
      var chips = grid.querySelectorAll(".decoration-item");
      for (var k = 0; k < chips.length && k < activeItems.length; k++) {
        chips[k].textContent = activeItems[k].text;
      }
    }
  }

  document.addEventListener("utg:i18nready", applyTranslatedProfile);
})();
