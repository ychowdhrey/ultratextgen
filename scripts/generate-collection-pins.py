#!/usr/bin/env python3
"""
Generates Pinterest-ready "collection" pins + upload inventory for every KEEP
collection in data/collection_copy_audit.csv (~164 library pages).

WHY THIS IS A DIFFERENT VISUAL LOGIC (vs scripts/generate-site-art.py /assets/og/
and scripts/generate-pinterest.py):
  - OG / hero / page-thumbnail cards put a *vector brand motif* (an abstract
    drawing of the topic) in the frame; their job is link-preview + brand
    recognition when a URL is shared. The real copy-paste glyphs are NOT shown.
  - A COLLECTION pin makes the *literal copy-paste set* the hero: several named
    combos from the page's buildGrids() block, stacked as a saveable "pack".
    It works as an artifact on Pinterest itself (no search volume needed); the
    page title demotes to a kicker and the symbols carry the meaning.

RENDERING: headless Chromium (Playwright) so pins match the live site —
  - emoji via the SAME Twemoji build the pages use (@twemoji/api, SVG assets);
  - fine aesthetic Unicode via the browser font stack (Noto Sans Symbols/Oriya/
    Sinhala/Tibetan/Carian + DejaVu), the way a real device renders it.

PINTEREST STRATEGY: boards are anchored on the high-volume "copy and paste"
search intent (copy and paste symbols ~110K, symbols copy and paste ~49K, cute
symbols copy and paste ~12K, copy and paste hearts/emojis). Each pin gets a
copy-paste-led primary board + a topical secondary board for extra reach.

Outputs:
  - assets/collection-pins/<slug>.png   1000x1500 vertical pin (2:3)
  - data/collection_pins.csv            per-pin upload inventory

Run:  python3 scripts/generate-collection-pins.py [slug ...]   # optional filter
Requires: playwright (+chromium), Pillow, fonts-noto-core/extra, Twemoji CDN.
"""
import csv
import html
import json
import os
import subprocess
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "collection-pins")
AUDIT = os.path.join(ROOT, "data", "collection_copy_audit.csv")
SPEC_DIR = os.path.join(ROOT, "data", "library_page_specs")
CSV_OUT = os.path.join(ROOT, "data", "collection_pins.csv")
# Pinterest bulk-create upload file (exact 8-column template Pinterest expects;
# mirrors the working data/pinterest_upload_*.csv used for the page pins).
UPLOAD_OUT = os.path.join(ROOT, "data", "pinterest_upload_collections.csv")
UPLOAD_COLUMNS = ["Title", "Media URL", "Pinterest board", "Thumbnail",
                  "Description", "Link", "Publish date", "Keywords"]
GH_RAW = "https://raw.githubusercontent.com/ychowdhrey/ultratextgen"
os.makedirs(OUT, exist_ok=True)


def git_ref():
    """Branch/ref used to build the public Media URL. Override with PIN_RAW_REF
    (e.g. PIN_RAW_REF=main after merging) — Pinterest fetches the raw image from
    GitHub, so the ref must contain the rendered pins."""
    if os.environ.get("PIN_RAW_REF"):
        return os.environ["PIN_RAW_REF"]
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=ROOT).decode().strip()
    except Exception:
        return "main"


def media_url(slug):
    return f"{GH_RAW}/{git_ref()}/assets/collection-pins/{slug}.png"


def write_upload_csv(rows):
    """Map the internal inventory rows to Pinterest's bulk-create template.
    Pinterest's format allows one board per Pin, so we use board_primary (the
    copy-paste board); board_secondary stays in the internal CSV for reference."""
    with open(UPLOAD_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=UPLOAD_COLUMNS)
        w.writeheader()
        for r in rows:
            w.writerow({
                "Title": r["pin_title"],
                "Media URL": media_url(r["slug"]),
                "Pinterest board": r["board_primary"],
                "Thumbnail": "",
                "Description": r["pin_description"],
                "Link": r["utm_destination_url"],
                "Publish date": "",
                "Keywords": r["pin_keywords"],
            })

DOMAIN = "https://ultratextgen.com"
PIN_W, PIN_H = 1000, 1500
SCALE = 2
MAX_ROWS = 5
TWEMOJI_JS = "https://cdn.jsdelivr.net/npm/@twemoji/api@latest/dist/twemoji.min.js"

