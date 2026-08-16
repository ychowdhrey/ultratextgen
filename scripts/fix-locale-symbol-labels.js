#!/usr/bin/env node
/**
 * fix-locale-symbol-labels.js — translate symbol-tile labels left in English
 * on locale pages.
 *
 * Companion to scripts/fix-locale-template-strings.js: that one fixes shared
 * page *furniture* (the same string on hundreds of pages). This one fixes
 * per-page tile vocabulary, which is real translation and therefore lives in
 * an explicit, reviewable table rather than in a heuristic.
 *
 * A symbol tile carries its name TWICE — once as the visible
 * `<span class="flag-label">` and once inside the button's `aria-label`
 * ("<copy verb> <name>"). Translating only one of them is the exact defect
 * CLAUDE.md's "Structure is not language" section records, so this script
 * always rewrites both or neither.
 *
 * Usage:
 *   node scripts/fix-locale-symbol-labels.js                  # dry run, all pages
 *   node scripts/fix-locale-symbol-labels.js --write          # apply
 *   node scripts/fix-locale-symbol-labels.js --page <relPath> # scope to one page
 *
 * Safety rules, each of which exists because the alternative silently
 * corrupts a page:
 *   · A label is replaced only on an EXACT whole-string match. Substring
 *     replacement would rewrite "Panah Kanan" inside "Panah Kanan Atas".
 *   · The aria-label is rewritten only when its tail is exactly the English
 *     name, so the locale's own copy verb ("Salin", "Copiar", …) is kept.
 *   · A table entry that matches nothing is an error UNLESS the locale string
 *     it would have written is already on the page — that case is "already
 *     applied", which keeps the script idempotent and re-runnable. Without the
 *     distinction every table reports as stale the moment it has been run once,
 *     and a genuinely stale table becomes indistinguishable from a finished one.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const onlyPage = (() => {
  const i = args.indexOf('--page');
  return i !== -1 ? args[i + 1] : null;
})();

/* ------------------------------------------------------------------ *
 * Tables. One entry per page: English tile name -> locale tile name.
 * Names follow the conventions the page itself already uses in the
 * portion that was translated when it was built.
 * ------------------------------------------------------------------ */

/*
 * id/library/simbol-panah — the extended "Panah Lain dari Blok Unicode
 * Arrows" section. The page's first ~100 tiles were translated at build
 * time and this block was not.
 *
 * Vocabulary taken from the page's own translated tiles:
 *   Leftwards/Rightwards/Upwards/Downwards -> Kiri/Kanan/Atas/Bawah
 *   Double -> Ganda · Dashed -> Putus-putus · White -> Putih
 *   With Stroke -> Dicoret · Harpoon -> Harpun · Paired -> Berpasangan
 */
