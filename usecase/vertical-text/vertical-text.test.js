/* ==========================================================================
   UltraTextGen — vertical-text.test.js
   Unit tests for vertical layout transforms and vertical decoration logic.
   Run: node usecase/vertical-text/vertical-text.test.js
   ========================================================================== */

var Layouts = require("./vertical-layouts");
var Deco    = require("./vertical-decoration");

var passed = 0;
var failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log("  ✓ " + message);
  } else {
    failed++;
    console.error("  ✗ FAIL: " + message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    passed++;
    console.log("  ✓ " + message);
  } else {
    failed++;
    console.error("  ✗ FAIL: " + message);
    console.error("    expected: " + JSON.stringify(expected));
    console.error("    actual:   " + JSON.stringify(actual));
  }
}

// ---------------------------------------------------------------------------
console.log("\n=== splitWords ===");
// ---------------------------------------------------------------------------

(function () {
  var words = Layouts.splitWords("hello world");
  assertEqual(words.length, 2, "splits 'hello world' into 2 words");
  assertEqual(words[0], "hello", "first word is 'hello'");
  assertEqual(words[1], "world", "second word is 'world'");

  var empty = Layouts.splitWords("");
  assertEqual(empty.length, 0, "empty string returns empty array");

  var spaces = Layouts.splitWords("  a   b  ");
  assertEqual(spaces.length, 2, "trims extra spaces");
})();

// ---------------------------------------------------------------------------
console.log("\n=== makeVerticalStacked ===");
// ---------------------------------------------------------------------------

(function () {
  var result = Layouts.makeVerticalStacked(["Hi"], "stack");
  assertEqual(result, "H\ni", "stacks single word vertically");

  var multi = Layouts.makeVerticalStacked(["Hi", "Go"], "stack");
  assert(multi.indexOf("\n\n") !== -1, "blank line between words in stack mode");

  var cont = Layouts.makeVerticalStacked(["Hi", "Go"], "continuous");
  assertEqual(cont, "H\ni\nG\no", "continuous mode merges words");
})();

// ---------------------------------------------------------------------------
console.log("\n=== makeVerticalReverse ===");
// ---------------------------------------------------------------------------

(function () {
  var result = Layouts.makeVerticalReverse(["abc"], "stack");
  assertEqual(result, "c\nb\na", "reverses letters");
})();

// ---------------------------------------------------------------------------
console.log("\n=== makeVerticalUpsideDown ===");
// ---------------------------------------------------------------------------

(function () {
  var result = Layouts.makeVerticalUpsideDown(["Hi"], "stack");
  // 'H' doesn't have a flip, stays 'H'; 'i' flips to 'ᴉ'
  // reversed: i, H → flipped: ᴉ, H
  assertEqual(result, "ᴉ\nH", "flips and reverses letters");
})();

// ---------------------------------------------------------------------------
console.log("\n=== makeVerticalSpaced ===");
// ---------------------------------------------------------------------------

(function () {
  var result = Layouts.makeVerticalSpaced(["ab"], "stack");
  assertEqual(result, "a\n\nb", "double-newline between letters");
})();

// ---------------------------------------------------------------------------
console.log("\n=== makeVerticalBox ===");
// ---------------------------------------------------------------------------

(function () {
  var result = Layouts.makeVerticalBox(["Ya"], "stack");
  var lines = result.split("\n");
  assertEqual(lines[0], "╔═══╗", "box top border");
  assertEqual(lines[1], "║ Y ║", "box first letter row");
  assertEqual(lines[2], "║ a ║", "box second letter row");
  assertEqual(lines[3], "╚═══╝", "box bottom border");
})();

// ---------------------------------------------------------------------------
console.log("\n=== makeVerticalStaircase ===");
// ---------------------------------------------------------------------------

(function () {
  var result = Layouts.makeVerticalStaircase(["abc"], "stack");
  var lines = result.split("\n");
  assertEqual(lines[0], "a", "staircase line 0 has no indent");
  assertEqual(lines[1], " b", "staircase line 1 has 1 space indent");
  assertEqual(lines[2], "  c", "staircase line 2 has 2 spaces indent");
})();

