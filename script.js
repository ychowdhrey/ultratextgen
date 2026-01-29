 <script>
    // ===================
    // DATA: Text Styles
    // ===================
    const textStyles = {
      'Ultra Bold': {
        upper: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭',
        lower: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
        nums: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
        category: 'bold',
        platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
      },
      'Ultra Bold Serif': {
        upper: '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙',
        lower: '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳',
        nums: '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗',
        category: 'bold',
        platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
      },
      'Ultra Bold Italic': {
        upper: '𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕',
        lower: '𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯',
        nums: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
        category: 'bold',
        platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
      },
      'Ultra Italic': {
        upper: '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡',
        lower: '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻',
        nums: '0123456789',
        category: 'fancy',
        platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
      },
      'Ultra Italic Serif': {
        upper: '𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍',
        lower: '𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧',
        nums: '0123456789',
        category: 'fancy',
        platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
      },
      'Ultra Script': {
        upper: '𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵',
        lower: '𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏',
        nums: '0123456789',
        category: 'cursive',
        platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
      },
      'Ultra Script Bold': {
        upper: '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩',
        lower: '𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃',
        nums: '0123456789',
        category: 'cursive',
        platforms: ['all', 'instagram', 'tiktok', 'x', 'discord']
      },
      'Ultra Gothic': {
        upper: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ',
        lower: '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷',
        nums: '0123456789',
        category: 'gothic',
        platforms: ['all', 'instagram', 'x', 'discord']
      },
      'Ultra Gothic Bold': {
        upper: '𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅',
        lower: '𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟',
        nums: '0123456789',
        category: 'gothic',
        platforms: ['all', 'instagram', 'x', 'discord']
      },
      'Ultra Bubble': {
        upper: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ',
        lower: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
        nums: '⓪①②③④⑤⑥⑦⑧⑨',
        category: 'bubble',
        platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
      },
      'Ultra Bubble Filled': {
        upper: '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩',
        lower: '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩',
        nums: '⓿❶❷❸❹❺❻❼❽❾',
        category: 'bubble',
        platforms: ['all', 'instagram', 'discord']
      },
      'Ultra Square': {
        upper: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉',
        lower: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉',
        nums: '0123456789',
        category: 'cool',
        platforms: ['all', 'instagram', 'discord']
      },
      'Ultra Square Filled': {
        upper: '🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉',
        lower: '🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉',
        nums: '0123456789',
        category: 'cool',
        platforms: ['all', 'instagram', 'discord']
      },
      'Ultra Mono': {
        upper: '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉',
        lower: '𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣',
        nums: '𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿',
        category: 'cool',
        platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
      },
      'Ultra Double': {
        upper: '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ',
        lower: '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫',
        nums: '𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡',
        category: 'cool',
        platforms: ['all', 'instagram', 'tiktok', 'x', 'discord']
      },
      'Ultra Wide': {
        upper: 'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ',
        lower: 'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ',
        nums: '０１２３４５６７８９',
        category: 'fancy',
        platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
      },
      'Ultra Small Caps': {
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lower: 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ',
        nums: '0123456789',
        category: 'fancy',
        platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
      },
      'Ultra Tiny': {
        upper: 'ᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾQᴿˢᵀᵁⱽᵂˣʸᶻ',
        lower: 'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖqʳˢᵗᵘᵛʷˣʸᶻ',
        nums: '⁰¹²³⁴⁵⁶⁷⁸⁹',
        category: 'special',
        platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
      },
      'Ultra Flip': {
        upper: '∀qƆpƎℲפHIſʞ˥WNOԀQɹS┴∩ΛMX⅄Z',
        lower: 'ɐqɔpǝɟƃɥıɾʞlɯuodbɹsʇnʌʍxʎz',
        nums: '0ƖᄅƐㄣϛ9ㄥ86',
        category: 'special',
        platforms: ['all', 'instagram', 'tiktok', 'x', 'discord']
      },
      'Ultra Strike': {
        decorator: (text) => [...text].map(c => c + '\u0336').join(''),
        category: 'special',
        platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
      },
      'Ultra Underline': {
        decorator: (text) => [...text].map(c => c + '\u0332').join(''),
        category: 'special',
        platforms: ['all', 'instagram', 'tiktok', 'x', 'whatsapp', 'discord']
      },
      'Ultra Wavy': {
        decorator: (text) => [...text].map((c, i) => c + (i % 2 === 0 ? '\u0303' : '')).join(''),
        category: 'special',
        platforms: ['all', 'instagram', 'tiktok', 'x', 'discord']
      },
      'Ultra Slash': {
        decorator: (text) => [...text].map(c => c + '\u0338').join(''),
        category: 'special',
        platforms: ['all', 'x', 'discord']
      }
    };

    // ===================
    // DATA: Decorations
    // ===================
    const decorations = {
      symbols: [
        { text: '✦ text ✦', prefix: '✦ ', suffix: ' ✦' },
        { text: '★ text ★', prefix: '★ ', suffix: ' ★' },
        { text: '◆ text ◆', prefix: '◆ ', suffix: ' ◆' },
        { text: '● text ●', prefix: '● ', suffix: ' ●' },
        { text: '♠ text ♠', prefix: '♠ ', suffix: ' ♠' },
        { text: '♦ text ♦', prefix: '♦ ', suffix: ' ♦' },
        { text: '→ text ←', prefix: '→ ', suffix: ' ←' },
        { text: '⚡ text ⚡', prefix: '⚡ ', suffix: ' ⚡' },
        { text: '✿ text ✿', prefix: '✿ ', suffix: ' ✿' },
        { text: '☾ text ☽', prefix: '☾ ', suffix: ' ☽' },
        { text: '「 text 」', prefix: '「 ', suffix: ' 」' },
        { text: '【 text 】', prefix: '【 ', suffix: ' 】' },
        { text: '『 text 』', prefix: '『 ', suffix: ' 』' },
        { text: '〖 text 〗', prefix: '〖 ', suffix: ' 〗' }
      ],
      emojis: [
        { text: '✨ text ✨', prefix: '✨ ', suffix: ' ✨' },
        { text: '🔥 text 🔥', prefix: '🔥 ', suffix: ' 🔥' },
        { text: '💫 text 💫', prefix: '💫 ', suffix: ' 💫' },
        { text: '⭐ text ⭐', prefix: '⭐ ', suffix: ' ⭐' },
        { text: '💖 text 💖', prefix: '💖 ', suffix: ' 💖' },
        { text: '🌟 text 🌟', prefix: '🌟 ', suffix: ' 🌟' },
        { text: '🦋 text 🦋', prefix: '🦋 ', suffix: ' 🦋' },
        { text: '🌸 text 🌸', prefix: '🌸 ', suffix: ' 🌸' },
        { text: '💎 text 💎', prefix: '💎 ', suffix: ' 💎' },
        { text: '🎀 text 🎀', prefix: '🎀 ', suffix: ' 🎀' },
        { text: '🌈 text 🌈', prefix: '🌈 ', suffix: ' 🌈' },
        { text: '👑 text 👑', prefix: '👑 ', suffix: ' 👑' }
      ],
      dividers: [
        { text: '═══ text ═══', prefix: '═══ ', suffix: ' ═══' },
        { text: '━━━ text ━━━', prefix: '━━━ ', suffix: ' ━━━' },
        { text: '─── text ───', prefix: '─── ', suffix: ' ───' },
        { text: '••• text •••', prefix: '••• ', suffix: ' •••' },
        { text: '┊ text ┊', prefix: '┊ ', suffix: ' ┊' },
        { text: '╔ text ╗', prefix: '╔ ', suffix: ' ╗' },
        { text: '▸ text ◂', prefix: '▸ ', suffix: ' ◂' },
        { text: '◈ text ◈', prefix: '◈ ', suffix: ' ◈' }
      ]
    };

    // ===================
    // STATE
    // ===================
    let currentPlatform = 'all';
    let currentCategory = 'all';
    let currentDecoTab = 'symbols';
    let selectedDecoration = null;
    let searchQuery = '';

    const normalUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const normalLower = 'abcdefghijklmnopqrstuvwxyz';
    const normalNums = '0123456789';

    // ===================
    // FUNCTIONS
    // ===================
    function convertText(text, style) {
      if (style.decorator) {
        return style.decorator(text);
      }
      
      const upperArr = [...style.upper];
      const lowerArr = [...style.lower];
      const numsArr = [...style.nums];
      
      return [...text].map(char => {
        const upperIdx = normalUpper.indexOf(char);
        if (upperIdx !== -1) return upperArr[upperIdx] || char;
        
        const lowerIdx = normalLower.indexOf(char);
        if (lowerIdx !== -1) return lowerArr[lowerIdx] || char;
        
        const numIdx = normalNums.indexOf(char);
        if (numIdx !== -1) return numsArr[numIdx] || char;
        
        return char;
      }).join('');
    }

    function applyDecoration(text) {
      if (!selectedDecoration || !text) return text;
      return selectedDecoration.prefix + text + selectedDecoration.suffix;
    }

    function createStyleCard(name, convertedText, decoratedText, isSponsored = false) {
      const card = document.createElement('div');
      card.className = 'style-card' + (isSponsored ? ' sponsored-card' : '');
      
      const fullText = decoratedText || convertedText;
      const safeText = fullText.replace(/"/g, '&quot;');
      
      let decoHtml = '';
      if (selectedDecoration && convertedText) {
        decoHtml = `<div class="style-decoration">${decoratedText}</div>`;
      }
      
      card.innerHTML = `
        <div class="style-info">
          <p class="style-name">
            ${name}
            ${isSponsored ? '<span class="sponsored-label">Sponsored</span>' : ''}
          </p>
          <p class="style-preview ${!convertedText ? 'placeholder' : ''}">${convertedText || 'Type something above...'}</p>
          ${decoHtml}
        </div>
        <button class="copy-btn" data-text="${safeText}" ${!fullText ? 'disabled' : ''}>Copy</button>
      `;
      
      return card;
    }

    function renderDecorations() {
      const grid = document.getElementById('decorationGrid');
      grid.innerHTML = '';
      
      // Clear button
      const clearBtn = document.createElement('span');
      clearBtn.className = 'clear-decoration';
      clearBtn.textContent = '✕ None';
      clearBtn.addEventListener('click', () => {
        selectedDecoration = null;
        document.querySelectorAll('.decoration-item').forEach(i => i.classList.remove('selected'));
        renderResults();
      });
      grid.appendChild(clearBtn);
      
      // Decoration items
      decorations[currentDecoTab].forEach(deco => {
        const item = document.createElement('span');
        item.className = 'decoration-item';
        if (selectedDecoration && selectedDecoration.text === deco.text) {
          item.classList.add('selected');
        }
        item.textContent = deco.text;
        item.addEventListener('click', () => {
          if (selectedDecoration && selectedDecoration.text === deco.text) {
            selectedDecoration = null;
            item.classList.remove('selected');
          } else {
            selectedDecoration = deco;
            document.querySelectorAll('.decoration-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
          }
          renderResults();
        });
        grid.appendChild(item);
      });
    }

    function renderResults() {
      const grid = document.getElementById('resultsGrid');
      const inputText = document.getElementById('mainInput').value;
      const compatNotice = document.getElementById('compatNotice');
      const compatText = document.getElementById('compatText');
      
      grid.innerHTML = '';
      
      // Show/hide compatibility notice
      if (currentPlatform !== 'all') {
        compatNotice.style.display = 'flex';
        const platformNames = {
          instagram: 'Instagram',
          tiktok: 'TikTok',
          x: 'X (Twitter)',
          whatsapp: 'WhatsApp',
          discord: 'Discord'
        };
        compatText.textContent = `Showing styles optimized for ${platformNames[currentPlatform]}`;
      } else {
        compatNotice.style.display = 'none';
      }
      
      // Filter styles
      const filteredStyles = Object.entries(textStyles).filter(([name, style]) => {
        // Platform filter
        if (!style.platforms.includes(currentPlatform)) return false;
        
        // Category filter
        if (currentCategory !== 'all' && style.category !== currentCategory) return false;
        
        // Search filter
        if (searchQuery && !name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        
        return true;
      });
      
      // Render styles with ads
      let count = 0;
      filteredStyles.forEach(([name, style]) => {
        const converted = inputText ? convertText(inputText, style) : '';
        const decorated = inputText ? applyDecoration(converted) : '';
        
        grid.appendChild(createStyleCard(name, converted, selectedDecoration ? decorated : null));
        count++;
        
        // Insert ad every 8 styles
        if (count % 8 === 0) {
          const adCard = document.createElement('div');
          adCard.className = 'style-card sponsored-card';
          adCard.innerHTML = `
            <div class="style-info">
              <p class="style-name"><span class="sponsored-label">Sponsored</span></p>
              <p class="style-preview placeholder">Ad content here</p>
            </div>
          `;
          grid.appendChild(adCard);
        }
      });
      
      // No results message
      if (filteredStyles.length === 0) {
        grid.innerHTML = `
          <div class="style-card">
            <div class="style-info">
              <p class="style-preview placeholder">No styles found. Try a different filter or search term.</p>
            </div>
          </div>
        `;
      }
    }

    // ===================
    // EVENT LISTENERS
    // ===================
    
    // Main input
    const mainInput = document.getElementById('mainInput');
    const charCount = document.getElementById('charCount');
    
    mainInput.addEventListener('input', () => {
      charCount.textContent = mainInput.value.length;
      renderResults();
    });
    
    // Search input
    document.getElementById('searchInput').addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderResults();
    });
    
    // Platform pills
    document.querySelectorAll('.platform-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.platform-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentPlatform = pill.dataset.platform;
        renderResults();
      });
    });
    
    // Category tabs
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = tab.dataset.category;
        renderResults();
      });
    });
    
    // Decoration tabs
    document.querySelectorAll('.decoration-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.decoration-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentDecoTab = tab.dataset.decoTab;
        renderDecorations();
      });
    });
    
    // Dark mode
    document.getElementById('darkModeBtn').addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
    });
    
    // FAQ accordion
    document.querySelectorAll('.faq-question').forEach(q => {
      q.addEventListener('click', () => {
        q.parentElement.classList.toggle('open');
      });
    });
    
    // Copy buttons (event delegation)
    document.addEventListener('click', async (e) => {
      if (e.target.classList.contains('copy-btn') && !e.target.disabled) {
        const text = e.target.dataset.text;
        try {
          await navigator.clipboard.writeText(text);
          e.target.textContent = '✓ Copied';
          e.target.classList.add('copied');
          setTimeout(() => {
            e.target.textContent = 'Copy';
            e.target.classList.remove('copied');
          }, 1500);
        } catch (err) {
          console.error('Copy failed:', err);
        }
      }
    });
    
    // ===================
    // INITIALIZE
    // ===================
    renderDecorations();
    renderResults();
  </script>
