#!/usr/bin/env python3
"""
Generates the English "Vertical Text" Pinterest pin board for UltraTextGen —
every pin shows a different way to use vertical / stacked text to stand out and
drives to the vertical-text generator or guide.

Why a dedicated set (vs scripts/generate-pinterest.py):
  - generate-pinterest.py builds one pin *per page*. This board is a single-topic
    marketing set: 18 pins across 6 angles (bios, comments, hooks, the
    psychology, tattoo lettering, copy-paste/how-to), each a self-explaining
    graphic that *demonstrates* stacked text. Grounded in real demand from the
    supplied Search Console + Semrush data (e.g. "stacked letters tattoo
    generator" 140/mo $0.85 CPC; "vertical font generator" 260/mo).

Outputs (mirrors scripts/generate-id-pins.py):
  - assets/pinterest/vertical-text/<slug>.png       1000x1500 vertical pins
  - data/vertical_text_pinterest_pins.csv           internal inventory
  - data/vertical_text_pinterest_pins_upload.csv     Pinterest-importer-ready CSV
                                                     (the file you upload) — via
                                                     build_pinterest_upload

Run:  python3 scripts/generate-vertical-text-pins.py
Requires: cairosvg.
"""
import csv
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PIN_DIR = os.path.join(ROOT, "assets", "pinterest", "vertical-text")
CSV_OUT = os.path.join(ROOT, "data", "vertical_text_pinterest_pins.csv")
os.makedirs(PIN_DIR, exist_ok=True)

PIN_W, PIN_H = 1000, 1500
BOARD = "Vertical Text Ideas That Stop the Scroll"
USECASE = "https://ultratextgen.com/usecase/vertical-text/"
GUIDE = "https://ultratextgen.com/guide/vertical-text-guide/"


def _build_upload():
    """Derive the Pinterest-importer-ready upload CSV from the inventory just
    written, via the shared converter (single source of truth for the schema)."""
    spec = importlib.util.spec_from_file_location(
        "build_upload", os.path.join(HERE, "build_pinterest_upload.py"))
    conv = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(conv)
    conv.convert("vertical_text")


# ============================================================ rendering
DEFS = '''  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#3b82f6"/>
    </linearGradient>
    <linearGradient id="gh" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#3b82f6"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#8b5cf6" stop-opacity="0.16"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.6" fill="#1a1a2e" opacity="0.05"/>
    </pattern>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="22" flood-color="#1a1a2e" flood-opacity="0.10"/>
    </filter>
  </defs>'''

STACK = {
    2: (134, [700, 850]),
    3: (118, [650, 775, 900]),
    4: (104, [605, 715, 825, 935]),
    5: (88,  [565, 657, 749, 841, 933]),
    6: (76,  [558, 638, 718, 798, 878, 958]),
}


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def header(eyebrow, h1, h2):
    pw = max(200, len(eyebrow) * 14 + 56)
    px = 500 - pw / 2
    size = 74 if max(len(h1), len(h2)) <= 21 else 66
    return f'''  <rect width="1000" height="1500" fill="#FBFBFE"/>
  <rect width="1000" height="1500" fill="url(#dots)"/>
  <circle cx="850" cy="180" r="360" fill="url(#glow)"/>
  <rect width="1000" height="14" fill="url(#gh)"/>
  <text x="500" y="92" text-anchor="middle" font-size="28" font-weight="700" letter-spacing="6" fill="#64748b">ULTRATEXTGEN.COM</text>
  <rect x="{px:.0f}" y="128" width="{pw:.0f}" height="50" rx="25" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="500" y="161" text-anchor="middle" font-size="22" font-weight="700" letter-spacing="2" fill="#8b5cf6">{esc(eyebrow)}</text>
  <text x="500" y="300" text-anchor="middle" font-size="{size}" font-weight="700" fill="#1a1a2e">{esc(h1)}</text>
  <text x="500" y="392" text-anchor="middle" font-size="{size}" font-weight="700" fill="url(#g)">{esc(h2)}</text>'''


