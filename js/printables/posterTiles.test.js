/* ==========================================================
   posterTiles.test.js
   Assertions for the bulletin-board letters' text handling
   (js/printables/posterTiles.js): what is counted, capped, split and named.

   No DOM, no dependencies, no runner:
       node js/printables/posterTiles.test.js
   Exits non-zero if any assertion fails, and prints every assertion.

   Why this exists: until 2026-11-18 the field's maxlength counted UTF-16
   units and the planner split by code point. A pasted "Nguyễn Thị Ánh"
   silently lost "nh"; the same name pasted decomposed (NFD) printed "i"
   for "ị" and each combining accent on sheets of its own. Text is now
   NFC-normalised, then counted, capped and split by grapheme, and the page
   names what the 12-character cap leaves out.
   ========================================================== */
const fs = require("fs");
const path = require("path");

// The module wires itself to the page on load; give it a document that never finishes loading.
global.window = { addEventListener() {} };
global.document = { readyState: "loading", getElementById() { return null; } };
new Function(fs.readFileSync(path.join(__dirname, "posterTiles.js"), "utf8"))();
const PT = window.UltraTextGen.posterTiles;
const T = PT.text;

let fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log((ok ? "PASS " : "FAIL ") + name + "  got=" + JSON.stringify(got) + (ok ? "" : " want=" + JSON.stringify(want)));
};
const set = (s) => { PT.state.text = s; };

t("the cap is 12", T.MAX_CHARS, 12);

// 1. Unchanged: NFC text of 12 or fewer single-code-point characters.
for (const s of ["A", "WELCOME", "Hello World!", "Room 12", "  Spaced   out  ", "ÉCOLE", "Año 2026", "ABCDEFGHIJKL"]) {
  set(s);
  const before = Array.from(s.replace(/\s+/g, " ").trim()).slice(0, 12).join("");
  t("unchanged: " + JSON.stringify(s), [T.clean(), T.dropped()], [before, ""]);
}

// 2. The reported paste: the first 12 graphemes print and the page names the rest.
set("Nguyễn Thị Ánh");
t("NFC name keeps 12 graphemes", T.clean(), "Nguyễn Thị Á");
t("NFC name names what was cut", T.dropped(), "nh");

// 3. The same name decomposed (NFD) gives the same result: no bare accents, no "i" for "ị".
set("Nguyễn Thị Ánh".normalize("NFD"));
t("NFD name equals the NFC case", [T.clean(), T.dropped()], ["Nguyễn Thị Á", "nh"]);
t("NFD letter keeps its accents as one piece", T.graphemes(T.clean()).includes("ị"), true);

// 4. Emoji: one grapheme each, ZWJ sequences and flags included.
set("😀😃😄😁😆😅😂");
t("seven emoji are seven graphemes", T.graphemes(T.clean()).length, 7);
set("👩‍👩‍👧‍👦🇲🇾");
t("a ZWJ family and a flag are two graphemes", T.graphemes(T.clean()), ["👩‍👩‍👧‍👦", "🇲🇾"]);
set("ABCDEFGHIJKL😀");
t("13 graphemes drop the 13th and name it", [T.clean(), T.dropped()], ["ABCDEFGHIJKL", "😀"]);

// 5. A combining sequence with no precomposed form stays one piece.
set("x̣̂y");
t("x + two combining marks is one grapheme", T.graphemes(T.clean()), ["x̣̂", "y"]);

// 6. A cut that starts between two words names the word, not the gap.
set("HAPPY BIRTHDAY SAM");
t("cut between words", [T.clean(), T.dropped()], ["HAPPY BIRTHD", "AY SAM"]);
set("GOOD MORNING CLASS");
t("cut on a space trims it", [T.clean(), T.dropped()], ["GOOD MORNING", "CLASS"]);

console.log(fail ? "\n" + fail + " assertion(s) failed" : "\nall assertions passed");
process.exit(fail ? 1 : 0);
