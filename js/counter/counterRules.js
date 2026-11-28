/* ==========================================================
   counterRules.js
   Platform/field character-limit rule table + counting engine for
   UltraTextGen's character counter (/character-counter/).

   The job this serves is not "count my characters" — it is "will my
   text fit where it is going, counted the way THAT destination counts."
   So every rule declares which platform and field it belongs to, what
   its limit is, how that destination counts (`countMode`), and — where
   the platform truncates a post visually long before its hard limit —
   where the reader stops seeing it (`visibleAt`).

   Counting modes:
     "codepoint"  (default) Unicode code points
     "graphemes"  user-perceived characters (Intl.Segmenter): a family emoji
                  or a letter with any number of combining marks is 1
     "utf16"      UTF-16 code units: a character outside the Basic
                  Multilingual Plane (emoji, mathematical bold letters) is 2
     "x-weighted" X/Twitter's published algorithm (twitter-text v3):
                  every URL = 23, weight-1 ranges below, everything else 2
     "gsm"        SMS segments — GSM-7 (160/153) until one character
                  outside the alphabet flips the whole message to UCS-2
                  (70/67), which is why one emoji can double an SMS bill

   Provenance: every rule carries either `source` (the platform's own page)
   and `verified` (the date someone read it), or `unsourced` saying why there
   is none yet. counterRules.test.js fails a rule with neither, so a new limit
   cannot arrive as a bare number. A figure marked unsourced is still shown;
   the field is the backlog for whoever verifies it next.

   `maxBytes` is a second cap some destinations apply on top of the first,
   in UTF-8 bytes. Both bind: the text fits only when it is inside each.

   Rule IDs are STABLE — locale pages map translated strings onto them
   via initChecker's `labels` config, so an id must never be renamed.

   Data:  UltraTextGen.counterRules.LIMITS / .PLATFORMS
   Logic: .analyze(str, limitId) · .measure(str, limitId) · .fitsAll(str)
          analyze() and fitsAll() count in the rule's countMode, exactly as
          measure() does, and also apply its maxBytes cap when it has one.
   UI:    .initChecker(config)
   Counts: UltraTextGen.counterCounts (shared with the page controller),
          including scriptCounts() and segmentedWords() for the Chinese tiles
   ========================================================== */
