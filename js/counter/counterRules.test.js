/* ==========================================================
   counterRules.test.js
   Assertions for the pure half of the counter: the counting modes, the
   GSM-7 encoding flips per language, every reducer, trimToFit's boundary
   behaviour, and the integrity of the LIMITS table itself.

   No DOM, no dependencies, no runner:
       node js/counter/counterRules.test.js
   Exits non-zero on the first failure, and prints every assertion.

   The DOM half — picker, live count, inspect line, fix bar, undo, fit grid
   — lives in counter.test.html, because it needs a real browser.

   This file exists because a page whose entire value proposition is
   numerical correctness had shipped a wrong number: Bluesky was billing
   code points while the page's own reference table said graphemes, so a
   family emoji cost 7 instead of 1. A visual check never catches that.
   ========================================================== */
const fs = require("fs");
global.window = {};
new Function(fs.readFileSync(__dirname + "/counterRules.js","utf8"))();
new Function(fs.readFileSync(__dirname + "/counterReduce.js","utf8"))();
const { counterRules: R, counterCounts: C, counterReduce: D } = window.UltraTextGen;

let fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log((ok ? "PASS " : "FAIL ") + name + "  got=" + JSON.stringify(got) + (ok ? "" : " want=" + JSON.stringify(want)));
};

// --- counting modes ---
t("x-weighted: url = 23", R.measure("https://example.com/a/very/long/path/indeed", "x-post"), 23);
t("x-weighted: emoji = 2", R.measure("🙂", "x-post"), 2);
t("x-weighted: ascii = 1", R.measure("hello", "x-post"), 5);
t("bluesky counts graphemes", R.measure("👨‍👩‍👧‍👦", "bluesky-post"), 1);
t("utf8 bytes of CJK", C.utf8Bytes("漢字"), 6);
t("utf16 of styled letter", C.utf16Units("𝗔"), 2);

// --- Korean portal byte convention (Hangul = 2, ASCII = 1; the older EUC-KR / CP949 way) ---
t("hangul2: syllables are 2", C.hangul2Bytes("한글"), 4);
t("hangul2: ascii and space are 1", C.hangul2Bytes("ab 1"), 4);
t("hangul2: mixed", C.hangul2Bytes("자기소개서 AB 12"), 5 * 2 + 1 + 2 + 1 + 2);
t("hangul2: empty and nullish", [C.hangul2Bytes(""), C.hangul2Bytes(null), C.hangul2Bytes(undefined)], [0, 0, 0]);
t("hangul2: one code point outside the BMP counts once (2), not per surrogate", C.hangul2Bytes("𝗔"), 2);
t("hangul2: hanja are 2", C.hangul2Bytes("漢字"), 4);
t("hangul2: 600 syllables are 1200 bytes", C.hangul2Bytes("가".repeat(600)), 1200);
t("utf8 of hangul unchanged (3 per syllable)", C.utf8Bytes("한글"), 6);

// --- SMS ---
const gsmPlain = C.gsmInfo("Hello there, this is a plain message.");
t("plain sms is GSM-7", gsmPlain.encoding, "GSM-7");
t("plain sms 1 segment", gsmPlain.segments, 1);
const gsmEmoji = C.gsmInfo("Hello 🙂");
t("emoji flips to UCS-2", gsmEmoji.encoding, "UCS-2");
t("umlaut stays GSM-7", C.gsmInfo("Grüße schön").encoding, "GSM-7");
t("cyrillic flips to UCS-2", C.gsmInfo("Привет").encoding, "UCS-2");
t("polish diacritic flips", C.gsmInfo("zażółć").encoding, "UCS-2");

// --- reducers ---
t("toPlain: styled -> ascii", D.toPlain("𝗕𝗼𝗹𝗱 𝓼𝓬𝓻𝓲𝓹𝓽"), "Bold script");
t("toPlain: keeps accents", D.toPlain("café niño"), "café niño");
t("toPlain: keeps CJK", D.toPlain("漢字テスト"), "漢字テスト");
t("toPlain: small caps", D.toPlain("ʜᴇʟʟᴏ"), "hello");
t("gsmSafe recovers GSM-7", C.gsmInfo(D.gsmSafe("“Hello” — it’s 🙂 fine")).encoding, "GSM-7");