def card():
    return '  <rect x="140" y="500" width="720" height="545" rx="30" fill="#ffffff" stroke="#e2e8f0" filter="url(#sh)"/>'


def cta(text, display_url):
    pw = max(440, len(text) * 21 + 80)
    px = 500 - pw / 2
    return f'''  <rect x="{px:.0f}" y="1235" width="{pw:.0f}" height="96" rx="48" fill="url(#gh)" filter="url(#sh)"/>
  <text x="500" y="1296" text-anchor="middle" font-size="38" font-weight="700" fill="#ffffff">{esc(text)}</text>
  <text x="500" y="1432" text-anchor="middle" font-size="27" fill="#94a3b8">{esc(display_url)}</text>'''


def caption(text):
    return f'  <text x="500" y="1012" text-anchor="middle" font-size="26" fill="#64748b">{esc(text)}</text>'


def stacked_word(word, x, size, ys, fill="url(#g)", weight="700", italic=False):
    st = ' font-style="italic"' if italic else ''
    out = [f'  <g text-anchor="middle" font-size="{size}" font-weight="{weight}" fill="{fill}"{st}>']
    for ch, y in zip(word, ys):
        out.append(f'<text x="{x}" y="{y}">{esc(ch)}</text>')
    out.append('</g>')
    return "\n".join(out)


def demo_stacked(word, side=None, cap=""):
    size, ys = STACK[len(word)]
    parts = [card()]
    if side:
        parts.append('''  <g stroke="#64748b" stroke-width="11" stroke-linecap="round" opacity="0.16">
    <line x1="500" y1="560" x2="790" y2="560"/><line x1="500" y1="628" x2="760" y2="628"/>
  </g>''')
        parts.append(stacked_word(word, 330, size, ys))
        sy = 770 - (len(side) - 1) * 22
        for i, ln in enumerate(side):
            parts.append(f'  <text x="500" y="{sy + i*44}" font-size="30" font-weight="600" fill="#1a1a2e">{esc(ln)}</text>')
    else:
        parts.append('''  <g stroke="#64748b" stroke-width="11" stroke-linecap="round" opacity="0.16">
    <line x1="520" y1="600" x2="800" y2="600"/><line x1="520" y1="668" x2="780" y2="668"/>
    <line x1="520" y1="872" x2="800" y2="872"/><line x1="520" y1="940" x2="760" y2="940"/>
  </g>''')
        parts.append(stacked_word(word, 340, size, ys))
    parts.append(caption(cap))
    return "\n".join(parts)


def demo_comment(word, side, cap):
    parts = [card()]
    parts.append('''  <g>
    <circle cx="210" cy="585" r="26" fill="#e2e8f0"/><rect x="252" y="565" width="140" height="16" rx="8" fill="#cbd5e1"/><rect x="252" y="595" width="430" height="14" rx="7" fill="#eef2f7"/>
    <circle cx="210" cy="690" r="26" fill="#e2e8f0"/><rect x="252" y="670" width="120" height="16" rx="8" fill="#cbd5e1"/><rect x="252" y="700" width="380" height="14" rx="7" fill="#eef2f7"/>
  </g>
  <rect x="170" y="752" width="660" height="240" rx="20" fill="#f5f3ff" stroke="#8b5cf6" stroke-opacity="0.35"/>''')
    cy = 790 + (240 - (len(word) - 1) * 56) / 2
    cys = [cy + i * 56 for i in range(len(word))]
    parts.append(stacked_word(word, 250, 58, cys))
    ty = 885 - (len(side) - 1) * 20
    for i, ln in enumerate(side):
        parts.append(f'  <text x="360" y="{ty + i*40}" font-size="30" font-weight="600" fill="#1a1a2e">{esc(ln)}</text>')
    parts.append(caption(cap))
    return "\n".join(parts)


