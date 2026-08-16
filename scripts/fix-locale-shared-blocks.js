#!/usr/bin/env node
/**
 * fix-locale-shared-blocks.js — translate shared block furniture that is the
 * same string on many pages of one locale.
 *
 * Third of three, and the split between them is by what the string *is*, not
 * by how many pages carry it:
 *
 *   fix-locale-symbol-labels.js    per-page tile vocabulary (one table per page)
 *   fix-locale-answers-template.js one template, two pages, twelve locales
 *   this one                       one string, one locale, wherever it appears
 *
 * Every value below is harvested from the locale's own pages — the form that
 * locale already uses most for that exact slot — never invented. Where a locale
 * has two established forms the one matching the English sense is taken
 * ("Sumber Terkait" = resources, over "Halaman Terkait" = pages, for
 * "Related Resources").
 *
 * Usage:
 *   node scripts/fix-locale-shared-blocks.js               # dry run
 *   node scripts/fix-locale-shared-blocks.js --write
 *   node scripts/fix-locale-shared-blocks.js --locale zh-tw
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const onlyLocale = (() => {
  const i = args.indexOf('--locale');
  return i !== -1 ? args[i + 1] : null;
})();

/*
 * locale -> { english element text: locale element text }
 *
 * Harvest counts are the number of pages in that locale already using the
 * chosen form, recorded so a later reader can tell a harvested value from a
 * translated one.
 */
const TABLES = {
  id: {
    'Related Resources': 'Sumber Terkait',                          // harvested ×10
    'Transform text with Unicode fonts': 'Ubah teks dengan font Unicode', // ×46
    'Open UltraTextGen →': 'Buka UltraTextGen →',                    // ×73
    'Kaomoji Generator': 'Generator Kaomoji'
  },
  pt: {
    'Related Resources': 'Recursos Relacionados',                    // ×50
    'Transform text with Unicode fonts': 'Transforme texto com fontes Unicode', // ×78
    'Open UltraTextGen →': 'Abrir o UltraTextGen →',                 // ×78
    'Kaomoji Generator': 'Gerador de Kaomoji'
  },
  th: {
    'Related Resources': 'หน้าที่เกี่ยวข้อง',                                  // ×11
    'Transform text with Unicode fonts': 'แปลงข้อความด้วยฟอนต์ Unicode',   // ×13
    'Open UltraTextGen →': 'เปิด UltraTextGen →',                    // ×107
    'Kaomoji Generator': 'เครื่องสร้างคาโอโมจิ'
  },
  ms: {
    'Related Resources': 'Halaman Berkaitan',                        // ×5
    'Transform text with Unicode fonts': 'Tukar teks dengan font Unicode', // ×3
    'Open UltraTextGen →': 'Buka UltraTextGen →'                     // ×5
  },
  'zh-tw': {
    'Related Resources': '相關資源',                                  // ×4
    'Transform text with Unicode fonts': '用 Unicode 字體轉換文字',      // ×33
    'Open UltraTextGen →': '開啟 UltraTextGen →',                    // ×19
    'Kaomoji Generator': '顏文字產生器'
  },
  es: {
    'Kaomoji Generator': 'Generador de Kaomoji',
    '📟 Retro / Pixel': '📟 Retro / Píxel'
  },
  vi: {
    'Kaomoji Generator': 'Trình tạo Kaomoji'
  },

  /*
   * usecase/bio-font style-category tabs.
   *
   * sk, th and ja translated this whole row; fr, es, it, nl and pt translated
   * it except for the words their own markets use untranslated. de, cs, tr and
   * ar left all ten in English, which is the gap below.
   *
   * tl is deliberately absent. Its tab row and half its chips are English, but
   * the page's own translator kept "Gaming Frame", "Bracket" and "Blade Frame"
   * while translating Sparkle→Kislap, Star→Bituin, Crown→Korona — the
   * code-switching pattern of real Filipino UI copy. Which side of that line
   * each tab belongs on is a native-speaker call, so per the audit's own stop
   * rule the rows stay English and get flagged rather than guessed.
   *
   * Loanwords each language genuinely uses are kept and ledgered, not forced:
   * German "Gaming" and "Aesthetic" (the locale's own page slug is
   * aesthetic-schrift), "Retro"/"Pixel"/"Kawaii"/"Hype"/"Minimal" broadly.
   */
  de: {
    '💀 Edgy / Dark': '💀 Edgy / Dunkel',
    '👑 Royal / Elite': '👑 Königlich / Elite',
    '🌸 Cute / Kawaii': '🌸 Süß / Kawaii',
    '🔥 Bold / Hype': '🔥 Fett / Hype',
    '🎯 Clean / Minimal': '🎯 Schlicht / Minimal',
    '🌀 Mystical': '🌀 Mystisch',
    '🌿 Nature / Organic': '🌿 Natur / Organisch'
  },
  // Mirrors the site's own fully-translated Slovak row, which Czech tracks
  // closely (Herné→Herní, Kráľovské→Královské, Príroda→Příroda).
  cs: {
    '⚔️ Gaming': '⚔️ Herní',
    '✨ Aesthetic': '✨ Estetické',
    '💀 Edgy / Dark': '💀 Temné',
    '👑 Royal / Elite': '👑 Královské / Elitní',
    '🌸 Cute / Kawaii': '🌸 Roztomilé / Kawaii',
    '🔥 Bold / Hype': '🔥 Výrazné / Hype',
    '🎯 Clean / Minimal': '🎯 Čisté / Minimalistické',
    '🌀 Mystical': '🌀 Mystické',
    '🌿 Nature / Organic': '🌿 Příroda / Organické'
  },
  tr: {
    '⚔️ Gaming': '⚔️ Oyun',
    '✨ Aesthetic': '✨ Estetik',                     // the locale's own slug is estetik-yazi
    '💀 Edgy / Dark': '💀 Sert / Karanlık',
    '👑 Royal / Elite': '👑 Kraliyet / Elit',
    '🌸 Cute / Kawaii': '🌸 Sevimli / Kawaii',
    '🔥 Bold / Hype': '🔥 İddialı / Hype',
    '🎯 Clean / Minimal': '🎯 Sade / Minimal',
    '🌀 Mystical': '🌀 Mistik',
    '📟 Retro / Pixel': '📟 Retro / Piksel',
    '🌿 Nature / Organic': '🌿 Doğa / Organik'
  },
  ar: {
    '⚔️ Gaming': '⚔️ ألعاب',
    '✨ Aesthetic': '✨ جمالي',
    '💀 Edgy / Dark': '💀 حاد / داكن',
    '👑 Royal / Elite': '👑 ملكي / نخبوي',
    '🌸 Cute / Kawaii': '🌸 لطيف / كاواي',
    '🔥 Bold / Hype': '🔥 عريض / صاخب',
    '🎯 Clean / Minimal': '🎯 نظيف / بسيط',
    '🌀 Mystical': '🌀 غامض',
    '📟 Retro / Pixel': '📟 ريترو / بكسل',
    '🌿 Nature / Organic': '🌿 طبيعي / عضوي'
  },
  it: {
    '🫧 Bubble': '🫧 Bolle'
  },
  nl: {
    '🏰 Gothic': '🏰 Gotisch'
  },
  fr: {
    '🫧 Bubble': '🫧 Bulles',
    // "Cursive" and "script" are both French words for these hands; only the
    // ampersand made the label read as English.
    '✍️ Cursive &amp; Script': '✍️ Cursive et script'
  }
};

