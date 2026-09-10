#!/usr/bin/env node
"use strict";

/**
 * build-accent-notice.js
 *
 * Bake the input-aware accent notice into every generator page whose locale
 * has copy for it.
 *
 * WHY
 * ---
 * accent-notice.js watches the generator input and, only once the user has
 * typed a diacritic, explains that most styles now keep the mark and names the
 * ones that do not. It has to say that, because renderer.js's
 * BASE_LETTER_FALLBACK silently folds the letters with no decomposition —
 * Strasse for Straße, cour for cœur, Pawel for Paweł — on most styles, and the
 * user has no other way to find out.
 *
 * The module worked. Its placement did not: it had only ever been pasted onto
 * homepages plus whatever pages one locale's editor happened to reach, so it
 * sat on 47 pages out of 564 with a #mainInput, unevenly — 20 Italian pages,
 * 14 French, 7 Dutch, one page each for five more locales.
 *
 * ONE STRING, ONE OWNER
 * ---------------------
 * The sentence is per locale, not per page, so it lives once in
 * data/accent_notice_copy.json and is baked from there. Five hundred
 * hand-pasted copies of one sentence is a drift factory, and this repo has the
 * scar tissue to prove it; --check is what keeps the pages and the table from
 * disagreeing.
 *
 * WHAT IT WILL NOT DO
 * -------------------
 * A locale with no entry in the table is not deployed, and the run says so by
 * name. That is deliberate: the notice makes a factual claim about what the
 * renderer does to the reader's own script, and it is false or dead for
 * several of them. Measured against the live registry:
 *
 *   - Cyrillic, Arabic, Thai, CJK and Devanagari get no letter substitution at
 *     all — the map styles are Latin-only, and the ~50 styles that do "change"
 *     them are spacing decorators. Telling a Russian reader that bold and
 *     gothic keep their marks is not true there.
 *   - Those scripts also mostly cannot fire it: Arabic harakat sit at
 *     U+064B..U+0652, outside the U+0300..U+036F range the module tests. But
 *     Russian is worse than dead, it is wrong — й is И + U+0306, so an ordinary
 *     sentence like "мой" trips a notice whose claim does not hold.
 *
 * So absence from the table is a finding to be reported, never a silent skip.
 *
 * TWO VARIANTS, AND THE SECOND IS NOT OPTIONAL
 * --------------------------------------------
 * On a page about upside-down text the shared sentence is backwards. Measured:
 * "café Straße" renders as "ǝßɐɹʇS éɟɐɔ" — the é and ß pass through UPRIGHT and
 * unchanged, so nothing is kept styled and nothing folds to plain either. The
 * upside-down family is type:'function' and never reaches BASE_LETTER_FALLBACK.
 * Those pages take the 'upsideDown' string. Italian had already worked this out
 * by hand on it/testo-capovolto; this makes it a rule rather than a habit.
 *
 * USAGE
 *   node scripts/build-accent-notice.js            # check (npm run check:accent-notice)
 *   node scripts/build-accent-notice.js --write    # bake  (npm run build:accent-notice)
 *   node scripts/build-accent-notice.js --report   # what each locale would get
 */

const fs = require("fs");
const path = require("path");
const { globSync } = require("glob");

const REPO = path.resolve(__dirname, "..");
const TABLE = path.join(REPO, "data", "accent_notice_copy.json");
const TIERS = path.join(REPO, "data", "locale_qualification_tiers.json");

const OPEN = '<div class="accent-notice" id="accentNotice" role="note" hidden>';
const SCRIPT_TAG = '<script src="/accent-notice.js" defer></script>';
const COMMENT = "<!-- Accent-aware hint: shows only when the input contains diacritics -->";

// Locale codes come from the canonical registry, never from a filesystem glob:
// zh-tw is five characters and a two-character glob has silently skipped it
// before (see CLAUDE.md, "Do not discover locales with a filesystem glob").
function localeCodes() {
  const out = new Set();
  (function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        if (v && typeof v === "object" && "tier" in v) out.add(k);
        walk(v);
      }
    }
  })(JSON.parse(fs.readFileSync(TIERS, "utf8")));
  return out;
}

function localeOf(rel, codes) {
  const first = rel.split("/")[0];
  return codes.has(first) ? first : "en";
}

function excluded(rel, exclusions) {
  for (const [pattern, reason] of Object.entries(exclusions)) {
    // One pass, not three: a chain of .replace() calls rewrites its own output —
    // "**/embed/**" became "(?:.[^/]*/)?embed/.[^/]*" because the last step ate
    // the dot-stars the previous one had just produced, and the exclusion
    // silently matched nothing.
    const re = new RegExp(
      "^" + pattern.replace(/\*\*\/|\*\*|\*|[.+^${}()|[\]\\?]/g, (tok) => {
        if (tok === "**/") return "(?:.*/)?";
        if (tok === "**") return ".*";
        if (tok === "*") return "[^/]*";
        return "\\" + tok;
      }) + "$"
    );
    if (re.test(rel)) return reason;
  }
  return null;
}

