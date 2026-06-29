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
   'word-wrappers': {
    slug: 'word-wrappers',
    title: 'Word Wrappers',
    description: 'Automatically wrap words in decorative wrappers and separators.'
  },
  'small-text': {
    slug: 'small-text',
    title: 'Small Text',
    description: 'Small and tiny Unicode text styles for names and bios.'
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
    lower: '𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟',
    nums: '0123456789',
    type: 'map',
    category: 'gothic',
    // Cross-listed onto the bold page: it is a bold-weight blackletter.
    familySlug: ['gothic', 'bold'],
    groupSlug: 'fraktur',
    slug: 'ultra-gothic-bold',
    platforms: ['all', 'instagram', 'x', 'discord']
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
  nums: '⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽',
  type: 'map',
  category: 'bubble',
  familySlug: 'bubble',
  groupSlug: 'light',
  slug: 'ultra-bubble-light',
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
   
  'Ultra Wavy': {
    type: 'decorator',
    decoratorId: 'wavy',
     category: 'underline',
     familySlug: 'underline-text', // temporary home
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
  category: 'word-wrappers',
  familySlug: 'word-wrappers',
  groupSlug: 'wrap',
  slug: 'ultra_word_curly_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Angle Wrap': {
  type: 'procedure',
  category: 'word-wrappers',
  familySlug: 'word-wrappers',
  groupSlug: 'wrap',
  slug: 'ultra_word_angle_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Double Wrap': {
  type: 'procedure',
  category: 'word-wrappers',
  familySlug: 'word-wrappers',
  groupSlug: 'wrap',
  slug: 'ultra_word_double_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Arrow Wrap': {
  type: 'procedure',
  category: 'word-wrappers',
  familySlug: 'word-wrappers',
  groupSlug: 'arrows',
  slug: 'ultra_word_arrow_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Forward Arrow Wrap': {
  type: 'procedure',
  category: 'word-wrappers',
  familySlug: 'word-wrappers',
  groupSlug: 'arrows',
  slug: 'ultra_word_forward_arrow_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Backward Arrow Wrap': {
  type: 'procedure',
  category: 'word-wrappers',
  familySlug: 'word-wrappers',
  groupSlug: 'arrows',
  slug: 'ultra_word_backward_arrow_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Bracket Wrap': {
  type: 'procedure',
  category: 'word-wrappers',
  familySlug: 'word-wrappers',
  groupSlug: 'frames',
  slug: 'ultra_word_bracket_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Chevron Wrap': {
  type: 'procedure',
  category: 'word-wrappers',
  familySlug: 'word-wrappers',
  groupSlug: 'frames',
  slug: 'ultra_word_chevron_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Bar Wrap': {
  type: 'procedure',
  category: 'word-wrappers',
  familySlug: 'word-wrappers',
  groupSlug: 'bars',
  slug: 'ultra_word_bar_wrap',
  platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
},

'Ultra Word Double Bar Wrap': {
  type: 'procedure',
  category: 'word-wrappers',
  familySlug: 'word-wrappers',
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
  familySlug: ['small-text', 'aesthetic-fonts'],
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
  familySlug: ['small-text'],
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
  familySlug: ['small-text', 'aesthetic-fonts'],
  groupSlug: 'small-caps',
  slug: 'ultra-small-caps',
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
================================ */

'Ultra Classified Blocks': {
  pattern: '███ ███████ ████',
  type: 'pattern',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-classified-blocks'
},

'Ultra Black Squares': {
  pattern: '⬛⬛⬛',
  type: 'pattern',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-black-squares'
},

'Ultra White Squares': {
  pattern: '⬜⬜⬜',
  type: 'pattern',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-white-squares'
},

'Ultra Solid Squares': {
  pattern: '■■■■',
  type: 'pattern',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-solid-squares'
},

'Ultra Spaced Blocks': {
  pattern: '█ █ █ █ █ █',
  type: 'pattern',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-spaced-blocks'
},

'Ultra Medium Shade': {
  pattern: '▓▓▓',
  type: 'pattern',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-medium-shade'
},

'Ultra Light Shade': {
  pattern: '▒▒▒',
  type: 'pattern',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-light-shade'
},

'Ultra Top Blocks': {
  pattern: '▀▀▀',
  type: 'pattern',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-top-blocks'
},

'Ultra Bottom Blocks': {
  pattern: '▄▄▄',
  type: 'pattern',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-bottom-blocks'
},

'Ultra Alternating Squares': {
  pattern: '■ □ ■ □ ■',
  type: 'pattern',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-alternating-squares'
},

'Ultra Wave Blocks': {
  pattern: '▀▄▀▄▀▄',
  type: 'pattern',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-wave-blocks'
},

'Ultra Split Blocks': {
  pattern: '▄▄▀▀▄▄',
  type: 'pattern',
  category: 'classified',
  familySlug: ['classified'],
  groupSlug: 'classified',
  slug: 'ultra-split-blocks'
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
window.textStyles = textStyles;

window.StyleRegistry = {
  getAllStyles,
  getStyleBySlug,
  getFamilyByCategorySlug,
  getStylesByFamilySlug,
  getStylesByFamilyAndGroup
};
