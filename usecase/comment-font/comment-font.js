(() => {
  "use strict";

  const COPY_COUNT_STORAGE_KEY = "utg-comment-template-copy-counts";
  const QUICK_PICK_VISIBLE_COUNT = 6;
  const PLAIN_STYLE_ID = "__plain__";
  const INPUT_HISTORY_DEBOUNCE_MS = 250;
  const PLAIN_STYLE_OPTION = {
    id: PLAIN_STYLE_ID,
    label: "Plain / None",
    description: "Show the original text with no font styling.",
    mood: "all"
  };
  const Render = window.UltraTextGenRender;
  const hasRenderer = Boolean(Render && typeof Render.renderAny === "function");
  const styleRegistry = Object.values(window.textStyles || {}).reduce((acc, style) => {
    if (style && style.slug) acc[style.slug] = style;
    return acc;
  }, {});

  if (!hasRenderer) {
    console.error("Comment style page could not find UltraTextGenRender.renderAny.");
  }

  const MONOSPACE_STYLE = {
    upper: "𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉",
    lower: "𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣",
    nums: "𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿",
    type: "map",
    slug: "ultra-local-monospace"
  };

  const platformLabels = {
    instagram: "Instagram",
    youtube: "YouTube",
    facebook: "Facebook"
  };

  const templateBank = [
    { id: "ig-love-01", platform: "instagram", category: "Love & Appreciation", text: "okay this made my whole day 🥺", keyPhrase: "made my whole day", style: "script", copyCount: 0 },
    { id: "ig-love-02", platform: "instagram", category: "Love & Appreciation", text: "saving this — means more than you know 💛", keyPhrase: "means more than you know", style: "script", copyCount: 0 },
    { id: "ig-love-03", platform: "instagram", category: "Love & Appreciation", text: "the way this hit me right in the heart 😭", keyPhrase: "hit me right in the heart", style: "script", copyCount: 0 },
    { id: "ig-love-04", platform: "instagram", category: "Love & Appreciation", text: "came back just to say this is so special ✨", keyPhrase: "this is so special", style: "script", copyCount: 0 },
    { id: "ig-love-05", platform: "instagram", category: "Love & Appreciation", text: "obsessed with every single bit of this ❤️", keyPhrase: "every single bit", style: "script", copyCount: 0 },
    { id: "ig-love-06", platform: "instagram", category: "Love & Appreciation", text: "needed this today, thank you for sharing 🌷", keyPhrase: "thank you for sharing", style: "script", copyCount: 0 },

    { id: "ig-hype-01", platform: "instagram", category: "Hype & Congrats", text: "YOU DID THAT 👏", keyPhrase: "YOU DID THAT", style: "bold", copyCount: 0 },
    { id: "ig-hype-02", platform: "instagram", category: "Hype & Congrats", text: "absolute legend behaviour right here 🔥", keyPhrase: "legend", style: "bold", copyCount: 0 },
    { id: "ig-hype-03", platform: "instagram", category: "Hype & Congrats", text: "been waiting for this — so proud of you 🚀", keyPhrase: "so proud of you", style: "bold", copyCount: 0 },
    { id: "ig-hype-04", platform: "instagram", category: "Hype & Congrats", text: "this is huge, congratulations 🎉", keyPhrase: "huge", style: "bold", copyCount: 0 },
    { id: "ig-hype-05", platform: "instagram", category: "Hype & Congrats", text: "you earned every bit of this 🏆", keyPhrase: "earned every bit", style: "bold", copyCount: 0 },
    { id: "ig-hype-06", platform: "instagram", category: "Hype & Congrats", text: "knew you'd pull this off 💫", keyPhrase: "pull this off", style: "bold", copyCount: 0 },

    { id: "ig-compliments-01", platform: "instagram", category: "Compliments (looks / style)", text: "excuse me, who gave you the right 😍", keyPhrase: "who gave you the right", style: "bolditalic", copyCount: 0 },
    { id: "ig-compliments-02", platform: "instagram", category: "Compliments (looks / style)", text: "this is all you, no filter needed ✨", keyPhrase: "all you", style: "bolditalic", copyCount: 0 },
    { id: "ig-compliments-03", platform: "instagram", category: "Compliments (looks / style)", text: "straight to the saved folder 💅", keyPhrase: "saved folder", style: "bolditalic", copyCount: 0 },
    { id: "ig-compliments-04", platform: "instagram", category: "Compliments (looks / style)", text: "the glow is unreal 🌟", keyPhrase: "unreal", style: "bolditalic", copyCount: 0 },
    { id: "ig-compliments-05", platform: "instagram", category: "Compliments (looks / style)", text: "stop being this photogenic 😭", keyPhrase: "this photogenic", style: "bolditalic", copyCount: 0 },
    { id: "ig-compliments-06", platform: "instagram", category: "Compliments (looks / style)", text: "you look incredible here ❤️‍🔥", keyPhrase: "incredible", style: "bolditalic", copyCount: 0 },

    { id: "ig-agreement-01", platform: "instagram", category: "Agreement / Relatable", text: "finally someone said it 🙌", keyPhrase: "finally", style: "bold", copyCount: 0 },
    { id: "ig-agreement-02", platform: "instagram", category: "Agreement / Relatable", text: "this is the only take that matters", keyPhrase: "the only take", style: "bold", copyCount: 0 },
    { id: "ig-agreement-03", platform: "instagram", category: "Agreement / Relatable", text: "facts, every word 💯", keyPhrase: "facts", style: "bold", copyCount: 0 },
    { id: "ig-agreement-04", platform: "instagram", category: "Agreement / Relatable", text: "saying it louder for the back 📢", keyPhrase: "louder", style: "bold", copyCount: 0 },
    { id: "ig-agreement-05", platform: "instagram", category: "Agreement / Relatable", text: "exactly this, couldn't agree more", keyPhrase: "exactly this", style: "bold", copyCount: 0 },
    { id: "ig-agreement-06", platform: "instagram", category: "Agreement / Relatable", text: "why is this so accurate though", keyPhrase: "so accurate", style: "bold", copyCount: 0 },

    { id: "ig-funny-01", platform: "instagram", category: "Funny & Playful", text: "i can't with you 😭😭", keyPhrase: "can't with you", style: "bolditalic", copyCount: 0 },
    { id: "ig-funny-02", platform: "instagram", category: "Funny & Playful", text: "why is this literally me", keyPhrase: "literally me", style: "bolditalic", copyCount: 0 },
    { id: "ig-funny-03", platform: "instagram", category: "Funny & Playful", text: "okay comedian, log off 😂", keyPhrase: "comedian", style: "bolditalic", copyCount: 0 },
    { id: "ig-funny-04", platform: "instagram", category: "Funny & Playful", text: "the audacity is astronomical 💀", keyPhrase: "astronomical", style: "bolditalic", copyCount: 0 },
    { id: "ig-funny-05", platform: "instagram", category: "Funny & Playful", text: "not me screenshotting this immediately", keyPhrase: "screenshotting this", style: "bolditalic", copyCount: 0 },
    { id: "ig-funny-06", platform: "instagram", category: "Funny & Playful", text: "wasn't ready for that last part", keyPhrase: "wasn't ready", style: "bolditalic", copyCount: 0 },

    { id: "ig-support-01", platform: "instagram", category: "Support & Encouragement", text: "proud of you for posting this 💛", keyPhrase: "proud of you", style: "script", copyCount: 0 },
    { id: "ig-support-02", platform: "instagram", category: "Support & Encouragement", text: "quietly rooting for you always", keyPhrase: "rooting for you", style: "script", copyCount: 0 },
    { id: "ig-support-03", platform: "instagram", category: "Support & Encouragement", text: "keep going, this is just the start 🚀", keyPhrase: "keep going", style: "script", copyCount: 0 },
    { id: "ig-support-04", platform: "instagram", category: "Support & Encouragement", text: "you're doing better than you think", keyPhrase: "doing better than you think", style: "script", copyCount: 0 },
    { id: "ig-support-05", platform: "instagram", category: "Support & Encouragement", text: "this took courage and it shows 🙌", keyPhrase: "it shows", style: "script", copyCount: 0 },
    { id: "ig-support-06", platform: "instagram", category: "Support & Encouragement", text: "don't stop, you're onto something ✨", keyPhrase: "don't stop", style: "script", copyCount: 0 },

    { id: "ig-friendship-01", platform: "instagram", category: "Friendship / Bestie", text: "this is why you're my favourite 💛", keyPhrase: "my favourite", style: "bold", copyCount: 0 },
    { id: "ig-friendship-02", platform: "instagram", category: "Friendship / Bestie", text: "that's my friend, everyone 🫶", keyPhrase: "my friend", style: "bold", copyCount: 0 },
    { id: "ig-friendship-03", platform: "instagram", category: "Friendship / Bestie", text: "adopting you, no take-backs", keyPhrase: "adopting you", style: "bold", copyCount: 0 },
    { id: "ig-friendship-04", platform: "instagram", category: "Friendship / Bestie", text: "the group chat is about to lose it 😭", keyPhrase: "about to lose it", style: "bold", copyCount: 0 },
    { id: "ig-friendship-05", platform: "instagram", category: "Friendship / Bestie", text: "need everyone to know this one's mine ✨", keyPhrase: "this one's mine", style: "bold", copyCount: 0 },
    { id: "ig-friendship-06", platform: "instagram", category: "Friendship / Bestie", text: "you + this energy = unmatched 🔥", keyPhrase: "unmatched", style: "bold", copyCount: 0 },

    { id: "yt-helped-01", platform: "youtube", category: "Appreciation / This Helped", text: "this explained it better than my whole class 🙏", keyPhrase: "explained it better", style: "bold", copyCount: 0 },
    { id: "yt-helped-02", platform: "youtube", category: "Appreciation / This Helped", text: "came for one thing, learned ten 📚", keyPhrase: "learned ten", style: "bold", copyCount: 0 },
    { id: "yt-helped-03", platform: "youtube", category: "Appreciation / This Helped", text: "exactly what i needed today, thank you", keyPhrase: "exactly what i needed", style: "bold", copyCount: 0 },
    { id: "yt-helped-04", platform: "youtube", category: "Appreciation / This Helped", text: "you made this finally make sense 💡", keyPhrase: "finally make sense", style: "bold", copyCount: 0 },
    { id: "yt-helped-05", platform: "youtube", category: "Appreciation / This Helped", text: "saving this, rewatching later for sure", keyPhrase: "rewatching later", style: "bold", copyCount: 0 },
    { id: "yt-helped-06", platform: "youtube", category: "Appreciation / This Helped", text: "the clearest explainer i've found on this", keyPhrase: "i've found", style: "bold", copyCount: 0 },

    { id: "yt-quality-01", platform: "youtube", category: "Quality / Hype", text: "the production on this is insane 🔥", keyPhrase: "insane", style: "bold", copyCount: 0 },
    { id: "yt-quality-02", platform: "youtube", category: "Quality / Hype", text: "okay instant sub 🔔", keyPhrase: "instant sub", style: "bold", copyCount: 0 },
    { id: "yt-quality-03", platform: "youtube", category: "Quality / Hype", text: "the editing carried this, incredible work ✂️", keyPhrase: "carried", style: "bold", copyCount: 0 },
    { id: "yt-quality-04", platform: "youtube", category: "Quality / Hype", text: "this deserves way more views 📈", keyPhrase: "way more views", style: "bold", copyCount: 0 },
    { id: "yt-quality-05", platform: "youtube", category: "Quality / Hype", text: "criminally underrated channel", keyPhrase: "criminally underrated", style: "bold", copyCount: 0 },
    { id: "yt-quality-06", platform: "youtube", category: "Quality / Hype", text: "the quality keeps getting better every upload", keyPhrase: "getting better", style: "bold", copyCount: 0 },

    { id: "yt-support-01", platform: "youtube", category: "Creator Support", text: "please don't ever stop posting 🙏", keyPhrase: "please don't ever stop", style: "script", copyCount: 0 },
    { id: "yt-support-02", platform: "youtube", category: "Creator Support", text: "been here since the early days, so proud", keyPhrase: "the early days", style: "script", copyCount: 0 },
    { id: "yt-support-03", platform: "youtube", category: "Creator Support", text: "whatever you're doing, keep doing it 🚀", keyPhrase: "keep doing it", style: "script", copyCount: 0 },
    { id: "yt-support-04", platform: "youtube", category: "Creator Support", text: "this channel is a hidden gem 💎", keyPhrase: "a hidden gem", style: "script", copyCount: 0 },
    { id: "yt-support-05", platform: "youtube", category: "Creator Support", text: "we appreciate the effort you put in 💛", keyPhrase: "appreciate the effort", style: "script", copyCount: 0 },
    { id: "yt-support-06", platform: "youtube", category: "Creator Support", text: "can't wait for part two already", keyPhrase: "part two", style: "script", copyCount: 0 },

    { id: "yt-community-01", platform: "youtube", category: "Relatable / Community", text: "anyone else here in 2026 🙋", keyPhrase: "here in 2026", style: "bold", copyCount: 0 },
    { id: "yt-community-02", platform: "youtube", category: "Relatable / Community", text: "who's rewatching this for the tenth time", keyPhrase: "who's rewatching", style: "bold", copyCount: 0 },
    { id: "yt-community-03", platform: "youtube", category: "Relatable / Community", text: "the comments section never disappoints 😂", keyPhrase: "never disappoints", style: "bold", copyCount: 0 },
    { id: "yt-community-04", platform: "youtube", category: "Relatable / Community", text: "this aged perfectly, by the way", keyPhrase: "this aged perfectly", style: "bold", copyCount: 0 },
    { id: "yt-community-05", platform: "youtube", category: "Relatable / Community", text: "came back just to read these comments", keyPhrase: "read these comments", style: "bold", copyCount: 0 },
    { id: "yt-community-06", platform: "youtube", category: "Relatable / Community", text: "we're all early, where's everyone from 🌍", keyPhrase: "early", style: "bold", copyCount: 0 },

    { id: "yt-funny-01", platform: "youtube", category: "Funny / Reaction", text: "not me taking notes at 2am 💀", keyPhrase: "taking notes", style: "bolditalic", copyCount: 0 },
    { id: "yt-funny-02", platform: "youtube", category: "Funny / Reaction", text: "the way i gasped out loud", keyPhrase: "gasped", style: "bolditalic", copyCount: 0 },
    { id: "yt-funny-03", platform: "youtube", category: "Funny / Reaction", text: "nobody warned me about that twist 😭", keyPhrase: "nobody warned me", style: "bolditalic", copyCount: 0 },
    { id: "yt-funny-04", platform: "youtube", category: "Funny / Reaction", text: "i clicked so fast for this", keyPhrase: "so fast", style: "bolditalic", copyCount: 0 },
    { id: "yt-funny-05", platform: "youtube", category: "Funny / Reaction", text: "this is unhinged and i'm here for it", keyPhrase: "unhinged", style: "bolditalic", copyCount: 0 },
    { id: "yt-funny-06", platform: "youtube", category: "Funny / Reaction", text: "replaying that part on loop", keyPhrase: "replaying that part", style: "bolditalic", copyCount: 0 },

    { id: "yt-emotional-01", platform: "youtube", category: "Moved / Emotional", text: "not me tearing up at a video 🥹", keyPhrase: "tearing up", style: "script", copyCount: 0 },
    { id: "yt-emotional-02", platform: "youtube", category: "Moved / Emotional", text: "this hit different today", keyPhrase: "hit different", style: "script", copyCount: 0 },
    { id: "yt-emotional-03", platform: "youtube", category: "Moved / Emotional", text: "needed to hear exactly this 💛", keyPhrase: "exactly this", style: "script", copyCount: 0 },
    { id: "yt-emotional-04", platform: "youtube", category: "Moved / Emotional", text: "okay this one stayed with me", keyPhrase: "stayed with me", style: "script", copyCount: 0 },
    { id: "yt-emotional-05", platform: "youtube", category: "Moved / Emotional", text: "you put words to something i couldn't 😭", keyPhrase: "something i couldn't", style: "script", copyCount: 0 },
    { id: "yt-emotional-06", platform: "youtube", category: "Moved / Emotional", text: "thank you for being so honest here", keyPhrase: "being so honest", style: "script", copyCount: 0 },

    { id: "fb-warm-01", platform: "facebook", category: "Warm Appreciation", text: "So glad I got to see this today ❤️", keyPhrase: "see this today", style: "script", copyCount: 0 },
    { id: "fb-warm-02", platform: "facebook", category: "Warm Appreciation", text: "This truly made my morning 🌷", keyPhrase: "made my morning", style: "script", copyCount: 0 },
    { id: "fb-warm-03", platform: "facebook", category: "Warm Appreciation", text: "Thank you for always sharing such good things", keyPhrase: "always sharing", style: "script", copyCount: 0 },
    { id: "fb-warm-04", platform: "facebook", category: "Warm Appreciation", text: "This warmed my heart, friend 💛", keyPhrase: "warmed my heart", style: "script", copyCount: 0 },
    { id: "fb-warm-05", platform: "facebook", category: "Warm Appreciation", text: "What a lovely thing to wake up to ☀️", keyPhrase: "lovely thing", style: "script", copyCount: 0 },
    { id: "fb-warm-06", platform: "facebook", category: "Warm Appreciation", text: "Sending you so much love for this", keyPhrase: "so much love", style: "script", copyCount: 0 },

    { id: "fb-congrats-01", platform: "facebook", category: "Congratulations / Milestones", text: "Congratulations! So well deserved 🎉", keyPhrase: "So well deserved", style: "bold", copyCount: 0 },
    { id: "fb-congrats-02", platform: "facebook", category: "Congratulations / Milestones", text: "What wonderful news — so happy for you!", keyPhrase: "wonderful news", style: "bold", copyCount: 0 },
    { id: "fb-congrats-03", platform: "facebook", category: "Congratulations / Milestones", text: "Wishing you all the best on this 🥳", keyPhrase: "all the best", style: "bold", copyCount: 0 },
    { id: "fb-congrats-04", platform: "facebook", category: "Congratulations / Milestones", text: "This is a beautiful milestone, congratulations 🎊", keyPhrase: "a beautiful milestone", style: "bold", copyCount: 0 },
    { id: "fb-congrats-05", platform: "facebook", category: "Congratulations / Milestones", text: "So proud of you, enjoy every moment 💐", keyPhrase: "proud of you", style: "bold", copyCount: 0 },
    { id: "fb-congrats-06", platform: "facebook", category: "Congratulations / Milestones", text: "Cheers to you — you earned this 🍾", keyPhrase: "you earned this", style: "bold", copyCount: 0 },

    { id: "fb-support-01", platform: "facebook", category: "Support & Encouragement", text: "Thinking of you and cheering you on 💛", keyPhrase: "Thinking of you", style: "script", copyCount: 0 },
    { id: "fb-support-02", platform: "facebook", category: "Support & Encouragement", text: "You've got this — one step at a time 🙏", keyPhrase: "one step at a time", style: "script", copyCount: 0 },
    { id: "fb-support-03", platform: "facebook", category: "Support & Encouragement", text: "So proud of how far you've come", keyPhrase: "proud of how far", style: "script", copyCount: 0 },
    { id: "fb-support-04", platform: "facebook", category: "Support & Encouragement", text: "Stay strong, brighter days are coming ☀️", keyPhrase: "Stay strong", style: "script", copyCount: 0 },
    { id: "fb-support-05", platform: "facebook", category: "Support & Encouragement", text: "We're all right behind you ❤️", keyPhrase: "right behind you", style: "script", copyCount: 0 },
    { id: "fb-support-06", platform: "facebook", category: "Support & Encouragement", text: "Keep your head up, this will pass", keyPhrase: "Keep your head up", style: "script", copyCount: 0 },

    { id: "fb-family-01", platform: "facebook", category: "Friendship & Family", text: "Love you, my dear friend 💛", keyPhrase: "my dear friend", style: "bold", copyCount: 0 },
    { id: "fb-family-02", platform: "facebook", category: "Friendship & Family", text: "So grateful to know you ❤️", keyPhrase: "to know you", style: "bold", copyCount: 0 },
    { id: "fb-family-03", platform: "facebook", category: "Friendship & Family", text: "Family like you is a true blessing 🙏", keyPhrase: "a true blessing", style: "bold", copyCount: 0 },
    { id: "fb-family-04", platform: "facebook", category: "Friendship & Family", text: "Miss you — let's catch up soon 🤗", keyPhrase: "let's catch up soon", style: "bold", copyCount: 0 },
    { id: "fb-family-05", platform: "facebook", category: "Friendship & Family", text: "Always here for you, you know that", keyPhrase: "Always", style: "bold", copyCount: 0 },
    { id: "fb-family-06", platform: "facebook", category: "Friendship & Family", text: "The best people, right here 💕", keyPhrase: "right here", style: "bold", copyCount: 0 },

    { id: "fb-agreement-01", platform: "facebook", category: "Agreement / Well Said", text: "Well said, couldn't agree more 👏", keyPhrase: "Well said", style: "bold", copyCount: 0 },
    { id: "fb-agreement-02", platform: "facebook", category: "Agreement / Well Said", text: "This is so true, thank you for posting", keyPhrase: "so true", style: "bold", copyCount: 0 },
    { id: "fb-agreement-03", platform: "facebook", category: "Agreement / Well Said", text: "You've put it perfectly 🙌", keyPhrase: "put it perfectly", style: "bold", copyCount: 0 },
    { id: "fb-agreement-04", platform: "facebook", category: "Agreement / Well Said", text: "Exactly my thoughts as well", keyPhrase: "Exactly", style: "bold", copyCount: 0 },
    { id: "fb-agreement-05", platform: "facebook", category: "Agreement / Well Said", text: "Wise words — needed this reminder 💭", keyPhrase: "needed this reminder", style: "bold", copyCount: 0 },
    { id: "fb-agreement-06", platform: "facebook", category: "Agreement / Well Said", text: "Sharing this, everyone should read it", keyPhrase: "Sharing this", style: "bold", copyCount: 0 },

    { id: "fb-pride-01", platform: "facebook", category: "Pride / Wholesome", text: "My heart is so full seeing this 🥹", keyPhrase: "so full", style: "script", copyCount: 0 },
    { id: "fb-pride-02", platform: "facebook", category: "Pride / Wholesome", text: "This is everything good about today ✨", keyPhrase: "everything good", style: "script", copyCount: 0 },
    { id: "fb-pride-03", platform: "facebook", category: "Pride / Wholesome", text: "What a beautiful family 💕", keyPhrase: "beautiful family", style: "script", copyCount: 0 },
    { id: "fb-pride-04", platform: "facebook", category: "Pride / Wholesome", text: "So blessed to witness this 🙏", keyPhrase: "blessed", style: "script", copyCount: 0 },
    { id: "fb-pride-05", platform: "facebook", category: "Pride / Wholesome", text: "Pure joy — thank you for sharing 😊", keyPhrase: "thank you for sharing", style: "script", copyCount: 0 },
    { id: "fb-pride-06", platform: "facebook", category: "Pride / Wholesome", text: "This is why I love this community ❤️", keyPhrase: "why I love", style: "script", copyCount: 0 }
  ];

  const styleLibrary = [
    { id: "bold", label: "Bold", description: "Strong emphasis that still reads naturally.", mood: "emphasis", sourceSlug: "ultra-bold", sample: "YOU DID THAT" },
    { id: "boldserif", label: "Bold Serif", description: "Polished for longer, cleaner comments.", mood: "emphasis", sourceSlug: "ultra-bold-serif", sample: "way more views" },
    { id: "bolditalic", label: "Bold Italic", description: "High-energy emphasis for hype and reactions.", mood: "emphasis", sourceSlug: "ultra-bold-italic", sample: "instant sub" },
    { id: "strike", label: "Strikethrough", description: "Useful for playful reversals and sarcasm.", mood: "sarcasm", sourceSlug: "ultra-strike", sample: "totally fine" },
    { id: "underline", label: "Underline", description: "A quieter way to add emphasis.", mood: "sarcasm", sourceSlug: "ultra-underline", sample: "read this part" },
    { id: "italic", label: "Italic", description: "Soft, human, and a little more reflective.", mood: "warmth", sourceSlug: "ultra-italic", sample: "hit different" },
    { id: "script", label: "Script", description: "Warm and personal for sincere comments.", mood: "warmth", sourceSlug: "ultra-script", sample: "made my whole day" },
    { id: "scriptbold", label: "Bold Script", description: "Expressive without going full decorator.", mood: "warmth", sourceSlug: "ultra-script-bold", sample: "so proud of you" },
    { id: "bubble", label: "Bubble", description: "Playful and light for fan energy.", mood: "playful", sourceSlug: "ultra-bubble", sample: "legend" },
    { id: "bubblefilled", label: "Filled Bubble", description: "Fun when you want sticker-like emphasis.", mood: "playful", sourceSlug: "ultra-bubble-filled", sample: "saved folder" },
    { id: "gothic", label: "Gothic", description: "Adds an alt or aesthetic edge.", mood: "edgy", sourceSlug: "ultra-gothic", sample: "stayed with me" },
    { id: "gothicbold", label: "Bold Gothic", description: "Heavier gothic styling for dramatic lines.", mood: "edgy", sourceSlug: "ultra-gothic-bold", sample: "hidden gem" },
    { id: "monospace", label: "Monospace", description: "Clean and precise when you want restraint.", mood: "clean", customStyle: MONOSPACE_STYLE, sample: "rewatching later" },
    { id: "smallcaps", label: "Small Caps", description: "Subtle distinction without looking spammy.", mood: "clean", sourceSlug: "ultra-small-caps", sample: "well said" }
  ];

  const styleMoodLabels = {
    all: "All styles",
    emphasis: "Emphasis",
    sarcasm: "Sarcasm & Wit",
    warmth: "Warmth",
    playful: "Playful",
    edgy: "Edgy",
    clean: "Clean & Minimal"
  };

  const decoratorGroups = {
    "high-energy": [
      { text: "⚠️ WARNING ⚠️", prefix: "⚠️ ", suffix: " ⚠️" },
      { text: "🚨 BREAKING 🚨", prefix: "🚨 ", suffix: " 🚨" },
      { text: "🔔 ALERT 🔔", prefix: "🔔 ", suffix: " 🔔" },
      { text: "⏳ URGENT ⏳", prefix: "⏳ ", suffix: " ⏳" },
      { text: "📢 MUST READ 📢", prefix: "📢 ", suffix: " 📢" },
      { text: "🔥 HOT TAKE 🔥", prefix: "🔥 ", suffix: " 🔥" },
      { text: "💣 TRUTH BOMB 💣", prefix: "💣 ", suffix: " 💣" }
    ],
    agreement: [
      { text: "📌 FACTS 📌", prefix: "📌 ", suffix: " 📌" },
      { text: "💯 SO TRUE 💯", prefix: "💯 ", suffix: " 💯" },
      { text: "👏 EXACTLY 👏", prefix: "👏 ", suffix: " 👏" },
      { text: "🎯 THIS 🎯", prefix: "🎯 ", suffix: " 🎯" },
      { text: "🎯 NAILED IT 🎯", prefix: "🎯 ", suffix: " 🎯" },
      { text: "🎤 MIC DROP 🎤", prefix: "🎤 ", suffix: " 🎤" }
    ],
    motivation: [
      { text: "🚀 LEVEL UP 🚀", prefix: "🚀 ", suffix: " 🚀" },
      { text: "🧠 MINDSET SHIFT 🧠", prefix: "🧠 ", suffix: " 🧠" },
      { text: "🎮 GAME CHANGER 🎮", prefix: "🎮 ", suffix: " 🎮" },
      { text: "💡 PRO TIP 💡", prefix: "💡 ", suffix: " 💡" },
      { text: "⚡ BIG ENERGY ⚡", prefix: "⚡ ", suffix: " ⚡" },
      { text: "🏆 MASTERY 🏆", prefix: "🏆 ", suffix: " 🏆" }
    ],
    appreciation: [
      { text: "🙏 GRATITUDE 🙏", prefix: "🙏 ", suffix: " 🙏" },
      { text: "🫡 RESPECT 🫡", prefix: "🫡 ", suffix: " 🫡" },
      { text: "❤️ APPRECIATION ❤️", prefix: "❤️ ", suffix: " ❤️" },
      { text: "💙 THANK YOU 💙", prefix: "💙 ", suffix: " 💙" },
      { text: "👏 WELL DONE 👏", prefix: "👏 ", suffix: " 👏" }
    ],
    thoughtful: [
      { text: "🧠 DEEP THOUGHT 🧠", prefix: "🧠 ", suffix: " 🧠" },
      { text: "🔍 PERSPECTIVE 🔍", prefix: "🔍 ", suffix: " 🔍" },
      { text: "💡 INSIGHT 💡", prefix: "💡 ", suffix: " 💡" },
      { text: "🤔 WORTH THINKING 🤔", prefix: "🤔 ", suffix: " 🤔" },
      { text: "📌 REMEMBER 📌", prefix: "📌 ", suffix: " 📌" }
    ],
    playful: [
      { text: "🎬 PLOT TWIST 🎬", prefix: "🎬 ", suffix: " 🎬" },
      { text: "😂 LOL 😂", prefix: "😂 ", suffix: " 😂" },
      { text: "👀 WAIT 👀", prefix: "👀 ", suffix: " 👀" },
      { text: "🗣️ REAL TALK 🗣️", prefix: "🗣️ ", suffix: " 🗣️" },
      { text: "👀 WATCH THIS 👀", prefix: "👀 ", suffix: " 👀" }
    ],
    authority: [
      { text: "📊 ANALYSIS 📊", prefix: "📊 ", suffix: " 📊" },
      { text: "🧩 FRAMEWORK 🧩", prefix: "🧩 ", suffix: " 🧩" },
      { text: "🔎 BREAKDOWN 🔎", prefix: "🔎 ", suffix: " 🔎" },
      { text: "♟️ STRATEGY ♟️", prefix: "♟️ ", suffix: " ♟️" },
      { text: "📘 CASE STUDY 📘", prefix: "📘 ", suffix: " 📘" }
    ]
  };

  const decoratorGroupLabels = {
    "high-energy": "🔥 High-Energy",
    agreement: "💯 Agreement",
    motivation: "🚀 Motivation",
    appreciation: "❤️ Appreciation",
    thoughtful: "🧠 Thoughtful",
    playful: "😎 Playful",
    authority: "📈 Authority"
  };

  const bracketsInventory = [
    { label: "「 」", open: "「", close: "」" },
    { label: "【 】", open: "【", close: "】" },
    { label: "⟦ ⟧", open: "⟦", close: "⟧" },
    { label: "▌ ▐", open: "▌ ", close: " ▐" },
    { label: "✦ ✦", open: "✦ ", close: " ✦" },
    { label: "꒰ ꒱", open: "꒰", close: "꒱" },
    { label: "『 』", open: "『", close: "』" },
    { label: "〔 〕", open: "〔", close: "〕" }
  ];

  const emojiGroups = {
    "smileys": {
      label: "😄 Smileys & Faces",
      keywords: ["smile", "grin", "laugh", "joy", "face", "reaction"],
      emojis: ["😊", "😍", "🥺", "😂", "🤩", "😭", "🥹", "😅", "🤣", "😎", "🫠", "🤔", "😤", "😩", "😏", "🥰", "😋", "🤗"]
    },
    "hearts": {
      label: "❤️ Hearts & Love",
      keywords: ["heart", "love", "romance", "affection", "care", "valentine"],
      emojis: ["❤️", "💛", "💙", "💚", "🧡", "💜", "🖤", "🤍", "💕", "💞", "💓", "💗", "💖", "💝", "❤️‍🔥", "🫶", "💌", "💘"]
    },
    "hands": {
      label: "👏 Hands & Gestures",
      keywords: ["hand", "gesture", "clap", "support", "applause", "agreement"],
      emojis: ["👏", "🙌", "🤝", "🫶", "🙏", "👍", "✌️", "🤞", "🫵", "💪", "🤙", "👋", "🫂", "🤜", "🤛", "✊", "🖐️", "☝️"]
    },
    "celebration": {
      label: "🎉 Celebration",
      keywords: ["party", "festival", "hype", "win"],
      emojis: ["🎉", "🎊", "🥳", "🎈", "🎁", "🏆", "🥂", "🍾", "🎶", "🎤", "🚀", "✨", "💫", "⭐", "🌟", "🔥", "💥", "🎯"]
    },
    "symbols": {
      label: "✨ Symbols & Sparkles",
      keywords: ["symbol", "sparkle", "magic", "glow", "aesthetic", "mystic"],
      emojis: ["✨", "💡", "⚡", "💎", "🌈", "🔮", "💫", "🌙", "⭐", "🌸", "🌺", "🌻", "🦋", "🫧", "🪄", "🌊", "💠", "🔷"]
    },
    "nature": {
      label: "🌿 Nature",
      keywords: ["nature", "flower", "garden", "outdoor", "plant"],
      emojis: ["🌷", "🌸", "🌺", "🌻", "🌹", "🍀", "🌿", "🦋", "🐝", "🌊", "☀️", "🌙", "⭐", "🌈", "❄️", "🍃", "🌱", "🌾"]
    }
  };

  const elements = {
    mainInput: document.getElementById("mainInput"),
    styledPreview: document.getElementById("styledPreview"),
    charCount: document.getElementById("charCount"),
    charCountWrapper: document.getElementById("charCountWrapper"),
    clearStylingBtn: document.getElementById("clearStylingBtn"),
    clearTextBtn: document.getElementById("clearTextBtn"),
    clearDecoratorBtn: document.getElementById("clearDecoratorBtn"),
    clearBracketBtn: document.getElementById("clearBracketBtn"),
    clearEmojiBtn: document.getElementById("clearEmojiBtn"),
    emojiSearchInput: document.getElementById("emojiSearchInput"),
    copyMainBtn: document.getElementById("copyMainBtn"),
    copyToast: document.getElementById("copyToast"),
    activeSelectionLabel: document.getElementById("activeSelectionLabel"),
    quickPickCategoryTabs: document.getElementById("quickPickCategoryTabs"),
    quickPickCards: document.getElementById("quickPickCards"),
    quickPickHeading: document.getElementById("quickPickHeading"),
    quickPickSubheading: document.getElementById("quickPickSubheading"),
    showMoreTemplatesBtn: document.getElementById("showMoreTemplatesBtn"),
    styleCards: document.getElementById("styleCards"),
    decoratorTabs: document.getElementById("decoratorTabs"),
    decoratorInventory: document.getElementById("decoratorInventory"),
    emojiGroupTabs: document.getElementById("emojiGroupTabs"),
    emojiInventory: document.getElementById("emojiInventory"),
    bracketsInventory: document.getElementById("bracketsInventory"),
    inventoryModuleTabs: document.querySelector(".inventory-module-tabs"),
    styleFurtherRow: document.getElementById("styleFurtherRow"),
    styleFurtherBtn: document.getElementById("styleFurtherBtn")
  };

  const state = {
    mode: "quick-picks",
    platform: "instagram",
    quickPickCategory: "Love & Appreciation",
    showAllTemplates: false,
    selectedTemplateId: null,
    selectedStyleId: null,
    selectedDecoratorId: null,
    selectedBracketIndex: null,
    selectedEmoji: null,
    styleMood: "all",
    inventoryModule: "word-stamps",
    decoratorTab: "high-energy",
    emojiGroup: "smileys",
    emojiSearch: "",
    history: [],
    historyIndex: -1,
    isRestoringHistory: false,
    inputHistoryTimer: null,
    styleRenderFrame: null,
    copyCounts: loadCopyCounts()
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function loadCopyCounts() {
    try {
      return JSON.parse(window.localStorage.getItem(COPY_COUNT_STORAGE_KEY) || "{}") || {};
    } catch (_error) {
      return {};
    }
  }

  function saveCopyCounts() {
    try {
      window.localStorage.setItem(COPY_COUNT_STORAGE_KEY, JSON.stringify(state.copyCounts));
    } catch (_error) {
      // Ignore storage failures.
    }
  }

  function getStyleDefinition(styleId) {
    return styleLibrary.find((style) => style.id === styleId) || null;
  }

  function getTemplateCopyCount(template) {
    return Number(state.copyCounts[template.id]) || template.copyCount || 0;
  }

  function getRendererStyle(styleId) {
    const definition = getStyleDefinition(styleId);
    if (!definition) return null;
    if (definition.customStyle) return definition.customStyle;
    return styleRegistry[definition.sourceSlug] || null;
  }

  function renderStyledText(text, styleId) {
    if (!text || !hasRenderer) return text;
    const style = getRendererStyle(styleId);
    return style ? Render.renderAny(text, style) : text;
  }

  function getSelectedDecorator() {
    if (!state.selectedDecoratorId) return null;
    const decorators = decoratorGroups[state.decoratorTab] || [];
    return decorators.find((item) => item.text === state.selectedDecoratorId) || null;
  }

  /**
   * Compose output non-destructively from source text.
   * Order matters: style first, then word-stamp, then frame, then emoji accent.
   * This keeps wrappers around the final styled text while preserving the source in the bar.
   */
  function composeStyledText(sourceText) {
    if (!sourceText) return "";
    let output = sourceText;
    if (state.selectedStyleId) {
      output = renderStyledText(output, state.selectedStyleId);
    }
    const decorator = getSelectedDecorator();
    if (decorator) {
      output = `${decorator.prefix}${output}${decorator.suffix}`;
    }
    if (state.selectedBracketIndex !== null && bracketsInventory[state.selectedBracketIndex]) {
      const bracket = bracketsInventory[state.selectedBracketIndex];
      output = `${bracket.open}${output}${bracket.close}`;
    }
    if (state.selectedEmoji) {
      output = `${state.selectedEmoji} ${output} ${state.selectedEmoji}`;
    }
    return output;
  }

  function getSnapshot() {
    return {
      text: elements.mainInput.value,
      selectedStyleId: state.selectedStyleId,
      selectedDecoratorId: state.selectedDecoratorId,
      selectedBracketIndex: state.selectedBracketIndex,
      selectedEmoji: state.selectedEmoji
    };
  }

  function snapshotsEqual(a, b) {
    if (!a || !b) return false;
    return a.text === b.text
      && a.selectedStyleId === b.selectedStyleId
      && a.selectedDecoratorId === b.selectedDecoratorId
      && a.selectedBracketIndex === b.selectedBracketIndex
      && a.selectedEmoji === b.selectedEmoji;
  }

  function pushHistory() {
    if (state.isRestoringHistory) return;
    const snapshot = getSnapshot();
    const previous = state.history[state.historyIndex];
    if (previous && snapshotsEqual(previous, snapshot)) return;
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot);
    state.historyIndex = state.history.length - 1;
  }

  function scheduleInputHistoryPush() {
    window.clearTimeout(state.inputHistoryTimer);
    state.inputHistoryTimer = window.setTimeout(() => {
      pushHistory();
    }, INPUT_HISTORY_DEBOUNCE_MS);
  }

  function scheduleStyleCardRender() {
    if (state.styleRenderFrame) window.cancelAnimationFrame(state.styleRenderFrame);
    state.styleRenderFrame = window.requestAnimationFrame(() => {
      renderStyleCards();
      state.styleRenderFrame = null;
    });
  }

  function restoreSnapshot(snapshot) {
    if (!snapshot) return;
    state.isRestoringHistory = true;
    elements.mainInput.value = snapshot.text || "";
    state.selectedStyleId = snapshot.selectedStyleId || null;
    state.selectedDecoratorId = snapshot.selectedDecoratorId || null;
    state.selectedBracketIndex = Number.isInteger(snapshot.selectedBracketIndex) ? snapshot.selectedBracketIndex : null;
    state.selectedEmoji = snapshot.selectedEmoji || null;
    state.selectedTemplateId = null;
    syncInputUi();
    renderQuickPickCards();
    renderStyleCards();
    renderDecorators();
    renderBracketsInventory();
    renderEmojiInventory();
    state.isRestoringHistory = false;
  }

  function handleUndoRedo(event) {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    const key = String(event.key || "").toLowerCase();
    if (key !== "z") return;
    const shouldRedo = event.shiftKey;
    if (shouldRedo) {
      if (state.historyIndex >= state.history.length - 1) return;
      event.preventDefault();
      state.historyIndex += 1;
      restoreSnapshot(state.history[state.historyIndex]);
      setSelectionHint("Redo applied.");
      return;
    }
    if (state.historyIndex <= 0) return;
    event.preventDefault();
    state.historyIndex -= 1;
    restoreSnapshot(state.history[state.historyIndex]);
    setSelectionHint("Undo applied.");
  }

  function applyTemplateStyle(template) {
    const start = template.text.indexOf(template.keyPhrase);
    if (start === -1) return template.text;
    const styledPhrase = renderStyledText(template.keyPhrase, template.style);
    return template.text.slice(0, start) + styledPhrase + template.text.slice(start + template.keyPhrase.length);
  }

  function getPlatformCategories(platform) {
    const seen = new Set();
    return templateBank.reduce((categories, template) => {
      if (template.platform !== platform || seen.has(template.category)) return categories;
      seen.add(template.category);
      categories.push(template.category);
      return categories;
    }, []);
  }

  function getActiveTemplate() {
    return templateBank.find((template) => template.id === state.selectedTemplateId) || null;
  }

  function getActiveTemplates() {
    return templateBank.filter((template) => (
      template.platform === state.platform && template.category === state.quickPickCategory
    ));
  }

  function setSelectionHint(message) {
    if (elements.activeSelectionLabel) {
      elements.activeSelectionLabel.textContent = message;
    }
  }

  function syncInputUi() {
    const text = elements.mainInput.value;
    const length = text.length;
    const styledText = composeStyledText(text);
    if (elements.charCount) elements.charCount.textContent = String(length);
    if (elements.charCountWrapper) elements.charCountWrapper.hidden = length === 0;
    if (elements.copyMainBtn) elements.copyMainBtn.disabled = length === 0;
    if (elements.styleFurtherRow) {
      elements.styleFurtherRow.hidden = length === 0 || state.mode === "style-your-own";
    }
    if (elements.styledPreview) {
      if (length === 0) {
        elements.styledPreview.textContent = "Styled preview appears here as you choose style, frames, and emoji.";
        elements.styledPreview.classList.remove("has-content");
      } else {
        elements.styledPreview.textContent = styledText;
        elements.styledPreview.classList.add("has-content");
      }
    }
  }

  function showCopyToast(message) {
    if (!elements.copyToast) return;
    elements.copyToast.textContent = message;
    elements.copyToast.classList.add("is-visible");
    window.clearTimeout(showCopyToast.timer);
    showCopyToast.timer = window.setTimeout(() => {
      elements.copyToast.classList.remove("is-visible");
    }, 1600);
  }

  function updateModeUi() {
    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === state.mode);
    });
    document.querySelectorAll("[data-mode-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.modePanel !== state.mode;
    });
  }

  function renderQuickPickCategoryTabs() {
    const categories = getPlatformCategories(state.platform);
    if (!categories.includes(state.quickPickCategory)) {
      state.quickPickCategory = categories[0] || "";
    }
    elements.quickPickCategoryTabs.innerHTML = categories.map((category) => `
      <button type="button" class="category-tab ${category === state.quickPickCategory ? "active" : ""}" data-quick-category="${escapeHtml(category)}">
        ${escapeHtml(category)}
      </button>
    `).join("");
  }

  function renderQuickPickCards() {
    const templates = getActiveTemplates();
    const visibleTemplates = state.showAllTemplates ? templates : templates.slice(0, QUICK_PICK_VISIBLE_COUNT);
    const platformLabel = platformLabels[state.platform] || state.platform;

    if (elements.quickPickHeading) {
      elements.quickPickHeading.textContent = `${platformLabel} · ${state.quickPickCategory}`;
    }
    if (elements.quickPickSubheading) {
      elements.quickPickSubheading.textContent = "Tap a card to load a ready comment, then tweak and style it before you copy.";
    }

    elements.quickPickCards.innerHTML = visibleTemplates.map((template) => {
      const preview = applyTemplateStyle(template);
      return `
        <button type="button" class="style-card template-card ${template.id === state.selectedTemplateId ? "is-selected" : ""}" data-template-id="${template.id}">
          <div class="style-info">
            <div class="style-name">
              <span>${escapeHtml(template.category)}</span>
              <span class="style-tag">${escapeHtml(template.style)}</span>
            </div>
            <!-- Escape the styled preview too because the card markup is assembled with innerHTML. -->
            <div class="style-preview">${escapeHtml(preview)}</div>
            <p class="template-meta">Loads the ready comment into your bar so you can tweak and style it.</p>
          </div>
        </button>
      `;
    }).join("");

    if (templates.length > QUICK_PICK_VISIBLE_COUNT) {
      elements.showMoreTemplatesBtn.hidden = false;
      elements.showMoreTemplatesBtn.textContent = state.showAllTemplates ? "Show fewer" : "Show more";
    } else {
      elements.showMoreTemplatesBtn.hidden = true;
    }
  }

  function getStylePreviewText(styleId, sourceText) {
    if (styleId === PLAIN_STYLE_ID) return sourceText;
    return renderStyledText(sourceText, styleId);
  }

  function renderStyleCards() {
    const previewSampleText = elements.mainInput.value.trim() || "Your comment";
    const visibleStyles = styleLibrary.filter((style) => (
      state.styleMood === "all" || style.mood === state.styleMood
    ));
    const allStyles = [PLAIN_STYLE_OPTION].concat(visibleStyles);

    elements.styleCards.innerHTML = allStyles.map((style) => `
      <button type="button" class="style-card comment-style-card ${style.id === (state.selectedStyleId || PLAIN_STYLE_ID) ? "is-active" : ""}" data-style-id="${style.id}">
        <div class="style-info">
          <div class="style-name">
            <span>${escapeHtml(style.label)}</span>
            <span class="style-tag">${escapeHtml(styleMoodLabels[style.mood] || style.mood)}</span>
          </div>
          <div class="style-preview">${escapeHtml(getStylePreviewText(style.id, previewSampleText))}</div>
          <p class="style-helper">${escapeHtml(style.description)}</p>
        </div>
      </button>
    `).join("");
  }

  function renderDecoratorTabs() {
    elements.decoratorTabs.innerHTML = Object.entries(decoratorGroupLabels).map(([group, label]) => `
      <button type="button" class="decoration-tab ${group === state.decoratorTab ? "active" : ""}" data-decorator-tab="${group}">${escapeHtml(label)}</button>
    `).join("");
  }

  function renderDecorators() {
    const decorators = decoratorGroups[state.decoratorTab] || [];
    elements.decoratorInventory.innerHTML = decorators.map((item, index) => `
      <button type="button" class="decoration-item ${item.text === state.selectedDecoratorId ? "selected" : ""}" data-decorator-index="${index}">${escapeHtml(item.text)}</button>
    `).join("");
  }

  function renderEmojiGroupTabs() {
    if (!elements.emojiGroupTabs) return;
    elements.emojiGroupTabs.innerHTML = Object.entries(emojiGroups).map(([key, group]) => `
      <button type="button" class="decoration-tab ${key === state.emojiGroup ? "active" : ""}" data-emoji-group="${escapeHtml(key)}">${escapeHtml(group.label)}</button>
    `).join("");
  }

  function renderEmojiInventory() {
    const group = emojiGroups[state.emojiGroup] || emojiGroups["smileys"];
    const query = state.emojiSearch.trim().toLowerCase();
    const keywordMatch = (group.keywords || []).some((keyword) => keyword.includes(query));
    const visibleEmojis = query && !keywordMatch ? [] : group.emojis;
    elements.emojiInventory.innerHTML = visibleEmojis.map((emoji) => `
      <button type="button" class="comment-emoji-chip ${emoji === state.selectedEmoji ? "selected" : ""}" data-emoji="${escapeHtml(emoji)}">${escapeHtml(emoji)}</button>
    `).join("");
  }

  function renderBracketsInventory() {
    if (!elements.bracketsInventory) return;
    elements.bracketsInventory.innerHTML = bracketsInventory.map((item, index) => `
      <button type="button" class="decoration-item bracket-item ${index === state.selectedBracketIndex ? "selected" : ""}" data-bracket-index="${index}">${escapeHtml(item.label)}</button>
    `).join("");
  }

  function updateInventoryModuleUi() {
    if (elements.inventoryModuleTabs) {
      elements.inventoryModuleTabs.querySelectorAll("[data-inventory-module]").forEach((button) => {
        button.classList.toggle("active", button.dataset.inventoryModule === state.inventoryModule);
      });
    }
    document.querySelectorAll("[data-inventory-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.inventoryPanel !== state.inventoryModule;
    });
  }

  function loadTemplate(templateId) {
    const template = templateBank.find((entry) => entry.id === templateId);
    if (!template) return;
    elements.mainInput.value = template.text;
    state.selectedTemplateId = template.id;
    state.selectedStyleId = getStyleDefinition(template.style) ? template.style : null;
    syncInputUi();
    renderQuickPickCards();
    renderStyleCards();
    pushHistory();
    setSelectionHint(`${platformLabels[template.platform]} · ${template.category} loaded. Edit in the bar — style appears in preview and copy output.`);
    elements.mainInput.focus();
  }

  function applyStyle(styleId) {
    const text = elements.mainInput.value;
    if (!text.trim()) {
      elements.mainInput.focus();
      setSelectionHint("Type or paste a comment first, then choose a style.");
      return;
    }
    state.selectedStyleId = styleId === PLAIN_STYLE_ID ? null : styleId;
    state.selectedTemplateId = null;
    syncInputUi();
    renderQuickPickCards();
    renderStyleCards();
    pushHistory();
    const style = getStyleDefinition(styleId);
    setSelectionHint(`${style ? style.label : "Plain text"} selected. Your source text is unchanged.`);
  }

  function applyDecorator(index) {
    const decoration = (decoratorGroups[state.decoratorTab] || [])[index];
    if (!decoration) return;
    const text = elements.mainInput.value;
    if (!text.trim()) {
      elements.mainInput.focus();
      setSelectionHint("Add your comment first, then use word-stamps only if you really want extra framing.");
      return;
    }
    state.selectedDecoratorId = state.selectedDecoratorId === decoration.text ? null : decoration.text;
    state.selectedTemplateId = null;
    syncInputUi();
    renderDecorators();
    pushHistory();
    setSelectionHint(state.selectedDecoratorId ? "Word-stamp enabled." : "Word-stamp removed.");
  }

  function applyBracket(index) {
    const bracket = bracketsInventory[index];
    if (!bracket) return;
    const text = elements.mainInput.value;
    if (!text.trim()) {
      elements.mainInput.focus();
      setSelectionHint("Add your comment first, then choose a frame.");
      return;
    }
    state.selectedBracketIndex = state.selectedBracketIndex === index ? null : index;
    state.selectedTemplateId = null;
    syncInputUi();
    renderBracketsInventory();
    pushHistory();
    setSelectionHint(state.selectedBracketIndex === null ? "Frame removed." : "Frame enabled.");
  }

  function appendEmoji(emoji) {
    if (!elements.mainInput.value.trim()) {
      elements.mainInput.focus();
      setSelectionHint("Add your comment first, then pick an emoji accent.");
      return;
    }
    state.selectedEmoji = state.selectedEmoji === emoji ? null : emoji;
    state.selectedTemplateId = null;
    syncInputUi();
    renderEmojiInventory();
    pushHistory();
    setSelectionHint(state.selectedEmoji ? "Emoji accent enabled." : "Emoji accent removed.");
    elements.mainInput.focus();
  }

  function incrementCopyCount(template) {
    if (!template) return;
    state.copyCounts[template.id] = getTemplateCopyCount(template) + 1;
    saveCopyCounts();
  }

  async function copyMainText() {
    const text = composeStyledText(elements.mainInput.value);
    if (!text) return;
    const activeTemplate = getActiveTemplate();

    try {
      await navigator.clipboard.writeText(text);
      incrementCopyCount(activeTemplate);
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "comment_copy",
        copy_method: "main_bar",
        mode: state.mode,
        template_id: activeTemplate ? activeTemplate.id : null,
        template_platform: activeTemplate ? activeTemplate.platform : null,
        template_category: activeTemplate ? activeTemplate.category : null,
        template_copy_count: activeTemplate ? getTemplateCopyCount(activeTemplate) : null,
        style_id: state.selectedStyleId
      });
      window.dataLayer.push({
        event: "copy_text",
        copy_method: "main_bar",
        template_id: activeTemplate ? activeTemplate.id : null
      });
      showCopyToast("Copied!");
      setSelectionHint("Copied.");
    } catch (error) {
      console.error("Copy failed:", error);
      showCopyToast("Copy failed");
    }
  }

  function bindEvents() {
    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        state.mode = button.dataset.mode;
        updateModeUi();
        syncInputUi();
        if (state.mode === "quick-picks") {
          const activeTemplate = getActiveTemplate();
          setSelectionHint(activeTemplate
            ? `${platformLabels[activeTemplate.platform]} · ${activeTemplate.category} is still loaded. Edit it or copy it.`
            : "Comment Library is ready — choose a card to load it into your comment."
          );
        } else {
          setSelectionHint("Type or paste text in your comment bar, then swap styles or optional extras.");
        }
      });
    });

    document.querySelectorAll("[data-platform]").forEach((button) => {
      button.addEventListener("click", () => {
        state.platform = button.dataset.platform;
        state.showAllTemplates = false;
        document.querySelectorAll("[data-platform]").forEach((item) => {
          item.classList.toggle("active", item.dataset.platform === state.platform);
        });
        renderQuickPickCategoryTabs();
        renderQuickPickCards();
      });
    });

    document.querySelectorAll("[data-style-mood]").forEach((button) => {
      button.addEventListener("click", () => {
        state.styleMood = button.dataset.styleMood;
        document.querySelectorAll("[data-style-mood]").forEach((item) => {
          item.classList.toggle("active", item.dataset.styleMood === state.styleMood);
        });
        renderStyleCards();
      });
    });

    elements.quickPickCategoryTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-quick-category]");
      if (!button) return;
      state.quickPickCategory = button.dataset.quickCategory;
      state.showAllTemplates = false;
      renderQuickPickCategoryTabs();
      renderQuickPickCards();
    });

    elements.quickPickCards.addEventListener("click", (event) => {
      const card = event.target.closest("[data-template-id]");
      if (!card) return;
      loadTemplate(card.dataset.templateId);
    });

    elements.styleCards.addEventListener("click", (event) => {
      const card = event.target.closest("[data-style-id]");
      if (!card) return;
      applyStyle(card.dataset.styleId);
    });

    elements.showMoreTemplatesBtn.addEventListener("click", () => {
      state.showAllTemplates = !state.showAllTemplates;
      renderQuickPickCards();
    });

    elements.decoratorTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-decorator-tab]");
      if (!button) return;
      state.decoratorTab = button.dataset.decoratorTab;
      state.selectedDecoratorId = null;
      renderDecoratorTabs();
      renderDecorators();
      syncInputUi();
    });

    elements.decoratorInventory.addEventListener("click", (event) => {
      const button = event.target.closest("[data-decorator-index]");
      if (!button) return;
      applyDecorator(Number(button.dataset.decoratorIndex));
    });

    if (elements.bracketsInventory) {
      elements.bracketsInventory.addEventListener("click", (event) => {
        const button = event.target.closest("[data-bracket-index]");
        if (!button) return;
        applyBracket(Number(button.dataset.bracketIndex));
      });
    }

    if (elements.emojiGroupTabs) {
      elements.emojiGroupTabs.addEventListener("click", (event) => {
        const button = event.target.closest("[data-emoji-group]");
        if (!button) return;
        state.emojiGroup = button.dataset.emojiGroup;
        state.emojiSearch = "";
        if (elements.emojiSearchInput) elements.emojiSearchInput.value = "";
        renderEmojiGroupTabs();
        renderEmojiInventory();
      });
    }

    elements.emojiInventory.addEventListener("click", (event) => {
      const button = event.target.closest("[data-emoji]");
      if (!button) return;
      appendEmoji(button.dataset.emoji);
    });

    if (elements.emojiSearchInput) {
      elements.emojiSearchInput.addEventListener("input", () => {
        state.emojiSearch = elements.emojiSearchInput.value || "";
        renderEmojiInventory();
      });
    }

    if (elements.inventoryModuleTabs) {
      elements.inventoryModuleTabs.addEventListener("click", (event) => {
        const button = event.target.closest("[data-inventory-module]");
        if (!button) return;
        state.inventoryModule = button.dataset.inventoryModule;
        updateInventoryModuleUi();
      });
    }

    if (elements.styleFurtherBtn) {
      elements.styleFurtherBtn.addEventListener("click", () => {
        state.mode = "style-your-own";
        updateModeUi();
        syncInputUi();
        setSelectionHint("Choose a style below to apply to your comment, or open optional extras.");
      });
    }

    elements.mainInput.addEventListener("input", () => {
      syncInputUi();
      scheduleStyleCardRender();
      scheduleInputHistoryPush();
    });

    if (elements.clearStylingBtn) {
      elements.clearStylingBtn.addEventListener("click", () => {
        state.selectedStyleId = null;
        state.selectedDecoratorId = null;
        state.selectedBracketIndex = null;
        state.selectedEmoji = null;
        state.selectedTemplateId = null;
        syncInputUi();
        renderStyleCards();
        renderDecorators();
        renderBracketsInventory();
        renderEmojiInventory();
        pushHistory();
        setSelectionHint("Styling cleared. Your text stayed the same.");
      });
    }

    if (elements.clearTextBtn) {
      elements.clearTextBtn.addEventListener("click", () => {
        elements.mainInput.value = "";
        state.selectedTemplateId = null;
        syncInputUi();
        renderQuickPickCards();
        renderStyleCards();
        pushHistory();
        setSelectionHint("Text cleared.");
        elements.mainInput.focus();
      });
    }

    if (elements.clearDecoratorBtn) {
      elements.clearDecoratorBtn.addEventListener("click", () => {
        state.selectedDecoratorId = null;
        syncInputUi();
        renderDecorators();
        pushHistory();
        setSelectionHint("Word-stamp cleared.");
      });
    }

    if (elements.clearBracketBtn) {
      elements.clearBracketBtn.addEventListener("click", () => {
        state.selectedBracketIndex = null;
        syncInputUi();
        renderBracketsInventory();
        pushHistory();
        setSelectionHint("Frame cleared.");
      });
    }

    if (elements.clearEmojiBtn) {
      elements.clearEmojiBtn.addEventListener("click", () => {
        state.selectedEmoji = null;
        syncInputUi();
        renderEmojiInventory();
        pushHistory();
        setSelectionHint("Emoji accent cleared.");
      });
    }

    window.addEventListener("keydown", handleUndoRedo);

    elements.copyMainBtn.addEventListener("click", copyMainText);

    document.querySelectorAll(".faq-question").forEach((question) => {
      question.addEventListener("click", () => {
        question.parentElement.classList.toggle("open");
      });
    });
  }

  function init() {
    if (!elements.mainInput || !elements.quickPickCategoryTabs || !elements.quickPickCards || !elements.styleCards) {
      console.warn("Comment style page could not initialize because required elements were not found.");
      return;
    }

    updateModeUi();
    document.querySelectorAll("[data-platform]").forEach((item) => {
      item.classList.toggle("active", item.dataset.platform === state.platform);
    });
    document.querySelectorAll("[data-style-mood]").forEach((item) => {
      item.classList.toggle("active", item.dataset.styleMood === state.styleMood);
    });

    renderQuickPickCategoryTabs();
    renderQuickPickCards();
    renderStyleCards();
    renderDecoratorTabs();
    renderDecorators();
    renderBracketsInventory();
    renderEmojiGroupTabs();
    renderEmojiInventory();
    syncInputUi();
    bindEvents();
    updateInventoryModuleUi();
    pushHistory();
    setSelectionHint("Comment Library is ready — choose a card to load it into your comment.");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
