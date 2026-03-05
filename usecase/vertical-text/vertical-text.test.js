/* ==========================================================================
   vertical-text.test.js
   Unit tests for vertical-layouts.js and vertical-decorators.js
   Run with: node usecase/vertical-text/vertical-text.test.js
   ========================================================================== */

"use strict";

/* Shim global so the modules attach to it */
var global = globalThis;

/* Load modules */
require("./vertical-layouts.js");
require("./vertical-decorators.js");

var VL = global.VerticalLayouts;
var VD = global.VerticalDecorators;

var passed = 0;
var failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log("  ✓  " + testName);
    passed++;
  } else {
    console.error("  ✗  FAIL: " + testName);
    failed++;
  }
}

function assertEqual(actual, expected, testName) {
  if (actual === expected) {
    console.log("  ✓  " + testName);
    passed++;
  } else {
    console.error("  ✗  FAIL: " + testName);
    console.error("       Expected: " + JSON.stringify(expected));
    console.error("       Actual:   " + JSON.stringify(actual));
    failed++;
  }
}

/* -------------------------------------------------------------------------
   Test 1: Bullet prefix applied to stacked layout
   ------------------------------------------------------------------------- */
console.log("\nTest 1: Bullet prefix applied to stacked layout");
(function () {
  var words = VL.splitWords("Hi");
  var stacked = VL.makeVerticalStacked(words, "stack");
  var result = VD.applyVerticalPrefixDecorator(stacked, "●");
  assertEqual(result, "● H\n● i", "each letter gets bullet prefix");
}());

/* -------------------------------------------------------------------------
   Test 2: Emoji prefix applied to spaced layout
   ------------------------------------------------------------------------- */
console.log("\nTest 2: Emoji prefix applied to spaced layout");
(function () {
  var words = VL.splitWords("Hi");
  var spaced = VL.makeVerticalSpaced(words, "stack");
  var result = VD.applyVerticalPrefixDecorator(spaced, "✨");
  var lines = result.split("\n");
  assert(lines[0] === "✨ H", "first letter has emoji prefix");
  assert(lines[1] === "", "blank line preserved");
  assert(lines[2] === "✨ i", "second letter has emoji prefix");
}());

/* -------------------------------------------------------------------------
   Test 3: Divider insertion between vertical lines
   ------------------------------------------------------------------------- */
console.log("\nTest 3: Divider insertion between vertical lines");
(function () {
  var output = "H\ne\nl\nl\no";
  var result = VD.applyVerticalDividerDecorator(output, "───", "stacked");
  var lines = result.split("\n");
  assertEqual(lines[0], "H", "first line is H");
  assertEqual(lines[1], "───", "divider after H");
  assertEqual(lines[2], "e", "second line is e");
  assertEqual(lines[3], "───", "divider after e");
  assertEqual(lines[4], "l", "third line is l");
}());

/* -------------------------------------------------------------------------
   Test 4: Divider preserves blank lines between word blocks
   ------------------------------------------------------------------------- */
console.log("\nTest 4: Divider preserves blank lines between word blocks");
(function () {
  var output = "H\ni\n\nW\no";
  var result = VD.applyVerticalDividerDecorator(output, "───", "stacked");
  var lines = result.split("\n");
  var blankIdx = lines.indexOf("");
  assert(blankIdx !== -1, "blank line preserved in output");
  /* The blank line should appear at the boundary between Hi and Wo blocks */
  assert(lines[blankIdx - 1] === "i" || lines[blankIdx + 1] === "W",
    "blank line is at word block boundary");
}());

/* -------------------------------------------------------------------------
   Test 5: Divider fallback behavior for double column
   ------------------------------------------------------------------------- */
console.log("\nTest 5: Divider fallback to prefix for double-column layout");
(function () {
  var output = "H  W\ne  o";
  var result = VD.applyVerticalDividerDecorator(output, "→", "double-column");
  var lines = result.split("\n");
  assert(lines[0].startsWith("→ "), "fallback prefix applied to first line");
  assert(lines[1].startsWith("→ "), "fallback prefix applied to second line");
}());

/* -------------------------------------------------------------------------
   Test 6: Staircase indentation increases correctly
   ------------------------------------------------------------------------- */
