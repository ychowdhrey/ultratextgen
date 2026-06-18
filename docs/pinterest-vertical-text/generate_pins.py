#!/usr/bin/env python3
"""Generate all 18 Pinterest pins (SVG + PNG) for the Vertical Text board."""
import cairosvg, os

OUT = os.path.dirname(os.path.abspath(__file__))
USECASE = "ultratextgen.com/usecase/vertical-text"
GUIDE = "ultratextgen.com/guide/vertical-text-guide"

# ---------- shared building blocks ----------
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

# vertical positions for a stacked word, keyed by letter count
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

def cta(text, url):
    pw = max(440, len(text) * 21 + 80)
    px = 500 - pw / 2
    return f'''  <rect x="{px:.0f}" y="1235" width="{pw:.0f}" height="96" rx="48" fill="url(#gh)" filter="url(#sh)"/>
  <text x="500" y="1296" text-anchor="middle" font-size="38" font-weight="700" fill="#ffffff">{esc(text)}</text>
  <text x="500" y="1432" text-anchor="middle" font-size="27" fill="#94a3b8">{esc(url)}</text>'''

def caption(text):
    return f'  <text x="500" y="1012" text-anchor="middle" font-size="26" fill="#64748b">{esc(text)}</text>'

def stacked_word(word, x, size, ys, fill="url(#g)", weight="700", italic=False):
    st = ' font-style="italic"' if italic else ''
    out = [f'  <g text-anchor="middle" font-size="{size}" font-weight="{weight}" fill="{fill}"{st}>']
    for ch, y in zip(word, ys):
        out.append(f'<text x="{x}" y="{y}">{esc(ch)}</text>')
    out.append('</g>')
    return "\n".join(out)

# ---------- demo renderers ----------
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
    size, ys = STACK[len(word)]
    ys = [y - 10 for y in ys]
    parts = [card()]
    parts.append('''  <g>
    <circle cx="210" cy="585" r="26" fill="#e2e8f0"/><rect x="252" y="565" width="140" height="16" rx="8" fill="#cbd5e1"/><rect x="252" y="595" width="430" height="14" rx="7" fill="#eef2f7"/>
    <circle cx="210" cy="690" r="26" fill="#e2e8f0"/><rect x="252" y="670" width="120" height="16" rx="8" fill="#cbd5e1"/><rect x="252" y="700" width="380" height="14" rx="7" fill="#eef2f7"/>
  </g>
  <rect x="170" y="752" width="660" height="240" rx="20" fill="#f5f3ff" stroke="#8b5cf6" stroke-opacity="0.35"/>''')
    cy = 790 + (240 - (len(word)-1)*56) / 2
    cys = [cy + i*56 for i in range(len(word))]
    parts.append(stacked_word(word, 250, 58, cys))
    ty = 885 - (len(side)-1)*20
    for i, ln in enumerate(side):
        parts.append(f'  <text x="360" y="{ty + i*40}" font-size="30" font-weight="600" fill="#1a1a2e">{esc(ln)}</text>')
    parts.append(caption(cap))
    return "\n".join(parts)

def demo_pack(words, cap):
    parts = [card()]
    xs = [255, 420, 585, 750]
    for w, x in zip(words, xs):
        n = len(w)
        gap = 64
        cyc = 760
        ys = [cyc + (i - (n-1)/2)*gap for i in range(n)]
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
        glyph = "M236 250 l12 14 22 -30" if ok else ""
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
    # left: flat / scrolled past
    parts.append('  <rect x="180" y="560" width="300" height="370" rx="20" fill="#f8fafc" stroke="#e2e8f0"/>')
    parts.append('  <g stroke="#cbd5e1" stroke-width="10" stroke-linecap="round">')
    for yy in (620, 670, 720, 770, 820):
        parts.append(f'    <line x1="215" y1="{yy}" x2="445" y2="{yy}"/>')
    parts.append('  </g>')
    parts.append('  <text x="330" y="900" text-anchor="middle" font-size="25" fill="#94a3b8">scrolled past</text>')
    # right: vertical hook / stopped
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
    gap = 72
    ys = [790 + (i - (n-1)/2)*gap + 20 for i in range(n)]
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

def svg(body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1500" width="1000" height="1500" '
            f'role="img" font-family="Liberation Sans, DejaVu Sans, Arial, sans-serif">\n{DEFS}\n{body}\n</svg>\n')