// --- R-02: fancy -> plain is offered on code-point destinations too ---
// A styled letter is one code point, so the saving there is 0; before this the
// button was hidden on 15 of 17 destination families while the page reported
// "N styled Unicode letters".
(function () {
  const styledName = "𝗕𝗼𝗹𝗱 𝓃𝒶𝓂𝑒";
  const ids = R.LIMITS ? R.LIMITS.map(l => l.id) : [];
  let missing = ids.filter(id => !D.suggest(styledName, id).some(s => s.id === "plain"));
  t("plain offered on every destination for styled text", missing, []);
  t("plain never offered on plain ASCII", ids.filter(id => D.suggest("plain name", id).some(s => s.id === "plain")), []);
  t("plain saving is never negative", ids.every(id => D.suggest(styledName, id).every(s => s.saved >= 0)), true);
})();

// --- suggest() only offers real savings ---
const sug = D.suggest("Just plain ascii text with no problems at all.", "x-post");
t("clean text: no suggestions", sug.length, 0);
const sug2 = D.suggest("𝗕𝗼𝗹𝗱 text 🙂  with  gaps #tag", "x-post").map(s => s.id + ":" + s.saved);
console.log("     suggestions on messy text ->", sug2.join(", "));
t("messy text: every saving > 0", sug2.every(s => Number(s.split(":")[1]) > 0), true);

// --- trimToFit ---
const long = "word ".repeat(120).trim();          // 599 chars
const trimmed = D.trimToFit(long, "x-post", { ellipsis: true });
t("trim gets under 280", R.measure(trimmed, "x-post") <= 280, true);
t("trim stays close to 280", R.measure(trimmed, "x-post") > 260, true);
t("trim ends on word boundary", /(\w|…)$/.test(trimmed) && !/wor…$/.test(trimmed), true);
t("trim is a prefix of input", long.startsWith(trimmed.replace(/…$/, "").trim()), true);
t("trim leaves short text alone", D.trimToFit("short", "x-post", {}), "short");
const oneWord = "a".repeat(60);
t("trim cuts inside a single overlong word", D.trimToFit(oneWord, "x-name", {}).length <= 50, true);

// --- inspect ---
const ins = D.inspect("𝗔𝗕 ​ ń");
t("inspect finds styled", ins.styled, 2);
t("inspect finds invisible", ins.invisible, 1);
t("inspect finds combining", ins.combining, 1);

// --- the fold (the second budget) ---
const f1 = R.foldInfo("a".repeat(200), "li-post");
t("fold: cut point is the mobile fold", f1.at, 140);
t("fold: desktop fold reported too", f1.desktop, 210);
t("fold: label is digits only (no English to leak into locales)", /^[0-9\u2013-]+$/.test(f1.label), true);
t("fold: label spans both devices", f1.label, "140\u2013210");
t("fold: shown/hidden split", [f1.shown, f1.hidden, f1.truncated], [140, 60, true]);
t("fold: preview is exactly the visible part", f1.preview, "a".repeat(140));
t("fold: hiddenText is the rest, losslessly", f1.preview + f1.hiddenText, "a".repeat(200));
const f2 = R.foldInfo("short", "li-post");
t("fold: under the cut reports remaining", [f2.truncated, f2.remaining], [false, 135]);
t("fold: no fold on a username", R.foldInfo("x".repeat(50), "ig-username"), null);
t("fold: no fold on an X post", R.foldInfo("x".repeat(50), "x-post"), null);
t("fold: single-fold platform has no desktop split", R.foldInfo("x".repeat(200), "ig-caption").desktop, null);
t("fold: instagram cuts at 125", R.foldInfo("x".repeat(200), "ig-caption").at, 125);
// the cut must never split a grapheme cluster
const fam = "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}";
const f3 = R.foldInfo(fam.repeat(200), "li-post");
t("fold: cuts on grapheme boundaries", f3.preview, fam.repeat(140));
t("fold: grapheme cut is lossless", f3.preview + f3.hiddenText, fam.repeat(200));
t("foldsAll covers exactly the folding rules",
  R.foldsAll("hi").length, R.LIMITS.filter((r) => r.visibleAt).length);