# ---- copy-paste-anchored Pinterest boards (primary) -----------------------
B_CP_SYMBOLS = "Copy and Paste Symbols"
B_CP_CUTE = "Cute Symbols & Hearts to Copy and Paste"
B_CP_EMOJI = "Emojis & Combos to Copy and Paste"

# ---- topical secondary boards (reused from generate-pinterest.py) ----------
B_DISCORD = "Discord Fonts, Symbols & Names"
B_INSTA = "Instagram Bio Symbols & Aesthetic Text"
B_TIKTOK = "TikTok, Snapchat & WhatsApp Fonts"
B_GAMING = "Gaming Symbols & Usernames"
B_SPECIAL = "Special Characters, Unicode & Keyboard Symbols"
B_EMOJI_T = "Emoji Copy Paste & Emoji Combos"
B_CUTE_T = "Cute Symbols, Hearts & Decorative Text"
B_TEXTART = "Text Art, Kaomoji & ASCII Faces"
B_INTL = "International Fancy Font Generators"

KEYWORD_BOARDS = [
    (B_DISCORD, ["discord"]),
    (B_INSTA, ["instagram", "bio", "aesthetic", "coquette", "y2k", "cottagecore",
               "fairycore", "kawaii", "preppy"]),
    (B_TIKTOK, ["tiktok", "snapchat", "whatsapp"]),
    (B_GAMING, ["roblox", "minecraft", "fortnite", "free fire", "mobile legends",
                "ml name", "nickname", "username", "gaming"]),
    (B_TEXTART, ["kaomoji", "text face", "ascii", "text art", "meme"]),
    (B_INTL, ["japanese", "korean", "chinese", "hindi"]),
    (B_CUTE_T, ["heart", "flower", "star", "sparkle", "bow", "ribbon", "cute",
                "moon", "celestial", "butterfly"]),
    (B_EMOJI_T, ["emoji", "flag", "combo"]),
    (B_SPECIAL, ["divider", "border", "frame", "box", "rune", "zodiac", "chess",
                 "occult", "witchy", "loading", "symbol"]),
]

CUTE_KEYS = ["heart", "coquette", "kawaii", "cottagecore", "bow", "ribbon",
             "fairycore", "cute", "pastel", "preppy", "flower", "butterfly"]


def topical_board(hay, primary):
    for board, kws in KEYWORD_BOARDS:
        if any(k in hay for k in kws):
            return board
    return ""


# ---- brand template (same as the approved pilots) -------------------------
CSS = """
:root{--purple:#8b5cf6;--blue:#3b82f6;--ink:#1a1a2e;--sub:#64748b;--panel:#FBFBFE;--card:#fff}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1000px;height:1500px}
.pin{position:relative;width:1000px;height:1500px;background:var(--panel);
  font-family:'DejaVu Sans','Liberation Sans',Arial,sans-serif;overflow:hidden;
  background-image:radial-gradient(rgba(26,26,46,.06) 1.4px,transparent 1.4px);
  background-size:22px 22px}
.pin::before,.pin::after{content:"";position:absolute;border-radius:50%}
.pin::before{width:680px;height:680px;right:-160px;top:-360px;
  background:radial-gradient(circle,rgba(139,92,246,.16),transparent 70%)}
.pin::after{width:620px;height:620px;left:-260px;bottom:-220px;
  background:radial-gradient(circle,rgba(139,92,246,.13),transparent 70%)}
.spine{position:absolute;left:0;top:0;width:16px;height:1500px;
  background:linear-gradient(180deg,var(--purple),var(--blue))}
.kicker{position:absolute;left:80px;top:104px;font-weight:700;font-size:30px;
  letter-spacing:4px;color:var(--purple);max-width:840px}
.headline{position:absolute;left:78px;top:150px;font-weight:800;font-size:70px;
  color:var(--ink);line-height:1.05;max-width:860px}
.rule{position:absolute;left:82px;top:300px;width:120px;height:9px;border-radius:5px;
  background:linear-gradient(90deg,var(--purple),var(--blue))}
.card{position:absolute;left:88px;top:360px;width:824px;height:940px;
  background:var(--card);border:2px solid #e6e6f0;border-radius:48px;
  box-shadow:0 30px 60px -30px rgba(26,26,46,.18);
  display:flex;flex-direction:column;justify-content:space-around;padding:54px 40px}
.row{text-align:center}
.name{font-weight:700;font-size:30px;color:var(--sub);margin-bottom:14px}
.set{color:var(--ink);white-space:nowrap;line-height:1;
  font-family:'Noto Sans Symbols 2','Noto Sans Symbols','Noto Sans Oriya',
    'Noto Sans Sinhala','Noto Serif Tibetan','Noto Sans Carian','DejaVu Sans',sans-serif}
.set img.emoji{height:1em;width:1em;vertical-align:-.15em;margin:0 .06em}
.footer{position:absolute;left:0;right:0;bottom:54px;text-align:center}
.fline{width:280px;height:3px;margin:0 auto 22px;border-radius:2px;
  background:linear-gradient(90deg,var(--purple),var(--blue))}
.tap{font-size:28px;color:var(--sub);margin-bottom:22px}
.mark{display:inline-flex;align-items:center;gap:14px;font-weight:800;font-size:40px;color:var(--ink)}
.mark .u{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;
  border-radius:16px;color:#fff;font-size:34px;background:linear-gradient(135deg,var(--purple),var(--blue))}
.mark .com{color:var(--purple)}
"""