const ID_ARROWS = {
  'Leftwards Arrow With Stroke': 'Panah Kiri Dicoret',
  'Rightwards Arrow With Stroke': 'Panah Kanan Dicoret',
  'Leftwards Wave Arrow': 'Panah Gelombang Kiri',
  'Rightwards Wave Arrow': 'Panah Gelombang Kanan',
  'Leftwards Two Headed Arrow': 'Panah Kiri Berkepala Dua',
  'Upwards Two Headed Arrow': 'Panah Atas Berkepala Dua',
  'Rightwards Two Headed Arrow': 'Panah Kanan Berkepala Dua',
  'Downwards Two Headed Arrow': 'Panah Bawah Berkepala Dua',
  'Leftwards Arrow With Tail': 'Panah Kiri Berekor',
  'Rightwards Arrow With Tail': 'Panah Kanan Berekor',
  'Leftwards Arrow From Bar': 'Panah Kiri dari Garis',
  'Upwards Arrow From Bar': 'Panah Atas dari Garis',
  'Rightwards Arrow From Bar': 'Panah Kanan dari Garis',
  'Downwards Arrow From Bar': 'Panah Bawah dari Garis',
  'Up Down Arrow With Base': 'Panah Atas-Bawah Beralas',
  'Leftwards Arrow With Loop': 'Panah Kiri Berlingkar',
  'Rightwards Arrow With Loop': 'Panah Kanan Berlingkar',
  'Left Right Wave Arrow': 'Panah Gelombang Kiri-Kanan',
  'Left Right Arrow With Stroke': 'Panah Kiri-Kanan Dicoret',
  'Downwards Zigzag Arrow': 'Panah Zigzag Bawah',
  'Upwards Arrow With Tip Leftwards': 'Panah Atas Ujung Kiri',
  'Upwards Arrow With Tip Rightwards': 'Panah Atas Ujung Kanan',
  'Downwards Arrow With Tip Leftwards': 'Panah Bawah Ujung Kiri',
  'Downwards Arrow With Tip Rightwards': 'Panah Bawah Ujung Kanan',
  'Rightwards Arrow With Corner Downwards': 'Panah Kanan Bersiku Bawah',
  'Downwards Arrow With Corner Leftwards': 'Panah Bawah Bersiku Kiri',
  'North West Arrow To Long Bar': 'Panah Barat Laut ke Garis Panjang',
  // U+21B9 is the Tab key glyph; the descriptive Unicode name is unhelpful
  // as a tile label, and the page's own UI section already labels tiles by
  // their role ("Item Menu ▸", "Dropdown ▾").
  'Leftwards Arrow To Bar Over Rightwards Arrow To Bar': 'Panah Tab Dua Arah',
  'Leftwards Harpoon With Barb Upwards': 'Harpun Kiri Kait Atas',
  'Leftwards Harpoon With Barb Downwards': 'Harpun Kiri Kait Bawah',
  'Upwards Harpoon With Barb Rightwards': 'Harpun Atas Kait Kanan',
  'Upwards Harpoon With Barb Leftwards': 'Harpun Atas Kait Kiri',
  'Rightwards Harpoon With Barb Upwards': 'Harpun Kanan Kait Atas',
  'Rightwards Harpoon With Barb Downwards': 'Harpun Kanan Kait Bawah',
  'Downwards Harpoon With Barb Rightwards': 'Harpun Bawah Kait Kanan',
  'Downwards Harpoon With Barb Leftwards': 'Harpun Bawah Kait Kiri',
  'Rightwards Arrow Over Leftwards Arrow': 'Panah Kanan di Atas Panah Kiri',
  'Upwards Arrow Leftwards Of Downwards Arrow': 'Panah Atas di Kiri Panah Bawah',
  'Leftwards Arrow Over Rightwards Arrow': 'Panah Kiri di Atas Panah Kanan',
  'Leftwards Paired Arrows': 'Panah Kiri Berpasangan',
  'Upwards Paired Arrows': 'Panah Atas Berpasangan',
  'Rightwards Paired Arrows': 'Panah Kanan Berpasangan',
  'Downwards Paired Arrows': 'Panah Bawah Berpasangan',
  'Leftwards Harpoon Over Rightwards Harpoon': 'Harpun Kiri di Atas Harpun Kanan',
  'Rightwards Harpoon Over Leftwards Harpoon': 'Harpun Kanan di Atas Harpun Kiri',
  'Leftwards Double Arrow With Stroke': 'Panah Ganda Kiri Dicoret',
  'Left Right Double Arrow With Stroke': 'Panah Ganda Kiri-Kanan Dicoret',
  'Rightwards Double Arrow With Stroke': 'Panah Ganda Kanan Dicoret',
  'North West Double Arrow': 'Panah Ganda Barat Laut',
  'North East Double Arrow': 'Panah Ganda Timur Laut',
  'South East Double Arrow': 'Panah Ganda Tenggara',
  'South West Double Arrow': 'Panah Ganda Barat Daya',
  'Leftwards Triple Arrow': 'Panah Tripel Kiri',
  'Rightwards Triple Arrow': 'Panah Tripel Kanan',
  'Leftwards Squiggle Arrow': 'Panah Berkelok Kiri',
  'Rightwards Squiggle Arrow': 'Panah Berkelok Kanan',
  'Upwards Arrow With Double Stroke': 'Panah Atas Coret Ganda',
  'Downwards Arrow With Double Stroke': 'Panah Bawah Coret Ganda',
  'Leftwards Dashed Arrow': 'Panah Putus-putus Kiri',
  'Upwards Dashed Arrow': 'Panah Putus-putus Atas',
  'Rightwards Dashed Arrow': 'Panah Putus-putus Kanan',
  'Downwards Dashed Arrow': 'Panah Putus-putus Bawah',
  'Leftwards Arrow To Bar': 'Panah Kiri ke Garis',
  'Rightwards Arrow To Bar': 'Panah Kanan ke Garis',
  'Leftwards White Arrow': 'Panah Putih Kiri',
  'Upwards White Arrow': 'Panah Putih Atas',
  'Rightwards White Arrow': 'Panah Putih Kanan',
  'Downwards White Arrow': 'Panah Putih Bawah',
  'Upwards White Arrow From Bar': 'Panah Putih Atas dari Garis',
  'Upwards White Arrow On Pedestal': 'Panah Putih Atas Beralas',
  'Upwards White Arrow On Pedestal With Horizontal Bar': 'Panah Putih Atas Beralas Garis Datar',
  'Upwards White Arrow On Pedestal With Vertical Bar': 'Panah Putih Atas Beralas Garis Tegak',
  'Upwards White Double Arrow': 'Panah Ganda Putih Atas',
  'Upwards White Double Arrow On Pedestal': 'Panah Ganda Putih Atas Beralas',
  'Rightwards White Arrow From Wall': 'Panah Putih Kanan dari Dinding',
  'North West Arrow To Corner': 'Panah Barat Laut ke Sudut',
  'South East Arrow To Corner': 'Panah Tenggara ke Sudut',
  'Up Down White Arrow': 'Panah Putih Atas-Bawah',
  'Right Arrow With Small Circle': 'Panah Kanan Berlingkaran Kecil',
  'Downwards Arrow Leftwards Of Upwards Arrow': 'Panah Bawah di Kiri Panah Atas',
  'Three Rightwards Arrows': 'Tiga Panah Kanan',
  'Leftwards Arrow With Vertical Stroke': 'Panah Kiri Coret Tegak',
  'Rightwards Arrow With Vertical Stroke': 'Panah Kanan Coret Tegak',
  'Left Right Arrow With Vertical Stroke': 'Panah Kiri-Kanan Coret Tegak',
  'Leftwards Arrow With Double Vertical Stroke': 'Panah Kiri Coret Tegak Ganda',
  'Rightwards Arrow With Double Vertical Stroke': 'Panah Kanan Coret Tegak Ganda',
  'Left Right Arrow With Double Vertical Stroke': 'Panah Kiri-Kanan Coret Tegak Ganda',
  'Leftwards Open-headed Arrow': 'Panah Kiri Kepala Terbuka',
  'Rightwards Open-headed Arrow': 'Panah Kanan Kepala Terbuka',
  'Left Right Open-headed Arrow': 'Panah Kiri-Kanan Kepala Terbuka'
};

