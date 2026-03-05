/* ==========================================================================
   Unit Tests — Vertical Text Generator
   Run:  node usecase/vertical-text/vertical-text.test.js
   ========================================================================== */

// ---- Minimal test harness (no external deps) ----
var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log("  ✓ " + msg);
  } else {
    failed++;
    console.error("  ✗ FAIL: " + msg);
  }
}

function assertEqual(actual, expected, msg) {
  if (actual === expected) {
    passed++;
    console.log("  ✓ " + msg);
  } else {
    failed++;
    console.error("  ✗ FAIL: " + msg);
    console.error("    expected:", JSON.stringify(expected));
    console.error("    actual:  ", JSON.stringify(actual));
  }
}

function describe(name, fn) {
  console.log("\n" + name);
  fn();
}

// ---- Load modules (they attach to `global` via window polyfill) ----
global.window = global;

require("./vertical-layouts.js");
require("./vertical-decoration-data.js");
require("./vertical-decoration.js");

var Layouts = window.VerticalLayouts;
var Deco = window.VerticalDecoration;
var DecoData = window.VERTICAL_DECORATIONS;

// ==================== TESTS ====================

describe("splitWords", function () {
  var splitWords = Layouts.splitWords;

  assertEqual(splitWords("").length, 0, "empty string returns empty array");
  assertEqual(splitWords("  ").length, 0, "whitespace-only returns empty array");
  assertEqual(splitWords("hello").length, 1, "single word");
  assertEqual(splitWords("hello world").length, 2, "two words");
  assertEqual(splitWords("  a   b   c  ").length, 3, "multiple spaces trimmed");
});

describe("makeVerticalSimple — stack mode", function () {
  var words = ["Hi", "Go"];
  var result = Layouts.makeVerticalSimple(words, "stack");

  assertEqual(result, "H\ni\n\nG\no", "two words with blank line between");
});

describe("makeVerticalSimple — continuous mode", function () {
  var words = ["Hi", "Go"];
  var result = Layouts.makeVerticalSimple(words, "continuous");

  assertEqual(result, "H\ni\nG\no", "continuous merges words (no blank line)");
});

describe("makeVerticalSpaced — stack mode", function () {
  var words = ["AB"];
  var result = Layouts.makeVerticalSpaced(words, "stack");

  assertEqual(result, "A\n\nB", "extra blank line between letters");
});

describe("makeVerticalBox — stack mode", function () {
  var words = ["AB"];
  var result = Layouts.makeVerticalBox(words, "stack");

  assertEqual(result, "| A |\n| B |", "each letter wrapped in box");
});

describe("makeVerticalStaircase — stack mode", function () {
  var words = ["ABC"];
  var result = Layouts.makeVerticalStaircase(words, "stack");

  assertEqual(result, "A\n B\n  C", "staircase indentation");
});

describe("makeVerticalStaircase — continuous mode", function () {
  var words = ["AB", "CD"];
  var result = Layouts.makeVerticalStaircase(words, "continuous");

  // A (0 spaces), B (1 space), C (2 spaces), D (3 spaces)
  assertEqual(result, "A\n B\n  C\n   D", "continuous staircase across words");
});

describe("makeVerticalDoubleColumn", function () {
  var words = ["Hi", "Go"];
  var result = Layouts.makeVerticalDoubleColumn(words);

  assertEqual(result, "H   G\ni   o", "two words side by side");
});

describe("makeVerticalDoubleColumn — single word fallback", function () {
  var words = ["Hi"];
  var result = Layouts.makeVerticalDoubleColumn(words);

  assertEqual(result, "H\ni", "single word falls back to single column");
});

describe("makeVerticalDoubleColumn — unequal length", function () {
  var words = ["ABC", "D"];
  var result = Layouts.makeVerticalDoubleColumn(words);

  assertEqual(result, "A   D\nB    \nC    ", "shorter word padded with spaces");
});

// ---- Decoration tests ----

describe("bullet prefix on simple output", function () {
  var output = Layouts.makeVerticalSimple(["Hi"], "stack");
  var decorated = Deco.applyVerticalPrefixDecorator(output, "•");

  assertEqual(decorated, "• H\n• i", "each line gets bullet prefix");
});

describe("emoji prefix on spaced output", function () {
  var output = Layouts.makeVerticalSpaced(["AB"], "stack");
  var decorated = Deco.applyVerticalPrefixDecorator(output, "✨");

  // "A\n\nB" → "✨ A\n\n✨ B"
  assertEqual(decorated, "✨ A\n\n✨ B", "emoji prefix, blank lines preserved");
});

describe("divider insertion on simple output", function () {
  var output = Layouts.makeVerticalSimple(["AB"], "stack");
  // "A\nB"
  var decorated = Deco.applyVerticalDividerDecorator(output, "───", "simple");

  assertEqual(decorated, "A\n───\nB", "divider inserted between letters");
});

describe("divider preserves blank lines between word blocks", function () {
  var output = Layouts.makeVerticalSimple(["Hi", "Go"], "stack");
  // "H\ni\n\nG\no"
  var decorated = Deco.applyVerticalDividerDecorator(output, "---", "simple");

  // Divider between H and i, NOT across blank line, divider between G and o
  assertEqual(decorated, "H\n---\ni\n\nG\n---\no", "divider only between non-empty lines");
});

describe("divider fallback on double column (prefix behavior)", function () {
  var output = Layouts.makeVerticalDoubleColumn(["Hi", "Go"]);
  // "H   G\ni   o"
  var decorated = Deco.applyVerticalDividerDecorator(output, "───", "double-column");

  assertEqual(decorated, "─── H   G\n─── i   o", "double column uses prefix fallback");
});

describe("applyVerticalDecorator — prefix type", function () {
  var output = "A\nB";
  var decorator = { symbol: "→", type: "prefix" };
  var result = Deco.applyVerticalDecorator(output, decorator, "simple");

  assertEqual(result, "→ A\n→ B", "prefix decorator applied via applyVerticalDecorator");
});

describe("applyVerticalDecorator — divider type", function () {
  var output = "A\nB";
  var decorator = { symbol: "~~~", type: "divider" };
  var result = Deco.applyVerticalDecorator(output, decorator, "simple");

  assertEqual(result, "A\n~~~\nB", "divider decorator applied via applyVerticalDecorator");
});

describe("applyVerticalDecorator — null decorator returns original", function () {
  var output = "A\nB";
  var result = Deco.applyVerticalDecorator(output, null, "simple");

  assertEqual(result, "A\nB", "null decorator returns original text");
});

describe("decoration data completeness", function () {
  var MIN_DECORATION_OPTIONS = 10; // requirement: each group has 10–20 options
  var groups = ["bullets", "arrows", "dots", "dividers", "emojis", "flags"];
  groups.forEach(function (g) {
    assert(DecoData[g] && DecoData[g].length >= MIN_DECORATION_OPTIONS, g + " has at least " + MIN_DECORATION_OPTIONS + " options");
  });
});

// ---- Summary ----
console.log("\n─────────────────────────");
console.log("Tests: " + (passed + failed) + " | Passed: " + passed + " | Failed: " + failed);
console.log("─────────────────────────");

if (failed > 0) {
  process.exit(1);
}