(function () {
  "use strict";

  const ns = (window.UltraTextGen = window.UltraTextGen || {});

  /* ============================================================
     Counting helpers
     ============================================================ */

  function codePoints(str) {
    return Array.from(str || "").length;
  }

  function utf16Units(str) {
    return (str || "").length;
  }

  function utf8Bytes(str) {
    if (!str) return 0;
    let bytes = 0;
    for (const ch of str) {
      const cp = ch.codePointAt(0);
      if (cp <= 0x7f) bytes += 1;
      else if (cp <= 0x7ff) bytes += 2;
      else if (cp <= 0xffff) bytes += 3;
      else bytes += 4;
    }
    return bytes;
  }

  /* The older Korean convention, EUC-KR / CP949: ASCII is 1 byte and a Hangul
     syllable is 2. Korean application portals that state a limit like "600자 /
     1200바이트" count this way, not in UTF-8 (where a syllable is 3).
     Every code point outside ASCII counts 2, which is exact for Hangul, hanja and
     the symbols CP949 holds. Emoji and other characters CP949 has no code for
     cannot be stored there at all, so a portal's own count for them varies. */
  function hangul2Bytes(str) {
    if (!str) return 0;
    let bytes = 0;
    for (const ch of str) bytes += ch.codePointAt(0) <= 0x7f ? 1 : 2;
    return bytes;
  }

  const graphemeSegmenter = (typeof Intl !== "undefined" && Intl.Segmenter)
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

  function graphemes(str) {
    if (!str) return 0;
    if (!graphemeSegmenter) return codePoints(str);
    let n = 0;
    for (const s of graphemeSegmenter.segment(str)) { void s; n++; }
    return n;
  }

  /** First n graphemes, so a cut never lands inside an emoji or a
      combining sequence — the fold preview must render, not mojibake. */
  function takeGraphemes(str, n) {
    if (!str || n <= 0) return "";
    if (!graphemeSegmenter) return Array.from(str).slice(0, n).join("");
    let out = "", i = 0;
    for (const s of graphemeSegmenter.segment(str)) {
      if (i++ >= n) break;
      out += s.segment;
    }
    return out;
  }

  /* --- X/Twitter weighted counting (twitter-text v3 config) --- */
  const X_URL_WEIGHT = 23;
  const X_LIGHT_RANGES = [
    [0x0000, 0x10ff],
    [0x2000, 0x200d],
    [0x2010, 0x201f],
    [0x2032, 0x2037]
  ];
  const URL_RE = /(?:https?:\/\/|www\.)[^\s]+/gi;

  function xWeight(cp) {
    for (let i = 0; i < X_LIGHT_RANGES.length; i++) {
      if (cp >= X_LIGHT_RANGES[i][0] && cp <= X_LIGHT_RANGES[i][1]) return 1;
    }
    return 2;
  }

  /* X counts one emoji as 2 however it is built: "All emojis count as 2
     characters, regardless of complexity" (docs.x.com/fundamentals/counting-characters,
     read 2026-11-18; twitter-text v3 sets emojiParsingEnabled). Until
     2026-11-18 this summed code points, so a family emoji cost 11, a flag 4
     and a keycap 5, and a post X would accept read as over the limit.
     An emoji here is one grapheme cluster that shows as a picture: it holds a
     character with emoji presentation, or a pictograph with the emoji
     selector, or it is a flag pair or a keycap. A bare text symbol such as
     the copyright sign keeps its code-point weight. */
  let X_EMOJI_RE = null;
  try {
    X_EMOJI_RE = new RegExp("\\p{Emoji_Presentation}|\\p{Extended_Pictographic}\\uFE0F|^[\\u{1F1E6}-\\u{1F1FF}]{2}$|\\u20E3$", "u");
  } catch (e) { /* no Unicode property escapes: the code-point sum stands */ }

  function xWeightedLength(str) {
    if (!str) return 0;
    let total = 0;
    const withoutUrls = str.replace(URL_RE, function () {
      total += X_URL_WEIGHT;
      return "";
    });
    if (graphemeSegmenter && X_EMOJI_RE) {
      for (const part of graphemeSegmenter.segment(withoutUrls)) {
        const g = part.segment;
        if (X_EMOJI_RE.test(g)) { total += 2; continue; }
        for (const ch of g) total += xWeight(ch.codePointAt(0));
      }
      return total;
    }
    for (const ch of withoutUrls) total += xWeight(ch.codePointAt(0));
    return total;
  }

  /* --- Script counts: Chinese characters apart from everything else ---
     A Chinese 字數 is a count of characters, and the reader usually needs the
     Han characters on their own, apart from punctuation, spaces and Latin
     text. The text is walked in graphemes, so a Han character carrying a
     variation selector is one Han character, and an emoji, a flag or a letter
     with a combining mark is one "other" character, never several.
     Whitespace (the full-width space U+3000 included) is in none of the three.
     Only pages that carry the matching tiles call this (added 2026-11-28 for
     /character-counter/chinese/ and /zh-tw/zishu-tongji/), so no other
     counter page computes or shows anything new. */
  let HAN_RE = null;
  try {
    HAN_RE = new RegExp("^\\p{Script=Han}", "u");
  } catch (e) { /* no Unicode property escapes: the ranges below stand */ }

  /* The fallback holds the Han blocks of Unicode 15.1: radicals, the iteration
     and zero marks (々 〇), the unified ideographs with every extension, and
     the compatibility ideographs. */
  const HAN_RANGES = [
    [0x2E80, 0x2FD5], [0x3005, 0x3005], [0x3007, 0x3007], [0x3021, 0x3029], [0x3038, 0x303B],
    [0x3400, 0x4DBF], [0x4E00, 0x9FFF], [0xF900, 0xFAFF], [0x20000, 0x323AF]
  ];

  function isHanGrapheme(g) {
    if (HAN_RE) return HAN_RE.test(g);
    const cp = g.codePointAt(0);
    for (let i = 0; i < HAN_RANGES.length; i++) {
      if (cp >= HAN_RANGES[i][0] && cp <= HAN_RANGES[i][1]) return true;
    }
    return false;
  }

  /* Chinese punctuation: the CJK Symbols and Punctuation block (。、「」『』《》
     〈〉【】〔〕), the vertical, compatibility and small forms, the full-width
     marks (，！？；：（）～), and the marks Chinese typesetting shares with
     English: curly quotes, the dash, the ellipsis and the middle dots. */
  const CJK_SHARED_PUNCT = "\u2018\u2019\u201C\u201D\u2014\u2015\u2026\u00B7\u2027\u2E3A\u2E3B";

  function isChinesePunct(cp) {
    if (cp >= 0x3000 && cp <= 0x303F) return true;
    if (cp >= 0xFE10 && cp <= 0xFE1F) return true;
    if (cp >= 0xFE30 && cp <= 0xFE6F) return true;
    if ((cp >= 0xFF01 && cp <= 0xFF0F) || (cp >= 0xFF1A && cp <= 0xFF20) ||
        (cp >= 0xFF3B && cp <= 0xFF40) || (cp >= 0xFF5B && cp <= 0xFF65)) return true;
    return CJK_SHARED_PUNCT.indexOf(String.fromCodePoint(cp)) !== -1;
  }

  const WHITESPACE_RE = /^\s+$/;

  /** { han, punct, other }: graphemes that are Han characters, Chinese
      punctuation, and everything else that is not whitespace. */
  function scriptCounts(str) {
    const out = { han: 0, punct: 0, other: 0 };
    if (!str) return out;
    const parts = graphemeSegmenter
      ? Array.from(graphemeSegmenter.segment(str), (s) => s.segment)
      : Array.from(str);
    for (const g of parts) {
      if (WHITESPACE_RE.test(g)) continue;
      if (isHanGrapheme(g)) out.han++;
      else if (isChinesePunct(g.codePointAt(0))) out.punct++;
      else out.other++;
    }
    return out;
  }

  /* Words by the browser's own dictionary segmenter, which is the only way to
     count words in a script written without spaces. Returns null where the
     browser has no Intl.Segmenter, so a page can drop the tile rather than
     show a number it cannot back. */
  const wordSegmenters = {};
  function segmentedWords(str, locale) {
    if (typeof Intl === "undefined" || !Intl.Segmenter) return null;
    if (!str || !str.trim()) return 0;
    const key = locale || "";
    try {
      if (!wordSegmenters[key]) wordSegmenters[key] = new Intl.Segmenter(locale || undefined, { granularity: "word" });
      let n = 0;
      for (const part of wordSegmenters[key].segment(str)) if (part.isWordLike) n++;
      return n;
    } catch (e) {
      return null;
    }
  }

  /* --- SMS segment counting (GSM 03.38) --- */
  const GSM_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
  const GSM_EXT = "€~[]{}\\|^\f";

  function gsmInfo(str) {
    const s = str || "";
    let septets = 0;
    let gsmSafe = true;
    const flipChars = [];
    for (const ch of s) {
      if (GSM_BASIC.indexOf(ch) !== -1) {
        septets += 1;
      } else if (GSM_EXT.indexOf(ch) !== -1) {
        septets += 2;
      } else {
        gsmSafe = false;
        if (flipChars.length < 8 && flipChars.indexOf(ch) === -1) flipChars.push(ch);
      }
    }
    const units = utf16Units(s);
    let encoding, perSegment, length, segments;
    if (gsmSafe) {
      encoding = "GSM-7";
      length = septets;
      segments = length === 0 ? 0 : (length <= 160 ? 1 : Math.ceil(length / 153));
      perSegment = segments > 1 ? 153 : 160;
    } else {
      encoding = "UCS-2";
      length = units;
      segments = length === 0 ? 0 : (length <= 70 ? 1 : Math.ceil(length / 67));
      perSegment = segments > 1 ? 67 : 70;
    }
    return { encoding, length, segments, perSegment, flipChars };
  }

  /* ============================================================
     Platforms and their fields

     `visibleAt` = where the platform truncates in the feed, when that
     is meaningfully shorter than the hard limit. It is NOT a limit you
     cannot cross — it is where most readers stop seeing your text.
     ============================================================ */
  const PLATFORMS = [
    { id: "x", label: "X / Twitter" },
    { id: "instagram", label: "Instagram" },
    { id: "tiktok", label: "TikTok" },
    { id: "linkedin", label: "LinkedIn" },
    { id: "youtube", label: "YouTube" },
    { id: "facebook", label: "Facebook" },
    { id: "discord", label: "Discord" },
    { id: "telegram", label: "Telegram" },
    { id: "threads", label: "Threads" },
    { id: "bluesky", label: "Bluesky" },
    { id: "reddit", label: "Reddit" },
    { id: "pinterest", label: "Pinterest" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "vk", label: "VK" },
    { id: "zalo", label: "Zalo" },
    { id: "sms", label: "SMS" },
    { id: "seo", label: "Google search result" }
  ];

  const LIMITS = [
    /* X / Twitter — the only mainstream platform that counts by weight */
    /* 280 weighted, URLs 23, emoji and CJK 2: docs.x.com/fundamentals/counting-characters
       and twitter-text config v3 (maxWeightedTweetLength 280, transformedURLLength 23),
       verified 2026-11-18. Until then this row carried the SMS row's reason by mistake.
       Re-read 2026-11-28 for /x/character-counter/: unchanged. Two known gaps, not
       fixed here because the hub's X count must not move in that change: X
       normalises to NFC before weighing (an accent typed as a separate mark costs
       1 there, 2 here), and X weighs a bare address such as example.com as a
       23-unit link (URL_RE needs http or www.; the X page states this one). */
    { id: "x-post", platform: "x", field: "Post", label: "X / Twitter post", limit: 280, group: "posts", countMode: "x-weighted", source: "https://docs.x.com/fundamentals/counting-characters", verified: "2026-11-28" },
    { id: "x-bio", platform: "x", field: "Bio", label: "X / Twitter bio", limit: 160, group: "bios", unsourced: "no platform page cited yet" },
    { id: "x-name", platform: "x", field: "Display name", label: "X / Twitter display name", limit: 50, group: "usernames", unsourced: "no platform page cited yet" },

    /* 2,200: Instagram's publishing API reference states "Maximum 2200 characters,
       30 hashtags, and 20 @ tags" for a caption, verified 2026-11-18. The 125 fold
       is an observed display cut, not a documented one. */
    { id: "ig-caption", platform: "instagram", field: "Caption", label: "Instagram caption", limit: 2200, group: "posts", visibleAt: 125, source: "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media", verified: "2026-11-18" },
    /* 150: help.instagram.com/728994388226960, verified 2026-09-25. */
    { id: "ig-bio", platform: "instagram", field: "Bio", label: "Instagram bio", limit: 150, group: "bios", source: "https://help.instagram.com/728994388226960", verified: "2026-09-25" },
    { id: "ig-username", platform: "instagram", field: "Username", label: "Instagram username", limit: 30, group: "usernames", unsourced: "Instagram's help pages state no username length (read 2026-11-17); 30 is the figure the app enforces" },
    /* 100 is unsourced: Instagram publishes no alt-text limit, and
       accessibility press reported the cap gone in 2021. Kept as the
       conservative figure until an in-app test settles it. */
    { id: "ig-alt", platform: "instagram", field: "Alt text", label: "Instagram alt text", limit: 100, group: "titles", unsourced: "Instagram publishes no alt-text limit; kept as the conservative figure" },

    /* TikTok caption: 2,200 is the Content Posting API cap ("2200 in UTF-16
       runes", developers.tiktok.com/doc/content-posting-api-reference-direct-post,
       verified 2026-09-25). Creators have reported 4,000 in the app since
       August 2023, but TikTok's help centre states neither, so the lower,
       API-safe number stays until an in-app test settles it. */
    { id: "tiktok-caption", platform: "tiktok", field: "Caption", label: "TikTok caption", limit: 2200, group: "posts", countMode: "utf16", source: "https://developers.tiktok.com/doc/content-posting-api-reference-direct-post", verified: "2026-09-25" },
    /* TikTok bio: 80 is the long-standing figure. Creators reported a
       160-character bio field in Sept/Oct 2025 and TikTok publishes no
       limit, so 80 stays as the figure every account accepts. */
    { id: "tiktok-bio", platform: "tiktok", field: "Bio", label: "TikTok bio", limit: 80, group: "bios", unsourced: "TikTok publishes no bio limit; 80 is the figure every account accepts" },
    /* 2-24: tiktok.com/support/faq_detail?id=7581821550156962315, verified 2026-09-25. */
    { id: "tiktok-username", platform: "tiktok", field: "Username", label: "TikTok username", limit: 24, group: "usernames", source: "https://www.tiktok.com/support/faq_detail?id=7581821550156962315", verified: "2026-09-25" },

    { id: "li-post", platform: "linkedin", field: "Post", label: "LinkedIn post", limit: 3000, group: "posts", visibleAt: 140, foldDesktop: 210, unsourced: "no platform page cited yet" },
    { id: "li-headline", platform: "linkedin", field: "Headline", label: "LinkedIn headline", limit: 220, group: "bios", unsourced: "no platform page cited yet" },
    { id: "li-about", platform: "linkedin", field: "About section", label: "LinkedIn About", limit: 2600, group: "bios", unsourced: "no platform page cited yet" },
    { id: "li-comment", platform: "linkedin", field: "Comment", label: "LinkedIn comment", limit: 1250, group: "posts", unsourced: "no platform page cited yet" },

    /* Title 100, description 5,000: support.google.com/youtube/answer/57404, verified 2026-09-25. */
    { id: "yt-title", platform: "youtube", field: "Video title", label: "YouTube title", limit: 100, group: "titles", source: "https://support.google.com/youtube/answer/57404", verified: "2026-09-25" },
    { id: "yt-description", platform: "youtube", field: "Description", label: "YouTube description", limit: 5000, group: "posts", visibleAt: 157, source: "https://support.google.com/youtube/answer/57404", verified: "2026-09-25" },
    { id: "yt-comment", platform: "youtube", field: "Comment", label: "YouTube comment", limit: 10000, group: "posts", unsourced: "no platform page cited yet" },

    { id: "fb-post", platform: "facebook", field: "Post", label: "Facebook post", limit: 63206, group: "posts", visibleAt: 477, unsourced: "no platform page cited yet" },

    /* 2,000 (4,000 with Nitro): support.discord.com/hc/en-us/articles/33694251638295
       and docs.discord.com/developers/resources/message, verified 2026-09-25. */
    { id: "discord-message", platform: "discord", field: "Message", label: "Discord message", limit: 2000, group: "posts", source: "https://support.discord.com/hc/en-us/articles/33694251638295", verified: "2026-09-25" },
    { id: "discord-nick", platform: "discord", field: "Nickname", label: "Discord nickname", limit: 32, group: "usernames", unsourced: "no platform page cited yet" },
    { id: "discord-status", platform: "discord", field: "Custom status", label: "Discord custom status", limit: 128, group: "bios", unsourced: "no platform page cited yet" },

    /* Telegram is the one platform here where the message limit depends on
       what the sender pays. 4096 is still the number for everyone on a free
       account. Telegram's Rich Text Editor, announced 2026-07-14 and gated
       to Premium, raises a single message to 32,768 — so the free figure is
       not wrong, it is just eight times short for a paying sender. Both are
       listed rather than replacing one with the other, because a writer
       picking "Telegram message" needs to know which of the two they are
       actually writing against. */
    { id: "telegram-message", platform: "telegram", field: "Message", label: "Telegram message", limit: 4096, group: "posts", unsourced: "no platform page cited yet" },
    /* 32,768: telegram.org/blog/communities-editor-invisible-messages, verified 2026-09-25. */
    { id: "telegram-message-premium", platform: "telegram", field: "Message (Premium)", label: "Telegram message (Premium)", limit: 32768, group: "posts", source: "https://telegram.org/blog/communities-editor-invisible-messages", verified: "2026-09-25" },
    /* Caption 1,024 and bio 70 are the free-account defaults in
       core.telegram.org/api/config (Premium: 4,096 and 140), verified 2026-09-25. */
    { id: "telegram-caption", platform: "telegram", field: "Photo/video caption", label: "Telegram photo/video caption", limit: 1024, group: "posts", source: "https://core.telegram.org/api/config", verified: "2026-09-25" },
    { id: "telegram-bio", platform: "telegram", field: "Bio", label: "Telegram bio", limit: 70, group: "bios", source: "https://core.telegram.org/api/config", verified: "2026-09-25" },

    /* 500: developers.facebook.com/docs/threads/posts, which adds "emojis are
       counted as the number of UTF-8 bytes" (so one emoji costs 4 or more).
       Not modelled yet: this rule counts an emoji as 1 code point, so an
       emoji-heavy post can read as fitting when Threads would refuse it. */
    { id: "threads-post", platform: "threads", field: "Post", label: "Threads post", limit: 500, group: "posts", source: "https://developers.facebook.com/docs/threads/posts", verified: "2026-09-25" },
    { id: "threads-bio", platform: "threads", field: "Bio", label: "Threads bio", limit: 150, group: "bios", unsourced: "no platform page cited yet" },

    /* Bluesky is the one platform that counts what you actually see: the
       AT Protocol lexicon caps a post at 300 *graphemes* (and a profile
       description at 256), so a family emoji built from a 7-code-point ZWJ
       sequence costs 1, not 7. */
    /* Both confirmed in the lexicons (app.bsky.feed.post, app.bsky.actor.profile)
       in github.com/bluesky-social/atproto, verified 2026-09-25. The same
       lexicons give each field a second cap in UTF-8 bytes (post text
       maxLength 3000, profile description maxLength 2560), read in the
       published @atproto/api 0.30.0 lexicons on 2026-11-07. Both caps bind:
       a letter carrying a stack of combining marks is 1 grapheme and dozens
       of bytes, so zalgo text hits the byte cap long before 300. */
    { id: "bluesky-post", platform: "bluesky", field: "Post", label: "Bluesky post", limit: 300, maxBytes: 3000, group: "posts", countMode: "graphemes", source: "https://github.com/bluesky-social/atproto", verified: "2026-11-07" },
    { id: "bluesky-bio", platform: "bluesky", field: "Bio", label: "Bluesky bio", limit: 256, maxBytes: 2560, group: "bios", countMode: "graphemes", source: "https://github.com/bluesky-social/atproto", verified: "2026-11-07" },

    { id: "reddit-title", platform: "reddit", field: "Post title", label: "Reddit post title", limit: 300, group: "posts", unsourced: "no platform page cited yet" },
    { id: "reddit-comment", platform: "reddit", field: "Comment", label: "Reddit comment", limit: 10000, group: "posts", unsourced: "no platform page cited yet" },

    /* Description 800, title 100: help.pinterest.com/en/article/review-pin-specs
       ("Enter up to 800 characters.") and the v5 API schema (description
       maxLength 800), verified 2026-11-07. 500 is the profile bio and pin
       alt text limit, which this row carried until then. */
    { id: "pinterest-description", platform: "pinterest", field: "Pin description", label: "Pinterest pin description", limit: 800, group: "posts", source: "https://help.pinterest.com/en/article/review-pin-specs", verified: "2026-11-07" },
    { id: "pinterest-title", platform: "pinterest", field: "Pin title", label: "Pinterest pin title", limit: 100, group: "titles", source: "https://help.pinterest.com/en/article/review-pin-specs", verified: "2026-11-07" },

    /* 50: faq.whatsapp.com/752120927696324 ("Your WhatsApp About can include
       an emoji and up to 50 characters of text"), verified 2026-11-15. The
       About now expires after a chosen duration and its emoji is picked
       separately, so 50 is the text field; 139 was the old About limit. */
    { id: "whatsapp-about", platform: "whatsapp", field: "About", label: "WhatsApp About", limit: 50, group: "bios", source: "https://faq.whatsapp.com/752120927696324", verified: "2026-11-15" },

    { id: "vk-status", platform: "vk", field: "Status", label: "VK status", limit: 140, group: "bios", unsourced: "no platform page cited yet" },

    { id: "zalo-post", platform: "zalo", field: "Post/status", label: "Zalo post/status", limit: 2000, group: "posts", unsourced: "no platform page cited yet" },

    { id: "sms", platform: "sms", field: "Text message", label: "SMS text message", limit: 160, group: "titles", countMode: "gsm", unsourced: "GSM 03.38 segment sizes (160 GSM-7 / 70 UCS-2; 153 / 67 per part of a longer message), a telecom standard rather than a platform page" },

    { id: "meta-title", platform: "seo", field: "Page title", label: "SEO meta title", limit: 60, group: "titles", unsourced: "a display guideline, not a hard limit: Google cuts titles by pixel width" },
    { id: "meta-description", platform: "seo", field: "Meta description", label: "SEO meta description", limit: 155, group: "titles", unsourced: "a display guideline, not a hard limit: Google cuts snippets by pixel width" }
  ];

  const DEFAULT_GROUPS = {
    posts: "Posts",
    bios: "Bios & profiles",
    usernames: "Usernames",
    titles: "Titles & meta"
  };

  /* ============================================================
     analyze / measure
     ============================================================ */
  /* A limit the visitor states: an application box, a job form, a client's
     brief, a database column. No table can list those, and the forms that
     hold them rarely say how they count, so the visitor also picks the unit.
     Kept OUT of LIMITS on purpose: LIMITS is the table of published platform
     claims that the pages count and cite, and this is not one of them. */
  const CUSTOM_ID = "custom";
  const CUSTOM_MODES = ["codepoint", "nospace", "utf8"];
  const CUSTOM_MAX = 10000000;
  const customRule = { id: CUSTOM_ID, platform: CUSTOM_ID, field: "Your own limit", label: "Your own limit",
    limit: 1000, group: "titles", countMode: "codepoint", custom: true };

  /** Sets the visitor's own limit. Returns the rule, or null when `limit` is not a whole number from 1 up. */
  function setCustomLimit(limit, mode) {
    const n = Math.floor(Number(limit));
    if (!Number.isFinite(n) || n < 1 || n > CUSTOM_MAX) return null;
    customRule.limit = n;
    if (CUSTOM_MODES.indexOf(mode) !== -1) customRule.countMode = mode;
    return customRule;
  }

  function ruleById(limitId) {
    if (limitId === CUSTOM_ID) return customRule;
    return LIMITS.find((r) => r.id === limitId) || LIMITS[0];
  }

  /** Length of `str` in the unit `limitId`'s destination actually counts. */
  function measure(str, limitId) {
    const rule = ruleById(limitId);
    const mode = rule.countMode || "codepoint";
    if (mode === "gsm") return gsmInfo(str || "").length;
    if (mode === "x-weighted") return xWeightedLength(str || "");
    if (mode === "graphemes") return graphemes(str || "");
    if (mode === "utf16") return utf16Units(str || "");
    if (mode === "utf8") return utf8Bytes(str || "");
    if (mode === "nospace") return codePoints((str || "").replace(/\s/g, ""));
    return codePoints(str || "");
  }

  function analyze(str, limitId) {
    const rule = ruleById(limitId);
    const mode = rule.countMode || "codepoint";
    const report = { rule, mode, limit: rule.limit };

    if (mode === "gsm") {
      const info = gsmInfo(str || "");
      report.glyphs = info.length;
      report.limit = info.perSegment;
      report.fits = info.segments <= 1;
      report.remaining = info.perSegment * Math.max(1, info.segments) - info.length;
      report.sms = info;
      return report;
    }

    report.glyphs = measure(str, rule.id);
    report.fits = report.glyphs <= rule.limit;
    report.remaining = rule.limit - report.glyphs;

    if (rule.maxBytes) {
      report.bytes = utf8Bytes(str || "");
      report.maxBytes = rule.maxBytes;
      const bytesOver = report.bytes > rule.maxBytes;
      /* `remaining` follows the cap that actually refuses the text, so the
         "over by" figure is never 0 on a post that will not send. */
      report.binding = bytesOver && report.fits ? "bytes" : "limit";
      if (bytesOver) {
        report.fits = false;
        if (report.binding === "bytes") report.remaining = rule.maxBytes - report.bytes;
      }
    }
    return report;
  }

  /** Every rule with a fits/over verdict — powers the "fits everywhere" grid. */
  function fitsAll(str) {
    return LIMITS.map((rule) => {
      const r = analyze(str, rule.id);
      return { rule, fits: r.fits, used: r.glyphs, limit: r.limit, remaining: r.remaining };
    });
  }

  /**
   * The fold — the second budget.
   *
   * A feed post has two numbers that matter, and the one everybody tracks is
   * the less important one. The hard limit decides whether the post SENDS;
   * the fold decides whether anyone READS it. LinkedIn will happily accept
   * 3,000 characters and then show ~140 of them on a phone behind "see more".
   * For anyone writing a hook, the fold IS the limit.
   *
   * Measured in graphemes, because this is about what the reader's screen
   * shows, not how the backend stores it. Returns null for destinations that
   * don't truncate (a username, an SMS, an X post that fits whole).
   *
   * Honest about its own precision: these are community-measured observations
   * of a UI, not published API limits, and platforms also fold on line COUNT
   * (a few early line breaks can cut a post short of any character number).
   * Treat as "what reliably shows", which is how the page frames it.
   */
  function foldInfo(str, limitId) {
    const rule = ruleById(limitId);
    if (!rule.visibleAt) return null;
    const s = str || "";
    const at = rule.visibleAt;
    const total = graphemes(s);
    return {
      rule: rule,
      at: at,
      desktop: rule.foldDesktop || null,
      /* Digits only — this string is dropped into each locale's own
         translated sentence, so it must carry no English. */
      label: rule.foldDesktop ? at + "–" + rule.foldDesktop : String(at),
      total: total,
      shown: Math.min(total, at),
      hidden: Math.max(0, total - at),
      remaining: at - total,
      truncated: total > at,
      preview: takeGraphemes(s, at),
      /* What the fold costs you on the far side of the cut. */
      hiddenText: total > at ? s.slice(takeGraphemes(s, at).length) : ""
    };
  }

  /** Every destination that folds, and whether this text survives its fold. */
  function foldsAll(str) {
    return LIMITS.filter((r) => r.visibleAt).map((r) => foldInfo(str, r.id));
  }

  /* ============================================================
     Checker UI — target first, two tiers (platform → field)
     ============================================================ */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function fmt(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  }

  /** "120 / 300", plus "· 2,840 / 3,000 UTF-8" on a rule with a byte cap.
      Digits and the encoding name only: locale pages show it as it is. */
  function countLabel(report) {
    let s = report.glyphs.toLocaleString() + " / " + report.limit.toLocaleString();
    if (report.maxBytes) s += " · " + report.bytes.toLocaleString() + " / " + report.maxBytes.toLocaleString() + " UTF-8";
    return s;
  }

  /** How full the field is, on whichever cap is closer. */
  function fillRatio(report) {
    const r = report.limit ? report.glyphs / report.limit : 0;
    return report.maxBytes ? Math.max(r, report.bytes / report.maxBytes) : r;
  }

  function initChecker(config) {
    const cfg = config || {};
    const mount = document.getElementById(cfg.mount);
    if (!mount) return null;

    const text = cfg.text || {};
    const labels = cfg.labels || {};
    const fieldLabels = cfg.fields || {};
    const platformLabels = cfg.platforms || {};
    /* The own-limit option appears only where the page supplies its strings
       (`custom`), so a translated page never shows it in English. */
    const customText = cfg.custom && cfg.custom.name ? cfg.custom : null;
    const known = (id) => LIMITS.some((r) => r.id === id) || (id === CUSTOM_ID && !!customText);
    const start = cfg.selected && known(cfg.selected) ? cfg.selected : LIMITS[0].id;
    const state = { limitId: start };

    mount.innerHTML = "";
    mount.classList.add("cc-checker");

    if (text.label) mount.appendChild(el("div", "cc-label", text.label));

    const row = el("div", "cc-selects");

    const platformSelect = document.createElement("select");
    platformSelect.className = "cc-select";
    platformSelect.setAttribute("aria-label", text.platformLabel || "Platform");
    PLATFORMS.forEach((p) => {
      if (!LIMITS.some((r) => r.platform === p.id)) return;
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = platformLabels[p.id] || p.label;
      platformSelect.appendChild(opt);
    });

    const fieldSelect = document.createElement("select");
    fieldSelect.className = "cc-select";
    fieldSelect.setAttribute("aria-label", text.fieldLabel || "Field");

    row.appendChild(platformSelect);
    row.appendChild(fieldSelect);
    mount.appendChild(row);

    /* The own-limit controls: a number and the unit it is counted in. */
    let customRow = null;
    let customInput = null;
    let customMode = null;
    if (customText) {
      const opt = document.createElement("option");
      opt.value = CUSTOM_ID;
      opt.textContent = customText.name;
      platformSelect.appendChild(opt);

      customRow = el("div", "cc-selects cc-custom");
      customRow.hidden = true;
      customInput = document.createElement("input");
      customInput.type = "number";
      customInput.className = "cc-select cc-custom-limit";
      customInput.min = "1";
      customInput.step = "1";
      customInput.inputMode = "numeric";
      customInput.setAttribute("aria-label", customText.limitLabel || customText.name);
      customMode = document.createElement("select");
      customMode.className = "cc-select";
      customMode.setAttribute("aria-label", customText.modeLabel || customText.name);
      CUSTOM_MODES.forEach((m) => {
        const o = document.createElement("option");
        o.value = m;
        o.textContent = (customText.modes && customText.modes[m]) || m;
        customMode.appendChild(o);
      });
      /* The limit is remembered on this device only. It is a number and a
         unit, never the visitor's text. */
      try {
        const saved = JSON.parse(window.localStorage.getItem("utg.counter.ownLimit") || "null");
        if (saved) setCustomLimit(saved.limit, saved.mode);
      } catch (e) { /* storage blocked: the default stands */ }
      customInput.value = String(customRule.limit);
      customMode.value = customRule.countMode;
      customRow.appendChild(customInput);
      customRow.appendChild(customMode);
      mount.appendChild(customRow);
    }

    const meta = el("div", "cc-meta");
    const badge = el("span", "cc-badge");
    const count = el("span", "cc-count");
    meta.appendChild(badge);
    meta.appendChild(count);
    mount.appendChild(meta);

    const bar = el("div", "cc-bar");
    const fill = el("div", "cc-bar-fill");
    /* A tick on the bar where the feed truncates. Without it the bar answers
       only "will this send", which on a 3,000-character field is a question
       nobody is asking. */
    const foldMark = el("span", "cc-bar-fold");
    foldMark.hidden = true;
    bar.appendChild(fill);
    bar.appendChild(foldMark);
    mount.appendChild(bar);

    const note = el("div", "cc-note");
    note.hidden = true;
    mount.appendChild(note);

    const input = cfg.inputId ? document.getElementById(cfg.inputId) : null;

    function fieldsFor(platformId) {
      return LIMITS.filter((r) => r.platform === platformId);
    }

    function paintFields(platformId, preferId) {
      if (customRow) customRow.hidden = platformId !== CUSTOM_ID;
      if (platformId === CUSTOM_ID) {
        fieldSelect.innerHTML = "";
        fieldSelect.hidden = true;
        state.limitId = CUSTOM_ID;
        return;
      }
      fieldSelect.innerHTML = "";
      const fields = fieldsFor(platformId);
      fields.forEach((r) => {
        const opt = document.createElement("option");
        opt.value = r.id;
        const name = fieldLabels[r.id] || labels[r.id] || r.field;
        opt.textContent = name + " · " + r.limit.toLocaleString();
        fieldSelect.appendChild(opt);
      });
      const pick = fields.some((r) => r.id === preferId) ? preferId : (fields[0] && fields[0].id);
      if (pick) {
        fieldSelect.value = pick;
        state.limitId = pick;
      }
      fieldSelect.hidden = fields.length < 2;
    }

    function emitChange() {
      mount.dispatchEvent(new CustomEvent("utg:counterlimitchange", {
        bubbles: true,
        detail: { limitId: state.limitId, rule: ruleById(state.limitId) }
      }));
    }

    function render() {
      const value = input ? input.value : "";
      const report = analyze(value, state.limitId);
      const rule = report.rule;

      /* Three states, not two. "Fits" and "over the limit" leave out the one
         that matters most on a feed field: it will post, and almost nobody
         will read past the cut. That gets its own amber state rather than a
         green tick and a footnote. */
      const fold = foldInfo(value, state.limitId);
      const pastFold = !!(fold && fold.truncated && report.fits);
      const status = report.glyphs === 0 ? "empty" : !report.fits ? "fail" : pastFold ? "warn" : "ok";
      badge.className = "cc-badge cc-badge-" + status;
      badge.textContent = status === "empty" ? ""
        : status === "fail" ? (text.fail || "Over the limit ✕")
        : status === "warn" ? fmt(text.pastFold || "Fits — cut at {n} ⚠", { n: fold.at })
        : (text.ok || "Fits ✓");

      count.textContent = countLabel(report);
      count.classList.toggle("is-over", !report.fits);

      const pct = Math.min(100, fillRatio(report) * 100);
      fill.style.width = pct + "%";
      fill.classList.toggle("is-over", !report.fits);
      fill.classList.toggle("is-past-fold", pastFold);
      fill.classList.toggle("is-close", report.fits && !pastFold && pct >= 90);

      if (fold && rule.limit) {
        foldMark.hidden = false;
        foldMark.style.left = Math.min(100, (fold.at / rule.limit) * 100) + "%";
        foldMark.title = fold.label;
      } else {
        foldMark.hidden = true;
      }

      const notes = [];
      if (report.mode === "x-weighted" && report.glyphs > 0) {
        notes.push(text.xNote || "Counted the way X counts: every URL = 23, and most symbols, emoji, and styled Unicode letters = 2 each.");
      }
      if (report.mode === "gsm" && report.sms && report.sms.segments > 0) {
        const sms = report.sms;
        let s = fmt(text.smsSegments || "{n} SMS segment(s) · {per} characters per segment ({enc})",
          { n: sms.segments, per: sms.perSegment, enc: sms.encoding });
        if (sms.encoding === "UCS-2" && sms.flipChars.length) {
          s += " — " + fmt(text.smsUnicode || "switched to Unicode mode by: {chars}", { chars: sms.flipChars.join(" ") });
        }
        notes.push(s);
      }
      if (rule.visibleAt && report.glyphs > rule.visibleAt) {
        /* `visibleAtLabel` is deliberately digits-only (e.g. "140–210") rather
           than prose: it is substituted into every locale's own translated
           visibleNote, so anything wordier would leak English onto 14
           translated pages. */
        notes.push(fmt(text.visibleNote || "Only about the first {n} characters show before it is truncated — put what matters first.",
          { n: foldInfo(value, state.limitId).label }));
      }
      note.textContent = notes.join(" ");
      note.hidden = notes.length === 0;
    }

    platformSelect.addEventListener("change", function () {
      paintFields(platformSelect.value);
      render();
      emitChange();
    });
    fieldSelect.addEventListener("change", function () {
      state.limitId = fieldSelect.value;
      render();
      emitChange();
    });
    if (customInput) {
      const applyCustom = function () {
        if (!setCustomLimit(customInput.value, customMode.value)) return;
        try {
          window.localStorage.setItem("utg.counter.ownLimit",
            JSON.stringify({ limit: customRule.limit, mode: customRule.countMode }));
        } catch (e) { /* storage blocked: the limit still applies to this visit */ }
        render();
        emitChange();
      };
      customInput.addEventListener("input", applyCustom);
      customMode.addEventListener("change", applyCustom);
    }
    if (input) input.addEventListener("input", render);

    const startRule = ruleById(state.limitId);
    platformSelect.value = startRule.platform;
    paintFields(startRule.platform, startRule.id);
    render();

    return {
      render,
      getLimitId: () => state.limitId,
      getRule: () => ruleById(state.limitId),
      setLimitId(id) {
        if (!known(id)) return;
        const r = ruleById(id);
        platformSelect.value = r.platform;
        paintFields(r.platform, id);
        render();
        emitChange();
      },
      element: mount
    };
  }

  ns.counterCounts = {
    codePoints, utf16Units, utf8Bytes, hangul2Bytes, graphemes, takeGraphemes, xWeightedLength, gsmInfo,
    scriptCounts, segmentedWords
  };
  ns.counterRules = {
    LIMITS, PLATFORMS, DEFAULT_GROUPS,
    analyze, measure, fitsAll, foldInfo, foldsAll, ruleById, initChecker, countLabel, fillRatio,
    CUSTOM_ID, CUSTOM_MODES, setCustomLimit
  };
})();