def demo_pack(words, cap):
    parts = [card()]
    xs = [255, 420, 585, 750]
    for w, x in zip(words, xs):
        n = len(w)
        ys = [760 + (i - (n - 1) / 2) * 64 for i in range(n)]
        parts.append(stacked_word(w, x, 56, ys))
    parts.append(caption(cap))
    return "\n".join(parts)


def demo_stat(big, sub, bullets, cap):
    parts = [card()]
    parts.append(f'  <text x="500" y="640" text-anchor="middle" font-size="120" font-weight="700" fill="url(#g)">{esc(big)}</text>')
    parts.append(f'  <text x="500" y="690" text-anchor="middle" font-size="28" fill="#64748b">{esc(sub)}</text>')
    parts.append('  <line x1="220" y1="740" x2="780" y2="740" stroke="#e2e8f0" stroke-width="2"/>')
    y = 800
    for b in bullets:
        parts.append(f'  <circle cx="245" cy="{y-10}" r="9" fill="#8b5cf6"/><text x="280" y="{y}" font-size="29" fill="#1a1a2e">{esc(b)}</text>')
        y += 70
    parts.append(f'  <text x="500" y="1012" text-anchor="middle" font-size="22" fill="#94a3b8">{esc(cap)}</text>')
    return "\n".join(parts)


def demo_checklist(rows, cap):
    parts = [card()]
    y = 600
    for mark, text in rows:
        ok = mark == "check"
        col = "url(#g)" if ok else "#ef4444"
        parts.append(f'  <circle cx="245" cy="{y-12}" r="32" fill="{col}"/>')
        if ok:
            parts.append(f'  <path d="M229 {y-12} l11 12 20 -26" stroke="#ffffff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
        else:
            parts.append(f'  <path d="M232 {y-25} l26 26 M258 {y-25} l-26 26" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>')
        parts.append(f'  <text x="300" y="{y}" font-size="33" font-weight="600" fill="#1a1a2e">{esc(text)}</text>')
        y += 95
    parts.append(caption(cap))
    return "\n".join(parts)


def demo_compare(cap):
    parts = [card()]
    parts.append('  <rect x="180" y="560" width="300" height="370" rx="20" fill="#f8fafc" stroke="#e2e8f0"/>')
    parts.append('  <g stroke="#cbd5e1" stroke-width="10" stroke-linecap="round">')
    for yy in (620, 670, 720, 770, 820):
        parts.append(f'    <line x1="215" y1="{yy}" x2="445" y2="{yy}"/>')
    parts.append('  </g>')
    parts.append('  <text x="330" y="900" text-anchor="middle" font-size="25" fill="#94a3b8">scrolled past</text>')
    parts.append('  <rect x="520" y="560" width="300" height="370" rx="20" fill="#f5f3ff" stroke="#8b5cf6" stroke-opacity="0.35"/>')
    parts.append(stacked_word("WAIT", 585, 64, [620, 690, 760, 830]))
    parts.append('  <g stroke="#cbd5e1" stroke-width="10" stroke-linecap="round">')
    for yy in (640, 700, 760):
        parts.append(f'    <line x1="650" y1="{yy}" x2="790" y2="{yy}"/>')
    parts.append('  </g>')
    parts.append('  <text x="670" y="900" text-anchor="middle" font-size="25" font-weight="700" fill="#8b5cf6">stopped</text>')
    parts.append(caption(cap))
    return "\n".join(parts)


def demo_tattoo(name):
    parts = [card()]
    parts.append('  <rect x="600" y="540" width="150" height="460" rx="75" fill="#f1ece7" stroke="#e7ded4"/>')
    n = len(name)
    ys = [790 + (i - (n - 1) / 2) * 72 + 20 for i in range(n)]
    parts.append(stacked_word(name, 290, 70, ys, weight="600", italic=True))
    parts.append(stacked_word(name, 675, 70, ys, fill="#1a1a2e", weight="600", italic=True))
    parts.append('  <text x="290" y="990" text-anchor="middle" font-size="24" fill="#64748b">type any word</text>')
    parts.append('  <text x="675" y="990" text-anchor="middle" font-size="24" fill="#64748b">see it on skin</text>')
    return "\n".join(parts)


def demo_steps(items):
    parts = []
    y = 500
    for i, (title, sub) in enumerate(items, 1):
        parts.append(f'  <rect x="140" y="{y}" width="720" height="160" rx="24" fill="#ffffff" stroke="#e2e8f0" filter="url(#sh)"/>')
        cyc = y + 80
        parts.append(f'  <circle cx="230" cy="{cyc}" r="44" fill="url(#g)"/><text x="230" y="{cyc+16}" text-anchor="middle" font-size="46" font-weight="700" fill="#ffffff">{i}</text>')
        parts.append(f'  <text x="310" y="{cyc-15}" font-size="40" font-weight="700" fill="#1a1a2e">{esc(title)}</text>')
        parts.append(f'  <text x="310" y="{cyc+30}" font-size="27" fill="#64748b">{esc(sub)}</text>')
        y += 190
    return "\n".join(parts)


def pin_svg(pin):
    body = "\n".join([
        header(pin["eyebrow"], pin["h1"], pin["h2"]),
        pin["demo"],
        cta(pin["cta"], pin["dest"].replace("https://", "").rstrip("/")),
    ])
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1500" width="1000" height="1500" '
            f'role="img" font-family="Liberation Sans, DejaVu Sans, Arial, sans-serif">\n{DEFS}\n{body}\n</svg>\n')


