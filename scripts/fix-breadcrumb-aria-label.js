#!/usr/bin/env node

/**
 * fix-breadcrumb-aria-label.js
 *
 * Every locale page's breadcrumb <nav> carries an aria-label that a screen
 * reader speaks aloud. On 2,000+ locale pages that label was still the English
 * word "Breadcrumb" — inherited from the EN template — so a Japanese or Thai
 * screen-reader user hears an English word announcing their navigation.
 *
 * `check-locale-translation.js` already catches this on any page a PR touches
 * (it is what caught it on two new ja/ko pages, 2026-08-15). It cannot see
 * pages nobody is touching, which is what this backlog is. This script clears
 * the backlog; the gate keeps it clear.
 *
 * English pages keep "Breadcrumb" — they are English.
 *
 * The per-locale terms below are NOT invented where the site had already
 * chosen one. Rules applied, in order:
 *   1. If the locale already had a translated label in production, that term
 *      wins — consistency with the site's own choice beats lexical taste.
 *   2. Where a locale had SEVERAL competing labels (de had 3, fi and pl had 2),
 *      the most-used one wins and the outliers are normalised to it.
 *   3. Only locales with no translated label at all got a new term, and the
 *      "crumb" metaphor was kept where the language uses it (da/no/sv/hu),
 *      since that matches the existing nl/ru/id family.
 *
 * One deliberate override, flagged rather than buried: `tr` had exactly one
 * page reading "İçerik haritası", which means *content map* — that is a
 * sitemap, not a breadcrumb trail. Propagating it to 158 more pages would
 * amplify a probable mistranslation, so this uses "Gezinme yolu" (navigation
 * path) and normalises that one page too. If a Turkish reader disagrees, it is
 * a one-line change here plus a re-run.
 *
 * Usage:
 *   node scripts/fix-breadcrumb-aria-label.js            # report only
 *   node scripts/fix-breadcrumb-aria-label.js --write    # apply
 *   node scripts/fix-breadcrumb-aria-label.js --write ja ko   # scope to locales
 */

const fs = require("fs");
const path = require("path");

// locale -> the label a screen reader should speak on that locale's pages.
// "src" records where the term came from, so a reviewer can tell an inherited
// site decision from a new proposal without digging through git history.
const LABELS = {
  ar: { label: "مسار التنقّل", src: "existing (12 pages)" },
  bs: { label: "Navigacijski trag", src: "new — mirrors hr, same term" },
  cs: { label: "Drobečková navigace", src: "existing (4)" },
  da: { label: "Brødkrummesti", src: "new — crumb metaphor, as da uses" },
  de: { label: "Brotkrümelnavigation", src: "existing (58) — normalises Navigationspfad (8) + Brotkrumennavigation (5)" },
  es: { label: "Ruta de navegación", src: "existing (116)" },
  fi: { label: "Navigointipolku", src: "existing (4) — normalises Murupolku (1)" },
  fr: { label: "Fil d'Ariane", src: "existing (134)" },
  hi: { label: "नेविगेशन पथ", src: "new — navigation path" },
  hr: { label: "Navigacijski trag", src: "existing (4)" },
  hu: { label: "Morzsamenü", src: "new — standard hu term, crumb metaphor" },
  id: { label: "Remah roti", src: "existing (1)" },
  it: { label: "Percorso di navigazione", src: "existing (6)" },
  ja: { label: "パンくずリスト", src: "existing (2)" },
  ko: { label: "탐색 경로", src: "existing (1)" },
  ms: { label: "Remah roti", src: "existing (1)" },
  nl: { label: "Kruimelpad", src: "existing (55)" },
  no: { label: "Brødsmulesti", src: "new — crumb metaphor, as no uses" },
  pl: { label: "Ścieżka nawigacji", src: "existing (11) — normalises Ścieżka nawigacyjna (1)" },
  pt: { label: "Trilha de navegação", src: "existing (9)" },
  ro: { label: "Fir de navigare", src: "new — standard ro term" },
  ru: { label: "Хлебные крошки", src: "existing (15)" },
  sk: { label: "Navigačná cesta", src: "existing (4)" },
  sr: { label: "Putanja", src: "existing (4)" },
  sv: { label: "Brödsmulor", src: "new — crumb metaphor, as sv uses" },
  th: { label: "เส้นทางนำทาง", src: "new — navigation path" },
  tl: { label: "Landas ng nabigasyon", src: "new — navigation path" },
  tr: { label: "Gezinme yolu", src: "OVERRIDE — replaces İçerik haritası (1), which means 'content map'" },
  vi: { label: "Đường dẫn", src: "new — standard vi term for a breadcrumb path" },
  "zh-tw": { label: "麵包屑導覽", src: "existing (1)" }
};

const ROOT = path.resolve(__dirname, "..");
const NAV_RE = /(<nav class="breadcrumbs" aria-label=")([^"]*)(")/;

function localeOf(rel) {
  const first = rel.split(path.sep)[0];
  return Object.prototype.hasOwnProperty.call(LABELS, first) ? first : null;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const only = args.filter((a) => !a.startsWith("--"));

  const changed = [];
  const perLocale = {};
  let alreadyOk = 0;

  for (const abs of walk(ROOT)) {
    const rel = path.relative(ROOT, abs);
    const loc = localeOf(rel);
    if (!loc) continue;                       // EN page — keeps "Breadcrumb"
    if (only.length && !only.includes(loc)) continue;

    const html = fs.readFileSync(abs, "utf8");
    const m = html.match(NAV_RE);
    if (!m) continue;

    const want = LABELS[loc].label;
    if (m[2] === want) { alreadyOk++; continue; }

    perLocale[loc] = perLocale[loc] || { from: {}, to: want, n: 0 };
    perLocale[loc].from[m[2]] = (perLocale[loc].from[m[2]] || 0) + 1;
    perLocale[loc].n++;
    changed.push(rel);

    if (write) fs.writeFileSync(abs, html.replace(NAV_RE, `$1${want}$3`), "utf8");
  }

  console.log("Breadcrumb aria-label i18n\n");
  console.log(`  mode:            ${write ? "WRITE" : "report only (pass --write to apply)"}`);
  console.log(`  already correct: ${alreadyOk}`);
  console.log(`  ${write ? "updated" : "would update"}: ${changed.length}\n`);

  const locs = Object.keys(perLocale).sort();
  if (locs.length) {
    console.log(`  ${"locale".padEnd(7)}${"pages".padStart(6)}  label  ←  replaced`);
    for (const l of locs) {
      const p = perLocale[l];
      const from = Object.entries(p.from).map(([k, v]) => `${k || "(empty)"}×${v}`).join(", ");
      console.log(`  ${l.padEnd(7)}${String(p.n).padStart(6)}  ${p.to}  ←  ${from}`);
    }
  }
  if (!write && changed.length) console.log("\nNothing written. Re-run with --write to apply.");
  return 0;
}

process.exit(main());