/*
 * es/library/simbolos-para-fortnite — the Spanish twin of the already-translated
 * id/library/simbol-fortnite, which is where this vocabulary was harvested from
 * rather than invented. Sentence case, matching every other es/library/* tile
 * page ("Rupia india", "Signo de multiplicación").
 *
 * Gamer jargon the Spanish Fortnite community uses untranslated is kept:
 * "sweaty", "tag", "kanji". Two pairs deliberately given distinct wordings so
 * they cannot collide: 乂 "hojas cruzadas" vs ⚔ "espadas cruzadas", and
 * ⌖ "punto de mira" vs ⊕ "mira telescópica".
 */
const ES_FORTNITE = {
  'Katakana Tsu (Sweaty Smile)': 'Katakana Tsu (sonrisa sweaty)',
  'Katakana Si (Tilted Smile)': 'Katakana Si (sonrisa inclinada)',
  'Katakana Small Tu': 'Katakana Tu pequeña',
  'Yi — Crossed Blades Mark': 'Yi — marca de hojas cruzadas',
  'Sui — Stacked Tier Mark': 'Sui — marca de niveles apilados',
  'Ideographic Iteration Mark': 'Marca de iteración ideográfica',
  'San — Triple Slash': 'San — triple tajo',
  'Oni — Demon': 'Oni — demonio',
  'Ryu — Dragon': 'Ryu — dragón',
  'Kami — God': 'Kami — dios',
  'O — King': 'O — rey',
  'Kage — Shadow': 'Kage — sombra',
  'Ha — Blade': 'Ha — hoja',
  'Kaminari — Thunder': 'Kaminari — trueno',
  'Hi — Fire': 'Hi — fuego',
  'Kaze — Wind': 'Kaze — viento',
  'Yami — Darkness': 'Yami — oscuridad',
  'Black Star': 'Estrella negra',
  'White Star': 'Estrella blanca',
  'Shadowed White Star': 'Estrella blanca sombreada',
  'Black Four-Pointed Star': 'Estrella negra de cuatro puntas',
  'White Four-Pointed Star': 'Estrella blanca de cuatro puntas',
  'Pinwheel Star': 'Estrella molinillo',
  'Circled White Star': 'Estrella blanca en círculo',
  'APL Circle Star': 'Estrella APL en círculo',
  'High Voltage': 'Alta tensión',
  'Greek Small Letter Koppa (Lightning Bolt Style)': 'Koppa griega minúscula (estilo rayo)',
  'Left Corner Bracket': 'Corchete angular izquierdo',
  'Right Corner Bracket': 'Corchete angular derecho',
  'Left White Corner Bracket': 'Corchete angular blanco izquierdo',
  'Right White Corner Bracket': 'Corchete angular blanco derecho',
  'Left Black Lenticular Bracket': 'Corchete lenticular negro izquierdo',
  'Right Black Lenticular Bracket': 'Corchete lenticular negro derecho',
  'Left White Lenticular Bracket': 'Corchete lenticular blanco izquierdo',
  'Right White Lenticular Bracket': 'Corchete lenticular blanco derecho',
  'Left Double Angle Bracket': 'Corchete angular doble izquierdo',
  'Right Double Angle Bracket': 'Corchete angular doble derecho',
  'Position Indicator (Crosshair)': 'Indicador de posición (punto de mira)',
  'Open Centre Cross': 'Cruz de centro abierto',
  'Heavy Open Centre Cross': 'Cruz gruesa de centro abierto',
  'Bullseye': 'Diana',
  'Circled Plus (Scope)': 'Más en círculo (mira telescópica)',
  'Crossed Swords': 'Espadas cruzadas',
  'Skull and Crossbones': 'Calavera y tibias cruzadas',
  'Direct Hit': 'Impacto directo'
};

