# Guide Opportunity Map — 2026-06-28

Output of one full cycle of `docs/guide-content-workflow.md`. Companion data:
guide rows `OPP-0766`–`OPP-0793` in `data/library_opportunities.csv` (`page_type=guide`).

---

## 1. Existing-guide gaps (what's claimed vs what's wide open)

The live `/guide/` section (8 pages) is **strategy- and psychology-led**: how to
*use* styled text well — comments, hooks, branding, rhetoric, scanning, vertical-text
attention. It is excellent at *"how do I make my writing perform?"*

It is almost silent on the other half of the territory — the **mechanics, failures,
and ethics** of styled Unicode — which is where the *highest-volume, highest-frustration*
forum demand actually lives:

| Claimed today | Wide-open gap (this map) |
|---|---|
| LinkedIn comment/hook strategy; branding; rhetoric; scanning; vertical-text *science* | **Why text breaks** (boxes/tofu, mojibake, reverts, strips-on-save) |
| Typography as signal / persuasion | **Compatibility** — which styles are safe, on which platform, in which field |
| Attention psychology | **Accessibility & search** — screen readers, SEO indexing, the shadowban myth |
| — | **Platform formatting mechanics** — Discord (markdown vs Unicode vs Nitro), IG bio spacing, TikTok's three "font" methods, LinkedIn's "where it's blocked in 2026" |
| — | **Identity** — game-name character rules, sweaty/clan tags, cross-platform handles |
| — | **Decoding** — emoji meaning shifts, kaomoji/emoticon taxonomy, aesthetic/vaporwave lore |
| — | **Craft** — dividers/headers/separators that survive |

**The one thesis that unifies the whole gap** (validated across all 15 forum
territories): *Styled "fonts" are not fonts — they are substitute Unicode characters
living in plain-text fields the platform controls. That single fact explains every
failure users hit — boxes, strips, reverts, rejected handles, silent search-invisibility,
broken screen readers.* Own that explainer and the rest of the cluster hangs off it.

This is a **thought-leadership** opening, not just an SEO one: every font-generator
competitor has a conflict of interest (they sell decoration), so none tells the honest,
mechanism-level story. UltraTextGen being the tool that *explains its own limits* is the
most defensible authority play available.

---

## 2. Scoring model

Each idea scored 1–5 on 8 axes (see `guide-content-workflow.md` §5); **priority = sum (max 40)**.
Tiers: **P1 ≥32 · P2 28–31 · P3 24–27 · hold <24**.

Axes: `SF` search-footprint · `FD` forum-demand · `TL` thought-leadership ·
`CR` commercial-relevance · `IL` internal-linking · `UQ` uniqueness ·
`EX` ease-of-execution · `TS` thin-content-safety *(5 = rich, 1 = likely thin)*.

---

## 3. Ranked opportunity table (28 ideas)

