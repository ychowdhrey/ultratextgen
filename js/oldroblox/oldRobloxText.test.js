/* ==========================================================
   oldRobloxText.test.js
   Assertions for the old Roblox font builder (js/oldroblox/oldRobloxText.js).

   No DOM, no dependencies, no runner:
       node js/oldroblox/oldRobloxText.test.js
   Exits non-zero if any assertion fails, and prints every assertion.

   Why this exists: the builder sizes the export (the SVG viewBox, and the
   PNG canvas the controller derives from it) from an estimate, not a
   measurement. Until 2026-11-18 the estimate counted every character as
   one Latin advance, so a Hangul name (rendered 471 px) was exported in a
   438 px viewBox and cropped with no warning. Wide characters now count as
   two columns. The digests below are main's output before that change:
   every Latin and other non-wide line must stay byte-identical.
   ========================================================== */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

global.window = {};
new Function(fs.readFileSync(path.join(__dirname, "oldRobloxText.js"), "utf8"))();
const B = window.UltraOldRobloxText;

let fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log((ok ? "PASS " : "FAIL ") + name + "  got=" + JSON.stringify(got) + (ok ? "" : " want=" + JSON.stringify(want)));
};
const digest = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);

// 1. Byte identity with main (ychowdhrey/ultratextgen @ 2af4dedcb) for non-wide text, both presets.
const SAME = [
  [["BUILDERMAN", "chat", 64], 523, "425c211dce91011b"],
  [["ROBLOX GAMER", "chat", 64], 609, "2e6cacd3d8329eeb"],
  [["WWW.ROBLOX.COM", "chat", 64], 694, "ee656522747baa76"],
  [["builderman", "logo", 64], 582, "69a661b5afce79e5"],
  [["Noob 2008\nOOF", "chat", 48], 361, "fda7e56e04b55320"],
  [["José Ñandú", "logo", 72], 655, "02dac8af0c23c04b"],
  [["WWWWWWWWW", "chat", 64], 481, "74d884b23d5cee0b"],
  [["", "chat", 64], 139, "860daada8eaef5f6"],
  [["a<b>&\"c'", "logo", 30], 228, "25ee0926bce22845"],
  [["\u{1D401}\u{1D40E}\u{1D40B}\u{1D403} \u{1F600}", "chat", 64], 566, "74705467717ea4bc"]
];
for (const [[text, preset, fontSize], width, sha] of SAME) {
  const r = B.build({ text, preset, fontSize });
  t("unchanged vs main: " + JSON.stringify(text) + " " + preset, [r.width, digest(r.svg)], [width, sha]);
}

// 2. Columns: wide BMP characters count twice; everything else counts its UTF-16 length, as before.
t("Latin counts one per letter", B.columns("ROBLOX"), 6);
t("Hangul syllables count two", B.columns("안녕"), 4);
t("hiragana and katakana count two", B.columns("こんにちはカタカナ"), 18);
t("CJK ideographs count two", B.columns("你好世界"), 8);
t("fullwidth forms count two", B.columns("ＲＯＢＬＯＸ"), 12);
t("ideographic space counts two", B.columns("　"), 2);
t("mixed line", B.columns("Kim 김민준"), 4 + 6);
t("astral emoji keeps its two units", B.columns("\u{1F600}"), 2);
t("astral math bold keeps its two units (never narrower than before)", B.columns("\u{1D401}"), 2);
t("halfwidth katakana stays one (East Asian Width H)", B.columns("ｶﾀｶﾅ"), 4);

// 3. The defect: the wide name's estimate now exceeds the measured render (471 px in the chat preset at 64 px,
// agents/b-visual-text, confirmed 470.8 px by the skeptic review), with the same padding as a Latin name.
const ko = B.build({ text: "안녕하세요 친구", preset: "chat", fontSize: 64 });
t("Hangul greeting: viewBox wider than its measured 471 px render plus padding", ko.width >= 471 + 2 * 64 * 0.75, true);
const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(ko.svg);
t("Hangul greeting: viewBox carries the returned width", viewBox && Number(viewBox[1]), ko.width);
const ja = B.build({ text: "ロブロックス", preset: "logo", fontSize: 64 });
const jaLatinSameLength = B.build({ text: "ROBLOX", preset: "logo", fontSize: 64 });
t("kana name is sized wider than a Latin name of the same length", ja.width > jaLatinSameLength.width, true);
const multi = B.build({ text: "OOF\n로블록스 최고", preset: "chat", fontSize: 64 });
const multiWideOnly = B.build({ text: "로블록스 최고", preset: "chat", fontSize: 64 });
t("multi-line: the widest line in columns sets the width", multi.width, multiWideOnly.width);

console.log(fail ? "\n" + fail + " assertion(s) failed" : "\nall assertions passed");
process.exit(fail ? 1 : 0);