/*
 * id/library/simbol-ml — Mobile Legends nickname symbols. Title case, matching
 * the page's own translated section labels ("Simbol Nick", "Ornamen", "Aksen").
 * "Nick", "tag" and "squad" are the terms the Indonesian MLBB community uses.
 * "Huruf Pengubah" is the standard Indonesian rendering of Unicode's
 * "Modifier Letter".
 */
const ID_MLBB = {
  'Modifier Letter Capital A': 'Huruf Pengubah Kapital A',
  'Modifier Letter Capital B': 'Huruf Pengubah Kapital B',
  'Modifier Letter Capital G': 'Huruf Pengubah Kapital G',
  'Modifier Letter Capital I': 'Huruf Pengubah Kapital I',
  'Modifier Letter Capital K': 'Huruf Pengubah Kapital K',
  'Modifier Letter Capital L': 'Huruf Pengubah Kapital L',
  'Modifier Letter Capital M': 'Huruf Pengubah Kapital M',
  'Modifier Letter Capital N': 'Huruf Pengubah Kapital N',
  'Modifier Letter Capital O': 'Huruf Pengubah Kapital O',
  'Modifier Letter Capital R': 'Huruf Pengubah Kapital R',
  'Modifier Letter Small O': 'Huruf Pengubah Kecil O',
  'Modifier Letter Small D': 'Huruf Pengubah Kecil D',
  'Tsuki — Moon': 'Tsuki — Bulan',
  'Hoshi — Star': 'Hoshi — Bintang',
  'Hikari — Light': 'Hikari — Cahaya',
  'Tamashii — Soul': 'Tamashii — Jiwa',
  'Arashi — Storm': 'Arashi — Badai',
  'Tora — Tiger': 'Tora — Harimau',
  'Okami — Wolf': 'Okami — Serigala',
  'Taka — Hawk': 'Taka — Elang',
  'Ken — Sword': 'Ken — Pedang',
  'Ha — Supremacy': 'Ha — Supremasi',
  'Black Four-Pointed Star': 'Bintang Empat Ujung Hitam',
  'White Four-Pointed Star': 'Bintang Empat Ujung Putih',
  'Black Diamond Minus White X': 'Belah Ketupat Hitam dengan X Putih',
  'Sixteen Pointed Asterisk': 'Asterisk Enam Belas Ujung',
  'Heavy Sparkle': 'Kilau Tebal',
  'Heavy Eight Teardrop-Spoked Propeller Asterisk': 'Asterisk Baling-baling Delapan Tetes Tebal',
  'Six Petalled Black and White Florette': 'Floret Enam Kelopak Hitam Putih',
  'Heavy Teardrop-Spoked Pinwheel Asterisk': 'Asterisk Kincir Tetes Tebal',
  'Heavy Four Balloon-Spoked Asterisk': 'Asterisk Empat Balon Tebal',
  'Four Balloon-Spoked Asterisk': 'Asterisk Empat Balon',
  'Left Tortoise Shell Bracket': 'Kurung Tempurung Kiri',
  'Right Tortoise Shell Bracket': 'Kurung Tempurung Kanan',
  'Left Black Tortoise Shell Bracket': 'Kurung Tempurung Hitam Kiri',
  'Right Black Tortoise Shell Bracket': 'Kurung Tempurung Hitam Kanan',
  'Heavy Left-Pointing Angle Quotation Mark Ornament': 'Ornamen Kutip Sudut Kiri Tebal',
  'Heavy Right-Pointing Angle Quotation Mark Ornament': 'Ornamen Kutip Sudut Kanan Tebal',
  'Mathematical Left White Square Bracket': 'Kurung Siku Putih Kiri Matematis',
  'Mathematical Right White Square Bracket': 'Kurung Siku Putih Kanan Matematis',
  'Left-Pointing Curved Angle Bracket': 'Kurung Sudut Melengkung Kiri',
  'Right-Pointing Curved Angle Bracket': 'Kurung Sudut Melengkung Kanan',
  'Katakana Middle Dot': 'Titik Tengah Katakana',
  'White Bullet': 'Butir Putih',
  'Bullet': 'Butir',
  'Thai Character Khomut (Finisher Curl)': 'Karakter Thai Khomut (Lengkung Penutup)',
  'Wavy Low Line': 'Garis Bawah Bergelombang',
  'Presentation Form for Vertical Left Parenthesis': 'Kurung Buka Bentuk Vertikal',
  'Presentation Form for Vertical Right Parenthesis': 'Kurung Tutup Bentuk Vertikal'
};

