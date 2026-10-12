#!/usr/bin/env node
/*
 * jaSheets.test.js — zero-dependency tests for the Japanese worksheet engine
 * (jaSheetData.js + jaSheetsCore.js). Run: node js/printables/jaSheets.test.js
 *
 * What it guards, each a claim a page makes that can be silently wrong:
 *   - the kana sets are the sets the page names (46 清音, 33 拗音 …) and the
 *     grade presets are the MEXT table (80/160/200/202/193/191);
 *   - normalisation turns ｶﾀｶﾅ and か+゛ into kana a cell can hold, and never
 *     touches 髙, 﨑 or a CJK compatibility ideograph a name depends on;
 *   - a grapheme is never split across two cells;
 *   - romaji follows the 2025 notice (maccha, shinbashi, tan'i, kēki) and
 *     訓令式 when asked;
 *   - geometry is millimetres: a 22mm masu is 22mm apart in the SVG, A4 is
 *     184.6 x 271.6mm inside 12.7mm margins, and a four-line letter lands on
 *     its lines (capital: line 1 to 3, x-height: 2 to 3, g: to line 4).
 * Exit 1 on any failure.
 */
"use strict";

const path = require("path");
const fs = require("fs");
const D = require("./jaSheetData.js");
const C = require("./jaSheetsCore.js");

let failed = 0, passed = 0;
function ok(cond, name, detail) {
  if (cond) { passed++; return; }
  failed++;
  console.log("FAIL  " + name + (detail !== undefined ? "  — " + JSON.stringify(detail) : ""));
}
function eq(a, b, name) { ok(a === b, name, { got: a, want: b }); }
const near = (a, b, tol) => Math.abs(a - b) <= (tol || 0.01);

/* ---- character sets ------------------------------------------------------ */
const H = D.HIRAGANA.sets, K = D.KATAKANA.sets;
eq(H.seion.chars.length, 46, "hiragana 清音 is 46");
eq(H.dakuon.chars.length, 20, "hiragana 濁音 is 20");
eq(H.handakuon.chars.length, 5, "hiragana 半濁音 is 5");
eq(H.yoon.chars.length, 33, "hiragana 拗音 is 33 (no ぢゃ row)");
eq(K.seion.chars.join(""), H.seion.chars.map(D.toKata).join(""), "katakana 清音 mirrors hiragana");
ok(K.gairaigo.chars.indexOf("ー") >= 0 && K.gairaigo.chars.indexOf("ファ") >= 0, "katakana extras include ー and ファ");
ok(K.niteiru.chars.join("").indexOf("シツソン") === 0, "似ている字 starts with シツソン");
ok(H.seion.chars.indexOf("ゐ") < 0 && H.seion.chars.indexOf("ゑ") < 0, "ゐ/ゑ are not in the taught set");

const gradesSrc = fs.readFileSync(path.join(__dirname, "jaKanjiGrades.js"), "utf8");
const grades = JSON.parse(gradesSrc.match(/UTG_JA_KANJI_GRADES = (\{.*\});/)[1]);
eq(["1", "2", "3", "4", "5", "6"].map((g) => Array.from(grades[g]).length).join(","), "80,160,200,202,193,191", "grade presets match the 学年別漢字配当表 counts");
eq(new Set(Array.from(Object.values(grades).join(""))).size, 1026, "the 1,026 grade kanji are distinct");

/* ---- normalisation: the torture corpus ----------------------------------- */
const N = (s, o) => D.normalize(s, o);
eq(N("ｶﾀｶﾅ"), "カタカナ", "half-width katakana becomes full-width");
eq(N("ｶﾞｷﾞﾊﾟ"), "ガギパ", "half-width voicing marks compose");
eq(N("が"), "が", "decomposed か+゙ composes to が");
eq(N("か゛"), "が", "spacing dakuten after kana composes");
eq(N("は゜"), "ぱ", "spacing handakuten after kana composes");
eq(N("ＡＢＣ１２３"), "ＡＢＣ１２３", "full-width Latin is kept on a kana sheet");
eq(N("ＡＢＣ１２３", { latin: true }), "ABC123", "full-width Latin becomes ASCII on a Latin sheet");
eq(N("髙"), "髙", "髙 (U+9AD9) is untouched");
eq(N("﨑"), "﨑", "﨑 (U+FA11, a unified ideograph in the compatibility block) is untouched");
eq(N("蘭"), "蘭", "a CJK compatibility ideograph is not replaced by its unified twin");
eq(N("「こんにちは。」"), "「こんにちは。」", "brackets and full stop survive");
eq(N("  田中　　太郎  "), "田中　太郎", "whitespace runs collapse and trim, the ideographic space kept");
eq(N("ゃゅょぁぃっ"), "ゃゅょぁぃっ", "small kana are not enlarged");

