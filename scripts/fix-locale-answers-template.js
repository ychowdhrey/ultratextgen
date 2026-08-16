#!/usr/bin/env node
/**
 * fix-locale-answers-template.js — translate the answers/ template furniture
 * left in English on the "what font does X use" locale pages.
 *
 * These two pages exist in 12 locales each. Their body prose and h2s were
 * translated when they shipped; the template around that prose was not — the
 * section labels, the FAQ heading, the compare-badges and the whole
 * related-pages card grid (titles and blurbs) are still English on all 24.
 *
 * Two of those slots are invisible to `npm run audit:locale-translation`, so
 * fixing only what the audit reports would leave the page visibly half
 * English:
 *
 *   · The card blurbs were *shortened* when the pages were localised
 *     ("… and board names." against the parent's "… and board names in bold,
 *     cursive and more."). The audit intersects extracted string SETS, so an
 *     edited English string is not a member of the parent's set and never
 *     appears. It is still English.
 *   · `<span class="compare-badge">Tool</span>` is not matched by the audit's
 *     `*-label` span extractor at all.
 *
 * Both are handled here, and both are the reason this is a table rather than
 * a re-run of the audit's own output.
 *
 * Usage:
 *   node scripts/fix-locale-answers-template.js            # dry run
 *   node scripts/fix-locale-answers-template.js --write
 *   node scripts/fix-locale-answers-template.js --locale es
 *
 * Provenance: "Quick answer" uses each locale's own established rendering of
 * the answers/ template's canonical "Short answer" label, harvested from the
 * 48 EN pages that use it and their live translations (Respuesta corta,
 * Réponse courte, Kısa cevap, かんたんな答え …) rather than invented here. The
 * FAQ heading is harvested the same way. The rest had no existing translation
 * anywhere on the site and is genuine new copy.
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

const PAGES = [
  'answers/what-font-does-pinterest-use',
  'answers/what-font-does-whatsapp-use'
];

const LOCALES = ['ar', 'es', 'fr', 'id', 'it', 'ja', 'nl', 'pl', 'pt', 'ru', 'th', 'tr'];

/*
 * Keyed by the English element text. Every entry is the FULL text of one
 * element (a section label, an h2, a badge, a card title or a card blurb),
 * which is why replacement can be anchored on `>text<` — an exact
 * element-content match, never a substring of a longer string.
 *
 * Card blurbs are listed in both the parent's full form and the shortened
 * form the locale pages actually carry, because different pages kept
 * different ones.
 */