# ============================================================ pin definitions
PINS = [
    dict(slug="bio-instagram", eyebrow="INSTAGRAM · TIKTOK · X BIOS",
         h1="Make your bio", h2="stop the scroll",
         demo=demo_stacked("NOW", None, "one vertical word breaks the horizontal feed"),
         cta="Try the free generator →", dest=USECASE,
         title="How to Stack Words in Your Instagram Bio (Free Vertical Text)",
         desc="Add one vertical word to your Instagram bio and watch it break the horizontal feed. This free vertical text generator stacks letters top-to-bottom — just type, copy, paste. No app; works in IG, TikTok and X bios.",
         kw=["how to stack words in instagram bio", "vertical text generator", "stacked text", "instagram bio fonts", "vertical font generator"]),
    dict(slug="bio-x-twitter", eyebrow="X / TWITTER BIO",
         h1="The bio trick that", h2="ranks #1 on Google",
         demo=demo_stacked("NEW", None, "stack a single word in your bio"),
         cta="Try the free generator →", dest=USECASE,
         title="Stacked Text for Your X / Twitter Bio (Copy & Paste)",
         desc="Make your X (Twitter) bio stop the scroll with a single stacked word. Vertical text reads top-to-bottom so it breaks the timeline's horizontal rhythm. Free vertical text generator — type, copy, paste, done.",
         kw=["stacked lines twitter bio", "vertical text generator", "stacked text copy and paste", "twitter bio ideas", "vertical font generator"]),
    dict(slug="username-aesthetic", eyebrow="NAMES & USERNAMES",
         h1="One word, stacked,", h2="instantly aesthetic",
         demo=demo_stacked("AVA", None, "your name, reading top-to-bottom"),
         cta="Try the free generator →", dest=USECASE,
         title="Vertical Name & Username Ideas to Stand Out",
         desc="Turn your name or username into an aesthetic vertical column that reads top-to-bottom. One stacked word looks instantly different on any profile. Free vertical text generator — type, copy, paste.",
         kw=["vertical name generator", "aesthetic username", "stacked letters", "vertical text generator", "name ideas"]),
    dict(slug="comment-standout", eyebrow="COMMENTS & REPLIES",
         h1="The comment they", h2="scroll back to",
         demo=demo_comment("THIS", ["exactly what I", "was thinking"], "lead your reply with one stacked word"),
         cta="Try the free text stacker →", dest=USECASE,
         title="Make Your Comments Stand Out with Stacked Text",
         desc="Comment sections are horizontal noise. Lead a reply with a vertically stacked word like THIS, WAIT or REAL and it stops the scroll instantly. Free text stacker — copy and paste anywhere.",
         kw=["text stacker", "stacked text generator", "letters on top of each other", "comment ideas", "vertical text"]),
    dict(slug="discord-status", eyebrow="DISCORD & GAME CHAT",
         h1="A status that", h2="isn't boring",
         demo=demo_stacked("MOOD", None, "stack a word in your custom status"),
         cta="Try the free generator →", dest=USECASE,
         title="Vertical Text for Discord Statuses & Game Chat",
         desc="Break the default horizontal format with a stacked word in your Discord custom status or game chat. Vertical text uses standard characters, so it pastes anywhere. Free generator — type, copy, paste.",
         kw=["vertical text discord", "stacked text", "discord status ideas", "text stacker", "vertical font generator"]),
    dict(slug="reaction-words", eyebrow="REACTION WORDS",
         h1="Stacked reactions,", h2="ready to paste",
         demo=demo_pack(["WAIT", "THIS", "REAL", "STOP"], "copy a stacked reaction in one tap"),
         cta="Grab them free →", dest=USECASE,
         title="Stacked Reaction Words to Copy and Paste",
         desc="WAIT, THIS, REAL, STOP — grab ready-made stacked reaction words that read top-to-bottom and stop the scroll in any comment thread. Free vertical text generator, copy and paste in one tap.",
         kw=["stacked text copy and paste", "text stacker", "reaction words", "vertical text generator", "letters on top of each other"]),
    dict(slug="caption-hook", eyebrow="CAPTION HOOKS",
         h1="Stop the scroll", h2="in 4 letters",
         demo=demo_stacked("STOP", ["scrolling if", "you've ever", "felt this"], "open your caption with a vertical hook"),
         cta="See how it works →", dest=GUIDE,
         title="The Vertical Text Hook That Stops the Scroll",
         desc="The first line decides if people expand or scroll past. Open a caption with a stacked vertical word and you force a pause — backed by reading-speed research. Learn the technique, then generate it free.",
         kw=["top to bottom text", "vertical text", "caption hooks", "stop the scroll", "stacked text"]),
    dict(slug="hybrid-layout", eyebrow="THE HYBRID LAYOUT",
         h1="One vertical word +", h2="one horizontal line",
         demo=demo_stacked("HEY", ["I built", "something", "for you"], "stop the scroll without losing the message"),
         cta="See how it works →", dest=GUIDE,
         title="The Hybrid Layout: Vertical Word + Horizontal Line",
         desc="The most effective vertical text isn't a whole stacked block — it's one vertical word paired with a horizontal line. You stop the scroll without losing the message. See why it works, then try it free.",
         kw=["vertical text", "hybrid layout", "stop the scroll", "stacked text", "vertical font generator"]),
    dict(slug="before-after", eyebrow="BEFORE / AFTER",
         h1="Same post.", h2="One stops the scroll.",
         demo=demo_compare("a flat caption vs. a vertical hook"),
         cta="See why it works →", dest=GUIDE,
         title="Why Vertical Text Beats a Flat Caption (Before & After)",
         desc="Same post, two outcomes: a flat caption gets scrolled past, a vertical hook gets read. Orientation contrast makes the eye pause. See the before-and-after and the research behind it.",
         kw=["vertical text", "stop the scroll", "caption ideas", "stacked text", "attention design"]),
    dict(slug="the-science", eyebrow="THE PSYCHOLOGY",
         h1="Why your eye can't", h2="ignore vertical text",
         demo=demo_stat("70%", "faster to read horizontal than vertical*",
                        ["Orientation contrast is pre-attentive", "Reading slows, attention resets", "The scroll rhythm gets interrupted"],
                        "*Yu et al., 2010 · Porter & Arblaster, 2020"),
         cta="Read the science →", dest=GUIDE,
         title="The Science of Why Vertical Text Grabs Attention",
         desc="Vertical text isn't decoration — it's a pattern interrupt. Research shows we read horizontal text up to 70% faster, so stacked vertical text slows the eye and resets attention. Here's how to use it on purpose.",
         kw=["vertical text", "attention psychology", "pattern interrupt", "stacked text", "reading speed"]),
    dict(slug="best-practices", eyebrow="BEST PRACTICES",
         h1="Vertical text:", h2="what works, what fails",
         demo=demo_checklist([("check", "1–2 words for emphasis"), ("check", "Pair with a horizontal line"),
                              ("cross", "Never stack paragraphs"), ("cross", "Skip dates, links & prices")],
                             "use it like punctuation, not architecture"),
         cta="Read the guide →", dest=GUIDE,
         title="Vertical Text Best Practices (What Works & What Fails)",
         desc="Use vertical text like punctuation, not architecture: 1–2 words for emphasis, paired with a horizontal line. Never stack paragraphs, dates, links or prices. The full do's and don'ts, with examples.",
         kw=["vertical text", "best practices", "stacked text", "typography tips", "stop the scroll"]),
    dict(slug="speed-bump", eyebrow="WHEN TO USE IT",
         h1="Use vertical text", h2="like a speed bump",
         demo=demo_stacked("WAIT", None, "place it exactly where you need a pause"),
         cta="Read the guide →", dest=GUIDE,
         title="When to Use Vertical Text (And When Not To)",
         desc="Use vertical text like a speed bump — not on the highway, but exactly where you want someone to pause. Learn the right moments to stack a word and the places to keep text horizontal.",
         kw=["vertical text", "when to use vertical text", "stacked text", "attention design", "stop the scroll"]),
    dict(slug="tattoo-lettering", eyebrow="TATTOO LETTERING",
         h1="Preview your tattoo", h2="before you ink it",
         demo=demo_tattoo("GRACE"),
         cta="Try the free generator →", dest=USECASE,
         title="Vertical Tattoo Font Ideas (Free Stacked Lettering)",
         desc="Planning a vertical spine or arm tattoo? Preview your word stacked top-to-bottom before you commit. Free vertical text generator with clean, readable lettering — type any name or word, copy, and save your design.",
         kw=["stacked letters tattoo generator", "vertical tattoo font generator", "vertical tattoo fonts", "tattoo lettering", "vertical font generator"]),
    dict(slug="tattoo-name", eyebrow="NAME TATTOOS",
         h1="See your name", h2="vertically first",
         demo=demo_tattoo("ELLA"),
         cta="Try the free generator →", dest=USECASE,
         title="Stacked Letter Tattoo Generator for Names",
         desc="See your name vertically before you ink it. Stack any name top-to-bottom to preview a spine, arm or wrist tattoo layout. Free vertical lettering generator — type, copy, save.",
         kw=["stacked letters tattoo generator", "vertical tattoo font generator", "name tattoo ideas", "vertical lettering", "vertical font generator"]),
    dict(slug="how-to-3-steps", eyebrow="HOW-TO",
         h1="Vertical text in", h2="3 simple steps",
         demo=demo_steps([("Type your word", "any name, word or short phrase"),
                          ("Copy the result", "letters stacked top-to-bottom"),
                          ("Paste anywhere", "IG · TikTok · X · Discord")]),
         cta="Make yours free →", dest=USECASE,
         title="How to Make Vertical Text in 3 Steps (Free)",
         desc="Make stacked vertical text in seconds: type your word, copy the result, paste it anywhere. Each letter sits on its own line so the word reads down a column. Works on Instagram, TikTok, X and Discord.",
         kw=["how to make vertical text", "vertical text generator", "stacked text generator", "copy and paste", "vertical font generator"]),
    dict(slug="copy-paste", eyebrow="COPY & PASTE",
         h1="Stacked text you", h2="can copy right now",
         demo=demo_stacked("COPY", None, "tap, copy, paste — anywhere"),
         cta="Copy yours free →", dest=USECASE,
         title="Vertical / Stacked Text to Copy and Paste",
         desc="Stacked vertical text you can copy right now. Type any word, tap to copy, and paste a top-to-bottom column into bios, captions and comments. Free, no app, works in your browser.",
         kw=["stacked text copy and paste", "vertical text copy and paste", "vertical text generator", "copy paste fonts", "text stacker"]),
    dict(slug="platforms", eyebrow="WORKS EVERYWHERE",
         h1="Where vertical", h2="text works",
         demo=demo_checklist([("check", "Instagram bio & captions"), ("check", "TikTok comments"),
                              ("check", "X / Twitter posts"), ("check", "Discord custom status")],
                             "standard characters, no app needed"),
         cta="Try the free generator →", dest=USECASE,
         title="Where Vertical Text Works: Instagram, TikTok, X & Discord",
         desc="Vertical text uses standard characters, so it pastes into Instagram bios and captions, TikTok comments, X posts and Discord statuses — no app needed. Type, copy, paste anywhere with the free generator.",
         kw=["vertical text generator", "stacked text", "instagram tiktok discord fonts", "copy and paste", "vertical font generator"]),
    dict(slug="free-no-app", eyebrow="FREE · NO APP",
         h1="Free vertical", h2="font generator",
         demo=demo_stacked("FREE", None, "no download — works in your browser"),
         cta="Open the generator →", dest=USECASE,
         title="Free Vertical Font Generator (Works in Your Browser)",
         desc="A free vertical font generator with no download and no sign-up — it runs right in your browser. Type a word, get a clean stacked column, copy and paste it anywhere. Fast, simple, free.",
         kw=["free vertical font generator", "vertical text generator", "stacked text generator", "no app", "copy and paste"]),
]


