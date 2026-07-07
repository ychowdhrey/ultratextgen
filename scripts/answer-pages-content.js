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
}

];