console.log("\nTest 6: Staircase indentation increases correctly");
(function () {
  var words = VL.splitWords("Hello");
  var result = VL.makeVerticalStaircase(words, "stack");
  var lines = result.split("\n");
  assertEqual(lines[0], "H", "first letter has no indent");
  assertEqual(lines[1], "  e", "second letter has 2-space indent");
  assertEqual(lines[2], "    l", "third letter has 4-space indent");
  assertEqual(lines[3], "      l", "fourth letter has 6-space indent");
  assertEqual(lines[4], "        o", "fifth letter has 8-space indent");
}());

/* -------------------------------------------------------------------------
   Test 7: Continuous mode merges words
   ------------------------------------------------------------------------- */
console.log("\nTest 7: Continuous mode merges words");
(function () {
  var words = VL.splitWords("Hi Bye");
  var result = VL.makeVerticalStacked(words, "continuous");
  var lines = result.split("\n");
  assertEqual(lines.length, 5, "5 letters total (Hi + Bye = HiBye)");
  assertEqual(lines[0], "H", "first letter H");
  assertEqual(lines[1], "i", "second letter i");
  assertEqual(lines[2], "B", "third letter B (no blank between words)");
  assert(lines.indexOf("") === -1, "no blank lines in continuous mode");
}());

/* -------------------------------------------------------------------------
   Test 8: Pyramid layout builds correctly
   ------------------------------------------------------------------------- */
console.log("\nTest 8: Pyramid layout builds correctly");
(function () {
  var words = VL.splitWords("Hello");
  var result = VL.makeVerticalPyramid(words);
  var lines = result.split("\n");
  assertEqual(lines[0], "H", "row 1: H");
  assertEqual(lines[1], "H e", "row 2: H e");
  assertEqual(lines[2], "H e l", "row 3: H e l");
  assertEqual(lines[3], "H e l l", "row 4: H e l l");
  assertEqual(lines[4], "H e l l o", "row 5: H e l l o");
}());

/* -------------------------------------------------------------------------
   Test 9: Box layout renders correctly
   ------------------------------------------------------------------------- */
console.log("\nTest 9: Box layout renders correctly");
(function () {
  var words = VL.splitWords("Hi");
  var result = VL.makeVerticalBox(words, "stack");
  var lines = result.split("\n");
  assertEqual(lines[0], "╔═══╗", "top border");
  assertEqual(lines[1], "║ H ║", "letter H in box");
  assertEqual(lines[2], "║ i ║", "letter i in box");
  assertEqual(lines[3], "╚═══╝", "bottom border");
}());

/* -------------------------------------------------------------------------
   Test 10: Reverse stacked produces correct order
   ------------------------------------------------------------------------- */
console.log("\nTest 10: Reverse stacked produces correct order");
(function () {
  var words = VL.splitWords("Hello");
  var result = VL.makeVerticalReverse(words, "stack");
  var lines = result.split("\n");
  assertEqual(lines[0], "o", "first line is last letter");
  assertEqual(lines[1], "l", "second line is second-to-last");
  assertEqual(lines[4], "H", "last line is first letter");
}());

/* -------------------------------------------------------------------------
   Test 11: Diagonal right has increasing indentation
   ------------------------------------------------------------------------- */
console.log("\nTest 11: Diagonal right has increasing indentation");
(function () {
  var words = VL.splitWords("Hi");
  var result = VL.makeVerticalDiagonalRight(words);
  var lines = result.split("\n");
  assertEqual(lines[0], "H", "first letter: no indent");
  assertEqual(lines[1], " i", "second letter: 1 space indent");
}());

/* -------------------------------------------------------------------------
   Test 12: Upside-down uses correct character mapping
   ------------------------------------------------------------------------- */
console.log("\nTest 12: Upside-down uses correct character mapping");
(function () {
  var words = VL.splitWords("hello");
  var result = VL.makeVerticalUpsideDown(words, "stack");
  var lines = result.split("\n");
  /* Reversed: o→o, l→l, l→l, e→ǝ, h→ɥ */
  assertEqual(lines[0], "o", "reversed 'o' → 'o' (maps to o)");
  assertEqual(lines[1], "l", "reversed 'l' → 'l' (maps to l)");
  assertEqual(lines[3], "ǝ", "reversed 'e' → 'ǝ'");
  assertEqual(lines[4], "ɥ", "reversed 'h' → 'ɥ'");
}());

/* -------------------------------------------------------------------------
   Summary
   ------------------------------------------------------------------------- */
console.log("\n" + "=".repeat(50));
console.log("Results: " + passed + " passed, " + failed + " failed");
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All tests passed! ✓");
}
