/* ==========================================================================
   UltraTextGen — styles.js (Global registry)
   Works for:
   Homepage (overall)
   Family category pages (/category/bold-fonts)
   Group pages (/category/bold-fonts/bold)
   Individual font pages (/font/ultra-bold)
   ========================================================================== */

/* -----------------------------
   CATEGORY PAGES (Families)
------------------------------ */
const CATEGORY_PAGES = {
  'bold-italic': {
    slug: 'bold-fonts'
  },
  'cursive': {
    slug: 'cursive-fonts'
  },
  'gothic': {
    slug: 'gothic-fonts'
  },
  'bubble': {
    slug: 'bubble-fonts'
  },
  'special': {
    slug: 'special-fonts'
  },
  'upside-down-text': {
    slug: 'upside-down-text'
  }
};

/* -----------------------------
   SITE ROUTING (Overall)
   This is what you use for:
   - Homepage H1/meta defaults
   - Nav labels
   - Canonical paths if needed
------------------------------ */
const SITE_PAGES = {
  home: {
    slug: '',
    title: 'UltraTextGen – Fast Text Styles That Work Everywhere'
  },
  categoryRoot: {
    slug: 'category',
    title: 'Font Categories'
  },
  fontRoot: {
    slug: 'font',
    title: 'Fonts'
  }
};

/* -----------------------------
   TEXT STYLES REGISTRY
------------------------------ */
const textStyles = {
  /* =========================
     BOLD & ITALIC FAMILY
     ========================= */
  'Ultra Bold': {
    upper: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭',
    lower: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
    nums: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
    type: 'map',
    category: 'bold',
    familySlug: 'bold-italic',
    groupSlug: 'bold',
    slug: 'ultra-bold',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Ultra Bold Serif': {
    upper: '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙',
    lower: '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳',
    nums: '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗',
    type: 'map',
    category: 'bold',
    familySlug: 'bold-italic',
    groupSlug: 'bold',
    slug: 'ultra-bold-serif',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Ultra Italic': {
    upper: '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡',
    lower: '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘂𝘷𝘸𝘹𝘺𝘻',
    nums: '0123456789',
    type: 'map',
    category: 'fancy',
    familySlug: 'bold-italic',
    groupSlug: 'italic',
    slug: 'ultra-italic',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Ultra Italic Serif': {
    upper: '𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍',
    lower: '𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧',
    nums: '0123456789',
    type: 'map',
    category: 'fancy',
    familySlug: 'bold-italic',
    groupSlug: 'italic',
    slug: 'ultra-italic-serif',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Ultra Bold Italic': {
    upper: '𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙆𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕',
    lower: '𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯',
    nums: '𝟬𝟭𝟮𝟯𝟰𝟱𝟶𝟽𝟾𝟿',
    type: 'map',
    category: 'bold',
    familySlug: 'bold-italic',
    groupSlug: 'bold-italic',
    slug: 'ultra-bold-italic',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Ultra Bold Italic Serif': {
    upper: '𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁',
    lower: '𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛',
    nums: '0123456789',
    type: 'map',
    category: 'bold',
    familySlug: 'bold-italic',
    groupSlug: 'bold-italic',
    slug: 'ultra-bold-italic-serif',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Ultra Alternating Bold': {
    type: 'procedure',
    procedureId: 'alternating-bold',
    category: 'bold',
    familySlug: 'bold-italic',
    groupSlug: 'alternating',
    slug: 'ultra-alternating-bold',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Ultra Alternating Italic': {
    type: 'procedure',
    procedureId: 'alternating-italic',
    category: 'fancy',
    familySlug: 'bold-italic',
    groupSlug: 'alternating',
    slug: 'ultra-alternating-italic',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Ultra Bold w Alternating Italic': {
    type: 'procedure',
    procedureId: 'bold-alternating-italic',
    category: 'bold',
    familySlug: 'bold-italic',
    groupSlug: 'alternating',
    slug: 'ultra-bold-alternating-italic',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Ultra Italic Switch Serifs': {
    type: 'procedure',
    procedureId: 'italic-switch-serifs',
    category: 'fancy',
    familySlug: 'bold-italic',
    groupSlug: 'alternating',
    slug: 'ultra-italic-switch-serifs',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  /* =========================
     CURSIVE
     ========================= */
  'Ultra Script': {
    upper: '𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵',
    lower: '𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏',
    nums: '0123456789',
    type: 'map',
    category: 'cursive',
    familySlug: 'cursive',
    groupSlug: 'script',
    slug: 'ultra-script',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Ultra Script Bold': {
    upper: '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩',
    lower: '𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓾𝓿𝔀𝔁𝔂𝔃',
    nums: '0123456789',
    type: 'map',
    category: 'cursive',
    familySlug: 'cursive',
    groupSlug: 'script',
    slug: 'ultra-script-bold',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'discord']
  },

  /* =========================
     GOTHIC
     ========================= */
  'Ultra Gothic': {
    upper: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ',
    lower: '𝔞𝔟𝔠𝔡𝔢𝔣𝔢𝔫𝔠𝔡𝔤𝔲𝔞𝔦𝔲𝔮𝔣𝔦𝔭𝔯',
    nums: '0123456789',
    type: 'map',
    category: 'gothic',
    familySlug: 'gothic',
    groupSlug: 'fraktur',
    slug: 'ultra-gothic',
    platforms: ['all', 'instagram', 'x', 'discord']
  },

  'Ultra Gothic Bold': {
    upper: '𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅',
    lower: '𝖆𝖇𝖈𝖉𝖊𝖋𝖚𝖑𝖒𝖝𝖞𝖃𝖛𝖯',
    nums: '0123456789',
    type: 'map',
    category: 'gothic',
    familySlug: 'gothic',
    groupSlug: 'fraktur',
    slug: 'ultra-gothic-bold',
    platforms: ['all', 'instagram', 'x', 'discord']
  },

  /* =========================
     BUBBLE
     ========================= */
  'Ultra Bubble': {
    upper: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ',
    lower: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
    nums: '⓪①②③④⑤⑥⑦⑧⑨',
    type: 'map',
    category: 'bubble',
    familySlug: 'bubble',
    groupSlug: 'circle',
    slug: 'ultra-bubble',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Ultra Bubble Filled': {
    upper: '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩',
    lower: '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩',
    nums: '⓿❶❷❸❹❺❻❼❽❾',
    type: 'map',
    category: 'bubble',
    familySlug: 'bubble',
    groupSlug: 'circle',
    slug: 'ultra-bubble-filled',
    platforms: ['all', 'instagram', 'discord']
  },

  /* =========================
     SPECIAL (decorators)
     ========================= */
  'Ultra Strike': {
    type: 'decorator',
    decoratorId: 'strike',
    category: 'special',
    familySlug: 'special',
    groupSlug: 'lines',
    slug: 'ultra-strike',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Ultra Underline': {
    type: 'decorator',
    decoratorId: 'underline',
    category: 'special',
    familySlug: 'special',
    groupSlug: 'lines',
    slug: 'ultra-underline',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Ultra Wavy': {
    type: 'decorator',
    decoratorId: 'wavy',
    category: 'special',
    familySlug: 'special',
    groupSlug: 'effects',
    slug: 'ultra-wavy',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'discord']
  },

  'Ultra Slash': {
    type: 'decorator',
    decoratorId: 'slash',
    category: 'special',
    familySlug: 'special',
    groupSlug: 'lines',
    slug: 'ultra-slash',
    platforms: ['all', 'x', 'discord']
  },

  /* =========================
     UPSIDE DOWN TEXT FAMILY
     ========================= */
  'Fully Flipped Unicode': {
    type: 'function',
    transform: 'fullyFlipped',
    familySlug: 'upside-down-text',
    category: 'special',
    slug: 'upside-down-fully-flipped',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Mixed Flip Fallback': {
    type: 'function',
    transform: 'mixedFlipFallback',
    familySlug: 'upside-down-text',
    category: 'special',
    slug: 'upside-down-mixed-fallback',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Reverse Order Only': {
    type: 'function',
    transform: 'reverseOnly',
    familySlug: 'upside-down-text',
    category: 'cool',
    slug: 'upside-down-reverse-only',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Reverse + Flip Combo': {
    type: 'function',
    transform: 'reverseFlipCombo',
    familySlug: 'upside-down-text',
    category: 'cool',
    slug: 'upside-down-reverse-flip',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Partial Upside Emphasis': {
    type: 'function',
    transform: 'partialEmphasis',
    familySlug: 'upside-down-text',
    category: 'fancy',
    slug: 'upside-down-partial-emphasis',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Line Level Upside Down': {
    type: 'function',
    transform: 'lineLevel',
    familySlug: 'upside-down-text',
    category: 'special',
    slug: 'upside-down-line-level',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Alternating Upside Down': {
    type: 'function',
    transform: 'alternating',
    familySlug: 'upside-down-text',
    category: 'cool',
    slug: 'upside-down-alternating',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Mirror Illusion': {
    type: 'function',
    transform: 'mirrorIllusion',
    familySlug: 'upside-down-text',
    category: 'special',
    slug: 'upside-down-mirror-illusion',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Emoji Assisted Upside Down': {
    type: 'function',
    transform: 'emojiAssisted',
    familySlug: 'upside-down-text',
    category: 'cool',
    slug: 'upside-down-emoji-assisted',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Faux Upside Down Symbols': {
    type: 'function',
    transform: 'fauxSymbols',
    familySlug: 'upside-down-text',
    category: 'fancy',
    slug: 'upside-down-faux-symbols',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Upside Down Micro Text': {
    type: 'function',
    transform: 'microText',
    familySlug: 'upside-down-text',
    category: 'special',
    slug: 'upside-down-micro',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  }
};

