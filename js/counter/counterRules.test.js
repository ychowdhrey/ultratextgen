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

// --- rule table integrity ---
const ids = R.LIMITS.map(r => r.id);
t("no duplicate rule ids", ids.length, new Set(ids).size);
t("every rule has a live platform", R.LIMITS.every(r => R.PLATFORMS.some(p => p.id === r.platform)), true);
t("every platform has >=1 rule", R.PLATFORMS.every(p => R.LIMITS.some(r => r.platform === p.id)), true);
t("every rule has a positive limit", R.LIMITS.every(r => r.limit > 0), true);
t("fitsAll covers every rule", R.fitsAll("hi").length, R.LIMITS.length);

console.log(fail ? "\n" + fail + " FAILURES" : "\nall green");
process.exit(fail ? 1 : 0);
