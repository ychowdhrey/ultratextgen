/*!
 * UltraTextGen — Text to Emoji tool (shared engine + UI)
 * Used by /usecase/text-to-emoji/ (hub), /usecase/emoji-to-text/ and
 * /usecase/emoji-letters/ (spokes). Configure per page via
 * window.EMOJI_TOOL_CONFIG before this script loads.
 */
(function () {
  "use strict";

    const EMOJI_LEXICON_EN = {
      // --- Emotions & reactions ---
      "love": "❤️", "loves": "❤️", "loved": "❤️", "loving": "❤️", "heart": "❤️",
      "hearts": "💕", "romance": "💕", "romantic": "💕",
      "heartbroken": "💔", "heartbreak": "💔", "breakup": "💔",
      "adore": "😍", "crush": "😍", "beautiful": "😍", "pretty": "😍", "gorgeous": "😍",
      "cute": "🥰", "adorable": "🥰", "lovely": "🥰",
      "happy": "😊", "happiness": "😊", "glad": "😊", "smile": "😊", "smiling": "😊", "nice": "😊", "kind": "😊",
      "joy": "😄", "joyful": "😄",
      "laugh": "😂", "laughing": "😂", "laughed": "😂", "lol": "😂", "funny": "😂", "joke": "😂",
      "hilarious": "🤣",
      "sad": "😢", "sadness": "😢", "cry": "😢",
      "crying": "😭", "cried": "😭", "tears": "😭", "sob": "😭",
      "angry": "😠", "anger": "😠",
      "mad": "😡", "furious": "😡",
      "rage": "🤬",
      "annoyed": "😒",
      "frustrated": "😤",
      "scared": "😱", "scary": "😱", "terrified": "😱", "horror": "😱", "scream": "😱",
      "afraid": "😨", "fear": "😨",
      "worried": "😟", "worry": "😟",
      "anxious": "😰",
      "stressed": "😫",
      "nervous": "😬", "awkward": "😬",
      "shy": "😳", "embarrassed": "😳", "blush": "😳",
      "surprised": "😲", "surprise": "😲", "shocked": "😲",
      "wow": "😮",
      "amazed": "🤩", "amazing": "🤩", "awesome": "🤩", "excited": "🤩",
      "cool": "😎", "chill": "😎",
      "tired": "😴", "sleepy": "😴", "sleep": "😴", "sleeping": "😴", "nap": "😴",
      "exhausted": "😩", "weary": "😩",
      "bored": "🥱", "boring": "🥱", "yawn": "🥱",
      "sick": "🤒", "ill": "🤒", "fever": "🤒",
      "sneeze": "🤧", "flu": "🤧",
      "hurt": "🤕", "injured": "🤕", "pain": "🤕",
      "gross": "🤢", "disgusting": "🤢", "nauseous": "🤢",
      "vomit": "🤮", "puke": "🤮",
      "dizzy": "😵",
      "drunk": "🥴",
      "kiss": "😘", "kisses": "😘", "kissing": "😘",
      "wink": "😉", "flirt": "😉",
      "hug": "🤗", "hugs": "🤗", "cuddle": "🤗", "welcome": "🤗",
      "think": "🤔", "thinking": "🤔", "wonder": "🤔", "hmm": "🤔",
      "confused": "😕",
      "crazy": "🤪", "goofy": "🤪", "weird": "🤪",
      "silly": "😜",
      "smirk": "😏", "sexy": "😏",
      "sassy": "💁",
      "shrug": "🤷", "dunno": "🤷", "maybe": "🤷",
      "whatever": "🙄",
      "upset": "😞", "disappointed": "😞",
      "depressed": "😔", "sorry": "😔", "lonely": "😔",
      "calm": "😌", "relax": "😌", "relaxed": "😌",
      "relief": "😅", "phew": "😅",
      "angel": "😇", "innocent": "😇",
      "devil": "😈", "evil": "😈", "naughty": "😈",
      "quiet": "🤫", "secret": "🤫", "shush": "🤫",
      "speechless": "😶",
      "salute": "🫡", "respect": "🫡",
      "cowboy": "🤠",
      "nerd": "🤓", "geek": "🤓",
      "please": "🙏", "pray": "🙏", "prayer": "🙏", "thanks": "🙏", "thank": "🙏", "grateful": "🙏", "blessed": "🙏",
      "hope": "🤞", "hopefully": "🤞",
      "luck": "🍀", "lucky": "🍀",
      "miss": "🥺", "missing": "🥺", "beg": "🥺",
      "dead": "💀", "death": "💀", "die": "💀", "skull": "💀",
      "poop": "💩", "poo": "💩",
      "ghost": "👻", "spooky": "👻",
      "clown": "🤡",
      "alien": "👽",
      "robot": "🤖",
      "monster": "👹",
      "zombie": "🧟",
      "vampire": "🧛",
      "wizard": "🧙", "witch": "🧙",
      "fairy": "🧚",
      "mermaid": "🧜",
      "superhero": "🦸", "hero": "🦸",
      "santa": "🎅",

      // --- People, pronouns & family ---
      "i": "👤", "me": "👤", "you": "👤", "myself": "👤", "person": "👤", "human": "👤", "somebody": "👤", "someone": "👤",
      "we": "👥", "us": "👥", "they": "👥", "them": "👥", "everyone": "👥", "everybody": "👥", "people": "👥", "team": "👥",
      "man": "👨", "men": "👨", "guy": "👨", "dude": "👨",
      "woman": "👩", "women": "👩", "lady": "👩",
      "boy": "👦", "boys": "👦", "brother": "👦",
      "girl": "👧", "girls": "👧", "sister": "👧",
      "kid": "🧒", "kids": "🧒", "child": "🧒", "children": "🧒", "young": "🧒",
      "baby": "👶", "babies": "👶", "born": "👶", "birth": "👶", "infant": "👶",
      "mom": "👩", "mum": "👩", "mother": "👩", "mommy": "👩", "mama": "👩",
      "dad": "👨", "father": "👨", "daddy": "👨", "papa": "👨",
      "parents": "👪", "family": "👪", "families": "👪",
      "grandma": "👵", "grandmother": "👵", "granny": "👵",
      "grandpa": "👴", "grandfather": "👴", "old": "👴", "elderly": "👴",
      "friend": "👫", "friends": "👫", "buddy": "👫", "bestie": "👫",
      "couple": "💑",
      "wedding": "💒",
      "marry": "💍", "married": "💍", "marriage": "💍", "engaged": "💍", "ring": "💍",
      "bride": "👰",
      "groom": "🤵",
      "king": "👑", "crown": "👑", "royal": "👑",
      "queen": "👸", "princess": "👸",
      "prince": "🤴",
      "pregnant": "🤰",
      "teacher": "🧑‍🏫",
      "student": "🧑‍🎓",
      "doctor": "🧑‍⚕️", "nurse": "🧑‍⚕️",
      "chef": "🧑‍🍳",
      "farmer": "🧑‍🌾",
      "artist": "🧑‍🎨",
      "pilot": "🧑‍✈️",
      "astronaut": "🧑‍🚀",
      "firefighter": "🧑‍🚒",
      "police": "👮", "cop": "👮",
      "detective": "🕵️", "spy": "🕵️",
      "guard": "💂",
      "worker": "👷", "builder": "👷", "construction": "👷",
      "dancer": "💃",
      "singer": "🎤",

      // --- Body & gestures ---
      "hello": "👋", "hi": "👋", "hey": "👋", "bye": "👋", "goodbye": "👋", "wave": "👋",
      "clap": "👏", "applause": "👏", "bravo": "👏",
      "yes": "👍", "good": "👍", "great": "👍", "like": "👍",
      "ok": "👌", "okay": "👌",
      "no": "👎", "bad": "👎", "dislike": "👎", "nope": "👎",
      "peace": "✌️",
      "fist": "✊",
      "punch": "👊",
      "fight": "🥊", "boxing": "🥊",
      "handshake": "🤝", "deal": "🤝", "agree": "🤝",
      "muscle": "💪", "strong": "💪", "strength": "💪", "power": "💪", "powerful": "💪", "flex": "💪",
      "hands": "🙌", "hooray": "🙌", "praise": "🙌",
      "hand": "✋",
      "eyes": "👀", "look": "👀", "looking": "👀", "see": "👀", "watch": "👀", "stare": "👀",
      "eye": "👁️",
      "ear": "👂", "hear": "👂",
      "nose": "👃", "smell": "👃",
      "mouth": "👄", "lips": "👄",
      "tongue": "👅",
      "tooth": "🦷", "teeth": "🦷", "dentist": "🦷",
      "bone": "🦴",
      "brain": "🧠", "smart": "🧠", "genius": "🧠", "mind": "🧠",
      "leg": "🦵",
      "foot": "🦶", "feet": "🦶",
      "blood": "🩸",
      "selfie": "🤳",
      "write": "✍️", "writing": "✍️", "wrote": "✍️",
      "walk": "🚶", "walking": "🚶", "walked": "🚶",

      // --- Food & drink ---
      "food": "🍽️", "eat": "🍽️", "eating": "🍽️", "ate": "🍽️", "dinner": "🍽️", "meal": "🍽️", "restaurant": "🍽️",
      "lunch": "🥪", "sandwich": "🥪",
      "breakfast": "🥞", "pancake": "🥞", "pancakes": "🥞",
      "waffle": "🧇",
      "bacon": "🥓",
      "egg": "🥚", "eggs": "🥚",
      "bread": "🍞", "toast": "🍞",
      "butter": "🧈",
      "cheese": "🧀",
      "pizza": "🍕",
      "burger": "🍔", "hamburger": "🍔",
      "fries": "🍟",
      "hotdog": "🌭",
      "taco": "🌮", "tacos": "🌮",
      "burrito": "🌯",
      "popcorn": "🍿",
      "salad": "🥗", "healthy": "🥗",
      "soup": "🍲", "stew": "🍲",
      "noodles": "🍜", "ramen": "🍜",
      "pasta": "🍝", "spaghetti": "🍝",
      "rice": "🍚",
      "sushi": "🍣",
      "shrimp": "🍤",
      "curry": "🍛",
      "steak": "🥩", "meat": "🥩", "beef": "🥩",
      "turkey": "🦃", "thanksgiving": "🦃",
      "hungry": "🤤", "drool": "🤤",
      "yummy": "😋", "delicious": "😋", "tasty": "😋",
      "apple": "🍎", "apples": "🍎", "fruit": "🍎",
      "banana": "🍌", "bananas": "🍌",
      "orange": "🍊",
      "lemon": "🍋", "sour": "🍋",
      "grape": "🍇", "grapes": "🍇",
      "strawberry": "🍓", "strawberries": "🍓",
      "watermelon": "🍉",
      "melon": "🍈",
      "peach": "🍑",
      "pear": "🍐",
      "cherry": "🍒", "cherries": "🍒",
      "pineapple": "🍍",
      "mango": "🥭",
      "coconut": "🥥",
      "kiwi": "🥝",
      "avocado": "🥑",
      "tomato": "🍅",
      "potato": "🥔",
      "carrot": "🥕",
      "corn": "🌽",
      "pepper": "🌶️", "spicy": "🌶️",
      "broccoli": "🥦", "vegetable": "🥦", "vegetables": "🥦",
      "mushroom": "🍄",
      "onion": "🧅",
      "garlic": "🧄",
      "peanut": "🥜", "nut": "🥜", "nuts": "🥜",
      "honey": "🍯",
      "cake": "🍰",
      "cupcake": "🧁", "bake": "🧁", "baking": "🧁",
      "cookie": "🍪", "cookies": "🍪",
      "donut": "🍩", "doughnut": "🍩",
      "candy": "🍬", "sweet": "🍬", "sweets": "🍬", "sugar": "🍬",
      "chocolate": "🍫",
      "lollipop": "🍭",
      "pie": "🥧",
      "icecream": "🍦",
      "dessert": "🍨",
      "coffee": "☕", "cafe": "☕", "espresso": "☕",
      "tea": "🍵",
      "milk": "🥛",
      "juice": "🧃",
      "soda": "🥤", "drink": "🥤",
      "beer": "🍺",
      "beers": "🍻", "bar": "🍻", "pub": "🍻",
      "cheers": "🥂",
      "wine": "🍷",
      "cocktail": "🍸",
      "champagne": "🍾",
      "whiskey": "🥃",
      "bottle": "🍼",
      "salt": "🧂", "salty": "🧂",

      // --- Animals ---
      "dog": "🐶", "dogs": "🐶", "puppy": "🐶",
      "cat": "🐱", "cats": "🐱", "kitten": "🐱", "kitty": "🐱",
      "pet": "🐾", "paw": "🐾", "animal": "🐾", "animals": "🐾",
      "mouse": "🐭",
      "hamster": "🐹",
      "rabbit": "🐰", "bunny": "🐰", "easter": "🐰",
      "fox": "🦊",
      "bear": "🐻",
      "panda": "🐼",
      "koala": "🐨",
      "tiger": "🐯",
      "lion": "🦁",
      "cow": "🐮",
      "pig": "🐷",
      "frog": "🐸",
      "monkey": "🐵",
      "chicken": "🐔", "rooster": "🐓", "chick": "🐣",
      "penguin": "🐧",
      "bird": "🐦", "birds": "🐦",
      "duck": "🦆",
      "eagle": "🦅",
      "owl": "🦉",
      "bat": "🦇",
      "wolf": "🐺",
      "horse": "🐴", "pony": "🐴",
      "unicorn": "🦄",
      "bee": "🐝",
      "butterfly": "🦋",
      "snail": "🐌",
      "bug": "🐛", "insect": "🐛", "caterpillar": "🐛",
      "ant": "🐜", "small": "🐜", "tiny": "🐜",
      "spider": "🕷️",
      "scorpion": "🦂",
      "turtle": "🐢", "slow": "🐢",
      "snake": "🐍",
      "lizard": "🦎",
      "dinosaur": "🦖",
      "octopus": "🐙",
      "squid": "🦑",
      "crab": "🦀",
      "lobster": "🦞",
      "fish": "🐟",
      "dolphin": "🐬",
      "whale": "🐳",
      "shark": "🦈",
      "crocodile": "🐊", "alligator": "🐊",
      "elephant": "🐘", "big": "🐘", "huge": "🐘", "giant": "🐘",
      "giraffe": "🦒", "tall": "🦒",
      "zebra": "🦓",
      "rhino": "🦏",
      "hippo": "🦛",
      "camel": "🐫",
      "llama": "🦙",
      "kangaroo": "🦘",
      "gorilla": "🦍",
      "sheep": "🐑", "lamb": "🐑",
      "goat": "🐐",
      "deer": "🦌",
      "dragon": "🐉",
      "flamingo": "🦩",
      "parrot": "🦜",
      "peacock": "🦚",
      "swan": "🦢",
      "sloth": "🦥", "lazy": "🦥",
      "otter": "🦦",
      "raccoon": "🦝",
      "hedgehog": "🦔",
      "squirrel": "🐿️",
      "rat": "🐀",

      // --- Nature & weather ---
      "sun": "☀️", "sunny": "☀️", "sunshine": "☀️", "summer": "☀️",
      "moon": "🌙", "night": "🌙", "tonight": "🌙", "goodnight": "🌙",
      "star": "⭐",
      "stars": "✨", "sparkle": "✨", "shine": "✨", "shiny": "✨", "bright": "✨", "new": "✨",
      "magic": "🪄", "wand": "🪄",
      "wish": "🌠",
      "cloud": "☁️", "clouds": "☁️", "cloudy": "☁️",
      "rain": "🌧️", "rainy": "🌧️", "raining": "🌧️",
      "storm": "⛈️", "thunder": "⛈️",
      "lightning": "⚡", "electric": "⚡", "energy": "⚡", "quick": "⚡",
      "snow": "❄️", "snowy": "❄️", "winter": "❄️",
      "cold": "🥶", "freezing": "🥶",
      "ice": "🧊",
      "snowman": "⛄",
      "wind": "💨", "windy": "💨", "fast": "💨", "speed": "💨",
      "tornado": "🌪️",
      "rainbow": "🌈",
      "fire": "🔥", "hot": "🔥", "flame": "🔥", "burn": "🔥", "burning": "🔥", "lit": "🔥",
      "fog": "🌫️",
      "water": "💧", "drop": "💧", "wet": "💧",
      "ocean": "🌊", "sea": "🌊", "waves": "🌊", "tide": "🌊",
      "beach": "🏖️", "vacation": "🏖️", "holiday": "🏖️",
      "island": "🏝️",
      "desert": "🏜️",
      "mountain": "⛰️",
      "mountains": "🏔️",
      "volcano": "🌋",
      "tree": "🌳", "trees": "🌳", "forest": "🌳", "park": "🌳",
      "wood": "🪵",
      "palm": "🌴", "tropical": "🌴",
      "cactus": "🌵",
      "leaf": "🍃", "leaves": "🍃",
      "plant": "🌱", "grow": "🌱", "growing": "🌱", "seed": "🌱",
      "grass": "🌿", "herb": "🌿",
      "flower": "🌸", "blossom": "🌸", "spring": "🌸", "pink": "🌸",
      "flowers": "💐", "bouquet": "💐",
      "rose": "🌹", "roses": "🌹",
      "tulip": "🌷", "garden": "🌷",
      "sunflower": "🌻",
      "autumn": "🍂", "fall": "🍂",
      "earth": "🌍", "world": "🌍", "global": "🌍",
      "planet": "🪐",
      "space": "🌌", "galaxy": "🌌", "universe": "🌌",
      "comet": "☄️", "meteor": "☄️",
      "rock": "🪨", "stone": "🪨",
      "diamond": "💎", "gem": "💎", "jewel": "💎",
      "morning": "🌅", "sunrise": "🌅",
      "sunset": "🌇",
      "evening": "🌆",
      "midnight": "🌃",
      "dark": "🌑", "darkness": "🌑",

      // --- Activities & verbs ---
      "run": "🏃", "running": "🏃", "ran": "🏃", "jog": "🏃", "jogging": "🏃", "marathon": "🏃",
      "dream": "💭", "dreams": "💭", "dreaming": "💭",
      "wake": "⏰", "alarm": "⏰", "late": "⏰",
      "dance": "💃", "dancing": "💃", "danced": "💃",
      "sing": "🎤", "singing": "🎤", "sang": "🎤", "karaoke": "🎤", "concert": "🎤", "microphone": "🎤",
      "song": "🎵", "songs": "🎵", "music": "🎵",
      "melody": "🎶", "tune": "🎶",
      "drive": "🚗", "driving": "🚗", "drove": "🚗", "car": "🚗", "cars": "🚗",
      "fly": "✈️", "flying": "✈️", "flew": "✈️", "flight": "✈️", "plane": "✈️", "airplane": "✈️",
      "swim": "🏊", "swimming": "🏊", "swam": "🏊", "pool": "🏊",
      "dive": "🤿",
      "read": "📖", "reading": "📖", "book": "📖", "story": "📖",
      "draw": "🎨", "drawing": "🎨", "paint": "🎨", "painting": "🎨", "art": "🎨", "color": "🎨",
      "play": "🎮", "playing": "🎮", "game": "🎮", "games": "🎮", "gaming": "🎮", "gamer": "🎮",
      "work": "💼", "working": "💼", "job": "💼", "business": "💼", "boss": "💼",
      "office": "🏢", "apartment": "🏢", "building": "🏢",
      "study": "📚", "studying": "📚", "learn": "📚", "books": "📚", "library": "📚",
      "homework": "📝", "exam": "📝", "test": "📝", "note": "📝", "notes": "📝", "list": "📝",
      "school": "🏫",
      "university": "🎓", "college": "🎓", "graduate": "🎓", "graduation": "🎓", "degree": "🎓",
      "party": "🎉", "parties": "🎉", "celebrate": "🎉", "celebration": "🎉",
      "congratulations": "🎉", "congrats": "🎉", "fun": "🎉", "weekend": "🎉",
      "festival": "🎊", "confetti": "🎊",
      "win": "🏆", "winner": "🏆", "winning": "🏆", "won": "🏆", "victory": "🏆",
      "champion": "🏆", "trophy": "🏆", "best": "🏆", "prize": "🏆",
      "medal": "🏅", "sport": "🏅", "sports": "🏅",
      "first": "🥇",
      "travel": "🧳", "trip": "🧳", "luggage": "🧳", "suitcase": "🧳",
      "adventure": "🗺️", "explore": "🗺️", "map": "🗺️", "journey": "🗺️",
      "camp": "⛺", "camping": "⛺", "tent": "⛺",
      "hike": "🥾", "hiking": "🥾",
      "climb": "🧗", "climbing": "🧗",
      "fishing": "🎣",
      "shop": "🛍️", "shopping": "🛍️", "mall": "🛍️",
      "buy": "🛒", "groceries": "🛒", "cart": "🛒",
      "cook": "🍳", "cooking": "🍳", "kitchen": "🍳",
      "clean": "🧹", "cleaning": "🧹", "sweep": "🧹", "broom": "🧹",
      "wash": "🧼", "soap": "🧼",
      "shower": "🚿",
      "bath": "🛁",
      "talk": "💬", "talking": "💬", "chat": "💬", "say": "💬", "said": "💬", "text": "💬", "message": "💬",
      "speak": "🗣️", "speech": "🗣️", "shout": "🗣️",
      "call": "📞", "calling": "📞", "called": "📞",
      "email": "📧",
      "mail": "📬",
      "letter": "✉️", "envelope": "✉️",
      "send": "📤",
      "package": "📦", "box": "📦", "delivery": "📦",
      "listen": "🎧", "headphones": "🎧", "podcast": "🎧", "dj": "🎧",
      "movie": "🎬", "movies": "🎬", "film": "🎬", "cinema": "🎬",
      "tv": "📺", "television": "📺", "show": "📺",
      "video": "📹",
      "photo": "📸", "photos": "📸", "photography": "📸",
      "picture": "🖼️", "pictures": "🖼️",
      "camera": "📷",
      "bike": "🚲", "bicycle": "🚲",
      "cycling": "🚴", "biking": "🚴", "ride": "🚴",
      "skate": "🛹", "skateboard": "🛹",
      "ski": "⛷️", "skiing": "⛷️",
      "snowboard": "🏂",
      "surf": "🏄", "surfing": "🏄",
      "sail": "⛵", "sailing": "⛵", "boat": "⛵",
      "row": "🚣",
      "help": "🆘", "sos": "🆘",
      "emergency": "🚨", "alert": "🚨", "siren": "🚨",
      "stop": "🛑",
      "wait": "⏳", "waiting": "⏳", "patience": "⏳", "soon": "⏳",
      "vote": "🗳️", "election": "🗳️",
      "finish": "🏁", "race": "🏁",
      "racing": "🏎️",
      "done": "✅", "complete": "✅", "check": "✅", "correct": "✅", "approved": "✅",
      "wrong": "❌", "error": "❌", "fail": "❌",
      "forbidden": "🚫", "banned": "🚫",
      "warning": "⚠️", "danger": "⚠️", "careful": "⚠️", "caution": "⚠️",
      "question": "❓",
      "important": "❗",
      "attention": "📢", "announcement": "📢",
      "news": "📰", "newspaper": "📰",
      "search": "🔍", "find": "🔍", "investigate": "🔍",
      "link": "🔗",
      "pin": "📌",
      "location": "📍", "here": "📍",
      "compass": "🧭", "direction": "🧭",
      "recycle": "♻️",
      "gift": "🎁", "gifts": "🎁", "present": "🎁", "presents": "🎁", "give": "🎁", "giving": "🎁",
      "smoke": "🚬", "cigarette": "🚬",
      "meditate": "🧘", "meditation": "🧘", "yoga": "🧘", "zen": "🧘",
      "gym": "🏋️", "workout": "🏋️", "exercise": "🏋️", "lift": "🏋️", "fitness": "🏋️",
      "cheer": "📣", "megaphone": "📣",

      // --- Objects & tech ---
      "phone": "📱", "phones": "📱", "mobile": "📱", "cellphone": "📱",
      "telephone": "☎️",
      "computer": "💻", "laptop": "💻", "technology": "💻",
      "keyboard": "⌨️",
      "screen": "🖥️", "desktop": "🖥️",
      "internet": "🌐", "web": "🌐", "online": "🌐", "website": "🌐",
      "wifi": "📶", "signal": "📶",
      "battery": "🔋", "charge": "🔋",
      "charger": "🔌", "plug": "🔌",
      "money": "💰",
      "cash": "💵", "dollar": "💵", "dollars": "💵",
      "pay": "💸", "paid": "💸", "spend": "💸", "expensive": "💸", "broke": "💸",
      "rich": "🤑", "wealthy": "🤑",
      "bank": "🏦",
      "card": "💳", "credit": "💳",
      "coin": "🪙", "gold": "🪙",
      "invest": "📈", "stocks": "📈", "profit": "📈", "growth": "📈",
      "chart": "📊", "data": "📊", "statistics": "📊", "graph": "📊",
      "taxi": "🚕",
      "bus": "🚌",
      "truck": "🚚",
      "train": "🚆",
      "subway": "🚇", "metro": "🚇",
      "airport": "🛫",
      "rocket": "🚀", "launch": "🚀",
      "ship": "🚢", "cruise": "🚢",
      "motorcycle": "🏍️",
      "helicopter": "🚁",
      "scooter": "🛴",
      "ufo": "🛸",
      "anchor": "⚓",
      "fuel": "⛽", "gas": "⛽",
      "tractor": "🚜", "farm": "🚜",
      "ambulance": "🚑",
      "firetruck": "🚒",
      "house": "🏠", "home": "🏠",
      "door": "🚪",
      "window": "🪟",
      "bed": "🛏️", "bedroom": "🛏️",
      "sofa": "🛋️", "couch": "🛋️",
      "chair": "🪑",
      "light": "💡", "lightbulb": "💡", "idea": "💡", "lamp": "💡",
      "key": "🔑", "keys": "🔑",
      "lock": "🔒", "locked": "🔒", "secure": "🔒", "private": "🔒",
      "unlock": "🔓",
      "pen": "🖊️",
      "pencil": "✏️",
      "paper": "📄", "page": "📄", "document": "📄",
      "scissors": "✂️", "cut": "✂️",
      "hammer": "🔨",
      "tool": "🔧", "fix": "🔧", "repair": "🔧", "wrench": "🔧",
      "tools": "🧰",
      "build": "🏗️",
      "magnet": "🧲",
      "telescope": "🔭", "astronomy": "🔭",
      "microscope": "🔬", "science": "🔬", "scientist": "🔬",
      "experiment": "🧪", "chemistry": "🧪", "lab": "🧪",
      "dna": "🧬",
      "virus": "🦠", "germ": "🦠", "bacteria": "🦠",
      "medicine": "💊", "pill": "💊", "pills": "💊", "vitamin": "💊",
      "injection": "💉", "vaccine": "💉",
      "hospital": "🏥",
      "mask": "😷",
      "clock": "🕐",
      "time": "⏰",
      "hourglass": "⌛",
      "calendar": "📅", "date": "📅", "schedule": "📅", "today": "📅",
      "tomorrow": "📅", "week": "📅", "month": "📅", "year": "📅",
      "balloon": "🎈", "balloons": "🎈",
      "candle": "🕯️", "candles": "🕯️",
      "bell": "🔔", "notification": "🔔",
      "hat": "🎩",
      "cap": "🧢",
      "shirt": "👕", "tshirt": "👕", "clothes": "👕",
      "pants": "👖", "jeans": "👖",
      "dress": "👗", "fashion": "👗",
      "shoe": "👟", "shoes": "👟", "sneakers": "👟",
      "boots": "👢",
      "sock": "🧦", "socks": "🧦",
      "gloves": "🧤",
      "scarf": "🧣",
      "coat": "🧥", "jacket": "🧥",
      "glasses": "👓",
      "sunglasses": "🕶️",
      "umbrella": "☂️",
      "bag": "👜", "handbag": "👜",
      "backpack": "🎒",
      "purse": "👛",
      "lipstick": "💄", "makeup": "💄",
      "toilet": "🚽",
      "trash": "🗑️", "garbage": "🗑️",
      "toothbrush": "🪥",
      "knife": "🔪",
      "sword": "⚔️", "battle": "⚔️", "war": "⚔️",
      "gun": "🔫",
      "bomb": "💣",
      "explosion": "💥", "explode": "💥", "boom": "💥", "crash": "💥",
      "shield": "🛡️", "protect": "🛡️", "protection": "🛡️",
      "crystal": "🔮", "fortune": "🔮", "future": "🔮",
      "dice": "🎲", "random": "🎲",
      "puzzle": "🧩",
      "toy": "🧸", "teddy": "🧸",
      "kite": "🪁",
      "flag": "🚩",
      "ticket": "🎫", "tickets": "🎫",
      "theater": "🎭", "drama": "🎭", "actor": "🎭",
      "target": "🎯", "goal": "🎯", "aim": "🎯", "focus": "🎯",
      "arrow": "🏹", "archery": "🏹", "bow": "🏹",
      "guitar": "🎸",
      "piano": "🎹",
      "drum": "🥁", "drums": "🥁",
      "violin": "🎻",
      "trumpet": "🎺",
      "saxophone": "🎷", "jazz": "🎷",
      "radio": "📻",
      "speaker": "🔊", "loud": "🔊", "volume": "🔊",
      "mute": "🔇", "silent": "🔇",
      "history": "📜", "scroll": "📜", "ancient": "📜",
      "coffin": "⚰️", "funeral": "⚰️",

      // --- Time & holidays ---
      "birthday": "🎂",
      "christmas": "🎄", "xmas": "🎄",
      "halloween": "🎃", "pumpkin": "🎃",
      "fireworks": "🎆", "firework": "🎆",
      "valentine": "💝", "valentines": "💝",
      "forever": "♾️", "infinity": "♾️", "always": "♾️",

      // --- Places ---
      "city": "🏙️",
      "town": "🏘️", "village": "🏘️", "neighborhood": "🏘️",
      "church": "⛪",
      "mosque": "🕌",
      "hotel": "🏨",
      "club": "🪩", "disco": "🪩",
      "store": "🏪", "market": "🏪",
      "museum": "🏛️",
      "castle": "🏰", "palace": "🏰",
      "tower": "🗼",
      "bridge": "🌉",
      "road": "🛣️", "street": "🛣️", "highway": "🛣️",
      "stadium": "🏟️",
      "factory": "🏭",

      // --- Sports & games ---
      "soccer": "⚽", "ball": "⚽",
      "football": "🏈",
      "basketball": "🏀",
      "baseball": "⚾",
      "tennis": "🎾",
      "volleyball": "🏐",
      "rugby": "🏉",
      "golf": "⛳",
      "bowling": "🎳",
      "pingpong": "🏓",
      "badminton": "🏸",
      "hockey": "🏒",
      "cricket": "🏏",
      "karate": "🥋", "judo": "🥋",
      "wrestling": "🤼",
      "gymnastics": "🤸",
      "chess": "♟️",

      // --- Common adjectives & misc ---
      "perfect": "💯", "hundred": "💯", "totally": "💯",
      "free": "🆓",
      "sale": "🏷️", "cheap": "🏷️", "price": "🏷️", "tag": "🏷️",
      "top": "🔝",
      "up": "⬆️",
      "down": "⬇️",
      "number": "🔢", "numbers": "🔢", "math": "🔢", "count": "🔢",
      "red": "🔴",
      "blue": "🔵",
      "green": "🟢",
      "yellow": "🟡",
      "purple": "🟣",
      "black": "⚫",
      "white": "⚪",
      "brown": "🟤",
    };

    const EMOJI_TO_WORD_EN = {
      // Faces & feelings
      "😊": "happy", "😂": "laugh", "🤣": "hilarious", "😄": "joy", "😉": "wink",
      "😎": "cool", "😍": "beautiful", "🥰": "cute", "😘": "kiss", "😋": "yummy",
      "🤪": "crazy", "😜": "silly", "🤓": "nerd", "🤠": "cowboy", "😇": "angel",
      "😈": "devil", "😏": "smirk", "😌": "calm", "🤔": "thinking", "🤫": "quiet",
      "🤗": "hug", "😴": "sleep", "🥱": "bored", "😢": "sad", "😭": "crying",
      "😔": "sorry", "😞": "disappointed", "😩": "exhausted", "😫": "stressed",
      "😤": "frustrated", "😠": "angry", "😡": "furious", "🤬": "rage",
      "😱": "scared", "😨": "afraid", "😰": "anxious", "😟": "worried",
      "😕": "confused", "😬": "nervous", "😳": "embarrassed", "😲": "shocked",
      "😮": "wow", "🤩": "amazing", "🥳": "celebrate", "🥺": "please",
      "🤒": "sick", "🤕": "hurt", "🤢": "gross", "🤮": "vomit", "🤧": "sneeze",
      "😷": "mask", "🥶": "cold", "🥵": "hot", "😵": "dizzy", "🥴": "drunk",
      "🤑": "rich", "🤤": "hungry", "💀": "dead", "👻": "ghost", "👽": "alien",
      "🤖": "robot", "🤡": "clown", "💩": "poop", "🙄": "whatever", "🤷": "shrug",
      // Gestures & body
      "👍": "good", "👎": "bad", "👌": "okay", "✌️": "peace", "🤞": "hope",
      "👏": "applause", "🙌": "hooray", "🤝": "deal", "🙏": "thanks",
      "💪": "strong", "👋": "hello", "👀": "look", "👊": "punch", "✍️": "write",
      "🤳": "selfie", "🧠": "brain",
      // People
      "👶": "baby", "🧒": "kid", "👦": "boy", "👧": "girl", "👨": "man",
      "👩": "woman", "👴": "grandpa", "👵": "grandma", "👤": "person",
      "👥": "people", "👪": "family", "👫": "friends", "💑": "couple",
      "👑": "king", "👸": "queen", "🎅": "santa", "👮": "police",
      "💃": "dance", "🏃": "run", "🚶": "walk", "🏊": "swim",
      // Hearts & symbols
      "❤️": "love", "💔": "heartbroken", "💕": "romance", "💯": "perfect",
      "✨": "sparkle", "⭐": "star", "🔥": "fire", "💧": "water", "⚡": "lightning",
      "☀️": "sun", "🌙": "moon", "🌈": "rainbow", "☁️": "cloud", "🌧️": "rain",
      "⛈️": "storm", "❄️": "snow", "🌊": "ocean", "🌸": "flower", "🌹": "rose",
      "🌳": "tree", "🌵": "cactus", "🍀": "luck", "🍂": "autumn", "🌍": "world",
      "🌅": "sunrise", "🌇": "sunset", "💭": "dream", "💥": "boom",
      "💎": "diamond", "♾️": "forever", "🌱": "plant", "💐": "flowers",
      // Food & drink
      "🍕": "pizza", "🍔": "burger", "🍟": "fries", "🌮": "taco", "🍣": "sushi",
      "🍜": "noodles", "🍚": "rice", "🍞": "bread", "🧀": "cheese", "🥓": "bacon",
      "🍎": "apple", "🍌": "banana", "🍓": "strawberry", "🍉": "watermelon",
      "🥑": "avocado", "🎂": "birthday", "🍰": "cake", "🍪": "cookie",
      "🍩": "donut", "🍫": "chocolate", "🍬": "candy", "🍦": "ice cream",
      "☕": "coffee", "🍵": "tea", "🍺": "beer", "🍷": "wine", "🥂": "cheers",
      // Animals
      "🐶": "dog", "🐱": "cat", "🐰": "bunny", "🦊": "fox", "🐻": "bear",
      "🐼": "panda", "🦁": "lion", "🐯": "tiger", "🐮": "cow", "🐷": "pig",
      "🐸": "frog", "🐵": "monkey", "🐧": "penguin", "🐦": "bird", "🦉": "owl",
      "🐺": "wolf", "🐴": "horse", "🦄": "unicorn", "🐝": "bee", "🦋": "butterfly",
      "🐢": "turtle", "🐍": "snake", "🐟": "fish", "🐬": "dolphin", "🦈": "shark",
      "🐘": "elephant", "🐉": "dragon",
      // Objects, places & activities
      "📱": "phone", "💻": "computer", "📷": "camera", "📸": "photo",
      "🎬": "movie", "📺": "tv", "🎵": "music", "🎤": "sing", "🎸": "guitar",
      "🎧": "headphones", "📖": "book", "📚": "books", "✏️": "pencil",
      "📝": "note", "✉️": "letter", "📧": "email", "📞": "call", "💬": "chat",
      "📦": "package", "🎁": "gift", "🎈": "balloon", "🎉": "party",
      "🎊": "confetti", "🎆": "fireworks", "🎄": "christmas", "🎃": "halloween",
      "💰": "money", "💵": "cash", "💸": "pay", "🚗": "car", "🚌": "bus",
      "🚆": "train", "✈️": "plane", "🚀": "rocket", "🚲": "bike", "⛵": "boat",
      "🚢": "ship", "🏠": "home", "🏫": "school", "🏥": "hospital",
      "🏢": "office", "🏰": "castle", "🏖️": "beach", "⛰️": "mountain",
      "⏰": "time", "📅": "calendar", "🔑": "key", "🔒": "lock", "💡": "idea",
      "🔨": "hammer", "🔧": "fix", "💊": "medicine", "💉": "vaccine",
      "🎮": "game", "🎲": "dice", "🎯": "target", "⚽": "soccer",
      "🏀": "basketball", "🏈": "football", "⚾": "baseball", "🎾": "tennis",
      "⛳": "golf", "🏆": "winner", "🥇": "first", "🏅": "medal", "🏋️": "gym",
      "🧘": "yoga", "⛺": "camping", "🎣": "fishing", "🗺️": "map",
      "🧳": "travel", "👗": "dress", "👟": "shoes", "👓": "glasses",
      "🕶️": "sunglasses", "💍": "ring", "💒": "wedding", "🎓": "graduation",
      "💼": "work", "🛍️": "shopping", "✅": "done", "❌": "wrong",
      "⚠️": "warning", "🚫": "forbidden", "🛑": "stop", "🆘": "help",
      "❓": "question", "❗": "important", "🔍": "search", "📍": "location",
      "🔗": "link", "♻️": "recycle", "🔔": "bell", "🚨": "emergency",
      "🕯️": "candle", "🧹": "clean", "🛁": "bath", "🚿": "shower",
      "🧼": "soap", "🗑️": "trash", "🔪": "knife", "🔫": "gun", "💣": "bomb",
      "🛡️": "shield", "🪄": "magic", "🧩": "puzzle", "🧸": "teddy",
      "📰": "news", "📢": "announcement",
    };

    const STARTER_PHRASES_EN = [
      "I love you",
      "Happy Birthday",
      "Good morning sunshine",
      "Let's party tonight",
      "I'm so tired",
      "Pizza and movie night",
      "You are amazing",
      "Good luck",
      "I miss you",
      "Time to eat",
      "Best friends forever",
      "Happy New Year",
      "I love pizza",
      "Sweet dreams",
      "Let's go to the beach",
      "Congratulations",
    ];

    // ── Function words (kept as text; never force-mapped) ───────────────────────
    const STOP_WORDS_EN = new Set([
      'a','an','the','is','am','are','was','were','be','been','being',
      'of','to','in','on','at','by','for','with','as','it','its',
      'and','or','but','so','if','then','than','that','this','these','those',
      'do','does','did','has','have','had','will','would','can','could','should',
      'i','you','he','she','we','they','me','him','her','us','them','my','your'
    ]);

    // ── i18n: localized pages provide their own data via window.EMOJI_TOOL_CONFIG.
    // When a field is absent the English default is used, so existing English
    // pages behave exactly as before. ───────────────────────────────────────────
    const CFG = window.EMOJI_TOOL_CONFIG || {};
    const LANG = CFG.lang || 'en';
    const EMOJI_LEXICON = CFG.lexicon || EMOJI_LEXICON_EN;
    const EMOJI_TO_WORD = CFG.emojiToWord || EMOJI_TO_WORD_EN;
    const STARTER_PHRASES = (CFG.starterPhrases && CFG.starterPhrases.length) ? CFG.starterPhrases : STARTER_PHRASES_EN;
    const STOP_WORDS = CFG.stopWords ? new Set(CFG.stopWords) : STOP_WORDS_EN;
    const STRINGS = CFG.strings || {};

    // Letter mode: A–Z → regional indicator symbols (space-separated so pairs
    // don't merge into flags), digits → keycaps.
    const RI_BASE = 0x1F1E6; // 🇦
    function letterToEmoji(ch) {
      const c = ch.toLowerCase();
      if (c >= 'a' && c <= 'z') return String.fromCodePoint(RI_BASE + (c.charCodeAt(0) - 97));
      if (c >= '0' && c <= '9') return c + '️⃣'; // keycap
      return null;
    }

    // ── Word lookup with plural/tense fallback ──────────────────────────────────
    function lookupWord(raw) {
      const w = raw.toLowerCase();
      if (EMOJI_LEXICON[w]) return EMOJI_LEXICON[w];
      // Plural/tense fallback is English-specific. Localized lexicons carry their
      // own inflections, so we skip suffix-stripping for non-English pages to
      // avoid producing wrong matches.
      if (LANG !== 'en') return null;
      const tries = [];
      if (w.endsWith('ies') && w.length > 4) tries.push(w.slice(0, -3) + 'y');
      if (w.endsWith('es') && w.length > 3) tries.push(w.slice(0, -2));
      if (w.endsWith('s') && w.length > 2) tries.push(w.slice(0, -1));
      if (w.endsWith('ing') && w.length > 4) { tries.push(w.slice(0, -3)); tries.push(w.slice(0, -3) + 'e'); }
      if (w.endsWith('ed') && w.length > 3) { tries.push(w.slice(0, -2)); tries.push(w.slice(0, -1)); tries.push(w.slice(0, -2) + 'e'); }
      for (const t of tries) if (EMOJI_LEXICON[t]) return EMOJI_LEXICON[t];
      return null;
    }

    // Split a token into leading punct / core word / trailing punct.
    // Unicode-aware: the "core" keeps letters (\p{L}), numbers (\p{N}) and
    // combining marks (\p{M}, e.g. Devanagari matras, Arabic diacritics) so
    // non-Latin and accented words (café, süß, قطة, पिज़्ज़ा) resolve, while
    // surrounding punctuation is still stripped. ASCII English is unchanged.
    const TOKEN_RE = /^([^\p{L}\p{N}\p{M}]*)([\p{L}\p{N}\p{M}'’-]*?)([^\p{L}\p{N}\p{M}]*)$/u;
    function splitToken(tok) {
      const m = tok.match(TOKEN_RE);
      if (!m) return { lead: '', core: tok, trail: '' };
      return { lead: m[1], core: m[2], trail: m[3] };
    }

    // ── Conversion modes ────────────────────────────────────────────────────────
    // Returns { output: string, breakdown: [{word, emoji}] }

    function convertEmojify(text) {
      const parts = text.split(/(\s+)/);
      const out = [];
      const breakdown = [];
      for (const p of parts) {
        if (/^\s+$/.test(p) || p === '') { out.push(p); continue; }
        const { lead, core, trail } = splitToken(p);
        const emoji = core && !STOP_WORDS.has(core.toLowerCase()) ? lookupWord(core) : null;
        if (emoji) {
          out.push(lead + core + trail + ' ' + emoji);
          breakdown.push({ word: core, emoji });
        } else {
          out.push(p);
        }
      }
      return { output: out.join('').replace(/[ ]{2,}/g, ' ').trim(), breakdown };
    }

    function convertReplace(text) {
      const parts = text.split(/(\s+)/);
      const out = [];
      const breakdown = [];
      for (const p of parts) {
        if (/^\s+$/.test(p) || p === '') { out.push(p); continue; }
        const { lead, core, trail } = splitToken(p);
        const emoji = core && !STOP_WORDS.has(core.toLowerCase()) ? lookupWord(core) : null;
        if (emoji) {
          out.push(lead + emoji + trail);
          breakdown.push({ word: core, emoji });
        } else {
          out.push(p);
        }
      }
      return { output: out.join('').trim(), breakdown };
    }

    function convertLetters(text) {
      const out = [];
      const breakdown = [];
      const words = text.split(/(\s+)/);
      for (const w of words) {
        if (/^\s+$/.test(w)) { out.push('  '); continue; }
        const chars = [];
        for (const ch of w) {
          const e = letterToEmoji(ch);
          if (e) { chars.push(e); if (/[A-Za-z0-9]/.test(ch)) breakdown.push({ word: ch.toUpperCase(), emoji: e }); }
          else chars.push(ch);
        }
        out.push(chars.join(' '));
      }
      return { output: out.join('').trim(), breakdown };
    }

    function convertDecode(text) {
      const out = [];
      const breakdown = [];
      const seg = (typeof Intl !== 'undefined' && Intl.Segmenter)
        ? Array.from(new Intl.Segmenter(LANG, { granularity: 'grapheme' }).segment(text), s => s.segment)
        : Array.from(text);
      for (const g of seg) {
        if (/^\s+$/.test(g)) { out.push(' '); continue; }
        const word = EMOJI_TO_WORD[g] || EMOJI_TO_WORD[g.replace(/️/g, '')];
        if (word) { out.push(word + ' '); breakdown.push({ word, emoji: g }); }
        else if (/[A-Za-z0-9]/.test(g)) { out.push(g); }
        // unknown emoji: skip silently
      }
      return { output: out.join('').replace(/\s{2,}/g, ' ').trim(), breakdown };
    }

    const MODE_STR = STRINGS.modeStrings || {};
    const MODES = {
      emojify: { fn: convertEmojify, label: 'Emojified text', hint: 'Keeps your words and sprinkles a matching emoji after each one it recognises.' },
      replace: { fn: convertReplace, label: 'Emoji translation', hint: 'Swaps each recognised word for its emoji. Unmatched words stay as text.' },
      letters: { fn: convertLetters, label: 'Emoji letters', hint: 'Turns every letter into a boxed emoji letter — great for names and titles.' },
      decode:  { fn: convertDecode,  label: 'Decoded text', hint: 'Reverse mode: paste emoji and read them back as plain English words.' }
    };
    // Localized mode labels/hints override the English defaults where provided.
    for (const k in MODE_STR) {
      if (!MODES[k]) continue;
      if (MODE_STR[k].label) MODES[k].label = MODE_STR[k].label;
      if (MODE_STR[k].hint) MODES[k].hint = MODE_STR[k].hint;
    }

    // ── Config (set per page via window.EMOJI_TOOL_CONFIG) ────────────────────
    const ORIGIN = 'https://ultratextgen.com';
    const DEFAULT_MODE = (CFG.defaultMode && MODES[CFG.defaultMode]) ? CFG.defaultMode : 'emojify';
    const PATH = CFG.path || '/usecase/text-to-emoji/';
    const SINGLE = !!CFG.singleMode;                       // spoke = single-mode page
    const LOCAL = new Set(CFG.localModes || ['emojify', 'replace', 'letters', 'decode']);

    // The one canonical home URL for each mode (tab hrefs, redirects, canonical tag).
    // Localized single-page tools point every mode at their own path so the
    // canonical tag stays on the localized page.
    const MODE_URL = CFG.modeUrl || {
      emojify: '/usecase/text-to-emoji/',
      replace: '/usecase/text-to-emoji/?mode=replace',
      letters: '/usecase/emoji-letters/',
      decode:  '/usecase/emoji-to-text/'
    };

    const MODE_META = CFG.modeMeta || {
      emojify: {
        title: 'Text to Emoji Converter, Emoji Letters & Emoji to Text | UltraTextGen',
        desc: 'Convert text to emoji instantly as you type. Emojify your words, replace them with emoji, spell in emoji letters, or decode emoji back to text. Free, no sign-up.'
      },
      replace: {
        title: 'Emoji Translator — Replace Words With Emoji | UltraTextGen',
        desc: 'Translate text to emoji by swapping each recognised word for a matching emoji. Instant, free, and copy-paste ready. No sign-up required.'
      },
      letters: {
        title: 'Text to Emoji Letters — Name to Emoji Generator | UltraTextGen',
        desc: 'Turn text and names into emoji letters. Type a name to spell it in boxed emoji letters — perfect for bios, gamertags, and Discord channel names. Free and instant.'
      },
      decode: {
        title: 'Emoji to Text — Decode Emoji Back to Words | UltraTextGen',
        desc: 'Convert emoji to text. Paste a string of emoji and decode it back into plain English words instantly — the reverse emoji translator. Free, no sign-up.'
      }
    };

    // ── DOM ───────────────────────────────────────────────────────────────────
    const $id = (id) => document.getElementById(id);
    const mainInput = $id('mainInput');
    if (!mainInput) return; // page has no tool shell
    const charCountEl = $id('charCount');
    const convertBtn = $id('convertBtn');
    const clearBtn = $id('clearBtn');
    const emojiOutput = $id('emojiOutput');
    const emojiOutputLabel = $id('emojiOutputLabel');
    const copyOutputBtn = $id('copyOutputBtn');
    const breakdownToggle = $id('breakdownToggle');
    const breakdownSection = $id('breakdownSection');
    const breakdownGrid = $id('breakdownGrid');
    const modeTabs = $id('modeTabs');
    const modeHint = $id('modeHint');
    const phraseChips = $id('phraseChips');

    const PLACEHOLDER = STRINGS.resultPlaceholder || 'Your emoji translation will appear here.';
    const INPUT_PLACEHOLDERS = STRINGS.inputPlaceholders || {};
    let currentMode = DEFAULT_MODE;
    let lastBreakdown = [];

    // FAQ accordion (present on all tool pages)
    (function () {
      const faqButtons = document.querySelectorAll('.faq-question');
      if (!faqButtons.length) return;
      faqButtons.forEach(btn => {
        btn.addEventListener('click', function () {
          const item = btn.closest('.faq-item');
          if (item) item.classList.toggle('open');
        });
      });
    })();

    // ── URL <-> state ─────────────────────────────────────────────────────────
    function setMeta(sel, attr, val) { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val); }

    function updateHead(mode) {
      const m = MODE_META[mode] || MODE_META.emojify;
      document.title = m.title;
      const canonical = ORIGIN + (MODE_URL[mode] || MODE_URL.emojify);
      setMeta('link[rel="canonical"]', 'href', canonical);
      setMeta('meta[name="description"]', 'content', m.desc);
      setMeta('meta[property="og:title"]', 'content', m.title);
      setMeta('meta[property="og:description"]', 'content', m.desc);
      setMeta('meta[property="og:url"]', 'content', canonical);
      setMeta('meta[name="twitter:title"]', 'content', m.title);
      setMeta('meta[name="twitter:description"]', 'content', m.desc);
    }

    function parseUrl() {
      const params = new URLSearchParams(location.search);
      let mode = SINGLE
        ? DEFAULT_MODE
        : (params.get('mode') || (location.hash || '').replace('#', '') || 'emojify');
      if (!MODES[mode]) mode = DEFAULT_MODE;
      return { mode, q: params.get('q') || '' };
    }

    function buildUrl(mode, q) {
      const params = new URLSearchParams();
      if (!SINGLE && mode && mode !== 'emojify') params.set('mode', mode);
      if (q && q.trim()) params.set('q', q);
      const qs = params.toString();
      return PATH + (qs ? '?' + qs : '');
    }

    function syncUrl(push) {
      const url = buildUrl(currentMode, mainInput.value);
      try {
        if (push) history.pushState({ mode: currentMode }, '', url);
        else history.replaceState({ mode: currentMode }, '', url);
      } catch (e) { /* history unavailable — ignore */ }
    }

    function render() {
      const mode = MODES[currentMode];
      emojiOutputLabel.textContent = mode.label;
      const val = mainInput.value;
      if (charCountEl) charCountEl.textContent = val.length;
      if (!val.trim()) {
        emojiOutput.textContent = PLACEHOLDER;
        lastBreakdown = [];
        renderBreakdown([]);
        return;
      }
      const result = mode.fn(val);
      emojiOutput.textContent = result.output || PLACEHOLDER;
      lastBreakdown = result.breakdown;
      renderBreakdown(result.breakdown);
    }

    function applyMode(mode) {
      if (!MODES[mode]) mode = DEFAULT_MODE;
      currentMode = mode;
      if (modeHint) modeHint.textContent = MODES[mode].hint;
      if (modeTabs) {
        Array.from(modeTabs.querySelectorAll('.mode-tab')).forEach(t => {
          const active = t.dataset.mode === mode;
          t.classList.toggle('active', active);
          t.setAttribute('aria-selected', String(active));
        });
      }
      mainInput.placeholder = mode === 'decode'
        ? (INPUT_PLACEHOLDERS.decode || 'Paste emoji here to decode…')
        : (mode === 'letters'
            ? (INPUT_PLACEHOLDERS.letters || 'Type a name or word…')
            : (INPUT_PLACEHOLDERS.default || 'Type your sentence here…'));
      if (LOCAL.has(mode)) updateHead(mode);
      render();
    }

    function switchMode(mode) { applyMode(mode); syncUrl(true); }

    // Live conversion
    mainInput.addEventListener('input', () => { render(); syncUrl(false); });
    if (convertBtn) convertBtn.addEventListener('click', () => { render(); syncUrl(false); });

    // Mode tabs are anchors. Local modes switch in-page; other modes navigate to
    // that mode's canonical page (the hub or a spoke).
    if (modeTabs) modeTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.mode-tab');
      if (!tab) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      if (LOCAL.has(tab.dataset.mode)) { e.preventDefault(); switchMode(tab.dataset.mode); }
    });

    window.addEventListener('popstate', () => {
      if (SINGLE) return;
      const { mode, q } = parseUrl();
      mainInput.value = q;
      applyMode(mode);
    });

    if (clearBtn) clearBtn.addEventListener('click', () => {
      mainInput.value = '';
      render();
      syncUrl(false);
      if (breakdownSection) breakdownSection.classList.remove('open');
      if (breakdownToggle) {
        breakdownToggle.classList.remove('open');
        breakdownToggle.setAttribute('aria-expanded', 'false');
      }
      if (breakdownSection) breakdownSection.setAttribute('aria-hidden', 'true');
      mainInput.focus();
    });

    if (copyOutputBtn) copyOutputBtn.addEventListener('click', () => {
      const text = emojiOutput.textContent;
      if (!text || text === PLACEHOLDER) return;
      navigator.clipboard.writeText(text).then(() => {
        copyOutputBtn.textContent = STRINGS.copied || 'Copied!';
        copyOutputBtn.classList.add('copied');
        setTimeout(() => {
          copyOutputBtn.textContent = STRINGS.copy || 'Copy';
          copyOutputBtn.classList.remove('copied');
        }, 1500);
      });
    });

    if (breakdownToggle) breakdownToggle.addEventListener('click', () => {
      const isOpen = breakdownSection.classList.toggle('open');
      breakdownToggle.classList.toggle('open', isOpen);
      breakdownToggle.setAttribute('aria-expanded', String(isOpen));
      breakdownSection.setAttribute('aria-hidden', String(!isOpen));
      if (isOpen && lastBreakdown.length) renderBreakdown(lastBreakdown);
    });

    function renderBreakdown(tokens) {
      if (!breakdownGrid) return;
      breakdownGrid.innerHTML = '';
      tokens.forEach(({ word, emoji }) => {
        const row = document.createElement('div');
        row.className = 'breakdown-row';
        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'breakdown-emoji';
        emojiSpan.textContent = emoji;
        const wordSpan = document.createElement('span');
        wordSpan.className = 'breakdown-word';
        wordSpan.textContent = '= ' + word;
        row.appendChild(emojiSpan);
        row.appendChild(wordSpan);
        breakdownGrid.appendChild(row);
      });
    }

    // ── Starter phrase chips ──────────────────────────────────────────────────
    let surpriseIdx = 0;
    function loadPhrase(text) {
      mainInput.value = text;
      applyMode(DEFAULT_MODE);
      syncUrl(true);
      mainInput.focus();
    }
    // Starter chips are Emojify sentences — only meaningful on the hub.
    if (phraseChips && DEFAULT_MODE !== 'emojify') phraseChips.style.display = 'none';
    if (phraseChips && DEFAULT_MODE === 'emojify') (function initChips() {
      STARTER_PHRASES.slice(0, 8).forEach(phrase => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'phrase-chip';
        btn.textContent = phrase;
        btn.addEventListener('click', () => loadPhrase(phrase));
        phraseChips.appendChild(btn);
      });
      const surprise = document.createElement('button');
      surprise.type = 'button';
      surprise.className = 'phrase-chip surprise';
      surprise.textContent = STRINGS.surpriseMe || '🎲 Surprise me';
      surprise.addEventListener('click', () => {
        surpriseIdx = (surpriseIdx + 1) % STARTER_PHRASES.length;
        loadPhrase(STARTER_PHRASES[surpriseIdx]);
      });
      phraseChips.appendChild(surprise);
    })();

    // ── Example cards & "Try it" links ────────────────────────────────────────
    (function initExamples() {
      document.querySelectorAll('[data-example]').forEach(node => {
        node.addEventListener('click', (e) => {
          const wantMode = node.getAttribute('data-mode') || DEFAULT_MODE;
          // Anchor to another page's mode → let it navigate normally
          if (node.tagName === 'A' && !LOCAL.has(wantMode)) return;
          if (node.tagName === 'A') {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
            e.preventDefault();
          }
          mainInput.value = node.getAttribute('data-example');
          applyMode(wantMode);
          syncUrl(true);
          const card = document.querySelector('.hero-card');
          if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
          mainInput.focus();
        });
      });
    })();

    // ── Init from URL, then normalise the address bar ─────────────────────────
    (function init() {
      const { mode, q } = parseUrl();
      // Hub reached with a mode that lives on a spoke → redirect to its home
      if (!SINGLE && !LOCAL.has(mode)) {
        const base = MODE_URL[mode] || MODE_URL.emojify;
        const dest = q ? base + (base.indexOf('?') >= 0 ? '&' : '?') + 'q=' + encodeURIComponent(q) : base;
        location.replace(dest);
        return;
      }
      if (q) mainInput.value = q;
      applyMode(mode);
      syncUrl(false);
    })();
})();