/* ---- graphemes ----------------------------------------------------------- */
eq(D.graphemes("が").length, 1, "a decomposed が is one grapheme");
eq(D.graphemes("きゃ").length, 2, "きゃ is two cells (small kana takes its own cell)");
eq(D.graphemes("葛󠄁").length, 1, "an ideographic variation sequence stays one grapheme");
eq(D.scriptOf("田中 太郎"), "ja", "kanji name is ja");
eq(D.scriptOf("Sato Yuki"), "latin", "romaji name is latin");
eq(D.scriptOf("ABCあいう"), "mixed", "mixed input is mixed");

/* ---- romaji ---------------------------------------------------------------- */
const R = [
  ["しんいち", "shin'ichi", "sin'iti"], ["きんえん", "kin'en", "kin'en"], ["まっちゃ", "maccha", "mattya"],
  ["しんばし", "shinbashi", "sinbasi"], ["たんい", "tan'i", "tan'i"], ["ケーキ", "kēki", "kêki"],
  ["ふじさん", "fujisan", "huzisan"], ["じゃんけん", "janken", "zyanken"], ["きって", "kitte", "kitte"],
  ["ちず", "chizu", "tizu"], ["つき", "tsuki", "tuki"], ["とうきょう", "toukyou", "toukyou"],
  ["ファイル", "fairu", "fairu"], ["あっ", "a", "a"]
];
R.forEach(([k, h, kr]) => { eq(D.toRomaji(k, "hepburn"), h, "hepburn(2025) " + k); eq(D.toRomaji(k, "kunrei"), kr, "kunrei " + k); });

/* ---- geometry ---------------------------------------------------------------- */
const A = C.area("a4", "normal");
ok(near(A.w, 184.6) && near(A.h, 271.6), "A4 portrait area is 184.6 x 271.6mm", A);
const L = C.area("a4", "normal", "landscape");
ok(near(L.w, 271.6) && near(L.h, 184.6) && L.paper[0] === 297, "A4 landscape area is turned", L);

