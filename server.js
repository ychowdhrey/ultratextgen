/* ==========================================================================
   UltraTextGen — server.js
   Backend API server for dynamic font category loading
   ========================================================================== */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

/* ==========================================================================
   FONT DATA GROUPED BY CATEGORIES
   ========================================================================== */
const fontsByCategory = {
  'popular': [
    {
      name: 'Ultra Bold',
      upper: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭',
      lower: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
      nums: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
      type: 'map',
      category: 'bold'
    },
    {
      name: 'Ultra Script',
      upper: '𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵',
      lower: '𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏',
      nums: '0123456789',
      type: 'map',
      category: 'cursive'
    },
    {
      name: 'Ultra Bubble',
      upper: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ',
      lower: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
      nums: '⓪①②③④⑤⑥⑦⑧⑨',
      type: 'map',
      category: 'bubble'
    },
    {
      name: 'Ultra Gothic',
      upper: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ',
      lower: '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷',
      nums: '0123456789',
      type: 'map',
      category: 'gothic'
    },
    {
      name: 'Ultra Strike',
      type: 'decorator',
      decoratorId: 'strike',
      category: 'special'
    },
    {
      name: 'Ultra Bold Italic',
      upper: '𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕',
      lower: '𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯',
      nums: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
      type: 'map',
      category: 'bold'
    }
  ],
  'bold-fonts': [
    {
      name: 'Ultra Bold',
      upper: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭',
      lower: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
      nums: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
      type: 'map',
      category: 'bold'
    },
    {
      name: 'Ultra Bold Serif',
      upper: '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙',
      lower: '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳',
      nums: '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗',
      type: 'map',
      category: 'bold'
    },
    {
      name: 'Ultra Bold Italic',
      upper: '𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕',
      lower: '𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯',
      nums: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
      type: 'map',
      category: 'bold'
    },
    {
      name: 'Ultra Bold Italic Serif',
      upper: '𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁',
      lower: '𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛',
      nums: '0123456789',
      type: 'map',
      category: 'bold'
    },
    {
      name: 'Ultra Alternating Bold',
      type: 'procedure',
      procedureId: 'alternating-bold',
      category: 'bold'
    }
  ],
  'bubble-fonts': [
    {
      name: 'Ultra Bubble',
      upper: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ',
      lower: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
      nums: '⓪①②③④⑤⑥⑦⑧⑨',
      type: 'map',
      category: 'bubble'
    },
    {
      name: 'Ultra Bubble Filled',
      upper: '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩',
      lower: '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩',
      nums: '⓿❶❷❸❹❺❻❼❽❾',
      type: 'map',
      category: 'bubble'
    }
  ],
  'cursive-fonts': [
    {
      name: 'Ultra Script',
      upper: '𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵',
      lower: '𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏',
      nums: '0123456789',
      type: 'map',
      category: 'cursive'
    },
    {
      name: 'Ultra Script Bold',
      upper: '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩',
      lower: '𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃',
      nums: '0123456789',
      type: 'map',
      category: 'cursive'
    }
  ],
  'gothic-fonts': [
    {
      name: 'Ultra Gothic',
      upper: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ',
      lower: '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷',
      nums: '0123456789',
      type: 'map',
      category: 'gothic'
    },
    {
      name: 'Ultra Gothic Bold',
      upper: '𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅',
      lower: '𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟',
      nums: '0123456789',
      type: 'map',
      category: 'gothic'
    }
  ],
  'special-fonts': [
    {
      name: 'Ultra Strike',
      type: 'decorator',
      decoratorId: 'strike',
      category: 'special'
    },
    {
      name: 'Ultra Underline',
      type: 'decorator',
      decoratorId: 'underline',
      category: 'special'
    },
    {
      name: 'Ultra Wavy',
      type: 'decorator',
      decoratorId: 'wavy',
      category: 'special'
    },
    {
      name: 'Ultra Slash',
      type: 'decorator',
      decoratorId: 'slash',
      category: 'special'
    }
  ]
};

/* ==========================================================================
   API ROUTES
   ========================================================================== */

// Get fonts by category
app.get('/api/fonts/:category', (req, res) => {
  const category = req.params.category.toLowerCase();
  
  // Sanitize category parameter (allow only alphanumeric and hyphens)
  const sanitizedCategory = category.replace(/[^a-z0-9-]/g, '');
  
  // Check if category exists
  if (!fontsByCategory[sanitizedCategory]) {
    return res.status(404).json({
      success: false,
      error: 'Category not found',
      message: `The category does not exist. Valid categories are: ${Object.keys(fontsByCategory).join(', ')}`
    });
  }
  
  // Return fonts for the category
  res.json({
    success: true,
    category: sanitizedCategory,
    fonts: fontsByCategory[sanitizedCategory]
  });
});

// Get all available categories
app.get('/api/categories', (req, res) => {
  res.json({
    success: true,
    categories: Object.keys(fontsByCategory)
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'Server is running'
  });
});

/* ==========================================================================
   ERROR HANDLING
   ========================================================================== */
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found'
    });
  } else {
    res.status(404).send('Page not found');
  }
});

/* ==========================================================================
   START SERVER
   ========================================================================== */
app.listen(PORT, () => {
  console.log(`UltraTextGen server is running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api/fonts/:category`);
});
