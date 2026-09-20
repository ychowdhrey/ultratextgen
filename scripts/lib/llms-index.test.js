#!/usr/bin/env node
'use strict';

/**
 * llms-index.test.js — `npm run test:llms`.
 *
 * Zero dependencies, no framework, in the idiom of
 * `js/counter/counterRules.test.js` and `scripts/lib/efr-gate.test.js`.
 *
 * It exists for the reason that file states: the llms.txt tree *asserts facts*
 * — that a URL resolves, that it is indexable, that a description belongs to
 * the page it is printed under. A page that merely renders copy does not need
 * tests; an index that publishes 4,692 claims about other pages does.
 *
 * One real build (≈19s, the disk scan) plus synthetic unit cases. Both halves
 * matter: the synthetic cases pin the rules that were derived from a wrong
 * result, and the real build is the only thing that can catch a rule being
 * right in isolation and wrong over the actual corpus.
 */

const L = require('./llms-index');
const { LOCALES } = require('./locale-parent-registry');
const LOCALE_CODES = new Set(LOCALES);

let pass = 0;
const failures = [];

function ok(cond, name, detail) {
  if (cond) { pass += 1; return; }
  failures.push(detail ? `${name}\n      ${detail}` : name);
}

function eq(actual, expected, name) {
  ok(actual === expected, name, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ── firstSentence: three rules, each from a wrong result ─────────────────────

eq(L.firstSentence('One thing. Two things.'), 'One thing.',
  'firstSentence: splits on a plain sentence end');

eq(L.firstSentence('Unicode 18.0 erscheint am 16. September 2026 mit neuen Zeichen.'),
  'Unicode 18.0 erscheint am 16. September 2026 mit neuen Zeichen.',
  'firstSentence: a period after a digit is an ordinal date, not a sentence end');

ok(!L.firstSentence('Beim UTC-Meeting #188 am 30. Juli 2026 hat das Komitee entschieden.').endsWith('am 30.'),
  'firstSentence: does not truncate a German date mid-ordinal');

{
  // The real regression: a tagline whose first clause is a bare label.
  const tagline = '💢 U+1F4A2 — the four-pointed cross that draws a popping forehead '
    + 'vein in Japanese manga, now a stand-alone emoji everywhere else. Click to copy.';
  const out = L.firstSentence(tagline);
  ok(out !== '💢 U+1F4A2.', 'firstSentence: does not cut a long tagline down to its codepoint label');
  ok(out.length > 60, 'firstSentence: keeps the informative half of a label-first tagline',
    JSON.stringify(out));
}

{
  // The clause cut still applies when it leaves something worth reading.
  const long = 'A perfectly reasonable opening clause of real length — followed by a '
    + 'second clause that pushes the whole string past the one hundred and forty character cap.';
  const out = L.firstSentence(long);
  ok(out.length <= 141, 'firstSentence: respects the cap', String(out.length));
  ok(out.endsWith('.') || out.endsWith('…'), 'firstSentence: terminates cleanly', JSON.stringify(out.slice(-3)));
}

// ── descriptionFor: a description is never the title restated ───────────────

eq(L.descriptionFor('ASCII Art Generator',
  'Free ASCII art generator. Type a word or name and watch it turn into block-letter art.'),
  'Type a word or name and watch it turn into block-letter art.',
  'descriptionFor: skips a leading sentence that restates the title');

eq(L.descriptionFor('Old English Font Generator',
  'Old English font generator. Copy and paste blackletter text for tattoos and band logos.'),
  'Copy and paste blackletter text for tattoos and band logos.',
  'descriptionFor: the real category/old-english-fonts case');

eq(L.descriptionFor('Euro Sign', 'What the euro sign means and how to type it. More here.'),
  'What the euro sign means and how to type it.',
  'descriptionFor: a real first sentence is kept');

eq(L.descriptionFor('Bubble Letters', 'Bubble letters.'), 'Bubble letters.',
  'descriptionFor: falls back rather than emitting nothing when every sentence echoes');

ok(!L.echoesTitle('Type a word and watch it turn into big multi-line block-letter ASCII art instantly.',
  'ASCII Art Generator'),
  'echoesTitle: a long sentence that repeats the subject is not an echo');

ok(L.echoesTitle('Free ASCII art generator.', 'ASCII Art Generator'),
  'echoesTitle: short, one extra word');

eq(L.splitSentences('Unicode 18.0 ships on 16. September 2026. Then more.').length, 2,
  'splitSentences: an ordinal date is not a boundary');

eq(L.escapeLinkText('Square Brackets [ ]'), 'Square Brackets \\[ \\]',
  'escapeLinkText: escapes brackets that would break [name](url)');

// ── synthetic pages: classification and the directory rule ───────────────────

const BASE = L.BASE_URL;
let seq = 0;
function page(file, extra = {}) {
  const segments = file.replace(/\/?index\.html$/, '').split('/').filter(Boolean);
  // Same rule as readPage(): a first segment in the canonical locale list IS
  // the locale, with no length condition — `de/index.html` is the German
  // homepage, not an English root page.
  const locale = LOCALE_CODES.has(segments[0]) ? segments[0] : 'en';
  const localePath = locale === 'en' ? segments : segments.slice(1);
  const url = file === 'index.html' ? `${BASE}/` : `${BASE}/${file.replace(/index\.html$/, '')}`;
  return {
    file,
    url,
    locale,
    dir: localePath[0] || '',
    isHome: localePath.length === 0,
    depth: localePath.length,
    noindex: false,
    canonical: url,
    title: `Title ${(seq += 1)}`,
    description: `Description ${seq}.`,
    summary: `Summary ${seq}.`,
    descriptionSource: 'hero-tagline',
    enParent: '',
    breadcrumb: ['Home', 'Library'],
    ...extra,
  };
}

function sectionOf(pages, url) {
  return pages.find((p) => p.url === url).section;
}

{
  const pages = [
    page('index.html'),
    page('library/index.html'),
    page('library/heart-symbols/index.html'),
    page('symbol/euro-sign/index.html'),
    page('discord/index.html'),
    page('character-counter/index.html'),
    page('about/index.html'),
    page('de/index.html'),
    page('de/library/herz-symbole/index.html'),
    // inherits `fonts` from an EN parent under category/, though it sits at
    // the German locale root with no de/category/ directory of its own.
    page('de/fette-schrift/index.html', { enParent: `${BASE}/category/bold-fonts/` }),
    page('category/bold-fonts/index.html'),
    // no EN parent at all — the ratified local-only shape.
    page('ja/gal-moji/index.html'),
  ];
  L.classify(pages);

  eq(sectionOf(pages, `${BASE}/`), 'home', 'classify: the site root is the main generator');
  eq(sectionOf(pages, `${BASE}/library/`), 'library', 'classify: a lane hub belongs to its own lane');
  eq(sectionOf(pages, `${BASE}/library/heart-symbols/`), 'library', 'classify: a lane page by directory');
  eq(sectionOf(pages, `${BASE}/symbol/euro-sign/`), 'symbols', 'classify: symbol lane');
  eq(sectionOf(pages, `${BASE}/discord/`), 'platforms', 'classify: EN root page via the table');
  eq(sectionOf(pages, `${BASE}/character-counter/`), 'tools', 'classify: EN root tool via the table');
  eq(sectionOf(pages, `${BASE}/about/`), 'about', 'classify: legal pages');
  eq(sectionOf(pages, `${BASE}/de/`), 'home', 'classify: a locale homepage is that locale main generator');
  eq(sectionOf(pages, `${BASE}/de/library/herz-symbole/`), 'library', 'classify: locale lane page by directory');
  eq(sectionOf(pages, `${BASE}/de/fette-schrift/`), 'fonts',
    'classify: a locale root page inherits its English parent section');
  eq(sectionOf(pages, `${BASE}/ja/gal-moji/`), 'local-only',
    'classify: no English parent means language-specific, not a guess');
}

{
  // An English root page with no entry must FAIL the build, never default.
  let threw = '';
  try {
    L.classify([page('brand-new-tool/index.html')]);
  } catch (e) {
    threw = e.message;
  }
  ok(threw.includes('ROOT_PAGE_SECTION'),
    'classify: an unclassified English root page throws, naming the table', threw || '(no throw)');
}

{
  // Directory rule: ten in one directory earns an index; nine does not.
  const many = [page('index.html')];
  for (let i = 0; i < 10; i += 1) many.push(page(`library/page-${i}/index.html`));
  const tree = L.buildTree(L.classify(many));
  const lib = tree.get('en').sectionList.find((s) => s.id === 'library');
  eq(lib.files.length, 1, 'buildTree: a directory at the threshold gets its own index');
  eq(lib.files[0].indexPath, `library/${L.FILE_NAME}`, 'buildTree: the index sits at the real directory');
  eq(lib.inlinePages.length, 0, 'buildTree: nothing is left inline when the directory covers it');
}

{
  const few = [page('index.html')];
  for (let i = 0; i < 9; i += 1) few.push(page(`library/page-${i}/index.html`));
  const tree = L.buildTree(L.classify(few));
  const lib = tree.get('en').sectionList.find((s) => s.id === 'library');
  eq(lib.files.length, 0, 'buildTree: below the threshold no index file is emitted');
  eq(lib.inlinePages.length, 9, 'buildTree: those pages are listed inline instead');
}

{
  // The measured regression: strays at the locale root must not block the
  // directory's own index (this is what hid es/library, ja/library, th/library).
  const mixed = [page('de/index.html')];
  for (let i = 0; i < 12; i += 1) mixed.push(page(`de/library/page-${i}/index.html`));
  mixed.push(page('de/herz-symbole/index.html', { enParent: `${BASE}/library/heart-symbols/` }));
  mixed.push(page('library/heart-symbols/index.html'));
  const tree = L.buildTree(L.classify(mixed));
  const lib = tree.get('de').sectionList.find((s) => s.id === 'library');
  eq(lib.files.length, 1, 'buildTree: a locale-root stray does not block the directory index');
  eq(lib.files[0].pages.length, 12, 'buildTree: the index lists exactly the directory');
  eq(lib.inlinePages.length, 1, 'buildTree: the stray stays inline in the locale index');
}

// ── rendering and validation, over synthetic input ───────────────────────────

function renderSmall() {
  const pages = [page('index.html'), page('discord/index.html'), page('about/index.html')];
  const tree = L.buildTree(L.classify(pages));
  return { files: L.plan(tree), pages, locales: tree };
}

{
  const { files } = renderSmall();
  const root = files.find((f) => f.relPath === L.FILE_NAME);
  const lines = root.content.split('\n');
  ok(lines[0].startsWith('# '), 'render: the first line is the H1 the spec requires');
  eq(lines[1], '', 'render: blank line after the H1');
  ok(lines[2].startsWith('> '), 'render: a blockquote summary follows');
  ok(root.content.includes('\n## '), 'render: at least one H2 section');
  ok(root.content.endsWith('\n'), 'render: trailing newline');
  ok(/^- \[.+\]\(https:\/\/ultratextgen\.com\/\S*\): .+$/m.test(root.content),
    'render: list items are [name](url): notes');
  ok(root.content.includes('## Optional'),
    'render: legal pages use the spec own Optional section');
}

{
  const built = renderSmall();
  eq(L.validate(built).length, 0, 'validate: a well-formed tree reports nothing');
}

{
  const built = renderSmall();
  const root = built.files.find((f) => f.relPath === L.FILE_NAME);
  root.content += '- [Staging](https://staging.ultratextgen.com/x/): note\n';
  const problems = L.validate(built);
  ok(problems.some((p) => p.includes('non-production URL')),
    'validate: a non-production host is caught', problems.join(' | '));
}

{
  const built = renderSmall();
  const root = built.files.find((f) => f.relPath === L.FILE_NAME);
  root.content += `- [Ghost](${BASE}/not-a-route/): note\n`;
  ok(L.validate(built).some((p) => p.includes('not a known indexable route')),
    'validate: a URL with no page behind it is caught');
}

{
  const built = renderSmall();
  const root = built.files.find((f) => f.relPath === L.FILE_NAME);
  root.content += `- [Again](${BASE}/discord/): note\n`;
  ok(L.validate(built).some((p) => p.includes('duplicate URL')),
    'validate: a URL repeated inside one file is caught');
}

{
  const built = renderSmall();
  const root = built.files.find((f) => f.relPath === L.FILE_NAME);
  root.content = root.content.replace(/: Description \d+\.$/m, '');
  ok(L.validate(built).some((p) => p.includes('has no description')),
    'validate: a link with no description is caught');
}

{
  const built = renderSmall();
  built.pages.push(page('orphan/index.html', { section: 'tools' }));
  ok(L.validate(built).some((p) => p.includes('not represented anywhere')),
    'validate: a page missing from every file is caught');
}

{
  const built = renderSmall();
  const root = built.files.find((f) => f.relPath === L.FILE_NAME);
  root.content += `- [Query](${BASE}/discord/?x=1): note\n`;
  ok(L.validate(built).some((p) => p.includes('query or fragment')),
    'validate: a query string is caught');
}

// ── the real corpus ──────────────────────────────────────────────────────────

const real = L.build();

ok(real.pages.length > 4000, 'build: the real corpus is collected', String(real.pages.length));
eq(L.validate(real).length, 0, 'build: the real tree passes every validation rule');
ok(real.pages.every((p) => p.descriptionSource),
  'build: every indexable page has a description source — none is invented');
ok(real.pages.every((p) => !p.noindex), 'build: no noindex route is represented');
ok(real.skippedNoindex.length > 0,
  'build: noindex routes exist and are excluded, so the filter is exercised');

{
  // Every locale in the registry that has pages gets exactly one locale index.
  const missing = [];
  for (const [code, loc] of real.locales) {
    if (code === 'en') continue;
    if (!loc.pages.length) continue;
    if (!real.files.some((f) => f.relPath === `${code}/${L.FILE_NAME}`)) missing.push(code);
  }
  eq(missing.length, 0, 'build: every populated locale has an index', missing.join(', '));
}

{
  // Determinism: the same corpus in a different order renders byte-identically.
  const shuffled = real.pages.slice().reverse();
  const again = L.plan(L.buildTree(shuffled));
  const a = real.files.map((f) => `${f.relPath}\n${f.content}`).join('\u0000');
  const b = again.map((f) => `${f.relPath}\n${f.content}`).join('\u0000');
  eq(b, a, 'build: output does not depend on page discovery order');
}

{
  // No file may advertise an index that is not planned.
  const planned = new Set(real.files.map((f) => `${BASE}/${f.relPath}`));
  const known = new Set(real.pages.map((p) => p.url));
  const bad = [];
  for (const file of real.files) {
    for (const m of file.content.matchAll(/^- \[.*?\]\((\S+?)\)/gm)) {
      if (!planned.has(m[1]) && !known.has(m[1])) bad.push(`${file.relPath} -> ${m[1]}`);
    }
  }
  eq(bad.length, 0, 'build: every emitted link is a real page or a planned index', bad.slice(0, 3).join(' | '));
}

{
  // A description is never just the title restated — the brief's "Bad" example.
  const echoes = real.pages.filter(
    (p) => p.description.toLowerCase().replace(/[.…]$/, '') === p.title.toLowerCase()
  );
  eq(echoes.length, 0, 'build: no description is its own page title',
    echoes.slice(0, 3).map((p) => p.url).join(' | '));
}

// ── report ───────────────────────────────────────────────────────────────────

console.log(`llms-index: ${pass} passed, ${failures.length} failed`);
for (const f of failures) console.error(`  ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
