'use strict';
/* Content configs for scripts/build-answer-pages.js.
   Each entry -> answers/<slug>/index.html. Keep FAQ `a` fields plain text
   (they feed JSON-LD); use `aHtml` for the visible answer when it needs links. */

module.exports = [

/* ===================================================================== */
{
  slug: 'do-fancy-fonts-work-on-iphone',
  crumb: 'Do Fancy Fonts Work on iPhone',
  pageTitle: 'Do Fancy Fonts Work on iPhone?',
  metaDesc: "Yes — iPhones render bold, italic, script and small caps fine. But iOS shows the more decorative styles as empty boxes because it rarely falls back to another font. Here's what's safe.",
  h1: 'Do Fancy Fonts Work on iPhone?',
  tagline: 'Mostly yes — but iOS is picky in one specific way that turns the fancier styles into empty boxes. Here’s what renders and what to avoid.',
  shortAnswer: 'Yes, for the common styles. iPhones ship fonts that cover <strong>bold, italic, sans, small caps and monospace</strong>, so those copy-and-paste fine into names, bios and Messages. The catch is that iOS is <strong>strict about fallback</strong>: if a style uses characters the system font doesn’t have, iOS often draws an empty box (□) instead of borrowing a glyph from another font. So the most decorative styles — fraktur, double-struck and obscure symbols — are the ones that break on iPhone.',
  oneLiner: '<strong>Safe on iOS:</strong> bold · italic · small caps · monospace · script. <strong>Risky:</strong> fraktur · double-struck · heavy decoratives.',
  sections: [
    {
      label: 'What works',
      h2: 'Styles that render reliably on iPhone',
      bodyHtml: `<div class="editorial-block">
    <p>These map to Unicode blocks that Apple’s system fonts cover, so they render on every current iPhone and paste cleanly into Instagram, TikTok, Discord, Messages and Notes:</p>
    <ul>
      <li><strong>Bold, italic, bold-italic</strong> (sans and serif)</li>
      <li><strong>Small caps</strong> and <strong>monospace</strong></li>
      <li><strong>Script / cursive</strong> — generally reliable on modern iOS</li>
    </ul>
    <p class="mood-example">𝐇𝐢 · 𝘏𝘪 · ɢᴏᴏᴅ · 𝘵𝘩𝘦𝘳𝘦</p>
  </div>`
    },
    {
      label: 'What breaks',
      h2: 'Why some fancy fonts show as boxes on iPhone',
      bodyHtml: `<div class="editorial-block">
    <p>When a character isn’t in iOS’s font, the iPhone frequently <em>doesn’t</em> substitute another font — it just draws the <strong>.notdef box</strong> (□). Android leans on its Noto fonts to avoid this; iOS is less forgiving. So the styles most likely to box out on iPhone are:</p>
    <ul>
      <li><strong>Fraktur / blackletter</strong> and <strong>double-struck</strong></li>
      <li>Obscure symbol runs and rare decorative blocks</li>
      <li>Anything viewed on an <strong>older iOS version</strong>, which covers fewer characters</li>
    </ul>
    <p>Remember the box is drawn by the <em>viewer’s</em> iPhone, not yours — so your text can look perfect to you and broken to a friend. See <a href="/guide/why-fonts-show-as-boxes/">why fonts show as boxes</a>.</p>
  </div>`
    },
    {
      label: 'Where it goes',
      h2: 'Where you can paste it on iOS',
      bodyHtml: `<div class="editorial-block">
    <p>Styled text works in <strong>display names, bios, captions and messages</strong>. It does <strong>not</strong> work in <strong>@username / handle fields</strong>, which are ASCII-only across apps. Accented letters follow the same rule as everywhere — most styles leave them plain (see <a href="/answers/why-fancy-text-removes-accents/">why fancy text removes accents</a>).</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Make iPhone-safe styled text',
    p: 'Generate a bold, italic or small-caps style — the ones iOS renders everywhere — then copy and paste it straight into any app.',
    href: '/',
    label: 'Open the Text Generator →'
  },
  related: 'Related: <a href="/answers/why-fancy-text-looks-different-on-iphone-vs-android/">why fancy text looks different on iPhone vs Android</a>, <a href="/guide/why-fonts-show-as-boxes/">why fonts show as boxes</a>, and the <a href="/guide/fancy-fonts-and-accents/">fancy fonts &amp; accents</a> guide.',
  faq: [
    { q: 'Do fancy fonts work on iPhone?', a: 'Yes for the common styles. iPhones render bold, italic, sans, small caps, monospace and usually script, because iOS ships fonts covering those characters. The more decorative styles (fraktur, double-struck, obscure symbols) can show as empty boxes because iOS rarely falls back to another font for a missing glyph.' },
    { q: 'Why do some fancy fonts show as boxes on iPhone?', a: 'Because iOS does not substitute another font when the system font lacks a character — it draws the .notdef box instead. Styles built from rare Unicode blocks therefore box out on iPhone, especially on older iOS versions. The box is drawn by the viewer’s device, so the same text can look fine to you and broken to them.' },
    { q: 'Which fancy fonts are safe on iOS?', a: 'Bold, italic, bold-italic, small caps and monospace are the safest, with script usually reliable too. Avoid fraktur, double-struck and heavily decorative styles if you need it to render on every iPhone.' },
    { q: 'Do fancy fonts work in iPhone Messages and Notes?', a: 'Yes — Messages, Notes, Mail and most apps display styled Unicode fine, since it is ordinary text. Just avoid the rarest styles for recipients on old devices, and remember @handles stay plain.' },
    { q: 'Can I use fancy fonts in my iPhone contact or Apple ID name?', a: 'Display-style name fields accept styled Unicode, but system identifiers (Apple ID email, phone) do not. As a rule, styled text works anywhere it is shown as a label, not where it is used as an address or handle.' }
  ]
},

/* ===================================================================== */
{
  slug: 'why-fancy-text-looks-different-on-iphone-vs-android',
  crumb: 'iPhone vs Android',
  pageTitle: 'Why Does Fancy Text Look Different on iPhone vs Android?',
  metaDesc: "The same styled text can look crisp on Android and boxed on iPhone because each OS draws the characters with its own fonts — Apple's San Francisco vs Android's Noto. Here's why.",
  h1: 'Why Does Fancy Text Look Different on iPhone vs Android?',
  tagline: 'You send a styled name and a friend says it looks totally different — or shows as boxes. Same characters, two different sets of fonts drawing them.',
  shortAnswer: 'Because each phone draws the styled characters with <strong>its own fonts</strong>. iPhone uses Apple’s San Francisco with a limited fallback; Android uses the <strong>Noto</strong> family (“no more tofu”), which covers more of the styled-character range. So the same string can look slightly different in shape, or render on Android while boxing out on an iPhone — or box out on an <em>old</em> Android that predates the coverage. Your text isn’t broken; the reader’s device is choosing the picture.',
  oneLiner: '<strong>The rule:</strong> the reader’s device — not yours — picks the font that draws each character.',
  sections: [
    {
      label: 'The cause',
      h2: 'Same characters, different fonts',
      bodyHtml: `<div class="editorial-block">
    <p>A styled letter like <strong>𝕄</strong> is a single Unicode character. Neither phone has a “fancy font” installed for your whole message — each one reaches into <em>its</em> font library to find a picture (a glyph) for that character. Apple and Google ship different libraries:</p>
    <ul>
      <li><strong>iPhone</strong> — San Francisco plus a fairly strict fallback chain. Missing character → often an empty box.</li>
      <li><strong>Android</strong> — the Noto family, built specifically “to eliminate tofu,” covers more of the styled range and fills gaps more aggressively.</li>
    </ul>
    <p>Because the glyph shapes and coverage differ, the same styled word can look a little different on each — or appear on one and box out on the other.</p>
  </div>`
    },
    {
      label: 'Boxes',
      h2: 'Why one person sees boxes and another doesn’t',
      bodyHtml: `<div class="editorial-block">
    <p>The decorative styles (fraktur, double-struck, obscure symbols) are where the gap shows most. Modern Android usually draws them via Noto; a strict iPhone may box them; and an <strong>old Android</strong> that never received the newer Noto coverage will box them too. So “it’s broken for some people” almost always means those people are on a device without a glyph for that character — not that you did anything wrong.</p>
    <div class="mood-explainer">
      <div class="mood-example">You see: <strong>𝕬𝖊𝖘𝖙𝖟𝖊𝖙𝖒𝖈</strong> &nbsp;·&nbsp; an old Android sees: ▯▯▯▯▯▯▯▯▯</div>
    </div>
  </div>`
    },
    {
      label: 'What to do',
      h2: 'How to make it look the same everywhere',
      bodyHtml: `<div class="editorial-block">
    <p>Stick to the widely-covered styles — <strong>bold, italic, small caps, monospace</strong> — which render nearly identically on both platforms. Save the decorative styles for throwaway flair, keep load-bearing words readable, and if a style matters, test it on a second device (an older Android is the toughest case). More in <a href="/guide/why-fonts-show-as-boxes/">why fonts show as boxes</a>.</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Generate cross-device styled text',
    p: 'Pick a widely-supported style and it’ll look the same on iPhone and Android. Type once, copy, paste anywhere.',
    href: '/',
    label: 'Open the Text Generator →'
  },
  related: 'Related: <a href="/answers/do-fancy-fonts-work-on-iphone/">do fancy fonts work on iPhone</a>, <a href="/guide/why-fonts-show-as-boxes/">why fonts show as boxes</a>, and <a href="/answers/why-does-copied-fancy-text-lose-formatting/">why copied fancy text loses formatting</a>.',
  faq: [
    { q: 'Why does fancy text look different on iPhone vs Android?', a: 'Because each OS draws the styled characters with its own fonts — Apple’s San Francisco on iPhone, the Noto family on Android. Different coverage and glyph shapes mean the same string can look slightly different, or render on one and box out on the other.' },
    { q: 'Why do some people see boxes and others don’t?', a: 'A box means that person’s device has no glyph for the character. Modern Android draws most styles via Noto; a strict iPhone or an old Android may box the decorative ones. It depends entirely on the viewer’s device, not your text.' },
    { q: 'Which styles look the same on both iPhone and Android?', a: 'Bold, italic, small caps and monospace are covered on both and look nearly identical. Fraktur, double-struck and obscure decorative styles are where the two platforms diverge most.' },
    { q: 'Is it my phone or the sender’s that causes the difference?', a: 'The reader’s phone. The sender’s device stores and sends the same Unicode characters; how they look is decided by whichever fonts the reader’s device uses to draw them.' }
  ]
},

/* ===================================================================== */
{
  slug: 'fancy-text-with-n-and-accented-letters',
  crumb: 'Fancy Text With ñ & Accents',
  pageTitle: 'Fancy Text With ñ and Accented Letters',
  metaDesc: "Can you make fancy text with ñ, á, é or ü? The letters style, but the accented ones stay plain because Unicode has no styled version of them. Here's how to keep them.",
  h1: 'Fancy Text With ñ and Accented Letters',
  tagline: 'Style “Señor” and you get 𝗦𝗲ñ𝗼𝗿 — every letter bold except the ñ. Here’s why, and how to keep your accents.',
  shortAnswer: 'You can style the word, but <strong>bold and script styles leave the accented letters plain</strong> — ñ, á, é, í, ó, ú, ü, ç. Unicode simply has no styled version of an accented letter, so it’s copied through unchanged while the plain letters around it transform. For a light-accent language like Spanish, French or Portuguese that’s often just one or two plain letters — acceptable for a short name. To keep <em>every</em> accent uniform, use a style that adds a mark or symbol instead of swapping the letter.',
  oneLiner: '<strong>In one line:</strong> letter-swap styles drop ñ/á/é to plain · mark &amp; symbol styles keep them all.',
  sections: [
    {
      label: 'Why',
      h2: 'Why ñ and á don’t go bold',
      bodyHtml: `<div class="editorial-block">
    <p>A fancy font swaps each letter for a styled Unicode character, and those styled characters only exist for the plain <strong>A–Z, a–z and 0–9</strong>. There is no bold ñ or italic é anywhere in Unicode, so a letter-swap style has nothing to swap in — the accented letter falls back to its plain form.</p>
    <div class="block-example">
      <div class="example-pair">
        <div class="ex-label">Bold “Señor”</div>
        <div class="ex-styled">𝗦𝗲ñ𝗼𝗿</div>
        <div class="ex-arrow">↓</div>
        <div class="ex-label">every letter bold except ñ</div>
      </div>
    </div>
  </div>`
    },
    {
      label: 'When it’s fine',
      h2: 'For Spanish, French &amp; Portuguese it’s often okay',
      bodyHtml: `<div class="editorial-block">
    <p>These languages use accents lightly — usually one or two per word — so a bold or script style leaves only the odd plain letter. On a short name or headline that can look intentional rather than broken. Judge it per word: “José” loses only the é; a longer accented phrase shows more gaps. (Vietnamese is the opposite extreme — see <a href="/answers/do-fancy-fonts-work-with-vietnamese/">do fancy fonts work with Vietnamese</a>.)</p>
  </div>`
    },
    {
      label: 'The fix',
      h2: 'How to keep every accent',
      bodyHtml: `<div class="editorial-block">
    <p>If you need all the accents styled uniformly, use a style that <strong>marks or wraps</strong> rather than swaps — strikethrough, underline, slash, or a symbol/bracket wrap. Because they never replace the letter, ñ, á, é and the rest survive intact. The trade-off is you get that look, not a bold/script one. Full detail in <a href="/answers/why-fancy-text-removes-accents/">why fancy text removes accents</a>.</p>
    <p class="mood-example">S̲e̲ñ̲o̲r̲ &nbsp;·&nbsp; ❨café❩</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Try your accented text in every style',
    p: 'Type your name with its accents and compare — the mark and symbol styles keep ñ, á and é intact.',
    href: '/',
    label: 'Open the Text Generator →'
  },
  related: 'Related: <a href="/answers/why-fancy-text-removes-accents/">why fancy text removes accents</a>, <a href="/answers/do-fancy-fonts-work-with-vietnamese/">do fancy fonts work with Vietnamese</a>, and the <a href="/guide/fancy-fonts-and-accents/">fancy fonts &amp; accents</a> guide.',
  faq: [
    { q: 'Can I make fancy text with ñ?', a: 'You can style the word, but in bold, italic and script styles the ñ itself stays plain, because Unicode has no styled version of ñ. To keep the ñ styled like the rest, use a mark-based or symbol style (strikethrough, underline, wraps) that never replaces the letter.' },
    { q: 'Why is my ñ not bold when the rest of the word is?', a: 'Because there is no bold ñ in Unicode. Bold styles work by swapping each letter for a bold twin, and accented letters have no twin to swap in, so the ñ is left in its plain form while the plain letters go bold.' },
    { q: 'Do accents work in cursive or script fonts?', a: 'The plain letters convert, but accented letters (á, é, ñ, ü, ç) stay plain in cursive/script too, for the same reason — no styled accented glyph exists. Mark and symbol styles are the only ones that keep every accent.' },
    { q: 'Which fancy fonts keep á é í ó ú?', a: 'The ones that add a mark or wrap the word rather than swapping letters: strikethrough, underline, slash, wavy, and bracket/symbol wraps. Bold, italic, script, fraktur, bubble and small caps cannot.' },
    { q: 'Why is my Spanish fancy text half plain?', a: 'Because the accented letters have no styled version, so they drop to plain while the unaccented letters transform. In Spanish that is usually just one or two letters per word; use a mark/symbol style if you want them all uniform.' }
  ]
},

/* ===================================================================== */
{
  slug: 'why-wont-discord-accept-fancy-username',
  crumb: 'Discord Fancy Username',
  pageTitle: "Why Won't Discord Accept My Fancy Username?",
  metaDesc: "Discord's username is ASCII-only (lowercase letters, numbers, . and _), so fancy fonts are rejected there. They work in your display name and server nickname instead — here's how.",
  h1: "Why Won't Discord Accept My Fancy Username?",
  tagline: 'Your styled username won’t save — but your styled <em>display name</em> will. Here’s the difference, and where fancy fonts actually work on Discord.',
  shortAnswer: 'Because Discord’s <strong>username</strong> (the unique @handle, since the 2023 system) is restricted to <strong>lowercase letters, numbers, dots and underscores</strong> — ASCII only. Styled Unicode, accents and symbols are rejected there so handles stay unique and typeable. Fancy fonts aren’t blocked on Discord in general; they belong in your <strong>display name</strong> and <strong>server nickname</strong>, which accept almost any Unicode. So: plain username, fancy display name.',
  oneLiner: '<strong>The rule:</strong> plain <b>username</b> (@handle) + fancy <b>display name</b> / <b>nickname</b>.',
  sections: [
    {
      label: 'The three names',
      h2: 'Username vs display name vs nickname',
      bodyHtml: `<div class="editorial-block">
    <p>Discord has three name fields, and only one rejects fancy text:</p>
    <div class="data-table-wrap">
      <table class="data-table">
        <thead><tr><th>Field</th><th>What it is</th><th>Fancy fonts?</th></tr></thead>
        <tbody>
          <tr><td><strong>Username</strong></td><td>Your unique @handle</td><td><strong>No</strong> — lowercase a–z, 0–9, . and _ only</td></tr>
          <tr><td><strong>Display name</strong></td><td>The name shown across Discord</td><td><strong>Yes</strong> — styled Unicode &amp; emoji</td></tr>
          <tr><td><strong>Server nickname</strong></td><td>Your name in one server</td><td><strong>Yes</strong> — styled Unicode &amp; emoji</td></tr>
        </tbody>
      </table>
    </div>
    <p>So put your bold or script text in the <strong>display name</strong> or a <strong>nickname</strong>, and leave the username plain.</p>
  </div>`
    },
    {
      label: 'The limits',
      h2: 'Two extra things Discord strips',
      bodyHtml: `<div class="editorial-block">
    <p>Even in the display name and nickname, Discord cleans up a couple of things:</p>
    <ul>
      <li><strong>Zero-width and some invisible characters</strong> are removed.</li>
      <li><strong>Heavy zalgo</strong> is capped — Discord stops handling combining marks past roughly 150 on a character, so extreme stacks get trimmed.</li>
    </ul>
    <p>Ordinary styled fonts (bold, italic, script, small caps) are fine; it’s the abusive extremes that get sanitised.</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Make a styled Discord display name',
    p: 'Generate a bold, script or small-caps name, copy it, and paste it into your Discord display name or a server nickname — keep the username plain.',
    href: '/discord/',
    label: 'Open the Discord Font Generator →'
  },
  related: 'Related: <a href="/answers/do-you-need-nitro-for-discord-fonts/">do you need Nitro for Discord fonts</a>, <a href="/answers/discord-allowed-characters/">Discord allowed characters</a>, and <a href="/guide/discord-text-formatting-explained/">Discord text formatting explained</a>.',
  faq: [
    { q: "Why won't Discord accept my fancy username?", a: 'Because Discord’s username (the unique @handle) is ASCII-only — lowercase letters, numbers, dots and underscores. Styled Unicode, accents and symbols are rejected there. Fancy fonts work in your display name and server nickname instead.' },
    { q: 'Where can I use fancy fonts on Discord?', a: 'In your global display name and in per-server nicknames — both accept styled Unicode and emoji. Only the username field is restricted to plain ASCII.' },
    { q: 'Can I use a fancy display name on Discord?', a: 'Yes. The display name accepts bold, italic, script, small caps and most styled Unicode. Just avoid zero-width characters and extreme zalgo, which Discord strips or caps.' },
    { q: 'Do I need Nitro for a fancy Discord name?', a: 'No. Unicode font styles are just characters, so they work without Nitro in your display name and nicknames. Nitro adds other perks but is not required for styled text.' },
    { q: 'Why does my zalgo nickname get cut off?', a: 'Discord stops handling combining marks after roughly 150 on a character to prevent abuse, so heavy zalgo stacks are trimmed or ignored. Use a milder amount if you want it to survive.' }
  ]
},

/* ===================================================================== */
{
  slug: 'is-fancy-text-bad-for-seo',
  crumb: 'Is Fancy Text Bad for SEO',
  pageTitle: 'Is Fancy Text Bad for SEO?',
  metaDesc: "As decoration, no. But styling the words you want to rank for can hurt: search normalizes fancy Unicode to plain, so styled keywords may not match queries. Keep keywords plain.",
  h1: 'Is Fancy Text Bad for SEO?',
  tagline: 'Fancy Unicode won’t get you penalised — but styling the wrong text can quietly make you harder to find. Here’s the honest line.',
  shortAnswer: 'For <strong>decoration</strong>, no. For <strong>content you want to rank</strong>, yes. Search engines normalize styled Unicode toward plain text for indexing, and a styled letter (𝟲𝗼𝗹𝗱) is a different character from a plain one — so styling a keyword can stop it matching a normal search, and styling body text or headings hurts both crawlability and accessibility. The safe rule: <strong>keep keywords, headings and body copy plain; use fancy text only for a name or tagline accent.</strong>',
  oneLiner: '<strong>Rule:</strong> decorate with it · never encode keywords, headings or body copy in it.',
  sections: [
    {
      label: 'What search does',
      h2: 'How search engines treat fancy Unicode',
      bodyHtml: `<div class="editorial-block">
    <p>Styled letters are <strong>compatibility characters</strong> — Unicode defines them as decorative variants of plain letters. Search systems normalize text (NFKC) so those variants fold back to plain for indexing. In practice that means one of two outcomes, both bad for a keyword: the styled term is indexed as plain (so the styling was pointless and it may look odd in results), or it’s treated as a different string and doesn’t match the normal query at all.</p>
  </div>`
    },
    {
      label: 'The real risk',
      h2: 'Where it actually hurts',
      bodyHtml: `<div class="editorial-block">
    <ul>
      <li><strong>Styled keywords</strong> — a title, heading or profile name in fancy Unicode may not match searches for the normal spelling.</li>
      <li><strong>Accessibility signals</strong> — screen readers read styled letters as “mathematical bold capital B…” or skip them, and poor accessibility is not the reputation you want on key pages.</li>
      <li><strong>Body copy</strong> — never set paragraphs or headings in styled Unicode; it’s the fastest way to make a page both unreadable to assistive tech and unmatched by search.</li>
    </ul>
  </div>`
    },
    {
      label: 'Safe use',
      h2: 'How to use it without hurting SEO',
      bodyHtml: `<div class="editorial-block">
    <p>Treat fancy text like an emoji, not like formatting: a small accent on a display name or social bio, never the container for your keywords. Keep titles, headings, meta and body in plain text so both search and screen readers get the real words. The LinkedIn version of this trade-off is covered in <a href="/answers/is-linkedin-bold-text-safe/">is LinkedIn bold text safe</a>.</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Style a name or tagline — safely',
    p: 'Generate an accent of fancy text for a display name or bio, and keep your keywords in plain text where search can read them.',
    href: '/',
    label: 'Open the Text Generator →'
  },
  related: 'Related: <a href="/answers/can-you-search-fancy-text/">can you search fancy text</a>, <a href="/answers/why-does-copied-fancy-text-lose-formatting/">why copied fancy text loses formatting</a>, and <a href="/answers/is-fancy-text-bad-for-accessibility/">is fancy text bad for accessibility</a>.',
  faq: [
    { q: 'Is fancy text bad for SEO?', a: 'As decoration it is harmless, but styling content you want to rank for can hurt. Search normalizes styled Unicode toward plain, so a styled keyword may not match a normal query, and styling headings or body copy also harms accessibility. Keep keywords and body plain; use fancy text only for accents.' },
    { q: 'Does Google read fancy Unicode text?', a: 'Google normalizes styled Unicode toward its plain equivalents for indexing, so it can often read the underlying letters — but the styled form may be treated as a different string and fail to match normal searches. Do not rely on it for keywords.' },
    { q: 'Will fancy text hurt my rankings?', a: 'There is no direct penalty for using it, but styling keywords, headings or body text can reduce how well your content matches searches and how accessible it is, which are the things that actually affect visibility.' },
    { q: 'Can I use fancy fonts in title tags or meta descriptions?', a: 'Avoid it. Titles and meta are prime keyword real estate; styled characters can break keyword matching and look broken in results. Keep them plain text.' },
    { q: 'Is bold Unicode bad for search?', a: 'Bold Unicode is fine as light decoration on a name or tagline, but if you bold the words you want found, they may not match searches for the plain spelling. Keep searchable words plain.' }
  ]
},

/* ===================================================================== */
{
  slug: 'can-you-search-fancy-text',
  crumb: 'Can You Search Fancy Text',
  pageTitle: 'Can You Search Fancy Text?',
  metaDesc: "Usually not with the normal spelling — a styled 'a' (𝖆) is a different character from 'a', so Ctrl+F and most search boxes won't match it. Here's when search does find it, and what to do.",
  h1: 'Can You Search Fancy Text?',
  tagline: 'Ctrl+F comes up empty, and searching your styled name finds nothing. Here’s why — and the one habit that keeps your text findable.',
  shortAnswer: 'Usually <strong>not with the plain spelling</strong>. A styled “a” (𝖆) is a different Unicode character from a normal “a,” so Ctrl+F, in-app search and Google won’t match a search for “cafe” against 𝐜𝐚𝐟𝐞 — unless that system normalizes the text first. Some search boxes do normalize and will find it; many don’t. The safe habit: <strong>keep anything you need to find in plain text.</strong>',
  oneLiner: '<strong>Bottom line:</strong> styled text ≠ the plain letters, so most searches skip it. Keep findable info plain.',
  sections: [
    {
      label: 'Why',
      h2: 'Why search misses it',
      bodyHtml: `<div class="editorial-block">
    <p>Search matches characters, not shapes. The bold 𝐚 and the plain a are two different code points that merely look related, so a query for “a” doesn’t equal 𝐚. That’s why Ctrl+F skips your styled text, and why a styled Instagram or LinkedIn name may not surface when someone searches your normal name.</p>
  </div>`
    },
    {
      label: 'The exception',
      h2: 'When search does find it',
      bodyHtml: `<div class="editorial-block">
    <p>Some systems <strong>normalize</strong> both your text and the query to plain before matching (the NFKC step). Those — including much of Google’s indexing — can find styled text by its plain spelling. But it’s inconsistent: you can’t predict whether a given search box normalizes, so you can’t rely on it. Treat “findable” as false unless you’ve tested that specific field.</p>
  </div>`
    },
    {
      label: 'What to do',
      h2: 'Keep the important words plain',
      bodyHtml: `<div class="editorial-block">
    <p>Put anything that must be searchable — your real name, a brand, a keyword, a hashtag — in plain text. Use fancy text for decoration around it. And note the flip side: because styled text is hard to search, some people use it deliberately to be <em>less</em> findable — which tells you exactly how reliably it hides from search. Related: <a href="/answers/why-does-copied-fancy-text-lose-formatting/">why copied fancy text loses formatting</a>.</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Generate text that still reads plainly',
    p: 'Style a name or bio for flair, and keep the words you want found in plain text alongside it.',
    href: '/',
    label: 'Open the Text Generator →'
  },
  related: 'Related: <a href="/answers/is-fancy-text-bad-for-seo/">is fancy text bad for SEO</a>, <a href="/answers/why-does-copied-fancy-text-lose-formatting/">why copied fancy text loses formatting</a>, and <a href="/answers/is-linkedin-bold-text-safe/">is LinkedIn bold text safe</a>.',
  faq: [
    { q: 'Can you search fancy text?', a: 'Usually not with the normal spelling. A styled letter is a different Unicode character from the plain one, so Ctrl+F, in-app search and many search boxes will not match a plain query against styled text — unless that system normalizes the text to plain first.' },
    { q: "Why doesn't Ctrl+F find my fancy text?", a: 'Because Ctrl+F matches exact characters, and a styled “a” is a different code point from a plain “a.” It looks the same but isn’t, so the search doesn’t match.' },
    { q: 'Does Google find fancy Unicode?', a: 'Google normalizes much styled Unicode to plain for indexing, so it can often find it by the plain spelling — but this is not guaranteed for every field or platform, so don’t rely on it for anything important.' },
    { q: 'Can people search my styled Instagram name?', a: 'Instagram matches search on your Name, and styled letters differ from plain ones, so a heavily styled name can be harder to find. Keep your searchable name mostly plain and style only a word or two.' },
    { q: 'How do I make fancy text searchable?', a: 'You can’t reliably — the styling changes the characters. Keep the searchable version in plain text and use fancy text only as decoration next to it.' }
  ]
},

/* ===================================================================== */
{
  slug: 'is-fancy-text-bad-for-accessibility',
  crumb: 'Fancy Text & Accessibility',
  pageTitle: 'Is Fancy Text Bad for Accessibility?',
  metaDesc: "It can be if overused. Screen readers may skip styled Unicode, spell it out as “mathematical bold capital B…”, or mispronounce it. Here's how to style without excluding anyone.",
  h1: 'Is Fancy Text Bad for Accessibility?',
  tagline: 'Not “never use it” — but a fully styled sentence can be silent or unintelligible to a screen reader. Here’s the honest picture and the simple rule.',
  shortAnswer: 'It can be, if you overuse it. Styled Unicode letters are <strong>mathematical symbols, not real letters</strong>, so a screen reader may <strong>skip them</strong> entirely (losing your meaning), <strong>spell them out</strong> one at a time as “mathematical bold capital B…”, or mispronounce them — and behaviour differs by reader. A whole styled sentence can become unusable. It’s not a reason to never use it: <strong>style a word or two for emphasis, and keep names, messages and calls to action in plain text.</strong>',
  oneLiner: '<strong>The rule:</strong> plain core, styled accent — a highlighter, not a paint roller.',
  sections: [
    {
      label: 'What happens',
      h2: 'What screen readers actually do with it',
      bodyHtml: `<div class="editorial-block">
    <p>There’s no single behaviour — and that’s the problem. Across the common readers, styled Unicode is handled three incompatible ways:</p>
    <ul>
      <li><strong>Skipped entirely</strong> — several readers say nothing, so styled words simply vanish from what the listener hears. If a “not” or a name was styled, the meaning can flip.</li>
      <li><strong>Spelled out</strong> — others read every glyph by its Unicode name: “mathematical bold capital B, mathematical bold small e…” A short word becomes a long, confusing recitation.</li>
      <li><strong>Mispronounced</strong> — some map them oddly or read digits/letters wrong.</li>
    </ul>
    <div class="mood-explainer">
      <div class="mood-example">You wrote: <strong>𝗭𝗲𝗹𝗹𝗼</strong> &nbsp;·&nbsp; a reader may say: “mathematical bold capital H, mathematical bold small e…” or nothing at all.</div>
    </div>
  </div>`
    },
    {
      label: 'Why',
      h2: 'Why it happens',
      bodyHtml: `<div class="editorial-block">
    <p>Because these aren’t letters wearing a style — they’re separate characters from a block Unicode built for equations. Assistive tech reads them by their character identity, which is “mathematical bold capital B,” not “B.” The same property breaks search and Ctrl+F, for the same reason.</p>
  </div>`
    },
    {
      label: 'The rule',
      h2: 'How to style without excluding anyone',
      bodyHtml: `<div class="editorial-block">
    <p>Keep every load-bearing word — your name, the core message, any call to action — in <strong>plain text</strong>, and use styling only for emphasis a listener can afford to miss. Style a word, not a paragraph. Done this way it adds personality at almost no accessibility cost. The full version, with a screen-reader demo, is in the <a href="/guide/fancy-fonts-accessibility-guide/">fancy fonts &amp; accessibility guide</a>.</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Style the accent, keep the substance plain',
    p: 'Generate emphasis for a word or two and leave your core message readable — the accessible way to use styled text.',
    href: '/',
    label: 'Open the Text Generator →'
  },
  related: 'Related: the deeper <a href="/guide/fancy-fonts-accessibility-guide/">fancy fonts &amp; accessibility guide</a>, <a href="/answers/is-linkedin-bold-text-safe/">is LinkedIn bold text safe</a>, and <a href="/answers/is-fancy-text-bad-for-seo/">is fancy text bad for SEO</a>.',
  faq: [
    { q: 'Is fancy text bad for accessibility?', a: 'It can be if overused. Screen readers may skip styled Unicode, spell it out one glyph at a time as “mathematical bold capital B,” or mispronounce it, so a fully styled sentence can be silent or unintelligible. Used on a word or two, with the core message in plain text, it is low-risk.' },
    { q: 'What do screen readers do with fancy fonts?', a: 'Behaviour varies by reader: some skip the styled text entirely, some read each character by its Unicode name (“mathematical bold capital B…”), and some mispronounce it. There is no consistent, reliable pronunciation.' },
    { q: 'Is it OK to use bold Unicode on social media?', a: 'Yes, sparingly. Emphasise a word or two and keep your name, message and any call to action in plain text so screen-reader users don’t lose the meaning. Avoid styling whole posts.' },
    { q: 'How do I use fancy text accessibly?', a: 'Follow the plain-core rule: load-bearing words stay plain, styling is only decoration a listener can miss. Style a word, not a paragraph, and never hide essential meaning inside styled characters.' },
    { q: 'Does fancy text fail WCAG?', a: 'Styled Unicode used for meaning can create WCAG problems because assistive tech may not convey it correctly. Used purely as decoration alongside plain-text content, it is much lower risk. Keep the real information in plain text.' }
  ]
},
/* ===================================================================== */
{
  slug: 'what-does-uwu-mean',
  crumb: 'What Does UwU Mean',
  pageTitle: 'What Does UwU Mean?',
  metaDesc: 'UwU is an emoticon of a cute, content face — closed happy eyes (u u) and a small mouth (w). It signals warmth, affection or cuteness. Here is what it means and how to use it.',
  twitterDesc: 'UwU is a cute, happy text face — closed eyes (u u) and a w mouth — that signals warmth and affection. Here is the meaning, the OwO variant, and where it comes from.',
  h1: 'What Does UwU Mean?',
  tagline: 'It is a tiny face, not a word — two happy closed eyes and a soft mouth. Here is what people mean when they send it.',
  shortAnswer: '<strong>UwU</strong> is an emoticon — a little face read upright. The two <strong>u</strong>s are closed, happy eyes and the <strong>w</strong> is a small smiling mouth, so the whole thing reads as a warm, content, slightly bashful expression. People send it to show <strong>affection, cuteness, or cozy happiness</strong> — a text-only way of saying “aww.” It is a <strong>kaomoji</strong> (Japanese-style emoticon), and its close cousin <strong>OwO</strong> swaps in wide, surprised eyes.',
  oneLiner: '<strong>UwU</strong> = happy &amp; affectionate (closed eyes). <strong>OwO</strong> = surprised &amp; curious (wide eyes).',
  sections: [
    {
      label: 'The face',
      h2: 'How to read UwU',
      bodyHtml: `<div class="editorial-block">
    <p>Read it straight on, letter by letter: <strong>u</strong> and <strong>u</strong> are two eyes closed in a happy squint, and the <strong>w</strong> in the middle is a small, smiling mouth. Because it is built from ordinary letters it works anywhere text does — no emoji support needed.</p>
    <p class="mood-example">UwU &nbsp; uwu &nbsp; UwU~</p>
  </div>`
    },
    {
      label: 'How it is used',
      h2: 'What people mean when they send UwU',
      bodyHtml: `<div class="editorial-block">
    <p>UwU carries <strong>softness, affection, and cute contentment</strong>. It shows up when someone thinks a thing is adorable, wants to sound warm and gentle, or is being playfully wholesome. It can also be used ironically — a knowing, over-the-top cuteness. It grew popular in anime, furry, and roleplay communities and spread across the wider internet from there.</p>
  </div>`
    },
    {
      label: 'UwU vs OwO',
      h2: 'UwU vs OwO — what is the difference?',
      bodyHtml: `<div class="editorial-block">
    <p>Only the eyes change. <strong>UwU</strong> has closed, happy eyes (content, affectionate). <strong>OwO</strong> has wide, round, surprised eyes (curious, alert, sometimes flirty) — as in the meme <em>“OwO what’s this?”</em> See <a href="/answers/what-does-owo-mean/">what does OwO mean</a> for the full breakdown.</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Build your own kaomoji',
    p: 'Mix eyes, mouths, and arms into your own text faces with the kaomoji generator — including UwU-style cuties.',
    href: '/kaomoji-generator/',
    label: 'Open the Kaomoji Generator →'
  },
  related: 'Related: <a href="/library/cute-kaomoji/">cute kaomoji</a> to copy, <a href="/answers/what-does-owo-mean/">what does OwO mean</a>, and the full <a href="/library/text-faces-kaomoji/">kaomoji library</a>.',
  faq: [
    { q: 'What does UwU mean?', a: 'UwU is an emoticon of a happy, affectionate face: the two u letters are closed, smiling eyes and the w is a small mouth. It signals warmth, cuteness, or cozy contentment.' },
    { q: 'Is UwU flirty?', a: 'It can be, but usually it just means cute or affectionate. The flirtier, more surprised version is OwO, which has wide eyes instead of closed ones.' },
    { q: 'What is the difference between UwU and OwO?', a: 'Only the eyes. UwU has closed, content eyes; OwO has wide, surprised eyes. UwU reads as happy and affectionate, OwO as curious or alert.' },
    { q: 'Where did UwU come from?', a: 'UwU is a kaomoji (Japanese-style emoticon) that became popular in anime, furry, and roleplay communities online before spreading to the wider internet.' },
    { q: 'How do you type UwU?', a: 'Just type the letters u, w, u. It is plain text, so it works in any app, bio, or chat with no special keyboard.' }
  ]
},
/* ===================================================================== */
{
  slug: 'what-does-owo-mean',
  crumb: 'What Does OwO Mean',
  pageTitle: 'What Does OwO Mean?',
  metaDesc: 'OwO is an emoticon of a surprised, curious face — wide round eyes (o o) and a small mouth (w). Famous from “OwO what’s this?” Here is what it means and how to use it.',
  twitterDesc: 'OwO is a wide-eyed, surprised text face (o o eyes, w mouth), famous from “OwO what’s this?” Here is the meaning, the UwU variant, and where it comes from.',
  h1: 'What Does OwO Mean?',
  tagline: 'Two wide eyes and a little mouth. Here is what people mean when they send OwO — and the meme behind it.',
  shortAnswer: '<strong>OwO</strong> is an emoticon read upright: the two <strong>o</strong>s are wide, round, surprised eyes and the <strong>w</strong> is a small mouth. It reads as <strong>curious, alert, or playfully surprised</strong> — often flirty. It is best known from the meme <em>“OwO what’s this?”</em> Its softer cousin <strong>UwU</strong> closes the eyes for a content, affectionate look.',
  oneLiner: '<strong>OwO</strong> = surprised &amp; curious (wide eyes). <strong>UwU</strong> = happy &amp; affectionate (closed eyes).',
  sections: [
    {
      label: 'The face',
      h2: 'How to read OwO',
      bodyHtml: `<div class="editorial-block">
    <p>Read it straight on: the two <strong>o</strong>s are wide, round eyes and the <strong>w</strong> is a small mouth. The open eyes are what give OwO its surprised, wide-awake feel — the opposite of UwU’s sleepy, closed-eye contentment.</p>
    <p class="mood-example">OwO &nbsp; owo &nbsp; OwO?</p>
  </div>`
    },
    {
      label: 'How it is used',
      h2: '“OwO what’s this?” and other uses',
      bodyHtml: `<div class="editorial-block">
    <p>OwO signals <strong>playful surprise or curiosity</strong>, and is often flirty or teasing. The phrase <em>“OwO what’s this?”</em> — reacting with mock innocence to something suggestive — turned it into a widely shared meme. Like UwU, it comes out of anime, furry, and roleplay spaces.</p>
  </div>`
    },
    {
      label: 'OwO vs UwU',
      h2: 'OwO vs UwU — what is the difference?',
      bodyHtml: `<div class="editorial-block">
    <p>Same mouth, different eyes. <strong>OwO</strong> has wide, surprised eyes; <strong>UwU</strong> has closed, happy eyes. Reach for OwO to sound alert, curious, or flirty, and UwU to sound soft and affectionate. See <a href="/answers/what-does-uwu-mean/">what does UwU mean</a>.</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Build your own kaomoji',
    p: 'Swap eyes and mouths to make your own text faces — from wide-eyed OwO to sleepy UwU — with the kaomoji generator.',
    href: '/kaomoji-generator/',
    label: 'Open the Kaomoji Generator →'
  },
  related: 'Related: <a href="/answers/what-does-uwu-mean/">what does UwU mean</a>, <a href="/library/cute-kaomoji/">cute kaomoji</a> to copy, and the full <a href="/library/text-faces-kaomoji/">kaomoji library</a>.',
  faq: [
    { q: 'What does OwO mean?', a: 'OwO is an emoticon of a surprised, curious face: the two o letters are wide eyes and the w is a small mouth. It reads as playful surprise, curiosity, or flirtation.' },
    { q: 'What does “OwO what’s this?” mean?', a: 'It is a meme reaction of mock-innocent surprise, usually to something suggestive or unexpected. The wide-eyed OwO face sells the exaggerated “oh, what do we have here” tone.' },
    { q: 'What is the difference between OwO and UwU?', a: 'The eyes. OwO has wide, surprised eyes; UwU has closed, content eyes. OwO reads as curious or flirty, UwU as soft and affectionate.' },
    { q: 'Is OwO flirty?', a: 'Often, yes. OwO frequently carries a teasing or flirty tone, especially in the “OwO what’s this?” meme, though it can just mean plain surprise.' },
    { q: 'Where did OwO come from?', a: 'OwO is a kaomoji (Japanese-style emoticon) popularized in anime, furry, and roleplay communities before spreading across the internet.' }
  ]
},
/* ===================================================================== */
{
  slug: 'what-does-xd-mean',
  crumb: 'What Does XD Mean',
  pageTitle: 'What Does XD Mean?',
  metaDesc: 'XD is an emoticon of a face laughing hard — tilt your head left and the X is scrunched-shut eyes, the D a wide open mouth. It means laughing out loud. Here is how to use it.',
  twitterDesc: 'XD is a laughing text face: tilt your head left and X is squeezed-shut eyes, D is a wide open mouth. It means LOL. Here is the meaning and its variants (xD, XDD).',
  h1: 'What Does XD Mean?',
  tagline: 'Tilt your head to the left and it clicks: it is a face laughing so hard its eyes are shut. Here is what it means.',
  shortAnswer: '<strong>XD</strong> is an emoticon you read with your head tilted to the left. The <strong>X</strong> is a pair of eyes squeezed shut from laughing, and the <strong>D</strong> is a wide open, laughing mouth. It means <strong>laughing out loud</strong> — the text equivalent of “LOL.” The more letters, the harder the laugh: <strong>xD</strong>, <strong>XDD</strong>, <strong>XDDD</strong>.',
  oneLiner: '<strong>XD</strong> = laughing hard (LOL). More D’s = harder laugh: <strong>xD · XDD · XDDD</strong>.',
  sections: [
    {
      label: 'The face',
      h2: 'How to read XD',
      bodyHtml: `<div class="editorial-block">
    <p>Rotate it 90° to the left in your head. The <strong>X</strong> becomes two tightly shut eyes and the <strong>D</strong> becomes a big open mouth — a face caught mid-laugh. It is a Western-style emoticon (read sideways), unlike upright kaomoji such as <span class="mood-example">(≥▽≤)</span>.</p>
    <p class="mood-example">XD &nbsp; xD &nbsp; XDD</p>
  </div>`
    },
    {
      label: 'How it is used',
      h2: 'What XD means in a message',
      bodyHtml: `<div class="editorial-block">
    <p>XD means something is <strong>funny</strong> — it is interchangeable with “lol” or “haha.” Lowercase <strong>xD</strong> is a lighter chuckle; stacking more <strong>D</strong>s (<strong>XDDD</strong>) means you are laughing harder. It dates back to early instant messaging and forums and is still common today, sometimes used ironically.</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Want the upright version?',
    p: 'Kaomoji laugh too — build a laughing text face like (≥▽≤) with the kaomoji generator, or copy ready-made ones.',
    href: '/kaomoji-generator/',
    label: 'Open the Kaomoji Generator →'
  },
  related: 'Related: <a href="/library/happy-kaomoji/">happy kaomoji</a> to copy, <a href="/answers/what-does-uwu-mean/">what does UwU mean</a>, and the full <a href="/library/text-faces-kaomoji/">kaomoji library</a>.',
  faq: [
    { q: 'What does XD mean?', a: 'XD is an emoticon of a face laughing hard. Tilt your head left: the X is eyes squeezed shut and the D is a wide open mouth. It means laughing out loud, like LOL.' },
    { q: 'What is the difference between XD and xD?', a: 'They mean the same thing. Uppercase XD reads as a bigger, harder laugh; lowercase xD is a softer chuckle. Adding more Ds (XDD, XDDD) means laughing even harder.' },
    { q: 'Is XD still used?', a: 'Yes. It is older internet slang from the instant-messaging era but is still widely used, sometimes sincerely and sometimes ironically for a retro feel.' },
    { q: 'How do you read XD?', a: 'Tilt your head 90 degrees to the left. The X turns into scrunched-up eyes and the D turns into an open, laughing mouth.' }
  ]
},
/* ===================================================================== */
{
  slug: 'what-does-o7-mean',
  crumb: 'What Does o7 Mean',
  pageTitle: 'What Does o7 Mean?',
  metaDesc: 'o7 is a text emoticon of a person saluting — the o is a head and the 7 is an arm raised in salute. It means respect, farewell, or “I salute you.” Here is how it is used.',
  twitterDesc: 'o7 is a saluting text face: the o is a head and the 7 is a raised, saluting arm. It means respect or “I salute you,” big in gaming and streaming. Here is the meaning.',
  h1: 'What Does o7 Mean?',
  tagline: 'A head and a raised arm: it is a salute you can type. Here is what people mean when they send o7.',
  shortAnswer: '<strong>o7</strong> is a text emoticon of someone <strong>saluting</strong>: the lowercase <strong>o</strong> is a head and the <strong>7</strong> is an arm bent up in a salute. People send it to show <strong>respect, solidarity, or farewell</strong> — “I salute you” or “o7, legend.” It is especially common in <strong>gaming, streaming, and military-adjacent online communities</strong>.',
  oneLiner: '<strong>o7</strong> = a salute (respect / farewell). Wave variants: <strong>o/ &nbsp; \\o &nbsp; \\o/</strong>.',
  sections: [
    {
      label: 'The face',
      h2: 'How to read o7',
      bodyHtml: `<div class="editorial-block">
    <p>The <strong>o</strong> is a head seen from the side and the <strong>7</strong> is an arm raised to the brow in a salute. It is a single-figure emoticon, read upright, that turns a gesture into two characters you can type anywhere.</p>
    <p class="mood-example">o7 &nbsp; o/ &nbsp; \\o</p>
  </div>`
    },
    {
      label: 'How it is used',
      h2: 'What o7 means in chat',
      bodyHtml: `<div class="editorial-block">
    <p>o7 signals <strong>respect and acknowledgement</strong> — a way to salute a teammate, honor someone leaving, or pay tribute (“o7” as an online version of “pour one out”). It took off in games like EVE Online and is a staple of Twitch chats and gaming Discords. Related waves include <strong>o/</strong> (waving hello) and <strong>\\o/</strong> (arms up, celebrating).</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Explore more text faces',
    p: 'o7 is one of hundreds of text faces. Browse the kaomoji library or build your own action faces in the generator.',
    href: '/kaomoji-generator/',
    label: 'Open the Kaomoji Generator →'
  },
  related: 'Related: the full <a href="/library/text-faces-kaomoji/">kaomoji library</a>, <a href="/answers/what-does-xd-mean/">what does XD mean</a>, and <a href="/answers/what-is-kaomoji/">what is a kaomoji</a>.',
  faq: [
    { q: 'What does o7 mean?', a: 'o7 is a text emoticon of a person saluting. The o is a head and the 7 is a raised, saluting arm. It means respect, acknowledgement, or farewell.' },
    { q: 'What does o7 mean in gaming?', a: 'In games and streams o7 is a salute to a teammate or opponent, a sign of respect, or a tribute. It became popular in EVE Online and spread to Twitch chat and gaming Discords.' },
    { q: 'What is the difference between o7 and o/?', a: 'o7 is a salute (arm bent to the brow). o/ is a wave (arm raised to say hello or goodbye). \\o/ shows both arms up in celebration.' },
    { q: 'How do you type o7?', a: 'Type a lowercase letter o followed by the number 7. It is plain text and works in any chat or app.' }
  ]
},
/* ===================================================================== */
{
  slug: 'what-is-kaomoji',
  crumb: 'What Is a Kaomoji',
  pageTitle: 'What Is a Kaomoji?',
  metaDesc: 'A kaomoji (顔文字, “face characters”) is a Japanese-style emoticon read upright, built from Unicode characters — like (≧▽≦). Here is what it means and how it differs from emoji.',
  twitterDesc: 'A kaomoji is a Japanese emoticon read upright — like (^_^) or ¯\\_(ツ)_/¯ — built from Unicode, not pictures. Here is what it means and how it differs from emoji and emoticons.',
  h1: 'What Is a Kaomoji?',
  tagline: 'Japanese emoticons you read straight on, not sideways. Here is what a kaomoji is and how it differs from an emoji.',
  shortAnswer: 'A <strong>kaomoji</strong> (Japanese 顔文字, literally “face characters”) is an <strong>emoticon you read upright</strong>, built by combining Unicode letters, punctuation, and symbols into a face — for example <span class="mood-example">(≧▽≦)</span> or <span class="mood-example">¯\\_(ツ)_/¯</span>. Unlike Western emoticons such as <strong>:)</strong> that you read sideways, a kaomoji is already the right way up. And unlike an <strong>emoji</strong> (a single picture-character like 🙂), a kaomoji is <strong>plain text</strong> — so it pastes cleanly and looks the same wherever text works.',
  oneLiner: '<strong>Kaomoji</strong> = upright, text-built face. <strong>Emoticon</strong> = sideways, e.g. :). <strong>Emoji</strong> = a single picture, e.g. 🙂.',
  sections: [
    {
      label: 'The difference',
      h2: 'Kaomoji vs emoji vs emoticon',
      bodyHtml: `<div class="editorial-block">
    <ul>
      <li><strong>Kaomoji</strong> — a face read upright, made from many characters: <span class="mood-example">(・∀・)</span></li>
      <li><strong>Emoticon</strong> — a face read sideways, from a few characters: <span class="mood-example">:) &nbsp; ;-) &nbsp; :D</span></li>
      <li><strong>Emoji</strong> — one pictograph character: 🙂 👍 ❤️</li>
    </ul>
    <p>Kaomoji and emoticons are both plain text; emoji are dedicated picture characters that can render differently on each platform.</p>
  </div>`
    },
    {
      label: 'How they are built',
      h2: 'How a kaomoji is made',
      bodyHtml: `<div class="editorial-block">
    <p>A kaomoji is assembled from <strong>brackets</strong> for the face outline, <strong>eyes</strong> and a <strong>mouth</strong> in the middle, and optional <strong>arms, cheeks, or decorations</strong> — for example <span class="mood-example">ヽ(•‿•)ノ</span>. Because every piece is a Unicode character, the whole face is just text you can copy, paste, and type anywhere.</p>
  </div>`
    },
    {
      label: 'Where they came from',
      h2: 'A short history of kaomoji',
      bodyHtml: `<div class="editorial-block">
    <p>Kaomoji emerged on Japanese message boards in the 1980s–1990s as a more expressive, upright alternative to Western emoticons. Japanese character sets offered a huge palette of symbols, which let creators build detailed faces — and the style spread worldwide as Unicode made those characters available everywhere.</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Make your own kaomoji',
    p: 'Combine eyes, mouths, and arms into a custom text face, or copy ready-made ones from the library.',
    href: '/kaomoji-generator/',
    label: 'Open the Kaomoji Generator →'
  },
  related: 'Related: <a href="/answers/how-to-type-kaomoji/">how to type kaomoji</a>, the full <a href="/library/text-faces-kaomoji/">kaomoji library</a>, and <a href="/answers/what-does-uwu-mean/">what does UwU mean</a>.',
  faq: [
    { q: 'What is a kaomoji?', a: 'A kaomoji is a Japanese-style emoticon read upright, built from Unicode letters, punctuation, and symbols to form a face, such as (^_^). Unlike emoji, it is plain text.' },
    { q: 'What does kaomoji mean?', a: 'Kaomoji comes from the Japanese words kao (face) and moji (character), literally face characters. It refers to emoticons you read the right way up.' },
    { q: 'What is the difference between a kaomoji and an emoji?', a: 'A kaomoji is a face built from ordinary text characters and always looks the same. An emoji is a single dedicated picture character that can render differently on each device or platform.' },
    { q: 'Are kaomoji Japanese?', a: 'Yes. Kaomoji originated on Japanese message boards and take advantage of the large set of Japanese symbols, though Unicode now makes them usable worldwide.' },
    { q: 'How do I make a kaomoji?', a: 'Combine a pair of brackets with eyes and a mouth, and add arms or decorations to taste, or use a kaomoji generator to assemble and copy one instantly.' }
  ]
},
/* ===================================================================== */
{
  slug: 'how-to-type-kaomoji',
  crumb: 'How to Type Kaomoji',
  pageTitle: 'How to Type Kaomoji',
  metaDesc: 'The fastest way to type kaomoji is to copy them. To make them natively: Windows uses Win + . , iPhone the Japanese Kana keyboard, Android Gboard. Here is how on every device.',
  twitterDesc: 'How to type kaomoji on any device: copy from a library, or use Win + . on Windows, the Kana keyboard on iPhone, and Gboard on Android. Full step-by-step here.',
  h1: 'How to Type Kaomoji',
  tagline: 'The quickest way is to copy them. But every major device can also insert kaomoji natively — here is how on each one.',
  shortAnswer: 'The <strong>fastest way to type a kaomoji is to copy it</strong> from a library and paste it wherever you need it. To insert them <strong>natively</strong>: on <strong>Windows</strong> press <strong>Win + .</strong> (or Win + ;) and open the kaomoji tab; on <strong>iPhone/iPad</strong> add the <strong>Japanese Kana keyboard</strong> and tap the <strong>^_^</strong> key; on <strong>Android</strong> open <strong>Gboard’s</strong> emoji panel and pick the <strong>kaomoji</strong> tab; on <strong>Mac</strong>, use <strong>Text Replacement</strong> or copy-paste, since there is no built-in kaomoji panel.',
  oneLiner: '<strong>Windows:</strong> Win + . &nbsp;·&nbsp; <strong>iPhone:</strong> Kana keyboard → ^_^ &nbsp;·&nbsp; <strong>Android:</strong> Gboard → kaomoji tab &nbsp;·&nbsp; <strong>Fastest:</strong> copy &amp; paste.',
  sections: [
    {
      label: 'The fast way',
      h2: 'The fastest way: copy and paste',
      bodyHtml: `<div class="editorial-block">
    <p>No setup, works on every device: open a kaomoji collection, tap a face to copy it, and paste it into your bio, caption, or chat. Start with the <a href="/library/text-faces-kaomoji/">kaomoji library</a> or build a custom one in the <a href="/kaomoji-generator/">kaomoji generator</a>.</p>
  </div>`
    },
    {
      label: 'Windows',
      h2: 'How to type kaomoji on Windows',
      bodyHtml: `<div class="editorial-block">
    <p>Press <strong>Windows key + . (period)</strong> or <strong>Windows key + ; (semicolon)</strong> to open the emoji panel, then click the <strong>kaomoji</strong> tab (the <strong>( •_•)</strong> icon). Pick a face to insert it. This works in Windows 10 and 11 in almost any text field.</p>
  </div>`
    },
    {
      label: 'iPhone & iPad',
      h2: 'How to type kaomoji on iPhone and iPad',
      bodyHtml: `<div class="editorial-block">
    <p>iOS hides a full kaomoji set inside the Japanese keyboard. Go to <strong>Settings › General › Keyboard › Keyboards › Add New Keyboard › Japanese › Kana</strong>. Then, when typing, switch to the Japanese keyboard and tap the <strong>^_^</strong> key to browse and insert kaomoji. Copy-paste from a library also works everywhere.</p>
  </div>`
    },
    {
      label: 'Android',
      h2: 'How to type kaomoji on Android (Gboard &amp; Samsung)',
      bodyHtml: `<div class="editorial-block">
    <p>On <strong>Gboard</strong>, tap the <strong>emoji</strong> button, then choose the <strong>kaomoji</strong> tab labelled <strong>( ˘ε˘ )</strong> or <strong>^_^</strong> along the bottom. On <strong>Samsung Keyboard</strong>, open the emoji panel and look for the kaomoji / text-emoticon section, or install Gboard for the built-in tab. Copy-paste works on any Android keyboard.</p>
  </div>`
    },
    {
      label: 'Mac',
      h2: 'How to type kaomoji on Mac',
      bodyHtml: `<div class="editorial-block">
    <p>macOS has no dedicated kaomoji panel (the Character Viewer, <strong>Ctrl + Cmd + Space</strong>, covers emoji and symbols). The easiest options are to <strong>copy-paste</strong> from a library, or to set up <strong>Text Replacement</strong> under <strong>System Settings › Keyboard › Text Replacements</strong> so a shortcut like <em>shrug</em> expands to ¯\\_(ツ)_/¯.</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Skip the setup — copy a kaomoji',
    p: 'Browse hundreds of ready-made faces, or assemble your own in the generator and copy it with one tap.',
    href: '/kaomoji-generator/',
    label: 'Open the Kaomoji Generator →'
  },
  related: 'Related: <a href="/answers/what-is-kaomoji/">what is a kaomoji</a>, the full <a href="/library/text-faces-kaomoji/">kaomoji library</a>, and the <a href="/kaomoji-generator/">kaomoji generator</a>.',
  faq: [
    { q: 'How do I type kaomoji on Windows?', a: 'Press Windows key + . (period) to open the emoji panel, then click the kaomoji tab (the smiley-face icon) and choose a face. It works in Windows 10 and 11.' },
    { q: 'How do I type kaomoji on iPhone?', a: 'Add the Japanese Kana keyboard in Settings > General > Keyboard > Keyboards > Add New Keyboard > Japanese > Kana. Switch to it while typing and tap the ^_^ key to insert kaomoji.' },
    { q: 'How do I get the kaomoji keyboard on Android?', a: 'Open Gboard, tap the emoji button, then select the kaomoji tab along the bottom. On Samsung Keyboard, look in the emoji panel for the text-emoticon section, or install Gboard.' },
    { q: 'How do I add kaomoji to a Samsung keyboard?', a: 'Open the emoji panel in Samsung Keyboard and look for the kaomoji or text-emoticon section. If it is missing, installing Gboard adds a dedicated kaomoji tab.' },
    { q: 'Is there a faster way than typing kaomoji?', a: 'Yes. Copying a ready-made kaomoji from a library and pasting it is the fastest method and works identically on every device with no setup.' }
  ]
},

/* ===================================================================== */
{
  slug: 'why-is-my-name-showing-as-boxes',
  crumb: 'Name Showing as Boxes',
  pageTitle: 'Why Is My Name Showing as Boxes or Question Marks?',
  metaDesc: "Your styled name saved fine but shows as □ or ??? to friends or inside a game. That's a missing-glyph (tofu) problem on the other device — here's the quick fix and which styles are safe.",
  h1: 'Why Is My Name Showing as Boxes or Question Marks?',
  tagline: 'You set a fancy name, it looked perfect — then a friend (or the game) shows it as □□□ or ???. Nothing is broken on your end. The other device just can’t draw those characters.',
  shortAnswer: 'Because the app, game or phone that’s <em>displaying</em> your name doesn’t have a picture (a glyph) for the fancy characters you used, so it draws an empty box (□) or a question mark instead. This is called <strong>tofu</strong>, and it’s decided by the <strong>viewer’s</strong> device, not yours — which is why your name looks fine to you and broken to them. The fix is to switch to a widely-supported style: <strong>bold, italic, small caps</strong> and <strong>script</strong> render almost everywhere, while <strong>fraktur, double-struck, zalgo and rare symbols</strong> are the ones that box out.',
  oneLiner: '<strong>Safe:</strong> bold · italic · small caps · script. <strong>Boxes out:</strong> fraktur · double-struck · zalgo · rare symbols.',
  sections: [
    {
      label: 'What’s happening',
      h2: 'It’s a missing glyph, not corrupted text',
      bodyHtml: `<div class="editorial-block">
    <p>Your name is ordinary Unicode text — the fancy letters are real characters. To show them, each device reaches into <em>its own</em> fonts for a matching picture. When a font has no picture for a character, it falls back to the “not defined” box (□) or a <code>?</code>. Old phones, game clients with a small built-in font, and some desktop apps hit this most.</p>
    <p>The key point: the box is drawn where the name is <strong>read</strong>, so the same name can look perfect on your phone and broken on someone else’s. See the full mechanism in <a href="/guide/why-fonts-show-as-boxes/">why fonts show as boxes</a> and <a href="/guide/boxes-vs-mojibake-vs-question-marks/">boxes vs mojibake vs question marks</a>.</p>
  </div>`
    },
    {
      label: 'The quick fix',
      h2: 'Swap to a style that renders everywhere',
      bodyHtml: `<div class="editorial-block">
    <p>Re-generate the same name in a more compatible style and paste it again:</p>
    <ul>
      <li><strong>Keep:</strong> bold, italic, bold-italic, small caps, script — these use characters nearly every font covers.</li>
      <li><strong>Drop:</strong> fraktur/blackletter, double-struck, zalgo (stacked marks) and long runs of rare symbols — these are the usual culprits.</li>
    </ul>
    <p class="mood-example">𝗕𝗼𝗹𝗱 · 𝘐𝘵𝘢𝘭𝘪𝘤 · ꜱᴍᴀʟʟ ᴄᴀᴘꜱ — safe · 𝕯𝖔𝖚𝖇𝖑𝖊 — risky</p>
  </div>`
    },
    {
      label: 'Names &amp; games',
      h2: 'In a game, boxes often mean the name will be rejected too',
      bodyHtml: `<div class="editorial-block">
    <p>Game name fields usually ship a small built-in font, so a character it can’t draw shows as a box <em>and</em> can trip the game’s filter — some games then refuse to save the name at all. If a symbol shows as □ or <code>?</code> in the preview, treat it as unsupported and replace it before you spend a rename card. More on that in <a href="/answers/why-was-my-game-name-rejected/">why was my game name rejected</a>.</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Make a name that renders everywhere',
    p: 'Generate your name in bold, italic or small caps — the styles that display on every device — and copy it in one tap.',
    href: '/',
    label: 'Open the Text Generator →'
  },
  related: 'Related: <a href="/guide/why-fonts-show-as-boxes/">why fonts show as boxes</a>, <a href="/answers/why-was-my-game-name-rejected/">why was my game name rejected</a>, <a href="/answers/do-fancy-fonts-work-on-iphone/">do fancy fonts work on iPhone</a>, and <a href="/answers/why-fancy-text-looks-different-on-iphone-vs-android/">iPhone vs Android</a>.',
  faq: [
    { q: 'Why is my name showing as boxes?', a: 'Because the device or app displaying your name has no glyph for the fancy characters you used, so it draws an empty .notdef box instead. It is a missing-font problem on the viewer’s side, not corrupted text, and it happens most with fraktur, double-struck, zalgo and rare symbols.' },
    { q: 'Why does my name show as question marks instead of boxes?', a: 'Same cause, different fallback. Some systems substitute a question mark for an unsupported character rather than a box. Both mean the character could not be rendered on that device.' },
    { q: 'How do I fix a name that shows as boxes?', a: 'Re-create it in a widely-supported style — bold, italic, small caps or script — and avoid fraktur, double-struck, zalgo and obscure symbols. Those safe styles render on virtually every phone and app.' },
    { q: 'Why does it look fine on my phone but broken to others?', a: 'The box is drawn by the reader’s device using its own fonts. Your phone has the glyph, theirs does not, so the same text renders on yours and boxes out on theirs — especially on older devices.' },
    { q: 'Do boxes mean my account got hacked or my text got corrupted?', a: 'No. The underlying characters are intact; only the picture is missing on that device. Copy the name into a plain-text field and it is still the same text.' }
  ]
},

/* ===================================================================== */
{
  slug: 'why-was-my-game-name-rejected',
  crumb: 'Game Name Rejected',
  pageTitle: 'Why Was My Game Name Rejected?',
  metaDesc: "Free Fire, PUBG, Roblox or Valorant won't save your stylish name? Games filter certain characters and count styled letters toward a tight limit. Here's why it's rejected and how to fix it before you spend a rename card.",
  h1: 'Why Was My Game Name Rejected?',
  tagline: 'You paste a decorated name, hit save, and the game says it’s invalid — or silently strips it. Two things are almost always behind it.',
  shortAnswer: 'Games run a <strong>name filter</strong> that only accepts certain characters, and a <strong>length limit</strong> where fancy Unicode letters and decorative glyphs often count for <em>more</em> than they look. So a name can be rejected because it contains a character the game blocks, because it’s over the limit once the styled characters are counted, or because it’s already taken. The fix is to keep decoration light, use symbols the game is known to accept, and <strong>preview before you spend a rename card</strong>.',
  oneLiner: '<strong>Rejected because:</strong> a blocked character · over the (styled-counted) limit · name already taken.',
  sections: [
    {
      label: 'Reason 1',
      h2: 'The character filter blocks it',
      bodyHtml: `<div class="editorial-block">
    <p>Each game whitelists a range of characters. Simple frames and symbols (like ꧁ ꧂, ★, ツ) usually pass, but heavy math-styled letters, emoji, currency signs and rare codepoints are often <strong>rejected outright</strong> or shown as a box/<code>?</code>. If a character shows as □ in the preview, the game can’t render it — and frequently won’t save it. Restricted or banned <em>words</em> are filtered too, even with look-alike letters.</p>
  </div>`
    },
    {
      label: 'Reason 2',
      h2: 'Styled letters eat the character limit',
      bodyHtml: `<div class="editorial-block">
    <p>Name fields are short, and a “fancy” letter is often built from more than one underlying character, so a name that <em>looks</em> short can still be over the limit. Rough limits to plan around, mobile games first:</p>
    <ul>
      <li><strong>Free Fire</strong> — about 12 characters</li>
      <li><strong>PUBG Mobile</strong> — 14 characters (the PC game allows more)</li>
      <li><strong>Mobile Legends</strong> — a short limit, and only a few special characters before the name is rejected</li>
      <li><strong>Roblox</strong> — the <em>display name</em> rejects most decorative Unicode (“unsupported characters”); the <em>@username</em> is letters, numbers and a single underscore only</li>
      <li><strong>Valorant / Riot</strong> — a Riot ID is a name plus a short letters-and-numbers tag; heavily-styled text is commonly rejected</li>
    </ul>
    <p>Treat these as guidance and check in-game — limits and filters change with updates. For the full allowed-character rules on the PC and console games (<strong>Roblox, Fortnite, Valorant and COD</strong>), see the <a href="/guide/game-username-allowed-symbols/">allowed characters in game usernames</a> guide.</p>
  </div>`
    },
    {
      label: 'The fix',
      h2: 'Don’t waste a rename card',
      bodyHtml: `<div class="editorial-block">
    <p>Renames often cost real currency, so test first: paste your styled name into the field and watch the preview. If every character renders and it fits, save it; if anything shows as a box or gets stripped, simplify. Keep 2–3 decorative symbols at most, prefer frames the game clearly supports, and keep a plain fallback ready. If your name shows as boxes, see <a href="/answers/why-is-my-name-showing-as-boxes/">why is my name showing as boxes</a>.</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Build a name that the game accepts',
    p: 'Generate a decorated name, keep the styling light, and copy it to test in the field before you commit a rename.',
    href: '/',
    label: 'Open the Name Generator →'
  },
  related: 'Related: the full <a href="/guide/game-username-allowed-symbols/">allowed characters in game usernames</a> guide, <a href="/answers/why-is-my-name-showing-as-boxes/">why is my name showing as boxes</a>, <a href="/answers/how-to-make-a-blank-name/">how to make a blank name</a>, and <a href="/answers/where-do-fancy-fonts-work-username-vs-display-name/">username vs display name</a>.',
  faq: [
    { q: 'Why won’t my Free Fire / PUBG name save?', a: 'Usually because a character in it is outside the game’s allowed set (so it is rejected or shown as a box), or because the styled characters push the name over the length limit — roughly 12 for Free Fire and 14 for PUBG Mobile. Simplify the styling and keep it short.' },
    { q: 'Why does Roblox say my name has unsupported characters?', a: 'Roblox filters display names through the same checks as usernames and rejects most decorative Unicode with an “unsupported characters” message. The @username is even stricter: letters, numbers and one underscore only. Use plain or lightly-styled text there.' },
    { q: 'Do fancy characters count as more than one character in a game name?', a: 'Often, yes. Many styled letters are built from multiple underlying code units, so a name that looks short can exceed the limit. If you are near the cap, remove decoration or use fewer symbols.' },
    { q: 'How do I avoid wasting a rename card?', a: 'Preview the name in the field before confirming. If every character renders and it fits the limit, save it; if anything shows as a box or is stripped out, fix it first. Keep decoration to a couple of well-supported symbols.' },
    { q: 'Which symbols are safest for game names?', a: 'Common decorative frames and symbols such as ꧁ ꧂, brackets, stars and ツ tend to be accepted, while emoji, currency signs and rare codepoints are the ones most often rejected or boxed. Test in-game to be sure.' }
  ]
},

/* ===================================================================== */
{
  slug: 'how-to-make-a-blank-name',
  crumb: 'Blank / Invisible Name',
  pageTitle: 'How to Make a Blank (Invisible) Name',
  metaDesc: "Want a blank or invisible username in a game, on Discord, Steam or WhatsApp? A normal space gets trimmed, so you paste an invisible Unicode character instead. Here's how — and the catch.",
  h1: 'How to Make a Blank (Invisible) Name',
  tagline: 'A plain spacebar space almost always gets stripped, so the name comes back as “required” or reverts. The trick is a character that’s invisible but still counts as text.',
  shortAnswer: 'Type a normal space and most apps trim it, so you can’t save an empty name that way. Instead you paste an <strong>invisible Unicode character</strong> that the field treats as a real letter but draws as nothing — the most reliable one is the <strong>Hangul Filler (U+3164)</strong>. Copy it, paste it into the name field, and the name shows blank. Two honest caveats: <strong>which invisible character works varies by app and can change with updates</strong>, and some games consider blank names against the rules, so there’s a small reset/ban risk.',
  oneLiner: '<strong>How:</strong> paste an invisible character (e.g. Hangul Filler ㅤ) where a space would go. <strong>Catch:</strong> support varies by app and patch.',
  sections: [
    {
      label: 'Why a space fails',
      h2: 'Normal spaces get trimmed',
      bodyHtml: `<div class="editorial-block">
    <p>Most name fields strip leading, trailing and empty spaces so people can’t register a nameless or space-only account. A regular space therefore either disappears or triggers a “name required” error. An invisible character avoids this because, to the app, it’s a normal text character that just happens to have no visible shape.</p>
  </div>`
    },
    {
      label: 'How to do it',
      h2: 'Paste an invisible character',
      bodyHtml: `<div class="editorial-block">
    <ol>
      <li>Copy an invisible character from the <a href="/symbol/invisible-character/">invisible character tool</a> (the Hangul Filler ㅤ is the most widely accepted).</li>
      <li>Paste it into the name field where you want the blank.</li>
      <li>Some games reject a <em>single</em> invisible character because that “name” is already taken — paste it <strong>2–3 times</strong> to make it unique while still looking empty.</li>
    </ol>
    <p>The same trick makes an <strong>invisible space between words</strong> in games that block the spacebar.</p>
  </div>`
    },
    {
      label: 'The catch',
      h2: 'Support varies — and some games ban it',
      bodyHtml: `<div class="editorial-block">
    <p>There’s no single character that works everywhere forever. Apps and games update their filters, so a character that works today (Hangul Filler, or fallbacks like Braille Blank U+2800) can stop working after a patch, and a blocked one shows up as a literal box or <code>?</code>. A few games also treat blank/invisible names as a rules violation and may reset the name or act on the account. So: <strong>test on the exact app</strong>, and don’t rely on a blank name where a reset would cost you.</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Get an invisible character',
    p: 'Copy a blank/invisible character in one tap, then paste it into any name, bio or message field.',
    href: '/symbol/invisible-character/',
    label: 'Open the Invisible Character Tool →'
  },
  related: 'Related: <a href="/answers/why-was-my-game-name-rejected/">why was my game name rejected</a>, <a href="/answers/where-do-fancy-fonts-work-username-vs-display-name/">username vs display name</a>, and <a href="/answers/why-is-my-name-showing-as-boxes/">why is my name showing as boxes</a>.',
  faq: [
    { q: 'How do I make a blank name in a game?', a: 'Copy an invisible Unicode character — the Hangul Filler (U+3164) is the most reliable — and paste it into the name field instead of a space. If a single one is rejected as already taken, paste it two or three times so the name is unique but still looks empty.' },
    { q: 'Why doesn’t a normal space work for a blank name?', a: 'Because apps trim leading, trailing and empty spaces to stop nameless accounts, so a spacebar space is removed or triggers a “name required” error. An invisible character is treated as real text, so it survives.' },
    { q: 'Which invisible character should I use?', a: 'Start with the Hangul Filler (U+3164). If an app rejects it or shows a box, try an alternative such as the Braille Pattern Blank (U+2800). Which one is accepted depends on the app and can change with updates, so test on the target.' },
    { q: 'Can I get banned for a blank or invisible name?', a: 'On most social apps it is harmless. In some games a blank or invisible name is against the rules and can be reset or flagged, so use it where a name reset would not cost you, and check the game’s policy.' },
    { q: 'Does a blank name work on Discord, Steam and WhatsApp?', a: 'The display-name and profile-name fields on these accept invisible characters, so a blank name generally works — but support shifts with updates, and the @username/handle fields do not allow it. Test on the specific app.' }
  ]
},

/* ===================================================================== */
{
  slug: 'where-do-fancy-fonts-work-username-vs-display-name',
  crumb: 'Username vs Display Name',
  pageTitle: 'Where Do Fancy Fonts Work — Username or Display Name?',
  metaDesc: "Getting an “invalid characters” error pasting a fancy font? It goes in the display name, not the @username. Here's the rule, a per-platform table, and the exceptions where fancy text never works.",
  h1: 'Where Do Fancy Fonts Work — Username or Display Name?',
  tagline: 'You paste a stylish name, it’s rejected as “invalid characters,” and you assume fancy fonts don’t work here. They do — you just put them in the wrong field.',
  shortAnswer: 'Fancy Unicode goes in your <strong>display name / nickname / bio</strong>, <strong>not</strong> your <strong>@username (handle)</strong>. Handles are the address people use to find and @-mention you, so nearly every app restricts them to plain ASCII — lowercase letters, numbers, dots and underscores — and rejects pasted fonts with an “invalid characters” error. The display name is a label, so it accepts styled Unicode. Put the style in the display field and leave the handle plain.',
  oneLiner: '<strong>@username</strong> = plain ASCII (rejects fonts). <strong>Display name / bio</strong> = styled Unicode (accepts them).',
  sections: [
    {
      label: 'The rule',
      h2: 'Two fields, two very different rules',
      bodyHtml: `<div class="editorial-block">
    <p>Almost every profile has two name fields:</p>
    <ul>
      <li><strong>@username / handle</strong> — unique, used in your URL and @-mentions. Restricted to letters, numbers, <code>.</code> and <code>_</code>. Paste a font and you get “username can only use letters, numbers, underscores and periods.”</li>
      <li><strong>Display name / nickname / bio</strong> — a human-readable label, not an address. Accepts styled Unicode, emoji and spaces.</li>
    </ul>
    <p>So the fix for “invalid characters” is almost always: move the fancy text out of the handle and into the display name.</p>
  </div>`
    },
    {
      label: 'By platform',
      h2: 'Where the fancy text goes',
      bodyHtml: `<div class="editorial-block">
    <p>Same pattern across the board — style the field on the right, keep the handle plain:</p>
    <ul>
      <li><strong>Instagram / TikTok</strong> — handle plain; style the <em>Name</em> / <em>Nickname</em> and bio.</li>
      <li><strong>Discord</strong> — username plain; style the <em>display name</em> and server nickname.</li>
      <li><strong>WhatsApp</strong> — style the profile <em>name</em> and About (its new @username is plain).</li>
      <li><strong>X / YouTube / Telegram</strong> — handle plain; style the <em>display name</em> / channel name / first name.</li>
    </ul>
    <p>Game names follow the same split — style the display name and keep any tag plain. For the per-game character rules, see <a href="/guide/game-username-allowed-symbols/">allowed characters in game usernames</a> and <a href="/answers/why-was-my-game-name-rejected/">why was my game name rejected</a>.</p>
  </div>`
    },
    {
      label: 'Exceptions',
      h2: 'Where fancy text genuinely doesn’t work',
      bodyHtml: `<div class="editorial-block">
    <p>A few fields reject styled text even though they’re display names:</p>
    <ul>
      <li><strong>Facebook</strong> — the real-name field blocks symbols, unusual capitalization and mixed scripts by policy (bio and posts are fine).</li>
      <li><strong>Twitch</strong> — the Latin display name can only change capitalization, not font.</li>
      <li><strong>LinkedIn</strong> — the headline stopped accepting stylized Unicode, and a styled name can make you invisible to recruiter search. See <a href="/answers/is-linkedin-bold-text-safe/">is LinkedIn bold text safe</a>.</li>
    </ul>
  </div>`
    }
  ],
  cta: {
    h3: 'Style the right field',
    p: 'Generate your name in a style that works in display names and bios, then copy it — and keep your @handle plain.',
    href: '/',
    label: 'Open the Text Generator →'
  },
  related: 'Related: <a href="/answers/why-wont-instagram-accept-my-fancy-username/">why won’t Instagram accept my fancy username</a>, <a href="/answers/why-wont-discord-accept-fancy-username/">why won’t Discord accept a fancy username</a>, <a href="/answers/why-was-my-game-name-rejected/">why was my game name rejected</a>, and the <a href="/guide/game-username-allowed-symbols/">game username allowed characters</a> guide.',
  faq: [
    { q: 'Why do I get “invalid characters” when I paste a fancy font?', a: 'Because you pasted it into the @username / handle field, which only allows letters, numbers, dots and underscores. Put the styled text in the display name, nickname or bio instead — those accept Unicode.' },
    { q: 'What is the difference between a username and a display name?', a: 'The username (handle) is your unique address, used in your URL and @-mentions, and is restricted to plain ASCII. The display name is a human-readable label shown above your posts, and it accepts styled Unicode, emoji and spaces.' },
    { q: 'Can I put a fancy font in my Instagram or TikTok @username?', a: 'No. Handles on Instagram and TikTok are limited to lowercase letters, numbers, periods and underscores. Style the Name / Nickname field and the bio instead, which do accept fancy Unicode.' },
    { q: 'Which platforms don’t allow fancy display names at all?', a: 'Facebook blocks symbols and unusual formatting in the real-name field by policy, Twitch only lets a Latin display name change capitalization, and LinkedIn no longer accepts stylized Unicode in the headline. Bios and posts on those platforms are usually fine.' },
    { q: 'Will a fancy display name hurt search or mentions?', a: 'Your handle drives search and @-mentions and stays plain, so those are unaffected. A heavily-styled display name can be harder for screen readers and name search, so keep it readable if discoverability matters.' }
  ]
},

/* ===================================================================== */
{
  slug: 'do-fancy-fonts-work-with-arabic',
  crumb: 'Fancy Fonts with Arabic',
  pageTitle: 'Do Fancy Fonts Work With Arabic?',
  metaDesc: "You can't “bold” or “italicize” Arabic letters the way you can English — Arabic has no styled-letter Unicode block. Here's how Arabic name decoration actually works, plus the right-to-left gotchas.",
  h1: 'Do Fancy Fonts Work With Arabic?',
  tagline: 'You run an Arabic name through a font generator and nothing changes — or it breaks. Arabic decoration works differently from English, and it’s worth knowing why.',
  shortAnswer: 'Not the same way as English. The “fancy fonts” you see for Latin text come from Unicode’s <strong>Mathematical Alphanumeric</strong> block — bold, italic, script versions of A–Z. <strong>Arabic has no equivalent block</strong>, so there’s no way to turn Arabic letters into bold or cursive Unicode. Arabic decoration (<em>zakhrafa</em>) instead works by wrapping the name in <strong>symbols and frames</strong>, adding decorative marks, and styling any <strong>Latin/transliterated</strong> part of the name. Mixed Arabic-and-Latin text also has right-to-left quirks that can flip the order or show boxes.',
  oneLiner: '<strong>Arabic:</strong> can’t bold the letters (no Unicode block) — decorate with frames &amp; symbols instead.',
  sections: [
    {
      label: 'Why not',
      h2: 'There’s no styled-letter block for Arabic',
      bodyHtml: `<div class="editorial-block">
    <p>A “bold” Latin letter like <strong>𝗔</strong> is a separate Unicode character that font generators swap in. Unicode only ships those styled alphabets for <strong>Latin, and partly Greek and digits</strong> — not for Arabic script. So a generator can’t make ب into a “bold ب”; the letter simply stays as it is. This is a limit of Unicode, not of any one app.</p>
  </div>`
    },
    {
      label: 'What works',
      h2: 'How Arabic decoration actually works',
      bodyHtml: `<div class="editorial-block">
    <p>Arabic name styling is built from things that <em>do</em> exist as characters:</p>
    <ul>
      <li><strong>Frames and symbols</strong> around the name — ꧁ ꧂, stars, ornaments — which work regardless of script.</li>
      <li><strong>Decorative and cultural glyphs</strong>, including religious symbols, added around the text.</li>
      <li><strong>Styling the Latin part</strong> — if your name is written in Latin letters or has a transliterated tag, that part <em>can</em> take bold, italic and other styles.</li>
    </ul>
    <p class="mood-example">꧁ اسمك ꧂ · ✦ اسمك ✦</p>
    <p>The Arabic decoration tool does exactly this — <a href="/ar/zakhrafa/">زخرفة الأسماء</a>.</p>
  </div>`
    },
    {
      label: 'RTL gotchas',
      h2: 'Right-to-left and mixed text',
      bodyHtml: `<div class="editorial-block">
    <p>Arabic runs right-to-left, so mixing it with Latin letters, numbers or symbols can make parts appear in the “wrong” order, and heavier decorative characters can show as boxes on some apps (especially iPhone-to-Android in messaging). If a decorated name flips direction or boxes out, simplify the symbols and keep the Arabic and Latin parts clearly separated. Boxes here are the same missing-glyph issue as everywhere — see <a href="/answers/why-is-my-name-showing-as-boxes/">why is my name showing as boxes</a>.</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Decorate an Arabic name',
    p: 'Wrap your name in frames and symbols, and style any Latin part — then copy it for your profile or game.',
    href: '/ar/zakhrafa/',
    label: 'Open the Arabic Decoration Tool →'
  },
  related: 'Related: <a href="/answers/why-fancy-text-removes-accents/">why fancy text removes accents</a>, <a href="/answers/do-fancy-fonts-work-with-vietnamese/">do fancy fonts work with Vietnamese</a>, and <a href="/answers/why-is-my-name-showing-as-boxes/">why is my name showing as boxes</a>.',
  faq: [
    { q: 'Can you make Arabic text bold or italic with a font generator?', a: 'No. The bold and italic “fonts” come from Unicode’s Mathematical Alphanumeric block, which only covers Latin (and some Greek and digits). Arabic has no such block, so Arabic letters cannot be converted to bold or cursive Unicode.' },
    { q: 'How do you make a fancy Arabic name then?', a: 'By decorating around the letters: wrapping the name in frames and symbols (like ꧁ ꧂ or stars), adding ornamental or cultural glyphs, and styling any Latin or transliterated part of the name, which can take normal fancy fonts.' },
    { q: 'Why does my mixed Arabic and English name appear in the wrong order?', a: 'Arabic is right-to-left and Latin is left-to-right, so mixing them can reorder parts of the name on some apps. Keeping the Arabic and Latin sections separate, and using fewer symbols between them, usually fixes the direction.' },
    { q: 'Why does my decorated Arabic name show as boxes?', a: 'Because the viewing device lacks a glyph for one of the decorative characters, so it draws a box. It is the same missing-font issue as any other script — use simpler, widely-supported symbols and it renders reliably.' },
    { q: 'Do these decorated Arabic names work in games like PUBG and Free Fire?', a: 'Frames and common symbols around an Arabic name usually work, but each game filters characters and limits length, and rare glyphs can be rejected or boxed. Keep the decoration light and test in the field before spending a rename card.' }
  ]
},

/* ===================================================================== */
{
  slug: 'what-are-discord-display-name-styles',
  crumb: 'What Are Discord Display Name Styles',
  pageTitle: 'What Are Discord Display Name Styles?',
  metaDesc: "Display Name Styles are a paid Nitro feature that gives your Discord display name a font, a colour and an animated effect. Here's exactly where each part shows up, why servers strip the colour, and the free Unicode alternative.",
  h1: 'What Are Discord Display Name Styles?',
  tagline: 'A Nitro feature with three parts — font, colour, effect — and each part survives in a different set of places. That mismatch is why your styled name never looks the same in a server as it does on your profile.',
  shortAnswer: '<strong>Display Name Styles</strong> are a <strong>paid Discord Nitro feature</strong> that restyles your display name with a built-in <strong>font</strong>, a <strong>colour</strong> and an <strong>animated effect</strong>. The three parts do <em>not</em> travel together: inside a server, your <strong>role colour takes precedence</strong>, so the font carries over but the colour and effect generally do not. On mobile, everything renders <strong>static</strong> — no animation. If you don\'t have Nitro, <strong>Unicode fonts</strong> are the free alternative: they aren\'t a Discord feature at all, so they work on every account and in fields Nitro styles never reach.',
  oneLiner: '<strong>Nitro Display Name Styles:</strong> font + colour + effect, display name only, animation on desktop. <strong>Free Unicode fonts:</strong> letterform only, but every account and nearly every field.',
  sections: [
    {
      label: 'What it is',
      h2: 'Display Name Styles, in one paragraph',
      bodyHtml: `<div class="editorial-block">
    <p>Discord launched Display Name Styles as a <strong>Nitro perk in late October 2025</strong>, reaching all Nitro subscribers by early December, and has kept adding options since — a rounded, comic-style <strong>Playpen Sans</strong> font and a <strong>“Gummy” effect</strong> that alternates colour letter by letter were both announced during 2026.</p>
    <p>A style is made of three separate pieces:</p>
    <ul>
      <li><strong>Font</strong> — a different letterform for your display name, drawn by Discord.</li>
      <li><strong>Colour</strong> — a colour or gradient applied to the name.</li>
      <li><strong>Effect</strong> — motion or per-letter treatment layered on top.</li>
    </ul>
    <p>It applies to your <strong>display name only</strong> — never your <code>@username</code>, which stays lowercase Latin, digits, underscores and periods. You can also set a <strong>different style per server</strong> through your per-server profile.</p>
    <p class="mood-example">Display name → styled &nbsp;·&nbsp; @username → never styled</p>
  </div>`
    },
    {
      label: 'Where it shows',
      h2: 'Where each part of the style actually survives',
      bodyHtml: `<div class="editorial-block">
    <p>This is the part almost nobody explains, and it is the whole reason a style looks different depending on where you see it. The <strong>font</strong> is the durable piece; the <strong>colour and effect</strong> are the fragile ones.</p>
    <div class="data-table-wrap">
      <table class="data-table">
        <thead>
          <tr><th scope="col">Where</th><th scope="col">Font</th><th scope="col">Colour &amp; effect</th></tr>
        </thead>
        <tbody>
          <tr><td>Your profile / profile panel</td><td>Yes</td><td>Yes — the full style</td></tr>
          <tr><td>DM and group-chat member lists</td><td>Yes</td><td>Yes</td></tr>
          <tr><td>DM list (sidebar)</td><td>Yes</td><td>Hover to see it</td></tr>
          <tr><td>Message author names</td><td>Yes</td><td>Hover to see it</td></tr>
          <tr><td>Inside a server</td><td>Yes</td><td><strong>No — your role colour wins</strong></td></tr>
          <tr><td>Your <code>@username</code></td><td>No</td><td>No</td></tr>
        </tbody>
      </table>
    </div>
    <p>So if you bought Nitro mainly to have a coloured, animated name in the servers you're active in, that is the one place the colour and effect are most likely to be overridden — the server's role styling takes priority there.</p>
  </div>`
    },
    {
      label: 'Desktop vs mobile',
      h2: 'Why the animation disappears on your phone',
      bodyHtml: `<div class="editorial-block">
    <p>Animated effects play on <strong>desktop</strong>. On <strong>mobile</strong>, the font, colour and effect still appear, but they render <strong>static</strong> — the motion is dropped.</p>
    <p>That matters more than it sounds: most people read Discord on a phone. A style chosen for how it moves on desktop is, for a large share of the people looking at it, just a colour.</p>
  </div>`
    },
    {
      label: 'Compared',
      h2: 'Display Name Styles vs. Unicode fonts',
      bodyHtml: `<div class="editorial-block">
    <p>These are two different mechanisms, not two versions of the same thing. Nitro styles are <strong>rendered by Discord</strong>. Unicode fonts are <strong>real characters</strong> you paste — the letters themselves are different codepoints, so no app has to support anything.</p>
    <div class="compare-grid">
      <div class="compare-card variant-muted">
        <span class="compare-badge">Paid — Nitro Display Name Styles</span>
        <h4>Rendered by Discord</h4>
        <ul>
          <li>Requires an active Nitro subscription</li>
          <li>Font <em>plus</em> colour and animated effect</li>
          <li>Display name only, and can differ per server</li>
          <li>Colour and effect overridden by role colour in servers</li>
          <li>Static on mobile — no animation</li>
          <li>Stops working if Nitro lapses</li>
          <li>Discord only</li>
        </ul>
      </div>
      <div class="compare-card variant-positive">
        <span class="compare-badge">Free — Unicode fonts</span>
        <h4>Real characters you paste</h4>
        <ul>
          <li>Free, and works on every account</li>
          <li>Letterform only — no colour, no animation</li>
          <li>Works in display names, server nicknames, About Me, messages and channel names</li>
          <li>Not affected by role colour</li>
          <li>Identical on desktop and mobile</li>
          <li>Yours permanently once pasted</li>
          <li>Pastes into Instagram, TikTok, games and anywhere else too</li>
        </ul>
      </div>
    </div>
    <p>The honest trade: Nitro buys you <strong>colour and motion</strong>, which Unicode genuinely cannot do. Unicode buys you <strong>reach</strong> — more fields, every account, every device, and no subscription to keep paying. Plenty of people use both: a Unicode letterform inside a Nitro colour.</p>
  </div>`
    },
    {
      label: 'No Nitro',
      h2: 'What to do if you don’t have Nitro',
      bodyHtml: `<div class="editorial-block">
    <p>Paste a Unicode font into your display name. Nothing needs to be enabled, and it works on free, Classic and Nitro accounts alike:</p>
    <ol>
      <li>Generate the style you want and copy it.</li>
      <li><strong>User Settings → Profile</strong>, paste it into <strong>Display Name</strong>, save.</li>
      <li>For one server only, use <strong>Edit Server Profile</strong> and paste it into the nickname field instead.</li>
    </ol>
    <p class="mood-example">𝗔𝗹𝗲𝘅 · 𝘈𝘭𝘦𝘹 · 𝒜𝓁𝑒𝓍 · ᴀʟᴇx · 𝔄𝔩𝔢𝔵</p>
    <p>Two cautions worth knowing before you commit a name to it. Rarer styles such as fraktur and double-struck can render as empty boxes on devices missing those glyphs — see <a href="/guide/why-fonts-show-as-boxes/">why fonts show as boxes</a>. And screen readers announce these characters awkwardly, which is covered in the <a href="/guide/fancy-fonts-accessibility-guide/">accessibility guide</a>.</p>
  </div>`
    }
  ],
  cta: {
    h3: 'Style your Discord name for free',
    p: 'Generate a Unicode display name that works on any account, in any server, on desktop and mobile — no Nitro, no subscription.',
    href: '/discord/',
    label: 'Open the Discord Font Generator →'
  },
  related: 'Related: <a href="/answers/do-you-need-nitro-for-discord-fonts/">do you need Nitro for Discord fonts</a>, <a href="/answers/discord-allowed-characters/">Discord allowed characters</a>, <a href="/guide/discord-text-formatting-explained/">Discord text formatting explained</a>, and <a href="/guide/discord-safe-name-styling/">Discord-safe name styling</a>.',
  faq: [
    { q: 'What are Discord Display Name Styles?', a: 'They are a paid Discord Nitro feature that restyles your display name with a built-in font, a colour and an animated effect. They apply to the display name only, never to your @username, and you can set a different style for each server through your per-server profile.' },
    { q: 'Do you need Nitro for Discord Display Name Styles?', a: 'Yes. Display Name Styles are a Nitro feature and stop applying if the subscription lapses. Unicode fonts are the free alternative — they are ordinary characters you paste rather than a Discord feature, so they work on free, Classic and Nitro accounts alike.' },
    { q: 'Why does my Display Name Style not show its colour in a server?', a: 'Because your role colour takes precedence inside servers. The font carries over, but the style colour and effect are generally overridden by the server role colour or enhanced role styling. The full style shows on your profile and in DM and group-chat member lists.' },
    { q: 'Why is my Display Name Style not animated on mobile?', a: 'Animation plays on desktop only. On mobile the font, colour and effect still appear, but they render static. Nothing is broken — that is how the feature behaves on phones.' },
    { q: 'Can Display Name Styles change my Discord username?', a: 'No. Only the display name can be styled. The @username stays restricted to lowercase letters, numbers, underscores and periods, and no Nitro feature or Unicode font changes that.' },
    { q: 'Are Unicode fonts better than Nitro Display Name Styles?', a: 'Neither is strictly better — they do different things. Nitro adds colour and animation, which Unicode cannot do at all. Unicode fonts are free, work on every account and device, keep working in server nicknames, About Me, messages and channel names, and paste into other platforms. Many people combine the two.' }
  ]
}

];
