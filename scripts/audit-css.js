#!/usr/bin/env node

/**
 * UltraTextGen — CSS Audit
 *
 * Repeatable, dependency-free checker that scans the repo for CSS / styling
 * problems and emits a human report (reports/css-audit-report.md) plus a
 * machine-readable dataset (reports/css-audit-data.json).
 *
 * It does NOT change any CSS. Every "unused" / "movable" suggestion is advisory
 * and uncertain items are explicitly marked "needs verification" so the report
 * never gives false confidence. JavaScript class usage is taken into account so
 * JS-driven CSS is not falsely reported as dead.
 *
 * Usage:  npm run audit:css   (or)   node scripts/audit-css.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const REPO_ROOT   = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');
const MAIN_CSS    = 'style.css';

// Folders we never scan.
const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', 'reports', 'dist', 'build', '.github'
]);

// Files we never scan (build artifacts that duplicate real source pages).
const EXCLUDED_FILES = new Set(['_root.html']);

// Tunable thresholds (kept here so future maintainers can adjust intent).
const T = {
  componentMinPages: 5,   // class used on >= this many pages = likely component
  repeatedPatternMin: 3,  // inline pattern repeated >= this many times = utility candidate
  bigStyleBlockLines: 30, // <style> block bigger than this leans page-specific
  mdTopN: 25              // how many rows of each list to show in the markdown
};

// ─── Filesystem walk ─────────────────────────────────────────────────────────

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else {
      if (EXCLUDED_FILES.has(entry.name)) continue;
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function rel(absPath) {
  return path.relative(REPO_ROOT, absPath).split(path.sep).join('/');
}

function lineOf(text, index) {
  // 1-based line number of a character offset.
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

function clip(str, max = 90) {
  const oneLine = str.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? oneLine.slice(0, max - 1) + '…' : oneLine;
}

// ─── Risk classification ───────────────────────────────────────────────────────

// Split a declaration string into {prop, value} pairs (lower-cased, trimmed).
// Property-aware so e.g. `margin-top` is NOT confused with the `top` property.
function parseDecls(decl) {
  return decl
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const i = s.indexOf(':');
      if (i === -1) return { prop: s.toLowerCase(), value: '' };
      return {
        prop: s.slice(0, i).trim().toLowerCase(),
        value: s.slice(i + 1).trim().toLowerCase().replace(/\s+/g, ' ')
      };
    });
}

// Interactive / positioning / animation properties — likely JS-driven or layout-critical.
const HIGH_RISK_PROPS = new Set([
  'position', 'transform', 'transform-origin', 'transition', 'animation',
  'z-index', 'cursor', 'pointer-events', 'top', 'left', 'right', 'bottom',
  'opacity', 'overflow', 'filter'
]);

function classifyInlineRisk(decl) {
  const decls = parseDecls(decl);
  for (const { prop, value } of decls) {
    if (HIGH_RISK_PROPS.has(prop)) return 'high';
    if (prop === 'display' && value === 'none') return 'high';      // likely JS-toggled
    if (prop === 'visibility' && value === 'hidden') return 'high'; // likely JS-toggled
  }
  const hasVar  = decls.some(d => d.value.includes('var('));
  const hasSize = decls.some(d => /^(?:max-|min-)?(?:width|height)$/.test(d.prop));
  if (hasVar || decls.length >= 3 || hasSize) return 'medium';
  return 'low';
}

function classifyStyleBlockRisk(css) {
  const lower = css.toLowerCase();
  if (lower.includes('@keyframes') || lower.includes('@media') || lower.includes('animation')) {
    return 'high';
  }
  const lines = css.split('\n').filter(l => l.trim()).length;
  return lines > T.bigStyleBlockLines ? 'medium' : 'low';
}

const RISK_NOTE = {
  low:    'low risk — safe to move into style.css',
  medium: 'medium risk — check visually before changing',
  high:   'high risk — likely page-specific or interactive, do not move blindly'
};

// ─── CSS file purpose inference ─────────────────────────────────────────────────

function inferPurpose(relPath) {
  const base = path.basename(relPath).toLowerCase();
  if (base === 'style.css')          return 'global site stylesheet';
  if (base === '404.css')            return 'error page styling';
  if (base.includes('symbol'))       return 'symbol explorer feature styling';
  if (base.includes('context'))      return 'platform-specific (Discord) styling';
  if (relPath.includes('usecase/'))  return 'page-specific usecase styling';
  return 'page/feature specific styling (inferred from path)';
}

// ─── Collectors ─────────────────────────────────────────────────────────────────

function classifyPage(relPath) {
  if (/^(de|es|fr|id|it|nl|pl|pt|tr|vi)\//.test(relPath)) return 'localized';
  if (relPath.startsWith('category/'))  return 'category';
  if (relPath.startsWith('usecase/'))   return 'usecase';
  if (relPath.startsWith('guide/'))     return 'guide';
  if (relPath.startsWith('library/'))   return 'library';
  if (relPath.startsWith('embed/') || relPath.includes('/embed/')) return 'embed';
  if (/^(discord|facebook|instagram|linkedin|pinterest|snapchat|telegram|tiktok|whatsapp|x|youtube)\//.test(relPath)) {
    return 'platform';
  }
  return 'other';
}

// ─── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const allFiles = walk(REPO_ROOT);
  const htmlFiles = allFiles.filter(f => f.endsWith('.html'));
  const cssFiles  = allFiles.filter(f => f.endsWith('.css'));
  const jsFiles   = allFiles.filter(f => f.endsWith('.js'));

  // ── 6. JavaScript class usage (built first so CSS-usage checks can consult it) ──
  const jsStrict = new Set(); // high-confidence class references
  const jsLoose  = new Set(); // any token seen in a JS string (low confidence)

  function addTokens(target, raw) {
    raw.split(/[\s.]+/).forEach(tok => {
      const t = tok.replace(/^[.#]/, '').trim();
      if (/^[A-Za-z][\w-]*$/.test(t)) target.add(t);
    });
  }

  const jsClassEvidence = []; // sample evidence for the report
  for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let m;

    const reList = [
      // classList.add / remove / toggle / contains / replace ( ...quoted... )
      /classList\.(?:add|remove|toggle|contains|replace)\(\s*([^)]*)\)/g,
      // .className = "..."  |  '...'  |  `...`
      /\.className\s*=\s*[`'"]([^`'"]*)[`'"]/g,
      // setAttribute('class', '...')
      /setAttribute\(\s*[`'"]class[`'"]\s*,\s*[`'"]([^`'"]*)[`'"]/g,
      // getElementsByClassName('...')
      /getElementsByClassName\(\s*[`'"]([^`'"]+)[`'"]/g,
      // class="..."  inside injected template/markup strings
      /class\s*=\s*[`'"]([^`'"]*)[`'"]/g
    ];
    for (const re of reList) {
      while ((m = re.exec(content)) !== null) {
        // pull quoted substrings out of the captured argument list
        const inner = m[1];
        const quoted = inner.match(/[`'"]([^`'"]*)[`'"]/g);
        if (quoted) {
          quoted.forEach(q => addTokens(jsStrict, q.replace(/[`'"]/g, '')));
        } else {
          addTokens(jsStrict, inner);
        }
        if (jsClassEvidence.length < 40) {
          jsClassEvidence.push({ file: rel(file), snippet: clip(m[0], 70) });
        }
      }
    }

    // querySelector / querySelectorAll — extract .class tokens from the selector
    const reQuery = /querySelector(?:All)?\(\s*[`'"]([^`'"]+)[`'"]/g;
    while ((m = reQuery.exec(content)) !== null) {
      const sel = m[1];
      let c;
      const reCls = /\.([A-Za-z][\w-]*)/g;
      while ((c = reCls.exec(sel)) !== null) jsStrict.add(c[1]);
    }

    // Loose net: every string/template literal token (only used to soften
    // "unused" claims, never to assert usage).
    const reStr = /[`'"]([^`'"]{1,200})[`'"]/g;
    while ((m = reStr.exec(content)) !== null) addTokens(jsLoose, m[1]);
  }

  // ── 1 & 4: HTML inline styles + class usage ──
  const inlineFindings = [];          // {file, line, snippet, decl, risk}
  const styleBlockFindings = [];      // {file, line, cssLines, reusableGuess, risk}
  const classPages = new Map();       // class -> Set(files)
  const classCount = new Map();       // class -> total occurrences
  const htmlIds = new Set();
  const inlinePerFile = new Map();    // file -> count
  const declStrings = [];             // every raw inline declaration string

  const reInlineDq = /style\s*=\s*"([^"]*)"/g;
  const reInlineSq = /style\s*=\s*'([^']*)'/g;
  const reClassDq  = /class\s*=\s*"([^"]*)"/g;
  const reClassSq  = /class\s*=\s*'([^']*)'/g;
  const reIdDq     = /id\s*=\s*"([^"]*)"/g;
  const reStyleTag = /<style[^>]*>([\s\S]*?)<\/style>/gi;

  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relPath = rel(file);
    let m;

    // inline style attributes (both quote styles)
    for (const re of [reInlineDq, reInlineSq]) {
      re.lastIndex = 0;
      while ((m = re.exec(content)) !== null) {
        const decl = m[1].trim();
        if (!decl) continue;
        declStrings.push(decl);
        inlinePerFile.set(relPath, (inlinePerFile.get(relPath) || 0) + 1);
        inlineFindings.push({
          file: relPath,
          line: lineOf(content, m.index),
          snippet: clip(m[0], 90),
          decl,
          risk: classifyInlineRisk(decl)
        });
      }
    }

    // <style> blocks
    reStyleTag.lastIndex = 0;
    while ((m = reStyleTag.exec(content)) !== null) {
      const css = m[1];
      const cssLines = css.split('\n').filter(l => l.trim()).length;
      const risk = classifyStyleBlockRisk(css);
      const looksPageSpecific = risk !== 'low' || /#[\w-]/.test(css);
      styleBlockFindings.push({
        file: relPath,
        line: lineOf(content, m.index),
        cssLines,
        reusableGuess: looksPageSpecific ? 'page-specific' : 'possibly reusable',
        risk
      });
    }

    // class usage
    for (const re of [reClassDq, reClassSq]) {
      re.lastIndex = 0;
      while ((m = re.exec(content)) !== null) {
        m[1].split(/\s+/).forEach(cls => {
          // skip junk from JS-built markup (e.g. `class="' + x + '"`)
          if (!/^-?[A-Za-z_][\w-]*$/.test(cls)) return;
          if (!classPages.has(cls)) classPages.set(cls, new Set());
          classPages.get(cls).add(relPath);
          classCount.set(cls, (classCount.get(cls) || 0) + 1);
        });
      }
    }

    // ids (helps avoid flagging id selectors as unused)
    reIdDq.lastIndex = 0;
    while ((m = reIdDq.exec(content)) !== null) {
      m[1].split(/\s+/).forEach(id => id && htmlIds.add(id));
    }
  }

  const htmlClasses = new Set(classPages.keys());

  // ── 4: component vs one-off classes ──
  const componentClasses = [];
  const oneOffClasses = [];
  for (const [cls, pages] of classPages) {
    const entry = { class: cls, pages: pages.size, occurrences: classCount.get(cls) };
    if (pages.size >= T.componentMinPages) componentClasses.push(entry);
    if (pages.size === 1) oneOffClasses.push(entry);
  }
  componentClasses.sort((a, b) => b.pages - a.pages);
  oneOffClasses.sort((a, b) => a.class.localeCompare(b.class));

  // ── 7: repeated inline patterns ──
  function normalizeDecls(decl) {
    return parseDecls(decl)
      .map(({ prop, value }) => (value ? `${prop}:${value}` : prop))
      .sort()
      .join('; ');
  }

  const patternGroups = new Map(); // normalized -> count
  const propertyGroups = new Map(); // single property -> count
  for (const decl of declStrings) {
    const norm = normalizeDecls(decl);
    if (norm) patternGroups.set(norm, (patternGroups.get(norm) || 0) + 1);
    decl.split(';').forEach(s => {
      const prop = s.split(':')[0].trim().toLowerCase();
      if (prop) propertyGroups.set(prop, (propertyGroups.get(prop) || 0) + 1);
    });
  }

  const repeatedPatterns = [...patternGroups.entries()]
    .filter(([, n]) => n >= T.repeatedPatternMin)
    .map(([pattern, count]) => ({
      pattern,
      count,
      risk: classifyInlineRisk(pattern),
      suggestedUtility: suggestUtilityName(pattern)
    }))
    .sort((a, b) => b.count - a.count);

  const propertyFrequency = [...propertyGroups.entries()]
    .map(([property, count]) => ({ property, count }))
    .sort((a, b) => b.count - a.count);

  // ── 5: style.css selectors ──
  const cssAnalysis = analyzeMainCss(htmlClasses, htmlIds, jsStrict, jsLoose);

  // ── CSS file inventory (3) ──
  const cssInventory = cssFiles.map(f => {
    const stat = fs.statSync(f);
    const content = fs.readFileSync(f, 'utf8');
    return {
      file: rel(f),
      bytes: stat.size,
      sizeHuman: humanSize(stat.size),
      lines: content.split('\n').length,
      purpose: inferPurpose(rel(f))
    };
  }).sort((a, b) => b.bytes - a.bytes);

  // ── page-type tallies for context ──
  const pageTypes = {};
  for (const f of htmlFiles) {
    const t = classifyPage(rel(f));
    pageTypes[t] = (pageTypes[t] || 0) + 1;
  }

  // ── risk tallies for inline styles ──
  const inlineRiskTally = { low: 0, medium: 0, high: 0 };
  inlineFindings.forEach(f => { inlineRiskTally[f.risk]++; });

  const data = {
    generatedAt: new Date().toISOString(),
    thresholds: T,
    summary: {
      htmlFiles: htmlFiles.length,
      cssFiles: cssFiles.length,
      jsFiles: jsFiles.length,
      pageTypes,
      inlineStyleOccurrences: inlineFindings.length,
      filesWithInlineStyles: inlinePerFile.size,
      inlineRiskTally,
      styleBlocks: styleBlockFindings.length,
      uniqueClasses: htmlClasses.size,
      componentClassCandidates: componentClasses.length,
      oneOffClassCandidates: oneOffClasses.length,
      repeatedInlinePatterns: repeatedPatterns.length,
      cssSelectorsTotal: cssAnalysis.total,
      cssSelectorsReferenced: cssAnalysis.referenced.length,
      cssSelectorsUnreferenced: cssAnalysis.unreferenced.length
    },
    cssInventory,
    inlineFindings,
    inlinePerFile: [...inlinePerFile.entries()]
      .map(([file, count]) => ({ file, count }))
      .sort((a, b) => b.count - a.count),
    styleBlockFindings,
    componentClasses,
    oneOffClasses,
    repeatedPatterns,
    propertyFrequency,
    cssSelectors: cssAnalysis,
    jsClassEvidence,
    jsStrictTokenCount: jsStrict.size
  };

  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORTS_DIR, 'css-audit-data.json'), JSON.stringify(data, null, 2));
  fs.writeFileSync(path.join(REPORTS_DIR, 'css-audit-report.md'), renderMarkdown(data));

  // Console summary
  const s = data.summary;
  console.log('CSS audit complete.');
  console.log(`  HTML files scanned     : ${s.htmlFiles}`);
  console.log(`  Inline style attrs     : ${s.inlineStyleOccurrences} across ${s.filesWithInlineStyles} files`);
  console.log(`     risk  low/med/high  : ${s.inlineRiskTally.low}/${s.inlineRiskTally.medium}/${s.inlineRiskTally.high}`);
  console.log(`  <style> blocks         : ${s.styleBlocks}`);
  console.log(`  Repeated inline patterns: ${s.repeatedInlinePatterns}`);
  console.log(`  Component class cands  : ${s.componentClassCandidates}`);
  console.log(`  style.css selectors    : ${s.cssSelectorsTotal} (${s.cssSelectorsUnreferenced} unreferenced — needs verification)`);
  console.log(`  Reports written to     : reports/css-audit-report.md, reports/css-audit-data.json`);
}

// ─── style.css light parse ───────────────────────────────────────────────────

function analyzeMainCss(htmlClasses, htmlIds, jsStrict, jsLoose) {
  const cssPath = path.join(REPO_ROOT, MAIN_CSS);
  if (!fs.existsSync(cssPath)) {
    return { total: 0, referenced: [], unreferenced: [], note: 'style.css not found' };
  }
  const raw = fs.readFileSync(cssPath, 'utf8');

  // Strip comments but preserve newline count so line numbers stay accurate.
  const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, ' '));

  const referenced = [];
  const unreferenced = [];
  let total = 0;

  const reSel = /([^{}]+)\{/g;
  let m;
  while ((m = reSel.exec(stripped)) !== null) {
    const group = m[1].trim();
    if (!group || group.startsWith('@')) continue; // skip at-rule headers
    const line = lineOf(stripped, m.index);

    // a group may be a comma list of selectors; evaluate each
    group.split(',').forEach(selRaw => {
      const sel = selRaw.trim();
      if (!sel) return;
      total++;

      const classes = [...sel.matchAll(/\.([A-Za-z][\w-]*)/g)].map(x => x[1]);
      const ids     = [...sel.matchAll(/#([A-Za-z][\w-]*)/g)].map(x => x[1]);
      const hasTargets = classes.length > 0 || ids.length > 0;

      // structural selectors (element/pseudo/global only) are assumed live
      if (!hasTargets) {
        referenced.push({ selector: sel, line, via: 'structural' });
        return;
      }

      const inHtml =
        classes.some(c => htmlClasses.has(c)) || ids.some(i => htmlIds.has(i));
      if (inHtml) {
        referenced.push({ selector: sel, line, via: 'html' });
        return;
      }

      const inJsStrict = classes.some(c => jsStrict.has(c));
      const inJsLoose  = classes.some(c => jsLoose.has(c));
      let verdict, note;
      if (inJsStrict) {
        verdict = 'js-referenced';
        note = 'matched a JS classList/querySelector reference — keep';
      } else if (inJsLoose) {
        verdict = 'maybe-js';
        note = 'token appears in a JS string — NEEDS VERIFICATION before touching';
      } else {
        verdict = 'no-reference-found';
        note = 'no HTML or JS reference found — NEEDS VERIFICATION (may be dynamic, generated, or stale)';
      }

      if (inJsStrict) {
        referenced.push({ selector: sel, line, via: 'js' });
      } else {
        unreferenced.push({ selector: sel, line, classes, ids, verdict, note });
      }
    });
  }

  unreferenced.sort((a, b) => a.line - b.line);
  return { total, referenced, unreferenced };
}

// ─── helpers ───────────────────────────────────────────────────────────────────

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function suggestUtilityName(pattern) {
  const map = [
    [/text-align:\s*center/, 'u-text-center'],
    [/text-align:\s*left/, 'u-text-left'],
    [/text-decoration:\s*none/, 'u-no-underline'],
    [/display:\s*flex.*column/, 'u-flex-col'],
    [/display:\s*flex/, 'u-flex'],
    [/display:\s*none/, 'u-hidden (verify JS toggling first)'],
    [/margin-top:/, 'u-mt-*'],
    [/margin-bottom:/, 'u-mb-*'],
    [/max-width:/, 'u-maxw-*'],
    [/color:\s*var\(--text-secondary\)/, 'u-text-secondary'],
    [/font-size:/, 'u-fs-*']
  ];
  for (const [re, name] of map) if (re.test(pattern)) return name;
  return '(propose a utility/component class)';
}

// ─── Markdown rendering ──────────────────────────────────────────────────────

function table(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const sep  = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map(r => `| ${r.join(' | ')} |`).join('\n');
  return rows.length ? `${head}\n${sep}\n${body}` : '_None found._';
}

function esc(s) {
  return String(s).replace(/\|/g, '\\|');
}

function renderMarkdown(d) {
  const s = d.summary;
  const lines = [];
  const P = (...x) => lines.push(...x);

  P('# UltraTextGen — CSS Audit Report', '');
  P(`_Generated: ${d.generatedAt}_`, '');
  P('> Advisory only. This audit changes no CSS. Items marked **NEEDS VERIFICATION** ' +
    'are uncertain — confirm in a browser and check JavaScript before moving or deleting anything.', '');

  // ── Summary ──
  P('## 1. Summary', '');
  P(table(['Metric', 'Value'], [
    ['HTML files scanned', s.htmlFiles],
    ['CSS files', s.cssFiles],
    ['JS files scanned', s.jsFiles],
    ['Inline `style="..."` occurrences', s.inlineStyleOccurrences],
    ['Files containing inline styles', s.filesWithInlineStyles],
    ['Inline risk (low / med / high)', `${s.inlineRiskTally.low} / ${s.inlineRiskTally.medium} / ${s.inlineRiskTally.high}`],
    ['`<style>` blocks in HTML', s.styleBlocks],
    ['Unique HTML classes', s.uniqueClasses],
    ['Component class candidates', s.componentClassCandidates],
    ['One-off class candidates', s.oneOffClassCandidates],
    ['Repeated inline patterns', s.repeatedInlinePatterns],
    ['style.css selectors parsed', s.cssSelectorsTotal],
    ['…referenced (HTML/JS/structural)', s.cssSelectorsReferenced],
    ['…unreferenced (needs verification)', s.cssSelectorsUnreferenced]
  ]));
  P('');
  P('Page-type breakdown: ' +
    Object.entries(s.pageTypes).map(([k, v]) => `${k}: ${v}`).join(', '), '');

  // ── Top problems ──
  P('## 2. Top Problems', '');
  const top = [];
  if (s.inlineStyleOccurrences > 0) {
    top.push(`**${s.inlineStyleOccurrences} inline styles** across ${s.filesWithInlineStyles} files — ` +
      `the biggest maintainability drag. ${s.inlineRiskTally.low} are low-risk and safe to consolidate.`);
  }
  if (s.repeatedInlinePatterns > 0) {
    const t = d.repeatedPatterns[0];
    top.push(`**${s.repeatedInlinePatterns} repeated inline patterns** — e.g. \`${esc(clip(t.pattern, 50))}\` ` +
      `appears ${t.count}× and should become a utility class.`);
  }
  if (s.styleBlocks > 0) {
    top.push(`**${s.styleBlocks} \`<style>\` blocks** embedded in HTML — review whether any belong in style.css.`);
  }
  if (s.cssSelectorsUnreferenced > 0) {
    top.push(`**${s.cssSelectorsUnreferenced} style.css selectors** had no HTML/JS reference — possible dead CSS, ` +
      `but all marked *needs verification* (may be dynamic or generated).`);
  }
  P(top.map((t, i) => `${i + 1}. ${t}`).join('\n'), '');

  // ── 3 / inline findings ──
  P('## 3. Inline Style Findings', '');
  P('Files with the most inline styles (full list in `css-audit-data.json`):', '');
  P(table(['File', 'Inline styles'],
    d.inlinePerFile.slice(0, T.mdTopN).map(r => [esc(r.file), r.count])));
  P('');
  P('Sample occurrences with risk classification:', '');
  P(table(['File', 'Line', 'Snippet', 'Risk'],
    d.inlineFindings.slice(0, T.mdTopN).map(f =>
      [esc(f.file), f.line, esc(f.snippet), f.risk])));
  P('');
  P('Risk legend: ' + Object.entries(RISK_NOTE).map(([k, v]) => `**${k}** = ${v}`).join('; ') + '.', '');

  // ── style blocks ──
  P('## 4. `<style>` Block Findings', '');
  P(table(['File', 'Line', 'CSS lines', 'Assessment', 'Risk'],
    d.styleBlockFindings.map(b =>
      [esc(b.file), b.line, b.cssLines, b.reusableGuess, b.risk])));

  // ── CSS inventory ──
  P('', '## 5. CSS File Inventory', '');
  P(table(['File', 'Size', 'Lines', 'Inferred purpose'],
    d.cssInventory.map(c => [esc(c.file), c.sizeHuman, c.lines, c.purpose])));

  // ── reusable candidates ──
  P('', '## 6. Reusable Component Candidates', '');
  P(`Classes used on ≥ ${d.thresholds.componentMinPages} pages — strong candidates for shared components in style.css:`, '');
  P(table(['Class', 'Pages', 'Occurrences'],
    d.componentClasses.slice(0, T.mdTopN).map(c => [esc(c.class), c.pages, c.occurrences])));
  P('');
  P('### Repeated inline patterns → utility class candidates', '');
  P(table(['Pattern', 'Count', 'Suggested utility', 'Risk'],
    d.repeatedPatterns.slice(0, T.mdTopN).map(p =>
      [esc(clip(p.pattern, 55)), p.count, esc(p.suggestedUtility), p.risk])));
  P('');
  P('### One-off classes (used on a single page)', '');
  P(`${d.oneOffClasses.length} classes appear on only one page — likely genuinely page-specific. ` +
    'Top 15 shown; full list in JSON.', '');
  P(table(['Class', 'Occurrences'],
    d.oneOffClasses.slice(0, 15).map(c => [esc(c.class), c.occurrences])));

  // ── unused CSS ──
  P('', '## 7. Possible Unused CSS (NEEDS VERIFICATION)', '');
  P('Selectors in `style.css` with **no** HTML reference and **no** strict JS reference. ' +
    'These are NOT confirmed dead — a class may be injected dynamically, built from a ' +
    'template string, or used by a page not yet scanned. **Verify before removing.**', '');
  P(table(['Selector', 'Line', 'Verdict', 'Note'],
    d.cssSelectors.unreferenced.slice(0, 40).map(u =>
      [esc(clip(u.selector, 45)), u.line, u.verdict, esc(u.note)])));
  P('');
  if (d.cssSelectors.unreferenced.length > 40) {
    P(`…and ${d.cssSelectors.unreferenced.length - 40} more in \`css-audit-data.json\`.`, '');
  }
  P(`JS class-reference tokens collected: ${d.jsStrictTokenCount} (strict). ` +
    'These were used to avoid falsely flagging JS-driven CSS.', '');

  // ── next actions ──
  P('## 8. Recommended Next Actions', '');
  P([
    '1. **Tackle low-risk repeated inline patterns first.** Introduce a small set of ' +
      'utility classes (see §6) for the most-repeated declarations and replace inline usage.',
    '2. **Leave high-risk inline styles (`display:none`, `visibility:hidden`, positioning) alone** ' +
      'until you confirm they are not toggled by JavaScript.',
    '3. **Review `<style>` blocks (§4):** fold any "possibly reusable" blocks into style.css; ' +
      'keep page-specific/animation blocks where they are or move to a dedicated page CSS file.',
    '4. **Do not delete any §7 selector** without first grepping JS and checking the live page. ' +
      'Treat that list as a to-investigate queue, not a delete list.',
    '5. **Re-run `npm run audit:css` after every batch** and after adding new pages to track drift.'
  ].join('\n'), '');

  // ── PR sequence ──
  P('## 9. Recommended PR Sequence', '');
  P([
    '**PR 1 — Utility classes (low risk):** add utility classes to style.css for the top repeated ' +
      'low-risk patterns (text-align, margins, text-decoration, secondary text color). No behavior change.',
    '**PR 2 — Replace inline usage (low risk, mechanical):** swap low-risk inline styles for the new ' +
      'utility classes, one page-type at a time (platform → usecase → guide → category → library → localized).',
    '**PR 3 — Consolidate `<style>` blocks (medium risk):** move reusable embedded CSS into style.css; ' +
      'verify each affected page visually.',
    '**PR 4 — Investigate unused selectors (medium risk):** confirm §7 selectors against JS and live pages, ' +
      'then remove only the confirmed-dead ones.',
    '**PR 5 — Audit guardrail:** wire `npm run audit:css` into CI or a pre-commit check so regressions ' +
      'surface automatically as new pages are added.'
  ].join('\n\n'), '');

  P('', '---', '_Re-run anytime with_ `npm run audit:css`. _Both report files regenerate from scratch._');

  return lines.join('\n') + '\n';
}

main();