t("foldsAll entries all carry their rule", R.foldsAll("hi").every((f) => f && f.rule && f.rule.id), true);

// --- rule table integrity ---
const ids = R.LIMITS.map(r => r.id);
t("no duplicate rule ids", ids.length, new Set(ids).size);
t("every rule has a live platform", R.LIMITS.every(r => R.PLATFORMS.some(p => p.id === r.platform)), true);
t("every platform has >=1 rule", R.PLATFORMS.every(p => R.LIMITS.some(r => r.platform === p.id)), true);
t("every rule has a positive limit", R.LIMITS.every(r => r.limit > 0), true);
t("fitsAll covers every rule", R.fitsAll("hi").length, R.LIMITS.length);
/* The picker is two-tier (platform -> field), so two rules sharing one
   (platform, field) pair would make the second unreachable in the UI. */
const pf = R.LIMITS.map(r => r.platform + " " + r.field);
t("no duplicate platform+field pair", pf.length, new Set(pf).size);

// --- Telegram's paid tier (Rich Text Editor, 2026-07-14) ---
const tgFree = R.LIMITS.find(r => r.id === "telegram-message");
const tgPrem = R.LIMITS.find(r => r.id === "telegram-message-premium");
t("telegram free message stays 4096", tgFree.limit, 4096);
t("telegram premium message is 32768", tgPrem.limit, 32768);
t("telegram premium is exactly 8x free", tgPrem.limit / tgFree.limit, 8);

/* Hidden-character list: which invisible character, and where. The cases are
   the ones people search for: a narrow no-break space a chat model wrote for
   a space, a CHAR(160) in a spreadsheet cell, a zero-width space in code. */
const hid = (str) => D.listHidden(str).map(h => h.code + "@" + h.line + ":" + h.col);
t("hidden: narrow no-break space located", hid("a\u202Fb"), ["U+202F@1:2"]);
t("hidden: zero width space on line 2", hid("x\ny\u200Bz"), ["U+200B@2:2"]);
t("hidden: plain text has none", hid("plain text, 2 lines\nok"), []);
t("hidden: emoji joiner is not listed", hid("👨\u200D👩\u200D👧"), []);
t("hidden: stray joiner is listed", hid("a\u200Db"), ["U+200D@1:2"]);
t("hidden: braille blank and hangul filler", hid("\u2800\u3164"), ["U+2800@1:1", "U+3164@1:2"]);
t("hidden: kinds", D.listHidden("\u00A0\u200B\u202E").map(h => h.kind), ["space", "invisible", "direction"]);
t("clean: odd spaces become spaces, the rest go", D.cleanHidden("a\u00A0b\u202Fc\u200Bd\u202Ee"), "a b cde");
t("clean: emoji joiner kept", D.cleanHidden("👨\u200D👩"), "👨\u200D👩");

/* The "remove invisible characters" button, the inspect chip and the hidden
   list used to disagree: the button knew 13 code points, the list knew 39.
   Every invisible and direction entry of HIDDEN must now be stripped, and the
   things that must NOT go (emoji joiner, braille word space) must stay. */
const stripInv = D.TRANSFORMS.find(x => x.id === "invisible").fn;
const hiddenCps = [0x00AD, 0x034F, 0x061C, 0x115F, 0x1160, 0x17B4, 0x17B5, 0x180E, 0x200B, 0x200C,
  0x200E, 0x200F, 0x202A, 0x202B, 0x202C, 0x202D, 0x202E, 0x2060, 0x2061, 0x2062, 0x2063, 0x2064,
  0x2066, 0x2067, 0x2068, 0x2069, 0x2800, 0x3164, 0xFEFF, 0xFFA0];
