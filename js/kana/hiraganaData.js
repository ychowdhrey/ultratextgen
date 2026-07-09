/*
 * hiraganaData.js — the hiragana syllabary as plain data.
 *
 * Native Unicode kana (no font registry, no bundled binaries) grouped into the
 * three sections a standard chart shows:
 *   - gojuon:  the 46 basic kana, rows = consonant group, columns = vowel
 *   - dakuten: voiced / semi-voiced kana (゛/ ゜) — g, z, d, b, p rows
 *   - yoon:    contracted combinations (small ゃゅょ) — 3 columns (ya, yu, yo)
 *
 * A cell is { k: kana, r: romaji } or null for a gap in the grid (e.g. yi/ye,
 * wi/wu/we). Self-registers into the shared window.UltraKanaData registry the
 * kana chart engine reads — no ES modules, matching the rest of the frontend.
 */
(function () {
  "use strict";

  const c = (k, r) => ({ k: k, r: r });
  const _ = null;

  const GOJUON = {
    key: "gojuon",
    label: "Basic hiragana (gojūon)",
    note: "The 46 core kana. Read across each row: a, i, u, e, o.",
    cols: ["a", "i", "u", "e", "o"],
    rows: [
      { g: "—", cells: [c("あ", "a"), c("い", "i"), c("う", "u"), c("え", "e"), c("お", "o")] },
      { g: "k", cells: [c("か", "ka"), c("き", "ki"), c("く", "ku"), c("け", "ke"), c("こ", "ko")] },
      { g: "s", cells: [c("さ", "sa"), c("し", "shi"), c("す", "su"), c("せ", "se"), c("そ", "so")] },
      { g: "t", cells: [c("た", "ta"), c("ち", "chi"), c("つ", "tsu"), c("て", "te"), c("と", "to")] },
      { g: "n", cells: [c("な", "na"), c("に", "ni"), c("ぬ", "nu"), c("ね", "ne"), c("の", "no")] },
      { g: "h", cells: [c("は", "ha"), c("ひ", "hi"), c("ふ", "fu"), c("へ", "he"), c("ほ", "ho")] },
      { g: "m", cells: [c("ま", "ma"), c("み", "mi"), c("む", "mu"), c("め", "me"), c("も", "mo")] },
      { g: "y", cells: [c("や", "ya"), _, c("ゆ", "yu"), _, c("よ", "yo")] },
      { g: "r", cells: [c("ら", "ra"), c("り", "ri"), c("る", "ru"), c("れ", "re"), c("ろ", "ro")] },
      { g: "w", cells: [c("わ", "wa"), _, _, _, c("を", "wo")] },
      { g: "n", cells: [c("ん", "n"), _, _, _, _] }
    ]
  };

  const DAKUTEN = {
    key: "dakuten",
    label: "Voiced & semi-voiced (dakuten・handakuten)",
    note: "The same shapes with ゛ or ゜ added — g, z, d, b, p sounds.",
    cols: ["a", "i", "u", "e", "o"],
    rows: [
      { g: "g", cells: [c("が", "ga"), c("ぎ", "gi"), c("ぐ", "gu"), c("げ", "ge"), c("ご", "go")] },
      { g: "z", cells: [c("ざ", "za"), c("じ", "ji"), c("ず", "zu"), c("ぜ", "ze"), c("ぞ", "zo")] },
      { g: "d", cells: [c("だ", "da"), c("ぢ", "ji"), c("づ", "zu"), c("で", "de"), c("ど", "do")] },
      { g: "b", cells: [c("ば", "ba"), c("び", "bi"), c("ぶ", "bu"), c("べ", "be"), c("ぼ", "bo")] },
      { g: "p", cells: [c("ぱ", "pa"), c("ぴ", "pi"), c("ぷ", "pu"), c("ぺ", "pe"), c("ぽ", "po")] }
    ]
  };

  const YOON = {
    key: "yoon",
    label: "Combinations (yōon)",
    note: "A consonant kana + a small ゃ, ゅ, or ょ.",
    cols: ["ya", "yu", "yo"],
    rows: [
      { g: "ky", cells: [c("きゃ", "kya"), c("きゅ", "kyu"), c("きょ", "kyo")] },
      { g: "sh", cells: [c("しゃ", "sha"), c("しゅ", "shu"), c("しょ", "sho")] },
      { g: "ch", cells: [c("ちゃ", "cha"), c("ちゅ", "chu"), c("ちょ", "cho")] },
      { g: "ny", cells: [c("にゃ", "nya"), c("にゅ", "nyu"), c("にょ", "nyo")] },
      { g: "hy", cells: [c("ひゃ", "hya"), c("ひゅ", "hyu"), c("ひょ", "hyo")] },
      { g: "my", cells: [c("みゃ", "mya"), c("みゅ", "myu"), c("みょ", "myo")] },
      { g: "ry", cells: [c("りゃ", "rya"), c("りゅ", "ryu"), c("りょ", "ryo")] },
      { g: "gy", cells: [c("ぎゃ", "gya"), c("ぎゅ", "gyu"), c("ぎょ", "gyo")] },
      { g: "j", cells: [c("じゃ", "ja"), c("じゅ", "ju"), c("じょ", "jo")] },
      { g: "by", cells: [c("びゃ", "bya"), c("びゅ", "byu"), c("びょ", "byo")] },
      { g: "py", cells: [c("ぴゃ", "pya"), c("ぴゅ", "pyu"), c("ぴょ", "pyo")] }
    ]
  };

  window.UltraKanaData = window.UltraKanaData || {};
  window.UltraKanaData.hiragana = { sections: [GOJUON, DAKUTEN, YOON] };
})();
