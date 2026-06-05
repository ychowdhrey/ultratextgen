(function () {
  "use strict";

  // ── Roblox username rules ────────────────────────────────────────────────────
  // 3–20 chars, letters and numbers only, at most ONE underscore,
  // no leading/trailing/consecutive underscore, no spaces, no Unicode.

  function validateUsername(raw) {
    const v = String(raw || "").trim();
    const reasons = [];
    if (v.length < 3 || v.length > 20) reasons.push("Must be 3–20 characters.");
    if (!/^[a-zA-Z0-9_]+$/.test(v)) reasons.push("Only letters, numbers, and _ are allowed.");
    if (/^_|_$/.test(v)) reasons.push("Cannot start or end with an underscore.");
    if (/__/.test(v)) reasons.push("No consecutive underscores.");
    const underscoreCount = (v.match(/_/g) || []).length;
    if (underscoreCount > 1) reasons.push("At most one underscore allowed.");
    return { valid: reasons.length === 0 && v.length >= 3, normalized: v, reasons };
  }

  function sanitizeToken(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  // ── Word banks (Roblox-specific — ASCII only) ────────────────────────────────

  const vibeBanks = {
    cute: {
      prefix: ["bunny", "peach", "kitty", "sugar", "tiny", "cookie", "chibi", "candy", "petal", "mochi"],
      suffix: ["bun", "puff", "pie", "kit", "cub", "pop", "drop", "heart", "beam", "joy"]
    },
    funny: {
      prefix: ["notthe", "certified", "average", "local", "sleepy", "broke", "chaotic", "random", "weird", "clumsy"],
      suffix: ["player", "problem", "energy", "moment", "vibes", "era", "mode", "thing", "person", "enjoyer"]
    },
    cool: {
      prefix: ["ace", "echo", "onyx", "vibe", "zen", "apex", "flux", "nova", "neon", "blaze"],
      suffix: ["era", "wave", "zone", "code", "lab", "run", "hub", "x", "pro", "dot"]
    },
    aesthetic: {
      prefix: ["luna", "nova", "dream", "aura", "mist", "ivy", "velvet", "soft", "dusk", "bloom"],
      suffix: ["vibes", "edit", "verse", "core", "mood", "glow", "diary", "haze", "lore", "space"]
    },
    girl: {
      prefix: ["cherry", "rosie", "starr", "goldie", "pinky", "daisy", "angel", "bella", "lila", "violet"],
      suffix: ["girl", "babe", "doll", "queen", "baby", "glam", "glow", "dream", "love", "rose"]
    },
    boy: {
      prefix: ["steel", "titan", "blaze", "storm", "ghost", "iron", "shadow", "arrow", "wolfe", "axel"],
      suffix: ["guy", "bro", "king", "alpha", "pro", "elite", "force", "blade", "surge", "hawk"]
    },
    emo: {
      prefix: ["void", "ashen", "faded", "numb", "ghost", "lonely", "dusk", "pale", "hollow", "grey"],
      suffix: ["tears", "ache", "echo", "decay", "core", "static", "after", "ruin", "scar", "fall"]
    },
    y2k: {
      prefix: ["cyber", "pixel", "glitch", "neon", "matrix", "digital", "turbo", "ultra", "mega", "hyper"],
      suffix: ["y2k", "2k", "net", "bit", "core", "tech", "dot", "fx", "pro", "zero"]
    },
    tuff: {
      prefix: ["raw", "grim", "iron", "drip", "venom", "storm", "slick", "rage", "brutal", "grind"],
      suffix: ["zone", "mode", "run", "era", "cult", "vault", "gang", "pack", "lord", "force"]
    },
    baddie: {
      prefix: ["glam", "posh", "lush", "bossy", "sassy", "diva", "luxe", "glow", "fierce", "vixen"],
      suffix: ["queen", "aura", "era", "babe", "doll", "luxe", "vibez", "boss", "icon", "main"]
    },
    preppy: {
      prefix: ["ivy", "briar", "sunny", "goldie", "lacey", "breezy", "sporty", "clover", "windy", "poppy"],
      suffix: ["prep", "club", "crew", "squad", "team", "cheer", "star", "belle", "rose", "glee"]
    },
    sweaty: {
      prefix: ["tryhard", "sweat", "ranked", "grind", "gg", "clutch", "carry", "no1", "esport", "fragout"],
      suffix: ["gg", "pro", "god", "main", "sniper", "rush", "aim", "fps", "x", "elite"]
    }
  };

  // Short word pools for N-letter generation
  const shortWords = {
    3: ["ace", "arc", "ash", "axe", "bat", "bay", "bee", "blu", "bop", "bro",
        "bug", "bun", "cat", "cub", "cup", "dax", "day", "dex", "dot", "dox",
        "duo", "elf", "era", "eve", "eye", "fae", "fan", "fig", "fin", "fix",
        "fly", "fog", "fox", "gal", "gem", "gel", "gin", "gnu", "god", "goo",
        "hop", "hue", "ice", "ivy", "jax", "jay", "jet", "joy", "kai", "kit",
        "koi", "lab", "leo", "lex", "lid", "lin", "lip", "lit", "lox", "lum",
        "max", "mew", "mil", "mix", "mob", "moo", "mud", "nap", "nax", "neo",
        "nin", "nox", "odd", "oil", "ops", "orb", "owl", "pax", "pep", "pet",
        "phi", "pie", "pig", "pin", "pip", "pit", "pix", "pod", "pop", "pro",
        "pup", "que", "quo", "rad", "ram", "ran", "rap", "ray", "rav", "red",
        "ref", "rem", "rex", "rio", "rip", "rob", "rod", "row", "rum", "run",
        "rux", "ryu", "sap", "set", "shy", "sig", "sim", "sip", "six", "sky",
        "sol", "son", "soy", "spa", "spy", "sub", "sum", "sun", "sup", "tab",
        "tag", "tap", "tar", "tax", "tea", "ten", "tex", "tip", "tix", "top",
        "toy", "tri", "tux", "two", "ura", "uri", "urn", "uso", "van", "vax",
        "vin", "viz", "von", "vox", "war", "wax", "web", "why", "win", "wit",
        "wiz", "wow", "xen", "xip", "yak", "yam", "yap", "yen", "yep", "zap",
        "zen", "zig", "zip", "zix", "zoe", "zoo", "zor"],
    4: ["apex", "arch", "aria", "atom", "axel", "bane", "bash", "beat", "birk",
        "bite", "blam", "blip", "blue", "bold", "bone", "boom", "boot", "bore",
        "bram", "brix", "buck", "bull", "burn", "byte", "cage", "cape", "cash",
        "cast", "celt", "chad", "chip", "cite", "clan", "clay", "clip", "code",
        "coin", "colt", "core", "corn", "crow", "crux", "cube", "ctrl", "curl",
        "cyan", "dale", "dare", "dart", "dash", "data", "dawn", "daze", "dean",
        "deck", "deed", "deep", "dent", "desk", "dice", "dime", "dire", "disk",
        "dolt", "dome", "doom", "dope", "dorm", "dose", "dram", "drew", "drex",
        "drop", "drum", "dual", "dude", "dusk", "dust", "dyne", "earl", "ease",
        "edge", "edit", "else", "emit", "epic", "fade", "fake", "fame", "fang",
        "farm", "fast", "fate", "feat", "fell", "felt", "fern", "file", "film",
        "fire", "firm", "fish", "fist", "flag", "flak", "flat", "flex", "flip",
        "flit", "flow", "flux", "foam", "fold", "folk", "fond", "font", "food",
        "ford", "fore", "fork", "form", "fort", "foul", "four", "frag", "fray",
        "free", "frog", "from", "fuel", "full", "fund", "fuse", "fuzz", "gale",
        "game", "gate", "gaze", "gear", "geld", "gild", "gilt", "glad", "glow",
        "glue", "gnaw", "gold", "golf", "gust", "hack", "halo", "halt", "hard",
        "haze", "hero", "hide", "high", "hill", "hint", "hold", "holt", "hook",
        "hope", "horn", "hose", "howl", "huge", "hull", "hunk", "hunt", "icon",
        "idea", "idle", "inch", "info", "iron", "isle", "itch", "jack", "jade",
        "jail", "jake", "jedi", "jest", "jolt", "jump", "june", "just", "keen",
        "kept", "kill", "kind", "king", "knot", "know", "kyte", "lace", "lame",
        "lamp", "lark", "lash", "last", "lava", "lawn", "lazy", "lead", "lean",
        "leap", "lend", "lens", "lore", "loft", "logo", "long", "loop", "loot",
        "lord", "lorn", "loss", "loud", "lure", "lurk", "mace", "mage", "main",
        "malt", "mare", "mark", "mars", "mask", "mast", "math", "maze", "meat",
        "meld", "melt", "mesh", "mild", "mile", "mill", "mind", "mine", "mint",
        "mist", "mode", "mole", "mood", "moon", "moor", "moot", "more", "mort",
        "move", "muck", "mutt", "myth", "nail", "name", "nerd", "next", "nice",
        "node", "noir", "nope", "norm", "nose", "note", "nova", "null", "oath",
        "odor", "omen", "only", "open", "opus", "orca", "orin", "oryx", "ovum",
        "pace", "pack", "pact", "page", "pail", "pale", "palm", "pane", "park",
        "part", "past", "path", "peak", "peel", "peer", "pend", "perk", "pest",
        "pick", "pike", "pill", "pine", "pink", "pipe", "plan", "play", "plot",
        "plus", "poet", "poke", "pole", "poll", "pond", "pool", "port", "pose",
        "post", "prep", "prev", "prey", "prom", "prop", "pull", "pump", "pure",
        "push", "quad", "raid", "rain", "rake", "ramp", "rank", "rapt", "rash",
        "rate", "rave", "raze", "read", "real", "reed", "reel", "rein", "rely",
        "rend", "rest", "rich", "ride", "rift", "ring", "riot", "risk", "rite",
        "road", "roam", "roar", "robe", "rock", "rode", "role", "roll", "roof",
        "room", "rope", "rose", "rove", "ruin", "rule", "rush", "rust", "ruth",
        "safe", "sage", "sail", "sake", "salt", "same", "sand", "scar", "seal",
        "seam", "sear", "seed", "seek", "seem", "seen", "self", "sell", "send",
        "sent", "serf", "sewn", "shed", "shin", "ship", "shoe", "shot", "show",
        "shut", "sign", "silk", "sill", "sing", "sink", "site", "size", "skin",
        "skip", "skye", "slab", "slam", "slap", "slew", "slim", "slip", "slot",
        "slow", "slug", "snap", "snow", "soak", "soap", "sock", "soft", "sole",
        "some", "song", "soon", "sort", "soul", "span", "spar", "spat", "spec",
        "spin", "spit", "spot", "spur", "star", "stay", "stem", "step", "stir",
        "stop", "stub", "stun", "such", "suit", "surf", "swam", "swan", "swap",
        "swat", "swim", "swipe", "sync", "tail", "tale", "talk", "tall", "tame",
        "tang", "tank", "tape", "task", "teal", "team", "tear", "tech", "tell",
        "tend", "tent", "term", "test", "text", "than", "that", "them", "then",
        "thin", "thor", "tick", "tide", "till", "time", "tiny", "tire", "toad",
        "toll", "tomb", "tone", "tool", "torn", "toss", "trek", "trim", "trip",
        "trod", "tron", "true", "tune", "turf", "turn", "tusp", "twin", "tyke",
        "type", "unit", "upon", "urge", "user", "vane", "vast", "veil", "vein",
        "vent", "verb", "very", "vest", "view", "vine", "void", "volt", "vote",
        "wade", "wage", "wait", "wake", "walk", "wall", "wand", "want", "ward",
        "ware", "warm", "warp", "wars", "wash", "wave", "weak", "weal", "weld",
        "well", "went", "west", "wide", "wife", "wiki", "wild", "will", "wind",
        "wine", "wing", "wink", "wire", "wise", "wish", "wolf", "wood", "word",
        "wore", "work", "worm", "worn", "wrap", "wren", "xeno", "xion", "xray",
        "year", "yell", "yeti", "york", "yore", "zero", "zest", "zion", "zola"],
    5: ["above", "acorn", "adept", "admit", "adobe", "adore", "aegis", "agent",
        "agile", "aglow", "aisle", "album", "alert", "alien", "align", "alive",
        "aloft", "alone", "along", "alpha", "altar", "amber", "ambit", "amble",
        "amend", "amuse", "angel", "anger", "angle", "ankle", "annex", "antic",
        "anvil", "apart", "apple", "apply", "apron", "ardor", "arena", "argon",
        "ariel", "arise", "armor", "array", "arrow", "aside", "asset", "atlas",
        "atone", "atrip", "attic", "audit", "augur", "aural", "avant", "await",
        "awoke", "axion", "azole", "azure", "badge", "blaze", "beach", "begin",
        "belle", "bench", "beryl", "birch", "blade", "blank", "blast", "bleak",
        "blend", "blink", "block", "bloom", "blown", "blunt", "board", "boost",
        "brand", "brave", "break", "breed", "brine", "bring", "brink", "brisk",
        "brood", "brook", "brown", "brush", "build", "bunch", "burst", "cadre",
        "carat", "cargo", "carry", "carve", "catch", "cause", "cedar", "chain",
        "chalk", "charm", "chart", "chase", "check", "cheek", "cheer", "chess",
        "chest", "chill", "chimp", "chive", "chord", "chore", "circe", "civic",
        "civil", "claim", "clamp", "clank", "crank", "crash", "crawl", "crazy",
        "crisp", "cross", "crowd", "crown", "cruel", "crush", "crypt", "curve",
        "cycle", "daisy", "daren", "darts", "debut", "delta", "demon", "dense",
        "depot", "depth", "devil", "digit", "dirty", "disco", "ditch", "dixit",
        "dizzy", "dodge", "dolce", "draco", "draft", "drake", "drama", "drape",
        "drawl", "dread", "dream", "drift", "drink", "drive", "drone", "drool",
        "drove", "drown", "dunce", "dwarf", "eagle", "early", "earth", "ebony",
        "eclat", "eight", "eject", "elite", "ember", "empty", "endow", "enema",
        "engulf","enjoy", "envoy", "epoch", "equal", "evade", "evoke", "exact",
        "exile", "expel", "extra", "exult", "fable", "facet", "faith", "falls",
        "false", "fancy", "fault", "feast", "fever", "fiber", "field", "fiend",
        "fight", "final", "first", "fixed", "fjord", "flame", "flare", "flash",
        "fleet", "flesh", "fling", "float", "flock", "flood", "floor", "floss",
        "flout", "flair", "flint", "focal", "foggy", "force", "forge", "found",
        "frail", "frame", "frank", "freak", "fresh", "frill", "frisk", "front",
        "frost", "froze", "fruit", "fully", "funky", "funny", "furry", "fuzzy",
        "gallop","gamma", "garnet","gauge", "ghost", "gigas", "given", "gizmo",
        "gleam", "glide", "glimmer","globe", "gloom", "glory", "gloss", "glove",
        "grace", "grail", "grand", "grant", "grasp", "graze", "greed", "green",
        "greet", "grief", "grind", "groan", "grope", "gross", "grove", "grown",
        "gruff", "guild", "guile", "guise", "gusto", "haven", "hazel", "heart",
        "heavy", "helix", "heron", "hinge", "hippo", "hoist", "honey", "honor",
        "howdy", "hulky", "humid", "hunky", "hyena", "hyper", "ideal", "igloo",
        "image", "impel", "inert", "infer", "inner", "input", "inset", "inter",
        "ionic", "ivory", "jaded", "joust", "judge", "juice", "juicy", "jumbo",
        "karma", "kayak", "knack", "kneel", "knelt", "knife", "knock", "known",
        "kraft", "laser", "latch", "laud", "layer", "leach", "learn", "ledge",
        "light", "limit", "linen", "liner", "links", "liver", "llama", "lodge",
        "logic", "lofty", "lotus", "lover", "lower", "loyal", "lucid", "lucky",
        "lumia", "lunch", "lunge", "lusty", "lyric", "magic", "major", "maker",
        "manor", "maple", "march", "marry", "match", "maxim", "media", "mercy",
        "merit", "metal", "might", "minor", "model", "money", "month", "moral",
        "motor", "mover", "moxie", "mulch", "music", "muted", "nativ", "nerve",
        "never", "night", "ninja", "noble", "north", "noted", "novel", "nurse",
        "nymph", "oaken", "ocean", "olive", "onset", "orbit", "order", "other",
        "outer", "oxide", "ozone", "pagan", "paint", "panic", "paper", "party",
        "pause", "peace", "pearl", "pedal", "penny", "perch", "peril", "pilot",
        "pinto", "pixel", "pixie", "pizza", "plain", "plane", "plant", "plate",
        "plaza", "plead", "plumb", "plume", "plunk", "plush", "point", "polar",
        "poppy", "power", "press", "pride", "prime", "print", "prior", "probe",
        "prove", "prowl", "prune", "psalm", "pulse", "punch", "pupil", "purge",
        "queen", "quest", "queue", "quick", "quiet", "quite", "quota", "quote",
        "radar", "radix", "rafts", "raise", "rally", "ramen", "ranch", "range",
        "rapid", "raven", "reach", "ready", "realm", "rebel", "recon", "recut",
        "refer", "reign", "relax", "relay", "repel", "reset", "rider", "ridge",
        "risky", "rival", "rivet", "roast", "robot", "rocky", "rouge", "rough",
        "round", "rover", "rowdy", "royal", "ruler", "runic", "runny", "rusty",
        "sable", "sadly", "salvo", "sandy", "satin", "sauce", "scale", "scene",
        "scout", "screw", "sea", "serve", "setup", "seven", "shade", "shake",
        "shale", "shame", "shape", "share", "sharp", "sheer", "shelf", "shell",
        "shift", "shine", "shire", "shiver","shoal", "shore", "short", "shout",
        "shove", "siege", "sigma", "since", "sixth", "sized", "skill", "skimp",
        "skirt", "slack", "slant", "slash", "slate", "sleep", "sleek", "slide",
        "slime", "slink", "slope", "slosh", "sloth", "slump", "smack", "small",
        "smart", "smash", "smear", "smell", "smile", "smith", "smoke", "snake",
        "snare", "sneak", "snipe", "solar", "solid", "solve", "sonic", "sorry",
        "south", "space", "spark", "spawn", "speed", "spell", "spend", "spice",
        "spike", "spill", "spine", "spire", "spite", "splat", "split", "spoke",
        "spore", "sport", "stack", "stage", "stain", "stake", "stale", "stalk",
        "stall", "stamp", "stand", "stare", "stark", "start", "state", "stave",
        "steam", "steel", "steep", "steer", "stern", "stick", "still", "sting",
        "stock", "stone", "storm", "story", "stout", "stove", "strap", "straw",
        "stray", "strip", "strut", "study", "style", "sugar", "suite", "sunny",
        "super", "surge", "swamp", "swear", "swept", "swift", "swirl", "swoop",
        "sword", "syrup", "talon", "tapir", "taste", "teach", "thorn", "three",
        "throw", "tiger", "tilde", "timer", "tired", "titan", "totem", "touch",
        "tough", "tower", "toxic", "trace", "track", "trade", "trail", "train",
        "trait", "tramp", "trans", "trash", "tread", "treat", "trend", "trice",
        "trick", "tried", "troop", "trove", "truck", "truly", "trump", "trunk",
        "tryst", "tulip", "tumor", "tuner", "turbo", "tweak", "twirl", "twist",
        "ultra", "uncut", "under", "unlit", "unset", "until", "upper", "upset",
        "urban", "usher", "usual", "utter", "valor", "valve", "vapid", "vapor",
        "vault", "verge", "vibes", "vigor", "viral", "virgo", "visit", "vital",
        "vivid", "vixen", "vocab", "vocal", "voter", "vowed", "voxel", "wagon",
        "water", "watch", "wedge", "weird", "wheat", "wheel", "where", "which",
        "while", "whirl", "white", "whole", "whose", "wield", "witch", "witty",
        "world", "worse", "worth", "would", "wreck", "wrist", "wrote", "xenon",
        "yield", "young", "youth", "zebra", "zippy", "zomby", "zonal"],
    6: ["beacon", "blight", "boldly", "breeze", "bridge", "bright", "broken",
        "bronze", "bunker", "calmly", "cannon", "canyon", "castle", "chosen",
        "citrus", "covert", "cosmic", "cougar", "crayon", "create", "crystal",
        "danger", "dagger", "dawdle", "deadly", "deeply", "detour", "devout",
        "divert", "divine", "domain", "double", "drifts", "dusted", "dynamo",
        "emblem", "emerge", "empire", "enable", "endure", "energy", "enigma",
        "eternal","evolve", "exhale", "exotic", "expand", "expert", "fallen",
        "fallow", "famine", "fathom", "fierce", "figure", "filter", "finale",
        "finite", "firsts", "fizzle", "flagon", "flaunt", "flawed", "flight",
        "flower", "flying", "forged", "forest", "frozen", "fusion", "future",
        "galaxy", "garnet", "gather", "gentle", "getaway","gifted", "gilded",
        "glacial","glamor", "glitch", "global", "glower", "golden", "gravel",
        "gravel", "grieve", "gritty", "grotto", "grouse", "grudge", "grumpy",
        "guided", "gunner", "hallow", "harbor", "hardly", "hazard", "hearth",
        "herald", "heroic", "hidden", "hollow", "hunter", "hustle", "hybrid",
        "ignite", "impact", "infant", "infuse", "innate", "insane", "insect",
        "instil","intact", "invoke", "island", "jagged", "jailed", "jungle",
        "keeper", "knight", "lackey", "lancer", "lancer", "laurel", "lawful",
        "legend", "lethal", "lofted", "logger", "luster", "maiden", "mantle",
        "marble", "marvel", "master", "matter", "maxima", "medium", "mentor",
        "mirror", "mobile", "modded", "monkey", "mortal", "motion", "motors",
        "mystic", "narrow", "nation", "nature", "nearly", "nebula", "nectar",
        "needle", "nether", "nimble", "ninjas", "noctus", "nordic", "notary",
        "notice", "oblique","oblong", "obtain", "oddity", "offset", "ogress",
        "omelet", "onward", "openly", "oppose", "option", "orange", "orchid",
        "origin", "outlet", "outrun", "oxygen", "palace", "pardon", "patrol",
        "pebble", "permit", "planet", "player", "plunge", "pocket", "portal",
        "precise","prefer", "pretty", "primer", "prison", "proton", "proven",
        "purple", "pursue", "puzzle", "radial", "radium", "ransom", "rarity",
        "ravage", "raving", "reborn", "reckon", "reckless","reduce", "refine",
        "regime", "reject", "relic", "remain", "remote", "remove", "repair",
        "rescue", "resent", "resign", "resist", "resort", "retcon", "retype",
        "reveal", "rewind", "revolt", "reward", "ritual", "robust", "rocket",
        "rodent", "rotate", "rugged", "ruling", "rumble", "runner", "safest",
        "sample", "savage", "saving", "school", "scroll", "sculpt", "secant",
        "secret", "secure", "seldom", "select", "senior", "serene", "serial",
        "server", "settle", "shadow", "shaman", "signal", "silent", "silver",
        "simple", "single", "sketch", "sleuth", "sliver", "smoldering","sniper",
        "socket", "solemn", "sooner", "sorrel", "sought", "source", "sprite",
        "stable", "starve", "static", "status", "steady", "stealth","stellar",
        "stench", "stifle", "strain", "streak", "street", "stride", "strife",
        "strike", "string", "strong", "struck", "strung", "stubby", "studio",
        "sturdy", "submit", "subtle", "sudden", "summit", "sunset", "superb",
        "switch", "symbol", "syntax", "system", "target", "temple", "tender",
        "theory", "throne", "tiding", "timber", "toggle", "toning", "torpedo",
        "torque", "touchy", "tribal", "trophy", "tropic", "tumult", "tunnel",
        "turret", "twitch", "tycoon", "tyrant", "uncage", "unlock", "unreal",
        "update", "uplift", "uptown", "urgent", "useful", "utmost", "valley",
        "vanish", "vector", "velvet", "venado", "vendor", "vertex", "vessel",
        "viable", "victor", "violet", "virile", "virtue", "visage", "vision",
        "vortex", "vulcan", "warder", "warden", "warmth", "warped", "wasted",
        "weapon", "wizard", "wonder", "worthy", "xander", "zephyr", "zipper"]
  };

  // ── Availability check ───────────────────────────────────────────────────────

  const availabilityCache = new Map();
  let pendingChecks = 0;
  const MAX_CONCURRENT = 3;
  const checkQueue = [];

  function robloxProfileUrl(name) {
    return "https://www.roblox.com/users/profile?username=" + encodeURIComponent(name);
  }

  async function checkAvailability(username) {
    if (availabilityCache.has(username)) return availabilityCache.get(username);

    const url =
      "https://auth.roblox.com/v1/usernames/validate?username=" +
      encodeURIComponent(username) +
      "&birthday=2000-01-01&context=signup";

    try {
      const resp = await fetch(url, { method: "GET", credentials: "omit" });
      if (!resp.ok) {
        availabilityCache.set(username, "unknown");
        return "unknown";
      }
      const data = await resp.json();
      // code 0 = valid/available, code 1 = moderated, code 2 = already in use
      const result = data.code === 0 ? "available" : data.code === 2 ? "taken" : "unknown";
      availabilityCache.set(username, result);
      return result;
    } catch {
      availabilityCache.set(username, "unknown");
      return "unknown";
    }
  }

  function enqueueCheck(username, onResult) {
    checkQueue.push({ username, onResult });
    drainQueue();
  }

  function drainQueue() {
    while (pendingChecks < MAX_CONCURRENT && checkQueue.length > 0) {
      const { username, onResult } = checkQueue.shift();
      pendingChecks++;
      checkAvailability(username).then(function (result) {
        pendingChecks--;
        onResult(result);
        drainQueue();
      });
    }
  }

  // ── DOM elements ─────────────────────────────────────────────────────────────

  const el = {
    keyword: document.getElementById("rngKeyword"),
    vibe: document.getElementById("rngVibe"),
    generate: document.getElementById("rngGenerate"),
    results: document.getElementById("rngResults"),
    showAll: document.getElementById("rngShowAll"),
    checker: document.getElementById("rngCheckerInput"),
    checkerBtn: document.getElementById("rngCheckerBtn"),
    checkerResult: document.getElementById("rngCheckerResult"),
    lengthTabs: document.querySelectorAll(".rng-length-tab")
  };

  let currentLength = 0; // 0 = any
  let lastGenerated = [];

  // ── Username generation ───────────────────────────────────────────────────────

  function pick(arr, seed, offset) {
    return arr[Math.abs((seed + offset) % arr.length)];
  }

  function buildName(parts) {
    const name = parts.join("").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
    const res = validateUsername(name);
    return res.valid ? name : null;
  }

  function unique(list) {
    return Array.from(new Set(list.filter(Boolean)));
  }

  function generateNames() {
    const vibeKey = el.vibe ? el.vibe.value : "cool";
    const vibe = vibeBanks[vibeKey] || vibeBanks.cool;
    const keyword = sanitizeToken(el.keyword ? el.keyword.value : "").slice(0, 10);
    const seed = Date.now() % 9973;
    const picks = [];

    if (currentLength > 0) {
      // N-letter mode: pull from the short word pool for that length
      const pool = shortWords[currentLength] || shortWords[4];
      const shuffled = pool.slice().sort(() => Math.random() - 0.5);
      return unique(shuffled).slice(0, 24);
    }

    // Vibe mode
    for (let i = 0; i < 18; i++) {
      const p = pick(vibe.prefix, seed, i);
      const s = pick(vibe.suffix, seed, i * 3 + 1);
      const n = String((seed + i) % 99 + 1);

      picks.push(
        buildName([p, s]),
        buildName([p, keyword || s]),
        buildName([keyword || p, s]),
        buildName([p, s, n]),
        buildName([p, "_", s]),
        keyword ? buildName([keyword, "_", s]) : null,
        keyword ? buildName([p, "_", keyword]) : null
      );
    }

    return unique(picks).slice(0, 24);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  function badgeHtml(status) {
    if (status === "available") return '<span class="rng-badge rng-badge-available">✓ Available</span>';
    if (status === "taken") return '<span class="rng-badge rng-badge-taken">✗ Taken</span>';
    if (status === "checking") return '<span class="rng-badge rng-badge-checking">Checking…</span>';
    return '<span class="rng-badge rng-badge-unknown">Check on Roblox →</span>';
  }

  function renderCards(names) {
    if (!el.results) return;
    if (!names.length) {
      el.results.innerHTML = '<div class="rng-empty">No valid names generated. Try a different vibe or length.</div>';
      return;
    }

    el.results.innerHTML = names
      .map(function (name) {
        const v = validateUsername(name);
        const robloxLink = robloxProfileUrl(name);
        return (
          '<div class="rng-card" data-name="' + name + '" data-status="checking">' +
            '<div class="rng-username">' + name + '</div>' +
            '<div class="rng-meta">' + name.length + '/20 chars · ASCII-safe</div>' +
            '<div class="rng-card-footer">' +
              '<div class="rng-badge-wrap">' + badgeHtml("checking") + '</div>' +
              '<a class="rng-check-link" href="' + robloxLink + '" target="_blank" rel="noopener">Check on Roblox →</a>' +
              '<button class="copy-btn" type="button" data-name="' + name + '">Copy</button>' +
            '</div>' +
          '</div>'
        );
      })
      .join("");

    // Queue availability checks for each card
    names.forEach(function (name) {
      const card = el.results.querySelector('[data-name="' + name + '"]');
      if (!card) return;

      enqueueCheck(name, function (status) {
        card.dataset.status = status;
        const badgeWrap = card.querySelector(".rng-badge-wrap");
        if (badgeWrap) badgeWrap.innerHTML = badgeHtml(status);
      });
    });
  }

  function run() {
    lastGenerated = generateNames();
    renderCards(lastGenerated);
  }

  // ── Checker ────────────────────────────────────────────────────────────────

  function runChecker() {
    if (!el.checkerResult) return;
    const raw = el.checker ? el.checker.value.trim() : "";
    if (!raw) {
      el.checkerResult.innerHTML = '<div class="tng-empty">Enter a username above to check rules and availability.</div>';
      return;
    }

    const v = validateUsername(raw);
    if (!v.valid) {
      el.checkerResult.innerHTML =
        '<div class="block-example"><strong>Format issues:</strong><ul>' +
        v.reasons.map(function (r) { return "<li>" + r + "</li>"; }).join("") +
        "</ul></div>";
      return;
    }

    // Format is valid — show checking state then query
    el.checkerResult.innerHTML =
      '<div class="block-example rng-checker-result" id="checkerLive">' +
        '<strong>Format valid</strong> (' + v.normalized.length + '/20 chars). ' +
        '<span id="checkerStatus">Checking availability…</span>' +
      '</div>';

    checkAvailability(v.normalized).then(function (status) {
      const statusEl = document.getElementById("checkerStatus");
      if (!statusEl) return;
      if (status === "available") {
        statusEl.innerHTML =
          '<span class="rng-badge rng-badge-available">✓ Looks available</span> ' +
          '— <a href="' + robloxProfileUrl(v.normalized) + '" target="_blank" rel="noopener">Confirm on Roblox →</a>';
      } else if (status === "taken") {
        statusEl.innerHTML = '<span class="rng-badge rng-badge-taken">✗ Username is taken</span>';
      } else {
        statusEl.innerHTML =
          'Could not verify — <a href="' + robloxProfileUrl(v.normalized) + '" target="_blank" rel="noopener">Check on Roblox →</a>';
      }
    });
  }

  // ── Copy ────────────────────────────────────────────────────────────────────

  async function copyName(value, btn) {
    try {
      await navigator.clipboard.writeText(value);
      btn.textContent = "Copied";
      setTimeout(function () { btn.textContent = "Copy"; }, 900);
    } catch (err) {
      console.error(err);
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  function init() {
    if (!el.generate || !el.results) return;

    run();

    el.generate.addEventListener("click", run);

    // Length tabs
    el.lengthTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        el.lengthTabs.forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        currentLength = parseInt(tab.dataset.length, 10) || 0;
        run();
      });
    });

    // Copy
    el.results.addEventListener("click", function (e) {
      const btn = e.target.closest("button[data-name]");
      if (!btn) return;
      copyName(btn.dataset.name, btn);
    });

    // Checker
    if (el.checkerBtn) {
      el.checkerBtn.addEventListener("click", runChecker);
    }
    if (el.checker) {
      el.checker.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); runChecker(); }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