const TABLES = [
  { page: 'id/library/simbol-panah/index.html', labels: ID_ARROWS },

  {
    page: 'es/library/simbolos-para-fortnite/index.html',
    labels: ES_FORTNITE,
    sections: {
      'Clan Stars': 'Estrellas de Clan',
      'Tag Brackets': 'Corchetes de Tag',
      'Combat': 'Combate'
    },
    presets: {
      'Sweaty Smile Frame': 'Marco de sonrisa sweaty',
      'Stacked Tier Tag': 'Tag de niveles apilados',
      'Crossed Blades Wrap': 'Marco de hojas cruzadas',
      'Lightning Strike Tag': 'Tag de rayo',
      'Shadow Kanji Combo': 'Combo de kanji sombra',
      'Star Bracket Clan Tag': 'Tag de clan con estrella',
      'Crosshair Callout': 'Marca de punto de mira'
    }
  },

  {
    page: 'id/library/simbol-ml/index.html',
    labels: ID_MLBB,
    sections: {
      'Epic Kanji': 'Kanji Epik',
      'Nick Brackets': 'Kurung Nick'
    },
    presets: {
      'Classic MLBB Frame': 'Bingkai MLBB Klasik',
      'Khomut Finisher': 'Penutup Khomut',
      'Wolf Spirit Tag': 'Tag Roh Serigala',
      'Squad Banner': 'Spanduk Squad',
      'Moon Veil Nick': 'Nick Selubung Bulan'
    }
  },

  {
    // Visible labels here were translated at build time and three aria-labels
    // were not — the half-translated tile CLAUDE.md's "Structure is not
    // language" section describes. "Sumber Terkait" is the sibling
    // id/library/simbol-ml page's own wording.
    page: 'id/library/simbol-fortnite/index.html',
    sections: {
      'Combat': 'Tempur',
      'Related Resources': 'Sumber Terkait'
    },
    aria: {
      'Copy Bullseye': 'Salin Bullseye',
      'Copy Katakana N': 'Salin Katakana N',
      'Copy Katakana So': 'Salin Katakana So'
    }
  }
];

/* ------------------------------------------------------------------ */

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/*
 * Longest English name first. "Bullet" is a suffix of "White Bullet", so
 * rewriting the short one first would turn `aria-label="Salin White Bullet"`
 * into "Salin White Butir". Handling the long key first removes the string
 * that the short key would otherwise match inside.
 */
const byLengthDesc = (entries) =>
  [...entries].sort((a, b) => b[0].length - a[0].length);