PAGE = """<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>
<div class="pin"><div class="spine"></div>
  <div class="kicker">{kicker}</div><div class="headline">{headline}</div><div class="rule"></div>
  <div class="card">{rows}</div>
  <div class="footer"><div class="fline"></div><div class="tap">tap any set to copy</div>
    <div class="mark"><span class="u">U</span><span>UltraTextGen<span class="com">.com</span></span></div></div>
</div>
<script src="{twemoji}" crossorigin="anonymous"></script>
<script>
  if(typeof twemoji!=="undefined")twemoji.parse(document.body,{{folder:"svg",ext:".svg"}});
  var maxw=824-80;
  document.querySelectorAll('.set').forEach(function(el){{
    var fs=parseFloat(getComputedStyle(el).fontSize),guard=70;
    while(el.scrollWidth>maxw&&fs>20&&guard-->0){{fs-=2;el.style.fontSize=fs+'px';}}
  }});
  window.__ready=true;
</script></body></html>"""


# ---- content extraction ---------------------------------------------------
EMOJI_RANGES_HINT = (0x2600, 0x27BF)


def is_emoji_char(ch):
    cp = ord(ch)
    if 0x1F1E6 <= cp <= 0x1F1FF or cp >= 0x1F000:
        return True
    if cp in (0x2764, 0x2B50, 0x2728, 0x26BD, 0x2611, 0x2705, 0x274C,
              0x2B1B, 0x2B1C, 0x2614, 0x231A, 0x23F0):
        return True
    return False


def emoji_ratio(rows):
    e = t = 0
    for _, s in rows:
        for ch in s:
            if ch.isspace():
                continue
            t += 1
            if is_emoji_char(ch):
                e += 1
    return e / max(1, t)


def groups_to_rows(groups):
    rows = []
    for g in groups[:MAX_ROWS]:
        name = (g.get("name") or "").strip()
        flags = g.get("flags") or []
        sset = " ".join(flags).strip()
        if name and sset:
            rows.append((name, sset))
    return rows


def legacy_groups(slug):
    page = os.path.join(ROOT, "library", slug, "index.html")
    out = subprocess.check_output(["node", os.path.join(HERE, "_extract_groups.js"), page])
    return json.loads(out)


# emoji-flags: curated region grids (its page stores country codes, not combos)
FLAG_ROWS = [
    ("Americas", "🇺🇸 🇧🇷 🇨🇦 🇲🇽 🇦🇷"),
    ("Europe", "🇬🇧 🇫🇷 🇩🇪 🇪🇸 🇮🇹"),
    ("Asia", "🇯🇵 🇮🇳 🇰🇷 🇨🇳 🇮🇩"),
    ("More", "🇵🇹 🇳🇱 🇸🇪 🇹🇷 🇿🇦"),
]

