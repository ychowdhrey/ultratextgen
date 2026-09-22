/* node js/printables/renderInvariants.test.js  —  npm run test:render-invariants
   ---------------------------------------------------------------------------
   The rules a printed sheet's geometry must satisfy, tested against geometry
   that was MEASURED rather than drawn.

   The fixtures in renderInvariants.fixtures.json are two recordings of
   /printables/word-search-maker/ at its DEFAULT settings — ten words, one grid
   — taken in headless Chromium on 2026-09-22, at the exact moment the PDF
   exporter rasterises. Each recording holds two trees:

     source  the live print surface, which is correct in both recordings
     clone   the subtree printablePdf.js actually paints: a copy with an
             allow-list of computed properties inlined onto it

   `before` is commit 11d281455, where the allow-list carried neither
   `column-count` nor `column-width`; `after` is this branch merged with the
   `--pt-sheet-h` repair that landed on main in between, so the pair differs in
   the export list and nothing else. `.pt-search-words` is `columns: 3 8rem`;
   the clone lost the columns, kept the height they had produced, and the clue
   list ran 165px out of the bottom of its own box — across the Name/Date row,
   across the credit QR, and off the page. Three of ten words were missing from
   the downloaded file.

   `after` is the same page with `columns` on the list.

   THE POINT OF TESTING BOTH TREES. In `before`, the SOURCE tree is clean: the
   page, the preview and every assertion over the DOM pass. The defect exists
   only in the clone. A check that looked at the live sheet would have reported
   this page as correct, which is what makes the spill rule worth having — and
   why the fixture keeps the passing tree beside the failing one.

   No browser, no font, no dependency. */
"use strict";
const fs = require("fs");
const path = require("path");
const RI = require("./renderInvariants.js");
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, "renderInvariants.fixtures.json"), "utf8"));

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (detail ? "  — " + detail : "")); }
}
function box(x, y, w, h) { return { x: x, y: y, w: w, h: h }; }
function node(id, b, children, clips) { return { id: id, box: b, clips: !!clips, children: children || [] }; }

console.log("\nunit — the rules themselves");
{
  const parent = node("sheet", box(0, 0, 100, 100), [
    node("a", box(0, 0, 100, 40)),
    node("b", box(0, 30, 100, 40))
  ]);
  ok("overlapping siblings are a collision", RI.overlaps(parent).length === 1);
  ok("the collision reports its area", RI.overlaps(parent)[0].area === 1000);

  const touching = node("sheet", box(0, 0, 100, 100), [
    node("a", box(0, 0, 100, 40)),
    node("b", box(0, 40, 100, 40))
  ]);
  ok("boxes that merely touch are not a collision", RI.overlaps(touching).length === 0);

  const nested = node("sheet", box(0, 0, 100, 100), [node("inner", box(10, 10, 50, 50))]);
  ok("a child inside its parent is not a collision", RI.overlaps(nested).length === 0);

  const spilling = node("sheet", box(0, 0, 100, 100), [
    node("list", box(0, 0, 100, 20), [node("item", box(0, 0, 100, 60))])
  ]);
  ok("a child past a non-clipping parent spills", RI.spills(spilling).length === 1);
  ok("the spill reports how far", RI.spills(spilling)[0].below === 40);

  const clipped = node("sheet", box(0, 0, 100, 100), [
    node("list", box(0, 0, 100, 20), [node("item", box(0, 0, 100, 60))], true)
  ]);
  ok("a clipping parent does not spill (it cuts)", RI.spills(clipped).length === 0);

  const wide = node("sheet", box(0, 0, 100, 100), [node("row", box(0, 0, 160, 10))]);
  ok("content past the page width is out of bounds", RI.outOfBounds(wide, 100).length === 1);
  ok("out of bounds reports the overrun", RI.outOfBounds(wide, 100)[0].over === 60);
  ok("the sheet itself is not judged against its own width", RI.outOfBounds(node("sheet", box(0, 0, 100, 10), []), 100).length === 0);

  ok("fitScale is 1 when the page fits", RI.fitScale(500, 960) === 1);
  ok("fitScale is the shrink the rasteriser must apply", Math.abs(RI.fitScale(1242, 960) - 0.7729) < 0.0005);
  ok("fitScale survives a zero height", RI.fitScale(0, 960) === 1);
}

console.log("\nrecorded — the word-search export, before the fix (11d281455)");
{
  const b = FIX.before;
  const sourceV = RI.check(b.source, { width: FIX.widthPx });
  ok("the live print surface is clean", sourceV.length === 0, JSON.stringify(sourceV.slice(0, 2)));

  const cloneV = RI.check(b.clone, { width: FIX.widthPx });
  const spills = cloneV.filter((v) => v.code === "SPILL");
  ok("the exported clone is not", cloneV.length > 0);
  ok("and the violation is the clue list escaping its box", spills.length > 0
    && spills.every((s) => s.parent.indexOf("pt-search-words") !== -1));
  const worst = spills.reduce((m, s) => Math.max(m, s.below), 0);
  ok("by more than a line of type", worst > 100, "worst=" + worst);
}

console.log("\nrecorded — the same page after carrying `columns` into the export");
{
  const a = FIX.after;
  ok("the live print surface is still clean", RI.check(a.source, { width: FIX.widthPx }).length === 0);
  const cloneV = RI.check(a.clone, { width: FIX.widthPx });
  ok("and so is the clone", cloneV.length === 0, JSON.stringify(cloneV.slice(0, 3)));
}

/* Deliberately NOT asserted here: that the recorded sheet fits a US Letter
   page. It does not — 994.4px against a 960px content box — because its
   CONTENT exceeds the page rather than its height budget being wrong, which is
   RF-015/FIX-1 in docs/printables/render-fidelity-audit-2026-09-22.md and is
   not what this module or these recordings are about. Asserting it would make
   this test a permanent red against a known backlog item, which is how a check
   gets ignored; asserting its NEGATION would make it go red the day somebody
   fixes it. The fit rule is unit-tested above on numbers instead. */

console.log("\n" + (fail ? "FAIL" : "PASS") + " — " + pass + " passed, " + fail + " failed\n");
process.exit(fail ? 1 : 0);
