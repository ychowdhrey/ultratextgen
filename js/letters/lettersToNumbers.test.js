/* ==========================================================
   lettersToNumbers.test.js
   Assertions for the pure engine behind /letters-to-numbers/: the A1Z26 and
   A0Z25 mappings, what happens to everything that is not a letter, accents,
   emoji, separators and the decode rules for out-of-range numbers.

   No DOM, no dependencies, no runner:
       node js/letters/lettersToNumbers.test.js
   Exits non-zero if any assertion fails, and prints every assertion.

   The page's value is a claim that can be wrong (H is 8, Z is 26), so the
   engine is pinned here rather than trusted to a visual check.
   ========================================================== */
const fs = require("fs");
global.window = {};
new Function(fs.readFileSync(__dirname + "/lettersToNumbers.js", "utf8"))();
const L = window.UltraTextGen.lettersToNumbers;

let fail = 0;
let total = 0;
const t = (name, got, want) => {
  total++;
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log((ok ? "PASS " : "FAIL ") + name + "  got=" + JSON.stringify(got) + (ok ? "" : " want=" + JSON.stringify(want)));
};
const enc = (s, o) => L.encode(s, o).text;
const dec = (s, o) => L.decode(s, o).text;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// --- the acceptance cases ---
t("HELLO", enc("HELLO"), "8 5 12 12 15");
t("hello is case-insensitive", enc("hello"), "8 5 12 12 15");
t("8-5-12-12-15 decodes", dec("8-5-12-12-15"), "HELLO");
t("a z", enc("a z"), "1 26");
t("Hello, World! keeps its punctuation", enc("Hello, World!"), "8 5 12 12 15, 23 15 18 12 4!");
t("A0Z25: abc", enc("abc", { zeroBased: true }), "0 1 2");

// --- the whole alphabet ---
t("A to Z", enc(ALPHABET), Array.from({ length: 26 }, (_, i) => i + 1).join(" "));
t("A to Z, A0Z25", enc(ALPHABET, { zeroBased: true }), Array.from({ length: 26 }, (_, i) => i).join(" "));
t("A is 1 and Z is 26", [enc("A"), enc("Z")], ["1", "26"]);
t("X is 24", enc("x"), "24");
t("26-letter round trip, A1Z26", dec(enc(ALPHABET)), ALPHABET);
t("26-letter round trip, A0Z25", dec(enc(ALPHABET, { zeroBased: true }), { zeroBased: true }), ALPHABET);
t("26-letter round trip, dash", dec(enc(ALPHABET, { separator: "dash" })), ALPHABET);
t("26-letter round trip, comma", dec(enc(ALPHABET, { separator: "comma" })), ALPHABET);
t("round trip of a word", dec(enc("secret")), "SECRET");
t("firstNumber and lastNumber, A1Z26", [L.firstNumber(), L.lastNumber()], [1, 26]);
t("firstNumber and lastNumber, A0Z25", [L.firstNumber({ zeroBased: true }), L.lastNumber({ zeroBased: true })], [0, 25]);

// --- empty and nothing-to-convert input ---
t("empty string", L.encode(""), { text: "", letterCount: 0, leftAsTyped: 0, numbers: [] });
t("null and undefined", [enc(null), enc(undefined), dec(null), dec(undefined)], ["", "", "", ""]);
t("only punctuation is kept", enc("?! ... --"), "?! ... --");
t("only punctuation counts no letters", L.encode("?!").letterCount, 0);
t("only punctuation, dropped", enc("?! ...", { keepOthers: false }), "");
t("only spaces", enc("   "), "   ");

// --- letters, counts and the numbers array ---
t("letterCount and numbers", [L.encode("Hello, World!").letterCount, L.encode("abc").numbers], [10, [1, 2, 3]]);

// --- accents use their base letter ---
t("cafe with an acute accent", enc("café"), "3 1 6 5");
t("decomposed e + U+0301", enc("café"), "3 1 6 5");
t("accented capitals and ñ", enc("ÀÉÎÕÜ ñ"), "1 5 9 15 21 14");
t("accented letters count as letters, none left as typed", L.encode("café").leftAsTyped, 0);
t("Turkish dotted capital I", enc("İ"), "9");
t("Vietnamese stacked marks", enc("ệ"), "5");

// --- letters with no A-Z base are left as typed, and counted ---
t("Cyrillic is left in place", enc("привет"), "привет");
t("Cyrillic is counted", L.encode("привет").leftAsTyped, 6);
t("Cyrillic й keeps its exact code points", enc("й"), "й");
t("mixed Latin and Cyrillic", enc("abв"), "1 2в");
t("CJK is left in place and counted", [enc("a漢"), L.encode("a漢").leftAsTyped], ["1漢", 1]);
t("sharp s and o-slash do not decompose", [enc("ßø"), L.encode("ßø").leftAsTyped], ["ßø", 2]);
t("non-Latin letters dropped when non-letters are dropped", enc("abв", { keepOthers: false }), "1 2");
t("dropped non-Latin letters are still counted", L.encode("abв", { keepOthers: false }).leftAsTyped, 1);
t("punctuation is not counted as a letter", L.encode("a, b!").leftAsTyped, 0);

