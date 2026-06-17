// Extract the inline `var GROUPS = [...]` collection array from a legacy
// library page and print it as JSON. Used by generate-collection-pins.py for
// the ~24 legacy collection pages (the spec pages carry collections[] in JSON).
// Bracket-matched slice + eval handles JS string escapes (e.g. ¯\_(ツ)_/¯).
const fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");
const at = src.indexOf("var GROUPS");
if (at < 0) { process.stderr.write("no GROUPS\n"); process.exit(2); }
const s = src.slice(at);
const start = s.indexOf("[");
let depth = 0, end = -1;
for (let j = start; j < s.length; j++) {
  const c = s[j];
  if (c === "[") depth++;
  else if (c === "]") { depth--; if (depth === 0) { end = j; break; } }
}
const GROUPS = eval(s.slice(start, end + 1)); // eslint-disable-line no-eval
process.stdout.write(JSON.stringify(GROUPS));