const env = { creditText: "ultratextgen.com/ja/purinto/test", qrSvg: (u, mm) => '<rect width="' + mm + '" height="' + mm + '"/>' };
const pages = C.buildCharSheets(L, { cell: 22, vertical: true, mode: "nazori-kaki", title: "t" }, ["あ", "ゃ", "ー", "きゃ"], D, env);
eq(pages.length, 1, "four characters fit one landscape page");
const svg = pages[0];
ok(/width="271\.6mm" height="184\.6mm"/.test(svg), "sheet declares its size in millimetres");
ok(/viewBox="0 0 271\.6 184\.6"/.test(svg), "user unit is the millimetre");
const cap = C.masuCapacity(L, { cell: 22, vertical: true });
const m = C.masuPage(L, { cell: 22, vertical: true }, [], D);
ok(near(m.grid.w, cap.lines * 22) && near(m.grid.h, cap.perLine * 22), "masu grid is a whole number of 22mm cells", m.grid);
const xs = (m.svg.match(/M([\d.]+) [\d.]+V/g) || []).map((s) => +s.slice(1).split(" ")[0]);
const steps = new Set();
xs.sort((a, b) => a - b).forEach((x, i) => { if (i) steps.add(Math.round((x - xs[i - 1]) * 100) / 100); });
ok([...steps].every((s) => near(s, 11) || near(s, 22) || near(s, 0)), "vertical rules fall every 11mm (cell edge / 十字リーダー)", [...steps]);
ok(/font-size="17\.6"/.test(svg), "glyph is 0.8 of a 22mm cell");
ok(/>ゃ<\/text>/.test(svg) && /translate\(2\.29 -1\.76\)/.test(svg), "vertical small kana moves up-right by the font's own vert offset");
ok(/rotate\(90 [\d.]+ [\d.]+\)">ー</.test(svg), "vertical ー is turned a quarter");
ok((svg.match(/>き</g) || []).length === 3 && (svg.match(/>ゃ</g) || []).length >= 4, "きゃ practises as model + 2 traced pairs");
ok(/ultratextgen\.com\/ja\/purinto\/test/.test(svg), "credit text is on the sheet");

const hz = C.buildCharSheets(A, { cell: 20, vertical: false, mode: "mite", title: "t" }, ["さ"], D, env)[0];
eq((hz.match(/>さ</g) || []).length, 1, "お手本を見て書く prints the model only");
const oome = C.buildCharSheets(A, { cell: 20, vertical: false, mode: "nazori-oome", fade: true, title: "t" }, ["さ"], D, env)[0];
ok((oome.match(/>さ</g) || []).length === C.masuCapacity(A, { cell: 20 }).perLine, "なぞり書き中心 fills the line");
ok(oome.indexOf(C.TRACE[3]) > 0, "fade reaches the lightest step");

// Torture corpus through the masu: nothing split, nothing dropped.
const corpus = ["あいうえお", "アイウエオ", "がぎぐげご", "ぱぴぷぺぽ", "ゃゅょぁぃっ", "きゃ しゅ ちょ", "ケーキ", "東京タワー", "さくら", "サクラ", "田中 太郎", "「こんにちは。」", "ABCあいう", "ＡＢＣ１２３", "ｶﾀｶﾅ", "髙", "﨑", "が"];
corpus.forEach((s) => {
  const nm = D.normalize(s);
  const sheets = C.buildNameMasu(A, { cell: 20, vertical: true, mode: "nazori-kaki", title: "t" }, nm, D, env);
  const g = D.graphemes(nm).filter((c) => c.trim());
  const text = sheets.join("");
  ok(sheets.length === 1, "name sheet builds for " + s);
  ok(g.every((c) => text.indexOf(">" + C.esc(c) + "<") >= 0), "every grapheme of " + s + " is a cell", g);
  ok(!/<text[^>]*><\/text>/.test(text), "no empty glyph for " + s);
});

/* ---- four-line ruling ---------------------------------------------------------- */
const skel = (() => {
  const src = fs.readFileSync(path.join(__dirname, "strokeDirectionData.js"), "utf8");
  const win = {};
  new Function("window", src)(win);
  return win.UTG_STROKE_DIRECTION_DATA;
})();
function yRange(text, o) {
  const r = C.latinRow(text, 0, 100, 15, o, skel, { color: "#000" }).svg;
  const ys = [];
  (r.match(/d="[^"]+"/g) || []).forEach((d) => {
    const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
    for (let i = 1; i < nums.length; i += 2) ys.push(nums[i]);
  });
  return [Math.min(...ys), Math.max(...ys)];
}
const eqO = { bands: [1, 1, 1] };
ok(near(yRange("A", eqO)[0], 100, 0.05) && near(yRange("A", eqO)[1], 110, 0.05), "capital A spans line 1 to the baseline", yRange("A", eqO));
ok(near(yRange("o", eqO)[0], 105, 0.6) && near(yRange("o", eqO)[1], 110, 0.6), "o sits in the middle band", yRange("o", eqO));
ok(near(yRange("g", eqO)[1], 115, 0.3), "g reaches line 4", yRange("g", eqO));
ok(yRange("t", eqO)[0] > 101, "t starts below line 1", yRange("t", eqO));
ok(near(yRange("b", eqO)[0], 100, 0.05), "b reaches line 1", yRange("b", eqO));
const tb = { bands: [5, 9, 5] };
ok(near(yRange("o", tb)[0], 100 + 15 * 5 / 19, 0.6), "教科書式 middle band is 9/19 of the row", yRange("o", tb));
const rule = C.fourLineRule(0, 100, 0, 15, { bands: [1, 1, 1] });
ok((rule.match(/<line/g) || []).length === 4 && /stroke="#d1302f"/.test(rule), "four lines, the third in red");
ok(/y1="10"/.test(rule) && /stroke="#d1302f" stroke-width="0.4"/.test(rule), "the red line is the third (y=10 of 15)");
eq(C.fourLineCapacity(A, { rowH: 15, rowGap: 7 }), 10, "fifteen-millimetre rows: ten to an A4 page");

/* ---- unpitsu and nurie ------------------------------------------------------------ */
const kinds = ["yoko", "tate", "naname", "nami", "yama", "kaku", "kurukuru", "kunekune", "uzumaki", "maru", "sankaku", "shikaku"];
const up = C.buildUnpitsu(A, { kinds: kinds, level: 3, title: "t" }, env);
eq(up.length, 12, "one sheet per pattern");
up.forEach((s, i) => ok(/<path d="M|<circle cx="[\d.]+" cy="[\d.]+" r="[\d.]{2,}/.test(s) && !/NaN/.test(s), "pattern draws: " + kinds[i]));
const road = C.buildUnpitsu(A, { kinds: ["yoko"], level: 3, title: "t" }, env)[0];
const ys2 = (road.match(/<path d="M[\d.]+ ([\d.]+)L/g) || []).slice(0, 2).map((s) => +s.match(/M[\d.]+ ([\d.]+)L/)[1]);
ok(near(Math.abs(ys2[1] - ys2[0]), 10, 0.05), "level 3 road is 10mm wide", ys2);
const nurie = C.buildNurie(A, { perPage: 1, words: true, title: "t" }, ["き"], D, env)[0];
ok(/>きりん</.test(nurie), "nurie adds the example word");
ok((nurie.match(/>き</g) || []).length === 2, "hollow glyph is two stacked strokes of the same character");

console.log("jaSheets: " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