def utm(dest, slug):
    sep = "&" if "?" in dest else "?"
    return (f"{dest}{sep}utm_source=pinterest&utm_medium=social"
            f"&utm_campaign=vertical_text_board&utm_content={slug}")


def alt(pin):
    return (f"Vertical Pinterest pin: {pin['h1']} {pin['h2']} — stacked vertical "
            f"text example from UltraTextGen.")


COLUMNS = ["slug", "image_path", "width", "height", "board", "pin_title",
           "pin_description", "pin_keywords", "pin_alt_text",
           "destination_url", "utm_destination_url"]


def main():
    import cairosvg
    out = []
    for pin in PINS:
        svg = pin_svg(pin)
        path = os.path.join(PIN_DIR, f"{pin['slug']}.png")
        cairosvg.svg2png(bytestring=svg.encode(), write_to=path,
                         output_width=PIN_W, output_height=PIN_H)
        out.append({
            "slug": pin["slug"],
            "image_path": f"assets/pinterest/vertical-text/{pin['slug']}.png",
            "width": str(PIN_W), "height": str(PIN_H),
            "board": BOARD,
            "pin_title": pin["title"],
            "pin_description": pin["desc"],
            "pin_keywords": ", ".join(pin["kw"]),
            "pin_alt_text": alt(pin),
            "destination_url": pin["dest"],
            "utm_destination_url": utm(pin["dest"], pin["slug"]),
        })
    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(out)
    print(f"generated {len(out)} vertical-text pins -> assets/pinterest/vertical-text/")
    print(f"wrote inventory -> data/vertical_text_pinterest_pins.csv")
    _build_upload()
    for r in out:
        tl, dl = len(r["pin_title"]), len(r["pin_description"])
        flag = "" if (40 <= tl <= 100 and 100 <= dl <= 500) else "  <-- check len"
        print(f"  {r['slug']:18} title {tl:3} desc {dl:3}{flag}")


if __name__ == "__main__":
    main()
