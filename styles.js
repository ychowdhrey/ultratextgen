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
    slug: 'bold-fonts',
    title: 'Bold & Italic Fonts',
    description: 'Bold and italic Unicode fonts you can copy and paste.'
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
  'bubble': {
    slug: 'bubble-fonts',
    title: 'Bubble Fonts',
    description: 'Fun bubble and circle Unicode fonts.'
  },
  'special': {
    slug: 'special-fonts',
    title: 'Special Fonts',
    description: 'Unique decorative Unicode fonts.'
  },
  'upside-down-text': {
    slug: 'upside-down-text',
    title: 'Upside Down Text',
    description: 'Flip your text upside down with multiple Unicode styles.'
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

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Ultra Bold Text Generator',
      description: 'Convert text to bold Unicode font. Works on Instagram, TikTok, X, WhatsApp, Discord.',
      keywords: ['bold text', 'bold font generator', 'instagram bold', 'copy paste bold']
    }
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

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Ultra Bold Serif Text Generator',
      description: 'Convert text to bold serif Unicode font. Copy and paste for Instagram, TikTok, X, WhatsApp, Discord.',
      keywords: ['bold serif', 'bold serif font', 'bold serif unicode', 'instagram bold serif']
    }
  },

  'Ultra Italic': {
    upper: '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡',
    lower: '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻',
    nums: '0123456789',
   type: 'map',
    category: 'fancy',

    familySlug: 'bold-italic',
    groupSlug: 'italic',
    slug: 'ultra-italic',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Ultra Italic Text Generator',
      description: 'Convert text to italic Unicode font. Works across Instagram, TikTok, X, WhatsApp, Discord.',
      keywords: ['italic text', 'italic font generator', 'instagram italic', 'copy paste italic']
    }
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

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Ultra Italic Serif Text Generator',
      description: 'Convert text to italic serif Unicode font. Copy and paste for social bios, posts, and usernames.',
      keywords: ['italic serif', 'italic serif font', 'unicode italic serif', 'instagram italic serif']
    }
  },

  'Ultra Bold Italic': {
    upper: '𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕',
    lower: '𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯',
    nums: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
   type: 'map',
    category: 'bold',

    familySlug: 'bold-italic',
    groupSlug: 'bold-italic',
    slug: 'ultra-bold-italic',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Ultra Bold Italic Text Generator',
      description: 'Convert text to bold italic Unicode font. Great for emphasis in bios, posts, and usernames.',
      keywords: ['bold italic', 'bold italic font', 'unicode bold italic', 'instagram bold italic']
    }
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

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Ultra Bold Italic Serif Text Generator',
      description: 'Convert text to bold italic serif Unicode font. Copy and paste anywhere.',
      keywords: ['bold italic serif', 'unicode bold italic serif', 'bold italic serif font']
    }
  },

  'Ultra Alternating Bold': {
    type: 'procedure',
    procedureId: 'alternating-bold',
    category: 'bold',

    familySlug: 'bold-italic',
    groupSlug: 'alternating',
    slug: 'ultra-alternating-bold',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Alternating Bold Text Generator',
      description: 'Alternating bold text style for usernames and bios. Copy and paste instantly.',
      keywords: ['alternating bold', 'bold alternating text', 'instagram alternating bold']
    }
  },

  'Ultra Alternating Italic': {
    type: 'procedure',
    procedureId: 'alternating-italic',
    category: 'fancy',

    familySlug: 'bold-italic',
    groupSlug: 'alternating',
    slug: 'ultra-alternating-italic',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Alternating Italic Text Generator',
      description: 'Alternating italic text style you can copy and paste anywhere.',
      keywords: ['alternating italic', 'italic alternating text', 'instagram alternating italic']
    }
  },

  'Ultra Bold w Alternating Italic': {
    type: 'procedure',
    procedureId: 'bold-alternating-italic',
    category: 'bold',

    familySlug: 'bold-italic',
    groupSlug: 'alternating',
    slug: 'ultra-bold-alternating-italic',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Bold Alternating Italic Text Generator',
      description: 'Alternate between bold and italic characters. Perfect for emphasis and style.',
      keywords: ['bold alternating italic', 'alternate bold italic', 'unicode bold italic alternating']
    }
  },

  'Ultra Italic Switch Serifs': {
    type: 'procedure',
    procedureId: 'italic-switch-serifs',
    category: 'fancy',

    familySlug: 'bold-italic',
    groupSlug: 'alternating',
    slug: 'ultra-italic-switch-serifs',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Italic Switch Serifs Text Generator',
      description: 'Switch between italic serif and italic sans characters for a mixed style look.',
      keywords: ['italic switch serifs', 'mixed italic serif sans', 'unicode switch serif italic']
    }
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

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Ultra Script Text Generator',
      description: 'Convert text to elegant cursive script Unicode. Copy and paste anywhere.',
      keywords: ['cursive text', 'script font generator', 'unicode script', 'instagram cursive']
    }
  },

  'Ultra Script Bold': {
    upper: '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩',
    lower: '𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃',
    nums: '0123456789',
    type: 'map',
    category: 'cursive',

    familySlug: 'cursive',
    groupSlug: 'script',
    slug: 'ultra-script-bold',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'discord'],

    meta: {
      title: 'Ultra Bold Script Text Generator',
      description: 'Convert text to bold cursive script Unicode. Great for bios and titles.',
      keywords: ['bold cursive', 'bold script', 'unicode bold script', 'instagram bold cursive']
    }
  },

  /* =========================
     GOTHIC
     ========================= */
  'Ultra Gothic': {
    upper: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ',
    lower: '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷',
    nums: '0123456789',
     type: 'map',
    category: 'gothic',

    familySlug: 'gothic',
    groupSlug: 'fraktur',
    slug: 'ultra-gothic',

    platforms: ['all', 'instagram', 'x', 'discord'],

    meta: {
      title: 'Ultra Gothic Text Generator',
      description: 'Convert text to gothic fraktur Unicode font. Copy and paste instantly.',
      keywords: ['gothic text', 'fraktur font', 'old english font', 'unicode gothic']
    }
  },

  'Ultra Gothic Bold': {
    upper: '𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅',
    lower: '𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟',
    nums: '0123456789',
     type: 'map',
    category: 'gothic',

    familySlug: 'gothic',
    groupSlug: 'fraktur',
    slug: 'ultra-gothic-bold',

    platforms: ['all', 'instagram', 'x', 'discord'],

    meta: {
      title: 'Ultra Bold Gothic Text Generator',
      description: 'Convert text to bold gothic fraktur Unicode font. Copy and paste anywhere.',
      keywords: ['bold gothic', 'bold fraktur', 'old english bold', 'unicode bold gothic']
    }
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

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Ultra Bubble Text Generator',
      description: 'Convert text to bubble Unicode letters. Great for cute bios and usernames.',
      keywords: ['bubble text', 'circle letters', 'bubble font generator', 'unicode bubble']
    }
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

    platforms: ['all', 'instagram', 'discord'],

    meta: {
      title: 'Ultra Black Bubble Text Generator',
      description: 'Convert text to black bubble Unicode letters. Copy and paste instantly.',
      keywords: ['black bubble text', 'filled bubble font', 'unicode black bubble', 'instagram bubble text']
    }
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

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Strikethrough Text Generator',
      description: 'Add strikethrough to text using Unicode. Copy and paste anywhere.',
      keywords: ['strikethrough text', 'strikeout generator', 'unicode strikethrough']
    }
  },

  'Ultra Underline': {
    type: 'decorator',
    decoratorId: 'underline',
    category: 'special',

    familySlug: 'special',
    groupSlug: 'lines',
    slug: 'ultra-underline',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Underline Text Generator',
      description: 'Underline text using Unicode combining characters. Copy and paste instantly.',
      keywords: ['underline text', 'unicode underline', 'underline generator']
    }
  },

  'Ultra Wavy': {
    type: 'decorator',
    decoratorId: 'wavy',
    category: 'special',

    familySlug: 'special',
    groupSlug: 'effects',
    slug: 'ultra-wavy',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'discord'],

    meta: {
      title: 'Wavy Text Generator',
      description: 'Add a subtle wavy effect to text using Unicode. Copy and paste anywhere.',
      keywords: ['wavy text', 'unicode wavy', 'text effect generator']
    }
  },

  'Ultra Slash': {
    type: 'decorator',
    decoratorId: 'slash',
    category: 'special',

    familySlug: 'special',
    groupSlug: 'lines',
    slug: 'ultra-slash',

    platforms: ['all', 'x', 'discord'],

    meta: {
      title: 'Slashthrough Text Generator',
      description: 'Add a slash through your text using Unicode. Copy and paste instantly.',
      keywords: ['slashthrough text', 'unicode slash', 'text slash generator']
    }
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

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Fully Flipped Unicode Text Generator',
      description: 'Flip your text completely upside down using Unicode. Copy and paste instantly.',
      keywords: ['upside down text', 'flipped text', 'unicode upside down']
    }
  },

  'Mixed Flip Fallback': {
    type: 'function',
    transform: 'mixedFlipFallback',
    familySlug: 'upside-down-text',
    category: 'special',
    slug: 'upside-down-mixed-fallback',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Mixed Flip Fallback Text Generator',
      description: 'Flip text upside down with fallback for unsupported characters. Works everywhere.',
      keywords: ['upside down text fallback', 'mixed flip text', 'unicode flip fallback']
    }
  },

  'Reverse Order Only': {
    type: 'function',
    transform: 'reverseOnly',
    familySlug: 'upside-down-text',
    category: 'cool',
    slug: 'upside-down-reverse-only',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Reverse Order Text Generator',
      description: 'Reverse your text order. Copy and paste instantly.',
      keywords: ['reverse text', 'backwards text', 'text reverser']
    }
  },

  'Reverse + Flip Combo': {
    type: 'function',
    transform: 'reverseFlipCombo',
    familySlug: 'upside-down-text',
    category: 'cool',
    slug: 'upside-down-reverse-flip',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Reverse Flip Combo Text Generator',
      description: 'Reverse and flip text upside down. Perfect for social media.',
      keywords: ['reverse flip text', 'upside down reversed', 'flip and reverse']
    }
  },

  'Partial Upside Emphasis': {
    type: 'function',
    transform: 'partialEmphasis',
    familySlug: 'upside-down-text',
    category: 'fancy',
    slug: 'upside-down-partial-emphasis',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Partial Upside Emphasis Text Generator',
      description: 'Emphasize parts of text by flipping upside down. Copy and paste.',
      keywords: ['partial upside down', 'emphasis flip text', 'selective flip']
    }
  },

  'Line Level Upside Down': {
    type: 'function',
    transform: 'lineLevel',
    familySlug: 'upside-down-text',
    category: 'special',
    slug: 'upside-down-line-level',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Line Level Upside Down Text Generator',
      description: 'Flip each line of text upside down. Great for multiline posts.',
      keywords: ['line level upside down', 'multiline flip', 'flip lines']
    }
  },

  'Alternating Upside Down': {
    type: 'function',
    transform: 'alternating',
    familySlug: 'upside-down-text',
    category: 'cool',
    slug: 'upside-down-alternating',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Alternating Upside Down Text Generator',
      description: 'Alternate words between normal and upside down. Unique style.',
      keywords: ['alternating upside down', 'alternating flip', 'word alternating']
    }
  },

  'Mirror Illusion': {
    type: 'function',
    transform: 'mirrorIllusion',
    familySlug: 'upside-down-text',
    category: 'special',
    slug: 'upside-down-mirror-illusion',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Mirror Illusion Text Generator',
      description: 'Create a mirror illusion effect with flipped text. Copy and paste.',
      keywords: ['mirror illusion text', 'mirror flip', 'illusion text']
    }
  },

  'Emoji Assisted Upside Down': {
    type: 'function',
    transform: 'emojiAssisted',
    familySlug: 'upside-down-text',
    category: 'cool',
    slug: 'upside-down-emoji-assisted',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Emoji Assisted Upside Down Text Generator',
      description: 'Add upside down face emoji to your text. Fun and eye-catching.',
      keywords: ['emoji upside down', 'upside down emoji text', 'emoji flip']
    }
  },

  'Faux Upside Down Symbols': {
    type: 'function',
    transform: 'fauxSymbols',
    familySlug: 'upside-down-text',
    category: 'fancy',
    slug: 'upside-down-faux-symbols',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Faux Upside Down Symbols Text Generator',
      description: 'Wrap text with upside down rotation symbols. Unique decoration.',
      keywords: ['faux upside down', 'symbol wrap', 'rotation symbols']
    }
  },

  'Upside Down Micro Text': {
    type: 'function',
    transform: 'microText',
    familySlug: 'upside-down-text',
    category: 'special',
    slug: 'upside-down-micro',

    platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord'],

    meta: {
      title: 'Upside Down Micro Text Generator',
      description: 'Create compact flipped text. Perfect for space-constrained posts.',
      keywords: ['upside down micro', 'micro flip text', 'compact upside down']
    }
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