// ---------------------------------------------------------------------------
console.log("\n=== makeVerticalDoubleColumn ===");
// ---------------------------------------------------------------------------

(function () {
  var result = Layouts.makeVerticalDoubleColumn(["ab", "cd"]);
  var lines = result.split("\n");
  assertEqual(lines[0], "a   c", "double column first row");
  assertEqual(lines[1], "b   d", "double column second row");

  var single = Layouts.makeVerticalDoubleColumn(["hi"]);
  assertEqual(single, "h\ni", "single word falls back to single column");
})();

// ---------------------------------------------------------------------------
console.log("\n=== makeVerticalPyramid ===");
// ---------------------------------------------------------------------------

(function () {
  var result = Layouts.makeVerticalPyramid(["Yasi"]);
  var lines = result.split("\n");
  assertEqual(lines[0], "Y", "pyramid row 1");
  assertEqual(lines[1], "Y a", "pyramid row 2");
  assertEqual(lines[2], "Y a s", "pyramid row 3");
  assertEqual(lines[3], "Y a s i", "pyramid row 4");
})();

// ---------------------------------------------------------------------------
console.log("\n=== makeVerticalReversePyramid ===");
// ---------------------------------------------------------------------------

(function () {
  var result = Layouts.makeVerticalReversePyramid(["abc"]);
  var lines = result.split("\n");
  assertEqual(lines[0], "a b c", "reverse pyramid first row full");
  assertEqual(lines[lines.length - 1], "a", "reverse pyramid last row single letter");
})();

// ---------------------------------------------------------------------------
console.log("\n=== makeVerticalCenteredPyramid ===");
// ---------------------------------------------------------------------------

(function () {
  var result = Layouts.makeVerticalCenteredPyramid(["abc"]);
  var lines = result.split("\n");
  // first line should be centered (has leading spaces)
  assert(lines[0].indexOf("a") > 0, "centered pyramid first line is indented");
  // last line should have no leading space (full width)
  assertEqual(lines[lines.length - 1].trimStart(), "a b c", "centered pyramid last line is full");
})();

// ---------------------------------------------------------------------------
console.log("\n=== makeVerticalDiagonalRight ===");
// ---------------------------------------------------------------------------

(function () {
  var result = Layouts.makeVerticalDiagonalRight(["abc"]);
  var lines = result.split("\n");
  assertEqual(lines[0], "a", "diagonal right line 0 no indent");
  assertEqual(lines[1], "  b", "diagonal right line 1 indent 2");
  assertEqual(lines[2], "    c", "diagonal right line 2 indent 4");
})();

// ---------------------------------------------------------------------------
console.log("\n=== makeVerticalDiagonalLeft ===");
// ---------------------------------------------------------------------------

(function () {
  var result = Layouts.makeVerticalDiagonalLeft(["ab"]);
  var lines = result.split("\n");
  assertEqual(lines[0], "  a", "diagonal left line 0 max indent");
  assertEqual(lines[1], "b", "diagonal left line 1 no indent");
})();

// ---------------------------------------------------------------------------
console.log("\n=== applyVerticalPrefixDecorator ===");
// ---------------------------------------------------------------------------

(function () {
  var input = "H\ni\n\nG\no";
  var result = Deco.applyVerticalPrefixDecorator(input, "•");
  var lines = result.split("\n");
  assertEqual(lines[0], "• H", "bullet prefix on first line");
  assertEqual(lines[1], "• i", "bullet prefix on second line");
  assertEqual(lines[2], "", "blank line preserved (no prefix)");
  assertEqual(lines[3], "• G", "bullet prefix after blank line");
})();

// ---------------------------------------------------------------------------
console.log("\n=== emoji prefix applied to spaced layout ===");
// ---------------------------------------------------------------------------

