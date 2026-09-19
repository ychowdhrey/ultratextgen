#!/usr/bin/env node
/*
 * inject-glyph-metrics-tag.js — put glyphMetrics.js before printablesEngine.js
 * on every page that loads the engine. Idempotent; report-only without --write.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { glob } = require("glob");
const T = require("./lib/glyph-metrics-tag");

(async () => {
  const write = process.argv.includes("--write");
  const files = await glob("**/index.html", {
    cwd: process.cwd(), ignore: ["node_modules/**", ".git/**"], absolute: true
  });
  let relevant = 0, changed = 0, already = 0;
  const fixed = [];
  for (const f of files) {
    const html = fs.readFileSync(f, "utf8");
    if (!T.needsTag(html)) continue;
    relevant++;
    const before = T.inspect(html);
    const next = T.apply(html);
    if (next === html) { already++; continue; }
    if (before.ok) { already++; continue; }
    changed++;
    fixed.push(path.relative(process.cwd(), f) + "  (" + before.reason + ")");
    if (write) fs.writeFileSync(f, next);
  }
  console.log("glyphMetrics tag injector");
  console.log("  pages loading printablesEngine.js: " + relevant);
  console.log("  already correct:                   " + already);
  console.log("  " + (write ? "fixed:" : "would fix:").padEnd(34) + changed);
  fixed.slice(0, 10).forEach((x) => console.log("    " + x));
  if (fixed.length > 10) console.log("    … and " + (fixed.length - 10) + " more");
  if (!write && changed) console.log("\n  run with --write to apply");
})();
