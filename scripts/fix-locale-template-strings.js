#!/usr/bin/env node
'use strict';

/**
 * fix-locale-template-strings.js
 *
 * One-time drawdown of the three most widespread untranslated template strings on
 * locale pages, found by scripts/audit-locale-translation.js:
 *
 *   aria-label="Breadcrumb"        1,924 locale files
 *   aria-label="Language switcher"   312 locale files
 *   the shared CTA card (h3 + p + button)  428 cards in 16 locales
 *
 * Why these three and not the rest of the backlog: they are page FURNITURE, copied
 * from an English source page whenever a new locale page was made. They are the same
 * string everywhere, so they are the only part of that backlog that a script can fix
 * correctly. The remaining ~1,000 distinct strings are per-page content and need real
 * translation, not a pass like this one.
 *
 * The first two are accessibility defects rather than content debt: an aria-label is
 * what a screen reader announces, so an English one on a Vietnamese page is read out
 * in English to a Vietnamese speaker.
 *
 * ── Where the translations come from ──────────────────────────────────────────
 * Wherever possible, from THE SITE ITSELF. Every CTA value below, and 19 of the 30
 * breadcrumb values and 26 of the 30 language-switcher values, are the locale's own
 * dominant existing form — harvested from pages that already do it correctly. That
 * makes most of this a normalisation rather than a translation: the site already
 * disagreed with itself (German alone had `Brotkrümelnavigation` ×58,
 * `Navigationspfad` ×8 and `Brotkrumennavigation` ×5 alongside 75 English ones), and
 * this settles it on the form already most used.
 *
 * Values marked `supplied: true` had no native form anywhere on the site. They are
 * the standard term for the pattern in that language.
 *
 * ── The stop rule ─────────────────────────────────────────────────────────────
 * A locale with no entry below is left in English rather than guessed at. A wrong
 * aria-label is worse for a screen-reader user than an English one — see
 * docs/LOCALE-TRANSLATION-COMPLETENESS-AUDIT (lab repo) §7.
 *
 * Usage:
 *   node scripts/fix-locale-template-strings.js --dry-run   # report only
 *   node scripts/fix-locale-template-strings.js --write     # apply
 *   node scripts/fix-locale-template-strings.js --write --locale nl
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// aria-label on the breadcrumb <nav>.
//
// A parallel session shipped the same breadcrumb pass as PR #771 while this one
// was open, and the two agreed on 23 of 30 values independently — which is the
// best evidence available that those 23 are right. The 7 that differed (bs, fi,
// id, ms, ro, sr, tr) are reconciled here ONTO PR #771's choice, because that is
// what is live; a merge conflict is the wrong place to relitigate wording.
//
// This table must keep matching what shipped, or re-running the script would
// silently revert someone else's merged decision.
const BREADCRUMB = {
  ar: 'مسار التنقّل',           bs: 'Navigacijski trag',    cs: 'Drobečková navigace',
  da: 'Brødkrummesti',          de: 'Brotkrümelnavigation', es: 'Ruta de navegación',
  fi: 'Navigointipolku',        fr: "Fil d'Ariane",         hi: 'नेविगेशन पथ',
  hr: 'Navigacijski trag',      hu: 'Morzsamenü',           id: 'Remah roti',
  it: 'Percorso di navigazione', ja: 'パンくずリスト',        ko: '탐색 경로',
  ms: 'Remah roti',             nl: 'Kruimelpad',           no: 'Brødsmulesti',
  pl: 'Ścieżka nawigacji',      pt: 'Trilha de navegação',  ro: 'Fir de navigare',
  ru: 'Хлебные крошки',         sk: 'Navigačná cesta',      sr: 'Putanja',
  sv: 'Brödsmulor',             th: 'เส้นทางนำทาง',          tl: 'Landas ng nabigasyon',
  tr: 'Gezinme yolu',           vi: 'Đường dẫn',            'zh-tw': '麵包屑導覽'
};

// aria-label on the language-switcher container.
const LANG_SWITCHER = {
  ar: 'اختيار اللغة',           bs: 'Odabir jezika',        cs: 'Výběr jazyka',
  da: 'Sprogvælger',            de: 'Sprachauswahl',        es: 'Selector de idioma',
  fi: 'Kielen valinta',         fr: 'Sélecteur de langue',  hi: 'भाषा चयनकर्ता',
  hr: 'Odabir jezika',          hu: 'Nyelvválasztás',       id: 'Pemilih bahasa',
  it: 'Selettore di lingua',    ja: '言語切り替え',           ko: '언어 선택',
  ms: 'Pemilih bahasa',         nl: 'Taalkeuze',            no: 'Språkvalg',
  pl: 'Wybór języka',           pt: 'Seletor de idioma',    ro: 'Selector de limbă',
  ru: 'Выбор языка',            sk: 'Výber jazyka',         sr: 'Odabir jezika',
  sv: 'Språkväljare',           th: 'ตัวเลือกภาษา',          tl: 'Tagapili ng wika',
  tr: 'Dil seçici',             vi: 'Bộ chọn ngôn ngữ',     'zh-tw': '語言切換'
};

const EN_CTA = {
  h3: 'Transform text with Unicode fonts',
  p: 'Use UltraTextGen to convert plain text into bold, italic, cursive, and 100+ ' +
     'other Unicode font styles — free and instant.',
  btn: 'Open UltraTextGen →'
};

// Every value here is the locale's own dominant existing form, harvested from cards
// that are already translated. Nothing in this table is newly written.
//
// `btn: null` means the correct form in that language IS the English string — Dutch
// "Open UltraTextGen →" is correct Dutch — so the button is left alone and the string
// is registered in data/translation_identical_strings.json instead.
const CTA = {
  ar: { h3: 'حوّل نصك بخطوط يونيكود',
        p: 'استخدم UltraTextGen لتحويل النص العادي إلى خط عريض ومائل وخط يد وأكثر من 100 نمط يونيكود آخر — مجاناً وفوراً.',
        btn: 'افتح UltraTextGen ←' },
  de: { h3: 'Text mit Unicode-Schriftarten verwandeln',
        p: 'Mit UltraTextGen verwandelst du normalen Text in fett, kursiv, Schreibschrift und über 100 weitere Unicode-Schriftstile — kostenlos und sofort.',
        btn: 'UltraTextGen öffnen →' },
  es: { h3: 'Transforma texto con fuentes Unicode',
        p: 'Usa UltraTextGen para convertir texto normal en negrita, cursiva, caligrafía y más de 100 estilos de fuente Unicode — gratis y al instante.',
        btn: 'Abrir UltraTextGen →' },
  fr: { h3: 'Transformez votre texte avec des polices Unicode',
        p: 'Utilise UltraTextGen pour transformer du texte brut en gras, italique, cursive et plus de 100 autres styles de police Unicode — gratuit et instantané.',
        btn: 'Ouvrir UltraTextGen →' },
  id: { h3: 'Ubah teks dengan font Unicode',
        p: 'Pakai UltraTextGen buat ubah teks biasa jadi huruf tebal, miring, sambung, dan 100+ gaya Unicode lain — gratis dan instan.',
        btn: 'Buka UltraTextGen →' },
  it: { h3: 'Trasforma il testo con i font Unicode',
        p: 'Con UltraTextGen trasformi il testo normale in grassetto, corsivo, scrittura corsiva e oltre 100 altri stili di font Unicode — gratis e all’istante.',
        btn: 'Apri UltraTextGen →' },
  ja: { h3: 'Unicodeフォントで文字を変換',
        p: 'UltraTextGen なら、普通のテキストを太字・斜体・筆記体など100種類以上のUnicodeフォントスタイルに変換できます — 無料ですぐに使えます。',
        btn: 'UltraTextGenを開く →' },
  ko: { h3: '유니코드 폰트로 텍스트를 변환해보세요',
        p: 'UltraTextGen을 쓰면 평범한 텍스트가 볼드체, 필기체 등 100가지가 넘는 유니코드 스타일로 무료로 즉시 바뀝니다.',
        btn: 'UltraTextGen 열기 →' },
  nl: { h3: 'Zet tekst om met Unicode-lettertypes',
        p: 'Gebruik UltraTextGen om platte tekst om te zetten in vet, cursief, sierlijk en meer dan 100 andere Unicode-lettertypes — gratis en direct.',
        btn: null },
  pl: { h3: 'Zamień tekst na czcionki Unicode',
        p: 'Skorzystaj z generatora UltraTextGen, aby zamienić zwykły tekst na pogrubiony, kursywą, gotycki i dziesiątki innych stylów Unicode — za darmo i natychmiast.',
        btn: 'Otwórz UltraTextGen →' },
  pt: { h3: 'Transforme texto com fontes Unicode',
        p: 'Use o UltraTextGen para transformar texto comum em negrito, itálico, cursiva e mais de 100 estilos de fonte Unicode — grátis e na hora.',
        btn: 'Abrir o UltraTextGen →' },
  ru: { h3: 'Преобразуйте текст в необычные шрифты Unicode',
        p: 'Используйте UltraTextGen, чтобы превратить обычный текст в жирный, курсивный, рукописный и 100+ других стилей Unicode — бесплатно и мгновенно.',
        btn: 'Открыть UltraTextGen →' },
  th: { h3: 'แปลงข้อความด้วยฟอนต์ Unicode',
        p: 'ใช้ UltraTextGen เปลี่ยนข้อความธรรมดาให้เป็นฟอนต์ Unicode ตัวหนา ตัวเอียง ลายมือ และอีกกว่า 100 แบบ — ฟรีและทันที',
        btn: 'เปิด UltraTextGen →' },
  tr: { h3: 'Metni Unicode fontlarla dönüştür',
        p: 'UltraTextGen ile düz metni kalın, italik, el yazısı ve 100’den fazla Unicode yazı stiline anında ve ücretsiz çevir.',
        btn: 'UltraTextGen’i Aç →' },
  vi: { h3: 'Chuyển đổi văn bản bằng phông chữ Unicode',
        p: 'Dùng UltraTextGen để biến văn bản thường thành chữ đậm, nghiêng, thư pháp và hơn 100 kiểu phông chữ Unicode khác — miễn phí và tức thì.',
        btn: 'Mở UltraTextGen →' },
  'zh-tw': { h3: '用 Unicode 字體轉換文字',
        p: '用 UltraTextGen 把純文字轉換成粗體、斜體、花體等 100 多種 Unicode 字體——免費、即時。',
        btn: '開啟 UltraTextGen →' }
};

// ── Pass 4: section kickers (added 2026-08-16) ───────────────────────────────
//
// `<span class="article-section-label">` is the small kicker above a section's
// <h2>. On 77 pages it is still English while everything under it — including
// that very <h2> — is fully translated, so this is the same page-furniture class
// as the three passes above, not content debt.
//
// Two provenance tiers, kept visibly separate because they carry different
// confidence:
//
//   HARVESTED — the locale's own dominant existing form, counted across its
//   already-correct pages. "Quick answer" was unanimous in 11 of 12 locales
//   (pt 3/4). "Related Resources" resolves to each locale's dominant
//   related-pages kicker; note `id` uses `Halaman Terkait` (×170) rather than
//   the generator's `Sumber Terkait` (×30) — same settle-on-the-majority rule
//   pass 1 used for the German breadcrumb.
//
//   SUPPLIED — `The details`, `Keep exploring` and `Style your own text` are
//   the template's generic defaults. Better-authored pages replace them with
//   bespoke labels, so there is nothing to harvest and these are written here.
//   They are short UI kickers, and each sits directly above an already-
//   translated <h2> that fixes the register (nl "Style your own text" sits on
//   "Zelf tekst stylen voor Pinterest").
//
// Stop rule unchanged: a locale absent from a table keeps the English string.
const SECTION_LABEL = {
  // harvested                    supplied ───────────────────────────────────
  ar: { 'Quick answer': 'الإجابة السريعة',  'Related Resources': null,
        'The details': 'التفاصيل', 'Keep exploring': 'تصفح المزيد', 'Style your own text': 'نسّق نصك' },
  es: { 'Quick answer': 'Respuesta corta',  'Related Resources': null,
        'The details': 'En detalle', 'Keep exploring': 'Sigue explorando', 'Style your own text': 'Dale estilo a tu texto' },
  fr: { 'Quick answer': 'Réponse courte',   'Related Resources': null,
        'The details': 'En détail', 'Keep exploring': 'À explorer aussi', 'Style your own text': 'Stylise ton texte' },
  id: { 'Quick answer': 'Jawaban singkat',  'Related Resources': 'Halaman Terkait',
        'The details': 'Rinciannya', 'Keep exploring': 'Jelajahi lainnya', 'Style your own text': 'Gaya teksmu sendiri' },
  it: { 'Quick answer': 'Risposta breve',   'Related Resources': null,
        'The details': 'In dettaglio', 'Keep exploring': 'Continua a esplorare', 'Style your own text': 'Personalizza il tuo testo' },
  ja: { 'Quick answer': 'かんたんな答え',    'Related Resources': null,
        'The details': '詳細', 'Keep exploring': '関連ページ', 'Style your own text': '自分のテキストを装飾' },
  ms: { 'Quick answer': null,               'Related Resources': 'Halaman Berkaitan',
        'The details': null, 'Keep exploring': null, 'Style your own text': null },
  nl: { 'Quick answer': 'Kort antwoord',    'Related Resources': null,
        'The details': 'De details', 'Keep exploring': 'Verder kijken', 'Style your own text': 'Zelf tekst stylen' },
  pl: { 'Quick answer': 'Krótka odpowiedź', 'Related Resources': null,
        'The details': 'Szczegóły', 'Keep exploring': 'Zobacz więcej', 'Style your own text': 'Ostyluj swój tekst' },
  pt: { 'Quick answer': 'Resposta curta',   'Related Resources': 'Páginas relacionadas',
        'The details': 'Em detalhe', 'Keep exploring': 'Continue explorando', 'Style your own text': 'Estilize seu texto' },
  ru: { 'Quick answer': 'Короткий ответ',   'Related Resources': null,
        'The details': 'Подробности', 'Keep exploring': 'Смотрите также', 'Style your own text': 'Оформите свой текст' },
  th: { 'Quick answer': 'คำตอบสั้นๆ',        'Related Resources': 'หน้าที่เกี่ยวข้อง',
        'The details': 'รายละเอียด', 'Keep exploring': 'สำรวจต่อ', 'Style your own text': 'จัดสไตล์ข้อความของคุณ' },
  tr: { 'Quick answer': 'Kısa cevap',       'Related Resources': null,
        'The details': 'Ayrıntılar', 'Keep exploring': 'Keşfetmeye devam', 'Style your own text': 'Kendi metnini biçimlendir' },
  'zh-tw': { 'Quick answer': null,          'Related Resources': '相關頁面',
        'The details': null, 'Keep exploring': null, 'Style your own text': null }
};

// The FAQ <h2>. Harvested dominant form per locale; `fr`/`nl`/`ru` legitimately
// use the loanword "FAQ" as their own dominant heading and are recorded as such.
const FAQ_H2 = {
  ar: 'الأسئلة الشائعة', es: 'Preguntas Frecuentes', fr: 'Questions Fréquentes',
  id: 'Pertanyaan yang Sering Ditanya', it: 'Domande Frequenti', ja: 'よくある質問',
  nl: 'Veelgestelde Vragen', pl: 'Najczęstsze pytania', pt: 'Perguntas Frequentes',
  ru: 'Частые Вопросы', th: 'คำถามที่พบบ่อย', tr: 'Sıkça Sorulan Sorular'
};

const args = process.argv.slice(2);
const write = args.includes('--write');
const localeArg = args.includes('--locale') ? args[args.indexOf('--locale') + 1] : null;
if (!write && !args.includes('--dry-run')) {
  console.error('Refusing to run without --dry-run or --write.');
  process.exit(2);
}

const LOCALE_RE = /^[a-z]{2}(-[a-z]{2})?$/;
const locales = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && LOCALE_RE.test(e.name) && e.name !== 'js')
  .map((e) => e.name)
  .filter((l) => !localeArg || l === localeArg)
  .sort();

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(dir, e.name), acc);
    else if (e.name === 'index.html') acc.push(path.join(dir, e.name));
  }
  return acc;
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const counts = { breadcrumb: 0, langSwitcher: 0, cta: 0, kicker: 0, faqH2: 0, files: 0 };
const perLocale = {};

for (const loc of locales) {
  const bc = BREADCRUMB[loc];
  const ls = LANG_SWITCHER[loc];
  const cta = CTA[loc];
  const kick = SECTION_LABEL[loc];
  const faqH2 = FAQ_H2[loc];
  if (!bc && !ls && !cta && !kick && !faqH2) continue; // stop rule: unknown locale is left alone
  const stat = { breadcrumb: 0, langSwitcher: 0, cta: 0, kicker: 0, faqH2: 0, files: 0 };

  for (const file of walk(path.join(ROOT, loc))) {
    const before = fs.readFileSync(file, 'utf8');
    let html = before;

    if (bc) {
      const n = (html.match(/aria-label="Breadcrumb"/g) || []).length;
      if (n) {
        html = html.replace(/aria-label="Breadcrumb"/g, `aria-label="${bc}"`);
        stat.breadcrumb += n;
      }
    }
    if (ls) {
      const n = (html.match(/aria-label="Language switcher"/g) || []).length;
      if (n) {
        html = html.replace(/aria-label="Language switcher"/g, `aria-label="${ls}"`);
        stat.langSwitcher += n;
      }
    }
    if (cta) {
      // Field-by-field INSIDE the card, not whole-card. These cards are routinely
      // part-translated — es/symbol/signo-de-rial-omani has a Spanish <h3> and a
      // Spanish button around an English paragraph — so a whole-card match finds
      // almost nothing. Replacement stays scoped to the cta-card block so none of
      // these strings can ever be rewritten elsewhere on the page.
      html = html.replace(
        /<div class="cta-card">[\s\S]*?<\/div>/g,
        (block) => {
          let out = block;
          let touched = false;
          const swap = (en, native) => {
            if (native === null || !out.includes(en)) return;
            out = out.split(en).join(native);
            touched = true;
          };
          swap(`<h3>${EN_CTA.h3}</h3>`, `<h3>${cta.h3}</h3>`);
          swap(`<p>${EN_CTA.p}</p>`, `<p>${cta.p}</p>`);
          swap(`>${EN_CTA.btn}</a>`, `>${cta.btn}</a>`);
          if (touched) stat.cta++;
          return out;
        }
      );
    }

    if (kick) {
      // Scoped to the kicker element itself, so these short words can never be
      // rewritten anywhere else on the page.
      for (const [en, native] of Object.entries(kick)) {
        if (!native) continue; // stop rule, per string not just per locale
        const re = new RegExp(
          `(<span class="article-section-label">)\\s*${esc(en)}\\s*(</span>)`, 'g'
        );
        const n = (html.match(re) || []).length;
        if (n) { html = html.replace(re, `$1${native}$2`); stat.kicker += n; }
      }
    }
    if (faqH2) {
      const re = /(<h2>)\s*Frequently Asked Questions\s*(<\/h2>)/g;
      const n = (html.match(re) || []).length;
      if (n) { html = html.replace(re, `$1${faqH2}$2`); stat.faqH2 += n; }
    }

    if (html !== before) {
      stat.files++;
      if (write) fs.writeFileSync(file, html, 'utf8');
    }
  }

  if (stat.files) {
    perLocale[loc] = stat;
    counts.breadcrumb += stat.breadcrumb;
    counts.langSwitcher += stat.langSwitcher;
    counts.cta += stat.cta;
    counts.kicker += stat.kicker;
    counts.faqH2 += stat.faqH2;
    counts.files += stat.files;
  }
}

console.log(write ? 'Applying locale template-string fixes' : 'Dry run — no files written');
console.log('');
console.log(`${'locale'.padEnd(8)}${'files'.padStart(7)}${'breadcrumb'.padStart(12)}${'lang-sw'.padStart(9)}${'CTA'.padStart(6)}${'kicker'.padStart(8)}${'faqH2'.padStart(7)}`);
for (const [loc, s] of Object.entries(perLocale).sort((a, b) => b[1].files - a[1].files)) {
  console.log(
    `${loc.padEnd(8)}${String(s.files).padStart(7)}${String(s.breadcrumb).padStart(12)}` +
      `${String(s.langSwitcher).padStart(9)}${String(s.cta).padStart(6)}` +
      `${String(s.kicker).padStart(8)}${String(s.faqH2).padStart(7)}`
  );
}
console.log('');
console.log(
  `${counts.files} file(s): ${counts.breadcrumb} breadcrumb label(s), ` +
    `${counts.langSwitcher} language-switcher label(s), ${counts.cta} CTA card(s), ` +
    `${counts.kicker} section kicker(s), ${counts.faqH2} FAQ heading(s)`
);
const skipped = locales.filter((l) => !BREADCRUMB[l] && !LANG_SWITCHER[l] && !CTA[l] && !SECTION_LABEL[l] && !FAQ_H2[l]);
if (skipped.length) console.log(`Left in English (no confident form): ${skipped.join(', ')}`);
if (!write) console.log('\nRe-run with --write to apply.');