t("invisible: every invisible/direction code point is stripped",
  hiddenCps.filter(cp => stripInv("a" + String.fromCodePoint(cp) + "b") !== "ab").map(cp => cp.toString(16)), []);
t("invisible: inspect counts the same set", D.inspect("a\u200Eb\u2062c\u061C").invisible, 3);
t("invisible: emoji joiner kept", stripInv("👨\u200D👩"), "👨\u200D👩");
t("invisible: braille word space kept beside braille cells", stripInv("\u2801\u2800\u2803"), "\u2801\u2800\u2803");
t("invisible: blank-name U+2800 alone is stripped", stripInv("a\u2800"), "a");

/* trimToFit cuts on a user-perceived character. A code-point cut left
   a family emoji ending in a dangling joiner, and split flags. */
const family = "👨\u200D👩\u200D👧\u200D👦";
const cut = D.trimToFit(family.repeat(3), "discord-nick", { limit: 9 });
t("trim: never ends on a joiner", /\u200D$/.test(cut), false);
t("trim: only whole family emoji remain", cut.length % family.length, 0);
const flags = D.trimToFit("🇫🇷🇩🇪🇯🇵🇧🇷🇺🇸", "discord-nick", { limit: 5 });
t("trim: flag pairs stay whole", Array.from(flags).length % 2, 0);

/* SMS: accents that GSM-7 lacks fold to plain letters only when that brings the
   text back to 160 per segment; accents GSM-7 has are never touched. */
const smsOffer = (txt) => D.suggest(txt, "sms").find(x => x.id === "gsm-safe");
t("sms: Polish text gets the SMS-safe offer", smsOffer("Zażółć gęślą jaźń").result, "Zazolc gesla jazn");
t("sms: offer returns to one GSM-7 segment", smsOffer("Zażółć gęślą jaźń").segmentsAfter, 1);
t("sms: Czech, Turkish, Vietnamese fold", [D.gsmSafe("říšžťčýů"), D.gsmSafe("Şçığ"), D.gsmSafe("áạ")], ["risztcyu", "Scig", "aa"]);
t("sms: GSM-7 accents survive, others fold", D.gsmSafe("café Ñandú über crème ù ł"), "café Ñandu über crème ù l");
t("sms: text already GSM-7 is never folded", D.gsmSafe("café über"), "café über");
t("sms: a disclosed fold says so", /spelling/.test(smsOffer("Zażółć gęślą jaźń").hint), true);
t("sms: curly quotes still fixed with no fold", smsOffer("Hello \u201Cworld\u201D \ud83d\ude00").hint.indexOf("spelling"), -1);

/* Word count for scripts written without spaces: sliced out of the shipped
   controller (never a second copy), the same technique the zalgo tests use. */
const ctrl = fs.readFileSync(__dirname + "/counterController.js", "utf8");
const wcStart = ctrl.indexOf("  const UNSPACED_RE");
const wcEnd = ctrl.indexOf("  function countSentences");
if (wcStart < 0 || wcEnd < 0) throw new Error("countWords markers missing in counterController.js");
global.document = { documentElement: { lang: "th" } };
const countWords = new Function(ctrl.slice(wcStart, wcEnd) + "; return countWords;")();
t("words: English unchanged", countWords("one two  three\nfour"), 4);
t("words: empty is 0", countWords("   "), 0);
t("words: Thai sentence is not 1", countWords("ฉันอยากไปกินข้าวที่ร้านอาหารใกล้บ้าน") > 5, true);
document.documentElement.lang = "ja";
t("words: Japanese sentence is not 1", countWords("私は昨日友達と一緒に東京で映画を見ました") > 5, true);
document.documentElement.lang = "zh-TW";
t("words: Traditional Chinese sentence is not 1", countWords("我昨天和朋友一起在台北看了一部電影") > 5, true);
t("words: Latin words beside Thai are each counted", countWords("iPhone 15 ราคา") >= 3, true);

console.log(fail ? "\n" + fail + " FAILURES" : "\nall green");
process.exit(fail ? 1 : 0);