const STRINGS = {
  /* ---------- section labels ---------- */
  'Quick answer': {
    ar: 'الإجابة السريعة', es: 'Respuesta corta', fr: 'Réponse courte', id: 'Jawaban singkat',
    it: 'Risposta breve', ja: 'かんたんな答え', nl: 'Kort antwoord', pl: 'Krótka odpowiedź',
    pt: 'Resposta curta', ru: 'Короткий ответ', th: 'คำตอบสั้นๆ', tr: 'Kısa cevap'
  },
  'The details': {
    ar: 'التفاصيل', es: 'Los detalles', fr: 'Les détails', id: 'Detailnya',
    it: 'I dettagli', ja: 'くわしく', nl: 'De details', pl: 'Szczegóły',
    pt: 'Os detalhes', ru: 'Подробности', th: 'รายละเอียด', tr: 'Ayrıntılar'
  },
  'Interface font': {
    ar: 'خط الواجهة', es: 'Fuente de la interfaz', fr: "Police de l'interface", id: 'Font antarmuka',
    it: "Font dell'interfaccia", ja: 'UIのフォント', nl: 'Interfacelettertype', pl: 'Czcionka interfejsu',
    pt: 'Fonte da interface', ru: 'Шрифт интерфейса', th: 'ฟอนต์ของอินเทอร์เฟซ', tr: 'Arayüz fontu'
  },
  'Chat font': {
    ar: 'خط المحادثة', es: 'Fuente del chat', fr: 'Police du chat', id: 'Font obrolan',
    it: 'Font della chat', ja: 'チャットのフォント', nl: 'Chatlettertype', pl: 'Czcionka czatu',
    pt: 'Fonte do chat', ru: 'Шрифт чата', th: 'ฟอนต์ในแชท', tr: 'Sohbet fontu'
  },
  'Logo font': {
    ar: 'خط الشعار', es: 'Fuente del logo', fr: 'Police du logo', id: 'Font logo',
    it: 'Font del logo', ja: 'ロゴのフォント', nl: 'Logolettertype', pl: 'Czcionka logo',
    pt: 'Fonte do logo', ru: 'Шрифт логотипа', th: 'ฟอนต์ของโลโก้', tr: 'Logo fontu'
  },
  'Style your own text': {
    ar: 'نسّق نصك أنت', es: 'Dale estilo a tu texto', fr: 'Stylisez votre propre texte',
    id: 'Bikin gaya teks kamu sendiri', it: 'Dai stile al tuo testo', ja: '自分の文字を装飾する',
    nl: 'Style je eigen tekst', pl: 'Ostyluj własny tekst', pt: 'Estilize seu próprio texto',
    ru: 'Оформите свой текст', th: 'จัดสไตล์ข้อความของคุณเอง', tr: 'Kendi metnini şekillendir'
  },
  'Keep exploring': {
    ar: 'تابع الاستكشاف', es: 'Sigue explorando', fr: 'Continuez à explorer', id: 'Jelajahi lagi',
    it: 'Continua a esplorare', ja: 'もっと見る', nl: 'Verder verkennen', pl: 'Odkrywaj dalej',
    pt: 'Continue explorando', ru: 'Смотрите дальше', th: 'สำรวจต่อ', tr: 'Keşfetmeye devam et'
  },

  /* ---------- the FAQ heading (h2) ---------- */
  'Frequently Asked Questions': {
    ar: 'الأسئلة الشائعة', es: 'Preguntas frecuentes', fr: 'Questions fréquentes',
    id: 'Pertanyaan yang Sering Ditanya', it: 'Domande frequenti', ja: 'よくある質問',
    nl: 'Veelgestelde vragen', pl: 'Najczęściej zadawane pytania', pt: 'Perguntas frequentes',
    ru: 'Частые вопросы', th: 'คำถามที่พบบ่อย', tr: 'Sıkça Sorulan Sorular'
  },

  /* ---------- compare-badges ---------- */
  // "Tool" stays "Tool" in Dutch: Dutch software copy uses the English word,
  // and "gereedschap" means a physical tool. Ledgered, not skipped.
  Tool: {
    ar: 'أداة', es: 'Herramienta', fr: 'Outil', id: 'Alat',
    it: 'Strumento', ja: 'ツール', nl: 'Tool', pl: 'Narzędzie',
    pt: 'Ferramenta', ru: 'Инструмент', th: 'เครื่องมือ', tr: 'Araç'
  },
  Guide: {
    ar: 'دليل', es: 'Guía', fr: 'Guide', id: 'Panduan',
    it: 'Guida', ja: 'ガイド', nl: 'Gids', pl: 'Poradnik',
    pt: 'Guia', ru: 'Руководство', th: 'คู่มือ', tr: 'Rehber'
  },
  Answer: {
    ar: 'إجابة', es: 'Respuesta', fr: 'Réponse', id: 'Jawaban',
    it: 'Risposta', ja: '回答', nl: 'Antwoord', pl: 'Odpowiedź',
    pt: 'Resposta', ru: 'Ответ', th: 'คำตอบ', tr: 'Cevap'
  },

  /* ---------- related-card titles ---------- */
  'Pinterest Font Generator': {
    ar: 'مولّد خطوط بينتيرست', es: 'Generador de fuentes para Pinterest',
    fr: 'Générateur de polices Pinterest', id: 'Generator Font Pinterest',
    it: 'Generatore di font per Pinterest', ja: 'Pinterestフォントジェネレーター',
    nl: 'Pinterest-lettertypegenerator', pl: 'Generator czcionek na Pinterest',
    pt: 'Gerador de fontes para Pinterest', ru: 'Генератор шрифтов для Pinterest',
    th: 'เครื่องสร้างฟอนต์ Pinterest', tr: 'Pinterest Font Üretici'
  },
  'WhatsApp Font Generator': {
    ar: 'مولّد خطوط واتساب', es: 'Generador de fuentes para WhatsApp',
    fr: 'Générateur de polices WhatsApp', id: 'Generator Font WhatsApp',
    it: 'Generatore di font per WhatsApp', ja: 'WhatsAppフォントジェネレーター',
    nl: 'WhatsApp-lettertypegenerator', pl: 'Generator czcionek na WhatsAppa',
    pt: 'Gerador de fontes para WhatsApp', ru: 'Генератор шрифтов для WhatsApp',
    th: 'เครื่องสร้างฟอนต์ WhatsApp', tr: 'WhatsApp Font Üretici'
  },
  'Bold Text Generator': {
    ar: 'مولّد النص العريض', es: 'Generador de texto en negrita',
    fr: 'Générateur de texte en gras', id: 'Generator Tulisan Tebal',
    it: 'Generatore di testo in grassetto', ja: '太字ジェネレーター',
    nl: 'Vetgedrukte-tekstgenerator', pl: 'Generator pogrubionego tekstu',
    pt: 'Gerador de texto em negrito', ru: 'Генератор жирного текста',
    th: 'เครื่องสร้างตัวหนา', tr: 'Kalın Yazı Üretici'
  },
  'Is Fancy Text Bad for SEO?': {
    ar: 'هل النص المزخرف يضر بالسيو؟', es: '¿El texto decorado perjudica al SEO?',
    fr: 'Le texte stylisé nuit-il au SEO ?', id: 'Apakah Teks Aesthetic Buruk untuk SEO?',
    it: 'Il testo decorato danneggia la SEO?', ja: '装飾文字はSEOに悪い？',
    nl: 'Is opgemaakte tekst slecht voor SEO?', pl: 'Czy ozdobny tekst szkodzi SEO?',
    pt: 'Texto decorado prejudica o SEO?', ru: 'Вредит ли декоративный текст SEO?',
    th: 'ตัวอักษรสวย ๆ ส่งผลเสียต่อ SEO ไหม?', tr: "Süslü Yazı SEO'ya Zarar Verir mi?"
  },
  'WhatsApp Text Formatting Explained': {
    ar: 'تنسيق النص في واتساب بالتفصيل', es: 'El formato de texto de WhatsApp explicado',
    fr: 'Le formatage de texte WhatsApp expliqué', id: 'Format Teks WhatsApp Dijelaskan',
    it: 'La formattazione del testo su WhatsApp', ja: 'WhatsAppの文字装飾を解説',
    nl: 'WhatsApp-tekstopmaak uitgelegd', pl: 'Formatowanie tekstu na WhatsAppie',
    pt: 'Formatação de texto no WhatsApp explicada', ru: 'Форматирование текста в WhatsApp',
    th: 'อธิบายการจัดรูปแบบข้อความใน WhatsApp', tr: 'WhatsApp Metin Biçimlendirme Rehberi'
  },

  /* ---------- related-card blurbs (shortened locale form) ---------- */
  'Style your pin titles, descriptions and board names.': {
    ar: 'نسّق عناوين الصور والأوصاف وأسماء اللوحات.',
    es: 'Dale estilo a los títulos, descripciones y nombres de tableros.',
    fr: "Stylisez vos titres d'épingles, descriptions et noms de tableaux.",
    id: 'Bikin judul pin, deskripsi, dan nama papan jadi bergaya.',
    it: 'Dai stile a titoli dei pin, descrizioni e nomi delle bacheche.',
    ja: 'ピンのタイトル・説明・ボード名を装飾。',
    nl: 'Style je pintitels, beschrijvingen en bordnamen.',
    pl: 'Ostyluj tytuły pinów, opisy i nazwy tablic.',
    pt: 'Estilize títulos de pins, descrições e nomes de pastas.',
    ru: 'Оформите заголовки пинов, описания и названия досок.',
    th: 'จัดสไตล์ชื่อพิน คำอธิบาย และชื่อบอร์ด',
    tr: 'Pin başlıklarını, açıklamaları ve pano adlarını şekillendir.'
  },
  'Generate clean bold text for any platform.': {
    ar: 'أنشئ نصًا عريضًا نظيفًا لأي منصة.',
    es: 'Genera texto en negrita limpio para cualquier plataforma.',
    fr: "Générez du texte en gras net pour n'importe quelle plateforme.",
    id: 'Bikin tulisan tebal rapi untuk platform apa pun.',
    it: 'Genera testo in grassetto pulito per qualsiasi piattaforma.',
    ja: 'どのプラットフォームでも使えるきれいな太字を生成。',
    nl: 'Genereer strakke vetgedrukte tekst voor elk platform.',
    pl: 'Wygeneruj czysty pogrubiony tekst na dowolną platformę.',
    pt: 'Gere texto em negrito limpo para qualquer plataforma.',
    ru: 'Создайте аккуратный жирный текст для любой платформы.',
    th: 'สร้างตัวหนาที่สะอาดตาสำหรับทุกแพลตฟอร์ม',
    tr: 'Her platform için temiz kalın yazı üret.'
  },
  'What styled Unicode does to search visibility.': {
    ar: 'ما الذي يفعله نص يونيكود المزخرف بظهورك في البحث.',
    es: 'Qué le hace el Unicode decorado a tu visibilidad en búsquedas.',
    fr: 'Ce que le Unicode stylisé fait à votre visibilité dans les recherches.',
    id: 'Efek Unicode bergaya terhadap visibilitas di pencarian.',
    it: "Cosa fa l'Unicode decorato alla visibilità nelle ricerche.",
    ja: '装飾Unicodeが検索での見え方に与える影響。',
    nl: 'Wat opgemaakte Unicode doet met je vindbaarheid.',
    pl: 'Jak ozdobny Unicode wpływa na widoczność w wyszukiwarce.',
    pt: 'O que o Unicode decorado faz com a visibilidade nas buscas.',
    ru: 'Как декоративный Unicode влияет на видимость в поиске.',
    th: 'อักขระ Unicode ที่ตกแต่งส่งผลต่อการมองเห็นในการค้นหาอย่างไร',
    tr: "Süslü Unicode'un aramada görünürlüğe etkisi."
  },
  'Style your status, group names and messages.': {
    ar: 'نسّق حالتك وأسماء المجموعات ورسائلك.',
    es: 'Dale estilo a tu estado, nombres de grupos y mensajes.',
    fr: 'Stylisez votre statut, vos noms de groupes et vos messages.',
    id: 'Bikin status, nama grup, dan pesan kamu bergaya.',
    it: 'Dai stile a stato, nomi dei gruppi e messaggi.',
    ja: 'ステータス・グループ名・メッセージを装飾。',
    nl: 'Style je status, groepsnamen en berichten.',
    pl: 'Ostyluj status, nazwy grup i wiadomości.',
    pt: 'Estilize seu status, nomes de grupos e mensagens.',
    ru: 'Оформите статус, названия групп и сообщения.',
    th: 'จัดสไตล์สถานะ ชื่อกลุ่ม และข้อความ',
    tr: 'Durumunu, grup adlarını ve mesajlarını şekillendir.'
  },
  'The four native styles WhatsApp supports.': {
    ar: 'الأنماط الأربعة التي يدعمها واتساب أصلاً.',
    es: 'Los cuatro estilos nativos que admite WhatsApp.',
    fr: 'Les quatre styles natifs pris en charge par WhatsApp.',
    id: 'Empat gaya bawaan yang didukung WhatsApp.',
    it: 'I quattro stili nativi supportati da WhatsApp.',
    ja: 'WhatsAppが対応する4つの標準スタイル。',
    nl: 'De vier native stijlen die WhatsApp ondersteunt.',
    pl: 'Cztery natywne style obsługiwane przez WhatsAppa.',
    pt: 'Os quatro estilos nativos que o WhatsApp aceita.',
    ru: 'Четыре встроенных стиля, которые поддерживает WhatsApp.',
    th: 'สี่สไตล์พื้นฐานที่ WhatsApp รองรับ',
    tr: "WhatsApp'ın desteklediği dört yerleşik stil."
  }
};

