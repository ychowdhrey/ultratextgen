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
  'bold': {
    slug: 'bold-fonts',
    title: 'Bold Fonts',
    description: 'Bold Unicode fonts you can copy and paste.'
  },
   
  'italic': {
    slug: 'italic-fonts',
    title: 'Italic Fonts',
    description: 'Italic Unicode fonts you can copy and paste.'
  },
   
  'cursive': {
    slug: 'cursive-fonts',
    title: 'Cursive Fonts',
    description: 'Elegant cursive and script Unicode fonts.'
  },
  'gothic': {
    slug: 'gothic-fonts',
    title: 'Gothic Fonts',
    description: 'Dark gothic and fraktur Unicode fonts.'
  },
  'old-english': {
    slug: 'old-english-fonts',
    title: 'Old English Fonts',
    description: 'Old English blackletter fonts for names, tattoos, and varsity lettering.'
  },
  'bubble': {
    slug: 'bubble-fonts',
    title: 'Bubble Fonts',
    description: 'Fun bubble and circle Unicode fonts.'
  },
  'strikethrough-text': {
    slug: 'strikethrough-text',
    title: 'Strikethrough Text',
    description: 'Strikethrough and decorative line effects for your text.'
  },
  'upside-down-text': {
    slug: 'upside-down-text',
    title: 'Upside Down Text',
    description: 'Flip your text upside down with multiple Unicode styles.'
  },
   'text-decorator': {
    slug: 'text-decorator',
    title: 'Text Decorator',
    description: 'Decorate your text with symbols, borders, brackets, and emoji wrappers.'
  },
  'small-text': {
    slug: 'small-text',
    title: 'Small Text',
    description: 'Small and tiny Unicode text styles for names and bios.'
  },
  'subscript': {
    slug: 'subscript',
    title: 'Subscript',
    description: 'Subscript Unicode text for chemistry formulas, footnotes, and indices.'
  },
  'superscript': {
    slug: 'superscript',
    title: 'Superscript',
    description: 'Superscript Unicode text for exponents, ordinals, and tiny asides.'
  },
  'small-caps': {
    slug: 'small-caps',
    title: 'Small Caps',
    description: 'Small caps Unicode text for bios, headings, and clean editorial styling.'
  },
  'cute-fonts': {
    slug: 'cute-fonts',
    title: 'Cute Fonts',
    description: 'Cute, preppy, and cutesy Unicode styles.'
  },
  'aesthetic-fonts': {
    slug: 'aesthetic-fonts',
    title: 'Aesthetic Fonts',
    description: 'Aesthetic Unicode text styles for social profiles.'
  },
  'fullwidth': {
    slug: 'fullwidth-fonts',
    title: 'Fullwidth / Vaporwave Fonts',
    description: 'Fullwidth vaporwave text with wide, aesthetic spacing.'
  },
  'faux': {
    slug: 'faux-fonts',
    title: 'Faux Script Fonts',
    description: 'Faux Cyrillic, Greek, and Japanese katakana lookalike letters.'
  },
  'ancient': {
    slug: 'ancient-fonts',
    title: 'Ancient & Rune Fonts',
    description: 'Runic, Cherokee, Ethiopic, and other ancient-script lookalike fonts.'
  },
  'emoji-letters': {
    slug: 'emoji-letter-fonts',
    title: 'Emoji Letter Fonts',
    description: 'Emoji block letters, squared letters, and regional-indicator flag letters.'
  },
  'novelty': {
    slug: 'novelty-fonts',
    title: 'Novelty Fonts',
    description: 'Keycap numbers, currency-symbol letters, and other novelty text styles.'
  },
  'case-converter': {
    slug: 'case-converter',
    title: 'Case Converter',
    description: 'Convert text to UPPERCASE, lowercase, Title Case, Sentence case, and more.'
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
    title: 'UltraTextGen – Fast Text Styles That Work Everywhere',
    description: 'Text styles for social, bios, usernames, and posts. Generate stylish Unicode text instantly for Instagram, TikTok, X, WhatsApp, and Discord.'
  },
  categoryRoot: {
    slug: 'category',
    title: 'Font Categories',
    description: 'Browse Unicode font categories and copy-paste styles.'
  },
  fontRoot: {
    slug: 'font',
    title: 'Fonts',
    description: 'Browse individual Unicode font pages.'
  },
  printablesRoot: {
    slug: 'printables',
    title: 'Printable Letters & Alphabets',
    description: 'Free printable letters, alphabets, tracing sheets, and PNG downloads.'
  }
};

/* -----------------------------
   PRINTABLE PAGES (Printables cluster)
   Downloadable / traceable resources (print + PNG), distinct from the
   copy-paste font generators in CATEGORY_PAGES. Each page is driven by the
   shared engine at /js/printables/printablesEngine.js via a per-page config.
------------------------------ */
const PRINTABLE_PAGES = {
  'bubble-letters': {
    slug: 'bubble-letters',
    title: 'Printable Bubble Letters',
    description: 'Bubble letters A–Z and 0–9 as large printable outlines to trace, color, and download as PNG.'
  },
  'cursive-alphabet': {
    slug: 'cursive-alphabet',
    title: 'Cursive Alphabet & Practice Sheets',
    description: 'The cursive alphabet A–Z with printable practice sheets to trace and per-letter PNG downloads.'
  },
  'calligraphy-alphabet': {
    slug: 'calligraphy-alphabet',
    title: 'Calligraphy Alphabet & Practice Sheets',
    description: 'The calligraphy alphabet A–Z — blackletter and elegant script — with printable practice sheets and PNG downloads.'
  },
  'block-letters': {
    slug: 'block-letters',
    title: 'Printable Block Letters & Stencils',
    description: 'Block letter and number stencils A–Z, 0–9 — letter stencils and alphabet stencils to print, trace, and cut out.'
  },
  'name-tracing': {
    slug: 'name-tracing',
    title: 'Name Tracing Worksheets',
    description: 'Type any name to build a free printable tracing worksheet with model and trace rows.'
  },
  'handwriting-worksheet-generator': {
    slug: 'handwriting-worksheet-generator',
    title: 'Handwriting Worksheet Generator',
    description: 'Make a custom handwriting worksheet and dial the tracing difficulty — dotted, dashed, faded, or blank — with age presets from Pre-K to Grade 2.'
  },
  'sight-word-tracing': {
    slug: 'sight-word-tracing',
    title: 'Sight Word Tracing Worksheets',
    description: 'Tap a common Dolch-style sight word or type your own, dial the tracing difficulty, and print a free sight word practice sheet — reading-stage presets from Pre-K to Grade 2+.'
  },
  'alphabet-coloring-pages': {
    slug: 'alphabet-coloring-pages',
    title: 'Alphabet Coloring Pages',
    description: 'Free printable alphabet coloring pages A–Z — big single-line letter outlines to color and print, plus a page for every letter.'
  },
  'coloring-page-maker': {
    slug: 'coloring-page-maker',
    title: 'Coloring Page Maker',
    description: 'Type any name or word to make your own printable coloring page — heading, name-and-date line, decorative borders, and multi-color fills. Print or PNG, no sign-up.'
  },
  'name-puzzle-maker': {
    slug: 'name-puzzle-maker',
    title: 'Name Puzzle Maker',
    description: 'Type any name to make a free printable name puzzle — each letter as a big outline piece with dashed cut lines, plus an optional shape-frame border. Print or PNG, no sign-up.'
  },
  'dot-to-dot-alphabet': {
    slug: 'dot-to-dot-alphabet',
    title: 'Dot-to-Dot Alphabet',
    description: 'Free printable dot-to-dot letters A–Z — a numbered connect-the-dots puzzle for every letter, plus a page for every letter and a one-click print of the whole alphabet.'
  },
  'banner-maker': {
    slug: 'banner-maker',
    title: 'Printable Banner Maker',
    description: 'Type a word or phrase to build a printable letter banner — one cut-out flag per letter with string holes, paginated to print across multiple sheets.'
  },
  'spanish-alphabet-chart': {
    slug: 'spanish-alphabet-chart',
    title: 'Printable Spanish Alphabet Chart',
    description: 'All 27 letters of the Spanish alphabet, A-Z plus Ñ, as a free printable reference chart — pick any single letter or print the whole set.'
  }
};

