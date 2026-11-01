#!/usr/bin/env node
"use strict";

/**
 * Gate: every rule in `_redirects` is one Cloudflare Pages will actually serve.
 *
 * Why this exists (2026-09-14): `/cdn-cgi/*` sat at line 151 of the file, and
 * because Cloudflare compiles every rule below a splat as a DYNAMIC rule - cap
 * 100, against static's 2,000 - the last eight retirement 301s in the file were
 * silently dropped. /library/heart-emoji/, /es/library/emoji-corazon/,
 * /pt/letras-para-copiar/ and /es/conversor-de-letras/ served 404 in production
 * for a month, with the correct rules sitting in this file the whole time, and
 * nothing on the site, in CI or in a build log that anyone reads said a word.
 * The repo's own recurring lesson: a check that reports nothing is
 * indistinguishable from a check that passes.
 *
 * Gating rather than informational, and whole-file rather than diff-scoped: the
 * file carries zero violations today, so there is no backlog to be permanently
 * red against (same call as check:zalgo-decodes and check:funding-choices), and
 * a rule added mid-file breaks rules the PR never touched, which a diff-scoped
 * check could not see.
 *
 * Usage: node scripts/check-redirects.js [--file <path>]
 */

const fs = require("fs");
const path = require("path");
const { parseRedirects, missingSlashTwins, MAX_STATIC_REDIRECT_RULES, MAX_DYNAMIC_REDIRECT_RULES } = require("./lib/redirects-parse.js");

const argv = process.argv.slice(2);
const fileArg = argv.indexOf("--file");
const file = fileArg !== -1 ? argv[fileArg + 1] : path.join(__dirname, "..", "_redirects");
// The tree the rules are served from. Defaults to the file's own directory, so
// `--file` on a probe copy still resolves pages against the checkout it sits in
// unless --root says otherwise.
const rootArg = argv.indexOf("--root");
const root = rootArg !== -1 ? argv[rootArg + 1] : path.dirname(path.resolve(file));

const text = fs.readFileSync(file, "utf8");
const r = parseRedirects(text);
const errors = [];

// Dropped rules are reported as ONE finding, not one per line: a splat near the
// top demotes hundreds of rules at once, and a wall of identical findings buries
// the one line that has to move.
const skipped = r.invalid.filter((i) => i.skipped);
const rejected = r.invalid.filter((i) => !i.skipped);

for (const bad of rejected) {
  errors.push(`${file}:${bad.lineNo}  ${bad.reason}\n      ${bad.line}`);
}

if (skipped.length) {
  const sample = skipped.slice(0, 8).map((sk) => `        line ${sk.lineNo}: ${sk.line}`).join("\n");
  errors.push(
    `${file}:${r.capHitAtLine}  ${skipped.length} rule(s) past this line are DROPPED — the file ` +
    `exceeded Cloudflare's ${MAX_DYNAMIC_REDIRECT_RULES}-rule dynamic cap. These URLs serve 404, ` +
    `not the redirect written here:\n${sample}` +
    (skipped.length > 8 ? `\n        ... and ${skipped.length - 8} more` : "")
  );
}

if (r.demoted.length) {
  const firstSplat = r.rules.find((x) => x.ownDynamic);
  errors.push(
    `${file}:${firstSplat ? firstSplat.lineNo : "?"}  the splat rule here demotes ${r.demoted.length} ` +
    `static rule(s) below it (lines ${r.demoted[0].lineNo}-${r.demoted[r.demoted.length - 1].lineNo}) into the ` +
    `${MAX_DYNAMIC_REDIRECT_RULES}-rule dynamic bucket instead of the ${MAX_STATIC_REDIRECT_RULES}-rule static one\n` +
    `      ${firstSplat ? `${firstSplat.from} -> ${firstSplat.to}` : ""}\n` +
    `      Fix: move every splat/placeholder rule to the BOTTOM of the file. Ordering costs ` +
    `nothing — Cloudflare matches static rules first wherever they sit.`
  );
}

// A retirement written for one trailing-slash spelling 404s on the other
// (added 2026-11-01; see missingSlashTwins). An unreadable tree is UNKNOWN,
// not clean: without it every twin would read as unserved and fail, or, worse,
// a wrong root would read every twin as served and pass.
if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error(`UNKNOWN: --root ${root} has no index.html, so the twin check cannot tell which paths serve a page`);
  process.exit(2);
}
const servesPage = (p) => {
  const rel = p.replace(/^\//, "");
  return p.endsWith("/")
    ? fs.existsSync(path.join(root, rel, "index.html"))
    : fs.existsSync(path.join(root, `${rel}.html`));
};
const twins = missingSlashTwins(r.rules, servesPage);
if (twins.length) {
  const sample = twins.slice(0, 12).map((t) => `        line ${t.lineNo}: add  ${t.twin}  ${t.to}  301   (twin of ${t.from})`).join("\n");
  errors.push(
    `${twins.length} retirement rule(s) cover one trailing-slash spelling only. Pages matches a source ` +
    `exactly and adds its own slash 308 only while the directory exists, so the other spelling of a ` +
    `retired URL serves 404:\n${sample}` + (twins.length > 12 ? `\n        ... and ${twins.length - 12} more` : "") +
    `\n      Fix: add the twin line beside its original, same target and status.`
  );
}

if (r.staticCount > MAX_STATIC_REDIRECT_RULES) {
  errors.push(`${r.staticCount} static rules exceeds Cloudflare's cap of ${MAX_STATIC_REDIRECT_RULES}`);
}
if (r.dynamicCount > MAX_DYNAMIC_REDIRECT_RULES) {
  errors.push(`${r.dynamicCount} dynamic rules exceeds Cloudflare's cap of ${MAX_DYNAMIC_REDIRECT_RULES}`);
}

const splats = r.rules.filter((x) => x.ownDynamic);
console.log(`_redirects: ${r.rules.length} live rules — ${r.staticCount} static (cap ${MAX_STATIC_REDIRECT_RULES}), ${r.dynamicCount} dynamic (cap ${MAX_DYNAMIC_REDIRECT_RULES})`);
if (splats.length) {
  console.log(`  splat/placeholder rules, which must stay last: ${splats.map((s) => `${s.from} (line ${s.lineNo})`).join(", ")}`);
}

if (errors.length) {
  console.error(`\n✗ ${errors.length} problem(s) — these rules do not do what the file says they do:\n`);
  errors.forEach((e) => console.error(`  • ${e}\n`));
  console.error(`Verify any change against Cloudflare's own parser: npx wrangler pages dev . --port 8788`);
  process.exit(1);
}

console.log("✓ every rule parses, none is dropped, both caps have headroom");