(function () {
  var spaced = Layouts.makeVerticalSpaced(["ab"], "stack");
  var result = Deco.applyVerticalPrefixDecorator(spaced, "✨");
  var lines = result.split("\n");
  assertEqual(lines[0], "✨ a", "emoji prefix on first letter");
  assertEqual(lines[1], "", "blank spacing line preserved");
  assertEqual(lines[2], "✨ b", "emoji prefix on second letter");
})();

// ---------------------------------------------------------------------------
console.log("\n=== applyVerticalDividerDecorator — stacked ===");
// ---------------------------------------------------------------------------

(function () {
  var stacked = "H\ni\n\nG\no";
  var result = Deco.applyVerticalDividerDecorator(stacked, "──────", "stacked");
  var lines = result.split("\n");
  assertEqual(lines[0], "H", "first letter unchanged");
  assertEqual(lines[1], "──────", "divider inserted between H and i");
  assertEqual(lines[2], "i", "second letter unchanged");
  assertEqual(lines[3], "", "blank line between word blocks preserved");
  assertEqual(lines[4], "G", "third letter unchanged");
  assertEqual(lines[5], "──────", "divider inserted between G and o");
  assertEqual(lines[6], "o", "fourth letter unchanged");
})();

// ---------------------------------------------------------------------------
console.log("\n=== divider preserves blank lines between word blocks ===");
// ---------------------------------------------------------------------------

(function () {
  var input = "A\nB\n\nC\nD";
  var result = Deco.applyVerticalDividerDecorator(input, "---", "stacked");
  // Should have: A, ---, B, (blank), C, ---, D
  assert(result.indexOf("\n\n") !== -1, "blank line between word blocks is preserved with divider");
})();

// ---------------------------------------------------------------------------
console.log("\n=== divider fallback for double column ===");
// ---------------------------------------------------------------------------

(function () {
  var dc = Layouts.makeVerticalDoubleColumn(["ab", "cd"]);
  var result = Deco.applyVerticalDividerDecorator(dc, "──", "doublecolumn");
  // Should fallback to prefix mode
  var lines = result.split("\n");
  assertEqual(lines[0], "── a   c", "divider used as prefix for double column line 1");
  assertEqual(lines[1], "── b   d", "divider used as prefix for double column line 2");
})();

// ---------------------------------------------------------------------------
console.log("\n=== divider fallback for diagonal layouts ===");
// ---------------------------------------------------------------------------

(function () {
  var diag = Layouts.makeVerticalDiagonalRight(["ab"]);
  var result = Deco.applyVerticalDividerDecorator(diag, "→", "diagonalright");
  var lines = result.split("\n");
  assertEqual(lines[0], "→ a", "divider used as prefix for diagonal right line 0");
  assertEqual(lines[1], "→   b", "divider used as prefix for diagonal right line 1");
})();

// ---------------------------------------------------------------------------
console.log("\n=== applyVerticalDecorator switches by type ===");
// ---------------------------------------------------------------------------

(function () {
  var input = "A\nB";
  var prefixDeco = { symbol: "★", type: "prefix" };
  var dividerDeco = { symbol: "---", type: "divider" };

  var prefResult = Deco.applyVerticalDecorator(input, prefixDeco, "stacked");
  assertEqual(prefResult, "★ A\n★ B", "applyVerticalDecorator uses prefix mode for prefix type");

  var divResult = Deco.applyVerticalDecorator(input, dividerDeco, "stacked");
  assertEqual(divResult, "A\n---\nB", "applyVerticalDecorator uses divider mode for divider type");
})();

// ---------------------------------------------------------------------------
console.log("\n=== continuous mode merges words ===");
// ---------------------------------------------------------------------------

(function () {
  var result = Layouts.makeVerticalStacked(["he", "lo"], "continuous");
  assertEqual(result, "h\ne\nl\no", "continuous mode removes space between words");
})();

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log("\n" + "=".repeat(50));
console.log("Results: " + passed + " passed, " + failed + " failed");
console.log("=".repeat(50) + "\n");

if (failed > 0) process.exit(1);
