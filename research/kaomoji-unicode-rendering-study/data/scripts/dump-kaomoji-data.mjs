#!/usr/bin/env node
// Reads the kaomoji generator's and decoder's data files by evaluating them in a sandbox (no pattern matching) and prints JSON:
// the part banks, the 16 starter faces assembled with the generator's own formula, the named faces and the character glossary.
// Usage: node dump-kaomoji-data.mjs <site checkout>
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm";
const root = process.argv[2]; if (!root) throw new Error("checkout path required");
const ctx = { window: {} }; vm.createContext(ctx);
for (const f of ["kaomojiData.js", "kaomojiDict.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "js/kaomoji", f), "utf8"), ctx, { filename: f });
}
const D = ctx.window.UTG_KAOMOJI_DATA, K = ctx.window.UTG_KAOMOJI_DICT;
const get = (bank, id) => D.PARTS[bank].find(p => p.id === id);
// Formula copied from kaomojiPageController.js assembleFrom (lines 59-68)
const assemble = s => { const a = get("arms", s.arms), b = get("brackets", s.brackets), c = get("cheeks", s.cheeks),
  e = get("eyes", s.eyes), mo = get("mouths", s.mouths), d = get("decorations", s.decorations);
  return a.l + b.l + c.l + e.l + mo.c + e.r + c.r + b.r + a.r + (d.c || ""); };
const out = {
  part_counts: Object.fromEntries(Object.entries(D.PARTS).map(([k, v]) => [k, v.length])),
  parts: D.PARTS, moods: D.MOODS,
  presets: D.PRESETS.map(p => ({ label: p.label, parts: p.parts, face: assemble(p.parts) })),
  named: K.NAMED, chars: K.CHARS,
  named_count: K.NAMED.length, chars_count: Object.keys(K.CHARS).length
};
process.stdout.write(JSON.stringify(out, null, 1) + "\n");