| # | OPP | Title (short) | Slug | Cluster | SF | FD | TL | CR | IL | UQ | EX | TS | **Pri** | Tier |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0767 | Why fonts turn into boxes (+ safe-style tiers) | why-fonts-show-as-boxes | Compatibility | 5 | 5 | 5 | 4 | 5 | 5 | 5 | 5 | **39** | P1 |
| 2 | 0766 | How Unicode text styling really works (PILLAR) | how-unicode-fonts-work | Unicode education | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | **38** | P1 |
| 3 | 0778 | Does bold text hurt LinkedIn reach? (1M+ posts) | linkedin-bold-text-reach | Platform: LinkedIn | 5 | 5 | 5 | 4 | 4 | 5 | 4 | 5 | **37** | P1 |
| 4 | 0771 | Discord formatting: markdown vs Unicode vs Nitro | discord-text-formatting-explained | Platform: Discord | 5 | 5 | 5 | 5 | 4 | 4 | 4 | 5 | **37** | P1 |
| 5 | 0769 | Are fancy fonts bad for accessibility? | fancy-fonts-accessibility-guide | Accessibility | 4 | 5 | 5 | 3 | 5 | 5 | 4 | 5 | **36** | P1 |
| 6 | 0775 | Why your IG bio collapses to one line | instagram-bio-line-breaks | Platform: Instagram | 5 | 5 | 4 | 5 | 4 | 4 | 5 | 4 | **36** | P1 |
| 7 | 0776 | Do fancy fonts get you shadowbanned? (myth) | instagram-fonts-shadowban-myth | Platform: Instagram | 5 | 5 | 5 | 4 | 4 | 5 | 4 | 3 | **35** | P1 |
| 8 | 0772 | Where fancy fonts work in Discord (field map) | discord-where-fonts-work | Platform: Discord | 4 | 5 | 4 | 5 | 4 | 4 | 4 | 5 | **35** | P1 |
| 9 | 0792 | Dividers, separators & headers that survive | dividers-separators-guide | Copy-paste / Aesthetic | 4 | 5 | 4 | 5 | 5 | 4 | 4 | 4 | **35** | P1 |
| 10 | 0773 | Colored text in Discord (ANSI), honestly | discord-colored-text-guide | Platform: Discord | 5 | 5 | 4 | 4 | 3 | 4 | 4 | 5 | **34** | P1 |
| 11 | 0779 | Will recruiters/ATS see your fancy text? | linkedin-fonts-recruiters-ats | Platform: LinkedIn | 4 | 5 | 5 | 4 | 3 | 5 | 4 | 5 | **35** | P1 |
| 12 | 0781 | Why did TikTok change my font? | tiktok-font-changed | Platform: TikTok | 5 | 5 | 4 | 3 | 3 | 5 | 5 | 4 | **34** | P1 |
| 13 | 0784 | What characters are allowed in game names? | game-username-allowed-symbols | Gaming & usernames | 4 | 5 | 4 | 4 | 4 | 4 | 4 | 5 | **34** | P1 |
| 14 | 0789 | Same emoji, different meaning (💀😭🙏) | emoji-meaning-by-platform | Emoji & meaning | 5 | 4 | 5 | 4 | 4 | 3 | 4 | 4 | **33** | P2 |
| 15 | 0768 | Boxes vs mojibake vs ? — what broke | boxes-vs-mojibake-vs-question-marks | Copy-paste behavior | 4 | 4 | 5 | 3 | 5 | 5 | 4 | 3 | **33** | P2 |
| 16 | 0770 | Fancy text, search visibility & spam myths | fonts-and-search-visibility | Accessibility / growth | 4 | 4 | 5 | 4 | 4 | 4 | 4 | 4 | **33** | P2 |
| 17 | 0788 | Format a bio without looking spammy | bio-formatting-without-spam | Identity & branding | 4 | 4 | 5 | 4 | 5 | 3 | 4 | 4 | **33** | P2 |
| 18 | 0791 | Aesthetic text playbook (vaporwave/fullwidth) | aesthetic-text-styles-explained | Aesthetic systems | 4 | 4 | 5 | 4 | 4 | 4 | 4 | 4 | **33** | P2 |
| 19 | 0777 | Where IG fonts work (name/handle/bio/caption) | instagram-where-fonts-work | Platform: Instagram | 5 | 5 | 4 | 5 | 4 | 3 | 4 | 3 | **33** | P2 |
| 20 | 0793 | Stacked vs rotated "vertical" text | vertical-vs-rotated-text | Attention / Compatibility | 4 | 5 | 4 | 4 | 4 | 4 | 4 | 3 | **32** | P2 |
| 21 | 0782 | TikTok fonts not showing right? | tiktok-fonts-not-working | Platform: TikTok | 5 | 5 | 4 | 4 | 3 | 4 | 4 | 3 | **32** | P2 |
| 22 | 0787 | One handle, every platform | consistent-username-across-platforms | Identity & branding | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **31** | P2 |
| 23 | 0785 | Anatomy of a sweaty gamer name | sweaty-gaming-names | Gaming & usernames | 4 | 4 | 4 | 3 | 3 | 5 | 4 | 4 | **31** | P2 |
| 24 | 0790 | Kaomoji/emoticon field guide (+ shrug trick) | kaomoji-emoticons-explained | Emoji & meaning | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **31** | P2 |
| 25 | 0783 | TikTok text: native vs CapCut vs Unicode | tiktok-text-methods | Platform: TikTok | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 4 | **31** | P2 |
| 26 | 0780 | Where Unicode works/blocked on LinkedIn (2026) | linkedin-where-fonts-work | Platform: LinkedIn | 4 | 4 | 4 | 4 | 4 | 4 | 3 | 4 | **31** | P2 |
| 27 | 0774 | Style a Discord name without getting filtered | discord-safe-name-styling | Platform: Discord | 4 | 4 | 5 | 4 | 4 | 4 | 3 | 5 | **33** | P2 |
| 28 | 0786 | Clan tags explained | clan-tags-guide | Gaming & usernames | 3 | 3 | 4 | 3 | 3 | 4 | 4 | 3 | **27** | P3 |