// A page is an upside-down page if it IS category/upside-down-text or declares
// it as its English parent — read off the page, never guessed from its slug,
// because every locale names it differently (kopfueber-text, texto-al-reves,
// chu-nguoc, testo-capovolto...).
function isUpsideDown(rel, html) {
  if (rel.startsWith("category/upside-down-text/")) return true;
  return /hreflang="en"\s+href="[^"]*\/category\/upside-down-text\/"/.test(html);
}

// `openTag` lets an existing notice keep its own serialization of the opening
// div. A page written by an HTML serializer carries hidden="" where the source
// template has bare hidden; they are the same attribute, and rewriting 45
// already-correct pages to normalize it is churn that hides the real diffs.
// The icon is per locale, not decoration: Dutch shows a trema (◌̈) because
// Dutch readers type ë and ï, not é. Hardcoding the acute would have silently
// overwritten that on seven live pages.
// The English page a locale page declares as its parent, as a repo-relative
// path. Read off the page's own hreflang, the same join the rest of the repo
// uses — never guessed from a slug, because every locale names its pages
// differently.
// x-default is the documented fallback: a ratified local-only page declares no
// hreflang="en" at all, only a self-reference and an x-default on the bare
// homepage (see CLAUDE.md, "Ratified local-only exceptions"). The homepage is a
// generator, so those pages have a deployable counterpart even though they have
// no translation parent — es/fuentes-de-letras, tr/sekilli-yazi, ja/gal-moji
// and 16 more would otherwise be skipped for the wrong reason.
function enParentOf(html) {
  const m = html.match(/hreflang="en"\s+href="https:\/\/ultratextgen\.com(\/[^"]*)"/)
         || html.match(/hreflang="x-default"\s+href="https:\/\/ultratextgen\.com(\/[^"]*)"/);
  if (!m) return null;
  const p = m[1].replace(/^\//, "").replace(/\/$/, "");
  return p ? p + "/index.html" : "index.html";
}

function block(text, dismiss, indent, openTag, comment, icon) {
  return [
    comment === false ? null : COMMENT,
    openTag || OPEN,
    `  <span class="accent-notice-icon" aria-hidden="true">${icon || "◌́"}</span>`,
    `  <span class="accent-notice-text">${text}</span>`,
    `  <button type="button" class="accent-notice-close" id="accentNoticeClose" aria-label="${dismiss}">✕</button>`,
    "</div>",
  ].filter((l) => l !== null).map((l) => (l ? indent + l : l)).join("\n");
}

// End of the </div> that closes the wrapper holding #mainInput. Returns null
// rather than a best guess: a page whose input we cannot place around is
// reported, never patched blind.
function wrapperEnd(html, inputIdx) {
  const opens = [...html.slice(0, inputIdx).matchAll(/<div\b[^>]*>/gi)]
    .filter((m) => /class="[^"]*(input-wrapper|input-section)/i.test(m[0]));
  if (!opens.length) return null;
  const start = opens[opens.length - 1].index;
  let depth = 0;
  for (const m of html.slice(start).matchAll(/<\/?div\b[^>]*>/gi)) {
    depth += m[0].startsWith("</") ? -1 : 1;
    if (depth === 0) {
      const end = start + m.index + m[0].length;
      return end < inputIdx ? null : end;
    }
  }
  return null;
}

function indentAt(html, pos) {
  const ls = html.lastIndexOf("\n", pos) + 1;
  return (html.slice(ls, pos).match(/^[ \t]*/) || [""])[0];
}

function withScriptTag(html) {
  if (html.includes("/accent-notice.js")) return html;
  for (const anchor of [
    '<script src="/script.js" defer></script>',
    '<script src="/script.js" defer=""></script>',
    '<script src="upside-down.js"></script>',
    '<script src="/renderer.js" defer></script>',
    '<script src="/renderer.js" defer=""></script>',
  ]) {
    const i = html.indexOf(anchor);
    if (i !== -1) {
      const end = i + anchor.length;
      return html.slice(0, end) + "\n" + indentAt(html, i) + SCRIPT_TAG + html.slice(end);
    }
  }
  const b = html.lastIndexOf("</body>");
  return b === -1 ? null : html.slice(0, b) + SCRIPT_TAG + "\n" + html.slice(b);
}