function applyTable(html, table) {
  let out = html;
  const applied = [];
  const missing = [];
  const already = [];

  // A miss is only stale if the translated form is not already on the page.
  const classifyMiss = (en, local, kind) => {
    if (out.includes(local)) already.push(`${kind}: ${en}`);
    else missing.push(`${kind}: ${en}`);
  };

  // --- tile labels: visible <span> + the button's aria-label ---
  for (const [en, local] of byLengthDesc(Object.entries(table.labels || {}))) {
    const labelRe = new RegExp(
      `(<span class="flag-label">)${escapeRe(en)}(</span>)`,
      'g'
    );
    // The copy verb differs per locale and is already translated; keep it and
    // rewrite only the name that follows it. Requiring a space or the opening
    // quote immediately before the name stops a short name matching the tail
    // of a longer one.
    const ariaRe = new RegExp(
      `(aria-label="[^"]*?[ "])${escapeRe(en)}(")`,
      'g'
    );

    const labelHits = (out.match(labelRe) || []).length;
    const ariaHits = (out.match(ariaRe) || []).length;

    if (!labelHits) {
      classifyMiss(en, local, 'label');
      continue;
    }

    out = out.replace(labelRe, `$1${local}$2`);
    out = out.replace(ariaRe, `$1${local}$2`);
    applied.push({ en, local, labelHits, ariaHits, kind: 'tile' });
  }

  // --- section labels ---
  for (const [en, local] of byLengthDesc(Object.entries(table.sections || {}))) {
    const re = new RegExp(
      `(<span class="article-section-label">)${escapeRe(en)}(</span>)`,
      'g'
    );
    const hits = (out.match(re) || []).length;
    if (!hits) {
      classifyMiss(en, local, 'section');
      continue;
    }
    out = out.replace(re, `$1${local}$2`);
    applied.push({ en, local, labelHits: hits, ariaHits: hits, kind: 'section' });
  }

  // --- combo-preset names in the page's own inline GROUPS array ---
  for (const [en, local] of byLengthDesc(Object.entries(table.presets || {}))) {
    const re = new RegExp(`(name: ")${escapeRe(en)}(",)`, 'g');
    const hits = (out.match(re) || []).length;
    if (!hits) {
      classifyMiss(en, local, 'preset');
      continue;
    }
    out = out.replace(re, `$1${local}$2`);
    applied.push({ en, local, labelHits: hits, ariaHits: hits, kind: 'preset' });
  }

  // --- standalone aria-labels whose visible label was already translated ---
  for (const [en, local] of byLengthDesc(Object.entries(table.aria || {}))) {
    const re = new RegExp(`(aria-label=")${escapeRe(en)}(")`, 'g');
    const hits = (out.match(re) || []).length;
    if (!hits) {
      classifyMiss(en, local, 'aria');
      continue;
    }
    out = out.replace(re, `$1${local}$2`);
    applied.push({ en, local, labelHits: hits, ariaHits: hits, kind: 'aria' });
  }

  return { out, applied, missing, already };
}

let totalApplied = 0;
let totalMissing = 0;
let filesChanged = 0;

for (const table of TABLES) {
  const { page } = table;
  if (onlyPage && page !== onlyPage) continue;

  const entryCount = ['labels', 'sections', 'presets', 'aria'].reduce(
    (n, k) => n + Object.keys(table[k] || {}).length,
    0
  );

  const abs = path.join(ROOT, page);
  if (!fs.existsSync(abs)) {
    console.error(`✗ ${page} — file not found`);
    totalMissing += entryCount;
    continue;
  }

  const html = fs.readFileSync(abs, 'utf8');
  const { out, applied, missing, already } = applyTable(html, table);

  console.log(`\n${page}`);
  console.log(`  table entries : ${entryCount}`);
  console.log(`  matched       : ${applied.length}`);
  const ariaGaps = applied.filter((a) => a.ariaHits === 0);
  console.log(`  aria rewritten: ${applied.length - ariaGaps.length}`);
  if (ariaGaps.length) {
    console.log(`  ⚠ label rewritten but no aria-label matched, ${ariaGaps.length}:`);
    for (const a of ariaGaps) console.log(`      · ${a.en}`);
  }
  if (already.length) {
    console.log(`  already applied: ${already.length}`);
  }
  if (missing.length) {
    console.log(`  ✗ stale entries (no tile carries this name), ${missing.length}:`);
    for (const m of missing) console.log(`      · ${m}`);
  }

  totalApplied += applied.length;
  totalMissing += missing.length;

  if (WRITE && out !== html) {
    fs.writeFileSync(abs, out);
    filesChanged++;
  }
}

console.log(
  `\n${WRITE ? 'Applied' : 'Dry run'} — ${totalApplied} label(s) translated, ` +
    `${totalMissing} stale table entr(ies)` +
    (WRITE ? `, ${filesChanged} file(s) written.` : '. Pass --write to apply.')
);

process.exit(totalMissing ? 1 : 0);