/* -----------------------------
   TEXT STYLES REGISTRY
------------------------------ */
const textStyles = {

   /* =========================
   BOLD & ITALIC FAMILY
   ========================= */

/* BOLD */
'Ultra Bold': {
  upper: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭',
  lower: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
  nums: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
  type: 'map',
  category: 'bold',
  familySlug: ['bold'],
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
  familySlug: ['bold'],
  groupSlug: 'bold',
  slug: 'ultra-bold-serif',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

/* Double-struck / "blackboard bold" — reads as an outline bold weight.
   C, H, N, P, Q, R, Z use letterlike-symbol code points (no math variant). */
'Ultra Double-Struck': {
  upper: '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ',
  lower: '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫',
  nums: '𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡',
  type: 'map',
  category: 'bold',
  familySlug: ['bold'],
  groupSlug: 'bold',
  slug: 'ultra-double-struck',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'discord']
},

/* ITALIC */
'Ultra Italic': {
  upper: '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡',
  lower: '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻',
  nums: '0123456789',
  type: 'map',
  category: 'italic',
  familySlug: ['italic'],
  groupSlug: 'italic',
  slug: 'ultra-italic',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Italic Serif': {
  upper: '𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍',
  lower: '𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧',
  nums: '0123456789',
  type: 'map',
  category: 'italic',
  familySlug: ['italic'],
  groupSlug: 'italic',
  slug: 'ultra-italic-serif',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

/* BOLD ITALIC
   appears in BOTH bold and italic pages */
'Ultra Bold Italic': {
  upper: '𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕',
  lower: '𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯',
  nums: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
  type: 'map',
  category: 'bold',
  note: 'Modern · sans-serif',
  familySlug: ['bold', 'italic'],
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
  note: 'Classic · serif',
  familySlug: ['bold', 'italic'],
  groupSlug: 'bold-italic',
  slug: 'ultra-bold-italic-serif',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

/* PROCEDURES */
'Ultra Alternating Bold': {
  type: 'procedure',
  procedureId: 'alternating-bold',
  category: 'bold',
  familySlug: ['bold'],
  groupSlug: 'alternating',
  slug: 'ultra-alternating-bold',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Alternating Italic': {
  type: 'procedure',
  procedureId: 'alternating-italic',
  category: 'italic',
  familySlug: ['italic'],
  groupSlug: 'alternating',
  slug: 'ultra-alternating-italic',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

/* this is bold + italic behavior, so show on both pages */
'Ultra Bold w Alternating Italic': {
  type: 'procedure',
  procedureId: 'bold-alternating-italic',
  category: 'bold',
  familySlug: ['bold', 'italic'],
  groupSlug: 'alternating',
  slug: 'ultra-bold-alternating-italic',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

/* italic focused, keep on italic page */
'Ultra Italic Switch Serifs': {
  type: 'procedure',
  procedureId: 'italic-switch-serifs',
  category: 'italic',
  familySlug: ['italic'],
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
    // Unicode has no true script digits; pair the elegant script letters with
    // matching sans-serif numerals instead of a flat ASCII fallback.
    nums: '𝟢𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫',
    type: 'map',
    category: 'cursive',
    familySlug: 'cursive',
    groupSlug: 'script',
    slug: 'ultra-script',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Ultra Script Bold': {
    upper: '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩',
    lower: '𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃',
    // Bold script has no digit set either — use bold sans-serif numerals to match weight.
    nums: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
    type: 'map',
    category: 'cursive',
    // Cross-listed onto the bold page: it is a bold-weight script.
    familySlug: ['cursive', 'bold'],
    groupSlug: 'script',
    slug: 'ultra-script-bold',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'discord']
  },

  // Airy / elegant cursive — script letters with even spacing (uses spaced render mode).
  'Ultra Script Elegant': {
    upper: '𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵',
    lower: '𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏',
    nums: '𝟢𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫',
    type: 'map',
    category: 'cursive',
    familySlug: 'cursive',
    groupSlug: 'script',
    slug: 'ultra-script-elegant-spaced',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  // Airy bold cursive variant.
  'Ultra Script Bold Elegant': {
    upper: '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩',
    lower: '𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃',
    nums: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
    type: 'map',
    category: 'cursive',
    familySlug: 'cursive',
    groupSlug: 'script',
    slug: 'ultra-script-bold-elegant-spaced',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  // Gothic-cursive crossover (bold fraktur) — serves the "gothic cursive" intent.
  'Ultra Gothic Script': {
    upper: '𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅',
    lower: '𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟',
    nums: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
    type: 'map',
    category: 'cursive',
    familySlug: ['cursive', 'gothic'],
    groupSlug: 'script',
    slug: 'ultra-gothic-script',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'discord']
  },

  // Chicano / lowrider-style stylized nametag — bold script inside ornate flourishes.
  'Ultra Chicano Script': {
    type: 'procedure',
    procedureId: 'ultra_cursive_chicano',
    category: 'cursive',
    familySlug: 'cursive',
    groupSlug: 'script',
    slug: 'ultra_cursive_chicano',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'discord']
  },

  // Aesthetic bio line — script wrapped in sparkle accents (the most-requested cursive pairing).
  'Ultra Script Sparkle': {
    type: 'procedure',
    procedureId: 'ultra_cursive_sparkle',
    category: 'cursive',
    familySlug: 'cursive',
    groupSlug: 'script',
    slug: 'ultra_cursive_sparkle',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  /* =========================
     GOTHIC
     ========================= */
  'Ultra Gothic': {
    upper: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ',
    lower: '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷',
    // Mathematical Fraktur has no digits — pair with Mathematical Bold digits
    // (the closest heavy match) so numbers stop falling back to plain ASCII.
    nums: '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗',
    type: 'map',
    category: 'gothic',
    familySlug: ['gothic', 'old-english'],
    groupSlug: 'fraktur',
    slug: 'ultra-gothic',
    platforms: ['all', 'instagram', 'x', 'discord']
  },

  'Ultra Gothic Bold': {
    upper: '𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅',
    lower: '𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟',
    nums: '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗',
    type: 'map',
    category: 'gothic',
    // Bold Fraktur is the heavy "Old English" newspaper/tattoo look — cross-list
    // it onto the bold page and the Old English page.
    familySlug: ['gothic', 'bold', 'old-english'],
    groupSlug: 'fraktur',
    slug: 'ultra-gothic-bold',
    platforms: ['all', 'instagram', 'x', 'discord']
  },

  // Fraktur with a combining underline — serves the "gothic underline" intent
  // (seen directly in Search Console impressions for this page).
  'Ultra Gothic Underline': {
    type: 'procedure',
    procedureId: 'ultra_gothic_underline',
    category: 'gothic',
    familySlug: ['gothic', 'old-english'],
    groupSlug: 'fraktur',
    slug: 'ultra-gothic-underline',
    platforms: ['all', 'instagram', 'x', 'discord']
  },

  // Blackletter bookended with crosses — religious / "gothic bible verse" intent.
  'Ultra Gothic Cross': {
    type: 'procedure',
    procedureId: 'ultra_gothic_cross',
    category: 'gothic',
    familySlug: ['gothic', 'old-english'],
    groupSlug: 'fraktur',
    slug: 'ultra-gothic-cross',
    platforms: ['all', 'instagram', 'x', 'discord']
  },

  // Fraktur wrapped in occult accents — goth / metal / dark-aesthetic intent.
  'Ultra Gothic Occult': {
    type: 'procedure',
    procedureId: 'ultra_gothic_occult',
    category: 'gothic',
    familySlug: 'gothic',
    groupSlug: 'fraktur',
    slug: 'ultra-gothic-occult',
    platforms: ['all', 'instagram', 'x', 'discord']
  },

  // Fraktur struck through — grunge / edgy intent.
  'Ultra Gothic Strikethrough': {
    type: 'procedure',
    procedureId: 'ultra_gothic_strike',
    category: 'gothic',
    familySlug: 'gothic',
    groupSlug: 'fraktur',
    slug: 'ultra-gothic-strike',
    platforms: ['all', 'instagram', 'x', 'discord']
  },

  // Old English nameplate — bold blackletter inside a chicano banner. Old
  // English page only (the nameplate / name-tattoo intent).
  'Ultra Old English Banner': {
    type: 'procedure',
    procedureId: 'ultra-old-english-banner',
    category: 'gothic',
    familySlug: ['old-english'],
    groupSlug: 'fraktur',
    slug: 'ultra-old-english-banner',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'discord']
  },

  /* =========================
     BUBBLE
     ========================= */

/* ===== Canonical Bubble Forms (8) ===== */

'Ultra Bubble': {
  upper: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ',
  lower: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
  nums: '⓪①②③④⑤⑥⑦⑧⑨',
  type: 'map',
  category: 'bubble',
  familySlug: 'bubble',
  groupSlug: 'circle',
  slug: 'ultra-bubble',
  // Enclosed Alphanumerics (U+24B6 circled letters) show as a tofu box when a
  // combining accent mark is attached in most font stacks — safer to leave an
  // accented letter unstyled here than risk an illegible glyph. See renderer.js.
  accentSafe: false,
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Bubble Filled': {
  upper: '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩',
  lower: '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩',
  nums: '⓿❶❷❸❹❺❻❼❽❾',
  type: 'map',
  category: 'bubble',
  familySlug: 'bubble',
  groupSlug: 'square',
  slug: 'ultra-bubble-filled',
  platforms: ['all', 'instagram', 'discord']
},

'Ultra Bubble Light': {
  upper: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ',
  lower: '⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵',
  // No parenthesized-zero exists in Unicode, so digit 0 falls back to plain
  // '0' (like a letter with no equivalent) instead of shifting ⑴-⑽ across
  // all ten digits, which used to render "9" as "(10)".
  nums: '0⑴⑵⑶⑷⑸⑹⑺⑻⑼',
  type: 'map',
  category: 'bubble',
  familySlug: 'bubble',
  groupSlug: 'light',
  slug: 'ultra-bubble-light',
  accentSafe: false, // see Ultra Bubble — same Enclosed Alphanumerics tofu risk
  platforms: ['all', 'instagram', 'x', 'whatsapp']
},

'Ultra Bubble Tiles': {
  upper: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉',
  lower: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉',
  nums: '0️⃣1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣9️⃣',
  type: 'map',
  category: 'bubble',
  familySlug: 'bubble',
  groupSlug: 'tiles',
  slug: 'ultra-bubble-tiles',
  // Squared Latin Capital Letter (U+1F130) silently drops a combining accent
  // mark instead of rendering it — no visible glitch, but the accent is lost
  // with no visual cue, so we keep the old plain-passthrough behaviour.
  accentSafe: false,
  platforms: ['all', 'instagram', 'discord']
},

'Ultra Bubble Parentheses': {
  upper: '( A )( B )( C )( D )( E )( F )( G )( H )( I )( J )( K )( L )( M )( N )( O )( P )( Q )( R )( S )( T )( U )( V )( W )( X )( Y )( Z )',
  lower: '( a )( b )( c )( d )( e )( f )( g )( h )( i )( j )( k )( l )( m )( n )( o )( p )( q )( r )( s )( t )( u )( v )( w )( x )( y )( z )',
  nums: '( 0 )( 1 )( 2 )( 3 )( 4 )( 5 )( 6 )( 7 )( 8 )( 9 )',
  type: 'map',
  category: 'bubble',
  familySlug: 'bubble',
  groupSlug: 'bracket',
  slug: 'ultra-bubble-parentheses',
  platforms: ['all', 'instagram', 'x', 'whatsapp']
},

'Ultra Bubble Curly': {
  upper: '❨A❩❨B❩❨C❩❨D❩❨E❩❨F❩❨G❩❨H❩❨I❩❨J❩❨K❩❨L❩❨M❩❨N❩❨O❩❨P❩❨Q❩❨R❩❨S❩❨T❩❨U❩❨V❩❨W❩❨X❩❨Y❩❨Z❩',
  lower: '❨a❩❨b❩❨c❩❨d❩❨e❩❨f❩❨g❩❨h❩❨i❩❨j❩❨k❩❨l❩❨m❩❨n❩❨o❩❨p❩❨q❩❨r❩❨s❩❨t❩❨u❩❨v❩❨w❩❨x❩❨y❩❨z❩',
  nums: '❨0❩❨1❩❨2❩❨3❩❨4❩❨5❩❨6❩❨7❩❨8❩❨9❩',
  type: 'map',
  category: 'bubble',
  familySlug: 'bubble',
  groupSlug: 'bracket',
  slug: 'ultra-bubble-curly',
  platforms: ['all', 'instagram', 'discord']
},

'Ultra Bubble Angle': {
  upper: '⦅A⦆⦅B⦆⦅C⦆⦅D⦆⦅E⦆⦅F⦆⦅G⦆⦅H⦆⦅I⦆⦅J⦆⦅K⦆⦅L⦆⦅M⦆⦅N⦆⦅O⦆⦅P⦆⦅Q⦆⦅R⦆⦅S⦆⦅T⦆⦅U⦆⦅V⦆⦅W⦆⦅X⦆⦅Y⦆⦅Z⦆',
  lower: '⦅a⦆⦅b⦆⦅c⦆⦅d⦆⦅e⦆⦅f⦆⦅g⦆⦅h⦆⦅i⦆⦅j⦆⦅k⦆⦅l⦆⦅m⦆⦅n⦆⦅o⦆⦅p⦆⦅q⦆⦅r⦆⦅s⦆⦅t⦆⦅u⦆⦅v⦆⦅w⦆⦅x⦆⦅y⦆⦅z⦆',
  nums: '⦅0⦆⦅1⦆⦅2⦆⦅3⦆⦅4⦆⦅5⦆⦅6⦆⦅7⦆⦅8⦆⦅9⦆',
  type: 'map',
  category: 'bubble',
  familySlug: 'bubble',
  groupSlug: 'bracket',
  slug: 'ultra-bubble-angle',
  platforms: ['all', 'instagram', 'discord']
},

/* ===== Rendering Variants (5) ===== */

'Ultra Bubble Spaced': {
  upper: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ',
  lower: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
  nums:  '⓪①②③④⑤⑥⑦⑧⑨',
  type: 'map',
  category: 'bubble',
  familySlug: 'bubble',
  groupSlug: 'spaced',
  slug: 'ultra-bubble-spaced',
  accentSafe: false, // see Ultra Bubble — same Enclosed Alphanumerics tofu risk
  platforms: ['all', 'instagram', 'tiktok', 'x']
},

'Ultra Bubble Filled Spaced': {
  upper: '🅐 🅑 🅒 🅓 🅔 🅕 🅖 🅗 🅘 🅙 🅚 🅛 🅜 🅝 🅞 🅟 🅠 🅡 🅢 🅣 🅤 🅥 🅦 🅧 🅨 🅩',
  lower: '🅐 🅑 🅒 🅓 🅔 🅕 🅖 🅗 🅘 🅙 🅚 🅛 🅜 🅝 🅞 🅟 🅠 🅡 🅢 🅣 🅤 🅥 🅦 🅧 🅨 🅩',
  nums: '⓿ ❶ ❷ ❸ ❹ ❺ ❻ ❼ ❽ ❾',
  type: 'map',
  category: 'bubble',
  familySlug: 'bubble',
  groupSlug: 'spaced',
  slug: 'ultra-bubble-filled-spaced',
  platforms: ['all', 'instagram']
},

'Ultra Bubble Tiles Spaced': {
  upper: '🄰 🄱 🄲 🄳 🄴 🄵 🄶 🄷 🄸 🄹 🄺 🄻 🄼 🄽 🄾 🄿 🅀 🅁 🅂 🅃 🅄 🅅 🅆 🅇 🅈 🅉',
  lower: '🄰 🄱 🄲 🄳 🄴 🄵 🄶 🄷 🄸 🄹 🄺 🄻 🄼 🄽 🄾 🄿 🅀 🅁 🅂 🅃 🅄 🅅 🅆 🅇 🅈 🅉',
  nums: '0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣',
  type: 'map',
  category: 'bubble',
  familySlug: 'bubble',
  groupSlug: 'spaced',
  slug: 'ultra-bubble-tiles-spaced',
  accentSafe: false, // see Ultra Bubble Tiles — combining marks silently drop
  platforms: ['all', 'instagram']
},

'Ultra Bubble Curly Spaced': {
  upper: '❨A❩ ❨B❩ ❨C❩ ❨D❩ ❨E❩ ❨F❩ ❨G❩ ❨H❩ ❨I❩ ❨J❩ ❨K❩ ❨L❩ ❨M❩ ❨N❩ ❨O❩ ❨P❩ ❨Q❩ ❨R❩ ❨S❩ ❨T❩ ❨U❩ ❨V❩ ❨W❩ ❨X❩ ❨Y❩ ❨Z❩',
  lower: '❨a❩ ❨b❩ ❨c❩ ❨d❩ ❨e❩ ❨f❩ ❨g❩ ❨h❩ ❨i❩ ❨j❩ ❨k❩ ❨l❩ ❨m❩ ❨n❩ ❨o❩ ❨p❩ ❨q❩ ❨r❩ ❨s❩ ❨t❩ ❨u❩ ❨v❩ ❨w❩ ❨x❩ ❨y❩ ❨z❩',
  nums: '❨0❩ ❨1❩ ❨2❩ ❨3❩ ❨4❩ ❨5❩ ❨6❩ ❨7❩ ❨8❩ ❨9❩',
  type: 'map',
  category: 'bubble',
  familySlug: 'bubble',
  groupSlug: 'spaced',
  slug: 'ultra-bubble-curly-spaced',
  platforms: ['all', 'instagram']
},

'Ultra Bubble Angle Spaced': {
  upper: '⦅A⦆ ⦅B⦆ ⦅C⦆ ⦅D⦆ ⦅E⦆ ⦅F⦆ ⦅G⦆ ⦅H⦆ ⦅I⦆ ⦅J⦆ ⦅K⦆ ⦅L⦆ ⦅M⦆ ⦅N⦆ ⦅O⦆ ⦅P⦆ ⦅Q⦆ ⦅R⦆ ⦅S⦆ ⦅T⦆ ⦅U⦆ ⦅V⦆ ⦅W⦆ ⦅X⦆ ⦅Y⦆ ⦅Z⦆',
  lower: '⦅a⦆ ⦅b⦆ ⦅c⦆ ⦅d⦆ ⦅e⦆ ⦅f⦆ ⦅g⦆ ⦅h⦆ ⦅i⦆ ⦅j⦆ ⦅k⦆ ⦅l⦆ ⦅m⦆ ⦅n⦆ ⦅o⦆ ⦅p⦆ ⦅q⦆ ⦅r⦆ ⦅s⦆ ⦅t⦆ ⦅u⦆ ⦅v⦆ ⦅w⦆ ⦅x⦆ ⦅y⦆ ⦅z⦆',
  nums: '⦅0⦆ ⦅1⦆ ⦅2⦆ ⦅3⦆ ⦅4⦆ ⦅5⦆ ⦅6⦆ ⦅7⦆ ⦅8⦆ ⦅9⦆',
  type: 'map',
  category: 'bubble',
  familySlug: 'bubble',
  groupSlug: 'spaced',
  slug: 'ultra-bubble-angle-spaced',
  platforms: ['all', 'instagram']
},
  /* =========================
     Strikethrough Text
     ========================= */
  'Ultra Strike': {
    type: 'decorator',
    decoratorId: 'strike',
     category: 'strikethrough',
     familySlug: 'strikethrough-text',
    groupSlug: 'lines',
    slug: 'ultra-strike',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

'Ultra Double Strike': {
  type: 'decorator',
  decoratorId: 'doubleStrike',
  category: 'strikethrough',
  familySlug: 'strikethrough-text',
  groupSlug: 'lines',
  slug: 'ultra-double-strike',
  note: 'Copy & Paste to Check',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Crossed-Out': {
  type: 'decorator',
  decoratorId: 'crossedOut',
  category: 'strikethrough',
  familySlug: 'strikethrough-text',
  groupSlug: 'lines',
  slug: 'ultra-crossed-out',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Slash': {
   type: 'decorator',
   decoratorId: 'slash',
   category: 'strikethrough',
   familySlug: 'strikethrough-text',
   groupSlug: 'lines',
   slug: 'ultra-slash',
   platforms: ['all', 'x', 'discord']
},

'Ultra Thin Strike': {
  type: 'decorator',
  decoratorId: 'shortStrike',
  category: 'strikethrough',
  familySlug: 'strikethrough-text',
  groupSlug: 'lines',
  slug: 'ultra-thin-strike',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Heavy Strike': {
  type: 'decorator',
  decoratorId: 'heavyStrike',
  category: 'strikethrough',
  familySlug: 'strikethrough-text',
  groupSlug: 'lines',
  slug: 'ultra-heavy-strike',
  note: 'Copy & Paste to Check',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Wavy Strike': {
  type: 'decorator',
  decoratorId: 'wavyStrike',
  category: 'strikethrough',
  familySlug: 'strikethrough-text',
  groupSlug: 'lines',
  slug: 'ultra-wavy-strike',
  note: 'Copy & Paste to Check',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'discord']
},

'Ultra Light Slash': {
  type: 'decorator',
  decoratorId: 'shortSlash',
  category: 'strikethrough',
  familySlug: 'strikethrough-text',
  groupSlug: 'lines',
  slug: 'ultra-light-slash',
  platforms: ['all', 'x', 'discord']
},

'Ultra Strike + Underline': {
  type: 'decorator',
  decoratorId: 'strikeUnderline',
  category: 'strikethrough',
  familySlug: 'strikethrough-text',
  groupSlug: 'lines',
  slug: 'ultra-strike-underline',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

  /* =========================
     Underline Text
     ========================= */

   'Ultra Underline': {
    type: 'decorator',
    decoratorId: 'underline',
     category: 'underline',
     familySlug: 'underline-text',
    groupSlug: 'lines',
    slug: 'ultra-underline',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },
   
  'Ultra Double Underline': {
    type: 'decorator',
    decoratorId: 'doubleUnderline',
     category: 'underline',
     familySlug: 'underline-text',
    groupSlug: 'lines',
    slug: 'ultra-double-underline',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
  },

  'Ultra Wavy Underline': {
    type: 'decorator',
    decoratorId: 'wavyUnderline',
     category: 'underline',
     familySlug: 'underline-text',
    groupSlug: 'lines',
    slug: 'ultra-wavy-underline',
    note: 'Copy & Paste to Check',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'discord']
  },

  'Ultra Overline': {
    type: 'decorator',
    decoratorId: 'overline',
     category: 'underline',
     familySlug: 'underline-text',
    groupSlug: 'lines',
    slug: 'ultra-overline',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'discord']
  },

  'Ultra Double Overline': {
    type: 'decorator',
    decoratorId: 'doubleOverline',
     category: 'underline',
     familySlug: 'underline-text',
    groupSlug: 'lines',
    slug: 'ultra-double-overline',
    note: 'Copy & Paste to Check',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'discord']
  },

  'Ultra Wavy': {
    type: 'decorator',
    decoratorId: 'wavy',
     category: 'underline',
     familySlug: 'underline-text',
    groupSlug: 'effects',
    slug: 'ultra-wavy',
    platforms: ['all', 'instagram', 'tiktok', 'x', 'discord']
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
  },

/* =========================
   WORD WRAP TEXT FAMILY
   ========================= */

'Ultra Word Curly Wrap': {
  type: 'procedure',
  category: 'text-decorator',
  familySlug: 'text-decorator',
  groupSlug: 'wrap',
  slug: 'ultra_word_curly_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Angle Wrap': {
  type: 'procedure',
  category: 'text-decorator',
  familySlug: 'text-decorator',
  groupSlug: 'wrap',
  slug: 'ultra_word_angle_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Double Wrap': {
  type: 'procedure',
  category: 'text-decorator',
  familySlug: 'text-decorator',
  groupSlug: 'wrap',
  slug: 'ultra_word_double_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Arrow Wrap': {
  type: 'procedure',
  category: 'text-decorator',
  familySlug: 'text-decorator',
  groupSlug: 'arrows',
  slug: 'ultra_word_arrow_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Forward Arrow Wrap': {
  type: 'procedure',
  category: 'text-decorator',
  familySlug: 'text-decorator',
  groupSlug: 'arrows',
  slug: 'ultra_word_forward_arrow_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Backward Arrow Wrap': {
  type: 'procedure',
  category: 'text-decorator',
  familySlug: 'text-decorator',
  groupSlug: 'arrows',
  slug: 'ultra_word_backward_arrow_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Bracket Wrap': {
  type: 'procedure',
  category: 'text-decorator',
  familySlug: 'text-decorator',
  groupSlug: 'frames',
  slug: 'ultra_word_bracket_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Chevron Wrap': {
  type: 'procedure',
  category: 'text-decorator',
  familySlug: 'text-decorator',
  groupSlug: 'frames',
  slug: 'ultra_word_chevron_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Bar Wrap': {
  type: 'procedure',
  category: 'text-decorator',
  familySlug: 'text-decorator',
  groupSlug: 'bars',
  slug: 'ultra_word_bar_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Double Bar Wrap': {
  type: 'procedure',
  category: 'text-decorator',
  familySlug: 'text-decorator',
  groupSlug: 'bars',
  slug: 'ultra_word_double_bar_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

/* =========================
   SMALL / CUTE / AESTHETIC
   ========================= */

'Ultra Small Superscript Style': {
  upper: 'ᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾQᴿˢᵀᵁⱽᵂˣʸᶻ',
  lower: 'ᵃᵇᶜᵈᵉᶠᵍʰᶦʲᵏˡᵐⁿᵒᵖqʳˢᵗᵘᵛʷˣʸᶻ',
  nums: '⁰¹²³⁴⁵⁶⁷⁸⁹',
  type: 'map',
  category: 'small-text',
  familySlug: ['small-text', 'aesthetic-fonts', 'superscript'],
  groupSlug: 'tiny',
  slug: 'ultra-small-superscript-style',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Tiny Subscript': {
  // Unicode does not provide full uppercase subscript letters, so uppercase falls back to standard A-Z.
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'ₐᵦcdₑfgₕᵢⱼₖₗₘₙₒₚqᵣₛₜᵤᵥwₓyz',
  nums: '₀₁₂₃₄₅₆₇₈₉',
  type: 'map',
  category: 'small-text',
  familySlug: ['small-text', 'subscript'],
  groupSlug: 'tiny',
  slug: 'ultra-tiny-subscript',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Small Caps': {
  upper: 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀsᴛᴜᴠᴡxʏᴢ',
  lower: 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘqʀsᴛᴜᴠᴡxʏᴢ',
  nums: '⁰¹²³⁴⁵⁶⁷⁸⁹',
  type: 'map',
  category: 'small-text',
  familySlug: ['small-text', 'aesthetic-fonts', 'small-caps'],
  groupSlug: 'small-caps',
  slug: 'ultra-small-caps',
  note: 'Small caps · Q and X keep their normal shape (Unicode has no small-cap glyph for either)',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Cute Script': {
  upper: '𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵',
  lower: '𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏',
  nums: '0123456789',
  type: 'map',
  category: 'cute-fonts',
  familySlug: ['cute-fonts', 'aesthetic-fonts'],
  groupSlug: 'cute',
  slug: 'ultra-cute-script',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Cute Bubble': {
  upper: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ',
  lower: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
  nums: '⓪①②③④⑤⑥⑦⑧⑨',
  type: 'map',
  category: 'cute-fonts',
  familySlug: ['cute-fonts'],
  groupSlug: 'cute',
  slug: 'ultra-cute-bubble',
  accentSafe: false, // see Ultra Bubble — same Enclosed Alphanumerics tofu risk
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Aesthetic Gothic': {
  upper: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ',
  lower: '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷',
  nums: '0123456789',
  type: 'map',
  category: 'aesthetic-fonts',
  familySlug: ['aesthetic-fonts'],
  groupSlug: 'aesthetic',
  slug: 'ultra-aesthetic-gothic',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

/* ================================
   CLASSIFIED / REDACTED STYLES
   These use type:'redact' — they black out the USER'S OWN text and preserve
   word length, so the redaction traces the shape of the sentence (the way
   real redacted documents read). See renderRedact() in renderer.js.
================================ */

// --- Full-text blackout (length-preserving) -------------------------------
'Ultra Redacted': {
  type: 'redact',
  redactChar: '█',
  redactMode: 'all',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-redacted-blocks'
},

'Ultra Redacted Heavy Shade': {
  type: 'redact',
  redactChar: '▓',
  redactMode: 'all',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-redacted-shade'
},

'Ultra Redacted Light Shade': {
  type: 'redact',
  redactChar: '▒',
  redactMode: 'all',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-redacted-light'
},

'Ultra Redacted Squares': {
  type: 'redact',
  redactChar: '■',
  redactMode: 'all',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-redacted-squares'
},

'Ultra Redacted Emoji': {
  type: 'redact',
  redactChar: '⬛',
  redactMode: 'all',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-redacted-emoji'
},

'Ultra White Redacted': {
  type: 'redact',
  redactChar: '⬜',
  redactMode: 'all',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-white-redacted'
},

// --- Selective / partial redaction ----------------------------------------
'Ultra Selective Redact': {
  type: 'redact',
  redactChar: '█',
  redactMode: 'selective',
  note: 'Wrap the words to hide in [[double brackets]] — only those get blacked out.',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-selective-redact'
},

'Ultra Alternate Redact': {
  type: 'redact',
  redactChar: '█',
  redactMode: 'alternate',
  note: 'Redacts every other word, leaving the rest readable.',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-alternate-redact'
},

// --- Typewriter document base (the look of real classified paperwork) -----
'Ultra Typewriter Document': {
  upper: '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉',
  lower: '𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣',
  nums:  '𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿',
  type: 'map',
  note: 'Monospace typewriter look — pair with a redaction stamp for the full document feel.',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-typewriter'
},

  /* =========================
     FULLWIDTH / VAPORWAVE
     ========================= */

  'Ultra Fullwidth': {
    upper: 'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ',
    lower: 'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ',
    nums: '０１２３４５６７８９',
    type: 'map',
    note: 'Vaporwave · wide aesthetic',
    category: 'fullwidth',
    familySlug: ['fullwidth'],
    groupSlug: 'fullwidth',
    slug: 'ultra-fullwidth',
    // Halfwidth/Fullwidth Forms shows a tofu box when a combining accent mark
    // is attached in most font stacks — leave accented letters unstyled here.
    accentSafe: false,
    platforms: ["all","instagram","tiktok","x","whatsapp","discord"]
  },

  /* =========================
     FAUX-SCRIPT LOOKALIKES
     ========================= */

  'Ultra Faux Cyrillic': {
    upper: 'АВСДЕҒГНІЈКЛМИОРԚЯЅТЦѴШХҮЗ',
    lower: 'абсдеғгніјклмиорԛяѕтцѵшхуз',
    nums: '0123456789',
    type: 'map',
    note: 'Faux Russian look · lookalike letters',
    category: 'faux',
    familySlug: ['faux'],
    groupSlug: 'faux',
    slug: 'ultra-faux-cyrillic',
    platforms: ["all","instagram","tiktok","x","discord"]
  },

  'Ultra Faux Greek': {
    upper: 'ΑΒϹΔΕϜΓΗΙϳΚΛΜΝΟΡϘΡΣΤΥVΩΧΥΖ',
    lower: 'αβϲδεϝγηιϳκλμνορϙρστυvωχυζ',
    nums: '0123456789',
    type: 'map',
    note: 'Greek lookalike letters',
    category: 'faux',
    familySlug: ['faux'],
    groupSlug: 'faux',
    slug: 'ultra-faux-greek',
    platforms: ["all","instagram","tiktok","x","discord"]
  },

  'Ultra Katakana': {
    upper: 'アバクダエフガハイジカルマナオパクラサタウヴワクヤザ',
    lower: 'アバクダエフガハイジカルマナオパクラサタウヴワクヤザ',
    nums: '0123456789',
    type: 'map',
    note: 'Japanese katakana style',
    category: 'faux',
    familySlug: ['faux'],
    groupSlug: 'faux',
    slug: 'ultra-katakana',
    accentSafe: false, // Katakana block tofus a reattached combining accent mark
    platforms: ["all","instagram","tiktok","x","discord"]
  },

  /* =========================
     ANCIENT & RUNE SCRIPTS
     (homoglyph maps — partial coverage falls back to Latin)
     ========================= */

  'Ultra Runic': {
    upper: 'ᚨᛒᚲᛞᛖᚠᚷᚺᛁᛃᚲᛚᛗᚾᛟᛈᚲᚱᛊᛏᚢᚡᚹᛪᛦᛉ',
    lower: 'ᚨᛒᚲᛞᛖᚠᚷᚺᛁᛃᚲᛚᛗᚾᛟᛈᚲᚱᛊᛏᚢᚡᚹᛪᛦᛉ',
    nums: '0123456789',
    type: 'map',
    note: 'Elder Futhark runes',
    category: 'ancient',
    familySlug: ['ancient'],
    groupSlug: 'runic',
    slug: 'ultra-runic',
    accentSafe: false, // combining accent marks silently don't render on runes
    platforms: ["instagram","x","discord"]
  },

  'Ultra Old Italic': {
    upper: '𐌀𐌁𐌂𐌃𐌄𐌅𐌆𐌇𐌉𐌉𐌊𐌋𐌌𐌍𐌏𐌐𐌒𐌓𐌔𐌕𐌖𐌖𐌜𐌗𐌙𐌆',
    lower: '𐌀𐌁𐌂𐌃𐌄𐌅𐌆𐌇𐌉𐌉𐌊𐌋𐌌𐌍𐌏𐌐𐌒𐌓𐌔𐌕𐌖𐌖𐌜𐌗𐌙𐌆',
    nums: '0123456789',
    type: 'map',
    note: 'Ancient Italic / Etruscan look',
    category: 'ancient',
    familySlug: ['ancient'],
    groupSlug: 'ancient',
    slug: 'ultra-old-italic',
    platforms: ["discord","x"]
  },

  'Ultra Cherokee': {
    upper: 'ᎪᏴᏯᎠᎼᏅᏻᏋᏖᎻ᏶ᏮᏇᏑᏎᏲQᎱᏪᎲᏜᏙᏤXᎹᏓ',
    lower: 'ᎪᏴᏯᎠᎼᏅᏻᏋᏖᎻ᏶ᏮᏇᏑᏎᏲqᎱᏪᎲᏜᏙᏤxᎹᏓ',
    nums: '0123456789',
    type: 'map',
    note: 'Cherokee syllabary lookalikes',
    category: 'ancient',
    familySlug: ['ancient'],
    groupSlug: 'ancient',
    slug: 'ultra-cherokee',
    platforms: ["discord","x"]
  },

  'Ultra Canadian Syllabics': {
    upper: 'ᗅᗷᑕᗪᕾᖴGᕼᑊJᖽᒪᗰᑎᗝᑥQᗇᔕTᑌᐯᗯ᙭ᖻᒿ',
    lower: 'ᗅᗷᑕᗪᕾᖴgᕼᑊjᖽᒪᗰᑎᗝᑥqᗇᔕtᑌᐯᗯ᙭ᖻᒿ',
    nums: '0123456789',
    type: 'map',
    note: 'Canadian Aboriginal syllabics',
    category: 'ancient',
    familySlug: ['ancient'],
    groupSlug: 'ancient',
    slug: 'ultra-canadian-syllabics',
    accentSafe: false, // combining accent marks silently don't render here
    platforms: ["discord","x"]
  },

  'Ultra Ethiopic': {
    upper: 'ሀለሐመሠረሰሸቀበተኀነአከወዐዘየደጀገጠጰጸፈ',
    lower: 'ሀለሐመሠረሰሸቀበተኀነአከወዐዘየደጀገጠጰጸፈ',
    nums: '0123456789',
    type: 'map',
    note: 'Ethiopic / Geez script style',
    category: 'ancient',
    familySlug: ['ancient'],
    groupSlug: 'ancient',
    slug: 'ultra-ethiopic',
    platforms: ["discord","x"]
  },

  'Ultra Tibetan': {
    upper: 'ཀཁགངཅཆཇཉཏཐདནཔཕབམཙཚཛཝཞཟཡརལཤ',
    lower: 'ཀཁགངཅཆཇཉཏཐདནཔཕབམཙཚཛཝཞཟཡརལཤ',
    nums: '༠༡༢༣༤༥༦༧༨༩',
    type: 'map',
    note: 'Tibetan script style',
    category: 'ancient',
    familySlug: ['ancient'],
    groupSlug: 'ancient',
    slug: 'ultra-tibetan',
    platforms: ["discord","x"]
  },

  'Ultra Bopomofo': {
    upper: 'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞ',
    lower: 'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞ',
    nums: '0123456789',
    type: 'map',
    note: 'Bopomofo (Zhuyin) style',
    category: 'ancient',
    familySlug: ['ancient'],
    groupSlug: 'ancient',
    slug: 'ultra-bopomofo',
    accentSafe: false, // Bopomofo block tofus a reattached combining accent mark
    platforms: ["discord","x"]
  },

  'Ultra Yi': {
    upper: 'ꀀꀁꀂꀃꀄꀅꀆꀇꀈꀉꀊꀋꀌꀍꀎꀏꀐꀑꀒꀓꀔꀕꀖꀗꀘꀙ',
    lower: 'ꀀꀁꀂꀃꀄꀅꀆꀇꀈꀉꀊꀋꀌꀍꀎꀏꀐꀑꀒꀓꀔꀕꀖꀗꀘꀙ',
    nums: '0123456789',
    type: 'map',
    note: 'Yi script style',
    category: 'ancient',
    familySlug: ['ancient'],
    groupSlug: 'ancient',
    slug: 'ultra-yi',
    platforms: ["discord","x"]
  },

  /* =========================
     EMOJI LETTERS
     ========================= */

  'Ultra Emoji Block': {
    upper: '🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉',
    lower: '🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉',
    nums: '0123456789',
    type: 'map',
    note: 'Filled emoji block letters',
    category: 'emoji-letters',
    familySlug: ['emoji-letters'],
    groupSlug: 'emoji-letters',
    slug: 'ultra-emoji-block',
    // Negative Squared Latin Capital Letter silently drops a combining accent
    // mark instead of rendering it — keep the old plain-passthrough behaviour.
    accentSafe: false,
    platforms: ["all","instagram","tiktok","x","whatsapp","discord"]
  },

  'Ultra Squared': {
    upper: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉',
    lower: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉',
    nums: '0123456789',
    type: 'map',
    note: 'Outlined square letters',
    category: 'emoji-letters',
    familySlug: ['emoji-letters'],
    groupSlug: 'emoji-letters',
    slug: 'ultra-squared',
    accentSafe: false, // see Ultra Bubble Tiles — combining marks silently drop
    platforms: ["all","instagram","x","discord"]
  },

  'Ultra Regional Indicator': {
    upper: ["🇦⁠", "🇧⁠", "🇨⁠", "🇩⁠", "🇪⁠", "🇫⁠", "🇬⁠", "🇭⁠", "🇮⁠", "🇯⁠", "🇰⁠", "🇱⁠", "🇲⁠", "🇳⁠", "🇴⁠", "🇵⁠", "🇶⁠", "🇷⁠", "🇸⁠", "🇹⁠", "🇺⁠", "🇻⁠", "🇼⁠", "🇽⁠", "🇾⁠", "🇿⁠"],
    lower: ["🇦⁠", "🇧⁠", "🇨⁠", "🇩⁠", "🇪⁠", "🇫⁠", "🇬⁠", "🇭⁠", "🇮⁠", "🇯⁠", "🇰⁠", "🇱⁠", "🇲⁠", "🇳⁠", "🇴⁠", "🇵⁠", "🇶⁠", "🇷⁠", "🇸⁠", "🇹⁠", "🇺⁠", "🇻⁠", "🇼⁠", "🇽⁠", "🇾⁠", "🇿⁠"],
    nums: '0123456789',
    type: 'map',
    note: 'Flag / regional-indicator letters',
    category: 'emoji-letters',
    familySlug: ['emoji-letters'],
    groupSlug: 'emoji-letters',
    slug: 'ultra-regional-indicator',
    // Each token is a flag/regional-indicator emoji + word-joiner, not a
    // literal base letter, so a reattached combining accent has nowhere
    // correct to land — it ends up floating off the letterform's dashed
    // fallback box instead of sitting on the letter. Same silent-mangle
    // risk as Ultra Bubble Tiles/Ultra Squared (verified in Chromium).
    accentSafe: false,
    platforms: ["all","instagram","x","discord"]
  },

  /* =========================
     NOVELTY
     ========================= */

  'Ultra Keycap Numbers': {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    nums: ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"],
    type: 'map',
    note: 'Keycap digits (0-9)',
    category: 'novelty',
    familySlug: ['novelty'],
    groupSlug: 'novelty',
    slug: 'ultra-keycap-numbers',
    platforms: ["all","instagram","x","discord"]
  },

  'Ultra Currency': {
    upper: '₳฿¢₫€₣₲HIJ₭£₥₦O₱Q₹$₮UV₩X¥Z',
    lower: '₳฿¢₫€₣₲hij₭£₥₦o₱q₹$₮uv₩x¥z',
    nums: '0123456789',
    type: 'map',
    note: 'Currency-symbol lookalikes · partial',
    category: 'novelty',
    familySlug: ['novelty'],
    groupSlug: 'novelty',
    slug: 'ultra-currency',
    platforms: ["instagram","x","discord"]
  },

  // ギャル文字 (gyaru-moji) — 2002-2005 Japanese schoolgirl kana cipher.
  // type: 'procedure' since it substitutes kana (not the Latin A-Z/a-z/0-9
  // renderMap operates on) via a dedicated lookup table in renderer.js.
  'Ultra Gal Moji': {
    type: 'procedure',
    procedureId: 'gal-moji',
    note: 'ギャル文字 (gyaru-moji) · partial hiragana/katakana cipher',
    category: 'novelty',
    familySlug: ['gal-moji'],
    groupSlug: 'gal-moji',
    slug: 'gal-moji',
    platforms: ["all","instagram","tiktok","x","discord"]
  },

  'Ultra Cuping': {
    type: 'procedure',
    procedureId: 'cuping',
    note: 'Font Cuping · Indonesian "cute typing" phonetic respelling',
    category: 'novelty',
    familySlug: ['cuping'],
    groupSlug: 'cuping',
    slug: 'cuping',
    platforms: ["all","instagram","tiktok","whatsapp","discord"]
  },

  /* =========================
     CASE CONVERTER
     Plain ASCII case transforms — type: 'procedure', keyed by slug in
     renderer.js's `procedures` map. No upper/lower/nums maps needed.
     ========================= */

  'UPPERCASE': {
    type: 'procedure',
    note: 'Convert text to all caps',
    category: 'case-converter',
    familySlug: ['case-converter'],
    groupSlug: 'upper',
    slug: 'case-upper',
    platforms: ['all']
  },

  'lowercase': {
    type: 'procedure',
    note: 'Convert text to all lowercase',
    category: 'case-converter',
    familySlug: ['case-converter'],
    groupSlug: 'lower',
    slug: 'case-lower',
    platforms: ['all']
  },

  'Capitalized Case': {
    type: 'procedure',
    note: 'Capitalize the first letter of every word',
    category: 'case-converter',
    familySlug: ['case-converter'],
    groupSlug: 'capitalized',
    slug: 'case-capitalized',
    platforms: ['all']
  },

  'Title Case': {
    type: 'procedure',
    note: 'Capitalizes major words, lowercases short articles/conjunctions/prepositions, preserves acronyms',
    category: 'case-converter',
    familySlug: ['case-converter'],
    groupSlug: 'title',
    slug: 'case-title',
    platforms: ['all']
  },

  'Sentence case': {
    type: 'procedure',
    note: 'Capitalizes the first word of every sentence, keeps the rest lowercase',
    category: 'case-converter',
    familySlug: ['case-converter'],
    groupSlug: 'sentence',
    slug: 'case-sentence',
    platforms: ['all']
  },

  'aLtErNaTiNg CaSe': {
    type: 'procedure',
    note: 'Alternating upper/lower case — the mocking SpongeBob meme case',
    category: 'case-converter',
    familySlug: ['case-converter'],
    groupSlug: 'alternating',
    slug: 'case-alternating',
    platforms: ['all']
  },

  'tOGGLE cASE': {
    type: 'procedure',
    note: 'Inverts the case of every character',
    category: 'case-converter',
    familySlug: ['case-converter'],
    groupSlug: 'toggle',
    slug: 'case-toggle',
    platforms: ['all']
  },
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
window.PRINTABLE_PAGES = PRINTABLE_PAGES;
window.textStyles = textStyles;

window.StyleRegistry = {
  getAllStyles,
  getStyleBySlug,
  getFamilyByCategorySlug,
  getStylesByFamilySlug,
  getStylesByFamilyAndGroup
};