# ---------- pin definitions ----------
PINS = [
 ("pin-1-bio","INSTAGRAM · TIKTOK · X BIOS","Make your bio","stop the scroll",
   demo_stacked("NOW",None,"one vertical word breaks the horizontal feed"),"Try the free generator →",USECASE),
 ("pin-2-twitter-bio","X / TWITTER BIO","The bio trick that","ranks #1 on Google",
   demo_stacked("NEW",None,"stack a single word in your bio"),"Try the free generator →",USECASE),
 ("pin-3-username","NAMES & USERNAMES","One word, stacked,","instantly aesthetic",
   demo_stacked("AVA",None,"your name, reading top-to-bottom"),"Try the free generator →",USECASE),
 ("pin-4-comment","COMMENTS & REPLIES","The comment they","scroll back to",
   demo_comment("THIS",["exactly what I","was thinking"],"lead your reply with one stacked word"),"Try the free text stacker →",USECASE),
 ("pin-5-discord","DISCORD & GAME CHAT","A status that","isn't boring",
   demo_stacked("MOOD",None,"stack a word in your custom status"),"Try the free generator →",USECASE),
 ("pin-6-reactions","REACTION WORDS","Stacked reactions,","ready to paste",
   demo_pack(["WAIT","THIS","REAL","STOP"],"copy a stacked reaction in one tap"),"Grab them free →",USECASE),
 ("pin-7-hook","CAPTION HOOKS","Stop the scroll","in 4 letters",
   demo_stacked("STOP",["scrolling if","you've ever","felt this"],"open your caption with a vertical hook"),"See how it works →",GUIDE),
 ("pin-8-hybrid","THE HYBRID LAYOUT","One vertical word +","one horizontal line",
   demo_stacked("HEY",["I built","something","for you"],"stop the scroll without losing the message"),"See how it works →",GUIDE),
 ("pin-9-beforeafter","BEFORE / AFTER","Same post.","One stops the scroll.",
   demo_compare("a flat caption vs. a vertical hook"),"See why it works →",GUIDE),
 ("pin-10-science","THE PSYCHOLOGY","Why your eye can't","ignore vertical text",
   demo_stat("70%","faster to read horizontal than vertical*",
     ["Orientation contrast is pre-attentive","Reading slows, attention resets","The scroll rhythm gets interrupted"],
     "*Yu et al., 2010 · Porter & Arblaster, 2020"),"Read the science →",GUIDE),
 ("pin-11-bestpractice","BEST PRACTICES","Vertical text:","what works, what fails",
   demo_checklist([("check","1–2 words for emphasis"),("check","Pair with a horizontal line"),
     ("cross","Never stack paragraphs"),("cross","Skip dates, links & prices")],
     "use it like punctuation, not architecture"),"Read the guide →",GUIDE),
 ("pin-12-speedbump","WHEN TO USE IT","Use vertical text","like a speed bump",
   demo_stacked("WAIT",None,"place it exactly where you need a pause"),"Read the guide →",GUIDE),
 ("pin-13-tattoo","TATTOO LETTERING","Preview your tattoo","before you ink it",
   demo_tattoo("GRACE"),"Try the free generator →",USECASE),
 ("pin-14-tattoo-name","NAME TATTOOS","See your name","vertically first",
   demo_tattoo("ELLA"),"Try the free generator →",USECASE),
 ("pin-15-howto","HOW-TO","Vertical text in","3 simple steps",
   demo_steps([("Type your word","any name, word or short phrase"),
     ("Copy the result","letters stacked top-to-bottom"),
     ("Paste anywhere","IG · TikTok · X · Discord")]),"Make yours free →",USECASE),
 ("pin-16-copypaste","COPY & PASTE","Stacked text you","can copy right now",
   demo_stacked("COPY",None,"tap, copy, paste — anywhere"),"Copy yours free →",USECASE),
 ("pin-17-platforms","WORKS EVERYWHERE","Where vertical","text works",
   demo_checklist([("check","Instagram bio & captions"),("check","TikTok comments"),
     ("check","X / Twitter posts"),("check","Discord custom status")],
     "standard characters, no app needed"),"Try the free generator →",USECASE),
 ("pin-18-noapp","FREE · NO APP","Free vertical","font generator",
   demo_stacked("FREE",None,"no download — works in your browser"),"Open the generator →",USECASE),
]

for name, eb, h1, h2, demo, cta_text, url in PINS:
    body = "\n".join([header(eb, h1, h2), demo, cta(cta_text, url)])
    doc = svg(body)
    sp = os.path.join(OUT, name + ".svg")
    pp = os.path.join(OUT, name + ".png")
    with open(sp, "w") as f:
        f.write(doc)
    cairosvg.svg2png(bytestring=doc.encode(), write_to=pp, output_width=1000, output_height=1500)
    print("wrote", name)

print("done:", len(PINS), "pins")