*(Rows are sorted by theme-grouped priority; OPP IDs are stable, table # is presentation order.)*

---

## 4. Strategic clusters

Mapped to hub sections in `guide/index.html`. New hub sections to open as each cluster
reaches ~3 shippable guides:

1. **Unicode Education** *(new hub section)* — 0766 (pillar), 0768. The mental-model spine.
2. **Accessibility & Compatibility** *(new hub section)* — 0767, 0769, 0770, 0793. The honesty/authority moat.
3. **Platform Mastery — Discord** *(extends Platform & Posting)* — 0771, 0772, 0773, 0774.
4. **Platform Mastery — Instagram** — 0775, 0776, 0777.
5. **Platform Mastery — LinkedIn** — 0778, 0779, 0780 (complements the 3 existing LinkedIn strategy guides — these are mechanics/myths, not craft).
6. **Platform Mastery — TikTok** — 0781, 0782, 0783.
7. **Gaming & Usernames** *(new hub section)* — 0784, 0785, 0786.
8. **Identity & Branding** *(extends existing)* — 0787, 0788.
9. **Emoji & Meaning** *(new hub section)* — 0789, 0790.
10. **Aesthetic Writing Systems** *(new hub section)* — 0791.
11. **Copy-paste & Format Craft** *(extends Attention & Format)* — 0792, 0793.

Clusters from the brief with **no new page** (already well-owned, or folded in):
*Comment & reply strategy* (covered by 2 live guides) and *Creator workflows* /
*Social-media growth* (covered by branding/hooks guides) — revisit only if a distinct
angle clears the dedupe gate.

---

## 5. First batch — 12 recommended guides + briefs

Selected for: P1/high-P2 priority, balance across clusters, strong forum evidence,
clear tool/library tie-in, and competitor-gap differentiation. **Batch label:
`batch-guide-01`.**

> Build order: the **top 3 are built in this PR** (★). The rest are approved backlog.

---

### ★1. Why Your Fancy Font Turns Into Boxes — and Which Styles Are Safe Everywhere
- **Slug:** `/guide/why-fonts-show-as-boxes/` · **OPP-0767** · Cluster: Accessibility & Compatibility
- **Target reader:** Anyone who pasted a styled name/bio and got told it "shows as squares."
- **Search intent:** *failure / how-to* — "font shows as boxes," "tofu," "fonts not working on Android."
- **Forum insight:** The #1 cross-platform pain (Discord "fancy pancy names," IG/TikTok "boxes for some people"). The failure is **invisible to the author** — they see it fine, their audience sees tofu. Competitors hand-wave ("older devices may not support it"); none gives a usable safety tier.
- **Point of view:** Boxes aren't a bug in your text — they're a *missing glyph on the reader's device*. Your characters are intact; the reader's font just can't draw them. So the fix is **style selection, not troubleshooting**.
- **Original framework — the Style Safety Tiers:**
  - **Tier 1 (universal):** bold/italic sans & serif math alphanumerics, small caps — backed by near-complete font coverage.
  - **Tier 2 (mostly safe):** monospace, fullwidth, circled.
  - **Tier 3 (risky):** Fraktur/blackletter, double-struck, decorative/enclosed — break on older Android & some apps.
  - **Tier 4 (fragile):** zalgo, obscure symbols, regional decoratives.
  - Plus the **2-device test rule** and the **"never put load-bearing words only in a risky style"** rule.
- **Examples:** same word in each tier; an Android-vs-iOS render mock; the `.notdef` box (□/▯) explained.
- **Internal links:** pillar (`how-unicode-fonts-work`), `fancy-fonts-accessibility-guide`, platform guides (Discord/IG/TikTok), homepage generator, `/library/` symbol pages.
- **CTA:** "Generate text in a device-safe style →" `/`
- **Schema:** Article + BreadcrumbList + FAQPage. **Meta title:** "Why Your Fancy Font Shows Up as Boxes (and How to Fix It) | UltraTextGen." **Meta description:** "Styled text showing as boxes or squares for other people? Here's why it happens, which Unicode font styles are safe on every device, and how to test before you post."
- **Why it deserves to exist:** Highest-volume, highest-frustration question in the entire territory, with no authoritative answer anywhere. Pure authority + utility.

### ★2. Are Fancy Fonts Bad for Accessibility? An Honest Guide for Creators
- **Slug:** `/guide/fancy-fonts-accessibility-guide/` · **OPP-0769** · Cluster: Accessibility & Compatibility
- **Target reader:** Conscientious creators, brands, educators, and anyone "called out" for fake-bold.
- **Search intent:** *meaning / ethics* — "are unicode fonts bad for screen readers," "is fake bold accessible."
- **Forum insight:** The most *emotionally charged* territory — advocates ("it's not formatting, it's a lie"; a styled sentence can read as **total silence**) vs users ("the platform gives me no other way to emphasize"). Font tools never mention it (conflict of interest); a11y blogs say "never" with zero nuance.
- **Point of view:** Both camps are half-right. Styled Unicode genuinely breaks screen readers — but "never use it" ignores why people reach for it. The answer is **harm reduction, not abstinence**.
- **Original framework — the Plain-Core Rule:** keep everything *load-bearing* (name, CTA, links, keywords, body text, anything a decision depends on) in plain text; style only *decorative emphasis* (one display word, a header accent). Plus: the **screen-reader read-aloud demo** ("mathematical bold capital H, …"), how to test with VoiceOver/TalkBack, and accessible alternatives.
- **Examples:** before/after of an inaccessible vs Plain-Core bio; the "do not eat → invitation" inversion risk; zalgo as worst case.
- **Internal links:** pillar, `why-fonts-show-as-boxes`, `fonts-and-search-visibility`, `linkedin-bold-text-reach`, comment/bio tools.
- **CTA:** "Style the accent, keep the core plain →" `/usecase/bio-font/`
- **Schema:** Article + BreadcrumbList + FAQPage. **Meta title:** "Are Fancy Fonts Bad for Accessibility? An Honest Guide | UltraTextGen." **Meta description:** "What screen readers actually do with styled Unicode text — and a practical harm-reduction framework for using fancy fonts without excluding anyone."
- **Why it deserves to exist:** The single biggest brand-trust / prestige play. A generator being honest about its own limits is differentiation no competitor will copy.

### ★3. Discord Text Formatting Decoded: Markdown vs Unicode Fonts vs Nitro
- **Slug:** `/guide/discord-text-formatting-explained/` · **OPP-0771** · Cluster: Platform Mastery — Discord
- **Target reader:** Discord users confused why bold works in chat but not their name.
- **Search intent:** *how-to / mental-model* — "how to change font on discord," "discord bold not working in name."
- **Forum insight:** The deepest, most-repeated Discord confusion is blurring **three different mechanisms**. Markdown styles a *message* (and dies in names; ANSI color is desktop-only); Unicode "fonts" work *everywhere names live* but risk boxes/screen-reader breakage; Nitro Display Name Styles add real color/animation but **don't show inside servers** (role color wins).
- **Point of view:** You don't have a "fonts" problem — you have a *three-systems* problem. Once you know which system each Discord field uses, every "why doesn't this work" answers itself.
- **Original framework — the 3-System Model** (Markdown / Unicode / Nitro), each with: what it is, where it works, what it costs, when to use it. Includes the **markdown common-mistakes** mini-section (spaces inside `**`, backticks killing formatting) folded in.
- **Examples:** the same line rendered via each system; a channel-name spacer example; the ANSI color caveat.
- **Internal links:** `discord-where-fonts-work`, `discord-colored-text-guide`, `discord-safe-name-styling`, pillar, `/discord/`.
- **CTA:** "Make Discord-ready styled text →" `/discord/`
- **Schema:** Article + BreadcrumbList + FAQPage. **Meta title:** "Discord Fonts & Formatting Explained: Markdown vs Unicode vs Nitro | UltraTextGen." **Meta description:** "Why bold works in Discord chat but not your username — the three different text systems Discord uses (Markdown, Unicode fonts, Nitro), and exactly when to use each."
- **Why it deserves to exist:** Discord is the #2 traffic engine and badly under-converted on informational queries (per the 2026-06-27 direction audit). This is the framework that unlocks the whole Discord informational pool.

### 4. Does Bold Text Hurt Your LinkedIn Reach? What 1M+ Posts Reveal — OPP-0778
*Reader:* LinkedIn creators afraid bold tanks (or hoping it boosts) reach. *Intent:* myth-check. *Insight:* a 1.2M-post study found **no algorithmic penalty**, but bold posts get marginally fewer impressions/likes — correlation, not causation. *POV:* bold is a *readability* tool, not a *growth* tool. *Framework:* the **10–15% Emphasis Rule** ("when everything is bold, nothing is") + correlation-vs-causation explainer. *Links:* existing LinkedIn hook/comment guides, `fancy-fonts-accessibility-guide`, `linkedin-where-fonts-work`. *CTA:* `/linkedin/`. *Schema:* Article+FAQ. *Why:* highest-volume LinkedIn question, currently answered with assertions not data.

### 5. Why Your Instagram Bio Collapses Into One Line (and How to Make Spacing Stick) — OPP-0775
*Reader:* anyone whose spaced bio smushed on save. *Intent:* failure/how-to. *Insight:* IG **trims leading/trailing spaces and consecutive newlines server-side**, plus the trailing-space-before-Enter trap. *POV:* it's not your fault — it's a server rule; here's the one invisible char that survives (U+2800). *Framework:* the **Save-Proof Bio** method (line-break char + section pattern + 150-char budget). *Links:* `dividers-separators-guide`, `instagram-where-fonts-work`, `/usecase/bio-font/`. *CTA:* bio tool. *Why:* the single most-served IG query; everyone serves the tool, nobody teaches the rule.

### 6. Do Fancy Fonts Get You Shadowbanned on Instagram? The Myth, Busted — OPP-0776
*Reader:* creators blaming reach drops on bio symbols. *Intent:* myth-check. *Insight:* dedicated shadowban explainers **never list fonts/symbols** as a cause; the real risks are URL blocklists, search-invisibility, accessibility. *POV:* fonts don't trigger shadowbans — but they do make you *unsearchable*, which costs you more quietly. *Framework:* **Real-Cost vs Myth** ledger. *Links:* `fonts-and-search-visibility`, `fancy-fonts-accessibility-guide`. *CTA:* `/instagram/`. *Why:* high-fear, high-search, near-zero direct-answer supply.

### 7. Where Fancy Fonts Work in Discord: The Field-by-Field Permission Map — OPP-0772
*Reader:* users hitting "invalid username" or stripped channel names. *Intent:* reference. *Insight:* username (handle) rejects Unicode; display name/nickname/role/server/channel names + bio + messages accept it (markdown dies in names, Unicode survives). *POV:* one matrix ends the trial-and-error. *Framework:* the **Field Permission Matrix** (field × markdown × Unicode × emoji × why). *Links:* `discord-text-formatting-explained`, `/discord/`. *Why:* resolves the recurring username-vs-display-name trap.

### 8. Dividers, Separators & Headers: Structuring a Bio or Post With Symbols — OPP-0792
*Reader:* aesthetic-bio builders drowning in symbol-dump grids. *Intent:* craft/how-to. *Insight:* huge evergreen demand (Tumblr/IG/Discord), endless dumps, near-zero *guidance*; dividers also collapse on IG save. *POV:* a divider is *composition*, not a glyph you grab — balance, rhythm, and survival matter. *Framework:* the **Divider Anatomy** model (motif + symmetry + weight) + a survival note per platform. *Links:* `/library/line-divider-symbols/`, `instagram-bio-line-breaks`, bio tool. *CTA:* line-divider library. *Why:* strong tool/library tie-in; teaches what dump sites won't.

### 9. Will Recruiters and ATS See Your Fancy LinkedIn Text? A Job-Seeker's Guide — OPP-0779
*Reader:* job-seekers wanting to stand out without becoming un-findable. *Intent:* high-stakes how-to. *Insight:* LinkedIn search **doesn't index** styled Unicode; the Name field bans special chars; some ATS strip non-ASCII to gibberish. *POV:* a stylized name is a *self-inflicted invisibility cloak* to recruiters. *Framework:* **Style-Safe Job Search** (which fields to keep plain, where decoration is harmless). *Links:* `linkedin-where-fonts-work`, `fancy-fonts-accessibility-guide`. *Why:* a distinct, underserved, high-intent audience.

### 10. Colored Text in Discord (ANSI): What's Possible, What Isn't, and Why It Breaks on Mobile — OPP-0773
*Reader:* users who want red/green text and hit raw escape codes. *Intent:* how-to + honest limits. *Insight:* ANSI is **code-block-only, 8 fixed colors, no hex**, the "copy the literal escape char" gotcha, and **unreliable on mobile**. *POV:* colored text is real but narrow — know the limits before you build around it. *Framework:* the **ANSI Reality Check** + a cross-platform support matrix (desktop/web/iOS/Android). *Links:* `discord-text-formatting-explained`, `/discord/`. *Why:* fills the gap the popular ANSI gist explicitly leaves open.

### 11. Why Did TikTok Change My Font — and Can I Change It Back? — OPP-0781
*Reader:* users who think the app's TikTok Sans update broke their settings. *Intent:* confusion/how-to. *Insight:* people conflate the **app's own UI font** (TikTok Sans, can't revert) with **decorative fonts they can type** (copy-paste Unicode). *POV:* two totally different "fonts" — only one is yours to control. *Framework:* a clean **UI-font vs your-font** split + what you *can* actually style. *Links:* `tiktok-fonts-not-working`, `/tiktok/`. *Why:* high volume, near-zero good competing content.

### 12. What Characters Are Allowed in Game Usernames? Roblox, Fortnite, Valorant & COD — OPP-0784
*Reader:* gamers whose name/symbols got rejected. *Intent:* per-game rules. *Insight:* username (3–20, alnum+`_`) vs **display name** (full Unicode) is the core confusion; Fortnite symbols must be set on the Epic *website*; COD/Valorant filter differently; silent **partial acceptance** baffles people. *POV:* "rejected" almost always means *wrong field or wrong game's filter* — here's the per-game map. *Framework:* the **Game-Name Rules Matrix** + username-vs-display-name rule. *Links:* gaming library/usecase pages, `sweaty-gaming-names`, `consistent-username-across-platforms`. *Why:* tons of listicles, zero rules explainers — clean gap with strong demand.

---

## 6. File changes made this cycle

1. `docs/guide-content-workflow.md` — the repeatable loop (system doc).
2. `docs/guide-opportunity-map-2026-06-28.md` — this map.
3. `data/library_opportunities.csv` — 28 guide rows appended (`OPP-0766`–`OPP-0793`,
   `page_type=guide`, `batch=batch-guide-01`). Top-12 `approval_status=approved`;
   remainder `pending`. The 3 built pages set to `action=create`/built.
4. `data/forum_research_queries.csv` — 12 guide-intent seed queries appended.
5. Three new guide pages built (top 3 ★): `why-fonts-show-as-boxes`,
   `fancy-fonts-accessibility-guide`, `discord-text-formatting-explained`.
6. `guide/index.html` — new hub section **"Unicode, Accessibility & Compatibility"**
   plus the three new cards, and a Discord card.

## 7. Risks / duplicates found

- **OPP-0789 (emoji-meaning-by-platform)** overlaps the existing `/library/emoji-meanings-guide/`
  (linked from the hub). Marked `dedupe_status=review-overlap`. Distinct *angle*
  (meaning *shift* by platform/generation vs a static reference), but confirm before
  building; may become `improve_existing` on the library page instead.
- **OPP-0793 (vertical-vs-rotated-text)** is adjacent to the live `/guide/vertical-text-guide/`.
  Distinct (mechanism/compatibility — "why your generator stacks instead of rotating, and
  where it survives" — vs the existing attention-science angle). Marked `review-overlap`;
  could ship as a deepening cross-link rather than a standalone if review prefers.
- **LinkedIn cluster (0778–0780)** must not restate the 3 existing LinkedIn *strategy*
  guides — these are mechanics/myths/reference, a different intent. Kept distinct in titles.
- **Platform specifics age.** Discord ANSI/Nitro, IG blocklists, LinkedIn's Aug-2024
  headline block, TikTok Sans — all dated "as of 2026" in copy; flag for an annual refresh.
- **Thin-content gate:** the 3 myth/reference pages (shadowban, where-fonts-work) must
  carry a real framework + 4 FAQs to avoid reading as thin — enforced in the briefs.

## 8. Next steps

1. **Ship this PR** (3 pages + map + CSV + workflow). Human review per workflow §8.
2. **Build batch remainder** in priority order (4–12), 5 pages per follow-up PR.
3. **Resolve the two overlap flags** (0789, 0793) before building them.
4. **Open new hub sections** as each cluster hits ~3 live guides (Discord first).
5. **Pull real Semrush volumes** for the top-12 head terms to replace `est` in the CSV.
6. **Re-run the loop** after the next direction audit; fold in any new platform changes.
