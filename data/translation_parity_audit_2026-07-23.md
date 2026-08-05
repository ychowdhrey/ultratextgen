# Translation Parity Audit

Generated 2026-07-23. Run `node scripts/audit-translation-parity.js` to regenerate.

```
Translation Parity Audit
  hreflang clusters with an EN anchor:     218
  locale pairs compared:                   1400
  actionable drift (likely a missed sync): 1061
  bulk/coverage-gap pairs (score > 12):     320
  pairs fully excused by ledger:           0

Showing actionable drift only. Bulk coverage-gap pairs are summarized below (pass --show-bulk for full detail, --threshold N to change the cutoff).

── High-confidence: EN feat commits with un-synced locale siblings (12) ──

2026-07-22  32270475 feat: add PUBG/BGMI and Steam name symbol library pages
  pages:            library/index.html
  un-synced locales (14): ar, da, de, it, ja, ko, nl, no, pl, pt, ru, sv, th, vi

2026-07-22  c3025608 feat: add live Riot ID checker for Valorant name generator
  pages:            usecase/index.html, usecase/nickname-generator/index.html, usecase/free-fire-name-generator/index.html
  un-synced locales (12): ar, de, es, fr, hi, id, it, pt, th, tr, vi, zh-TW

2026-07-22  79a6291a feat: add Omani rial and Saudi riyal symbol pages, fix dirham factual error
  pages:            library/currency-symbols/index.html
  un-synced locales (9): ar, da, de, es, it, ko, nl, sv, tr

2026-07-22  10f4659a feat: add bulletin-board size/tiling option to bubble-letters alphabet print
  pages:            printables/bubble-letters/index.html
  un-synced locales (3): es, fr, pt

2026-07-22  91a54ac3 feat: add symbol/ identity pages for Meteor, Monarch Butterfly, and Thumb Sign
  pages:            library/animal-emojis/index.html
  un-synced locales (2): ar, th

2026-07-22  c6794de1 feat: add symbol/ identity pages for Cracking Face, Pickle, and dirham sign
  pages:            library/food-drink-emojis/index.html
  un-synced locales (1): th

2026-07-20  6d318dc1 feat: TikTok compatibility checker, Taiwan Arena of Valor page, safe mode + platform-router features
  pages:            category/small-text/index.html, category/superscript/index.html
  un-synced locales (15): bs, cs, de, es, fr, hr, id, nl, pl, pt, ro, ru, sk, sr, tr

2026-07-19  4cf2b9c6 feat: de-cannibalize Discord 'allowed characters' cluster (competitor pointers)
  pages:            guide/discord-text-formatting-explained/index.html, guide/discord-safe-name-styling/index.html
  un-synced locales (27): ar, bs, cs, da, de, es, fr, hi, hr, id, it, ja, ko, nl, no, pl, pt, ro, ru, sk, sr, sv, th, tl, tr, vi, zh-TW

2026-07-18  ae026725 feat: fix internal-linking dead-ends, faucets, and orphans
  pages:            library/text-faces-kaomoji/index.html, category/gothic-fonts/index.html, category/italic-fonts/index.html, category/text-decorator/index.html, category/bold-fonts/index.html, category/aesthetic-fonts/index.html, category/strikethrough-text/index.html, category/cursive-fonts/index.html, category/upside-down-text/index.html, usecase/bio-font/index.html, usecase/text-to-emoji/index.html, category/cute-fonts/index.html, usecase/vertical-text/index.html, category/underline-text/index.html, category/bubble-fonts/index.html, category/case-converter/index.html, library/sad-kaomoji/index.html, category/subscript/index.html
  un-synced locales (25): ar, bs, cs, de, es, fr, hi, hr, id, it, ja, ko, nl, no, pl, pt, ro, ru, sk, sr, th, tl, tr, vi, zh-TW

2026-07-18  baffd648 feat: ship 16 new symbol/ pages for Tier A/B pending English backlog
  pages:            library/greek-letter-symbols/index.html, library/religious-symbols/index.html, library/punctuation-symbols/index.html, library/crown-royalty-symbols/index.html, library/keyboard-symbols/index.html
  un-synced locales (15): ar, da, de, es, fr, id, it, ja, ko, nl, no, pl, pt, sv, tr

2026-07-18  57702e5e feat: /learn/ education pillar, cursive hub treatment, bridge strips, cursive spoke art
  pages:            printables/cursive-alphabet/index.html
  un-synced locales (4): es, fr, it, pt

2026-07-16  8bd0fb2f feat(roblox): add old Roblox font generator hub at /roblox/old-roblox-font/
  pages:            roblox/index.html
  un-synced locales (3): es, pl, vi

(1061 smaller-diff pairs and 320 bulk/coverage-gap pairs omitted — pass --full to print every pair, or --json <path> for the raw data.)

```