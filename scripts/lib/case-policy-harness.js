/* case-policy-harness.js — load the real styles.js + renderer.js in Node with a
   fake <html> element, so a case transform can be run "as page X would run it".

   Used by case-policy.test.js and by the legacy-output snapshot below. The
   page's two inputs to case conversion are its `lang` attribute and its
   `data-case-policy` attribute; both are set per call, because renderer.js
   reads them at call time, not at load time. */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');

function loadRenderer(rendererSource) {
  const html = { lang: '', attrs: {} };
  const documentElement = {
    get lang() { return html.lang; },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(html.attrs, name) ? html.attrs[name] : null;
    },
  };
  const sandbox = { console, document: { documentElement } };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'styles.js'), 'utf8'), sandbox, { filename: 'styles.js' });
  // renderer.js reads the registry through the bare global `textStyles`.
  sandbox.textStyles = sandbox.textStyles || sandbox.window.textStyles;
  const src = rendererSource || fs.readFileSync(path.join(ROOT, 'renderer.js'), 'utf8');
  vm.runInContext(src, sandbox, { filename: 'renderer.js' });
  const api = sandbox.window.UltraTextGenRender;
  const styles = sandbox.window.textStyles;

  function setPage(lang, casePolicy) {
    html.lang = lang || '';
    html.attrs = {};
    if (casePolicy != null) html.attrs['data-case-policy'] = casePolicy;
  }

  function render(text, styleName, lang, casePolicy) {
    setPage(lang, casePolicy);
    return api.renderAny(text, styles[styleName]);
  }

  return { api, styles, render, setPage };
}

// The case-converter cards, by registry name.
const CASE_STYLES = ['UPPERCASE', 'lowercase', 'Capitalized Case', 'Title Case',
  'Sentence case', 'aLtErNaTiNg CaSe', 'tOGGLE cASE'];

// Page languages measured: every <html lang> in the tree, plus "no lang".
const PAGE_LANGS = ['', 'en', 'es', 'de', 'id', 'ko', 'it', 'tr', 'pt', 'fr', 'pl',
  'ja', 'nl', 'vi', 'ru', 'ar', 'th', 'zh-TW', 'zh-tw', 'sv', 'no', 'ms', 'fi',
  'da', 'cs', 'ro', 'hu', 'hr', 'sk', 'sr', 'bs', 'hi', 'tl', 'uk'];

// Inputs for the legacy snapshot. Broad on purpose: the snapshot is the
// "nothing changed" proof for pages that do not opt in, so it has to exercise
// every branch of the old code, not only the cases the new policy targets.
const CORPUS = [
  'the lord of the rings', 'THE LORD OF THE RINGS', 'a tale of two cities',
  'what i did on my summer vacation', "i'm sure i'll be fine. i think so!",
  'the NASA team met at the FBI', 'my new iPhone from McDonald', 'mcdavid and o\'brien',
  "o'clock rock", 'state-of-the-art design', 'hello world', 'Hello World',
  'der hund und die katze', 'DER HUND UND DIE KATZE', 'die straße in der stadt',
  'groß und klein', 'el señor de los anillos', 'la casa de papel', 'cien años de soledad',
  'le seigneur des anneaux', "l'étranger", "la communauté de l'anneau",
  "aujourd'hui, maman est morte.", 'il signore degli anelli', "la compagnia dell'anello",
  'i promessi sposi', 'kot i pies na dachu', 'pan tadeusz, czyli ostatni zajazd na litwie',
  'o senhor dos anéis', 'memórias póstumas de brás cubas', 'casa do povo',
  'suç ve ceza', 'istanbul ve izmir', 'İSTANBUL VE IĞDIR', 'kırmızı ile beyaz mı',
  'dari ave maria ke jalan lain ke roma', 'buku dan pena untuk anak',
  'ijs en ijsland', 'het ijzeren tijdperk', 'ǆep i ǉubav', 'ĳs', '𐐨𐐯𐑅𐐨𐑉𐐯𐐻',
  'sự tích hồ gươm', 'tiếng việt có dấu', 'привет мир', 'καλημέρα κόσμε',
  'ㅎㅎ 안녕하세요 hello', '大小寫轉換 hello world', 'こんにちは AI', 'مرحبا بالعالم',
  '«le petit prince»', '¿qué tal? ¡bien!', '“quoted” words — and dashes', 'x', '',
  '   ', 'a\nb\tc', 'ÉCOLE ÉLÉMENTAIRE', 'émile zola', 'ça va', 'œuvre complète',
  'say no more', 'what to do in london', 'to die for', 'and i walked home',
];

module.exports = { ROOT, loadRenderer, CASE_STYLES, PAGE_LANGS, CORPUS };