// --- emoji and symbols ---
t("emoji stays between two letters", enc("a😀b"), "1😀2");
t("emoji is not counted as a letter", L.encode("a😀b").leftAsTyped, 0);
t("ZWJ emoji sequence is untouched", enc("👨‍👩‍👧"), "👨‍👩‍👧");
t("emoji dropped", enc("a😀b", { keepOthers: false }), "1 2");

// --- digits typed in the text ---
t("digits stay as typed", enc("2024"), "2024");
t("a digit next to a letter gets the separator", enc("a1b"), "1 1 2");
t("a year after a letter", enc("a2024"), "1 2024");
t("a digit run does not split itself", enc("ab12cd"), "1 2 12 3 4");
t("digits dropped", enc("a1b", { keepOthers: false }), "1 2");

// --- separators ---
t("dash separator", enc("hello", { separator: "dash" }), "8-5-12-12-15");
t("comma separator", enc("hello", { separator: "comma" }), "8, 5, 12, 12, 15");
t("unknown separator falls back to a space", enc("hi", { separator: "none" }), "8 9");
t("there is no way to ask for no separator", Object.keys(L.SEPARATORS), ["space", "dash", "comma"]);
t("dash separator keeps spaces between words", enc("a b", { separator: "dash" }), "1 2");
t("dash separator inside words only", enc("ab cd", { separator: "dash" }), "1-2 3-4");
t("non-letters dropped joins every letter", enc("ab cd!", { keepOthers: false }), "1 2 3 4");
t("non-letters dropped, dash", enc("a-b c", { keepOthers: false, separator: "dash" }), "1-2-3");
t("newline is kept", enc("a\nb"), "1\n2");

// --- decode: separators ---
t("decode with spaces", dec("8 5 12 12 15"), "HELLO");
t("decode with commas", dec("8,5,12,12,15"), "HELLO");
t("decode with comma and space", dec("8, 5, 12, 12, 15"), "HELLO");
t("decode with dashes and spaces", dec("8 - 5 - 12 - 12 - 15"), "HELLO");
t("decode with mixed separators", dec("8 5,12-12 15"), "HELLO");
t("decode with a slash as the word break", dec("8 5 12 12 15 / 23 15 18 12 4"), "HELLO WORLD");
t("decode with a line break kept", dec("1 2\n3 4"), "AB\nCD");
t("decode keeps trailing punctuation", dec("8 5 12 12 15!"), "HELLO!");
t("decode leading and trailing whitespace", dec("  8 5 12 12 15  "), "HELLO");
t("decode in A0Z25", dec("0 1 2", { zeroBased: true }), "ABC");
t("decode A0Z25 shifts every letter by one", [dec("0"), dec("0", { zeroBased: true })], ["0", "A"]);
t("decode empty", L.decode(""), { text: "", letterCount: 0, outOfRange: 0, outOfRangeTokens: [] });
t("decode letterCount", L.decode("8 5 12 12 15").letterCount, 5);
t("decode leading zeros", dec("08 05"), "HE");
t("decode ignores non-ASCII digits", dec("٨ 8"), "٨H");

// --- decode: out of range ---
t("27 is out of range in A1Z26", dec("27"), "27");
t("0 is out of range in A1Z26", dec("0"), "0");
t("26 is out of range in A0Z25", dec("26", { zeroBased: true }), "26");
t("25 is in range in A0Z25", dec("25", { zeroBased: true }), "Z");
t("out of range is shown as typed between letters", dec("8 27 9"), "H27I");
t("out of range count", L.decode("1 27 0 3 100 26").outOfRange, 3);
t("out of range tokens, in order", L.decode("1 27 0 3 100 26").outOfRangeTokens, ["27", "0", "100"]);
t("only the in-range numbers are letters", L.decode("1 27 0 3 100 26").letterCount, 3);
t("a very long number is out of range, not a letter", L.decode("123456789012345678901234567890").outOfRange, 1);
t("nothing out of range in a clean decode", L.decode("1 2 3").outOfRange, 0);

// --- decode: text that holds no numbers ---
t("text without numbers is kept as typed", [dec("hello"), L.decode("hello").letterCount], ["hello", 0]);

// --- a broken engine must not be able to pass this file ---
t("H is 8, not 7 or 9", [enc("g"), enc("h"), enc("i")], ["7", "8", "9"]);

console.log("\n" + (total - fail) + "/" + total + " assertions passed");
if (fail) {
  console.error(fail + " assertion(s) failed");
  process.exit(1);
}