/* ------------------------------------------------------------------ */

const SKIP_DIRS = new Set(['node_modules', '.git', 'assets', 'scripts', 'data', 'docs', 'functions', 'js', '.github']);

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
      walk(path.join(dir, e.name), acc);
    } else if (e.name === 'index.html') acc.push(path.join(dir, e.name));
  }
  return acc;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let total = 0;
let files = 0;
const perString = new Map();

for (const [locale, table] of Object.entries(TABLES)) {
  if (onlyLocale && locale !== onlyLocale) continue;
  const dir = path.join(ROOT, locale);
  if (!fs.existsSync(dir)) {
    console.error(`✗ ${locale}/ does not exist`);
    continue;
  }

  for (const abs of walk(dir)) {
    const before = fs.readFileSync(abs, 'utf8');
    let out = before;
    let n = 0;

    for (const [en, local] of Object.entries(table)) {
      // Exact element-content match, so a short key can never hit a substring
      // of a longer string or land inside an attribute value.
      const re = new RegExp(`>${escapeRe(en)}<`, 'g');
      const hits = (out.match(re) || []).length;
      if (!hits) continue;
      out = out.replace(re, `>${local}<`);
      n += hits;
      const k = `${locale} :: ${en}`;
      perString.set(k, (perString.get(k) || 0) + hits);
    }

    if (n) {
      total += n;
      files++;
      if (WRITE) fs.writeFileSync(abs, out);
    }
  }
}

for (const [k, v] of [...perString].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(4)}  ${k}`);
}
console.log(
  `\n${WRITE ? 'Applied' : 'Dry run'} — ${total} string(s) across ${files} file(s)` +
    (WRITE ? '.' : '. Pass --write to apply.')
);