function main() {
  const write = process.argv.includes("--write");
  const report = process.argv.includes("--report");
  const table = JSON.parse(fs.readFileSync(TABLE, "utf8"));
  const codes = localeCodes();
  const files = globSync("**/index.html", {
    cwd: REPO, ignore: ["node_modules/**", "assets/**"],
  }).sort();

  const changed = [], ok = [], skipped = new Map(), failed = [];

  // Pass 1 — which English pages are deployable at all. A locale page is then
  // gated on its own parent, so one rule covers two failures the translation-
  // parity gate caught: the locale translations of an excluded English page
  // (fr/usecase/traducteur-emoji and friends run the same emoji-tool.js, so a
  // path-shaped exclusion missed them), and locale pages that carry a
  // generator their English parent does not have at all
  // (pl/ozdobniki, it/combinazioni-emoji, pl/usecase/nazwy-do-robloxa).
  // Deploying to either widens an EN/locale gap this pass has no business
  // widening.
  const deployableEn = new Set();
  for (const rel of files) {
    if (localeOf(rel, codes) !== "en") continue;
    const html = fs.readFileSync(path.join(REPO, rel), "utf8");
    if (!html.includes('id="mainInput"')) continue;
    if (excluded(rel, table.exclusions || {})) continue;
    deployableEn.add(rel);
  }

  for (const rel of files) {
    const abs = path.join(REPO, rel);
    let html = fs.readFileSync(abs, "utf8");
    if (!html.includes('id="mainInput"')) continue;

    const why = excluded(rel, table.exclusions || {});
    if (why) { push(skipped, "excluded: " + why, rel); continue; }

    const lc = localeOf(rel, codes);
    if (lc !== "en" && !html.includes('id="accentNotice"')) {
      const parent = enParentOf(html);
      if (!parent) {
        push(skipped, "no declared English parent", rel); continue;
      }
      if (!deployableEn.has(parent)) {
        push(skipped, `English parent is not deployable (${parent})`, rel); continue;
      }
    }
    const entry = (table.locales || {})[lc];
    if (!entry) { push(skipped, `no copy for locale "${lc}"`, rel); continue; }
    if (entry.propagate === false && !html.includes('id="accentNotice"')) {
      push(skipped, `locale "${lc}" is not propagated: ${entry.propagateNote || ""}`, rel);
      continue;
    }

    const variant = isUpsideDown(rel, html) ? "upsideDown" : "default";
    const text = entry[variant] || entry.default;
    if (variant === "upsideDown" && !entry.upsideDown) {
      push(skipped, `locale "${lc}" has no upsideDown variant`, rel); continue;
    }

    const inputIdx = html.indexOf('id="mainInput"');
    const end = wrapperEnd(html, inputIdx);
    const existing = html.indexOf('<div class="accent-notice"');
    if (existing === -1 && end === null) {
      failed.push([rel, "could not locate the input wrapper"]); continue;
    }

    let next;
    if (existing !== -1) {
      const closeIdx = html.indexOf("</div>", html.indexOf("accent-notice-close", existing));
      if (closeIdx === -1) { failed.push([rel, "unterminated notice block"]); continue; }
      let start = existing, hadComment = false;
      const c = html.lastIndexOf(COMMENT, existing);
      if (c !== -1 && html.slice(c + COMMENT.length, existing).trim() === "") {
        start = c; hadComment = true;
      }
      const indent = indentAt(html, start);
      const openTag = (html.slice(existing).match(/^<div\b[^>]*>/) || [OPEN])[0];
      next = html.slice(0, start) +
             block(text, entry.dismiss, indent, openTag, hadComment, entry.icon).trimStart() +
             html.slice(closeIdx + "</div>".length);
    } else {
      const indent = indentAt(html, html.lastIndexOf("<", end));
      next = html.slice(0, end) + "\n\n" + block(text, entry.dismiss, indent, null, true, entry.icon) + html.slice(end);
    }
    next = withScriptTag(next);
    if (next === null) { failed.push([rel, "no place for the script tag"]); continue; }

    if (next === html) { ok.push(rel); continue; }
    changed.push(rel);
    if (write) fs.writeFileSync(abs, next, "utf8");
  }

  console.log("Accent notice — bake from data/accent_notice_copy.json");
  console.log(`  generator pages (#mainInput):  ${ok.length + changed.length + failed.length +
    [...skipped.values()].reduce((a, b) => a + b.length, 0)}`);
  console.log(`  already correct:               ${ok.length}`);
  console.log(`  ${write ? "written" : "would change"}:                ${changed.length}`);
  console.log(`  skipped:                       ${[...skipped.values()].reduce((a, b) => a + b.length, 0)}`);
  console.log(`  could not place:               ${failed.length}`);

  if (skipped.size) {
    console.log("\nSkipped, by reason — these are findings, not silence:");
    for (const [why, list] of [...skipped].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${String(list.length).padStart(4)}  ${why}`);
      if (report) list.forEach((r) => console.log(`        ${r}`));
    }
  }
  for (const [rel, why] of failed) console.log(`  FAIL ${rel}  (${why})`);

  if (!write && (changed.length || failed.length)) {
    console.log("\nPages disagree with data/accent_notice_copy.json.");
    console.log("Fix with: npm run build:accent-notice");
    if (report) changed.forEach((r) => console.log(`  drift ${r}`));
    return 1;
  }
  if (failed.length) return 1;
  console.log("\nEvery deployable generator page matches the copy table.");
  return 0;
}

function push(map, key, val) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(val);
}

process.exit(main());
