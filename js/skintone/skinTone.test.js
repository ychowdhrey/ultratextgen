/* Zero-dependency tests for the skin-tone picker in symbol-explorer.js (the @skin-tone block).

   node js/skintone/skinTone.test.js

   The picker decides with a rule which tiles it tones: one grapheme, exactly one
   Emoji_Modifier_Base, no tone yet. Unicode decides which toned forms are standard.
   This test runs the SHIPPED rule (sliced out of symbol-explorer.js, never copied)
   against js/skintone/skinToneExpected.json, which scripts/build-skin-tone-fixture.py
   generates from emoji-test.txt, for every tile in every opted-in section:

     - a tile Unicode has five standard toned forms for must be toned, and each of
       the five outputs must be exactly the standard sequence;
     - a tile Unicode has no toned form for must never be toned;
     - every tile in an opted-in section must be in the fixture (a new opt-in
       without a regenerated fixture fails here, not in production);
     - every opted-in page's language must carry the picker's strings, so no
       locale page shows an English control.

   Then fixed cases the rule must keep: families, combos and already-toned
   sequences are never touched, and a toned base drops its U+FE0F. */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) passed++; else { failed++; console.log("  FAIL " + msg); } }

// ---- slice the shipped rule
const src = fs.readFileSync(path.join(ROOT, "symbol-explorer.js"), "utf8");
const b = src.indexOf("/* @skin-tone:begin */"), e = src.indexOf("/* @skin-tone:end */");
if (b < 0 || e < 0) { console.log("UNKNOWN: @skin-tone markers missing from symbol-explorer.js; nothing was tested"); process.exit(2); }
const api = new Function(src.slice(b, e) + "\nreturn { toneable: toneable, applyTone: applyTone, TONES: SKIN_TONES };")();
if (typeof Intl === "undefined" || !Intl.Segmenter) { console.log("UNKNOWN: this Node has no Intl.Segmenter"); process.exit(2); }

// ---- the fixture and the opted-in tiles
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "skinToneExpected.json"), "utf8")).tiles;
const unesc = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
function pages(dir, out) {
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    if (n.name === "node_modules" || n.name.startsWith(".")) continue;
    const p = path.join(dir, n.name);
    if (n.isDirectory()) pages(p, out);
    else if (n.name === "index.html") out.push(p);
  }
  return out;
}
const opted = [];
for (const f of pages(ROOT, [])) {
  const s = fs.readFileSync(f, "utf8");
  if (s.indexOf("data-skin-tone") < 0) continue;
  const lang = ((s.match(/<html[^>]*\blang="([^"]+)"/) || [])[1] || "en").slice(0, 2).toLowerCase();
  const tiles = [];
  for (const m of s.matchAll(/<section class="mood-explainers" id="([^"]+)" data-skin-tone>([\s\S]*?)<\/section>/g)) {
    for (const t of m[2].matchAll(/data-symbol="([^"]*)"/g)) tiles.push(unesc(t[1]));
  }
  opted.push({ file: path.relative(ROOT, f), lang: lang, tiles: tiles });
}
ok(opted.length > 0, "no opted-in page found: a check that finds nothing has checked nothing");

let toned = 0, untouched = 0;
for (const pg of opted) {
  for (const t of pg.tiles) {
    if (!(t in fixture)) { ok(false, pg.file + ": tile " + JSON.stringify(t) + " missing from the fixture; run scripts/build-skin-tone-fixture.py"); continue; }
    const want = fixture[t];
    if (want) {
      ok(api.toneable(t), pg.file + ": " + JSON.stringify(t) + " has standard toned forms but the rule leaves it alone");
      for (let i = 1; i <= 5; i++) {
        const got = api.applyTone(t, api.TONES[i]);
        ok(got === want[i - 1], pg.file + ": tone " + i + " of " + JSON.stringify(t) + " gave " + JSON.stringify(got) + ", Unicode says " + JSON.stringify(want[i - 1]));
      }
      toned++;
    } else {
      ok(!api.toneable(t), pg.file + ": " + JSON.stringify(t) + " has no standard toned form but the rule would tone it");
      untouched++;
    }
  }
}

// ---- strings: an opted-in page must not show an English control in another language
const enKeys = ["skinTone", "toneDefault", "toneLight", "toneMediumLight", "toneMedium", "toneMediumDark", "toneDark"];
for (const k of enKeys) ok(new RegExp("\\b" + k + ': "').test(src.slice(src.indexOf("    en: {"), src.indexOf("    vi: {"))), "English source literal lacks " + k);
for (const lang of new Set(opted.map((p) => p.lang))) {
  if (lang === "en") continue;
  const file = path.join(ROOT, "locales", (lang === "zh" ? "zh-tw" : lang) + ".json");
  const st = fs.existsSync(file) ? ((JSON.parse(fs.readFileSync(file, "utf8")).ui || {}).skinTone || {}) : {};
  for (const k of ["label", "default", "light", "mediumLight", "medium", "mediumDark", "dark"]) {
    ok(typeof st[k] === "string" && st[k], "locales/" + lang + ".json has no ui.skinTone." + k + " but a " + lang + " page opts in");
  }
}

// ---- fixed cases
const fam = "\u{1F468}‍\u{1F469}‍\u{1F467}";
ok(!api.toneable(fam), "a family must never be toned");
ok(!api.toneable("\u{1F44B}\u{1F60A}"), "a two-emoji combo must never be toned");
ok(!api.toneable("\u{1F44D}\u{1F3FD}"), "an already-toned emoji must never be re-toned");
ok(!api.toneable("\u{1F600}"), "a face takes no tone");
ok(api.applyTone("☝️", "\u{1F3FB}") === "☝\u{1F3FB}", "a toned base drops its U+FE0F");
ok(api.applyTone("\u{1F575}️‍♀️", "\u{1F3FF}") === "\u{1F575}\u{1F3FF}‍♀️", "only the base's U+FE0F goes; the sign's stays");
ok(api.applyTone("\u{1F44D}", "") === "\u{1F44D}", "the default tone returns the base unchanged");

console.log("skin tone: " + opted.length + " opted-in pages, " + toned + " toneable tiles x 5 tones, " + untouched + " left as they are");
console.log(failed ? failed + " failed, " + passed + " passed" : "all " + passed + " checks pass");
process.exit(failed ? 1 : 0);
