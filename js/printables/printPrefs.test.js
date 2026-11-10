/* Paper default from the visitor's preferred languages.
   Run: node js/printables/printPrefs.test.js
   No framework: loads printPrefs.js in a vm with a stub browser and asserts
   defaultPaper() for each language list. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "printPrefs.js"), "utf8");

function stubEl() {
  return {
    style: { setProperty() {} }, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null; }, appendChild() {}, addEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; }
  };
}

function paperFor(languages, pageLang) {
  const store = {};
  const html = stubEl();
  html.getAttribute = (k) => (k === "lang" ? pageLang : null);
  const document = {
    documentElement: html,
    createElement: stubEl, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, head: stubEl(), body: stubEl(), readyState: "complete"
  };
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const window = {
    UltraTextGen: {}, document, localStorage,
    location: { pathname: "/printables/", search: "", origin: "https://example.test" },
    addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} })
  };
  window.window = window;
  const ctx = vm.createContext({
    window, document, localStorage, console, setTimeout, clearTimeout, URLSearchParams,
    navigator: { languages: languages, language: languages[0] }
  });
  vm.runInContext(SRC, ctx, { filename: "printPrefs.js" });
  return window.UltraTextGen.printPrefs.defaultPaper();
}

const CASES = [
  // [navigator.languages, page lang, expected]
  [["de", "en-US", "en"], "de", "a4"],   // bare A4 language first: the fallback's US does not decide
  [["fr", "en-US"], "fr", "a4"],
  [["ja", "en-US"], "ja", "a4"],
  [["pt", "en-US"], "pt", "a4"],
  [["en-US"], "en", "letter"],
  [["en-US", "de"], "de", "letter"],     // the visitor ranked US English first
  [["es-MX", "es"], "es", "letter"],     // a region on the first tag still wins
  [["es-ES"], "es", "a4"],
  [["en-GB", "en"], "en", "a4"],
  [["en"], "en", "letter"],              // no region anywhere: page-language fallback
  [["en"], "de", "a4"],
  [["de-DE"], "en", "a4"]
];

let fail = 0;
for (const [langs, page, want] of CASES) {
  const got = paperFor(langs, page);
  if (got !== want) {
    fail++;
    console.error("FAIL", JSON.stringify(langs), "page=" + page, "want", want, "got", got);
  }
}
if (fail) {
  console.error(fail + " of " + CASES.length + " paper cases failed");
  process.exit(1);
}
console.log("printPrefs paper default: " + CASES.length + " cases pass");