STRIP = ["Symbols", "Symbol", "Emojis", "Emoji", "aesthetic", "Aesthetic",
         "decoration", "Decorative", "& Kaomoji", "Kaomoji", "Combos", "Combo",
         "signs", "Signs", "marks", "Marks", "& Meme", "utility", "Standalone"]


def clean_topic(slug, category):
    if slug.endswith("-emoji-combos"):
        return slug[:-len("-emoji-combos")].replace("-", " ").title()
    if slug == "emoji-flags":
        return "Flag"
    t = category.replace("/", " ")
    for w in STRIP:
        t = t.replace(w, "")
    t = " ".join(t.split()).strip(" -&")
    return t.title() if t else category.title()


# topic nouns that already name the content, so don't append "Symbols"
NOUNY = ("divider", "border", "frame", "kaomoji", "art", "face", "rune",
         "bracket", "arrow", "symbol", "sign")


def build_record(row):
    slug = row["slug"]
    category = row["symbol_category"]
    if slug == "emoji-flags":
        rows = FLAG_ROWS
    elif row["source"] == "spec":
        d = json.load(open(os.path.join(SPEC_DIR, f"{slug}.json"), encoding="utf-8"))
        rows = groups_to_rows(d.get("collections") or [])
    else:
        rows = groups_to_rows(legacy_groups(slug))
    if not rows:
        return None

    topic = clean_topic(slug, category)
    is_emoji = emoji_ratio(rows) >= 0.4 or slug == "emoji-flags"
    hay = f"{slug} {category}".lower()
    is_cute = any(k in hay for k in CUTE_KEYS)

    if slug.endswith("-emoji-combos"):
        headline = f"{topic} Combo Pack"
        phrase = f"{topic} Emoji Combos"
    elif slug == "emoji-flags":
        headline, phrase = "Flag Pack", "Flag Emojis"
    elif is_emoji:
        headline = f"{topic} Pack"
        phrase = f"{topic} Emojis"
    else:
        headline = f"{topic} Pack"
        phrase = topic if any(n in topic.lower() for n in NOUNY) else f"{topic} Symbols"

    # primary copy-paste board
    if is_cute:
        primary = B_CP_CUTE
    elif is_emoji:
        primary = B_CP_EMOJI
    else:
        primary = B_CP_SYMBOLS
    secondary = topical_board(hay, primary)

    title = f"{phrase} to Copy and Paste"
    if len(title) < 40:
        title += " | UltraTextGen"
    if len(title) > 90:
        title = title[:88].rsplit(" ", 1)[0].rstrip(" |—:")

    names = ", ".join(n for n, _ in rows[:3])
    desc = (f"Copy and paste {phrase.lower()} for your bio, captions, username "
            f"and posts. This pack includes {names} and more — tap any set on "
            f"UltraTextGen to copy it instantly. Free, no app, works on mobile "
            f"and desktop.")
    if len(desc) > 300:
        desc = desc[:297].rsplit(" ", 1)[0] + "…"

    kws = [topic.lower(), f"{topic.lower()} copy and paste"]
    kws += (["copy and paste emojis", "emoji combos", "aesthetic emojis"] if is_emoji
            else ["copy and paste symbols", "aesthetic symbols", "bio symbols"])
    kws += ["copy and paste", "ultratextgen"]
    seen, kw = set(), []
    for k in kws:
        if k not in seen:
            seen.add(k)
            kw.append(k)

    url = f"{DOMAIN}/library/{slug}/"
    utm = f"{url}?utm_source=pinterest&utm_medium=social&utm_campaign=collections&utm_content={slug}"
    return {
        "slug": slug, "kicker": category.upper(), "headline": headline,
        "is_emoji": is_emoji, "rows": rows, "category": category,
        "board_primary": primary, "board_secondary": secondary,
        "pin_title": title, "pin_description": desc,
        "pin_keywords": ", ".join(kw[:9]),
        "pin_alt_text": f"Vertical Pinterest pin showing {phrase.lower()} to copy and paste from UltraTextGen.",
        "page_url": url, "utm_url": utm,
        "pin_image_path": f"assets/collection-pins/{slug}.png",
    }


# ---- render ---------------------------------------------------------------
def row_html(name, sset, size):
    return (f'<div class="row"><div class="name">{html.escape(name)}</div>'
            f'<div class="set" style="font-size:{size}px">{html.escape(sset)}</div></div>')


