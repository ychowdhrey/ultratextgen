/* UltraTextGen — Halfwidth/Fullwidth width converter.
 *
 * Converts between halfwidth and fullwidth character forms, per class:
 *   alnum  — ASCII letters/digits <-> U+FF10..FF5A (offset +0xFEE0)
 *   punct  — ASCII symbols <-> fullwidth forms, plus ¥/₩/¢/£ currency signs
 *   space  — U+0020 <-> U+3000 (ideographic space)
 *   kana   — halfwidth katakana U+FF61..FF9F <-> full katakana, including
 *            voiced/semi-voiced fusion (ｶ+ﾞ -> ガ) and kana punctuation ｡｢｣､･ｰ
 *   jamo   — halfwidth hangul jamo U+FFA0..FFDC <-> compatibility jamo U+3131..
 *
 * Every mapping below is verified against Unicode NFKC equivalence at build
 * time (see the repo history for the generator). Hangul targets are the
 * COMPATIBILITY jamo block deliberately — recursive NFKC lands on conjoining
 * jamo, which do not render as standalone letters.
 *
 * Full katakana with no halfwidth form (ヮ ヵ ヶ ヰ ヱ etc.) pass through
 * unchanged in both directions, as does anything whose class is unchecked.
 */
(function () {
  "use strict";

  var HALF_KANA = {"\uff66":"\u30f2","\uff67":"\u30a1","\uff68":"\u30a3","\uff69":"\u30a5","\uff6a":"\u30a7","\uff6b":"\u30a9","\uff6c":"\u30e3","\uff6d":"\u30e5","\uff6e":"\u30e7","\uff6f":"\u30c3","\uff71":"\u30a2","\uff72":"\u30a4","\uff73":"\u30a6","\uff74":"\u30a8","\uff75":"\u30aa","\uff76":"\u30ab","\uff77":"\u30ad","\uff78":"\u30af","\uff79":"\u30b1","\uff7a":"\u30b3","\uff7b":"\u30b5","\uff7c":"\u30b7","\uff7d":"\u30b9","\uff7e":"\u30bb","\uff7f":"\u30bd","\uff80":"\u30bf","\uff81":"\u30c1","\uff82":"\u30c4","\uff83":"\u30c6","\uff84":"\u30c8","\uff85":"\u30ca","\uff86":"\u30cb","\uff87":"\u30cc","\uff88":"\u30cd","\uff89":"\u30ce","\uff8a":"\u30cf","\uff8b":"\u30d2","\uff8c":"\u30d5","\uff8d":"\u30d8","\uff8e":"\u30db","\uff8f":"\u30de","\uff90":"\u30df","\uff91":"\u30e0","\uff92":"\u30e1","\uff93":"\u30e2","\uff94":"\u30e4","\uff95":"\u30e6","\uff96":"\u30e8","\uff97":"\u30e9","\uff98":"\u30ea","\uff99":"\u30eb","\uff9a":"\u30ec","\uff9b":"\u30ed","\uff9c":"\u30ef","\uff9d":"\u30f3","\uff9e":"\u3099","\uff9f":"\u309a"};
  var KANA_VOICED = {"\uff66\uff9e":"\u30fa","\uff73\uff9e":"\u30f4","\uff76\uff9e":"\u30ac","\uff77\uff9e":"\u30ae","\uff78\uff9e":"\u30b0","\uff79\uff9e":"\u30b2","\uff7a\uff9e":"\u30b4","\uff7b\uff9e":"\u30b6","\uff7c\uff9e":"\u30b8","\uff7d\uff9e":"\u30ba","\uff7e\uff9e":"\u30bc","\uff7f\uff9e":"\u30be","\uff80\uff9e":"\u30c0","\uff81\uff9e":"\u30c2","\uff82\uff9e":"\u30c5","\uff83\uff9e":"\u30c7","\uff84\uff9e":"\u30c9","\uff8a\uff9e":"\u30d0","\uff8a\uff9f":"\u30d1","\uff8b\uff9e":"\u30d3","\uff8b\uff9f":"\u30d4","\uff8c\uff9e":"\u30d6","\uff8c\uff9f":"\u30d7","\uff8d\uff9e":"\u30d9","\uff8d\uff9f":"\u30da","\uff8e\uff9e":"\u30dc","\uff8e\uff9f":"\u30dd","\uff9c\uff9e":"\u30f7"};
  var KANA_PUNCT = {"\uff61":"\u3002","\uff62":"\u300c","\uff63":"\u300d","\uff64":"\u3001","\uff65":"\u30fb","\uff70":"\u30fc"};
  var HALF_JAMO = {"\uffa1":"\u3131","\uffa2":"\u3132","\uffa3":"\u3133","\uffa4":"\u3134","\uffa5":"\u3135","\uffa6":"\u3136","\uffa7":"\u3137","\uffa8":"\u3138","\uffa9":"\u3139","\uffaa":"\u313a","\uffab":"\u313b","\uffac":"\u313c","\uffad":"\u313d","\uffae":"\u313e","\uffaf":"\u313f","\uffb0":"\u3140","\uffb1":"\u3141","\uffb2":"\u3142","\uffb3":"\u3143","\uffb4":"\u3144","\uffb5":"\u3145","\uffb6":"\u3146","\uffb7":"\u3147","\uffb8":"\u3148","\uffb9":"\u3149","\uffba":"\u314a","\uffbb":"\u314b","\uffbc":"\u314c","\uffbd":"\u314d","\uffbe":"\u314e","\uffc2":"\u314f","\uffc3":"\u3150","\uffc4":"\u3151","\uffc5":"\u3152","\uffc6":"\u3153","\uffc7":"\u3154","\uffca":"\u3155","\uffcb":"\u3156","\uffcc":"\u3157","\uffcd":"\u3158","\uffce":"\u3159","\uffcf":"\u315a","\uffd2":"\u315b","\uffd3":"\u315c","\uffd4":"\u315d","\uffd5":"\u315e","\uffd6":"\u315f","\uffd7":"\u3160","\uffda":"\u3161","\uffdb":"\u3162","\uffdc":"\u3163","\uffa0":"\u3164"};

  // Reverse maps, built once at load.
  var FULL_KANA = {}, FULL_VOICED = {}, FULL_PUNCT = {}, FULL_JAMO = {};
  var k;
  for (k in HALF_KANA)   FULL_KANA[HALF_KANA[k]] = k;
  for (k in KANA_VOICED) FULL_VOICED[KANA_VOICED[k]] = k;
  for (k in KANA_PUNCT)  FULL_PUNCT[KANA_PUNCT[k]] = k;
  for (k in HALF_JAMO)   FULL_JAMO[HALF_JAMO[k]] = k;

  var CUR_TO_FULL = { "\u00a5": "\uffe5", "\u20a9": "\uffe6", "\u00a2": "\uffe0", "\u00a3": "\uffe1" };
  var CUR_TO_HALF = { "\uffe5": "\u00a5", "\uffe6": "\u20a9", "\uffe0": "\u00a2", "\uffe1": "\u00a3" };

  function toFull(text, cls) {
    var out = "", i = 0, cp, ch, two;
    while (i < text.length) {
      cp = text.codePointAt(i);
      ch = String.fromCodePoint(cp);
      if (cls.kana && i + 1 < text.length) {
        two = ch + text[i + 1];
        if (KANA_VOICED[two] !== undefined) { out += KANA_VOICED[two]; i += 2; continue; }
      }
      if (cls.alnum && ((cp >= 0x30 && cp <= 0x39) || (cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a))) {
        out += String.fromCodePoint(cp + 0xfee0);
      } else if (cls.punct && cp >= 0x21 && cp <= 0x7e) {
        out += String.fromCodePoint(cp + 0xfee0);
      } else if (cls.punct && CUR_TO_FULL[ch] !== undefined) {
        out += CUR_TO_FULL[ch];
      } else if (cls.space && cp === 0x20) {
        out += "\u3000";
      } else if (cls.kana && HALF_KANA[ch] !== undefined) {
        out += HALF_KANA[ch];
      } else if (cls.kana && KANA_PUNCT[ch] !== undefined) {
        out += KANA_PUNCT[ch];
      } else if (cls.jamo && HALF_JAMO[ch] !== undefined) {
        out += HALF_JAMO[ch];
      } else {
        out += ch;
      }
      i += ch.length;
    }
    return out;
  }

  function toHalf(text, cls) {
    var out = "", i = 0, cp, ch;
    while (i < text.length) {
      cp = text.codePointAt(i);
      ch = String.fromCodePoint(cp);
      if (cls.alnum && ((cp >= 0xff10 && cp <= 0xff19) || (cp >= 0xff21 && cp <= 0xff3a) || (cp >= 0xff41 && cp <= 0xff5a))) {
        out += String.fromCodePoint(cp - 0xfee0);
      } else if (cls.punct && cp >= 0xff01 && cp <= 0xff5e) {
        out += String.fromCodePoint(cp - 0xfee0);
      } else if (cls.punct && CUR_TO_HALF[ch] !== undefined) {
        out += CUR_TO_HALF[ch];
      } else if (cls.space && cp === 0x3000) {
        out += " ";
      } else if (cls.kana && FULL_VOICED[ch] !== undefined) {
        out += FULL_VOICED[ch];
      } else if (cls.kana && FULL_KANA[ch] !== undefined) {
        out += FULL_KANA[ch];
      } else if (cls.kana && FULL_PUNCT[ch] !== undefined) {
        out += FULL_PUNCT[ch];
      } else if (cls.jamo && FULL_JAMO[ch] !== undefined) {
        out += FULL_JAMO[ch];
      } else {
        out += ch;
      }
      i += ch.length;
    }
    return out;
  }

  function convert(text, opts) {
    var cls = (opts && opts.classes) || { alnum: true, punct: true, space: true, kana: true, jamo: true };
    return (opts && opts.direction === "half") ? toHalf(text, cls) : toFull(text, cls);
  }

  // Approximate width census (Shift-JIS-style: fullwidth = 2, halfwidth = 1).
  function counts(text) {
    var full = 0, half = 0, i = 0, cp;
    while (i < text.length) {
      cp = text.codePointAt(i);
      if (cp === 0x0a || cp === 0x0d) { i += 1; continue; }
      if (cp <= 0x7e || (cp >= 0xff61 && cp <= 0xffdc) || (cp >= 0xffe8 && cp <= 0xffee)) half += 1;
      else full += 1;
      i += String.fromCodePoint(cp).length;
    }
    return { full: full, half: half, bytes: full * 2 + half };
  }

  // ------------------------------------------------------------- UI binding
  function bind(root) {
    var input = root.querySelector(".wc-input");
    var output = root.querySelector(".wc-output");
    var copyBtn = root.querySelector(".wc-copy");
    if (!input || !output) return;

    function classes() {
      var cls = {};
      var boxes = root.querySelectorAll("[data-wc-class]");
      for (var i = 0; i < boxes.length; i++) cls[boxes[i].getAttribute("data-wc-class")] = boxes[i].checked;
      return cls;
    }
    function direction() {
      var checked = root.querySelector("input[name='wc-dir']:checked");
      return checked ? checked.value : "full";
    }
    function render() {
      output.value = convert(input.value, { direction: direction(), classes: classes() });
      var c = counts(output.value);
      var elFull = root.querySelector("[data-wc-count-full]");
      var elHalf = root.querySelector("[data-wc-count-half]");
      var elBytes = root.querySelector("[data-wc-count-bytes]");
      if (elFull) elFull.textContent = c.full;
      if (elHalf) elHalf.textContent = c.half;
      if (elBytes) elBytes.textContent = c.bytes;
    }
    input.addEventListener("input", render);
    var controls = root.querySelectorAll("[data-wc-class], input[name='wc-dir']");
    for (var i = 0; i < controls.length; i++) controls[i].addEventListener("change", render);
    if (copyBtn) copyBtn.addEventListener("click", function () {
      if (!output.value) return;
      navigator.clipboard.writeText(output.value).then(function () {
        var original = copyBtn.textContent;
        copyBtn.textContent = copyBtn.getAttribute("data-copied-label") || "Copied!";
        copyBtn.classList.add("wc-copied");
        setTimeout(function () { copyBtn.textContent = original; copyBtn.classList.remove("wc-copied"); }, 1400);
      });
    });
    render();
  }

  function init() {
    var mounts = document.querySelectorAll("[data-width-converter]");
    for (var i = 0; i < mounts.length; i++) bind(mounts[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.UTGWidth = { convert: convert, counts: counts };
})();
