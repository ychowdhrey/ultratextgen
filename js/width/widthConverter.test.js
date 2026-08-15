/* node js/width/widthConverter.test.js
 *
 * Assertions for the pure half of the width converter — same idiom as
 * js/counter/counterRules.test.js: no DOM, no dependencies, exit 1 on failure.
 * The kana/jamo tables assert conversion FACTS, which is exactly the class of
 * page the Testing section says deserves a test file.
 */
"use strict";
global.window = {};
global.document = { querySelectorAll: () => [], readyState: "complete", addEventListener: () => {} };
require("./width-converter.js");
const W = window.UTGWidth;
const ALL = { alnum: true, punct: true, space: true, kana: true, jamo: true };

let pass = 0, fail = 0;
function eq(name, got, want) {
  if (got === want) { pass++; }
  else { fail++; console.error("FAIL " + name + "\n  got  " + JSON.stringify(got) + "\n  want " + JSON.stringify(want)); }
}

// ASCII <-> fullwidth, both directions
eq("ascii toFull", W.convert("Hello World 123!", { direction: "full", classes: ALL }), "Ｈｅｌｌｏ　Ｗｏｒｌｄ　１２３！");
eq("ascii toHalf", W.convert("Ｈｅｌｌｏ　Ｗｏｒｌｄ　１２３！", { direction: "half", classes: ALL }), "Hello World 123!");

// Voiced/semi-voiced kana fuse toFull and split toHalf
eq("kana fuse", W.convert("ﾃﾞｼﾞﾀﾙｶﾒﾗ ﾊﾟｽﾜｰﾄﾞ ｳﾞｧｲｵﾘﾝ", { direction: "full", classes: ALL }), "デジタルカメラ　パスワード　ヴァイオリン");
eq("kana split", W.convert("デジタルカメラ　パスワード　ヴァイオリン", { direction: "half", classes: ALL }), "ﾃﾞｼﾞﾀﾙｶﾒﾗ ﾊﾟｽﾜｰﾄﾞ ｳﾞｧｲｵﾘﾝ");

// Kana punctuation rides the kana class
eq("kana punct", W.convert("｢ﾃｽﾄ｣｡", { direction: "full", classes: ALL }), "「テスト」。");

// Class selection: only checked classes convert
eq("selective", W.convert("ABC ｶﾞｷﾞ 123", { direction: "full", classes: { alnum: false, punct: false, space: false, kana: true, jamo: false } }), "ABC ガギ 123");

// Hangul: compatibility jamo, not conjoining (renders standalone)
eq("jamo toFull", W.convert("ﾡﾢﾣ", { direction: "full", classes: ALL }), "ㄱㄲㄳ");
eq("jamo toHalf", W.convert("ㄱㄲㄳ", { direction: "half", classes: ALL }), "ﾡﾢﾣ");

// No halfwidth form -> unchanged in both directions; hiragana/kanji untouched
eq("passthrough", W.convert("日本語はそのまま ヮヵヶ", { direction: "half", classes: ALL }), "日本語はそのまま ヮヵヶ");

// Currency
eq("yen toFull", W.convert("¥1000", { direction: "full", classes: ALL }), "￥１０００");
eq("yen toHalf", W.convert("￥１０００", { direction: "half", classes: ALL }), "¥1000");

// Full katakana round-trip is lossless for every mappable char
const KAT = "アイウエオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモヤユヨラリルレロワヲンァィゥェォャュョッーヴ。「」、・";
eq("katakana round-trip", W.convert(W.convert(KAT, { direction: "half", classes: ALL }), { direction: "full", classes: ALL }), KAT);

// Every halfwidth-forms codepoint agrees with Unicode NFKC on the fullwidth side
let nfkcBad = 0;
for (let cp = 0xff61; cp <= 0xffdc; cp++) {
  const h = String.fromCodePoint(cp);
  if (W.convert(h, { direction: "full", classes: ALL }).normalize("NFKC") !== h.normalize("NFKC")) nfkcBad++;
}
eq("NFKC equivalence sweep", nfkcBad, 0);

// Width census
const c = W.counts("ABCあいう１２３");
eq("counts.half", c.half, 3);
eq("counts.full", c.full, 6);
eq("counts.bytes", c.bytes, 15);

console.log(pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