def render_pin(page, rec):
    size = 92 if rec["is_emoji"] else 58
    rows = "".join(row_html(n, s, size) for n, s in rec["rows"])
    page.set_content(PAGE.format(css=CSS, kicker=html.escape(rec["kicker"]),
                                 headline=html.escape(rec["headline"]),
                                 rows=rows, twemoji=TWEMOJI_JS),
                     wait_until="networkidle")
    page.wait_for_function("window.__ready===true", timeout=20000)
    page.evaluate("""async()=>{const i=[...document.images];
        await Promise.all(i.map(x=>x.complete?1:new Promise(r=>{x.onload=x.onerror=r;})));}""")
    raw = os.path.join(OUT, f"{rec['slug']}@2x.png")
    page.locator(".pin").screenshot(path=raw)
    Image.open(raw).convert("RGB").resize((PIN_W, PIN_H), Image.LANCZOS).save(
        os.path.join(OUT, f"{rec['slug']}.png"))
    os.remove(raw)


COLUMNS = ["slug", "page_url", "is_emoji_pin", "category", "board_primary",
           "board_secondary", "pin_title", "pin_description", "pin_keywords",
           "pin_alt_text", "pin_image_path", "image_width", "image_height",
           "destination_url", "utm_destination_url", "rows_shown", "pin_status"]


def main():
    args = sys.argv[1:]
    # Regenerate only the Pinterest upload CSV from the existing inventory
    # (no rendering). Useful after merging to refresh Media URLs:
    #   PIN_RAW_REF=main python3 scripts/generate-collection-pins.py --upload-only
    if "--upload-only" in args:
        rows = list(csv.DictReader(open(CSV_OUT, encoding="utf-8")))
        write_upload_csv(rows)
        print(f"wrote {len(rows)} rows -> data/pinterest_upload_collections.csv")
        print(f"Media URL ref: {git_ref()}")
        return

    only = set(args)
    keep = [r for r in csv.DictReader(open(AUDIT, encoding="utf-8"))
            if r["verdict"] == "KEEP" and (not only or r["slug"] in only)]

    records, skipped = [], []
    for r in keep:
        rec = build_record(r)
        (records if rec else skipped).append(rec or r["slug"])

    out_rows = []
    counts = {B_CP_SYMBOLS: 0, B_CP_CUTE: 0, B_CP_EMOJI: 0}
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width": PIN_W, "height": PIN_H},
                          device_scale_factor=SCALE)
        for i, rec in enumerate(records, 1):
            try:
                render_pin(page, rec)
            except Exception as e:
                print(f"  !! render failed {rec['slug']}: {repr(e)[:120]}")
                continue
            counts[rec["board_primary"]] += 1
            out_rows.append({
                "slug": rec["slug"], "page_url": rec["page_url"],
                "is_emoji_pin": "yes" if rec["is_emoji"] else "no",
                "category": rec["category"], "board_primary": rec["board_primary"],
                "board_secondary": rec["board_secondary"], "pin_title": rec["pin_title"],
                "pin_description": rec["pin_description"], "pin_keywords": rec["pin_keywords"],
                "pin_alt_text": rec["pin_alt_text"], "pin_image_path": rec["pin_image_path"],
                "image_width": PIN_W, "image_height": PIN_H,
                "destination_url": rec["page_url"], "utm_destination_url": rec["utm_url"],
                "rows_shown": " | ".join(n for n, _ in rec["rows"]), "pin_status": "pending",
            })
            if i % 20 == 0:
                print(f"  ...{i}/{len(records)} rendered")
        b.close()

    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(out_rows)
    write_upload_csv(out_rows)

    print(f"\nrendered {len(out_rows)} pins -> assets/collection-pins/")
    print(f"inventory -> data/collection_pins.csv")
    print(f"pinterest upload -> data/pinterest_upload_collections.csv (ref={git_ref()})")
    if skipped:
        print(f"skipped (no rows): {len(skipped)} -> {', '.join(skipped[:8])}")
    print("--- pins per primary (copy-paste) board ---")
    for bname, c in counts.items():
        print(f"  {c:4}  {bname}")


if __name__ == "__main__":
    main()
