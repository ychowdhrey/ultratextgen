/* node js/printables/spelling.test.js  —  npm run test:spelling
   ---------------------------------------------------------------
   The spelling generator reads a pasted list through js/printables/wordList.js,
   the parser the word search, the scramble and the crossword share. Before
   that it had its own split on newline, comma and semicolon, so one paste was
   different words on different tools, and the failures were silent: a
   numbered list ("1. Apple - a fruit") and a spreadsheet row
   ("Banana<TAB>yellow fruit") were 0 words here and 2 on the word search, and
   a 25-word list printed 20 with nothing naming the other five.

   So this asserts the two claims a teacher relies on: the same paste is the
   same words here as on the puzzles, and nothing past the cap disappears
   without being named. No browser, no dependency. */
"use strict";
const fs = require("fs");
const path = require("path");
global.window = {};
new Function(fs.readFileSync(path.join(__dirname, "wordList.js"), "utf8"))();
new Function(fs.readFileSync(path.join(__dirname, "wordSearch.js"), "utf8"))();
new Function(fs.readFileSync(path.join(__dirname, "wordPuzzles.js"), "utf8"))();
const WL = global.window.UltraTextGen.wordList;
const WS = global.window.UltraTextGen.wordSearch;
const CW = global.window.UltraTextGen.crossword;
const SC = global.window.UltraTextGen.wordScramble;
const CAP = 20; // SP_MAX_WORDS in printablesEngine.js

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; return; }
  fail++;
  console.log("  FAIL  " + msg);
}
function eq(a, b, msg) { ok(a === b, msg + " — got " + JSON.stringify(a) + ", expected " + JSON.stringify(b)); }

const sp = (t) => WL.spelling(t, CAP, 20);
const spWords = (t) => sp(t).words.map((w) => w.word.toLowerCase()).join(" ");
const lower = (list) => list.map((w) => w.display.toLowerCase()).join(" ");

// The standard pastes, each meaning the same five words.
const FIVE = "apple banana orange mango grape";
const PASTES = {
  comma: "Apple, Banana, Orange, Mango, Grape",
  newline: "Apple\nBanana\nOrange\nMango\nGrape",
  bar: "Apple|Banana|Orange|Mango|Grape",
  numbered: "1. Apple - a fruit\n2. Banana - yellow\n3) Orange\n4. Mango\n5. Grape",
  tab: "Apple\ta red fruit\nBanana\tyellow fruit\nOrange\tcitrus\nMango\tsweet\nGrape\tvine",
  clue: "Apple = a red, crunchy fruit\nBanana = long, yellow\nOrange = citrus\nMango = sweet\nGrape = grows on a vine",
  markdown: "1. **Apple** – a red fruit\n2. **Banana** – yellow\n- Orange\n* Mango\n• Grape"
};

Object.keys(PASTES).forEach((k) => {
  const t = PASTES[k];
  eq(spWords(t), FIVE, "spelling reads the " + k + " paste as the five words");
  eq(lower(WS.normalizeWords(t)), FIVE, "word search reads the " + k + " paste as the same five words");
  eq(lower(SC.normalizeWords(t)), FIVE, "scramble reads the " + k + " paste as the same five words");
  eq(lower(CW.normalizeWords(t)), FIVE, "crossword reads the " + k + " paste as the same five words");
  eq(sp(t).skipped.length, 0, "spelling skips nothing in the " + k + " paste");
});

// Spelling's own two rules on top of the shared reading.
const br = sp("fr[ie]nd\nbec[au]se");
eq(br.words.map((w) => w.word).join(" "), "friend because", "brackets mark the tricky part and are not letters");
eq(JSON.stringify(br.words[0].tricky), "[2,4]", "fr[ie]nd marks letters 2-4");
eq(br.words[0].typed, "fr[ie]nd", "the typed form keeps its brackets, so a link reopens the same marking");
eq(JSON.stringify(sp("ice cream\nfriend").skipped), "[\"ice cream\"]", "an entry with a space is reported, not printed");
eq(JSON.stringify(sp("supercalifragilisticexpialidocious").skipped), "[\"supercalifragilisticexpialidocious\"]", "a word over 20 letters is reported");
eq(spWords("Apple\napple\nAPPLE"), "apple", "duplicates by spelling are dropped");
eq(spWords("niño, año, Straße"), "niño año straße", "accents and ß are letters");

// The cap names what it leaves out.
const many = Array.from({ length: 25 }, (_, i) => "word" + String.fromCharCode(97 + i)).join("\n");
const capped = sp(many);
eq(capped.words.length, CAP, "25 words print the first 20");
eq(capped.over.join(" "), "wordu wordv wordw wordx wordy", "the 5 past the cap are named");
eq(sp("a\nb\nc").over.length, 0, "a short list has nothing over the cap");
eq(sp(many + "\nworda").over.length, 5, "a duplicate past the cap is not counted as left out");

// A link carries the list so the receiving tool reads the same words.
Object.keys(PASTES).forEach((k) => {
  const back = WL.fromParam(WL.toCarry(PASTES[k], false).join("|"));
  eq(spWords(back), FIVE, "the " + k + " paste survives a ?words= round trip into spelling");
});
eq(WL.fromParam(WL.toCarry("fr[ie]nd\nbec[au]se", false).join("|")), "fr[ie]nd\nbec[au]se", "brackets survive the round trip");

/* "Same list, another activity": a list typed on one tool reaches the next
   as that tool reads it. carryFor() writes the link; fromParam() is what the
   receiving page puts in its box. Every paste must be the same five words on
   every destination, the crossword must keep a clue's comma, and only
   spelling may receive the fr[ie]nd brackets. */
{
  const via = (t, kind) => WL.fromParam(WL.carryFor(t, kind).join("|"));
  Object.keys(PASTES).forEach((k) => {
    const t = PASTES[k];
    eq(spWords(via(t, "spelling")), FIVE, "carry " + k + " -> spelling");
    eq(lower(WS.normalizeWords(via(t, "words"))), FIVE, "carry " + k + " -> word search");
    eq(lower(SC.normalizeWords(via(t, "words"))), FIVE, "carry " + k + " -> scramble");
    eq(lower(CW.normalizeWords(via(t, "clues"))), FIVE, "carry " + k + " -> crossword");
    eq(via(t, "words").split("\n").join(" ").toLowerCase(), FIVE, "carry " + k + " -> handwriting Word list, one word a line");
  });
  const clued = CW.normalizeWords(via(PASTES.clue, "clues")).map((w) => w.clue).join(" | ");
  eq(clued, "a red, crunchy fruit | long, yellow | citrus | sweet | grows on a vine", "a clue's comma reaches the crossword");
  eq(CW.normalizeWords(via(PASTES.tab, "clues"))[0].clue, "a red fruit", "a tab table's clue reaches the crossword");
  eq(via("fr[ie]nd\nbec[au]se", "spelling"), "fr[ie]nd\nbec[au]se", "spelling receives the brackets");
  eq(via("fr[ie]nd\nbec[au]se", "words"), "friend\nbecause", "the puzzles and handwriting receive the bare word");
  eq(via("fr[ie]nd = a pal", "clues"), "friend = a pal", "the crossword receives the bare word with its clue");
  eq(WL.carryFor("", "words").length, 0, "an empty box carries nothing");
}

console.log("\nspelling.test.js — " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
