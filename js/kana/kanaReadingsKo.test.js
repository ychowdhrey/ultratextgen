/*
 * kanaReadingsKo.test.js — every kana on both charts has a Hangul reading.
 *
 *   node js/kana/kanaReadingsKo.test.js
 *
 * The Korean charts print the reading table's value under each kana; a kana
 * missing from the table renders an empty reading line with no error. This
 * loads the two shipped data files and the table the same way the browser
 * does (IIFEs writing to window) and checks every cell, katakana included,
 * through the same hiragana-twin lookup the engine uses.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ["hiraganaData.js", "katakanaData.js", "kanaReadingsKo.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, f), "utf8"), ctx, { filename: f });
}
const table = ctx.window.UltraKanaReadings.ko;
const toHiragana = (s) => s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));

let failures = 0;
let checked = 0;
const fail = (msg) => { failures++; console.error("FAIL " + msg); };

for (const set of ["hiragana", "katakana"]) {
  for (const section of ctx.window.UltraKanaData[set].sections) {
    for (const row of section.rows) {
      for (const cell of row.cells) {
        if (!cell) continue;
        checked++;
        const v = table[toHiragana(cell.k)];
        const h = v && (typeof v === "string" ? v : v.h);
        if (!h) fail(set + " " + cell.k + " (" + cell.r + ") has no Hangul reading");
        else if (!/^[가-힣]+$/.test(h)) fail(set + " " + cell.k + " reading is not Hangul syllables: " + h);
      }
    }
  }
}

// The table must not carry readings for kana no chart shows (a typo key).
const shown = new Set();
for (const set of ["hiragana", "katakana"]) {
  for (const s of ctx.window.UltraKanaData[set].sections) for (const r of s.rows) for (const c of r.cells) if (c) shown.add(toHiragana(c.k));
}
for (const k of Object.keys(table)) if (!shown.has(k)) fail("reading for " + k + " matches no chart cell");

// Spot checks a reader would notice first.
const want = { "あ": "아", "つ": "츠", "を": "오", "ん": "응", "じゃ": "자", "ぴょ": "표" };
for (const [k, h] of Object.entries(want)) {
  const v = table[k];
  if ((typeof v === "string" ? v : v && v.h) !== h) fail(k + " should read " + h);
}

if (checked !== 2 * (46 + 25 + 33)) fail("expected 208 cells across both charts, saw " + checked);
if (failures) { console.error(failures + " failure(s)"); process.exit(1); }
console.log("kana Korean readings: " + checked + " cells OK");
