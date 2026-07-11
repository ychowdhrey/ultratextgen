/* ==========================================================================
   UltraTextGen — kaomojiDict.js
   Data for the kaomoji decoder / dictionary: a table of well-known named
   faces (name + meaning + mood) and a map of individual component glyphs to
   their role and meaning. Consumed by kaomojiDecoderController.js, which also
   reuses window.UTG_KAOMOJI_DATA for part-level mood detection. Data only.
   ========================================================================== */

(function () {
  "use strict";

  window.UTG_KAOMOJI_DICT = {

    /* Well-known faces the decoder can name outright. mood ids match the
       generator's moods so "similar faces" grouping stays consistent. */
    NAMED: [
      { face: "¯\\_(ツ)_/¯",        name: "Shrug (Shruggie)",      meaning: "\"I don't know\" or \"whatever\" — a casual, indifferent shrug.", mood: "silly" },
      { face: "( ͡° ͜ʖ ͡°)",         name: "Lenny Face",            meaning: "A knowing, suggestive smirk — often implying innuendo.", mood: "silly" },
      { face: "(╯°□°）╯︵ ┻━┻",      name: "Table Flip",            meaning: "Rage-quitting — flipping a table in frustration.", mood: "angry" },
      { face: "┬─┬ ノ( ゜-゜ノ)",     name: "Table Unflip",          meaning: "Calmly putting the table back — resigned patience.", mood: "silly" },
      { face: "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧",       name: "Throwing Sparkles",     meaning: "Excited, magical joy — tossing sparkles into the air.", mood: "happy" },
      { face: "(╥﹏╥)",              name: "Crying",                meaning: "Sobbing with streaming tears — very sad.", mood: "sad" },
      { face: "(◕‿◕)",              name: "Happy Face",            meaning: "A warm, content smile.", mood: "happy" },
      { face: "ಠ_ಠ",               name: "Look of Disapproval",   meaning: "Disapproval, skepticism, or a hard, unamused stare.", mood: "angry" },
      { face: "(¬‿¬)",              name: "Smug",                  meaning: "A sly, smug, scheming look.", mood: "silly" },
      { face: "(｡◕‿◕｡)",            name: "Cute Smile",            meaning: "An adorable, wholesome smile.", mood: "cute" },
      { face: "(=^･ω･^=)",          name: "Cat Face",              meaning: "A cute cat with whiskers.", mood: "cute" },
      { face: "ʕ•ᴥ•ʔ",             name: "Bear",                  meaning: "A cute bear.", mood: "cute" },
      { face: "(´･ω･`)",           name: "Worried",               meaning: "A worried, sheepish, slightly downcast look.", mood: "sad" },
      { face: "(ノ°益°)ノ",          name: "Rage",                  meaning: "Furious, shouting anger.", mood: "angry" },
      { face: "(づ｡◕‿‿◕｡)づ",        name: "Hug",                   meaning: "Reaching out for a warm hug.", mood: "love" },
      { face: "(♥ω♥)",             name: "In Love",               meaning: "Heart eyes — smitten and adoring.", mood: "love" },
      { face: "(≧▽≦)",             name: "Laughing",              meaning: "Laughing happily.", mood: "happy" },
      { face: "(＾▽＾)",             name: "Big Smile",             meaning: "A bright, cheerful grin.", mood: "happy" },
      { face: "(T_T)",             name: "Crying (Simple)",       meaning: "Crying — a simpler tearful face.", mood: "sad" },
      { face: "(-_-)",             name: "Unamused",              meaning: "Bored, tired, or unimpressed.", mood: "silly" },
      { face: "(^_-)",             name: "Wink",                  meaning: "A playful wink.", mood: "happy" },
      { face: "UwU",              name: "UwU",                   meaning: "A cute, content face — warmth and affection.", mood: "cute" },
      { face: "OwO",              name: "OwO",                   meaning: "A wide-eyed, surprised, often flirty face.", mood: "surprised" },
      { face: "XD",               name: "XD",                    meaning: "Laughing hard — tilt your head; like LOL.", mood: "happy" },
      { face: "o7",               name: "Salute",                meaning: "A salute — respect, acknowledgement, or farewell.", mood: "silly" },
      { face: "( ͡° ͜ʖ ͡°)╭∩╮",     name: "Rude Lenny",            meaning: "A Lenny face flipping you off.", mood: "angry" },
      { face: "ᕕ( ᐛ )ᕗ",           name: "Marching",              meaning: "Striding along cheerfully.", mood: "silly" },
      { face: "(ノ_<。)",           name: "Sobbing",               meaning: "Wiping away tears.", mood: "sad" },
      { face: "(¬_¬)",             name: "Side Eye",              meaning: "Skeptical, annoyed side-eye.", mood: "angry" },
      { face: "(°o°)",             name: "Shocked",               meaning: "Surprised, wide-eyed shock.", mood: "surprised" },
      { face: "(＾• ω •＾)",         name: "Kitten",                meaning: "A soft, cute kitten.", mood: "cute" },
      { face: "(っ˘з(˘⌣˘ )",        name: "Kiss",                  meaning: "Blowing or sharing a kiss.", mood: "love" },
      { face: "ヽ(´▽`)/",          name: "Cheering",              meaning: "Happy and cheering with arms up.", mood: "happy" },
      { face: "(ง •̀_•́)ง",         name: "Fight Me",              meaning: "Fired up and ready to fight.", mood: "angry" },
      { face: "(｡•́︿•̀｡)",          name: "Sad Frown",             meaning: "A sad, pouting frown.", mood: "sad" },
      { face: "٩(◕‿◕)۶",           name: "Yay",                   meaning: "Excited celebration.", mood: "happy" },
      { face: "(★ω★)",             name: "Starstruck",            meaning: "Star-eyed with excitement.", mood: "happy" },
      { face: "(⁄ ⁄•⁄ω⁄•⁄ ⁄)",     name: "Blushing",              meaning: "Shy and blushing.", mood: "shy" },
      { face: "(˘ω˘)",             name: "Sleepy",                meaning: "Cozy, drowsy, and content.", mood: "cute" },
      { face: "ヽ༼ຈل͜ຈ༽ﾉ",          name: "Donger",                meaning: "\"Raise your dongers\" — an energetic hype face.", mood: "chaotic" }
    ],

    /* Individual component glyphs → what they are and what they signal.
       Longer / multi-codepoint keys are matched before shorter ones. */
    CHARS: {
      "┻━┻":  { role: "Prop",  meaning: "an overturned table" },
      " ͡°":  { role: "Eyes",  meaning: "a half-lidded Lenny eye" },
      "͜ʖ":   { role: "Mouth", meaning: "the Lenny smirk" },
      "ᴥ":    { role: "Mouth", meaning: "an animal snout" },
      "ಠ":    { role: "Eyes",  meaning: "a disapproving, unamused eye" },
      "ツ":    { role: "Face",  meaning: "a smiling katakana \"tsu\"" },
      "益":    { role: "Mouth", meaning: "a gritted, raging mouth" },
      "﹏":    { role: "Mouth", meaning: "a wavy, upset frown" },
      "︿":    { role: "Mouth", meaning: "a frown" },
      "╥":    { role: "Eyes",  meaning: "a crying eye with tears" },
      "Д":    { role: "Mouth", meaning: "a wide-open, shouting mouth" },
      "ω":    { role: "Mouth", meaning: "a cute cat mouth (omega)" },
      "▽":    { role: "Mouth", meaning: "a big open grin" },
      "∀":    { role: "Mouth", meaning: "an upside-down grin" },
      "ε":    { role: "Mouth", meaning: "puckered lips (a kiss)" },
      "з":    { role: "Mouth", meaning: "puckered lips (a kiss)" },
      "◕":    { role: "Eyes",  meaning: "a big round eye" },
      "★":    { role: "Eyes",  meaning: "a star-shaped eye (starstruck)" },
      "♥":    { role: "Eyes",  meaning: "a heart-shaped eye (love)" },
      "♡":    { role: "Extra", meaning: "a floating heart (love)" },
      "✧":    { role: "Extra", meaning: "a sparkle" },
      "✨":    { role: "Extra", meaning: "sparkles" },
      "づ":    { role: "Arms",  meaning: "a reaching, hugging hand" },
      "つ":    { role: "Arms",  meaning: "a reaching hand" },
      "╯":    { role: "Arms",  meaning: "an arm flipping the table" },
      "︵":    { role: "Motion",meaning: "something flying through the air" },
      "٩":    { role: "Arms",  meaning: "a raised fist" },
      "۶":    { role: "Arms",  meaning: "a raised fist" },
      "ᕦ":    { role: "Arms",  meaning: "a flexing arm" },
      "ᕤ":    { role: "Arms",  meaning: "a flexing arm" },
      "ヽ":    { role: "Arms",  meaning: "a raised arm" },
      "ノ":    { role: "Arms",  meaning: "a raised arm" },
      "T":    { role: "Eyes",  meaning: "a crying eye" },
      "^":    { role: "Eyes",  meaning: "a happy, closed eye" },
      "＾":    { role: "Eyes",  meaning: "a happy, closed eye" },
      "•":    { role: "Eyes",  meaning: "a small round eye" },
      ">":    { role: "Eyes",  meaning: "a squinting eye" },
      "<":    { role: "Eyes",  meaning: "a squinting eye" },
      "°":    { role: "Eyes",  meaning: "a round, open eye" },
      "O":    { role: "Eyes",  meaning: "a wide, surprised eye" },
      "@":    { role: "Eyes",  meaning: "a dizzy, spinning eye" },
      "x":    { role: "Eyes",  meaning: "an x-shaped, dazed eye" },
      "-":    { role: "Eyes",  meaning: "a flat, unimpressed eye" },
      "□":    { role: "Mouth", meaning: "an open, shocked mouth" },
      "皿":    { role: "Mouth", meaning: "a wide, gritted, angry mouth" },
      "o":    { role: "Mouth", meaning: "an open, surprised mouth" },
      "_":    { role: "Mouth", meaning: "a flat, neutral mouth" }
    }
  };
})();
