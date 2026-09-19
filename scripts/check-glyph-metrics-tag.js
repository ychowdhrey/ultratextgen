#!/usr/bin/env node
/*
 * check-glyph-metrics-tag.js — gate. Whole-site rather than diff-scoped, on
 * purpose: the shape it catches is a page generator emitting a template
 * without the tag, so a new page arrives untagged from a file the PR may not
 * touch. It gates rather than informs because there is no backlog to be
 * permanently red against -- the injector closes any gap in one run.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { glob } = require("glob");
const T = require("./lib/glyph-metrics-tag");

(async () => {
  const files = await glob("**/index.html", {
    cwd: process.cwd(), ignore: ["node_modules/**", ".git/**"], absolute: true
  });
  const bad = [];
  let relevant = 0;
  for (const f of files) {
    const html = fs.readFileSync(f, "utf8");
    const r = T.inspect(html);
    if (!r.relevant) continue;
    relevant++;
    if (!r.ok) bad.push(path.relative(process.cwd(), f) + "  — " + r.reason);
  }
  console.log("glyphMetrics tag check");
  console.log("  pages loading printablesEngine.js: " + relevant);
  console.log("  correctly tagged:                  " + (relevant - bad.length));
  if (bad.length) {
    console.log("\n  " + bad.length + " page(s) wrong:");
    bad.slice(0, 20).forEach((x) => console.log("    " + x));
    if (bad.length > 20) console.log("    … and " + (bad.length - 20) + " more");
    console.log("\n  fix: npm run inject:glyph-metrics-tag -- --write");
    process.exit(1);
  }
  console.log("\nAll printables pages load glyphMetrics.js before the engine. ✓");
})();