/*
 * Which page each string belongs to. Without this every WhatsApp string is
 * reported missing from the Pinterest page and vice versa — 100+ lines of
 * noise that would bury a real stale entry.
 */
const ONLY = {
  'Interface font': 'pinterest',
  'Pinterest Font Generator': 'pinterest',
  'Is Fancy Text Bad for SEO?': 'pinterest',
  'Style your pin titles, descriptions and board names.': 'pinterest',
  'What styled Unicode does to search visibility.': 'pinterest',
  Answer: 'pinterest',
  'Chat font': 'whatsapp',
  'WhatsApp Font Generator': 'whatsapp',
  'WhatsApp Text Formatting Explained': 'whatsapp',
  'Style your status, group names and messages.': 'whatsapp',
  'The four native styles WhatsApp supports.': 'whatsapp',
  Guide: 'whatsapp'
};

/* ------------------------------------------------------------------ */

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let totalApplied = 0;
let filesChanged = 0;
const notFound = [];
const alreadyDone = [];

for (const locale of LOCALES) {
  if (onlyLocale && locale !== onlyLocale) continue;

  for (const page of PAGES) {
    const rel = `${locale}/${page}/index.html`;
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;

    const before = fs.readFileSync(abs, 'utf8');
    let out = before;
    let n = 0;

    for (const [en, byLocale] of Object.entries(STRINGS)) {
      const local = byLocale[locale];
      if (!local) continue;
      if (ONLY[en] && !page.includes(ONLY[en])) continue;
      // Exact element-content match: `>text<`. Never a substring of a longer
      // string, and never inside an attribute.
      const re = new RegExp(`>${escapeRe(en)}<`, 'g');
      const hits = (out.match(re) || []).length;
      if (!hits) {
        if (local !== en && out.includes(`>${local}<`)) alreadyDone.push(`${rel} :: ${en}`);
        else if (local !== en) notFound.push(`${rel} :: ${en}`);
        continue;
      }
      out = out.replace(re, `>${local}<`);
      n += hits;
    }

    if (n) {
      console.log(`  ${rel} — ${n} string(s)`);
      totalApplied += n;
      if (WRITE && out !== before) {
        fs.writeFileSync(abs, out);
        filesChanged++;
      }
    }
  }
}

if (alreadyDone.length) console.log(`\nalready translated: ${alreadyDone.length}`);
if (notFound.length) {
  console.log(`\n⚠ table entries with no match on the page (${notFound.length}):`);
  for (const m of notFound.slice(0, 40)) console.log(`   · ${m}`);
  if (notFound.length > 40) console.log(`   … and ${notFound.length - 40} more`);
}

console.log(
  `\n${WRITE ? 'Applied' : 'Dry run'} — ${totalApplied} string(s)` +
    (WRITE ? `, ${filesChanged} file(s) written.` : '. Pass --write to apply.')
);