/* -----------------------------
   Registry Helpers (Global)
------------------------------ */
function getAllStyles() {
  return Object.entries(textStyles).map(([name, style]) => ({ name, ...style }));
}

function getStyleBySlug(fontSlug) {
  const entry = Object.entries(textStyles).find(([, style]) => style.slug === fontSlug);
  if (!entry) return null;
  const [name, style] = entry;
  return { name, ...style };
}

function getFamilyByCategorySlug(categorySlug) {
  const entry = Object.entries(CATEGORY_PAGES).find(([, fam]) => fam.slug === categorySlug);
  if (!entry) return null;
  const [familySlug, family] = entry;
  return { familySlug, ...family };
}

function getStylesByFamilySlug(familySlug) {
  return getAllStyles().filter(s => s.familySlug === familySlug);
}

function getStylesByFamilyAndGroup(familySlug, groupSlug) {
  return getAllStyles().filter(s => s.familySlug === familySlug && s.groupSlug === groupSlug);
}

/* -----------------------------
   Optional: expose globals explicitly
------------------------------ */
window.SITE_PAGES = SITE_PAGES;
window.CATEGORY_PAGES = CATEGORY_PAGES;
window.textStyles = textStyles;

window.StyleRegistry = {
  getAllStyles,
  getStyleBySlug,
  getFamilyByCategorySlug,
  getStylesByFamilySlug,
  getStylesByFamilyAndGroup
};